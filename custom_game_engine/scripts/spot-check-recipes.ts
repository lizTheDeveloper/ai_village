#!/usr/bin/env tsx
/**
 * Spot Check Recipe Auto-Generation
 *
 * Detailed review of generated recipes to ensure they make sense
 */

import { RecipeRegistry } from '../packages/core/src/crafting/RecipeRegistry.js';
import { initializeDefaultRecipes } from '../packages/core/src/crafting/RecipeRegistry.js';
import { itemRegistry } from '../packages/core/src/items/ItemRegistry.js';
import { registerDefaultItems } from '../packages/core/src/items/defaultItems.js';
import type { Recipe } from '../packages/core/src/crafting/Recipe.js';

// Initialize
registerDefaultItems(itemRegistry);
const registry = new RecipeRegistry();
await initializeDefaultRecipes(registry);

const allRecipes = registry.getAllRecipes();

console.log('🔍 Recipe Spot Check Report\n');
console.log('='.repeat(80));
console.log(`Total Recipes: ${allRecipes.length}`);
console.log('='.repeat(80));

// Group recipes by category
const byCategory = new Map<string, Recipe[]>();
for (const recipe of allRecipes) {
  const recipes = byCategory.get(recipe.category) || [];
  recipes.push(recipe);
  byCategory.set(recipe.category, recipes);
}

// Show each category
for (const [category, recipes] of Array.from(byCategory.entries()).sort()) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📂 ${category} (${recipes.length} recipes)`);
  console.log('='.repeat(80));

  for (const recipe of recipes.sort((a, b) => a.name.localeCompare(b.name))) {
    const item = itemRegistry.tryGet(recipe.id);

    console.log(`\n${recipe.name}`);
    console.log(`  ID: ${recipe.id}`);
    console.log(`  Rarity: ${item?.rarity || 'unknown'}`);
    console.log(`  Station: ${recipe.stationRequired || 'Hand-craftable ✋'}`);
    console.log(`  Time: ${recipe.craftingTime}s`);
    console.log(`  XP: ${recipe.xpGain}`);
    console.log(`  Ingredients:`);
    for (const ing of recipe.ingredients) {
      const ingItem = itemRegistry.tryGet(ing.itemId);
      console.log(`    - ${ing.quantity}x ${ing.itemId} (${ingItem?.rarity || '?'})`);
    }
    console.log(`  Output: ${recipe.output.quantity}x ${recipe.output.itemId}`);

    // Validation checks
    const warnings: string[] = [];

    // Check if crafting time seems reasonable
    if (recipe.craftingTime < 3 && recipe.ingredients.length > 2) {
      warnings.push('⚠️  Very short craft time for complex recipe');
    }
    if (recipe.craftingTime > 60 && item?.rarity === 'common') {
      warnings.push('⚠️  Very long craft time for common item');
    }

    // Check XP seems reasonable
    if (recipe.xpGain < 5 && item?.rarity !== 'common') {
      warnings.push('⚠️  Low XP for non-common item');
    }
    if (recipe.xpGain > 100 && item?.rarity !== 'legendary') {
      warnings.push('⚠️  Very high XP for non-legendary item');
    }

    // Check station requirements
    const hasMetalIngot = recipe.ingredients.some(i => i.itemId.includes('_ingot'));
    if (hasMetalIngot && recipe.stationRequired !== 'workbench' && recipe.stationRequired !== 'forge') {
      warnings.push('⚠️  Uses metal ingots but not at workbench/forge');
    }

    if (warnings.length > 0) {
      console.log(`  ${warnings.join('\n  ')}`);
    } else {
      console.log(`  ✅ Looks good!`);
    }
  }
}

// Summary statistics
console.log('\n' + '='.repeat(80));
console.log('📊 Statistics');
console.log('='.repeat(80));

const stationCounts = new Map<string, number>();
const timeRanges = { under5: 0, '5to15': 0, '15to30': 0, over30: 0 };
const xpRanges = { under10: 0, '10to30': 0, '30to60': 0, over60: 0 };

for (const recipe of allRecipes) {
  // Station counts
  const station = recipe.stationRequired || 'hand';
  stationCounts.set(station, (stationCounts.get(station) || 0) + 1);

  // Time ranges
  if (recipe.craftingTime < 5) timeRanges.under5++;
  else if (recipe.craftingTime < 15) timeRanges['5to15']++;
  else if (recipe.craftingTime < 30) timeRanges['15to30']++;
  else timeRanges.over30++;

  // XP ranges
  if (recipe.xpGain < 10) xpRanges.under10++;
  else if (recipe.xpGain < 30) xpRanges['10to30']++;
  else if (recipe.xpGain < 60) xpRanges['30to60']++;
  else xpRanges.over60++;
}

console.log('\n🏭 Recipes by Station:');
for (const [station, count] of Array.from(stationCounts.entries()).sort((a, b) => b[1] - a[1])) {
  const percentage = ((count / allRecipes.length) * 100).toFixed(1);
  console.log(`  ${station.padEnd(20)} ${count.toString().padStart(3)} recipes (${percentage}%)`);
}

console.log('\n⏱️  Recipes by Crafting Time:');
console.log(`  < 5s:     ${timeRanges.under5} recipes`);
console.log(`  5-15s:    ${timeRanges['5to15']} recipes`);
console.log(`  15-30s:   ${timeRanges['15to30']} recipes`);
console.log(`  > 30s:    ${timeRanges.over30} recipes`);

console.log('\n⭐ Recipes by XP Reward:');
console.log(`  < 10 XP:  ${xpRanges.under10} recipes`);
console.log(`  10-30 XP: ${xpRanges['10to30']} recipes`);
console.log(`  30-60 XP: ${xpRanges['30to60']} recipes`);
console.log(`  > 60 XP:  ${xpRanges.over60} recipes`);

console.log('\n' + '='.repeat(80));
console.log('✅ Spot Check Complete!');
console.log('='.repeat(80));
