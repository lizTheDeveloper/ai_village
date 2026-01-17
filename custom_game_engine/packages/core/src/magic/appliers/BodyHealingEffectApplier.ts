/**
 * BodyHealingEffectApplier - Healing effects that work with the BodyComponent system
 *
 * Extends the base HealingEffectApplier to support:
 * - Healing specific body parts
 * - Curing injuries on body parts
 * - Treating infections
 * - Mending fractures
 * - Stopping bleeding
 * - Regenerating lost limbs
 */

import type { Entity } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type {
  BodyComponent,
  BodyPart,
  BodyPartType,
} from '../../components/BodyComponent.js';
import { getPartsByType, getBodyPart } from '../../components/BodyComponent.js';
import { getBodyPlan } from '../../components/BodyPlanRegistry.js';
import type { NeedsComponent } from '../../components/NeedsComponent.js';
import type {
  HealingEffect,
  EffectApplicationResult,
  ActiveEffect,
} from '../SpellEffect.js';
import type { EffectApplier, EffectContext } from '../SpellEffectExecutor.js';
import { registerEffectApplier } from '../SpellEffectExecutor.js';
import { createHealingEffect } from '../SpellEffect.js';
import { SpellEffectRegistry } from '../SpellEffectRegistry.js';

// ============================================================================
// Extended Healing Effect for Body Parts
// ============================================================================

export interface BodyHealingEffect extends HealingEffect {
  /** Target specific body part(s) */
  targetBodyPart?: string;  // Part ID or type (e.g., 'arm', 'left_arm_1')

  /** Heal all parts of a specific type */
  targetBodyPartType?: BodyPartType;  // e.g., 'arm' heals all arms

  /** Mend fractures on target part */
  mendsFractures?: boolean;

  /** Stop bleeding on target part */
  stopsBleeding?: boolean;

  /** Cure infections on target part */
  curesInfections?: boolean;

  /** Regenerate destroyed parts */
  regeneratesLimbs?: boolean;

  /** Healing amount for body parts */
  bodyPartHealing?: number;
}

// ============================================================================
// Body Healing Applier
// ============================================================================

export class BodyHealingEffectApplier implements EffectApplier<BodyHealingEffect> {
  readonly category = 'healing' as const;

