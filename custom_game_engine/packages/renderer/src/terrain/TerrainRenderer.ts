import {
  CHUNK_SIZE,
  TERRAIN_COLORS,
  type Chunk,
  type Tile,
} from '@ai-village/world';
import type { Camera } from '../Camera.js';

// =============================================================================
// PERFORMANCE: Pre-computed color lookup tables (avoid parseInt/slice in hot loop)
// =============================================================================

/** Pre-computed wall material colors as RGB tuples for fast rgba() string building */
const WALL_COLORS_RGB: Record<string, [number, number, number]> = {
  wood: [139, 115, 85],
  stone: [107, 107, 107],
  mud_brick: [160, 130, 109],
  ice: [184, 230, 255],
  metal: [74, 74, 74],
  glass: [135, 206, 235],
  thatch: [212, 184, 150],
};
const DEFAULT_WALL_RGB: [number, number, number] = [107, 107, 107];

/** Pre-computed door material colors as RGB tuples */
const DOOR_COLORS_RGB: Record<string, [number, number, number]> = {
  wood: [101, 67, 33],
  stone: [80, 80, 80],
  metal: [56, 56, 56],
  cloth: [139, 69, 19],
};
const DEFAULT_DOOR_RGB: [number, number, number] = [101, 67, 33];

/** Pre-computed roof material colors as RGB tuples */
const ROOF_COLORS_RGB: Record<string, [number, number, number]> = {
  thatch: [196, 163, 90],  // Golden straw
  wood: [139, 105, 20],    // Darker wood
  tile: [184, 92, 56],     // Terracotta
  slate: [74, 85, 104],    // Gray slate
  metal: [107, 114, 128],  // Metallic gray
};
const DEFAULT_ROOF_RGB: [number, number, number] = [196, 163, 90];

// =============================================================================
// CHUNK CACHE TYPES
// =============================================================================

interface CachedChunk {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  version: number;
  lastUsed: number; // Tick number for LRU eviction
}

// =============================================================================
// CHUNK VERSION COMPUTATION
// =============================================================================

/**
 * Compute a version hash for a chunk's tiles.
 * This is a simple but effective hash that changes when tile data changes.
 * Uses FNV-1a hash algorithm for speed.
 */
function computeChunkVersion(chunk: Chunk): number {
  let hash = 2166136261; // FNV offset basis

  for (const tile of chunk.tiles) {
    // Hash terrain type
    hash ^= tile.terrain.charCodeAt(0);
    hash = Math.imul(hash, 16777619); // FNV prime

    // Hash key tile properties that affect rendering
    hash ^= (tile.tilled ? 1 : 0) | ((tile.moisture > 60 ? 1 : 0) << 1) | ((tile.fertilized ? 1 : 0) << 2);
    hash = Math.imul(hash, 16777619);

    // Hash building components if present
    const tileWithBuilding = tile as typeof tile & {
      wall?: { material: string; condition: number; constructionProgress?: number };
      door?: { material: string; state: string; constructionProgress?: number };
      window?: { material: string; condition: number; constructionProgress?: number };
      roof?: { material: string; condition: number; constructionProgress?: number };
    };

    if (tileWithBuilding.wall) {
      hash ^= tileWithBuilding.wall.material.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
      hash ^= Math.floor(tileWithBuilding.wall.constructionProgress ?? 100);
      hash = Math.imul(hash, 16777619);
    }

    if (tileWithBuilding.door) {
      hash ^= tileWithBuilding.door.material.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
      hash ^= tileWithBuilding.door.state.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }

    if (tileWithBuilding.window) {
      hash ^= Math.floor(tileWithBuilding.window.constructionProgress ?? 100);
      hash = Math.imul(hash, 16777619);
    }

    if (tileWithBuilding.roof) {
      hash ^= tileWithBuilding.roof.material.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
      hash ^= Math.floor(tileWithBuilding.roof.constructionProgress ?? 100);
      hash = Math.imul(hash, 16777619);
    }
  }

  return hash >>> 0; // Convert to unsigned 32-bit integer
}

