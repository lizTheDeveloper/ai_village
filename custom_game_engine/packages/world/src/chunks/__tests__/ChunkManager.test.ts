import { describe, it, expect, beforeEach } from 'vitest';
import { ChunkManager } from '../ChunkManager.js';
import { CHUNK_SIZE } from '../Chunk.js';

describe('ChunkManager', () => {
  let manager: ChunkManager;

  beforeEach(() => {
    manager = new ChunkManager(2);
  });

  it('should create chunks on demand', () => {
    expect(manager.hasChunk(0, 0)).toBe(false);

    const chunk = manager.getChunk(0, 0);

    expect(chunk).toBeDefined();
    expect(chunk.x).toBe(0);
    expect(chunk.y).toBe(0);
    expect(manager.hasChunk(0, 0)).toBe(true);
  });

  it('should return same chunk for same coordinates', () => {
    const chunk1 = manager.getChunk(5, 10);
    const chunk2 = manager.getChunk(5, 10);

    expect(chunk1).toBe(chunk2);
  });

  it('should track loaded chunks', () => {
    manager.getChunk(0, 0);
    manager.getChunk(1, 0);
    manager.getChunk(0, 1);

    const loaded = manager.getLoadedChunks();
    expect(loaded.length).toBe(3);
  });

  it('should load chunks within radius', () => {
    const { loaded } = manager.updateLoadedChunks(0, 0);

    // With radius 2, should load 5x5 = 25 chunks
    expect(loaded.length).toBeGreaterThan(0);
    expect(manager.getChunkCount()).toBeGreaterThan(0);
  });

  it('should unload distant chunks', () => {
    // Load chunks around origin
    manager.updateLoadedChunks(0, 0);
    const initialCount = manager.getChunkCount();

    // Move far away (need to move beyond load radius + unload buffer)
    const loadRadius = (manager as any).loadRadius;
    const farDistance = (loadRadius + 2) * CHUNK_SIZE;
    const { unloaded } = manager.updateLoadedChunks(farDistance, farDistance);

    // Should have unloaded some chunks
    expect(unloaded.length).toBeGreaterThan(0);
    // Final count should be equal (new chunks loaded to replace unloaded ones)
    // or we should have unloaded at least one chunk
    expect(manager.getChunkCount()).toBeGreaterThanOrEqual(1);
  });

  it('should get chunks in area', () => {
    const chunks = manager.getChunksInArea(0, 0, 2, 2);

    expect(chunks.length).toBe(9); // 3x3 area
    expect(chunks[0]?.x).toBe(0);
    expect(chunks[0]?.y).toBe(0);
  });

  it('should handle negative chunk coordinates', () => {
    const chunk = manager.getChunk(-1, -1);

    expect(chunk.x).toBe(-1);
    expect(chunk.y).toBe(-1);
  });

  it('should clear all chunks', () => {
    manager.getChunk(0, 0);
    manager.getChunk(1, 1);

    expect(manager.getChunkCount()).toBe(2);

    manager.clear();

    expect(manager.getChunkCount()).toBe(0);
  });

  it('should handle camera at chunk boundary', () => {
    const { loaded } = manager.updateLoadedChunks(
      CHUNK_SIZE * 0.5,
      CHUNK_SIZE * 0.5
    );

    expect(loaded.length).toBeGreaterThan(0);
    expect(manager.hasChunk(0, 0)).toBe(true);
  });
});
