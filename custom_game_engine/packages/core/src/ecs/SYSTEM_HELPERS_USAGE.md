# System Helper Base Classes - Usage Guide

This document demonstrates how to use the new System Helper base classes to make performance optimizations opt-out instead of opt-in.

## Overview

Three abstract base classes are available:

1. **ThrottledSystem** - For systems that don't need every-tick updates
2. **FilteredSystem** - For systems that should only process visible/active entities
3. **ThrottledFilteredSystem** - Combines both optimizations

## Import

```typescript
import { ThrottledSystem, FilteredSystem, ThrottledFilteredSystem } from '@ai-village/core';
import type { World, Entity } from '@ai-village/core';
import { ComponentType as CT } from '@ai-village/core';
```

## Example 1: ThrottledSystem

Use for systems that update infrequently (weather, auto-save, memory consolidation).

### Before (Manual Throttling)

```typescript
class WeatherSystem implements System {
  readonly id = 'weather';
  readonly priority = 5;
  readonly requiredComponents = [CT.Weather];

  private UPDATE_INTERVAL = 100;  // Every 5 seconds
  private lastUpdate = 0;

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Manual throttling boilerplate
    if (world.tick - this.lastUpdate < this.UPDATE_INTERVAL) return;
    this.lastUpdate = world.tick;

    // Actual logic
    for (const entity of entities) {
      // Update weather state
    }
  }
}
```

### After (ThrottledSystem)

```typescript
class WeatherSystem extends ThrottledSystem {
  readonly id = 'weather';
  readonly priority = 5;
  readonly requiredComponents = [CT.Weather];
  readonly throttleInterval = 100;  // Every 5 seconds

  protected updateThrottled(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Just the logic - throttling is automatic
    for (const entity of entities) {
      // Update weather state
    }
  }
}
```

**Benefits**: Eliminates 5 lines of boilerplate, makes throttle interval explicit and discoverable.

## Example 2: FilteredSystem

Use for systems that should only process visible/active entities (plants, animals, visual effects).

### Before (Manual Filtering)

```typescript
class PlantGrowthSystem implements System {
  readonly id = 'plant_growth';
  readonly priority = 50;
  readonly requiredComponents = [CT.Plant, CT.Position];

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Manual filtering
    const activeEntities = world.simulationScheduler.filterActiveEntities(entities, world.tick);

    for (const entity of activeEntities) {
      const plant = entity.getComponent(CT.Plant);
      // Update growth
    }
  }
}
```

### After (FilteredSystem)

```typescript
class PlantGrowthSystem extends FilteredSystem {
  readonly id = 'plant_growth';
  readonly priority = 50;
  readonly requiredComponents = [CT.Plant, CT.Position];

  protected updateFiltered(world: World, activeEntities: ReadonlyArray<Entity>, deltaTime: number): void {
    // activeEntities is already filtered - just implement logic
    for (const entity of activeEntities) {
      const plant = entity.getComponent(CT.Plant);
      // Update growth
    }
  }
}
```

**Benefits**:
- Eliminates filtering boilerplate
- Makes it obvious the system uses entity culling
- Reduces processing from 4000+ entities to ~50-100 visible ones

## Example 3: ThrottledFilteredSystem

Use for systems that need both optimizations (animal behavior, plant diseases, environmental effects).

### Before (Manual Throttling + Filtering)

```typescript
class AnimalBehaviorSystem implements System {
  readonly id = 'animal_behavior';
  readonly priority = 60;
  readonly requiredComponents = [CT.Animal, CT.Position];

  private UPDATE_INTERVAL = 20;  // Every second
  private lastUpdate = 0;

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Manual throttling
    if (world.tick - this.lastUpdate < this.UPDATE_INTERVAL) return;
    this.lastUpdate = world.tick;

    // Manual filtering
    const activeEntities = world.simulationScheduler.filterActiveEntities(entities, world.tick);

    for (const entity of activeEntities) {
      // Run animal AI
    }
  }
}
```

### After (ThrottledFilteredSystem)

```typescript
class AnimalBehaviorSystem extends ThrottledFilteredSystem {
  readonly id = 'animal_behavior';
  readonly priority = 60;
  readonly requiredComponents = [CT.Animal, CT.Position];
  readonly throttleInterval = 20;  // Every second

  protected updateThrottledFiltered(world: World, activeEntities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Just the logic - both optimizations are automatic
    for (const entity of activeEntities) {
      // Run animal AI
    }
  }
}
```

**Benefits**:
- Eliminates 6 lines of boilerplate
- Maximum performance savings (99.8% reduction in typical case)
- Example: 4000 animals × 20 TPS = 80,000 updates/sec → ~50 animals × 1 update/sec = 50 updates/sec

## Throttle Interval Reference

At 20 TPS:
- `20` ticks = 1 second
- `100` ticks = 5 seconds
- `200` ticks = 10 seconds
- `1000` ticks = 50 seconds
- `1200` ticks = 1 minute
- `6000` ticks = 5 minutes

## Common Use Cases

### ThrottledSystem
- Weather updates (100 ticks / 5 seconds)
- Auto-save (6000 ticks / 5 minutes)
- Memory consolidation (1000 ticks / 50 seconds)
- Slow environmental changes
- Periodic cleanup tasks

### FilteredSystem
- Plant growth (only visible plants)
- Visual effects (only on-screen)
- Non-critical entity updates
- Resource gathering (only near camera)

### ThrottledFilteredSystem
- Animal AI (every second, only visible)
- Plant diseases (every 5 seconds, only visible)
- Environmental effects (periodic, on-screen only)
- Particle systems (throttled, filtered)

## When NOT to Use These Helpers

Don't use these helpers for:

1. **Critical gameplay systems** that must run every tick (Movement, Physics, Agent Brain)
2. **Systems that already have complex update logic** where the base class would add confusion
3. **Systems with custom throttling logic** (time-of-day based, conditional, etc.)
4. **Systems processing singleton entities** (Time, Weather singleton) - filtering provides no benefit

## Migration Strategy

1. Identify systems with manual throttling/filtering code
2. Choose appropriate base class
3. Replace `implements System` with `extends [Helper]System`
4. Move logic to `updateThrottled` / `updateFiltered` / `updateThrottledFiltered`
5. Remove manual throttling/filtering code
6. Test that system behaves identically

## Performance Impact

**Before optimization** (typical large world):
- 4000 entities × 20 TPS = 80,000 entity checks/second per system

**After ThrottledSystem** (100 tick interval):
- 4000 entities × 0.2 updates/sec = 800 entity checks/second (99% reduction)

**After FilteredSystem**:
- 50 active entities × 20 TPS = 1,000 entity checks/second (98.75% reduction)

**After ThrottledFilteredSystem** (100 tick interval):
- 50 active entities × 0.2 updates/sec = 10 entity checks/second (99.9875% reduction)

## See Also

- [SCHEDULER_GUIDE.md](../../SCHEDULER_GUIDE.md) - System priority and execution order
- [SIMULATION_SCHEDULER.md](./SIMULATION_SCHEDULER.md) - Entity filtering and culling
- [PERFORMANCE.md](../../PERFORMANCE.md) - General performance optimization guide
