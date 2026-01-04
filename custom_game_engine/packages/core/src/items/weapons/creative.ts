/**
 * Creative & Unusual Weapon Definitions
 *
 * Unique, imaginative weapons that don't fit standard categories.
 * Includes living weapons, conceptual weapons, cursed items, and oddities.
 *
 * Part of the Weapons Expansion (weapons-expansion spec)
 */

import { defineItem, type ItemDefinition } from '../ItemDefinition.js';

/**
 * Living Weapons - Organic, symbiotic, or sentient weapons
 */
export const LIVING_WEAPONS: ItemDefinition[] = [
  defineItem('bone_scythe', 'Bone Scythe of the Harvester', 'equipment', {
    weight: 4.0,
    stackSize: 1,
    baseValue: 800,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 28,
        damageType: 'necrotic',
        range: 2,
        attackSpeed: 0.7,
        durabilityLoss: 0.002, // Self-healing
        twoHanded: true,
        category: 'polearm',
        attackType: 'melee',
        special: ['lifesteal', 'bleeding'],
      },
      magical: {
        magicType: 'necromancy',
        effects: ['heals_from_kills'],
        manaPerUse: 2,
      },
    },
  }),

  defineItem('tentacle_whip', 'Abyssal Tentacle', 'equipment', {
    weight: 2.0,
    stackSize: 1,
    baseValue: 600,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 12,
        damageType: 'void',
        range: 4,
        attackSpeed: 1.4,
        durabilityLoss: 0.001, // Regenerates
        category: 'whip',
        attackType: 'melee',
        special: ['grappling', 'reach'],
      },
      magical: {
        magicType: 'void',
        effects: ['pulls_enemies', 'writhes_independently'],
      },
    },
  }),

  defineItem('living_blade', 'Symbiotic Blade', 'equipment', {
    weight: 1.5,
    stackSize: 1,
    baseValue: 1200,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 22,
        damageType: 'slashing',
        range: 1,
        attackSpeed: 1.3,
        durabilityLoss: 0, // Cannot break, feeds on wielder
        category: 'sword',
        attackType: 'melee',
        special: ['armor_piercing', 'lifesteal'],
        critChance: 0.15,
        critMultiplier: 2.2,
      },
      magical: {
        magicType: 'chaos',
        effects: ['bonds_to_wielder', 'grows_stronger_with_kills'],
        cursed: true,
      },
    },
  }),

  defineItem('tooth_dagger', 'Dragon Tooth Dagger', 'equipment', {
    weight: 0.8,
    stackSize: 1,
    baseValue: 900,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 18,
        damageType: 'piercing',
        range: 1,
        attackSpeed: 1.8,
        durabilityLoss: 0.003,
        category: 'dagger',
        attackType: 'melee',
        special: ['armor_piercing', 'poison'],
      },
      magical: {
        magicType: 'nature',
        effects: ['injects_venom', 'senses_prey'],
      },
    },
  }),

  defineItem('swarm_orb', 'Hive Orb', 'equipment', {
    weight: 1.0,
    stackSize: 1,
    baseValue: 750,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 5,
        damageType: 'poison',
        range: 8,
        attackSpeed: 2.0,
        durabilityLoss: 0.005,
        aoeRadius: 2,
        category: 'orb',
        attackType: 'ranged',
        special: ['poison', 'swarming'],
      },
      magical: {
        magicType: 'nature',
        effects: ['releases_insect_swarm', 'swarm_returns'],
        manaPerUse: 3,
      },
    },
  }),

  defineItem('fungal_staff', 'Mycelium Staff', 'equipment', {
    weight: 2.5,
    stackSize: 1,
    baseValue: 650,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 10,
        damageType: 'poison',
        range: 6,
        attackSpeed: 0.8,
        durabilityLoss: 0.002,
        aoeRadius: 3,
        twoHanded: true,
        category: 'staff',
        attackType: 'magic',
        special: ['poison', 'stunning'],
      },
      magical: {
        magicType: 'nature',
        effects: ['spore_cloud', 'spreads_fungal_network'],
        spellPowerBonus: 12,
        manaPerUse: 4,
      },
    },
  }),

  defineItem('blood_weapon', 'Hemomancer\'s Focus', 'equipment', {
    weight: 0.5,
    stackSize: 1,
    baseValue: 1100,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 25,
        damageType: 'necrotic',
        range: 5,
        attackSpeed: 1.0,
        durabilityLoss: 0,
        category: 'orb',
        attackType: 'magic',
        special: ['lifesteal', 'bleeding'],
      },
      magical: {
        magicType: 'necromancy',
        effects: ['uses_wielder_blood', 'damage_scales_with_missing_health'],
        cursed: true,
        spellPowerBonus: 25,
      },
    },
  }),
];

