/**
 * Belt Component Schema
 *
 * Conveyor belt that moves items.
 * Simplified for performance: tracks item COUNT, not individual positions.
 *
 * Phase 4+, Tier 12 - Buildings/Infrastructure Components
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Belt component type
 */
export interface BeltComponent extends Component {
  type: 'belt';
  version: 1;

  direction: 'north' | 'south' | 'east' | 'west';
  tier: 1 | 2 | 3;
  itemId: string | null;
  count: number;
  capacity: number;
  transferProgress: number;
}

/**
 * Belt component schema
 */
export const BeltSchema = autoRegister(
  defineComponent<BeltComponent>({
    type: 'belt',
    version: 1,
    category: 'world',

    fields: {
      direction: {
        type: 'string',
        required: true,
        default: 'east',
        description: 'Direction belt moves items',
        displayName: 'Direction',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'dropdown',
          group: 'belt',
          order: 1,
          icon: '➡️',
        },
        mutable: true,
        enumValues: ['north', 'south', 'east', 'west'],
      },

      tier: {
        type: 'number',
        required: true,
        default: 1,
        description: 'Belt tier (affects speed): 1=wooden, 2=electric, 3=advanced',
        displayName: 'Tier',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'dropdown',
          group: 'belt',
          order: 2,
        },
        mutable: false,
        enumValues: [1, 2, 3],
      },

      itemId: {
        type: 'string',
        required: false,
        default: null,
        description: 'Item type currently on this belt (null if empty)',
        displayName: 'Item Type',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'text',
          group: 'items',
          order: 1,
        },
        mutable: true,
      },

      count: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Number of items on this belt segment',
        displayName: 'Count',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'slider',
          group: 'items',
          order: 2,
        },
        mutable: true,
        min: 0,
        max: 100,
      },

      capacity: {
        type: 'number',
        required: true,
        default: 8,
        description: 'Maximum items per belt segment',
        displayName: 'Capacity',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: {
          widget: 'slider',
          group: 'items',
          order: 3,
        },
        mutable: false,
        min: 1,
        max: 20,
      },

      transferProgress: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Accumulated transfer progress (0.0 - 1.0)',
        displayName: 'Transfer Progress',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'slider',
          group: 'internal',
          order: 1,
        },
        mutable: true,
        min: 0,
        max: 1,
      },
    },

    ui: {
      icon: '🔃',
      color: '#FFA500',
      priority: 12,
    },

    llm: {
      promptSection: 'machines',
      priority: 12,
      summarize: (data) => {
        const tierNames = { 1: 'wooden', 2: 'electric', 3: 'advanced' };
        const tierName = tierNames[data.tier] || `tier ${data.tier}`;

        if (data.count === 0) {
          return `${tierName} belt (${data.direction}): empty`;
        }

        return `${tierName} belt (${data.direction}): ${data.count}/${data.capacity} ${data.itemId || 'items'}`;
      },
    },

    validate: (data): data is BeltComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const b = data as any;

      return (
        b.type === 'belt' &&
        typeof b.direction === 'string' &&
        typeof b.tier === 'number' &&
        (b.itemId === null || typeof b.itemId === 'string') &&
        typeof b.count === 'number' &&
        typeof b.capacity === 'number' &&
        typeof b.transferProgress === 'number'
      );
    },

    createDefault: () => ({
      type: 'belt',
      version: 1,
      direction: 'east',
      tier: 1,
      itemId: null,
      count: 0,
      capacity: 8,
      transferProgress: 0,
    }),
  })
);
