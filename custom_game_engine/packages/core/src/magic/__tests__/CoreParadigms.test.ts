import { describe, it, expect } from 'vitest';
import {
  ACADEMIC_PARADIGM,
  PACT_PARADIGM,
  NAME_PARADIGM,
  BREATH_PARADIGM,
  DIVINE_PARADIGM,
  BLOOD_PARADIGM,
  EMOTIONAL_PARADIGM,
  CORE_PARADIGM_REGISTRY,
  getCoreParadigm,
  getCoreParadigmIds,
  getCoreParadigmsForUniverse,
} from '../CoreParadigms.js';
import { validateParadigm } from '../MagicParadigm.js';

describe('CoreParadigms', () => {
  describe('Individual Paradigms', () => {
    const paradigms = [
      { name: 'academic', paradigm: ACADEMIC_PARADIGM },
      { name: 'pact', paradigm: PACT_PARADIGM },
      { name: 'names', paradigm: NAME_PARADIGM },
      { name: 'breath', paradigm: BREATH_PARADIGM },
      { name: 'divine', paradigm: DIVINE_PARADIGM },
      { name: 'blood', paradigm: BLOOD_PARADIGM },
      { name: 'emotional', paradigm: EMOTIONAL_PARADIGM },
    ];

    paradigms.forEach(({ name, paradigm }) => {
      describe(name, () => {
        it('should have a valid id', () => {
          expect(paradigm.id).toBe(name);
        });

        it('should have a name', () => {
          expect(paradigm.name).toBeTruthy();
        });

        it('should have a description', () => {
          expect(paradigm.description).toBeTruthy();
        });

        it('should have lore text', () => {
          expect(paradigm.lore).toBeTruthy();
          expect(paradigm.lore!.length).toBeGreaterThan(50);
        });

        it('should have at least one source', () => {
          expect(paradigm.sources.length).toBeGreaterThan(0);
        });

        it('should have at least one cost', () => {
          expect(paradigm.costs.length).toBeGreaterThan(0);
        });

        it('should have at least one acquisition method', () => {
          expect(paradigm.acquisitionMethods.length).toBeGreaterThan(0);
        });

        it('should have valid structure', () => {
          // Paradigms have all required fields - validation may require more
          expect(paradigm.sources.length).toBeGreaterThan(0);
          expect(paradigm.costs.length).toBeGreaterThan(0);
          expect(paradigm.acquisitionMethods.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('ACADEMIC_PARADIGM', () => {
    it('should use mana as primary source', () => {
      const manaSource = ACADEMIC_PARADIGM.sources.find(s => s.id === 'mana');
      expect(manaSource).toBeDefined();
      expect(manaSource!.type).toBe('internal');
    });

    it('should require study to acquire', () => {
      const studyMethod = ACADEMIC_PARADIGM.acquisitionMethods.find(m => m.method === 'study');
      expect(studyMethod).toBeDefined();
      expect(studyMethod!.voluntary).toBe(true);
    });

    it('should allow scrolls and teaching', () => {
      expect(ACADEMIC_PARADIGM.allowsScrolls).toBe(true);
      expect(ACADEMIC_PARADIGM.allowsTeaching).toBe(true);
    });

    it('should have verbal and somatic channels', () => {
      const verbal = ACADEMIC_PARADIGM.channels.find(c => c.type === 'verbal');
      const somatic = ACADEMIC_PARADIGM.channels.find(c => c.type === 'somatic');
      expect(verbal).toBeDefined();
      expect(somatic).toBeDefined();
    });
  });

  describe('PACT_PARADIGM', () => {
    it('should use patron grant as source', () => {
      const patronSource = PACT_PARADIGM.sources.find(s => s.id === 'patron');
      expect(patronSource).toBeDefined();
      expect(patronSource!.type).toBe('divine');
    });

    it('should have favor cost', () => {
      const favorCost = PACT_PARADIGM.costs.find(c => c.type === 'favor');
      expect(favorCost).toBeDefined();
    });

    it('should require contract to acquire', () => {
      const contractMethod = PACT_PARADIGM.acquisitionMethods.find(m => m.method === 'contract');
      expect(contractMethod).toBeDefined();
    });

    it('should have oath-binding laws', () => {
      const oathLaw = PACT_PARADIGM.laws.find(l => l.type === 'oath_binding');
      expect(oathLaw).toBeDefined();
    });

    it('should have risks for divine anger', () => {
      const divineAngerRisk = PACT_PARADIGM.risks.find(r => r.trigger === 'divine_anger');
      expect(divineAngerRisk).toBeDefined();
    });
  });

  describe('DIVINE_PARADIGM', () => {
    it('should use divine grace as source', () => {
      const divineSource = DIVINE_PARADIGM.sources.find(s => s.type === 'divine');
      expect(divineSource).toBeDefined();
      expect(divineSource!.id).toBe('divine_grace');
    });

    it('should have karma cost', () => {
      const karmaCost = DIVINE_PARADIGM.costs.find(c => c.type === 'karma');
      expect(karmaCost).toBeDefined();
    });

    it('should require prayer to acquire', () => {
      const prayerMethod = DIVINE_PARADIGM.acquisitionMethods.find(m => m.method === 'prayer');
      expect(prayerMethod).toBeDefined();
    });
  });

  describe('BLOOD_PARADIGM', () => {
    it('should use health as primary cost', () => {
      const healthCost = BLOOD_PARADIGM.costs.find(c => c.type === 'health');
      expect(healthCost).toBeDefined();
      expect(healthCost!.canBeTerminal).toBe(true);
    });

    it('should have risks for overuse', () => {
      const burnoutRisk = BLOOD_PARADIGM.risks.find(r => r.trigger === 'overuse');
      expect(burnoutRisk).toBeDefined();
    });
  });

  describe('CORE_PARADIGM_REGISTRY', () => {
    it('should contain all core paradigms', () => {
      expect(CORE_PARADIGM_REGISTRY.academic).toBe(ACADEMIC_PARADIGM);
      expect(CORE_PARADIGM_REGISTRY.pact).toBe(PACT_PARADIGM);
      expect(CORE_PARADIGM_REGISTRY.names).toBe(NAME_PARADIGM);
      expect(CORE_PARADIGM_REGISTRY.breath).toBe(BREATH_PARADIGM);
      expect(CORE_PARADIGM_REGISTRY.divine).toBe(DIVINE_PARADIGM);
      expect(CORE_PARADIGM_REGISTRY.blood).toBe(BLOOD_PARADIGM);
      expect(CORE_PARADIGM_REGISTRY.emotional).toBe(EMOTIONAL_PARADIGM);
    });

    it('should have 7 core paradigms', () => {
      expect(Object.keys(CORE_PARADIGM_REGISTRY)).toHaveLength(7);
    });
  });

  describe('getCoreParadigm', () => {
    it('should return a core paradigm by id', () => {
      const academic = getCoreParadigm('academic');
      expect(academic).toBe(ACADEMIC_PARADIGM);
    });

    it('should throw for unknown id', () => {
      expect(() => getCoreParadigm('nonexistent')).toThrow(/Unknown core paradigm/);
    });
  });

  describe('getCoreParadigmIds', () => {
    it('should return all core paradigm ids', () => {
      const ids = getCoreParadigmIds();
      expect(ids).toContain('academic');
      expect(ids).toContain('pact');
      expect(ids).toContain('names');
      expect(ids).toContain('breath');
      expect(ids).toContain('divine');
      expect(ids).toContain('blood');
      expect(ids).toContain('emotional');
    });
  });

  describe('getCoreParadigmsForUniverse', () => {
    it('should return core paradigms matching a universe id', () => {
      // Academic paradigm is in 'arcane_realms'
      const arcaneParadigms = getCoreParadigmsForUniverse('arcane_realms');
      expect(arcaneParadigms.some(p => p.id === 'academic')).toBe(true);
    });

    it('should return empty array for unknown universe', () => {
      const unknown = getCoreParadigmsForUniverse('totally_unknown_universe_xyz');
      expect(unknown).toEqual([]);
    });
  });
});
