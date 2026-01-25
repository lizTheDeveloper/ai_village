/**
 * DispelEffectApplier - Handles dispelling, counterspelling, and magic suppression
 *
 * Supports:
 * - Single effect removal by ID
 * - Remove all dispellable effects
 * - Category-specific dispelling (buffs, debuffs, etc.)
 * - Magic suppression (antimagic field)
 * - Counterspell mechanics with power checks
 * - Selective dispel (harmful vs beneficial)
 * - Protection of permanent effects
 */

import type { Entity, WorldMutator } from '@ai-village/core';
import type { World } from '@ai-village/core';
import type {
  DispelEffect,
  EffectApplicationResult,
  ActiveEffect,
  EffectCategory,
} from '../SpellEffect.js';
import type { EffectApplier, EffectContext } from '../SpellEffectExecutor.js';
import type { ActiveEffectsComponent } from '../types/ComponentTypes.js';
import type { PositionComponent } from '@ai-village/core';

// ============================================================================
// Extended Types & Type Guards
// ============================================================================

/**
 * Extended ActiveEffect with runtime properties needed for dispelling.
 * Some effects may have these properties stored in their appliedValues.
 */
interface ExtendedActiveEffect extends ActiveEffect {
  /** Effect category (for category-specific dispel) */
  category?: EffectCategory;
  /** Whether this effect is permanent (cannot be dispelled) */
  permanent?: boolean;
}

/**
 * Extended DispelEffect with runtime-specific properties.
 */
interface ExtendedDispelEffect extends DispelEffect {
  /** Type of dispel operation */
  dispelType?: 'single_effect' | 'all_effects' | 'category_specific' | 'selective' | 'suppress' | 'antimagic_field' | 'counterspell';
  /** Power of the dispel */
  dispelPower?: number;
  /** Target category for category-specific dispel */
  targetCategory?: EffectCategory;
  /** Suppression power for antimagic fields */
  suppressionPower?: number;
  /** Duration of suppression in ticks */
  duration?: number;
  /** Area radius for area effects */
  areaRadius?: number;
}

/**
 * Extended EffectContext for counterspell mechanics.
 */
interface ExtendedEffectContext extends EffectContext {
  /** Incoming spell being countered */
  incomingSpell?: {
    power?: number;
    [key: string]: unknown;
  };
}

/**
 * Type guard for position component.
 */
function isPositionComponent(component: unknown): component is PositionComponent {
  return (
    component !== null &&
    component !== undefined &&
    typeof component === 'object' &&
    'type' in component &&
    component.type === 'position' &&
    'x' in component &&
    'y' in component &&
    typeof component.x === 'number' &&
    typeof component.y === 'number'
  );
}

/**
 * Type guard for active effects component.
 */
function isActiveEffectsComponent(component: unknown): component is ActiveEffectsComponent {
  return (
    component !== null &&
    component !== undefined &&
    typeof component === 'object' &&
    'type' in component &&
    component.type === 'active_effects' &&
    'effects' in component &&
    Array.isArray(component.effects)
  );
}

// ============================================================================
// DispelEffectApplier
// ============================================================================

class DispelEffectApplierClass implements EffectApplier<DispelEffect> {
  public readonly category = 'dispel' as const;

  /**
   * Apply dispel effect to target entity.
   */
  apply(
    effect: DispelEffect,
    caster: Entity,
    target: Entity,
    world: World,
    context: EffectContext
  ): EffectApplicationResult {
    // Check range (unless self-cast or counterspell)
    const extendedEffect = effect as ExtendedDispelEffect;
    const dispelType = extendedEffect.dispelType;

    if (dispelType !== 'counterspell' && effect.range && caster.id !== target.id) {
      const casterPosComponent = caster.components.get('position');
      const targetPosComponent = target.components.get('position');

      if (!isPositionComponent(casterPosComponent) || !isPositionComponent(targetPosComponent)) {
        throw new Error('Position component missing or invalid for range check');
      }

      const dx = casterPosComponent.x - targetPosComponent.x;
      const dy = casterPosComponent.y - targetPosComponent.y;
      const distSquared = dx * dx + dy * dy;
      const rangeSquared = effect.range * effect.range;

      if (distSquared > rangeSquared) {
        return {
          success: false,
          effectId: effect.id,
          targetId: target.id,
          appliedValues: {},
          resisted: false,
          error: 'Target out of range',
          appliedAt: context.tick,
          casterId: caster.id,
          spellId: context.spell.id,
        };
      }
    }

    // Route to appropriate handler based on dispelType
    switch (dispelType) {
      case 'single_effect':
        return this.handleSingleEffect(effect, caster, target, world, context);

      case 'all_effects':
        return this.handleAllEffects(effect, caster, target, world, context);

      case 'category_specific':
      case 'selective':
        return this.handleCategoryDispel(effect, caster, target, world, context);

      case 'suppress':
      case 'antimagic_field':
        return this.handleSuppression(effect, caster, target, world, context);

      case 'counterspell':
        return this.handleCounterspell(effect, caster, target, world, context);

      default:
        return {
          success: false,
          effectId: effect.id,
          targetId: target.id,
          appliedValues: {},
          resisted: false,
          error: `Unknown dispel type: ${dispelType}`,
          appliedAt: context.tick,
          casterId: caster.id,
          spellId: context.spell.id,
        };
    }
  }

