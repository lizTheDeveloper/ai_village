# Inventory UI - Specification

**Created:** 2025-12-21
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The inventory UI provides players with a comprehensive interface to manage their agent's carried items, equipment, and storage. It supports grid-based item display, drag-and-drop organization, item inspection, and integration with crafting, trading, and equipment systems.

---

## Requirements

### REQ-INV-001: Inventory Panel Structure

The inventory SHALL be organized into distinct sections.

```typescript
interface InventoryPanel {
  // Panel state
  isOpen: boolean;
  activeTab: InventoryTab;

  // Sections
  equipment: EquipmentSection;
  backpack: BackpackSection;
  quickBar: QuickBarSection;

  // Optional sections (context-dependent)
  storage?: StorageSection;        // When accessing chest/container
  trade?: TradeSection;            // When trading
  crafting?: CraftingSection;      // When at workstation

  // Interaction state
  heldItem: ItemStack | null;      // Currently dragging
  selectedSlot: SlotReference | null;
  tooltipItem: ItemStack | null;
}

type InventoryTab =
  | "all"
  | "equipment"
  | "consumables"
  | "materials"
  | "tools"
  | "valuables"
  | "quest";

interface SlotReference {
  section: "equipment" | "backpack" | "quickbar" | "storage";
  index: number;
}
```

### REQ-INV-002: Equipment Section

Equipment slots SHALL display currently worn/held items.

```typescript
interface EquipmentSection {
  slots: Map<EquipmentSlot, ItemStack | null>;

  // Character preview
  showCharacterPreview: boolean;
  previewPose: "standing" | "action";
}

type EquipmentSlot =
  | "head"
  | "chest"
  | "legs"
  | "feet"
  | "hands"
  | "back"           // Backpack, cape, wings
  | "neck"           // Necklace, scarf
  | "ring_left"
  | "ring_right"
  | "main_hand"
  | "off_hand";

interface EquipmentSlotDisplay {
  slot: EquipmentSlot;
  position: { x: number; y: number };
  size: { width: number; height: number };
  icon: string;                    // Empty slot icon
  acceptedTypes: ItemType[];       // What can go here
  locked: boolean;                 // Some slots unlock with progression
}
```

**Equipment Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  EQUIPMENT                                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    ┌─────┐                          │    │
│  │                    │ HEAD│                          │    │
│  │                    └─────┘                          │    │
│  │         ┌─────┐    ┌─────┐    ┌─────┐              │    │
│  │         │NECK │    │     │    │BACK │              │    │
│  │         └─────┘    │     │    └─────┘              │    │
│  │                    │ 🧑  │                          │    │
│  │  ┌─────┐ ┌─────┐  │     │  ┌─────┐ ┌─────┐        │    │
│  │  │MAIN │ │HANDS│  │CHEST│  │HANDS│ │ OFF │        │    │
│  │  │HAND │ └─────┘  │     │  └─────┘ │HAND │        │    │
│  │  └─────┘          │     │          └─────┘        │    │
│  │                    │LEGS │                          │    │
│  │  ┌─────┐          │     │          ┌─────┐        │    │
│  │  │RING │          └─────┘          │RING │        │    │
│  │  │ L   │          ┌─────┐          │ R   │        │    │
│  │  └─────┘          │FEET │          └─────┘        │    │
│  │                    └─────┘                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Stats:  ⚔️ 12  🛡️ 8  💨 5  ❤️ +20                          │
└─────────────────────────────────────────────────────────────┘
```

### REQ-INV-003: Backpack Grid

The backpack SHALL use a grid-based slot system.

```typescript
interface BackpackSection {
  slots: (ItemStack | null)[];
  gridSize: { columns: number; rows: number };
  capacity: number;                // Total slots
  usedSlots: number;

  // Weight system (optional)
  weightEnabled: boolean;
  currentWeight: number;
  maxWeight: number;

  // Sorting
  sortMode: SortMode;
  filterMode: ItemType | "all";
}

interface ItemStack {
  itemId: string;
  item: Item;
  quantity: number;
  durability?: number;             // Current / max
  customData?: Map<string, unknown>;
}

interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;

  // Visuals
  icon: string;
  iconTint?: string;

  // Stacking
  stackable: boolean;
  maxStack: number;

  // Weight
  weight: number;

  // Value
  baseValue: number;

  // Usage
  usable: boolean;
  equipable: boolean;
  equipSlots: EquipmentSlot[];
  consumable: boolean;

  // Requirements
  levelRequired?: number;
  skillRequired?: Map<string, number>;
}

type ItemType =
  | "weapon"
  | "armor"
  | "tool"
  | "consumable"
  | "material"
  | "seed"
  | "food"
  | "valuable"
  | "quest"
  | "container"
  | "furniture"
  | "misc";

type ItemRarity =
  | "common"       // White/gray
  | "uncommon"     // Green
  | "rare"         // Blue
  | "epic"         // Purple
  | "legendary"    // Orange
  | "unique";      // Gold

type SortMode =
  | "default"      // As acquired
  | "name"
  | "type"
  | "rarity"
  | "value"
  | "weight"
  | "recent";
```

**Backpack Grid Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  BACKPACK                          [Sort ▼] [Filter ▼]      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐   │    │
│  │ │🪓 │ │🌾│ │🌾│ │🥕│ │🪨│ │🪵│ │🪵│ │   │   │    │
│  │ │ 1 │ │64│ │32│ │ 5│ │99│ │48│ │12│ │   │   │    │
│  │ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘   │    │
│  │ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐   │    │
│  │ │🍎│ │🍖│ │💎│ │📜│ │   │ │   │ │   │ │   │   │    │
│  │ │10│ │ 3│ │ 2│ │ 1│ │   │ │   │ │   │ │   │   │    │
│  │ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘   │    │
│  │ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐   │    │
│  │ │   │ │   │ │   │ │   │ │   │ │   │ │   │ │   │   │    │
│  │ │   │ │   │ │   │ │   │ │   │ │   │ │   │ │   │   │    │
│  │ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  16/24 slots · 45.2/100 kg                    [Auto-Sort]   │
└─────────────────────────────────────────────────────────────┘
```

### REQ-INV-004: Item Tooltips

Hovering over items SHALL display detailed information.

```typescript
interface ItemTooltip {
  // Header
  name: string;
  rarity: ItemRarity;
  type: string;

  // Stats (for equipment)
  stats?: ItemStats;
  comparison?: StatComparison;     // vs currently equipped

  // Description
  description: string;
  flavorText?: string;

  // Properties
  properties: ItemProperty[];

  // Requirements
  requirements?: ItemRequirements;
  requirementsMet: boolean;

  // Value
  value: number;
  sellValue: number;

  // Actions
  availableActions: ItemAction[];
}

interface ItemStats {
  damage?: { min: number; max: number; type: string };
  armor?: number;
  speed?: number;
  durability?: { current: number; max: number };
  customStats?: Map<string, number>;
}

interface StatComparison {
  differences: Map<string, { current: number; new: number; delta: number }>;
  isUpgrade: boolean;
  isDowngrade: boolean;
  isSidegrade: boolean;
}

interface ItemProperty {
  icon: string;
  text: string;
  color?: string;
}

interface ItemRequirements {
  level?: number;
  skills?: Map<string, number>;
  stats?: Map<string, number>;
}

type ItemAction =
  | "use"
  | "equip"
  | "unequip"
  | "consume"
  | "drop"
  | "destroy"
  | "split"
  | "inspect"
  | "favorite"
  | "assign_hotkey";
```

**Item Tooltip Layout:**
```
┌─────────────────────────────┐
│ ⚔️ IRON SWORD               │
│ Uncommon Weapon             │
├─────────────────────────────┤
│ Damage: 8-12 (Physical)     │
│ Speed: 1.2                  │
│ Durability: 45/50           │
├─────────────────────────────┤
│ +2 Strength                 │
│ +5% Critical Chance         │
├─────────────────────────────┤
│ "Forged in the village      │
│  smithy, this blade has     │
│  seen many harvests."       │
├─────────────────────────────┤
│ Requires: Level 5           │
│           Strength 8  ✓     │
├─────────────────────────────┤
│ Sell Value: 25 coins        │
├─────────────────────────────┤
│ [E] Equip  [Q] Drop         │
│ [X] Destroy                 │
└─────────────────────────────┘

Comparison Indicator (when hovering armor):
┌─────────────────────────────┐
│ 🛡️ LEATHER CHESTPIECE       │
│ Common Armor                │
├─────────────────────────────┤
│ Armor: 12                   │
│                             │
│ ── Compared to Equipped ──  │
│ Armor:  8 → 12  (+4) ▲      │
│ Speed: 10 → 8   (-2) ▼      │
│                             │
│ Overall: UPGRADE ▲          │
└─────────────────────────────┘
```

