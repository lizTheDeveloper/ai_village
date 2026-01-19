import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../../ecs/World.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { IdleBehaviorSystem } from '../IdleBehaviorSystem.js';
import { createAgentComponent } from '../../components/AgentComponent.js';
import { PersonalityComponent } from '../../components/PersonalityComponent.js';
import { NeedsComponent } from '../../components/NeedsComponent.js';
import { createMoodComponent } from '../../components/MoodComponent.js';
import { MemoryComponent } from '../../components/MemoryComponent.js';
import { GoalsComponent } from '../../components/GoalsComponent.js';
import { ActionQueue } from '../../actions/ActionQueueClass.js';

import { ComponentType } from '../../types/ComponentType.js';
/**
 * Integration tests for IdleBehaviorSystem
 *
 * These tests actually RUN the system to verify idle behavior selection works correctly.
 * Unit tests verify calculations, integration tests verify behavior.
 */

describe('IdleBehaviorSystem Integration', () => {
  let world: WorldImpl;
  let eventBus: EventBusImpl;
  let idleBehaviorSystem: IdleBehaviorSystem;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    idleBehaviorSystem = new IdleBehaviorSystem();
  });

  it('should select varied idle behaviors over 100 iterations', () => {
    // Create agent with balanced personality
    const agent = new EntityImpl(createEntityId(), 0);
    agent.addComponent(createAgentComponent('Test Agent'));
    agent.addComponent(new PersonalityComponent({
      openness: 0.6,
      conscientiousness: 0.6,
      extraversion: 0.6,
      agreeableness: 0.6,
      neuroticism: 0.4,
    }));
    agent.addComponent(new NeedsComponent({
    hunger: 0.8,
    energy: 0.8,
    health: 0.8,
    hungerDecayRate: 0.42,
    energyDecayRate: 0.5,
  }));
    agent.addComponent(createMoodComponent());
    agent.addComponent(new MemoryComponent(agent.id));
    agent.addComponent(new GoalsComponent());
    agent.addComponent(new ActionQueue(agent.id));
    world.addEntity(agent);

    const behaviors = new Set<string>();
    const behaviorCounts: Record<string, number> = {};

    // Run 100 iterations
    for (let i = 0; i < 100; i++) {
      const actionQueue = agent.getComponent(ComponentType.ActionQueue) as any;
      actionQueue.clear();

      idleBehaviorSystem.update(world, 1);

      const action = actionQueue.peek();
      if (action) {
        behaviors.add(action.type);
        behaviorCounts[action.type] = (behaviorCounts[action.type] || 0) + 1;
      }
    }

    // Should use at least 4 different behaviors
    expect(behaviors.size).toBeGreaterThanOrEqual(4);

    // Less than 30% should be pure "wander_aimlessly"
    const idleCount = (behaviorCounts['wander_aimlessly'] || 0);
    expect(idleCount / 100).toBeLessThan(0.3);
  });

  it('should select chat_idle more often when agent is lonely', () => {
    const agent = new EntityImpl(createEntityId(), 0);
    agent.addComponent(createAgentComponent('Lonely Agent'));
    agent.addComponent(new PersonalityComponent({
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.7, // Extraverted
      agreeableness: 0.6,
      neuroticism: 0.3,
    }));

    const needs = new NeedsComponent({
    hunger: 0.8,
    energy: 0.8,
    health: 0.2,
    hungerDecayRate: 0.42,
    energyDecayRate: 0.5,
  }); // Low social
    agent.addComponent(needs);
    agent.addComponent(createMoodComponent());
    agent.addComponent(new MemoryComponent(agent.id));
    agent.addComponent(new GoalsComponent());
    agent.addComponent(new ActionQueue(agent.id));
    world.addEntity(agent);

    const behaviorCounts: Record<string, number> = {};

    // Run 50 iterations
    for (let i = 0; i < 50; i++) {
      const actionQueue = agent.getComponent(ComponentType.ActionQueue) as any;
      actionQueue.clear();

      idleBehaviorSystem.update(world, 1);

      const action = actionQueue.peek();
      if (action) {
        behaviorCounts[action.type] = (behaviorCounts[action.type] || 0) + 1;
      }
    }

    // Should have significant chat_idle behavior
    expect(behaviorCounts['chat_idle'] || 0).toBeGreaterThan(5);
  });

  it('should select sit_quietly more often when agent is content', () => {
    const agent = new EntityImpl(createEntityId(), 0);
    agent.addComponent(createAgentComponent('Content Agent'));
    agent.addComponent(new PersonalityComponent({
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.3, // Introverted
      agreeableness: 0.6,
      neuroticism: 0.2, // Low neuroticism
    }));

    const needs = new NeedsComponent({
    hunger: 0.9,
    energy: 0.9,
    health: 0.9,
    hungerDecayRate: 0.42,
    energyDecayRate: 0.5,
  }); // All needs met
    agent.addComponent(needs);
    agent.addComponent(createMoodComponent());
    agent.addComponent(new MemoryComponent(agent.id));
    agent.addComponent(new GoalsComponent());
    agent.addComponent(new ActionQueue(agent.id));
    world.addEntity(agent);

    const behaviorCounts: Record<string, number> = {};

    // Run 50 iterations
    for (let i = 0; i < 50; i++) {
      const actionQueue = agent.getComponent(ComponentType.ActionQueue) as any;
      actionQueue.clear();

      idleBehaviorSystem.update(world, 1);

      const action = actionQueue.peek();
      if (action) {
        behaviorCounts[action.type] = (behaviorCounts[action.type] || 0) + 1;
      }
    }

    // Should have some sit_quietly behavior
    expect(behaviorCounts['sit_quietly'] || 0).toBeGreaterThan(0);
  });

  it('should weight reflection higher for conscientious agents', () => {
    const agent = new EntityImpl(createEntityId(), 0);
    agent.addComponent(createAgentComponent('Reflective Agent'));
    agent.addComponent(new PersonalityComponent({
      openness: 0.7,
      conscientiousness: 0.7,
      extraversion: 0.5,
      agreeableness: 0.6,
      neuroticism: 0.3,
    }));
    agent.addComponent(new NeedsComponent({
    hunger: 0.8,
    energy: 0.8,
    health: 0.8,
    hungerDecayRate: 0.42,
    energyDecayRate: 0.5,
  }));
    agent.addComponent(createMoodComponent());

    const memory = new MemoryComponent(agent.id);
    (memory as any).lastReflectionTime = 0; // Haven't reflected recently
    agent.addComponent(memory);
    agent.addComponent(new GoalsComponent());
    agent.addComponent(new ActionQueue(agent.id));
    world.addEntity(agent);

    const behaviorCounts: Record<string, number> = {};

    // Run 50 iterations
    for (let i = 0; i < 50; i++) {
      const actionQueue = agent.getComponent(ComponentType.ActionQueue) as any;
      actionQueue.clear();

      idleBehaviorSystem.update(world, 1);

      const action = actionQueue.peek();
      if (action) {
        behaviorCounts[action.type] = (behaviorCounts[action.type] || 0) + 1;
      }
    }

    // Should have some reflection behavior
    expect(behaviorCounts['reflect'] || 0).toBeGreaterThan(0);
  });

  it('should NOT select behaviors when agent has existing actions', () => {
    const agent = new EntityImpl(createEntityId(), 0);
    agent.addComponent(createAgentComponent('Busy Agent'));
    agent.addComponent(new PersonalityComponent({
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      neuroticism: 0.5,
    }));

    const needs = new NeedsComponent({
    hunger: 0.8,
    energy: 0.8,
    health: 0.8,
    hungerDecayRate: 0.42,
    energyDecayRate: 0.5,
  });
    agent.addComponent(needs);
    agent.addComponent(createMoodComponent());
    agent.addComponent(new MemoryComponent(agent.id));
    agent.addComponent(new GoalsComponent());

    const queue = new ActionQueue(agent.id);
    queue.enqueue({ type: 'gather', priority: 0.8 }); // Already has an action
    agent.addComponent(queue);
    world.addEntity(agent);

    const initialQueueSize = queue.size();

    // System should not add idle behaviors to a non-empty queue
    idleBehaviorSystem.update(world, 1);

    expect(queue.size()).toBe(initialQueueSize); // Queue unchanged
  });

  it('should select practice_skill when agent is highly conscientious', () => {
    const agent = new EntityImpl(createEntityId(), 0);
    agent.addComponent(createAgentComponent('Skilled Agent'));
    agent.addComponent(new PersonalityComponent({
      openness: 0.8,
      conscientiousness: 0.8,
      extraversion: 0.4,
      agreeableness: 0.5,
      neuroticism: 0.3,
    }));
    agent.addComponent(new NeedsComponent({
    hunger: 0.8,
    energy: 0.8,
    health: 0.8,
    hungerDecayRate: 0.42,
    energyDecayRate: 0.5,
  }));
    agent.addComponent(createMoodComponent());
    agent.addComponent(new MemoryComponent(agent.id));

    const goals = new GoalsComponent();
    goals.addGoal({
      id: 'goal-1',
      category: 'mastery',
      description: 'Become a master builder',
      motivation: 'I want to create beautiful structures',
      progress: 0,
      milestones: [],
      createdAt: Date.now(),
      targetCompletionDays: 30,
    });
    agent.addComponent(goals);
    agent.addComponent(new ActionQueue(agent.id));
    world.addEntity(agent);

    const behaviorCounts: Record<string, number> = {};

    // Run 50 iterations
    for (let i = 0; i < 50; i++) {
      const actionQueue = agent.getComponent(ComponentType.ActionQueue) as any;
      actionQueue.clear();

      idleBehaviorSystem.update(world, 1);

      const action = actionQueue.peek();
      if (action) {
        behaviorCounts[action.type] = (behaviorCounts[action.type] || 0) + 1;
      }
    }

    // Should have some practice_skill behavior
    expect(behaviorCounts['practice_skill'] || 0).toBeGreaterThan(0);
  });

  it('should select behaviors based on personality weighting', () => {
    const agent = new EntityImpl(createEntityId(), 0);
    agent.addComponent(createAgentComponent('Stable Agent'));
    agent.addComponent(new PersonalityComponent({
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      neuroticism: 0.5,
    }));
    agent.addComponent(new NeedsComponent({
    hunger: 0.8,
    energy: 0.8,
    health: 0.8,
    hungerDecayRate: 0.42,
    energyDecayRate: 0.5,
  }));
    agent.addComponent(createMoodComponent());
    agent.addComponent(new MemoryComponent(agent.id));
    agent.addComponent(new GoalsComponent());
    agent.addComponent(new ActionQueue(agent.id));
    world.addEntity(agent);

    const behaviors = new Set<string>();

    // Run 50 iterations
    for (let i = 0; i < 50; i++) {
      const actionQueue = agent.getComponent(ComponentType.ActionQueue) as any;
      actionQueue.clear();

      idleBehaviorSystem.update(world, 1);

      const action = actionQueue.peek();
      if (action) {
        behaviors.add(action.type);
      }
    }

    // Should use multiple different behaviors over time
    expect(behaviors.size).toBeGreaterThan(1);
  });
});
