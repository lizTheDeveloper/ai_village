import type { PlantSpecies } from '@ai-village/core';

/**
 * Wild plants that grow naturally in the world
 */

export const GRASS: PlantSpecies = {
  id: 'grass',
  name: 'Grass',
  category: 'grass',
  biomes: ['plains', 'grassland', 'forest'],
  rarity: 'common',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 0.25, // 6 hours for testing
      conditions: { minHydration: 20, minTemperature: 5 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 0.5, // 12 hours
      conditions: { minHydration: 15 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 0.75, // 18 hours
      conditions: { minHydration: 15 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'flowering',
      baseDuration: 0.5, // 12 hours
      conditions: { minHydration: 15 },
      onTransition: [{ type: 'spawn_flowers', params: { count: '2-4' } }]
    },
    {
      from: 'flowering',
      to: 'fruiting',
      baseDuration: 0.25, // 6 hours (grass doesn't really fruit, but keep lifecycle complete)
      conditions: {},
      onTransition: [{ type: 'flowers_become_fruit' }]
    },
    {
      from: 'fruiting',
      to: 'mature',
      baseDuration: 0.5, // 12 hours
      conditions: {},
      onTransition: [{ type: 'fruit_ripens' }, { type: 'produce_seeds' }]
    },
    {
      from: 'mature',
      to: 'seeding',
      baseDuration: 0.5, // 12 hours
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 3 } }]
    },
    {
      from: 'seeding',
      to: 'senescence',
      baseDuration: 0.5, // 12 hours
      conditions: {},
      onTransition: []
    },
    {
      from: 'senescence',
      to: 'decay',
      baseDuration: 0.25, // 6 hours
      conditions: {},
      onTransition: [{ type: 'return_nutrients_to_soil' }]
    },
    {
      from: 'decay',
      to: 'dead',
      baseDuration: 0.25, // 6 hours
      conditions: {},
      onTransition: [{ type: 'remove_plant' }]
    }
  ],

  baseGenetics: {
    growthRate: 1.5,
    yieldAmount: 0.5,
    diseaseResistance: 60,
    droughtTolerance: 70,
    coldTolerance: 70,
    flavorProfile: 20,
    mutations: []
  },

  seedsPerPlant: 50,
  seedDispersalRadius: 3,
  requiresDormancy: false,

  optimalTemperatureRange: [5, 30],
  optimalMoistureRange: [30, 80],
  preferredSeasons: ['spring', 'summer', 'fall'],

  properties: {},

  sprites: {
    seed: 'grass-seed',
    sprout: 'grass-sprout',
    vegetative: 'grass-vegetative',
    flowering: 'grass-flowering',
    fruiting: 'grass-fruiting',
    mature: 'grass-mature',
    seeding: 'grass-seeding',
    withered: 'grass-withered'
  }
};

export const WILDFLOWER: PlantSpecies = {
  id: 'wildflower',
  name: 'Wildflower',
  category: 'flower',
  biomes: ['plains', 'grassland'],
  rarity: 'common',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 0.5, // 12 hours for testing
      conditions: { minHydration: 25, minTemperature: 8, minNutrition: 15 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 0.75, // 18 hours
      conditions: { minHydration: 20 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 1, // 1 day
      conditions: { minHydration: 20, minNutrition: 20 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'flowering',
      baseDuration: 1.5, // 1.5 days
      conditions: { minHydration: 25, minNutrition: 25 },
      onTransition: [{ type: 'spawn_flowers', params: { count: '3-6' } }]
    },
    {
      from: 'flowering',
      to: 'fruiting',
      baseDuration: 1, // 1 day
      conditions: { minHydration: 20 },
      onTransition: [{ type: 'flowers_become_fruit' }]
    },
    {
      from: 'fruiting',
      to: 'mature',
      baseDuration: 1, // 1 day
      conditions: {},
      onTransition: [{ type: 'fruit_ripens' }, { type: 'produce_seeds' }]
    },
    {
      from: 'mature',
      to: 'seeding',
      baseDuration: 1, // 1 day
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 2 } }]
    },
    {
      from: 'seeding',
      to: 'senescence',
      baseDuration: 0.75, // 18 hours
      conditions: {},
      onTransition: []
    },
    {
      from: 'senescence',
      to: 'decay',
      baseDuration: 0.5, // 12 hours
      conditions: {},
      onTransition: [{ type: 'return_nutrients_to_soil' }]
    },
    {
      from: 'decay',
      to: 'dead',
      baseDuration: 0.25, // 6 hours
      conditions: {},
      onTransition: [{ type: 'remove_plant' }]
    }
  ],

  baseGenetics: {
    growthRate: 1.2,
    yieldAmount: 0.8,
    diseaseResistance: 55,
    droughtTolerance: 50,
    coldTolerance: 45,
    flavorProfile: 30,
    mutations: []
  },

  seedsPerPlant: 25,
  seedDispersalRadius: 2,
  requiresDormancy: false,

  optimalTemperatureRange: [10, 25],
  optimalMoistureRange: [35, 70],
  preferredSeasons: ['spring', 'summer'],

  properties: {
    crafting: {
      dye: {
        color: 'yellow',
        intensity: 0.6,
        permanence: 0.7
      },
      scent: {
        profile: 'light floral, honey-like',
        intensity: 0.5,
        persistence: 4
      }
    },
    environmental: {
      companionEffects: {
        attracts: ['bee', 'butterfly'],
        benefitsNearby: ['blueberry-bush', 'raspberry-bush', 'blackberry-bush', 'tomato']
      },
      soilEffects: {
        nitrogenFixer: false,
        fertilityOnDecay: 5
      }
    }
  },

  sprites: {
    seed: 'wildflower-seed',
    sprout: 'wildflower-sprout',
    vegetative: 'wildflower-vegetative',
    flowering: 'wildflower-flowering',
    fruiting: 'wildflower-fruiting',
    mature: 'wildflower-mature',
    seeding: 'wildflower-seeding',
    withered: 'wildflower-withered'
  }
};

