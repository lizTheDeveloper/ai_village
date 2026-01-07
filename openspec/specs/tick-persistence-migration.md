# Tick Persistence Migration Plan

## Problem Statement

When the browser refreshes and world state is loaded, `world.tick` resets to 0 while entities retain their old `createdAt` values. This causes all time-delta calculations to produce incorrect results.

**Current broken flow:**
1. Browser refresh → new `GameLoop` → new `WorldImpl` with `_tick = 0`
2. Save is loaded → entities restored with original `createdAt` values (e.g., 5000)
3. Systems compute `world.tick - entity.createdAt` → `0 - 5000` = negative or wrapped value
4. All timing-based logic breaks: pregnancies, cooldowns, behavior states, caches

## Root Causes

### 1. `world.tick` Not Serialized
**File:** `packages/core/src/persistence/WorldSerializer.ts:71`
```typescript
universeTick: '0',  // Will be set by MultiverseCoordinator  ← NEVER ACTUALLY SET
```

### 2. `world.tick` Not Restored
**File:** `packages/core/src/persistence/WorldSerializer.ts:100-148`
```typescript
async deserializeWorld(snapshot: UniverseSnapshot, world: World): Promise<void> {
  // ... restores entities, terrain, zones
  // ❌ Never restores world._tick from snapshot.time.universeTick
}
```

### 3. `Entity.createdAt` Not Serialized
**File:** `packages/core/src/persistence/WorldSerializer.ts:199-204`
```typescript
return {
  id: entity.id,
  components,  // ❌ No createdAt field
};
```

### 4. `Entity.createdAt` Hardcoded on Load
**File:** `packages/core/src/persistence/WorldSerializer.ts:239`
```typescript
const entity = new EntityImpl(data.id, 0);  // ❌ Always 0
```

## Migration Plan

### Phase 1: Core Tick Persistence

#### 1.1 Add `setTick` Method to World
**File:** `packages/core/src/ecs/World.ts`

Add to `WorldMutator` interface:
```typescript
/** Set tick (only for deserialization) */
setTick(tick: Tick): void;
```

Add to `WorldImpl`:
```typescript
setTick(tick: Tick): void {
  this._tick = tick;
  // Also update gameTime.totalTicks for consistency
  this._gameTime.totalTicks = tick;
}
```

#### 1.2 Serialize `world.tick`
**File:** `packages/core/src/persistence/WorldSerializer.ts`

In `serializeWorld()`, change:
```typescript
time: {
  universeId,
  universeTick: world.tick.toString(),  // ← Actually save the tick
  // ...rest
}
```

#### 1.3 Restore `world.tick`
**File:** `packages/core/src/persistence/WorldSerializer.ts`

In `deserializeWorld()`, add:
```typescript
// Restore tick state
const universeTick = parseInt(snapshot.time.universeTick, 10);
if (!isNaN(universeTick) && universeTick > 0) {
  (worldImpl as WorldMutator).setTick(universeTick);
}
```

### Phase 2: Entity.createdAt Persistence

#### 2.1 Update VersionedEntity Schema
**File:** `packages/core/src/persistence/types.ts`

```typescript
export interface VersionedEntity extends Versioned {
  $schema: 'https://aivillage.dev/schemas/entity/v1';
  id: string;
  createdAt: number;  // ← Add this field
  components: VersionedComponent[];
}
```

#### 2.2 Serialize Entity.createdAt
**File:** `packages/core/src/persistence/WorldSerializer.ts`

In `serializeEntity()`:
```typescript
return {
  $schema: 'https://aivillage.dev/schemas/entity/v1',
  $version: 1,
  id: entity.id,
  createdAt: entity.createdAt,  // ← Add this
  components,
};
```

#### 2.3 Restore Entity.createdAt
**File:** `packages/core/src/persistence/WorldSerializer.ts`

In `deserializeEntity()`:
```typescript
// Use saved createdAt, fallback to 0 for old saves
const createdAt = data.createdAt ?? 0;
const entity = new EntityImpl(data.id, createdAt);
```

### Phase 3: System Audit - lastTick Caches

