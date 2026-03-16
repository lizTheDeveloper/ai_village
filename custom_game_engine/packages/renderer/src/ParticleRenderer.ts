import type { Camera } from './Camera.js';

export interface Particle {
  x: number; // World X
  y: number; // World Y
  vx: number; // Velocity X
  vy: number; // Velocity Y
  color: string;
  size: number;       // Starting radius (pixels)
  endSize: number;    // Ending radius — particles shrink (or grow) over lifetime
  startTime: number;
  lifetime: number; // milliseconds
  active: boolean; // For object pooling
  alphaEase: 'linear' | 'late'; // 'linear' = fade from start; 'late' = hold then fade
}

// Static color palettes — allocated once, never recreated
const DUST_COLORS: readonly string[] = Object.freeze([
  'rgba(244, 164, 96, 0.9)',   // Sandy brown
  'rgba(222, 184, 135, 0.9)',  // Burlywood
  'rgba(210, 180, 140, 0.85)', // Tan
  'rgba(255, 160, 80, 0.8)',   // Orange-brown
]);

const SPARK_COLORS: readonly string[] = Object.freeze([
  'rgba(255, 255, 220, 1.0)',  // Bright white-yellow
  'rgba(255, 220, 80, 1.0)',   // Golden yellow
  'rgba(255, 160, 40, 1.0)',   // Orange spark
  'rgba(255, 255, 255, 1.0)',  // Pure white
]);

const SMOKE_COLORS: readonly string[] = Object.freeze([
  'rgba(180, 180, 180, 0.45)', // Light grey
  'rgba(160, 160, 155, 0.40)', // Warm grey
  'rgba(200, 195, 185, 0.35)', // Off-white
  'rgba(140, 140, 140, 0.50)', // Mid grey
]);

// Magic palettes indexed by color name for variety
const MAGIC_PALETTES: Record<string, readonly string[]> = {
  arcane: Object.freeze([
    'rgba(180, 100, 255, 0.95)', // Purple
    'rgba(120, 60, 220, 0.90)',  // Deep violet
    'rgba(220, 160, 255, 0.85)', // Lavender
    'rgba(255, 200, 255, 0.80)', // Pink-white
  ]),
  fire: Object.freeze([
    'rgba(255, 80, 20, 0.95)',   // Red-orange
    'rgba(255, 160, 0, 0.90)',   // Amber
    'rgba(255, 220, 60, 0.85)',  // Yellow
    'rgba(255, 255, 180, 0.70)', // White-yellow
  ]),
  nature: Object.freeze([
    'rgba(80, 220, 80, 0.95)',   // Bright green
    'rgba(40, 180, 100, 0.90)',  // Emerald
    'rgba(160, 255, 100, 0.85)', // Lime
    'rgba(200, 255, 160, 0.70)', // Pale green
  ]),
  frost: Object.freeze([
    'rgba(120, 220, 255, 0.95)', // Ice blue
    'rgba(180, 240, 255, 0.90)', // Light cyan
    'rgba(80, 160, 220, 0.85)',  // Mid blue
    'rgba(220, 245, 255, 0.75)', // White-blue
  ]),
};

/**
 * Particle system for visual effects: dust, sparks, smoke, magic sparkles.
 * Uses object pooling to minimize GC pressure.
 * All effect types share the same render loop — just call the right factory method.
 */
export class ParticleRenderer {
  private particles: Particle[] = [];
  private pool: Particle[] = [];
  private activeCount = 0;

  private static readonly TWO_PI = Math.PI * 2;
  private static readonly GRAVITY = 0.02;
  private static readonly ANTI_GRAVITY = -0.025; // Smoke rises

  private acquireParticle(): Particle {
    if (this.pool.length > 0) {
      const particle = this.pool.pop()!;
      particle.active = true;
      return particle;
    }
    return {
      x: 0, y: 0, vx: 0, vy: 0,
      color: '', size: 0, endSize: 0,
      startTime: 0, lifetime: 0,
      active: true, alphaEase: 'linear',
    };
  }

  private releaseParticle(particle: Particle): void {
    particle.active = false;
    this.pool.push(particle);
  }

  /**
   * Dust cloud — for tilling, digging, construction.
   * Sandy browns, upward-biased, gravity-affected.
   */
  createDustCloud(worldX: number, worldY: number, count: number = 8): void {
    const now = Date.now();
    const colorCount = DUST_COLORS.length;

    for (let i = 0; i < count; i++) {
      const particle = this.acquireParticle();
      const angle = Math.random() * ParticleRenderer.TWO_PI;
      const speed = 0.3 + Math.random() * 0.5;

      particle.x = worldX + (Math.random() - 0.5) * 10;
      particle.y = worldY + (Math.random() - 0.5) * 10;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed - 0.5;
      particle.color = DUST_COLORS[Math.floor(Math.random() * colorCount)]!;
      particle.size = 3 + Math.random() * 4;
      particle.endSize = 0.5;
      particle.startTime = now;
      particle.lifetime = 700 + Math.random() * 500;
      particle.alphaEase = 'linear';

      this.particles.push(particle);
    }
    this.activeCount = this.particles.length;
  }

  /**
   * Spark burst — for crafting hits, combat impacts, tool strikes.
   * Bright white/gold streaks that fade fast.
   */
  createSparkBurst(worldX: number, worldY: number, count: number = 12): void {
    const now = Date.now();
    const colorCount = SPARK_COLORS.length;

    for (let i = 0; i < count; i++) {
      const particle = this.acquireParticle();
      // Sparks spray mostly outward-downward like struck metal
      const angle = Math.random() * ParticleRenderer.TWO_PI;
      const speed = 0.8 + Math.random() * 1.4;

      particle.x = worldX + (Math.random() - 0.5) * 4;
      particle.y = worldY + (Math.random() - 0.5) * 4;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed - 0.3;
      particle.color = SPARK_COLORS[Math.floor(Math.random() * colorCount)]!;
      particle.size = 1.5 + Math.random() * 2;
      particle.endSize = 0.2;
      particle.startTime = now;
      particle.lifetime = 300 + Math.random() * 300; // Short-lived
      particle.alphaEase = 'linear';

      this.particles.push(particle);
    }
    this.activeCount = this.particles.length;
  }

