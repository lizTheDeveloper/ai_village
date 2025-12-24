import type { World, EventBus } from '@ai-village/core';
import type { Camera } from './Camera.js';
import type { Tile, ChunkManager, TerrainGenerator } from '@ai-village/world';

const CHUNK_SIZE = 32; // From packages/world/src/chunks/Chunk.ts

/**
 * UI Panel for inspecting and interacting with tiles.
 * Shows soil properties and provides buttons for tilling, watering, and fertilizing.
 */
export class TileInspectorPanel {
  private selectedTile: { tile: Tile; x: number; y: number } | null = null;
  private panelWidth = 320;
  private panelHeight = 420; // Optimized to fit in standard viewport
  private padding = 12;
  private lineHeight = 18;
  private eventBus: EventBus;
  private camera: Camera;
  private chunkManager: ChunkManager;
  private terrainGenerator: TerrainGenerator;

  // Button state tracking
  private buttons: Array<{
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    onClick: () => void;
    enabled: () => boolean;
  }> = [];

  constructor(eventBus: EventBus, camera: Camera, chunkManager: ChunkManager, terrainGenerator: TerrainGenerator) {
    this.eventBus = eventBus;
    this.camera = camera;
    this.chunkManager = chunkManager;
    this.terrainGenerator = terrainGenerator;
  }

  /**
   * Set the currently selected tile.
   * @param tile The tile data
   * @param x World X coordinate
   * @param y World Y coordinate
   */
  setSelectedTile(tile: Tile | null, x?: number, y?: number): void {
    if (tile === null) {
      this.selectedTile = null;
      this.buttons = [];
    } else {
      if (x === undefined || y === undefined) {
        throw new Error('TileInspectorPanel.setSelectedTile requires x and y when tile is not null');
      }
      this.selectedTile = { tile, x, y };
      this.updateButtons();
    }
  }

  /**
   * Get the currently selected tile.
   */
  getSelectedTile(): { tile: Tile; x: number; y: number } | null {
    return this.selectedTile;
  }

  /**
   * Update button positions and handlers based on current panel state.
   */
  private updateButtons(): void {
    if (!this.selectedTile) {
      this.buttons = [];
      return;
    }

    const tile = this.selectedTile.tile;
    const x = this.selectedTile.x;
    const y = this.selectedTile.y;

    // Calculate button positions (bottom of panel)
    const buttonY = this.panelHeight - 100; // Start buttons 100px from bottom
    const buttonHeight = 26;
    const buttonSpacing = 5;

    this.buttons = [
      {
        label: 'Till (T)',
        x: this.padding,
        y: buttonY,
        width: this.panelWidth - this.padding * 2,
        height: buttonHeight,
        onClick: () => this.tillTile(x, y),
        enabled: () => !tile.tilled && (tile.terrain === 'grass' || tile.terrain === 'dirt'),
      },
      {
        label: 'Water (W)',
        x: this.padding,
        y: buttonY + buttonHeight + buttonSpacing,
        width: this.panelWidth - this.padding * 2,
        height: buttonHeight,
        onClick: () => this.waterTile(x, y),
        enabled: () => tile.moisture < 100,
      },
      {
        label: 'Fertilize (F)',
        x: this.padding,
        y: buttonY + (buttonHeight + buttonSpacing) * 2,
        width: this.panelWidth - this.padding * 2,
        height: buttonHeight,
        onClick: () => this.fertilizeTile(x, y, 'compost'),
        enabled: () => tile.fertility < 100,
      },
    ];
  }

  /**
   * Render the tile inspector panel.
   * @param ctx Canvas rendering context
   * @param canvasWidth Width of the canvas
   * @param canvasHeight Height of the canvas
   */
  render(ctx: CanvasRenderingContext2D, canvasWidth: number, _canvasHeight: number): void {
    if (!this.selectedTile) {
      return; // Nothing to render
    }

    const tile = this.selectedTile.tile;
    const tileX = this.selectedTile.x;
    const tileY = this.selectedTile.y;

    // Position panel in right side, with bottom margin to ensure buttons are visible
    const panelX = canvasWidth - this.panelWidth - 20;
    // Position so bottom of panel is at canvas height - 20px margin
    // If canvas height is 727.5, and panel height is 420, then panelY should be ~287.5
    // But we'll use a fixed safe value that works for most screens
    const panelY = Math.max(20, _canvasHeight - this.panelHeight - 20);

    // Draw panel background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(panelX, panelY, this.panelWidth, this.panelHeight);

    // Draw panel border
    ctx.strokeStyle = 'rgba(139, 69, 19, 0.8)'; // Brown border for soil theme
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, this.panelWidth, this.panelHeight);