### REQ-INV-005: Drag and Drop

Items SHALL be movable via drag and drop.

```typescript
interface DragDropSystem {
  // Current drag state
  isDragging: boolean;
  draggedItem: ItemStack | null;
  dragSource: SlotReference | null;

  // Visual feedback
  dragGhost: DragGhost;
  validDropTargets: SlotReference[];
  invalidDropTargets: SlotReference[];

  // Operations
  startDrag(source: SlotReference): void;
  updateDrag(mousePos: Position): void;
  endDrag(target: SlotReference | null): DragResult;
  cancelDrag(): void;
}

interface DragGhost {
  item: ItemStack;
  position: Position;           // Follows mouse
  opacity: number;              // Semi-transparent
  showQuantity: boolean;
  splitMode: boolean;           // Shift-drag to split
  splitQuantity?: number;
}

interface DragResult {
  success: boolean;
  action: DragAction;
  message?: string;
}

type DragAction =
  | "move"                      // Moved to empty slot
  | "swap"                      // Swapped with existing item
  | "stack"                     // Added to existing stack
  | "equip"                     // Equipped item
  | "unequip"                   // Moved from equipment to backpack
  | "drop"                      // Dropped to world
  | "store"                     // Put in storage
  | "cancel";                   // Cancelled / invalid
```

**Drag and Drop Rules:**
```
WHEN dragging an item
THEN the system SHALL:
  1. Show item ghost following cursor
  2. Highlight valid drop targets (green border)
  3. Show invalid targets (red border or X)
  4. If SHIFT held, enable split mode (show quantity selector)

WHEN dropping on empty slot
THEN move item to that slot

WHEN dropping on same item type (stackable)
THEN combine stacks (up to max stack size)

WHEN dropping on different item
THEN swap items between slots

WHEN dropping on equipment slot
THEN equip item (if valid) and move old item to backpack

WHEN dropping outside inventory
THEN prompt to drop item in world (with confirmation for valuable items)

WHEN pressing ESC during drag
THEN cancel drag and return item to original slot
```

### REQ-INV-006: Quick Bar

The quick bar SHALL provide fast access to items.

```typescript
interface QuickBarSection {
  slots: (ItemStack | null)[];
  slotCount: number;              // Usually 10 (1-9, 0)
  activeSlot: number;             // Currently selected

  // Keybindings
  slotKeys: string[];             // ["1", "2", ... "0"]

  // Display
  showOnHUD: boolean;
  position: "bottom" | "left" | "right";
}
```

**Quick Bar Display (on HUD):**
```
┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
│🪓│🌱│💧│🔨│🍎│   │   │   │   │   │
│ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │ 8 │ 9 │ 0 │
└───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘
  ▲
  └── Active slot indicator
```

### REQ-INV-007: Item Context Menu

Right-clicking items SHALL show a context menu.

```typescript
interface ItemContextMenu {
  item: ItemStack;
  slot: SlotReference;
  position: Position;

  actions: ContextMenuAction[];
}

interface ContextMenuAction {
  id: string;
  label: string;
  icon?: string;
  hotkey?: string;
  enabled: boolean;
  disabledReason?: string;
  dangerous?: boolean;           // Show in red, require confirmation
  submenu?: ContextMenuAction[];
}
```

**Context Menu:**
```
┌─────────────────────┐
│ 🍎 Apple (x10)      │
├─────────────────────┤
│ ▶ Use           [E] │
│ ▶ Eat One       [R] │
│ ─────────────────── │
│ ▶ Split Stack       │
│ ▶ Assign to Hotbar ▶│
│ ─────────────────── │
│ ▶ Drop          [Q] │
│ ▶ Drop All          │
│ ─────────────────── │
│ ▶ Destroy       [X] │  ← Red text
└─────────────────────┘
```

### REQ-INV-008: Stack Splitting

Players SHALL be able to split item stacks.

