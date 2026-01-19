/**
 * Time Component Schema
 *
 * Game time tracking (day/night cycle, game speed, etc.)
 * Phase 4, Tier 1 - Core World Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { Component } from '@ai-village/core';

/**
 * Day phase enum
 */
export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

/**
 * Time component type
 * Matches: packages/core/src/systems/TimeSystem.ts
 */
export interface TimeComponent extends Component {
  type: 'time';
  version: 1;
  timeOfDay: number;
  dayLength: number;
  speedMultiplier: number;
  phase: DayPhase;
  lightLevel: number;
  day: number;
}

/**
 * Time component schema
 */
export const TimeSchema = autoRegister(
  defineComponent<TimeComponent>({
    type: 'time',
    version: 1,
    category: 'world',

    fields: {
      timeOfDay: {
        type: 'number',
        required: true,
        default: 6,
        range: [0, 24] as const,
        displayName: 'Time of Day',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'time',
          order: 1,
          icon: '🕐',
        },
        mutable: true,
      },

      dayLength: {
        type: 'number',
        required: true,
        default: 48,
        range: [1, 3600] as const,
        displayName: 'Day Length',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'config',
          order: 10,
        },
        mutable: true,
      },

      speedMultiplier: {
        type: 'number',
        required: true,
        default: 1,
        range: [0.1, 8] as const,
        displayName: 'Speed Multiplier',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'config',
          order: 11,
          icon: '⏩',
        },
        mutable: true,
      },

      phase: {
        type: 'enum',
        enumValues: ['dawn', 'day', 'dusk', 'night'] as const,
        required: true,
        default: 'dawn',
        displayName: 'Phase',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'time',
          order: 2,
          icon: '🌅',
        },
        mutable: true,
      },

      lightLevel: {
        type: 'number',
        required: true,
        default: 0.3,
        range: [0, 1] as const,
        displayName: 'Light Level',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'time',
          order: 3,
          icon: '💡',
        },
        mutable: true,
      },

      day: {
        type: 'number',
        required: true,
        default: 1,
        range: [1, 100000] as const,
        displayName: 'Day',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'time',
          order: 4,
          icon: '📅',
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🕐',
      color: '#2196F3',
      priority: 2, // High priority - core world state
    },

    llm: {
      promptSection: 'environment',
      summarize: (data) => {
        const hour = Math.floor(data.timeOfDay);
        const minute = Math.floor((data.timeOfDay - hour) * 60);
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        return `Day ${data.day}, ${timeStr} (${data.phase}, light level ${(data.lightLevel * 100).toFixed(0)}%)`;
      },
      priority: 2, // High priority for LLM context
    },

    validate: (data): data is TimeComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const d = data as Record<string, unknown>;

      if (d.type !== 'time') return false;
      if (typeof d.timeOfDay !== 'number' || d.timeOfDay < 0 || d.timeOfDay >= 24) {
        throw new RangeError(`Invalid timeOfDay: ${d.timeOfDay} (must be 0-24)`);
      }
      if (typeof d.dayLength !== 'number' || d.dayLength <= 0) {
        throw new RangeError(`Invalid dayLength: ${d.dayLength} (must be > 0)`);
      }
      if (typeof d.speedMultiplier !== 'number' || d.speedMultiplier <= 0) {
        throw new RangeError(`Invalid speedMultiplier: ${d.speedMultiplier} (must be > 0)`);
      }
      if (!['dawn', 'day', 'dusk', 'night'].includes(d.phase as string)) return false;
      if (typeof d.lightLevel !== 'number' || d.lightLevel < 0 || d.lightLevel > 1) {
        throw new RangeError(`Invalid lightLevel: ${d.lightLevel} (must be 0-1)`);
      }
      if (typeof d.day !== 'number' || d.day < 1) {
        throw new RangeError(`Invalid day: ${d.day} (must be >= 1)`);
      }

      return true;
    },

    createDefault: () => ({
      type: 'time',
      version: 1,
      timeOfDay: 6,
      dayLength: 48,
      speedMultiplier: 1,
      phase: 'dawn',
      lightLevel: 0.3,
      day: 1,
    }),
  })
);
