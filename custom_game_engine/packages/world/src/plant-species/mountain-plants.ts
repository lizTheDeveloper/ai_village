/**
 * Mountain & Alpine Plants
 *
 * High altitude specialists that treat thin air and freezing temperatures
 * as minor inconveniences. Grow slow, live long, remember glaciers.
 */

import type { PlantSpecies } from '@ai-village/core';

// ============================================================================
// ALPINE FLOWERS
// ============================================================================

export const SKY_EDELWEISS: PlantSpecies = {
  id: 'sky_edelweiss',
  name: 'Sky Edelweiss',
  scientificName: 'Leontopodium caelestis',
  category: 'flower',
  description: 'Star-shaped white flowers that grow above cloudline. Petals feel like frozen silk.',
  lore: 'Climbers risk death for sky edelweiss—not for magic, just for beauty so pure it feels like proof of something. The flowers bloom in impossible places, indifferent to human yearning.',
  biomes: ['mountain', 'alpine'],
  rarity: 'rare',
  latitudeRange: [-90, 90],
  elevationRange: [2500, 4500],

  lifecycle: {
    stages: [
      {
        name: 'seed',
        duration: 180,
        growthConditions: { altitude: 'high', cold: true },
        description: 'Seeds overwinter in rock crevices'
      },
      {
        name: 'rosette',
        duration: 365,
        growthConditions: { uvHigh: true, thin_air: true },
        description: 'Low leaf cluster survives wind'
      },
      {
        name: 'flowering',
        duration: 14,
        harvestYield: { min: 1, max: 3 },
        description: 'White star flowers above clouds'
      }
    ],
    maturityTime: 545,
    optimalTemperatureRange: [-5, 15],
    optimalMoistureRange: [40, 65],
    perennial: true,
    lifespan: 20
  },

  baseGenetics: {
    yieldAmount: 2,
    growthRate: 0.4,
    diseaseResistance: 0.95
  ,
    droughtTolerance: 50,
    coldTolerance: 50,
    flavorProfile: 50},

  properties: {
    magical: {
      universeTypes: ['high-magic', 'standard', 'whimsical'],
      magicType: 'purity',
      potency: 0.8,
      stability: 0.9,
      effects: [
        {
          type: 'altitude_adaptation',
          magnitude: 0.9,
          duration: 480,
          trigger: 'consume',
          description: 'Breathe easily at any altitude'
        },
        {
          type: 'purity_aura',
          magnitude: 0.7,
          duration: 360,
          trigger: 'wear',
          description: 'Resist corruption and disease'
        },
        {
          type: 'cold_immunity',
          magnitude: 0.6,
          duration: 420,
          trigger: 'consume',
          description: 'Unaffected by natural cold'
        }
      ],
      harvestConditions: { altitude: 'above_clouds', season: 'summer' },
      magicDecaysAfter: 14,
      preservationMethod: 'press in snow, keep frozen'
    }
  },

  environmentalInteractions: {
    soilPreference: ['rocky', 'scree'],
    companions: ['lichen', 'alpine_moss'],
    inhibits: [],
    specialProperties: ['UV_resistant', 'wind_hardy', 'cold_adapted']
  },

  spriteMapping: {
    seed: 'items/seeds/seed_sky_edelweiss',
    seedling: 'plants/alpine/sky_edelweiss_rosette',
    mature: 'plants/alpine/sky_edelweiss_flowering',
    harvest: 'items/herbs/sky_edelweiss'
  }
};

