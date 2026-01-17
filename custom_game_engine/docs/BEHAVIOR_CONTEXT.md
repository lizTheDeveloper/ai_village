# BehaviorContext API

> A "pit of success" API for writing agent behaviors that are correct, performant, and consistent by default.

## Overview

BehaviorContext is the modern API for implementing agent behaviors. It provides:

- **Pre-fetched components** - No manual `getComponent()` calls needed
- **Optimized spatial queries** - Uses ChunkSpatialQuery automatically
- **Type-safe updates** - ComponentType enum enforced
- **Performance by default** - Squared distance comparisons, cached queries

## Quick Start

```typescript
import type { BehaviorContext, BehaviorResult } from '../BehaviorContext.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

export function myBehaviorWithContext(ctx: BehaviorContext): BehaviorResult | void {
  // Access pre-fetched components directly
  const { position, agent, needs } = ctx;

  // Find nearby entities using chunk-optimized queries
  const nearbyFood = ctx.getNearestEntity(
    [CT.Item, CT.Edible],
    100,  // max radius
    { filter: (e) => e.getComponent(CT.Edible)?.calories > 0 }
  );

  if (nearbyFood) {
    // Move toward target (returns squared distance)
    const distSq = ctx.moveToward(nearbyFood.entity.getComponent(CT.Position)!);

    if (distSq < 4) {  // Within 2 tiles
      // Perform action...
      return ctx.complete('found_food');
    }
  }

  // Return void to continue this behavior next tick
}
```

## API Reference

### Pre-fetched Components

These are available immediately on the context - no `getComponent()` needed:

```typescript
ctx.entity    // EntityImpl - the agent entity
ctx.tick      // number - current world tick
ctx.position  // PositionComponent (readonly) - always present
ctx.agent     // AgentComponent (readonly) - always present
ctx.movement  // MovementComponent | null
ctx.inventory // InventoryComponent | null
ctx.needs     // NeedsComponent | null
```

### Spatial Queries (Chunk-Optimized)

These methods use ChunkSpatialQuery internally for O(nearby chunks) performance instead of O(all entities):

```typescript
// Get all entities within radius with specified components
ctx.getEntitiesInRadius(
  radius: number,
  componentTypes: string[],
  options?: {
    filter?: (entity: EntityImpl) => boolean;
    maxResults?: number;
    sortByDistance?: boolean;  // default: true
  }
): EntityWithDistance[]

// Get the single nearest entity
ctx.getNearestEntity(
  componentTypes: string[],
  maxRadius?: number,  // default: 100
  options?: { filter?: (entity: EntityImpl) => boolean }
): EntityWithDistance | null

// Quick existence check (stops at first match)
ctx.hasEntityInRadius(
  radius: number,
  componentTypes: string[]
): boolean
```

### Distance Utilities

```typescript
// Returns SQUARED distance (faster, no sqrt)
ctx.distanceSquaredTo(target: { x: number; y: number }): number

// Compare with squared threshold:
if (ctx.distanceSquaredTo(target) < 25) {  // Within 5 tiles
  // ...
}
```

### Movement

```typescript
// Move toward a position, returns squared distance to target
ctx.moveToward(
  target: { x: number; y: number },
  options?: {
    speed?: number;      // Override movement speed
    arrivalDistance?: number;  // Stop within this distance
  }
): number  // squared distance

// Stop all movement and disable steering
ctx.stopMovement(): void
```

### Component Updates

```typescript
// Type-safe component update
ctx.updateComponent<T extends Component>(
  componentType: CT,  // Use ComponentType enum
  updater: (current: T) => T
): void

// Example:
ctx.updateComponent(CT.Agent, (agent) => ({
  ...agent,
  currentBehavior: 'idle',
  behaviorState: {},
}));
```

### Behavior State

Persist state between ticks without polluting the agent component:

```typescript
// Get state value
const progress = ctx.getState<number>('gatherProgress') ?? 0;

// Update multiple state values
ctx.updateState({
  gatherProgress: progress + 1,
  targetId: entity.id,
});
```

### Behavior Transitions

