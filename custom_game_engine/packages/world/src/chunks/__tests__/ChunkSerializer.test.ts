/**
 * ChunkSerializer unit tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChunkSerializer } from '../ChunkSerializer.js';
import { createChunk, CHUNK_SIZE } from '../Chunk.js';
import { ChunkManager } from '../ChunkManager.js';
import type { Chunk } from '../Chunk.js';
import type { Tile } from '../Tile.js';

describe('ChunkSerializer', () => {
  let serializer: ChunkSerializer;

  beforeEach(() => {
    serializer = new ChunkSerializer();
  });

  describe('Tile Serialization', () => {
    it('should serialize and deserialize a default tile', () => {
      const chunk = createChunk(0, 0);
      chunk.generated = true;

      const serialized = (serializer as any).serializeChunk(chunk);
      const deserialized = (serializer as any).deserializeChunk(serialized);

      expect(deserialized.tiles.length).toBe(CHUNK_SIZE * CHUNK_SIZE);
      expect(deserialized.tiles[0].terrain).toBe('grass');
      expect(deserialized.tiles[0].elevation).toBe(0);
      expect(deserialized.tiles[0].moisture).toBe(50);
    });

    it('should preserve all tile properties', () => {
      const chunk = createChunk(0, 0);
      chunk.generated = true;

      // Modify first tile with all properties
      const tile = chunk.tiles[0]!;
      tile.terrain = 'water';
      tile.floor = 'wooden_floor';
      tile.elevation = 10;
      tile.moisture = 75;
      tile.fertility = 85;
      tile.biome = 'forest';
      tile.tilled = true;
      tile.plantability = 3;
      tile.nutrients = { nitrogen: 60, phosphorus: 70, potassium: 80 };
      tile.fertilized = true;
      tile.fertilizerDuration = 100;
      tile.lastWatered = 500;
      tile.lastTilled = 400;
      tile.composted = true;
      tile.plantId = 'plant_123';

      const serialized = (serializer as any).serializeChunk(chunk);
      const deserialized = (serializer as any).deserializeChunk(serialized);

      const deserializedTile = deserialized.tiles[0];
      expect(deserializedTile.terrain).toBe('water');
      expect(deserializedTile.floor).toBe('wooden_floor');
      expect(deserializedTile.elevation).toBe(10);
      expect(deserializedTile.moisture).toBe(75);
      expect(deserializedTile.fertility).toBe(85);
      expect(deserializedTile.biome).toBe('forest');
      expect(deserializedTile.tilled).toBe(true);
      expect(deserializedTile.plantability).toBe(3);
      expect(deserializedTile.nutrients).toEqual({ nitrogen: 60, phosphorus: 70, potassium: 80 });
      expect(deserializedTile.fertilized).toBe(true);
      expect(deserializedTile.fertilizerDuration).toBe(100);
      expect(deserializedTile.lastWatered).toBe(500);
      expect(deserializedTile.lastTilled).toBe(400);
      expect(deserializedTile.composted).toBe(true);
      expect(deserializedTile.plantId).toBe('plant_123');
    });
  });

  describe('RLE Compression', () => {
    it('should use RLE for uniform chunks', () => {
      const chunk = createUniformChunk(0, 0, 'grass');
      chunk.generated = true;

      const serialized = (serializer as any).serializeChunk(chunk);

      expect(serialized.tiles.encoding).toBe('rle');
      expect(Array.isArray(serialized.tiles.data)).toBe(true);
      expect(serialized.tiles.data.length).toBe(1); // Single run of 1024 tiles
      expect(serialized.tiles.data[0].count).toBe(CHUNK_SIZE * CHUNK_SIZE);
    });

    it('should compress uniform chunks efficiently', () => {
      const chunk = createUniformChunk(0, 0, 'water');
      chunk.generated = true;

      const serialized = (serializer as any).serializeChunk(chunk);
      const deserialized = (serializer as any).deserializeChunk(serialized);

      expect(deserialized.tiles.length).toBe(CHUNK_SIZE * CHUNK_SIZE);
      expect(deserialized.tiles.every((t: Tile) => t.terrain === 'water')).toBe(true);
    });

    it('should handle multiple runs in RLE when highly uniform', () => {
      const chunk = createChunk(0, 0);
      chunk.generated = true;

      // Create pattern: 950 grass, 74 water (>90% uniform, triggers RLE)
      for (let i = 0; i < 950; i++) {
        chunk.tiles[i]!.terrain = 'grass';
      }
      for (let i = 950; i < 1024; i++) {
        chunk.tiles[i]!.terrain = 'water';
      }

      const serialized = (serializer as any).serializeChunk(chunk);

      expect(serialized.tiles.encoding).toBe('rle');
      expect(serialized.tiles.data.length).toBe(2); // Two runs
    });
  });

  describe('Delta Compression', () => {
    it('should use delta encoding for mostly uniform chunks', () => {
      const chunk = createUniformChunk(0, 0, 'grass');
      chunk.generated = true;

      // Make 20% different (just above 70% threshold for delta)
      for (let i = 0; i < 250; i++) {
        chunk.tiles[i]!.terrain = 'water';
      }

      const serialized = (serializer as any).serializeChunk(chunk);

      expect(serialized.tiles.encoding).toBe('delta');
      expect((serialized.tiles.data as any).base).toBeDefined();
      expect((serialized.tiles.data as any).diffs).toBeDefined();
      expect((serialized.tiles.data as any).diffs.length).toBe(250);
    });

    it('should reconstruct tiles correctly from delta encoding', () => {
      const chunk = createUniformChunk(0, 0, 'grass');
      chunk.generated = true;

      // Change specific tiles
      chunk.tiles[100]!.terrain = 'water';
      chunk.tiles[200]!.terrain = 'stone';
      chunk.tiles[300]!.elevation = 50;

      const serialized = (serializer as any).serializeChunk(chunk);
      const deserialized = (serializer as any).deserializeChunk(serialized);

      expect(deserialized.tiles[100].terrain).toBe('water');
      expect(deserialized.tiles[200].terrain).toBe('stone');
      expect(deserialized.tiles[300].elevation).toBe(50);
      expect(deserialized.tiles[500].terrain).toBe('grass'); // Unchanged tiles
    });
  });

  describe('Full Serialization', () => {
    it('should use full encoding for highly varied chunks', () => {
      const chunk = createChunk(0, 0);
      chunk.generated = true;

      // Make every tile unique
      for (let i = 0; i < CHUNK_SIZE * CHUNK_SIZE; i++) {
        chunk.tiles[i]!.elevation = i;
      }

      const serialized = (serializer as any).serializeChunk(chunk);

      expect(serialized.tiles.encoding).toBe('full');
      expect(Array.isArray(serialized.tiles.data)).toBe(true);
      expect(serialized.tiles.data.length).toBe(CHUNK_SIZE * CHUNK_SIZE);
    });

    it('should preserve all tiles in full encoding', () => {
      const chunk = createChunk(0, 0);
      chunk.generated = true;

      // Set unique properties
      for (let i = 0; i < CHUNK_SIZE * CHUNK_SIZE; i++) {
        chunk.tiles[i]!.elevation = i;
        chunk.tiles[i]!.moisture = i % 100;
      }

      const serialized = (serializer as any).serializeChunk(chunk);
      const deserialized = (serializer as any).deserializeChunk(serialized);

      for (let i = 0; i < CHUNK_SIZE * CHUNK_SIZE; i++) {
        expect(deserialized.tiles[i].elevation).toBe(i);
        expect(deserialized.tiles[i].moisture).toBe(i % 100);
      }
    });
  });

  describe('Compression Strategy Selection', () => {
    it('should select RLE for >90% uniform chunks', () => {
      const chunk = createUniformChunk(0, 0, 'grass');
      chunk.generated = true;

      // Make 5% different (95% uniform)
      for (let i = 0; i < 51; i++) {
        chunk.tiles[i]!.terrain = 'water';
      }

      const strategy = (serializer as any).selectCompressionStrategy(chunk.tiles);
      expect(strategy).toBe('rle');
    });

    it('should select delta for 70-90% uniform chunks', () => {
      const chunk = createUniformChunk(0, 0, 'grass');
      chunk.generated = true;

      // Make 25% different (75% uniform)
      for (let i = 0; i < 256; i++) {
        chunk.tiles[i]!.terrain = 'water';
      }

      const strategy = (serializer as any).selectCompressionStrategy(chunk.tiles);
      expect(strategy).toBe('delta');
    });

    it('should select full for <70% uniform chunks', () => {
      const chunk = createChunk(0, 0);
      chunk.generated = true;

      // Make every tile unique
      for (let i = 0; i < CHUNK_SIZE * CHUNK_SIZE; i++) {
        chunk.tiles[i]!.elevation = i;
      }

      const strategy = (serializer as any).selectCompressionStrategy(chunk.tiles);
      expect(strategy).toBe('full');
    });
  });

  describe('ChunkManager Integration', () => {
    it('should serialize all generated chunks', () => {
      const chunkManager = new ChunkManager();

      // Create 3 chunks, mark 2 as generated
      const chunk1 = chunkManager.getChunk(0, 0);
      const chunk2 = chunkManager.getChunk(1, 0);
      const chunk3 = chunkManager.getChunk(0, 1);

      chunk1.generated = true;
      chunk2.generated = true;
      chunk3.generated = false; // Not generated

      const snapshot = serializer.serializeChunks(chunkManager);

      expect(snapshot.generatedChunkCount).toBe(2);
      expect(Object.keys(snapshot.chunks).length).toBe(2);
      expect(snapshot.chunkIndex.length).toBe(2);
    });

    it('should create chunk index with correct metadata', () => {
      const chunkManager = new ChunkManager();

      const chunk = chunkManager.getChunk(5, 10);
      chunk.generated = true;
      chunk.entities.add('entity_1');
      chunk.entities.add('entity_2');

      const snapshot = serializer.serializeChunks(chunkManager);

      const indexEntry = snapshot.chunkIndex[0]!;
      expect(indexEntry.x).toBe(5);
      expect(indexEntry.y).toBe(10);
      expect(indexEntry.generated).toBe(true);
      expect(indexEntry.tileCount).toBe(CHUNK_SIZE * CHUNK_SIZE);
      expect(indexEntry.entityCount).toBe(2);
      expect(indexEntry.checksum).toBeDefined();
    });

    it('should compute checksums correctly', () => {
      const chunkManager = new ChunkManager();

      const chunk = chunkManager.getChunk(0, 0);
      chunk.generated = true;

      const snapshot = serializer.serializeChunks(chunkManager);

      expect(snapshot.checksums.overall).toBeDefined();
      expect(snapshot.checksums.perChunk['0,0']).toBeDefined();
      expect(snapshot.checksums.overall).toBe(snapshot.checksums.overall); // Deterministic
    });
  });

  describe('Deserialization', () => {
    it('should restore chunk manager from snapshot', async () => {
      const chunkManager1 = new ChunkManager();

      // Create chunks with different terrains
      const chunk1 = chunkManager1.getChunk(0, 0);
      chunk1.generated = true;
      chunk1.tiles.forEach(t => t.terrain = 'grass');

      const chunk2 = chunkManager1.getChunk(1, 1);
      chunk2.generated = true;
      chunk2.tiles.forEach(t => t.terrain = 'water');

      // Serialize
      const snapshot = serializer.serializeChunks(chunkManager1);

      // Deserialize into new chunk manager
      const chunkManager2 = new ChunkManager();
      await serializer.deserializeChunks(snapshot, chunkManager2);

      // Verify chunks were restored
      expect(chunkManager2.hasChunk(0, 0)).toBe(true);
      expect(chunkManager2.hasChunk(1, 1)).toBe(true);

      const restoredChunk1 = chunkManager2.getChunk(0, 0);
      const restoredChunk2 = chunkManager2.getChunk(1, 1);

      expect(restoredChunk1.generated).toBe(true);
      expect(restoredChunk1.tiles.every(t => t.terrain === 'grass')).toBe(true);

      expect(restoredChunk2.generated).toBe(true);
      expect(restoredChunk2.tiles.every(t => t.terrain === 'water')).toBe(true);
    });

    it('should restore entity references', async () => {
      const chunkManager1 = new ChunkManager();

      const chunk = chunkManager1.getChunk(0, 0);
      chunk.generated = true;
      chunk.entities.add('entity_1');
      chunk.entities.add('entity_2');
      chunk.entities.add('entity_3');

      const snapshot = serializer.serializeChunks(chunkManager1);

      const chunkManager2 = new ChunkManager();
      await serializer.deserializeChunks(snapshot, chunkManager2);

      const restoredChunk = chunkManager2.getChunk(0, 0);
      expect(restoredChunk.entities.size).toBe(3);
      expect(restoredChunk.entities.has('entity_1')).toBe(true);
      expect(restoredChunk.entities.has('entity_2')).toBe(true);
      expect(restoredChunk.entities.has('entity_3')).toBe(true);
    });
  });

  describe('Corruption Handling', () => {
    it('should create corrupted chunk marker on deserialization error', async () => {
      const chunkManager = new ChunkManager();

      // Create invalid snapshot with bad encoding
      const invalidSnapshot = {
        $schema: 'https://aivillage.dev/schemas/terrain/v1',
        $version: 1,
        chunkSize: CHUNK_SIZE,
        generatedChunkCount: 1,
        chunkIndex: [],
        chunks: {
          '0,0': {
            x: 0,
            y: 0,
            generated: true,
            tiles: {
              encoding: 'invalid_encoding' as any,
              data: null,
            },
            entityIds: [],
          },
        },
        checksums: {
          overall: 'fake',
          perChunk: { '0,0': 'fake' },
        },
      };

      await serializer.deserializeChunks(invalidSnapshot as any, chunkManager);

      // Should create corrupted marker instead of crashing
      expect(chunkManager.hasChunk(0, 0)).toBe(true);
      const chunk = chunkManager.getChunk(0, 0);
      expect(chunk.generated).toBe(true);
      expect((chunk.tiles[0] as any)._corruption).toBeDefined();
      expect((chunk.tiles[0] as any)._corruption.corrupted).toBe(true);
    });

    it('should log checksum mismatches but continue loading', async () => {
      const chunkManager1 = new ChunkManager();
      const chunk = chunkManager1.getChunk(0, 0);
      chunk.generated = true;

      const snapshot = serializer.serializeChunks(chunkManager1);

      // Corrupt the checksum
      snapshot.checksums.overall = 'corrupted_checksum';

      const chunkManager2 = new ChunkManager();

      // Should not throw, just log warning
      await expect(
        serializer.deserializeChunks(snapshot, chunkManager2)
      ).resolves.not.toThrow();

      // Chunk should still be loaded
      expect(chunkManager2.hasChunk(0, 0)).toBe(true);
    });
  });

  describe('Round-Trip Tests', () => {
    it('should preserve chunk data through serialize/deserialize cycle', async () => {
      const chunkManager1 = new ChunkManager();

      // Create complex chunk with varied data
      const chunk = chunkManager1.getChunk(5, 10);
      chunk.generated = true;

      // Set varied tile properties
      for (let i = 0; i < CHUNK_SIZE * CHUNK_SIZE; i++) {
        const tile = chunk.tiles[i]!;
        tile.terrain = i % 2 === 0 ? 'grass' : 'dirt';
        tile.elevation = i % 10;
        tile.moisture = (i * 3) % 100;
        tile.fertility = (i * 5) % 100;
        tile.tilled = i % 3 === 0;
        tile.plantability = i % 4;
      }

      chunk.entities.add('entity_1');
      chunk.entities.add('entity_2');

      // Serialize
      const snapshot = serializer.serializeChunks(chunkManager1);

      // Deserialize
      const chunkManager2 = new ChunkManager();
      await serializer.deserializeChunks(snapshot, chunkManager2);

      // Verify
      const restoredChunk = chunkManager2.getChunk(5, 10);

      expect(restoredChunk.x).toBe(5);
      expect(restoredChunk.y).toBe(10);
      expect(restoredChunk.generated).toBe(true);
      expect(restoredChunk.entities.size).toBe(2);

      // Verify all tiles
      for (let i = 0; i < CHUNK_SIZE * CHUNK_SIZE; i++) {
        const original = chunk.tiles[i]!;
        const restored = restoredChunk.tiles[i]!;

        expect(restored.terrain).toBe(original.terrain);
        expect(restored.elevation).toBe(original.elevation);
        expect(restored.moisture).toBe(original.moisture);
        expect(restored.fertility).toBe(original.fertility);
        expect(restored.tilled).toBe(original.tilled);
        expect(restored.plantability).toBe(original.plantability);
      }
    });
  });
});

/**
 * Helper: Create a chunk with uniform terrain
 */
function createUniformChunk(x: number, y: number, terrain: string): Chunk {
  const chunk = createChunk(x, y);

  for (let i = 0; i < CHUNK_SIZE * CHUNK_SIZE; i++) {
    chunk.tiles[i]!.terrain = terrain as any;
  }

  return chunk;
}
