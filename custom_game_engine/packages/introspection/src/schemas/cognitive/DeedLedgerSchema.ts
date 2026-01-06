import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { DeedLedgerComponent } from '@ai-village/core';

/**
 * DeedLedgerSchema - Introspection schema for DeedLedgerComponent
 *
 * Batch 5: Soul & Realms
 * Category: Cognitive/Judgment
 */
export const DeedLedgerSchema = autoRegister(
  defineComponent<DeedLedgerComponent>({
    type: 'deed_ledger',
    version: 1,
    category: 'cognitive',
    description: 'Neutral record of agent actions for afterlife judgment',

    fields: {
      recentDeeds: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: 'Recent deed entries with full detail',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'deeds',
          order: 1,
        },
      },

      lifetimeCounts: {
        type: 'object',
        required: true,
        default: {},
        description: 'Lifetime deed counts by category',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'lifetime',
          order: 2,
        },
      },

      customCounts: {
        type: 'object',
        required: true,
        default: {},
        description: 'Lifetime custom deed counts',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'lifetime',
          order: 3,
        },
      },

      oathsSworn: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Number of oaths sworn',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'oaths',
          order: 4,
        },
      },

      oathsKept: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Number of oaths kept',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'oaths',
          order: 5,
        },
      },

      oathsBroken: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Number of oaths broken',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'oaths',
          order: 6,
        },
      },

      kinSlain: {
        type: 'array',
        itemType: 'string',
        required: true,
        default: [],
        description: 'Entity IDs of kin killed',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'grave',
          order: 7,
        },
      },

      deathCircumstances: {
        type: 'object',
        required: false,
        description: 'How the agent died',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'death',
          order: 8,
        },
      },
    },

    ui: {
      icon: '📜',
      color: '#D2691E',
      priority: 7,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Deed Ledger',
      summarize: (data: DeedLedgerComponent) => {
        const oaths = `${data.oathsKept}/${data.oathsSworn} oaths kept`;
        const broken = data.oathsBroken > 0 ? `, ${data.oathsBroken} broken` : '';
        const kin = data.kinSlain.length > 0 ? ` [${data.kinSlain.length} kin slain]` : '';
        const deedCount = Object.values(data.lifetimeCounts).reduce((sum, count) => sum + count, 0);
        return `${deedCount} deeds recorded, ${oaths}${broken}${kin}`;
      },
    },

    createDefault: (): DeedLedgerComponent => ({
      type: 'deed_ledger',
      version: 1,
      recentDeeds: [],
      maxRecentDeeds: 50,
      lifetimeCounts: {},
      customCounts: {},
      lifetimeMagnitudes: {},
      oathsSworn: 0,
      oathsKept: 0,
      oathsBroken: 0,
      kinSlain: [],
      betrayals: new Map(),
      loyalties: new Map(),
    }),
  })
);
