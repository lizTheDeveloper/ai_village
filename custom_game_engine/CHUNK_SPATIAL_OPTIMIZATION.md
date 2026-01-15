# Chunk-Based Spatial Optimization Design

## Executive Summary

This document describes the **chunk-based spatial query system** that integrates with existing performance layers to optimize distance calculations.

**Multi-Layered Performance Architecture**:

```
Layer 1: SimulationScheduler (entity culling)
         ↓ Filters 4,260 entities → ~120 active
Layer 2: System Throttling (temporal culling)
         ↓ Updates every N ticks instead of every tick
Layer 3: ChunkSpatialQuery (spatial indexing) ← NEW
         ↓ Filters ~120 active → ~10-20 relevant
Layer 4: StateMutatorSystem (batched updates)
         ↓ Applies changes once per game minute
```

**Key Architectural Decisions**:
1. ✅ **Reuse CHUNK_SIZE = 32** (same as terrain sectors)
2. ✅ **Only index ALWAYS/PROXIMITY entities** (not PASSIVE)
3. ✅ **PASSIVE entities use SpatialMemory** (not distance scans)
4. ✅ **Throttled cache updates** (every 1 second, not every tick)
5. ✅ **Lazy invalidation** (mark dirty, rebuild on query)

**Expected Performance Impact**:
- Distance calculations: 100× reduction (Math.sqrt calls)
- Entity iteration: 10× reduction (chunk filtering on top of scheduler)
- Memory overhead: Minimal (only indexes ~100 active entities)

## Problem Statement

Current distance calculations in the game engine are inefficient:

1. **Global queries**: Systems query ALL entities globally, then filter by distance
2. **O(N) complexity**: Every perception/targeting operation iterates all entities
3. **Redundant Math.sqrt**: Distance calculations use expensive sqrt operations
4. **No spatial indexing**: No data structure to quickly find entities in an area

Example from VisionProcessor.ts:269:
```typescript
const resources = world.query().with(ComponentType.Resource).with(ComponentType.Position).executeEntities();
for (const resource of resources) {
  const distance = Math.sqrt(dx * dx + dy * dy); // Expensive!
  if (distance <= closeRange) { ... }
}
```

With 1000 entities and 50 agents, this results in 50,000 distance calculations per tick (20 TPS = 1M/second).

## Existing Caching & Scheduling Layers

The game already has several performance optimization systems:

### 1. SimulationScheduler (Entity Culling)
**Location**: `packages/core/src/ecs/SimulationScheduler.ts`

Filters entities by simulation mode:
- **ALWAYS**: Agents, buildings, deities (~20 entities)
- **PROXIMITY**: Plants, animals (only within 15 tiles of agents ~100 entities)
- **PASSIVE**: Resources, items (zero per-tick cost ~3,500 entities)

**Impact**: 97% entity reduction (120 active vs 4,260 total)

### 2. StateMutatorSystem (Batched Updates)
**Location**: `packages/core/src/systems/StateMutatorSystem.ts`

Applies gradual changes (needs decay, damage over time) once per game minute instead of every tick.

**Impact**: 60× performance improvement for state mutations

### 3. TerrainDescriptionCache (Sector Caching)
**Location**: `packages/world/src/terrain/TerrainDescriptionCache.ts`

Caches terrain feature analysis per **32×32 sector** with 5-minute TTL.

**Impact**: Terrain analysis only happens once per sector, not per agent

### 4. System Throttling
**Pattern**: `if (world.tick - lastUpdate < UPDATE_INTERVAL) return;`

Systems run at appropriate intervals (Weather: 5s, AutoSave: 5min, etc.)

**Impact**: Non-critical systems don't waste CPU every tick

## Solution Architecture

### Integration with Existing Systems

The chunk spatial query system **complements** these layers:

```
SimulationScheduler (filters to ~120 active entities)
         ↓
ChunkSpatialQuery (spatial filtering within active entities)
         ↓
System logic (only processes relevant nearby entities)
```

### Three-Tier Spatial Query System

#### 1. Chunk-Level Filtering (Broad Phase)
- Use **Chebyshev distance** (max(|dx|, |dy|)) at chunk granularity
- Filter chunks within N chunk radius
- **Reuses CHUNK_SIZE = 32** (same as terrain sectors for cache coherency)
- Eliminates ~90% of active entities before detailed checks

