/**
 * Default Item Definitions
 *
 * All base game items are defined here. This is the single source of truth
 * for item properties like weight, stackSize, isEdible, etc.
 *
 * Part of the Item System refactor (work-order: item-system)
 */

import { defineItem, type ItemDefinition } from './ItemDefinition.js';

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
 * Resource items - gathered from the environment
 */
export const RESOURCE_ITEMS: ItemDefinition[] = [
  defineItem('wood', 'Wood', 'resource', {
    weight: 2.0,
    stackSize: 50,
    isGatherable: true,
    gatherSources: ['tree', 'dead_tree'],
    requiredTool: 'axe',
    baseValue: 5,
    rarity: 'common',
  }),

  defineItem('stone', 'Stone', 'resource', {
    weight: 3.0,
    stackSize: 30,
    isGatherable: true,
    gatherSources: ['rock', 'boulder'],
    requiredTool: 'pickaxe',
    baseValue: 4,
    rarity: 'common',
  }),

  defineItem('fiber', 'Plant Fiber', 'resource', {
    weight: 0.5,
    stackSize: 100,
    isGatherable: true,
    gatherSources: ['grass', 'plant', 'flax'],
    baseValue: 2,
    rarity: 'common',
  }),

  defineItem('leaves', 'Leaves', 'resource', {
    weight: 0.3,
    stackSize: 100,
    isGatherable: true,
    gatherSources: ['tree', 'bush'],
    baseValue: 1,
    rarity: 'common',
  }),

  defineItem('water', 'Water', 'resource', {
    weight: 1.0,
    stackSize: 10,
    isGatherable: true,
    gatherSources: ['water_source', 'well', 'river'],
    baseValue: 3,
    rarity: 'common',
  }),

  // Legacy 'food' resource type for backward compatibility
  defineItem('food', 'Food', 'resource', {
    weight: 0.5,
    stackSize: 20,
    isEdible: true,
    hungerRestored: 20,
    quality: 40, // Generic foraged food
    flavors: ['savory'],
    isGatherable: true,
    baseValue: 8,
    rarity: 'common',
  }),
];

/**
 * Food items - can be eaten to restore hunger
 */
