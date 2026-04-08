import type { World, PossessionStatus } from '@ai-village/core';
import type { Entity } from '@ai-village/core';
import type {
  IdentityComponent,
  NeedsComponent,
} from '@ai-village/core';

/**
 * PlayerControlHUD - Displays possession status when player is jacked in
 *
 * Phase 16: Polish & Player - Player Avatar System
 *
 * Shows:
 * - Possessed agent name and avatar
 * - Belief remaining / cost per tick
 * - Time remaining in possession
 * - Agent health / hunger / energy
 * - Warning indicators when belief is low
 */
export class PlayerControlHUD {
  private readonly padding = 14;
  private readonly warningBeliefThreshold = 50;

  // Smoothly interpolated display values
  private displayBelief = -1; // -1 = uninitialized
  private displayTime = -1;
  private displayHealth = -1;
  private displayHunger = -1;
  private displayEnergy = -1;
  private readonly lerpSpeed = 0.08;

  constructor() {}

  /** Lerp a displayed value toward target. Returns new displayed value. */
  private _lerp(current: number, target: number, speed: number): number {
    if (current < 0) return target; // First frame: snap to target
    const diff = target - current;
    if (Math.abs(diff) < 0.002) return target; // Close enough, snap
    return current + diff * speed;
  }

  /**
   * Render the possession HUD (top-right corner)
   */
  render(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    _canvasHeight: number,
    _world: World,
    getPossessionStatus: () => PossessionStatus | null,
    getPossessedAgent: () => Entity | null
  ): void {
    const status = getPossessionStatus();

    if (!status) {
      return;
    }

    const agent = getPossessedAgent();
    if (!agent) {
      return;
    }

    const identity = agent.components.get('identity') as IdentityComponent | undefined;
    const needs = agent.components.get('needs') as NeedsComponent | undefined;

    const agentName = identity?.name ?? 'Unknown Agent';
    const now = performance.now();

    const hudWidth = 264;
    const hudHeight = needs ? 198 : 148;
    const x = canvasWidth - hudWidth - 12;
    const y = 12;

    // Smoothly interpolate belief toward actual value
    this.displayBelief = this._lerp(this.displayBelief, status.beliefRemaining / 100, this.lerpSpeed);
    const beliefFraction = Math.max(0, Math.min(1, this.displayBelief));
    const showWarning = status.beliefRemaining < this.warningBeliefThreshold;
    const showCritical = status.beliefRemaining < 10;

    // Animated warning pulse (1.5 Hz)
    const pulse = 0.5 + 0.5 * Math.sin(now / 333);

    // --- Panel background ---
    ctx.save();

    // Rounded rect clip
    this._roundRect(ctx, x, y, hudWidth, hudHeight, 8);
    ctx.clip();

    // Gradient fill
    const bg = ctx.createLinearGradient(x, y, x, y + hudHeight);
    if (showCritical) {
      bg.addColorStop(0, `rgba(60, 4, 4, ${0.88 + pulse * 0.05})`);
      bg.addColorStop(1, `rgba(28, 2, 2, 0.94)`);
    } else if (showWarning) {
      bg.addColorStop(0, 'rgba(50, 18, 4, 0.90)');
      bg.addColorStop(1, 'rgba(24, 8, 2, 0.94)');
    } else {
      bg.addColorStop(0, 'rgba(10, 8, 22, 0.92)');
      bg.addColorStop(1, 'rgba(5, 4, 14, 0.96)');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, hudWidth, hudHeight);

    ctx.restore();

    // --- Border ---
    ctx.save();
    this._roundRect(ctx, x, y, hudWidth, hudHeight, 8);
    if (showCritical) {
      ctx.strokeStyle = `rgba(255, ${Math.round(30 + pulse * 40)}, 30, ${0.7 + pulse * 0.3})`;
      ctx.shadowColor = `rgba(255, 40, 40, ${0.6 + pulse * 0.4})`;
      ctx.shadowBlur = 10 + pulse * 8;
    } else if (showWarning) {
      ctx.strokeStyle = `rgba(255, ${Math.round(120 + pulse * 60)}, 30, ${0.7 + pulse * 0.2})`;
      ctx.shadowColor = `rgba(255, 140, 40, 0.5)`;
      ctx.shadowBlur = 6;
    } else {
      ctx.strokeStyle = 'rgba(160, 120, 220, 0.6)';
      ctx.shadowColor = 'rgba(140, 80, 240, 0.4)';
      ctx.shadowBlur = 6;
    }
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // --- Title row ---
    let curY = y + this.padding + 13;
    const icon = showCritical ? '⚠' : '⚡';
    const titleColor = showCritical
      ? `rgba(255, ${Math.round(60 + pulse * 80)}, 40, 1)`
      : showWarning
        ? '#FF9933'
        : '#C084FC'; // violet for normal

    ctx.save();
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = titleColor;
    if (showCritical) {
      ctx.shadowColor = titleColor;
      ctx.shadowBlur = 8;
    }
    ctx.fillText(`${icon} JACKED IN`, x + this.padding, curY);

    // Agent name right-aligned
    ctx.font = '11px monospace';
    ctx.fillStyle = 'rgba(220, 200, 255, 0.9)';
    ctx.textAlign = 'right';
    const shortName = agentName.length > 14 ? agentName.slice(0, 13) + '…' : agentName;
    ctx.fillText(shortName, x + hudWidth - this.padding, curY);
    ctx.textAlign = 'left';
    ctx.restore();

    curY += 20;

    // --- Divider ---
    ctx.save();
    ctx.strokeStyle = 'rgba(160, 120, 220, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + this.padding, curY - 3);
    ctx.lineTo(x + hudWidth - this.padding, curY - 3);
    ctx.stroke();
    ctx.restore();

    // --- Belief bar ---
    const beliefColor = this._beliefColor(status.beliefRemaining);
    curY = this._drawLabeledBar(
      ctx,
      x + this.padding,
      curY,
      hudWidth - this.padding * 2,
      'Belief',
      beliefFraction,
      beliefColor,
      `${Math.round(status.beliefRemaining)}  −${status.beliefCostPerTick.toFixed(2)}/tick`,
      showCritical ? pulse : undefined
    );
    curY += 6;

    // --- Time remaining ---
    const secondsRemaining = Math.round(status.ticksRemaining / 20);
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    // Smoothly interpolate time bar
    const rawTimeFraction = Math.min(1, secondsRemaining / 300);
    this.displayTime = this._lerp(this.displayTime, rawTimeFraction, this.lerpSpeed);
    const timeFraction = this.displayTime; // 5 min max display
    const timeColor = timeFraction < 0.15 ? '#FF6060' : timeFraction < 0.35 ? '#FFAA44' : '#60C8FF';
    curY = this._drawLabeledBar(
      ctx,
      x + this.padding,
      curY,
      hudWidth - this.padding * 2,
      'Time',
      timeFraction,
      timeColor,
      timeStr
    );

    // --- Needs section ---
    if (needs) {
      curY += 10;

      // Section label
      ctx.save();
      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(180, 160, 220, 0.6)';
      ctx.fillText('HOST STATUS', x + this.padding, curY);
      ctx.restore();
      curY += 14;

      const barW = (hudWidth - this.padding * 2 - 12) / 3;

      // Smoothly interpolate need bars
      this.displayHealth = this._lerp(this.displayHealth, needs.health, this.lerpSpeed);
      this.displayHunger = this._lerp(this.displayHunger, 1 - needs.hunger, this.lerpSpeed);
      this.displayEnergy = this._lerp(this.displayEnergy, needs.energy, this.lerpSpeed);

      this._drawMiniBar(ctx, x + this.padding,              curY, barW, '❤ Health', this.displayHealth,    this._needColor(needs.health));
      this._drawMiniBar(ctx, x + this.padding + barW + 6,   curY, barW, '🍖 Fed',   this.displayHunger,    this._needColor(1 - needs.hunger));
      this._drawMiniBar(ctx, x + this.padding + barW * 2 + 12, curY, barW, '⚡ Energy', this.displayEnergy, this._needColor(needs.energy));
    }
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  /**
   * Draw a labelled progress bar.  Returns new Y after the bar.
   */
  private _drawLabeledBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    label: string,
    fraction: number,
    color: string,
    valueText: string,
    critPulse?: number
  ): number {
    const barH = 10;
    const labelY = y + 10;
    const barY = y + 14;

    // Label
    ctx.save();
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(200, 185, 235, 0.75)';
    ctx.fillText(label, x, labelY);

    // Value (right-aligned)
    ctx.textAlign = 'right';
    ctx.fillStyle = color;
    ctx.fillText(valueText, x + width, labelY);
    ctx.textAlign = 'left';
    ctx.restore();

    // Bar track
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    this._roundRect(ctx, x, barY, width, barH, 3);
    ctx.fill();

    // Bar fill
    const fillW = Math.max(2, width * fraction);
    const barGrad = ctx.createLinearGradient(x, barY, x + fillW, barY);
    barGrad.addColorStop(0, color);
    barGrad.addColorStop(1, this._brighten(color, 40));
    ctx.fillStyle = barGrad;
    if (critPulse !== undefined) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 6 + critPulse * 6;
    }
    this._roundRect(ctx, x, barY, fillW, barH, 3);
    ctx.fill();
    ctx.restore();

