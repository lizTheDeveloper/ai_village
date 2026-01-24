/**
 * OcclusionCuller - Implements cave culling for 3D terrain rendering
 *
 * Based on Minecraft's algorithm by Tomcc:
 * - Analyzes which chunk faces can "see through" to other faces
 * - Propagates visibility from camera chunk through connected faces
 * - Hides chunks that are occluded by solid terrain
 *
 * Algorithm:
 * 1. For each chunk, precompute face connectivity graph
 * 2. Starting from camera chunk, flood-fill visibility through passable faces
 * 3. Only render chunks marked visible
 *
 * Expected impact:
 * - Surface terrain: 10-20% culled (chunks behind hills)
 * - Underground/caves: 60-80% culled (only connected caves rendered)
 * - Interior buildings: ~50% culled (exterior chunks hidden)
 */

/** Face types for chunk boundaries */
type Face = '+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z';
const ALL_FACES: Face[] = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'];

/** Occlusion data for a single chunk */
export interface ChunkOcclusionData {
  chunkKey: string;
  /** For each face, which other faces can be seen through this chunk */
  faceConnections: Map<Face, Set<Face>>;
  /** Is this chunk completely solid (no visibility) */
  isSolid: boolean;
  /** Is this chunk completely empty (full visibility) */
  isEmpty: boolean;
}

/**
 * OcclusionCuller implements Tomcc's cave culling algorithm
 */
export class OcclusionCuller {
  private chunkData: Map<string, ChunkOcclusionData> = new Map();

  /**
   * Analyze chunk to determine face connectivity
   * Called when chunk mesh is built
   *
   * @param chunkX - Chunk X coordinate
   * @param chunkZ - Chunk Z coordinate
   * @param getBlock - Function to get block type at local coordinates (returns 0 for air)
   * @param chunkSize - Chunk size in blocks
   * @param chunkHeight - Chunk height in blocks
   */
  analyzeChunk(
    chunkX: number,
    chunkZ: number,
    getBlock: (x: number, y: number, z: number) => number,
    chunkSize: number,
    chunkHeight: number
  ): ChunkOcclusionData {
    const key = `${chunkX},${chunkZ}`;

    // Count solid vs air blocks
    let solidCount = 0;
    let airCount = 0;

    for (let x = 0; x < chunkSize; x++) {
      for (let z = 0; z < chunkSize; z++) {
        for (let y = 0; y < chunkHeight; y++) {
          const blockType = getBlock(x, y, z);
          if (blockType !== 0) {
            solidCount++;
          } else {
            airCount++;
          }
        }
      }
    }

    const total = solidCount + airCount;
    const isSolid = solidCount > total * 0.95;
    const isEmpty = airCount > total * 0.95;

    // Build face connectivity
    const faceConnections = new Map<Face, Set<Face>>();

    if (isEmpty) {
      // All faces see all other faces
      ALL_FACES.forEach((from) => {
        faceConnections.set(from, new Set(ALL_FACES));
      });
    } else if (isSolid) {
      // No faces see any other faces
      ALL_FACES.forEach((from) => {
        faceConnections.set(from, new Set());
      });
    } else {
      // Need detailed analysis - flood fill from each face
      ALL_FACES.forEach((from) => {
        const visible = this.floodFillFromFace(getBlock, from, chunkSize, chunkHeight);
        faceConnections.set(from, visible);
      });
    }

    const data: ChunkOcclusionData = {
      chunkKey: key,
      faceConnections,
      isSolid,
      isEmpty,
    };

    this.chunkData.set(key, data);
    return data;
  }

  /**
   * Flood fill from one face to find which other faces are reachable
   */
  private floodFillFromFace(
    getBlock: (x: number, y: number, z: number) => number,
    startFace: Face,
    size: number,
    height: number
  ): Set<Face> {
    const reachable = new Set<Face>();

    // Get starting positions on face
    const startPositions = this.getFacePositions(startFace, size, height);

    // BFS through air blocks
    const visited = new Set<string>();
    const queue: [number, number, number][] = [];

    for (const [x, y, z] of startPositions) {
      const blockType = getBlock(x, y, z);
      if (blockType === 0) {
        queue.push([x, y, z]);
        visited.add(`${x},${y},${z}`);
      }
    }

    const directions: Array<[number, number, number]> = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];

    while (queue.length > 0) {
      const pos = queue.shift();
      if (!pos) break;
      const [x, y, z] = pos;

      // Check if we reached another face
      if (x === 0) reachable.add('-X');
      if (x === size - 1) reachable.add('+X');
      if (y === 0) reachable.add('-Y');
      if (y === height - 1) reachable.add('+Y');
      if (z === 0) reachable.add('-Z');
      if (z === size - 1) reachable.add('+Z');

      for (const dir of directions) {
        const [dx, dy, dz] = dir;
        const nx = x + dx;
        const ny = y + dy;
        const nz = z + dz;
        const key = `${nx},${ny},${nz}`;

        if (visited.has(key)) continue;
        if (nx < 0 || nx >= size || nz < 0 || nz >= size) continue;
        if (ny < 0 || ny >= height) continue;

        const blockType = getBlock(nx, ny, nz);
        if (blockType === 0) {
          visited.add(key);
          queue.push([nx, ny, nz]);
        }
      }
    }

