import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { SoulCreationEventComponent } from '@ai-village/core';

/**
 * SoulCreationEventSchema - Introspection schema for SoulCreationEventComponent
 *
 * Batch 5: Soul & Realms
 * Category: Cognitive/Soul
 */
export const SoulCreationEventSchema = autoRegister(
  defineComponent<SoulCreationEventComponent>({
    type: 'soul_creation_event',
    version: 1,
    category: 'cognitive',
    description: 'Records narrative of soul creation by the Three Fates',

    fields: {
      creationDebate: {
        type: 'object',
        required: true,
        description: 'Complete debate/ceremony of soul creation',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'creation',
          order: 1,
        },
      },

      wovenPurpose: {
        type: 'string',
        required: true,
        default: '',
        description: 'Purpose woven by the Weaver',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'fates',
          order: 2,
        },
      },

      spunInterests: {
        type: 'array',
        itemType: 'string',
        required: true,
        default: [],
        description: 'Interests spun by the Spinner',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'fates',
          order: 3,
        },
      },

      cutDestiny: {
        type: 'string',
        required: false,
        description: 'Destiny cut by the Cutter',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'fates',
          order: 4,
        },
      },

      creationType: {
        type: 'string',
        required: true,
        default: 'common',
        description: 'Type of soul creation (common, blessed, cursed, prophesied, reforged)',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'type',
          order: 5,
        },
      },

      assignedArchetype: {
        type: 'string',
        required: true,
        description: 'Archetype assigned during creation',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'type',
          order: 6,
        },
      },

      blessings: {
        type: 'array',
        itemType: 'string',
        required: false,
        description: 'Blessings from the Fates',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'gifts',
          order: 7,
        },
      },

      curses: {
        type: 'array',
        itemType: 'string',
        required: false,
        description: 'Curses from the Fates',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'gifts',
          order: 8,
        },
      },

      creationMetaphor: {
        type: 'string',
        required: false,
        description: 'Visual metaphor used during creation',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'narrative',
          order: 9,
        },
      },

      isObservable: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Can this event be observed?',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'meta',
          order: 10,
        },
      },
    },

    ui: {
      icon: '✂️',
      color: '#8B4789',
      priority: 7,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Soul Creation',
      summarize: (data: SoulCreationEventComponent) => {
        const type = data.creationType;
        const archetype = data.assignedArchetype;
        const blessings = data.blessings?.length ?? 0;
        const curses = data.curses?.length ?? 0;
        return `${type} ${archetype} soul, ${blessings} blessings, ${curses} curses: "${data.wovenPurpose}"`;
      },
    },

    createDefault: (): SoulCreationEventComponent => ({
      type: 'soul_creation_event',
      version: 1,
      creationDebate: {
        statements: [],
        context: {
          cosmicAlignment: 0,
          creationRealm: 'tapestry_of_fate',
        },
        debateStartTick: 0,
        creationCompleteTick: 0,
        unanimous: true,
      },
      wovenPurpose: '',
      spunInterests: [],
      assignedArchetype: 'wanderer',
      creationType: 'common',
      isObservable: true,
    }),
  })
);
