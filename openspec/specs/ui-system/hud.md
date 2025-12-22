# Game HUD - UI Specification

**Created:** 2025-12-21
**Status:** Draft
**Version:** 0.1.0
**Depends on:** `player-system/spec.md`

---

## Overview

The HUD (Heads-Up Display) is the main game interface that overlays the game world. It adapts to the current player mode (agent, spectator, management) and provides quick access to essential information, controls, and actions. The HUD serves as the integration point for all other UI panels.

---

## Type Definitions

```typescript
import {
  PlayerMode,
  PlayerState,
  ModeUI,
  ControlScheme,
  Notification,
  NotificationType,
  GameSpeed,
  TimeControl,
} from "@specs/player-system/spec";

import { Avatar } from "@specs/avatar-system/spec";
import { AgentNeeds, Need } from "@specs/agent-system/needs";
import { Position, GameTime } from "@specs/world-system/spec";
```

---

## HUD Structure

### Main HUD Container

```typescript
interface GameHUD {
  // Current mode
  playerMode: PlayerMode;
  hudMode: HUDMode;

  // Core elements (always visible)
  timeDisplay: TimeDisplay;
  minimap: MinimapDisplay;
  notificationArea: NotificationArea;
  quickMenu: QuickMenuBar;

  // Mode-specific elements
  agentHUD: AgentHUD | null;
  spectatorHUD: SpectatorHUD | null;
  managementHUD: ManagementHUD | null;

  // Overlays
  contextActions: ContextActionDisplay | null;
  tooltips: TooltipDisplay | null;
  tutorialHints: TutorialHintDisplay | null;

  // Panel toggles
  openPanels: Set<string>;
  panelStates: Map<string, PanelState>;
}

type HUDMode = "minimal" | "standard" | "detailed" | "cinematic";

interface PanelState {
  panelId: string;
  isOpen: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  pinned: boolean;
}
```

---

## Visual Layout

### Agent Mode HUD

