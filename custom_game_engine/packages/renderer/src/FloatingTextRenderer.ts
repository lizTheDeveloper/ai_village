import type { Camera } from './Camera.js';

export interface FloatingText {
  text: string;
  worldX: number;
  worldY: number;
  color: string;
  startTime: number;
  duration: number;
}

/**
 * Renders floating text (like "+10 Wood") that fades and floats upward.
 * Used for visual feedback when gathering resources, completing tasks, etc.
 */
export class FloatingTextRenderer {
  private texts: FloatingText[] = [];

  /**
   * Add a new floating text at the given world position.
   */
  add(text: string, worldX: number, worldY: number, color: string = '#FFFFFF', duration: number = 2000): void {
    this.texts.push({
      text,
      worldX,
      worldY,
      color,
      startTime: Date.now(),
      duration,
    });
  }

  /**
   * Render all active floating texts.
   */
  render(ctx: CanvasRenderingContext2D, camera: Camera, currentTime: number): void {
    // Remove expired texts
    this.texts = this.texts.filter((ft) => currentTime - ft.startTime < ft.duration);

    // Render each text
    for (const ft of this.texts) {
      const elapsed = currentTime - ft.startTime;
      const progress = elapsed / ft.duration; // 0 to 1

      // Calculate screen position
      const screenX = (ft.worldX - camera.x) * camera.zoom + ctx.canvas.width / 2;
      const screenY = (ft.worldY - camera.y) * camera.zoom + ctx.canvas.height / 2;

      // Float upward over time
      const offsetY = -progress * 30; // Rise 30 pixels

      // Fade out over time
      const alpha = 1 - progress;

      // Draw text
      ctx.save();
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = alpha;

      // Shadow for visibility
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, screenX, screenY + offsetY);

      ctx.restore();
    }
  }

  /**
   * Clear all floating texts.
   */
  clear(): void {
    this.texts = [];
  }
}
