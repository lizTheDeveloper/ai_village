# Path Prediction - Phase 1 Complete ✅

**Date**: 2026-01-06
**Status**: Infrastructure Ready - Phase 2 (Integration) Pending
**Context**: Second optimization after Spatial Culling

## Summary

Completed Phase 1 of path prediction implementation - all infrastructure is in place for dead reckoning / client-side prediction. Combined with spatial culling, this will achieve 95-99% bandwidth reduction.

## What Was Implemented

### 1. Type Definitions (`path-prediction-types.ts`)

**Four Path Types**:

```typescript
// Linear - constant velocity movement
interface LinearPath {
  velocity: { x, y };
  duration: number;
}

// Wander - random walk (animals)
interface WanderPath {
  currentVelocity: { x, y };
  wanderRadius, wanderDistance, wanderJitter;
  seed?: number; // Deterministic RNG
}

// Steering - move toward target with arrival
interface SteeringPath {
  target: { x, y };
  maxSpeed, arrivalRadius;
  currentVelocity?: { x, y };
}

// Stationary - not moving
interface StationaryPath {
  duration?: number;
}
```

**Component Types**:

```typescript
// Worker-side: track predictions and detect deviations
interface PathPredictionComponent {
  prediction: PathPrediction;
  lastSentPosition, lastSentTick;
  deviationThreshold: number; // pixels
}

// Window-side: interpolate positions locally
interface PathInterpolatorComponent {
  prediction: PathPrediction;
  basePosition, baseTick;
}

// Delta updates: only changed entities
interface DeltaUpdate {
  tick: number;
  updates: Array<{
    entityId, position, prediction, components?
  }>;
  removed?: string[];
}
```

**Helper Functions**:

```typescript
calculateDeviation(actual, predicted): number
predictPosition(prediction, basePos, ticks): {x, y}
```

### 2. PathPredictionSystem (Worker)

**Purpose**: Detect when entity movement changes, create predictions

**Priority**: 50 (after movement, before sync)

**Algorithm**:
1. For each entity with position:
   - Check if has `path_prediction` component
   - If not: create initial prediction, mark dirty
   - If yes: check deviation from predicted path
   - If deviation > threshold: update prediction, mark dirty
   - If duration expired: update prediction, mark dirty

**Prediction Creation**:
- Wander component → WanderPath
- Steering component with target → SteeringPath
- Velocity (non-zero) → LinearPath
- Default → StationaryPath

**Deviation Thresholds**:
- Linear: 1.0 pixels
- Wander: 2.0 pixels (less predictable)
- Steering: 1.0 pixels (very predictable)
- Stationary: 0.1 pixels (should not move)

**Marks Dirty**: Adds `dirty_for_sync` component to entities that need updating

### 3. PathInterpolationSystem (Windows)

**Purpose**: Calculate positions locally based on predictions

**Priority**: 5 (before rendering)

**Algorithm**:
1. For each entity with `path_interpolator`:
   - Calculate ticks elapsed since base position
   - Interpolate based on prediction type
   - Update local position component

**Interpolation Methods**:
- Linear: `pos + velocity * ticks`
- Wander: Linear approximation (uses currentVelocity)
- Steering: Simulate arrival behavior (slow down near target)
- Stationary: Return base position

**Note**: Full wander simulation would require matching WanderBehavior exactly with deterministic RNG - currently uses simple linear approximation.

### 4. Package Exports

All types and systems exported from `packages/shared-worker/index.ts`:

**Types**: PathPrediction, LinearPath, WanderPath, SteeringPath, StationaryPath, PathPredictionComponent, PathInterpolatorComponent, DeltaUpdate

**Functions**: calculateDeviation, predictPosition

**Systems**: PathPredictionSystem, PathInterpolationSystem

## How It Works (When Integrated)

### Worker Flow

```
Tick 1:
  Movement systems run
  PathPredictionSystem runs:
    - Sees deer has velocity (1, 0)
    - Creates LinearPath prediction
    - Marks deer as dirty

  Broadcast (delta):
    deer: {
      position: (100, 100),
      prediction: LinearPath(velocity: (1, 0), duration: 100)
    }

Ticks 2-99:
  Movement systems run (deer at 101, 102, 103...)
  PathPredictionSystem runs:
    - Calculates predicted position
    - Deviation < 1.0 pixels → no update
    - NOT marked dirty

  Broadcast (delta):
    (no update for deer)

Tick 50: Deer changes direction
  Movement systems run (deer now moving up)
  PathPredictionSystem runs:
    - Predicted: (150, 100)
    - Actual: (150, 101)
    - Deviation: 1.0 pixels → threshold exceeded!
    - Creates new LinearPath(velocity: (0, 1))
    - Marks dirty

  Broadcast (delta):
    deer: {
      position: (150, 101),
      prediction: LinearPath(velocity: (0, 1), duration: 100)
    }

Result: 2 updates instead of 100!
```

### Window Flow

```
Receive update with prediction:
  - Add path_interpolator component to deer
  - Set basePosition = (100, 100), baseTick = 1
  - Set prediction = LinearPath(velocity: (1, 0))

Render loop (ticks 2-49):
  PathInterpolationSystem runs:
    - Tick 2: interpolate → (101, 100)
    - Tick 3: interpolate → (102, 100)
    - Tick 49: interpolate → (149, 100)

  Renderer draws deer at interpolated position

Receive correction at tick 50:
  - Update basePosition = (150, 101)
  - Update baseTick = 50
  - Update prediction = LinearPath(velocity: (0, 1))

Render loop continues with new prediction...
```

## Performance Projections

