/**
 * Damage types for weapons.
 */
export type DamageType = 'slashing' | 'piercing' | 'bludgeoning' | 'fire' | 'frost' | 'lightning' | 'poison' | 'magic';

/**
 * Trait for items that can be used as weapons.
 */
export interface WeaponTrait {
  /** Base damage value */
  damage: number;

  /** Type of damage dealt */
  damageType: DamageType;

  /** Attack range in tiles */
  range: number;

  /** Attacks per second */
  attackSpeed: number;

  /** Condition lost per attack (0-1) */
  durabilityLoss: number;

  /** Whether this is a two-handed weapon */
  twoHanded?: boolean;

  /** Critical hit chance (0-1) */
  critChance?: number;

  /** Critical hit damage multiplier */
  critMultiplier?: number;
}
