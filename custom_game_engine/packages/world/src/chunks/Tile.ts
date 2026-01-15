// ============================================================================
// Graph-Based Tile Neighbors (Phase 8)
// Direct neighbor pointers for O(1) traversal (5-100x faster than getTileAt)
// ============================================================================

import type { TileNeighbors } from './TileNeighbors.js';
import { createEmptyNeighbors } from './TileNeighbors.js';

// ============================================================================
// Forward-Compatibility: Fluid System
// Placeholder for future fluid simulation (water, magma, etc.)
// ============================================================================

/** Types of fluids that can exist on a tile */
export type FluidType = 'water' | 'magma' | 'blood' | 'oil' | 'acid';

// ============================================================================
// Tile-Based Building System
// RimWorld/Dwarf Fortress-style construction with walls, doors, and windows
// as tile properties rather than separate entities.
// ============================================================================

/** Wall materials with different properties */
export type WallMaterial = 'wood' | 'stone' | 'mud_brick' | 'ice' | 'metal' | 'glass' | 'thatch';

/** Door materials */
export type DoorMaterial = 'wood' | 'stone' | 'metal' | 'cloth';

/** Window materials */
export type WindowMaterial = 'glass' | 'hide' | 'cloth';

/** Roof materials */
export type RoofMaterial = 'thatch' | 'wood' | 'tile' | 'slate' | 'metal';

/**
 * Wall tile on a world tile.
 * Walls block movement and provide insulation.
 */
export interface WallTile {
  /** Material type (affects insulation, durability, appearance) */
  material: WallMaterial;

  /** Current structural health (0-100) */
  condition: number;

  /** Insulation value (0-100, derived from material) */
  insulation: number;

  /** Construction progress (0-100, undefined if complete) */
  constructionProgress?: number;

  /** Builder entity ID (set during construction) */
  builderId?: string;

  /** When this wall was constructed (game tick) */
  constructedAt?: number;
}

/**
 * Door tile on a world tile.
 * Doors can be opened/closed and provide passage through walls.
 */
export interface DoorTile {
  /** Material type */
  material: DoorMaterial;

  /** Current state */
  state: 'open' | 'closed' | 'locked';

  /** Game tick when door was last opened (for auto-close) */
  lastOpened?: number;

  /** Construction progress (0-100, undefined if complete) */
  constructionProgress?: number;

  /** Builder entity ID */
  builderId?: string;

  /** When constructed */
  constructedAt?: number;
}

/**
 * Window tile on a world tile.
 * Windows are placed in walls, block movement but allow light.
 */
export interface WindowTile {
  /** Material type */
  material: WindowMaterial;

  /** Current health (0-100) */
  condition: number;

  /** Whether light passes through */
  lightsThrough: boolean;

  /** Construction progress */
  constructionProgress?: number;

  /** Builder entity ID */
  builderId?: string;

  /** When constructed */
  constructedAt?: number;
}

/**
 * Roof tile on a world tile.
 * Roofs provide shelter and weather protection.
 */
export interface RoofTile {
  /** Material type */
  material: RoofMaterial;

  /** Current health (0-100) */
  condition: number;

  /** Construction progress */
  constructionProgress?: number;

  /** Builder entity ID */
  builderId?: string;

  /** When constructed */
  constructedAt?: number;
}

/**
 * Create a roof tile.
 */
export function createRoofTile(material: RoofMaterial, tick?: number): RoofTile {
  return {
    material,
    condition: 100,
    constructedAt: tick,
  };
}

/**
 * Material property lookup table.
 * Maps wall materials to their physical properties.
 */
