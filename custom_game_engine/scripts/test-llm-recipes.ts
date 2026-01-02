#!/usr/bin/env tsx
/**
 * Test LLM Recipe Generation System
 *
 * Demonstrates the LLM-powered recipe invention capability.
 * Agents can experiment with ingredient combinations to create
 * new food, clothing, art, potions, and more.
 */

import { itemRegistry } from '../packages/core/src/items/ItemRegistry.js';
import { registerDefaultItems } from '../packages/core/src/items/defaultItems.js';
import {
  LLMRecipeGenerator,
  initializeRecipeGenerator,
  type RecipeType,
  type ExperimentIngredient,
  type RecipeLLMProvider,
  type RecipeLLMRequest,
  type RecipeLLMResponse,
} from '../packages/core/src/crafting/LLMRecipeGenerator.js';

console.log('🧪 LLM Recipe Generation Test\n');
console.log('='.repeat(60));

// Initialize items
console.log('Loading items...');
registerDefaultItems(itemRegistry);
console.log(`✅ Loaded ${itemRegistry.getAll().length} items\n`);

/**
 * Mock LLM Provider for testing without actual LLM calls
 */
class MockLLMProvider implements RecipeLLMProvider {
  private recipeTemplates: Record<RecipeType, (ingredients: string[]) => object> = {
    food: (ingredients) => ({
      itemId: `custom_${ingredients.join('_')}_dish`,
      displayName: `${this.capitalize(ingredients[0])} ${this.capitalize(ingredients[1] || 'Special')}`,
      description: `A delicious dish made with ${ingredients.join(' and ')}`,
      category: 'food',
      rarity: 'uncommon',
      craftingTime: 15,
      xpGain: 20,
      hungerRestored: 30,
      quality: 3,
      flavors: ['savory', 'umami'],
    }),
    clothing: (ingredients) => ({
      itemId: `custom_${ingredients[0]}_garment`,
      displayName: `${this.capitalize(ingredients[0])} Garment`,
      description: `A handcrafted garment made from ${ingredients.join(' and ')}`,
      category: 'equipment',
      rarity: 'uncommon',
      craftingTime: 30,
      xpGain: 25,
      durability: 200,
    }),
    art: (ingredients) => ({
      itemId: `custom_${ingredients[0]}_sculpture`,
      displayName: `${this.capitalize(ingredients[0])} Sculpture`,
      description: `An artistic sculpture crafted from ${ingredients.join(' and ')}`,
      category: 'misc',
      rarity: 'rare',
      craftingTime: 45,
      xpGain: 40,
      baseValue: 150,
    }),
    potion: (ingredients) => ({
      itemId: `custom_${ingredients[0]}_potion`,
      displayName: `${this.capitalize(ingredients[0])} Elixir`,
      description: `A mystical potion brewed from ${ingredients.join(' and ')}`,
      category: 'consumable',
      rarity: 'uncommon',
      craftingTime: 20,
      xpGain: 30,
      effectType: 'healing',
      effectStrength: 5,
    }),
    tool: (ingredients) => ({
      itemId: `custom_${ingredients[0]}_implement`,
      displayName: `${this.capitalize(ingredients[0])} Tool`,
      description: `A useful tool made from ${ingredients.join(' and ')}`,
      category: 'tool',
      rarity: 'common',
      craftingTime: 25,
      xpGain: 15,
      baseValue: 50,
    }),
    decoration: (ingredients) => ({
      itemId: `custom_${ingredients[0]}_ornament`,
      displayName: `${this.capitalize(ingredients[0])} Ornament`,
      description: `A decorative piece crafted from ${ingredients.join(' and ')}`,
      category: 'misc',
      rarity: 'common',
      craftingTime: 15,
      xpGain: 10,
      baseValue: 30,
    }),
  };

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
  }

  async generate(request: RecipeLLMRequest): Promise<RecipeLLMResponse> {
    // Parse the recipe type from the prompt
    const typeMatch = request.prompt.match(/invent a new (\w+) recipe/);
    const recipeType = (typeMatch?.[1] || 'food') as RecipeType;

    // Extract ingredients from the prompt
    const ingredientMatches = request.prompt.matchAll(/\d+x (\w+)/g);
    const ingredients = Array.from(ingredientMatches).map(m => m[1]);

    // Get template for this recipe type
    const template = this.recipeTemplates[recipeType] || this.recipeTemplates.food;
    const generated = template(ingredients);

    return {
      text: JSON.stringify(generated),
      stopReason: 'stop',
      tokensUsed: 100,
    };
  }

  getModelName(): string {
    return 'mock-llm';
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

// Create mock LLM provider and initialize recipe generator
const mockProvider = new MockLLMProvider();
const generator = initializeRecipeGenerator(mockProvider);

console.log('✅ Recipe Generator initialized with mock LLM\n');

// Test experiments
const experiments: Array<{
  name: string;
  ingredients: ExperimentIngredient[];
  type: RecipeType;
}> = [
  {
    name: 'Berry Stew',
    ingredients: [
      { itemId: 'berry', quantity: 5 },
      { itemId: 'wheat', quantity: 2 },
    ],
    type: 'food',
  },
  {
    name: 'Fiber Garment',
    ingredients: [
      { itemId: 'fiber', quantity: 10 },
      { itemId: 'leather', quantity: 3 },
    ],
    type: 'clothing',
  },
  {
    name: 'Stone Sculpture',
    ingredients: [
      { itemId: 'stone', quantity: 5 },
      { itemId: 'iron_ingot', quantity: 1 },
    ],
    type: 'art',
  },
  {
    name: 'Herb Potion',
    ingredients: [
      { itemId: 'berry', quantity: 3 },
      { itemId: 'flower', quantity: 2 },
    ],
    type: 'potion',
  },
];

console.log('Running experiments...\n');
console.log('='.repeat(60));

async function runExperiments() {
  for (const exp of experiments) {
    console.log(`\n📌 Experiment: ${exp.name} (${exp.type})`);
    console.log(`   Ingredients: ${exp.ingredients.map(i => `${i.quantity}x ${i.itemId}`).join(', ')}`);

    try {
      const result = await generator.experiment(
        exp.ingredients,
        exp.type,
        'TestVillager',
        'curious and creative'
      );

      if (result.success) {
        console.log(`   ✅ SUCCESS!`);
        console.log(`   Created: ${result.item?.displayName}`);
        console.log(`   Recipe ID: ${result.recipe?.id}`);
        console.log(`   Creativity Score: ${result.creativityScore}/100`);
        console.log(`   Crafting Time: ${result.recipe?.craftingTime}s`);
        console.log(`   XP Gain: ${result.recipe?.xpGain}`);

        if (result.item?.category === 'food') {
          console.log(`   Hunger Restored: ${result.item?.hungerRestored || 'N/A'}`);
        }
      } else {
        console.log(`   ❌ FAILED: ${result.message}`);
        console.log(`   Creativity Score: ${result.creativityScore}/100`);
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary');
  console.log('='.repeat(60));

  const generatedRecipes = generator.getGeneratedRecipes();
  const generatedItems = generator.getGeneratedItems();

  console.log(`\nRecipes created: ${generatedRecipes.length}`);
  console.log(`Items created: ${generatedItems.length}`);

  if (generatedRecipes.length > 0) {
    console.log('\nGenerated Recipes:');
    for (const recipe of generatedRecipes) {
      console.log(`  - ${recipe.name} (${recipe.category})`);
      console.log(`    Ingredients: ${recipe.ingredients.map(i => `${i.quantity}x ${i.itemId}`).join(', ')}`);
      console.log(`    Output: ${recipe.output.quantity}x ${recipe.output.itemId}`);
      console.log(`    Station: ${recipe.stationRequired || 'Hand-craftable'}`);
    }
  }

  // Test registering items globally
  console.log('\n' + '='.repeat(60));
  console.log('Testing global item registration...');

  const beforeCount = itemRegistry.getAll().length;
  const registered = generator.registerGeneratedItemsGlobally();
  const afterCount = itemRegistry.getAll().length;

  console.log(`Registered ${registered} new items to global registry`);
  console.log(`Total items: ${beforeCount} → ${afterCount}`);

  // Verify items can be looked up
  for (const item of generatedItems) {
    if (itemRegistry.has(item.id)) {
      console.log(`  ✅ ${item.id} found in global registry`);
    } else {
      console.log(`  ❌ ${item.id} NOT found in global registry`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ LLM Recipe Generation Test Complete!');
  console.log('='.repeat(60));
}

runExperiments().catch(console.error);
