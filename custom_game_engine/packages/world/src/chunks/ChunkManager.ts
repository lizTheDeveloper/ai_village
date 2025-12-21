import type { Chunk } from './Chunk.js';
import { createChunk, getChunkKey, CHUNK_SIZE } from './Chunk.js';

/**
 * Manages chunk loading/unloading based on camera position.
 */
export class ChunkManager {
  private chunks = new Map<string, Chunk>();
  private loadRadius: number;

  constructor(loadRadius: number = 2) {
    this.loadRadius = loadRadius;
  }

  /**
   * Get a chunk, creating it if it doesn't exist.
   */
  getChunk(chunkX: number, chunkY: number): Chunk {
    const key = getChunkKey(chunkX, chunkY);
    let chunk = this.chunks.get(key);

    if (!chunk) {
      chunk = createChunk(chunkX, chunkY);
      this.chunks.set(key, chunk);
    }

    return chunk;
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

    // Unload chunks
    const unloaded: Chunk[] = [];
    for (const key of toUnload) {
      const chunk = this.chunks.get(key);
      if (chunk) {
        unloaded.push(chunk);
        this.chunks.delete(key);
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
   * Clear all chunks (for testing/reset).
   */
  clear(): void {
    this.chunks.clear();
  }
}
