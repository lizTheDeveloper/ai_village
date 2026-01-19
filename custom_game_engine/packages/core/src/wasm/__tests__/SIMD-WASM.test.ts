/**
 * Tests for WebAssembly SIMD operations
 *
 * Verifies correctness of WASM SIMD operations with explicit v128 intrinsics.
 * These tests ensure WASM SIMD produces identical results to JavaScript auto-vectorization.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { SIMDOpsWASM, checkWASMSIMDSupport } from '../SIMDOpsWASM.js';
import { SIMDOps } from '../../utils/SIMD.js';

describe('WASM SIMD Support Detection', () => {
  it('should detect WASM SIMD support', () => {
    const supported = checkWASMSIMDSupport();
    expect(typeof supported).toBe('boolean');

    if (supported) {
      console.info('✓ Browser supports WASM SIMD');
    } else {
      console.warn('✗ Browser does NOT support WASM SIMD (tests will be skipped)');
    }
  });
});

describe('WASM SIMD Operations', () => {
  let wasmSIMD: SIMDOpsWASM;

  beforeAll(async () => {
    if (!checkWASMSIMDSupport()) {
      console.warn('Skipping WASM SIMD tests - not supported in this environment');
      return;
    }

    wasmSIMD = new SIMDOpsWASM();
    await wasmSIMD.initialize();
  });

  // Skip tests if WASM SIMD not supported
  const testIf = (condition: boolean) => condition ? it : it.skip;

  testIf(checkWASMSIMDSupport())('should initialize successfully', () => {
    expect(wasmSIMD).toBeDefined();
    expect(wasmSIMD.isReady()).toBe(true);
  });

  describe('Array Addition', () => {
    testIf(checkWASMSIMDSupport())('should add two arrays (small)', () => {
      const size = 10;
      const a = new Float32Array(size);
      const b = new Float32Array(size);
      const result = new Float32Array(size);
      const expected = new Float32Array(size);

      // Fill with test data
      for (let i = 0; i < size; i++) {
        a[i] = i * 1.5;
        b[i] = i * 2.0;
      }

      // WASM SIMD
      wasmSIMD.addArrays(result, a, b, size);

      // JS auto-vec (reference)
      SIMDOps.addArrays(expected, a, b, size);

      // Verify results match
      for (let i = 0; i < size; i++) {
        expect(result[i]).toBeCloseTo(expected[i]!, 5);
      }
    });

    testIf(checkWASMSIMDSupport())('should add two arrays (large)', () => {
      const size = 10000;
      const a = new Float32Array(size);
      const b = new Float32Array(size);
      const result = new Float32Array(size);
      const expected = new Float32Array(size);

      // Fill with test data
      for (let i = 0; i < size; i++) {
        a[i] = Math.sin(i * 0.01);
        b[i] = Math.cos(i * 0.01);
      }

      // WASM SIMD
      wasmSIMD.addArrays(result, a, b, size);

      // JS auto-vec (reference)
      SIMDOps.addArrays(expected, a, b, size);

      // Verify results match
      for (let i = 0; i < size; i++) {
        expect(result[i]).toBeCloseTo(expected[i]!, 5);
      }
    });
  });

  describe('Fused Multiply-Add', () => {
    testIf(checkWASMSIMDSupport())('should compute FMA correctly', () => {
      const size = 1000;
      const a = new Float32Array(size);
      const b = new Float32Array(size);
      const result = new Float32Array(size);
      const expected = new Float32Array(size);
      const scalar = 0.016; // deltaTime

      // Fill with test data (simulating position + velocity * deltaTime)
      for (let i = 0; i < size; i++) {
        a[i] = i * 10.0; // positions
        b[i] = i * 2.5;  // velocities
      }

      // WASM SIMD
      wasmSIMD.fma(result, a, b, scalar, size);

      // JS auto-vec (reference)
      SIMDOps.fma(expected, a, b, scalar, size);

      // Verify results match
      for (let i = 0; i < size; i++) {
        expect(result[i]).toBeCloseTo(expected[i]!, 5);
      }
    });

    testIf(checkWASMSIMDSupport())('should handle zero scalar', () => {
      const size = 100;
      const a = new Float32Array(size);
      const b = new Float32Array(size);
      const result = new Float32Array(size);

      for (let i = 0; i < size; i++) {
        a[i] = i * 1.5;
        b[i] = i * 2.0;
      }

      wasmSIMD.fma(result, a, b, 0, size);

      // Should equal a when scalar is 0
      for (let i = 0; i < size; i++) {
        expect(result[i]).toBeCloseTo(a[i]!, 5);
      }
    });
  });

  describe('Multiply Arrays', () => {
    testIf(checkWASMSIMDSupport())('should multiply arrays element-wise', () => {
      const size = 500;
      const a = new Float32Array(size);
      const b = new Float32Array(size);
      const result = new Float32Array(size);
      const expected = new Float32Array(size);

      for (let i = 0; i < size; i++) {
        a[i] = i * 0.5;
        b[i] = i * 1.5;
      }

      wasmSIMD.multiplyArrays(result, a, b, size);
      SIMDOps.multiplyArrays(expected, a, b, size);

      for (let i = 0; i < size; i++) {
        expect(result[i]).toBeCloseTo(expected[i]!, 5);
      }
    });
  });

  describe('Distance Squared', () => {
    testIf(checkWASMSIMDSupport())('should compute distance squared', () => {
      const size = 1000;
      const dx = new Float32Array(size);
      const dy = new Float32Array(size);
      const distSq = new Float32Array(size);
      const expected = new Float32Array(size);

      for (let i = 0; i < size; i++) {
        dx[i] = Math.random() * 100;
        dy[i] = Math.random() * 100;
      }

      wasmSIMD.distanceSquared(distSq, dx, dy, size);
      SIMDOps.distanceSquared(expected, dx, dy, size);

      for (let i = 0; i < size; i++) {
        expect(distSq[i]).toBeCloseTo(expected[i]!, 5);
      }
    });
  });

  describe('Clamp Array', () => {
    testIf(checkWASMSIMDSupport())('should clamp values to range', () => {
      const size = 500;
      const a = new Float32Array(size);
      const result = new Float32Array(size);
      const expected = new Float32Array(size);
      const min = -10;
      const max = 10;

      // Mix of values inside and outside range
      for (let i = 0; i < size; i++) {
        a[i] = (i - size / 2) * 0.1;
      }

      wasmSIMD.clampArray(result, a, min, max, size);
      SIMDOps.clampArray(expected, a, min, max, size);

      for (let i = 0; i < size; i++) {
        expect(result[i]).toBeCloseTo(expected[i]!, 5);
        expect(result[i]!).toBeGreaterThanOrEqual(min);
        expect(result[i]!).toBeLessThanOrEqual(max);
      }
    });
  });

  describe('Linear Interpolation', () => {
    testIf(checkWASMSIMDSupport())('should interpolate between arrays', () => {
      const size = 500;
      const a = new Float32Array(size);
      const b = new Float32Array(size);
      const result = new Float32Array(size);
      const expected = new Float32Array(size);
      const t = 0.5; // Midpoint

      for (let i = 0; i < size; i++) {
        a[i] = i * 10;
        b[i] = i * 20;
      }

      wasmSIMD.lerp(result, a, b, t, size);
      SIMDOps.lerp(expected, a, b, t, size);

      for (let i = 0; i < size; i++) {
        expect(result[i]).toBeCloseTo(expected[i]!, 5);
      }
    });

    testIf(checkWASMSIMDSupport())('should handle edge cases (t=0, t=1)', () => {
      const size = 100;
      const a = new Float32Array(size);
      const b = new Float32Array(size);
      const result0 = new Float32Array(size);
      const result1 = new Float32Array(size);

      for (let i = 0; i < size; i++) {
        a[i] = i * 5;
        b[i] = i * 15;
      }

      // t=0 should return a
      wasmSIMD.lerp(result0, a, b, 0, size);
      for (let i = 0; i < size; i++) {
        expect(result0[i]).toBeCloseTo(a[i]!, 5);
      }

      // t=1 should return b
      wasmSIMD.lerp(result1, a, b, 1, size);
      for (let i = 0; i < size; i++) {
        expect(result1[i]).toBeCloseTo(b[i]!, 5);
      }
    });
  });

  describe('Fill Array', () => {
    testIf(checkWASMSIMDSupport())('should fill array with scalar', () => {
      const size = 1000;
      const result = new Float32Array(size);
      const value = 42.5;

      wasmSIMD.fillArray(result, value, size);

      for (let i = 0; i < size; i++) {
        expect(result[i]).toBe(value);
      }
    });
  });

  describe('Dot Product', () => {
    testIf(checkWASMSIMDSupport())('should compute dot product', () => {
      const size = 1000;
      const a = new Float32Array(size);
      const b = new Float32Array(size);

      for (let i = 0; i < size; i++) {
        a[i] = i * 0.5;
        b[i] = i * 1.5;
      }

      const wasmResult = wasmSIMD.dotProduct(a, b, size);
      const jsResult = SIMDOps.dotProduct(a, b, size);

      // Allow small floating-point difference due to different accumulation order
      expect(wasmResult).toBeCloseTo(jsResult, 3);
    });

    testIf(checkWASMSIMDSupport())('should handle orthogonal vectors', () => {
      const size = 100;
      const a = new Float32Array(size);
      const b = new Float32Array(size);

      // Create orthogonal vectors (alternating pattern)
      for (let i = 0; i < size; i++) {
        if (i % 2 === 0) {
          a[i] = 1;
          b[i] = 0;
        } else {
          a[i] = 0;
          b[i] = 1;
        }
      }

      const result = wasmSIMD.dotProduct(a, b, size);
      expect(result).toBeCloseTo(0, 5);
    });
  });

  describe('Sum Array', () => {
    testIf(checkWASMSIMDSupport())('should sum array elements', () => {
      const size = 1000;
      const a = new Float32Array(size);

      for (let i = 0; i < size; i++) {
        a[i] = i * 0.1;
      }

      const wasmResult = wasmSIMD.sum(a, size);
      const jsResult = SIMDOps.sum(a, size);

      expect(wasmResult).toBeCloseTo(jsResult, 3);
    });
  });

  describe('Non-Power-of-4 Sizes', () => {
    testIf(checkWASMSIMDSupport())('should handle size not divisible by 4', () => {
      const sizes = [1, 3, 7, 13, 97, 1003];

      for (const size of sizes) {
        const a = new Float32Array(size);
        const b = new Float32Array(size);
        const result = new Float32Array(size);
        const expected = new Float32Array(size);

        for (let i = 0; i < size; i++) {
          a[i] = i * 1.5;
          b[i] = i * 2.0;
        }

        wasmSIMD.addArrays(result, a, b, size);
        SIMDOps.addArrays(expected, a, b, size);

        for (let i = 0; i < size; i++) {
          expect(result[i]).toBeCloseTo(expected[i]!, 5);
        }
      }
    });
  });

  describe('Error Handling', () => {
    testIf(checkWASMSIMDSupport())('should throw on uninitialized module', async () => {
      const uninitWASM = new SIMDOpsWASM();
      const a = new Float32Array(10);
      const b = new Float32Array(10);
      const result = new Float32Array(10);

      expect(() => {
        uninitWASM.addArrays(result, a, b, 10);
      }).toThrow('WASM SIMD not initialized');
    });

    testIf(checkWASMSIMDSupport())('should throw on oversized arrays', () => {
      const tooLarge = 10000000; // Exceeds WASM memory
      const a = new Float32Array(100);
      const b = new Float32Array(100);
      const result = new Float32Array(100);

      expect(() => {
        wasmSIMD.addArrays(result, a, b, tooLarge);
      }).toThrow('exceeds maximum');
    });
  });
});
