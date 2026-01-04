/**
 * Firearm Weapon Item Definitions
 *
 * Includes pistols, rifles, shotguns, SMGs, and heavy weapons.
 * Part of the Weapons Expansion (weapons-expansion spec)
 */

import { defineItem, type ItemDefinition } from '../ItemDefinition.js';

/**
 * Early firearms (black powder era)
 */
export const BLACKPOWDER_FIREARMS: ItemDefinition[] = [
  defineItem('flintlock_pistol', 'Flintlock Pistol', 'equipment', {
    weight: 1.2,
    stackSize: 1,
    baseValue: 150,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 15,
        damageType: 'piercing',
        range: 10,
        attackSpeed: 0.3,
        durabilityLoss: 0.02,
        category: 'pistol',
        attackType: 'ranged',
        ammo: { ammoType: 'bullet_musket', ammoPerShot: 1, magazineSize: 1, reloadTime: 100 },
        projectile: { speed: 25, arc: false, penetration: 1 },
        special: ['armor_piercing'],
      },
    },
  }),

  defineItem('musket', 'Musket', 'equipment', {
    weight: 4.5,
    stackSize: 1,
    baseValue: 200,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 25,
        damageType: 'piercing',
        range: 30,
        attackSpeed: 0.2,
        durabilityLoss: 0.02,
        twoHanded: true,
        category: 'rifle',
        attackType: 'ranged',
        ammo: { ammoType: 'bullet_musket', ammoPerShot: 1, magazineSize: 1, reloadTime: 150 },
        projectile: { speed: 30, arc: false, penetration: 1 },
        special: ['armor_piercing'],
      },
    },
  }),

  defineItem('blunderbuss', 'Blunderbuss', 'equipment', {
    weight: 3.5,
    stackSize: 1,
    baseValue: 180,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 20,
        damageType: 'piercing',
        range: 8,
        attackSpeed: 0.25,
        durabilityLoss: 0.02,
        twoHanded: true,
        category: 'shotgun',
        attackType: 'ranged',
        ammo: { ammoType: 'bullet_musket', ammoPerShot: 1, magazineSize: 1, reloadTime: 120 },
        projectile: { speed: 20, arc: false, penetration: 1, dropoff: 0.4 },
        special: ['scatter'],
      },
    },
  }),
];

/**
 * Pistols (revolvers and semi-automatic)
 */
export const PISTOL_WEAPONS: ItemDefinition[] = [
  defineItem('revolver', 'Revolver', 'equipment', {
    weight: 1.0,
    stackSize: 1,
    baseValue: 250,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 18,
        damageType: 'piercing',
        range: 15,
        attackSpeed: 0.8,
        durabilityLoss: 0.01,
        category: 'pistol',
        attackType: 'ranged',
        ammo: { ammoType: 'bullet_pistol', ammoPerShot: 1, magazineSize: 6, reloadTime: 60 },
        projectile: { speed: 30, arc: false, penetration: 1 },
      },
    },
  }),

  defineItem('revolver_magnum', 'Magnum Revolver', 'equipment', {
    weight: 1.5,
    stackSize: 1,
    baseValue: 400,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 28,
        damageType: 'piercing',
        range: 18,
        attackSpeed: 0.6,
        durabilityLoss: 0.012,
        category: 'pistol',
        attackType: 'ranged',
        ammo: { ammoType: 'bullet_pistol', ammoPerShot: 1, magazineSize: 6, reloadTime: 70 },
        projectile: { speed: 35, arc: false, penetration: 1 },
        special: ['armor_piercing'],
      },
    },
  }),

  defineItem('pistol_auto', 'Automatic Pistol', 'equipment', {
    weight: 0.9,
    stackSize: 1,
    baseValue: 300,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 12,
        damageType: 'piercing',
        range: 12,
        attackSpeed: 1.5,
        durabilityLoss: 0.008,
        category: 'pistol',
        attackType: 'ranged',
        ammo: { ammoType: 'bullet_pistol', ammoPerShot: 1, magazineSize: 15, reloadTime: 30 },
        projectile: { speed: 35, arc: false, penetration: 1 },
      },
    },
  }),

  defineItem('pistol_heavy', 'Heavy Pistol', 'equipment', {
    weight: 1.3,
    stackSize: 1,
    baseValue: 350,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 22,
        damageType: 'piercing',
        range: 15,
        attackSpeed: 0.9,
        durabilityLoss: 0.01,
        category: 'pistol',
        attackType: 'ranged',
        ammo: { ammoType: 'bullet_pistol', ammoPerShot: 1, magazineSize: 8, reloadTime: 35 },
        projectile: { speed: 38, arc: false, penetration: 1 },
        special: ['armor_piercing'],
        critChance: 0.08,
        critMultiplier: 1.8,
      },
    },
  }),

  defineItem('machine_pistol', 'Machine Pistol', 'equipment', {
    weight: 1.1,
    stackSize: 1,
    baseValue: 450,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 8,
        damageType: 'piercing',
        range: 10,
        attackSpeed: 3.0,
        durabilityLoss: 0.015,
        category: 'pistol',
        attackType: 'ranged',
        ammo: { ammoType: 'bullet_pistol', ammoPerShot: 2, magazineSize: 20, reloadTime: 25 },
        projectile: { speed: 32, arc: false, penetration: 1 },
      },
    },
  }),
];

