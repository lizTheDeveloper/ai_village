/**
 * Melee Weapon Item Definitions
 *
 * Includes primitive, medieval, and exotic melee weapons.
 * Part of the Weapons Expansion (weapons-expansion spec)
 */

import { defineItem, type ItemDefinition } from '../ItemDefinition.js';

/**
 * Primitive melee weapons (early game, no metalworking required)
 */
export const PRIMITIVE_MELEE: ItemDefinition[] = [
  defineItem('club_wood', 'Wooden Club', 'equipment', {
    weight: 2.0,
    stackSize: 1,
    baseMaterial: 'wood',
    baseValue: 5,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 4,
        damageType: 'bludgeoning',
        range: 1,
        attackSpeed: 1.3,
        durabilityLoss: 0.02,
        category: 'mace',
        attackType: 'melee',
      },
    },
  }),

  defineItem('stone_axe_weapon', 'Stone Handaxe', 'equipment', {
    weight: 2.5,
    stackSize: 1,
    baseMaterial: 'stone',
    baseValue: 8,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 6,
        damageType: 'slashing',
        range: 1,
        attackSpeed: 1.0,
        durabilityLoss: 0.03,
        category: 'axe',
        attackType: 'melee',
      },
    },
  }),

  defineItem('flint_spear', 'Flint Spear', 'equipment', {
    weight: 1.8,
    stackSize: 1,
    baseMaterial: 'flint',
    baseValue: 10,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 5,
        damageType: 'piercing',
        range: 2,
        attackSpeed: 1.1,
        durabilityLoss: 0.02,
        category: 'spear',
        attackType: 'melee',
      },
    },
  }),

  defineItem('bone_knife', 'Bone Knife', 'equipment', {
    weight: 0.5,
    stackSize: 1,
    baseMaterial: 'bone',
    baseValue: 6,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 3,
        damageType: 'piercing',
        range: 1,
        attackSpeed: 1.8,
        durabilityLoss: 0.025,
        category: 'dagger',
        attackType: 'melee',
        critChance: 0.1,
        critMultiplier: 2.0,
      },
    },
  }),
];

/**
 * Medieval melee weapons (requires metalworking)
 */