export const FOOD_ITEMS: ItemDefinition[] = [
  defineItem('berry', 'Berry', 'food', {
    weight: 0.2,
    stackSize: 50,
    baseMaterial: 'organic',
    traits: {
      edible: {
        hungerRestored: 15,
        quality: 40,
        flavors: ['sweet', 'sour'],
        spoilRate: 0.1,
      },
    },
    // Legacy fields for backward compatibility
    isEdible: true,
    hungerRestored: 15,
    quality: 40,
    flavors: ['sweet', 'sour'],
    isGatherable: true,
    gatherSources: ['berry_bush'],
    baseValue: 6,
    rarity: 'common',
  }),

  defineItem('wheat', 'Wheat', 'food', {
    weight: 0.3,
    stackSize: 50,
    isEdible: true,
    hungerRestored: 10,
    quality: 25, // Raw grain, not very satisfying
    flavors: ['bitter'],
    isGatherable: true,
    gatherSources: ['wheat_plant'],
    baseValue: 5,
    rarity: 'common',
  }),

  defineItem('apple', 'Apple', 'food', {
    weight: 0.3,
    stackSize: 30,
    isEdible: true,
    hungerRestored: 20,
    quality: 55, // Fresh fruit, enjoyable
    flavors: ['sweet'],
    isGatherable: true,
    gatherSources: ['apple_tree'],
    baseValue: 8,
    rarity: 'common',
  }),

  defineItem('carrot', 'Carrot', 'food', {
    weight: 0.2,
    stackSize: 40,
    isEdible: true,
    hungerRestored: 15,
    quality: 45, // Fresh vegetable
    flavors: ['sweet'],
    isGatherable: true,
    gatherSources: ['carrot_plant'],
    baseValue: 6,
    rarity: 'common',
  }),

  defineItem('raw_meat', 'Raw Meat', 'food', {
    weight: 1.0,
    stackSize: 20,
    isEdible: true,
    hungerRestored: 15, // Less than cooked
    quality: 20, // Raw meat - unpleasant to eat
    flavors: ['umami', 'bitter'],
    isGatherable: false, // Comes from hunting
    baseValue: 12,
    rarity: 'common',
  }),

  defineItem('cooked_meat', 'Cooked Meat', 'food', {
    weight: 0.8,
    stackSize: 20,
    isEdible: true,
    hungerRestored: 50,
    quality: 75, // Well-prepared, satisfying meal
    flavors: ['savory', 'umami'],
    isGatherable: false,
    craftedFrom: [{ itemId: 'raw_meat', amount: 1 }],
    baseValue: 25,
    rarity: 'uncommon',
  }),

  defineItem('bread', 'Bread', 'food', {
    weight: 0.5,
    stackSize: 20,
    isEdible: true,
    hungerRestored: 40,
    quality: 65, // Crafted, comfort food
    flavors: ['savory'],
    isGatherable: false,
    craftedFrom: [{ itemId: 'wheat', amount: 3 }],
    baseValue: 20,
    rarity: 'common',
  }),

  defineItem('fish', 'Fish', 'food', {
    weight: 0.5,
    stackSize: 20,
    isEdible: true,
    hungerRestored: 25,
    quality: 50, // Fresh catch
    flavors: ['savory', 'umami'],
    isGatherable: true,
    gatherSources: ['fishing_spot'],
    requiredTool: 'fishing_rod',
    baseValue: 15,
    rarity: 'common',
  }),

  defineItem('egg', 'Egg', 'food', {
    weight: 0.2,
    stackSize: 30,
    isEdible: true,
    hungerRestored: 10,
    quality: 45, // Fresh, basic nutrition
    flavors: ['savory'],
    isGatherable: false, // Comes from chickens
    baseValue: 7,
    rarity: 'common',
  }),

  defineItem('milk', 'Milk', 'food', {
    weight: 0.5,
    stackSize: 10,
    isEdible: true,
    hungerRestored: 15,
    quality: 50, // Fresh, wholesome
    flavors: ['sweet'],
    isGatherable: false, // Comes from cows
    baseValue: 10,
    rarity: 'common',
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
    baseValue: 15,
    rarity: 'uncommon',
  }),

  defineItem('iron_ingot', 'Iron Ingot', 'material', {
    weight: 3.0,
    stackSize: 30,
    isGatherable: false,
    craftedFrom: [{ itemId: 'iron_ore', amount: 2 }],
    baseValue: 35,
    rarity: 'uncommon',
  }),

  defineItem('coal', 'Coal', 'material', {
    weight: 1.5,
    stackSize: 50,
    isGatherable: true,
    gatherSources: ['coal_deposit'],
    requiredTool: 'pickaxe',
    baseValue: 8,
    rarity: 'common',
  }),

  defineItem('gold_ore', 'Gold Ore', 'material', {
    weight: 5.0,
    stackSize: 20,
    isGatherable: true,
    gatherSources: ['gold_deposit'],
    requiredTool: 'pickaxe',
    baseValue: 50,
    rarity: 'rare',
  }),

  defineItem('copper_ore', 'Copper Ore', 'material', {
    weight: 3.5,
    stackSize: 30,
    isGatherable: true,
    gatherSources: ['copper_deposit'],
    requiredTool: 'pickaxe',
    baseValue: 12,
    rarity: 'uncommon',
  }),

  defineItem('copper_ingot', 'Copper Ingot', 'material', {
    weight: 2.5,
    stackSize: 30,
    isGatherable: false,
    craftedFrom: [{ itemId: 'copper_ore', amount: 2 }],
    baseValue: 28,
    rarity: 'uncommon',
  }),

  defineItem('gold_ingot', 'Gold Ingot', 'material', {
    weight: 4.0,
    stackSize: 20,
    isGatherable: false,
    craftedFrom: [{ itemId: 'gold_ore', amount: 3 }],
    baseValue: 180,
    rarity: 'rare',
  }),

  defineItem('steel_ingot', 'Steel Ingot', 'material', {
    weight: 3.5,
    stackSize: 25,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'iron_ingot', amount: 2 },
      { itemId: 'coal', amount: 1 },
    ],
    baseValue: 85,
    rarity: 'uncommon',
  }),

  defineItem('cloth', 'Cloth', 'material', {
    weight: 0.5,
    stackSize: 50,
    isGatherable: false,
    craftedFrom: [{ itemId: 'fiber', amount: 3 }],
    baseValue: 10,
    rarity: 'common',
  }),

  defineItem('rope', 'Rope', 'material', {
    weight: 0.8,
    stackSize: 30,
    isGatherable: false,
    craftedFrom: [{ itemId: 'fiber', amount: 5 }],
    baseValue: 12,
    rarity: 'common',
  }),

  defineItem('plank', 'Wooden Plank', 'material', {
    weight: 1.5,
    stackSize: 50,
    isGatherable: false,
    craftedFrom: [{ itemId: 'wood', amount: 1 }],
    baseValue: 8,
    rarity: 'common',
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
    baseValue: 30,
    rarity: 'common',
  }),

  defineItem('pickaxe', 'Pickaxe', 'tool', {
    weight: 3.5,
    stackSize: 1,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'wood', amount: 2 },
      { itemId: 'stone', amount: 3 },
    ],
    baseValue: 32,
    rarity: 'common',
  }),

  defineItem('hoe', 'Hoe', 'tool', {
    weight: 2.5,
    stackSize: 1,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'wood', amount: 2 },
      { itemId: 'stone', amount: 2 },
    ],
    baseValue: 25,
    rarity: 'common',
  }),

  defineItem('fishing_rod', 'Fishing Rod', 'tool', {
    weight: 1.5,
    stackSize: 1,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'wood', amount: 3 },
      { itemId: 'fiber', amount: 2 },
    ],
    baseValue: 28,
    rarity: 'common',
  }),

  defineItem('hammer', 'Hammer', 'tool', {
    weight: 2.0,
    stackSize: 1,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'wood', amount: 1 },
      { itemId: 'stone', amount: 2 },
    ],
    baseValue: 22,
    rarity: 'common',
  }),

  // Iron tools - upgraded from stone tools
  defineItem('iron_axe', 'Iron Axe', 'tool', {
    weight: 3.5,
    stackSize: 1,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'wood', amount: 2 },
      { itemId: 'iron_ingot', amount: 2 },
    ],
    baseValue: 75,
    rarity: 'uncommon',
  }),

  defineItem('iron_pickaxe', 'Iron Pickaxe', 'tool', {
    weight: 4.0,
    stackSize: 1,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'wood', amount: 2 },
      { itemId: 'iron_ingot', amount: 3 },
    ],
    baseValue: 85,
    rarity: 'uncommon',
  }),

  defineItem('iron_hoe', 'Iron Hoe', 'tool', {
    weight: 3.0,
    stackSize: 1,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'wood', amount: 2 },
      { itemId: 'iron_ingot', amount: 2 },
    ],
    baseValue: 65,
    rarity: 'uncommon',
  }),

  // Steel tools - highest tier
  defineItem('steel_pickaxe', 'Steel Pickaxe', 'tool', {
    weight: 4.5,
    stackSize: 1,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'wood', amount: 2 },
      { itemId: 'steel_ingot', amount: 3 },
    ],
    baseValue: 200,
    rarity: 'rare',
  }),

  defineItem('steel_axe', 'Steel Axe', 'tool', {
    weight: 4.0,
    stackSize: 1,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'wood', amount: 2 },
      { itemId: 'steel_ingot', amount: 2 },
    ],
    baseValue: 180,
    rarity: 'rare',
  }),
];

