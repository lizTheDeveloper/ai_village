import type { PlantSpecies } from '@ai-village/core';

/**
 * Medicinal plants with healing properties
 */

export const CHAMOMILE: PlantSpecies = {
  id: 'chamomile',
  name: 'Chamomile',
  category: 'herb',
  biomes: ['meadow', 'plains', 'grassland'],
  rarity: 'common',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 0.5,
      conditions: { minHydration: 25, minTemperature: 10 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 1,
      conditions: { minHydration: 20 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 2,
      conditions: { minHydration: 20, minNutrition: 20 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'flowering',
      baseDuration: 3,
      conditions: { minHydration: 25, minNutrition: 25 },
      onTransition: [{ type: 'spawn_flowers', params: { count: '8-15' } }]
    },
    {
      from: 'flowering',
      to: 'fruiting',
      baseDuration: 2,
      conditions: { minHydration: 20 },
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
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 2 } }]
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
    yieldAmount: 1.2,
    diseaseResistance: 60,
    droughtTolerance: 55,
    coldTolerance: 50,
    flavorProfile: 60,
    mutations: []
  },

  seedsPerPlant: 30,
  seedDispersalRadius: 2,
  requiresDormancy: false,

  optimalTemperatureRange: [12, 25],
  optimalMoistureRange: [40, 70],
  preferredSeasons: ['spring', 'summer'],

  properties: {
    edible: true,
    nutritionValue: 5,
    taste: {
      sweet: 0.3,
      bitter: 0.2,
      sour: 0.0,
      savory: 0.0,
      spicy: 0.0,
      aromatic: 0.8
    },
    medicinal: {
      treats: ['anxiety', 'insomnia', 'inflammation', 'nausea'],
      effectiveness: 0.6,
      preparation: ['tea', 'tincture'],
      dosage: 'medium',
      toxicIfOverused: false,
      synergiesWith: ['lavender', 'valerian', 'feverfew'],
      conflictsWith: []
    },
    crafting: {
      scent: {
        profile: 'sweet apple-like, calming floral',
        intensity: 0.7,
        persistence: 6
      }
    },
    environmental: {
      companionEffects: {
        benefitsNearby: ['cabbage', 'onion', 'cucumber'],
        repels: ['aphid']
      },
      soilEffects: {
        fertilityOnDecay: 5
      }
    }
  },

  sprites: {
    seed: 'chamomile-seed',
    sprout: 'chamomile-sprout',
    vegetative: 'chamomile-vegetative',
    flowering: 'chamomile-flowering',
    fruiting: 'chamomile-fruiting',
    mature: 'chamomile-mature',
    seeding: 'chamomile-seeding',
    withered: 'chamomile-withered'
  }
};