/**
 * Conceptual Weapons - Weapons that embody abstract concepts
 */
export const CONCEPTUAL_WEAPONS: ItemDefinition[] = [
  defineItem('blade_of_unmaking', 'Blade of Unmaking', 'equipment', {
    weight: 0.1, // Almost weightless, barely exists
    stackSize: 1,
    baseValue: 5000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 40,
        damageType: 'void',
        range: 1,
        attackSpeed: 1.0,
        durabilityLoss: 0.05, // Consumes itself
        category: 'sword',
        attackType: 'melee',
        special: ['armor_piercing', 'disintegrating'],
      },
      magical: {
        magicType: 'entropy',
        effects: ['erases_from_existence', 'cannot_be_healed'],
        cursed: true,
      },
    },
  }),

  defineItem('memory_dagger', 'Blade of Forgotten Names', 'equipment', {
    weight: 0.3,
    stackSize: 1,
    baseValue: 2000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 15,
        damageType: 'psionic',
        range: 1,
        attackSpeed: 1.5,
        durabilityLoss: 0.008,
        category: 'dagger',
        attackType: 'melee',
        special: ['stunning'],
      },
      magical: {
        magicType: 'psychic',
        effects: ['steals_memories', 'victim_forgets_attacker'],
      },
    },
  }),

  defineItem('paradox_bow', 'Bow of Temporal Paradox', 'equipment', {
    weight: 1.5,
    stackSize: 1,
    baseValue: 3500,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 20,
        damageType: 'force',
        range: 30,
        attackSpeed: 0.5,
        durabilityLoss: 0.01,
        twoHanded: true,
        category: 'bow',
        attackType: 'ranged',
        special: ['armor_piercing'],
        projectile: { speed: 100, arc: false, penetration: 3 },
      },
      magical: {
        magicType: 'chaos',
        effects: ['arrow_hits_before_fired', 'wounds_appear_in_past'],
        manaPerUse: 10,
      },
    },
  }),

  defineItem('echo_hammer', 'Hammer of Reverberating Doom', 'equipment', {
    weight: 8.0,
    stackSize: 1,
    baseValue: 1500,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 35,
        damageType: 'force',
        range: 2,
        attackSpeed: 0.4,
        durabilityLoss: 0.008,
        twoHanded: true,
        aoeRadius: 2,
        category: 'hammer',
        attackType: 'melee',
        special: ['stunning', 'knockback'],
      },
      magical: {
        magicType: 'order',
        effects: ['impact_echoes_three_times', 'shockwave'],
      },
    },
  }),

  defineItem('silence_knife', 'Knife of Utter Silence', 'equipment', {
    weight: 0.4,
    stackSize: 1,
    baseValue: 1800,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 12,
        damageType: 'void',
        range: 1,
        attackSpeed: 2.0,
        durabilityLoss: 0.005,
        category: 'dagger',
        attackType: 'melee',
        special: ['stealth'],
        critChance: 0.25,
        critMultiplier: 3.0,
      },
      magical: {
        magicType: 'void',
        effects: ['absorbs_all_sound', 'victims_cannot_scream', 'silences_magic'],
      },
    },
  }),

  defineItem('dream_staff', 'Staff of Waking Dreams', 'equipment', {
    weight: 2.0,
    stackSize: 1,
    baseValue: 2200,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 18,
        damageType: 'psionic',
        range: 10,
        attackSpeed: 0.7,
        durabilityLoss: 0.006,
        twoHanded: true,
        aoeRadius: 3,
        category: 'staff',
        attackType: 'magic',
        special: ['stunning'],
      },
      magical: {
        magicType: 'psychic',
        effects: ['pulls_nightmares_into_reality', 'enemies_hallucinate'],
        spellPowerBonus: 30,
        manaPerUse: 8,
      },
    },
  }),

  defineItem('gravity_mace', 'Singularity Mace', 'equipment', {
    weight: 50.0, // Extremely heavy, warps space
    stackSize: 1,
    baseValue: 4000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 60,
        damageType: 'force',
        range: 2,
        attackSpeed: 0.2,
        durabilityLoss: 0.01,
        twoHanded: true,
        aoeRadius: 3,
        category: 'mace',
        attackType: 'melee',
        special: ['stunning', 'knockback'],
      },
      magical: {
        magicType: 'void',
        effects: ['pulls_enemies_toward_impact', 'creates_gravity_well'],
        manaPerUse: 15,
      },
    },
  }),
];

