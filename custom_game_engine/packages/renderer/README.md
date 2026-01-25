# Renderer Package - Graphics Rendering & UI System

> **For Language Models:** This README is optimized for LM understanding. Read this document completely before working with the rendering system to understand its architecture, interfaces, and usage patterns.

## Overview

The **Renderer Package** (`@ai-village/renderer`) implements the complete graphics rendering pipeline and UI system using HTML5 Canvas 2D with optional Three.js 3D rendering. It handles terrain, entities, sprites, particles, UI panels, and window management.

**What it does:**
- 2D canvas rendering of terrain tiles and entities with camera/viewport control
- PixelLab sprite system with dynamic character generation and animation
- UI panel system with 40+ game panels (AgentInfo, Resources, Crafting, etc.)
- Window management with dragging, resizing, LRU auto-close, and persistence
- Particle effects for visual feedback (dust clouds, sparks, etc.)
- Health bars, speech bubbles, floating text, and combat indicators
- Context menus with right-click actions for entities
- Camera modes: top-down, side-view with parallax, 3D isometric
- Input handling: mouse, keyboard, touch, drag-drop

**Key files:**
- `src/Renderer.ts` - Main 2D canvas renderer (2933 lines)
- `src/Camera.ts` - Camera/viewport with multi-view support (518 lines)
- `src/WindowManager.ts` - UI window management (1144 lines)
- `src/sprites/` - PixelLab sprite system (8 directions, animations)
- `src/panels/` - Specialized UI panel implementations
- `src/ui/` - Reusable UI components (inventory, drag-drop, tooltips)

---

## Package Structure

```
packages/renderer/
├── src/
│   ├── Renderer.ts                # Main 2D canvas renderer
│   ├── Renderer3D.ts              # Three.js 3D renderer (side-view)
│   ├── Camera.ts                  # Camera/viewport control
│   ├── ViewMode.ts                # View mode types (top-down, side-view)
│   ├── SpriteRenderer.ts          # Sprite rendering utilities
│   ├── InputHandler.ts            # Mouse/keyboard/touch input
│   ├── KeyboardRegistry.ts        # Keyboard shortcut management
│   │
│   ├── sprites/
│   │   ├── PixelLabSpriteLoader.ts      # Loads PixelLab sprites from API
│   │   ├── PixelLabSpriteDefs.ts        # Sprite definitions (8 directions)
│   │   ├── SpriteRegistry.ts            # Maps traits → sprite folders
│   │   ├── SpriteCache.ts               # Sprite instance caching
│   │   ├── SpriteService.ts             # High-level sprite API
│   │   ├── SpriteCompositor.ts          # LPC sprite compositing (legacy)
│   │   └── AnimalSpriteVariants.ts      # Animal sprite definitions
│   │
│   ├── WindowManager.ts           # Window management (drag, resize, LRU)
│   ├── MenuBar.ts                 # Top menu bar UI
│   ├── types/WindowTypes.ts       # Window/panel type definitions
│   │
│   ├── panels/
│   │   ├── agent-info/            # Agent info panel sections
│   │   │   ├── InfoSection.ts     # Identity, needs, stats
│   │   │   ├── SkillsSection.ts   # Skill levels
│   │   │   ├── InventorySection.ts # Inventory grid
│   │   │   ├── MemoriesSection.ts # Episodic memories
│   │   │   └── ContextSection.ts  # LLM context visualization
│   │   └── magic/                 # Magic system UI
│   │       ├── SkillTreePanel.ts  # Skill tree visualization
│   │       ├── ParadigmTreeView.ts # Magic paradigm trees
│   │       └── NodeTooltip.ts     # Skill node tooltips
│   │
│   ├── ui/
│   │   ├── InventoryUI.ts         # Inventory grid component
│   │   ├── DragDropSystem.ts      # Drag-drop for items/entities
│   │   ├── ItemTooltip.ts         # Item hover tooltips
│   │   ├── TabbedPanel.ts         # Tabbed panel component
│   │   └── InventorySearch.ts     # Inventory search/filter
│   │
│   ├── context-menu/
│   │   ├── ContextMenuManager.ts   # Context menu system
│   │   ├── ContextMenuRenderer.ts  # Context menu rendering
│   │   ├── ContextActionRegistry.ts # Action registration
│   │   └── MenuContext.ts          # Menu context building
│   │
│   ├── divine/                    # God-mode UI components
│   │   ├── DivineStatusBar.ts     # Divine power status
│   │   ├── PrayerPanel.ts         # Prayer management
│   │   ├── AngelManagementPanel.ts # Angel control
│   │   └── SacredGeographyPanel.ts # Sacred site management
│   │
│   ├── text/                      # Text renderer (accessibility)
│   │   ├── TextRenderer.ts        # 1D text-only renderer
│   │   ├── SceneComposer.ts       # Scene → text description
│   │   ├── EntityDescriber.ts     # Entity → text description
│   │   └── VoiceModes.ts          # Narrative voice modes
│   │
│   ├── production/                # Production rendering
│   │   ├── ProductionRenderer.ts   # High-quality sprite rendering
│   │   ├── CombatAnimator.ts       # Combat animation system
│   │   └── SoulSpriteRenderer.ts   # Soul visualization
│   │
│   ├── FloatingTextRenderer.ts    # Floating damage/XP numbers
│   ├── SpeechBubbleRenderer.ts    # Agent speech bubbles
│   ├── ParticleRenderer.ts        # Particle effects (dust, sparks)
│   ├── HealthBarRenderer.ts       # Health bars above entities
│   ├── ThreatIndicatorRenderer.ts # Combat threat indicators
│   ├── GhostRenderer.ts           # Ghost/spirit visualization
│   │
│   ├── AgentInfoPanel.ts          # Agent details panel
│   ├── AgentRosterPanel.ts        # Agent list panel
│   ├── AnimalInfoPanel.ts         # Animal details panel
│   ├── ResourcesPanel.ts          # Resource stockpile panel
│   ├── CraftingStationPanel.ts    # Crafting UI
│   ├── BuildingPlacementUI.ts     # Building placement mode
│   ├── DevPanel.ts                # Developer tools panel
│   ├── SettingsPanel.ts           # Game settings panel
│   ├── MemoryPanel.ts             # Agent memory inspector
│   ├── RelationshipsPanel.ts      # Relationship graph
│   ├── NotificationsPanel.ts      # Notification feed
│   ├── TimeControlsPanel.ts       # Pause/speed controls
│   ├── UniverseManagerPanel.ts    # Universe/multiverse UI
│   ├── GovernanceDashboardPanel.ts # City governance
│   ├── EconomyPanel.ts            # Economic dashboard
│   ├── MagicSystemsPanel.ts       # Magic system UI
│   ├── SpellbookPanel.ts          # Spell management
│   ├── DivinePowersPanel.ts       # Divine power UI
│   ├── CombatHUDPanel.ts          # Combat HUD
│   ├── CombatLogPanel.ts          # Combat log
│   ├── ResearchLibraryPanel.ts    # Research tree
│   ├── TechTreePanel.ts           # Technology tree
│   ├── FarmManagementPanel.ts     # Farm management
│   ├── ShopPanel.ts               # Shop/market UI
│   ├── ChatPanel.ts               # Agent chat
│   └── TextAdventurePanel.ts      # Text-mode interface
│   │
│   └── index.ts                   # Package exports
├── package.json
└── README.md                      # This file
```

---

## Core Concepts

### 1. Rendering Pipeline

The renderer operates in a **multi-layered rendering pipeline**:

```typescript
// Rendering order (back to front)
1. Terrain tiles (chunks)
   ↓
2. Resources (trees, rocks, plants)
   ↓
3. Buildings (floors, walls, roofs)
   ↓
4. Entities (agents, animals)
   ↓
5. Particles (dust, sparks)
   ↓
6. Overlays (health bars, speech bubbles, floating text)
   ↓
7. UI panels (windows, menus)
```

