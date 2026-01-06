/**
 * ProtectionEffectApplier - Handles protection, shield, and ward effects
 *
 * This applier creates damage absorption shields, resistances, and
 * reflection effects. Protection effects can:
 * - Absorb incoming damage up to a threshold
 * - Reduce damage by a percentage
 * - Add resistance bonuses against specific damage types
 * - Block status effects
 * - Reflect damage back to attackers
 */

import type { Entity } from '@ai-village/core';
import type { World } from '@ai-village/core';
import type {
  ProtectionEffect,
  EffectApplicationResult,
  ActiveEffect,
} from '../SpellEffect.js';
import type { EffectApplier, EffectContext } from '../SpellEffectExecutor.js';
import { createProtectionEffect } from '../SpellEffect.js';
import { SpellEffectRegistry } from '../SpellEffectRegistry.js';

// ============================================================================
// Protection State Tracking
// ============================================================================

/**
 * State for active protection effects.
 * Stored in appliedValues of ActiveEffect.
 */
interface ProtectionState {
  /** Remaining shield HP */
  shieldRemaining: number;
  /** Maximum shield HP */
  shieldMax: number;
  /** Total damage absorbed since application */
  totalAbsorbed: number;
  /** Total damage reflected since application */
  totalReflected: number;
  /** Number of times shield has blocked damage */
  blockedCount: number;
}

// ============================================================================
// ProtectionEffectApplier
// ============================================================================

class ProtectionEffectApplier implements EffectApplier<ProtectionEffect> {
  readonly category = 'protection' as const;

  apply(
    effect: ProtectionEffect,
    caster: Entity,
    target: Entity,
    _world: World,
    context: EffectContext
  ): EffectApplicationResult {
    const appliedValues: Record<string, number> = {};

    // Calculate absorption shield amount if applicable
    let shieldAmount = 0;
    if (effect.absorptionScaling) {
      const scaled = context.scaledValues.get('absorption');
      if (scaled) {
        shieldAmount = scaled.value;
        appliedValues.shieldMax = shieldAmount;
        appliedValues.shieldRemaining = shieldAmount;
      }
    }

    // Store damage reduction percentage
    if (effect.damageReduction !== undefined) {
      appliedValues.damageReduction = effect.damageReduction;
    }

    // Store resistance bonus
    if (effect.resistanceBonus !== undefined) {
      appliedValues.resistanceBonus = effect.resistanceBonus;
    }

    // Store reflection percentage
    if (effect.reflectsDamage && effect.reflectPercentage !== undefined) {
      appliedValues.reflectPercentage = effect.reflectPercentage;
    }

    // Initialize tracking counters
    appliedValues.totalAbsorbed = 0;
    appliedValues.totalReflected = 0;
    appliedValues.blockedCount = 0;

    // Store protection types for quick lookup
    if (effect.protectsAgainst === 'all') {
      appliedValues.protectsAll = 1;
    } else {
      // Store as bitmask or individual flags
      for (let i = 0; i < effect.protectsAgainst.length; i++) {
        appliedValues[`protects_${effect.protectsAgainst[i]}`] = 1;
      }
    }

    // Store blocked statuses
    if (effect.blocksStatuses && effect.blocksStatuses.length > 0) {
      for (let i = 0; i < effect.blocksStatuses.length; i++) {
        appliedValues[`blocks_${effect.blocksStatuses[i]}`] = 1;
      }
    }

    return {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues,
      remainingDuration: effect.duration,
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
    };
  }

  tick(
    _activeEffect: ActiveEffect,
    _effect: ProtectionEffect,
    _target: Entity,
    _world: World,
    _context: EffectContext
  ): void {
    // Protection effects are typically passive and don't tick
    // However, we could implement shield regeneration or decay here if needed

    // Example: Shield decay over time
    // const decayRate = 1; // HP per tick
    // if (activeEffect.appliedValues.shieldRemaining > 0) {
    //   activeEffect.appliedValues.shieldRemaining = Math.max(
    //     0,
    //     activeEffect.appliedValues.shieldRemaining - decayRate
    //   );
    // }

    // Example: Shield refresh every N ticks
    // const refreshInterval = 100; // ticks
    // const ticksSinceApplied = context.tick - activeEffect.appliedAt;
    // if (ticksSinceApplied > 0 && ticksSinceApplied % refreshInterval === 0) {
    //   activeEffect.appliedValues.shieldRemaining = activeEffect.appliedValues.shieldMax;
    // }
  }

  remove(
    _activeEffect: ActiveEffect,
    _effect: ProtectionEffect,
    _target: Entity,
    _world: World
  ): void {
    // Clean up protection state when effect expires or is dispelled
    // No persistent state changes needed for basic protection
    // Could emit event for UI feedback
  }
}

// ============================================================================
// Built-in Protection Effects
// ============================================================================

/**
 * Minor Ward - Small absorption shield
 * Basic protective spell for beginners
 */
export const MINOR_WARD_EFFECT = createProtectionEffect(
  'minor_ward_effect',
  'Minor Ward',
  20, // 20 HP absorption
  300, // 5 seconds at 60 ticks/sec
  {
    description: 'Creates a small protective barrier that absorbs damage.',
    targetType: 'self',
    range: 0,
    protectsAgainst: 'all',
    reflectsDamage: false,
    dispellable: true,
    stackable: false,
    tags: ['protection', 'shield', 'beginner'],
    form: 'body',
    technique: 'protect',
  }
);

