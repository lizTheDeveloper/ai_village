import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { SoulLinkComponent } from '@ai-village/core';

/**
 * SoulLinkSchema - Introspection schema for SoulLinkComponent
 *
 * Batch 5: Soul & Realms
 * Category: Cognitive/Soul
 */
export const SoulLinkSchema = autoRegister(
  defineComponent<SoulLinkComponent>({
    type: 'soul_link',
    version: 1,
    category: 'cognitive',
    description: 'Links an agent body to its soul entity',

    fields: {
      soulEntityId: {
        type: 'string',
        required: true,
        description: 'Entity ID of the soul controlling this body',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'link',
          order: 1,
        },
      },

      linkStrength: {
        type: 'number',
        required: true,
        default: 1.0,
        description: 'Soul-body connection strength (0-1)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'connection',
          order: 2,
        },
      },

      isPrimaryIncarnation: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Is this the soul primary incarnation?',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'incarnation',
          order: 3,
        },
      },

      canSeverWithoutDeath: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Can link be severed without death (astral projection)?',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'capabilities',
          order: 4,
        },
      },

      linkFormedTick: {
        type: 'number',
        required: true,
        description: 'When soul-body link was formed',
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

      soulInfluence: {
        type: 'number',
        required: true,
        default: 0.5,
        description: 'Soul influence on body decisions (0-1)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'connection',
          order: 6,
        },
      },

      memoryTransferRate: {
        type: 'number',
        required: true,
        default: 1.0,
        description: 'How much soul remembers from this life (0-1)',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'memory',
          order: 7,
        },
      },

      isAstralProjecting: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Is soul currently in astral projection?',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'state',
          order: 8,
        },
      },

      phylacteryId: {
        type: 'string',
        required: false,
        description: 'Phylactery entity ID if lich',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'lich',
          order: 9,
        },
      },
    },

    ui: {
      icon: '🔗',
      color: '#4169E1',
      priority: 8,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Soul-Body Link',
      summarize: (data: SoulLinkComponent) => {
        const strength = (data.linkStrength * 100).toFixed(0);
        const influence = data.soulInfluence >= 0.6 ? 'strong soul influence' : 'body-dominated';
        const astral = data.isAstralProjecting ? ' [astral projecting]' : '';
        const lich = data.phylacteryId ? ' [lich]' : '';
        return `Link: ${strength}%, ${influence}${astral}${lich}`;
      },
    },

    createDefault: (): SoulLinkComponent => ({
      type: 'soul_link',
      version: 1,
      soulEntityId: '',
      linkStrength: 1.0,
      isPrimaryIncarnation: true,
      canSeverWithoutDeath: false,
      linkFormedTick: 0,
      soulInfluence: 0.5,
      memoryTransferRate: 1.0,
      isAstralProjecting: false,
    }),
  })
);
