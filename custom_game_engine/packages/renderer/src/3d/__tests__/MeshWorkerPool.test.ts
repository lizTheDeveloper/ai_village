/**
 * MeshWorkerPool.test.ts
 *
 * Browser-compatible integration tests for MeshWorkerPool.
 *
 * ENVIRONMENT LIMITATIONS:
 * - Tests run in jsdom which doesn't support Web Workers natively
 * - We mock the Worker class to simulate worker behavior
 * - Real browser tests would use actual worker threads
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MeshWorkerPool, type BlockData } from '../MeshWorkerPool.js';
import type { MeshData } from '../GreedyMesher.js';

/**
 * Mock Worker implementation for testing
 *
 * Simulates worker behavior by directly calling the meshing logic
 * in the main thread instead of spawning actual workers.
 */
class MockWorker extends EventTarget {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  postMessage(message: any, transfer?: any[]): void {
    // Simulate async worker processing
    setTimeout(() => {
      try {
        const { chunkX, chunkZ, blocks, chunkSize, chunkHeight } = message;

        // Deserialize block data (same as real worker)
        const blockView = new Uint32Array(blocks);

        const getBlock = (x: number, y: number, z: number): number => {
          if (
            x < 0 ||
            x >= chunkSize ||
            y < 0 ||
            y >= chunkHeight ||
            z < 0 ||
            z >= chunkSize
          ) {
            return 0;
          }
          const idx = x + z * chunkSize + y * chunkSize * chunkSize;
          return blockView[idx * 2] ?? 0;
        };

        const getColor = (x: number, y: number, z: number): number => {
          if (
            x < 0 ||
            x >= chunkSize ||
            y < 0 ||
            y >= chunkHeight ||
            z < 0 ||
            z >= chunkSize
          ) {
            return 0x9ca3af;
          }
          const idx = x + z * chunkSize + y * chunkSize * chunkSize;
          return blockView[idx * 2 + 1] ?? 0x9ca3af;
        };

        // Simulate mesh generation (simplified - just count visible faces)
        let vertexCount = 0;
        let indexCount = 0;

        for (let y = 0; y < chunkHeight; y++) {
          for (let z = 0; z < chunkSize; z++) {
            for (let x = 0; x < chunkSize; x++) {
              const block = getBlock(x, y, z);
              if (block === 0) continue;

              // Check each face for visibility
              const faces = [
                [x + 1, y, z],
                [x - 1, y, z],
                [x, y + 1, z],
                [x, y - 1, z],
                [x, y, z + 1],
                [x, y, z - 1],
              ];

              for (const [nx, ny, nz] of faces) {
                if (getBlock(nx, ny, nz) === 0) {
                  vertexCount += 4; // 4 vertices per face
                  indexCount += 6; // 2 triangles per face
                }
              }
            }
          }
        }

        // Create minimal valid mesh data
        const meshData: MeshData = {
          positions: new Float32Array(vertexCount * 3),
          normals: new Float32Array(vertexCount * 3),
          colors: new Float32Array(vertexCount * 3),
          indices: new Uint32Array(indexCount),
          vertexCount,
          indexCount,
        };

        // Fill with test data
        for (let i = 0; i < vertexCount; i++) {
          meshData.positions[i * 3] = i;
          meshData.positions[i * 3 + 1] = i;
          meshData.positions[i * 3 + 2] = i;
          meshData.normals[i * 3] = 0;
          meshData.normals[i * 3 + 1] = 1;
          meshData.normals[i * 3 + 2] = 0;
          meshData.colors[i * 3] = 0.5;
          meshData.colors[i * 3 + 1] = 0.5;
          meshData.colors[i * 3 + 2] = 0.5;
        }

        for (let i = 0; i < indexCount; i++) {
          meshData.indices[i] = i;
        }

        const response = {
          type: 'mesh_complete',
          chunkX,
          chunkZ,
          meshData,
        };

        if (this.onmessage) {
          this.onmessage(new MessageEvent('message', { data: response }));
        }
      } catch (error) {
        if (this.onerror) {
          this.onerror(
            new ErrorEvent('error', {
              message: error instanceof Error ? error.message : String(error),
            })
          );
        }
      }
    }, 10); // Small delay to simulate async processing
  }

  terminate(): void {
    // Mock termination
    this.onmessage = null;
    this.onerror = null;
  }
}

