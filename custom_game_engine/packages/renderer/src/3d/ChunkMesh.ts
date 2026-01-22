/**
 * ChunkMesh - Batched geometry for a single terrain chunk
 *
 * Combines all visible voxel faces in a chunk into a single mesh,
 * dramatically reducing draw calls compared to individual block meshes.
 */

import * as THREE from 'three';
import { GreedyMesher, SimpleMesher, type MeshData } from './GreedyMesher.js';

/** Terrain type to color mapping */
const TERRAIN_COLORS: Record<string, number> = {
  grass: 0x4ade80,
  dirt: 0x8b6914,
  stone: 0x6b7280,
  sand: 0xfcd34d,
  water: 0x3b82f6,
  snow: 0xf0f9ff,
  forest: 0x166534,
  mountain: 0x78716c,
  default: 0x9ca3af,
};

/** Chunk configuration */
export interface ChunkMeshConfig {
  /** Chunk size in tiles (default 16) */
  chunkSize: number;
  /** Maximum height in blocks (default 64) */
  chunkHeight: number;
  /** Whether to use greedy meshing (default true) */
  useGreedyMeshing: boolean;
  /** Block size in world units (default 1) */
  blockSize: number;
}

const DEFAULT_CONFIG: ChunkMeshConfig = {
  chunkSize: 16,
  chunkHeight: 64,
  useGreedyMeshing: true,
  blockSize: 1,
};

/** Block data stored in chunk */
interface BlockInfo {
  type: number; // 0 = air
  terrain: string;
  color: number;
}

/**
 * ChunkMesh manages the geometry for a single 16x16xN chunk
 */
export class ChunkMesh {
  /** Chunk position in chunk coordinates */
  readonly chunkX: number;
  readonly chunkZ: number;

  /** Configuration */
  readonly config: ChunkMeshConfig;

  /** The Three.js mesh */
  private mesh: THREE.Mesh | null = null;

  /** Geometry (owned by this chunk) */
  private geometry: THREE.BufferGeometry | null = null;

  /** Shared material (not owned) */
  private material: THREE.Material;

  /** Block data for this chunk */
  private blocks: BlockInfo[][][]; // [x][z][y]

  /** Mesher instance */
  private mesher: GreedyMesher | SimpleMesher;

  /** Bounding box for frustum culling */
  boundingBox: THREE.Box3;

  /** Whether chunk needs rebuild */
  private dirty = true;

  /** Statistics */
  private stats = {
    vertexCount: 0,
    indexCount: 0,
    blockCount: 0,
    rebuildTime: 0,
  };

  constructor(
    chunkX: number,
    chunkZ: number,
    material: THREE.Material,
    config: Partial<ChunkMeshConfig> = {}
  ) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.material = material;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize block storage
    this.blocks = [];
    for (let x = 0; x < this.config.chunkSize; x++) {
      this.blocks[x] = [];
      for (let z = 0; z < this.config.chunkSize; z++) {
        this.blocks[x]![z] = [];
      }
    }

    // Create mesher
    this.mesher = this.config.useGreedyMeshing
      ? new GreedyMesher(this.config.chunkSize, this.config.chunkHeight)
      : new SimpleMesher(this.config.chunkSize, this.config.chunkHeight);