**Renderer.ts** orchestrates this pipeline:

```typescript
class Renderer {
  render(world: World, currentTime: number): void {
    // 1. Clear canvas
    this.clearScreen();

    // 2. Render terrain chunks (only visible chunks in viewport)
    this.renderTerrain();

    // 3. Render entities (sorted by Y position for depth)
    this.renderEntities(world);

    // 4. Render particles
    this.particleRenderer.render(this.ctx, this.camera, currentTime);

    // 5. Render overlays (health bars, speech, floating text)
    this.renderOverlays(world);

    // 6. UI panels rendered separately by WindowManager
  }
}
```

### 2. 3D Renderer (Three.js Voxel Engine)

The **Renderer3D** provides a Minecraft-style 3D visualization of the game world using Three.js:

```typescript
class Renderer3D {
  // Three.js scene management
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: PointerLockControls; // First-person camera controls

  // Voxel terrain rendering
  private terrainGroup: THREE.Group;
  private blockGeometry: THREE.BoxGeometry;
  private materials: Map<string, THREE.MeshLambertMaterial>;

  // Billboard sprites for entities
  private entitySprites: Map<string, THREE.Sprite>;
  private animalSprites: Map<string, THREE.Sprite>;
  private plantSprites: Map<string, THREE.Sprite>;

  // Lighting with time-of-day
  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
}
```

**Features:**

- **Voxel terrain:** World rendered as colored cubes (grass, dirt, stone, sand, water)
- **Billboard sprites:** Agents, animals, plants rendered as always-facing-camera sprites
- **Time-of-day lighting:** Sun position and ambient lighting changes with world time
- **First-person controls:** WASD + mouse look with pointer lock
- **Entity selection:** Click entities to select them, shows golden halo above selection
- **Animated animals:** 8-directional walk animations for species with PixelLab sprites
- **Building rendering:** Buildings shown as colored boxes scaled by tier
- **Dynamic fog:** Fog distance adjusts with draw distance setting

**Activation:**

3D mode is activated when camera switches to side-view mode. The 3D canvas is positioned behind the 2D canvas, which becomes transparent and only renders UI.

```typescript
// Activate 3D renderer
renderer3D.mount(container);
renderer3D.activate();
renderer3D.setWorld(world);

// Position camera in 3D space
renderer3D.setCameraFromWorld(worldX, worldY, elevation);

// Set draw distance (in tiles)
renderer3D.setDrawDistance(60); // Default render radius
```

**Coordinate system:**

- Three.js X = World X
- Three.js Y = World Z (elevation)
- Three.js Z = World Y

**Entity rendering:**

Agents use procedural sprites with directional billboards (front, back, left, right) that rotate to face the camera. Animals and plants load textures from `/assets/sprites/pixellab/{species}/`.

**Animation system:**

Animals with walk animations load 8 directions × 8 frames from `/assets/sprites/pixellab/{species}/animations/walking-8-frames/{direction}/frame_000.png`. Frames cycle at 10 FPS when moving.

**Time-of-day lighting:**

Sun angle, color, and intensity change based on world time:
- Night (0-6, 20-24): Dark blue ambient, minimal sun
- Dawn/Dusk (6-7, 19-20): Orange sun, warm ambient
- Day (8-18): White sun, bright ambient

Sky color and fog color sync with lighting.

### 3. Camera & Viewport System

The **Camera** controls what portion of the world is visible:

```typescript
class Camera {
  // Camera position (world coordinates)
  x: number;
  y: number;
  zoom: number; // 0.1 - 4.0

  // View mode (affects rendering)
  viewMode: ViewMode; // 'top-down' | 'side-view-west' | etc.

  // Pan mode (controls movement constraints)
  panMode: CameraPanMode; // 'free' | 'horizontal_only' | etc.

  // Convert world coordinates to screen coordinates
  worldToScreen(worldX: number, worldY: number): ScreenPosition;

  // Convert screen coordinates to world coordinates
  screenToWorld(screenX: number, screenY: number): WorldPosition;

  // Check if world position is visible in viewport
  isVisible(worldX: number, worldY: number): boolean;
}
```

**View Modes:**

- **Top-down:** Classic 2D overhead view (default)
- **Side-view:** 2.5D side-scrolling with parallax backgrounds
  - `side-view-west`: View from west (entities face east/west)
  - `side-view-east`: View from east
  - `side-view-north`: View from north
  - `side-view-south`: View from south

**Viewport culling:** Only entities/chunks within camera bounds are rendered:

```typescript
// Check if entity is in viewport before rendering
const pos = entity.getComponent<PositionComponent>('position');
if (this.camera.isVisible(pos.x, pos.y)) {
  this.renderEntity(entity);
}
```

### 3. PixelLab Sprite System

**PixelLab** is the sprite generation system that creates animated pixel art sprites on-demand:

```typescript
interface PixelLabSprite {
  // Sprite organization
  folderId: string;           // "human_male_black" or "cat_orange"

  // 8-directional sprites
  directions: {
    south: HTMLImageElement;      // Facing down
    south_west: HTMLImageElement;
    west: HTMLImageElement;       // Facing left
    north_west: HTMLImageElement;
    north: HTMLImageElement;      // Facing up
    north_east: HTMLImageElement;
    east: HTMLImageElement;       // Facing right
    south_east: HTMLImageElement;
  };

  // Animations for each direction
  animations: {
    [direction: string]: {
      idle: HTMLImageElement[];      // Standing still
      walk: HTMLImageElement[];      // Walking
      run?: HTMLImageElement[];      // Running (optional)
      attack?: HTMLImageElement[];   // Attacking (optional)
    };
  };
}
```

**Sprite loading workflow:**

```typescript
// 1. Map entity traits to sprite folder
const traits: SpriteTraits = {
  species: 'human',
  gender: 'male',
  hairColor: 'black',
  skinTone: 'light',
};

// 2. Find matching sprite (or closest match)
const result = findSprite(traits);
// Returns: { folderId: 'human_male_black', exactMatch: true }

// 3. Load sprite from PixelLab API
const loader = getPixelLabSpriteLoader();
const sprite = await loader.loadSprite(result.folderId);

// 4. Render sprite with direction/animation
const direction = angleToPixelLabDirection(entity.velocity.angle);
renderSprite(ctx, sprite, direction, 'walk', x, y);
```

**Sprite caching:** Sprites are cached by instance ID to avoid re-loading:

```typescript
// Cache sprite instance per entity
this.entitySpriteInstances.set(entityId, instanceId);

// Reuse cached instance
const instanceId = this.entitySpriteInstances.get(entityId);
if (instanceId) {
  const instance = spriteCache.getInstance(instanceId);
}
```

### 4. Context Menu System

The **radial context menu** provides right-click actions for world entities and tiles:

```typescript
// Architecture components
ContextMenuManager      // Orchestrates menu lifecycle, integrates with input
ContextMenuRenderer     // Renders radial menu with animation
ContextActionRegistry   // Manages action definitions and execution
MenuContext            // Builds context from clicked position/entity
```

**Radial menu architecture:**

The menu displays actions in a circular layout around the click point. Items arranged as arc segments with labels, icons, and shortcuts.

```typescript
interface RadialMenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  category: string;
  enabled: boolean;
  hovered: boolean;
  hasSubmenu: boolean;
  // Arc geometry (calculated)
  startAngle: number;    // Degrees
  endAngle: number;      // Degrees
  innerRadius: number;   // Pixels
  outerRadius: number;   // Pixels
}
```

**Action registration:**

Actions define when they're applicable and what they do:

