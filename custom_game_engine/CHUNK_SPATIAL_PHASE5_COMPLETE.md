# Chunk Spatial Optimization - Phase 5 Complete

**Date**: 2026-01-14
**Status**: ✅ **COMPLETE - CRITICAL HOTFIX**

---

## Emergency Performance Fix

Phase 5 addresses **another critical performance bottleneck** discovered immediately after Phase 4:

**Incident**: Tick 6296 took **1864ms** (37x slower than 50ms target)
- AgentSwimmingSystem consumed **1836ms** (98% of tick time)
- This is **4.5x worse** than the TemperatureSystem incident (412ms)
- **Impact**: Game completely unplayable during swimming system updates

---

## Problem Analysis

### The Bottleneck (Before Phase 5)

AgentSwimmingSystem was already **heavily optimized** with:
- ✅ Throttled to every 40 ticks (2 seconds)
- ✅ SimulationScheduler filtering
- ✅ Tile caching
- ✅ Position tracking to skip non-moving agents
- ✅ Underwater entity Set tracking

**BUT** - Missing one critical optimization: **Chunk generation checks**

```typescript
// hasNearbyWater - samples 10 agents
const tile = worldWithTiles.getTileAt(tileX, tileY, tileZ); // EXPENSIVE!

// Main loop - processes ALL active entities
const tile = worldWithTiles.getTileAt(tileX, tileY, tileZ); // EXPENSIVE!
```

**The Problem**: `getTileAt()` triggers **expensive chunk generation** if chunk not yet loaded.

### Why This Caused 1836ms Tick Time

**Chunk generation cost**: ~20-50ms per ungenerated chunk

**When AgentSwimmingSystem runs** (every 40 ticks):
- hasNearbyWater: 10 agents × 20ms = 200ms
- Main loop: 100 active entities × 20ms = 2000ms
- **Total**: ~2200ms

**Observed**: 1836ms ✓ Matches!

### Why Wasn't This Caught Earlier?

The system **only runs every 40 ticks**, so:
- Ticks 1-39: Skip (0ms cost)
- Tick 40: Run and hit ungenerated chunks (1800ms cost)
- Ticks 41-79: Skip (0ms cost)
- Tick 80: Run again (potential 1800ms cost)

The **spike is periodic**, not constant, making it harder to notice in profiling averages.

---

## Solution: Pre-check Chunk Generation

### Strategy

Add chunk generation checks **BEFORE** calling `getTileAt()` to prevent expensive terrain generation.

**Pattern** (same as TemperatureSystem Phase 4):
1. Get ChunkManager reference
2. Calculate chunk coordinates from tile coordinates
3. Check if chunk.generated === true
4. Only call getTileAt() if chunk already generated
5. Cache "not water" for ungenerated chunks (assume land)

### Implementation

**1. Added ChunkManager to world interface**:
```typescript
const worldWithTiles = world as {
  getTileAt?: (x: number, y: number, z?: number) => SwimmingTile | undefined;
  getChunkManager?: () => {
    getChunk: (x: number, y: number) => { generated?: boolean } | undefined;
  } | undefined;
};

const chunkManager = typeof worldWithTiles.getChunkManager === 'function'
  ? worldWithTiles.getChunkManager()
  : undefined;
```

**2. Created chunk generation check helper**:
```typescript
/**
 * Check if a chunk is generated before calling getTileAt
 * CRITICAL: Prevents expensive terrain generation (20-50ms per chunk!)
 */
private isChunkGenerated(
  tileX: number,
  tileY: number,
  chunkManager: { getChunk: (x: number, y: number) => { generated?: boolean } | undefined } | undefined
): boolean {
  if (!chunkManager) return true; // No chunk manager, assume generated

  const CHUNK_SIZE = 32;
  const chunkX = Math.floor(tileX / CHUNK_SIZE);
  const chunkY = Math.floor(tileY / CHUNK_SIZE);
  const chunk = chunkManager.getChunk(chunkX, chunkY);

  return chunk?.generated === true;
}
```

**3. Updated hasNearbyWater to skip ungenerated chunks**:
```typescript
for (let i = 0; i < sampleSize; i++) {
  const tileX = Math.floor(position.x);
  const tileY = Math.floor(position.y);

  // CRITICAL: Skip ungenerated chunks to avoid expensive terrain generation
  if (!this.isChunkGenerated(tileX, tileY, chunkManager)) {
    continue;
  }

  const tile = worldWithTiles.getTileAt(tileX, tileY, tileZ);
  // ...
}
```

**4. Updated main loop to skip ungenerated chunks**:
```typescript
// CRITICAL: Skip ungenerated chunks to avoid expensive terrain generation
if (!this.isChunkGenerated(tileX, tileY, chunkManager)) {
  // Cache as non-water for ungenerated chunks
  cached = {
    tileX, tileY, tileZ,
    tile: undefined,
    isWater: false,
  };
  this.tileCache.set(entity.id, cached);
} else {
  const tile = worldWithTiles.getTileAt(tileX, tileY, tileZ);
  // ...
}
```

---

