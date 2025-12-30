import type { PlantSpecies } from '@ai-village/core';

/**
 * Magical plants with supernatural properties
 * These are universe-dependent and only appear/function in arcane/fantasy settings
 */

export const MOONPETAL: PlantSpecies = {
  id: 'moonpetal',
  name: 'Moonpetal',
  category: 'magical_herb',
  biomes: ['forest_ancient', 'meadow', 'hills'],
  rarity: 'rare',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 2,
      conditions: { minHydration: 30, minTemperature: 8, requiresFrost: true },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 3,
      conditions: { minHydration: 25 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 7,
      conditions: { minHydration: 25, minNutrition: 30 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'flowering',
      baseDuration: 5,
      conditions: { minHydration: 30, minLight: 20 },
      onTransition: [{ type: 'spawn_flowers', params: { count: '3-5' } }]
    },
    {
      from: 'flowering',
      to: 'fruiting',
      baseDuration: 3,
      conditions: { requiresPollination: false },
      onTransition: [{ type: 'flowers_become_fruit' }]
    },
    {
      from: 'fruiting',
      to: 'mature',
      baseDuration: 2,
      conditions: {},
      onTransition: [{ type: 'fruit_ripens' }, { type: 'produce_seeds' }]
    },
    {
      from: 'mature',
      to: 'seeding',
      baseDuration: 3,
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 3 } }]
    },
    {
      from: 'seeding',
      to: 'senescence',
      baseDuration: 2,
      conditions: {},
      onTransition: []
    },
    {
      from: 'senescence',
      to: 'decay',
      baseDuration: 1,
      conditions: {},
      onTransition: [{ type: 'return_nutrients_to_soil' }]
    },
    {
      from: 'decay',
      to: 'dead',
      baseDuration: 0.5,
      conditions: {},
      onTransition: [{ type: 'remove_plant' }]
    }
  ],

  baseGenetics: {
    growthRate: 0.5,
    yieldAmount: 0.6,
    diseaseResistance: 80,
    droughtTolerance: 40,
    coldTolerance: 85,
    flavorProfile: 90,
    mutations: []
  },

  seedsPerPlant: 5,
  seedDispersalRadius: 3,
  requiresDormancy: true,

  optimalTemperatureRange: [5, 18],
  optimalMoistureRange: [40, 70],
  preferredSeasons: ['spring', 'fall'],

  properties: {
    edible: true,
    nutritionValue: 10,
    taste: {
      sweet: 0.6,
      bitter: 0.1,
      sour: 0.0,
      savory: 0.0,
      spicy: 0.0,
      aromatic: 0.9
    },
    magical: {
      universeTypes: ['arcane', 'dream', 'hybrid'],
      magicType: 'divination',
      potency: 0.7,
      stability: 0.8,
      effects: [
        {
          type: 'night_vision',
          magnitude: 0.8,
          duration: 8,
          trigger: 'consume',
          description: 'Grants ability to see clearly in darkness'
        },
        {
          type: 'dream_clarity',
          magnitude: 0.5,
          duration: 24,
          trigger: 'consume',
          description: 'Dreams become vivid and sometimes prophetic'
        }
      ],
      harvestConditions: {
        moonPhase: 'full',
        timeOfDay: 'night'
      },
      magicDecaysAfter: 3,
      preservationMethod: 'store_in_moonlight'
    },
    crafting: {
      scent: {
        profile: 'silvery, cool, ethereal',
        intensity: 0.6,
        persistence: 8
      },
      dye: {
        color: 'silver',
        intensity: 0.7,
        permanence: 0.4
      }
    },
    environmental: {
      aura: {
        radius: 2,
        effect: 'faint_glow',
        magnitude: 0.3
      }
    },
    special: [
      { type: 'luminescent', color: 'pale_silver', intensity: 0.4 },
      { type: 'responsive', trigger: 'moonlight', response: 'petals_open' }
    ]
  },

  sprites: {
    seed: 'moonpetal-seed',
    sprout: 'moonpetal-sprout',
    vegetative: 'moonpetal-vegetative',
    flowering: 'moonpetal-flowering',
    fruiting: 'moonpetal-fruiting',
    mature: 'moonpetal-mature',
    seeding: 'moonpetal-seeding',
    withered: 'moonpetal-withered'
  }
};

