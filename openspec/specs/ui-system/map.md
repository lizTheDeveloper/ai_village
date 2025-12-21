# Map System UI - Specification

**Created:** 2025-12-21
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The map system provides players with navigation tools including a HUD minimap for quick reference, a full-screen world map for exploration and planning, and waypoint/marker systems for tracking locations of interest. The map reveals as players explore and integrates with the fog of war system.

---

## Requirements

### REQ-MAP-001: Minimap

The HUD SHALL include a minimap for navigation.

```typescript
interface Minimap {
  // Display
  position: MinimapPosition;
  size: number;                    // Pixels (e.g., 150)
  shape: MinimapShape;
  zoom: number;                    // Current zoom level
  zoomRange: { min: number; max: number };

  // Content
  showTerrain: boolean;
  showBuildings: boolean;
  showAgents: boolean;
  showResources: boolean;
  showWaypoints: boolean;
  showFogOfWar: boolean;

  // Player indicator
  showPlayerPosition: boolean;
  showPlayerCone: boolean;         // Vision cone
  rotateWithPlayer: boolean;       // North-up vs player-up

  // Interaction
  clickable: boolean;              // Click to set waypoint/move camera
  draggable: boolean;              // Drag to pan
  expandable: boolean;             // Click to open full map
}

type MinimapPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

type MinimapShape =
  | "square"
  | "circle"
  | "rounded-square";
```

**Minimap Display:**
```
SQUARE MINIMAP (corner of screen):
┌─────────────────────┐
│ ░░░░░▓▓▓▓▓░░░░░░░░ │  ░ = Unexplored (fog)
│ ░░░░▓▓████▓▓░░░░░░ │  ▓ = Explored but dark
│ ░░▓▓██🏠██▓▓░░░░░░ │  █ = Terrain (green/brown/blue)
│ ░▓▓███🌳████▓░░░░░ │  🏠 = Building
│ ▓▓████▲██🌳██▓░░░░ │  🌳 = Tree/resource
│ ▓████████████▓░░░░ │  ▲ = Player (with direction)
│ ░▓▓████🏠████▓░░░░ │  ● = Other agents
│ ░░▓▓██████●█▓░░░░░ │  ★ = Waypoint
│ ░░░▓▓▓▓▓▓▓▓░░░░░░░ │
│        N            │  ← Compass
├─────────────────────┤
│ [+] [-]       [M]   │  ← Zoom controls, open map
└─────────────────────┘

CIRCULAR MINIMAP:
       ╭───────────────╮
     ╱ ░░░░▓▓▓▓▓░░░░░  ╲
   ╱  ░░▓▓████▓▓░░░░░░  ╲
  │   ░▓▓██🏠██▓▓░░░░░░  │
  │   ▓▓████▲████▓░░░░░  │
  │   ░▓▓██████▓▓░░░░░░  │
   ╲  ░░▓▓▓▓▓▓▓░░░░░░░  ╱
     ╲ ░░░░░░░░░░░░░░  ╱
       ╰───────────────╯
             N
```

### REQ-MAP-002: Terrain Rendering

The map SHALL render terrain with distinct colors.

```typescript
interface TerrainColors {
  // Base terrain
  grass: string;                   // #4ade80 (green)
  dirt: string;                    // #a16207 (brown)
  water: string;                   // #3b82f6 (blue)
  deepWater: string;               // #1e40af (dark blue)
  sand: string;                    // #fcd34d (yellow)
  stone: string;                   // #6b7280 (gray)
  snow: string;                    // #f8fafc (white)
  forest: string;                  // #166534 (dark green)

  // Special
  road: string;                    // #78716c (tan)
  farmland: string;                // #84cc16 (lime)
  corrupted: string;               // #7c3aed (purple)
}

interface MapRenderConfig {
  // Resolution
  pixelsPerTile: number;           // Minimap: 1-2, Full map: 4-8
  chunkSize: number;               // Tiles per chunk

  // Caching
  cacheRenderedChunks: boolean;
  maxCachedChunks: number;

  // Level of detail
  lodLevels: LODLevel[];
}

interface LODLevel {
  zoomThreshold: number;           // Below this zoom, use this LOD
  pixelsPerTile: number;
  showBuildings: boolean;
  showTrees: boolean;
  showAgents: boolean;
}
```

