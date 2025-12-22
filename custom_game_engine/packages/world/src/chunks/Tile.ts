/**
 * Represents a single tile in the world.
 */
export interface Tile {
  /** Terrain type (grass, dirt, water, stone, sand) */
  terrain: TerrainType;

  /** Floor/path type (optional) */
  floor?: string;

  /** Moisture level (0-100) - affects plant growth */
  moisture: number;

  /** Fertility level (0-100) - affects farming */
  fertility: number;

  /** Biome this tile belongs to */
  biome?: BiomeType;

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

  /** Whether compost has been applied */
  composted: boolean;
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
    composted: false,
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
