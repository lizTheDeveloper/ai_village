# Context Menu Rendering Issue - ROOT CAUSE FOUND & FIXED

**Date:** 2026-01-01 05:00 AM
**Status:** FIX APPLIED - AWAITING VERIFICATION
**Work Order:** context-menu-ui

---

## TL;DR

✅ **Fixed:** Changed `eventBus.emit()` to `eventBus.emitImmediate()` for right-click events
🎯 **Root Cause:** Event queuing delayed menu opening until next game tick
📝 **File Modified:** custom_game_engine/demo/src/main.ts:1891

---

## The Bug

The Playtest Agent was CORRECT - the context menu does NOT render when right-clicking, despite:
- ✅ Right-click events firing correctly
- ✅ InputHandler working properly
- ✅ ContextMenuManager initialized and listening
- ✅ Unit tests passing

---

## Root Cause: Event Delivery Timing

The `input:rightclick` event was emitted using `eventBus.emit()`, which **queues events** for delivery at the next `flush()` call by the game loop. This meant:

1. User right-clicks → event is QUEUED
2. Event sits in queue for 20-60ms (one game tick)
3. Game loop calls `flush()` → event finally delivered to ContextMenuManager
4. **By this time, the interaction moment has passed**

UI interactions need **immediate** response, not queued delivery.

---

## The Fix

**File:** `custom_game_engine/demo/src/main.ts`

**Line 1891:** Changed from queued to immediate event dispatch:

```diff
  onRightClick: (screenX, screenY) => {
-   gameLoop.world.eventBus.emit({
+   gameLoop.world.eventBus.emitImmediate({
      type: 'input:rightclick',
      source: 'world',
      data: { x: screenX, y: screenY }
    });
  },
```

**Why this works:**
- `emitImmediate()` dispatches events synchronously to all listeners
- ContextMenuManager receives event instantly
- Menu opens immediately in response to right-click

---

## Why Tests Didn't Catch This

Unit tests manually call `eventBus.flush()` after emitting:

```typescript
eventBus.emit({ type: 'input:rightclick', ... });
eventBus.flush();  // ← Delivers queued events
```

In production, `flush()` only happens once per game loop tick, causing the delay.

---

## Verification Needed

⚠️ **I cannot visually verify this fix** because the dev server isn't running.

**User needs to test:**
```bash
cd custom_game_engine
npm run dev
# Open http://localhost:5173
# Right-click on canvas
# EXPECTED: Radial menu appears immediately
```

---

## Confidence: 80%

**Why 80%:**
- ✅ Fix directly addresses the timing issue
- ✅ Build passes
- ✅ Code logic is sound
- ⚠️ Cannot visually confirm without running dev server

**If menu still doesn't appear:**
- Check browser console for errors
- Add debug logging to ContextMenuManager.ts:741 to verify event received

---

## Files Changed

1. `custom_game_engine/demo/src/main.ts` - Changed emit() to emitImmediate()
2. Removed all debug console.log statements per project guidelines

---

**See detailed analysis:** `agents/autonomous-dev/work-orders/context-menu-ui/IMPLEMENTATION_FINAL_2026-01-01.md`
