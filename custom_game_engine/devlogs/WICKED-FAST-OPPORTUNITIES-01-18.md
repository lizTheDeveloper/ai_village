# Wicked Fast Opportunities - Next-Level Performance Optimization

**Date**: 2026-01-18
**Phase**: Round 3 (Architectural Optimizations)
**Status**: 📋 Roadmap
**Estimated Total Impact**: 2-10x additional speedup

---

## Executive Summary

After 2 rounds of pattern-based optimizations (21 systems, 82% penetration, 10x TPS improvement), we've reached **optimization saturation** for individual systems.

**Next Phase**: Architectural and algorithmic improvements for 2-10x additional gains.

This document outlines the highest-impact opportunities, ranked by potential speedup and implementation effort.

---

## 🔥 Tier 1: Highest Impact (5-10x potential speedup)

### 1. World-Level Spatial Hashing

**Current State**: Every proximity query scans all entities
**Problem**: O(n) distance checks for every "getNearbyEntities" call
**Impact**: Used by 15+ systems, 100+ calls per tick

**Solution**: Grid-based spatial hashing

```typescript
class SpatialGrid {
  private grid = new Map<string, Set<EntityId>>();
  private cellSize = 10; // 10 tiles per cell

  // O(1) to get cell
  private getCellKey(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }

  // O(9) to check 3x3 grid instead of O(n) to check all entities
  getEntitiesNear(x: number, y: number, radius: number): Entity[] {
    const results: Entity[] = [];
    const cellRadius = Math.ceil(radius / this.cellSize);

    // Only check nearby cells (9 cells for radius 1)
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const key = this.getCellKey(x + dx * this.cellSize, y + dy * this.cellSize);
        const entityIds = this.grid.get(key);
        if (entityIds) {
          // Only check entities in nearby cells, not all 4000+
          for (const id of entityIds) {
            const entity = world.getEntity(id);
            // Distance check only on ~50 entities instead of 4000+
            if (distanceSquared(entity, x, y) < radiusSquared) {
              results.push(entity);
            }
          }
        }
      }
    }
    return results;
  }

  // Update entity's grid position when it moves
  updateEntity(entityId: string, oldX: number, oldY: number, newX: number, newY: number) {
    const oldKey = this.getCellKey(oldX, oldY);
    const newKey = this.getCellKey(newX, newY);

    if (oldKey !== newKey) {
      this.grid.get(oldKey)?.delete(entityId);
      if (!this.grid.has(newKey)) this.grid.set(newKey, new Set());
      this.grid.get(newKey)!.add(entityId);
    }
  }
}
```

**Implementation**:
- Add `SpatialGrid` to World
- Hook into MovementSystem to update grid on movement
- Replace all `getNearbyEntities` calls with grid-based lookup
- Invalidate grid cells when entities spawn/despawn

**Expected Speedup**:
- Proximity queries: **10-100x faster** (O(9) cells vs O(4000) entities)
- Systems affected: MovementSystem, PredatorAttackSystem, SocialGradientSystem, PerceptionSystem, etc.
- Overall: **3-5x TPS improvement** (proximity queries are everywhere)

**Effort**: Medium (2-3 hours implementation, 1 hour testing)

---

### 2. Universal Object Pooling

**Current State**: Creating millions of temporary objects per second
**Problem**: 2-5% of CPU time spent in GC despite 95% allocation reduction
**Impact**: Remaining 5% of allocations = millions of Position, Velocity objects

**Solution**: Object pools for hot-path allocations

```typescript
class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;

  constructor(factory: () => T, reset: (obj: T) => void, prealloc = 100) {
    this.factory = factory;
    this.reset = reset;
    for (let i = 0; i < prealloc; i++) {
      this.pool.push(factory());
    }
  }

  acquire(): T {
    return this.pool.pop() ?? this.factory();
  }

  release(obj: T): void {
    this.reset(obj);
    this.pool.push(obj);
  }
}

// Global pools
const positionPool = new ObjectPool(
  () => ({ x: 0, y: 0 }),
  (pos) => { pos.x = 0; pos.y = 0; },
  1000 // Pre-allocate 1000 positions
);

const velocityPool = new ObjectPool(
  () => ({ x: 0, y: 0, speed: 0 }),
  (vel) => { vel.x = 0; vel.y = 0; vel.speed = 0; },
  500
);

// Usage in systems
update(world: World) {
  const pos = positionPool.acquire(); // Zero allocation!
  pos.x = entity.x + velocity.x;
  pos.y = entity.y + velocity.y;

  // ... use pos ...

  positionPool.release(pos); // Return to pool
}
```

