/**
 * Gathering Stats Component Schema
 *
 * Tracks gathering statistics for agents (daily and all-time)
 * Phase 4, Tier 2 - Agent Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { Component } from '@ai-village/core';

/**
 * Gathering stats component type
 * Matches: packages/core/src/components/GatheringStatsComponent.ts
 */
export interface GatheringStatsComponent extends Component {
  type: 'gathering_stats';
  version: 1;
  lastResetDay: number;
  today: Record<string, number>;
  allTime: Record<string, number>;
  depositedToday: Record<string, number>;
  depositedAllTime: Record<string, number>;
}

/**
 * Gathering stats component schema
 */
export const GatheringStatsSchema = autoRegister(
  defineComponent<GatheringStatsComponent>({
    type: 'gathering_stats',
    version: 1,
    category: 'agent',

    fields: {
      lastResetDay: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 100000] as const,
        description: 'Day when stats were last reset',
        displayName: 'Last Reset Day',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'meta',
          order: 50,
        },
        mutable: true,
      },

      today: {
        type: 'object',
        required: true,
        default: {},
        description: 'Items gathered today (itemId -> count)',
        displayName: 'Gathered Today',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'gathering',
          order: 1,
          icon: '📊',
        },
        mutable: true,
      },

      allTime: {
        type: 'object',
        required: true,
        default: {},
        description: 'Items gathered all-time (itemId -> count)',
        displayName: 'Gathered All-Time',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'gathering',
          order: 2,
          icon: '📈',
        },
        mutable: true,
      },

      depositedToday: {
        type: 'object',
        required: true,
        default: {},
        description: 'Items deposited today (itemId -> count)',
        displayName: 'Deposited Today',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'depositing',
          order: 10,
          icon: '📦',
        },
        mutable: true,
      },

      depositedAllTime: {
        type: 'object',
        required: true,
        default: {},
        description: 'Items deposited all-time (itemId -> count)',
        displayName: 'Deposited All-Time',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'depositing',
          order: 11,
          icon: '📈',
        },
        mutable: true,
      },
    },

    ui: {
      icon: '📊',
      color: '#009688',
      priority: 6,
    },

    llm: {
      promptSection: 'gathering',
      summarize: (data) => {
        // Calculate totals
        const todayTotal = Object.values(data.today).reduce((sum, count) => sum + count, 0);
        const allTimeTotal = Object.values(data.allTime).reduce((sum, count) => sum + count, 0);
        const depositedTodayTotal = Object.values(data.depositedToday).reduce((sum, count) => sum + count, 0);

        // Get top gathered items today
        const topToday = Object.entries(data.today)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([item, count]) => `${item}:${count}`)
          .join(', ');

        const todayStr = todayTotal > 0 ? `Today: ${todayTotal} items (${topToday})` : 'No gathering today';
        const depositedStr = depositedTodayTotal > 0 ? `, deposited ${depositedTodayTotal}` : '';
        const allTimeStr = allTimeTotal > 0 ? ` | Total: ${allTimeTotal} items` : '';

        return `${todayStr}${depositedStr}${allTimeStr}`;
      },
      priority: 7,
    },

    validate: (data): data is GatheringStatsComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const d = data as Record<string, unknown>;

      if (!('type' in d) || d.type !== 'gathering_stats') return false;
      if (!('lastResetDay' in d) || typeof d.lastResetDay !== 'number' || d.lastResetDay < 0) {
        throw new RangeError(`Invalid lastResetDay: ${d.lastResetDay} (must be >= 0)`);
      }

      // Validate records are objects
      if (!('today' in d) || typeof d.today !== 'object' || d.today === null || Array.isArray(d.today)) {
        return false;
      }
      if (!('allTime' in d) || typeof d.allTime !== 'object' || d.allTime === null || Array.isArray(d.allTime)) {
        return false;
      }
      if (!('depositedToday' in d) || typeof d.depositedToday !== 'object' || d.depositedToday === null || Array.isArray(d.depositedToday)) {
        return false;
      }
      if (!('depositedAllTime' in d) || typeof d.depositedAllTime !== 'object' || d.depositedAllTime === null || Array.isArray(d.depositedAllTime)) {
        return false;
      }

      // Validate record values are numbers
      const validateRecord = (record: Record<string, unknown>) => {
        for (const value of Object.values(record)) {
          if (typeof value !== 'number' || value < 0) {
            return false;
          }
        }
        return true;
      };

      if (!validateRecord(d.today as Record<string, unknown>)) return false;
      if (!validateRecord(d.allTime as Record<string, unknown>)) return false;
      if (!validateRecord(d.depositedToday as Record<string, unknown>)) return false;
      if (!validateRecord(d.depositedAllTime as Record<string, unknown>)) return false;

      return true;
    },

    createDefault: () => ({
      type: 'gathering_stats',
      version: 1,
      lastResetDay: 0,
      today: {},
      allTime: {},
      depositedToday: {},
      depositedAllTime: {},
    }),
  })
);
