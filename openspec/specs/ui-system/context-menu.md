# Context Menu UI Specification

## Overview

The Context Menu provides quick access to context-sensitive actions through right-click interactions. Features a radial menu design for quick access, with actions that adapt based on what entity or tile is clicked.

## Version

0.1.0

## Dependencies

- `core/ecs.md` - Entity-Component-System architecture
- `core/input.md` - Input handling
- `entities/agent.md` - Agent actions
- `entities/buildings.md` - Building actions
- `systems/selection.md` - Selection system

## Requirements

### REQ-CTXMENU-001: Radial Menu Display
- **Description**: Circular menu appearing on right-click
- **Priority**: MUST

```typescript
interface RadialMenu {
  isOpen: boolean;
  position: Vector2;           // Screen position (where clicked)
  worldPosition: Vector2;      // World position clicked

  // Menu content
  items: RadialMenuItem[];
  selectedItem: RadialMenuItem | null;
  hoveredItem: RadialMenuItem | null;

  // Visual configuration
  innerRadius: number;         // Dead zone in center
  outerRadius: number;         // Outer edge of items
  itemArcAngle: number;        // Calculated from item count

  // State
  openTime: number;            // When menu opened
  hasSubmenu: boolean;
  activeSubmenu: RadialSubmenu | null;

  // Methods
  open(screenPos: Vector2, worldPos: Vector2, context: MenuContext): void;
  close(): void;
  updateHover(screenPos: Vector2): void;
  selectHovered(): void;

  // Rendering
  render(ctx: CanvasRenderingContext2D): void;
}

interface RadialMenuItem {
  id: string;
  label: string;
  icon: Sprite;
  shortcutKey: string | null;

  // State
  enabled: boolean;
  highlighted: boolean;
  hasSubmenu: boolean;

  // Visual
  startAngle: number;
  endAngle: number;
  color: Color;
  hoverColor: Color;
  disabledColor: Color;

  // Action
  action: ContextAction | null;
  submenuItems: RadialMenuItem[] | null;
}

interface RadialSubmenu {
  parentItem: RadialMenuItem;
  items: RadialMenuItem[];
  position: Vector2;
  direction: "outward" | "side";
}
```

### REQ-CTXMENU-002: Context Detection
- **Description**: Determine context based on what was right-clicked
- **Priority**: MUST

```typescript
interface MenuContext {
  // What was clicked
  targetType: ContextTargetType;
  targetEntity: EntityId | null;
  targetTile: Vector2;
  targetTerrain: TerrainType;

  // Selection state
  hasSelection: boolean;
  selectedEntities: EntityId[];
  selectedTypes: EntityType[];

  // Available actions based on context
  availableActions: ContextAction[];

  // Method to build context
  static fromClick(worldPos: Vector2, world: World): MenuContext;
}

type ContextTargetType =
  | "empty_tile"       // Nothing there
  | "terrain"          // Just terrain feature
  | "agent"            // Agent entity
  | "building"         // Building entity
  | "item"             // Dropped item
  | "resource"         // Harvestable resource
  | "plant"            // Plant/tree
  | "multiple";        // Multiple entities at location

interface ContextBuilder {
  // Build menu items for each context type
  buildEmptyTileMenu(context: MenuContext): RadialMenuItem[];
  buildAgentMenu(agent: EntityId, context: MenuContext): RadialMenuItem[];
  buildBuildingMenu(building: EntityId, context: MenuContext): RadialMenuItem[];
  buildResourceMenu(resource: EntityId, context: MenuContext): RadialMenuItem[];
  buildMultiSelectMenu(entities: EntityId[], context: MenuContext): RadialMenuItem[];
}
```

### REQ-CTXMENU-003: Context Actions
- **Description**: Available actions based on context type
- **Priority**: MUST

