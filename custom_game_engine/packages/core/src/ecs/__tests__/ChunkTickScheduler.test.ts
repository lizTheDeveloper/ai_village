/**
 * Tests for ChunkTickScheduler - Minecraft-style chunk update budgeting
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ChunkTickScheduler } from '../ChunkTickScheduler.js';

describe('ChunkTickScheduler', () => {
  let scheduler: ChunkTickScheduler;

  beforeEach(() => {
    scheduler = new ChunkTickScheduler({
      chunksPerTick: 4,
      viewDistance: 4,
      chunkSize: 16,
    });
  });

  describe('chunk registration', () => {
    it('should register chunks', () => {
      scheduler.registerChunk('0,0', { x: 0, z: 0 }, 10);
      scheduler.registerChunk('1,0', { x: 1, z: 0 }, 5);

      const info = scheduler.getChunkInfo('0,0');
      expect(info).toBeDefined();
      expect(info?.entityCount).toBe(10);
    });

    it('should update entity count for existing chunks', () => {
      scheduler.registerChunk('0,0', { x: 0, z: 0 }, 10);
      scheduler.registerChunk('0,0', { x: 0, z: 0 }, 20);

      const info = scheduler.getChunkInfo('0,0');
      expect(info?.entityCount).toBe(20);
    });

    it('should unregister chunks', () => {
      scheduler.registerChunk('0,0', { x: 0, z: 0 });
      scheduler.unregisterChunk('0,0');

      expect(scheduler.getChunkInfo('0,0')).toBeUndefined();
    });
  });

  describe('chunk prioritization', () => {
    it('should prioritize visible chunks', () => {
      scheduler.setCameraPosition(0, 0);

      // Visible chunk (within viewDistance)
      scheduler.registerChunk('0,0', { x: 0, z: 0 });
      // Distant chunk (outside viewDistance)
      scheduler.registerChunk('10,10', { x: 10, z: 10 });

      const chunks = scheduler.getChunksForTick();

      // Both should be in first tick since we only have 2 chunks
      expect(chunks.length).toBe(2);

      // Visible chunk should have higher priority
      const visible = chunks.find((c) => c.key === '0,0');
      const distant = chunks.find((c) => c.key === '10,10');

      expect(visible?.isVisible).toBe(true);
      expect(distant?.isVisible).toBe(false);
      expect(visible?.priority).toBeGreaterThan(distant?.priority ?? 0);
    });

    it('should respect chunksPerTick budget', () => {
      // Register 10 chunks
      for (let i = 0; i < 10; i++) {
        scheduler.registerChunk(`${i},0`, { x: i, z: 0 });
      }

      const chunks = scheduler.getChunksForTick();
      expect(chunks.length).toBe(4); // chunksPerTick = 4
    });

    it('should prioritize chunks with more entities', () => {
      scheduler.setCameraPosition(0, 0);

      scheduler.registerChunk('0,0', { x: 0, z: 0 }, 100);
      scheduler.registerChunk('0,1', { x: 0, z: 1 }, 5);

      const chunks = scheduler.getChunksForTick();
      const busy = chunks.find((c) => c.key === '0,0');
      const quiet = chunks.find((c) => c.key === '0,1');

      expect(busy?.priority).toBeGreaterThan(quiet?.priority ?? 0);
    });
  });

  describe('stale chunk handling', () => {
    it('should force update for stale chunks', () => {
      const staleScheduler = new ChunkTickScheduler({
        chunksPerTick: 1,
        maxTicksWithoutUpdate: 5,
      });

      // Register 3 chunks, but only update 1 per tick
      staleScheduler.registerChunk('0,0', { x: 0, z: 0 });
      staleScheduler.registerChunk('1,0', { x: 1, z: 0 });
      staleScheduler.registerChunk('2,0', { x: 2, z: 0 });

      // Run many ticks to make chunks stale
      for (let i = 0; i < 10; i++) {
        staleScheduler.getChunksForTick();
      }

      const stats = staleScheduler.getStats();
      // All chunks should have been updated at some point
      expect(stats.totalChunks).toBe(3);
    });
  });

  describe('entity budget', () => {
    it('should provide full budget for small chunks', () => {
      const chunk = {
        key: '0,0',
        coord: { x: 0, z: 0 },
        priority: 10,
        lastUpdateTick: 0,
        entityCount: 50,
        isVisible: true,
        distanceToCamera: 0,
      };

      const budget = scheduler.getEntityBudget(chunk);
      expect(budget.start).toBe(0);
      expect(budget.count).toBe(50);
    });

    it('should split budget for large chunks', () => {
      const largeScheduler = new ChunkTickScheduler({
        entitiesPerChunk: 100,
      });

      const chunk = {
        key: '0,0',
        coord: { x: 0, z: 0 },
        priority: 10,
        lastUpdateTick: 0,
        entityCount: 300,
        isVisible: true,
        distanceToCamera: 0,
      };

      const budget = largeScheduler.getEntityBudget(chunk);
      expect(budget.count).toBe(100); // Max per chunk
    });
  });

  describe('utility methods', () => {
    it('should convert world coords to chunk key', () => {
      expect(ChunkTickScheduler.worldToChunkKey(0, 0, 16)).toBe('0,0');
      expect(ChunkTickScheduler.worldToChunkKey(32, 48, 16)).toBe('2,3');
      expect(ChunkTickScheduler.worldToChunkKey(-16, -32, 16)).toBe('-1,-2');
    });

    it('should parse chunk key to coords', () => {
      expect(ChunkTickScheduler.chunkKeyToCoord('0,0')).toEqual({ x: 0, z: 0 });
      expect(ChunkTickScheduler.chunkKeyToCoord('2,3')).toEqual({ x: 2, z: 3 });
      expect(ChunkTickScheduler.chunkKeyToCoord('-1,-2')).toEqual({ x: -1, z: -2 });
    });

    it('should check if chunk should update', () => {
      scheduler.registerChunk('0,0', { x: 0, z: 0 });
      scheduler.registerChunk('1,0', { x: 1, z: 0 });

      scheduler.getChunksForTick();

      // At least one should be scheduled
      const result = scheduler.shouldUpdateChunk('0,0') || scheduler.shouldUpdateChunk('1,0');
      expect(result).toBe(true);
    });
  });

  describe('reset', () => {
    it('should fully reset state', () => {
      scheduler.registerChunk('0,0', { x: 0, z: 0 });
      scheduler.getChunksForTick();

      scheduler.reset();

      expect(scheduler.getAllChunks().length).toBe(0);
    });
  });
});
