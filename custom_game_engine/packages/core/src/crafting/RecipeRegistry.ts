import type { Recipe } from './Recipe.js';

/**
 * Registry for storing and retrieving crafting recipes.
 * Follows CLAUDE.md: No silent fallbacks, throws on errors.
 */
export class RecipeRegistry {
  private recipes: Map<string, Recipe> = new Map();

  /**
   * Register a new recipe.
   * @throws If recipe is missing required fields
   * @throws If recipe ID is already registered
   */
  registerRecipe(recipe: Recipe): void {
    // Validate required fields (CLAUDE.md: No silent fallbacks)
    if (!recipe.id) {
      throw new Error('Recipe missing required field: id');
    }
    if (!recipe.name) {
      throw new Error('Recipe missing required field: name');
    }
    if (!recipe.category) {
      throw new Error('Recipe missing required field: category');
    }
    if (!recipe.description) {
      throw new Error('Recipe missing required field: description');
    }
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      throw new Error('Recipe missing required field: ingredients (must have at least one ingredient)');
    }
    if (!recipe.output) {
      throw new Error('Recipe missing required field: output');
    }
    if (recipe.craftingTime === undefined || recipe.craftingTime <= 0) {
      throw new Error('Recipe craftingTime must be positive');
    }
    if (recipe.xpGain === undefined || recipe.xpGain < 0) {
      throw new Error('Recipe xpGain must be non-negative');
    }

    // Validate ingredient quantities (CLAUDE.md: No silent fallbacks)
    for (const ingredient of recipe.ingredients) {
      if (ingredient.quantity <= 0) {
        throw new Error(`Ingredient quantity must be positive, got ${ingredient.quantity} for ${ingredient.itemId}`);
      }
    }

    // Validate output quantity
    if (recipe.output.quantity <= 0) {
      throw new Error(`Output quantity must be positive, got ${recipe.output.quantity}`);
    }

    // Check for duplicate
    if (this.recipes.has(recipe.id)) {
      throw new Error(`Recipe '${recipe.id}' is already registered`);
    }

