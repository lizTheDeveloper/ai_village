# Pit of Success APIs

> APIs designed to make the correct, performant approach the easiest path.

This document covers the "pit of success" APIs for system and behavior development:

1. **[BehaviorContext](./BEHAVIOR_CONTEXT.md)** - For agent behaviors
2. **TypedEventEmitter** - For type-safe event emission (this doc)
3. **SystemContext** - For system development (this doc)
4. **SpatialQueryService** - Unified API for finding nearby entities (this doc)

## Philosophy

Traditional APIs require developers to remember many rules:
- "Always use ComponentType enum, not strings"
- "Remember to unsubscribe in cleanup()"
- "Use squared distance comparisons"
- "Filter with SimulationScheduler"

**Pit of success APIs** make these patterns automatic - the easy way is the right way.

---

## TypedEventEmitter

### Problem

Event emission in the codebase had several issues:
1. **No type safety** - Easy to emit malformed event data
2. **Subscription leaks** - Systems forgot to unsubscribe
3. **emit vs emitImmediate confusion** - Wrong timing
4. **Scattered cleanup** - Easy to miss subscriptions

### Solution: SystemEventManager

```typescript
import { SystemEventManager } from '@ai-village/core';

export class MySystem implements System {
  private events!: SystemEventManager;

  initialize(world: World, eventBus: EventBus): void {
    this.events = new SystemEventManager(eventBus, this.id);

    // Type-safe subscription - data is typed as GameEventMap['agent:ate']
    this.events.on('agent:ate', (data) => {
      console.log(data.foodType, data.hungerRestored);
    });
  }

  someMethod(agentId: string): void {
    // Type-safe emission - compile error if data shape is wrong
    this.events.emit('agent:idle', { agentId });

    // ❌ This would be a compile error:
    // this.events.emit('agent:idle', { wrongField: 123 });
  }

  cleanup(): void {
    this.events.cleanup(); // Unsubscribes ALL automatically
  }
}
```

### API Reference

#### SystemEventManager

```typescript
class SystemEventManager {
  constructor(eventBus: EventBus, systemId: SystemId, defaultSource?: EntityId);

  // Type-safe emission (queued for end of tick)
  emit<T extends EventType>(type: T, data: GameEventMap[T], source?: EntityId): void;

  // Immediate emission (use sparingly)
  emitImmediate<T extends EventType>(type: T, data: GameEventMap[T], source?: EntityId): void;

  // Type-safe subscription with auto-cleanup tracking
  on<T extends EventType>(
    type: T,
    handler: (data: GameEventMap[T], event: GameEvent<T>) => void,
    priority?: EventPriority
  ): Unsubscribe;

  // Subscribe to multiple event types
  onAny<T extends EventType>(
    types: readonly T[],
    handler: (data: GameEventMap[T], event: GameEvent<T]) => void
  ): Unsubscribe;

  // Unsubscribe all (call in cleanup())
  cleanup(): void;

  // Debugging
  readonly subscriptionCount: number;
  readonly cleaned: boolean;
}
```

#### Helper Functions

```typescript
// Create a single-event emitter
const emitIdle = createTypedEmitter(eventBus, 'agent:idle', systemId);
emitIdle({ agentId: 'abc123' }); // Type-safe!

// Convenience emitters for agents
const agentEvents = EventEmitters.forAgent(eventBus, agentId);
agentEvents.idle();
agentEvents.ate({ foodType: 'apple', hungerRestored: 20 });
```

### Migration Guide

```typescript
// BEFORE: Direct eventBus usage
this.eventBus.subscribe('agent:idle', (event) => {
  const agentId = event.data.agentId; // No type safety
});

this.eventBus.emit({
  type: 'agent:action:started',
  source: this.id,
  data: { actionId: 'x', actionType: 'y' },
});

// AFTER: SystemEventManager
this.events.on('agent:idle', (data) => {
  const agentId = data.agentId; // Typed!
});

this.events.emit('agent:action:started', {
  actionId: 'x',
  actionType: 'y',
}); // Source auto-filled, data validated
```