export const BLUEBERRY_BUSH: PlantSpecies = {
  id: 'blueberry-bush',
  name: 'Blueberry Bush',
  category: 'herb',
  biomes: ['forest', 'grassland'],
  rarity: 'uncommon',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 0.75, // 18 hours for testing
      conditions: { minHydration: 30, minTemperature: 10, minNutrition: 25 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 1, // 1 day
      conditions: { minHydration: 25 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 2, // 2 days
      conditions: { minHydration: 25, minNutrition: 30 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'flowering',
      baseDuration: 2, // 2 days
      conditions: { minHydration: 30, minNutrition: 35 },
      onTransition: [{ type: 'spawn_flowers', params: { count: '6-12' } }]
    },
    {
      from: 'flowering',
      to: 'fruiting',
      baseDuration: 1.5, // 1.5 days
      conditions: { minHydration: 25 },
      onTransition: [{ type: 'flowers_become_fruit' }]
    },
    {
      from: 'fruiting',
      to: 'mature',
      baseDuration: 2, // 2 days
      conditions: { minHydration: 25 },
      onTransition: [{ type: 'fruit_ripens' }, { type: 'produce_seeds' }]
    },
    {
      from: 'mature',
      to: 'seeding',
      baseDuration: 1, // 1 day
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 2 } }]
    },
    {
      from: 'seeding',
      to: 'vegetative',
      baseDuration: 1.5, // 1.5 days (perennial cycle back)
      conditions: { minHealth: 50 }, // Only if healthy enough
      onTransition: []
    },
    {
      from: 'seeding',
      to: 'senescence',
      baseDuration: 2, // 2 days (if health < 50, plant starts dying)
      conditions: {},
      onTransition: []
    },
    {
      from: 'senescence',
      to: 'decay',
      baseDuration: 1, // 1 day
      conditions: {},
      onTransition: [{ type: 'return_nutrients_to_soil' }]
    },
    {
      from: 'decay',
      to: 'dead',
      baseDuration: 0.5, // 12 hours
      conditions: {},
      onTransition: [{ type: 'remove_plant' }]
    }
  ],

  baseGenetics: {
    growthRate: 0.7,
    yieldAmount: 1.3,
    diseaseResistance: 65,
    droughtTolerance: 55,
    coldTolerance: 60,
    flavorProfile: 80,
    mutations: []
  },

  seedsPerPlant: 10,
  seedDispersalRadius: 2,
  requiresDormancy: true,

  optimalTemperatureRange: [12, 22],
  optimalMoistureRange: [40, 75],
  preferredSeasons: ['spring', 'summer', 'fall'],

  properties: {
    edible: true,
    nutritionValue: 25,
    taste: {
      sweet: 0.7,
      bitter: 0.1,
      sour: 0.3,
      savory: 0.0,
      spicy: 0.0,
      aromatic: 0.4
    },
    medicinal: {
      treats: ['fatigue'],
      effectiveness: 0.3,
      preparation: ['raw'],
      dosage: 'small',
      toxicIfOverused: false,
      synergiesWith: ['chamomile']
    },
    environmental: {
      companionEffects: {
        attracts: ['bird', 'squirrel']
      }
    }
  },

  sprites: {
    seed: 'blueberry-bush-seed',
    sprout: 'blueberry-bush-sprout',
    vegetative: 'blueberry-bush-vegetative',
    flowering: 'blueberry-bush-flowering',
    fruiting: 'blueberry-bush-fruiting',
    mature: 'blueberry-bush-mature',
    seeding: 'blueberry-bush-seeding',
    withered: 'blueberry-bush-withered'
  },

  // Blueberry bushes regrow after harvest - picking berries doesn't destroy the bush
  harvestDestroysPlant: false,
  harvestResetStage: 'fruiting'  // Reset to fruiting stage to regrow berries
};

export const RASPBERRY_BUSH: PlantSpecies = {
  id: 'raspberry-bush',
  name: 'Raspberry Bush',
  category: 'herb',
  biomes: ['forest', 'woodland'],
  rarity: 'uncommon',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 0.75,
      conditions: { minHydration: 30, minTemperature: 10, minNutrition: 25 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 1,
      conditions: { minHydration: 25 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 2,
      conditions: { minHydration: 25, minNutrition: 30 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'flowering',
      baseDuration: 2,
      conditions: { minHydration: 30, minNutrition: 35 },
      onTransition: [{ type: 'spawn_flowers', params: { count: '8-15' } }]
    },
    {
      from: 'flowering',
      to: 'fruiting',
      baseDuration: 1.5,
      conditions: { minHydration: 25 },
      onTransition: [{ type: 'flowers_become_fruit' }]
    },
    {
      from: 'fruiting',
      to: 'mature',
      baseDuration: 2,
      conditions: { minHydration: 25 },
      onTransition: [{ type: 'fruit_ripens' }, { type: 'produce_seeds' }]
    },
    {
      from: 'mature',
      to: 'seeding',
      baseDuration: 1,
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 2 } }]
    },
    {
      from: 'seeding',
      to: 'vegetative',
      baseDuration: 1.5,
      conditions: { minHealth: 50 },
      onTransition: []
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
    growthRate: 0.8,
    yieldAmount: 1.2,
    diseaseResistance: 60,
    droughtTolerance: 50,
    coldTolerance: 65,
    flavorProfile: 85,
    mutations: []
  },

  seedsPerPlant: 12,
  seedDispersalRadius: 2,
  requiresDormancy: true,

  optimalTemperatureRange: [10, 22],
  optimalMoistureRange: [40, 75],
  preferredSeasons: ['spring', 'summer', 'fall'],

  properties: {
    edible: true,
    nutritionValue: 22,
    taste: {
      sweet: 0.5,
      bitter: 0.1,
      sour: 0.5,
      savory: 0.0,
      spicy: 0.0,
      aromatic: 0.6
    },
    medicinal: {
      treats: ['nausea'],
      effectiveness: 0.2,
      preparation: ['raw'],
      dosage: 'small',
      toxicIfOverused: false
    },
    environmental: {
      companionEffects: {
        attracts: ['bird', 'bee']
      }
    }
  },

  sprites: {
    seed: 'raspberry-bush-seed',
    sprout: 'raspberry-bush-sprout',
    vegetative: 'raspberry-bush-vegetative',
    flowering: 'raspberry-bush-flowering',
    fruiting: 'raspberry-bush-fruiting',
    mature: 'raspberry-bush-mature',
    seeding: 'raspberry-bush-seeding',
    withered: 'raspberry-bush-withered'
  },

  harvestDestroysPlant: false,
  harvestResetStage: 'fruiting'
};