/**
 * Musical Weapons - Weapons that use sound and music
 */
export const MUSICAL_WEAPONS: ItemDefinition[] = [
  defineItem('war_horn', 'Dreadhorn of the Ancients', 'equipment', {
    weight: 3.0,
    stackSize: 1,
    baseValue: 600,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 8,
        damageType: 'force',
        range: 15,
        attackSpeed: 0.3,
        durabilityLoss: 0.01,
        aoeRadius: 8,
        category: 'heavy',
        attackType: 'ranged',
        special: ['stunning', 'fear'],
      },
      magical: {
        magicType: 'evocation',
        effects: ['causes_fear', 'shatters_morale'],
      },
    },
  }),

  defineItem('sonic_lute', 'Lute of Shattering Chords', 'equipment', {
    weight: 2.0,
    stackSize: 1,
    baseValue: 800,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 15,
        damageType: 'force',
        range: 12,
        attackSpeed: 0.8,
        durabilityLoss: 0.008,
        twoHanded: true,
        category: 'staff',
        attackType: 'ranged',
        special: ['stunning'],
        projectile: { speed: 30, arc: false, penetration: 2 },
      },
      magical: {
        magicType: 'evocation',
        effects: ['sonic_waves', 'can_shatter_objects'],
        spellPowerBonus: 15,
      },
    },
  }),

  defineItem('death_whistle', 'Aztec Death Whistle', 'equipment', {
    weight: 0.2,
    stackSize: 1,
    baseValue: 400,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 5,
        damageType: 'psionic',
        range: 10,
        attackSpeed: 0.5,
        durabilityLoss: 0.005,
        aoeRadius: 5,
        category: 'throwing',
        attackType: 'ranged',
        special: ['fear', 'stunning'],
      },
      magical: {
        magicType: 'necromancy',
        effects: ['screams_of_the_dead', 'causes_terror'],
      },
    },
  }),

  defineItem('thunder_drums', 'War Drums of the Storm Giant', 'equipment', {
    weight: 15.0,
    stackSize: 1,
    baseValue: 1200,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 25,
        damageType: 'lightning',
        range: 20,
        attackSpeed: 0.4,
        durabilityLoss: 0.012,
        twoHanded: true,
        aoeRadius: 6,
        category: 'heavy',
        attackType: 'ranged',
        special: ['stunning', 'knockback'],
      },
      magical: {
        magicType: 'lightning',
        effects: ['calls_thunder', 'rhythm_stuns_enemies'],
        manaPerUse: 5,
      },
    },
  }),

  defineItem('resonance_blade', 'Tuning Fork Blade', 'equipment', {
    weight: 2.5,
    stackSize: 1,
    baseValue: 700,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 16,
        damageType: 'force',
        range: 1,
        attackSpeed: 1.2,
        durabilityLoss: 0.006,
        category: 'sword',
        attackType: 'melee',
        special: ['armor_piercing'],
      },
      magical: {
        magicType: 'evocation',
        effects: ['vibrates_at_resonant_frequency', 'shatters_armor'],
      },
    },
  }),
];

/**
 * Trick Weapons - Weapons with hidden forms or mechanisms
 */
