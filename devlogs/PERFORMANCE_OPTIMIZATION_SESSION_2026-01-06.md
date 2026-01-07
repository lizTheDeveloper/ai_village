# Performance Optimization Session Summary

**Date**: 2026-01-06
**Status**: ✅ Door System Optimized | ❌ MovementSystem Tile Cache Reverted

## Session Overview

Profiling revealed performance bottlenecks in tick processing. Successfully optimized DoorSystem (100-400x speedup), attempted MovementSystem optimization that was unnecessary and reverted.

## Optimizations Completed

### 1. Door System Optimization ✅

**Problem**: DoorSystem consuming 90-95% of tick time (100-400ms per tick)

**Root Cause**: Scanning 3×3 grid around every agent, every tick
- 100 agents × 9 tiles = 900 `getTileAt()` calls per tick
- Each call required expensive chunk lookups

**Solution**: Moved door location caching to World's spatial indices

**Implementation**:
- Added `doorLocationsCache` to World.ts (packages/core/src/ecs/World.ts:302)
- Added `getDoorLocations()` public API method
- Added `invalidateDoorCache()` for event-driven invalidation
- Modified DoorSystem to use `world.getDoorLocations()`

**Algorithm Change**:
- **Before**: O(agents × tile_radius²) = 900 tile lookups
- **After**: O(doors × agents) = 2,000 distance checks (no tile lookups!)

**Result**: DoorSystem dropped from 100-400ms → <1ms per tick (100-400x speedup)

**Files Modified**:
- `packages/core/src/ecs/World.ts` - Added door cache infrastructure
- `packages/core/src/systems/DoorSystem.ts` - Removed local cache, uses World's cache

**Status**: ✅ Committed and working

---

## Optimizations Attempted and Reverted

### 2. MovementSystem Tile Cache ❌

**Problem**: After door optimization, MovementSystem became bottleneck at 48-54ms per tick

**Attempted Solution**: Per-tick tile cache to avoid redundant `getTileAt()` calls

**Why It Failed**: **Redundant caching - ChunkManager already provides caching!**

**Key Learning**: **The tile/map cache already exists in ChunkManager**

```typescript
// ChunkManager.ts - THIS IS THE EXISTING CACHE
class ChunkManager {
  private chunks = new Map<string, Chunk>();  // ← Tile cache lives here!

  getChunk(chunkX: number, chunkY: number): Chunk {
    const key = getChunkKey(chunkX, chunkY);
    let chunk = this.chunks.get(key);  // ← Cache lookup

    if (!chunk) {
      chunk = createChunk(chunkX, chunkY);  // ← Cache miss: create
      this.chunks.set(key, chunk);          // ← Store in cache
    }

    return chunk;  // ← Cache hit: return existing
  }
}
```

**How Tile Access Works**:
1. `world.getTileAt(x, y)` calls ChunkManager
2. ChunkManager looks up chunk in `chunks` Map (O(1) cache hit)
3. Chunk returns tile from internal data structure
4. **Chunks are already cached!**

**Why My Cache Was Unnecessary**:
- ChunkManager.chunks Map = existing tile/map cache
- Chunks persist across ticks
- Multiple calls to same tile = cache hits
- Adding another cache layer = redundant and interfering

