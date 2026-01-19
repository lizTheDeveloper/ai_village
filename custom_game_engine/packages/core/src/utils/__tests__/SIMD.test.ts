import { describe, it, expect } from 'vitest';
import { SIMDOps, SIMDBatchOps } from '../SIMD.js';

/**
 * Tests for SIMD-optimized operations.
 *
 * Verifies correctness of auto-vectorized implementations against expected results.
 * All tests use small arrays for clarity - benchmarks test performance with large arrays.
 */

describe('SIMDOps', () => {
  describe('addArrays', () => {
    it('should add two arrays element-wise', () => {
      const a = new Float32Array([1, 2, 3, 4, 5]);
      const b = new Float32Array([10, 20, 30, 40, 50]);
      const result = new Float32Array(5);

      SIMDOps.addArrays(result, a, b, 5);

      expect(Array.from(result)).toEqual([11, 22, 33, 44, 55]);
    });

    it('should support in-place operation', () => {
      const a = new Float32Array([1, 2, 3]);
      const b = new Float32Array([4, 5, 6]);

      SIMDOps.addArrays(a, a, b, 3);

      expect(Array.from(a)).toEqual([5, 7, 9]);
    });

    it('should handle count parameter correctly', () => {
      const a = new Float32Array([1, 2, 3, 4, 5]);
      const b = new Float32Array([10, 20, 30, 40, 50]);
      const result = new Float32Array(5);

      SIMDOps.addArrays(result, a, b, 3); // Only process first 3

      expect(Array.from(result)).toEqual([11, 22, 33, 0, 0]);
    });

    it('should handle zero count', () => {
      const a = new Float32Array([1, 2, 3]);
      const b = new Float32Array([4, 5, 6]);
      const result = new Float32Array(3);

      SIMDOps.addArrays(result, a, b, 0);

      expect(Array.from(result)).toEqual([0, 0, 0]);
    });

    it('should handle single element', () => {
      const a = new Float32Array([5]);
      const b = new Float32Array([3]);
      const result = new Float32Array(1);

      SIMDOps.addArrays(result, a, b, 1);

      expect(Array.from(result)).toEqual([8]);
    });
  });

  describe('subtractArrays', () => {
    it('should subtract two arrays element-wise', () => {
      const a = new Float32Array([10, 20, 30, 40, 50]);
      const b = new Float32Array([1, 2, 3, 4, 5]);
      const result = new Float32Array(5);

      SIMDOps.subtractArrays(result, a, b, 5);

      expect(Array.from(result)).toEqual([9, 18, 27, 36, 45]);
    });

    it('should handle negative results', () => {
      const a = new Float32Array([1, 2, 3]);
      const b = new Float32Array([10, 20, 30]);
      const result = new Float32Array(3);

      SIMDOps.subtractArrays(result, a, b, 3);

      expect(Array.from(result)).toEqual([-9, -18, -27]);
    });
  });

  describe('scaleArray', () => {
    it('should multiply array by scalar', () => {
      const a = new Float32Array([1, 2, 3, 4, 5]);
      const result = new Float32Array(5);

      SIMDOps.scaleArray(result, a, 2.5, 5);

      expect(Array.from(result)).toEqual([2.5, 5, 7.5, 10, 12.5]);
    });

    it('should support in-place operation', () => {
      const a = new Float32Array([2, 4, 6]);

      SIMDOps.scaleArray(a, a, 0.5, 3);

      expect(Array.from(a)).toEqual([1, 2, 3]);
    });

    it('should handle zero scalar', () => {
      const a = new Float32Array([1, 2, 3]);
      const result = new Float32Array(3);

      SIMDOps.scaleArray(result, a, 0, 3);

      expect(Array.from(result)).toEqual([0, 0, 0]);
    });

    it('should handle negative scalar', () => {
      const a = new Float32Array([1, 2, 3]);
      const result = new Float32Array(3);

      SIMDOps.scaleArray(result, a, -2, 3);

      expect(Array.from(result)).toEqual([-2, -4, -6]);
    });
  });

  describe('fma (fused multiply-add)', () => {
    it('should compute a + b * scalar', () => {
      const a = new Float32Array([10, 20, 30]);
      const b = new Float32Array([1, 2, 3]);
      const result = new Float32Array(3);

      SIMDOps.fma(result, a, b, 5, 3);

      expect(Array.from(result)).toEqual([15, 30, 45]);
    });

    it('should support in-place operation', () => {
      const a = new Float32Array([10, 20, 30]);
      const b = new Float32Array([2, 4, 6]);

      SIMDOps.fma(a, a, b, 0.5, 3);

      expect(Array.from(a)).toEqual([11, 22, 33]);
    });

    it('should simulate velocity integration', () => {
      // position += velocity * deltaTime
      const positions = new Float32Array([0, 5, 10]);
      const velocities = new Float32Array([10, -5, 20]);
      const deltaTime = 0.1;

      SIMDOps.fma(positions, positions, velocities, deltaTime, 3);

      expect(Array.from(positions)).toEqual([1, 4.5, 12]);
    });

    it('should handle zero scalar', () => {
      const a = new Float32Array([10, 20, 30]);
      const b = new Float32Array([1, 2, 3]);
      const result = new Float32Array(3);

      SIMDOps.fma(result, a, b, 0, 3);

      expect(Array.from(result)).toEqual([10, 20, 30]);
    });
  });

  describe('distanceSquared', () => {
    it('should compute dx^2 + dy^2', () => {
      const dx = new Float32Array([3, 0, 4]);
      const dy = new Float32Array([4, 5, 0]);
      const result = new Float32Array(3);

      SIMDOps.distanceSquared(result, dx, dy, 3);

      expect(Array.from(result)).toEqual([25, 25, 16]);
    });

    it('should handle negative deltas', () => {
      const dx = new Float32Array([-3, -4]);
      const dy = new Float32Array([-4, -3]);
      const result = new Float32Array(2);

      SIMDOps.distanceSquared(result, dx, dy, 2);

      expect(Array.from(result)).toEqual([25, 25]);
    });

    it('should handle zero distances', () => {
      const dx = new Float32Array([0, 0, 0]);
      const dy = new Float32Array([0, 0, 0]);
      const result = new Float32Array(3);

      SIMDOps.distanceSquared(result, dx, dy, 3);

      expect(Array.from(result)).toEqual([0, 0, 0]);
    });
  });

  describe('clampArray', () => {
    it('should clamp values to [min, max]', () => {
      const a = new Float32Array([-10, 0, 50, 100, 150]);
      const result = new Float32Array(5);

      SIMDOps.clampArray(result, a, 0, 100, 5);

      expect(Array.from(result)).toEqual([0, 0, 50, 100, 100]);
    });

    it('should handle values already in range', () => {
      const a = new Float32Array([25, 50, 75]);
      const result = new Float32Array(3);

      SIMDOps.clampArray(result, a, 0, 100, 3);

      expect(Array.from(result)).toEqual([25, 50, 75]);
    });

    it('should support in-place operation', () => {
      const a = new Float32Array([-5, 10, 105]);

      SIMDOps.clampArray(a, a, 0, 100, 3);

      expect(Array.from(a)).toEqual([0, 10, 100]);
    });
  });

  describe('multiplyArrays', () => {
    it('should multiply two arrays element-wise', () => {
      const a = new Float32Array([2, 3, 4]);
      const b = new Float32Array([5, 6, 7]);
      const result = new Float32Array(3);

      SIMDOps.multiplyArrays(result, a, b, 3);

      expect(Array.from(result)).toEqual([10, 18, 28]);
    });

    it('should handle zero elements', () => {
      const a = new Float32Array([2, 0, 4]);
      const b = new Float32Array([5, 6, 0]);
      const result = new Float32Array(3);

      SIMDOps.multiplyArrays(result, a, b, 3);

      expect(Array.from(result)).toEqual([10, 0, 0]);
    });
  });

  describe('lerp', () => {
    it('should interpolate between arrays', () => {
      const a = new Float32Array([0, 10, 20]);
      const b = new Float32Array([100, 50, 80]);
      const result = new Float32Array(3);

      SIMDOps.lerp(result, a, b, 0.5, 3);

      expect(Array.from(result)).toEqual([50, 30, 50]);
    });

    it('should return a when t=0', () => {
      const a = new Float32Array([10, 20, 30]);
      const b = new Float32Array([100, 200, 300]);
      const result = new Float32Array(3);

      SIMDOps.lerp(result, a, b, 0, 3);

      expect(Array.from(result)).toEqual([10, 20, 30]);
    });

    it('should return b when t=1', () => {
      const a = new Float32Array([10, 20, 30]);
      const b = new Float32Array([100, 200, 300]);
      const result = new Float32Array(3);

      SIMDOps.lerp(result, a, b, 1, 3);

      expect(Array.from(result)).toEqual([100, 200, 300]);
    });
  });

  describe('fillArray', () => {
    it('should fill array with value', () => {
      const result = new Float32Array(5);

      SIMDOps.fillArray(result, 42, 5);

      expect(Array.from(result)).toEqual([42, 42, 42, 42, 42]);
    });

    it('should respect count parameter', () => {
      const result = new Float32Array(5);

      SIMDOps.fillArray(result, 7, 3);

      expect(Array.from(result)).toEqual([7, 7, 7, 0, 0]);
    });
  });

  describe('dotProduct', () => {
    it('should compute sum(a[i] * b[i])', () => {
      const a = new Float32Array([1, 2, 3]);
      const b = new Float32Array([4, 5, 6]);

      const result = SIMDOps.dotProduct(a, b, 3);

      expect(result).toBe(32); // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
    });

    it('should handle zero vectors', () => {
      const a = new Float32Array([0, 0, 0]);
      const b = new Float32Array([1, 2, 3]);

      const result = SIMDOps.dotProduct(a, b, 3);

      expect(result).toBe(0);
    });

    it('should handle orthogonal vectors', () => {
      const a = new Float32Array([1, 0]);
      const b = new Float32Array([0, 1]);

      const result = SIMDOps.dotProduct(a, b, 2);

      expect(result).toBe(0);
    });
  });

  describe('sum', () => {
    it('should sum all elements', () => {
      const a = new Float32Array([1, 2, 3, 4, 5]);

      const result = SIMDOps.sum(a, 5);

      expect(result).toBe(15);
    });

    it('should handle negative values', () => {
      const a = new Float32Array([-5, 10, -3]);

      const result = SIMDOps.sum(a, 3);

      expect(result).toBe(2);
    });

    it('should handle empty array', () => {
      const a = new Float32Array([]);

      const result = SIMDOps.sum(a, 0);

      expect(result).toBe(0);
    });
  });
});