    return reachable;
  }

  /**
   * Get all positions on a given face
   */
  private getFacePositions(face: Face, size: number, height: number): [number, number, number][] {
    const positions: [number, number, number][] = [];

    switch (face) {
      case '+X':
        for (let y = 0; y < height; y++) {
          for (let z = 0; z < size; z++) {
            positions.push([size - 1, y, z]);
          }
        }
        break;
      case '-X':
        for (let y = 0; y < height; y++) {
          for (let z = 0; z < size; z++) {
            positions.push([0, y, z]);
          }
        }
        break;
      case '+Y':
        for (let x = 0; x < size; x++) {
          for (let z = 0; z < size; z++) {
            positions.push([x, height - 1, z]);
          }
        }
        break;
      case '-Y':
        for (let x = 0; x < size; x++) {
          for (let z = 0; z < size; z++) {
            positions.push([x, 0, z]);
          }
        }
        break;
      case '+Z':
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < height; y++) {
            positions.push([x, y, size - 1]);
          }
        }
        break;
      case '-Z':
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < height; y++) {
            positions.push([x, y, 0]);
          }
        }
        break;
    }

    return positions;
  }

  /**
   * Propagate visibility from camera chunk
   * Returns set of visible chunk keys
   */
  computeVisibleChunks(
    cameraChunkX: number,
    cameraChunkZ: number,
    maxRadius: number
  ): Set<string> {
    const visible = new Set<string>();
    const cameraKey = `${cameraChunkX},${cameraChunkZ}`;

    // Camera chunk always visible
    visible.add(cameraKey);

    // BFS with face tracking
    interface QueueEntry {
      chunkX: number;
      chunkZ: number;
      entryFace: Face; // Which face we entered from
    }

    const queue: QueueEntry[] = [];
    const visited = new Map<string, Set<Face>>(); // chunk -> faces we've entered from

    // Start from camera chunk, can see all horizontal directions
    const startFaces: Face[] = ['+X', '-X', '+Z', '-Z'];
    startFaces.forEach((face) => {
      const [nx, nz] = this.getNeighborChunk(cameraChunkX, cameraChunkZ, face);
      queue.push({ chunkX: nx, chunkZ: nz, entryFace: this.oppositeFace(face) });
    });

    while (queue.length > 0) {
      const entry = queue.shift();
      if (!entry) break;
      const { chunkX, chunkZ, entryFace } = entry;
      const key = `${chunkX},${chunkZ}`;

      // Distance check
      const dx = chunkX - cameraChunkX;
      const dz = chunkZ - cameraChunkZ;
      if (dx * dx + dz * dz > maxRadius * maxRadius) continue;

      // Already visited from this face?
      if (!visited.has(key)) {
        visited.set(key, new Set());
      }
      const visitedFaces = visited.get(key);
      if (!visitedFaces) continue;
      if (visitedFaces.has(entryFace)) continue;
      visitedFaces.add(entryFace);

      // Mark visible
      visible.add(key);

      // Get chunk occlusion data
      const data = this.chunkData.get(key);

      // If no occlusion data, assume fully passable (can see through to all faces)
      // This handles newly loaded chunks that haven't been analyzed yet
      let exitFaces: Set<Face>;
      if (!data) {
        // Unknown chunk - assume all faces connect (fully passable)
        exitFaces = new Set(['+X', '-X', '+Z', '-Z'] as Face[]);
      } else {
        // Find which faces we can see from entry face
        const connections = data.faceConnections.get(entryFace);
        if (!connections) continue;
        exitFaces = connections;
      }

      // Propagate to neighbors through visible faces
      exitFaces.forEach((exitFace) => {
        // Only horizontal faces for now (2D chunks)
        if (exitFace === '+Y' || exitFace === '-Y') return;

        const [nx, nz] = this.getNeighborChunk(chunkX, chunkZ, exitFace);
        queue.push({
          chunkX: nx,
          chunkZ: nz,
          entryFace: this.oppositeFace(exitFace),
        });
      });
    }

    return visible;
  }

  /**
   * Get neighbor chunk coordinates for a given face
   */
  private getNeighborChunk(x: number, z: number, face: Face): [number, number] {
    switch (face) {
      case '+X':
        return [x + 1, z];
      case '-X':
        return [x - 1, z];
      case '+Z':
        return [x, z + 1];
      case '-Z':
        return [x, z - 1];
      default:
        return [x, z];
    }
  }

  /**
   * Get the opposite face
   */
  private oppositeFace(face: Face): Face {
    switch (face) {
      case '+X':
        return '-X';
      case '-X':
        return '+X';
      case '+Y':
        return '-Y';
      case '-Y':
        return '+Y';
      case '+Z':
        return '-Z';
      case '-Z':
        return '+Z';
    }
  }
}
