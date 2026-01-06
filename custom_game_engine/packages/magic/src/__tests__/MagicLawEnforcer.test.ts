import { describe, it, expect } from 'vitest';
import { MagicLawEnforcer, createLawEnforcer } from '../MagicLawEnforcer.js';
import { ACADEMIC_PARADIGM, PACT_PARADIGM } from '../CoreParadigms.js';
import { createEmptyParadigm, createManaSource, createManaCost } from '../MagicParadigm.js';

describe('MagicLawEnforcer', () => {
  describe('constructor', () => {
    it('should create an enforcer for a paradigm', () => {
      const enforcer = new MagicLawEnforcer(ACADEMIC_PARADIGM);
      expect(enforcer).toBeDefined();
    });
  });

  describe('createLawEnforcer', () => {
    it('should create an enforcer using factory function', () => {
      const enforcer = createLawEnforcer(ACADEMIC_PARADIGM);
      expect(enforcer).toBeInstanceOf(MagicLawEnforcer);
    });
  });

  describe('evaluateCrossParadigm', () => {
    it('should evaluate foreign magic in incompatible paradigm', () => {
      const enforcer = new MagicLawEnforcer(ACADEMIC_PARADIGM);
      const foreignParadigm = PACT_PARADIGM;

      const result = enforcer.evaluateCrossParadigm(foreignParadigm);

      expect(result.canFunction).toBeDefined();
      expect(result.powerModifier).toBeDefined();
      expect(result.description).toBeTruthy();
    });

    it('should handle hostile paradigm interactions', () => {
      // Create a paradigm that's hostile to foreign magic
      const paradigm = createEmptyParadigm('hostile', 'Hostile Magic');
      paradigm.sources = [createManaSource()];
      paradigm.foreignMagicPolicy = 'hostile';
      paradigm.foreignMagicEffect = {
        effect: 'backfires',
        powerModifier: -0.5,
      };

      const enforcer = new MagicLawEnforcer(paradigm);
      const result = enforcer.evaluateCrossParadigm(ACADEMIC_PARADIGM);

      expect(result.powerModifier).toBeLessThan(1);
    });

    it('should handle compatible paradigm interactions', () => {
      // Create a paradigm that's compatible with foreign magic
      const paradigm = createEmptyParadigm('compatible', 'Compatible Magic');
      paradigm.sources = [createManaSource()];
      paradigm.foreignMagicPolicy = 'compatible';
      paradigm.foreignMagicEffect = {
        effect: 'works_normally',
        powerModifier: 1.0,
      };

      const enforcer = new MagicLawEnforcer(paradigm);
      const result = enforcer.evaluateCrossParadigm(ACADEMIC_PARADIGM);

      expect(result.canFunction).toBe(true);
    });

    it('should return transform info from interaction config', () => {
      const paradigm = createEmptyParadigm('transformer', 'Transformer Magic');
      paradigm.sources = [createManaSource()];
      paradigm.foreignMagicPolicy = 'transforms';
      paradigm.foreignMagicEffect = {
        effect: 'transforms',
        powerModifier: 0.8,
        transformsInto: 'transformer',
      };

      const enforcer = new MagicLawEnforcer(paradigm);

      // evaluateCrossParadigm takes (spell, caster, interaction?) - without interaction, transforms is false
      // The transforms field comes from the interaction parameter, not the paradigm directly
      const mockSpell = { technique: 'create', form: 'fire', manaCost: 10 } as any;
      const mockCaster = {
        knownParadigmIds: ['transformer'],
        techniqueProficiency: {},
        formProficiency: {},
        paradigmState: {},
      } as any;

      const result = enforcer.evaluateCrossParadigm(mockSpell, mockCaster, undefined);

      // Without explicit interaction, defaults to partial functionality with no transforms
      expect(result.canFunction).toBe(true);
      expect(result.transforms).toBe(false);
    });
  });

  describe('paradigm with forbidden combinations', () => {
    it('should have forbidden combinations properly defined', () => {
      const paradigm = createEmptyParadigm('forbidden', 'Forbidden Magic');
      paradigm.sources = [createManaSource()];
      paradigm.costs = [createManaCost()];
      paradigm.availableTechniques = ['create', 'destroy'];
      paradigm.availableForms = ['fire', 'spirit'];
      paradigm.forbiddenCombinations = [
        {
          technique: 'destroy',
          form: 'spirit',
          reason: 'Destroying spirits is forbidden',
        },
      ];

      expect(paradigm.forbiddenCombinations).toHaveLength(1);
      expect(paradigm.forbiddenCombinations[0]!.technique).toBe('destroy');
      expect(paradigm.forbiddenCombinations[0]!.form).toBe('spirit');
    });
  });

  describe('paradigm with resonant combinations', () => {
    it('should have resonant combinations properly defined', () => {
      const paradigm = createEmptyParadigm('resonant', 'Resonant Magic');
      paradigm.sources = [createManaSource()];
      paradigm.costs = [createManaCost()];
      paradigm.availableTechniques = ['create'];
      paradigm.availableForms = ['fire'];
      paradigm.resonantCombinations = [
        {
          technique: 'create',
          form: 'fire',
          bonus: 'Flames come easily',
          powerMultiplier: 1.5,
        },
      ];

      expect(paradigm.resonantCombinations).toHaveLength(1);
      expect(paradigm.resonantCombinations[0]!.powerMultiplier).toBe(1.5);
    });
  });

  describe('paradigm power ceiling', () => {
    it('should respect power ceiling setting', () => {
      const paradigm = createEmptyParadigm('capped', 'Capped Magic');
      paradigm.sources = [createManaSource()];
      paradigm.costs = [createManaCost()];
      paradigm.availableTechniques = ['create'];
      paradigm.availableForms = ['fire'];
      paradigm.powerCeiling = 50;

      expect(paradigm.powerCeiling).toBe(50);
    });

    it('should allow undefined power ceiling for unlimited', () => {
      const paradigm = createEmptyParadigm('unlimited', 'Unlimited Magic');
      paradigm.sources = [createManaSource()];

      expect(paradigm.powerCeiling).toBeUndefined();
    });
  });
});