    let currentY = panelY + this.padding;

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('Tile Inspector', panelX + this.padding, currentY + 14);

    // Close button (X in top right)
    const closeButtonSize = 24;
    const closeButtonX = panelX + this.panelWidth - closeButtonSize - 8;
    const closeButtonY = panelY + 8;

    ctx.fillStyle = 'rgba(200, 50, 50, 0.8)';
    ctx.fillRect(closeButtonX, closeButtonY, closeButtonSize, closeButtonSize);
    ctx.strokeStyle = 'rgba(255, 100, 100, 1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(closeButtonX, closeButtonY, closeButtonSize, closeButtonSize);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('×', closeButtonX + closeButtonSize / 2, closeButtonY + closeButtonSize / 2 + 6);
    ctx.textAlign = 'left';

    currentY += 30;

    // Coordinates
    ctx.font = '11px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText(`Position: (${tileX}, ${tileY})`, panelX + this.padding, currentY);
    currentY += this.lineHeight + 5;

    // Terrain Type
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px monospace';
    const terrainLabel = tile.terrain.toUpperCase();
    ctx.fillText(`Terrain: ${terrainLabel}`, panelX + this.padding, currentY);
    currentY += this.lineHeight;

    // Biome (if present)
    if (tile.biome) {
      ctx.fillStyle = '#88FF88';
      const biomeLabel = tile.biome.charAt(0).toUpperCase() + tile.biome.slice(1);
      ctx.fillText(`Biome: ${biomeLabel}`, panelX + this.padding, currentY);
      currentY += this.lineHeight;
    }

    // Tilled status
    const tilledStatus = tile.tilled ? 'Yes' : 'No';
    const tilledColor = tile.tilled ? '#00FF00' : '#FF8800';
    ctx.fillStyle = tilledColor;
    ctx.fillText(`Tilled: ${tilledStatus}`, panelX + this.padding, currentY);
    currentY += this.lineHeight + 5;

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(panelX + this.padding, currentY);
    ctx.lineTo(panelX + this.panelWidth - this.padding, currentY);
    ctx.stroke();
    currentY += 10;

    // Soil Properties Section
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Soil Properties', panelX + this.padding, currentY);
    currentY += this.lineHeight + 5;
    ctx.font = '12px monospace';

    // Fertility bar
    currentY = this.renderPropertyBar(
      ctx,
      panelX,
      currentY,
      'Fertility',
      tile.fertility,
      '#8B4513',
      '#D2691E'
    );

    // Moisture bar
    currentY = this.renderPropertyBar(
      ctx,
      panelX,
      currentY,
      'Moisture',
      tile.moisture,
      '#1E90FF',
      '#87CEEB'
    );

    // Plantability (uses remaining)
    if (tile.tilled) {
      // Color-code plantability based on remaining uses
      const plantabilityColor = tile.plantability > 2 ? '#4CAF50' : (tile.plantability > 0 ? '#FFA500' : '#FF0000');
      ctx.fillStyle = plantabilityColor;
      ctx.fillText(`Plantability: ${tile.plantability}/3 uses`, panelX + this.padding, currentY);
      currentY += this.lineHeight;

      // Warning if depleted (needs fertilizer)
      if (tile.plantability === 0) {
        ctx.fillStyle = '#FF6600';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('⚠️ Needs Fertilizer or Rest', panelX + this.padding, currentY);
        currentY += this.lineHeight;
        ctx.font = '12px monospace';
      }

      // Last tilled timestamp (convert ticks to days ago)
      // Assume 20 ticks/second * 60 seconds * 24 hours = 28800 ticks per day
      if (tile.lastTilled > 0) {
        // Note: We don't have access to world.tick here, so we show the raw tick value
        // In a full implementation, would pass current tick to calculate "X days ago"
        ctx.fillStyle = '#888';
        ctx.font = '10px monospace';
        ctx.fillText(`Last tilled: tick ${tile.lastTilled}`, panelX + this.padding, currentY);
        currentY += this.lineHeight;
        ctx.font = '12px monospace';
      }
    }

    currentY += 5;

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(panelX + this.padding, currentY);
    ctx.lineTo(panelX + this.panelWidth - this.padding, currentY);
    ctx.stroke();
    currentY += 10;

