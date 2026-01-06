/**
 * EffectAppliers - Implementations of effect appliers for each category
 *
 * These appliers handle the actual game-mechanical application of spell effects.
 * Each applier knows how to apply, tick, and remove effects of its category.
 */

import type { Entity } from '@ai-village/core';
import type { World } from '@ai-village/core';
import type { NeedsComponent } from '@ai-village/core';
import type {
  EffectApplier,
  EffectContext,
} from './SpellEffectExecutor.js';
import { SpellEffectExecutor } from './SpellEffectExecutor.js';
import type {
  DamageEffect,
  HealingEffect,
  ProtectionEffect,
  EffectApplicationResult,
  ActiveEffect,
} from './SpellEffect.js';
import {
  BuffEffectApplier,
  DebuffEffectApplier,
  ControlEffectApplier,
} from './appliers/ControlEffectApplier.js';
import { SummonEffectApplier } from './appliers/SummonEffectApplier.js';
import { TransformEffectApplier } from './appliers/TransformEffectApplier.js';

// ============================================================================
// Damage Applier
// ============================================================================

export class DamageEffectApplier implements EffectApplier<DamageEffect> {
  readonly category = 'damage' as const;

  apply(
    effect: DamageEffect,
    caster: Entity,
    target: Entity,
    _world: World,
    context: EffectContext
  ): EffectApplicationResult {
    const damageValue = context.scaledValues.get('damage');
    if (!damageValue) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: 'No damage value calculated',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    let finalDamage = damageValue.value;

    // Apply crit multiplier
    if (context.isCrit && effect.canCrit) {
      finalDamage *= effect.critMultiplier ?? 2;
    }

    // Apply power multiplier
    finalDamage *= context.powerMultiplier;

    // Apply damage to target
    const needs = target.components.get('needs') as NeedsComponent | undefined;
    if (needs) {
      const currentHealth = needs.health;
      needs.health = Math.max(0, currentHealth - finalDamage);

      return {
        success: true,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {
          damage: finalDamage,
          healthBefore: currentHealth,
          healthAfter: needs.health,
        },
        resisted: false,
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    return {
      success: false,
      effectId: effect.id,
      targetId: target.id,
      appliedValues: {},
      resisted: false,
      error: 'Target has no needs component',
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
    };
  }
}

// ============================================================================
// Healing Applier
// ============================================================================

export class HealingEffectApplier implements EffectApplier<HealingEffect> {
  readonly category = 'healing' as const;

  apply(
    effect: HealingEffect,
    caster: Entity,
    target: Entity,
    _world: World,
    context: EffectContext
  ): EffectApplicationResult {
    const healingValue = context.scaledValues.get('healing');
    if (!healingValue) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: 'No healing value calculated',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    let finalHealing = healingValue.value * context.powerMultiplier;

    // Apply healing to target
    const needs = target.components.get('needs') as NeedsComponent | undefined;
    if (needs) {
      const currentHealth = needs.health;
      const maxHealth = 100;

      if (effect.canOverheal) {
        needs.health = currentHealth + finalHealing;
      } else {
        needs.health = Math.min(maxHealth, currentHealth + finalHealing);
      }

      return {
        success: true,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {
          healing: finalHealing,
          healthBefore: currentHealth,
          healthAfter: needs.health,
        },
        resisted: false,
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    return {
      success: false,
      effectId: effect.id,
      targetId: target.id,
      appliedValues: {},
      resisted: false,
      error: 'Target has no needs component',
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
    };
  }

  tick(
    activeEffect: ActiveEffect,
    effect: HealingEffect,
    target: Entity,
    _world: World,
    context: EffectContext
  ): void {
    if (!effect.overtime) return;

    const tickInterval = effect.tickInterval ?? 20; // Default 1 second at 20 TPS
    const ticksSinceApplied = context.tick - activeEffect.appliedAt;

    // Only heal on tick intervals
    if (ticksSinceApplied % tickInterval !== 0) return;

    const needs = target.components.get('needs') as NeedsComponent | undefined;
    if (needs) {
      const healingPerTick = activeEffect.appliedValues.healing ?? 0;
      const maxHealth = 100;

      if (effect.canOverheal) {
        needs.health += healingPerTick;
      } else {
        needs.health = Math.min(maxHealth, needs.health + healingPerTick);
      }
    }
  }
}

// ============================================================================
// Protection Applier
// ============================================================================

export class ProtectionEffectApplier implements EffectApplier<ProtectionEffect> {
  readonly category = 'protection' as const;

  apply(
    effect: ProtectionEffect,
    caster: Entity,
    target: Entity,
    _world: World,
    context: EffectContext
  ): EffectApplicationResult {
    const absorptionValue = context.scaledValues.get('absorption');
    if (!absorptionValue) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: 'No absorption value calculated',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    const finalAbsorption = absorptionValue.value * context.powerMultiplier;

    // Apply shield/ward to target's magic component
    const magic = target.components.get('magic') as any;
    if (!magic) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: 'Target has no magic component to receive protection',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Store protection shield data
    if (!magic.protectionShields) {
      magic.protectionShields = [];
    }

    const shieldData = {
      id: `${effect.id}_${context.tick}`,
      effectId: effect.id,
      spellId: context.spell.id,
      casterId: caster.id,
      absorption: finalAbsorption,
      remainingAbsorption: finalAbsorption,
      damageReduction: effect.damageReduction ?? 0,
      protectsAgainst: effect.protectsAgainst,
      appliedAt: context.tick,
      expiresAt: context.spell.duration ? context.tick + context.spell.duration : undefined,
    };

    magic.protectionShields.push(shieldData);

    // Add to active effects list for tracking
    if (!magic.activeEffects.includes(effect.id)) {
      magic.activeEffects.push(effect.id);
    }

    return {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues: {
        absorption: finalAbsorption,
        damageReduction: effect.damageReduction ?? 0,
      },
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
    };
  }

  remove(
    activeEffect: ActiveEffect,
    _effect: ProtectionEffect,
    target: Entity,
    _world: World
  ): void {
    const magic = target.components.get('magic') as any;
    if (!magic || !magic.protectionShields) {
      return;
    }

    // Find and remove the shield by effect ID and applied time
    const index = magic.protectionShields.findIndex(
      (shield: any) =>
        shield.effectId === activeEffect.effectId &&
        shield.appliedAt === activeEffect.appliedAt
    );

    if (index !== -1) {
      magic.protectionShields.splice(index, 1);
    }

    // Remove from active effects list if no more shields with this effect ID
    const hasMore = magic.protectionShields.some(
      (shield: any) => shield.effectId === activeEffect.effectId
    );
    if (!hasMore) {
      const effectIndex = magic.activeEffects.indexOf(activeEffect.effectId);
      if (effectIndex !== -1) {
        magic.activeEffects.splice(effectIndex, 1);
      }
    }
  }
}

// ============================================================================
// Buff and Debuff Appliers
// ============================================================================
// Note: These are now imported from ./appliers/ControlEffectApplier.js
// The implementations below are commented out to avoid duplicates

/*
export class BuffEffectApplier implements EffectApplier<BuffEffect> {
  // ... implementation moved to ./appliers/ControlEffectApplier.ts
}

export class DebuffEffectApplier implements EffectApplier<DebuffEffect> {
  // ... implementation moved to ./appliers/ControlEffectApplier.ts
}
*/

// ============================================================================
// Registration
// ============================================================================

/**
 * Register all standard effect appliers with the executor.
 */
export function registerStandardAppliers(): void {
  const executor = SpellEffectExecutor.getInstance();

  executor.registerApplier(new DamageEffectApplier());
  executor.registerApplier(new HealingEffectApplier());
  executor.registerApplier(new ProtectionEffectApplier());
  executor.registerApplier(new BuffEffectApplier());
  executor.registerApplier(new DebuffEffectApplier());
  executor.registerApplier(new ControlEffectApplier());
  executor.registerApplier(new SummonEffectApplier());
  executor.registerApplier(new TransformEffectApplier());
}
