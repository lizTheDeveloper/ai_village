/**
 * CityStatsWidget - Compact HUD overlay showing city status.
 *
 * Displays minimal city information (population, food, focus) in a small
 * widget that can be clicked to open the full CityManagerPanel.
 */

import type { World } from '@ai-village/core';
import type { CityDirectorComponent, CityFocus } from '@ai-village/core';

export type WidgetPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const FOCUS_ICONS: Record<string, string> = {
  survival: '🛡',
  growth: '🌱',
  security: '⚔',
  prosperity: '💰',
  exploration: '🧭',
  balanced: '⚖',
};

/**
 * Compact city stats widget for HUD.
 */
export class CityStatsWidget {
  private visible: boolean = true;
  private position: WidgetPosition = 'top-right';
  private widgetWidth = 196;
  private widgetHeight = 94;
  private padding = 10;

  // Cached city director data
  private cityDirector: CityDirectorComponent | null = null;

  // Click callback
  private onClickCallback: (() => void) | null = null;

  constructor(position: WidgetPosition = 'top-right') {
    this.position = position;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setPosition(position: WidgetPosition): void {
    this.position = position;
  }

  /**
   * Set callback for when widget is clicked.
   */
  setOnClick(callback: () => void): void {
    this.onClickCallback = callback;
  }

  /**
   * Update with current city director data.
   */
  update(world: World): void {
    const cityDirectors = world.query().with('city_director').executeEntities();
    const firstDirector = cityDirectors.length > 0 ? cityDirectors[0] : null;
    this.cityDirector = firstDirector
      ? firstDirector.getComponent('city_director') as CityDirectorComponent
      : null;
  }

  /**
   * Handle click on the widget.
   */
  handleClick(clickX: number, clickY: number, canvasWidth: number, canvasHeight: number): boolean {
    if (!this.visible || !this.cityDirector) {
      return false;
    }

    const { x, y } = this.getPosition(canvasWidth, canvasHeight);

    if (
      clickX >= x &&
      clickX <= x + this.widgetWidth &&
      clickY >= y &&
      clickY <= y + this.widgetHeight
    ) {
      if (this.onClickCallback) {
        this.onClickCallback();
      }
      return true;
    }

    return false;
  }

  /**
   * Render the widget.
   */
  render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    if (!this.visible || !this.cityDirector) {
      return;
    }

    const { x, y } = this.getPosition(canvasWidth, canvasHeight);
    const w = this.widgetWidth;
    const h = this.widgetHeight;
    const stats = this.cityDirector.stats;
    const focus = (this.cityDirector.reasoning?.focus || 'balanced') as CityFocus;
    const focusColor = this.getFocusColor(focus);

    ctx.save();

    // Subtle ambient glow matching focus color
    ctx.shadowColor = focusColor;
    ctx.shadowBlur = 8;
    this._roundRect(ctx, x, y, w, h, 6);
    ctx.shadowBlur = 0;

    // Clipped gradient background
    ctx.save();
    this._roundRect(ctx, x, y, w, h, 6);
    ctx.clip();
    const bg = ctx.createLinearGradient(x, y, x, y + h);
    bg.addColorStop(0, 'rgba(15, 12, 28, 0.92)');
    bg.addColorStop(1, 'rgba(8, 6, 18, 0.96)');
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);

