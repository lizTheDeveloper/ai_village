/**
 * PrayerPanel - "The Supplication Chamber"
 *
 * Displays a list of prayers from agents and allows the player to respond.
 * Features:
 * - Prayer list with urgency indicators
 * - Prayer details with agent context
 * - Response options (Vision, Miracle, Assign Angel, Ignore)
 *
 * See: specs/divine-systems-ui.md
 */

import type { IWindowPanel } from '../IWindowPanel.js';
import {
  Prayer,
  PrayerContext,
  PrayerDomain,
  PrayerUrgency,
  Angel,
  DIVINE_COLORS,
  URGENCY_COLORS,
  URGENCY_ICONS,
  getFaithColor,
  getFaithLevel,
  getVisionEnergyCost,
} from './DivineUITypes.js';

export interface PrayerPanelCallbacks {
  onSendVision: (prayerId: string) => void;
  onPerformMiracle: (prayerId: string) => void;
  onAssignAngel: (prayerId: string, angelId: string) => void;
  onIgnorePrayer: (prayerId: string) => void;
  onSelectPrayer: (prayerId: string | null) => void;
}

export interface PrayerPanelState {
  prayers: Prayer[];
  selectedPrayerId: string | null;
  selectedPrayerContext: PrayerContext | null;
  availableAngels: Angel[];
  currentEnergy: number;
  filterDomain: PrayerDomain | 'all';
  filterUrgency: PrayerUrgency | 'all';
}

export class PrayerPanel implements IWindowPanel {
  private visible: boolean = false;
  private state: PrayerPanelState;
  private callbacks: PrayerPanelCallbacks;

  private scrollOffset: number = 0;
  private readonly lineHeight: number = 48;
  private readonly padding: number = 8;
  private readonly listWidth: number = 180;

  constructor(
    initialState: PrayerPanelState,
    callbacks: PrayerPanelCallbacks
  ) {
    this.state = initialState;
    this.callbacks = callbacks;
  }

  // ============================================================================
  // IWindowPanel Implementation
  // ============================================================================

  getId(): string {
    return 'divine-prayers';
  }

  getTitle(): string {
    const unanswered = this.state.prayers.filter(p => !p.answered).length;
    return `\u{1F64F} Prayers & Supplications (${unanswered})`;
  }

  getDefaultWidth(): number {
    return 550;
  }

  getDefaultHeight(): number {
    return 400;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  // ============================================================================
  // State Management
  // ============================================================================

  updateState(newState: Partial<PrayerPanelState>): void {
    this.state = { ...this.state, ...newState };
  }

  getState(): PrayerPanelState {
    return this.state;
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  render(
    ctx: CanvasRenderingContext2D,
    _x: number,
    _y: number,
    width: number,
    height: number,
    _world?: unknown
  ): void {
    ctx.save();

    // Filter prayers
    const filteredPrayers = this.getFilteredPrayers();

    // Render filter bar
    const filterHeight = this.renderFilterBar(ctx, width);

    // Main content area
    const contentY = filterHeight;
    const contentHeight = height - filterHeight;

    // Left panel: Prayer list
    this.renderPrayerList(ctx, 0, contentY, this.listWidth, contentHeight, filteredPrayers);

    // Divider
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.listWidth, contentY);
    ctx.lineTo(this.listWidth, height);
    ctx.stroke();

    // Right panel: Prayer details
    const detailsX = this.listWidth + 1;
    const detailsWidth = width - this.listWidth - 1;
    this.renderPrayerDetails(ctx, detailsX, contentY, detailsWidth, contentHeight);

    ctx.restore();
  }

  /**
   * Render the filter bar at the top
   */
  private renderFilterBar(ctx: CanvasRenderingContext2D, width: number): number {
    const barHeight = 28;

    // Background
    ctx.fillStyle = 'rgba(40, 40, 60, 0.8)';
    ctx.fillRect(0, 0, width, barHeight);

    // Filter labels
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#AAAAAA';

    let x = this.padding;
    ctx.fillText('Filter:', x, barHeight / 2);
    x += 40;

    // Domain filter chips
    const domains: (PrayerDomain | 'all')[] = ['all', 'survival', 'health', 'guidance', 'gratitude'];
    for (const domain of domains) {
      const isActive = this.state.filterDomain === domain;
      const chipWidth = ctx.measureText(this.formatDomain(domain)).width + 12;

      ctx.fillStyle = isActive ? DIVINE_COLORS.primary : '#555555';
      this.roundRect(ctx, x, 5, chipWidth, 18, 4);
      ctx.fill();

      ctx.fillStyle = isActive ? '#000000' : '#CCCCCC';
      ctx.fillText(this.formatDomain(domain), x + 6, barHeight / 2);

      x += chipWidth + 4;
    }

    // Border bottom
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, barHeight);
    ctx.lineTo(width, barHeight);
    ctx.stroke();

    return barHeight;
  }

