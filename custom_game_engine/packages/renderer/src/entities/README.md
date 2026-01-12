# Entity Renderers

Specialized canvas renderers for entity overlays (labels, indicators, progress bars). Extracted from monolithic `Renderer.ts` for maintainability.

## Renderers

**AgentRenderer**: Agent overlays (sleep indicators, reflection bubbles, behavior labels)
- `drawSleepingIndicator()`: Animated floating Z's above sleeping agents
- `drawReflectionIndicator()`: Pulsing thought bubble for reflecting agents
- `drawAgentBehavior()`: Behavior label with contextual text (gathering, building, etc.)

**AnimalRenderer**: Animal state overlays
- `drawAnimalState()`: State label with emoji indicators, color-coded for wild (orange) vs tamed (green)

**BuildingRenderer**: Building overlays and progress tracking
- `drawBuildingLabel()`: Building type label above sprite
- `drawConstructionProgress()`: Progress bar (0-100%) with color gradient
- `drawResourceAmount()`: Resource depletion bar for harvestable entities (trees, rocks)

## Usage

```typescript
import { AgentRenderer, AnimalRenderer, BuildingRenderer } from './entities';

const agentRenderer = new AgentRenderer(ctx, tileSize, camera);
agentRenderer.drawAgentBehavior(x, y, 'gather', { resourceType: 'wood' });

const buildingRenderer = new BuildingRenderer(ctx);
buildingRenderer.drawConstructionProgress(x, y, 75, tileSize, zoom);
```

## Design

- All renderers accept `ctx` (CanvasRenderingContext2D) in constructor
- Zoom-aware: Hide/scale elements at `zoom < 0.5`
- Context state reset: Always restore `textAlign`, `textBaseline` after drawing
- Position conventions: Labels above sprite (`screenY - offset`), bars below (`screenY + tileSize + offset`)
