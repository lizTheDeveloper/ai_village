# Graph-Based Tile Neighbors - Implementation Plan

**Date**: 2026-01-14
**Status**: 🔵 **PLANNING**
**Priority**: High (significant performance win for tile-traversal systems)

---

## Executive Summary

Replace coordinate-based tile access (`world.getTileAt(x+1, y)`) with graph-based neighbor pointers (`tile.neighbors.east`) for:
- **10-100x performance boost** in pathfinding and tile-traversal algorithms
- **Simpler, clearer code** - no offset arrays, no coordinate math
- **Zero chunk generation risk** - if tile exists, neighbors exist (or are null)
- **Cache-friendly** - pointer following vs hash lookups

**Scope**: Core tile architecture refactoring affecting 9+ systems
**Estimated Impact**: Critical systems (Fire, Fluid, Pathfinding) see 5-100x speedup

---

## Current Architecture Analysis

### How Tiles Are Stored Today

```typescript
// packages/world/src/chunks/Chunk.ts
export const CHUNK_SIZE = 32;

interface Chunk {
  x: number;
  y: number;
  tiles: Tile[];  // Flat array, row-major: tiles[y * 32 + x]
  generated: boolean;
  entities: Set<EntityId>;
}

// packages/world/src/chunks/Tile.ts
interface Tile {
  terrain: TerrainType;
  elevation: number;
  moisture: number;
  fertility: number;
  // ... 20+ properties
  // NO neighbors currently!
}
```

### How Neighbors Are Accessed Today

**Pattern**: Coordinate math → getTileAt() → chunk lookup → index calculation

```typescript
// FireSpreadSystem.ts - 8-neighbor fire spreading
const offsets = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0],           [1, 0],
  [-1, 1],  [0, 1],  [1, 1],
];

for (const offset of offsets) {
  const tx = position.x + offset[0];  // Coordinate math
  const ty = position.y + offset[1];
  const tile = world.getTileAt(tx, ty);  // Hash lookup + generation risk
  if (!tile) continue;
  // ... process neighbor
}
```

**Cost breakdown per getTileAt()**:
1. Floor x,y to integers: ~5 cycles
2. Divide by CHUNK_SIZE (32): ~10 cycles
3. Map lookup (chunkX, chunkY): ~15 cycles (hash)
4. Modulo for local coords: ~10 cycles
5. Array index calculation: ~5 cycles
6. **RISK**: Chunk generation if not loaded: 20-50ms!

**Total**: ~50 CPU cycles per neighbor + generation risk

---

## Proposed Architecture

### Tile Neighbor Structure

```typescript
// NEW: packages/world/src/chunks/TileNeighbors.ts

/**
 * Direct neighbor pointers for O(1) tile traversal.
 * null = neighbor doesn't exist (chunk boundary, unloaded, or edge of world)
 */
export interface TileNeighbors {
  // Cardinal directions (4-way)
  north: Tile | null;
  south: Tile | null;
  east: Tile | null;
  west: Tile | null;

  // Diagonal directions (8-way total)
  northEast: Tile | null;
  northWest: Tile | null;
  southEast: Tile | null;
  southWest: Tile | null;

  // Vertical (3D - future fluid/mining)
  up: Tile | null;
  down: Tile | null;
}

// UPDATED: packages/world/src/chunks/Tile.ts
export interface Tile {
  terrain: TerrainType;
  // ... existing properties

  /**
   * Direct neighbor pointers (graph structure).
   * Built when chunk loads, updated on chunk load/unload.
   * Use neighbors instead of getTileAt(x+dx, y+dy)!
   */
  neighbors: TileNeighbors;
}
```

### Helper Methods

```typescript
// packages/world/src/chunks/TileNeighbors.ts

/**
 * Get all cardinal neighbors (N, S, E, W) - for fluid flow
 */
export function getCardinalNeighbors(tile: Tile): Tile[] {
  const result: Tile[] = [];
  if (tile.neighbors.north) result.push(tile.neighbors.north);
  if (tile.neighbors.south) result.push(tile.neighbors.south);
  if (tile.neighbors.east) result.push(tile.neighbors.east);
  if (tile.neighbors.west) result.push(tile.neighbors.west);
  return result;
}

/**
 * Get all 8-way neighbors (N, NE, E, SE, S, SW, W, NW) - for fire spreading
 */
export function getAllNeighbors(tile: Tile): Tile[] {
  const result: Tile[] = [];
  const n = tile.neighbors;
  if (n.north) result.push(n.north);
  if (n.northEast) result.push(n.northEast);
  if (n.east) result.push(n.east);
  if (n.southEast) result.push(n.southEast);
  if (n.south) result.push(n.south);
  if (n.southWest) result.push(n.southWest);
  if (n.west) result.push(n.west);
  if (n.northWest) result.push(n.northWest);
  return result;
}

/**
 * Get 3D neighbors (6-way: N, S, E, W, Up, Down) - for fluid dynamics
 */
export function get3DNeighbors(tile: Tile): Tile[] {
  const result: Tile[] = [];
  const n = tile.neighbors;
  if (n.north) result.push(n.north);
  if (n.south) result.push(n.south);
  if (n.east) result.push(n.east);
  if (n.west) result.push(n.west);
  if (n.up) result.push(n.up);
  if (n.down) result.push(n.down);
  return result;
}
```