    // Nutrients Section
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Nutrients (NPK)', panelX + this.padding, currentY);
    currentY += this.lineHeight + 5;
    ctx.font = '12px monospace';

    // Nitrogen
    currentY = this.renderNutrientBar(ctx, panelX, currentY, 'N', tile.nutrients.nitrogen, '#00FF00');
    // Phosphorus
    currentY = this.renderNutrientBar(ctx, panelX, currentY, 'P', tile.nutrients.phosphorus, '#FF8800');
    // Potassium
    currentY = this.renderNutrientBar(ctx, panelX, currentY, 'K', tile.nutrients.potassium, '#FF00FF');

    currentY += 5;

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(panelX + this.padding, currentY);
    ctx.lineTo(panelX + this.panelWidth - this.padding, currentY);
    ctx.stroke();
    currentY += 10;

    // Status Indicators
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Status', panelX + this.padding, currentY);
    currentY += this.lineHeight + 5;
    ctx.font = '11px monospace';

    // Fertilized
    if (tile.fertilized) {
      ctx.fillStyle = '#FFD700';
      const durationDays = Math.floor(tile.fertilizerDuration / 2400); // Convert ticks to days
      ctx.fillText(`✓ Fertilized (${durationDays} days left)`, panelX + this.padding, currentY);
      currentY += this.lineHeight;
    }

    // Composted
    if (tile.composted) {
      ctx.fillStyle = '#8B4513';
      ctx.fillText('✓ Composted', panelX + this.padding, currentY);
      currentY += this.lineHeight;
    }