```
┌─────────────────────────────────────────────────────────────────┐
│ ┌─ TIME ──────┐                                 ┌─ MINIMAP ───┐ │
│ │ Day 47      │                                 │             │ │
│ │ 14:32       │                                 │     ◆       │ │
│ │ Spring      │                                 │   ╭───╮     │ │
│ │ ▶ Normal    │                                 │   │ ★ │     │ │
│ └─────────────┘                                 │   ╰───╯     │ │
│                                                 └─────────────┘ │
│                                                                 │
│ ┌─ NOTIFICATIONS ─────────────────────────────────────────────┐ │
│ │ ★ Harvest festival tomorrow!                                │ │
│ │ ○ Marcus wants to trade                          [View] [×] │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                                                 │
│                                                                 │
│                     [GAME WORLD VIEW]                           │
│                                                                 │
│                                                                 │
│                                                                 │
│                                                                 │
│ ┌─ NEEDS ─────────────────────────┐                             │
│ │ ♥ Health  ████████████████████  │                             │
│ │ ⚡ Energy  ██████████████░░░░░░  │                             │
│ │ 🍖 Hunger  ████████████░░░░░░░░  │                             │
│ │ 💧 Thirst  ██████████████████░░  │                             │
│ └─────────────────────────────────┘                             │
│                                                                 │
│ ┌─ HOTBAR ──────────────────────────────────────────────────┐   │
│ │ [1]    [2]    [3]    [4]    [5]    [6]    [7]    [8]    │   │
│ │ ⛏️     🗡️     🍎     🪓     📜           [ ]    [ ]    │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ CONTEXT ───────┐  ┌─ CURRENCY ──┐  ┌─ QUICK MENU ────────┐   │
│ │ [E] Talk to     │  │ 💰 247      │  │ [I]nv [C]raft [M]ap │   │
│ │     Marcus      │  │ ⭐ 89       │  │ [J]rnal [O]pts      │   │
│ └─────────────────┘  └─────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Spectator Mode HUD

```
┌─────────────────────────────────────────────────────────────────┐
│ ┌─ TIME ──────┐  ┌─ SPEED ─────────┐          ┌─ MINIMAP ───┐   │
│ │ Day 47      │  │ [◀] ▶▶ [▶]      │          │  ◆ ◆        │   │
│ │ 14:32       │  │ ■ ▶ ▶▶ ▶▶▶ ⏩   │          │    ◆  ◆     │   │
│ │ Spring      │  │    ↑ Normal     │          │  ◆    ◆     │   │
│ └─────────────┘  └─────────────────┘          └─────────────┘   │
│                                                                 │
│ ┌─ FOLLOWING: Elara Thornwood ──────────────────────────────┐   │
│ │ Location: Thornwood Farm    Activity: Harvesting crops    │   │
│ │ [Stop Following] [View Details] [Switch Agent ▼]          │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                 │
│                                                                 │
│                     [GAME WORLD VIEW]                           │
│                                                                 │
│                                                                 │
│                                                                 │
│ ┌─ VILLAGE OVERVIEW ────────────────────────────────────────┐   │
│ │ Population: 23    Food: ████████░░ 78%    Mood: 😊 Good   │   │
│ │ Buildings: 12     Resources: Stable       Events: 1 today │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ AGENT LIST ──────┐                                           │
│ │ ▼ Working (8)     │                                           │
│ │   Elara ★         │  ★ = Currently following                  │
│ │   Marcus          │                                           │
│ │   Thomas          │                                           │
│ │ ▶ Socializing (5) │                                           │
│ │ ▶ Resting (4)     │                                           │
│ │ ▶ Idle (6)        │                                           │
│ └───────────────────┘                                           │
│                                                                 │
│ [Stats] [Relations] [Timeline] [Chronicle]                      │
└─────────────────────────────────────────────────────────────────┘
```

### Management Mode HUD

```
┌─────────────────────────────────────────────────────────────────┐
│ ┌─ TIME ──────┐  ┌─ SPEED ─────────┐          ┌─ MINIMAP ───┐   │
│ │ Day 47      │  │ [◀] ▶▶ [▶]      │          │ [Zone View] │   │
│ │ 14:32       │  │ ■ ▶ ▶▶ ▶▶▶ ⏩   │          │ ░░▓▓▓░░░░░  │   │
│ │ Spring      │  │    ↑ Fast       │          │ ░▓▓▓▓▓░░░░  │   │
│ └─────────────┘  └─────────────────┘          │ ░░▓▓░░░░░░  │   │
│                                               └─────────────┘   │
│                                                                 │
│ ┌─ RESOURCES ───────────────────────────────────────────────┐   │
│ │ 🪵 Wood: 234    🪨 Stone: 89    🌾 Food: 156    💰 Gold: 247 │   │
│ │ ⛏️ Iron: 12     🧱 Clay: 45     🧵 Cloth: 23                 │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                 │
│                                                                 │
│                     [GAME WORLD VIEW]                           │
│                        (Overhead)                               │
│                                                                 │
│                                                                 │
│ ┌─ LABOR ───────────────────┐  ┌─ ALERTS ───────────────────┐   │
│ │ Total: 23 villagers       │  │ ⚠ Food stores running low  │   │
│ │ Farmers: 5 (needed: 6)    │  │ ○ Construction: Barn 45%   │   │
│ │ Builders: 3 (needed: 2)   │  │ ○ Trade caravan arriving   │   │
│ │ Crafters: 4 (needed: 4)   │  └─────────────────────────────┘   │
│ │ Miners: 2 (needed: 3)     │                                   │
│ │ Idle: 9                   │                                   │
│ └───────────────────────────┘                                   │
│                                                                 │
│ ┌─ BUILD MENU ──────────────────────────────────────────────┐   │
│ │ [Housing] [Production] [Infrastructure] [Decoration]      │   │
│ │ Selected: Farmhouse (🪵100 🪨50)                           │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                 │
│ [Zones] [Work Orders] [Policies] [Statistics]                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core HUD Elements

### Time Display