export const TRICK_WEAPONS: ItemDefinition[] = [
  defineItem('cane_sword', 'Gentleman\'s Walking Cane', 'equipment', {
    weight: 1.5,
    stackSize: 1,
    baseValue: 300,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 12,
        damageType: 'piercing',
        range: 1,
        attackSpeed: 1.4,
        durabilityLoss: 0.008,
        category: 'sword',
        attackType: 'melee',
        special: ['stealth'],
        critChance: 0.12,
        critMultiplier: 2.0,
      },
    },
  }),

  defineItem('whip_sword', 'Urumi - Flexible Blade', 'equipment', {
    weight: 2.0,
    stackSize: 1,
    baseValue: 500,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 14,
        damageType: 'slashing',
        range: 3,
        attackSpeed: 1.0,
        durabilityLoss: 0.01,
        category: 'whip',
        attackType: 'melee',
        special: ['reach', 'bleeding'],
      },
    },
  }),

  defineItem('gunblade', 'Gunblade', 'equipment', {
    weight: 4.0,
    stackSize: 1,
    baseValue: 900,
    rarity: 'epic',
    traits: {
      weapon: {
        damage: 20, // Sword mode
        damageType: 'slashing',
        range: 1,
        attackSpeed: 0.9,
        durabilityLoss: 0.01,
        category: 'sword',
        attackType: 'melee',
        special: ['explosive'], // Gun fires on hit
        ammo: { ammoType: 'pistol_ammo', ammoPerShot: 1, magazineSize: 6, reloadTime: 40 },
      },
    },
  }),

  defineItem('sawcleaver', 'Saw Cleaver', 'equipment', {
    weight: 5.0,
    stackSize: 1,
    baseValue: 700,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 22,
        damageType: 'slashing',
        range: 2,
        attackSpeed: 0.8,
        durabilityLoss: 0.012,
        twoHanded: true,
        category: 'axe',
        attackType: 'melee',
        special: ['bleeding', 'serrated'],
      },
    },
  }),

  defineItem('threaded_cane', 'Threaded Cane', 'equipment', {
    weight: 1.8,
    stackSize: 1,
    baseValue: 650,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 10,
        damageType: 'slashing',
        range: 4, // Whip form
        attackSpeed: 1.3,
        durabilityLoss: 0.008,
        category: 'whip',
        attackType: 'melee',
        special: ['reach', 'bleeding'],
        critChance: 0.10,
        critMultiplier: 1.8,
      },
    },
  }),

  defineItem('blade_fan', 'Iron War Fan - Tessen', 'equipment', {
    weight: 0.8,
    stackSize: 1,
    baseValue: 400,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 8,
        damageType: 'slashing',
        range: 1,
        attackSpeed: 1.8,
        durabilityLoss: 0.006,
        category: 'dagger',
        attackType: 'melee',
        special: ['stealth', 'parrying'],
        critChance: 0.15,
        critMultiplier: 1.6,
      },
    },
  }),

  defineItem('chain_sickle', 'Kusarigama', 'equipment', {
    weight: 3.0,
    stackSize: 1,
    baseValue: 450,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 12,
        damageType: 'slashing',
        range: 4,
        attackSpeed: 1.0,
        durabilityLoss: 0.01,
        twoHanded: true,
        category: 'chain',
        attackType: 'melee',
        special: ['grappling', 'reach'],
      },
    },
  }),

  defineItem('shield_blade', 'Lantern Shield', 'equipment', {
    weight: 6.0,
    stackSize: 1,
    baseValue: 550,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 10,
        damageType: 'piercing',
        range: 1,
        attackSpeed: 0.8,
        durabilityLoss: 0.008,
        category: 'fist',
        attackType: 'melee',
        special: ['parrying', 'blinding'], // Has lantern
      },
    },
  }),
];

/**
 * Elemental Oddities - Strange elemental weapons
 */
export const ELEMENTAL_ODDITIES: ItemDefinition[] = [
  defineItem('frost_breath_vial', 'Bottled Blizzard', 'equipment', {
    weight: 0.5,
    stackSize: 3,
    baseValue: 300,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 20,
        damageType: 'frost',
        range: 8,
        attackSpeed: 0.5,
        durabilityLoss: 0.2, // Consumable-ish
        aoeRadius: 4,
        category: 'throwing',
        attackType: 'ranged',
        special: ['freezing'],
        projectile: { speed: 15, arc: true, penetration: 1 },
      },
    },
  }),

  defineItem('storm_jar', 'Jar of Captive Lightning', 'equipment', {
    weight: 1.0,
    stackSize: 3,
    baseValue: 400,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 30,
        damageType: 'lightning',
        range: 10,
        attackSpeed: 0.4,
        durabilityLoss: 0.25,
        aoeRadius: 5,
        category: 'throwing',
        attackType: 'ranged',
        special: ['stunning', 'chain_lightning'],
        projectile: { speed: 20, arc: true, penetration: 1 },
      },
    },
  }),

  defineItem('magma_heart', 'Heart of the Volcano', 'equipment', {
    weight: 3.0,
    stackSize: 1,
    baseValue: 1500,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 35,
        damageType: 'fire',
        range: 6,
        attackSpeed: 0.6,
        durabilityLoss: 0.015,
        aoeRadius: 3,
        category: 'orb',
        attackType: 'magic',
        special: ['burning', 'explosive'],
      },
      magical: {
        magicType: 'fire',
        effects: ['erupts_on_command', 'leaves_lava_pools'],
        manaPerUse: 10,
        spellPowerBonus: 20,
      },
    },
  }),

  defineItem('wind_fan', 'Tempest Fan', 'equipment', {
    weight: 0.5,
    stackSize: 1,
    baseValue: 600,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 8,
        damageType: 'force',
        range: 12,
        attackSpeed: 1.2,
        durabilityLoss: 0.005,
        aoeRadius: 4,
        category: 'staff',
        attackType: 'magic',
        special: ['knockback'],
      },
      magical: {
        magicType: 'air',
        effects: ['creates_gusts', 'deflects_projectiles'],
        manaPerUse: 3,
      },
    },
  }),

  defineItem('quicksand_pouch', 'Pouch of Hungry Earth', 'equipment', {
    weight: 2.0,
    stackSize: 5,
    baseValue: 250,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 5,
        damageType: 'bludgeoning',
        range: 8,
        attackSpeed: 0.6,
        durabilityLoss: 0.15,
        aoeRadius: 3,
        category: 'throwing',
        attackType: 'ranged',
        special: ['stunning', 'grappling'],
        projectile: { speed: 10, arc: true, penetration: 1 },
      },
      magical: {
        magicType: 'earth',
        effects: ['creates_quicksand', 'slows_enemies'],
      },
    },
  }),

  defineItem('aurora_prism', 'Prism of the Northern Lights', 'equipment', {
    weight: 0.3,
    stackSize: 1,
    baseValue: 1800,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 25,
        damageType: 'radiant',
        range: 15,
        attackSpeed: 0.8,
        durabilityLoss: 0.008,
        category: 'orb',
        attackType: 'magic',
        special: ['blinding'],
      },
      magical: {
        magicType: 'radiant',
        effects: ['splits_into_rainbow_beams', 'each_color_different_effect'],
        spellPowerBonus: 25,
        manaPerUse: 6,
      },
    },
  }),
];

