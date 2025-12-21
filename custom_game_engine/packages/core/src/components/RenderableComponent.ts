import type { Component, ComponentSchema } from '../ecs/Component.js';

export type RenderLayer = 'terrain' | 'floor' | 'object' | 'entity' | 'effect' | 'ui';

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
  version: 1,
  fields: [
    { name: 'spriteId', type: 'string', required: true },
    { name: 'layer', type: 'string', required: true, default: 'object' },
    { name: 'visible', type: 'boolean', required: true, default: true },
    { name: 'animationState', type: 'string', required: false },
    { name: 'tint', type: 'string', required: false },
  ],
  validate: (data: unknown): data is RenderableComponent => {
    const d = data as any;
    return (
      d &&
      d.type === 'renderable' &&
      typeof d.spriteId === 'string' &&
      typeof d.layer === 'string' &&
      typeof d.visible === 'boolean'
    );
  },
  createDefault: () => createRenderableComponent('default'),
};