export const BLACKBERRY_BUSH: PlantSpecies = {
  id: 'blackberry-bush',
  name: 'Blackberry Bush',
  category: 'herb',
  biomes: ['forest', 'woodland', 'plains'],
  rarity: 'common',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 0.5,
      conditions: { minHydration: 25, minTemperature: 8 },
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
      conditions: { minHydration: 20, minNutrition: 25 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'flowering',
      baseDuration: 2,
      conditions: { minHydration: 25, minNutrition: 30 },
      onTransition: [{ type: 'spawn_flowers', params: { count: '10-20' } }]
    },
    {
      from: 'flowering',
      to: 'fruiting',
      baseDuration: 1.5,
      conditions: { minHydration: 20 },
      onTransition: [{ type: 'flowers_become_fruit' }]
    },
    {
      from: 'fruiting',
      to: 'mature',
      baseDuration: 2,
      conditions: { minHydration: 20 },
      onTransition: [{ type: 'fruit_ripens' }, { type: 'produce_seeds' }]
    },
    {
      from: 'mature',
      to: 'seeding',
      baseDuration: 1,
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 3 } }]
    },
    {
      from: 'seeding',
      to: 'vegetative',
      baseDuration: 1.5,
      conditions: { minHealth: 45 },
      onTransition: []
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
    growthRate: 0.9,
    yieldAmount: 1.4,
    diseaseResistance: 70,
    droughtTolerance: 60,
    coldTolerance: 60,
    flavorProfile: 88,
    mutations: []
  },

  seedsPerPlant: 15,
  seedDispersalRadius: 3,
  requiresDormancy: false,

  optimalTemperatureRange: [10, 25],
  optimalMoistureRange: [35, 75],
  preferredSeasons: ['spring', 'summer', 'fall'],

  properties: {
    edible: true,
    nutritionValue: 26,
    taste: {
      sweet: 0.7,
      bitter: 0.1,
      sour: 0.3,
      savory: 0.0,
      spicy: 0.0,
      aromatic: 0.5
    },
    medicinal: {
      treats: ['nausea'],
      effectiveness: 0.25,
      preparation: ['raw'],
      dosage: 'small',
      toxicIfOverused: false
    },
    environmental: {
      companionEffects: {
        attracts: ['bird', 'bee', 'butterfly']
      }
    }
  },

  sprites: {
    seed: 'blackberry-bush-seed',
    sprout: 'blackberry-bush-sprout',
    vegetative: 'blackberry-bush-vegetative',
    flowering: 'blackberry-bush-flowering',
    fruiting: 'blackberry-bush-fruiting',
    mature: 'blackberry-bush-mature',
    seeding: 'blackberry-bush-seeding',
    withered: 'blackberry-bush-withered'
  },

  harvestDestroysPlant: false,
  harvestResetStage: 'fruiting'
};

export const TREE: PlantSpecies = {
  id: 'tree',
  name: 'Tree',
  category: 'tree',
  biomes: ['forest', 'plains'],
  rarity: 'common',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 2, // 2 days
      conditions: { minHydration: 20, minTemperature: 5 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 5, // 5 days
      conditions: { minHydration: 15 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 10, // 10 days
      conditions: { minHydration: 15 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'mature',
      baseDuration: 30, // 30 days to full maturity
      conditions: { minHydration: 10 },
      onTransition: []
    },
    {
      from: 'mature',
      to: 'seeding',
      baseDuration: 365, // Trees stay mature for a long time
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 5 } }]
    },
    {
      from: 'seeding',
      to: 'mature',
      baseDuration: 30, // Cycle back to mature (perennial)
      conditions: { minHealth: 30 },
      onTransition: []
    },
    {
      from: 'seeding',
      to: 'senescence',
      baseDuration: 365, // Very long time to die
      conditions: {},
      onTransition: []
    },
    {
      from: 'senescence',
      to: 'decay',
      baseDuration: 30, // 30 days
      conditions: {},
      onTransition: [{ type: 'return_nutrients_to_soil' }]
    },
    {
      from: 'decay',
      to: 'dead',
      baseDuration: 30, // 30 days
      conditions: {},
      onTransition: [{ type: 'remove_plant' }]
    }
  ],

  baseGenetics: {
    growthRate: 0.3, // Trees grow slowly
    yieldAmount: 2.0, // But produce lots when mature
    diseaseResistance: 80,
    droughtTolerance: 60,
    coldTolerance: 70,
    flavorProfile: 10,
    mutations: []
  },

  seedsPerPlant: 100,
  seedDispersalRadius: 5,
  requiresDormancy: true,

  optimalTemperatureRange: [5, 30],
  optimalMoistureRange: [25, 75],
  preferredSeasons: ['spring', 'summer', 'fall'],

  properties: {
    crafting: {
      fiber: {
        strength: 0.8,
        flexibility: 0.3,
        waterResistance: 0.6
      },
      structural: {
        hardness: 0.7,
        flexibility: 0.2,
        waterResistance: 0.5,
        weight: 1.0
      }
    },
    environmental: {
      aura: {
        radius: 3,
        effect: 'shade',
        magnitude: 0.6
      },
      companionEffects: {
        benefitsNearby: ['mushroom', 'fern'],
        attracts: ['bird', 'squirrel']
      },
      soilEffects: {
        acidifying: true,
        fertilityOnDecay: 15
      }
    }
  },

  sprites: {
    seed: 'tree-seed',
    sprout: 'tree-sprout',
    vegetative: 'tree-vegetative',
    flowering: 'tree-flowering',
    fruiting: 'tree-fruiting',
    mature: 'tree',
    seeding: 'tree',
    withered: 'tree-withered'
  },

  // Trees regrow after harvest - picking fruit doesn't destroy the tree
  harvestDestroysPlant: false,
  harvestResetStage: 'fruiting',

  // Height in voxels when mature (taller than 2-voxel humans)
  // Individual tree heights are sampled from this range using normal distribution
  heightRange: {
    min: 4,   // Smallest mature tree: 4 voxels (2x human height)
    max: 12,  // Tallest tree: 12 voxels (6x human height)
  },
};

