# Work Order: Renderer Decomposition

**Phase:** Infrastructure (Maintainability)
**Created:** 2025-12-26
**Priority:** MEDIUM
**Status:** READY_FOR_IMPLEMENTATION

---

## Problem Statement

`Renderer.ts` is **1234 lines** with **103 functions**, handling:
- Canvas setup and resize
- Terrain/chunk rendering
- Entity rendering (agents, animals, plants, buildings)
- UI overlays (health bars, labels, behaviors)
- Debug information
- Speech bubbles and floating text
- Particle effects

This violates Single Responsibility Principle and makes changes risky.

---

## Current Structure Analysis

```
Renderer.ts (1234 lines)
├── Canvas Management (lines 1-100)
│   ├── constructor, resize, getContext
│   └── camera management
├── Main Render Loop (lines 100-530)
│   ├── render() - orchestrator
│   ├── renderChunk() - terrain tiles
│   └── entity iteration
├── Entity Rendering (lines 530-1000)
│   ├── renderSpeechBubbles()
│   ├── drawBuildingLabel()
│   ├── drawConstructionProgress()
│   ├── drawResourceAmount()
│   ├── drawSleepingIndicator()
│   ├── drawReflectionIndicator()
│   ├── drawAgentBehavior()
│   ├── drawAnimalState()
│   └── drawAgentBuildingInteractions()
└── Debug (lines 1000-1234)
    ├── drawInteractionIndicator()
    └── drawDebugInfo()
```

---

## Proposed Architecture

```
packages/renderer/src/
├── Renderer.ts                    # Thin orchestrator (~200 lines)
├── renderers/
│   ├── TerrainRenderer.ts         # Chunk/tile rendering
│   ├── EntityRenderer.ts          # Base entity rendering
│   ├── AgentRenderer.ts           # Agent-specific (behavior, sleep, reflection)
│   ├── AnimalRenderer.ts          # Animal-specific (state, needs)
│   ├── BuildingRenderer.ts        # Buildings (labels, progress, resources)
│   └── PlantRenderer.ts           # Plant rendering
├── overlays/
│   ├── DebugOverlay.ts            # Debug info, FPS, entity counts
│   ├── InteractionOverlay.ts      # Building interactions, highlights
│   └── TemperatureOverlay.ts      # Temperature visualization
└── effects/
    ├── FloatingTextRenderer.ts    # Already extracted
    ├── SpeechBubbleRenderer.ts    # Already extracted
    └── ParticleRenderer.ts        # Already extracted
```

---

## Extraction Plan

### Phase 1: Extract Entity Renderers

**TerrainRenderer.ts** (~150 lines)
```typescript
export class TerrainRenderer {
  constructor(private ctx: CanvasRenderingContext2D) {}

  renderChunk(chunk: Chunk, camera: Camera, tileSize: number): void {
    // Extract renderChunk() logic
  }

  private getTileColor(tile: Tile): string { ... }
  private renderTilledOverlay(x: number, y: number): void { ... }
}
```

**AgentRenderer.ts** (~200 lines)
```typescript
export class AgentRenderer {
  constructor(private ctx: CanvasRenderingContext2D) {}

  render(entity: Entity, screenX: number, screenY: number, world: World): void {
    this.drawSprite(entity, screenX, screenY);
    this.drawBehaviorLabel(entity, screenX, screenY);
    this.drawSleepingIndicator(entity, screenX, screenY);
    this.drawReflectionIndicator(entity, screenX, screenY);
  }

  private drawBehaviorLabel(...) { ... }
  private drawSleepingIndicator(...) { ... }
  private drawReflectionIndicator(...) { ... }
}
```

**BuildingRenderer.ts** (~150 lines)
```typescript
export class BuildingRenderer {
  constructor(private ctx: CanvasRenderingContext2D) {}

  render(entity: Entity, screenX: number, screenY: number): void {
    this.drawBuilding(entity, screenX, screenY);
    this.drawLabel(entity, screenX, screenY);
    this.drawConstructionProgress(entity, screenX, screenY);
    this.drawResourceAmount(entity, screenX, screenY);
  }
}
```

### Phase 2: Extract Overlays

**DebugOverlay.ts** (~100 lines)
```typescript
export class DebugOverlay {
  render(ctx: CanvasRenderingContext2D, world: World, fps: number): void {
    this.drawFPS(fps);
    this.drawEntityCounts(world);
    this.drawMousePosition();
  }
}
```

### Phase 3: Thin Orchestrator

**Renderer.ts** (~200 lines)
```typescript
export class Renderer {
  private terrain: TerrainRenderer;
  private agents: AgentRenderer;
  private animals: AnimalRenderer;
  private buildings: BuildingRenderer;
  private debug: DebugOverlay;

  render(world: World): void {
    this.clear();
    this.terrain.render(visibleChunks, this.camera);

    for (const entity of visibleEntities) {
      if (entity.hasComponent('agent')) {
        this.agents.render(entity, screenX, screenY, world);
      } else if (entity.hasComponent('animal')) {
        this.animals.render(entity, screenX, screenY, world);
      } else if (entity.hasComponent('building')) {
        this.buildings.render(entity, screenX, screenY);
      }
    }

    if (this.showDebug) {
      this.debug.render(this.ctx, world, this.fps);
    }
  }
}
```

---

## Acceptance Criteria

### Criterion 1: Entity Renderers Extracted
- TerrainRenderer, AgentRenderer, AnimalRenderer, BuildingRenderer, PlantRenderer exist
- Each is <300 lines
- **Verification:** `wc -l` on each file

### Criterion 2: Renderer.ts is Thin
- Renderer.ts < 300 lines
- Only orchestration logic, no drawing code
- **Verification:** `wc -l packages/renderer/src/Renderer.ts`

### Criterion 3: No Functional Regression
- All entities render correctly
- Debug overlay works
- Temperature overlay works
- **Verification:** Visual playtest

### Criterion 4: Tests Updated
- Existing Renderer tests pass
- New renderer classes have unit tests
- **Verification:** `npm test`

---

## Files to Create

- `renderers/TerrainRenderer.ts`
- `renderers/AgentRenderer.ts`
- `renderers/AnimalRenderer.ts`
- `renderers/BuildingRenderer.ts`
- `renderers/PlantRenderer.ts`
- `overlays/DebugOverlay.ts`
- `overlays/InteractionOverlay.ts`

## Files to Modify

- `Renderer.ts` - Becomes thin orchestrator
- `index.ts` - Export new renderers

---

## Migration Strategy

1. **Create TerrainRenderer** - Move `renderChunk()` and tile logic
2. **Create BuildingRenderer** - Move building-specific drawing
3. **Create AgentRenderer** - Move agent overlays (behavior, sleep, reflection)
4. **Create AnimalRenderer** - Move animal state drawing
5. **Create DebugOverlay** - Move debug info
6. **Refactor Renderer** - Use composition, remove extracted code
7. **Test each step** - Visual verification + unit tests

---

## Notes for Implementation Agent

1. **Start with TerrainRenderer** - Most isolated, easy first extraction
2. **Keep render order** - Terrain → Entities → Overlays → Effects
3. **Pass ctx as dependency** - Renderers receive context, don't store canvas
4. **Extract one at a time** - Verify after each extraction
5. **Don't optimize yet** - Pure extraction first, performance later

---

## Success Metrics

- ✅ Renderer.ts < 300 lines
- ✅ Each sub-renderer < 300 lines
- ✅ All visual rendering unchanged
- ✅ Tests pass
- ✅ Build passes

---

**Estimated Complexity:** MEDIUM
**Estimated Time:** 4-6 hours
**Priority:** MEDIUM