```typescript
interface StackSplitDialog {
  item: ItemStack;
  totalQuantity: number;
  splitQuantity: number;

  // Controls
  slider: { min: 1; max: number; value: number };
  incrementButtons: boolean;     // +1, +10, -1, -10
  halfButton: boolean;           // Split in half

  // Result
  confirm(): SplitResult;
  cancel(): void;
}

interface SplitResult {
  originalStack: ItemStack;      // Remaining
  newStack: ItemStack;           // Split off
}
```

**Stack Split Dialog:**
```
┌─────────────────────────────────┐
│ Split Stack                     │
├─────────────────────────────────┤
│                                 │
│  🌾 Wheat (64 total)            │
│                                 │
│  Take: ◄━━━━━━●━━━━━► 32        │
│                                 │
│  [-10] [-1]  [Half]  [+1] [+10] │
│                                 │
│  Leave: 32    Take: 32          │
│                                 │
├─────────────────────────────────┤
│      [Cancel]     [Confirm]     │
└─────────────────────────────────┘
```

### REQ-INV-009: Storage Containers

Accessing containers SHALL open a split view.

```typescript
interface StoragePanel {
  container: Container;
  containerName: string;
  containerIcon: string;

  // Grid
  slots: (ItemStack | null)[];
  capacity: number;

  // Permissions
  canTake: boolean;
  canStore: boolean;
  canSort: boolean;

  // Quick actions
  takeAll(): void;
  storeAll(filter?: ItemType): void;
  sortContainer(): void;
}

interface Container {
  id: string;
  type: ContainerType;
  name: string;
  capacity: number;
  items: ItemStack[];

  // Access
  ownerId?: string;
  isLocked: boolean;
  isShared: boolean;
}

type ContainerType =
  | "chest"
  | "barrel"
  | "crate"
  | "sack"
  | "cabinet"
  | "refrigerator"
  | "vault";
```

**Container + Inventory View:**
```
┌───────────────────────────────┬───────────────────────────────┐
│  WOODEN CHEST                 │  YOUR BACKPACK                │
│  ┌───┬───┬───┬───┬───┬───┐   │  ┌───┬───┬───┬───┬───┬───┐   │
│  │🪵│🪵│🪨│   │   │   │   │  │🪓│🌾│🌾│🥕│🪨│🪵│   │
│  │99│48│50│   │   │   │   │  │ 1│64│32│ 5│99│48│   │
│  ├───┼───┼───┼───┼───┼───┤   │  ├───┼───┼───┼───┼───┼───┤   │
│  │   │   │   │   │   │   │   │  │🍎│🍖│💎│📜│   │   │   │
│  │   │   │   │   │   │   │   │  │10│ 3│ 2│ 1│   │   │   │
│  └───┴───┴───┴───┴───┴───┘   │  └───┴───┴───┴───┴───┴───┘   │
│                               │                               │
│  3/12 slots                   │  12/24 slots                  │
│                               │                               │
│  [Take All] [Sort]            │  [Store All] [Sort]           │
└───────────────────────────────┴───────────────────────────────┘
```

### REQ-INV-010: Search and Filter

Players SHALL be able to search and filter items.

```typescript
interface InventorySearch {
  query: string;

  // Filters
  typeFilter: ItemType | "all";
  rarityFilter: ItemRarity | "all";

  // Results
  matchingSlots: number[];
  highlightMatches: boolean;
  dimNonMatches: boolean;
}
```

**Search Bar:**
```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Search: [wheat          ] [Type: All ▼] [Rarity: All ▼] │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐   │    │
│  │ │░░░│ │🌾│ │🌾│ │░░░│ │░░░│ │░░░│ │░░░│ │░░░│   │    │
│  │ │░░░│ │64│ │32│ │░░░│ │░░░│ │░░░│ │░░░│ │░░░│   │    │
│  │ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘   │    │
│  │   ▲                                                 │    │
│  │   └── Dimmed (doesn't match search)                │    │
│  └─────────────────────────────────────────────────────┘    │
│  Found: 2 items (96 total wheat)                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Visual Style

### REQ-INV-011: 8-Bit Aesthetic

The inventory SHALL match the game's pixel art style.

```typescript
interface InventoryStyle {
  // Panel
  panelBackground: string;
  panelBorder: NineSlice;

  // Slots
  slotBackground: string;
  slotBorder: string;
  slotSize: number;              // Pixels (e.g., 32)
  slotSpacing: number;

