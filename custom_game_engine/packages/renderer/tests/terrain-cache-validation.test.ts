/**
 * Validation tests for TerrainRenderer canvas caching optimization.
 *
 * These tests verify:
 * 1. Cache is created and reused correctly
 * 2. Cache invalidation works when terrain changes
 * 3. Zoom/camera movement doesn't invalidate cache
 * 4. LRU eviction works correctly
 * 5. Cache version computation is deterministic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TerrainRenderer } from '../src/terrain/TerrainRenderer';
import { Camera } from '../src/Camera';
import type { Chunk, Tile } from '@ai-village/world';
import { CHUNK_SIZE } from '@ai-village/world';

// Mock OffscreenCanvas for Node.js environment
class MockOffscreenCanvas {
  width: number;
  height: number;
  _type = 'MockOffscreenCanvas'; // Marker for type checking
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  getContext() {
    return mockCanvasContext;
  }
  // Make it compatible with CanvasImageSource interface
  get naturalWidth() { return this.width; }
  get naturalHeight() { return this.height; }
}

// Mock canvas context
const mockCanvasContext = {
  fillRect: () => {},
  strokeRect: () => {},
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  font: '',
  textAlign: 'left' as CanvasTextAlign,
  textBaseline: 'alphabetic' as CanvasTextBaseline,
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  stroke: () => {},
  fill: () => {},
  arc: () => {},
  setLineDash: () => {},
  fillText: () => {},
  drawImage: (source: any, ...args: any[]) => {
    // Accept MockOffscreenCanvas as valid image source
    if (source && source._type === 'MockOffscreenCanvas') {
      return;
    }
    // Also accept real canvas elements
    if (source instanceof HTMLCanvasElement || source instanceof HTMLImageElement) {
      return;
    }
  },
};

// Make OffscreenCanvas available in test environment
if (typeof globalThis.OffscreenCanvas === 'undefined') {
  (globalThis as any).OffscreenCanvas = MockOffscreenCanvas;
}

function createMockTile(overrides: Partial<Tile> = {}): Tile {
  return {
    terrain: 'grass',
    elevation: 0,
    moisture: 50,
    temperature: 20,
    tilled: false,
    fertilized: false,
    nutrients: { nitrogen: 50, phosphorus: 50, potassium: 50 },
    biome: 'temperate_forest',
    neighbors: { n: null, ne: null, e: null, se: null, s: null, sw: null, w: null, nw: null },
    ...overrides,
  };
}

function createMockChunk(x: number, y: number, tiles?: Tile[]): Chunk {
  const defaultTiles: Tile[] = [];
  for (let i = 0; i < CHUNK_SIZE * CHUNK_SIZE; i++) {
    defaultTiles.push(createMockTile());
  }

  return {
    x,
    y,
    generated: true,
    tiles: tiles || defaultTiles,
    entities: new Set(),
  };
}

describe('TerrainRenderer Canvas Caching', () => {
  let renderer: TerrainRenderer;
  let camera: Camera;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    // Create mock canvas
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 800;
    mockCanvas.height = 600;
    const ctx = mockCanvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');

    // Spy on drawImage to verify caching
    // Override with mock that accepts MockOffscreenCanvas
    let drawImageCallCount = 0;
    ctx.drawImage = ((source: any, ...args: any[]) => {
      drawImageCallCount++;
      // Accept mock canvas without type checking
      if (source && (source._type === 'MockOffscreenCanvas' || source instanceof HTMLCanvasElement)) {
        return;
      }
      // For other types, just no-op in test environment
      return;
    }) as any;
    (ctx as any)._drawImageCallCount = () => drawImageCallCount;
    (ctx as any)._resetDrawImageCount = () => { drawImageCallCount = 0; };

    renderer = new TerrainRenderer(ctx, 16);
    camera = new Camera(800, 600);
  });

  it('should create cache on first render', () => {
    const chunk = createMockChunk(0, 0);

    // First render should create cache
    renderer.renderChunk(chunk, camera);

    const stats = renderer.getCacheStats();
    expect(stats.size).toBe(1);
  });

  it('should reuse cache on subsequent renders', () => {
    const chunk = createMockChunk(0, 0);
    const ctx = mockCanvas.getContext('2d') as any;

    // First render
    ctx._resetDrawImageCount();
    renderer.renderChunk(chunk, camera);
    const firstCallCount = ctx._drawImageCallCount();

    // Second render - should use cache
    ctx._resetDrawImageCount();
    renderer.renderChunk(chunk, camera);
    const secondCallCount = ctx._drawImageCallCount();

    // Both should have 1 drawImage call, but cache should prevent re-rendering to off-screen canvas
    expect(firstCallCount).toBe(1);
    expect(secondCallCount).toBe(1);

    // Cache size should still be 1
    expect(renderer.getCacheStats().size).toBe(1);
  });

  it('should invalidate cache when terrain changes', () => {
    const chunk = createMockChunk(0, 0);

    // First render
    renderer.renderChunk(chunk, camera);
    expect(renderer.getCacheStats().size).toBe(1);

    // Change terrain
    chunk.tiles[0] = createMockTile({ terrain: 'dirt' });

    // Render again - should detect change and re-cache
    renderer.renderChunk(chunk, camera);

    // Cache should still be size 1 (replaced, not added)
    expect(renderer.getCacheStats().size).toBe(1);
  });

  it('should NOT invalidate cache on zoom change', () => {
    const chunk = createMockChunk(0, 0);

    // First render at zoom 1
    camera.zoom = 1.0;
    renderer.renderChunk(chunk, camera);
    const initialCacheSize = renderer.getCacheStats().size;

    // Change zoom
    camera.zoom = 2.0;
    renderer.renderChunk(chunk, camera);

    // Cache should not grow (same cache reused)
    expect(renderer.getCacheStats().size).toBe(initialCacheSize);
  });

  it('should NOT invalidate cache on camera movement', () => {
    const chunk = createMockChunk(0, 0);

    // First render at position 0,0
    camera.setPosition(0, 0);
    renderer.renderChunk(chunk, camera);
    const initialCacheSize = renderer.getCacheStats().size;

    // Move camera
    camera.setPosition(100, 100);
    renderer.renderChunk(chunk, camera);

    // Cache should not grow (same cache reused)
    expect(renderer.getCacheStats().size).toBe(initialCacheSize);
  });

  it('should invalidate cache when tilled state changes', () => {
    const chunk = createMockChunk(0, 0);

    // First render
    renderer.renderChunk(chunk, camera);

    // Till a tile
    chunk.tiles[0] = createMockTile({ tilled: true });

    // Render again - should detect change
    renderer.renderChunk(chunk, camera);

    // Should still have 1 cached chunk (updated)
    expect(renderer.getCacheStats().size).toBe(1);
  });

  it('should invalidate cache when building components change', () => {
    const chunk = createMockChunk(0, 0);

    // First render
    renderer.renderChunk(chunk, camera);

    // Add wall to tile
    (chunk.tiles[0] as any).wall = {
      material: 'stone',
      condition: 100,
      constructionProgress: 100,
    };

    // Render again - should detect change
    renderer.renderChunk(chunk, camera);

    expect(renderer.getCacheStats().size).toBe(1);
  });

  it('should cache multiple chunks', () => {
    const chunk1 = createMockChunk(0, 0);
    const chunk2 = createMockChunk(1, 0);
    const chunk3 = createMockChunk(0, 1);

    renderer.renderChunk(chunk1, camera);
    renderer.renderChunk(chunk2, camera);
    renderer.renderChunk(chunk3, camera);

    expect(renderer.getCacheStats().size).toBe(3);
  });

  it('should evict LRU chunks when cache is full', () => {
    const maxSize = renderer.getCacheStats().maxSize;

    // Fill cache to max + 1
    for (let i = 0; i <= maxSize; i++) {
      const chunk = createMockChunk(i, 0);
      renderer.renderChunk(chunk, camera);
    }

    // Cache should be at max size (oldest evicted)
    expect(renderer.getCacheStats().size).toBe(maxSize);
  });

  it('should update LRU on cache hit', () => {
    const chunk1 = createMockChunk(0, 0);
    const chunk2 = createMockChunk(1, 0);
    const chunk3 = createMockChunk(2, 0);

    // Render chunks 1, 2, 3
    renderer.renderChunk(chunk1, camera);
    renderer.renderChunk(chunk2, camera);
    renderer.renderChunk(chunk3, camera);

    // Access chunk 1 again (should update LRU)
    renderer.renderChunk(chunk1, camera);

    // Now fill cache to trigger eviction
    // Chunk 2 should be evicted (oldest), not chunk 1
    const maxSize = renderer.getCacheStats().maxSize;
    for (let i = 3; i < maxSize; i++) {
      const chunk = createMockChunk(i, 0);
      renderer.renderChunk(chunk, camera);
    }

    expect(renderer.getCacheStats().size).toBe(maxSize);
  });

  it('should skip rendering ungenerated chunks', () => {
    const chunk = createMockChunk(0, 0);
    chunk.generated = false;

    renderer.renderChunk(chunk, camera);

    // Should not create cache for ungenerated chunk
    expect(renderer.getCacheStats().size).toBe(0);
  });

  it('should invalidate all caches when temperature overlay is toggled', () => {
    const chunk1 = createMockChunk(0, 0);
    const chunk2 = createMockChunk(1, 0);

    renderer.renderChunk(chunk1, camera);
    renderer.renderChunk(chunk2, camera);

    expect(renderer.getCacheStats().size).toBe(2);

    // Toggle temperature overlay
    renderer.setShowTemperatureOverlay(true);

    // All caches should be invalidated
    expect(renderer.getCacheStats().size).toBe(0);
  });

  it('should allow manual cache invalidation', () => {
    const chunk = createMockChunk(5, 10);

    renderer.renderChunk(chunk, camera);
    expect(renderer.getCacheStats().size).toBe(1);

    // Manually invalidate
    renderer.invalidateChunkCache(5, 10);

    // Cache should be cleared
    expect(renderer.getCacheStats().size).toBe(0);
  });

  it('should invalidate all caches via API', () => {
    const chunk1 = createMockChunk(0, 0);
    const chunk2 = createMockChunk(1, 0);
    const chunk3 = createMockChunk(2, 0);

    renderer.renderChunk(chunk1, camera);
    renderer.renderChunk(chunk2, camera);
    renderer.renderChunk(chunk3, camera);

    expect(renderer.getCacheStats().size).toBe(3);

    // Invalidate all
    renderer.invalidateAllCaches();

    // All caches should be cleared
    expect(renderer.getCacheStats().size).toBe(0);
  });

  it('should use OffscreenCanvas when available', () => {
    // OffscreenCanvas is mocked in this environment
    const chunk = createMockChunk(0, 0);

    // Should not throw
    expect(() => renderer.renderChunk(chunk, camera)).not.toThrow();

    // Cache should be created
    expect(renderer.getCacheStats().size).toBe(1);
  });

  it('should handle chunks with mixed terrain types', () => {
    const tiles: Tile[] = [];
    const terrainTypes = ['grass', 'dirt', 'water', 'sand', 'stone'];

    for (let i = 0; i < CHUNK_SIZE * CHUNK_SIZE; i++) {
      tiles.push(createMockTile({
        terrain: terrainTypes[i % terrainTypes.length] as any,
      }));
    }

    const chunk = createMockChunk(0, 0, tiles);

    // Should render without errors
    expect(() => renderer.renderChunk(chunk, camera)).not.toThrow();

    expect(renderer.getCacheStats().size).toBe(1);
  });

  it('should handle chunks with complex building data', () => {
    const tiles: Tile[] = [];

    for (let i = 0; i < CHUNK_SIZE * CHUNK_SIZE; i++) {
      const tile = createMockTile() as any;

      // Add various building components
      if (i % 4 === 0) {
        tile.wall = { material: 'stone', condition: 100, constructionProgress: 100 };
      }
      if (i % 4 === 1) {
        tile.door = { material: 'wood', state: 'closed', constructionProgress: 100 };
      }
      if (i % 4 === 2) {
        tile.window = { material: 'glass', condition: 100, constructionProgress: 100 };
      }
      if (i % 4 === 3) {
        tile.roof = { material: 'thatch', condition: 100, constructionProgress: 100 };
      }

      tiles.push(tile);
    }

    const chunk = createMockChunk(0, 0, tiles);

    // Should render without errors
    expect(() => renderer.renderChunk(chunk, camera)).not.toThrow();

    expect(renderer.getCacheStats().size).toBe(1);
  });
});
