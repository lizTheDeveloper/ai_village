# @ai-village/renderer

Real-time game rendering system for AI Village. Renders the 2D top-down world using HTML5 Canvas with a clean separation between game state and visual presentation.

## Architecture Overview

The renderer follows a **clean separation of concerns**:

```
Game State (ECS) → Visual Systems → Renderer → Canvas
     ↓                  ↓              ↓          ↓
  Components    Compute Visual    Read Visual   Draw Pixels
                 Properties       Properties
```

### Key Principles

1. **The renderer only reads, never writes** - It queries component data but never modifies game state
2. **Visual properties are pre-computed** - Systems calculate size/opacity before rendering
3. **Rendering is deterministic** - Same components always produce same visuals
4. **No game logic in renderer** - Domain knowledge (growth stages, genetics) stays in game systems

## Core Components

### 1. Renderer (`Renderer.ts`)

The main rendering engine that draws the game world.

**Responsibilities:**
- Camera positioning and viewport management
- Entity rendering with parallax and layering
- Sprite scaling and opacity application
- UI overlay coordination

**Does NOT:**
- Modify game state
- Contain domain logic about plants, animals, or agents
- Calculate size from growth stages or genetics

**Key Methods:**

```typescript
class Renderer {
  // Main render loop - called every frame
  render(world: World, camera: Camera): void;

  // Render a single entity with visual properties
  private renderEntity(entity: Entity, camera: Camera): void;

  // Apply parallax for depth layers
  private applyParallax(worldX: number, worldY: number, layer: RenderLayer): Point;
}
```

**Rendering Pipeline:**

```typescript
// For each entity with renderable component:
1. Get renderable component
2. Read sizeMultiplier and alpha (pre-computed by visual systems)
3. Apply camera transform and parallax
4. Set canvas.globalAlpha = renderable.alpha
5. Calculate scaledSize = baseSize * parallaxScale * sizeMultiplier
6. Draw sprite at calculated position and size
```

### 2. Visual Systems (Game Logic Layer)

Visual systems compute `sizeMultiplier` and `alpha` from game state **before rendering**. These run at priority 300, after growth systems but before rendering.

#### PlantVisualsSystem

Computes visual properties for plants based on growth stage and genetics.

**Location:** `packages/core/src/systems/PlantVisualsSystem.ts`

**What it does:**
- Maps plant stages to size multipliers (seed=0.2, mature=1.0, dead=0.7)
- Applies genetic height variation when mature
- Sets opacity based on stage (dying plants fade out)

**Example:**
```typescript
// Seed stage plant
renderable.sizeMultiplier = 0.2;  // 20% of full size
renderable.alpha = 0.8;           // Slightly transparent

// Mature plant with tall genetics
renderable.sizeMultiplier = 1.0 * 1.5;  // 150% size (tall variant)
renderable.alpha = 1.0;                  // Fully opaque

// Dead plant
renderable.sizeMultiplier = 0.7;  // Shriveled
renderable.alpha = 0.3;           // Very transparent
```

**Stage Size Map:**
| Stage | Size | Alpha | Meaning |
|-------|------|-------|---------|
| seed | 0.2 | 0.8 | Tiny, barely visible |
| germinating | 0.3 | 0.85 | Starting to grow |
| sprout | 0.4 | 0.9 | Young shoot |
| vegetative | 0.7 | 1.0 | Growing rapidly |
| flowering | 1.0 | 1.0 | Full size, blooming |
| fruiting | 1.0 | 1.0 | Producing fruit |
| mature | 1.0 | 1.0 | Fully grown |
| seeding | 1.0 | 1.0 | Dropping seeds |
| senescence | 0.9 | 0.7 | Aging, fading |
| decay | 0.8 | 0.5 | Decomposing |
| dead | 0.7 | 0.3 | Withered remains |

#### AnimalVisualsSystem

Computes visual properties for animals based on their size attribute.

**Location:** `packages/core/src/systems/AnimalVisualsSystem.ts`

