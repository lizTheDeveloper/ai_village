import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { EpisodicMemoryComponent } from '@ai-village/core';

/**
 * EpisodicMemorySchema - Introspection schema for EpisodicMemoryComponent
 *
 * Tier: Cognitive
 * Complexity: Large (event memories with emotional encoding)
 */
export const EpisodicMemorySchema = autoRegister(
  defineComponent<EpisodicMemoryComponent>({
    type: 'episodic_memory',
    version: 1,
    category: 'cognitive',

    fields: {
      episodicMemories: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: 'Rich event memories with emotional encoding',
        visibility: {
          player: false,
          llm: 'summarized',
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'memories',
          order: 1,
          icon: '💭',
        },
      },
      suppressedMemories: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        description: 'Suppressed memories in unconscious (dreams, trauma)',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'unconscious',
          order: 1,
          icon: '🌑',
        },
      },
    },

    ui: {
      icon: '💭',
      color: '#2196F3',
      priority: 7,
    },

    llm: {
      promptSection: 'Recent Memories',
      summarize: (data: EpisodicMemoryComponent) => {
        const memories = data.episodicMemories;

        if (memories.length === 0) {
          return 'No significant memories yet.';
        }

        // Get 5 most recent high-importance memories
        const recent = [...memories]
          .sort((a, b) => b.timestamp - a.timestamp)
          .filter(m => m.importance > 0.5)
          .slice(0, 5);

        if (recent.length === 0) {
          return `${memories.length} memories (mostly mundane)`;
        }

        const parts = recent.map(m => {
          const emotion = m.emotionalIntensity > 0.6
            ? ` (${m.emotionalValence > 0 ? 'positive' : 'negative'})`
            : '';
          return `${m.eventType}: ${m.summary}${emotion}`;
        });

        return parts.join('; ');
      },
    },

    validate: (data: unknown): data is EpisodicMemoryComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const comp = data as Record<string, unknown>;

      if (!('type' in comp) || comp.type !== 'episodic_memory') return false;
      if (!('episodicMemories' in comp) || !Array.isArray(comp.episodicMemories)) return false;
      if (!('suppressedMemories' in comp) || !Array.isArray(comp.suppressedMemories)) return false;

      return true;
    },

    createDefault: () => {
      const { createEpisodicMemoryComponent } = require('@ai-village/core');
      return createEpisodicMemoryComponent() as EpisodicMemoryComponent;
    },
  })
);
