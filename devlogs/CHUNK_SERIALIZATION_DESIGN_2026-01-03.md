# Chunk Manager Terrain Serialization Design

**Date**: 2026-01-03
**Status**: Design Phase
**Author**: Claude Code

## Current State Analysis

### What Exists

**ChunkManager** (`packages/world/src/chunks/ChunkManager.ts`):
- Manages chunks in a `Map<string, Chunk>`
- Each chunk is 32x32 tiles (1024 tiles)
- Chunks loaded/unloaded dynamically based on camera position
- No serialization methods currently exist

**Chunk Structure** (`packages/world/src/chunks/Chunk.ts`):
```typescript
interface Chunk {
  x: number;                    // Chunk coordinates
  y: number;
  generated: boolean;           // Generation flag
  tiles: Tile[];               // 1024 tiles (row-major)
  entities: Set<EntityId>;     // Entity references
}
```

**Tile Structure** (`packages/world/src/chunks/Tile.ts`):
```typescript
interface Tile {
  // Terrain fundamentals
  terrain: TerrainType;        // 'grass' | 'dirt' | 'water' | 'stone' | 'sand' | 'forest'
  biome?: BiomeType;           // 'plains' | 'forest' | 'desert' | etc.
  floor?: string;
  elevation: number;
  moisture: number;            // 0-100
  fertility: number;           // 0-100

  // Building system
  wall?: WallTile;             // Complex nested object
  door?: DoorTile;
  window?: WindowTile;

  // Soil management (9 fields)
  tilled: boolean;
  plantability: number;
  nutrients: { nitrogen, phosphorus, potassium };
  fertilized: boolean;
  fertilizerDuration: number;
  lastWatered: number;
  lastTilled: number;
  composted: boolean;
  plantId: string | null;

  // Optional systems
  fluid?: FluidLayer;          // Complex nested object
  mineable?: boolean;
  embeddedResource?: string;
  resourceAmount?: number;
  ceilingSupported?: boolean;
}
```

**SaveLoadService** (`packages/core/src/persistence/SaveLoadService.ts`):
- Uses `WorldSerializer.serializeWorld()` to create snapshots
- Returns `UniverseSnapshot` containing entities
- `worldState` field is a placeholder: `{ terrain: null, weather: null, zones: [], buildings: [] }`

**WorldSerializer** (`packages/core/src/persistence/WorldSerializer.ts`):
- Line 243-256: `serializeWorldState()` returns empty placeholders
- Line 127: "TODO: Deserialize world state (terrain, weather, etc.)"
- Only serializes entities, not terrain

### The Problem

**Terrain data is not persisted.** When you save and load:
- All entities are preserved
- All terrain is lost (chunks reset to default)
- ChunkManager has no integration with save system

## Design Requirements

### Functional Requirements

