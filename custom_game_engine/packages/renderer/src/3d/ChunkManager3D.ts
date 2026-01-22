/**
 * ChunkManager3D - Manages terrain chunks for 3D rendering
 *
 * Handles:
 * - Chunk lifecycle (creation, updates, disposal)
 * - Frustum culling (hide chunks outside camera view)
 * - LOD (level of detail) for distant chunks
 * - Chunk loading/unloading based on camera position
 */

import * as THREE from 'three';
import { ChunkMesh, type ChunkMeshConfig } from './ChunkMesh.js';

/** Chunk manager configuration */
export interface ChunkManager3DConfig {
  /** Chunk size in tiles */
  chunkSize: number;
  /** Render radius in chunks */
  renderRadius: number;
  /** Whether to use greedy meshing */
  useGreedyMeshing: boolean;
  /** Whether to enable frustum culling */
  enableFrustumCulling: boolean;
  /** Block size in world units */
  blockSize: number;
}

const DEFAULT_CONFIG: ChunkManager3DConfig = {
  chunkSize: 16,
  renderRadius: 4, // 4 chunks = 64 tiles
  useGreedyMeshing: true,
  enableFrustumCulling: true,
  blockSize: 1,
};

/** Chunk state */
interface ChunkEntry {
  chunk: ChunkMesh;
  lastAccessTick: number;
  distanceToCamera: number;
}

/**
 * ChunkManager3D handles all terrain chunks
 */
export class ChunkManager3D {
  private config: ChunkManager3DConfig;
  private scene: THREE.Scene;

  /** All loaded chunks, keyed by "chunkX,chunkZ" */
  private chunks: Map<string, ChunkEntry> = new Map();

  /** Shared material for all terrain chunks */
  private material: THREE.MeshLambertMaterial;

  /** Frustum for culling */
  private frustum = new THREE.Frustum();
  private projScreenMatrix = new THREE.Matrix4();

  /** Current camera chunk position */
  private cameraChunkX = 0;
  private cameraChunkZ = 0;

  /** Current tick for LRU tracking */
  private currentTick = 0;

  /** Statistics */
  private stats = {
    totalChunks: 0,
    visibleChunks: 0,
    totalVertices: 0,
    rebuildCount: 0,
    cullCount: 0,
  };

  /** World tile accessor */
  private getTileAt: ((x: number, y: number) => { terrain?: string; elevation?: number } | null) | null = null;

