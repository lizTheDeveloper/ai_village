# Terrain Rendering

Canvas-based terrain rendering for top-down and side-view modes.

## Overview

Two specialized renderers handle terrain visualization:
- **TerrainRenderer**: Top-down view with tile overlays (moisture, tilled soil, voxel buildings)
- **SideViewTerrainRenderer**: Side-view cross-section with depth layers, elevation, horizon fog

## TerrainRenderer (Top-Down)

Renders chunks as 2D tile grid with overlay effects.

**Key Methods:**
- `renderChunk(chunk, camera)`: Renders single chunk with all tile features
- `setShowTemperatureOverlay(show)`: Toggle temperature debug visualization

**Tile Features:**
- Base terrain colors (`TERRAIN_COLORS`)
- Tilled soil: Dark brown base + grid furrows + orange border
- Moisture: Blue tint overlay (60-100 moisture range)
- Fertilized: Golden border
- Voxel buildings: Walls, doors (open/closed/locked), windows, roofs
- Construction progress indicators

**Building Tiles:**
Material-based colors, semi-transparency during construction, state-dependent rendering (doors).

## SideViewTerrainRenderer (Cross-Section)

Renders terrain as vertical slice with depth parallax.

**Key Methods:**
- `renderSideViewTerrain(startChunkX, endChunkX, startChunkY, endChunkY)`: Renders depth layers
- `getTerrainElevationAt(worldTileX, worldTileY)`: Returns tile elevation (0 = sea level)

**Features:**
- 20 depth layers rendered back-to-front
- Elevation-based vertical positioning
- Underground layers (soil/rock stratification)
- Horizon-aware fog (`globalHorizonCalculator.getFogFade`)
- Grass tufts on front layer
- Water rendering at sea level

**Depth Handling:**
- North/South: X horizontal, Y depth
- East/West: Y horizontal, X depth
- Fading: Base depth fade + horizon curvature fade combined

## Usage

```typescript
// Top-down
const topDownRenderer = new TerrainRenderer(ctx, 16);
topDownRenderer.renderChunk(chunk, camera);

// Side-view
const sideViewRenderer = new SideViewTerrainRenderer(ctx, 16, chunkManager, camera);
sideViewRenderer.renderSideViewTerrain(startChunkX, endChunkX, startChunkY, endChunkY);
const elevation = sideViewRenderer.getTerrainElevationAt(tileX, tileY);
```

## Color Utilities

**SideViewTerrainRenderer:**
- `applyDepthFade(color, fade)`: Blends toward fog color (light blue-gray)
- `darkenColor(hex, factor)`: Reduces color brightness
- `createSeededRandom(seed)`: Deterministic RNG (mulberry32)
