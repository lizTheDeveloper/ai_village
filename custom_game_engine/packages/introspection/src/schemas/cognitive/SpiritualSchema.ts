/**
 * Spiritual Component Schema
 *
 * Tracks faith, prayer, and divine connection
 * Phase 4, Batch 4 - Core Gameplay Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { SpiritualComponent } from '@ai-village/core';

/**
 * Spiritual component schema
 */
export const SpiritualSchema = autoRegister(
  defineComponent<SpiritualComponent>({
    type: 'spiritual',
    version: 1,
    category: 'cognitive',
    description: 'Faith, prayer, and divine connection',

    fields: {
      believedDeity: {
        type: 'string',
        required: false,
        description: 'Deity entity ID this agent believes in',
        displayName: 'Deity',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'faith',
          order: 1,
          icon: '⛪',
        },
        mutable: true,
      },

      faith: {
        type: 'number',
        required: true,
        default: 0.5,
        range: [0, 1] as const,
        description: 'Faith level (0 = no belief, 1 = devout)',
        displayName: 'Faith',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'faith',
          order: 2,
          icon: '🙏',
        },
        mutable: true,
      },

      baselineFaith: {
        type: 'number',
        required: true,
        default: 0.5,
        range: [0, 1] as const,
        description: 'Baseline faith from personality',
        displayName: 'Baseline Faith',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'faith',
          order: 3,
        },
        mutable: false,
      },

      peakFaith: {
        type: 'number',
        required: true,
        default: 0.5,
        range: [0, 1] as const,
        description: 'Peak faith ever achieved',
        displayName: 'Peak Faith',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'faith',
          order: 4,
        },
        mutable: true,
      },

      hasReceivedVision: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Whether agent has received a vision',
        displayName: 'Has Vision',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'visions',
          order: 10,
          icon: '✨',
        },
        mutable: true,
      },

      totalPrayers: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 100000] as const,
        description: 'Total prayers made (lifetime)',
        displayName: 'Total Prayers',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'prayers',
          order: 20,
          icon: '🙏',
        },
        mutable: true,
      },

      answeredPrayers: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 100000] as const,
        description: 'Prayers that received responses',
        displayName: 'Answered',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'prayers',
          order: 21,
        },
        mutable: true,
      },

      unansweredPrayers: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 100000] as const,
        description: 'Prayers that went unanswered',
        displayName: 'Unanswered',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'prayers',
          order: 22,
        },
        mutable: true,
      },

      meditating: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Whether currently meditating',
        displayName: 'Meditating',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'visions',
          order: 11,
        },
        mutable: true,
      },

      crisisOfFaith: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Whether in a crisis of faith',
        displayName: 'Crisis of Faith',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'faith',
          order: 5,
          icon: '⚠️',
        },
        mutable: true,
      },

      prayerStyle: {
        type: 'enum',
        enumValues: ['formal', 'conversational', 'desperate', 'grateful', 'questioning'] as const,
        required: true,
        default: 'conversational',
        description: 'Prayer personality',
        displayName: 'Prayer Style',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'prayers',
          order: 23,
        },
        mutable: true,
      },

      prayerFrequency: {
        type: 'number',
        required: true,
        default: 24000,
        range: [0, 100000] as const,
        description: 'Ticks between prayers',
        displayName: 'Prayer Frequency',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'prayers',
          order: 24,
        },
        mutable: true,
      },

      religiousLeader: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Whether agent is a religious leader',
        displayName: 'Religious Leader',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'faith',
          order: 6,
          icon: '👑',
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🙏',
      color: '#9C27B0',
      priority: 6,
    },

    llm: {
      promptSection: 'spirituality',
      summarize: (data: SpiritualComponent) => {
        const faithLevel = data.faith >= 0.8 ? 'devout' : data.faith >= 0.5 ? 'faithful' : data.faith >= 0.2 ? 'questioning' : 'doubting';
        const answered = data.totalPrayers > 0 ? ` (${data.answeredPrayers}/${data.totalPrayers} answered)` : '';
        const crisis = data.crisisOfFaith ? ' [CRISIS]' : '';
        const vision = data.hasReceivedVision ? ' [has seen visions]' : '';
        return `${faithLevel}${answered}${crisis}${vision}`;
      },
      priority: 7,
    },

    createDefault: (): SpiritualComponent => ({
      type: 'spiritual',
      version: 1,
      faith: 0.5,
      baselineFaith: 0.5,
      peakFaith: 0.5,
      hasReceivedVision: false,
      prayers: [],
      totalPrayers: 0,
      answeredPrayers: 0,
      unansweredPrayers: 0,
      visions: [],
      meditating: false,
      doubts: [],
      crisisOfFaith: false,
      prayerStyle: 'conversational',
      prayerFrequency: 24000,
      religiousLeader: false,
    }),
  })
);