**Pools Needed**:
- Position objects (most common)
- Velocity objects
- Query result arrays
- Event data objects
- Distance calculation temporaries

**Expected Speedup**:
- GC pauses: **5-10x reduction** (eliminate remaining 5% allocations)
- Frame stability: **2-3x smoother** (no GC stutters)
- Overall: **1.2-1.5x TPS improvement** (GC overhead elimination)

**Effort**: Medium (3-4 hours implementation, 2 hours testing)

---

### 3. ECS Query Optimization

**Current State**: Query system builds new arrays on every query
**Problem**: `world.query().with(X).executeEntities()` creates new array each call
**Impact**: 50+ queries per tick = 50+ array allocations

**Solution**: Cached query results with invalidation

```typescript
class QueryCache {
  private cache = new Map<string, {
    results: Entity[];
    version: number;
  }>();
  private worldVersion = 0;

  // Increment version when entities change
  invalidate() {
    this.worldVersion++;
  }

  // Get cached results or recompute
  query(signature: string, executor: () => Entity[]): Entity[] {
    const cached = this.cache.get(signature);

    if (cached && cached.version === this.worldVersion) {
      return cached.results; // Cache hit!
    }

    // Cache miss - execute query
    const results = executor();
    this.cache.set(signature, {
      results,
      version: this.worldVersion
    });
    return results;
  }
}

// Usage
class World {
  private queryCache = new QueryCache();

  addEntity(entity: Entity) {
    this.entities.set(entity.id, entity);
    this.queryCache.invalidate(); // Invalidate cache
  }

  removeEntity(id: string) {
    this.entities.delete(id);
    this.queryCache.invalidate();
  }

  query() {
    return new QueryBuilder(this.queryCache, () => this.entities.values());
  }
}
```

