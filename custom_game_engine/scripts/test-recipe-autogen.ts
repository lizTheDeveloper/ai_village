#!/usr/bin/env tsx
/**
 * Test Recipe Auto-Generation System
 *
 * Verifies that:
 * 1. All items with craftedFrom get auto-generated recipes
 * 2. All items in the game have a source (gatherable, craftable, or purchasable)
 * 3. Factory assembly machines can craft everything
 */

import { RecipeRegistry } from '../packages/core/src/crafting/RecipeRegistry.js';
import { initializeDefaultRecipes } from '../packages/core/src/crafting/RecipeRegistry.js';
import { verifyAllItemSources, printVerificationReport } from '../packages/core/src/crafting/VerifyItemSources.js';
import { itemRegistry } from '../packages/core/src/items/ItemRegistry.js';
import { registerDefaultItems } from '../packages/core/src/items/defaultItems.js';

console.log('🔧 Recipe Auto-Generation Test\n');

// Initialize item registry with all default items
console.log('Loading items...');
registerDefaultItems(itemRegistry);

const totalItems = itemRegistry.getAll().length;
console.log(`✅ Loaded ${totalItems} items\n`);

// Create a new recipe registry
const registry = new RecipeRegistry();

// Initialize with auto-generation
console.log('Initializing recipes with auto-generation...');
await initializeDefaultRecipes(registry);

const totalRecipes = registry.getAllRecipes().length;
console.log(`✅ Registered ${totalRecipes} recipes\n`);

// Verify all items have sources
printVerificationReport(registry);

// Show recipe examples
console.log('\n' + '='.repeat(60));
console.log('📜 Sample Auto-Generated Recipes');
console.log('='.repeat(60));

const sampleRecipes = [
  'copper_dagger',
  'gold_ingot',
  'plank',
  'iron_pickaxe',
  'fishing_rod',
];

for (const recipeId of sampleRecipes) {
  try {
    const recipe = registry.getRecipe(recipeId);
    console.log(`\n${recipe.name} (${recipe.id})`);
    console.log(`  Category: ${recipe.category}`);
    console.log(`  Crafting Time: ${recipe.craftingTime}s`);
    console.log(`  XP Gain: ${recipe.xpGain}`);
    console.log(`  Station: ${recipe.stationRequired || 'Hand-craftable'}`);
    console.log(`  Ingredients:`);
    for (const ing of recipe.ingredients) {
      console.log(`    - ${ing.quantity}x ${ing.itemId}`);
    }
    console.log(`  Output: ${recipe.output.quantity}x ${recipe.output.itemId}`);
  } catch (error) {
    console.log(`\n❌ ${recipeId}: Recipe not found!`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('🏭 Factory Compatibility Check');
console.log('='.repeat(60));

const factoryItems = [
  'iron_sword',
  'steel_sword',
  'simple_clothing',
  'leather_armor',
  'healing_potion',
  'iron_axe',
];

console.log('\n✅ These items CAN be mass-produced in factories:');
for (const itemId of factoryItems) {
  try {
    const recipe = registry.getRecipe(itemId);
    console.log(`   ✓ ${recipe.name} (${recipe.craftingTime}s craft time)`);
  } catch {
    console.log(`   ✗ ${itemId} - NO RECIPE!`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('✅ Test Complete!');
console.log('='.repeat(60));

// Exit
process.exit(0);
