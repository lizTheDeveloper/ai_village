/**
 * Handles rendering of animal overlays: state indicators, behavior labels.
 * Extracted from Renderer.ts to improve maintainability.
 */
export class AnimalRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * Draw animal state label above the animal.
   * Shows what the animal is currently doing.
   */
  drawAnimalState(
    screenX: number,
    screenY: number,
    state: string,
    wild: boolean,
    tileSize: number,
    zoom: number
  ): void {
    // Only show if zoom is reasonable
    if (zoom < 0.5) return;

    // Format state for display
    let displayText = state.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    // Add emoji indicators
    if (state === 'sleeping') {
      displayText = 'Sleeping 💤';
    } else if (state === 'eating') {
      displayText = 'Eating 🍽️';
    } else if (state === 'drinking') {
      displayText = 'Drinking 💧';
    } else if (state === 'foraging') {
      displayText = 'Foraging 🌾';
    } else if (state === 'fleeing') {
      displayText = 'Fleeing 💨';
    } else if (state === 'idle') {
      displayText = wild ? 'Wild' : 'Idle';
    }

    // Position above sprite
    const labelX = screenX + (tileSize * zoom) / 2;
    const labelY = screenY - 8 * zoom;

    // Draw background
    this.ctx.font = `${9 * zoom}px monospace`;
    const textWidth = this.ctx.measureText(displayText).width;
    const padding = 3 * zoom;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(
      labelX - textWidth / 2 - padding,
      labelY - 10 * zoom,
      textWidth + padding * 2,
      12 * zoom
    );

    // Draw text (different color for wild animals)
    this.ctx.fillStyle = wild ? '#FFA500' : '#90EE90'; // Orange for wild, light green for tamed
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(displayText, labelX, labelY - 4 * zoom);

    // Reset
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';
  }
}
