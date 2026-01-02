import type { PlantSpecies } from '@ai-village/core';
// import { BASE_CROPS } from './base-crops.js'; // WIP - disabled
import { WILD_PLANTS } from './wild-plants.js';
import { MEDICINAL_PLANTS } from './medicinal-plants.js';
import { MAGICAL_PLANTS } from './magical-plants.js';
import { TROPICAL_PLANTS } from './tropical-plants.js';
import { WETLAND_PLANTS } from './wetland-plants.js';
import { CULTIVATED_CROPS } from './cultivated-crops.js';

// All plant species
const ALL_SPECIES: PlantSpecies[] = [
  /* ...BASE_CROPS, */
  ...WILD_PLANTS,
  ...CULTIVATED_CROPS,
  ...MEDICINAL_PLANTS,
  ...MAGICAL_PLANTS,
  ...TROPICAL_PLANTS,
  ...WETLAND_PLANTS,
];

// Species lookup map
const SPECIES_MAP = new Map<string, PlantSpecies>();
for (const species of ALL_SPECIES) {
  SPECIES_MAP.set(species.id, species);
}

/**
 * Get a plant species by ID
 * @throws Error if species not found (NO FALLBACK)
 */
export function getPlantSpecies(speciesId: string): PlantSpecies {
  const species = SPECIES_MAP.get(speciesId);
  if (!species) {
    throw new Error(`PlantSpecies not found: ${speciesId}`);
  }
  return species;
}

/**
 * Get all plant species
 */
export function getAllPlantSpecies(): PlantSpecies[] {
  return [...ALL_SPECIES];
}

/**
 * Get species by category
 */
export function getSpeciesByCategory(category: string): PlantSpecies[] {
  return ALL_SPECIES.filter(s => s.category === category);
}

/**
 * Get wild species suitable for spawning
 */
export function getWildSpawnableSpecies(): PlantSpecies[] {
  return WILD_PLANTS;
}

/**
 * Get species by biome
 */
export function getSpeciesByBiome(biome: string): PlantSpecies[] {
  return ALL_SPECIES.filter(s => s.biomes.includes(biome));
}

/**
 * Get species by rarity
 */
export function getSpeciesByRarity(rarity: 'common' | 'uncommon' | 'rare' | 'legendary'): PlantSpecies[] {
  return ALL_SPECIES.filter(s => s.rarity === rarity);
}

/**
 * Get medicinal plants
 */
export function getMedicinalPlants(): PlantSpecies[] {
  return ALL_SPECIES.filter(s => s.properties?.medicinal);
}

/**
 * Get magical plants
 */
export function getMagicalPlants(): PlantSpecies[] {
  return ALL_SPECIES.filter(s => s.properties?.magical);
}

/**
 * Get cultivated crops suitable for farming
 */
export function getCultivatedCrops(): PlantSpecies[] {
  return CULTIVATED_CROPS;
}

// Re-export species arrays
// export { BASE_CROPS, WILD_PLANTS }; // WIP - BASE_CROPS disabled
export { WILD_PLANTS, CULTIVATED_CROPS, MEDICINAL_PLANTS, MAGICAL_PLANTS, TROPICAL_PLANTS, WETLAND_PLANTS };
// export * from './base-crops.js'; // WIP - disabled
export * from './wild-plants.js';
export * from './cultivated-crops.js';
export * from './medicinal-plants.js';
export * from './magical-plants.js';
export * from './tropical-plants.js';
export * from './wetland-plants.js';
