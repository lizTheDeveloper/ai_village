import { describe, it, expect } from 'vitest';
import { Fixed, FixedVec2 } from '../FixedPoint.js';

describe('Fixed', () => {
  describe('Construction and Conversion', () => {
    it('fromFloat / toFloat round-trip', () => {
      const testValues = [0, 1, 3.5, -2.25, 100.75, 0.0625];

      for (const val of testValues) {
        const fixed = Fixed.fromFloat(val);
        const result = fixed.toFloat();
        expect(Math.abs(result - val)).toBeLessThan(0.0001);
      }
    });

    it('fromInt / toInt round-trip', () => {
      const testValues = [0, 1, 5, -3, 100, -50];

      for (const val of testValues) {
        const fixed = Fixed.fromInt(val);
        const result = fixed.toInt();
        expect(result).toBe(val);
      }
    });

    it('fromRaw preserves raw value', () => {
      const raw = 123456;
      const fixed = Fixed.fromRaw(raw);
      expect(fixed.raw).toBe(raw);
    });
  });

  describe('Constants', () => {
    it('ZERO equals 0', () => {
      expect(Fixed.ZERO.toFloat()).toBe(0);
    });

    it('ONE equals 1', () => {
      expect(Fixed.ONE.toFloat()).toBe(1);
    });

    it('HALF equals 0.5', () => {
      expect(Fixed.HALF.toFloat()).toBe(0.5);
    });

    it('TWO equals 2', () => {
      expect(Fixed.TWO.toFloat()).toBe(2);
    });

    it('NEG_ONE equals -1', () => {
      expect(Fixed.NEG_ONE.toFloat()).toBe(-1);
    });
  });

  describe('Addition', () => {
    it('adds positive numbers', () => {
      const a = Fixed.fromFloat(2.5);
      const b = Fixed.fromFloat(3.5);
      const result = a.add(b);
      expect(Math.abs(result.toFloat() - 6.0)).toBeLessThan(0.0001);
    });

    it('adds negative numbers', () => {
      const a = Fixed.fromFloat(-2.5);
      const b = Fixed.fromFloat(-3.5);
      const result = a.add(b);
      expect(Math.abs(result.toFloat() - (-6.0))).toBeLessThan(0.0001);
    });

    it('adds with zero', () => {
      const a = Fixed.fromFloat(5.5);
      const result = a.add(Fixed.ZERO);
      expect(Math.abs(result.toFloat() - 5.5)).toBeLessThan(0.0001);
    });

    it('is commutative', () => {
      const a = Fixed.fromFloat(2.5);
      const b = Fixed.fromFloat(3.5);
      expect(a.add(b).raw).toBe(b.add(a).raw);
    });
  });

  describe('Subtraction', () => {
    it('subtracts positive numbers', () => {
      const a = Fixed.fromFloat(5.0);
      const b = Fixed.fromFloat(2.5);
      const result = a.sub(b);
      expect(Math.abs(result.toFloat() - 2.5)).toBeLessThan(0.0001);
    });

    it('subtracts to negative', () => {
      const a = Fixed.fromFloat(2.5);
      const b = Fixed.fromFloat(5.0);
      const result = a.sub(b);
      expect(Math.abs(result.toFloat() - (-2.5))).toBeLessThan(0.0001);
    });

    it('subtracts zero', () => {
      const a = Fixed.fromFloat(5.5);
      const result = a.sub(Fixed.ZERO);
      expect(Math.abs(result.toFloat() - 5.5)).toBeLessThan(0.0001);
    });
  });

  describe('Multiplication', () => {
    it('multiplies positive numbers', () => {
      const a = Fixed.fromFloat(3.0);
      const b = Fixed.fromFloat(2.5);
      const result = a.mul(b);
      expect(Math.abs(result.toFloat() - 7.5)).toBeLessThan(0.0001);
    });

    it('multiplies negative numbers', () => {
      const a = Fixed.fromFloat(-3.0);
      const b = Fixed.fromFloat(2.5);
      const result = a.mul(b);
      expect(Math.abs(result.toFloat() - (-7.5))).toBeLessThan(0.0001);
    });

    it('multiplies by zero', () => {
      const a = Fixed.fromFloat(5.5);
      const result = a.mul(Fixed.ZERO);
      expect(result.toFloat()).toBe(0);
    });

    it('multiplies by one', () => {
      const a = Fixed.fromFloat(5.5);
      const result = a.mul(Fixed.ONE);
      expect(Math.abs(result.toFloat() - 5.5)).toBeLessThan(0.0001);
    });

    it('is commutative', () => {
      const a = Fixed.fromFloat(3.5);
      const b = Fixed.fromFloat(2.5);
      expect(a.mul(b).raw).toBe(b.mul(a).raw);
    });
  });

  describe('Division', () => {
    it('divides positive numbers', () => {
      const a = Fixed.fromFloat(10.0);
      const b = Fixed.fromFloat(4.0);
      const result = a.div(b);
      expect(Math.abs(result.toFloat() - 2.5)).toBeLessThan(0.0001);
    });

    it('divides negative numbers', () => {
      const a = Fixed.fromFloat(-10.0);
      const b = Fixed.fromFloat(4.0);
      const result = a.div(b);
      expect(Math.abs(result.toFloat() - (-2.5))).toBeLessThan(0.0001);
    });

    it('divides by one', () => {
      const a = Fixed.fromFloat(5.5);
      const result = a.div(Fixed.ONE);
      expect(Math.abs(result.toFloat() - 5.5)).toBeLessThan(0.0001);
    });

    it('throws on division by zero', () => {
      const a = Fixed.fromFloat(5.0);
      expect(() => a.div(Fixed.ZERO)).toThrow('Fixed-point division by zero');
    });

    it('handles fractional results', () => {
      const a = Fixed.fromFloat(7.0);
      const b = Fixed.fromFloat(3.0);
      const result = a.div(b);
      expect(Math.abs(result.toFloat() - (7.0 / 3.0))).toBeLessThan(0.001);
    });
  });

  describe('Negation', () => {
    it('negates positive number', () => {
      const a = Fixed.fromFloat(3.5);
      const result = a.neg();
      expect(Math.abs(result.toFloat() - (-3.5))).toBeLessThan(0.0001);
    });

    it('negates negative number', () => {
      const a = Fixed.fromFloat(-3.5);
      const result = a.neg();
      expect(Math.abs(result.toFloat() - 3.5)).toBeLessThan(0.0001);
    });

    it('negates zero', () => {
      const result = Fixed.ZERO.neg();
      expect(result.toFloat()).toBe(0);
    });

    it('double negation returns original', () => {
      const a = Fixed.fromFloat(3.5);
      const result = a.neg().neg();
      expect(result.raw).toBe(a.raw);
    });
  });

  describe('Absolute Value', () => {
    it('returns positive for positive number', () => {
      const a = Fixed.fromFloat(3.5);
      const result = a.abs();
      expect(Math.abs(result.toFloat() - 3.5)).toBeLessThan(0.0001);
    });

    it('returns positive for negative number', () => {
      const a = Fixed.fromFloat(-3.5);
      const result = a.abs();
      expect(Math.abs(result.toFloat() - 3.5)).toBeLessThan(0.0001);
    });

    it('returns zero for zero', () => {
      const result = Fixed.ZERO.abs();
      expect(result.toFloat()).toBe(0);
    });
  });

  describe('Floor and Ceil', () => {
    it('floor rounds down', () => {
      const a = Fixed.fromFloat(3.7);
      const result = a.floor();
      expect(result.toFloat()).toBe(3.0);
    });

    it('floor handles negative', () => {
      const a = Fixed.fromFloat(-3.3);
      const result = a.floor();
      expect(result.toFloat()).toBe(-4.0);
    });

    it('ceil rounds up', () => {
      const a = Fixed.fromFloat(3.3);
      const result = a.ceil();
      expect(result.toFloat()).toBe(4.0);
    });

    it('ceil handles negative', () => {
      const a = Fixed.fromFloat(-3.7);
      const result = a.ceil();
      expect(result.toFloat()).toBe(-3.0);
    });
  });

  describe('Square Root', () => {
    it('sqrt of perfect square', () => {
      const a = Fixed.fromFloat(4.0);
      const result = a.sqrt();
      expect(Math.abs(result.toFloat() - 2.0)).toBeLessThan(0.01);
    });

    it('sqrt of 9', () => {
      const a = Fixed.fromFloat(9.0);
      const result = a.sqrt();
      expect(Math.abs(result.toFloat() - 3.0)).toBeLessThan(0.01);
    });

    it('sqrt of non-perfect square', () => {
      const a = Fixed.fromFloat(2.0);
      const result = a.sqrt();
      expect(Math.abs(result.toFloat() - Math.sqrt(2))).toBeLessThan(0.01);
    });

    it('sqrt of zero', () => {
      const result = Fixed.ZERO.sqrt();
      expect(result.toFloat()).toBe(0);
    });

    it('sqrt of one', () => {
      const result = Fixed.ONE.sqrt();
      expect(Math.abs(result.toFloat() - 1.0)).toBeLessThan(0.01);
    });

    it('throws on negative', () => {
      const a = Fixed.fromFloat(-4.0);
      expect(() => a.sqrt()).toThrow('Fixed-point sqrt of negative');
    });

    it('sqrt of small fraction', () => {
      const a = Fixed.fromFloat(0.25);
      const result = a.sqrt();
      expect(Math.abs(result.toFloat() - 0.5)).toBeLessThan(0.01);
    });
  });

  describe('Comparison Operators', () => {
    it('lt compares less than', () => {
      const a = Fixed.fromFloat(2.0);
      const b = Fixed.fromFloat(3.0);
      expect(a.lt(b)).toBe(true);
      expect(b.lt(a)).toBe(false);
      expect(a.lt(a)).toBe(false);
    });

    it('lte compares less than or equal', () => {
      const a = Fixed.fromFloat(2.0);
      const b = Fixed.fromFloat(3.0);
      expect(a.lte(b)).toBe(true);
      expect(b.lte(a)).toBe(false);
      expect(a.lte(a)).toBe(true);
    });

    it('gt compares greater than', () => {
      const a = Fixed.fromFloat(3.0);
      const b = Fixed.fromFloat(2.0);
      expect(a.gt(b)).toBe(true);
      expect(b.gt(a)).toBe(false);
      expect(a.gt(a)).toBe(false);
    });

    it('gte compares greater than or equal', () => {
      const a = Fixed.fromFloat(3.0);
      const b = Fixed.fromFloat(2.0);
      expect(a.gte(b)).toBe(true);
      expect(b.gte(a)).toBe(false);
      expect(a.gte(a)).toBe(true);
    });

    it('eq compares equality', () => {
      const a = Fixed.fromFloat(2.5);
      const b = Fixed.fromFloat(2.5);
      const c = Fixed.fromFloat(3.5);
      expect(a.eq(b)).toBe(true);
      expect(a.eq(c)).toBe(false);
    });
  });

  describe('Min and Max', () => {
    it('min returns smaller value', () => {
      const a = Fixed.fromFloat(2.5);
      const b = Fixed.fromFloat(3.5);
      expect(a.min(b).raw).toBe(a.raw);
      expect(b.min(a).raw).toBe(a.raw);
    });

    it('max returns larger value', () => {
      const a = Fixed.fromFloat(2.5);
      const b = Fixed.fromFloat(3.5);
      expect(a.max(b).raw).toBe(b.raw);
      expect(b.max(a).raw).toBe(b.raw);
    });

    it('min with equal values', () => {
      const a = Fixed.fromFloat(2.5);
      const b = Fixed.fromFloat(2.5);
      expect(a.min(b).raw).toBe(a.raw);
    });

    it('max with equal values', () => {
      const a = Fixed.fromFloat(2.5);
      const b = Fixed.fromFloat(2.5);
      expect(a.max(b).raw).toBe(a.raw);
    });
  });

  describe('Trigonometric Functions', () => {
    it('sin at key angles', () => {
      // sin(0) = 0
      // Angle is raw fixed-point where angle.raw >> 8 gives table index (0-255)
      // So for table index 0, we need raw value 0 << 8 = 0
      const sin0 = Fixed.sin(Fixed.fromRaw(0));
      expect(Math.abs(sin0.toFloat())).toBeLessThan(0.01);

      // sin(PI/2) ≈ 1 (at 64/256 of full rotation)
      // Table index 64, so raw = 64 << 8 = 16384
      const sinPiOver2 = Fixed.sin(Fixed.fromRaw(64 << 8));
      expect(Math.abs(sinPiOver2.toFloat() - 1.0)).toBeLessThan(0.01);

      // sin(PI) ≈ 0 (at 128/256 of full rotation)
      // Table index 128, so raw = 128 << 8 = 32768
      const sinPi = Fixed.sin(Fixed.fromRaw(128 << 8));
      expect(Math.abs(sinPi.toFloat())).toBeLessThan(0.01);
    });

    it('cos at key angles', () => {
      // cos(0) = 1
      const cos0 = Fixed.cos(Fixed.fromRaw(0));
      expect(Math.abs(cos0.toFloat() - 1.0)).toBeLessThan(0.01);

      // cos(PI/2) ≈ 0 (at 64/256 of full rotation)
      const cosPiOver2 = Fixed.cos(Fixed.fromRaw(64 << 8));
      expect(Math.abs(cosPiOver2.toFloat())).toBeLessThan(0.01);

      // cos(PI) ≈ -1 (at 128/256 of full rotation)
      const cosPi = Fixed.cos(Fixed.fromRaw(128 << 8));
      expect(Math.abs(cosPi.toFloat() - (-1.0))).toBeLessThan(0.01);
    });

    it('sin and cos satisfy Pythagorean identity', () => {
      for (let tableIndex = 0; tableIndex < 256; tableIndex += 32) {
        const angle = Fixed.fromRaw(tableIndex << 8);
        const s = Fixed.sin(angle);
        const c = Fixed.cos(angle);
        const sum = s.mul(s).add(c.mul(c));
        expect(Math.abs(sum.toFloat() - 1.0)).toBeLessThan(0.05);
      }
    });
  });

  describe('Determinism', () => {
    it('same operations produce same raw values', () => {
      const a1 = Fixed.fromFloat(3.5);
      const b1 = Fixed.fromFloat(2.5);
      const result1 = a1.add(b1).mul(Fixed.fromFloat(1.5));

      const a2 = Fixed.fromFloat(3.5);
      const b2 = Fixed.fromFloat(2.5);
      const result2 = a2.add(b2).mul(Fixed.fromFloat(1.5));

      expect(result1.raw).toBe(result2.raw);
    });
  });
});

