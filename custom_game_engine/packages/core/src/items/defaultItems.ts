/**
 * Default Item Definitions
 *
 * All base game items are defined here. This is the single source of truth
 * for item properties like weight, stackSize, isEdible, etc.
 *
 * Part of the Item System refactor (work-order: item-system)
 */

import { defineItem, type ItemDefinition } from './ItemDefinition.js';
import defaultItemsData from '../../data/default-items.json';

// Weapon and ammo imports (weapons-expansion)
import { ALL_AMMO_ITEMS } from './ammo/index.js';
import { ALL_MELEE_WEAPONS } from './weapons/melee.js';
import { ALL_TRADITIONAL_RANGED } from './weapons/ranged.js';
import { ALL_FIREARMS } from './weapons/firearms.js';
import { ALL_ENERGY_WEAPONS } from './weapons/energy.js';
import { ALL_EXOTIC_WEAPONS } from './weapons/exotic.js';
import { ALL_MAGIC_WEAPONS } from './weapons/magic.js';
import { ALL_CREATIVE_WEAPONS } from './weapons/creative.js';

/**
 * Helper function to convert JSON data to ItemDefinitions
 */
function loadItemsFromJSON(items: any[]): ItemDefinition[] {
  return items.map((item: any) =>
    defineItem(item.id, item.name, item.category, item)
  );
}

/**
 * Resource items - gathered from the environment
 */
export const RESOURCE_ITEMS: ItemDefinition[] = loadItemsFromJSON(defaultItemsData.resourceItems);

/**
 * Food items - can be eaten to restore hunger
 */
export const FOOD_ITEMS: ItemDefinition[] = loadItemsFromJSON(defaultItemsData.foodItems);

/**
 * Material items - crafted or refined resources
 */
export const MATERIAL_ITEMS: ItemDefinition[] = loadItemsFromJSON(defaultItemsData.materialItems);

/**
 * Tool items - used to gather or craft
 */
export const TOOL_ITEMS: ItemDefinition[] = loadItemsFromJSON(defaultItemsData.toolItems);

/**
 * Weapon items - used for combat and hunting
 * NOTE: iron_sword and steel_sword are now defined in weapons/melee.ts with full weapon traits
 */
export const WEAPON_ITEMS: ItemDefinition[] = loadItemsFromJSON(defaultItemsData.weaponItems);

/**
 * Consumable items - potions, medicines, etc.
 */
export const CONSUMABLE_ITEMS: ItemDefinition[] = loadItemsFromJSON(defaultItemsData.consumableItems);

/**
 * Clothing and armor items
 */
export const CLOTHING_ITEMS: ItemDefinition[] = loadItemsFromJSON(defaultItemsData.clothingItems);

/**
 * Advanced material items - legendary metals, etc.
 */
export const ADVANCED_MATERIAL_ITEMS: ItemDefinition[] = loadItemsFromJSON(defaultItemsData.advancedMaterialItems);

/**
 * Preserved food items
 */
export const PRESERVED_FOOD_ITEMS: ItemDefinition[] = loadItemsFromJSON(defaultItemsData.preservedFoodItems);

/**
 * Farming tools
 */
export const FARMING_TOOL_ITEMS: ItemDefinition[] = loadItemsFromJSON(defaultItemsData.farmingToolItems);

/**
 * All default items combined
 */
export const DEFAULT_ITEMS: ItemDefinition[] = [
  ...RESOURCE_ITEMS,
  ...FOOD_ITEMS,
  ...PRESERVED_FOOD_ITEMS,
  ...MATERIAL_ITEMS,
  ...ADVANCED_MATERIAL_ITEMS,
  ...TOOL_ITEMS,
  ...FARMING_TOOL_ITEMS,
  ...WEAPON_ITEMS,
  ...CONSUMABLE_ITEMS,
  ...CLOTHING_ITEMS,
  // Weapons expansion
  ...ALL_AMMO_ITEMS,
  ...ALL_MELEE_WEAPONS,
  ...ALL_TRADITIONAL_RANGED,
  ...ALL_FIREARMS,
  ...ALL_ENERGY_WEAPONS,
  ...ALL_EXOTIC_WEAPONS,
  ...ALL_MAGIC_WEAPONS,
  ...ALL_CREATIVE_WEAPONS,
];

/**
 * Initialize the item registry with all default items
 */
export function registerDefaultItems(registry: { registerAll: (items: ItemDefinition[]) => void }): void {
  registry.registerAll(DEFAULT_ITEMS);
}
