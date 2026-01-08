/**
 * Social Memory Component Schema
 *
 * Tracks social memories, impressions, and learned facts about other agents.
 * Represents an agent's knowledge of others' personalities, behaviors, and skills.
 *
 * Phase 4, Tier 4 - Social Components
 */

import { defineComponent, autoRegister, type Component } from '../index.js';

/**
 * Single impression of another agent
 */
export interface Impression {
  text: string;
  timestamp: number;
}

/**
 * Fact learned about another agent
 */
export interface KnownFact {
  fact: string;
  confidence: number; // 0-1
  source: string;
}

/**
 * Complete social memory about one agent
 */
export interface SocialMemory {
  agentId: string;
  overallSentiment: number; // -1 to 1
  trust: number; // 0 to 1
  impressions: readonly Impression[];
  significantMemories: readonly string[]; // Episodic memory IDs
  relationshipType: string; // 'friend', 'rival', 'stranger', etc.
  interactionCount: number;
  lastInteraction: number;
  firstMeeting: number;
  lastEmotionalValence: number; // -1 to 1
  knownFacts: readonly KnownFact[];
}

/**
 * Social memory component interface
 * Note: This uses a class-based implementation in the core package,
 * but the schema represents the data structure
 */
export interface SocialMemoryData extends Component {
  type: 'social_memory';
  version: 1;
  socialMemories: ReadonlyMap<string, SocialMemory>;
}

/**
 * Social memory component schema
 */
export const SocialMemorySchema = autoRegister(
  defineComponent<SocialMemoryData>({
    type: 'social_memory',
    version: 1,
    category: 'social',

    fields: {
      socialMemories: {
        type: 'map',
        itemType: 'object',
        required: true,
        default: new Map(),
        description: 'Map of agent ID to social memory data',
        displayName: 'Social Memories',
        visibility: {
          player: false, // Too detailed for player UI
          llm: 'summarized', // Summarize for LLM context
          agent: true, // Agents are aware of their memories
          dev: true,
        },
        ui: {
          widget: 'json', // Complex nested structure
          group: 'social',
          order: 2,
          icon: '🧠',
        },
        mutable: false, // Use component methods for updates
      },
    },

    ui: {
      icon: '💭',
      color: '#9C27B0',
      priority: 5, // Lower priority than direct relationships
    },

    llm: {
      promptSection: 'social_knowledge',
      summarize: (data) => {
        // Guard against undefined or missing socialMemories property
        if (!data.socialMemories || typeof data.socialMemories.values !== 'function') {
          return 'No social memories';
        }

        const memories = Array.from(data.socialMemories.values());

        if (memories.length === 0) {
          return 'No social memories';
        }

        // Get most significant relationships
        const significant = memories
          .filter((m) => m.interactionCount > 3)
          .sort((a, b) => b.interactionCount - a.interactionCount)
          .slice(0, 5);

        if (significant.length === 0) {
          return `Brief encounters with ${memories.length} agents`;
        }

        // Group by relationship type for cleaner summary
        const byType = new Map<string, typeof significant>();
        for (const memory of significant) {
          const type = memory.relationshipType;
          if (!byType.has(type)) {
            byType.set(type, []);
          }
          byType.get(type)!.push(memory);
        }

        const summaries: string[] = [];
        for (const [type, group] of byType) {
          const count = group.length;
          const avgSentiment = group.reduce((sum, m) => sum + m.overallSentiment, 0) / count;
          const avgTrust = group.reduce((sum, m) => sum + m.trust, 0) / count;

          const sentimentStr = avgSentiment > 0.3 ? 'positive' : avgSentiment < -0.3 ? 'negative' : 'neutral';
          const trustStr = avgTrust > 0.7 ? 'high trust' : avgTrust < 0.3 ? 'low trust' : 'moderate trust';

          summaries.push(`${count} ${type}${count > 1 ? 's' : ''} (${sentimentStr}, ${trustStr})`);
        }

        return summaries.join(', ');
      },
      priority: 3, // Important for understanding social context
    },

    renderers: {
      player: (data) => {
        // Simple count for player UI
        if (!data.socialMemories || typeof data.socialMemories.size !== 'number') {
          return 'No memories';
        }
        const count = data.socialMemories.size;
        if (count === 0) return 'No memories';
        return `${count} social memories`;
      },
    },

    // Mutators for safe memory updates
    mutators: {
      recordInteraction: (
        entity: any,
        agentId: string,
        sentiment: number,
        timestamp: number,
        impression?: string
      ) => {
        const component = entity.getComponent('social_memory');

        // Validate input
        if (sentiment < -1 || sentiment > 1) {
          throw new Error('Sentiment must be between -1 and 1');
        }

        // Use component's recordInteraction method
        component.recordInteraction({
          agentId,
          interactionType: 'general',
          sentiment,
          timestamp,
          impression,
        });
      },

      learnFact: (
        entity: any,
        agentId: string,
        fact: string,
        confidence: number,
        source: string
      ) => {
        const component = entity.getComponent('social_memory');

        // Validate input
        if (confidence < 0 || confidence > 1) {
          throw new Error('Confidence must be between 0 and 1');
        }

        if (!fact || fact.trim() === '') {
          throw new Error('Fact cannot be empty');
        }

        // Use component's learnAboutAgent method
        component.learnAboutAgent({
          agentId,
          fact,
          confidence,
          source,
        });
      },
    },

    validate: (data): data is SocialMemoryData => {
      if (typeof data !== 'object' || data === null) return false;
      if ((data as any).type !== 'social_memory') return false;
      if ((data as any).version !== 1) return false;

      const memories = (data as any).socialMemories;
      if (!(memories instanceof Map)) return false;

      // Validate at least one memory entry if map is not empty
      for (const [key, value] of memories) {
        if (typeof key !== 'string') return false;
        if (typeof value !== 'object' || value === null) return false;

        const mem = value as any;
        if (typeof mem.agentId !== 'string') return false;
        if (typeof mem.overallSentiment !== 'number') return false;
        if (typeof mem.trust !== 'number') return false;
        if (typeof mem.relationshipType !== 'string') return false;
        if (!Array.isArray(mem.impressions)) return false;
        if (!Array.isArray(mem.knownFacts)) return false;

        // Only check first entry
        break;
      }

      return true;
    },

    createDefault: (): SocialMemoryData => ({
      type: 'social_memory',
      version: 1,
      socialMemories: new Map(),
    }),
  })
);