/**
 * Handles rendering of terrain chunks in top-down view.
 * Extracted from Renderer.ts to improve maintainability.
 *
 * PERFORMANCE OPTIMIZATION: Off-screen canvas caching
 * - Each chunk is pre-rendered to an off-screen canvas and cached
 * - Cache is invalidated only when chunk terrain changes (detected via version hash)
 * - Zoom changes do NOT invalidate cache - we just scale the cached canvas
 * - LRU eviction keeps cache size bounded (max 100 chunks = ~1.6MB at 16px tiles)
 */
export class TerrainRenderer {
  private ctx: CanvasRenderingContext2D;
  private tileSize: number;
  private showTemperatureOverlay: boolean = false;
  private hasLoggedTilledTile = false; // Debug flag to log first tilled tile rendering
  private hasLoggedWallRender = false; // Debug flag to log first wall rendering

  // Chunk cache (key = "chunkX,chunkY")
  private chunkCache = new Map<string, CachedChunk>();
  private readonly MAX_CACHED_CHUNKS = 100;
  private currentTick = 0; // Track "time" for LRU eviction

  constructor(ctx: CanvasRenderingContext2D, tileSize: number = 16) {
    this.ctx = ctx;
    this.tileSize = tileSize;
  }

  setShowTemperatureOverlay(show: boolean): void {
    // Temperature overlay affects rendering, so invalidate all caches
    if (this.showTemperatureOverlay !== show) {
      this.invalidateAllCaches();
    }
    this.showTemperatureOverlay = show;
  }

  getShowTemperatureOverlay(): boolean {
    return this.showTemperatureOverlay;
  }

  /**
   * Invalidate cache for a specific chunk.
   * Call this when chunk terrain changes externally.
   */
  invalidateChunkCache(chunkX: number, chunkY: number): void {
    const key = `${chunkX},${chunkY}`;
    this.chunkCache.delete(key);
  }

  /**
   * Invalidate all cached chunks.
   * Call this when global rendering settings change (e.g., temperature overlay toggle).
   */
  invalidateAllCaches(): void {
    this.chunkCache.clear();
  }

