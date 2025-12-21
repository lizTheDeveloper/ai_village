import type { Component, ComponentSchema } from '../ecs/Component.js';
import { CHUNK_SIZE } from '../types.js';

/**
 * Everything with a position in the world.
 */
export interface PositionComponent extends Component {
  type: 'position';
  x: number;
  y: number;
  chunkX: number; // Derived from x
  chunkY: number; // Derived from y
}

/**
 * Create a position component.
 */
export function createPositionComponent(x: number, y: number): PositionComponent {
  return {
    type: 'position',
    version: 1,
    x,
    y,
    chunkX: Math.floor(x / CHUNK_SIZE),
    chunkY: Math.floor(y / CHUNK_SIZE),
  };
}

/**
 * Update position (recalculates chunk coordinates).
 */
export function updatePosition(pos: PositionComponent, x: number, y: number): PositionComponent {
  return {
    ...pos,
    x,
    y,
    chunkX: Math.floor(x / CHUNK_SIZE),
    chunkY: Math.floor(y / CHUNK_SIZE),
  };
}

/**
 * Position component schema.
 */
export const PositionComponentSchema: ComponentSchema<PositionComponent> = {
  type: 'position',
  version: 1,
  fields: [
    { name: 'x', type: 'number', required: true },
    { name: 'y', type: 'number', required: true },
    { name: 'chunkX', type: 'number', required: true },
    { name: 'chunkY', type: 'number', required: true },
  ],
  validate: (data: unknown): data is PositionComponent => {
    const d = data as any;
    return (
      d &&
      d.type === 'position' &&
      typeof d.x === 'number' &&
      typeof d.y === 'number' &&
      typeof d.chunkX === 'number' &&
      typeof d.chunkY === 'number'
    );
  },
  createDefault: () => createPositionComponent(0, 0),
};
