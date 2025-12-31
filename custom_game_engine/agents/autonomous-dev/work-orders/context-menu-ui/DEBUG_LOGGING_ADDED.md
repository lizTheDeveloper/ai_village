# Debug Logging Added to Context Menu System

**Date:** 2025-12-31
**Status:** Awaiting Browser Testing

---

## Problem Analysis

The playtest report shows that the context menu does not render visually, despite the system appearing to be implemented. The root cause was unclear due to lack of logging.

## Debugging Changes Applied

### 1. InputHandler Logging (demo/src/main.ts:2025-2031)

Added logging when right-click event is emitted:

```typescript
onRightClick: (screenX, screenY) => {
  console.log('[InputHandler] Emitting input:rightclick event at:', screenX, screenY);
  gameLoop.world.eventBus.emit({
    type: 'input:rightclick' as any,
    source: 'world',
    data: { x: screenX, y: screenY }
  });
  console.log('[InputHandler] Event emitted, queue size:', (gameLoop.world.eventBus as any).eventQueue?.length);
},
```

**What this tells us:**
- Confirms right-click is being detected
- Shows the screen coordinates
- Shows the event queue size (to verify event is queued)

### 2. ContextMenuManager Event Handler Logging (ContextMenuManager.ts:754-768)

Added logging when event listener is set up and when events are received:

```typescript
private setupEventListeners(): void {
  console.log('[ContextMenuManager] Setting up event listeners');

  const rightClickHandler = (event: { data: { x: number; y: number } }) => {
    console.log('[ContextMenuManager] Received input:rightclick event:', event.data);
    if (event.data && typeof event.data.x === 'number' && typeof event.data.y === 'number') {
      this.open(event.data.x, event.data.y);
    } else {
      console.error('[ContextMenuManager] Invalid event data:', event.data);
    }
  };

  this.eventBus.on('input:rightclick', rightClickHandler);
  this.eventListeners.push({ event: 'input:rightclick', handler: rightClickHandler });
  console.log('[ContextMenuManager] Registered rightClickHandler for input:rightclick');
}
```

**What this tells us:**
- Confirms event listener is registered on startup
- Shows when events are received by the handler
- Validates event data structure

### 3. ContextMenuManager.open() Logging (ContextMenuManager.ts:120-170)

Added detailed logging throughout the menu opening process:

```typescript
public open(screenX: number, screenY: number): void {
  try {
    console.log('[ContextMenuManager] open() called at:', screenX, screenY);

    // ... position adjustment ...
    console.log('[ContextMenuManager] Adjusted position:', adjustedPos);

    // ... context creation ...
    console.log('[ContextMenuManager] Context created:', {
      targetType: context.targetType,
      targetEntity: context.targetEntity,
      worldPosition: context.worldPosition,
      isWalkable: context.isWalkable,
      isBuildable: context.isBuildable,
      hasSelection: context.hasSelection(),
      selectedCount: context.getSelectedCount()
    });

    // ... action filtering ...
    console.log('[ContextMenuManager] Applicable actions:', applicableActions.length, applicableActions.map(a => a.id));

    // ... item creation ...
    console.log('[ContextMenuManager] Menu items created:', items.length);

    // ... early return check ...
    if (items.length === 0) {
      console.warn('[ContextMenuManager] No menu items available - menu will not open');
      return;
    }
  } catch (error) {
    console.error('[ContextMenu] Error during open:', error);
    throw error;
  }
}
```

**What this tells us:**
- Whether `open()` is being called at all
- What context is detected (empty_tile, agent, building, etc.)
- How many applicable actions are found
- Whether the menu silently returns due to no items

---

## Expected Log Flow (Success Case)

When a user right-clicks on the game canvas, we should see:

```
[InputHandler] Emitting input:rightclick event at: 378 280
[InputHandler] Event emitted, queue size: 1
... (game loop tick runs, flushes events) ...
[ContextMenuManager] Received input:rightclick event: {x: 378, y: 280}
[ContextMenuManager] open() called at: 378 280
[ContextMenuManager] Adjusted position: {x: 378, y: 280}
[ContextMenuManager] Context created: {targetType: "empty_tile", targetEntity: null, worldPosition: {x: 150, y: 120}, isWalkable: true, isBuildable: true, hasSelection: false, selectedCount: 0}
[ContextMenuManager] Applicable actions: 4 ["focus_camera", "place_waypoint", "build", "tile_info"]
[ContextMenuManager] Menu items created: 4
[ContextMenuManager] Menu opened at: {x: 378, y: 280} items: 4
[ContextMenuManager] update() called - isOpen: true isAnimating: true progress: 0
[ContextMenuRenderer] Rendering menu at: 378 280 items: 4
```

---

## Expected Log Flow (Failure Cases)

### Case 1: Event Never Reaches Manager

```
[InputHandler] Emitting input:rightclick event at: 378 280
[InputHandler] Event emitted, queue size: 1
... (no further logs) ...
```

**Diagnosis:** EventBus is not flushing events, or event listener is not registered.

### Case 2: No Applicable Actions

```
[InputHandler] Emitting input:rightclick event at: 378 280
[ContextMenuManager] Received input:rightclick event: {x: 378, y: 280}
[ContextMenuManager] open() called at: 378 280
[ContextMenuManager] Adjusted position: {x: 378, y: 280}
[ContextMenuManager] Context created: {...}
[ContextMenuManager] Applicable actions: 0 []
[ContextMenuManager] Menu items created: 0
[ContextMenuManager] No menu items available - menu will not open
```

**Diagnosis:** Context detection or action filtering is broken. Since "Inspect Position" has `isApplicable: () => true`, it should ALWAYS be included.

### Case 3: Menu Opens But Doesn't Render

```
[InputHandler] Emitting input:rightclick event at: 378 280
[ContextMenuManager] Received input:rightclick event: {x: 378, y: 280}
[ContextMenuManager] open() called at: 378 280
[ContextMenuManager] Adjusted position: {x: 378, y: 280}
[ContextMenuManager] Context created: {...}
[ContextMenuManager] Applicable actions: 4 [...]
[ContextMenuManager] Menu items created: 4
[ContextMenuManager] Menu opened at: {x: 378, y: 280} items: 4
... (no update() or renderer logs) ...
```

**Diagnosis:** `contextMenuManager.update()` is not being called in the render loop, or renderer is failing silently.

---

## Next Steps for Testing

1. **Run the game** with these debug changes
2. **Right-click** on the canvas
3. **Check browser console** for the log sequence
4. **Compare to expected flows** above to identify the failure point

If the logs show the menu is opening but not rendering:
- Check that `panels.contextMenuManager.update()` is being called every frame (should see repeated "update() called" logs)
- Check that the renderer is drawing (should see "Rendering menu at" logs)

If the logs show no applicable actions:
- Investigate MenuContext.fromClick() implementation
- Verify ContextActionRegistry.getApplicableActions() is not filtering out all actions
- Check why "Inspect Position" action is being filtered out (should never happen since `isApplicable: () => true`)

---

## Build Status

✅ **PASS** - TypeScript compilation successful with debug logging added

All changes are additive (console.log statements only) and do not affect functionality. Ready for browser testing.
