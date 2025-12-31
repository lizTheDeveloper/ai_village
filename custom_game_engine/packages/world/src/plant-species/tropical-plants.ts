/**
 * Tropical Plants
 *
 * Everything grows too fast and too large. Vines with delusions of grandeur,
 * flowers that bloom continuously out of sheer competitive spite, spores that
 * treat "personal space" as a suggestion.
 */

import type { PlantSpecies } from '@ai-village/core';

// ============================================================================
// TROPICAL VINES & CLIMBERS
// ============================================================================

export const STRANGLER_VINE: PlantSpecies = {
  id: 'strangler_vine',
  name: 'Strangler Vine',
  scientificName: 'Ficus strangulatus',
  category: 'vine',
  description: 'Begins as epiphyte, ends as tree murderer. Wraps host tree, grows roots downward, eventually hollows out and replaces victim.',
  lore: 'Strangler vines are patient killers. They start polite—just a small plant growing on a branch. Decades later, the host tree is gone and the vine stands alone wearing its victim like a suit.',
  biomes: ['jungle', 'rainforest'],
  rarity: 'common',
  latitudeRange: [-30, 30],

  lifecycle: {
    stages: [
      {
        name: 'seed',
        duration: 30,
        growthConditions: { epiphytic: true, host_tree: true },
        description: 'Seed germinates in tree canopy'
      },
      {
        name: 'descending_roots',
        duration: 1825,
        growthConditions: { host_tree: true },
        description: 'Roots grow down to ground, branches wrap host'
      },
      {
        name: 'strangling',
        duration: 3650,
        harvestYield: { min: 10, max: 40 },
        description: 'Fully engulfs host tree'
      }
    ],
    maturityTime: 2555,
    optimalTemperatureRange: [22, 35],
    optimalMoistureRange: [75, 95],
    parasitic: true
  },

  baseGenetics: {
    yieldAmount: 25,
    growthRate: 2.0,
    diseaseResistance: 0.87
  ,
    droughtTolerance: 50,
    coldTolerance: 50,
    flavorProfile: 50},

  properties: {
    magical: {
      universeTypes: ['dark-fantasy', 'standard'],
      magicType: 'binding',
      potency: 0.7,
      stability: 0.7,
      effects: [
        {
          type: 'constriction',
          magnitude: 0.8,
          duration: 300,
          trigger: 'consume',
          description: 'Bind and immobilize targets'
        },
        {
          type: 'slow_absorption',
          magnitude: 0.6,
          duration: 480,
          trigger: 'ritual',
          description: 'Gradually drain life energy'
        }
      ],
      harvestConditions: { host_recently_killed: true },
      magicDecaysAfter: 14,
      preservationMethod: 'dry tightly coiled'
    },
    utility: {
      uses: ['rope', 'binding', 'construction'],
      durability: 0.9,
      flexibility: 0.8
    }
  },

  environmentalInteractions: {
    soilPreference: ['any'],
    companions: [],
    inhibits: ['host_trees'],
    specialProperties: ['parasitic', 'tree_killing', 'aerial_roots'],
    requiresHost: true
  },

  spriteMapping: {
    seed: 'items/seeds/seed_strangler_vine',
    seedling: 'plants/vines/strangler_vine_epiphyte',
    mature: 'plants/vines/strangler_vine_enveloping',
    harvest: 'items/herbs/strangler_vine'
  }
};

