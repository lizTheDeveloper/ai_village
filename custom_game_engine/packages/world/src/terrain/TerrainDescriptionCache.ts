/**
 * Terrain Description Cache
 *
 * Caches terrain feature analysis per chunk to avoid expensive re-computation.
 * Terrain analysis (TPI, slope calculation, flood-fill) is computationally expensive,
 * so we cache results by chunk and reuse them until terrain changes.
 *
 * NOTE: This cache is now primarily integrated with ChunkCache.
 * Terrain features are stored directly on chunks (ChunkCache.terrainFeatures).
 * This class provides backward compatibility and global cache invalidation.
 *
 * Cache invalidation triggers:
 * - Terrain modification (building placement, terraforming)
 * - Time-based expiry (5 minutes default)
 */

import type { TerrainFeature } from './TerrainFeatureAnalyzer.js';
import { CHUNK_SIZE } from '../chunks/Chunk.js';

/** Cache entry for a terrain chunk */
interface CachedChunkFeatures {
  /** All detected features in this chunk */
  features: TerrainFeature[];

  /** Timestamp when cache was created */
  cachedAt: number;

  /** Game tick when cache was created */
  cachedTick: number;
}

/**
 * Cache for terrain descriptions organized by chunk.
 *
 * Each chunk (32x32 tiles) has terrain analyzed once and cached.
 * Agents query the cache instead of re-analyzing every frame.
 */
export class TerrainDescriptionCache {
  /** Map of chunk key -> cached features */
  private cache = new Map<string, CachedChunkFeatures>();

  /** Cache expiry time in milliseconds (default 5 minutes) */
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  /**
   * Get cached terrain features for a chunk.
   *
   * @param chunkX Chunk X coordinate
   * @param chunkY Chunk Y coordinate
   * @param currentTick Current game tick
   * @returns Cached features or null if expired/missing
   */
  get(chunkX: number, chunkY: number, currentTick?: number): TerrainFeature[] | null {
    const key = `${chunkX},${chunkY}`;
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
   * Store terrain features for a chunk.
   *
   * @param chunkX Chunk X coordinate
   * @param chunkY Chunk Y coordinate
   * @param features Detected features
   * @param currentTick Current game tick (optional)
   */
  set(chunkX: number, chunkY: number, features: TerrainFeature[], currentTick: number = 0): void {
    const key = `${chunkX},${chunkY}`;
    this.cache.set(key, {
      features,
      cachedAt: Date.now(),
      cachedTick: currentTick,
    });
  }

  /**
   * Invalidate cache for a specific chunk (e.g., when terrain changes).
   *
   * @param chunkX Chunk X coordinate
   * @param chunkY Chunk Y coordinate
   */
  invalidate(chunkX: number, chunkY: number): void {
    const key = `${chunkX},${chunkY}`;
    this.cache.delete(key);
  }

  /**
   * Invalidate cache for a world position (converts to chunk).
   *
   * @param worldX World X coordinate
   * @param worldY World Y coordinate
   */
  invalidateAt(worldX: number, worldY: number): void {
    const chunkX = Math.floor(worldX / CHUNK_SIZE);
    const chunkY = Math.floor(worldY / CHUNK_SIZE);
    this.invalidate(chunkX, chunkY);
  }

  /**
   * Invalidate cache for a radius around a position.
   * Useful when terrain modifications affect multiple chunks.
   *
   * @param worldX World X coordinate
   * @param worldY World Y coordinate
   * @param radius Radius in tiles
   */
  invalidateRadius(worldX: number, worldY: number, radius: number): void {
    const chunkRadius = Math.ceil(radius / CHUNK_SIZE);
    const centerChunkX = Math.floor(worldX / CHUNK_SIZE);
    const centerChunkY = Math.floor(worldY / CHUNK_SIZE);

    for (let dy = -chunkRadius; dy <= chunkRadius; dy++) {
      for (let dx = -chunkRadius; dx <= chunkRadius; dx++) {
        this.invalidate(centerChunkX + dx, centerChunkY + dy);
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
  getStats(): { size: number; chunks: string[] } {
    return {
      size: this.cache.size,
      chunks: Array.from(this.cache.keys()),
    };
  }

  /**
   * Convert world coordinates to chunk coordinates.
   */
  static worldToChunk(worldX: number, worldY: number): { chunkX: number; chunkY: number } {
    return {
      chunkX: Math.floor(worldX / CHUNK_SIZE),
      chunkY: Math.floor(worldY / CHUNK_SIZE),
    };
  }

  /**
   * Get chunks that intersect with a radius around a position.
   */
  static getChunksInRadius(worldX: number, worldY: number, radius: number): Array<{ chunkX: number; chunkY: number }> {
    const chunks: Array<{ chunkX: number; chunkY: number }> = [];
    const chunkRadius = Math.ceil(radius / CHUNK_SIZE);
    const centerChunkX = Math.floor(worldX / CHUNK_SIZE);
    const centerChunkY = Math.floor(worldY / CHUNK_SIZE);

    for (let dy = -chunkRadius; dy <= chunkRadius; dy++) {
      for (let dx = -chunkRadius; dx <= chunkRadius; dx++) {
        chunks.push({
          chunkX: centerChunkX + dx,
          chunkY: centerChunkY + dy,
        });
      }
    }

    return chunks;
  }
}

/**
 * Global terrain description cache instance.
 */
export const globalTerrainCache = new TerrainDescriptionCache();
