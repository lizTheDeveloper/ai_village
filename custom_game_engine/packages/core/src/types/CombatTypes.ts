/**
 * Centralized combat and damage type definitions
 */

export type AttackType = 'melee' | 'ranged' | 'magic';

export type DamageType = 'slashing' | 'piercing' | 'bludgeoning' | 'fire' | 'frost' | 'lightning' | 'poison' | 'magic';

export type InjuryType = 'cut' | 'bruise' | 'fracture' | 'burn' | 'puncture';

export type InjurySeverity = 'minor' | 'moderate' | 'severe' | 'critical';

export type ArmorClass = 'clothing' | 'light' | 'medium' | 'heavy';
