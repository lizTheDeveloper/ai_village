import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { PhysicsComponent } from '@ai-village/core';

/**
 * PhysicsSchema - Introspection schema for PhysicsComponent
 *
 * Defines collision detection and physical space occupation.
 */
export const PhysicsSchema = autoRegister(
  defineComponent<PhysicsComponent>({
    type: 'physics',
    version: 1,
    category: 'physical',

    fields: {
      solid: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Whether entity blocks movement',
        displayName: 'Solid',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'collision',
          order: 1,
        },
        mutable: true,
      },

      width: {
        type: 'number',
        required: true,
        default: 1,
        range: [0.1, 100] as const,
        description: 'Physical width in tiles',
        displayName: 'Width',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'dimensions',
          order: 2,
        },
        mutable: true,
      },

      height: {
        type: 'number',
        required: true,
        default: 1,
        range: [0.1, 100] as const,
        description: 'Physical height in tiles',
        displayName: 'Height',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'dimensions',
          order: 3,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🔲',
      color: '#9E9E9E',
      priority: 8,
    },

    llm: {
      promptSection: 'Physical Properties',
      summarize: (data: PhysicsComponent) => {
        const solidDesc = data.solid ? 'solid' : 'non-solid';
        return `${data.width}×${data.height} tiles, ${solidDesc}`;
      },
    },

    validate: (data: unknown): data is PhysicsComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const comp = data as Record<string, unknown>;

      // Required type field
      if (!('type' in comp) || comp.type !== 'physics') return false;

      // Required fields
      if (!('solid' in comp) || typeof comp.solid !== 'boolean') return false;
      if (!('width' in comp) || typeof comp.width !== 'number') return false;
      if (!('height' in comp) || typeof comp.height !== 'number') return false;

      // Validation constraints
      if (comp.width <= 0 || comp.height <= 0) return false;

      return true;
    },

    createDefault: () => ({
      type: 'physics',
      version: 1,
      solid: false,
      width: 1,
      height: 1,
    } as PhysicsComponent),
  })
);
