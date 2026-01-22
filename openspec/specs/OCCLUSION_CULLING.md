# Occlusion Culling Specification

**Status**: Draft
**Created**: 2026-01-22
**Priority**: High
**Inspiration**: Minecraft (cave culling), Tomcc's algorithm
**System**: Renderer (`packages/renderer/src/3d/`)

## Problem Statement

Current rendering only uses frustum culling:
- Hides chunks outside camera view
- BUT: Still renders chunks BEHIND solid walls/terrain
- Underground caves: All chunks rendered even if blocked by mountain
- Interior rooms: Exterior chunks still rendered

**Minecraft's insight**: Most chunks are occluded by terrain. Cave culling can skip 60-80% of underground chunks.

## Current State

```typescript
// ChunkManager3D.ts - Only frustum culling
private performFrustumCulling(): void {
  this.chunks.forEach((entry) => {
    const isVisible = this.frustum.intersectsBox(entry.chunk.boundingBox);
    entry.chunk.setVisible(isVisible);
  });
}
```

## Types of Occlusion Culling

### 1. Frustum Culling (Already Implemented)
- Hide chunks outside camera's field of view
- Fast: Just bounding box vs frustum planes
- ✅ Already done

### 2. Distance Culling (Already Implemented)
- Hide chunks beyond render distance
- ✅ Already done via `renderRadius`

### 3. **Cave Culling** (This Spec)
- Hide chunks blocked by solid terrain
- Key insight: If a chunk is surrounded by solid blocks on all sides facing camera, it's invisible
- Tomcc's algorithm from Minecraft

### 4. Hierarchical Z-Buffer (Advanced)
- GPU-based occlusion queries
- More accurate but more complex
- Future enhancement

## Tomcc's Cave Culling Algorithm

From Minecraft developer Tomcc:

> "The idea is to trace visibility through chunk boundaries. A chunk face is visible from another if you can draw a line between them without hitting solid blocks."

**Algorithm**:
1. For each chunk, precompute which faces can "see through" to which other faces
2. Starting from camera chunk, flood-fill visibility through passable faces
3. Only render chunks marked visible

### Face Connectivity Graph

Each chunk has 6 faces: +X, -X, +Y, -Y, +Z, -Z

For each pair of faces, determine if light/visibility can pass through:
- If chunk is mostly air: all faces connected
- If chunk is solid: no faces connected
- If chunk has caves: specific faces connected

```typescript
interface ChunkVisibility {
  /** Which face pairs have line-of-sight through this chunk */
  faceConnections: Set<string>; // e.g., "+X:-X", "+X:+Y", etc.

  /** Is this chunk completely solid (no visibility) */
  isSolid: boolean;

  /** Is this chunk completely empty (full visibility) */
  isEmpty: boolean;
}
```

## Solution Architecture

### Phase 1: Chunk Face Analysis

