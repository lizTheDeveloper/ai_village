/**
 * Passage Component Schema
 *
 * Passage between universes
 * Phase 4, Batch 4 - Core Gameplay Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { PassageComponent } from '@ai-village/core';

/**
 * Passage component schema
 */
export const PassageSchema = autoRegister(
  defineComponent<PassageComponent>({
    type: 'passage',
    version: 1,
    category: 'world',

    fields: {
      passageId: {
        type: 'string',
        required: true,
        displayName: 'Passage ID',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'identity',
          order: 1,
        },
        mutable: false,
      },

      sourceUniverseId: {
        type: 'string',
        required: true,
        displayName: 'Source',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'passage',
          order: 2,
          icon: '🌍',
        },
        mutable: false,
      },

      targetUniverseId: {
        type: 'string',
        required: true,
        displayName: 'Target',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'passage',
          order: 3,
          icon: '🌎',
        },
        mutable: false,
      },

      passageType: {
        type: 'enum',
        enumValues: ['thread', 'bridge', 'gate', 'confluence'] as const,
        required: true,
        displayName: 'Type',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'passage',
          order: 4,
        },
        mutable: false,
      },

      state: {
        type: 'enum',
        enumValues: ['dormant', 'active', 'unstable', 'collapsing'] as const,
        required: true,
        default: 'dormant',
        displayName: 'State',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'state',
          order: 10,
          icon: '⚡',
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
          order: 11,
          icon: '✨',
        },
        mutable: true,
      },

      cooldown: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 10000] as const,
        displayName: 'Cooldown',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'state',
          order: 12,
        },
        mutable: true,
      },

      traversalCount: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 1000000] as const,
        displayName: 'Traversals',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'stats',
          order: 20,
        },
        mutable: true,
      },

      lastTraversal: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Last Traversal',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'stats',
          order: 21,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🌉',
      color: '#673AB7',
      priority: 7,
    },

    llm: {
      promptSection: 'multiverse',
      summarize: (data: PassageComponent) => {
        const stateIcon = data.state === 'active' ? '✅' : data.state === 'unstable' ? '⚠️' : data.state === 'collapsing' ? '🔴' : '⏸️';
        return `${data.passageType} passage ${stateIcon} ${data.sourceUniverseId} → ${data.targetUniverseId} (${data.traversalCount} uses)`;
      },
    },

    createDefault: (): PassageComponent => ({
      type: 'passage',
      version: 1,
      passageId: '',
      sourceUniverseId: '',
      targetUniverseId: '',
      passageType: 'thread',
      state: 'dormant',
      active: true,
      cooldown: 0,
      entitiesInTransit: new Set(),
      traversalCount: 0,
      lastTraversal: 0,
    }),
  })
);
