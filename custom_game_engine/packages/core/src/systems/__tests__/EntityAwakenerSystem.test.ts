import { describe, it, expect, beforeEach } from 'vitest';
import { EntityAwakenerSystem } from '../EntityAwakenerSystem.js';
import { World } from '../../ecs/World.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { EventBus } from '../../EventBus.js';
import type { SleepComponent } from '../../components/SleepComponent.js';

/** Helper to create an entity with auto-generated ID */
function createEntity(tick = 0): EntityImpl {
  return new EntityImpl(createEntityId(), tick);
}

describe('EntityAwakenerSystem', () => {
  let system: EntityAwakenerSystem;
  let world: World;
  let eventBus: EventBus;

  beforeEach(() => {
    system = new EntityAwakenerSystem();
    eventBus = new EventBus();
    world = new World(eventBus);
    system.initialize(world, eventBus);
  });

  it('should have correct id and priority', () => {
    expect(system.id).toBe('EntityAwakenerSystem');
    expect(system.priority).toBe(5);
  });

  it('should have correct metadata', () => {
    expect(system.metadata.category).toBe('infrastructure');
    expect(system.metadata.readsComponents).toContain('sleep');
    expect(system.metadata.writesComponents).toContain('sleep');
  });

  describe('isActive', () => {
    it('should return false for unknown entity', () => {
      expect(system.isActive('unknown')).toBe(false);
    });

    it('should return true for always-active entities (no sleep component)', () => {
      const entity = createEntity();
      world.addEntity(entity);

      system.update(world, [entity]);
      expect(system.isActive(entity.id)).toBe(true);
    });

    it('should return false for sleeping entity', () => {
      const entity = createEntity();
      const sleepComp: SleepComponent = {
        type: 'sleep',
        state: 'scheduled',
        wake_tick: 1000,
        last_processed_tick: 0,
        accumulated_delta: 0,
      };
      entity.addComponent(sleepComp);
      world.addEntity(entity);

      system.update(world, [entity]);
      expect(system.isActive(entity.id)).toBe(false);
    });

    it('should return true for entity with active sleep state', () => {
      const entity = createEntity();
      const sleepComp: SleepComponent = {
        type: 'sleep',
        state: 'active',
        last_processed_tick: 0,
        accumulated_delta: 0,
      };
      entity.addComponent(sleepComp);
      world.addEntity(entity);

      system.update(world, [entity]);
      expect(system.isActive(entity.id)).toBe(true);
    });
  });

  describe('scheduleWake', () => {
    it('should schedule entity to wake at future tick', () => {
      const entity = createEntity();
      const sleepComp: SleepComponent = {
        type: 'sleep',
        state: 'scheduled',
        wake_tick: 100,
        last_processed_tick: 0,
        accumulated_delta: 0,
      };
      entity.addComponent(sleepComp);
      world.addEntity(entity);

      system.scheduleWake(entity.id, 100);

      // Entity not active before wake tick
      world.setTick(50);
      system.update(world, [entity]);
      expect(system.isActive(entity.id)).toBe(false);

      // Entity becomes active at wake tick
      world.setTick(100);
      system.update(world, [entity]);
      expect(system.isActive(entity.id)).toBe(true);

      const sleep = entity.getComponent<SleepComponent>('sleep');
      expect(sleep?.state).toBe('active');
      expect(sleep?.accumulated_delta).toBe(100);
    });

    it('should wake entity after wake tick has passed', () => {
      const entity = createEntity();
      const sleepComp: SleepComponent = {
        type: 'sleep',
        state: 'scheduled',
        wake_tick: 100,
        last_processed_tick: 0,
        accumulated_delta: 0,
      };
      entity.addComponent(sleepComp);
      world.addEntity(entity);

      system.scheduleWake(entity.id, 100);

      world.setTick(150);
      system.update(world, [entity]);
      expect(system.isActive(entity.id)).toBe(true);
    });
  });

  describe('sleepUntil', () => {
    it('should put entity to sleep until scheduled wake tick', () => {
      const entity = createEntity();
      const sleepComp: SleepComponent = {
        type: 'sleep',
        state: 'active',
        last_processed_tick: 0,
        accumulated_delta: 0,
      };
      entity.addComponent(sleepComp);
      world.addEntity(entity);

      world.setTick(50);
      system.sleepUntil(world, entity.id, 200);

      const sleep = entity.getComponent<SleepComponent>('sleep');
      expect(sleep?.state).toBe('scheduled');
      expect(sleep?.wake_tick).toBe(200);
      expect(sleep?.last_processed_tick).toBe(50);

      // Entity should not be active before wake tick
      system.update(world, [entity]);
      expect(system.isActive(entity.id)).toBe(false);
    });
  });

  describe('event subscriptions', () => {
    it('should subscribe entity to events and wake via manual wakeOnEvent', () => {
      const entity = createEntity();
      const sleepComp: SleepComponent = {
        type: 'sleep',
        state: 'waiting',
        wake_events: ['inventory_changed'],
        last_processed_tick: 0,
        accumulated_delta: 0,
      };
      entity.addComponent(sleepComp);
      world.addEntity(entity);

      system.subscribeToEvent(entity.id, 'inventory_changed');

      // Entity starts inactive
      system.update(world, [entity]);
      expect(system.isActive(entity.id)).toBe(false);

      // Wake on event (manual call)
      system.wakeOnEvent(world, 'inventory_changed');
      expect(system.isActive(entity.id)).toBe(true);
    });

    it('should automatically wake entity when EventBus emits subscribed event', () => {
      const entity = createEntity();
      const sleepComp: SleepComponent = {
        type: 'sleep',
        state: 'waiting',
        wake_events: ['inventory:changed'],
        last_processed_tick: 0,
        accumulated_delta: 0,
      };
      entity.addComponent(sleepComp);
      world.addEntity(entity);

      // Subscribe to event
      system.subscribeToEvent(entity.id, 'inventory:changed');

      // Entity starts inactive
      system.update(world, [entity]);
      expect(system.isActive(entity.id)).toBe(false);

      // Emit event via EventBus - should automatically wake entity
      eventBus.emit({
        type: 'inventory:changed',
        source: entity.id,
        data: { entityId: entity.id, inventoryId: 'test_inv' }
      });

      // Process the event queue
      eventBus.flush();

      // Entity should now be active
      expect(system.isActive(entity.id)).toBe(true);
    });

    it('should unsubscribe entity from events and clean up EventBus subscription', () => {
      const entity = createEntity();
      const sleepComp: SleepComponent = {
        type: 'sleep',
        state: 'waiting',
        wake_events: ['agent:action:started'],
        last_processed_tick: 0,
        accumulated_delta: 0,
      };
      entity.addComponent(sleepComp);
      world.addEntity(entity);

      system.subscribeToEvent(entity.id, 'agent:action:started');
      system.unsubscribeFromEvent(entity.id, 'agent:action:started');

      // Should not wake after unsubscribe (manual)
      system.wakeOnEvent(world, 'agent:action:started');
      expect(system.isActive(entity.id)).toBe(false);

      // Should also not wake via EventBus
      eventBus.emit({
        type: 'agent:action:started',
        source: entity.id,
        data: { agentId: entity.id, actionId: 'test', actionType: 'walk' }
      });
      eventBus.flush();
      expect(system.isActive(entity.id)).toBe(false);
    });

    it('should support sleepUntilEvent helper', () => {
      const entity = createEntity();
      const sleepComp: SleepComponent = {
        type: 'sleep',
        state: 'active',
        last_processed_tick: 0,
        accumulated_delta: 0,
      };
      entity.addComponent(sleepComp);
      world.addEntity(entity);

      world.setTick(10);
      system.sleepUntilEvent(world, entity.id, ['event1', 'event2']);

      const sleep = entity.getComponent<SleepComponent>('sleep');
      expect(sleep?.state).toBe('waiting');
      expect(sleep?.wake_events).toEqual(['event1', 'event2']);
      expect(sleep?.last_processed_tick).toBe(10);

      // Entity should wake on either event
      system.wakeOnEvent(world, 'event2');
      expect(system.isActive(entity.id)).toBe(true);
    });

    it('should wake entity automatically via EventBus when using sleepUntilEvent', () => {
      const entity = createEntity();
      const sleepComp: SleepComponent = {
        type: 'sleep',
        state: 'active',
        last_processed_tick: 0,
        accumulated_delta: 0,
      };
      entity.addComponent(sleepComp);
      world.addEntity(entity);

      world.setTick(10);
      system.sleepUntilEvent(world, entity.id, ['agent:idle', 'agent:action:started']);

      const sleep = entity.getComponent<SleepComponent>('sleep');
      expect(sleep?.state).toBe('waiting');

      // Entity should not be active initially
      system.update(world, [entity]);
      expect(system.isActive(entity.id)).toBe(false);

      // Emit event via EventBus
      eventBus.emit({
        type: 'agent:idle',
        source: entity.id,
        data: { agentId: entity.id }
      });
      eventBus.flush();

      // Entity should be awake
      expect(system.isActive(entity.id)).toBe(true);
    });
  });

  describe('wakeEntity', () => {
    it('should force wake an entity', () => {
      const entity = createEntity();
      const sleepComp: SleepComponent = {
        type: 'sleep',
        state: 'scheduled',
        wake_tick: 1000,
        last_processed_tick: 0,
        accumulated_delta: 0,
      };
      entity.addComponent(sleepComp);
      world.addEntity(entity);

      world.setTick(50);
      system.wakeEntity(world, entity.id);

      expect(system.isActive(entity.id)).toBe(true);
      const sleep = entity.getComponent<SleepComponent>('sleep');
      expect(sleep?.state).toBe('active');
      expect(sleep?.accumulated_delta).toBe(50);
    });

    it('should handle waking non-existent entity', () => {
      expect(() => system.wakeEntity(world, 'non_existent')).not.toThrow();
    });
  });

  describe('getActiveCount', () => {
    it('should return correct active count', () => {
      expect(system.getActiveCount()).toBe(0);

      const entity1 = createEntity();
      const entity2 = createEntity();
      const sleepingEntity = createEntity();
      const sleepComp: SleepComponent = {
        type: 'sleep',
        state: 'scheduled',
        wake_tick: 1000,
        last_processed_tick: 0,
        accumulated_delta: 0,
      };
      sleepingEntity.addComponent(sleepComp);

      world.addEntity(entity1);
      world.addEntity(entity2);
      world.addEntity(sleepingEntity);

      system.update(world, [entity1, entity2, sleepingEntity]);
      expect(system.getActiveCount()).toBe(2); // Only entity1 and entity2 (no sleep component)
    });
  });

  describe('cleanup', () => {
    it('should clear all state', () => {
      const entity = createEntity();
      world.addEntity(entity);

      system.scheduleWake(entity.id, 100);
      system.subscribeToEvent(entity.id, 'test_event');
      system.update(world, [entity]);

      expect(system.getActiveCount()).toBeGreaterThan(0);

      system.cleanup();

      expect(system.getActiveCount()).toBe(0);
      expect(system.isActive(entity.id)).toBe(false);
    });

    it('should clean up EventBus subscriptions', () => {
      const entity = createEntity();
      const sleepComp: SleepComponent = {
        type: 'sleep',
        state: 'waiting',
        wake_events: ['agent:idle'],
        last_processed_tick: 0,
        accumulated_delta: 0,
      };
      entity.addComponent(sleepComp);
      world.addEntity(entity);

      // Subscribe to event
      system.subscribeToEvent(entity.id, 'agent:idle');

      // Clean up system
      system.cleanup();

      // Emit event - should NOT wake entity since subscriptions are cleaned up
      eventBus.emit({
        type: 'agent:idle',
        source: entity.id,
        data: { agentId: entity.id }
      });
      eventBus.flush();

      expect(system.isActive(entity.id)).toBe(false);
    });
  });

  describe('multiple entity wake scenarios', () => {
    it('should handle multiple entities with different wake times', () => {
      const entity1 = createEntity();
      const entity2 = createEntity();
      const entity3 = createEntity();

      [entity1, entity2, entity3].forEach(e => {
        const sleepComp: SleepComponent = {
          type: 'sleep',
          state: 'scheduled',
          wake_tick: 0,
          last_processed_tick: 0,
          accumulated_delta: 0,
        };
        e.addComponent(sleepComp);
        world.addEntity(e);
      });

      system.scheduleWake(entity1.id, 50);
      system.scheduleWake(entity2.id, 100);
      system.scheduleWake(entity3.id, 150);

      // At tick 75, only entity1 should be awake
      world.setTick(75);
      system.update(world, [entity1, entity2, entity3]);
      expect(system.isActive(entity1.id)).toBe(true);
      expect(system.isActive(entity2.id)).toBe(false);
      expect(system.isActive(entity3.id)).toBe(false);

      // At tick 125, entity1 and entity2 should be awake
      world.setTick(125);
      system.update(world, [entity1, entity2, entity3]);
      expect(system.isActive(entity2.id)).toBe(true);
      expect(system.isActive(entity3.id)).toBe(false);

      // At tick 200, all should be awake
      world.setTick(200);
      system.update(world, [entity1, entity2, entity3]);
      expect(system.isActive(entity3.id)).toBe(true);
    });

    it('should wake multiple entities on same event via manual wakeOnEvent', () => {
      const entity1 = createEntity();
      const entity2 = createEntity();

      [entity1, entity2].forEach(e => {
        const sleepComp: SleepComponent = {
          type: 'sleep',
          state: 'waiting',
          wake_events: ['shared_event'],
          last_processed_tick: 0,
          accumulated_delta: 0,
        };
        e.addComponent(sleepComp);
        world.addEntity(e);
      });

      system.subscribeToEvent(entity1.id, 'shared_event');
      system.subscribeToEvent(entity2.id, 'shared_event');

      system.wakeOnEvent(world, 'shared_event');

      expect(system.isActive(entity1.id)).toBe(true);
      expect(system.isActive(entity2.id)).toBe(true);
    });

    it('should wake multiple entities on same event via EventBus', () => {
      const entity1 = createEntity();
      const entity2 = createEntity();

      [entity1, entity2].forEach(e => {
        const sleepComp: SleepComponent = {
          type: 'sleep',
          state: 'waiting',
          wake_events: ['agent:action:completed'],
          last_processed_tick: 0,
          accumulated_delta: 0,
        };
        e.addComponent(sleepComp);
        world.addEntity(e);
      });

      system.subscribeToEvent(entity1.id, 'agent:action:completed');
      system.subscribeToEvent(entity2.id, 'agent:action:completed');

      // Emit via EventBus
      eventBus.emit({
        type: 'agent:action:completed',
        source: entity1.id,
        data: { agentId: entity1.id, actionId: 'test', success: true }
      });
      eventBus.flush();

      expect(system.isActive(entity1.id)).toBe(true);
      expect(system.isActive(entity2.id)).toBe(true);
    });
  });

  describe('removeEntity', () => {
    it('should remove entity from wake queue', () => {
      const entity = createEntity();
      const sleepComp: SleepComponent = {
        type: 'sleep',
        state: 'scheduled',
        wake_tick: 100,
        last_processed_tick: 0,
        accumulated_delta: 0,
      };
      entity.addComponent(sleepComp);
      world.addEntity(entity);

      system.scheduleWake(entity.id, 100);

      // Entity should be in wake queue
      world.setTick(100);
      system.update(world, [entity]);
      expect(system.isActive(entity.id)).toBe(true);

      // Remove entity
      system.removeEntity(entity.id);

      // Entity should no longer be in active set
      expect(system.isActive(entity.id)).toBe(false);
    });

    it('should remove entity from event subscriptions', () => {
      const entity = createEntity();
      const sleepComp: SleepComponent = {
        type: 'sleep',
        state: 'waiting',
        wake_events: ['test_event'],
        last_processed_tick: 0,
        accumulated_delta: 0,
      };
      entity.addComponent(sleepComp);
      world.addEntity(entity);

      system.subscribeToEvent(entity.id, 'test_event');

      // Remove entity
      system.removeEntity(entity.id);

      // Entity should not wake on event
      system.wakeOnEvent(world, 'test_event');
      expect(system.isActive(entity.id)).toBe(false);
    });

    it('should remove entity from activeThisTick', () => {
      const entity = createEntity();
      world.addEntity(entity);

      // Entity without sleep component is always active
      system.update(world, [entity]);
      expect(system.isActive(entity.id)).toBe(true);

      // Remove entity
      system.removeEntity(entity.id);
      expect(system.isActive(entity.id)).toBe(false);
    });

    it('should clean up EventBus subscription when last subscriber is removed', () => {
      const entity1 = createEntity();
      const entity2 = createEntity();
      world.addEntity(entity1);
      world.addEntity(entity2);

      system.subscribeToEvent(entity1.id, 'test_event');
      system.subscribeToEvent(entity2.id, 'test_event');

      // Remove first entity - subscription should still exist
      system.removeEntity(entity1.id);

      // Second entity should still wake on event
      system.wakeOnEvent(world, 'test_event');
      expect(system.isActive(entity2.id)).toBe(true);

      // Remove second entity - subscription should be cleaned up
      system.removeEntity(entity2.id);

      // Verify no entities wake on event (subscription cleaned up)
      const entity3 = createEntity();
      world.addEntity(entity3);
      system.wakeOnEvent(world, 'test_event');
      expect(system.isActive(entity3.id)).toBe(false);
    });
  });

  describe('automatic cleanup on entity destruction', () => {
    it('should automatically clean up when entity is destroyed', () => {
      const entity = createEntity();
      const sleepComp: SleepComponent = {
        type: 'sleep',
        state: 'scheduled',
        wake_tick: 100,
        last_processed_tick: 0,
        accumulated_delta: 0,
      };
      entity.addComponent(sleepComp);
      world.addEntity(entity);

      system.scheduleWake(entity.id, 100);
      system.subscribeToEvent(entity.id, 'test_event');
      system.update(world, [entity]);

      // Destroy entity (should trigger entity:destroyed event)
      world.destroyEntity(entity.id, 'test cleanup');

      // Entity should be cleaned up from all tracking
      expect(system.isActive(entity.id)).toBe(false);

      // Should not wake on event
      system.wakeOnEvent(world, 'test_event');
      expect(system.isActive(entity.id)).toBe(false);
    });

    it('should handle destroying entity with multiple event subscriptions', () => {
      const entity = createEntity();
      const sleepComp: SleepComponent = {
        type: 'sleep',
        state: 'waiting',
        wake_events: ['event1', 'event2', 'event3'],
        last_processed_tick: 0,
        accumulated_delta: 0,
      };
      entity.addComponent(sleepComp);
      world.addEntity(entity);

      system.subscribeToEvent(entity.id, 'event1');
      system.subscribeToEvent(entity.id, 'event2');
      system.subscribeToEvent(entity.id, 'event3');

      // Destroy entity
      world.destroyEntity(entity.id, 'test cleanup');

      // Should not wake on any event
      system.wakeOnEvent(world, 'event1');
      system.wakeOnEvent(world, 'event2');
      system.wakeOnEvent(world, 'event3');
      expect(system.isActive(entity.id)).toBe(false);
    });
  });
});
