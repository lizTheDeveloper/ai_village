import { describe, it, expect } from 'vitest';
import {
  generateAnimalGenetics,
  inheritAnimalGenetics,
  type AnimalGenetics,
  type AnimalMutation,
} from '../components/AnimalComponent.js';

const TRAIT_KEYS: (keyof AnimalGenetics)[] = [
  'size', 'strength', 'speed', 'health', 'lifespan',
  'temperament', 'intelligence', 'trainability', 'colorVariant',
];

describe('Animal Breeding Genetics', () => {
  describe('generateAnimalGenetics', () => {
    it('all trait expressions are in [0, 100]', () => {
      // Run many times to check clamping holds under random variance
      for (let i = 0; i < 100; i++) {
        const genetics = generateAnimalGenetics();
        for (const key of TRAIT_KEYS) {
          const trait = genetics[key];
          expect(trait.allele1).toBeGreaterThanOrEqual(0);
          expect(trait.allele1).toBeLessThanOrEqual(100);
          expect(trait.allele2).toBeGreaterThanOrEqual(0);
          expect(trait.allele2).toBeLessThanOrEqual(100);
          expect(trait.expression).toBeGreaterThanOrEqual(0);
          expect(trait.expression).toBeLessThanOrEqual(100);
        }
      }
    });

    it('expression equals average of the two alleles', () => {
      for (let i = 0; i < 50; i++) {
        const genetics = generateAnimalGenetics();
        for (const key of TRAIT_KEYS) {
          const { allele1, allele2, expression } = genetics[key];
          expect(expression).toBeCloseTo((allele1 + allele2) / 2, 10);
        }
      }
    });

    it('allele1 and allele2 differ on average (random variance exists)', () => {
      // With ±20 variance from 50, the chance both alleles land on the exact
      // same float value is astronomically small. Check across many runs.
      let identicalCount = 0;
      const RUNS = 200;
      for (let i = 0; i < RUNS; i++) {
        const genetics = generateAnimalGenetics();
        for (const key of TRAIT_KEYS) {
          if (genetics[key].allele1 === genetics[key].allele2) {
            identicalCount++;
          }
        }
      }
      // Fewer than 1% of allele pairs should be identical
      const totalPairs = RUNS * TRAIT_KEYS.length;
      expect(identicalCount / totalPairs).toBeLessThan(0.01);
    });

    it('produces all required trait keys', () => {
      const genetics = generateAnimalGenetics();
      for (const key of TRAIT_KEYS) {
        expect(genetics).toHaveProperty(key);
      }
    });

    it('works with a deterministic rng', () => {
      // Seed-like: use a counter-based rng
      let seed = 42;
      const deterministicRng = (): number => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };
      const g1 = generateAnimalGenetics(deterministicRng);
      // Reset seed
      seed = 42;
      const g2 = generateAnimalGenetics(deterministicRng);
      for (const key of TRAIT_KEYS) {
        expect(g1[key].allele1).toBe(g2[key].allele1);
        expect(g1[key].allele2).toBe(g2[key].allele2);
      }
    });
  });

  describe('inheritAnimalGenetics', () => {
    /** Build genetics where every trait has both alleles set to `value`. */
    function makeUniformGenetics(value: number): AnimalGenetics {
      const trait = { allele1: value, allele2: value, expression: value };
      return {
        size:         { ...trait },
        strength:     { ...trait },
        speed:        { ...trait },
        health:       { ...trait },
        lifespan:     { ...trait },
        temperament:  { ...trait },
        intelligence: { ...trait },
        trainability: { ...trait },
        colorVariant: { ...trait },
      };
    }

    it('offspring traits are intermediate between parents', () => {
      // Parent1 all traits at 80, Parent2 all traits at 20.
      // With no mutations and no random new mutations (mutationChance=0),
      // every offspring allele is either 80 or 20, so expression = 50.
      const parent1 = makeUniformGenetics(80);
      const parent2 = makeUniformGenetics(20);

      const { genetics } = inheritAnimalGenetics(
        parent1, parent2, [], [], Math.random, 0
      );

      for (const key of TRAIT_KEYS) {
        // Each allele is either 80 (from parent1) or 20 (from parent2)
        expect([20, 80]).toContain(genetics[key].allele1);
        expect([20, 80]).toContain(genetics[key].allele2);
        // Expression is the mean of those two — always 20, 50, or 80
        expect([20, 50, 80]).toContain(genetics[key].expression);
      }
    });

    it('offspring expression averages near 50 across many samples', () => {
      // Parent1=80, Parent2=20 → average expression should converge to 50
      const parent1 = makeUniformGenetics(80);
      const parent2 = makeUniformGenetics(20);

      const SAMPLES = 200;
      let totalExpression = 0;
      for (let i = 0; i < SAMPLES; i++) {
        const { genetics } = inheritAnimalGenetics(
          parent1, parent2, [], [], Math.random, 0
        );
        totalExpression += genetics.size.expression;
      }
      const mean = totalExpression / SAMPLES;
      // Should land near 50 (within ±10 with very high probability)
      expect(mean).toBeGreaterThan(40);
      expect(mean).toBeLessThan(60);
    });

    it('inherited mutations with inheritChance=1.0 always appear in offspring', () => {
      const parent1 = makeUniformGenetics(50);
      const parent2 = makeUniformGenetics(50);

      const guaranteedMutation: AnimalMutation = {
        traitAffected: 'speed',
        effect: 10,
        beneficial: true,
        inheritChance: 1.0,
      };

      for (let i = 0; i < 20; i++) {
        const { mutations } = inheritAnimalGenetics(
          parent1, parent2,
          [guaranteedMutation], [],
          Math.random, 0
        );
        const found = mutations.some(m => m.traitAffected === 'speed' && m.effect === 10);
        expect(found).toBe(true);
      }
    });

    it('mutations with inheritChance=0 never pass down', () => {
      const parent1 = makeUniformGenetics(50);
      const parent2 = makeUniformGenetics(50);

      const neverMutation: AnimalMutation = {
        traitAffected: 'health',
        effect: -15,
        beneficial: false,
        inheritChance: 0,
      };

      for (let i = 0; i < 50; i++) {
        const { mutations } = inheritAnimalGenetics(
          parent1, parent2,
          [neverMutation], [],
          Math.random, 0
        );
        const found = mutations.some(m => m.traitAffected === 'health' && m.effect === -15);
        expect(found).toBe(false);
      }
    });

    it('inherited mutation effect is applied to expression', () => {
      const parent1 = makeUniformGenetics(50);
      const parent2 = makeUniformGenetics(50);

      const mutation: AnimalMutation = {
        traitAffected: 'strength',
        effect: 20,
        beneficial: true,
        inheritChance: 1.0,
      };

      const { genetics } = inheritAnimalGenetics(
        parent1, parent2,
        [mutation], [],
        Math.random, 0
      );

      // Base expression from alleles = 50, plus mutation effect 20 = 70
      expect(genetics.strength.expression).toBe(70);
    });

    it('returns valid genetics when called with a deterministic rng', () => {
      let seed = 7;
      const deterministicRng = (): number => {
        seed = (seed * 1664525 + 1013904223) & 0xffffffff;
        return (seed >>> 0) / 0xffffffff;
      };

      const parent1 = generateAnimalGenetics(deterministicRng);
      const parent2 = generateAnimalGenetics(deterministicRng);

      const { genetics, mutations } = inheritAnimalGenetics(
        parent1, parent2, [], [], deterministicRng, 0
      );

      for (const key of TRAIT_KEYS) {
        expect(genetics[key].allele1).toBeGreaterThanOrEqual(0);
        expect(genetics[key].allele1).toBeLessThanOrEqual(100);
        expect(genetics[key].allele2).toBeGreaterThanOrEqual(0);
        expect(genetics[key].allele2).toBeLessThanOrEqual(100);
        expect(genetics[key].expression).toBeGreaterThanOrEqual(0);
        expect(genetics[key].expression).toBeLessThanOrEqual(100);
      }
      expect(Array.isArray(mutations)).toBe(true);
    });

    it('all offspring trait values are clamped to [0, 100]', () => {
      // Parent1 with extreme high alleles, a mutation that pushes past 100
      const parent1 = makeUniformGenetics(100);
      const parent2 = makeUniformGenetics(100);

      const extremeMutation: AnimalMutation = {
        traitAffected: 'size',
        effect: 20, // would push expression to 120 without clamping
        beneficial: true,
        inheritChance: 1.0,
      };

      const { genetics } = inheritAnimalGenetics(
        parent1, parent2,
        [extremeMutation], [],
        Math.random, 0
      );

      expect(genetics.size.expression).toBeLessThanOrEqual(100);
    });
  });
});
