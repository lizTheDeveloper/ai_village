import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldImpl } from '../../ecs/index.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { CraftingSystem } from '../CraftingSystem.js';
import type { Recipe } from '../Recipe.js';

/**
 * CraftingSystem tests - STUB IMPLEMENTATION
 *
 * This tests ONLY the implemented features:
 * - Queue management (add, reorder, cancel, clear)
 * - Pause/resume
 * - Job lifecycle (queued → in_progress → completed)
 * - Progress tracking
 * - Event emissions
 *
 * NOT tested (not implemented yet):
 * - Inventory checking/consumption
 * - Workstation integration
 * - Skill requirements
 * - XP granting
 */
describe('CraftingSystem (stub)', () => {
  let world: WorldImpl;
  let eventBus: EventBusImpl;
  let system: CraftingSystem;
  const agentId = 1;

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

  describe('Stub Methods', () => {
    it('checkIngredientAvailability returns stub data', () => {
      const status = system.checkIngredientAvailability(agentId, testRecipe);
      expect(status[0].status).toBe('MISSING'); // Stub always returns MISSING
    });

    it('calculateMaxCraftable returns 0 (stub)', () => {
      expect(system.calculateMaxCraftable(agentId, testRecipe)).toBe(0);
    });
  });
});