/**
 * Rifles
 */
export const RIFLE_WEAPONS: ItemDefinition[] = [
  defineItem('rifle_bolt', 'Bolt-Action Rifle', 'equipment', {
    weight: 4.0,
    stackSize: 1,
    baseValue: 350,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 30,
        damageType: 'piercing',
        range: 50,
        attackSpeed: 0.5,
        durabilityLoss: 0.01,
        twoHanded: true,
        category: 'rifle',
        attackType: 'ranged',
        ammo: { ammoType: 'bullet_rifle', ammoPerShot: 1, magazineSize: 5, reloadTime: 40 },
        projectile: { speed: 50, arc: false, penetration: 2 },
        special: ['armor_piercing'],
      },
    },
  }),

  defineItem('rifle_lever', 'Lever-Action Rifle', 'equipment', {
    weight: 3.5,
    stackSize: 1,
    baseValue: 300,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 22,
        damageType: 'piercing',
        range: 35,
        attackSpeed: 0.8,
        durabilityLoss: 0.01,
        twoHanded: true,
        category: 'rifle',
        attackType: 'ranged',
        ammo: { ammoType: 'bullet_rifle', ammoPerShot: 1, magazineSize: 8, reloadTime: 50 },
        projectile: { speed: 45, arc: false, penetration: 1 },
      },
    },
  }),

  defineItem('rifle_semi', 'Semi-Auto Rifle', 'equipment', {
    weight: 3.5,
    stackSize: 1,
    baseValue: 450,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 24,
        damageType: 'piercing',
        range: 40,
        attackSpeed: 1.2,
        durabilityLoss: 0.012,
        twoHanded: true,
        category: 'rifle',
        attackType: 'ranged',
        ammo: { ammoType: 'bullet_rifle', ammoPerShot: 1, magazineSize: 10, reloadTime: 40 },
        projectile: { speed: 48, arc: false, penetration: 1 },
      },
    },
  }),

  defineItem('rifle_auto', 'Automatic Rifle', 'equipment', {
    weight: 3.5,
    stackSize: 1,
    baseValue: 550,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 20,
        damageType: 'piercing',
        range: 40,
        attackSpeed: 2.0,
        durabilityLoss: 0.015,
        twoHanded: true,
        category: 'rifle',
        attackType: 'ranged',
        ammo: { ammoType: 'bullet_rifle', ammoPerShot: 1, magazineSize: 30, reloadTime: 50 },
        projectile: { speed: 45, arc: false, penetration: 1 },
      },
    },
  }),

  defineItem('rifle_sniper', 'Sniper Rifle', 'equipment', {
    weight: 5.0,
    stackSize: 1,
    baseValue: 700,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 50,
        damageType: 'piercing',
        range: 80,
        attackSpeed: 0.3,
        durabilityLoss: 0.012,
        twoHanded: true,
        minRange: 5,
        category: 'rifle',
        attackType: 'ranged',
        ammo: { ammoType: 'bullet_rifle', ammoPerShot: 1, magazineSize: 5, reloadTime: 60 },
        projectile: { speed: 80, arc: false, penetration: 3 },
        special: ['armor_piercing'],
        critChance: 0.20,
        critMultiplier: 3.0,
      },
    },
  }),

  defineItem('rifle_anti_material', 'Anti-Material Rifle', 'equipment', {
    weight: 12.0,
    stackSize: 1,
    baseValue: 1200,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 100,
        damageType: 'piercing',
        range: 100,
        attackSpeed: 0.2,
        durabilityLoss: 0.02,
        twoHanded: true,
        minRange: 10,
        category: 'rifle',
        attackType: 'ranged',
        ammo: { ammoType: 'bullet_heavy', ammoPerShot: 1, magazineSize: 1, reloadTime: 100 },
        projectile: { speed: 100, arc: false, penetration: 5 },
        special: ['armor_piercing', 'explosive'],
        critChance: 0.15,
        critMultiplier: 2.5,
      },
    },
  }),
];

