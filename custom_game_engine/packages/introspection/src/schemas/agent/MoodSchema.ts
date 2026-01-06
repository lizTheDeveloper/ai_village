import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { MoodComponent, EmotionalState } from '@ai-village/core';

/**
 * MoodSchema - Introspection schema for MoodComponent
 *
 * Emotional state tracking with mood factors and history.
 */
export const MoodSchema = autoRegister(
  defineComponent<MoodComponent>({
    type: 'mood',
    version: 1,
    category: 'agent',

    fields: {
      currentMood: {
        type: 'number',
        required: true,
        default: 0,
        range: [-100, 100] as const,
        description: 'Current mood value (-100 to 100)',
        displayName: 'Mood',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'mood',
          order: 1,
        },
      },

      emotionalState: {
        type: 'enum',
        enumValues: [
          'content', 'joyful', 'excited', 'melancholic', 'anxious',
          'nostalgic', 'frustrated', 'lonely', 'proud', 'grateful',
          'grieving', 'enraged', 'despairing', 'manic', 'obsessed', 'terrified'
        ] as const,
        required: true,
        default: 'content',
        description: 'Current emotional state',
        displayName: 'Emotion',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'mood',
          order: 2,
        },
      },

      baselineMood: {
        type: 'number',
        required: true,
        default: 0,
        range: [-100, 100] as const,
        description: 'Baseline mood from personality',
        displayName: 'Baseline',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'config',
          order: 10,
        },
        mutable: true,
      },

      factors: {
        type: 'object',
        required: true,
        default: {
          physical: 0,
          foodSatisfaction: 0,
          foodVariety: 0,
          social: 0,
          comfort: 0,
          rest: 0,
          achievement: 0,
          environment: 0,
        },
        description: 'Mood factors contributing to current state',
        visibility: {
          player: false,
          llm: true,  // LLM should understand what's affecting mood
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'factors',
          order: 3,
        },
      },

      favorites: {
        type: 'array',
        required: true,
        default: [],
        description: 'Favorite food IDs',
        displayName: 'Favorite Foods',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'preferences',
          order: 4,
        },
      },

      comfortFoods: {
        type: 'array',
        required: true,
        default: [],
        description: 'Comfort food IDs',
        displayName: 'Comfort Foods',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'preferences',
          order: 5,
        },
      },
    },

    ui: {
      icon: '😊',
      color: '#FFC107',
      priority: 3,
    },

    llm: {
      promptSection: 'Emotional State',
      summarize: (data: MoodComponent) => {
        const moodLevel =
          data.currentMood > 50 ? 'very happy' :
          data.currentMood > 20 ? 'happy' :
          data.currentMood > -20 ? 'neutral' :
          data.currentMood > -50 ? 'unhappy' : 'very unhappy';

        const stateDescriptions: Record<EmotionalState, string> = {
          content: 'feeling content',
          joyful: 'feeling joyful',
          excited: 'feeling excited',
          melancholic: 'feeling sad',
          anxious: 'feeling anxious',
          nostalgic: 'feeling nostalgic',
          frustrated: 'feeling frustrated',
          lonely: 'feeling lonely',
          proud: 'feeling proud',
          grateful: 'feeling grateful',
          grieving: 'grieving a loss',
          enraged: 'in a violent rage',
          despairing: 'in deep despair',
          manic: 'in a manic state',
          obsessed: 'obsessively focused',
          terrified: 'paralyzed with fear',
        };

        // Find primary factor
        let primaryFactor = 'physical';
        let maxAbsValue = 0;
        for (const [key, value] of Object.entries(data.factors)) {
          if (Math.abs(value) > maxAbsValue) {
            maxAbsValue = Math.abs(value);
            primaryFactor = key;
          }
        }

        return `${moodLevel}, ${stateDescriptions[data.emotionalState]}. Primary factor: ${primaryFactor}`;
      },
      priority: 3,
    },

    validate: (data: unknown): data is MoodComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const comp = data as any;
      return (
        comp.type === 'mood' &&
        typeof comp.currentMood === 'number' &&
        typeof comp.baselineMood === 'number' &&
        typeof comp.emotionalState === 'string' &&
        typeof comp.factors === 'object' &&
        Array.isArray(comp.favorites) &&
        Array.isArray(comp.comfortFoods) &&
        comp.currentMood >= -100 &&
        comp.currentMood <= 100
      );
    },

    createDefault: () => ({
      type: 'mood',
      version: 1,
      currentMood: 0,
      baselineMood: 0,
      factors: {
        physical: 0,
        foodSatisfaction: 0,
        foodVariety: 0,
        social: 0,
        comfort: 0,
        rest: 0,
        achievement: 0,
        environment: 0,
      },
      emotionalState: 'content',
      moodHistory: [],
      recentMeals: [],
      favorites: [],
      comfortFoods: [],
      lastUpdate: 0,
    } as MoodComponent),
  })
);
