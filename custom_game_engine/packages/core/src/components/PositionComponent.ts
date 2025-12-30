import type { Component, ComponentSchema } from '../ecs/Component.js';
import { CHUNK_SIZE } from '../types.js';

// ============================================================================
// Enums
// ============================================================================

/**
 * Z-level classification for quick layer identification.
 */
export enum ZLevel {
  /** Deep underground (z < -10) */
  DeepUnderground = 'deep_underground',
  /** Underground (z -10 to -1) */
  Underground = 'underground',
  /** Surface level (z = 0) */
  Surface = 'surface',
  /** Above ground (z 1 to 10) */
  AboveGround = 'above_ground',
  /** High altitude (z > 10) */
  HighAltitude = 'high_altitude',
}

/**
 * Default Z-level for common entity types.
 */
export enum DefaultZLevel {
  /** Ground-dwelling entities, buildings */
  Ground = 0,
  /** Flying creatures, clouds */
  Flying = 5,
  /** Underground caves, mining */
  Cave = -5,
  /** Deep mines, magma */
  DeepCave = -15,
  /** Treetop level */
  Canopy = 3,
}

// ============================================================================
// Interface
// ============================================================================

/**
 * Everything with a position in the world.
 * Supports 3D positioning with z-depth for side-view parallax rendering.
 */
export interface PositionComponent extends Component {
  type: 'position';
  /** X coordinate in tile units (horizontal) */
  x: number;
  /** Y coordinate in tile units (vertical in top-down, height in side-view) */
  y: number;
  /** Z coordinate - depth level (0 = surface, negative = underground, positive = above) */
  z: number;
  /** Chunk X coordinate (derived from x) */
  chunkX: number;
  /** Chunk Y coordinate (derived from y) */
  chunkY: number;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a position component.
 * @param x X coordinate in tile units
 * @param y Y coordinate in tile units
 * @param z Z coordinate (depth level, defaults to 0 = surface)
 */
export function createPositionComponent(
  x: number,
  y: number,
  z: number = DefaultZLevel.Ground
): PositionComponent {
  return {
    type: 'position',
    version: 1,
    x,
    y,
    z,
    chunkX: Math.floor(x / CHUNK_SIZE),
    chunkY: Math.floor(y / CHUNK_SIZE),
  };
}

/**
 * Update position (recalculates chunk coordinates).
 * @param pos Current position component
 * @param x New X coordinate
 * @param y New Y coordinate
 * @param z Optional new Z coordinate (preserves current if not provided)
 */
export function updatePosition(
  pos: PositionComponent,
  x: number,
  y: number,
  z?: number
): PositionComponent {
  return {
    ...pos,
    x,
    y,
    z: z ?? pos.z,
    chunkX: Math.floor(x / CHUNK_SIZE),
    chunkY: Math.floor(y / CHUNK_SIZE),
  };
}

/**
 * Update only the Z coordinate (depth level).
 * @param pos Current position component
 * @param z New Z coordinate
 */
export function updatePositionZ(pos: PositionComponent, z: number): PositionComponent {
  return {
    ...pos,
    z,
  };
}

/**
 * Get the Z-level classification for a position.
 */
export function getZLevel(z: number): ZLevel {
  if (z < -10) return ZLevel.DeepUnderground;
  if (z < 0) return ZLevel.Underground;
  if (z === 0) return ZLevel.Surface;
  if (z <= 10) return ZLevel.AboveGround;
  return ZLevel.HighAltitude;
}

// ============================================================================
// Schema
// ============================================================================

/**
 * Position component schema.
 */
export const PositionComponentSchema: ComponentSchema<PositionComponent> = {
  type: 'position',
  version: 1,
  fields: [
    { name: 'x', type: 'number', required: true },
    { name: 'y', type: 'number', required: true },
    { name: 'z', type: 'number', required: true },
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
      typeof d.z === 'number' &&
      typeof d.chunkX === 'number' &&
      typeof d.chunkY === 'number'
    );
  },
  createDefault: () => createPositionComponent(0, 0, DefaultZLevel.Ground),
};