### REQ-MAP-003: Map Icons

Entities SHALL be represented with icons.

```typescript
interface MapIcons {
  icons: Map<EntityType, MapIcon>;
}

interface MapIcon {
  sprite: string;
  color: string;
  size: number;
  priority: number;                // Higher = render on top
  animated: boolean;
  pulseWhenImportant: boolean;
}

const defaultMapIcons: Map<EntityType, MapIcon> = new Map([
  // Player
  ["player", {
    sprite: "icon_player_arrow",
    color: "#22c55e",
    size: 8,
    priority: 100,
    animated: false,
    pulseWhenImportant: false,
  }],

  // Agents
  ["agent", {
    sprite: "icon_agent_dot",
    color: "#3b82f6",
    size: 4,
    priority: 50,
    animated: false,
    pulseWhenImportant: true,
  }],
  ["agent_hostile", {
    sprite: "icon_agent_dot",
    color: "#ef4444",
    size: 4,
    priority: 51,
    animated: true,
    pulseWhenImportant: true,
  }],

  // Buildings
  ["building_house", { sprite: "icon_house", color: "#f59e0b", size: 6, priority: 30 }],
  ["building_farm", { sprite: "icon_farm", color: "#84cc16", size: 6, priority: 30 }],
  ["building_shop", { sprite: "icon_shop", color: "#a855f7", size: 6, priority: 30 }],
  ["building_storage", { sprite: "icon_chest", color: "#78716c", size: 5, priority: 29 }],

  // Resources
  ["resource_tree", { sprite: "icon_tree", color: "#166534", size: 3, priority: 10 }],
  ["resource_rock", { sprite: "icon_rock", color: "#6b7280", size: 3, priority: 10 }],
  ["resource_deposit", { sprite: "icon_deposit", color: "#fbbf24", size: 4, priority: 15 }],

  // Points of interest
  ["poi_quest", { sprite: "icon_quest", color: "#fcd34d", size: 6, priority: 80, animated: true }],
  ["poi_danger", { sprite: "icon_danger", color: "#ef4444", size: 6, priority: 85, animated: true }],
  ["poi_discovered", { sprite: "icon_star", color: "#8b5cf6", size: 5, priority: 40 }],
]);
```

### REQ-MAP-004: Fog of War

Unexplored areas SHALL be hidden.

```typescript
interface FogOfWar {
  // States
  unexplored: FogState;            // Never seen
  explored: FogState;              // Seen but not visible now
  visible: FogState;               // Currently in view

  // Player vision
  visionRadius: number;            // Tiles of clear visibility
  visionFalloff: number;           // Tiles of partial visibility

  // Persistence
  remembersExplored: boolean;      // Keep terrain visible once seen
  remembersEntities: boolean;      // Show last known entity positions
  entityFadeTime: number;          // How long remembered entities show

  // Rendering
  fogColor: string;
  exploredDim: number;             // 0-1 dimming for explored areas
}

interface FogState {
  visible: boolean;
  terrainVisible: boolean;
  entitiesVisible: boolean;
  opacity: number;
}

const defaultFogOfWar: FogOfWar = {
  unexplored: {
    visible: false,
    terrainVisible: false,
    entitiesVisible: false,
    opacity: 1.0,
  },
  explored: {
    visible: true,
    terrainVisible: true,
    entitiesVisible: false,        // Shows last known, not current
    opacity: 0.5,
  },
  visible: {
    visible: true,
    terrainVisible: true,
    entitiesVisible: true,
    opacity: 0.0,
  },
  visionRadius: 15,
  visionFalloff: 5,
  remembersExplored: true,
  remembersEntities: true,
  entityFadeTime: 300,             // 5 minutes in game time
  fogColor: "#1a1a2e",
  exploredDim: 0.4,
};
```

