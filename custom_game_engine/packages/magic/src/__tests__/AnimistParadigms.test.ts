import { describe, it, expect } from 'vitest';
import {
  SHINTO_PARADIGM,
  SYMPATHY_PARADIGM,
  ALLOMANCY_PARADIGM,
  DREAM_PARADIGM,
  SONG_PARADIGM,
  RUNE_PARADIGM,
  DAEMON_PARADIGM,
  ANIMIST_PARADIGM_REGISTRY,
  getAnimistParadigm,
  EXAMPLE_KAMI,
  getKamiTypes,
  getKamiByType,
  ALLOMANTIC_METALS,
  getAllomanticMetals,
  getMetalsByType,
} from '../AnimistParadigms.js';
import type { Kami, AllomanticMetal, Daemon } from '../AnimistParadigms.js';
import { validateParadigm } from '../MagicParadigm.js';

describe('AnimistParadigms', () => {
  describe('Individual Paradigms', () => {
    const paradigms = [
      { name: 'shinto', paradigm: SHINTO_PARADIGM },
      { name: 'sympathy', paradigm: SYMPATHY_PARADIGM },
      { name: 'allomancy', paradigm: ALLOMANCY_PARADIGM },
      { name: 'dream', paradigm: DREAM_PARADIGM },
      { name: 'song', paradigm: SONG_PARADIGM },
      { name: 'rune', paradigm: RUNE_PARADIGM },
      { name: 'daemon', paradigm: DAEMON_PARADIGM },
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

        it('should have at least one source', () => {
          expect(paradigm.sources.length).toBeGreaterThan(0);
        });

        it('should have at least one cost', () => {
          expect(paradigm.costs.length).toBeGreaterThan(0);
        });

        it('should have at least one channel', () => {
          expect(paradigm.channels.length).toBeGreaterThan(0);
        });

        it('should have at least one law', () => {
          expect(paradigm.laws.length).toBeGreaterThan(0);
        });

        it('should have available techniques', () => {
          expect(paradigm.availableTechniques.length).toBeGreaterThan(0);
        });

        it('should have available forms', () => {
          expect(paradigm.availableForms.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('SHINTO_PARADIGM (Kami/Spirit Magic)', () => {
    it('should have kami_favor source', () => {
      const kamiFavor = SHINTO_PARADIGM.sources.find(s => s.id === 'kami_favor');
      expect(kamiFavor).toBeDefined();
      expect(kamiFavor!.type).toBe('social');
    });

    it('should have purity source', () => {
      const purity = SHINTO_PARADIGM.sources.find(s => s.id === 'purity');
      expect(purity).toBeDefined();
      expect(purity!.regeneration).toBe('ritual');
    });

    it('should require ritual channel', () => {
      const ritualChannel = SHINTO_PARADIGM.channels.find(c => c.type === 'ritual');
      expect(ritualChannel).toBeDefined();
      expect(ritualChannel!.requirement).toBe('required');
    });

    it('should have consent law (kami must choose to help)', () => {
      const consentLaw = SHINTO_PARADIGM.laws.find(l => l.type === 'consent');
      expect(consentLaw).toBeDefined();
      expect(consentLaw!.strictness).toBe('absolute');
    });

    it('should allow group casting (community rituals)', () => {
      expect(SHINTO_PARADIGM.allowsGroupCasting).toBe(true);
      expect(SHINTO_PARADIGM.groupCastingMultiplier).toBeGreaterThan(1);
    });

    it('should persist after death (become ancestor spirit)', () => {
      expect(SHINTO_PARADIGM.persistsAfterDeath).toBe(true);
    });
  });

  describe('SYMPATHY_PARADIGM (Kingkiller Chronicle style)', () => {
    it('should have alar (mental focus) source', () => {
      const alar = SYMPATHY_PARADIGM.sources.find(s => s.id === 'alar');
      expect(alar).toBeDefined();
      expect(alar!.type).toBe('internal');
    });

    it('should have conservation law', () => {
      const conservation = SYMPATHY_PARADIGM.laws.find(l => l.type === 'conservation');
      expect(conservation).toBeDefined();
      expect(conservation!.strictness).toBe('absolute');
    });

    it('should have similarity law', () => {
      const similarity = SYMPATHY_PARADIGM.laws.find(l => l.type === 'similarity');
      expect(similarity).toBeDefined();
    });

    it('should require binding channel', () => {
      const bindingChannel = SYMPATHY_PARADIGM.channels.find(c => c.type === 'binding');
      expect(bindingChannel).toBeDefined();
      expect(bindingChannel!.requirement).toBe('required');
    });

    it('should have backlash risk (binder\'s chills)', () => {
      const backlashRisk = SYMPATHY_PARADIGM.risks.find(r => r.consequence === 'backlash');
      expect(backlashRisk).toBeDefined();
    });

    it('should not allow group casting (alar is personal)', () => {
      expect(SYMPATHY_PARADIGM.allowsGroupCasting).toBe(false);
    });
  });

  describe('ALLOMANCY_PARADIGM (Mistborn style)', () => {
    it('should have metal_reserves source', () => {
      const metalReserves = ALLOMANCY_PARADIGM.sources.find(s => s.id === 'metal_reserves');
      expect(metalReserves).toBeDefined();
      expect(metalReserves!.type).toBe('material');
      expect(metalReserves!.regeneration).toBe('consumption');
    });

    it('should have bloodline law', () => {
      const bloodlineLaw = ALLOMANCY_PARADIGM.laws.find(l => l.type === 'bloodline');
      expect(bloodlineLaw).toBeDefined();
      expect(bloodlineLaw!.strictness).toBe('absolute');
    });

    it('should require will channel', () => {
      const willChannel = ALLOMANCY_PARADIGM.channels.find(c => c.type === 'will');
      expect(willChannel).toBeDefined();
      expect(willChannel!.requirement).toBe('required');
    });

    it('should have impure_metal risk', () => {
      const impureRisk = ALLOMANCY_PARADIGM.risks.find(r => r.trigger === 'impure_metal');
      expect(impureRisk).toBeDefined();
      expect(impureRisk!.severity).toBe('severe');
    });

    it('should not allow teaching (genetic power)', () => {
      expect(ALLOMANCY_PARADIGM.allowsTeaching).toBe(false);
    });

    it('should have metal as available form', () => {
      expect(ALLOMANCY_PARADIGM.availableForms).toContain('metal');
    });
  });

  describe('DREAM_PARADIGM (Oneiromancy)', () => {
    it('should have dream_essence source', () => {
      const dreamEssence = DREAM_PARADIGM.sources.find(s => s.id === 'dream_essence');
      expect(dreamEssence).toBeDefined();
      expect(dreamEssence!.regeneration).toBe('sleep');
    });

    it('should have sleep channel', () => {
      const sleepChannel = DREAM_PARADIGM.channels.find(c => c.type === 'sleep');
      expect(sleepChannel).toBeDefined();
      expect(sleepChannel!.requirement).toBe('required');
    });

    it('should have death risk (can die in dreams)', () => {
      const deathRisk = DREAM_PARADIGM.risks.find(r => r.trigger === 'death');
      expect(deathRisk).toBeDefined();
      expect(deathRisk!.consequence).toBe('coma');
    });

    it('should have no power ceiling (imagination is the limit)', () => {
      expect(DREAM_PARADIGM.powerCeiling).toBeUndefined();
    });

    it('should allow group casting (shared dreaming)', () => {
      expect(DREAM_PARADIGM.allowsGroupCasting).toBe(true);
    });
  });

  describe('SONG_PARADIGM (Music Magic)', () => {
    it('should have voice source', () => {
      const voiceSource = SONG_PARADIGM.sources.find(s => s.id === 'voice');
      expect(voiceSource).toBeDefined();
      expect(voiceSource!.type).toBe('internal');
    });

    it('should require verbal channel', () => {
      const verbalChannel = SONG_PARADIGM.channels.find(c => c.type === 'verbal');
      expect(verbalChannel).toBeDefined();
      expect(verbalChannel!.requirement).toBe('required');
    });

    it('should have discord risk', () => {
      const discordRisk = SONG_PARADIGM.risks.find(r => r.trigger === 'discord');
      expect(discordRisk).toBeDefined();
    });

    it('should have high group casting multiplier (choirs are powerful)', () => {
      expect(SONG_PARADIGM.allowsGroupCasting).toBe(true);
      expect(SONG_PARADIGM.groupCastingMultiplier).toBeGreaterThanOrEqual(5);
    });

    it('should allow scrolls (sheet music)', () => {
      expect(SONG_PARADIGM.allowsScrolls).toBe(true);
    });
  });

  describe('RUNE_PARADIGM (Symbol Magic)', () => {
    it('should have inscription source', () => {
      const inscriptionSource = RUNE_PARADIGM.sources.find(s => s.id === 'inscription');
      expect(inscriptionSource).toBeDefined();
      expect(inscriptionSource!.type).toBe('knowledge');
    });

    it('should require glyph channel', () => {
      const glyphChannel = RUNE_PARADIGM.channels.find(c => c.type === 'glyph');
      expect(glyphChannel).toBeDefined();
      expect(glyphChannel!.requirement).toBe('required');
    });

    it('should have imprecision risk', () => {
      const imprecisionRisk = RUNE_PARADIGM.risks.find(r => r.trigger === 'imprecision');
      expect(imprecisionRisk).toBeDefined();
    });

    it('should allow enchantment (runes ARE enchantment)', () => {
      expect(RUNE_PARADIGM.allowsEnchantment).toBe(true);
    });

    it('should persist after death (runes outlast carver)', () => {
      expect(RUNE_PARADIGM.persistsAfterDeath).toBe(true);
    });
  });

  describe('DAEMON_PARADIGM (His Dark Materials style)', () => {
    it('should have daemon_bond source', () => {
      const daemonBond = DAEMON_PARADIGM.sources.find(s => s.id === 'daemon_bond');
      expect(daemonBond).toBeDefined();
      expect(daemonBond!.detectability).toBe('obvious');
    });

    it('should have dust source', () => {
      const dustSource = DAEMON_PARADIGM.sources.find(s => s.id === 'dust');
      expect(dustSource).toBeDefined();
      expect(dustSource!.type).toBe('ambient');
    });

    it('should require daemon channel', () => {
      const daemonChannel = DAEMON_PARADIGM.channels.find(c => c.type === 'daemon');
      expect(daemonChannel).toBeDefined();
      expect(daemonChannel!.requirement).toBe('required');
    });

    it('should have consent law (daemon taboo)', () => {
      const consentLaw = DAEMON_PARADIGM.laws.find(l => l.type === 'consent');
      expect(consentLaw).toBeDefined();
      expect(consentLaw!.strictness).toBe('absolute');
    });

    it('should have severance risk', () => {
      const severanceRisk = DAEMON_PARADIGM.risks.find(r => r.trigger === 'severance');
      expect(severanceRisk).toBeDefined();
      expect(severanceRisk!.consequence).toBe('death');
    });

    it('should have separation risk', () => {
      const separationRisk = DAEMON_PARADIGM.risks.find(r => r.trigger === 'separation');
      expect(separationRisk).toBeDefined();
      expect(separationRisk!.probability).toBe(1.0);
    });
  });

  describe('ANIMIST_PARADIGM_REGISTRY', () => {
    it('should contain all animist paradigms', () => {
      expect(ANIMIST_PARADIGM_REGISTRY.shinto).toBe(SHINTO_PARADIGM);
      expect(ANIMIST_PARADIGM_REGISTRY.sympathy).toBe(SYMPATHY_PARADIGM);
      expect(ANIMIST_PARADIGM_REGISTRY.allomancy).toBe(ALLOMANCY_PARADIGM);
      expect(ANIMIST_PARADIGM_REGISTRY.dream).toBe(DREAM_PARADIGM);
      expect(ANIMIST_PARADIGM_REGISTRY.song).toBe(SONG_PARADIGM);
      expect(ANIMIST_PARADIGM_REGISTRY.rune).toBe(RUNE_PARADIGM);
      expect(ANIMIST_PARADIGM_REGISTRY.daemon).toBe(DAEMON_PARADIGM);
    });

    it('should have 7 paradigms', () => {
      expect(Object.keys(ANIMIST_PARADIGM_REGISTRY)).toHaveLength(7);
    });
  });

  describe('getAnimistParadigm', () => {
    it('should return paradigm by id', () => {
      const shinto = getAnimistParadigm('shinto');
      expect(shinto).toBe(SHINTO_PARADIGM);
    });

    it('should return undefined for unknown id', () => {
      const unknown = getAnimistParadigm('nonexistent');
      expect(unknown).toBeUndefined();
    });
  });

  describe('Kami System', () => {
    describe('EXAMPLE_KAMI', () => {
      it('should have multiple example kami', () => {
        expect(EXAMPLE_KAMI.length).toBeGreaterThanOrEqual(5);
      });

      it('should have varied kami types', () => {
        const types = new Set(EXAMPLE_KAMI.map(k => k.type));
        expect(types.size).toBeGreaterThanOrEqual(4);
      });

      it('should have properly structured kami', () => {
        EXAMPLE_KAMI.forEach(kami => {
          expect(kami.id).toBeTruthy();
          expect(kami.name).toBeTruthy();
          expect(kami.type).toBeTruthy();
          expect(kami.rank).toBeTruthy();
          expect(kami.domain).toBeTruthy();
          expect(kami.preferredOfferings.length).toBeGreaterThan(0);
          expect(kami.taboos.length).toBeGreaterThan(0);
          expect(kami.blessings.length).toBeGreaterThan(0);
          expect(kami.curses.length).toBeGreaterThan(0);
        });
      });
    });

    describe('getKamiTypes', () => {
      it('should return all kami types', () => {
        const types = getKamiTypes();
        expect(types).toContain('nature');
        expect(types).toContain('place');
        expect(types).toContain('object');
        expect(types).toContain('ancestor');
        expect(types).toContain('animal');
      });
    });

    describe('getKamiByType', () => {
      it('should return kami of specified type', () => {
        const natureKami = getKamiByType('nature');
        expect(natureKami.length).toBeGreaterThan(0);
        natureKami.forEach(k => expect(k.type).toBe('nature'));
      });

      it('should return empty array for type with no examples', () => {
        // Some types might not have examples
        const result = getKamiByType('food');
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe('Allomantic Metals System', () => {
    describe('ALLOMANTIC_METALS', () => {
      it('should have multiple metals', () => {
        expect(ALLOMANTIC_METALS.length).toBeGreaterThanOrEqual(8);
      });

      it('should have properly structured metals', () => {
        ALLOMANTIC_METALS.forEach(metal => {
          expect(metal.id).toBeTruthy();
          expect(metal.name).toBeTruthy();
          expect(['physical', 'mental', 'enhancement', 'temporal']).toContain(metal.type);
          expect(['push', 'pull']).toContain(metal.direction);
          expect(metal.effect).toBeTruthy();
          expect(['common', 'uncommon', 'rare', 'legendary']).toContain(metal.rarity);
        });
      });

      it('should include the base metals', () => {
        const metalNames = ALLOMANTIC_METALS.map(m => m.id);
        expect(metalNames).toContain('steel');
        expect(metalNames).toContain('iron');
        expect(metalNames).toContain('pewter');
        expect(metalNames).toContain('tin');
      });

      it('should include atium (legendary temporal metal)', () => {
        const atium = ALLOMANTIC_METALS.find(m => m.id === 'atium');
        expect(atium).toBeDefined();
        expect(atium!.type).toBe('temporal');
        expect(atium!.rarity).toBe('legendary');
      });
    });

    describe('getAllomanticMetals', () => {
      it('should return all metals', () => {
        const metals = getAllomanticMetals();
        expect(metals).toEqual(ALLOMANTIC_METALS);
      });
    });

    describe('getMetalsByType', () => {
      it('should return physical metals', () => {
        const physicalMetals = getMetalsByType('physical');
        expect(physicalMetals.length).toBeGreaterThan(0);
        physicalMetals.forEach(m => expect(m.type).toBe('physical'));
      });

      it('should return mental metals', () => {
        const mentalMetals = getMetalsByType('mental');
        expect(mentalMetals.length).toBeGreaterThan(0);
        mentalMetals.forEach(m => expect(m.type).toBe('mental'));
      });

      it('should return enhancement metals', () => {
        const enhancementMetals = getMetalsByType('enhancement');
        expect(enhancementMetals.length).toBeGreaterThan(0);
      });

      it('should return temporal metals', () => {
        const temporalMetals = getMetalsByType('temporal');
        expect(temporalMetals.length).toBeGreaterThan(0);
      });
    });
  });
});
