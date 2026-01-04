/**
 * Damage types for weapons.
 *
 * Physical: slashing, piercing, bludgeoning
 * Elemental: fire, frost, lightning, poison
 * Magic: magic (generic arcane)
 * Energy: laser, plasma, particle, ion
 * Exotic: force, psionic, void, radiant, necrotic
 */
export type DamageType =
  // Physical (existing)
  | 'slashing'
  | 'piercing'
  | 'bludgeoning'
  // Elemental (existing)
  | 'fire'
  | 'frost'
  | 'lightning'
  | 'poison'
  // Magic (existing)
  | 'magic'
  // Energy (new)
  | 'laser' // Concentrated light - burns, precise
  | 'plasma' // Superheated gas - explosive, area
  | 'particle' // Subatomic - ignores some armor
  | 'ion' // Disrupts electronics/magic
  // Exotic (new)
  | 'force' // Pure kinetic/telekinetic
  | 'psionic' // Mental damage
  | 'void' // Entropy/antimatter
  | 'radiant' // Holy/divine
  | 'necrotic'; // Death/soul damage

/**
 * Weapon categories for skill bonuses and animations.
 */
export type WeaponCategory =
  // Melee
  | 'sword'
  | 'axe'
  | 'mace'
  | 'hammer'
  | 'spear'
  | 'polearm'
  | 'dagger'
  | 'fist'
  | 'whip'
  | 'chain'
  // Ranged Traditional
  | 'bow'
  | 'crossbow'
  | 'throwing'
  | 'sling'
  // Ranged Firearms
  | 'pistol'
  | 'rifle'
  | 'shotgun'
  | 'smg'
  | 'heavy'
  // Ranged Energy
  | 'laser'
  | 'plasma'
  | 'particle'
  | 'beam'
  // Magic Focus
  | 'staff'
  | 'wand'
  | 'orb'
  | 'grimoire'
  // Exotic
  | 'energy_blade'
  | 'force_weapon'
  | 'psionic_weapon'
  | 'soul_weapon';

/**
 * Attack type determines combat behavior.
 */
export type AttackType = 'melee' | 'ranged' | 'magic';

/**
 * Special weapon properties.
 */
export type WeaponSpecial =
  // Damage modifiers
  | 'armor_piercing' // Ignores X% armor
  | 'bleeding' // DoT
  | 'burning' // Fire DoT
  | 'freezing' // Slow effect
  | 'poison' // Poison DoT
  | 'disintegrating' // Reduces max HP
  // Status effects
  | 'stunning' // Stun chance
  | 'knockback' // Pushes enemies
  | 'fear' // Causes fear/fleeing
  | 'blinding' // Reduces accuracy
  | 'grappling' // Pulls enemies / restricts movement
  // Combat modifiers
  | 'shield_breaker' // Extra vs shields
  | 'anti_magic' // Disrupts spells
  | 'lifesteal' // Heals on hit
  | 'parrying' // Can block attacks
  | 'reflecting' // Reflects projectiles
  // Ranged properties
  | 'chain_lightning' // Jumps to nearby targets
  | 'explosive' // AoE on impact
  | 'scatter' // Multiple projectiles (shotgun)
  | 'homing' // Tracks targets
  // Special mechanics
  | 'silenced' // No noise (stealth)
  | 'stealth' // Bonus from stealth attacks
  | 'reach' // Extended melee range
  | 'serrated' // Extra bleeding damage
  | 'swarming' // Multiple small hits
  | 'overcharge'; // Charge for more damage

/**
 * Ammo requirement for ranged weapons.
 */
export interface AmmoRequirement {
  /** Ammo item type (e.g., 'arrow', 'bullet_9mm', 'energy_cell') */
  ammoType: string;
  /** Ammo consumed per shot */
  ammoPerShot: number;
  /** Magazine size (0 = single shot, undefined = no magazine) */
  magazineSize?: number;
  /** Ticks to reload */
  reloadTime?: number;
}

/**
 * Projectile properties for ranged weapons.
 */
export interface ProjectileConfig {
  /** Tiles per tick */
  speed: number;
  /** Arcing projectile (arrows) vs straight (bullets) */
  arc: boolean;
  /** Number of targets hit before stopping */
  penetration: number;
  /** Damage reduction per tile of distance */
  dropoff?: number;
}

/**
 * Trait for items that can be used as weapons.
 */
export interface WeaponTrait {
  /** Base damage value */
  damage: number;

  /** Type of damage dealt */
  damageType: DamageType;

  /** Attack range in tiles (1 = melee, 10+ = ranged) */
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

  // ========== NEW FIELDS ==========

  /** Weapon category for skill bonuses and animations */
  category?: WeaponCategory;

  /** Attack type determines combat behavior */
  attackType?: AttackType;

  /** Ammo requirement for ranged weapons */
  ammo?: AmmoRequirement;

  /** Power cost per shot for energy weapons */
  powerCost?: number;

  /** Minimum range (can't fire at point blank) */
  minRange?: number;

  /** Area of effect radius (0 = single target) */
  aoeRadius?: number;

  /** Projectile properties for ranged weapons */
  projectile?: ProjectileConfig;

  /** Special weapon properties */
  special?: WeaponSpecial[];
}
