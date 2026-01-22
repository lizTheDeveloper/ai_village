# Worker Thread Meshing Specification

**Status**: Draft
**Created**: 2026-01-22
**Priority**: Medium-High
**Inspiration**: Minecraft (Sodium mod), modern game engines
**System**: Renderer (`packages/renderer/src/3d/`)

## Problem Statement

Current chunk meshing runs on main thread:
- `ChunkMesh.rebuild()` blocks main thread during geometry generation
- Greedy meshing is CPU-intensive (nested loops over voxels)
- Large chunks can cause frame drops during rebuild
- Multiple chunks rebuilding = stutter

**Minecraft's approach**: Generate mesh data in worker threads, only upload to GPU on main thread.

## Current Architecture

```
Main Thread:
  ChunkManager3D.update()
    → ChunkMesh.rebuild()
      → GreedyMesher.mesh()      // CPU intensive!
      → createGeometry()          // Fast
      → uploadToGPU()             // Must be main thread
```

## Target Architecture

```
Main Thread:                    Worker Pool:
  ChunkManager3D.update()
    → requestMeshBuild(chunk)  →  Worker 1: GreedyMesher.mesh()
    → requestMeshBuild(chunk)  →  Worker 2: GreedyMesher.mesh()
    ...
    ← receiveMeshData(chunk)   ←  Worker 1: done
      → createGeometry()
      → uploadToGPU()
```

## Design Philosophy

1. **Keep GPU operations on main thread**: WebGL context is not shareable
2. **Move CPU work to workers**: Mesh generation, collision, pathfinding
3. **Async-friendly API**: Don't block waiting for workers
4. **Graceful degradation**: Fall back to main thread if workers unavailable

## Solution Architecture

### Phase 1: Shared Worker Infrastructure

Use existing `packages/shared-worker/`:

```typescript
// packages/shared-worker/src/workers/MeshWorker.ts

import { GreedyMesher, type MeshData } from '@ai-village/renderer/3d';

interface MeshRequest {
  type: 'mesh';
  chunkX: number;
  chunkZ: number;
  blocks: ArrayBuffer; // Transferable block data
  chunkSize: number;
  chunkHeight: number;
}

interface MeshResponse {
  type: 'mesh_complete';
  chunkX: number;
  chunkZ: number;
  meshData: {
    positions: Float32Array;   // Transferable
    normals: Float32Array;     // Transferable
    colors: Float32Array;      // Transferable
    indices: Uint32Array;      // Transferable
    vertexCount: number;
    indexCount: number;
  };
}

self.onmessage = (e: MessageEvent<MeshRequest>) => {
  const { chunkX, chunkZ, blocks, chunkSize, chunkHeight } = e.data;

  // Deserialize block data
  const blockView = new Uint32Array(blocks);
  const getBlock = (x: number, y: number, z: number): number => {
    const idx = x + z * chunkSize + y * chunkSize * chunkSize;
    return blockView[idx * 2] ?? 0; // type
  };
  const getColor = (x: number, y: number, z: number): number => {
    const idx = x + z * chunkSize + y * chunkSize * chunkSize;
    return blockView[idx * 2 + 1] ?? 0x9ca3af; // color
  };

  // Run meshing (CPU intensive, but in worker!)
  const mesher = new GreedyMesher(chunkSize, chunkHeight);
  const meshData = mesher.mesh(getBlock, getColor);

  // Transfer back (zero-copy)
  const response: MeshResponse = {
    type: 'mesh_complete',
    chunkX,
    chunkZ,
    meshData: {
      positions: meshData.positions,
      normals: meshData.normals,
      colors: meshData.colors,
      indices: meshData.indices,
      vertexCount: meshData.vertexCount,
      indexCount: meshData.indexCount,
    },
  };

  self.postMessage(response, [
    meshData.positions.buffer,
    meshData.normals.buffer,
    meshData.colors.buffer,
    meshData.indices.buffer,
  ]);
};
```

### Phase 2: Worker Pool Manager

```typescript
// packages/renderer/src/3d/MeshWorkerPool.ts

export class MeshWorkerPool {
  private workers: Worker[] = [];
  private available: Worker[] = [];
  private pending: Map<string, {
    resolve: (data: MeshData) => void;
    reject: (error: Error) => void;
  }> = new Map();

  constructor(poolSize: number = navigator.hardwareConcurrency || 4) {
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(
        new URL('./workers/MeshWorker.ts', import.meta.url),
        { type: 'module' }
      );

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
        console.error('Mesh worker error:', e);
        this.available.push(worker);
      };

      this.workers.push(worker);
      this.available.push(worker);
    }
  }

  /** Queue for when all workers busy */
  private queue: MeshRequest[] = [];

  async buildMesh(
    chunkX: number,
    chunkZ: number,
    blocks: BlockData
  ): Promise<MeshData> {
    return new Promise((resolve, reject) => {
      const key = `${chunkX},${chunkZ}`;
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

  private processQueue(): void {
    while (this.queue.length > 0 && this.available.length > 0) {
      const request = this.queue.shift()!;
      const worker = this.available.pop()!;
      worker.postMessage(request, [request.blocks]);
    }
  }

  private serializeBlocks(blocks: BlockData): ArrayBuffer {
    // Pack block type and color into transferable buffer
    const buffer = new ArrayBuffer(blocks.data.length * 8);
    const view = new Uint32Array(buffer);
    for (let i = 0; i < blocks.data.length; i++) {
      view[i * 2] = blocks.data[i].type;
      view[i * 2 + 1] = blocks.data[i].color;
    }
    return buffer;
  }

  dispose(): void {
    this.workers.forEach(w => w.terminate());
    this.workers = [];
    this.available = [];
  }
}
```

