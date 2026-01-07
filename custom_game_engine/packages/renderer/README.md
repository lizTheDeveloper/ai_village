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

### 2. Camera & Viewport System

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

### 4. Window Management System

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

### 6. Particle Effects

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

### 7. Overlay Renderers

**Specialized renderers for entity overlays:**

**HealthBarRenderer:**
```typescript
// Render health bar above entity
healthBarRenderer.render(ctx, entity, screenX, screenY);
// Green bar that depletes as health decreases
```

**SpeechBubbleRenderer:**
```typescript
// Show agent speech
speechBubbleRenderer.addSpeech(entityId, "Hello!", 3000); // 3 second duration
speechBubbleRenderer.render(ctx, camera, world);
```

**FloatingTextRenderer:**
```typescript
// Show damage/XP numbers
floatingTextRenderer.addText(worldX, worldY, "-15", 'red'); // Damage
floatingTextRenderer.addText(worldX, worldY, "+50 XP", 'gold'); // XP gain
floatingTextRenderer.render(ctx, camera, currentTime);
```

**ThreatIndicatorRenderer:**
```typescript
// Show threat indicators in combat
threatIndicatorRenderer.render(ctx, camera, world);
// Red circles around enemies, blue around allies
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
4. **Entity depth sorting:** Entities sorted by Y position once per frame
5. **Particle pooling:** Particles reused from pool instead of creating new objects
6. **Canvas layer separation:** UI panels rendered on separate layer from game world
7. **Dirty rectangle rendering:** Only redraw changed regions (future optimization)

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
3. Know camera/viewport system (culling, coordinate conversion)
4. Understand PixelLab sprite system (8 directions, animations, caching)
5. Know window management system (dragging, resizing, LRU, persistence)

**Common tasks:**
- **Create UI panel:** Implement `IWindowPanel`, register with `WindowManager`
- **Render entity overlay:** Query entities, convert to screen coords, draw on canvas
- **Load sprite:** Use `findSprite()` + `getPixelLabSpriteLoader().loadSprite()`
- **Add particle effect:** Call `particleRenderer.createDustCloud(x, y, count)`
- **Control camera:** Use `camera.centerOn()`, `camera.setZoom()`, `camera.setViewMode()`
- **Show floating text:** Call `floatingTextRenderer.addText(x, y, text, color)`

**Critical rules:**
- Always cull entities outside viewport (use `camera.isVisible()`)
- Cache sprites by instance ID (don't reload every frame)
- Sort entities by Y position for correct depth rendering
- Use world coordinates for entities, screen coordinates for rendering
- Handle cleanup in `IWindowPanel.cleanup()` (remove event listeners)
- Never modify camera state from panels (panels are pure view)

**Event-driven architecture:**
- Listen to `action:*` events for visual feedback (particles, floating text)
- Emit events when UI state changes (`window:opened`, `window:closed`)
- Never bypass WindowManager for panel visibility (use `showWindow()/hideWindow()`)
- Use camera events for viewport changes (`camera:moved`, `camera:zoomed`)

**Performance critical paths:**
- Viewport culling (only render visible entities)
- Sprite caching (avoid reloading sprites)
- Chunk lazy loading (only generate visible chunks)
- Entity depth sorting (once per frame, not per entity)
- Particle pooling (reuse particle objects)