/**
 * Shotguns
 */
export const SHOTGUN_WEAPONS: ItemDefinition[] = [
  defineItem('shotgun_double', 'Double-Barrel Shotgun', 'equipment', {
    weight: 3.5,
    stackSize: 1,
    baseValue: 280,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 35,
        damageType: 'piercing',
        range: 8,
        attackSpeed: 0.6,
        durabilityLoss: 0.015,
        twoHanded: true,
        category: 'shotgun',
        attackType: 'ranged',
        ammo: { ammoType: 'shell_shotgun', ammoPerShot: 1, magazineSize: 2, reloadTime: 60 },
        projectile: { speed: 25, arc: false, penetration: 1, dropoff: 0.3 },
        special: ['scatter'],
      },
    },
  }),

  defineItem('shotgun_pump', 'Pump Shotgun', 'equipment', {
    weight: 3.8,
    stackSize: 1,
    baseValue: 350,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 30,
        damageType: 'piercing',
        range: 10,
        attackSpeed: 0.8,
        durabilityLoss: 0.012,
        twoHanded: true,
        category: 'shotgun',
        attackType: 'ranged',
        ammo: { ammoType: 'shell_shotgun', ammoPerShot: 1, magazineSize: 8, reloadTime: 80 },
        projectile: { speed: 25, arc: false, penetration: 1, dropoff: 0.25 },
        special: ['scatter'],
      },
    },
  }),

  defineItem('shotgun_semi', 'Semi-Auto Shotgun', 'equipment', {
    weight: 4.0,
    stackSize: 1,
    baseValue: 500,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 28,
        damageType: 'piercing',
        range: 10,
        attackSpeed: 1.2,
        durabilityLoss: 0.015,
        twoHanded: true,
        category: 'shotgun',
        attackType: 'ranged',
        ammo: { ammoType: 'shell_shotgun', ammoPerShot: 1, magazineSize: 6, reloadTime: 70 },
        projectile: { speed: 25, arc: false, penetration: 1, dropoff: 0.25 },
        special: ['scatter'],
      },
    },
  }),

  defineItem('shotgun_auto', 'Automatic Shotgun', 'equipment', {
    weight: 4.5,
    stackSize: 1,
    baseValue: 700,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 25,
        damageType: 'piercing',
        range: 8,
        attackSpeed: 1.8,
        durabilityLoss: 0.02,
        twoHanded: true,
        category: 'shotgun',
        attackType: 'ranged',
        ammo: { ammoType: 'shell_shotgun', ammoPerShot: 1, magazineSize: 10, reloadTime: 80 },
        projectile: { speed: 25, arc: false, penetration: 1, dropoff: 0.3 },
        special: ['scatter'],
      },
    },
  }),

  defineItem('shotgun_sawed', 'Sawed-Off Shotgun', 'equipment', {
    weight: 2.5,
    stackSize: 1,
    baseValue: 200,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 40,
        damageType: 'piercing',
        range: 5,
        attackSpeed: 0.7,
        durabilityLoss: 0.015,
        twoHanded: false,
        category: 'shotgun',
        attackType: 'ranged',
        ammo: { ammoType: 'shell_shotgun', ammoPerShot: 1, magazineSize: 2, reloadTime: 50 },
        projectile: { speed: 20, arc: false, penetration: 1, dropoff: 0.5 },
        special: ['scatter'],
      },
    },
  }),
];

/**
 * Submachine Guns
 */
