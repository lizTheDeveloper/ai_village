/**
 * Exploration State Component Schema
 *
 * Tracks explored territory and exploration algorithms
 * Phase 4, Tier 2 - Agent Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { Component } from '@ai-village/core';

/**
 * Exploration mode type
 */
export type ExplorationMode = 'frontier' | 'spiral' | 'none';

/**
 * Exploration state component type (simplified for schema)
 * Matches: packages/core/src/components/ExplorationStateComponent.ts
 */
export interface ExplorationStateComponent extends Component {
  type: 'exploration_state';
  version: 1;
  mode?: ExplorationMode;
  currentTarget?: { x: number; y: number };
  homeBase?: { x: number; y: number };
  explorationRadius: number;
  exploredSectorCount: number;
}

/**
 * Exploration state component schema
 */
export const ExplorationStateSchema = autoRegister(
  defineComponent<ExplorationStateComponent>({
    type: 'exploration_state',
    version: 1,
    category: 'agent',

    fields: {
      mode: {
        type: 'enum',
        enumValues: ['frontier', 'spiral', 'none'] as const,
        required: false,
        default: 'frontier',
        description: 'Current exploration algorithm',
        displayName: 'Mode',
        visibility: {
          player: false,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'exploration',
          order: 1,
          icon: '🧭',
        },
        mutable: true,
      },

      currentTarget: {
        type: 'object',
        required: false,
        description: 'Current exploration target position',
        displayName: 'Current Target',
        visibility: {
          player: false,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'exploration',
          order: 2,
          icon: '🎯',
        },
        mutable: true,
      },

      homeBase: {
        type: 'object',
        required: false,
        description: 'Home base position for spiral exploration',
        displayName: 'Home Base',
        visibility: {
          player: false,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'exploration',
          order: 3,
          icon: '🏠',
        },
        mutable: true,
      },

      explorationRadius: {
        type: 'number',
        required: true,
        default: 64,
        range: [0, 1000] as const,
        description: 'Exploration radius in tiles',
        displayName: 'Radius',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'exploration',
          order: 10,
        },
        mutable: true,
      },

      exploredSectorCount: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 100000] as const,
        description: 'Number of sectors explored',
        displayName: 'Sectors Explored',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'exploration',
          order: 11,
          icon: '🗺️',
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🧭',
      color: '#03A9F4',
      priority: 6,
    },

    llm: {
      promptSection: 'exploration',
      summarize: (data) => {
        const mode = data.mode || 'none';
        const sectors = data.exploredSectorCount;
        const radius = data.explorationRadius;

        const parts: string[] = [
          `Mode: ${mode}`,
          `${sectors} sectors explored`,
          `radius ${radius} tiles`,
        ];

        if (data.currentTarget) {
          parts.push(`target (${data.currentTarget.x}, ${data.currentTarget.y})`);
        }

        return parts.join(', ');
      },
      priority: 7,
    },

    validate: (data): data is ExplorationStateComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const d = data as Record<string, unknown>;

      if (!('type' in d) || d.type !== 'exploration_state') return false;

      if ('mode' in d && d.mode !== undefined) {
        if (typeof d.mode !== 'string' || !['frontier', 'spiral', 'none'].includes(d.mode)) {
          return false;
        }
      }

      if ('currentTarget' in d && d.currentTarget !== undefined) {
        if (typeof d.currentTarget !== 'object' || d.currentTarget === null) return false;
        const target = d.currentTarget as Record<string, unknown>;
        if (!('x' in target) || typeof target.x !== 'number') return false;
        if (!('y' in target) || typeof target.y !== 'number') return false;
      }

      if ('homeBase' in d && d.homeBase !== undefined) {
        if (typeof d.homeBase !== 'object' || d.homeBase === null) return false;
        const home = d.homeBase as Record<string, unknown>;
        if (!('x' in home) || typeof home.x !== 'number') return false;
        if (!('y' in home) || typeof home.y !== 'number') return false;
      }

      if (!('explorationRadius' in d) || typeof d.explorationRadius !== 'number' || d.explorationRadius < 0) {
        throw new RangeError(`Invalid explorationRadius: ${d.explorationRadius} (must be >= 0)`);
      }

      if (!('exploredSectorCount' in d) || typeof d.exploredSectorCount !== 'number' || d.exploredSectorCount < 0) {
        throw new RangeError(`Invalid exploredSectorCount: ${d.exploredSectorCount} (must be >= 0)`);
      }

      return true;
    },

    createDefault: () => ({
      type: 'exploration_state',
      version: 1,
      mode: 'frontier',
      explorationRadius: 64,
      exploredSectorCount: 0,
    }),
  })
);
