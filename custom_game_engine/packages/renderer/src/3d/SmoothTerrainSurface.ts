/**
 * SmoothTerrainSurface - Generates a smooth terrain mesh overlay
 *
 * Instead of showing blocky voxel staircases, this creates an interpolated
 * surface mesh that smoothly follows the terrain elevation, giving a more
 * natural rock/ground appearance.
 */

import * as THREE from 'three';

/** Terrain type to color mapping (matches ChunkMesh colors) */
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

export interface SmoothTerrainConfig {
  /** Radius in tiles around camera to generate smooth surface */
  radius: number;
  /** Subdivisions per tile for smooth interpolation */
  resolution: number;
  /** Block size in world units */
  blockSize: number;
  /** Vertical offset above voxel surface to prevent z-fighting */
  yOffset: number;
}

const DEFAULT_CONFIG: SmoothTerrainConfig = {
  radius: 64,
  resolution: 2,  // 2 subdivisions per tile = smooth enough
  blockSize: 1,
  yOffset: 0.05,
};

/**
 * SmoothTerrainSurface generates an interpolated mesh that covers the
 * top of the voxel terrain, eliminating staircase artifacts.
 */
export class SmoothTerrainSurface {
  private config: SmoothTerrainConfig;
  private scene: THREE.Scene;
  private mesh: THREE.Mesh | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.MeshLambertMaterial;

  /** World tile accessor */
  private getTileAt: ((x: number, y: number) => { terrain?: string; elevation?: number } | null) | null = null;

  /** Last camera chunk position for dirty checking */
  private lastCamChunkX = Infinity;
  private lastCamChunkZ = Infinity;

  /** Throttle rebuild frequency */
  private lastRebuildTime = 0;
  private readonly REBUILD_INTERVAL_MS = 500;