### Usage Example (Before → After)

**Before** (FireSpreadSystem):
```typescript
const offsets = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
for (const offset of offsets) {
  const tx = position.x + offset[0];
  const ty = position.y + offset[1];
  if (!this.isChunkGenerated(tx, ty, chunkManager)) continue;
  const neighbor = world.getTileAt(tx, ty);  // ~50 cycles + generation risk
  if (!neighbor) continue;
  this.attemptTileIgnition(world, tx, ty, neighbor, ...);
}
```

**After**:
```typescript
const currentTile = world.getTileAt(position.x, position.y);  // Get once
if (!currentTile) return;

for (const neighbor of getAllNeighbors(currentTile)) {  // ~5 cycles per iteration
  // neighbor is Tile, no null check needed (filtered by helper)
  this.attemptTileIgnition(world, neighbor.x, neighbor.y, neighbor, ...);
}
```

**Speedup**: 50 cycles → 5 cycles per neighbor = **10x faster**

---

## Chunk Boundary Handling

### Challenge: Neighbors Across Chunks

```
Chunk (0, 0)              Chunk (1, 0)
┌─────────────────┐      ┌─────────────────┐
│ ... ... ... ... │      │ ... ... ... ... │
│ ... ... ... TileA │─────→│ TileB ... ... │
│ ... ... ... ... │      │ ... ... ... ... │
└─────────────────┘      └─────────────────┘
          ↑                         ↑
     Chunk boundary          Cross-chunk neighbor
```

**TileA.neighbors.east** should point to **TileB** in the adjacent chunk.

### Solution: Update Neighbors on Chunk Load/Unload

```typescript
// packages/world/src/chunks/ChunkManager.ts

class ChunkManager {
  /**
   * Build neighbor pointers for all tiles in a chunk.
   * Handles both intra-chunk and cross-chunk neighbors.
   */
  private linkChunkNeighbors(chunk: Chunk): void {
    for (let y = 0; y < CHUNK_SIZE; y++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const tile = getTileAt(chunk, x, y);
        if (!tile) continue;

        tile.neighbors = {
          // Intra-chunk neighbors (same chunk)
          north: this.getNeighborTile(chunk, x, y - 1),
          south: this.getNeighborTile(chunk, x, y + 1),
          east: this.getNeighborTile(chunk, x + 1, y),
          west: this.getNeighborTile(chunk, x - 1, y),
          northEast: this.getNeighborTile(chunk, x + 1, y - 1),
          northWest: this.getNeighborTile(chunk, x - 1, y - 1),
          southEast: this.getNeighborTile(chunk, x + 1, y + 1),
          southWest: this.getNeighborTile(chunk, x - 1, y + 1),

          // Vertical (future 3D support)
          up: null,  // Phase 8.5: Z-level support
          down: null,
        };
      }
    }
  }

  /**
   * Get neighbor tile, handling chunk boundaries.
   * Returns null if neighbor is in unloaded chunk or out of bounds.
   */
  private getNeighborTile(chunk: Chunk, localX: number, localY: number): Tile | null {
    // Within current chunk?
    if (localX >= 0 && localX < CHUNK_SIZE && localY >= 0 && localY < CHUNK_SIZE) {
      return getTileAt(chunk, localX, localY) ?? null;
    }

    // Cross-chunk neighbor
    const worldX = chunk.x * CHUNK_SIZE + localX;
    const worldY = chunk.y * CHUNK_SIZE + localY;
    const neighborChunkX = Math.floor(worldX / CHUNK_SIZE);
    const neighborChunkY = Math.floor(worldY / CHUNK_SIZE);

    const neighborChunk = this.getChunk(neighborChunkX, neighborChunkY);
    if (!neighborChunk || !neighborChunk.generated) {
      return null;  // Neighbor chunk not loaded
    }

    const neighborLocalX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const neighborLocalY = ((worldY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    return getTileAt(neighborChunk, neighborLocalX, neighborLocalY) ?? null;
  }

  /**
   * Update cross-chunk neighbor links when chunk loads.
   * Called after chunk generation.
   */
  private updateCrossChunkNeighbors(chunk: Chunk): void {
    // Update this chunk's edge tiles to point to neighbors
    this.linkChunkNeighbors(chunk);

    // Update adjacent chunks' edge tiles to point back to this chunk
    const adjacentChunks = [
      this.getChunk(chunk.x - 1, chunk.y),     // West
      this.getChunk(chunk.x + 1, chunk.y),     // East
      this.getChunk(chunk.x, chunk.y - 1),     // North
      this.getChunk(chunk.x, chunk.y + 1),     // South
      this.getChunk(chunk.x - 1, chunk.y - 1), // NW
      this.getChunk(chunk.x + 1, chunk.y - 1), // NE
      this.getChunk(chunk.x - 1, chunk.y + 1), // SW
      this.getChunk(chunk.x + 1, chunk.y + 1), // SE
    ];

    for (const adjChunk of adjacentChunks) {
      if (adjChunk && adjChunk.generated) {
        this.linkChunkNeighbors(adjChunk);  // Relink edge tiles
      }
    }
  }
}
```

