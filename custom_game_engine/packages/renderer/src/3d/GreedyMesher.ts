/**
 * GreedyMesher - Optimized voxel mesh generation using greedy meshing algorithm
 *
 * Based on the classic algorithm from 0fps.net:
 * https://0fps.net/2012/06/30/meshing-in-a-minecraft-game/
 *
 * This implementation merges adjacent same-type voxel faces into larger quads,
 * dramatically reducing vertex count (typically 50-90% reduction).
 */

import * as THREE from 'three';

/** Block data for a chunk */
export interface BlockData {
  type: number; // 0 = air, 1+ = solid block types
  color: number; // RGB color as hex
}

/** Result of greedy meshing */
export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  vertexCount: number;
  indexCount: number;
}

/** Face direction enum */
const enum FaceDir {
  POS_X = 0, // East
  NEG_X = 1, // West
  POS_Y = 2, // Top
  NEG_Y = 3, // Bottom
  POS_Z = 4, // South
  NEG_Z = 5, // North
}

/** Normal vectors for each face direction */
const FACE_NORMALS: ReadonlyArray<[number, number, number]> = [
  [1, 0, 0], // POS_X
  [-1, 0, 0], // NEG_X
  [0, 1, 0], // POS_Y
  [0, -1, 0], // NEG_Y
  [0, 0, 1], // POS_Z
  [0, 0, -1], // NEG_Z
];

/** Vertex offsets for each face (4 vertices per face, CCW winding) */
const FACE_VERTICES: ReadonlyArray<ReadonlyArray<[number, number, number]>> = [
  // POS_X (East face) - looking from +X
  [
    [1, 0, 0],
    [1, 1, 0],
    [1, 1, 1],
    [1, 0, 1],
  ],
  // NEG_X (West face) - looking from -X
  [
    [0, 0, 1],
    [0, 1, 1],
    [0, 1, 0],
    [0, 0, 0],
  ],
  // POS_Y (Top face) - looking from +Y
  [
    [0, 1, 0],
    [0, 1, 1],
    [1, 1, 1],
    [1, 1, 0],
  ],
  // NEG_Y (Bottom face) - looking from -Y
  [
    [0, 0, 1],
    [0, 0, 0],
    [1, 0, 0],
    [1, 0, 1],
  ],
  // POS_Z (South face) - looking from +Z
  [
    [1, 0, 1],
    [1, 1, 1],
    [0, 1, 1],
    [0, 0, 1],
  ],
  // NEG_Z (North face) - looking from -Z
  [
    [0, 0, 0],
    [0, 1, 0],
    [1, 1, 0],
    [1, 0, 0],
  ],
];

/**
 * GreedyMesher generates optimized meshes from voxel data
 */
export class GreedyMesher {
  private readonly chunkSize: number;
  private readonly chunkHeight: number;

  // Reusable arrays to avoid allocation during meshing
  private mask: Int32Array;
  private colorMask: Uint32Array;

  // Output buffers (pre-allocated, resized as needed)
  private positions: number[] = [];
  private normals: number[] = [];
  private colors: number[] = [];
  private indices: number[] = [];

  constructor(chunkSize: number = 16, chunkHeight: number = 64) {
    this.chunkSize = chunkSize;
    this.chunkHeight = chunkHeight;

    // Pre-allocate mask arrays for the largest possible slice
    const maxSliceSize = Math.max(chunkSize * chunkSize, chunkSize * chunkHeight);
    this.mask = new Int32Array(maxSliceSize);
    this.colorMask = new Uint32Array(maxSliceSize);
  }

