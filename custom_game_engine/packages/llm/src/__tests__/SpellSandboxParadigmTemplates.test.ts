import { describe, it, expect } from 'vitest';
import {
  getParadigmTemplate,
  formatParadigmLore,
  PARADIGM_TEMPLATES,
} from '../SpellSandboxParadigmTemplates.js';

const NEW_PARADIGM_IDS = [
  'blood',
  'divine',
  'names',
  'pact',
  'shinto',
  'allomancy',
  'lunar',
  'seasonal',
] as const;

// ---------------------------------------------------------------------------
// Suite 1: getParadigmTemplate — structural validity for each new paradigm
// ---------------------------------------------------------------------------

describe('getParadigmTemplate — new paradigms', () => {
  for (const id of NEW_PARADIGM_IDS) {
    describe(`paradigm: ${id}`, () => {
      it('returns a non-null template', () => {
        expect(getParadigmTemplate(id)).not.toBeNull();
      });

      it('has correct id', () => {
        const template = getParadigmTemplate(id);
        expect(template?.id).toBe(id);
      });

      it('has a non-empty name', () => {
        const template = getParadigmTemplate(id);
        expect(typeof template?.name).toBe('string');
        expect(template!.name.length).toBeGreaterThan(0);
      });

      it('has a non-empty philosophy', () => {
        const template = getParadigmTemplate(id);
        expect(typeof template?.philosophy).toBe('string');
        expect(template!.philosophy.length).toBeGreaterThan(0);
      });

      it('has a non-empty vocabularyRegister', () => {
        const template = getParadigmTemplate(id);
        expect(typeof template?.vocabularyRegister).toBe('string');
        expect(template!.vocabularyRegister.length).toBeGreaterThan(0);
      });

      it('has exactly 4 forbiddenCombinations', () => {
        const template = getParadigmTemplate(id);
        expect(template?.forbiddenCombinations).toHaveLength(4);
      });

      it('has exactly 3 examples', () => {
        const template = getParadigmTemplate(id);
        expect(template?.examples).toHaveLength(3);
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Suite 2: formatParadigmLore — output contains required sections
// ---------------------------------------------------------------------------

describe('formatParadigmLore — new paradigms', () => {
  for (const id of NEW_PARADIGM_IDS) {
    it(`${id}: lore contains "Vocabulary register"`, () => {
      const template = getParadigmTemplate(id)!;
      const lore = formatParadigmLore(template);
      expect(lore).toContain('Vocabulary register');
    });

    it(`${id}: lore contains "Forbidden"`, () => {
      const template = getParadigmTemplate(id)!;
      const lore = formatParadigmLore(template);
      expect(lore).toContain('Forbidden');
    });

    it(`${id}: lore contains "Calibration examples"`, () => {
      const template = getParadigmTemplate(id)!;
      const lore = formatParadigmLore(template);
      expect(lore).toContain('Calibration examples');
    });
  }
});

// ---------------------------------------------------------------------------
// Suite 3: example field validity for each new paradigm
// ---------------------------------------------------------------------------

describe('paradigm examples — field validity', () => {
  for (const id of NEW_PARADIGM_IDS) {
    describe(`${id} examples`, () => {
      it('each example has non-empty verb, noun, title, description', () => {
        const template = getParadigmTemplate(id)!;
        for (const example of template.examples) {
          expect(typeof example.verb).toBe('string');
          expect(example.verb.length).toBeGreaterThan(0);

          expect(typeof example.noun).toBe('string');
          expect(example.noun.length).toBeGreaterThan(0);

          expect(typeof example.title).toBe('string');
          expect(example.title.length).toBeGreaterThan(0);

          expect(typeof example.description).toBe('string');
          expect(example.description.length).toBeGreaterThan(0);
        }
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Suite 4: PARADIGM_TEMPLATES registry coverage
// ---------------------------------------------------------------------------

describe('PARADIGM_TEMPLATES registry', () => {
  it('has at least 17 entries (9 existing + 8 new)', () => {
    expect(Object.keys(PARADIGM_TEMPLATES).length).toBeGreaterThanOrEqual(17);
  });

  for (const id of NEW_PARADIGM_IDS) {
    it(`includes new paradigm: ${id}`, () => {
      expect(Object.keys(PARADIGM_TEMPLATES)).toContain(id);
    });
  }
});
