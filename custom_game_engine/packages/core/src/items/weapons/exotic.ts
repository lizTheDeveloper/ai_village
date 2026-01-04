/**
 * Exotic Weapon Item Definitions
 *
 * Includes energy blades (lightsaber-style), force weapons, psionic weapons,
 * soul weapons, radiant weapons, and void weapons.
 * Part of the Weapons Expansion (weapons-expansion spec)
 *
 * NOTE: These are high-tier/transcendent weapons requiring special research or divine favor.
 */

import { defineItem, type ItemDefinition } from '../ItemDefinition.js';

/**
 * Energy blades - lightsaber-style plasma melee weapons
 */
export const ENERGY_BLADE_WEAPONS: ItemDefinition[] = [
  defineItem('energy_blade', 'Energy Blade', 'equipment', {
    weight: 0.5,
    stackSize: 1,
    baseValue: 2000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 40,
        damageType: 'plasma',
        range: 1,
        attackSpeed: 1.5,
        durabilityLoss: 0.001,
        category: 'energy_blade',
        attackType: 'melee',
        powerCost: 0.1,
        special: ['armor_piercing', 'burning'],
        critChance: 0.12,
        critMultiplier: 2.0,
      },
    },
  }),

  defineItem('energy_blade_dual', 'Dual Energy Blade', 'equipment', {
    weight: 1.0,
    stackSize: 1,
    baseValue: 3500,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 35,
        damageType: 'plasma',
        range: 1,
        attackSpeed: 2.0,
        durabilityLoss: 0.001,
        twoHanded: true,
        category: 'energy_blade',
        attackType: 'melee',
        powerCost: 0.2,
        special: ['armor_piercing', 'burning'],
        critChance: 0.15,
        critMultiplier: 2.2,
      },
    },
  }),

  defineItem('energy_blade_great', 'Great Energy Blade', 'equipment', {
    weight: 1.5,
    stackSize: 1,
    baseValue: 4000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 55,
        damageType: 'plasma',
        range: 2,
        attackSpeed: 1.0,
        durabilityLoss: 0.001,
        twoHanded: true,
        category: 'energy_blade',
        attackType: 'melee',
        powerCost: 0.3,
        special: ['armor_piercing', 'burning'],
        critChance: 0.10,
        critMultiplier: 2.5,
      },
    },
  }),

  defineItem('energy_dagger', 'Energy Dagger', 'equipment', {
    weight: 0.2,
    stackSize: 1,
    baseValue: 1500,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 20,
        damageType: 'plasma',
        range: 1,
        attackSpeed: 2.5,
        durabilityLoss: 0.001,
        category: 'energy_blade',
        attackType: 'melee',
        powerCost: 0.05,
        special: ['armor_piercing', 'burning'],
        critChance: 0.20,
        critMultiplier: 3.0,
      },
    },
  }),
];

/**
 * Force weapons - telekinetic/kinetic damage
 */
export const FORCE_WEAPONS: ItemDefinition[] = [
  defineItem('force_hammer', 'Force Hammer', 'equipment', {
    weight: 2.0,
    stackSize: 1,
    baseValue: 1800,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 25,
        damageType: 'force',
        range: 1,
        attackSpeed: 0.8,
        durabilityLoss: 0.005,
        twoHanded: true,
        aoeRadius: 2,
        category: 'force_weapon',
        attackType: 'melee',
        special: ['stunning', 'shield_breaker'],
      },
      magical: {
        magicType: 'telekinesis',
        manaPerUse: 5,
      },
    },
  }),

  defineItem('force_lance', 'Force Lance', 'equipment', {
    weight: 1.5,
    stackSize: 1,
    baseValue: 1500,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 20,
        damageType: 'force',
        range: 3,
        attackSpeed: 1.2,
        durabilityLoss: 0.003,
        category: 'force_weapon',
        attackType: 'melee',
        special: ['armor_piercing'],
      },
      magical: {
        magicType: 'telekinesis',
        manaPerUse: 3,
      },
    },
  }),

  defineItem('force_gauntlets', 'Force Gauntlets', 'equipment', {
    weight: 1.0,
    stackSize: 1,
    baseValue: 1200,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 15,
        damageType: 'force',
        range: 1,
        attackSpeed: 2.0,
        durabilityLoss: 0.004,
        category: 'force_weapon',
        attackType: 'melee',
        special: ['stunning'],
      },
      magical: {
        magicType: 'telekinesis',
        manaPerUse: 2,
      },
    },
  }),

  defineItem('force_blade', 'Force Blade', 'equipment', {
    weight: 0.8,
    stackSize: 1,
    baseValue: 2000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 30,
        damageType: 'force',
        range: 1,
        attackSpeed: 1.4,
        durabilityLoss: 0.002,
        category: 'force_weapon',
        attackType: 'melee',
        special: ['armor_piercing', 'shield_breaker'],
        critChance: 0.12,
        critMultiplier: 2.0,
      },
      magical: {
        magicType: 'telekinesis',
        manaPerUse: 4,
      },
    },
  }),
];

