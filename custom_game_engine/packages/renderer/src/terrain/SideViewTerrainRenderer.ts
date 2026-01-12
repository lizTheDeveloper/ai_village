import type { Chunk, Tile } from '@ai-village/world';
import type { Camera } from '../Camera.js';
import type { ChunkManager } from '@ai-village/world';
import { CHUNK_SIZE, TERRAIN_COLORS, globalHorizonCalculator } from '@ai-village/world';

/**
 * Handles rendering of terrain in side-view mode with depth/parallax effects.
 * Extracted from Renderer.ts to improve maintainability.
 */
export class SideViewTerrainRenderer {
  private ctx: CanvasRenderingContext2D;
  private tileSize: number;
  private chunkManager: ChunkManager;
  private camera: Camera;

  constructor(
    ctx: CanvasRenderingContext2D,
    tileSize: number,
    chunkManager: ChunkManager,
    camera: Camera
  ) {
    this.ctx = ctx;
    this.tileSize = tileSize;
    this.chunkManager = chunkManager;
    this.camera = camera;
  }

  /**
   * Render terrain as ground cross-section in side-view mode.
   * Shows multiple layers of terrain in front of the camera based on facing direction.
   */
  renderSideViewTerrain(
    startChunkX: number,
    endChunkX: number,
    startChunkY: number,
    endChunkY: number
  ): void {
    // In side-view, we render terrain layers based on facing direction
    // The depth axis (X for E/W, Y for N/S) determines which slices we show

    const baseSeaLevelY = this.camera.viewportHeight * 0.70;
    const seaLevelScreenY = baseSeaLevelY + this.camera.sideViewVerticalOffset;
    const tilePixelSize = this.tileSize * this.camera.zoom;

    const depthAxis = this.camera.getDepthAxis();
    const depthDirection = this.camera.getDepthDirection();
    const maxDepthLayers = 20; // Show this many terrain rows in front (increased from 5)

    // For N/S facing: X is screen horizontal, iterate over Y depth slices
    // For E/W facing: Y is screen horizontal, iterate over X depth slices
    const isNorthSouth = depthAxis === 'y';

    // Get camera position
    const cameraWorldX = Math.floor(this.camera.x / this.tileSize);
    const cameraWorldY = Math.floor(this.camera.y / this.tileSize);

    // Get camera elevation for horizon calculations
    const cameraElevation = this.getTerrainElevationAt(cameraWorldX, cameraWorldY);

    // Render depth layers from back to front
    for (let layerIdx = maxDepthLayers - 1; layerIdx >= 0; layerIdx--) {
      // Calculate world position of this depth layer
      const depthOffset = layerIdx * depthDirection;
      const layerDepthPos = isNorthSouth
        ? cameraWorldY + depthOffset
        : cameraWorldX + depthOffset;

      // Calculate base depth fading (further = more faded)
      const baseDepthFade = 1 - (layerIdx / maxDepthLayers) * 0.3;

      if (isNorthSouth) {
        // North/South facing: iterate X horizontally, layer is at fixed Y
        const chunkY = Math.floor(layerDepthPos / CHUNK_SIZE);
        const localY = layerDepthPos - chunkY * CHUNK_SIZE;
        if (localY < 0 || localY >= CHUNK_SIZE) continue;

        for (let chunkX = startChunkX; chunkX <= endChunkX; chunkX++) {
          if (!this.chunkManager.hasChunk(chunkX, chunkY)) continue;
          const chunk = this.chunkManager.getChunk(chunkX, chunkY);

          for (let localX = 0; localX < CHUNK_SIZE; localX++) {
            const tile = chunk.tiles[localY * CHUNK_SIZE + localX];
            if (!tile) continue;

            const worldTileX = chunkX * CHUNK_SIZE + localX;
            const screenX = (worldTileX * this.tileSize - this.camera.x) * this.camera.zoom
              + this.camera.viewportWidth / 2;

            if (screenX + tilePixelSize < 0 || screenX > this.camera.viewportWidth) continue;

            // Calculate horizon-aware fade based on tile elevation and distance
            const tileElevation = (tile as any).elevation ?? 0;
            const distance = Math.abs(layerIdx); // Depth distance in tiles
            const horizonFade = globalHorizonCalculator.getFogFade(
              cameraElevation,
              tileElevation,
              distance,
              maxDepthLayers
            );

            // Combine base depth fade with horizon curvature fade
            const depthFade = Math.min(baseDepthFade, horizonFade);

            this.renderSideViewTile(tile, screenX, seaLevelScreenY, tilePixelSize, depthFade, layerIdx);
          }
        }
      } else {
        // East/West facing: iterate Y horizontally, layer is at fixed X
        const chunkX = Math.floor(layerDepthPos / CHUNK_SIZE);
        const localX = layerDepthPos - chunkX * CHUNK_SIZE;
        if (localX < 0 || localX >= CHUNK_SIZE) continue;

        for (let chunkY = startChunkY; chunkY <= endChunkY; chunkY++) {
          if (!this.chunkManager.hasChunk(chunkX, chunkY)) continue;
          const chunk = this.chunkManager.getChunk(chunkX, chunkY);

          for (let localY = 0; localY < CHUNK_SIZE; localY++) {
            const tile = chunk.tiles[localY * CHUNK_SIZE + localX];
            if (!tile) continue;

            const worldTileY = chunkY * CHUNK_SIZE + localY;
            const screenX = (worldTileY * this.tileSize - this.camera.y) * this.camera.zoom
              + this.camera.viewportWidth / 2;

            if (screenX + tilePixelSize < 0 || screenX > this.camera.viewportWidth) continue;

            // Calculate horizon-aware fade based on tile elevation and distance
            const tileElevation = (tile as any).elevation ?? 0;
            const distance = Math.abs(layerIdx); // Depth distance in tiles
            const horizonFade = globalHorizonCalculator.getFogFade(
              cameraElevation,
              tileElevation,
              distance,
              maxDepthLayers
            );

            // Combine base depth fade with horizon curvature fade
            const depthFade = Math.min(baseDepthFade, horizonFade);

            this.renderSideViewTile(tile, screenX, seaLevelScreenY, tilePixelSize, depthFade, layerIdx);
          }
        }
      }
    }
  }