---

## SystemContext

### Problem

System development had repetitive patterns:
1. **Component access boilerplate** - 10+ `getComponent()` calls per system
2. **Missing null checks** - Sometimes safe, sometimes not
3. **Manual throttling** - Same pattern repeated everywhere
4. **Forgetting SimulationScheduler** - Missing filterActiveEntities
5. **O(N²) query patterns** - Easy to write, hard to spot

### Solution: BaseSystem + SystemContext

```typescript
import { BaseSystem, type SystemContext } from '@ai-village/core';
import { ComponentType as CT } from '@ai-village/core';

export class MySystem extends BaseSystem {
  readonly id = 'my_system';
  readonly priority = 100;
  readonly requiredComponents = [CT.Agent, CT.Position];

  // Built-in throttling (runs every 20 ticks instead of every tick)
  protected readonly throttleInterval = 20;

  protected onUpdate(ctx: SystemContext): void {
    // activeEntities already filtered by SimulationScheduler
    for (const entity of ctx.activeEntities) {
      // Type-safe component access
      const comps = ctx.components(entity);
      const { agent, position } = comps.require('agent', 'position');
      const movement = comps.optional('movement');

      // Cached spatial query (runs once per tick, not per entity)
      const nearby = ctx.getNearbyEntities(position, 50, [CT.Resource]);

      // Type-safe event emission
      ctx.emit('agent:idle', { agentId: entity.id });
    }
  }
}
```

### API Reference

#### SystemContext

```typescript
interface SystemContext {
  // Core properties
  readonly world: World;
  readonly tick: Tick;
  readonly deltaTime: number;
  readonly events: SystemEventManager;

  // Pre-filtered entities (SimulationScheduler applied)
  readonly activeEntities: ReadonlyArray<EntityImpl>;

  // Type-safe component access
  components(entity: EntityImpl): ComponentAccessor;

  // Cached spatial queries
  getNearbyEntities(
    center: { x: number; y: number },
    radius: number,
    componentTypes?: ComponentType[],
    options?: {
      filter?: (entity: EntityImpl) => boolean;
      maxResults?: number;
      excludeIds?: Set<EntityId>;
    }
  ): ReadonlyArray<EntityWithDistance>;

  getNearestEntity(
    center: { x: number; y: number },
    radius: number,
    componentTypes?: ComponentType[],
    options?: { filter?: (entity: EntityImpl) => boolean }
  ): EntityWithDistance | null;

  hasEntityInRadius(
    center: { x: number; y: number },
    radius: number,
    componentTypes?: ComponentType[]
  ): boolean;

  // Type-safe event emission
  emit<T extends EventType>(type: T, data: GameEventMap[T], source?: EntityId): void;

  // Singleton access (cached)
  getSingleton<T extends Component>(componentType: ComponentType): T | null;
}
```

#### ComponentAccessor

```typescript
interface ComponentAccessor {
  // Get required components - throws if missing
  require<K extends ComponentType>(...types: K[]): Record<K, Component>;

  // Get optional component
  optional<T extends Component>(type: ComponentType): T | undefined;

  // Check existence
  has(type: ComponentType): boolean;

  // Type-safe update
  update<T extends Component>(type: ComponentType, updater: (current: T) => T): void;
}
```

#### BaseSystem

```typescript
abstract class BaseSystem implements System {
  abstract readonly id: SystemId;
  abstract readonly priority: number;
  abstract readonly requiredComponents: ReadonlyArray<ComponentType>;

  // Override for throttling (default: 0 = every tick)
  protected readonly throttleInterval: number = 0;

  // Override for custom initialization
  protected onInitialize?(world: World, eventBus: EventBus): void;

  // Implement your logic here
  protected abstract onUpdate(ctx: SystemContext): void;

  // Override for custom cleanup
  protected onCleanup?(): void;
}
```

### Migration Patterns

