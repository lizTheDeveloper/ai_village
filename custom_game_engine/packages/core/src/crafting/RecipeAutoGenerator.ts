/**
 * Recipe Auto-Generator
 *
 * Automatically generates Recipe objects from ItemDefinition.craftedFrom data.
 * This ensures all craftable items work in both hand-crafting and factories.
 */

import type { Recipe } from './Recipe.js';
import type { RecipeRegistry } from './RecipeRegistry.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import type { ItemDefinition } from '../items/ItemDefinition.js';

/**
 * Station requirements based on item type and complexity
 */
const STATION_REQUIREMENTS: Record<string, string | null> = {
  // Hand-craftable (no station)
  'stone_axe': null,
  'stone_pickaxe': null,
  'wooden_hammer': null,
  'rope': null,
  'cloth': null,

  // Workbench required
  'axe': 'workbench',
  'pickaxe': 'workbench',
  'hoe': 'workbench',
  'hammer': 'workbench',
  'fishing_rod': 'workbench',
  'watering_can': 'workbench',
  'plank': 'workbench',

  // Forge required (metal items)
  'iron_ingot': 'forge',
  'copper_ingot': 'forge',
  'gold_ingot': 'forge',
  'steel_ingot': 'forge',
  'mithril_ingot': 'forge',
  'adamantine_ingot': 'forge',

  // Forge + workbench (metal tools)
  'iron_axe': 'workbench',
  'iron_pickaxe': 'workbench',
  'iron_hoe': 'workbench',
  'steel_axe': 'workbench',
  'steel_pickaxe': 'workbench',

  // Forge + workbench (weapons)
  'iron_sword': 'workbench',
  'steel_sword': 'workbench',
  'copper_dagger': 'workbench',
  'gold_scepter': 'workbench',

  // Oven (food)
  'bread': 'oven',
  'cooked_meat': 'oven',
  'pie': 'oven',
  'stew': 'oven',
  'dried_meat': 'oven',

  // Loom (textiles)
  'simple_clothing': 'loom',
  'fine_clothing': 'loom',
  'leather_armor': 'loom',

  // Alchemy (potions)
  'healing_potion': 'alchemy_station',
  'energy_potion': 'alchemy_station',

  // Special
  'enchanting_table': 'workbench',
};

/**
 * Crafting time in seconds based on rarity and complexity
 */
function calculateCraftingTime(item: ItemDefinition): number {
  const baseTime: Record<string, number> = {
    'common': 5,
    'uncommon': 10,
    'rare': 20,
    'epic': 40,
    'legendary': 60,
  };

  const rarityTime = baseTime[item.rarity] || 10;

  // Adjust by ingredient count (more complex = longer)
  const ingredientCount = item.craftedFrom?.length || 1;
  const complexityMultiplier = 1 + (ingredientCount - 1) * 0.3;

  return Math.round(rarityTime * complexityMultiplier);
}

/**
 * XP gain based on rarity
 */
function calculateXPGain(item: ItemDefinition): number {
  const xpByRarity: Record<string, number> = {
    'common': 5,
    'uncommon': 15,
    'rare': 30,
    'epic': 60,
    'legendary': 100,
  };

  return xpByRarity[item.rarity] || 10;
}

/**
 * Determine required station based on item properties
 */
function determineStation(item: ItemDefinition): string | null {
  // Check explicit station requirements
  if (item.id in STATION_REQUIREMENTS) {
    return STATION_REQUIREMENTS[item.id] ?? null;
  }

  // Infer from category and ingredients
  if (item.category === 'food') {
    return 'oven';
  }

  if (item.category === 'consumable') {
    return 'alchemy_station';
  }

  // Check if requires smelted materials
  const hasSmelted = item.craftedFrom?.some(ing =>
    ing.itemId.includes('_ingot') || ing.itemId.includes('_bar')
  );

  if (item.category === 'material' && item.id.includes('_ingot')) {
    return 'forge';
  }

  if (hasSmelted && item.category === 'tool') {
    return 'workbench';
  }

  if (hasSmelted && item.category === 'equipment') {
    return 'workbench';
  }

  // Simple items can be hand-crafted
  if (item.craftedFrom && item.craftedFrom.length <= 2) {
    const onlyBasicMaterials = item.craftedFrom.every(ing =>
      ['wood', 'stone', 'fiber', 'leaves'].includes(ing.itemId)
    );
    if (onlyBasicMaterials) {
      return null; // Hand-craftable
    }
  }

  // Default to workbench for complex items
  return 'workbench';
}

