/**
 * DivineAnalyticsPanel - "The Omniscient View"
 *
 * Dashboard showing divine metrics and analytics.
 * Features:
 * - Faith trends graph
 * - Prayer statistics by domain
 * - Prophecy tracker
 * - Agent faith distribution histogram
 * - Divine resource economy
 *
 * See: specs/divine-systems-ui.md
 */

import type { IWindowPanel } from '../IWindowPanel.js';
import {
  DivineAnalytics,
  Prophecy,
  ProphecyStatus,
  PrayerDomain,
  DivineEnergy,
  DIVINE_COLORS,
} from './DivineUITypes.js';

export interface DivineAnalyticsCallbacks {
  onSelectProphecy: (prophecyId: string) => void;
  onExportData: () => void;
  onTimeRangeChange: (range: TimeRange) => void;
}

export type TimeRange = '1_day' | '7_days' | '30_days' | 'all_time';

export interface DivineAnalyticsState {
  analytics: DivineAnalytics;
  energy: DivineEnergy;
  selectedTimeRange: TimeRange;
  selectedProphecyId: string | null;
  scrollOffset: number;
}

export class DivineAnalyticsPanel implements IWindowPanel {
  private visible: boolean = false;
  private state: DivineAnalyticsState;
  private callbacks: DivineAnalyticsCallbacks;

  private readonly padding: number = 12;
  private readonly sectionGap: number = 15;
  private contentHeight: number = 0;

  constructor(
    initialState: DivineAnalyticsState,
    callbacks: DivineAnalyticsCallbacks
  ) {
    this.state = initialState;
    this.callbacks = callbacks;
  }

  // ============================================================================
  // IWindowPanel Implementation
  // ============================================================================

  getId(): string {
    return 'divine-analytics';
  }

  getTitle(): string {
    return '\u{1F4CA} Divine Insights';
  }

  getDefaultWidth(): number {
    return 700;
  }