```typescript
interface TimeDisplay {
  // Current time
  day: number;
  time: string;                          // "14:32"
  period: string;                        // "Afternoon"
  season: string;                        // "Spring"
  year: number;

  // Game speed
  currentSpeed: GameSpeed;
  isPaused: boolean;

  // Time controls (if available)
  canPause: boolean;
  canChangeSpeed: boolean;
  canTimeSkip: boolean;

  // Visual
  sunMoonIndicator: SunMoonPosition;
  weatherIcon: string;
}
```

### Time Display Layout

```
┌─ TIME ────────────────────────┐
│        ☀                      │  ← Sun/moon position
│    ╭─────────╮                │
│   ╱           ╲               │
│                               │
│  Day 47, Year 2               │
│  14:32 Afternoon              │
│  🌸 Spring                    │
│  ⛅ Partly Cloudy             │
│                               │
│  Speed: ▶ Normal              │
│  [◀ Slower] [Pause] [Faster ▶]│
└───────────────────────────────┘
```

### Minimap

```typescript
interface MinimapDisplay {
  // Map data
  viewCenter: Position;
  viewRadius: number;
  zoomLevel: number;

  // Markers
  playerMarker: MapMarker;
  agentMarkers: MapMarker[];
  buildingMarkers: MapMarker[];
  pointsOfInterest: MapMarker[];

  // Display options
  showTerrain: boolean;
  showZones: boolean;
  showPaths: boolean;
  showAgents: boolean;

  // Interaction
  isExpanded: boolean;
  isDragging: boolean;
}

interface MapMarker {
  position: Position;
  type: MarkerType;
  icon: string;
  label: string | null;
  isHighlighted: boolean;
}

type MarkerType =
  | "player"
  | "agent"
  | "building"
  | "resource"
  | "quest"
  | "danger"
  | "poi";
```

### Minimap Layout

```
┌─ MAP ─────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░░▓▓▓▓░░░░░░░░░░░░░░░░░░  │  ▓ = Buildings
│  ░░░░▓▓▓▓▓▓░░░░░◆░░░░░░░░░░░  │  ◆ = Agents
│  ░░░░░▓▓▓▓░░░░░░░░◆░░░░░░░░░  │  ★ = Player
│  ░░░░░░░░░░░░░░★░░░░░░░░░░░░  │  ● = POI
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  ~ = Water
│  ░░░~~~░░░░░░●░░░░░░░░░░░░░░  │  ▲ = Mountains
│  ░░~~~~~░░░░░░░░░░▲▲░░░░░░░░  │
│  ░░░░~~~░░░░░░░░░▲▲▲░░░░░░░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                               │
│  [Expand]  N↑  [Zoom: 1x]     │
└───────────────────────────────┘
```

### Notification Area

```typescript
interface NotificationArea {
  // Active notifications
  notifications: NotificationDisplay[];
  maxVisible: number;

  // Queue
  pendingCount: number;

  // Filters
  priorityFilter: NotificationPriority | null;
  typeFilter: NotificationType | null;

  // History access
  showHistory: boolean;
}

interface NotificationDisplay {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;

  // Content
  icon: string;
  title: string;
  message: string;
  timestamp: string;

  // Actions
  actions: NotificationAction[];
  isDismissable: boolean;

  // Visual state
  isNew: boolean;
  isExpanded: boolean;
  expiresAt: number | null;
}

type NotificationPriority = "critical" | "important" | "informational" | "ambient";
```

### Notification Layout

```
┌─ NOTIFICATIONS ───────────────────────────────────────────────┐
│                                                               │
│ ⚠ CRITICAL: Elara is starving!                    [Go] [×]   │
│   Health declining rapidly. Find food immediately.           │
│                                                   2 min ago   │
│ ─────────────────────────────────────────────────────────────│
│ ★ Harvest festival tomorrow!                          [×]    │
│   Village celebration at the square.              5 min ago   │
│ ─────────────────────────────────────────────────────────────│
│ ○ Marcus wants to trade                     [Accept] [×]      │
│   Offering: 20 wood for 10 stone           15 min ago        │
│                                                               │
│ [3 more notifications...]              [View All] [Settings] │
└───────────────────────────────────────────────────────────────┘
```

---

## Agent Mode HUD

