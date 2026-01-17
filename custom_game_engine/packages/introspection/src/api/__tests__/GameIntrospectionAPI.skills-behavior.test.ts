/**
 * Tests for GameIntrospectionAPI Skills & Progression and Behavioral Control methods (Phases 3-4)
 *
 * Tests:
 * - grantSkillXP: Grant XP, level up, validation, cache invalidation
 * - getSkills: Get all skills for entity
 * - triggerBehavior: Trigger behaviors, set parameters, validate
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameIntrospectionAPI } from '../GameIntrospectionAPI.js';
import { ComponentRegistry } from '../../registry/ComponentRegistry.js';
import { MutationService } from '../../mutation/MutationService.js';
import type { World, Entity } from '@ai-village/core';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock World
function createMockWorld(): World {
  const entities = new Map<string, Entity>();

  const world = {
    tick: 100,
    getEntity: (id: string) => entities.get(id),
    query: () => ({
      with: () => ({ executeEntities: () => [] }),
      executeEntities: () => [],
    }),
  } as any;

  return world;
}

// Mock Entity
function createMockEntity(id: string, components: Map<string, any>): Entity {
  return {
    id,
    components,
    hasComponent: (type: string) => components.has(type),
    getComponent: (type: string) => components.get(type),
    updateComponent: (type: string, updater: (current: any) => any) => {
      const current = components.get(type);
      if (current) {
        components.set(type, updater(current));
      }
    },
  } as any;
}

// ============================================================================
// Tests
// ============================================================================

describe('GameIntrospectionAPI - Skills & Progression', () => {
  let world: World;
  let api: GameIntrospectionAPI;

  beforeEach(() => {
    world = createMockWorld();
    api = new GameIntrospectionAPI(
      world,
      ComponentRegistry,
      MutationService,
      null, // metricsAPI
      null  // liveEntityAPI
    );

    // Register skills component schema
    ComponentRegistry.register({
      type: 'skills',
      category: 'character',
      description: 'Entity skills and progression',
      fields: {
        levels: {
          type: 'object',
          description: 'Skill name to level mapping',
          mutable: true,
          visibility: { full: true, llm: true, player: true },
        },
        experience: {
          type: 'object',
          description: 'Current XP progress towards next level',
          mutable: true,
          visibility: { full: true, llm: true, player: true },
        },
        totalExperience: {
          type: 'object',
          description: 'Total XP earned in each skill',
          mutable: true,
          visibility: { full: true, llm: true, player: true },
        },
        affinities: {
          type: 'object',
          description: 'Skill affinity multipliers',
          mutable: true,
          visibility: { full: true, llm: true, player: true },
        },
      },
    });
  });

  describe('grantSkillXP', () => {
    it('should grant XP to existing skill', async () => {
      // Setup entity with skills
      const entityId = 'test-agent';
      const components = new Map([
        ['skills', {
          levels: { farming: 0 },
          experience: { farming: 0 },
          totalExperience: { farming: 0 },
          affinities: { farming: 1.0 },
        }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      // Grant 50 XP
      const result = await api.grantSkillXP(entityId, 'farming', 50);

      expect(result.success).toBe(true);
      expect(result.skill).toBe('farming');
      expect(result.previousLevel).toBe(0);
      expect(result.previousXP).toBe(0);
      expect(result.newXP).toBe(50);
      expect(result.newLevel).toBe(0); // Still level 0 (need 100 XP for level 1)
      expect(result.leveledUp).toBe(false);
    });

    it('should level up when XP threshold crossed (100 XP = level 1)', async () => {
      const entityId = 'test-agent';
      const components = new Map([
        ['skills', {
          levels: { combat: 0 },
          experience: { combat: 0 },
          totalExperience: { combat: 0 },
          affinities: { combat: 1.0 },
        }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      // Grant 100 XP (should level up to 1)
      const result = await api.grantSkillXP(entityId, 'combat', 100);

      expect(result.success).toBe(true);
      expect(result.previousLevel).toBe(0);
      expect(result.newLevel).toBe(1);
      expect(result.newXP).toBe(100);
      expect(result.leveledUp).toBe(true);
    });

    it('should level up multiple times with large XP grant (300 XP = level 2)', async () => {
      const entityId = 'test-agent';
      const components = new Map([
        ['skills', {
          levels: { magic: 0 },
          experience: { magic: 0 },
          totalExperience: { magic: 0 },
          affinities: { magic: 1.0 },
        }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      // Grant 350 XP (should level up to level 2)
      // Thresholds: 0->1: 100, 1->2: 300
      const result = await api.grantSkillXP(entityId, 'magic', 350);

      expect(result.success).toBe(true);
      expect(result.previousLevel).toBe(0);
      expect(result.newLevel).toBe(2);
      expect(result.newXP).toBe(350);
      expect(result.leveledUp).toBe(true);
    });

    it('should respect skill affinity multipliers', async () => {
      const entityId = 'test-agent';
      const components = new Map([
        ['skills', {
          levels: { cooking: 0 },
          experience: { cooking: 0 },
          totalExperience: { cooking: 0 },
          affinities: { cooking: 2.0 }, // 2x XP multiplier
        }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      // Grant 50 XP, but with 2.0 affinity = 100 actual XP
      const result = await api.grantSkillXP(entityId, 'cooking', 50);

      expect(result.success).toBe(true);
      expect(result.newXP).toBe(100); // 50 * 2.0 = 100
      expect(result.newLevel).toBe(1); // Leveled up to 1
      expect(result.leveledUp).toBe(true);
    });

    it('should validate entity exists', async () => {
      const result = await api.grantSkillXP('non-existent-entity', 'farming', 100);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should validate skills component exists', async () => {
      const entityId = 'no-skills-agent';
      const components = new Map([
        ['position', { x: 0, y: 0 }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      const result = await api.grantSkillXP(entityId, 'farming', 100);

      expect(result.success).toBe(false);
      expect(result.error).toContain('no skills component');
    });

    it('should validate skill exists in skills component', async () => {
      const entityId = 'test-agent';
      const components = new Map([
        ['skills', {
          levels: { farming: 0 },
          experience: { farming: 0 },
          totalExperience: { farming: 0 },
          affinities: { farming: 1.0 },
        }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      const result = await api.grantSkillXP(entityId, 'non-existent-skill', 100);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should validate non-negative amount', async () => {
      const entityId = 'test-agent';
      const components = new Map([
        ['skills', {
          levels: { farming: 1 },
          experience: { farming: 50 },
          totalExperience: { farming: 150 },
          affinities: { farming: 1.0 },
        }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      const result = await api.grantSkillXP(entityId, 'farming', -100);

      expect(result.success).toBe(false);
      expect(result.error).toContain('non-negative');
    });

    it('should invalidate cache after XP grant', async () => {
      const entityId = 'test-agent';
      const components = new Map([
        ['skills', {
          levels: { farming: 0 },
          experience: { farming: 0 },
          totalExperience: { farming: 0 },
          affinities: { farming: 1.0 },
        }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      // Spy on cache invalidation
      const invalidateSpy = vi.spyOn((api as any).cache, 'invalidate');

      await api.grantSkillXP(entityId, 'farming', 100);

      // Cache should have been invalidated
      expect(invalidateSpy).toHaveBeenCalledWith(entityId);
    });

    it('should handle multiple level-ups correctly', async () => {
      const entityId = 'test-agent';
      const components = new Map([
        ['skills', {
          levels: { building: 0 },
          experience: { building: 0 },
          totalExperience: { building: 0 },
          affinities: { building: 1.0 },
        }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      // Grant 1500 XP (should reach level 4)
      // Thresholds: 0->1: 100, 1->2: 300, 2->3: 700, 3->4: 1500
      const result = await api.grantSkillXP(entityId, 'building', 1500);

      expect(result.success).toBe(true);
      expect(result.newLevel).toBe(4);
      expect(result.leveledUp).toBe(true);
    });

    it('should handle max level (5)', async () => {
      const entityId = 'test-agent';
      const components = new Map([
        ['skills', {
          levels: { woodcutting: 0 },
          experience: { woodcutting: 0 },
          totalExperience: { woodcutting: 0 },
          affinities: { woodcutting: 1.0 },
        }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      // Grant 3000 XP (should reach level 5)
      const result = await api.grantSkillXP(entityId, 'woodcutting', 3000);

      expect(result.success).toBe(true);
      expect(result.newLevel).toBe(5);
      expect(result.leveledUp).toBe(true);

      // Grant more XP (should stay at level 5)
      const result2 = await api.grantSkillXP(entityId, 'woodcutting', 1000);

      expect(result2.success).toBe(true);
      expect(result2.newLevel).toBe(5);
      expect(result2.previousLevel).toBe(5);
      expect(result2.leveledUp).toBe(false);
    });
  });

  describe('getSkills', () => {
    it('should get all skills for entity', async () => {
      const entityId = 'test-agent';
      const components = new Map([
        ['skills', {
          levels: { farming: 2, combat: 1, cooking: 3 },
          experience: { farming: 50, combat: 20, cooking: 100 },
          totalExperience: { farming: 350, combat: 120, cooking: 800 },
        }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      const skills = await api.getSkills(entityId);

      expect(skills).toEqual({
        farming: 2,
        combat: 1,
        cooking: 3,
      });
    });

    it('should return skill -> level mapping', async () => {
      const entityId = 'test-agent';
      const components = new Map([
        ['skills', {
          levels: { mining: 4, smithing: 2 },
          experience: { mining: 0, smithing: 50 },
          totalExperience: { mining: 1500, smithing: 350 },
        }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      const skills = await api.getSkills(entityId);

      expect(skills).toHaveProperty('mining', 4);
      expect(skills).toHaveProperty('smithing', 2);
      expect(Object.keys(skills)).toHaveLength(2);
    });

    it('should error when entity does not exist', async () => {
      await expect(api.getSkills('non-existent-entity')).rejects.toThrow('not found');
    });

    it('should error when no skills component', async () => {
      const entityId = 'no-skills-agent';
      const components = new Map([
        ['position', { x: 0, y: 0 }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      await expect(api.getSkills(entityId)).rejects.toThrow('no skills component');
    });

    it('should return empty object if no skills defined', async () => {
      const entityId = 'test-agent';
      const components = new Map([
        ['skills', {
          levels: {},
          experience: {},
          totalExperience: {},
        }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      const skills = await api.getSkills(entityId);

      expect(skills).toEqual({});
    });
  });
});

describe('GameIntrospectionAPI - Behavioral Control', () => {
  let world: World;
  let api: GameIntrospectionAPI;

  beforeEach(() => {
    world = createMockWorld();
    api = new GameIntrospectionAPI(
      world,
      ComponentRegistry,
      MutationService,
      null, // metricsAPI
      null  // liveEntityAPI
    );
  });

  describe('triggerBehavior', () => {
    it('should trigger valid behavior', async () => {
      const entityId = 'test-agent';
      const components = new Map([
        ['agent', {
          behaviorQueue: [],
          currentQueueIndex: 0,
          behaviorCompleted: false,
        }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      const result = await api.triggerBehavior({
        entityId,
        behavior: 'wander',
      });

      expect(result.success).toBe(true);
      expect(result.behavior).toBe('wander');
      expect(result.state).toBeDefined();
      expect(result.state.queueIndex).toBe(0);
    });

    it('should set behavior parameters', async () => {
      const entityId = 'test-agent';
      const components = new Map([
        ['agent', {
          behaviorQueue: [],
          currentQueueIndex: 0,
          behaviorCompleted: false,
        }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      const params = { targetId: 'target-123', range: 10 };
      const result = await api.triggerBehavior({
        entityId,
        behavior: 'gather',
        params,
      });

      expect(result.success).toBe(true);
      expect(result.state.behaviorState).toEqual(params);

      // Check that agent component was updated with params
      const agent = entity.getComponent('agent') as any;
      expect(agent.behaviorQueue[0].behaviorState).toEqual(params);
    });

    it('should clear existing behavior queue', async () => {
      const entityId = 'test-agent';
      const components = new Map([
        ['agent', {
          behaviorQueue: [
            { behavior: 'idle', behaviorState: {} },
            { behavior: 'wander', behaviorState: {} },
          ],
          currentQueueIndex: 1,
          behaviorCompleted: false,
        }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      await api.triggerBehavior({
        entityId,
        behavior: 'gather',
      });

      // Queue should be cleared and replaced with new behavior
      const agent = entity.getComponent('agent') as any;
      expect(agent.behaviorQueue).toHaveLength(1);
      expect(agent.behaviorQueue[0].behavior).toBe('gather');
      expect(agent.currentQueueIndex).toBe(0);
    });

    it('should validate entity exists', async () => {
      const result = await api.triggerBehavior({
        entityId: 'non-existent-entity',
        behavior: 'wander',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should validate agent component exists', async () => {
      const entityId = 'not-an-agent';
      const components = new Map([
        ['position', { x: 0, y: 0 }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      const result = await api.triggerBehavior({
        entityId,
        behavior: 'wander',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('agent component');
    });

    it('should validate behavior type when validate=true (default)', async () => {
      const entityId = 'test-agent';
      const components = new Map([
        ['agent', {
          behaviorQueue: [],
          currentQueueIndex: 0,
          behaviorCompleted: false,
        }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      const result = await api.triggerBehavior({
        entityId,
        behavior: 'invalid-behavior-name',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid behavior type');
    });

    it('should skip validation when validate=false', async () => {
      const entityId = 'test-agent';
      const components = new Map([
        ['agent', {
          behaviorQueue: [],
          currentQueueIndex: 0,
          behaviorCompleted: false,
        }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      const result = await api.triggerBehavior({
        entityId,
        behavior: 'custom-modded-behavior',
        validate: false,
      });

      expect(result.success).toBe(true);
      expect(result.behavior).toBe('custom-modded-behavior');
    });

    it('should invalidate cache after triggering behavior', async () => {
      const entityId = 'test-agent';
      const components = new Map([
        ['agent', {
          behaviorQueue: [],
          currentQueueIndex: 0,
          behaviorCompleted: false,
        }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      // Spy on cache invalidation
      const invalidateSpy = vi.spyOn((api as any).cache, 'invalidate');

      await api.triggerBehavior({
        entityId,
        behavior: 'wander',
      });

      expect(invalidateSpy).toHaveBeenCalledWith(entityId);
    });

    it('should accept common behaviors without validation errors', async () => {
      const entityId = 'test-agent';
      const components = new Map([
        ['agent', {
          behaviorQueue: [],
          currentQueueIndex: 0,
          behaviorCompleted: false,
        }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      const commonBehaviors = [
        'wander', 'idle', 'gather', 'harvest', 'explore', 'rest',
        'eat', 'build', 'craft', 'hunt', 'farm', 'plant', 'water'
      ];

      for (const behavior of commonBehaviors) {
        const result = await api.triggerBehavior({
          entityId,
          behavior,
        });

        expect(result.success).toBe(true);
        expect(result.behavior).toBe(behavior);
      }
    });

    it('should set priority to high for manually triggered behaviors', async () => {
      const entityId = 'test-agent';
      const components = new Map([
        ['agent', {
          behaviorQueue: [],
          currentQueueIndex: 0,
          behaviorCompleted: false,
        }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      await api.triggerBehavior({
        entityId,
        behavior: 'gather',
      });

      const agent = entity.getComponent('agent') as any;
      expect(agent.behaviorQueue[0].priority).toBe('high');
    });

    it('should include label for manually triggered behaviors', async () => {
      const entityId = 'test-agent';
      const components = new Map([
        ['agent', {
          behaviorQueue: [],
          currentQueueIndex: 0,
          behaviorCompleted: false,
        }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      await api.triggerBehavior({
        entityId,
        behavior: 'hunt',
      });

      const agent = entity.getComponent('agent') as any;
      expect(agent.behaviorQueue[0].label).toContain('Manually triggered');
      expect(agent.behaviorQueue[0].label).toContain('hunt');
    });

    it('should set startedAt to current tick', async () => {
      const entityId = 'test-agent';
      const components = new Map([
        ['agent', {
          behaviorQueue: [],
          currentQueueIndex: 0,
          behaviorCompleted: false,
        }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      (world as any).tick = 500;

      await api.triggerBehavior({
        entityId,
        behavior: 'explore',
      });

      const agent = entity.getComponent('agent') as any;
      expect(agent.behaviorQueue[0].startedAt).toBe(500);
    });

    it('should reset behaviorCompleted flag', async () => {
      const entityId = 'test-agent';
      const components = new Map([
        ['agent', {
          behaviorQueue: [{ behavior: 'idle', behaviorState: {} }],
          currentQueueIndex: 0,
          behaviorCompleted: true, // Was completed
        }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      await api.triggerBehavior({
        entityId,
        behavior: 'wander',
      });

      const agent = entity.getComponent('agent') as any;
      expect(agent.behaviorCompleted).toBe(false);
    });
  });
});
