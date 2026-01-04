/**
 * Energy Weapon Item Definitions
 *
 * Includes lasers, plasma weapons, particle weapons, ion weapons, and beam weapons.
 * Part of the Weapons Expansion (weapons-expansion spec)
 *
 * NOTE: These are Clarketech-tier weapons requiring advanced research.
 */

import { defineItem, type ItemDefinition } from '../ItemDefinition.js';

/**
 * Laser weapons - precise, efficient, burning damage
 */
export const LASER_WEAPONS: ItemDefinition[] = [
  defineItem('laser_pistol', 'Laser Pistol', 'equipment', {
    weight: 0.8,
    stackSize: 1,
    baseValue: 500,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 15,
        damageType: 'laser',
        range: 20,
        attackSpeed: 1.2,
        durabilityLoss: 0.005,
        category: 'laser',
        attackType: 'ranged',
        ammo: { ammoType: 'energy_cell', ammoPerShot: 1, magazineSize: 20, reloadTime: 20 },
        projectile: { speed: 100, arc: false, penetration: 1 },
        special: ['burning'],
      },
    },
  }),

  defineItem('laser_carbine', 'Laser Carbine', 'equipment', {
    weight: 2.0,
    stackSize: 1,
    baseValue: 700,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 20,
        damageType: 'laser',
        range: 35,
        attackSpeed: 1.0,
        durabilityLoss: 0.006,
        twoHanded: true,
        category: 'laser',
        attackType: 'ranged',
        ammo: { ammoType: 'energy_cell', ammoPerShot: 2, magazineSize: 25, reloadTime: 25 },
        projectile: { speed: 100, arc: false, penetration: 1 },
        special: ['burning', 'armor_piercing'],
      },
    },
  }),

  defineItem('laser_rifle', 'Laser Rifle', 'equipment', {
    weight: 2.5,
    stackSize: 1,
    baseValue: 900,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 25,
        damageType: 'laser',
        range: 50,
        attackSpeed: 0.8,
        durabilityLoss: 0.008,
        twoHanded: true,
        category: 'laser',
        attackType: 'ranged',
        ammo: { ammoType: 'energy_cell', ammoPerShot: 2, magazineSize: 30, reloadTime: 30 },
        projectile: { speed: 100, arc: false, penetration: 2 },
        special: ['burning', 'armor_piercing'],
      },
    },
  }),

  defineItem('laser_sniper', 'Laser Sniper Rifle', 'equipment', {
    weight: 4.0,
    stackSize: 1,
    baseValue: 1500,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 45,
        damageType: 'laser',
        range: 100,
        attackSpeed: 0.4,
        durabilityLoss: 0.010,
        twoHanded: true,
        minRange: 8,
        category: 'laser',
        attackType: 'ranged',
        ammo: { ammoType: 'energy_cell', ammoPerShot: 5, magazineSize: 20, reloadTime: 50 },
        projectile: { speed: 100, arc: false, penetration: 3 },
        special: ['burning', 'armor_piercing'],
        critChance: 0.18,
        critMultiplier: 2.5,
      },
    },
  }),

  defineItem('laser_cannon', 'Laser Cannon', 'equipment', {
    weight: 8.0,
    stackSize: 1,
    baseValue: 2000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 50,
        damageType: 'laser',
        range: 80,
        attackSpeed: 0.3,
        durabilityLoss: 0.015,
        twoHanded: true,
        aoeRadius: 1,
        category: 'beam',
        attackType: 'ranged',
        ammo: { ammoType: 'energy_cell', ammoPerShot: 10, magazineSize: 50, reloadTime: 80 },
        projectile: { speed: 100, arc: false, penetration: 5 },
        special: ['burning', 'armor_piercing', 'overcharge'],
      },
    },
  }),
];

/**
 * Plasma weapons - explosive, area damage, devastating
 */