export const MEDIEVAL_MELEE: ItemDefinition[] = [
  // ===== SWORDS =====
  defineItem('iron_sword', 'Iron Sword', 'equipment', {
    weight: 3.0,
    stackSize: 1,
    baseMaterial: 'iron',
    baseValue: 50,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 10,
        damageType: 'slashing',
        range: 1,
        attackSpeed: 1.2,
        durabilityLoss: 0.01,
        category: 'sword',
        attackType: 'melee',
        critChance: 0.05,
        critMultiplier: 1.5,
      },
    },
  }),

  defineItem('steel_sword', 'Steel Sword', 'equipment', {
    weight: 3.0,
    stackSize: 1,
    baseMaterial: 'steel',
    baseValue: 100,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 14,
        damageType: 'slashing',
        range: 1,
        attackSpeed: 1.3,
        durabilityLoss: 0.008,
        category: 'sword',
        attackType: 'melee',
        critChance: 0.08,
        critMultiplier: 1.8,
      },
    },
  }),

  defineItem('greatsword_iron', 'Iron Greatsword', 'equipment', {
    weight: 5.0,
    stackSize: 1,
    baseMaterial: 'iron',
    baseValue: 80,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 18,
        damageType: 'slashing',
        range: 1,
        attackSpeed: 0.7,
        durabilityLoss: 0.015,
        twoHanded: true,
        category: 'sword',
        attackType: 'melee',
        critChance: 0.10,
        critMultiplier: 2.0,
      },
    },
  }),

  defineItem('greatsword_steel', 'Steel Greatsword', 'equipment', {
    weight: 5.0,
    stackSize: 1,
    baseMaterial: 'steel',
    baseValue: 150,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 24,
        damageType: 'slashing',
        range: 1,
        attackSpeed: 0.75,
        durabilityLoss: 0.012,
        twoHanded: true,
        category: 'sword',
        attackType: 'melee',
        critChance: 0.12,
        critMultiplier: 2.2,
      },
    },
  }),

  defineItem('rapier', 'Rapier', 'equipment', {
    weight: 1.5,
    stackSize: 1,
    baseMaterial: 'steel',
    baseValue: 120,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 8,
        damageType: 'piercing',
        range: 1,
        attackSpeed: 1.6,
        durabilityLoss: 0.01,
        category: 'sword',
        attackType: 'melee',
        critChance: 0.15,
        critMultiplier: 2.0,
      },
    },
  }),

  defineItem('scimitar', 'Scimitar', 'equipment', {
    weight: 2.5,
    stackSize: 1,
    baseMaterial: 'steel',
    baseValue: 110,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 12,
        damageType: 'slashing',
        range: 1,
        attackSpeed: 1.4,
        durabilityLoss: 0.01,
        category: 'sword',
        attackType: 'melee',
        critChance: 0.10,
        critMultiplier: 1.8,
        special: ['bleeding'],
      },
    },
  }),

  // ===== SPEARS & POLEARMS =====
  defineItem('iron_spear', 'Iron Spear', 'equipment', {
    weight: 2.5,
    stackSize: 1,
    baseMaterial: 'iron',
    baseValue: 40,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 8,
        damageType: 'piercing',
        range: 2,
        attackSpeed: 1.1,
        durabilityLoss: 0.01,
        category: 'spear',
        attackType: 'melee',
      },
    },
  }),

  defineItem('pike', 'Pike', 'equipment', {
    weight: 4.0,
    stackSize: 1,
    baseMaterial: 'iron',
    baseValue: 60,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 12,
        damageType: 'piercing',
        range: 3,
        attackSpeed: 0.8,
        durabilityLoss: 0.012,
        twoHanded: true,
        category: 'polearm',
        attackType: 'melee',
      },
    },
  }),

  defineItem('halberd', 'Halberd', 'equipment', {
    weight: 5.0,
    stackSize: 1,
    baseMaterial: 'steel',
    baseValue: 120,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 16,
        damageType: 'slashing',
        range: 2,
        attackSpeed: 0.7,
        durabilityLoss: 0.015,
        twoHanded: true,
        category: 'polearm',
        attackType: 'melee',
        special: ['armor_piercing'],
      },
    },
  }),

  defineItem('glaive', 'Glaive', 'equipment', {
    weight: 4.5,
    stackSize: 1,
    baseMaterial: 'steel',
    baseValue: 100,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 14,
        damageType: 'slashing',
        range: 2,
        attackSpeed: 0.8,
        durabilityLoss: 0.012,
        twoHanded: true,
        category: 'polearm',
        attackType: 'melee',
        special: ['bleeding'],
      },
    },
  }),

  // ===== AXES =====
  defineItem('battleaxe_iron', 'Iron Battleaxe', 'equipment', {
    weight: 4.0,
    stackSize: 1,
    baseMaterial: 'iron',
    baseValue: 70,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 14,
        damageType: 'slashing',
        range: 1,
        attackSpeed: 0.9,
        durabilityLoss: 0.012,
        category: 'axe',
        attackType: 'melee',
        critChance: 0.12,
        critMultiplier: 2.0,
      },
    },
  }),

  defineItem('battleaxe_steel', 'Steel Battleaxe', 'equipment', {
    weight: 4.0,
    stackSize: 1,
    baseMaterial: 'steel',
    baseValue: 130,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 18,
        damageType: 'slashing',
        range: 1,
        attackSpeed: 0.95,
        durabilityLoss: 0.01,
        category: 'axe',
        attackType: 'melee',
        critChance: 0.14,
        critMultiplier: 2.2,
      },
    },
  }),

  defineItem('greataxe', 'Greataxe', 'equipment', {
    weight: 6.0,
    stackSize: 1,
    baseMaterial: 'steel',
    baseValue: 160,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 22,
        damageType: 'slashing',
        range: 1,
        attackSpeed: 0.6,
        durabilityLoss: 0.015,
        twoHanded: true,
        category: 'axe',
        attackType: 'melee',
        critChance: 0.15,
        critMultiplier: 2.5,
        special: ['armor_piercing'],
      },
    },
  }),

  // ===== HAMMERS & MACES =====
  defineItem('mace_iron', 'Iron Mace', 'equipment', {
    weight: 3.5,
    stackSize: 1,
    baseMaterial: 'iron',
    baseValue: 55,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 10,
        damageType: 'bludgeoning',
        range: 1,
        attackSpeed: 1.0,
        durabilityLoss: 0.008,
        category: 'mace',
        attackType: 'melee',
        special: ['stunning'],
      },
    },
  }),

  defineItem('morningstar', 'Morningstar', 'equipment', {
    weight: 4.0,
    stackSize: 1,
    baseMaterial: 'steel',
    baseValue: 90,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 14,
        damageType: 'bludgeoning',
        range: 1,
        attackSpeed: 0.9,
        durabilityLoss: 0.01,
        category: 'mace',
        attackType: 'melee',
        critChance: 0.08,
        critMultiplier: 1.8,
        special: ['armor_piercing'],
      },
    },
  }),

  defineItem('warhammer_iron', 'Iron Warhammer', 'equipment', {
    weight: 5.0,
    stackSize: 1,
    baseMaterial: 'iron',
    baseValue: 80,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 16,
        damageType: 'bludgeoning',
        range: 1,
        attackSpeed: 0.6,
        durabilityLoss: 0.008,
        twoHanded: true,
        category: 'hammer',
        attackType: 'melee',
        special: ['armor_piercing', 'stunning'],
      },
    },
  }),

  defineItem('maul', 'Steel Maul', 'equipment', {
    weight: 7.0,
    stackSize: 1,
    baseMaterial: 'steel',
    baseValue: 140,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 24,
        damageType: 'bludgeoning',
        range: 1,
        attackSpeed: 0.5,
        durabilityLoss: 0.006,
        twoHanded: true,
        category: 'hammer',
        attackType: 'melee',
        critChance: 0.10,
        critMultiplier: 2.5,
        special: ['armor_piercing', 'stunning'],
      },
    },
  }),

  // ===== DAGGERS =====
  defineItem('iron_dagger', 'Iron Dagger', 'equipment', {
    weight: 0.8,
    stackSize: 1,
    baseMaterial: 'iron',
    baseValue: 25,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 5,
        damageType: 'piercing',
        range: 1,
        attackSpeed: 2.0,
        durabilityLoss: 0.01,
        category: 'dagger',
        attackType: 'melee',
        critChance: 0.15,
        critMultiplier: 2.5,
      },
    },
  }),

  defineItem('steel_dagger', 'Steel Dagger', 'equipment', {
    weight: 0.8,
    stackSize: 1,
    baseMaterial: 'steel',
    baseValue: 50,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 7,
        damageType: 'piercing',
        range: 1,
        attackSpeed: 2.2,
        durabilityLoss: 0.008,
        category: 'dagger',
        attackType: 'melee',
        critChance: 0.18,
        critMultiplier: 2.8,
      },
    },
  }),

  defineItem('stiletto', 'Stiletto', 'equipment', {
    weight: 0.5,
    stackSize: 1,
    baseMaterial: 'steel',
    baseValue: 70,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 4,
        damageType: 'piercing',
        range: 1,
        attackSpeed: 2.5,
        durabilityLoss: 0.01,
        category: 'dagger',
        attackType: 'melee',
        critChance: 0.25,
        critMultiplier: 3.0,
        special: ['armor_piercing'],
      },
    },
  }),

  // ===== FIST WEAPONS =====
  defineItem('brass_knuckles', 'Brass Knuckles', 'equipment', {
    weight: 0.5,
    stackSize: 1,
    baseMaterial: 'brass',
    baseValue: 30,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 6,
        damageType: 'bludgeoning',
        range: 1,
        attackSpeed: 2.0,
        durabilityLoss: 0.005,
        category: 'fist',
        attackType: 'melee',
        special: ['stunning'],
      },
    },
  }),

  defineItem('cestus', 'Cestus', 'equipment', {
    weight: 0.8,
    stackSize: 1,
    baseMaterial: 'leather',
    baseValue: 40,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 4,
        damageType: 'bludgeoning',
        range: 1,
        attackSpeed: 2.5,
        durabilityLoss: 0.008,
        category: 'fist',
        attackType: 'melee',
        critChance: 0.12,
        critMultiplier: 2.0,
      },
    },
  }),

  defineItem('spiked_gauntlet', 'Spiked Gauntlet', 'equipment', {
    weight: 1.5,
    stackSize: 1,
    baseMaterial: 'steel',
    baseValue: 80,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 8,
        damageType: 'piercing',
        range: 1,
        attackSpeed: 1.8,
        durabilityLoss: 0.01,
        category: 'fist',
        attackType: 'melee',
        critChance: 0.15,
        critMultiplier: 2.2,
        special: ['bleeding'],
      },
    },
  }),

  // ===== WHIPS & CHAINS =====
  defineItem('leather_whip', 'Leather Whip', 'equipment', {
    weight: 1.0,
    stackSize: 1,
    baseMaterial: 'leather',
    baseValue: 35,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 4,
        damageType: 'slashing',
        range: 2,
        attackSpeed: 1.2,
        durabilityLoss: 0.02,
        category: 'whip',
        attackType: 'melee',
        special: ['bleeding'],
      },
    },
  }),

  defineItem('chain_whip', 'Chain Whip', 'equipment', {
    weight: 2.0,
    stackSize: 1,
    baseMaterial: 'iron',
    baseValue: 70,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 8,
        damageType: 'bludgeoning',
        range: 2,
        attackSpeed: 1.0,
        durabilityLoss: 0.01,
        category: 'chain',
        attackType: 'melee',
        special: ['stunning'],
      },
    },
  }),

  defineItem('flail', 'Flail', 'equipment', {
    weight: 3.5,
    stackSize: 1,
    baseMaterial: 'steel',
    baseValue: 100,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 12,
        damageType: 'bludgeoning',
        range: 1,
        attackSpeed: 0.8,
        durabilityLoss: 0.012,
        category: 'chain',
        attackType: 'melee',
        critChance: 0.10,
        critMultiplier: 2.0,
        special: ['shield_breaker'],
      },
    },
  }),
];

/**
 * All melee weapons combined
 */
export const ALL_MELEE_WEAPONS: ItemDefinition[] = [
  ...PRIMITIVE_MELEE,
  ...MEDIEVAL_MELEE,
];
