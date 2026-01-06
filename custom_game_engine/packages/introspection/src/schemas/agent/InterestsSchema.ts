/**
 * Interests Component Schema
 *
 * Tracks agent interests and conversation topics
 * Phase 4, Batch 4 - Core Gameplay Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { InterestsComponent } from '@ai-village/core';

/**
 * Interests component schema
 */
export const InterestsSchema = autoRegister(
  defineComponent<InterestsComponent>({
    type: 'interests',
    version: 1,
    category: 'agent',
    description: 'Agent interests and conversation preferences',

    fields: {
      interests: {
        type: 'array',
        required: true,
        default: [],
        description: 'All interests (typically 3-8 per agent)',
        displayName: 'Interests',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'interests',
          order: 1,
          icon: '💡',
        },
        mutable: true,
      },

      depthHunger: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 1] as const,
        description: 'Desire for deep conversation (0 = satisfied, 1 = starving)',
        displayName: 'Depth Hunger',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'conversation',
          order: 10,
          icon: '💬',
        },
        mutable: true,
      },

      avoidTopics: {
        type: 'array',
        required: true,
        default: [],
        description: 'Topics agent actively dislikes',
        displayName: 'Avoid Topics',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'conversation',
          order: 11,
          icon: '🚫',
        },
        mutable: true,
      },

      maxInterests: {
        type: 'number',
        required: true,
        default: 10,
        range: [1, 50] as const,
        description: 'Maximum interests to maintain',
        displayName: 'Max Interests',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'metadata',
          order: 20,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '💡',
      color: '#FFC107',
      priority: 8,
    },

    llm: {
      promptSection: 'interests',
      summarize: (data: InterestsComponent) => {
        if (!data.interests || data.interests.length === 0) {
          return 'no particular interests';
        }

        // Get top 3 interests by intensity
        const topInterests = [...data.interests]
          .sort((a, b) => b.intensity - a.intensity)
          .slice(0, 3);

        const descriptions = topInterests.map((interest) => {
          const intensityDesc =
            interest.intensity > 0.7
              ? 'passionate about'
              : interest.intensity > 0.4
              ? 'interested in'
              : 'curious about';
          const topic = interest.topic.replace(/_/g, ' ');
          return `${intensityDesc} ${topic}`;
        });

        const depthNote = data.depthHunger > 0.7 ? ' [craves deep conversation]' : '';
        const avoidNote = data.avoidTopics.length > 0 ? ` [avoids: ${data.avoidTopics.slice(0, 2).join(', ')}]` : '';

        return `${descriptions.join(', ')}${depthNote}${avoidNote}`;
      },
      priority: 7,
    },

    createDefault: (): InterestsComponent => {
      const { InterestsComponent: InterestsComponentClass } = require('@ai-village/core');
      const component = new InterestsComponentClass();
      component.interests = [];
      component.depthHunger = 0.0;
      component.avoidTopics = [];
      component.maxInterests = 10;
      return component;
    },
  })
);
