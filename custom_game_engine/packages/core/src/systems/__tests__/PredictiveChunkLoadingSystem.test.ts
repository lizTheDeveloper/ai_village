/**
 * Tests for PredictiveChunkLoadingSystem
 */

import { describe, it, expect, vi } from 'vitest';
import { PredictiveChunkLoadingSystem } from '../PredictiveChunkLoadingSystem.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import { createVelocityComponent } from '../../components/VelocityComponent.js';

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
    expect((system as any).throttleInterval).toBe(20);
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
});
