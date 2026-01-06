/**
 * Shop Component Schema
 *
 * Commercial shop entity for trading goods
 * Phase 6, Batch 6 - Buildings & Systems
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { ShopComponent } from '@ai-village/core';

/**
 * Shop component schema
 */
export const ShopSchema = autoRegister(
  defineComponent<ShopComponent>({
    type: 'shop',
    version: 1,
    category: 'world',

    fields: {
      shopType: {
        type: 'enum',
        enumValues: [
          'general',
          'farm_supply',
          'blacksmith',
          'tavern',
          'apothecary',
          'clothier',
          'curiosity',
          'player_shop',
        ] as const,
        required: true,
        displayName: 'Shop Type',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'shop',
          order: 1,
          icon: '🏪',
        },
        mutable: false,
      },

      ownerId: {
        type: 'string',
        required: true,
        displayName: 'Owner ID',
        visibility: {
          player: false,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'shop',
          order: 2,
        },
        mutable: false,
      },

      name: {
        type: 'string',
        required: true,
        displayName: 'Shop Name',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'shop',
          order: 3,
        },
        mutable: true,
      },

      currencyReserve: {
        type: 'number',
        required: true,
        default: 500,
        range: [0, Infinity] as const,
        displayName: 'Currency Reserve',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'finances',
          order: 10,
          icon: '💰',
        },
        mutable: true,
      },

      buyMarkup: {
        type: 'number',
        required: true,
        default: 1.2,
        range: [1.0, 3.0] as const,
        displayName: 'Buy Markup',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'pricing',
          order: 11,
        },
        mutable: true,
      },

      sellMarkdown: {
        type: 'number',
        required: true,
        default: 0.8,
        range: [0.1, 1.0] as const,
        displayName: 'Sell Markdown',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'pricing',
          order: 12,
        },
        mutable: true,
      },

      haggleEnabled: {
        type: 'boolean',
        required: true,
        default: true,
        displayName: 'Haggle Enabled',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'pricing',
          order: 13,
        },
        mutable: true,
      },

      totalSales: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Total Sales',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'statistics',
          order: 20,
          icon: '📈',
        },
        mutable: true,
      },

      totalPurchases: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Total Purchases',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'statistics',
          order: 21,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🏪',
      color: '#FF9800',
      priority: 6,
    },

    llm: {
      promptSection: 'Economy',
      summarize: (data: ShopComponent) => {
        const stock = data.stock.length;
        const funds = data.currencyReserve.toFixed(0);
        const margin = ((data.buyMarkup - 1) * 100).toFixed(0);
        return `${data.name} (${data.shopType}): ${stock} items in stock, ${funds} currency, ${margin}% markup`;
      },
    },

    createDefault: (): ShopComponent => ({
      type: 'shop',
      version: 1,
      shopType: 'general',
      ownerId: '',
      name: 'General Store',
      stock: [],
      currencyReserve: 500,
      buyMarkup: 1.2,
      sellMarkdown: 0.8,
      haggleEnabled: true,
      openHours: { start: 8, end: 18 },
      daysOpen: [1, 2, 3, 4, 5, 6],
      totalSales: 0,
      totalPurchases: 0,
    }),
  })
);
