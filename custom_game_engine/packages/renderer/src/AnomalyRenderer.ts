/**
 * AnomalyRenderer - Visual effects for asteroid anomaly discovery sites
 *
 * Renders distinctive particle/glow/distortion effects for each of the 7
 * anomaly types when discovered on asteroids during stellar exploration.
 *
 * Features:
 * - Unique particle shapes and colors per anomaly type
 * - Radial glow with gradient layering
 * - Directional beam effects for signal/convergence types
 * - Distortion ripple for spatial/void/convergence types
 * - Active vs dormant animation states
 * - Performance-safe: LOD cutoff hides particles when zoom < threshold
 * - Object-pooled particles to minimize GC
 *
 * Usage:
 * ```typescript
 * const anomalyRenderer = new AnomalyRenderer();
 * // In render loop:
 * anomalyRenderer.render(ctx, camera, anomalySites, timestamp);
 * ```
 */

import type { Camera } from './Camera.js';
import {
  ANOMALY_TYPES,
  type AnomalyTypeId,
  type AnomalyState,
  type AnomalyVisualConfig,
  type AnomalyParticleShape,
} from './sim/anomalyTypes.js';

/** A rendered anomaly site at a world position */
export interface AnomalySite {
  /** Anomaly type identifier */
  typeId: AnomalyTypeId;
  /** World X coordinate */
  x: number;
  /** World Y coordinate */
  y: number;
  /** Active or dormant state */
  state: AnomalyState;
  /** Unique site identifier (for particle state isolation) */
  id: string;
}

/** Pooled particle for anomaly effects */
interface AnomalyParticle {
  /** Offset from anomaly center in world units */
  offsetX: number;
  offsetY: number;
  /** Angular position for orbit-style motion */
  angle: number;
  /** Angular velocity (radians per ms) */
  angularVelocity: number;
  /** Radial distance from center */
  radius: number;
  /** Target radius (for pulsing) */
  targetRadius: number;
  /** Normalized age 0-1 */
  age: number;
  /** Normalized lifespan (ms) */
  lifetime: number;
  /** Birth time */
  birthTime: number;
  /** Size in pixels at zoom=1 */
  size: number;
  /** Color override (uses anomaly primary if empty) */
  color: string;
  /** Is this particle slot active? */
  active: boolean;
}

/** Per-site particle state (keyed by site id) */
interface SiteParticleState {
  particles: AnomalyParticle[];
  lastSpawnTime: number;
}

/** Zoom level below which particles are not drawn (LOD optimization) */
const PARTICLE_LOD_CUTOFF = 0.3;
/** Zoom level below which only the core glow is drawn */
const GLOW_LOD_CUTOFF = 0.1;
/** Maximum particles per site */
const MAX_PARTICLES_PER_SITE = 40;
/** Dormant animation intensity multiplier */
const DORMANT_INTENSITY = 0.35;
/** Active animation intensity multiplier */
const ACTIVE_INTENSITY = 1.0;
/** Two PI constant */
const TWO_PI = Math.PI * 2;

export class AnomalyRenderer {
  /** Per-site particle state, keyed by site.id */
  private siteStates: Map<string, SiteParticleState> = new Map();

  /**
   * Render all anomaly sites.
   * Call this once per frame after terrain rendering, before UI.
   *
   * @param ctx Canvas rendering context
   * @param camera Current camera
   * @param sites Anomaly sites to render this frame
   * @param timestamp Current animation timestamp (ms)
   */
  render(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    sites: AnomalySite[],
    timestamp: number
  ): void {
    if (sites.length === 0) return;

    const zoom = camera.zoom;
    const cameraX = camera.x;
    const cameraY = camera.y;
    const halfW = ctx.canvas.width / 2;
    const halfH = ctx.canvas.height / 2;

    // Skip fully zoomed-out rendering
    if (zoom < GLOW_LOD_CUTOFF) return;

    const drawParticles = zoom >= PARTICLE_LOD_CUTOFF;

    ctx.save();

    for (const site of sites) {
      const typeDef = ANOMALY_TYPES[site.typeId];
      if (!typeDef) continue;

      const visual = typeDef.visual;
      const intensity = site.state === 'active' ? ACTIVE_INTENSITY : DORMANT_INTENSITY;

      // World → screen
      const screenX = (site.x - cameraX) * zoom + halfW;
      const screenY = (site.y - cameraY) * zoom + halfH;

      // Cull off-screen sites (with padding for glow radius)
      const glowScreenR = visual.glowRadius * zoom * 1.5;
      if (
        screenX + glowScreenR < 0 ||
        screenX - glowScreenR > ctx.canvas.width ||
        screenY + glowScreenR < 0 ||
        screenY - glowScreenR > ctx.canvas.height
      ) {
        continue;
      }

      this.renderSite(ctx, visual, screenX, screenY, zoom, timestamp, intensity, drawParticles, site);
    }

    ctx.restore();
  }

