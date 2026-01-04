/**
 * Magic Focus Weapon Item Definitions
 *
 * Includes staves, wands, orbs, and grimoires.
 * These weapons enhance spellcasting rather than dealing direct physical damage.
 * Part of the Weapons Expansion (weapons-expansion spec)
 */

import { defineItem, type ItemDefinition } from '../ItemDefinition.js';

/**
 * Staves - two-handed magic focus weapons
 */
export const STAFF_WEAPONS: ItemDefinition[] = [
  defineItem('oak_staff', 'Oak Staff', 'equipment', {
    weight: 2.0,
    stackSize: 1,
    baseMaterial: 'wood',
    baseValue: 50,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 5,
        damageType: 'bludgeoning',
        range: 1,
        attackSpeed: 0.9,
        durabilityLoss: 0.01,
        twoHanded: true,
        category: 'staff',
        attackType: 'melee',
      },
      magical: {
        magicType: 'nature',
        spellPowerBonus: 0.1,
        manaRegen: 0.05,
      },
    },
  }),

  defineItem('ash_staff', 'Ash Staff', 'equipment', {
    weight: 2.0,
    stackSize: 1,
    baseMaterial: 'ash_wood',
    baseValue: 100,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 6,
        damageType: 'bludgeoning',
        range: 1,
        attackSpeed: 0.9,
        durabilityLoss: 0.008,
        twoHanded: true,
        category: 'staff',
        attackType: 'melee',
      },
      magical: {
        magicType: 'arcane',
        spellPowerBonus: 0.15,
        manaRegen: 0.08,
      },
    },
  }),

  defineItem('arcane_staff', 'Arcane Staff', 'equipment', {
    weight: 2.5,
    stackSize: 1,
    baseValue: 300,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 8,
        damageType: 'magic',
        range: 1,
        attackSpeed: 0.8,
        durabilityLoss: 0.008,
        twoHanded: true,
        category: 'staff',
        attackType: 'melee',
      },
      magical: {
        magicType: 'arcane',
        spellPowerBonus: 0.25,
        manaRegen: 0.1,
      },
    },
  }),

  defineItem('fire_staff', 'Staff of Flames', 'equipment', {
    weight: 2.5,
    stackSize: 1,
    baseValue: 400,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 10,
        damageType: 'fire',
        range: 1,
        attackSpeed: 0.8,
        durabilityLoss: 0.01,
        twoHanded: true,
        category: 'staff',
        attackType: 'melee',
        special: ['burning'],
      },
      magical: {
        magicType: 'fire',
        spellPowerBonus: 0.30,
        manaRegen: 0.05,
      },
    },
  }),

  defineItem('frost_staff', 'Staff of Winter', 'equipment', {
    weight: 2.5,
    stackSize: 1,
    baseValue: 400,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 10,
        damageType: 'frost',
        range: 1,
        attackSpeed: 0.8,
        durabilityLoss: 0.01,
        twoHanded: true,
        category: 'staff',
        attackType: 'melee',
        special: ['freezing'],
      },
      magical: {
        magicType: 'ice',
        spellPowerBonus: 0.30,
        manaRegen: 0.05,
      },
    },
  }),

  defineItem('lightning_staff', 'Staff of Storms', 'equipment', {
    weight: 2.5,
    stackSize: 1,
    baseValue: 400,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 10,
        damageType: 'lightning',
        range: 1,
        attackSpeed: 0.8,
        durabilityLoss: 0.01,
        twoHanded: true,
        category: 'staff',
        attackType: 'melee',
        special: ['chain_lightning'],
      },
      magical: {
        magicType: 'lightning',
        spellPowerBonus: 0.30,
        manaRegen: 0.05,
      },
    },
  }),

  defineItem('staff_archmage', 'Archmage Staff', 'equipment', {
    weight: 3.0,
    stackSize: 1,
    baseValue: 1000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 15,
        damageType: 'magic',
        range: 2,
        attackSpeed: 0.7,
        durabilityLoss: 0.005,
        twoHanded: true,
        category: 'staff',
        attackType: 'melee',
      },
      magical: {
        magicType: 'arcane',
        spellPowerBonus: 0.50,
        manaRegen: 0.20,
      },
    },
  }),

  defineItem('staff_elements', 'Staff of the Elements', 'equipment', {
    weight: 3.0,
    stackSize: 1,
    baseValue: 1200,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 12,
        damageType: 'magic',
        range: 2,
        attackSpeed: 0.8,
        durabilityLoss: 0.005,
        twoHanded: true,
        category: 'staff',
        attackType: 'melee',
      },
      magical: {
        magicType: 'elemental',
        spellPowerBonus: 0.40,
        manaRegen: 0.15,
        grantsSpells: ['fireball', 'ice_storm', 'chain_lightning'],
      },
    },
  }),
];

/**
 * Wands - one-handed ranged magic weapons
 */
