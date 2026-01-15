import type { Chunk } from './Chunk.js';
import { createChunk, getChunkKey, getTileAt, CHUNK_SIZE } from './Chunk.js';
import type { ChunkCache } from './ChunkCache.js';
import { createChunkCache } from './ChunkCache.js';
import type { Tile } from './Tile.js';
import { createEmptyNeighbors } from './TileNeighbors.js';

/**
 * Manages chunk loading/unloading and chunk caches for spatial queries.
 */
export class ChunkManager {
  private chunks = new Map<string, Chunk>();
  private chunkCaches = new Map<string, ChunkCache>();
  private loadRadius: number;

  constructor(loadRadius: number = 2) {
    this.loadRadius = loadRadius;
  }

  /**
   * Get chunk caches map for spatial queries
   */
  getChunkCaches(): Map<string, ChunkCache> {
    return this.chunkCaches;
  }

  /**
   * Get a chunk, creating it if it doesn't exist.
   * Also creates associated chunk cache.
   */
  getChunk(chunkX: number, chunkY: number): Chunk {
    const key = getChunkKey(chunkX, chunkY);
    let chunk = this.chunks.get(key);

    if (!chunk) {
      chunk = createChunk(chunkX, chunkY);
      this.chunks.set(key, chunk);

      // Also create chunk cache
      const cache = createChunkCache(chunkX, chunkY);
      this.chunkCaches.set(key, cache);
    }

    return chunk;
  }

  /**
   * Get chunk cache for spatial queries.
   */
  getChunkCache(chunkX: number, chunkY: number): ChunkCache | undefined {
    const key = getChunkKey(chunkX, chunkY);
    return this.chunkCaches.get(key);
  }

  /**
   * Get or create chunk cache.
   */
  getOrCreateChunkCache(chunkX: number, chunkY: number): ChunkCache {
    const key = getChunkKey(chunkX, chunkY);
    let cache = this.chunkCaches.get(key);

    if (!cache) {
      cache = createChunkCache(chunkX, chunkY);
      this.chunkCaches.set(key, cache);
    }

    return cache;
  }

  /**
   * Check if a chunk exists.
   */
  hasChunk(chunkX: number, chunkY: number): boolean {
    return this.chunks.has(getChunkKey(chunkX, chunkY));
  }

  /**
   * Get all loaded chunks.
   */
  getLoadedChunks(): Chunk[] {
    return Array.from(this.chunks.values());
  }

  /**
   * Update loaded chunks based on camera position.
   * Loads nearby chunks, unloads distant ones.
   */
  updateLoadedChunks(cameraWorldX: number, cameraWorldY: number): {
    loaded: Chunk[];
    unloaded: Chunk[];
  } {
    const cameraTileX = Math.floor(cameraWorldX / CHUNK_SIZE);
    const cameraTileY = Math.floor(cameraWorldY / CHUNK_SIZE);

    const loaded: Chunk[] = [];
    const toUnload: string[] = [];

    // Load chunks in radius
    for (let dx = -this.loadRadius; dx <= this.loadRadius; dx++) {
      for (let dy = -this.loadRadius; dy <= this.loadRadius; dy++) {
        const chunkX = cameraTileX + dx;
        const chunkY = cameraTileY + dy;
        const chunk = this.getChunk(chunkX, chunkY);

        if (!chunk.generated) {
          loaded.push(chunk);
        }
      }
    }

    // Mark distant chunks for unloading
    for (const [key, chunk] of this.chunks) {
      const dx = Math.abs(chunk.x - cameraTileX);
      const dy = Math.abs(chunk.y - cameraTileY);
      const distance = Math.max(dx, dy);

      if (distance > this.loadRadius + 1) {
        toUnload.push(key);
      }
    }

    // Unload chunks and their caches
    const unloaded: Chunk[] = [];
    for (const key of toUnload) {
      const chunk = this.chunks.get(key);
      if (chunk) {
        unloaded.push(chunk);
        this.chunks.delete(key);
        this.chunkCaches.delete(key); // Also remove cache
      }
    }

    return { loaded, unloaded };
  }

  /**
   * Get chunks in a rectangular area.
   */
  getChunksInArea(
    startChunkX: number,
    startChunkY: number,
    endChunkX: number,
    endChunkY: number
  ): Chunk[] {
    const chunks: Chunk[] = [];

    for (let x = startChunkX; x <= endChunkX; x++) {
      for (let y = startChunkY; y <= endChunkY; y++) {
        const chunk = this.getChunk(x, y);
        chunks.push(chunk);
      }
    }

    return chunks;
  }

  /**
   * Get chunk count.
   */
  getChunkCount(): number {
    return this.chunks.size;
  }

  /**
   * Clear all chunks and caches (for testing/reset).
   */
  clear(): void {
    this.chunks.clear();
    this.chunkCaches.clear();
  }

  // ============================================================================
  // Graph-Based Tile Neighbors (Phase 8.1)
  // ============================================================================