    return barY + barH + 4;
  }

  /** Draw a compact vertical mini-bar (for needs). */
  private _drawMiniBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    label: string,
    fraction: number,
    color: string
  ): void {
    const trackH = 30;
    const fillH = Math.max(2, trackH * fraction);

    // Track (rounded)
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    this._roundRect(ctx, x, y, width, trackH, 3);
    ctx.fill();

    // Fill (bottom-up, rounded)
    const grad = ctx.createLinearGradient(x, y + trackH, x, y + trackH - fillH);
    grad.addColorStop(0, color);
    grad.addColorStop(1, this._brighten(color, 30));
    ctx.fillStyle = grad;
    this._roundRect(ctx, x, y + trackH - fillH, width, fillH, 3);
    ctx.fill();

    // Label
    ctx.font = '9px monospace';
    ctx.fillStyle = 'rgba(200, 185, 235, 0.7)';
    ctx.textAlign = 'center';
    // Strip emoji for width calculation (draw separately)
    const emoji = label.split(' ')[0] ?? '';
    const text = label.split(' ').slice(1).join(' ');
    ctx.fillText(emoji, x + width / 2, y + trackH + 12);
    ctx.fillStyle = 'rgba(180, 160, 220, 0.6)';
    ctx.font = '8px monospace';
    ctx.fillText(text, x + width / 2, y + trackH + 22);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  /** Draws a rounded rect path (does NOT stroke/fill — caller does that). */
  private _roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    w: number, h: number,
    r: number
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

  /** Lighten a hex/rgb color string by adding brightness. */
  private _brighten(color: string, amount: number): string {
    if (color.startsWith('#')) {
      const r = Math.min(255, parseInt(color.slice(1, 3), 16) + amount);
      const g = Math.min(255, parseInt(color.slice(3, 5), 16) + amount);
      const b = Math.min(255, parseInt(color.slice(5, 7), 16) + amount);
      return `rgb(${r}, ${g}, ${b})`;
    }
    return color;
  }

  /** Smooth color ramp for belief (0-100). */
  private _beliefColor(belief: number): string {
    if (belief < 10) return '#FF3030';
    if (belief < 30) return '#FF7722';
    if (belief < 50) return '#FFCC22';
    return '#A78BFA'; // violet when healthy
  }

  /** Smooth color ramp for need values (0–1). */
  private _needColor(value: number): string {
    if (value < 0.3) return '#FF4444';
    if (value < 0.5) return '#FF8844';
    if (value < 0.7) return '#FFCC44';
    return '#44DD88';
  }
}
