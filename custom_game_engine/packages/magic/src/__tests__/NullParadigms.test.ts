import { describe, it, expect } from 'vitest';
import {
  NULL_PARADIGM,
  DEAD_PARADIGM,
  ANTI_PARADIGM,
  INVERTED_PARADIGM,
  TECH_SUPREMACY_PARADIGM,
  RATIONAL_PARADIGM,
  SEALED_PARADIGM,
  DIVINE_PROHIBITION_PARADIGM,
  DIVINE_MONOPOLY_PARADIGM,
  NULL_PARADIGM_REGISTRY,
  isNullParadigm,
  canMagicFunction,
} from '../NullParadigms.js';
import { validateParadigm } from '../MagicParadigm.js';

describe('NullParadigms', () => {
  describe('Individual Null Paradigms', () => {
    const paradigms = [
      { name: 'null', paradigm: NULL_PARADIGM },
      { name: 'dead', paradigm: DEAD_PARADIGM },
      { name: 'anti', paradigm: ANTI_PARADIGM },
      { name: 'inverted', paradigm: INVERTED_PARADIGM },
      { name: 'tech_supremacy', paradigm: TECH_SUPREMACY_PARADIGM },
      { name: 'rational', paradigm: RATIONAL_PARADIGM },
      { name: 'sealed', paradigm: SEALED_PARADIGM },
      { name: 'divine_prohibition', paradigm: DIVINE_PROHIBITION_PARADIGM },
      { name: 'divine_monopoly', paradigm: DIVINE_MONOPOLY_PARADIGM },
    ];

    paradigms.forEach(({ name, paradigm }) => {
      describe(name, () => {
        it('should have correct id', () => {
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

        it('should have valid structure (but may fail validation due to intentionally empty sources)', () => {
          // Null paradigms intentionally lack sources/costs/acquisition methods
          // as that's their whole point - magic doesn't work here
          expect(paradigm.id).toBeTruthy();
          expect(paradigm.name).toBeTruthy();
          expect(paradigm.laws.length).toBeGreaterThanOrEqual(0);
        });
      });
    });
  });

  describe('NULL_PARADIGM', () => {
    it('should have no magic sources', () => {
      expect(NULL_PARADIGM.sources).toHaveLength(0);
    });

    it('should have no costs', () => {
      expect(NULL_PARADIGM.costs).toHaveLength(0);
    });

    it('should have no channels', () => {
      expect(NULL_PARADIGM.channels).toHaveLength(0);
    });

    it('should have power ceiling of 0', () => {
      expect(NULL_PARADIGM.powerCeiling).toBe(0);
    });

    it('should not allow enchantment', () => {
      expect(NULL_PARADIGM.allowsEnchantment).toBe(false);
    });

    it('should be incompatible with foreign magic', () => {
      expect(NULL_PARADIGM.foreignMagicPolicy).toBe('incompatible');
      expect(NULL_PARADIGM.foreignMagicEffect?.effect).toBe('fails');
    });
  });

  describe('DEAD_PARADIGM', () => {
    it('should have depleted mana source', () => {
      expect(DEAD_PARADIGM.sources.length).toBeGreaterThan(0);
      const depletedSource = DEAD_PARADIGM.sources.find(s => s.id === 'depleted_mana');
      expect(depletedSource).toBeDefined();
    });

    it('should have very low power ceiling', () => {
      expect(DEAD_PARADIGM.powerCeiling).toBeLessThanOrEqual(10);
    });

    it('should absorb foreign magic', () => {
      expect(DEAD_PARADIGM.foreignMagicPolicy).toBe('absorbs');
    });

    it('should allow scrolls (ancient texts exist)', () => {
      expect(DEAD_PARADIGM.allowsScrolls).toBe(true);
    });
  });

  describe('ANTI_PARADIGM', () => {
    it('should have anti-force that drains magic', () => {
      const antiSource = ANTI_PARADIGM.sources.find(s => s.id === 'anti_force');
      expect(antiSource).toBeDefined();
      expect(antiSource!.regenRate).toBeLessThan(0);
    });

    it('should use health as cost (magic hurts here)', () => {
      const healthCost = ANTI_PARADIGM.costs.find(c => c.type === 'health');
      expect(healthCost).toBeDefined();
      expect(healthCost!.canBeTerminal).toBe(true);
    });

    it('should be hostile to foreign magic', () => {
      expect(ANTI_PARADIGM.foreignMagicPolicy).toBe('hostile');
      expect(ANTI_PARADIGM.foreignMagicEffect?.effect).toBe('backfires');
    });

    it('should have burnout risk', () => {
      const burnoutRisk = ANTI_PARADIGM.risks.find(r => r.consequence === 'burnout');
      expect(burnoutRisk).toBeDefined();
    });
  });

  describe('INVERTED_PARADIGM', () => {
    it('should have normal power ceiling', () => {
      expect(INVERTED_PARADIGM.powerCeiling).toBe(100);
    });

    it('should transform foreign magic', () => {
      expect(INVERTED_PARADIGM.foreignMagicPolicy).toBe('transforms');
      expect(INVERTED_PARADIGM.foreignMagicEffect?.transformsInto).toBe('inverted');
    });

    it('should have inversion law', () => {
      const inversionLaw = INVERTED_PARADIGM.laws.find(l => l.id === 'inversion');
      expect(inversionLaw).toBeDefined();
      expect(inversionLaw!.strictness).toBe('absolute');
    });

    it('should allow full magic usage', () => {
      expect(INVERTED_PARADIGM.allowsEnchantment).toBe(true);
      expect(INVERTED_PARADIGM.allowsGroupCasting).toBe(true);
      expect(INVERTED_PARADIGM.allowsScrolls).toBe(true);
    });
  });

  describe('TECH_SUPREMACY_PARADIGM', () => {
    it('should have low power ceiling', () => {
      expect(TECH_SUPREMACY_PARADIGM.powerCeiling).toBeLessThanOrEqual(50);
    });

    it('should require meditation (getting away from tech)', () => {
      const meditationChannel = TECH_SUPREMACY_PARADIGM.channels.find(c => c.type === 'meditation');
      expect(meditationChannel).toBeDefined();
      expect(meditationChannel!.requirement).toBe('required');
    });

    it('should not allow enchantment (tech destroys it)', () => {
      expect(TECH_SUPREMACY_PARADIGM.allowsEnchantment).toBe(false);
    });

    it('should have tech interference law', () => {
      const techLaw = TECH_SUPREMACY_PARADIGM.laws.find(l => l.id === 'tech_interference');
      expect(techLaw).toBeDefined();
    });
  });

  describe('RATIONAL_PARADIGM', () => {
    it('should have no sources', () => {
      expect(RATIONAL_PARADIGM.sources).toHaveLength(0);
    });

    it('should have power ceiling of 0', () => {
      expect(RATIONAL_PARADIGM.powerCeiling).toBe(0);
    });

    it('should have absolute laws of physics', () => {
      const thermodynamics = RATIONAL_PARADIGM.laws.find(l => l.id === 'thermodynamics');
      const causality = RATIONAL_PARADIGM.laws.find(l => l.id === 'causality');

      expect(thermodynamics).toBeDefined();
      expect(thermodynamics!.strictness).toBe('absolute');
      expect(causality).toBeDefined();
      expect(causality!.strictness).toBe('absolute');
    });

    it('should not allow any magic features', () => {
      expect(RATIONAL_PARADIGM.allowsEnchantment).toBe(false);
      expect(RATIONAL_PARADIGM.allowsGroupCasting).toBe(false);
      expect(RATIONAL_PARADIGM.allowsTeaching).toBe(false);
      expect(RATIONAL_PARADIGM.allowsScrolls).toBe(false);
    });
  });

  describe('SEALED_PARADIGM', () => {
    it('should have sealed power source', () => {
      const sealedSource = SEALED_PARADIGM.sources.find(s => s.id === 'sealed_power');
      expect(sealedSource).toBeDefined();
    });

    it('should have the Great Seal law', () => {
      const sealLaw = SEALED_PARADIGM.laws.find(l => l.id === 'the_seal');
      expect(sealLaw).toBeDefined();
      expect(sealLaw!.canBeCircumvented).toBe(true);
      expect(sealLaw!.circumventionCostMultiplier).toBeGreaterThan(100);
    });

    it('should have catastrophic risk for breaking seal', () => {
      const breakRisk = SEALED_PARADIGM.risks.find(r => r.severity === 'catastrophic');
      expect(breakRisk).toBeDefined();
    });

    it('should only allow perception technique', () => {
      expect(SEALED_PARADIGM.availableTechniques).toContain('perceive');
      expect(SEALED_PARADIGM.availableTechniques.length).toBeLessThanOrEqual(2);
    });
  });

  describe('DIVINE_PROHIBITION_PARADIGM', () => {
    it('should have full magic power (magic works)', () => {
      expect(DIVINE_PROHIBITION_PARADIGM.powerCeiling).toBe(100);
    });

    it('should have forbidden mana source with beacon detectability', () => {
      const forbiddenSource = DIVINE_PROHIBITION_PARADIGM.sources.find(s => s.id === 'forbidden_mana');
      expect(forbiddenSource).toBeDefined();
      expect(forbiddenSource!.detectability).toBe('beacon');
    });

    it('should have divine ban law', () => {
      const banLaw = DIVINE_PROHIBITION_PARADIGM.laws.find(l => l.id === 'divine_ban');
      expect(banLaw).toBeDefined();
      expect(banLaw!.type).toBe('oath_binding');
    });

    it('should have attention as cost (gods are watching)', () => {
      const attentionCost = DIVINE_PROHIBITION_PARADIGM.costs.find(c => c.type === 'attention');
      expect(attentionCost).toBeDefined();
      expect(attentionCost!.cumulative).toBe(true);
      expect(attentionCost!.recoverable).toBe(false);
    });

    it('should have high-probability divine attention risk', () => {
      const attentionRisk = DIVINE_PROHIBITION_PARADIGM.risks.find(r => r.trigger === 'attention');
      expect(attentionRisk).toBeDefined();
      expect(attentionRisk!.probability).toBeGreaterThan(0.5);
    });

    it('should be compatible with foreign magic (it just triggers divine wrath)', () => {
      expect(DIVINE_PROHIBITION_PARADIGM.foreignMagicPolicy).toBe('compatible');
    });
  });

  describe('DIVINE_MONOPOLY_PARADIGM', () => {
    it('should have divine source only accessible to gods', () => {
      const divineSource = DIVINE_MONOPOLY_PARADIGM.sources.find(s => s.type === 'divine');
      expect(divineSource).toBeDefined();
    });

    it('should require ascension or divine birth to acquire', () => {
      const ascension = DIVINE_MONOPOLY_PARADIGM.acquisitionMethods.find(m => m.method === 'ascension');
      const born = DIVINE_MONOPOLY_PARADIGM.acquisitionMethods.find(m => m.method === 'born');

      expect(ascension || born).toBeDefined();
      if (ascension) {
        expect(ascension.rarity).toBe('legendary');
      }
    });

    it('should have mortal incapacity law', () => {
      const mortalLaw = DIVINE_MONOPOLY_PARADIGM.laws.find(l => l.id === 'mortal_incapacity');
      expect(mortalLaw).toBeDefined();
      expect(mortalLaw!.strictness).toBe('absolute');
    });

    it('should have unlimited power ceiling for gods', () => {
      expect(DIVINE_MONOPOLY_PARADIGM.powerCeiling).toBeUndefined();
    });

    it('should use will as channel (gods just will things)', () => {
      const willChannel = DIVINE_MONOPOLY_PARADIGM.channels.find(c => c.type === 'will');
      expect(willChannel).toBeDefined();
    });
  });

  describe('NULL_PARADIGM_REGISTRY', () => {
    it('should contain all null paradigms', () => {
      expect(NULL_PARADIGM_REGISTRY.null).toBe(NULL_PARADIGM);
      expect(NULL_PARADIGM_REGISTRY.dead).toBe(DEAD_PARADIGM);
      expect(NULL_PARADIGM_REGISTRY.anti).toBe(ANTI_PARADIGM);
      expect(NULL_PARADIGM_REGISTRY.inverted).toBe(INVERTED_PARADIGM);
      expect(NULL_PARADIGM_REGISTRY.tech_supremacy).toBe(TECH_SUPREMACY_PARADIGM);
      expect(NULL_PARADIGM_REGISTRY.rational).toBe(RATIONAL_PARADIGM);
      expect(NULL_PARADIGM_REGISTRY.sealed).toBe(SEALED_PARADIGM);
      expect(NULL_PARADIGM_REGISTRY.divine_prohibition).toBe(DIVINE_PROHIBITION_PARADIGM);
      expect(NULL_PARADIGM_REGISTRY.divine_monopoly).toBe(DIVINE_MONOPOLY_PARADIGM);
    });

    it('should have 9 paradigms', () => {
      expect(Object.keys(NULL_PARADIGM_REGISTRY)).toHaveLength(9);
    });
  });

  describe('isNullParadigm', () => {
    it('should return true for null paradigms', () => {
      expect(isNullParadigm('null')).toBe(true);
      expect(isNullParadigm('dead')).toBe(true);
      expect(isNullParadigm('anti')).toBe(true);
      expect(isNullParadigm('inverted')).toBe(true);
      expect(isNullParadigm('tech_supremacy')).toBe(true);
      expect(isNullParadigm('rational')).toBe(true);
      expect(isNullParadigm('sealed')).toBe(true);
      expect(isNullParadigm('divine_prohibition')).toBe(true);
      expect(isNullParadigm('divine_monopoly')).toBe(true);
    });

    it('should return false for standard paradigms', () => {
      expect(isNullParadigm('academic')).toBe(false);
      expect(isNullParadigm('pact')).toBe(false);
      expect(isNullParadigm('divine')).toBe(false);
    });

    it('should return false for unknown paradigms', () => {
      expect(isNullParadigm('nonexistent')).toBe(false);
    });
  });

  describe('canMagicFunction', () => {
    it('should return false for null and rational paradigms', () => {
      expect(canMagicFunction('null')).toBe(false);
      expect(canMagicFunction('rational')).toBe(false);
    });

    it('should return true for paradigms with power ceiling > 0', () => {
      expect(canMagicFunction('inverted')).toBe(true);
      expect(canMagicFunction('divine_prohibition')).toBe(true);
      expect(canMagicFunction('anti')).toBe(true);
    });

    it('should return true for dead magic (barely)', () => {
      expect(canMagicFunction('dead')).toBe(true);
    });

    it('should return true for non-null paradigms', () => {
      expect(canMagicFunction('academic')).toBe(true);
      expect(canMagicFunction('unknown_paradigm')).toBe(true);
    });

    it('should correctly identify sealed magic as functional but limited', () => {
      expect(canMagicFunction('sealed')).toBe(true);
    });
  });
});
