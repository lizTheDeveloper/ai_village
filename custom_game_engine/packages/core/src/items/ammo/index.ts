/**
 * Ammunition Item Definitions
 *
 * All ammo types for ranged weapons: arrows, bolts, bullets, shells, energy cells, plasma.
 * Part of the Weapons Expansion (weapons-expansion spec)
 */

import { defineItem, type ItemDefinition } from '../ItemDefinition.js';

/**
 * Arrow ammunition for bows
 */
export const ARROW_AMMO: ItemDefinition[] = [
  defineItem('arrow_wood', 'Wooden Arrow', 'ammo', {
    weight: 0.05,
    stackSize: 50,
    baseMaterial: 'wood',
    baseValue: 2,
    rarity: 'common',
    traits: {
      ammo: {
        ammoType: 'arrow',
        damageModifier: 1.0,
      },
    },
  }),

  defineItem('arrow_iron', 'Iron Arrow', 'ammo', {
    weight: 0.08,
    stackSize: 50,
    baseMaterial: 'iron',
    baseValue: 5,
    rarity: 'common',
    traits: {
      ammo: {
        ammoType: 'arrow',
        damageModifier: 1.3,
      },
    },
  }),

  defineItem('arrow_steel', 'Steel Arrow', 'ammo', {
    weight: 0.08,
    stackSize: 50,
    baseMaterial: 'steel',
    baseValue: 10,
    rarity: 'uncommon',
    traits: {
      ammo: {
        ammoType: 'arrow',
        damageModifier: 1.5,
      },
    },
  }),

  defineItem('arrow_fire', 'Fire Arrow', 'ammo', {
    weight: 0.10,
    stackSize: 30,
    baseValue: 15,
    rarity: 'uncommon',
    traits: {
      ammo: {
        ammoType: 'arrow',
        damageModifier: 1.2,
        specialEffect: 'burning',
      },
    },
  }),

  defineItem('arrow_explosive', 'Explosive Arrow', 'ammo', {
    weight: 0.15,
    stackSize: 20,
    baseValue: 50,
    rarity: 'rare',
    traits: {
      ammo: {
        ammoType: 'arrow',
        damageModifier: 2.0,
        specialEffect: 'explosive',
      },
    },
  }),

  defineItem('arrow_poison', 'Poison Arrow', 'ammo', {
    weight: 0.08,
    stackSize: 30,
    baseValue: 20,
    rarity: 'uncommon',
    traits: {
      ammo: {
        ammoType: 'arrow',
        damageModifier: 1.1,
        specialEffect: 'poison',
      },
    },
  }),
];

/**
 * Bolt ammunition for crossbows
 */
export const BOLT_AMMO: ItemDefinition[] = [
  defineItem('bolt_iron', 'Iron Bolt', 'ammo', {
    weight: 0.10,
    stackSize: 40,
    baseMaterial: 'iron',
    baseValue: 8,
    rarity: 'common',
    traits: {
      ammo: {
        ammoType: 'bolt',
        damageModifier: 1.0,
      },
    },
  }),

  defineItem('bolt_steel', 'Steel Bolt', 'ammo', {
    weight: 0.10,
    stackSize: 40,
    baseMaterial: 'steel',
    baseValue: 15,
    rarity: 'uncommon',
    traits: {
      ammo: {
        ammoType: 'bolt',
        damageModifier: 1.4,
      },
    },
  }),

  defineItem('bolt_armor_piercing', 'Armor-Piercing Bolt', 'ammo', {
    weight: 0.12,
    stackSize: 30,
    baseMaterial: 'steel',
    baseValue: 30,
    rarity: 'rare',
    traits: {
      ammo: {
        ammoType: 'bolt',
        damageModifier: 1.3,
        specialEffect: 'armor_piercing',
      },
    },
  }),
];

/**
 * Sling ammunition
 */