```typescript
contextRegistry.register({
  id: 'harvest',
  label: 'Harvest',
  icon: 'harvest',
  shortcut: 'H',
  category: 'gathering',

  // Applicability check
  isApplicable: (ctx: MenuContext) => {
    if (ctx.targetType !== 'resource') return false;
    const resource = ctx.getTargetEntity(world);
    const harvestable = resource?.getComponent('harvestable');
    return harvestable && harvestable.amount > 0;
  },

  // Execution
  execute: (ctx, world, eventBus) => {
    eventBus.emit({
      type: 'action:harvest',
      data: { resourceId: ctx.targetEntity }
    });
  }
});
```

**Menu context building:**

When user right-clicks, system builds context from clicked location:

```typescript
const context: MenuContext = {
  worldPosition: { x, y },           // World coordinates
  screenPosition: { x, y },          // Screen coordinates
  targetEntity: entityId | null,     // Clicked entity (if any)
  targetType: 'agent' | 'building' | 'resource' | 'empty_tile',
  selectedEntities: [...],           // Currently selected entities
  isWalkable: boolean,
  isBuildable: boolean,
  // Helper methods
  hasSelection(): boolean,
  getSelectedCount(): number,
  getTargetEntity(world): Entity | null,
  getSelectedEntities(world): Entity[]
};
```

**Interaction flow:**

1. User right-clicks on world
2. ContextMenuManager detects right-click, builds MenuContext
3. Registry filters actions based on `isApplicable(context)`
4. ContextMenuRenderer calculates arc angles and renders menu
5. User hovers over items (hit testing via arc geometry)
6. User clicks item → Registry executes action → Menu closes

**Animation styles:**

Menu supports open/close animations: `'fade'`, `'scale'`, `'rotate_in'`, `'pop'`

**Submenu support:**

Actions can have submenus for hierarchical choices:

```typescript
{
  id: 'prioritize',
  label: 'Prioritize',
  hasSubmenu: true,
  submenu: [
    { id: 'priority_high', label: 'High Priority', ... },
    { id: 'priority_normal', label: 'Normal Priority', ... },
    { id: 'priority_low', label: 'Low Priority', ... }
  ]
}
```

**Default actions:**

System registers 30+ default actions across categories:
- **Movement:** Move Here, Follow, Scatter, Formation
- **Social:** Talk To, Create Group
- **Gathering:** Harvest, Assign Worker, Prioritize
- **Building:** Enter, Repair, Demolish
- **Construction:** Build (with submenu for categories)
- **Navigation:** Place Waypoint, Focus Camera
- **Info:** Inspect, Tile Info

### 5. Window Management System

**WindowManager** manages all UI panels with dragging, resizing, and persistence:

```typescript
interface WindowConfig {
  // Initial position/size
  defaultX: number;
  defaultY: number;
  defaultWidth: number;
  defaultHeight: number;

  // Constraints
  minWidth?: number;
  minHeight?: number;
  resizable?: boolean;
  draggable?: boolean;

  // Behavior
  startVisible?: boolean;
  pinned?: boolean;           // Immune to LRU auto-close
  layoutMode?: LayoutMode;    // 'normal' | 'modal' | 'fullscreen'

  // Title bar customization
  title: string;
  showMinimizeButton?: boolean;
  showCloseButton?: boolean;
  customButtons?: TitleBarButton[];
}

interface IWindowPanel {
  // Required methods
  render(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void;
  update?(world: World, deltaTime: number): void;
  cleanup?(): void;

  // Input handling
  handleClick?(x: number, y: number, world?: World): void;
  handleMouseMove?(x: number, y: number): void;
  handleKeyPress?(key: string): void;
  handleWheel?(deltaY: number, x: number, y: number): void;
}
```

**Window lifecycle:**

```typescript
// 1. Register window
windowManager.registerWindow('agent-info', agentInfoPanel, {
  defaultX: 10, defaultY: 50,
  defaultWidth: 300, defaultHeight: 400,
  title: 'Agent Info',
  resizable: true,
  draggable: true,
});

// 2. Show window
windowManager.showWindow('agent-info');

// 3. Window automatically positioned to avoid overlap
// 4. User can drag/resize/minimize
// 5. LRU auto-close if too many windows open
// 6. Layout persisted to localStorage
```

**LRU (Least Recently Used) auto-close:**

When screen space is exhausted, unpinned windows are auto-closed based on last interaction time:

```typescript
// Pinned windows never auto-close
windowManager.pinWindow('resources'); // Always visible

// Unpinned windows close when space runs out
windowManager.showWindow('agent-info'); // May be auto-closed
```

### 5. UI Panel System

**40+ specialized panels** for different game systems:

**Agent/Entity Panels:**
- `AgentInfoPanel` - Agent details (stats, skills, inventory, memories)
- `AgentRosterPanel` - List of all agents
- `AnimalInfoPanel` - Animal details
- `AnimalRosterPanel` - List of all animals
- `PlantInfoPanel` - Plant growth status

**Resource/Production Panels:**
- `ResourcesPanel` - Stockpile inventory
- `CraftingStationPanel` - Crafting recipes
- `CraftingPanelUI` - Advanced crafting interface
- `FarmManagementPanel` - Farm plots and crops
- `ShopPanel` - Market/shop interface

**City/Governance Panels:**
- `GovernanceDashboardPanel` - City governance UI
- `CityManagerPanel` - City management tools
- `EconomyPanel` - Economic dashboard
- `NetworkPanel` - City network visualization

**Magic/Divine Panels:**
- `MagicSystemsPanel` - Magic paradigm UI
- `SpellbookPanel` - Spell management
- `DivinePowersPanel` - Divine power UI
- `PrayerPanel` - Prayer management (divine package)

**Research/Tech Panels:**
- `ResearchLibraryPanel` - Research tree
- `TechTreePanel` - Technology tree

**Combat Panels:**
- `CombatHUDPanel` - Combat HUD overlay
- `CombatLogPanel` - Combat event log
- `CombatUnitPanel` - Unit stats in combat

**Utility Panels:**
- `MemoryPanel` - Agent memory inspector
- `RelationshipsPanel` - Relationship graph
- `NotificationsPanel` - Notification feed
- `TimeControlsPanel` - Pause/speed controls
- `SettingsPanel` - Game settings
- `DevPanel` - Developer tools

### 6. Text Rendering & Accessibility

The **TextRenderer** generates prose descriptions of the game world for accessibility and AI context:

```typescript
class TextRenderer {
  // Renders world state as text descriptions
  render(world: World, camera: Camera): TextFrame;

  // Configuration
  config: {
    voice: VoiceMode;           // Narrative style
    maxEntities: number;        // How many entities to describe
    includeDialogue: boolean;   // Include agent speech
    includeEvents: boolean;     // Include world events
  };
}
```

**Voice modes:**

- **`'live'`** - Present tense, player perspective ("You see Mira gathering berries")
- **`'record'`** - Past tense, documentary style ("Mira gathered berries near the river")
- **`'screen_reader'`** - Accessibility format, ARIA-friendly, structured lists
- **`'llm_context'`** - Compact format for LLM consumption, technical details
- **`'text_adventure'`** - Classic interactive fiction style

**Output format:**

```typescript
interface TextFrame {
  timestamp: number;
  worldTick: number;
  scene: string;              // Main scene description
  dialogue: DialogueLine[];   // Recent speech
  events: string[];           // Recent world events
  inventory: string;          // Player/selected agent inventory
  stats: string;              // Key statistics
}
```

**Scene composition:**

The `SceneComposer` builds descriptions in layers:

1. **Context:** Time of day, weather, location type
2. **Entities:** Visible agents, animals, buildings (sorted by proximity)
3. **Actions:** What entities are doing
4. **Environment:** Terrain features, plants, resources

```typescript
// Example output (live voice)
"Day 47, Afternoon. You are in the village square. The weather is clear.

Mira gathers berries to the east (10m). She looks focused.
A campfire (unlit) stands at the center.
Three wooden houses line the northern edge.

The air feels cold."
```