  constructor(scene: THREE.Scene, config: Partial<ChunkManager3DConfig> = {}) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Create shared material with vertex colors
    this.material = new THREE.MeshLambertMaterial({
      vertexColors: true,
    });
  }

  /**
   * Set the world tile accessor function
   */
  setTileAccessor(
    getTileAt: (x: number, y: number) => { terrain?: string; elevation?: number } | null
  ): void {
    this.getTileAt = getTileAt;
  }

  /**
   * Update chunks based on camera position
   */
  update(camera: THREE.PerspectiveCamera): void {
    this.currentTick++;

    // Get camera position in chunk coordinates
    const camWorldX = camera.position.x / this.config.blockSize;
    const camWorldZ = camera.position.z / this.config.blockSize;
    this.cameraChunkX = Math.floor(camWorldX / this.config.chunkSize);
    this.cameraChunkZ = Math.floor(camWorldZ / this.config.chunkSize);

    // Update frustum for culling
    if (this.config.enableFrustumCulling) {
      this.projScreenMatrix.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse
      );
      this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
    }

    // Load/unload chunks around camera
    this.updateChunksAroundCamera();

    // Rebuild dirty chunks
    this.rebuildDirtyChunks();

    // Perform frustum culling
    if (this.config.enableFrustumCulling) {
      this.performFrustumCulling();
    }

    // Update statistics
    this.updateStats();
  }

  /**
   * Load chunks around camera, unload distant ones
   */
  private updateChunksAroundCamera(): void {
    const radius = this.config.renderRadius;

    // Track which chunks should exist
    const neededChunks = new Set<string>();

    // Load chunks in render radius
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const chunkX = this.cameraChunkX + dx;
        const chunkZ = this.cameraChunkZ + dz;
        const key = `${chunkX},${chunkZ}`;

        neededChunks.add(key);

        if (!this.chunks.has(key)) {
          this.loadChunk(chunkX, chunkZ);
        }

        // Update access time and distance
        const entry = this.chunks.get(key);
        if (entry) {
          entry.lastAccessTick = this.currentTick;
          entry.distanceToCamera = Math.sqrt(dx * dx + dz * dz);
        }
      }
    }

    // Unload chunks outside radius
    const chunksToRemove: string[] = [];
    this.chunks.forEach((entry, key) => {
      if (!neededChunks.has(key)) {
        // Give some buffer before unloading (2x radius)
        if (entry.distanceToCamera > radius * 2) {
          chunksToRemove.push(key);
        }
      }
    });

    for (const key of chunksToRemove) {
      this.unloadChunk(key);
    }
  }

  /**
   * Load a new chunk
   */
  private loadChunk(chunkX: number, chunkZ: number): void {
    const key = `${chunkX},${chunkZ}`;

    const chunkConfig: Partial<ChunkMeshConfig> = {
      chunkSize: this.config.chunkSize,
      useGreedyMeshing: this.config.useGreedyMeshing,
      blockSize: this.config.blockSize,
    };

    const chunk = new ChunkMesh(chunkX, chunkZ, this.material, chunkConfig);

    // Build chunk from world data
    if (this.getTileAt) {
      chunk.buildFromWorld(this.getTileAt);
    }

    // Add to scene
    chunk.addToScene(this.scene);

    this.chunks.set(key, {
      chunk,
      lastAccessTick: this.currentTick,
      distanceToCamera: 0,
    });
  }

  /**
   * Unload a chunk
   */
  private unloadChunk(key: string): void {
    const entry = this.chunks.get(key);
    if (!entry) return;

    entry.chunk.removeFromScene(this.scene);
    entry.chunk.dispose();
    this.chunks.delete(key);
  }

  /**
   * Rebuild all dirty chunks
   */
  private rebuildDirtyChunks(): void {
    this.stats.rebuildCount = 0;

    this.chunks.forEach((entry) => {
      if (entry.chunk.isDirty()) {
        entry.chunk.rebuild();
        this.stats.rebuildCount++;
      }
    });
  }

  /**
   * Perform frustum culling on all chunks
   */
  private performFrustumCulling(): void {
    this.stats.cullCount = 0;
    this.stats.visibleChunks = 0;

    this.chunks.forEach((entry) => {
      const isVisible = this.frustum.intersectsBox(entry.chunk.boundingBox);
      entry.chunk.setVisible(isVisible);

      if (isVisible) {
        this.stats.visibleChunks++;
      } else {
        this.stats.cullCount++;
      }
    });
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    this.stats.totalChunks = this.chunks.size;
    this.stats.totalVertices = 0;

    this.chunks.forEach((entry) => {
      if (entry.chunk.isVisible()) {
        this.stats.totalVertices += entry.chunk.getStats().vertexCount;
      }
    });
  }

  /**
   * Get statistics
   */
  getStats(): Readonly<typeof this.stats> {
    return this.stats;
  }

  /**
   * Set render radius in chunks
   */
  setRenderRadius(radius: number): void {
    this.config.renderRadius = Math.max(1, Math.min(16, radius));
  }

  /**
   * Get render radius
   */
  getRenderRadius(): number {
    return this.config.renderRadius;
  }

  /**
   * Mark a world position as dirty (block changed)
   */
  markDirty(worldX: number, worldZ: number): void {
    const chunkX = Math.floor(worldX / this.config.chunkSize);
    const chunkZ = Math.floor(worldZ / this.config.chunkSize);
    const key = `${chunkX},${chunkZ}`;

    const entry = this.chunks.get(key);
    if (entry) {
      entry.chunk.markDirty();
    }
  }

  /**
   * Force rebuild of all chunks
   */
  rebuildAll(): void {
    this.chunks.forEach((entry) => {
      entry.chunk.markDirty();
    });
  }

  /**
   * Clear all chunks
   */
  clear(): void {
    const keys = Array.from(this.chunks.keys());
    keys.forEach((key) => {
      this.unloadChunk(key);
    });
    this.chunks.clear();
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.clear();
    this.material.dispose();
  }

  /**
   * Get a chunk by world position
   */
  getChunkAt(worldX: number, worldZ: number): ChunkMesh | null {
    const chunkX = Math.floor(worldX / this.config.chunkSize);
    const chunkZ = Math.floor(worldZ / this.config.chunkSize);
    const key = `${chunkX},${chunkZ}`;
    return this.chunks.get(key)?.chunk ?? null;
  }

  /**
   * Debug: Get all chunk keys
   */
  getLoadedChunkKeys(): string[] {
    return Array.from(this.chunks.keys());
  }
}