  getDefaultHeight(): number {
    return 550;
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

  updateState(newState: Partial<DivineAnalyticsState>): void {
    this.state = { ...this.state, ...newState };
  }

  getState(): DivineAnalyticsState {
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

    // Header with time range selector
    const headerHeight = this.renderHeaderControls(ctx, width);

    // Scrollable content area
    ctx.beginPath();
    ctx.rect(0, headerHeight, width, height - headerHeight);
    ctx.clip();

    ctx.translate(0, -this.state.scrollOffset);

    let currentY = headerHeight + this.padding;

    // Overview cards row
    currentY = this.renderOverviewCards(ctx, this.padding, currentY, width - this.padding * 2);
    currentY += this.sectionGap;

    // Prayer breakdown
    currentY = this.renderPrayerBreakdown(ctx, this.padding, currentY, width - this.padding * 2);
    currentY += this.sectionGap;

    // Prophecy tracker
    currentY = this.renderProphecyTracker(ctx, this.padding, currentY, width - this.padding * 2);
    currentY += this.sectionGap;

    // Faith distribution histogram
    currentY = this.renderFaithDistribution(ctx, this.padding, currentY, width - this.padding * 2);
    currentY += this.sectionGap;

    // Resource economy
    currentY = this.renderResourceEconomy(ctx, this.padding, currentY, width - this.padding * 2);

    this.contentHeight = currentY + this.padding;

    ctx.restore();
  }

  /**
   * Render header with time range selector
   */
  private renderHeaderControls(ctx: CanvasRenderingContext2D, width: number): number {
    const headerHeight = 36;

    // Background
    ctx.fillStyle = 'rgba(40, 40, 60, 0.9)';
    ctx.fillRect(0, 0, width, headerHeight);

    // Time range selector
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText('Time Range:', this.padding, headerHeight / 2);

    const ranges: Array<{ id: TimeRange; label: string }> = [
      { id: '1_day', label: '24h' },
      { id: '7_days', label: '7 days' },
      { id: '30_days', label: '30 days' },
      { id: 'all_time', label: 'All' },
    ];

    let x = 85;
    for (const range of ranges) {
      const isActive = this.state.selectedTimeRange === range.id;
      const labelWidth = ctx.measureText(range.label).width + 16;

      ctx.fillStyle = isActive ? DIVINE_COLORS.primary : '#444444';
      this.roundRect(ctx, x, 8, labelWidth, 20, 3);
      ctx.fill();

      ctx.fillStyle = isActive ? '#000000' : '#AAAAAA';
      ctx.fillText(range.label, x + 8, headerHeight / 2);

      x += labelWidth + 6;
    }

    // Export button (right side)
    const exportText = 'Export';
    const exportWidth = ctx.measureText(exportText).width + 20;
    const exportX = width - exportWidth - this.padding;

    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    this.roundRect(ctx, exportX, 8, exportWidth, 20, 3);
    ctx.stroke();

    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(exportText, exportX + 10, headerHeight / 2);

    // Bottom border
    ctx.strokeStyle = '#333333';
    ctx.beginPath();
    ctx.moveTo(0, headerHeight);
    ctx.lineTo(width, headerHeight);
    ctx.stroke();

    return headerHeight;
  }

  /**
   * Render overview cards (3 mini charts)
   */
  private renderOverviewCards(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number
  ): number {
    const cardWidth = (width - 20) / 3;
    const cardHeight = 100;

    // Faith Trends card
    this.renderMiniChart(ctx, x, y, cardWidth, cardHeight,
      'Faith Trends', this.state.analytics.faithTrends.map(t => t.avgFaith),
      `Avg: ${this.state.analytics.faithDistribution.average.toFixed(0)}%`,
      DIVINE_COLORS.faithHigh);

    // Prayer Activity card
    const prayerData = this.generatePrayerActivityData();
    this.renderMiniChart(ctx, x + cardWidth + 10, y, cardWidth, cardHeight,
      'Prayer Activity', prayerData,
      `Total: ${this.state.analytics.prayerStats.total}`,
      DIVINE_COLORS.accent);

    // Angel Performance card (success rate trend - simulated)
    const angelData = this.generateAngelPerformanceData();
    this.renderMiniChart(ctx, x + (cardWidth + 10) * 2, y, cardWidth, cardHeight,
      'Angel Performance', angelData,
      `Success: ${this.calculateAngelSuccessRate()}%`,
      DIVINE_COLORS.secondary);

    return y + cardHeight;
  }

  /**
   * Render a mini sparkline chart
   */
  private renderMiniChart(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    data: number[],
    summary: string,
    color: string
  ): void {
    // Card background
    ctx.fillStyle = 'rgba(50, 50, 70, 0.6)';
    this.roundRect(ctx, x, y, width, height, 6);
    ctx.fill();

    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, y, width, height, 6);
    ctx.stroke();

    // Title
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#CCCCCC';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(title, x + 10, y + 8);

    // Sparkline chart
    if (data.length > 1) {
      const chartX = x + 10;
      const chartY = y + 30;
      const chartWidth = width - 20;
      const chartHeight = 40;

      const minVal = Math.min(...data);
      const maxVal = Math.max(...data);
      const range = maxVal - minVal || 1;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i < data.length; i++) {
        const px = chartX + (i / (data.length - 1)) * chartWidth;
        const py = chartY + chartHeight - ((data[i]! - minVal) / range) * chartHeight;

        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();

      // Fill under line
      ctx.lineTo(chartX + chartWidth, chartY + chartHeight);
      ctx.lineTo(chartX, chartY + chartHeight);
      ctx.closePath();
      ctx.fillStyle = color.replace(')', ', 0.2)').replace('rgb', 'rgba');
      ctx.fill();
    }

    // Summary text
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.fillText(summary, x + 10, y + height - 16);
  }

