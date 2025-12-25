# Window Manager Specification

## Overview
A window management system for the AI Village game that handles multiple UI panels, preventing overlap, allowing user rearrangement, and persisting window positions.

## Current UI Panels (Identified)
1. **AgentInfoPanel** - Shows selected agent details (top-right, 300x500px)
2. **AnimalInfoPanel** - Shows selected animal details
3. **PlantInfoPanel** - Shows selected plant details
4. **ResourcesPanel** - Displays global resources (toggle: R key)
5. **MemoryPanel** - Shows episodic memory data (toggle: M key, center-left, 400x600px)
6. **InventoryUI** - Full inventory interface (toggle: I/Tab keys)
7. **SettingsPanel** - Game settings (toggle: ESC key)
8. **TileInspectorPanel** - Tile/terrain information
9. **BuildingPlacementUI** - Building placement ghost renderer
10. **CraftingPanelUI** - Crafting interface

## Requirements

### R1: Non-Overlapping Windows
- Windows must not overlap each other
- When a window is moved or shown, it should find the nearest available space
- If no space is available after searching, automatically close the oldest window to make room
- Oldest window is determined by least recently interacted (LRU - Least Recently Used)
- Exception: Pinned/modal windows should not be auto-closed

### R2: Window Visibility Controls
- All windows must be hideable/showable
- Keyboard shortcuts remain for existing toggleable panels
- New UI control (e.g., Windows menu or toolbar) to show/hide any panel
- Visual indicator showing which windows are currently visible

### R3: Window Dragging & Positioning
- All windows must have a draggable title bar
- Users can click and drag windows to reposition them
- Windows should snap to grid or edge boundaries (optional but recommended)
- Dragging should provide visual feedback (e.g., semi-transparent preview)

### R4: Position Persistence
- Window positions must be saved to localStorage
- On game restart, windows restore to their last positions
- Fallback to default positions if localStorage is empty/corrupted
- Save position on:
  - Window drag end
  - Window resize (if resizable)
  - Window close

### R5: Default Layout
- Define sensible default positions for each window type
- Arrange windows in a grid or logical zones:
  - **Top-left zone**: ResourcesPanel, SettingsPanel
  - **Top-right zone**: AgentInfoPanel, AnimalInfoPanel, PlantInfoPanel (context-sensitive)
  - **Bottom-left zone**: MemoryPanel
  - **Bottom-right zone**: TileInspectorPanel
  - **Center/Full-screen modals**: InventoryUI, CraftingPanelUI, SettingsPanel

### R6: Window Types
Define two categories of windows:

#### Docked Panels (Always visible region)
- Small to medium size (200-400px wide)
- Can be minimized to title bar only
- Examples: ResourcesPanel, TileInspectorPanel

#### Modal/Overlay Panels (Full screen or centered)
- Large interface that needs focus (e.g., inventory, crafting)
- Dims/blurs background when shown
- Examples: InventoryUI, CraftingPanelUI, SettingsPanel

## Architecture

### WindowManager Class
```typescript
class WindowManager {
  private windows: Map<string, ManagedWindow>;
  private activeWindow: string | null;
  private canvas: HTMLCanvasElement;

  // Register a panel as a managed window
  registerWindow(id: string, panel: IWindowPanel, config: WindowConfig): void;

  // Show/hide windows
  showWindow(id: string): void;
  hideWindow(id: string): void;
  toggleWindow(id: string): void;

  // Window arrangement
  bringToFront(id: string): void;
  arrangeWindows(layout: 'cascade' | 'tile' | 'restore'): void;

  // LRU management
  markWindowInteraction(id: string): void; // Update lastInteractionTime
  findLeastRecentlyUsedWindow(): string | null; // Find oldest non-pinned window
  closeOldestWindow(): void; // Close LRU window to make space
  pinWindow(id: string, pinned: boolean): void; // Pin/unpin window from auto-close

  // Persistence
  saveLayout(): void;
  loadLayout(): void;
  resetLayout(): void;

  // Rendering
  render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void;
  handleClick(x: number, y: number): boolean; // Returns true if click was handled
  handleDrag(startX: number, startY: number, currentX: number, currentY: number): void;
}
```

