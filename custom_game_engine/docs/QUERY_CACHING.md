# Query Caching

> Utilities for caching expensive world.query() results to avoid performance degradation.

**Location**: `packages/core/src/ecs/CachedQuery.ts`

## The Problem

World queries are **O(n) operations** that scan entity storage. When called repeatedly, they cause severe performance issues:

### Query-in-Loop Anti-Pattern

```typescript
// CATASTROPHIC: Query executed 1000+ times per tick
export class BadSystem implements System {
  update(world: World, entities: ReadonlyArray<Entity>) {
    for (const entity of entities) {
      // This query runs ONCE PER ENTITY!
      const others = world.query().with(CT.Agent).executeEntities();
      for (const other of others) {
        // Compare with others
      }
    }
  }
}
```

**Result**: 1,000 entities × 20 TPS = **20,000 queries/second** instead of **20/second**.

### Duplicate Queries Per Tick

```typescript
export class SuboptimalSystem implements System {
  update(world: World, entities: ReadonlyArray<Entity>) {
    this.processPhase1(world);  // Query for agents
    this.processPhase2(world);  // Same query again
    this.processPhase3(world);  // Same query AGAIN
  }

  private processPhase1(world: World) {
    const agents = world.query().with(CT.Agent).executeEntities(); // Query #1
    // ...
  }

  private processPhase2(world: World) {
    const agents = world.query().with(CT.Agent).executeEntities(); // Query #2 (duplicate!)
    // ...
  }
}
```

**Result**: 3× query overhead when data doesn't change between phases.

## Solutions

The `CachedQuery` system provides three approaches based on use case.

## 1. CachedQuery Class (Instance-Based)

**Use for**: Single system needs same query multiple times.

Instance-based caching with fluent API. Each system maintains its own cache.

### Basic Usage

```typescript
import { CachedQuery } from '@ai-village/core';
import { CT } from '../types.js';

export class SpatialAwarenessSystem implements System {
  public readonly requiredComponents = [CT.Agent, CT.Position];

  // Cache instance - persists across ticks
  private nearbyAgentsCache = new CachedQuery<Entity>();

  update(world: World, entities: ReadonlyArray<Entity>) {
    // Query with caching - only executes once per 20 ticks
    const allAgents = this.nearbyAgentsCache
      .from(world)
      .with(CT.Agent, CT.Position)
      .ttl(20)  // Cache for 1 second (20 ticks)
      .execute();

    for (const entity of entities) {
      const pos = entity.getComponent(CT.Position);
      if (!pos) continue;

      // Use cached results - no repeated queries!
      const nearby = allAgents.filter(other => {
        const otherPos = other.getComponent(CT.Position);
        if (!otherPos) return false;
        const dx = pos.x - otherPos.x;
        const dy = pos.y - otherPos.y;
        return dx * dx + dy * dy < 100; // Within 10 tiles
      });

      // Process nearby agents
    }
  }
}
```

### API Reference

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `from(world)` | Set the world to query | `this` (chainable) |
| `with(...types)` | Component types to query for | `this` (chainable) |
| `ttl(ticks)` | Cache duration in ticks (default: 20) | `this` (chainable) |
| `execute()` | Run query, return cached if valid | `T[]` |
| `invalidate()` | Force cache refresh on next execute() | `void` |

#### Fluent API Pattern

All methods except `execute()` and `invalidate()` return `this` for chaining:

```typescript
private cache = new CachedQuery<Entity>();

// Chain configuration
const results = this.cache
  .from(world)
  .with(CT.Building, CT.Position)
  .ttl(100)
  .execute();
```

### Static Helper: `simple()`

One-liner for systems that don't need cache persistence:

```typescript
export class SimpleSystem implements System {
  update(world: World, entities: ReadonlyArray<Entity>) {
    // Fresh CachedQuery instance each call (still caches within TTL)
    const buildings = CachedQuery.simple(world, [CT.Building, CT.Position], 50);

    // Use buildings...
  }
}
```

**Note**: Creates new `CachedQuery` instance on each call. Cache persists via internal state, but less efficient than instance caching for repeated use.

## 2. QueryCache Class (Global Shared)

**Use for**: Multiple systems need identical query.

Global cache with string keys. All systems share the same cached results.

### When to Use

Multiple systems query for the same data:

```typescript
// SystemA, SystemB, SystemC all need "all agents"
// Without QueryCache: 3 separate queries per tick
// With QueryCache: 1 query shared across all 3 systems
```

### Usage Example

```typescript
import { QueryCache, CT } from '@ai-village/core';

export class SocialSystem implements System {
  update(world: World, entities: ReadonlyArray<Entity>) {
    // Shared global cache - other systems can use 'all_agents' key
    const agents = QueryCache.get(world, 'all_agents', [CT.Agent, CT.Position], 20);

    for (const entity of entities) {
      // Process with all agents
    }
  }
}

export class CommunicationSystem implements System {
  update(world: World, entities: ReadonlyArray<Entity>) {
    // Reuses same cache as SocialSystem - no duplicate query!
    const agents = QueryCache.get(world, 'all_agents', [CT.Agent, CT.Position], 20);

    for (const entity of entities) {
      // Process communications
    }
  }
}
```

### API Reference

| Method | Description | Parameters |
|--------|-------------|------------|
| `get(world, key, types, ttl)` | Get cached query or create new | `world`, cache `key` (string), component `types`, `ttl` ticks |
| `invalidate(key)` | Invalidate specific cache | Cache `key` |
| `invalidateAll()` | Invalidate all caches | None |
| `clear()` | Remove all cache instances | None |

### Cache Key Naming

Use descriptive keys that indicate what's cached:

```typescript
// GOOD: Descriptive, unique keys
QueryCache.get(world, 'all_agents', [CT.Agent], 20);
QueryCache.get(world, 'buildings_with_doors', [CT.Building, CT.Door], 50);
QueryCache.get(world, 'active_fires', [CT.Fire, CT.Active], 10);

// BAD: Generic, collision-prone keys
QueryCache.get(world, 'query1', [CT.Agent], 20);
QueryCache.get(world, 'cache', [CT.Building], 20);
```

## 3. Legacy CachedQuery (performance.ts)

**Location**: `packages/core/src/utils/performance.ts`

Older simpler implementation, still supported:

```typescript
import { CachedQuery } from '../utils/performance.js';

export class MySystem implements System {
  private agents = new CachedQuery('agent', 'position');

  update(world: World) {
    const agents = this.agents.get(world);
    // Query cached for current tick
  }
}
```

**Recommendation**: Use `ecs/CachedQuery.ts` for new code (more flexible TTL, fluent API).

## Choosing the Right Approach

| Scenario | Use | Why |
|----------|-----|-----|
| Single system, same query multiple times | `CachedQuery` instance | Isolated cache, automatic cleanup with system |
| Multiple systems need identical query | `QueryCache.get()` | Shared cache, 1 query instead of N |
| One-off convenience | `CachedQuery.simple()` | Quick caching without instance management |
| Query results change every tick | Don't cache | Cache overhead > query cost |
| Singleton entities (time, weather) | `SingletonCache` (performance.ts) | Faster ID-based lookup |

### Decision Tree

```
Do multiple systems need this query?
├─ YES → Use QueryCache.get() with shared key
└─ NO  → Does this system call query multiple times?
         ├─ YES → Use CachedQuery instance
         └─ NO  → Does it need multi-tick caching?
                  ├─ YES → Use CachedQuery instance with TTL
                  └─ NO  → Just query directly (no cache overhead)
```

## TTL Guidelines

Time-to-live (TTL) determines how long cached results remain valid.

| TTL (ticks) | Duration | Use For | Example |
|-------------|----------|---------|---------|
| 1 | 50ms | Extremely dynamic data | Combat state, projectile positions |
| 10 | 500ms | Rapidly changing data | Agent velocities, active skills |
| 20 | 1 second | **DEFAULT** - Most queries | Agent positions, building states |
| 60 | 3 seconds | Slow-changing data | Inventory contents, relationships |
| 100 | 5 seconds | Semi-static data | Terrain features, plant growth |
| 200 | 10 seconds | Near-static data | Building layouts, chunk data |

### TTL Trade-offs

**Shorter TTL (1-10 ticks)**:
- More accurate (fresher data)
- Higher query frequency
- Better for rapidly changing state

**Longer TTL (100-200 ticks)**:
- Less accurate (stale data risk)
- Lower query frequency (better performance)
- Better for static/slow data

### Finding the Right TTL