/**
 * Categorize recipe based on item type
 */
function determineCategory(item: ItemDefinition): string {
  const categoryMap: Record<string, string> = {
    'tool': 'Tools',
    'equipment': 'Equipment',
    'material': 'Materials',
    'food': 'Food',
    'consumable': 'Consumables',
    'resource': 'Resources',
  };

  return categoryMap[item.category] || 'Miscellaneous';
}

/**
 * Generate a Recipe from an ItemDefinition with craftedFrom data
 */
export function generateRecipeFromItem(item: ItemDefinition): Recipe | null {
  // Skip if no crafting data
  if (!item.craftedFrom || item.craftedFrom.length === 0) {
    return null;
  }

  // Convert craftedFrom to recipe ingredients
  const ingredients = item.craftedFrom.map(ing => ({
    itemId: ing.itemId,
    quantity: ing.amount,
  }));

  const recipe: Recipe = {
    id: item.id,
    name: item.displayName,
    category: determineCategory(item),
    description: `Craft ${item.displayName}`,
    ingredients,
    output: {
      itemId: item.id,
      quantity: 1,
    },
    craftingTime: calculateCraftingTime(item),
    xpGain: calculateXPGain(item),
    stationRequired: determineStation(item),
    skillRequirements: [],
    researchRequirements: [],
  };

  return recipe;
}

/**
 * Auto-generate all recipes from items with craftedFrom data
 */
export function autoGenerateAllRecipes(registry: RecipeRegistry): number {
  let generatedCount = 0;
  const allItems = itemRegistry.getAll();

  for (const item of allItems) {
    const recipe = generateRecipeFromItem(item);
    if (recipe) {
      try {
        registry.registerRecipe(recipe);
        generatedCount++;
      } catch (error) {
        // Recipe might already be registered manually - that's ok
        if (error instanceof Error && error.message.includes('already registered')) {
          // Skip - manual recipe takes precedence
          continue;
        }
        // Other errors should be logged
        console.error(`[RecipeAutoGenerator] Failed to register recipe for ${item.id}:`, error);
      }
    }
  }

  return generatedCount;
}

/**
 * Get a summary of auto-generated vs manual recipes
 */
export function getRecipeGenerationSummary(registry: RecipeRegistry): {
  totalRecipes: number;
  manualRecipes: string[];
  autoGenerated: string[];
  itemsWithoutRecipes: string[];
} {
  const allItems = itemRegistry.getAll();
  const allRecipes = registry.getAllRecipes();

  const recipeIds = new Set(allRecipes.map(r => r.id));
  const itemsWithCrafting = allItems.filter((item: ItemDefinition) => item.craftedFrom && item.craftedFrom.length > 0);

  const autoGenerated: string[] = [];
  const itemsWithoutRecipes: string[] = [];

  for (const item of itemsWithCrafting) {
    if (recipeIds.has(item.id)) {
      autoGenerated.push(item.id);
    } else {
      itemsWithoutRecipes.push(item.id);
    }
  }

  // Manual recipes are those in STATION_REQUIREMENTS but not in the generation
  const manualRecipes = Object.keys(STATION_REQUIREMENTS).filter(id =>
    !autoGenerated.includes(id)
  );

  return {
    totalRecipes: allRecipes.length,
    manualRecipes,
    autoGenerated,
    itemsWithoutRecipes,
  };
}
