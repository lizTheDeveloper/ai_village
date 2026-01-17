/**
 * Renderable Component Schema
 *
 * Core component for visual rendering (sprite display, layers, visibility).
 * Phase 4, Tier 1 - Core Components
 */

import { defineComponent, autoRegister, type Component } from '../index.js';

/**
 * Render layer for z-ordering
 */
export type RenderLayer =
  | 'terrain'
  | 'floor'
  | 'building'
  | 'object'
  | 'entity'
  | 'effect'
  | 'ui';

/**
 * Renderable component type
 * Matches: packages/core/src/components/RenderableComponent.ts
 */
export interface RenderableComponent extends Component {
  type: 'renderable';
  version: 1;
  spriteId: string;
  layer: RenderLayer;
  visible: boolean;
  animationState?: string;
  tint?: string;
  sizeMultiplier?: number;
  alpha?: number;
}

/**
 * Renderable component schema
 */
export const RenderableSchema = autoRegister(
  defineComponent<RenderableComponent>({
    type: 'renderable',
    version: 1,
    category: 'core',

    fields: {
      spriteId: {
        type: 'string',
        required: true,
        default: 'default',
        description: 'Sprite asset ID for rendering',
        displayName: 'Sprite',
        visibility: {
          player: false, // Player sees the sprite, not the ID
          llm: false, // LLM doesn't need sprite IDs
          agent: false,
          user: false,
          dev: true, // Dev panel shows sprite ID for debugging
        },
        ui: {
          widget: 'text',
          group: 'rendering',
          order: 1,
          icon: '🎨',
        },
        mutable: true, // Can change appearance
      },

      layer: {
        type: 'enum',
        enumValues: [
          'terrain',
          'floor',
          'building',
          'object',
          'entity',
          'effect',
          'ui',
        ] as const,
        required: true,
        default: 'object',
        description: 'Render layer for z-ordering (determines draw order)',
        displayName: 'Render Layer',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'rendering',
          order: 2,
        },
        mutable: true,
      },

      visible: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Whether the entity is visible (can be hidden)',
        displayName: 'Visible',
        visibility: {
          player: false,
          llm: false,
          agent: true, // Agent might know they're invisible
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'rendering',
          order: 3,
          icon: '👁️',
        },
        mutable: true,
      },

      animationState: {
        type: 'string',
        required: false,
        description: 'Current animation state (e.g., "walking", "idle")',
        displayName: 'Animation',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'animation',
          order: 10,
        },
        mutable: true,
      },

      tint: {
        type: 'string',
        required: false,
        description: 'Hex color for sprite tinting (e.g., #FF0000 for red tint)',
        displayName: 'Tint Color',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'color',
          group: 'effects',
          order: 20,
          icon: '🎨',
        },
        mutable: true,
      },

      sizeMultiplier: {
        type: 'number',
        required: false,
        default: 1.0,
        range: [0.1, 10.0] as const,
        description:
          'Visual scale factor (1.0 = normal, 2.0 = double size)',
        displayName: 'Size',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'effects',
          order: 21,
          icon: '🔍',
        },
        mutable: true,
      },

      alpha: {
        type: 'number',
        required: false,
        default: 1.0,
        range: [0.0, 1.0] as const,
        description: 'Opacity (0.0 = transparent, 1.0 = opaque)',
        displayName: 'Opacity',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'effects',
          order: 22,
          icon: '💧',
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🎨',
      color: '#9C27B0',
      priority: 3, // Third in importance (after identity and position)
    },

    llm: {
      promptSection: 'appearance',
      summarize: (data) => {
        // LLM doesn't need rendering details - they infer appearance from identity/species
        return ''; // Empty - not included in prompts
      },
      priority: 0, // Not included in LLM prompts
    },

    validate: (data): data is RenderableComponent => {
      if (typeof data !== 'object' || data === null) {
        return false;
      }
      const d = data as Record<string, unknown>;

      if (!('type' in d) || d.type !== 'renderable') return false;
      if (!('spriteId' in d) || typeof d.spriteId !== 'string') return false;
      if (!('layer' in d) || typeof d.layer !== 'string') return false;
      if (!('visible' in d) || typeof d.visible !== 'boolean') return false;

      // Validate optional fields
      if ('animationState' in d && d.animationState !== undefined && typeof d.animationState !== 'string') {
        return false;
      }

      if ('tint' in d && d.tint !== undefined && typeof d.tint !== 'string') {
        return false;
      }

      if ('sizeMultiplier' in d && d.sizeMultiplier !== undefined) {
        if (
          typeof d.sizeMultiplier !== 'number' ||
          d.sizeMultiplier < 0.1 ||
          d.sizeMultiplier > 10.0
        ) {
          throw new RangeError(
            `Invalid sizeMultiplier: ${d.sizeMultiplier} (must be 0.1-10.0)`
          );
        }
      }

      if ('alpha' in d && d.alpha !== undefined) {
        if (typeof d.alpha !== 'number' || d.alpha < 0.0 || d.alpha > 1.0) {
          throw new RangeError(`Invalid alpha: ${d.alpha} (must be 0.0-1.0)`);
        }
      }

      return true;
    },

    createDefault: () => ({
      type: 'renderable',
      version: 1,
      spriteId: 'default',
      layer: 'object',
      visible: true,
    }),

    mutators: {
      setSprite: (entity, spriteId: string) => {
        if (typeof spriteId !== 'string' || spriteId.length === 0) {
          throw new TypeError('spriteId must be a non-empty string');
        }
        const renderable = entity.getComponent('renderable');
        if (!renderable) {
          throw new Error('Entity has no renderable component');
        }
        renderable.spriteId = spriteId;
      },

      setVisibility: (entity, visible: boolean) => {
        if (typeof visible !== 'boolean') {
          throw new TypeError('visible must be a boolean');
        }
        const renderable = entity.getComponent('renderable');
        if (!renderable) {
          throw new Error('Entity has no renderable component');
        }
        renderable.visible = visible;
      },

      setTint: (entity, tint: string | undefined) => {
        if (tint !== undefined && typeof tint !== 'string') {
          throw new TypeError('tint must be a string or undefined');
        }
        const renderable = entity.getComponent('renderable');
        if (!renderable) {
          throw new Error('Entity has no renderable component');
        }
        renderable.tint = tint;
      },

      setAlpha: (entity, alpha: number) => {
        if (typeof alpha !== 'number' || alpha < 0 || alpha > 1) {
          throw new RangeError('alpha must be a number between 0.0 and 1.0');
        }
        const renderable = entity.getComponent('renderable');
        if (!renderable) {
          throw new Error('Entity has no renderable component');
        }
        renderable.alpha = alpha;
      },

      setSizeMultiplier: (entity, sizeMultiplier: number) => {
        if (
          typeof sizeMultiplier !== 'number' ||
          sizeMultiplier < 0.1 ||
          sizeMultiplier > 10.0
        ) {
          throw new RangeError(
            'sizeMultiplier must be a number between 0.1 and 10.0'
          );
        }
        const renderable = entity.getComponent('renderable');
        if (!renderable) {
          throw new Error('Entity has no renderable component');
        }
        renderable.sizeMultiplier = sizeMultiplier;
      },
    },
  })
);