describe('SIMDBatchOps', () => {
  describe('findNearby', () => {
    it('should find entities within radius', () => {
      const xs = new Float32Array([0, 5, 10, 15, 20]);
      const ys = new Float32Array([0, 5, 10, 15, 20]);
      const entityIds = ['e0', 'e1', 'e2', 'e3', 'e4'];

      const batchOps = new SIMDBatchOps(5);
      const nearby = batchOps.findNearby(10, 10, 5, xs, ys, entityIds, 5);

      // Distance from (10, 10):
      // e0: sqrt(200) = 14.14 (outside)
      // e1: sqrt(50) = 7.07 (outside)
      // e2: 0 (inside)
      // e3: sqrt(50) = 7.07 (outside)
      // e4: sqrt(200) = 14.14 (outside)
      expect(nearby).toEqual(['e2']);
    });

    it('should find multiple entities within radius', () => {
      const xs = new Float32Array([0, 1, 2, 10, 11]);
      const ys = new Float32Array([0, 1, 2, 10, 11]);
      const entityIds = ['e0', 'e1', 'e2', 'e3', 'e4'];

      const batchOps = new SIMDBatchOps(5);
      const nearby = batchOps.findNearby(1, 1, 2, xs, ys, entityIds, 5);

      // Distance from (1, 1):
      // e0: sqrt(2) = 1.41 (inside)
      // e1: 0 (inside)
      // e2: sqrt(2) = 1.41 (inside)
      // e3: sqrt(162) = 12.73 (outside)
      // e4: sqrt(200) = 14.14 (outside)
      expect(nearby.sort()).toEqual(['e0', 'e1', 'e2']);
    });

    it('should return empty when no entities in range', () => {
      const xs = new Float32Array([0, 100, 200]);
      const ys = new Float32Array([0, 100, 200]);
      const entityIds = ['e0', 'e1', 'e2'];

      const batchOps = new SIMDBatchOps(3);
      const nearby = batchOps.findNearby(50, 50, 5, xs, ys, entityIds, 3);

      expect(nearby).toEqual([]);
    });

    it('should handle empty input', () => {
      const xs = new Float32Array([]);
      const ys = new Float32Array([]);
      const entityIds: string[] = [];

      const batchOps = new SIMDBatchOps(10);
      const nearby = batchOps.findNearby(0, 0, 10, xs, ys, entityIds, 0);

      expect(nearby).toEqual([]);
    });
  });

  describe('computeDistances', () => {
    it('should compute distances squared to all entities', () => {
      const xs = new Float32Array([0, 3, 4]);
      const ys = new Float32Array([0, 4, 3]);
      const entityIds = ['e0', 'e1', 'e2'];

      const batchOps = new SIMDBatchOps(3);
      const result = batchOps.computeDistances(0, 0, xs, ys, entityIds, 3);

      expect(result.entityIds).toEqual(['e0', 'e1', 'e2']);
      expect(Array.from(result.distancesSquared)).toEqual([0, 25, 25]);
    });
  });

  describe('findKNearest', () => {
    it('should find K nearest entities', () => {
      const xs = new Float32Array([0, 1, 2, 3, 4, 5]);
      const ys = new Float32Array([0, 0, 0, 0, 0, 0]);
      const entityIds = ['e0', 'e1', 'e2', 'e3', 'e4', 'e5'];

      const batchOps = new SIMDBatchOps(6);
      const nearest = batchOps.findKNearest(2, 0, 3, xs, ys, entityIds, 6);

      // Distances from (2, 0):
      // e0: 2, e1: 1, e2: 0, e3: 1, e4: 2, e5: 3
      // 3 nearest: e2 (0), e1 (1), e3 (1)
      expect(nearest).toHaveLength(3);
      expect(nearest).toContain('e2');
      expect(nearest).toContain('e1');
      expect(nearest).toContain('e3');
    });

    it('should handle K larger than entity count', () => {
      const xs = new Float32Array([0, 1]);
      const ys = new Float32Array([0, 0]);
      const entityIds = ['e0', 'e1'];

      const batchOps = new SIMDBatchOps(2);
      const nearest = batchOps.findKNearest(0, 0, 10, xs, ys, entityIds, 2);

      expect(nearest).toHaveLength(2);
    });

    it('should handle K=1', () => {
      const xs = new Float32Array([0, 5, 10]);
      const ys = new Float32Array([0, 5, 10]);
      const entityIds = ['e0', 'e1', 'e2'];

      const batchOps = new SIMDBatchOps(3);
      const nearest = batchOps.findKNearest(1, 1, 1, xs, ys, entityIds, 3);

      expect(nearest).toEqual(['e0']); // (0,0) is closest to (1,1)
    });
  });
});
