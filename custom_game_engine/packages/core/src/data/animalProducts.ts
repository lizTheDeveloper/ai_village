/**
 * Animal Product Definitions
 * Defines products that animals can produce
 */

import type { ProductionType, AnimalLifeStage } from '../types/AnimalTypes.js';

export interface AnimalProduct {
  id: string;
  name: string;
  sourceSpecies: string[]; // Species that can produce this product
  productionType: ProductionType;

  // Production conditions
  minLifeStage: AnimalLifeStage;
  minHealth: number; // 0-100
  minBondLevel?: number; // Required bond level (for continuous products like milking)

  // Production timing (for periodic products)
  productionInterval?: number; // Days between production

  // Production quantity
  minQuantity: number;
  maxQuantity: number;

  // Quality factors (affect product quality 0-100)
  healthFactor: number; // Weight of health in quality calculation
  bondFactor: number; // Weight of bond level in quality calculation
  dietFactor: number; // Weight of diet quality in quality calculation
  geneticsFactor: number; // Weight of genetics in quality calculation

  // Item produced
  itemId: string; // ID of item to create in inventory
}

/**
 * Animal product definitions
 */
export const ANIMAL_PRODUCTS: Record<string, AnimalProduct> = {
  // Eggs
  chicken_egg: {
    id: 'chicken_egg',
    name: 'Chicken Egg',
    sourceSpecies: ['chicken'],
    productionType: 'periodic',
    minLifeStage: 'adult',
    minHealth: 30,
    productionInterval: 1, // 1 day
    minQuantity: 1,
    maxQuantity: 1,
    healthFactor: 0.4,
    bondFactor: 0.1,
    dietFactor: 0.3,
    geneticsFactor: 0.2,
    itemId: 'egg',
  },

  // Milk
  cow_milk: {
    id: 'cow_milk',
    name: 'Cow Milk',
    sourceSpecies: ['cow'],
    productionType: 'continuous',
    minLifeStage: 'adult',
    minHealth: 50,
    minBondLevel: 20, // Need some trust to milk
    minQuantity: 1,
    maxQuantity: 3,
    healthFactor: 0.3,
    bondFactor: 0.2,
    dietFactor: 0.3,
    geneticsFactor: 0.2,
    itemId: 'milk',
  },

  // Wool
  sheep_wool: {
    id: 'sheep_wool',
    name: 'Sheep Wool',
    sourceSpecies: ['sheep'],
    productionType: 'periodic',
    minLifeStage: 'juvenile',
    minHealth: 40,
    productionInterval: 90, // 90 days (seasonal shearing)
    minQuantity: 1,
    maxQuantity: 3,
    healthFactor: 0.3,
    bondFactor: 0.1,
    dietFactor: 0.4,
    geneticsFactor: 0.2,
    itemId: 'wool',
  },

  goat_milk: {
    id: 'goat_milk',
    name: 'Goat Milk',
    sourceSpecies: ['goat'],
    productionType: 'continuous',
    minLifeStage: 'adult',
    minHealth: 50,
    minBondLevel: 20,
    minQuantity: 1,
    maxQuantity: 2,
    healthFactor: 0.3,
    bondFactor: 0.2,
    dietFactor: 0.3,
    geneticsFactor: 0.2,
    itemId: 'goat_milk',
  },

  rabbit_fur: {
    id: 'rabbit_fur',
    name: 'Rabbit Fur',
    sourceSpecies: ['rabbit'],
    productionType: 'terminal', // Only on death/butchering
    minLifeStage: 'juvenile',
    minHealth: 0, // Can harvest even from dead
    minQuantity: 1,
    maxQuantity: 1,
    healthFactor: 0.4,
    bondFactor: 0.0,
    dietFactor: 0.3,
    geneticsFactor: 0.3,
    itemId: 'rabbit_fur',
  },
};

// Aliases for test compatibility - require these to exist
const chickenEgg = ANIMAL_PRODUCTS.chicken_egg;
if (!chickenEgg) {
  throw new Error('chicken_egg product must exist for egg alias');
}
const cowMilk = ANIMAL_PRODUCTS.cow_milk;
if (!cowMilk) {
  throw new Error('cow_milk product must exist for milk alias');
}
const sheepWool = ANIMAL_PRODUCTS.sheep_wool;
if (!sheepWool) {
  throw new Error('sheep_wool product must exist for wool alias');
}

ANIMAL_PRODUCTS.egg = chickenEgg;
ANIMAL_PRODUCTS.milk = cowMilk;
ANIMAL_PRODUCTS.wool = sheepWool;

/**
 * Get all products for a given species
 */
export function getProductsForSpecies(speciesId: string): AnimalProduct[] {
  const products: AnimalProduct[] = [];

  // Map species to their products
  const speciesProducts: Record<string, string[]> = {
    chicken: ['chicken_egg'],
    cow: ['cow_milk'],
    sheep: ['sheep_wool'],
    goat: ['goat_milk'],
    rabbit: ['rabbit_fur'],
  };

  const productIds = speciesProducts[speciesId];
  if (!productIds) {
    return [];
  }

  for (const productId of productIds) {
    const product = ANIMAL_PRODUCTS[productId];
    if (product) {
      products.push(product);
    }
  }

  return products;
}

/**
 * Check if an animal can produce a product
 */
export function canProduceProduct(
  product: AnimalProduct,
  animalData: {
    lifeStage: string;
    health: number;
    bondLevel: number;
  }
): boolean {
  // Check life stage
  const lifeStages = ['infant', 'juvenile', 'adult', 'elder'];
  const animalStageIndex = lifeStages.indexOf(animalData.lifeStage);
  const minStageIndex = lifeStages.indexOf(product.minLifeStage);

  if (animalStageIndex < minStageIndex) {
    return false;
  }

  // Check health
  if (animalData.health < product.minHealth) {
    return false;
  }

  // Check bond level (if required)
  if (product.minBondLevel !== undefined && animalData.bondLevel < product.minBondLevel) {
    return false;
  }

  return true;
}

/**
 * Calculate product quality based on animal stats
 */
export function calculateProductQuality(
  product: AnimalProduct,
  animalData: {
    health: number;
    bondLevel: number;
  },
  dietQuality: number = 50,
  genetics: number = 50
): number {
  let quality = 0;

  quality += (animalData.health / 100) * product.healthFactor;
  quality += (animalData.bondLevel / 100) * product.bondFactor;
  quality += (dietQuality / 100) * product.dietFactor;
  quality += (genetics / 100) * product.geneticsFactor;

  // Normalize to 0-100 range
  return Math.max(0, Math.min(100, quality * 100));
}