#### Full Migration (Extend BaseSystem)

```typescript
// BEFORE
export class TemperatureSystem implements System {
  readonly id = 'temperature';
  readonly priority = 150;
  readonly requiredComponents = [CT.Agent, CT.Position];

  private lastUpdate = 0;
  private readonly UPDATE_INTERVAL = 20;

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    if (world.tick - this.lastUpdate < this.UPDATE_INTERVAL) return;
    this.lastUpdate = world.tick;

    const active = world.simulationScheduler?.filterActiveEntities(entities, world.tick) ?? entities;

    for (const entity of active) {
      const agent = entity.getComponent<AgentComponent>(CT.Agent);
      const position = entity.getComponent<PositionComponent>(CT.Position);
      if (!agent || !position) continue;
      // ... logic
    }
  }
}

// AFTER
export class TemperatureSystem extends BaseSystem {
  readonly id = 'temperature';
  readonly priority = 150;
  readonly requiredComponents = [CT.Agent, CT.Position];
  protected readonly throttleInterval = 20; // Built-in!

  protected onUpdate(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) { // Pre-filtered!
      const { agent, position } = ctx.components(entity).require('agent', 'position');
      // ... logic
    }
  }
}
```

#### Incremental Migration (Use createSystemContext)

For systems that can't easily extend BaseSystem:

```typescript
update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
  const ctx = await createSystemContext(world, this.id, this.eventBus, entities, deltaTime);

  for (const entity of ctx.activeEntities) {
    const comps = ctx.components(entity);
    // Use ctx for spatial queries, events, etc.
  }
}
```

---

## SpatialQueryService

### Problem

Finding nearby entities had multiple inconsistent approaches:

1. **`world.query().with(CT.X).executeEntities()`** - O(all entities), slow
2. **`chunkSpatialQuery.getEntitiesInRadius()`** - Fast but required injection
3. **`this.getEntitiesInRadius()`** - Behavior helper, hidden dependency
4. **`world.getEntity(id)`** - Direct lookup, different API
5. **Module-level injection** - Hidden dependencies, hard to test

### Solution: Unified `world.spatialQuery`

All spatial queries now go through a single, type-safe service accessible on World:

```typescript
// In behaviors via BehaviorContext (preferred)
const nearby = ctx.getEntitiesInRadius(50, [CT.Plant, CT.Building]);
const nearest = ctx.getNearestEntity([CT.Food], 100);

// In systems via SystemContext (preferred)
const nearby = ctx.getNearbyEntities(position, 50, [CT.Agent]);

// Direct access when needed
if (world.spatialQuery) {
  const nearby = world.spatialQuery.getEntitiesInRadius(x, y, 50, [CT.Plant]);
}
```

### API Reference

#### SpatialQueryService Interface

```typescript
interface SpatialQueryService {
  // Find entities within radius, sorted by distance (closest first)
  getEntitiesInRadius(
    x: number,
    y: number,
    radius: number,
    componentTypes: ComponentType[],
    options?: {
      limit?: number;
      excludeIds?: Set<EntityId>;
      filter?: (entity: Entity) => boolean;
    }
  ): EntityWithDistance[];

  // Find the single nearest entity
  getNearestEntity(
    x: number,
    y: number,
    componentTypes: ComponentType[],
    options?: { maxRadius?: number; excludeIds?: Set<EntityId>; filter?: (entity: Entity) => boolean }
  ): EntityWithDistance | null;

  // Fast existence check (early exit)
  hasEntityInRadius(
    x: number,
    y: number,
    radius: number,
    componentTypes: ComponentType[]
  ): boolean;

  // Count entities without allocating array
  countEntitiesInRadius(
    x: number,
    y: number,
    radius: number,
    componentTypes: ComponentType[]
  ): number;

  // O(1) building check in chunk
  hasBuildingNearPosition(
    worldX: number,
    worldY: number,
    buildingType: string
  ): boolean;
}

interface EntityWithDistance {
  entity: Entity;
  distance: number;
  distanceSquared: number;
  position: { x: number; y: number };
}
```