export const SMG_WEAPONS: ItemDefinition[] = [
  defineItem('smg_compact', 'Compact SMG', 'equipment', {
    weight: 2.0,
    stackSize: 1,
    baseValue: 400,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 8,
        damageType: 'piercing',
        range: 15,
        attackSpeed: 4.0,
        durabilityLoss: 0.02,
        twoHanded: false,
        category: 'smg',
        attackType: 'ranged',
        ammo: { ammoType: 'bullet_pistol', ammoPerShot: 2, magazineSize: 25, reloadTime: 30 },
        projectile: { speed: 35, arc: false, penetration: 1 },
      },
    },
  }),

  defineItem('smg', 'Submachine Gun', 'equipment', {
    weight: 2.5,
    stackSize: 1,
    baseValue: 450,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 10,
        damageType: 'piercing',
        range: 20,
        attackSpeed: 3.0,
        durabilityLoss: 0.02,
        twoHanded: true,
        category: 'smg',
        attackType: 'ranged',
        ammo: { ammoType: 'bullet_pistol', ammoPerShot: 3, magazineSize: 30, reloadTime: 35 },
        projectile: { speed: 35, arc: false, penetration: 1 },
      },
    },
  }),

  defineItem('smg_tactical', 'Tactical SMG', 'equipment', {
    weight: 3.0,
    stackSize: 1,
    baseValue: 550,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 12,
        damageType: 'piercing',
        range: 25,
        attackSpeed: 2.5,
        durabilityLoss: 0.018,
        twoHanded: true,
        category: 'smg',
        attackType: 'ranged',
        ammo: { ammoType: 'bullet_pistol', ammoPerShot: 2, magazineSize: 35, reloadTime: 35 },
        projectile: { speed: 38, arc: false, penetration: 1 },
        special: ['silenced'],
      },
    },
  }),
];

/**
 * Heavy weapons
 */
export const HEAVY_WEAPONS: ItemDefinition[] = [
  defineItem('lmg', 'Light Machine Gun', 'equipment', {
    weight: 8.0,
    stackSize: 1,
    baseValue: 800,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 18,
        damageType: 'piercing',
        range: 40,
        attackSpeed: 3.0,
        durabilityLoss: 0.02,
        twoHanded: true,
        category: 'heavy',
        attackType: 'ranged',
        ammo: { ammoType: 'bullet_rifle', ammoPerShot: 3, magazineSize: 100, reloadTime: 120 },
        projectile: { speed: 45, arc: false, penetration: 1 },
      },
    },
  }),

  defineItem('minigun', 'Minigun', 'equipment', {
    weight: 15.0,
    stackSize: 1,
    baseValue: 1500,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 8,
        damageType: 'piercing',
        range: 35,
        attackSpeed: 10.0,
        durabilityLoss: 0.05,
        twoHanded: true,
        category: 'heavy',
        attackType: 'ranged',
        ammo: { ammoType: 'bullet_heavy', ammoPerShot: 10, magazineSize: 200, reloadTime: 200 },
        projectile: { speed: 50, arc: false, penetration: 1 },
      },
    },
  }),

  defineItem('grenade_launcher', 'Grenade Launcher', 'equipment', {
    weight: 5.0,
    stackSize: 1,
    baseValue: 900,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 60,
        damageType: 'fire',
        range: 30,
        attackSpeed: 0.4,
        durabilityLoss: 0.02,
        twoHanded: true,
        minRange: 5,
        aoeRadius: 3,
        category: 'heavy',
        attackType: 'ranged',
        ammo: { ammoType: 'grenade_40mm', ammoPerShot: 1, magazineSize: 6, reloadTime: 80 },
        projectile: { speed: 15, arc: true, penetration: 1 },
        special: ['explosive'],
      },
    },
  }),

  defineItem('rocket_launcher', 'Rocket Launcher', 'equipment', {
    weight: 8.0,
    stackSize: 1,
    baseValue: 1200,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 150,
        damageType: 'fire',
        range: 50,
        attackSpeed: 0.2,
        durabilityLoss: 0.03,
        twoHanded: true,
        minRange: 10,
        aoeRadius: 5,
        category: 'heavy',
        attackType: 'ranged',
        ammo: { ammoType: 'rocket', ammoPerShot: 1, magazineSize: 1, reloadTime: 150 },
        projectile: { speed: 20, arc: false, penetration: 1 },
        special: ['explosive', 'armor_piercing'],
      },
    },
  }),
];

/**
 * All firearms combined
 */
export const ALL_FIREARMS: ItemDefinition[] = [
  ...BLACKPOWDER_FIREARMS,
  ...PISTOL_WEAPONS,
  ...RIFLE_WEAPONS,
  ...SHOTGUN_WEAPONS,
  ...SMG_WEAPONS,
  ...HEAVY_WEAPONS,
];
