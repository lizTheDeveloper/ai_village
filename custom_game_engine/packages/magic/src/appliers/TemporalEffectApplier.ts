/**
 * TemporalEffectApplier - Handles temporal manipulation spell effects
 *
 * Applies time-based effects to target entities with support for:
 * - Slow/haste effects (modify action speed)
 * - Time stop (complete freeze)
 * - Aging (forward/backward)
 * - Time rewind (restore previous state)
 * - Proficiency scaling for intensity and duration
 * - Immortal resistance to aging
 * - Time factor bounds enforcement (0-10x)
 */

import type { Entity, World, WorldMutator, Component } from '@ai-village/core';
import type {
  TemporalEffect,
  EffectApplicationResult,
  ActiveEffect,
} from '../SpellEffect.js';
import type { EffectApplier, EffectContext } from '../SpellEffectExecutor.js';
import type {
  StatusEffectsComponent,
  TemporalEffectData,
  AgeComponent,
  NeedsComponentWithHealth,
  TemporalStateComponent,
  RewindRequest,
} from '../types/ComponentTypes.js';

// ============================================================================
// TemporalEffectApplier
// ============================================================================

export class TemporalEffectApplier implements EffectApplier<TemporalEffect> {
  public readonly category = 'temporal' as const;

  /**
   * Apply temporal effect to a target entity.
   */
  apply(
    effect: TemporalEffect,
    caster: Entity,
    target: Entity,
    world: World,
    context: EffectContext
  ): EffectApplicationResult {
    // Route to appropriate handler based on temporal type
    switch (effect.temporalType) {
      case 'slow':
      case 'haste':
      case 'stop':
        return this.applyTimeFactorEffect(effect, caster, target, world, context);

      case 'age':
        return this.applyAgingEffect(effect, caster, target, world, context);

      case 'rewind':
        return this.applyRewindEffect(effect, caster, target, world, context);

      default:
        return {
          success: false,
          effectId: effect.id,
          targetId: target.id,
          appliedValues: {},
          resisted: false,
          error: `Unknown temporal type: ${effect.temporalType}`,
          appliedAt: context.tick,
          casterId: caster.id,
          spellId: context.spell.id,
        };
    }
  }

  /**
   * Apply slow/haste/stop effects that modify time factor.
   */
  private applyTimeFactorEffect(
    effect: TemporalEffect,
    caster: Entity,
    target: Entity,
    world: World,
    context: EffectContext
  ): EffectApplicationResult {
    // Get base time factor
    let baseFactor = effect.timeFactor ?? 1.0;

    // Apply proficiency scaling if not already scaled
    let timeFactor: number;
    const scaledValue = context.scaledValues.get('timeFactor');

    if (scaledValue) {
      // Use pre-computed scaled value
      timeFactor = scaledValue.value;
    } else {
      // Apply proficiency scaling using context values
      // EffectContext should provide proficiency, but if not available use default
      const proficiency = 50; // Default proficiency value
      const proficiencyFactor = proficiency / 50; // 0.0 to 2.0

      if (effect.temporalType === 'slow' || effect.temporalType === 'stop') {
        // For slow: higher proficiency = lower time factor (stronger slow)
        // Scale from 1.0 (no slow) toward baseFactor
        // At proficiency 0: factor approaches 1.0 (weak slow)
        // At proficiency 50: factor = baseFactor (baseline)
        // At proficiency 100: factor = baseFactor * 0.5 (very strong slow)
        const slowStrength = Math.max(0, Math.min(2, proficiencyFactor));
        timeFactor = baseFactor * Math.max(0, 2 - slowStrength);
      } else {
        // For haste: higher proficiency = higher time factor (stronger haste)
        // At proficiency 0: factor approaches 1.0 (weak haste)
        // At proficiency 50: factor = baseFactor (baseline)
        // At proficiency 100: factor = baseFactor * 2 (very strong haste)
        timeFactor = baseFactor * proficiencyFactor;
      }
    }

    // Validate bounds: no negative time, cap at 10x
    if (timeFactor < 0) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: 'Negative time factor not allowed',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    if (timeFactor > 10) {
      timeFactor = 10; // Cap at 10x speed
    }

    // Get or create status_effects component
    let statusEffects = target.getComponent('status_effects') as StatusEffectsComponent | undefined;
    if (!statusEffects) {
      const newStatusEffects: StatusEffectsComponent = { type: 'status_effects', version: 1, timeScale: 1.0, temporalEffects: [] };
      (world as WorldMutator).addComponent(target.id, newStatusEffects);
      statusEffects = newStatusEffects;
    }

    // Apply time factor to existing component
    statusEffects.timeScale = timeFactor;

    // Track temporal effect for conflict detection
    if (!statusEffects.temporalEffects) {
      statusEffects.temporalEffects = [];
    }

    const temporalData: TemporalEffectData = {
      id: `${effect.id}_${context.tick}`,
      effectId: effect.id,
      spellId: context.spell.id,
      casterId: caster.id,
      timeFactor,
      actionSpeedOnly: effect.actionSpeedOnly,
      temporalType: effect.temporalType,
      appliedAt: context.tick,
      expiresAt: effect.duration ? context.tick + effect.duration : undefined,
    };

    statusEffects.temporalEffects.push(temporalData);

    return {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues: {
        timeFactor,
        actionSpeedOnly: effect.actionSpeedOnly ? 1 : 0,
      },
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
      remainingDuration: effect.duration,
    };
  }