/**
 * Weapon items - used for combat and hunting
 * NOTE: iron_sword and steel_sword are now defined in weapons/melee.ts with full weapon traits
 */
export const WEAPON_ITEMS: ItemDefinition[] = [
  defineItem('copper_dagger', 'Copper Dagger', 'equipment', {
    weight: 1.0,
    stackSize: 1,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'wood', amount: 1 },
      { itemId: 'copper_ingot', amount: 2 },
    ],
    baseValue: 55,
    rarity: 'common',
  }),

  defineItem('gold_scepter', 'Gold Scepter', 'equipment', {
    weight: 2.5,
    stackSize: 1,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'wood', amount: 1 },
      { itemId: 'gold_ingot', amount: 3 },
    ],
    baseValue: 600,
    rarity: 'legendary',
  }),
];

/**
 * Consumable items - potions, medicines, etc.
 */
export const CONSUMABLE_ITEMS: ItemDefinition[] = [
  defineItem('healing_potion', 'Healing Potion', 'consumable', {
    weight: 0.3,
    stackSize: 10,
    isEdible: false,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'berry', amount: 5 },
      { itemId: 'water', amount: 1 },
    ],
    baseValue: 30,
    rarity: 'uncommon',
  }),

  defineItem('energy_potion', 'Energy Potion', 'consumable', {
    weight: 0.3,
    stackSize: 10,
    isEdible: false,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'wheat', amount: 3 },
      { itemId: 'water', amount: 1 },
    ],
    baseValue: 25,
    rarity: 'uncommon',
  }),

  defineItem('fertilizer', 'Fertilizer', 'consumable', {
    weight: 1.0,
    stackSize: 20,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'fiber', amount: 5 },
      { itemId: 'leaves', amount: 5 },
    ],
    baseValue: 15,
    rarity: 'common',
  }),
];

