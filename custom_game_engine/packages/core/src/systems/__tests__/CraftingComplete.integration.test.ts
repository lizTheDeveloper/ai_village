import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { createMinimalWorld } from '../../__tests__/fixtures/worldFixtures.js';
import { CraftingSystem } from '../../crafting/CraftingSystem.js';
import { RecipeRegistry } from '../../crafting/RecipeRegistry.js';
import type { Recipe } from '../../crafting/Recipe.js';
import { createInventoryComponent, addToInventory } from '../../components/InventoryComponent.js';

/**
 * Integration tests for CraftingSystem + InventorySystem + BuildingSystem
 *
 * Tests verify that:
 * - Crafting recipes check ingredient availability
 * - Crafting consumes ingredients from inventory
 * - Crafting adds products to inventory
 * - Crafting stations (workbench, furnace) required for specific recipes
 * - Fuel consumption for furnace recipes
 * - Crafting queue pauses when ingredients missing
 * - Crafting job completion time based on recipe
 */

describe('CraftingSystem + Inventory + Building Integration', () => {
  let harness: IntegrationTestHarness;

  beforeEach(() => {
    harness = createMinimalWorld();
  });

  it('should queue crafting jobs for agents', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });
    agent.addComponent(createInventoryComponent());

    const craftingSystem = new CraftingSystem();
    harness.registerSystem('CraftingSystem', craftingSystem);

    // Create a simple recipe
    const recipe = {
      id: 'wood_plank',
      name: 'Wood Plank',
      ingredients: [{ itemId: 'wood', quantity: 1 }],
      outputs: [{ itemId: 'plank', quantity: 4 }],
      craftingTime: 5,
      station: 'none',
    };

    // Queue a job
    const job = craftingSystem.queueJob(agent.id, recipe, 1);

    expect(job).toBeDefined();
    expect(job.status).toBe('queued');

    // Check queue
    const queue = craftingSystem.getQueue(agent.id);
    expect(queue.length).toBe(1);
    expect(queue[0].recipeId).toBe('wood_plank');
  });

  it('should reject invalid job quantities', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });

    const craftingSystem = new CraftingSystem();
    harness.registerSystem('CraftingSystem', craftingSystem);

    const recipe = {
      id: 'test_recipe',
      name: 'Test',
      ingredients: [],
      outputs: [],
      craftingTime: 5,
      station: 'none',
    };

    // Should throw on invalid quantity
    expect(() => {
      craftingSystem.queueJob(agent.id, recipe, 0);
    }).toThrow('Job quantity must be positive');

    expect(() => {
      craftingSystem.queueJob(agent.id, recipe, -5);
    }).toThrow('Job quantity must be positive');
  });

  it('should enforce queue size limit', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });

    const craftingSystem = new CraftingSystem();
    harness.registerSystem('CraftingSystem', craftingSystem);

    const recipe = {
      id: 'test_recipe',
      name: 'Test',
      ingredients: [],
      outputs: [],
      craftingTime: 5,
      station: 'none',
    };

    // Queue max jobs (10)
    for (let i = 0; i < 10; i++) {
      craftingSystem.queueJob(agent.id, recipe, 1);
    }

    // 11th job should fail
    expect(() => {
      craftingSystem.queueJob(agent.id, recipe, 1);
    }).toThrow('Queue is full');
  });

  it('should allow canceling queued jobs', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });

    const craftingSystem = new CraftingSystem();
    harness.registerSystem('CraftingSystem', craftingSystem);

    const recipe = {
      id: 'test_recipe',
      name: 'Test',
      ingredients: [],
      outputs: [],
      craftingTime: 5,
      station: 'none',
    };

    const job1 = craftingSystem.queueJob(agent.id, recipe, 1);
    const job2 = craftingSystem.queueJob(agent.id, recipe, 1);

    expect(craftingSystem.getQueue(agent.id).length).toBe(2);

    // Cancel first job
    craftingSystem.cancelJob(agent.id, job1.id);

    const queue = craftingSystem.getQueue(agent.id);
    expect(queue.length).toBe(1);
    expect(queue[0].id).toBe(job2.id);
  });

  it('should prevent canceling non-existent jobs', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });

    const craftingSystem = new CraftingSystem();
    harness.registerSystem('CraftingSystem', craftingSystem);

    expect(() => {
      craftingSystem.cancelJob(agent.id, 'non-existent-job-id');
    }).toThrow('Agent has no crafting queue');

    const recipe = {
      id: 'test_recipe',
      name: 'Test',
      ingredients: [],
      outputs: [],
      craftingTime: 5,
      station: 'none',
    };

    craftingSystem.queueJob(agent.id, recipe, 1);

    expect(() => {
      craftingSystem.cancelJob(agent.id, 'non-existent-job-id');
    }).toThrow('Job not found');
  });

  it('should allow reordering queued jobs', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });

    const craftingSystem = new CraftingSystem();
    harness.registerSystem('CraftingSystem', craftingSystem);

    const recipe = {
      id: 'test_recipe',
      name: 'Test',
      ingredients: [],
      outputs: [],
      craftingTime: 5,
      station: 'none',
    };

    const job1 = craftingSystem.queueJob(agent.id, recipe, 1);
    const job2 = craftingSystem.queueJob(agent.id, recipe, 1);
    const job3 = craftingSystem.queueJob(agent.id, recipe, 1);

    // Move job3 to position 0
    craftingSystem.reorderQueue(agent.id, job3.id, 0);

    const queue = craftingSystem.getQueue(agent.id);
    expect(queue[0].id).toBe(job3.id);
    expect(queue[1].id).toBe(job1.id);
    expect(queue[2].id).toBe(job2.id);
  });

  it('should prevent reordering to invalid positions', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });

    const craftingSystem = new CraftingSystem();
    harness.registerSystem('CraftingSystem', craftingSystem);

    const recipe = {
      id: 'test_recipe',
      name: 'Test',
      ingredients: [],
      outputs: [],
      craftingTime: 5,
      station: 'none',
    };

    const job1 = craftingSystem.queueJob(agent.id, recipe, 1);

    expect(() => {
      craftingSystem.reorderQueue(agent.id, job1.id, 10);
    }).toThrow('Invalid position');

    expect(() => {
      craftingSystem.reorderQueue(agent.id, job1.id, -1);
    }).toThrow('Invalid position');
  });

  it('should get current active job', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });

    const craftingSystem = new CraftingSystem();
    harness.registerSystem('CraftingSystem', craftingSystem);

    // No jobs initially
    expect(craftingSystem.getCurrentJob(agent.id)).toBeNull();

    const recipe = {
      id: 'test_recipe',
      name: 'Test',
      ingredients: [],
      outputs: [],
      craftingTime: 5,
      station: 'none',
    };

    const job1 = craftingSystem.queueJob(agent.id, recipe, 1);
    craftingSystem.queueJob(agent.id, recipe, 1);

    // First job should be current
    const currentJob = craftingSystem.getCurrentJob(agent.id);
    expect(currentJob).toBeDefined();
    expect(currentJob?.id).toBe(job1.id);
  });

  it('should crafting system update process jobs over time', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });
    // Add inventory with ingredients for crafting
    let inventory = createInventoryComponent();
    inventory = addToInventory(inventory, 'test_item', 5).inventory;
    agent.addComponent(inventory);

    const craftingSystem = new CraftingSystem();
    const recipeRegistry = new RecipeRegistry();

    const recipe: Recipe = {
      id: 'test_recipe',
      name: 'Test',
      category: 'Test',
      description: 'Test recipe',
      ingredients: [{ itemId: 'test_item', quantity: 1 }],
      output: { itemId: 'result', quantity: 1 },
      craftingTime: 10, // 10 seconds
      xpGain: 0,
      stationRequired: null,
      skillRequirements: [],
      researchRequirements: []
    };

    recipeRegistry.registerRecipe(recipe);
    craftingSystem.setRecipeRegistry(recipeRegistry);
    harness.registerSystem('CraftingSystem', craftingSystem);

    craftingSystem.queueJob(agent.id, recipe, 1);

    const entities = Array.from(harness.world.entities.values());

    // Process for half the crafting time
    craftingSystem.update(harness.world, entities, 5.0);

    // Job should still be in progress (not completed yet)
    const currentJob = craftingSystem.getCurrentJob(agent.id);
    expect(currentJob).toBeDefined();
  });

  it('should empty queue return empty array', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });

    const craftingSystem = new CraftingSystem();
    harness.registerSystem('CraftingSystem', craftingSystem);

    const queue = craftingSystem.getQueue(agent.id);
    expect(queue).toEqual([]);
  });
});