export const CLOVER: PlantSpecies = {
  id: 'clover',
  name: 'Clover',
  category: 'herb',
  biomes: ['plains', 'grassland'],
  rarity: 'common',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 0.3,
      conditions: { minHydration: 25, minTemperature: 8 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 0.5,
      conditions: { minHydration: 20 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 1,
      conditions: { minHydration: 20 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'flowering',
      baseDuration: 1.5,
      conditions: { minHydration: 25 },
      onTransition: [{ type: 'spawn_flowers', params: { count: '4-8' } }]
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
      baseDuration: 1,
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 2 } }]
    },
    {
      from: 'seeding',
      to: 'vegetative',
      baseDuration: 1,
      conditions: { minHealth: 50 },
      onTransition: []
    },
    {
      from: 'seeding',
      to: 'senescence',
      baseDuration: 1.5,
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
    growthRate: 1.4,
    yieldAmount: 0.7,
    diseaseResistance: 70,
    droughtTolerance: 65,
    coldTolerance: 55,
    flavorProfile: 40,
    mutations: []
  },

  seedsPerPlant: 30,
  seedDispersalRadius: 2,
  requiresDormancy: false,

  optimalTemperatureRange: [8, 25],
  optimalMoistureRange: [35, 75],
  preferredSeasons: ['spring', 'summer', 'fall'],

  properties: {
    edible: true,
    nutritionValue: 15,
    environmental: {
      soilEffects: {
        nitrogenFixer: true,
        fertilityOnDecay: 8
      },
      companionEffects: {
        benefitsNearby: ['grass', 'wildflower', 'wheat']
      }
    }
  },

  sprites: {
    seed: 'clover-seed',
    sprout: 'clover-sprout',
    vegetative: 'clover-vegetative',
    flowering: 'clover-flowering',
    fruiting: 'clover-fruiting',
    mature: 'clover-mature',
    seeding: 'clover-seeding',
    withered: 'clover-withered'
  }
};

export const SAGE: PlantSpecies = {
  id: 'sage',
  name: 'Sage',
  category: 'herb',
  biomes: ['plains', 'grassland'],
  rarity: 'uncommon',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 0.75,
      conditions: { minHydration: 20, minTemperature: 12 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 1,
      conditions: { minHydration: 15 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 2,
      conditions: { minHydration: 15 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'flowering',
      baseDuration: 2,
      conditions: { minHydration: 20 },
      onTransition: [{ type: 'spawn_flowers', params: { count: '5-10' } }]
    },
    {
      from: 'flowering',
      to: 'fruiting',
      baseDuration: 1.5,
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
      baseDuration: 1,
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 3 } }]
    },
    {
      from: 'seeding',
      to: 'vegetative',
      baseDuration: 1.5,
      conditions: { minHealth: 60 },
      onTransition: []
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
    growthRate: 0.8,
    yieldAmount: 1.0,
    diseaseResistance: 75,
    droughtTolerance: 85,
    coldTolerance: 50,
    flavorProfile: 70,
    mutations: []
  },

  seedsPerPlant: 20,
  seedDispersalRadius: 3,
  requiresDormancy: false,

  optimalTemperatureRange: [15, 30],
  optimalMoistureRange: [20, 60],
  preferredSeasons: ['spring', 'summer'],

  properties: {
    medicinal: {
      treats: ['inflammation', 'nausea'],
      effectiveness: 0.5,
      preparation: ['powder', 'tea'],
      dosage: 'small',
      toxicIfOverused: false
    },
    crafting: {
      scent: {
        profile: 'herbal, earthy, slightly peppery',
        intensity: 0.8,
        persistence: 8
      }
    },
    environmental: {
      companionEffects: {
        repels: ['pest', 'moth']
      }
    }
  },

  sprites: {
    seed: 'sage-seed',
    sprout: 'sage-sprout',
    vegetative: 'sage-vegetative',
    flowering: 'sage-flowering',
    fruiting: 'sage-fruiting',
    mature: 'sage-mature',
    seeding: 'sage-seeding',
    withered: 'sage-withered'
  }
};

export const YARROW: PlantSpecies = {
  id: 'yarrow',
  name: 'Yarrow',
  category: 'herb',
  biomes: ['plains', 'grassland'],
  rarity: 'uncommon',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 0.5,
      conditions: { minHydration: 20, minTemperature: 10 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 1,
      conditions: { minHydration: 15 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 1.5,
      conditions: { minHydration: 15 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'flowering',
      baseDuration: 2,
      conditions: { minHydration: 20 },
      onTransition: [{ type: 'spawn_flowers', params: { count: '10-20' } }]
    },
    {
      from: 'flowering',
      to: 'fruiting',
      baseDuration: 1.5,
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
      baseDuration: 1,
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 2 } }]
    },
    {
      from: 'seeding',
      to: 'vegetative',
      baseDuration: 1,
      conditions: { minHealth: 50 },
      onTransition: []
    },
    {
      from: 'seeding',
      to: 'senescence',
      baseDuration: 1.5,
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
    growthRate: 1.0,
    yieldAmount: 1.1,
    diseaseResistance: 80,
    droughtTolerance: 75,
    coldTolerance: 65,
    flavorProfile: 45,
    mutations: []
  },

  seedsPerPlant: 40,
  seedDispersalRadius: 2,
  requiresDormancy: false,

  optimalTemperatureRange: [12, 28],
  optimalMoistureRange: [25, 70],
  preferredSeasons: ['spring', 'summer', 'fall'],

  properties: {
    medicinal: {
      treats: ['wound', 'fever'],
      effectiveness: 0.7,
      preparation: ['poultice', 'tea'],
      dosage: 'medium',
      toxicIfOverused: false,
      synergiesWith: ['sage']
    },
    environmental: {
      companionEffects: {
        attracts: ['bee', 'butterfly', 'ladybug'],
        benefitsNearby: ['tomato', 'blueberry-bush', 'raspberry-bush', 'blackberry-bush']
      }
    }
  },

  sprites: {
    seed: 'yarrow-seed',
    sprout: 'yarrow-sprout',
    vegetative: 'yarrow-vegetative',
    flowering: 'yarrow-flowering',
    fruiting: 'yarrow-fruiting',
    mature: 'yarrow-mature',
    seeding: 'yarrow-seeding',
    withered: 'yarrow-withered'
  }
};

