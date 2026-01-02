import type { PlantSpecies } from '@ai-village/core';

/**
 * Cultivated food crops for farming
 * These are more filling than wild berries and designed for sustainable agriculture
 */

export const WHEAT: PlantSpecies = {
  id: 'wheat',
  name: 'Wheat',
  category: 'grain',
  biomes: ['plains', 'grassland'],
  rarity: 'common',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 0.5, // 12 hours
      conditions: { minHydration: 25, minTemperature: 8, minNutrition: 20 },
      onTransition: [{ type: 'become_visible' }]
    },
    {
      from: 'germinating',
      to: 'sprout',
      baseDuration: 1, // 1 day
      conditions: { minHydration: 20 },
      onTransition: []
    },
    {
      from: 'sprout',
      to: 'vegetative',
      baseDuration: 2, // 2 days
      conditions: { minHydration: 20, minNutrition: 25 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'flowering',
      baseDuration: 2, // 2 days
      conditions: { minHydration: 25, minNutrition: 30 },
      onTransition: [{ type: 'spawn_flowers', params: { count: '8-12' } }]
    },
    {
      from: 'flowering',
      to: 'fruiting',
      baseDuration: 1.5, // 1.5 days
      conditions: { minHydration: 20 },
      onTransition: [{ type: 'flowers_become_fruit' }]
    },
    {
      from: 'fruiting',
      to: 'mature',
      baseDuration: 2, // 2 days
      conditions: { minHydration: 15 },
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
      baseDuration: 0.5, // 12 hours
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
    growthRate: 1.0,
    yieldAmount: 1.5, // Good yield
    diseaseResistance: 50,
    droughtTolerance: 60,
    coldTolerance: 55,
    flavorProfile: 50,
    mutations: []
  },

  seedsPerPlant: 40,
  seedDispersalRadius: 2,
  requiresDormancy: false,

  optimalTemperatureRange: [10, 28],
  optimalMoistureRange: [30, 70],
  preferredSeasons: ['spring', 'summer'],

  properties: {
    edible: true,
    nutritionValue: 60, // Very filling - grains are calorie-dense
    taste: {
      sweet: 0.2,
      bitter: 0.1,
      sour: 0.0,
      savory: 0.4,
      spicy: 0.0,
      aromatic: 0.3
    },
    crafting: {
      fiber: {
        strength: 0.4,
        flexibility: 0.6,
        waterResistance: 0.3
      }
    }
  },

  sprites: {
    seed: 'wheat-seed',
    sprout: 'wheat-sprout',
    vegetative: 'wheat-vegetative',
    flowering: 'wheat-flowering',
    fruiting: 'wheat-fruiting',
    mature: 'wheat-mature',
    seeding: 'wheat-seeding',
    withered: 'wheat-withered'
  },

  harvestDestroysPlant: true // Wheat is harvested once
};

export const POTATO: PlantSpecies = {
  id: 'potato',
  name: 'Potato',
  category: 'root',
  biomes: ['plains', 'grassland', 'forest'],
  rarity: 'common',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 0.75, // 18 hours
      conditions: { minHydration: 30, minTemperature: 10, minNutrition: 30 },
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
      baseDuration: 3, // 3 days - tubers forming underground
      conditions: { minHydration: 30, minNutrition: 35 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'flowering',
      baseDuration: 2, // 2 days
      conditions: { minHydration: 30, minNutrition: 35 },
      onTransition: [{ type: 'spawn_flowers', params: { count: '4-8' } }]
    },
    {
      from: 'flowering',
      to: 'fruiting',
      baseDuration: 2, // 2 days
      conditions: { minHydration: 25 },
      onTransition: [{ type: 'flowers_become_fruit' }]
    },
    {
      from: 'fruiting',
      to: 'mature',
      baseDuration: 3, // 3 days - tubers maturing
      conditions: { minHydration: 20 },
      onTransition: [{ type: 'fruit_ripens' }, { type: 'produce_seeds' }]
    },
    {
      from: 'mature',
      to: 'seeding',
      baseDuration: 1, // 1 day
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }]
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
    growthRate: 0.8,
    yieldAmount: 2.0, // Excellent yield - multiple tubers per plant
    diseaseResistance: 60,
    droughtTolerance: 45,
    coldTolerance: 70, // Very cold tolerant
    flavorProfile: 60,
    mutations: []
  },

  seedsPerPlant: 6, // Potatoes produce fewer seeds but high food yield
  seedDispersalRadius: 1,
  requiresDormancy: false,

  optimalTemperatureRange: [8, 24],
  optimalMoistureRange: [40, 75],
  preferredSeasons: ['spring', 'summer', 'fall'],

  properties: {
    edible: true,
    nutritionValue: 70, // Very filling - starchy tubers
    taste: {
      sweet: 0.3,
      bitter: 0.0,
      sour: 0.0,
      savory: 0.6,
      spicy: 0.0,
      aromatic: 0.2
    }
  },

  sprites: {
    seed: 'potato-seed',
    sprout: 'potato-sprout',
    vegetative: 'potato-vegetative',
    flowering: 'potato-flowering',
    fruiting: 'potato-fruiting',
    mature: 'potato-mature',
    seeding: 'potato-seeding',
    withered: 'potato-withered'
  },

  harvestDestroysPlant: true // Potato plants are harvested for tubers
};