### Migration Guide

```typescript
// ❌ BEFORE: Module-level injection (removed)
let chunkSpatialQuery: ChunkSpatialQuery | null = null;
export function injectChunkSpatialQueryToX(q) { chunkSpatialQuery = q; }

// Usage required null check
if (chunkSpatialQuery) {
  const nearby = chunkSpatialQuery.getEntitiesInRadius(x, y, 50, [CT.Plant]);
}

// ✅ AFTER: Unified world.spatialQuery
// No injection needed - just use world.spatialQuery
if (world.spatialQuery) {
  const nearby = world.spatialQuery.getEntitiesInRadius(x, y, 50, [CT.Plant]);
}

// ✅ BEST: Use context APIs (they handle the null check)
// In BehaviorContext:
const nearby = ctx.getEntitiesInRadius(50, [CT.Plant]);

// In SystemContext:
const nearby = ctx.getNearbyEntities(position, 50, [CT.Plant]);
```

### Performance Characteristics

| Method | Complexity | Use Case |
|--------|------------|----------|
| `getEntitiesInRadius()` | O(nearby chunks × entities/chunk) | Finding multiple entities |
| `getNearestEntity()` | O(nearby chunks × entities/chunk) | Finding single closest |
| `hasEntityInRadius()` | O(1) to O(nearby) | Existence check (early exit) |
| `countEntitiesInRadius()` | O(nearby chunks × entities/chunk) | Counting without allocation |
| `hasBuildingNearPosition()` | O(1) | Building existence in chunk |

**Why it's fast**: Uses chunk-based spatial indexing. Instead of checking all ~4000 entities, only checks entities in nearby chunks (~50-200 entities).

---

## Performance Benefits

| Pattern | Before | After |
|---------|--------|-------|
| Component access | Manual null checks, assertions | Type-safe require/optional |
| Spatial queries | O(all entities) per call | Cached per tick, O(nearby) |
| Event subscriptions | Manual tracking, leak risk | Auto-cleanup in one call |
| Throttling | Manual lastUpdate tracking | Built-in throttleInterval |
| Entity filtering | Manual SimulationScheduler call | Pre-filtered activeEntities |

---

## Summary: Which API to Use

| Task | API |
|------|-----|
| Writing agent behaviors | **BehaviorContext** |
| Writing systems | **SystemContext / BaseSystem** |
| Finding nearby entities | **world.spatialQuery** (via ctx in behaviors/systems) |
| Emitting events | **SystemEventManager** |
| Subscribing to events | **SystemEventManager** |

### ❌ Deprecated Patterns (Do NOT Use)

| Pattern | Why It's Wrong | Use Instead |
|---------|----------------|-------------|
| `world.query().with(CT.X).executeEntities()` | O(all entities), slow | `world.spatialQuery.getEntitiesInRadius()` |
| `injectChunkSpatialQueryToX()` | Module-level injection removed | `world.spatialQuery` |
| `let chunkSpatialQuery = null` | Global mutable state | `world.spatialQuery` |
| `Math.sqrt()` for distance comparison | Expensive | Compare `distanceSquared` instead |

All three APIs share the same philosophy:
1. **Pre-fetch common data** - No boilerplate
2. **Enforce type safety** - Compile-time errors instead of runtime bugs
3. **Automatic cleanup** - No leaks
4. **Optimized by default** - Caching, filtering, squared distances

---

## File Locations

- `packages/core/src/behavior/BehaviorContext.ts` - BehaviorContext
- `packages/core/src/events/TypedEventEmitter.ts` - SystemEventManager
- `packages/core/src/ecs/SystemContext.ts` - SystemContext, BaseSystem
- `packages/core/src/services/SpatialQueryService.ts` - SpatialQueryService interface
- `packages/world/src/chunks/ChunkSpatialQuery.ts` - SpatialQueryService implementation
