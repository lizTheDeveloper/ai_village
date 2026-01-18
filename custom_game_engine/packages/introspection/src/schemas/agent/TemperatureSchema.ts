/**
 * Temperature Component Schema
 *
 * Temperature effects on agents (comfort, tolerance, state)
 * Phase 4, Tier 2 - Agent Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { Component } from '@ai-village/core';

/**
 * Temperature state enum
 */
export type TemperatureState = 'comfortable' | 'cold' | 'hot' | 'dangerously_cold' | 'dangerously_hot';

/**
 * Temperature component type
 * Matches: packages/core/src/components/TemperatureComponent.ts
 */
export interface TemperatureComponent extends Component {
  type: 'temperature';
  version: 1;
  currentTemp: number;
  comfortMin: number;
  comfortMax: number;
  toleranceMin: number;
  toleranceMax: number;
  state: TemperatureState;
}

/**
 * Temperature component schema
 */
export const TemperatureSchema = autoRegister(
  defineComponent<TemperatureComponent>({
    type: 'temperature',
    version: 1,
    category: 'agent',

    fields: {
      currentTemp: {
        type: 'number',
        required: true,
        default: 20,
        range: [-50, 60] as const,
        description: 'Current temperature in Celsius',
        displayName: 'Current Temperature',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'temperature',
          order: 1,
          icon: '🌡️',
        },
        mutable: true,
      },

      comfortMin: {
        type: 'number',
        required: true,
        default: 15,
        range: [-50, 60] as const,
        description: 'Minimum comfortable temperature',
        displayName: 'Comfort Min',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'ranges',
          order: 10,
        },
        mutable: true,
      },

      comfortMax: {
        type: 'number',
        required: true,
        default: 25,
        range: [-50, 60] as const,
        description: 'Maximum comfortable temperature',
        displayName: 'Comfort Max',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'ranges',
          order: 11,
        },
        mutable: true,
      },

      toleranceMin: {
        type: 'number',
        required: true,
        default: 0,
        range: [-50, 60] as const,
        description: 'Minimum tolerable temperature (danger below)',
        displayName: 'Tolerance Min',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'ranges',
          order: 12,
        },
        mutable: true,
      },

      toleranceMax: {
        type: 'number',
        required: true,
        default: 40,
        range: [-50, 60] as const,
        description: 'Maximum tolerable temperature (danger above)',
        displayName: 'Tolerance Max',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'ranges',
          order: 13,
        },
        mutable: true,
      },

      state: {
        type: 'enum',
        enumValues: ['comfortable', 'cold', 'hot', 'dangerously_cold', 'dangerously_hot'] as const,
        required: true,
        default: 'comfortable',
        description: 'Current temperature state',
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
          group: 'temperature',
          order: 2,
          icon: '🌡️',
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🌡️',
      color: '#FF9800',
      priority: 4,
    },

    llm: {
      promptSection: 'physical_state',
      summarize: (data) => {
        const stateEmoji = {
          comfortable: '😊',
          cold: '🥶',
          hot: '🥵',
          dangerously_cold: '❄️',
          dangerously_hot: '🔥',
        }[data.state];

        return `${data.currentTemp}°C (${data.state} ${stateEmoji})`;
      },
      priority: 5,
    },

    validate: (data): data is TemperatureComponent => {
      const d = data as Record<string, unknown>;

      if (!('type' in d) || d.type !== 'temperature') return false;
      if (!('currentTemp' in d) || typeof d.currentTemp !== 'number') return false;
      if (!('comfortMin' in d) || typeof d.comfortMin !== 'number') return false;
      if (!('comfortMax' in d) || typeof d.comfortMax !== 'number') return false;
      if (!('toleranceMin' in d) || typeof d.toleranceMin !== 'number') return false;
      if (!('toleranceMax' in d) || typeof d.toleranceMax !== 'number') return false;
      if (!('state' in d) || typeof d.state !== 'string') return false;

      // Validate logical ranges
      if (d.toleranceMin > d.comfortMin) {
        throw new Error(`toleranceMin (${d.toleranceMin}) must be <= comfortMin (${d.comfortMin})`);
      }
      if (d.comfortMax > d.toleranceMax) {
        throw new Error(`comfortMax (${d.comfortMax}) must be <= toleranceMax (${d.toleranceMax})`);
      }

      if (!['comfortable', 'cold', 'hot', 'dangerously_cold', 'dangerously_hot'].includes(d.state)) {
        return false;
      }

      return true;
    },

    createDefault: () => ({
      type: 'temperature',
      version: 1,
      currentTemp: 20,
      comfortMin: 15,
      comfortMax: 25,
      toleranceMin: 0,
      toleranceMax: 40,
      state: 'comfortable',
    }),
  })
);