  /**
   * Link tile neighbors for a chunk after generation.
   *
   * Call this AFTER TerrainGenerator.generateChunk() completes.
   * Links both intra-chunk neighbors (within same chunk) and cross-chunk neighbors
   * (tiles at edges pointing to adjacent chunks).
   *
   * Performance: O(CHUNK_SIZE²) = O(1024) for 32×32 chunk = ~5ms per chunk.
   *
   * @param chunk - Chunk to link neighbors for
   */
  linkChunkNeighbors(chunk: Chunk): void {
    // Link all tiles in this chunk
    for (let y = 0; y < CHUNK_SIZE; y++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const tile = getTileAt(chunk, x, y);
        if (!tile) continue;

        // Build neighbor links (handles both intra-chunk and cross-chunk)
        tile.neighbors = {
          north: this.getNeighborTile(chunk, x, y - 1),
          south: this.getNeighborTile(chunk, x, y + 1),
          east: this.getNeighborTile(chunk, x + 1, y),
          west: this.getNeighborTile(chunk, x - 1, y),
          northEast: this.getNeighborTile(chunk, x + 1, y - 1),
          northWest: this.getNeighborTile(chunk, x - 1, y - 1),
          southEast: this.getNeighborTile(chunk, x + 1, y + 1),
          southWest: this.getNeighborTile(chunk, x - 1, y + 1),

          // Vertical (Phase 8.5: 3D support - deferred for now)
          up: null,
          down: null,
        };
      }
    }
  }

  /**
   * Get neighbor tile, handling chunk boundaries.
   *
   * Returns null if:
   * - Neighbor is in an unloaded chunk
   * - Neighbor is outside world bounds
   * - Neighbor chunk is not generated yet
   *
   * @param chunk - Source chunk
   * @param localX - Local X coordinate (-1 to CHUNK_SIZE for cross-chunk)
   * @param localY - Local Y coordinate (-1 to CHUNK_SIZE for cross-chunk)
   * @returns Neighbor tile or null
   */
  private getNeighborTile(chunk: Chunk, localX: number, localY: number): Tile | null {
    // Within current chunk bounds?
    if (localX >= 0 && localX < CHUNK_SIZE && localY >= 0 && localY < CHUNK_SIZE) {
      return getTileAt(chunk, localX, localY) ?? null;
    }

    // Cross-chunk neighbor - calculate world coordinates
    const worldX = chunk.x * CHUNK_SIZE + localX;
    const worldY = chunk.y * CHUNK_SIZE + localY;

    // Calculate neighbor chunk coordinates
    const neighborChunkX = Math.floor(worldX / CHUNK_SIZE);
    const neighborChunkY = Math.floor(worldY / CHUNK_SIZE);

    // Get neighbor chunk (must be loaded and generated)
    const key = getChunkKey(neighborChunkX, neighborChunkY);
    const neighborChunk = this.chunks.get(key);

    if (!neighborChunk || !neighborChunk.generated) {
      return null; // Neighbor chunk not loaded or not generated
    }

    // Calculate local coordinates in neighbor chunk
    const neighborLocalX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const neighborLocalY = ((worldY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    return getTileAt(neighborChunk, neighborLocalX, neighborLocalY) ?? null;
  }

  /**
   * Update cross-chunk neighbor links when a chunk is loaded.
   *
   * When a new chunk loads, edge tiles of adjacent chunks need to be updated
   * to point to the newly loaded chunk's tiles.
   *
   * Call this AFTER linkChunkNeighbors(chunk) to update neighboring chunks.
   *
   * @param chunk - Newly loaded chunk
   */
  updateCrossChunkNeighbors(chunk: Chunk): void {
    // Get all 8 adjacent chunks (N, S, E, W, NE, NW, SE, SW)
    const adjacentChunks = [
      this.chunks.get(getChunkKey(chunk.x - 1, chunk.y)),     // West
      this.chunks.get(getChunkKey(chunk.x + 1, chunk.y)),     // East
      this.chunks.get(getChunkKey(chunk.x, chunk.y - 1)),     // North
      this.chunks.get(getChunkKey(chunk.x, chunk.y + 1)),     // South
      this.chunks.get(getChunkKey(chunk.x - 1, chunk.y - 1)), // NW
      this.chunks.get(getChunkKey(chunk.x + 1, chunk.y - 1)), // NE
      this.chunks.get(getChunkKey(chunk.x - 1, chunk.y + 1)), // SW
      this.chunks.get(getChunkKey(chunk.x + 1, chunk.y + 1)), // SE
    ];

    // Relink edge tiles of adjacent chunks to point to this chunk
    for (const adjChunk of adjacentChunks) {
      if (adjChunk && adjChunk.generated) {
        this.linkChunkNeighbors(adjChunk); // Relink to include new chunk
      }
    }
  }

  /**
   * Unlink tile neighbors when a chunk is unloaded.
   *
   * Sets all neighbor pointers to null to prevent stale references.
   * Call this BEFORE removing chunk from memory.
   *
   * @param chunk - Chunk being unloaded
   */
  unlinkChunkNeighbors(chunk: Chunk): void {
    for (let y = 0; y < CHUNK_SIZE; y++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const tile = getTileAt(chunk, x, y);
        if (tile) {
          tile.neighbors = createEmptyNeighbors();
        }
      }
    }

    // Also update adjacent chunks to remove pointers to this chunk
    const adjacentChunks = [
      this.chunks.get(getChunkKey(chunk.x - 1, chunk.y)),
      this.chunks.get(getChunkKey(chunk.x + 1, chunk.y)),
      this.chunks.get(getChunkKey(chunk.x, chunk.y - 1)),
      this.chunks.get(getChunkKey(chunk.x, chunk.y + 1)),
      this.chunks.get(getChunkKey(chunk.x - 1, chunk.y - 1)),
      this.chunks.get(getChunkKey(chunk.x + 1, chunk.y - 1)),
      this.chunks.get(getChunkKey(chunk.x - 1, chunk.y + 1)),
      this.chunks.get(getChunkKey(chunk.x + 1, chunk.y + 1)),
    ];

    for (const adjChunk of adjacentChunks) {
      if (adjChunk && adjChunk.generated) {
        this.linkChunkNeighbors(adjChunk); // Relink without unloaded chunk
      }
    }
  }
}