#### 2. Tile-Level Squared Distance (Narrow Phase)
- Use **squared Euclidean distance** (dx² + dy²) for comparisons
- Only for entities in relevant chunks
- Avoids sqrt until final result needed

#### 3. Tile-Level Exact Distance (Final)
- Use Math.sqrt only when actual distance value needed
- For display, pathfinding costs, etc.

### System Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Game Tick                                │
│                     (20 TPS, 50ms)                              │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                  SimulationScheduler                            │
│  Filters entities by mode (ALWAYS/PROXIMITY/PASSIVE)           │
│  Input: 4,260 total entities                                   │
│  Output: ~120 active entities (agents, buildings, visible)     │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
                    ┌────────┴────────┐
                    ↓                 ↓
      ┌─────────────────────┐   ┌──────────────────┐
      │  System Throttling  │   │ ChunkSpatialQuery│ ← NEW
      │  (temporal filter)  │   │ (spatial filter) │
      │  5s, 1min, 5min     │   │  Chunk-based     │
      └──────────┬──────────┘   └────────┬─────────┘
                 ↓                        ↓
                 └────────────┬───────────┘
                              ↓
                  ┌───────────────────────┐
                  │   System Logic        │
                  │  (VisionProcessor,    │
                  │   behaviors, etc)     │
                  └───────────────────────┘
```

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                      ChunkSpatialQuery                      │
│  High-level API for spatial queries                        │
│  - getEntitiesInRadius(x, y, radius, filter?)               │
│  - getEntitiesInChunkRadius(chunkX, chunkY, radius, filter?)│
│  - getNearestEntity(x, y, filter?)                          │
│                                                              │
│  Integrates with SimulationScheduler:                       │
│  - Only queries ALWAYS/PROXIMITY entities                   │
│  - Respects proximity range (15 tiles)                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        ChunkCache                           │
│  Per-chunk entity indexes (32×32 tiles)                     │
│  - entityIndex: Map<ComponentType, Set<EntityId>>           │
│  - stats: { agentCount, buildingCount, plantCount }         │
│  - simulationModes: { always, proximity, passive }          │
│  - dirty: boolean (lazy invalidation)                       │
│                                                              │
│  Cache population rules:                                    │
│  - ALWAYS entities: Always indexed (agents, buildings)      │
│  - PROXIMITY entities: Only when on-screen (plants, animals)│
│  - PASSIVE entities: NOT INDEXED (resources, items)         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  ChunkLoadingSystem                         │
│  Maintains chunk cache integrity (throttled 1s)            │
│  - onEntityMove(entity, oldChunk, newChunk)                 │
│  - onEntityAdd(entity, chunk)                               │
│  - onEntityRemove(entity, chunk)                            │
│  - rebuildDirtyChunks() (every 20 ticks)                    │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. ChunkCache Interface

**Location**: `packages/world/src/chunks/ChunkCache.ts` (extends existing Chunk.ts)

```typescript
interface ChunkCache {
  /** Chunk coordinates */
  chunkX: number;
  chunkY: number;

  /** Entity indexes by component type (ALWAYS + PROXIMITY entities only) */
  entityIndex: Map<ComponentType, Set<EntityId>>;

  /** Aggregated statistics (updated on invalidation) */
  stats: {
    totalEntities: number;
    resourceCount: number;      // PASSIVE - not in entity loops
    plantCount: number;          // PROXIMITY - only when visible
    agentCount: number;          // ALWAYS
    buildingCount: number;       // ALWAYS
  };

  /** Cache invalidation flag */
  dirty: boolean;

  /** Last update tick */
  lastUpdate: number;

  /** Simulation mode counts for debugging */
  simulationModes: {
    always: number;    // Always simulate (agents, buildings)
    proximity: number; // Only when on-screen (plants, animals)
    passive: number;   // Never simulate (resources, items)
  };
}
```

### 2. ChunkSpatialQuery API

```typescript
class ChunkSpatialQuery {
  constructor(private world: World, private chunkManager: ChunkManager) {}

  /**
   * Get entities within tile radius using chunk-based filtering.
   *
   * @param x - Center X in world coordinates
   * @param y - Center Y in world coordinates
   * @param radius - Search radius in tiles
   * @param filter - Optional component filter
   * @returns Array of {entity, distance, distanceSq}
   */
  getEntitiesInRadius(
    x: number,
    y: number,
    radius: number,
    filter?: ComponentType[]
  ): Array<{entity: Entity, distance: number, distanceSq: number}>;

