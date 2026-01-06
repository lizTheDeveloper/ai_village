import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { Component } from '@ai-village/core';

/**
 * CircadianComponent interface (simplified for schema)
 */
export interface CircadianComponent extends Component {
  type: 'circadian';
  sleepDrive: number;
  preferredSleepTime: number;
  isSleeping: boolean;
  sleepLocationId: string | null;
  sleepQuality: number;
  sleepStartTime: number | null;
  lastSleepLocationId: string | null;
  hasDreamedThisSleep: boolean;
  sleepDurationHours: number;
}

/**
 * CircadianSchema - Introspection schema for CircadianComponent
 *
 * Sleep/wake cycle tracking and sleep need management.
 */
export const CircadianSchema = autoRegister(
  defineComponent<CircadianComponent>({
    type: 'circadian',
    version: 1,
    category: 'agent',

    fields: {
      sleepDrive: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 100] as const,
        description: 'Urge to sleep (0-100)',
        displayName: 'Sleep Drive',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'sleep',
          order: 1,
        },
        mutable: true,
      },

      preferredSleepTime: {
        type: 'number',
        required: true,
        default: 19,
        range: [0, 24] as const,
        description: 'Preferred hour to sleep (0-24)',
        displayName: 'Preferred Sleep Time',
        visibility: {
          player: true,
          llm: false,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'sleep',
          order: 2,
        },
        mutable: true,
      },

      isSleeping: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Whether currently sleeping',
        displayName: 'Sleeping',
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
          order: 3,
        },
      },

      sleepQuality: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 1] as const,
        description: 'Sleep quality (0-1, affects recovery rate)',
        displayName: 'Sleep Quality',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'sleep',
          order: 4,
        },
      },

      sleepDurationHours: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Accumulated sleep duration in game hours',
        displayName: 'Sleep Duration',
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
          order: 5,
        },
      },

      hasDreamedThisSleep: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Whether dreamed during current sleep',
        displayName: 'Has Dreamed',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'debug',
          order: 10,
        },
      },
    },

    ui: {
      icon: '😴',
      color: '#3F51B5',
      priority: 5,
    },

    llm: {
      promptSection: 'Sleep State',
      summarize: (data: CircadianComponent) => {
        if (data.isSleeping) {
          return `Sleeping (quality: ${(data.sleepQuality * 100).toFixed(0)}%, duration: ${data.sleepDurationHours.toFixed(1)}h)`;
        }
        const driveLevel = data.sleepDrive > 80 ? 'exhausted' : data.sleepDrive > 60 ? 'tired' : data.sleepDrive > 40 ? 'slightly tired' : 'well-rested';
        return `Awake, ${driveLevel} (sleep drive: ${data.sleepDrive.toFixed(0)})`;
      },
      priority: 6,
    },

    validate: (data: unknown): data is CircadianComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const comp = data as any;
      return (
        comp.type === 'circadian' &&
        typeof comp.sleepDrive === 'number' &&
        typeof comp.preferredSleepTime === 'number' &&
        typeof comp.isSleeping === 'boolean' &&
        typeof comp.sleepQuality === 'number' &&
        comp.sleepDrive >= 0 &&
        comp.sleepDrive <= 100 &&
        comp.sleepQuality >= 0 &&
        comp.sleepQuality <= 1
      );
    },

    createDefault: () => ({
      type: 'circadian',
      version: 1,
      sleepDrive: 0,
      preferredSleepTime: 19,
      isSleeping: false,
      sleepLocationId: null,
      sleepQuality: 0,
      sleepStartTime: null,
      lastSleepLocationId: null,
      hasDreamedThisSleep: false,
      sleepDurationHours: 0,
    } as CircadianComponent),
  })
);
