/**
 * Market State Component Schema
 *
 * Global market tracking and pricing data
 * Phase 6, Batch 6 - Buildings & Systems
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { MarketStateComponent } from '@ai-village/core';

export const MarketStateSchema = autoRegister(
  defineComponent<MarketStateComponent>({
    type: 'market_state',
    version: 1,
    category: 'social',

    fields: {
      totalCurrency: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Total Currency',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'economy',
          order: 1,
          icon: '💰',
        },
        mutable: true,
      },

      dailyTransactionVolume: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Daily Volume',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'activity',
          order: 10,
          icon: '📈',
        },
        mutable: true,
      },

      weeklyTransactionVolume: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Weekly Volume',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'activity',
          order: 11,
        },
        mutable: true,
      },

      inflationRate: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Inflation Rate',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'economy',
          order: 2,
        },
        mutable: true,
      },

      lastDayProcessed: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Last Processed Day',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'internal',
          order: 20,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '💹',
      color: '#4CAF50',
      priority: 4,
    },

    llm: {
      promptSection: 'Economy',
      summarize: (data: MarketStateComponent) => {
        const items = data.itemStats.size;
        const inflation = (data.inflationRate * 100).toFixed(1);
        return `Market: ${items} tracked items, ${data.totalCurrency.toFixed(0)} total currency, ${inflation}% inflation, ${data.dailyTransactionVolume.toFixed(0)} daily volume`;
      },
    },

    createDefault: (): MarketStateComponent => ({
      type: 'market_state',
      version: 1,
      itemStats: new Map(),
      totalCurrency: 0,
      dailyTransactionVolume: 0,
      weeklyTransactionVolume: 0,
      inflationRate: 0,
      lastDayProcessed: 0,
    }),
  })
);