**Impact**: Broke agent movement (agents couldn't move at all)

**Resolution**: Changes reverted, movement restored

**Status**: ❌ Reverted

---

## Architecture Lessons

### 1. Understand Existing Caching Before Adding More

**Bad**: "This makes too many lookups, I'll add a cache"
**Good**: "Where do these lookups go? Is there already caching?"

**In this case**:
- `getTileAt()` → World → ChunkManager → chunks Map (cached!)
- Chunks are expensive to generate, cheap to access
- Adding per-tick cache = redundant complexity

### 2. Caching Levels in the ECS

**Level 1: ChunkManager (Spatial Data)**
- ✅ Caches chunks (Map<string, Chunk>)
- ✅ Persists across ticks
- ✅ Used by all systems
- **Use for**: Tile access, terrain data, spatial queries

**Level 2: World Spatial Indices (Derived Data)**
- ✅ Door locations cache (getDoorLocations)
- ✅ Event-driven invalidation
- ✅ Shared across systems
- **Use for**: Expensive queries over tiles (door locations, building positions)

**Level 3: System-Specific Caches (Hot Path Optimization)**
- ✅ Building collision cache (MovementSystem)
- ✅ Agent position cache (DoorSystem)
- ❌ **DON'T** cache what's already cached at lower levels!
- **Use for**: System-specific queries that aren't cached elsewhere

### 3. When to Add Caching

**Add caching when**:
1. Profiling shows expensive repeated operations
2. **AND** no existing cache covers the operation
3. **AND** cache hit rate will be high
4. **AND** invalidation is straightforward

**Don't add caching when**:
1. Operation is already fast (< 1ms)
2. Existing cache covers it (check lower levels!)
3. Cache hit rate would be low
4. Invalidation is complex or error-prone

### 4. Profile-Driven Optimization Workflow

**Correct Workflow**:
1. ✅ Profile to identify bottleneck (GameLoop profiling)
2. ✅ Understand root cause (scan code, trace calls)
3. ⚠️ **CHECK FOR EXISTING CACHING** ← We missed this!
4. ✅ Design solution (move to appropriate level)
5. ✅ Implement and verify (profiling confirms fix)

**What went wrong**:
- DoorSystem: ✅ Followed workflow correctly
- MovementSystem: ❌ Skipped step 3 (check existing caching)

---

## Performance Analysis

### Profiling Results

**Before Any Optimization**:
```
Tick 1365 took 400ms | door:384, movement:2, governance_data:1
Tick 1370 took 298ms | door:281, movement:2, governance_data:1
```
- Door system: 90-95% of tick time
- Target: 50ms per tick (20 TPS)

**After Door Optimization**:
```
Tick 241 took 59ms | movement:49, plant:1, governance_data:1
Tick 242 took 61ms | movement:51, plant_disease:1, governance_data:1
```
- Door system: No longer in top 3 (< 1ms)
- Movement system: Now 80-90% of tick time
- Still above target 50ms

**Current State**:
- Door optimization: ✅ Working (100-400x speedup)
- Movement system: Original code (48-54ms per tick)
- Next bottleneck: MovementSystem (but NOT a caching issue)

---

## MovementSystem Performance Analysis

### Why Is MovementSystem Slow?

After ruling out tile caching (ChunkManager already caches), the real bottlenecks are likely:

1. **Collision Detection Algorithm**
   - Checks 4-5 positions per moving entity
   - Each check: terrain, walls, doors, elevation, buildings
   - With 100 moving entities: 400-500 collision checks

2. **Chunk-Based Entity Lookups (Soft Collisions)**
   - Queries 9 chunks (3×3 grid) for nearby entities
   - Distance calculations for all nearby entities
   - Per entity, per tick

3. **Computation Complexity**
   - Multiple sqrt() calls (distance calculations)
   - Building collision loop (all buildings checked)
   - Elevation diff calculations

### Potential Optimizations (NOT tile caching!)

1. **Spatial Hashing for Entities**
   - Bin entities by grid cell
   - Only check nearby grid cells for collisions
   - Reduces entity-entity collision checks

2. **Building Spatial Index**
   - Already exists! (buildingCollisionCache)
   - Cache is good, but could use spatial hashing

3. **Distance Calculation Optimization**
   - Already using squared distance (good!)
   - Could use Manhattan distance for early exit

4. **Reduce Collision Checks**
   - Profile to see which checks are most expensive
   - Optimize the most frequent/expensive paths

**Key Point**: MovementSystem optimization ≠ tile caching. It's about algorithmic efficiency.

---

## Files Modified

### Committed Changes

**packages/core/src/ecs/World.ts**:
- Lines 302: Added `doorLocationsCache` field
- Lines 707-762: Added getDoorLocations(), invalidateDoorCache(), rebuildDoorCache()
- Purpose: World-level door location caching for DoorSystem optimization

**packages/core/src/systems/DoorSystem.ts**:
- Removed local door cache and rebuild logic
- Modified processDoorsWithNearbyAgents() to use world.getDoorLocations()
- Purpose: Use World's door cache instead of local cache

### Reverted Changes

**packages/core/src/systems/MovementSystem.ts**:
- Attempted to add per-tick tile cache
- Broke agent movement (agents couldn't move)
- Reverted to original working state
- No changes committed

---

## Key Takeaways

### What Worked

1. **Profile-driven optimization**: GameLoop profiling immediately identified DoorSystem bottleneck
2. **Architectural fix**: Moving door cache to World = proper separation of concerns
3. **Algorithm optimization**: O(N × R²) → O(D × N) = 100-400x speedup
4. **Event-driven invalidation**: Clean cache invalidation without timers

### What Didn't Work

1. **Adding redundant caching**: Per-tick tile cache was unnecessary
2. **Not checking existing infrastructure**: ChunkManager already caches chunks/tiles
3. **Assuming more caching = better**: Sometimes it just adds complexity and breaks things

### What We Learned

1. **ChunkManager is the tile/map cache** - don't duplicate it
2. **World spatial indices are for derived queries** (door locations, not raw tiles)
3. **System caches are for system-specific hot paths** (not general tile access)
4. **Always check lower levels before caching** - might already be cached!

### Next Steps

If MovementSystem still needs optimization (48-54ms → <10ms target):

1. **Profile deeper**: Which part of MovementSystem is slow?
   - hasHardCollision()?
   - getSoftCollisionPenalty()?
   - updatePosition()?

2. **Optimize algorithms, not caching**:
   - Spatial hashing for entity collisions
   - Early exits in collision loops
   - Reduce redundant calculations

3. **Don't add tile caching** - ChunkManager already does this!

---

## Conclusion

**Door System Optimization**: ✅ Success
- 100-400x speedup by moving cache to World
- Proper architectural pattern for spatial indices
- Event-driven cache invalidation

**MovementSystem Tile Cache**: ❌ Unnecessary
- ChunkManager already caches chunks/tiles
- Adding redundant cache broke movement
- Learned: Check existing infrastructure before adding caching

**Overall Impact**:
- Tick times reduced from 100-400ms → 48-54ms
- Door system no longer a bottleneck
- Movement system optimization needed (but NOT tile caching)

**Key Learning**: **The tile/map cache lives in ChunkManager. Don't duplicate it.**
