/**
 * Census Bureau Component Schema
 *
 * Demographics and population projections tracking
 * Phase 6, Batch 6 - Buildings & Systems
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { CensusBureauComponent } from '@ai-village/core';

export const CensusBureauSchema = autoRegister(
  defineComponent<CensusBureauComponent>({
    type: 'census_bureau',
    version: 1,
    category: 'social',

    fields: {
      birthRate: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Birth Rate',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'demographics',
          order: 1,
          icon: '👶',
        },
        mutable: true,
      },

      deathRate: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Death Rate',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'demographics',
          order: 2,
          icon: '⚰️',
        },
        mutable: true,
      },

      replacementRate: {
        type: 'number',
        required: true,
        default: 1.0,
        displayName: 'Replacement Rate',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'demographics',
          order: 3,
        },
        mutable: true,
      },

      dataQuality: {
        type: 'enum',
        enumValues: ['real_time', 'stale'] as const,
        required: true,
        default: 'stale',
        displayName: 'Data Quality',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'metrics',
          order: 10,
        },
        mutable: true,
      },

      accuracy: {
        type: 'number',
        required: true,
        default: 0.5,
        range: [0, 1] as const,
        displayName: 'Accuracy',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'metrics',
          order: 11,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '📊',
      color: '#607D8B',
      priority: 5,
    },

    llm: {
      promptSection: 'Demographics',
      summarize: (data: CensusBureauComponent) => {
        const demo = data.demographics;
        const total = demo.children + demo.adults + demo.elders;
        const proj = data.projections;
        const riskText = proj.extinctionRisk !== 'none' ? ` (${proj.extinctionRisk} extinction risk!)` : '';
        return `Census: ${total} total (${demo.children} children, ${demo.adults} adults, ${demo.elders} elders), replacement rate ${data.replacementRate.toFixed(2)}${riskText}`;
      },
    },

    createDefault: (): CensusBureauComponent => ({
      type: 'census_bureau',
      version: 1,
      demographics: {
        children: 0,
        adults: 0,
        elders: 0,
      },
      birthRate: 0,
      deathRate: 0,
      replacementRate: 1.0,
      projections: {
        in10Generations: 0,
        extinctionRisk: 'none',
      },
      generationalTrends: [],
      dataQuality: 'stale',
      updateFrequency: 24 * 3600,
      accuracy: 0.5,
    }),
  })
);