  /**
   * Render a single tile in side-view mode.
   */
  private renderSideViewTile(
    tile: Tile,
    screenX: number,
    seaLevelScreenY: number,
    tilePixelSize: number,
    depthFade: number,
    layerIdx: number
  ): void {
    const elevation = (tile as any).elevation ?? 0;
    const elevationOffset = elevation * tilePixelSize;
    const tileScreenY = seaLevelScreenY - elevationOffset;

    // Get base color and apply depth fading
    const baseColor = TERRAIN_COLORS[tile.terrain];
    const color = this.applyDepthFade(baseColor, depthFade);

    // Draw the surface tile
    this.ctx.fillStyle = color;
    this.ctx.fillRect(screenX, tileScreenY, tilePixelSize, tilePixelSize);

    // Draw earth/rock underneath elevated terrain
    if (elevation > 0) {
      for (let h = 1; h <= elevation; h++) {
        const layerY = tileScreenY + h * tilePixelSize;
        if (layerY > this.camera.viewportHeight) break;

        const layerRatio = h / elevation;
        let layerColor: string;
        if (layerRatio < 0.3) {
          layerColor = this.darkenColor('#7a7a7a', 0.9 - h * 0.02);
        } else if (layerRatio < 0.7) {
          layerColor = this.darkenColor('#6b5a4a', 0.9 - h * 0.02);
        } else {
          layerColor = this.darkenColor('#8B7355', 0.9 - h * 0.02);
        }
        this.ctx.fillStyle = this.applyDepthFade(layerColor, depthFade);
        this.ctx.fillRect(screenX, layerY, tilePixelSize, tilePixelSize);
      }
    }

    // Draw underground layers (only for front layer to avoid overdraw)
    if (layerIdx === 0) {
      const startDepth = Math.max(0, -elevation);
      for (let depth = startDepth + 1; depth <= startDepth + 6; depth++) {
        const undergroundY = seaLevelScreenY + depth * tilePixelSize;
        if (undergroundY > this.camera.viewportHeight) break;

        const darkening = 1 - (depth - startDepth) * 0.1;
        this.ctx.fillStyle = this.darkenColor('#8B7355', darkening);
        this.ctx.fillRect(screenX, undergroundY, tilePixelSize, tilePixelSize);
      }
    }

    // Draw water at sea level for water tiles
    if (tile.terrain === 'water') {
      this.ctx.fillStyle = `rgba(100, 150, 200, ${0.6 * depthFade})`;
      this.ctx.fillRect(screenX, seaLevelScreenY, tilePixelSize, tilePixelSize * 2);

      this.ctx.fillStyle = `rgba(200, 230, 255, ${0.4 * depthFade})`;
      this.ctx.fillRect(screenX, seaLevelScreenY, tilePixelSize, tilePixelSize * 0.3);
    }

    // Draw grid lines for tile boundaries (front layer only)
    if (layerIdx === 0) {
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(screenX, tileScreenY, tilePixelSize, tilePixelSize);
    }

    // Draw grass tufts on front layer only
    if (layerIdx === 0 && tile.terrain !== 'water' && tile.terrain !== 'stone') {
      const grassHeight = Math.max(2, 4 * this.camera.zoom);
      this.ctx.fillStyle = '#2d5a27';

      const tuftX = screenX + tilePixelSize * 0.3;
      const tuftX2 = screenX + tilePixelSize * 0.7;

      this.ctx.beginPath();
      this.ctx.moveTo(tuftX, tileScreenY);
      this.ctx.lineTo(tuftX + 3 * this.camera.zoom, tileScreenY - grassHeight);
      this.ctx.lineTo(tuftX + 6 * this.camera.zoom, tileScreenY);
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.moveTo(tuftX2, tileScreenY);
      this.ctx.lineTo(tuftX2 + 4 * this.camera.zoom, tileScreenY - grassHeight * 1.2);
      this.ctx.lineTo(tuftX2 + 8 * this.camera.zoom, tileScreenY);
      this.ctx.fill();
    }
  }

