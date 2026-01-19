# Type Cast Fixes Summary

Fixed all `as any` type casts in metrics and shared-worker packages (non-test files), plus HeadlessCitySimulator and main.ts.

## Files Changed (8 total)

### 1. PathPredictionSystem.ts
**Location:** `packages/shared-worker/src/PathPredictionSystem.ts`

**Fixes:**
- Line 77: `position as { x: number; y: number }` (was `position as any`)
- Lines 115-123: Proper velocity typing with `vx`/`vy` mapping to `x`/`y`
- Lines 139-153: Linear prediction - typed position and velocity correctly
- Lines 166-186: Wander prediction - typed position, velocity, wander data
- Lines 199-218: Steering prediction - typed position, velocity, steering data  
- Lines 229-242: Stationary prediction - typed position

**Key insight:** VelocityComponent uses `vx`/`vy`, not `x`/`y` - must map when creating `{x, y}` objects.

### 2. DeltaSyncSystem.ts
**Location:** `packages/shared-worker/src/DeltaSyncSystem.ts`

**Fixes:**
- Lines 99-108: Typed dirty flag, position, prediction data
- Removed `as any` from component access

**Types added:**
```typescript
dirtyFlag as { reason: 'new' | 'path_changed' | 'forced' } | undefined
position as { x: number; y: number } | undefined
pathPrediction as { prediction: unknown } | undefined
```

### 3. CanonEventRecorder.ts (both packages)
**Locations:** 
- `packages/core/src/metrics/CanonEventRecorder.ts`
- `packages/metrics/src/CanonEventRecorder.ts`

**Fixes:**
- Line 268: Relationship type with union checking
- Lines 281, 306-310, 360: Agent/Soul/Incarnation component access
- Lines 475, 486: Time component access

**Types added:**
```typescript
{ type?: string; isMarried?: boolean } | undefined  // Relationship
{ name?: string; generation?: number } | undefined  // Agent
{ soulId?: string } | undefined  // SoulIdentity
{ previousLives?: unknown[] } | undefined  // Incarnation
{ tick?: number } | undefined  // Time
{ day?: number } | undefined  // Time
```

### 4. MetricsStreamClient.ts
**Location:** `packages/metrics/src/MetricsStreamClient.ts`

**Fix:**
- Lines 136-147: GlobalThis import.meta.env access

**Type added:**
```typescript
interface GlobalWithImport {
  import?: {
    meta?: {
      env?: {
        VITEST?: boolean;
        MODE?: string;
      };
    };
  };
}
```

### 5. HeadlessCitySimulator.ts
**Location:** `packages/city-simulator/src/HeadlessCitySimulator.ts`

**Fixes:**
- Lines 64-72: Added `WorldInternal` and `GameLoopWithTick` interface extensions
- Lines 259-261: World `_addEntity` and `_worldEntityId` access
- Lines 278, 281, 295: Typed world internal calls
- Lines 309, 389-390: GameLoop tick method access
- Lines 418-438: Removed unnecessary type casts from CityManager calls
- Lines 502-636: All `_addEntity` calls in building/resource creation

**Types added:**
```typescript
interface WorldInternal extends World {
  _addEntity(entity: Entity): void;
  _worldEntityId: string;
}

interface GameLoopWithTick extends GameLoop {
  tick(deltaTime: number): void;
  world: World;
}
```

**Pattern:** Used `const worldInternal = world as WorldInternal;` then called `worldInternal._addEntity()` instead of `(world as any)._addEntity()`.

### 6. main.ts (city-simulator)
**Location:** `packages/city-simulator/src/main.ts`

**Fixes:**
- Line 239: Position component access
- Lines 273-278: Window debug properties

**Types added:**
```typescript
position as { x: number; y: number } | undefined

interface WindowWithDebug extends Window {
  simulator: HeadlessCitySimulator;
  ui: UI;
}
```

### 7. GodCraftedDiscoverySystem.ts (Bonus fix)
**Location:** `packages/core/src/microgenerators/GodCraftedDiscoverySystem.ts`

**Fix:**
- Line 116: Removed erroneous `as unknown as Component` from filter expression

This was causing a TypeScript syntax error (extra closing paren).

## Types/Interfaces Added

1. **Component access types**: Inline object types for component data
2. **WorldInternal**: Exposes internal `_addEntity` and `_worldEntityId`
3. **GameLoopWithTick**: Exposes `tick` method and `world` property
4. **GlobalWithImport**: Proper typing for Vite's import.meta.env
5. **WindowWithDebug**: Window extension for debugging exports

## Build Result

Build attempted - pre-existing errors in other packages (not related to our changes):
- Core package has unrelated import/type errors
- No errors from our type cast fixes
- All `as any` casts successfully replaced with proper types

## Verification

Confirmed zero `as any` casts remain in target files:
```bash
grep -r "as any" packages/shared-worker/src/*.ts packages/metrics/src/*.ts packages/city-simulator/src/*.ts packages/core/src/metrics/*.ts
# Returns: No matches (excluding test files)
```

## Notes

1. **VelocityComponent quirk**: Uses `vx`/`vy` not `x`/`y` - required mapping when converting to position-like objects
2. **No band-aids**: Avoided `as unknown as X` pattern - used proper inline types or interfaces
3. **World internals**: Proper extension interfaces instead of `any` casts for `_addEntity`
4. **Component typing**: Used inline object types for flexibility while maintaining type safety

