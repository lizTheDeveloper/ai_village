import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { GoalsComponent } from '@ai-village/core';

/**
 * GoalsSchema - Introspection schema for GoalsComponent
 *
 * Tier 5: Cognitive components
 * Complexity: Large (nested goal objects with milestones)
 */
export const GoalsSchema = autoRegister(
  defineComponent<GoalsComponent>({
    type: 'goals',
    version: 1,
    category: 'cognitive',

    fields: {
      goals: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: 'Personal goals with progress tracking (max 5)',
        visibility: {
          player: true,  // Players should see agent goals
          llm: true,  // LLM needs to know goals for decision making
          agent: true,  // Agents know their own goals
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',  // Complex nested structure
          group: 'goals',
          order: 1,
          icon: '🎯',
        },
      },
    },

    ui: {
      icon: '🎯',
      color: '#FF9800',
      priority: 4,
    },

    llm: {
      promptSection: 'Goals',
      summarize: (data: GoalsComponent) => {
        const activeGoals = data.goals.filter(g => !g.completed);

        if (activeGoals.length === 0) {
          return 'No active goals.';
        }

        return activeGoals
          .map(goal => {
            const progress = Math.round(goal.progress * 100);
            const milestones = goal.milestones
              .filter(m => m.completed).length;
            const totalMilestones = goal.milestones.length;

            return `${goal.description} (${progress}%, ${milestones}/${totalMilestones} milestones)`;
          })
          .join('; ');
      },
    },

    validate: (data: unknown): data is GoalsComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const comp = data as any;
      return Array.isArray(comp.goals);
    },

    createDefault: () => ({
      type: 'goals',
      version: 1,
      goals: [],
      addGoal: () => {},
      getGoal: () => undefined,
      getGoalsByCategory: () => [],
      getActiveGoals: () => [],
      getActiveGoalCount: () => 0,
      canAddGoal: () => true,
      updateGoalProgress: () => {},
      updateMilestoneProgress: () => {},
      completeMilestone: () => {},
      removeGoal: () => {},
      toJSON: () => ({ goals: [] }),
      fromJSON: () => {},
    } as unknown as GoalsComponent),
  })
);
