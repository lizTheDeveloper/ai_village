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
  /** Deep underground */
  DeepUnderground = -15,
  /** Basement level */
  Basement = -1,
  /** Low flying altitude */
  LowFlying = 5,
  /** High flying altitude */
  HighFlying = 10,
  /** Atmospheric level */
  Atmosphere = 50,
}

// ============================================================================
// Interface
// ============================================================================

/**
 * Everything with a position in the world.
 * Supports up to 6D positioning (x, y, z, w, v, u) for advanced spatial features.
 * Most entities use 3D (x, y, z). Higher dimensions are optional.
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
  /** Fourth spatial dimension (optional, for advanced features) */
  w?: number;
  /** Fifth spatial dimension (optional, for advanced features) */
  v?: number;
  /** Sixth spatial dimension (optional, for advanced features) */
  u?: number;
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
// N-Dimensional Helper Functions
// ============================================================================

/**
 * Extract N-dimensional coordinates from position component.
 * @param pos Position component
 * @param dimensions Number of dimensions to extract (2-6)
 * @returns Array of coordinates [x, y, z?, w?, v?, u?]
 */
export function positionToCoords(pos: PositionComponent, dimensions: number): number[] {
  const coords: number[] = [pos.x, pos.y];
  if (dimensions >= 3) coords.push(pos.z ?? 0);
  if (dimensions >= 4) coords.push(pos.w ?? 0);
  if (dimensions >= 5) coords.push(pos.v ?? 0);
  if (dimensions >= 6) coords.push(pos.u ?? 0);
  return coords.slice(0, dimensions);
}

/**
 * Check if position is underground (z < 0).
 */
export function isUnderground(pos: PositionComponent): boolean {
  return (pos.z ?? 0) < 0;
}

/**
 * Check if position is above ground (z > 0).
 */
export function isAboveGround(pos: PositionComponent): boolean {
  return (pos.z ?? 0) > 0;
}

/**
 * Check if position is at surface level (z = 0).
 */
export function isAtSurface(pos: PositionComponent): boolean {
  return (pos.z ?? 0) === 0;
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
    { name: 'w', type: 'number', required: false },
    { name: 'v', type: 'number', required: false },
    { name: 'u', type: 'number', required: false },
  ],
  validate: (data: unknown): data is PositionComponent => {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const d = data as Record<string, unknown>;
    const baseValid =
      d.type === 'position' &&
      typeof d.x === 'number' &&
      typeof d.y === 'number' &&
      typeof d.z === 'number' &&
      typeof d.chunkX === 'number' &&
      typeof d.chunkY === 'number';

    // Optional fields must be numbers if present
    const optionalValid =
      (d.w === undefined || typeof d.w === 'number') &&
      (d.v === undefined || typeof d.v === 'number') &&
      (d.u === undefined || typeof d.u === 'number');

    return baseValid && optionalValid;
  },
  createDefault: () => createPositionComponent(0, 0, DefaultZLevel.Ground),
};