### IWindowPanel Interface
All panels must implement this interface to be managed:

```typescript
interface IWindowPanel {
  // Unique identifier
  getId(): string;

  // Display properties
  getTitle(): string;
  getDefaultWidth(): number;
  getDefaultHeight(): number;

  // State management
  isVisible(): boolean;
  setVisible(visible: boolean): void;

  // Rendering
  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    world?: any
  ): void;

  // Optional: custom header controls (minimize, settings, etc.)
  renderHeader?(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): void;
}
```

### WindowConfig Type
```typescript
interface WindowConfig {
  defaultX: number;
  defaultY: number;
  defaultWidth: number;
  defaultHeight: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  isModal?: boolean;
  isResizable?: boolean;
  isDraggable?: boolean;
  showInWindowList?: boolean; // Show in windows menu
  keyboardShortcut?: string; // e.g., "KeyM" for memory panel
}
```

### ManagedWindow Type
```typescript
interface ManagedWindow {
  id: string;
  panel: IWindowPanel;
  config: WindowConfig;

  // Current state
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  minimized: boolean;
  zIndex: number;
  pinned: boolean; // Pinned windows won't be auto-closed

  // Dragging state
  isDragging: boolean;
  dragOffsetX: number;
  dragOffsetY: number;

  // LRU tracking
  lastInteractionTime: number; // Timestamp of last user interaction (click, drag, focus)
  openedTime: number; // Timestamp when window was first opened
}
```

## UI Components

### Window Title Bar
Each window should have a consistent title bar:
```
┌─────────────────────────────────────┐
│ [≡] Window Title        [📌] [–] [×] │ ← Title bar (draggable)
├─────────────────────────────────────┤
│                                     │
│   Window Content Here               │
│                                     │
└─────────────────────────────────────┘
```