  apply(
    effect: BodyHealingEffect,
    caster: Entity,
    target: Entity,
    _world: World,
    context: EffectContext
  ): EffectApplicationResult {
    const body = target.components.get('body') as BodyComponent | undefined;
    const needs = target.components.get('needs') as NeedsComponent | undefined;

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

    const appliedValues: Record<string, number> = {};

    // Get scaled healing value
    const scaledHealing = context.scaledValues.get('healing');
    if (!scaledHealing) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: 'No healing scaling data available',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    let healingAmount = scaledHealing.value * context.powerMultiplier;

    // Apply critical multiplier
    if (context.isCrit) {
      healingAmount *= 1.5;
    }

    // Determine which parts to heal
    let targetParts: BodyPart[] = [];

    if (effect.targetBodyPart) {
      // Heal specific part by ID
      const part = getBodyPart(body, effect.targetBodyPart);
      if (part) {
        targetParts = [part];
      }
    } else if (effect.targetBodyPartType) {
      // Heal all parts of a type
      targetParts = getPartsByType(body, effect.targetBodyPartType);
    } else {
      // Heal all parts (distribute healing)
      targetParts = Object.values(body.parts);
    }

    if (targetParts.length === 0) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: 'No matching body parts found',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Distribute healing across target parts
    const healingPerPart = healingAmount / targetParts.length;

    for (const part of targetParts) {
      // Heal the part
      const oldHealth = part.health;
      part.health = Math.min(part.maxHealth, part.health + healingPerPart);
      const actualHealing = part.health - oldHealth;

      if (actualHealing > 0) {
        appliedValues[`${part.id}_healed`] = actualHealing;
      }

      // Stop bleeding
      if (effect.stopsBleeding) {
        for (const injury of part.injuries) {
          if (injury.bleedRate > 0) {
            injury.bleedRate = 0;
            appliedValues[`${part.id}_bleeding_stopped`] = 1;
          }
        }
        if (part.bandaged === false) {
          part.bandaged = true;
        }
      }

      // Cure infections
      if (effect.curesInfections && part.infected) {
        part.infected = false;
        appliedValues[`${part.id}_infection_cured`] = 1;
      }

      // Mend fractures
      if (effect.mendsFractures) {
        for (const injury of part.injuries) {
          if (injury.type === 'fracture') {
            injury.healingProgress = 100; // Instantly heal fracture
            appliedValues[`${part.id}_fracture_mended`] = 1;
          }
        }
        if (part.splinted === false) {
          part.splinted = true;
        }
      }

      // Advance healing of all injuries
      for (let i = part.injuries.length - 1; i >= 0; i--) {
        const injury = part.injuries[i];
        if (!injury) continue;

        injury.healingProgress += healingPerPart;

        // Remove fully healed injuries
        if (injury.healingProgress >= 100) {
          part.injuries.splice(i, 1);
          appliedValues[`${part.id}_injury_healed`] = (appliedValues[`${part.id}_injury_healed`] || 0) + 1;
        }
      }
    }

    // Regenerate lost limbs (very powerful magic)
    if (effect.regeneratesLimbs) {
      let limbsRegenerated = 0;
      const bodyPlan = getBodyPlan(body.bodyPlanId);

      if (bodyPlan) {
        // Find which parts are missing by comparing the body plan to current parts
        const expectedPartTypes: Record<string, number> = {};

        // Count expected parts from the body plan
        for (const partDef of bodyPlan.parts) {
          const countParts = (def: any) => {
            expectedPartTypes[def.type] = (expectedPartTypes[def.type] || 0) + def.count;
            if (def.children) {
              for (const child of def.children) {
                countParts(child);
              }
            }
          };
          countParts(partDef);
        }

        // Count current parts
        const currentPartTypes: Record<string, number> = {};
        for (const part of Object.values(body.parts)) {
          currentPartTypes[part.type] = (currentPartTypes[part.type] || 0) + 1;
        }

        // Regenerate missing parts
        for (const [partType, expectedCount] of Object.entries(expectedPartTypes)) {
          const currentCount = currentPartTypes[partType] || 0;
          const missingCount = expectedCount - currentCount;

          if (missingCount > 0) {
            // Find the part definition in the body plan
            const findPartDef = (defs: any[]): any => {
              for (const def of defs) {
                if (def.type === partType) return def;
                if (def.children) {
                  const found = findPartDef(def.children);
                  if (found) return found;
                }
              }
              return null;
            };

            const partDef = findPartDef(bodyPlan.parts);
            if (!partDef) continue;

            // Create new parts based on the definition
            for (let i = 0; i < missingCount; i++) {
              const partId = `regenerated_${partType}_${Date.now()}_${i}`;
              const newPart: any = {
                id: partId,
                type: partDef.type,
                name: partDef.type.replace('_', ' '),
                vital: partDef.vital,
                health: partDef.health,
                maxHealth: partDef.health,
                functions: partDef.functions,
                affectsSkills: [],
                affectsActions: [],
                injuries: [],
                bandaged: false,
                splinted: false,
                infected: false,
                modifications: [],
              };

              body.parts[partId] = newPart;
              limbsRegenerated++;
            }
          }
        }
      }

      appliedValues.limbsRegenerated = limbsRegenerated;
    }

    // Also heal overall health if NeedsComponent exists
    if (needs && effect.resourceType === 'health') {
      const oldHealth = needs.health;
      needs.health = Math.min(1.0, needs.health + (healingAmount * 0.1));
      appliedValues.overallHealthHealed = needs.health - oldHealth;
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
    activeEffect: ActiveEffect,
    effect: BodyHealingEffect,
    target: Entity,
    _world: World,
    context: EffectContext
  ): void {
    // For overtime healing, re-apply partial healing each tick
    if (!effect.overtime || !effect.tickInterval) return;

    const body = target.components.get('body') as BodyComponent | undefined;
    if (!body) return;

    // Check if it's time to tick
    const ticksSinceApplied = context.tick - activeEffect.appliedAt;
    if (ticksSinceApplied % effect.tickInterval !== 0) return;

    const healingPerTick = activeEffect.appliedValues.healingPerTick ?? 0;

    // Heal all damaged parts gradually
    for (const part of Object.values(body.parts)) {
      if (part.health < part.maxHealth) {
        part.health = Math.min(part.maxHealth, part.health + healingPerTick);
      }
    }
  }

  remove(
    _activeEffect: ActiveEffect,
    _effect: BodyHealingEffect,
    _target: Entity,
    _world: World
  ): void {
    // Body healing effects don't need cleanup
  }
}

// ============================================================================
// Built-in Body Healing Effects
// ============================================================================

/**
 * Mend Wounds - heals and stops bleeding on all injuries
 */
export const mendWoundsEffect = createHealingEffect(
  'mend_wounds_effect',
  'Mend Wounds',
  60,
  1,
  {
    description: 'Heals injuries and stops bleeding on all body parts.',
    tags: ['heal', 'body', 'wounds', 'bleeding'],
  }
) as BodyHealingEffect;

mendWoundsEffect.bodyPartHealing = 60;
mendWoundsEffect.stopsBleeding = true;

/**
 * Cure Infection - removes infections from injured parts
 */
export const cureInfectionEffect = createHealingEffect(
  'cure_infection_effect',
  'Cure Infection',
  40,
  1,
  {
    description: 'Cures infections on all infected body parts.',
    tags: ['heal', 'body', 'infection', 'cure'],
  }
) as BodyHealingEffect;

cureInfectionEffect.bodyPartHealing = 40;
cureInfectionEffect.curesInfections = true;

/**
 * Mend Bone - instantly mends fractures
 */
export const mendBoneEffect = createHealingEffect(
  'mend_bone_effect',
  'Mend Bone',
  50,
  1,
  {
    description: 'Instantly mends fractured bones.',
    tags: ['heal', 'body', 'fracture', 'bone'],
  }
) as BodyHealingEffect;

mendBoneEffect.bodyPartHealing = 50;
mendBoneEffect.mendsFractures = true;

/**
 * Restore Limb - regenerates a lost limb (very powerful)
 */
export const restoreLimbEffect = createHealingEffect(
  'restore_limb_effect',
  'Restore Limb',
  200,
  1,
  {
    description: 'Regenerates a lost or destroyed limb.',
    tags: ['heal', 'body', 'regenerate', 'limb', 'powerful'],
    healingScaling: {
      base: 200,
      perProficiency: 2.0,
      perForm: 1.0,
      maximum: 500,
    },
  }
) as BodyHealingEffect;

restoreLimbEffect.bodyPartHealing = 200;
restoreLimbEffect.regeneratesLimbs = true;

/**
 * Heal Arm - targets arms specifically
 */
export const healArmEffect = createHealingEffect(
  'heal_arm_effect',
  'Heal Arm',
  70,
  1,
  {
    description: 'Heals all arm injuries and stops arm bleeding.',
    tags: ['heal', 'body', 'arm'],
  }
) as BodyHealingEffect;

healArmEffect.targetBodyPartType = 'arm';
healArmEffect.bodyPartHealing = 70;
healArmEffect.stopsBleeding = true;

/**
 * Heal Leg - targets legs specifically
 */
export const healLegEffect = createHealingEffect(
  'heal_leg_effect',
  'Heal Leg',
  70,
  1,
  {
    description: 'Heals all leg injuries and stops leg bleeding.',
    tags: ['heal', 'body', 'leg'],
  }
) as BodyHealingEffect;

healLegEffect.targetBodyPartType = 'leg';
healLegEffect.bodyPartHealing = 70;
healLegEffect.stopsBleeding = true;

// ============================================================================
// Registration
// ============================================================================

export const bodyHealingEffectApplier = new BodyHealingEffectApplier();

export function registerBodyHealingEffectApplier(): void {
  registerEffectApplier(bodyHealingEffectApplier);
}

export function registerBuiltInBodyHealingEffects(): void {
  const registry = SpellEffectRegistry.getInstance();

  registry.register(mendWoundsEffect);
  registry.register(cureInfectionEffect);
  registry.register(mendBoneEffect);
  registry.register(restoreLimbEffect);
  registry.register(healArmEffect);
  registry.register(healLegEffect);
}

export function registerBodyHealingSystem(): void {
  registerBodyHealingEffectApplier();
  registerBuiltInBodyHealingEffects();
}
