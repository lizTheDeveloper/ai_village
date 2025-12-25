# Work Order: Window Manager

**Phase:** UI Enhancement (not in numbered phases, parallel with Phase 7-11)
**Created:** 2025-12-25
**Spec Agent:** spec-agent-001
**Status:** READY_FOR_TESTS

---

## Spec Reference

- **Primary Spec:** [custom_game_engine/WINDOW_MANAGER_SPEC.md](../../../WINDOW_MANAGER_SPEC.md)
- **Related Specs:**
  - [openspec/specs/ui-system/inventory.md](../../../../openspec/specs/ui-system/inventory.md)
  - [openspec/specs/ui-system/building-placement.md](../../../../openspec/specs/ui-system/building-placement.md)

---

## Requirements Summary

Extract the key SHALL/MUST statements from the spec:

### R1: Non-Overlapping Windows
1. Windows MUST NOT overlap each other
2. When a window is moved or shown, it SHALL find the nearest available space
3. If no space is available, windows SHALL cascade or stack with clear visual separation

### R2: Window Visibility Controls
1. All windows MUST be hideable/showable
2. Keyboard shortcuts MUST remain functional for existing toggleable panels
3. A new UI control (Windows menu or toolbar) SHALL allow show/hide of any panel
4. Visual indicator SHALL show which windows are currently visible

### R3: Window Dragging & Positioning
1. All windows MUST have a draggable title bar
2. Users SHALL be able to click and drag windows to reposition them
3. Windows SHOULD snap to grid or edge boundaries (optional but recommended)
4. Dragging SHALL provide visual feedback (e.g., semi-transparent preview)

### R4: Position Persistence
1. Window positions MUST be saved to localStorage
2. On game restart, windows SHALL restore to their last positions
3. System SHALL fallback to default positions if localStorage is empty/corrupted
4. Position SHALL be saved on:
   - Window drag end
   - Window resize (if resizable)
   - Window close

### R5: Default Layout
1. System SHALL define sensible default positions for each window type
2. Windows SHALL be arranged in logical zones:
   - **Top-left zone**: ResourcesPanel, SettingsPanel
   - **Top-right zone**: AgentInfoPanel, AnimalInfoPanel, PlantInfoPanel
   - **Bottom-left zone**: MemoryPanel
   - **Bottom-right zone**: TileInspectorPanel
   - **Center/Full-screen modals**: InventoryUI, CraftingPanelUI, SettingsPanel

### R6: Window Types
1. System SHALL support two window categories:
   - **Docked Panels**: Small to medium size (200-400px), can minimize to title bar
   - **Modal/Overlay Panels**: Large interface, dims/blurs background when shown

---

## Acceptance Criteria

### Criterion 1: WindowManager Core Functionality
- **WHEN:** WindowManager is instantiated
- **THEN:** It SHALL maintain a registry of all managed windows with their configurations
- **Verification:** Test that registerWindow() adds windows to internal map

### Criterion 2: Window Registration
- **WHEN:** A panel implements IWindowPanel interface
- **THEN:** It SHALL be registerable with WindowManager
- **Verification:** All existing panels (AgentInfoPanel, MemoryPanel, ResourcesPanel, etc.) can be registered

### Criterion 3: Draggable Title Bars
- **WHEN:** User clicks and drags a window's title bar
- **THEN:** The window SHALL move with the mouse cursor
- **Verification:** Click title bar, drag mouse, window position updates

### Criterion 4: Non-Overlapping Layout
- **WHEN:** A window is moved or shown
- **THEN:** WindowManager SHALL detect overlaps and adjust position
- **Verification:** Open multiple windows, verify they don't overlap

### Criterion 5: Cascade Fallback
- **WHEN:** No free space is available for a window
- **THEN:** WindowManager SHALL cascade the window (offset by title bar height)
- **Verification:** Open many windows until screen is full, new windows cascade

### Criterion 6: Position Persistence
- **WHEN:** User repositions windows and refreshes the page
- **THEN:** Windows SHALL restore to their repositioned locations
- **Verification:**
  1. Move windows to custom positions
  2. Refresh browser
  3. Windows appear in same positions

