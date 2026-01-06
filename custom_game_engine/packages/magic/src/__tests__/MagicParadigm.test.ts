import { describe, it, expect } from 'vitest';
import {
  createEmptyParadigm,
  createManaSource,
  createManaCost,
  createStandardChannels,
  createConservationLaw,
  createStudyAcquisition,
  validateParadigm,
} from '../MagicParadigm.js';

describe('MagicParadigm', () => {
  describe('createEmptyParadigm', () => {
    it('should create a paradigm with required fields', () => {
      const paradigm = createEmptyParadigm('test', 'Test Paradigm');

      expect(paradigm.id).toBe('test');
      expect(paradigm.name).toBe('Test Paradigm');
      expect(paradigm.sources).toEqual([]);
      expect(paradigm.costs).toEqual([]);
      expect(paradigm.channels).toEqual([]);
      expect(paradigm.laws).toEqual([]);
      expect(paradigm.risks).toEqual([]);
      expect(paradigm.acquisitionMethods).toEqual([]);
    });

    it('should set sensible defaults', () => {
      const paradigm = createEmptyParadigm('test', 'Test');

      expect(paradigm.powerScaling).toBe('linear');
      expect(paradigm.allowsGroupCasting).toBe(false);
      expect(paradigm.allowsEnchantment).toBe(false);
      expect(paradigm.persistsAfterDeath).toBe(false);
      expect(paradigm.allowsTeaching).toBe(false);
      expect(paradigm.allowsScrolls).toBe(false);
      expect(paradigm.foreignMagicPolicy).toBe('compatible');
    });
  });

  describe('createManaSource', () => {
    it('should create a standard mana source', () => {
      const source = createManaSource();

      expect(source.id).toBe('mana');
      expect(source.name).toBe('Mana');
      expect(source.type).toBe('internal');
      expect(source.regeneration).toBe('rest');
      expect(source.storable).toBe(true);
      expect(source.transferable).toBe(true);
      expect(source.stealable).toBe(false);
      expect(source.detectability).toBe('subtle');
    });

    it('should allow custom regen rate', () => {
      const source = createManaSource(0.05);

      expect(source.regenRate).toBe(0.05);
    });
  });

  describe('createManaCost', () => {
    it('should create a standard mana cost', () => {
      const cost = createManaCost();

      expect(cost.type).toBe('mana');
      expect(cost.canBeTerminal).toBe(false);
      expect(cost.cumulative).toBe(false);
      expect(cost.recoverable).toBe(true);
      expect(cost.recoveryMethod).toBe('rest');
      expect(cost.visibility).toBe('hidden');
    });
  });

  describe('createStandardChannels', () => {
    it('should create verbal and somatic channels', () => {
      const channels = createStandardChannels();

      expect(channels).toHaveLength(2);

      const verbal = channels.find(c => c.type === 'verbal');
      expect(verbal).toBeDefined();
      expect(verbal!.requirement).toBe('required');
      expect(verbal!.canBeMastered).toBe(true);
      expect(verbal!.blockEffect).toBe('prevents_casting');

      const somatic = channels.find(c => c.type === 'somatic');
      expect(somatic).toBeDefined();
      expect(somatic!.requirement).toBe('required');
      expect(somatic!.canBeMastered).toBe(true);
      expect(somatic!.blockEffect).toBe('reduces_power');
    });
  });

  describe('createConservationLaw', () => {
    it('should create a conservation law', () => {
      const law = createConservationLaw();

      expect(law.id).toBe('conservation');
      expect(law.name).toBe('Conservation of Thaumic Energy');
      expect(law.type).toBe('conservation');
      expect(law.strictness).toBe('strong');
      expect(law.canBeCircumvented).toBe(false);
    });
  });

  describe('createStudyAcquisition', () => {
    it('should create a study acquisition method', () => {
      const acq = createStudyAcquisition();

      expect(acq.method).toBe('study');
      expect(acq.rarity).toBe('common');
      expect(acq.voluntary).toBe(true);
      expect(acq.grantsAccess).toEqual(['mana']);
      expect(acq.startingProficiency).toBe(5);
    });

    it('should allow custom source ids and proficiency', () => {
      const acq = createStudyAcquisition(['dark_mana', 'light_mana'], 15);

      expect(acq.grantsAccess).toEqual(['dark_mana', 'light_mana']);
      expect(acq.startingProficiency).toBe(15);
    });
  });

  describe('validateParadigm', () => {
    it('should detect missing id', () => {
      const paradigm = createEmptyParadigm('', 'Test');

      const result = validateParadigm(paradigm);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Paradigm must have an id');
    });

    it('should detect missing name', () => {
      const paradigm = createEmptyParadigm('test', '');

      const result = validateParadigm(paradigm);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Paradigm must have a name');
    });

    it('should detect missing sources', () => {
      const paradigm = createEmptyParadigm('test', 'Test');
      // No sources

      const result = validateParadigm(paradigm);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('source'))).toBe(true);
    });

    it('should detect missing costs', () => {
      const paradigm = createEmptyParadigm('test', 'Test');
      paradigm.sources = [createManaSource()];
      // No costs

      const result = validateParadigm(paradigm);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('cost'))).toBe(true);
    });

    it('should detect missing acquisition methods', () => {
      const paradigm = createEmptyParadigm('test', 'Test');
      paradigm.sources = [createManaSource()];
      paradigm.costs = [createManaCost()];
      // No acquisition methods

      const result = validateParadigm(paradigm);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('acquisition'))).toBe(true);
    });

    it('should return valid for a complete paradigm', () => {
      const paradigm = createEmptyParadigm('test', 'Test');
      paradigm.sources = [createManaSource()];
      paradigm.costs = [createManaCost()];
      paradigm.acquisitionMethods = [createStudyAcquisition()];

      const result = validateParadigm(paradigm);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