describe('MeshWorkerPool', () => {
  let pool: MeshWorkerPool;

  beforeEach(() => {
    // Mock the Worker constructor
    global.Worker = MockWorker as any;

    // Mock navigator for hardware concurrency detection
    Object.defineProperty(global, 'navigator', {
      value: { hardwareConcurrency: 4 },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    if (pool) {
      pool.dispose();
    }
    vi.restoreAllMocks();
  });

  describe('Pool initialization', () => {
    it('should initialize with correct number of workers based on hardware concurrency', () => {
      pool = new MeshWorkerPool(4);
      const stats = pool.getStats();

      expect(stats.totalWorkers).toBe(4);
      expect(stats.availableWorkers).toBe(4);
      expect(stats.pendingRequests).toBe(0);
      expect(stats.queuedRequests).toBe(0);
    });

    it('should default to navigator.hardwareConcurrency when no pool size specified', () => {
      pool = new MeshWorkerPool();
      const stats = pool.getStats();

      expect(stats.totalWorkers).toBe(4); // From mocked navigator
      expect(stats.availableWorkers).toBe(4);
    });

    it('should handle custom pool size', () => {
      pool = new MeshWorkerPool(2);
      const stats = pool.getStats();

      expect(stats.totalWorkers).toBe(2);
      expect(stats.availableWorkers).toBe(2);
    });
  });

  describe('buildMesh()', () => {
    beforeEach(() => {
      pool = new MeshWorkerPool(2);
    });

    it('should return valid mesh data for simple block data', async () => {
      // Create simple 2x2x2 chunk with one solid block
      const blockData: BlockData = {
        chunkSize: 2,
        chunkHeight: 2,
        data: [
          // Layer 0 (y=0)
          { type: 1, color: 0xff0000 }, // (0,0,0) - red block
          { type: 0, color: 0x000000 }, // (1,0,0)
          { type: 0, color: 0x000000 }, // (0,0,1)
          { type: 0, color: 0x000000 }, // (1,0,1)
          // Layer 1 (y=1)
          { type: 0, color: 0x000000 }, // (0,1,0)
          { type: 0, color: 0x000000 }, // (1,1,0)
          { type: 0, color: 0x000000 }, // (0,1,1)
          { type: 0, color: 0x000000 }, // (1,1,1)
        ],
      };

      const meshData = await pool.buildMesh(0, 0, blockData);

      // Verify mesh data structure
      expect(meshData).toBeDefined();
      expect(meshData.positions).toBeInstanceOf(Float32Array);
      expect(meshData.normals).toBeInstanceOf(Float32Array);
      expect(meshData.colors).toBeInstanceOf(Float32Array);
      expect(meshData.indices).toBeInstanceOf(Uint32Array);

      // Verify counts are consistent
      expect(meshData.positions.length).toBe(meshData.vertexCount * 3);
      expect(meshData.normals.length).toBe(meshData.vertexCount * 3);
      expect(meshData.colors.length).toBe(meshData.vertexCount * 3);
      expect(meshData.indices.length).toBe(meshData.indexCount);

      // Single block should have 6 faces (all visible)
      expect(meshData.vertexCount).toBe(24); // 6 faces * 4 vertices
      expect(meshData.indexCount).toBe(36); // 6 faces * 6 indices

      const stats = pool.getStats();
      expect(stats.pendingRequests).toBe(0); // Request completed
    });

    it('should return empty mesh for all-air chunk', async () => {
      const blockData: BlockData = {
        chunkSize: 2,
        chunkHeight: 2,
        data: Array(8).fill({ type: 0, color: 0x000000 }),
      };

      const meshData = await pool.buildMesh(0, 0, blockData);

      expect(meshData.vertexCount).toBe(0);
      expect(meshData.indexCount).toBe(0);
      expect(meshData.positions.length).toBe(0);
    });

    it('should handle multiple blocks', async () => {
      // 2x2x2 chunk with two blocks
      const blockData: BlockData = {
        chunkSize: 2,
        chunkHeight: 2,
        data: [
          { type: 1, color: 0xff0000 }, // (0,0,0)
          { type: 1, color: 0x00ff00 }, // (1,0,0)
          { type: 0, color: 0x000000 },
          { type: 0, color: 0x000000 },
          { type: 0, color: 0x000000 },
          { type: 0, color: 0x000000 },
          { type: 0, color: 0x000000 },
          { type: 0, color: 0x000000 },
        ],
      };

      const meshData = await pool.buildMesh(0, 0, blockData);

      // Two adjacent blocks share one face (culled), so 10 visible faces
      expect(meshData.vertexCount).toBe(40); // 10 faces * 4 vertices
      expect(meshData.indexCount).toBe(60); // 10 faces * 6 indices
    });
  });

  describe('Request cancellation', () => {
    beforeEach(() => {
      pool = new MeshWorkerPool(1); // Single worker to ensure ordering
    });

    it('should cancel existing request when same chunk requested twice', async () => {
      const blockData: BlockData = {
        chunkSize: 2,
        chunkHeight: 2,
        data: Array(8).fill({ type: 1, color: 0xff0000 }),
      };

      // Start first request
      const promise1 = pool.buildMesh(0, 0, blockData);

      // Immediately start second request for same chunk
      const promise2 = pool.buildMesh(0, 0, blockData);

      // First request should be rejected
      await expect(promise1).rejects.toThrow('Cancelled - new request for same chunk');

      // Second request should complete successfully
      const meshData = await promise2;
      expect(meshData).toBeDefined();
      expect(meshData.vertexCount).toBeGreaterThan(0);
    });

    it('should handle cancellation of different chunks independently', async () => {
      const blockData: BlockData = {
        chunkSize: 2,
        chunkHeight: 2,
        data: Array(8).fill({ type: 1, color: 0xff0000 }),
      };

      // Request two different chunks
      const promise1 = pool.buildMesh(0, 0, blockData);
      const promise2 = pool.buildMesh(1, 0, blockData);

      // Both should complete successfully
      const [meshData1, meshData2] = await Promise.all([promise1, promise2]);
      expect(meshData1).toBeDefined();
      expect(meshData2).toBeDefined();
    });
  });

  describe('Queue processing', () => {
    beforeEach(() => {
      pool = new MeshWorkerPool(2); // Two workers
    });

    it('should queue requests when all workers are busy', async () => {
      const blockData: BlockData = {
        chunkSize: 2,
        chunkHeight: 2,
        data: Array(8).fill({ type: 1, color: 0xff0000 }),
      };

      // Start 4 requests with only 2 workers
      const promises = [
        pool.buildMesh(0, 0, blockData),
        pool.buildMesh(1, 0, blockData),
        pool.buildMesh(2, 0, blockData),
        pool.buildMesh(3, 0, blockData),
      ];

      // Check stats before any complete
      const statsDuring = pool.getStats();
      expect(statsDuring.totalWorkers).toBe(2);
      expect(statsDuring.pendingRequests).toBe(4);

      // All requests should eventually complete
      const results = await Promise.all(promises);
      expect(results).toHaveLength(4);
      results.forEach((meshData) => {
        expect(meshData).toBeDefined();
        expect(meshData.vertexCount).toBeGreaterThan(0);
      });

      // All workers should be available again
      const statsAfter = pool.getStats();
      expect(statsAfter.availableWorkers).toBe(2);
      expect(statsAfter.pendingRequests).toBe(0);
      expect(statsAfter.queuedRequests).toBe(0);
    });

    it('should process queue in order', async () => {
      pool.dispose();
      pool = new MeshWorkerPool(1); // Single worker for deterministic ordering

      const blockData: BlockData = {
        chunkSize: 2,
        chunkHeight: 2,
        data: Array(8).fill({ type: 1, color: 0xff0000 }),
      };

      const results: number[] = [];

      // Start 3 requests
      const p1 = pool.buildMesh(0, 0, blockData).then(() => results.push(1));
      const p2 = pool.buildMesh(1, 0, blockData).then(() => results.push(2));
      const p3 = pool.buildMesh(2, 0, blockData).then(() => results.push(3));

      await Promise.all([p1, p2, p3]);

      // Should complete in order
      expect(results).toEqual([1, 2, 3]);
    });
  });

  describe('getStats()', () => {
    beforeEach(() => {
      pool = new MeshWorkerPool(3);
    });

    it('should return correct counts for idle pool', () => {
      const stats = pool.getStats();

      expect(stats.totalWorkers).toBe(3);
      expect(stats.availableWorkers).toBe(3);
      expect(stats.pendingRequests).toBe(0);
      expect(stats.queuedRequests).toBe(0);
    });

    it('should track pending requests', async () => {
      const blockData: BlockData = {
        chunkSize: 2,
        chunkHeight: 2,
        data: Array(8).fill({ type: 1, color: 0xff0000 }),
      };

      // Start 2 requests (won't wait for completion)
      const p1 = pool.buildMesh(0, 0, blockData);
      const p2 = pool.buildMesh(1, 0, blockData);

      const stats = pool.getStats();
      expect(stats.pendingRequests).toBe(2);
      expect(stats.availableWorkers).toBeLessThan(3);

      // Wait for completion
      await Promise.all([p1, p2]);

      const statsAfter = pool.getStats();
      expect(statsAfter.pendingRequests).toBe(0);
      expect(statsAfter.availableWorkers).toBe(3);
    });

    it('should track queued requests', () => {
      const blockData: BlockData = {
        chunkSize: 2,
        chunkHeight: 2,
        data: Array(8).fill({ type: 1, color: 0xff0000 }),
      };

      // Start 5 requests with 3 workers
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(pool.buildMesh(i, 0, blockData));
      }

      const stats = pool.getStats();
      expect(stats.totalWorkers).toBe(3);
      expect(stats.pendingRequests).toBe(5);

      // Wait for cleanup
      return Promise.all(promises);
    });
  });

  describe('dispose()', () => {
    it('should terminate all workers', () => {
      pool = new MeshWorkerPool(4);

      const statsBefore = pool.getStats();
      expect(statsBefore.totalWorkers).toBe(4);

      pool.dispose();

      const statsAfter = pool.getStats();
      expect(statsAfter.totalWorkers).toBe(0);
      expect(statsAfter.availableWorkers).toBe(0);
      expect(statsAfter.pendingRequests).toBe(0);
      expect(statsAfter.queuedRequests).toBe(0);
    });

    it('should clear all pending requests', async () => {
      pool = new MeshWorkerPool(1);

      const blockData: BlockData = {
        chunkSize: 2,
        chunkHeight: 2,
        data: Array(8).fill({ type: 1, color: 0xff0000 }),
      };

      // Start requests
      pool.buildMesh(0, 0, blockData);
      pool.buildMesh(1, 0, blockData);

      const statsBefore = pool.getStats();
      expect(statsBefore.pendingRequests).toBeGreaterThan(0);

      pool.dispose();

      const statsAfter = pool.getStats();
      expect(statsAfter.pendingRequests).toBe(0);
    });

    it('should be safe to call multiple times', () => {
      pool = new MeshWorkerPool(2);

      expect(() => {
        pool.dispose();
        pool.dispose();
        pool.dispose();
      }).not.toThrow();

      const stats = pool.getStats();
      expect(stats.totalWorkers).toBe(0);
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      pool = new MeshWorkerPool(1);
    });

    it('should handle worker errors gracefully', async () => {
      // Create a mock worker that will error
      const OriginalWorker = global.Worker;
      let errorWorker: MockWorker | null = null;

      class ErrorWorker extends MockWorker {
        postMessage(message: any, transfer?: any[]): void {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new ErrorEvent('error', { message: 'Test worker error' }));
            }
          }, 10);
        }
      }

      global.Worker = ErrorWorker as any;
      errorWorker = new ErrorWorker();

      pool.dispose();
      pool = new MeshWorkerPool(1);

      const blockData: BlockData = {
        chunkSize: 2,
        chunkHeight: 2,
        data: Array(8).fill({ type: 1, color: 0xff0000 }),
      };

      // Request should be rejected due to worker error
      await expect(pool.buildMesh(0, 0, blockData)).rejects.toThrow('Worker error');

      // Restore original worker
      global.Worker = OriginalWorker;
    });
  });

  describe('Edge cases', () => {
    beforeEach(() => {
      pool = new MeshWorkerPool(2);
    });

    it('should handle zero-size block data', async () => {
      const blockData: BlockData = {
        chunkSize: 0,
        chunkHeight: 0,
        data: [],
      };

      const meshData = await pool.buildMesh(0, 0, blockData);
      expect(meshData.vertexCount).toBe(0);
      expect(meshData.indexCount).toBe(0);
    });

    it('should handle large chunk coordinates', async () => {
      const blockData: BlockData = {
        chunkSize: 2,
        chunkHeight: 2,
        data: Array(8).fill({ type: 1, color: 0xff0000 }),
      };

      const meshData = await pool.buildMesh(999999, 999999, blockData);
      expect(meshData).toBeDefined();
      expect(meshData.vertexCount).toBeGreaterThan(0);
    });

    it('should handle negative chunk coordinates', async () => {
      const blockData: BlockData = {
        chunkSize: 2,
        chunkHeight: 2,
        data: Array(8).fill({ type: 1, color: 0xff0000 }),
      };

      const meshData = await pool.buildMesh(-10, -20, blockData);
      expect(meshData).toBeDefined();
      expect(meshData.vertexCount).toBeGreaterThan(0);
    });
  });
});
