/**
 * Default Item Definitions
 *
 * All base game items are defined here. This is the single source of truth
 * for item properties like weight, stackSize, isEdible, etc.
 *
 * Part of the Item System refactor (work-order: item-system)
 */

import { defineItem, type ItemDefinition } from './ItemDefinition.js';

/**
 * Resource items - gathered from the environment
 */
export const RESOURCE_ITEMS: ItemDefinition[] = [
  defineItem('wood', 'Wood', 'resource', {
    weight: 2.0,
    stackSize: 50,
    isGatherable: true,
    gatherSources: ['tree', 'dead_tree'],
    requiredTool: 'axe',
  }),

  defineItem('stone', 'Stone', 'resource', {
    weight: 3.0,
    stackSize: 50,
    isGatherable: true,
    gatherSources: ['rock', 'boulder'],
    requiredTool: 'pickaxe',
  }),

  defineItem('fiber', 'Plant Fiber', 'resource', {
    weight: 0.5,
    stackSize: 100,
    isGatherable: true,
    gatherSources: ['grass', 'plant', 'flax'],
  }),

  defineItem('leaves', 'Leaves', 'resource', {
    weight: 0.3,
    stackSize: 100,
    isGatherable: true,
    gatherSources: ['tree', 'bush'],
  }),

  defineItem('water', 'Water', 'resource', {
    weight: 1.0,
    stackSize: 20,
    isGatherable: true,
    gatherSources: ['water_source', 'well', 'river'],
  }),

  // Legacy 'food' resource type for backward compatibility
  defineItem('food', 'Food', 'resource', {
    weight: 0.5,
    stackSize: 50,
    isEdible: true,
    hungerRestored: 20,
    isGatherable: true,
  }),
];

/**
 * Food items - can be eaten to restore hunger
 */
export const FOOD_ITEMS: ItemDefinition[] = [
  defineItem('berry', 'Berry', 'food', {
    weight: 0.2,
    stackSize: 50,
    isEdible: true,
    hungerRestored: 15,
    isGatherable: true,
    gatherSources: ['berry_bush'],
  }),

  defineItem('wheat', 'Wheat', 'food', {
    weight: 0.3,
    stackSize: 50,
    isEdible: true,
    hungerRestored: 10,
    isGatherable: true,
    gatherSources: ['wheat_plant'],
  }),

  defineItem('apple', 'Apple', 'food', {
    weight: 0.3,
    stackSize: 30,
    isEdible: true,
    hungerRestored: 20,
    isGatherable: true,
    gatherSources: ['apple_tree'],
  }),

  defineItem('carrot', 'Carrot', 'food', {
    weight: 0.2,
    stackSize: 40,
    isEdible: true,
    hungerRestored: 15,
    isGatherable: true,
    gatherSources: ['carrot_plant'],
  }),

  defineItem('raw_meat', 'Raw Meat', 'food', {
    weight: 1.0,
    stackSize: 20,
    isEdible: true,
    hungerRestored: 15, // Less than cooked
    isGatherable: false, // Comes from hunting
  }),

  defineItem('cooked_meat', 'Cooked Meat', 'food', {
    weight: 0.8,
    stackSize: 20,
    isEdible: true,
    hungerRestored: 50,
    isGatherable: false,
    craftedFrom: [{ itemId: 'raw_meat', amount: 1 }],
  }),

  defineItem('bread', 'Bread', 'food', {
    weight: 0.5,
    stackSize: 20,
    isEdible: true,
    hungerRestored: 40,
    isGatherable: false,
    craftedFrom: [{ itemId: 'wheat', amount: 3 }],
  }),

  defineItem('fish', 'Fish', 'food', {
    weight: 0.5,
    stackSize: 20,
    isEdible: true,
    hungerRestored: 25,
    isGatherable: true,
    gatherSources: ['fishing_spot'],
    requiredTool: 'fishing_rod',
  }),

  defineItem('egg', 'Egg', 'food', {
    weight: 0.2,
    stackSize: 30,
    isEdible: true,
    hungerRestored: 10,
    isGatherable: false, // Comes from chickens
  }),

  defineItem('milk', 'Milk', 'food', {
    weight: 0.5,
    stackSize: 10,
    isEdible: true,
    hungerRestored: 15,
    isGatherable: false, // Comes from cows
  }),
];

