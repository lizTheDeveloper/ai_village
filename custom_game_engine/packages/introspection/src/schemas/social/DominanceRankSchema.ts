import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { DominanceRankComponent } from '@ai-village/core';

/**
 * DominanceRankSchema - Introspection schema for DominanceRankComponent
 *
 * Tier: Social (Hierarchy system)
 * Complexity: Small (rank and subordinates)
 */
export const DominanceRankSchema = autoRegister(
  defineComponent<DominanceRankComponent>({
    type: 'dominance_rank',
    version: 1,
    category: 'social',

    fields: {
      rank: {
        type: 'number',
        required: true,
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'hierarchy',
          order: 1,
          icon: '👑',
        },
      },
      subordinates: {
        type: 'array',
        itemType: 'string',
        required: true,
        default: [],
        visibility: {
          player: false,
          llm: 'summarized',
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'hierarchy',
          order: 2,
          icon: '👥',
        },
      },
      canChallengeAbove: {
        type: 'boolean',
        required: true,
        default: true,
        visibility: {
          player: false,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'abilities',
          order: 1,
          icon: '⚔️',
        },
      },
    },

    ui: {
      icon: '👑',
      color: '#FF9800',
      priority: 4,
    },

    llm: {
      promptSection: 'Social Rank',
      summarize: (data: DominanceRankComponent) => {
        const parts: string[] = [];

        if (data.rank === 1) {
          parts.push('Alpha (rank 1)');
        } else {
          parts.push(`Rank ${data.rank}`);
        }

        if (data.subordinates.length > 0) {
          parts.push(`${data.subordinates.length} subordinates`);
        }

        if (!data.canChallengeAbove) {
          parts.push('cannot challenge');
        }

        return parts.join(', ');
      },
    },

    validate: (data: unknown): data is DominanceRankComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const x = data as Record<string, unknown>;

      // Check type field
      if (!('type' in x) || x.type !== 'dominance_rank') return false;

      // Check required fields
      if (!('rank' in x) || typeof x.rank !== 'number') return false;
      if (!('subordinates' in x) || !Array.isArray(x.subordinates)) return false;
      if (!('canChallengeAbove' in x) || typeof x.canChallengeAbove !== 'boolean') return false;

      // Validate subordinates array items
      for (const item of x.subordinates) {
        if (typeof item !== 'string') return false;
      }

      return true;
    },

    createDefault: () => {
      const { createDominanceRankComponent } = require('@ai-village/core');
      return createDominanceRankComponent({ rank: 999 }) as DominanceRankComponent;
    },
  })
);