**Accessibility integration:**

Screen reader mode formats output with ARIA landmarks and semantic structure for assistive technology:

```
REGION: Village Square
TIME: Day 47, Afternoon, 14:32

AGENTS (3 visible):
- Mira (East, 10m): gathering berries, focused
- Kael (North, 15m): crafting at workbench
- Luna (West, 8m): idle

BUILDINGS (4):
- Campfire (unlit)
- Workbench (occupied by Kael)
- Storage chest (closed)
```

**LLM context mode:**

Compact technical format for feeding to AI agents:

```
T47.14:32 LOC:village WEATHER:clear
AGENTS: Mira@10,23(gather,berries) Kael@8,19(craft,workbench) Luna@12,25(idle)
BUILDINGS: campfire@11,22(unlit) workbench@8,19(busy) storage@9,20
TERRAIN: grass(75%) dirt(20%) water(5%)
```

**Integration with EntityDescriber:**

EntityDescriber generates natural language descriptions for individual entities:

```typescript
entityDescriber.describe(entity, context) → string

// Examples:
// "Mira (human, female) - gathering berries, health 95%, carrying 3 items"
// "Ancient oak tree - 45 years old, provides shade, harvestable"
// "Workbench (tier 2) - occupied, 80% durability"
```

### 7. Adapter Pattern

The renderer uses **adapters** to bridge different panel interfaces to the WindowManager:

**ViewAdapter:**

Wraps DashboardView instances from `@ai-village/core` for compatibility with WindowManager:

```typescript
class ViewAdapter<TData extends ViewData> implements IWindowPanel {
  constructor(view: DashboardView<TData>);

  // Bridges DashboardView lifecycle
  render(ctx, x, y, width, height, world) {
    // 1. Fetch data via view.getData(context)
    const data = this.view.getData({ world, selectedEntityId });

    // 2. Render via view.canvasRenderer(ctx, data, bounds, theme)
    this.view.canvasRenderer(ctx, data, { x, y, width, height }, theme);
  }

  // Forwards interactions
  handleScroll(deltaY, contentHeight) {
    return this.view.handleScroll?.(deltaY, contentHeight, viewState);
  }

  handleContentClick(x, y, width, height) {
    return this.view.handleClick?.(x, y, bounds, data);
  }
}
```

**PanelAdapter:**

Generic adapter for panels with varying interfaces:

```typescript
interface PanelConfig<T> {
  id: string;
  title: string;
  defaultWidth: number;
  defaultHeight: number;

  // Custom render delegation
  renderMethod?: (panel, ctx, x, y, width, height, world) => void;

  // Optional interaction handlers
  handleScroll?: (panel, deltaY, contentHeight) => boolean;
  handleContentClick?: (panel, x, y, width, height) => boolean;
}

class PanelAdapter<T> implements IWindowPanel {
  constructor(panel: T, config: PanelConfig<T>);
}
```

**Usage example:**

```typescript
// Adapt ResourcesPanel (has custom render signature)
const config: PanelConfig<ResourcesPanel> = {
  id: 'resources',
  title: 'Village Stockpile',
  defaultWidth: 280,
  defaultHeight: 200,
  renderMethod: (panel, ctx, _x, _y, width, _height, world) => {
    panel.render(ctx, width, world, false); // Custom signature
  },
};
const adapter = new PanelAdapter(resourcesPanel, config);
windowManager.registerWindow(adapter.getId(), adapter, config);
```

**Why adapters?**

Different panel sources have incompatible interfaces:
- DashboardView (from core): Uses `getData()` + `canvasRenderer()`
- Legacy panels: Use `render(ctx, width, world, inWindow)`
- Standard panels: Use `render(ctx, x, y, width, height, world)`

Adapters normalize these into `IWindowPanel` interface for WindowManager.

### 8. Divine UI Components

Rendering integration with the **divinity package** for god-mode gameplay:

**DivineStatusBar:**

Fixed top bar showing divine resources:

```typescript
class DivineStatusBar {
  render(ctx, screenWidth, props: {
    energy: DivineEnergy;        // Current/max divine energy + regen rate
    averageFaith: number;         // Faith level across all agents
    prayers: Prayer[];            // Active prayer requests
    angels: Angel[];              // Angels working on tasks
    prophecies: Prophecy[];       // Pending prophecies
  }): void;
}
```

Displays:
- Divine Energy bar (golden)
- Faith level (colored by intensity)
- Quick stats (prayer count, angel count, prophecy count)

**Prayer Panels:**

- **PrayerPanel:** Manage incoming prayer requests from agents
- **AngelManagementPanel:** Assign angels to fulfill prayers
- **SacredGeographyPanel:** Mark sacred sites and manage divine influence zones

**Divine Indicators:**

- **PrayingAgentIndicators:** Renders prayer icons above agents during prayer
- **FloatingPrayerNotifications:** Shows answered prayer notifications with sparkle effects
- **DivineActionsPalette:** Quick-access palette for common divine actions

**Integration pattern:**

Divine panels follow adapter pattern for WindowManager integration:

```typescript
const prayerPanelAdapter = new PanelAdapter(prayerPanel, {
  id: 'divine_prayers',
  title: 'Prayers',
  defaultWidth: 400,
  defaultHeight: 500,
  menuCategory: 'divine',
});
```

Divine status bar renders independently on top of game canvas before UI panels.

### 9. Particle Effects

**ParticleRenderer** creates visual feedback effects:

```typescript
interface Particle {
  x: number;        // World position X
  y: number;        // World position Y
  vx: number;       // Velocity X
  vy: number;       // Velocity Y
  color: string;    // RGBA color
  size: number;     // Pixel radius
  startTime: number;
  lifetime: number; // Milliseconds
}

class ParticleRenderer {
  // Create dust cloud (for tilling, digging, construction)
  createDustCloud(worldX: number, worldY: number, count: number = 8): void;

  // Render all active particles
  render(ctx: CanvasRenderingContext2D, camera: Camera, currentTime: number): void;
}
```

**Usage:**

```typescript
// Emit dust particles when agent tills soil
particleRenderer.createDustCloud(tileX, tileY, 12);

// Particles automatically fade out over lifetime
particleRenderer.render(ctx, camera, performance.now());
```

### 10. Specialized Renderers

The renderer package includes **specialized rendering modules** for different entity types and production quality:

**Production Renderers:**

- **ProductionRenderer:** High-quality character rendering for TV shows, movies, gladiator arenas
  - Quality levels: Broadcast (128px), Premium (256px), Cinematic (512px), Ultra (1024px+)
  - Render formats: sprite, portrait, action, scene
  - Costuming system: peasant, noble, gladiator, custom
  - Equipment specs: weapons, shields, props with placement
  - Animation support: idle, walking, fighting, speaking sequences

```typescript
const renderRequest: RenderRequest = {
  entityId: 'agent_123',
  qualityLevel: QualityLevel.Cinematic,
  format: 'portrait',
  costume: { costumeType: 'gladiator', accessories: ['helmet', 'sword'] },
  pose: 'dramatic',
  expression: 'determined',
  lighting: 'dramatic',
  purpose: 'tv_episode_intro',
};
productionRenderer.queueRender(renderRequest);
```

- **CombatAnimator:** Advanced combat animation system with hit reactions, dodge rolls, parries
- **SoulSpriteRenderer:** Visualizes souls and spirits with ethereal effects

**Terrain Renderers:**

- **TerrainRenderer:** Top-down chunk-based terrain rendering
  - Renders terrain tiles with biome colors
  - Tilled soil indicator (dark brown with furrows)
  - Wall rendering (stone blocks)
  - Temperature overlay visualization

- **SideViewTerrainRenderer:** 2.5D side-scrolling terrain with parallax layers
  - Background, midground, foreground layers
  - Parallax scrolling effect
  - Elevation-based depth

