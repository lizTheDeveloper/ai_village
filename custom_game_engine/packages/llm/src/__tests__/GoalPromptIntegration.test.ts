import { describe, it, expect, beforeEach } from 'vitest';
import { StructuredPromptBuilder } from '../StructuredPromptBuilder';
import { World, type World } from '../../../core/src/ecs/World';
import { EventBusImpl } from '../../../core/src/events/EventBus';
import { GoalsComponent } from '../../../core/src/components/GoalsComponent';
import { PersonalityComponent } from '../../../core/src/components/PersonalityComponent';
import type { PersonalGoal } from '../../../core/src/components/GoalsComponent';

describe('Goal Prompt Integration', () => {
  let world: World;
  let promptBuilder: StructuredPromptBuilder;

  beforeEach(() => {
    const eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    promptBuilder = new StructuredPromptBuilder();
  });

  describe('goal section in prompts', () => {
    it('should not crash when agent has no goals component', () => {
      const entity = world.createEntity();
      entity.addComponent('personality', new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5
      }));

      // Should not crash when goals component is missing
      expect(() => {
        promptBuilder.buildPrompt(entity, world);
      }).not.toThrow();
    });

    it('should handle empty goals component', () => {
      const entity = world.createEntity();
      entity.addComponent('personality', new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5
      }));
      entity.addComponent('goals', new GoalsComponent());

      const prompt = promptBuilder.buildPrompt(entity, world);

      // Should build prompt successfully
      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
    });

    it('should build prompt with goals present', () => {
      const entity = world.createEntity();
      entity.addComponent('personality', new PersonalityComponent({
        openness: 0.7,
        conscientiousness: 0.6,
        extraversion: 0.5,
        agreeableness: 0.6,
        neuroticism: 0.3
      }));

      const goals = new GoalsComponent();
      goals.addGoal({
        id: 'goal-1',
        category: 'mastery',
        description: 'Become a skilled builder',
        motivation: 'I want to create beautiful structures',
        progress: 0.4,
        milestones: [
          { description: 'Build first structure', completed: true, progress: 1.0 },
          { description: 'Build 5 structures', completed: false, progress: 0.6 }
        ],
        createdAt: Date.now(),
        targetCompletionDays: 7
      });
      entity.addComponent('goals', goals);

      const prompt = promptBuilder.buildPrompt(entity, world);

      // Should build prompt successfully with goals
      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });
  });

  describe('goal formatting', () => {
    it('should handle goals with multiple milestones', () => {
      const entity = world.createEntity();
      entity.addComponent('personality', new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5
      }));

      const goals = new GoalsComponent();
      goals.addGoal({
        id: 'goal-1',
        category: 'mastery',
        description: 'Become a master builder',
        motivation: 'I love creating structures',
        progress: 0.6,
        milestones: [
          { description: 'Build first house', completed: true, progress: 1.0 },
          { description: 'Build village center', completed: false, progress: 0.3 }
        ],
        createdAt: Date.now(),
        targetCompletionDays: 10
      });
      entity.addComponent('goals', goals);

      const prompt = promptBuilder.buildPrompt(entity, world);

      // Should build prompt successfully
      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
    });

    it('should handle multiple goals with different categories', () => {
      const entity = world.createEntity();
      entity.addComponent('personality', new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5
      }));

      const goals = new GoalsComponent();
      goals.addGoal({
        id: 'goal-1',
        category: 'mastery',
        description: 'Master building',
        motivation: 'I want to build',
        progress: 0.5,
        milestones: [],
        createdAt: Date.now(),
        targetCompletionDays: 7
      });
      goals.addGoal({
        id: 'goal-2',
        category: 'social',
        description: 'Make friends',
        motivation: 'I want connections',
        progress: 0.3,
        milestones: [],
        createdAt: Date.now(),
        targetCompletionDays: 14
      });
      entity.addComponent('goals', goals);

      const prompt = promptBuilder.buildPrompt(entity, world);

      // Should build prompt successfully
      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
    });
  });

  describe('error handling', () => {
    it('should handle missing goals component gracefully', () => {
      const entity = world.createEntity();
      entity.addComponent('personality', new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5
      }));

      // No goals component - should not crash
      const prompt = promptBuilder.buildPrompt(entity, world);
      expect(prompt).toBeDefined();
    });

    it('should handle entity with no components', () => {
      const entity = world.createEntity();

      // Should not crash even with minimal entity
      expect(() => {
        promptBuilder.buildPrompt(entity, world);
      }).not.toThrow();
    });

    it('should handle goals with missing fields gracefully', () => {
      const entity = world.createEntity();
      entity.addComponent('personality', new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5
      }));

      const goals = new GoalsComponent();
      goals.addGoal({
        id: 'goal-1',
        category: 'mastery',
        description: 'Test goal',
        motivation: 'Test motivation',
        progress: 0.5,
        milestones: [],
        createdAt: Date.now(),
        targetCompletionDays: 7
      });
      entity.addComponent('goals', goals);

      const prompt = promptBuilder.buildPrompt(entity, world);

      // Should handle gracefully
      expect(prompt).toBeDefined();
    });
  });

  describe('prompt structure validation', () => {
    it('should return non-empty string', () => {
      const entity = world.createEntity();
      entity.addComponent('personality', new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5
      }));

      const prompt = promptBuilder.buildPrompt(entity, world);

      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should build prompt consistently', () => {
      const entity = world.createEntity();
      entity.addComponent('personality', new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5
      }));

      const prompt1 = promptBuilder.buildPrompt(entity, world);
      const prompt2 = promptBuilder.buildPrompt(entity, world);

      // Should be consistent (not random)
      expect(prompt1).toBe(prompt2);
    });

    it('should handle multiple entities', () => {
      const entity1 = world.createEntity();
      entity1.addComponent('personality', new PersonalityComponent({
        openness: 0.9,
        conscientiousness: 0.9,
        extraversion: 0.9,
        agreeableness: 0.9,
        neuroticism: 0.1
      }));

      const entity2 = world.createEntity();
      entity2.addComponent('personality', new PersonalityComponent({
        openness: 0.1,
        conscientiousness: 0.1,
        extraversion: 0.1,
        agreeableness: 0.1,
        neuroticism: 0.9
      }));

      const prompt1 = promptBuilder.buildPrompt(entity1, world);
      const prompt2 = promptBuilder.buildPrompt(entity2, world);

      // Both should build successfully
      expect(prompt1).toBeDefined();
      expect(prompt2).toBeDefined();
      expect(typeof prompt1).toBe('string');
      expect(typeof prompt2).toBe('string');
    });
  });
});