export const WAND_WEAPONS: ItemDefinition[] = [
  defineItem('wand_basic', 'Wand', 'equipment', {
    weight: 0.3,
    stackSize: 1,
    baseMaterial: 'wood',
    baseValue: 80,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 10,
        damageType: 'magic',
        range: 15,
        attackSpeed: 1.5,
        durabilityLoss: 0.003,
        category: 'wand',
        attackType: 'magic',
        projectile: { speed: 20, arc: false, penetration: 1 },
      },
      magical: {
        magicType: 'arcane',
        spellPowerBonus: 0.15,
      },
    },
  }),

  defineItem('wand_fire', 'Wand of Fire', 'equipment', {
    weight: 0.3,
    stackSize: 1,
    baseValue: 200,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 15,
        damageType: 'fire',
        range: 12,
        attackSpeed: 1.2,
        durabilityLoss: 0.005,
        category: 'wand',
        attackType: 'magic',
        projectile: { speed: 15, arc: false, penetration: 1 },
        special: ['burning'],
      },
      magical: {
        magicType: 'fire',
        spellPowerBonus: 0.20,
      },
    },
  }),

  defineItem('wand_frost', 'Wand of Frost', 'equipment', {
    weight: 0.3,
    stackSize: 1,
    baseValue: 200,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 12,
        damageType: 'frost',
        range: 12,
        attackSpeed: 1.2,
        durabilityLoss: 0.005,
        category: 'wand',
        attackType: 'magic',
        projectile: { speed: 12, arc: false, penetration: 1 },
        special: ['freezing'],
      },
      magical: {
        magicType: 'ice',
        spellPowerBonus: 0.20,
      },
    },
  }),

  defineItem('wand_lightning', 'Wand of Lightning', 'equipment', {
    weight: 0.3,
    stackSize: 1,
    baseValue: 200,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 14,
        damageType: 'lightning',
        range: 15,
        attackSpeed: 1.4,
        durabilityLoss: 0.005,
        category: 'wand',
        attackType: 'magic',
        projectile: { speed: 25, arc: false, penetration: 1 },
        special: ['chain_lightning'],
      },
      magical: {
        magicType: 'lightning',
        spellPowerBonus: 0.20,
      },
    },
  }),

  defineItem('wand_death', 'Wand of Death', 'equipment', {
    weight: 0.3,
    stackSize: 1,
    baseValue: 500,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 20,
        damageType: 'necrotic',
        range: 12,
        attackSpeed: 1.0,
        durabilityLoss: 0.008,
        category: 'wand',
        attackType: 'magic',
        projectile: { speed: 15, arc: false, penetration: 2 },
        special: ['lifesteal'],
      },
      magical: {
        magicType: 'necromancy',
        spellPowerBonus: 0.30,
      },
    },
  }),

  defineItem('wand_master', 'Master Wand', 'equipment', {
    weight: 0.4,
    stackSize: 1,
    baseValue: 800,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 25,
        damageType: 'magic',
        range: 20,
        attackSpeed: 1.5,
        durabilityLoss: 0.003,
        category: 'wand',
        attackType: 'magic',
        projectile: { speed: 30, arc: false, penetration: 2 },
      },
      magical: {
        magicType: 'arcane',
        spellPowerBonus: 0.40,
        manaRegen: 0.10,
      },
    },
  }),
];

/**
 * Orbs - off-hand magic focus items that boost spellcasting
 */
export const ORB_WEAPONS: ItemDefinition[] = [
  defineItem('crystal_orb', 'Crystal Orb', 'equipment', {
    weight: 1.0,
    stackSize: 1,
    baseValue: 150,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 3,
        damageType: 'magic',
        range: 1,
        attackSpeed: 0.5,
        durabilityLoss: 0.001,
        category: 'orb',
        attackType: 'melee',
      },
      magical: {
        magicType: 'divination',
        spellPowerBonus: 0.30,
        manaRegen: 0.15,
      },
    },
  }),

  defineItem('orb_fire', 'Orb of Flame', 'equipment', {
    weight: 1.0,
    stackSize: 1,
    baseValue: 300,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 5,
        damageType: 'fire',
        range: 1,
        attackSpeed: 0.5,
        durabilityLoss: 0.002,
        category: 'orb',
        attackType: 'melee',
        special: ['burning'],
      },
      magical: {
        magicType: 'fire',
        spellPowerBonus: 0.35,
        manaRegen: 0.10,
      },
    },
  }),

  defineItem('orb_shadow', 'Shadow Orb', 'equipment', {
    weight: 0.8,
    stackSize: 1,
    baseValue: 400,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 8,
        damageType: 'necrotic',
        range: 1,
        attackSpeed: 0.5,
        durabilityLoss: 0.002,
        category: 'orb',
        attackType: 'melee',
      },
      magical: {
        magicType: 'shadow',
        spellPowerBonus: 0.40,
        manaRegen: 0.12,
      },
    },
  }),

  defineItem('orb_chaos', 'Orb of Chaos', 'equipment', {
    weight: 1.2,
    stackSize: 1,
    baseValue: 700,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 10,
        damageType: 'magic',
        range: 1,
        attackSpeed: 0.5,
        durabilityLoss: 0.003,
        category: 'orb',
        attackType: 'melee',
      },
      magical: {
        magicType: 'chaos',
        spellPowerBonus: 0.50,
        manaRegen: 0.20,
      },
    },
  }),

  defineItem('orb_souls', 'Orb of Souls', 'equipment', {
    weight: 0.5,
    stackSize: 1,
    baseValue: 900,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 5,
        damageType: 'necrotic',
        range: 1,
        attackSpeed: 0.5,
        durabilityLoss: 0.001,
        category: 'orb',
        attackType: 'melee',
        special: ['lifesteal'],
      },
      magical: {
        magicType: 'necromancy',
        spellPowerBonus: 0.45,
        manaRegen: 0.25,
      },
    },
  }),
];

