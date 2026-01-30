# Rendering and UI System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Purpose

The rendering system displays the game world, agents, items, and UI in a cohesive 8-bit pixel art style while supporting both hand-crafted and procedurally generated visuals.

## Overview

The rendering system displays the game world, agents, items, and UI in a cohesive 8-bit pixel art style. It supports both hand-crafted sprites and procedurally generated visuals for new items, crops, and buildings, maintaining visual consistency through style constraints.

---

## Visual Style

### 8-Bit Aesthetic

```typescript
interface VisualStyle {
  // Resolution
  tileSize: 16;              // 16x16 pixel tiles
  characterSize: 16 | 24;    // 16x16 or 16x24 characters
  uiScale: 2 | 3 | 4;        // Pixel scaling for display

  // Colors
  paletteSize: 32;           // Max colors in palette
  colorDepth: "nes" | "gameboy" | "custom";

  // Animation
  maxFramesPerAnimation: 8;
  frameRate: 8 | 12;         // FPS for sprite animation
}
```

### Color Palettes

```typescript
interface ColorPalette {
  id: string;
  name: string;
  colors: string[];          // Hex colors

  // Semantic mappings
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  shadow: string;
  highlight: string;

  // Category hints
  forTerrain: boolean;
  forCharacters: boolean;
  forItems: boolean;
  forUI: boolean;
}

// Example: Forest Village Palette
const forestPalette: ColorPalette = {
  id: "forest_village",
  name: "Forest Village",
  colors: [
    "#0f380f", "#306230", "#8bac0f", "#9bbc0f", // Greens
    "#5a3921", "#8b5a2b", "#d2b48c",            // Browns
    "#4169e1", "#87ceeb",                        // Blues
    "#ffd700", "#ffa500",                        // Yellows
    "#dc143c", "#ff69b4",                        // Reds/pinks
    "#f5f5dc", "#2f2f2f", "#000000"              // Neutrals
  ],
  primary: "#306230",
  secondary: "#8b5a2b",
  accent: "#ffd700",
  background: "#9bbc0f",
  shadow: "#0f380f",
  highlight: "#f5f5dc",
  forTerrain: true,
  forCharacters: true,
  forItems: true,
  forUI: true
};
```

---

## Requirements

### Requirement: Chunk-Based Tile Rendering

The world uses chunk-based infinite generation.
See `world-system/procedural-generation.md` for chunk details.

```typescript
interface ChunkRenderer {
  // Chunk management
  activeChunks: Map<ChunkId, RenderedChunk>;
  chunkRenderDistance: number;     // Chunks to render around camera

  // Rendering
  renderChunk(chunk: Chunk): RenderedChunk;
  updateVisibleChunks(camera: Camera): void;
  unloadDistantChunks(camera: Camera): void;

  // Optimization
  chunkSpriteCache: Map<ChunkId, CanvasImageSource>;
  prerenderStaticLayers(chunk: Chunk): void;
}

interface RenderedChunk {
  id: ChunkId;
  staticLayer: CanvasImageSource;   // Pre-rendered terrain
  dynamicLayer: CanvasImageSource;  // Objects, needs frequent update
  lastUpdated: number;
}

interface TileRenderer {
  // Sprite management
  loadTileset(path: string): Promise<Tileset>;
  getTileSprite(terrainType: TerrainType, variant: number): Sprite;

  // Rendering
  renderTile(tile: Tile, x: number, y: number): void;
  renderTileLayer(layer: TileLayer): void;

  // Optimization
  cullOffscreenTiles(viewport: Viewport): Tile[];
  batchRenderTiles(tiles: Tile[]): void;
}

interface Tileset {
  image: HTMLImageElement;
  tileWidth: number;
  tileHeight: number;
  columns: number;
  tiles: Map<string, TileDefinition>;
}
```

### Requirement: Character Sprites

Agents SHALL have animated sprites:

```typescript
interface CharacterSprite {
  id: string;
  baseImage: HTMLImageElement;

  // Animations
  animations: Map<AnimationState, Animation>;

  // Variations
  colorVariants: Map<string, ColorMapping>;
  accessorySlots: AccessorySlot[];
}

type AnimationState =
  | "idle_down" | "idle_up" | "idle_left" | "idle_right"
  | "walk_down" | "walk_up" | "walk_left" | "walk_right"
  | "work" | "sleep" | "talk" | "celebrate" | "sad";

interface Animation {
  frames: number[];          // Frame indices
  frameDuration: number;     // Ms per frame
  loop: boolean;
}
```

