/**
 * Bookstore Component Schema
 *
 * Commercial book retail establishment
 * Phase 6, Batch 6 - Buildings & Systems
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { BookstoreComponent } from '@ai-village/core';

/**
 * Bookstore component schema
 */
export const BookstoreSchema = autoRegister(
  defineComponent<BookstoreComponent>({
    type: 'bookstore',
    version: 1,
    category: 'world',

    fields: {
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
          group: 'bookstore',
          order: 1,
          icon: '📚',
        },
        mutable: false,
      },

      revenue: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Revenue',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'finances',
          order: 10,
          icon: '💰',
        },
        mutable: true,
      },

      markupPercentage: {
        type: 'number',
        required: true,
        default: 50,
        range: [0, 200] as const,
        displayName: 'Markup %',
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

      canOrderCustom: {
        type: 'boolean',
        required: true,
        default: false,
        displayName: 'Custom Orders',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'services',
          order: 20,
        },
        mutable: true,
      },

      customersPerDay: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Customers/Day',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'metrics',
          order: 30,
          icon: '📊',
        },
        mutable: true,
      },
    },

    ui: {
      icon: '📖',
      color: '#8D6E63',
      priority: 6,
    },

    llm: {
      promptSection: 'Commerce',
      summarize: (data: BookstoreComponent) => {
        const books = data.booksForSale.length;
        const inStock = data.booksForSale.filter(b => b.stock > 0).length;
        const partners = data.printingPartners.length;
        return `Bookstore: ${inStock}/${books} books in stock, ${partners} printing partners, ${data.revenue.toFixed(0)} revenue`;
      },
    },

    createDefault: (): BookstoreComponent => ({
      type: 'bookstore',
      version: 1,
      booksForSale: [],
      ownerId: '',
      revenue: 0,
      markupPercentage: 50,
      printingPartners: [],
      canOrderCustom: false,
      pendingOrders: [],
      customersPerDay: 0,
      popularBooks: new Map(),
    }),
  })
);