  // ========== Dispel Type Handlers ==========

  /**
   * Remove a single random effect from target.
   */
  private handleSingleEffect(
    effect: DispelEffect,
    caster: Entity,
    target: Entity,
    _world: World,
    context: EffectContext
  ): EffectApplicationResult {
    const activeEffectsComponent = target.components.get('active_effects');

    if (!isActiveEffectsComponent(activeEffectsComponent) || activeEffectsComponent.effects.length === 0) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: 'Target has no effects to dispel',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Get dispel power
    const extendedEffect = effect as ExtendedDispelEffect;
    const dispelPowerScaled = context.scaledValues.get('dispel_power');
    const dispelPower = dispelPowerScaled ? dispelPowerScaled.value : (extendedEffect.dispelPower ?? 50);

    // Filter to dispellable effects
    const dispellableEffects = activeEffectsComponent.effects.filter((e) =>
      !e.permanent && this.canDispel(e, dispelPower)
    );

    if (dispellableEffects.length === 0) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: 'No dispellable effects on target',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Remove one random dispellable effect
    const randomIndex = Math.floor(Math.random() * dispellableEffects.length);
    const effectToRemove = dispellableEffects[randomIndex];
    const effectIndex = activeEffectsComponent.effects.indexOf(effectToRemove);
    activeEffectsComponent.effects.splice(effectIndex, 1);

    return {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues: {
        effectsRemoved: 1,
        removedEffectId: effectToRemove.id,
        dispelPower,
      },
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
    };
  }

  /**
   * Remove all dispellable effects from target.
   */
  private handleAllEffects(
    effect: DispelEffect,
    caster: Entity,
    target: Entity,
    _world: World,
    context: EffectContext
  ): EffectApplicationResult {
    const activeEffectsComponent = target.components.get('active_effects');

    if (!isActiveEffectsComponent(activeEffectsComponent) || activeEffectsComponent.effects.length === 0) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: 'Target has no effects to dispel',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Get dispel power
    const extendedEffect = effect as ExtendedDispelEffect;
    const dispelPowerScaled = context.scaledValues.get('dispel_power');
    const dispelPower = dispelPowerScaled ? dispelPowerScaled.value : (extendedEffect.dispelPower ?? 50);

    // Separate dispellable from permanent/protected effects
    const initialCount = activeEffectsComponent.effects.length;
    activeEffectsComponent.effects = activeEffectsComponent.effects.filter((e) =>
      e.permanent || !this.canDispel(e, dispelPower)
    );
    const finalCount = activeEffectsComponent.effects.length;
    const removed = initialCount - finalCount;

    return {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues: {
        effectsRemoved: removed,
        dispelPower,
      },
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
    };
  }

  /**
   * Remove effects of a specific category.
   */
  private handleCategoryDispel(
    effect: DispelEffect,
    caster: Entity,
    target: Entity,
    _world: World,
    context: EffectContext
  ): EffectApplicationResult {
    const activeEffectsComponent = target.components.get('active_effects');

    if (!isActiveEffectsComponent(activeEffectsComponent) || activeEffectsComponent.effects.length === 0) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: 'Target has no effects to dispel',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Get target category from effect
    const extendedEffect = effect as ExtendedDispelEffect;
    const targetCategory = extendedEffect.targetCategory;
    if (!targetCategory) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: 'No targetCategory specified for category_specific dispel',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Get dispel power
    const dispelPowerScaled = context.scaledValues.get('dispel_power');
    const dispelPower = dispelPowerScaled ? dispelPowerScaled.value : (extendedEffect.dispelPower ?? 50);

    // Remove effects matching category
    const initialCount = activeEffectsComponent.effects.length;
    activeEffectsComponent.effects = activeEffectsComponent.effects.filter((e) =>
      e.category !== targetCategory || e.permanent || !this.canDispel(e, dispelPower)
    );
    const finalCount = activeEffectsComponent.effects.length;
    const removed = initialCount - finalCount;

    return {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues: {
        effectsRemoved: removed,
        dispelPower,
      },
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
    };
  }

