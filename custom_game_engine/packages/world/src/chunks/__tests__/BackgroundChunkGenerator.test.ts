import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BackgroundChunkGenerator } from '../BackgroundChunkGenerator.js';
import { ChunkManager } from '../ChunkManager.js';
import { TerrainGenerator } from '../../terrain/TerrainGenerator.js';
import { createChunk } from '../Chunk.js';
import type { World } from '@ai-village/core';

describe('BackgroundChunkGenerator', () => {
  let chunkManager: ChunkManager;
  let terrainGenerator: TerrainGenerator;
  let generator: BackgroundChunkGenerator;
  let mockWorld: World;

  beforeEach(() => {
    chunkManager = new ChunkManager();
    terrainGenerator = new TerrainGenerator('test-seed');
    generator = new BackgroundChunkGenerator(chunkManager, terrainGenerator);

    // Mock world with minimal required properties
    mockWorld = {
      tick: 0,
      eventBus: {
        emit: vi.fn(),
      },
      // Mock query method for terrain generation
      query: vi.fn(() => ({
        with: vi.fn().mockReturnThis(),
        executeEntities: vi.fn(() => []),
      })),
      // Mock addEntity for terrain generation
      addEntity: vi.fn(),
      // Mock createEntity for animal spawning
      createEntity: vi.fn(() => ({
        id: 'test-entity-' + Math.random(),
        addComponent: vi.fn(),
        hasComponent: vi.fn(() => false),
        getComponent: vi.fn(),
      })),
    } as unknown as World;
  });

  describe('queueChunk', () => {
    it('should queue a chunk with HIGH priority', () => {
      generator.queueChunk({
        chunkX: 0,
        chunkY: 0,
        priority: 'HIGH',
        requestedBy: 'test',
      });

      const status = generator.getQueueStatus();
      expect(status.high).toBe(1);
      expect(status.total).toBe(1);
    });

    it('should queue a chunk with MEDIUM priority', () => {
      generator.queueChunk({
        chunkX: 0,
        chunkY: 0,
        priority: 'MEDIUM',
        requestedBy: 'test',
      });

      const status = generator.getQueueStatus();
      expect(status.medium).toBe(1);
      expect(status.total).toBe(1);
    });

    it('should queue a chunk with LOW priority', () => {
      generator.queueChunk({
        chunkX: 0,
        chunkY: 0,
        priority: 'LOW',
        requestedBy: 'test',
      });

      const status = generator.getQueueStatus();
      expect(status.low).toBe(1);
      expect(status.total).toBe(1);
    });

    it('should not queue duplicate chunks', () => {
      generator.queueChunk({
        chunkX: 0,
        chunkY: 0,
        priority: 'HIGH',
        requestedBy: 'test',
      });
      generator.queueChunk({
        chunkX: 0,
        chunkY: 0,
        priority: 'HIGH',
        requestedBy: 'test',
      });

      const status = generator.getQueueStatus();
      expect(status.high).toBe(1);
      expect(status.total).toBe(1);
    });

    it('should not queue already generated chunks', () => {
      // Pre-generate chunk
      const chunk = chunkManager.getChunk(0, 0);
      terrainGenerator.generateChunk(chunk, mockWorld);

      generator.queueChunk({
        chunkX: 0,
        chunkY: 0,
        priority: 'HIGH',
        requestedBy: 'test',
      });

      const status = generator.getQueueStatus();
      expect(status.high).toBe(0);
      expect(status.total).toBe(0);
    });
  });

  describe('queueChunkGrid', () => {
    it('should queue a 3×3 grid (radius 1)', () => {
      generator.queueChunkGrid(0, 0, 1, 'HIGH', 'test');

      const status = generator.getQueueStatus();
      expect(status.high).toBe(9); // 3×3 = 9 chunks
      expect(status.total).toBe(9);
    });

    it('should queue a 5×5 grid (radius 2)', () => {
      generator.queueChunkGrid(0, 0, 2, 'MEDIUM', 'test');

      const status = generator.getQueueStatus();
      expect(status.medium).toBe(25); // 5×5 = 25 chunks
      expect(status.total).toBe(25);
    });

    it('should handle different priority levels', () => {
      generator.queueChunkGrid(0, 0, 1, 'LOW', 'test');

      const status = generator.getQueueStatus();
      expect(status.low).toBe(9);
      expect(status.total).toBe(9);
    });
  });

  describe('processQueue', () => {
    it('should not process before throttle interval', () => {
      generator.queueChunk({
        chunkX: 0,
        chunkY: 0,
        priority: 'HIGH',
        requestedBy: 'test',
      });

      // Process at tick 0
      try {
        generator.processQueue(mockWorld, 0);
      } catch (e) {
        console.error('Process queue error:', e);
        throw e;
      }
      expect(mockWorld.eventBus.emit).toHaveBeenCalled();

      // Clear mock
      vi.clearAllMocks();

      // Process at tick 1 (before throttle interval of 2 ticks)
      generator.queueChunk({
        chunkX: 1,
        chunkY: 1,
        priority: 'HIGH',
        requestedBy: 'test',
      });
      generator.processQueue(mockWorld, 1);

      // Should not have processed
      expect(mockWorld.eventBus.emit).not.toHaveBeenCalled();
    });

    it('should process after throttle interval', () => {
      generator.queueChunk({
        chunkX: 0,
        chunkY: 0,
        priority: 'HIGH',
        requestedBy: 'test',
      });

      // Process at tick 0
      generator.processQueue(mockWorld, 0);
      expect(mockWorld.eventBus.emit).toHaveBeenCalled();

      // Clear mock
      vi.clearAllMocks();

      // Process at tick 2 (after throttle interval)
      generator.queueChunk({
        chunkX: 1,
        chunkY: 1,
        priority: 'HIGH',
        requestedBy: 'test',
      });
      generator.processQueue(mockWorld, 2);

      // Should have processed
      expect(mockWorld.eventBus.emit).toHaveBeenCalled();
    });

    it('should prioritize HIGH over MEDIUM over LOW', () => {
      // Queue in reverse priority order
      generator.queueChunk({
        chunkX: 0,
        chunkY: 0,
        priority: 'LOW',
        requestedBy: 'test',
      });
      generator.queueChunk({
        chunkX: 1,
        chunkY: 1,
        priority: 'MEDIUM',
        requestedBy: 'test',
      });
      generator.queueChunk({
        chunkX: 2,
        chunkY: 2,
        priority: 'HIGH',
        requestedBy: 'test',
      });

      // Process first chunk
      generator.processQueue(mockWorld, 0);

      // Should process HIGH priority chunk (2,2)
      expect(mockWorld.eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'chunk_background_generated',
          data: expect.objectContaining({
            chunkX: 2,
            chunkY: 2,
            priority: 'HIGH',
          }),
        })
      );

      // Process second chunk
      vi.clearAllMocks();
      generator.processQueue(mockWorld, 2);

      // Should process MEDIUM priority chunk (1,1)
      expect(mockWorld.eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'chunk_background_generated',
          data: expect.objectContaining({
            chunkX: 1,
            chunkY: 1,
            priority: 'MEDIUM',
          }),
        })
      );

      // Process third chunk
      vi.clearAllMocks();
      generator.processQueue(mockWorld, 4);

      // Should process LOW priority chunk (0,0)
      expect(mockWorld.eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'chunk_background_generated',
          data: expect.objectContaining({
            chunkX: 0,
            chunkY: 0,
            priority: 'LOW',
          }),
        })
      );
    });

    it('should generate chunk terrain', () => {
      generator.queueChunk({
        chunkX: 5,
        chunkY: 10,
        priority: 'HIGH',
        requestedBy: 'test',
      });

      generator.processQueue(mockWorld, 0);

      // Verify chunk was generated
      const chunk = chunkManager.getChunk(5, 10);
      expect(chunk.generated).toBe(true);
      expect(chunk.x).toBe(5);
      expect(chunk.y).toBe(10);
    });

    it('should emit chunk_background_generated event', () => {
      generator.queueChunk({
        chunkX: 3,
        chunkY: 7,
        priority: 'MEDIUM',
        requestedBy: 'soul_creation',
      });

      generator.processQueue(mockWorld, 0);

      expect(mockWorld.eventBus.emit).toHaveBeenCalledWith({
        type: 'chunk_background_generated',
        source: 'BackgroundChunkGenerator',
        data: {
          chunkX: 3,
          chunkY: 7,
          priority: 'MEDIUM',
          requestedBy: 'soul_creation',
          tick: 0,
        },
      });
    });
  });

  describe('getQueueStatus', () => {
    it('should return correct status for mixed priorities', () => {
      generator.queueChunk({
        chunkX: 0,
        chunkY: 0,
        priority: 'HIGH',
        requestedBy: 'test',
      });
      generator.queueChunk({
        chunkX: 1,
        chunkY: 1,
        priority: 'HIGH',
        requestedBy: 'test',
      });
      generator.queueChunk({
        chunkX: 2,
        chunkY: 2,
        priority: 'MEDIUM',
        requestedBy: 'test',
      });
      generator.queueChunk({
        chunkX: 3,
        chunkY: 3,
        priority: 'LOW',
        requestedBy: 'test',
      });

      const status = generator.getQueueStatus();
      expect(status.high).toBe(2);
      expect(status.medium).toBe(1);
      expect(status.low).toBe(1);
      expect(status.total).toBe(4);
    });

    it('should return zero status for empty queue', () => {
      const status = generator.getQueueStatus();
      expect(status.high).toBe(0);
      expect(status.medium).toBe(0);
      expect(status.low).toBe(0);
      expect(status.total).toBe(0);
    });
  });

  describe('clearQueue', () => {
    it('should clear all queues', () => {
      generator.queueChunk({
        chunkX: 0,
        chunkY: 0,
        priority: 'HIGH',
        requestedBy: 'test',
      });
      generator.queueChunk({
        chunkX: 1,
        chunkY: 1,
        priority: 'MEDIUM',
        requestedBy: 'test',
      });
      generator.queueChunk({
        chunkX: 2,
        chunkY: 2,
        priority: 'LOW',
        requestedBy: 'test',
      });

      generator.clearQueue();

      const status = generator.getQueueStatus();
      expect(status.total).toBe(0);
    });
  });

  describe('constructor configuration', () => {
    it('should accept custom throttle interval', () => {
      const customGenerator = new BackgroundChunkGenerator(
        chunkManager,
        terrainGenerator,
        5 // 5 tick throttle
      );

      customGenerator.queueChunk({
        chunkX: 0,
        chunkY: 0,
        priority: 'HIGH',
        requestedBy: 'test',
      });

      // Process at tick 0
      customGenerator.processQueue(mockWorld, 0);
      expect(mockWorld.eventBus.emit).toHaveBeenCalled();

      // Clear mock
      vi.clearAllMocks();

      // Process at tick 4 (before 5 tick throttle)
      customGenerator.queueChunk({
        chunkX: 1,
        chunkY: 1,
        priority: 'HIGH',
        requestedBy: 'test',
      });
      customGenerator.processQueue(mockWorld, 4);

      // Should not have processed
      expect(mockWorld.eventBus.emit).not.toHaveBeenCalled();
    });
  });
});
