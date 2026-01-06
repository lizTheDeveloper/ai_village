/**
 * Culinary Experiments Microgenerator
 *
 * Create recipes through culinary experimentation that enter the
 * god-crafted queue and can be discovered in any universe.
 *
 * Integrates with: LLMRecipeGenerator (existing LLM system)
 */

import type { LLMProvider } from '@ai-village/llm';
import type {
  DivineSignature,
  RecipeContent,
  RecipeData,
  MicrogeneratorValidationResult,
  MicrogeneratorInput,
} from './types.js';
import { godCraftedQueue } from './GodCraftedQueue.js';

/**
 * Input for recipe creation
 */
export interface CulinaryInput {
  /** Recipe name (optional) */
  name?: string;

  /** Recipe type */
  type: 'food' | 'potion' | 'clothing' | 'art' | 'tool' | 'custom';

  /** Ingredients with amounts */
  ingredients: Array<{
    name: string;
    amount: number;
  }>;

  /** What should this recipe create? */
  intent?: string;

  /** Chef's personality/style (optional) */
  chefStyle?: string;

  /** Who is this for? (optional) */
  giftRecipient?: string;
}

/**
 * Culinary Experiments Microgenerator
 *
 * Creates recipes using LLM-powered culinary creativity.
 */
export class CulinaryMicrogenerator {
  private llmProvider: LLMProvider;

  constructor(llmProvider: LLMProvider) {
    this.llmProvider = llmProvider;
  }

  /**
   * Generate a recipe
   */
  async generate(input: MicrogeneratorInput & { data: CulinaryInput }): Promise<RecipeContent> {
    const { creator, tags = [], data } = input;

    // Build prompt for recipe generation
    const prompt = this.buildRecipePrompt(data);

    // Generate recipe using LLM
    const systemContext = 'You are a master chef designing innovative recipes. Output valid JSON only.\n\n';
    const response = await this.llmProvider.generate({
      prompt: systemContext + prompt,
      temperature: 0.8, // Creative cooking
      maxTokens: 1000,
    });

    // Parse LLM response
    const parsed = this.parseRecipeResponse(response.text, data);

    // Create recipe data
    const recipeData: RecipeData = {
      recipeId: `recipe:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`,
      outputItemId: parsed.itemId,
      name: parsed.name || data.name || 'Unnamed Recipe',
      type: data.type,
      ingredients: data.ingredients.map(ing => ({
        itemId: this.sanitizeItemId(ing.name),
        amount: ing.amount,
      })),
      craftingTime: parsed.craftingTime,
      stationRequired: parsed.stationRequired,
      outputAmount: parsed.outputAmount,
      item: parsed.item,
      creativityScore: parsed.creativityScore,
    };

    // Create god-crafted content
    const content: RecipeContent = {
      id: recipeData.recipeId,
      type: 'recipe',
      creator,
      tags: [...tags, 'recipe', data.type, ...data.ingredients.map(i => i.name)],
      lore: `A ${data.type} recipe crafted by ${creator.name}, God of ${creator.godOf}. Creates "${parsed.name}".`,
      data: recipeData,
      validated: true,
      discoveries: [],
      createdAt: Date.now(),
    };

    // Submit to queue
    godCraftedQueue.submit(content);

    return content;
  }

  /**
   * Validate recipe input
   */
  validate(data: CulinaryInput): MicrogeneratorValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate ingredients
    if (!data.ingredients || data.ingredients.length === 0) {
      errors.push('At least one ingredient is required');
    }

    if (data.ingredients.length > 10) {
      warnings.push('More than 10 ingredients may be difficult to acquire');
    }

    // Validate amounts
    for (const ingredient of data.ingredients) {
      if (ingredient.amount <= 0) {
        errors.push(`Invalid amount for ${ingredient.name}: ${ingredient.amount}`);
      }
    }

