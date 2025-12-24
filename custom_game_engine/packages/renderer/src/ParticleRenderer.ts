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
}

/**
 * Simple particle system for visual effects like dust, sparks, etc.
 * Used for tilling, digging, construction, etc.
 */
export class ParticleRenderer {
  private particles: Particle[] = [];

  /**
   * Create a dust cloud effect at a world position.
   * Used for tilling, digging, construction, etc.
   */
  createDustCloud(worldX: number, worldY: number, count: number = 8): void {
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      // Random velocity in all directions
      const angle = (Math.random() * Math.PI * 2);
      const speed = 0.3 + Math.random() * 0.5; // 0.3-0.8 pixels per frame

      this.particles.push({
        x: worldX + (Math.random() - 0.5) * 10, // Wider spread for more visible cloud
        y: worldY + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5, // STRONGER upward bias for "poof" effect
        color: this.getDustColor(),
        size: 3 + Math.random() * 4, // 3-7 pixels (LARGER, was 2-5)
        startTime: now,
        lifetime: 700 + Math.random() * 500, // 0.7-1.2 seconds (LONGER, was 0.5-1s)
      });
    }
  }

  /**
   * Get a random dust color (bright brown/tan/orange variants for visibility)
   */
  private getDustColor(): string {
    const colors = [
      'rgba(244, 164, 96, 0.9)',   // Sandy brown - BRIGHTER for visibility
      'rgba(222, 184, 135, 0.9)',  // Burlywood - LIGHTER tan
      'rgba(210, 180, 140, 0.85)', // Tan - more visible
      'rgba(255, 160, 80, 0.8)',   // Bright orange-brown for extra pop
    ];
    const index = Math.floor(Math.random() * colors.length);
    const color = colors[index];
    if (!color) {
      throw new Error(`Failed to get dust color at index ${index}`);
    }
    return color;
  }

  /**
   * Update and render all particles.
   * Call this every frame.
   */
  render(ctx: CanvasRenderingContext2D, camera: Camera, currentTime: number): void {
    // Remove expired particles
    this.particles = this.particles.filter(p =>
      currentTime - p.startTime < p.lifetime
    );

    // Update and render each particle
    for (const particle of this.particles) {
      const elapsed = currentTime - particle.startTime;
      const progress = elapsed / particle.lifetime; // 0 to 1

      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Apply gravity (particles fall slightly)
      particle.vy += 0.02;

      // Convert world position to screen position
      const screenX = (particle.x - camera.x) * camera.zoom + ctx.canvas.width / 2;
      const screenY = (particle.y - camera.y) * camera.zoom + ctx.canvas.height / 2;

      // Fade out over time
      const alpha = 1 - progress;

      // Draw particle
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(screenX, screenY, particle.size * camera.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Clear all particles.
   */
  clear(): void {
    this.particles = [];
  }
}