  /**
   * Get entities in chunk radius (fast, no sqrt).
   *
   * @param chunkX - Chunk X coordinate
   * @param chunkY - Chunk Y coordinate
   * @param chunkRadius - Radius in chunks (Chebyshev distance)
   * @param filter - Optional component filter
   * @returns Array of entity IDs
   */
  getEntitiesInChunkRadius(
    chunkX: number,
    chunkY: number,
    chunkRadius: number,
    filter?: ComponentType[]
  ): EntityId[];

  /**
   * Find nearest entity matching filter.
   * Uses chunk-based broad phase, then precise distance.
   */
  getNearestEntity(
    x: number,
    y: number,
    filter: ComponentType[]
  ): {entity: Entity, distance: number} | null;
}
```

### 3. Distance Calculation Utilities

```typescript
/**
 * Distance utilities for chunk-based queries.
 * Located in packages/core/src/utils/distance.ts
 */

/** Chebyshev distance (chunk-level filtering) */
function chunkDistance(chunkX1: number, chunkY1: number, chunkX2: number, chunkY2: number): number {
  return Math.max(Math.abs(chunkX2 - chunkX1), Math.abs(chunkY2 - chunkY1));
}

/** Squared Euclidean distance (tile-level comparisons) */
function distanceSquared(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

/** Euclidean distance (only when exact value needed) */
function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(distanceSquared(x1, y1, x2, y2));
}

/** Check if position is within radius (no sqrt) */
function isWithinRadius(x: number, y: number, targetX: number, targetY: number, radius: number): boolean {
  return distanceSquared(x, y, targetX, targetY) <= radius * radius;
}
```

## Integration with Existing Systems

### 1. SimulationScheduler Integration

**Key Insight**: Chunk cache only needs to index **ALWAYS** and **PROXIMITY** entities.

PASSIVE entities (resources, items) should NOT be in distance calculation loops at all - they're event-driven only.

```typescript
class ChunkSpatialQuery {
  getEntitiesInRadius(x: number, y: number, radius: number, filter?: ComponentType[]) {
    // Step 1: Get entities from chunk cache
    const chunkEntities = this.getChunkEntities(x, y, radius);

    // Step 2: Filter by simulation mode (should already be filtered by cache)
    const activeEntities = world.simulationScheduler.filterActiveEntities(
      chunkEntities,
      world.tick
    );

    // Step 3: Calculate distances only for active entities
    // ...
  }
}
```

**Cache Population Strategy**:
- ALWAYS entities → Always in chunk index
- PROXIMITY entities → In chunk index when within render distance
- PASSIVE entities → **NOT in chunk index** (event-driven only)

### 2. TerrainDescriptionCache Alignment

**Use same 32-tile sector size** for cache coherency:
- `CHUNK_SIZE = 32` (already defined in Chunk.ts)
- `SECTOR_SIZE = 32` (already defined in TerrainDescriptionCache.ts)

This ensures:
- Same memory access patterns
- Same cache invalidation granularity
- Terrain features and entity queries use same spatial grid

### 3. StateMutatorSystem Synergy

StateMutatorSystem batches state changes (needs, health) to run once per game minute.

ChunkSpatialQuery **reduces the need for distance checks** in those batched updates:

**Before**:
```typescript
// In NeedsSystem - runs every game minute
for (const agent of agents) {
  // Find food sources - O(N) global query
  const food = world.query().with(CT.Resource).executeEntities()
    .filter(r => distance(agent, r) < 50);
}
```

**After**:
```typescript
// In NeedsSystem - runs every game minute
for (const agent of agents) {
  // Find food sources - O(log N) chunk query
  const food = chunkQuery.getEntitiesInRadius(
    agent.x, agent.y, 50,
    [CT.Resource] // Will be empty! Resources are PASSIVE
  );
}
```

**Wait, that's wrong!** Resources are PASSIVE - they shouldn't be in distance loops.

**Correct approach**:
- Agents remember resource locations in SpatialMemory
- When agent needs food, query memory for known resource locations
- Only do distance check to cached locations, not global scan

### 4. System Throttling Patterns

Chunk cache updates respect system throttling:

```typescript
class ChunkLoadingSystem {
  private CACHE_UPDATE_INTERVAL = 20; // Every 1 second (20 ticks)

