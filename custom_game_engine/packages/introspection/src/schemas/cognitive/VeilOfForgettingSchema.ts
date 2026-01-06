import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { VeilOfForgettingComponent } from '@ai-village/core';

/**
 * VeilOfForgettingSchema - Introspection schema for VeilOfForgettingComponent
 *
 * Batch 5: Soul & Realms
 * Category: Cognitive/Soul
 */
export const VeilOfForgettingSchema = autoRegister(
  defineComponent<VeilOfForgettingComponent>({
    type: 'veil_of_forgetting',
    version: 1,
    category: 'cognitive',
    description: 'Manages past-life memory bleed-through',

    fields: {
      bleedThroughs: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: 'Past-life memories that have bled through the veil',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'memories',
          order: 1,
        },
      },

      triggerSensitivity: {
        type: 'object',
        required: true,
        description: 'Probability modifiers for different trigger types',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'sensitivity',
          order: 2,
        },
      },

      pastLivesCount: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Number of past lives this soul has lived',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'reincarnation',
          order: 3,
        },
      },

      isAwareOfReincarnation: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Does the agent know they are experiencing past-life memories?',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'awareness',
          order: 4,
        },
      },
    },

    ui: {
      icon: '🌫️',
      color: '#B0C4DE',
      priority: 7,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Past-Life Memories',
      summarize: (data: VeilOfForgettingComponent) => {
        const count = data.bleedThroughs.length;
        const lives = data.pastLivesCount;
        const aware = data.isAwareOfReincarnation ? ' (aware)' : '';
        if (count === 0) return `${lives} past lives, no memories yet${aware}`;
        return `${lives} past lives, ${count} memory bleeds${aware}`;
      },
    },

    createDefault: (): VeilOfForgettingComponent => ({
      type: 'veil_of_forgetting',
      version: 1,
      bleedThroughs: [],
      triggerSensitivity: {
        location_from_past_life: 0.3,
        person_from_past_life: 0.5,
        similar_emotional_event: 0.2,
        dreams: 0.25,
        meditation: 0.15,
        near_death: 0.8,
        random: 0.01,
      },
      pastLivesCount: 0,
      isAwareOfReincarnation: false,
    }),
  })
);