export const THISTLE: PlantSpecies = {
  id: 'thistle',
  name: 'Thistle',
  category: 'herb',
  biomes: ['plains', 'grassland'],
  rarity: 'common',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 0.4,
      conditions: { minHydration: 15, minTemperature: 5 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 0.75,
      conditions: { minHydration: 10 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 1.5,
      conditions: { minHydration: 10 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'flowering',
      baseDuration: 2,
      conditions: { minHydration: 15 },
      onTransition: [{ type: 'spawn_flowers', params: { count: '3-7' } }]
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
      baseDuration: 0.75,
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
    growthRate: 1.3,
    yieldAmount: 0.6,
    diseaseResistance: 85,
    droughtTolerance: 80,
    coldTolerance: 70,
    flavorProfile: 35,
    mutations: []
  },

  seedsPerPlant: 60,
  seedDispersalRadius: 4,
  requiresDormancy: false,

  optimalTemperatureRange: [5, 28],
  optimalMoistureRange: [15, 65],
  preferredSeasons: ['spring', 'summer', 'fall'],

  properties: {
    medicinal: {
      treats: ['illness'],
      effectiveness: 0.4,
      preparation: ['tincture'],
      dosage: 'small',
      toxicIfOverused: false
    },
    environmental: {
      companionEffects: {
        attracts: ['bee', 'goldfinch'],
        harmsNearby: ['grass', 'wildflower']
      }
    }
  },

  sprites: {
    seed: 'thistle-seed',
    sprout: 'thistle-sprout',
    vegetative: 'thistle-vegetative',
    flowering: 'thistle-flowering',
    fruiting: 'thistle-fruiting',
    mature: 'thistle-mature',
    seeding: 'thistle-seeding',
    withered: 'thistle-withered'
  }
};

export const WILD_ONION: PlantSpecies = {
  id: 'wild-onion',
  name: 'Wild Onion',
  category: 'herb',
  biomes: ['plains', 'grassland'],
  rarity: 'uncommon',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 0.5,
      conditions: { minHydration: 25, minTemperature: 8 },
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
      baseDuration: 2,
      conditions: { minHydration: 25 },
      onTransition: [{ type: 'spawn_flowers', params: { count: '4-8' } }]
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
      baseDuration: 1.5,
      conditions: {},
      onTransition: [{ type: 'fruit_ripens' }, { type: 'produce_seeds' }]
    },
    {
      from: 'mature',
      to: 'seeding',
      baseDuration: 1,
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
    yieldAmount: 0.9,
    diseaseResistance: 65,
    droughtTolerance: 55,
    coldTolerance: 60,
    flavorProfile: 75,
    mutations: []
  },

  seedsPerPlant: 15,
  seedDispersalRadius: 2,
  requiresDormancy: false,

  optimalTemperatureRange: [10, 25],
  optimalMoistureRange: [30, 70],
  preferredSeasons: ['spring', 'summer', 'fall'],

  properties: {
    edible: true,
    nutritionValue: 20,
    taste: {
      sweet: 0.1,
      bitter: 0.2,
      sour: 0.0,
      savory: 0.6,
      spicy: 0.4,
      aromatic: 0.7
    },
    medicinal: {
      treats: ['cold'],
      effectiveness: 0.3,
      preparation: ['raw'],
      dosage: 'medium',
      toxicIfOverused: false
    },
    environmental: {
      companionEffects: {
        repels: ['pest', 'aphid'],
        benefitsNearby: ['tomato', 'carrot']
      }
    }
  },

  sprites: {
    seed: 'wild-onion-seed',
    sprout: 'wild-onion-sprout',
    vegetative: 'wild-onion-vegetative',
    flowering: 'wild-onion-flowering',
    fruiting: 'wild-onion-fruiting',
    mature: 'wild-onion-mature',
    seeding: 'wild-onion-seeding',
    withered: 'wild-onion-withered'
  }
};

export const FERN: PlantSpecies = {
  id: 'fern',
  name: 'Fern',
  category: 'herb',
  biomes: ['forest'],
  rarity: 'common',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 1,
      conditions: { minHydration: 35, minTemperature: 10 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 1.5,
      conditions: { minHydration: 30 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 2,
      conditions: { minHydration: 30 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'mature',
      baseDuration: 3,
      conditions: { minHydration: 30 },
      onTransition: []
    },
    {
      from: 'mature',
      to: 'seeding',
      baseDuration: 30,
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 2 } }]
    },
    {
      from: 'seeding',
      to: 'vegetative',
      baseDuration: 2,
      conditions: { minHealth: 50 },
      onTransition: []
    },
    {
      from: 'seeding',
      to: 'senescence',
      baseDuration: 15,
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
    growthRate: 0.9,
    yieldAmount: 0.6,
    diseaseResistance: 70,
    droughtTolerance: 25,
    coldTolerance: 55,
    flavorProfile: 15,
    mutations: []
  },

  seedsPerPlant: 100,
  seedDispersalRadius: 2,
  requiresDormancy: false,

  optimalTemperatureRange: [12, 24],
  optimalMoistureRange: [50, 90],
  preferredSeasons: ['spring', 'summer', 'fall'],

  properties: {
    environmental: {
      aura: {
        radius: 1,
        effect: 'humidity',
        magnitude: 0.3
      },
      companionEffects: {
        benefitsNearby: ['moss', 'mushroom']
      },
      soilEffects: {
        fertilityOnDecay: 6
      }
    }
  },

  sprites: {
    seed: 'fern-seed',
    sprout: 'fern-sprout',
    vegetative: 'fern-vegetative',
    flowering: 'fern-vegetative',
    fruiting: 'fern-vegetative',
    mature: 'fern-mature',
    seeding: 'fern-mature',
    withered: 'fern-withered'
  }
};