**Entity Renderers:**

- **AgentRenderer:** Human and agent character rendering
  - PixelLab sprite integration (8 directions)
  - Animation state management (idle, walk, run, action)
  - Equipment layering (weapons, armor, accessories)

- **AnimalRenderer:** Animal creature rendering
  - Species-specific sprites
  - 8-directional movement with automatic direction calculation
  - Walk cycle animations (8 frames @ 10 FPS)
  - Size scaling based on species

- **BuildingRenderer:** Structure rendering for placed buildings
  - Construction progress visualization
  - Multi-tile building support
  - Tier-based visual upgrades

**Integration:**

These renderers are used by the main `Renderer.ts` which orchestrates:

```typescript
// Renderer.ts delegates to specialized renderers
this.terrainRenderer.renderChunk(chunk, camera);
this.agentRenderer.renderAgent(agent, camera);
this.animalRenderer.renderAnimal(animal, camera);
this.buildingRenderer.renderBuilding(building, camera);
```

### 11. Overlay Renderers

**Specialized renderers for entity overlays and indicators:**

**HealthBarRenderer:**
```typescript
// Render health bar above entity
healthBarRenderer.render(ctx, entity, screenX, screenY);
// Green bar (100% health) → yellow (50%) → red (0%)
// Shows background bar + foreground fill + border
```

**SpeechBubbleRenderer:**
```typescript
// Show agent speech with word-wrap and timing
speechBubbleRenderer.addSpeech(entityId, "Hello, traveler!", 3000); // 3 second duration
speechBubbleRenderer.render(ctx, camera, world);
// Renders rounded rectangle bubble above agent with tail pointer
```

**FloatingTextRenderer:**
```typescript
// Show damage/XP/status numbers that float upward and fade
floatingTextRenderer.addText(worldX, worldY, "-15", 'red');      // Damage
floatingTextRenderer.addText(worldX, worldY, "+50 XP", 'gold');  // XP gain
floatingTextRenderer.addText(worldX, worldY, "CRIT!", 'orange'); // Status
floatingTextRenderer.render(ctx, camera, currentTime);
// Text floats upward with alpha fade over 1.5 seconds
```

**ThreatIndicatorRenderer:**
```typescript
// Show combat threat rings around entities
threatIndicatorRenderer.render(ctx, camera, world);
// Red circles around hostile entities
// Blue circles around friendly entities
// Orange circles around neutral-but-dangerous entities
// Circle size pulses to draw attention
```

**BedOwnershipRenderer:**
```typescript
// Show ownership markers on claimed beds
bedOwnershipRenderer.render(ctx, camera, world);
// Renders house icon (🏠) + owner's name initial above bed
// Only for claimed beds (not communal)
```

**DebugOverlay:**
```typescript
// Development overlay showing entity IDs, positions, component counts
debugOverlay.render(ctx, camera, world, showEntityIds, showPositions);
```

**InteractionOverlay:**
```typescript
// Shows interaction prompts when player is near interactive entities
// "Press E to harvest" / "Press F to enter building"
interactionOverlay.render(ctx, camera, world, playerEntity);
```

**GhostPreview:**
```typescript
// Shows translucent preview of building placement
ghostPreview.render(ctx, camera, buildingType, position, isValidPlacement);
// Green tint if valid, red tint if invalid
```

**Rendering order:**

Overlays render after all world entities to appear on top:

```
1. Terrain
2. Buildings
3. Entities
4. Particles
5. Overlays: ↓
   - Health bars
   - Speech bubbles
   - Floating text
   - Threat indicators
   - Bed ownership markers
   - Debug overlay
   - Interaction prompts
   - Ghost preview
6. UI Panels
```

---

## Renderer API

### Renderer (Main Rendering Class)

**Core 2D canvas renderer** that orchestrates the entire rendering pipeline.

**Dependencies:** `ChunkManager`, `TerrainGenerator`, `Camera`

**Update interval:** Every frame (requestAnimationFrame)

**Key methods:**

```typescript
class Renderer {
  constructor(
    canvas: HTMLCanvasElement,
    chunkManager: ChunkManager,
    terrainGenerator: TerrainGenerator
  );

  // Set the world to render
  setWorld(world: World): void;

  // Main render method (call every frame)
  render(world: World, currentTime: number): void;

  // Get camera instance
  getCamera(): Camera;

  // Sprite management
  getPixelLabLoader(): PixelLabSpriteLoader;

  // View toggles
  showResourceAmounts: boolean;
  showBuildingLabels: boolean;
  showAgentNames: boolean;
  showAgentTasks: boolean;
  showCityBounds: boolean;
  showTemperatureOverlay: boolean;

  // Context menu integration
  setContextMenuManager(manager: ContextMenuManager): void;

  // Cleanup
  cleanup(): void;
}
```

**Rendering a frame:**

```typescript
const renderer = new Renderer(canvas, chunkManager, terrainGenerator);
renderer.setWorld(world);

function gameLoop(currentTime: number) {
  renderer.render(world, currentTime);
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
```

### Camera

**Controls viewport and view mode.**

**Key methods:**

```typescript
class Camera {
  // Position control
  setPosition(x: number, y: number): void;
  pan(dx: number, dy: number): void;
  centerOn(worldX: number, worldY: number): void;

  // Zoom control
  setZoom(zoom: number): void;
  zoomIn(factor?: number): void;
  zoomOut(factor?: number): void;

  // View mode
  setViewMode(mode: ViewMode): void;
  cycleViewMode(): void; // Cycle through view modes

  // Pan mode (movement constraints)
  setPanMode(mode: CameraPanMode): void;

  // Coordinate conversion
  worldToScreen(worldX: number, worldY: number): ScreenPosition;
  screenToWorld(screenX: number, screenY: number): WorldPosition;

  // Visibility checks
  isVisible(worldX: number, worldY: number): boolean;
  getVisibleChunks(): Chunk[];

  // Bounds
  getBounds(): { minX, minY, maxX, maxY };
}
```

**Camera controls:**

```typescript
// Center camera on agent
const agent = world.getEntity(agentId);
const pos = agent.getComponent<PositionComponent>('position');
camera.centerOn(pos.x, pos.y);

// Zoom in/out
camera.zoomIn(1.2);  // 20% zoom in
camera.zoomOut(0.8); // 20% zoom out

// Switch to side-view
camera.setViewMode('side-view-west');

// Lock camera to horizontal scrolling only
camera.setPanMode('horizontal_only');
```

### WindowManager

**Manages UI windows with dragging, resizing, and persistence.**

**Key methods:**

```typescript
class WindowManager {
  constructor(canvas: HTMLCanvasElement);

  // Window registration
  registerWindow(id: string, panel: IWindowPanel, config: WindowConfig): void;

  // Window visibility
  showWindow(id: string): void;
  hideWindow(id: string): void;
  toggleWindow(id: string): void;
  isWindowVisible(id: string): boolean;

  // Window state
  pinWindow(id: string): void;
  unpinWindow(id: string): void;
  minimizeWindow(id: string): void;
  maximizeWindow(id: string): void;

  // Window focus
  focusWindow(id: string): void;
  bringToFront(id: string): void;

  // Rendering
  render(ctx: CanvasRenderingContext2D): void;

  // Input handling
  handleClick(x: number, y: number, world?: World): boolean;
  handleMouseMove(x: number, y: number): void;
  handleMouseDown(x: number, y: number): void;
  handleMouseUp(): void;
  handleWheel(deltaY: number, x: number, y: number): void;

  // Layout persistence
  saveLayout(): void;
  loadLayout(): void;
  clearLayout(): void;

  // Canvas resize
  handleCanvasResize(width: number, height: number): void;

  // Cleanup
  cleanup(): void;
}
```