export const SLING_AMMO: ItemDefinition[] = [
  defineItem('sling_stone', 'Sling Stone', 'ammo', {
    weight: 0.1,
    stackSize: 100,
    baseMaterial: 'stone',
    baseValue: 1,
    rarity: 'common',
    traits: {
      ammo: {
        ammoType: 'sling_stone',
        damageModifier: 1.0,
      },
    },
  }),

  defineItem('sling_bullet_lead', 'Lead Sling Bullet', 'ammo', {
    weight: 0.08,
    stackSize: 80,
    baseMaterial: 'lead',
    baseValue: 3,
    rarity: 'common',
    traits: {
      ammo: {
        ammoType: 'sling_stone',
        damageModifier: 1.5,
      },
    },
  }),
];

/**
 * Firearm ammunition - pistol caliber
 */
export const PISTOL_AMMO: ItemDefinition[] = [
  defineItem('bullet_musket', 'Musket Ball', 'ammo', {
    weight: 0.02,
    stackSize: 50,
    baseMaterial: 'lead',
    baseValue: 5,
    rarity: 'common',
    traits: {
      ammo: {
        ammoType: 'bullet_musket',
        damageModifier: 1.0,
      },
    },
  }),

  defineItem('bullet_9mm', '9mm Rounds', 'ammo', {
    weight: 0.01,
    stackSize: 100,
    baseMaterial: 'brass',
    baseValue: 3,
    rarity: 'common',
    traits: {
      ammo: {
        ammoType: 'bullet_pistol',
        damageModifier: 1.0,
      },
    },
  }),

  defineItem('bullet_45acp', '.45 ACP Rounds', 'ammo', {
    weight: 0.015,
    stackSize: 80,
    baseMaterial: 'brass',
    baseValue: 5,
    rarity: 'common',
    traits: {
      ammo: {
        ammoType: 'bullet_pistol',
        damageModifier: 1.3,
      },
    },
  }),

  defineItem('bullet_357', '.357 Magnum Rounds', 'ammo', {
    weight: 0.02,
    stackSize: 60,
    baseMaterial: 'brass',
    baseValue: 8,
    rarity: 'uncommon',
    traits: {
      ammo: {
        ammoType: 'bullet_pistol',
        damageModifier: 1.5,
      },
    },
  }),
];

/**
 * Firearm ammunition - rifle caliber
 */
export const RIFLE_AMMO: ItemDefinition[] = [
  defineItem('bullet_556', '5.56mm Rounds', 'ammo', {
    weight: 0.012,
    stackSize: 90,
    baseMaterial: 'brass',
    baseValue: 4,
    rarity: 'common',
    traits: {
      ammo: {
        ammoType: 'bullet_rifle',
        damageModifier: 1.0,
      },
    },
  }),

  defineItem('bullet_762', '7.62mm Rounds', 'ammo', {
    weight: 0.02,
    stackSize: 60,
    baseMaterial: 'brass',
    baseValue: 6,
    rarity: 'common',
    traits: {
      ammo: {
        ammoType: 'bullet_rifle',
        damageModifier: 1.3,
      },
    },
  }),

  defineItem('bullet_50cal', '.50 Cal Rounds', 'ammo', {
    weight: 0.1,
    stackSize: 30,
    baseMaterial: 'brass',
    baseValue: 20,
    rarity: 'uncommon',
    traits: {
      ammo: {
        ammoType: 'bullet_heavy',
        damageModifier: 2.0,
      },
    },
  }),

  defineItem('bullet_ap', 'Armor-Piercing Rounds', 'ammo', {
    weight: 0.025,
    stackSize: 40,
    baseMaterial: 'tungsten',
    baseValue: 15,
    rarity: 'rare',
    traits: {
      ammo: {
        ammoType: 'bullet_rifle',
        damageModifier: 1.2,
        specialEffect: 'armor_piercing',
      },
    },
  }),

  defineItem('bullet_tracer', 'Tracer Rounds', 'ammo', {
    weight: 0.015,
    stackSize: 50,
    baseMaterial: 'brass',
    baseValue: 8,
    rarity: 'uncommon',
    traits: {
      ammo: {
        ammoType: 'bullet_rifle',
        damageModifier: 0.9,
        specialEffect: 'burning',
      },
    },
  }),
];