```typescript
// packages/renderer/src/3d/OcclusionCuller.ts

type Face = '+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z';
const ALL_FACES: Face[] = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'];

interface ChunkOcclusionData {
  chunkKey: string;
  faceConnections: Map<Face, Set<Face>>; // from face -> visible faces
  isSolid: boolean;
  isEmpty: boolean;
}

export class OcclusionCuller {
  private chunkData: Map<string, ChunkOcclusionData> = new Map();

  /**
   * Analyze chunk to determine face connectivity
   * Called when chunk mesh is built
   */
  analyzeChunk(chunk: ChunkMesh): ChunkOcclusionData {
    const key = `${chunk.chunkX},${chunk.chunkZ}`;

    // Count solid vs air blocks
    let solidCount = 0;
    let airCount = 0;

    for (let x = 0; x < chunk.config.chunkSize; x++) {
      for (let z = 0; z < chunk.config.chunkSize; z++) {
        for (let y = 0; y < chunk.config.chunkHeight; y++) {
          const block = chunk.getBlock(x, y, z);
          if (block && block.type !== 0) solidCount++;
          else airCount++;
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
      for (const from of ALL_FACES) {
        faceConnections.set(from, new Set(ALL_FACES));
      }
    } else if (isSolid) {
      // No faces see any other faces
      for (const from of ALL_FACES) {
        faceConnections.set(from, new Set());
      }
    } else {
      // Need detailed analysis - flood fill from each face
      for (const from of ALL_FACES) {
        const visible = this.floodFillFromFace(chunk, from);
        faceConnections.set(from, visible);
      }
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
  private floodFillFromFace(chunk: ChunkMesh, startFace: Face): Set<Face> {
    const reachable = new Set<Face>();
    const size = chunk.config.chunkSize;
    const height = chunk.config.chunkHeight;

    // Get starting positions on face
    const startPositions = this.getFacePositions(startFace, size, height);

    // BFS through air blocks
    const visited = new Set<string>();
    const queue: [number, number, number][] = [];

    for (const [x, y, z] of startPositions) {
      const block = chunk.getBlock(x, y, z);
      if (!block || block.type === 0) {
        queue.push([x, y, z]);
        visited.add(`${x},${y},${z}`);
      }
    }

    const directions = [
      [1, 0, 0], [-1, 0, 0],
      [0, 1, 0], [0, -1, 0],
      [0, 0, 1], [0, 0, -1],
    ];

    while (queue.length > 0) {
      const [x, y, z] = queue.shift()!;

      // Check if we reached another face
      if (x === 0) reachable.add('-X');
      if (x === size - 1) reachable.add('+X');
      if (y === 0) reachable.add('-Y');
      if (y === height - 1) reachable.add('+Y');
      if (z === 0) reachable.add('-Z');
      if (z === size - 1) reachable.add('+Z');

      for (const [dx, dy, dz] of directions) {
        const nx = x + dx, ny = y + dy, nz = z + dz;
        const key = `${nx},${ny},${nz}`;

        if (visited.has(key)) continue;
        if (nx < 0 || nx >= size || nz < 0 || nz >= size) continue;
        if (ny < 0 || ny >= height) continue;

        const block = chunk.getBlock(nx, ny, nz);
        if (!block || block.type === 0) {
          visited.add(key);
          queue.push([nx, ny, nz]);
        }
      }
    }

    return reachable;
  }

  private getFacePositions(face: Face, size: number, height: number): [number, number, number][] {
    const positions: [number, number, number][] = [];

    switch (face) {
      case '+X':
        for (let y = 0; y < height; y++)
          for (let z = 0; z < size; z++)
            positions.push([size - 1, y, z]);
        break;
      case '-X':
        for (let y = 0; y < height; y++)
          for (let z = 0; z < size; z++)
            positions.push([0, y, z]);
        break;
      case '+Y':
        for (let x = 0; x < size; x++)
          for (let z = 0; z < size; z++)
            positions.push([x, height - 1, z]);
        break;
      case '-Y':
        for (let x = 0; x < size; x++)
          for (let z = 0; z < size; z++)
            positions.push([x, 0, z]);
        break;
      case '+Z':
        for (let x = 0; x < size; x++)
          for (let y = 0; y < height; y++)
            positions.push([x, y, size - 1]);
        break;
      case '-Z':
        for (let x = 0; x < size; x++)
          for (let y = 0; y < height; y++)
            positions.push([x, y, 0]);
        break;
    }

    return positions;
  }
}
```

### Phase 2: Visibility Propagation

```typescript
// packages/renderer/src/3d/OcclusionCuller.ts (continued)

export class OcclusionCuller {
  // ... previous code ...

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

    // Start from camera chunk, can see all directions
    for (const face of ['+X', '-X', '+Z', '-Z'] as Face[]) {
      const [nx, nz] = this.getNeighborChunk(cameraChunkX, cameraChunkZ, face);
      queue.push({ chunkX: nx, chunkZ: nz, entryFace: this.oppositeFace(face) });
    }

    while (queue.length > 0) {
      const { chunkX, chunkZ, entryFace } = queue.shift()!;
      const key = `${chunkX},${chunkZ}`;

      // Distance check
      const dx = chunkX - cameraChunkX;
      const dz = chunkZ - cameraChunkZ;
      if (dx * dx + dz * dz > maxRadius * maxRadius) continue;

      // Already visited from this face?
      if (!visited.has(key)) visited.set(key, new Set());
      if (visited.get(key)!.has(entryFace)) continue;
      visited.get(key)!.add(entryFace);

      // Mark visible
      visible.add(key);

      // Get chunk occlusion data
      const data = this.chunkData.get(key);
      if (!data) continue; // Unknown chunk, assume visible

      // Find which faces we can see from entry face
      const exitFaces = data.faceConnections.get(entryFace);
      if (!exitFaces) continue;

      // Propagate to neighbors through visible faces
      for (const exitFace of exitFaces) {
        // Only horizontal faces for now (2D chunks)
        if (exitFace === '+Y' || exitFace === '-Y') continue;

        const [nx, nz] = this.getNeighborChunk(chunkX, chunkZ, exitFace);
        queue.push({
          chunkX: nx,
          chunkZ: nz,
          entryFace: this.oppositeFace(exitFace),
        });
      }
    }

    return visible;
  }

  private getNeighborChunk(x: number, z: number, face: Face): [number, number] {
    switch (face) {
      case '+X': return [x + 1, z];
      case '-X': return [x - 1, z];
      case '+Z': return [x, z + 1];
      case '-Z': return [x, z - 1];
      default: return [x, z];
    }
  }

  private oppositeFace(face: Face): Face {
    switch (face) {
      case '+X': return '-X';
      case '-X': return '+X';
      case '+Y': return '-Y';
      case '-Y': return '+Y';
      case '+Z': return '-Z';
      case '-Z': return '+Z';
    }
  }
}
```

