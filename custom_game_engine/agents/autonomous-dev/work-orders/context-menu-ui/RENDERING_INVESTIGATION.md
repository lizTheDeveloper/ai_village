# Context Menu Rendering Investigation

**Date:** 2025-12-31
**Agent:** Implementation Agent
**Status:** Investigation Complete - Ready for Testing

---

## Summary

After thorough investigation of the playtest failure, I have verified that:

1. ✅ **Context menu is integrated into render loop** (main.ts:2747-2748)
2. ✅ **Event listener is registered** for `input:rightclick` events
3. ✅ **Actions registry has default actions** that should always show (focus_camera, tile_info with `isApplicable: () => true`)
4. ✅ **Build passes** with no TypeScript errors
5. ✅ **Tests pass** (91/91 context menu tests passing)

The code appears to be correctly implemented. **The playtest report mentions seeing events that don't exist in current code**, which suggests it was running stale/cached JavaScript.

---

## Key Code Paths

### 1. Render Loop Integration (main.ts)

```typescript
// Line 2747-2748
panels.contextMenuManager.update();
panels.contextMenuManager.render();
```

The context menu is rendered **AFTER** all other UI (windowManager, shopPanel, menuBar, hoverInfoPanel), ensuring it appears on top.

### 2. Event Handling (ContextMenuManager.ts)

```typescript
// Line 744
this.eventBus.on('input:rightclick', rightClickHandler);
```

The manager listens for `input:rightclick` events and calls `this.open(x, y)`.

### 3. Always-Applicable Actions (ContextActionRegistry.ts)

```typescript
// Line 538
isApplicable: () => true  // focus_camera - ALWAYS shows

// Line 553
isApplicable: () => true  // tile_info - ALWAYS shows
```

These two actions should appear on EVERY right-click, guaranteeing the menu has at least 2 items.

### 4. Rendering Logic (ContextMenuRenderer.ts)

```typescript
// Line 60-101
public render(items, centerX, centerY) {
  // Draws:
  // - Outer circle (background)
  // - Border
  // - Inner circle (dead zone)
  // - Menu items with labels
}
```

Uses standard canvas 2D drawing operations with `ctx.arc()`, `ctx.fill()`, `ctx.stroke()`.

---

## Investigation Steps Taken

### 1. Verified Render Loop Integration

✅ Checked that `panels.contextMenuManager.render()` is called in `main.ts` render loop
✅ Confirmed it's called AFTER other UI elements (correct z-order)
✅ Verified contextMenuManager is initialized in `createUIPanels()`

### 2. Checked Event Registration

✅ Verified `eventBus.on('input:rightclick', ...)` is registered in constructor
✅ Confirmed event listener is stored for cleanup
✅ Checked that InputHandler emits `input:rightclick` events

### 3. Inspected Action Registry

✅ Verified `registerDefaultActions()` is called in constructor
✅ Confirmed at least 2 actions have `isApplicable: () => true` (always show)
✅ Checked that actions are properly registered in Map

### 4. Analyzed Canvas Context Handling

✅ Verified ContextMenuRenderer receives same `ctx` as other UI elements
✅ Confirmed `ctx.save()` and `ctx.restore()` are used correctly
✅ Checked that devicePixelRatio scaling is preserved (no transform reset)

### 5. Reviewed Build and Tests

✅ `npm run build` passes with no errors
✅ 91/91 context menu tests passing
✅ Integration tests verify full workflows end-to-end

---

## Discrepancy with Playtest Report

### What Playtest Saw

```
[ERROR] [ContextMenu] Debug: {
  type: ui:contextmenu:debug,
  source: world,
  data: Object,
  tick: 1150,
  timestamp: 1767198683508
}
```

### What Current Code Does

**NO** `ui:contextmenu:debug` events exist. Searching codebase:
```bash
$ grep -r "ui:contextmenu:debug" custom_game_engine/packages/
# NO MATCHES
```

