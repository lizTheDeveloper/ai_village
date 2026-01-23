import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  WorldImpl,
  EventBusImpl,
  createInventoryComponent,
  createAgentComponent,
  globalRecipeRegistry,
  type Recipe
} from '@ai-village/core';
import { IngredientPanel } from '../IngredientPanel.js';

/**
 * Tests for IngredientPanel - Part of Fake Implementations Cleanup
 *
 * Criterion 4: IngredientPanel should show real inventory counts, not hardcoded "10"
 *
 * Work Order: custom_game_engine/agents/autonomous-dev/work-orders/fake-implementations-cleanup/work-order.md
 */

describe('IngredientPanel - Fake Implementation Cleanup', () => {
  let world: World;
  let eventBus: EventBusImpl;
  const testRecipeIds: string[] = [];

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new World(eventBus);
  });

  afterEach(() => {
    // Clean up test recipes
    for (const recipeId of testRecipeIds) {
      try {
        // Remove from registry's internal map (accessing private field via cast)
        const registry = globalRecipeRegistry as any;
        registry.recipes?.delete(recipeId);
      } catch {
        // Ignore errors during cleanup
      }
    }
    testRecipeIds.length = 0;
  });

  function registerTestRecipe(recipe: Recipe): void {
    try {
      globalRecipeRegistry.registerRecipe(recipe);
      testRecipeIds.push(recipe.id);
    } catch (e) {
      // Recipe might already exist, ignore
    }
  }

  describe('Criterion 4: Shows real inventory counts', () => {

    it('should query actual inventory, not return hardcoded "10"', () => {
      // Register test recipe
      registerTestRecipe({
        id: 'test_recipe_1',
        name: 'Test Recipe',
        category: 'test',
        description: 'A test recipe',
        ingredients: [
          { itemId: 'wood', quantity: 3 },
          { itemId: 'stone', quantity: 10 }
        ],
        output: { itemId: 'test_item', quantity: 1 },
        craftingTime: 1,
        xpGain: 1,
        stationRequired: null
      });

      const panel = new IngredientPanel(world, 0, 0, 200, 300);

      // Create an agent with inventory
      const agent = world.createEntity();
      const inventory = createInventoryComponent(20, 100);

      // Add specific items to inventory with NON-10 quantities
      inventory.slots[0] = { itemId: 'wood', quantity: 5 };
      inventory.slots[1] = { itemId: 'stone', quantity: 15 };
      inventory.slots[2] = { itemId: 'iron', quantity: 7 };

      (agent as any).addComponent(inventory);
      (agent as any).addComponent(createAgentComponent('Test Agent'));

      // Set recipe on panel
      panel.setRecipe('test_recipe_1', agent.id);

      // Check that available counts match actual inventory (not hardcoded 10)
      const woodIngredient = panel.ingredients.find(ing => ing.itemId === 'wood');
      const stoneIngredient = panel.ingredients.find(ing => ing.itemId === 'stone');

      // CRITICAL: These should NOT all be 10
      expect(woodIngredient?.available).toBe(5); // Should be actual count from inventory
      expect(stoneIngredient?.available).toBe(15); // Should be actual count from inventory

      // The old fake implementation would make both = 10
      expect(woodIngredient?.available).not.toBe(10);
      expect(stoneIngredient?.available).not.toBe(10);
    });

    it('should update available counts when inventory changes', () => {
      registerTestRecipe({
        id: 'test_recipe_2',
        name: 'Test Recipe 2',
        category: 'test',
        description: 'A test recipe',
        ingredients: [
          { itemId: 'wood', quantity: 5 }
        ],
        output: { itemId: 'test_item', quantity: 1 },
        craftingTime: 1,
        xpGain: 1,
        stationRequired: null
      });

      const panel = new IngredientPanel(world, 0, 0, 200, 300);

      const agent = world.createEntity();
      const inventory = createInventoryComponent(20, 100);
      inventory.slots[0] = { itemId: 'wood', quantity: 3 };

      (agent as any).addComponent(inventory);
      (agent as any).addComponent(createAgentComponent('Test Agent'));

      panel.setRecipe('test_recipe_2', agent.id);

      // Initial count
      let woodIngredient = panel.ingredients.find(ing => ing.itemId === 'wood');
      expect(woodIngredient?.available).toBe(3);

      // Add more wood to inventory
      inventory.slots[0].quantity = 8;

      // Trigger refresh by emitting inventory:changed event
      eventBus.emit({
        type: 'inventory:changed',
        source: agent.id,
        data: { entityId: agent.id }
      });

      // Wait for event to process
      panel.refresh();

      // Count should update to 8, not stay at 3 or be hardcoded to 10
      woodIngredient = panel.ingredients.find(ing => ing.itemId === 'wood');
      expect(woodIngredient?.available).toBe(8);
      expect(woodIngredient?.available).not.toBe(10);
    });

    it('should throw error if inventory is not found (no silent fallback)', () => {
      registerTestRecipe({
        id: 'test_recipe_3',
        name: 'Test Recipe 3',
        category: 'test',
        description: 'A test recipe',
        ingredients: [{ itemId: 'wood', quantity: 5 }],
        output: { itemId: 'test_item', quantity: 1 },
        craftingTime: 1,
        xpGain: 1,
        stationRequired: null
      });

      const panel = new IngredientPanel(world, 0, 0, 200, 300);

      // Try to set recipe for non-existent agent
      // Per CLAUDE.md: Should throw, not use fallback value
      // (Implementation throws "Agent entity not found" which is correct - no silent fallback)
      expect(() => {
        panel.setRecipe('test_recipe_3', 'nonexistent_agent_id');
      }).toThrow(/Agent entity.*not found/i);
    });

    it('should correctly calculate status based on actual inventory', () => {
      registerTestRecipe({
        id: 'test_recipe_4',
        name: 'Test Recipe 4',
        category: 'test',
        description: 'A test recipe',
        ingredients: [
          { itemId: 'wood', quantity: 10 },
          { itemId: 'stone', quantity: 5 },
          { itemId: 'iron', quantity: 3 }
        ],
        output: { itemId: 'test_item', quantity: 1 },
        craftingTime: 1,
        xpGain: 1,
        stationRequired: null
      });

      const panel = new IngredientPanel(world, 0, 0, 200, 300);

      const agent = world.createEntity();
      const inventory = createInventoryComponent(20, 100);

      // Different inventory levels to test status calculation
      inventory.slots[0] = { itemId: 'wood', quantity: 12 }; // AVAILABLE (>= required)
      inventory.slots[1] = { itemId: 'stone', quantity: 3 }; // PARTIAL (< required)
      // iron not in inventory - MISSING

      (agent as any).addComponent(inventory);
      (agent as any).addComponent(createAgentComponent('Test Agent'));

      panel.setRecipe('test_recipe_4', agent.id);

      // Check status is based on actual counts, not hardcoded 10
      const woodIngredient = panel.ingredients.find(ing => ing.itemId === 'wood');
      const stoneIngredient = panel.ingredients.find(ing => ing.itemId === 'stone');
      const ironIngredient = panel.ingredients.find(ing => ing.itemId === 'iron');

      expect(woodIngredient?.available).toBe(12);
      expect(woodIngredient?.status).toBe('AVAILABLE');

      expect(stoneIngredient?.available).toBe(3);
      expect(stoneIngredient?.status).toBe('PARTIAL');

      expect(ironIngredient?.available).toBe(0);
      expect(ironIngredient?.status).toBe('MISSING');
    });
  });
});
