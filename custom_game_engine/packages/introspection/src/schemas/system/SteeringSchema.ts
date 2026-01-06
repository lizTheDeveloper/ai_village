import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { SteeringComponent } from '@ai-village/core';

/**
 * SteeringSchema - Introspection schema for SteeringComponent
 *
 * Tier 8: System components
 * Complexity: Small (internal steering behaviors)
 */
export const SteeringSchema = autoRegister(
  defineComponent<SteeringComponent>({
    type: 'steering',
    version: 1,
    category: 'system',

    fields: {
      behavior: {
        type: 'enum',
        enumValues: ['seek', 'arrive', 'obstacle_avoidance', 'wander', 'combined', 'none'] as const,
        required: true,
        default: 'none',
        visibility: {
          player: false,  // Internal system detail
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'steering',
          order: 1,
        },
        mutable: true,
      },

      maxSpeed: {
        type: 'number',
        range: [0, 100],
        required: true,
        default: 2,
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'parameters',
          order: 2,
        },
        mutable: true,
      },

      maxForce: {
        type: 'number',
        range: [0, 10],
        required: true,
        default: 0.5,
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'parameters',
          order: 3,
        },
        mutable: true,
      },

      target: {
        type: 'object',
        required: false,
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'state',
          order: 4,
        },
      },

      slowingRadius: {
        type: 'number',
        range: [0, 500],
        required: true,
        default: 50,
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'parameters',
          order: 5,
        },
        mutable: true,
      },

      arrivalTolerance: {
        type: 'number',
        range: [0, 50],
        required: true,
        default: 2,
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'parameters',
          order: 6,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🎯',
      color: '#607D8B',
      priority: 10,
    },

    llm: {
      promptSection: 'Internal Systems',
      summarize: (data: SteeringComponent) => {
        if (data.behavior === 'none') return 'No active steering';
        const target = data.target ? ` to (${data.target.x}, ${data.target.y})` : '';
        return `${data.behavior}${target}`;
      },
    },

    validate: (data: unknown): data is SteeringComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const comp = data as any;
      return typeof comp.behavior === 'string'
        && typeof comp.maxSpeed === 'number'
        && typeof comp.maxForce === 'number';
    },

    createDefault: () => ({
      type: 'steering',
      version: 1,
      behavior: 'none',
      maxSpeed: 2,
      maxForce: 0.5,
      slowingRadius: 50,
      arrivalTolerance: 2,
      deadZone: 0,
    } as SteeringComponent),
  })
);
