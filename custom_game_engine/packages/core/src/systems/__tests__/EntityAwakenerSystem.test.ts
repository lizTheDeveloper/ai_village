import { describe, it, expect, beforeEach } from 'vitest';
import { EntityAwakenerSystem } from '../EntityAwakenerSystem.js';
import { World } from '../../ecs/World.js';
import { Entity } from '../../ecs/Entity.js';
import { EventBus } from '../../events/EventBus.js';
import type { SleepComponent } from '../../components/SleepComponent.js';

describe('EntityAwakenerSystem', () => {
  let system: EntityAwakenerSystem;
  let world: World;
  let eventBus: EventBus;

  beforeEach(() => {
    system = new EntityAwakenerSystem();
    world = new World();
    eventBus = new EventBus();
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
      const entity = new Entity();
      world.addEntity(entity);

      system.update(world, [entity]);
      expect(system.isActive(entity.id)).toBe(true);
    });

    it('should return false for sleeping entity', () => {
      const entity = new Entity();
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
      const entity = new Entity();
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
      const entity = new Entity();
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
      world.tick = 50;
      system.update(world, [entity]);
      expect(system.isActive(entity.id)).toBe(false);

      // Entity becomes active at wake tick
      world.tick = 100;
      system.update(world, [entity]);
      expect(system.isActive(entity.id)).toBe(true);

      const sleep = entity.getComponent<SleepComponent>('sleep');
      expect(sleep?.state).toBe('active');
      expect(sleep?.accumulated_delta).toBe(100);
    });

    it('should wake entity after wake tick has passed', () => {
      const entity = new Entity();
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

      world.tick = 150;
      system.update(world, [entity]);
      expect(system.isActive(entity.id)).toBe(true);
    });
  });

  describe('sleepUntil', () => {
    it('should put entity to sleep until scheduled wake tick', () => {
      const entity = new Entity();
      const sleepComp: SleepComponent = {
        type: 'sleep',
        state: 'active',
        last_processed_tick: 0,
        accumulated_delta: 0,
      };
      entity.addComponent(sleepComp);
      world.addEntity(entity);

      world.tick = 50;
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
    it('should subscribe entity to events', () => {
      const entity = new Entity();
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

      // Wake on event
      system.wakeOnEvent(world, 'inventory_changed');
      expect(system.isActive(entity.id)).toBe(true);
    });

    it('should unsubscribe entity from events', () => {
      const entity = new Entity();
      world.addEntity(entity);

      system.subscribeToEvent(entity.id, 'test_event');
      system.unsubscribeFromEvent(entity.id, 'test_event');

      // Should not wake after unsubscribe
      system.wakeOnEvent(world, 'test_event');
      expect(system.isActive(entity.id)).toBe(false);
    });

    it('should support sleepUntilEvent helper', () => {
      const entity = new Entity();
      const sleepComp: SleepComponent = {
        type: 'sleep',
        state: 'active',
        last_processed_tick: 0,
        accumulated_delta: 0,
      };
      entity.addComponent(sleepComp);
      world.addEntity(entity);

      world.tick = 10;
      system.sleepUntilEvent(world, entity.id, ['event1', 'event2']);

      const sleep = entity.getComponent<SleepComponent>('sleep');
      expect(sleep?.state).toBe('waiting');
      expect(sleep?.wake_events).toEqual(['event1', 'event2']);
      expect(sleep?.last_processed_tick).toBe(10);

      // Entity should wake on either event
      system.wakeOnEvent(world, 'event2');
      expect(system.isActive(entity.id)).toBe(true);
    });
  });

  describe('wakeEntity', () => {
    it('should force wake an entity', () => {
      const entity = new Entity();
      const sleepComp: SleepComponent = {
        type: 'sleep',
        state: 'scheduled',
        wake_tick: 1000,
        last_processed_tick: 0,
        accumulated_delta: 0,
      };
      entity.addComponent(sleepComp);
      world.addEntity(entity);

      world.tick = 50;
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

      const entity1 = new Entity();
      const entity2 = new Entity();
      const sleepingEntity = new Entity();
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
      const entity = new Entity();
      world.addEntity(entity);

      system.scheduleWake(entity.id, 100);
      system.subscribeToEvent(entity.id, 'test_event');
      system.update(world, [entity]);

      expect(system.getActiveCount()).toBeGreaterThan(0);

      system.cleanup();

      expect(system.getActiveCount()).toBe(0);
      expect(system.isActive(entity.id)).toBe(false);
    });
  });

  describe('multiple entity wake scenarios', () => {
    it('should handle multiple entities with different wake times', () => {
      const entity1 = new Entity();
      const entity2 = new Entity();
      const entity3 = new Entity();

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
      world.tick = 75;
      system.update(world, [entity1, entity2, entity3]);
      expect(system.isActive(entity1.id)).toBe(true);
      expect(system.isActive(entity2.id)).toBe(false);
      expect(system.isActive(entity3.id)).toBe(false);

      // At tick 125, entity1 and entity2 should be awake
      world.tick = 125;
      system.update(world, [entity1, entity2, entity3]);
      expect(system.isActive(entity2.id)).toBe(true);
      expect(system.isActive(entity3.id)).toBe(false);

      // At tick 200, all should be awake
      world.tick = 200;
      system.update(world, [entity1, entity2, entity3]);
      expect(system.isActive(entity3.id)).toBe(true);
    });

    it('should wake multiple entities on same event', () => {
      const entity1 = new Entity();
      const entity2 = new Entity();

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
  });
});
