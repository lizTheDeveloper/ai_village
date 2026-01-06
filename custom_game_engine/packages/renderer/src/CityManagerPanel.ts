/**
 * CityManagerPanel - UI Panel displaying city director information.
 *
 * Shows city statistics, strategic priorities, and AI decision-making.
 * Exposes the autonomous NPC city director to the player for observation.
 */

import type { World } from '@ai-village/core';
import type { CityDirectorComponent, CityStats, StrategicPriorities, CityFocus } from '@ai-village/core';
import type { IWindowPanel } from './types/WindowTypes.js';

/**
 * UI Panel displaying city director information.
 */
export class CityManagerPanel implements IWindowPanel {
  private visible: boolean = false;
  private panelWidth = 360;
  private panelHeight = 500;
  private padding = 12;
  private lineHeight = 16;
  private scrollOffset = 0;
  private maxScrollOffset = 0;

  // Track actual screen position for positioning
  private lastScreenX: number = 0;
  private lastScreenY: number = 0;

  // Cached city director data
  private cityDirector: CityDirectorComponent | null = null;

  getId(): string {
    return 'city-manager';
  }

  getTitle(): string {
    return 'City Manager';
  }

  getDefaultWidth(): number {
    return 360;
  }

  getDefaultHeight(): number {
    return 500;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  /**
   * Update the panel with current city director data.
   */
  update(world: World): void {
    // Find the city director entity
    const cityDirectors = world.query().with('city_director').executeEntities();

    if (cityDirectors.length === 0) {
      this.cityDirector = null;
      return;
    }

    // Get first city director (TODO: support multiple cities)
    const directorEntity = cityDirectors[0];
    this.cityDirector = directorEntity.getComponent('city_director') as CityDirectorComponent;
  }

  /**
   * Handle click on the panel.
   */
  handleClick(clickX: number, clickY: number, panelX: number, panelY: number, width?: number): boolean {
    const actualWidth = width ?? this.panelWidth;

    // Check if click is within panel bounds
    if (
      clickX < panelX ||
      clickX > panelX + actualWidth ||
      clickY < panelY ||
      clickY > panelY + this.panelHeight
    ) {
      return false;
    }

    return true; // Click was handled
  }

  /**
   * Handle mouse wheel for scrolling.
   */
  handleWheel(deltaY: number, mouseX: number, mouseY: number, panelX: number, panelY: number, width?: number): boolean {
    const actualWidth = width ?? this.panelWidth;

    // Check if mouse is over panel
    if (
      mouseX < panelX ||
      mouseX > panelX + actualWidth ||
      mouseY < panelY ||
      mouseY > panelY + this.panelHeight
    ) {
      return false;
    }

    // Scroll
    this.scrollOffset += deltaY > 0 ? 20 : -20;
    this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, this.maxScrollOffset));

