/**
 * Animal Species Data Definitions
 *
 * Species data is loaded from animal-species.json
 * This file provides the TypeScript interface and helper functions
 */

import type {
  AnimalCategory,
  AnimalTemperament,
  AnimalDiet,
  SocialStructure,
  ActivityPattern,
} from '../types/AnimalTypes.js';

import animalSpeciesData from '../../data/animal-species.json';

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

  // Intelligence
  intelligence: number; // 0-1, brain complexity/cognitive capability

  // Temperature comfort range (Celsius)
  minComfortTemp: number;
  maxComfortTemp: number;

  // Biome spawning
  spawnBiomes: string[];
  spawnDensity: number; // Animals per chunk (0-1 range)
}

/**
 * All animal species definitions loaded from JSON
 */
export const ANIMAL_SPECIES: Record<string, AnimalSpecies> = animalSpeciesData.species as Record<string, AnimalSpecies>;

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

/**
 * Get all available species IDs
 */
export function getAllSpeciesIds(): string[] {
  return Object.keys(ANIMAL_SPECIES);
}

/**
 * Get all species of a particular category
 */
export function getSpeciesByCategory(category: AnimalCategory): AnimalSpecies[] {
  return Object.values(ANIMAL_SPECIES).filter(species => species.category === category);
}
