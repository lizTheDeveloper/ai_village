/**
 * Traditional Ranged Weapon Item Definitions
 *
 * Includes bows, crossbows, slings, and throwing weapons.
 * Part of the Weapons Expansion (weapons-expansion spec)
 */

import { defineItem, type ItemDefinition } from '../ItemDefinition.js';

/**
 * Bows
 */
export const BOW_WEAPONS: ItemDefinition[] = [
  defineItem('shortbow_wood', 'Wooden Shortbow', 'equipment', {
    weight: 1.0,
    stackSize: 1,
    baseMaterial: 'wood',
    baseValue: 30,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 6,
        damageType: 'piercing',
        range: 15,
        attackSpeed: 1.2,
        durabilityLoss: 0.005,
        twoHanded: true,
        category: 'bow',
        attackType: 'ranged',
        ammo: { ammoType: 'arrow', ammoPerShot: 1 },
        projectile: { speed: 8, arc: true, penetration: 1 },
      },
    },
  }),

  defineItem('hunting_bow', 'Hunting Bow', 'equipment', {
    weight: 1.2,
    stackSize: 1,
    baseMaterial: 'wood',
    baseValue: 50,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 8,
        damageType: 'piercing',
        range: 18,
        attackSpeed: 1.0,
        durabilityLoss: 0.005,
        twoHanded: true,
        category: 'bow',
        attackType: 'ranged',
        ammo: { ammoType: 'arrow', ammoPerShot: 1 },
        projectile: { speed: 10, arc: true, penetration: 1 },
      },
    },
  }),

  defineItem('longbow_yew', 'Yew Longbow', 'equipment', {
    weight: 1.5,
    stackSize: 1,
    baseMaterial: 'yew',
    baseValue: 100,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 10,
        damageType: 'piercing',
        range: 25,
        attackSpeed: 0.9,
        durabilityLoss: 0.005,
        twoHanded: true,
        category: 'bow',
        attackType: 'ranged',
        ammo: { ammoType: 'arrow', ammoPerShot: 1 },
        projectile: { speed: 12, arc: true, penetration: 1, dropoff: 0.1 },
      },
    },
  }),

  defineItem('composite_bow', 'Composite Bow', 'equipment', {
    weight: 1.2,
    stackSize: 1,
    baseValue: 150,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 12,
        damageType: 'piercing',
        range: 20,
        attackSpeed: 1.1,
        durabilityLoss: 0.006,
        twoHanded: true,
        category: 'bow',
        attackType: 'ranged',
        ammo: { ammoType: 'arrow', ammoPerShot: 1 },
        projectile: { speed: 10, arc: true, penetration: 1 },
        special: ['armor_piercing'],
      },
    },
  }),

  defineItem('recurve_bow', 'Recurve Bow', 'equipment', {
    weight: 1.3,
    stackSize: 1,
    baseValue: 180,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 14,
        damageType: 'piercing',
        range: 22,
        attackSpeed: 1.0,
        durabilityLoss: 0.005,
        twoHanded: true,
        category: 'bow',
        attackType: 'ranged',
        ammo: { ammoType: 'arrow', ammoPerShot: 1 },
        projectile: { speed: 14, arc: true, penetration: 1 },
        critChance: 0.08,
        critMultiplier: 1.8,
      },
    },
  }),

  defineItem('warbow', 'War Bow', 'equipment', {
    weight: 2.0,
    stackSize: 1,
    baseMaterial: 'yew',
    baseValue: 200,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 16,
        damageType: 'piercing',
        range: 30,
        attackSpeed: 0.8,
        durabilityLoss: 0.006,
        twoHanded: true,
        category: 'bow',
        attackType: 'ranged',
        ammo: { ammoType: 'arrow', ammoPerShot: 1 },
        projectile: { speed: 15, arc: true, penetration: 2, dropoff: 0.05 },
        special: ['armor_piercing'],
      },
    },
  }),
];

/**
 * Crossbows
 */