Many systems cache their last update tick. After a load, these caches may contain stale values from before the refresh. Systems need to handle tick discontinuity.

#### Systems with Private `lastTick` Caches (Must Reset on Load)

| System | Field | Location |
|--------|-------|----------|
| `TemperatureSystem` | `buildingCacheLastUpdate` | Line 89 |
| `ParentingSystem` | `lastUpdate` | Line 56 |
| `MovementSystem` | `cacheValidUntilTick` | Line 81 |
| `SimulationScheduler` | `lastUpdateTick` Map | Line 282 |
| `PathPredictionSystem` | `lastSentTick` | Various |
| `LandmarkNamingSystem` | `lastNamingAttempt` | Cooldown tracking |
| `CourtshipSystem` | `lastCourtshipAttempt` | Cooldown tracking |

#### Solution: EventBus-Driven Cache Invalidation

**Option A: Emit `world:loaded` Event**
```typescript
// In deserializeWorld, after restoring tick:
worldImpl.eventBus.emit({ type: 'world:loaded', tick: universeTick });
```

Systems subscribe and invalidate caches:
```typescript
eventBus.on('world:loaded', () => {
  this.lastUpdateTick = 0;  // Reset cache
});
```

**Option B: Tick Discontinuity Detection**
Systems check if current tick < their cached tick:
```typescript
if (world.tick < this.lastUpdateTick) {
  // Tick went backwards (load occurred), reset
  this.lastUpdateTick = 0;
}
```

### Phase 4: Component Tick Fields

Some components store tick values internally (not just `createdAt`). These are already serialized with the component and should work correctly IF the world tick is restored.

**Examples of components with tick fields:**
- `PregnancyComponent.conceptionTick`
- `BehaviorState.startedTick`
- `CooldownComponent.lastUsedTick`
- `VisionComponent.deliveredAt`

These need no migration - they're serialized as component data. Once `world.tick` is correctly restored, the delta calculations will work.

## Implementation Order

1. **Phase 1** - Core tick persistence (blocking bug fix)
   - Add `World.setTick()`
   - Serialize tick in `WorldSerializer.serializeWorld()`
   - Restore tick in `WorldSerializer.deserializeWorld()`

2. **Phase 2** - Entity createdAt persistence
   - Update `VersionedEntity` schema
   - Serialize in `serializeEntity()`
   - Restore in `deserializeEntity()`

3. **Phase 3** - System cache invalidation
   - Add `world:loaded` event
   - Update systems with cached ticks to subscribe

## Backward Compatibility

Old save files won't have:
- `universeTick` (or it will be '0')
- `entity.createdAt`

Handle gracefully:
```typescript
// In deserializeWorld
const universeTick = parseInt(snapshot.time.universeTick || '0', 10);
if (universeTick > 0) {
  worldImpl.setTick(universeTick);
}
// else: leave at 0, old save - entities will have fresh createdAt values anyway

// In deserializeEntity
const createdAt = data.createdAt ?? 0;  // Default for old saves
```

## Testing

1. **Save/Load Round-Trip Test**
   - Create world, advance 1000 ticks
   - Spawn entity (createdAt = 1000)
   - Save
   - Reload browser
   - Load save
   - Verify: `world.tick === 1000`
   - Verify: entity `createdAt === 1000`
   - Verify: `world.tick - entity.createdAt === 0`

2. **Timing Logic Test**
   - Start pregnancy at tick 100
   - Advance 200 ticks (tick = 300)
   - Save and reload
   - Verify: pregnancy progress = 200 ticks (not 300)

3. **Cache Invalidation Test**
   - Run system with cached lastTick = 500
   - Save at tick 500
   - Reload
   - Verify: system doesn't skip updates due to stale cache

## Files to Modify

- `packages/core/src/ecs/World.ts` - Add `setTick()` method
- `packages/core/src/persistence/types.ts` - Add `createdAt` to `VersionedEntity`
- `packages/core/src/persistence/WorldSerializer.ts` - Serialize/restore tick and createdAt
- `packages/core/src/loop/GameLoop.ts` - Emit `world:loaded` event after load
- Various systems - Subscribe to `world:loaded` for cache invalidation
