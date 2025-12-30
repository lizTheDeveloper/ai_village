/**
 * Animal Species Data Definitions
 * Defines all animal species and their characteristics
 */

import type {
  AnimalCategory,
  AnimalTemperament,
  AnimalDiet,
  SocialStructure,
  ActivityPattern,
} from '../types/AnimalTypes.js';

export interface AnimalSpecies {
  id: string;
  name: string;
  category: AnimalCategory;
  temperament: AnimalTemperament;
  diet: AnimalDiet;
  socialStructure: SocialStructure;
  activityPattern: ActivityPattern;

  // Capabilities
  canBeTamed: boolean;
  canBeRidden: boolean;
  canBeWorking: boolean;
  canBePet: boolean;

  // Life cycle (in days)
  infantDuration: number; // Days to reach juvenile
  juvenileDuration: number; // Days to reach adult
  adultDuration: number; // Days to reach elder
  maxAge: number; // Maximum lifespan

  // Physical attributes
  baseSize: number; // Size multiplier
  baseSpeed: number; // Movement speed

  // Needs decay rates (points per tick)
  hungerRate: number;
  thirstRate: number;
  energyRate: number;

  // Taming
  tameDifficulty: number; // 0-100, higher = harder to tame
  preferredFood: string[]; // Item IDs for taming

  // Temperature comfort range (Celsius)
  minComfortTemp: number;
  maxComfortTemp: number;

  // Biome spawning
  spawnBiomes: string[];
  spawnDensity: number; // Animals per chunk (0-1 range)
}

/**
 * All animal species definitions
 */