export const AVALANCHE_LILY: PlantSpecies = {
  id: 'avalanche_lily',
  name: 'Avalanche Lily',
  scientificName: 'Erythronium avalanchae',
  category: 'flower',
  description: 'Yellow flowers that bloom through melting snow. Their emergence triggers small snowslides.',
  lore: 'Avalanche lilies don\'t cause avalanches—they just bloom when conditions are right for both flowers and falling snow. That these conditions coincide is either coincidence or cosmic joke.',
  biomes: ['mountain', 'alpine'],
  rarity: 'uncommon',
  elevationRange: [1800, 3500],

  lifecycle: {
    stages: [
      {
        name: 'bulb',
        duration: 240,
        growthConditions: { frozen: true, buried: true },
        description: 'Bulb dormant under snow'
      },
      {
        name: 'emergence',
        duration: 3,
        growthConditions: { snowmelt: true },
        description: 'Pushes through melting snow'
      },
      {
        name: 'flowering',
        duration: 7,
        harvestYield: { min: 1, max: 4 },
        description: 'Yellow flowers in fresh-melted ground'
      }
    ],
    maturityTime: 243,
    optimalTemperatureRange: [0, 10],
    optimalMoistureRange: [70, 90],
    perennial: true
  },

  baseGenetics: {
    yieldAmount: 2.5,
    growthRate: 2.8,
    diseaseResistance: 0.87
  ,
    droughtTolerance: 50,
    coldTolerance: 50,
    flavorProfile: 50},

  properties: {
    magical: {
      universeTypes: ['high-magic', 'whimsical'],
      magicType: 'timing',
      potency: 0.6,
      stability: 0.7,
      effects: [
        {
          type: 'perfect_timing',
          magnitude: 0.7,
          duration: 240,
          trigger: 'consume',
          description: 'Intuitive sense of optimal timing'
        },
        {
          type: 'rapid_thaw',
          magnitude: 0.6,
          duration: 180,
          trigger: 'ritual',
          description: 'Accelerate melting of ice and snow'
        }
      ],
      harvestConditions: { snowmelt: 'active', avalanche_risk: 'high' },
      magicDecaysAfter: 3,
      preservationMethod: 'freeze immediately after harvest'
    }
  },

  environmentalInteractions: {
    soilPreference: ['alpine_meadow', 'snowmelt_zone'],
    companions: ['early_spring_flowers'],
    inhibits: [],
    specialProperties: ['snowmelt_specialist', 'ephemeral', 'avalanche_indicator']
  },

  spriteMapping: {
    seed: 'items/seeds/bulb_avalanche_lily',
    seedling: 'plants/alpine/avalanche_lily_emerging',
    mature: 'plants/alpine/avalanche_lily_blooming',
    harvest: 'items/herbs/avalanche_lily'
  }
};

export const STONE_ORCHID: PlantSpecies = {
  id: 'stone_orchid',
  name: 'Stone Orchid',
  scientificName: 'Orchidaceae petrica',
  category: 'flower',
  description: 'Grows in vertical rock faces. Roots penetrate stone, flowers bloom sideways from cliff walls.',
  lore: 'Stone orchids are what happens when flowers refuse to acknowledge gravity as relevant. They grow perpendicular to sense, blooming from sheer rock like botanical graffiti.',
  biomes: ['mountain', 'cliff'],
  rarity: 'rare',
  elevationRange: [1000, 3000],

  lifecycle: {
    stages: [
      {
        name: 'seed',
        duration: 90,
        growthConditions: { vertical_surface: true, rock: true },
        description: 'Seeds lodge in rock cracks'
      },
      {
        name: 'root_establishment',
        duration: 365,
        growthConditions: { stone: true },
        description: 'Roots slowly penetrate rock'
      },
      {
        name: 'flowering',
        duration: 21,
        harvestYield: { min: 1, max: 3 },
        description: 'Exotic flowers from cliff face'
      }
    ],
    maturityTime: 455,
    optimalTemperatureRange: [5, 20],
    optimalMoistureRange: [45, 70],
    perennial: true,
    lifespan: 50
  },

  baseGenetics: {
    yieldAmount: 2,
    growthRate: 0.3,
    diseaseResistance: 0.92
  ,
    droughtTolerance: 50,
    coldTolerance: 50,
    flavorProfile: 50},

  properties: {
    magical: {
      universeTypes: ['high-magic', 'standard'],
      magicType: 'adhesion',
      potency: 0.8,
      stability: 0.8,
      effects: [
        {
          type: 'wall_walking',
          magnitude: 0.8,
          duration: 300,
          trigger: 'consume',
          description: 'Climb vertical surfaces like horizontal ground'
        },
        {
          type: 'stone_affinity',
          magnitude: 0.6,
          duration: 480,
          trigger: 'consume',
          description: 'Sense weaknesses in stone structures'
        }
      ],
      harvestConditions: { cliff_face: true, dangerous_climb: true },
      magicDecaysAfter: 7,
      preservationMethod: 'press between stone slabs'
    }
  },

  environmentalInteractions: {
    soilPreference: ['none'],
    companions: [],
    inhibits: [],
    specialProperties: ['lithophytic', 'gravity_defiant', 'rock_penetrating']
  },

  spriteMapping: {
    seed: 'items/seeds/seed_stone_orchid',
    seedling: 'plants/alpine/stone_orchid_rooting',
    mature: 'plants/alpine/stone_orchid_flowering',
    harvest: 'items/herbs/stone_orchid'
  }
};

