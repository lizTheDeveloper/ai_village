import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { RealmComponent } from '@ai-village/core';

/**
 * RealmSchema - Introspection schema for RealmComponent
 *
 * Batch 5: Soul & Realms
 * Category: World/Multiverse
 */
export const RealmSchema = autoRegister(
  defineComponent<RealmComponent>({
    type: 'realm',
    version: 1,
    category: 'world',

    fields: {
      properties: {
        type: 'object',
        required: true,
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'properties',
          order: 1,
        },
      },

      active: {
        type: 'boolean',
        required: true,
        default: true,
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'state',
          order: 2,
        },
      },

      currentTick: {
        type: 'number',
        required: true,
        default: 0,
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'state',
          order: 3,
        },
      },

      timeSinceCreation: {
        type: 'number',
        required: true,
        default: 0,
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'state',
          order: 4,
        },
      },

      attentionReserve: {
        type: 'number',
        required: true,
        default: 100000,
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'state',
          order: 5,
        },
      },

      inhabitants: {
        type: 'array',
        itemType: 'string',
        required: true,
        default: [],
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'inhabitants',
          order: 6,
        },
      },
    },

    ui: {
      icon: '🌌',
      color: '#6A0DAD',
      priority: 8,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Realm',
      summarize: (data: RealmComponent) => {
        const props = data.properties as unknown as Record<string, unknown>;
        const realmType = (props?.realmType as string) ?? 'unknown';
        const count = data.inhabitants.length;
        const active = data.active ? 'active' : 'inactive';
        return `Realm: ${realmType} (${active}, ${count} inhabitants)`;
      },
    },

    createDefault: (): RealmComponent => ({
      type: 'realm',
      version: 1,
      properties: {
        realmType: 'mortal_world',
        timeDilation: 1.0,
      },
      active: true,
      currentTick: 0,
      timeSinceCreation: 0,
      attentionReserve: 100000,
      inhabitants: [],
    }),
  })
);