### Criterion 7: LocalStorage Fallback
- **WHEN:** localStorage is empty or corrupted
- **THEN:** Windows SHALL use default positions from WindowConfig
- **Verification:** Clear localStorage, refresh, windows use defaults

### Criterion 8: Keyboard Shortcuts Preserved
- **WHEN:** User presses existing keyboard shortcuts (R, M, I, ESC, etc.)
- **THEN:** Windows SHALL toggle visibility as before
- **Verification:** Test all keyboard shortcuts still work

### Criterion 9: Z-Index Management
- **WHEN:** User clicks on a window
- **THEN:** That window SHALL come to front (highest z-index)
- **Verification:** Click on back window, it moves to front

### Criterion 10: Window Minimize
- **WHEN:** User clicks minimize button on docked panel
- **THEN:** Panel SHALL collapse to title bar only
- **Verification:** Click minimize, panel height reduces to ~30px

### Criterion 11: Window Close/Hide
- **WHEN:** User clicks close button on window
- **THEN:** Window SHALL become invisible (not destroyed)
- **Verification:** Click close, window disappears but can be reshown

### Criterion 12: Modal Dimming
- **WHEN:** A modal window (InventoryUI, CraftingPanelUI) is shown
- **THEN:** Background SHALL be dimmed/blurred
- **Verification:** Open inventory, background has overlay

### Criterion 13: Canvas Resize Handling
- **WHEN:** Browser window is resized
- **THEN:** Windows SHALL remain on screen (clamp positions if needed)
- **Verification:** Resize browser smaller, windows stay visible

### Criterion 14: Click-Through to Game World
- **WHEN:** User clicks on game world (not on a window)
- **THEN:** Game world interaction SHALL work (select entities, etc.)
- **Verification:** Click between windows, entity selection works

---

## System Integration

### Existing Systems Affected
| System | File | Integration Type |
|--------|------|-----------------|
| Renderer | packages/renderer/src/Renderer.ts | WindowManager renders on top of world |
| InputHandler | packages/renderer/src/InputHandler.ts | Mouse events intercepted by WindowManager |
| KeyboardRegistry | packages/renderer/src/KeyboardRegistry.ts | Keyboard shortcuts integrated |
| AgentInfoPanel | packages/renderer/src/AgentInfoPanel.ts | Implements IWindowPanel |
| MemoryPanel | packages/renderer/src/MemoryPanel.ts | Implements IWindowPanel |
| ResourcesPanel | packages/renderer/src/ResourcesPanel.ts | Implements IWindowPanel |
| TileInspectorPanel | packages/renderer/src/TileInspectorPanel.ts | Implements IWindowPanel |
| AnimalInfoPanel | packages/renderer/src/AnimalInfoPanel.ts | Implements IWindowPanel |
| PlantInfoPanel | packages/renderer/src/PlantInfoPanel.ts | Implements IWindowPanel |
| InventoryUI | packages/renderer/src/ui/InventoryUI.ts | Implements IWindowPanel (modal) |
| CraftingPanelUI | packages/renderer/src/CraftingPanelUI.ts | Implements IWindowPanel (modal) |
| SettingsPanel | packages/renderer/src/SettingsPanel.ts | Implements IWindowPanel (modal) |

### New Components Needed
- **WindowManager class** - Core window management system
- **IWindowPanel interface** - Interface for all managed panels
- **WindowConfig type** - Configuration for each window
- **ManagedWindow type** - Internal window state
- **SavedLayout interface** - LocalStorage schema

### Events
- **Emits:** None (purely UI system)
- **Listens:** None (responds to direct user input)

---

## UI Requirements

### Window Title Bar
Each managed window will have a consistent title bar:

```
┌─────────────────────────────────────┐
│ [≡] Window Title            [–] [×] │ ← Title bar (30px height, draggable)
├─────────────────────────────────────┤
│                                     │
│   Window Content Here               │
│                                     │
└─────────────────────────────────────┘
```

**Title Bar Elements:**
- **[≡]** Menu icon (left, 10px from edge) - optional per-window actions
- **Title** Centered or left-aligned text (white, 14px font)
- **[–]** Minimize button (right side, before close) - collapse to title bar
- **[×]** Close/hide button (right, 10px from edge) - hide window

**Title Bar Interaction:**
- Dragging anywhere on title bar (except buttons) moves window
- Double-click title bar to minimize/restore (stretch goal)