/**
 * Cursed Weapons - Powerful but with significant drawbacks
 */
export const CURSED_WEAPONS: ItemDefinition[] = [
  defineItem('betrayer_blade', 'Blade of the Betrayer', 'equipment', {
    weight: 2.5,
    stackSize: 1,
    baseValue: 1,  // Cursed items have no trade value
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 45,
        damageType: 'necrotic',
        range: 1,
        attackSpeed: 1.2,
        durabilityLoss: 0,
        category: 'sword',
        attackType: 'melee',
        special: ['armor_piercing', 'lifesteal'],
        critChance: 0.20,
        critMultiplier: 2.5,
      },
      magical: {
        magicType: 'necromancy',
        effects: ['cannot_be_dropped', 'attacks_allies_randomly', 'whispers_paranoia'],
        cursed: true,
      },
    },
  }),

  defineItem('hungry_axe', 'The Famished', 'equipment', {
    weight: 7.0,
    stackSize: 1,
    baseValue: 1,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 50,
        damageType: 'slashing',
        range: 2,
        attackSpeed: 0.7,
        durabilityLoss: 0,
        twoHanded: true,
        category: 'axe',
        attackType: 'melee',
        special: ['bleeding', 'lifesteal'],
      },
      magical: {
        magicType: 'entropy',
        effects: ['demands_kills_daily', 'drains_wielder_if_unfed', 'grows_larger_with_kills'],
        cursed: true,
      },
    },
  }),

  defineItem('mirror_shield', 'Shield of Reflected Sins', 'equipment', {
    weight: 8.0,
    stackSize: 1,
    baseValue: 1,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 0, // Defensive weapon
        damageType: 'force',
        range: 1,
        attackSpeed: 0.5,
        durabilityLoss: 0.001,
        category: 'fist',
        attackType: 'melee',
        special: ['parrying', 'reflecting'],
      },
      magical: {
        magicType: 'psychic',
        effects: ['reflects_damage_to_attacker', 'shows_wielder_their_sins', 'causes_nightmares'],
        cursed: true,
      },
    },
  }),

  defineItem('puppet_strings', 'Strings of the Puppeteer', 'equipment', {
    weight: 0.1,
    stackSize: 1,
    baseValue: 1,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 5,
        damageType: 'psionic',
        range: 10,
        attackSpeed: 1.0,
        durabilityLoss: 0.002,
        category: 'whip',
        attackType: 'ranged',
        special: ['grappling'],
      },
      magical: {
        magicType: 'psychic',
        effects: ['controls_weak_minded', 'wielder_slowly_loses_free_will'],
        cursed: true,
        manaPerUse: 15,
      },
    },
  }),

  defineItem('doom_bell', 'Bell of the Final Hour', 'equipment', {
    weight: 5.0,
    stackSize: 1,
    baseValue: 1,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 100, // Devastating
        damageType: 'necrotic',
        range: 20,
        attackSpeed: 0.1, // Very slow
        durabilityLoss: 0.1,
        aoeRadius: 10,
        twoHanded: true,
        category: 'heavy',
        attackType: 'ranged',
        special: ['fear', 'stunning'],
      },
      magical: {
        magicType: 'necromancy',
        effects: ['kills_weak_enemies_instantly', 'ages_wielder_with_each_ring', 'summons_death'],
        cursed: true,
        manaPerUse: 50,
      },
    },
  }),
];