**What it does:**
- Reads `animal.size` field (0.5 to 2.0, default 1.0)
- Sets `renderable.sizeMultiplier` directly from animal.size
- Always sets alpha to 1.0 (animals don't fade)

**Example:**
```typescript
// Small rabbit
animal.size = 0.6;
renderable.sizeMultiplier = 0.6;  // 60% size
renderable.alpha = 1.0;

// Large bear
animal.size = 1.8;
renderable.sizeMultiplier = 1.8;  // 180% size
renderable.alpha = 1.0;
```

#### AgentVisualsSystem

Computes visual properties for agents (NPCs/players).

**Location:** `packages/core/src/systems/AgentVisualsSystem.ts`

**What it does:**
- Currently sets default size (1.0) for all agents
- Always sets alpha to 1.0 (full opacity)
- **Future:** Will calculate size from age (children smaller than adults)
- **Future:** Will reduce alpha when injured/dying

**Example:**
```typescript
// All agents currently render at default size
renderable.sizeMultiplier = 1.0;
renderable.alpha = 1.0;

// Future: Child agent
if (ageInYears < 12) {
  renderable.sizeMultiplier = 0.7;  // Smaller than adults
}

// Future: Injured agent
if (health < 20) {
  renderable.alpha = 0.7;  // Fade when near death
}
```

### 3. RenderableComponent

The standardized component that all rendered entities have.

**Location:** `packages/core/src/components/RenderableComponent.ts`

**Schema:**
```typescript
interface RenderableComponent {
  type: 'renderable';
  spriteId: string;           // Sprite asset to render
  layer: RenderLayer;         // Z-order (background/foreground/etc)
  visible: boolean;           // Show/hide entity
  animationState?: string;    // Current animation name
  tint?: string;              // Color tint (hex color)

  // Visual metadata (computed by visual systems)
  sizeMultiplier?: number;    // Size scale (default: 1.0, range: 0.1-10.0)
  alpha?: number;             // Opacity (default: 1.0, range: 0.0-1.0)
}
```

**Version History:**
- **v1:** Original schema without sizeMultiplier/alpha
- **v2:** Added sizeMultiplier and alpha fields (migration auto-fills defaults)

**Migration:**
```typescript
// Old saves (v1) are automatically migrated to v2
{
  ...old,
  sizeMultiplier: old.sizeMultiplier ?? 1.0,
  alpha: old.alpha ?? 1.0,
}
```

### 4. SpriteRenderer (`SpriteRenderer.ts`)

Low-level sprite drawing utility.

**Responsibilities:**
- Loading sprite assets
- Drawing sprites to canvas
- Handling sprite animations
- Managing sprite caching

**Key Methods:**

```typescript
class SpriteRenderer {
  // Draw a sprite at a specific position and size
  renderSprite(
    spriteId: string,
    x: number,
    y: number,
    size: number,  // Already includes sizeMultiplier
    ctx: CanvasRenderingContext2D,
    direction?: Direction,
    animationState?: string
  ): void;

  // Load sprite from asset path
  loadSprite(spriteId: string): Promise<HTMLImageElement>;
}
```

**Note:** The metadata parameter was removed in 2026-01. SpriteRenderer now receives size already scaled by sizeMultiplier.

## Data Flow

### Complete Rendering Pipeline

```
1. GAME STATE (ECS Components)
   ↓
   PlantComponent { stage: 'mature', genetics: { matureHeight: 1.5 } }
   AnimalComponent { size: 0.8 }
   AgentComponent { }

2. VISUAL SYSTEMS (Priority 300)
   ↓
   PlantVisualsSystem.update():
     - Reads plant.stage and plant.genetics
     - Calculates sizeMultiplier = 1.0 * 1.5 = 1.5
     - Calculates alpha = 1.0
     - Writes to renderable.sizeMultiplier and renderable.alpha

   AnimalVisualsSystem.update():
     - Reads animal.size
     - Writes renderable.sizeMultiplier = 0.8
     - Writes renderable.alpha = 1.0

   AgentVisualsSystem.update():
     - Writes renderable.sizeMultiplier = 1.0
     - Writes renderable.alpha = 1.0

3. RENDERER (Every Frame)
   ↓
   For each entity:
     - Reads renderable.sizeMultiplier (pre-computed)
     - Reads renderable.alpha (pre-computed)
     - Applies camera transform
     - Sets canvas.globalAlpha = alpha
     - Calculates finalSize = baseSize * parallaxScale * sizeMultiplier
     - Calls SpriteRenderer.renderSprite()

4. CANVAS OUTPUT
   ↓
   Pixels drawn to screen
```

### Example: Rendering a Mature Plant

```typescript
// TICK 100: Plant grows to mature stage
const plant = entity.getComponent('plant');
plant.stage = 'mature';
plant.genetics.matureHeight = 1.5;

// TICK 101: Visual system computes metadata
PlantVisualsSystem.update():
  const renderable = entity.getComponent('renderable');
  renderable.sizeMultiplier = 1.0 * 1.5;  // Base size * genetic height
  renderable.alpha = 1.0;                  // Fully opaque

// TICK 101: Renderer draws the plant
Renderer.renderEntity():
  const renderable = entity.getComponent('renderable');
  const sizeMultiplier = renderable.sizeMultiplier ?? 1.0;  // = 1.5
  const alpha = renderable.alpha ?? 1.0;                     // = 1.0

  ctx.globalAlpha = alpha;  // No transparency
  const scaledSize = baseSize * parallaxScale * sizeMultiplier;
  // If baseSize = 32px, parallaxScale = 1.0:
  // scaledSize = 32 * 1.0 * 1.5 = 48px

  spriteRenderer.renderSprite(spriteId, x, y, scaledSize, ctx);
```

## Render Layers

Entities are drawn in layers for proper depth sorting:

```typescript
enum RenderLayer {
  BACKGROUND = 0,     // Sky, far terrain
  GROUND = 1,         // Soil, grass, floors
  GROUND_DECOR = 2,   // Rocks, ground items
  PLANTS = 3,         // Vegetation
  OBJECTS = 4,        // Buildings, furniture
  ENTITIES = 5,       // Agents, animals
  EFFECTS = 6,        // Particles, magic
  UI = 7,             // Health bars, labels
  FOREGROUND = 8,     // Trees in front of entities
}
```

**Parallax Effect:**
- Background layers (0-2): Move slower than camera (depth illusion)
- Entity layers (3-6): Move with camera
- UI layers (7-8): Fixed to screen (no parallax)

## Camera System

The camera determines what portion of the world is visible.

**Camera Transform:**
```typescript
interface Camera {
  x: number;        // World position X
  y: number;        // World position Y
  zoom: number;     // Zoom level (default 1.0)
  viewport: {
    width: number;  // Screen width
    height: number; // Screen height
  };
}

// Convert world coordinates to screen coordinates
function worldToScreen(worldX: number, worldY: number, camera: Camera): Point {
  return {
    x: (worldX - camera.x) * camera.zoom + camera.viewport.width / 2,
    y: (worldY - camera.y) * camera.zoom + camera.viewport.height / 2,
  };
}
```

**Culling:**
The renderer only draws entities within the camera viewport (plus a small margin) for performance.

## Why This Architecture?

### Before (Ad-hoc Metadata)

```typescript
// ❌ BAD: Renderer had domain knowledge about plant stages
function renderPlant(plant: PlantComponent) {
  let size = 32;
  let alpha = 1.0;

  if (plant.stage === 'seed') size = 8;
  else if (plant.stage === 'seedling') size = 16;
  else if (plant.stage === 'mature' && plant.genetics) {
    size = 32 * plant.genetics.matureHeight;
  }

  if (plant.stage === 'dead') alpha = 0.3;

  drawSprite(plant.spriteId, x, y, size, alpha);
}
```

**Problems:**
- Renderer knows about plant growth stages (domain leak)
- Hard to add new entity types (each needs custom rendering logic)
- Visual properties calculated on-demand (performance cost)
- No separation of concerns

### After (Visual Systems)

```typescript
// ✅ GOOD: Domain logic in visual system
class PlantVisualsSystem {
  update(world, entities) {
    for (const entity of entities) {
      const plant = entity.getComponent('plant');
      const renderable = entity.getComponent('renderable');

      // Calculate visual properties from game state
      renderable.sizeMultiplier = this.calculateSize(plant);
      renderable.alpha = this.calculateAlpha(plant);
    }
  }
}

// ✅ GOOD: Renderer just reads and applies
class Renderer {
  renderEntity(entity) {
    const renderable = entity.getComponent('renderable');
    const size = baseSize * renderable.sizeMultiplier;
    ctx.globalAlpha = renderable.alpha;
    drawSprite(renderable.spriteId, x, y, size);
  }
}
```

**Benefits:**
- Renderer has no domain knowledge (clean separation)
- Easy to add new entity types (just create a visual system)
- Visual properties cached in components (computed once per tick)
- Each system focuses on one concern

### Why Items Don't Vary by Size

```typescript
// T-shirt item has a size attribute (S, M, L)
const tshirt = {
  type: 'item',
  itemType: 'clothing',
  size: 'L',  // Large size
};

// But it renders at default size
const renderable = {
  spriteId: 'tshirt',
  sizeMultiplier: 1.0,  // Same size regardless of S/M/L
  alpha: 1.0,
};
```

**Why:** Item size is a gameplay property (affects who can wear it), not a visual property. A large T-shirt and small T-shirt look the same in inventory - only their stats differ.

## Performance Considerations

### Optimizations

1. **Visual Systems Run Once Per Tick** (Priority 300)
   - Size/alpha computed once, cached in component
   - Renderer reads cached values (no recalculation)

2. **Viewport Culling**
   - Only entities in camera view are rendered
   - Reduces draw calls significantly

3. **Sprite Caching**
   - Sprites loaded once, reused for all instances
   - No re-loading assets every frame

4. **Parallax Pre-calculation**
   - Layer parallax factors computed at init
   - Fast multiplication at render time

### Frame Budget

At 60 FPS, we have ~16ms per frame:
- Visual systems: ~1-2ms (runs at 20 TPS, not every frame)
- Entity rendering: ~8-10ms
- UI rendering: ~2-3ms
- Other systems: ~3-5ms

## Adding New Entity Types

To add rendering for a new entity type:

1. **Add visual system** (if needed):
   ```typescript
   class NewEntityVisualsSystem implements System {
     id = 'new_entity_visuals';
     priority = 300;  // Run before rendering
     requiredComponents = ['new_entity', 'renderable'] as const;

     update(world: World, entities: readonly Entity[]) {
       for (const entity of entities) {
         const newEntity = entity.getComponent('new_entity');
         const renderable = entity.getComponent('renderable');

         // Compute visual properties from game state
         renderable.sizeMultiplier = calculateSize(newEntity);
         renderable.alpha = calculateAlpha(newEntity);
       }
     }
   }
   ```

2. **Register system** in `registerAllSystems.ts`:
   ```typescript
   gameLoop.systemRegistry.register(new NewEntityVisualsSystem());
   ```

3. **Renderer automatically works** - no changes needed!

## Testing

### Unit Tests

```typescript
describe('PlantVisualsSystem', () => {
  it('should set size multiplier based on plant stage', () => {
    const plant = { stage: 'seed' };
    const renderable = {};

    system.update(world, [entity]);

    expect(renderable.sizeMultiplier).toBe(0.2);  // Seed = 20% size
  });

  it('should apply genetic height when mature', () => {
    const plant = {
      stage: 'mature',
      genetics: { matureHeight: 1.5 }
    };
    const renderable = {};

    system.update(world, [entity]);

    expect(renderable.sizeMultiplier).toBe(1.5);  // 1.0 * 1.5
  });
});
```

### Visual Testing

Use the game's debug tools:
- **F3**: Toggle debug overlay (shows size multipliers)
- **F4**: Toggle hitboxes (see actual render sizes)
- **Console**: `game.world.query().with('renderable').executeEntities()`

## Debugging

### Common Issues

**Problem: Entities rendering too small/large**
- Check `renderable.sizeMultiplier` value
- Verify visual system is registered and running
- Check plant/animal component values

**Problem: Entities invisible**
- Check `renderable.visible` flag
- Check `renderable.alpha` (might be 0.0)
- Verify entity is in camera viewport

**Problem: Visual properties not updating**
- Ensure visual system is registered at priority 300
- Check system's `requiredComponents` array
- Verify system is enabled

### Debug Commands

```typescript
// In browser console:

// Get all renderables
const renderables = game.world.query().with('renderable').executeEntities();

// Check specific entity
const entity = game.world.getEntity('some-id');
const renderable = entity.getComponent('renderable');
console.log('Size:', renderable.sizeMultiplier);
console.log('Alpha:', renderable.alpha);

// Find entities with custom size
const scaled = renderables.filter(e => {
  const r = e.getComponent('renderable');
  return r.sizeMultiplier !== undefined && r.sizeMultiplier !== 1.0;
});
```

## API Reference

### Renderer

```typescript
class Renderer {
  constructor(canvas: HTMLCanvasElement, world: World);

  // Main render loop
  render(world: World, camera: Camera): void;

  // Clear canvas
  clear(): void;

  // Resize canvas
  resize(width: number, height: number): void;
}
```

### Visual Systems

```typescript
interface VisualSystem extends System {
  id: string;
  priority: 300;  // Always run at priority 300
  requiredComponents: readonly string[];

  update(world: World, entities: readonly Entity[], deltaTime: number): void;
}
```

### RenderableComponent

```typescript
interface RenderableComponent extends Component {
  type: 'renderable';
  spriteId: string;
  layer: RenderLayer;
  visible: boolean;
  animationState?: string;
  tint?: string;
  sizeMultiplier?: number;  // 0.1 to 10.0, default 1.0
  alpha?: number;           // 0.0 to 1.0, default 1.0
}
```

## Related Documentation

- [Visual Metadata Standardization Spec](../../openspec/specs/rendering-system/visual-metadata-standardization.md)
- [Production Rendering](./src/production/README.md) - High-quality rendering for TV/movies
- [ECS Architecture](../../ARCHITECTURE_OVERVIEW.md)
- [Systems Catalog](../../SYSTEMS_CATALOG.md)

## Migration Notes

### Upgrading from Pre-2026-01 Renderer

If you have old code that passes metadata to `renderSprite`:

```typescript
// ❌ OLD: Passing metadata to renderer
spriteRenderer.renderSprite(spriteId, x, y, size, ctx, direction, animationState, {
  stage: plant.stage,
});

// ✅ NEW: Visual system computes size/alpha beforehand
// No changes needed - visual systems handle it automatically
spriteRenderer.renderSprite(spriteId, x, y, size, ctx, direction, animationState);
```

Component saves are automatically migrated from v1 to v2 on load.