export const SERPENT_LIANA: PlantSpecies = {
  id: 'serpent_liana',
  name: 'Serpent Liana',
  scientificName: 'Ophiovine reptilans',
  category: 'vine',
  description: 'Thick vine that moves slowly when no one watches. Coils around branches like snake around prey.',
  lore: 'Serpent lianas don\'t actually move—that would be absurd. They just grow very strategically in directions that happen to surround wanderers. Coincidence. Probably.',
  biomes: ['jungle', 'rainforest'],
  rarity: 'uncommon',

  lifecycle: {
    stages: [
      {
        name: 'seedling',
        duration: 60,
        growthConditions: { jungle_floor: true, shade: 0.9 },
        description: 'Seeks nearest tree'
      },
      {
        name: 'climbing',
        duration: 365,
        growthConditions: { support: true },
        description: 'Rapidly ascends to canopy'
      },
      {
        name: 'mature',
        duration: 730,
        harvestYield: { min: 8, max: 24 },
        description: 'Thick serpentine vine'
      }
    ],
    maturityTime: 425,
    optimalTemperatureRange: [24, 34],
    optimalMoistureRange: [80, 95],
    perennial: true
  },

  baseGenetics: {
    yieldAmount: 16,
    growthRate: 2.75,
    diseaseResistance: 0.77
  ,
    droughtTolerance: 50,
    coldTolerance: 50,
    flavorProfile: 50},

  properties: {
    magical: {
      universeTypes: ['whimsical', 'dark-fantasy'],
      magicType: 'movement',
      potency: 0.6,
      stability: 0.5,
      effects: [
        {
          type: 'subtle_animation',
          magnitude: 0.7,
          duration: 360,
          trigger: 'ritual',
          description: 'Grant slight movement to plant matter'
        },
        {
          type: 'serpent_flexibility',
          magnitude: 0.8,
          duration: 240,
          trigger: 'consume',
          description: 'Extreme bodily flexibility'
        }
      ],
      harvestConditions: { vine_actively_coiling: true },
      magicDecaysAfter: 7,
      preservationMethod: 'keep coiled in spiral'
    }
  },

  environmentalInteractions: {
    soilPreference: ['jungle_floor'],
    companions: ['canopy_trees'],
    inhibits: [],
    specialProperties: ['thigmotropic', 'possibly_mobile', 'serpentine_growth']
  },

  spriteMapping: {
    seed: 'items/seeds/seed_serpent_liana',
    seedling: 'plants/vines/serpent_liana_young',
    mature: 'plants/vines/serpent_liana_coiled',
    harvest: 'items/herbs/serpent_liana'
  }
};

// ============================================================================
// TROPICAL FLOWERS & ORCHIDS
// ============================================================================

export const POISON_ORCHID: PlantSpecies = {
  id: 'poison_orchid',
  name: 'Poison Dart Orchid',
  scientificName: 'Dendrobium toxicus',
  category: 'flower',
  description: 'Brilliant flowers that secrete alkaloid toxins. Colors warn: I am beautiful, I am deadly, choose wisely.',
  lore: 'Indigenous hunters coat darts with poison orchid sap. The orchid didn\'t consent to becoming weaponized but also doesn\'t object. It just keeps being poisonous and beautiful simultaneously.',
  biomes: ['jungle', 'rainforest'],
  rarity: 'uncommon',
  latitudeRange: [-20, 20],

  lifecycle: {
    stages: [
      {
        name: 'seed',
        duration: 60,
        growthConditions: { tree_bark: true, high_humidity: true },
        description: 'Epiphytic seed attaches'
      },
      {
        name: 'growth',
        duration: 365,
        growthConditions: { epiphytic: true },
        description: 'Develops toxin production'
      },
      {
        name: 'blooming',
        duration: 30,
        harvestYield: { min: 2, max: 6 },
        description: 'Brilliant toxic flowers'
      }
    ],
    maturityTime: 425,
    optimalTemperatureRange: [20, 32],
    optimalMoistureRange: [75, 95],
    perennial: true
  },

  baseGenetics: {
    yieldAmount: 4,
    growthRate: 1.1,
    diseaseResistance: 0.82
  ,
    droughtTolerance: 50,
    coldTolerance: 50,
    flavorProfile: 50},

  properties: {
    magical: {
      universeTypes: ['high-magic', 'dark-fantasy'],
      magicType: 'poison',
      potency: 0.9,
      stability: 0.7,
      effects: [
        {
          type: 'contact_poison',
          magnitude: 0.8,
          duration: 0,
          trigger: 'touch',
          description: 'Paralytic toxin on skin contact'
        },
        {
          type: 'poison_immunity',
          magnitude: 0.7,
          duration: 480,
          trigger: 'careful_consumption',
          description: 'Gradual immunity to natural poisons'
        }
      ],
      harvestConditions: { wearing_protection: true },
      magicDecaysAfter: 30,
      preservationMethod: 'dry carefully, toxins remain active'
    },
    medicinal: {
      activeCompounds: ['batrachotoxin', 'orchid_alkaloids'],
      effects: [
        { condition: 'pain', efficacy: 0.9, preparation: 'tincture' }
      ],
      toxicity: 0.95,
      preparation: ['tincture'],
      warnings: 'EXTREMELY TOXIC - lethal in wrong doses'
    }
  },

  environmentalInteractions: {
    soilPreference: ['none'],
    companions: ['poison_dart_frogs'],
    inhibits: ['herbivores'],
    specialProperties: ['toxic', 'epiphytic', 'warning_coloration'],
    requiresHost: true
  },

  spriteMapping: {
    seed: 'items/seeds/seed_poison_orchid',
    seedling: 'plants/orchids/poison_orchid_young',
    mature: 'plants/orchids/poison_orchid_blooming',
    harvest: 'items/herbs/poison_orchid'
  }
};

