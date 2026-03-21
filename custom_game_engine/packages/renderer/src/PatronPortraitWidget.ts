/**
 * PatronPortraitWidget — persistent top-right corner widget for the bound patron agent.
 *
 * Shows the patron's sprite and name at all times while a patron is bound.
 * Pulses with a soul-glow effect when a patron event fires.
 * Shows a dimmed placeholder when no patron is bound.
 *
 * Task: MUL-2336 (Drive 4 — Patron Binding UI)
 */

import type { PatronEventType } from './PatronToastRenderer.js';
export type { PatronEventType };

/** Minimal patron info needed for rendering */
export interface PatronInfo {
  id: string;
  name: string;
  spriteId?: string;
}

const WIDGET_SIZE = 80;
const WIDGET_MARGIN = 12;
const PORTRAIT_SIZE = 48;
const NAME_HEIGHT = 18;
const PULSE_DURATION_MS = 1800;

export class PatronPortraitWidget {
  private ctx: CanvasRenderingContext2D;

  private patron: PatronInfo | null = null;

  /** Timestamp when a patron event pulse started; 0 = no active pulse */
  private pulseStartMs = 0;

  private onBindClick?: () => void;
  private onUnbindClick?: () => void;

  /** Last-rendered widget bounds for click detection */
  private bounds = { x: 0, y: 0, w: WIDGET_SIZE, h: WIDGET_SIZE + NAME_HEIGHT + 6 };

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  setPatron(patron: PatronInfo | null): void {
    this.patron = patron;
  }

  getPatron(): PatronInfo | null {
    return this.patron;
  }

  /** Call when a PATRON_EVENT fires to trigger the pulse animation. */
  triggerPulse(): void {
    this.pulseStartMs = performance.now();
  }

  setOnBindClick(cb: () => void): void {
    this.onBindClick = cb;
  }

  setOnUnbindClick(cb: () => void): void {
    this.onUnbindClick = cb;
  }

  /**
   * Handle a canvas click. Returns true if the widget consumed it.
   * widgetX/widgetY are the top-left of where the widget was last rendered.
   */
  handleClick(clickX: number, clickY: number): boolean {
    const { x, y, w, h } = this.bounds;
    if (clickX < x || clickX > x + w || clickY < y || clickY > y + h) return false;

    if (this.patron && this.onUnbindClick) {
      this.onUnbindClick();
    } else if (!this.patron && this.onBindClick) {
      this.onBindClick();
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  render(canvasWidth: number, _canvasHeight: number): void {
    const ctx = this.ctx;
    const now = performance.now();

    const widgetW = WIDGET_SIZE;
    const widgetH = WIDGET_SIZE + NAME_HEIGHT + 6;
    const wx = canvasWidth - widgetW - WIDGET_MARGIN;
    const wy = WIDGET_MARGIN + 34; // Below menu bar

    this.bounds = { x: wx, y: wy, w: widgetW, h: widgetH };

    ctx.save();

    // --- Soul-glow pulse ---
    const pulseElapsed = this.pulseStartMs > 0 ? now - this.pulseStartMs : PULSE_DURATION_MS + 1;
    const pulsing = pulseElapsed < PULSE_DURATION_MS;
    const pulseAlpha = pulsing
      ? Math.sin((pulseElapsed / PULSE_DURATION_MS) * Math.PI) * 0.85
      : 0;

    if (pulsing) {
      const glowRadius = WIDGET_SIZE * 0.7 + pulseAlpha * 16;
      const gx = wx + widgetW / 2;
      const gy = wy + WIDGET_SIZE / 2;
      const grd = ctx.createRadialGradient(gx, gy, 4, gx, gy, glowRadius);
      grd.addColorStop(0, `rgba(180, 120, 255, ${pulseAlpha * 0.6})`);
      grd.addColorStop(1, 'rgba(80, 0, 180, 0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(gx, gy, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Widget background ---
    const bgAlpha = this.patron ? 0.82 : 0.45;
    ctx.fillStyle = `rgba(12, 8, 28, ${bgAlpha})`;
    this._roundRect(ctx, wx, wy, widgetW, widgetH, 8);
    ctx.fill();

    const borderColor = this.patron
      ? pulsing
        ? `rgba(180, 120, 255, ${0.5 + pulseAlpha * 0.5})`
        : 'rgba(130, 80, 220, 0.7)'
      : 'rgba(80, 60, 100, 0.4)';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    this._roundRect(ctx, wx, wy, widgetW, widgetH, 8);
    ctx.stroke();

    // --- Portrait area ---
    const px = wx + (widgetW - PORTRAIT_SIZE) / 2;
    const py = wy + (WIDGET_SIZE - PORTRAIT_SIZE) / 2;

    if (this.patron) {
      this._renderPatronPortrait(px, py, PORTRAIT_SIZE, this.patron);
    } else {
      this._renderNoPatronPlaceholder(px, py, PORTRAIT_SIZE);
    }

    // --- Name label ---
    const labelY = wy + WIDGET_SIZE + 2;
    ctx.textAlign = 'center';
    ctx.font = '11px monospace';

    if (this.patron) {
      ctx.fillStyle = pulsing
        ? `rgba(210, 170, 255, ${0.8 + pulseAlpha * 0.2})`
        : 'rgba(190, 150, 255, 0.9)';
      ctx.fillText(this.patron.name, wx + widgetW / 2, labelY + 12, widgetW - 8);
    } else {
      ctx.fillStyle = 'rgba(120, 100, 140, 0.6)';
      ctx.fillText('no patron', wx + widgetW / 2, labelY + 12);
    }

    ctx.textAlign = 'left';
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _renderPatronPortrait(px: number, py: number, size: number, patron: PatronInfo): void {
    const ctx = this.ctx;

    // Soul-circle frame
    ctx.strokeStyle = 'rgba(150, 100, 240, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px + size / 2, py + size / 2, size / 2 + 2, 0, Math.PI * 2);
    ctx.stroke();

    // Sprite background
    ctx.fillStyle = 'rgba(30, 10, 60, 0.7)';
    ctx.beginPath();
    ctx.arc(px + size / 2, py + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Initials fallback (real sprite loading delegated to SpriteRenderer when available)
    const initials = patron.name.slice(0, 2).toUpperCase();
    ctx.font = `bold ${size * 0.35}px monospace`;
    ctx.fillStyle = 'rgba(200, 160, 255, 0.95)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, px + size / 2, py + size / 2);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
  }

  private _renderNoPatronPlaceholder(px: number, py: number, size: number): void {
    const ctx = this.ctx;

    ctx.strokeStyle = 'rgba(80, 60, 100, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(px + size / 2, py + size / 2, size / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = `${size * 0.4}px monospace`;
    ctx.fillStyle = 'rgba(120, 100, 140, 0.5)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦', px + size / 2, py + size / 2);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
  }

  /** Minimal roundRect helper — avoids ctx.roundRect which is not in all targets */
  private _roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
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
}
