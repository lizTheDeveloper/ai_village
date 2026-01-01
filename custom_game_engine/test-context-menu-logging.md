# Context Menu Debug Logging Test

## Purpose
Test the newly added debug logging to diagnose why the context menu isn't rendering.

## Test Steps

1. Start the game with `npm run dev`
2. Open browser to http://localhost:5173
3. Select any scenario and start game
4. Wait for game to load (agents visible)
5. Right-click anywhere on the canvas
6. Check browser console for debug logs

## Expected Console Output

When you right-click, you should see:

```
[ContextMenuManager] ========== OPEN MENU ==========
[ContextMenuManager] Screen coordinates: <x> <y>
[ContextMenuManager] Current state before open: { isOpen: false, isAnimating: false, currentItemsCount: 0 }
[ContextMenuManager] Canvas logical rect: <width> x <height>
[ContextMenuManager] Canvas physical size: <width> x <height>
[ContextMenuManager] Position adjusted from { x: <x>, y: <y> } to { x: <x>, y: <y> }
[ContextMenuManager] Creating context...
[ContextMenuManager] Context created: { targetType: 'empty_tile', hasSelection: false, ... }
[ContextMenuManager] Getting applicable actions...
[ContextMenuManager] Found <N> applicable actions
[ContextMenuManager] Action IDs: focus_camera, tile_info, ...
[ContextMenuManager] Converting actions to menu items...
[ContextMenuManager] Created <N> menu items
[ContextMenuManager] Menu item labels: Focus Camera, Inspect Position, ...
[ContextMenuManager] ✅ MENU OPENED SUCCESSFULLY
[ContextMenuManager] Final state: { isOpen: true, isAnimating: true, ... }
[ContextMenuManager] Menu items: [{ id: '...', label: '...', ... }]
[ContextMenuManager] ========================================
```

Then every second while menu is open:

```
[ContextMenuManager] UPDATE - menu is OPEN animating: true progress: 0.50 items: 2
[ContextMenuManager] Calling render() with 2 items at position { x: <x>, y: <y> }
[ContextMenuRenderer] render() called with 2 items at <x>, <y>
[ContextMenuRenderer] Saving context and rendering menu...
[ContextMenuRenderer] Drawing 2 menu items...
[ContextMenuRenderer] Menu rendered successfully
```

## Diagnosis

### If you see "❌ MENU NOT OPENED - No menu items available"
- The action registry is returning 0 applicable actions
- This shouldn't happen because `tile_info` action always returns true for isApplicable
- Check that ContextActionRegistry.registerDefaultActions() was called in constructor

### If you see menu opened successfully but NO UPDATE logs
- The `update()` method is not being called from the render loop
- Check that `panels.contextMenuManager.update()` is in the render loop (demo/src/main.ts line ~2882)

### If you see UPDATE logs but NO renderer logs
- The renderer's render() method is not being called
- Check that `this.render()` is being called from update() (should be at line ~695)

### If you see renderer logs but no visual menu
- The canvas is being cleared after the menu renders
- Or the menu is rendering to a different canvas context
- Or the menu is rendering off-screen or behind other elements

## Next Steps

Based on what you see in the console, we'll know exactly where the failure is occurring and can fix it.
