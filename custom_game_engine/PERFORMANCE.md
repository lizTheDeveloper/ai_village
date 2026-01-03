# Performance Optimization Guide

> **For AI Agents**: This document provides automated checks and patterns for writing high-performance code.

## 🔥 Hot Path Identification

### Systems Run Every Tick (Highest Priority)
Systems without throttling run **20 times per second** at default speed. These are critical hot paths:

```typescript
// ❌ BAD: No UPDATE_INTERVAL means runs every tick
export class MySystem implements System {
  update(world: World, entities: ReadonlyArray<Entity>) {
    // This code runs 20 times/second!
  }
}

// ✅ GOOD: Throttle non-critical updates
export class MySystem implements System {
  private readonly UPDATE_INTERVAL = 60; // Once per second
  private lastUpdate = 0;

  update(world: World, entities: ReadonlyArray<Entity>) {
    if (world.tick - this.lastUpdate < this.UPDATE_INTERVAL) return;
    this.lastUpdate = world.tick;
    // ... update logic
  }
}
```

### Current Hot Path Systems
Check before adding expensive operations to these systems:
- `MovementSystem` (priority 20) - Every moving entity, every tick
- `SteeringSystem` (priority 15) - Every steering entity, every tick
- `NeedsSystem` (priority 15) - Every active entity, every tick
- `DoorSystem` (priority 19) - Every positioned entity, every tick
- `GameLoop` - All system iteration, every tick

## 📊 Performance Anti-Patterns

### 1. Repeated Queries

```typescript
// ❌ BAD: Query on every call
private someMethod(world: World) {
  const agents = world.query().with('agent').executeEntities(); // Expensive!
  // ... use agents
}

// ✅ GOOD: Cache and invalidate
private agentCache: Entity[] | null = null;
private cacheTick = -1;

private someMethod(world: World) {
  if (this.cacheTick !== world.tick) {
    this.agentCache = world.query().with('agent').executeEntities();
    this.cacheTick = world.tick;
  }
  return this.agentCache;
}

// ✅ BETTER: Event-based invalidation for long-lived caches
initialize(_world: World, eventBus: EventBus) {
  eventBus.subscribe('agent:spawned', () => { this.agentCache = null; });
  eventBus.subscribe('agent:despawned', () => { this.agentCache = null; });
}
```

### 2. Expensive Math Operations

```typescript
// ❌ BAD: Math.sqrt in hot path
for (const entity of entities) {
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < radius) { /* ... */ }
}

// ✅ GOOD: Compare squared distances
const radiusSquared = radius * radius;
for (const entity of entities) {
  const distanceSquared = dx * dx + dy * dy;
  if (distanceSquared < radiusSquared) { /* ... */ }
}

// ❌ BAD: Math.pow for squaring
const distSquared = Math.pow(dx, 2) + Math.pow(dy, 2);

// ✅ GOOD: Direct multiplication
const distSquared = dx * dx + dy * dy;
```

### 3. Array Allocations in Loops

```typescript
// ❌ BAD: New array every iteration
for (const entity of entities) {
  const nearby = Array.from(world.entities.values());
  // ... process nearby
}

// ✅ GOOD: Iterate directly
for (const entity of entities) {
  for (const other of world.entities.values()) {
    // ... process
  }
}

// ✅ BETTER: Use spatial indexing
const chunk = world.getEntitiesInChunk(chunkX, chunkY);
```

### 4. Unnecessary Object Spreads

```typescript
// ⚠️ OK in update functions (required for immutability)
entity.updateComponent(CT.Position, (current) => ({
  ...current,
  x: newX,
  y: newY,
}));

// ❌ BAD: Object spread in hot loop
for (const entity of entities) {
  const data = { ...entity.components, ...extraData }; // Expensive!
}

// ✅ GOOD: Only spread when necessary
const data = entity.components;
if (needsExtraData) {
  data = { ...data, ...extraData };
}
```

### 5. String Operations in Hot Paths

```typescript
// ❌ BAD: String concat in loop
for (const entity of entities) {
  const key = entity.id + "," + world.tick; // Creates new string
}

// ✅ GOOD: Use template literals (slightly faster) or avoid
for (const entity of entities) {
  const key = `${entity.id},${world.tick}`;
}

// ✅ BETTER: Avoid string concat entirely
this.cache.set(entity, world.tick); // Use Map with object keys
```

### 6. Component Cloning

```typescript
// ⚠️ Current pattern (required but expensive)
entity.updateComponent(CT.Needs, (current) => {
  const updated = current.clone(); // Deep clone with body parts!
  updated.hunger = newHunger;
  return updated;
});

// 🔮 FUTURE: Optimize clone for common case
clone(): NeedsComponent {
  // Fast path: no body parts
  if (!this.bodyParts) {
    return new NeedsComponent({ ...this });
  }
  // Slow path: deep clone body parts
  const cloned = new NeedsComponent({ ...this });
  cloned.bodyParts = this.bodyParts.map(part => ({
    ...part,
    injuries: part.injuries.map(injury => ({ ...injury })),
  }));
  return cloned;
}
```