  /**
   * Get cache statistics for debugging/monitoring.
   */
  getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.chunkCache.size,
      maxSize: this.MAX_CACHED_CHUNKS,
    };
  }

  /**
   * Create or retrieve a cached off-screen canvas for a chunk.
   * Returns null if cache is invalid and needs re-rendering.
   */
  private getCachedChunkCanvas(chunk: Chunk): CachedChunk | null {
    const key = `${chunk.x},${chunk.y}`;
    const cached = this.chunkCache.get(key);

    // Compute current version of chunk data
    const currentVersion = computeChunkVersion(chunk);

    // Check if cache is valid
    if (cached && cached.version === currentVersion) {
      // Update LRU timestamp
      cached.lastUsed = this.currentTick;
      return cached;
    }

    return null;
  }

  /**
   * Create a new off-screen canvas for caching a chunk.
   * Uses OffscreenCanvas if available, falls back to HTMLCanvasElement.
   */
  private createOffscreenCanvas(): {
    canvas: HTMLCanvasElement | OffscreenCanvas;
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  } {
    const canvasSize = CHUNK_SIZE * this.tileSize;

    // Try OffscreenCanvas first (better performance, doesn't trigger layout)
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(canvasSize, canvasSize);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get OffscreenCanvas 2D context');
      }
      return { canvas, ctx };
    }

    // Fallback to regular HTMLCanvasElement
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get Canvas 2D context');
    }
    return { canvas, ctx };
  }

  /**
   * Evict least recently used cached chunks if cache is full.
   */
  private evictLRUIfNeeded(): void {
    if (this.chunkCache.size < this.MAX_CACHED_CHUNKS) {
      return;
    }

    // Find oldest entry (lowest lastUsed tick)
    // PERF: Iterate Map directly instead of allocating Array.from()
    let oldestKey: string | null = null;
    let oldestTick = Infinity;

    this.chunkCache.forEach((cached, key) => {
      if (cached.lastUsed < oldestTick) {
        oldestTick = cached.lastUsed;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.chunkCache.delete(oldestKey);
    }
  }

  /**
   * Render a chunk to an off-screen canvas and cache it.
   */
  private renderChunkToCache(chunk: Chunk): CachedChunk {
    // Create off-screen canvas
    const { canvas, ctx } = this.createOffscreenCanvas();

    // Render chunk to off-screen canvas (using local coordinates 0-based)
    this.renderChunkToContext(chunk, ctx, 0, 0);

    // Create cache entry
    const cached: CachedChunk = {
      canvas,
      ctx,
      version: computeChunkVersion(chunk),
      lastUsed: this.currentTick,
    };

    // Store in cache (evict LRU if needed)
    const key = `${chunk.x},${chunk.y}`;
    this.evictLRUIfNeeded();
    this.chunkCache.set(key, cached);

    return cached;
  }

  /**
   * Render a chunk's tiles to a given context at a given offset.
   * This is the core rendering logic extracted so it can be used both for
   * off-screen caching and direct rendering.
   *
   * @param chunk - The chunk to render
   * @param ctx - The context to render to
   * @param offsetX - X offset in the context (in pixels)
   * @param offsetY - Y offset in the context (in pixels)
   */
  private renderChunkToContext(
    chunk: Chunk,
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    offsetX: number,
    offsetY: number
  ): void {
    // When rendering to cache, we use tileSize directly (zoom = 1)
    const tilePixelSize = this.tileSize;

    for (let localY = 0; localY < CHUNK_SIZE; localY++) {
      for (let localX = 0; localX < CHUNK_SIZE; localX++) {
        const tile = chunk.tiles[localY * CHUNK_SIZE + localX];
        if (!tile) continue;

        // Calculate screen position (offset-based for cache rendering)
        const screenX = offsetX + localX * tilePixelSize;
        const screenY = offsetY + localY * tilePixelSize;

        // Draw base tile
        const color = TERRAIN_COLORS[tile.terrain];
        ctx.fillStyle = color;
        ctx.fillRect(screenX, screenY, tilePixelSize, tilePixelSize);

        // Draw tilled indicator (VERY PROMINENT - must be clearly visible!)
        if (tile.tilled) {
          // DEBUG: Log first time we detect a tilled tile (to verify rendering is working)
          if (!this.hasLoggedTilledTile) {
            this.hasLoggedTilledTile = true;
          }

          // CRITICAL: Make tilled soil VERY different from untilled dirt
          // Use an EVEN DARKER brown base for maximum distinction
          // This creates extreme contrast with both grass (green) and natural dirt (light brown)
          ctx.fillStyle = 'rgba(45, 25, 10, 1.0)'; // EVEN DARKER, 100% opacity for maximum visibility
          ctx.fillRect(screenX, screenY, tilePixelSize, tilePixelSize);

          // Add EXTRA THICK horizontal furrows (visible even at low zoom)
          // Use nearly black furrows with increased thickness
          ctx.strokeStyle = 'rgba(15, 8, 3, 1.0)'; // Even darker furrows
          ctx.lineWidth = Math.max(4, this.tileSize * 3); // THICKER lines (constant since zoom=1 in cache)
          const furrowCount = 7; // Even more furrows for unmistakable pattern
          const furrowSpacing = tilePixelSize / (furrowCount + 1);

          for (let i = 1; i <= furrowCount; i++) {
            const y = screenY + furrowSpacing * i;
            ctx.beginPath();
            ctx.moveTo(screenX, y);
            ctx.lineTo(screenX + tilePixelSize, y);
            ctx.stroke();
          }

          // Add vertical lines for grid pattern (makes it unmistakable)
          ctx.strokeStyle = 'rgba(15, 8, 3, 0.9)'; // Match furrow color
          ctx.lineWidth = Math.max(3, this.tileSize * 1.5); // Thicker vertical lines
          const verticalCount = 5; // More vertical lines for denser grid
          const verticalSpacing = tilePixelSize / (verticalCount + 1);

          for (let i = 1; i <= verticalCount; i++) {
            const x = screenX + verticalSpacing * i;
            ctx.beginPath();
            ctx.moveTo(x, screenY);
            ctx.lineTo(x, screenY + tilePixelSize);
            ctx.stroke();
          }

          // Add DOUBLE BORDER for maximum visibility
          // Inner border: BRIGHTER orange for extreme visibility
          ctx.strokeStyle = 'rgba(255, 140, 60, 1.0)'; // BRIGHTER orange (increased from 200,120,60)
          ctx.lineWidth = Math.max(4, this.tileSize * 1.5); // THICKER inner border (was 3)
          ctx.strokeRect(screenX + 1, screenY + 1, tilePixelSize - 2, tilePixelSize - 2);

          // Outer border: darker for contrast
          ctx.strokeStyle = 'rgba(90, 50, 20, 1.0)'; // Even darker outer border for more contrast
          ctx.lineWidth = Math.max(3, this.tileSize); // Thicker outer border (was 2)
          ctx.strokeRect(screenX, screenY, tilePixelSize, tilePixelSize);
        }

        // Draw moisture indicator (blue tint for wet tiles)
        if (tile.moisture > 60) {
          const moistureAlpha = ((tile.moisture - 60) / 40) * 0.3; // 0-0.3 based on moisture 60-100
          ctx.fillStyle = `rgba(30, 144, 255, ${moistureAlpha})`;
          ctx.fillRect(screenX, screenY, tilePixelSize, tilePixelSize);
        }

        // Draw fertilized indicator (golden glow)
        if (tile.fertilized) {
          ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)'; // Gold
          ctx.lineWidth = Math.max(1, this.tileSize);
          ctx.strokeRect(screenX, screenY, tilePixelSize, tilePixelSize);
        }

        // ====================================================================
        // TILE-BASED VOXEL BUILDING RENDERING (walls, doors, windows)
        // ====================================================================
        const tileWithBuilding = tile as typeof tile & {
          wall?: { material: string; condition: number; constructionProgress?: number };
          door?: { material: string; state: 'open' | 'closed' | 'locked'; constructionProgress?: number };
          window?: { material: string; condition: number; constructionProgress?: number };
        };

        // Render wall tiles
        if (tileWithBuilding.wall) {
          const wall = tileWithBuilding.wall;
          const progress = wall.constructionProgress ?? 100;
          const alpha = progress >= 100 ? 1.0 : 0.4 + (progress / 100) * 0.4;

          // PERF: Use pre-computed RGB tuples instead of hex parsing
          const rgb = WALL_COLORS_RGB[wall.material] ?? DEFAULT_WALL_RGB;

          // Fill wall tile
          ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
          ctx.fillRect(screenX, screenY, tilePixelSize, tilePixelSize);

          // Add border for wall definition
          ctx.strokeStyle = `rgba(40, 40, 40, ${alpha * 0.8})`;
          ctx.lineWidth = Math.max(1, this.tileSize * 0.5);
          ctx.strokeRect(screenX + 1, screenY + 1, tilePixelSize - 2, tilePixelSize - 2);

          // Show construction progress if incomplete
          if (progress < 100) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = `${Math.max(8, this.tileSize * 6)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${Math.round(progress)}%`, screenX + tilePixelSize / 2, screenY + tilePixelSize / 2);
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
          }
        }

        // Render door tiles
        if (tileWithBuilding.door) {
          const door = tileWithBuilding.door;
          const progress = door.constructionProgress ?? 100;
          const alpha = progress >= 100 ? 1.0 : 0.4 + (progress / 100) * 0.4;

          // PERF: Use pre-computed RGB tuples instead of hex parsing
          const rgb = DOOR_COLORS_RGB[door.material] ?? DEFAULT_DOOR_RGB;

          if (door.state === 'open') {
            // Open door: render as thin outline (passable)
            ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
            ctx.lineWidth = Math.max(2, this.tileSize);
            ctx.strokeRect(screenX + 2, screenY + 2, tilePixelSize - 4, tilePixelSize - 4);
            // Add dashed pattern to indicate open
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(screenX + 4, screenY + 4, tilePixelSize - 8, tilePixelSize - 8);
            ctx.setLineDash([]);
          } else {
            // Closed/locked door: render as solid with handle
            ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
            ctx.fillRect(screenX, screenY, tilePixelSize, tilePixelSize);

            // Door frame (lighter)
            ctx.strokeStyle = `rgba(160, 120, 80, ${alpha})`;
            ctx.lineWidth = Math.max(1, this.tileSize * 0.3);
            ctx.strokeRect(screenX + 1, screenY + 1, tilePixelSize - 2, tilePixelSize - 2);

            // Door handle (small circle on right side)
            ctx.fillStyle = door.state === 'locked' ? 'rgba(200, 200, 80, 0.9)' : 'rgba(180, 140, 100, 0.9)';
            ctx.beginPath();
            ctx.arc(screenX + tilePixelSize * 0.75, screenY + tilePixelSize * 0.5, Math.max(2, this.tileSize), 0, Math.PI * 2);
            ctx.fill();

            // Lock indicator for locked doors
            if (door.state === 'locked') {
              ctx.strokeStyle = 'rgba(200, 200, 80, 0.9)';
              ctx.lineWidth = Math.max(1, this.tileSize * 0.5);
              ctx.strokeRect(screenX + tilePixelSize * 0.7, screenY + tilePixelSize * 0.35, tilePixelSize * 0.1, tilePixelSize * 0.15);
            }
          }
        }

        // Render window tiles
        if (tileWithBuilding.window) {
          const window = tileWithBuilding.window;
          const progress = window.constructionProgress ?? 100;
          const alpha = progress >= 100 ? 0.6 : 0.3 + (progress / 100) * 0.3;

          // Semi-transparent glass effect
          ctx.fillStyle = `rgba(135, 206, 235, ${alpha})`; // Sky blue glass
          ctx.fillRect(screenX, screenY, tilePixelSize, tilePixelSize);

          // Window frame (dark border)
          ctx.strokeStyle = `rgba(60, 40, 30, ${alpha + 0.2})`;
          ctx.lineWidth = Math.max(2, this.tileSize * 0.7);
          ctx.strokeRect(screenX + 2, screenY + 2, tilePixelSize - 4, tilePixelSize - 4);

          // Cross pattern for window panes
          ctx.beginPath();
          ctx.moveTo(screenX + tilePixelSize / 2, screenY + 2);
          ctx.lineTo(screenX + tilePixelSize / 2, screenY + tilePixelSize - 2);
          ctx.moveTo(screenX + 2, screenY + tilePixelSize / 2);
          ctx.lineTo(screenX + tilePixelSize - 2, screenY + tilePixelSize / 2);
          ctx.stroke();
        }

        // Render roof tiles (overlay on interior tiles)
        const tileWithRoof = tile as typeof tile & {
          roof?: { material: string; condition: number; constructionProgress?: number };
        };
        if (tileWithRoof.roof) {
          const roof = tileWithRoof.roof;
          const progress = roof.constructionProgress ?? 100;
          const alpha = progress >= 100 ? 0.7 : 0.3 + (progress / 100) * 0.4;

          // PERF: Use pre-computed RGB tuples instead of hex parsing
          const rgb = ROOF_COLORS_RGB[roof.material] ?? DEFAULT_ROOF_RGB;

          // Draw roof with slight offset to show depth (rendering as if viewed from above)
          // Draw a diagonal pattern to indicate roofing
          ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;

          // Draw roof as semi-transparent overlay with texture pattern
          ctx.fillRect(screenX, screenY, tilePixelSize, tilePixelSize);

          // Add diagonal line pattern to indicate roof texture
          ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.3})`;
          ctx.lineWidth = Math.max(1, this.tileSize * 0.3);

          // Draw diagonal lines for roof texture
          const step = Math.max(3, tilePixelSize / 4);
          for (let i = 0; i < tilePixelSize * 2; i += step) {
            ctx.beginPath();
            ctx.moveTo(screenX + i, screenY);
            ctx.lineTo(screenX, screenY + i);
            ctx.stroke();
          }

          // Show construction progress if incomplete
          if (progress < 100) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = `${Math.max(8, this.tileSize * 6)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${Math.round(progress)}%`, screenX + tilePixelSize / 2, screenY + tilePixelSize / 2);
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
          }
        }

        // Draw temperature overlay (debug feature)
        // Note: Temperature is not currently stored per-tile, but this allows for future expansion
        const tileWithTemp = tile as typeof tile & { temperature?: number };
        if (this.showTemperatureOverlay && tileWithTemp.temperature !== undefined) {
          // Draw semi-transparent background for readability
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(screenX + 2, screenY + 2, tilePixelSize - 4, tilePixelSize - 4);

          // Color-code temperature: cold = blue, warm = orange, hot = red
          let tempColor = '#FFFFFF';
          const temp = tileWithTemp.temperature;
          if (temp < 0) {
            tempColor = '#4FC3F7'; // Cold blue
          } else if (temp < 10) {
            tempColor = '#81C784'; // Cool green
          } else if (temp < 20) {
            tempColor = '#FFD54F'; // Mild yellow
          } else if (temp < 30) {
            tempColor = '#FFB74D'; // Warm orange
          } else {
            tempColor = '#FF6E40'; // Hot red
          }

          ctx.fillStyle = tempColor;
          ctx.font = `bold ${Math.max(8, this.tileSize * 8)}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            Math.round(temp).toString() + '°',
            screenX + tilePixelSize / 2,
            screenY + tilePixelSize / 2
          );
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
        }
      }
    }
  }

  /**
   * Render a single chunk (public API).
   *
   * Handles ungenerated chunks gracefully by skipping rendering.
   * This can happen when camera scrolls faster than background generation.
   *
   * PERFORMANCE: Uses cached off-screen canvas when possible.
   */
  renderChunk(chunk: Chunk, camera: Camera): void {
    // Skip rendering ungenerated chunks
    // This prevents rendering empty/placeholder tiles before generation completes
    if (!chunk.generated) {
      return;
    }

    // Increment tick for LRU tracking
    this.currentTick++;

    // Try to use cached canvas
    let cached = this.getCachedChunkCanvas(chunk);

    // If no valid cache, render to new off-screen canvas
    if (!cached) {
      cached = this.renderChunkToCache(chunk);
    }

    // Draw the cached canvas to the main canvas
    // Calculate world position of chunk's top-left corner
    const worldX = chunk.x * CHUNK_SIZE * this.tileSize;
    const worldY = chunk.y * CHUNK_SIZE * this.tileSize;
    const screen = camera.worldToScreen(worldX, worldY);

    // Size of chunk on screen (affected by zoom)
    const chunkPixelSize = CHUNK_SIZE * this.tileSize * camera.zoom;

    // Draw cached canvas scaled by zoom
    this.ctx.drawImage(
      cached.canvas as CanvasImageSource,
      screen.x,
      screen.y,
      chunkPixelSize,
      chunkPixelSize
    );
  }
}