    return true; // Wheel was handled
  }

  /**
   * Render the panel.
   */
  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width?: number,
    height?: number
  ): void {
    const actualWidth = width ?? this.panelWidth;
    const actualHeight = height ?? this.panelHeight;

    this.lastScreenX = x;
    this.lastScreenY = y;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(x, y, actualWidth, actualHeight);

    // Border
    ctx.strokeStyle = '#FFD700'; // Gold
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, actualWidth, actualHeight);

    // No city director found
    if (!this.cityDirector) {
      this.renderNoCity(ctx, x, y, actualWidth, actualHeight);
      return;
    }

    // Enable scrolling
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, actualWidth, actualHeight);
    ctx.clip();

    let currentY = y + this.padding - this.scrollOffset;

    // City name header
    currentY = this.renderHeader(ctx, x, currentY, actualWidth);

    // City stats
    currentY = this.renderStats(ctx, x, currentY, actualWidth);

    // Strategic priorities
    currentY = this.renderPriorities(ctx, x, currentY, actualWidth);

    // Current focus and reasoning
    currentY = this.renderFocus(ctx, x, currentY, actualWidth);

    // Calculate max scroll offset
    const contentHeight = currentY - (y + this.padding);
    this.maxScrollOffset = Math.max(0, contentHeight - actualHeight + this.padding * 2);

    ctx.restore();

    // Scroll indicator
    if (this.maxScrollOffset > 0) {
      this.renderScrollIndicator(ctx, x, y, actualWidth, actualHeight);
    }
  }

  private renderNoCity(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('No city director found', x + width / 2, y + height / 2);
    ctx.textAlign = 'left';
  }

  private renderHeader(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): number {
    if (!this.cityDirector) return y;

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(this.cityDirector.cityName, x + this.padding, y);
    y += this.lineHeight + 4;

    ctx.fillStyle = '#AAA';
    ctx.font = '11px monospace';
    const mode = this.cityDirector.useLLM ? 'LLM-driven' : 'Rule-based';
    ctx.fillText(`Mode: ${mode}`, x + this.padding, y);
    y += this.lineHeight + 8;

    return y;
  }

  private renderStats(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): number {
    if (!this.cityDirector) return y;

    const stats = this.cityDirector.stats;

    // Section header
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('City Statistics', x + this.padding, y);
    y += this.lineHeight + 4;

    // Stats
    ctx.font = '12px monospace';
    const statLines = [
      `Population: ${stats.population} (${stats.autonomicNpcCount} autonomic, ${stats.llmAgentCount} LLM)`,
      `Buildings: ${stats.totalBuildings} (housing: ${stats.housingCapacity})`,
      `Food: ${stats.foodSupply.toFixed(1)} days ${this.getFoodStatusIcon(stats.foodSupply)}`,
      `Resources: ${stats.woodSupply} wood, ${stats.stoneSupply} stone`,
      `Threats: ${stats.nearbyThreats} nearby, ${stats.recentDeaths} recent deaths`,
    ];

    for (const line of statLines) {
      const color = this.getStatColor(line);
      ctx.fillStyle = color;
      ctx.fillText(line, x + this.padding, y);
      y += this.lineHeight;
    }

    y += 8;
    return y;
  }

  private renderPriorities(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): number {
    if (!this.cityDirector) return y;

    const priorities = this.cityDirector.priorities;

    // Section header
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('City Priorities', x + this.padding, y);
    y += this.lineHeight + 4;

    ctx.fillStyle = '#AAA';
    ctx.font = '11px monospace';
    ctx.fillText(`Influence: ${(this.cityDirector.cityInfluence * 100).toFixed(0)}% city, ${((1 - this.cityDirector.cityInfluence) * 100).toFixed(0)}% personal`, x + this.padding, y);
    y += this.lineHeight + 4;

    // Priority bars
    const priorityOrder: Array<keyof StrategicPriorities> = [
      'gathering',
      'building',
      'farming',
      'social',
      'exploration',
      'rest',
      'magic',
    ];

    const barWidth = width - this.padding * 2 - 100;
    const barHeight = 12;

    for (const category of priorityOrder) {
      const value = priorities[category] ?? 0;
      const percentage = (value * 100).toFixed(0);

      // Label
      ctx.fillStyle = '#FFF';
      ctx.font = '12px monospace';
      const label = category.charAt(0).toUpperCase() + category.slice(1);
      ctx.fillText(`${label}:`, x + this.padding, y + barHeight - 2);

      // Bar background
      const barX = x + this.padding + 85;
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, y, barWidth, barHeight);

      // Bar fill
      const fillWidth = barWidth * value;
      ctx.fillStyle = this.getPriorityColor(category);
      ctx.fillRect(barX, y, fillWidth, barHeight);

      // Percentage
      ctx.fillStyle = '#FFF';
      ctx.font = '10px monospace';
      ctx.fillText(`${percentage}%`, barX + barWidth + 4, y + barHeight - 2);

      y += barHeight + 4;
    }

    y += 8;
    return y;
  }

  private renderFocus(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): number {
    if (!this.cityDirector) return y;

    const reasoning = this.cityDirector.reasoning;

    // Section header
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Current Focus', x + this.padding, y);
    y += this.lineHeight + 4;

    if (!reasoning) {
      ctx.fillStyle = '#888';
      ctx.font = '12px monospace';
      ctx.fillText('No decision made yet', x + this.padding, y);
      y += this.lineHeight + 8;
      return y;
    }

    // Focus
    ctx.fillStyle = this.getFocusColor(reasoning.focus);
    ctx.font = 'bold 13px monospace';
    ctx.fillText(reasoning.focus.toUpperCase(), x + this.padding, y);
    y += this.lineHeight + 4;

    // Reasoning
    ctx.fillStyle = '#CCC';
    ctx.font = '11px monospace';
    const reasoningLines = this.wrapText(ctx, reasoning.reasoning, width - this.padding * 2);
    for (const line of reasoningLines) {
      ctx.fillText(line, x + this.padding, y);
      y += this.lineHeight;
    }

    y += 4;

    // Concerns
    if (reasoning.concerns && reasoning.concerns.length > 0) {
      ctx.fillStyle = '#FF9800';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('Concerns:', x + this.padding, y);
      y += this.lineHeight + 2;

      ctx.fillStyle = '#FFA';
      ctx.font = '11px monospace';
      for (const concern of reasoning.concerns) {
        const concernLines = this.wrapText(ctx, `• ${concern}`, width - this.padding * 2 - 10);
        for (const line of concernLines) {
          ctx.fillText(line, x + this.padding + 10, y);
          y += this.lineHeight;
        }
      }
    }

    y += 8;
    return y;
  }

  private renderScrollIndicator(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    const scrollbarWidth = 4;
    const scrollbarX = x + width - scrollbarWidth - 4;

    const scrollbarHeight = height - this.padding * 2;
    const thumbHeight = Math.max(20, scrollbarHeight * (height / (height + this.maxScrollOffset)));
    const thumbY = y + this.padding + (scrollbarHeight - thumbHeight) * (this.scrollOffset / this.maxScrollOffset);

    // Scrollbar track
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(scrollbarX, y + this.padding, scrollbarWidth, scrollbarHeight);

    // Scrollbar thumb
    ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
    ctx.fillRect(scrollbarX, thumbY, scrollbarWidth, thumbHeight);
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  private getFoodStatusIcon(foodDays: number): string {
    if (foodDays < 3) return '🔴'; // Critical
    if (foodDays < 7) return '🟠'; // Low
    if (foodDays < 14) return '🟡'; // Adequate
    return '🟢'; // Abundant
  }

  private getStatColor(line: string): string {
    if (line.includes('🔴')) return '#F44336'; // Critical red
    if (line.includes('🟠')) return '#FF9800'; // Warning orange
    if (line.includes('🟡')) return '#FFC107'; // Caution yellow
    if (line.includes('🟢')) return '#4CAF50'; // Good green
    if (line.includes('Threats') && line.includes('0')) return '#4CAF50';
    if (line.includes('Threats')) return '#FF5722';
    return '#CCC';
  }

  private getPriorityColor(category: keyof StrategicPriorities): string {
    const colors: Record<keyof StrategicPriorities, string> = {
      gathering: '#8B4513',  // Brown
      building: '#9E9E9E',   // Gray
      farming: '#4CAF50',    // Green
      social: '#9C27B0',     // Purple
      exploration: '#2196F3', // Blue
      rest: '#00BCD4',       // Cyan
      magic: '#E91E63',      // Magenta
    };
    return colors[category] || '#888';
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

  /**
   * Clean up resources.
   */
  destroy(): void {
    // No resources to clean up currently
  }
}
