import { describe, it, expect, beforeEach } from 'vitest';
import { RecipeRegistry } from '../RecipeRegistry';
import { Recipe } from '../Recipe';

describe('RecipeRegistry', () => {
  let registry: RecipeRegistry;

  beforeEach(() => {
    registry = new RecipeRegistry();
  });

  describe('Recipe Registration (REQ-CRAFT-001, REQ-CRAFT-002)', () => {
    it('should register a recipe with all required fields', () => {
      const recipe: Recipe = {
        id: 'stone_axe',
        name: 'Stone Axe',
        category: 'Tools',
        description: 'A basic axe for chopping wood',
        ingredients: [
          { itemId: 'stone', quantity: 2 },
          { itemId: 'wood', quantity: 3 },
          { itemId: 'fiber', quantity: 1 }
        ],
        output: { itemId: 'stone_axe', quantity: 1 },
        craftingTime: 5,
        xpGain: 10,
        stationRequired: null, // Hand craftable
        skillRequirements: [],
        researchRequirements: []
      };

      registry.registerRecipe(recipe);
      const retrieved = registry.getRecipe('stone_axe');

      expect(retrieved).toEqual(recipe);
    });

    it('should throw when registering recipe with missing required field', () => {
      const invalidRecipe: Omit<Recipe, 'category' | 'description' | 'ingredients' | 'output' | 'craftingTime' | 'xpGain' | 'stationRequired' | 'skillRequirements' | 'researchRequirements'> = {
        id: 'incomplete',
        name: 'Incomplete Recipe'
        // Missing ingredients, output, etc.
      };

      expect(() => registry.registerRecipe(invalidRecipe as Recipe)).toThrow('missing required field');
    });

    it('should throw when registering duplicate recipe ID', () => {
      const recipe: Recipe = {
        id: 'duplicate',
        name: 'First',
        category: 'Tools',
        description: 'Test',
        ingredients: [{ itemId: 'wood', quantity: 1 }],
        output: { itemId: 'item', quantity: 1 },
        craftingTime: 1,
        xpGain: 1,
        stationRequired: null,
        skillRequirements: [],
        researchRequirements: []
      };

      registry.registerRecipe(recipe);

      expect(() => registry.registerRecipe({ ...recipe, name: 'Second' })).toThrow('already registered');
    });

    it('should retrieve all recipes', () => {
      const recipe1: Recipe = {
        id: 'axe',
        name: 'Axe',
        category: 'Tools',
        description: 'Tool',
        ingredients: [{ itemId: 'wood', quantity: 1 }],
        output: { itemId: 'axe', quantity: 1 },
        craftingTime: 5,
        xpGain: 10,
        stationRequired: null,
        skillRequirements: [],
        researchRequirements: []
      };

      const recipe2: Recipe = {
        id: 'bread',
        name: 'Bread',
        category: 'Food',
        description: 'Food',
        ingredients: [{ itemId: 'wheat', quantity: 3 }],
        output: { itemId: 'bread', quantity: 1 },
        craftingTime: 10,
        xpGain: 5,
        stationRequired: 'oven',
        skillRequirements: [],
        researchRequirements: []
      };

      registry.registerRecipe(recipe1);
      registry.registerRecipe(recipe2);

      const allRecipes = registry.getAllRecipes();
      expect(allRecipes).toHaveLength(2);
      expect(allRecipes).toContainEqual(recipe1);
      expect(allRecipes).toContainEqual(recipe2);
    });
  });

  describe('Recipe Filtering (REQ-CRAFT-002)', () => {
    beforeEach(() => {
      // Register test recipes
      registry.registerRecipe({
        id: 'stone_axe',
        name: 'Stone Axe',
        category: 'Tools',
        description: 'Hand tool',
        ingredients: [{ itemId: 'stone', quantity: 2 }],
        output: { itemId: 'stone_axe', quantity: 1 },
        craftingTime: 5,
        xpGain: 10,
        stationRequired: null,
        skillRequirements: [],
        researchRequirements: []
      });

      registry.registerRecipe({
        id: 'iron_sword',
        name: 'Iron Sword',
        category: 'Weapons',
        description: 'Weapon',
        ingredients: [{ itemId: 'iron', quantity: 5 }],
        output: { itemId: 'iron_sword', quantity: 1 },
        craftingTime: 30,
        xpGain: 50,
        stationRequired: 'forge',
        skillRequirements: [{ skill: 'smithing', level: 3 }],
        researchRequirements: []
      });

      registry.registerRecipe({
        id: 'bread',
        name: 'Bread',
        category: 'Food',
        description: 'Edible',
        ingredients: [{ itemId: 'wheat', quantity: 3 }],
        output: { itemId: 'bread', quantity: 1 },
        craftingTime: 10,
        xpGain: 5,
        stationRequired: 'oven',
        skillRequirements: [],
        researchRequirements: []
      });
    });

    it('should filter recipes by category', () => {
      const toolRecipes = registry.getRecipesByCategory('Tools');
      expect(toolRecipes).toHaveLength(1);
      expect(toolRecipes[0].id).toBe('stone_axe');
    });

    it('should filter recipes by station requirement', () => {
      const handCraftable = registry.getRecipesByStation(null);
      expect(handCraftable).toHaveLength(1);
      expect(handCraftable[0].id).toBe('stone_axe');

      const forgeRecipes = registry.getRecipesByStation('forge');
      expect(forgeRecipes).toHaveLength(1);
      expect(forgeRecipes[0].id).toBe('iron_sword');
    });

    it('should search recipes by name', () => {
      const results = registry.searchRecipes('axe');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('stone_axe');
    });

    it('should search recipes case-insensitively', () => {
      const results = registry.searchRecipes('BREAD');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('bread');
    });

    it('should return empty array when no recipes match search', () => {
      const results = registry.searchRecipes('nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('Recipe Validation (CLAUDE.md - No Silent Fallbacks)', () => {
    it('should throw when getting non-existent recipe', () => {
      expect(() => registry.getRecipe('nonexistent')).toThrow('Recipe not found');
    });

    it('should throw when recipe has empty ingredients array', () => {
      const invalidRecipe: Recipe = {
        id: 'invalid',
        name: 'Invalid',
        category: 'Tools',
        description: 'Test',
        ingredients: [], // Empty - should require at least one ingredient
        output: { itemId: 'item', quantity: 1 },
        craftingTime: 5,
        xpGain: 10,
        stationRequired: null,
        skillRequirements: [],
        researchRequirements: []
      };

      expect(() => registry.registerRecipe(invalidRecipe)).toThrow('at least one ingredient');
    });

    it('should throw when recipe has invalid ingredient quantity', () => {
      const invalidRecipe: Recipe = {
        id: 'invalid',
        name: 'Invalid',
        category: 'Tools',
        description: 'Test',
        ingredients: [{ itemId: 'wood', quantity: 0 }], // Zero quantity invalid
        output: { itemId: 'item', quantity: 1 },
        craftingTime: 5,
        xpGain: 10,
        stationRequired: null,
        skillRequirements: [],
        researchRequirements: []
      };

      expect(() => registry.registerRecipe(invalidRecipe)).toThrow('quantity must be positive');
    });

    it('should throw when recipe has invalid output quantity', () => {
      const invalidRecipe: Recipe = {
        id: 'invalid',
        name: 'Invalid',
        category: 'Tools',
        description: 'Test',
        ingredients: [{ itemId: 'wood', quantity: 1 }],
        output: { itemId: 'item', quantity: -1 }, // Negative quantity
        craftingTime: 5,
        xpGain: 10,
        stationRequired: null,
        skillRequirements: [],
        researchRequirements: []
      };

      expect(() => registry.registerRecipe(invalidRecipe)).toThrow('quantity must be positive');
    });

    it('should throw when recipe has invalid crafting time', () => {
      const invalidRecipe: Recipe = {
        id: 'invalid',
        name: 'Invalid',
        category: 'Tools',
        description: 'Test',
        ingredients: [{ itemId: 'wood', quantity: 1 }],
        output: { itemId: 'item', quantity: 1 },
        craftingTime: 0, // Zero or negative time invalid
        xpGain: 10,
        stationRequired: null,
        skillRequirements: [],
        researchRequirements: []
      };

      expect(() => registry.registerRecipe(invalidRecipe)).toThrow('craftingTime must be positive');
    });
  });

  describe('Recipe Categories (REQ-CRAFT-002)', () => {
    it('should return all unique categories', () => {
      registry.registerRecipe({
        id: 'axe',
        name: 'Axe',
        category: 'Tools',
        description: 'Tool',
        ingredients: [{ itemId: 'wood', quantity: 1 }],
        output: { itemId: 'axe', quantity: 1 },
        craftingTime: 5,
        xpGain: 10,
        stationRequired: null,
        skillRequirements: [],
        researchRequirements: []
      });

      registry.registerRecipe({
        id: 'sword',
        name: 'Sword',
        category: 'Weapons',
        description: 'Weapon',
        ingredients: [{ itemId: 'iron', quantity: 3 }],
        output: { itemId: 'sword', quantity: 1 },
        craftingTime: 20,
        xpGain: 30,
        stationRequired: 'forge',
        skillRequirements: [],
        researchRequirements: []
      });

      registry.registerRecipe({
        id: 'pickaxe',
        name: 'Pickaxe',
        category: 'Tools',
        description: 'Tool',
        ingredients: [{ itemId: 'wood', quantity: 2 }],
        output: { itemId: 'pickaxe', quantity: 1 },
        craftingTime: 7,
        xpGain: 12,
        stationRequired: null,
        skillRequirements: [],
        researchRequirements: []
      });

      const categories = registry.getCategories();
      expect(categories).toHaveLength(2);
      expect(categories).toContain('Tools');
      expect(categories).toContain('Weapons');
    });
  });
});
