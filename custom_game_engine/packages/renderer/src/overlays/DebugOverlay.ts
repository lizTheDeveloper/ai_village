import type { World, CityDirectorComponent } from '@ai-village/core';
import { ChunkManager, TerrainGenerator } from '@ai-village/world';
import type { Camera } from '../Camera.js';

/**
 * Handles rendering of debug overlays: city boundaries, debug info panel.
 * Extracted from Renderer.ts to improve maintainability.
 */
export class DebugOverlay {
  private ctx: CanvasRenderingContext2D;
  private chunkManager: ChunkManager;
  private terrainGenerator: TerrainGenerator;
  public showCityBounds: boolean = true;

  constructor(
    ctx: CanvasRenderingContext2D,
    chunkManager: ChunkManager,
    terrainGenerator: TerrainGenerator
  ) {
    this.ctx = ctx;
    this.chunkManager = chunkManager;
    this.terrainGenerator = terrainGenerator;
  }

  /**
   * Draw city boundaries for all city directors.
   * Shows a golden dashed border around each city's territory.
   */
  drawCityBoundaries(world: World, camera: Camera, tileSize: number): void {
    if (!this.showCityBounds) return;

    // Find all city director entities
    const cityDirectors = world.query().with('city_director').executeEntities();

    for (const entity of cityDirectors) {
      const director = entity.getComponent('city_director') as CityDirectorComponent | undefined;
      if (!director) continue;

      const bounds = director.bounds;

      // Convert tile coordinates to world coordinates
      const minWorldX = bounds.minX * tileSize;
      const minWorldY = bounds.minY * tileSize;
      const maxWorldX = (bounds.maxX + 1) * tileSize;
      const maxWorldY = (bounds.maxY + 1) * tileSize;

      // Convert to screen coordinates
      const minScreen = camera.worldToScreen(minWorldX, minWorldY);
      const maxScreen = camera.worldToScreen(maxWorldX, maxWorldY);

      const width = maxScreen.x - minScreen.x;
      const height = maxScreen.y - minScreen.y;

      // Draw dashed border
      this.ctx.strokeStyle = '#FFD700'; // Gold
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([10, 5]);
      this.ctx.globalAlpha = 0.8;
      this.ctx.strokeRect(minScreen.x, minScreen.y, width, height);
      this.ctx.setLineDash([]);
      this.ctx.globalAlpha = 1.0;

      // Draw city name label at top
      const centerX = minScreen.x + width / 2;
      const labelY = minScreen.y - 8;

      const fontSize = Math.max(12, 14 * camera.zoom);
      this.ctx.font = `bold ${fontSize}px monospace`;
      this.ctx.textAlign = 'center';

      // Background for label
      const metrics = this.ctx.measureText(director.cityName);
      const padding = 4;
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      this.ctx.fillRect(
        centerX - metrics.width / 2 - padding,
        labelY - fontSize,
        metrics.width + padding * 2,
        fontSize + padding
      );

      // Label text
      this.ctx.fillStyle = '#FFD700';
      this.ctx.fillText(director.cityName, centerX, labelY);
      this.ctx.textAlign = 'left';
    }
  }

  /**
   * Draw debug information overlay.
   * Shows tick count, time, camera position, view mode, entity counts, etc.
   */
  drawDebugInfo(world: World, camera: Camera): void {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '12px monospace';

    // Get time component to display day/night cycle
    const timeEntities = world.query().with('time').executeEntities();
    let timeOfDayStr = 'N/A';
    let phaseStr = 'N/A';
    let lightLevelStr = 'N/A';

    if (timeEntities.length > 0) {
      const timeEntity = timeEntities[0];
      if (!timeEntity) {
        throw new Error('Time entity is undefined');
      }
      // TimeComponent interface (inline since it's not exported from core)
      const timeComp = timeEntity.components.get('time') as
        | { timeOfDay: number; phase: string; lightLevel: number }
        | undefined;
      if (timeComp) {
        const hours = Math.floor(timeComp.timeOfDay);
        const minutes = Math.floor((timeComp.timeOfDay - hours) * 60);
        timeOfDayStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        phaseStr = timeComp.phase;
        lightLevelStr = (timeComp.lightLevel * 100).toFixed(0) + '%';
      }
    }

    // Build lines array, including view mode info
    const viewModeStr = camera.isSideView() ? 'Side-View' : 'Top-Down';
    const depthStr = camera.isSideView() ? ` Z: ${camera.z.toFixed(1)}` : '';

    const lines = [
      `Tick: ${world.tick}`,
      `Time: ${timeOfDayStr} (${phaseStr}) Light: ${lightLevelStr}`,
      `Camera: (${camera.x.toFixed(1)}, ${camera.y.toFixed(1)}) zoom: ${camera.zoom.toFixed(2)}`,
      `View: ${viewModeStr}${depthStr} [V to toggle]`,
      `Chunks: ${this.chunkManager.getChunkCount()}`,
      `Entities: ${world.entities.size}`,
      `Seed: ${this.terrainGenerator.getSeed()}`,
    ];

    lines.forEach((line, i) => {
      this.ctx.fillText(line, 10, 20 + i * 15);
    });
  }
}
