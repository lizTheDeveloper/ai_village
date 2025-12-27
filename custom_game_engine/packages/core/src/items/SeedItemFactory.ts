/**
 * SeedItemFactory - Factory for creating seed item definitions
 *
 * Seeds are special items that grow into plants. They follow a naming
 * convention of "seed:{speciesId}" and are dynamically created based
 * on the plant species registry.
 *
 * Part of the Item System refactor (work-order: item-system)
 */

import { defineItem, type ItemDefinition } from './ItemDefinition.js';
import type { ItemRegistry } from './ItemRegistry.js';

/**
 * Seed item ID prefix
 */
export const SEED_PREFIX = 'seed:';

/**
 * Check if an item ID is a seed
 */
export function isSeedItemId(itemId: string): boolean {
  return itemId.startsWith(SEED_PREFIX);
}

/**
 * Extract species ID from seed item ID
 * @example getSeedSpeciesId('seed:oak') // returns 'oak'
 */
export function getSeedSpeciesId(itemId: string): string {
  if (!isSeedItemId(itemId)) {
    throw new Error(`Not a seed item ID: ${itemId}`);
  }
  return itemId.substring(SEED_PREFIX.length);
}

/**
 * Create a seed item ID from species ID
 * @example createSeedItemId('oak') // returns 'seed:oak'
 */
export function createSeedItemId(speciesId: string): string {
  return `${SEED_PREFIX}${speciesId}`;
}

/**
 * Default seed properties
 */
const DEFAULT_SEED_WEIGHT = 0.1;
const DEFAULT_SEED_STACK_SIZE = 100;

/**
 * Create a seed item definition for a plant species
 */
export function createSeedItem(
  speciesId: string,
  displayName: string,
  options: {
    weight?: number;
    stackSize?: number;
    gatherSources?: string[];
  } = {}
): ItemDefinition {
  return defineItem(createSeedItemId(speciesId), `${displayName} Seed`, 'seed', {
    weight: options.weight ?? DEFAULT_SEED_WEIGHT,
    stackSize: options.stackSize ?? DEFAULT_SEED_STACK_SIZE,
    isEdible: false,
    isStorable: true,
    isGatherable: true,
    gatherSources: options.gatherSources ?? [speciesId],
    growsInto: speciesId,
  });
}

/**
 * Common plant species with their seed definitions
 */
export const DEFAULT_SEEDS: ItemDefinition[] = [
  createSeedItem('oak', 'Oak', { gatherSources: ['oak_tree'] }),
  createSeedItem('pine', 'Pine', { gatherSources: ['pine_tree'] }),
  createSeedItem('birch', 'Birch', { gatherSources: ['birch_tree'] }),
  createSeedItem('apple', 'Apple', { gatherSources: ['apple_tree'] }),
  createSeedItem('berry_bush', 'Berry Bush', { gatherSources: ['berry_bush'] }),
  createSeedItem('wheat', 'Wheat', { gatherSources: ['wheat_plant'] }),
  createSeedItem('carrot', 'Carrot', { gatherSources: ['carrot_plant'] }),
  createSeedItem('potato', 'Potato', { gatherSources: ['potato_plant'] }),
  createSeedItem('tomato', 'Tomato', { gatherSources: ['tomato_plant'] }),
  createSeedItem('corn', 'Corn', { gatherSources: ['corn_plant'] }),
  createSeedItem('pumpkin', 'Pumpkin', { gatherSources: ['pumpkin_plant'] }),
  createSeedItem('sunflower', 'Sunflower', { gatherSources: ['sunflower'] }),
  createSeedItem('flax', 'Flax', { gatherSources: ['flax_plant'] }),
  createSeedItem('cotton', 'Cotton', { gatherSources: ['cotton_plant'] }),
];

/**
 * Register all default seeds in a registry
 */
export function registerDefaultSeeds(registry: ItemRegistry): void {
  registry.registerAll(DEFAULT_SEEDS);
}

/**
 * Interface for plant species info (minimal for seed registration)
 */
export interface PlantSpeciesInfo {
  id: string;
  displayName: string;
}

/**
 * Register seeds for a list of plant species
 * Use this when you have a PlantRegistry or species list
 */
export function registerSeedsForSpecies(
  registry: ItemRegistry,
  species: readonly PlantSpeciesInfo[]
): void {
  for (const plant of species) {
    const seedId = createSeedItemId(plant.id);

    // Skip if already registered
    if (registry.has(seedId)) continue;

    registry.register(createSeedItem(plant.id, plant.displayName));
  }
}
