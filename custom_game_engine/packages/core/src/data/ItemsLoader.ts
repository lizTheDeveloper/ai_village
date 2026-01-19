/**
 * Items JSON Loader
 *
 * Phase 3: Content Extraction
 * Provides type-safe access to items.json
 */

import type { ItemDefinition } from '../items/ItemDefinition.js';
import itemsDataRaw from '../../../../data/items.json';

export interface ItemsData {
  version: string;
  generatedAt: string;
  source: string;
  categories: {
    resources: ItemDefinition[];
    food: ItemDefinition[];
    materials: ItemDefinition[];
    tools: ItemDefinition[];
    weapons: ItemDefinition[];
    consumables: ItemDefinition[];
    clothing: ItemDefinition[];
    advancedMaterials: ItemDefinition[];
    preservedFood: ItemDefinition[];
    farmingTools: ItemDefinition[];
  };
  allItems: ItemDefinition[];
}

// Cast imported data to typed interface
const typedItemsData = itemsDataRaw as unknown as ItemsData;

/**
 * Get items data
 */
function loadItemsData(): ItemsData {
  return typedItemsData;
}

/**
 * Get items by category
 */
export function getItemsByCategory(category: keyof ItemsData['categories']): ItemDefinition[] {
  const data = loadItemsData();
  return data.categories[category] || [];
}

/**
 * Get all items
 */
export function getAllItems(): ItemDefinition[] {
  const data = loadItemsData();
  return data.allItems;
}

/**
 * Get a specific item by ID
 */
export function getItemById(id: string): ItemDefinition | undefined {
  const data = loadItemsData();
  return data.allItems.find(item => item.id === id);
}

// Lazy getters for backward compatibility
export function getResourceItems(): ItemDefinition[] {
  return getItemsByCategory('resources');
}

export function getFoodItems(): ItemDefinition[] {
  return getItemsByCategory('food');
}

export function getMaterialItems(): ItemDefinition[] {
  return getItemsByCategory('materials');
}

export function getToolItems(): ItemDefinition[] {
  return getItemsByCategory('tools');
}

export function getWeaponItems(): ItemDefinition[] {
  return getItemsByCategory('weapons');
}

export function getConsumableItems(): ItemDefinition[] {
  return getItemsByCategory('consumables');
}

export function getClothingItems(): ItemDefinition[] {
  return getItemsByCategory('clothing');
}

export function getAdvancedMaterialItems(): ItemDefinition[] {
  return getItemsByCategory('advancedMaterials');
}

export function getPreservedFoodItems(): ItemDefinition[] {
  return getItemsByCategory('preservedFood');
}

export function getFarmingToolItems(): ItemDefinition[] {
  return getItemsByCategory('farmingTools');
}

// Deprecated backward compatibility exports removed
// Use getter functions instead: getResourceItems(), getFoodItems(), etc.
