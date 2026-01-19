/**
 * BodyTransformEffectApplier - Body transformation effects using BodyComponent
 *
 * Supports:
 * - Adding body parts (grow wings, extra arms, tail)
 * - Removing body parts (remove tail, lose limb)
 * - Modifying body parts (enhance arms, strengthen legs)
 * - Changing body size
 * - Body material changes (flesh to stone, gaseous form)
 * - Full polymorph (change entire body plan)
 */

import type { Entity } from '@ai-village/core';
import type { World } from '@ai-village/core';
import type {
  BodyComponent,
  BodyPart,
  BodyPartType,
  BodyPartFunction,
  GlobalBodyModification,
  BodyPartModification,
  ModificationSource,
  SizeCategory,
} from '@ai-village/core';
import {
  getPartsByType,
  inferSkillsFromFunctions,
  inferActionsFromFunctions,
} from '@ai-village/core';
import {
  createBodyComponentFromPlan,
} from '@ai-village/core';
import type {
  TransformEffect,
  EffectApplicationResult,
  ActiveEffect,
} from '../SpellEffect.js';
import type { EffectApplier, EffectContext } from '../SpellEffectExecutor.js';
import { registerEffectApplier } from '../SpellEffectExecutor.js';
import { SpellEffectRegistry } from '../SpellEffectRegistry.js';

// ============================================================================
// Extended Transform Effect for Body Parts
// ============================================================================

export interface BodyTransformEffect extends TransformEffect {
  /** Add body parts */
  addBodyParts?: {
    type: BodyPartType;
    count: number;
    functions?: BodyPartFunction[];
    health?: number;
  };

  /** Remove body parts */
  removeBodyParts?: {
    type: BodyPartType;
    count: number;
  };

  /** Modify existing body parts */
  modifyBodyParts?: {
    partType: BodyPartType;
    healthModifier?: number;
    addFunctions?: BodyPartFunction[];
    removeFunctions?: BodyPartFunction[];
  };

  /** Change body plan (full polymorph) */
  newBodyPlan?: string;

  /** Change body size */
  newSize?: SizeCategory;

  /** Modification source */
  modificationSource?: ModificationSource;
}

// ============================================================================
// Body Transform Applier
// ============================================================================

export class BodyTransformEffectApplier implements EffectApplier<BodyTransformEffect> {
  readonly category = 'transform' as const;

  // Store original bodies for restoration
  private originalBodies: Map<string, BodyComponent> = new Map();

  apply(
    effect: BodyTransformEffect,
    caster: Entity,
    target: Entity,
    _world: World,
    context: EffectContext
  ): EffectApplicationResult {
    const body = target.components.get('body') as BodyComponent | undefined;

    if (!body) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: 'Target has no body component',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    const appliedValues: Record<string, any> = {};
    const source: ModificationSource = effect.modificationSource || 'magic';

    // Store original body for restoration (deep copy)
    if (!this.originalBodies.has(target.id)) {
      this.originalBodies.set(target.id, JSON.parse(JSON.stringify(body)));
    }

    // Full polymorph - change entire body plan
    if (effect.newBodyPlan) {
      this.applyFullPolymorph(body, effect.newBodyPlan, context.tick, source, appliedValues);
    }

    // Add body parts
    if (effect.addBodyParts) {
      this.addBodyParts(body, effect.addBodyParts, context.tick, source, appliedValues);
    }

    // Remove body parts
    if (effect.removeBodyParts) {
      this.removeBodyParts(body, effect.removeBodyParts, context.tick, source, appliedValues);
    }

    // Modify existing parts
    if (effect.modifyBodyParts) {
      this.modifyBodyParts(body, effect.modifyBodyParts, context.tick, source, appliedValues);
    }

    // Change size
    if (effect.newSize) {
      const oldSize = body.size;
      body.size = effect.newSize;
      appliedValues.oldSize = oldSize;
      appliedValues.newSize = effect.newSize;

      // Track as modification
      const mod: GlobalBodyModification = {
        id: `size_change_${context.tick}`,
        name: 'Size Change',
        source,
        effects: {
          propertyModified: { property: 'size', value: effect.newSize },
        },
        permanent: !effect.duration,
        duration: effect.duration,
        createdAt: context.tick,
      };
      body.modifications.push(mod);
    }

    return {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues,
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
      remainingDuration: effect.duration,
    };
  }

  tick(
    _activeEffect: ActiveEffect,
    _effect: BodyTransformEffect,
    _target: Entity,
    _world: World,
    _context: EffectContext
  ): void {
    // Transformations don't typically need tick processing
  }

  remove(
    _activeEffect: ActiveEffect,
    _effect: BodyTransformEffect,
    target: Entity,
    _world: World
  ): void {
    // Restore original body
    const originalBody = this.originalBodies.get(target.id);
    if (originalBody) {
      const currentBody = target.components.get('body') as BodyComponent;
      if (currentBody) {
        // Restore all properties
        Object.assign(currentBody, originalBody);
      }
      this.originalBodies.delete(target.id);
    }
  }