```typescript
// Switch to a different behavior
ctx.switchTo('wander', { direction: 'north' }): BehaviorResult

// Complete this behavior (won't run next tick)
ctx.complete(reason?: string): BehaviorResult

// Return void to continue this behavior next tick
return;  // or return undefined
```

### Events

```typescript
ctx.emit({
  type: 'agent:gathered',
  data: {
    agentId: ctx.entity.id,
    resourceType: 'wood',
    amount: 5,
  },
});
```

## Migration Guide

### Before (Legacy Pattern)

```typescript
export function seekFoodBehavior(entity: EntityImpl, world: World): void {
  const position = entity.getComponent<PositionComponent>('position');
  const needs = entity.getComponent<NeedsComponent>('needs');

  if (!position || !needs) return;

  // Expensive: queries ALL entities
  const allFood = world.query()
    .with('item')
    .with('edible')
    .executeEntities();

  let nearest: EntityImpl | null = null;
  let nearestDist = Infinity;

  for (const food of allFood) {
    const foodPos = food.getComponent<PositionComponent>('position');
    if (!foodPos) continue;

    const dx = foodPos.x - position.x;
    const dy = foodPos.y - position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);  // Expensive!

    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = food;
    }
  }

  // ... rest of behavior
}
```

### After (BehaviorContext Pattern)

```typescript
export function seekFoodBehaviorWithContext(ctx: BehaviorContext): BehaviorResult | void {
  // Components already available
  if (!ctx.needs || ctx.needs.hunger < 30) return;

  // Chunk-optimized query with filtering
  const nearest = ctx.getNearestEntity(
    [CT.Item, CT.Edible],
    50,  // Only search within 50 tiles
    { filter: (e) => (e.getComponent(CT.Edible)?.calories ?? 0) > 0 }
  );

  if (!nearest) {
    return ctx.switchTo('wander');
  }

  // moveToward returns squared distance
  const distSq = ctx.moveToward(nearest.entity.getComponent(CT.Position)!);

  if (distSq < 4) {  // Within 2 tiles (no sqrt needed)
    // Eat the food...
    return ctx.complete('ate_food');
  }
}
```

## ESLint Rules

The following rules are enforced in behavior files (`**/behavior/behaviors/**/*.ts`):

| Pattern | Warning | Fix |
|---------|---------|-----|
| `world.query()` | Avoid in behaviors | Use `ctx.getEntitiesInRadius()` or `ctx.getNearestEntity()` |
| `getComponent('string')` | Use enum | Use `CT.ComponentName` |
| `Math.sqrt()` | Performance | Use squared distance: `dx*dx + dy*dy < r*r` |
| `removeEntity()` | Forbidden | Mark as corrupted instead |

## Registration

Register behaviors with the BehaviorRegistry:

```typescript
import { registerBehaviorWithContext } from '../BehaviorRegistry.js';

// Register modern behavior
registerBehaviorWithContext('seek_food', seekFoodBehaviorWithContext);

// Legacy behaviors still work
registerBehavior('old_behavior', oldBehaviorFunction);
```

## Performance Comparison

| Operation | Legacy | BehaviorContext |
|-----------|--------|-----------------|
| Find nearest in 100 radius | O(all entities) | O(nearby chunks) |
| Component access | getComponent() each time | Pre-fetched |
| Distance comparison | Math.sqrt() | Squared comparison |
| Entity filtering | Manual loop | Built-in filter option |

Typical improvement: **10-100x faster** for spatial queries in dense areas.

## Best Practices

1. **Always use the `WithContext` suffix** for new behaviors
2. **Use ComponentType enum** (`CT.Agent`, not `'agent'`)
3. **Compare squared distances** (`distSq < 25` not `dist < 5`)
4. **Limit search radius** - Don't search entire world when 50 tiles suffices
5. **Use early returns** - Check preconditions before expensive operations
6. **Emit events sparingly** - Throttle with probability or tick intervals

## File Locations

- `BehaviorContext.ts` - Interface and implementation
- `BehaviorRegistry.ts` - Registration and execution
- `behaviors/` - All behavior implementations
- `eslint.config.js` - Linting rules for behaviors