### Phase 3: Integration with ChunkManager3D

```typescript
// packages/renderer/src/3d/ChunkManager3D.ts

export class ChunkManager3D {
  private occlusionCuller: OcclusionCuller;
  private occlusionEnabled = true;

  constructor(scene: THREE.Scene, config: Partial<ChunkManager3DConfig> = {}) {
    // ... existing code ...
    this.occlusionCuller = new OcclusionCuller();
  }

  update(camera: THREE.PerspectiveCamera): void {
    this.currentTick++;

    // ... existing camera position code ...

    // Update frustum
    if (this.config.enableFrustumCulling) {
      this.projScreenMatrix.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse
      );
      this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
    }

    // Load/unload chunks
    this.updateChunksAroundCamera();

    // Rebuild dirty chunks (also updates occlusion data)
    this.rebuildDirtyChunks();

    // Combined culling: frustum + occlusion
    this.performCulling();

    this.updateStats();
  }

  private rebuildDirtyChunks(): void {
    this.chunks.forEach((entry) => {
      if (entry.chunk.isDirty()) {
        entry.chunk.rebuild();

        // Update occlusion data when chunk changes
        if (this.occlusionEnabled) {
          this.occlusionCuller.analyzeChunk(entry.chunk);
        }

        this.stats.rebuildCount++;
      }
    });
  }

  private performCulling(): void {
    this.stats.cullCount = 0;
    this.stats.visibleChunks = 0;

    // Get occlusion-visible chunks
    let occlusionVisible: Set<string> | null = null;
    if (this.occlusionEnabled) {
      occlusionVisible = this.occlusionCuller.computeVisibleChunks(
        this.cameraChunkX,
        this.cameraChunkZ,
        this.config.renderRadius
      );
    }

    this.chunks.forEach((entry, key) => {
      // Frustum check
      const inFrustum = this.config.enableFrustumCulling
        ? this.frustum.intersectsBox(entry.chunk.boundingBox)
        : true;

      // Occlusion check
      const notOccluded = !this.occlusionEnabled ||
        !occlusionVisible ||
        occlusionVisible.has(key);

      const isVisible = inFrustum && notOccluded;
      entry.chunk.setVisible(isVisible);

      if (isVisible) {
        this.stats.visibleChunks++;
      } else {
        this.stats.cullCount++;
      }
    });
  }

  /** Enable/disable occlusion culling */
  setOcclusionCulling(enabled: boolean): void {
    this.occlusionEnabled = enabled;
  }
}
```

## Performance Characteristics

**Occlusion analysis** (per chunk rebuild):
- Mostly solid/empty chunks: O(1)
- Detailed chunks: O(n) flood fill where n = air blocks
- Amortized: Only on chunk rebuild, not every frame

**Visibility propagation** (per frame):
- BFS through chunks: O(visible chunks)
- Typically 10-50ms for large view distances
- Can be optimized with caching

## Expected Impact

**Surface terrain** (mostly visible):
- Minimal improvement (10-20% culled)
- Chunks behind hills/mountains culled

**Underground/caves**:
- 60-80% of chunks culled
- Only caves connected to camera rendered

**Interior buildings**:
- Exterior chunks culled when camera inside
- ~50% improvement for indoor scenes

## Debug Visualization

```typescript
// Show which chunks are visible vs occluded
debugDrawOcclusion(scene: THREE.Scene): void {
  this.chunks.forEach((entry, key) => {
    const occluded = !this.occlusionCuller.isVisible(key);
    const color = occluded ? 0xff0000 : 0x00ff00;
    // Draw bounding box outline
    const box = new THREE.Box3Helper(entry.chunk.boundingBox, color);
    scene.add(box);
  });
}
```

## Future Enhancements

1. **Hierarchical Occlusion**: Octree-based for large worlds
2. **GPU Occlusion Queries**: Use WebGL occlusion queries for pixel-accurate culling
3. **Portal System**: Define visibility portals for complex interiors
4. **Temporal Coherence**: Cache visibility, only recompute when camera moves significantly

## References

- [Tomcc on Cave Culling (Twitter)](https://twitter.com/notch/status/459605972012957696)
- [Minecraft Rendering Deep Dive](https://0fps.net/2012/06/30/meshing-in-a-minecraft-game/)
- [Potentially Visible Set (PVS)](https://developer.valvesoftware.com/wiki/PVS)
- [Umbra Occlusion Culling](https://umbra3d.com/)
