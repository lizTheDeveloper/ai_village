/// <reference lib="webworker" />

/**
 * Web Worker for background chunk generation.
 *
 * Runs terrain tile generation in a separate thread to avoid blocking
 * the main thread. Entity placement still happens on the main thread
 * since it requires World access.
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
self.onmessage = (event: MessageEvent<GenerateChunkRequest>) => {
  const request = event.data;

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

// Signal worker is ready
self.postMessage({ type: 'ready' });
