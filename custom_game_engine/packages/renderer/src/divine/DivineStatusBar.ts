/**
 * DivineStatusBar - Top status bar showing divine resources
 *
 * Displays:
 * - Divine Energy (current/max with regen rate)
 * - Faith Level (average across all agents)
 * - Quick stats (active prayers, angels working, prophecies pending)
 *
 * This is a fixed UI element, not a draggable window.
 * See: specs/divine-systems-ui.md
 */

import {
  DivineEnergy,
  Prayer,
  Angel,
  Prophecy,
  DIVINE_COLORS,
  getFaithColor,
} from './DivineUITypes.js';

export interface DivineStatusBarProps {
  energy: DivineEnergy;
  averageFaith: number;
  prayers: Prayer[];
  angels: Angel[];
  prophecies: Prophecy[];
}

export class DivineStatusBar {
  private readonly height: number = 32;
  private readonly padding: number = 12;

  /**
   * Get the height of the status bar
   */
  getHeight(): number {
    return this.height;
  }

  /**
   * Render the divine status bar at the top of the screen
   */
  render(
    ctx: CanvasRenderingContext2D,
    screenWidth: number,
    props: DivineStatusBarProps
  ): void {
    ctx.save();

    // Background
    ctx.fillStyle = 'rgba(20, 20, 40, 0.9)';
    ctx.fillRect(0, 0, screenWidth, this.height);

    // Bottom border
    ctx.strokeStyle = DIVINE_COLORS.primary;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, this.height);
    ctx.lineTo(screenWidth, this.height);
    ctx.stroke();

    // Render sections
    let x = this.padding;

    // Title
    x = this.renderTitle(ctx, x);
    x += 30;

    // Divine Energy
    x = this.renderEnergy(ctx, x, props.energy);
    x += 30;

    // Faith Level
    x = this.renderFaith(ctx, x, props.averageFaith);
    x += 30;

    // Quick Stats
    this.renderQuickStats(ctx, x, props);

    ctx.restore();
  }

  /**
   * Render the divine realm title
   */
  private renderTitle(ctx: CanvasRenderingContext2D, x: number): number {
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.fillStyle = DIVINE_COLORS.primary;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const title = '\u{1F31F} Divine Realm';  // Star emoji
    ctx.fillText(title, x, this.height / 2);

    return x + ctx.measureText(title).width;
  }

  /**
   * Render divine energy bar
   */
  private renderEnergy(
    ctx: CanvasRenderingContext2D,
    x: number,
    energy: DivineEnergy
  ): number {
    const y = this.height / 2;

    // Icon
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillStyle = DIVINE_COLORS.primary;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u26A1', x, y);  // Lightning bolt
    x += 18;

    // Label
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText('Energy:', x, y);
    x += 50;

    // Bar background
    const barWidth = 80;
    const barHeight = 10;
    const barY = y - barHeight / 2;

    ctx.fillStyle = '#333333';
    ctx.fillRect(x, barY, barWidth, barHeight);

    // Bar fill
    const fillPercent = energy.current / energy.max;
    const fillColor = this.getEnergyColor(fillPercent);

    ctx.fillStyle = fillColor;
    ctx.fillRect(x, barY, barWidth * fillPercent, barHeight);

    // Border
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, barY, barWidth, barHeight);

    x += barWidth + 8;

    // Text value
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillStyle = fillColor;
    const energyText = `${Math.floor(energy.current)}/${energy.max}`;
    ctx.fillText(energyText, x, y);
    x += ctx.measureText(energyText).width + 8;

    // Regen rate
    const net = energy.regenRate - energy.consumption;
    const netText = net >= 0 ? `+${net.toFixed(1)}` : net.toFixed(1);
    ctx.fillStyle = net >= 0 ? '#90EE90' : '#FF6B6B';
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillText(`(${netText}/min)`, x, y);
    x += ctx.measureText(`(${netText}/min)`).width;

    return x;
  }

  /**
   * Get energy bar color based on fill percentage
   */
  private getEnergyColor(percent: number): string {
    if (percent > 0.6) return DIVINE_COLORS.primary;
    if (percent > 0.3) return DIVINE_COLORS.warning;
    return DIVINE_COLORS.critical;
  }

  /**
   * Render faith level
   */
  private renderFaith(
    ctx: CanvasRenderingContext2D,
    x: number,
    avgFaith: number
  ): number {
    const y = this.height / 2;

    // Label
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Faith:', x, y);
    x += 40;

    // Bar background
    const barWidth = 60;
    const barHeight = 10;
    const barY = y - barHeight / 2;

    ctx.fillStyle = '#333333';
    ctx.fillRect(x, barY, barWidth, barHeight);

    // Bar fill
    const fillPercent = avgFaith / 100;
    const fillColor = getFaithColor(avgFaith);

    ctx.fillStyle = fillColor;
    ctx.fillRect(x, barY, barWidth * fillPercent, barHeight);

    // Border
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, barY, barWidth, barHeight);

    x += barWidth + 8;

    // Text value
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillStyle = fillColor;
    const faithText = `${Math.floor(avgFaith)}%`;
    ctx.fillText(faithText, x, y);
    x += ctx.measureText(faithText).width;

    return x;
  }

  /**
   * Render quick stats
   */
  private renderQuickStats(
    ctx: CanvasRenderingContext2D,
    x: number,
    props: DivineStatusBarProps
  ): void {
    const y = this.height / 2;

    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Unanswered prayers
    const unansweredPrayers = props.prayers.filter(p => !p.answered).length;
    const prayerColor = unansweredPrayers > 5 ? DIVINE_COLORS.critical :
                        unansweredPrayers > 0 ? DIVINE_COLORS.warning : '#90EE90';

    ctx.fillStyle = prayerColor;
    ctx.fillText(`\u{1F64F} ${unansweredPrayers}`, x, y);
    x += 40;

    // Active angels
    const activeAngels = props.angels.filter(a => a.status === 'working').length;
    ctx.fillStyle = DIVINE_COLORS.secondary;
    ctx.fillText(`\u{1F47C} ${activeAngels}/${props.angels.length}`, x, y);
    x += 50;

    // Pending prophecies
    const pendingProphecies = props.prophecies.filter(p => p.status === 'pending').length;
    if (pendingProphecies > 0) {
      ctx.fillStyle = DIVINE_COLORS.accent;
      ctx.fillText(`\u{1F52E} ${pendingProphecies}`, x, y);
    }
  }

  /**
   * Handle click on the status bar
   * @returns Action to take, or null if no action
   */
  handleClick(
    _x: number,
    _y: number,
    _screenWidth: number
  ): 'prayers' | 'angels' | 'prophecies' | null {
    // Could implement click regions to open specific panels
    // For now, return null
    return null;
  }
}