export const DREAM_LOTUS: PlantSpecies = {
  id: 'dream_lotus',
  name: 'Dream Lotus',
  scientificName: 'Nymphaea somnifera',
  category: 'flower',
  description: 'Deep purple lotus that blooms at dusk. Pollen induces vivid, prophetic dreams.',
  lore: 'Dream lotus pollen makes you dream true—past, future, sideways. Shamans use it for vision quests. Accidental inhalation causes spontaneous prophecy, which is less useful than it sounds.',
  biomes: ['jungle', 'rainforest', 'wetland'],
  rarity: 'rare',
  latitudeRange: [-25, 25],

  lifecycle: {
    stages: [
      {
        name: 'seed',
        duration: 30,
        growthConditions: { warm_water: true, shade: 0.6 },
        description: 'Seeds sink in jungle pools'
      },
      {
        name: 'growth',
        duration: 90,
        growthConditions: { tropical_water: true },
        description: 'Pads rise to surface'
      },
      {
        name: 'blooming',
        duration: 14,
        harvestYield: { min: 1, max: 3 },
        description: 'Purple flowers release dream pollen'
      }
    ],
    maturityTime: 120,
    optimalTemperatureRange: [24, 32],
    optimalMoistureRange: [100, 100],
    requiresWater: true
  },

  baseGenetics: {
    yieldAmount: 2,
    growthRate: 1.3,
    diseaseResistance: 0.7
  ,
    droughtTolerance: 50,
    coldTolerance: 50,
    flavorProfile: 50},

  properties: {
    magical: {
      universeTypes: ['high-magic', 'whimsical', 'standard'],
      magicType: 'dream',
      potency: 0.9,
      stability: 0.4,
      effects: [
        {
          type: 'prophetic_dreams',
          magnitude: 0.8,
          duration: 480,
          trigger: 'inhale_pollen',
          description: 'Dreams reveal possible futures'
        },
        {
          type: 'lucid_dreaming',
          magnitude: 0.7,
          duration: 360,
          trigger: 'consume',
          description: 'Full control within dreams'
        },
        {
          type: 'waking_visions',
          magnitude: 0.6,
          duration: 120,
          trigger: 'overconsumption',
          description: 'Cannot distinguish dream from reality'
        }
      ],
      harvestConditions: { timeOfDay: 'dusk', blooming: true },
      magicDecaysAfter: 3,
      preservationMethod: 'nearly impossible—pollen loses potency rapidly'
    }
  },

  environmentalInteractions: {
    soilPreference: ['jungle_pool_bottom'],
    companions: ['tropical_fish'],
    inhibits: [],
    specialProperties: ['oneiromantic', 'pollen_psychoactive', 'dusk_blooming']
  },

  spriteMapping: {
    seed: 'items/seeds/seed_dream_lotus',
    seedling: 'plants/aquatic/dream_lotus_pads',
    mature: 'plants/aquatic/dream_lotus_blooming',
    harvest: 'items/herbs/dream_lotus'
  }
};

// ============================================================================
// TROPICAL FUNGI
// ============================================================================

export const LUMINOUS_TOADSTOOL: PlantSpecies = {
  id: 'luminous_toadstool',
  name: 'Luminous Toadstool',
  scientificName: 'Mycena illuminata',
  category: 'fungus',
  description: 'Glowing green mushrooms that light jungle floors at night. Bioluminescence strong enough to read by.',
  lore: 'Luminous toadstools turn jungle nights into fairy markets of green light. Practical uses: navigation, reading, existential wonder. Impractical side effects: attracting everything that likes light.',
  biomes: ['jungle', 'rainforest'],
  rarity: 'common',

  lifecycle: {
    stages: [
      {
        name: 'spore',
        duration: 14,
        growthConditions: { decaying_matter: true, humidity: 0.9 },
        description: 'Spores settle on rotting wood'
      },
      {
        name: 'mycelium',
        duration: 21,
        growthConditions: { darkness: 0.8 },
        description: 'Glowing threads spread'
      },
      {
        name: 'fruiting',
        duration: 7,
        harvestYield: { min: 3, max: 12 },
        description: 'Bright green glowing caps'
      }
    ],
    maturityTime: 35,
    optimalTemperatureRange: [22, 30],
    optimalMoistureRange: [85, 100],
    requiresDecay: true
  },

  baseGenetics: {
    yieldAmount: 7.5,
    growthRate: 2.0,
    diseaseResistance: 0.77
  ,
    droughtTolerance: 50,
    coldTolerance: 50,
    flavorProfile: 50},

  properties: {
    magical: {
      universeTypes: ['high-magic', 'whimsical', 'standard'],
      magicType: 'light',
      potency: 0.6,
      stability: 0.8,
      effects: [
        {
          type: 'bioluminescence',
          magnitude: 0.8,
          duration: 240,
          trigger: 'consume',
          description: 'Emit soft green glow'
        },
        {
          type: 'night_vision',
          magnitude: 0.6,
          duration: 180,
          trigger: 'consume',
          description: 'Enhanced vision in darkness'
        }
      ],
      harvestConditions: { timeOfDay: 'night', actively_glowing: true },
      magicDecaysAfter: 5,
      preservationMethod: 'dry in darkness, retains faint glow'
    },
    edible: {
      nutrition: 20,
      taste: 'mild, earthy',
      cookingRequired: true,
      shelfLife: 7
    }
  },

  environmentalInteractions: {
    soilPreference: ['rotting_wood', 'jungle_floor'],
    companions: ['decomposers'],
    inhibits: [],
    specialProperties: ['bioluminescent', 'decomposer', 'light_source']
  },

  spriteMapping: {
    seed: 'items/seeds/spore_luminous_toadstool',
    seedling: 'plants/fungi/luminous_toadstool_mycelium',
    mature: 'plants/fungi/luminous_toadstool_glowing',
    harvest: 'items/herbs/luminous_toadstool'
  }
};