  /**
   * Render the prayer list on the left
   */
  private renderPrayerList(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    prayers: Prayer[]
  ): void {
    ctx.save();

    // Clip to list area
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    if (prayers.length === 0) {
      ctx.font = '12px "Segoe UI", sans-serif';
      ctx.fillStyle = '#666666';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No prayers', x + width / 2, y + height / 2);
      ctx.restore();
      return;
    }

    // Calculate visible range
    const visibleCount = Math.ceil(height / this.lineHeight) + 1;
    const startIndex = Math.floor(this.scrollOffset / this.lineHeight);
    const endIndex = Math.min(startIndex + visibleCount, prayers.length);

    // Render visible prayers
    for (let i = startIndex; i < endIndex; i++) {
      const prayer = prayers[i];
      if (!prayer) continue;

      const itemY = y + (i * this.lineHeight) - this.scrollOffset;
      this.renderPrayerCard(ctx, x, itemY, width, this.lineHeight, prayer);
    }

    ctx.restore();
  }

  /**
   * Render a single prayer card
   */
  private renderPrayerCard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    prayer: Prayer
  ): void {
    const isSelected = prayer.id === this.state.selectedPrayerId;

    // Background
    ctx.fillStyle = isSelected ? 'rgba(255, 215, 0, 0.15)' : 'transparent';
    ctx.fillRect(x, y, width, height);

    // Left border color (urgency)
    ctx.fillStyle = URGENCY_COLORS[prayer.urgency];
    ctx.fillRect(x, y, 3, height);

    // Content
    const contentX = x + 8;
    let contentY = y + 8;

    // Urgency icon and agent name
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const icon = URGENCY_ICONS[prayer.urgency];
    ctx.fillText(`${icon} ${prayer.agentName}`, contentX, contentY);
    contentY += 16;

    // Prayer preview
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#AAAAAA';

    let preview = prayer.text.slice(0, 25);
    if (prayer.text.length > 25) preview += '...';
    ctx.fillText(`"${preview}"`, contentX, contentY);
    contentY += 14;

    // Time ago
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillStyle = '#666666';
    const timeAgo = this.formatTimeAgo(prayer.timestamp);
    ctx.fillText(timeAgo, contentX, contentY);

    // Bottom border
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.stroke();
  }

  /**
   * Render prayer details on the right
   */
  private renderPrayerDetails(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    if (!this.state.selectedPrayerId) {
      // No prayer selected
      ctx.font = '14px "Segoe UI", sans-serif';
      ctx.fillStyle = '#666666';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Select a prayer to view details', x + width / 2, y + height / 2);
      return;
    }

    const prayer = this.state.prayers.find(p => p.id === this.state.selectedPrayerId);
    const context = this.state.selectedPrayerContext;

    if (!prayer) return;

    let currentY = y + this.padding;
    const contentX = x + this.padding;
    const contentWidth = width - this.padding * 2;

    // Agent info header
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.fillStyle = DIVINE_COLORS.primary;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`From: ${prayer.agentName}`, contentX, currentY);
    currentY += 18;

    if (context) {
      ctx.font = '11px "Segoe UI", sans-serif';
      ctx.fillStyle = '#AAAAAA';
      ctx.fillText(`${context.agentRole}, Age ${context.agentAge}`, contentX, currentY);
      currentY += 14;
      ctx.fillText(`Location: (${context.location.x}, ${context.location.y})`, contentX, currentY);
      currentY += 18;

      // Faith level
      ctx.fillText('Faith:', contentX, currentY);
      const faithBarX = contentX + 40;
      const faithBarWidth = 80;
      this.renderProgressBar(ctx, faithBarX, currentY - 2, faithBarWidth, 12,
        context.faith / 100, getFaithColor(context.faith));

      ctx.fillStyle = getFaithColor(context.faith);
      ctx.fillText(`${context.faith}% (${getFaithLevel(context.faith)})`,
        faithBarX + faithBarWidth + 8, currentY);
      currentY += 18;

      ctx.fillStyle = '#AAAAAA';
      ctx.fillText(`Answered: ${context.answeredCount}/${context.totalPrayerCount}`, contentX, currentY);
      currentY += 20;
    }

    // Divider
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(contentX, currentY);
    ctx.lineTo(contentX + contentWidth, currentY);
    ctx.stroke();
    currentY += 10;

    // Prayer text
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.fillStyle = DIVINE_COLORS.secondary;
    ctx.fillText(`Prayer (${this.formatDomain(prayer.domain)}):`, contentX, currentY);
    currentY += 18;

    ctx.font = 'italic 12px "Crimson Text", Georgia, serif';
    ctx.fillStyle = '#DDDDDD';
    const lines = this.wrapText(ctx, `"${prayer.text}"`, contentWidth);
    for (const line of lines) {
      ctx.fillText(line, contentX, currentY);
      currentY += 16;
    }
    currentY += 10;

    // Agent context (needs)
    if (context) {
      ctx.strokeStyle = '#444444';
      ctx.beginPath();
      ctx.moveTo(contentX, currentY);
      ctx.lineTo(contentX + contentWidth, currentY);
      ctx.stroke();
      currentY += 10;

      ctx.font = 'bold 11px "Segoe UI", sans-serif';
      ctx.fillStyle = '#AAAAAA';
      ctx.fillText('Agent Context:', contentX, currentY);
      currentY += 16;

      // Need bars
      ctx.font = '10px "Segoe UI", sans-serif';
      const needs: Array<{ label: string; value: number; warning: number }> = [
        { label: 'Health', value: context.health, warning: 30 },
        { label: 'Food', value: context.hunger, warning: 20 },
        { label: 'Energy', value: context.energy, warning: 25 },
      ];

      for (const need of needs) {
        ctx.fillStyle = '#888888';
        ctx.fillText(`${need.label}:`, contentX, currentY);

        const barX = contentX + 50;
        const barWidth = 60;
        const color = need.value < need.warning ? DIVINE_COLORS.critical : '#4CAF50';
        this.renderProgressBar(ctx, barX, currentY - 2, barWidth, 10, need.value / 100, color);

        if (need.value < need.warning) {
          ctx.fillText('\u26A0\uFE0F', barX + barWidth + 5, currentY);  // Warning emoji
        }
        currentY += 14;
      }
      currentY += 10;
    }

    // Response options
    ctx.strokeStyle = '#444444';
    ctx.beginPath();
    ctx.moveTo(contentX, currentY);
    ctx.lineTo(contentX + contentWidth, currentY);
    ctx.stroke();
    currentY += 10;

    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText('Response Options:', contentX, currentY);
    currentY += 20;

    // Buttons
    const buttonWidth = (contentWidth - 12) / 2;
    const buttonHeight = 28;

    // Send Vision button
    const visionCost = getVisionEnergyCost('guidance', 'sleep');
    const canAffordVision = this.state.currentEnergy >= visionCost;
    this.renderButton(ctx, contentX, currentY, buttonWidth, buttonHeight,
      `\u{1F4D6} Send Vision`, `\u26A1${visionCost}`,
      canAffordVision ? DIVINE_COLORS.primary : '#555555',
      'vision');

    // Miracle button
    const miracleCost = 50;
    const canAffordMiracle = this.state.currentEnergy >= miracleCost;
    this.renderButton(ctx, contentX + buttonWidth + 12, currentY, buttonWidth, buttonHeight,
      `\u{1F381} Miracle`, `\u26A1${miracleCost}`,
      canAffordMiracle ? DIVINE_COLORS.secondary : '#555555',
      'miracle');

    currentY += buttonHeight + 8;

    // Assign Angel button
    const availableAngels = this.state.availableAngels.filter(a => a.status === 'available');
    const hasAngels = availableAngels.length > 0;
    this.renderButton(ctx, contentX, currentY, buttonWidth, buttonHeight,
      `\u{1F47C} Assign Angel`, hasAngels ? `(${availableAngels.length} available)` : '(none)',
      hasAngels ? DIVINE_COLORS.accent : '#555555',
      'angel');

    // Ignore button
    this.renderButton(ctx, contentX + buttonWidth + 12, currentY, buttonWidth, buttonHeight,
      '\u{1F910} Ignore', '',
      '#666666',
      'ignore');
  }

  /**
   * Render a button
   */
  private renderButton(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    subLabel: string,
    color: string,
    _id: string
  ): void {
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.roundRect(ctx, x, y, width, height, 4);
    ctx.fill();

    // Border
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, y, width, height, 4);
    ctx.stroke();

    // Label
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + width / 2, y + height / 2 - (subLabel ? 4 : 0));

    // Sub-label
    if (subLabel) {
      ctx.font = '9px "Segoe UI", sans-serif';
      ctx.fillStyle = '#888888';
      ctx.fillText(subLabel, x + width / 2, y + height / 2 + 8);
    }
  }

  /**
   * Render a progress bar
   */
  private renderProgressBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    fill: number,
    color: string
  ): void {
    // Background
    ctx.fillStyle = '#333333';
    ctx.fillRect(x, y, width, height);

    // Fill
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width * Math.max(0, Math.min(1, fill)), height);

    // Border
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
  }

  /**
   * Draw a rounded rectangle
   */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // ============================================================================
  // Click Handling
  // ============================================================================

  handleClick(x: number, y: number, _world?: unknown): boolean {
    const filterHeight = 28;

    // Check if click is in prayer list
    if (x < this.listWidth && y > filterHeight) {
      const listY = y - filterHeight;
      const clickedIndex = Math.floor((listY + this.scrollOffset) / this.lineHeight);
      const filteredPrayers = this.getFilteredPrayers();

      if (clickedIndex >= 0 && clickedIndex < filteredPrayers.length) {
        const prayer = filteredPrayers[clickedIndex];
        if (prayer) {
          this.callbacks.onSelectPrayer(prayer.id);
          return true;
        }
      }
    }

    // Check if click is in details area (buttons)
    if (x > this.listWidth && this.state.selectedPrayerId) {
      // Calculate button positions (roughly)
      // This is a simplified version - in production would track button bounds
      const buttonAreaY = 250;  // Approximate start of button area
      const buttonHeight = 28;
      const buttonGap = 8;

      if (y > buttonAreaY && y < buttonAreaY + buttonHeight) {
        // First row of buttons
        if (x < this.listWidth + (this.getDefaultWidth() - this.listWidth) / 2) {
          // Send Vision
          this.callbacks.onSendVision(this.state.selectedPrayerId);
          return true;
        } else {
          // Miracle
          this.callbacks.onPerformMiracle(this.state.selectedPrayerId);
          return true;
        }
      } else if (y > buttonAreaY + buttonHeight + buttonGap &&
                 y < buttonAreaY + buttonHeight * 2 + buttonGap) {
        // Second row of buttons
        if (x < this.listWidth + (this.getDefaultWidth() - this.listWidth) / 2) {
          // Assign Angel
          const angel = this.state.availableAngels.find(a => a.status === 'available');
          if (angel) {
            this.callbacks.onAssignAngel(this.state.selectedPrayerId, angel.id);
          }
          return true;
        } else {
          // Ignore
          this.callbacks.onIgnorePrayer(this.state.selectedPrayerId);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Handle scroll wheel
   */
  handleScroll(deltaY: number): void {
    const filteredPrayers = this.getFilteredPrayers();
    const maxScroll = Math.max(0, filteredPrayers.length * this.lineHeight - 300);
    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset + deltaY));
  }

  // ============================================================================
  // Helper Functions
  // ============================================================================

  private getFilteredPrayers(): Prayer[] {
    return this.state.prayers.filter(p => {
      if (this.state.filterDomain !== 'all' && p.domain !== this.state.filterDomain) {
        return false;
      }
      if (this.state.filterUrgency !== 'all' && p.urgency !== this.state.filterUrgency) {
        return false;
      }
      return true;
    });
  }

  private formatDomain(domain: PrayerDomain | 'all'): string {
    if (domain === 'all') return 'All';
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  }

  private formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
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

    return lines.slice(0, 4);  // Max 4 lines
  }
}