/**
 * Fire Shield - Absorbs fire damage and reflects some back
 * Specialized protection against fire attacks
 */
export const FIRE_SHIELD_EFFECT = createProtectionEffect(
  'fire_shield_effect',
  'Fire Shield',
  40, // 40 HP absorption
  600, // 10 seconds
  {
    description: 'Surrounds the caster in flames that absorb fire damage and burn attackers.',
    targetType: 'self',
    range: 0,
    protectsAgainst: ['fire', 'radiant'],
    damageReduction: 25, // 25% reduction against fire
    reflectsDamage: true,
    reflectPercentage: 30, // Reflects 30% of blocked damage
    dispellable: true,
    stackable: false,
    tags: ['protection', 'shield', 'fire', 'reflection'],
    form: 'fire',
    technique: 'protect',
  }
);

/**
 * Ice Armor - Damage reduction and cold immunity
 * Protective ice coating that reduces all incoming damage
 */
export const ICE_ARMOR_EFFECT = createProtectionEffect(
  'ice_armor_effect',
  'Ice Armor',
  60, // 60 HP absorption
  900, // 15 seconds
  {
    description: 'Encases the target in protective ice armor, reducing damage and granting cold immunity.',
    targetType: 'single',
    targetFilter: 'allies',
    range: 5,
    protectsAgainst: ['ice', 'physical'],
    damageReduction: 40, // 40% damage reduction
    resistanceBonus: 50, // +50 resistance to protected types
    reflectsDamage: false,
    blocksStatuses: ['frozen', 'slowed'],
    dispellable: true,
    stackable: false,
    tags: ['protection', 'armor', 'ice', 'buff'],
    form: 'water',
    technique: 'protect',
  }
);

/**
 * Magic Barrier - Blocks magical damage types
 * Specialized protection against spells and magic
 */
export const MAGIC_BARRIER_EFFECT = createProtectionEffect(
  'magic_barrier_effect',
  'Magic Barrier',
  80, // 80 HP absorption
  600, // 10 seconds
  {
    description: 'Creates a shimmering barrier that absorbs magical damage.',
    targetType: 'single',
    targetFilter: 'allies',
    range: 10,
    protectsAgainst: ['force', 'radiant', 'necrotic', 'psychic', 'lightning', 'fire', 'ice'],
    damageReduction: 30, // 30% magical damage reduction
    reflectsDamage: false,
    blocksStatuses: ['silenced', 'cursed'],
    dispellable: true,
    stackable: false,
    tags: ['protection', 'barrier', 'anti-magic'],
    form: 'mind',
    technique: 'protect',
  }
);

/**
 * Divine Protection - Blocks all damage types, short duration
 * Powerful protection spell with limited duration
 */
export const DIVINE_PROTECTION_EFFECT = createProtectionEffect(
  'divine_protection_effect',
  'Divine Protection',
  150, // 150 HP absorption
  180, // 3 seconds (short but powerful)
  {
    description: 'Grants divine protection that blocks all damage types for a brief period.',
    targetType: 'single',
    targetFilter: 'allies',
    range: 15,
    protectsAgainst: 'all',
    damageReduction: 50, // 50% damage reduction
    resistanceBonus: 100, // +100 resistance
    reflectsDamage: false,
    blocksStatuses: ['stunned', 'feared', 'charmed', 'paralyzed'],
    dispellable: false, // Cannot be dispelled
    stackable: false,
    tags: ['protection', 'divine', 'powerful', 'short-duration'],
    form: 'body',
    technique: 'protect',
  }
);

/**
 * Reflection Ward - Reflects percentage of damage
 * Aggressive protection that punishes attackers
 */
export const REFLECTION_WARD_EFFECT = createProtectionEffect(
  'reflection_ward_effect',
  'Reflection Ward',
  50, // 50 HP absorption
  450, // 7.5 seconds
  {
    description: 'Creates a reflective ward that returns a portion of all damage to attackers.',
    targetType: 'self',
    range: 0,
    protectsAgainst: 'all',
    damageReduction: 15, // 15% damage reduction
    reflectsDamage: true,
    reflectPercentage: 50, // Reflects 50% of absorbed damage
    dispellable: true,
    stackable: false,
    tags: ['protection', 'reflection', 'counter'],
    form: 'body',
    technique: 'protect',
  }
);

// ============================================================================
// Registration
// ============================================================================

/**
 * Register the protection effect applier and all built-in protection effects.
 */
export function registerProtectionEffects(): void {
  const registry = SpellEffectRegistry.getInstance();

  // Register built-in protection effects
  registry.register(MINOR_WARD_EFFECT);
  registry.register(FIRE_SHIELD_EFFECT);
  registry.register(ICE_ARMOR_EFFECT);
  registry.register(MAGIC_BARRIER_EFFECT);
  registry.register(DIVINE_PROTECTION_EFFECT);
  registry.register(REFLECTION_WARD_EFFECT);
}

// ============================================================================
// Exports
// ============================================================================

export const protectionEffectApplier = new ProtectionEffectApplier();

export { ProtectionEffectApplier };
export type { ProtectionState };