export const FEVER_FUNGUS: PlantSpecies = {
  id: 'fever_fungus',
  name: 'Fever Fungus',
  scientificName: 'Ganoderma febrificus',
  category: 'fungus',
  description: 'Red bracket fungus that grows on jungle trees. Induces intense fever followed by immunity to tropical diseases.',
  lore: 'Fever fungus cures by making you wish you were dead first. Three days of hallucinating fever, then perfect health and immunity. Traditional healers use it. Modern medicine is horrified.',
  biomes: ['jungle', 'rainforest'],
  rarity: 'uncommon',

  lifecycle: {
    stages: [
      {
        name: 'colonization',
        duration: 90,
        growthConditions: { living_tree: true, wounds: true },
        description: 'Enters through tree wounds'
      },
      {
        name: 'bracket_formation',
        duration: 180,
        growthConditions: { tropical_tree: true },
        description: 'Red shelves emerge from bark'
      },
      {
        name: 'mature',
        duration: 365,
        harvestYield: { min: 2, max: 8 },
        description: 'Large red brackets'
      }
    ],
    maturityTime: 270,
    optimalTemperatureRange: [24, 34],
    optimalMoistureRange: [80, 95],
    perennial: true,
    requiresHost: true
  },

  baseGenetics: {
    yieldAmount: 5,
    growthRate: 0.95,
    diseaseResistance: 0.87
  ,
    droughtTolerance: 50,
    coldTolerance: 50,
    flavorProfile: 50},

  properties: {
    magical: {
      universeTypes: ['standard'],
      magicType: 'purification',
      potency: 0.7,
      stability: 0.6,
      effects: [
        {
          type: 'purging_fever',
          magnitude: 0.9,
          duration: 72,
          trigger: 'consume',
          description: 'Intense fever that burns out disease'
        },
        {
          type: 'disease_immunity',
          magnitude: 0.8,
          duration: 720,
          trigger: 'post_fever',
          description: 'Immunity to tropical diseases after recovery'
        }
      ],
      harvestConditions: { from_healthy_tree: false },
      magicDecaysAfter: 14,
      preservationMethod: 'dry thoroughly'
    },
    medicinal: {
      activeCompounds: ['pyrogenic_alkaloids', 'immune_modulators'],
      effects: [
        { condition: 'malaria', efficacy: 0.8, preparation: 'tea' },
        { condition: 'tropical_fever', efficacy: 0.9, preparation: 'tea' }
      ],
      toxicity: 0.6,
      preparation: ['tea', 'tincture'],
      warnings: 'Causes severe fever—use only under supervision'
    }
  },

  environmentalInteractions: {
    soilPreference: ['none'],
    companions: [],
    inhibits: [],
    specialProperties: ['parasitic', 'medicinal_ordeal', 'immune_training']
  },

  spriteMapping: {
    seed: 'items/seeds/spore_fever_fungus',
    seedling: 'plants/fungi/fever_fungus_colonizing',
    mature: 'plants/fungi/fever_fungus_brackets',
    harvest: 'items/herbs/fever_fungus'
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export const TROPICAL_PLANTS: PlantSpecies[] = [
  STRANGLER_VINE,
  SERPENT_LIANA,
  POISON_ORCHID,
  DREAM_LOTUS,
  LUMINOUS_TOADSTOOL,
  FEVER_FUNGUS
];
