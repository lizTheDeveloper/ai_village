/**
 * Portal Component Schema
 *
 * Portal to a realm
 * Phase 4, Batch 4 - Core Gameplay Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { PortalComponent } from '@ai-village/core';

/**
 * Portal component schema
 */
export const PortalSchema = autoRegister(
  defineComponent<PortalComponent>({
    type: 'portal',
    version: 1,
    category: 'world',

    fields: {
      targetRealmId: {
        type: 'string',
        required: true,
        displayName: 'Target Realm',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'portal',
          order: 1,
          icon: '🌀',
        },
        mutable: false,
      },

      accessMethod: {
        type: 'enum',
        enumValues: ['portal', 'death', 'dream', 'meditation', 'ritual', 'item'] as const,
        required: true,
        default: 'portal',
        displayName: 'Access Method',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'portal',
          order: 2,
        },
        mutable: false,
      },

      bidirectional: {
        type: 'boolean',
        required: true,
        default: false,
        displayName: 'Bidirectional',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'portal',
          order: 3,
        },
        mutable: true,
      },

      exitRealmId: {
        type: 'string',
        required: false,
        displayName: 'Exit Realm',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'portal',
          order: 4,
        },
        mutable: true,
      },

      active: {
        type: 'boolean',
        required: true,
        default: true,
        displayName: 'Active',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'state',
          order: 10,
          icon: '✨',
        },
        mutable: true,
      },

      usesRemaining: {
        type: 'number',
        required: false,
        range: [0, 1000] as const,
        displayName: 'Uses Remaining',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'state',
          order: 11,
        },
        mutable: true,
      },

      visualEffect: {
        type: 'string',
        required: true,
        default: 'swirling_energy',
        displayName: 'Visual Effect',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'appearance',
          order: 20,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🌀',
      color: '#00BCD4',
      priority: 6,
    },

    llm: {
      promptSection: 'world_features',
      summarize: (data: PortalComponent) => {
        const bidir = data.bidirectional ? ' (2-way)' : '';
        const uses = data.usesRemaining !== undefined ? ` [${data.usesRemaining} uses]` : '';
        const state = data.active ? 'active' : 'inactive';
        return `portal to ${data.targetRealmId} (${data.accessMethod}) ${state}${bidir}${uses}`;
      },
    },

    createDefault: (): PortalComponent => ({
      type: 'portal',
      version: 1,
      targetRealmId: '',
      accessMethod: 'portal',
      bidirectional: false,
      active: true,
      visualEffect: 'swirling_energy',
    }),
  })
);