### REQ-MAP-005: Full World Map

Players SHALL access a full-screen world map.

```typescript
interface WorldMap {
  // State
  isOpen: boolean;
  centerPosition: Position;
  zoom: number;
  zoomRange: { min: number; max: number };

  // Layers (toggleable)
  layers: MapLayer[];
  activeFilters: Set<string>;

  // Interaction
  selectedEntity: string | null;
  hoveredPosition: Position | null;
  placingWaypoint: boolean;

  // Controls
  pan(delta: Vector): void;
  zoomTo(level: number): void;
  centerOn(position: Position): void;
  centerOnEntity(entityId: string): void;
}

interface MapLayer {
  id: string;
  name: string;
  icon: string;
  visible: boolean;
  opacity: number;
  zIndex: number;
}

const defaultLayers: MapLayer[] = [
  { id: "terrain", name: "Terrain", icon: "🗺️", visible: true, opacity: 1.0, zIndex: 0 },
  { id: "roads", name: "Roads", icon: "🛤️", visible: true, opacity: 1.0, zIndex: 1 },
  { id: "buildings", name: "Buildings", icon: "🏠", visible: true, opacity: 1.0, zIndex: 2 },
  { id: "resources", name: "Resources", icon: "🌳", visible: true, opacity: 1.0, zIndex: 3 },
  { id: "agents", name: "Agents", icon: "👥", visible: true, opacity: 1.0, zIndex: 4 },
  { id: "waypoints", name: "Waypoints", icon: "📍", visible: true, opacity: 1.0, zIndex: 5 },
  { id: "zones", name: "Zones", icon: "🔲", visible: false, opacity: 0.5, zIndex: 1 },
  { id: "grid", name: "Grid", icon: "📐", visible: false, opacity: 0.3, zIndex: 10 },
];
```

**Full World Map:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  WORLD MAP                                      [Layers ▼]  [Legend]  [X]  │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ ░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ ░░░░░░░▓▓▓▓████████████████████▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ ░░░░▓▓▓████████🌳🌳████████████████▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ ░░▓▓████████████████🏠██████████████▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ ░░▓███████🌾🌾🌾███████████████████████▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ ░▓████████🌾🌾🌾███████▲████████████████▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ ░▓████████████████████████████🏠███████▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ ░▓████████████████████████████████●████▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ ░▓████████████💧💧💧💧💧████████████████▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ ░░▓██████████💧💧💧💧💧💧██████🌳█████▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ ░░▓▓████████💧💧💧💧💧💧💧█████🌳🌳██▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ ░░░▓▓▓██████████████████████████▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ ░░░░░▓▓▓▓▓▓████████████████▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ ░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │                                                                       │ │
│ │  ▲ You  ● Agent B  🏠 Farmhouse  ★ Waypoint                           │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│  Coordinates: (45, -12)                               [+] [−] Zoom: 100%    │
│  [Set Waypoint] [Center on Player] [Find Agent ▼]                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-MAP-006: Waypoints and Markers

Players SHALL place custom markers.

```typescript
interface WaypointSystem {
  waypoints: Waypoint[];
  maxWaypoints: number;
  activeWaypoint: string | null;   // Currently navigating to

  // Operations
  createWaypoint(position: Position, options?: WaypointOptions): Waypoint;
  removeWaypoint(id: string): void;
  editWaypoint(id: string, options: Partial<WaypointOptions>): void;
  setActiveWaypoint(id: string | null): void;
  getDistanceToWaypoint(id: string): number;
}

interface Waypoint {
  id: string;
  position: Position;
  name: string;
  icon: WaypointIcon;
  color: string;
  visible: boolean;
  showOnMinimap: boolean;
  showOnHUD: boolean;              // Direction indicator
  createdAt: GameTime;
  temporary: boolean;              // Auto-delete when reached
}

interface WaypointOptions {
  name?: string;
  icon?: WaypointIcon;
  color?: string;
  temporary?: boolean;
}

type WaypointIcon =
  | "pin"
  | "flag"
  | "star"
  | "skull"        // Danger
  | "chest"        // Loot
  | "question"     // Unknown
  | "home"
  | "shop"
  | "quest"
  | "custom";
```

