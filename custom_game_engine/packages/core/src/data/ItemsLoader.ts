/**
 * Items JSON Loader
 *
 * Phase 3: Content Extraction
 * Provides type-safe access to items.json with lazy loading
 */

import type { ItemDefinition } from '../items/ItemDefinition.js';

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

// Lazy-loaded data cache
let typedItemsData: ItemsData | null = null;

/**
 * Load items data on first access
 */
function loadItemsData(): ItemsData {
  if (!typedItemsData) {
    // Dynamic import to defer loading until needed
    const itemsData = require('../../../../data/items.json');
    typedItemsData = itemsData as unknown as ItemsData;
  }
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

// Deprecated: Use getter functions instead
// These are kept for backward compatibility but trigger lazy loading
Object.defineProperty(exports, 'RESOURCE_ITEMS', { get: getResourceItems });
Object.defineProperty(exports, 'FOOD_ITEMS', { get: getFoodItems });
Object.defineProperty(exports, 'MATERIAL_ITEMS', { get: getMaterialItems });
Object.defineProperty(exports, 'TOOL_ITEMS', { get: getToolItems });
Object.defineProperty(exports, 'WEAPON_ITEMS', { get: getWeaponItems });
Object.defineProperty(exports, 'CONSUMABLE_ITEMS', { get: getConsumableItems });
Object.defineProperty(exports, 'CLOTHING_ITEMS', { get: getClothingItems });
Object.defineProperty(exports, 'ADVANCED_MATERIAL_ITEMS', { get: getAdvancedMaterialItems });
Object.defineProperty(exports, 'PRESERVED_FOOD_ITEMS', { get: getPreservedFoodItems });
Object.defineProperty(exports, 'FARMING_TOOL_ITEMS', { get: getFarmingToolItems });
Object.defineProperty(exports, 'DEFAULT_ITEMS', { get: getAllItems });
