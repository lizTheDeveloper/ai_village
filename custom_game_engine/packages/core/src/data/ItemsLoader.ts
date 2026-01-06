/**
 * Items JSON Loader
 *
 * Phase 3: Content Extraction
 * Provides type-safe access to items.json
 */

import type { ItemDefinition } from '../items/ItemDefinition.js';
import itemsData from '../../../../data/items.json';

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

// Cast JSON data to typed interface
const typedItemsData = itemsData as unknown as ItemsData;

/**
 * Get items by category
 */
export function getItemsByCategory(category: keyof ItemsData['categories']): ItemDefinition[] {
  return typedItemsData.categories[category] || [];
}

/**
 * Get all items
 */
export function getAllItems(): ItemDefinition[] {
  return typedItemsData.allItems;
}

/**
 * Get a specific item by ID
 */
export function getItemById(id: string): ItemDefinition | undefined {
  return typedItemsData.allItems.find(item => item.id === id);
}

// Export arrays for backward compatibility
export const RESOURCE_ITEMS = typedItemsData.categories.resources;
export const FOOD_ITEMS = typedItemsData.categories.food;
export const MATERIAL_ITEMS = typedItemsData.categories.materials;
export const TOOL_ITEMS = typedItemsData.categories.tools;
export const WEAPON_ITEMS = typedItemsData.categories.weapons;
export const CONSUMABLE_ITEMS = typedItemsData.categories.consumables;
export const CLOTHING_ITEMS = typedItemsData.categories.clothing;
export const ADVANCED_MATERIAL_ITEMS = typedItemsData.categories.advancedMaterials;
export const PRESERVED_FOOD_ITEMS = typedItemsData.categories.preservedFood;
export const FARMING_TOOL_ITEMS = typedItemsData.categories.farmingTools;
export const DEFAULT_ITEMS = typedItemsData.allItems;
