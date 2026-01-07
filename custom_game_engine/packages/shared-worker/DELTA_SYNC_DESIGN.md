# Delta Synchronization with Path Prediction

**Date**: 2026-01-06
**Status**: Design Phase
**Context**: Optimization for SharedWorker state transfer

## Problem Statement

Current SharedWorker implementation serializes and transfers **full entity state every tick** (20 TPS):

```typescript
// 100 entities = ~10KB per tick = 200KB/sec = 12MB/min
const state = {
  entities: {
    "deer_1": { position: { x: 100.3, y: 45.2 }, velocity: { x: 1.2, y: 0.5 }, ... },
    "deer_2": { position: { x: 203.1, y: 102.8 }, velocity: { x: -0.8, y: 1.1 }, ... },
    // ... all entities
  }
};
```

**Inefficiency**: Most entities move predictably - we're sending redundant data.

## Solution: Dead Reckoning with Path Prediction

**Core Idea**:
- Worker sends **predicted paths** once
- Windows **interpolate** positions locally
- Worker only sends **corrections** when paths deviate

### Example: Wandering Deer

**Without prediction** (current):
```
Tick 1: worker → window: { deer_1: { x: 100, y: 100 } }
Tick 2: worker → window: { deer_1: { x: 101, y: 100 } }
Tick 3: worker → window: { deer_1: { x: 102, y: 100 } }
Tick 4: worker → window: { deer_1: { x: 103, y: 100 } }
// 4 position updates
```

**With prediction**:
```
Tick 1: worker → window: {
  deer_1: {
    position: { x: 100, y: 100 },
    predictedPath: {
      type: 'linear',
      velocity: { x: 1, y: 0 },
      duration: 100  // ticks
    }
  }
}

// Ticks 2-100: windows interpolate locally (NO NETWORK TRANSFER)
// Window calculates: position.x = 100 + (tick - 1) * velocity.x

Tick 50: deer changes direction (deviation detected)
worker → window: {
  deer_1: {
    position: { x: 150, y: 100 },  // Correction
    predictedPath: {
      type: 'linear',
      velocity: { x: 0, y: -1 },  // New path
      duration: 100
    }
  }
}

// Result: 2 updates instead of 100
```

## Architecture Design

### 1. Path Prediction Types

```typescript
type PathPrediction =
  | LinearPath
  | WanderPath
  | SteeringPath
  | StationaryPath;

interface LinearPath {
  type: 'linear';
  velocity: { x: number; y: number };
  duration: number;  // ticks until next update expected
}

interface WanderPath {
  type: 'wander';
  currentVelocity: { x: number; y: number };
  wanderRadius: number;
  wanderDistance: number;
  wanderJitter: number;
  // Windows can simulate WanderBehavior locally
}

interface SteeringPath {
  type: 'steering';
  target: { x: number; y: number };
  maxSpeed: number;
  arrivalRadius: number;
  // Windows can simulate arrival steering locally
}

interface StationaryPath {
  type: 'stationary';
  // Entity not moving - no updates needed
}
```

### 2. New Components

**Worker-side**:
```typescript
// Track predicted paths for delta detection
interface PathPredictionComponent {
  type: 'path_prediction';
  prediction: PathPrediction;
  lastSentPosition: { x: number; y: number };
  lastSentTick: number;
  deviationThreshold: number;  // When to send correction
}
```

**Window-side**:
```typescript
// Interpolate positions based on prediction
interface PathInterpolatorComponent {
  type: 'path_interpolator';
  prediction: PathPrediction;
  basePosition: { x: number; y: number };
  baseTick: number;
}
```

### 3. Worker: Path Prediction System

```typescript
class PathPredictionSystem implements System {
  priority = 50;  // Run after movement systems

  execute(world: World): void {
    // For each entity with movement
    const entities = world.query()
      .with('position')
      .with('velocity')
      .executeEntities();

    for (const entity of entities) {
      const position = entity.getComponent('position');
      const velocity = entity.getComponent('velocity');
      let prediction = entity.getComponent('path_prediction');

      if (!prediction) {
        // Initialize prediction
        prediction = this.createPrediction(entity);
        entity.addComponent(prediction);
        continue;
      }

      // Check if current movement deviates from prediction
      const deviation = this.calculateDeviation(position, velocity, prediction);

      if (deviation > prediction.deviationThreshold) {
        // Movement changed - update prediction
        const newPrediction = this.createPrediction(entity);
        entity.addComponent(newPrediction);

        // Mark entity as dirty (needs sync)
        this.markDirty(entity);
      }
    }
  }

  private createPrediction(entity: Entity): PathPredictionComponent {
    const velocity = entity.getComponent('velocity');
    const steering = entity.getComponent('steering');
    const wander = entity.getComponent('wander');

    if (wander) {
      return {
        type: 'path_prediction',
        prediction: {
          type: 'wander',
          currentVelocity: { ...velocity },
          wanderRadius: wander.wanderRadius,
          wanderDistance: wander.wanderDistance,
          wanderJitter: wander.wanderJitter,
        },
        lastSentPosition: { ...entity.getComponent('position') },
        lastSentTick: world.tick,
        deviationThreshold: 2.0,  // pixels
      };
    }

    if (steering?.target) {
      return {
        type: 'path_prediction',
        prediction: {
          type: 'steering',
          target: { ...steering.target },
          maxSpeed: steering.maxSpeed || 2.0,
          arrivalRadius: steering.arrivalRadius || 5.0,
        },
        lastSentPosition: { ...entity.getComponent('position') },
        lastSentTick: world.tick,
        deviationThreshold: 1.0,
      };
    }

    // Default: linear movement
    return {
      type: 'path_prediction',
      prediction: {
        type: 'linear',
        velocity: { ...velocity },
        duration: 100,  // Re-sync every 5 seconds
      },
      lastSentPosition: { ...entity.getComponent('position') },
      lastSentTick: world.tick,
      deviationThreshold: 1.0,
    };
  }

  private calculateDeviation(
    position: any,
    velocity: any,
    prediction: PathPredictionComponent
  ): number {
    const expected = {
      x: prediction.lastSentPosition.x + velocity.x,
      y: prediction.lastSentPosition.y + velocity.y,
    };

    const dx = position.x - expected.x;
    const dy = position.y - expected.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private markDirty(entity: Entity): void {
    entity.addComponent({ type: 'dirty_for_sync' });
  }
}
```

