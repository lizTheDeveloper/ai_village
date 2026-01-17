import type { Component, ComponentSchema } from '../ecs/Component.js';

/**
 * Frame-based animation component.
 * Cycles through sprite frames at a fixed rate.
 */
export interface AnimationComponent extends Component {
  type: 'animation';
  /** Array of sprite IDs to cycle through */
  frames: string[];
  /** Current frame index */
  currentFrame: number;
  /** Time accumulated in current frame (seconds) */
  frameTime: number;
  /** Duration of each frame (seconds) */
  frameDuration: number;
  /** Whether to loop the animation */
  loop: boolean;
  /** Whether the animation is currently playing */
  playing: boolean;
}

/**
 * Create an animation component.
 */
export function createAnimationComponent(
  frames: string[],
  frameDuration: number = 0.2,
  loop: boolean = true
): AnimationComponent {
  return {
    type: 'animation',
    version: 1,
    frames,
    currentFrame: 0,
    frameTime: 0,
    frameDuration,
    loop,
    playing: true,
  };
}

/**
 * Animation component schema.
 */
export const AnimationComponentSchema: ComponentSchema<AnimationComponent> = {
  type: 'animation',
  version: 1,
  fields: [
    { name: 'frames', type: 'stringArray', required: true },
    { name: 'currentFrame', type: 'number', required: true, default: 0 },
    { name: 'frameTime', type: 'number', required: true, default: 0 },
    { name: 'frameDuration', type: 'number', required: true, default: 0.2 },
    { name: 'loop', type: 'boolean', required: true, default: true },
    { name: 'playing', type: 'boolean', required: true, default: true },
  ],
  validate: (data: unknown): data is AnimationComponent => {
    // Type guard: Check if data is an object with required properties
    if (!data || typeof data !== 'object') return false;

    const d = data as Record<string, unknown>;
    return (
      d.type === 'animation' &&
      Array.isArray(d.frames) &&
      typeof d.currentFrame === 'number' &&
      typeof d.frameTime === 'number' &&
      typeof d.frameDuration === 'number' &&
      typeof d.loop === 'boolean' &&
      typeof d.playing === 'boolean'
    );
  },
  createDefault: () => createAnimationComponent([]),
};
