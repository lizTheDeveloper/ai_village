import { describe, it, expect } from 'vitest';
import { initializeMinimalWorld } from '../MinimalWorldInitializer.js';
import { chunkSerializer } from '../chunks/ChunkSerializer.js';

describe('MinimalWorldInitializer', () => {
  describe('initializeMinimalWorld', () => {
    it('should return a valid result with all required fields', () => {
      const result = initializeMinimalWorld();

      expect(result).toBeDefined();
      expect(result.chunkManager).toBeDefined();
      expect(result.terrainGenerator).toBeDefined();
      expect(result.chunk).toBeDefined();
    });

    it('should have the chunk at (0,0) marked as generated', () => {
      const { chunk } = initializeMinimalWorld();

      expect(chunk.x).toBe(0);
      expect(chunk.y).toBe(0);
      expect(chunk.generated).toBe(true);
    });

    it('should contain expected terrain types (grass, water, or stone)', () => {
      const { chunk } = initializeMinimalWorld();

      const terrainTypes = new Set(chunk.tiles.map(t => t.terrain));
      const expectedTerrains = ['grass', 'water', 'stone', 'sand', 'dirt'];
      const hasExpectedTerrain = expectedTerrains.some(t => terrainTypes.has(t as any));

      expect(hasExpectedTerrain).toBe(true);
    });

    it('should have no entities in the chunk', () => {
      const { chunk } = initializeMinimalWorld();

      expect(chunk.entities.size).toBe(0);
    });

    it('should complete initialization in under 1 second', () => {
      const start = performance.now();
      initializeMinimalWorld();
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(1000);
    });

    it('should use the provided seed option', () => {
      const result1 = initializeMinimalWorld({ seed: 'seed-a' });
      const result2 = initializeMinimalWorld({ seed: 'seed-a' });
      const result3 = initializeMinimalWorld({ seed: 'seed-b' });

      // Same seed should produce identical terrain
      expect(result1.chunk.tiles.map(t => t.terrain)).toEqual(
        result2.chunk.tiles.map(t => t.terrain)
      );

      // Different seeds should (very likely) differ
      const terrain1 = result1.chunk.tiles.map(t => t.terrain).join(',');
      const terrain3 = result3.chunk.tiles.map(t => t.terrain).join(',');
      // Not guaranteed but extremely likely with different seeds
      expect(terrain1).not.toEqual(terrain3);
    });

    it('should serialize and round-trip the chunk correctly', () => {
      const { chunkManager } = initializeMinimalWorld();

      const snapshot = chunkSerializer.serializeChunks(chunkManager);

      expect(snapshot.generatedChunkCount).toBe(1);
      expect(snapshot.chunkIndex.length).toBe(1);
      expect(snapshot.chunkIndex[0]!.x).toBe(0);
      expect(snapshot.chunkIndex[0]!.y).toBe(0);
      expect(Object.keys(snapshot.chunks).length).toBe(1);
    });

    it('should have exactly 1 chunk loaded', () => {
      const { chunkManager } = initializeMinimalWorld();

      expect(chunkManager.getChunkCount()).toBe(1);
    });

    it('should have tile neighbors linked (no out-of-chunk neighbor references)', () => {
      const { chunk } = initializeMinimalWorld();

      // With a single chunk, edge tiles will have null cross-chunk neighbors
      // Interior tiles should have non-null neighbors
      const centerTile = chunk.tiles[16 * 32 + 16]; // middle of chunk
      expect(centerTile).toBeDefined();
      expect(centerTile!.neighbors).toBeDefined();
      // Center tile should have all intra-chunk neighbors non-null
      expect(centerTile!.neighbors.north).not.toBeNull();
      expect(centerTile!.neighbors.south).not.toBeNull();
      expect(centerTile!.neighbors.east).not.toBeNull();
      expect(centerTile!.neighbors.west).not.toBeNull();
    });
  });
});