export const CARROT: PlantSpecies = {
  id: 'carrot',
  name: 'Carrot',
  category: 'root',
  biomes: ['plains', 'grassland'],
  rarity: 'common',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 0.5, // 12 hours
      conditions: { minHydration: 25, minTemperature: 8, minNutrition: 25 },
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
      baseDuration: 2, // 2 days
      conditions: { minHydration: 25, minNutrition: 30 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'mature',
      baseDuration: 3, // 3 days - root developing
      conditions: { minHydration: 25, minNutrition: 30 },
      onTransition: [{ type: 'produce_seeds' }]
    },
    {
      from: 'mature',
      to: 'seeding',
      baseDuration: 1, // 1 day
      conditions: {},
      onTransition: [{ type: 'produce_seeds' }, { type: 'drop_seeds', params: { radius: 1 } }]
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
    yieldAmount: 1.0,
    diseaseResistance: 55,
    droughtTolerance: 50,
    coldTolerance: 60,
    flavorProfile: 70,
    mutations: []
  },

  seedsPerPlant: 15,
  seedDispersalRadius: 1,
  requiresDormancy: false,

  optimalTemperatureRange: [10, 26],
  optimalMoistureRange: [35, 70],
  preferredSeasons: ['spring', 'summer', 'fall'],

  properties: {
    edible: true,
    nutritionValue: 45, // Moderately filling
    taste: {
      sweet: 0.6,
      bitter: 0.0,
      sour: 0.1,
      savory: 0.3,
      spicy: 0.0,
      aromatic: 0.2
    }
  },

  sprites: {
    seed: 'carrot-seed',
    sprout: 'carrot-sprout',
    vegetative: 'carrot-vegetative',
    flowering: 'carrot-flowering',
    fruiting: 'carrot-fruiting',
    mature: 'carrot-mature',
    seeding: 'carrot-seeding',
    withered: 'carrot-withered'
  },

  harvestDestroysPlant: true
};

export const CORN: PlantSpecies = {
  id: 'corn',
  name: 'Corn',
  category: 'grain',
  biomes: ['plains', 'grassland'],
  rarity: 'common',

  stageTransitions: [
    {
      from: 'seed',
      to: 'germinating',
      baseDuration: 0.5, // 12 hours
      conditions: { minHydration: 30, minTemperature: 12, minNutrition: 25 },
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
      baseDuration: 3, // 3 days - tall stalk growth
      conditions: { minHydration: 30, minNutrition: 35 },
      onTransition: []
    },
    {
      from: 'vegetative',
      to: 'flowering',
      baseDuration: 2, // 2 days
      conditions: { minHydration: 30, minNutrition: 35 },
      onTransition: [{ type: 'spawn_flowers', params: { count: '1-2' } }]
    },
    {
      from: 'flowering',
      to: 'fruiting',
      baseDuration: 1, // 1 day
      conditions: { minHydration: 25 },
      onTransition: [{ type: 'flowers_become_fruit' }]
    },
    {
      from: 'fruiting',
      to: 'mature',
      baseDuration: 3, // 3 days - ears developing
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
      to: 'senescence',
      baseDuration: 0.5, // 12 hours
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
    growthRate: 0.9,
    yieldAmount: 1.8, // High yield
    diseaseResistance: 55,
    droughtTolerance: 40,
    coldTolerance: 40,
    flavorProfile: 75,
    mutations: []
  },

  seedsPerPlant: 50, // Corn produces many kernels
  seedDispersalRadius: 2,
  requiresDormancy: false,

  optimalTemperatureRange: [15, 30],
  optimalMoistureRange: [40, 75],
  preferredSeasons: ['spring', 'summer'],

  properties: {
    edible: true,
    nutritionValue: 80, // Extremely filling - high calorie grain
    taste: {
      sweet: 0.7,
      bitter: 0.0,
      sour: 0.0,
      savory: 0.4,
      spicy: 0.0,
      aromatic: 0.3
    }
  },

  sprites: {
    seed: 'corn-seed',
    sprout: 'corn-sprout',
    vegetative: 'corn-vegetative',
    flowering: 'corn-flowering',
    fruiting: 'corn-fruiting',
    mature: 'corn-mature',
    seeding: 'corn-seeding',
    withered: 'corn-withered'
  },

  harvestDestroysPlant: true
};

export const CULTIVATED_CROPS = [WHEAT, POTATO, CARROT, CORN];
