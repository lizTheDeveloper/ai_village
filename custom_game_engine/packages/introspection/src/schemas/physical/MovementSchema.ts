import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { MovementComponent } from '@ai-village/core';

/**
 * MovementSchema - Introspection schema for MovementComponent
 *
 * Tracks velocity and movement state for entities that can move.
 */
export const MovementSchema = autoRegister(
  defineComponent<MovementComponent>({
    type: 'movement',
    version: 1,
    category: 'physical',

    fields: {
      velocityX: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Horizontal velocity in tiles per second',
        displayName: 'Velocity X',
        visibility: {
          player: false,
          llm: false,  // Too low-level for LLM
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'velocity',
          order: 1,
        },
        mutable: true,
      },

      velocityY: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Vertical velocity in tiles per second',
        displayName: 'Velocity Y',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'velocity',
          order: 2,
        },
        mutable: true,
      },

      speed: {
        type: 'number',
        required: true,
        default: 83,
        range: [0, 500] as const,
        description: 'Base movement speed (tiles per second)',
        displayName: 'Speed',
        visibility: {
          player: true,  // Players care about movement speed
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'config',
          order: 3,
        },
        mutable: true,
      },

      targetX: {
        type: 'number',
        required: false,
        description: 'Target X position for movement',
        displayName: 'Target X',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'target',
          order: 4,
        },
      },

      targetY: {
        type: 'number',
        required: false,
        description: 'Target Y position for movement',
        displayName: 'Target Y',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'target',
          order: 5,
        },
      },
    },

    ui: {
      icon: '🏃',
      color: '#4CAF50',
      priority: 6,
    },

    llm: {
      promptSection: 'Physical State',
      summarize: (data: MovementComponent) => {
        const moving = data.velocityX !== 0 || data.velocityY !== 0;
        if (!moving) {
          return 'Stationary';
        }
        const speed = Math.sqrt(data.velocityX ** 2 + data.velocityY ** 2).toFixed(1);
        return `Moving at ${speed} tiles/sec`;
      },
    },

    validate: (data: unknown): data is MovementComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const comp = data as any;
      return (
        comp.type === 'movement' &&
        typeof comp.velocityX === 'number' &&
        typeof comp.velocityY === 'number' &&
        typeof comp.speed === 'number' &&
        !isNaN(comp.velocityX) &&
        !isNaN(comp.velocityY) &&
        !isNaN(comp.speed)
      );
    },

    createDefault: () => ({
      type: 'movement',
      version: 1,
      velocityX: 0,
      velocityY: 0,
      speed: 83,
    } as MovementComponent),
  })
);
