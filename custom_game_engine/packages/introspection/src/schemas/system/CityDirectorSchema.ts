/**
 * City Director Component Schema
 *
 * City-level strategic decision making AI
 * Phase 6, Batch 6 - Buildings & Systems
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { CityDirectorComponent } from '@ai-village/core';

export const CityDirectorSchema = autoRegister(
  defineComponent<CityDirectorComponent>({
    type: 'city_director',
    version: 1,
    category: 'system',

    fields: {
      cityId: {
        type: 'string',
        required: true,
        displayName: 'City ID',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'identity',
          order: 1,
          icon: '🏙️',
        },
        mutable: false,
      },

      cityName: {
        type: 'string',
        required: true,
        displayName: 'Name',
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
          order: 2,
        },
        mutable: true,
      },

      cityInfluence: {
        type: 'number',
        required: true,
        default: 0.4,
        range: [0, 1] as const,
        displayName: 'City Influence',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'strategy',
          order: 10,
        },
        mutable: true,
      },

      meetingInterval: {
        type: 'number',
        required: true,
        default: 14400,
        displayName: 'Meeting Interval',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'configuration',
          order: 20,
        },
        mutable: true,
      },

      useLLM: {
        type: 'boolean',
        required: true,
        default: true,
        displayName: 'Use LLM',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'configuration',
          order: 21,
        },
        mutable: true,
      },

      pendingDecision: {
        type: 'boolean',
        required: true,
        default: false,
        displayName: 'Pending Decision',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'state',
          order: 30,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🏙️',
      color: '#9C27B0',
      priority: 3,
    },

    llm: {
      promptSection: 'AI Director',
      summarize: (data: CityDirectorComponent) => {
        const agents = data.agentIds.length;
        const stats = data.stats;
        const focus = data.reasoning?.focus ?? 'balanced';
        return `${data.cityName} Director: ${agents} agents, ${stats.population} population, focus: ${focus}`;
      },
    },

    createDefault: (): CityDirectorComponent => ({
      type: 'city_director',
      version: 1,
      cityId: '',
      cityName: 'City',
      bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
      stats: {
        population: 0,
        autonomicNpcCount: 0,
        llmAgentCount: 0,
        totalBuildings: 0,
        housingCapacity: 0,
        storageCapacity: 0,
        productionBuildings: 0,
        foodSupply: 0,
        woodSupply: 0,
        stoneSupply: 0,
        nearbyThreats: 0,
        recentDeaths: 0,
      },
      priorities: {
        gathering: 0.20,
        building: 0.20,
        farming: 0.20,
        social: 0.10,
        exploration: 0.15,
        rest: 0.10,
        magic: 0.05,
      },
      cityInfluence: 0.4,
      lastDirectorMeeting: 0,
      meetingInterval: 14400,
      useLLM: true,
      pendingDecision: false,
      agentIds: [],
      professionQuotas: {},
      professionRoster: {},
      professionOutputs: {
        newsArticles: [],
        tvEpisodes: [],
        radioBroadcasts: [],
        services: [],
      },
      lastProfessionUpdate: 0,
    }),
  })
);
