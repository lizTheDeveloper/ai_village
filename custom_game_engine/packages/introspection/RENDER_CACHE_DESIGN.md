# Scheduler-Based Render Cache Design

## Problem

Components are re-rendered every frame (60 FPS) even though most systems only update every N ticks (20 TPS). This wastes CPU cycles rendering identical data.

**Example:**
- `NeedsSystem` runs every 5 ticks (4x/second)
- But `NeedsComponent` is rendered 60x/second
- 56 renders are wasted showing identical data

## Solution

Use the scheduler to cache rendered components until their next update tick.

## Architecture

### 1. Render Cache with Scheduler Integration

```typescript
// packages/introspection/src/cache/RenderCache.ts

interface CachedRender {
  componentType: string;
  entityId: string;
  renderedOutput: any;  // Cached render (DOM, canvas, string, etc.)
  lastUpdateTick: number;
  nextUpdateTick: number;
  invalidated: boolean;
}

export class SchedulerRenderCache {
  private cache = new Map<string, CachedRender>();
  private scheduler: Scheduler;
  private currentTick: number = 0;

  constructor(scheduler: Scheduler) {
    this.scheduler = scheduler;
  }

  /**
   * Get cached render or mark as needing re-render.
   * Returns null if cache is invalid (component needs re-rendering).
   */
  get(entityId: string, componentType: string): any | null {
    const key = `${entityId}:${componentType}`;
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Check if we've passed the next update tick
    if (this.currentTick >= cached.nextUpdateTick) {
      cached.invalidated = true;
      return null;
    }

    // Check if manually invalidated (mutation outside scheduler)
    if (cached.invalidated) {
      return null;
    }

    return cached.renderedOutput;
  }

  /**
   * Store rendered output and calculate next invalidation tick.
   */
  set(
    entityId: string,
    componentType: string,
    renderedOutput: any,
    currentTick: number
  ): void {
    // Ask scheduler when this component will next update
    const updateInterval = this.scheduler.getComponentUpdateInterval(componentType);
    const nextUpdateTick = currentTick + updateInterval;

    this.cache.set(`${entityId}:${componentType}`, {
      componentType,
      entityId,
      renderedOutput,
      lastUpdateTick: currentTick,
      nextUpdateTick,
      invalidated: false,
    });
  }

  /**
   * Manually invalidate cache (for mutations outside scheduler).
   */
  invalidate(entityId: string, componentType: string): void {
    const key = `${entityId}:${componentType}`;
    const cached = this.cache.get(key);
    if (cached) {
      cached.invalidated = true;
    }
  }

  /**
   * Called every tick to update current tick counter.
   */
  onTick(tick: number): void {
    this.currentTick = tick;
  }

  /**
   * Clear all cached renders (e.g., on world reset).
   */
  clear(): void {
    this.cache.clear();
  }
}
```

### 2. Scheduler Extension

```typescript
// packages/core/src/ecs/Scheduler.ts

export class Scheduler {
  // ... existing code ...

  /**
   * Get update interval for a component type.
   * Returns number of ticks between updates.
   */
  getComponentUpdateInterval(componentType: string): number {
    // Find which system updates this component
    for (const [system, schedule] of this.schedules.entries()) {
      if (system.requiredComponents.includes(componentType)) {
        return schedule.interval;
      }
    }

    // Default: assume updates every tick if system not found
    return 1;
  }

  /**
   * Get all systems that update a component type.
   * Returns minimum interval (most frequent update).
   */
  getComponentUpdateFrequency(componentType: string): number {
    let minInterval = Infinity;

    for (const [system, schedule] of this.schedules.entries()) {
      if (system.requiredComponents.includes(componentType)) {
        minInterval = Math.min(minInterval, schedule.interval);
      }
    }

    return minInterval === Infinity ? 1 : minInterval;
  }
}
```

### 3. Renderer Integration

```typescript
// packages/introspection/src/renderers/CachedDevRenderer.ts

export class CachedDevRenderer {
  private renderCache: SchedulerRenderCache;

  constructor(scheduler: Scheduler) {
    this.renderCache = new SchedulerRenderCache(scheduler);
  }

  renderComponent(entity: Entity, componentType: string, tick: number): HTMLElement {
    // Check cache first
    const cached = this.renderCache.get(entity.id, componentType);
    if (cached) {
      return cached;  // Return cached DOM element
    }

    // Cache miss - render component
    const component = entity.getComponent(componentType);
    const schema = ComponentRegistry.get(componentType);
    const rendered = this.renderFromSchema(component, schema);

    // Store in cache
    this.renderCache.set(entity.id, componentType, rendered, tick);

    return rendered;
  }

  private renderFromSchema(component: Component, schema: ComponentSchema): HTMLElement {
    // ... existing rendering logic using schema ...
  }
}
```