## 🛠️ Performance Helpers

### Cached Query Pattern

```typescript
import { CachedQuery } from '../utils/performance.js';

export class MySystem implements System {
  private agents = new CachedQuery('agent', 'position');

  update(world: World) {
    // Automatically caches and invalidates
    const agents = this.agents.get(world);
  }
}
```

### Distance Helpers

```typescript
import { distanceSquared, isWithinRadius } from '../utils/performance.js';

// Avoid Math.sqrt
const distSq = distanceSquared(pos1, pos2);
if (isWithinRadius(pos1, pos2, 5)) { /* ... */ }
```

## 📈 Performance Benchmarking

### Add Benchmarks for Hot Paths

```typescript
// packages/core/src/__benchmarks__/system-performance.bench.ts
import { bench } from 'vitest';

bench('MovementSystem.update with 100 entities', () => {
  const system = new MovementSystem();
  system.update(worldWith100Entities, entities, 0.05);
});
```

### Run Benchmarks

```bash
npm run bench           # Run all benchmarks
npm run bench:watch     # Watch mode
npm run bench:compare   # Compare to baseline
```

## 🎯 Quick Checklist for Code Review

Before merging system code, verify:

- [ ] No `world.query()` calls inside loops
- [ ] Distance comparisons use squared distance
- [ ] No `Math.pow(x, 2)` (use `x * x`)
- [ ] Queries cached if called multiple times per tick
- [ ] System has `UPDATE_INTERVAL` if not critical
- [ ] No `Array.from()` when direct iteration works
- [ ] No object spreads in tight loops
- [ ] Component access grouped (get components once)

## 🔍 Performance Profiling

### Browser DevTools

```typescript
// Add performance marks
performance.mark('mySystem-start');
myExpensiveOperation();
performance.mark('mySystem-end');
performance.measure('mySystem', 'mySystem-start', 'mySystem-end');
```

### Metrics Dashboard

The game includes a metrics dashboard at `http://localhost:8766/`:

```bash
# Check system performance
curl "http://localhost:8766/dashboard?session=latest"

# Look for:
# - System tick times > 5ms (slow)
# - High entity counts in hot systems
# - LLM success rate < 100%
```

## 🚀 Optimization Priority Guide

### Priority 1: Critical (Fix Immediately)
- Queries in every-tick systems
- Math.sqrt in entity loops
- Array allocations in hot paths

### Priority 2: High (Fix Soon)
- Repeated queries in same method
- Object spreads in loops
- Unnecessary string operations

### Priority 3: Medium (Optimize When Scaling)
- Component cloning optimizations
- Cache hit rate improvements
- Memory pooling for common objects

### Priority 4: Low (Premature Optimization)
- Micro-optimizations (unless proven bottleneck)
- Readability vs performance (favor readability)
- Over-caching (adds complexity)

## 📚 Performance Patterns Reference

### Pattern: Singleton Entity Cache

For entities like time, weather, that are singletons:

```typescript
private timeEntityId: string | null = null;

private getTimeEntity(world: World): Entity | null {
  if (!this.timeEntityId) {
    const timeEntities = world.query().with(CT.Time).executeEntities();
    if (timeEntities.length > 0) {
      this.timeEntityId = timeEntities[0]!.id;
    }
  }

  if (this.timeEntityId) {
    const entity = world.getEntity(this.timeEntityId);
    if (!entity) {
      this.timeEntityId = null; // Entity was destroyed
    }
    return entity;
  }

  return null;
}
```

### Pattern: Tick-Based Cache

For data that changes every tick:

```typescript
private cache: SomeData | null = null;
private cacheValidUntilTick = 0;

private getCached(world: World): SomeData {
  if (!this.cache || world.tick >= this.cacheValidUntilTick) {
    this.cache = this.computeExpensiveData(world);
    this.cacheValidUntilTick = world.tick + CACHE_DURATION;
  }
  return this.cache;
}
```

### Pattern: Event-Based Invalidation

For long-lived caches:

```typescript
initialize(_world: World, eventBus: EventBus) {
  eventBus.subscribe('building:complete', () => {
    this.buildingCache = null;
  });
  eventBus.subscribe('building:destroyed', () => {
    this.buildingCache = null;
  });
}
```

## 🎓 Learning Resources

### Profiling Tools
- Chrome DevTools Performance tab
- `console.time()` / `console.timeEnd()`
- Game metrics dashboard

### Key Metrics to Track
- System tick time (target: <5ms for hot systems)
- Entity count per system
- Query count per tick
- Memory allocations per frame

---

**Remember**: "Premature optimization is the root of all evil" - Donald Knuth

Only optimize code that:
1. Runs frequently (hot paths)
2. Has measured performance impact
3. Doesn't sacrifice code clarity significantly

For everything else, write clear, maintainable code first.
