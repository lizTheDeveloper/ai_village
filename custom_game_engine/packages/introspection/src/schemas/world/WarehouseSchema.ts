/**
 * Warehouse Component Schema
 *
 * Resource storage and distribution tracking
 * Phase 6, Batch 6 - Buildings & Systems
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { WarehouseComponent } from '@ai-village/core';

/**
 * Warehouse component schema
 */
export const WarehouseSchema = autoRegister(
  defineComponent<WarehouseComponent>({
    type: 'warehouse',
    version: 1,
    category: 'world',

    fields: {
      resourceType: {
        type: 'string',
        required: true,
        displayName: 'Resource Type',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'warehouse',
          order: 1,
          icon: '📦',
        },
        mutable: false,
      },

      capacity: {
        type: 'number',
        required: true,
        default: 1000,
        range: [100, 10000] as const,
        displayName: 'Capacity',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'warehouse',
          order: 2,
        },
        mutable: true,
      },

      stockpiles: {
        type: 'object',
        required: true,
        default: {},
        displayName: 'Stockpiles',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'inventory',
          order: 10,
        },
        mutable: true,
      },

      productionRates: {
        type: 'object',
        required: true,
        default: {},
        displayName: 'Production Rates',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'metrics',
          order: 20,
          icon: '📈',
        },
        mutable: true,
      },

      consumptionRates: {
        type: 'object',
        required: true,
        default: {},
        displayName: 'Consumption Rates',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'metrics',
          order: 21,
        },
        mutable: true,
      },

      daysRemaining: {
        type: 'object',
        required: true,
        default: {},
        displayName: 'Days Remaining',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'metrics',
          order: 22,
          icon: '⏰',
        },
        mutable: true,
      },

      status: {
        type: 'object',
        required: true,
        default: {},
        displayName: 'Status',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'metrics',
          order: 23,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🏢',
      color: '#607D8B',
      priority: 5,
    },

    llm: {
      promptSection: 'Resources',
      summarize: (data: WarehouseComponent) => {
        const stockCount = Object.keys(data.stockpiles).length;
        const totalStock = Object.values(data.stockpiles as Record<string, number>).reduce((sum, qty) => sum + qty, 0);
        const critical = Object.entries(data.status as Record<string, string>).filter(([_, s]) => s === 'critical').length;
        const criticalWarning = critical > 0 ? ` (${critical} critical!)` : '';
        return `${data.resourceType} warehouse: ${totalStock}/${data.capacity} units across ${stockCount} types${criticalWarning}`;
      },
    },

    createDefault: (): WarehouseComponent => ({
      type: 'warehouse',
      version: 1,
      resourceType: 'food',
      capacity: 1000,
      stockpiles: {},
      productionRates: {},
      consumptionRates: {},
      daysRemaining: {},
      status: {},
      distribution: [],
      lastDepositTime: {},
      lastWithdrawTime: {},
    }),
  })
);
