# 3D Renderer Performance Optimization Plan

> Based on Minecraft rendering best practices from Sodium, 0fps.net meshing articles, and Tomcc's cave culling algorithm.

## Executive Summary

The current `Renderer3D.ts` creates **individual Three.js Mesh objects for every terrain block**, resulting in:
- Thousands of draw calls per frame
- Massive memory overhead
- Poor GPU batching
- No geometry optimization

This plan implements Minecraft-style rendering optimizations to achieve **10-100x performance improvement**.

---

## Current State Analysis

### Critical Issues Found (Renderer3D.ts:712-758)

```typescript
// CURRENT: Creates new Mesh PER BLOCK (lines 734-742)
private buildTile(x, y, tile): void {
  for (let z = minZ; z <= maxZ; z++) {
    const mesh = new THREE.Mesh(this.blockGeometry, material);  // NEW MESH PER BLOCK!
    this.terrainGroup.add(mesh);  // Thousands of scene objects
  }
}
```

**Problems:**
1. **No geometry batching** - Each 1x1 block = 1 draw call
2. **Shared geometry, individual meshes** - Wastes transform overhead
3. **No greedy meshing** - Renders invisible internal faces
4. **No chunk-level management** - Can't unload/reload efficiently
5. **No frustum culling** - Builds geometry for all tiles in radius
6. **No instancing** - Same material blocks aren't instanced

### Performance Impact

| Metric | Current | Target |
|--------|---------|--------|
| Draw calls per chunk | ~4,000 | ~10-50 |
| Vertices per chunk | ~96,000 | ~2,000-10,000 |
| Memory per chunk | ~10MB | ~500KB |
| Chunk build time | ~100ms | ~5ms |

---

## Optimization Phases

### Phase 1: Chunk-Based Geometry Batching (HIGH IMPACT)

**Goal**: Batch all blocks in a 16x16x16 chunk into a single merged geometry.

**Implementation:**

```typescript
// NEW: ChunkMesh class
class ChunkMesh {
  private geometry: THREE.BufferGeometry;
  private mesh: THREE.Mesh;
  private chunkX: number;
  private chunkZ: number;

  rebuild(world: World): void {
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    // Build all visible faces into single geometry
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        for (let y = minY; y <= maxY; y++) {
          this.addBlockFaces(x, y, z, positions, normals, colors, indices);
        }
      }
    }

    // Create single BufferGeometry
    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    this.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.geometry.setIndex(indices);
  }
}
```

**Expected Impact**: 50-100x reduction in draw calls

### Phase 2: Face Culling (MEDIUM-HIGH IMPACT)

**Goal**: Don't render faces between adjacent solid blocks.

**Algorithm:**
```typescript
private addBlockFaces(x, y, z, ...): void {
  const block = this.getBlock(x, y, z);
  if (!block) return;

  // Only add faces that are exposed to air/transparent blocks
  if (!this.isOpaque(x + 1, y, z)) this.addFace(EAST, ...);
  if (!this.isOpaque(x - 1, y, z)) this.addFace(WEST, ...);
  if (!this.isOpaque(x, y + 1, z)) this.addFace(TOP, ...);
  if (!this.isOpaque(x, y - 1, z)) this.addFace(BOTTOM, ...);
  if (!this.isOpaque(x, y, z + 1)) this.addFace(NORTH, ...);
  if (!this.isOpaque(x, y, z - 1)) this.addFace(SOUTH, ...);
}
```

**Expected Impact**: 60-80% vertex reduction (most faces are hidden)

### Phase 3: Greedy Meshing (HIGH IMPACT)

**Goal**: Merge adjacent same-type blocks into larger quads.