### Phase 3: Integrate with ChunkManager3D

```typescript
// packages/renderer/src/3d/ChunkManager3D.ts

export class ChunkManager3D {
  private workerPool: MeshWorkerPool;
  private pendingRebuilds: Set<string> = new Set();

  constructor(scene: THREE.Scene, config: Partial<ChunkManager3DConfig> = {}) {
    // ... existing code ...
    this.workerPool = new MeshWorkerPool();
  }

  private async rebuildChunkAsync(entry: ChunkEntry): Promise<void> {
    const key = `${entry.chunk.chunkX},${entry.chunk.chunkZ}`;

    // Already pending
    if (this.pendingRebuilds.has(key)) return;
    this.pendingRebuilds.add(key);

    try {
      // Get block data from chunk
      const blockData = entry.chunk.getBlockData();

      // Build mesh in worker (non-blocking!)
      const meshData = await this.workerPool.buildMesh(
        entry.chunk.chunkX,
        entry.chunk.chunkZ,
        blockData
      );

      // Apply mesh on main thread (GPU upload)
      entry.chunk.applyMeshData(meshData);
    } finally {
      this.pendingRebuilds.delete(key);
    }
  }

  /** Non-blocking rebuild - returns immediately */
  private rebuildDirtyChunks(): void {
    this.chunks.forEach((entry) => {
      if (entry.chunk.isDirty()) {
        // Fire and forget - will complete asynchronously
        this.rebuildChunkAsync(entry).catch(console.error);
        entry.chunk.clearDirty(); // Mark as no longer dirty
      }
    });
  }

  dispose(): void {
    this.clear();
    this.material.dispose();
    this.workerPool.dispose();
  }
}
```

### Phase 4: ChunkMesh Updates

```typescript
// packages/renderer/src/3d/ChunkMesh.ts

export class ChunkMesh {
  /** Get block data for worker serialization */
  getBlockData(): BlockData {
    return {
      chunkSize: this.config.chunkSize,
      chunkHeight: this.config.chunkHeight,
      data: this.blocks.flat(2).map(b => ({
        type: b?.type ?? 0,
        color: b?.color ?? 0,
      })),
    };
  }

  /** Apply mesh data from worker */
  applyMeshData(meshData: MeshData): void {
    // Dispose old geometry
    if (this.geometry) {
      this.geometry.dispose();
    }

    // Create new geometry from worker data
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position',
      new THREE.BufferAttribute(meshData.positions, 3));
    this.geometry.setAttribute('normal',
      new THREE.BufferAttribute(meshData.normals, 3));
    this.geometry.setAttribute('color',
      new THREE.BufferAttribute(meshData.colors, 3));
    this.geometry.setIndex(
      new THREE.BufferAttribute(meshData.indices, 1));

    // Update mesh
    if (this.mesh) {
      this.mesh.geometry = this.geometry;
    }

    this.stats.vertexCount = meshData.vertexCount;
    this.stats.indexCount = meshData.indexCount;
  }

  /** Clear dirty flag without rebuilding (for async flow) */
  clearDirty(): void {
    this.dirty = false;
  }
}
```

## Transferable Objects

Key optimization: Use `Transferable` arrays to avoid copying data between threads:

```typescript
// BAD: Copies data
worker.postMessage({ positions: positionArray });

// GOOD: Transfers ownership (zero-copy)
worker.postMessage({ positions: positionArray }, [positionArray.buffer]);
```

After transfer, the original array becomes unusable (neutered).

## Priority System

Not all chunks equally urgent:

```typescript
interface ChunkRebuildRequest {
  chunk: ChunkMesh;
  priority: number; // Lower = more urgent
}

// Priority calculation
function calculatePriority(chunk: ChunkMesh, camera: THREE.Camera): number {
  const distance = chunk.distanceTo(camera);
  const isVisible = frustum.intersectsBox(chunk.boundingBox);

  if (!isVisible) return 1000; // Low priority
  if (distance < 32) return 0;  // Immediate
  if (distance < 64) return 10; // High
  return 100; // Normal
}
```

## Performance Impact

**Before** (main thread meshing):
- 16x16x64 chunk: ~5-15ms to mesh
- 4 chunks rebuild = 60ms stutter
- Max 2-3 chunk rebuilds per frame

**After** (worker meshing):
- Main thread: <1ms (queue request)
- Workers: 5-15ms each (parallel, non-blocking)
- 4+ chunks can rebuild simultaneously
- No frame drops

## Fallback Mode

For browsers without Worker support:

```typescript
class MeshWorkerPool {
  private useWorkers: boolean;

  constructor() {
    this.useWorkers = typeof Worker !== 'undefined';
    if (!this.useWorkers) {
      console.warn('Workers unavailable, using main thread meshing');
    }
  }

  async buildMesh(...): Promise<MeshData> {
    if (!this.useWorkers) {
      // Synchronous fallback
      return this.buildMeshSync(...);
    }
    // Worker path
    return this.buildMeshAsync(...);
  }
}
```

## Future: SharedArrayBuffer

With proper COOP/COEP headers, can use SharedArrayBuffer for even faster data sharing:

```typescript
// Shared memory for block data (no copy needed)
const sharedBlocks = new SharedArrayBuffer(size);
const blocksView = new Uint32Array(sharedBlocks);

// Workers read directly from shared memory
worker.postMessage({ blocksBuffer: sharedBlocks });
```

Requires server headers:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

## References

- [MDN Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [Transferable Objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)
- [Sodium Mod Architecture](https://github.com/CaffeineMC/sodium-fabric)
- [Three.js Worker Examples](https://threejs.org/examples/?q=worker)