    // Validate recipe type
    const validTypes = ['food', 'potion', 'clothing', 'art', 'tool', 'custom'];
    if (!validTypes.includes(data.type)) {
      errors.push(`Invalid recipe type: ${data.type}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Build prompt for recipe generation
   */
  private buildRecipePrompt(data: CulinaryInput): string {
    const ingredientsList = data.ingredients
      .map(ing => `${ing.amount}x ${ing.name}`)
      .join(', ');

    return `Design a ${data.type} recipe using these ingredients:

Ingredients: ${ingredientsList}
${data.intent ? `Goal: ${data.intent}` : ''}
${data.chefStyle ? `Chef Style: ${data.chefStyle}` : ''}
${data.giftRecipient ? `Creating for: ${data.giftRecipient}` : ''}
${data.name ? `Recipe Name: ${data.name}` : 'Create a creative name'}

Output a JSON object with this structure:
{
  "name": "recipe name",
  "itemId": "item_id_snake_case",
  "description": "what this creates",
  "craftingTime": number (seconds, 10-600),
  "stationRequired": "crafting_station_name" or null,
  "outputAmount": number (how many items created, 1-10),
  "item": {
    "category": "food|potion|clothing|art|tool",
    "weight": number (kg),
    "stackSize": number,
    "baseValue": number (gold),
    "rarity": "common|uncommon|rare|epic|legendary",
    "properties": {} optional properties
  },
  "creativityScore": number (0-100)
}`;
  }

  /**
   * Parse LLM response into recipe data
   */
  private parseRecipeResponse(response: string, input: CulinaryInput): {
    name: string;
    itemId: string;
    craftingTime: number;
    stationRequired?: string;
    outputAmount: number;
    item: RecipeData['item'];
    creativityScore: number;
  } {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        name: parsed.name || input.name || 'Unnamed Recipe',
        itemId: parsed.itemId || this.sanitizeItemId(parsed.name || 'unknown_item'),
        craftingTime: Math.max(10, Math.min(600, parsed.craftingTime || 60)),
        stationRequired: parsed.stationRequired || undefined,
        outputAmount: Math.max(1, Math.min(10, parsed.outputAmount || 1)),
        item: {
          category: parsed.item?.category || input.type,
          weight: parsed.item?.weight || 1,
          stackSize: parsed.item?.stackSize || 10,
          baseValue: parsed.item?.baseValue || 10,
          rarity: parsed.item?.rarity || 'common',
          properties: parsed.item?.properties || {},
        },
        creativityScore: Math.max(0, Math.min(100, parsed.creativityScore || 50)),
      };
    } catch (error) {
      console.error('[Culinary] Failed to parse LLM response:', error);

      // Fallback: create basic recipe
      const ingredientNames = input.ingredients.map(i => i.name).join('_');
      return {
        name: input.name || `${input.type} from ${ingredientNames}`,
        itemId: this.sanitizeItemId(input.name || `${input.type}_${ingredientNames}`),
        craftingTime: 60,
        outputAmount: 1,
        item: {
          category: input.type,
          weight: 1,
          stackSize: 10,
          baseValue: 10,
          rarity: 'common',
          properties: {},
        },
        creativityScore: 30,
      };
    }
  }

  /**
   * Sanitize item name to create ID
   */
  private sanitizeItemId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /**
   * Get recipe by ID
   */
  getRecipe(recipeId: string): RecipeContent | null {
    const content = godCraftedQueue.getContent(recipeId);
    if (content?.type === 'recipe') {
      return content as RecipeContent;
    }
    return null;
  }

  /**
   * Get all recipes by creator
   */
  getRecipesByCreator(creatorId: string): RecipeContent[] {
    return godCraftedQueue
      .getByCreator(creatorId)
      .filter((c): c is RecipeContent => c.type === 'recipe');
  }

  /**
   * Get all recipes
   */
  getAllRecipes(): RecipeContent[] {
    return godCraftedQueue
      .getByType('recipe')
      .filter((c): c is RecipeContent => c.type === 'recipe');
  }
}
