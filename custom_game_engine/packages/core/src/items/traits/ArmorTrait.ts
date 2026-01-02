/**
 * ArmorTrait - Defines protective properties for wearable items
 *
 * **BODY-BASED EQUIPMENT SYSTEM**
 * Equipment adapts to different species via dynamic body part targeting.
 * Supports humanoids, angels with wings, tentacled aliens, multi-armed insectoids, etc.
 *
 * Part of Phase 36: Equipment System
 */

import type { DamageType } from './WeaponTrait.js';
import type { BodyPartType, BodyPartFunction } from '../../components/BodyComponent.js';

/** Armor weight classes affecting movement and stamina */
export type ArmorClass = 'clothing' | 'light' | 'medium' | 'heavy';

/**
 * @deprecated Use EquipmentTarget instead for body-based equipment
 * Legacy equipment slots (humanoid-only)
 */
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
 * Equipment targeting - maps items to body parts dynamically.
 * Supports multi-species equipment (angels, aliens, insectoids).
 */
export interface EquipmentTarget {
  /** Target by body part type (e.g., 'wing', 'tentacle', 'thorax') */
  bodyPartType?: BodyPartType;

  /** Target by body part function (e.g., 'manipulation', 'flight') */
  bodyPartFunction?: BodyPartFunction;

  /** Equip on ALL matching body parts (e.g., all 6 tentacles) */
  multiSlot?: boolean;

  /** Weight limit for this slot (kg) - critical for flying creatures */
  maxWeight?: number;
}

/**
 * ArmorTrait defines the protective properties of an item.
 *
 * **NEW: Body-based targeting system**
 *
 * Example usage:
 * ```typescript
 * // Wing armor for angels
 * const wingGuards: ItemTraits = {
 *   armor: {
 *     defense: 3,
 *     armorClass: 'light',
 *     target: {
 *       bodyPartType: 'wing',
 *       multiSlot: true,
 *       maxWeight: 2.0
 *     },
 *     weight: 1.5,
 *     durability: 1.0,
 *     movementPenalty: 0.02,
 *     flightSpeedPenalty: 0.01,
 *   }
 * };
 *
 * // Tentacle wraps for cephaloids
 * const tentacleWraps: ItemTraits = {
 *   armor: {
 *     defense: 4,
 *     armorClass: 'light',
 *     target: {
 *       bodyPartType: 'tentacle',
 *       multiSlot: true
 *     },
 *     weight: 0.5,
 *     durability: 1.0,
 *     movementPenalty: 0.0,
 *   }
 * };
 * ```
 */
export interface ArmorTrait {
  /** Base defense value (damage reduction) */
  defense: number;

  /** Armor weight class */
  armorClass: ArmorClass;

  /** Body-based equipment targeting (NEW) */
  target: EquipmentTarget;

  /** Weight in kilograms (NEW - critical for flying creatures) */
  weight: number;

  /** Current durability (0-1, where 1 is pristine) */
  durability: number;

  /** Durability lost per hit received (0-1) */
  durabilityLossPerHit: number;

  /** Movement speed penalty (0-1, where 0.2 = 20% slower) */
  movementPenalty: number;

  /** Flight speed penalty for wing armor (0-1, NEW) */
  flightSpeedPenalty?: number;

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
