/**
 * Town Hall Component Schema
 *
 * Population tracking for governance
 * Phase 6, Batch 6 - Buildings & Systems
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { TownHallComponent } from '@ai-village/core';

export const TownHallSchema = autoRegister(
  defineComponent<TownHallComponent>({
    type: 'town_hall',
    version: 1,
    category: 'world',

    fields: {
      populationCount: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Population',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'population',
          order: 1,
          icon: '👥',
        },
        mutable: true,
      },

      dataQuality: {
        type: 'enum',
        enumValues: ['full', 'delayed', 'unavailable'] as const,
        required: true,
        default: 'full',
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

      latency: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Latency (sec)',
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
          order: 11,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🏛️',
      color: '#9C27B0',
      priority: 5,
    },

    llm: {
      promptSection: 'Governance',
      summarize: (data: TownHallComponent) => {
        const quality = data.dataQuality === 'full' ? 'real-time' :
                       data.dataQuality === 'delayed' ? `${data.latency}s delay` : 'unavailable';
        const recentDeaths = data.recentDeaths.length;
        const recentBirths = data.recentBirths.length;
        return `Town Hall: ${data.populationCount} residents (${quality}), ${recentBirths} births, ${recentDeaths} deaths`;
      },
    },

    createDefault: (): TownHallComponent => ({
      type: 'town_hall',
      version: 1,
      populationCount: 0,
      agents: [],
      recentDeaths: [],
      recentBirths: [],
      dataQuality: 'full',
      latency: 0,
    }),
  })
);
