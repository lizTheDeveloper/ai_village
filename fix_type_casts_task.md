# Task: Fix `as any` Type Casts

## Overview
Remove all `as any` type casts from non-test files in metrics and shared-worker packages and fix HeadlessCitySimulator/main.ts. Replace with proper types based on component definitions.

## Files to Fix

### 1. PathPredictionSystem.ts
Location: `/Users/annhoward/src/ai_village/custom_game_engine/packages/shared-worker/src/PathPredictionSystem.ts`

**Type Definitions:**
- `PositionComponent`: `{ x: number; y: number; z: number; chunkX: number; chunkY: number }`
- `VelocityComponent`: `{ vx: number; vy: number }`
- `SteeringComponent`: `{ target?: { x: number; y: number }; maxSpeed: number; arrivalRadius: number }`
- `WanderComponent`: `{ wanderRadius: number; wanderDistance: number; wanderJitter: number }`

**Fixes needed (already started line 77):**
- Line 115: `steering && (steering as any).target` → `steering as SteeringComponent` and access `.target`
- Line 120: `(velocity as any).x` → `velocity as VelocityComponent` and access `.vx` NOTE: VelocityComponent uses `vx`/`vy` not `x`/`y`
- Line 139: `velocity: { x: (velocity as any).x, y: (velocity as any).y }` → properly access vx/vy and map to x/y
- Line 147: `lastSentPosition: { x: (position as any).x, y: (position as any).y }` → `position as PositionComponent`
- Line 165-168: wander properties access
- Line 176, 194-197, 204, 227: similar position/velocity access patterns

### 2. DeltaSyncSystem.ts
Location: `/Users/annhoward/src/ai_village/custom_game_engine/packages/shared-worker/src/DeltaSyncSystem.ts`

**Fixes:**
- Line 99: `(dirtyFlag as any).reason` → `dirtyFlag as { reason: 'new' | 'path_changed' | 'forced' }`
- Line 103-104: position/prediction access

### 3. CanonEventRecorder.ts (both packages)
Locations:
- `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/metrics/CanonEventRecorder.ts`
- `/Users/annhoward/src/ai_village/custom_game_engine/packages/metrics/src/CanonEventRecorder.ts`

**Type Definitions:**
- `AgentComponent`: `{ name: string; generation?: number; birthTick?: number }`
- `SoulIdentityComponent`: `{ soulId: string }`
- `IncarnationComponent`: `{ previousLives?: Array<any> }`
- `TimeComponent`: `{ tick: number; day: number }`
- `RelationshipComponent`: `{ type: 'union' | string; isMarried?: boolean }`

**Fixes (same in both files):**
- Line 268: `world.getComponent(id, CT.Relationship) as any` → proper Relationship type with union checking
- Lines 281, 306, 307, 310, 360: Agent/Soul/Incarnation component access
- Lines 475, 486: Time component access

### 4. LiveEntityAPI.ts (both packages)
Locations:
- `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/metrics/LiveEntityAPI.ts`
- `/Users/annhoward/src/ai_village/custom_game_engine/packages/metrics/src/LiveEntityAPI.ts`

**Fixes:**
- `World` type assertions: Define proper World interface with `_addEntity`, `addComponent` methods
- `IdentityComponent` access: Use proper type `{ name: string; age: number; species: string }`
- Lines with `this.world as any` for `_addEntity` calls
- Lines with `(world as any).addComponent` calls

### 5. MetricsStreamClient.ts
Location: `/Users/annhoward/src/ai_village/custom_game_engine/packages/metrics/src/MetricsStreamClient.ts`

**Fix:**
- Line 136: `(globalThis as any).import?.meta?.env` → Use proper type: `typeof globalThis & { import?: { meta?: { env?: Record<string, unknown> } } }`

### 6. HeadlessCitySimulator.ts
Location: `/Users/annhoward/src/ai_village/custom_game_engine/packages/city-simulator/src/HeadlessCitySimulator.ts`

**World Internal API type:**
```typescript
interface WorldInternal extends World {
  _addEntity(entity: Entity): void;
  _worldEntityId: string;
}
```

**Fixes:**
- Lines 247-248, 265, 268, 283: Use `(world as WorldInternal)`
- Lines 301, 381: `(this.gameLoop as any).tick(0.05)` → GameLoop should have public tick method
- Lines 409-410, 420, 429: Type World properly or use interface
- Lines 501, 527, 541, 551, 560, 588, 609, 630: `(world as WorldInternal)._addEntity`
- Lines 586, 607, 628: Resource component should have proper interface

### 7. main.ts (city-simulator)
Location: `/Users/annhoward/src/ai_village/custom_game_engine/packages/city-simulator/src/main.ts`

**Fixes:**
- Line 239: `agent.getComponent('position') as any` → use PositionComponent type
- Lines 273-274: `(window as any)` → `window as Window & { simulator: HeadlessCitySimulator; ui: UI }`

## Instructions

1. For each file, read it completely
2. Identify all `as any` casts
3. Determine the actual type based on the component definitions above
4. Replace with proper type annotations
5. DO NOT use `as unknown as X` - that's still a type-cast bandaid
6. For component access, use proper interfaces or type guards
7. Velocity uses `vx`/`vy` NOT `x`/`y` - must map when converting to position format

## VelocityComponent Special Case
CRITICAL: VelocityComponent uses `vx`/`vy` not `x`/`y`. When creating `{x, y}` objects from velocity:
```typescript
const velocity = component as VelocityComponent;
const velocityAsXY = { x: velocity.vx, y: velocity.vy };
```

## After Fixing
Run: `cd /Users/annhoward/src/ai_village/custom_game_engine && npm run build`

Report:
- Files changed
- Types added/used
- Any build errors