  update(world: World): void {
    if (world.tick - this.lastCacheUpdate < this.CACHE_UPDATE_INTERVAL) {
      return; // Don't rebuild cache every tick
    }

    // Rebuild dirty chunk caches
    for (const chunk of this.getDirtyChunks()) {
      this.rebuildChunkCache(chunk, world);
    }

    this.lastCacheUpdate = world.tick;
  }
}
```

## Integration Points

### 1. ChunkLoadingSystem
- Maintains chunk caches as chunks load/unload
- Rebuilds cache when dirty flag set
- Updates indexes on entity movement
- **Only indexes ALWAYS and PROXIMITY entities**
- Respects throttling (updates every 1 second, not every tick)

### 2. VisionProcessor
**Before**:
```typescript
const resources = world.query().with(ComponentType.Resource).executeEntities();
for (const resource of resources) {
  const distance = Math.sqrt(dx*dx + dy*dy);
  if (distance <= areaRange) { ... }
}
```

**After**:
```typescript
const results = chunkQuery.getEntitiesInRadius(
  position.x, position.y, areaRange,
  [ComponentType.Resource, ComponentType.Position]
);
for (const {entity, distance, distanceSq} of results) {
  if (distance <= closeRange) { ... }
  else if (distance <= areaRange) { ... }
}
```

### 3. Targeting Behaviors
All behaviors that find targets (GatherBehavior, SeekFoodBehavior, FleeBehavior, etc.) use chunk queries.

### 4. Perception System
Agent perception queries chunks for cached entity descriptions:
```typescript
interface ChunkPerceptionCache {
  /** Pre-generated description of chunk contents */
  description: string;

  /** Entity summaries by type */
  resources: Array<{id: string, type: string, amount: number}>;
  plants: Array<{id: string, species: string, stage: string}>;
  agents: Array<{id: string, name: string}>;

  /** Cached at tick */
  cachedAt: number;
}
```

Agents query nearby chunks and get pre-computed summaries instead of iterating entities.

## Performance Benefits

### Chunk-Based Filtering
- **Current**: Query 1000 entities globally → O(N)
- **New**: Query 9 chunks (3x3) with ~11 entities each → O(C × E_c) where E_c ≪ N
- **Speedup**: ~10x reduction in entity iterations

### Squared Distance Comparisons
- **Current**: 1M Math.sqrt calls/second (50 agents × 1000 entities × 20 TPS)
- **New**: ~10K Math.sqrt calls/second (only for entities in relevant chunks)
- **Speedup**: ~100x reduction in sqrt operations

### Chunk Cache Hits
- **Perception queries**: Pre-computed descriptions, no iteration
- **Targeting queries**: Indexed by component type, instant lookup
- **Stats queries**: Aggregated counts, no entity iteration

### Expected Overall Improvement
- **Perception**: 10-20x faster (chunk filtering + cached descriptions)
- **Targeting**: 5-10x faster (chunk filtering + squared distance)
- **Distance calculations**: 100x fewer sqrt operations

## Migration Strategy

### Phase 1: Infrastructure (1-2 sessions)
1. ✅ Design document (this file)
2. Implement ChunkCache interface
3. Implement distance utilities
4. Implement ChunkSpatialQuery API
5. Add cache maintenance to ChunkLoadingSystem

### Phase 2: Audit & Replace (2-3 sessions)
1. Audit all distance calculations (grep Math.sqrt, distance patterns)
2. Categorize by complexity: simple/medium/complex
3. Replace simple cases (direct distance checks)
4. Replace medium cases (nearest entity searches)
5. Replace complex cases (multi-criteria targeting)

### Phase 3: Perception Integration (1 session)
1. Add ChunkPerceptionCache
2. Update VisionProcessor to use chunk queries
3. Update HearingProcessor if needed
4. Benchmark before/after

### Phase 4: Behavior Integration (1-2 sessions)
1. Update GatherBehavior
2. Update SeekFoodBehavior, SeekWarmthBehavior, SeekCoolingBehavior
3. Update FleeBehavior, AnimalBehaviors
4. Update FarmBehaviors
5. Benchmark before/after

## Testing Strategy

### Unit Tests
- `ChunkCache.test.ts`: Index updates, invalidation
- `ChunkSpatialQuery.test.ts`: Radius queries, nearest entity
- `distance.test.ts`: Distance calculation correctness

### Integration Tests
- `ChunkSpatialQuery.integration.test.ts`: Full query pipeline
- `VisionProcessor.integration.test.ts`: Chunk-based vision
- `Performance.integration.test.ts`: Benchmark comparisons

### Benchmarks
```typescript
// Before/after comparison
describe('Spatial Query Performance', () => {
  it('Vision perception at 50 agents, 1000 entities', () => {
    // Measure: global query vs chunk query
    // Target: 10x speedup
  });

  it('Nearest resource search with 200 resources', () => {
    // Measure: linear search vs chunk query
    // Target: 5x speedup
  });
});
```

## Key Architectural Insights

### PASSIVE Entities Should NOT Use Distance Calculations

**Critical Insight**: The SimulationScheduler already solves the resource problem!

Resources are PASSIVE mode - they should **never** be in per-tick distance loops:

```typescript
// ❌ WRONG: Scanning all resources every frame
const nearbyFood = world.query().with(CT.Resource)
  .executeEntities()
  .filter(r => distance(agent, r) < range);

