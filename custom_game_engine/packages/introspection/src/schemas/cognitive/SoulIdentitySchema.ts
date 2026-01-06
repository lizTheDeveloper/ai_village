import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { SoulIdentityComponent } from '@ai-village/core';

/**
 * SoulIdentitySchema - Introspection schema for SoulIdentityComponent
 *
 * Batch 5: Soul & Realms
 * Category: Cognitive/Soul
 */
export const SoulIdentitySchema = autoRegister(
  defineComponent<SoulIdentityComponent>({
    type: 'soul_identity',
    version: 1,
    category: 'cognitive',
    description: 'Core essence and purpose of a soul across incarnations',

    fields: {
      soulName: {
        type: 'string',
        required: true,
        description: 'Unique soul name, persistent across incarnations',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'identity',
          order: 1,
        },
      },

      soulOriginCulture: {
        type: 'string',
        required: true,
        description: 'Culture/species of soul origin',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'identity',
          order: 2,
        },
      },

      soulOriginSpecies: {
        type: 'string',
        required: true,
        description: 'Species of first incarnation body',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'identity',
          order: 3,
        },
      },

      isReincarnated: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Is this soul reincarnated (vs newly created)',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'history',
          order: 4,
        },
      },

      incarnationHistory: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: 'History of all incarnations',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'history',
          order: 5,
        },
      },

      purpose: {
        type: 'string',
        required: true,
        description: 'Soul fundamental purpose (LLM-generated)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'destiny',
          order: 6,
        },
      },

      destiny: {
        type: 'string',
        required: false,
        description: 'Soul potential destiny',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'destiny',
          order: 7,
        },
      },

      coreInterests: {
        type: 'array',
        itemType: 'string',
        required: true,
        default: [],
        description: 'Core interests born into the soul',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'nature',
          order: 8,
        },
      },

      cosmicAlignment: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Cosmic luck/curse modifier (-1 to 1)',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'nature',
          order: 9,
        },
      },

      archetype: {
        type: 'string',
        required: false,
        description: 'Soul archetype (seeker, protector, creator, etc.)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'identity',
          order: 10,
        },
      },

      purposeFulfilled: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Has this soul achieved its purpose?',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'destiny',
          order: 11,
        },
      },

      destinyRealized: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Has destiny been realized?',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'destiny',
          order: 12,
        },
      },
    },

    ui: {
      icon: '✨',
      color: '#FFD700',
      priority: 9,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Soul Identity',
      summarize: (data: SoulIdentityComponent) => {
        const lives = data.incarnationHistory.length;
        const archetype = data.archetype ? `${data.archetype} ` : '';
        const fulfilled = data.purposeFulfilled ? ' [Purpose fulfilled]' : '';
        return `${data.soulName}, ${archetype}soul (${lives} lives)${fulfilled}: "${data.purpose}"`;
      },
    },

    createDefault: (): SoulIdentityComponent => ({
      type: 'soul_identity',
      version: 1,
      soulName: 'Unknown Soul',
      soulOriginCulture: 'human',
      soulOriginSpecies: 'human',
      isReincarnated: false,
      incarnationHistory: [],
      purpose: 'To discover their purpose',
      coreInterests: [],
      cosmicAlignment: 0,
      soulBirthTick: 0,
      purposeFulfilled: false,
      destinyRealized: false,
      alignment: {
        order: 0,
        altruism: 0,
        tradition: 0,
      },
    }),
  })
);
