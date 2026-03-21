/**
 * PatronToastRenderer — soul/spirit-style toast notifications for patron events.
 *
 * Distinct visual style from the CivChronicle toast (parchment) — this one uses
 * a translucent indigo/violet "spirit" aesthetic with a soft glow.
 *
 * Toasts auto-dismiss after ~3.5 seconds and queue when one is already visible.
 *
 * Task: MUL-2336 (Drive 4 — Patron Binding UI)
 */

export type PatronEventType = 'skill_level_up' | 'new_relationship' | 'first_magic_cast' | 'child_born' | 'death';

export interface PatronToastPayload {
  type: PatronEventType;
  agentName: string;
  summary: string;
}

interface ActiveToast extends PatronToastPayload {
  startMs: number;
}

const TOAST_DURATION_MS = 3500;
const FADE_IN_MS = 300;
const FADE_OUT_MS = 500;
const TOAST_W = 280;
const TOAST_H = 68;
const TOAST_MARGIN_RIGHT = 104; // to the left of the patron portrait widget
const TOAST_MARGIN_TOP = 42;   // vertically aligned with portrait

const EVENT_ICONS: Record<PatronEventType, string> = {
  skill_level_up:    '📈',
  new_relationship:  '🤝',
  first_magic_cast:  '✨',
  child_born:        '🌱',
  death:             '🕊️',
};

export class PatronToastRenderer {
  private ctx: CanvasRenderingContext2D;
  private active: ActiveToast | null = null;
  private queue: PatronToastPayload[] = [];

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  show(payload: PatronToastPayload): void {
    if (!this.active) {
      this.active = { ...payload, startMs: performance.now() };
    } else {
      // Deduplicate: don't queue the same event type twice
      if (!this.queue.some((q) => q.type === payload.type && q.agentName === payload.agentName)) {
        this.queue.push(payload);
      }
    }
  }

  get isVisible(): boolean {
    return this.active !== null;
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  render(canvasWidth: number): void {
    if (!this.active) return;

    const now = performance.now();
    const elapsed = now - this.active.startMs;

    if (elapsed >= TOAST_DURATION_MS) {
      this.active = null;
      if (this.queue.length > 0) {
        this.active = { ...this.queue.shift()!, startMs: now };
      }
      return;
    }

    // Compute opacity
    let alpha = 1;
    if (elapsed < FADE_IN_MS) {
      alpha = elapsed / FADE_IN_MS;
    } else if (elapsed > TOAST_DURATION_MS - FADE_OUT_MS) {
      alpha = (TOAST_DURATION_MS - elapsed) / FADE_OUT_MS;
    }

    const ctx = this.ctx;

    // Slide in from the right: ease-out over FADE_IN_MS
    const slideProgress = Math.min(1, elapsed / FADE_IN_MS);
    const slideEase = 1 - (1 - slideProgress) * (1 - slideProgress);
    const slideOffsetX = (1 - slideEase) * 18;

    const tx = canvasWidth - TOAST_W - TOAST_MARGIN_RIGHT + slideOffsetX;
    const ty = TOAST_MARGIN_TOP;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Soft spirit glow behind the box
    const grd = ctx.createRadialGradient(
      tx + TOAST_W / 2, ty + TOAST_H / 2, 0,
      tx + TOAST_W / 2, ty + TOAST_H / 2, TOAST_W * 0.7
    );
    grd.addColorStop(0, 'rgba(110, 60, 220, 0.35)');
    grd.addColorStop(1, 'rgba(40, 0, 100, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(tx - 20, ty - 20, TOAST_W + 40, TOAST_H + 40);

    // Background
    ctx.fillStyle = 'rgba(18, 8, 42, 0.88)';
    this._roundRect(ctx, tx, ty, TOAST_W, TOAST_H, 8);
    ctx.fill();

    // Border — violet spirit
    ctx.strokeStyle = 'rgba(150, 90, 255, 0.75)';
    ctx.lineWidth = 1.5;
    this._roundRect(ctx, tx, ty, TOAST_W, TOAST_H, 8);
    ctx.stroke();

    // Left accent bar
    ctx.fillStyle = 'rgba(150, 90, 255, 0.9)';
    this._roundRect(ctx, tx, ty + 8, 3, TOAST_H - 16, 2);
    ctx.fill();

    // Icon
    const icon = EVENT_ICONS[this.active.type] ?? '✦';
    ctx.font = '22px serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(220, 180, 255, 0.95)';
    ctx.fillText(icon, tx + 12, ty + TOAST_H / 2 + 8);

    // Title (agent name)
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = 'rgba(210, 175, 255, 1)';
    ctx.fillText(this.active.agentName, tx + 44, ty + 20);

    // Summary
    ctx.font = '11px monospace';
    ctx.fillStyle = 'rgba(170, 140, 215, 0.9)';
    const summary = this.active.summary.length > 40
      ? this.active.summary.slice(0, 38) + '…'
      : this.active.summary;
    ctx.fillText(summary, tx + 44, ty + 36);

    // Progress drain bar — remaining display time
    const progressFraction = 1 - elapsed / TOAST_DURATION_MS;
    const barMaxW = TOAST_W - 16;
    const barW = barMaxW * progressFraction;
    const barY = ty + TOAST_H - 6;
    ctx.fillStyle = 'rgba(40, 20, 80, 0.6)';
    this._roundRect(ctx, tx + 8, barY, barMaxW, 2, 1);
    ctx.fill();
    ctx.fillStyle = 'rgba(150, 90, 255, 0.7)';
    if (barW > 1) {
      this._roundRect(ctx, tx + 8, barY, barW, 2, 1);
      ctx.fill();
    }

    // Label: "Patron Event"
    ctx.font = '9px monospace';
    ctx.fillStyle = 'rgba(120, 90, 170, 0.8)';
    ctx.textAlign = 'right';
    ctx.fillText('patron event', tx + TOAST_W - 8, ty + TOAST_H - 10);
    ctx.textAlign = 'left';

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

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
}