// ✅ CORRECT: Query spatial memory (agents remember where resources are)
const knownResources = agent.getComponent<SpatialMemory>(CT.SpatialMemory)
  .memories.filter(m => m.type === 'resource_location');

// Only check distance to KNOWN locations (10-20 items vs 3,500)
const nearbyFood = knownResources
  .filter(m => distanceSquared(agent, m) < range * range);
```

**Impact**:
- Before: 50 agents × 3,500 resources × 20 TPS = 3.5M distance checks/second
- After: 50 agents × 20 known resources = 1,000 checks (3,500× reduction!)

### When to Use ChunkSpatialQuery

**Good Use Cases** (ALWAYS/PROXIMITY entities):
1. **Agent perception**: Find nearby agents for social interaction
2. **Building queries**: Find buildings in area (crafting, shelter)
3. **Plant targeting**: Find harvestable plants (PROXIMITY mode, only visible)
4. **Animal targeting**: Find animals to hunt/tame (PROXIMITY mode)

**Bad Use Cases** (PASSIVE entities):
1. ❌ **Resource discovery**: Use SpatialMemory + known locations
2. ❌ **Item pickup**: Use SpatialMemory + last-known positions
3. ❌ **Inventory scans**: Never iterate inventories globally!

### Chunk Cache Contents

**What goes in the cache**:
- Agents (ALWAYS mode) - ~20 entities
- Buildings (ALWAYS mode) - ~10 entities
- Visible plants (PROXIMITY mode) - ~50 entities
- Visible animals (PROXIMITY mode) - ~20 entities

**Total**: ~100 entities per chunk cache update

**What does NOT go in cache**:
- Resources (PASSIVE) - Use SpatialMemory instead
- Items (PASSIVE) - Use ownership/container tracking
- Off-screen plants/animals (frozen by PROXIMITY mode)

## Open Questions

1. **Cache invalidation granularity**: Per-component or full cache?
   - **Recommendation**: Per-component (fine-grained, less rebuilding)

2. **Chunk radius for perception**: How many chunks to search?
   - **Recommendation**: Derive from vision range: `Math.ceil(visionRange / CHUNK_SIZE)`
   - Default vision range 50 tiles → 2 chunk radius (5×5 = 25 chunks)

3. **Entity movement frequency**: How often to rebuild caches?
   - **Recommendation**: Throttled lazy invalidation (every 1 second, or on-demand)

4. **Multi-threaded cache updates**: SharedWorker for cache maintenance?
   - **Recommendation**: Phase 2 optimization, after baseline implementation

5. **Integration with SpatialMemory**: Should memory queries use chunk cache?
   - **Recommendation**: No - memory is small (10-20 entries per agent), linear scan is fine

## Audit Greps

Comprehensive grep patterns to find all distance calculations and spatial queries:

### Distance Calculation Patterns
```bash
# 1. Math.sqrt (expensive distance calculations)
grep -r "Math\.sqrt" packages/core/src packages/botany/src --include="*.ts" | grep -v test | grep -v ".d.ts"

# 2. distance function calls
grep -r "distance\s*\(" packages/core/src packages/botany/src --include="*.ts" | grep -v test | grep -v ".d.ts"

# 3. distanceTo method calls
grep -r "\.distanceTo\s*\(" packages/core/src packages/botany/src --include="*.ts" | grep -v test | grep -v ".d.ts"

