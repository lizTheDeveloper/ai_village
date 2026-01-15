/**
 * Centralized terrain and biome type definitions.
 * Includes feature types duplicated here to break circular dependency with @ai-village/world.
 */

export type TerrainType = 'grass' | 'dirt' | 'sand' | 'stone' | 'water' | 'deep_water' | 'forest';

export type BiomeType = 'plains' | 'forest' | 'desert' | 'mountains' | 'ocean' | 'river';

/**
 * Types of terrain features that can be detected.
 * Duplicated from @ai-village/world to break circular dependency.
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
 * Duplicated from @ai-village/world to break circular dependency.
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
 * Interface for terrain description cache (provided by @ai-village/world at runtime).
 * Now uses chunk coordinates (32×32 tiles) instead of sector coordinates.
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