**Waypoint Placement Dialog:**
```
┌─────────────────────────────────┐
│  NEW WAYPOINT                   │
├─────────────────────────────────┤
│                                 │
│  Name: [Apple Tree Grove    ]   │
│                                 │
│  Icon:                          │
│  [📍] [🚩] [⭐] [💀] [📦] [❓]  │
│                                 │
│  Color:                         │
│  [🔴] [🟢] [🔵] [🟡] [🟣] [⚪]  │
│                                 │
│  Options:                       │
│  [✓] Show on minimap            │
│  [✓] Show direction on HUD      │
│  [ ] Delete when reached        │
│                                 │
├─────────────────────────────────┤
│        [Cancel]  [Create]       │
└─────────────────────────────────┘
```

### REQ-MAP-007: Direction Indicator

Active waypoints SHALL show a HUD direction indicator.

```typescript
interface DirectionIndicator {
  // Display
  style: IndicatorStyle;
  position: "screen-edge" | "around-player" | "compass";

  // Content
  showDistance: boolean;
  showName: boolean;
  showIcon: boolean;

  // Behavior
  fadeWhenClose: boolean;
  fadeDistance: number;
  hideWhenOnScreen: boolean;       // Only show when offscreen
}

type IndicatorStyle =
  | "arrow"
  | "chevron"
  | "dot"
  | "compass_needle";
```

**Direction Indicator Styles:**
```
SCREEN-EDGE (arrow at screen border pointing to waypoint):
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                                      ★ Apple Grove (125m) → │
│                                                             │
│                   [Game World]                              │
│                                                             │
│ ← Home (80m)                                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘

AROUND-PLAYER (ring around player):
                              ★
                            ╱
                    ╭─────────────╮
                    │             │
               ←──  │    🧑       │  ──→
                    │             │
                    ╰─────────────╯
                            ╲
                              ★

COMPASS (top of screen):
        ┌─────────────────────────────────────┐
        │  W   ★   N   🏠  E        S         │
        │      ▲       ▲                      │
        │   Apple   Home                      │
        └─────────────────────────────────────┘
```

### REQ-MAP-008: Location Search

The map SHALL support searching for locations.

```typescript
interface MapSearch {
  query: string;
  results: SearchResult[];
  maxResults: number;

  // Categories
  searchBuildings: boolean;
  searchAgents: boolean;
  searchResources: boolean;
  searchWaypoints: boolean;
  searchRegions: boolean;
}

interface SearchResult {
  type: "building" | "agent" | "resource" | "waypoint" | "region";
  id: string;
  name: string;
  position: Position;
  distance: number;
  icon: string;
  description?: string;
}
```

**Map Search:**
```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Search: [farm                                        ]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  RESULTS (3)                                                │
│                                                             │
│  🏠 Farmhouse                              45m  [Go]        │
│     Your main farm building                                 │
│                                                             │
│  🌾 North Farm Field                       120m  [Go]       │
│     Wheat field, ready for harvest                          │
│                                                             │
│  🌾 South Farm Field                       200m  [Go]       │
│     Empty field, needs planting                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### REQ-MAP-009: Zone Visualization

Designated zones SHALL be visible on the map.

```typescript
interface ZoneDisplay {
  zones: Zone[];
  showZoneBorders: boolean;
  showZoneLabels: boolean;
  showZoneFill: boolean;
  fillOpacity: number;
}