export const MUSHROOM: PlantSpecies = {
  id: 'mushroom',
  name: 'Mushroom',
  category: 'fungus',
  biomes: ['forest'],
  rarity: 'uncommon',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 0.5,
      conditions: { minHydration: 40, minTemperature: 8 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 1,
      conditions: { minHydration: 35 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 1.5,
      conditions: { minHydration: 35 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'mature',
      baseDuration: 2,
      conditions: { minHydration: 35 },
      onTransition: []
    },
    {
      from: 'mature',
      to: 'seeding',
      baseDuration: 1,
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 3 } }]
    },
    {
      from: 'seeding',
      to: 'senescence',
      baseDuration: 0.5,
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
    growthRate: 1.6,
    yieldAmount: 1.2,
    diseaseResistance: 45,
    droughtTolerance: 20,
    coldTolerance: 60,
    flavorProfile: 65,
    mutations: []
  },

  seedsPerPlant: 200,
  seedDispersalRadius: 3,
  requiresDormancy: false,

  optimalTemperatureRange: [10, 22],
  optimalMoistureRange: [60, 95],
  preferredSeasons: ['spring', 'fall'],

  properties: {
    edible: true,
    nutritionValue: 18,
    taste: {
      sweet: 0.1,
      bitter: 0.2,
      sour: 0.0,
      savory: 0.8,
      spicy: 0.0,
      aromatic: 0.6
    },
    environmental: {
      companionEffects: {
        benefitsNearby: ['tree', 'fern']
      },
      soilEffects: {
        fertilityOnDecay: 10
      }
    }
  },

  sprites: {
    seed: 'mushroom-spore',
    sprout: 'mushroom-sprout',
    vegetative: 'mushroom-vegetative',
    flowering: 'mushroom-vegetative',
    fruiting: 'mushroom-vegetative',
    mature: 'mushroom-mature',
    seeding: 'mushroom-mature',
    withered: 'mushroom-withered'
  }
};

export const MOSS: PlantSpecies = {
  id: 'moss',
  name: 'Moss',
  category: 'moss',
  biomes: ['forest'],
  rarity: 'common',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 0.25,
      conditions: { minHydration: 40 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 0.5,
      conditions: { minHydration: 35 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 1,
      conditions: { minHydration: 35 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'mature',
      baseDuration: 2,
      conditions: { minHydration: 35 },
      onTransition: []
    },
    {
      from: 'mature',
      to: 'seeding',
      baseDuration: 15,
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 1 } }]
    },
    {
      from: 'seeding',
      to: 'vegetative',
      baseDuration: 1,
      conditions: { minHealth: 40 },
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
    growthRate: 0.6,
    yieldAmount: 0.4,
    diseaseResistance: 80,
    droughtTolerance: 15,
    coldTolerance: 75,
    flavorProfile: 10,
    mutations: []
  },

  seedsPerPlant: 500,
  seedDispersalRadius: 1,
  requiresDormancy: false,

  optimalTemperatureRange: [5, 25],
  optimalMoistureRange: [60, 100],
  preferredSeasons: ['spring', 'summer', 'fall', 'winter'],

  properties: {
    environmental: {
      aura: {
        radius: 1,
        effect: 'humidity',
        magnitude: 0.4
      },
      companionEffects: {
        benefitsNearby: ['fern', 'mushroom']
      },
      soilEffects: {
        fertilityOnDecay: 4
      }
    }
  },

  sprites: {
    seed: 'moss-spore',
    sprout: 'moss-sprout',
    vegetative: 'moss-vegetative',
    flowering: 'moss-vegetative',
    fruiting: 'moss-vegetative',
    mature: 'moss-mature',
    seeding: 'moss-mature',
    withered: 'moss-withered'
  }
};

export const WILD_GARLIC: PlantSpecies = {
  id: 'wild-garlic',
  name: 'Wild Garlic',
  category: 'herb',
  biomes: ['forest'],
  rarity: 'uncommon',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 0.75,
      conditions: { minHydration: 30, minTemperature: 5 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 1,
      conditions: { minHydration: 25 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 1.5,
      conditions: { minHydration: 25 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'flowering',
      baseDuration: 2,
      conditions: { minHydration: 30 },
      onTransition: [{ type: 'spawn_flowers', params: { count: '5-10' } }]
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
      baseDuration: 1,
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 2 } }]
    },
    {
      from: 'seeding',
      to: 'vegetative',
      baseDuration: 1,
      conditions: { minHealth: 50 },
      onTransition: []
    },
    {
      from: 'seeding',
      to: 'senescence',
      baseDuration: 1.5,
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
    growthRate: 1.1,
    yieldAmount: 0.8,
    diseaseResistance: 70,
    droughtTolerance: 40,
    coldTolerance: 70,
    flavorProfile: 80,
    mutations: []
  },

  seedsPerPlant: 20,
  seedDispersalRadius: 2,
  requiresDormancy: false,

  optimalTemperatureRange: [8, 20],
  optimalMoistureRange: [40, 80],
  preferredSeasons: ['spring', 'summer'],

  properties: {
    edible: true,
    nutritionValue: 22,
    taste: {
      sweet: 0.0,
      bitter: 0.2,
      sour: 0.0,
      savory: 0.7,
      spicy: 0.5,
      aromatic: 0.9
    },
    medicinal: {
      treats: ['cold', 'infection'],
      effectiveness: 0.4,
      preparation: ['raw'],
      dosage: 'medium',
      toxicIfOverused: false
    },
    environmental: {
      companionEffects: {
        repels: ['pest', 'aphid', 'deer'],
        benefitsNearby: ['blueberry-bush', 'raspberry-bush', 'blackberry-bush', 'tree']
      }
    }
  },

  sprites: {
    seed: 'wild-garlic-seed',
    sprout: 'wild-garlic-sprout',
    vegetative: 'wild-garlic-vegetative',
    flowering: 'wild-garlic-flowering',
    fruiting: 'wild-garlic-fruiting',
    mature: 'wild-garlic-mature',
    seeding: 'wild-garlic-seeding',
    withered: 'wild-garlic-withered'
  }
};