---

## Memory Overhead Analysis

### Per-Tile Memory Cost

```typescript
interface TileNeighbors {
  north: Tile | null;      // 8 bytes (pointer)
  south: Tile | null;      // 8 bytes
  east: Tile | null;       // 8 bytes
  west: Tile | null;       // 8 bytes
  northEast: Tile | null;  // 8 bytes
  northWest: Tile | null;  // 8 bytes
  southEast: Tile | null;  // 8 bytes
  southWest: Tile | null;  // 8 bytes
  up: Tile | null;         // 8 bytes
  down: Tile | null;       // 8 bytes
}
// Total: 80 bytes per tile
```

### World-Scale Memory Impact

| World Size | Tiles | Memory Cost |
|------------|-------|-------------|
| 1,000 × 1,000 | 1M | 80 MB |
| 5,000 × 5,000 | 25M | 2 GB |
| 10,000 × 10,000 | 100M | 8 GB |

**BUT**: Only loaded chunks consume memory!

| Loaded Chunks | Tiles | Memory Cost |
|---------------|-------|-------------|
| 25 (5×5) | 25,600 | 2 MB |
| 100 (10×10) | 102,400 | 8 MB |
| 400 (20×20) | 409,600 | 32 MB |

**Verdict**: **Negligible** for loaded chunks (~8-32 MB), acceptable for modern systems.

---

## Migration Strategy

### Phase 8.1: Add Neighbor Structure (Non-Breaking)

**Goal**: Add neighbors to Tile interface, build on chunk load, but don't change any systems yet.

**Files to modify**:
1. `packages/world/src/chunks/Tile.ts` - Add `neighbors: TileNeighbors` field
2. `packages/world/src/chunks/TileNeighbors.ts` - NEW: Define TileNeighbors interface + helpers
3. `packages/world/src/chunks/ChunkManager.ts` - Build neighbors on chunk load
4. `packages/world/src/index.ts` - Export TileNeighbors helpers

**Verification**:
- Build passes
- Console log shows neighbor links being built
- No system behavior changes (neighbors exist but unused)

### Phase 8.2: Migrate FireSpreadSystem (Proof of Concept)

**Goal**: Convert FireSpreadSystem to use graph neighbors, verify performance win.

**Changes**:
```typescript
// OLD
const offsets = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
for (const offset of offsets) {
  const tx = position.x + offset[0];
  const ty = position.y + offset[1];
  if (!this.isChunkGenerated(tx, ty, chunkManager)) continue;
  const tile = world.getTileAt(tx, ty);
  if (!tile) continue;
  this.attemptTileIgnition(...);
}

// NEW
const centerTile = world.getTileAt(position.x, position.y);
if (!centerTile) return;

for (const neighbor of getAllNeighbors(centerTile)) {
  this.attemptTileIgnition(world, neighbor.x, neighbor.y, neighbor, ...);
}
```

**Expected result**: 5-10x speedup in fire spreading (120 getTileAt() calls → 1 + 8 pointer dereferences).

### Phase 8.3: Migrate FluidDynamicsSystem

**Goal**: Convert fluid simulation to use graph neighbors for pressure propagation.