### 4. Worker: Delta Serialization

```typescript
class DeltaSyncSystem implements System {
  priority = 1000;  // Run last

  execute(world: World): void {
    const dirtyEntities = world.query()
      .with('dirty_for_sync')
      .executeEntities();

    if (dirtyEntities.length === 0) return;

    const delta: DeltaUpdate = {
      tick: world.tick,
      updates: [],
    };

    for (const entity of dirtyEntities) {
      const position = entity.getComponent('position');
      const prediction = entity.getComponent('path_prediction');

      delta.updates.push({
        entityId: entity.id,
        position: { ...position },
        prediction: prediction?.prediction || null,
      });

      // Clear dirty flag
      entity.removeComponent('dirty_for_sync');
    }

    // Broadcast delta (not full state!)
    this.broadcastDelta(delta);
  }
}
```

### 5. Window: Path Interpolation

```typescript
class PathInterpolationSystem implements System {
  priority = 5;  // Run before rendering

  execute(world: World): void {
    const entities = world.query()
      .with('path_interpolator')
      .with('position')
      .executeEntities();

    for (const entity of entities) {
      const interpolator = entity.getComponent('path_interpolator');
      const position = entity.getComponent('position');

      // Calculate interpolated position based on prediction
      const interpolated = this.interpolate(
        interpolator,
        world.tick
      );

      // Update local position (view only)
      position.x = interpolated.x;
      position.y = interpolated.y;
    }
  }

  private interpolate(
    interpolator: PathInterpolatorComponent,
    currentTick: number
  ): { x: number; y: number } {
    const ticksSince = currentTick - interpolator.baseTick;
    const prediction = interpolator.prediction;

    switch (prediction.type) {
      case 'linear':
        return {
          x: interpolator.basePosition.x + prediction.velocity.x * ticksSince,
          y: interpolator.basePosition.y + prediction.velocity.y * ticksSince,
        };

      case 'wander':
        // Simulate wander behavior locally (deterministic with same seed)
        return this.simulateWander(interpolator, ticksSince);

      case 'steering':
        // Simulate steering toward target
        return this.simulateSteering(interpolator, ticksSince);

      case 'stationary':
        return { ...interpolator.basePosition };

      default:
        return { ...interpolator.basePosition };
    }
  }

  private simulateWander(
    interpolator: PathInterpolatorComponent,
    ticksSince: number
  ): { x: number; y: number } {
    // Local wander simulation (same algorithm as WanderBehavior)
    // This is deterministic if we use entity ID as RNG seed
    const wander = interpolator.prediction as WanderPath;

    // Simplified: for now, just use linear velocity
    // Full implementation would simulate the wander circle
    return {
      x: interpolator.basePosition.x + wander.currentVelocity.x * ticksSince,
      y: interpolator.basePosition.y + wander.currentVelocity.y * ticksSince,
    };
  }

  private simulateSteering(
    interpolator: PathInterpolatorComponent,
    ticksSince: number
  ): { x: number; y: number } {
    // Simulate arrival steering
    const steering = interpolator.prediction as SteeringPath;
    const current = { ...interpolator.basePosition };
    const target = steering.target;

    // Calculate direction to target
    const dx = target.x - current.x;
    const dy = target.y - current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 0.1) return current;

    // Move toward target at max speed (simplified)
    const speed = Math.min(steering.maxSpeed, distance / ticksSince);
    const vx = (dx / distance) * speed;
    const vy = (dy / distance) * speed;

    return {
      x: current.x + vx * ticksSince,
      y: current.y + vy * ticksSince,
    };
  }
}
```

### 6. Window: Delta Update Handler

