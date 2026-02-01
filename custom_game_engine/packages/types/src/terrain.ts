/**
 * Terrain and biome type definitions.
 * Shared between core and world packages.
 */

import type { IWallTile, IDoorTile, IWindowTile } from './building.js';

export type TerrainType = 'grass' | 'dirt' | 'sand' | 'stone' | 'water' | 'deep_water' | 'forest';

export type BiomeType = 'plains' | 'forest' | 'desert' | 'mountains' | 'ocean' | 'river';

/**
 * Types of terrain features that can be detected.
 */
export type TerrainFeatureType =
  | 'peak'
  | 'valley'
  | 'saddle'
  | 'ridge'
  | 'cliff'
  | 'plateau'
  | 'plain'
  | 'hillside'
  | 'lake'
  | 'pond'
  | 'river'
  | 'beach'
  | 'forest'
  | 'unknown';

/**
 * Detected terrain feature with location and characteristics.
 */
export interface TerrainFeature {
  /** Feature type */
  type: TerrainFeatureType;

  /** Center position (world coordinates) */
  x: number;
  y: number;

  /** Approximate size/radius in tiles */
  size: number;

  /** Elevation at feature center */
  elevation: number;

  /** Average slope (degrees) */
  slope?: number;

  /** Topographic Position Index value */
  tpi?: number;

  /** Natural language description for LLMs */
  description: string;

  /** Directional info relative to observer (filled in by describeNearby) */
  direction?: string;
  distance?: number;
}

/**
 * Interface for terrain analyzer (provided by @ai-village/world at runtime).
 */
export interface TerrainAnalyzer {
  analyzeArea(
    getTileAt: (x: number, y: number) => unknown,
    centerX: number,
    centerY: number,
    radius: number
  ): TerrainFeature[];

  describeNearby(
    features: TerrainFeature[],
    observerX: number,
    observerY: number,
    maxDistance: number
  ): string;
}

/**
 * Interface for terrain description cache.
 * Uses chunk coordinates (32x32 tiles).
 */
export interface TerrainCache {
  get(chunkX: number, chunkY: number, tick: number): TerrainFeature[] | null;
  set(chunkX: number, chunkY: number, features: TerrainFeature[], tick: number): void;
}

/**
 * Static methods for terrain description cache.
 */
export interface TerrainDescriptionCacheStatic {
  getChunksInRadius(
    x: number,
    y: number,
    radius: number
  ): Array<{ chunkX: number; chunkY: number }>;
}

/**
 * Tile nutrient levels for farming.
 */
export interface TileNutrients {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
}

/**
 * Tile interface for world coordinates.
 * Must match the Tile interface in @ai-village/world.
 */
export interface ITile {
  terrain: TerrainType;
  floor?: string;
  elevation?: number;
  moisture: number;
  fertility: number;
  biome?: BiomeType;
  tilled: boolean;
  plantability: number;
  nutrients: TileNutrients;
  fertilized: boolean;
  fertilizerDuration: number;
  lastWatered: number;
  lastTilled: number;
  composted: boolean;
  plantId: string | null;

  // Tile-based voxel building support
  wall?: IWallTile;
  door?: IDoorTile;
  window?: IWindowTile;
}