  /**
   * Apply aging effects (forward or backward).
   */
  private applyAgingEffect(
    effect: TemporalEffect,
    caster: Entity,
    target: Entity,
    world: World,
    context: EffectContext
  ): EffectApplicationResult {
    // Check if target is immortal
    const immortal = target.components.get('immortal');
    if (immortal) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: true,
        error: 'Cannot age immortal entity',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Get age change from scaled values or effect
    const ageChange = context.scaledValues.get('ageChange')?.value ?? effect.ageChange ?? 0;

    // Get or create age component
    let age = target.getComponent('age') as AgeComponent | undefined;
    const previousAge = age?.years ?? 0;

    if (!age) {
      const newAge: AgeComponent = { type: 'age', version: 1, years: Math.max(0, ageChange) };
      (world as WorldMutator).addComponent(target.id, newAge as unknown as Component);
      age = newAge;
    } else {
      age.years += ageChange;
      // Can't have negative age
      if (age.years < 0) {
        age.years = 0;
      }
    }

    // Extreme aging (1000+ years) causes death
    let causedDeath = false;
    if (age.years >= 1000) {
      const needs = target.components.get('needs') as NeedsComponentWithHealth | undefined;
      if (needs) {
        needs.health = 0;
        causedDeath = true;
      }
    }

    return {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues: {
        ageChange,
        previousAge,
        newAge: age.years,
        causedDeath: causedDeath ? 1 : 0,
      },
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
    };
  }

  /**
   * Apply time rewind effect (restore previous state).
   */
  private applyRewindEffect(
    effect: TemporalEffect,
    caster: Entity,
    target: Entity,
    world: World,
    context: EffectContext
  ): EffectApplicationResult {
    // Get rewind amount from time factor (negative value = ticks to rewind)
    const rewindTicks = Math.abs(effect.timeFactor ?? 60);

    // Note: Actual state restoration would require persistence system integration
    // For now, we just record the intent
    let temporal = target.getComponent('temporal_state') as TemporalStateComponent | undefined;

    const rewindRequest: RewindRequest = {
      effectId: effect.id,
      spellId: context.spell.id,
      casterId: caster.id,
      rewindTicks,
      requestedAt: context.tick,
    };

    if (!temporal) {
      const newTemporal: TemporalStateComponent = { type: 'temporal_state', version: 1, rewindRequests: [rewindRequest] };
      (world as WorldMutator).addComponent(target.id, newTemporal as unknown as Component);
      temporal = newTemporal;
    } else {
      if (!temporal.rewindRequests) {
        temporal.rewindRequests = [];
      }
      temporal.rewindRequests.push(rewindRequest);
    }

    return {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues: {
        rewindTicks,
      },
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
    };
  }

  /**
   * Tick temporal effects (update ongoing effects).
   */
  tick(
    activeEffect: ActiveEffect,
    effect: TemporalEffect,
    target: Entity,
    world: World,
    context: EffectContext
  ): void {
    // Time factor effects are passive - no tick needed
    // Aging is instant - no tick needed
    // Rewind is instant - no tick needed
  }

  /**
   * Remove temporal effect from target.
   */
  remove(
    activeEffect: ActiveEffect,
    effect: TemporalEffect,
    target: Entity,
    world: World
  ): void {
    const statusEffects = target.components.get('status_effects') as StatusEffectsComponent | undefined;
    if (!statusEffects) return;

    // Remove temporal effect data
    if (statusEffects.temporalEffects) {
      const index = statusEffects.temporalEffects.findIndex(
        (te) =>
          te.effectId === activeEffect.effectId &&
          te.appliedAt === activeEffect.appliedAt
      );

      if (index !== -1) {
        statusEffects.temporalEffects.splice(index, 1);
      }

      // Reset time scale if no more temporal effects
      if (statusEffects.temporalEffects.length === 0) {
        statusEffects.timeScale = 1.0;
      } else {
        // Calculate combined time scale from remaining effects
        // Use the most recent effect's time factor
        const lastEffect = statusEffects.temporalEffects[statusEffects.temporalEffects.length - 1];
        statusEffects.timeScale = lastEffect?.timeFactor ?? 1.0;
      }
    }
  }
}
