import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldImpl, EntityImpl } from '../../ecs/index.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { CraftingSystem } from '../CraftingSystem.js';
import { RecipeRegistry } from '../RecipeRegistry.js';
import { createInventoryComponent, addToInventory } from '../../components/InventoryComponent.js';
import type { Recipe } from '../Recipe.js';

/**
 * CraftingSystem tests
 *
 * Tests the following features:
 * - Queue management (add, reorder, cancel, clear)
 * - Pause/resume
 * - Job lifecycle (queued → in_progress → completed)
 * - Progress tracking
 * - Event emissions
 * - Inventory integration (ingredient consumption, product creation)
 */
describe('CraftingSystem', () => {
  let world: WorldImpl;
  let eventBus: EventBusImpl;
  let system: CraftingSystem;
  let recipeRegistry: RecipeRegistry;
  let agentEntity: EntityImpl;
  let agentId: string; // Entity ID (UUID string)

  const testRecipe: Recipe = {
    id: 'stone_axe',
    name: 'Stone Axe',
    category: 'Tools',
    description: 'A basic axe',
    ingredients: [
      { itemId: 'stone', quantity: 2 },
      { itemId: 'wood', quantity: 3 }
    ],
    output: { itemId: 'stone_axe', quantity: 1 },
    craftingTime: 5,
    xpGain: 10,
    stationRequired: null,
    skillRequirements: [],
    researchRequirements: []
  };

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    system = new CraftingSystem();
    recipeRegistry = new RecipeRegistry();
    recipeRegistry.registerRecipe(testRecipe);
    system.setRecipeRegistry(recipeRegistry);

    // Create agent entity with inventory containing ingredients
    agentEntity = world.createEntity() as EntityImpl;
    agentId = agentEntity.id; // Entity ID is a UUID string
    let inventory = createInventoryComponent(20);
    // Add enough ingredients for multiple crafts
    inventory = addToInventory(inventory, 'stone', 10).inventory;
    inventory = addToInventory(inventory, 'wood', 15).inventory;
    agentEntity.addComponent(inventory);
  });

  describe('Queue Management', () => {
    it('should add job to queue', () => {
      const job = system.queueJob(agentId, testRecipe, 1);

      expect(job.recipeId).toBe('stone_axe');
      expect(job.quantity).toBe(1);
      expect(job.status).toBe('queued');
    });

    it('should throw on invalid quantity', () => {
      expect(() => system.queueJob(agentId, testRecipe, 0)).toThrow('quantity must be positive');
    });

    it('should limit queue size to 10', () => {
      for (let i = 0; i < 10; i++) {
        system.queueJob(agentId, testRecipe, 1);
      }
      expect(() => system.queueJob(agentId, testRecipe, 1)).toThrow('Queue is full');
    });

    it('should get queue', () => {
      system.queueJob(agentId, testRecipe, 1);
      const queue = system.getQueue(agentId);
      expect(queue).toHaveLength(1);
    });

    it('should cancel job', () => {
      const job = system.queueJob(agentId, testRecipe, 1);
      system.cancelJob(agentId, job.id);
      expect(system.getQueue(agentId)).toHaveLength(0);
    });

    it('should clear queue', () => {
      system.queueJob(agentId, testRecipe, 1);
      system.clearQueue(agentId);
      expect(system.getQueue(agentId)).toHaveLength(0);
    });

    it('should reorder jobs', () => {
      const job1 = system.queueJob(agentId, testRecipe, 1);
      const job2 = system.queueJob(agentId, testRecipe, 2);
      system.reorderQueue(agentId, job2.id, 0);
      
      const queue = system.getQueue(agentId);
      expect(queue[0].id).toBe(job2.id);
    });
  });

  describe('Job Processing', () => {
    it('should start job on first update', () => {
      system.queueJob(agentId, testRecipe, 1);
      system.update(world, [], 0.1);

      const job = system.getCurrentJob(agentId);
      expect(job?.status).toBe('in_progress');
    });

    it('should track progress', () => {
      system.queueJob(agentId, testRecipe, 1);
      system.update(world, [], 2.5); // Half of 5 seconds

      const job = system.getCurrentJob(agentId);
      expect(job?.progress).toBeCloseTo(0.5, 1);
    });

    it('should complete job', () => {
      const emitSpy = vi.spyOn(world.eventBus, 'emit');
      system.queueJob(agentId, testRecipe, 1);
      system.update(world, [], 5);

      expect(system.getCurrentJob(agentId)).toBeNull();
      expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'crafting:completed'
      }));
    });
  });

  describe('Pause/Resume', () => {
    it('should pause queue', () => {
      system.queueJob(agentId, testRecipe, 1);
      system.update(world, [], 1);
      
      system.pauseQueue(agentId);
      const progressBefore = system.getCurrentJob(agentId)?.progress || 0;
      
      system.update(world, [], 2);
      const progressAfter = system.getCurrentJob(agentId)?.progress || 0;
      
      expect(progressAfter).toBe(progressBefore);
    });

    it('should resume queue', () => {
      system.queueJob(agentId, testRecipe, 1);
      system.update(world, [], 1);
      system.pauseQueue(agentId);
      system.resumeQueue(agentId);
      
      const progressBefore = system.getCurrentJob(agentId)?.progress || 0;
      system.update(world, [], 1);
      const progressAfter = system.getCurrentJob(agentId)?.progress || 0;
      
      expect(progressAfter).toBeGreaterThan(progressBefore);
    });
  });

  describe('Inventory Integration', () => {
    it('checkIngredientAvailability returns correct status when ingredients available', () => {
      const availability = system.checkIngredientAvailability(world, agentId, testRecipe);
      expect(availability).toHaveLength(2);
      expect(availability[0]?.status).toBe('AVAILABLE');
      expect(availability[1]?.status).toBe('AVAILABLE');
    });

    it('checkIngredientAvailability returns MISSING when no inventory', () => {
      // Create agent without inventory
      const noInvAgent = world.createEntity() as EntityImpl;
      const availability = system.checkIngredientAvailability(world, noInvAgent.id, testRecipe);
      expect(availability[0]?.status).toBe('MISSING');
    });

    it('calculateMaxCraftable returns correct count based on inventory', () => {
      // Have 10 stone (needs 2), 15 wood (needs 3) = max 5 crafts
      const maxCraftable = system.calculateMaxCraftable(world, agentEntity.id, testRecipe);
      expect(maxCraftable).toBe(5);
    });

    it('should consume ingredients when job starts', () => {
      system.queueJob(agentId, testRecipe, 1);
      system.update(world, [], 0.1);

      const inv = agentEntity.getComponent('inventory');
      // Should have consumed 2 stone and 3 wood
      expect(inv?.slots.find(s => s.itemId === 'stone')?.quantity).toBe(8);
      expect(inv?.slots.find(s => s.itemId === 'wood')?.quantity).toBe(12);
    });

    it('should add crafted item to inventory on completion', () => {
      system.queueJob(agentId, testRecipe, 1);
      system.update(world, [], 5); // Complete the job

      const inv = agentEntity.getComponent('inventory');
      expect(inv?.slots.find(s => s.itemId === 'stone_axe')?.quantity).toBe(1);
    });
  });
});
