/**
 * Tests for VisibilityUtils
 *
 * Covers:
 * - N-dimensional squared distance
 * - Horizon distance calculation
 * - Underground/surface isolation
 * - Combined visibility checks
 */

import { describe, it, expect } from 'vitest';
import {
  distanceSquaredND,
  distanceSquaredWraparound,
  calculateHorizonDistance,
  getEffectiveRange,
  canPotentiallySee,
  getCoordinates,
  filterByIsolationLayer,
  isVisible,
} from '../VisibilityUtils.js';
import { STANDARD_3D_CONFIG, FLAT_2D_CONFIG } from '../../config/UniversePhysicsConfig.js';

describe('VisibilityUtils', () => {
  // ==========================================================================
  // distanceSquaredND
  // ==========================================================================

  describe('distanceSquaredND', () => {
    it('should calculate squared distance in 2D', () => {
      // 3-4-5 triangle
      expect(distanceSquaredND([0, 0], [3, 4])).toBe(25);
    });

    it('should calculate squared distance in 3D', () => {
      // sqrt(9 + 16 + 25) = sqrt(50) ≈ 7.07
      expect(distanceSquaredND([0, 0, 0], [3, 4, 5])).toBe(50);
    });

    it('should calculate squared distance in 6D', () => {
      expect(distanceSquaredND([0, 0, 0, 0, 0, 0], [1, 1, 1, 1, 1, 1])).toBe(6);
    });

    it('should handle negative coordinates', () => {
      expect(distanceSquaredND([-3, -4], [0, 0])).toBe(25);
    });

    it('should return 0 for same point', () => {
      expect(distanceSquaredND([10, 20, 30], [10, 20, 30])).toBe(0);
    });

    it('should throw on dimension mismatch', () => {
      expect(() => distanceSquaredND([1, 2], [1, 2, 3])).toThrow('mismatch');
    });

    it('should handle 1D distance', () => {
      expect(distanceSquaredND([5], [10])).toBe(25);
    });
  });

  // ==========================================================================
  // distanceSquaredWraparound (closed/toroidal dimensions)
  // ==========================================================================

  describe('distanceSquaredWraparound', () => {
    it('should behave like flat distance when circumference is Infinity', () => {
      expect(distanceSquaredWraparound([0, 0], [3, 4], [Infinity, Infinity])).toBe(25);
    });

    it('should wrap around in closed dimension', () => {
      // In dimension with circumference 100:
      // Points at 5 and 95 are 10 apart (wrapping), not 90
      expect(distanceSquaredWraparound([5], [95], [100])).toBe(100); // 10^2
    });

    it('should not wrap when distance is less than half circumference', () => {
      // Points at 10 and 40 are 30 apart (no wrap needed)
      expect(distanceSquaredWraparound([10], [40], [100])).toBe(900); // 30^2
    });

    it('should handle mixed flat and closed dimensions', () => {
      // x: flat (Infinity), y: closed (100)
      // x distance: 30 (flat)
      // y distance: 10 (wrapped from 90)
      const result = distanceSquaredWraparound([0, 5], [30, 95], [Infinity, 100]);
      expect(result).toBe(900 + 100); // 30^2 + 10^2 = 1000
    });

    it('should handle 6D with mixed topologies', () => {
      // First 3 dims flat, last 3 closed with circumference 1000
      const a = [0, 0, 0, 0, 0, 0];
      const b = [10, 10, 10, 950, 950, 950];
      const circs = [Infinity, Infinity, Infinity, 1000, 1000, 1000];
      // Flat: 10^2 * 3 = 300
      // Wrapped: 50^2 * 3 = 7500 (950 wraps to 50)
      expect(distanceSquaredWraparound(a, b, circs)).toBe(300 + 7500);
    });

    it('should handle points at exactly half circumference', () => {
      // At exactly half, could go either way - we choose the shorter (equal)
      expect(distanceSquaredWraparound([0], [50], [100])).toBe(2500); // 50^2
    });

    it('should handle negative coordinates with wraparound', () => {
      // -45 to 45 is 90 apart, which wraps to 10 in circumference 100
      expect(distanceSquaredWraparound([-45], [45], [100])).toBe(100); // 10^2
    });

    it('should throw on dimension mismatch', () => {
      expect(() => distanceSquaredWraparound([1, 2], [1, 2, 3], [100, 100])).toThrow('mismatch');
    });

    it('should throw on circumference length mismatch', () => {
      expect(() => distanceSquaredWraparound([1, 2], [3, 4], [100])).toThrow('mismatch');
    });
  });

  // ==========================================================================
  // calculateHorizonDistance (from spec)
  // ==========================================================================

  describe('calculateHorizonDistance', () => {
    it('should return 0 at ground level (h=0)', () => {
      expect(calculateHorizonDistance(0, 10000)).toBe(0);
    });

    it('should return 0 for underground (h<0)', () => {
      expect(calculateHorizonDistance(-5, 10000)).toBe(0);
    });

    it('should return 0 for flat world (infinite radius)', () => {
      expect(calculateHorizonDistance(10, Infinity)).toBe(0);
    });

    it('should calculate horizon for h=5 on planet R=10000', () => {
      // d = sqrt(2 * 10000 * 5 + 5^2) = sqrt(100025) ≈ 316.26
      const result = calculateHorizonDistance(5, 10000);
      expect(result).toBeCloseTo(316.26, 1);
    });

    it('should calculate horizon for h=10 on planet R=10000', () => {
      // d = sqrt(2 * 10000 * 10 + 10^2) = sqrt(200100) ≈ 447.3
      const result = calculateHorizonDistance(10, 10000);
      expect(result).toBeCloseTo(447.3, 1);
    });

    it('should calculate horizon for h=100 on planet R=10000', () => {
      // d = sqrt(2 * 10000 * 100 + 100^2) = sqrt(2010000) ≈ 1417.7
      const result = calculateHorizonDistance(100, 10000);
      expect(result).toBeCloseTo(1417.7, 1);
    });

    it('should calculate horizon for h=1 on planet R=10000', () => {
      // d = sqrt(2 * 10000 * 1 + 1) = sqrt(20001) ≈ 141.4
      const result = calculateHorizonDistance(1, 10000);
      expect(result).toBeCloseTo(141.4, 1);
    });

    it('should work for small planet (R=2000)', () => {
      // d = sqrt(2 * 2000 * 10 + 100) = sqrt(40100) ≈ 200.2
      const result = calculateHorizonDistance(10, 2000);
      expect(result).toBeCloseTo(200.2, 1);
    });

    it('should work for large planet (R=500000)', () => {
      // d = sqrt(2 * 500000 * 10 + 100) = sqrt(10000100) ≈ 3162.3
      const result = calculateHorizonDistance(10, 500000);
      expect(result).toBeCloseTo(3162.3, 1);
    });
  });

  // ==========================================================================
  // getEffectiveRange
  // ==========================================================================

  describe('getEffectiveRange', () => {
    it('should return base range at ground level', () => {
      expect(getEffectiveRange(50, 0, 10000)).toBe(50);
    });

    it('should return base range underground', () => {
      expect(getEffectiveRange(50, -20, 10000)).toBe(50);
    });

    it('should add horizon bonus for flying entities', () => {
      const result = getEffectiveRange(50, 100, 10000);
      // base 50 + horizon ~1417.7 = ~1467.7
      expect(result).toBeCloseTo(1467.7, 1);
    });

    it('should not add bonus on flat world', () => {
      expect(getEffectiveRange(50, 100, Infinity)).toBe(50);
    });
  });

  // ==========================================================================
  // canPotentiallySee (underground isolation)
  // ==========================================================================

  describe('canPotentiallySee', () => {
    it('should allow surface-to-surface visibility', () => {
      expect(canPotentiallySee(0, 0)).toBe(true);
      expect(canPotentiallySee(5, 10)).toBe(true);
      expect(canPotentiallySee(100, 0)).toBe(true);
    });

    it('should allow underground-to-underground visibility', () => {
      expect(canPotentiallySee(-1, -5)).toBe(true);
      expect(canPotentiallySee(-100, -1)).toBe(true);
    });

    it('should block surface-to-underground visibility', () => {
      expect(canPotentiallySee(0, -1)).toBe(false);
      expect(canPotentiallySee(5, -10)).toBe(false);
    });

    it('should block underground-to-surface visibility', () => {
      expect(canPotentiallySee(-1, 0)).toBe(false);
      expect(canPotentiallySee(-10, 5)).toBe(false);
    });

    it('should treat z=0 as surface', () => {
      expect(canPotentiallySee(0, 5)).toBe(true);
      expect(canPotentiallySee(0, -1)).toBe(false);
    });
  });

  // ==========================================================================
  // getCoordinates
  // ==========================================================================

  describe('getCoordinates', () => {
    it('should extract 2D coordinates', () => {
      expect(getCoordinates({ x: 10, y: 20 }, 2)).toEqual([10, 20]);
    });

    it('should extract 3D coordinates', () => {
      expect(getCoordinates({ x: 10, y: 20, z: 30 }, 3)).toEqual([10, 20, 30]);
    });

    it('should extract 6D coordinates', () => {
      expect(getCoordinates({ x: 1, y: 2, z: 3, w: 4, v: 5, u: 6 }, 6))
        .toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should default missing z to 0', () => {
      expect(getCoordinates({ x: 10, y: 20 }, 3)).toEqual([10, 20, 0]);
    });

    it('should default missing higher dimensions to 0', () => {
      expect(getCoordinates({ x: 1, y: 2, z: 3 }, 6)).toEqual([1, 2, 3, 0, 0, 0]);
    });

    it('should extract only 1D when requested', () => {
      expect(getCoordinates({ x: 10, y: 20, z: 30 }, 1)).toEqual([10]);
    });

    it('should throw for invalid dimension count', () => {
      expect(() => getCoordinates({ x: 1, y: 2 }, 0)).toThrow('Invalid dimensions');
      expect(() => getCoordinates({ x: 1, y: 2 }, 7)).toThrow('Invalid dimensions');
    });
  });

  // ==========================================================================
  // filterByIsolationLayer
  // ==========================================================================

  describe('filterByIsolationLayer', () => {
    const entities = [
      { id: 'surface1', z: 0 },
      { id: 'surface2', z: 10 },
      { id: 'underground1', z: -5 },
      { id: 'underground2', z: -20 },
      { id: 'noZ', z: undefined },
    ];

    it('should return surface entities for surface observer', () => {
      const result = filterByIsolationLayer(entities, 5, (e) => e.z);
      expect(result.map((e) => e.id)).toEqual(['surface1', 'surface2', 'noZ']);
    });

    it('should return underground entities for underground observer', () => {
      const result = filterByIsolationLayer(entities, -10, (e) => e.z);
      expect(result.map((e) => e.id)).toEqual(['underground1', 'underground2', 'noZ']);
    });

    it('should include entities without z coordinate', () => {
      const result = filterByIsolationLayer(entities, 5, (e) => e.z);
      expect(result.some((e) => e.id === 'noZ')).toBe(true);
    });
  });

  // ==========================================================================
  // isVisible (combined check)
  // ==========================================================================

  describe('isVisible', () => {
    it('should see nearby surface entity from surface', () => {
      const observer = { x: 0, y: 0, z: 0 };
      const target = { x: 5, y: 5, z: 0 };
      expect(isVisible(observer, target, 15, STANDARD_3D_CONFIG)).toBe(true);
    });

    it('should not see surface entity from underground', () => {
      const observer = { x: 0, y: 0, z: -10 };
      const target = { x: 0, y: 0, z: 0 };
      expect(isVisible(observer, target, 100, STANDARD_3D_CONFIG)).toBe(false);
    });

    it('should not see underground entity from surface', () => {
      const observer = { x: 0, y: 0, z: 0 };
      const target = { x: 0, y: 0, z: -10 };
      expect(isVisible(observer, target, 100, STANDARD_3D_CONFIG)).toBe(false);
    });

    it('should see other underground entity from underground', () => {
      const observer = { x: 0, y: 0, z: -10 };
      const target = { x: 5, y: 5, z: -15 };
      expect(isVisible(observer, target, 20, STANDARD_3D_CONFIG)).toBe(true);
    });

    it('should extend range for flying observer', () => {
      const observer = { x: 0, y: 0, z: 100 };
      const target = { x: 500, y: 500, z: 0 };
      // distance ~707, base range 50, but horizon bonus ~1417
      expect(isVisible(observer, target, 50, STANDARD_3D_CONFIG)).toBe(true);
    });

    it('should not extend range for ground observer', () => {
      const observer = { x: 0, y: 0, z: 0 };
      const target = { x: 500, y: 500, z: 0 };
      // distance ~707, base range 50, no horizon bonus
      expect(isVisible(observer, target, 50, STANDARD_3D_CONFIG)).toBe(false);
    });

    it('should not see beyond range even with horizon bonus', () => {
      const observer = { x: 0, y: 0, z: 10 };
      const target = { x: 1000, y: 1000, z: 0 };
      // distance ~1414, horizon bonus ~447, total range ~497
      expect(isVisible(observer, target, 50, STANDARD_3D_CONFIG)).toBe(false);
    });

    it('should work in 2D flat world', () => {
      const observer = { x: 0, y: 0 };
      const target = { x: 10, y: 10 };
      // distance ~14.1, range 15
      expect(isVisible(observer, target, 15, FLAT_2D_CONFIG)).toBe(true);
    });

    it('should use only x,y in 2D world', () => {
      const observer = { x: 0, y: 0, z: 100 };
      const target = { x: 10, y: 10, z: 0 };
      // In 2D, z is ignored for distance (and no isolation)
      expect(isVisible(observer, target, 15, FLAT_2D_CONFIG)).toBe(true);
    });

    it('should consider all dimensions in higher-D worlds', () => {
      const config = {
        spatialDimensions: 6,
        planetRadius: 10000,
        undergroundIsolation: true,
        defaultVisibilityRange: [15, 15, 10, 10, 10, 10],
      };
      const observer = { x: 0, y: 0, z: 0, w: 0, v: 0, u: 0 };
      const target = { x: 5, y: 5, z: 5, w: 5, v: 5, u: 5 };
      // 6D distance = sqrt(6 * 25) = sqrt(150) ≈ 12.2
      expect(isVisible(observer, target, 15, config)).toBe(true);
    });

    it('should use wraparound distance when circumferences provided', () => {
      const config = {
        spatialDimensions: 2,
        planetRadius: Infinity,
        undergroundIsolation: false,
        defaultVisibilityRange: [15, 15],
        dimensionCircumferences: [100, 100],
      };
      // Points at (5, 5) and (95, 95) are 10 apart in each dim (wrapped)
      // Total distance = sqrt(100 + 100) ≈ 14.1
      const observer = { x: 5, y: 5 };
      const target = { x: 95, y: 95 };
      expect(isVisible(observer, target, 15, config)).toBe(true);
    });

    it('should not see through wraparound when out of range', () => {
      const config = {
        spatialDimensions: 2,
        planetRadius: Infinity,
        undergroundIsolation: false,
        defaultVisibilityRange: [15, 15],
        dimensionCircumferences: [100, 100],
      };
      // Points at (0, 0) and (70, 70) are 30 apart in each dim (wrapped)
      // Total distance = sqrt(900 + 900) ≈ 42.4
      const observer = { x: 0, y: 0 };
      const target = { x: 70, y: 70 };
      expect(isVisible(observer, target, 15, config)).toBe(false);
    });

    it('should handle mixed flat and closed dimensions in visibility', () => {
      const config = {
        spatialDimensions: 4,
        planetRadius: 10000,
        undergroundIsolation: true,
        defaultVisibilityRange: [50, 50, 20, 20],
        dimensionCircumferences: [Infinity, Infinity, Infinity, 1000], // Only w wraps
      };
      // Observer at origin, target at w=950 (wraps to 50 away)
      const observer = { x: 0, y: 0, z: 0, w: 0 };
      const target = { x: 10, y: 10, z: 10, w: 950 };
      // Distance: sqrt(100 + 100 + 100 + 2500) = sqrt(2800) ≈ 52.9
      expect(isVisible(observer, target, 60, config)).toBe(true);
    });
  });
});
