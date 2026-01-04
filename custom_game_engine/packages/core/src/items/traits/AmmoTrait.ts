/**
 * AmmoTrait - Defines ammunition properties for ranged weapons
 *
 * Part of the Weapons Expansion (weapons-expansion spec)
 */

/**
 * Trait for items that can be used as ammunition.
 */
export interface AmmoTrait {
  /** Ammo type identifier (matches weapon's ammo.ammoType) */
  ammoType: string;

  /** Multiplier to base weapon damage (1.0 = 100%) */
  damageModifier: number;

  /** Special effect applied on hit */
  specialEffect?:
    | 'armor_piercing' // Ignores some armor
    | 'explosive' // AoE damage
    | 'burning' // Fire DoT
    | 'poison' // Poison DoT
    | 'freezing' // Slow effect
    | 'stunning' // Stun chance
    | 'overcharge'; // Extra damage
}