export const CROSSBOW_WEAPONS: ItemDefinition[] = [
  defineItem('crossbow_light', 'Light Crossbow', 'equipment', {
    weight: 2.5,
    stackSize: 1,
    baseMaterial: 'wood',
    baseValue: 80,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 12,
        damageType: 'piercing',
        range: 20,
        attackSpeed: 0.5,
        durabilityLoss: 0.008,
        twoHanded: true,
        category: 'crossbow',
        attackType: 'ranged',
        ammo: { ammoType: 'bolt', ammoPerShot: 1, reloadTime: 40 },
        projectile: { speed: 15, arc: false, penetration: 1 },
        special: ['armor_piercing'],
      },
    },
  }),

  defineItem('crossbow_hunting', 'Hunting Crossbow', 'equipment', {
    weight: 3.0,
    stackSize: 1,
    baseMaterial: 'wood',
    baseValue: 120,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 15,
        damageType: 'piercing',
        range: 25,
        attackSpeed: 0.4,
        durabilityLoss: 0.008,
        twoHanded: true,
        category: 'crossbow',
        attackType: 'ranged',
        ammo: { ammoType: 'bolt', ammoPerShot: 1, reloadTime: 50 },
        projectile: { speed: 18, arc: false, penetration: 1 },
        special: ['armor_piercing'],
      },
    },
  }),

  defineItem('crossbow_heavy', 'Heavy Crossbow', 'equipment', {
    weight: 5.0,
    stackSize: 1,
    baseMaterial: 'steel',
    baseValue: 200,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 20,
        damageType: 'piercing',
        range: 30,
        attackSpeed: 0.3,
        durabilityLoss: 0.010,
        twoHanded: true,
        category: 'crossbow',
        attackType: 'ranged',
        ammo: { ammoType: 'bolt', ammoPerShot: 1, reloadTime: 80 },
        projectile: { speed: 20, arc: false, penetration: 2 },
        special: ['armor_piercing'],
      },
    },
  }),

  defineItem('repeating_crossbow', 'Repeating Crossbow', 'equipment', {
    weight: 4.0,
    stackSize: 1,
    baseValue: 300,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 8,
        damageType: 'piercing',
        range: 15,
        attackSpeed: 1.0,
        durabilityLoss: 0.012,
        twoHanded: true,
        category: 'crossbow',
        attackType: 'ranged',
        ammo: { ammoType: 'bolt', ammoPerShot: 1, magazineSize: 5, reloadTime: 60 },
        projectile: { speed: 15, arc: false, penetration: 1 },
      },
    },
  }),

  defineItem('hand_crossbow', 'Hand Crossbow', 'equipment', {
    weight: 1.5,
    stackSize: 1,
    baseMaterial: 'wood',
    baseValue: 100,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 8,
        damageType: 'piercing',
        range: 12,
        attackSpeed: 0.6,
        durabilityLoss: 0.010,
        twoHanded: false,
        category: 'crossbow',
        attackType: 'ranged',
        ammo: { ammoType: 'bolt', ammoPerShot: 1, reloadTime: 30 },
        projectile: { speed: 12, arc: false, penetration: 1 },
      },
    },
  }),
];

/**
 * Slings
 */
export const SLING_WEAPONS: ItemDefinition[] = [
  defineItem('sling_leather', 'Leather Sling', 'equipment', {
    weight: 0.2,
    stackSize: 1,
    baseMaterial: 'leather',
    baseValue: 10,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 5,
        damageType: 'bludgeoning',
        range: 15,
        attackSpeed: 1.0,
        durabilityLoss: 0.002,
        category: 'sling',
        attackType: 'ranged',
        ammo: { ammoType: 'sling_stone', ammoPerShot: 1 },
        projectile: { speed: 12, arc: true, penetration: 1 },
      },
    },
  }),

  defineItem('staff_sling', 'Staff Sling', 'equipment', {
    weight: 1.0,
    stackSize: 1,
    baseMaterial: 'wood',
    baseValue: 25,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 8,
        damageType: 'bludgeoning',
        range: 20,
        attackSpeed: 0.8,
        durabilityLoss: 0.003,
        twoHanded: true,
        category: 'sling',
        attackType: 'ranged',
        ammo: { ammoType: 'sling_stone', ammoPerShot: 1 },
        projectile: { speed: 15, arc: true, penetration: 1 },
        special: ['stunning'],
      },
    },
  }),
];

