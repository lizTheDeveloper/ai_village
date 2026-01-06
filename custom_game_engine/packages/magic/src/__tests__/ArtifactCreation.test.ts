import { describe, it, expect } from 'vitest';
import {
  ACADEMIC_ENCHANTMENT,
  BREATH_ENCHANTMENT,
  PACT_ENCHANTMENT,
  NAME_ENCHANTMENT,
  DIVINE_ENCHANTMENT,
  BLOOD_ENCHANTMENT,
  EMOTIONAL_ENCHANTMENT,
  ENCHANTMENT_REGISTRY,
  getEnchantmentSystem,
  canEnchant,
  getSentienceCapableParadigms,
} from '../ArtifactCreation.js';

describe('ArtifactCreation', () => {
  describe('Individual Enchantment Systems', () => {
    const systems = [
      { name: 'academic', system: ACADEMIC_ENCHANTMENT },
      { name: 'breath', system: BREATH_ENCHANTMENT },
      { name: 'pact', system: PACT_ENCHANTMENT },
      { name: 'names', system: NAME_ENCHANTMENT },
      { name: 'divine', system: DIVINE_ENCHANTMENT },
      { name: 'blood', system: BLOOD_ENCHANTMENT },
      { name: 'emotional', system: EMOTIONAL_ENCHANTMENT },
    ];

    systems.forEach(({ name, system }) => {
      describe(name, () => {
        it('should have a paradigm id', () => {
          expect(system.paradigmId).toBe(name);
        });

        it('should have a primary enchantment method', () => {
          expect(system.primaryMethod).toBeDefined();
        });

        it('should have enchantable categories', () => {
          expect(system.enchantableCategories.length).toBeGreaterThan(0);
        });

        it('should have base costs defined', () => {
          expect(system.baseCosts.length).toBeGreaterThan(0);
        });

        it('should have default permanence', () => {
          expect(system.defaultPermanence).toBeDefined();
        });

        it('should have limits defined', () => {
          expect(system.limits).toBeDefined();
        });

        it('should specify if enabled', () => {
          expect(system.enabled).toBeDefined();
        });
      });
    });
  });

  describe('ACADEMIC_ENCHANTMENT', () => {
    it('should use ritual_binding as primary method', () => {
      expect(ACADEMIC_ENCHANTMENT.primaryMethod).toBe('ritual_binding');
    });

    it('should allow enchanting weapons and armor', () => {
      expect(ACADEMIC_ENCHANTMENT.enchantableCategories).toContain('weapons');
      expect(ACADEMIC_ENCHANTMENT.enchantableCategories).toContain('armor');
    });

    it('should not allow sentience', () => {
      expect(ACADEMIC_ENCHANTMENT.allowsSentience).toBe(false);
    });

    it('should have mana as a base cost', () => {
      const manaCost = ACADEMIC_ENCHANTMENT.baseCosts.find(c => c.type === 'mana');
      expect(manaCost).toBeDefined();
    });

    it('should be enabled', () => {
      expect(ACADEMIC_ENCHANTMENT.enabled).toBe(true);
    });
  });

  describe('BREATH_ENCHANTMENT', () => {
    it('should use awakening as primary method', () => {
      expect(BREATH_ENCHANTMENT.primaryMethod).toBe('awakening');
    });

    it('should allow sentience', () => {
      expect(BREATH_ENCHANTMENT.allowsSentience).toBe(true);
    });

    it('should be able to enchant any category', () => {
      // Breath magic can Awaken anything
      expect(BREATH_ENCHANTMENT.enchantableCategories).toContain('any');
    });
  });

  describe('PACT_ENCHANTMENT', () => {
    it('should use entity_binding as primary method', () => {
      expect(PACT_ENCHANTMENT.primaryMethod).toBe('entity_binding');
    });

    it('should allow sentience (bound entities)', () => {
      expect(PACT_ENCHANTMENT.allowsSentience).toBe(true);
    });

    it('should have risks', () => {
      expect(PACT_ENCHANTMENT.risks.length).toBeGreaterThan(0);
    });
  });

  describe('NAME_ENCHANTMENT', () => {
    it('should use inscription as primary method', () => {
      expect(NAME_ENCHANTMENT.primaryMethod).toBe('inscription');
    });

    it('should have required channels', () => {
      expect(NAME_ENCHANTMENT.requiredChannels.length).toBeGreaterThan(0);
    });
  });

  describe('DIVINE_ENCHANTMENT', () => {
    it('should use consecration as primary method', () => {
      expect(DIVINE_ENCHANTMENT.primaryMethod).toBe('consecration');
    });

    it('should require deity approval', () => {
      expect(DIVINE_ENCHANTMENT.requirements.deityApproval).toBe(true);
    });
  });

  describe('BLOOD_ENCHANTMENT', () => {
    it('should use blood_feeding as primary method', () => {
      expect(BLOOD_ENCHANTMENT.primaryMethod).toBe('blood_feeding');
    });

    it('should require blood as cost', () => {
      const bloodCost = BLOOD_ENCHANTMENT.baseCosts.find(c => c.type === 'blood');
      expect(bloodCost).toBeDefined();
    });

    it('should have corruption cost', () => {
      const corruptionCost = BLOOD_ENCHANTMENT.baseCosts.find(c => c.type === 'corruption');
      expect(corruptionCost).toBeDefined();
    });

    it('should have risks', () => {
      expect(BLOOD_ENCHANTMENT.risks.length).toBeGreaterThan(0);
    });
  });

  describe('EMOTIONAL_ENCHANTMENT', () => {
    it('should use emotional_imprint as primary method', () => {
      expect(EMOTIONAL_ENCHANTMENT.primaryMethod).toBe('emotional_imprint');
    });

    it('should have emotion-related costs', () => {
      const emotionCost = EMOTIONAL_ENCHANTMENT.baseCosts.find(c => c.type === 'emotion');
      expect(emotionCost).toBeDefined();
    });

    it('should be permanent by default (emotions leave lasting marks)', () => {
      expect(EMOTIONAL_ENCHANTMENT.defaultPermanence).toBe('permanent');
    });
  });

  describe('ENCHANTMENT_REGISTRY', () => {
    it('should contain all enchantment systems', () => {
      expect(ENCHANTMENT_REGISTRY.academic).toBe(ACADEMIC_ENCHANTMENT);
      expect(ENCHANTMENT_REGISTRY.breath).toBe(BREATH_ENCHANTMENT);
      expect(ENCHANTMENT_REGISTRY.pact).toBe(PACT_ENCHANTMENT);
      expect(ENCHANTMENT_REGISTRY.names).toBe(NAME_ENCHANTMENT);
      expect(ENCHANTMENT_REGISTRY.divine).toBe(DIVINE_ENCHANTMENT);
      expect(ENCHANTMENT_REGISTRY.blood).toBe(BLOOD_ENCHANTMENT);
      expect(ENCHANTMENT_REGISTRY.emotional).toBe(EMOTIONAL_ENCHANTMENT);
    });

    it('should have 7 enchantment systems', () => {
      expect(Object.keys(ENCHANTMENT_REGISTRY)).toHaveLength(7);
    });
  });

  describe('getEnchantmentSystem', () => {
    it('should return enchantment system by paradigm id', () => {
      const academic = getEnchantmentSystem('academic');
      expect(academic).toBe(ACADEMIC_ENCHANTMENT);
    });

    it('should return undefined for unknown paradigm', () => {
      const unknown = getEnchantmentSystem('nonexistent');
      expect(unknown).toBeUndefined();
    });
  });

  describe('canEnchant', () => {
    it('should return true for paradigms that allow enchantment', () => {
      expect(canEnchant('academic')).toBe(true);
      expect(canEnchant('breath')).toBe(true);
    });

    it('should return false for unknown paradigm', () => {
      expect(canEnchant('nonexistent')).toBe(false);
    });
  });

  describe('getSentienceCapableParadigms', () => {
    it('should return paradigms that allow sentience', () => {
      const capable = getSentienceCapableParadigms();

      // Breath and Pact should allow sentience
      expect(capable).toContain('breath');
      expect(capable).toContain('pact');
    });

    it('should not include paradigms that disallow sentience', () => {
      const capable = getSentienceCapableParadigms();

      // Academic should not allow sentience
      expect(capable).not.toContain('academic');
    });

    it('should return an array', () => {
      const capable = getSentienceCapableParadigms();
      expect(Array.isArray(capable)).toBe(true);
    });
  });
});
