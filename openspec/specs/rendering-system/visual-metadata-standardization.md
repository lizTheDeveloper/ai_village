# Visual Metadata Standardization - Specification

**Created:** 2026-01-04
**Status:** Draft
**Version:** 0.1.0
**Related:** `rendering-system/spec.md`

---

## Overview

This specification defines a standardized interface for rendering objects with varying visual properties (size, opacity, etc.) that derive from different sources:

- **Plants**: Size/opacity from growth stage + genetics (matureHeight)
- **Animals**: Size from species genetics + life stage + individual variation
- **Items**: Size from item properties (clothing sizes, tool variants)
- **Agents**: Size from appearance genetics (height, build)

**Current Problem:**
- Plant rendering passes ad-hoc `metadata` parameter with stage info
- Animal `size` component field exists but is completely unused
- Items have no size variation capability
- Agent appearance height is stored but not applied to rendering
- Renderer must know about domain-specific details (what is a "plant stage"?)

**Solution:**
Extend `RenderableComponent` with standardized visual metadata fields that are computed by specialized systems and consumed uniformly by the renderer.

---

## Design Principles

1. **Separation of Concerns**: Renderer knows about pixels, systems know about genetics/stages/properties
2. **ECS Pattern**: Use components + systems, not methods on entities
3. **Declarative Metadata**: Visual properties are data in components, not computed during rendering
4. **Extensibility**: New object types add their own visuals system without modifying renderer
5. **Backward Compatibility**: Changes must support existing save files via migration

---

## Component Changes

### REQ-VMS-001: Extend RenderableComponent

Add two optional fields to `RenderableComponent`:

```typescript
export interface RenderableComponent extends Component {
  type: 'renderable';
  spriteId: string;
  layer: RenderLayer;
  visible: boolean;
  animationState?: string;
  tint?: string;                // Existing: Hex color for tinting

  // NEW FIELDS:
  sizeMultiplier?: number;      // Visual scale factor (default: 1.0)
  alpha?: number;               // Opacity 0.0-1.0 (default: 1.0)
}
```

**Field Semantics:**

- **`sizeMultiplier`**:
  - Multiplies the base tile size during rendering
  - Range: 0.1 - 10.0 (clamped by renderer)
  - Default: 1.0 (normal size)
  - Examples:
    - Plant seed: 0.2 (20% of tile size)
    - Mature tree: 2.0 (200% of tile size)
    - Small clothing: 1.0 (same visual size regardless of S/M/L)
    - Giant animal: 1.5 (150% of tile size)

- **`alpha`**:
  - Opacity for rendering
  - Range: 0.0 (transparent) - 1.0 (opaque)
  - Default: 1.0 (fully opaque)
  - Examples:
    - Dying plant: 0.3 (ghostly/faded)
    - Ghost entity: 0.5 (semi-transparent)
    - Normal entity: 1.0 (fully visible)

**Schema Update:**

```typescript
export const RenderableComponentSchema: ComponentSchema<RenderableComponent> = {
  type: 'renderable',
  version: 2,  // Increment version for migration
  fields: [
    { name: 'spriteId', type: 'string', required: true },
    { name: 'layer', type: 'string', required: true, default: 'object' },
    { name: 'visible', type: 'boolean', required: true, default: true },
    { name: 'animationState', type: 'string', required: false },
    { name: 'tint', type: 'string', required: false },
    { name: 'sizeMultiplier', type: 'number', required: false, default: 1.0 },
    { name: 'alpha', type: 'number', required: false, default: 1.0 },
  ],
  validate: (data: unknown): data is RenderableComponent => {
    const d = data as any;
    const valid = (
      d &&
      d.type === 'renderable' &&
      typeof d.spriteId === 'string' &&
      typeof d.layer === 'string' &&
      typeof d.visible === 'boolean'
    );

    if (!valid) return false;

    // Validate optional fields if present
    if (d.sizeMultiplier !== undefined) {
      if (typeof d.sizeMultiplier !== 'number' || d.sizeMultiplier < 0.1 || d.sizeMultiplier > 10) {
        throw new RangeError(`Invalid sizeMultiplier: ${d.sizeMultiplier} (must be 0.1-10.0)`);
      }
    }

    if (d.alpha !== undefined) {
      if (typeof d.alpha !== 'number' || d.alpha < 0 || d.alpha > 1) {
        throw new RangeError(`Invalid alpha: ${d.alpha} (must be 0.0-1.0)`);
      }
    }

    return true;
  },
  createDefault: () => createRenderableComponent('default'),
};
```

