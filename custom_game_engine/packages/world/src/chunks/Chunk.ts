import type { EntityId } from '@ai-village/core';
import type { Tile } from './Tile.js';
import { createDefaultTile } from './Tile.js';

export const CHUNK_SIZE = 32;

/**
 * A chunk is a 32x32 grid of tiles.
 */
export interface Chunk {
  /** Chunk coordinates in world space */
  readonly x: number;
  readonly y: number;

  /** Whether this chunk has been generated */
  generated: boolean;

  /** Tiles in this chunk (row-major order) */
  tiles: Tile[];

  /** Entities currently in this chunk */
  entities: Set<EntityId>;

  /**
   * Version counter for cache invalidation.
   * Incremented whenever tiles are modified.
   * TerrainRenderer uses this to avoid recomputing tile hashes every frame.
   */
  version: number;
}

/**
 * Create a new empty chunk.
 */
export function createChunk(chunkX: number, chunkY: number): Chunk {
  const tiles: Tile[] = [];

  for (let i = 0; i < CHUNK_SIZE * CHUNK_SIZE; i++) {
    tiles.push(createDefaultTile());
  }

  return {
    x: chunkX,
    y: chunkY,
    generated: false,
    tiles,
    entities: new Set(),
    version: 0,
  };
}

/**
 * Get tile at local chunk coordinates (0-31).
 */
export function getTileAt(chunk: Chunk, localX: number, localY: number): Tile | undefined {
  if (localX < 0 || localX >= CHUNK_SIZE || localY < 0 || localY >= CHUNK_SIZE) {
    return undefined;
  }
  return chunk.tiles[localY * CHUNK_SIZE + localX];
}

/**
 * Set tile at local chunk coordinates.
 * Increments chunk.version for cache invalidation.
 */
export function setTileAt(
  chunk: Chunk,
  localX: number,
  localY: number,
  tile: Tile
): boolean {
  if (localX < 0 || localX >= CHUNK_SIZE || localY < 0 || localY >= CHUNK_SIZE) {
    return false;
  }
  chunk.tiles[localY * CHUNK_SIZE + localX] = tile;
  chunk.version++;
  return true;
}

/**
 * Mark a chunk as dirty (increments version).
 * Call this when modifying tiles directly instead of through setTileAt.
 *
 * PERFORMANCE: This enables O(1) cache validation in TerrainRenderer
 * instead of O(256) tile hash computation per frame per chunk.
 */
export function markChunkDirty(chunk: Chunk): void {
  chunk.version++;
}

/**
 * Convert world coordinates to chunk coordinates.
 */
export function worldToChunk(worldX: number, worldY: number): { chunkX: number; chunkY: number } {
  return {
    chunkX: Math.floor(worldX / CHUNK_SIZE),
    chunkY: Math.floor(worldY / CHUNK_SIZE),
  };
}

/**
 * Convert world coordinates to local chunk coordinates.
 */
export function worldToLocal(worldX: number, worldY: number): { localX: number; localY: number } {
  const localX = Math.floor(worldX) % CHUNK_SIZE;
  const localY = Math.floor(worldY) % CHUNK_SIZE;

  return {
    localX: localX < 0 ? localX + CHUNK_SIZE : localX,
    localY: localY < 0 ? localY + CHUNK_SIZE : localY,
  };
}

/**
 * Convert chunk + local coordinates to world coordinates.
 */
export function chunkToWorld(
  chunkX: number,
  chunkY: number,
  localX: number,
  localY: number
): { worldX: number; worldY: number } {
  return {
    worldX: chunkX * CHUNK_SIZE + localX,
    worldY: chunkY * CHUNK_SIZE + localY,
  };
}

/**
 * Get chunk key for Map storage.
 */
export function getChunkKey(chunkX: number, chunkY: number): string {
  return `${chunkX},${chunkY}`;
}