  // ========== Helper Methods ==========

  private applyFullPolymorph(
    body: BodyComponent,
    newPlan: string,
    tick: number,
    source: ModificationSource,
    appliedValues: Record<string, any>
  ): void {
    const oldPlanId = body.bodyPlanId;

    try {
      const newBody = createBodyComponentFromPlan(newPlan, body.speciesId);

      // Replace body plan and parts
      body.bodyPlanId = newBody.bodyPlanId;
      body.parts = newBody.parts;
      body.size = newBody.size;
      body.bloodType = newBody.bloodType;
      body.skeletonType = newBody.skeletonType;

      appliedValues.oldBodyPlan = oldPlanId;
      appliedValues.newBodyPlan = newPlan;
      appliedValues.partsChanged = Object.keys(newBody.parts).length;

      // Track as modification
      const mod: GlobalBodyModification = {
        id: `polymorph_${tick}`,
        name: 'Polymorph',
        source,
        effects: {
          propertyModified: { property: 'bodyPlan', value: newPlan },
        },
        permanent: false,
        createdAt: tick,
      };
      body.modifications.push(mod);
    } catch (error) {
      appliedValues.error = `Failed to polymorph: ${error}`;
    }
  }

  private addBodyParts(
    body: BodyComponent,
    spec: BodyTransformEffect['addBodyParts'],
    tick: number,
    source: ModificationSource,
    appliedValues: Record<string, any>
  ): void {
    if (!spec) return;

    const addedParts: string[] = [];

    for (let i = 0; i < spec.count; i++) {
      const partId = `${spec.type}_magic_${tick}_${i}`;
      const partName = `${spec.type} ${i + 1}`;

      const newPart: BodyPart = {
        id: partId,
        type: spec.type,
        name: partName,
        vital: false, // Magically added parts are typically not vital
        health: spec.health || 100,
        maxHealth: spec.health || 100,
        functions: spec.functions || ['none'],
        affectsSkills: inferSkillsFromFunctions(spec.functions || ['none']),
        affectsActions: inferActionsFromFunctions(spec.functions || ['none']),
        injuries: [],
        bandaged: false,
        splinted: false,
        infected: false,
        modifications: [],
      };

      body.parts[partId] = newPart;
      addedParts.push(partId);
    }

    appliedValues.partsAdded = addedParts;

    // Track as modification
    const mod: GlobalBodyModification = {
      id: `add_parts_${tick}`,
      name: `Add ${spec.type}`,
      source,
      effects: {
        partTypeAdded: { type: spec.type, count: spec.count },
      },
      permanent: false,
      createdAt: tick,
    };
    body.modifications.push(mod);
  }

  private removeBodyParts(
    body: BodyComponent,
    spec: BodyTransformEffect['removeBodyParts'],
    tick: number,
    source: ModificationSource,
    appliedValues: Record<string, any>
  ): void {
    if (!spec) return;

    const partsOfType = getPartsByType(body, spec.type);
    const removedParts: string[] = [];

    for (let i = 0; i < Math.min(spec.count, partsOfType.length); i++) {
      const part = partsOfType[i]!;
      if (!part.vital) {  // Never remove vital parts
        delete body.parts[part.id];
        removedParts.push(part.id);
      }
    }

    appliedValues.partsRemoved = removedParts;

    // Track as modification
    if (removedParts.length > 0) {
      const mod: GlobalBodyModification = {
        id: `remove_parts_${tick}`,
        name: `Remove ${spec.type}`,
        source,
        effects: {
          partTypeRemoved: { type: spec.type, count: removedParts.length },
        },
        permanent: false,
        createdAt: tick,
      };
      body.modifications.push(mod);
    }
  }

  private modifyBodyParts(
    body: BodyComponent,
    spec: BodyTransformEffect['modifyBodyParts'],
    tick: number,
    source: ModificationSource,
    appliedValues: Record<string, any>
  ): void {
    if (!spec) return;

    const partsOfType = getPartsByType(body, spec.partType);
    const modifiedParts: string[] = [];

    for (const part of partsOfType) {
      const mod: BodyPartModification = {
        id: `modify_${part.id}_${tick}`,
        name: `Modify ${part.name}`,
        source,
        effects: {},
        permanent: false,
        createdAt: tick,
      };

      if (spec.healthModifier) {
        part.maxHealth += spec.healthModifier;
        part.health = Math.min(part.health + spec.healthModifier, part.maxHealth);
        mod.effects.healthModifier = spec.healthModifier;
      }

      if (spec.addFunctions) {
        for (const func of spec.addFunctions) {
          if (!part.functions.includes(func)) {
            part.functions.push(func);
          }
        }
        mod.effects.functionsAdded = spec.addFunctions;

        // Update affected skills/actions
        part.affectsSkills = inferSkillsFromFunctions(part.functions);
        part.affectsActions = inferActionsFromFunctions(part.functions);
      }

      if (spec.removeFunctions) {
        part.functions = part.functions.filter(f => !spec.removeFunctions?.includes(f));
        mod.effects.functionsRemoved = spec.removeFunctions;

        // Update affected skills/actions
        part.affectsSkills = inferSkillsFromFunctions(part.functions);
        part.affectsActions = inferActionsFromFunctions(part.functions);
      }

      part.modifications.push(mod);
      modifiedParts.push(part.id);
    }

    appliedValues.partsModified = modifiedParts;
  }
}