**File Location:** `packages/core/src/components/RenderableComponent.ts`

---

## Serialization Changes

### REQ-VMS-002: Component Serialization

Update the component serializer to handle new fields:

**Serialization (Save):**

```typescript
// In packages/core/src/serialization/ComponentSerializer.ts

function serializeRenderableComponent(component: RenderableComponent): SerializedComponent {
  return {
    type: 'renderable',
    version: 2,
    data: {
      spriteId: component.spriteId,
      layer: component.layer,
      visible: component.visible,
      ...(component.animationState && { animationState: component.animationState }),
      ...(component.tint && { tint: component.tint }),
      ...(component.sizeMultiplier !== undefined && { sizeMultiplier: component.sizeMultiplier }),
      ...(component.alpha !== undefined && { alpha: component.alpha }),
    },
  };
}
```

**Deserialization (Load):**

```typescript
function deserializeRenderableComponent(data: SerializedComponent): RenderableComponent {
  if (data.version === 1) {
    // Migration from v1: add default values for new fields
    return {
      type: 'renderable',
      version: 2,
      spriteId: data.data.spriteId,
      layer: data.data.layer,
      visible: data.data.visible,
      animationState: data.data.animationState,
      tint: data.data.tint,
      sizeMultiplier: 1.0,  // Default for v1 components
      alpha: 1.0,           // Default for v1 components
    };
  }

  // v2: deserialize normally
  return {
    type: 'renderable',
    version: 2,
    spriteId: data.data.spriteId,
    layer: data.data.layer,
    visible: data.data.visible,
    animationState: data.data.animationState,
    tint: data.data.tint,
    sizeMultiplier: data.data.sizeMultiplier ?? 1.0,
    alpha: data.data.alpha ?? 1.0,
  };
}
```

**File Location:** `packages/core/src/serialization/ComponentSerializer.ts`

**Migration Strategy:**
- Old saves (version 1) automatically get default values (1.0 for both fields)
- New saves (version 2) include the fields if non-default
- Visual systems will immediately compute correct values on first update after load

---

## System Implementations

### REQ-VMS-003: PlantVisualsSystem

Create a system that computes visual metadata for plants based on their growth stage and genetics.

**System Configuration:**
- **Priority**: 300 (runs after PlantGrowthSystem at 200)
- **Execution Group**: 'visual_updates'
- **Location**: `packages/world/src/systems/PlantVisualsSystem.ts`

**Query:**
```typescript
query = world.query()
  .with('plant')
  .with('renderable')
  .executeEntities();
```

**Size Calculation Logic:**

```typescript
function calculatePlantSizeMultiplier(plant: PlantComponent): number {
  // Base size from growth stage
  const stageSizeMap: Record<PlantStage, number> = {
    'seed': 0.2,
    'germinating': 0.3,
    'sprout': 0.5,
    'vegetative': 0.75,
    'flowering': 1.0,
    'fruiting': 1.0,
    'mature': 1.0,
    'seeding': 1.0,
    'senescence': 0.9,
    'decay': 0.6,
    'dead': 0.3,
  };

  let sizeMultiplier = stageSizeMap[plant.stage];

  // Apply genetics if present and mature
  if (plant.genetics?.matureHeight &&
      ['flowering', 'fruiting', 'mature', 'seeding'].includes(plant.stage)) {
    // matureHeight is in voxels (tiles), convert to multiplier
    // Normal plant = 1 tile = 1.0 multiplier
    // Tall plant = 2 tiles = 2.0 multiplier
    const geneticMultiplier = plant.genetics.matureHeight;
    sizeMultiplier *= geneticMultiplier;
  }

  // Clamp to reasonable bounds
  return Math.max(0.1, Math.min(10.0, sizeMultiplier));
}

function calculatePlantAlpha(plant: PlantComponent): number {
  const stageAlphaMap: Record<PlantStage, number> = {
    'seed': 1.0,
    'germinating': 1.0,
    'sprout': 1.0,
    'vegetative': 1.0,
    'flowering': 1.0,
    'fruiting': 1.0,
    'mature': 1.0,
    'seeding': 0.9,      // Slightly faded
    'senescence': 0.7,   // Dying
    'decay': 0.5,        // Rotting
    'dead': 0.3,         // Ghost
  };

  return stageAlphaMap[plant.stage];
}
```