  /**
   * Render prayer breakdown by domain
   */
  private renderPrayerBreakdown(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number
  ): number {
    const sectionHeight = 140;

    // Section background
    ctx.fillStyle = 'rgba(50, 50, 70, 0.6)';
    this.roundRect(ctx, x, y, width, sectionHeight, 6);
    ctx.fill();

    // Title
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#CCCCCC';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Prayer Breakdown by Domain', x + 12, y + 10);

    const stats = this.state.analytics.prayerStats;
    const total = stats.total || 1;

    const domains: Array<{ domain: PrayerDomain; color: string }> = [
      { domain: 'survival', color: '#FF6B6B' },
      { domain: 'health', color: '#4ECDC4' },
      { domain: 'social', color: '#45B7D1' },
      { domain: 'guidance', color: '#96CEB4' },
      { domain: 'environment', color: '#FFEAA7' },
      { domain: 'gratitude', color: '#90EE90' },
    ];

    let barY = y + 35;
    const barMaxWidth = width - 180;

    for (const { domain, color } of domains) {
      const count = stats.byDomain[domain] || 0;
      const percent = (count / total) * 100;
      const barWidth = (count / total) * barMaxWidth;

      // Domain label
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.fillStyle = '#AAAAAA';
      ctx.textAlign = 'left';
      ctx.fillText(this.formatDomain(domain), x + 12, barY + 4);

      // Bar background
      ctx.fillStyle = '#333333';
      ctx.fillRect(x + 80, barY, barMaxWidth, 14);

      // Bar fill
      ctx.fillStyle = color;
      ctx.fillRect(x + 80, barY, barWidth, 14);

      // Count and percentage
      ctx.fillStyle = '#CCCCCC';
      ctx.textAlign = 'right';
      ctx.fillText(`${count} (${percent.toFixed(0)}%)`, x + width - 12, barY + 4);

      barY += 18;
    }

    return y + sectionHeight;
  }

  /**
   * Render prophecy tracker
   */
  private renderProphecyTracker(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number
  ): number {
    const prophecies = this.state.analytics.prophecies;
    const itemHeight = 50;
    const headerHeight = 35;
    const maxItems = 3;
    const sectionHeight = headerHeight + Math.min(prophecies.length, maxItems) * itemHeight + 20;

    // Section background
    ctx.fillStyle = 'rgba(50, 50, 70, 0.6)';
    this.roundRect(ctx, x, y, width, sectionHeight, 6);
    ctx.fill();

    // Title
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#CCCCCC';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Prophecy Tracker', x + 12, y + 10);

    // Success rate
    const fulfilled = prophecies.filter(p => p.status === 'fulfilled').length;
    const total = prophecies.length || 1;
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.textAlign = 'right';
    ctx.fillText(`Success: ${((fulfilled / total) * 100).toFixed(0)}%`, x + width - 12, y + 12);

    if (prophecies.length === 0) {
      ctx.font = '11px "Segoe UI", sans-serif';
      ctx.fillStyle = '#666666';
      ctx.textAlign = 'center';
      ctx.fillText('No prophecies issued yet', x + width / 2, y + headerHeight + 20);
      return y + sectionHeight;
    }

    let itemY = y + headerHeight;
    const displayedProphecies = prophecies.slice(0, maxItems);

    for (const prophecy of displayedProphecies) {
      this.renderProphecyItem(ctx, x + 12, itemY, width - 24, itemHeight - 5, prophecy);
      itemY += itemHeight;
    }

    return y + sectionHeight;
  }

  /**
   * Render a single prophecy item
   */
  private renderProphecyItem(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    _height: number,
    prophecy: Prophecy
  ): void {
    // Status icon
    const statusIcon = this.getProphecyStatusIcon(prophecy.status);
    const statusColor = this.getProphecyStatusColor(prophecy.status);

    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillStyle = statusColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(statusIcon, x, y + 2);

    // Message (truncated)
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    const message = prophecy.message.length > 40
      ? prophecy.message.slice(0, 40) + '...'
      : prophecy.message;
    ctx.fillText(`"${message}"`, x + 22, y + 3);

    // Recipient
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillStyle = '#888888';
    ctx.fillText(`To: ${prophecy.recipientName}`, x + 22, y + 18);

    // Status text
    ctx.fillStyle = statusColor;
    ctx.textAlign = 'right';
    ctx.fillText(this.formatProphecyStatus(prophecy), x + width, y + 3);

    // Faith impact
    if (prophecy.faithImpact !== undefined) {
      const impactColor = prophecy.faithImpact >= 0 ? '#90EE90' : '#FF6B6B';
      const impactText = prophecy.faithImpact >= 0 ? `+${prophecy.faithImpact}%` : `${prophecy.faithImpact}%`;
      ctx.fillStyle = impactColor;
      ctx.fillText(`Faith: ${impactText}`, x + width, y + 18);
    }
  }

