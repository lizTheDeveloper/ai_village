/**
 * EternalReturnGlyphOverlay — renders a small four-pointed glyph in the
 * bottom-left corner after the player's first settlement is founded.
 *
 * Part of the Eternal Return cross-game feature (MUL-2543).
 * First encounter: cosmetic only. Second+: click opens Folkfork Cycle tab.
 */

const GLYPH_SIZE = 24;
const GLYPH_MARGIN = 16;
// Glyph color: muted gold/amber, subtle
const GLYPH_COLOR_BASE = [200, 170, 100] as const;
const GLYPH_HOVER_COLOR = 'rgba(220, 190, 120, 0.95)';
// Pulse animation: slow breathe cycle (4 seconds)
const PULSE_SPEED = 0.0015;

export class EternalReturnGlyphOverlay {
  private ctx: CanvasRenderingContext2D;
  private active = false;
  private encounterCount = 0;
  private folkforkCycleUrl = '';

  /** Last-rendered glyph bounds for click detection */
  private bounds = { x: 0, y: 0, w: GLYPH_SIZE, h: GLYPH_SIZE };

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * Activate the glyph display.
   * @param encounterCount — from Folkfork API response
   * @param folkforkCycleUrl — URL to open on click (for encounterCount >= 2)
   */
  trigger(encounterCount: number, folkforkCycleUrl: string): void {
    this.active = true;
    this.encounterCount = encounterCount;
    this.folkforkCycleUrl = folkforkCycleUrl;
  }

  get isActive(): boolean {
    return this.active;
  }

  /**
   * Handle a canvas click. Returns true if the glyph consumed it.
   * Only interactive on second+ encounter.
   */
  handleClick(clickX: number, clickY: number): boolean {
    if (!this.active || this.encounterCount < 2) return false;

    const { x, y, w, h } = this.bounds;
    if (clickX < x || clickX > x + w || clickY < y || clickY > y + h) return false;

    if (this.folkforkCycleUrl) {
      window.open(this.folkforkCycleUrl, '_blank');
    }
    return true;
  }

  /**
   * Render the four-pointed glyph. Call once per frame after world rendering.
   */
  render(canvasWidth: number, canvasHeight: number, timestamp: number = Date.now()): void {
    if (!this.active) return;

    const ctx = this.ctx;
    const size = GLYPH_SIZE;
    const half = size / 2;

    // Position: bottom-left corner with margin
    const gx = GLYPH_MARGIN;
    const gy = canvasHeight - GLYPH_MARGIN - size;

    this.bounds = { x: gx, y: gy, w: size, h: size };

    const cx = gx + half;
    const cy = gy + half;

    // Slow breathe animation: alpha oscillates gently
    const pulse = 0.55 + 0.25 * Math.sin(timestamp * PULSE_SPEED);
    const glowPulse = 0.15 + 0.15 * Math.sin(timestamp * PULSE_SPEED + 0.5);

    ctx.save();

    // Ambient glow behind the glyph
    const [r, g, b] = GLYPH_COLOR_BASE;
    ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${glowPulse})`;
    ctx.shadowBlur = 8 + 4 * Math.sin(timestamp * PULSE_SPEED);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw four-pointed star/glyph
    if (this.encounterCount >= 2) {
      ctx.fillStyle = GLYPH_HOVER_COLOR;
    } else {
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${pulse})`;
    }
    ctx.beginPath();

    // Four-pointed star: 4 points alternating between outer and inner radius
    const outerRadius = half;
    const innerRadius = half * 0.3;
    const points = 4;

    // Slow rotation: one full turn per ~60 seconds
    const rotationOffset = (timestamp * 0.001) % (Math.PI * 2);

    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2 + rotationOffset;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const px = cx + radius * Math.cos(angle);
      const py = cy + radius * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }

    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Suppress unused-parameter warning: canvasWidth is part of the render contract
    void canvasWidth;
  }
}