**Update Logic:**

```typescript
export class PlantVisualsSystem extends System {
  public name = 'PlantVisualsSystem';

  public update(world: World, deltaTime: number): void {
    const entities = world.query()
      .with('plant')
      .with('renderable')
      .executeEntities();

    for (const entity of entities) {
      const plant = entity.getComponent('plant') as PlantComponent;
      const renderable = entity.getComponent('renderable') as RenderableComponent;

      const newSize = calculatePlantSizeMultiplier(plant);
      const newAlpha = calculatePlantAlpha(plant);

      // Only update if changed (avoid unnecessary mutations)
      if (renderable.sizeMultiplier !== newSize || renderable.alpha !== newAlpha) {
        renderable.sizeMultiplier = newSize;
        renderable.alpha = newAlpha;
      }
    }
  }
}
```

---

### REQ-VMS-004: AnimalVisualsSystem

Create a system that computes visual metadata for animals based on their size component and genetics.

**System Configuration:**
- **Priority**: 301 (runs after AnimalGrowthSystem)
- **Execution Group**: 'visual_updates'
- **Location**: `packages/world/src/systems/AnimalVisualsSystem.ts`

**Query:**
```typescript
query = world.query()
  .with('animal')
  .with('renderable')
  .executeEntities();
```

**Size Calculation Logic:**

```typescript
function calculateAnimalSizeMultiplier(animal: AnimalComponent, genetic?: GeneticComponent): number {
  // Use the animal's size field (which may already factor in genetics + age)
  let sizeMultiplier = animal.size ?? 1.0;

  // Optionally apply genetic height variations if present
  if (genetic?.genome) {
    const heightGene = genetic.genome.find(allele => allele.trait === 'height');
    if (heightGene) {
      // Height gene values might be 0.8-1.2 (80%-120% of species average)
      const heightFactor = heightGene.value ?? 1.0;
      sizeMultiplier *= heightFactor;
    }
  }

  // Clamp to reasonable bounds
  return Math.max(0.1, Math.min(10.0, sizeMultiplier));
}

function calculateAnimalAlpha(animal: AnimalComponent): number {
  // Most animals are fully opaque
  // Could add logic for dying animals, ghosts, etc.
  return 1.0;
}
```

**Update Logic:**

```typescript
export class AnimalVisualsSystem extends System {
  public name = 'AnimalVisualsSystem';

  public update(world: World, deltaTime: number): void {
    const entities = world.query()
      .with('animal')
      .with('renderable')
      .executeEntities();

    for (const entity of entities) {
      const animal = entity.getComponent('animal') as AnimalComponent;
      const genetic = entity.getComponent('genetic') as GeneticComponent | undefined;
      const renderable = entity.getComponent('renderable') as RenderableComponent;

      const newSize = calculateAnimalSizeMultiplier(animal, genetic);
      const newAlpha = calculateAnimalAlpha(animal);

      if (renderable.sizeMultiplier !== newSize || renderable.alpha !== newAlpha) {
        renderable.sizeMultiplier = newSize;
        renderable.alpha = newAlpha;
      }
    }
  }
}
```

---

### REQ-VMS-005: AgentVisualsSystem (Future)

Create a system that applies agent appearance genetics to visual metadata.

**System Configuration:**
- **Priority**: 302
- **Execution Group**: 'visual_updates'
- **Location**: `packages/core/src/systems/AgentVisualsSystem.ts`

**Query:**
```typescript
query = world.query()
  .with('agent')
  .with('appearance')
  .with('renderable')
  .executeEntities();
```

**Size Calculation Logic:**

