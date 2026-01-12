# Renderer Types

Shared type definitions for the window management system.

## Overview

This directory contains TypeScript interfaces and type definitions used by WindowManager and all UI panels. These types enforce consistency across 40+ panels and enable type-safe window management.

## Key Types

### IWindowPanel

Interface that all panels must implement to be managed by WindowManager.

**Required methods:**
- `getId()`, `getTitle()`: Panel identification
- `getDefaultWidth()`, `getDefaultHeight()`: Default dimensions
- `isVisible()`, `setVisible(visible)`: Visibility state
- `render(ctx, x, y, width, height, world?)`: Canvas rendering

**Optional methods:**
- `renderHeader(ctx, x, y, width)`: Custom header controls
- `handleScroll(deltaY, contentHeight)`: Scroll handling
- `handleContentClick(x, y, width, height)`: Click handling

### WindowConfig

Configuration for managed windows:
- **Position/Size**: `defaultX/Y`, `defaultWidth/Height`, `min/maxWidth/Height`
- **Behavior**: `isModal`, `isResizable`, `isDraggable`
- **Organization**: `showInWindowList`, `keyboardShortcut`, `menuCategory`

### WindowMenuCategory

Enum for organizing windows in menu bar: `'info' | 'economy' | 'social' | 'farming' | 'animals' | 'research' | 'magic' | 'divinity' | 'dev' | 'settings' | 'default'`

### ManagedWindow

Internal state for active windows:
- **Transform**: `x`, `y`, `width`, `height`, `zIndex`
- **State**: `visible`, `minimized`, `pinned`
- **Interaction**: `isDragging`, `isResizing`, `dragOffsetX/Y`, `resizeStart*`
- **LRU tracking**: `lastInteractionTime`, `openedTime`

### SavedLayout

Persistence schema for localStorage:
- `version`: Schema version for migrations
- `windows`: Map of window ID to position/size/state
- `lastSaved`: Timestamp

### Supporting Types

- **WindowAutoCloseEvent**: Payload for auto-close notifications
- **LayoutMode**: `'cascade' | 'tile' | 'restore'` for arrangement
- **TitleBarButton**: `'close' | 'minimize' | 'pin' | 'menu' | null`

## Usage by WindowManager

WindowManager uses these types to:
1. **Register panels** via `registerWindow(panel, config)` - type checks `IWindowPanel` implementation
2. **Maintain state** in `ManagedWindow[]` - tracks position, visibility, z-order, LRU
3. **Handle interactions** - drag/resize state machines, click routing via `handleContentClick`
4. **Persist layouts** to localStorage as `SavedLayout` - restore user-configured positions
5. **Auto-close** least-recently-used windows when exceeding max open limit (8)
6. **Organize menu** by `WindowMenuCategory` with keyboard shortcuts

## Example Implementation

```typescript
export class MyPanel implements IWindowPanel {
  getId(): string { return 'my-panel'; }
  getTitle(): string { return 'My Panel'; }
  getDefaultWidth(): number { return 400; }
  getDefaultHeight(): number { return 300; }

  isVisible(): boolean { return this.visible; }
  setVisible(visible: boolean): void { this.visible = visible; }

  render(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    // Render panel content
  }

  handleContentClick(x: number, y: number, width: number, height: number): boolean {
    // Handle clicks
    return true; // if handled
  }
}
```

## Files

- **WindowTypes.ts**: All type definitions (274 lines)