1. **Complete State Preservation**: Save all chunk data including terrain, biomes, buildings, soil state
2. **Selective Loading**: Only serialize generated chunks (not empty/ungenerated ones)
3. **Entity References**: Preserve entity-chunk associations (plantId, builderId, etc.)
4. **Compression**: Large worlds (thousands of chunks) need efficient storage
5. **Incremental Loading**: Support loading chunks on-demand (don't load entire world at once)
6. **Checksum Validation**: Verify terrain integrity on load

### Non-Functional Requirements

1. **Performance**: Serialize/deserialize a 100x100 chunk area in &lt;1 second
2. **Storage Efficiency**: Compress repetitive terrain data (e.g., ocean biomes)
3. **Forward Compatibility**: Support schema migrations as Tile structure evolves
4. **Conservation of Game Matter**: Never delete corrupted chunks (mark as corrupted instead)

## Architecture Design

### 1. Data Flow

```
┌──────────────────┐
│  ChunkManager    │
│  (runtime)       │
└────────┬─────────┘
         │
         │ serialize()
         ▼
┌──────────────────┐
│ ChunkSerializer  │
│                  │
│ • Compress tiles │
│ • Build index    │
│ • Checksums      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  WorldState      │
│  (save file)     │
│                  │
│  terrain: {      │
│    chunks: {...} │
│    index: [...]  │
│  }               │
└──────────────────┘
```

### 2. Serialized Format

**WorldSnapshot.terrain** structure:

```typescript
interface TerrainSnapshot {
  $schema: 'https://aivillage.dev/schemas/terrain/v1';
  $version: 1;

  // Metadata
  chunkSize: number;              // 32 (for future flexibility)
  generatedChunkCount: number;    // How many chunks exist

  // Chunk index (for quick lookup)
  chunkIndex: ChunkIndexEntry[];

  // Compressed chunk data
  chunks: Record<string, SerializedChunk>;

  // Checksums
  checksums: {
    overall: string;
    perChunk: Record<string, string>;
  };
}

interface ChunkIndexEntry {
  key: string;           // "x,y"
  x: number;
  y: number;
  generated: boolean;
  tileCount: number;     // Should always be 1024
  entityCount: number;
  checksum: string;
}

interface SerializedChunk {
  x: number;
  y: number;
  generated: boolean;

  // Tile data (compressed)
  tiles: CompressedTileData;

  // Entity references (will be resolved during deserialization)
  entityIds: string[];
}

interface CompressedTileData {
  // Strategy A: Run-length encoding for uniform areas
  encoding: 'rle' | 'full' | 'delta';

  // Compressed tile array
  data: any;  // Format depends on encoding
}
```

### 3. Compression Strategies

**Strategy A: Run-Length Encoding (RLE)**
- Best for uniform terrain (ocean, desert)
- Example: 800 grass tiles → `{ type: 'grass', count: 800, ...defaults }`
- Compression ratio: ~100:1 for uniform chunks

**Strategy B: Delta Encoding**
- Store base tile + differences
- Best for slightly varied terrain
- Example: "All grass with elevation differences"

**Strategy C: Full Storage**
- No compression, store all 1024 tiles
- Used when terrain is highly varied
- Fallback when compression doesn't help

**Adaptive Selection**:
```typescript
function selectCompressionStrategy(tiles: Tile[]): 'rle' | 'delta' | 'full' {
  const uniformityScore = calculateUniformity(tiles);

  if (uniformityScore > 0.9) return 'rle';      // >90% same tiles
  if (uniformityScore > 0.7) return 'delta';    // >70% similar tiles
  return 'full';                                // Highly varied
}
```

### 4. Integration Points

**SaveLoadService** (`SaveLoadService.ts:54-137`):
```typescript
async save(world: World, options: SaveOptions): Promise<void> {
  // ... existing entity serialization ...

  // NEW: Serialize terrain
  const terrainSnapshot = await chunkSerializer.serializeChunks(
    world.getChunkManager()  // TODO: Add this method to World interface
  );

  multiverseSnapshot.worldState = {
    terrain: terrainSnapshot,
    weather: null,  // TODO
    zones: [],
    buildings: [],
  };

  // ... rest of save logic ...
}
```

**WorldSerializer** (`WorldSerializer.ts:243-256`):
```typescript
private serializeWorldState(world: World): WorldSnapshot {
  // Get ChunkManager from world
  const chunkManager = (world as any).chunkManager;  // TODO: Add to interface

  if (!chunkManager) {
    console.warn('[WorldSerializer] No ChunkManager found, skipping terrain');
    return { terrain: null, weather: null, zones: [], buildings: [] };
  }

  // Serialize chunks
  const terrainSnapshot = chunkSerializer.serializeChunks(chunkManager);

  return {
    terrain: terrainSnapshot,
    weather: null,  // TODO
    zones: [],
    buildings: [],
  };
}
```

**WorldSerializer** (`WorldSerializer.ts:104-130`):
```typescript
async deserializeWorld(snapshot: UniverseSnapshot, world: World): Promise<void> {
  // ... existing entity deserialization ...

  // NEW: Deserialize terrain
  if (snapshot.worldState?.terrain) {
    const chunkManager = (world as any).chunkManager;

    if (chunkManager) {
      await chunkSerializer.deserializeChunks(
        snapshot.worldState.terrain,
        chunkManager
      );
    } else {
      console.warn('[WorldSerializer] No ChunkManager, skipping terrain load');
    }
  }
}
```

### 5. ChunkSerializer Implementation

**New file**: `packages/world/src/chunks/ChunkSerializer.ts`

```typescript
import type { Chunk } from './Chunk.js';
import type { ChunkManager } from './ChunkManager.js';
import type { TerrainSnapshot, SerializedChunk } from './types.js';
import { computeChecksumSync } from '@ai-village/core/persistence/utils.js';

export class ChunkSerializer {
  /**
   * Serialize all generated chunks from ChunkManager.
   */
  serializeChunks(chunkManager: ChunkManager): TerrainSnapshot {
    const chunks = chunkManager.getLoadedChunks();
    const generatedChunks = chunks.filter(c => c.generated);

    console.log(
      `[ChunkSerializer] Serializing ${generatedChunks.length} generated chunks ` +
      `(${chunks.length} total loaded)`
    );

    const serializedChunks: Record<string, SerializedChunk> = {};
    const chunkIndex: ChunkIndexEntry[] = [];
    const perChunkChecksums: Record<string, string> = {};

    for (const chunk of generatedChunks) {
      const key = `${chunk.x},${chunk.y}`;
      const serialized = this.serializeChunk(chunk);

      serializedChunks[key] = serialized;

      // Compute checksum
      const checksum = computeChecksumSync(serialized);
      perChunkChecksums[key] = checksum;

      // Add to index
      chunkIndex.push({
        key,
        x: chunk.x,
        y: chunk.y,
        generated: chunk.generated,
        tileCount: chunk.tiles.length,
        entityCount: chunk.entities.size,
        checksum,
      });
    }

    const snapshot: TerrainSnapshot = {
      $schema: 'https://aivillage.dev/schemas/terrain/v1',
      $version: 1,
      chunkSize: 32,
      generatedChunkCount: generatedChunks.length,
      chunkIndex,
      chunks: serializedChunks,
      checksums: {
        overall: computeChecksumSync(serializedChunks),
        perChunk: perChunkChecksums,
      },
    };

    console.log(`[ChunkSerializer] Terrain snapshot created`);
    return snapshot;
  }

  /**
   * Serialize a single chunk with compression.
   */
  private serializeChunk(chunk: Chunk): SerializedChunk {
    // Select compression strategy
    const strategy = this.selectCompressionStrategy(chunk.tiles);

    let compressedData: any;

    switch (strategy) {
      case 'rle':
        compressedData = this.compressRLE(chunk.tiles);
        break;
      case 'delta':
        compressedData = this.compressDelta(chunk.tiles);
        break;
      case 'full':
        compressedData = this.serializeFull(chunk.tiles);
        break;
    }

    return {
      x: chunk.x,
      y: chunk.y,
      generated: chunk.generated,
      tiles: {
        encoding: strategy,
        data: compressedData,
      },
      entityIds: Array.from(chunk.entities),
    };
  }

  /**
   * RLE compression: group identical tiles.
   */
  private compressRLE(tiles: Tile[]): any {
    const runs: any[] = [];
    let currentTile = tiles[0];
    let runLength = 1;

    for (let i = 1; i < tiles.length; i++) {
      if (this.tilesEqual(tiles[i], currentTile)) {
        runLength++;
      } else {
        runs.push({
          tile: this.serializeTile(currentTile),
          count: runLength,
        });
        currentTile = tiles[i];
        runLength = 1;
      }
    }

    // Push final run
    runs.push({
      tile: this.serializeTile(currentTile),
      count: runLength,
    });

    return runs;
  }

  /**
   * Delta compression: base tile + diffs.
   */
  private compressDelta(tiles: Tile[]): any {
    // Find most common tile as base
    const baseTile = this.findMostCommonTile(tiles);
    const baseSerialized = this.serializeTile(baseTile);

    const diffs: any[] = [];

    for (let i = 0; i < tiles.length; i++) {
      if (!this.tilesEqual(tiles[i], baseTile)) {
        diffs.push({
          index: i,
          tile: this.serializeTile(tiles[i]),
        });
      }
    }

    return {
      base: baseSerialized,
      diffs,
    };
  }

  /**
   * Full serialization: no compression.
   */
  private serializeFull(tiles: Tile[]): any {
    return tiles.map(t => this.serializeTile(t));
  }

  /**
   * Serialize a single tile to JSON-safe format.
   */
  private serializeTile(tile: Tile): any {
    // Create shallow copy with all fields
    return {
      terrain: tile.terrain,
      floor: tile.floor,
      elevation: tile.elevation,
      moisture: tile.moisture,
      fertility: tile.fertility,
      biome: tile.biome,
      wall: tile.wall,
      door: tile.door,
      window: tile.window,
      tilled: tile.tilled,
      plantability: tile.plantability,
      nutrients: { ...tile.nutrients },
      fertilized: tile.fertilized,
      fertilizerDuration: tile.fertilizerDuration,
      lastWatered: tile.lastWatered,
      lastTilled: tile.lastTilled,
      composted: tile.composted,
      plantId: tile.plantId,
      fluid: tile.fluid,
      mineable: tile.mineable,
      embeddedResource: tile.embeddedResource,
      resourceAmount: tile.resourceAmount,
      ceilingSupported: tile.ceilingSupported,
    };
  }

  /**
   * Check if two tiles are identical.
   */
  private tilesEqual(a: Tile, b: Tile): boolean {
    // Deep equality check
    return JSON.stringify(this.serializeTile(a)) ===
           JSON.stringify(this.serializeTile(b));
  }

  /**
   * Find most common tile in array.
   */
  private findMostCommonTile(tiles: Tile[]): Tile {
    const counts = new Map<string, { tile: Tile; count: number }>();

    for (const tile of tiles) {
      const key = JSON.stringify(this.serializeTile(tile));
      const entry = counts.get(key);

      if (entry) {
        entry.count++;
      } else {
        counts.set(key, { tile, count: 1 });
      }
    }

    let maxEntry: { tile: Tile; count: number } | null = null;

    for (const entry of counts.values()) {
      if (!maxEntry || entry.count > maxEntry.count) {
        maxEntry = entry;
      }
    }

    return maxEntry!.tile;
  }

  /**
   * Select compression strategy based on tile uniformity.
   */
  private selectCompressionStrategy(tiles: Tile[]): 'rle' | 'delta' | 'full' {
    // Calculate uniformity: how many tiles match the most common tile
    const mostCommonTile = this.findMostCommonTile(tiles);
    let matchCount = 0;

    for (const tile of tiles) {
      if (this.tilesEqual(tile, mostCommonTile)) {
        matchCount++;
      }
    }

    const uniformity = matchCount / tiles.length;

    if (uniformity > 0.9) {
      // >90% uniform → RLE is best
      return 'rle';
    } else if (uniformity > 0.7) {
      // >70% uniform → Delta encoding is good
      return 'delta';
    } else {
      // Highly varied → Store full
      return 'full';
    }
  }

  /**
   * Deserialize terrain snapshot into ChunkManager.
   */
  async deserializeChunks(
    snapshot: TerrainSnapshot,
    chunkManager: ChunkManager
  ): Promise<void> {
    console.log(
      `[ChunkSerializer] Deserializing ${snapshot.generatedChunkCount} chunks`
    );

    // Verify overall checksum
    const actualChecksum = computeChecksumSync(snapshot.chunks);
    if (actualChecksum !== snapshot.checksums.overall) {
      console.error(
        `[ChunkSerializer] Terrain checksum mismatch! ` +
        `Expected ${snapshot.checksums.overall}, got ${actualChecksum}. ` +
        `Terrain data may be corrupted.`
      );
      // Continue anyway, per-chunk checksums will catch specific issues
    }

    // Clear existing chunks
    chunkManager.clear();

    // Deserialize each chunk
    for (const [key, serializedChunk] of Object.entries(snapshot.chunks)) {
      try {
        // Verify per-chunk checksum
        const expectedChecksum = snapshot.checksums.perChunk[key];
        const actualChecksum = computeChecksumSync(serializedChunk);

        if (expectedChecksum !== actualChecksum) {
          console.error(
            `[ChunkSerializer] Chunk ${key} checksum mismatch! ` +
            `Chunk may be corrupted. Attempting to load anyway...`
          );
          // Per CLAUDE.md: Don't delete corrupted data, try to load it
        }

        const chunk = this.deserializeChunk(serializedChunk);

        // Add to chunk manager (access internal Map directly)
        (chunkManager as any).chunks.set(key, chunk);

      } catch (error) {
        console.error(
          `[ChunkSerializer] Failed to deserialize chunk ${key}:`,
          error
        );

        // Per CLAUDE.md: Conservation of Game Matter
        // Create corrupted chunk marker instead of skipping
        const corruptedChunk = this.createCorruptedChunk(
          serializedChunk.x,
          serializedChunk.y,
          error as Error
        );

        (chunkManager as any).chunks.set(key, corruptedChunk);
      }
    }

    console.log(
      `[ChunkSerializer] Loaded ${chunkManager.getChunkCount()} chunks`
    );
  }

  /**
   * Deserialize a single chunk.
   */
  private deserializeChunk(serialized: SerializedChunk): Chunk {
    const { tiles: compressedTiles, entityIds } = serialized;

    let tiles: Tile[];

    switch (compressedTiles.encoding) {
      case 'rle':
        tiles = this.decompressRLE(compressedTiles.data);
        break;
      case 'delta':
        tiles = this.decompressDelta(compressedTiles.data);
        break;
      case 'full':
        tiles = this.deserializeFull(compressedTiles.data);
        break;
      default:
        throw new Error(`Unknown encoding: ${(compressedTiles as any).encoding}`);
    }

    return {
      x: serialized.x,
      y: serialized.y,
      generated: serialized.generated,
      tiles,
      entities: new Set(entityIds),
    };
  }

  /**
   * Decompress RLE-encoded tiles.
   */
  private decompressRLE(runs: any[]): Tile[] {
    const tiles: Tile[] = [];

    for (const run of runs) {
      const tile = this.deserializeTile(run.tile);

      for (let i = 0; i < run.count; i++) {
        tiles.push({ ...tile });  // Clone for each tile
      }
    }

    return tiles;
  }

  /**
   * Decompress delta-encoded tiles.
   */
  private decompressDelta(data: any): Tile[] {
    const baseTile = this.deserializeTile(data.base);
    const tiles: Tile[] = [];

    // Initialize all tiles with base
    for (let i = 0; i < 1024; i++) {
      tiles.push({ ...baseTile });
    }

    // Apply diffs
    for (const diff of data.diffs) {
      tiles[diff.index] = this.deserializeTile(diff.tile);
    }

    return tiles;
  }

  /**
   * Deserialize full tile array.
   */
  private deserializeFull(data: any[]): Tile[] {
    return data.map(t => this.deserializeTile(t));
  }

  /**
   * Deserialize a single tile from JSON.
   */
  private deserializeTile(data: any): Tile {
    return {
      terrain: data.terrain,
      floor: data.floor,
      elevation: data.elevation ?? 0,
      moisture: data.moisture ?? 50,
      fertility: data.fertility ?? 50,
      biome: data.biome,
      wall: data.wall,
      door: data.door,
      window: data.window,
      tilled: data.tilled ?? false,
      plantability: data.plantability ?? 0,
      nutrients: data.nutrients ?? { nitrogen: 50, phosphorus: 50, potassium: 50 },
      fertilized: data.fertilized ?? false,
      fertilizerDuration: data.fertilizerDuration ?? 0,
      lastWatered: data.lastWatered ?? 0,
      lastTilled: data.lastTilled ?? 0,
      composted: data.composted ?? false,
      plantId: data.plantId ?? null,
      fluid: data.fluid,
      mineable: data.mineable,
      embeddedResource: data.embeddedResource,
      resourceAmount: data.resourceAmount,
      ceilingSupported: data.ceilingSupported,
    };
  }

  /**
   * Create a corrupted chunk marker (per CLAUDE.md: Conservation of Game Matter).
   */
  private createCorruptedChunk(x: number, y: number, error: Error): Chunk {
    const { createDefaultTile } = require('./Tile.js');

    const tiles: Tile[] = [];
    for (let i = 0; i < 1024; i++) {
      tiles.push(createDefaultTile());
    }

    // Store corruption info in first tile (hacky but preserves data)
    (tiles[0] as any)._corruption = {
      corrupted: true,
      reason: error.message,
      chunkCoords: { x, y },
      corruptionDate: Date.now(),
      recoverable: false,
    };

    return {
      x,
      y,
      generated: true,
      tiles,
      entities: new Set(),
    };
  }
}

// Singleton
export const chunkSerializer = new ChunkSerializer();
```

## Implementation Plan

### Phase 1: Core Serialization (High Priority)
- [ ] Create `ChunkSerializer.ts` with serialize/deserialize methods
- [ ] Add compression strategies (RLE, delta, full)
- [ ] Add checksum validation
- [ ] Unit tests for serialization round-trip

### Phase 2: Integration (High Priority)
- [ ] Update `WorldSerializer.serializeWorldState()` to use ChunkSerializer
- [ ] Update `WorldSerializer.deserializeWorld()` to restore chunks
- [ ] Add `chunkManager` property to World interface
- [ ] Add ChunkManager getter to WorldImpl

### Phase 3: Corruption Handling (Medium Priority)
- [ ] Implement `createCorruptedChunk()` marker system
- [ ] Add corruption detection during load
- [ ] Log corrupted chunks for debugging
- [ ] Create data recovery tools (future)

### Phase 4: Optimization (Low Priority)
- [ ] Profile compression strategies on real terrain
- [ ] Add lazy chunk loading (load on-demand)
- [ ] Implement chunk paging for massive worlds
- [ ] Add progress reporting for large loads

## Performance Estimates

**Chunk Count vs. Serialization Time**:

| Chunks | Tiles    | Strategy | Time    | Size      |
|--------|----------|----------|---------|-----------|
| 10     | 10,240   | RLE      | ~10ms   | ~50KB     |
| 100    | 102,400  | RLE      | ~100ms  | ~500KB    |
| 1000   | 1,024,000| Mixed    | ~1s     | ~5MB      |
| 10,000 | 10.2M    | Mixed    | ~10s    | ~50MB     |

**Compression Ratios** (estimated):
- Uniform ocean: 100:1 (RLE)
- Plains with variation: 10:1 (Delta)
- City with buildings: 2:1 (Full with minor RLE)

## Testing Strategy

### Unit Tests
```typescript
describe('ChunkSerializer', () => {
  it('should serialize and deserialize a uniform chunk', () => {
    const chunk = createUniformChunk('grass');
    const serialized = chunkSerializer.serializeChunk(chunk);
    const deserialized = chunkSerializer.deserializeChunk(serialized);

    expect(deserialized.tiles).toEqual(chunk.tiles);
  });

  it('should use RLE for uniform terrain', () => {
    const chunk = createUniformChunk('ocean');
    const serialized = chunkSerializer.serializeChunk(chunk);

    expect(serialized.tiles.encoding).toBe('rle');
    expect(serialized.tiles.data.length).toBeLessThan(10); // ~1 run
  });

  it('should handle corrupted data gracefully', () => {
    const invalidData = { invalid: 'structure' };

    expect(() => {
      chunkSerializer.deserializeChunk(invalidData as any);
    }).toThrow();

    // Should create corrupted marker instead of crashing game
    const corrupted = chunkSerializer.createCorruptedChunk(0, 0, new Error('test'));
    expect(corrupted.generated).toBe(true);
    expect((corrupted.tiles[0] as any)._corruption).toBeDefined();
  });
});
```

### Integration Tests
```typescript
describe('Save/Load Integration', () => {
  it('should preserve terrain across save/load', async () => {
    // Create world with terrain
    const world = createTestWorld();
    const chunkManager = world.getChunkManager();

    // Generate diverse terrain
    generateTestTerrain(chunkManager, {
      plains: 10,
      ocean: 5,
      city: 3,
    });

    // Save
    await saveLoadService.save(world, { name: 'test_terrain' });

    // Create new world and load
    const newWorld = createTestWorld();
    await saveLoadService.load('test_terrain', newWorld);

    // Verify terrain matches
    const originalChunks = chunkManager.getLoadedChunks();
    const loadedChunks = newWorld.getChunkManager().getLoadedChunks();

    expect(loadedChunks.length).toBe(originalChunks.length);

    for (let i = 0; i < originalChunks.length; i++) {
      expectChunksEqual(originalChunks[i], loadedChunks[i]);
    }
  });
});
```

## Migration Strategy

**Backwards Compatibility**: Old saves without terrain data:
```typescript
async deserializeWorld(snapshot: UniverseSnapshot, world: World): Promise<void> {
  // ... deserialize entities ...

  if (snapshot.worldState?.terrain) {
    // New format: load terrain
    await chunkSerializer.deserializeChunks(snapshot.worldState.terrain, chunkManager);
  } else {
    // Old format: generate default terrain
    console.warn('[WorldSerializer] No terrain data found, generating defaults');
    generateDefaultTerrain(chunkManager);
  }
}
```

**Schema Versioning**:
```typescript
interface TerrainSnapshot {
  $schema: 'https://aivillage.dev/schemas/terrain/v1';
  $version: 1;  // Increment when format changes

  // Future: Support migrations
  // $version: 2 → Add new fields, migrate old format
}
```

## Open Questions

1. **Should we serialize ungenerated chunks?**
   - Current design: No, only serialize `generated: true` chunks
   - Rationale: Procedural generation can recreate them from seed

2. **How to handle entity references in tiles?**
   - `plantId`, `builderId` reference entities by ID
   - Current approach: Store IDs as strings, resolve during load
   - Risk: Dangling references if entity was deleted
   - Solution: Validate references during load, set to null if missing

3. **Lazy chunk loading for huge worlds?**
   - Current design loads all chunks at once
   - Future optimization: Load chunks on-demand as camera moves
   - Requires: Chunk index separate from chunk data

4. **Should compression be optional?**
   - Current design always compresses
   - Alternative: Add `compressionEnabled: boolean` setting
   - Tradeoff: Storage vs. CPU time

## Next Steps

1. **Review this design** with team/user
2. **Implement Phase 1** (ChunkSerializer)
3. **Write unit tests** for compression strategies
4. **Integrate with WorldSerializer** (Phase 2)
5. **Test on real game saves** with varied terrain
6. **Optimize based on profiling** data

## References

- `packages/world/src/chunks/ChunkManager.ts` - Current chunk manager
- `packages/world/src/chunks/Chunk.ts` - Chunk data structure
- `packages/world/src/chunks/Tile.ts` - Tile data structure (177 lines)
- `packages/core/src/persistence/SaveLoadService.ts` - Save/load service
- `packages/core/src/persistence/WorldSerializer.ts` - Entity serialization
- `CLAUDE.md` - Conservation of Game Matter principle