  constructor(scene: THREE.Scene, config: Partial<SmoothTerrainConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.scene = scene;

    this.material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.FrontSide,
    });
  }

  setTileAccessor(
    getTileAt: (x: number, y: number) => { terrain?: string; elevation?: number } | null
  ): void {
    this.getTileAt = getTileAt;
  }

  /**
   * Update the smooth surface based on camera position.
   * Only rebuilds when camera moves to a new chunk area.
   */
  update(camera: THREE.PerspectiveCamera): void {
    if (!this.getTileAt) return;

    const camWorldX = Math.floor(camera.position.x / this.config.blockSize);
    const camWorldZ = Math.floor(camera.position.z / this.config.blockSize);
    const camChunkX = Math.floor(camWorldX / 16);
    const camChunkZ = Math.floor(camWorldZ / 16);

    // Only rebuild when camera moves to a different chunk
    if (camChunkX === this.lastCamChunkX && camChunkZ === this.lastCamChunkZ) {
      return;
    }

    // Throttle rebuilds
    const now = performance.now();
    if (now - this.lastRebuildTime < this.REBUILD_INTERVAL_MS) {
      return;
    }

    this.lastCamChunkX = camChunkX;
    this.lastCamChunkZ = camChunkZ;
    this.lastRebuildTime = now;

    this.rebuildSurface(camWorldX, camWorldZ);
  }

  /**
   * Rebuild the smooth terrain surface mesh around a world position.
   */
  private rebuildSurface(centerX: number, centerZ: number): void {
    if (!this.getTileAt) return;

    const r = this.config.radius;
    const res = this.config.resolution;
    const bs = this.config.blockSize;

    // Grid dimensions: (2*radius*resolution + 1) vertices per axis
    const gridSize = 2 * r * res + 1;
    const vertexCount = gridSize * gridSize;
    const faceCount = (gridSize - 1) * (gridSize - 1) * 2;

    // Allocate buffers
    const positions = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const indices = new Uint32Array(faceCount * 3);

    const startX = centerX - r;
    const startZ = centerZ - r;
    const step = 1 / res; // World units per subdivision

    // Build height cache for the tile grid (with 1-tile border for interpolation)
    const cacheSize = 2 * r + 3; // extra border
    const heightCache: number[] = new Array(cacheSize * cacheSize).fill(0);
    const terrainCache: string[] = new Array(cacheSize * cacheSize).fill('default');

    for (let iz = 0; iz < cacheSize; iz++) {
      for (let ix = 0; ix < cacheSize; ix++) {
        const wx = startX - 1 + ix;
        const wz = startZ - 1 + iz;
        const tile = this.getTileAt!(wx, wz);
        const idx = iz * cacheSize + ix;
        heightCache[idx] = tile?.elevation ?? 0;
        terrainCache[idx] = tile?.terrain ?? 'default';
      }
    }

    // Helper: get cached height at integer tile coords (relative to startX-1, startZ-1)
    const getHeight = (tileX: number, tileZ: number): number => {
      const cx = tileX - startX + 1;
      const cz = tileZ - startZ + 1;
      if (cx < 0 || cx >= cacheSize || cz < 0 || cz >= cacheSize) return 0;
      return heightCache[cz * cacheSize + cx]!;
    };

    // Helper: get cached terrain at integer tile coords
    const getTerrain = (tileX: number, tileZ: number): string => {
      const cx = tileX - startX + 1;
      const cz = tileZ - startZ + 1;
      if (cx < 0 || cx >= cacheSize || cz < 0 || cz >= cacheSize) return 'default';
      return terrainCache[cz * cacheSize + cx]!;
    };

    // Bilinear interpolation of elevation
    const interpolateHeight = (worldX: number, worldZ: number): number => {
      const fx = Math.floor(worldX);
      const fz = Math.floor(worldZ);
      const tx = worldX - fx;
      const tz = worldZ - fz;

      const h00 = getHeight(fx, fz);
      const h10 = getHeight(fx + 1, fz);
      const h01 = getHeight(fx, fz + 1);
      const h11 = getHeight(fx + 1, fz + 1);

      // Bilinear interpolation
      const h0 = h00 + (h10 - h00) * tx;
      const h1 = h01 + (h11 - h01) * tx;
      return h0 + (h1 - h0) * tz;
    };

    // Generate vertices
    for (let iz = 0; iz < gridSize; iz++) {
      for (let ix = 0; ix < gridSize; ix++) {
        const vi = iz * gridSize + ix;

        // World position
        const worldX = startX + ix * step;
        const worldZ = startZ + iz * step;

        // Interpolated height
        const height = interpolateHeight(worldX, worldZ);

        // Position (y is up in Three.js)
        positions[vi * 3] = worldX * bs;
        positions[vi * 3 + 1] = (height + this.config.yOffset) * bs;
        positions[vi * 3 + 2] = worldZ * bs;

        // Color from nearest tile terrain type
        const terrain = getTerrain(Math.round(worldX), Math.round(worldZ));
        const color = TERRAIN_COLORS[terrain] ?? TERRAIN_COLORS['default']!;
        const r = ((color >> 16) & 0xff) / 255;
        const g = ((color >> 8) & 0xff) / 255;
        const b = (color & 0xff) / 255;

        // Add subtle variation for a more natural look
        const variation = (Math.sin(worldX * 3.7) * Math.cos(worldZ * 2.9)) * 0.05;
        colors[vi * 3] = Math.max(0, Math.min(1, r + variation));
        colors[vi * 3 + 1] = Math.max(0, Math.min(1, g + variation));
        colors[vi * 3 + 2] = Math.max(0, Math.min(1, b + variation));
      }
    }

    // Generate indices (two triangles per grid cell)
    let ii = 0;
    for (let iz = 0; iz < gridSize - 1; iz++) {
      for (let ix = 0; ix < gridSize - 1; ix++) {
        const v00 = iz * gridSize + ix;
        const v10 = v00 + 1;
        const v01 = v00 + gridSize;
        const v11 = v01 + 1;

        // Triangle 1
        indices[ii++] = v00;
        indices[ii++] = v01;
        indices[ii++] = v10;

        // Triangle 2
        indices[ii++] = v10;
        indices[ii++] = v01;
        indices[ii++] = v11;
      }
    }

    // Compute normals from geometry
    // Simple per-vertex normal estimation using central differences
    for (let iz = 0; iz < gridSize; iz++) {
      for (let ix = 0; ix < gridSize; ix++) {
        const vi = iz * gridSize + ix;
        const worldX = startX + ix * step;
        const worldZ = startZ + iz * step;

        const hL = interpolateHeight(worldX - step, worldZ);
        const hR = interpolateHeight(worldX + step, worldZ);
        const hD = interpolateHeight(worldX, worldZ - step);
        const hU = interpolateHeight(worldX, worldZ + step);

        // Normal from height gradients
        const nx = (hL - hR) * bs;
        const nz = (hD - hU) * bs;
        const ny = 2 * step * bs;

        // Normalize
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        normals[vi * 3] = nx / len;
        normals[vi * 3 + 1] = ny / len;
        normals[vi * 3 + 2] = nz / len;
      }
    }

    // Build or update geometry
    if (this.geometry) {
      this.geometry.dispose();
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    this.geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    // Create or update mesh
    if (this.mesh) {
      this.mesh.geometry = this.geometry;
    } else {
      this.mesh = new THREE.Mesh(this.geometry, this.material);
      this.mesh.receiveShadow = true;
      this.scene.add(this.mesh);
    }
  }

  /**
   * Force a rebuild on next update.
   */
  markDirty(): void {
    this.lastCamChunkX = Infinity;
    this.lastCamChunkZ = Infinity;
  }

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh = null;
    }
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
    this.material.dispose();
  }
}
