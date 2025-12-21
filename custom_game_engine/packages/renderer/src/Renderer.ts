import type { World } from '@ai-village/core';
import {
  ChunkManager,
  TerrainGenerator,
  CHUNK_SIZE,
  TERRAIN_COLORS,
  type Chunk,
} from '@ai-village/world';
import { Camera } from './Camera.js';
import { renderSprite } from './SpriteRenderer.js';

/**
 * 2D renderer using Canvas.
 * Renders terrain tiles and entities.
 */
export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  private chunkManager: ChunkManager;
  private terrainGenerator: TerrainGenerator;

  private tileSize = 16; // Pixels per tile at zoom=1

  constructor(canvas: HTMLCanvasElement, seed: string = 'default') {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context');
    }
    this.ctx = ctx;

    this.camera = new Camera(canvas.width, canvas.height);
    this.chunkManager = new ChunkManager(3); // Load 3 chunks in each direction
    this.terrainGenerator = new TerrainGenerator(seed);

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

    // Update loaded chunks based on camera position
    const { loaded } = this.chunkManager.updateLoadedChunks(
      this.camera.x,
      this.camera.y
    );

    // Generate newly loaded chunks
    for (const chunk of loaded) {
      this.terrainGenerator.generateChunk(chunk, world as any);
    }

    // Get visible bounds in world coordinates
    const bounds = this.camera.getVisibleBounds();

    // Calculate chunk bounds
    const startChunkX = Math.floor(bounds.left / CHUNK_SIZE);
    const endChunkX = Math.floor(bounds.right / CHUNK_SIZE);
    const startChunkY = Math.floor(bounds.top / CHUNK_SIZE);
    const endChunkY = Math.floor(bounds.bottom / CHUNK_SIZE);

    // Render terrain tiles
    for (let chunkX = startChunkX; chunkX <= endChunkX; chunkX++) {
      for (let chunkY = startChunkY; chunkY <= endChunkY; chunkY++) {
        if (!this.chunkManager.hasChunk(chunkX, chunkY)) continue;
        const chunk = this.chunkManager.getChunk(chunkX, chunkY);
        this.renderChunk(chunk);
      }
    }

    // Draw entities (if any have position component)
    const entities = world.query().with('position', 'renderable').executeEntities();

    for (const entity of entities) {
      const pos = entity.components.get('position') as
        | { x: number; y: number }
        | undefined;
      const renderable = entity.components.get('renderable') as
        | { spriteId: string; visible: boolean }
        | undefined;

      if (!pos || !renderable || !renderable.visible) continue;

      const worldX = pos.x * this.tileSize;
      const worldY = pos.y * this.tileSize;
      const screen = this.camera.worldToScreen(worldX, worldY);

      // Render sprite
      renderSprite(
        this.ctx,
        renderable.spriteId,
        screen.x,
        screen.y,
        this.tileSize * this.camera.zoom
      );
    }

    // Draw debug info
    this.drawDebugInfo(world);
  }

  /**
   * Render a single chunk.
   */
  private renderChunk(chunk: Chunk): void {
    for (let localY = 0; localY < CHUNK_SIZE; localY++) {
      for (let localX = 0; localX < CHUNK_SIZE; localX++) {
        const worldX = (chunk.x * CHUNK_SIZE + localX) * this.tileSize;
        const worldY = (chunk.y * CHUNK_SIZE + localY) * this.tileSize;

        const tile = chunk.tiles[localY * CHUNK_SIZE + localX];
        if (!tile) continue;

        const screen = this.camera.worldToScreen(worldX, worldY);

        // Draw tile
        const color = TERRAIN_COLORS[tile.terrain];
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
          screen.x,
          screen.y,
          this.tileSize * this.camera.zoom,
          this.tileSize * this.camera.zoom
        );
      }
    }
  }

  private drawDebugInfo(world: World): void {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '12px monospace';

    const lines = [
      `Tick: ${world.tick}`,
      `Time: ${world.gameTime.hour}:00 Day ${world.gameTime.day} ${world.gameTime.season} Year ${world.gameTime.year}`,
      `Camera: (${this.camera.x.toFixed(1)}, ${this.camera.y.toFixed(1)}) zoom: ${this.camera.zoom.toFixed(2)}`,
      `Chunks: ${this.chunkManager.getChunkCount()}`,
      `Entities: ${world.entities.size}`,
      `Seed: ${this.terrainGenerator.getSeed()}`,
    ];

    lines.forEach((line, i) => {
      this.ctx.fillText(line, 10, 20 + i * 15);
    });
  }
}