### Requirement: Player Control Indicator

The player-controlled agent SHALL be visually distinct.

#### Scenario: Player Controlling Agent
- **WHEN** the player is controlling an agent
- **THEN** the renderer SHALL:
  - Display a subtle glow/outline around the agent
  - Show player-specific UI (controls, inventory hotbar)
  - Camera follows the player agent
  - Highlight interactable objects nearby

#### Scenario: Player Switches to Spectator Mode
- **WHEN** the player switches to spectator mode
- **THEN** the renderer SHALL:
  - Remove player indicator
  - Enable free camera movement
  - Show overview UI instead

---

## Generative Sprite System

### Requirement: Procedural Sprite Generation

Generated items/crops/buildings SHALL have procedural sprites:

```typescript
interface SpriteGenerator {
  // Generation methods
  generateItemSprite(item: GeneratedItem): GeneratedSprite;
  generateCropSprite(crop: GeneratedCrop): GeneratedSprite;
  generateBuildingSprite(building: GeneratedBuilding): GeneratedSprite;

  // Style enforcement
  applyPaletteConstraints(sprite: RawSprite, palette: ColorPalette): Sprite;
  enforcePixelArtStyle(sprite: RawSprite): Sprite;
  addOutline(sprite: Sprite, color: string): Sprite;
}

interface GeneratedSprite {
  id: string;
  imageData: ImageData;      // Raw pixel data
  palette: string[];         // Colors used
  animations?: Animation[];

  // Generation metadata
  generatedFrom: string;     // Description/prompt
  styleEnforced: boolean;
  manuallyEdited: boolean;
}
```

### Requirement: AI Image Generation Integration

The system SHALL support AI image generation:

```typescript
interface ImageGenerationBackend {
  type: "stable_diffusion" | "dalle" | "custom";
  endpoint: string;
  modelId: string;

  // Generation
  generate(prompt: ImagePrompt): Promise<RawImage>;

  // Post-processing
  pixelate(image: RawImage, targetSize: Size): PixelatedImage;
  quantizeColors(image: PixelatedImage, palette: ColorPalette): QuantizedImage;
}

interface ImagePrompt {
  description: string;       // Item/crop description
  style: "pixel art" | "8-bit" | "retro";
  referenceImages?: string[];
  negativePrompts: string[];
  size: { width: number; height: number };

  // Constraints
  mustMatchPalette: ColorPalette;
  mustIncludeColors: string[];
  maxColors: number;
}
```

### Requirement: Sprite Style Enforcement

Generated sprites SHALL match the 8-bit style.

#### Scenario: Generating Sprite via AI
- **WHEN** generating a sprite via AI
- **THEN** the system SHALL:
  1. Generate base image with style prompt:
     "16x16 pixel art, 8-bit style, limited palette, no anti-aliasing"
  2. Pixelate to target resolution (16x16, 24x24, etc.)
  3. Quantize colors to game palette
  4. Apply outline if item/character
  5. Validate pixel art rules:
     - No orphan pixels (isolated single pixels)
     - Clean edges (no jaggies)
     - Consistent shading direction
  6. Auto-correct or flag for manual review

#### Scenario: Style Enforcement Fails
- **WHEN** style enforcement fails
- **THEN** the system SHALL:
  1. Use fallback procedural generation
  2. Combine existing sprite elements
  3. Use placeholder with category icon

### Requirement: Procedural Fallback Generation

The system SHALL have non-AI procedural generation:

```typescript
interface ProceduralSpriteGenerator {
  // Template-based generation
  generateFromTemplate(
    template: SpriteTemplate,
    variations: TemplateVariation[]
  ): Sprite;

  // Combination generation
  combineElements(
    base: SpriteElement,
    overlays: SpriteElement[]
  ): Sprite;

  // Color variation
  recolorSprite(
    sprite: Sprite,
    colorMapping: Map<string, string>
  ): Sprite;
}

interface SpriteTemplate {
  id: string;
  category: "item" | "crop" | "building";
  baseShape: number[][];     // Pixel grid
  colorSlots: string[];      // Replaceable colors
  variationPoints: Position[]; // Where to add details
}
```

---

## UI Rendering

### Requirement: Game UI

The UI SHALL have an 8-bit aesthetic:

```typescript
interface UITheme {
  // Windows
  windowBackground: string;
  windowBorder: NineSlice;
  windowShadow: boolean;

  // Text
  font: PixelFont;
  textColor: string;
  highlightColor: string;

  // Buttons
  buttonNormal: NineSlice;
  buttonHover: NineSlice;
  buttonPressed: NineSlice;

  // Icons
  iconSize: 8 | 16;
  iconStyle: "minimal" | "detailed";
}

interface PixelFont {
  name: string;
  size: 8 | 16;
  characterSet: "ascii" | "extended";
  spacing: number;
}
```

### Requirement: Player HUD

The player SHALL see a HUD when controlling an agent.
Needs display uses the full needs hierarchy from `agent-system/needs.md`.

```
Player HUD Elements:
┌─────────────────────────────────────────────────────┐
│ [Portrait] Name                                     │
│ [Mood]     🍖 ████████░░ 🥤 ██████░░░░ ⚡ ███████░░░ │
│            Hunger 80%   Thirst 60%   Energy 70%    │
├─────────────────────────────────────────────────────┤
│                   ⏰ 2:30 PM | Spring Day 5         │
│                                                     │
│                   GAME WORLD                        │
│                                                     │
├─────────────────────────────────────────────────────┤
│ [1][2][3][4][5][6][7][8][9][0] ← Hotbar            │
│  🪓 🌱 💧 🔨 📦                   💰 1,234         │
└─────────────────────────────────────────────────────┘

Needs Bar Modes:
- Compact: Shows only critical needs (hunger, thirst, energy)
- Expanded: Shows all physical needs + warnings for low safety/social
- Minimal: Hides needs bar, only shows warnings when critical (<20%)
```

### Requirement: Spectator/Management UI

When not controlling an agent, show management UI:

```
Management View:
┌──────────────┬──────────────────────────────────────┐
│ AGENTS       │                                      │
│ ● Farmer Joe │                                      │
│ ○ Builder    │          VILLAGE OVERVIEW            │
│ ○ Merchant   │                                      │
│              │     [Zoomable, pannable map]         │
├──────────────┤                                      │
│ BUILDINGS    │                                      │
│ Farm: 3      │                                      │
│ Shops: 2     │                                      │
│ Homes: 5     │                                      │
├──────────────┼──────────────────────────────────────┤
│ ECONOMY      │ [Selected agent/building details]    │
│ 💰 12,345    │                                      │
│ 📈 +5%/day   │                                      │
└──────────────┴──────────────────────────────────────┘
```

---

## Camera System

### Requirement: Camera Control

The camera SHALL support multiple modes:

```typescript
interface Camera {
  // Position
  x: number;
  y: number;
  zoom: number;              // 1-4x

  // Mode
  mode: "follow" | "free" | "cinematic";
  followTarget?: string;     // Agent ID

  // Bounds
  minZoom: number;
  maxZoom: number;
  worldBounds: Rect;

  // Smoothing
  smoothing: boolean;
  smoothFactor: number;
}
```

#### Scenario: Follow Mode (Player Control)
- **WHEN** in "follow" mode (player control)
- **THEN** camera SHALL:
  - Center on player agent
  - Allow slight lead in movement direction
  - Smooth transitions
  - Allow temporary free look with right-click

#### Scenario: Free Mode (Spectator)
- **WHEN** in "free" mode (spectator)
- **THEN** camera SHALL:
  - Move with WASD/arrow keys or mouse drag
  - Zoom with scroll wheel
  - Double-click agent to follow

#### Scenario: Cinematic Mode
- **WHEN** in "cinematic" mode
- **THEN** camera SHALL:
  - Follow scripted paths
  - Pan to points of interest
  - Used for events, discoveries

### Requirement: Abstraction Layer Rendering

When zoomed out, the renderer switches to abstracted views.
See `world-system/abstraction-layers.md` for simulation layer details.

