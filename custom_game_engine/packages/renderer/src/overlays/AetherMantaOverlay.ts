/**
 * AetherMantaOverlay — sky-shadow rendering layer for the aether_manta.
 *
 * The aether_manta is too large to exist as a positioned entity sprite. At world
 * zoom it manifests as a massive shadow drifting across terrain — an eclipse event
 * felt more than seen. This overlay implements that effect.
 *
 * Art direction: docs/art-direction/planet-biome-species-v1.md (Species 2 section)
 * Task: MUL-2122
 */
export class AetherMantaOverlay {
  private ctx: CanvasRenderingContext2D;

  /** Whether the overlay is currently active (eclipse in progress). */
  private active = false;

  /** Timestamp when the current eclipse started (ms). */
  private startTime = 0;

  /** How long the full eclipse pass takes (ms). Slow and majestic. */
  private readonly PASS_DURATION_MS = 40_000;

  /** How long the shadow takes to fade in / fade out at each end (ms). */
  private readonly FADE_DURATION_MS = 6_000;

  /** Maximum shadow opacity at the darkest point. */
  private readonly PEAK_ALPHA = 0.38;

  /** Horizontal sweep: the shadow starts off the left edge and exits off the right. */
  private readonly SWEEP_OVERSCAN = 1.6; // viewport widths to travel through

  /**
   * Subtle banking oscillation. The manta slowly banks as it passes —
   * the shadow elongates and contracts on a lazy sine wave.
   */
  private readonly BANK_PERIOD_MS = 12_000;
  private readonly BANK_AMPLITUDE = 0.08; // ±8% size variation

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * Trigger a new eclipse pass. Safe to call while one is already active —
   * it will restart the animation.
   */
  trigger(): void {
    this.active = true;
    this.startTime = performance.now();
  }

  /** Stop the overlay immediately (for testing / scene transitions). */
  stop(): void {
    this.active = false;
  }

  get isActive(): boolean {
    return this.active;
  }

  /**
   * Render the shadow overlay onto the canvas.
   * Call once per frame after terrain and entities are drawn.
   *
   * @param canvasWidth  Logical canvas width (CSS pixels)
   * @param canvasHeight Logical canvas height (CSS pixels)
   */
  render(canvasWidth: number, canvasHeight: number): void {
    if (!this.active) return;

    const now = performance.now();
    const elapsed = now - this.startTime;

    if (elapsed >= this.PASS_DURATION_MS) {
      this.active = false;
      return;
    }

    const t = elapsed / this.PASS_DURATION_MS; // 0 → 1 over the pass

    // Envelope: fade in, sustain, fade out
    const alpha = this._envelope(elapsed);
    if (alpha <= 0) return;

    // Horizontal position: sweep from far-left to far-right
    const sweepRange = canvasWidth * this.SWEEP_OVERSCAN;
    const sweepStart = -sweepRange / 2;
    const centerX = sweepStart + sweepRange * t;
    const centerY = canvasHeight * 0.38; // passes in the upper-middle sky

    // Banking oscillation — lazy sinusoidal size variation
    const bankPhase = (elapsed / this.BANK_PERIOD_MS) * Math.PI * 2;
    const bankFactor = 1.0 + Math.sin(bankPhase) * this.BANK_AMPLITUDE;

    // Shadow dimensions — manta seen from below looks like a wide lens
    const baseRadiusX = canvasWidth * 0.38 * bankFactor;
    const baseRadiusY = canvasHeight * 0.16 * bankFactor;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;

    // ── Main shadow body ──────────────────────────────────────────────────
    // Radial gradient: darkest at center, transparent at edge (matches eclipse feel)
    const gradient = this.ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, Math.max(baseRadiusX, baseRadiusY)
    );
    gradient.addColorStop(0.0, 'rgba(8, 5, 20, 0.85)');   // near-black core
    gradient.addColorStop(0.5, 'rgba(12, 8, 30, 0.55)');  // deep purple-dark mid
    gradient.addColorStop(0.78, 'rgba(15, 10, 40, 0.20)'); // soft falloff
    gradient.addColorStop(1.0, 'rgba(15, 10, 40, 0.00)');  // transparent edge