**Window management workflow:**

```typescript
const windowManager = new WindowManager(canvas);

// Register panels
windowManager.registerWindow('agent-info', agentInfoPanel, {
  defaultX: 10, defaultY: 50,
  defaultWidth: 300, defaultHeight: 400,
  title: 'Agent Info',
  resizable: true,
});

windowManager.registerWindow('resources', resourcesPanel, {
  defaultX: 320, defaultY: 50,
  defaultWidth: 250, defaultHeight: 300,
  title: 'Resources',
  pinned: true, // Never auto-close
});

// Show windows
windowManager.showWindow('agent-info');
windowManager.showWindow('resources');

// Render windows (call every frame)
windowManager.render(ctx);

// Handle input (pass through from canvas)
canvas.addEventListener('click', (e) => {
  windowManager.handleClick(e.clientX, e.clientY, world);
});
```

### Sprite System

**PixelLab sprite loading and rendering.**

**Key APIs:**

```typescript
// Get sprite loader singleton
import { getPixelLabSpriteLoader } from '@ai-village/renderer';
const loader = getPixelLabSpriteLoader();

// Load sprite by folder ID
const sprite = await loader.loadSprite('human_male_black');

// Check if sprite is loaded
const isLoaded = loader.isSpriteLoaded('human_male_black');

// Get loaded sprite
const sprite = loader.getLoadedSprite('human_male_black');

// Find sprite by traits
import { findSprite } from '@ai-village/renderer';
const result = findSprite({
  species: 'human',
  gender: 'male',
  hairColor: 'black',
  skinTone: 'light',
});
// Returns: { folderId: 'human_male_black', exactMatch: true }

// Render sprite
import { renderSprite } from '@ai-village/renderer';
renderSprite(
  ctx,
  sprite,
  'south',      // Direction
  'walk',       // Animation
  screenX,
  screenY,
  frameIndex    // Current animation frame
);

// Convert angle to direction
import { angleToPixelLabDirection } from '@ai-village/renderer';
const direction = angleToPixelLabDirection(Math.PI / 4); // Returns 'north_east'
```

**Sprite loading workflow:**

```typescript
// 1. Get sprite loader
const loader = getPixelLabSpriteLoader();

// 2. Map entity to sprite folder
const appearance = entity.getComponent<AppearanceComponent>('appearance');
const result = findSprite({
  species: appearance.species,
  gender: appearance.gender,
  hairColor: appearance.hairColor,
  skinTone: appearance.skinTone,
});

// 3. Load sprite if not loaded
if (!loader.isSpriteLoaded(result.folderId)) {
  await loader.loadSprite(result.folderId);
}

// 4. Get sprite
const sprite = loader.getLoadedSprite(result.folderId);

// 5. Calculate direction from velocity
const steering = entity.getComponent<SteeringComponent>('steering');
const angle = Math.atan2(steering.velocity.y, steering.velocity.x);
const direction = angleToPixelLabDirection(angle);

// 6. Render sprite
const isMoving = steering.velocity.x !== 0 || steering.velocity.y !== 0;
const animation = isMoving ? 'walk' : 'idle';
renderSprite(ctx, sprite, direction, animation, screenX, screenY);
```

---

## Usage Examples

### Example 1: Creating a Custom UI Panel

```typescript
import type { IWindowPanel } from '@ai-village/renderer';
import type { World } from '@ai-village/core';

class MyCustomPanel implements IWindowPanel {
  private data: string = 'Hello World';

  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Clear panel background
    ctx.fillStyle = 'rgba(20, 20, 30, 0.95)';
    ctx.fillRect(x, y, width, height);

    // Draw content
    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.fillText(this.data, x + 10, y + 30);
  }

  update(world: World, deltaTime: number): void {
    // Update panel state based on world
    this.data = `Tick: ${world.tick}`;
  }

  handleClick(x: number, y: number, world?: World): void {
    console.log(`Panel clicked at ${x}, ${y}`);
  }

  cleanup(): void {
    // Clean up resources
  }
}

// Register panel with window manager
const panel = new MyCustomPanel();
windowManager.registerWindow('my-panel', panel, {
  defaultX: 10,
  defaultY: 10,
  defaultWidth: 200,
  defaultHeight: 100,
  title: 'My Panel',
  resizable: true,
});

// Show panel
windowManager.showWindow('my-panel');
```

### Example 2: Rendering Custom Entity Overlay

```typescript
import type { Camera } from '@ai-village/renderer';

function renderCustomOverlay(
  ctx: CanvasRenderingContext2D,
  world: World,
  camera: Camera
): void {
  // Query entities
  const agents = world.query().with('agent').with('position').executeEntities();

  for (const agent of agents) {
    const pos = agent.getComponent<PositionComponent>('position');

    // Check if in viewport
    if (!camera.isVisible(pos.x, pos.y)) continue;

    // Convert to screen coordinates
    const screen = camera.worldToScreen(pos.x, pos.y);

    // Draw custom indicator
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(screen.x, screen.y - 20, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Call in main render loop
renderer.render(world, currentTime);
renderCustomOverlay(ctx, world, camera);
```

### Example 3: Loading and Rendering PixelLab Sprite

```typescript
import {
  getPixelLabSpriteLoader,
  findSprite,
  renderSprite,
  angleToPixelLabDirection,
} from '@ai-village/renderer';

async function loadAndRenderAgentSprite(
  ctx: CanvasRenderingContext2D,
  entity: Entity,
  screenX: number,
  screenY: number
): Promise<void> {
  const loader = getPixelLabSpriteLoader();

  // Get appearance
  const appearance = entity.getComponent<AppearanceComponent>('appearance');

  // Find matching sprite
  const result = findSprite({
    species: appearance.species,
    gender: appearance.gender,
    hairColor: appearance.hairColor,
    skinTone: appearance.skinTone,
  });

  if (!result.exactMatch) {
    console.warn(`No exact sprite match for ${appearance.species}`);
  }

  // Load sprite if needed
  if (!loader.isSpriteLoaded(result.folderId)) {
    await loader.loadSprite(result.folderId);
  }

  // Get sprite
  const sprite = loader.getLoadedSprite(result.folderId);
  if (!sprite) return;

  // Calculate direction from movement
  const steering = entity.getComponent<SteeringComponent>('steering');
  const angle = Math.atan2(steering.velocity.y, steering.velocity.x);
  const direction = angleToPixelLabDirection(angle);

  // Determine animation
  const speed = Math.sqrt(
    steering.velocity.x ** 2 + steering.velocity.y ** 2
  );
  const animation = speed > 0.1 ? 'walk' : 'idle';

  // Render sprite
  renderSprite(ctx, sprite, direction, animation, screenX, screenY);
}
```

### Example 4: Camera Controls with Keyboard

```typescript
import { Camera, CameraPanMode, ViewMode } from '@ai-village/renderer';

const camera = new Camera(canvas.width, canvas.height);

// Keyboard controls
document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowUp':
      camera.pan(0, -10);
      break;
    case 'ArrowDown':
      camera.pan(0, 10);
      break;
    case 'ArrowLeft':
      camera.pan(-10, 0);
      break;
    case 'ArrowRight':
      camera.pan(10, 0);
      break;
    case '+':
      camera.zoomIn(1.1);
      break;
    case '-':
      camera.zoomOut(0.9);
      break;
    case 'v':
      camera.cycleViewMode(); // Cycle through view modes
      break;
    case 'c':
      // Center on selected agent
      const selectedAgent = getSelectedAgent();
      if (selectedAgent) {
        const pos = selectedAgent.getComponent<PositionComponent>('position');
        camera.centerOn(pos.x, pos.y);
      }
      break;
  }
});

// Mouse wheel zoom
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (e.deltaY < 0) {
    camera.zoomIn(1.1);
  } else {
    camera.zoomOut(0.9);
  }
});
```