```typescript
private handleDeltaUpdate(delta: DeltaUpdate): void {
  for (const update of delta.updates) {
    let entity = this.viewWorld.getEntity(update.entityId);

    if (!entity) {
      entity = this.viewWorld.createEntity(update.entityId);
    }

    // Update position
    entity.addComponent({
      type: 'position',
      ...update.position,
    });

    // Update path interpolator
    if (update.prediction) {
      entity.addComponent({
        type: 'path_interpolator',
        prediction: update.prediction,
        basePosition: { ...update.position },
        baseTick: delta.tick,
      });
    }
  }
}
```

## Performance Analysis

### Bandwidth Savings

**Scenario**: 100 wandering deer

**Without delta (current)**:
- 100 entities × 20 TPS = 2,000 updates/sec
- ~50 bytes per update = 100 KB/sec
- **6 MB/min**

**With delta + prediction**:
- Deer change direction every ~3 seconds on average
- 100 entities / 3 sec = 33 updates/sec
- ~100 bytes per update (includes prediction) = 3.3 KB/sec
- **200 KB/min**

**Savings**: 97% reduction in bandwidth!

### CPU Considerations

**Worker overhead**:
- PathPredictionSystem: O(n) deviation checks per tick
- DeltaSyncSystem: O(dirty) serialization (only changed entities)
- **Net**: Minimal (deviation check is simple math)

**Window overhead**:
- PathInterpolationSystem: O(n) interpolation per tick
- **Trade-off**: More window CPU for less network transfer
- **Worth it**: CPU is cheap, network transfer is expensive

## Implementation Plan

### Phase 1: Infrastructure
1. Add `path_prediction` component type
2. Add `path_interpolator` component type
3. Create `PathPredictionSystem` in worker
4. Create `PathInterpolationSystem` in windows

### Phase 2: Delta Protocol
1. Modify `shared-universe-worker.ts` to use delta serialization
2. Add `DeltaSyncSystem` to worker
3. Update `GameBridge` to handle delta updates
4. Add dirty tracking

### Phase 3: Path Types
1. Implement `LinearPath` (simplest)
2. Implement `StationaryPath` (trivial)
3. Implement `SteeringPath` (arrival behavior)
4. Implement `WanderPath` (complex but high value)

### Phase 4: Testing & Tuning
1. Test with 10 entities
2. Test with 100 entities
3. Benchmark bandwidth usage
4. Tune deviation thresholds
5. Compare to full-state sync

### Phase 5: Optimization
1. Add spatial culling (only sync visible entities)
2. Add priority system (agents > animals > plants)
3. Add batching (group updates by region)

## Non-Goals (Deferred)

- **Perfect synchronization**: Some visual jitter is acceptable
- **Deterministic simulation**: Windows don't need perfect physics
- **Complex path types**: Bezier curves, splines - overkill for now
- **Backward compatibility**: This is a breaking change to sync protocol

## Risks & Mitigations

### Risk 1: Prediction Errors

**Problem**: Local interpolation diverges from worker truth

**Mitigation**:
- Regular correction updates (every 5 seconds)
- Low deviation thresholds (1-2 pixels)
- Accept minor visual jitter as trade-off

### Risk 2: Complexity

**Problem**: More complex than full-state sync

**Mitigation**:
- Implement incrementally (start with LinearPath)
- Keep full-state sync as fallback mode
- Extensive testing before production use

### Risk 3: Determinism

**Problem**: Wander simulation must match worker exactly

**Mitigation**:
- Use entity ID as RNG seed (deterministic)
- Or: Send wander angles directly (defeats purpose)
- Or: Accept divergence, rely on corrections

## Decision Point

**Should we implement this now?**

**Arguments FOR**:
- Solves real scalability problem
- User specifically asked for it
- Architecture is sound
- Clear implementation plan

**Arguments AGAINST**:
- Adds complexity
- Current full-state sync works fine for small worlds
- Not yet tested with real workload
- Could implement later when needed

**Recommendation**:
1. Implement **Phase 1** (infrastructure) now - low risk, sets foundation
2. Defer **Phases 2-5** until we profile real performance with 100+ entities
3. Measure actual bandwidth usage in practice first
4. If bottleneck confirmed, complete implementation

This gives us the architecture without premature optimization.

## Alternative: Spatial Culling First

**Simpler optimization**: Only sync entities in viewport

```typescript
// Worker tracks which entities each window can see
const visibleEntities = getEntitiesInViewport(
  connection.viewport,
  world
);

// Only send those entities
const state = {
  entities: visibleEntities.map(serializeEntity),
};
```

**Pros**:
- Much simpler to implement
- Also reduces bandwidth significantly
- No prediction complexity

**Cons**:
- Doesn't help with dense scenes
- Still transfers full state for visible entities

**Could combine**: Spatial culling + path prediction for maximum savings

## Conclusion

Path prediction with delta synchronization is a **sound optimization** for SharedWorker state transfer. It's especially valuable for:
- Large numbers of moving entities (animals, NPCs)
- Predictable movement patterns (wander, steering)
- Limited network bandwidth scenarios

The design is solid and ready to implement when profiling shows the need.

**Next steps**:
1. Profile current state transfer overhead
2. If bottleneck confirmed: implement Phase 1 (infrastructure)
3. Measure improvement, iterate if needed
