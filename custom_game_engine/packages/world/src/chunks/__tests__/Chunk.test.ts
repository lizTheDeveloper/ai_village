import { describe, it, expect } from 'vitest';
import {
  createChunk,
  getTileAt,
  setTileAt,
  worldToChunk,
  worldToLocal,
  chunkToWorld,
  getChunkKey,
  CHUNK_SIZE,
} from '../Chunk.js';
import type { Tile } from '../Tile.js';

describe('Chunk', () => {
  describe('createChunk', () => {
    it('should create chunk with correct coordinates', () => {
      const chunk = createChunk(5, 10);
      expect(chunk.x).toBe(5);
      expect(chunk.y).toBe(10);
    });

    it('should create chunk with all tiles', () => {
      const chunk = createChunk(0, 0);
      expect(chunk.tiles.length).toBe(CHUNK_SIZE * CHUNK_SIZE);
    });

    it('should start not generated', () => {
      const chunk = createChunk(0, 0);
      expect(chunk.generated).toBe(false);
    });

    it('should start with empty entity set', () => {
      const chunk = createChunk(0, 0);
      expect(chunk.entities.size).toBe(0);
    });
  });

  describe('getTileAt', () => {
    it('should get tile at valid position', () => {
      const chunk = createChunk(0, 0);
      const tile = getTileAt(chunk, 0, 0);
      expect(tile).toBeDefined();
      expect(tile?.terrain).toBe('grass');
    });

    it('should return undefined for out of bounds', () => {
      const chunk = createChunk(0, 0);
      expect(getTileAt(chunk, -1, 0)).toBeUndefined();
      expect(getTileAt(chunk, CHUNK_SIZE, 0)).toBeUndefined();
      expect(getTileAt(chunk, 0, -1)).toBeUndefined();
      expect(getTileAt(chunk, 0, CHUNK_SIZE)).toBeUndefined();
    });
  });

  describe('setTileAt', () => {
    it('should set tile at valid position', () => {
      const chunk = createChunk(0, 0);
      const newTile: Tile = {
        terrain: 'water',
        moisture: 1,
        fertility: 0,
      };

      const result = setTileAt(chunk, 5, 5, newTile);
      expect(result).toBe(true);

      const tile = getTileAt(chunk, 5, 5);
      expect(tile?.terrain).toBe('water');
    });

    it('should return false for out of bounds', () => {
      const chunk = createChunk(0, 0);
      const newTile: Tile = {
        terrain: 'water',
        moisture: 1,
        fertility: 0,
      };

      expect(setTileAt(chunk, -1, 0, newTile)).toBe(false);
      expect(setTileAt(chunk, CHUNK_SIZE, 0, newTile)).toBe(false);
    });
  });

  describe('coordinate conversions', () => {
    it('should convert world to chunk coordinates', () => {
      expect(worldToChunk(0, 0)).toEqual({ chunkX: 0, chunkY: 0 });
      expect(worldToChunk(31, 31)).toEqual({ chunkX: 0, chunkY: 0 });
      expect(worldToChunk(32, 32)).toEqual({ chunkX: 1, chunkY: 1 });
      expect(worldToChunk(-1, -1)).toEqual({ chunkX: -1, chunkY: -1 });
    });

    it('should convert world to local chunk coordinates', () => {
      expect(worldToLocal(0, 0)).toEqual({ localX: 0, localY: 0 });
      expect(worldToLocal(15, 15)).toEqual({ localX: 15, localY: 15 });
      expect(worldToLocal(32, 32)).toEqual({ localX: 0, localY: 0 });
      expect(worldToLocal(33, 33)).toEqual({ localX: 1, localY: 1 });
    });

    it('should handle negative coordinates correctly', () => {
      const { localX, localY } = worldToLocal(-1, -1);
      expect(localX).toBeGreaterThanOrEqual(0);
      expect(localX).toBeLessThan(CHUNK_SIZE);
      expect(localY).toBeGreaterThanOrEqual(0);
      expect(localY).toBeLessThan(CHUNK_SIZE);
    });

    it('should convert chunk + local to world coordinates', () => {
      expect(chunkToWorld(0, 0, 0, 0)).toEqual({ worldX: 0, worldY: 0 });
      expect(chunkToWorld(1, 1, 0, 0)).toEqual({ worldX: 32, worldY: 32 });
      expect(chunkToWorld(0, 0, 15, 15)).toEqual({ worldX: 15, worldY: 15 });
      expect(chunkToWorld(2, 3, 10, 20)).toEqual({ worldX: 74, worldY: 116 });
    });

    it('should roundtrip coordinates', () => {
      const worldX = 123;
      const worldY = 456;

      const { chunkX, chunkY } = worldToChunk(worldX, worldY);
      const { localX, localY } = worldToLocal(worldX, worldY);
      const { worldX: newWorldX, worldY: newWorldY } = chunkToWorld(
        chunkX,
        chunkY,
        localX,
        localY
      );

      expect(newWorldX).toBe(worldX);
      expect(newWorldY).toBe(worldY);
    });
  });

  describe('getChunkKey', () => {
    it('should generate unique keys', () => {
      const key1 = getChunkKey(0, 0);
      const key2 = getChunkKey(1, 0);
      const key3 = getChunkKey(0, 1);

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });

    it('should generate same key for same coordinates', () => {
      expect(getChunkKey(5, 10)).toBe(getChunkKey(5, 10));
    });

    it('should handle negative coordinates', () => {
      const key = getChunkKey(-1, -1);
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
    });
  });
});
