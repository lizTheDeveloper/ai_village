/**
 * Power Component Schema
 *
 * Power generation, consumption, or storage for automation system
 * Phase 4, Batch 4 - Core Gameplay Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { PowerComponent } from '@ai-village/core';

/**
 * Power component schema
 */
export const PowerSchema = autoRegister(
  defineComponent<PowerComponent>({
    type: 'power',
    version: 1,
    category: 'system',

    fields: {
      role: {
        type: 'enum',
        enumValues: ['producer', 'consumer', 'storage'] as const,
        required: true,
        displayName: 'Role',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'power',
          order: 1,
          icon: '⚡',
        },
        mutable: false,
      },

      powerType: {
        type: 'enum',
        enumValues: ['mechanical', 'electrical', 'arcane', 'stellar', 'exotic'] as const,
        required: true,
        displayName: 'Power Type',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'power',
          order: 2,
        },
        mutable: false,
      },

      generation: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 1000000] as const,
        displayName: 'Generation',
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
          order: 10,
          icon: '⚡',
        },
        mutable: true,
      },

      consumption: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 1000000] as const,
        displayName: 'Consumption',
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
          order: 11,
        },
        mutable: true,
      },

      stored: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 1000000] as const,
        displayName: 'Stored',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'storage',
          order: 20,
          icon: '🔋',
        },
        mutable: true,
      },

      capacity: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 1000000] as const,
        displayName: 'Capacity',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'storage',
          order: 21,
        },
        mutable: false,
      },

      isPowered: {
        type: 'boolean',
        required: true,
        default: false,
        displayName: 'Powered',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'stats',
          order: 12,
          icon: '⚡',
        },
        mutable: true,
      },

      efficiency: {
        type: 'number',
        required: true,
        default: 1.0,
        range: [0, 1] as const,
        displayName: 'Efficiency',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'stats',
          order: 13,
        },
        mutable: true,
      },

      connectionRange: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 100] as const,
        displayName: 'Connection Range',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'network',
          order: 30,
        },
        mutable: false,
      },

      priority: {
        type: 'enum',
        enumValues: ['critical', 'high', 'normal', 'low'] as const,
        required: true,
        default: 'normal',
        displayName: 'Priority',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'network',
          order: 31,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '⚡',
      color: '#FFC107',
      priority: 5,
    },

    llm: {
      promptSection: 'infrastructure',
      summarize: (data: PowerComponent) => {
        if (data.role === 'producer') {
          return `${data.powerType} generator: ${data.generation}kW ${data.isPowered ? 'ON' : 'OFF'}`;
        } else if (data.role === 'storage') {
          return `${data.powerType} battery: ${data.stored}/${data.capacity}kWh`;
        } else {
          return `${data.powerType} consumer: ${data.consumption}kW ${data.isPowered ? 'powered' : 'unpowered'}`;
        }
      },
    },

    createDefault: (): PowerComponent => ({
      type: 'power',
      version: 1,
      role: 'consumer',
      powerType: 'mechanical',
      generation: 0,
      consumption: 0,
      stored: 0,
      capacity: 0,
      isPowered: false,
      efficiency: 1.0,
      connectionRange: 0,
      priority: 'normal',
    }),
  })
);
