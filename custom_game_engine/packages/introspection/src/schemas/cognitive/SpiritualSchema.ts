/**
 * Spiritual Component Schema
 *
 * Tracks faith, prayer, and divine connection
 * Phase 4, Batch 4 - Core Gameplay Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { SpiritualComponent, Vision, Prayer, Doubt } from '@ai-village/core';

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

      // Array fields - critical for LLM to see vision content
      visions: {
        type: 'array',
        required: true,
        default: [],
        description: 'Recent visions received from deity',
        displayName: 'Visions',
        visibility: {
          llm: true,      // Makes visions appear in prompts!
          agent: true,
          player: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'visions',
          order: 12,
        },
        // TODO: llm configuration needs to be moved to ComponentSchema level
        // llm: {
        //   summarize: (visions: Vision[]) => {
        //     if (!visions || visions.length === 0) return null;
        //     const recent = visions.slice(0, 3); // Last 3 visions
        //     return recent.map(v =>
        //       `Vision (clarity: ${(v.clarity * 100).toFixed(0)}%): "${v.content}"`
        //     ).join('\n');
        //   },
        //   priority: 8, // High priority - divine messages matter!
        // },
        mutable: true,
      },

      prayers: {
        type: 'array',
        required: true,
        default: [],
        description: 'Recent prayers made to deity',
        displayName: 'Prayers',
        visibility: {
          llm: true,      // Makes prayers appear in prompts!
          agent: true,
          player: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'prayers',
          order: 25,
        },
        // TODO: llm configuration needs to be moved to ComponentSchema level
        // llm: {
        //   summarize: (prayers: Prayer[]) => {
        //     if (!prayers || prayers.length === 0) return null;
        //     const recent = prayers.slice(0, 5).reverse(); // Last 5, oldest first
        //     return recent.map(p => {
        //       const status = p.answered ? `✓ ${p.responseType}` : 'unanswered';
        //       return `${p.type} (${status}): "${p.content}"`;
        //     }).join('\n');
        //   },
        //   priority: 7,
        // },
        mutable: true,
      },

      doubts: {
        type: 'array',
        required: true,
        default: [],
        description: 'Active doubts weakening faith',
        displayName: 'Doubts',
        visibility: {
          llm: true,
          agent: true,
          player: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'faith',
          order: 7,
        },
        // TODO: llm configuration needs to be moved to ComponentSchema level
        // llm: {
        //   summarize: (doubts: Doubt[]) => {
        //     if (!doubts || doubts.length === 0) return null;
        //     const active = doubts.filter(d => !d.resolved);
        //     if (active.length === 0) return null;
        //     return active.map(d =>
        //       `Doubt (severity: ${(d.severity * 100).toFixed(0)}%): ${d.reason}`
        //     ).join('\n');
        //   },
        //   priority: 6,
        // },
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
        const parts: string[] = [];

        // Faith level
        const faithLevel = data.faith >= 0.8 ? 'devout' :
                           data.faith >= 0.5 ? 'faithful' :
                           data.faith >= 0.2 ? 'questioning' : 'doubting';
        parts.push(`Faith: ${faithLevel} (${(data.faith * 100).toFixed(0)}%)`);

        // Prayer stats
        if (data.totalPrayers > 0) {
          parts.push(`Prayers: ${data.answeredPrayers}/${data.totalPrayers} answered`);
        }

        // Crisis warning
        if (data.crisisOfFaith) {
          parts.push('[CRISIS OF FAITH]');
        }

        return parts.join(' | ');
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