```typescript
interface ContextAction {
  id: string;
  label: string;
  icon: Sprite;
  category: ActionCategory;
  shortcut: string | null;

  // Applicability
  applicableTo: ContextTargetType[];
  requiresSelection: boolean;

  // Validation
  isAvailable(context: MenuContext): boolean;
  canExecute(context: MenuContext): boolean;

  // Execution
  execute(context: MenuContext): void;
}

type ActionCategory =
  | "movement"         // Go to, follow, patrol
  | "interaction"      // Talk, trade, inspect
  | "work"             // Harvest, build, craft
  | "combat"           // Attack, defend, flee
  | "management"       // Assign, dismiss, prioritize
  | "building"         // Enter, repair, demolish
  | "utility";         // Cancel, info, select

// Standard actions for agents
const AGENT_ACTIONS: ContextAction[] = [
  {
    id: "move_to",
    label: "Move Here",
    category: "movement",
    applicableTo: ["empty_tile", "terrain"],
    execute: (ctx) => moveAgentTo(ctx.selectedEntities, ctx.targetTile)
  },
  {
    id: "follow",
    label: "Follow",
    category: "movement",
    applicableTo: ["agent"],
    execute: (ctx) => followAgent(ctx.selectedEntities[0], ctx.targetEntity)
  },
  {
    id: "talk_to",
    label: "Talk To",
    category: "interaction",
    applicableTo: ["agent"],
    execute: (ctx) => initConversation(ctx.selectedEntities[0], ctx.targetEntity)
  },
  {
    id: "inspect",
    label: "Inspect",
    category: "utility",
    applicableTo: ["agent", "building", "resource", "item"],
    execute: (ctx) => openInspectPanel(ctx.targetEntity)
  },
  // ... more actions
];

// Standard actions for buildings
const BUILDING_ACTIONS: ContextAction[] = [
  {
    id: "enter",
    label: "Enter",
    category: "building",
    applicableTo: ["building"],
    isAvailable: (ctx) => getBuildingComponent(ctx.targetEntity)?.canEnter
  },
  {
    id: "repair",
    label: "Repair",
    category: "building",
    applicableTo: ["building"],
    isAvailable: (ctx) => getBuildingHealth(ctx.targetEntity) < 1.0
  },
  {
    id: "demolish",
    label: "Demolish",
    category: "building",
    applicableTo: ["building"]
  },
  // ... more actions
];
```

### REQ-CTXMENU-004: Selection Context Menu
- **Description**: Menu for when entities are already selected
- **Priority**: MUST

```typescript
interface SelectionContextMenu {
  // When right-clicking with selection active
  selectedEntities: EntityId[];
  selectionTypes: Set<EntityType>;

  // Determines if action applies to selection
  isSelectionAction: boolean;

  // Multi-entity actions
  buildSelectionActions(context: MenuContext): RadialMenuItem[];
}

// Actions when multiple agents selected
const MULTI_AGENT_ACTIONS: ContextAction[] = [
  {
    id: "move_all",
    label: "Move All Here",
    category: "movement",
    requiresSelection: true,
    execute: (ctx) => moveAgentsTo(ctx.selectedEntities, ctx.targetTile)
  },
  {
    id: "group_select",
    label: "Create Group",
    category: "management",
    execute: (ctx) => createAgentGroup(ctx.selectedEntities)
  },
  {
    id: "scatter",
    label: "Scatter",
    category: "movement",
    execute: (ctx) => scatterAgents(ctx.selectedEntities, ctx.targetTile)
  },
  {
    id: "formation",
    label: "Formation",
    category: "movement",
    hasSubmenu: true,
    submenuItems: [
      { id: "formation_line", label: "Line" },
      { id: "formation_column", label: "Column" },
      { id: "formation_circle", label: "Circle" },
      { id: "formation_spread", label: "Spread" }
    ]
  }
];
```

### REQ-CTXMENU-005: Empty Tile Actions
- **Description**: Actions available when clicking empty space
- **Priority**: MUST

```typescript
interface EmptyTileActions {
  // Context for empty tile
  tilePosition: Vector2;
  terrain: TerrainType;
  canBuild: boolean;
  canWalk: boolean;

  // Available actions
  getActions(context: MenuContext): RadialMenuItem[];
}

const EMPTY_TILE_ACTIONS: ContextAction[] = [
  {
    id: "move_selected_here",
    label: "Move Here",
    category: "movement",
    requiresSelection: true,
    isAvailable: (ctx) => ctx.hasSelection && isTileWalkable(ctx.targetTile)
  },
  {
    id: "build",
    label: "Build",
    category: "building",
    hasSubmenu: true,
    isAvailable: (ctx) => canBuildOnTile(ctx.targetTile),
    // Submenu shows building categories
  },
  {
    id: "place_waypoint",
    label: "Place Waypoint",
    category: "utility"
  },
  {
    id: "zoom_here",
    label: "Focus Camera",
    category: "utility"
  },
  {
    id: "info",
    label: "Tile Info",
    category: "utility"
  }
];
```

### REQ-CTXMENU-006: Resource/Harvestable Actions
- **Description**: Actions for interactive resources
- **Priority**: MUST

```typescript
interface ResourceActions {
  resource: EntityId;
  resourceType: ResourceType;
  harvestProgress: number;
  canHarvest: boolean;

  getActions(context: MenuContext): RadialMenuItem[];
}

const RESOURCE_ACTIONS: ContextAction[] = [
  {
    id: "harvest",
    label: "Harvest",
    category: "work",
    isAvailable: (ctx) => {
      const res = getResourceComponent(ctx.targetEntity);
      return res && res.amount > 0;
    }
  },
  {
    id: "assign_harvester",
    label: "Assign Worker",
    category: "management",
    requiresSelection: true
  },
  {
    id: "mark_priority",
    label: "Prioritize",
    category: "management",
    hasSubmenu: true,
    submenuItems: [
      { id: "priority_high", label: "High" },
      { id: "priority_normal", label: "Normal" },
      { id: "priority_low", label: "Low" },
      { id: "priority_forbidden", label: "Forbid" }
    ]
  },
  {
    id: "resource_info",
    label: "Info",
    category: "utility"
  }
];
```