```typescript
// Start with default (20 ticks = 1 second)
private cache = new CachedQuery<Entity>().ttl(20);

// If data changes rapidly and causes bugs → reduce TTL
private cache = new CachedQuery<Entity>().ttl(10);

// If data is static and query is expensive → increase TTL
private cache = new CachedQuery<Entity>().ttl(100);
```

**Rule of thumb**: Use default (20) unless profiling or bugs indicate otherwise.

## Cache Invalidation

### Automatic Invalidation

Cache automatically invalidates after TTL expires:

```typescript
// Tick 1000: Cache miss, query executes
const result1 = cache.from(world).with(CT.Agent).ttl(20).execute();

// Tick 1005: Cache hit (within TTL)
const result2 = cache.from(world).with(CT.Agent).ttl(20).execute();

// Tick 1021: Cache miss (TTL expired), query executes
const result3 = cache.from(world).with(CT.Agent).ttl(20).execute();
```

### Manual Invalidation

Force cache refresh when you know data changed:

```typescript
export class BuildingSystem implements System {
  private buildingCache = new CachedQuery<Entity>();

  update(world: World, entities: ReadonlyArray<Entity>) {
    const buildings = this.buildingCache
      .from(world)
      .with(CT.Building)
      .ttl(100)
      .execute();

    for (const entity of entities) {
      if (this.shouldDestroyBuilding(entity)) {
        world.removeEntity(entity.id);
        // Invalidate cache since building count changed
        this.buildingCache.invalidate();
      }
    }
  }
}
```

### When to Manually Invalidate

| Event | Invalidate? | Why |
|-------|-------------|-----|
| Entity creation | Yes | Query results changed |
| Entity deletion | Yes | Query results changed |
| Component added matching query | Yes | New entities match filter |
| Component removed matching query | Yes | Entities no longer match |
| Component data changed | No (usually) | Same entities, different data |
| World tick increment | No | Automatic via TTL |

### Global Cache Invalidation

```typescript
// Invalidate specific cache across all systems
QueryCache.invalidate('all_agents');

// Invalidate all QueryCache caches (major state change)
QueryCache.invalidateAll();

// Remove all caches entirely (game restart)
QueryCache.clear();
```

**Use cases for global invalidation**:
- Loading saved game
- Switching universes
- Major world restructuring
- Testing/debugging

## Performance Impact

### Benchmarks

Real-world system with 1,000 agents, 20 TPS:

| Approach | Queries/Tick | Queries/Second | Improvement |
|----------|--------------|----------------|-------------|
| No cache (query in loop) | 1,000 | 20,000 | Baseline (BAD) |
| No cache (query before loop) | 1 | 20 | 1000× faster |
| CachedQuery (TTL=20) | 0.05 (1 per 20 ticks) | 1 | 20,000× faster |
| QueryCache (shared) | 0.05 (shared across systems) | 1 | 20,000× faster + sharing |

### Memory Considerations

Each `CachedQuery` instance stores:
- Cached array of entities/components (~8 bytes × N entities)
- Configuration (~64 bytes)

**Example**: 100 agents cached = ~800 bytes + 64 bytes = **~1 KB per cache**

**Typical game**: 10-20 cached queries = **10-20 KB** total (negligible).

### When Caching Hurts Performance

**DON'T cache if**:
1. Query called once per tick → no benefit, just overhead
2. Results change every tick → cache always misses
3. Very small entity sets (<5 entities) → query faster than cache lookup

```typescript
// BAD: Cache overhead > query cost
private doorCache = new CachedQuery<Entity>();

update(world: World) {
  // Only 2-3 doors in world, querying directly is faster
  const doors = this.doorCache.from(world).with(CT.Door).execute();
}

// GOOD: Just query directly
update(world: World) {
  const doors = world.query().with(CT.Door).executeEntities();
}
```

## Common Patterns

### Pattern 1: Singleton Entity Cache

Cache single global entities (time, weather, settings):

```typescript
import { SingletonCache } from '../utils/performance.js';

export class NeedsSystem implements System {
  private timeEntity = new SingletonCache('time');

  update(world: World, entities: ReadonlyArray<Entity>) {
    const time = this.timeEntity.get(world);
    if (!time) return;

    const timeData = time.getComponent(CT.Time);
    const isDaytime = timeData && timeData.hour >= 6 && timeData.hour < 20;

    for (const entity of entities) {
      // Use time data
    }
  }
}
```

**Why `SingletonCache`**: Uses entity ID lookup after first query (faster than component filtering).

