import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Test Suite: Genetic Inheritance Module
 *
 * Covers:
 * - Criterion 6: Seed Genetics Inheritance
 * - Criterion 7: Seed Viability Calculation
 * - Genetic mutation mechanics
 * - Trait value clamping
 */

interface SeedGenetics {
  growthRate: number;
  yield: number;
  diseaseResistance: number;
  droughtTolerance: number;
  coldTolerance: number;
  flavor: number;
}

describe('GeneticInheritance Module', () => {
  let GeneticInheritance: any;

  beforeEach(async () => {
    // Dynamic import - implementation will create this module
    try {
      const module = await import('../genetics/GeneticInheritance');
      GeneticInheritance = module.default || module;
    } catch (error) {
      throw new Error('GeneticInheritance module not found at ../genetics/GeneticInheritance');
    }
  });

  describe('inheritGenetics', () => {
    it('should copy parent genetics without mutation', () => {
      const parentGenetics: SeedGenetics = {
        growthRate: 0.75,
        yield: 0.8,
        diseaseResistance: 0.6,
        droughtTolerance: 0.5,
        coldTolerance: 0.7,
        flavor: 0.65
      };

      // Run multiple times - at least some should be exact copies (no mutation)
      const offspring = Array.from({ length: 50 }, () =>
        GeneticInheritance.inheritGenetics(parentGenetics)
      );

      const exactCopies = offspring.filter(child =>
        child.growthRate === 0.75 &&
        child.yield === 0.8 &&
        child.diseaseResistance === 0.6
      );

      // With 10% mutation chance, we should have some exact copies
      expect(exactCopies.length).toBeGreaterThan(0);
    });

    it('should apply mutations to approximately 10% of traits', () => {
      const parentGenetics: SeedGenetics = {
        growthRate: 0.5,
        yield: 0.5,
        diseaseResistance: 0.5,
        droughtTolerance: 0.5,
        coldTolerance: 0.5,
        flavor: 0.5
      };

      // Generate many offspring
      const offspring = Array.from({ length: 1000 }, () =>
        GeneticInheritance.inheritGenetics(parentGenetics)
      );

      // Count mutations across all traits
      let totalTraits = 0;
      let mutatedTraits = 0;

      offspring.forEach(child => {
        if (child.growthRate !== 0.5) mutatedTraits++;
        if (child.yield !== 0.5) mutatedTraits++;
        if (child.diseaseResistance !== 0.5) mutatedTraits++;
        if (child.droughtTolerance !== 0.5) mutatedTraits++;
        if (child.coldTolerance !== 0.5) mutatedTraits++;
        if (child.flavor !== 0.5) mutatedTraits++;
        totalTraits += 6;
      });

      const mutationRate = mutatedTraits / totalTraits;

      // Should be around 10% ±3%
      expect(mutationRate).toBeGreaterThan(0.07);
      expect(mutationRate).toBeLessThan(0.13);
    });

    it('should modify mutated trait by ±0-20%', () => {
      const parentGenetics: SeedGenetics = {
        growthRate: 0.5,
        yield: 0.5,
        diseaseResistance: 0.5,
        droughtTolerance: 0.5,
        coldTolerance: 0.5,
        flavor: 0.5
      };

      // Generate many offspring to find mutations
      const offspring = Array.from({ length: 200 }, () =>
        GeneticInheritance.inheritGenetics(parentGenetics)
      );

      const mutatedValues = offspring
        .map(o => o.growthRate)
        .filter(v => v !== 0.5);

      // All mutations should be within ±20% of 0.5 (i.e., 0.4 to 0.6)
      mutatedValues.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0.4);
        expect(value).toBeLessThanOrEqual(0.6);
      });

      // Should have both positive and negative mutations
      const hasIncrease = mutatedValues.some(v => v > 0.5);
      const hasDecrease = mutatedValues.some(v => v < 0.5);

      expect(hasIncrease).toBe(true);
      expect(hasDecrease).toBe(true);
    });

    it('should clamp mutated values to [0, 1] range', () => {
      const extremeGenetics: SeedGenetics = {
        growthRate: 0.95,  // Near maximum
        yield: 0.05,       // Near minimum
        diseaseResistance: 1.0,  // At maximum
        droughtTolerance: 0.0,   // At minimum
        coldTolerance: 0.5,
        flavor: 0.5
      };

      // Generate many offspring
      const offspring = Array.from({ length: 200 }, () =>
        GeneticInheritance.inheritGenetics(extremeGenetics)
      );

      // All values must be in [0, 1] even with mutations
      offspring.forEach(child => {
        expect(child.growthRate).toBeGreaterThanOrEqual(0);
        expect(child.growthRate).toBeLessThanOrEqual(1);
        expect(child.yield).toBeGreaterThanOrEqual(0);
        expect(child.yield).toBeLessThanOrEqual(1);
        expect(child.diseaseResistance).toBeGreaterThanOrEqual(0);
        expect(child.diseaseResistance).toBeLessThanOrEqual(1);
        expect(child.droughtTolerance).toBeGreaterThanOrEqual(0);
        expect(child.droughtTolerance).toBeLessThanOrEqual(1);
        expect(child.coldTolerance).toBeGreaterThanOrEqual(0);
        expect(child.coldTolerance).toBeLessThanOrEqual(1);
        expect(child.flavor).toBeGreaterThanOrEqual(0);
        expect(child.flavor).toBeLessThanOrEqual(1);
      });
    });

    it('should return new object, not mutate parent', () => {
      const parentGenetics: SeedGenetics = {
        growthRate: 0.75,
        yield: 0.8,
        diseaseResistance: 0.6,
        droughtTolerance: 0.5,
        coldTolerance: 0.7,
        flavor: 0.65
      };

      const originalCopy = { ...parentGenetics };

      const offspring = GeneticInheritance.inheritGenetics(parentGenetics);

      // Parent should not be modified
      expect(parentGenetics).toEqual(originalCopy);

      // Offspring should be a different object
      expect(offspring).not.toBe(parentGenetics);
    });

    it('should use deterministic seeded RNG for save/load consistency', () => {
      const parentGenetics: SeedGenetics = {
        growthRate: 0.5,
        yield: 0.5,
        diseaseResistance: 0.5,
        droughtTolerance: 0.5,
        coldTolerance: 0.5,
        flavor: 0.5
      };

      const seed = 12345;

      // Generate with same seed twice
      const offspring1 = GeneticInheritance.inheritGenetics(parentGenetics, seed);
      const offspring2 = GeneticInheritance.inheritGenetics(parentGenetics, seed);

      // Should produce identical results
      expect(offspring1).toEqual(offspring2);
    });

    it('should produce different results with different seeds', () => {
      const parentGenetics: SeedGenetics = {
        growthRate: 0.5,
        yield: 0.5,
        diseaseResistance: 0.5,
        droughtTolerance: 0.5,
        coldTolerance: 0.5,
        flavor: 0.5
      };

      // Generate with different seeds
      const results = Array.from({ length: 10 }, (_, i) =>
        GeneticInheritance.inheritGenetics(parentGenetics, i)
      );

      // Not all results should be identical (very low probability)
      const allSame = results.every(r =>
        JSON.stringify(r) === JSON.stringify(results[0])
      );

      expect(allSame).toBe(false);
    });
  });

  describe('crossGenetics', () => {
    it('should blend traits from two parents', () => {
      if (!GeneticInheritance.crossGenetics) {
        // This function is for future hybridization feature
        return;
      }

      const parent1: SeedGenetics = {
        growthRate: 0.8,
        yield: 0.6,
        diseaseResistance: 0.7,
        droughtTolerance: 0.5,
        coldTolerance: 0.4,
        flavor: 0.9
      };

      const parent2: SeedGenetics = {
        growthRate: 0.4,
        yield: 0.9,
        diseaseResistance: 0.5,
        droughtTolerance: 0.8,
        coldTolerance: 0.7,
        flavor: 0.6
      };

      const offspring = GeneticInheritance.crossGenetics(parent1, parent2);

      // Offspring traits should be between or near parent values
      // (allowing for mutations)
      expect(offspring.growthRate).toBeGreaterThanOrEqual(0.3);
      expect(offspring.growthRate).toBeLessThanOrEqual(0.9);
    });
  });

  describe('calculateViability', () => {
    it('should return value between 0 and 1', () => {
      const viability = GeneticInheritance.calculateViability({
        parentHealth: 80,
        careQuality: 0.8,
        ageInDays: 10
      });

      expect(viability).toBeGreaterThanOrEqual(0);
      expect(viability).toBeLessThanOrEqual(1);
    });

    it('should increase viability with higher parent health', () => {
      const lowHealthViability = GeneticInheritance.calculateViability({
        parentHealth: 30,
        careQuality: 1.0,
        ageInDays: 0
      });

      const highHealthViability = GeneticInheritance.calculateViability({
        parentHealth: 100,
        careQuality: 1.0,
        ageInDays: 0
      });

      expect(highHealthViability).toBeGreaterThan(lowHealthViability);
    });

    it('should increase viability with higher care quality', () => {
      const lowCareViability = GeneticInheritance.calculateViability({
        parentHealth: 80,
        careQuality: 0.3,
        ageInDays: 0
      });

      const highCareViability = GeneticInheritance.calculateViability({
        parentHealth: 80,
        careQuality: 1.0,
        ageInDays: 0
      });

      expect(highCareViability).toBeGreaterThan(lowCareViability);
    });

    it('should decrease viability with seed age', () => {
      const freshViability = GeneticInheritance.calculateViability({
        parentHealth: 80,
        careQuality: 1.0,
        ageInDays: 0
      });

      const oldViability = GeneticInheritance.calculateViability({
        parentHealth: 80,
        careQuality: 1.0,
        ageInDays: 365
      });

      expect(oldViability).toBeLessThan(freshViability);
    });

    it('should not go below 0 even with very old seeds', () => {
      const ancientViability = GeneticInheritance.calculateViability({
        parentHealth: 0,
        careQuality: 0,
        ageInDays: 10000
      });

      expect(ancientViability).toBeGreaterThanOrEqual(0);
    });

    it('should not exceed 1 even with perfect conditions', () => {
      const perfectViability = GeneticInheritance.calculateViability({
        parentHealth: 100,
        careQuality: 1.0,
        ageInDays: 0
      });

      expect(perfectViability).toBeLessThanOrEqual(1);
    });

    it('should throw when parentHealth is missing', () => {
      expect(() => {
        GeneticInheritance.calculateViability({
          careQuality: 1.0,
          ageInDays: 0
        });
      }).toThrow(/parentHealth/i);
    });

    it('should throw when careQuality is missing', () => {
      expect(() => {
        GeneticInheritance.calculateViability({
          parentHealth: 80,
          ageInDays: 0
        });
      }).toThrow(/careQuality/i);
    });

    it('should throw when ageInDays is missing', () => {
      expect(() => {
        GeneticInheritance.calculateViability({
          parentHealth: 80,
          careQuality: 1.0
        });
      }).toThrow(/ageInDays/i);
    });
  });

  describe('calculateVigor', () => {
    it('should calculate vigor based on viability and quality', () => {
      if (!GeneticInheritance.calculateVigor) {
        // Optional function
        return;
      }

      const vigor = GeneticInheritance.calculateVigor({
        viability: 0.95,
        quality: 0.9
      });

      expect(vigor).toBeGreaterThan(0);
      expect(vigor).toBeLessThanOrEqual(2); // Reasonable max
    });

    it('should give higher vigor for higher quality seeds', () => {
      if (!GeneticInheritance.calculateVigor) {
        return;
      }

      const lowVigor = GeneticInheritance.calculateVigor({
        viability: 0.6,
        quality: 0.5
      });

      const highVigor = GeneticInheritance.calculateVigor({
        viability: 0.95,
        quality: 0.95
      });

      expect(highVigor).toBeGreaterThan(lowVigor);
    });
  });

  describe('Error Handling (per CLAUDE.md)', () => {
    it('should throw when parent genetics is null or undefined', () => {
      expect(() => {
        GeneticInheritance.inheritGenetics(null);
      }).toThrow();

      expect(() => {
        GeneticInheritance.inheritGenetics(undefined);
      }).toThrow();
    });

    it('should throw when parent genetics is missing required traits', () => {
      const incompleteGenetics = {
        growthRate: 0.5,
        yield: 0.5
        // Missing other traits
      };

      expect(() => {
        GeneticInheritance.inheritGenetics(incompleteGenetics as SeedGenetics);
      }).toThrow();
    });

    it('should throw when parent genetics has invalid trait values', () => {
      const invalidGenetics: SeedGenetics = {
        growthRate: 2.0, // > 1
        yield: 0.5,
        diseaseResistance: 0.5,
        droughtTolerance: 0.5,
        coldTolerance: 0.5,
        flavor: 0.5
      };

      expect(() => {
        GeneticInheritance.inheritGenetics(invalidGenetics);
      }).toThrow();
    });
  });
});
