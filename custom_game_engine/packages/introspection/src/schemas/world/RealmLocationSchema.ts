import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { RealmLocationComponent } from '@ai-village/core';

/**
 * RealmLocationSchema - Introspection schema for RealmLocationComponent
 *
 * Batch 5: Soul & Realms
 * Category: World/Multiverse
 */
export const RealmLocationSchema = autoRegister(
  defineComponent<RealmLocationComponent>({
    type: 'realm_location',
    version: 1,
    category: 'world',

    fields: {
      currentRealmId: {
        type: 'string',
        required: true,
        default: 'mortal_world',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'location',
          order: 1,
        },
      },

      enteredAt: {
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
          group: 'tracking',
          order: 2,
        },
      },

      totalTimeInRealm: {
        type: 'number',
        required: true,
        default: 0,
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'tracking',
          order: 3,
        },
      },

      timeDilation: {
        type: 'number',
        required: true,
        default: 1.0,
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'effects',
          order: 4,
        },
      },

      canExit: {
        type: 'boolean',
        required: true,
        default: true,
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'permissions',
          order: 5,
        },
      },

      exitPortalId: {
        type: 'string',
        required: false,
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'tracking',
          order: 6,
        },
      },

      transformations: {
        type: 'array',
        itemType: 'string',
        required: true,
        default: [],
        visibility: {
          player: true,
          llm: 'summarized',
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'effects',
          order: 7,
        },
      },
    },

    ui: {
      icon: '🌐',
      color: '#8E44AD',
      priority: 6,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Realm Location',
      summarize: (data: RealmLocationComponent) => {
        const realm = data.currentRealmId;
        const dilation = data.timeDilation !== 1.0 ? ` (time×${data.timeDilation})` : '';
        const transforms = data.transformations.length > 0 ? ` [${data.transformations.join(', ')}]` : '';
        return `In realm: ${realm}${dilation}${transforms}`;
      },
    },

    createDefault: (): RealmLocationComponent => ({
      type: 'realm_location',
      version: 1,
      currentRealmId: 'mortal_world',
      enteredAt: 0,
      totalTimeInRealm: 0,
      timeDilation: 1.0,
      canExit: true,
      transformations: [],
    }),
  })
);
