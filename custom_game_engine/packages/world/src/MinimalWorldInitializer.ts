/**
 * MinimalWorldInitializer - Creates a minimal 1-chunk world for Sprint 1.
 *
 * Generates exactly one chunk of terrain at (0,0) with no entities spawned.
 * Designed for fast initialization (<1s) as the foundation for a playable world.
 */

import { ChunkManager } from './chunks/ChunkManager.js';
import { TerrainGenerator } from './terrain/TerrainGenerator.js';
import type { Chunk } from './chunks/Chunk.js';

export interface MinimalWorldResult {
  chunkManager: ChunkManager;
  terrainGenerator: TerrainGenerator;
  /** The single generated chunk at (0,0) */
  chunk: Chunk;
}

export interface MinimalWorldOptions {
  /** Terrain seed. Defaults to 'sprint1-minimal' */
  seed?: string;
  /** ChunkManager load radius. Defaults to 0 (just the origin chunk) */
  loadRadius?: number;
}

/**
 * Initialize a minimal 1-chunk world with terrain only.
 * No entities, animals, or plants are spawned.
 *
 * @returns ChunkManager, TerrainGenerator, and the generated chunk
 */
export function initializeMinimalWorld(options: MinimalWorldOptions = {}): MinimalWorldResult {
  const seed = options.seed ?? 'sprint1-minimal';
  const loadRadius = options.loadRadius ?? 0;

  const terrainGenerator = new TerrainGenerator(seed);
  const chunkManager = new ChunkManager(loadRadius);

  // Generate single chunk at origin - no world param = terrain only, no entities
  const chunk = chunkManager.getChunk(0, 0);
  terrainGenerator.generateChunk(chunk);

  // Link tile neighbors for O(1) adjacency traversal
  chunkManager.linkChunkNeighbors(chunk);

  return { chunkManager, terrainGenerator, chunk };
}
