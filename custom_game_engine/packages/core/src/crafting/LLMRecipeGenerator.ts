/**
 * LLM Recipe Generator
 *
 * Allows agents to dynamically invent NEW recipes using LLM creativity.
 * This is different from RecipeAutoGenerator which creates recipes from
 * existing ItemDefinition.craftedFrom data.
 *
 * Agents can experiment with ingredients to discover:
 * - New food dishes (cooking)
 * - New clothing styles (weaving)
 * - Custom crafts/art (artisanry)
 * - Potion combinations (alchemy)
 */

import type { Recipe } from './Recipe.js';

/**
 * LLM Provider interface for recipe generation
 * (Defined locally to avoid cross-package imports)
 */
export interface RecipeLLMRequest {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface RecipeLLMResponse {
  text: string;
  stopReason?: string;
  tokensUsed?: number;
}

export interface RecipeLLMProvider {
  generate(request: RecipeLLMRequest): Promise<RecipeLLMResponse>;
  getModelName(): string;
  isAvailable(): Promise<boolean>;
}
import type { ItemDefinition, ItemCategory } from '../items/ItemDefinition.js';
import { itemRegistry } from '../items/ItemRegistry.js';

/**
 * Types of recipes that can be invented
 */
export type RecipeType = 'food' | 'clothing' | 'art' | 'potion' | 'tool' | 'decoration';

/**
 * Ingredient used in experimentation
 */
export interface ExperimentIngredient {
  itemId: string;
  quantity: number;
}

/**
 * Result of a recipe experimentation attempt
 */
export interface RecipeExperimentResult {
  success: boolean;
  recipe?: Recipe;
  item?: ItemDefinition;
  message: string;
  creativityScore: number; // 0-100 how creative the invention was
}

/**
 * Additional context for recipe experimentation
 */
export interface ExperimentContext {
  /** Formatted string of all ingredients the agent knows about */
  availableIngredients?: string;
  /** Formatted string of friends' food preferences */
  friendPreferences?: string;
  /** Name of friend if making a gift for them */
  giftRecipient?: string;
}

/**
 * Generated recipe from LLM (before validation)
 */
interface LLMGeneratedRecipe {
  itemId: string;
  displayName: string;
  description: string;
  category: ItemCategory;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  craftingTime: number;
  xpGain: number;
  // Food-specific
  hungerRestored?: number;
  quality?: number;
  flavors?: string[];
  // Equipment-specific
  durability?: number;
  armorValue?: number;
  // Potion-specific
  effectType?: string;
  effectStrength?: number;
}

/**
 * LLM Recipe Generator
 *
 * Uses LLM to creatively invent new items based on ingredient combinations.
 */
export class LLMRecipeGenerator {
  private llmProvider: RecipeLLMProvider;
  private generatedRecipes: Map<string, Recipe> = new Map();
  private generatedItems: Map<string, ItemDefinition> = new Map();

  constructor(llmProvider: RecipeLLMProvider) {
    this.llmProvider = llmProvider;
  }

  /**
   * Attempt to create a new recipe by experimenting with ingredients
   */
  async experiment(
    ingredients: ExperimentIngredient[],
    recipeType: RecipeType,
    agentName: string,
    agentPersonality?: string,
    context?: ExperimentContext
  ): Promise<RecipeExperimentResult> {
    // Validate ingredients exist
    const ingredientDetails: Array<{ item: ItemDefinition; quantity: number }> = [];
    for (const ing of ingredients) {
      const item = itemRegistry.tryGet(ing.itemId);
      if (!item) {
        return {
          success: false,
          message: `Unknown ingredient: ${ing.itemId}`,
          creativityScore: 0,
        };
      }
      ingredientDetails.push({ item, quantity: ing.quantity });
    }

    // Build the prompt
    const prompt = this.buildExperimentPrompt(ingredientDetails, recipeType, agentName, agentPersonality, context);

    try {
      // Generate recipe via LLM
      const response = await this.llmProvider.generate({
        prompt,
        temperature: 0.8, // Higher temperature for creativity
        maxTokens: 1024,
      });

      // Parse the LLM response
      const generated = this.parseGeneratedRecipe(response.text, recipeType);
      if (!generated) {
        return {
          success: false,
          message: 'Failed to create a new item from these ingredients. Try a different combination!',
          creativityScore: 10,
        };
      }

      // Validate the generated recipe makes sense
      const validation = this.validateGeneratedRecipe(generated, ingredients, recipeType);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.reason || 'The experiment failed.',
          creativityScore: 20,
        };
      }

