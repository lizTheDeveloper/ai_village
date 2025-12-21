import { describe, it, expect } from 'vitest';
import { PerlinNoise } from '../PerlinNoise.js';

describe('PerlinNoise', () => {
  it('should generate noise values', () => {
    const noise = new PerlinNoise(12345);
    const value = noise.noise(0, 0);

    expect(typeof value).toBe('number');
    expect(value).toBeGreaterThanOrEqual(-1);
    expect(value).toBeLessThanOrEqual(1);
  });

  it('should be deterministic with same seed', () => {
    const noise1 = new PerlinNoise(12345);
    const noise2 = new PerlinNoise(12345);

    const value1 = noise1.noise(10, 20);
    const value2 = noise2.noise(10, 20);

    expect(value1).toBe(value2);
  });

  it('should produce different values with different seeds', () => {
    const noise1 = new PerlinNoise(12345);
    const noise2 = new PerlinNoise(54321);

    // Test a range of points with varied coordinates
    let totalDifference = 0;
    const testPoints = 100;

    for (let i = 0; i < testPoints; i++) {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const value1 = noise1.noise(x, y);
      const value2 = noise2.noise(x, y);
      totalDifference += Math.abs(value1 - value2);
    }

    // Different seeds should produce noticeably different overall values
    expect(totalDifference).toBeGreaterThan(1);
  });

  it('should produce smooth gradients', () => {
    const noise = new PerlinNoise(12345);

    const value1 = noise.noise(0, 0);
    const value2 = noise.noise(0.1, 0);
    const value3 = noise.noise(0.2, 0);

    // Nearby values should be similar (smoothness test)
    expect(Math.abs(value1 - value2)).toBeLessThan(0.5);
    expect(Math.abs(value2 - value3)).toBeLessThan(0.5);
  });

  it('should handle negative coordinates', () => {
    const noise = new PerlinNoise(12345);

    const value = noise.noise(-10, -20);

    expect(typeof value).toBe('number');
    expect(value).toBeGreaterThanOrEqual(-1);
    expect(value).toBeLessThanOrEqual(1);
  });

  describe('octaveNoise', () => {
    it('should generate octave noise', () => {
      const noise = new PerlinNoise(12345);
      const value = noise.octaveNoise(0, 0, 4, 0.5);

      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
    });

    it('should be deterministic', () => {
      const noise1 = new PerlinNoise(12345);
      const noise2 = new PerlinNoise(12345);

      const value1 = noise1.octaveNoise(10, 20, 4, 0.5);
      const value2 = noise2.octaveNoise(10, 20, 4, 0.5);

      expect(value1).toBe(value2);
    });

    it('should produce different detail with different octaves', () => {
      const noise = new PerlinNoise(12345);

      // Calculate average difference over many points
      let totalDifference = 0;
      const testPoints = 50;

      for (let i = 0; i < testPoints; i++) {
        const x = Math.random() * 50;
        const y = Math.random() * 50;
        const value1 = noise.octaveNoise(x, y, 1, 0.5);
        const value2 = noise.octaveNoise(x, y, 8, 0.5);
        totalDifference += Math.abs(value1 - value2);
      }

      // Different octave counts should produce noticeably different overall values
      expect(totalDifference).toBeGreaterThan(0.1);
    });

    it('should vary with persistence', () => {
      const noise = new PerlinNoise(12345);

      // Calculate average difference over many points
      let totalDifference = 0;
      const testPoints = 50;

      for (let i = 0; i < testPoints; i++) {
        const x = Math.random() * 50;
        const y = Math.random() * 50;
        const value1 = noise.octaveNoise(x, y, 4, 0.2);
        const value2 = noise.octaveNoise(x, y, 4, 0.8);
        totalDifference += Math.abs(value1 - value2);
      }

      // Different persistence should produce noticeably different overall values
      expect(totalDifference).toBeGreaterThan(0.1);
    });
  });

  it('should produce continuous noise field', () => {
    const noise = new PerlinNoise(12345);

    // Sample a grid of values
    const values: number[][] = [];
    for (let y = 0; y < 10; y++) {
      values[y] = [];
      for (let x = 0; x < 10; x++) {
        values[y]![x] = noise.noise(x * 0.1, y * 0.1);
      }
    }

    // Check that adjacent values are similar
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        const current = values[y]![x]!;
        const right = values[y]![x + 1]!;
        const down = values[y + 1]![x]!;

        expect(Math.abs(current - right)).toBeLessThan(0.5);
        expect(Math.abs(current - down)).toBeLessThan(0.5);
      }
    }
  });
});
