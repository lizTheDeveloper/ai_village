import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { SoulWisdomComponent } from '@ai-village/core';

/**
 * SoulWisdomSchema - Introspection schema for SoulWisdomComponent
 *
 * Batch 5: Soul & Realms
 * Category: Cognitive/Soul
 */
export const SoulWisdomSchema = autoRegister(
  defineComponent<SoulWisdomComponent>({
    type: 'soul_wisdom',
    version: 1,
    category: 'cognitive',
    description: 'Soul wisdom accumulated across reincarnations',

    fields: {
      reincarnationCount: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Number of times this soul has reincarnated',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'history',
          order: 1,
        },
      },

      wisdomLevel: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Total accumulated wisdom (0-1)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'wisdom',
          order: 2,
        },
      },

      wisdomModifier: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Applied wisdom bonus to learning/decisions (0-1)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'wisdom',
          order: 3,
        },
      },

      ascensionEligible: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Is soul eligible for ascension to angelhood?',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'ascension',
          order: 4,
        },
      },

      firstIncarnationTick: {
        type: 'number',
        required: true,
        description: 'Soul birth tick',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'history',
          order: 5,
        },
      },

      lastDeathTick: {
        type: 'number',
        required: false,
        description: 'Most recent death tick',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'history',
          order: 6,
        },
      },

      livesLived: {
        type: 'number',
        required: true,
        default: 1,
        description: 'Total lives lived (includes current)',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'history',
          order: 7,
        },
      },

      peakSkills: {
        type: 'object',
        required: false,
        description: 'Highest skill levels achieved across all lives',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'talent',
          order: 8,
        },
      },

      totalEmotionalIntensity: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Total emotional experiences across all lives',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'wisdom',
          order: 9,
        },
      },
    },

    ui: {
      icon: '🌟',
      color: '#DAA520',
      priority: 8,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Soul Wisdom',
      summarize: (data: SoulWisdomComponent) => {
        const level = (data.wisdomLevel * 100).toFixed(0);
        const lives = data.livesLived;
        const modifier = (data.wisdomModifier * 100).toFixed(0);
        const eligible = data.ascensionEligible ? ' [Ascension ready]' : '';
        return `Wisdom: ${level}% (${lives} lives, +${modifier}% bonus)${eligible}`;
      },
    },

    createDefault: (): SoulWisdomComponent => ({
      type: 'soul_wisdom',
      version: 1,
      reincarnationCount: 0,
      wisdomLevel: 0.0,
      wisdomModifier: 0.0,
      ascensionEligible: false,
      firstIncarnationTick: 0,
      livesLived: 1,
      totalEmotionalIntensity: 0,
    }),
  })
);