// ============================================================================
// ALPINE HERBS & LICHENS
// ============================================================================

export const PEAK_SAGE: PlantSpecies = {
  id: 'peak_sage',
  name: 'Peak Sage',
  scientificName: 'Artemisia summitus',
  category: 'herb',
  description: 'Silvery aromatic herb that grows only at highest elevations. Leaves taste of altitude and clarity.',
  lore: 'Peak sage survives where oxygen fears to tread. Breathing is optional; growing is mandatory. The sage has its priorities sorted.',
  biomes: ['mountain', 'alpine'],
  rarity: 'uncommon',
  elevationRange: [2800, 4200],

  lifecycle: {
    stages: [
      {
        name: 'seed',
        duration: 180,
        growthConditions: { altitude: 'extreme', oxygen_low: true },
        description: 'Seeds wait for brief growing season'
      },
      {
        name: 'rosette',
        duration: 60,
        growthConditions: { cold: true, wind: 'constant' },
        description: 'Low silver leaves'
      },
      {
        name: 'mature',
        duration: 90,
        harvestYield: { min: 2, max: 6 },
        description: 'Aromatic alpine herb'
      }
    ],
    maturityTime: 240,
    optimalTemperatureRange: [-5, 12],
    optimalMoistureRange: [35, 60],
    perennial: true
  },

  baseGenetics: {
    yieldAmount: 4,
    growthRate: 0.5,
    diseaseResistance: 0.95
  ,
    droughtTolerance: 50,
    coldTolerance: 50,
    flavorProfile: 50},

  properties: {
    magical: {
      universeTypes: ['high-magic', 'standard'],
      magicType: 'clarity',
      potency: 0.7,
      stability: 0.9,
      effects: [
        {
          type: 'mental_clarity',
          magnitude: 0.8,
          duration: 360,
          trigger: 'consume',
          description: 'Thoughts become crystal clear'
        },
        {
          type: 'altitude_sickness_immunity',
          magnitude: 0.9,
          duration: 480,
          trigger: 'consume',
          description: 'No effects from high altitude'
        }
      ],
      harvestConditions: { altitude: 'peak', clear_sky: true },
      magicDecaysAfter: 14,
      preservationMethod: 'dry in mountain wind'
    },
    medicinal: {
      activeCompounds: ['artemisinin', 'altitude_alkaloid'],
      effects: [
        { condition: 'altitude_sickness', efficacy: 0.9, preparation: 'tea' },
        { condition: 'mental_fog', efficacy: 0.8, preparation: 'tea' }
      ],
      toxicity: 0.2,
      preparation: ['tea', 'tincture']
    }
  },

  environmentalInteractions: {
    soilPreference: ['rocky_alpine', 'scree'],
    companions: ['alpine_cushion_plants'],
    inhibits: [],
    specialProperties: ['extreme_altitude', 'aromatic', 'oxygen_efficient']
  },

  spriteMapping: {
    seed: 'items/seeds/seed_peak_sage',
    seedling: 'plants/alpine/peak_sage_rosette',
    mature: 'plants/alpine/peak_sage_mature',
    harvest: 'items/herbs/peak_sage'
  }
};