/**
 * Weird Science Weapons - Technology that shouldn't work
 */
export const WEIRD_SCIENCE_WEAPONS: ItemDefinition[] = [
  defineItem('shrink_ray', 'Miniaturization Ray', 'equipment', {
    weight: 3.0,
    stackSize: 1,
    baseValue: 2000,
    rarity: 'legendary',
    clarketechTier: 7,
    researchRequired: 'nanofabrication',
    traits: {
      weapon: {
        damage: 5,
        damageType: 'force',
        range: 15,
        attackSpeed: 0.5,
        durabilityLoss: 0.02,
        category: 'pistol',
        attackType: 'ranged',
        special: ['stunning'],
        ammo: { ammoType: 'energy_cell', ammoPerShot: 5, magazineSize: 20, reloadTime: 60 },
        projectile: { speed: 50, arc: false, penetration: 1 },
      },
      magical: {
        magicType: 'transmutation',
        effects: ['shrinks_target', 'effect_temporary'],
      },
    },
  }),

  defineItem('tesla_glove', 'Tesla Gauntlet', 'equipment', {
    weight: 2.0,
    stackSize: 1,
    baseValue: 800,
    rarity: 'epic',
    clarketechTier: 6,
    researchRequired: 'advanced_electronics',
    traits: {
      weapon: {
        damage: 18,
        damageType: 'lightning',
        range: 4,
        attackSpeed: 1.5,
        durabilityLoss: 0.01,
        category: 'fist',
        attackType: 'melee',
        special: ['chain_lightning', 'stunning'],
        powerCost: 2,
      },
    },
  }),

  defineItem('probability_gun', 'Probability Manipulator', 'equipment', {
    weight: 1.5,
    stackSize: 1,
    baseValue: 3000,
    rarity: 'legendary',
    clarketechTier: 7,
    researchRequired: 'quantum_computing',
    traits: {
      weapon: {
        damage: 1, // Base damage is random
        damageType: 'force',
        range: 20,
        attackSpeed: 0.8,
        durabilityLoss: 0.015,
        category: 'pistol',
        attackType: 'ranged',
        ammo: { ammoType: 'energy_cell', ammoPerShot: 3, magazineSize: 15, reloadTime: 40 },
        projectile: { speed: 80, arc: false, penetration: 1 },
      },
      magical: {
        magicType: 'chaos',
        effects: ['random_damage_1_to_100', 'random_effect_on_hit', 'might_backfire'],
      },
    },
  }),

  defineItem('portal_gun', 'Dimensional Aperture Device', 'equipment', {
    weight: 4.0,
    stackSize: 1,
    baseValue: 5000,
    rarity: 'legendary',
    clarketechTier: 7,
    researchRequired: ['local_teleportation', 'stable_inter_universe_portals'],
    traits: {
      weapon: {
        damage: 0,
        damageType: 'void',
        range: 30,
        attackSpeed: 0.3,
        durabilityLoss: 0.02,
        category: 'rifle',
        attackType: 'ranged',
        ammo: { ammoType: 'energy_cell', ammoPerShot: 10, magazineSize: 30, reloadTime: 80 },
        projectile: { speed: 100, arc: false, penetration: 10 },
      },
      magical: {
        magicType: 'conjuration',
        effects: ['creates_linked_portals', 'can_redirect_attacks', 'unstable_portals_dangerous'],
        manaPerUse: 20,
      },
    },
  }),

  defineItem('gravity_boots', 'Graviton Boots', 'equipment', {
    weight: 5.0,
    stackSize: 1,
    baseValue: 1200,
    rarity: 'epic',
    clarketechTier: 7,
    researchRequired: 'anti_gravity',
    traits: {
      weapon: {
        damage: 25,
        damageType: 'force',
        range: 1,
        attackSpeed: 0.6,
        durabilityLoss: 0.01,
        aoeRadius: 2,
        category: 'fist',
        attackType: 'melee',
        special: ['knockback', 'stunning'],
        powerCost: 3,
      },
      magical: {
        magicType: 'void',
        effects: ['ground_pound', 'low_gravity_jumps'],
      },
    },
  }),

  defineItem('freeze_ray', 'Absolute Zero Projector', 'equipment', {
    weight: 4.0,
    stackSize: 1,
    baseValue: 1800,
    rarity: 'legendary',
    clarketechTier: 6,
    researchRequired: 'cryogenic_suspension',
    traits: {
      weapon: {
        damage: 15,
        damageType: 'frost',
        range: 12,
        attackSpeed: 0.4,
        durabilityLoss: 0.015,
        aoeRadius: 2,
        twoHanded: true,
        category: 'beam',
        attackType: 'ranged',
        special: ['freezing'],
        powerCost: 4,
        projectile: { speed: 100, arc: false, penetration: 1 },
      },
    },
  }),
];

