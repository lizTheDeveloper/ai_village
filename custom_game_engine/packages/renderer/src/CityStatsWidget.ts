/**
 * CityStatsWidget - Compact HUD overlay showing city status.
 *
 * Displays minimal city information (population, food, focus) in a small
 * widget that can be clicked to open the full CityManagerPanel.
 */

import type { World } from '@ai-village/core';
import type { CityDirectorComponent, CityFocus } from '@ai-village/core';

export type WidgetPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/**
 * Compact city stats widget for HUD.
 */
export class CityStatsWidget {
  private visible: boolean = true;
  private position: WidgetPosition = 'top-right';
  private widgetWidth = 180;
  private widgetHeight = 80;
  private padding = 8;

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

    // Check if click is within widget bounds
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

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(x, y, this.widgetWidth, this.widgetHeight);

    // Border
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, this.widgetWidth, this.widgetHeight);

    let currentY = y + this.padding;

    // City name
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(this.cityDirector.cityName, x + this.padding, currentY);
    currentY += 14;

    // Population
    const stats = this.cityDirector.stats;
    ctx.fillStyle = '#FFF';
    ctx.font = '11px monospace';
    ctx.fillText(`Pop: ${stats.population}`, x + this.padding, currentY);
    currentY += 13;

    // Food supply with status color
    const foodColor = this.getFoodStatusColor(stats.foodSupply);
    ctx.fillStyle = foodColor;
    ctx.fillText(`Food: ${stats.foodSupply.toFixed(1)} days`, x + this.padding, currentY);
    currentY += 13;

    // Current focus
    const focus = this.cityDirector.reasoning?.focus || 'balanced';
    const focusColor = this.getFocusColor(focus);
    ctx.fillStyle = focusColor;
    ctx.font = '10px monospace';
    ctx.fillText(`Focus: ${focus}`, x + this.padding, currentY);

    // Hover hint
    ctx.fillStyle = '#888';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('(click)', x + this.widgetWidth - this.padding, y + this.widgetHeight - this.padding);
    ctx.textAlign = 'left';
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
    if (foodDays < 3) return '#F44336';  // Critical red
    if (foodDays < 7) return '#FF9800';  // Warning orange
    if (foodDays < 14) return '#FFC107'; // Caution yellow
    return '#4CAF50'; // Good green
  }

  private getFocusColor(focus: CityFocus): string {
    const colors: Record<CityFocus, string> = {
      survival: '#F44336',   // Red
      growth: '#FFC107',     // Yellow
      security: '#FF9800',   // Orange
      prosperity: '#4CAF50', // Green
      exploration: '#2196F3', // Blue
      balanced: '#FFFFFF',   // White
    };
    return colors[focus] || '#FFF';
  }
}
