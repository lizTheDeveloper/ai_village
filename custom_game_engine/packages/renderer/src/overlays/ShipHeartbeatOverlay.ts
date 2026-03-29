/**
 * ShipHeartbeatOverlay — continuous ambient pulse tied to ship awareness state.
 *
 * The effect is intentionally subtle: an edge/corner glow plus center aura
 * that "breathes" at the ship heartbeat cadence.
 */

type AwarenessState = 'dormant' | 'scanning' | 'alert' | 'critical';

interface HeartbeatSnapshot {
  awareness: {
    state: AwarenessState;
    level: number;
    transitionBoost: number;
  };
  heartbeat: {
    cadenceHz: number;
    phase: number;
    pulseStrength: number;
  };
}

interface ColorTriplet {
  r: number;
  g: number;
  b: number;
}

const STATE_COLORS: Record<AwarenessState, ColorTriplet> = {
  dormant: { r: 80, g: 160, b: 190 },
  scanning: { r: 80, g: 210, b: 255 },
  alert: { r: 255, g: 165, b: 90 },
  critical: { r: 255, g: 90, b: 90 },
};

export class ShipHeartbeatOverlay {
  private readonly ctx: CanvasRenderingContext2D;
  private active = false;
  private snapshot: HeartbeatSnapshot = {
    awareness: {
      state: 'dormant',
      level: 0,
      transitionBoost: 0,
    },
    heartbeat: {
      cadenceHz: 0.24,
      phase: 0,
      pulseStrength: 0.2,
    },
  };

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  update(snapshot: HeartbeatSnapshot | null): void {
    if (!snapshot) {
      this.active = false;
      return;
    }

    this.active = true;
    this.snapshot = snapshot;
  }

  render(canvasWidth: number, canvasHeight: number): void {
    if (!this.active) return;

    const { awareness, heartbeat } = this.snapshot;
    const pulse = 0.5 + 0.5 * Math.sin(heartbeat.phase * Math.PI * 2);
    const pulseMix = 0.35 + pulse * 0.65;
    const transitionMix = 1 + awareness.transitionBoost * 0.5;

    const alphaBase = this.clamp01(0.03 + heartbeat.pulseStrength * 0.12);
    const alpha = this.clamp01(alphaBase * pulseMix * transitionMix);
    if (alpha <= 0.002) return;

    const color = STATE_COLORS[awareness.state];
    const minDim = Math.min(canvasWidth, canvasHeight);
    const edgeDepth = Math.max(24, minDim * 0.11);
    const cornerRadius = Math.max(edgeDepth * 1.2, minDim * 0.25);

    this.ctx.save();
    this.drawEdgeGradients(canvasWidth, canvasHeight, edgeDepth, color, alpha);
    this.drawCornerGlows(canvasWidth, canvasHeight, cornerRadius, color, alpha);
    this.drawCenterAura(canvasWidth, canvasHeight, minDim, color, alpha, awareness.level);
    this.ctx.restore();
  }

  private drawEdgeGradients(
    canvasWidth: number,
    canvasHeight: number,
    edgeDepth: number,
    color: ColorTriplet,
    alpha: number
  ): void {
    const top = this.ctx.createLinearGradient(0, 0, 0, edgeDepth);
    top.addColorStop(0, this.rgba(color, alpha));
    top.addColorStop(0.55, this.rgba(color, alpha * 0.38));
    top.addColorStop(1, this.rgba(color, 0));
    this.ctx.fillStyle = top;
    this.ctx.fillRect(0, 0, canvasWidth, edgeDepth);

    const bottom = this.ctx.createLinearGradient(0, canvasHeight, 0, canvasHeight - edgeDepth);
    bottom.addColorStop(0, this.rgba(color, alpha));
    bottom.addColorStop(0.55, this.rgba(color, alpha * 0.38));
    bottom.addColorStop(1, this.rgba(color, 0));
    this.ctx.fillStyle = bottom;
    this.ctx.fillRect(0, canvasHeight - edgeDepth, canvasWidth, edgeDepth);

    const left = this.ctx.createLinearGradient(0, 0, edgeDepth, 0);
    left.addColorStop(0, this.rgba(color, alpha));
    left.addColorStop(0.55, this.rgba(color, alpha * 0.38));
    left.addColorStop(1, this.rgba(color, 0));
    this.ctx.fillStyle = left;
    this.ctx.fillRect(0, 0, edgeDepth, canvasHeight);

    const right = this.ctx.createLinearGradient(canvasWidth, 0, canvasWidth - edgeDepth, 0);
    right.addColorStop(0, this.rgba(color, alpha));
    right.addColorStop(0.55, this.rgba(color, alpha * 0.38));
    right.addColorStop(1, this.rgba(color, 0));
    this.ctx.fillStyle = right;
    this.ctx.fillRect(canvasWidth - edgeDepth, 0, edgeDepth, canvasHeight);
  }

  private drawCornerGlows(
    canvasWidth: number,
    canvasHeight: number,
    radius: number,
    color: ColorTriplet,
    alpha: number
  ): void {
    this.drawCornerGlow(0, 0, radius, color, alpha);
    this.drawCornerGlow(canvasWidth, 0, radius, color, alpha);
    this.drawCornerGlow(0, canvasHeight, radius, color, alpha);
    this.drawCornerGlow(canvasWidth, canvasHeight, radius, color, alpha);
  }

  private drawCornerGlow(
    centerX: number,
    centerY: number,
    radius: number,
    color: ColorTriplet,
    alpha: number
  ): void {
    const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, this.rgba(color, alpha));
    gradient.addColorStop(0.55, this.rgba(color, alpha * 0.32));
    gradient.addColorStop(1, this.rgba(color, 0));

    const left = centerX === 0 ? 0 : centerX - radius;
    const top = centerY === 0 ? 0 : centerY - radius;

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(left, top, radius, radius);
  }

  private drawCenterAura(
    canvasWidth: number,
    canvasHeight: number,
    minDim: number,
    color: ColorTriplet,
    alpha: number,
    awarenessLevel: number
  ): void {
    const radius = minDim * (0.22 + awarenessLevel * 0.08);
    const centerX = canvasWidth * 0.5;
    const centerY = canvasHeight * 0.5;
    const aura = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    aura.addColorStop(0, this.rgba(color, alpha * 0.24));
    aura.addColorStop(0.65, this.rgba(color, alpha * 0.08));
    aura.addColorStop(1, this.rgba(color, 0));
    this.ctx.fillStyle = aura;
    this.ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
  }

  private rgba(color: ColorTriplet, alpha: number): string {
    const clamped = this.clamp01(alpha);
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${clamped})`;
  }

  private clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
  }
}

