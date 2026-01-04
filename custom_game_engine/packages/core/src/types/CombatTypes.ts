/**
 * Centralized combat and damage type definitions
 *
 * NOTE: DamageType and AttackType are now defined in WeaponTrait.ts
 * and re-exported here for backward compatibility.
 */

// Re-export from WeaponTrait to avoid duplication
export type {
  DamageType,
  AttackType,
  WeaponCategory,
  WeaponSpecial,
  AmmoRequirement,
  ProjectileConfig,
} from '../items/traits/WeaponTrait.js';

export type InjuryType = 'cut' | 'bruise' | 'fracture' | 'burn' | 'puncture' | 'frostbite' | 'shock' | 'radiation' | 'psychic';

export type InjurySeverity = 'minor' | 'moderate' | 'severe' | 'critical';

export type ArmorClass = 'clothing' | 'light' | 'medium' | 'heavy';