    // Draw the manta silhouette as an ellipse (top-down wing plan = wide oval)
    this.ctx.beginPath();
    this.ctx.ellipse(
      centerX, centerY,
      baseRadiusX, baseRadiusY,
      0, 0, Math.PI * 2
    );
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    // ── Wing-tip filament tendrils ────────────────────────────────────────
    // Two very subtle bioluminescent arcs at the wing tips — cold electric blue.
    // These are nearly invisible (low alpha) but add to the sense of scale.
    this._drawWingTip(
      centerX - baseRadiusX * 0.82,
      centerY,
      baseRadiusY * 0.35,
      bankPhase,
      alpha * 0.18
    );
    this._drawWingTip(
      centerX + baseRadiusX * 0.82,
      centerY,
      baseRadiusY * 0.35,
      bankPhase + Math.PI,
      alpha * 0.18
    );

    // ── Bioluminescent stripe ─────────────────────────────────────────────
    // Cold electric blue-white stripe across the ventral surface.
    // Visible as a thin bright line cutting through the shadow.
    const stripeAlpha = alpha * 0.35;
    this._drawBioStripe(centerX, centerY, baseRadiusX * 0.72, baseRadiusY * 0.22, bankPhase, stripeAlpha);

    this.ctx.restore();
  }

  /** Opacity envelope: fade in → sustain → fade out. */
  private _envelope(elapsed: number): number {
    if (elapsed < this.FADE_DURATION_MS) {
      // Fade in
      return this.PEAK_ALPHA * (elapsed / this.FADE_DURATION_MS);
    }
    const fadeOutStart = this.PASS_DURATION_MS - this.FADE_DURATION_MS;
    if (elapsed > fadeOutStart) {
      // Fade out
      const fadeT = (elapsed - fadeOutStart) / this.FADE_DURATION_MS;
      return this.PEAK_ALPHA * (1 - fadeT);
    }
    return this.PEAK_ALPHA;
  }

  /** Draw a subtle bioluminescent arc at a wing tip. */
  private _drawWingTip(
    x: number,
    y: number,
    radius: number,
    phase: number,
    alpha: number
  ): void {
    const pulse = 0.7 + 0.3 * Math.sin(phase * 2.3);
    this.ctx.save();
    this.ctx.globalAlpha = alpha * pulse;
    this.ctx.strokeStyle = 'rgba(140, 200, 255, 1.0)'; // cold electric blue
    this.ctx.lineWidth = 1.5;
    this.ctx.shadowColor = 'rgba(100, 160, 255, 0.9)';
    this.ctx.shadowBlur = 6;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, -Math.PI * 0.4, Math.PI * 0.4);
    this.ctx.stroke();
    this.ctx.restore();
  }

  /**
   * Draw the bioluminescent ventral stripe — a gentle curve of cold light
   * that runs across the center of the shadow body.
   */
  private _drawBioStripe(
    cx: number,
    cy: number,
    halfWidth: number,
    halfHeight: number,
    phase: number,
    alpha: number
  ): void {
    // The stripe shifts vertically with the banking oscillation
    const stripeY = cy + Math.sin(phase * 0.7) * halfHeight * 0.4;
    const pulse = 0.6 + 0.4 * Math.sin(phase * 1.1 + 1.2);

    this.ctx.save();
    this.ctx.globalAlpha = alpha * pulse;

    const stripeGrad = this.ctx.createLinearGradient(
      cx - halfWidth, stripeY,
      cx + halfWidth, stripeY
    );
    stripeGrad.addColorStop(0.0, 'rgba(180, 220, 255, 0.0)');
    stripeGrad.addColorStop(0.15, 'rgba(160, 210, 255, 0.9)');
    stripeGrad.addColorStop(0.5, 'rgba(200, 235, 255, 1.0)');
    stripeGrad.addColorStop(0.85, 'rgba(160, 210, 255, 0.9)');
    stripeGrad.addColorStop(1.0, 'rgba(180, 220, 255, 0.0)');

    this.ctx.strokeStyle = stripeGrad;
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = 'rgba(120, 180, 255, 0.8)';
    this.ctx.shadowBlur = 8;

    // Gently curved line following the wing curvature
    this.ctx.beginPath();
    this.ctx.moveTo(cx - halfWidth, stripeY + halfHeight * 0.1);
    this.ctx.quadraticCurveTo(cx, stripeY - halfHeight * 0.15, cx + halfWidth, stripeY + halfHeight * 0.1);
    this.ctx.stroke();

    this.ctx.restore();
  }
}
