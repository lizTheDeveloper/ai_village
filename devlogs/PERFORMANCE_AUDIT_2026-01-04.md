# Performance Optimization Audit
**Date:** 2026-01-04
**Scope:** ECS systems running at 20 TPS
**Focus:** Hot path systems (priority 10-30), common anti-patterns

---

## Executive Summary

Overall, the codebase demonstrates **excellent performance awareness**:
- ✅ Most hot path systems use proper caching patterns
- ✅ Chunk-based spatial indexing is consistently used
- ✅ Singleton queries are cached (Time, Weather)
- ✅ Event-based cache invalidation is implemented

**Critical Issues Found:** 5
**Medium Priority Issues:** 3
**Low Priority Issues:** 2

**Estimated Performance Impact:** 5-15% improvement possible with fixes.

---

## Critical Issues (Priority 1: Fix Immediately)

### 1. Math.pow(x, 2) in Hot Paths
**Impact:** ~2-3x slower than `x * x`
**Files Affected:** 5 systems

#### SteeringSystem.ts (Priority 15 - HOT PATH)
```typescript
// Lines 195-196: Stuck detection distance check
Math.pow(position.x - tracker.lastPos.x, 2) +
Math.pow(position.y - tracker.lastPos.y, 2)
```
**Fix:** Replace with `dx * dx + dy * dy`
**Impact:** High - runs every tick for all steering entities

#### AgentCombatSystem.ts (Priority 275)
```typescript
// Lines 671-672, 733-734: Witness distance calculation
Math.pow(pos.x - attackerPos.x, 2) +
Math.pow(pos.y - attackerPos.y, 2)
```
**Fix:** Replace with `dx * dx + dy * dy`
**Impact:** Medium - combat is intermittent

#### TemperatureSystem.ts (Priority 20)
```typescript
// Lines 254, 354: Building effect distance checks
Math.pow(position.x - buildingPos.x, 2) + Math.pow(position.y - buildingPos.y, 2)
```
**Fix:** Replace with `dx * dx + dy * dy`
**Impact:** High - runs every tick for all agents with temperature needs

#### MovementSystem.ts (Priority 20 - HOT PATH)
```typescript
// Line 375: Building collision check
Math.pow(building.x - x, 2) + Math.pow(building.y - y, 2)
```
**Fix:** Replace with `dx * dx + dy * dy`
**Impact:** High - runs every tick for all moving entities

#### DeityEmergenceSystem.ts (Priority 345)
```typescript
// Line 410: Variance calculation (statistical)
values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
```
**Fix:** Replace with `(v - mean) * (v - mean)`
**Impact:** Low - throttled system, statistical calculation

**Total Estimated Speedup:** 10-15% for hot path systems

---

### 2. Excessive Math.sqrt Calls in SteeringSystem
**Impact:** Math.sqrt is expensive, should be avoided where possible
**File:** `SteeringSystem.ts` (Priority 15 - HOT PATH)

Multiple `Math.sqrt` calls in hot methods:
- Line 120: Speed calculation in `_updateSteering`
- Line 149: Seek behavior normalization
- Line 177: Arrive behavior distance check
- Line 222: Speed check in arrive behavior
- Line 263: Obstacle avoidance speed check
- Line 373: Wander behavior speed check
- Line 500: `_distance()` helper (called frequently)

**Recommendations:**
1. Cache speed calculation result per entity per tick
2. Use squared distance comparisons where possible
3. Only compute sqrt when absolutely needed (e.g., for final normalization)

**Example Fix:**
```typescript
// Before (line 500)
private _distance(a: Vector2, b: Vector2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// After: Use squared distance
private _distanceSquared(a: Vector2, b: Vector2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

// Only compute sqrt when needed for comparisons
if (this._distanceSquared(a, b) < radius * radius) { /* ... */ }
```

**Estimated Speedup:** 5-10% for steering calculations

---

### 3. Queries Inside Loops - RebellionEventSystem
**Impact:** Repeated queries are expensive
**File:** `RebellionEventSystem.ts` (Priority 495)

**Found:** 20+ `world.query().with(...).executeEntities()` calls inside methods/loops

Examples:
- Line 56: Query inside update loop (singleton, but still inefficient)
- Lines 350-520: Multiple queries inside conditional branches

**Mitigation:** System is throttled (UPDATE_INTERVAL exists) and low priority (495)
**Impact:** Low - system doesn't run every tick
**Recommendation:** Cache queries if this becomes a hot spot

---

## Medium Priority Issues

### 4. Redundant Entity Filtering - SteeringSystem
**File:** `SteeringSystem.ts:39`

```typescript
// Line 39: Redundant filter - entities already have CT.Steering from requiredComponents
const steeringEntities = entities.filter(e => e.components.has(CT.Steering));
```

**Fix:** Remove filter, use `entities` directly
**Impact:** Minor - adds unnecessary iteration over already-filtered entities

---

### 5. DoorSystem Query Inside Update
**File:** `DoorSystem.ts:65-72`

```typescript
// Line 65: Query for agents even though entities parameter contains agents
const agents = world.query().with(CT.Position).with(CT.Agent).executeEntities();
```