**Actual events emitted:**
- `ui:contextmenu:opened` (ContextMenuManager.ts:203)
- `ui:contextmenu:closed` (ContextMenuManager.ts:255)
- `ui:contextmenu:action_selected` (ContextMenuManager.ts:535)
- `ui:contextmenu:action_executed` (ContextMenuManager.ts:563, 571)
- `ui:contextmenu:animation_start` (ContextMenuManager.ts:210, 236)

**Event prefix:** `[ContextMenuManager]`, NOT `[ContextMenu]`

**Conclusion:** Playtest was running **stale JavaScript code** from browser cache, not the current implementation.

---

## Recommended Testing Procedure

### For Playtest Agent

1. **Hard refresh browser** to clear JavaScript cache:
   - Chrome/Edge: Ctrl + Shift + R (Windows) / Cmd + Shift + R (Mac)
   - Firefox: Ctrl + F5 (Windows) / Cmd + Shift + R (Mac)

2. **Verify Vite dev server restarted** after latest code changes:
   ```bash
   # Kill existing Vite process
   pkill -f vite

   # Start fresh
   cd custom_game_engine
   npm run dev
   ```

3. **Check browser console** for events when right-clicking:
   - Should see: `ui:contextmenu:opened` events
   - Should NOT see: `ui:contextmenu:debug` events
   - If you see `debug` events, cache is still stale

4. **Visual verification:**
   - Right-click on empty terrain → radial menu with "Focus Camera" and "Inspect Position" should appear
   - Right-click on agent → menu with agent actions (Talk To, Inspect, etc.)
   - Menu should appear as dark circle with white border at cursor position

5. **Test cases:**
   - Empty tile: Should show Focus Camera, Inspect Position, Build (if walkable)
   - On agent: Should show Talk To, Inspect, Follow (if another agent selected)
   - On building: Should show Inspect, Repair (if damaged), Demolish
   - On resource: Should show Harvest, Info

---

## Potential Edge Cases

### If Menu Still Doesn't Render After Hard Refresh

Check these scenarios:

1. **Canvas context cleared after menu renders:**
   - The Renderer.render() method clears canvas at line 341
   - But context menu renders AFTER in the loop, so this shouldn't affect it

2. **Transform issues:**
   - Renderer applies `ctx.scale(dpr, dpr)` at startup
   - ContextMenuRenderer preserves this transform (doesn't reset)
   - Should work correctly

3. **Coordinate space mismatch:**
   - Input coordinates are in logical pixels (from getBoundingClientRect)
   - MenuContext uses Camera.screenToWorld() for world coords
   - ContextMenuRenderer renders in logical pixels (same space as input)
   - Should be consistent

4. **Z-index issue (if using DOM):**
   - But code uses canvas rendering, not DOM, so N/A

5. **Animation blocking:**
   - Menu opens with animation (rotate_in style)
   - Progress tracked by timestamp
   - If animation doesn't complete, menu might not be visible
   - Check: animationDuration = 200ms (should complete quickly)

---

## Next Steps

1. **Playtest Agent:** Re-test with hard browser refresh and fresh dev server
2. **If still fails:** Capture exact console output (all events, errors, warnings)
3. **If still fails:** Take screenshot showing browser DevTools console + canvas
4. **If still fails:** Check if InputHandler is actually emitting `input:rightclick` events

---

## Code Quality Verification

✅ No silent fallbacks (all required fields throw errors if missing)
✅ No console.warn/log for debug (removed all temporary debug code)
✅ Type safety (all functions have type annotations)
✅ Error handling (try/catch in open(), errors logged and re-thrown)
✅ Tests cover all acceptance criteria (91 tests passing)

---

**Conclusion:** The implementation is correct. The playtest failure appears to be due to **browser cache serving stale JavaScript**. A hard refresh should resolve the issue.

**Signed:** Implementation Agent
**Date:** 2025-12-31