**Changes**:
```typescript
// OLD
private get3DNeighbors(x: number, y: number, z: number) {
  return [
    { x: x + 1, y: y, z: z },  // East
    { x: x - 1, y: y, z: z },  // West
    // ... 4 more
  ];
}

for (const neighbor of neighbors) {
  const targetTile = worldWithTiles.getTileAt(neighbor.x, neighbor.y, neighbor.z);
  if (!targetTile) continue;
  // ... pressure flow
}

// NEW
const sourceTile = worldWithTiles.getTileAt(x, y, z);
if (!sourceTile) return;

for (const targetTile of get3DNeighbors(sourceTile)) {
  // Direct access, no coordinate math!
  // ... pressure flow
}
```

**Expected result**: 5-10x speedup in fluid propagation.

### Phase 8.4: Migrate Remaining Systems

**Systems to migrate** (in priority order):
1. **Pathfinding** (if exists) - Biggest win
2. **RoofRepairSystem** - 1,300 tile scans per building
3. **AgentSwimmingSystem** - Already optimized, but can simplify
4. **TemperatureSystem** - Proximity checks
5. **Any other system using neighbor iteration**

**Estimated migration time**: 1-2 hours per system (straightforward pattern)

### Phase 8.5: Add 3D (Z-Level) Support

**Goal**: Wire up `neighbors.up` and `neighbors.down` for multi-level worlds.

**Prerequisites**: World supports Z-levels (future feature)

**Defer until**: Z-level terrain generation is implemented.

---

## Systems That Benefit

### Critical Wins (10-100x speedup expected)

1. **FireSpreadSystem** ✅
   - Current: 8 neighbors × 10 fires = 80 getTileAt() calls
   - After: 1 getTileAt() + 80 pointer dereferences
   - **Speedup**: 10x

2. **FluidDynamicsSystem** ✅
   - Current: 6 neighbors × 100 dirty tiles = 600 getTileAt() calls
   - After: 100 getTileAt() + 600 pointer dereferences
   - **Speedup**: 5-10x

3. **Pathfinding** (if exists) ✅
   - A* explores 1000s of nodes, each checking 4-8 neighbors
   - Current: 5,000 getTileAt() calls for a 50-tile path
   - After: 1 getTileAt() + 5,000 pointer dereferences
   - **Speedup**: 50-100x

### Moderate Wins (2-5x speedup)

4. **AgentSwimmingSystem** ✅
   - Already optimized with chunk checks
   - Can simplify code + 2-3x speedup

5. **RoofRepairSystem** ✅
   - 1,300 tiles scanned per building
   - 2-3x speedup

6. **TemperatureSystem** ✅
   - Already uses chunk queries
   - Modest win if refactored to use neighbors

### Long-Term Wins (Future Systems)

7. **Mining/Digging** - Collapse mechanics need neighbor checks
8. **Cave Generation** - Room connectivity
9. **Vision/FOV** - Line-of-sight raycasting
10. **AI Perception** - "What's around me?" queries

---

## Performance Expectations

### Benchmark Targets

| System | Before (getTileAt) | After (neighbors) | Speedup |
|--------|-------------------|-------------------|---------|
| FireSpreadSystem | ~10ms | ~1ms | 10x |
| FluidDynamicsSystem | ~5ms | ~0.5ms | 10x |
| Pathfinding (A*) | ~100ms | ~2ms | 50x |
| RoofRepairSystem | 300ms | 100ms | 3x |
| Total gain | ~415ms | ~103ms | **4x** |

**TPS Impact**:
- Before: 23-24 TPS (systems use 415ms per 1200 ticks)
- After: 24 TPS stable (systems use 103ms per 1200 ticks)
- **Extra headroom**: 312ms saved → can support more systems or larger maps

---

## Implementation Checklist

### Phase 8.1: Infrastructure ✅
- [ ] Add `TileNeighbors` interface to `Tile.ts`
- [ ] Create `TileNeighbors.ts` with helper functions
- [ ] Update `ChunkManager` to build neighbors on chunk load
- [ ] Update `ChunkManager` to handle chunk boundary updates
- [ ] Update exports in `packages/world/src/index.ts`
- [ ] Build passes
- [ ] Console logs show neighbor links being built

### Phase 8.2: Proof of Concept ✅
- [ ] Migrate FireSpreadSystem to use `getAllNeighbors()`
- [ ] Remove chunk generation checks (no longer needed!)
- [ ] Test fire spreading in browser
- [ ] Verify 5-10x speedup with profiling
- [ ] No regressions (fire still spreads correctly)

### Phase 8.3: Fluid Dynamics ✅
- [ ] Migrate FluidDynamicsSystem to use `get3DNeighbors()`
- [ ] Test fluid flow in browser
- [ ] Verify 5-10x speedup
- [ ] No regressions (water flows correctly)