export const GLACIER_LICHEN: PlantSpecies = {
  id: 'glacier_lichen',
  name: 'Glacier Lichen',
  scientificName: 'Cladonia glacialis',
  category: 'lichen',
  description: 'Pale blue lichen that grows on glacier edges. Contains antifreeze compounds. May be partially mineral.',
  lore: 'Glacier lichen remembers ice ages. It grows one millimeter per decade and doesn\'t care about your hurry. Time is different when you\'re part fungus, part algae, part immortal.',
  biomes: ['mountain', 'alpine', 'tundra'],
  rarity: 'uncommon',
  elevationRange: [2000, 5000],

  lifecycle: {
    stages: [
      {
        name: 'spore',
        duration: 365,
        growthConditions: { glacial: true, freezing: true },
        description: 'Spores settle on ice-polished rock'
      },
      {
        name: 'colonization',
        duration: 1825,
        growthConditions: { subfreezing: true },
        description: 'Slow crust formation'
      },
      {
        name: 'mature',
        duration: 3650,
        harvestYield: { min: 1, max: 2 },
        description: 'Blue-white lichen carpet'
      }
    ],
    maturityTime: 2190,
    optimalTemperatureRange: [-15, 5],
    optimalMoistureRange: [40, 70],
    perennial: true,
    lifespan: 500
  },

  baseGenetics: {
    yieldAmount: 1.5,
    growthRate: 0.3,
    diseaseResistance: 1.0
  ,
    droughtTolerance: 50,
    coldTolerance: 50,
    flavorProfile: 50},

  properties: {
    magical: {
      universeTypes: ['high-magic', 'standard'],
      magicType: 'preservation',
      potency: 0.9,
      stability: 1.0,
      effects: [
        {
          type: 'antifreeze_blood',
          magnitude: 0.9,
          duration: 720,
          trigger: 'consume',
          description: 'Blood cannot freeze, survive extreme cold'
        },
        {
          type: 'time_dilation',
          magnitude: 0.5,
          duration: 480,
          trigger: 'meditate_with',
          description: 'Perceive time moving slower'
        },
        {
          type: 'preservation',
          magnitude: 0.8,
          duration: 0,
          trigger: 'apply',
          description: 'Preserve organic matter indefinitely'
        }
      ],
      harvestConditions: { glacier: true, winter: true },
      magicDecaysAfter: 365,
      preservationMethod: 'keep frozen, naturally preserves itself'
    }
  },

  environmentalInteractions: {
    soilPreference: ['rock', 'glacier_margin'],
    companions: [],
    inhibits: [],
    specialProperties: ['extremely_slow_growth', 'ancient', 'cold_adapted', 'time_marker']
  },

  spriteMapping: {
    seed: 'items/seeds/spore_glacier_lichen',
    seedling: 'plants/lichen/glacier_lichen_colonizing',
    mature: 'plants/lichen/glacier_lichen_mature',
    harvest: 'items/herbs/glacier_lichen'
  }
};