export const PLASMA_WEAPONS: ItemDefinition[] = [
  defineItem('plasma_pistol', 'Plasma Pistol', 'equipment', {
    weight: 1.2,
    stackSize: 1,
    baseValue: 600,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 20,
        damageType: 'plasma',
        range: 15,
        attackSpeed: 0.8,
        durabilityLoss: 0.01,
        category: 'plasma',
        attackType: 'ranged',
        aoeRadius: 1,
        ammo: { ammoType: 'plasma_fuel', ammoPerShot: 1, magazineSize: 10, reloadTime: 40 },
        projectile: { speed: 20, arc: false, penetration: 1 },
        special: ['burning', 'explosive'],
      },
    },
  }),

  defineItem('plasma_rifle', 'Plasma Rifle', 'equipment', {
    weight: 4.0,
    stackSize: 1,
    baseValue: 1000,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 35,
        damageType: 'plasma',
        range: 30,
        attackSpeed: 0.5,
        durabilityLoss: 0.015,
        twoHanded: true,
        aoeRadius: 2,
        category: 'plasma',
        attackType: 'ranged',
        ammo: { ammoType: 'plasma_fuel', ammoPerShot: 2, magazineSize: 20, reloadTime: 60 },
        projectile: { speed: 25, arc: false, penetration: 1 },
        special: ['burning', 'explosive', 'armor_piercing'],
      },
    },
  }),

  defineItem('plasma_repeater', 'Plasma Repeater', 'equipment', {
    weight: 5.0,
    stackSize: 1,
    baseValue: 1400,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 25,
        damageType: 'plasma',
        range: 25,
        attackSpeed: 1.2,
        durabilityLoss: 0.02,
        twoHanded: true,
        aoeRadius: 1,
        category: 'plasma',
        attackType: 'ranged',
        ammo: { ammoType: 'plasma_fuel', ammoPerShot: 1, magazineSize: 30, reloadTime: 50 },
        projectile: { speed: 22, arc: false, penetration: 1 },
        special: ['burning', 'explosive'],
      },
    },
  }),

  defineItem('plasma_cannon', 'Plasma Cannon', 'equipment', {
    weight: 12.0,
    stackSize: 1,
    baseValue: 2500,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 80,
        damageType: 'plasma',
        range: 40,
        attackSpeed: 0.2,
        durabilityLoss: 0.025,
        twoHanded: true,
        minRange: 5,
        aoeRadius: 4,
        category: 'plasma',
        attackType: 'ranged',
        ammo: { ammoType: 'plasma_fuel', ammoPerShot: 5, magazineSize: 25, reloadTime: 100 },
        projectile: { speed: 15, arc: true, penetration: 1 },
        special: ['burning', 'explosive', 'armor_piercing'],
      },
    },
  }),

  defineItem('plasma_caster', 'Plasma Caster', 'equipment', {
    weight: 15.0,
    stackSize: 1,
    baseValue: 3500,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 120,
        damageType: 'plasma',
        range: 50,
        attackSpeed: 0.15,
        durabilityLoss: 0.03,
        twoHanded: true,
        minRange: 8,
        aoeRadius: 6,
        category: 'plasma',
        attackType: 'ranged',
        ammo: { ammoType: 'plasma_fuel', ammoPerShot: 10, magazineSize: 20, reloadTime: 150 },
        projectile: { speed: 12, arc: true, penetration: 1 },
        special: ['burning', 'explosive', 'armor_piercing'],
      },
    },
  }),
];

/**
 * Particle weapons - ignore armor, subatomic damage
 */
export const PARTICLE_WEAPONS: ItemDefinition[] = [
  defineItem('particle_pistol', 'Particle Pistol', 'equipment', {
    weight: 1.0,
    stackSize: 1,
    baseValue: 800,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 18,
        damageType: 'particle',
        range: 18,
        attackSpeed: 1.0,
        durabilityLoss: 0.008,
        category: 'particle',
        attackType: 'ranged',
        ammo: { ammoType: 'energy_cell', ammoPerShot: 2, magazineSize: 20, reloadTime: 30 },
        projectile: { speed: 80, arc: false, penetration: 4 },
        special: ['armor_piercing'],
      },
    },
  }),

  defineItem('particle_rifle', 'Particle Rifle', 'equipment', {
    weight: 3.5,
    stackSize: 1,
    baseValue: 1200,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 30,
        damageType: 'particle',
        range: 60,
        attackSpeed: 0.6,
        durabilityLoss: 0.012,
        twoHanded: true,
        category: 'particle',
        attackType: 'ranged',
        ammo: { ammoType: 'energy_cell', ammoPerShot: 3, magazineSize: 30, reloadTime: 50 },
        projectile: { speed: 80, arc: false, penetration: 5 },
        special: ['armor_piercing'],
      },
    },
  }),

  defineItem('particle_accelerator', 'Particle Accelerator', 'equipment', {
    weight: 10.0,
    stackSize: 1,
    baseValue: 3000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 60,
        damageType: 'particle',
        range: 80,
        attackSpeed: 0.3,
        durabilityLoss: 0.02,
        twoHanded: true,
        category: 'particle',
        attackType: 'ranged',
        ammo: { ammoType: 'energy_cell', ammoPerShot: 8, magazineSize: 40, reloadTime: 100 },
        projectile: { speed: 90, arc: false, penetration: 8 },
        special: ['armor_piercing'],
        critChance: 0.15,
        critMultiplier: 2.5,
      },
    },
  }),
];