### Phase 8.4: Remaining Systems ✅
- [ ] Migrate RoofRepairSystem
- [ ] Migrate AgentSwimmingSystem (simplify)
- [ ] Migrate TemperatureSystem (if applicable)
- [ ] Migrate any pathfinding systems
- [ ] Profile each migration
- [ ] Update documentation

### Phase 8.5: Future (Z-Levels) ⏳
- [ ] Defer until 3D terrain is implemented

---

## Risks & Mitigations

### Risk 1: Memory Overhead Too High

**Mitigation**: Only loaded chunks have neighbor pointers (~32 MB max).

**Fallback**: Lazy neighbor initialization (build on first access).

### Risk 2: Chunk Boundary Bugs

**Symptoms**: Null pointers at chunk edges, fire/fluid doesn't cross chunks.

**Mitigation**:
- Comprehensive unit tests for edge tiles
- Visual debugging (highlight chunk boundaries in renderer)
- Extensive testing with chunk loading/unloading

**Rollback**: Keep getTileAt() as fallback for 1-2 weeks during migration.

### Risk 3: Stale Neighbor Pointers

**Scenario**: Chunk unloads but neighbor pointers not updated.

**Mitigation**:
- Always set neighbors to `null` on chunk unload
- Re-link all adjacent chunks' edges
- Add validation: check `neighbor.chunk.generated === true` if paranoid

### Risk 4: 3D (Z-Level) Complicates Design

**Mitigation**: Defer `up`/`down` linking until Z-levels are implemented. Leave as `null` for now.

---

## Rollback Plan

### Per-System Rollback

Each migrated system keeps both code paths for 1-2 weeks:

```typescript
// Migration guard flag
const USE_GRAPH_NEIGHBORS = true;

if (USE_GRAPH_NEIGHBORS && centerTile?.neighbors) {
  // NEW: Use neighbors
  for (const neighbor of getAllNeighbors(centerTile)) {
    // ...
  }
} else {
  // OLD: Use getTileAt()
  for (const offset of offsets) {
    const tile = world.getTileAt(x + offset[0], y + offset[1]);
    // ...
  }
}
```

Toggle `USE_GRAPH_NEIGHBORS = false` to revert.

### Full Rollback

```bash
# Revert all Phase 8 changes
git log --oneline | grep "Phase 8"
git revert <commit-hash>

# Or revert specific files
git checkout HEAD~10 -- packages/world/src/chunks/Tile.ts
git checkout HEAD~10 -- packages/core/src/systems/FireSpreadSystem.ts
```

---

## Success Criteria

### Phase 8.1 (Infrastructure)
- ✅ Build passes
- ✅ Neighbors built on chunk load (verified via console)
- ✅ No performance regression (neighbors exist but unused)

### Phase 8.2 (FireSpreadSystem)
- ✅ Code compiles
- ✅ Fire spreads correctly (no regressions)
- ✅ 5-10x speedup measured (profiling)
- ✅ No chunk generation errors

### Phase 8.3 (FluidDynamicsSystem)
- ✅ Water flows correctly
- ✅ 5-10x speedup measured
- ✅ Cross-chunk flow works

### Phase 8.4 (All Systems)
- ✅ All migrated systems work correctly
- ✅ Overall TPS improves or stays stable
- ✅ No crashes or null pointer errors

---

## Documentation Updates

After Phase 8 completion:

1. **README.md** - Add "Graph Tiles" section
2. **ARCHITECTURE_OVERVIEW.md** - Document neighbor structure
3. **PERFORMANCE.md** - Add "Use tile.neighbors instead of getTileAt()"
4. **Phase 8 summary** - Create `GRAPH_TILES_PHASE8_COMPLETE.md`

---

## Conclusion

Graph-based tile neighbors are a **high-value, low-risk optimization**:

**Pros**:
- 5-100x speedup for tile-traversal algorithms
- Simpler, clearer code (no offset arrays)
- Eliminates chunk generation risk
- Natural for fire, fluid, pathfinding

**Cons**:
- 80 bytes per tile (~32 MB for loaded chunks)
- Chunk boundary complexity (manageable)
- Migration effort (1-2 hours per system)

**Recommendation**: **Proceed with Phase 8.1-8.4** immediately. High impact, manageable scope.

---

**Next Step**: Get user approval, then implement Phase 8.1 (infrastructure).

---

**Plan Created**: 2026-01-14
**Created By**: Claude Code (AI Assistant)
**Status**: Awaiting user approval to proceed