/**
 * Shotgun shells
 */
export const SHOTGUN_AMMO: ItemDefinition[] = [
  defineItem('shell_buckshot', 'Buckshot Shells', 'ammo', {
    weight: 0.03,
    stackSize: 40,
    baseMaterial: 'lead',
    baseValue: 8,
    rarity: 'common',
    traits: {
      ammo: {
        ammoType: 'shell_shotgun',
        damageModifier: 1.0,
      },
    },
  }),

  defineItem('shell_slug', 'Slug Shells', 'ammo', {
    weight: 0.04,
    stackSize: 30,
    baseMaterial: 'lead',
    baseValue: 12,
    rarity: 'uncommon',
    traits: {
      ammo: {
        ammoType: 'shell_shotgun',
        damageModifier: 1.5,
        specialEffect: 'armor_piercing',
      },
    },
  }),

  defineItem('shell_dragon', 'Dragon\'s Breath Shells', 'ammo', {
    weight: 0.04,
    stackSize: 20,
    baseValue: 25,
    rarity: 'rare',
    traits: {
      ammo: {
        ammoType: 'shell_shotgun',
        damageModifier: 1.2,
        specialEffect: 'burning',
      },
    },
  }),
];

/**
 * Energy weapon power cells
 */
export const ENERGY_AMMO: ItemDefinition[] = [
  defineItem('energy_cell_small', 'Small Energy Cell', 'ammo', {
    weight: 0.2,
    stackSize: 20,
    baseValue: 25,
    rarity: 'uncommon',
    traits: {
      ammo: {
        ammoType: 'energy_cell',
        damageModifier: 1.0,
      },
    },
  }),

  defineItem('energy_cell_large', 'Large Energy Cell', 'ammo', {
    weight: 0.5,
    stackSize: 10,
    baseValue: 60,
    rarity: 'rare',
    traits: {
      ammo: {
        ammoType: 'energy_cell',
        damageModifier: 1.2,
      },
    },
  }),

  defineItem('energy_cell_overcharged', 'Overcharged Energy Cell', 'ammo', {
    weight: 0.3,
    stackSize: 8,
    baseValue: 100,
    rarity: 'epic',
    traits: {
      ammo: {
        ammoType: 'energy_cell',
        damageModifier: 1.5,
        specialEffect: 'overcharge',
      },
    },
  }),
];

/**
 * Plasma weapon fuel
 */
export const PLASMA_AMMO: ItemDefinition[] = [
  defineItem('plasma_canister', 'Plasma Canister', 'ammo', {
    weight: 0.5,
    stackSize: 10,
    baseValue: 50,
    rarity: 'rare',
    traits: {
      ammo: {
        ammoType: 'plasma_fuel',
        damageModifier: 1.0,
      },
    },
  }),

  defineItem('plasma_canister_refined', 'Refined Plasma Canister', 'ammo', {
    weight: 0.6,
    stackSize: 8,
    baseValue: 100,
    rarity: 'epic',
    traits: {
      ammo: {
        ammoType: 'plasma_fuel',
        damageModifier: 1.4,
      },
    },
  }),

  defineItem('plasma_canister_unstable', 'Unstable Plasma Canister', 'ammo', {
    weight: 0.4,
    stackSize: 5,
    baseValue: 150,
    rarity: 'epic',
    traits: {
      ammo: {
        ammoType: 'plasma_fuel',
        damageModifier: 2.0,
        specialEffect: 'explosive',
      },
    },
  }),
];

/**
 * All ammo items combined
 */
export const ALL_AMMO_ITEMS: ItemDefinition[] = [
  ...ARROW_AMMO,
  ...BOLT_AMMO,
  ...SLING_AMMO,
  ...PISTOL_AMMO,
  ...RIFLE_AMMO,
  ...SHOTGUN_AMMO,
  ...ENERGY_AMMO,
  ...PLASMA_AMMO,
];
