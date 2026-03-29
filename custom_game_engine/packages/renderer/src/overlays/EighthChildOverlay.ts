/**
 * EighthChildOverlay — ambient amber edge pulse for the Eighth Child signal.
 *
 * Visual spec:
 * - Color: #e8b84b
 * - Peak opacity: 0.15
 * - Timing: 500ms ease-in -> 1000ms hold -> 500ms fade-out
 * - Feel: environmental edge glow only (no UI symbols/text)
 */
const EASE_IN_MS = 500;
const HOLD_MS = 1000;
const FADE_OUT_MS = 500;
const TOTAL_DURATION_MS = EASE_IN_MS + HOLD_MS + FADE_OUT_MS;

const PEAK_OPACITY = 0.15;
const EDGE_COLOR_RGB = '232, 184, 75'; // #e8b84b

export class EighthChildOverlay {
  private ctx: CanvasRenderingContext2D;
  private active = false;
  private startTimeMs = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * Start (or restart) the pulse.
   * Retriggering resets the timer instead of stacking.
   */
  trigger(now: number = performance.now()): void {
    this.active = true;
    this.startTimeMs = now;
  }

  stop(): void {
    this.active = false;
  }

  get isActive(): boolean {
    return this.active;
  }

  render(canvasWidth: number, canvasHeight: number, now: number = performance.now()): void {
    if (!this.active) return;

    const elapsedMs = now - this.startTimeMs;
    if (elapsedMs >= TOTAL_DURATION_MS) {
      this.active = false;
      return;
    }

    const opacity = this.getOpacity(elapsedMs);
    if (opacity <= 0) return;

    const minCanvasDimension = Math.min(canvasWidth, canvasHeight);
    const edgeDepth = Math.max(40, minCanvasDimension * 0.2);
    const cornerRadius = Math.max(edgeDepth * 1.35, minCanvasDimension * 0.28);

    this.ctx.save();
    this.drawEdgeGradients(canvasWidth, canvasHeight, edgeDepth, opacity);
    this.drawCornerGlows(canvasWidth, canvasHeight, cornerRadius, opacity);
    this.ctx.restore();
  }

  private getOpacity(elapsedMs: number): number {
    if (elapsedMs < EASE_IN_MS) {
      const t = elapsedMs / EASE_IN_MS;
      return PEAK_OPACITY * this.easeInCubic(t);
    }

    if (elapsedMs < EASE_IN_MS + HOLD_MS) {
      return PEAK_OPACITY;
    }

    const fadeElapsed = elapsedMs - (EASE_IN_MS + HOLD_MS);
    const t = Math.min(1, fadeElapsed / FADE_OUT_MS);
    return PEAK_OPACITY * (1 - this.easeOutCubic(t));
  }

  private drawEdgeGradients(
    canvasWidth: number,
    canvasHeight: number,
    edgeDepth: number,
    opacity: number
  ): void {
    const top = this.ctx.createLinearGradient(0, 0, 0, edgeDepth);
    top.addColorStop(0, this.rgba(opacity));
    top.addColorStop(0.55, this.rgba(opacity * 0.42));
    top.addColorStop(1, this.rgba(0));
    this.ctx.fillStyle = top;
    this.ctx.fillRect(0, 0, canvasWidth, edgeDepth);

    const bottom = this.ctx.createLinearGradient(0, canvasHeight, 0, canvasHeight - edgeDepth);
    bottom.addColorStop(0, this.rgba(opacity));
    bottom.addColorStop(0.55, this.rgba(opacity * 0.42));
    bottom.addColorStop(1, this.rgba(0));
    this.ctx.fillStyle = bottom;
    this.ctx.fillRect(0, canvasHeight - edgeDepth, canvasWidth, edgeDepth);

    const left = this.ctx.createLinearGradient(0, 0, edgeDepth, 0);
    left.addColorStop(0, this.rgba(opacity));
    left.addColorStop(0.55, this.rgba(opacity * 0.42));
    left.addColorStop(1, this.rgba(0));
    this.ctx.fillStyle = left;
    this.ctx.fillRect(0, 0, edgeDepth, canvasHeight);

    const right = this.ctx.createLinearGradient(canvasWidth, 0, canvasWidth - edgeDepth, 0);
    right.addColorStop(0, this.rgba(opacity));
    right.addColorStop(0.55, this.rgba(opacity * 0.42));
    right.addColorStop(1, this.rgba(0));
    this.ctx.fillStyle = right;
    this.ctx.fillRect(canvasWidth - edgeDepth, 0, edgeDepth, canvasHeight);
  }

  private drawCornerGlows(
    canvasWidth: number,
    canvasHeight: number,
    cornerRadius: number,
    opacity: number
  ): void {
    this.drawCornerGlow(0, 0, cornerRadius, opacity);
    this.drawCornerGlow(canvasWidth, 0, cornerRadius, opacity);
    this.drawCornerGlow(0, canvasHeight, cornerRadius, opacity);
    this.drawCornerGlow(canvasWidth, canvasHeight, cornerRadius, opacity);
  }

  private drawCornerGlow(centerX: number, centerY: number, radius: number, opacity: number): void {
    const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, this.rgba(opacity));
    gradient.addColorStop(0.55, this.rgba(opacity * 0.35));
    gradient.addColorStop(1, this.rgba(0));

    const left = centerX === 0 ? 0 : centerX - radius;
    const top = centerY === 0 ? 0 : centerY - radius;

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(left, top, radius, radius);
  }

  private rgba(alpha: number): string {
    const clamped = Math.max(0, Math.min(1, alpha));
    return `rgba(${EDGE_COLOR_RGB}, ${clamped})`;
  }

  private easeInCubic(t: number): number {
    return t * t * t;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
}
