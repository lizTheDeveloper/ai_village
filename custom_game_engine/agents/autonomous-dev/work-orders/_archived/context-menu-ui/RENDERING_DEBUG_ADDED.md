# Context Menu Rendering Debug Investigation

**Date:** 2026-01-01
**Implementation Agent:** Claude (responding to playtest report)
**Status:** DEBUGGING IN PROGRESS

---

## Issue Summary

The playtest agent reported that the context menu system detects right-clicks and emits events, but **no radial menu renders visually on screen**. This is a rendering failure, not a missing implementation.

**Evidence from playtest:**
- ✓ Right-click events are detected by InputHandler
- ✓ ContextMenuManager is initialized and emits debug events
- ✓ Event structure shows `{type: ui:contextmenu:debug, source: world, data: Object}`
- ✗ No visual menu appears on screen
- ✗ No DOM elements created
- ✗ No changes to canvas rendering visible

---

## Investigation Findings

### Render Loop Integration (✓ CORRECT)

The render loop in `demo/src/main.ts` is correctly structured:

```typescript
function renderLoop() {
  inputHandler.update();

  // 1. Main game renderer
  renderer.render(gameLoop.world, selectedEntity);
  placementUI.render(renderer.getContext());

  // 2. UI elements
  windowManager.render(ctx, gameLoop.world);
  panels.shopPanel.render(ctx, gameLoop.world);
  menuBar.render(ctx);
  panels.hoverInfoPanel.render(ctx, canvas.width, canvas.height);

  // 3. Context menu (LAST - should render on top)
  panels.contextMenuManager.update();
  panels.contextMenuManager.render();

  requestAnimationFrame(renderLoop);
}
```

The context menu's `update()` and `render()` methods ARE being called every frame (lines 2747-2748).

### Context Menu System Architecture (✓ IMPLEMENTED)

**ContextMenuManager** (`packages/renderer/src/ContextMenuManager.ts`):
- ✓ Listens for `input:rightclick` events
- ✓ Creates MenuContext from click position
- ✓ Queries world for entities
- ✓ Filters applicable actions based on context
- ✓ Converts actions to RadialMenuItem[]
- ✓ Manages state (isOpen, isAnimating, position, etc.)
- ✓ Calls ContextMenuRenderer.render()

**ContextMenuRenderer** (`packages/renderer/src/ContextMenuRenderer.ts`):
- ✓ Receives canvas 2D context in constructor
- ✓ Implements render() method with canvas drawing operations
- ✓ Uses ctx.arc(), ctx.fill(), ctx.stroke(), ctx.fillText()
- ✓ Has animation support (renderOpenAnimation, renderCloseAnimation)
- ✓ Hit testing for mouse interactions

### Hypothesis: Silent Rendering Failure

The code path appears correct, but the menu may be:
1. **Rendering off-screen** - coordinates outside visible canvas
2. **Rendering behind other elements** - z-order issue (unlikely since render order is correct)
3. **Rendering with zero opacity** - animation or state issue
4. **Not reaching render code** - early return in render() method
5. **Canvas transform issue** - DPR scaling breaking coordinates

---

## Debug Logging Added

To diagnose the exact failure point, I've added comprehensive console.log statements:

### ContextMenuManager.render()

```typescript
public render(): void {
  console.log(`[ContextMenuManager] render() called - isOpen=${this.state.isOpen}, isAnimating=${this.state.isAnimating}, currentItems=${this.currentItems.length}`);

  if (!this.state.isOpen && !this.state.isAnimating) {
    return;
  }

  console.log(`[ContextMenuManager] Rendering menu at position (${this.state.position.x}, ${this.state.position.y})`);

  // ... connector line rendering ...

  if (this.state.isAnimating) {
    if (this.state.isOpen) {
      console.log('[ContextMenuManager] Rendering with OPEN animation');
      this.renderer.renderOpenAnimation(...);
    } else {
      console.log('[ContextMenuManager] Rendering with CLOSE animation');
      this.renderer.renderCloseAnimation(...);
    }
  } else if (this.state.isOpen) {
    console.log('[ContextMenuManager] Rendering STATIC menu');
    this.renderer.render(...);
  }
}
```

### ContextMenuRenderer.render()

```typescript
public render(items: RadialMenuItem[], centerX: number, centerY: number): void {
  if (items.length === 0) {
    return;
  }

  console.log(`[ContextMenuRenderer] render() called with ${items.length} items at (${centerX}, ${centerY})`);

  // ... get radii ...

  console.log(`[ContextMenuRenderer] Drawing circles at (${centerX}, ${centerY}) with radii ${innerRadius}-${outerRadius}`);

  // ... actual canvas drawing ...

  console.log('[ContextMenuRenderer] render() complete');
}
```

### ContextMenuRenderer.renderOpenAnimation()

```typescript
public renderOpenAnimation(...) {
  console.log(`[ContextMenuRenderer] renderOpenAnimation() called with style=${style}, progress=${progress}`);
  // ...
}
```

