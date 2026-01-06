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
      const comp = data as any;
      return (
        comp.type === 'animation' &&
        Array.isArray(comp.frames) &&
        typeof comp.currentFrame === 'number' &&
        typeof comp.frameTime === 'number' &&
        typeof comp.frameDuration === 'number' &&
        typeof comp.loop === 'boolean' &&
        typeof comp.playing === 'boolean'
      );
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
