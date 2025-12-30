/**
 * ArmorTrait - Defines protective properties for wearable items
 *
 * Forward-compatibility trait for future combat/defense systems.
 * Items with this trait can be equipped to provide damage reduction.
 *
 * Part of Forward-Compatibility Phase
 */

import type { DamageType } from './WeaponTrait.js';

/** Armor weight classes affecting movement and stamina */
export type ArmorClass = 'clothing' | 'light' | 'medium' | 'heavy';

/** Equipment slots that armor can occupy */
export type ArmorSlot =
  | 'head'
  | 'neck'
  | 'torso'
  | 'back'
  | 'hands'
  | 'waist'
  | 'legs'
  | 'feet';

/**
 * ArmorTrait defines the protective properties of an item.
 *
 * Example usage:
 * ```typescript
 * const leatherArmor: ItemTraits = {
 *   armor: {
 *     defense: 5,
 *     armorClass: 'light',
 *     slot: 'torso',
 *     durability: 1.0,
 *     movementPenalty: 0.05,
 *   }
 * };
 * ```
 */
export interface ArmorTrait {
  /** Base defense value (damage reduction) */
  defense: number;

  /** Armor weight class */
  armorClass: ArmorClass;

  /** Which equipment slot this armor occupies */
  slot: ArmorSlot;

  /** Current durability (0-1, where 1 is pristine) */
  durability: number;

  /** Durability lost per hit received (0-1) */
  durabilityLossPerHit: number;

  /** Movement speed penalty (0-1, where 0.2 = 20% slower) */
  movementPenalty: number;

  /** Stamina/energy drain multiplier (1.0 = normal, 1.5 = 50% more drain) */
  staminaDrainMultiplier?: number;

  /** Resistances to specific damage types (0-1 = percentage reduction) */
  resistances?: Partial<Record<DamageType, number>>;

  /** Weaknesses to specific damage types (values > 1 = extra damage) */
  weaknesses?: Partial<Record<DamageType, number>>;

  /** Whether this armor is magical/enchanted */
  magical?: boolean;

  /** Temperature regulation bonus (-10 to +10, positive = warmer) */
  temperatureModifier?: number;

  /** Noise level when moving (0-1, affects stealth) */
  noiseLevel?: number;
}

/**
 * Calculate effective defense after durability degradation.
 */
export function getEffectiveDefense(armor: ArmorTrait): number {
  return armor.defense * armor.durability;
}

/**
 * Calculate damage reduction percentage.
 * @param armor - The armor trait
 * @param damageType - Type of incoming damage
 * @returns Damage reduction as decimal (0.3 = 30% reduction)
 */
export function calculateDamageReduction(
  armor: ArmorTrait,
  damageType: DamageType
): number {
  const baseReduction = getEffectiveDefense(armor) / 100; // Scale defense to percentage

  // Apply resistance bonus
  const resistance = armor.resistances?.[damageType] ?? 0;

  // Apply weakness penalty
  const weakness = armor.weaknesses?.[damageType] ?? 1;

  // Final reduction (capped at 0.9 = 90% max reduction)
  const finalReduction = (baseReduction + resistance) / weakness;
  return Math.min(0.9, Math.max(0, finalReduction));
}

/**
 * Apply durability damage to armor.
 */
export function degradeArmor(armor: ArmorTrait): ArmorTrait {
  return {
    ...armor,
    durability: Math.max(0, armor.durability - armor.durabilityLossPerHit),
  };
}

/**
 * Check if armor is broken (durability depleted).
 */
export function isArmorBroken(armor: ArmorTrait): boolean {
  return armor.durability <= 0;
}