  /**
   * Generate mesh from voxel data using greedy meshing
   *
   * @param getBlock Function to get block at (x, y, z) relative to chunk origin
   * @param getBlockColor Function to get block color at (x, y, z)
   * @returns MeshData with positions, normals, colors, and indices
   */
  mesh(
    getBlock: (x: number, y: number, z: number) => number,
    getBlockColor: (x: number, y: number, z: number) => number
  ): MeshData {
    // Clear output buffers
    this.positions.length = 0;
    this.normals.length = 0;
    this.colors.length = 0;
    this.indices.length = 0;

    // Process each axis
    this.meshAxis(0, getBlock, getBlockColor); // X axis (East/West faces)
    this.meshAxis(1, getBlock, getBlockColor); // Y axis (Top/Bottom faces)
    this.meshAxis(2, getBlock, getBlockColor); // Z axis (North/South faces)

    // Convert to typed arrays
    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      colors: new Float32Array(this.colors),
      indices: new Uint32Array(this.indices),
      vertexCount: this.positions.length / 3,
      indexCount: this.indices.length,
    };
  }

  /**
   * Process one axis direction (generates faces perpendicular to that axis)
   */
  private meshAxis(
    axis: number,
    getBlock: (x: number, y: number, z: number) => number,
    getBlockColor: (x: number, y: number, z: number) => number
  ): void {
    // Determine dimensions based on axis
    // axis 0 (X): slices are YZ planes, we iterate along X
    // axis 1 (Y): slices are XZ planes, we iterate along Y
    // axis 2 (Z): slices are XY planes, we iterate along Z
    const dims = [this.chunkSize, this.chunkHeight, this.chunkSize];
    const u = (axis + 1) % 3; // First slice axis
    const v = (axis + 2) % 3; // Second slice axis
    const w = axis; // Slice normal axis

    const uSize = dims[u]!;
    const vSize = dims[v]!;
    const wSize = dims[w]!;

    // Position components for building quads
    const pos = [0, 0, 0];

    // Process positive direction faces
    for (let slice = 0; slice <= wSize; slice++) {
      // Build mask for this slice
      this.buildMask(slice, axis, true, getBlock, getBlockColor, uSize, vSize);

      // Generate quads from mask using greedy algorithm
      pos[w] = slice;
      this.generateQuads(axis, true, pos, uSize, vSize);
    }

    // Process negative direction faces
    for (let slice = 0; slice <= wSize; slice++) {
      // Build mask for this slice
      this.buildMask(slice, axis, false, getBlock, getBlockColor, uSize, vSize);

      // Generate quads from mask using greedy algorithm
      pos[w] = slice;
      this.generateQuads(axis, false, pos, uSize, vSize);
    }
  }

  /**
   * Build the mask for a slice. Mask contains block type where face should be rendered.
   */
  private buildMask(
    slice: number,
    axis: number,
    positive: boolean,
    getBlock: (x: number, y: number, z: number) => number,
    getBlockColor: (x: number, y: number, z: number) => number,
    uSize: number,
    vSize: number
  ): void {
    const u = (axis + 1) % 3;
    const v = (axis + 2) % 3;
    const w = axis;

    const pos1 = [0, 0, 0];
    const pos2 = [0, 0, 0];

    for (let j = 0; j < vSize; j++) {
      for (let i = 0; i < uSize; i++) {
        const idx = i + j * uSize;

        // Get positions for the two blocks on either side of this face
        pos1[u] = i;
        pos1[v] = j;
        pos1[w] = positive ? slice - 1 : slice;

        pos2[u] = i;
        pos2[v] = j;
        pos2[w] = positive ? slice : slice - 1;

        const block1 = this.getBlockSafe(pos1[0]!, pos1[1]!, pos1[2]!, getBlock);
        const block2 = this.getBlockSafe(pos2[0]!, pos2[1]!, pos2[2]!, getBlock);

        // Face is visible if one block is solid and the other is air
        if (positive) {
          // Positive face: block1 is behind, block2 is in front
          if (block1 > 0 && block2 === 0) {
            this.mask[idx] = block1;
            this.colorMask[idx] = getBlockColor(pos1[0]!, pos1[1]!, pos1[2]!);
          } else {
            this.mask[idx] = 0;
          }
        } else {
          // Negative face: block2 is behind, block1 is in front
          if (block2 > 0 && block1 === 0) {
            this.mask[idx] = block2;
            this.colorMask[idx] = getBlockColor(pos2[0]!, pos2[1]!, pos2[2]!);
          } else {
            this.mask[idx] = 0;
          }
        }
      }
    }
  }

  /**
   * Safe block access that returns 0 for out-of-bounds
   */
  private getBlockSafe(
    x: number,
    y: number,
    z: number,
    getBlock: (x: number, y: number, z: number) => number
  ): number {
    if (
      x < 0 ||
      x >= this.chunkSize ||
      y < 0 ||
      y >= this.chunkHeight ||
      z < 0 ||
      z >= this.chunkSize
    ) {
      return 0; // Treat out-of-bounds as air
    }
    return getBlock(x, y, z);
  }

  /**
   * Generate quads from mask using greedy algorithm
   */
  private generateQuads(
    axis: number,
    positive: boolean,
    slicePos: number[],
    uSize: number,
    vSize: number
  ): void {
    const u = (axis + 1) % 3;
    const v = (axis + 2) % 3;
    const w = axis;

    const faceDir = positive
      ? axis === 0
        ? FaceDir.POS_X
        : axis === 1
          ? FaceDir.POS_Y
          : FaceDir.POS_Z
      : axis === 0
        ? FaceDir.NEG_X
        : axis === 1
          ? FaceDir.NEG_Y
          : FaceDir.NEG_Z;

    for (let j = 0; j < vSize; j++) {
      for (let i = 0; i < uSize; ) {
        const idx = i + j * uSize;
        const blockType = this.mask[idx];
        const blockColor = this.colorMask[idx];

        if (blockType === 0) {
          i++;
          continue;
        }

        // Compute width (extend in i/u direction)
        let width = 1;
        while (
          i + width < uSize &&
          this.mask[idx + width] === blockType &&
          this.colorMask[idx + width] === blockColor
        ) {
          width++;
        }

        // Compute height (extend in j/v direction)
        let height = 1;
        let done = false;
        while (j + height < vSize && !done) {
          for (let k = 0; k < width; k++) {
            const checkIdx = i + k + (j + height) * uSize;
            if (this.mask[checkIdx] !== blockType || this.colorMask[checkIdx] !== blockColor) {
              done = true;
              break;
            }
          }
          if (!done) height++;
        }

        // Add quad for this merged region
        this.addQuad(faceDir, slicePos, u, v, w, i, j, width, height, blockColor!);

        // Clear mask for merged region
        for (let dj = 0; dj < height; dj++) {
          for (let di = 0; di < width; di++) {
            this.mask[i + di + (j + dj) * uSize] = 0;
          }
        }

        i += width;
      }
    }
  }

  /**
   * Add a quad to the output buffers
   */
  private addQuad(
    faceDir: FaceDir,
    slicePos: number[],
    u: number,
    v: number,
    w: number,
    uStart: number,
    vStart: number,
    width: number,
    height: number,
    color: number
  ): void {
    const baseVertex = this.positions.length / 3;

    // Get normal for this face
    const normal = FACE_NORMALS[faceDir]!;

    // Convert color from hex to RGB floats
    const r = ((color >> 16) & 0xff) / 255;
    const g = ((color >> 8) & 0xff) / 255;
    const b = (color & 0xff) / 255;

    // Build the 4 vertices of the quad
    // We need to map from (uStart, vStart, slicePos[w]) to actual (x, y, z)
    const corners: Array<[number, number, number]> = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];

    // Map corners based on face direction
    const verts = FACE_VERTICES[faceDir]!;
    for (let i = 0; i < 4; i++) {
      const vert = verts[i]!;
      // Transform from unit cube vertex to actual position
      const pos: [number, number, number] = [0, 0, 0];
      pos[u] = uStart + vert[u]! * width;
      pos[v] = vStart + vert[v]! * height;
      pos[w] = slicePos[w]! + (vert[w]! > 0.5 ? 1 : 0);

      // Adjust for negative faces (they're offset by -1 in the slice direction)
      if (faceDir === FaceDir.NEG_X || faceDir === FaceDir.NEG_Y || faceDir === FaceDir.NEG_Z) {
        pos[w] -= 1;
      }

      corners[i] = pos;
    }

    // Add vertices
    for (let i = 0; i < 4; i++) {
      this.positions.push(corners[i]![0], corners[i]![1], corners[i]![2]);
      this.normals.push(normal[0], normal[1], normal[2]);
      this.colors.push(r, g, b);
    }

    // Add indices (two triangles, CCW winding)
    this.indices.push(baseVertex, baseVertex + 1, baseVertex + 2);
    this.indices.push(baseVertex, baseVertex + 2, baseVertex + 3);
  }

  /**
   * Create a Three.js BufferGeometry from mesh data
   */
  static createGeometry(meshData: MeshData): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(meshData.normals, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(meshData.colors, 3));
    geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));

    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return geometry;
  }
}

