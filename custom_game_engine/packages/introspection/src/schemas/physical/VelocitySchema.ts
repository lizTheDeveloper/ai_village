/**
 * Velocity Component Schema
 *
 * Stores velocity for steering system
 * Phase 4, Batch 4 - Core Gameplay Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { VelocityComponent } from '@ai-village/core';

/**
 * Velocity component schema
 */
export const VelocitySchema = autoRegister(
  defineComponent<VelocityComponent>({
    type: 'velocity',
    version: 1,
    category: 'physical',
    description: 'Velocity vector for steering system',

    fields: {
      vx: {
        type: 'number',
        required: true,
        default: 0,
        range: [-100, 100] as const,
        description: 'Velocity X component',
        displayName: 'VX',
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
          order: 1,
        },
        mutable: true,
      },

      vy: {
        type: 'number',
        required: true,
        default: 0,
        range: [-100, 100] as const,
        description: 'Velocity Y component',
        displayName: 'VY',
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
    },

    ui: {
      icon: '➡️',
      color: '#FF5722',
      priority: 9,
      devToolsPanel: false,
    },

    llm: {
      promptSection: 'physics',
      summarize: (data: VelocityComponent) => {
        const speed = Math.sqrt(data.vx * data.vx + data.vy * data.vy).toFixed(1);
        return `velocity: (${data.vx.toFixed(1)}, ${data.vy.toFixed(1)}) speed: ${speed}`;
      },
    },

    createDefault: (): VelocityComponent => {
      const VelocityComponentClass = require('@ai-village/core').VelocityComponent;
      return new VelocityComponentClass({ vx: 0, vy: 0 });
    },
  })
);