export const WALL_MATERIAL_PROPERTIES: Record<WallMaterial, {
  insulation: number;
  durability: number;
  difficulty: number;
  cost: number;
}> = {
  wood: { insulation: 50, durability: 40, difficulty: 20, cost: 2 },
  stone: { insulation: 80, durability: 90, difficulty: 50, cost: 3 },
  mud_brick: { insulation: 60, durability: 30, difficulty: 30, cost: 2 },
  ice: { insulation: 30, durability: 20, difficulty: 40, cost: 4 },
  metal: { insulation: 20, durability: 100, difficulty: 70, cost: 5 },
  glass: { insulation: 10, durability: 10, difficulty: 60, cost: 4 },
  thatch: { insulation: 40, durability: 15, difficulty: 10, cost: 1 },
};

/**
 * Create a wall tile with default properties based on material.
 */
export function createWallTile(material: WallMaterial, tick?: number): WallTile {
  const props = WALL_MATERIAL_PROPERTIES[material];
  return {
    material,
    condition: 100,
    insulation: props.insulation,
    constructedAt: tick,
  };
}

/**
 * Create a door tile.
 */
export function createDoorTile(material: DoorMaterial, tick?: number): DoorTile {
  return {
    material,
    state: 'closed',
    constructedAt: tick,
  };
}

/**
 * Create a window tile.
 */
export function createWindowTile(material: WindowMaterial, tick?: number): WindowTile {
  return {
    material,
    condition: 100,
    lightsThrough: true,
    constructedAt: tick,
  };
}

/**
 * Fluid layer on a tile.
 * Future: Used by fluid simulation system.
 */
export interface FluidLayer {
  /** Type of fluid */
  type: FluidType;
  /** Depth of fluid (0-7, matching Dwarf Fortress scale) */
  depth: number;
  /** Pressure level (0-7, affects flow) */
  pressure: number;
  /** Temperature of the fluid (affects freezing/boiling) */
  temperature: number;
  /** Flow direction vector */
  flowDirection?: { x: number; y: number };
  /** Flow velocity (tiles per tick) */
  flowVelocity?: number;
  /** Whether fluid is stagnant (not flowing) */
  stagnant: boolean;
  /** Game tick of last update */
  lastUpdate: number;
}

/**
 * Represents a single tile in the world.
 */
export interface Tile {
  /** Terrain type (grass, dirt, water, stone, sand) */
  terrain: TerrainType;

  /** Floor/path type (optional) */
  floor?: string;

  /** Elevation/height of this tile (Z-axis). 0 = sea level, positive = above, negative = below */
  elevation: number;

  // ============================================================================
  // Graph-Based Neighbors (Phase 8)
  // ============================================================================

  /**
   * Direct neighbor pointers for O(1) tile traversal.
   *
   * PERFORMANCE: Use tile.neighbors.east instead of world.getTileAt(x+1, y)
   * - getTileAt(): ~50 CPU cycles (coordinate math + hash lookup + generation risk)
   * - neighbors.east: ~5 CPU cycles (pointer dereference)
   * - **Speedup: 10x per neighbor access**
   *
   * Built by ChunkManager when chunk loads.
   * null = neighbor doesn't exist (unloaded chunk or world edge).
   *
   * Usage:
   * ```typescript
   * import { getAllNeighbors } from '@ai-village/world';
   * for (const neighbor of getAllNeighbors(tile)) {
   *   // Process neighbor (no null checks needed!)
   * }
   * ```
   */
  neighbors: TileNeighbors;

  /** Moisture level (0-100) - affects plant growth */
  moisture: number;

  /** Fertility level (0-100) - affects farming */
  fertility: number;

  /** Biome this tile belongs to */
  biome?: BiomeType;

  // ============================================================================
  // Tile-Based Building System (Voxel Buildings)
  // ============================================================================

  /**
   * Wall on this tile.
   * Walls block movement and provide insulation.
   */
  wall?: WallTile;

  /**
   * Door on this tile.
   * Doors can be opened/closed and provide passage through walls.
   */
  door?: DoorTile;

  /**
   * Window on this tile.
   * Windows are placed in walls, block movement but allow light.
   */
  window?: WindowTile;

  /**
   * Roof on this tile.
   * Roofs provide shelter from weather and complete building enclosures.
   */
  roof?: RoofTile;