export const OAK_TREE: PlantSpecies = {
  id: 'oak-tree',
  name: 'Oak Tree',
  category: 'tree',
  biomes: ['forest'],
  rarity: 'common',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 3,
      conditions: { minHydration: 25, minTemperature: 8 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 7,
      conditions: { minHydration: 20 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 15,
      conditions: { minHydration: 20 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'mature',
      baseDuration: 50,
      conditions: { minHydration: 15 },
      onTransition: []
    },
    {
      from: 'mature',
      to: 'seeding',
      baseDuration: 365,
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 6 } }]
    },
    {
      from: 'seeding',
      to: 'mature',
      baseDuration: 50,
      conditions: { minHealth: 40 },
      onTransition: []
    },
    {
      from: 'seeding',
      to: 'senescence',
      baseDuration: 500,
      conditions: {},
      onTransition: []
    },
    {
      from: 'senescence',
      to: 'decay',
      baseDuration: 50,
      conditions: {},
      onTransition: [{ type: 'return_nutrients_to_soil' }]
    },
    {
      from: 'decay',
      to: 'dead',
      baseDuration: 30,
      conditions: {},
      onTransition: [{ type: 'remove_plant' }]
    }
  ],

  baseGenetics: {
    growthRate: 0.2,
    yieldAmount: 2.5,
    diseaseResistance: 85,
    droughtTolerance: 65,
    coldTolerance: 75,
    flavorProfile: 15,
    mutations: []
  },

  seedsPerPlant: 150,
  seedDispersalRadius: 6,
  requiresDormancy: true,

  optimalTemperatureRange: [8, 28],
  optimalMoistureRange: [30, 75],
  preferredSeasons: ['spring', 'summer', 'fall'],

  properties: {
    crafting: {
      structural: {
        hardness: 0.9,
        flexibility: 0.1,
        waterResistance: 0.7,
        weight: 1.2
      }
    },
    environmental: {
      aura: {
        radius: 4,
        effect: 'shade',
        magnitude: 0.8
      },
      companionEffects: {
        benefitsNearby: ['mushroom', 'fern', 'moss'],
        attracts: ['bird', 'squirrel', 'deer']
      },
      soilEffects: {
        acidifying: true,
        fertilityOnDecay: 20
      }
    }
  },

  sprites: {
    seed: 'oak-tree-seed',
    sprout: 'oak-tree-sprout',
    vegetative: 'oak-tree-vegetative',
    flowering: 'oak-tree-flowering',
    fruiting: 'oak-tree-fruiting',
    mature: 'oak-tree',
    seeding: 'oak-tree',
    withered: 'oak-tree-withered'
  },

  harvestDestroysPlant: false,
  harvestResetStage: 'fruiting',

  heightRange: {
    min: 6,
    max: 15,
  },
};

export const PINE_TREE: PlantSpecies = {
  id: 'pine-tree',
  name: 'Pine Tree',
  category: 'tree',
  biomes: ['forest'],
  rarity: 'common',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 2.5,
      conditions: { minHydration: 20, minTemperature: 5 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 6,
      conditions: { minHydration: 15 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 12,
      conditions: { minHydration: 15 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'mature',
      baseDuration: 40,
      conditions: { minHydration: 12 },
      onTransition: []
    },
    {
      from: 'mature',
      to: 'seeding',
      baseDuration: 365,
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 5 } }]
    },
    {
      from: 'seeding',
      to: 'mature',
      baseDuration: 40,
      conditions: { minHealth: 35 },
      onTransition: []
    },
    {
      from: 'seeding',
      to: 'senescence',
      baseDuration: 600,
      conditions: {},
      onTransition: []
    },
    {
      from: 'senescence',
      to: 'decay',
      baseDuration: 40,
      conditions: {},
      onTransition: [{ type: 'return_nutrients_to_soil' }]
    },
    {
      from: 'decay',
      to: 'dead',
      baseDuration: 30,
      conditions: {},
      onTransition: [{ type: 'remove_plant' }]
    }
  ],

  baseGenetics: {
    growthRate: 0.4,
    yieldAmount: 2.2,
    diseaseResistance: 80,
    droughtTolerance: 70,
    coldTolerance: 85,
    flavorProfile: 10,
    mutations: []
  },

  seedsPerPlant: 120,
  seedDispersalRadius: 5,
  requiresDormancy: true,

  optimalTemperatureRange: [2, 25],
  optimalMoistureRange: [25, 70],
  preferredSeasons: ['spring', 'summer', 'fall'],

  properties: {
    crafting: {
      structural: {
        hardness: 0.6,
        flexibility: 0.4,
        waterResistance: 0.8,
        weight: 0.8
      },
      scent: {
        profile: 'fresh pine, resinous',
        intensity: 0.7,
        persistence: 6
      }
    },
    environmental: {
      aura: {
        radius: 4,
        effect: 'shade',
        magnitude: 0.7
      },
      companionEffects: {
        benefitsNearby: ['mushroom', 'moss'],
        attracts: ['bird', 'squirrel']
      },
      soilEffects: {
        acidifying: true,
        fertilityOnDecay: 18
      }
    }
  },

  sprites: {
    seed: 'pine-tree-seed',
    sprout: 'pine-tree-sprout',
    vegetative: 'pine-tree-vegetative',
    flowering: 'pine-tree-vegetative',
    fruiting: 'pine-tree-vegetative',
    mature: 'pine-tree',
    seeding: 'pine-tree',
    withered: 'pine-tree-withered'
  },

  harvestDestroysPlant: false,
  harvestResetStage: 'fruiting',

  heightRange: {
    min: 8,
    max: 18,
  },
};