```typescript
interface AgentHUD {
  // Avatar reference
  avatarId: string;
  avatarName: string;

  // Needs bars
  needsBars: NeedsBarDisplay;

  // Hotbar
  hotbar: HotbarDisplay;

  // Currency
  currencyDisplay: CurrencyDisplay;

  // Context actions
  contextActions: ContextActionDisplay;

  // Current task
  currentTask: TaskDisplay | null;

  // Relationship indicator
  nearbyRelationships: NearbyRelationshipDisplay | null;
}

interface NeedsBarDisplay {
  bars: NeedBar[];
  layout: "horizontal" | "vertical" | "radial";
  showLabels: boolean;
  showValues: boolean;
  warningThreshold: number;
  criticalThreshold: number;
}

interface NeedBar {
  need: string;
  icon: string;
  current: number;
  max: number;
  color: string;
  status: "normal" | "warning" | "critical";
  trend: "rising" | "stable" | "falling";
}

interface HotbarDisplay {
  slots: HotbarSlot[];
  selectedSlot: number;
  maxSlots: number;
}

interface HotbarSlot {
  index: number;
  itemId: string | null;
  itemName: string | null;
  itemIcon: string | null;
  quantity: number;
  durability: number | null;
  keybind: string;
  isUsable: boolean;
}
```

### Needs Bar Layout Options

```
┌─ NEEDS (Horizontal) ──────────────────────────────────────────┐
│ ♥ ████████████████████  ⚡ ██████████████░░░░░░  🍖 ████████░░ │
│     100%                    72%                    42%    ⚠  │
└───────────────────────────────────────────────────────────────┘

┌─ NEEDS (Vertical) ────┐
│ ♥ Health    ████████  │
│              100%     │
│ ⚡ Energy    █████░░░  │
│               72%     │
│ 🍖 Hunger    ███░░░░░  │
│               42%  ⚠  │
│ 💧 Thirst    ██████░░  │
│               85%     │
│ 🌡️ Warmth    ████████  │
│               95%     │
└───────────────────────┘

┌─ NEEDS (Radial) ──────┐
│        ♥              │
│    ╱─────╲            │
│   🌡️      ⚡           │
│    ╲     ╱            │
│  💧 ─ ★ ─ 🍖           │  ★ = Center (avatar)
│    ╱     ╲            │  Bars radiate outward
│   ╱───────╲           │
│                       │
└───────────────────────┘
```

### Hotbar Layout

```
┌─ HOTBAR ────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─[1]─┐  ┌─[2]─┐  ┌─[3]─┐  ┌─[4]─┐  ┌─[5]─┐  ┌─[6]─┐  ┌─[ ]─┐ │
│  │ ⛏️  │  │ 🗡️  │  │ 🍎  │  │ 🪓  │  │ 📜  │  │     │  │     │ │
│  │ 85% │  │ x1  │  │ x12 │  │ 92% │  │ x3  │  │     │  │     │ │
│  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘ │
│     ↑                                                           │
│  Selected                                                       │
│                                                                 │
│  [Q] Quick Use Selected    [E] Interact    [Tab] Switch        │
└─────────────────────────────────────────────────────────────────┘
```

### Context Actions

```typescript
interface ContextActionDisplay {
  // What's nearby
  targetEntity: string | null;
  targetType: string | null;
  targetName: string | null;

  // Available actions
  primaryAction: ContextAction | null;
  secondaryActions: ContextAction[];

  // Visual
  showActionWheel: boolean;
}

interface ContextAction {
  action: string;
  label: string;
  keybind: string;
  icon: string;
  isDefault: boolean;
  canPerform: boolean;
  blockedReason: string | null;
}
```

### Context Action Layout

```
┌─ CONTEXT ─────────────────────────────────────────────────────┐
│                                                               │
│  Target: Marcus Thornwood (Farmer)                            │
│  Relationship: Friend (72)                                    │
│                                                               │
│  [E] Talk          ← Primary action                           │
│  [R] Trade                                                    │
│  [T] Give item                                                │
│  [G] View profile                                             │
│                                                               │
└───────────────────────────────────────────────────────────────┘

┌─ CONTEXT (Action Wheel) ─────────┐
│                                  │
│           [Talk]                 │
│         ╱        ╲               │
│    [Give]        [Trade]         │
│         ╲        ╱               │
│           [View]                 │
│                                  │
│      Target: Marcus              │
└──────────────────────────────────┘
```

