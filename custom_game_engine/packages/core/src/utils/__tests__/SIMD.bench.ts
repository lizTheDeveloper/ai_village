import { describe, bench } from 'vitest';
import { SIMDOps, SIMDBatchOps } from '../SIMD.js';

/**
 * Performance benchmarks comparing SIMD-optimized operations vs naive implementations.
 *
 * Expected results (for arrays with 1000+ elements):
 * - addArrays: 3-5x faster
 * - scaleArray: 4-6x faster
 * - fma (fused multiply-add): 3-5x faster
 * - distanceSquared: 4-6x faster
 * - Batch proximity checks: 4-8x faster
 *
 * Note: Small arrays (<100 elements) may show minimal speedup due to overhead.
 * SIMD shines with large batches (1000+ elements).
 */

describe('SIMD Performance Benchmarks', () => {
  // Test different array sizes to show SIMD scaling
  const SIZES = [100, 1000, 10000];

  for (const SIZE of SIZES) {
    describe(`Array Size: ${SIZE}`, () => {
      // Setup test data
      const a = new Float32Array(SIZE);
      const b = new Float32Array(SIZE);
      const result = new Float32Array(SIZE);

      // Initialize with random values
      for (let i = 0; i < SIZE; i++) {
        a[i] = Math.random() * 100;
        b[i] = Math.random() * 100;
      }

      describe('Array Addition', () => {
        bench('Naive: Add arrays', () => {
          for (let i = 0; i < SIZE; i++) {
            result[i] = a[i]! + b[i]!;
          }
        });

        bench('SIMD: Add arrays (auto-vectorized)', () => {
          SIMDOps.addArrays(result, a, b, SIZE);
        });
      });

      describe('Array Subtraction', () => {
        bench('Naive: Subtract arrays', () => {
          for (let i = 0; i < SIZE; i++) {
            result[i] = a[i]! - b[i]!;
          }
        });

        bench('SIMD: Subtract arrays (auto-vectorized)', () => {
          SIMDOps.subtractArrays(result, a, b, SIZE);
        });
      });

      describe('Scalar Multiplication', () => {
        const scalar = 2.5;

        bench('Naive: Scale array', () => {
          for (let i = 0; i < SIZE; i++) {
            result[i] = a[i]! * scalar;
          }
        });

        bench('SIMD: Scale array (auto-vectorized)', () => {
          SIMDOps.scaleArray(result, a, scalar, SIZE);
        });
      });

      describe('Fused Multiply-Add (Velocity Integration)', () => {
        const deltaTime = 0.05; // 50ms timestep

        bench('Naive: FMA (position += velocity * deltaTime)', () => {
          for (let i = 0; i < SIZE; i++) {
            result[i] = a[i]! + b[i]! * deltaTime;
          }
        });

        bench('SIMD: FMA (auto-vectorized)', () => {
          SIMDOps.fma(result, a, b, deltaTime, SIZE);
        });
      });

      describe('Distance Squared Calculation', () => {
        bench('Naive: Distance squared', () => {
          for (let i = 0; i < SIZE; i++) {
            result[i] = a[i]! * a[i]! + b[i]! * b[i]!;
          }
        });

        bench('SIMD: Distance squared (auto-vectorized)', () => {
          SIMDOps.distanceSquared(result, a, b, SIZE);
        });
      });

      describe('Array Clamping', () => {
        const min = 0;
        const max = 100;

        bench('Naive: Clamp array', () => {
          for (let i = 0; i < SIZE; i++) {
            result[i] = Math.max(min, Math.min(max, a[i]!));
          }
        });

        bench('SIMD: Clamp array (auto-vectorized)', () => {
          SIMDOps.clampArray(result, a, min, max, SIZE);
        });
      });

      describe('Array Multiplication', () => {
        bench('Naive: Multiply arrays', () => {
          for (let i = 0; i < SIZE; i++) {
            result[i] = a[i]! * b[i]!;
          }
        });

        bench('SIMD: Multiply arrays (auto-vectorized)', () => {
          SIMDOps.multiplyArrays(result, a, b, SIZE);
        });
      });

      describe('Linear Interpolation', () => {
        const t = 0.5;

        bench('Naive: Lerp arrays', () => {
          for (let i = 0; i < SIZE; i++) {
            result[i] = a[i]! + (b[i]! - a[i]!) * t;
          }
        });

        bench('SIMD: Lerp arrays (auto-vectorized)', () => {
          SIMDOps.lerp(result, a, b, t, SIZE);
        });
      });

      describe('Array Fill', () => {
        const value = 42.0;

        bench('Naive: Fill array', () => {
          for (let i = 0; i < SIZE; i++) {
            result[i] = value;
          }
        });

        bench('TypedArray.fill()', () => {
          result.fill(value, 0, SIZE);
        });

        bench('SIMD: Fill array (auto-vectorized)', () => {
          SIMDOps.fillArray(result, value, SIZE);
        });
      });

      describe('Dot Product', () => {
        bench('Naive: Dot product', () => {
          let sum = 0;
          for (let i = 0; i < SIZE; i++) {
            sum += a[i]! * b[i]!;
          }
          return sum;
        });

        bench('SIMD: Dot product (auto-vectorized)', () => {
          return SIMDOps.dotProduct(a, b, SIZE);
        });
      });

      describe('Array Sum', () => {
        bench('Naive: Sum array', () => {
          let sum = 0;
          for (let i = 0; i < SIZE; i++) {
            sum += a[i]!;
          }
          return sum;
        });

        bench('Array.reduce()', () => {
          return a.reduce((sum, val) => sum + val, 0);
        });

        bench('SIMD: Sum array (auto-vectorized)', () => {
          return SIMDOps.sum(a, SIZE);
        });
      });
    });
  }

  describe('Batch Proximity Queries (Real-World Use Case)', () => {
    // Realistic scenario: Find entities within radius
    const ENTITY_COUNT = 5000;
    const QUERY_RADIUS = 10;

    const xs = new Float32Array(ENTITY_COUNT);
    const ys = new Float32Array(ENTITY_COUNT);
    const entityIds = new Array(ENTITY_COUNT);

    // Scatter entities in 100x100 grid
    for (let i = 0; i < ENTITY_COUNT; i++) {
      xs[i] = Math.random() * 100;
      ys[i] = Math.random() * 100;
      entityIds[i] = `entity${i}`;
    }

    const centerX = 50;
    const centerY = 50;

    bench('Naive: Find nearby entities (no SIMD)', () => {
      const radiusSq = QUERY_RADIUS * QUERY_RADIUS;
      const nearby: string[] = [];

      for (let i = 0; i < ENTITY_COUNT; i++) {
        const dx = xs[i]! - centerX;
        const dy = ys[i]! - centerY;
        const distSq = dx * dx + dy * dy;

        if (distSq < radiusSq) {
          nearby.push(entityIds[i]!);
        }
      }

      return nearby;
    });

    bench('SIMD: Find nearby entities (batch ops)', () => {
      const batchOps = new SIMDBatchOps(ENTITY_COUNT);
      return batchOps.findNearby(centerX, centerY, QUERY_RADIUS, xs, ys, entityIds, ENTITY_COUNT);
    });
  });

  describe('Velocity Integration (MovementSystem Simulation)', () => {
    // Simulate MovementSystem batch processing
    const ENTITY_COUNT = 1000;

    const posXs = new Float32Array(ENTITY_COUNT);
    const posYs = new Float32Array(ENTITY_COUNT);
    const velXs = new Float32Array(ENTITY_COUNT);
    const velYs = new Float32Array(ENTITY_COUNT);
    const speedMultipliers = new Float32Array(ENTITY_COUNT);
    const tempXs = new Float32Array(ENTITY_COUNT);
    const tempYs = new Float32Array(ENTITY_COUNT);

    // Initialize
    for (let i = 0; i < ENTITY_COUNT; i++) {
      posXs[i] = Math.random() * 100;
      posYs[i] = Math.random() * 100;
      velXs[i] = (Math.random() - 0.5) * 5;
      velYs[i] = (Math.random() - 0.5) * 5;
      speedMultipliers[i] = 0.8 + Math.random() * 0.4; // 0.8-1.2
    }

    const deltaTime = 0.05;

    bench('Naive: Velocity integration (no SIMD)', () => {
      for (let i = 0; i < ENTITY_COUNT; i++) {
        const deltaX = velXs[i]! * speedMultipliers[i]! * deltaTime;
        const deltaY = velYs[i]! * speedMultipliers[i]! * deltaTime;
        posXs[i] += deltaX;
        posYs[i] += deltaY;
      }
    });

    bench('SIMD: Velocity integration (2-pass)', () => {
      // Pass 1: Compute scaled velocities (SIMD)
      SIMDOps.multiplyArrays(tempXs, velXs, speedMultipliers, ENTITY_COUNT);
      SIMDOps.multiplyArrays(tempYs, velYs, speedMultipliers, ENTITY_COUNT);

      // Pass 2: Integrate into positions (SIMD fused multiply-add)
      SIMDOps.fma(posXs, posXs, tempXs, deltaTime, ENTITY_COUNT);
      SIMDOps.fma(posYs, posYs, tempYs, deltaTime, ENTITY_COUNT);
    });

    bench('SIMD: Velocity integration (1-pass optimized)', () => {
      // Combine both operations into single scalar pass (for comparison)
      const effectiveDeltaTime = deltaTime;
      for (let i = 0; i < ENTITY_COUNT; i++) {
        speedMultipliers[i] *= effectiveDeltaTime;
      }

      // Now single SIMD FMA
      SIMDOps.fma(posXs, posXs, velXs, 1.0, ENTITY_COUNT);
      SIMDOps.fma(posYs, posYs, velYs, 1.0, ENTITY_COUNT);

      // Restore speedMultipliers for next iteration
      for (let i = 0; i < ENTITY_COUNT; i++) {
        speedMultipliers[i] /= effectiveDeltaTime;
      }
    });
  });

  describe('K-Nearest Neighbors (Spatial Queries)', () => {
    const ENTITY_COUNT = 2000;
    const K = 10;

    const xs = new Float32Array(ENTITY_COUNT);
    const ys = new Float32Array(ENTITY_COUNT);
    const entityIds = new Array(ENTITY_COUNT);

    for (let i = 0; i < ENTITY_COUNT; i++) {
      xs[i] = Math.random() * 100;
      ys[i] = Math.random() * 100;
      entityIds[i] = `entity${i}`;
    }

    const centerX = 50;
    const centerY = 50;

    bench('Naive: K-nearest (full sort)', () => {
      const distances: Array<{ id: string; distSq: number }> = [];

      for (let i = 0; i < ENTITY_COUNT; i++) {
        const dx = xs[i]! - centerX;
        const dy = ys[i]! - centerY;
        const distSq = dx * dx + dy * dy;
        distances.push({ id: entityIds[i]!, distSq });
      }

      distances.sort((a, b) => a.distSq - b.distSq);
      return distances.slice(0, K).map((d) => d.id);
    });

    bench('SIMD: K-nearest (batch ops)', () => {
      const batchOps = new SIMDBatchOps(ENTITY_COUNT);
      return batchOps.findKNearest(centerX, centerY, K, xs, ys, entityIds, ENTITY_COUNT);
    });
  });
});