### Windows Menu (Future Enhancement)
A toolbar or keyboard shortcut (e.g., F1) to show a "Windows" menu:

```
┌─────────────────────┐
│ Windows             │
├─────────────────────┤
│ ✓ Agent Info        │ ← Checked = visible
│ ✓ Resources         │
│ ✗ Memory            │ ← Unchecked = hidden
│ ✗ Inventory         │
│ ─────────────────── │
│ Arrange: Cascade    │
│ Arrange: Tile       │
│ Reset Layout        │
└─────────────────────┘
```

**Note:** This menu is optional for Phase 1 MVP. Can be added in Phase 4.

### Visual States

**Dragging State:**
- Window becomes semi-transparent (opacity: 0.7)
- Cursor changes to 'move'
- Optional: Show drop target outline

**Focused State:**
- Title bar background: rgba(50, 100, 200, 0.8)
- Border: 2px solid rgba(100, 150, 255, 0.8)

**Unfocused State:**
- Title bar background: rgba(30, 30, 30, 0.8)
- Border: 2px solid rgba(100, 100, 100, 0.5)

**Minimized State:**
- Only title bar visible (30px height)
- Content area hidden
- Border remains visible

**Modal Dimming:**
- Background overlay: rgba(0, 0, 0, 0.6)
- Blur filter: blur(4px) on game canvas (optional)

---

## Files Likely Modified

Based on the codebase structure:

### New Files to Create:
- `packages/renderer/src/WindowManager.ts` - Core window manager
- `packages/renderer/src/IWindowPanel.ts` - Interface definition
- `packages/renderer/src/types/WindowTypes.ts` - Type definitions

### Files to Modify (Implement IWindowPanel):
- `packages/renderer/src/AgentInfoPanel.ts`
- `packages/renderer/src/MemoryPanel.ts`
- `packages/renderer/src/ResourcesPanel.ts`
- `packages/renderer/src/TileInspectorPanel.ts`
- `packages/renderer/src/AnimalInfoPanel.ts`
- `packages/renderer/src/PlantInfoPanel.ts`
- `packages/renderer/src/SettingsPanel.ts`
- `packages/renderer/src/ui/InventoryUI.ts`
- `packages/renderer/src/CraftingPanelUI.ts`

### Files to Integrate WindowManager:
- `demo/src/main.ts` - Instantiate WindowManager, register panels
- `packages/renderer/src/index.ts` - Export WindowManager
- `packages/renderer/src/InputHandler.ts` - Pass events to WindowManager first

### Testing:
- `packages/renderer/src/__tests__/WindowManager.test.ts` - Unit tests
- `packages/renderer/src/__tests__/WindowManager.integration.test.ts` - Integration tests

---

## Notes for Implementation Agent

### Critical Design Decisions:

1. **Rendering Order:**
   - Game world renders first (Renderer.render())
   - WindowManager.render() called AFTER world render
   - Modal dimming overlay renders between world and modal windows

2. **Event Handling Priority:**
   - InputHandler should call WindowManager.handleClick() FIRST
   - If WindowManager returns `true`, event was handled (consumed)
   - If returns `false`, pass event to game world

3. **Panel Refactoring Strategy:**
   - Start with one simple panel (e.g., ResourcesPanel)
   - Implement IWindowPanel interface
   - Test with WindowManager
   - Apply pattern to remaining panels

4. **LocalStorage Key:**
   - Use: `ai-village-window-layout`
   - Schema version: 1 (for future migrations)
   - Include lastSaved timestamp

5. **Grid Snapping (Optional):**
   - Define grid size: 20px
   - Snap positions on drag release (Math.round(x / 20) * 20)
   - Makes alignment cleaner

6. **Performance Considerations:**
   - Only render visible windows
   - Cache title bar renders if panels are static
   - Minimize localStorage writes (debounce save by 500ms)

### Common Pitfalls to Avoid:

1. **Don't break existing keyboard shortcuts** - Test R, M, I, ESC, Tab keys
2. **Don't overlap windows on first load** - Verify default layout
3. **Don't lose click events** - Ensure click-through works for game world
4. **Don't ignore canvas resize** - Windows must stay on screen
5. **Don't forget z-index** - Clicking a window should bring it to front