export const LAVENDER: PlantSpecies = {
  id: 'lavender',
  name: 'Lavender',
  category: 'herb',
  biomes: ['plains', 'hills', 'meadow'],
  rarity: 'common',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 1,
      conditions: { minHydration: 20, minTemperature: 12 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 2,
      conditions: { minHydration: 15 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 5,
      conditions: { minHydration: 15, minNutrition: 15 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'flowering',
      baseDuration: 7,
      conditions: { minHydration: 20, season: ['summer'] },
      onTransition: [{ type: 'spawn_flowers', params: { count: '20-40' } }]
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
      baseDuration: 3,
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 1 } }]
    },
    {
      from: 'seeding',
      to: 'vegetative',
      baseDuration: 5,
      conditions: { minHealth: 60 },
      onTransition: []
    },
    {
      from: 'seeding',
      to: 'senescence',
      baseDuration: 10,
      conditions: {},
      onTransition: []
    },
    {
      from: 'senescence',
      to: 'decay',
      baseDuration: 3,
      conditions: {},
      onTransition: [{ type: 'return_nutrients_to_soil' }]
    },
    {
      from: 'decay',
      to: 'dead',
      baseDuration: 2,
      conditions: {},
      onTransition: [{ type: 'remove_plant' }]
    }
  ],

  baseGenetics: {
    growthRate: 0.6,
    yieldAmount: 1.5,
    diseaseResistance: 70,
    droughtTolerance: 80,
    coldTolerance: 45,
    flavorProfile: 70,
    mutations: []
  },

  seedsPerPlant: 40,
  seedDispersalRadius: 1,
  requiresDormancy: false,

  optimalTemperatureRange: [15, 30],
  optimalMoistureRange: [20, 50],
  preferredSeasons: ['spring', 'summer'],

  properties: {
    edible: true,
    nutritionValue: 3,
    taste: {
      sweet: 0.2,
      bitter: 0.3,
      sour: 0.0,
      savory: 0.1,
      spicy: 0.1,
      aromatic: 0.9
    },
    medicinal: {
      treats: ['anxiety', 'insomnia', 'headache', 'pain'],
      effectiveness: 0.7,
      preparation: ['tea', 'oil', 'smoke'],
      dosage: 'small',
      sideEffects: [{ type: 'drowsiness', chance: 0.3, severity: 'mild' }],
      toxicIfOverused: false,
      synergiesWith: ['chamomile', 'valerian'],
      conflictsWith: []
    },
    crafting: {
      oil: {
        type: 'medicinal',
        yield: 0.1
      },
      scent: {
        profile: 'calming floral, slightly herbaceous',
        intensity: 0.9,
        persistence: 12
      },
      dye: {
        color: 'purple',
        intensity: 0.4,
        permanence: 0.5
      }
    },
    environmental: {
      aura: {
        radius: 2,
        effect: 'calming_scent',
        magnitude: 0.5
      },
      companionEffects: {
        repels: ['moth', 'flea', 'mosquito'],
        benefitsNearby: ['rose', 'sage']
      }
    }
  },

  sprites: {
    seed: 'lavender-seed',
    sprout: 'lavender-sprout',
    vegetative: 'lavender-vegetative',
    flowering: 'lavender-flowering',
    fruiting: 'lavender-fruiting',
    mature: 'lavender-mature',
    seeding: 'lavender-seeding',
    withered: 'lavender-withered'
  },

  harvestDestroysPlant: false,
  harvestResetStage: 'vegetative'
};

export const FEVERFEW: PlantSpecies = {
  id: 'feverfew',
  name: 'Feverfew',
  category: 'herb',
  biomes: ['meadow', 'forest_edge', 'plains'],
  rarity: 'uncommon',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 0.75,
      conditions: { minHydration: 25, minTemperature: 8 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 1.5,
      conditions: { minHydration: 20 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 3,
      conditions: { minHydration: 20, minNutrition: 25 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'flowering',
      baseDuration: 4,
      conditions: { minHydration: 25, minNutrition: 30 },
      onTransition: [{ type: 'spawn_flowers', params: { count: '10-20' } }]
    },
    {
      from: 'flowering',
      to: 'fruiting',
      baseDuration: 2,
      conditions: {},
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
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 2 } }]
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
      baseDuration: 0.75,
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
    growthRate: 0.9,
    yieldAmount: 1.0,
    diseaseResistance: 65,
    droughtTolerance: 50,
    coldTolerance: 55,
    flavorProfile: 40,
    mutations: []
  },

  seedsPerPlant: 25,
  seedDispersalRadius: 2,
  requiresDormancy: false,

  optimalTemperatureRange: [10, 22],
  optimalMoistureRange: [35, 65],
  preferredSeasons: ['spring', 'summer'],

  properties: {
    edible: true,
    nutritionValue: 2,
    taste: {
      sweet: 0.0,
      bitter: 0.7,
      sour: 0.1,
      savory: 0.0,
      spicy: 0.1,
      aromatic: 0.5
    },
    medicinal: {
      treats: ['fever', 'pain', 'inflammation', 'headache'],
      effectiveness: 0.75,
      preparation: ['tea', 'raw', 'tincture'],
      dosage: 'small',
      sideEffects: [
        { type: 'mouth_numbness', chance: 0.2, severity: 'mild' },
        { type: 'digestive_upset', chance: 0.1, severity: 'mild' }
      ],
      toxicIfOverused: true,
      toxicityThreshold: 5,
      synergiesWith: ['willow_bark', 'chamomile'],
      conflictsWith: ['blood_thinners']
    },
    environmental: {
      companionEffects: {
        repels: ['aphid', 'pest']
      }
    }
  },

  sprites: {
    seed: 'feverfew-seed',
    sprout: 'feverfew-sprout',
    vegetative: 'feverfew-vegetative',
    flowering: 'feverfew-flowering',
    fruiting: 'feverfew-fruiting',
    mature: 'feverfew-mature',
    seeding: 'feverfew-seeding',
    withered: 'feverfew-withered'
  }
};