  // Rarity colors
  rarityColors: Map<ItemRarity, string>;

  // Item display
  itemIconSize: number;
  quantityFont: PixelFont;
  quantityPosition: "bottom-right" | "bottom-left";

  // Durability bar
  durabilityBarHeight: number;
  durabilityBarPosition: "bottom" | "top";
  durabilityColors: { full: string; half: string; low: string };

  // Hover effects
  hoverGlow: boolean;
  hoverScale: number;
}

const defaultInventoryStyle: InventoryStyle = {
  panelBackground: "rgba(30, 25, 20, 0.95)",
  panelBorder: nineslice_wood,

  slotBackground: "#2a2520",
  slotBorder: "#4a4540",
  slotSize: 40,
  slotSpacing: 4,

  rarityColors: new Map([
    ["common", "#9d9d9d"],
    ["uncommon", "#1eff00"],
    ["rare", "#0070dd"],
    ["epic", "#a335ee"],
    ["legendary", "#ff8000"],
    ["unique", "#e6cc80"],
  ]),

  itemIconSize: 32,
  quantityFont: { name: "pixel", size: 8 },
  quantityPosition: "bottom-right",

  durabilityBarHeight: 2,
  durabilityBarPosition: "bottom",
  durabilityColors: { full: "#4ade80", half: "#facc15", low: "#ef4444" },

  hoverGlow: true,
  hoverScale: 1.05,
};
```

---

## Keyboard Shortcuts

### REQ-INV-012: Inventory Hotkeys

```
INVENTORY CONTROLS:
- I / Tab      : Toggle inventory
- Escape       : Close inventory
- 1-9, 0       : Quick bar slots
- E            : Use/Equip selected item
- Q            : Drop selected item
- X            : Destroy selected item (with confirmation)
- Shift+Click  : Quick move (inventory <-> equipment/storage)
- Ctrl+Click   : Split stack in half
- Right-Click  : Context menu
- Scroll       : Scroll inventory if overflow
- Ctrl+F       : Focus search bar

WHILE DRAGGING:
- Shift        : Enable split mode
- Escape       : Cancel drag
- Right-Click  : Cancel drag
```

---

## Integration

### REQ-INV-013: System Integration

The inventory SHALL integrate with other systems.

```typescript
interface InventoryIntegration {
  // Crafting
  openCraftingWith(stationId: string): void;
  getCraftableRecipes(): Recipe[];
  hasIngredients(recipe: Recipe): boolean;

  // Trading
  openTradeWith(agentId: string): void;
  getTradeableItems(): ItemStack[];

  // Equipment
  equipItem(itemId: string, slot?: EquipmentSlot): boolean;
  unequipSlot(slot: EquipmentSlot): boolean;
  getEquipmentStats(): CombinedStats;

  // Storage
  transferToStorage(itemId: string, containerId: string): boolean;
  transferFromStorage(itemId: string, containerId: string): boolean;

  // Quick actions from world
  pickupItem(worldItemId: string): boolean;
  dropItem(itemId: string, position?: Position): boolean;
}
```

---

## Performance

### REQ-INV-014: Optimization

```
Performance Constraints:
- Inventory open: < 16ms (60fps)
- Item hover tooltip: < 5ms
- Drag update: < 2ms per frame
- Sort operation: < 100ms for 100 items
- Search filter: < 50ms for 100 items

Optimization Strategies:
- Lazy render only visible slots
- Cache item tooltip content
- Debounce search input (150ms)
- Virtualize large grids (>50 slots)
```

---

## Open Questions

1. Multi-bag system (multiple backpacks with different capacities)?
2. Item favorites/pinning to prevent accidental drop/sell?
3. Junk marking for quick sell?
4. Item comparison across multiple equipment slots?
5. Loadout presets (save/load equipment sets)?
6. Shared storage between agents?
7. Item gifting UI for giving items to other agents?

---

## Related Specs

**Core Integration:**
- `items-system/spec.md` - Item definitions and properties
- `rendering-system/spec.md` - UI rendering system
- `player-system/spec.md` - Input handling

**Feature Integration:**
- `economy-system/spec.md` - Trading and selling
- `construction-system/spec.md` - Building with materials
- `farming-system/spec.md` - Seeds and harvests