export const SHADOWCAP: PlantSpecies = {
  id: 'shadowcap',
  name: 'Shadowcap Mushroom',
  category: 'fungus',
  biomes: ['forest_dense', 'cave_entrance', 'swamp'],
  rarity: 'uncommon',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 1,
      conditions: { minHydration: 50, maxTemperature: 18 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 2,
      conditions: { minHydration: 45 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 3,
      conditions: { minHydration: 50, maxTemperature: 20 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'flowering',
      baseDuration: 2,
      conditions: { minHydration: 55 },
      onTransition: [{ type: 'spawn_flowers', params: { count: '1-3' } }]
    },
    {
      from: 'flowering',
      to: 'fruiting',
      baseDuration: 1,
      conditions: {},
      onTransition: [{ type: 'flowers_become_fruit' }]
    },
    {
      from: 'fruiting',
      to: 'mature',
      baseDuration: 1,
      conditions: {},
      onTransition: [{ type: 'fruit_ripens' }, { type: 'produce_seeds' }]
    },
    {
      from: 'mature',
      to: 'seeding',
      baseDuration: 2,
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 4 } }]
    },
    {
      from: 'seeding',
      to: 'senescence',
      baseDuration: 1,
      conditions: {},
      onTransition: []
    },
    {
      from: 'senescence',
      to: 'decay',
      baseDuration: 0.5,
      conditions: {},
      onTransition: [{ type: 'return_nutrients_to_soil' }]
    },
    {
      from: 'decay',
      to: 'dead',
      baseDuration: 0.25,
      conditions: {},
      onTransition: [{ type: 'remove_plant' }]
    }
  ],

  baseGenetics: {
    growthRate: 1.2,
    yieldAmount: 0.8,
    diseaseResistance: 90,
    droughtTolerance: 20,
    coldTolerance: 65,
    flavorProfile: 40,
    mutations: []
  },

  seedsPerPlant: 100,
  seedDispersalRadius: 4,
  requiresDormancy: false,

  optimalTemperatureRange: [8, 18],
  optimalMoistureRange: [70, 95],
  preferredSeasons: ['fall', 'spring'],

  properties: {
    edible: true,
    nutritionValue: 20,
    toxic: true,
    toxicityLevel: 0.3,
    taste: {
      sweet: 0.0,
      bitter: 0.7,
      sour: 0.1,
      savory: 0.5,
      spicy: 0.0,
      aromatic: 0.3
    },
    medicinal: {
      treats: ['pain'],
      effectiveness: 0.9,
      preparation: ['raw', 'tea'],
      dosage: 'small',
      sideEffects: [
        { type: 'hallucination', chance: 0.5, severity: 'moderate' },
        { type: 'shadow_vision', chance: 0.3, severity: 'mild' }
      ],
      toxicIfOverused: true,
      toxicityThreshold: 2
    },
    magical: {
      universeTypes: ['arcane', 'dream', 'shadow'],
      magicType: 'shadow',
      potency: 0.8,
      stability: 0.3,
      effects: [
        {
          type: 'shadow_walk',
          magnitude: 0.6,
          duration: 1,
          trigger: 'consume',
          description: 'Allows passage through shadows, but risks losing oneself'
        },
        {
          type: 'darkness_vision',
          magnitude: 0.9,
          duration: 4,
          trigger: 'consume',
          description: 'See perfectly in absolute darkness'
        }
      ],
      harvestConditions: {
        timeOfDay: 'night'
      },
      magicDecaysAfter: 1,
      preservationMethod: 'store_in_shadow'
    },
    crafting: {
      poison: {
        type: 'soporific',
        potency: 0.6,
        onsetTime: 15,
        duration: 120
      }
    },
    special: [
      { type: 'luminescent', color: 'pale_purple', intensity: 0.2 }
    ]
  },

  sprites: {
    seed: 'shadowcap-seed',
    sprout: 'shadowcap-sprout',
    vegetative: 'shadowcap-vegetative',
    flowering: 'shadowcap-flowering',
    fruiting: 'shadowcap-fruiting',
    mature: 'shadowcap-mature',
    seeding: 'shadowcap-seeding',
    withered: 'shadowcap-withered'
  }
};