export const VALERIAN: PlantSpecies = {
  id: 'valerian',
  name: 'Valerian',
  category: 'herb',
  biomes: ['forest_edge', 'meadow', 'riverside'],
  rarity: 'uncommon',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 1,
      conditions: { minHydration: 30, minTemperature: 5 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 2,
      conditions: { minHydration: 25 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 5,
      conditions: { minHydration: 30, minNutrition: 30 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'flowering',
      baseDuration: 7,
      conditions: { minHydration: 35, season: ['summer'] },
      onTransition: [{ type: 'spawn_flowers', params: { count: '30-50' } }]
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
      baseDuration: 3,
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 2 } }]
    },
    {
      from: 'seeding',
      to: 'vegetative',
      baseDuration: 10,
      conditions: { minHealth: 50 },
      onTransition: []
    },
    {
      from: 'seeding',
      to: 'senescence',
      baseDuration: 14,
      conditions: {},
      onTransition: []
    },
    {
      from: 'senescence',
      to: 'decay',
      baseDuration: 3,
      conditions: {},
      onTransition: [{ type: 'return_nutrients_to_soil' }]
    },
    {
      from: 'decay',
      to: 'dead',
      baseDuration: 2,
      conditions: {},
      onTransition: [{ type: 'remove_plant' }]
    }
  ],

  baseGenetics: {
    growthRate: 0.7,
    yieldAmount: 0.8,
    diseaseResistance: 55,
    droughtTolerance: 40,
    coldTolerance: 70,
    flavorProfile: 30,
    mutations: []
  },

  seedsPerPlant: 50,
  seedDispersalRadius: 3,
  requiresDormancy: true,

  optimalTemperatureRange: [8, 22],
  optimalMoistureRange: [50, 80],
  preferredSeasons: ['spring', 'summer', 'fall'],

  properties: {
    edible: false,
    taste: {
      sweet: 0.0,
      bitter: 0.8,
      sour: 0.0,
      savory: 0.2,
      spicy: 0.0,
      aromatic: 0.6
    },
    medicinal: {
      treats: ['insomnia', 'anxiety', 'pain'],
      effectiveness: 0.85,
      preparation: ['tea', 'tincture', 'powder'],
      dosage: 'medium',
      sideEffects: [
        { type: 'vivid_dreams', chance: 0.4, severity: 'mild' },
        { type: 'morning_grogginess', chance: 0.3, severity: 'mild' }
      ],
      toxicIfOverused: true,
      toxicityThreshold: 3,
      synergiesWith: ['chamomile', 'lavender', 'passionflower'],
      conflictsWith: ['alcohol', 'sedatives']
    },
    crafting: {
      scent: {
        profile: 'earthy, musky, unpleasant when dried',
        intensity: 0.8,
        persistence: 8
      }
    },
    environmental: {
      companionEffects: {
        attracts: ['cat', 'earthworm']
      },
      soilEffects: {
        fertilityOnDecay: 10
      }
    }
  },

  sprites: {
    seed: 'valerian-seed',
    sprout: 'valerian-sprout',
    vegetative: 'valerian-vegetative',
    flowering: 'valerian-flowering',
    fruiting: 'valerian-fruiting',
    mature: 'valerian-mature',
    seeding: 'valerian-seeding',
    withered: 'valerian-withered'
  },

  harvestDestroysPlant: false,
  harvestResetStage: 'vegetative'
};

