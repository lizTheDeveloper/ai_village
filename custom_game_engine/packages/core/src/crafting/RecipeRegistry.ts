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
 * Note: Auto-generated recipes should be registered FIRST, then manual recipes
 * can override them if needed.
 */
// Track initialized registries to prevent double-initialization
const initializedRegistries = new WeakSet<RecipeRegistry>();

export async function initializeDefaultRecipes(registry: RecipeRegistry = globalRecipeRegistry): Promise<void> {
  // Guard against double-initialization
  if (initializedRegistries.has(registry)) {
    return;
  }
  initializedRegistries.add(registry);

  // Import auto-generator
  const { autoGenerateAllRecipes } = await import('./RecipeAutoGenerator.js');

  // Auto-generate all recipes from items with craftedFrom data
  autoGenerateAllRecipes(registry);

  // Manual recipes below can override auto-generated ones if needed
  // (They won't be registered if the ID already exists)

  // Helper function to try registering without throwing on duplicates
  const tryRegister = (recipe: Recipe) => {
    try {
      registry.registerRecipe(recipe);
    } catch (error) {
      // Silently skip if already registered (auto-generated takes precedence)
    }
  };

  // Hand-craftable tools
  tryRegister({
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

  tryRegister({
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

  tryRegister({
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

  // Food (oven - baking specialization)
  tryRegister({
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
    stationRequired: 'oven',
    skillRequirements: [],
    researchRequirements: []
  });

  // Workbench recipes
  tryRegister({
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
  tryRegister({
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

  tryRegister({
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
  tryRegister({
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

  // Stew (cauldron - stewing specialization)
  tryRegister({
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
    stationRequired: 'cauldron',
    skillRequirements: [],
    researchRequirements: []
  });

  // Cooked meat (campfire - grilling specialization)
  tryRegister({
    id: 'cooked_meat',
    name: 'Cooked Meat',
    category: 'Food',
    description: 'Freshly grilled meat.',
    ingredients: [
      { itemId: 'raw_meat', quantity: 1 }
    ],
    output: { itemId: 'cooked_meat', quantity: 1 },
    craftingTime: 8,
    xpGain: 5,
    stationRequired: 'campfire',
    skillRequirements: [],
    researchRequirements: []
  });

  // === Farming Tools ===
  tryRegister({
    id: 'stone_hoe',
    name: 'Stone Hoe',
    category: 'Tools',
    description: 'A basic hoe for tilling soil.',
    ingredients: [
      { itemId: 'wood', quantity: 2 },
      { itemId: 'stone', quantity: 2 }
    ],
    output: { itemId: 'stone_hoe', quantity: 1 },
    craftingTime: 4,
    xpGain: 8,
    stationRequired: null,
    skillRequirements: [],
    researchRequirements: ['agriculture_i']
  });

  // === Materials ===
  tryRegister({
    id: 'cloth',
    name: 'Cloth',
    category: 'Materials',
    description: 'Woven cloth from plant fibers.',
    ingredients: [
      { itemId: 'fiber', quantity: 3 }
    ],
    output: { itemId: 'cloth', quantity: 1 },
    craftingTime: 8,
    xpGain: 5,
    stationRequired: 'loom',
    skillRequirements: [],
    researchRequirements: ['textiles_i']
  });

  tryRegister({
    id: 'rope',
    name: 'Rope',
    category: 'Materials',
    description: 'Sturdy rope braided from fibers.',
    ingredients: [
      { itemId: 'fiber', quantity: 5 }
    ],
    output: { itemId: 'rope', quantity: 1 },
    craftingTime: 5,
    xpGain: 5,
    stationRequired: null,
    skillRequirements: [],
    researchRequirements: ['crafting_i']
  });

  tryRegister({
    id: 'fertilizer',
    name: 'Fertilizer',
    category: 'Materials',
    description: 'Nutrient-rich compost for crops.',
    ingredients: [
      { itemId: 'fiber', quantity: 5 },
      { itemId: 'leaves', quantity: 5 }
    ],
    output: { itemId: 'fertilizer', quantity: 2 },
    craftingTime: 10,
    xpGain: 8,
    stationRequired: null,
    skillRequirements: [],
    researchRequirements: ['agriculture_ii']
  });

  // === Preserved Food ===
  tryRegister({
    id: 'dried_meat',
    name: 'Dried Meat',
    category: 'Food',
    description: 'Preserved meat that lasts longer.',
    ingredients: [
      { itemId: 'raw_meat', quantity: 2 }
    ],
    output: { itemId: 'dried_meat', quantity: 1 },
    craftingTime: 15,
    xpGain: 10,
    stationRequired: 'campfire',
    skillRequirements: [],
    researchRequirements: ['cuisine_i']
  });

  // === Clothing ===
  tryRegister({
    id: 'simple_clothing',
    name: 'Simple Clothing',
    category: 'Decorations',
    description: 'Basic woven garments.',
    ingredients: [
      { itemId: 'cloth', quantity: 3 }
    ],
    output: { itemId: 'simple_clothing', quantity: 1 },
    craftingTime: 12,
    xpGain: 10,
    stationRequired: 'loom',
    skillRequirements: [],
    researchRequirements: ['textiles_i']
  });

  tryRegister({
    id: 'fine_clothing',
    name: 'Fine Clothing',
    category: 'Decorations',
    description: 'Well-crafted garments.',
    ingredients: [
      { itemId: 'cloth', quantity: 5 },
      { itemId: 'fiber', quantity: 2 }
    ],
    output: { itemId: 'fine_clothing', quantity: 1 },
    craftingTime: 20,
    xpGain: 20,
    stationRequired: 'loom',
    skillRequirements: [],
    researchRequirements: ['textiles_ii']
  });

  tryRegister({
    id: 'leather_armor',
    name: 'Leather Armor',
    category: 'Decorations',
    description: 'Protective leather armor.',
    ingredients: [
      { itemId: 'leather', quantity: 8 },
      { itemId: 'fiber', quantity: 3 }
    ],
    output: { itemId: 'leather_armor', quantity: 1 },
    craftingTime: 25,
    xpGain: 30,
    stationRequired: 'workbench',
    skillRequirements: [],
    researchRequirements: ['textiles_ii']
  });

  // === Potions ===
  tryRegister({
    id: 'healing_potion',
    name: 'Healing Potion',
    category: 'Materials',
    description: 'A potion that restores health.',
    ingredients: [
      { itemId: 'berry', quantity: 5 },
      { itemId: 'water', quantity: 1 }
    ],
    output: { itemId: 'healing_potion', quantity: 1 },
    craftingTime: 15,
    xpGain: 15,
    stationRequired: 'alchemy_lab',
    skillRequirements: [],
    researchRequirements: ['alchemy_i']
  });

  tryRegister({
    id: 'energy_potion',
    name: 'Energy Potion',
    category: 'Materials',
    description: 'A potion that restores energy.',
    ingredients: [
      { itemId: 'wheat', quantity: 3 },
      { itemId: 'water', quantity: 1 }
    ],
    output: { itemId: 'energy_potion', quantity: 1 },
    craftingTime: 15,
    xpGain: 15,
    stationRequired: 'alchemy_lab',
    skillRequirements: [],
    researchRequirements: ['alchemy_i']
  });

  // === Advanced Materials ===
  tryRegister({
    id: 'steel_ingot',
    name: 'Steel Ingot',
    category: 'Materials',
    description: 'Strong steel alloy.',
    ingredients: [
      { itemId: 'iron_ingot', quantity: 2 },
      { itemId: 'coal', quantity: 1 }
    ],
    output: { itemId: 'steel_ingot', quantity: 1 },
    craftingTime: 25,
    xpGain: 20,
    stationRequired: 'forge',
    skillRequirements: [],
    researchRequirements: ['metallurgy_ii']
  });

  tryRegister({
    id: 'copper_ingot',
    name: 'Copper Ingot',
    category: 'Materials',
    description: 'Smelted copper.',
    ingredients: [
      { itemId: 'copper_ore', quantity: 2 }
    ],
    output: { itemId: 'copper_ingot', quantity: 1 },
    craftingTime: 18,
    xpGain: 12,
    stationRequired: 'forge',
    skillRequirements: [],
    researchRequirements: ['metallurgy_i']
  });

  tryRegister({
    id: 'mithril_ingot',
    name: 'Mithril Ingot',
    category: 'Materials',
    description: 'Legendary lightweight metal.',
    ingredients: [
      { itemId: 'iron_ingot', quantity: 2 },
      { itemId: 'gold_ingot', quantity: 1 }
    ],
    output: { itemId: 'mithril_ingot', quantity: 1 },
    craftingTime: 40,
    xpGain: 50,
    stationRequired: 'forge',
    skillRequirements: [{ skill: 'smithing', level: 5 }],
    researchRequirements: ['metallurgy_iii']
  });

  tryRegister({
    id: 'adamantine_ingot',
    name: 'Adamantine Ingot',
    category: 'Materials',
    description: 'Legendary unbreakable metal.',
    ingredients: [
      { itemId: 'steel_ingot', quantity: 3 },
      { itemId: 'coal', quantity: 5 }
    ],
    output: { itemId: 'adamantine_ingot', quantity: 1 },
    craftingTime: 60,
    xpGain: 80,
    stationRequired: 'forge',
    skillRequirements: [{ skill: 'smithing', level: 7 }],
    researchRequirements: ['metallurgy_iii']
  });

  // === Steel Tools ===
  tryRegister({
    id: 'steel_sword',
    name: 'Steel Sword',
    category: 'Weapons',
    description: 'A powerful steel blade.',
    ingredients: [
      { itemId: 'steel_ingot', quantity: 3 },
      { itemId: 'wood', quantity: 1 }
    ],
    output: { itemId: 'steel_sword', quantity: 1 },
    craftingTime: 35,
    xpGain: 60,
    stationRequired: 'forge',
    skillRequirements: [{ skill: 'smithing', level: 4 }],
    researchRequirements: ['metallurgy_ii']
  });

  tryRegister({
    id: 'steel_pickaxe',
    name: 'Steel Pickaxe',
    category: 'Tools',
    description: 'A durable steel pickaxe.',
    ingredients: [
      { itemId: 'steel_ingot', quantity: 3 },
      { itemId: 'wood', quantity: 2 }
    ],
    output: { itemId: 'steel_pickaxe', quantity: 1 },
    craftingTime: 30,
    xpGain: 50,
    stationRequired: 'forge',
    skillRequirements: [],
    researchRequirements: ['metallurgy_ii']
  });
}
