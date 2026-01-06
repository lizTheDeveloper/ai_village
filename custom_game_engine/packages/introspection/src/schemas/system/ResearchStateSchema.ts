/**
 * Research State Component Schema
 *
 * Research progress tracking for the world
 * Phase 6, Batch 6 - Buildings & Systems
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { ResearchStateComponent } from '@ai-village/core';

export const ResearchStateSchema = autoRegister(
  defineComponent<ResearchStateComponent>({
    type: 'research_state',
    version: 1,
    category: 'system',

    fields: {
      dailyDiscoveries: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Daily Discoveries',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'discoveries',
          order: 1,
          icon: '💡',
        },
        mutable: true,
      },

      seasonalDiscoveries: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Seasonal Discoveries',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'discoveries',
          order: 2,
        },
        mutable: true,
      },

      lastDiscoveryTick: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Last Discovery',
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
          order: 10,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🔬',
      color: '#673AB7',
      priority: 3,
    },

    llm: {
      promptSection: 'Research',
      summarize: (data: ResearchStateComponent) => {
        const completed = data.completed.size;
        const inProgress = data.inProgress.size;
        const queued = data.queue.length;
        const discovered = data.discoveredResearch.length;
        return `Research: ${completed} completed, ${inProgress} in progress, ${queued} queued, ${discovered} discovered`;
      },
    },

    createDefault: (): ResearchStateComponent => ({
      type: 'research_state',
      version: 1,
      completed: new Set(),
      completedAt: new Map(),
      inProgress: new Map(),
      queue: [],
      discoveredResearch: [],
      dailyDiscoveries: 0,
      seasonalDiscoveries: 0,
      lastDiscoveryTick: 0,
    }),
  })
);
