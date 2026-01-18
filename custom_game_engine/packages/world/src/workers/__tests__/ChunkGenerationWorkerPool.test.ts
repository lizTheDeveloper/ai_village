/**
 * Tests for ChunkGenerationWorkerPool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChunkGenerationWorkerPool } from '../ChunkGenerationWorkerPool.js';

describe('ChunkGenerationWorkerPool', () => {
  let workerPool: ChunkGenerationWorkerPool;

  beforeEach(() => {
    workerPool = new ChunkGenerationWorkerPool(2, 'test-seed');
  });

  afterEach(() => {
    workerPool.terminate();
  });

  it('should create worker pool', () => {
    const status = workerPool.getStatus();
    expect(status.numWorkers).toBe(2);
    expect(status.pendingRequests).toBe(0);
  });

  it('should generate chunk in worker', async () => {
    const tiles = await workerPool.generateChunk(0, 0);
    expect(tiles).toBeDefined();
    expect(Array.isArray(tiles)).toBe(true);
    expect(tiles.length).toBeGreaterThan(0);
  });

  it('should handle multiple concurrent requests', async () => {
    const promises = [
      workerPool.generateChunk(0, 0),
      workerPool.generateChunk(1, 0),
      workerPool.generateChunk(0, 1),
      workerPool.generateChunk(1, 1),
    ];

    const results = await Promise.all(promises);
    expect(results).toHaveLength(4);
    results.forEach((tiles) => {
      expect(tiles).toBeDefined();
      expect(Array.isArray(tiles)).toBe(true);
    });
  });

  it('should terminate workers', () => {
    workerPool.terminate();
    const status = workerPool.getStatus();
    expect(status.numWorkers).toBe(0);
  });
});
