/**
 * Publishing Company Component Schema
 *
 * Book publishing house organization
 * Phase 6, Batch 6 - Buildings & Systems
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { PublishingCompanyComponent } from '@ai-village/core';

export const PublishingCompanySchema = autoRegister(
  defineComponent<PublishingCompanyComponent>({
    type: 'publishing_company',
    version: 1,
    category: 'world',

    fields: {
      companyName: {
        type: 'string',
        required: true,
        displayName: 'Company Name',
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
          icon: '📚',
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

      budget: {
        type: 'number',
        required: true,
        default: 50000,
        displayName: 'Budget',
        visibility: {
          player: false,
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

      totalBooksSold: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Books Sold',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'success',
          order: 20,
          icon: '📊',
        },
        mutable: true,
      },

      bestsellerCount: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Bestsellers',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'success',
          order: 21,
          icon: '⭐',
        },
        mutable: true,
      },

      acceptanceRate: {
        type: 'number',
        required: true,
        default: 0.1,
        range: [0, 1] as const,
        displayName: 'Acceptance Rate',
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
          order: 30,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '📖',
      color: '#795548',
      priority: 7,
    },

    llm: {
      promptSection: 'Publishing',
      summarize: (data: PublishingCompanyComponent) => {
        const catalog = data.catalog.length;
        const inProd = data.inProduction.length;
        const submissions = data.submissions.length;
        return `${data.companyName}: ${catalog} published, ${inProd} in production, ${submissions} submissions, ${data.bestsellerCount} bestsellers`;
      },
    },

    createDefault: (): PublishingCompanyComponent => ({
      type: 'publishing_company',
      version: 1,
      companyName: 'Publishing Company',
      foundedTick: 0,
      reputation: 50,
      buildingId: '',
      employees: [],
      maxEmployees: 30,
      submissions: [],
      inProduction: [],
      catalog: [],
      printingQueue: [],
      imprints: [],
      budget: 50000,
      monthlyRevenue: 0,
      monthlyOperatingCosts: 0,
      bookstorePartners: [],
      distributionRange: 1000,
      totalBooksSold: 0,
      bestsellerCount: 0,
      awardsWon: [],
      primaryGenres: ['fiction', 'non-fiction'],
      acceptanceRate: 0.1,
    }),
  })
);