**Expected Speedup**:
- Query execution: **10-50x faster** (cache hit = O(1) lookup)
- Cache hit rate: **90-95%** (entities don't change that often)
- Overall: **1.5-2x TPS improvement** (queries are everywhere)

**Effort**: Medium (2-3 hours implementation, 1 hour testing)

---

## 🚀 Tier 2: High Impact (2-5x potential speedup)

### 4. Event System Batching

**Current State**: Every event emitted individually
**Problem**: Event emission = Map lookups + array iteration per event
**Impact**: 200+ events per tick = 200+ emission overheads

**Solution**: Batch event emission

```typescript
class EventBatcher {
  private batch: GameEvent[] = [];
  private emitting = false;

  queue(event: GameEvent) {
    this.batch.push(event);

    if (!this.emitting) {
      this.emitting = true;
      queueMicrotask(() => this.flush());
    }
  }

  private flush() {
    const events = this.batch.slice();
    this.batch.length = 0;

    for (const event of events) {
      this.actualEmit(event);
    }

    this.emitting = false;
  }
}
```

**Expected Speedup**:
- Event emission: **3-5x faster** (batch overhead amortization)
- Overall: **1.1-1.3x TPS improvement**

**Effort**: Low (1-2 hours)

---

### 5. Component Data Optimization (SoA vs AoS)

**Current State**: Array of Structs (entities with components)
**Problem**: Poor cache locality when iterating single component type
**Impact**: Cache misses on every component access

**Solution**: Struct of Arrays for hot components

```typescript
// Current (AoS): Poor cache locality
class Entity {
  components = new Map<string, Component>();
  // Accessing position for 1000 entities = 1000 random memory accesses
}

// Optimized (SoA): Perfect cache locality
class PositionStore {
  private entityIds: string[] = [];
  private xs: Float32Array = new Float32Array(1000);
  private ys: Float32Array = new Float32Array(1000);

  // Sequential access = CPU cache loves this
  getAllPositions(): { ids: string[]; xs: Float32Array; ys: Float32Array } {
    return { ids: this.entityIds, xs: this.xs, ys: this.ys };
  }
}
```

**Expected Speedup**:
- Iteration: **2-4x faster** (cache locality + SIMD potential)
- Overall: **1.2-1.5x TPS improvement**

**Effort**: High (requires ECS refactor, 8-12 hours)

---

### 6. LLM Request Batching & Caching

**Current State**: One LLM request per agent decision
**Problem**: API overhead, rate limiting, latency
**Impact**: LLM is slowest part of agent cognition

**Solution**: Batch requests + aggressive caching

```typescript
class LLMBatcher {
  private pending: Array<{ prompt: string; callback: (response) => void }> = [];
  private batchInterval = 100; // Batch every 5 seconds

  request(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.pending.push({ prompt, callback: resolve });

      if (this.pending.length >= 10) {
        this.flush(); // Batch full - send immediately
      }
    });
  }

  private async flush() {
    if (this.pending.length === 0) return;

    const batch = this.pending.slice();
    this.pending.length = 0;

    // Send as single batched request
    const batchedPrompt = batch.map((r, i) =>
      `Request ${i}: ${r.prompt}`
    ).join('\n\n');

    const response = await llm.complete(batchedPrompt);

    // Parse batched response and resolve individual promises
    // ...
  }
}

// Prompt caching
class PromptCache {
  private cache = new Map<string, { response: string; timestamp: number }>();
  private maxAge = 300000; // 5 minutes

  async get(prompt: string): Promise<string | null> {
    const hash = this.hash(prompt);
    const cached = this.cache.get(hash);

    if (cached && Date.now() - cached.timestamp < this.maxAge) {
      return cached.response; // Cache hit!
    }

    return null;
  }
}
```

**Expected Speedup**:
- LLM throughput: **5-10x higher** (batching + caching)
- Decision latency: **2-3x faster** (cache hits)
- Overall: **1.3-2x TPS improvement** (if LLM-bound)

**Effort**: Medium (4-6 hours)

---

## 💡 Tier 3: Moderate Impact (1.2-2x potential speedup)

### 7. SIMD Math Operations

**Current State**: Scalar math operations
**Problem**: CPU doing 1 operation at a time
**Impact**: Distance calculations, physics, rendering

**Solution**: SIMD via Float32Array

```typescript
// Current: Scalar (1 op at a time)
for (let i = 0; i < 1000; i++) {
  distances[i] = Math.sqrt(dxs[i] * dxs[i] + dys[i] * dys[i]);
}

// SIMD: Vectorized (4-8 ops at a time)
const dxArray = new Float32Array(dxs);
const dyArray = new Float32Array(dys);
const distArray = new Float32Array(1000);

// CPU can auto-vectorize this loop (SIMD)
for (let i = 0; i < 1000; i++) {
  distArray[i] = Math.sqrt(dxArray[i] * dxArray[i] + dyArray[i] * dyArray[i]);
}
```

**Expected Speedup**:
- Bulk math: **2-4x faster** (SIMD parallelism)
- Overall: **1.1-1.3x TPS improvement**

**Effort**: Medium (2-4 hours)

---

### 8. WebAssembly for Hot Paths

**Current State**: TypeScript/JavaScript for everything
**Problem**: JIT overhead, dynamic typing
**Impact**: Critical hot paths

**Solution**: Compile hot paths to WebAssembly

```rust
// Rust code compiled to WASM
#[wasm_bindgen]
pub fn calculate_distances(
    xs1: &[f32], ys1: &[f32],
    xs2: &[f32], ys2: &[f32]
) -> Vec<f32> {
    xs1.iter().zip(ys1.iter())
       .zip(xs2.iter().zip(ys2.iter()))
       .map(|((x1, y1), (x2, y2))| {
           let dx = x2 - x1;
           let dy = y2 - y1;
           (dx * dx + dy * dy).sqrt()
       })
       .collect()
}
```

**Expected Speedup**:
- WASM hot paths: **2-5x faster** (compiled code)
- Overall: **1.2-1.5x TPS improvement**

**Effort**: High (requires Rust knowledge, 8-12 hours)

---

### 9. Worker Thread Optimization

**Current State**: Chunk generation uses workers
**Problem**: Main thread still doing heavy lifting
**Impact**: Pathfinding, terrain gen, AI could be offloaded

**Solution**: Aggressive worker offloading

```typescript
class WorkerPool {
  private workers: Worker[] = [];
  private taskQueue: Task[] = [];

  constructor(workerCount = 4) {
    for (let i = 0; i < workerCount; i++) {
      this.workers.push(new Worker('worker.js'));
    }
  }

  async execute<T>(task: Task): Promise<T> {
    // Find idle worker or queue
    const worker = this.getIdleWorker();
    return new Promise((resolve) => {
      worker.postMessage(task);
      worker.onmessage = (e) => resolve(e.data);
    });
  }
}

// Offload expensive tasks
const pathfindingPool = new WorkerPool(2);
const aiDecisionPool = new WorkerPool(2);
const terrainGenPool = new WorkerPool(2);
```

**Expected Speedup**:
- Main thread: **2-4x freed up** (offloaded work)
- Overall: **1.3-2x TPS improvement**

**Effort**: High (requires worker refactor, 6-10 hours)

---

### 10. Renderer Optimization (if applicable)

**Current State**: Canvas rendering every frame (60 FPS)
**Problem**: Redrawing everything even when nothing changed
**Impact**: 60 FPS render loop independent of 20 TPS simulation

**Solution**: Dirty rectangle rendering

```typescript
class Renderer {
  private dirtyRects: Rectangle[] = [];
  private previousFrame: ImageData;

  markDirty(x: number, y: number, width: number, height: number) {
    this.dirtyRects.push({ x, y, width, height });
  }

  render() {
    if (this.dirtyRects.length === 0) {
      return; // Nothing changed - skip frame!
    }

    // Only redraw dirty rectangles
    for (const rect of this.dirtyRects) {
      ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
      this.renderRect(rect);
    }

    this.dirtyRects.length = 0;
  }
}
```

**Additional Optimizations**:
- Sprite atlas (pre-render all sprites to single texture)
- Offscreen canvas (render static layers once)
- WebGL rendering (GPU acceleration)
- Layer compositing (separate static/dynamic)

**Expected Speedup**:
- Render time: **3-10x faster** (dirty rect + atlas)
- Frame stability: **2-3x smoother**
- Overall: **1.1-1.2x TPS improvement** (renderer overhead reduction)

**Effort**: Medium-High (4-8 hours)

---

## 📊 Impact Summary

### Expected Cumulative Speedup

Implementing all Tier 1 optimizations:

| Optimization | Individual Speedup | Cumulative TPS Impact |
|--------------|-------------------|----------------------|
| **Baseline (after Round 2)** | 1.0x | 18-20 TPS |
| + Spatial Hashing | 3-5x proximity queries | 25-30 TPS |
| + Object Pooling | 1.2-1.5x GC reduction | 30-40 TPS |
| + Query Optimization | 1.5-2x query speedup | 40-60 TPS |

**Expected Final TPS**: **40-60 TPS** (2-3x improvement over current 18-20 TPS)

Adding Tier 2:
- Event batching: +10%
- SoA conversion: +20%
- LLM batching: +30% (if LLM-bound)

**With Tier 2**: **50-80 TPS** possible

---

## 🎯 Recommended Implementation Order

### Phase 1: Foundation (Week 1)
1. ✅ Spatial Hashing (highest impact, enables others)
2. ✅ Object Pooling (infrastructure for future)
3. ✅ Query Caching (low-hanging fruit)

**Expected**: 2-3x TPS improvement (18-20 → 40-60 TPS)

### Phase 2: Refinement (Week 2)
4. Event Batching (polish)
5. LLM Batching (if LLM-bound)
6. SIMD Math (infrastructure)

**Expected**: +20-30% TPS improvement (40-60 → 50-80 TPS)

### Phase 3: Advanced (Week 3+)
7. SoA Conversion (requires refactor)
8. WebAssembly (requires Rust)
9. Worker Optimization (complex)
10. Renderer Polish (if needed)

**Expected**: +10-20% TPS improvement (50-80 → 60-100 TPS)

---

## 🚧 Implementation Considerations

### Complexity vs Impact

**Quick Wins** (high impact, low effort):
- Spatial Hashing: 3-5x speedup, 2-3 hours
- Query Caching: 1.5-2x speedup, 2-3 hours
- Event Batching: 1.1-1.3x speedup, 1-2 hours
- Object Pooling: 1.2-1.5x speedup, 3-4 hours

**Long-Term Investments** (high impact, high effort):
- SoA Conversion: 1.2-1.5x speedup, 8-12 hours (refactor)
- WebAssembly: 1.2-1.5x speedup, 8-12 hours (new tech)
- Worker Optimization: 1.3-2x speedup, 6-10 hours (complex)

### Risk Assessment

**Low Risk** (safe to implement):
- Spatial Hashing ✅
- Object Pooling ✅
- Query Caching ✅
- Event Batching ✅

**Medium Risk** (requires careful testing):
- SIMD Math (ensure correctness)
- LLM Batching (maintain behavior)
- Worker Optimization (thread safety)

**High Risk** (major refactor):
- SoA Conversion (changes core ECS)
- WebAssembly (new build pipeline)
- Renderer Overhaul (visual regression testing)

---

## 🧪 Testing Strategy

For each optimization:

### 1. Performance Benchmarks
```typescript
// Before/after comparison
const iterations = 10000;
const start = performance.now();
for (let i = 0; i < iterations; i++) {
  // Operation being optimized
}
const end = performance.now();
console.log(`Speedup: ${beforeTime / (end - start)}x`);
```

### 2. Correctness Testing
- Unit tests for all optimized code paths
- Integration tests for system interactions
- Regression tests for gameplay mechanics

### 3. Profiling
- Chrome DevTools Performance tab
- Custom profiling hooks
- Metrics dashboard monitoring

### 4. Stress Testing
- 1000+ entities
- 100+ simultaneous proximity queries
- Sustained 5+ minute sessions

---

## 💭 Architectural Philosophy

### Why These Optimizations?

**Pattern Application Saturated**:
- 82% of systems optimized with full pattern suites
- Remaining gains require architectural changes

**Algorithmic Improvements**:
- Spatial hashing: O(n) → O(1) proximity queries
- Object pooling: Eliminate GC entirely
- Query caching: Avoid redundant work

**Infrastructure Investments**:
- These optimizations benefit ALL future code
- One-time implementation, permanent gains
- Enables further optimizations down the line

---

## 🎯 Success Metrics

### Performance Goals

**Conservative** (Tier 1 only):
- TPS: 18-20 → 30-40 (2x improvement)
- GC pauses: <5ms → <1ms (5x reduction)
- Query time: 50% reduction
- Proximity queries: 90% reduction

**Ambitious** (Tier 1 + Tier 2):
- TPS: 18-20 → 50-80 (3-4x improvement)
- GC pauses: <1ms → negligible
- Frame stability: 95% of frames within 50ms
- 1000+ entities at 60 TPS sustained

**Moonshot** (All tiers):
- TPS: 18-20 → 80-100+ (5x improvement)
- Zero GC impact (object pools)
- WebAssembly hot paths (2-5x local speedups)
- Full worker offloading (CPU core utilization)

---

## 📝 Next Steps

### Immediate Actions

1. **Prioritize**: Choose 2-3 optimizations from Tier 1
2. **Prototype**: Build proof-of-concept for spatial hashing
3. **Benchmark**: Measure baseline performance
4. **Implement**: Spatial hashing → Object pooling → Query caching
5. **Test**: Comprehensive testing after each
6. **Document**: Create devlogs for each optimization
7. **Iterate**: Measure gains, identify next bottleneck

### Long-Term Roadmap

**Month 1**: Tier 1 optimizations (foundation)
**Month 2**: Tier 2 optimizations (refinement)
**Month 3**: Tier 3 optimizations (advanced)
**Month 4+**: Algorithmic innovations, new architectures

---

## 🎉 Conclusion

After reaching **optimization saturation** with pattern-based improvements (82% penetration, 10x TPS gain), we have **clear architectural paths to 2-10x additional speedup**.

**Highest Impact**:
1. **Spatial Hashing**: 3-5x TPS (proximity queries everywhere)
2. **Object Pooling**: 1.2-1.5x TPS (eliminate GC)
3. **Query Caching**: 1.5-2x TPS (queries everywhere)

**Combined Potential**: **40-60 TPS** from current 18-20 TPS

**Status**: Ready to implement - just need to prioritize and execute.

The game can be made **WICKED FAST** with these architectural improvements! 🚀⚡

---

**Document**: WICKED-FAST-OPPORTUNITIES-01-18.md
**Phase**: Round 3 Planning
**Estimated Impact**: 2-10x additional speedup
**Implementation Time**: 1-3 months (depending on scope)
**Risk Level**: Low (Tier 1), Medium (Tier 2), High (Tier 3)
**Ready to Execute**: ✅ Yes