```typescript
function calculateAgentSizeMultiplier(appearance: AppearanceComponent): number {
  // appearance.height is in cm variation from species average
  // Range: -15 to +15 cm (approximately)
  // Convert to multiplier: 0cm = 1.0, +15cm = 1.1, -15cm = 0.9
  const heightVariation = appearance.height ?? 0;
  const multiplier = 1.0 + (heightVariation / 150); // +15cm = +0.1, -15cm = -0.1

  // Build might also affect perceived size
  const buildMultipliers: Record<string, number> = {
    'slim': 0.95,
    'average': 1.0,
    'stocky': 1.05,
    'muscular': 1.1,
  };

  const buildFactor = buildMultipliers[appearance.build ?? 'average'] ?? 1.0;

  return Math.max(0.8, Math.min(1.2, multiplier * buildFactor));
}
```

**Note:** This system is marked as future work. Currently, agents are rendered at standard size.

---

### REQ-VMS-006: ItemVisualsSystem (Future)

Create a system that applies item properties to visual metadata.

**Example Use Case:**
- T-shirts have size property ('S', 'M', 'L', 'XL') but render at same visual size
- Tools might have "worn" condition that affects alpha
- Magical items might pulse (animated sizeMultiplier)

**System Configuration:**
- **Priority**: 303
- **Execution Group**: 'visual_updates'
- **Location**: `packages/core/src/systems/ItemVisualsSystem.ts`

**Current Behavior:**
Items always render at `sizeMultiplier: 1.0` and `alpha: 1.0` (defaults).

**Future Enhancement:**
Could add visual wear/tear, rarity glows, etc.

---

## Renderer Changes

### REQ-VMS-007: Update Renderer to Use Visual Metadata

Modify the renderer to read `sizeMultiplier` and `alpha` from `RenderableComponent` instead of computing them from metadata.

**Current Code (Renderer.ts:787-792):**

```typescript
// ❌ OLD: Ad-hoc metadata extraction
const plant = entity.components.get('plant') as PlantComponent | undefined;
const metadata = plant ? { stage: plant.stage } : undefined;

const baseSize = this.tileSize * this.camera.zoom;
const scaledSize = baseSize * parallaxScale;
```

**New Code:**

```typescript
// ✅ NEW: Read from renderable component
const baseSize = this.tileSize * this.camera.zoom;
const renderable = entity.getComponent('renderable') as RenderableComponent;

// Apply visual metadata
const sizeMultiplier = renderable.sizeMultiplier ?? 1.0;
const alpha = renderable.alpha ?? 1.0;
const scaledSize = baseSize * parallaxScale * sizeMultiplier;
```

**Rendering Logic:**

```typescript
// In Renderer.ts renderEntity method
private renderEntity(entity: Entity, renderable: RenderableComponent, parallaxScale: number): void {
  const position = entity.getComponent('position') as PositionComponent;

  const screen = this.worldToScreen(position.x, position.y);
  const offsetX = (this.tileSize * this.camera.zoom) / 2;
  const offsetY = (this.tileSize * this.camera.zoom) / 2;

  const baseSize = this.tileSize * this.camera.zoom;
  const sizeMultiplier = renderable.sizeMultiplier ?? 1.0;
  const alpha = renderable.alpha ?? 1.0;
  const scaledSize = baseSize * parallaxScale * sizeMultiplier;

  // Apply alpha to context
  const previousAlpha = this.ctx.globalAlpha;
  this.ctx.globalAlpha = alpha;

  // Render sprite
  if (!this.renderPixelLabEntity(entity, screen.x - offsetX, screen.y - offsetY, scaledSize)) {
    renderSprite(
      this.ctx,
      renderable.spriteId,
      screen.x - offsetX,
      screen.y - offsetY,
      scaledSize
      // No metadata parameter needed anymore!
    );
  }

  // Restore alpha
  this.ctx.globalAlpha = previousAlpha;
}
```

**File Location:** `packages/renderer/src/Renderer.ts`

---

### REQ-VMS-008: Remove Metadata Parameter from SpriteRenderer

Update `SpriteRenderer.ts` to remove the metadata-based size calculation.

**Current Code (SpriteRenderer.ts:394-445):**

```typescript
// ❌ OLD: Stage-based size calculation in renderer
function renderPlantSprite(ctx, spriteId, x, y, size, metadata) {
  const stage = metadata?.stage ?? 'mature';
  let sizeMultiplier = 1.0;
  switch (stage) {
    case 'seed': sizeMultiplier = 0.2; break;
    case 'sprout': sizeMultiplier = 0.5; break;
    // ... etc
  }
  const scaledSize = size * sizeMultiplier;
  // ... render with scaledSize
}
```