# 4. Euclidean distance pattern (dx*dx + dy*dy)
grep -r "dx\s*\*\s*dx.*dy\s*\*\s*dy" packages/core/src packages/botany/src --include="*.ts" | grep -v test

# 5. Squared distance comparisons
grep -r "distanceSquared\|distanceSq" packages/core/src packages/botany/src --include="*.ts" | grep -v test
```

### Global Query Patterns
```bash
# 6. world.query() calls (potential global scans)
grep -r "world\.query()" packages/core/src packages/botany/src --include="*.ts" | grep -v test | grep -v ".d.ts"

# 7. executeEntities() calls (query execution)
grep -r "\.executeEntities()" packages/core/src packages/botany/src --include="*.ts" | grep -v test | grep -v ".d.ts"

# 8. Filter by distance (common pattern)
grep -r "\.filter.*distance" packages/core/src packages/botany/src --include="*.ts" | grep -v test | grep -v ".d.ts"

# 9. Resource queries (should use SpatialMemory instead)
grep -r "ComponentType\.Resource\|CT\.Resource" packages/core/src --include="*.ts" | grep -v test | grep -v ".d.ts"

# 10. Position component queries
grep -r "ComponentType\.Position\|CT\.Position" packages/core/src --include="*.ts" | grep -v test | grep -v ".d.ts"
```

### Proximity/Range Patterns
```bash
# 11. Range checks (< radius, <= range, etc.)
grep -r "< range\|<= range\|< radius\|<= radius" packages/core/src packages/botany/src --include="*.ts" | grep -v test

# 12. Vision range queries
grep -r "visionRange\|vision\.range" packages/core/src --include="*.ts" | grep -v test

# 13. Hearing range queries
grep -r "hearingRange\|hearing\.range" packages/core/src --include="*.ts" | grep -v test

# 14. "nearby" variable names (likely doing proximity checks)
grep -r "nearby[A-Z]" packages/core/src packages/botany/src --include="*.ts" | grep -v test | grep -v ".d.ts"
```

### Loop Patterns (Nested Query Anti-patterns)
```bash
# 15. Query inside for loop (performance killer)
grep -B2 "world\.query()" packages/core/src --include="*.ts" | grep -v test | grep "for ("

# 16. Double loops with position (likely distance checks)
grep -A5 "for.*entities" packages/core/src --include="*.ts" | grep -v test | grep "for.*other"
```

## Audit Results

**Full audit report**: [DISTANCE_AUDIT.md](./DISTANCE_AUDIT.md)

### Summary

- **Total Math.sqrt occurrences**: 198 (excluding tests)
- **Source files with Math.sqrt**: 109
- **Global query calls**: 255 (excluding tests)

### Critical Findings

1. **VisionProcessor queries PASSIVE entities (resources)** 🚨
   - 50 agents × 3,500 resources × 20 TPS = 3.5M distance checks/second
   - **Fix**: Remove resource queries, use SpatialMemory instead

2. **FarmBehaviors query plants globally** 🚨
   - Multiple global queries per farmer per tick
   - **Fix**: Use SpatialMemory for farm plots + VisionComponent.nearbyPlants

3. **Duplicate work in Actions** 🚨
   - Actions re-query entities already provided by VisionProcessor
   - **Fix**: Use vision data instead of re-querying

### Categories

- **Category 1**: Global Query + Distance Filter (HIGHEST PRIORITY) - 12 files
- **Category 2**: Vision Already Filtered (needs sqrt optimization) - 4 files
- **Category 3**: SpatialMemory Iteration (good pattern, minor optimization) - 1 file
- **Category 4**: Movement/Steering (correct usage, keep as-is) - 3 files
- **Category 5**: Perception (CRITICAL refactor needed) - 4 files
- **Category 6**: Decision Processors (medium priority) - 4 files
- **Category 7**: Utility/Analysis (low priority, non-gameplay) - ~91 files

### Performance Impact Estimate

**Current**: ~15-25ms per tick for perception distance calculations

**After Phase 1 (Critical)**: ~2-3ms per tick (8-10× speedup)

**After All Phases**: ~3-4ms total for all spatial operations (10-15× speedup)

## Next Steps

1. ✅ Review and approve design
2. ✅ Document audit grep patterns
3. 🔄 Run audit greps and categorize findings
4. Create ChunkCache interface and types
5. Implement distance utilities
6. Implement ChunkSpatialQuery
7. Begin refactoring based on audit
