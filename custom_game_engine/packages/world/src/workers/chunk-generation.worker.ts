/// <reference lib="webworker" />

/**
 * Web Worker for background chunk generation.
 *
 * Runs terrain tile generation in a separate thread to avoid blocking
 * the main thread. Entity placement still happens on the main thread
 * since it requires World access.
 *
 * Tier 4 Optimization: SharedArrayBuffer Support
 * - Zero-copy mode: Accepts SharedArrayBuffers for tile data
 * - Copy mode: Traditional postMessage serialization
 * - Automatic fallback if SharedArrayBuffer unavailable
 *
 * Architecture:
 * - Worker receives chunk coordinates + seed + config
 * - Creates temporary chunk and generates tiles (pure math)
 * - Returns serialized tile data to main thread
 * - Main thread places entities and finalizes chunk
 */

import { TerrainGenerator } from '../terrain/TerrainGenerator.js';
import { createChunk, CHUNK_SIZE } from '../chunks/Chunk.js';
import type { GenerateChunkRequest, WorkerResponse } from './chunk-generation-types.js';

// Worker state - lazy initialization
let terrainGenerator: TerrainGenerator | null = null;
let currentSeed: string | null = null;

/**
 * Handle incoming messages from main thread
 */
self.onmessage = (event: MessageEvent<GenerateChunkRequest | any>) => {
  const request = event.data;

  // Handle SharedArrayBuffer mode
  if (request.sharedBuffers) {
    try {
      // Zero-copy mode: Access shared buffers directly
      const buffers = new Map<string, Float32Array>();
      for (const { name, buffer } of request.sharedBuffers) {
        buffers.set(name, new Float32Array(buffer));
      }

      // Process based on type
      if (request.type === 'generate_chunk_shared') {
        generateChunkShared(request, buffers);
      }

      // Send success response
      self.postMessage({
        id: request.id,
        type: 'result',
        result: { success: true },
      });
    } catch (error) {
      // Send error response
      self.postMessage({
        id: request.id,
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  // Handle traditional copy mode
  if (request.type === 'generate') {
    try {
      // Recreate terrain generator if seed changed (lazy init)
      if (!terrainGenerator || currentSeed !== request.seed) {
        terrainGenerator = new TerrainGenerator(
          request.seed,
          undefined, // No god-crafted spawner in worker
          request.planetConfig
        );
        currentSeed = request.seed;
      }

      // Create temporary chunk for generation
      const chunk = createChunk(request.chunkX, request.chunkY);

      // Generate tiles (pure math, no world access)
      // Passing undefined for world parameter = tile generation only
      terrainGenerator.generateChunk(chunk, undefined);

      // Send result back to main thread
      const response: WorkerResponse = {
        type: 'chunk-generated',
        requestId: request.requestId,
        chunkX: request.chunkX,
        chunkY: request.chunkY,
        tiles: chunk.tiles,
        timestamp: Date.now(),
        success: true,
      };

      self.postMessage(response);
    } catch (error) {
      // Send error back to main thread
      const errorResponse: WorkerResponse = {
        type: 'error',
        requestId: request.requestId,
        error: error instanceof Error ? error.message : String(error),
        chunkX: request.chunkX,
        chunkY: request.chunkY,
      };

      self.postMessage(errorResponse);
    }
  }
};

/**
 * Generate chunk using SharedArrayBuffer (zero-copy mode).
 *
 * Writes terrain data directly to shared buffers for zero-copy transfer.
 */
function generateChunkShared(
  request: any,
  buffers: Map<string, Float32Array>
): void {
  const { chunkX, chunkY, seed, planetConfig } = request.data;

  // Recreate terrain generator if seed changed
  if (!terrainGenerator || currentSeed !== seed) {
    terrainGenerator = new TerrainGenerator(
      seed,
      undefined,
      planetConfig
    );
    currentSeed = seed;
  }

  // Create temporary chunk
  const chunk = createChunk(chunkX, chunkY);

  // Generate tiles
  terrainGenerator.generateChunk(chunk, undefined);

  // Write results to shared buffers
  // Example: heightMap, temperatureMap, etc.
  const heightMap = buffers.get('heightMap');
  if (heightMap) {
    // Copy tile heights to shared buffer
    for (let i = 0; i < chunk.tiles.length; i++) {
      const tile = chunk.tiles[i];
      if (tile) {
        heightMap[i] = tile.elevation || 0;
      }
    }
  }

  const tileTypes = buffers.get('tileTypes');
  if (tileTypes) {
    // Copy tile types (encoded as numbers)
    for (let i = 0; i < chunk.tiles.length; i++) {
      const tile = chunk.tiles[i];
      if (tile) {
        tileTypes[i] = encodeTileType(tile.terrain);
      }
    }
  }
}

/**
 * Encode terrain type as number for SharedArrayBuffer transfer.
 */
function encodeTileType(terrain: string): number {
  const typeMap: Record<string, number> = {
    ocean: 0,
    beach: 1,
    grassland: 2,
    forest: 3,
    mountain: 4,
    snow: 5,
    desert: 6,
    swamp: 7,
  };
  return typeMap[terrain] ?? 0;
}

// Signal worker is ready
self.postMessage({ type: 'ready' });
