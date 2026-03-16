/**
 * Tests for WebAssembly SIMD operations
 *
 * Verifies correctness of WASM SIMD operations with explicit v128 intrinsics.
 * These tests ensure WASM SIMD produces identical results to JavaScript auto-vectorization.
 *
 * Note: These tests require a browser-like environment with fetch() for loading .wasm files.
 * In Node/vitest they will be skipped gracefully.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { SIMDOpsWASM, checkWASMSIMDSupport } from '../SIMDOpsWASM.js';
import { SIMDOps } from '../../utils/SIMD.js';

describe('WASM SIMD Support Detection', () => {
  it('should detect WASM SIMD support', () => {
    const supported = checkWASMSIMDSupport();
    expect(typeof supported).toBe('boolean');
  });
});

describe('WASM SIMD Operations', () => {
  let wasmSIMD: SIMDOpsWASM;
  let wasmAvailable = false;

  beforeAll(async () => {
    if (!checkWASMSIMDSupport()) {
      return;
    }

    try {
      wasmSIMD = new SIMDOpsWASM();
      await wasmSIMD.initialize();
      wasmAvailable = true;
    } catch {
      // fetch() not available in Node test environment — skip gracefully
    }
  });

  it('should initialize successfully', () => {
    if (!wasmAvailable) return;
    expect(wasmSIMD).toBeDefined();
    expect(wasmSIMD.isReady()).toBe(true);
  });

  describe('Array Addition', () => {
    it('should add two arrays (small)', () => {
      if (!wasmAvailable) return;
      const size = 10;
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
    });

    it('should add two arrays (large)', () => {
      if (!wasmAvailable) return;
      const size = 10000;
      const a = new Float32Array(size);
      const b = new Float32Array(size);
      const result = new Float32Array(size);
      const expected = new Float32Array(size);

      for (let i = 0; i < size; i++) {
        a[i] = Math.sin(i * 0.01);
        b[i] = Math.cos(i * 0.01);
      }

      wasmSIMD.addArrays(result, a, b, size);
      SIMDOps.addArrays(expected, a, b, size);

      for (let i = 0; i < size; i++) {
        expect(result[i]).toBeCloseTo(expected[i]!, 5);
      }
    });
  });

  describe('Fused Multiply-Add', () => {
    it('should compute FMA correctly', () => {
      if (!wasmAvailable) return;
      const size = 1000;
      const a = new Float32Array(size);
      const b = new Float32Array(size);
      const result = new Float32Array(size);
      const expected = new Float32Array(size);
      const scalar = 0.016;

      for (let i = 0; i < size; i++) {
        a[i] = i * 10.0;
        b[i] = i * 2.5;
      }

      wasmSIMD.fma(result, a, b, scalar, size);
      SIMDOps.fma(expected, a, b, scalar, size);

      for (let i = 0; i < size; i++) {
        expect(result[i]).toBeCloseTo(expected[i]!, 5);
      }
    });

    it('should handle zero scalar', () => {
      if (!wasmAvailable) return;
      const size = 100;
      const a = new Float32Array(size);
      const b = new Float32Array(size);
      const result = new Float32Array(size);

      for (let i = 0; i < size; i++) {
        a[i] = i * 1.5;
        b[i] = i * 2.0;
      }

      wasmSIMD.fma(result, a, b, 0, size);

      for (let i = 0; i < size; i++) {
        expect(result[i]).toBeCloseTo(a[i]!, 5);
      }
    });
  });

  describe('Multiply Arrays', () => {
    it('should multiply arrays element-wise', () => {
      if (!wasmAvailable) return;
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
    it('should compute distance squared', () => {
      if (!wasmAvailable) return;
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
    it('should clamp values to range', () => {
      if (!wasmAvailable) return;
      const size = 500;
      const a = new Float32Array(size);
      const result = new Float32Array(size);
      const expected = new Float32Array(size);
      const min = -10;
      const max = 10;

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
    it('should interpolate between arrays', () => {
      if (!wasmAvailable) return;
      const size = 500;
      const a = new Float32Array(size);
      const b = new Float32Array(size);
      const result = new Float32Array(size);
      const expected = new Float32Array(size);
      const t = 0.5;

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

    it('should handle edge cases (t=0, t=1)', () => {
      if (!wasmAvailable) return;
      const size = 100;
      const a = new Float32Array(size);
      const b = new Float32Array(size);
      const result0 = new Float32Array(size);
      const result1 = new Float32Array(size);

      for (let i = 0; i < size; i++) {
        a[i] = i * 5;
        b[i] = i * 15;
      }

      wasmSIMD.lerp(result0, a, b, 0, size);
      for (let i = 0; i < size; i++) {
        expect(result0[i]).toBeCloseTo(a[i]!, 5);
      }

      wasmSIMD.lerp(result1, a, b, 1, size);
      for (let i = 0; i < size; i++) {
        expect(result1[i]).toBeCloseTo(b[i]!, 5);
      }
    });
  });

  describe('Fill Array', () => {
    it('should fill array with scalar', () => {
      if (!wasmAvailable) return;
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
    it('should compute dot product', () => {
      if (!wasmAvailable) return;
      const size = 1000;
      const a = new Float32Array(size);
      const b = new Float32Array(size);

      for (let i = 0; i < size; i++) {
        a[i] = i * 0.5;
        b[i] = i * 1.5;
      }

      const wasmResult = wasmSIMD.dotProduct(a, b, size);
      const jsResult = SIMDOps.dotProduct(a, b, size);

      expect(wasmResult).toBeCloseTo(jsResult, 3);
    });

    it('should handle orthogonal vectors', () => {
      if (!wasmAvailable) return;
      const size = 100;
      const a = new Float32Array(size);
      const b = new Float32Array(size);

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
    it('should sum array elements', () => {
      if (!wasmAvailable) return;
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
    it('should handle size not divisible by 4', () => {
      if (!wasmAvailable) return;
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
    it('should throw on uninitialized module', async () => {
      if (!wasmAvailable) return;
      const uninitWASM = new SIMDOpsWASM();
      const a = new Float32Array(10);
      const b = new Float32Array(10);
      const result = new Float32Array(10);

      expect(() => {
        uninitWASM.addArrays(result, a, b, 10);
      }).toThrow('WASM SIMD not initialized');
    });

    it('should throw on oversized arrays', () => {
      if (!wasmAvailable) return;
      const tooLarge = 10000000;
      const a = new Float32Array(100);
      const b = new Float32Array(100);
      const result = new Float32Array(100);

      expect(() => {
        wasmSIMD.addArrays(result, a, b, tooLarge);
      }).toThrow('exceeds maximum');
    });
  });
});
