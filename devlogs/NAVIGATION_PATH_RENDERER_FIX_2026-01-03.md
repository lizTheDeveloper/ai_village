# Navigation Path Renderer Fix

**Date**: 2026-01-03
**Issue**: `Uncaught TypeError: Cannot read properties of undefined (reading 'get')` at Renderer.ts:2299
**Status**: ✅ Fixed

---

## Problem

The renderer was crashing when trying to draw navigation paths for selected entities:

```
Renderer.ts:2299 Uncaught TypeError: Cannot read properties of undefined (reading 'get')
    at Renderer.drawNavigationPath (Renderer.ts:2299:48)
```

### Root Cause

**Type Mismatch**: The info panels (`AgentInfoPanel`, `AnimalInfoPanel`) return lightweight objects of type `{ id: string }`, but the `Renderer.drawNavigationPath()` method expected a full `Entity` object with a `components` property.

**Call Chain**:
1. `main.ts:3110` - Gets selected entity from panels: `panels.agentInfoPanel.getSelectedEntity()`
2. Panels return `{ id: string }` - NOT a full Entity
3. `main.ts:3111` - Passes this to `renderer.render(world, selectedEntity)`
4. `Renderer.drawNavigationPath()` tries to call `selectedEntity.components.get('position')`
5. **CRASH** - `selectedEntity.components` is undefined

### Why This Design?

Panels storing entity IDs instead of full entity references is correct—it prevents stale references and ensures we always get fresh data from the world. The bug was that `drawNavigationPath()` didn't handle this pattern.

---

## Solution

Updated `Renderer.drawNavigationPath()` to:
1. Accept both full `Entity` objects AND lightweight `{ id: string }` objects
2. Look up the full entity from the world when needed
3. Use the proper `Entity.getComponent()` API instead of accessing `components` directly

### Code Changes

**File**: `packages/renderer/src/Renderer.ts`

#### 1. Updated render() method signature (line 440):
```typescript
// BEFORE
render(world: World, selectedEntity?: Entity): void

// AFTER
render(world: World, selectedEntity?: Entity | { id: string }): void
```

#### 2. Updated drawNavigationPath() method (lines 2296-2314):
```typescript
// BEFORE
private drawNavigationPath(selectedEntity?: Entity): void {
  if (!selectedEntity) return;

  const position = selectedEntity.components.get('position') as PositionComponent | undefined;
  const steering = selectedEntity.components.get('steering') as SteeringComponent | undefined;
  // ...
}

// AFTER
private drawNavigationPath(world: World, selectedEntity?: Entity | { id: string }): void {
  if (!selectedEntity) return;

  // Get the full entity from world if we only have an ID
  let entity: Entity | undefined;
  if ('components' in selectedEntity) {
    // Already a full Entity
    entity = selectedEntity;
  } else {
    // Just an ID, look up from world
    entity = world.getEntity(selectedEntity.id);
  }

  if (!entity) return;

  const position = entity.getComponent('position') as PositionComponent | undefined;
  const steering = entity.getComponent('steering') as SteeringComponent | undefined;
  // ...
}
```

#### 3. Updated call site (line 883):
```typescript
// BEFORE
this.drawNavigationPath(selectedEntity);

// AFTER
this.drawNavigationPath(world, selectedEntity);
```

#### 4. Updated drawAgentBuildingInteractions() signature for consistency (line 2170):
```typescript
// BEFORE
private drawAgentBuildingInteractions(world: World, selectedEntity?: Entity): void

// AFTER
private drawAgentBuildingInteractions(world: World, selectedEntity?: Entity | { id: string }): void
```

**Note**: This method already worked correctly (only compared IDs, never accessed `components`), but updated signature for type consistency.

---

## Type Safety

The fix properly handles both cases:
- **Full Entity**: Uses it directly
- **ID-only object**: Looks up fresh entity from world

This pattern is safer than storing entity references because:
1. Entities can be deleted/modified between frames
2. World is always the source of truth
3. No risk of stale component data

---

## Verification

✅ **Type check**: `'components' in selectedEntity` safely distinguishes Entity from `{ id: string }`
✅ **Null safety**: Returns early if entity not found in world
✅ **Component access**: Uses proper `getComponent()` API
✅ **Consistent**: Both panels now work with same type signature

---

## Impact

**Before**: Game crashed whenever user selected an entity with navigation (steering component)
**After**: Navigation paths render correctly for all selected entities

**Files Modified**:
- `packages/renderer/src/Renderer.ts` (1 file, 3 method signatures updated)

**Lines Changed**: ~20 lines

---

## Pattern for Future

When accessing entity data in the renderer:
```typescript
✅ CORRECT: Accept Entity | { id: string }, look up from world
❌ WRONG: Assume panels return full Entity objects
```

Panel methods returning entity references should be typed as `{ id: string } | null` to make this explicit.
