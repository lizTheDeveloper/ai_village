/**
 * University Library Component Schema
 *
 * Academic research library with journal subscriptions
 * Phase 6, Batch 6 - Buildings & Systems
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { Component } from '@ai-village/core';

// UniversityLibraryComponent is not exported from @ai-village/core yet
// Define it locally based on the source file
export interface UniversityLibraryComponent extends Component {
  type: 'university_library';
  manuscripts: string[];
  books: string[];
  capacity: number;
  journalSubscriptions: any[];
  subscriptionCost: number;
  universityId: string;
  studentAccess: boolean;
  publicAccess: boolean;
  referenceLibrarians: string[];
  catalog: any[];
  readingRoomCapacity: number;
  currentReaders: string[];
  dailyVisits: number;
  mostAccessedItems: Map<string, number>;
}

export const UniversityLibrarySchema = autoRegister(
  defineComponent<UniversityLibraryComponent>({
    type: 'university_library',
    version: 1,
    category: 'world',

    fields: {
      universityId: {
        type: 'string',
        required: true,
        displayName: 'University',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'library',
          order: 1,
          icon: '🎓',
        },
        mutable: false,
      },

      capacity: {
        type: 'number',
        required: true,
        default: 2000,
        range: [500, 20000] as const,
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
          order: 2,
        },
        mutable: true,
      },

      subscriptionCost: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Annual Subscriptions',
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

      studentAccess: {
        type: 'boolean',
        required: true,
        default: true,
        displayName: 'Student Access',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'access',
          order: 20,
        },
        mutable: true,
      },

      publicAccess: {
        type: 'boolean',
        required: true,
        default: false,
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
          order: 21,
        },
        mutable: true,
      },

      readingRoomCapacity: {
        type: 'number',
        required: true,
        default: 50,
        range: [10, 500] as const,
        displayName: 'Reading Room Capacity',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'facilities',
          order: 30,
        },
        mutable: true,
      },

      dailyVisits: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Daily Visits',
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
          order: 40,
          icon: '📊',
        },
        mutable: true,
      },
    },

    ui: {
      icon: '📚',
      color: '#3F51B5',
      priority: 7,
    },

    llm: {
      promptSection: 'Education',
      summarize: (data: UniversityLibraryComponent) => {
        const items = data.manuscripts.length + data.books.length;
        const subscriptions = data.journalSubscriptions.length;
        const access = data.publicAccess ? 'public' : data.studentAccess ? 'students' : 'restricted';
        return `University library (${access}): ${items} items, ${subscriptions} journal subscriptions, ${data.dailyVisits} daily visits`;
      },
    },

    createDefault: (): UniversityLibraryComponent => ({
      type: 'university_library',
      version: 1,
      manuscripts: [],
      books: [],
      capacity: 2000,
      journalSubscriptions: [],
      subscriptionCost: 0,
      universityId: '',
      studentAccess: true,
      publicAccess: false,
      referenceLibrarians: [],
      catalog: [],
      readingRoomCapacity: 50,
      currentReaders: [],
      dailyVisits: 0,
      mostAccessedItems: new Map(),
    }),
  })
);
