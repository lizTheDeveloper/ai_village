/**
 * Represents a single tile in the world.
 */
export interface Tile {
  /** Terrain type (grass, dirt, water, stone, sand) */
  terrain: TerrainType;

  /** Floor/path type (optional) */
  floor?: string;

  /** Moisture level (0-1) - affects plant growth */
  moisture: number;

  /** Fertility level (0-1) - affects farming */
  fertility: number;

  /** Biome this tile belongs to */
  biome?: BiomeType;
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
  | 'river';

/**
 * Create a default tile.
 */
export function createDefaultTile(): Tile {
  return {
    terrain: 'grass',
    moisture: 0.5,
    fertility: 0.5,
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
