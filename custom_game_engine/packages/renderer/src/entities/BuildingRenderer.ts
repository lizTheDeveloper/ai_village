/**
 * Handles rendering of building overlays: labels, construction progress, resource amounts.
 * Extracted from Renderer.ts to improve maintainability.
 */
export class BuildingRenderer {
  private ctx: CanvasRenderingContext2D;
  public showBuildingLabels: boolean = true;
  public showResourceAmounts: boolean = true;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * Draw building label above sprite for better visibility.
   * @param screenX Screen x position
   * @param screenY Screen y position
   * @param buildingType Building type ID
   * @param isUnderConstruction Whether building is under construction
   * @param tileSize Tile size in pixels
   * @param zoom Camera zoom level
   */
  drawBuildingLabel(
    screenX: number,
    screenY: number,
    buildingType: string,
    isUnderConstruction: boolean,
    tileSize: number,
    zoom: number
  ): void {
    // Only show labels when zoomed in enough
    if (zoom < 0.5) return;

    const fontSize = Math.max(8, 10 * zoom);
    this.ctx.font = `${fontSize}px monospace`;
    this.ctx.textAlign = 'center';

    // Format building type for display
    const label = buildingType
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Position label above the sprite
    const labelY = screenY - (isUnderConstruction ? 20 : 8) * zoom;

    // Draw background for better readability
    const metrics = this.ctx.measureText(label);
    const padding = 2;
    const bgX = screenX + (tileSize * zoom) / 2 - metrics.width / 2 - padding;
    const bgY = labelY - fontSize;
    const bgWidth = metrics.width + padding * 2;
    const bgHeight = fontSize + padding;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(bgX, bgY, bgWidth, bgHeight);

    // Draw label text
    this.ctx.fillStyle = isUnderConstruction ? '#FFA500' : '#FFFFFF';
    this.ctx.fillText(
      label,
      screenX + (tileSize * zoom) / 2,
      labelY
    );

    this.ctx.textAlign = 'left'; // Reset
  }

  /**
   * Draw construction progress bar above a building.
   * @param screenX Screen x position
   * @param screenY Screen y position
   * @param progress Construction progress (0-100)
   * @param tileSize Tile size in pixels
   * @param zoom Camera zoom level
   */
  drawConstructionProgress(
    screenX: number,
    screenY: number,
    progress: number,
    tileSize: number,
    zoom: number
  ): void {
    const barWidth = tileSize * zoom;
    const barHeight = 4 * zoom;
    const barX = screenX;
    const barY = screenY - barHeight - 2;

    // Background (dark gray)
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);

    // Progress fill (yellow to green gradient based on progress)
    const progressWidth = (barWidth * progress) / 100;
    if (progress < 50) {
      this.ctx.fillStyle = '#FFA500'; // Orange
    } else if (progress < 75) {
      this.ctx.fillStyle = '#FFFF00'; // Yellow
    } else {
      this.ctx.fillStyle = '#00FF00'; // Green
    }
    this.ctx.fillRect(barX, barY, progressWidth, barHeight);

    // Border (white)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Progress percentage text (if zoom is large enough)
    if (zoom >= 0.5) {
      this.ctx.fillStyle = '#fff';
      this.ctx.font = `${10 * zoom}px monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText(
        `${progress.toFixed(0)}%`,
        barX + barWidth / 2,
        barY - 2
      );
      this.ctx.textAlign = 'left'; // Reset
    }
  }

  /**
   * Draw resource amount bar for harvestable resources (trees, rocks).
   * Shows current amount / max amount with color-coded bar.
   * Bar is always visible; text appears when zoomed in enough.
   * @param screenX Screen x position
   * @param screenY Screen y position
   * @param amount Current resource amount
   * @param maxAmount Maximum resource amount
   * @param resourceType Type of resource (wood, stone, food, water)
   * @param tileSize Tile size in pixels
   * @param zoom Camera zoom level
   */
  drawResourceAmount(
    screenX: number,
    screenY: number,
    amount: number,
    maxAmount: number,
    resourceType: string,
    tileSize: number,
    zoom: number
  ): void {
    const barWidth = tileSize * zoom;
    const barHeight = Math.max(3, 4 * zoom); // Minimum 3px height for visibility
    const barX = screenX;
    const barY = screenY + tileSize * zoom + 2; // Below sprite

    // Calculate percentage
    const percentage = (amount / maxAmount) * 100;

    // Background (dark gray with higher opacity for better visibility)
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);

    // Resource fill (color based on resource type and percentage)
    const resourceColors: Record<string, string> = {
      wood: '#8B4513', // Brown
      stone: '#A0A0A0', // Gray
      food: '#00FF00', // Green
      water: '#1E90FF', // Blue
    };

    let fillColor = resourceColors[resourceType] || '#FFFFFF';

    // Override color based on depletion level for better feedback
    if (percentage < 25) {
      fillColor = '#FF3333'; // Bright red if low
    } else if (percentage < 50) {
      fillColor = '#FF8800'; // Orange if medium
    }

    const fillWidth = (barWidth * amount) / maxAmount;
    this.ctx.fillStyle = fillColor;
    this.ctx.fillRect(barX, barY, fillWidth, barHeight);

    // Border (white, more visible)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Resource amount text (show at lower zoom threshold for better UX)
    if (zoom >= 0.5) {
      this.ctx.fillStyle = '#fff';
      this.ctx.font = `bold ${Math.max(8, 9 * zoom)}px monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      this.ctx.shadowBlur = 3;
      this.ctx.fillText(
        `${amount.toFixed(0)}/${maxAmount}`,
        barX + barWidth / 2,
        barY + barHeight + Math.max(10, 11 * zoom)
      );
      this.ctx.shadowBlur = 0;
      this.ctx.textAlign = 'left'; // Reset
    }
  }
}
