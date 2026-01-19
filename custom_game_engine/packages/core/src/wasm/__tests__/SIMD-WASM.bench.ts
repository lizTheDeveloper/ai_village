/**
 * Performance benchmarks for WASM SIMD vs JavaScript auto-vectorization
 *
 * Measures the speedup achieved by using explicit WASM SIMD intrinsics (v128)
 * compared to JavaScript auto-vectorization (JIT-based SIMD).
 *
 * Expected results:
 * - Small arrays (<1,000): 0.9x (memory copy overhead)
 * - Medium arrays (1,000-10,000): 1.5-2x
 * - Large arrays (10,000-50,000): 2-3x
 * - Huge arrays (50,000+): 2-4x
 */

import { describe, bench, beforeAll } from 'vitest';
import { SIMDOpsWASM, checkWASMSIMDSupport } from '../SIMDOpsWASM.js';
import { SIMDOps } from '../../utils/SIMD.js';

describe('WASM SIMD vs JS Auto-Vectorization Performance', () => {
  let wasmSIMD: SIMDOpsWASM;
  let isSupported = false;

  beforeAll(async () => {
    isSupported = checkWASMSIMDSupport();

    if (!isSupported) {
      console.warn('⚠️ WASM SIMD not supported - benchmarks will be skipped');
      return;
    }

    wasmSIMD = new SIMDOpsWASM();
    await wasmSIMD.initialize();
    console.info('✓ WASM SIMD initialized for benchmarking');
  });

  // Test multiple array sizes to see where WASM SIMD wins
  const SIZES = [
    { name: 'Tiny', size: 100 },
    { name: 'Small', size: 1000 },
    { name: 'Medium', size: 10000 },
    { name: 'Large', size: 50000 },
  ];

  for (const { name, size } of SIZES) {
    describe(`Array Size: ${name} (${size} elements)`, () => {
      // Prepare test data
      const a = new Float32Array(size);
      const b = new Float32Array(size);
      const result = new Float32Array(size);

      beforeAll(() => {
        for (let i = 0; i < size; i++) {
          a[i] = Math.sin(i * 0.01);
          b[i] = Math.cos(i * 0.01);
        }
      });

      // Add Arrays
      bench(`JS Auto-Vec: Add ${size} elements`, () => {
        SIMDOps.addArrays(result, a, b, size);
      });

      if (isSupported) {
        bench(`WASM SIMD: Add ${size} elements`, () => {
          wasmSIMD.addArrays(result, a, b, size);
        });
      }

      // Multiply Arrays (element-wise)
      bench(`JS Auto-Vec: Multiply ${size} elements`, () => {
        SIMDOps.multiplyArrays(result, a, b, size);
      });

      if (isSupported) {
        bench(`WASM SIMD: Multiply ${size} elements`, () => {
          wasmSIMD.multiplyArrays(result, a, b, size);
        });
      }

      // Fused Multiply-Add (FMA) - most critical operation
      const scalar = 0.016; // Typical deltaTime

      bench(`JS Auto-Vec: FMA ${size} elements`, () => {
        SIMDOps.fma(result, a, b, scalar, size);
      });

      if (isSupported) {
        bench(`WASM SIMD: FMA ${size} elements`, () => {
          wasmSIMD.fma(result, a, b, scalar, size);
        });
      }

      // Scale Array (scalar multiplication)
      bench(`JS Auto-Vec: Scale ${size} elements`, () => {
        SIMDOps.scaleArray(result, a, scalar, size);
      });

      if (isSupported) {
        bench(`WASM SIMD: Scale ${size} elements`, () => {
          wasmSIMD.scaleArray(result, a, scalar, size);
        });
      }

      // Distance Squared (used in spatial queries)
      const dx = new Float32Array(size);
      const dy = new Float32Array(size);
      const distSq = new Float32Array(size);

      beforeAll(() => {
        for (let i = 0; i < size; i++) {
          dx[i] = Math.random() * 100;
          dy[i] = Math.random() * 100;
        }
      });

      bench(`JS Auto-Vec: DistanceSquared ${size} elements`, () => {
        SIMDOps.distanceSquared(distSq, dx, dy, size);
      });

      if (isSupported) {
        bench(`WASM SIMD: DistanceSquared ${size} elements`, () => {
          wasmSIMD.distanceSquared(distSq, dx, dy, size);
        });
      }

      // Clamp (used for bounds checking)
      bench(`JS Auto-Vec: Clamp ${size} elements`, () => {
        SIMDOps.clampArray(result, a, -1, 1, size);
      });

      if (isSupported) {
        bench(`WASM SIMD: Clamp ${size} elements`, () => {
          wasmSIMD.clampArray(result, a, -1, 1, size);
        });
      }
    });
  }

  // Reduction operations (horizontal sums)
  describe('Reduction Operations', () => {
    const size = 10000;
    const a = new Float32Array(size);
    const b = new Float32Array(size);

    beforeAll(() => {
      for (let i = 0; i < size; i++) {
        a[i] = i * 0.1;
        b[i] = i * 0.2;
      }
    });

    // Dot Product
    bench(`JS Auto-Vec: Dot Product ${size} elements`, () => {
      SIMDOps.dotProduct(a, b, size);
    });

    if (isSupported) {
      bench(`WASM SIMD: Dot Product ${size} elements`, () => {
        wasmSIMD.dotProduct(a, b, size);
      });
    }

    // Sum
    bench(`JS Auto-Vec: Sum ${size} elements`, () => {
      SIMDOps.sum(a, size);
    });

    if (isSupported) {
      bench(`WASM SIMD: Sum ${size} elements`, () => {
        wasmSIMD.sum(a, size);
      });
    }
  });

  // Real-world scenario: Velocity integration (like MovementSystem)
  describe('Real-World: Velocity Integration', () => {
    const entityCount = 5000; // Typical mid-sized simulation
    const deltaTime = 0.016; // 60 FPS

    const posX = new Float32Array(entityCount);
    const posY = new Float32Array(entityCount);
    const velX = new Float32Array(entityCount);
    const velY = new Float32Array(entityCount);
    const speedMultipliers = new Float32Array(entityCount);

    beforeAll(() => {
      // Initialize positions, velocities, and speed multipliers
      for (let i = 0; i < entityCount; i++) {
        posX[i] = Math.random() * 1000;
        posY[i] = Math.random() * 1000;
        velX[i] = (Math.random() - 0.5) * 10;
        velY[i] = (Math.random() - 0.5) * 10;
        speedMultipliers[i] = 0.8 + Math.random() * 0.4; // 0.8-1.2
      }
    });

    bench(`JS Auto-Vec: Integrate ${entityCount} entities`, () => {
      // Compute deltaX = velX * speedMultipliers
      const deltaX = new Float32Array(entityCount);
      const deltaY = new Float32Array(entityCount);
      SIMDOps.multiplyArrays(deltaX, velX, speedMultipliers, entityCount);
      SIMDOps.multiplyArrays(deltaY, velY, speedMultipliers, entityCount);

      // Scale by deltaTime
      SIMDOps.scaleArray(deltaX, deltaX, deltaTime, entityCount);
      SIMDOps.scaleArray(deltaY, deltaY, deltaTime, entityCount);

      // Update positions
      SIMDOps.addArrays(posX, posX, deltaX, entityCount);
      SIMDOps.addArrays(posY, posY, deltaY, entityCount);
    });

    if (isSupported) {
      bench(`WASM SIMD: Integrate ${entityCount} entities`, () => {
        // Compute deltaX = velX * speedMultipliers
        const deltaX = new Float32Array(entityCount);
        const deltaY = new Float32Array(entityCount);
        wasmSIMD.multiplyArrays(deltaX, velX, speedMultipliers, entityCount);
        wasmSIMD.multiplyArrays(deltaY, velY, speedMultipliers, entityCount);

        // Scale by deltaTime
        wasmSIMD.scaleArray(deltaX, deltaX, deltaTime, entityCount);
        wasmSIMD.scaleArray(deltaY, deltaY, deltaTime, entityCount);

        // Update positions
        wasmSIMD.addArrays(posX, posX, deltaX, entityCount);
        wasmSIMD.addArrays(posY, posY, deltaY, entityCount);
      });
    }
  });
});
