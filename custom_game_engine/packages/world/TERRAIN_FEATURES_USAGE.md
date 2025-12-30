# Terrain Feature Detection - Usage Guide

The Terrain Feature Analyzer automatically detects and describes terrain features like cliffs, mountains, lakes, and valleys for LLM agent perception.

## Research Foundation

Based on peer-reviewed geomorphometry research:

- **[Terrain Feature Detection 2024](https://www.tandfonline.com/doi/full/10.1080/10106049.2024.2351904)** - Contour-based critical point detection
- **[Deep Learning Terrain Classification 2023](https://www.sciencedirect.com/science/article/pii/S1569843223000717)** - Modern DEM classification
- **[Geomorphometry Methods 2022](https://www.researchgate.net/publication/363655877)** - Comprehensive terrain analysis techniques
- **[Digital Terrain Analysis Guide](https://www.opengeomatics.ca/raster-analysis-and-terrain-modelling.html)** - TPI and curvature methods
- **[US Army FM 3-25.26](https://rdl.train.army.mil/catalog-ws/view/100.atsc/0e47612a-f13b-4be2-aa41-3e886a40b88c-1335953260245/report.pdf)** - Military terrain feature definitions

## Quick Start

```typescript
import { globalTerrainAnalyzer } from '@ai-village/world';

// Analyze terrain around agent position
const features = globalTerrainAnalyzer.analyzeArea(
  (x, y) => world.getTileAt(x, y),  // Tile accessor
  agentX,                            // Agent X position
  agentY,                            // Agent Y position
  20                                 // Search radius in tiles
);

// Get natural language description for LLM
const description = globalTerrainAnalyzer.describeNearby(
  features,
  agentX,
  agentY,
  20  // Max distance to describe
);

console.log(description);
// Output: "You are near: Steep cliff (35.2° slope). To the north: Mountain peak (elevation 12) (15 tiles). To the east: Lake (45 tiles) (18 tiles)."
```

## Detected Features

### Point Features
- **Peak**: Mountain peak, hilltop (TPI > 3, elevation > 5)
- **Valley**: Valley floor, depression (TPI < -2)
- **Saddle**: Mountain pass (future - requires directional analysis)

### Linear Features
- **Ridge**: Ridgeline, crest (TPI > 2, moderate slope)
- **Cliff**: Very steep slope (> 30° per Army standard)

### Area Features
- **Plateau**: Flat elevated area (TPI > 2, slope < 5°, elevation > 3)
- **Plain**: Flat low area (TPI ≈ 0, slope < 5°)
- **Hillside**: Moderate slope (10-30°)

### Water Features
- **Lake**: Large connected water body (≥ 10 tiles)
- **Pond**: Small water body (< 10 tiles)
- **River**: Flowing water (future - requires flow analysis)

### Vegetation
- **Beach**: Sand adjacent to water
- **Forest**: Dense tree coverage (future - requires entity analysis)

## Integration with LLM Agents

### Add to Vision System

```typescript
// In VisionProcessor.ts or agent perception system
import { globalTerrainAnalyzer } from '@ai-village/world';

function getAgentPercept(world: World, agentId: string): string {
  const agent = world.entities.get(agentId);
  const pos = agent.getComponent<PositionComponent>('position');

  // Get terrain features
  const features = globalTerrainAnalyzer.analyzeArea(
    (x, y) => world.getTileAt(x, y),
    pos.x,
    pos.y,
    15  // Vision range
  );

  // Describe surroundings
  const terrainDesc = globalTerrainAnalyzer.describeNearby(
    features,
    pos.x,
    pos.y,
    15
  );

  // Include in agent prompt
  return `
    Position: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})
    Terrain: ${terrainDesc}
    Nearby Entities: [...]
  `;
}
```

### Memory Formation

```typescript
// Store terrain landmarks in agent memory
const significantFeatures = features.filter(f =>
  f.type === 'peak' ||
  f.type === 'lake' ||
  f.type === 'cliff'
);

for (const feature of significantFeatures) {
  agent.addMemory({
    type: 'observation',
    content: `I saw a ${feature.description} at (${feature.x}, ${feature.y})`,
    location: { x: feature.x, y: feature.y },
    importance: 0.7
  });
}
```

### Navigation Hints

```typescript
// Warn about dangerous terrain
const nearbyCliffs = features.filter(f =>
  f.type === 'cliff' &&
  f.distance < 5
);

if (nearbyCliffs.length > 0) {
  return {
    warning: "Dangerous cliff nearby! Avoid falling.",
    features: nearbyCliffs
  };
}
```

## Algorithms Used

### Topographic Position Index (TPI)
```
TPI = elevation - mean(neighbor_elevations)

TPI > 0  → Higher than surroundings (ridge/peak)
TPI < 0  → Lower than surroundings (valley)
TPI ≈ 0  → Similar to surroundings (slope/flat)
```

### Slope Calculation
```
slope = arctan(√((dz/dx)² + (dz/dy)²))

Where:
- dz/dx = elevation gradient in X direction
- dz/dy = elevation gradient in Y direction
```

### Classification Thresholds
Based on research and military standards:
- **Cliff**: slope > 30° (US Army FM 3-25.26)
- **Steep hillside**: slope 20-30°
- **Moderate slope**: slope 10-20°
- **Gentle slope**: slope 5-10°
- **Flat**: slope < 5°

## Performance

The analyzer is optimized for real-time use:
- **O(n)** complexity where n = tiles in radius
- Typical 20-tile radius: ~1200 tiles analyzed
- Connected component analysis uses flood-fill with visited set
- No pathfinding or complex graph algorithms

## Future Enhancements

Planned features based on research:

1. **Saddle Detection** - Requires directional curvature analysis
2. **Ridge/Valley Lines** - Trace connected critical points (Surface Networks)
3. **River Flow** - Analyze water elevation gradients
4. **Erosion Patterns** - Detect geological features
5. **Cave Detection** - When 3D terrain is added
6. **Vegetation Analysis** - Forest density from entity data

## Example Output

```typescript
const features = analyzer.analyzeArea(getTileAt, 0, 0, 30);
const desc = analyzer.describeNearby(features, 0, 0, 30);

console.log(desc);
```

**Output:**
```
You are near: Flat plains. To the north: Ridge line (elevation 4) (8 tiles),
Mountain peak (elevation 9) (12 tiles). To the east: Lake (67 tiles) (15 tiles).
To the south: Valley floor (elevation -1) (6 tiles). To the west: Steep cliff
(33.4° slope) (10 tiles), Sandy beach (14 tiles).
```

This description gives LLM agents rich spatial context for navigation, planning, and decision-making!
