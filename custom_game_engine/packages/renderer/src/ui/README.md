# UI Components

Reusable canvas-based UI components for game panels. Enables drag-drop inventory, tabbed panels, tooltips, and text selection on HTML5 canvas.

## Components

### InventoryUI
Main inventory panel coordinator. Manages open/close state, rendering, and subsystem integration.

**Features**: Equipment slots (11), backpack grid (8×N), quickbar (10 slots), search/filter, capacity display, keyboard shortcuts (I/Tab/Esc)

**Subsystems**: DragDropSystem (item movement), InventorySearch (filtering), ItemTooltip (hover info)

**Integration**: Handles clicks, mouse moves, key presses. Returns boolean to block/allow game input.

### DragDropSystem
Handles drag-drop for items between slots. Supports move, stack, swap, equip, and drop-to-world.

**Modes**:
- Normal: Full stack
- Split (Shift-drag): Partial stack with dialog

**Validation**: Checks equipment compatibility, stack limits, weight capacity

**Events**: Emits `item:transferred`, `item:equipped`, `item:dropped` via EventBus

### TabbedPanel
Generic tabbed interface for canvas panels.

**API**: `renderTabs()`, `handleClick()`, `setCurrentTab()`, `addTab()`, `removeTab()`

**Customization**: Colors, fonts, heights, custom tab renderers

**Callback**: `onTabChange(newTab, oldTab)` for state transitions

### ItemTooltip
Item information popups on hover.

**Content**: Name, rarity, type, description, value, stats, quality

**Comparison**: Shows stat diffs when comparing with equipped items (green=better, red=worse)

**Positioning**: Auto-adjusts to avoid screen edges

**Rarity colors**: Common (gray), uncommon (green), rare (blue), epic (purple), legendary (orange), unique (tan)

### SelectableText
Canvas text with selection/copy support (not shown in provided files, exported in index)

### InventorySearch
Search and filter for inventory items (not shown in provided files, used by InventoryUI)

## DragDropSystem Integration

**Start drag**: `startDrag(slotRef, inventory, {shift: true})`

**Update position**: `updateDrag(x, y)`

**Drop**: `drop(targetSlot, inventory)` returns `DropResult`

**Cancel**: `cancel()` or `handleRightClick()`

**Visual feedback**: `getSlotVisualState(slotRef)` returns dimmed/highlighted/invalid states

**Valid targets**: Calculated on drag start based on item type and equipment compatibility

## Usage Pattern

```typescript
import { InventoryUI, TabbedPanel, DragDropSystem } from './ui';

// Inventory
const inventoryUI = new InventoryUI(canvas, world);
inventoryUI.setPlayerInventory(playerInventory);
inventoryUI.render(ctx, width, height);
if (inventoryUI.handleClick(x, y, button, width, height)) return; // Blocks game input

// Tabs
const tabs = new TabbedPanel([
  {id: 'stats', label: 'Stats'},
  {id: 'skills', label: 'Skills'}
], 'stats');
tabs.renderTabs(ctx, panelX, panelY, panelWidth);
tabs.handleClick(clickX, clickY, panelX, panelY, panelWidth);

// Drag-drop (standalone)
const dragDrop = new DragDropSystem();
dragDrop.startDrag({type: 'backpack', index: 5}, inventory);
dragDrop.updateDrag(mouseX, mouseY);
const result = dragDrop.drop({type: 'equipment', slot: 'head'}, inventory);
```

## Architecture

**Layer**: UI components sit above ECS (no direct World access except InventoryUI)

**Data flow**: Components receive data, render, return interaction results. Parent panels update ECS.

**Immutability**: Drag-drop operations return new inventory objects, don't mutate in-place

**Event-driven**: DragDropSystem emits events for logging/analytics, not core state updates
