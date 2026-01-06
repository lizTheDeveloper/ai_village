/**
 * Resource Component Schema
 *
 * Harvestable resource nodes (trees, rocks, berry bushes, etc.)
 * Phase 4, Tier 2 - World Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { Component } from '@ai-village/core';

/**
 * Resource type enum
 */
export type ResourceType = 'food' | 'wood' | 'stone' | 'water' | 'fiber' | 'leaves' | 'iron_ore' | 'coal' | 'copper_ore' | 'gold_ore';

/**
 * Resource component type
 * Matches: packages/core/src/components/ResourceComponent.ts
 */
export interface ResourceComponent extends Component {
  type: 'resource';
  version: 1;
  resourceType: ResourceType;
  amount: number;
  maxAmount: number;
  regenerationRate: number;
  harvestable: boolean;
  gatherDifficulty: number;
}

/**
 * Resource component schema
 */
export const ResourceSchema = autoRegister(
  defineComponent<ResourceComponent>({
    type: 'resource',
    version: 1,
    category: 'world',

    fields: {
      resourceType: {
        type: 'enum',
        enumValues: ['food', 'wood', 'stone', 'water', 'fiber', 'leaves', 'iron_ore', 'coal', 'copper_ore', 'gold_ore'] as const,
        required: true,
        displayName: 'Resource Type',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'resource',
          order: 1,
          icon: '🌳',
        },
        mutable: false,
      },

      amount: {
        type: 'number',
        required: true,
        default: 100,
        range: [0, 10000] as const,
        displayName: 'Amount',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'resource',
          order: 2,
          icon: '📊',
        },
        mutable: true,
      },

      maxAmount: {
        type: 'number',
        required: true,
        default: 100,
        range: [0, 10000] as const,
        displayName: 'Max Amount',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'resource',
          order: 3,
        },
        mutable: true,
      },

      regenerationRate: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 100] as const,
        displayName: 'Regeneration Rate',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'regeneration',
          order: 10,
          icon: '♻️',
        },
        mutable: true,
      },

      harvestable: {
        type: 'boolean',
        required: true,
        default: true,
        displayName: 'Harvestable',
        visibility: {
          player: false,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'harvesting',
          order: 20,
          icon: '⛏️',
        },
        mutable: true,
      },

      gatherDifficulty: {
        type: 'number',
        required: true,
        default: 1.0,
        range: [0.1, 10.0] as const,
        displayName: 'Difficulty',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'harvesting',
          order: 21,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🌳',
      color: '#4CAF50',
      priority: 5,
    },

    llm: {
      promptSection: 'resources',
      summarize: (data) => {
        const percent = Math.round((data.amount / data.maxAmount) * 100);
        const regen = data.regenerationRate > 0 ? ` (regens ${data.regenerationRate}/s)` : '';
        const difficulty = data.gatherDifficulty !== 1.0 ? ` [${data.gatherDifficulty}x difficulty]` : '';

        return `${data.resourceType}: ${data.amount}/${data.maxAmount} (${percent}%)${regen}${difficulty}`;
      },
      priority: 6,
    },

    validate: (data): data is ResourceComponent => {
      const d = data as any;

      if (!d || d.type !== 'resource') return false;
      if (typeof d.resourceType !== 'string') return false;
      if (typeof d.amount !== 'number' || d.amount < 0) {
        throw new RangeError(`Invalid amount: ${d.amount} (must be >= 0)`);
      }
      if (typeof d.maxAmount !== 'number' || d.maxAmount < 0) {
        throw new RangeError(`Invalid maxAmount: ${d.maxAmount} (must be >= 0)`);
      }
      if (typeof d.regenerationRate !== 'number' || d.regenerationRate < 0) {
        throw new RangeError(`Invalid regenerationRate: ${d.regenerationRate} (must be >= 0)`);
      }
      if (typeof d.harvestable !== 'boolean') return false;
      if (typeof d.gatherDifficulty !== 'number' || d.gatherDifficulty < 0.1 || d.gatherDifficulty > 10.0) {
        throw new RangeError(`Invalid gatherDifficulty: ${d.gatherDifficulty} (must be 0.1-10.0)`);
      }

      return true;
    },

    createDefault: () => ({
      type: 'resource',
      version: 1,
      resourceType: 'wood',
      amount: 100,
      maxAmount: 100,
      regenerationRate: 0,
      harvestable: true,
      gatherDifficulty: 1.0,
    }),
  })
);
