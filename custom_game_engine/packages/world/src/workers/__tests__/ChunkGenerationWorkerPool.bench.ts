/**
 * Performance benchmarks for ChunkGenerationWorkerPool
 *
 * Compares worker-based generation vs synchronous generation
 * to measure actual speedup on multi-core systems.
 */

import { describe, bench, beforeAll, afterAll } from 'vitest';
import { ChunkGenerationWorkerPool } from '../ChunkGenerationWorkerPool.js';
import { TerrainGenerator } from '../../terrain/TerrainGenerator.js';
import { createChunk } from '../../chunks/Chunk.js';

describe('ChunkGenerationWorkerPool Performance', () => {
  let workerPool: ChunkGenerationWorkerPool;
  let terrainGenerator: TerrainGenerator;
  const SEED = 'benchmark-seed-12345';

  beforeAll(async () => {
    // Create worker pool with 4 workers (typical CPU core count)
    workerPool = new ChunkGenerationWorkerPool(4, SEED);

    // Create terrain generator for synchronous comparison
    terrainGenerator = new TerrainGenerator(SEED, undefined, undefined);

    console.info('[Benchmark] Worker pool initialized with 4 workers');
    console.info('[Benchmark] CPU cores available:', navigator.hardwareConcurrency);
  });

  afterAll(() => {
    workerPool.terminate();
  });

  // Baseline: Single chunk generation (overhead dominates)
  bench('Single-threaded: Generate 1 chunk', async () => {
    const chunk = createChunk(0, 0);
    terrainGenerator.generateChunk(chunk, undefined);
  });

  bench('Multi-threaded: Generate 1 chunk', async () => {
    await workerPool.generateChunk(0, 0);
  });

  // Sweet spot: 4 chunks (matches worker count)
  bench('Single-threaded: Generate 4 chunks', async () => {
    for (let i = 0; i < 4; i++) {
      const chunk = createChunk(i, 0);
      terrainGenerator.generateChunk(chunk, undefined);
    }
  });

  bench('Multi-threaded: Generate 4 chunks', async () => {
    const promises = [];
    for (let i = 0; i < 4; i++) {
      promises.push(workerPool.generateChunk(i, 0));
    }
    await Promise.all(promises);
  });

  // Stress test: 10 chunks (saturates all workers)
  bench('Single-threaded: Generate 10 chunks', async () => {
    for (let i = 0; i < 10; i++) {
      const chunk = createChunk(i, 0);
      terrainGenerator.generateChunk(chunk, undefined);
    }
  });

  bench('Multi-threaded: Generate 10 chunks', async () => {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(workerPool.generateChunk(i, 0));
    }
    await Promise.all(promises);
  });

  // Heavy load: 20 chunks (tests queue management)
  bench('Single-threaded: Generate 20 chunks', async () => {
    for (let i = 0; i < 20; i++) {
      const chunk = createChunk(i, 0);
      terrainGenerator.generateChunk(chunk, undefined);
    }
  });

  bench('Multi-threaded: Generate 20 chunks', async () => {
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(workerPool.generateChunk(i, 0));
    }
    await Promise.all(promises);
  });

  // Sequential vs parallel comparison
  bench('Sequential worker calls (no parallelism)', async () => {
    for (let i = 0; i < 10; i++) {
      await workerPool.generateChunk(i, 0);
    }
  });

  bench('Parallel worker calls (full parallelism)', async () => {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(workerPool.generateChunk(i, 0));
    }
    await Promise.all(promises);
  });

  // Different worker pool sizes
  describe('Pool Size Comparison', () => {
    let pool1: ChunkGenerationWorkerPool;
    let pool2: ChunkGenerationWorkerPool;
    let pool4: ChunkGenerationWorkerPool;
    let pool8: ChunkGenerationWorkerPool;

    beforeAll(() => {
      pool1 = new ChunkGenerationWorkerPool(1, SEED);
      pool2 = new ChunkGenerationWorkerPool(2, SEED);
      pool4 = new ChunkGenerationWorkerPool(4, SEED);
      pool8 = new ChunkGenerationWorkerPool(8, SEED);
    });

    afterAll(() => {
      pool1.terminate();
      pool2.terminate();
      pool4.terminate();
      pool8.terminate();
    });

    bench('1 worker: Generate 10 chunks', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(pool1.generateChunk(i, 0));
      }
      await Promise.all(promises);
    });

    bench('2 workers: Generate 10 chunks', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(pool2.generateChunk(i, 0));
      }
      await Promise.all(promises);
    });

    bench('4 workers: Generate 10 chunks', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(pool4.generateChunk(i, 0));
      }
      await Promise.all(promises);
    });

    bench('8 workers: Generate 10 chunks', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(pool8.generateChunk(i, 0));
      }
      await Promise.all(promises);
    });
  });
});
