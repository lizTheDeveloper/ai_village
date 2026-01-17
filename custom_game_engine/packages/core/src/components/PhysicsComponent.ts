import type { Component, ComponentSchema } from '../ecs/Component.js';

/**
 * Anything that takes up space / blocks movement.
 */
export interface PhysicsComponent extends Component {
  type: 'physics';
  solid: boolean;
  width: number; // In tiles
  height: number; // In tiles
}

/**
 * Create a physics component.
 */
export function createPhysicsComponent(
  solid: boolean = false,
  width: number = 1,
  height: number = 1
): PhysicsComponent {
  return {
    type: 'physics',
    version: 1,
    solid,
    width,
    height,
  };
}

/**
 * Physics component schema.
 */
export const PhysicsComponentSchema: ComponentSchema<PhysicsComponent> = {
  type: 'physics',
  version: 1,
  fields: [
    { name: 'solid', type: 'boolean', required: true, default: false },
    { name: 'width', type: 'number', required: true, default: 1 },
    { name: 'height', type: 'number', required: true, default: 1 },
  ],
  validate: (data: unknown): data is PhysicsComponent => {
    // Type guard: check that data is an object with required properties
    if (!data || typeof data !== 'object') return false;

    const d = data as Record<string, unknown>;
    return (
      d.type === 'physics' &&
      typeof d.solid === 'boolean' &&
      typeof d.width === 'number' &&
      typeof d.height === 'number'
    );
  },
  createDefault: () => createPhysicsComponent(),
};
