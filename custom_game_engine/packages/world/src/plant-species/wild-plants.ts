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
    dye: true
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

export const BERRY_BUSH: PlantSpecies = {
  id: 'berry-bush',
  name: 'Berry Bush',
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
    edible: true
  },

  sprites: {
    seed: 'berry-bush-seed',
    sprout: 'berry-bush-sprout',
    vegetative: 'berry-bush-vegetative',
    flowering: 'berry-bush-flowering',
    fruiting: 'berry-bush-fruiting',
    mature: 'berry-bush-mature',
    seeding: 'berry-bush-seeding',
    withered: 'berry-bush-withered'
  }
};

export const WILD_PLANTS = [GRASS, WILDFLOWER, BERRY_BUSH];