### Implementation Phases (Suggested):

**Phase 1: Core WindowManager (Minimal Viable)**
- Create WindowManager class
- Define IWindowPanel interface
- Implement window registration
- Add draggable title bars to existing panels
- Basic rendering with z-index

**Phase 2: Collision Avoidance**
- Implement overlap detection
- Add cascade positioning
- Add "snap to available space" logic

**Phase 3: Persistence**
- Save window positions to localStorage
- Load positions on startup
- Reset to defaults if corrupted

**Phase 4: Advanced Features**
- Window minimize/maximize
- Windows menu UI
- Grid snapping
- Tile/cascade layout commands

---

## Notes for Playtest Agent

### Specific UI Behaviors to Verify:

1. **Window Dragging:**
   - Can you drag any window by its title bar?
   - Does the window follow the mouse smoothly?
   - Does dragging work at different zoom levels?

2. **Non-Overlapping:**
   - Open all windows - do any overlap?
   - Try to manually drag a window onto another - what happens?

3. **Persistence:**
   - Arrange windows in custom layout
   - Refresh browser
   - Do windows restore to same positions?

4. **Keyboard Shortcuts:**
   - Press R - does ResourcesPanel toggle?
   - Press M - does MemoryPanel toggle?
   - Press I or Tab - does InventoryUI toggle?
   - Press ESC - does SettingsPanel appear?

5. **Z-Index:**
   - Open multiple overlapping windows
   - Click on a window in the back
   - Does it come to the front?

6. **Modal Behavior:**
   - Open inventory (I key)
   - Is the game world dimmed?
   - Can you still click the game world?

7. **Canvas Resize:**
   - Open several windows
   - Resize browser window smaller
   - Do windows stay on screen?

8. **Performance:**
   - Open all windows
   - Does game still run at 60fps?
   - Is dragging smooth?

### Edge Cases to Test:

1. **First Run (No Saved Layout):**
   - Clear browser localStorage
   - Refresh game
   - Do windows appear in sensible default positions?

2. **Corrupted LocalStorage:**
   - Manually edit localStorage to invalid JSON
   - Refresh game
   - Does it gracefully fallback to defaults?

3. **Very Small Screen:**
   - Resize browser to 800x600
   - Do windows cascade properly?

4. **Many Windows Open:**
   - Open all 10+ panels
   - Is the screen still usable?
   - Can you close/minimize panels easily?

---

## Testing Checklist

Use this checklist to verify completeness:

- [ ] All panels implement IWindowPanel
- [ ] Windows can be dragged without overlap
- [ ] Positions persist across page reloads
- [ ] Windows restore correctly after canvas resize
- [ ] Keyboard shortcuts still work (R, M, I, ESC, etc.)
- [ ] Click-through works: clicking game world behind windows still selects entities
- [ ] No performance degradation (60fps maintained)
- [ ] Works on different screen sizes (1920x1080, 1366x768, etc.)
- [ ] Modal windows (Inventory, Crafting) dim background
- [ ] Title bars render consistently across all panels
- [ ] Minimize button collapses panels to title bar
- [ ] Close button hides panels (can be reshown)
- [ ] Z-index updates when clicking on windows
- [ ] LocalStorage saves/loads correctly
- [ ] Default layout is sensible on first run
- [ ] No console errors or warnings
- [ ] Build passes: `npm run build`
- [ ] All tests pass: `npm test`

---

## Success Metrics

This work order is COMPLETE when:

1. ✅ WindowManager class exists and is functional
2. ✅ All existing panels implement IWindowPanel
3. ✅ All panels have draggable title bars
4. ✅ Windows don't overlap (cascade if needed)
5. ✅ Window positions persist to localStorage
6. ✅ All keyboard shortcuts still work
7. ✅ Build and tests pass
8. ✅ Playtest Agent verifies all acceptance criteria
9. ✅ No performance regression (60fps maintained)
10. ✅ No breaking changes to existing UI functionality

---

**Estimated Complexity:** HIGH (Major UI refactor, ~1500 LOC)
**Estimated Time:** 8-12 hours (including testing)
**Priority:** MEDIUM (Quality-of-life improvement, not blocking other features)
