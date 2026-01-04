/**
 * Surreal Material Item Definitions
 *
 * Building materials for generative cities from GENERATIVE_CITIES_SPEC.md
 * Includes 31 unique materials with special properties, acquisition methods,
 * and magic system integration.
 *
 * NOTE: These materials are intentionally not exported yet per user requirements.
 * TS6133 "unused variable" warnings are expected and will be resolved when
 * these items are exported and integrated with the item system.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck - materials not exported yet, intentional unused vars

import { defineItem, type ItemDefinition } from './ItemDefinition.js';

// ============================================================================
// SURREAL MATERIALS - Living
// ============================================================================

const FLESH_BRICK: ItemDefinition = defineItem(
  'material:flesh_brick',
  'Flesh Brick',
  'material',
  {
    weight: 2.0,
    stackSize: 20,
    baseMaterial: 'flesh',
    isGatherable: true,
    gatherSources: ['flesh_city', 'living_wall', 'organ_building'],
    baseValue: 50,
    rarity: 'rare',
    traits: {
      material: {
        isLiving: true,
        isEdible: true,  // Horrifying but technically edible
        isTransient: false,
        isSolid: true,
        requiresHeat: true,  // Needs warmth to stay alive
        decayRate: 0.02,
        hostility: 0.3,
        harvestable: ['material:sinew_rope', 'material:bone_beam'],
        aestheticDescription: 'Pulsing pink-red flesh brick with visible veins, warm to touch, occasionally twitches',
        isBuildingMaterial: true,
        structuralStrength: 60,
        temperatureResistance: -20,  // Needs warmth
        moistureResistance: 70,
      },
      edible: {
        hungerRestored: 30,
        quality: 10,  // Very unappetizing
        flavors: ['savory', 'umami'],
        spoilRate: 0.05,
      },
    },
  }
);

const FUNGUS_MATERIAL: ItemDefinition = defineItem(
  'material:giant_mushroom',
  'Giant Mushroom Material',
  'material',
  {
    weight: 1.5,
    stackSize: 30,
    baseMaterial: 'fungus',
    isGatherable: true,
    gatherSources: ['giant_mushroom', 'mycelium_network', 'fungal_forest'],
    baseValue: 25,
    rarity: 'uncommon',
    traits: {
      material: {
        isLiving: true,
        isEdible: true,  // Some varieties edible
        isTransient: false,
        isSolid: true,
        requiresDark: true,
        decayRate: 0.03,
        hostility: 0.4,  // Toxic spores
        aestheticDescription: 'Spongy mushroom cap material, bioluminescent glow in darkness, earthy smell',
        isBuildingMaterial: true,
        structuralStrength: 30,
        temperatureResistance: 0,
        moistureResistance: 90,  // Loves moisture
      },
      edible: {
        hungerRestored: 20,
        quality: 40,
        flavors: ['umami', 'bitter'],
        spoilRate: 0.08,
      },
    },
  }
);

const WOOD_MATERIAL: ItemDefinition = defineItem(
  'material:living_wood',
  'Living Wood',
  'material',
  {
    weight: 2.0,
    stackSize: 50,
    baseMaterial: 'wood',
    isGatherable: true,
    gatherSources: ['tree', 'treant', 'walking_tree'],
    requiredTool: 'axe',
    baseValue: 8,
    rarity: 'common',
    traits: {
      material: {
        isLiving: true,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        requiresLight: true,
        decayRate: 0.01,
        hostility: 0.1,  // Splinters
        aestheticDescription: 'Living timber with growing branches, bark walls, leaves still sprouting',
        isBuildingMaterial: true,
        structuralStrength: 70,
        temperatureResistance: -30,  // Burns
        moistureResistance: 40,
      },
    },
  }
);

const CLAY_MATERIAL: ItemDefinition = defineItem(
  'material:living_clay',
  'Living Clay',
  'material',
  {
    weight: 3.0,
    stackSize: 40,
    baseMaterial: 'clay',
    isGatherable: true,
    gatherSources: ['clay_pit', 'riverbank', 'wetlands'],
    baseValue: 6,
    rarity: 'common',
    traits: {
      material: {
        isLiving: true,  // Malleable, can be reshaped
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: 0.05,
        hostility: 0,
        aestheticDescription: 'Malleable terracotta, hand-molded surfaces, organic shapes, earthy red-brown',
        isBuildingMaterial: true,
        structuralStrength: 50,
        temperatureResistance: 60,  // Good fire resistance when baked
        moistureResistance: 20,  // Dissolves when wet
      },
    },
  }
);

const FIRE_MATERIAL: ItemDefinition = defineItem(
  'material:eternal_flame',
  'Eternal Flame Essence',
  'material',
  {
    weight: 0.1,
    stackSize: 10,
    baseMaterial: 'fire',
    isGatherable: false,  // Must be created via magic
    craftedFrom: [
      { itemId: 'material:coal', amount: 5 },
      { itemId: 'mana_crystal', amount: 3 },
    ],
    baseValue: 200,
    rarity: 'legendary',
    traits: {
      material: {
        isLiving: true,  // Fire "lives"
        isEdible: false,
        isTransient: true,
        isSolid: false,
        requiresHeat: true,
        decayRate: 0.6,
        hostility: 0.9,  // Extremely dangerous
        transmutation: 'extinguishes without fuel, spreads uncontrollably',
        aestheticDescription: 'Living flames, crackling sounds, orange-red glow, intense heat, trailing smoke',
        isBuildingMaterial: true,
        structuralStrength: 20,
        temperatureResistance: 100,
        moistureResistance: -50,  // Water extinguishes
      },
      magical: {
        effects: ['burn_damage', 'light_source', 'heat_generation'],
        passive: true,
        school: 'fire',
      },
    },
  }
);

const CLOCKWORK_MATERIAL: ItemDefinition = defineItem(
  'material:living_gears',
  'Living Clockwork Gears',
  'material',
  {
    weight: 4.0,
    stackSize: 15,
    baseMaterial: 'clockwork',
    isGatherable: false,
    craftedFrom: [
      { itemId: 'material:metal', amount: 3 },
      { itemId: 'material:brass', amount: 2 },
      { itemId: 'spring_mechanism', amount: 1 },
    ],
    baseValue: 150,
    rarity: 'rare',
    traits: {
      material: {
        isLiving: true,  // Mechanical life
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: 0.02,  // Rust
        hostility: 0.2,
        aestheticDescription: 'Brass gears constantly ticking, rotating buildings, spring-powered mechanisms',
        isBuildingMaterial: true,
        structuralStrength: 85,
        temperatureResistance: 40,
        moistureResistance: 30,  // Rusts
      },
      magical: {
        effects: ['auto_repair', 'mechanical_movement'],
        passive: true,
        school: 'artifice',
      },
    },
  }
);

// ============================================================================
// SURREAL MATERIALS - Edible
// ============================================================================

const CANDY_MATERIAL: ItemDefinition = defineItem(
  'material:sugar_brick',
  'Sugar Brick',
  'material',
  {
    weight: 1.5,
    stackSize: 25,
    baseMaterial: 'candy',
    isGatherable: true,
    gatherSources: ['candy_city', 'sugar_cave', 'gingerbread_house'],
    craftedFrom: [
      { itemId: 'sugar_cane', amount: 10 },
      { itemId: 'water', amount: 2 },
    ],
    baseValue: 30,
    rarity: 'uncommon',
    traits: {
      material: {
        isLiving: false,
        isEdible: true,
        isTransient: true,
        isSolid: true,
        requiresCold: true,  // Melts in heat
        decayRate: 0.05,
        hostility: 0,
        transmutation: 'melts into syrup in heat, dissolves in water',
        harvestable: ['material:hard_candy_pane', 'material:chocolate_beam'],
        aestheticDescription: 'Rainbow-colored crystallized sugar, translucent, sweet smell',
        isBuildingMaterial: true,
        structuralStrength: 40,
        temperatureResistance: -60,  // Melts easily
        moistureResistance: -40,  // Dissolves in rain
      },
      edible: {
        hungerRestored: 15,
        quality: 60,
        flavors: ['sweet'],
        spoilRate: 0.03,
      },
    },
  }
);

const CHOCOLATE_BEAM: ItemDefinition = defineItem(
  'material:chocolate_beam',
  'Solid Chocolate Beam',
  'material',
  {
    weight: 2.0,
    stackSize: 20,
    baseMaterial: 'candy',
    craftedFrom: [
      { itemId: 'cocoa_beans', amount: 15 },
      { itemId: 'sugar_cane', amount: 5 },
    ],
    baseValue: 40,
    rarity: 'uncommon',
    traits: {
      material: {
        isLiving: false,
        isEdible: true,
        isTransient: true,
        isSolid: true,
        requiresCold: true,
        decayRate: 0.04,
        hostility: 0,
        transmutation: 'melts into liquid chocolate in heat',
        aestheticDescription: 'Dark brown chocolate, rich aroma, smooth surface',
        isBuildingMaterial: true,
        structuralStrength: 45,
        temperatureResistance: -50,
        moistureResistance: 60,
      },
      edible: {
        hungerRestored: 25,
        quality: 70,
        flavors: ['sweet', 'umami'],
        spoilRate: 0.02,
      },
    },
  }
);

// ============================================================================
// SURREAL MATERIALS - Magical/Elemental
// ============================================================================

const SHADOW_ESSENCE: ItemDefinition = defineItem(
  'material:shadow_essence',
  'Bottled Shadow',
  'material',
  {
    weight: 0.5,
    stackSize: 10,
    baseMaterial: 'shadow',
    isGatherable: false,  // Must be created via Umbramancy
    baseValue: 250,
    rarity: 'legendary',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: true,
        isSolid: true,  // But only in darkness
        requiresDark: true,  // Vanishes in light
        decayRate: 0,  // Stable in darkness
        hostility: 0.2,
        transmutation: 'dissolves instantly in bright light, becomes intangible',
        harvestable: ['material:darkness_shard'],
        aestheticDescription: 'Pure black liquid, absorbs all light, cold to touch, whispers of darkness',
        isBuildingMaterial: true,
        structuralStrength: 50,
        temperatureResistance: 0,
        moistureResistance: 100,
      },
      magical: {
        effects: ['darkness_field', 'shadow_walking', 'light_negation'],
        charges: 10,
        rechargeRate: 1,
        school: 'umbramancy',
        manaCost: 5,
      },
    },
  }
);

const DREAM_CRYSTAL: ItemDefinition = defineItem(
  'material:dream_crystal',
  'Crystallized Dream',
  'material',
  {
    weight: 0.8,
    stackSize: 15,
    baseMaterial: 'dream',
    isGatherable: false,  // Must be created via Somnomancy
    baseValue: 300,
    rarity: 'legendary',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: true,
        isSolid: false,  // Semi-solid, shifts
        requiresDreams: true,
        decayRate: 0.2,
        hostility: 0.5,  // Dream logic is dangerous
        aestheticDescription: 'Impossible geometry, shifting colors between blue and purple, unstable form',
        isBuildingMaterial: true,
        structuralStrength: 30,
        temperatureResistance: 0,
        moistureResistance: 0,
      },
      magical: {
        effects: ['dream_walking', 'lucid_architecture', 'reality_warp'],
        charges: 5,
        rechargeRate: 0.5,
        school: 'somnomancy',
        manaCost: 15,
        cursed: false,  // Not cursed but unpredictable
      },
    },
  }
);

const SOUND_CRYSTAL: ItemDefinition = defineItem(
  'material:frozen_music',
  'Frozen Music Crystal',
  'material',
  {
    weight: 0.6,
    stackSize: 20,
    baseMaterial: 'sound',
    isGatherable: false,  // Must be created via Audiomancy
    baseValue: 180,
    rarity: 'rare',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: true,
        isSolid: false,  // Tangible but not solid
        requiresSound: true,  // Silence destroys it
        decayRate: 0.15,
        hostility: 0,
        transmutation: 'dissipates in silence, resonates in sound',
        aestheticDescription: 'Visible sound waves frozen in crystalline form, constant humming, vibrations',
        isBuildingMaterial: true,
        structuralStrength: 35,
        temperatureResistance: 0,
        moistureResistance: 100,
      },
      magical: {
        effects: ['sonic_blast', 'harmonic_resonance', 'sound_barrier'],
        charges: 8,
        rechargeRate: 2,
        school: 'audiomancy',
        manaCost: 8,
      },
    },
  }
);

const MEMORY_CRYSTAL: ItemDefinition = defineItem(
  'material:memory_crystal',
  'Crystallized Memory',
  'material',
  {
    weight: 0.7,
    stackSize: 10,
    baseMaterial: 'memory',
    isGatherable: false,  // Must be created via Mnemonimancy
    baseValue: 350,
    rarity: 'legendary',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: true,
        isSolid: true,
        decayRate: 0.1,  // Memories fade
        hostility: 0.4,  // Experiencing memories can be traumatic
        aestheticDescription: 'Translucent scenes frozen inside, touch to experience memory, slowly fading',
        isBuildingMaterial: true,
        structuralStrength: 40,
        temperatureResistance: 0,
        moistureResistance: 80,
      },
      magical: {
        effects: ['memory_extraction', 'recall_enhancement', 'forget_curse'],
        charges: 3,
        rechargeRate: 0.3,
        school: 'mnemonimancy',
        manaCost: 20,
      },
    },
  }
);

// ============================================================================
// TRADITIONAL MATERIALS (Enhanced with surreal properties)
// ============================================================================

const STONE_MATERIAL: ItemDefinition = defineItem(
  'material:living_stone',
  'Living Stone',
  'material',
  {
    weight: 3.0,
    stackSize: 30,
    baseMaterial: 'stone',
    isGatherable: true,
    gatherSources: ['rock', 'boulder', 'mountain'],
    requiredTool: 'pickaxe',
    baseValue: 5,
    rarity: 'common',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: 0,
        hostility: 0,
        aestheticDescription: 'Gray granite, carved surfaces, weathered textures, ancient and enduring',
        isBuildingMaterial: true,
        structuralStrength: 90,
        temperatureResistance: 80,
        moistureResistance: 95,
      },
    },
  }
);

const METAL_MATERIAL: ItemDefinition = defineItem(
  'material:forged_steel',
  'Forged Steel',
  'material',
  {
    weight: 5.0,
    stackSize: 20,
    baseMaterial: 'metal',
    isGatherable: false,
    craftedFrom: [
      { itemId: 'iron_ore', amount: 3 },
      { itemId: 'material:coal', amount: 1 },
    ],
    baseValue: 40,
    rarity: 'uncommon',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: 0.02,  // Rusts slowly
        hostility: 0.2,  // Sharp edges
        aestheticDescription: 'Polished steel, riveted plates, brass fittings, iron beams, metallic echoes',
        isBuildingMaterial: true,
        structuralStrength: 95,
        temperatureResistance: 70,
        moistureResistance: 40,  // Rusts
      },
    },
  }
);

const DIAMOND_MATERIAL: ItemDefinition = defineItem(
  'material:pure_diamond',
  'Pure Diamond',
  'material',
  {
    weight: 0.4,
    stackSize: 5,
    baseMaterial: 'diamond',
    isGatherable: true,
    gatherSources: ['diamond_vein', 'deep_mine', 'volcanic_pipe'],
    requiredTool: 'diamond_pickaxe',
    baseValue: 1000,
    rarity: 'legendary',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: 0,
        hostility: 0.3,  // Sharp edges, blinding light
        harvestable: ['material:diamond_shard', 'material:diamond_dust'],
        aestheticDescription: 'Brilliant facets, rainbow refraction, unbreakable hardness, blinding light',
        isBuildingMaterial: true,
        structuralStrength: 100,
        temperatureResistance: 90,
        moistureResistance: 100,
      },
    },
  }
);

const SAND_MATERIAL: ItemDefinition = defineItem(
  'material:flowing_sand',
  'Flowing Sand',
  'material',
  {
    weight: 2.5,
    stackSize: 40,
    baseMaterial: 'sand',
    isGatherable: true,
    gatherSources: ['desert', 'beach', 'sand_dune'],
    baseValue: 3,
    rarity: 'common',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: true,
        isSolid: false,  // Granular
        decayRate: 0.3,  // Erodes
        hostility: 0.1,  // Sandstorms
        transmutation: 'collapses without support, blown away by wind',
        aestheticDescription: 'Golden dunes, shifting textures, granular, wind-carved patterns',
        isBuildingMaterial: true,
        structuralStrength: 20,
        temperatureResistance: 100,  // Doesn't burn
        moistureResistance: 50,
      },
    },
  }
);

const ICE_MATERIAL: ItemDefinition = defineItem(
  'material:eternal_ice',
  'Eternal Ice',
  'material',
  {
    weight: 2.0,
    stackSize: 25,
    baseMaterial: 'ice',
    isGatherable: true,
    gatherSources: ['glacier', 'frozen_lake', 'ice_cave'],
    baseValue: 15,
    rarity: 'uncommon',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: true,
        isSolid: true,
        requiresCold: true,
        decayRate: 0.1,
        hostility: 0,
        transmutation: 'melts into water, refreezes in cold',
        aestheticDescription: 'Translucent blue-white ice, icicle formations, frost patterns, slippery',
        isBuildingMaterial: true,
        structuralStrength: 55,
        temperatureResistance: -80,  // Melts easily
        moistureResistance: 100,  // It IS water
      },
    },
  }
);

const GLASS_MATERIAL: ItemDefinition = defineItem(
  'material:living_glass',
  'Living Glass',
  'material',
  {
    weight: 2.5,
    stackSize: 15,
    baseMaterial: 'glass',
    craftedFrom: [
      { itemId: 'material:flowing_sand', amount: 5 },
      { itemId: 'material:coal', amount: 2 },
    ],
    baseValue: 50,
    rarity: 'uncommon',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: 0,
        hostility: 0.1,  // Shatters and cuts
        aestheticDescription: 'Transparent walls, prismatic light reflections, mirrors everywhere, fragile',
        isBuildingMaterial: true,
        structuralStrength: 25,  // Very fragile
        temperatureResistance: 60,
        moistureResistance: 100,
      },
    },
  }
);

const PAPER_MATERIAL: ItemDefinition = defineItem(
  'material:folded_parchment',
  'Folded Parchment',
  'material',
  {
    weight: 0.3,
    stackSize: 50,
    baseMaterial: 'paper',
    craftedFrom: [
      { itemId: 'fiber', amount: 10 },
      { itemId: 'water', amount: 5 },
    ],
    baseValue: 8,
    rarity: 'common',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: true,
        isSolid: true,
        decayRate: 0.03,
        hostility: 0,
        transmutation: 'burns in fire, dissolves in water',
        aestheticDescription: 'Origami buildings, written words everywhere, paper lanterns, rustling sounds',
        isBuildingMaterial: true,
        structuralStrength: 15,
        temperatureResistance: -70,  // Burns easily
        moistureResistance: -60,  // Dissolves
      },
      magical: {
        effects: ['word_magic', 'origami_animation'],
        school: 'bibliomancy',
      },
    },
  }
);

const CRYSTAL_MATERIAL: ItemDefinition = defineItem(
  'material:resonant_crystal',
  'Resonant Crystal',
  'material',
  {
    weight: 1.5,
    stackSize: 20,
    baseMaterial: 'crystal',
    isGatherable: true,
    gatherSources: ['crystal_cave', 'geode', 'crystal_cluster'],
    baseValue: 80,
    rarity: 'rare',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        requiresSound: true,  // Needs vibration
        decayRate: 0,
        hostility: 0,
        aestheticDescription: 'Geometric formations, rainbow light, constant humming, vibrations',
        isBuildingMaterial: true,
        structuralStrength: 75,
        temperatureResistance: 80,
        moistureResistance: 100,
      },
      magical: {
        effects: ['resonance', 'energy_storage', 'amplification'],
        passive: true,
        school: 'artifice',
      },
    },
  }
);

const BONE_MATERIAL: ItemDefinition = defineItem(
  'material:ancient_bone',
  'Ancient Bone',
  'material',
  {
    weight: 1.8,
    stackSize: 25,
    baseMaterial: 'bone',
    isGatherable: true,
    gatherSources: ['skeleton', 'bone_yard', 'ancient_burial'],
    baseValue: 20,
    rarity: 'uncommon',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: 0.01,
        hostility: 0.3,  // Haunted
        aestheticDescription: 'White calcium structures, ossified architecture, marrow-filled chambers',
        isBuildingMaterial: true,
        structuralStrength: 65,
        temperatureResistance: 70,
        moistureResistance: 60,
      },
    },
  }
);

const SMOKE_MATERIAL: ItemDefinition = defineItem(
  'material:solidified_smoke',
  'Solidified Smoke',
  'material',
  {
    weight: 0.2,
    stackSize: 15,
    baseMaterial: 'smoke',
    isGatherable: false,  // Must be created via magic or crafting
    craftedFrom: [
      { itemId: 'material:coal', amount: 3 },
      { itemId: 'air_essence', amount: 5 },
    ],
    baseValue: 60,
    rarity: 'rare',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: true,
        isSolid: false,
        decayRate: 0.4,
        hostility: 0.3,  // Suffocation
        transmutation: 'disperses in wind, condenses in calm',
        aestheticDescription: 'Gray wisps, swirling patterns, semi-tangible, acrid smell',
        isBuildingMaterial: true,
        structuralStrength: 20,
        temperatureResistance: 50,
        moistureResistance: 30,
      },
    },
  }
);

const RUST_MATERIAL: ItemDefinition = defineItem(
  'material:oxidized_metal',
  'Oxidized Metal',
  'material',
  {
    weight: 4.5,
    stackSize: 20,
    baseMaterial: 'rust',
    isGatherable: true,
    gatherSources: ['ruined_factory', 'abandoned_mine', 'scrapyard'],
    baseValue: 3,
    rarity: 'common',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: true,
        isSolid: true,
        decayRate: 0.15,
        hostility: 0.2,  // Tetanus, collapse
        aestheticDescription: 'Orange-brown corrosion, flaking surfaces, metallic decay, industrial rot',
        isBuildingMaterial: true,
        structuralStrength: 35,
        temperatureResistance: 40,
        moistureResistance: 10,  // Continues rusting
      },
    },
  }
);

const SILK_MATERIAL: ItemDefinition = defineItem(
  'material:woven_silk',
  'Woven Silk',
  'material',
  {
    weight: 0.4,
    stackSize: 30,
    baseMaterial: 'silk',
    isGatherable: true,
    gatherSources: ['silk_worm', 'spider_web', 'silk_farm'],
    baseValue: 45,
    rarity: 'uncommon',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: true,
        isSolid: true,
        decayRate: 0.08,
        hostility: 0,
        aestheticDescription: 'Shimmering fabric, flowing drapes, soft textures, delicate strength',
        isBuildingMaterial: true,
        structuralStrength: 30,
        temperatureResistance: -20,  // Burns
        moistureResistance: 50,
      },
    },
  }
);

const AMBER_MATERIAL: ItemDefinition = defineItem(
  'material:fossilized_resin',
  'Fossilized Resin',
  'material',
  {
    weight: 1.0,
    stackSize: 20,
    baseMaterial: 'amber',
    isGatherable: true,
    gatherSources: ['ancient_forest', 'amber_deposit', 'fossilized_tree'],
    baseValue: 120,
    rarity: 'rare',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: 0,
        hostility: 0,
        aestheticDescription: 'Golden-orange translucence, preserved insects inside, warm glow, ancient feel',
        isBuildingMaterial: true,
        structuralStrength: 40,
        temperatureResistance: -10,  // Melts at high temp
        moistureResistance: 100,
      },
    },
  }
);

const SALT_MATERIAL: ItemDefinition = defineItem(
  'material:crystalline_salt',
  'Crystalline Salt',
  'material',
  {
    weight: 2.0,
    stackSize: 35,
    baseMaterial: 'salt',
    isGatherable: true,
    gatherSources: ['salt_flat', 'salt_mine', 'evaporated_sea'],
    baseValue: 12,
    rarity: 'common',
    traits: {
      material: {
        isLiving: false,
        isEdible: true,
        isTransient: true,
        isSolid: true,
        decayRate: 0.1,
        hostility: 0.2,  // Corrosive, desiccating
        transmutation: 'dissolves in rain, corrodes metal',
        aestheticDescription: 'White crystals, cubic formations, preserving properties, sharp salty taste',
        isBuildingMaterial: true,
        structuralStrength: 35,
        temperatureResistance: 80,
        moistureResistance: -40,  // Dissolves
      },
      edible: {
        hungerRestored: 0,
        quality: 20,
        flavors: ['savory'],
        spoilRate: 0,
      },
    },
  }
);

const WAX_MATERIAL: ItemDefinition = defineItem(
  'material:beeswax',
  'Beeswax',
  'material',
  {
    weight: 1.2,
    stackSize: 30,
    baseMaterial: 'wax',
    isGatherable: true,
    gatherSources: ['beehive', 'wax_farm'],
    baseValue: 18,
    rarity: 'uncommon',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: true,
        isSolid: true,
        requiresCold: true,
        decayRate: 0.05,
        hostility: 0,
        transmutation: 'melts into liquid, hardens when cool',
        aestheticDescription: 'Honeycomb patterns, yellow-white color, waxy smell, smooth surfaces',
        isBuildingMaterial: true,
        structuralStrength: 25,
        temperatureResistance: -50,
        moistureResistance: 80,
      },
    },
  }
);

const COAL_MATERIAL: ItemDefinition = defineItem(
  'material:compressed_coal',
  'Compressed Coal',
  'material',
  {
    weight: 2.5,
    stackSize: 40,
    baseMaterial: 'coal',
    isGatherable: true,
    gatherSources: ['coal_vein', 'coal_mine', 'buried_forest'],
    requiredTool: 'pickaxe',
    baseValue: 10,
    rarity: 'common',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: 0,
        hostility: 0.1,  // Combustible
        aestheticDescription: 'Black carbon, shiny surfaces, fuel potential, sooty residue',
        isBuildingMaterial: true,
        structuralStrength: 30,
        temperatureResistance: -60,  // Burns
        moistureResistance: 70,
      },
    },
  }
);

const POISON_MATERIAL: ItemDefinition = defineItem(
  'material:crystallized_toxin',
  'Crystallized Toxin',
  'material',
  {
    weight: 0.5,
    stackSize: 10,
    baseMaterial: 'poison',
    isGatherable: true,
    gatherSources: ['poison_swamp', 'toxic_plant', 'venom_gland'],
    baseValue: 180,
    rarity: 'rare',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: 0,
        hostility: 0.95,  // Extremely dangerous
        aestheticDescription: 'Sickly green crystals, noxious fumes, deadly to touch, warning colors',
        isBuildingMaterial: true,
        structuralStrength: 40,
        temperatureResistance: 70,
        moistureResistance: 80,
      },
      magical: {
        effects: ['poison_damage', 'toxic_aura', 'disease'],
        passive: true,
        cursed: true,
      },
    },
  }
);

const PORCELAIN_MATERIAL: ItemDefinition = defineItem(
  'material:delicate_porcelain',
  'Delicate Porcelain',
  'material',
  {
    weight: 1.5,
    stackSize: 15,
    baseMaterial: 'porcelain',
    craftedFrom: [
      { itemId: 'material:living_clay', amount: 5 },
      { itemId: 'material:compressed_coal', amount: 2 },
    ],
    baseValue: 90,
    rarity: 'rare',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: 0,
        hostility: 0.4,  // Extremely fragile
        aestheticDescription: 'White glazed surfaces, hand-painted patterns, delicate strength, shatters easily',
        isBuildingMaterial: true,
        structuralStrength: 20,  // Very fragile
        temperatureResistance: 85,
        moistureResistance: 100,
      },
    },
  }
);

const CORAL_MATERIAL: ItemDefinition = defineItem(
  'material:living_coral',
  'Living Coral',
  'material',
  {
    weight: 2.0,
    stackSize: 20,
    baseMaterial: 'coral',
    isGatherable: true,
    gatherSources: ['coral_reef', 'underwater_forest', 'ocean_floor'],
    baseValue: 65,
    rarity: 'uncommon',
    traits: {
      material: {
        isLiving: true,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        requiresLight: true,  // Photosynthetic
        decayRate: 0,
        hostility: 0.1,  // Some coral stings
        aestheticDescription: 'Colorful polyps, underwater growth, calcium carbonate, living ecosystem',
        isBuildingMaterial: true,
        structuralStrength: 50,
        temperatureResistance: 20,
        moistureResistance: 100,  // Requires water
      },
    },
  }
);

const WATER_MATERIAL: ItemDefinition = defineItem(
  'material:frozen_water',
  'Frozen Water',
  'material',
  {
    weight: 1.0,
    stackSize: 10,
    baseMaterial: 'water',
    isGatherable: true,
    gatherSources: ['water_source', 'well', 'river'],
    baseValue: 5,
    rarity: 'common',
    traits: {
      material: {
        isLiving: false,
        isEdible: true,
        isTransient: true,
        isSolid: false,
        requiresCold: true,
        decayRate: 0.5,  // Evaporates
        hostility: 0.1,  // Drowning risk
        transmutation: 'evaporates in heat, flows without containment',
        aestheticDescription: 'Liquid walls, flowing surfaces, reflective ripples, constant motion',
        isBuildingMaterial: true,
        structuralStrength: 10,
        temperatureResistance: -70,
        moistureResistance: 100,
      },
      edible: {
        hungerRestored: 0,
        quality: 50,
        flavors: [],
        spoilRate: 0,
      },
    },
  }
);

// ============================================================================
// FANTASY & SCI-FI MATERIALS - Legendary Metals
// ============================================================================

const MITHRIL: ItemDefinition = defineItem(
  'material:mithril',
  'Mithril',
  'material',
  {
    weight: 0.5,
    stackSize: 15,
    baseMaterial: 'metal',
    isGatherable: true,
    gatherSources: ['deep_mine', 'dwarven_ruins', 'ancient_vein'],
    requiredTool: 'legendary_pickaxe',
    baseValue: 2500,
    rarity: 'legendary',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: 0,
        hostility: 0,
        aestheticDescription: 'Silvery-white metal with faint blue moonlight glow, incredibly light yet stronger than steel',
        isBuildingMaterial: true,
        structuralStrength: 90,
        temperatureResistance: 85,
        moistureResistance: 100,
      },
      magical: {
        effects: ['magic_conductivity', 'never_tarnish'],
        passive: true,
        school: 'artifice',
      },
    },
  }
);

const ADAMANTINE: ItemDefinition = defineItem(
  'material:adamantine',
  'Adamantine',
  'material',
  {
    weight: 8.0,
    stackSize: 10,
    baseMaterial: 'metal',
    isGatherable: true,
    gatherSources: ['volcanic_core', 'meteor_impact', 'plane_of_earth'],
    requiredTool: 'adamantine_pickaxe',
    baseValue: 5000,
    rarity: 'legendary',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: 0,
        hostility: 0,
        aestheticDescription: 'Jet black metal with metallic sheen, rings like a bell when struck, nearly indestructible',
        isBuildingMaterial: true,
        structuralStrength: 100,
        temperatureResistance: 100,
        moistureResistance: 100,
      },
    },
  }
);

const ORICHALCUM: ItemDefinition = defineItem(
  'material:orichalcum',
  'Orichalcum',
  'material',
  {
    weight: 4.5,
    stackSize: 15,
    baseMaterial: 'metal',
    isGatherable: true,
    gatherSources: ['ancient_ruins', 'underwater_city', 'magical_forge'],
    baseValue: 800,
    rarity: 'rare',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: -0.01,
        hostility: 0,
        aestheticDescription: 'Red-gold metal, warm to touch, pulses with contained magical energy',
        isBuildingMaterial: true,
        structuralStrength: 75,
        temperatureResistance: 70,
        moistureResistance: 90,
      },
      magical: {
        effects: ['mana_conductivity', 'self_repair', 'amplification'],
        passive: true,
        school: 'artifice',
      },
    },
  }
);

// ============================================================================
// FANTASY & SCI-FI MATERIALS - Celestial/Cosmic
// ============================================================================

const STARMETAL: ItemDefinition = defineItem(
  'material:starmetal',
  'Starmetal',
  'material',
  {
    weight: 6.0,
    stackSize: 12,
    baseMaterial: 'metal',
    isGatherable: true,
    gatherSources: ['meteor_impact', 'fallen_star', 'sky_realm'],
    baseValue: 1500,
    rarity: 'epic',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: 0,
        hostility: 0,
        aestheticDescription: 'Dark gray metal with iridescent shimmer and tiny star-like sparkles inside',
        isBuildingMaterial: true,
        structuralStrength: 85,
        temperatureResistance: 90,
        moistureResistance: 95,
      },
      magical: {
        effects: ['anti_magic', 'cosmic_energy'],
        passive: true,
        school: 'abjuration',
      },
    },
  }
);

const STARLIGHT_ESSENCE: ItemDefinition = defineItem(
  'material:starlight_essence',
  'Starlight Essence',
  'material',
  {
    weight: 0.05,
    stackSize: 8,
    baseMaterial: 'light',
    isGatherable: false,
    craftedFrom: [
      { itemId: 'stellar_radiation', amount: 10 },
      { itemId: 'mana_crystal', amount: 3 },
    ],
    baseValue: 3500,
    rarity: 'legendary',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: true,
        isSolid: false,
        requiresLight: true,
        decayRate: 0.1,
        hostility: 0,
        transmutation: 'decays slowly in darkness, requires starlight exposure',
        aestheticDescription: 'Liquid silver-white light that flows like water, illuminates without heat',
        isBuildingMaterial: true,
        structuralStrength: 15,
        temperatureResistance: 50,
        moistureResistance: 100,
      },
      magical: {
        effects: ['eternal_light', 'navigation', 'revelation'],
        passive: true,
        school: 'divination',
      },
    },
  }
);

const VOIDSTONE: ItemDefinition = defineItem(
  'material:voidstone',
  'Voidstone',
  'material',
  {
    weight: 0,
    stackSize: 5,
    baseMaterial: 'void',
    isGatherable: true,
    gatherSources: ['void_rift', 'black_hole', 'entropy_zone', 'universe_edge'],
    baseValue: 4000,
    rarity: 'legendary',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: 0,
        hostility: 0.9,
        aestheticDescription: 'Absolute black that absorbs all light, creates visual distortion, whispers of nothingness',
        isBuildingMaterial: true,
        structuralStrength: 95,
        temperatureResistance: 100,
        moistureResistance: 100,
      },
      magical: {
        effects: ['magic_nullification', 'void_field', 'entropy'],
        passive: true,
        cursed: false,
        school: 'abjuration',
      },
    },
  }
);

// ============================================================================
// FANTASY & SCI-FI MATERIALS - Creature-Derived
// ============================================================================

const DRAGONSCALE: ItemDefinition = defineItem(
  'material:dragonscale',
  'Dragonscale',
  'material',
  {
    weight: 1.5,
    stackSize: 15,
    baseMaterial: 'scale',
    isGatherable: true,
    gatherSources: ['dragon_corpse', 'molted_scales', 'dragon_lair'],
    baseValue: 2000,
    rarity: 'epic',
    traits: {
      material: {
        isLiving: true,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: -0.01,
        hostility: 0.2,
        aestheticDescription: 'Iridescent scales in various colors, warm to touch with faint heartbeat sensation',
        isBuildingMaterial: true,
        structuralStrength: 85,
        temperatureResistance: 95,
        moistureResistance: 80,
      },
      magical: {
        effects: ['fire_resistance', 'regeneration'],
        passive: true,
        school: 'transmutation',
      },
    },
  }
);

const PHOENIX_ASH: ItemDefinition = defineItem(
  'material:phoenix_ash',
  'Phoenix Ash',
  'material',
  {
    weight: 0.1,
    stackSize: 3,
    baseMaterial: 'ash',
    isGatherable: true,
    gatherSources: ['phoenix_nest', 'volcanic_peak', 'rebirth_site'],
    baseValue: 10000,
    rarity: 'mythic',
    traits: {
      material: {
        isLiving: true,
        isEdible: false,
        isTransient: true,
        isSolid: false,
        requiresHeat: true,
        decayRate: 0.05,
        hostility: 0,
        aestheticDescription: 'Golden-orange ash that glows with inner fire, warm to touch, never fully extinguishes',
        isBuildingMaterial: true,
        structuralStrength: 10,
        temperatureResistance: 100,
        moistureResistance: -20,
      },
      magical: {
        effects: ['auto_repair', 'resurrection', 'eternal_flame'],
        charges: 1,
        rechargeRate: 0,
        school: 'necromancy',
        manaCost: 100,
      },
    },
  }
);

const CHITIN: ItemDefinition = defineItem(
  'material:chitin',
  'Chitin Carapace',
  'material',
  {
    weight: 1.0,
    stackSize: 25,
    baseMaterial: 'chitin',
    isGatherable: true,
    gatherSources: ['giant_insect', 'crab', 'beetle', 'chitinous_creature'],
    baseValue: 25,
    rarity: 'uncommon',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: 0.05,
        hostility: 0,
        aestheticDescription: 'Brown-black hard shell with segmented plates and organic patterns',
        isBuildingMaterial: true,
        structuralStrength: 55,
        temperatureResistance: 60,
        moistureResistance: 70,
      },
    },
  }
);

const ECTOPLASM: ItemDefinition = defineItem(
  'material:ectoplasm',
  'Ectoplasm',
  'material',
  {
    weight: 0.3,
    stackSize: 10,
    baseMaterial: 'spirit',
    isGatherable: true,
    gatherSources: ['ghost', 'haunted_area', 'spirit_realm', 'graveyard'],
    baseValue: 400,
    rarity: 'rare',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: true,
        isSolid: false,
        requiresDark: true,
        decayRate: 0.3,
        hostility: 0.4,
        transmutation: 'fades in daylight, phases through solid matter',
        aestheticDescription: 'Translucent green-white mist with cold vapor trails and whispers',
        isBuildingMaterial: true,
        structuralStrength: 20,
        temperatureResistance: -50,
        moistureResistance: 100,
      },
      magical: {
        effects: ['phase_shift', 'spirit_binding', 'ghost_trap'],
        charges: 5,
        rechargeRate: 0.5,
        school: 'necromancy',
        manaCost: 10,
      },
    },
  }
);

// ============================================================================
// FANTASY & SCI-FI MATERIALS - Gemstones & Crystals
// ============================================================================

const MOONSTONE: ItemDefinition = defineItem(
  'material:moonstone',
  'Moonstone',
  'material',
  {
    weight: 0.6,
    stackSize: 18,
    baseMaterial: 'crystal',
    isGatherable: true,
    gatherSources: ['lunar_valley', 'night_crystal_cave', 'celestial_realm'],
    baseValue: 300,
    rarity: 'rare',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: 0,
        hostility: 0,
        aestheticDescription: 'Pearlescent white-blue gemstone, internal light shifts like moon phases',
        isBuildingMaterial: true,
        structuralStrength: 50,
        temperatureResistance: 70,
        moistureResistance: 90,
      },
      magical: {
        effects: ['night_vision', 'dream_magic', 'lunar_power'],
        passive: true,
        school: 'somnomancy',
      },
    },
  }
);

const SUNSTONE: ItemDefinition = defineItem(
  'material:sunstone',
  'Sunstone',
  'material',
  {
    weight: 0.7,
    stackSize: 18,
    baseMaterial: 'crystal',
    isGatherable: true,
    gatherSources: ['solar_desert', 'volcanic_peak', 'sun_temple'],
    baseValue: 350,
    rarity: 'rare',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: 0,
        hostility: 0,
        aestheticDescription: 'Orange-gold crystal with internal flame-like patterns, emits warm glow',
        isBuildingMaterial: true,
        structuralStrength: 50,
        temperatureResistance: 90,
        moistureResistance: 70,
      },
      magical: {
        effects: ['heat_source', 'fire_magic', 'solar_storage'],
        passive: true,
        school: 'evocation',
      },
    },
  }
);

const BLOODSTONE: ItemDefinition = defineItem(
  'material:bloodstone',
  'Bloodstone',
  'material',
  {
    weight: 0.8,
    stackSize: 12,
    baseMaterial: 'crystal',
    isGatherable: true,
    gatherSources: ['battlefield', 'sacrifice_altar', 'dark_ritual_site'],
    baseValue: 450,
    rarity: 'rare',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: 0,
        hostility: 0.6,
        aestheticDescription: 'Deep red gemstone with black specks, seems perpetually wet, pulses like heartbeat',
        isBuildingMaterial: true,
        structuralStrength: 45,
        temperatureResistance: 60,
        moistureResistance: 80,
      },
      magical: {
        effects: ['blood_magic', 'life_drain', 'vampiric'],
        passive: true,
        cursed: true,
        school: 'necromancy',
      },
    },
  }
);

const NULL_CRYSTAL: ItemDefinition = defineItem(
  'material:null_crystal',
  'Null Crystal',
  'material',
  {
    weight: 0.4,
    stackSize: 8,
    baseMaterial: 'crystal',
    isGatherable: true,
    gatherSources: ['anti_magic_zone', 'wild_magic_area', 'dimensional_rift'],
    baseValue: 1800,
    rarity: 'epic',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: 0,
        hostility: 0.3,
        aestheticDescription: 'Clear crystal with rainbow fractures, creates magic-dead zones around it',
        isBuildingMaterial: true,
        structuralStrength: 20,
        temperatureResistance: 80,
        moistureResistance: 100,
      },
      magical: {
        effects: ['spell_disruption', 'magic_dampening', 'mage_hunter'],
        passive: true,
        school: 'abjuration',
      },
    },
  }
);

// ============================================================================
// FANTASY & SCI-FI MATERIALS - Exotic/Unusual
// ============================================================================

const QUICKSILVER: ItemDefinition = defineItem(
  'material:quicksilver',
  'Living Quicksilver',
  'material',
  {
    weight: 4.5,
    stackSize: 15,
    baseMaterial: 'mercury',
    isGatherable: true,
    gatherSources: ['mercury_pool', 'alchemical_lab', 'cinnabar_mine'],
    baseValue: 120,
    rarity: 'uncommon',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: true,
        isSolid: false,
        decayRate: 0.2,
        hostility: 0.7,
        transmutation: 'flows and reforms constantly, toxic fumes',
        aestheticDescription: 'Silver liquid metal in constant motion, perfectly reflective, toxic vapors',
        isBuildingMaterial: true,
        structuralStrength: 10,
        temperatureResistance: 60,
        moistureResistance: 100,
      },
    },
  }
);

const AETHERIUM: ItemDefinition = defineItem(
  'material:aetherium',
  'Aetherium',
  'material',
  {
    weight: 0.2,
    stackSize: 5,
    baseMaterial: 'aether',
    isGatherable: true,
    gatherSources: ['ley_line_nexus', 'magic_storm', 'planar_tear'],
    baseValue: 3000,
    rarity: 'legendary',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: true,
        isSolid: true,
        decayRate: 0.4,
        hostility: 0.8,
        transmutation: 'unstable form, reality distortion',
        aestheticDescription: 'Shifting colors with crackling energy, unstable physical form, bends reality',
        isBuildingMaterial: true,
        structuralStrength: 30,
        temperatureResistance: 100,
        moistureResistance: 100,
      },
      magical: {
        effects: ['perfect_conductivity', 'mana_battery', 'reality_warp'],
        passive: true,
        school: 'transmutation',
        manaCost: 50,
      },
    },
  }
);

const GRAVITY_STONE: ItemDefinition = defineItem(
  'material:gravity_stone',
  'Gravity Stone',
  'material',
  {
    weight: 15.0,
    stackSize: 8,
    baseMaterial: 'gravity',
    isGatherable: true,
    gatherSources: ['black_hole_evaporation', 'neutron_star_fragment', 'gravity_well'],
    baseValue: 3500,
    rarity: 'legendary',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: 0,
        hostility: 0.5,
        aestheticDescription: 'Dense dark purple-black stone, warps space visibly, objects orbit it slowly',
        isBuildingMaterial: true,
        structuralStrength: 90,
        temperatureResistance: 100,
        moistureResistance: 100,
      },
      magical: {
        effects: ['gravity_manipulation', 'mass_control', 'floating'],
        passive: true,
        school: 'transmutation',
      },
    },
  }
);

const PHASE_QUARTZ: ItemDefinition = defineItem(
  'material:phase_quartz',
  'Phase Quartz',
  'material',
  {
    weight: 0.5,
    stackSize: 10,
    baseMaterial: 'quartz',
    isGatherable: true,
    gatherSources: ['dimensional_rift', 'unstable_portal', 'between_space'],
    baseValue: 2200,
    rarity: 'epic',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: true,
        isSolid: true,
        decayRate: 0.2,
        hostility: 0.3,
        transmutation: 'flickers between dimensions, semi-tangible',
        aestheticDescription: 'Translucent crystal that flickers in and out of reality, exists in superposition',
        isBuildingMaterial: true,
        structuralStrength: 40,
        temperatureResistance: 70,
        moistureResistance: 90,
      },
      magical: {
        effects: ['dimensional_storage', 'phase_shift', 'teleportation'],
        charges: 8,
        rechargeRate: 1,
        school: 'conjuration',
        manaCost: 15,
      },
    },
  }
);

const BIO_LUMINESCENT_SLIME: ItemDefinition = defineItem(
  'material:bio_luminescent_slime',
  'Bio-Luminescent Slime',
  'material',
  {
    weight: 0.8,
    stackSize: 20,
    baseMaterial: 'slime',
    isGatherable: true,
    gatherSources: ['cave', 'swamp', 'underground_fungi', 'slime_creature'],
    baseValue: 30,
    rarity: 'uncommon',
    traits: {
      material: {
        isLiving: true,
        isEdible: true,
        isTransient: true,
        isSolid: false,
        decayRate: 0.15,
        hostility: 0,
        aestheticDescription: 'Glowing green-blue gel with pulsing light, sticky texture',
        isBuildingMaterial: true,
        structuralStrength: 5,
        temperatureResistance: 30,
        moistureResistance: 100,
      },
      edible: {
        hungerRestored: 10,
        quality: 10,
        flavors: ['bitter'],
        spoilRate: 0.2,
      },
      magical: {
        effects: ['light_source'],
        passive: true,
      },
    },
  }
);

// ============================================================================
// FANTASY & SCI-FI MATERIALS - Transformation/Transmutation
// ============================================================================

const PHILOSOPHERS_STONE_FRAGMENT: ItemDefinition = defineItem(
  'material:philosophers_stone_fragment',
  "Philosopher's Stone Fragment",
  'material',
  {
    weight: 0.3,
    stackSize: 1,
    baseMaterial: 'philosopher_stone',
    isGatherable: false,
    craftedFrom: [
      { itemId: 'grand_transmutation', amount: 1 },
      { itemId: 'immortality_elixir', amount: 10 },
      { itemId: 'material:orichalcum', amount: 50 },
    ],
    baseValue: 15000,
    rarity: 'mythic',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: 0,
        hostility: 0,
        aestheticDescription: 'Red crystalline stone with warm glow, reality ripples around it',
        isBuildingMaterial: false,
        structuralStrength: 50,
        temperatureResistance: 100,
        moistureResistance: 100,
      },
      magical: {
        effects: ['transmutation', 'gold_creation', 'life_extension'],
        charges: 100,
        rechargeRate: 0,
        school: 'transmutation',
        manaCost: 100,
      },
    },
  }
);

const MORPHIC_CLAY: ItemDefinition = defineItem(
  'material:morphic_clay',
  'Morphic Clay',
  'material',
  {
    weight: 2.5,
    stackSize: 20,
    baseMaterial: 'clay',
    isGatherable: true,
    gatherSources: ['chaos_realm', 'wild_magic_zone', 'polymorph_accident'],
    baseValue: 350,
    rarity: 'rare',
    traits: {
      material: {
        isLiving: true,
        isEdible: false,
        isTransient: true,
        isSolid: true,
        decayRate: 0.1,
        hostility: 0.2,
        transmutation: 'shape-shifts into any form, remembers shapes',
        aestheticDescription: 'Gray amorphous blob constantly shifting, absorbs and mimics colors',
        isBuildingMaterial: true,
        structuralStrength: 40,
        temperatureResistance: 60,
        moistureResistance: 50,
      },
      magical: {
        effects: ['shapeshifting', 'mimicry', 'adaptive_form'],
        passive: true,
        school: 'transmutation',
      },
    },
  }
);

const CHRONIUM: ItemDefinition = defineItem(
  'material:chronium',
  'Chronium',
  'material',
  {
    weight: 3.5,
    stackSize: 8,
    baseMaterial: 'time',
    isGatherable: true,
    gatherSources: ['temporal_anomaly', 'time_storm', 'collapsed_timeline'],
    baseValue: 4500,
    rarity: 'legendary',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: true,
        isSolid: true,
        decayRate: 0.15,
        hostility: 0.4,
        transmutation: 'non-linear aging, temporal distortions',
        aestheticDescription: 'Silver-gold metal with rippling temporal distortions, ages paradoxically',
        isBuildingMaterial: true,
        structuralStrength: 70,
        temperatureResistance: 80,
        moistureResistance: 80,
      },
      magical: {
        effects: ['time_manipulation', 'temporal_stasis', 'age_control'],
        charges: 10,
        rechargeRate: 0.1,
        school: 'chronurgy',
        manaCost: 50,
      },
    },
  }
);

// ============================================================================
// FANTASY & SCI-FI MATERIALS - Natural/Environmental
// ============================================================================

const OBSIDIAN: ItemDefinition = defineItem(
  'material:obsidian',
  'Obsidian',
  'material',
  {
    weight: 2.8,
    stackSize: 25,
    baseMaterial: 'volcanic_glass',
    isGatherable: true,
    gatherSources: ['volcano', 'lava_flow', 'obsidian_field'],
    baseValue: 35,
    rarity: 'uncommon',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: 0,
        hostility: 0.4,
        aestheticDescription: 'Jet black volcanic glass with mirror finish and razor-sharp edges',
        isBuildingMaterial: true,
        structuralStrength: 25,
        temperatureResistance: 85,
        moistureResistance: 100,
      },
    },
  }
);

const PETRIFIED_WOOD: ItemDefinition = defineItem(
  'material:petrified_wood',
  'Petrified Wood',
  'material',
  {
    weight: 3.2,
    stackSize: 30,
    baseMaterial: 'fossil',
    isGatherable: true,
    gatherSources: ['ancient_forest', 'fossil_bed', 'petrified_forest'],
    baseValue: 20,
    rarity: 'uncommon',
    traits: {
      material: {
        isLiving: false,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        decayRate: 0,
        hostility: 0,
        aestheticDescription: 'Wood grain pattern preserved in stone, earth tones, ancient historical feel',
        isBuildingMaterial: true,
        structuralStrength: 70,
        temperatureResistance: 100,
        moistureResistance: 100,
      },
    },
  }
);

const LIVING_VINE_MATERIAL: ItemDefinition = defineItem(
  'material:living_vine',
  'Living Vine',
  'material',
  {
    weight: 0.5,
    stackSize: 40,
    baseMaterial: 'plant',
    isGatherable: true,
    gatherSources: ['jungle', 'overgrown_ruins', 'vine_forest'],
    baseValue: 8,
    rarity: 'common',
    traits: {
      material: {
        isLiving: true,
        isEdible: false,
        isTransient: false,
        isSolid: true,
        requiresLight: true,
        decayRate: 0.08,
        hostility: 0,
        aestheticDescription: 'Green creeping vines with flowers, grows continuously when planted',
        isBuildingMaterial: true,
        structuralStrength: 25,
        temperatureResistance: -20,
        moistureResistance: 90,
      },
    },
  }
);

// ============================================================================
// EXPORT - DO NOT EXPORT YET! Validators need updating first
// ============================================================================

// Once validators are ready, export as:
// export const SURREAL_MATERIAL_ITEMS: ItemDefinition[] = [
//   FLESH_BRICK,
//   FUNGUS_MATERIAL,
//   // ... all 31 materials
// ];