- **[≡]** Menu icon (optional per-window actions)
- **Title** Centered or left-aligned text
- **[📌]** Pin button (pinned windows won't be auto-closed when out of space)
- **[–]** Minimize button
- **[×]** Close/hide button

### Windows Menu
Add a toolbar or keyboard shortcut (e.g., F1) to show a "Windows" menu:
```
┌─────────────────────┐
│ Windows             │
├─────────────────────┤
│ ✓ Agent Info        │
│ ✓ Resources         │
│ ✗ Memory            │
│ ✗ Inventory         │
│ ─────────────────── │
│ Arrange: Cascade    │
│ Arrange: Tile       │
│ Reset Layout        │
└─────────────────────┘
```

## Collision Avoidance Strategy

### On Window Show
1. Check if default position is free (no overlap)
2. If occupied, search in a spiral pattern outward from default position
3. If no free space found after spiral search:
   - First attempt: Cascade windows (offset by title bar height)
   - If still no space (canvas is full): Close the least recently used (LRU) non-pinned window
   - Show brief notification: "Closed [Window Name] to make space"
   - Open the new window in the freed space

### LRU Eviction Algorithm
When space runs out:
1. Get all visible, non-pinned, non-modal windows
2. Sort by `lastInteractionTime` (oldest first)
3. Close the oldest window
4. Log to console: "Auto-closed [WindowID] (last used: [timestamp])"
5. Attempt to place new window again

### On Window Drag
1. Allow free positioning during drag
2. On drag release, check for overlaps
3. If overlapping:
   - Option A: Snap to nearest free position
   - Option B: Push overlapping windows aside
   - Option C: Allow overlap but show z-index clearly (not recommended per requirements)

### Grid Snapping (Optional Enhancement)
- Define a grid (e.g., 20px cells)
- Window positions snap to grid on drag release
- Makes alignment cleaner and easier to manage

## LocalStorage Schema

```typescript
interface SavedLayout {
  version: number; // Schema version for migration
  windows: {
    [windowId: string]: {
      x: number;
      y: number;
      width: number;
      height: number;
      visible: boolean;
      minimized: boolean;
      pinned: boolean; // Whether window is pinned from auto-close
    };
  };
  lastSaved: number; // Timestamp
}
```

Storage key: `ai-village-window-layout`

## Implementation Phases

### Phase 1: Core Window Manager (Minimal Viable)
- [ ] Create WindowManager class
- [ ] Define IWindowPanel interface
- [ ] Implement window registration
- [ ] Add draggable title bars to existing panels
- [ ] Basic rendering of managed windows with z-index

### Phase 2: Collision Avoidance
- [ ] Implement overlap detection
- [ ] Add cascade positioning
- [ ] Add "snap to available space" logic

### Phase 3: Persistence
- [ ] Save window positions to localStorage
- [ ] Load positions on startup
- [ ] Reset to defaults if corrupted

### Phase 4: Advanced Features
- [ ] Window minimize/maximize
- [ ] Windows menu UI
- [ ] Grid snapping
- [ ] Tile/cascade layout commands
- [ ] Window resize handles (if resizable panels desired)

## Edge Cases

### Canvas Resize
When the game canvas is resized:
- Windows positioned relative to right edge should maintain their offset
- Windows positioned relative to bottom edge should maintain their offset
- Windows completely off-screen should snap back to visible area

### Window Too Large for Canvas
If a window's saved size exceeds the current canvas:
- Clamp window size to fit within canvas bounds
- Maintain aspect ratio if possible
- Position at (0, 0) or nearest valid position

### First Run (No Saved Layout)
- Use default positions from WindowConfig
- Ensure no overlaps in default layout
- Show brief tutorial hint: "Drag windows by their title bars to rearrange"

### Out of Space (LRU Eviction)
When all available screen space is occupied:
- Spiral search fails to find free space
- Cascade would place window off-screen
- LRU eviction is triggered:
  1. Find oldest non-pinned, non-modal window
  2. Close that window with notification
  3. Place new window in freed space
- If all windows are pinned: Show error message "Cannot open window - unpin a window to make space"

## Testing Checklist

- [ ] All panels implement IWindowPanel
- [ ] Windows can be dragged without overlap
- [ ] Positions persist across page reloads
- [ ] Windows restore correctly after canvas resize
- [ ] Keyboard shortcuts still work (R, M, I, ESC, etc.)
- [ ] Click-through works: clicking game world behind windows still selects entities
- [ ] No performance degradation (60fps maintained)
- [ ] Works on different screen sizes (1920x1080, 1366x768, etc.)

### LRU Eviction Tests
- [ ] Opening windows fills canvas until no space remains
- [ ] When no space available, oldest non-pinned window is closed automatically
- [ ] Notification appears when window is auto-closed
- [ ] Pinned windows are never auto-closed
- [ ] Modal windows are never auto-closed
- [ ] Interaction with a window updates its lastInteractionTime
- [ ] LRU tracking persists across page reloads
- [ ] Clicking, dragging, focusing a window all count as interactions
- [ ] Auto-closed window can be re-opened manually

## Future Enhancements (Out of Scope for MVP)

- Window docking zones (snap to edges)
- Tabbed window groups (e.g., Agent/Animal/Plant info in one tabbed panel)
- Custom window themes/opacity
- Multi-monitor support (if running in Electron)
- Save multiple layout presets ("Layout 1", "Layout 2", etc.)
- Window animations (smooth open/close, minimize effects)

## Notes

- All existing keyboard shortcuts must continue to work
- BuildingPlacementUI may not need full window management (it's a ghost renderer, not a panel)
- Consider making context-sensitive panels (Agent/Animal/Plant info) share the same window slot
- Modal panels (Inventory, Crafting) should dim the background and center themselves
