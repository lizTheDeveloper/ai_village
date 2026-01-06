/**
 * PlayerControl Component Schema
 *
 * Tracks player possession state
 * Phase 4, Batch 4 - Core Gameplay Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { PlayerControlComponent } from '@ai-village/core';

/**
 * PlayerControl component schema
 */
export const PlayerControlSchema = autoRegister(
  defineComponent<PlayerControlComponent>({
    type: 'player_control',
    version: 1,
    category: 'system',

    fields: {
      isPossessed: {
        type: 'boolean',
        required: true,
        default: false,
        displayName: 'Possessed',
        visibility: {
          player: true,
          llm: false,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'possession',
          order: 1,
          icon: '👤',
        },
        mutable: true,
      },

      possessedAgentId: {
        type: 'string',
        required: false,
        displayName: 'Possessed Agent',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'possession',
          order: 2,
        },
        mutable: true,
      },

      possessionStartTick: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Start Tick',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'possession',
          order: 3,
        },
        mutable: true,
      },

      beliefCostPerTick: {
        type: 'number',
        required: true,
        default: 0.1,
        range: [0, 100] as const,
        displayName: 'Belief Cost/Tick',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'costs',
          order: 10,
          icon: '✨',
        },
        mutable: true,
      },

      totalBeliefSpent: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 1000000] as const,
        displayName: 'Total Spent',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'costs',
          order: 11,
        },
        mutable: true,
      },

      inputMode: {
        type: 'enum',
        enumValues: ['god', 'possessed'] as const,
        required: true,
        default: 'god',
        displayName: 'Input Mode',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'input',
          order: 20,
        },
        mutable: true,
      },

      lastInputTick: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Last Input',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'input',
          order: 21,
        },
        mutable: true,
      },

      deityUniverseId: {
        type: 'string',
        required: false,
        displayName: 'Deity Universe',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'multiverse',
          order: 30,
        },
        mutable: false,
      },

      deityMultiverseId: {
        type: 'string',
        required: false,
        displayName: 'Deity Multiverse',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'multiverse',
          order: 31,
        },
        mutable: false,
      },

      possessedUniverseId: {
        type: 'string',
        required: false,
        displayName: 'Possessed Universe',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'multiverse',
          order: 32,
        },
        mutable: true,
      },

      possessedMultiverseId: {
        type: 'string',
        required: false,
        displayName: 'Possessed Multiverse',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'multiverse',
          order: 33,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '👤',
      color: '#FF5722',
      priority: 1,
    },

    llm: {
      promptSection: 'player',
      summarize: (data: PlayerControlComponent) => {
        if (!data.isPossessed) return 'god mode (no possession)';
        const cost = `cost: ${data.beliefCostPerTick}/tick (total: ${data.totalBeliefSpent})`;
        return `possessing ${data.possessedAgentId} - ${cost}`;
      },
    },

    createDefault: (): PlayerControlComponent => ({
      type: 'player_control',
      version: 1,
      isPossessed: false,
      possessedAgentId: null,
      possessionStartTick: 0,
      beliefCostPerTick: 0.1,
      totalBeliefSpent: 0,
      inputMode: 'god',
      lastInputTick: 0,
      movementCommand: null,
      pendingInteraction: null,
    }),
  })
);