  /**
   * Render faith distribution histogram
   */
  private renderFaithDistribution(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number
  ): number {
    const sectionHeight = 130;

    // Section background
    ctx.fillStyle = 'rgba(50, 50, 70, 0.6)';
    this.roundRect(ctx, x, y, width, sectionHeight, 6);
    ctx.fill();

    // Title
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#CCCCCC';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Agent Faith Distribution', x + 12, y + 10);

    const dist = this.state.analytics.faithDistribution;
    const categories = [
      { label: '0-30%\nSkeptics', value: dist.skeptics, color: DIVINE_COLORS.faithCritical },
      { label: '30-50%\nCurious', value: dist.curious, color: DIVINE_COLORS.faithLow },
      { label: '50-80%\nBelievers', value: dist.believers, color: DIVINE_COLORS.faithMedium },
      { label: '80-100%\nDevout', value: dist.devout, color: DIVINE_COLORS.faithHigh },
    ];

    const maxVal = Math.max(...categories.map(c => c.value)) || 1;
    const barAreaX = x + 50;
    const barAreaWidth = width - 100;
    const barAreaY = y + 35;
    const barAreaHeight = 60;
    const barWidth = (barAreaWidth - 30) / categories.length;

    // Draw bars
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i]!;
      const barX = barAreaX + i * (barWidth + 10);
      const barHeight = (cat.value / maxVal) * barAreaHeight;
      const barY = barAreaY + barAreaHeight - barHeight;

      // Bar
      ctx.fillStyle = cat.color;
      ctx.fillRect(barX, barY, barWidth, barHeight);

      // Value on top
      ctx.font = 'bold 10px "Segoe UI", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(`${cat.value}`, barX + barWidth / 2, barY - 12);