/**
 * Improvised & Unusual Weapons - Things not meant to be weapons
 */
export const IMPROVISED_WEAPONS: ItemDefinition[] = [
  defineItem('frying_pan', 'Cast Iron Skillet of Justice', 'equipment', {
    weight: 3.0,
    stackSize: 1,
    baseValue: 50,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 12,
        damageType: 'bludgeoning',
        range: 1,
        attackSpeed: 0.9,
        durabilityLoss: 0.002, // Very durable
        category: 'mace',
        attackType: 'melee',
        special: ['stunning'],
      },
    },
  }),

  defineItem('broken_bottle', 'Broken Bottle', 'equipment', {
    weight: 0.3,
    stackSize: 1,
    baseValue: 1,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 6,
        damageType: 'slashing',
        range: 1,
        attackSpeed: 1.6,
        durabilityLoss: 0.15, // Fragile
        category: 'dagger',
        attackType: 'melee',
        special: ['bleeding'],
      },
    },
  }),

  defineItem('sock_of_coins', 'Coin-Filled Sock', 'equipment', {
    weight: 1.0,
    stackSize: 1,
    baseValue: 100, // Contains coins
    rarity: 'common',
    traits: {
      weapon: {
        damage: 10,
        damageType: 'bludgeoning',
        range: 1,
        attackSpeed: 1.2,
        durabilityLoss: 0.02,
        category: 'mace',
        attackType: 'melee',
        special: ['stunning'],
      },
    },
  }),

  defineItem('chair_leg', 'Trusty Chair Leg', 'equipment', {
    weight: 1.5,
    stackSize: 1,
    baseValue: 5,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 8,
        damageType: 'bludgeoning',
        range: 1,
        attackSpeed: 1.3,
        durabilityLoss: 0.03,
        category: 'mace',
        attackType: 'melee',
      },
    },
  }),

  defineItem('bag_of_rats', 'Sack of Angry Rats', 'equipment', {
    weight: 2.0,
    stackSize: 1,
    baseValue: 30,
    rarity: 'uncommon',
    traits: {
      weapon: {
        damage: 8,
        damageType: 'piercing',
        range: 3,
        attackSpeed: 0.5,
        durabilityLoss: 0.1,
        aoeRadius: 2,
        category: 'throwing',
        attackType: 'ranged',
        special: ['poison', 'swarming'],
        projectile: { speed: 8, arc: true, penetration: 1 },
      },
    },
  }),

  defineItem('beehive', 'Portable Beehive', 'equipment', {
    weight: 4.0,
    stackSize: 1,
    baseValue: 80,
    rarity: 'rare',
    traits: {
      weapon: {
        damage: 3,
        damageType: 'poison',
        range: 5,
        attackSpeed: 0.3,
        durabilityLoss: 0.2,
        aoeRadius: 4,
        category: 'throwing',
        attackType: 'ranged',
        special: ['poison', 'swarming', 'fear'],
        projectile: { speed: 6, arc: true, penetration: 1 },
      },
    },
  }),

  defineItem('hot_soup', 'Scalding Hot Soup', 'equipment', {
    weight: 1.5,
    stackSize: 3,
    baseValue: 15,
    rarity: 'common',
    traits: {
      weapon: {
        damage: 10,
        damageType: 'fire',
        range: 3,
        attackSpeed: 0.8,
        durabilityLoss: 0.5, // One use
        aoeRadius: 1,
        category: 'throwing',
        attackType: 'ranged',
        special: ['burning', 'blinding'],
        projectile: { speed: 10, arc: true, penetration: 1 },
      },
    },
  }),
];

/**
 * Mythological Weapons - Weapons from legend and myth
 */