### Example 5: Particle Effects on Action

```typescript
import { ParticleRenderer } from '@ai-village/renderer';

const particleRenderer = new ParticleRenderer();

// Emit particles when agent performs action
world.on('action:till_soil', (data) => {
  const { position } = data;

  // Create dust cloud at tile position
  particleRenderer.createDustCloud(
    position.x,
    position.y,
    12 // particle count
  );
});

world.on('action:mine', (data) => {
  const { position } = data;

  // Create larger dust cloud for mining
  particleRenderer.createDustCloud(position.x, position.y, 20);
});

// Render particles every frame
function render(currentTime: number) {
  renderer.render(world, currentTime);
  particleRenderer.render(ctx, camera, currentTime);
}
```

---

## Architecture & Data Flow

### Rendering Execution Order

```
1. InputHandler (mouse/keyboard/touch)
   ↓ Updates camera position/zoom
2. Camera (viewport culling)
   ↓ Calculates visible bounds
3. Renderer.render()
   ↓ Main rendering pipeline:
   a. Clear canvas
   b. Render terrain chunks (visible only)
   c. Render entities (depth-sorted)
   d. Render particles
   e. Render overlays (health bars, speech, etc.)
4. WindowManager.render()
   ↓ Render UI panels
5. ContextMenuRenderer (if open)
   ↓ Render context menu
```

### Event Flow

```
User Input
  ↓ 'click', 'mousemove', 'keydown'
InputHandler
  → Updates Camera (pan, zoom, view mode)
  → Forwards to WindowManager (UI clicks)
  → Forwards to ContextMenuManager (right-click)

World Events
  ↓ 'action:*', 'entity:*', 'plant:*'
Renderer
  → Emits particles (dust, sparks)
  → Updates overlays (health bars, speech)
  → Triggers animations (sprite state changes)
```

### Component → Rendering Mapping

```
Entity
├── PositionComponent → Screen position (Camera.worldToScreen)
├── RenderableComponent → Sprite selection
├── AppearanceComponent → PixelLab sprite traits
├── SteeringComponent → Movement direction/animation
├── HealthComponent → Health bar overlay
└── SpeechComponent → Speech bubble

Agent/Animal
├── IdentityComponent → Name label
└── SkillsComponent → XP floating text

Building
├── BuildingComponent → Building sprite/tiles
└── ConstructionComponent → Construction progress overlay

Plant
└── PlantComponent → Plant sprite/growth stage
```

---

## Performance Considerations

**Optimization strategies:**

1. **Viewport culling:** Only render entities/chunks in camera bounds
2. **Sprite caching:** Sprites cached by instance ID, shared across entities
3. **Chunk lazy loading:** Chunks only generated when visible
4. **Terrain chunk caching:** Chunks pre-rendered to off-screen canvas and cached
5. **Entity depth sorting:** Entities sorted by Y position once per frame
6. **Particle pooling:** Particles reused from pool instead of creating new objects
7. **Canvas layer separation:** UI panels rendered on separate layer from game world
8. **Dirty rectangle rendering:** Only redraw changed regions (future optimization)

**Viewport culling:**

```typescript
// ❌ BAD: Render all entities
for (const entity of entities) {
  renderEntity(entity);
}

// ✅ GOOD: Cull entities outside viewport
for (const entity of entities) {
  const pos = entity.getComponent<PositionComponent>('position');
  if (!camera.isVisible(pos.x, pos.y)) continue; // Skip offscreen entities
  renderEntity(entity);
}
```

**Sprite instance caching:**

```typescript
// ❌ BAD: Load sprite every frame
const sprite = await loader.loadSprite('human_male_black');

// ✅ GOOD: Cache sprite instance per entity
let instanceId = this.entitySpriteInstances.get(entityId);
if (!instanceId) {
  instanceId = await loader.loadSprite('human_male_black');
  this.entitySpriteInstances.set(entityId, instanceId);
}
const sprite = loader.getLoadedSprite(instanceId);
```

**Terrain chunk caching:**

```typescript
// TerrainRenderer automatically caches rendered chunks to off-screen canvas
// Chunks are only re-rendered when terrain data changes (detected via hash)
// Zoom changes do NOT invalidate cache - cached canvas is just scaled

const renderer = new TerrainRenderer(ctx, tileSize);

// First render: chunk rendered to off-screen canvas and cached
renderer.renderChunk(chunk, camera);

// Second render: cached canvas is reused (even at different zoom levels)
camera.zoom = 2.0;
renderer.renderChunk(chunk, camera); // Fast: uses cached canvas

// Cache invalidation happens automatically when chunk data changes
chunk.tiles[0].terrain = 'grass'; // Hash changes
renderer.renderChunk(chunk, camera); // Re-renders to cache

// Manual cache control:
renderer.invalidateChunkCache(chunkX, chunkY); // Invalidate specific chunk
renderer.invalidateAllCaches(); // Invalidate all (e.g., on settings change)
renderer.getCacheStats(); // { size: 42, maxSize: 100 }

// LRU eviction: Cache limited to 100 chunks (~1.6MB at 16px tiles)
// Oldest unused chunks automatically evicted when cache is full
```

**Chunk lazy loading:**

```typescript
// ❌ BAD: Generate all chunks at startup
for (let chunkX = 0; chunkX < 100; chunkX++) {
  for (let chunkY = 0; chunkY < 100; chunkY++) {
    chunkManager.getOrCreateChunk(chunkX, chunkY);
  }
}

// ✅ GOOD: Generate chunks only when visible
const visibleChunks = camera.getVisibleChunks();
for (const chunkCoord of visibleChunks) {
  chunkManager.getOrCreateChunk(chunkCoord.x, chunkCoord.y);
}
```

**Entity depth sorting:**

```typescript
// Sort entities by Y position for correct depth rendering
entities.sort((a, b) => {
  const posA = a.getComponent<PositionComponent>('position');
  const posB = b.getComponent<PositionComponent>('position');
  return posA.y - posB.y; // Front-to-back rendering
});
```

---

## Troubleshooting

### Sprites not rendering

**Check:**
1. Sprite loaded? (`loader.isSpriteLoaded(folderId)`)
2. Entity has `AppearanceComponent`? (`entity.hasComponent('appearance')`)
3. Entity in viewport? (`camera.isVisible(pos.x, pos.y)`)
4. Sprite folder ID valid? (`findSprite(traits)` returns valid result)
5. PixelLab API accessible? (check network tab for 404s)

**Debug:**
```typescript
const loader = getPixelLabSpriteLoader();
const result = findSprite({ species: 'human', gender: 'male' });
console.log('Sprite folder:', result.folderId);
console.log('Sprite loaded:', loader.isSpriteLoaded(result.folderId));
const sprite = loader.getLoadedSprite(result.folderId);
console.log('Sprite directions:', sprite ? Object.keys(sprite.directions) : 'null');
```

### UI panels not responding to clicks

**Check:**
1. Window visible? (`windowManager.isWindowVisible(id)`)
2. Window on top? (`windowManager.bringToFront(id)`)
3. Click coordinates correct? (check canvas offset)
4. Panel implements `handleClick`? (`panel.handleClick(x, y, world)`)
5. Window manager receiving input? (`windowManager.handleClick(x, y, world)`)

**Debug:**
```typescript
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  console.log('Canvas click:', x, y);
  const handled = windowManager.handleClick(x, y, world);
  console.log('WindowManager handled:', handled);
});
```

### Camera not following entity

**Check:**
1. Camera position set? (`camera.setPosition(x, y)`)
2. Pan mode allows movement? (`camera.setPanMode('free')`)
3. Entity position valid? (not NaN)
4. `centerOn` called every frame? (call in update loop)

