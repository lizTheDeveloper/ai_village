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

import type { Entity } from '@ai-village/core';
import type { World } from '@ai-village/core';
import type {
  DispelEffect,
  EffectApplicationResult,
  ActiveEffect,
} from '../SpellEffect.js';
import type { EffectApplier, EffectContext } from '../SpellEffectExecutor.js';
import type { ActiveEffectsComponent } from '../types/ComponentTypes.js';

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
    const dispelType = (effect as any).dispelType;
    if (dispelType !== 'counterspell' && effect.range && caster.id !== target.id) {
      const casterPos = caster.components.get('position') as { x?: number; y?: number } | undefined;
      const targetPos = target.components.get('position') as { x?: number; y?: number } | undefined;

      // Default to origin if no position
      const casterX = casterPos?.x ?? 0;
      const casterY = casterPos?.y ?? 0;
      const targetX = targetPos?.x ?? 0;
      const targetY = targetPos?.y ?? 0;

      const dx = casterX - targetX;
      const dy = casterY - targetY;
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
    const activeEffects = target.components.get('active_effects') as ActiveEffectsComponent | undefined;

    if (!activeEffects || !activeEffects.effects || activeEffects.effects.length === 0) {
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
    const dispelPowerScaled = context.scaledValues.get('dispel_power');
    const dispelPower = dispelPowerScaled ? dispelPowerScaled.value : ((effect as any).dispelPower ?? 50);

    // Filter to dispellable effects
    const dispellableEffects = activeEffects.effects.filter((e) =>
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
    const effectIndex = activeEffects.effects.indexOf(effectToRemove);
    activeEffects.effects.splice(effectIndex, 1);

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
    const activeEffects = target.components.get('active_effects') as ActiveEffectsComponent | undefined;

    if (!activeEffects || !activeEffects.effects || activeEffects.effects.length === 0) {
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
    const dispelPowerScaled = context.scaledValues.get('dispel_power');
    const dispelPower = dispelPowerScaled ? dispelPowerScaled.value : ((effect as any).dispelPower ?? 50);

    // Separate dispellable from permanent/protected effects
    const initialCount = activeEffects.effects.length;
    activeEffects.effects = activeEffects.effects.filter((e) =>
      e.permanent || !this.canDispel(e, dispelPower)
    );
    const finalCount = activeEffects.effects.length;
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
    const activeEffects = target.components.get('active_effects') as ActiveEffectsComponent | undefined;

    if (!activeEffects || !activeEffects.effects || activeEffects.effects.length === 0) {
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
    const targetCategory = (effect as any).targetCategory;
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
    const dispelPower = dispelPowerScaled ? dispelPowerScaled.value : ((effect as any).dispelPower ?? 50);

    // Remove effects matching category
    const initialCount = activeEffects.effects.length;
    activeEffects.effects = activeEffects.effects.filter((e) =>
      e.category !== targetCategory || e.permanent || !this.canDispel(e, dispelPower)
    );
    const finalCount = activeEffects.effects.length;
    const removed = initialCount - finalCount;

    return {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues: {
        effectsRemoved: removed,
        targetCategory,
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
    _world: World,
    context: EffectContext
  ): EffectApplicationResult {
    let activeEffects = target.components.get('active_effects') as ActiveEffectsComponent | undefined;

    if (!activeEffects) {
      // Add active_effects component if missing
      activeEffects = {
        type: 'active_effects',
        effects: [],
        suppressed: false,
      };
      (target as any).addComponent('active_effects', activeEffects);
    }

    // Get suppression power and duration
    const suppressionPowerScaled = context.scaledValues.get('suppression_power');
    const suppressionPower = suppressionPowerScaled ? suppressionPowerScaled.value : ((effect as any).suppressionPower ?? 50);
    const duration = (effect as any).duration ?? 60;
    const areaRadius = (effect as any).areaRadius;

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
    const incomingSpell = (context as any).incomingSpell;

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
    const dispelPowerScaled = context.scaledValues.get('dispel_power');
    const dispelPower = dispelPowerScaled ? dispelPowerScaled.value : ((effect as any).dispelPower ?? 50);

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
    const activeEffects = target.components.get('active_effects') as ActiveEffectsComponent | undefined;

    if (activeEffects && activeEffects.suppressed) {
      if (activeEffects.suppressedUntil && context.tick >= activeEffects.suppressedUntil) {
        activeEffects.suppressed = false;
        delete activeEffects.suppressedUntil;
        delete activeEffects.suppressionPower;
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
    const activeEffects = target.components.get('active_effects') as ActiveEffectsComponent | undefined;

    if (activeEffects && activeEffects.suppressed) {
      activeEffects.suppressed = false;
      delete activeEffects.suppressedUntil;
      delete activeEffects.suppressionPower;
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