  /**
   * Render a single anomaly site at screen coordinates.
   */
  private renderSite(
    ctx: CanvasRenderingContext2D,
    visual: AnomalyVisualConfig,
    sx: number,
    sy: number,
    zoom: number,
    timestamp: number,
    intensity: number,
    drawParticles: boolean,
    site: AnomalySite
  ): void {
    const glowR = visual.glowRadius * zoom;
    const coreR = visual.coreRadius * zoom;
    const speedMult = visual.animationSpeed;
    const t = timestamp * 0.001 * speedMult; // normalized time in seconds

    // --- Outer glow ---
    this.renderGlow(ctx, visual, sx, sy, glowR, t, intensity);

    // --- Distortion rings (spatial types) ---
    if (visual.hasDistortion) {
      this.renderDistortionRings(ctx, visual, sx, sy, glowR, t, intensity);
    }

    // --- Directional beams (signal types) ---
    if (visual.hasBeams) {
      this.renderBeams(ctx, visual, sx, sy, glowR, t, intensity, visual.symmetryPoints);
    }

    // --- Core ---
    this.renderCore(ctx, visual, sx, sy, coreR, t, intensity);

    // --- Particles (skipped at low zoom) ---
    if (drawParticles) {
      this.renderParticles(ctx, visual, sx, sy, zoom, t, timestamp, intensity, site);
    }
  }

  // ---------------------------------------------------------------------------
  // Glow
  // ---------------------------------------------------------------------------