### REQ-CTXMENU-007: Quick Action Shortcuts
- **Description**: Keyboard shortcuts for menu items
- **Priority**: SHOULD

```typescript
interface QuickActionShortcuts {
  // Each menu item can have a shortcut
  shortcutBindings: Map<string, ContextAction>;

  // Display shortcuts on menu
  showShortcutsOnMenu: boolean;

  // Allow pressing key while menu open
  handleKeyWhileOpen(key: string): boolean;

  // Quick action without opening menu
  handleQuickAction(key: string, context: MenuContext): boolean;
}

interface ShortcutDisplay {
  // How shortcut appears on menu item
  position: "corner" | "label" | "tooltip";
  style: ShortcutStyle;
}

interface ShortcutStyle {
  font: PixelFont;
  fontSize: number;
  backgroundColor: Color;
  textColor: Color;
  padding: number;
}

// Default shortcuts
const DEFAULT_SHORTCUTS: Map<string, string> = new Map([
  ["move_to", "M"],
  ["inspect", "I"],
  ["talk_to", "T"],
  ["harvest", "H"],
  ["build", "B"],
  ["attack", "A"],
  ["cancel", "Escape"]
]);
```

### REQ-CTXMENU-008: Submenu Navigation
- **Description**: Nested menus for complex actions
- **Priority**: SHOULD

```typescript
interface SubmenuNavigation {
  // Current submenu stack
  menuStack: RadialMenuItem[][];
  currentLevel: number;

  // Navigation
  enterSubmenu(item: RadialMenuItem): void;
  exitSubmenu(): void;
  exitAllSubmenus(): void;

  // Visual
  submenuTransition: TransitionType;
  submenuDirection: SubmenuDirection;
}

type SubmenuDirection =
  | "expand"      // Submenu expands from parent
  | "replace"     // Submenu replaces parent
  | "side";       // Submenu appears to side

type TransitionType =
  | "instant"
  | "fade"
  | "slide"
  | "grow";

interface SubmenuVisuals {
  // Connection between parent and submenu
  showConnector: boolean;
  connectorColor: Color;

  // Breadcrumb trail
  showBreadcrumbs: boolean;
  breadcrumbPosition: "top" | "center";

  // Back button
  showBackButton: boolean;
  backButtonPosition: "center" | "bottom";
}
```

### REQ-CTXMENU-009: Action Confirmation
- **Description**: Confirmation for destructive actions
- **Priority**: SHOULD

```typescript
interface ActionConfirmation {
  // Actions that require confirmation
  confirmableActions: Set<string>;

  // Confirmation UI
  showConfirmationDialog(
    action: ContextAction,
    context: MenuContext
  ): Promise<boolean>;

  // Quick confirm (hold key)
  holdToConfirm: boolean;
  holdDuration: number;       // Milliseconds
}

interface ConfirmationDialog {
  action: ContextAction;
  message: string;
  confirmLabel: string;
  cancelLabel: string;

  // Optional details
  consequences: string[];     // What will happen
  isDestructive: boolean;

  // UI
  render(ctx: CanvasRenderingContext2D): void;
}

// Actions requiring confirmation
const CONFIRMABLE_ACTIONS = new Set([
  "demolish",
  "dismiss_agent",
  "attack",
  "abandon_task",
  "delete_save"
]);
```

### REQ-CTXMENU-010: Menu Customization
- **Description**: Player customization of context menus
- **Priority**: MAY

```typescript
interface MenuCustomization {
  // Custom action ordering
  actionOrder: Map<ActionCategory, number>;

  // Hide/show actions
  hiddenActions: Set<string>;
  favoriteActions: Set<string>;

  // Quick access ring (inner ring)
  quickAccessActions: string[];  // Max 4-6
  showQuickAccessRing: boolean;

  // Save/load presets
  savePreset(name: string): void;
  loadPreset(name: string): void;
}

interface QuickAccessRing {
  // Inner ring with most-used actions
  items: RadialMenuItem[];
  maxItems: number;           // 4-6

  // Always visible regardless of context
  alwaysShow: string[];       // e.g., ["inspect", "cancel"]

  // Most used (auto-populated)
  usageTracking: Map<string, number>;
  autoPopulate: boolean;
}
```

### REQ-CTXMENU-011: Visual Feedback
- **Description**: Visual indicators and animations
- **Priority**: MUST