### Pattern 2: Spatial Query Cache

Cache "all entities in world" once, filter spatially per-entity:

```typescript
export class ProximitySystem implements System {
  private allEntitiesCache = new CachedQuery<Entity>();

  update(world: World, entities: ReadonlyArray<Entity>) {
    // Query once, cache for 20 ticks
    const allEntities = this.allEntitiesCache
      .from(world)
      .with(CT.Position)
      .ttl(20)
      .execute();

    for (const entity of entities) {
      const pos = entity.getComponent(CT.Position);
      if (!pos) continue;

      // Filter cached results by distance (cheap array iteration)
      const nearby = allEntities.filter(other => {
        const otherPos = other.getComponent(CT.Position);
        if (!otherPos || other.id === entity.id) return false;

        const dx = pos.x - otherPos.x;
        const dy = pos.y - otherPos.y;
        return dx * dx + dy * dy < 25; // Within 5 tiles
      });

      // Process nearby entities
    }
  }
}
```

**Optimization**: For large worlds, combine with chunk-based spatial indexing.

### Pattern 3: Cross-System Shared Cache

Multiple systems share same query via `QueryCache`:

```typescript
// systems/SocialInteractionSystem.ts
export class SocialInteractionSystem implements System {
  update(world: World, entities: ReadonlyArray<Entity>) {
    const allAgents = QueryCache.get(world, 'all_agents', [CT.Agent, CT.Position], 20);
    // Process social interactions
  }
}

// systems/CommunicationSystem.ts
export class CommunicationSystem implements System {
  update(world: World, entities: ReadonlyArray<Entity>) {
    // Same cache key = shared results (no duplicate query!)
    const allAgents = QueryCache.get(world, 'all_agents', [CT.Agent, CT.Position], 20);
    // Process communications
  }
}

// systems/ObservationSystem.ts
export class ObservationSystem implements System {
  update(world: World, entities: ReadonlyArray<Entity>) {
    // Still the same cache!
    const allAgents = QueryCache.get(world, 'all_agents', [CT.Agent, CT.Position], 20);
    // Process observations
  }
}
```

**Result**: 3 systems × 20 TPS = 60 queries/second → **1 query/second** (60× improvement).

### Pattern 4: Event-Based Invalidation

Invalidate cache when specific events occur:

```typescript
export class BuildingManagementSystem implements System {
  private buildingCache = new CachedQuery<Entity>();

  initialize(_world: World, eventBus: EventBus) {
    // Invalidate when buildings change
    eventBus.subscribe('building:constructed', () => {
      this.buildingCache.invalidate();
    });
    eventBus.subscribe('building:destroyed', () => {
      this.buildingCache.invalidate();
    });
  }

  update(world: World, entities: ReadonlyArray<Entity>) {
    // Long TTL since we invalidate on events
    const buildings = this.buildingCache
      .from(world)
      .with(CT.Building)
      .ttl(200) // 10 seconds - only refreshes on invalidate()
      .execute();

    // Process buildings
  }
}
```

**Benefit**: Combines long TTL (performance) with accuracy (event invalidation).

### Pattern 5: Multi-Phase Processing

Same query used across multiple processing phases:

```typescript
export class CombatSystem implements System {
  private combatantCache = new CachedQuery<Entity>();

  update(world: World, entities: ReadonlyArray<Entity>) {
    // Cache query for all phases
    const combatants = this.combatantCache
      .from(world)
      .with(CT.Combatant, CT.Health, CT.Position)
      .ttl(1) // Combat changes rapidly
      .execute();

    this.detectTargets(world, combatants);
    this.calculateDamage(world, combatants);
    this.applyEffects(world, combatants);
  }

  private detectTargets(world: World, combatants: Entity[]) {
    // Use cached combatants
  }

  private calculateDamage(world: World, combatants: Entity[]) {
    // Use same cache
  }

  private applyEffects(world: World, combatants: Entity[]) {
    // Still same cache
  }
}
```

**Alternative** (pass cached results):

```typescript
update(world: World, entities: ReadonlyArray<Entity>) {
  const combatants = this.combatantCache
    .from(world)
    .with(CT.Combatant, CT.Health, CT.Position)
    .execute();

  this.detectTargets(combatants);
  this.calculateDamage(combatants);
  this.applyEffects(combatants);
}

private detectTargets(combatants: Entity[]) {
  // Direct parameter - no world needed
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Caching Then Filtering

```typescript
// BAD: Cache broad query, filter to specific
private entityCache = new CachedQuery<Entity>();