---

## Spectator Mode HUD

```typescript
interface SpectatorHUD {
  // Following
  followingAgent: FollowingDisplay | null;

  // Selection
  selectedEntity: EntitySelectionDisplay | null;

  // Overview
  villageOverview: VillageOverviewDisplay;

  // Agent list
  agentList: AgentListDisplay;

  // Time controls
  timeControls: TimeControlsDisplay;
}

interface FollowingDisplay {
  agentId: string;
  agentName: string;
  location: string;
  activity: string;
  canInteract: boolean;
}

interface VillageOverviewDisplay {
  population: number;
  foodLevel: number;
  mood: string;
  buildingCount: number;
  resourceStatus: string;
  eventCount: number;
}

interface AgentListDisplay {
  groups: AgentGroup[];
  selectedAgentId: string | null;
  sortBy: "name" | "activity" | "location";
  filterBy: string | null;
}

interface AgentGroup {
  name: string;                          // "Working", "Socializing", etc.
  agents: AgentListEntry[];
  isExpanded: boolean;
  count: number;
}
```

---

## Management Mode HUD

```typescript
interface ManagementHUD {
  // Resources
  resourcesBar: ResourcesBarDisplay;

  // Labor
  laborOverview: LaborOverviewDisplay;

  // Alerts
  alertsList: AlertsListDisplay;

  // Build menu
  buildMenu: BuildMenuDisplay;

  // Zones (optional overlay)
  zonesOverlay: ZonesOverlayDisplay | null;
}

interface ResourcesBarDisplay {
  resources: ResourceDisplay[];
  showTrends: boolean;
  warningThresholds: Map<string, number>;
}

interface ResourceDisplay {
  type: string;
  icon: string;
  amount: number;
  capacity: number | null;
  trend: "rising" | "stable" | "falling";
  status: "surplus" | "adequate" | "low" | "critical";
}

interface LaborOverviewDisplay {
  totalWorkers: number;
  categories: LaborCategory[];
  idleCount: number;
}

interface LaborCategory {
  name: string;
  current: number;
  needed: number;
  status: "overstaffed" | "balanced" | "understaffed";
}

interface BuildMenuDisplay {
  categories: BuildCategory[];
  selectedCategory: string | null;
  selectedBuilding: BuildingOption | null;
  canAfford: boolean;
}
```

---

## Quick Menu

```typescript
interface QuickMenuBar {
  buttons: QuickMenuButton[];
  orientation: "horizontal" | "vertical";
  position: "bottom" | "right" | "floating";
}

interface QuickMenuButton {
  id: string;
  label: string;
  icon: string;
  keybind: string;
  panelId: string;                       // Which panel to open
  hasNotification: boolean;
  isActive: boolean;
}
```

### Quick Menu Layout

```
┌─ QUICK MENU ─────────────────────────────────────────────────┐
│                                                              │
│  [I]      [C]      [M]      [J]      [S]      [O]            │
│  📦       🔨       🗺️       📖       💬       ⚙️             │
│  Inv     Craft    Map     Journal  Social   Options         │
│                                                              │
│  Press key or click to open panel                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Panel Integration

```typescript
interface PanelIntegration {
  // Available panels
  panels: Map<string, PanelDefinition>;

  // Open state
  openPanels: Set<string>;

  // Layout
  panelLayout: PanelLayout;

  // Stacking
  panelStack: string[];                  // Z-order
  focusedPanel: string | null;
}

interface PanelDefinition {
  id: string;
  name: string;
  icon: string;
  keybind: string;

  // Modes where available
  availableInModes: PlayerMode[];

  // Default position/size
  defaultPosition: PanelPosition;
  defaultSize: PanelSize;