export const MOUNTAIN_THYME: PlantSpecies = {
  id: 'mountain_thyme',
  name: 'Mountain Thyme',
  scientificName: 'Thymus montanus',
  category: 'herb',
  description: 'Low-growing aromatic herb forming purple-flowered mats. Extremely fragrant when stepped on.',
  lore: 'Mountain thyme carpets high meadows with purple and scent. Goats eat it and their milk tastes of thyme. This is either ecosystem integration or flavor theft, depending on your perspective on goat milk.',
  biomes: ['mountain', 'alpine'],
  rarity: 'common',
  elevationRange: [1500, 3000],

  lifecycle: {
    stages: [
      {
        name: 'seed',
        duration: 30,
        growthConditions: { rocky: true, sunlight: 0.9 },
        description: 'Seeds germinate in rocky soil'
      },
      {
        name: 'mat_formation',
        duration: 60,
        growthConditions: { well_drained: true },
        description: 'Low creeping stems spread'
      },
      {
        name: 'flowering',
        duration: 21,
        harvestYield: { min: 4, max: 12 },
        description: 'Purple flower carpet'
      }
    ],
    maturityTime: 90,
    optimalTemperatureRange: [8, 22],
    optimalMoistureRange: [35, 60],
    perennial: true
  },

  baseGenetics: {
    yieldAmount: 8,
    growthRate: 0.9,
    diseaseResistance: 0.87
  ,
    droughtTolerance: 50,
    coldTolerance: 50,
    flavorProfile: 50},

  properties: {
    medicinal: {
      activeCompounds: ['thymol', 'carvacrol'],
      effects: [
        { condition: 'cough', efficacy: 0.8, preparation: 'tea' },
        { condition: 'infection', efficacy: 0.7, preparation: 'tincture' },
        { condition: 'indigestion', efficacy: 0.6, preparation: 'tea' }
      ],
      toxicity: 0.0,
      preparation: ['tea', 'tincture', 'salve', 'raw']
    },
    edible: {
      nutrition: 15,
      taste: 'aromatic, savory',
      cookingRequired: false,
      shelfLife: 180
    }
  },

  environmentalInteractions: {
    soilPreference: ['rocky', 'well_drained'],
    companions: ['alpine_flowers', 'pollinators'],
    inhibits: [],
    specialProperties: ['aromatic', 'ground_cover', 'trampling_releases_scent']
  },

  spriteMapping: {
    seed: 'items/seeds/seed_mountain_thyme',
    seedling: 'plants/herbs/mountain_thyme_young',
    mature: 'plants/herbs/mountain_thyme_mat',
    harvest: 'items/herbs/mountain_thyme'
  }
};

// ============================================================================
// HIGH ALTITUDE TREES & SHRUBS
// ============================================================================

export const WIND_PINE: PlantSpecies = {
  id: 'wind_pine',
  name: 'Wind Pine',
  scientificName: 'Pinus ventosus',
  category: 'tree',
  description: 'Twisted alpine pine shaped by constant wind. Branches all point same direction like frozen flags.',
  lore: 'Wind pines know the truth about permanence: nothing stands straight against wind forever. They bend, twist, survive. Flexibility is not weakness—it\'s the only strategy that works.',
  biomes: ['mountain', 'alpine'],
  rarity: 'common',
  elevationRange: [2000, 3500],

  lifecycle: {
    stages: [
      {
        name: 'seed',
        duration: 365,
        growthConditions: { cold: true, wind: 'constant' },
        description: 'Seeds overwinter in snow'
      },
      {
        name: 'sapling',
        duration: 1825,
        growthConditions: { short_summer: true },
        description: 'Young tree begins bending'
      },
      {
        name: 'mature',
        duration: 3650,
        harvestYield: { min: 10, max: 30 },
        description: 'Twisted tree shaped by wind'
      }
    ],
    maturityTime: 2190,
    optimalTemperatureRange: [-10, 15],
    optimalMoistureRange: [40, 70],
    perennial: true,
    lifespan: 400
  },

  baseGenetics: {
    yieldAmount: 20,
    growthRate: 0.3,
    diseaseResistance: 0.91
  ,
    droughtTolerance: 50,
    coldTolerance: 50,
    flavorProfile: 50},

  properties: {
    magical: {
      universeTypes: ['standard'],
      magicType: 'endurance',
      potency: 0.5,
      stability: 0.9,
      effects: [
        {
          type: 'wind_resistance',
          magnitude: 0.7,
          duration: 480,
          trigger: 'consume_resin',
          description: 'Stand firm against strong winds'
        },
        {
          type: 'flexibility',
          magnitude: 0.6,
          duration: 360,
          trigger: 'consume_resin',
          description: 'Bend without breaking under pressure'
        }
      ],
      harvestConditions: { wind: 'strong', winter: true },
      magicDecaysAfter: 30,
      preservationMethod: 'resin self-preserves'
    },
    utility: {
      uses: ['construction', 'resin', 'fire_starter'],
      durability: 0.9,
      flexibility: 0.6
    }
  },

  environmentalInteractions: {
    soilPreference: ['rocky_alpine', 'thin_soil'],
    companions: ['lichen', 'moss'],
    inhibits: [],
    specialProperties: ['wind_shaped', 'resinous', 'cold_hardy', 'directional_growth']
  },

  spriteMapping: {
    seed: 'items/seeds/seed_wind_pine',
    seedling: 'plants/trees/wind_pine_sapling',
    mature: 'plants/trees/wind_pine_twisted',
    harvest: 'items/herbs/wind_pine_resin'
  }
};

