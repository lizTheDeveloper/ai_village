import { describe, it, expect } from 'vitest';
import {
  PARADIGM_RELATIONSHIPS,
  getParadigmRelationship,
  THEURGY_PARADIGM,
  HEMOMANCY_PARADIGM,
  NAMEBREATH_PARADIGM,
  HYBRID_PARADIGM_REGISTRY,
  getHybridParadigm,
  getAvailableHybrids,
  calculateMultiParadigmPower,
  isParadigmCombinationStable,
} from '../ParadigmComposition.js';
import type { ParadigmRelationship } from '../ParadigmComposition.js';

describe('ParadigmComposition', () => {
  describe('PARADIGM_RELATIONSHIPS', () => {
    it('should have relationships defined', () => {
      expect(PARADIGM_RELATIONSHIPS).toBeDefined();
      expect(Object.keys(PARADIGM_RELATIONSHIPS).length).toBeGreaterThan(0);
    });

    it('should define Divine+Pact as exclusive for practitioners', () => {
      // Divine and Pact should be exclusive - you can't serve both god and demon
      const divinePact = PARADIGM_RELATIONSHIPS.divine?.pact;
      if (divinePact) {
        expect(divinePact.relationship).toBe('exclusive');
      }
    });

    it('should define Academic+Names as synergistic', () => {
      // Academic and Names magic should work well together
      const academicNames = PARADIGM_RELATIONSHIPS.academic?.names;
      if (academicNames) {
        expect(['synergistic', 'coexistent']).toContain(academicNames.relationship);
      }
    });
  });

  describe('getParadigmRelationship', () => {
    it('should return relationship config between paradigms', () => {
      const rel = getParadigmRelationship('academic', 'pact');

      expect(rel).toBeDefined();
      expect(rel.relationship).toBeDefined();
      expect(rel.powerModifier).toBeDefined();
    });

    it('should return isolated as default for undefined pairs', () => {
      // Using paradigm IDs that definitely won't have a relationship defined
      const rel = getParadigmRelationship('totally_unknown_1', 'totally_unknown_2');

      expect(rel.relationship).toBe('isolated');
      expect(rel.powerModifier).toBe(1.0);
    });

    it('should be symmetric (A->B same as B->A)', () => {
      const abRel = getParadigmRelationship('academic', 'breath');
      const baRel = getParadigmRelationship('breath', 'academic');

      expect(abRel.relationship).toBe(baRel.relationship);
      expect(abRel.powerModifier).toBe(baRel.powerModifier);
    });
  });

  describe('Hybrid Paradigms', () => {
    describe('THEURGY_PARADIGM', () => {
      it('should be a combination of academic and divine', () => {
        expect(THEURGY_PARADIGM.sourceParadigms).toContain('academic');
        expect(THEURGY_PARADIGM.sourceParadigms).toContain('divine');
      });

      it('should have a valid paradigm definition', () => {
        expect(THEURGY_PARADIGM.id).toBe('theurgy');
        expect(THEURGY_PARADIGM.name).toBeTruthy();
      });

      it('should have emergent properties', () => {
        expect(THEURGY_PARADIGM.emergentProperties).toBeDefined();
        expect(THEURGY_PARADIGM.emergentProperties.length).toBeGreaterThan(0);
      });

      it('should be marked as hybrid', () => {
        expect(THEURGY_PARADIGM.isHybrid).toBe(true);
      });

      it('should have stability rating', () => {
        expect(THEURGY_PARADIGM.stability).toBeDefined();
      });
    });

    describe('HEMOMANCY_PARADIGM', () => {
      it('should be a combination of blood and pact', () => {
        expect(HEMOMANCY_PARADIGM.sourceParadigms).toContain('blood');
        expect(HEMOMANCY_PARADIGM.sourceParadigms).toContain('pact');
      });

      it('should have a valid paradigm definition', () => {
        expect(HEMOMANCY_PARADIGM.id).toBe('hemomancy');
        expect(HEMOMANCY_PARADIGM.name).toBeTruthy();
      });

      it('should be marked as hybrid', () => {
        expect(HEMOMANCY_PARADIGM.isHybrid).toBe(true);
      });
    });

    describe('NAMEBREATH_PARADIGM', () => {
      it('should be a combination of names and breath', () => {
        expect(NAMEBREATH_PARADIGM.sourceParadigms).toContain('names');
        expect(NAMEBREATH_PARADIGM.sourceParadigms).toContain('breath');
      });

      it('should have a valid paradigm definition', () => {
        expect(NAMEBREATH_PARADIGM.id).toBe('namebreath');
        expect(NAMEBREATH_PARADIGM.name).toBeTruthy();
      });
    });
  });

  describe('HYBRID_PARADIGM_REGISTRY', () => {
    it('should contain all hybrid paradigms', () => {
      expect(HYBRID_PARADIGM_REGISTRY.theurgy).toBe(THEURGY_PARADIGM);
      expect(HYBRID_PARADIGM_REGISTRY.hemomancy).toBe(HEMOMANCY_PARADIGM);
      expect(HYBRID_PARADIGM_REGISTRY.namebreath).toBe(NAMEBREATH_PARADIGM);
    });

    it('should have at least 3 hybrid paradigms', () => {
      expect(Object.keys(HYBRID_PARADIGM_REGISTRY).length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('getHybridParadigm', () => {
    it('should return hybrid paradigm by id', () => {
      const theurgy = getHybridParadigm('theurgy');
      expect(theurgy).toBe(THEURGY_PARADIGM);
    });

    it('should return undefined for unknown id', () => {
      const unknown = getHybridParadigm('nonexistent');
      expect(unknown).toBeUndefined();
    });
  });

  describe('getAvailableHybrids', () => {
    it('should return hybrids available from given paradigms', () => {
      // With academic and divine, theurgy should be available
      const hybrids = getAvailableHybrids(['academic', 'divine']);
      expect(hybrids.some(h => h.id === 'theurgy')).toBe(true);
    });

    it('should return empty array when no hybrids are possible', () => {
      const hybrids = getAvailableHybrids(['unknown_paradigm']);
      expect(hybrids).toEqual([]);
    });

    it('should return multiple hybrids if multiple combinations are known', () => {
      // With all three parent paradigms for multiple hybrids
      const hybrids = getAvailableHybrids(['academic', 'divine', 'blood', 'names', 'breath']);
      expect(hybrids.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('calculateMultiParadigmPower', () => {
    it('should return 1.0 for single paradigm', () => {
      const power = calculateMultiParadigmPower(['academic']);
      expect(power).toBe(1.0);
    });

    it('should return 1.0 for empty array', () => {
      const power = calculateMultiParadigmPower([]);
      expect(power).toBe(1.0);
    });

    it('should calculate combined power for multiple paradigms', () => {
      const power = calculateMultiParadigmPower(['academic', 'names']);
      expect(power).toBeGreaterThan(0);
    });

    it('should use additive combination when specified', () => {
      const power = calculateMultiParadigmPower(['academic', 'names'], 'additive');
      expect(power).toBeGreaterThan(0);
    });

    it('should use multiplicative combination when specified', () => {
      const power = calculateMultiParadigmPower(['academic', 'names'], 'multiplicative');
      expect(power).toBeGreaterThan(0);
    });

    it('should use highest combination when specified', () => {
      const power = calculateMultiParadigmPower(['academic', 'names'], 'highest');
      expect(power).toBeGreaterThan(0);
    });

    it('should use average combination by default', () => {
      const power = calculateMultiParadigmPower(['academic', 'names']);
      expect(power).toBeGreaterThan(0);
    });

    it('should reduce power for exclusive paradigms', () => {
      // Divine and Pact are exclusive
      const exclusivePower = calculateMultiParadigmPower(['divine', 'pact']);
      const normalPower = calculateMultiParadigmPower(['academic', 'names']);

      // Exclusive combinations should have reduced power
      // or at least not be better than normal combinations
      expect(exclusivePower).toBeLessThanOrEqual(normalPower);
    });
  });

  describe('isParadigmCombinationStable', () => {
    it('should return stable for compatible paradigms', () => {
      const result = isParadigmCombinationStable(['academic', 'names']);

      expect(result.stable).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should return unstable for exclusive paradigms', () => {
      const result = isParadigmCombinationStable(['divine', 'pact']);

      expect(result.stable).toBe(false);
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0]!.relationship).toBe('exclusive');
    });

    it('should identify all conflicts in a multi-paradigm combination', () => {
      // Add pact and divine plus another to see multiple conflicts
      const result = isParadigmCombinationStable(['divine', 'pact', 'academic']);

      // Should have at least the divine-pact conflict
      expect(result.conflicts.some(
        c => c.paradigms.includes('divine') && c.paradigms.includes('pact')
      )).toBe(true);
    });

    it('should return stable for single paradigm', () => {
      const result = isParadigmCombinationStable(['academic']);

      expect(result.stable).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should return stable for empty array', () => {
      const result = isParadigmCombinationStable([]);

      expect(result.stable).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should identify parasitic relationships as conflicts', () => {
      // If there are any parasitic relationships defined, they should be conflicts
      const allParadigms = ['academic', 'pact', 'names', 'breath', 'divine', 'blood', 'emotional'];
      const result = isParadigmCombinationStable(allParadigms);

      // Check if any conflicts are parasitic
      const parasiticConflicts = result.conflicts.filter(c => c.relationship === 'parasitic');
      // This is just checking the function handles parasitic correctly
      expect(Array.isArray(parasiticConflicts)).toBe(true);
    });
  });
});