update(world: World) {
  const allEntities = this.entityCache
    .from(world)
    .with(CT.Position) // 200,000+ entities!
    .execute();

  // Filter down to agents (should have queried for this!)
  const agents = allEntities.filter(e => e.hasComponent(CT.Agent));
}

// GOOD: Cache specific query
private agentCache = new CachedQuery<Entity>();

update(world: World) {
  const agents = this.agentCache
    .from(world)
    .with(CT.Agent, CT.Position) // Only ~100 agents
    .execute();
}
```

### Anti-Pattern 2: Different TTLs Same Key

```typescript
// BAD: Same key, different TTLs = confusing behavior
export class SystemA implements System {
  update(world: World) {
    const agents = QueryCache.get(world, 'agents', [CT.Agent], 20); // TTL 20
  }
}

export class SystemB implements System {
  update(world: World) {
    const agents = QueryCache.get(world, 'agents', [CT.Agent], 100); // TTL 100 (conflict!)
  }
}

// GOOD: Same key = same configuration
export class SystemA implements System {
  update(world: World) {
    const agents = QueryCache.get(world, 'agents', [CT.Agent], 20);
  }
}

export class SystemB implements System {
  update(world: World) {
    const agents = QueryCache.get(world, 'agents', [CT.Agent], 20); // Consistent!
  }
}
```

### Anti-Pattern 3: Caching Inside Loops

```typescript
// CATASTROPHIC: Cache created/queried per iteration
update(world: World, entities: ReadonlyArray<Entity>) {
  for (const entity of entities) {
    // New cache instance every iteration!
    const cache = new CachedQuery<Entity>();
    const others = cache.from(world).with(CT.Agent).execute();
  }
}

// GOOD: Cache as class member
private otherAgentsCache = new CachedQuery<Entity>();

update(world: World, entities: ReadonlyArray<Entity>) {
  // Cache outside loop
  const others = this.otherAgentsCache
    .from(world)
    .with(CT.Agent)
    .execute();

  for (const entity of entities) {
    // Use cached results
  }
}
```

### Anti-Pattern 4: Over-Invalidation

```typescript
// BAD: Invalidate on every component update
update(world: World, entities: ReadonlyArray<Entity>) {
  for (const entity of entities) {
    entity.updateComponent(CT.Position, pos => ({
      ...pos,
      x: pos.x + 1
    }));

    // Cache still has same entities, just different data!
    this.agentCache.invalidate(); // UNNECESSARY
  }
}

// GOOD: Only invalidate when entities added/removed
update(world: World, entities: ReadonlyArray<Entity>) {
  for (const entity of entities) {
    if (shouldDespawn(entity)) {
      world.removeEntity(entity.id);
      this.agentCache.invalidate(); // Necessary (entity count changed)
    }
  }
}
```

### Anti-Pattern 5: Infinite TTL

```typescript
// BAD: Cache never expires (stale data risk)
private cache = new CachedQuery<Entity>();

update(world: World) {
  const agents = this.cache
    .from(world)
    .with(CT.Agent)
    .ttl(Infinity) // NEVER invalidates!
    .execute();
}

// GOOD: Use long TTL + event invalidation
private cache = new CachedQuery<Entity>();

initialize(_world: World, eventBus: EventBus) {
  eventBus.subscribe('agent:spawned', () => this.cache.invalidate());
  eventBus.subscribe('agent:despawned', () => this.cache.invalidate());
}

update(world: World) {
  const agents = this.cache
    .from(world)
    .with(CT.Agent)
    .ttl(200) // Long but finite
    .execute();
}
```

## Troubleshooting

### Problem: Stale Data

**Symptoms**: Cache returns outdated results, bugs in logic.

**Causes**:
1. TTL too long for rate of change
2. Missing invalidation after entity changes

**Solutions**:
```typescript
// Reduce TTL
.ttl(10) // instead of .ttl(100)

// Add manual invalidation
if (entityCountChanged) {
  this.cache.invalidate();
}