export const WHISPERLEAF: PlantSpecies = {
  id: 'whisperleaf',
  name: 'Whisperleaf',
  category: 'magical_herb',
  biomes: ['forest_ancient', 'grove_sacred'],
  rarity: 'rare',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 3,
      conditions: { minHydration: 35, minTemperature: 10 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 4,
      conditions: { minHydration: 30 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 8,
      conditions: { minHydration: 30, minNutrition: 35 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'flowering',
      baseDuration: 6,
      conditions: { minHydration: 35, minNutrition: 40 },
      onTransition: [{ type: 'spawn_flowers', params: { count: '5-8' } }]
    },
    {
      from: 'flowering',
      to: 'fruiting',
      baseDuration: 3,
      conditions: {},
      onTransition: [{ type: 'flowers_become_fruit' }]
    },
    {
      from: 'fruiting',
      to: 'mature',
      baseDuration: 2,
      conditions: {},
      onTransition: [{ type: 'fruit_ripens' }, { type: 'produce_seeds' }]
    },
    {
      from: 'mature',
      to: 'seeding',
      baseDuration: 4,
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 2 } }]
    },
    {
      from: 'seeding',
      to: 'senescence',
      baseDuration: 2,
      conditions: {},
      onTransition: []
    },
    {
      from: 'senescence',
      to: 'decay',
      baseDuration: 1,
      conditions: {},
      onTransition: [{ type: 'return_nutrients_to_soil' }]
    },
    {
      from: 'decay',
      to: 'dead',
      baseDuration: 0.5,
      conditions: {},
      onTransition: [{ type: 'remove_plant' }]
    }
  ],

  baseGenetics: {
    growthRate: 0.4,
    yieldAmount: 0.5,
    diseaseResistance: 85,
    droughtTolerance: 35,
    coldTolerance: 50,
    flavorProfile: 80,
    mutations: []
  },

  seedsPerPlant: 3,
  seedDispersalRadius: 2,
  requiresDormancy: false,

  optimalTemperatureRange: [12, 22],
  optimalMoistureRange: [50, 80],
  preferredSeasons: ['spring', 'summer'],

  properties: {
    edible: false,
    magical: {
      universeTypes: ['arcane', 'dream'],
      magicType: 'mind',
      potency: 0.7,
      stability: 0.6,
      effects: [
        {
          type: 'telepathy',
          magnitude: 0.5,
          duration: 2,
          trigger: 'consume',
          description: 'Allows hearing surface thoughts of nearby beings'
        },
        {
          type: 'memory_enhancement',
          magnitude: 0.4,
          duration: 8,
          trigger: 'consume',
          description: 'Temporarily improves memory recall'
        }
      ],
      harvestConditions: {
        timeOfDay: 'dawn',
        weather: 'fog'
      },
      magicDecaysAfter: 1,
      preservationMethod: 'seal_in_silence'
    },
    crafting: {
      scent: {
        profile: 'ethereal, slightly minty, with whispers',
        intensity: 0.4,
        persistence: 4
      }
    },
    environmental: {
      aura: {
        radius: 1,
        effect: 'faint_whispers',
        magnitude: 0.2
      }
    },
    special: [
      { type: 'responsive', trigger: 'voice', response: 'leaves_flutter' },
      { type: 'sentient', intelligence: 0.1, communication: 'emotional_impression' }
    ]
  },

  sprites: {
    seed: 'whisperleaf-seed',
    sprout: 'whisperleaf-sprout',
    vegetative: 'whisperleaf-vegetative',
    flowering: 'whisperleaf-flowering',
    fruiting: 'whisperleaf-fruiting',
    mature: 'whisperleaf-mature',
    seeding: 'whisperleaf-seeding',
    withered: 'whisperleaf-withered'
  }
};

