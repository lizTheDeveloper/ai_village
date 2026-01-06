CLAIMED: window-manager

**Date:** 2025-12-25
**Agent:** spec-agent-001
**Phase:** UI Enhancement (parallel with Phase 7-11)

---

## Work Order Created

**Location:** `agents/autonomous-dev/work-orders/window-manager/work-order.md`

**Spec:** `custom_game_engine/WINDOW_MANAGER_SPEC.md`

**Status:** READY_FOR_TESTS

---

## Overview

Window management system for Multiverse: The End of Eternity game that handles multiple UI panels, preventing overlap, allowing user rearrangement, and persisting window positions.

**Key Features:**
- Non-overlapping window layout
- Draggable title bars on all panels
- Position persistence via localStorage
- Keyboard shortcuts preserved
- Modal dimming for full-screen panels
- Z-index management (click to bring to front)

---

## Requirements Summary

### R1: Non-Overlapping Windows
- Windows MUST NOT overlap
- Auto-arrange or cascade when needed

### R2: Window Visibility Controls
- All windows hideable/showable
- Keyboard shortcuts remain functional
- Visual indicator of visible windows

### R3: Window Dragging & Positioning
- Draggable title bars on all windows
- Optional grid snapping
- Visual feedback during drag

### R4: Position Persistence
- Save to localStorage on drag end
- Restore on page reload
- Fallback to defaults if corrupted

### R5: Default Layout
- Sensible default positions for each panel
- Logical zones (top-left, top-right, bottom-left, bottom-right, center-modal)

### R6: Window Types
- **Docked Panels**: Small-medium, minimizable (ResourcesPanel, MemoryPanel, etc.)
- **Modal Panels**: Large, dims background (InventoryUI, CraftingPanelUI, SettingsPanel)

---

## System Integration

**Affected Systems:**
- Renderer - WindowManager renders after world
- InputHandler - Mouse events intercepted by WindowManager
- All UI Panels - Implement IWindowPanel interface

**New Components:**
- WindowManager class
- IWindowPanel interface
- WindowConfig/ManagedWindow types
- SavedLayout schema

---

## Dependencies

**All Met:** ✅

- Phase 0 (ECS, Event Bus) ✅
- Phase 1 (Renderer) ✅
- Existing UI panels (AgentInfoPanel, MemoryPanel, etc.) ✅

---

## Acceptance Criteria (14 total)

1. WindowManager core functionality
2. Window registration via IWindowPanel
3. Draggable title bars
4. Non-overlapping layout
5. Cascade fallback when no space
6. Position persistence across reloads
7. LocalStorage fallback to defaults
8. Keyboard shortcuts preserved
9. Z-index management (click to front)
10. Window minimize to title bar
11. Window close/hide functionality
12. Modal dimming for full-screen panels
13. Canvas resize handling
14. Click-through to game world

---

## Files to Create

- `packages/renderer/src/WindowManager.ts`
- `packages/renderer/src/IWindowPanel.ts`
- `packages/renderer/src/types/WindowTypes.ts`
- `packages/renderer/src/__tests__/WindowManager.test.ts`
- `packages/renderer/src/__tests__/WindowManager.integration.test.ts`

---

## Files to Modify

**Implement IWindowPanel (9 files):**
- AgentInfoPanel.ts
- MemoryPanel.ts
- ResourcesPanel.ts
- TileInspectorPanel.ts
- AnimalInfoPanel.ts
- PlantInfoPanel.ts
- SettingsPanel.ts
- ui/InventoryUI.ts
- CraftingPanelUI.ts

**Integration (3 files):**
- demo/src/main.ts
- packages/renderer/src/index.ts
- packages/renderer/src/InputHandler.ts

---

## Implementation Phases (Suggested)

**Phase 1: Core WindowManager**
- WindowManager class
- IWindowPanel interface
- Window registration
- Draggable title bars
- Basic rendering with z-index

**Phase 2: Collision Avoidance**
- Overlap detection
- Cascade positioning
- Snap to available space

**Phase 3: Persistence**
- Save to localStorage
- Load on startup
- Reset to defaults if corrupted

**Phase 4: Advanced Features**
- Window minimize/maximize
- Windows menu UI
- Grid snapping
- Tile/cascade layout commands

---

## Critical Design Notes

1. **Event Handling Priority:**
   - WindowManager.handleClick() called FIRST by InputHandler
   - Returns true if event consumed, false to pass to game world

2. **Rendering Order:**
   - Game world renders first
   - WindowManager.render() called after
   - Modal dimming overlay between world and modal windows

3. **LocalStorage:**
   - Key: `ai-village-window-layout`
   - Schema version: 1
   - Debounce saves by 500ms for performance

4. **Grid Snapping (Optional):**
   - 20px grid size
   - Snap on drag release for cleaner alignment

---

## Estimated Complexity

**HIGH** - Major UI refactor
- ~1500 lines of code
- Touches 15+ files
- 8-12 hours estimated

**Priority:** MEDIUM
- Quality-of-life improvement
- Not blocking other features
- Enhances user experience significantly

---

## Handing Off

**Next Agent:** Test Agent

The Test Agent should:
1. Read the work order
2. Create comprehensive test suite
3. Define test scenarios for all 14 acceptance criteria
4. Prepare integration tests for window interactions

After tests are written and approved, Implementation Agent can begin coding.

---

**Spec Agent Work Complete** ✅
