import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../../ecs/World.js';
import { EntityImpl, createEntityId, type Entity } from '../../ecs/Entity.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { ActionQueue } from '../ActionQueue.js';
import { ActionRegistry } from '../ActionRegistry.js';
import { createTimeComponent, type TimeComponent } from '../../systems/TimeSystem.js';

/**
 * Integration tests for ActionQueue with Time Speed Multiplier
 *
 * These tests verify that actions progress at the correct rate based on
 * the game's speedMultiplier setting, using real World and EventBus.
 *
 * Bug fix verification: Before the fix, actions always decremented by 1 tick
 * regardless of speed setting. After the fix, actions decrement by speedMultiplier.
 */

describe('ActionQueue Time Speed Integration', () => {
  let world: WorldImpl;
  let eventBus: EventBusImpl;
  let actionRegistry: ActionRegistry;
  let actionQueue: ActionQueue;
  let timeEntity: EntityImpl;

  function setSpeedMultiplier(speed: number) {
    timeEntity.updateComponent<TimeComponent>('time', (current) => ({
      ...current,
      speedMultiplier: speed,
    }));
  }

  beforeEach(() => {
    // Create real world with EventBus
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);

    // Create time entity with time component
    timeEntity = new EntityImpl(createEntityId(), 0);
    timeEntity.addComponent(createTimeComponent(6, 48, 1)); // dawn, 48s day, 1x speed

    // Add entity directly to world using internal method
    // This is necessary for test setup because we're creating a fully-formed entity
    // with components rather than using the standard createEntity flow
    interface WorldInternal {
      _addEntity(entity: Entity): void;
    }
    world.addEntity(timeEntity);

    // Create action registry and queue
    actionRegistry = new ActionRegistry();
    actionQueue = new ActionQueue(actionRegistry, () => world.tick);

    // Register test gathering action (simulates gather_seeds)
    actionRegistry.register({
      type: 'gather_seeds',
      getDuration: () => 100, // 100 ticks = 5 seconds at 20 TPS
      validate: () => ({ valid: true }),
      execute: () => ({
        success: true,
        effects: [],
        events: [],
      }),
    });

    // Register harvest action
    actionRegistry.register({
      type: 'harvest',
      getDuration: () => 160, // 160 ticks = 8 seconds at 20 TPS
      validate: () => ({ valid: true }),
      execute: () => ({
        success: true,
        effects: [],
        events: [],
      }),
    });
  });

  describe('Gathering at Different Speeds', () => {
    it('gather_seeds takes 100 real ticks at 1x speed', () => {
      setSpeedMultiplier(1);

      actionQueue.submit({
        type: 'gather_seeds',
        actorId: 'agent-1',
        params: {},
      });

      // Start action
      actionQueue.process(world);
      expect(actionQueue.getExecuting('agent-1')).toBeDefined();

      // Process 99 more ticks
      for (let i = 0; i < 99; i++) {
        world.advanceTick();
        actionQueue.process(world);
      }

      // Should be complete after 100 total ticks
      expect(actionQueue.getExecuting('agent-1')).toBeUndefined();
      expect(actionQueue.getHistory()[0].status).toBe('completed');
    });

    it('gather_seeds takes 50 real ticks at 2x speed', () => {
      setSpeedMultiplier(2);

      actionQueue.submit({
        type: 'gather_seeds',
        actorId: 'agent-1',
        params: {},
      });

      actionQueue.process(world);
      expect(actionQueue.getExecuting('agent-1')).toBeDefined();

      // At 2x, each tick decrements by 2, so need 50 ticks
      for (let i = 0; i < 49; i++) {
        world.advanceTick();
        actionQueue.process(world);
      }

      expect(actionQueue.getExecuting('agent-1')).toBeUndefined();
      expect(actionQueue.getHistory()[0].status).toBe('completed');
    });

    it('gather_seeds takes 25 real ticks at 4x speed', () => {
      setSpeedMultiplier(4);

      actionQueue.submit({
        type: 'gather_seeds',
        actorId: 'agent-1',
        params: {},
      });

      actionQueue.process(world);
      expect(actionQueue.getExecuting('agent-1')).toBeDefined();

      // At 4x, each tick decrements by 4, so need 25 ticks
      for (let i = 0; i < 24; i++) {
        world.advanceTick();
        actionQueue.process(world);
      }

      expect(actionQueue.getExecuting('agent-1')).toBeUndefined();
      expect(actionQueue.getHistory()[0].status).toBe('completed');
    });

    it('gather_seeds takes ~13 real ticks at 8x speed', () => {
      setSpeedMultiplier(8);

      actionQueue.submit({
        type: 'gather_seeds',
        actorId: 'agent-1',
        params: {},
      });

      actionQueue.process(world);
      expect(actionQueue.getExecuting('agent-1')).toBeDefined();

      // At 8x, each tick decrements by 8, so need ceil(100/8) = 13 ticks
      for (let i = 0; i < 12; i++) {
        world.advanceTick();
        actionQueue.process(world);
      }

      expect(actionQueue.getExecuting('agent-1')).toBeUndefined();
      expect(actionQueue.getHistory()[0].status).toBe('completed');
    });
  });

  describe('Harvest at Different Speeds', () => {
    it('harvest takes 160 real ticks at 1x speed', () => {
      setSpeedMultiplier(1);

      actionQueue.submit({
        type: 'harvest',
        actorId: 'agent-1',
        params: {},
      });

      actionQueue.process(world);

      for (let i = 0; i < 159; i++) {
        world.advanceTick();
        actionQueue.process(world);
      }

      expect(actionQueue.getExecuting('agent-1')).toBeUndefined();
      expect(actionQueue.getHistory()[0].status).toBe('completed');
    });

    it('harvest takes 20 real ticks at 8x speed', () => {
      setSpeedMultiplier(8);

      actionQueue.submit({
        type: 'harvest',
        actorId: 'agent-1',
        params: {},
      });

      actionQueue.process(world);

      // At 8x, need ceil(160/8) = 20 ticks
      for (let i = 0; i < 19; i++) {
        world.advanceTick();
        actionQueue.process(world);
      }

      expect(actionQueue.getExecuting('agent-1')).toBeUndefined();
      expect(actionQueue.getHistory()[0].status).toBe('completed');
    });
  });

  describe('Dynamic Speed Changes', () => {
    it('should respond to speed changes mid-action', () => {
      setSpeedMultiplier(1);

      actionQueue.submit({
        type: 'gather_seeds',
        actorId: 'agent-1',
        params: {},
      });

      // Start at 1x speed
      actionQueue.process(world); // 1 tick consumed, 99 remaining

      // Process 50 ticks at 1x (51 total consumed, 49 remaining)
      for (let i = 0; i < 50; i++) {
        world.advanceTick();
        actionQueue.process(world);
      }

      expect(actionQueue.getExecuting('agent-1')).toBeDefined();

      // Switch to 4x speed
      setSpeedMultiplier(4);

      // Need ceil(49/4) = 13 more ticks at 4x
      for (let i = 0; i < 13; i++) {
        world.advanceTick();
        actionQueue.process(world);
      }

      expect(actionQueue.getExecuting('agent-1')).toBeUndefined();
    });

    it('should speed up remaining work when speed increases', () => {
      setSpeedMultiplier(1);

      actionQueue.submit({
        type: 'gather_seeds',
        actorId: 'agent-1',
        params: {},
      });

      actionQueue.process(world);

      // Process 80 ticks at 1x (81 consumed, 19 remaining)
      for (let i = 0; i < 80; i++) {
        world.advanceTick();
        actionQueue.process(world);
      }

      expect(actionQueue.getExecuting('agent-1')).toBeDefined();

      // Switch to 8x speed - should complete in ceil(19/8) = 3 more ticks
      setSpeedMultiplier(8);

      world.advanceTick();
      actionQueue.process(world);
      world.advanceTick();
      actionQueue.process(world);
      world.advanceTick();
      actionQueue.process(world);

      expect(actionQueue.getExecuting('agent-1')).toBeUndefined();
    });
  });

  describe('Multiple Agents', () => {
    it('should apply speed to all concurrent actions', () => {
      setSpeedMultiplier(4);

      // Three agents start gathering at the same time
      actionQueue.submit({ type: 'gather_seeds', actorId: 'agent-1', params: {} });
      actionQueue.submit({ type: 'gather_seeds', actorId: 'agent-2', params: {} });
      actionQueue.submit({ type: 'harvest', actorId: 'agent-3', params: {} });

      actionQueue.process(world);

      expect(actionQueue.getExecuting('agent-1')).toBeDefined();
      expect(actionQueue.getExecuting('agent-2')).toBeDefined();
      expect(actionQueue.getExecuting('agent-3')).toBeDefined();

      // After 25 ticks at 4x, gather_seeds (100 ticks) should complete
      for (let i = 0; i < 24; i++) {
        world.advanceTick();
        actionQueue.process(world);
      }

      expect(actionQueue.getExecuting('agent-1')).toBeUndefined();
      expect(actionQueue.getExecuting('agent-2')).toBeUndefined();
      // harvest (160 ticks) needs 40 ticks at 4x, so still running
      expect(actionQueue.getExecuting('agent-3')).toBeDefined();

      // 15 more ticks to complete harvest
      for (let i = 0; i < 15; i++) {
        world.advanceTick();
        actionQueue.process(world);
      }

      expect(actionQueue.getExecuting('agent-3')).toBeUndefined();

      const history = actionQueue.getHistory();
      expect(history.length).toBe(3);
      expect(history.every(a => a.status === 'completed')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very short actions at high speed', () => {
      setSpeedMultiplier(8);

      // Register a very short action
      actionRegistry.register({
        type: 'quick_action',
        getDuration: () => 5, // Only 5 ticks
        validate: () => ({ valid: true }),
        execute: () => ({ success: true, effects: [], events: [] }),
      });

      actionQueue.submit({ type: 'quick_action', actorId: 'agent-1', params: {} });

      // Should complete on first process (8 >= 5)
      actionQueue.process(world);

      expect(actionQueue.getExecuting('agent-1')).toBeUndefined();
      expect(actionQueue.getHistory()[0].status).toBe('completed');
    });

    it('should emit completion events at correct time', () => {
      setSpeedMultiplier(4);
      const emittedEvents: any[] = [];
      eventBus.subscribe('agent:action:completed', (event) => emittedEvents.push(event));

      actionQueue.submit({ type: 'gather_seeds', actorId: 'agent-1', params: {} });
      actionQueue.process(world);
      eventBus.flush(); // Flush start event

      // No completion event yet
      expect(emittedEvents.length).toBe(0);

      // Process until completion
      for (let i = 0; i < 24; i++) {
        world.advanceTick();
        actionQueue.process(world);
        eventBus.flush(); // Flush events each tick
      }

      // Completion event should be emitted
      expect(emittedEvents.length).toBe(1);
      expect(emittedEvents[0].data.actionType).toBe('gather_seeds');
      expect(emittedEvents[0].data.success).toBe(true);
    });
  });
});