    this.recipes.set(recipe.id, recipe);
  }

  /**
   * Get a recipe by ID.
   * @throws If recipe is not found
   */
  getRecipe(id: string): Recipe {
    const recipe = this.recipes.get(id);
    if (!recipe) {
      throw new Error(`Recipe not found: ${id}`);
    }
    return recipe;
  }

  /**
   * Get all registered recipes.
   */
  getAllRecipes(): Recipe[] {
    return Array.from(this.recipes.values());
  }

  /**
   * Get recipes filtered by category.
   */
  getRecipesByCategory(category: string): Recipe[] {
    if (category === 'All') {
      return this.getAllRecipes();
    }
    return this.getAllRecipes().filter(r => r.category === category);
  }

  /**
   * Get recipes filtered by workstation requirement.
   * @param station - Station type, or null for hand-craftable recipes
   */
  getRecipesByStation(station: string | null): Recipe[] {
    return this.getAllRecipes().filter(r => r.stationRequired === station);
  }

  /**
   * Search recipes by name (case-insensitive).
   */
  searchRecipes(query: string): Recipe[] {
    if (!query) {
      return this.getAllRecipes();
    }
    const lowerQuery = query.toLowerCase();
    return this.getAllRecipes().filter(r =>
      r.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Check if a recipe exists.
   */
  hasRecipe(id: string): boolean {
    return this.recipes.has(id);
  }

  /**
   * Get count of registered recipes.
   */
  getRecipeCount(): number {
    return this.recipes.size;
  }

  /**
   * Get all unique categories from registered recipes.
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const recipe of this.recipes.values()) {
      categories.add(recipe.category);
    }
    return Array.from(categories);
  }
}

/**
 * Global recipe registry instance.
 */
export const globalRecipeRegistry = new RecipeRegistry();

/**
 * Initialize with default recipes for testing/demo.
 */
export function initializeDefaultRecipes(registry: RecipeRegistry = globalRecipeRegistry): void {
  // Hand-craftable tools
  registry.registerRecipe({
    id: 'stone_axe',
    name: 'Stone Axe',
    category: 'Tools',
    description: 'A basic axe for chopping wood.',
    ingredients: [
      { itemId: 'stone', quantity: 2 },
      { itemId: 'wood', quantity: 3 },
      { itemId: 'fiber', quantity: 1 }
    ],
    output: { itemId: 'stone_axe', quantity: 1 },
    craftingTime: 5,
    xpGain: 10,
    stationRequired: null,
    skillRequirements: [],
    researchRequirements: []
  });

  registry.registerRecipe({
    id: 'stone_pickaxe',
    name: 'Stone Pickaxe',
    category: 'Tools',
    description: 'A basic pickaxe for mining stone.',
    ingredients: [
      { itemId: 'stone', quantity: 3 },
      { itemId: 'wood', quantity: 2 }
    ],
    output: { itemId: 'stone_pickaxe', quantity: 1 },
    craftingTime: 5,
    xpGain: 10,
    stationRequired: null,
    skillRequirements: [],
    researchRequirements: []
  });

  registry.registerRecipe({
    id: 'wooden_hammer',
    name: 'Wooden Hammer',
    category: 'Tools',
    description: 'A simple hammer for construction.',
    ingredients: [
      { itemId: 'wood', quantity: 5 }
    ],
    output: { itemId: 'wooden_hammer', quantity: 1 },
    craftingTime: 3,
    xpGain: 5,
    stationRequired: null,
    skillRequirements: [],
    researchRequirements: []
  });

  // Food (hand-craftable)
  registry.registerRecipe({
    id: 'bread',
    name: 'Bread',
    category: 'Food',
    description: 'Basic bread baked from wheat.',
    ingredients: [
      { itemId: 'wheat', quantity: 3 }
    ],
    output: { itemId: 'bread', quantity: 1 },
    craftingTime: 10,
    xpGain: 5,
    stationRequired: null,
    skillRequirements: [],
    researchRequirements: []
  });

  // Workbench recipes
  registry.registerRecipe({
    id: 'iron_axe',
    name: 'Iron Axe',
    category: 'Tools',
    description: 'A durable iron axe.',
    ingredients: [
      { itemId: 'iron_ingot', quantity: 2 },
      { itemId: 'wood', quantity: 2 }
    ],
    output: { itemId: 'iron_axe', quantity: 1 },
    craftingTime: 15,
    xpGain: 25,
    stationRequired: 'workbench',
    skillRequirements: [],
    researchRequirements: []
  });

  // Forge recipes
  registry.registerRecipe({
    id: 'iron_ingot',
    name: 'Iron Ingot',
    category: 'Materials',
    description: 'Smelt iron ore into ingots.',
    ingredients: [
      { itemId: 'iron_ore', quantity: 3 }
    ],
    output: { itemId: 'iron_ingot', quantity: 1 },
    craftingTime: 20,
    xpGain: 15,
    stationRequired: 'forge',
    skillRequirements: [],
    researchRequirements: []
  });

  registry.registerRecipe({
    id: 'iron_sword',
    name: 'Iron Sword',
    category: 'Weapons',
    description: 'A sharp iron blade.',
    ingredients: [
      { itemId: 'iron_ingot', quantity: 5 },
      { itemId: 'wood', quantity: 1 }
    ],
    output: { itemId: 'iron_sword', quantity: 1 },
    craftingTime: 30,
    xpGain: 50,
    stationRequired: 'forge',
    skillRequirements: [{ skill: 'smithing', level: 3 }],
    researchRequirements: []
  });

  // Oven recipes
  registry.registerRecipe({
    id: 'pie',
    name: 'Berry Pie',
    category: 'Food',
    description: 'A delicious baked pie.',
    ingredients: [
      { itemId: 'berries', quantity: 5 },
      { itemId: 'wheat', quantity: 2 }
    ],
    output: { itemId: 'pie', quantity: 1 },
    craftingTime: 15,
    xpGain: 12,
    stationRequired: 'oven',
    skillRequirements: [],
    researchRequirements: []
  });

  registry.registerRecipe({
    id: 'stew',
    name: 'Vegetable Stew',
    category: 'Food',
    description: 'A hearty vegetable stew.',
    ingredients: [
      { itemId: 'carrot', quantity: 2 },
      { itemId: 'potato', quantity: 2 },
      { itemId: 'water', quantity: 1 }
    ],
    output: { itemId: 'stew', quantity: 1 },
    craftingTime: 12,
    xpGain: 8,
    stationRequired: 'oven',
    skillRequirements: [],
    researchRequirements: []
  });
}