    // Top accent line — thin gradient bar in focus color
    const accent = ctx.createLinearGradient(x, y, x + w, y);
    accent.addColorStop(0, 'transparent');
    accent.addColorStop(0.2, focusColor);
    accent.addColorStop(0.8, focusColor);
    accent.addColorStop(1, 'transparent');
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, w, 2);

    ctx.restore();

    // Border
    ctx.strokeStyle = 'rgba(200, 170, 80, 0.35)';
    ctx.lineWidth = 1;
    this._roundRect(ctx, x, y, w, h, 6);
    ctx.stroke();

    // --- Content ---
    let curY = y + this.padding + 11;

    // City name (gold, bold)
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#E8C44A';
    const cityName = this.cityDirector.cityName.length > 16
      ? this.cityDirector.cityName.slice(0, 15) + '\u2026'
      : this.cityDirector.cityName;
    ctx.fillText(cityName, x + this.padding, curY);

    // Population badge (right-aligned)
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(220, 215, 240, 0.85)';
    ctx.fillText(`\u{1F464} ${stats.population}`, x + w - this.padding, curY);
    ctx.textAlign = 'left';
    curY += 16;

    // Divider
    ctx.strokeStyle = 'rgba(200, 170, 80, 0.15)';
    ctx.beginPath();
    ctx.moveTo(x + this.padding, curY - 3);
    ctx.lineTo(x + w - this.padding, curY - 3);
    ctx.stroke();

    // Food supply — compact bar
    const foodDays = stats.foodSupply;
    const foodColor = this.getFoodStatusColor(foodDays);
    const foodFraction = Math.min(1, foodDays / 30);
    const barW = w - this.padding * 2;
    const barH = 8;

    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(200, 185, 235, 0.7)';
    ctx.fillText('Food', x + this.padding, curY + 8);
    ctx.textAlign = 'right';
    ctx.fillStyle = foodColor;
    ctx.fillText(`${foodDays.toFixed(1)}d`, x + w - this.padding, curY + 8);
    ctx.textAlign = 'left';
    curY += 12;

    // Bar track
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    this._roundRect(ctx, x + this.padding, curY, barW, barH, 3);
    ctx.fill();

    // Bar fill
    const fillW = Math.max(2, barW * foodFraction);
    const barGrad = ctx.createLinearGradient(x + this.padding, curY, x + this.padding + fillW, curY);
    barGrad.addColorStop(0, foodColor);
    barGrad.addColorStop(1, this._brighten(foodColor, 30));
    ctx.fillStyle = barGrad;
    this._roundRect(ctx, x + this.padding, curY, fillW, barH, 3);
    ctx.fill();

    curY += barH + 8;

    // Focus indicator (bottom row)
    const focusIcon = FOCUS_ICONS[focus] ?? '\u2696';
    ctx.font = '10px monospace';
    ctx.fillStyle = focusColor;
    ctx.fillText(`${focusIcon} ${focus}`, x + this.padding, curY);

    // Click hint (subtle, right-aligned)
    ctx.font = '9px monospace';
    ctx.fillStyle = 'rgba(160, 140, 200, 0.4)';
    ctx.textAlign = 'right';
    ctx.fillText('\u25B6 details', x + w - this.padding, curY);
    ctx.textAlign = 'left';

    ctx.restore();
  }

  private getPosition(canvasWidth: number, canvasHeight: number): { x: number; y: number } {
    const margin = 10;

    switch (this.position) {
      case 'top-left':
        return { x: margin, y: margin };
      case 'top-right':
        return { x: canvasWidth - this.widgetWidth - margin, y: margin };
      case 'bottom-left':
        return { x: margin, y: canvasHeight - this.widgetHeight - margin };
      case 'bottom-right':
        return { x: canvasWidth - this.widgetWidth - margin, y: canvasHeight - this.widgetHeight - margin };
    }
  }

  private getFoodStatusColor(foodDays: number): string {
    if (foodDays < 3) return '#FF4444';
    if (foodDays < 7) return '#FF9800';
    if (foodDays < 14) return '#FFCC22';
    return '#44DD88';
  }

  private getFocusColor(focus: CityFocus): string {
    const colors: Record<CityFocus, string> = {
      survival: '#FF5544',
      growth: '#66DD66',
      security: '#FF9944',
      prosperity: '#44DD88',
      exploration: '#55AAFF',
      balanced: '#C8B8E8',
    };
    return colors[focus] || '#C8B8E8';
  }

  private _roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  private _brighten(color: string, amount: number): string {
    if (color.startsWith('#')) {
      const r = Math.min(255, parseInt(color.slice(1, 3), 16) + amount);
      const g = Math.min(255, parseInt(color.slice(3, 5), 16) + amount);
      const b = Math.min(255, parseInt(color.slice(5, 7), 16) + amount);
      return `rgb(${r}, ${g}, ${b})`;
    }
    return color;
  }
}