export const SUNBURST_FLOWER: PlantSpecies = {
  id: 'sunburst_flower',
  name: 'Sunburst Flower',
  category: 'magical_herb',
  biomes: ['plains', 'meadow', 'hills'],
  rarity: 'uncommon',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 1,
      conditions: { minHydration: 25, minTemperature: 15, minLight: 60 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 2,
      conditions: { minHydration: 20, minLight: 50 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 4,
      conditions: { minHydration: 20, minNutrition: 25, minLight: 50 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'flowering',
      baseDuration: 3,
      conditions: { minHydration: 25, minLight: 70, season: ['summer'] },
      onTransition: [{ type: 'spawn_flowers', params: { count: '1-2' } }]
    },
    {
      from: 'flowering',
      to: 'fruiting',
      baseDuration: 2,
      conditions: { minLight: 50 },
      onTransition: [{ type: 'flowers_become_fruit' }]
    },
    {
      from: 'fruiting',
      to: 'mature',
      baseDuration: 1.5,
      conditions: {},
      onTransition: [{ type: 'fruit_ripens' }, { type: 'produce_seeds' }]
    },
    {
      from: 'mature',
      to: 'seeding',
      baseDuration: 2,
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 3 } }]
    },
    {
      from: 'seeding',
      to: 'senescence',
      baseDuration: 1,
      conditions: {},
      onTransition: []
    },
    {
      from: 'senescence',
      to: 'decay',
      baseDuration: 0.5,
      conditions: {},
      onTransition: [{ type: 'return_nutrients_to_soil' }]
    },
    {
      from: 'decay',
      to: 'dead',
      baseDuration: 0.25,
      conditions: {},
      onTransition: [{ type: 'remove_plant' }]
    }
  ],

  baseGenetics: {
    growthRate: 1.0,
    yieldAmount: 0.7,
    diseaseResistance: 70,
    droughtTolerance: 60,
    coldTolerance: 30,
    flavorProfile: 75,
    mutations: []
  },

  seedsPerPlant: 8,
  seedDispersalRadius: 3,
  requiresDormancy: false,

  optimalTemperatureRange: [18, 32],
  optimalMoistureRange: [30, 60],
  preferredSeasons: ['summer'],

  properties: {
    edible: true,
    nutritionValue: 15,
    taste: {
      sweet: 0.5,
      bitter: 0.0,
      sour: 0.1,
      savory: 0.0,
      spicy: 0.2,
      aromatic: 0.7
    },
    magical: {
      universeTypes: ['arcane', 'divine', 'hybrid'],
      magicType: 'light',
      potency: 0.6,
      stability: 0.9,
      effects: [
        {
          type: 'warmth_aura',
          magnitude: 0.5,
          duration: 6,
          trigger: 'consume',
          description: 'Body radiates gentle warmth, resisting cold'
        },
        {
          type: 'minor_healing',
          magnitude: 0.3,
          duration: 1,
          trigger: 'consume',
          description: 'Speeds minor wound healing slightly'
        }
      ],
      harvestConditions: {
        timeOfDay: 'day',
        weather: 'clear'
      },
      magicDecaysAfter: 5,
      preservationMethod: 'dry_in_sunlight'
    },
    medicinal: {
      treats: ['fatigue', 'cold'],
      effectiveness: 0.5,
      preparation: ['tea', 'raw'],
      dosage: 'medium',
      toxicIfOverused: false,
      synergiesWith: ['chamomile']
    },
    crafting: {
      dye: {
        color: 'golden_yellow',
        intensity: 0.9,
        permanence: 0.8
      }
    },
    environmental: {
      aura: {
        radius: 2,
        effect: 'warmth',
        magnitude: 0.3
      }
    },
    special: [
      { type: 'luminescent', color: 'golden', intensity: 0.5 },
      { type: 'responsive', trigger: 'sunlight', response: 'petals_track_sun' }
    ]
  },

  sprites: {
    seed: 'sunburst-seed',
    sprout: 'sunburst-sprout',
    vegetative: 'sunburst-vegetative',
    flowering: 'sunburst-flowering',
    fruiting: 'sunburst-fruiting',
    mature: 'sunburst-mature',
    seeding: 'sunburst-seeding',
    withered: 'sunburst-withered'
  }
};