    // Initialize bounding box
    const worldX = chunkX * this.config.chunkSize * this.config.blockSize;
    const worldZ = chunkZ * this.config.chunkSize * this.config.blockSize;
    this.boundingBox = new THREE.Box3(
      new THREE.Vector3(worldX, -10 * this.config.blockSize, worldZ),
      new THREE.Vector3(
        worldX + this.config.chunkSize * this.config.blockSize,
        this.config.chunkHeight * this.config.blockSize,
        worldZ + this.config.chunkSize * this.config.blockSize
      )
    );
  }

  /**
   * Set a block at local chunk coordinates
   */
  setBlock(localX: number, localY: number, localZ: number, terrain: string): void {
    if (
      localX < 0 ||
      localX >= this.config.chunkSize ||
      localZ < 0 ||
      localZ >= this.config.chunkSize ||
      localY < -10 ||
      localY >= this.config.chunkHeight
    ) {
      return;
    }

    // Normalize Y to array index (support negative Y for underground)
    const yIndex = localY + 10;

    if (!this.blocks[localX]![localZ]![yIndex]) {
      this.blocks[localX]![localZ]![yIndex] = {
        type: 0,
        terrain: 'air',
        color: 0,
      };
    }

    const block = this.blocks[localX]![localZ]![yIndex]!;

    if (terrain === 'air' || !terrain) {
      block.type = 0;
      block.terrain = 'air';
      block.color = 0;
    } else {
      block.type = 1;
      block.terrain = terrain;
      block.color = TERRAIN_COLORS[terrain] ?? TERRAIN_COLORS['default']!;
    }

    this.dirty = true;
  }

  /**
   * Get block at local chunk coordinates
   */
  getBlock(localX: number, localY: number, localZ: number): BlockInfo | null {
    if (
      localX < 0 ||
      localX >= this.config.chunkSize ||
      localZ < 0 ||
      localZ >= this.config.chunkSize
    ) {
      return null;
    }

    const yIndex = localY + 10;
    if (yIndex < 0 || yIndex >= this.config.chunkHeight + 10) {
      return null;
    }

    return this.blocks[localX]?.[localZ]?.[yIndex] ?? null;
  }

  /**
   * Build chunk from world tile data
   */
  buildFromWorld(
    getTile: (worldX: number, worldY: number) => { terrain?: string; elevation?: number } | null
  ): void {
    const startX = this.chunkX * this.config.chunkSize;
    const startZ = this.chunkZ * this.config.chunkSize;

    for (let x = 0; x < this.config.chunkSize; x++) {
      for (let z = 0; z < this.config.chunkSize; z++) {
        const worldX = startX + x;
        const worldZ = startZ + z;

        const tile = getTile(worldX, worldZ);
        if (!tile) continue;

        const terrain = tile.terrain || 'grass';
        const elevation = tile.elevation ?? 0;

        // Build surface block + blocks below
        const minY = Math.max(-10, elevation - 3);
        const maxY = elevation;

        for (let y = minY; y <= maxY; y++) {
          let blockTerrain: string;
          if (y === elevation) {
            blockTerrain = terrain;
          } else if (y > elevation - 2) {
            blockTerrain = 'dirt';
          } else {
            blockTerrain = 'stone';
          }
          this.setBlock(x, y, z, blockTerrain);
        }
      }
    }

    this.dirty = true;
  }

  /**
   * Rebuild the mesh geometry if dirty
   */
  rebuild(): boolean {
    if (!this.dirty) return false;

    const startTime = performance.now();

    // Generate mesh data using mesher
    const meshData = this.mesher.mesh(
      (x, y, z) => {
        const block = this.getBlock(x, y - 10, z); // Convert back to world Y
        return block?.type ?? 0;
      },
      (x, y, z) => {
        const block = this.getBlock(x, y - 10, z);
        return block?.color ?? 0x9ca3af;
      }
    );

    // Update or create geometry
    if (this.geometry) {
      this.geometry.dispose();
    }

    this.geometry = GreedyMesher.createGeometry(meshData);

    // Update or create mesh
    if (!this.mesh) {
      this.mesh = new THREE.Mesh(this.geometry, this.material);
      this.mesh.position.set(
        this.chunkX * this.config.chunkSize * this.config.blockSize,
        0,
        this.chunkZ * this.config.chunkSize * this.config.blockSize
      );
      this.mesh.castShadow = true;
      this.mesh.receiveShadow = true;
    } else {
      this.mesh.geometry = this.geometry;
    }

    // Update stats
    this.stats.vertexCount = meshData.vertexCount;
    this.stats.indexCount = meshData.indexCount;
    this.stats.rebuildTime = performance.now() - startTime;

    this.dirty = false;
    return true;
  }

  /**
   * Get the Three.js mesh (rebuilds if necessary)
   */
  getMesh(): THREE.Mesh | null {
    if (this.dirty) {
      this.rebuild();
    }
    return this.mesh;
  }

  /**
   * Check if chunk needs rebuild
   */
  isDirty(): boolean {
    return this.dirty;
  }

  /**
   * Mark chunk as needing rebuild
   */
  markDirty(): void {
    this.dirty = true;
  }

  /**
   * Get chunk statistics
   */
  getStats(): Readonly<typeof this.stats> {
    return this.stats;
  }

  /**
   * Set mesh visibility
   */
  setVisible(visible: boolean): void {
    if (this.mesh) {
      this.mesh.visible = visible;
    }
  }

  /**
   * Check if mesh is visible
   */
  isVisible(): boolean {
    return this.mesh?.visible ?? false;
  }

  /**
   * Add mesh to scene
   */
  addToScene(scene: THREE.Scene): void {
    const mesh = this.getMesh();
    if (mesh && !mesh.parent) {
      scene.add(mesh);
    }
  }

  /**
   * Remove mesh from scene
   */
  removeFromScene(scene: THREE.Scene): void {
    if (this.mesh && this.mesh.parent === scene) {
      scene.remove(this.mesh);
    }
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
    this.mesh = null;
    this.blocks = [];
  }
}
