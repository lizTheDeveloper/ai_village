import type { Component, ComponentSchema } from '../ecs/Component.js';

export type RenderLayer = 'terrain' | 'floor' | 'building' | 'object' | 'entity' | 'effect' | 'ui';

/**
 * Anything that can be rendered.
 */
export interface RenderableComponent extends Component {
  type: 'renderable';
  spriteId: string;
  layer: RenderLayer;
  visible: boolean;
  animationState?: string;
  tint?: string; // Hex color for tinting
  sizeMultiplier?: number; // Visual scale factor (default: 1.0, range: 0.1-10.0)
  alpha?: number; // Opacity 0.0-1.0 (default: 1.0)
}

/**
 * Create a renderable component.
 */
export function createRenderableComponent(
  spriteId: string,
  layer: RenderLayer = 'object',
  visible: boolean = true
): RenderableComponent {
  return {
    type: 'renderable',
    version: 1,
    spriteId,
    layer,
    visible,
  };
}

/**
 * Renderable component schema.
 */
export const RenderableComponentSchema: ComponentSchema<RenderableComponent> = {
  type: 'renderable',
  version: 2,
  fields: [
    { name: 'spriteId', type: 'string', required: true },
    { name: 'layer', type: 'string', required: true, default: 'object' },
    { name: 'visible', type: 'boolean', required: true, default: true },
    { name: 'animationState', type: 'string', required: false },
    { name: 'tint', type: 'string', required: false },
    { name: 'sizeMultiplier', type: 'number', required: false, default: 1.0 },
    { name: 'alpha', type: 'number', required: false, default: 1.0 },
  ],
  validate: (data: unknown): data is RenderableComponent => {
    // Type guard: check if data is a record type
    if (!data || typeof data !== 'object') {
      return false;
    }

    const d = data as Record<string, unknown>;
    const valid = (
      d.type === 'renderable' &&
      typeof d.spriteId === 'string' &&
      typeof d.layer === 'string' &&
      typeof d.visible === 'boolean'
    );

    if (!valid) return false;

    // Validate optional fields if present
    if (d.sizeMultiplier !== undefined) {
      if (typeof d.sizeMultiplier !== 'number' || d.sizeMultiplier < 0.1 || d.sizeMultiplier > 10) {
        throw new RangeError(`Invalid sizeMultiplier: ${d.sizeMultiplier} (must be 0.1-10.0)`);
      }
    }

    if (d.alpha !== undefined) {
      if (typeof d.alpha !== 'number' || d.alpha < 0 || d.alpha > 1) {
        throw new RangeError(`Invalid alpha: ${d.alpha} (must be 0.0-1.0)`);
      }
    }

    return true;
  },
  createDefault: () => createRenderableComponent('default'),
};