/**
 * Throwing weapons
 */
export const THROWING_WEAPONS: ItemDefinition[] = [
  defineItem('throwing_knife', 'Throwing Knife', 'equipment', {
    weight: 0.3,
    stackSize: 10,
    baseMaterial: 'steel',
    baseValue: 15,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 4,
        damageType: 'piercing',
        range: 8,
        attackSpeed: 2.0,
        durabilityLoss: 0.05,
        category: 'throwing',
        attackType: 'ranged',
        projectile: { speed: 10, arc: false, penetration: 1 },
        critChance: 0.15,
        critMultiplier: 2.0,
      },
    },
  }),

  defineItem('throwing_axe', 'Throwing Axe', 'equipment', {
    weight: 0.8,
    stackSize: 5,
    baseMaterial: 'iron',
    baseValue: 25,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 8,
        damageType: 'slashing',
        range: 10,
        attackSpeed: 1.2,
        durabilityLoss: 0.08,
        category: 'throwing',
        attackType: 'ranged',
        projectile: { speed: 8, arc: true, penetration: 1 },
        critChance: 0.10,
        critMultiplier: 1.8,
      },
    },
  }),

  defineItem('javelin', 'Javelin', 'equipment', {
    weight: 1.0,
    stackSize: 5,
    baseMaterial: 'wood',
    baseValue: 20,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 10,
        damageType: 'piercing',
        range: 12,
        attackSpeed: 0.8,
        durabilityLoss: 0.10,
        category: 'throwing',
        attackType: 'ranged',
        projectile: { speed: 8, arc: true, penetration: 1 },
      },
    },
  }),

  defineItem('javelin_iron', 'Iron Javelin', 'equipment', {
    weight: 1.2,
    stackSize: 5,
    baseMaterial: 'iron',
    baseValue: 40,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 14,
        damageType: 'piercing',
        range: 15,
        attackSpeed: 0.7,
        durabilityLoss: 0.08,
        category: 'throwing',
        attackType: 'ranged',
        projectile: { speed: 10, arc: true, penetration: 1 },
        special: ['armor_piercing'],
      },
    },
  }),

  defineItem('shuriken', 'Shuriken', 'equipment', {
    weight: 0.1,
    stackSize: 20,
    baseMaterial: 'steel',
    baseValue: 10,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 3,
        damageType: 'slashing',
        range: 8,
        attackSpeed: 3.0,
        durabilityLoss: 0.03,
        category: 'throwing',
        attackType: 'ranged',
        projectile: { speed: 12, arc: false, penetration: 1 },
        special: ['bleeding'],
      },
    },
  }),

  defineItem('bolas', 'Bolas', 'equipment', {
    weight: 0.5,
    stackSize: 5,
    baseMaterial: 'leather',
    baseValue: 30,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 2,
        damageType: 'bludgeoning',
        range: 10,
        attackSpeed: 1.0,
        durabilityLoss: 0.10,
        category: 'throwing',
        attackType: 'ranged',
        projectile: { speed: 8, arc: true, penetration: 1 },
        special: ['stunning'],
      },
    },
  }),

  defineItem('chakram', 'Chakram', 'equipment', {
    weight: 0.4,
    stackSize: 3,
    baseMaterial: 'steel',
    baseValue: 80,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 10,
        damageType: 'slashing',
        range: 12,
        attackSpeed: 1.5,
        durabilityLoss: 0.04,
        category: 'throwing',
        attackType: 'ranged',
        projectile: { speed: 15, arc: false, penetration: 2 },
        critChance: 0.12,
        critMultiplier: 2.0,
        special: ['bleeding'],
      },
    },
  }),
];

/**
 * All traditional ranged weapons combined
 */
export const ALL_TRADITIONAL_RANGED: ItemDefinition[] = [
  ...BOW_WEAPONS,
  ...CROSSBOW_WEAPONS,
  ...SLING_WEAPONS,
  ...THROWING_WEAPONS,
];