  // Soil management properties (Phase 9)
  /** Whether the tile has been tilled and can be planted */
  tilled: boolean;

  /** Number of plantings remaining before re-tilling needed (0-3) */
  plantability: number;

  /** Soil nutrients (NPK values 0-100) */
  nutrients: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
  };

  /** Whether fertilizer is currently active */
  fertilized: boolean;

  /** Ticks remaining for fertilizer effect */
  fertilizerDuration: number;

  /** Game tick when tile was last watered */
  lastWatered: number;

  /** Game tick when tile was last tilled (0 if never tilled) */
  lastTilled: number;

  /** Whether compost has been applied */
  composted: boolean;

  /** Entity ID of plant growing on this tile (if any) */
  plantId: string | null;

  // ============================================================================
  // Forward-Compatibility: Fluid & Mining Systems (optional)
  // ============================================================================

  /**
   * Fluid layer on this tile.
   * Future: Used by fluid simulation system.
   * When undefined, tile has no fluid.
   */
  fluid?: FluidLayer;

  /**
   * Ocean depth zone for water tiles.
   * Determines depth-based properties: light, pressure, temperature, life.
   * Only set for ocean/water tiles. See packages/world/src/ocean/OceanBiomes.ts
   */
  oceanZone?: 'epipelagic' | 'mesopelagic' | 'bathypelagic' | 'abyssal' | 'hadal';

  /**
   * Whether this tile can be mined/dug.
   * Future: Used by mining system.
   */
  mineable?: boolean;

  /**
   * What resource is embedded in this tile (ore, gems, etc.)
   * Future: Used by mining system.
   */
  embeddedResource?: string;

  /**
   * How much of the embedded resource remains (0-100).
   * Future: Used by mining system.
   */
  resourceAmount?: number;

  /**
   * Whether the ceiling above this tile is supported.
   * Future: Used for cave-in mechanics.
   */
  ceilingSupported?: boolean;
}

export type TerrainType =
  | 'grass'
  | 'dirt'
  | 'water'
  | 'stone'
  | 'sand'
  | 'forest';

export type BiomeType =
  | 'plains'
  | 'forest'
  | 'desert'
  | 'mountains'
  | 'ocean'
  | 'river'
  | 'scrubland'    // Desert ↔ Plains transition (moisture: -0.4 to -0.1)
  | 'wetland'      // Land ↔ Water transition (elevation: -0.3 to 0.05, high moisture)
  | 'foothills'    // Mountains ↔ Plains transition (elevation: 0.35 to 0.5)
  | 'savanna'      // Hot grassland with sparse trees (hot + moderate moisture)
  | 'woodland';    // Forest ↔ Plains transition (moisture: 0.05 to 0.35)

/**
 * Create a default tile.
 * NOTE: This creates a temporary tile structure. Biome MUST be set by terrain generation.
 * Per CLAUDE.md: Tiles without biomes should not be used for farming operations.
 */
export function createDefaultTile(): Tile {
  return {
    terrain: 'grass',
    // biome is intentionally undefined - MUST be set by TerrainGenerator
    elevation: 0,
    moisture: 50,
    fertility: 50,
    tilled: false,
    plantability: 0,
    nutrients: {
      nitrogen: 50,
      phosphorus: 50,
      potassium: 50,
    },
    fertilized: false,
    fertilizerDuration: 0,
    lastWatered: 0,
    lastTilled: 0,
    composted: false,
    plantId: null,

    // Neighbors initialized to null, will be linked by ChunkManager
    neighbors: createEmptyNeighbors(),
  };
}

/**
 * Terrain rendering colors (for Phase 1).
 */
export const TERRAIN_COLORS: Record<TerrainType, string> = {
  grass: '#4a7c59',
  dirt: '#8b7355',
  water: '#4a7c9e',
  stone: '#6b6b6b',
  sand: '#dcc896',
  forest: '#2d5016',
};