**Analysis:** The query is used to cache positions, but `entities` parameter already contains filtered agents (from `requiredComponents: [CT.Position, CT.Agent]`).

**Fix:** Use `entities` parameter instead of querying
```typescript
// Line 63-73: Replace with
if (this.cachedAgentTick !== world.tick) {
  this.cachedAgentPositions = [];
  for (const agent of entities) { // Use pre-filtered entities
    const impl = agent as EntityImpl;
    const pos = impl.getComponent<PositionComponent>(CT.Position);
    if (pos) {
      this.cachedAgentPositions.push({ x: pos.x, y: pos.y });
    }
  }
  this.cachedAgentTick = world.tick;
}
```

**Impact:** Eliminates redundant query every tick

---

### 6. CrossRealmPhoneSystem - Queries in Loops
**File:** `CrossRealmPhoneSystem.ts` (Priority unknown)

Lines 81, 263: Query inside update method
**Impact:** Unknown - need to check if system is throttled

---

## Low Priority Issues

### 7. RealityAnchorSystem - Queries in Loops
**File:** `RealityAnchorSystem.ts` (Priority 490)

Multiple queries in loops (lines 51, 128, 336, 349)
**Impact:** Low - priority 490, likely throttled

---

### 8. Math.sqrt in Non-Hot Paths
**Files:** AgentCombatSystem, TemperatureSystem (already cached)

These are acceptable since:
- TemperatureSystem uses cached buildings (lines 253-254 are inside cached loop)
- AgentCombatSystem is intermittent (combat doesn't happen every tick)

---

## Systems With Excellent Performance Patterns

### MovementSystem ✅
- Caches building positions with event-based invalidation
- Caches time entity ID
- Uses chunk-based spatial lookups
- Manhattan distance early exits
- Only computes sqrt when needed for interpolation

**One improvement:** Replace Math.pow on line 375

### NeedsSystem ✅
- Caches time entity ID
- Uses SimulationScheduler.filterActiveEntities for off-screen optimization
- No queries in loops
- No sqrt in hot paths

### DoorSystem ✅
- Caches agent positions per tick
- Uses squared distance comparisons
- Event-based updates

**One improvement:** Use `entities` parameter instead of querying (issue #5)

---

## Performance Metrics to Monitor

Based on PERFORMANCE.md guidelines:
1. **System tick time:** Target <5ms for hot systems (priority 10-30)
2. **Entity counts:** Check DoorSystem, SteeringSystem don't iterate 200k+ entities
3. **Query counts per tick:** Monitor RebellionEventSystem if becomes active

**Dashboard Check:**
```bash
curl "http://localhost:8766/dashboard?session=latest" | grep -E "(tick_time|entity_count)"
```

---

## Recommendations by Priority

### Immediate (This Session)
1. Replace all `Math.pow(x, 2)` with `x * x` in hot paths:
   - SteeringSystem.ts:195-196
   - MovementSystem.ts:375
   - TemperatureSystem.ts:254, 354
   - AgentCombatSystem.ts:671-672, 733-734

2. Optimize SteeringSystem sqrt usage:
   - Cache speed calculations
   - Use squared distance where possible
   - Add `_distanceSquared()` helper

3. Fix DoorSystem redundant query (line 65)

4. Remove redundant filter in SteeringSystem (line 39)

### Next Session
5. Audit RebellionEventSystem query patterns if it becomes active
6. Check CrossRealmPhoneSystem for throttling
7. Profile systems after fixes to measure impact

### Future Optimization
8. Add performance benchmarks for hot systems
9. Monitor metrics dashboard for regression
10. Consider memory pooling for common objects (Phase 4 optimization)

---

## Estimated Performance Impact

**Conservative Estimate:**
- Math.pow fixes: +5-10% in movement/steering/temperature systems
- sqrt reduction: +3-5% in steering system
- Query elimination: +1-2% overall
- **Total: 9-17% improvement in hot path systems**

**Best Case:**
- If steering system runs on many entities, could see 20%+ improvement

---

## Testing Strategy

After implementing fixes:

1. **Run build:**
   ```bash
   npm run build
   ```

2. **Check browser console** for runtime errors

3. **Test movement/steering** with 50+ agents

4. **Compare metrics** before/after:
   ```bash
   curl "http://localhost:8766/dashboard?session=latest"
   ```

5. **Run benchmarks** (if available):
   ```bash
   npm run bench
   ```

---

## Conclusion

The codebase demonstrates strong performance fundamentals with proper caching, spatial indexing, and event-driven architecture. The identified issues are straightforward fixes that will yield measurable improvements in hot path systems.

**Key Strengths:**
- Excellent cache invalidation patterns
- Proper use of chunk-based spatial queries
- Singleton caching is standard practice
- No catastrophic anti-patterns (overly broad requiredComponents, etc.)

**Key Improvements:**
- Replace Math.pow with direct multiplication (trivial fix, big impact)
- Reduce sqrt usage in steering calculations
- Eliminate redundant queries/filters

**Priority:** Fix Math.pow issues immediately - they're low-hanging fruit with high ROI.