  // Behavior
  canPin: boolean;
  canResize: boolean;
  canMove: boolean;
  closeOnEscape: boolean;
}

type PanelPosition = "center" | "left" | "right" | "bottom" | "floating";
```

### Available Panels

| Panel ID | Name | Key | Agent | Spectator | Management |
|----------|------|-----|-------|-----------|------------|
| `inventory` | Inventory | I | ✓ | - | - |
| `crafting` | Crafting | C | ✓ | - | - |
| `map` | World Map | M | ✓ | ✓ | ✓ |
| `journal` | Journal | J | ✓ | ✓ | - |
| `social` | Relationships | S | ✓ | ✓ | - |
| `needs` | Needs Panel | N | ✓ | ✓ | - |
| `skills` | Skills | K | ✓ | ✓ | - |
| `trade` | Trading | T | ✓ | - | - |
| `dialogue` | Dialogue | - | ✓ | - | - |
| `chronicle` | Chronicle | H | ✓ | ✓ | ✓ |
| `encyclopedia` | Encyclopedia | E | ✓ | ✓ | ✓ |
| `building` | Build Menu | B | - | - | ✓ |
| `zones` | Zone Editor | Z | - | - | ✓ |
| `stats` | Statistics | - | - | ✓ | ✓ |
| `options` | Options | O | ✓ | ✓ | ✓ |
| `avatar` | Avatar | A | ✓ | ✓ | - |
| `nexus` | Nexus Hub | - | ✓ | ✓ | - |

---

## Tooltips

```typescript
interface TooltipDisplay {
  // Current tooltip
  activeTooltip: Tooltip | null;

  // Settings
  delay: number;                         // ms before showing
  position: TooltipPosition;
  style: TooltipStyle;
}

interface Tooltip {
  title: string;
  content: string | TooltipContent[];
  position: { x: number; y: number };
  anchor: "mouse" | "element";
  width: "auto" | number;
}

interface TooltipContent {
  type: "text" | "stat" | "comparison" | "requirement";
  content: unknown;
}

type TooltipPosition = "above" | "below" | "left" | "right" | "follow_mouse";
```

### Tooltip Examples

```
┌─ Item Tooltip ────────────────────┐
│ Iron Pickaxe                      │
│ ─────────────────────────────────│
│ Tool                              │
│                                   │
│ Mining Speed: +25%                │
│ Durability: 85/100                │
│                                   │
│ "A sturdy pickaxe for mining      │
│ stone and ore."                   │
│                                   │
│ [Right-click to equip]            │
└───────────────────────────────────┘

┌─ Agent Tooltip ───────────────────┐
│ Marcus Thornwood                  │
│ ─────────────────────────────────│
│ Farmer (Level 4)                  │
│ Relationship: Friend (72)         │
│                                   │
│ Activity: Harvesting crops        │
│ Mood: Content                     │
│                                   │
│ [E] Talk  [R] Trade               │
└───────────────────────────────────┘
```

---

## HUD Modes

```typescript
interface HUDModeConfig {
  mode: HUDMode;
  description: string;
  visibleElements: string[];
  transparency: number;
  autoHide: boolean;
  autoHideDelay: number;
}

