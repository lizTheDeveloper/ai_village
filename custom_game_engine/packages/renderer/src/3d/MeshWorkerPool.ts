/**
 * MeshWorkerPool - Manages a pool of mesh worker threads
 *
 * Distributes mesh generation work across multiple workers for parallel processing.
 * Queues requests when all workers are busy.
 */

import type { MeshData } from './GreedyMesher.js';

/** Block data for serialization */
export interface BlockData {
  chunkSize: number;
  chunkHeight: number;
  data: Array<{
    type: number;
    color: number;
  }>;
}

/** Mesh request message */
interface MeshRequest {
  type: 'mesh';
  chunkX: number;
  chunkZ: number;
  blocks: ArrayBuffer;
  chunkSize: number;
  chunkHeight: number;
}

/** Mesh response message */
interface MeshResponse {
  type: 'mesh_complete';
  chunkX: number;
  chunkZ: number;
  meshData: {
    positions: Float32Array;
    normals: Float32Array;
    colors: Float32Array;
    indices: Uint32Array;
    vertexCount: number;
    indexCount: number;
  };
}

/**
 * Pool of mesh worker threads
 */
export class MeshWorkerPool {
  private workers: Worker[] = [];
  private available: Worker[] = [];
  private pending: Map<
    string,
    {
      resolve: (data: MeshData) => void;
      reject: (error: Error) => void;
    }
  > = new Map();
  private queue: MeshRequest[] = [];

  constructor(poolSize: number = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4) {
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(new URL('./workers/MeshWorker.ts', import.meta.url), {
        type: 'module',
      });

      worker.onmessage = (e: MessageEvent<MeshResponse>) => {
        const key = `${e.data.chunkX},${e.data.chunkZ}`;
        const pending = this.pending.get(key);
        if (pending) {
          pending.resolve(e.data.meshData);
          this.pending.delete(key);
        }
        this.available.push(worker);
        this.processQueue();
      };

      worker.onerror = (e) => {
        console.error('[MeshWorkerPool] Worker error:', e);
        // Find and reject the pending request
        this.pending.forEach((value, key) => {
          value.reject(new Error(`Worker error: ${e.message}`));
          this.pending.delete(key);
        });
        this.available.push(worker);
        this.processQueue();
      };

      this.workers.push(worker);
      this.available.push(worker);
    }
  }

  /**
   * Build mesh in worker thread
   *
   * @param chunkX Chunk X coordinate
   * @param chunkZ Chunk Z coordinate
   * @param blocks Block data to mesh
   * @returns Promise that resolves with mesh data
   */
  async buildMesh(chunkX: number, chunkZ: number, blocks: BlockData): Promise<MeshData> {
    return new Promise((resolve, reject) => {
      const key = `${chunkX},${chunkZ}`;

      // Cancel existing request for this chunk if any
      if (this.pending.has(key)) {
        const existing = this.pending.get(key)!;
        existing.reject(new Error('Cancelled - new request for same chunk'));
        this.pending.delete(key);
      }

      this.pending.set(key, { resolve, reject });

      const request: MeshRequest = {
        type: 'mesh',
        chunkX,
        chunkZ,
        blocks: this.serializeBlocks(blocks),
        chunkSize: blocks.chunkSize,
        chunkHeight: blocks.chunkHeight,
      };

      if (this.available.length > 0) {
        const worker = this.available.pop()!;
        worker.postMessage(request, [request.blocks]);
      } else {
        this.queue.push(request);
      }
    });
  }

  /**
   * Process queued requests when workers become available
   */
  private processQueue(): void {
    while (this.queue.length > 0 && this.available.length > 0) {
      const request = this.queue.shift()!;
      const worker = this.available.pop()!;
      worker.postMessage(request, [request.blocks]);
    }
  }

  /**
   * Serialize block data to transferable ArrayBuffer
   *
   * Format: [type0, color0, type1, color1, ...]
   */
  private serializeBlocks(blocks: BlockData): ArrayBuffer {
    const buffer = new ArrayBuffer(blocks.data.length * 8);
    const view = new Uint32Array(buffer);
    for (let i = 0; i < blocks.data.length; i++) {
      view[i * 2] = blocks.data[i]!.type;
      view[i * 2 + 1] = blocks.data[i]!.color;
    }
    return buffer;
  }

  /**
   * Dispose of all workers
   */
  dispose(): void {
    this.workers.forEach((w) => w.terminate());
    this.workers = [];
    this.available = [];
    this.pending.clear();
    this.queue = [];
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalWorkers: number;
    availableWorkers: number;
    pendingRequests: number;
    queuedRequests: number;
  } {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.available.length,
      pendingRequests: this.pending.size,
      queuedRequests: this.queue.length,
    };
  }
}