**Debug:**
```typescript
const agent = world.getEntity(agentId);
const pos = agent.getComponent<PositionComponent>('position');
console.log('Agent position:', pos.x, pos.y);
console.log('Camera position:', camera.x, camera.y);
console.log('Pan mode:', camera.panMode);
camera.centerOn(pos.x, pos.y);
console.log('Camera after center:', camera.x, camera.y);
```

### Performance issues (low FPS)

**Check:**
1. Too many entities? (viewport culling enabled?)
2. Sprite cache working? (check `entitySpriteInstances` map size)
3. Chunk generation slow? (only generate visible chunks)
4. Too many particles? (limit particle count)
5. UI panels updating every frame? (throttle updates)

**Debug:**
```typescript
console.time('render');
renderer.render(world, currentTime);
console.timeEnd('render');

console.log('Entities rendered:', entitiesRendered);
console.log('Chunks rendered:', chunksRendered);
console.log('Sprite cache size:', entitySpriteInstances.size);
console.log('Active particles:', particleRenderer.particles.length);
```

### Sprite animations not playing

**Error:** Sprite stuck in one frame

**Fix:** Ensure animation frame index updates each frame:

```typescript
// ❌ BAD: Static frame index
renderSprite(ctx, sprite, direction, 'walk', x, y, 0);

// ✅ GOOD: Update frame index based on time
const frameIndex = Math.floor((currentTime / 100) % sprite.animations[direction].walk.length);
renderSprite(ctx, sprite, direction, 'walk', x, y, frameIndex);
```

---

## Integration with Other Systems

### ECS Integration

Renderer queries world for entities with rendering-relevant components:

```typescript
// Query entities with position and renderable components
const entities = world.query()
  .with('position')
  .with('renderable')
  .executeEntities();

// Render each entity
for (const entity of entities) {
  const pos = entity.getComponent<PositionComponent>('position');
  const renderable = entity.getComponent<RenderableComponent>('renderable');

  if (camera.isVisible(pos.x, pos.y)) {
    renderEntity(entity, pos, renderable);
  }
}
```

### Action System Integration

Actions trigger visual feedback via events:

```typescript
// Action system emits event
world.emit('action:harvest_plant', {
  agentId: 'agent_123',
  plantId: 'plant_456',
  position: { x: 50, y: 50 },
  harvested: 5,
});

// Renderer listens for event and shows feedback
world.on('action:harvest_plant', (data) => {
  // Show floating text
  floatingTextRenderer.addText(
    data.position.x,
    data.position.y,
    `+${data.harvested}`,
    'green'
  );

  // Emit particles
  particleRenderer.createDustCloud(data.position.x, data.position.y, 8);
});
```

### Magic System Integration

Magic system panels visualize paradigm state:

```typescript
// MagicSystemsPanel shows paradigm state
import { MagicSystemsPanel } from '@ai-village/renderer';
const magicPanel = new MagicSystemsPanel(world);

// Panel queries magic state
const magicState = world.query().with('magic_state').executeEntities()[0];
const state = magicState?.getComponent<MagicStateComponent>('magic_state');

// Render paradigm UI
magicPanel.render(ctx, x, y, width, height);
```

---

## Testing

Run renderer tests:

```bash
npm test -- Renderer.test.ts
npm test -- Camera.test.ts
npm test -- WindowManager.test.ts
npm test -- PixelLabSpriteLoader.test.ts
```

**Key test files:**
- `src/__tests__/RendererCleanup.test.ts` - Renderer cleanup
- `src/__tests__/WindowManager.test.ts` - Window management
- `src/__tests__/WindowDragging.integration.test.ts` - Dragging
- `src/__tests__/WindowPersistence.integration.test.ts` - Persistence
- `src/__tests__/ContextMenuIntegration.test.ts` - Context menus
- `src/__tests__/DragDropSystem.test.ts` - Drag-drop
- `src/__tests__/InventoryUI.integration.test.ts` - Inventory UI

---

## Further Reading

- **SYSTEMS_CATALOG.md** - Complete system reference
- **COMPONENTS_REFERENCE.md** - All component types
- **ARCHITECTURE_OVERVIEW.md** - Master architecture document
- **PERFORMANCE.md** - Performance optimization guide
- **PixelLab API** - `production/PixelLabAPI.ts` for sprite generation

---

## Summary for Language Models

**Before working with renderer:**
1. Read this README completely
2. Understand rendering pipeline (terrain → entities → particles → overlays → UI)
3. Know the **3 rendering modes**: 2D top-down (Canvas 2D), 3D voxel (Three.js), Text (accessibility)
4. Understand camera/viewport system (culling, coordinate conversion, view modes)
5. Know PixelLab sprite system (8 directions, animations, caching)
6. Understand window management (dragging, resizing, LRU, persistence)
7. Know context menu system (radial menu, action registry, MenuContext)
8. Understand adapter pattern (ViewAdapter, PanelAdapter for interface bridging)

**Rendering modes:**
- **2D Canvas:** Primary mode - top-down sprites on HTML5 canvas
- **3D Voxel:** Three.js voxel world with billboard sprites, activated in side-view mode
- **Text:** Accessibility mode - prose descriptions with multiple voice modes

**Common tasks:**
- **Create UI panel:** Implement `IWindowPanel` OR use `PanelAdapter` with config, register with `WindowManager`
- **Adapt DashboardView:** Use `ViewAdapter` to bridge core views to WindowManager
- **Render entity overlay:** Query entities, convert to screen coords, draw on canvas
- **Load sprite:** Use `findSprite()` + `getPixelLabSpriteLoader().loadSprite()`
- **Add particle effect:** Call `particleRenderer.createDustCloud(x, y, count)`
- **Control camera:** Use `camera.centerOn()`, `camera.setZoom()`, `camera.setViewMode()`
- **Show floating text:** Call `floatingTextRenderer.addText(x, y, text, color)`
- **Register context action:** Call `contextRegistry.register({ id, label, isApplicable, execute })`
- **Generate text description:** Use `textRenderer.render(world, camera)` for accessibility
- **Activate 3D mode:** Call `renderer3D.activate()` when switching to side-view

**Critical rules:**
- Always cull entities outside viewport (use `camera.isVisible()`)
- Cache sprites by instance ID (don't reload every frame)
- Sort entities by Y position for correct depth rendering
- Use world coordinates for entities, screen coordinates for rendering
- Handle cleanup in `IWindowPanel.cleanup()` (remove event listeners)
- Never modify camera state from panels (panels are pure view)
- Use adapters for interface compatibility (don't rewrite panel interfaces)
- Context actions must define `isApplicable` and `execute` (no silent failures)

**Event-driven architecture:**
- Listen to `action:*` events for visual feedback (particles, floating text)
- Emit events when UI state changes (`window:opened`, `window:closed`)
- Never bypass WindowManager for panel visibility (use `showWindow()/hideWindow()`)
- Use camera events for viewport changes (`camera:moved`, `camera:zoomed`)
- Context menu actions emit events for game systems to handle

**Performance critical paths:**
- Viewport culling (only render visible entities)
- Sprite caching (avoid reloading sprites)
- Chunk lazy loading (only generate visible chunks)
- Entity depth sorting (once per frame, not per entity)
- Particle pooling (reuse particle objects)
- 3D voxel culling (render radius limits terrain generation)

**New in this documentation:**
- **3D Renderer (§2):** Three.js voxel engine, billboard sprites, time-of-day lighting
- **Context Menu System (§4):** Radial menu, action registry, MenuContext building
- **Text Rendering (§6):** 5 voice modes, accessibility, LLM context, prose generation
- **Adapter Pattern (§7):** ViewAdapter and PanelAdapter for interface bridging
- **Divine UI (§8):** God-mode panels, prayer system, divine status bar
- **Specialized Renderers (§10):** Production, terrain, entity-specific renderers
- **Overlay Renderers (§11):** Expanded coverage of all overlay types
