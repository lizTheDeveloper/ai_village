/**
 * Interests Component Schema
 *
 * Tracks all of an agent's interests and topic-related desires.
 * Interests drive what agents want to talk about, who they seek out
 * for conversation, and how satisfied they feel after discussions.
 *
 * Phase 4+, Tier 10 - Social/Community Components
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Interests component type
 */
export interface InterestsComponent extends Component {
  type: 'interests';
  version: 1;

  interests: Array<{
    topic: string;
    category: string;
    intensity: number;
    source: string;
    lastDiscussed: number | null;
    discussionHunger: number;
    knownEnthusiasts: string[];
    question?: string;
  }>;
  depthHunger: number;
  avoidTopics: string[];
  maxInterests: number;
}

/**
 * Interests component schema
 */
export const InterestsSchema = autoRegister(
  defineComponent<InterestsComponent>({
    type: 'interests',
    version: 1,
    category: 'social',

    fields: {
      interests: {
        type: 'array',
        required: true,
        default: [],
        description: 'All interests this agent has (typically 3-8 interests)',
        displayName: 'Interests',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'interests',
          order: 1,
          icon: '💭',
        },
        mutable: true,
        itemType: 'object',
      },

      depthHunger: {
        type: 'number',
        required: true,
        default: 0.0,
        range: [0, 1] as const,
        description: 'Overall desire for deep/meaningful conversation',
        displayName: 'Depth Hunger',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'slider',
          group: 'desires',
          order: 1,
          icon: '🗨️',
        },
        mutable: true,
      },

      avoidTopics: {
        type: 'array',
        required: true,
        default: [],
        description: 'Topics this agent actively dislikes discussing',
        displayName: 'Avoid Topics',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'interests',
          order: 2,
        },
        mutable: true,
        itemType: 'string',
      },

      maxInterests: {
        type: 'number',
        required: true,
        default: 10,
        description: 'Maximum interests to maintain (prevent bloat)',
        displayName: 'Max Interests',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'readonly',
          group: 'config',
          order: 1,
        },
        mutable: false,
      },
    },

    ui: {
      icon: '💭',
      color: '#FF6B6B',
      priority: 8,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'interests',
      priority: 8,
      summarize: (data) => {
        if (!data.interests || data.interests.length === 0) {
          return 'no particular interests';
        }

        // Get top 3 interests by intensity
        const topInterests = [...data.interests]
          .sort((a, b) => b.intensity - a.intensity)
          .slice(0, 3);

        const descriptions = topInterests.map(interest => {
          const intensityDesc =
            interest.intensity > 0.7 ? 'passionate about' :
            interest.intensity > 0.4 ? 'interested in' : 'curious about';
          const topicName = interest.topic.replace(/_/g, ' ');
          return `${intensityDesc} ${topicName}`;
        });

        let summary = descriptions.join(', ');

        // Add depth hunger if significant
        if (data.depthHunger > 0.7) {
          summary += ' | starving for meaningful conversation';
        } else if (data.depthHunger > 0.4) {
          summary += ' | desires deeper discussions';
        }

        // Add hungry topics if any
        const hungryTopics = data.interests.filter(i => i.discussionHunger > 0.7);
        if (hungryTopics.length > 0) {
          const topics = hungryTopics.map(i => i.topic.replace(/_/g, ' ')).slice(0, 2);
          summary += ` | eager to discuss: ${topics.join(', ')}`;
        }

        return summary;
      },
    },

    validate: (data): data is InterestsComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const i = data as any;

      return (
        i.type === 'interests' &&
        Array.isArray(i.interests) &&
        typeof i.depthHunger === 'number' &&
        i.depthHunger >= 0 &&
        i.depthHunger <= 1 &&
        Array.isArray(i.avoidTopics) &&
        typeof i.maxInterests === 'number'
      );
    },

    createDefault: () => ({
      type: 'interests',
      version: 1,
      interests: [],
      depthHunger: 0.0,
      avoidTopics: [],
      maxInterests: 10,
    }),
  })
);