**Algorithm** (from [0fps.net](https://0fps.net/2012/06/30/meshing-in-a-minecraft-game/)):

```typescript
// Binary greedy meshing - merge faces into larger rectangles
function greedyMesh(chunk: ChunkData): Mesh {
  // For each axis direction (6 faces)
  for (const axis of [X, Y, Z]) {
    for (const direction of [POSITIVE, NEGATIVE]) {
      // Create 2D slice mask
      const mask = new Int32Array(16 * 16);

      // Fill mask with block types for this slice
      for (let u = 0; u < 16; u++) {
        for (let v = 0; v < 16; v++) {
          mask[u + v * 16] = shouldRenderFace(axis, direction, u, v)
            ? getBlockType(u, v)
            : 0;
        }
      }

      // Greedy merge adjacent same-type cells into rectangles
      for (let j = 0; j < 16; j++) {
        for (let i = 0; i < 16; ) {
          const type = mask[i + j * 16];
          if (type === 0) { i++; continue; }

          // Compute width (how far we can extend in i direction)
          let width = 1;
          while (i + width < 16 && mask[i + width + j * 16] === type) {
            width++;
          }

          // Compute height (how far we can extend in j direction)
          let height = 1;
          outer: while (j + height < 16) {
            for (let k = 0; k < width; k++) {
              if (mask[i + k + (j + height) * 16] !== type) break outer;
            }
            height++;
          }

          // Add single quad for the merged region
          addQuad(axis, direction, i, j, width, height, type);

          // Zero out merged region in mask
          for (let dj = 0; dj < height; dj++) {
            for (let di = 0; di < width; di++) {
              mask[i + di + (j + dj) * 16] = 0;
            }
          }

          i += width;
        }
      }
    }
  }
}
```

**Expected Impact**: 50-90% additional vertex reduction

### Phase 4: Frustum Culling (MEDIUM IMPACT)

**Goal**: Don't rebuild/render chunks outside camera view.

```typescript
private visibleChunks: Set<string> = new Set();
private frustum = new THREE.Frustum();
private projScreenMatrix = new THREE.Matrix4();

updateVisibleChunks(): void {
  // Update frustum from camera
  this.projScreenMatrix.multiplyMatrices(
    this.camera.projectionMatrix,
    this.camera.matrixWorldInverse
  );
  this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

  this.visibleChunks.clear();

  for (const [key, chunk] of this.chunks) {
    if (this.frustum.intersectsBox(chunk.boundingBox)) {
      this.visibleChunks.add(key);
      chunk.mesh.visible = true;
    } else {
      chunk.mesh.visible = false;
    }
  }
}
```

**Expected Impact**: 30-70% reduction in rendered geometry (depends on FOV)

### Phase 5: Chunk LOD System (MEDIUM IMPACT)

**Goal**: Use lower-detail meshes for distant chunks.

```typescript
enum ChunkLOD {
  FULL = 0,      // All blocks, greedy meshed
  HALF = 1,      // Every other block
  QUARTER = 2,  // Every 4th block
  BILLBOARD = 3  // Single textured quad
}

private getChunkLOD(distance: number): ChunkLOD {
  if (distance < 32) return ChunkLOD.FULL;
  if (distance < 64) return ChunkLOD.HALF;
  if (distance < 128) return ChunkLOD.QUARTER;
  return ChunkLOD.BILLBOARD;
}
```

**Expected Impact**: 40-60% reduction for distant terrain

### Phase 6: Instanced Rendering (MEDIUM IMPACT)

**Goal**: Use GPU instancing for entities and repeated objects.

```typescript
// For buildings, plants, etc. that share geometry
class InstancedObjectRenderer {
  private instancedMesh: THREE.InstancedMesh;
  private matrix = new THREE.Matrix4();
  private instanceCount = 0;

  addInstance(x: number, y: number, z: number, scale: number): void {
    this.matrix.makeTranslation(x, y, z);
    this.matrix.scale(new THREE.Vector3(scale, scale, scale));
    this.instancedMesh.setMatrixAt(this.instanceCount++, this.matrix);
  }

  update(): void {
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.instancedMesh.count = this.instanceCount;
  }
}
```

**Expected Impact**: 10-50x reduction in draw calls for entities

---

## Implementation Order

| Phase | Effort | Impact | Dependencies |
|-------|--------|--------|--------------|
| 1. Chunk Batching | 2 days | Very High | None |
| 2. Face Culling | 1 day | High | Phase 1 |
| 3. Greedy Meshing | 2 days | Very High | Phase 2 |
| 4. Frustum Culling | 0.5 day | Medium | Phase 1 |
| 5. Chunk LOD | 1 day | Medium | Phase 3 |
| 6. Instanced Rendering | 1 day | Medium | None |

**Total estimated effort**: ~7-8 days

---

## Architecture Changes

### New Files

```
packages/renderer/src/3d/
├── ChunkMesh.ts           # Batched chunk geometry
├── ChunkManager3D.ts      # Chunk lifecycle management
├── GreedyMesher.ts        # Greedy meshing algorithm
├── FrustumCuller.ts       # Frustum culling utilities
├── InstancedRenderer.ts   # GPU instancing for entities
└── TerrainMaterials.ts    # Shared materials with vertex colors
```

### Renderer3D.ts Changes

```typescript
// BEFORE
private builtTiles: Set<string> = new Set();
private terrainGroup: THREE.Group;

// AFTER
private chunkManager: ChunkManager3D;
private frustumCuller: FrustumCuller;
private instancedEntityRenderer: InstancedRenderer;
```

---

## Performance Targets

| Metric | Current | Phase 1 | Phase 3 | Final |
|--------|---------|---------|---------|-------|
| Draw calls | ~4000 | ~100 | ~50 | ~30 |
| Vertices | ~96k | ~96k | ~10k | ~5k |
| Frame time | ~33ms | ~10ms | ~5ms | ~3ms |
| FPS | 30 | 60 | 120+ | 144+ |

---

## Testing Strategy

1. **Unit tests** for greedy meshing algorithm
2. **Visual regression** tests with screenshots
3. **Performance benchmarks** (frame time, draw calls, memory)
4. **A/B comparison** with feature flags

---

## References

- [Sodium Chunk Rendering Pipeline](https://deepwiki.com/CaffeineMC/sodium/3.1-chunk-rendering)
- [Meshing in a Minecraft Game - 0fps.net](https://0fps.net/2012/06/30/meshing-in-a-minecraft-game/)
- [Binary Greedy Meshing](https://github.com/cgerikj/binary-greedy-meshing)
- [Tomcc's Cave Culling Algorithm](https://tomcc.github.io/2014/08/31/visibility-1.html)
- [Brute Force Rendering Culling](https://www.curseforge.com/minecraft/mc-mods/brute-force-rendering-culling)

---

## Appendix: Current Renderer3D Issues

### Issue 1: Individual Mesh Per Block (Critical)
**Location**: `Renderer3D.ts:712-758`
```typescript
// Creates ~4000 meshes for a 20x20 area with 10 height levels
const mesh = new THREE.Mesh(this.blockGeometry, material);
this.terrainGroup.add(mesh);
```

### Issue 2: No Face Culling
**Location**: `Renderer3D.ts:724-758`
```typescript
// Renders ALL 6 faces of EVERY block, even buried ones
for (let z = minZ; z <= maxZ; z++) {
  // No check for adjacent blocks
  const mesh = new THREE.Mesh(this.blockGeometry, material);
}
```

### Issue 3: Inefficient Material Usage
**Location**: `Renderer3D.ts:290-293`
```typescript
// Good: Materials are cached
this.materials.set(name, new THREE.MeshLambertMaterial({ color }));
// Bad: Each mesh references material separately (no vertex colors)
```

### Issue 4: No Chunk Unloading
**Location**: `Renderer3D.ts:690-710`
```typescript
// Builds forever, never removes distant chunks
if (this.builtTiles.has(key)) continue;
// No cleanup of tiles outside render distance
```
