import {
  CHUNK_SIZE,
  TERRAIN_COLORS,
  type Chunk,
  type Tile,
} from '@ai-village/world';
import type { Camera } from '../Camera.js';

/**
 * Handles rendering of terrain chunks in top-down view.
 * Extracted from Renderer.ts to improve maintainability.
 */
export class TerrainRenderer {
  private ctx: CanvasRenderingContext2D;
  private tileSize: number;
  private showTemperatureOverlay: boolean = false;
  private hasLoggedTilledTile = false; // Debug flag to log first tilled tile rendering
  private hasLoggedWallRender = false; // Debug flag to log first wall rendering

  constructor(ctx: CanvasRenderingContext2D, tileSize: number = 16) {
    this.ctx = ctx;
    this.tileSize = tileSize;
  }

  setShowTemperatureOverlay(show: boolean): void {
    this.showTemperatureOverlay = show;
  }

  getShowTemperatureOverlay(): boolean {
    return this.showTemperatureOverlay;
  }

  /**
   * Render a single chunk.
   *
   * Handles ungenerated chunks gracefully by skipping rendering.
   * This can happen when camera scrolls faster than background generation.
   */
  renderChunk(chunk: Chunk, camera: Camera): void {
    // Skip rendering ungenerated chunks
    // This prevents rendering empty/placeholder tiles before generation completes
    if (!chunk.generated) {
      return;
    }

    for (let localY = 0; localY < CHUNK_SIZE; localY++) {
      for (let localX = 0; localX < CHUNK_SIZE; localX++) {
        const worldX = (chunk.x * CHUNK_SIZE + localX) * this.tileSize;
        const worldY = (chunk.y * CHUNK_SIZE + localY) * this.tileSize;

        const tile = chunk.tiles[localY * CHUNK_SIZE + localX];
        if (!tile) continue;

        const screen = camera.worldToScreen(worldX, worldY);
        const tilePixelSize = this.tileSize * camera.zoom;

        // Draw base tile
        const color = TERRAIN_COLORS[tile.terrain];
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
          screen.x,
          screen.y,
          tilePixelSize,
          tilePixelSize
        );

        // Draw tilled indicator (VERY PROMINENT - must be clearly visible!)
        if (tile.tilled) {
          // DEBUG: Log first time we detect a tilled tile (to verify rendering is working)
          if (!this.hasLoggedTilledTile) {
            this.hasLoggedTilledTile = true;
          }

          // CRITICAL: Make tilled soil VERY different from untilled dirt
          // Use an EVEN DARKER brown base for maximum distinction
          // This creates extreme contrast with both grass (green) and natural dirt (light brown)
          this.ctx.fillStyle = 'rgba(45, 25, 10, 1.0)'; // EVEN DARKER, 100% opacity for maximum visibility
          this.ctx.fillRect(screen.x, screen.y, tilePixelSize, tilePixelSize);

          // Add EXTRA THICK horizontal furrows (visible even at low zoom)
          // Use nearly black furrows with increased thickness
          this.ctx.strokeStyle = 'rgba(15, 8, 3, 1.0)'; // Even darker furrows
          this.ctx.lineWidth = Math.max(4, camera.zoom * 3); // THICKER lines (was 3, now 4 minimum)
          const furrowCount = 7; // Even more furrows for unmistakable pattern
          const furrowSpacing = tilePixelSize / (furrowCount + 1);

          for (let i = 1; i <= furrowCount; i++) {
            const y = screen.y + furrowSpacing * i;
            this.ctx.beginPath();
            this.ctx.moveTo(screen.x, y);
            this.ctx.lineTo(screen.x + tilePixelSize, y);
            this.ctx.stroke();
          }

          // Add vertical lines for grid pattern (makes it unmistakable)
          this.ctx.strokeStyle = 'rgba(15, 8, 3, 0.9)'; // Match furrow color
          this.ctx.lineWidth = Math.max(3, camera.zoom * 1.5); // Thicker vertical lines
          const verticalCount = 5; // More vertical lines for denser grid
          const verticalSpacing = tilePixelSize / (verticalCount + 1);

          for (let i = 1; i <= verticalCount; i++) {
            const x = screen.x + verticalSpacing * i;
            this.ctx.beginPath();
            this.ctx.moveTo(x, screen.y);
            this.ctx.lineTo(x, screen.y + tilePixelSize);
            this.ctx.stroke();
          }

          // Add DOUBLE BORDER for maximum visibility
          // Inner border: BRIGHTER orange for extreme visibility
          this.ctx.strokeStyle = 'rgba(255, 140, 60, 1.0)'; // BRIGHTER orange (increased from 200,120,60)
          this.ctx.lineWidth = Math.max(4, camera.zoom * 1.5); // THICKER inner border (was 3)
          this.ctx.strokeRect(screen.x + 1, screen.y + 1, tilePixelSize - 2, tilePixelSize - 2);

          // Outer border: darker for contrast
          this.ctx.strokeStyle = 'rgba(90, 50, 20, 1.0)'; // Even darker outer border for more contrast
          this.ctx.lineWidth = Math.max(3, camera.zoom); // Thicker outer border (was 2)
          this.ctx.strokeRect(screen.x, screen.y, tilePixelSize, tilePixelSize);
        }

        // Draw moisture indicator (blue tint for wet tiles)
        if (tile.moisture > 60) {
          const moistureAlpha = ((tile.moisture - 60) / 40) * 0.3; // 0-0.3 based on moisture 60-100
          this.ctx.fillStyle = `rgba(30, 144, 255, ${moistureAlpha})`;
          this.ctx.fillRect(screen.x, screen.y, tilePixelSize, tilePixelSize);
        }

        // Draw fertilized indicator (golden glow)
        if (tile.fertilized) {
          this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)'; // Gold
          this.ctx.lineWidth = Math.max(1, camera.zoom);
          this.ctx.strokeRect(screen.x, screen.y, tilePixelSize, tilePixelSize);
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
          // Debug: Log first wall detected (only once per session)
          if (!this.hasLoggedWallRender) {
            this.hasLoggedWallRender = true;
            console.log(`[Renderer] ✅ Detected wall tile at world (${chunk.x * CHUNK_SIZE + localX}, ${chunk.y * CHUNK_SIZE + localY})`, tileWithBuilding.wall);
          }

          const wall = tileWithBuilding.wall;
          const progress = wall.constructionProgress ?? 100;
          const alpha = progress >= 100 ? 1.0 : 0.4 + (progress / 100) * 0.4;

          // Material-based colors
          const wallColors: Record<string, string> = {
            wood: '#8B7355',
            stone: '#6B6B6B',
            mud_brick: '#A0826D',
            ice: '#B8E6FF',
            metal: '#4A4A4A',
            glass: '#87CEEB',
            thatch: '#D4B896',
          };
          const wallColor = wallColors[wall.material] ?? '#6B6B6B';

          // Fill wall tile
          this.ctx.fillStyle = `rgba(${parseInt(wallColor.slice(1, 3), 16)}, ${parseInt(wallColor.slice(3, 5), 16)}, ${parseInt(wallColor.slice(5, 7), 16)}, ${alpha})`;
          this.ctx.fillRect(screen.x, screen.y, tilePixelSize, tilePixelSize);

          // Add border for wall definition
          this.ctx.strokeStyle = `rgba(40, 40, 40, ${alpha * 0.8})`;
          this.ctx.lineWidth = Math.max(1, camera.zoom * 0.5);
          this.ctx.strokeRect(screen.x + 1, screen.y + 1, tilePixelSize - 2, tilePixelSize - 2);

          // Show construction progress if incomplete
          if (progress < 100) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.font = `${Math.max(8, camera.zoom * 6)}px sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(`${Math.round(progress)}%`, screen.x + tilePixelSize / 2, screen.y + tilePixelSize / 2);
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'alphabetic';
          }
        }

        // Render door tiles
        if (tileWithBuilding.door) {
          const door = tileWithBuilding.door;
          const progress = door.constructionProgress ?? 100;
          const alpha = progress >= 100 ? 1.0 : 0.4 + (progress / 100) * 0.4;

          // Material-based colors
          const doorColors: Record<string, string> = {
            wood: '#654321',
            stone: '#505050',
            metal: '#383838',
            cloth: '#8B4513',
          };
          const doorColor = doorColors[door.material] ?? '#654321';

          if (door.state === 'open') {
            // Open door: render as thin outline (passable)
            this.ctx.strokeStyle = `rgba(${parseInt(doorColor.slice(1, 3), 16)}, ${parseInt(doorColor.slice(3, 5), 16)}, ${parseInt(doorColor.slice(5, 7), 16)}, ${alpha})`;
            this.ctx.lineWidth = Math.max(2, camera.zoom);
            this.ctx.strokeRect(screen.x + 2, screen.y + 2, tilePixelSize - 4, tilePixelSize - 4);
            // Add dashed pattern to indicate open
            this.ctx.setLineDash([3, 3]);
            this.ctx.strokeRect(screen.x + 4, screen.y + 4, tilePixelSize - 8, tilePixelSize - 8);
            this.ctx.setLineDash([]);
          } else {
            // Closed/locked door: render as solid with handle
            this.ctx.fillStyle = `rgba(${parseInt(doorColor.slice(1, 3), 16)}, ${parseInt(doorColor.slice(3, 5), 16)}, ${parseInt(doorColor.slice(5, 7), 16)}, ${alpha})`;
            this.ctx.fillRect(screen.x, screen.y, tilePixelSize, tilePixelSize);

            // Door frame (lighter)
            this.ctx.strokeStyle = `rgba(160, 120, 80, ${alpha})`;
            this.ctx.lineWidth = Math.max(1, camera.zoom * 0.3);
            this.ctx.strokeRect(screen.x + 1, screen.y + 1, tilePixelSize - 2, tilePixelSize - 2);

            // Door handle (small circle on right side)
            this.ctx.fillStyle = door.state === 'locked' ? 'rgba(200, 200, 80, 0.9)' : 'rgba(180, 140, 100, 0.9)';
            this.ctx.beginPath();
            this.ctx.arc(screen.x + tilePixelSize * 0.75, screen.y + tilePixelSize * 0.5, Math.max(2, camera.zoom), 0, Math.PI * 2);
            this.ctx.fill();

            // Lock indicator for locked doors
            if (door.state === 'locked') {
              this.ctx.strokeStyle = 'rgba(200, 200, 80, 0.9)';
              this.ctx.lineWidth = Math.max(1, camera.zoom * 0.5);
              this.ctx.strokeRect(screen.x + tilePixelSize * 0.7, screen.y + tilePixelSize * 0.35, tilePixelSize * 0.1, tilePixelSize * 0.15);
            }
          }
        }

        // Render window tiles
        if (tileWithBuilding.window) {
          const window = tileWithBuilding.window;
          const progress = window.constructionProgress ?? 100;
          const alpha = progress >= 100 ? 0.6 : 0.3 + (progress / 100) * 0.3;

          // Semi-transparent glass effect
          this.ctx.fillStyle = `rgba(135, 206, 235, ${alpha})`; // Sky blue glass
          this.ctx.fillRect(screen.x, screen.y, tilePixelSize, tilePixelSize);

          // Window frame (dark border)
          this.ctx.strokeStyle = `rgba(60, 40, 30, ${alpha + 0.2})`;
          this.ctx.lineWidth = Math.max(2, camera.zoom * 0.7);
          this.ctx.strokeRect(screen.x + 2, screen.y + 2, tilePixelSize - 4, tilePixelSize - 4);

          // Cross pattern for window panes
          this.ctx.beginPath();
          this.ctx.moveTo(screen.x + tilePixelSize / 2, screen.y + 2);
          this.ctx.lineTo(screen.x + tilePixelSize / 2, screen.y + tilePixelSize - 2);
          this.ctx.moveTo(screen.x + 2, screen.y + tilePixelSize / 2);
          this.ctx.lineTo(screen.x + tilePixelSize - 2, screen.y + tilePixelSize / 2);
          this.ctx.stroke();
        }

        // Render roof tiles (overlay on interior tiles)
        const tileWithRoof = tile as typeof tile & {
          roof?: { material: string; condition: number; constructionProgress?: number };
        };
        if (tileWithRoof.roof) {
          const roof = tileWithRoof.roof;
          const progress = roof.constructionProgress ?? 100;
          const alpha = progress >= 100 ? 0.7 : 0.3 + (progress / 100) * 0.4;

          // Material-based colors for roofs
          const roofColors: Record<string, string> = {
            thatch: '#C4A35A', // Golden straw
            wood: '#8B6914', // Darker wood
            tile: '#B85C38', // Terracotta
            slate: '#4A5568', // Gray slate
            metal: '#6B7280', // Metallic gray
          };
          const roofColor = roofColors[roof.material] ?? '#C4A35A';

          // Draw roof with slight offset to show depth (rendering as if viewed from above)
          // Draw a diagonal pattern to indicate roofing
          this.ctx.fillStyle = `rgba(${parseInt(roofColor.slice(1, 3), 16)}, ${parseInt(roofColor.slice(3, 5), 16)}, ${parseInt(roofColor.slice(5, 7), 16)}, ${alpha})`;

          // Draw roof as semi-transparent overlay with texture pattern
          this.ctx.fillRect(screen.x, screen.y, tilePixelSize, tilePixelSize);

          // Add diagonal line pattern to indicate roof texture
          this.ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.3})`;
          this.ctx.lineWidth = Math.max(1, camera.zoom * 0.3);

          // Draw diagonal lines for roof texture
          const step = Math.max(3, tilePixelSize / 4);
          for (let i = 0; i < tilePixelSize * 2; i += step) {
            this.ctx.beginPath();
            this.ctx.moveTo(screen.x + i, screen.y);
            this.ctx.lineTo(screen.x, screen.y + i);
            this.ctx.stroke();
          }

          // Show construction progress if incomplete
          if (progress < 100) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.font = `${Math.max(8, camera.zoom * 6)}px sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(`${Math.round(progress)}%`, screen.x + tilePixelSize / 2, screen.y + tilePixelSize / 2);
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'alphabetic';
          }
        }

        // Draw temperature overlay (debug feature)
        // Note: Temperature is not currently stored per-tile, but this allows for future expansion
        const tileWithTemp = tile as typeof tile & { temperature?: number };
        if (this.showTemperatureOverlay && tileWithTemp.temperature !== undefined) {
          // Draw semi-transparent background for readability
          this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          this.ctx.fillRect(screen.x + 2, screen.y + 2, tilePixelSize - 4, tilePixelSize - 4);

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

          this.ctx.fillStyle = tempColor;
          this.ctx.font = `bold ${Math.max(8, camera.zoom * 8)}px monospace`;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(
            Math.round(temp).toString() + '°',
            screen.x + tilePixelSize / 2,
            screen.y + tilePixelSize / 2
          );
          this.ctx.textAlign = 'left';
          this.ctx.textBaseline = 'alphabetic';
        }
      }
    }
  }
}