describe('FixedVec2', () => {
  describe('Construction', () => {
    it('constructs from Fixed values', () => {
      const x = Fixed.fromFloat(3.0);
      const y = Fixed.fromFloat(4.0);
      const vec = new FixedVec2(x, y);
      expect(vec.x.raw).toBe(x.raw);
      expect(vec.y.raw).toBe(y.raw);
    });

    it('fromFloats constructs from numbers', () => {
      const vec = FixedVec2.fromFloats(3.0, 4.0);
      expect(Math.abs(vec.x.toFloat() - 3.0)).toBeLessThan(0.0001);
      expect(Math.abs(vec.y.toFloat() - 4.0)).toBeLessThan(0.0001);
    });

    it('ZERO constant', () => {
      expect(FixedVec2.ZERO.x.toFloat()).toBe(0);
      expect(FixedVec2.ZERO.y.toFloat()).toBe(0);
    });
  });

  describe('Addition', () => {
    it('adds vectors', () => {
      const a = FixedVec2.fromFloats(1.0, 2.0);
      const b = FixedVec2.fromFloats(3.0, 4.0);
      const result = a.add(b);
      expect(Math.abs(result.x.toFloat() - 4.0)).toBeLessThan(0.0001);
      expect(Math.abs(result.y.toFloat() - 6.0)).toBeLessThan(0.0001);
    });

    it('adds with zero vector', () => {
      const a = FixedVec2.fromFloats(3.0, 4.0);
      const result = a.add(FixedVec2.ZERO);
      expect(Math.abs(result.x.toFloat() - 3.0)).toBeLessThan(0.0001);
      expect(Math.abs(result.y.toFloat() - 4.0)).toBeLessThan(0.0001);
    });

    it('is commutative', () => {
      const a = FixedVec2.fromFloats(1.0, 2.0);
      const b = FixedVec2.fromFloats(3.0, 4.0);
      const result1 = a.add(b);
      const result2 = b.add(a);
      expect(result1.x.raw).toBe(result2.x.raw);
      expect(result1.y.raw).toBe(result2.y.raw);
    });
  });

  describe('Subtraction', () => {
    it('subtracts vectors', () => {
      const a = FixedVec2.fromFloats(5.0, 7.0);
      const b = FixedVec2.fromFloats(2.0, 3.0);
      const result = a.sub(b);
      expect(Math.abs(result.x.toFloat() - 3.0)).toBeLessThan(0.0001);
      expect(Math.abs(result.y.toFloat() - 4.0)).toBeLessThan(0.0001);
    });

    it('subtracts zero vector', () => {
      const a = FixedVec2.fromFloats(3.0, 4.0);
      const result = a.sub(FixedVec2.ZERO);
      expect(Math.abs(result.x.toFloat() - 3.0)).toBeLessThan(0.0001);
      expect(Math.abs(result.y.toFloat() - 4.0)).toBeLessThan(0.0001);
    });
  });

  describe('Scaling', () => {
    it('scales vector', () => {
      const v = FixedVec2.fromFloats(3.0, 4.0);
      const result = v.scale(Fixed.fromFloat(2.0));
      expect(Math.abs(result.x.toFloat() - 6.0)).toBeLessThan(0.0001);
      expect(Math.abs(result.y.toFloat() - 8.0)).toBeLessThan(0.0001);
    });

    it('scales by zero', () => {
      const v = FixedVec2.fromFloats(3.0, 4.0);
      const result = v.scale(Fixed.ZERO);
      expect(result.x.toFloat()).toBe(0);
      expect(result.y.toFloat()).toBe(0);
    });

    it('scales by one', () => {
      const v = FixedVec2.fromFloats(3.0, 4.0);
      const result = v.scale(Fixed.ONE);
      expect(Math.abs(result.x.toFloat() - 3.0)).toBeLessThan(0.0001);
      expect(Math.abs(result.y.toFloat() - 4.0)).toBeLessThan(0.0001);
    });
  });

  describe('Length', () => {
    it('calculates length of 3-4-5 triangle', () => {
      const v = FixedVec2.fromFloats(3.0, 4.0);
      const len = v.length();
      expect(Math.abs(len.toFloat() - 5.0)).toBeLessThan(0.01);
    });

    it('calculates length of zero vector', () => {
      const len = FixedVec2.ZERO.length();
      expect(len.toFloat()).toBe(0);
    });

    it('calculates length of unit vector', () => {
      const v = FixedVec2.fromFloats(1.0, 0.0);
      const len = v.length();
      expect(Math.abs(len.toFloat() - 1.0)).toBeLessThan(0.01);
    });

    it('lengthSquared avoids sqrt', () => {
      const v = FixedVec2.fromFloats(3.0, 4.0);
      const lenSq = v.lengthSquared();
      expect(Math.abs(lenSq.toFloat() - 25.0)).toBeLessThan(0.01);
    });
  });

  describe('Normalization', () => {
    it('normalizes to unit length', () => {
      const v = FixedVec2.fromFloats(3.0, 4.0);
      const normalized = v.normalize();
      const len = normalized.length();
      expect(Math.abs(len.toFloat() - 1.0)).toBeLessThan(0.01);
    });

    it('normalizes preserves direction', () => {
      const v = FixedVec2.fromFloats(3.0, 4.0);
      const normalized = v.normalize();
      const ratio = normalized.y.toFloat() / normalized.x.toFloat();
      const originalRatio = 4.0 / 3.0;
      expect(Math.abs(ratio - originalRatio)).toBeLessThan(0.01);
    });

    it('normalizes zero vector returns zero', () => {
      const normalized = FixedVec2.ZERO.normalize();
      expect(normalized.x.toFloat()).toBe(0);
      expect(normalized.y.toFloat()).toBe(0);
    });

    it('normalizes already-normalized vector', () => {
      const v = FixedVec2.fromFloats(1.0, 0.0);
      const normalized = v.normalize();
      expect(Math.abs(normalized.x.toFloat() - 1.0)).toBeLessThan(0.01);
      expect(Math.abs(normalized.y.toFloat())).toBeLessThan(0.01);
    });
  });

  describe('Distance', () => {
    it('calculates distance between points', () => {
      const a = FixedVec2.fromFloats(0.0, 0.0);
      const b = FixedVec2.fromFloats(3.0, 4.0);
      const dist = a.distanceTo(b);
      expect(Math.abs(dist.toFloat() - 5.0)).toBeLessThan(0.01);
    });

    it('calculates distance is symmetric', () => {
      const a = FixedVec2.fromFloats(1.0, 2.0);
      const b = FixedVec2.fromFloats(4.0, 6.0);
      const dist1 = a.distanceTo(b);
      const dist2 = b.distanceTo(a);
      expect(dist1.raw).toBe(dist2.raw);
    });

    it('distance to self is zero', () => {
      const v = FixedVec2.fromFloats(3.0, 4.0);
      const dist = v.distanceTo(v);
      expect(Math.abs(dist.toFloat())).toBeLessThan(0.01);
    });

    it('distanceSquaredTo avoids sqrt', () => {
      const a = FixedVec2.fromFloats(0.0, 0.0);
      const b = FixedVec2.fromFloats(3.0, 4.0);
      const distSq = a.distanceSquaredTo(b);
      expect(Math.abs(distSq.toFloat() - 25.0)).toBeLessThan(0.01);
    });
  });

  describe('Dot Product', () => {
    it('calculates dot product', () => {
      const a = FixedVec2.fromFloats(2.0, 3.0);
      const b = FixedVec2.fromFloats(4.0, 5.0);
      const result = a.dot(b);
      // 2*4 + 3*5 = 8 + 15 = 23
      expect(Math.abs(result.toFloat() - 23.0)).toBeLessThan(0.01);
    });

    it('dot product with zero vector', () => {
      const a = FixedVec2.fromFloats(3.0, 4.0);
      const result = a.dot(FixedVec2.ZERO);
      expect(result.toFloat()).toBe(0);
    });

    it('dot product is commutative', () => {
      const a = FixedVec2.fromFloats(2.0, 3.0);
      const b = FixedVec2.fromFloats(4.0, 5.0);
      expect(a.dot(b).raw).toBe(b.dot(a).raw);
    });

    it('dot product of perpendicular vectors', () => {
      const a = FixedVec2.fromFloats(1.0, 0.0);
      const b = FixedVec2.fromFloats(0.0, 1.0);
      const result = a.dot(b);
      expect(Math.abs(result.toFloat())).toBeLessThan(0.01);
    });

    it('dot product of parallel vectors', () => {
      const a = FixedVec2.fromFloats(2.0, 0.0);
      const b = FixedVec2.fromFloats(3.0, 0.0);
      const result = a.dot(b);
      expect(Math.abs(result.toFloat() - 6.0)).toBeLessThan(0.01);
    });
  });

  describe('Determinism', () => {
    it('same operations produce same results', () => {
      const a1 = FixedVec2.fromFloats(3.0, 4.0);
      const b1 = FixedVec2.fromFloats(1.0, 2.0);
      const result1 = a1.add(b1).scale(Fixed.fromFloat(2.0));

      const a2 = FixedVec2.fromFloats(3.0, 4.0);
      const b2 = FixedVec2.fromFloats(1.0, 2.0);
      const result2 = a2.add(b2).scale(Fixed.fromFloat(2.0));

      expect(result1.x.raw).toBe(result2.x.raw);
      expect(result1.y.raw).toBe(result2.y.raw);
    });
  });
});