export const ECHO_MOSS: PlantSpecies = {
  id: 'echo_moss',
  name: 'Echo Moss',
  scientificName: 'Bryophyta resonantis',
  category: 'moss',
  description: 'Green moss that grows in mountain caves. Amplifies sounds, creating multiple echoes from single noises.',
  lore: 'Echo moss doesn\'t create echoes—caves do that. But echo moss makes them louder, longer, stranger. Acoustic properties become acoustic peculiarities. Caves become instruments, moss becomes amplifier.',
  biomes: ['mountain', 'cave'],
  rarity: 'uncommon',

  lifecycle: {
    stages: [
      {
        name: 'spore',
        duration: 60,
        growthConditions: { cave: true, damp: true },
        description: 'Spores settle on cave walls'
      },
      {
        name: 'colonization',
        duration: 180,
        growthConditions: { darkness: 0.8, humidity: 0.9 },
        description: 'Moss carpet spreads'
      },
      {
        name: 'mature',
        duration: 365,
        harvestYield: { min: 2, max: 6 },
        description: 'Thick resonant moss'
      }
    ],
    maturityTime: 240,
    optimalTemperatureRange: [2, 15],
    optimalMoistureRange: [80, 95],
    perennial: true
  },

  baseGenetics: {
    yieldAmount: 4,
    growthRate: 0.65,
    diseaseResistance: 0.95
  ,
    droughtTolerance: 50,
    coldTolerance: 50,
    flavorProfile: 50},

  properties: {
    magical: {
      universeTypes: ['high-magic', 'standard', 'whimsical'],
      magicType: 'sound',
      potency: 0.6,
      stability: 0.8,
      effects: [
        {
          type: 'voice_amplification',
          magnitude: 0.7,
          duration: 240,
          trigger: 'consume',
          description: 'Voice carries further, echoes longer'
        },
        {
          type: 'sonic_resonance',
          magnitude: 0.6,
          duration: 180,
          trigger: 'proximity',
          description: 'Enhance or dampen sounds in area'
        }
      ],
      harvestConditions: { cave: true, silence: true },
      magicDecaysAfter: 7,
      preservationMethod: 'keep in sealed quiet container'
    }
  },

  environmentalInteractions: {
    soilPreference: ['cave_wall', 'rock'],
    companions: [],
    inhibits: [],
    specialProperties: ['acoustic_amplification', 'echo_enhancement', 'cave_dwelling']
  },

  spriteMapping: {
    seed: 'items/seeds/spore_echo_moss',
    seedling: 'plants/moss/echo_moss_colonizing',
    mature: 'plants/moss/echo_moss_thick',
    harvest: 'items/herbs/echo_moss'
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export const MOUNTAIN_PLANTS: PlantSpecies[] = [
  SKY_EDELWEISS,
  AVALANCHE_LILY,
  STONE_ORCHID,
  PEAK_SAGE,
  GLACIER_LICHEN,
  MOUNTAIN_THYME,
  WIND_PINE,
  ECHO_MOSS
];