/**
 * Ion weapons - disrupts electronics and magic
 */
export const ION_WEAPONS: ItemDefinition[] = [
  defineItem('ion_pistol', 'Ion Pistol', 'equipment', {
    weight: 1.0,
    stackSize: 1,
    baseValue: 600,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 10,
        damageType: 'ion',
        range: 15,
        attackSpeed: 1.0,
        durabilityLoss: 0.008,
        category: 'laser',
        attackType: 'ranged',
        ammo: { ammoType: 'energy_cell', ammoPerShot: 1, magazineSize: 15, reloadTime: 25 },
        projectile: { speed: 60, arc: false, penetration: 1 },
        special: ['anti_magic', 'stunning'],
      },
    },
  }),

  defineItem('ion_rifle', 'Ion Rifle', 'equipment', {
    weight: 3.0,
    stackSize: 1,
    baseValue: 900,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 18,
        damageType: 'ion',
        range: 35,
        attackSpeed: 0.7,
        durabilityLoss: 0.010,
        twoHanded: true,
        category: 'laser',
        attackType: 'ranged',
        ammo: { ammoType: 'energy_cell', ammoPerShot: 2, magazineSize: 25, reloadTime: 40 },
        projectile: { speed: 65, arc: false, penetration: 2 },
        special: ['anti_magic', 'stunning'],
      },
    },
  }),

  defineItem('ion_cannon', 'Ion Cannon', 'equipment', {
    weight: 8.0,
    stackSize: 1,
    baseValue: 1800,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 30,
        damageType: 'ion',
        range: 50,
        attackSpeed: 0.4,
        durabilityLoss: 0.015,
        twoHanded: true,
        aoeRadius: 3,
        category: 'beam',
        attackType: 'ranged',
        ammo: { ammoType: 'energy_cell', ammoPerShot: 5, magazineSize: 40, reloadTime: 80 },
        projectile: { speed: 70, arc: false, penetration: 3 },
        special: ['anti_magic', 'stunning', 'shield_breaker'],
      },
    },
  }),
];

/**
 * Beam weapons - continuous damage
 */
export const BEAM_WEAPONS: ItemDefinition[] = [
  defineItem('beam_rifle', 'Continuous Beam Rifle', 'equipment', {
    weight: 5.0,
    stackSize: 1,
    baseValue: 1200,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 8,
        damageType: 'laser',
        range: 40,
        attackSpeed: 5.0,
        durabilityLoss: 0.02,
        twoHanded: true,
        category: 'beam',
        attackType: 'ranged',
        powerCost: 1,
        projectile: { speed: 100, arc: false, penetration: 1 },
        special: ['burning'],
      },
    },
  }),

  defineItem('plasma_beam', 'Plasma Beam Projector', 'equipment', {
    weight: 7.0,
    stackSize: 1,
    baseValue: 1800,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 12,
        damageType: 'plasma',
        range: 30,
        attackSpeed: 4.0,
        durabilityLoss: 0.025,
        twoHanded: true,
        aoeRadius: 1,
        category: 'beam',
        attackType: 'ranged',
        powerCost: 2,
        projectile: { speed: 100, arc: false, penetration: 1 },
        special: ['burning', 'explosive'],
      },
    },
  }),

  defineItem('particle_beam', 'Particle Beam Cannon', 'equipment', {
    weight: 12.0,
    stackSize: 1,
    baseValue: 4000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 15,
        damageType: 'particle',
        range: 60,
        attackSpeed: 3.0,
        durabilityLoss: 0.03,
        twoHanded: true,
        category: 'beam',
        attackType: 'ranged',
        powerCost: 3,
        projectile: { speed: 100, arc: false, penetration: 10 },
        special: ['armor_piercing'],
      },
    },
  }),
];

/**
 * All energy weapons combined
 */
export const ALL_ENERGY_WEAPONS: ItemDefinition[] = [
  ...LASER_WEAPONS,
  ...PLASMA_WEAPONS,
  ...PARTICLE_WEAPONS,
  ...ION_WEAPONS,
  ...BEAM_WEAPONS,
];
