/**
 * Position Component Schema
 *
 * Core component for spatial positioning in 3D space.
 * Phase 4, Tier 1 - Core Components
 */

import { defineComponent, autoRegister, type Component } from '../index.js';

/**
 * Position component type
 * Matches: packages/core/src/components/PositionComponent.ts
 */
export interface PositionComponent extends Component {
  type: 'position';
  version: 1;
  /** X coordinate in tile units (horizontal) */
  x: number;
  /** Y coordinate in tile units (vertical in top-down, height in side-view) */
  y: number;
  /** Z coordinate - depth level (0 = surface, negative = underground, positive = above) */
  z: number;
  /** Chunk X coordinate (derived from x) */
  chunkX: number;
  /** Chunk Y coordinate (derived from y) */
  chunkY: number;
}

/**
 * Position component schema
 */
export const PositionSchema = autoRegister(
  defineComponent<PositionComponent>({
    type: 'position',
    version: 1,
    category: 'core',

    fields: {
      x: {
        type: 'number',
        required: true,
        default: 0,
        description: 'X coordinate in tile units (horizontal position)',
        displayName: 'X Position',
        visibility: {
          player: false, // Not shown directly to player (use minimap instead)
          llm: true, // LLM needs position for spatial reasoning
          agent: true, // Agent knows where they are
          user: false,
          dev: true, // Dev panel shows exact coordinates
        },
        ui: {
          widget: 'number',
          group: 'position',
          order: 1,
          icon: '↔️',
        },
        mutable: true, // Can be teleported
        mutateVia: 'setPosition', // Use mutator for chunk recalculation
      },

      y: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Y coordinate in tile units (vertical position)',
        displayName: 'Y Position',
        visibility: {
          player: false,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'position',
          order: 2,
          icon: '↕️',
        },
        mutable: true,
        mutateVia: 'setPosition',
      },

      z: {
        type: 'number',
        required: true,
        default: 0,
        description:
          'Z-depth level (0=surface, negative=underground, positive=above ground)',
        displayName: 'Z Level',
        visibility: {
          player: false,
          llm: true, // Important for "I'm in a cave" vs "I'm on a mountain"
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'position',
          order: 3,
          icon: '🏔️',
        },
        range: [-50, 50] as const, // Reasonable z-level range
        mutable: true,
        mutateVia: 'setPosition',
      },

      chunkX: {
        type: 'number',
        required: true,
        default: 0,
        description:
          'Chunk X coordinate (derived from x, used for spatial partitioning)',
        displayName: 'Chunk X',
        visibility: {
          player: false,
          llm: false, // Chunks are implementation detail
          agent: false,
          user: false,
          dev: true, // Devs need to see chunk boundaries
        },
        ui: {
          widget: 'readonly', // Derived field, can't edit directly
          group: 'debug',
          order: 10,
        },
        mutable: false, // Automatically calculated
      },

      chunkY: {
        type: 'number',
        required: true,
        default: 0,
        description:
          'Chunk Y coordinate (derived from y, used for spatial partitioning)',
        displayName: 'Chunk Y',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'debug',
          order: 11,
        },
        mutable: false,
      },
    },

    ui: {
      icon: '📍',
      color: '#2196F3',
      priority: 2, // Second most important (after identity)
    },

    llm: {
      promptSection: 'spatial',
      summarize: (data) => {
        const zDesc =
          data.z === 0
            ? 'surface'
            : data.z < 0
            ? `${Math.abs(data.z)} levels underground`
            : `${data.z} levels above ground`;
        return `Position: (${data.x.toFixed(1)}, ${data.y.toFixed(1)}) at ${zDesc}`;
      },
      priority: 8,
    },

    // Custom player renderer (show on minimap, not as text)
    renderers: {
      player: (data) => {
        // Return empty string - position shown on minimap, not in text UI
        return '';
      },
    },

    validate: (data): data is PositionComponent => {
      const d = data as any;
      return (
        d &&
        d.type === 'position' &&
        typeof d.x === 'number' &&
        typeof d.y === 'number' &&
        typeof d.z === 'number' &&
        typeof d.chunkX === 'number' &&
        typeof d.chunkY === 'number' &&
        !isNaN(d.x) &&
        !isNaN(d.y) &&
        !isNaN(d.z) &&
        !isNaN(d.chunkX) &&
        !isNaN(d.chunkY)
      );
    },

    createDefault: () => ({
      type: 'position',
      version: 1,
      x: 0,
      y: 0,
      z: 0,
      chunkX: 0,
      chunkY: 0,
    }),

    mutators: {
      setPosition: (entity, x: number, y: number, z?: number) => {
        if (typeof x !== 'number' || typeof y !== 'number') {
          throw new TypeError('x and y must be numbers');
        }
        if (isNaN(x) || isNaN(y)) {
          throw new RangeError('x and y must not be NaN');
        }
        if (z !== undefined && (typeof z !== 'number' || isNaN(z))) {
          throw new RangeError('z must be a number and not NaN');
        }

        const pos = entity.getComponent('position');
        if (!pos) {
          throw new Error('Entity has no position component');
        }

        // Import CHUNK_SIZE from core types
        const CHUNK_SIZE = 32;

        pos.x = x;
        pos.y = y;
        if (z !== undefined) {
          pos.z = z;
        }
        // Recalculate chunk coordinates
        pos.chunkX = Math.floor(x / CHUNK_SIZE);
        pos.chunkY = Math.floor(y / CHUNK_SIZE);
      },

      teleport: (entity, x: number, y: number, z?: number) => {
        // Alias for setPosition (for semantic clarity)
        const pos = entity.getComponent('position');
        if (!pos) {
          throw new Error('Entity has no position component');
        }
        const CHUNK_SIZE = 32;
        pos.x = x;
        pos.y = y;
        if (z !== undefined) pos.z = z;
        pos.chunkX = Math.floor(x / CHUNK_SIZE);
        pos.chunkY = Math.floor(y / CHUNK_SIZE);
      },
    },
  })
);
