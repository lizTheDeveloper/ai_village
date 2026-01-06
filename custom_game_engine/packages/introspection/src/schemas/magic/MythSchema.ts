import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { MythologyComponent } from '@ai-village/core';

export const MythSchema = autoRegister(
  defineComponent<MythologyComponent>({
    type: 'mythology',
    version: 1,
    category: 'magic',
    description: 'Collection of myths about a deity - stories that shape divine identity and spread through communities',

    fields: {
      myths: {
        type: 'array',
        required: true,
        default: [],
        description: 'All myths about this deity',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'Myths',
          order: 1,
        },
      },
      canonicalMyths: {
        type: 'array',
        required: true,
        default: [],
        description: 'Most widely-known myths (IDs)',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'Myths',
          order: 2,
        },
      },
      foundingMyths: {
        type: 'array',
        required: true,
        default: [],
        description: 'Myths that define core identity traits',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'Myths',
          order: 3,
        },
      },
      totalMythsCreated: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Total number of myths ever created',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'Statistics',
          order: 1,
        },
      },
    },

    ui: {
      icon: '📖',
      color: '#8E44AD',
      priority: 6,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Deity Mythology',
      summarize: (data: MythologyComponent) => {
        const totalMyths = data.myths.length;
        const canonical = data.canonicalMyths.length;
        const founding = data.foundingMyths.length;
        return `${totalMyths} myths total (${canonical} canonical, ${founding} founding)`;
      },
    },

    createDefault: (): MythologyComponent => ({
      type: 'mythology',
      version: 1,
      myths: [],
      canonicalMyths: [],
      foundingMyths: [],
      totalMythsCreated: 0,
    }),
  })
);
