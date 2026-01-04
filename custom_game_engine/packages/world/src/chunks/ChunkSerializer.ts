/**
 * ChunkSerializer - Handles serialization and compression of chunk terrain data
 */

import type { Chunk } from './Chunk.js';
import type { ChunkManager } from './ChunkManager.js';
import type { Tile } from './Tile.js';
import type {
  TerrainSnapshot,
  SerializedChunk,
  ChunkIndexEntry,
  CompressedTileData,
  RLEData,
  DeltaData,
  SerializedTile,
  CompressionEncoding,
} from './types.js';
import { createDefaultTile } from './Tile.js';
import { CHUNK_SIZE } from './Chunk.js';

/**
 * Placeholder for checksum function until we import from core
 */
function computeChecksumSync(data: any): string {
  // Simple JSON-based checksum for now
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

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
      chunkSize: CHUNK_SIZE,
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

    let compressedData: CompressedTileData;

    switch (strategy) {
      case 'rle':
        compressedData = {
          encoding: 'rle',
          data: this.compressRLE(chunk.tiles),
        };
        break;
      case 'delta':
        compressedData = {
          encoding: 'delta',
          data: this.compressDelta(chunk.tiles),
        };
        break;
      case 'full':
        compressedData = {
          encoding: 'full',
          data: this.serializeFull(chunk.tiles),
        };
        break;
    }

    return {
      x: chunk.x,
      y: chunk.y,
      generated: chunk.generated,
      tiles: compressedData,
      entityIds: Array.from(chunk.entities),
    };
  }

  /**
   * RLE compression: group identical tiles.
   */
  private compressRLE(tiles: Tile[]): RLEData[] {
    if (tiles.length === 0) {
      return [];
    }

    const runs: RLEData[] = [];
    let currentTile = tiles[0]!;
    let runLength = 1;

    for (let i = 1; i < tiles.length; i++) {
      if (this.tilesEqual(tiles[i]!, currentTile)) {
        runLength++;
      } else {
        runs.push({
          tile: this.serializeTile(currentTile),
          count: runLength,
        });
        currentTile = tiles[i]!;
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
  private compressDelta(tiles: Tile[]): DeltaData {
    // Find most common tile as base
    const baseTile = this.findMostCommonTile(tiles);
    const baseSerialized = this.serializeTile(baseTile);

    const diffs: Array<{ index: number; tile: SerializedTile }> = [];

    for (let i = 0; i < tiles.length; i++) {
      if (!this.tilesEqual(tiles[i]!, baseTile)) {
        diffs.push({
          index: i,
          tile: this.serializeTile(tiles[i]!),
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
  private serializeFull(tiles: Tile[]): SerializedTile[] {
    return tiles.map(t => this.serializeTile(t));
  }

  /**
   * Serialize a single tile to JSON-safe format.
   */
  private serializeTile(tile: Tile): SerializedTile {
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

    if (!maxEntry) {
      throw new Error('findMostCommonTile: tiles array is empty');
    }

    return maxEntry.tile;
  }

  /**
   * Select compression strategy based on tile uniformity.
   */
  private selectCompressionStrategy(tiles: Tile[]): CompressionEncoding {
    if (tiles.length === 0) {
      return 'full';
    }

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
        tiles = this.decompressRLE(compressedTiles.data as RLEData[]);
        break;
      case 'delta':
        tiles = this.decompressDelta(compressedTiles.data as DeltaData);
        break;
      case 'full':
        tiles = this.deserializeFull(compressedTiles.data as SerializedTile[]);
        break;
      default:
        throw new Error(`Unknown encoding: ${(compressedTiles as any).encoding}`);
    }

    // Validate tile count
    if (tiles.length !== CHUNK_SIZE * CHUNK_SIZE) {
      throw new Error(
        `Invalid tile count: expected ${CHUNK_SIZE * CHUNK_SIZE}, got ${tiles.length}`
      );
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
  private decompressRLE(runs: RLEData[]): Tile[] {
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
  private decompressDelta(data: DeltaData): Tile[] {
    const baseTile = this.deserializeTile(data.base);
    const tiles: Tile[] = [];

    // Initialize all tiles with base
    for (let i = 0; i < CHUNK_SIZE * CHUNK_SIZE; i++) {
      tiles.push({ ...baseTile, nutrients: { ...baseTile.nutrients } });
    }

    // Apply diffs (with bounds checking)
    for (const diff of data.diffs) {
      if (diff.index < 0 || diff.index >= CHUNK_SIZE * CHUNK_SIZE) {
        console.warn(
          `[ChunkSerializer] Skipping out-of-bounds diff index: ${diff.index} ` +
          `(valid range: 0-${CHUNK_SIZE * CHUNK_SIZE - 1})`
        );
        continue; // Skip invalid indices
      }

      tiles[diff.index] = this.deserializeTile(diff.tile);
    }

    return tiles;
  }

  /**
   * Deserialize full tile array.
   */
  private deserializeFull(data: SerializedTile[]): Tile[] {
    return data.map(t => this.deserializeTile(t));
  }

  /**
   * Deserialize a single tile from JSON.
   */
  private deserializeTile(data: SerializedTile): Tile {
    return {
      terrain: data.terrain as any,
      floor: data.floor,
      elevation: data.elevation ?? 0,
      moisture: data.moisture ?? 50,
      fertility: data.fertility ?? 50,
      biome: data.biome as any,
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
    const tiles: Tile[] = [];
    for (let i = 0; i < CHUNK_SIZE * CHUNK_SIZE; i++) {
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

    console.warn(
      `[ChunkSerializer] Created corrupted chunk marker at (${x}, ${y}): ${error.message}`
    );

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