## Performance Impact

### Before Phase 5
- **getTileAt() calls**: ~110 per update (10 in hasNearbyWater + 100 in main loop)
- **Chunk generation triggers**: Variable (could be 0-100 depending on agent positions)
- **Worst case**: 100 ungenerated chunks × 20ms = **2000ms**
- **Observed**: 1836ms (matches worst case)

### After Phase 5
- **getTileAt() calls**: 0-110 (only for generated chunks)
- **Chunk generation triggers**: **0** (prevented by isChunkGenerated check)
- **Expected time**: ~5-10ms (just cache lookups and logic)
- **Improvement**: **180-360x speedup** in worst case

### Scalability

| Scenario | Before (ms) | After (ms) | Speedup |
|----------|-------------|------------|---------|
| All chunks generated | ~10 | ~10 | 1x (no change) |
| 50% chunks ungenerated | ~1000 | ~10 | 100x |
| 100% chunks ungenerated | ~2000 | ~10 | 200x |

**Key insight**: System now scales with **generated chunks**, not total agents.

---

## What Was Changed

### 1. AgentSwimmingSystem Refactoring ✅

**File**: `packages/core/src/systems/AgentSwimmingSystem.ts`

**Changes**:
1. Added ChunkManager to world interface (line ~125)
2. Created `isChunkGenerated()` helper method (new method)
3. Updated `hasNearbyWater()` signature to accept chunkManager
4. Added chunk check in hasNearbyWater loop (before getTileAt)
5. Added chunk check in main processing loop (before getTileAt)

**Lines Modified**: ~30 lines changed/added

**Key Safety**:
- If chunkManager unavailable, assumes chunks generated (backward compatible)
- Caches "not water" for ungenerated chunks (prevents re-checking)
- No behavior change for generated chunks

---

## Files Changed (1 file)

**Modified**:
1. `packages/core/src/systems/AgentSwimmingSystem.ts` - Added chunk generation checks

**Created**:
1. `CHUNK_SPATIAL_PHASE5_COMPLETE.md` - This documentation

---

## Build Verification

**Status**: ✅ **Build passes**

```bash
npm run build
```

**Result**: No errors from Phase 5 code. Only pre-existing errors in llm and reproduction packages (unrelated).

AgentSwimmingSystem compiled successfully.

---

## Testing Instructions

### Expected Improvements

**Before Phase 5**:
- Periodic ~1800ms spikes every 40 ticks when swimming system runs
- System appears in "top3" with 1800+ ms timing
- Game freezes for 1-2 seconds periodically

**After Phase 5**:
- No more >100ms ticks from AgentSwimmingSystem
- System should be <10ms even when it runs (every 40 ticks)
- Game stays smooth and responsive

### How to Verify

1. **Start the game** and let it run for 500+ ticks
2. **Watch console** for tick timing warnings
3. **Verify**: AgentSwimmingSystem should NOT appear in slow tick warnings
4. **Check**: TPS stays stable at 23-24 (no drops to 0.5 TPS)

### Success Criteria

✅ **No >100ms ticks** with agent_swimming in top3
✅ **Stable TPS** around 23-24
✅ **AgentSwimmingSystem < 10ms** when it runs
✅ **Swimming mechanics still work** (agents can swim, oxygen drains, etc.)

---

## Architecture Notes

### Why This Issue Wasn't Caught Earlier

**The Perfect Storm**:
1. System throttled to every 40 ticks (hides cost in averages)
2. Only affects agents near ungenerated chunks
3. getTileAt() cost varies wildly (0ms if cached, 20-50ms if generates)
4. The system was "too optimized" - we thought it was fine!

### Lesson Learned

**Optimization Checklist** for any system using world.getTileAt():
- [ ] Check if chunk generated BEFORE calling getTileAt()
- [ ] Cache tile lookups to avoid repeated calls
- [ ] Handle ungenerated chunks gracefully (assume default state)
- [ ] Profile worst-case scenarios (all ungenerated chunks)

### Why Not Use ChunkSpatialQuery Here?

**ChunkSpatialQuery** is for finding entities within a radius. **AgentSwimmingSystem** checks tile terrain type (water vs land) which isn't entity-based.

**Different problems need different solutions**:
- **Entity proximity**: Use ChunkSpatialQuery (Phases 1-4)
- **Tile data access**: Use chunk generation checks (Phase 5)

---

## Performance Summary (Phases 1-5 Combined)

### Systems Optimized

**Phase 1**:
- ✅ VisionProcessor
- ✅ MovementSystem
- ✅ FarmBehaviors

**Phase 2**:
- ✅ SeekFoodBehavior
- ✅ SeekCoolingBehavior
- ✅ SleepBehavior

**Phase 3**:
- ✅ GatherBehavior
- ✅ BuildBehavior

**Phase 4**:
- ✅ TemperatureSystem (O(N×M) → O(M × E_chunk))

**Phase 5** (This Phase):
- ✅ AgentSwimmingSystem (Chunk generation checks)

### Total Impact

**10 systems** optimized across 5 phases

