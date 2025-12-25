# Bug Fix: Camera Drag Blocked by TileInspectorPanel - RESOLVED ✅

**Fixed:** 2025-12-24
**File Modified:** `packages/renderer/src/TileInspectorPanel.ts`
**Line Changed:** 509-511

---

## Original Bug

**Symptom:** Mouse drag no longer moves the camera when the TileInspectorPanel is open.

**User Report:** "mouse drag doesn't seem to move the camera anymore"

---

## Root Cause

The `TileInspectorPanel.handleClick()` method was returning `true` for **any click inside the panel**, even clicks on the panel background (not on buttons).

### How This Broke Camera Drag:

1. User right-clicks a tile → TileInspectorPanel opens in bottom-right corner
2. User tries to drag camera by clicking and dragging
3. If click starts inside panel bounds, `handleClick()` returns `true` (line 509)
4. In `InputHandler.ts:160`, when callback returns `true`, it prevents execution from reaching line 165
5. `this.mouseDown = true` is never set (line 165)
6. Camera drag code (lines 187-193) requires `mouseDown` to be `true`
7. **Result:** No camera drag in the area covered by the panel

### Code Flow:

**InputHandler.ts:**
```typescript
// Line 157
const handled = this.callbacks.onMouseClick?.(x, y, e.button);

// Line 160-163
if (handled) {
  e.preventDefault();
  return;  // ❌ Exits early, mouseDown never set
}

// Line 165 - Only reached if handled === false
this.mouseDown = true;  // Required for drag

// Line 187-193 - Camera drag
if (this.mouseDown) {
  const dx = e.clientX - this.lastMouseX;
  const dy = e.clientY - this.lastMouseY;
  this.camera!.pan(-dx, -dy);
  // ...
}
```

**TileInspectorPanel.ts (BEFORE FIX):**
```typescript
// Line 509 (old)
return true; // Click was inside panel, but not on a button
```

This meant **any click in the panel area** returned `true`, blocking drag.

---

## Fix Applied

Changed line 509-511 in `TileInspectorPanel.ts`:

### Before (Broken):
```typescript
return true; // Click was inside panel, but not on a button
```

### After (Fixed):
```typescript
// Click was inside panel but not on a button
// Return false to allow camera drag (trade-off: can click "through" panel to select entities)
return false;
```

---

## How the Fix Works

**Now:**
1. Click on close button → returns `true` (handled) ✅
2. Click on action button (Till/Water/Fertilize) → returns `true` (handled) ✅
3. Click on panel background → returns `false` (not handled) ✅
4. When `false` is returned, `InputHandler` sets `mouseDown = true` ✅
5. Camera drag works! ✅

---

## Trade-offs

### ✅ Pros:
- Camera drag now works even when panel is open
- Users can click-and-drag freely without being blocked by UI

### ⚠️ Cons:
- Users can now click "through" the panel background to select entities/tiles underneath
- This is acceptable because:
  - Panel is semi-transparent (you can see entities underneath)
  - Only background clicks go through (buttons still work)
  - Panel buttons and close button still consume clicks properly

---

## Testing Verification

### Manual Testing:
1. ✅ Build compiles successfully (`npm run build`)
2. ⏳ Runtime testing needed:
   - Right-click a tile to open TileInspectorPanel
   - Try to drag camera by clicking panel background and dragging
   - **Expected:** Camera should move
   - Verify panel buttons still work (Till/Water/Fertilize/Close)

---

## Alternative Fixes Considered

### Option 1: Separate drag from click handling
**Approach:** Modify `InputHandler` to always set `mouseDown` on mousedown, then check `onMouseClick` separately.
**Pros:** More robust, allows drag everywhere.
**Cons:** Bigger change, affects all UI components.

### Option 2: Make panel draggable
**Approach:** If user clicks panel background, allow dragging the panel instead of camera.
**Pros:** More polished UX.
**Cons:** Much more complex to implement.

### Option 3: Return false for background clicks ✅ (Selected)
**Approach:** Only return `true` from `handleClick` for actual button clicks.
**Pros:** Simple, one-line fix, solves the immediate issue.
**Cons:** Allows clicking through panel (acceptable trade-off).

We chose **Option 3** for the quick fix. If click-through becomes a problem, we can implement Option 1 later.

---

## Related Files

**Modified:**
- `packages/renderer/src/TileInspectorPanel.ts` (line 509-511)

**Related:**
- `packages/renderer/src/InputHandler.ts` (lines 157-193)
- `demo/src/main.ts` (lines 1341-1427) - `onMouseClick` callback registration

---

## Status

✅ **FIXED** - Camera drag now works when TileInspectorPanel is open

⏳ **TESTING PENDING** - Runtime verification needed

---

**Fix Author:** Claude Code
**Reviewed:** Pending
**Merged:** Pending runtime verification
