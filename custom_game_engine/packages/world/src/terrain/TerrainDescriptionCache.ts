/**
 * Terrain Description Cache
 *
 * Caches terrain feature analysis per sector to avoid expensive re-computation.
 * Terrain analysis (TPI, slope calculation, flood-fill) is computationally expensive,
 * so we cache results by sector and reuse them until terrain changes.
 *
 * Cache invalidation triggers:
 * - Terrain modification (building placement, terraforming)
 * - Time-based expiry (5 minutes default)
 */

import type { TerrainFeature } from './TerrainFeatureAnalyzer.js';

/** Sector size in tiles (must match MapKnowledge SECTOR_SIZE) */
const SECTOR_SIZE = 32;

/** Cache entry for a terrain sector */
interface CachedSectorFeatures {
  /** All detected features in this sector */
  features: TerrainFeature[];

  /** Timestamp when cache was created */
  cachedAt: number;

  /** Game tick when cache was created */
  cachedTick: number;
}

/**
 * Cache for terrain descriptions organized by sector.
 *
 * Each sector (32x32 tiles) has terrain analyzed once and cached.
 * Agents query the cache instead of re-analyzing every frame.
 */
export class TerrainDescriptionCache {
  /** Map of sector key -> cached features */
  private cache = new Map<string, CachedSectorFeatures>();

  /** Cache expiry time in milliseconds (default 5 minutes) */
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  /**
   * Get cached terrain features for a sector.
   *
   * @param sectorX Sector X coordinate
   * @param sectorY Sector Y coordinate
   * @param currentTick Current game tick
   * @returns Cached features or null if expired/missing
   */
  get(sectorX: number, sectorY: number, currentTick?: number): TerrainFeature[] | null {
    const key = `${sectorX},${sectorY}`;
    const cached = this.cache.get(key);

    if (!cached) {
      return null; // Cache miss
    }

    // Check if expired (time-based)
    const age = Date.now() - cached.cachedAt;
    if (age > this.CACHE_TTL_MS) {
      this.cache.delete(key); // Evict stale entry
      return null;
    }

    // Optional: Check tick-based expiry if provided
    // (for games with tick-based cache invalidation)
    if (currentTick !== undefined && currentTick - cached.cachedTick > 12000) {
      // 10 minutes at 20 TPS
      this.cache.delete(key);
      return null;
    }

    return cached.features;
  }

  /**
   * Store terrain features for a sector.
   *
   * @param sectorX Sector X coordinate
   * @param sectorY Sector Y coordinate
   * @param features Detected features
   * @param currentTick Current game tick (optional)
   */
  set(sectorX: number, sectorY: number, features: TerrainFeature[], currentTick: number = 0): void {
    const key = `${sectorX},${sectorY}`;
    this.cache.set(key, {
      features,
      cachedAt: Date.now(),
      cachedTick: currentTick,
    });
  }

  /**
   * Invalidate cache for a specific sector (e.g., when terrain changes).
   *
   * @param sectorX Sector X coordinate
   * @param sectorY Sector Y coordinate
   */
  invalidate(sectorX: number, sectorY: number): void {
    const key = `${sectorX},${sectorY}`;
    this.cache.delete(key);
  }

  /**
   * Invalidate cache for a world position (converts to sector).
   *
   * @param worldX World X coordinate
   * @param worldY World Y coordinate
   */
  invalidateAt(worldX: number, worldY: number): void {
    const sectorX = Math.floor(worldX / SECTOR_SIZE);
    const sectorY = Math.floor(worldY / SECTOR_SIZE);
    this.invalidate(sectorX, sectorY);
  }

  /**
   * Invalidate cache for a radius around a position.
   * Useful when terrain modifications affect multiple sectors.
   *
   * @param worldX World X coordinate
   * @param worldY World Y coordinate
   * @param radius Radius in tiles
   */
  invalidateRadius(worldX: number, worldY: number, radius: number): void {
    const sectorRadius = Math.ceil(radius / SECTOR_SIZE);
    const centerSectorX = Math.floor(worldX / SECTOR_SIZE);
    const centerSectorY = Math.floor(worldY / SECTOR_SIZE);

    for (let dy = -sectorRadius; dy <= sectorRadius; dy++) {
      for (let dx = -sectorRadius; dx <= sectorRadius; dx++) {
        this.invalidate(centerSectorX + dx, centerSectorY + dy);
      }
    }
  }

  /**
   * Clear entire cache (e.g., when loading new world).
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics for debugging/monitoring.
   */
  getStats(): { size: number; sectors: string[] } {
    return {
      size: this.cache.size,
      sectors: Array.from(this.cache.keys()),
    };
  }

  /**
   * Convert world coordinates to sector coordinates.
   */
  static worldToSector(worldX: number, worldY: number): { sectorX: number; sectorY: number } {
    return {
      sectorX: Math.floor(worldX / SECTOR_SIZE),
      sectorY: Math.floor(worldY / SECTOR_SIZE),
    };
  }

  /**
   * Get sectors that intersect with a radius around a position.
   */
  static getSectorsInRadius(worldX: number, worldY: number, radius: number): Array<{ sectorX: number; sectorY: number }> {
    const sectors: Array<{ sectorX: number; sectorY: number }> = [];
    const sectorRadius = Math.ceil(radius / SECTOR_SIZE);
    const centerSectorX = Math.floor(worldX / SECTOR_SIZE);
    const centerSectorY = Math.floor(worldY / SECTOR_SIZE);

    for (let dy = -sectorRadius; dy <= sectorRadius; dy++) {
      for (let dx = -sectorRadius; dx <= sectorRadius; dx++) {
        sectors.push({
          sectorX: centerSectorX + dx,
          sectorY: centerSectorY + dy,
        });
      }
    }

    return sectors;
  }
}

/**
 * Global terrain description cache instance.
 */
export const globalTerrainCache = new TerrainDescriptionCache();