interface Zone {
  id: string;
  type: ZoneType;
  name: string;
  bounds: Polygon;
  color: string;
  icon: string;
}

type ZoneType =
  | "farming"
  | "mining"
  | "forestry"
  | "housing"
  | "commercial"
  | "storage"
  | "restricted"
  | "danger"
  | "custom";
```

**Zone Overlay:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ┌──────────────┐                                          │
│   │░░░░░░░░░░░░░░│  ← Farming Zone (green)                  │
│   │░░🌾░░🌾░░🌾░░│                                          │
│   │░░░░░░░░░░░░░░│                                          │
│   └──────────────┘                                          │
│                        ┌─────────┐                          │
│                        │▓▓▓▓▓▓▓▓▓│  ← Housing Zone (blue)   │
│                        │▓🏠▓▓🏠▓▓│                          │
│                        └─────────┘                          │
│                                                             │
│   ┌──────┐                                                  │
│   │▒▒▒▒▒▒│  ← Mining Zone (gray)                            │
│   │▒⛏️▒▒▒│                                                  │
│   └──────┘                                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Keyboard Shortcuts

### REQ-MAP-010: Map Hotkeys

```
MAP CONTROLS:
- M              : Toggle world map
- Tab            : Toggle minimap size (small/large/hidden)
- Scroll wheel   : Zoom in/out
- Click+Drag     : Pan map
- Double-click   : Set waypoint at location
- Right-click    : Context menu (waypoint, info, go to)

WORLD MAP:
- Escape         : Close map
- Space          : Center on player
- F              : Find/search
- W              : Toggle waypoint list
- L              : Toggle layers panel
- G              : Toggle grid
- Arrow keys     : Pan map
- +/-            : Zoom in/out
- Home           : Reset view

WAYPOINTS:
- 1-9            : Quick waypoints
- Delete         : Remove selected waypoint
- Enter          : Navigate to selected waypoint
```

---

## Settings

### REQ-MAP-011: Map Settings

```typescript
interface MapSettings {
  // Minimap
  minimapEnabled: boolean;
  minimapPosition: MinimapPosition;
  minimapSize: "small" | "medium" | "large";
  minimapShape: MinimapShape;
  minimapRotation: "north-up" | "player-up";
  minimapOpacity: number;

  // Fog of war
  fogOfWarEnabled: boolean;
  revealMapOnExplore: boolean;

  // Icons
  iconScale: number;
  showAgentNames: boolean;
  showBuildingNames: boolean;

  // Waypoints
  maxWaypoints: number;
  waypointDefaultColor: string;
  showWaypointDistances: boolean;
  showWaypointArrows: boolean;

  // Performance
  mapQuality: "low" | "medium" | "high";
  updateFrequency: number;         // Ms between updates
}
```

---

## Performance

### REQ-MAP-012: Optimization

```
Performance Constraints:
- Minimap render: < 5ms per frame
- World map render: < 16ms per frame
- Chunk loading: < 50ms per chunk
- Entity icon updates: < 2ms

Optimization Strategies:
- Cache rendered terrain chunks
- Virtualize entity icons (only render visible)
- LOD system for different zoom levels
- Debounce entity position updates (100ms)
- Use WebGL for large map rendering
- Lazy load unexplored chunks
```

---

## Open Questions

1. Shared maps between agents (collective exploration)?
2. Map annotations (draw on map)?
3. Route planning and pathfinding preview?
4. Historical map (show past states)?
5. Print/export map functionality?
6. Collaborative waypoints in multiplayer?
7. Auto-waypoint for quest objectives?

---

## Related Specs

**Core Integration:**
- `rendering-system/spec.md` - Rendering pipeline
- `world-system/spec.md` - Terrain and chunks
- `world-system/procedural-generation.md` - World generation

**Feature Integration:**
- `agent-system/spatial-memory.md` - Agent exploration memory
- `player-system/spec.md` - Player navigation
- `construction-system/spec.md` - Building placement