export const FROSTBLOOM: PlantSpecies = {
  id: 'frostbloom',
  name: 'Frostbloom',
  category: 'magical_herb',
  biomes: ['mountains', 'tundra', 'frozen_lake'],
  rarity: 'rare',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 4,
      conditions: { minHydration: 20, maxTemperature: 5, requiresFrost: true },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 5,
      conditions: { minHydration: 15 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 10,
      conditions: { minHydration: 15, maxTemperature: 10 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'flowering',
      baseDuration: 7,
      conditions: { maxTemperature: 5, season: ['winter'] },
      onTransition: [{ type: 'spawn_flowers', params: { count: '1-3' } }]
    },
    {
      from: 'flowering',
      to: 'fruiting',
      baseDuration: 5,
      conditions: { maxTemperature: 8 },
      onTransition: [{ type: 'flowers_become_fruit' }]
    },
    {
      from: 'fruiting',
      to: 'mature',
      baseDuration: 3,
      conditions: {},
      onTransition: [{ type: 'fruit_ripens' }, { type: 'produce_seeds' }]
    },
    {
      from: 'mature',
      to: 'seeding',
      baseDuration: 5,
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 4 } }]
    },
    {
      from: 'seeding',
      to: 'senescence',
      baseDuration: 3,
      conditions: {},
      onTransition: []
    },
    {
      from: 'senescence',
      to: 'decay',
      baseDuration: 7,
      conditions: {},
      onTransition: [{ type: 'return_nutrients_to_soil' }]
    },
    {
      from: 'decay',
      to: 'dead',
      baseDuration: 5,
      conditions: {},
      onTransition: [{ type: 'remove_plant' }]
    }
  ],

  baseGenetics: {
    growthRate: 0.3,
    yieldAmount: 0.4,
    diseaseResistance: 95,
    droughtTolerance: 50,
    coldTolerance: 100,
    flavorProfile: 85,
    mutations: []
  },

  seedsPerPlant: 2,
  seedDispersalRadius: 4,
  requiresDormancy: true,

  optimalTemperatureRange: [-10, 5],
  optimalMoistureRange: [20, 50],
  preferredSeasons: ['winter'],

  properties: {
    edible: true,
    nutritionValue: 30,
    taste: {
      sweet: 0.3,
      bitter: 0.2,
      sour: 0.0,
      savory: 0.0,
      spicy: 0.0,
      aromatic: 0.5
    },
    magical: {
      universeTypes: ['arcane', 'elemental'],
      magicType: 'elemental',
      potency: 0.8,
      stability: 0.7,
      effects: [
        {
          type: 'cold_immunity',
          magnitude: 0.9,
          duration: 12,
          trigger: 'consume',
          description: 'Complete immunity to natural cold temperatures'
        },
        {
          type: 'ice_touch',
          magnitude: 0.4,
          duration: 4,
          trigger: 'consume',
          description: 'Touch can freeze small amounts of water'
        }
      ],
      harvestConditions: {
        weather: 'snow',
        moonPhase: 'full'
      },
      magicDecaysAfter: 7,
      preservationMethod: 'keep_frozen'
    },
    medicinal: {
      treats: ['fever', 'inflammation'],
      effectiveness: 0.7,
      preparation: ['raw', 'compress'],
      dosage: 'small',
      sideEffects: [
        { type: 'chills', chance: 0.2, severity: 'mild' }
      ],
      toxicIfOverused: false
    },
    environmental: {
      aura: {
        radius: 3,
        effect: 'cold_aura',
        magnitude: 0.5
      },
      weatherInteraction: {
        needsFrost: true
      }
    },
    special: [
      { type: 'luminescent', color: 'ice_blue', intensity: 0.6 },
      { type: 'phase_shifting', phases: ['solid', 'crystalline'] }
    ]
  },

  sprites: {
    seed: 'frostbloom-seed',
    sprout: 'frostbloom-sprout',
    vegetative: 'frostbloom-vegetative',
    flowering: 'frostbloom-flowering',
    fruiting: 'frostbloom-fruiting',
    mature: 'frostbloom-mature',
    seeding: 'frostbloom-seeding',
    withered: 'frostbloom-withered'
  }
};

export const MAGICAL_PLANTS = [MOONPETAL, SHADOWCAP, WHISPERLEAF, SUNBURST_FLOWER, FROSTBLOOM];
