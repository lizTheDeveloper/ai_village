/**
 * Newspaper Component Schema
 *
 * Daily/weekly newspaper organization
 * Phase 6, Batch 6 - Buildings & Systems
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { NewspaperComponent } from '@ai-village/core';

export const NewspaperSchema = autoRegister(
  defineComponent<NewspaperComponent>({
    type: 'newspaper',
    version: 1,
    category: 'social',

    fields: {
      newspaperName: {
        type: 'string',
        required: true,
        displayName: 'Newspaper Name',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'identity',
          order: 1,
          icon: '📰',
        },
        mutable: true,
      },

      frequency: {
        type: 'enum',
        enumValues: ['daily', 'weekly', 'biweekly'] as const,
        required: true,
        default: 'daily',
        displayName: 'Frequency',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'publishing',
          order: 10,
        },
        mutable: true,
      },

      reputation: {
        type: 'number',
        required: true,
        default: 50,
        range: [0, 100] as const,
        displayName: 'Reputation',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'identity',
          order: 2,
        },
        mutable: true,
      },

      circulationCount: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Circulation',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'distribution',
          order: 20,
          icon: '📊',
        },
        mutable: true,
      },

      pulitzerCount: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Pulitzers',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'awards',
          order: 30,
          icon: '🏆',
        },
        mutable: true,
      },

      controversies: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Controversies',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'reputation',
          order: 31,
        },
        mutable: true,
      },

      politicalLean: {
        type: 'number',
        required: true,
        default: 0,
        range: [-1, 1] as const,
        displayName: 'Political Lean',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'editorial',
          order: 40,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '📰',
      color: '#455A64',
      priority: 6,
    },

    llm: {
      promptSection: 'Media',
      summarize: (data: NewspaperComponent) => {
        const articles = data.publishedArticles.length;
        const editions = data.editions.length;
        const staff = data.employees.length;
        return `${data.newspaperName} (${data.frequency}): ${editions} editions, ${articles} articles, ${data.circulationCount} subscribers, ${staff} staff`;
      },
    },

    createDefault: (): NewspaperComponent => ({
      type: 'newspaper',
      version: 1,
      newspaperName: 'Daily News',
      foundedTick: 0,
      reputation: 50,
      buildingId: '',
      frequency: 'daily',
      lastPublishedTick: 0,
      nextPublishingTick: 0,
      employees: [],
      maxEmployees: 40,
      activeArticles: [],
      publishedArticles: [],
      editions: [],
      sections: ['News', 'Opinion', 'Sports', 'Arts', 'Business'],
      budget: 30000,
      subscriptionRevenue: 0,
      advertisingRevenue: 0,
      monthlyOperatingCosts: 0,
      circulationCount: 0,
      peakCirculation: 0,
      distributionRange: 800,
      pulitzerCount: 0,
      totalReadership: 0,
      controversies: 0,
      politicalLean: 0,
      focusAreas: ['local_news', 'politics', 'community'],
    }),
  })
);