  /**
   * Smoke puff — for fire, cooking, destruction, explosions.
   * Large, slow-rising grey puffs that linger.
   */
  createSmokePuff(worldX: number, worldY: number, count: number = 6): void {
    const now = Date.now();
    const colorCount = SMOKE_COLORS.length;

    for (let i = 0; i < count; i++) {
      const particle = this.acquireParticle();
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8; // Mostly upward
      const speed = 0.1 + Math.random() * 0.2;

      particle.x = worldX + (Math.random() - 0.5) * 14;
      particle.y = worldY + (Math.random() - 0.5) * 6;
      particle.vx = Math.cos(angle) * speed + (Math.random() - 0.5) * 0.15;
      particle.vy = Math.sin(angle) * speed;
      particle.color = SMOKE_COLORS[Math.floor(Math.random() * colorCount)]!;
      particle.size = 5 + Math.random() * 8;  // Big puffs
      particle.endSize = 10 + Math.random() * 6; // Expand as they rise
      particle.startTime = now;
      particle.lifetime = 1200 + Math.random() * 800; // Linger
      particle.alphaEase = 'late'; // Hold opacity then fade out

      this.particles.push(particle);
    }
    this.activeCount = this.particles.length;
  }

  /**
   * Magic sparkle — for spellcasting, enchantments, divine events.
   * @param palette  'arcane' | 'fire' | 'nature' | 'frost' (default: 'arcane')
   */
  createMagicSparkle(
    worldX: number,
    worldY: number,
    palette: 'arcane' | 'fire' | 'nature' | 'frost' = 'arcane',
    count: number = 16,
  ): void {
    const now = Date.now();
    const colors = MAGIC_PALETTES[palette] ?? MAGIC_PALETTES['arcane']!;
    const colorCount = colors.length;

    for (let i = 0; i < count; i++) {
      const particle = this.acquireParticle();
      // Sparkling star-burst — mostly outward but very slow, twinkle effect
      const angle = Math.random() * ParticleRenderer.TWO_PI;
      const speed = 0.05 + Math.random() * 0.25;

      particle.x = worldX + (Math.random() - 0.5) * 20;
      particle.y = worldY + (Math.random() - 0.5) * 20;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed - 0.1; // Slight upward drift
      particle.color = colors[Math.floor(Math.random() * colorCount)]!;
      particle.size = 2 + Math.random() * 3;
      particle.endSize = 0; // Twinkle out to nothing
      particle.startTime = now + Math.random() * 200; // Stagger appearance
      particle.lifetime = 600 + Math.random() * 600;
      particle.alphaEase = 'late';

      this.particles.push(particle);
    }
    this.activeCount = this.particles.length;
  }

  /**
   * Update and render all particles. Call every frame.
   * Particles interpolate size from `size` → `endSize` over lifetime,
   * giving a natural shrink/grow feel vs a flat constant size.
   */
  render(ctx: CanvasRenderingContext2D, camera: Camera, currentTime: number): void {
    if (this.particles.length === 0) return;

    const cameraX = camera.x;
    const cameraY = camera.y;
    const zoom = camera.zoom;
    const halfWidth = ctx.canvas.width / 2;
    const halfHeight = ctx.canvas.height / 2;

    let writeIndex = 0;
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i]!;
      const elapsed = currentTime - particle.startTime;

      // Staggered-start sparkles may not have started yet
      if (elapsed < 0) {
        if (writeIndex !== i) this.particles[writeIndex] = particle;
        writeIndex++;
        continue;
      }

      if (elapsed >= particle.lifetime) {
        this.releaseParticle(particle);
        continue;
      }

      if (writeIndex !== i) this.particles[writeIndex] = particle;
      writeIndex++;

      const progress = elapsed / particle.lifetime; // 0→1

      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += ParticleRenderer.GRAVITY;

      // Override gravity for smoke (rises via anti-gravity)
      if (particle.endSize > particle.size) {
        particle.vy -= ParticleRenderer.GRAVITY * 2 + ParticleRenderer.ANTI_GRAVITY;
      }

      // Interpolate size: start → end
      const currentSize = particle.size + (particle.endSize - particle.size) * progress;
      if (currentSize <= 0) continue;

      // Alpha easing
      let alpha: number;
      if (particle.alphaEase === 'late') {
        // Hold full opacity for first 55%, then fade
        alpha = progress < 0.55 ? 1.0 : 1.0 - (progress - 0.55) / 0.45;
      } else {
        alpha = 1 - progress;
      }

      const screenX = (particle.x - cameraX) * zoom + halfWidth;
      const screenY = (particle.y - cameraY) * zoom + halfHeight;

      const prevAlpha = ctx.globalAlpha;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(screenX, screenY, currentSize * zoom, 0, ParticleRenderer.TWO_PI);
      ctx.fill();
      ctx.globalAlpha = prevAlpha;
    }

    this.particles.length = writeIndex;
    this.activeCount = writeIndex;
  }

  /**
   * Clear all particles and return them to pool.
   */
  clear(): void {
    for (const particle of this.particles) {
      this.releaseParticle(particle);
    }
    this.particles.length = 0;
    this.activeCount = 0;
  }

  getActiveCount(): number {
    return this.activeCount;
  }
}
