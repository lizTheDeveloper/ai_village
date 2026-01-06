import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { HiveCombatComponent } from '@ai-village/core';

export const HiveCombatSchema = autoRegister(
  defineComponent<HiveCombatComponent>({
    type: 'hive_combat',
    version: 1,
    category: 'agent',
    description: 'Hive warfare coordination for species with queen and expendable workers',

    fields: {
      hiveId: {
        type: 'string',
        required: true,
        description: 'Hive identifier',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'Hive',
          order: 1,
        },
      },
      queen: {
        type: 'string',
        required: true,
        description: 'Queen entity ID',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'Hive',
          order: 2,
        },
      },
      workers: {
        type: 'array',
        required: true,
        default: [],
        description: 'Worker entity IDs',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'Hive',
          order: 3,
        },
      },
      objective: {
        type: 'string',
        required: false,
        description: 'Current combat objective',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'Combat',
          order: 1,
        },
      },
      queenDead: {
        type: 'boolean',
        required: false,
        default: false,
        description: 'Whether queen is dead',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'Status',
          order: 1,
        },
      },
      collapseTriggered: {
        type: 'boolean',
        required: false,
        default: false,
        description: 'Whether collapse has been triggered',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'Status',
          order: 2,
        },
      },
    },

    ui: {
      icon: '🐝',
      color: '#F39C12',
      priority: 5,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Hive Combat',
      summarize: (data: HiveCombatComponent) => {
        const workerCount = data.workers.length;
        const status = data.queenDead ? 'queen dead' : data.collapseTriggered ? 'collapsing' : 'active';
        return `Hive ${data.hiveId}: ${workerCount} workers, ${status}`;
      },
    },

    createDefault: (): HiveCombatComponent => ({
      type: 'hive_combat',
      version: 1,
      hiveId: crypto.randomUUID(),
      queen: '',
      workers: [],
      queenDead: false,
      collapseTriggered: false,
    }),
  })
);
