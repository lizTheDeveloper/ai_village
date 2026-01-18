import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { AnimationComponent } from '@ai-village/core';

/**
 * AnimationSchema - Introspection schema for AnimationComponent
 *
 * Frame-based animation system for sprite cycling.
 */
export const AnimationSchema = autoRegister(
  defineComponent<AnimationComponent>({
    type: 'animation',
    version: 1,
    category: 'system',

    fields: {
      frames: {
        type: 'array',
        required: true,
        default: [],
        displayName: 'Frames',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'animation',
          order: 1,
        },
      },

      currentFrame: {
        type: 'number',
        required: true,
        default: 0,
        displayName: 'Current Frame',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'state',
          order: 2,
        },
      },

      frameDuration: {
        type: 'number',
        required: true,
        default: 0.2,
        range: [0.01, 10] as const,
        displayName: 'Frame Duration',
        visibility: {
          player: false,
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

      loop: {
        type: 'boolean',
        required: true,
        default: true,
        displayName: 'Loop',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'config',
          order: 4,
        },
        mutable: true,
      },

      playing: {
        type: 'boolean',
        required: true,
        default: true,
        displayName: 'Playing',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'state',
          order: 5,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🎬',
      color: '#9C27B0',
      priority: 9,
    },

    llm: {
      promptSection: 'Visual',
      summarize: (data: AnimationComponent) => {
        const status = data.playing ? 'playing' : 'paused';
        return `Animation: ${data.frames.length} frames, ${status}`;
      },
    },

    validate: (data: unknown): data is AnimationComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const comp = data as Record<string, unknown>;

      // Check type field
      if (!('type' in comp) || comp.type !== 'animation') return false;

      // Check required array field
      if (!('frames' in comp) || !Array.isArray(comp.frames)) return false;

      // Check required number fields
      if (!('currentFrame' in comp) || typeof comp.currentFrame !== 'number') return false;
      if (!('frameTime' in comp) || typeof comp.frameTime !== 'number') return false;
      if (!('frameDuration' in comp) || typeof comp.frameDuration !== 'number') return false;

      // Check required boolean fields
      if (!('loop' in comp) || typeof comp.loop !== 'boolean') return false;
      if (!('playing' in comp) || typeof comp.playing !== 'boolean') return false;

      return true;
    },

    createDefault: () => ({
      type: 'animation',
      version: 1,
      frames: [],
      currentFrame: 0,
      frameTime: 0,
      frameDuration: 0.2,
      loop: true,
      playing: true,
    } as AnimationComponent),
  })
);
