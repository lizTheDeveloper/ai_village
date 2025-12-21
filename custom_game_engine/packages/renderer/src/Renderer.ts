import type { World } from '@ai-village/core';
import { Camera } from './Camera.js';

/**
 * Minimal 2D renderer using Canvas.
 * Renders colored tiles for terrain and entities.
 */
export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;

  private tileSize = 16; // Pixels per tile at zoom=1

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context');
    }
    this.ctx = ctx;

    this.camera = new Camera(canvas.width, canvas.height);

    // Handle resize
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    this.camera.setViewportSize(rect.width, rect.height);
  }

  getCamera(): Camera {
    return this.camera;
  }

  /**
   * Render the world.
   */
  render(world: World): void {
    // Clear
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Update camera
    this.camera.update();

    // Get visible bounds
    const bounds = this.camera.getVisibleBounds();

    // Calculate tile bounds
    const startTileX = Math.floor(bounds.left / this.tileSize);
    const endTileX = Math.ceil(bounds.right / this.tileSize);
    const startTileY = Math.floor(bounds.top / this.tileSize);
    const endTileY = Math.ceil(bounds.bottom / this.tileSize);

    // Draw grid (for now, just colored squares)
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 1;

    for (let tileX = startTileX; tileX <= endTileX; tileX++) {
      for (let tileY = startTileY; tileY <= endTileY; tileY++) {
        const worldX = tileX * this.tileSize;
        const worldY = tileY * this.tileSize;

        const screen = this.camera.worldToScreen(worldX, worldY);

        // Checkerboard pattern for now
        const color = (tileX + tileY) % 2 === 0 ? '#2a2a2a' : '#252525';
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
          screen.x,
          screen.y,
          this.tileSize * this.camera.zoom,
          this.tileSize * this.camera.zoom
        );

        this.ctx.strokeRect(
          screen.x,
          screen.y,
          this.tileSize * this.camera.zoom,
          this.tileSize * this.camera.zoom
        );
      }
    }

    // Draw entities (if any have position component)
    const entities = world.query().with('position').executeEntities();

    for (const entity of entities) {
      const pos = entity.components.get('position') as
        | { x: number; y: number }
        | undefined;
      if (!pos) continue;

      const screen = this.camera.worldToScreen(pos.x, pos.y);

      // Draw as colored circle
      this.ctx.fillStyle = '#ff6b6b';
      this.ctx.beginPath();
      this.ctx.arc(
        screen.x + (this.tileSize * this.camera.zoom) / 2,
        screen.y + (this.tileSize * this.camera.zoom) / 2,
        (this.tileSize * this.camera.zoom) / 3,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    }

    // Draw debug info
    this.drawDebugInfo(world);
  }

  private drawDebugInfo(world: World): void {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '12px monospace';

    const lines = [
      `Tick: ${world.tick}`,
      `Time: ${world.gameTime.hour}:00 Day ${world.gameTime.day} ${world.gameTime.season} Year ${world.gameTime.year}`,
      `Camera: (${this.camera.x.toFixed(1)}, ${this.camera.y.toFixed(1)}) zoom: ${this.camera.zoom.toFixed(2)}`,
      `Entities: ${world.entities.size}`,
    ];

    lines.forEach((line, i) => {
      this.ctx.fillText(line, 10, 20 + i * 15);
    });
  }
}