// ============================================================================
// Built-in Body Transform Effects
// ============================================================================

/**
 * Grow Wings - adds wings for flight
 */
export const growWingsEffect: BodyTransformEffect = {
  id: 'grow_wings_effect',
  name: 'Grow Wings',
  category: 'transform',
  description: 'Magically grow wings, granting the ability to fly.',
  targetType: 'single',
  duration: 3600, // 1 hour at 60 ticks/sec
  addBodyParts: {
    type: 'wing',
    count: 2,
    functions: ['flight'],
    health: 120,
  },
  transformType: 'form',
  targetState: 'winged',
  reversible: true,
  tags: ['transform', 'wings', 'flight'],
  modificationSource: 'magic',
};

/**
 * Extra Arms - adds 2 extra arms
 */
export const extraArmsEffect: BodyTransformEffect = {
  id: 'extra_arms_effect',
  name: 'Extra Arms',
  category: 'transform',
  description: 'Grow two additional arms, improving manipulation capabilities.',
  targetType: 'single',
  duration: 1800, // 30 minutes
  addBodyParts: {
    type: 'arm',
    count: 2,
    functions: ['manipulation'],
    health: 100,
  },
  transformType: 'form',
  targetState: 'multi_armed',
  reversible: true,
  tags: ['transform', 'arms', 'manipulation'],
  modificationSource: 'magic',
};

/**
 * Enhance Arms - makes arms stronger and more durable
 */
export const enhanceArmsEffect: BodyTransformEffect = {
  id: 'enhance_arms_effect',
  name: 'Enhance Arms',
  category: 'transform',
  description: 'Magically strengthen and enhance arms.',
  targetType: 'single',
  duration: 600, // 10 minutes
  modifyBodyParts: {
    partType: 'arm',
    healthModifier: 50,
    addFunctions: ['attack'],
  },
  transformType: 'form',
  targetState: 'enhanced',
  reversible: true,
  tags: ['transform', 'enhance', 'arms', 'strength'],
  modificationSource: 'magic',
};

/**
 * Enlarge - increases body size
 */
export const enlargeEffect: BodyTransformEffect = {
  id: 'enlarge_effect',
  name: 'Enlarge',
  category: 'transform',
  description: 'Increase body size dramatically.',
  targetType: 'single',
  duration: 600,
  transformType: 'size',
  newSize: 'large',
  targetState: 'large',
  reversible: true,
  tags: ['transform', 'size', 'enlarge'],
  modificationSource: 'magic',
};

/**
 * Reduce - decreases body size
 */
export const reduceEffect: BodyTransformEffect = {
  id: 'reduce_effect',
  name: 'Reduce',
  category: 'transform',
  description: 'Shrink body size dramatically.',
  targetType: 'single',
  duration: 600,
  transformType: 'size',
  newSize: 'small',
  targetState: 'small',
  reversible: true,
  tags: ['transform', 'size', 'reduce'],
  modificationSource: 'magic',
};

/**
 * Polymorph - full body transformation
 */
export const polymorphEffect: BodyTransformEffect = {
  id: 'polymorph_effect',
  name: 'Polymorph',
  category: 'transform',
  description: 'Transform into a completely different form.',
  targetType: 'single',
  duration: 1800,
  transformType: 'form',
  newBodyPlan: 'avian_winged',  // Default, can be specified per cast
  targetState: 'avian_winged',
  reversible: true,
  tags: ['transform', 'polymorph', 'powerful'],
  modificationSource: 'magic',
};

// ============================================================================
// Registration
// ============================================================================

export const bodyTransformEffectApplier = new BodyTransformEffectApplier();

export function registerBodyTransformEffectApplier(): void {
  registerEffectApplier(bodyTransformEffectApplier);
}

export function registerBuiltInBodyTransformEffects(): void {
  const registry = SpellEffectRegistry.getInstance();

  registry.register(growWingsEffect);
  registry.register(extraArmsEffect);
  registry.register(enhanceArmsEffect);
  registry.register(enlargeEffect);
  registry.register(reduceEffect);
  registry.register(polymorphEffect);
}

export function registerBodyTransformSystem(): void {
  registerBodyTransformEffectApplier();
  registerBuiltInBodyTransformEffects();
}
