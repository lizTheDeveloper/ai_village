import type { Camera } from './Camera.js';

export interface Particle {
  x: number; // World X
  y: number; // World Y
  vx: number; // Velocity X
  vy: number; // Velocity Y
  color: string;
  size: number;
  startTime: number;
  lifetime: number; // milliseconds
  active: boolean; // For object pooling
}

// Static dust colors array - allocated once, never recreated
const DUST_COLORS: readonly string[] = Object.freeze([
  'rgba(244, 164, 96, 0.9)',   // Sandy brown - BRIGHTER for visibility
  'rgba(222, 184, 135, 0.9)',  // Burlywood - LIGHTER tan
  'rgba(210, 180, 140, 0.85)', // Tan - more visible
  'rgba(255, 160, 80, 0.8)',   // Bright orange-brown for extra pop
]);

/**
 * Simple particle system for visual effects like dust, sparks, etc.
 * Uses object pooling to minimize GC pressure.
 * Used for tilling, digging, construction, etc.
 */
export class ParticleRenderer {
  private particles: Particle[] = [];
  private pool: Particle[] = []; // Object pool for reuse
  private activeCount = 0; // Number of active particles

  // Pre-calculated constants
  private static readonly TWO_PI = Math.PI * 2;
  private static readonly GRAVITY = 0.02;

  /**
   * Acquire a particle from pool or create new one.
   */
  private acquireParticle(): Particle {
    if (this.pool.length > 0) {
      const particle = this.pool.pop()!;
      particle.active = true;
      return particle;
    }
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      color: '',
      size: 0,
      startTime: 0,
      lifetime: 0,
      active: true,
    };
  }

  /**
   * Return a particle to the pool.
   */
  private releaseParticle(particle: Particle): void {
    particle.active = false;
    this.pool.push(particle);
  }

  /**
   * Create a dust cloud effect at a world position.
   * Uses object pooling to minimize allocations.
   */
  createDustCloud(worldX: number, worldY: number, count: number = 8): void {
    const now = Date.now();
    const colorCount = DUST_COLORS.length;

    for (let i = 0; i < count; i++) {
      const particle = this.acquireParticle();

      // Random velocity in all directions
      const angle = Math.random() * ParticleRenderer.TWO_PI;
      const speed = 0.3 + Math.random() * 0.5; // 0.3-0.8 pixels per frame

      particle.x = worldX + (Math.random() - 0.5) * 10;
      particle.y = worldY + (Math.random() - 0.5) * 10;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed - 0.5; // Upward bias
      particle.color = DUST_COLORS[Math.floor(Math.random() * colorCount)]!;
      particle.size = 3 + Math.random() * 4; // 3-7 pixels
      particle.startTime = now;
      particle.lifetime = 700 + Math.random() * 500; // 0.7-1.2 seconds

      this.particles.push(particle);
    }
    this.activeCount = this.particles.length;
  }

  /**
   * Update and render all particles.
   * Uses in-place removal to avoid array allocations.
   * Call this every frame.
   */
  render(ctx: CanvasRenderingContext2D, camera: Camera, currentTime: number): void {
    if (this.particles.length === 0) return;

    // Cache frequently accessed values
    const cameraX = camera.x;
    const cameraY = camera.y;
    const zoom = camera.zoom;
    const halfWidth = ctx.canvas.width / 2;
    const halfHeight = ctx.canvas.height / 2;

    // In-place removal: iterate backwards and swap-remove expired particles
    let writeIndex = 0;
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i]!;
      const elapsed = currentTime - particle.startTime;

      if (elapsed >= particle.lifetime) {
        // Return to pool instead of discarding
        this.releaseParticle(particle);
        continue;
      }

      // Keep this particle - move to writeIndex if needed
      if (writeIndex !== i) {
        this.particles[writeIndex] = particle;
      }
      writeIndex++;

      const progress = elapsed / particle.lifetime; // 0 to 1

      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Apply gravity (particles fall slightly)
      particle.vy += ParticleRenderer.GRAVITY;

      // Convert world position to screen position
      const screenX = (particle.x - cameraX) * zoom + halfWidth;
      const screenY = (particle.y - cameraY) * zoom + halfHeight;

      // Fade out over time
      const alpha = 1 - progress;

      // Draw particle - avoid save/restore for performance
      const prevAlpha = ctx.globalAlpha;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(screenX, screenY, particle.size * zoom, 0, ParticleRenderer.TWO_PI);
      ctx.fill();
      ctx.globalAlpha = prevAlpha;
    }

    // Truncate array to remove dead particles
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

  /**
   * Get the number of active particles.
   */
  getActiveCount(): number {
    return this.activeCount;
  }
}
