import { describe, it, expect } from 'vitest';
import {
  TALENT_PARADIGM,
  NARRATIVE_PARADIGM,
  PUN_PARADIGM,
  WILD_PARADIGM,
  WHIMSICAL_PARADIGM_REGISTRY,
  generateSpellPrompt,
  generateParadigmPrompt,
  generateTalentPrompt,
  parseGeneratedSpell,
  parseGeneratedParadigm,
} from '../WhimsicalParadigms.js';
import type {
  TalentMagic,
  NarrativeRule,
  ProceduralMagicRequest,
  GeneratedSpell,
  GeneratedParadigm,
} from '../WhimsicalParadigms.js';
import { validateParadigm } from '../MagicParadigm.js';

describe('WhimsicalParadigms', () => {
  describe('Individual Paradigms', () => {
    const paradigms = [
      { name: 'talent', paradigm: TALENT_PARADIGM },
      { name: 'narrative', paradigm: NARRATIVE_PARADIGM },
      { name: 'pun', paradigm: PUN_PARADIGM },
      { name: 'wild', paradigm: WILD_PARADIGM },
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

        it('should pass validation', () => {
          const result = validateParadigm(paradigm);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });
    });
  });

  describe('TALENT_PARADIGM (Xanth-style)', () => {
    it('should have innate talent source', () => {
      const talentSource = TALENT_PARADIGM.sources.find(s => s.id === 'innate_talent');
      expect(talentSource).toBeDefined();
      expect(talentSource!.type).toBe('internal');
    });

    it('should not allow study acquisition (talents are born)', () => {
      const birthMethod = TALENT_PARADIGM.acquisitionMethods.find(m => m.method === 'born');
      expect(birthMethod).toBeDefined();
    });

    it('should not allow teaching (talents are unique)', () => {
      expect(TALENT_PARADIGM.allowsTeaching).toBe(false);
    });

    it('should not allow scrolls', () => {
      expect(TALENT_PARADIGM.allowsScrolls).toBe(false);
    });

    it('should have uniqueness law', () => {
      const uniqueLaw = TALENT_PARADIGM.laws.find(
        l => l.name.toLowerCase().includes('unique') || l.id.includes('unique')
      );
      expect(uniqueLaw).toBeDefined();
    });
  });

  describe('NARRATIVE_PARADIGM (Discworld-style)', () => {
    it('should have narrative weight source', () => {
      const narrativeSource = NARRATIVE_PARADIGM.sources.find(s => s.id === 'narrative_weight');
      expect(narrativeSource).toBeDefined();
      expect(narrativeSource!.type).toBe('social');
    });

    it('should have narrative laws', () => {
      const narrativeLaw = NARRATIVE_PARADIGM.laws.find(l => l.type === 'narrative');
      expect(narrativeLaw).toBeDefined();
    });

    it('should use karma as cost (going against the narrative)', () => {
      const karmaCost = NARRATIVE_PARADIGM.costs.find(c => c.type === 'karma');
      expect(karmaCost).toBeDefined();
    });

    it('should have emotion as enhancing channel', () => {
      const emotionChannel = NARRATIVE_PARADIGM.channels.find(c => c.type === 'emotion');
      expect(emotionChannel).toBeDefined();
      expect(emotionChannel!.requirement).toBe('enhancing');
    });
  });

  describe('PUN_PARADIGM', () => {
    it('should have wit/cleverness source', () => {
      expect(PUN_PARADIGM.sources.length).toBeGreaterThan(0);
    });

    it('should be verbal-heavy', () => {
      const verbalChannel = PUN_PARADIGM.channels.find(c => c.type === 'verbal');
      expect(verbalChannel).toBeDefined();
    });

    it('should have pun-related laws or effects', () => {
      // Pun magic should have some law about wordplay
      expect(PUN_PARADIGM.laws.length).toBeGreaterThan(0);
    });
  });

  describe('WILD_PARADIGM', () => {
    it('should have chaos source', () => {
      const chaosSource = WILD_PARADIGM.sources.find(s => s.id === 'chaos');
      expect(chaosSource).toBeDefined();
      expect(chaosSource!.detectability).toBe('obvious');
    });

    it('should have no power ceiling (unlimited but uncontrolled)', () => {
      expect(WILD_PARADIGM.powerCeiling).toBeUndefined();
    });

    it('should not allow enchantment (too chaotic)', () => {
      expect(WILD_PARADIGM.allowsEnchantment).toBe(false);
    });

    it('should have high-probability wild surge risk', () => {
      const wildSurge = WILD_PARADIGM.risks.find(r => r.consequence === 'wild_surge');
      expect(wildSurge).toBeDefined();
      expect(wildSurge!.probability).toBeGreaterThan(0.5);
    });

    it('should absorb foreign magic (corrupts everything)', () => {
      expect(WILD_PARADIGM.foreignMagicPolicy).toBe('absorbs');
    });

    it('should use luck as cost', () => {
      const luckCost = WILD_PARADIGM.costs.find(c => c.type === 'luck');
      expect(luckCost).toBeDefined();
    });
  });

  describe('WHIMSICAL_PARADIGM_REGISTRY', () => {
    it('should contain all whimsical paradigms', () => {
      expect(WHIMSICAL_PARADIGM_REGISTRY.talent).toBe(TALENT_PARADIGM);
      expect(WHIMSICAL_PARADIGM_REGISTRY.narrative).toBe(NARRATIVE_PARADIGM);
      expect(WHIMSICAL_PARADIGM_REGISTRY.pun).toBe(PUN_PARADIGM);
      expect(WHIMSICAL_PARADIGM_REGISTRY.wild).toBe(WILD_PARADIGM);
    });

    it('should have 4 paradigms', () => {
      expect(Object.keys(WHIMSICAL_PARADIGM_REGISTRY)).toHaveLength(4);
    });
  });

  describe('LLM Prompt Generation', () => {
    describe('generateSpellPrompt', () => {
      it('should generate a spell prompt with defaults', () => {
        const request: ProceduralMagicRequest = {
          type: 'spell',
        };

        const prompt = generateSpellPrompt(request);

        expect(prompt).toContain('Generate a magic spell');
        expect(prompt).toContain('JSON object');
        expect(prompt).toContain('technique');
        expect(prompt).toContain('form');
      });

      it('should include paradigm context when provided', () => {
        const request: ProceduralMagicRequest = {
          type: 'spell',
          paradigmContext: 'academic',
        };

        const prompt = generateSpellPrompt(request);

        expect(prompt).toContain('academic');
      });

      it('should include power level when provided', () => {
        const request: ProceduralMagicRequest = {
          type: 'spell',
          powerLevel: 'legendary',
        };

        const prompt = generateSpellPrompt(request);

        expect(prompt).toContain('legendary');
      });

      it('should include themes when provided', () => {
        const request: ProceduralMagicRequest = {
          type: 'spell',
          themes: ['fire', 'destruction'],
        };

        const prompt = generateSpellPrompt(request);

        expect(prompt).toContain('fire');
        expect(prompt).toContain('destruction');
      });

      it('should include constraints when provided', () => {
        const request: ProceduralMagicRequest = {
          type: 'spell',
          constraints: ['No instant death', 'Must be visible'],
        };

        const prompt = generateSpellPrompt(request);

        expect(prompt).toContain('No instant death');
        expect(prompt).toContain('Must be visible');
      });
    });

    describe('generateParadigmPrompt', () => {
      it('should generate a paradigm prompt', () => {
        const request: ProceduralMagicRequest = {
          type: 'paradigm',
        };

        const prompt = generateParadigmPrompt(request);

        expect(prompt).toContain('magic system');
        expect(prompt).toContain('JSON object');
        expect(prompt).toContain('sources');
        expect(prompt).toContain('costs');
        expect(prompt).toContain('laws');
      });

      it('should include themes when provided', () => {
        const request: ProceduralMagicRequest = {
          type: 'paradigm',
          themes: ['music', 'harmony'],
        };

        const prompt = generateParadigmPrompt(request);

        expect(prompt).toContain('music');
        expect(prompt).toContain('harmony');
      });
    });

    describe('generateTalentPrompt', () => {
      it('should generate a talent prompt', () => {
        const request: ProceduralMagicRequest = {
          type: 'talent',
        };

        const prompt = generateTalentPrompt(request);

        expect(prompt).toContain('talent');
        expect(prompt).toContain('ONE');
        expect(prompt).toContain('unique');
        expect(prompt).toContain('JSON object');
      });

      it('should include power level', () => {
        const request: ProceduralMagicRequest = {
          type: 'talent',
          powerLevel: 'weak',
        };

        const prompt = generateTalentPrompt(request);

        expect(prompt).toContain('weak');
      });

      it('should include constraints', () => {
        const request: ProceduralMagicRequest = {
          type: 'talent',
          constraints: ['Must involve animals', 'No combat uses'],
        };

        const prompt = generateTalentPrompt(request);

        expect(prompt).toContain('Must involve animals');
        expect(prompt).toContain('No combat uses');
      });
    });
  });

  describe('LLM Output Parsing', () => {
    describe('parseGeneratedSpell', () => {
      it('should parse valid spell JSON', () => {
        const json = {
          name: 'Fireball',
          description: 'A ball of fire',
          technique: 'create',
          form: 'fire',
          manaCost: 20,
          castTime: 40,
          range: 10,
          duration: 0,
          effects: ['Deals fire damage', 'Ignites flammable objects'],
          sideEffects: ['Bright flash'],
          lore: 'An ancient spell',
        };

        const spell = parseGeneratedSpell(json);

        expect(spell.name).toBe('Fireball');
        expect(spell.description).toBe('A ball of fire');
        expect(spell.technique).toBe('create');
        expect(spell.form).toBe('fire');
        expect(spell.manaCost).toBe(20);
        expect(spell.castTime).toBe(40);
        expect(spell.range).toBe(10);
        expect(spell.effects).toEqual(['Deals fire damage', 'Ignites flammable objects']);
        expect(spell.sideEffects).toEqual(['Bright flash']);
        expect(spell.lore).toBe('An ancient spell');
      });

      it('should use defaults for missing optional fields', () => {
        const json = {
          name: 'Basic Spell',
          description: 'A basic spell',
          technique: 'perceive',
          form: 'mind',
        };

        const spell = parseGeneratedSpell(json);

        expect(spell.name).toBe('Basic Spell');
        expect(spell.manaCost).toBe(10);
        expect(spell.castTime).toBe(20);
        expect(spell.range).toBe(5);
        expect(spell.effects).toEqual([]);
        expect(spell.sideEffects).toBeUndefined();
        expect(spell.duration).toBeUndefined();
      });

      it('should throw for missing name', () => {
        const json = {
          description: 'No name',
          technique: 'create',
          form: 'fire',
        };

        expect(() => parseGeneratedSpell(json)).toThrow('name');
      });

      it('should throw for missing description', () => {
        const json = {
          name: 'No Description',
          technique: 'create',
          form: 'fire',
        };

        expect(() => parseGeneratedSpell(json)).toThrow('description');
      });

      it('should throw for missing technique', () => {
        const json = {
          name: 'No Technique',
          description: 'Missing technique',
          form: 'fire',
        };

        expect(() => parseGeneratedSpell(json)).toThrow('technique');
      });

      it('should throw for missing form', () => {
        const json = {
          name: 'No Form',
          description: 'Missing form',
          technique: 'create',
        };

        expect(() => parseGeneratedSpell(json)).toThrow('form');
      });
    });

    describe('parseGeneratedParadigm', () => {
      it('should parse valid paradigm JSON', () => {
        const json = {
          name: 'Echo Magic',
          description: 'Magic that echoes through time',
          lore: 'A detailed backstory about echoes',
          themes: ['time', 'repetition'],
          sources: ['temporal energy'],
          costs: ['memory loss'],
          channels: ['meditation'],
          laws: ['no paradoxes'],
          risks: ['temporal madness'],
          acquisitionMethods: ['near-death experience'],
          uniqueFeatures: ['spells can be cast backwards in time'],
        };

        const paradigm = parseGeneratedParadigm(json);

        expect(paradigm.name).toBe('Echo Magic');
        expect(paradigm.description).toBe('Magic that echoes through time');
        expect(paradigm.lore).toBe('A detailed backstory about echoes');
        expect(paradigm.themes).toEqual(['time', 'repetition']);
        expect(paradigm.sources).toEqual(['temporal energy']);
        expect(paradigm.costs).toEqual(['memory loss']);
        expect(paradigm.channels).toEqual(['meditation']);
        expect(paradigm.laws).toEqual(['no paradoxes']);
        expect(paradigm.risks).toEqual(['temporal madness']);
        expect(paradigm.acquisitionMethods).toEqual(['near-death experience']);
        expect(paradigm.uniqueFeatures).toEqual(['spells can be cast backwards in time']);
      });

      it('should use defaults for missing optional fields', () => {
        const json = {
          name: 'Minimal Paradigm',
          description: 'Just the basics',
        };

        const paradigm = parseGeneratedParadigm(json);

        expect(paradigm.name).toBe('Minimal Paradigm');
        expect(paradigm.description).toBe('Just the basics');
        expect(paradigm.lore).toBe('');
        expect(paradigm.themes).toEqual([]);
        expect(paradigm.sources).toEqual([]);
        expect(paradigm.costs).toEqual([]);
        expect(paradigm.channels).toEqual([]);
        expect(paradigm.laws).toEqual([]);
        expect(paradigm.risks).toEqual([]);
        expect(paradigm.acquisitionMethods).toEqual([]);
        expect(paradigm.uniqueFeatures).toEqual([]);
      });

      it('should throw for missing name', () => {
        const json = {
          description: 'No name',
        };

        expect(() => parseGeneratedParadigm(json)).toThrow('name');
      });

      it('should throw for missing description', () => {
        const json = {
          name: 'No Description',
        };

        expect(() => parseGeneratedParadigm(json)).toThrow('description');
      });

      it('should handle non-array fields gracefully', () => {
        const json = {
          name: 'Test',
          description: 'Test paradigm',
          themes: 'not an array',
          sources: null,
        };

        const paradigm = parseGeneratedParadigm(json);

        expect(paradigm.themes).toEqual([]);
        expect(paradigm.sources).toEqual([]);
      });
    });
  });
});