### 4. Mutation Integration

When components are mutated outside the scheduler (e.g., player input, events), invalidate the cache:

```typescript
// packages/introspection/src/mutation/MutationService.ts

export class MutationService {
  private renderCache?: SchedulerRenderCache;

  setRenderCache(cache: SchedulerRenderCache): void {
    this.renderCache = cache;
  }

  mutate(entityId: string, componentType: string, mutations: any): void {
    // Apply mutation
    const entity = this.world.getEntity(entityId);
    const component = entity.getComponent(componentType);
    Object.assign(component, mutations);

    // Invalidate render cache
    this.renderCache?.invalidate(entityId, componentType);

    // Emit event
    this.emit('component:mutated', { entityId, componentType, mutations });
  }
}
```

## Performance Gains

### Without Cache
- 60 FPS × 100 entities × 10 components = 60,000 renders/second
- Most are redundant (component unchanged)

### With Cache
- Only re-render when component actually updates
- Example: NeedsSystem updates every 5 ticks (4x/second)
  - Old: 60 renders/second per entity
  - New: 4 renders/second per entity
  - **93% reduction**

### Cache Hit Rates by System

| System | Update Interval | Renders/sec (old) | Renders/sec (new) | Reduction |
|--------|----------------|-------------------|-------------------|-----------|
| MovementSystem | 1 tick | 60 | 20 | 67% |
| NeedsSystem | 5 ticks | 60 | 4 | 93% |
| MemoryFormationSystem | 30 ticks | 60 | 0.67 | 99% |
| PlantSystem | 100 ticks | 60 | 0.2 | 99.7% |

**Average reduction: ~85% fewer renders**

## Edge Cases

### 1. Multiple Systems Update Same Component
Use minimum interval (most frequent update):

```typescript
// NeedsComponent updated by:
// - NeedsSystem (every 5 ticks)
// - AutonomicSystem (every 1 tick)
// Cache interval: min(5, 1) = 1 tick
```

### 2. Manual Mutations (Outside Scheduler)
Invalidate cache immediately via `MutationService`.

### 3. Component Dependencies
If rendering component A depends on component B:
- Cache both separately
- Invalidate A when B changes
- Use dependency graph (future enhancement)

### 4. Dynamic Scheduling
If system intervals change at runtime:
- Clear cache for affected component types
- Re-calculate next update ticks

## Implementation Plan

1. **Phase 1**: Add `getComponentUpdateInterval()` to Scheduler
2. **Phase 2**: Implement `SchedulerRenderCache`
3. **Phase 3**: Integrate with DevPanel renderer
4. **Phase 4**: Add invalidation to MutationService
5. **Phase 5**: Extend to other renderers (Player UI, LLM prompts)
6. **Phase 6**: Add cache statistics/profiling

## Future Enhancements

### 1. Dependency Tracking
Track which components depend on others for rendering:

```typescript
{
  'needs': ['circadian'],  // Needs display shows sleep status from Circadian
  'agent': ['position', 'movement', 'needs'],  // Agent summary shows multiple
}
```

Invalidate dependent caches when dependencies change.

### 2. Partial Renders
For complex components, cache individual fields:

```typescript
// Cache entire component
cache.set(entityId, 'needs', renderedNeeds, tick);

// Or cache individual fields
cache.set(entityId, 'needs.hunger', renderedHunger, tick);
cache.set(entityId, 'needs.sleep', renderedSleep, tick);
```

### 3. LRU Eviction
Limit cache size with LRU eviction:

```typescript
private maxSize = 10000;  // Cache up to 10k renders
private lru = new LRUCache<string, CachedRender>(this.maxSize);
```

### 4. Cache Warmup
Pre-render components before they're requested:

```typescript
// On tick, pre-render components that will be viewed
scheduler.on('tick', (tick) => {
  const visibleEntities = viewport.getVisibleEntities();
  for (const entity of visibleEntities) {
    for (const componentType of entity.getComponentTypes()) {
      renderCache.warmup(entity.id, componentType, tick);
    }
  }
});
```

## Metrics to Track

```typescript
interface CacheStats {
  hits: number;
  misses: number;
  invalidations: number;
  size: number;
  hitRate: number;
  avgCacheLifetime: number;  // How long before invalidation
  memoryUsage: number;
}
```

Expose via dashboard at `http://localhost:8766/cache-stats`.