### Combined with Spatial Culling

**Scenario**: 1000 entities, viewport shows 100, entities change direction every 50 ticks

**Without optimization**:
- 1000 entities × 20 TPS = 20,000 updates/sec = **60 MB/min**

**With spatial culling only**:
- 100 visible × 20 TPS = 2,000 updates/sec = **6 MB/min** (90% reduction)

**With spatial culling + path prediction**:
- 100 visible × 0.4 updates/sec (change every 50 ticks) = 40 updates/sec = **120 KB/min** (98% reduction!)

### Breakdown

**Spatial filtering** (what to sync):
- Only entities in viewport
- 90% bandwidth reduction

**Temporal filtering** (when to sync):
- Only when movement changes
- Additional 98% reduction on visible entities

**Combined**: 99.8% total bandwidth reduction!

## What's Still Needed (Phase 2)

### 1. Delta Synchronization in Worker

Replace full-state broadcast with delta updates:

```typescript
class DeltaSyncSystem implements System {
  priority = 1000; // Run last

  execute(world: World): void {
    const dirtyEntities = world.query()
      .with('dirty_for_sync')
      .executeEntities();

    if (dirtyEntities.length === 0) return;

    const delta: DeltaUpdate = {
      tick: world.tick,
      updates: dirtyEntities.map(e => ({
        entityId: e.id,
        position: e.getComponent('position'),
        prediction: e.getComponent('path_prediction')?.prediction,
      })),
    };

    // Broadcast delta instead of full state
    this.broadcastDelta(delta);

    // Clear dirty flags
    for (const entity of dirtyEntities) {
      entity.removeComponent('dirty_for_sync');
    }
  }
}
```

### 2. Delta Message Protocol

Add new message type:

```typescript
type WorkerToWindowMessage =
  | { type: 'tick'; tick; state; timestamp }  // Full state (fallback)
  | { type: 'delta'; delta: DeltaUpdate }     // Delta update (primary)
  | ...
```

### 3. Window Delta Handler

Update GameBridge to handle delta messages:

```typescript
private handleDeltaUpdate(delta: DeltaUpdate): void {
  for (const update of delta.updates) {
    let entity = this.viewWorld.getEntity(update.entityId);

    if (!entity) {
      entity = this.viewWorld.createEntity(update.entityId);
    }

    // Update position
    entity.addComponent({ type: 'position', ...update.position });

    // Update interpolator
    if (update.prediction) {
      entity.addComponent({
        type: 'path_interpolator',
        prediction: update.prediction,
        basePosition: update.position,
        baseTick: delta.tick,
      });
    }
  }

  // Remove deleted entities
  for (const entityId of delta.removed || []) {
    this.viewWorld.removeEntity(entityId);
  }
}
```

### 4. System Registration

**Worker** (`shared-universe-worker.ts`):
```typescript
// After setupGameSystems, add:
gameLoop.systemRegistry.register(new PathPredictionSystem());
gameLoop.systemRegistry.register(new DeltaSyncSystem());
```

**Windows** (`game-bridge.ts`):
```typescript
// Add to view World:
viewWorld.systemRegistry.register(new PathInterpolationSystem());
```

### 5. Configuration Toggle

Enable/disable path prediction:

```typescript
const config: WorkerConfig = {
  enablePathPrediction: true,  // NEW
  enableSpatialCulling: true,
  ...
};
```

## Testing Plan

### Unit Tests

1. **predictPosition()** - Each path type
2. **calculateDeviation()** - Distance calculation
3. **PathPredictionSystem** - Prediction creation and deviation detection
4. **PathInterpolationSystem** - Interpolation correctness

### Integration Tests

1. Spawn entity with constant velocity → verify LinearPath created
2. Entity changes direction → verify new prediction sent
3. Window interpolates correctly for 50 ticks
4. Correction received → verify smooth transition

### Performance Tests

1. Measure bandwidth with 100 entities (no prediction)
2. Measure bandwidth with 100 entities (with prediction)
3. Compare against baseline
4. Verify 95%+ reduction

## Files Created

- `packages/shared-worker/src/path-prediction-types.ts` (200 lines)
- `packages/shared-worker/src/PathPredictionSystem.ts` (250 lines)
- `packages/shared-worker/src/PathInterpolationSystem.ts` (130 lines)
- `packages/shared-worker/PATH_PREDICTION_PHASE1_COMPLETE.md` (this file)

## Files Modified

- `packages/shared-worker/src/index.ts` - Added exports

## Next Steps

**Phase 2: Integration** (Ready to implement)

1. Create DeltaSyncSystem
2. Add delta message type to protocol
3. Update worker to send deltas
4. Update GameBridge to handle deltas
5. Register systems in worker and windows
6. Add configuration toggle

**Phase 3: Testing**

1. Test with standalone demo
2. Benchmark bandwidth savings
3. Tune deviation thresholds
4. Test with 100+ entities
5. Verify visual smoothness

**Phase 4: Optimization**

1. Implement full wander simulation (deterministic)
2. Add priority system (agents > animals > plants)
3. Adaptive deviation thresholds
4. Batching and compression

## Conclusion

Phase 1 infrastructure is **complete and ready** for integration. All types, systems, and helpers are implemented and exported.

**Current state**:
- ✅ Spatial culling (90% reduction)
- ✅ Path prediction infrastructure (types, systems)
- ⏳ Delta protocol integration (Phase 2)

**Expected final performance**:
- 95-99% bandwidth reduction
- Smooth interpolation
- No visual jitter
- Minimal CPU overhead

Ready to proceed with Phase 2 (Delta Integration) when you give the word!
