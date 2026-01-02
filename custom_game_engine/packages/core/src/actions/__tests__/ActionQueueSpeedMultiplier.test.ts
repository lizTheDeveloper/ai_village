import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionQueue } from '../ActionQueue';
import { ActionRegistry } from '../ActionRegistry';
import type { Action } from '../Action';
import type { WorldMutator } from '../../ecs/World';
import { EntityImpl } from '../../ecs/Entity';

import { ComponentType } from '../../types/ComponentType.js';
/**
 * Unit tests for ActionQueue speed multiplier support
 *
 * These tests verify that actions progress at the correct rate
 * based on the game's speedMultiplier setting.
 */
describe('ActionQueue Speed Multiplier', () => {
  let actionQueue: ActionQueue;
  let actionRegistry: ActionRegistry;
  let mockWorld: WorldMutator;
  let currentTick: number;

  // Helper to create a time entity with speedMultiplier
  function createTimeEntity(speedMultiplier: number) {
    const entity = {
      id: 'time-entity',
      getComponent: vi.fn((type: string) => {
        if (type === 'time') {
          return { type: ComponentType.Time, speedMultiplier };
        }
        return undefined;
      }),
      hasComponent: vi.fn((type: string) => type === 'time'),
      components: new Map([['time', { type: ComponentType.Time, speedMultiplier }]]),
    } as unknown as EntityImpl;
    return entity;
  }

  beforeEach(() => {
    currentTick = 0;
    actionRegistry = new ActionRegistry();
    actionQueue = new ActionQueue(actionRegistry, () => currentTick);

    // Register a test action handler
    actionRegistry.register({
      type: 'test_gather',
      getDuration: () => 100, // 100 ticks = 5 seconds at 20 TPS
      validate: () => ({ valid: true }),
      execute: () => ({
        success: true,
        effects: [],
        events: [],
      }),
    });
  });

  describe('Speed multiplier affects action duration', () => {
    it('should complete action in 100 ticks at 1x speed', () => {
      const timeEntity = createTimeEntity(1);
      mockWorld = {
        query: vi.fn().mockReturnValue({
          with: vi.fn().mockReturnValue({
            executeEntities: vi.fn().mockReturnValue([timeEntity]),
          }),
        }),
        getEntity: vi.fn((id: string) => id === 'time-entity' ? timeEntity : undefined),
        eventBus: { emit: vi.fn() },
      } as unknown as WorldMutator;

      // Submit an action
      const actionId = actionQueue.submit({
        type: 'test_gather',
        actorId: 'agent-1',
        params: {},
      });

      // Process to start the action
      actionQueue.process(mockWorld);

      // Action should be executing
      expect(actionQueue.getExecuting('agent-1')).toBeDefined();

      // Process 99 more ticks (total 100)
      for (let i = 0; i < 99; i++) {
        currentTick++;
        actionQueue.process(mockWorld);
      }

      // Action should now be complete (100 ticks processed)
      expect(actionQueue.getExecuting('agent-1')).toBeUndefined();

      // Verify action was completed
      const history = actionQueue.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].status).toBe('completed');
    });

    it('should complete action in 50 ticks at 2x speed', () => {
      const timeEntity = createTimeEntity(2);
      mockWorld = {
        query: vi.fn().mockReturnValue({
          with: vi.fn().mockReturnValue({
            executeEntities: vi.fn().mockReturnValue([timeEntity]),
          }),
        }),
        getEntity: vi.fn((id: string) => id === 'time-entity' ? timeEntity : undefined),
        eventBus: { emit: vi.fn() },
      } as unknown as WorldMutator;

      // Submit an action
      actionQueue.submit({
        type: 'test_gather',
        actorId: 'agent-1',
        params: {},
      });

      // Process to start the action
      actionQueue.process(mockWorld);

      // Action should be executing
      expect(actionQueue.getExecuting('agent-1')).toBeDefined();

      // Process 49 more ticks (total 50 at 2x = 100 effective ticks)
      for (let i = 0; i < 49; i++) {
        currentTick++;
        actionQueue.process(mockWorld);
      }

      // Action should now be complete
      expect(actionQueue.getExecuting('agent-1')).toBeUndefined();

      const history = actionQueue.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].status).toBe('completed');
    });

    it('should complete action in 25 ticks at 4x speed', () => {
      const timeEntity = createTimeEntity(4);
      mockWorld = {
        query: vi.fn().mockReturnValue({
          with: vi.fn().mockReturnValue({
            executeEntities: vi.fn().mockReturnValue([timeEntity]),
          }),
        }),
        getEntity: vi.fn((id: string) => id === 'time-entity' ? timeEntity : undefined),
        eventBus: { emit: vi.fn() },
      } as unknown as WorldMutator;

      actionQueue.submit({
        type: 'test_gather',
        actorId: 'agent-1',
        params: {},
      });

      actionQueue.process(mockWorld);
      expect(actionQueue.getExecuting('agent-1')).toBeDefined();

      // Process 24 more ticks (total 25 at 4x = 100 effective ticks)
      for (let i = 0; i < 24; i++) {
        currentTick++;
        actionQueue.process(mockWorld);
      }

      expect(actionQueue.getExecuting('agent-1')).toBeUndefined();

      const history = actionQueue.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].status).toBe('completed');
    });

    it('should complete action in 13 ticks at 8x speed', () => {
      const timeEntity = createTimeEntity(8);
      mockWorld = {
        query: vi.fn().mockReturnValue({
          with: vi.fn().mockReturnValue({
            executeEntities: vi.fn().mockReturnValue([timeEntity]),
          }),
        }),
        getEntity: vi.fn((id: string) => id === 'time-entity' ? timeEntity : undefined),
        eventBus: { emit: vi.fn() },
      } as unknown as WorldMutator;

      actionQueue.submit({
        type: 'test_gather',
        actorId: 'agent-1',
        params: {},
      });

      actionQueue.process(mockWorld);
      expect(actionQueue.getExecuting('agent-1')).toBeDefined();

      // Process 12 more ticks (total 13 at 8x = 104 effective ticks, > 100)
      for (let i = 0; i < 12; i++) {
        currentTick++;
        actionQueue.process(mockWorld);
      }

      expect(actionQueue.getExecuting('agent-1')).toBeUndefined();

      const history = actionQueue.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].status).toBe('completed');
    });
  });

  describe('Edge cases', () => {
    it('should use speedMultiplier=1 when no time entity exists', () => {
      mockWorld = {
        query: vi.fn().mockReturnValue({
          with: vi.fn().mockReturnValue({
            executeEntities: vi.fn().mockReturnValue([]), // No time entity
          }),
        }),
        getEntity: vi.fn(() => undefined), // No time entity
        eventBus: { emit: vi.fn() },
      } as unknown as WorldMutator;

      actionQueue.submit({
        type: 'test_gather',
        actorId: 'agent-1',
        params: {},
      });

      actionQueue.process(mockWorld);
      expect(actionQueue.getExecuting('agent-1')).toBeDefined();

      // Should need full 99 more ticks at 1x speed
      for (let i = 0; i < 98; i++) {
        currentTick++;
        actionQueue.process(mockWorld);
      }

      // Still executing after 99 ticks
      expect(actionQueue.getExecuting('agent-1')).toBeDefined();

      // Complete on 100th tick
      currentTick++;
      actionQueue.process(mockWorld);
      expect(actionQueue.getExecuting('agent-1')).toBeUndefined();
    });

    it('should handle dynamic speed changes during action', () => {
      let currentSpeed = 1;
      const timeComponent = { type: ComponentType.Time, speedMultiplier: currentSpeed };
      const componentsMap = new Map([['time', timeComponent]]);

      const timeEntity = {
        id: 'time-entity',
        getComponent: vi.fn((type: string) => {
          if (type === 'time') {
            return { type: ComponentType.Time, speedMultiplier: currentSpeed };
          }
          return undefined;
        }),
        hasComponent: vi.fn((type: string) => type === 'time'),
        get components() {
          // Update the map's value to reflect current speed
          componentsMap.set('time', { type: ComponentType.Time, speedMultiplier: currentSpeed });
          return componentsMap;
        },
      } as unknown as EntityImpl;

      mockWorld = {
        query: vi.fn().mockReturnValue({
          with: vi.fn().mockReturnValue({
            executeEntities: vi.fn().mockReturnValue([timeEntity]),
          }),
        }),
        getEntity: vi.fn((id: string) => id === 'time-entity' ? timeEntity : undefined),
        eventBus: { emit: vi.fn() },
      } as unknown as WorldMutator;

      actionQueue.submit({
        type: 'test_gather',
        actorId: 'agent-1',
        params: {},
      });

      // Start at 1x speed
      actionQueue.process(mockWorld); // Starts action, decrements 1 (99 remaining)

      // Process 49 more ticks at 1x (50 total decremented, 50 remaining)
      for (let i = 0; i < 49; i++) {
        currentTick++;
        actionQueue.process(mockWorld);
      }

      expect(actionQueue.getExecuting('agent-1')).toBeDefined();

      // Switch to 2x speed
      currentSpeed = 2;

      // Need 25 more ticks at 2x to decrement remaining 50
      for (let i = 0; i < 25; i++) {
        currentTick++;
        actionQueue.process(mockWorld);
      }

      expect(actionQueue.getExecuting('agent-1')).toBeUndefined();
    });
  });

  describe('Multiple concurrent actions', () => {
    it('should apply speed multiplier to all executing actions', () => {
      const timeEntity = createTimeEntity(4);
      mockWorld = {
        query: vi.fn().mockReturnValue({
          with: vi.fn().mockReturnValue({
            executeEntities: vi.fn().mockReturnValue([timeEntity]),
          }),
        }),
        getEntity: vi.fn((id: string) => id === 'time-entity' ? timeEntity : undefined),
        eventBus: { emit: vi.fn() },
      } as unknown as WorldMutator;

      // Submit actions for two different agents
      actionQueue.submit({
        type: 'test_gather',
        actorId: 'agent-1',
        params: {},
      });

      actionQueue.submit({
        type: 'test_gather',
        actorId: 'agent-2',
        params: {},
      });

      // Start both actions
      actionQueue.process(mockWorld);

      expect(actionQueue.getExecuting('agent-1')).toBeDefined();
      expect(actionQueue.getExecuting('agent-2')).toBeDefined();

      // Process 24 more ticks at 4x speed
      for (let i = 0; i < 24; i++) {
        currentTick++;
        actionQueue.process(mockWorld);
      }

      // Both should complete at the same time
      expect(actionQueue.getExecuting('agent-1')).toBeUndefined();
      expect(actionQueue.getExecuting('agent-2')).toBeUndefined();

      const history = actionQueue.getHistory();
      expect(history.length).toBe(2);
      expect(history.every(a => a.status === 'completed')).toBe(true);
    });
  });
});