      // Label below
      ctx.font = '9px "Segoe UI", sans-serif';
      ctx.fillStyle = '#888888';
      const lines = cat.label.split('\n');
      for (let j = 0; j < lines.length; j++) {
        ctx.fillText(lines[j]!, barX + barWidth / 2, barAreaY + barAreaHeight + 8 + j * 10);
      }
    }

    // Summary line
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.textAlign = 'left';
    ctx.fillText(
      `Avg Faith: ${dist.average.toFixed(0)}%  |  Skeptics: ${dist.skeptics}  |  Believers: ${dist.believers}  |  Devout: ${dist.devout}`,
      x + 12, y + sectionHeight - 18
    );

    return y + sectionHeight;
  }

  /**
   * Render resource economy section
   */
  private renderResourceEconomy(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number
  ): number {
    const sectionHeight = 120;

    // Section background
    ctx.fillStyle = 'rgba(50, 50, 70, 0.6)';
    this.roundRect(ctx, x, y, width, sectionHeight, 6);
    ctx.fill();

    // Title
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#CCCCCC';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Divine Resource Economy', x + 12, y + 10);

    const economy = this.state.analytics.energyEconomy;
    const energy = this.state.energy;

    // Two columns
    const col1X = x + 12;
    const col2X = x + width / 2 + 12;
    let lineY = y + 35;

    // Left column: Income
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#90EE90';
    ctx.fillText('Energy Production:', col1X, lineY);
    lineY += 16;

    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(`\u2022 Base Regen: +${energy.regenRate.toFixed(1)}/min`, col1X, lineY);
    lineY += 14;

    const faithBonus = economy.income - energy.regenRate;
    ctx.fillText(`\u2022 Faith Bonus: +${faithBonus.toFixed(1)}/min`, col1X, lineY);
    lineY += 14;

    ctx.fillStyle = '#90EE90';
    ctx.fillText(`Total Income: +${economy.income.toFixed(1)}/min`, col1X, lineY);

    // Right column: Consumption
    lineY = y + 35;
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#FF6B6B';
    ctx.fillText('Energy Consumption:', col2X, lineY);
    lineY += 16;

    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(`\u2022 Angel Upkeep: -${energy.consumption.toFixed(1)}/min`, col2X, lineY);
    lineY += 14;

    ctx.fillStyle = '#FF6B6B';
    ctx.fillText(`Total Upkeep: -${economy.consumption.toFixed(1)}/min`, col2X, lineY);

    // Net calculation
    lineY += 20;
    const net = economy.net;
    const netColor = net >= 0 ? '#90EE90' : '#FF6B6B';
    const netSign = net >= 0 ? '+' : '';

    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.fillStyle = netColor;
    ctx.textAlign = 'center';
    ctx.fillText(`Net: ${netSign}${net.toFixed(1)}/min`, x + width / 2, lineY);

    // Warning if deficit
    if (net < 0) {
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.fillStyle = DIVINE_COLORS.warning;
      ctx.fillText('\u26A0\uFE0F Energy deficit - reduce angel activity or increase faith', x + width / 2, lineY + 16);
    }

    return y + sectionHeight;
  }

  // ============================================================================
  // Helper Functions
  // ============================================================================

  private formatDomain(domain: PrayerDomain): string {
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  }

  private getProphecyStatusIcon(status: ProphecyStatus): string {
    const icons: Record<ProphecyStatus, string> = {
      pending: '\u23F3',  // Hourglass
      fulfilled: '\u2705', // Check
      failed: '\u274C',   // X
      partial: '\u26A0\uFE0F', // Warning
    };
    return icons[status];
  }

  private getProphecyStatusColor(status: ProphecyStatus): string {
    const colors: Record<ProphecyStatus, string> = {
      pending: DIVINE_COLORS.warning,
      fulfilled: '#90EE90',
      failed: DIVINE_COLORS.critical,
      partial: DIVINE_COLORS.warning,
    };
    return colors[status];
  }

  private formatProphecyStatus(prophecy: Prophecy): string {
    switch (prophecy.status) {
      case 'pending':
        if (prophecy.deadline) {
          const remaining = prophecy.deadline - Date.now();
          const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
          return `Pending (${days}d)`;
        }
        return 'Pending';
      case 'fulfilled':
        return 'Fulfilled \u2713';
      case 'failed':
        return 'Failed \u2717';
      case 'partial':
        return 'Partial';
    }
  }

  private generatePrayerActivityData(): number[] {
    // Generate sample data based on prayer stats
    const total = this.state.analytics.prayerStats.total;
    return Array.from({ length: 7 }, () => Math.floor(Math.random() * (total / 3) + total / 7));
  }

  private generateAngelPerformanceData(): number[] {
    // Generate sample success rate trend
    return Array.from({ length: 7 }, () => 70 + Math.random() * 25);
  }

  private calculateAngelSuccessRate(): number {
    const stats = this.state.analytics.prayerStats;
    if (stats.total === 0) return 100;
    return Math.round((stats.answered / stats.total) * 100);
  }

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
    const headerHeight = 36;

    // Time range selector clicks
    if (y < headerHeight) {
      return this.handleHeaderClick(x);
    }

    return false;
  }

  private handleHeaderClick(x: number): boolean {
    // Time range buttons (approximate positions)
    const ranges: Array<{ id: TimeRange; start: number; end: number }> = [
      { id: '1_day', start: 85, end: 115 },
      { id: '7_days', start: 121, end: 165 },
      { id: '30_days', start: 171, end: 225 },
      { id: 'all_time', start: 231, end: 265 },
    ];

    for (const range of ranges) {
      if (x >= range.start && x < range.end) {
        this.callbacks.onTimeRangeChange(range.id);
        return true;
      }
    }

    // Export button
    if (x >= this.getDefaultWidth() - 70) {
      this.callbacks.onExportData();
      return true;
    }

    return false;
  }

  /**
   * Handle scroll
   */
  handleScroll(deltaY: number, contentHeight: number): boolean {
    const maxScroll = Math.max(0, this.contentHeight - contentHeight + 50);
    this.state.scrollOffset = Math.max(0, Math.min(maxScroll, this.state.scrollOffset + deltaY));
    return true;
  }
}
