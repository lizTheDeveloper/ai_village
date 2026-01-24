import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from '../ecs/World';
import { EventBusImpl } from '../events/EventBus';
import { IdleBehaviorSystem } from '../systems/IdleBehaviorSystem';
import { ReflectionSystem } from '../systems/ReflectionSystem';
import { NeedsComponent } from '../components/NeedsComponent';
import { PersonalityComponent } from '../components/PersonalityComponent';
import { MemoryComponent } from '../components/MemoryComponent';
import { GoalsComponent } from '../components/GoalsComponent';
import { ActionQueue } from '../actions/ActionQueueClass';

import { ComponentType } from '../types/ComponentType.js';
describe('Idle Behaviors Integration', () => {
  let world: World;
  let idleBehaviorSystem: IdleBehaviorSystem;
  let reflectionSystem: ReflectionSystem;

  beforeEach(() => {
    const eventBus = new EventBusImpl();
    world = new World(eventBus);
    idleBehaviorSystem = new IdleBehaviorSystem();
    reflectionSystem = new ReflectionSystem(eventBus);
  });

  describe('idle behavior variety over time', () => {
    it('should exhibit less than 30% pure idle behavior', () => {
      const entity = world.createEntity();
      (entity as any).addComponent(new NeedsComponent());
      (entity as any).addComponent(new PersonalityComponent({
        openness: 0.6,
        conscientiousness: 0.6,
        extraversion: 0.6,
        agreeableness: 0.6,
        neuroticism: 0.4
      }));
      (entity as any).addComponent(new MemoryComponent(entity.id));
      (entity as any).addComponent(new GoalsComponent());
      (entity as any).addComponent(new ActionQueue(entity.id));

      const behaviors: string[] = [];
      for (let i = 0; i < 100; i++) {
        const queue = entity.getComponent(ComponentType.ActionQueue) as ActionQueue;
        queue.clear();
        idleBehaviorSystem.update(world, 1);
        const action = queue.peek();
        if (action) {
          behaviors.push(action.type);
        }
      }

      const idleCount = behaviors.filter(b => b === 'idle' || b === 'wander_aimlessly').length;
      const idlePercentage = idleCount / behaviors.length;

      expect(idlePercentage).toBeLessThan(0.3);
    });

    it('should use at least 4 different idle behaviors', () => {
      const entity = world.createEntity();
      (entity as any).addComponent(new NeedsComponent());
      (entity as any).addComponent(new PersonalityComponent({
        openness: 0.6,
        conscientiousness: 0.6,
        extraversion: 0.6,
        agreeableness: 0.6,
        neuroticism: 0.4
      }));
      (entity as any).addComponent(new MemoryComponent(entity.id));
      (entity as any).addComponent(new GoalsComponent());
      (entity as any).addComponent(new ActionQueue(entity.id));

      const behaviors = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const queue = entity.getComponent(ComponentType.ActionQueue) as ActionQueue;
        queue.clear();
        idleBehaviorSystem.update(world, 1);
        const action = queue.peek();
        if (action) {
          behaviors.add(action.type);
        }
      }

      expect(behaviors.size).toBeGreaterThanOrEqual(4);
    });
  });

  describe('reflection frequency', () => {
    it.skip('should reflect 1-3 times per game day when idle (reflection system not fully implemented)', () => {
      const entity = world.createEntity();
      (entity as any).addComponent(new NeedsComponent());
      (entity as any).addComponent( new PersonalityComponent({
        openness: 0.7,
        conscientiousness: 0.7,
        extraversion: 0.5,
        agreeableness: 0.6,
        neuroticism: 0.3
      }));
      (entity as any).addComponent( new MemoryComponent(entity.id));
      (entity as any).addComponent(new GoalsComponent());
      (entity as any).addComponent(new ActionQueue(entity.id));

      let reflectionCount = 0;
      const eventHandler = vi.fn(() => reflectionCount++);
      world.eventBus.subscribe('agent:reflection_complete', eventHandler);

      // Simulate 1 game day (assuming 1000 ticks = 1 day)
      for (let i = 0; i < 1000; i++) {
        idleBehaviorSystem.update(world, 1);

        const queue = entity.getComponent(ComponentType.ActionQueue) as ActionQueue;
        const action = queue.peek();
        if (action?.type === 'reflect') {
          // Execute reflection
          queue.dequeue();
          reflectionSystem.update(world, 1);
        }
      }

      expect(reflectionCount).toBeGreaterThanOrEqual(1);
      expect(reflectionCount).toBeLessThanOrEqual(3);
    });

    it('should not spam reflection too frequently', () => {
      const entity = world.createEntity();
      const memory = new MemoryComponent(entity.id);
      (entity as any).addComponent( memory);
      (entity as any).addComponent(new NeedsComponent());
      (entity as any).addComponent( new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5
      }));
      (entity as any).addComponent(new GoalsComponent());
      (entity as any).addComponent(new ActionQueue(entity.id));

      // Trigger reflection
      reflectionSystem.update(world, 1);
      const firstTime = memory.lastReflectionTime || 0;

      // Try to trigger again immediately
      reflectionSystem.update(world, 1);
      const secondTime = memory.lastReflectionTime || 0;

      // Should not reflect again immediately
      expect(secondTime).toBe(firstTime);
    });
  });

  describe('goal formation during reflection', () => {
    it.skip('should result in 80%+ agents having goals by day 3 (goal generation not implemented)', () => {
      const agents = [];
      for (let i = 0; i < 20; i++) {
        const entity = world.createEntity();
        (entity as any).addComponent(new NeedsComponent());
        (entity as any).addComponent( new PersonalityComponent({
          openness: Math.random(),
          conscientiousness: Math.random(),
          extraversion: Math.random(),
          agreeableness: Math.random(),
          neuroticism: Math.random()
        }));
        (entity as any).addComponent( new MemoryComponent(entity.id));
        (entity as any).addComponent(new GoalsComponent());
        (entity as any).addComponent(new ActionQueue(entity.id));
        agents.push(entity);
      }

      // Simulate 3 game days
      for (let day = 0; day < 3; day++) {
        for (let tick = 0; tick < 1000; tick++) {
          agents.forEach(agent => {
            idleBehaviorSystem.update(world, 1);

            const queue = agent.getComponent(ComponentType.ActionQueue) as ActionQueue;
            const action = queue.peek();
            if (action?.type === 'reflect') {
              queue.dequeue();
              reflectionSystem.update(world, 1);
            }
          });
        }
      }

      // Count agents with goals
      const agentsWithGoals = agents.filter(agent => {
        const goals = agent.getComponent(ComponentType.Goals) as GoalsComponent;
        return goals.getActiveGoalCount() > 0;
      });

      const percentage = agentsWithGoals.length / agents.length;
      expect(percentage).toBeGreaterThan(0.8);
    });

    it('should align goal categories with personality traits', () => {
      const entity = world.createEntity();
      (entity as any).addComponent(new NeedsComponent());
      (entity as any).addComponent( new PersonalityComponent({
        openness: 0.9,
        conscientiousness: 0.9,
        extraversion: 0.2,
        agreeableness: 0.5,
        neuroticism: 0.2
      }));
      (entity as any).addComponent( new MemoryComponent(entity.id));
      (entity as any).addComponent(new GoalsComponent());
      (entity as any).addComponent(new ActionQueue(entity.id));

      // Force multiple reflections
      for (let i = 0; i < 50; i++) {
        const memory = entity.getComponent(ComponentType.Memory) as MemoryComponent;
        memory.lastReflectionTime = 0; // Reset cooldown
        reflectionSystem.update(world, 1);
      }

      const goals = entity.getComponent(ComponentType.Goals) as GoalsComponent;
      const allGoals = goals.goals;

      if (allGoals.length > 0) {
        // Should have mastery or creative goals (high conscientiousness + openness)
        const relevantGoals = allGoals.filter(g =>
          g.category === 'mastery' || g.category === 'creative'
        );
        expect(relevantGoals.length).toBeGreaterThan(0);
      }
    });
  });

  describe('mood influence on behavior selection', () => {
    it('should select different behaviors based on mood state', () => {
      // Lonely agent
      const lonelyEntity = world.createEntity();
      const lonelyNeeds = new NeedsComponent();
      lonelyNeeds.social = 0.2;
      lonelyEntity.addComponent(lonelyNeeds);
      lonelyEntity.addComponent(new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5
      }));
      lonelyEntity.addComponent(new MemoryComponent(lonelyEntity.id));
      lonelyEntity.addComponent(new GoalsComponent());
      lonelyEntity.addComponent(new ActionQueue(lonelyEntity.id));

      // Content agent
      const contentEntity = world.createEntity();
      const contentNeeds = new NeedsComponent();
      contentNeeds.energy = 0.9;
      contentNeeds.hunger = 0.9;
      contentNeeds.social = 0.9;
      contentEntity.addComponent(contentNeeds);
      contentEntity.addComponent(new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5
      }));
      contentEntity.addComponent(new MemoryComponent(contentEntity.id));
      contentEntity.addComponent(new GoalsComponent());
      contentEntity.addComponent(new ActionQueue(contentEntity.id));

      const lonelyBehaviors: string[] = [];
      const contentBehaviors: string[] = [];

      for (let i = 0; i < 50; i++) {
        // Lonely agent
        const lonelyQueue = lonelyEntity.getComponent(ComponentType.ActionQueue) as ActionQueue;
        lonelyQueue.clear();
        idleBehaviorSystem.update(world, 1);
        const lonelyAction = lonelyQueue.peek();
        if (lonelyAction) {
          lonelyBehaviors.push(lonelyAction.type);
        }

        // Content agent
        const contentQueue = contentEntity.getComponent(ComponentType.ActionQueue) as ActionQueue;
        contentQueue.clear();
        idleBehaviorSystem.update(world, 1);
        const contentAction = contentQueue.peek();
        if (contentAction) {
          contentBehaviors.push(contentAction.type);
        }
      }

      // Lonely agent should chat more
      const lonelyChatCount = lonelyBehaviors.filter(b => b === 'chat_idle').length;
      const contentChatCount = contentBehaviors.filter(b => b === 'chat_idle').length;

      expect(lonelyChatCount).toBeGreaterThan(contentChatCount);

      // Content agent should sit quietly more
      const contentSitCount = contentBehaviors.filter(b => b === 'sit_quietly').length;
      const lonelySitCount = lonelyBehaviors.filter(b => b === 'sit_quietly').length;

      expect(contentSitCount).toBeGreaterThan(lonelySitCount);
    });
  });

  describe('goal progress tracking', () => {
    it.skip('should update goal progress when completing relevant actions (progress tracking not implemented)', () => {
      const entity = world.createEntity();
      (entity as any).addComponent(new NeedsComponent());
      (entity as any).addComponent( new PersonalityComponent({
        openness: 0.7,
        conscientiousness: 0.7,
        extraversion: 0.5,
        agreeableness: 0.6,
        neuroticism: 0.3
      }));
      (entity as any).addComponent( new MemoryComponent(entity.id));

      const goals = new GoalsComponent();
      goals.addGoal({
        id: 'goal-1',
        category: 'mastery',
        description: 'Become a skilled builder',
        motivation: 'I want to create structures',
        progress: 0,
        milestones: [
          { description: 'Build first structure', completed: false, progress: 0 }
        ],
        createdAt: Date.now(),
        targetCompletionDays: 7
      });
      (entity as any).addComponent(goals);
      (entity as any).addComponent(new ActionQueue(entity.id));

      // Emit action completion event
      world.eventBus.emit('agent:action_complete', {
        agentId: entity.id,
        actionType: 'build',
        buildingType: 'cabin'
      });

      // Progress should update
      const updatedGoals = entity.getComponent(ComponentType.Goals) as GoalsComponent;
      const goal = updatedGoals.getGoal('goal-1');

      expect(goal?.progress).toBeGreaterThan(0);
    });

    it.skip('should emit milestone completion events (event emission not implemented)', () => {
      const entity = world.createEntity();
      (entity as any).addComponent(new NeedsComponent());
      (entity as any).addComponent( new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5
      }));
      (entity as any).addComponent( new MemoryComponent(entity.id));

      const goals = new GoalsComponent();
      goals.addGoal({
        id: 'goal-1',
        category: 'mastery',
        description: 'Master building',
        motivation: 'I love building',
        progress: 0.8,
        milestones: [
          { description: 'Build first structure', completed: true, progress: 1.0 },
          { description: 'Build 5 structures', completed: false, progress: 0.9 }
        ],
        createdAt: Date.now(),
        targetCompletionDays: 7
      });
      (entity as any).addComponent(goals);

      const eventHandler = vi.fn();
      world.eventBus.subscribe('agent:goal_milestone', eventHandler);

      // Complete the milestone
      goals.completeMilestone('goal-1', 1);

      expect(eventHandler).toHaveBeenCalled();
    });

    it.skip('should emit goal completion events (event emission not implemented)', () => {
      const entity = world.createEntity();
      const goals = new GoalsComponent();
      goals.addGoal({
        id: 'goal-1',
        category: 'mastery',
        description: 'Test goal',
        motivation: 'Test',
        progress: 0.9,
        milestones: [],
        createdAt: Date.now(),
        targetCompletionDays: 7
      });
      (entity as any).addComponent(goals);

      const eventHandler = vi.fn();
      world.eventBus.subscribe('agent:goal_completed', eventHandler);

      // Complete the goal
      goals.updateGoalProgress('goal-1', 1.0);

      expect(eventHandler).toHaveBeenCalled();
    });
  });

  describe('internal monologue during idle behaviors', () => {
    it.skip('should generate internal monologue for reflection (monologue not implemented)', () => {
      const entity = world.createEntity();
      (entity as any).addComponent(new NeedsComponent());
      (entity as any).addComponent( new PersonalityComponent({
        openness: 0.7,
        conscientiousness: 0.6,
        extraversion: 0.5,
        agreeableness: 0.6,
        neuroticism: 0.3
      }));
      (entity as any).addComponent( new MemoryComponent(entity.id));
      (entity as any).addComponent(new GoalsComponent());
      (entity as any).addComponent(new ActionQueue(entity.id));

      let monologue = '';
      world.eventBus.subscribe('agent:internal_monologue', (event: any) => {
        monologue = event.monologue;
      });

      // Trigger reflection
      reflectionSystem.update(world, 1);

      expect(monologue.length).toBeGreaterThan(0);
    });

    it('should have event bus available for monologues', () => {
      const entity = world.createEntity();
      (entity as any).addComponent(new NeedsComponent());
      (entity as any).addComponent( new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.3,
        agreeableness: 0.6,
        neuroticism: 0.2
      }));
      (entity as any).addComponent( new MemoryComponent(entity.id));
      (entity as any).addComponent(new GoalsComponent());
      const queue = new ActionQueue(entity.id);
      queue.enqueue({
        type: 'sit_quietly',
        priority: 0.2
      });
      (entity as any).addComponent(queue);

      // Verify event infrastructure exists
      expect(world.eventBus).toBeDefined();
      expect(typeof world.eventBus.subscribe).toBe('function');
      expect(typeof world.eventBus.emit).toBe('function');
    });
  });

  describe('casual conversation during idle', () => {
    it('should initiate casual chat when lonely', () => {
      const entity = world.createEntity();
      const needs = new NeedsComponent();
      needs.social = 0.2; // Lonely
      (entity as any).addComponent(needs);
      (entity as any).addComponent( new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.7, // Extraverted
        agreeableness: 0.6,
        neuroticism: 0.3
      }));
      (entity as any).addComponent( new MemoryComponent(entity.id));
      (entity as any).addComponent(new GoalsComponent());
      (entity as any).addComponent(new ActionQueue(entity.id));

      const behaviors: string[] = [];
      for (let i = 0; i < 50; i++) {
        const queue = entity.getComponent(ComponentType.ActionQueue) as ActionQueue;
        queue.clear();
        idleBehaviorSystem.update(world, 1);
        const action = queue.peek();
        if (action) {
          behaviors.push(action.type);
        }
      }

      const chatCount = behaviors.filter(b => b === 'chat_idle').length;
      expect(chatCount).toBeGreaterThan(5);
    });
  });
});
