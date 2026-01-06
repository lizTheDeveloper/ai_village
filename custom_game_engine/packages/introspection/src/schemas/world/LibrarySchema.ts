/**
 * Library Component Schema
 *
 * Public library for accessing manuscripts and books
 * Phase 6, Batch 6 - Buildings & Systems
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { LibraryComponent } from '@ai-village/core';

export const LibrarySchema = autoRegister(
  defineComponent<LibraryComponent>({
    type: 'library',
    version: 1,
    category: 'world',

    fields: {
      capacity: {
        type: 'number',
        required: true,
        default: 500,
        range: [0, 5000] as const,
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
          group: 'library',
          order: 1,
          icon: '📚',
        },
        mutable: true,
      },

      publicAccess: {
        type: 'boolean',
        required: true,
        default: true,
        displayName: 'Public Access',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'access',
          order: 10,
        },
        mutable: true,
      },

      membershipFee: {
        type: 'number',
        required: false,
        displayName: 'Membership Fee',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'access',
          order: 11,
        },
        mutable: true,
      },

      visitsPerDay: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Visits/Day',
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
          order: 20,
          icon: '📊',
        },
        mutable: true,
      },
    },

    ui: {
      icon: '📚',
      color: '#5D4037',
      priority: 6,
    },

    llm: {
      promptSection: 'Knowledge',
      summarize: (data: LibraryComponent) => {
        const items = data.manuscripts.length + data.books.length;
        const access = data.publicAccess ? 'public' : 'members only';
        return `Library (${access}): ${items}/${data.capacity} items, ${data.visitsPerDay} daily visits`;
      },
    },

    createDefault: (): LibraryComponent => ({
      type: 'library',
      version: 1,
      manuscripts: [],
      books: [],
      capacity: 500,
      publicAccess: true,
      visitsPerDay: 0,
      mostReadItems: new Map(),
      catalog: [],
    }),
  })
);