/**
 * Clothing and armor items
 */
export const CLOTHING_ITEMS: ItemDefinition[] = [
  defineItem('simple_clothing', 'Simple Clothing', 'equipment', {
    weight: 1.0,
    stackSize: 1,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'cloth', amount: 3 },
    ],
    baseValue: 20,
    rarity: 'common',
  }),

  defineItem('fine_clothing', 'Fine Clothing', 'equipment', {
    weight: 1.0,
    stackSize: 1,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'cloth', amount: 5 },
      { itemId: 'fiber', amount: 2 },
    ],
    baseValue: 50,
    rarity: 'uncommon',
  }),

  defineItem('leather', 'Leather', 'material', {
    weight: 1.5,
    stackSize: 30,
    isGatherable: false,
    baseValue: 18,
    rarity: 'common',
  }),

  defineItem('leather_armor', 'Leather Armor', 'equipment', {
    weight: 5.0,
    stackSize: 1,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'leather', amount: 8 },
      { itemId: 'fiber', amount: 3 },
    ],
    baseValue: 80,
    rarity: 'uncommon',
  }),
];

/**
 * Advanced material items - legendary metals, etc.
 */
export const ADVANCED_MATERIAL_ITEMS: ItemDefinition[] = [
  defineItem('mithril_ingot', 'Mithril Ingot', 'material', {
    weight: 2.0,
    stackSize: 20,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'iron_ingot', amount: 2 },
      { itemId: 'gold_ingot', amount: 1 },
    ],
    baseValue: 300,
    rarity: 'rare',
  }),

  defineItem('adamantine_ingot', 'Adamantine Ingot', 'material', {
    weight: 5.0,
    stackSize: 15,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'steel_ingot', amount: 3 },
      { itemId: 'coal', amount: 5 },
    ],
    baseValue: 500,
    rarity: 'legendary',
  }),

  defineItem('enchanting_table', 'Enchanting Table', 'equipment', {
    weight: 20.0,
    stackSize: 1,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'mithril_ingot', amount: 4 },
      { itemId: 'wood', amount: 10 },
      { itemId: 'gold_ingot', amount: 2 },
    ],
    baseValue: 800,
    rarity: 'legendary',
  }),
];

/**
 * Preserved food items
 */
export const PRESERVED_FOOD_ITEMS: ItemDefinition[] = [
  defineItem('dried_meat', 'Dried Meat', 'food', {
    weight: 0.5,
    stackSize: 30,
    isEdible: true,
    hungerRestored: 35,
    quality: 55, // Preserved, decent nutrition
    flavors: ['savory', 'umami'],
    isGatherable: false,
    craftedFrom: [
      { itemId: 'raw_meat', amount: 2 },
    ],
    baseValue: 20,
    rarity: 'common',
  }),
];

/**
 * Farming tools
 */
export const FARMING_TOOL_ITEMS: ItemDefinition[] = [
  defineItem('watering_can', 'Watering Can', 'tool', {
    weight: 1.5,
    stackSize: 1,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'iron_ingot', amount: 2 },
      { itemId: 'wood', amount: 1 },
    ],
    baseValue: 40,
    rarity: 'common',
  }),

  defineItem('stone_hoe', 'Stone Hoe', 'tool', {
    weight: 2.5,
    stackSize: 1,
    isGatherable: false,
    craftedFrom: [
      { itemId: 'wood', amount: 2 },
      { itemId: 'stone', amount: 2 },
    ],
    baseValue: 20,
    rarity: 'common',
  }),
];

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