export const ANIMAL_SPECIES: Record<string, AnimalSpecies> = {
  chicken: {
    id: 'chicken',
    name: 'Chicken',
    category: 'livestock',
    temperament: 'docile',
    diet: 'omnivore',
    socialStructure: 'flock',
    activityPattern: 'diurnal',

    canBeTamed: true,
    canBeRidden: false,
    canBeWorking: false,
    canBePet: false,

    infantDuration: 7, // 1 week
    juvenileDuration: 14, // 2 weeks
    adultDuration: 365 * 2, // 2 years
    maxAge: 365 * 8, // 8 years

    baseSize: 0.8,
    baseSpeed: 2.0,

    hungerRate: 0.05,
    thirstRate: 0.03,
    energyRate: 0.02,

    tameDifficulty: 10,
    preferredFood: ['grain', 'seeds', 'corn'],

    minComfortTemp: 0,
    maxComfortTemp: 35,

    spawnBiomes: ['grassland', 'farmland'],
    spawnDensity: 0.3,
  },

  cow: {
    id: 'cow',
    name: 'Cow',
    category: 'livestock',
    temperament: 'docile',
    diet: 'herbivore',
    socialStructure: 'herd',
    activityPattern: 'diurnal',

    canBeTamed: true,
    canBeRidden: false,
    canBeWorking: true, // Can pull plows
    canBePet: false,

    infantDuration: 30, // 1 month
    juvenileDuration: 180, // 6 months
    adultDuration: 365 * 5, // 5 years
    maxAge: 365 * 20, // 20 years

    baseSize: 2.5,
    baseSpeed: 1.5,

    hungerRate: 0.08,
    thirstRate: 0.06,
    energyRate: 0.015,

    tameDifficulty: 20,
    preferredFood: ['grass', 'hay', 'grain'],

    minComfortTemp: -10,
    maxComfortTemp: 30,

    spawnBiomes: ['grassland', 'farmland'],
    spawnDensity: 0.1,
  },

  sheep: {
    id: 'sheep',
    name: 'Sheep',
    category: 'livestock',
    temperament: 'docile',
    diet: 'herbivore',
    socialStructure: 'herd',
    activityPattern: 'diurnal',

    canBeTamed: true,
    canBeRidden: false,
    canBeWorking: false,
    canBePet: false,

    infantDuration: 14, // 2 weeks
    juvenileDuration: 90, // 3 months
    adultDuration: 365 * 3, // 3 years
    maxAge: 365 * 12, // 12 years

    baseSize: 1.5,
    baseSpeed: 2.0,

    hungerRate: 0.06,
    thirstRate: 0.04,
    energyRate: 0.02,

    tameDifficulty: 15,
    preferredFood: ['grass', 'hay', 'grain'],

    minComfortTemp: -5,
    maxComfortTemp: 30,

    spawnBiomes: ['grassland', 'hills', 'farmland'],
    spawnDensity: 0.15,
  },

  horse: {
    id: 'horse',
    name: 'Horse',
    category: 'working',
    temperament: 'neutral',
    diet: 'herbivore',
    socialStructure: 'herd',
    activityPattern: 'diurnal',

    canBeTamed: true,
    canBeRidden: true,
    canBeWorking: true,
    canBePet: false,

    infantDuration: 60, // 2 months
    juvenileDuration: 365, // 1 year
    adultDuration: 365 * 8, // 8 years
    maxAge: 365 * 30, // 30 years

    baseSize: 2.8,
    baseSpeed: 5.0,

    hungerRate: 0.07,
    thirstRate: 0.05,
    energyRate: 0.025,

    tameDifficulty: 40,
    preferredFood: ['hay', 'oats', 'apple', 'carrot'],

    minComfortTemp: -10,
    maxComfortTemp: 35,

    spawnBiomes: ['grassland', 'plains'],
    spawnDensity: 0.05,
  },

  dog: {
    id: 'dog',
    name: 'Dog',
    category: 'pet',
    temperament: 'friendly',
    diet: 'omnivore',
    socialStructure: 'pack',
    activityPattern: 'diurnal',

    canBeTamed: true,
    canBeRidden: false,
    canBeWorking: true, // Can guard, hunt
    canBePet: true,

    infantDuration: 14, // 2 weeks
    juvenileDuration: 90, // 3 months
    adultDuration: 365 * 3, // 3 years
    maxAge: 365 * 15, // 15 years

    baseSize: 1.2,
    baseSpeed: 4.0,

    hungerRate: 0.04,
    thirstRate: 0.03,
    energyRate: 0.03,

    tameDifficulty: 25,
    preferredFood: ['meat', 'bone', 'food'],

    minComfortTemp: -15,
    maxComfortTemp: 35,

    spawnBiomes: ['forest', 'grassland', 'settlement'],
    spawnDensity: 0.02,
  },

  cat: {
    id: 'cat',
    name: 'Cat',
    category: 'pet',
    temperament: 'neutral',
    diet: 'carnivore',
    socialStructure: 'solitary',
    activityPattern: 'crepuscular',

    canBeTamed: true,
    canBeRidden: false,
    canBeWorking: false,
    canBePet: true,

    infantDuration: 7, // 1 week
    juvenileDuration: 30, // 1 month
    adultDuration: 365 * 2, // 2 years
    maxAge: 365 * 18, // 18 years

    baseSize: 0.7,
    baseSpeed: 3.5,

    hungerRate: 0.03,
    thirstRate: 0.02,
    energyRate: 0.015,

    tameDifficulty: 35,
    preferredFood: ['fish', 'meat'],

    minComfortTemp: -5,
    maxComfortTemp: 35,

    spawnBiomes: ['forest', 'settlement'],
    spawnDensity: 0.02,
  },

  rabbit: {
    id: 'rabbit',
    name: 'Rabbit',
    category: 'wild',
    temperament: 'skittish',
    diet: 'herbivore',
    socialStructure: 'pair',
    activityPattern: 'crepuscular',

    canBeTamed: true,
    canBeRidden: false,
    canBeWorking: false,
    canBePet: true,

    infantDuration: 7, // 1 week
    juvenileDuration: 30, // 1 month
    adultDuration: 365, // 1 year
    maxAge: 365 * 10, // 10 years

    baseSize: 0.6,
    baseSpeed: 3.0,

    hungerRate: 0.04,
    thirstRate: 0.02,
    energyRate: 0.02,

    tameDifficulty: 30,
    preferredFood: ['carrot', 'lettuce', 'grass'],

    minComfortTemp: -10,
    maxComfortTemp: 30,

    spawnBiomes: ['grassland', 'forest', 'meadow'],
    spawnDensity: 0.25,
  },

  deer: {
    id: 'deer',
    name: 'Deer',
    category: 'wild',
    temperament: 'skittish',
    diet: 'herbivore',
    socialStructure: 'herd',
    activityPattern: 'crepuscular',

    canBeTamed: false,
    canBeRidden: false,
    canBeWorking: false,
    canBePet: false,

    infantDuration: 30, // 1 month
    juvenileDuration: 180, // 6 months
    adultDuration: 365 * 3, // 3 years
    maxAge: 365 * 15, // 15 years

    baseSize: 2.0,
    baseSpeed: 4.5,

    hungerRate: 0.05,
    thirstRate: 0.04,
    energyRate: 0.025,

    tameDifficulty: 80, // Very hard to tame
    preferredFood: ['grass', 'leaves', 'berries'],

    minComfortTemp: -20,
    maxComfortTemp: 30,

    spawnBiomes: ['forest', 'meadow'],
    spawnDensity: 0.1,
  },

  pig: {
    id: 'pig',
    name: 'Pig',
    category: 'livestock',
    temperament: 'neutral',
    diet: 'omnivore',
    socialStructure: 'herd',
    activityPattern: 'diurnal',

    canBeTamed: true,
    canBeRidden: false,
    canBeWorking: false,
    canBePet: false,

    infantDuration: 14, // 2 weeks
    juvenileDuration: 90, // 3 months
    adultDuration: 365 * 2, // 2 years
    maxAge: 365 * 15, // 15 years

    baseSize: 1.8,
    baseSpeed: 2.0,

    hungerRate: 0.07,
    thirstRate: 0.05,
    energyRate: 0.02,

    tameDifficulty: 20,
    preferredFood: ['grain', 'vegetable', 'food'],

    minComfortTemp: -5,
    maxComfortTemp: 32,

    spawnBiomes: ['forest', 'farmland'],
    spawnDensity: 0.08,
  },

  goat: {
    id: 'goat',
    name: 'Goat',
    category: 'livestock',
    temperament: 'neutral',
    diet: 'herbivore',
    socialStructure: 'herd',
    activityPattern: 'diurnal',

    canBeTamed: true,
    canBeRidden: false,
    canBeWorking: false,
    canBePet: false,

    infantDuration: 14, // 2 weeks
    juvenileDuration: 60, // 2 months
    adultDuration: 365 * 2, // 2 years
    maxAge: 365 * 18, // 18 years

    baseSize: 1.4,
    baseSpeed: 2.5,

    hungerRate: 0.05,
    thirstRate: 0.04,
    energyRate: 0.02,

    tameDifficulty: 18,
    preferredFood: ['grass', 'hay', 'leaves'],

    minComfortTemp: -10,
    maxComfortTemp: 35,

    spawnBiomes: ['hills', 'mountains', 'grassland'],
    spawnDensity: 0.12,
  },
};

/**
 * Get species data by ID
 * Per CLAUDE.md: Throw if species not found (no silent fallback)
 */
export function getAnimalSpecies(speciesId: string): AnimalSpecies {
  const species = ANIMAL_SPECIES[speciesId];
  if (!species) {
    throw new Error(`Unknown animal species: ${speciesId}`);
  }
  return species;
}

/**
 * Check if species can spawn in a given biome
 */
export function canSpawnInBiome(speciesId: string, biome: string): boolean {
  const species = getAnimalSpecies(speciesId);
  return species.spawnBiomes.includes(biome);
}

/**
 * Get all species that can spawn in a biome
 */
export function getSpawnableSpecies(biome: string): AnimalSpecies[] {
  return Object.values(ANIMAL_SPECIES).filter(species =>
    species.spawnBiomes.includes(biome)
  );
}
