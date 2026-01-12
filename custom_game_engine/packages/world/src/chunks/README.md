# Chunk Management System

Spatial partitioning system for large game maps using 32×32 tile chunks with dynamic loading/unloading.

## Overview

Divides infinite game worlds into manageable 32×32 tile chunks. Only chunks near the camera are loaded into memory. Chunks beyond the load radius are unloaded. Supports serialization with RLE/delta compression for efficient save files.

## Core Components

**Chunk** (`Chunk.ts`): 32×32 tile grid with coordinates, generation state, entity tracking.

**ChunkManager** (`ChunkManager.ts`): Handles chunk loading/unloading based on camera position. Configurable load radius (default: 2 chunks = ~2048 pixels).

**ChunkSerializer** (`ChunkSerializer.ts`): Compresses chunks for save files. Three strategies:
- **RLE**: >90% uniform tiles (e.g., ocean chunks)
- **Delta**: 70-90% uniform (base tile + diffs)
- **Full**: <70% uniform (raw tile array)

**Tile** (`Tile.ts`): Single world tile with terrain, elevation, moisture, fertility, soil properties, buildings (walls/doors/windows/roofs), fluids.

## Coordinate Systems

```typescript
// World → Chunk coordinates
worldToChunk(100, 64) → {chunkX: 3, chunkY: 2}

// World → Local (0-31)
worldToLocal(100, 64) → {localX: 4, localY: 0}

// Chunk + Local → World
chunkToWorld(3, 2, 4, 0) → {worldX: 100, worldY: 64}

// Chunk key for Map storage
getChunkKey(3, 2) → "3,2"
```

## Usage

```typescript
import { ChunkManager } from '@ai-village/world';

const chunkManager = new ChunkManager(2); // 2-chunk radius

// Update chunks based on camera (auto-load/unload)
const {loaded, unloaded} = chunkManager.updateLoadedChunks(cameraX, cameraY);

// Generate terrain for newly loaded chunks
for (const chunk of loaded) {
  terrainGenerator.generateChunk(chunk);
  chunk.generated = true;
}

// Get chunk (creates if missing)
const chunk = chunkManager.getChunk(chunkX, chunkY);

// Access tile
const tile = getTileAt(chunk, localX, localY);
```

## Serialization

```typescript
import { chunkSerializer } from '@ai-village/world';

// Save
const snapshot = chunkSerializer.serializeChunks(chunkManager);
// Produces TerrainSnapshot with checksums, compression metadata

// Load
await chunkSerializer.deserializeChunks(snapshot, chunkManager);
// Verifies checksums, handles corrupted chunks per CLAUDE.md
```

## Performance

**Memory**: Only ~5-9 chunks in memory (load radius 2) = 5,120-9,216 tiles instead of entire map.

**Compression**: Ocean chunks (>90% water) compress to <5% original size via RLE.

**Entity Tracking**: Each chunk tracks entities via `Set<EntityId>` for spatial queries.

## Architecture

**Chunk key format**: `"x,y"` string for Map storage.

**Load radius**: Distance from camera in chunks (not pixels). Radius 2 = 5×5 chunk grid centered on camera.

**Unload hysteresis**: Chunks unload at `radius + 1` to prevent thrashing.

**Corruption handling**: Failed chunk deserialization creates corrupted chunk markers instead of deleting data (Conservation of Game Matter).