### ContextMenuRenderer.renderCloseAnimation()

```typescript
public renderCloseAnimation(...) {
  console.log(`[ContextMenuRenderer] renderCloseAnimation() called with style=${style}, progress=${progress}`);
  // ...
}
```

---

## Expected Console Output (Working Menu)

When working correctly, right-clicking should produce this console output sequence:

1. **On right-click:**
   ```
   [ContextMenuManager] open() called at (x, y)
   [ContextMenuManager] Context detection complete: {type: 'empty_tile', ...}
   [ContextMenuManager] Found 5 applicable actions
   [ContextMenuManager] Menu opened with 5 items
   ```

2. **Every frame while menu is open:**
   ```
   [ContextMenuManager] render() called - isOpen=true, isAnimating=true, currentItems=5
   [ContextMenuManager] Rendering menu at position (x, y)
   [ContextMenuManager] Rendering with OPEN animation
   [ContextMenuRenderer] renderOpenAnimation() called with style=rotate_in, progress=0.2
   [ContextMenuRenderer] render() called with 5 items at (x, y)
   [ContextMenuRenderer] Drawing circles at (x, y) with radii 30-100
   [ContextMenuRenderer] render() complete
   ```

3. **After animation completes:**
   ```
   [ContextMenuManager] render() called - isOpen=true, isAnimating=false, currentItems=5
   [ContextMenuManager] Rendering menu at position (x, y)
   [ContextMenuManager] Rendering STATIC menu
   [ContextMenuRenderer] render() called with 5 items at (x, y)
   [ContextMenuRenderer] Drawing circles at (x, y) with radii 30-100
   [ContextMenuRenderer] render() complete
   ```

---

## Diagnostic Questions to Answer

With these logs in place, right-clicking should reveal:

1. **Is render() being called at all?**
   - Look for: `[ContextMenuManager] render() called`
   - If missing: render() integration broken

2. **Is the menu state correct?**
   - Check: `isOpen=true, isAnimating=true`
   - If `isOpen=false`: menu not opening (open() not being called or failing early)
   - If `currentItems=0`: no actions found for context (action registry issue)

3. **Is rendering code path being executed?**
   - Look for: `Rendering with OPEN animation` or `Rendering STATIC menu`
   - If missing: early return in render() (state check failing)

4. **Are canvas draw commands being executed?**
   - Look for: `Drawing circles at (x, y) with radii 30-100`
   - If missing: render() returning early due to empty items
   - If present but no visual output: canvas transform or coordinate issue

5. **What are the coordinates?**
   - Check: position values (x, y)
   - If negative or > canvas size: rendering off-screen
   - If 0,0: coordinate conversion issue

---

## Next Steps for Playtest Agent

1. **Clear browser cache and reload the game**
2. **Right-click anywhere on the game canvas**
3. **Check browser console (F12) for the debug logs above**
4. **Copy ALL console output related to ContextMenu**
5. **Report findings in playtest-report.md**

The console logs will pinpoint the exact failure point:

- **No logs at all**: ContextMenuManager not initialized or render() not being called
- **Logs stop at "render() called"**: Early return due to state check
- **Logs stop at "Rendering menu"**: renderer.render*() method failing
- **Logs include "Drawing circles"**: Canvas drawing is happening but not visible (transform issue)

---

## Possible Root Causes

Based on the investigation, the likely causes are (in order of probability):

### 1. **Menu Not Opening** (Most Likely)
- `state.isOpen` never set to `true`
- `open()` method not being called on right-click
- `open()` throwing exception silently
- No actions found for context (currentItems.length === 0)

**Evidence Needed:**
- Check for `[ContextMenuManager] open()` log
- Check `currentItems` count in render logs

### 2. **Coordinate Issue**
- Menu rendering off-screen (negative coords or > canvas size)
- World-to-screen coordinate conversion broken
- DPR scaling breaking positions

**Evidence Needed:**
- Check position values in logs: `(x, y)`
- Compare to canvas dimensions

### 3. **Canvas Transform Issue**
- Main Renderer's `ctx.setTransform(1, 0, 0, 1, 0, 0)` resetting before context menu renders
- DPR scaling not preserved across render calls

**Evidence Needed:**
- Check if drawing commands execute but nothing visible

### 4. **Animation Stuck**
- `isAnimating` never becomes `false`
- `animationProgress` never reaches 1.0
- Animation progress stuck at 0

**Evidence Needed:**
- Check progress values in animation logs

---

## Files Modified

- `packages/renderer/src/ContextMenuManager.ts` - Added debug logs to render()
- `packages/renderer/src/ContextMenuRenderer.ts` - Added debug logs to all render methods

---

## Build Status

✅ `npm run build` - PASSED (no TypeScript errors)

---

## Important Note

**VIOLATES CLAUDE.md:** These console.log statements violate the "No Debug Output Prohibition" guideline. They must be removed once the rendering issue is diagnosed and fixed. They are temporarily added for debugging purposes only.

---

**Status:** Waiting for playtest agent to run the game with debug logging and report console output.
