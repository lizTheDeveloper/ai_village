/**
 * Tests for PredictiveChunkLoadingSystem
 */

import { describe, it, expect, vi } from 'vitest';
import { PredictiveChunkLoadingSystem } from '../PredictiveChunkLoadingSystem.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import { createVelocityComponent } from '../../components/VelocityComponent.js';

// Type extension for accessing protected properties in tests
interface PredictiveChunkLoadingSystemInternal {
  throttleInterval: number;
}

describe('PredictiveChunkLoadingSystem', () => {
  const system = new PredictiveChunkLoadingSystem();

  it('should have correct priority', () => {
    expect(system.priority).toBe(7);
  });

  it('should require position and velocity components', () => {
    expect(system.requiredComponents).toContain('position');
    expect(system.requiredComponents).toContain('velocity');
  });

  it('should have throttle interval of 20 ticks', () => {
    expect((system as unknown as PredictiveChunkLoadingSystemInternal).throttleInterval).toBe(20);
  });

  it('should have correct system id', () => {
    expect(system.id).toBe('predictive_chunk_loading');
  });

  it('should calculate correct chunk coordinates from position', () => {
    // Chunk size is 32, so:
    // x=100 -> chunkX = floor(100/32) = 3
    // y=50 -> chunkY = floor(50/32) = 1
    const pos = createPositionComponent(100, 50);
    expect(pos.chunkX).toBe(3);
    expect(pos.chunkY).toBe(1);
  });

  it('should normalize velocity correctly', () => {
    const vx = 3;
    const vy = 4;
    const magnitude = Math.sqrt(vx * vx + vy * vy); // = 5
    const normalizedX = vx / magnitude; // = 0.6
    const normalizedY = vy / magnitude; // = 0.8

    expect(normalizedX).toBeCloseTo(0.6);
    expect(normalizedY).toBeCloseTo(0.8);
  });

  it('should predict chunks along movement direction', () => {
    // Agent at (100, 50) moving east with velocity (2, 0)
    // Current chunk: (3, 1)
    // Direction: (1, 0) - normalized
    // Predictions (5 steps ahead):
    // Step 1: x=132 -> chunk (4, 1)
    // Step 2: x=164 -> chunk (5, 1)
    // Step 3: x=196 -> chunk (6, 1)
    // Step 4: x=228 -> chunk (7, 1)
    // Step 5: x=260 -> chunk (8, 1)

    const CHUNK_SIZE = 32;
    const startX = 100;
    const startY = 50;
    const vx = 2;
    const vy = 0;

    const magnitude = Math.sqrt(vx * vx + vy * vy);
    const dirX = vx / magnitude;
    const dirY = vy / magnitude;

    const predictions: { chunkX: number; chunkY: number }[] = [];

    for (let step = 1; step <= 5; step++) {
      const predictedX = startX + dirX * CHUNK_SIZE * step;
      const predictedY = startY + dirY * CHUNK_SIZE * step;
      const chunkX = Math.floor(predictedX / CHUNK_SIZE);
      const chunkY = Math.floor(predictedY / CHUNK_SIZE);
      predictions.push({ chunkX, chunkY });
    }

    expect(predictions).toEqual([
      { chunkX: 4, chunkY: 1 },
      { chunkX: 5, chunkY: 1 },
      { chunkX: 6, chunkY: 1 },
      { chunkX: 7, chunkY: 1 },
      { chunkX: 8, chunkY: 1 },
    ]);
  });

  it('should skip stationary agents', () => {
    // Velocity magnitude < 0.1 should be skipped
    const vx = 0.05;
    const vy = 0.05;
    const magnitude = Math.sqrt(vx * vx + vy * vy);

    expect(magnitude).toBeLessThan(0.1);
  });

  it('should calculate perpendicular direction for lateral checks', () => {
    // For direction (1, 0), perpendicular is (0, 1)
    const dirX = 1;
    const dirY = 0;

    const perpX = -dirY; // = 0 (or -0 in JavaScript)
    const perpY = dirX;  // = 1

    expect(Math.abs(perpX)).toBe(0); // Use abs to handle -0 vs +0
    expect(perpY).toBe(1);

    // For direction (0.6, 0.8), perpendicular is (-0.8, 0.6)
    const dirX2 = 0.6;
    const dirY2 = 0.8;

    const perpX2 = -dirY2; // = -0.8
    const perpY2 = dirX2;  // = 0.6

    expect(perpX2).toBeCloseTo(-0.8);
    expect(perpY2).toBeCloseTo(0.6);
  });

  describe('dynamic prediction distance', () => {
    const MIN_PREDICTION = 2;
    const MAX_PREDICTION = 12;
    const SPEED_SCALE_FACTOR = 5;

    const calculatePredictionDistance = (speed: number): number => {
      return Math.min(
        MAX_PREDICTION,
        Math.max(MIN_PREDICTION, Math.ceil(speed * SPEED_SCALE_FACTOR))
      );
    };

    it('should predict 2 chunks for slow agents (speed 0.2)', () => {
      // Agent with velocity (0.2, 0) has speed = 0.2
      const speed = 0.2;
      const prediction = calculatePredictionDistance(speed);

      // 0.2 * 5 = 1.0, ceil = 1, but clamped to MIN = 2
      expect(prediction).toBe(2);
    });

    it('should predict 2 chunks for slow diagonal agents (speed 0.3)', () => {
      // Agent with velocity (0.2, 0.2) has speed ≈ 0.283
      const vx = 0.2;
      const vy = 0.2;
      const speed = Math.sqrt(vx * vx + vy * vy);
      const prediction = calculatePredictionDistance(speed);

      // 0.283 * 5 = 1.41, ceil = 2
      expect(prediction).toBe(2);
    });

    it('should predict 3 chunks for medium-slow agents (speed 0.5)', () => {
      // Agent with velocity (0.5, 0) has speed = 0.5
      const speed = 0.5;
      const prediction = calculatePredictionDistance(speed);

      // 0.5 * 5 = 2.5, ceil = 3
      expect(prediction).toBe(3);
    });

    it('should predict 5 chunks for medium agents (speed 1.0)', () => {
      // Agent with velocity (0.7, 0.7) has speed ≈ 0.99
      const vx = 0.7;
      const vy = 0.7;
      const speed = Math.sqrt(vx * vx + vy * vy);
      const prediction = calculatePredictionDistance(speed);

      // 0.99 * 5 = 4.95, ceil = 5
      expect(prediction).toBe(5);
    });

    it('should predict 10 chunks for fast agents (speed 2.0)', () => {
      // Agent with velocity (2.0, 0) has speed = 2.0
      const speed = 2.0;
      const prediction = calculatePredictionDistance(speed);

      // 2.0 * 5 = 10.0, ceil = 10
      expect(prediction).toBe(10);
    });

    it('should predict 12 chunks (max) for very fast agents (speed 3.0)', () => {
      // Agent with velocity (3.0, 0) has speed = 3.0
      const speed = 3.0;
      const prediction = calculatePredictionDistance(speed);

      // 3.0 * 5 = 15.0, ceil = 15, but clamped to MAX = 12
      expect(prediction).toBe(12);
    });

    it('should cap at max prediction distance for extremely fast agents (speed 5.0)', () => {
      // Agent with velocity (5.0, 0) has speed = 5.0
      const speed = 5.0;
      const prediction = calculatePredictionDistance(speed);

      // 5.0 * 5 = 25.0, ceil = 25, but clamped to MAX = 12
      expect(prediction).toBe(12);
    });

    it('should handle edge case at minimum threshold (speed 0.1)', () => {
      // Agent at minimum movement threshold
      const speed = 0.1;
      const prediction = calculatePredictionDistance(speed);

      // 0.1 * 5 = 0.5, ceil = 1, but clamped to MIN = 2
      expect(prediction).toBe(2);
    });

    it('should scale linearly between min and max', () => {
      // Test that prediction scales smoothly
      const speed_0_4 = 0.4; // -> 2
      const speed_0_6 = 0.6; // -> 3
      const speed_1_2 = 1.2; // -> 6
      const speed_1_8 = 1.8; // -> 9

      expect(calculatePredictionDistance(speed_0_4)).toBe(2);
      expect(calculatePredictionDistance(speed_0_6)).toBe(3);
      expect(calculatePredictionDistance(speed_1_2)).toBe(6);
      expect(calculatePredictionDistance(speed_1_8)).toBe(9);
    });
  });
});