/**
 * Psionic weapons - mental/psychic damage
 */
export const PSIONIC_WEAPONS: ItemDefinition[] = [
  defineItem('psionic_blade', 'Psionic Blade', 'equipment', {
    weight: 0.1,
    stackSize: 1,
    baseValue: 2500,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 25,
        damageType: 'psionic',
        range: 1,
        attackSpeed: 1.8,
        durabilityLoss: 0,
        category: 'psionic_weapon',
        attackType: 'melee',
        special: ['armor_piercing'],
      },
      magical: {
        magicType: 'psychic',
        manaPerUse: 5,
      },
    },
  }),

  defineItem('mind_lash', 'Mind Lash', 'equipment', {
    weight: 0.0,
    stackSize: 1,
    baseValue: 2000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 18,
        damageType: 'psionic',
        range: 3,
        attackSpeed: 1.5,
        durabilityLoss: 0,
        category: 'psionic_weapon',
        attackType: 'melee',
        special: ['stunning'],
      },
      magical: {
        magicType: 'psychic',
        manaPerUse: 4,
      },
    },
  }),

  defineItem('thought_spike', 'Thought Spike', 'equipment', {
    weight: 0.0,
    stackSize: 1,
    baseValue: 3000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 35,
        damageType: 'psionic',
        range: 10,
        attackSpeed: 0.8,
        durabilityLoss: 0,
        category: 'psionic_weapon',
        attackType: 'magic',
        projectile: { speed: 50, arc: false, penetration: 5 },
        special: ['armor_piercing', 'stunning'],
      },
      magical: {
        magicType: 'psychic',
        manaPerUse: 10,
      },
    },
  }),
];

/**
 * Soul weapons - necrotic/death damage, lifesteal
 */
export const SOUL_WEAPONS: ItemDefinition[] = [
  defineItem('soul_reaver', 'Soul Reaver', 'equipment', {
    weight: 2.0,
    stackSize: 1,
    baseValue: 3000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 30,
        damageType: 'necrotic',
        range: 1,
        attackSpeed: 1.0,
        durabilityLoss: 0.002,
        category: 'soul_weapon',
        attackType: 'melee',
        special: ['lifesteal'],
      },
      magical: {
        magicType: 'necromancy',
        manaPerUse: 3,
        cursed: true,
      },
    },
  }),

  defineItem('death_scythe', 'Death Scythe', 'equipment', {
    weight: 4.0,
    stackSize: 1,
    baseValue: 4000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 45,
        damageType: 'necrotic',
        range: 2,
        attackSpeed: 0.7,
        durabilityLoss: 0.003,
        twoHanded: true,
        category: 'soul_weapon',
        attackType: 'melee',
        special: ['lifesteal', 'bleeding'],
        critChance: 0.15,
        critMultiplier: 2.5,
      },
      magical: {
        magicType: 'necromancy',
        manaPerUse: 5,
        cursed: true,
      },
    },
  }),

  defineItem('soul_drinker', 'Soul Drinker Dagger', 'equipment', {
    weight: 0.5,
    stackSize: 1,
    baseValue: 2500,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 18,
        damageType: 'necrotic',
        range: 1,
        attackSpeed: 2.0,
        durabilityLoss: 0.002,
        category: 'soul_weapon',
        attackType: 'melee',
        special: ['lifesteal'],
        critChance: 0.20,
        critMultiplier: 2.5,
      },
      magical: {
        magicType: 'necromancy',
        manaPerUse: 2,
        cursed: true,
      },
    },
  }),

  defineItem('wraith_blade', 'Wraith Blade', 'equipment', {
    weight: 0.3,
    stackSize: 1,
    baseValue: 3500,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 25,
        damageType: 'necrotic',
        range: 1,
        attackSpeed: 1.6,
        durabilityLoss: 0.001,
        category: 'soul_weapon',
        attackType: 'melee',
        special: ['lifesteal', 'armor_piercing'],
      },
      magical: {
        magicType: 'necromancy',
        manaPerUse: 4,
        cursed: true,
      },
    },
  }),
];

/**
 * Radiant weapons - holy/divine damage
 */
