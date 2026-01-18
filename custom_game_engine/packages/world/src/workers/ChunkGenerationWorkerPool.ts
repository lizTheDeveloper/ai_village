/**
 * Worker pool for background chunk generation.
 *
 * Manages a pool of Web Workers that generate chunk terrain in parallel.
 * Uses round-robin scheduling to distribute work across workers.
 *
 * Performance:
 * - Offloads CPU-intensive terrain generation to worker threads
 * - Main thread remains responsive during chunk generation
 * - Supports 1-4 worker threads (default: 2)
 *
 * Usage:
 * ```typescript
 * const pool = new ChunkGenerationWorkerPool(2, seed, planetConfig);
 * const tiles = await pool.generateChunk(chunkX, chunkY);
 * // ... apply tiles to chunk on main thread
 * pool.terminate(); // When done
 * ```
 */

import type {
  GenerateChunkRequest,
  WorkerResponse,
  ChunkGeneratedMessage,
} from './chunk-generation-types.js';
import type { PlanetConfig } from '../planet/PlanetTypes.js';

interface PendingRequest {
  resolve: (tiles: any[]) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

export class ChunkGenerationWorkerPool {
  private workers: Worker[] = [];
  private pendingRequests = new Map<string, PendingRequest>();
  private nextWorkerIndex = 0;
  private requestCounter = 0;

  /**
   * Create a worker pool.
   *
   * @param numWorkers - Number of worker threads (1-4, default: 2)
   * @param seed - World seed for terrain generation
   * @param planetConfig - Optional planet configuration
   */
  constructor(
    numWorkers: number = 2,
    private seed: string,
    private planetConfig?: PlanetConfig
  ) {
    // Clamp to reasonable range
    const workerCount = Math.max(1, Math.min(4, numWorkers));

    // Create worker pool
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(
        new URL('./chunk-generation.worker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        this.handleWorkerMessage(event.data);
      };

      worker.onerror = (error) => {
        console.error('[ChunkWorkerPool] Worker error:', error);
      };

      this.workers.push(worker);
    }
  }

  /**
   * Generate a chunk in a background worker thread.
   *
   * Returns tile data only - entity placement must happen on main thread.
   *
   * @param chunkX - Chunk X coordinate
   * @param chunkY - Chunk Y coordinate
   * @returns Promise that resolves to tile array
   */
  async generateChunk(chunkX: number, chunkY: number): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const requestId = `chunk-${chunkX}-${chunkY}-${this.requestCounter++}`;

      // Store pending request
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timestamp: Date.now(),
      });

      // Round-robin worker selection
      const worker = this.workers[this.nextWorkerIndex];
      this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;

      // Send request to worker
      const request: GenerateChunkRequest = {
        type: 'generate',
        requestId,
        chunkX,
        chunkY,
        seed: this.seed,
        planetConfig: this.planetConfig,
      };

      if (worker) {
        worker.postMessage(request);
      } else {
        reject(new Error('No worker available'));
      }

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Chunk generation timeout: (${chunkX}, ${chunkY})`));
        }
      }, 5000);
    });
  }

  /**
   * Handle worker response messages.
   */
  private handleWorkerMessage(message: WorkerResponse): void {
    if (message.type === 'chunk-generated') {
      const pending = this.pendingRequests.get(message.requestId);
      if (pending) {
        this.pendingRequests.delete(message.requestId);
        pending.resolve(message.tiles);
      }
    } else if (message.type === 'error') {
      const pending = this.pendingRequests.get(message.requestId);
      if (pending) {
        this.pendingRequests.delete(message.requestId);
        pending.reject(new Error(message.error));
      }
    }
    // Ignore 'ready' messages
  }

  /**
   * Get worker pool status.
   *
   * @returns Status information
   */
  getStatus() {
    return {
      numWorkers: this.workers.length,
      pendingRequests: this.pendingRequests.size,
    };
  }

  /**
   * Terminate all workers.
   *
   * Call this when shutting down to clean up resources.
   */
  terminate(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.pendingRequests.clear();
  }
}