// Use event-based invalidation
eventBus.subscribe('relevant:event', () => this.cache.invalidate());
```

### Problem: No Performance Improvement

**Symptoms**: Adding cache doesn't improve FPS/TPS.

**Causes**:
1. Query only called once per tick (no benefit)
2. Cache misses every time (TTL too short or data changes too fast)
3. Query result set too small (query faster than cache)

**Diagnosis**:
```typescript
private queryCount = 0;
private cacheHits = 0;

update(world: World) {
  const agents = this.cache.from(world).with(CT.Agent).execute();

  this.queryCount++;
  if (/* cache was hit */) this.cacheHits++;

  if (world.tick % 100 === 0) {
    console.log(`Hit rate: ${this.cacheHits / this.queryCount}`);
    // Low hit rate (<0.5) = cache not effective
  }
}
```

### Problem: Memory Leak

**Symptoms**: Memory grows over time.

**Causes**:
1. `QueryCache.get()` with dynamic keys (new cache per key)
2. CachedQuery instances never cleaned up

**Solutions**:
```typescript
// BAD: Dynamic keys create unbounded caches
for (const type of entityTypes) {
  QueryCache.get(world, `entities_${type}`, [type], 20); // New cache per type!
}

// GOOD: Fixed set of known keys
const knownCaches = ['agents', 'buildings', 'items'];
for (const key of knownCaches) {
  QueryCache.get(world, key, [...], 20);
}

// Clear caches on major transitions
QueryCache.clear(); // Remove all caches
```

### Problem: Cache Invalidation Race Condition

**Symptoms**: One system invalidates, another gets stale data.

**Cause**: System execution order vs invalidation timing.

**Solution**:
```typescript
// Ensure consistent system ordering in SYSTEMS_CATALOG.md
// System that modifies entities should run BEFORE systems that read

// ModificationSystem (priority: 100)
update(world: World) {
  // Modify entities
  QueryCache.invalidate('all_agents');
}

// ReadSystem (priority: 150) - runs AFTER ModificationSystem
update(world: World) {
  const agents = QueryCache.get(world, 'all_agents', [CT.Agent], 20);
  // Gets fresh data (cache was invalidated by ModificationSystem)
}
```

### Problem: "Must call from() first" Error

**Cause**: Forgot to chain `.from(world)` before `.execute()`.

**Solution**:
```typescript
// BAD
const results = cache.with(CT.Agent).execute(); // Error!

// GOOD
const results = cache.from(world).with(CT.Agent).execute();
```

### Problem: Shared Cache Has Wrong Components

**Cause**: Different systems using same key with different component filters.

**Solution**:
```typescript
// BAD: Same key, different filters
QueryCache.get(world, 'agents', [CT.Agent], 20);
QueryCache.get(world, 'agents', [CT.Agent, CT.Position], 20); // Different filter!

// GOOD: Different keys for different filters
QueryCache.get(world, 'agents', [CT.Agent], 20);
QueryCache.get(world, 'agents_with_position', [CT.Agent, CT.Position], 20);
```

## Related Documentation

- **[PERFORMANCE.md](../PERFORMANCE.md)** - General performance optimization patterns
- **[NEW_SYSTEM_CHECKLIST.md](../NEW_SYSTEM_CHECKLIST.md)** - System creation guidelines
- **[SCHEDULER_GUIDE.md](../SCHEDULER_GUIDE.md)** - System priority and execution order
- **[SIMULATION_SCHEDULER.md](../packages/core/src/ecs/SIMULATION_SCHEDULER.md)** - Entity culling for proximity-based updates

## Summary

### Quick Reference

```typescript
// Instance cache (single system)
private cache = new CachedQuery<Entity>();
const results = this.cache.from(world).with(CT.Agent).ttl(20).execute();

// Global cache (multiple systems)
const results = QueryCache.get(world, 'cache_key', [CT.Agent], 20);

// One-liner
const results = CachedQuery.simple(world, [CT.Agent], 20);

// Invalidation
this.cache.invalidate(); // Instance
QueryCache.invalidate('cache_key'); // Global specific
QueryCache.invalidateAll(); // Global all
```

### Key Takeaways

1. **Always cache queries called multiple times** - Prevents query-in-loop anti-pattern
2. **Use appropriate TTL** - Default 20 ticks (1s) for most cases
3. **Share caches when possible** - `QueryCache.get()` for cross-system queries
4. **Invalidate on structural changes** - Entity add/remove, not data updates
5. **Measure effectiveness** - Low cache hit rate = remove cache
6. **Be specific with queries** - Cache narrow queries, not broad + filter