export const WILLOW_BARK: PlantSpecies = {
  id: 'willow_bark',
  name: 'Willow',
  category: 'tree',
  biomes: ['riverside', 'swamp', 'meadow'],
  rarity: 'common',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 3,
      conditions: { minHydration: 40, minTemperature: 5 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 7,
      conditions: { minHydration: 35 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 14,
      conditions: { minHydration: 30 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'mature',
      baseDuration: 60,
      conditions: { minHydration: 25 },
      onTransition: []
    },
    {
      from: 'mature',
      to: 'seeding',
      baseDuration: 365,
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 8 } }]
    },
    {
      from: 'seeding',
      to: 'mature',
      baseDuration: 30,
      conditions: { minHealth: 20 },
      onTransition: []
    },
    {
      from: 'seeding',
      to: 'senescence',
      baseDuration: 730,
      conditions: {},
      onTransition: []
    },
    {
      from: 'senescence',
      to: 'decay',
      baseDuration: 60,
      conditions: {},
      onTransition: [{ type: 'return_nutrients_to_soil' }]
    },
    {
      from: 'decay',
      to: 'dead',
      baseDuration: 90,
      conditions: {},
      onTransition: [{ type: 'remove_plant' }]
    }
  ],

  baseGenetics: {
    growthRate: 0.5,
    yieldAmount: 2.0,
    diseaseResistance: 60,
    droughtTolerance: 30,
    coldTolerance: 75,
    flavorProfile: 20,
    mutations: []
  },

  seedsPerPlant: 200,
  seedDispersalRadius: 8,
  requiresDormancy: true,

  optimalTemperatureRange: [5, 25],
  optimalMoistureRange: [60, 95],
  preferredSeasons: ['spring', 'summer', 'fall'],

  properties: {
    edible: false,
    medicinal: {
      treats: ['pain', 'fever', 'inflammation', 'headache'],
      effectiveness: 0.8,
      preparation: ['tea', 'tincture', 'poultice'],
      dosage: 'medium',
      sideEffects: [
        { type: 'stomach_upset', chance: 0.2, severity: 'mild' }
      ],
      toxicIfOverused: true,
      toxicityThreshold: 4,
      synergiesWith: ['feverfew', 'meadowsweet'],
      conflictsWith: ['blood_thinners', 'aspirin']
    },
    crafting: {
      fiber: {
        strength: 0.5,
        flexibility: 0.9,
        waterResistance: 0.4
      },
      structural: {
        hardness: 0.3,
        flexibility: 0.8,
        waterResistance: 0.3,
        weight: 0.6
      }
    },
    environmental: {
      aura: {
        radius: 4,
        effect: 'moisture_retention',
        magnitude: 0.7
      },
      companionEffects: {
        benefitsNearby: ['mushroom', 'fern', 'moss']
      },
      soilEffects: {
        fertilityOnDecay: 20
      }
    }
  },

  sprites: {
    seed: 'willow-seed',
    sprout: 'willow-sprout',
    vegetative: 'willow-vegetative',
    flowering: 'willow-flowering',
    fruiting: 'willow-fruiting',
    mature: 'willow',
    seeding: 'willow',
    withered: 'willow-withered'
  },

  harvestDestroysPlant: false,
  harvestResetStage: 'vegetative'
};

export const MEDICINAL_PLANTS = [CHAMOMILE, LAVENDER, FEVERFEW, VALERIAN, WILLOW_BARK];