```typescript
interface AbstractionRenderer {
  // Zoom thresholds for rendering mode switches
  tileViewMaxZoom: number;      // Below this, render tiles (e.g., 0.5x)
  villageViewMinZoom: number;   // Above this, render village icons (e.g., 0.1x)
  worldViewMinZoom: number;     // Above this, render world map (e.g., 0.02x)

  // Village icon rendering
  renderVillageIcon(village: Village, layer: SimulationLayer): void;
  getVillageIcon(village: Village): Sprite;   // Based on size, prosperity
  renderVillageLabel(village: Village): void;

  // Trade route visualization
  renderTradeRoute(route: TradeRoute, active: boolean): void;
  renderCaravanOnRoute(caravan: Caravan): void;

  // World map mode
  renderWorldOverview(villages: Village[], routes: TradeRoute[]): void;
}

interface VillageIconStyle {
  size: "hamlet" | "village" | "town" | "city";
  prosperity: "poor" | "modest" | "wealthy" | "thriving";
  specialization?: "farming" | "mining" | "trading" | "crafting";
  hasPlayer: boolean;           // Highlight if player is here
}
```

#### Scenario: Zooming Out to Village View
- **WHEN** camera zoom < tileViewMaxZoom (zooming out)
- **THEN** renderer SHALL:
  - Transition from tile view to village icons
  - Show village names and basic stats
  - Display trade routes as dotted lines
  - Show caravans as moving dots on routes

#### Scenario: World View
- **WHEN** camera zoom < worldViewMinZoom (world view)
- **THEN** renderer SHALL:
  - Show simplified world map
  - Villages as small icons
  - Biome regions as colored areas
  - Player's village highlighted

---

## Visual Effects

### Requirement: Particle Effects

The system SHALL support 8-bit particle effects:

```typescript
type ParticleEffect =
  | { type: "sparkle"; color: string; count: number }
  | { type: "dust"; direction: Direction }
  | { type: "splash"; size: "small" | "large" }
  | { type: "leaves"; season: Season }
  | { type: "fire"; intensity: number }
  | { type: "magic"; color: string; pattern: string }
  | { type: "hearts"; count: number }          // Social
  | { type: "zzz" }                            // Sleeping
  | { type: "sweat" }                          // Working hard
  | { type: "question" }                       // Confused
  | { type: "exclamation" };                   // Alert
```

### Requirement: Weather Effects

Weather SHALL be visually represented:

```typescript
interface WeatherRenderer {
  renderRain(intensity: number): void;
  renderSnow(intensity: number): void;
  renderFog(density: number): void;
  renderLightning(): void;
  renderWindEffect(direction: Direction, strength: number): void;

  // Overlays
  applyDarkness(level: number): void;  // Night
  applySunlight(level: number): void;  // Day brightness
  applySeasonalTint(season: Season): void;
}
```

---

## Performance

### Requirement: Rendering Optimization

The renderer SHALL be optimized:

```typescript
interface RenderingOptimization {
  // Batching
  spriteBatcher: SpriteBatcher;
  tileBatcher: TileBatcher;

  // Culling
  viewportCulling: boolean;
  occlusionCulling: boolean;

  // Caching
  textureAtlas: TextureAtlas;
  spriteCache: Map<string, CachedSprite>;
  generatedSpriteCache: LRUCache<string, GeneratedSprite>;

  // Quality settings
  particleLimit: number;
  animationDistance: number;  // Beyond this, no animation
  shadowsEnabled: boolean;
}
```

**Performance Targets:**
- 60 FPS on mid-range hardware
- < 100ms for generated sprite processing
- < 50MB texture memory
- Support 500+ on-screen sprites

---

## Sprite Persistence

### Requirement: Generated Sprite Storage

Generated sprites SHALL be persisted:

```typescript
interface SpriteStorage {
  // Save
  saveGeneratedSprite(sprite: GeneratedSprite): Promise<string>;

  // Load
  loadGeneratedSprite(id: string): Promise<GeneratedSprite>;

  // Index
  getSpritesByCategory(category: string): GeneratedSprite[];
  getSpritesByItem(itemId: string): GeneratedSprite;

  // Export
  exportToSpritesheet(sprites: GeneratedSprite[]): Spritesheet;
}
```

---

## Open Questions

1. Support for custom player-created sprites?
2. Seasonal sprite variants for all items?
3. Aging/weathering effects on buildings?
4. Portrait generation for agents?
5. Animated backgrounds (water, trees)?

---

## Related Specs

**Core Integration:**
- `game-engine/spec.md` - Render loop integration
- `world-system/spec.md` - Tile and chunk rendering

**World Systems:**
- `world-system/procedural-generation.md` - Chunk-based infinite world
- `world-system/abstraction-layers.md` - Multi-scale village rendering

**Content Rendering:**
- `items-system/spec.md` - Item sprite generation
- `agent-system/spec.md` - Character sprites
- `agent-system/needs.md` - HUD needs display