export const GINSENG: PlantSpecies = {
  id: 'ginseng',
  name: 'Ginseng',
  category: 'herb',
  biomes: ['forest'],
  rarity: 'rare',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 2,
      conditions: { minHydration: 35, minTemperature: 8 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 3,
      conditions: { minHydration: 30 },
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
      to: 'mature',
      baseDuration: 20,
      conditions: { minHydration: 30 },
      onTransition: []
    },
    {
      from: 'mature',
      to: 'seeding',
      baseDuration: 60,
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 1 } }]
    },
    {
      from: 'seeding',
      to: 'mature',
      baseDuration: 20,
      conditions: { minHealth: 60 },
      onTransition: []
    },
    {
      from: 'seeding',
      to: 'senescence',
      baseDuration: 100,
      conditions: {},
      onTransition: []
    },
    {
      from: 'senescence',
      to: 'decay',
      baseDuration: 5,
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
    growthRate: 0.4,
    yieldAmount: 1.5,
    diseaseResistance: 70,
    droughtTolerance: 40,
    coldTolerance: 65,
    flavorProfile: 60,
    mutations: []
  },

  seedsPerPlant: 5,
  seedDispersalRadius: 1,
  requiresDormancy: true,

  optimalTemperatureRange: [10, 22],
  optimalMoistureRange: [45, 80],
  preferredSeasons: ['spring', 'summer', 'fall'],

  properties: {
    edible: true,
    nutritionValue: 12,
    medicinal: {
      treats: ['fatigue', 'illness'],
      effectiveness: 0.8,
      preparation: ['tea', 'tincture'],
      dosage: 'small',
      toxicIfOverused: true,
      toxicityThreshold: 2
    },
    environmental: {
      companionEffects: {
        benefitsNearby: ['fern', 'moss']
      },
      soilEffects: {
        fertilityOnDecay: 8
      }
    }
  },

  sprites: {
    seed: 'ginseng-seed',
    sprout: 'ginseng-sprout',
    vegetative: 'ginseng-vegetative',
    flowering: 'ginseng-vegetative',
    fruiting: 'ginseng-vegetative',
    mature: 'ginseng-mature',
    seeding: 'ginseng-mature',
    withered: 'ginseng-withered'
  }
};

export const ELDERBERRY: PlantSpecies = {
  id: 'elderberry',
  name: 'Elderberry',
  category: 'herb',
  biomes: ['forest'],
  rarity: 'uncommon',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 1,
      conditions: { minHydration: 30, minTemperature: 10 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 1.5,
      conditions: { minHydration: 25 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 3,
      conditions: { minHydration: 25, minNutrition: 25 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'flowering',
      baseDuration: 3,
      conditions: { minHydration: 30 },
      onTransition: [{ type: 'spawn_flowers', params: { count: '15-25' } }]
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
      baseDuration: 2.5,
      conditions: {},
      onTransition: [{ type: 'fruit_ripens' }, { type: 'produce_seeds' }]
    },
    {
      from: 'mature',
      to: 'seeding',
      baseDuration: 1.5,
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 3 } }]
    },
    {
      from: 'seeding',
      to: 'vegetative',
      baseDuration: 2,
      conditions: { minHealth: 50 },
      onTransition: []
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
      baseDuration: 1.5,
      conditions: {},
      onTransition: [{ type: 'return_nutrients_to_soil' }]
    },
    {
      from: 'decay',
      to: 'dead',
      baseDuration: 1,
      conditions: {},
      onTransition: [{ type: 'remove_plant' }]
    }
  ],

  baseGenetics: {
    growthRate: 0.8,
    yieldAmount: 1.4,
    diseaseResistance: 75,
    droughtTolerance: 50,
    coldTolerance: 70,
    flavorProfile: 85,
    mutations: []
  },

  seedsPerPlant: 15,
  seedDispersalRadius: 3,
  requiresDormancy: false,

  optimalTemperatureRange: [10, 24],
  optimalMoistureRange: [40, 80],
  preferredSeasons: ['spring', 'summer', 'fall'],

  properties: {
    edible: true,
    nutritionValue: 28,
    taste: {
      sweet: 0.6,
      bitter: 0.2,
      sour: 0.4,
      savory: 0.0,
      spicy: 0.0,
      aromatic: 0.7
    },
    medicinal: {
      treats: ['cold', 'fever', 'infection'],
      effectiveness: 0.7,
      preparation: ['tea', 'tincture'],
      dosage: 'medium',
      toxicIfOverused: false,
      synergiesWith: ['yarrow', 'sage']
    },
    environmental: {
      companionEffects: {
        attracts: ['bird', 'bee'],
        benefitsNearby: ['fern', 'wildflower']
      },
      soilEffects: {
        fertilityOnDecay: 10
      }
    }
  },

  sprites: {
    seed: 'elderberry-seed',
    sprout: 'elderberry-sprout',
    vegetative: 'elderberry-vegetative',
    flowering: 'elderberry-flowering',
    fruiting: 'elderberry-fruiting',
    mature: 'elderberry-mature',
    seeding: 'elderberry-seeding',
    withered: 'elderberry-withered'
  },

  harvestDestroysPlant: false,
  harvestResetStage: 'fruiting'
};

export const WILD_PLANTS = [
  GRASS, WILDFLOWER, BLUEBERRY_BUSH, TREE,
  CLOVER, SAGE, YARROW, THISTLE, WILD_ONION,
  FERN, MUSHROOM, MOSS, WILD_GARLIC, OAK_TREE, PINE_TREE,
  GINSENG, ELDERBERRY, RASPBERRY_BUSH, BLACKBERRY_BUSH
];
