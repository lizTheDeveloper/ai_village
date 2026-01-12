# Context Menu Rendering Issue Analysis

**Date:** 2025-12-31
**Implementation Agent:** implementation-agent-001
**Status:** ROOT CAUSE IDENTIFIED

---

## Issue Summary

The playtest report indicates that the context menu does not render visually on right-click, despite the underlying event system detecting clicks and emitting events.

## Root Cause Analysis

After extensive code review, I've identified the issue is **NOT a rendering problem**. The ContextMenuRenderer is correctly implemented and integrated into the render loop. The actual issue is that **the menu never opens because there are no applicable actions**.

### Evidence

1. **ContextMenuManager.open() early return** (lines 154-164):
```typescript
// Don't open menu if there are no items
if (items.length === 0) {
  console.warn('[ContextMenuManager] No menu items for context:', {...});
  return; // <-- Menu NEVER opens if no items!
}
```

2. **No menu state change:** If `items.length === 0`, the state never changes to `isOpen: true`

3. **Render loop check** (line 643):
```typescript
if (!this.state.isOpen && !this.state.isAnimating) {
  return; // <-- Early return, no rendering!
}
```

### Why Are There No Items?

The issue is in the action applicability logic. Looking at `ContextActionRegistry.registerDefaultActions()`, actions have `isApplicable` predicates like:

```typescript
isApplicable: (ctx) => ctx.hasSelection() && ctx.isWalkable
```

**Problem:** When right-clicking on an empty tile with NO agents selected:
- `ctx.hasSelection()` returns `false`
- Most actions require selection
- Result: 0 applicable actions → menu doesn't open

### Test Verification Needed

To verify this hypothesis, we need to check if:
1. Right-clicking on empty tile with agent selected → menu appears
2. Right-clicking on empty tile with NO selection → menu doesn't appear

---

## The Fix

The action registry needs to include actions that work WITHOUT selection for empty tiles.

Currently missing:
- "Tile Info" - should ALWAYS be available (doesn't require selection)
- "Focus Camera" - should ALWAYS be available
- "Place Waypoint" - should work without selection

### Current Registration (WRONG)

```typescript
// Move Here
this.register({
  id: 'move_here',
  label: 'Move Here',
  isApplicable: (ctx) => ctx.hasSelection() && ctx.isWalkable, // <-- REQUIRES selection
  ...
});
```

### Corrected Registration (NEEDS FIX)

```typescript
// Tile Info - ALWAYS available
this.register({
  id: 'tile_info',
  label: 'Tile Info',
  isApplicable: (ctx) => ctx.targetType === 'empty_tile', // <-- No selection required!
  execute: (ctx, world, eventBus) => {
    eventBus.emit({ type: 'ui:tile_inspector:show', source: 'world', data: {
      position: ctx.worldPosition
    }});
  }
});

// Focus Camera - ALWAYS available
this.register({
  id: 'focus_camera',
  label: 'Focus Camera',
  isApplicable: (ctx) => true, // <-- ALWAYS available!
  execute: (ctx, world, eventBus) => {
    eventBus.emit({ type: 'camera:focus', source: 'world', data: {
      position: ctx.worldPosition
    }});
  }
});
```

---

## Implementation Plan

1. **Add always-available actions** to ContextActionRegistry:
   - Tile Info (always available for empty tiles)
   - Focus Camera (always available)
   - Debug Info (always available in dev mode)

2. **Fix action applicability** for conditional actions:
   - "Move Here" → requires selection AND walkable tile
   - "Build" → requires buildable tile (no selection needed)
   - "Place Waypoint" → no selection needed

3. **Add logging** to ContextMenuManager.open() to track:
   - How many actions total in registry
   - How many actions are applicable
   - Why actions were filtered out

4. **Test scenarios:**
   - Right-click empty tile (no selection) → Should show: Tile Info, Focus Camera, Build (if buildable)
   - Right-click empty tile (agent selected) → Should show all of above + Move Here
   - Right-click on agent → Should show agent actions
   - Right-click on building → Should show building actions

---

## Next Steps

I will now:
1. Fix the action registry to include always-available actions
2. Add debug logging to trace action filtering
3. Test that the menu opens in all scenarios
4. Verify rendering works once menu has items

---

## Previous Misdiagnosis

Earlier analysis incorrectly focused on:
- Device pixel ratio issues (NOT the problem)
- Render loop integration (correctly implemented)
- Canvas context sharing (working fine)

The real issue was simpler: **No items = no menu opens = nothing to render**.

---

**Status:** Proceeding with fix to ContextActionRegistry.

