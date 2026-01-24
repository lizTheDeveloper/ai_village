import { describe, it, expect } from 'vitest';
import { DeterministicRandom } from '../DeterministicRandom.js';

describe('DeterministicRandom', () => {
  describe('Determinism', () => {
    it('same seed produces identical sequence', () => {
      const rng1 = new DeterministicRandom(12345);
      const rng2 = new DeterministicRandom(12345);

      const sequence1: number[] = [];
      const sequence2: number[] = [];

      for (let i = 0; i < 100; i++) {
        sequence1.push(rng1.nextRaw());
        sequence2.push(rng2.nextRaw());
      }

      expect(sequence1).toEqual(sequence2);
    });

    it('different seeds produce different sequences', () => {
      const rng1 = new DeterministicRandom(12345);
      const rng2 = new DeterministicRandom(54321);

      const sequence1: number[] = [];
      const sequence2: number[] = [];

      for (let i = 0; i < 100; i++) {
        sequence1.push(rng1.nextRaw());
        sequence2.push(rng2.nextRaw());
      }

      // At least 90% of values should be different
      const differences = sequence1.filter((val, idx) => val !== sequence2[idx]).length;
      expect(differences).toBeGreaterThan(90);
    });

    it('seed zero produces valid sequence', () => {
      const rng = new DeterministicRandom(0);
      const value1 = rng.nextRaw();
      const value2 = rng.nextRaw();

      // Should produce different values
      expect(value1).not.toBe(value2);

      // Values should be within valid range
      expect(value1).toBeGreaterThanOrEqual(0);
      expect(value1).toBeLessThanOrEqual(0xFFFFFFFF);
      expect(value2).toBeGreaterThanOrEqual(0);
      expect(value2).toBeLessThanOrEqual(0xFFFFFFFF);
    });

    it('large seed values work correctly', () => {
      const rng = new DeterministicRandom(0xFFFFFFFF);
      const value1 = rng.nextRaw();
      const value2 = rng.nextRaw();

      expect(value1).not.toBe(value2);
      expect(value1).toBeGreaterThanOrEqual(0);
      expect(value2).toBeGreaterThanOrEqual(0);
    });

    it('negative seed produces valid sequence', () => {
      const rng = new DeterministicRandom(-12345);
      const value1 = rng.nextRaw();
      const value2 = rng.nextRaw();

      expect(value1).not.toBe(value2);
      expect(value1).toBeGreaterThanOrEqual(0);
      expect(value2).toBeGreaterThanOrEqual(0);
    });
  });

  describe('nextRaw', () => {
    it('returns values in valid range', () => {
      const rng = new DeterministicRandom(12345);

      for (let i = 0; i < 1000; i++) {
        const value = rng.nextRaw();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(0xFFFFFFFF);
      }
    });

    it('produces varied output', () => {
      const rng = new DeterministicRandom(12345);
      const values = new Set<number>();

      for (let i = 0; i < 1000; i++) {
        values.add(rng.nextRaw());
      }

      // Should have mostly unique values (at least 95% unique)
      expect(values.size).toBeGreaterThan(950);
    });
  });

  describe('nextFloat', () => {
    it('returns values between 0 and 1', () => {
      const rng = new DeterministicRandom(12345);

      for (let i = 0; i < 1000; i++) {
        const value = rng.nextFloat();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    });

    it('produces varied distribution', () => {
      const rng = new DeterministicRandom(12345);
      let sum = 0;
      const count = 10000;

      for (let i = 0; i < count; i++) {
        sum += rng.nextFloat();
      }

      const average = sum / count;
      // Average should be close to 0.5 with large sample
      expect(Math.abs(average - 0.5)).toBeLessThan(0.05);
    });
  });

  describe('nextFixed', () => {
    it('returns values in valid range', () => {
      const rng = new DeterministicRandom(12345);

      for (let i = 0; i < 1000; i++) {
        const value = rng.nextFixed();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(0xFFFF);
      }
    });

    it('same seed produces same fixed-point sequence', () => {
      const rng1 = new DeterministicRandom(12345);
      const rng2 = new DeterministicRandom(12345);

      for (let i = 0; i < 100; i++) {
        expect(rng1.nextFixed()).toBe(rng2.nextFixed());
      }
    });
  });

  describe('range', () => {
    it('returns values within specified range', () => {
      const rng = new DeterministicRandom(12345);
      const min = 10;
      const max = 20;

      for (let i = 0; i < 1000; i++) {
        const value = rng.range(min, max);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThanOrEqual(max);
      }
    });

    it('handles single-value range', () => {
      const rng = new DeterministicRandom(12345);
      const value = rng.range(5, 5);
      expect(value).toBe(5);
    });

    it('handles negative ranges', () => {
      const rng = new DeterministicRandom(12345);

      for (let i = 0; i < 100; i++) {
        const value = rng.range(-10, -5);
        expect(value).toBeGreaterThanOrEqual(-10);
        expect(value).toBeLessThanOrEqual(-5);
      }
    });

    it('handles large ranges', () => {
      const rng = new DeterministicRandom(12345);
      const min = 0;
      const max = 1000000;

      for (let i = 0; i < 100; i++) {
        const value = rng.range(min, max);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThanOrEqual(max);
      }
    });

    it('produces all values in small range eventually', () => {
      const rng = new DeterministicRandom(12345);
      const min = 0;
      const max = 5;
      const seen = new Set<number>();

      for (let i = 0; i < 1000 && seen.size < 6; i++) {
        seen.add(rng.range(min, max));
      }

      // Should see all values 0-5
      expect(seen.size).toBe(6);
    });

    it('is deterministic with same seed', () => {
      const rng1 = new DeterministicRandom(12345);
      const rng2 = new DeterministicRandom(12345);

      for (let i = 0; i < 100; i++) {
        expect(rng1.range(1, 100)).toBe(rng2.range(1, 100));
      }
    });
  });

  describe('chance', () => {
    it('always true for probability 1.0', () => {
      const rng = new DeterministicRandom(12345);

      for (let i = 0; i < 100; i++) {
        expect(rng.chance(1.0)).toBe(true);
      }
    });

    it('always false for probability 0.0', () => {
      const rng = new DeterministicRandom(12345);

      for (let i = 0; i < 100; i++) {
        expect(rng.chance(0.0)).toBe(false);
      }
    });

    it('approximate probability for 0.5', () => {
      const rng = new DeterministicRandom(12345);
      let trueCount = 0;
      const trials = 10000;

      for (let i = 0; i < trials; i++) {
        if (rng.chance(0.5)) trueCount++;
      }

      const ratio = trueCount / trials;
      expect(Math.abs(ratio - 0.5)).toBeLessThan(0.05);
    });

    it('approximate probability for 0.25', () => {
      const rng = new DeterministicRandom(12345);
      let trueCount = 0;
      const trials = 10000;

      for (let i = 0; i < trials; i++) {
        if (rng.chance(0.25)) trueCount++;
      }

      const ratio = trueCount / trials;
      expect(Math.abs(ratio - 0.25)).toBeLessThan(0.05);
    });
  });

  describe('pick', () => {
    it('picks elements from array', () => {
      const rng = new DeterministicRandom(12345);
      const array = [1, 2, 3, 4, 5];

      for (let i = 0; i < 100; i++) {
        const picked = rng.pick(array);
        expect(array).toContain(picked);
      }
    });

    it('picks all elements eventually from small array', () => {
      const rng = new DeterministicRandom(12345);
      const array = [1, 2, 3, 4, 5];
      const picked = new Set<number>();

      for (let i = 0; i < 100; i++) {
        picked.add(rng.pick(array));
      }

      expect(picked.size).toBe(5);
    });

    it('is deterministic with same seed', () => {
      const rng1 = new DeterministicRandom(12345);
      const rng2 = new DeterministicRandom(12345);
      const array = ['a', 'b', 'c', 'd', 'e'];

      for (let i = 0; i < 100; i++) {
        expect(rng1.pick(array)).toBe(rng2.pick(array));
      }
    });

    it('works with single-element array', () => {
      const rng = new DeterministicRandom(12345);
      const array = [42];
      expect(rng.pick(array)).toBe(42);
    });
  });

  describe('shuffle', () => {
    it('shuffles array in-place', () => {
      const rng = new DeterministicRandom(12345);
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const original = [...array];

      rng.shuffle(array);

      // Array should be modified
      expect(array).not.toEqual(original);

      // But should contain same elements
      expect(array.sort()).toEqual(original.sort());
    });

    it('is deterministic with same seed', () => {
      const rng1 = new DeterministicRandom(12345);
      const rng2 = new DeterministicRandom(12345);

      const array1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const array2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      rng1.shuffle(array1);
      rng2.shuffle(array2);

      expect(array1).toEqual(array2);
    });

    it('handles empty array', () => {
      const rng = new DeterministicRandom(12345);
      const array: number[] = [];
      expect(() => rng.shuffle(array)).not.toThrow();
      expect(array).toEqual([]);
    });

    it('handles single element', () => {
      const rng = new DeterministicRandom(12345);
      const array = [42];
      rng.shuffle(array);
      expect(array).toEqual([42]);
    });

    it('produces varied shuffles with different seeds', () => {
      const array1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const array2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const rng1 = new DeterministicRandom(12345);
      const rng2 = new DeterministicRandom(54321);

      rng1.shuffle(array1);
      rng2.shuffle(array2);

      // Arrays should be different (highly unlikely to be the same)
      expect(array1).not.toEqual(array2);
    });
  });

  describe('getState / setState', () => {
    it('round-trip preserves state', () => {
      const rng = new DeterministicRandom(12345);

      // Generate some values to advance state
      for (let i = 0; i < 10; i++) {
        rng.nextRaw();
      }

      const state = rng.getState();
      const nextValues: number[] = [];

      // Generate more values
      for (let i = 0; i < 5; i++) {
        nextValues.push(rng.nextRaw());
      }

      // Restore state
      rng.setState(state);

      // Should generate same values again
      for (let i = 0; i < 5; i++) {
        expect(rng.nextRaw()).toBe(nextValues[i]);
      }
    });

    it('state can be serialized and deserialized', () => {
      const rng1 = new DeterministicRandom(12345);

      // Advance state
      for (let i = 0; i < 10; i++) {
        rng1.nextRaw();
      }

      // Save and serialize state
      const state = rng1.getState();
      const serialized = JSON.stringify(state);
      const deserialized = JSON.parse(serialized);

      // Create new RNG and restore state
      const rng2 = new DeterministicRandom(0); // Different seed
      rng2.setState(deserialized);

      // Should produce same sequence
      for (let i = 0; i < 100; i++) {
        expect(rng2.nextRaw()).toBe(rng1.nextRaw());
      }
    });

    it('setState works with fresh RNG', () => {
      const rng1 = new DeterministicRandom(12345);
      const rng2 = new DeterministicRandom(54321);

      // Advance first RNG
      for (let i = 0; i < 10; i++) {
        rng1.nextRaw();
      }

      // Copy state to second RNG
      rng2.setState(rng1.getState());

      // Should generate same values
      for (let i = 0; i < 100; i++) {
        expect(rng2.nextRaw()).toBe(rng1.nextRaw());
      }
    });
  });

  describe('derive', () => {
    it('creates deterministic sub-RNG', () => {
      const rng1 = new DeterministicRandom(12345);
      const rng2 = new DeterministicRandom(12345);

      const derived1 = rng1.derive(100);
      const derived2 = rng2.derive(100);

      // Derived RNGs should produce same sequence
      for (let i = 0; i < 100; i++) {
        expect(derived1.nextRaw()).toBe(derived2.nextRaw());
      }
    });

    it('different keys produce different sub-RNGs', () => {
      const rng = new DeterministicRandom(12345);

      const derived1 = rng.derive(100);
      const derived2 = rng.derive(200);

      const sequence1: number[] = [];
      const sequence2: number[] = [];

      for (let i = 0; i < 100; i++) {
        sequence1.push(derived1.nextRaw());
        sequence2.push(derived2.nextRaw());
      }

      // Should be mostly different
      const differences = sequence1.filter((val, idx) => val !== sequence2[idx]).length;
      expect(differences).toBeGreaterThan(90);
    });

    it('derived RNG usage does not affect parent beyond derive call', () => {
      const rng = new DeterministicRandom(12345);

      // Get state before derive
      const stateBefore = rng.getState();

      // Create derived RNG (this consumes one value from parent)
      const derived = rng.derive(100);

      // Use derived RNG extensively
      for (let i = 0; i < 100; i++) {
        derived.nextRaw();
      }

      // Parent's state should have only advanced by the derive() call
      // Verify by comparing with fresh RNG
      const rng2 = new DeterministicRandom(12345);
      rng2.setState(stateBefore);
      rng2.derive(100); // Advance by one derive call

      // Both should now be in same state
      expect(rng.nextRaw()).toBe(rng2.nextRaw());
    });

    it('same parent state and key produces same derived RNG', () => {
      const rng1 = new DeterministicRandom(12345);
      const rng2 = new DeterministicRandom(12345);

      // Advance both to same state
      for (let i = 0; i < 5; i++) {
        rng1.nextRaw();
        rng2.nextRaw();
      }

      const derived1 = rng1.derive(100);
      const derived2 = rng2.derive(100);

      // Should produce identical sequences
      for (let i = 0; i < 100; i++) {
        expect(derived1.nextRaw()).toBe(derived2.nextRaw());
      }
    });

    it('derive with key 0 works correctly', () => {
      const rng = new DeterministicRandom(12345);
      const derived = rng.derive(0);

      const value1 = derived.nextRaw();
      const value2 = derived.nextRaw();

      expect(value1).not.toBe(value2);
      expect(value1).toBeGreaterThanOrEqual(0);
      expect(value2).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Statistical Properties', () => {
    it('uniform distribution for nextRaw', () => {
      const rng = new DeterministicRandom(12345);
      const buckets = new Array(10).fill(0);
      const samples = 100000;

      for (let i = 0; i < samples; i++) {
        const value = rng.nextRaw();
        const bucket = Math.floor((value / 0xFFFFFFFF) * 10);
        buckets[Math.min(bucket, 9)]++;
      }

      // Each bucket should have roughly 10% of samples (within 2%)
      const expected = samples / 10;
      for (const count of buckets) {
        const ratio = count / expected;
        expect(Math.abs(ratio - 1.0)).toBeLessThan(0.2);
      }
    });

    it('no obvious patterns in sequence', () => {
      const rng = new DeterministicRandom(12345);
      const values: number[] = [];

      for (let i = 0; i < 100; i++) {
        values.push(rng.nextRaw());
      }

      // Check that consecutive values are not correlated
      let increasingRuns = 0;
      for (let i = 1; i < values.length; i++) {
        if (values[i]! > values[i - 1]!) {
          increasingRuns++;
        }
      }

      // Should be roughly 50% increasing
      const ratio = increasingRuns / (values.length - 1);
      expect(Math.abs(ratio - 0.5)).toBeLessThan(0.2);
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid successive calls', () => {
      const rng = new DeterministicRandom(12345);
      const values = new Set<number>();

      for (let i = 0; i < 1000; i++) {
        values.add(rng.nextRaw());
      }

      // Should have mostly unique values
      expect(values.size).toBeGreaterThan(950);
    });

    it('handles very large number of calls', () => {
      const rng = new DeterministicRandom(12345);

      // Should not crash or produce invalid values
      for (let i = 0; i < 100000; i++) {
        const value = rng.nextRaw();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(0xFFFFFFFF);
      }
    });

    it('state transitions are deterministic', () => {
      const rng1 = new DeterministicRandom(12345);
      const rng2 = new DeterministicRandom(12345);

      for (let i = 0; i < 10000; i++) {
        const state1 = rng1.getState();
        const state2 = rng2.getState();

        expect(state1.s0).toBe(state2.s0);
        expect(state1.s1).toBe(state2.s1);

        expect(rng1.nextRaw()).toBe(rng2.nextRaw());
      }
    });
  });
});
