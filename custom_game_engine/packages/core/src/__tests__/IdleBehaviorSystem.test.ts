import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldImpl, type World } from '../ecs/World';
import { EventBusImpl } from '../events/EventBus';
import { IdleBehaviorSystem } from '../systems/IdleBehaviorSystem';
import { NeedsComponent } from '../components/NeedsComponent';
import { PersonalityComponent } from '../components/PersonalityComponent';
import { ActionQueue } from '../actions/ActionQueueClass';
import type { IdleBehaviorType } from '../systems/IdleBehaviorSystem';

import { ComponentType } from '../types/ComponentType.js';
describe('IdleBehaviorSystem', () => {
  let world: World;
  let system: IdleBehaviorSystem;

  beforeEach(() => {
    const eventBus = new EventBusImpl();
    world = new World(eventBus);
    system = new IdleBehaviorSystem();
  });

  describe('idle behavior selection', () => {
    it('should select an idle behavior when agent has no tasks', () => {
      const entity = world.createEntity();
      (entity as any).addComponent(new NeedsComponent());
      (entity as any).addComponent( new PersonalityComponent({
        openness: 0.7,
        conscientiousness: 0.6,
        extraversion: 0.5,
        agreeableness: 0.6,
        neuroticism: 0.3
      }));
      (entity as any).addComponent( new ActionQueue(entity.id));

      system.update(world, 1);

      const queue = entity.getComponent(ComponentType.ActionQueue) as ActionQueue;
      expect(queue.isEmpty()).toBe(false);
    });

    it('should not select idle behavior if agent has urgent tasks', () => {
      const entity = world.createEntity();
      (entity as any).addComponent(new NeedsComponent());
      (entity as any).addComponent( new PersonalityComponent({
        openness: 0.7,
        conscientiousness: 0.6,
        extraversion: 0.5,
        agreeableness: 0.6,
        neuroticism: 0.3
      }));
      const queue = new ActionQueue(entity.id);
      queue.enqueue({
        type: 'gather',
        priority: 0.8,
        resourceId: 'test-resource'
      });
      (entity as any).addComponent( queue);

      const initialSize = queue.size();
      system.update(world, 1);

      // Queue should not change
      expect(queue.size()).toBe(initialSize);
    });

    it('should skip entities without personality component', () => {
      const entity = world.createEntity();
      (entity as any).addComponent(new NeedsComponent());
      (entity as any).addComponent(new ActionQueue(entity.id));

      const queue = entity.getComponent(ComponentType.ActionQueue) as ActionQueue;
      const initialSize = queue.size();

      // Should not throw, just skip the entity
      expect(() => {
        system.update(world, 1);
      }).not.toThrow();

      // Queue should be unchanged
      expect(queue.size()).toBe(initialSize);
    });
  });

  describe('behavior weighting by personality', () => {
    it('should weight chat higher for extraverted agents', () => {
      const entity = world.createEntity();
      (entity as any).addComponent(new NeedsComponent());
      (entity as any).addComponent( new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.9, // High extraversion
        agreeableness: 0.6,
        neuroticism: 0.3
      }));
      (entity as any).addComponent( new ActionQueue(entity.id));

      // Run multiple times to get statistical distribution
      const behaviors: IdleBehaviorType[] = [];
      for (let i = 0; i < 50; i++) {
        const queue = entity.getComponent(ComponentType.ActionQueue) as ActionQueue;
        queue.clear();
        system.update(world, 1);
        const action = queue.peek();
        if (action) {
          behaviors.push(action.type as IdleBehaviorType);
        }
      }

      // Chat should appear more frequently than other behaviors
      const chatCount = behaviors.filter(b => b === 'chat_idle').length;
      expect(chatCount).toBeGreaterThan(5); // At least 10% of attempts
    });

    it('should weight reflect higher for conscientious agents', () => {
      const entity = world.createEntity();
      (entity as any).addComponent(new NeedsComponent());
      (entity as any).addComponent( new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.9, // High conscientiousness
        extraversion: 0.3,
        agreeableness: 0.6,
        neuroticism: 0.3
      }));
      (entity as any).addComponent( new ActionQueue(entity.id));

      const behaviors: IdleBehaviorType[] = [];
      for (let i = 0; i < 50; i++) {
        const queue = entity.getComponent(ComponentType.ActionQueue) as ActionQueue;
        queue.clear();
        system.update(world, 1);
        const action = queue.peek();
        if (action) {
          behaviors.push(action.type as IdleBehaviorType);
        }
      }

      const reflectCount = behaviors.filter(b => b === 'reflect').length;
      expect(reflectCount).toBeGreaterThan(5);
    });

    it('should weight amuse_self higher for open agents', () => {
      const entity = world.createEntity();
      (entity as any).addComponent(new NeedsComponent());
      (entity as any).addComponent( new PersonalityComponent({
        openness: 0.9, // High openness
        conscientiousness: 0.5,
        extraversion: 0.3,
        agreeableness: 0.6,
        neuroticism: 0.3
      }));
      (entity as any).addComponent( new ActionQueue(entity.id));

      const behaviors: IdleBehaviorType[] = [];
      for (let i = 0; i < 50; i++) {
        const queue = entity.getComponent(ComponentType.ActionQueue) as ActionQueue;
        queue.clear();
        system.update(world, 1);
        const action = queue.peek();
        if (action) {
          behaviors.push(action.type as IdleBehaviorType);
        }
      }

      const amuseCount = behaviors.filter(b => b === 'amuse_self').length;
      expect(amuseCount).toBeGreaterThan(3);
    });
  });

  describe('behavior weighting by mood', () => {
    it('should weight chat higher when lonely', () => {
      const entity = world.createEntity();
      const needs = new NeedsComponent();
      needs.social = 0.2; // Low social (lonely)
      (entity as any).addComponent(needs);
      (entity as any).addComponent( new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.6,
        neuroticism: 0.3
      }));
      (entity as any).addComponent( new ActionQueue(entity.id));

      const behaviors: IdleBehaviorType[] = [];
      for (let i = 0; i < 50; i++) {
        const queue = entity.getComponent(ComponentType.ActionQueue) as ActionQueue;
        queue.clear();
        system.update(world, 1);
        const action = queue.peek();
        if (action) {
          behaviors.push(action.type as IdleBehaviorType);
        }
      }

      const chatCount = behaviors.filter(b => b === 'chat_idle').length;
      expect(chatCount).toBeGreaterThan(10); // Should be weighted heavily
    });

    it('should weight sit_quietly higher when content', () => {
      const entity = world.createEntity();
      const needs = new NeedsComponent();
      needs.energy = 0.8;
      needs.hunger = 0.8;
      needs.social = 0.8;
      (entity as any).addComponent(needs);
      (entity as any).addComponent( new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.6,
        neuroticism: 0.3
      }));
      (entity as any).addComponent( new ActionQueue(entity.id));

      const behaviors: IdleBehaviorType[] = [];
      for (let i = 0; i < 50; i++) {
        const queue = entity.getComponent(ComponentType.ActionQueue) as ActionQueue;
        queue.clear();
        system.update(world, 1);
        const action = queue.peek();
        if (action) {
          behaviors.push(action.type as IdleBehaviorType);
        }
      }

      const sitCount = behaviors.filter(b => b === 'sit_quietly').length;
      expect(sitCount).toBeGreaterThan(3);
    });

    it('should weight practice_skill higher when bored', () => {
      const entity = world.createEntity();
      const needs = new NeedsComponent();
      needs.stimulation = 0.3; // Low stimulation (bored)
      (entity as any).addComponent(needs);
      (entity as any).addComponent( new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.6,
        neuroticism: 0.3
      }));
      (entity as any).addComponent( new ActionQueue(entity.id));

      const behaviors: IdleBehaviorType[] = [];
      for (let i = 0; i < 50; i++) {
        const queue = entity.getComponent(ComponentType.ActionQueue) as ActionQueue;
        queue.clear();
        system.update(world, 1);
        const action = queue.peek();
        if (action) {
          behaviors.push(action.type as IdleBehaviorType);
        }
      }

      const practiceCount = behaviors.filter(b => b === 'practice_skill').length;
      expect(practiceCount).toBeGreaterThan(3);
    });
  });

  describe('behavior priority', () => {
    it('should assign low priority to all idle behaviors', () => {
      const entity = world.createEntity();
      (entity as any).addComponent(new NeedsComponent());
      (entity as any).addComponent( new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.6,
        neuroticism: 0.3
      }));
      (entity as any).addComponent( new ActionQueue(entity.id));

      system.update(world, 1);

      const queue = entity.getComponent(ComponentType.ActionQueue) as ActionQueue;
      const action = queue.peek();
      expect(action?.priority).toBeLessThan(0.4); // Low priority
    });
  });

  describe('behavior variety', () => {
    it('should use multiple different idle behaviors over time', () => {
      const entity = world.createEntity();
      (entity as any).addComponent(new NeedsComponent());
      (entity as any).addComponent( new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5
      }));
      (entity as any).addComponent( new ActionQueue(entity.id));

      const behaviors = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const queue = entity.getComponent(ComponentType.ActionQueue) as ActionQueue;
        queue.clear();
        system.update(world, 1);
        const action = queue.peek();
        if (action) {
          behaviors.add(action.type);
        }
      }

      // Should use at least 4 different behaviors
      expect(behaviors.size).toBeGreaterThanOrEqual(4);
    });
  });
});