export const MYTHOLOGICAL_WEAPONS: ItemDefinition[] = [
  defineItem('gungnir', 'Gungnir - Spear of Odin', 'equipment', {
    weight: 4.0,
    stackSize: 1,
    baseValue: 10000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 50,
        damageType: 'force',
        range: 3,
        attackSpeed: 0.8,
        durabilityLoss: 0,
        twoHanded: true,
        category: 'spear',
        attackType: 'melee',
        special: ['armor_piercing'],
        critChance: 1.0, // Always crits when thrown
        critMultiplier: 2.0,
      },
      magical: {
        magicType: 'divine',
        effects: ['never_misses_when_thrown', 'returns_to_hand', 'marks_for_death'],
      },
    },
  }),

  defineItem('mjolnir', 'Mjolnir - Hammer of Thor', 'equipment', {
    weight: 100.0, // Only worthy can lift
    stackSize: 1,
    baseValue: 10000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 80,
        damageType: 'lightning',
        range: 2,
        attackSpeed: 0.5,
        durabilityLoss: 0,
        twoHanded: true,
        aoeRadius: 3,
        category: 'hammer',
        attackType: 'melee',
        special: ['stunning', 'chain_lightning', 'knockback'],
      },
      magical: {
        magicType: 'lightning',
        effects: ['only_worthy_can_lift', 'returns_when_thrown', 'calls_lightning'],
      },
    },
  }),

  defineItem('kusanagi', 'Kusanagi-no-Tsurugi', 'equipment', {
    weight: 2.0,
    stackSize: 1,
    baseValue: 8000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 40,
        damageType: 'slashing',
        range: 1,
        attackSpeed: 1.2,
        durabilityLoss: 0,
        category: 'sword',
        attackType: 'melee',
        special: ['armor_piercing'],
        critChance: 0.20,
        critMultiplier: 2.5,
      },
      magical: {
        magicType: 'air',
        effects: ['controls_wind', 'wind_blade_projectiles', 'cannot_be_broken'],
      },
    },
  }),

  defineItem('gae_bolg', 'Gáe Bolg - Spear of Mortal Pain', 'equipment', {
    weight: 3.0,
    stackSize: 1,
    baseValue: 7000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 35,
        damageType: 'piercing',
        range: 3,
        attackSpeed: 0.7,
        durabilityLoss: 0,
        twoHanded: true,
        category: 'spear',
        attackType: 'melee',
        special: ['armor_piercing', 'bleeding'],
      },
      magical: {
        magicType: 'necromancy',
        effects: ['wounds_cannot_heal', 'barbs_multiply_inside_body', 'reverses_causality'],
        cursed: true,
      },
    },
  }),

  defineItem('ruyi_jingu_bang', 'Ruyi Jingu Bang - Monkey King Staff', 'equipment', {
    weight: 1.0, // Weightless to rightful owner
    stackSize: 1,
    baseValue: 9000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 45,
        damageType: 'bludgeoning',
        range: 10, // Extends
        attackSpeed: 1.0,
        durabilityLoss: 0,
        twoHanded: true,
        category: 'staff',
        attackType: 'melee',
        special: ['reach', 'knockback'],
      },
      magical: {
        magicType: 'transmutation',
        effects: ['grows_and_shrinks_at_will', 'weighs_8_tons_to_others', 'can_multiply'],
      },
    },
  }),

  defineItem('excalibur', 'Excalibur', 'equipment', {
    weight: 3.0,
    stackSize: 1,
    baseValue: 10000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 55,
        damageType: 'radiant',
        range: 2,
        attackSpeed: 0.9,
        durabilityLoss: 0,
        category: 'sword',
        attackType: 'melee',
        special: ['armor_piercing', 'blinding'],
      },
      magical: {
        magicType: 'holy',
        effects: ['blinds_enemies_with_light', 'grants_rightful_rule', 'scabbard_prevents_bleeding'],
      },
    },
  }),

  defineItem('trident_of_poseidon', 'Trident of the Sea God', 'equipment', {
    weight: 5.0,
    stackSize: 1,
    baseValue: 9000,
    rarity: 'legendary',
    traits: {
      weapon: {
        damage: 45,
        damageType: 'force',
        range: 3,
        attackSpeed: 0.8,
        durabilityLoss: 0,
        twoHanded: true,
        category: 'spear',
        attackType: 'melee',
        special: ['reach'],
      },
      magical: {
        magicType: 'water',
        effects: ['controls_water', 'creates_earthquakes', 'commands_sea_creatures'],
        spellPowerBonus: 50,
      },
    },
  }),
];

/**
 * All creative weapons combined
 */
export const ALL_CREATIVE_WEAPONS: ItemDefinition[] = [
  ...LIVING_WEAPONS,
  ...CONCEPTUAL_WEAPONS,
  ...MUSICAL_WEAPONS,
  ...TRICK_WEAPONS,
  ...ELEMENTAL_ODDITIES,
  ...CURSED_WEAPONS,
  ...WEIRD_SCIENCE_WEAPONS,
  ...IMPROVISED_WEAPONS,
  ...MYTHOLOGICAL_WEAPONS,
];