**New Code:**

```typescript
// ✅ NEW: Size already scaled by renderer
function renderPlantSprite(ctx, spriteId, x, y, size) {
  // Size already includes sizeMultiplier from renderable component
  // Just render at the given size
  // ... render with size
}
```

**Signature Changes:**

```typescript
// Old signature:
export function renderSprite(
  ctx: CanvasRenderingContext2D,
  spriteId: string,
  x: number,
  y: number,
  size: number,
  metadata?: { stage?: PlantStage }  // ❌ Remove this
): void;

// New signature:
export function renderSprite(
  ctx: CanvasRenderingContext2D,
  spriteId: string,
  x: number,
  y: number,
  size: number  // Size is already scaled
): void;
```

**File Location:** `packages/renderer/src/SpriteRenderer.ts`

---

## System Registration

### REQ-VMS-009: Register Visual Systems

Add the new systems to the appropriate system groups.

**File:** `packages/core/src/ecs/SystemRegistry.ts` or game initialization

```typescript
// Visual updates run after game logic but before rendering
const visualUpdateGroup = new SystemGroup('visual_updates', 3000);
visualUpdateGroup.addSystem(new PlantVisualsSystem(), 300);
visualUpdateGroup.addSystem(new AnimalVisualsSystem(), 301);
// visualUpdateGroup.addSystem(new AgentVisualsSystem(), 302);  // Future
// visualUpdateGroup.addSystem(new ItemVisualsSystem(), 303);   // Future

world.addSystemGroup(visualUpdateGroup);
```

**Execution Order:**

1. Game logic systems (priorities 0-1000)
2. Growth systems (priorities 1000-2000)
3. **Visual update systems (priorities 3000-3999)**
4. Rendering (priority 10000+)

This ensures visual metadata is always up-to-date before rendering.

---

## Migration and Testing

### REQ-VMS-010: Save File Migration

**Migration Steps:**

1. Load old save file (renderable components at version 1)
2. Deserializer detects version 1, adds default values
3. Visual systems run on first update, compute correct values
4. Save file is written with version 2 components

**Compatibility:**

- ✅ Old saves load correctly (default values applied)
- ✅ New saves have explicit metadata
- ✅ No data loss during migration

### REQ-VMS-011: Testing Checklist

**Component Tests:**
- [ ] Serialize renderable v2 with sizeMultiplier and alpha
- [ ] Deserialize renderable v2 correctly
- [ ] Migrate renderable v1 to v2 with defaults
- [ ] Validate sizeMultiplier range (0.1-10.0)
- [ ] Validate alpha range (0.0-1.0)

**System Tests:**
- [ ] PlantVisualsSystem sets size based on stage
- [ ] PlantVisualsSystem applies genetics matureHeight
- [ ] PlantVisualsSystem sets alpha based on stage
- [ ] AnimalVisualsSystem uses animal.size field
- [ ] Visual systems only update when values change

**Renderer Tests:**
- [ ] Renderer applies sizeMultiplier correctly
- [ ] Renderer applies alpha correctly
- [ ] Plant seed renders at 20% size
- [ ] Mature tree with matureHeight=2.0 renders at 200% size
- [ ] Dying plant renders semi-transparent
- [ ] Items render at default 100% size

**Integration Tests:**
- [ ] Load old save, verify migration, verify rendering
- [ ] Create new save, verify v2 serialization
- [ ] Plant grows from seed to mature, size animates smoothly
- [ ] Animal sizes vary based on genetics

---

## Performance Considerations

### REQ-VMS-012: Visual System Performance

**Optimization Strategies:**

1. **Dirty Tracking**: Only update renderable when plant/animal state changes
2. **Cached Queries**: Visual systems cache their queries
3. **Batch Updates**: Update in single pass per frame
4. **Skip Hidden Entities**: Don't update if `renderable.visible === false`

**Expected Impact:**

- Visual systems run at 3000-3999 priority (after game logic, before rendering)
- Adds ~0.1-0.5ms per frame for 1000 entities
- Negligible compared to renderer (which runs every frame anyway)