  private renderGlow(
    ctx: CanvasRenderingContext2D,
    visual: AnomalyVisualConfig,
    sx: number,
    sy: number,
    glowR: number,
    t: number,
    intensity: number
  ): void {
    // Pulse the glow radius slightly
    const pulse = 1 + 0.1 * Math.sin(t * TWO_PI * 0.5);
    const r = glowR * pulse;

    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    // Parse hex primary color to rgba
    grad.addColorStop(0, this.withAlpha(visual.primaryColor, 0.55 * intensity));
    grad.addColorStop(0.4, this.withAlpha(visual.primaryColor, 0.2 * intensity));
    grad.addColorStop(0.8, this.withAlpha(visual.secondaryColor, 0.08 * intensity));
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, TWO_PI);
    ctx.fill();
  }

  // ---------------------------------------------------------------------------
  // Core
  // ---------------------------------------------------------------------------

  private renderCore(
    ctx: CanvasRenderingContext2D,
    visual: AnomalyVisualConfig,
    sx: number,
    sy: number,
    coreR: number,
    t: number,
    intensity: number
  ): void {
    const pulse = 1 + 0.15 * Math.sin(t * TWO_PI * 1.5);
    const r = coreR * pulse;

    // Inner bright core
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    grad.addColorStop(0, this.withAlpha(visual.accentColor, intensity));
    grad.addColorStop(0.5, this.withAlpha(visual.primaryColor, 0.8 * intensity));
    grad.addColorStop(1, this.withAlpha(visual.primaryColor, 0.1 * intensity));

    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, TWO_PI);
    ctx.fill();

    // Symmetry points on core edge
    if (visual.symmetryPoints > 1) {
      this.renderCoreSymmetry(ctx, visual, sx, sy, r, t, intensity);
    }
  }

  private renderCoreSymmetry(
    ctx: CanvasRenderingContext2D,
    visual: AnomalyVisualConfig,
    sx: number,
    sy: number,
    r: number,
    t: number,
    intensity: number
  ): void {
    const n = visual.symmetryPoints;
    const angleStep = TWO_PI / n;
    const dotR = Math.max(1.5, r * 0.25);
    const rotOffset = t * 0.5; // slow rotation

    ctx.fillStyle = this.withAlpha(visual.accentColor, 0.85 * intensity);
    for (let i = 0; i < n; i++) {
      const angle = i * angleStep + rotOffset;
      const px = sx + Math.cos(angle) * r;
      const py = sy + Math.sin(angle) * r;
      ctx.beginPath();
      ctx.arc(px, py, dotR, 0, TWO_PI);
      ctx.fill();
    }
  }

  // ---------------------------------------------------------------------------
  // Distortion Rings
  // ---------------------------------------------------------------------------

  private renderDistortionRings(
    ctx: CanvasRenderingContext2D,
    visual: AnomalyVisualConfig,
    sx: number,
    sy: number,
    glowR: number,
    t: number,
    intensity: number
  ): void {
    const numRings = 3;
    for (let i = 0; i < numRings; i++) {
      // Each ring expands outward and fades
      const phase = (t * 0.7 + i / numRings) % 1;
      const radius = glowR * 0.2 + glowR * 0.8 * phase;
      const alpha = (1 - phase) * 0.4 * intensity;

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = visual.primaryColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, TWO_PI);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------------------
  // Beams
  // ---------------------------------------------------------------------------

  private renderBeams(
    ctx: CanvasRenderingContext2D,
    visual: AnomalyVisualConfig,
    sx: number,
    sy: number,
    glowR: number,
    t: number,
    intensity: number,
    numBeams: number
  ): void {
    const angleStep = TWO_PI / numBeams;
    const rotOffset = t * 0.3;
    const beamLen = glowR * 1.6;
    const beamWidth = Math.max(1, glowR * 0.08);

    for (let i = 0; i < numBeams; i++) {
      const angle = i * angleStep + rotOffset;
      const ex = sx + Math.cos(angle) * beamLen;
      const ey = sy + Math.sin(angle) * beamLen;

      const grad = ctx.createLinearGradient(sx, sy, ex, ey);
      grad.addColorStop(0, this.withAlpha(visual.accentColor, 0.7 * intensity));
      grad.addColorStop(0.5, this.withAlpha(visual.primaryColor, 0.3 * intensity));
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.globalAlpha = 1;
      ctx.strokeStyle = grad;
      ctx.lineWidth = beamWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
  }

  // ---------------------------------------------------------------------------
  // Particles
  // ---------------------------------------------------------------------------

  private renderParticles(
    ctx: CanvasRenderingContext2D,
    visual: AnomalyVisualConfig,
    sx: number,
    sy: number,
    zoom: number,
    t: number,
    timestamp: number,
    intensity: number,
    site: AnomalySite
  ): void {
    // Get or create per-site particle state
    let state = this.siteStates.get(site.id);
    if (!state) {
      state = { particles: [], lastSpawnTime: 0 };
      this.siteStates.set(site.id, state);
    }

    const targetCount = site.state === 'active'
      ? visual.activeParticleCount
      : visual.dormantParticleCount;

    // Spawn new particles if below target
    const spawnInterval = site.state === 'active' ? 80 : 250; // ms between spawns
    if (
      state.particles.filter(p => p.active).length < targetCount &&
      timestamp - state.lastSpawnTime > spawnInterval
    ) {
      this.spawnParticle(state, visual, site.state, timestamp);
      state.lastSpawnTime = timestamp;
    }

    // Render and age particles
    for (const particle of state.particles) {
      if (!particle.active) continue;

      const elapsed = timestamp - particle.birthTime;
      particle.age = elapsed / particle.lifetime;

      if (particle.age >= 1) {
        particle.active = false;
        continue;
      }

      // Update position
      particle.angle += particle.angularVelocity * 16; // assume ~16ms frame
      particle.radius += (particle.targetRadius - particle.radius) * 0.02;
      particle.offsetX = Math.cos(particle.angle) * particle.radius;
      particle.offsetY = Math.sin(particle.angle) * particle.radius;

      const px = sx + particle.offsetX * zoom;
      const py = sy + particle.offsetY * zoom;
      const alpha = Math.sin(particle.age * Math.PI) * intensity * 0.9;
      const size = particle.size * zoom * (1 - particle.age * 0.5);

      ctx.globalAlpha = alpha;
      this.drawParticleShape(ctx, visual.particleShape, px, py, size, particle.color || visual.primaryColor);
    }

    ctx.globalAlpha = 1;
  }

  private spawnParticle(
    state: SiteParticleState,
    visual: AnomalyVisualConfig,
    anomalyState: AnomalyState,
    timestamp: number
  ): void {
    if (state.particles.length >= MAX_PARTICLES_PER_SITE) {
      // Reuse oldest dead slot
      const dead = state.particles.find(p => !p.active);
      if (!dead) return;
      this.initParticle(dead, visual, anomalyState, timestamp);
      return;
    }

    const p: AnomalyParticle = {
      offsetX: 0,
      offsetY: 0,
      angle: Math.random() * TWO_PI,
      angularVelocity: (Math.random() - 0.5) * 0.004 * visual.animationSpeed,
      radius: visual.coreRadius * (0.5 + Math.random() * 0.5),
      targetRadius: visual.coreRadius * (1 + Math.random() * 2.5),
      age: 0,
      lifetime: anomalyState === 'active'
        ? 800 + Math.random() * 1200
        : 2000 + Math.random() * 3000,
      birthTime: timestamp,
      size: 2 + Math.random() * 3,
      color: Math.random() < 0.3 ? visual.secondaryColor : visual.primaryColor,
      active: true,
    };
    state.particles.push(p);
  }

  private initParticle(
    p: AnomalyParticle,
    visual: AnomalyVisualConfig,
    anomalyState: AnomalyState,
    timestamp: number
  ): void {
    p.angle = Math.random() * TWO_PI;
    p.angularVelocity = (Math.random() - 0.5) * 0.004 * visual.animationSpeed;
    p.radius = visual.coreRadius * (0.5 + Math.random() * 0.5);
    p.targetRadius = visual.coreRadius * (1 + Math.random() * 2.5);
    p.age = 0;
    p.lifetime = anomalyState === 'active'
      ? 800 + Math.random() * 1200
      : 2000 + Math.random() * 3000;
    p.birthTime = timestamp;
    p.size = 2 + Math.random() * 3;
    p.color = Math.random() < 0.3 ? visual.secondaryColor : visual.primaryColor;
    p.active = true;
  }

  // ---------------------------------------------------------------------------
  // Particle shapes
  // ---------------------------------------------------------------------------

  private drawParticleShape(
    ctx: CanvasRenderingContext2D,
    shape: AnomalyParticleShape,
    x: number,
    y: number,
    size: number,
    color: string
  ): void {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;

    switch (shape) {
      case 'dot':
        ctx.beginPath();
        ctx.arc(x, y, size, 0, TWO_PI);
        ctx.fill();
        break;

      case 'spark':
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - size, y);
        ctx.lineTo(x + size, y);
        ctx.moveTo(x, y - size);
        ctx.lineTo(x, y + size);
        ctx.stroke();
        break;

      case 'diamond': {
        const h = size * 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y - h);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x - size, y);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'ring':
        ctx.lineWidth = Math.max(0.5, size * 0.4);
        ctx.beginPath();
        ctx.arc(x, y, size, 0, TWO_PI);
        ctx.stroke();
        break;

      case 'triangle': {
        const r = size;
        ctx.beginPath();
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + r * 0.866, y + r * 0.5);
        ctx.lineTo(x - r * 0.866, y + r * 0.5);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'wave':
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - size, y);
        ctx.quadraticCurveTo(x - size * 0.5, y - size, x, y);
        ctx.quadraticCurveTo(x + size * 0.5, y + size, x + size, y);
        ctx.stroke();
        break;

      case 'cross':
        ctx.lineWidth = Math.max(1, size * 0.5);
        ctx.beginPath();
        ctx.moveTo(x - size, y - size);
        ctx.lineTo(x + size, y + size);
        ctx.moveTo(x + size, y - size);
        ctx.lineTo(x - size, y + size);
        ctx.stroke();
        break;

      default:
        ctx.beginPath();
        ctx.arc(x, y, size, 0, TWO_PI);
        ctx.fill();
    }
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  /**
   * Convert a hex color to rgba with the given alpha.
   * Accepts '#rrggbb', '#rgb', or CSS color names (passed through with fallback).
   */
  private withAlpha(color: string, alpha: number): string {
    const a = Math.max(0, Math.min(1, alpha));
    // Handle already-rgba strings
    if (color.startsWith('rgba') || color.startsWith('rgb(')) {
      return color.replace(/[\d.]+\)$/, `${a.toFixed(3)})`);
    }
    // Parse hex
    let hex = color.replace('#', '');
    if (hex.length === 3) {
      hex = hex[0]! + hex[0]! + hex[1]! + hex[1]! + hex[2]! + hex[2]!;
    }
    if (hex.length !== 6) {
      return `rgba(128,128,128,${a.toFixed(3)})`;
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${a.toFixed(3)})`;
  }

  /**
   * Remove particle state for sites that no longer exist (memory cleanup).
   * Call occasionally when the set of visible sites changes significantly.
   */
  pruneStaleStates(activeSiteIds: Set<string>): void {
    for (const id of this.siteStates.keys()) {
      if (!activeSiteIds.has(id)) {
        this.siteStates.delete(id);
      }
    }
  }

  /**
   * Clear all particle state (e.g. on world unload).
   */
  clear(): void {
    this.siteStates.clear();
  }
}
