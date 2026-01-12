# Renderer Overlays

Canvas-based overlay rendering for debug information and visual indicators. Extracted from Renderer.ts for maintainability.

## Components

### DebugOverlay

Renders debug information and city boundaries.

**Methods**:
- `drawCityBoundaries(world, camera, tileSize)` - Golden dashed borders around city territories with labels
- `drawDebugInfo(world, camera)` - Top-left panel showing tick, time, camera position, view mode, chunk count, entity count, seed

**Configuration**:
- `showCityBounds: boolean` - Toggle city boundary rendering (default: true)

### InteractionOverlay

Renders agent-building interactions and navigation paths.

**Methods**:
- `drawAgentBuildingInteractions(world, camera, tileSize, selectedEntity?)` - Dashed lines between agents and nearby buildings with interaction labels (WARMTH, SHELTER, BUILDING)
- `drawNavigationPath(world, camera, tileSize, selectedEntity?)` - Cyan dashed line from selected agent to target destination with circle+cross marker

**Interaction Detection**:
- Radius: 2.0 tiles
- Types: Warmth (campfire, cold agents, #FF6600), Shelter (bed/bedroll, #00AAFF), Construction (incomplete buildings, #FFAA00)
- Navigation: Checks steering component target, falls back to action_queue targetPos

## Usage

```typescript
import { DebugOverlay, InteractionOverlay } from './overlays/index.js';

const debugOverlay = new DebugOverlay(ctx, chunkManager, terrainGenerator);
const interactionOverlay = new InteractionOverlay(ctx);

// Each frame
debugOverlay.drawCityBoundaries(world, camera, tileSize);
debugOverlay.drawDebugInfo(world, camera);
interactionOverlay.drawAgentBuildingInteractions(world, camera, tileSize, selectedEntity);
interactionOverlay.drawNavigationPath(world, camera, tileSize, selectedEntity);
```

## Implementation Notes

- All overlays use canvas 2D context, zoom-adaptive sizing
- Uses `ctx.setLineDash()` for visual distinction (reset after use)
- Text labels have semi-transparent backgrounds for readability
- Navigation path detection tries multiple sources (steering, action queue) for robustness