export const RADIANT_WEAPONS: ItemDefinition[] = [
  defineItem('blessed_blade', 'Blessed Blade', 'equipment', {
    weight: 2.5,
    stackSize: 1,
    baseValue: 2000,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 20,
        damageType: 'radiant',
        range: 1,
        attackSpeed: 1.2,
        durabilityLoss: 0.005,
        category: 'sword',
        attackType: 'melee',
        special: ['anti_magic'],
      },
      magical: {
        magicType: 'holy',
        manaPerUse: 0,
      },
    },
  }),

  defineItem('holy_avenger', 'Holy Avenger', 'equipment', {
    weight: 4.0,
    stackSize: 1,
    baseValue: 4000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 35,
        damageType: 'radiant',
        range: 1,
        attackSpeed: 1.0,
        durabilityLoss: 0.003,
        twoHanded: true,
        category: 'sword',
        attackType: 'melee',
        special: ['anti_magic', 'burning'],
        critChance: 0.12,
        critMultiplier: 2.2,
      },
      magical: {
        magicType: 'holy',
        manaPerUse: 0,
      },
    },
  }),

  defineItem('dawn_mace', 'Dawn Mace', 'equipment', {
    weight: 3.5,
    stackSize: 1,
    baseValue: 2500,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 18,
        damageType: 'radiant',
        range: 1,
        attackSpeed: 1.0,
        durabilityLoss: 0.005,
        category: 'mace',
        attackType: 'melee',
        special: ['anti_magic', 'stunning'],
      },
      magical: {
        magicType: 'holy',
        manaPerUse: 0,
      },
    },
  }),

  defineItem('celestial_spear', 'Celestial Spear', 'equipment', {
    weight: 3.0,
    stackSize: 1,
    baseValue: 3000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 28,
        damageType: 'radiant',
        range: 2,
        attackSpeed: 1.1,
        durabilityLoss: 0.004,
        category: 'spear',
        attackType: 'melee',
        special: ['anti_magic', 'armor_piercing'],
      },
      magical: {
        magicType: 'holy',
        manaPerUse: 0,
      },
    },
  }),
];

/**
 * Void weapons - entropy/antimatter damage
 */
export const VOID_WEAPONS: ItemDefinition[] = [
  defineItem('void_dagger', 'Void Dagger', 'equipment', {
    weight: 0.3,
    stackSize: 1,
    baseValue: 5000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 35,
        damageType: 'void',
        range: 1,
        attackSpeed: 1.5,
        durabilityLoss: 0.01,
        category: 'dagger',
        attackType: 'melee',
        special: ['armor_piercing'],
        critChance: 0.18,
        critMultiplier: 3.0,
      },
      magical: {
        magicType: 'entropy',
        manaPerUse: 10,
        cursed: true,
      },
    },
  }),

  defineItem('entropy_blade', 'Entropy Blade', 'equipment', {
    weight: 2.0,
    stackSize: 1,
    baseValue: 6000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 45,
        damageType: 'void',
        range: 1,
        attackSpeed: 1.0,
        durabilityLoss: 0.015,
        category: 'sword',
        attackType: 'melee',
        special: ['armor_piercing', 'anti_magic'],
        critChance: 0.12,
        critMultiplier: 2.5,
      },
      magical: {
        magicType: 'entropy',
        manaPerUse: 15,
        cursed: true,
      },
    },
  }),

  defineItem('oblivion_hammer', 'Oblivion Hammer', 'equipment', {
    weight: 6.0,
    stackSize: 1,
    baseValue: 7000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 60,
        damageType: 'void',
        range: 1,
        attackSpeed: 0.5,
        durabilityLoss: 0.02,
        twoHanded: true,
        aoeRadius: 2,
        category: 'hammer',
        attackType: 'melee',
        special: ['armor_piercing', 'anti_magic', 'stunning'],
      },
      magical: {
        magicType: 'entropy',
        manaPerUse: 20,
        cursed: true,
      },
    },
  }),

  defineItem('null_lance', 'Null Lance', 'equipment', {
    weight: 3.0,
    stackSize: 1,
    baseValue: 5500,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 40,
        damageType: 'void',
        range: 3,
        attackSpeed: 0.9,
        durabilityLoss: 0.012,
        twoHanded: true,
        category: 'polearm',
        attackType: 'melee',
        special: ['armor_piercing'],
      },
      magical: {
        magicType: 'entropy',
        manaPerUse: 12,
        cursed: true,
      },
    },
  }),
];

/**
 * All exotic weapons combined
 */
export const ALL_EXOTIC_WEAPONS: ItemDefinition[] = [
  ...ENERGY_BLADE_WEAPONS,
  ...FORCE_WEAPONS,
  ...PSIONIC_WEAPONS,
  ...SOUL_WEAPONS,
  ...RADIANT_WEAPONS,
  ...VOID_WEAPONS,
];