/**
 * Material items - crafted or refined resources
 */
export const MATERIAL_ITEMS: ItemDefinition[] = [
  defineItem('iron_ore', 'Iron Ore', 'material', {
    weight: 4.0,
    stackSize: 30,
    isGatherable: true,
    gatherSources: ['iron_deposit'],
    requiredTool: 'pickaxe',
  }),

  defineItem('iron_ingot', 'Iron Ingot', 'material', {
    weight: 3.0,
    stackSize: 30,
    isGatherable: false,
    craftedFrom: [{ itemId: 'iron_ore', amount: 2 }],
  }),

  defineItem('coal', 'Coal', 'material', {
    weight: 1.5,
    stackSize: 50,
    isGatherable: true,
    gatherSources: ['coal_deposit'],
    requiredTool: 'pickaxe',
  }),

  defineItem('gold_ore', 'Gold Ore', 'material', {
    weight: 5.0,
    stackSize: 20,
    isGatherable: true,
    gatherSources: ['gold_deposit'],
    requiredTool: 'pickaxe',
  }),

  defineItem('copper_ore', 'Copper Ore', 'material', {
    weight: 3.5,
    stackSize: 30,
    isGatherable: true,
    gatherSources: ['copper_deposit'],
    requiredTool: 'pickaxe',
  }),

  defineItem('cloth', 'Cloth', 'material', {
    weight: 0.5,
    stackSize: 50,
    isGatherable: false,
    craftedFrom: [{ itemId: 'fiber', amount: 3 }],
  }),

  defineItem('rope', 'Rope', 'material', {
    weight: 0.8,
    stackSize: 30,
    isGatherable: false,
    craftedFrom: [{ itemId: 'fiber', amount: 5 }],
  }),

  defineItem('plank', 'Wooden Plank', 'material', {
    weight: 1.5,
    stackSize: 50,
    isGatherable: false,
    craftedFrom: [{ itemId: 'wood', amount: 1 }],
  }),
];

/**
 * Tool items - used to gather or craft
 */
export const TOOL_ITEMS: ItemDefinition[] = [
  defineItem('axe', 'Axe', 'tool', {
    weight: 3.0,
    stackSize: 1,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'wood', amount: 2 },
      { itemId: 'stone', amount: 3 },
    ],
  }),

  defineItem('pickaxe', 'Pickaxe', 'tool', {
    weight: 3.5,
    stackSize: 1,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'wood', amount: 2 },
      { itemId: 'stone', amount: 3 },
    ],
  }),

  defineItem('hoe', 'Hoe', 'tool', {
    weight: 2.5,
    stackSize: 1,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'wood', amount: 2 },
      { itemId: 'stone', amount: 2 },
    ],
  }),

  defineItem('fishing_rod', 'Fishing Rod', 'tool', {
    weight: 1.5,
    stackSize: 1,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'wood', amount: 3 },
      { itemId: 'fiber', amount: 2 },
    ],
  }),

  defineItem('hammer', 'Hammer', 'tool', {
    weight: 2.0,
    stackSize: 1,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'wood', amount: 1 },
      { itemId: 'stone', amount: 2 },
    ],
  }),
];

/**
 * All default items combined
 */
export const DEFAULT_ITEMS: ItemDefinition[] = [
  ...RESOURCE_ITEMS,
  ...FOOD_ITEMS,
  ...MATERIAL_ITEMS,
  ...TOOL_ITEMS,
];

/**
 * Initialize the item registry with all default items
 */
export function registerDefaultItems(registry: { registerAll: (items: ItemDefinition[]) => void }): void {
  registry.registerAll(DEFAULT_ITEMS);
}