/**
 * Simple non-greedy mesher for comparison/fallback
 * Generates one quad per visible face (no merging)
 */
export class SimpleMesher {
  private readonly chunkSize: number;
  private readonly chunkHeight: number;

  constructor(chunkSize: number = 16, chunkHeight: number = 64) {
    this.chunkSize = chunkSize;
    this.chunkHeight = chunkHeight;
  }

  /**
   * Generate mesh with face culling but no greedy merging
   */
  mesh(
    getBlock: (x: number, y: number, z: number) => number,
    getBlockColor: (x: number, y: number, z: number) => number
  ): MeshData {
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    for (let y = 0; y < this.chunkHeight; y++) {
      for (let z = 0; z < this.chunkSize; z++) {
        for (let x = 0; x < this.chunkSize; x++) {
          const block = getBlock(x, y, z);
          if (block === 0) continue;

          const color = getBlockColor(x, y, z);
          const r = ((color >> 16) & 0xff) / 255;
          const g = ((color >> 8) & 0xff) / 255;
          const b = (color & 0xff) / 255;

          // Check each face
          this.addFaceIfVisible(
            x,
            y,
            z,
            FaceDir.POS_X,
            getBlock,
            r,
            g,
            b,
            positions,
            normals,
            colors,
            indices
          );
          this.addFaceIfVisible(
            x,
            y,
            z,
            FaceDir.NEG_X,
            getBlock,
            r,
            g,
            b,
            positions,
            normals,
            colors,
            indices
          );
          this.addFaceIfVisible(
            x,
            y,
            z,
            FaceDir.POS_Y,
            getBlock,
            r,
            g,
            b,
            positions,
            normals,
            colors,
            indices
          );
          this.addFaceIfVisible(
            x,
            y,
            z,
            FaceDir.NEG_Y,
            getBlock,
            r,
            g,
            b,
            positions,
            normals,
            colors,
            indices
          );
          this.addFaceIfVisible(
            x,
            y,
            z,
            FaceDir.POS_Z,
            getBlock,
            r,
            g,
            b,
            positions,
            normals,
            colors,
            indices
          );
          this.addFaceIfVisible(
            x,
            y,
            z,
            FaceDir.NEG_Z,
            getBlock,
            r,
            g,
            b,
            positions,
            normals,
            colors,
            indices
          );
        }
      }
    }

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      colors: new Float32Array(colors),
      indices: new Uint32Array(indices),
      vertexCount: positions.length / 3,
      indexCount: indices.length,
    };
  }

  private addFaceIfVisible(
    x: number,
    y: number,
    z: number,
    dir: FaceDir,
    getBlock: (x: number, y: number, z: number) => number,
    r: number,
    g: number,
    b: number,
    positions: number[],
    normals: number[],
    colors: number[],
    indices: number[]
  ): void {
    // Get neighbor position
    let nx = x,
      ny = y,
      nz = z;
    switch (dir) {
      case FaceDir.POS_X:
        nx++;
        break;
      case FaceDir.NEG_X:
        nx--;
        break;
      case FaceDir.POS_Y:
        ny++;
        break;
      case FaceDir.NEG_Y:
        ny--;
        break;
      case FaceDir.POS_Z:
        nz++;
        break;
      case FaceDir.NEG_Z:
        nz--;
        break;
    }

    // Check if neighbor is air (face is visible)
    if (
      nx >= 0 &&
      nx < this.chunkSize &&
      ny >= 0 &&
      ny < this.chunkHeight &&
      nz >= 0 &&
      nz < this.chunkSize
    ) {
      if (getBlock(nx, ny, nz) !== 0) return; // Neighbor is solid, face hidden
    }

    // Add face
    const baseVertex = positions.length / 3;
    const normal = FACE_NORMALS[dir]!;
    const verts = FACE_VERTICES[dir]!;

    for (const vert of verts) {
      positions.push(x + vert[0], y + vert[1], z + vert[2]);
      normals.push(normal[0], normal[1], normal[2]);
      colors.push(r, g, b);
    }

    indices.push(baseVertex, baseVertex + 1, baseVertex + 2);
    indices.push(baseVertex, baseVertex + 2, baseVertex + 3);
  }
}
