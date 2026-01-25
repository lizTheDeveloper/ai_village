/**
 * Tests for TerrainRenderer chunk caching optimization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TerrainRenderer } from '../TerrainRenderer.js';
import { createChunk, CHUNK_SIZE } from '@ai-village/world';
import { Camera } from '../../Camera.js';

describe('TerrainRenderer Chunk Caching', () => {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let renderer: TerrainRenderer;
  let camera: Camera;

  beforeEach(() => {
    // Create a canvas for testing
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    ctx = canvas.getContext('2d')!;

    // Create renderer and camera
    renderer = new TerrainRenderer(ctx, 16);
    camera = new Camera(800, 600);
  });

  it('should initialize with empty cache', () => {
    const stats = renderer.getCacheStats();
    expect(stats.size).toBe(0);
    expect(stats.maxSize).toBe(100);
  });

  it('should cache a chunk after first render', () => {
    const chunk = createChunk(0, 0);
    chunk.generated = true;

    // First render should create cache entry
    renderer.renderChunk(chunk, camera);

    const stats = renderer.getCacheStats();
    expect(stats.size).toBe(1);
  });

  it('should reuse cached chunk on second render', () => {
    const chunk = createChunk(0, 0);
    chunk.generated = true;

    // First render
    renderer.renderChunk(chunk, camera);
    const statsAfterFirst = renderer.getCacheStats();

    // Second render (should use cache)
    renderer.renderChunk(chunk, camera);
    const statsAfterSecond = renderer.getCacheStats();

    // Cache size should stay the same (reused)
    expect(statsAfterSecond.size).toBe(statsAfterFirst.size);
  });

  it('should invalidate cache when chunk data changes', () => {
    const chunk = createChunk(0, 0);
    chunk.generated = true;

    // First render
    renderer.renderChunk(chunk, camera);

    // Modify chunk terrain
    chunk.tiles[0].terrain = 'grass';
    chunk.tiles[0].tilled = true;

    // Render again - should detect change and re-render
    renderer.renderChunk(chunk, camera);

    // Cache should still have 1 entry but it should be updated
    const stats = renderer.getCacheStats();
    expect(stats.size).toBe(1);
  });

  it('should handle multiple chunks in cache', () => {
    const chunks = [
      createChunk(0, 0),
      createChunk(1, 0),
      createChunk(0, 1),
    ];

    chunks.forEach(chunk => {
      chunk.generated = true;
      renderer.renderChunk(chunk, camera);
    });

    const stats = renderer.getCacheStats();
    expect(stats.size).toBe(3);
  });

  it('should evict LRU chunks when cache is full', () => {
    // Create more chunks than the cache can hold
    const chunks: ReturnType<typeof createChunk>[] = [];
    for (let i = 0; i < 105; i++) {
      const chunk = createChunk(i % 10, Math.floor(i / 10));
      chunk.generated = true;
      chunks.push(chunk);
    }

    // Render all chunks
    chunks.forEach(chunk => {
      renderer.renderChunk(chunk, camera);
    });

    const stats = renderer.getCacheStats();
    // Should be capped at max size
    expect(stats.size).toBeLessThanOrEqual(100);
  });

  it('should invalidate specific chunk cache', () => {
    const chunk = createChunk(0, 0);
    chunk.generated = true;

    renderer.renderChunk(chunk, camera);
    expect(renderer.getCacheStats().size).toBe(1);

    renderer.invalidateChunkCache(0, 0);
    expect(renderer.getCacheStats().size).toBe(0);
  });

  it('should invalidate all caches', () => {
    const chunks = [
      createChunk(0, 0),
      createChunk(1, 0),
      createChunk(0, 1),
    ];

    chunks.forEach(chunk => {
      chunk.generated = true;
      renderer.renderChunk(chunk, camera);
    });

    expect(renderer.getCacheStats().size).toBe(3);

    renderer.invalidateAllCaches();
    expect(renderer.getCacheStats().size).toBe(0);
  });

  it('should invalidate all caches when temperature overlay is toggled', () => {
    const chunk = createChunk(0, 0);
    chunk.generated = true;

    renderer.renderChunk(chunk, camera);
    expect(renderer.getCacheStats().size).toBe(1);

    // Toggle temperature overlay (should invalidate caches)
    renderer.setShowTemperatureOverlay(true);
    expect(renderer.getCacheStats().size).toBe(0);
  });

  it('should skip rendering ungenerated chunks', () => {
    const chunk = createChunk(0, 0);
    chunk.generated = false;

    renderer.renderChunk(chunk, camera);

    // Should not create cache entry for ungenerated chunk
    const stats = renderer.getCacheStats();
    expect(stats.size).toBe(0);
  });

  it('should handle zoom changes without invalidating cache', () => {
    const chunk = createChunk(0, 0);
    chunk.generated = true;

    // Render at zoom 1.0
    camera.zoom = 1.0;
    renderer.renderChunk(chunk, camera);
    expect(renderer.getCacheStats().size).toBe(1);

    // Render at zoom 2.0 (should reuse cache, just scale)
    camera.zoom = 2.0;
    renderer.renderChunk(chunk, camera);
    expect(renderer.getCacheStats().size).toBe(1);

    // Render at zoom 0.5
    camera.zoom = 0.5;
    renderer.renderChunk(chunk, camera);
    expect(renderer.getCacheStats().size).toBe(1);
  });
});