```typescript
interface MenuVisualFeedback {
  // Hover effects
  hoverScale: number;          // 1.1 = 10% larger
  hoverBrightness: number;     // 1.2 = 20% brighter

  // Selection animation
  selectPulse: Animation;
  selectSound: string;

  // Disabled visual
  disabledOpacity: number;
  disabledPattern: FillPattern | null;

  // Cursor changes
  cursorOnHover: CursorType;
  cursorOnDisabled: CursorType;
}

interface MenuAnimations {
  // Open/close animations
  openAnimation: AnimationType;
  closeAnimation: AnimationType;
  openDuration: number;
  closeDuration: number;

  // Item animations
  itemAppearDelay: number;     // Stagger item appearance
  itemAppearAnimation: AnimationType;
}

type AnimationType =
  | "none"
  | "fade"
  | "scale"
  | "rotate_in"      // Spiral open
  | "pop";           // Bouncy appear

interface ContextLineIndicator {
  // Line from menu center to target
  showLine: boolean;
  lineColor: Color;
  lineWidth: number;
  lineStyle: "solid" | "dashed";

  // Target highlight
  highlightTarget: boolean;
  targetHighlightColor: Color;
}
```

### REQ-CTXMENU-012: Alternative Menu Styles
- **Description**: Option for different menu layouts
- **Priority**: MAY

```typescript
type MenuStyle = "radial" | "linear" | "grid";

interface LinearContextMenu {
  // Traditional dropdown-style menu
  position: Vector2;
  width: number;

  items: LinearMenuItem[];
  hoveredIndex: number;

  // Nested menus
  openSubmenus: LinearSubmenu[];
}

interface LinearMenuItem {
  id: string;
  label: string;
  icon: Sprite;
  shortcut: string | null;
  enabled: boolean;
  hasSubmenu: boolean;
  dividerAfter: boolean;
}

interface GridContextMenu {
  // Grid of icons
  position: Vector2;
  columns: number;
  cellSize: number;

  items: GridMenuItem[];
  hoveredIndex: number;
}

interface GridMenuItem {
  id: string;
  icon: Sprite;
  tooltip: string;
  enabled: boolean;
}

interface MenuStyleSettings {
  preferredStyle: MenuStyle;
  radialDeadzone: number;
  linearWidth: number;
  gridColumns: number;

  // Auto-switch based on item count
  autoSwitchThreshold: number;
}
```

## Visual Style

```typescript
interface ContextMenuStyle {
  // Radial menu colors
  backgroundColor: Color;        // Semi-transparent dark
  borderColor: Color;
  itemColor: Color;              // Normal item
  itemHoverColor: Color;         // Hovered item
  itemDisabledColor: Color;      // Disabled item
  selectedColor: Color;          // Selected/active item

  // Icon styling
  iconSize: number;              // 24x24 for radial
  iconPadding: number;

  // Labels
  labelFont: PixelFont;
  labelSize: number;
  labelColor: Color;
  labelShadow: boolean;

  // Radial specific
  innerRadius: number;           // 30px
  outerRadius: number;           // 100px
  gapBetweenItems: number;       // 2-4 degrees

  // Connector line
  connectorToTarget: boolean;
  connectorColor: Color;

  // 8-bit styling
  pixelScale: number;
  useDithering: boolean;
}
```

## Input Handling

```typescript
interface ContextMenuInput {
  // Open menu
  openButton: MouseButton;       // Default: Right
  openKey: string | null;        // Alternative key

  // Close menu
  closeOnClickOutside: boolean;
  closeOnEscape: boolean;
  closeOnAction: boolean;

  // Selection
  selectOnClick: boolean;
  selectOnRelease: boolean;      // For gesture-based
  selectOnHover: number;         // Hold duration, 0 = disabled

  // Gesture mode (hold right click, release on option)
  gestureMode: boolean;
  gestureMinDistance: number;
}
```

## State Management

```typescript
interface ContextMenuState {
  isOpen: boolean;
  menuPosition: Vector2;
  worldContext: MenuContext;

  // Current menu items
  currentItems: RadialMenuItem[];
  submenuStack: RadialMenuItem[][];

  // Hover/selection state
  hoveredItem: RadialMenuItem | null;
  selectedItem: RadialMenuItem | null;

  // Animation state
  openProgress: number;
  itemAppearProgress: number[];

  // Methods
  open(screenPos: Vector2, context: MenuContext): void;
  close(): void;
  updateHover(screenPos: Vector2): void;
  executeAction(item: RadialMenuItem): void;

  // Events
  onOpen: Event<MenuContext>;
  onClose: Event<void>;
  onActionExecuted: Event<ContextAction>;
}
```

## Integration Points

- **Input System**: Right-click handling, keyboard shortcuts
- **Selection System**: Selected entity context
- **ECS**: Entity queries for context building
- **World System**: Tile and terrain information
- **Camera System**: Screen to world coordinate conversion
- **Action System**: Executing context actions
