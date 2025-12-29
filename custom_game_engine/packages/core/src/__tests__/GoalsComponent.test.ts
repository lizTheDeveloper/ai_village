import { describe, it, expect, beforeEach } from 'vitest';
import { GoalsComponent } from '../components/GoalsComponent';
import type { PersonalGoal, GoalCategory, GoalMilestone } from '../components/GoalsComponent';

describe('GoalsComponent', () => {
  let component: GoalsComponent;

  beforeEach(() => {
    component = new GoalsComponent();
  });

  describe('component type', () => {
    it('should use lowercase type name', () => {
      expect(component.type).toBe('goals');
    });
  });

  describe('goal creation', () => {
    it('should add a new goal', () => {
      const goal: PersonalGoal = {
        id: 'goal-1',
        category: 'mastery',
        description: 'Become a skilled builder',
        motivation: 'I want to create beautiful structures',
        progress: 0,
        milestones: [
          { description: 'Build first structure', completed: false, progress: 0 }
        ],
        createdAt: Date.now(),
        targetCompletionDays: 7
      };

      component.addGoal(goal);

      expect(component.goals).toHaveLength(1);
      expect(component.goals[0]).toEqual(goal);
    });

    it('should not allow more than 5 goals', () => {
      for (let i = 0; i < 5; i++) {
        component.addGoal({
          id: `goal-${i}`,
          category: 'mastery',
          description: `Goal ${i}`,
          motivation: 'Test',
          progress: 0,
          milestones: [],
          createdAt: Date.now(),
          targetCompletionDays: 7
        });
      }

      expect(() => {
        component.addGoal({
          id: 'goal-6',
          category: 'mastery',
          description: 'Too many goals',
          motivation: 'Test',
          progress: 0,
          milestones: [],
          createdAt: Date.now(),
          targetCompletionDays: 7
        });
      }).toThrow('Cannot add more than 5 goals');
    });

    it('should throw when adding goal with missing required fields', () => {
      expect(() => {
        component.addGoal({} as PersonalGoal);
      }).toThrow('missing required field');
    });

    it('should throw when category is invalid', () => {
      expect(() => {
        component.addGoal({
          id: 'goal-1',
          category: 'invalid' as GoalCategory,
          description: 'Test',
          motivation: 'Test',
          progress: 0,
          milestones: [],
          createdAt: Date.now(),
          targetCompletionDays: 7
        });
      }).toThrow('Invalid goal category');
    });
  });

  describe('goal progress tracking', () => {
    beforeEach(() => {
      component.addGoal({
        id: 'goal-1',
        category: 'mastery',
        description: 'Become a skilled builder',
        motivation: 'I want to create beautiful structures',
        progress: 0,
        milestones: [
          { description: 'Build first structure', completed: false, progress: 0 },
          { description: 'Build 5 structures', completed: false, progress: 0 }
        ],
        createdAt: Date.now(),
        targetCompletionDays: 7
      });
    });

    it('should update goal progress', () => {
      component.updateGoalProgress('goal-1', 0.5);

      const goal = component.getGoal('goal-1');
      expect(goal?.progress).toBe(0.5);
    });

    it('should throw when updating non-existent goal', () => {
      expect(() => {
        component.updateGoalProgress('nonexistent', 0.5);
      }).toThrow('Goal not found');
    });

    it('should complete milestone when progress threshold reached', () => {
      component.completeMilestone('goal-1', 0);

      const goal = component.getGoal('goal-1');
      expect(goal?.milestones[0].completed).toBe(true);
    });

    it('should update milestone progress', () => {
      component.updateMilestoneProgress('goal-1', 0, 0.3);

      const goal = component.getGoal('goal-1');
      expect(goal?.milestones[0].progress).toBe(0.3);
    });
  });

  describe('goal completion', () => {
    it('should mark goal as completed when progress reaches 1.0', () => {
      component.addGoal({
        id: 'goal-1',
        category: 'mastery',
        description: 'Test goal',
        motivation: 'Test',
        progress: 0,
        milestones: [],
        createdAt: Date.now(),
        targetCompletionDays: 7
      });

      component.updateGoalProgress('goal-1', 1.0);

      const goal = component.getGoal('goal-1');
      expect(goal?.completed).toBe(true);
      expect(goal?.completedAt).toBeDefined();
    });

    it('should allow removing completed goals', () => {
      component.addGoal({
        id: 'goal-1',
        category: 'mastery',
        description: 'Test goal',
        motivation: 'Test',
        progress: 1.0,
        completed: true,
        completedAt: Date.now(),
        milestones: [],
        createdAt: Date.now(),
        targetCompletionDays: 7
      });

      component.removeGoal('goal-1');

      expect(component.goals).toHaveLength(0);
    });
  });

  describe('goal queries', () => {
    beforeEach(() => {
      component.addGoal({
        id: 'goal-1',
        category: 'mastery',
        description: 'Build things',
        motivation: 'Test',
        progress: 0.3,
        milestones: [],
        createdAt: Date.now(),
        targetCompletionDays: 7
      });
      component.addGoal({
        id: 'goal-2',
        category: 'social',
        description: 'Make friends',
        motivation: 'Test',
        progress: 0.8,
        milestones: [],
        createdAt: Date.now(),
        targetCompletionDays: 7
      });
    });

    it('should get goals by category', () => {
      const masteryGoals = component.getGoalsByCategory('mastery');
      expect(masteryGoals).toHaveLength(1);
      expect(masteryGoals[0].description).toBe('Build things');
    });

    it('should get active goals only', () => {
      component.addGoal({
        id: 'goal-3',
        category: 'mastery',
        description: 'Completed goal',
        motivation: 'Test',
        progress: 1.0,
        completed: true,
        completedAt: Date.now(),
        milestones: [],
        createdAt: Date.now(),
        targetCompletionDays: 7
      });

      const activeGoals = component.getActiveGoals();
      expect(activeGoals).toHaveLength(2);
    });

    it('should count active goals', () => {
      expect(component.getActiveGoalCount()).toBe(2);
    });

    it('should check if can add more goals', () => {
      expect(component.canAddGoal()).toBe(true);

      // Add 3 more to reach limit
      for (let i = 3; i <= 5; i++) {
        component.addGoal({
          id: `goal-${i}`,
          category: 'mastery',
          description: `Goal ${i}`,
          motivation: 'Test',
          progress: 0,
          milestones: [],
          createdAt: Date.now(),
          targetCompletionDays: 7
        });
      }

      expect(component.canAddGoal()).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      component.addGoal({
        id: 'goal-1',
        category: 'mastery',
        description: 'Test goal',
        motivation: 'Test motivation',
        progress: 0.5,
        milestones: [
          { description: 'Milestone 1', completed: true, progress: 1.0 }
        ],
        createdAt: Date.now(),
        targetCompletionDays: 7
      });

      const json = component.toJSON();
      expect(json.goals).toHaveLength(1);
      expect(json.goals[0].description).toBe('Test goal');
    });

    it('should restore from JSON', () => {
      const data = {
        goals: [
          {
            id: 'goal-1',
            category: 'mastery' as GoalCategory,
            description: 'Test goal',
            motivation: 'Test motivation',
            progress: 0.5,
            milestones: [],
            createdAt: Date.now(),
            targetCompletionDays: 7
          }
        ]
      };

      component.fromJSON(data);

      expect(component.goals).toHaveLength(1);
      expect(component.getGoal('goal-1')).toBeDefined();
    });
  });
});