const HUD_MODES: HUDModeConfig[] = [
  {
    mode: "minimal",
    description: "Essential info only",
    visibleElements: ["time", "health", "context"],
    transparency: 0.8,
    autoHide: true,
    autoHideDelay: 3000,
  },
  {
    mode: "standard",
    description: "Balanced display",
    visibleElements: ["time", "minimap", "needs", "hotbar", "context", "notifications"],
    transparency: 0.9,
    autoHide: false,
    autoHideDelay: 0,
  },
  {
    mode: "detailed",
    description: "All information visible",
    visibleElements: ["all"],
    transparency: 1.0,
    autoHide: false,
    autoHideDelay: 0,
  },
  {
    mode: "cinematic",
    description: "Hide HUD for screenshots",
    visibleElements: [],
    transparency: 0,
    autoHide: false,
    autoHideDelay: 0,
  },
];
```

---

## Keyboard Shortcuts

### Global Shortcuts

| Key | Action |
|-----|--------|
| `Escape` | Close panel / Open pause menu |
| `Tab` | Cycle targets |
| `~` | Toggle console (if enabled) |
| `F1` | Help |
| `F5` | Quick save |
| `F9` | Quick load |
| `F11` | Toggle fullscreen |
| `F12` | Screenshot |
| `H` | Toggle HUD |

### Agent Mode Shortcuts

| Key | Action |
|-----|--------|
| `WASD` | Move |
| `E` | Interact |
| `Space` | Jump / Confirm |
| `I` | Inventory |
| `C` | Crafting |
| `M` | Map |
| `J` | Journal |
| `1-8` | Hotbar slots |
| `Q` | Quick use |
| `R` | Secondary action |

### Spectator Mode Shortcuts

| Key | Action |
|-----|--------|
| `WASD` | Pan camera |
| `Mouse wheel` | Zoom |
| `Space` | Pause/Resume |
| `+/-` | Speed up/down |
| `F` | Follow selected |
| `Click` | Select entity |

### Management Mode Shortcuts

| Key | Action |
|-----|--------|
| `WASD` | Pan camera |
| `B` | Build menu |
| `Z` | Zone editor |
| `Delete` | Cancel/Demolish |
| `R` | Rotate building |

---

## State Management

```typescript
interface HUDState {
  // Mode
  playerMode: PlayerMode;
  hudMode: HUDMode;

  // Panel states
  openPanels: Map<string, PanelState>;
  panelStack: string[];

  // UI elements
  notifications: NotificationDisplay[];
  tooltipState: TooltipDisplay;
  contextState: ContextActionDisplay;

  // Settings
  settings: HUDSettings;

  // Performance
  lastFrameTime: number;
  frameRate: number;
}

interface HUDSettings {
  // Visibility
  hudMode: HUDMode;
  showMinimap: boolean;
  showNotifications: boolean;
  showTooltips: boolean;

  // Layout
  needsBarLayout: "horizontal" | "vertical" | "radial";
  hotbarPosition: "bottom" | "left" | "right";
  minimapPosition: "top-right" | "top-left" | "bottom-right";

  // Behavior
  tooltipDelay: number;
  notificationDuration: number;
  panelRememberPositions: boolean;

  // Accessibility
  fontSize: "small" | "medium" | "large";
  highContrast: boolean;
  reduceMotion: boolean;
}
```

---

## Visual Style

```typescript
interface HUDStyle {
  // Colors
  panelBackground: string;               // Semi-transparent
  panelBorder: string;
  textPrimary: string;
  textSecondary: string;

  // Status colors
  healthColor: string;
  energyColor: string;
  warningColor: string;
  criticalColor: string;

  // Effects
  glowEffect: boolean;
  scanlineEffect: boolean;
  pixelBorders: boolean;

  // Typography
  fontFamily: string;                    // Pixel font
  fontSize: {
    small: number;
    medium: number;
    large: number;
  };

  // Animation
  transitionDuration: number;
  fadeInDuration: number;
  pulseAnimation: boolean;
}
```

---

## Integration Points

### With Player System
- Mode switching updates HUD layout
- Input handling routes through HUD
- Permissions affect available actions

### With All Other UI Panels
- HUD provides panel container
- Quick menu opens panels
- Keybinds route to panels

### With Notification System
- Receives notifications
- Displays in notification area
- Routes actions to systems

### With Game World
- Context actions from world state
- Minimap from world data
- Time from simulation

---

## Related Specs

- `player-system/spec.md` - Player modes and controls
- `ui-system/inventory.md` - Inventory panel
- `ui-system/crafting.md` - Crafting panel
- `ui-system/map.md` - World map
- `ui-system/dialogue.md` - Conversation UI
- `ui-system/notifications.md` - Notification system
- `ui-system/time-controls.md` - Time control UI

---

## Open Questions

1. Should HUD scale with screen resolution or stay fixed size?
2. How to handle HUD during cutscenes or special events?
3. Should there be preset HUD layouts users can save/load?
4. How to handle VR/AR HUD positioning?
5. Should notifications have sound options per-type?