/**
 * Grimoires - spell books that grant spells when equipped
 */
export const GRIMOIRE_WEAPONS: ItemDefinition[] = [
  defineItem('grimoire_apprentice', 'Apprentice Grimoire', 'equipment', {
    weight: 2.0,
    stackSize: 1,
    baseValue: 200,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 2,
        damageType: 'bludgeoning',
        range: 1,
        attackSpeed: 0.4,
        durabilityLoss: 0.001,
        category: 'grimoire',
        attackType: 'melee',
      },
      magical: {
        magicType: 'arcane',
        spellPowerBonus: 0.20,
        manaRegen: 0.10,
        grantsSpells: ['magic_missile', 'mage_armor'],
      },
    },
  }),

  defineItem('grimoire_fire', 'Grimoire of Pyromancy', 'equipment', {
    weight: 2.5,
    stackSize: 1,
    baseValue: 500,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 3,
        damageType: 'fire',
        range: 1,
        attackSpeed: 0.4,
        durabilityLoss: 0.001,
        category: 'grimoire',
        attackType: 'melee',
        special: ['burning'],
      },
      magical: {
        magicType: 'fire',
        spellPowerBonus: 0.35,
        manaRegen: 0.08,
        grantsSpells: ['fireball', 'flame_strike', 'wall_of_fire'],
      },
    },
  }),

  defineItem('grimoire_necromancy', 'Grimoire of the Dead', 'equipment', {
    weight: 3.0,
    stackSize: 1,
    baseValue: 800,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 1,
        damageType: 'necrotic',
        range: 1,
        attackSpeed: 0.3,
        durabilityLoss: 0.0001,
        category: 'grimoire',
        attackType: 'melee',
      },
      magical: {
        magicType: 'necromancy',
        spellPowerBonus: 0.40,
        manaRegen: 0.05,
        grantsSpells: ['raise_dead', 'soul_drain', 'death_bolt'],
        cursed: true,
      },
    },
  }),

  defineItem('grimoire_summoning', 'Grimoire of Summoning', 'equipment', {
    weight: 3.0,
    stackSize: 1,
    baseValue: 700,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 2,
        damageType: 'magic',
        range: 1,
        attackSpeed: 0.3,
        durabilityLoss: 0.001,
        category: 'grimoire',
        attackType: 'melee',
      },
      magical: {
        magicType: 'conjuration',
        spellPowerBonus: 0.35,
        manaRegen: 0.10,
        grantsSpells: ['summon_familiar', 'summon_elemental', 'planar_ally'],
      },
    },
  }),

  defineItem('grimoire_archmage', 'Archmage\'s Tome', 'equipment', {
    weight: 4.0,
    stackSize: 1,
    baseValue: 2000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 5,
        damageType: 'magic',
        range: 1,
        attackSpeed: 0.3,
        durabilityLoss: 0.0001,
        category: 'grimoire',
        attackType: 'melee',
      },
      magical: {
        magicType: 'arcane',
        spellPowerBonus: 0.60,
        manaRegen: 0.25,
        grantsSpells: ['meteor_swarm', 'time_stop', 'wish'],
      },
    },
  }),

  defineItem('grimoire_forbidden', 'Forbidden Grimoire', 'equipment', {
    weight: 5.0,
    stackSize: 1,
    baseValue: 5000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 10,
        damageType: 'void',
        range: 1,
        attackSpeed: 0.2,
        durabilityLoss: 0.0001,
        category: 'grimoire',
        attackType: 'melee',
      },
      magical: {
        magicType: 'entropy',
        spellPowerBonus: 0.80,
        manaRegen: 0.30,
        grantsSpells: ['void_tear', 'reality_break', 'entropy_cascade'],
        cursed: true,
      },
    },
  }),
];

/**
 * All magic focus weapons combined
 */
export const ALL_MAGIC_WEAPONS: ItemDefinition[] = [
  ...STAFF_WEAPONS,
  ...WAND_WEAPONS,
  ...ORB_WEAPONS,
  ...GRIMOIRE_WEAPONS,
];
