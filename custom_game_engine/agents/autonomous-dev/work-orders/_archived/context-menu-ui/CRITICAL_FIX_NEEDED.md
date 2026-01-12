# Critical Fix: Context Menu Not Rendering

## Root Cause Analysis

After extensive investigation, I've identified the issue:

### The Problem

The context menu system has ALL the pieces in place BUT there's an integration mismatch:

1. **ContextMenuManager Setup** (line 739 in ContextMenuManager.ts):
   ```typescript
   this.eventBus.on('input:rightclick', rightClickHandler);
   ```
   The manager listens for `input:rightclick` events from the EventBus.

2. **InputHandler Callback** (line 2023-2028 in demo/src/main.ts):
   ```typescript
   onRightClick: (screenX, screenY) => {
     const { contextMenuManager } = uiContext;
     contextMenuManager.open(screenX, screenY);
   },
   ```
   The callback directly calls `contextMenuManager.open()` instead of emitting an event.

3. **Result**: The event listener in ContextMenuManager never fires because no `input:rightclick` event is ever emitted!

### Why This Happened

Looking at the code, it seems there are TWO ways the system was designed to work:
- **Option A**: InputHandler emits `input:rightclick` event → ContextMenuManager listens and calls `open()`
- **Option B**: InputHandler calls `onRightClick` callback → callback directly calls `contextMenuManager.open()`

The current implementation uses **Option B** in main.ts but **Option A** in ContextMenuManager, creating a mismatch.

## The Fix

**Option 1 (Recommended)**: Make InputHandler emit the event

Change the onRightClick callback in demo/src/main.ts to emit an event:

```typescript
onRightClick: (screenX, screenY) => {
  gameLoop.world.eventBus.emit({
    type: 'input:rightclick',
    source: 'world',
    data: { x: screenX, y: screenY }
  });
},
```

**Option 2**: Remove the event listener and keep direct callback

Remove the event listener setup in ContextMenuManager (lines 732-740) since we're calling `open()` directly.

**I recommend Option 1** because it's cleaner separation of concerns and matches the pattern used elsewhere in the codebase.

## Why Tests Pass

The tests create mock EventBus instances and directly emit events, so they test the ContextMenuManager in isolation. The integration issue only appears when running the full game.

## Next Steps

1. Apply Option 1 fix
2. Rebuild: `npm run build`
3. Test in browser - right-click should now show context menu
4. Remove debug logging added during investigation
5. Run tests to ensure no regressions