  /**
   * Suppress magic on target temporarily.
   */
  private handleSuppression(
    effect: DispelEffect,
    caster: Entity,
    target: Entity,
    world: World,
    context: EffectContext
  ): EffectApplicationResult {
    const activeEffectsComponent = target.components.get('active_effects');
    let activeEffects: ActiveEffectsComponent;

    if (!isActiveEffectsComponent(activeEffectsComponent)) {
      // Add active_effects component if missing
      activeEffects = {
        type: 'active_effects',
        version: 1,
        effects: [],
        suppressed: false,
      };
      (world as WorldMutator).addComponent(target.id, activeEffects);
    } else {
      activeEffects = activeEffectsComponent;
    }

    // Get suppression power and duration
    const extendedEffect = effect as ExtendedDispelEffect;
    const suppressionPowerScaled = context.scaledValues.get('suppression_power');
    const suppressionPower = suppressionPowerScaled ? suppressionPowerScaled.value : (extendedEffect.suppressionPower ?? 50);
    const duration = extendedEffect.duration ?? 60;
    const areaRadius = extendedEffect.areaRadius;

    // Mark as suppressed
    activeEffects.suppressed = true;
    activeEffects.suppressedUntil = context.tick + duration;
    activeEffects.suppressionPower = suppressionPower;

    return {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues: {
        suppressionDuration: duration,
        suppressionPower,
        areaRadius: areaRadius ?? 0,
      },
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
    };
  }

  /**
   * Counterspell an incoming spell.
   */
  private handleCounterspell(
    effect: DispelEffect,
    caster: Entity,
    target: Entity,
    _world: World,
    context: EffectContext
  ): EffectApplicationResult {
    // Check if there's an incoming spell to counter
    const extendedContext = context as ExtendedEffectContext;
    const incomingSpell = extendedContext.incomingSpell;

    if (!incomingSpell) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: 'No incoming spell to counter',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Get dispel power
    const extendedEffect = effect as ExtendedDispelEffect;
    const dispelPowerScaled = context.scaledValues.get('dispel_power');
    const dispelPower = dispelPowerScaled ? dispelPowerScaled.value : (extendedEffect.dispelPower ?? 50);

    // Get incoming spell power
    const spellPower = incomingSpell.power ?? 50;

    // Power check: counterspell succeeds if dispel power >= 80% of spell power
    const requiredPower = spellPower * 0.8;

    if (dispelPower < requiredPower) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {
          dispelPower,
          spellPower,
          requiredPower,
        },
        resisted: false,
        error: `Counterspell failed: insufficient power (${dispelPower} < ${requiredPower})`,
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Counterspell succeeds
    return {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues: {
        spellCountered: 1,
        dispelPower,
        spellPower,
      },
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
    };
  }

  // ========== Helper Methods ==========

  /**
   * Check if an effect can be dispelled based on power level.
   * Dispel succeeds if dispel power >= 80% of effect power.
   */
  private canDispel(activeEffect: ActiveEffect, dispelPower: number): boolean {
    const effectPower = activeEffect.power ?? 50;
    const requiredPower = effectPower * 0.8;
    return dispelPower >= requiredPower;
  }

  /**
   * Process dispel effect tick (for ongoing suppression).
   */
  tick(
    _activeEffect: ActiveEffect,
    _effect: DispelEffect,
    target: Entity,
    _world: World,
    context: EffectContext
  ): void {
    // Check if suppression has expired
    const activeEffectsComponent = target.components.get('active_effects');

    if (isActiveEffectsComponent(activeEffectsComponent) && activeEffectsComponent.suppressed) {
      if (activeEffectsComponent.suppressedUntil && context.tick >= activeEffectsComponent.suppressedUntil) {
        activeEffectsComponent.suppressed = false;
        delete activeEffectsComponent.suppressedUntil;
        delete activeEffectsComponent.suppressionPower;
      }
    }
  }

  /**
   * Remove dispel effect (cleanup suppression).
   */
  remove(
    _activeEffect: ActiveEffect,
    _effect: DispelEffect,
    target: Entity,
    _world: World
  ): void {
    // Clean up suppression if this was a suppression effect
    const activeEffectsComponent = target.components.get('active_effects');

    if (isActiveEffectsComponent(activeEffectsComponent) && activeEffectsComponent.suppressed) {
      activeEffectsComponent.suppressed = false;
      delete activeEffectsComponent.suppressedUntil;
      delete activeEffectsComponent.suppressionPower;
    }
  }
}

export const DispelEffectApplier = new DispelEffectApplierClass();

// ============================================================================
// Registration Function
// ============================================================================

export function registerDispelEffectApplier(): void {
  const executor = require('../SpellEffectExecutor.js').SpellEffectExecutor.getInstance();
  executor.registerApplier(DispelEffectApplier);
}

/**
 * Initialize the dispel effect system.
 * Call this during game startup.
 */
export function initializeDispelEffects(): void {
  registerDispelEffectApplier();
}