---

## Examples

### Example 1: Plant Lifecycle

```typescript
// Plant spawned as seed
entity.addComponent({
  type: 'plant',
  species: 'wheat',
  stage: 'seed',
  genetics: { matureHeight: 1.5 }, // 50% taller than normal
});

entity.addComponent({
  type: 'renderable',
  spriteId: 'wheat',
  layer: 'object',
  visible: true,
  // sizeMultiplier and alpha will be set by PlantVisualsSystem
});

// Frame 1: PlantVisualsSystem runs
// renderable.sizeMultiplier = 0.2 (seed stage)
// renderable.alpha = 1.0

// Frame N: Plant grows to mature
// PlantGrowthSystem changes stage to 'mature'
// PlantVisualsSystem runs:
//   - Base size for mature = 1.0
//   - Apply genetics: 1.0 * 1.5 = 1.5
//   - renderable.sizeMultiplier = 1.5 (150% size)
//   - renderable.alpha = 1.0

// Frame M: Plant dies
// PlantGrowthSystem changes stage to 'dead'
// PlantVisualsSystem runs:
//   - renderable.sizeMultiplier = 0.3 (shriveled)
//   - renderable.alpha = 0.3 (ghostly)
```

### Example 2: Animal Variations

```typescript
// Small rabbit
entity.addComponent({
  type: 'animal',
  speciesId: 'rabbit',
  size: 0.8, // 80% of normal rabbit size
});

entity.addComponent({
  type: 'renderable',
  spriteId: 'rabbit',
  layer: 'entity',
  visible: true,
});

// Frame 1: AnimalVisualsSystem runs
// renderable.sizeMultiplier = 0.8 (from animal.size)
// renderable.alpha = 1.0

// Renderer: draws rabbit at 80% scale
```

### Example 3: T-Shirt Item

```typescript
// T-shirt (size L but renders same as all sizes)
entity.addComponent({
  type: 'resource',
  resourceType: 'tshirt',
  amount: 1,
  properties: { size: 'L' }, // Game property, not visual
});

entity.addComponent({
  type: 'renderable',
  spriteId: 'tshirt',
  layer: 'object',
  visible: true,
  // No visual system sets these, so defaults apply:
  // sizeMultiplier = 1.0 (default)
  // alpha = 1.0 (default)
});

// All t-shirts render at same visual size regardless of S/M/L property
```

---

## Open Questions

1. **Should items have visual size variation?**
   - Pro: More visual diversity
   - Con: Clutters inventory UI
   - Decision: Not initially, can add ItemVisualsSystem later

2. **Should agents scale with height genetics?**
   - Pro: More realistic
   - Con: Harder to distinguish characters at small sizes
   - Decision: Add AgentVisualsSystem as future enhancement

3. **How to handle animated size changes (pulsing, breathing)?**
   - Option A: Systems update sizeMultiplier every frame (expensive)
   - Option B: Add `sizeAnimation` field to renderable (renderer handles)
   - Decision: Defer to future, use Option A for now if needed

4. **Should sizeMultiplier affect collision bounds?**
   - Current: No, PhysicsComponent has separate width/height
   - Alternative: Link renderable size to physics
   - Decision: Keep separate, collision is gameplay-critical

---

## Related Specifications

- `rendering-system/spec.md` - Main rendering system specification
- `agent-system/spec.md` - Agent appearance and genetics
- `animal-system/spec.md` - Animal species and life stages
- `botany-system/spec.md` - Plant growth and genetics
- `items-system/spec.md` - Item properties and variants

---

## Implementation Checklist

- [ ] Update RenderableComponent interface and schema
- [ ] Update component serializer for version 2
- [ ] Implement PlantVisualsSystem
- [ ] Implement AnimalVisualsSystem
- [ ] Update Renderer to use sizeMultiplier and alpha
- [ ] Update SpriteRenderer to remove metadata parameter
- [ ] Register visual systems in SystemRegistry
- [ ] Write unit tests for components
- [ ] Write unit tests for systems
- [ ] Write integration tests for rendering
- [ ] Test save/load migration
- [ ] Update documentation
- [ ] Performance profiling (ensure <0.5ms overhead)

---

## Version History

- **0.1.0** (2026-01-04): Initial draft
