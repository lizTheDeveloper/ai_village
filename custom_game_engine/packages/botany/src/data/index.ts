/**
 * Botany data loader
 * Loads diseases, pests, and population configuration from JSON files
 */

import type { PlantDisease, PlantPest } from '@ai-village/core';
import { setDefaultDiseases, setDefaultPests } from '@ai-village/core';
import diseasesData from './diseases.json';
import pestsData from './pests.json';
import populationConfigData from './populationConfig.json';

/**
 * Default diseases
 */
export const DEFAULT_DISEASES: PlantDisease[] = diseasesData as PlantDisease[];

/**
 * Default pests
 */
export const DEFAULT_PESTS: PlantPest[] = pestsData as PlantPest[];

/**
 * Population configuration
 */
export interface PopulationConfig {
  /** Maximum plants per chunk/zone */
  maxDensity: number;
  /** Minimum plants to maintain */
  minPopulation: number;
  /** Chance for natural spawning per tick */
  spawnChance: number;
  /** Radius to check for overcrowding */
  crowdingRadius: number;
}

/**
 * Default population configuration
 */
export const DEFAULT_POPULATION_CONFIG: PopulationConfig = populationConfigData as PopulationConfig;

/**
 * Initialize botany data
 * This sets the default diseases and pests in the core package for backward compatibility
 */
export function initializeBotanyData(): void {
  setDefaultDiseases(DEFAULT_DISEASES);
  setDefaultPests(DEFAULT_PESTS);
}