      // Create the item definition
      const itemDef = this.createItemDefinition(generated, ingredients);

      // Create the recipe
      const recipe = this.createRecipe(generated, ingredients);

      // Store in our registry of generated items
      this.generatedItems.set(itemDef.id, itemDef);
      this.generatedRecipes.set(recipe.id, recipe);

      return {
        success: true,
        recipe,
        item: itemDef,
        message: `${agentName} invented "${generated.displayName}"!`,
        creativityScore: this.calculateCreativityScore(generated, ingredients),
      };
    } catch (error) {
      console.error('[LLMRecipeGenerator] Experiment failed:', error);
      return {
        success: false,
        message: 'The experiment went wrong!',
        creativityScore: 0,
      };
    }
  }

  /**
   * Build prompt for recipe experimentation
   */
  private buildExperimentPrompt(
    ingredients: Array<{ item: ItemDefinition; quantity: number }>,
    recipeType: RecipeType,
    agentName: string,
    agentPersonality?: string,
    context?: ExperimentContext
  ): string {
    const ingredientList = ingredients
      .map(({ item, quantity }) => `- ${quantity}x ${item.displayName} (${item.category}, ${item.rarity})`)
      .join('\n');

    const typeInstructions = this.getTypeInstructions(recipeType);

    // Build context sections
    let contextSection = '';

    // Add available ingredients if provided (shows what agent knows about)
    if (context?.availableIngredients) {
      contextSection += `\nALL KNOWN INGREDIENTS:\n${context.availableIngredients}\n`;
    }

    // Add friend preferences for social cooking
    if (context?.friendPreferences) {
      contextSection += `\n${context.friendPreferences}\n`;
    }

    // Add gift motivation
    let giftInstruction = '';
    if (context?.giftRecipient) {
      giftInstruction = `\nIMPORTANT: ${agentName} is creating this as a gift for their friend ${context.giftRecipient}.
Consider ${context.giftRecipient}'s preferences when designing this item. Make it something they would love!\n`;
    }

    return `You are helping ${agentName}${agentPersonality ? `, who is ${agentPersonality},` : ''} invent a new ${recipeType} recipe.

INGREDIENTS TO USE:
${ingredientList}
${contextSection}
${typeInstructions}
${giftInstruction}
Create a unique, creative item that could realistically be made from these ingredients.
The item should fit the game's medieval fantasy setting.

RESPOND IN JSON FORMAT ONLY:
{
  "itemId": "snake_case_unique_id",
  "displayName": "Human Readable Name",
  "description": "A brief flavorful description",
  "category": "${this.getCategoryForType(recipeType)}",
  "rarity": "common|uncommon|rare|epic|legendary",
  "craftingTime": <seconds 5-120>,
  "xpGain": <5-100 based on complexity>,
  ${this.getTypeSpecificFields(recipeType)}
}

Be creative but realistic. The name should reflect the ingredients used.
If the ingredients don't make sense together for a ${recipeType}, respond with:
{"error": "These ingredients cannot be combined into a ${recipeType}"}`;
  }

  /**
   * Get type-specific prompt instructions
   */
  private getTypeInstructions(recipeType: RecipeType): string {
    switch (recipeType) {
      case 'food':
        return `FOOD CREATION:
- Consider flavor combinations (sweet, savory, bitter, sour, spicy, umami)
- Think about cooking methods (raw, cooked, baked, fried, stewed)
- Quality depends on ingredient quality and complementary flavors
- Hunger restored should be 10-50 based on heartiness`;

      case 'clothing':
        return `CLOTHING CREATION:
- Consider the materials (leather, cloth, fur, fiber)
- Think about style and function (work clothes, formal wear, armor)
- Durability depends on material quality
- May provide minor stat bonuses`;

      case 'art':
        return `ART/CRAFT CREATION:
- Consider aesthetic value and cultural meaning
- Can be decorative or functional
- Rarity affects beauty and value
- May have symbolic or magical significance`;

      case 'potion':
        return `POTION CREATION:
- Consider alchemical properties of ingredients
- Effects should be temporary (healing, buffs, etc.)
- Strength depends on ingredient potency
- Can be beneficial or harmful`;

      case 'tool':
        return `TOOL CREATION:
- Consider practical function
- Materials affect durability
- Should improve some task (gathering, building, etc.)
- Quality affects efficiency`;

      case 'decoration':
        return `DECORATION CREATION:
- Consider visual appeal
- Can be placed in buildings or worn
- May provide minor ambient bonuses
- Cultural significance adds value`;

      default:
        return '';
    }
  }

  /**
   * Get type-specific JSON fields for prompt
   */
  private getTypeSpecificFields(recipeType: RecipeType): string {
    switch (recipeType) {
      case 'food':
        return `"hungerRestored": <10-50>,
  "quality": <1-5>,
  "flavors": ["sweet", "savory", etc.]`;

      case 'clothing':
        return `"durability": <50-500>,
  "armorValue": <0-20 if protective>`;

      case 'potion':
        return `"effectType": "healing|energy|strength|speed|etc",
  "effectStrength": <1-10>`;

      default:
        return `"baseValue": <10-500>`;
    }
  }

  /**
   * Get item category for recipe type
   */
  private getCategoryForType(recipeType: RecipeType): ItemCategory {
    switch (recipeType) {
      case 'food':
        return 'food';
      case 'clothing':
        return 'equipment';
      case 'potion':
        return 'consumable';
      case 'tool':
        return 'tool';
      case 'art':
      case 'decoration':
        return 'misc';
      default:
        return 'misc';
    }
  }

  /**
   * Parse the LLM's generated recipe response
   */
  private parseGeneratedRecipe(response: string, recipeType: RecipeType): LLMGeneratedRecipe | null {
    try {
      // Extract JSON from response (may have extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Check for error response
      if (parsed.error) {
        return null;
      }

      // Validate required fields
      if (!parsed.itemId || !parsed.displayName) {
        return null;
      }

      // Sanitize itemId to be valid
      const sanitizedId = parsed.itemId
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      // Make ID unique by adding prefix
      const uniqueId = `custom_${sanitizedId}`;

      return {
        itemId: uniqueId,
        displayName: String(parsed.displayName).substring(0, 50),
        description: String(parsed.description || '').substring(0, 200),
        category: this.getCategoryForType(recipeType),
        rarity: this.validateRarity(parsed.rarity),
        craftingTime: Math.min(120, Math.max(5, Number(parsed.craftingTime) || 15)),
        xpGain: Math.min(100, Math.max(5, Number(parsed.xpGain) || 10)),
        hungerRestored: parsed.hungerRestored ? Math.min(50, Math.max(5, Number(parsed.hungerRestored))) : undefined,
        quality: parsed.quality ? Math.min(5, Math.max(1, Number(parsed.quality))) : undefined,
        flavors: Array.isArray(parsed.flavors) ? parsed.flavors.slice(0, 3) : undefined,
        durability: parsed.durability ? Math.min(500, Math.max(50, Number(parsed.durability))) : undefined,
        armorValue: parsed.armorValue ? Math.min(20, Math.max(0, Number(parsed.armorValue))) : undefined,
        effectType: parsed.effectType ? String(parsed.effectType) : undefined,
        effectStrength: parsed.effectStrength ? Math.min(10, Math.max(1, Number(parsed.effectStrength))) : undefined,
      };
    } catch (error) {
      console.error('[LLMRecipeGenerator] Failed to parse response:', error);
      return null;
    }
  }

  /**
   * Validate rarity string
   */
  private validateRarity(rarity: unknown): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' {
    const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    if (typeof rarity === 'string' && validRarities.includes(rarity)) {
      return rarity as 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    }
    return 'common';
  }

  /**
   * Validate the generated recipe makes sense
   */
  private validateGeneratedRecipe(
    generated: LLMGeneratedRecipe,
    ingredients: ExperimentIngredient[],
    recipeType: RecipeType
  ): { valid: boolean; reason?: string } {
    // Check if this ID already exists (either in registry or our generated items)
    if (itemRegistry.has(generated.itemId) || this.generatedItems.has(generated.itemId)) {
      return { valid: false, reason: 'An item with this name already exists.' };
    }

    // Food needs at least one edible ingredient
    if (recipeType === 'food') {
      const hasEdible = ingredients.some(ing => {
        const item = itemRegistry.tryGet(ing.itemId);
        return item?.isEdible || item?.category === 'food';
      });
      if (!hasEdible) {
        return { valid: false, reason: 'Need at least one edible ingredient to make food.' };
      }
    }

    // Clothing needs fiber, leather, or cloth
    if (recipeType === 'clothing') {
      const hasTextile = ingredients.some(ing => {
        const id = ing.itemId.toLowerCase();
        return id.includes('fiber') || id.includes('leather') || id.includes('cloth') || id.includes('wool');
      });
      if (!hasTextile) {
        return { valid: false, reason: 'Need textile materials (fiber, leather, cloth, wool) for clothing.' };
      }
    }

    // Potions need herbs or alchemical ingredients
    if (recipeType === 'potion') {
      const hasAlchemical = ingredients.some(ing => {
        const item = itemRegistry.tryGet(ing.itemId);
        return item?.category === 'consumable' || ing.itemId.includes('herb') || ing.itemId.includes('flower');
      });
      if (!hasAlchemical) {
        return { valid: false, reason: 'Need herbs or alchemical ingredients for potions.' };
      }
    }

    return { valid: true };
  }

  /**
   * Create ItemDefinition from generated recipe
   */
  private createItemDefinition(
    generated: LLMGeneratedRecipe,
    ingredients: ExperimentIngredient[]
  ): ItemDefinition {
    // Calculate base value from ingredients
    let baseValue = 0;
    for (const ing of ingredients) {
      const item = itemRegistry.tryGet(ing.itemId);
      if (item) {
        baseValue += (item.baseValue || 10) * ing.quantity;
      }
    }
    // Add crafting value bonus
    baseValue = Math.round(baseValue * 1.5);

    return {
      id: generated.itemId,
      displayName: generated.displayName,
      category: generated.category,
      weight: 1.0,
      stackSize: generated.category === 'food' ? 20 : 10,
      isEdible: generated.category === 'food',
      hungerRestored: generated.hungerRestored,
      quality: generated.quality,
      flavors: generated.flavors as readonly ('sweet' | 'savory' | 'bitter' | 'sour' | 'spicy' | 'umami')[] | undefined,
      isStorable: true,
      isGatherable: false,
      craftedFrom: ingredients.map(ing => ({ itemId: ing.itemId, amount: ing.quantity })),
      baseValue,
      rarity: generated.rarity,
      metadata: {
        llmGenerated: true,
        description: generated.description,
        effectType: generated.effectType,
        effectStrength: generated.effectStrength,
        durability: generated.durability,
        armorValue: generated.armorValue,
      },
    };
  }

  /**
   * Create Recipe from generated data
   */
  private createRecipe(
    generated: LLMGeneratedRecipe,
    ingredients: ExperimentIngredient[]
  ): Recipe {
    return {
      id: generated.itemId,
      name: generated.displayName,
      category: this.getRecipeCategory(generated.category),
      description: generated.description || `Craft ${generated.displayName}`,
      ingredients: ingredients.map(ing => ({
        itemId: ing.itemId,
        quantity: ing.quantity,
      })),
      output: {
        itemId: generated.itemId,
        quantity: 1,
      },
      craftingTime: generated.craftingTime,
      xpGain: generated.xpGain,
      stationRequired: this.getStationForCategory(generated.category),
      skillRequirements: [],
      researchRequirements: [],
    };
  }

  /**
   * Get recipe category string
   */
  private getRecipeCategory(itemCategory: ItemCategory): string {
    const categoryMap: Record<ItemCategory, string> = {
      'resource': 'Resources',
      'food': 'Food',
      'seed': 'Farming',
      'tool': 'Tools',
      'material': 'Materials',
      'consumable': 'Consumables',
      'equipment': 'Equipment',
      'ammo': 'Ammunition',
      'misc': 'Miscellaneous',
    };
    return categoryMap[itemCategory] || 'Miscellaneous';
  }

  /**
   * Get required station for item category
   */
  private getStationForCategory(category: ItemCategory): string | null {
    switch (category) {
      case 'food':
        return 'oven';
      case 'consumable':
        return 'alchemy_station';
      case 'equipment':
        return 'loom';
      case 'tool':
        return 'workbench';
      default:
        return null;
    }
  }

  /**
   * Calculate creativity score for the invention
   */
  private calculateCreativityScore(
    generated: LLMGeneratedRecipe,
    ingredients: ExperimentIngredient[]
  ): number {
    let score = 50; // Base score

    // More ingredients = more creative
    score += ingredients.length * 5;

    // Higher rarity = more creative
    const rarityBonus: Record<string, number> = {
      'common': 0,
      'uncommon': 10,
      'rare': 20,
      'epic': 30,
      'legendary': 40,
    };
    score += rarityBonus[generated.rarity] || 0;

    // Diverse ingredient categories = more creative
    const categories = new Set(
      ingredients.map(ing => itemRegistry.tryGet(ing.itemId)?.category)
    );
    score += (categories.size - 1) * 10;

    // Cap at 100
    return Math.min(100, score);
  }

  /**
   * Get all generated recipes
   */
  getGeneratedRecipes(): Recipe[] {
    return Array.from(this.generatedRecipes.values());
  }

  /**
   * Get all generated items
   */
  getGeneratedItems(): ItemDefinition[] {
    return Array.from(this.generatedItems.values());
  }

  /**
   * Check if an item was LLM-generated
   */
  isGeneratedItem(itemId: string): boolean {
    return this.generatedItems.has(itemId);
  }

  /**
   * Get a generated recipe by ID
   */
  getGeneratedRecipe(recipeId: string): Recipe | undefined {
    return this.generatedRecipes.get(recipeId);
  }

  /**
   * Register all generated items to the global registry
   * Call this when you want to make generated items permanent
   */
  registerGeneratedItemsGlobally(): number {
    let registered = 0;
    for (const item of this.generatedItems.values()) {
      if (!itemRegistry.has(item.id)) {
        itemRegistry.register(item);
        registered++;
      }
    }
    return registered;
  }
}

/**
 * Singleton instance (lazily initialized with LLM provider)
 */
let globalRecipeGenerator: LLMRecipeGenerator | null = null;

export function initializeRecipeGenerator(llmProvider: RecipeLLMProvider): LLMRecipeGenerator {
  globalRecipeGenerator = new LLMRecipeGenerator(llmProvider);
  return globalRecipeGenerator;
}

export function getRecipeGenerator(): LLMRecipeGenerator | null {
  return globalRecipeGenerator;
}