  /**
   * Get the terrain elevation at a given world tile position.
   * Used for side-view rendering to place entities on the correct ground level.
   *
   * @param worldTileX - X coordinate in tile space
   * @param worldTileY - Y coordinate in tile space (depth row in side-view)
   * @returns Tile elevation (0 = sea level), or 0 if tile not found
   */
  getTerrainElevationAt(worldTileX: number, worldTileY: number): number {
    const chunkX = Math.floor(worldTileX / CHUNK_SIZE);
    const chunkY = Math.floor(worldTileY / CHUNK_SIZE);

    if (!this.chunkManager.hasChunk(chunkX, chunkY)) {
      return 0;
    }

    const chunk = this.chunkManager.getChunk(chunkX, chunkY);
    const localX = worldTileX - chunkX * CHUNK_SIZE;
    const localY = worldTileY - chunkY * CHUNK_SIZE;

    if (localX < 0 || localX >= CHUNK_SIZE || localY < 0 || localY >= CHUNK_SIZE) {
      return 0;
    }

    const tile = chunk.tiles[localY * CHUNK_SIZE + localX];
    if (!tile) {
      return 0;
    }

    return (tile as any).elevation ?? 0;
  }

  /**
   * Apply depth fading to a color for layered side-view rendering.
   */
  private applyDepthFade(color: string, fade: number): string {
    // Parse hex color
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Blend toward a fog color (light blue-gray)
    const fogR = 180, fogG = 195, fogB = 210;
    const newR = Math.round(r * fade + fogR * (1 - fade));
    const newG = Math.round(g * fade + fogG * (1 - fade));
    const newB = Math.round(b * fade + fogB * (1 - fade));

    return `rgb(${newR}, ${newG}, ${newB})`;
  }

  /**
   * Darken a hex color by a factor (0-1, where 1 is original color).
   */
  private darkenColor(hex: string, factor: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const newR = Math.floor(r * factor);
    const newG = Math.floor(g * factor);
    const newB = Math.floor(b * factor);

    return `rgb(${newR}, ${newG}, ${newB})`;
  }

  /**
   * Create a seeded pseudo-random number generator.
   * Returns a function that generates deterministic random numbers (0-1) based on the seed.
   * Uses a simple mulberry32 algorithm.
   */
  private createSeededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
}