    // Render action buttons
    this.renderButtons(ctx, panelX, panelY);
  }

  /**
   * Render a property bar (fertility, moisture).
   */
  private renderPropertyBar(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    y: number,
    label: string,
    value: number,
    colorDark: string,
    colorLight: string
  ): number {
    const barWidth = this.panelWidth - this.padding * 2 - 80;
    const barHeight = 12;
    const barX = panelX + this.padding + 80;
    const barY = y - 9;

    // Label
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px monospace';
    ctx.fillText(label, panelX + this.padding, y);

    // Background
    ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Fill
    const fillWidth = (barWidth * value) / 100;
    ctx.fillStyle = value < 30 ? colorDark : colorLight;
    ctx.fillRect(barX, barY, fillWidth, barHeight);

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Value text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${value.toFixed(0)}`, barX + barWidth / 2, barY + barHeight - 2);
    ctx.textAlign = 'left';

    return y + this.lineHeight;
  }

  /**
   * Render a nutrient bar (N, P, K).
   */
  private renderNutrientBar(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    y: number,
    label: string,
    value: number,
    color: string
  ): number {
    const barWidth = this.panelWidth - this.padding * 2 - 40;
    const barHeight = 10;
    const barX = panelX + this.padding + 40;
    const barY = y - 8;

    // Label
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '11px monospace';
    ctx.fillText(`${label}:`, panelX + this.padding, y);

    // Background
    ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Fill
    const fillWidth = (barWidth * value) / 100;
    ctx.fillStyle = color;
    ctx.fillRect(barX, barY, fillWidth, barHeight);

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Value text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${value.toFixed(0)}`, barX + barWidth / 2, barY + barHeight - 1);
    ctx.textAlign = 'left';

    return y + this.lineHeight;
  }

  /**
   * Render action buttons.
   */
  private renderButtons(ctx: CanvasRenderingContext2D, panelX: number, panelY: number): void {
    for (const button of this.buttons) {
      const enabled = button.enabled();
      const x = panelX + button.x;
      const y = panelY + button.y;

      // Button background
      if (enabled) {
        ctx.fillStyle = 'rgba(139, 69, 19, 0.8)'; // Brown for enabled
      } else {
        ctx.fillStyle = 'rgba(50, 50, 50, 0.5)'; // Gray for disabled
      }
      ctx.fillRect(x, y, button.width, button.height);

      // Button border
      ctx.strokeStyle = enabled ? 'rgba(210, 105, 30, 1)' : 'rgba(100, 100, 100, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, button.width, button.height);

      // Button text
      ctx.fillStyle = enabled ? '#FFFFFF' : '#666666';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(button.label, x + button.width / 2, y + button.height / 2 + 5);
      ctx.textAlign = 'left';
    }
  }

  /**
   * Handle click events on the panel.
   * @param screenX Screen X coordinate
   * @param screenY Screen Y coordinate
   * @param canvasWidth Width of the canvas
   * @param canvasHeight Height of the canvas
   * @returns True if click was handled
   */
  handleClick(screenX: number, screenY: number, canvasWidth: number, canvasHeight: number): boolean {
    if (!this.selectedTile) {
      return false;
    }

    const panelX = canvasWidth - this.panelWidth - 20;
    const panelY = Math.max(20, canvasHeight - this.panelHeight - 20);

    // Check if click is inside panel
    if (
      screenX < panelX ||
      screenX > panelX + this.panelWidth ||
      screenY < panelY ||
      screenY > panelY + this.panelHeight
    ) {
      return false;
    }

    // Check close button click
    const closeButtonSize = 24;
    const closeButtonX = panelX + this.panelWidth - closeButtonSize - 8;
    const closeButtonY = panelY + 8;

    if (
      screenX >= closeButtonX &&
      screenX <= closeButtonX + closeButtonSize &&
      screenY >= closeButtonY &&
      screenY <= closeButtonY + closeButtonSize
    ) {
      console.log('[TileInspector] Close button clicked');
      this.setSelectedTile(null);
      return true;
    }

    // Check button clicks
    for (const button of this.buttons) {
      const buttonX = panelX + button.x;
      const buttonY = panelY + button.y;

      if (
        screenX >= buttonX &&
        screenX <= buttonX + button.width &&
        screenY >= buttonY &&
        screenY <= buttonY + button.height
      ) {
        if (button.enabled()) {
          button.onClick();
          return true;
        }
      }
    }

    return true; // Click was inside panel, but not on a button
  }

  /**
   * Till the selected tile.
   */
  private tillTile(x: number, y: number): void {
    console.log(`[TileInspector] Tilling tile at (${x}, ${y})`);
    this.eventBus.emit({ type: 'action:till', source: 'ui', data: { x, y } });
  }

  /**
   * Water the selected tile.
   */
  private waterTile(x: number, y: number): void {
    console.log(`[TileInspector] Watering tile at (${x}, ${y})`);
    this.eventBus.emit({ type: 'action:water', source: 'ui', data: { x, y } });
  }

  /**
   * Fertilize the selected tile.
   */
  private fertilizeTile(x: number, y: number, fertilizerType: string): void {
    console.log(`[TileInspector] Fertilizing tile at (${x}, ${y}) with ${fertilizerType}`);
    this.eventBus.emit({ type: 'action:fertilize', source: 'ui', data: { x, y, fertilizerType } });
  }

  /**
   * Find tile at screen position.
   * @param screenX Screen X coordinate
   * @param screenY Screen Y coordinate
   * @param world World instance (not used, kept for API compatibility)
   * @returns Tile and world coordinates, or null
   */
  findTileAtScreenPosition(
    screenX: number,
    screenY: number,
    world: World
  ): { tile: Tile; x: number; y: number } | null {
    // Convert screen to world coordinates
    const worldPos = this.camera.screenToWorld(screenX, screenY);
    const worldX = Math.floor(worldPos.x);
    const worldY = Math.floor(worldPos.y);

    // Get chunk coordinates
    const chunkX = Math.floor(worldX / CHUNK_SIZE);
    const chunkY = Math.floor(worldY / CHUNK_SIZE);

    // Get local tile coordinates
    const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((worldY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    // Get chunk from chunk manager
    const chunk = this.chunkManager.getChunk(chunkX, chunkY);
    if (!chunk) {
      console.warn(`[TileInspector] No chunk at (${chunkX}, ${chunkY})`);
      return null;
    }

    // CRITICAL FIX: Generate chunk if not already generated
    // Per CLAUDE.md: All tiles MUST have biome data before farming operations
    // Chunks created on-demand need terrain generation to set biome data
    if (!chunk.generated) {
      console.log(`[TileInspector] Generating terrain for chunk (${chunkX}, ${chunkY})`);
      this.terrainGenerator.generateChunk(chunk, world as any);
    }

    // Get tile from chunk
    const tileIndex = localY * CHUNK_SIZE + localX;
    const tile = chunk.tiles[tileIndex];

    if (!tile) {
      console.warn(`[TileInspector] No tile at local (${localX}, ${localY}) in chunk (${chunkX}, ${chunkY})`);
      return null;
    }

    console.log(
      `[TileInspector] Found tile at world (${worldX}, ${worldY}): ${tile.terrain}, tilled=${tile.tilled}, fertility=${tile.fertility}, biome=${tile.biome}`
    );

    return { tile, x: worldX, y: worldY };
  }
}