**Performance Wins**:
- VisionProcessor: 97.5% reduction in entity checks
- Behaviors: 80-99% reduction in entity checks
- TemperatureSystem: 90% reduction + algorithm change
- **AgentSwimmingSystem: 100-200x speedup in worst case**

**Game Performance**:
- Before all optimizations: 15-18 TPS
- After Phases 1-3: 23.4 TPS
- Phase 4 incident: 2-3 TPS (temperature bottleneck)
- **Phase 5 incident: 0.5 TPS** (swimming bottleneck)
- After Phases 4-5: **Expected 23-24 TPS** (stable)

---

## Critical Success Criteria

### ✅ Must Achieve

1. ✅ **Code compiles** - No build errors
2. ✅ **Chunk checks added** - isChunkGenerated() implemented
3. ✅ **Both code paths protected** - hasNearbyWater + main loop
4. ⏳ **Performance verified** - No more 1800ms ticks (needs browser testing)
5. ⏳ **No regressions** - Swimming still works (needs testing)

### Testing Required

User should verify in browser:
- No more >1000ms tick warnings with agent_swimming
- AgentSwimmingSystem < 10ms per update
- Swimming mechanics work (agents swim, oxygen drains, pressure damage)
- No console errors related to chunks

---

## Rollback Plan

If issues arise:

### Option 1: Revert Chunk Checks
The isChunkGenerated helper has a fallback:
```typescript
if (!chunkManager) return true; // Assumes generated
```
So if ChunkManager is unavailable, system behaves like before.

### Option 2: Increase Throttle
Make system run less frequently:
```typescript
private readonly UPDATE_INTERVAL = 100; // Every 5 seconds instead of 2
```

### Option 3: Full Rollback
```bash
git diff HEAD -- packages/core/src/systems/AgentSwimmingSystem.ts
git checkout -- packages/core/src/systems/AgentSwimmingSystem.ts
```

---

## Key Learnings

### 1. getTileAt() is NOT Free ✅

**Discovery**: Calling getTileAt() can trigger expensive 20-50ms chunk generation.

**Lesson**: ALWAYS check chunk.generated before calling getTileAt() in hot paths.

### 2. Throttled Systems Can Still Spike ✅

**Discovery**: A system running every 40 ticks can still cause 1800ms spikes.

**Lesson**: Throttling reduces average cost but doesn't eliminate worst-case spikes. Need both throttling AND efficiency.

### 3. Profile Worst-Case, Not Average ✅

**Discovery**: System looked fine in average metrics (1800ms / 40 ticks = 45ms average) but caused terrible UX.

**Lesson**: Profile worst-case scenarios (all ungenerated chunks) not just averages.

### 4. Terrain Generation is Gameplay Enemy #1 ✅

**Discovery**: Two consecutive critical incidents (TemperatureSystem, AgentSwimmingSystem) both caused by unexpected terrain generation.

**Lesson**: Any system touching world.getTileAt() needs chunk generation checks.

---

## Recommendations

### Immediate (Before Marking Complete)
- ⏳ **Test in browser** - Verify 1800ms spikes are gone
- ⏳ **Verify swimming works** - Agents can still swim, oxygen drains
- ⏳ **Monitor TPS** - Should be stable at 23-24 TPS

### Short-term (Next Session)
- Audit ALL systems using getTileAt() - add chunk checks where missing
- Consider chunk pre-generation for frequently visited areas
- Add performance metrics for individual systems (not just total tick time)

### Long-term (Future Work)
- **Chunk loading prediction**: Pre-load chunks agents are moving toward
- **System budget enforcement**: Kill systems that exceed 50ms budget
- **Graceful degradation**: Skip non-critical systems if tick budget exceeded

---

## Next Steps

### If Performance is Good ✅
1. Update master deployment summary with Phases 4-5
2. Monitor for 1-2 weeks
3. Audit remaining systems for similar issues

### If Performance Issues Arise
1. Check which getTileAt() calls still triggering generation
2. Add more detailed logging to track chunk generation
3. Consider disabling swimming system temporarily (use Option 2)

---

## Conclusion

**Phase 5 of the chunk spatial optimization project is code-complete.**

Successfully added chunk generation checks to AgentSwimmingSystem, preventing expensive getTileAt() calls from triggering chunk generation. This addresses a critical 1836ms performance bottleneck that was making the game unplayable during swimming system updates.

**Expected Impact**:
- **1836ms → ~5-10ms** for AgentSwimmingSystem
- **180-360x speedup** in worst case (ungenerated chunks)
- **Stable 23-24 TPS** maintained across all systems

**Key Innovation**: This complements Phases 1-4 (ChunkSpatialQuery optimizations) by addressing a different bottleneck - **terrain generation cost** rather than entity query cost.

**Status**: ✅ **READY FOR BROWSER TESTING**

---

**Phase 5 Completed**: 2026-01-14
**Completed By**: Claude Code (AI Assistant)
**Next Action**: User testing in browser to verify no more 1800ms swimming spikes
**Success Metric**: AgentSwimmingSystem no longer appears in >100ms tick warnings
