import { describe, it, expect } from 'vitest';
import {
  ALL_RACE_TEMPLATES,
  RACE_REGISTRY,
  COMMON_TRAITS,
  getRaceTemplate,
  getRacesByRealm,
  getRacesByType,
  canHybridize,
  getRaceTraits,
  getRaceSkillBonuses,
  getRaceNeedsMultipliers,
  getRaceAbilities,
  getRaceVulnerabilities,
  HUMAN_RACE,
  SIDHE_RACE,
  OLYMPIAN_RACE,
  EINHERJAR_RACE,
  EFREET_RACE,
  SHADE_RACE,
} from '../RaceTemplates.js';

describe('RaceTemplates', () => {
  describe('Race Registry', () => {
    it('should have all races in the registry', () => {
      expect(ALL_RACE_TEMPLATES.length).toBeGreaterThan(0);
      expect(Object.keys(RACE_REGISTRY).length).toBe(ALL_RACE_TEMPLATES.length);
    });

    it('should have unique IDs for all races', () => {
      const ids = ALL_RACE_TEMPLATES.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should register races by ID correctly', () => {
      for (const race of ALL_RACE_TEMPLATES) {
        expect(RACE_REGISTRY[race.id]).toBe(race);
      }
    });
  });

  describe('getRaceTemplate', () => {
    it('should return race by ID', () => {
      expect(getRaceTemplate('human')).toBe(HUMAN_RACE);
      expect(getRaceTemplate('sidhe')).toBe(SIDHE_RACE);
      expect(getRaceTemplate('olympian')).toBe(OLYMPIAN_RACE);
    });

    it('should return undefined for unknown race', () => {
      expect(getRaceTemplate('unknown_race')).toBeUndefined();
    });
  });

  describe('getRacesByRealm', () => {
    it('should return races native to Olympus', () => {
      const olympusRaces = getRacesByRealm('olympus');
      expect(olympusRaces.length).toBeGreaterThan(0);
      expect(olympusRaces).toContain(OLYMPIAN_RACE);
      olympusRaces.forEach(race => {
        expect(race.nativeRealm).toBe('olympus');
      });
    });

    it('should return races native to Faerie', () => {
      const faerieRaces = getRacesByRealm('faerie');
      expect(faerieRaces.length).toBeGreaterThan(0);
      expect(faerieRaces).toContain(SIDHE_RACE);
      faerieRaces.forEach(race => {
        expect(race.nativeRealm).toBe('faerie');
      });
    });

    it('should return mortal world races', () => {
      const mortalRaces = getRacesByRealm('mortal_world');
      expect(mortalRaces).toContain(HUMAN_RACE);
    });
  });

  describe('getRacesByType', () => {
    it('should return divine races', () => {
      const divineRaces = getRacesByType('divine');
      expect(divineRaces.length).toBeGreaterThan(0);
      expect(divineRaces).toContain(OLYMPIAN_RACE);
      divineRaces.forEach(race => {
        expect(race.type).toBe('divine');
      });
    });

    it('should return fae races', () => {
      const faeRaces = getRacesByType('fae');
      expect(faeRaces.length).toBeGreaterThan(0);
      expect(faeRaces).toContain(SIDHE_RACE);
    });

    it('should return undead races', () => {
      const undeadRaces = getRacesByType('undead');
      expect(undeadRaces.length).toBeGreaterThan(0);
      expect(undeadRaces).toContain(EINHERJAR_RACE);
      expect(undeadRaces).toContain(SHADE_RACE);
    });

    it('should return elemental races', () => {
      const elementalRaces = getRacesByType('elemental');
      expect(elementalRaces.length).toBeGreaterThan(0);
      expect(elementalRaces).toContain(EFREET_RACE);
    });
  });

  describe('canHybridize', () => {
    it('should allow human-olympian hybrids (demigods)', () => {
      expect(canHybridize('human', 'olympian')).toBe(true);
      expect(canHybridize('olympian', 'human')).toBe(true);
    });

    it('should allow human-sidhe hybrids (changelings)', () => {
      expect(canHybridize('human', 'sidhe')).toBe(true);
    });

    it('should not allow shade hybrids (undead cannot reproduce)', () => {
      expect(canHybridize('shade', 'human')).toBe(false);
    });

    it('should not allow pixie hybrids', () => {
      expect(canHybridize('pixie', 'human')).toBe(false);
    });

    it('should return false for unknown races', () => {
      expect(canHybridize('unknown', 'human')).toBe(false);
      expect(canHybridize('human', 'unknown')).toBe(false);
    });
  });

  describe('getRaceTraits', () => {
    it('should return traits for Sidhe', () => {
      const traits = getRaceTraits('sidhe');
      expect(traits.length).toBeGreaterThan(0);

      const traitIds = traits.map(t => t.id);
      expect(traitIds).toContain('glamour');
      expect(traitIds).toContain('oath_bound');
      expect(traitIds).toContain('iron_weakness');
    });

    it('should return traits for humans', () => {
      const traits = getRaceTraits('human');
      expect(traits.length).toBeGreaterThan(0);

      const traitIds = traits.map(t => t.id);
      expect(traitIds).toContain('adaptability');
    });

    it('should return empty array for unknown race', () => {
      const traits = getRaceTraits('unknown_race');
      expect(traits).toEqual([]);
    });
  });

  describe('getRaceSkillBonuses', () => {
    it('should return skill bonuses for humans (adaptability)', () => {
      const bonuses = getRaceSkillBonuses('human');
      // Humans have +0.1 to all skills from adaptability
      expect(bonuses.building).toBe(0.1);
      expect(bonuses.farming).toBe(0.1);
      expect(bonuses.combat).toBe(0.1);
    });

    it('should return skill bonuses for Sidhe (glamour = social bonus)', () => {
      const bonuses = getRaceSkillBonuses('sidhe');
      expect(bonuses.social).toBe(0.3);
    });

    it('should return combined bonuses for races with multiple skill traits', () => {
      const bonuses = getRaceSkillBonuses('einherjar');
      // Enhanced strength (+0.3 combat, +0.2 building) + eternal warrior (+0.5 combat)
      expect(bonuses.combat).toBe(0.8);
      expect(bonuses.building).toBe(0.2);
    });
  });

  describe('getRaceNeedsMultipliers', () => {
    it('should return needs multipliers for pixies (tiny form = less hunger)', () => {
      const multipliers = getRaceNeedsMultipliers('pixie');
      expect(multipliers.hunger).toBe(0.5);
    });

    it('should return needs multipliers for shades (no physical needs)', () => {
      const multipliers = getRaceNeedsMultipliers('shade');
      expect(multipliers.hunger).toBe(0);
      expect(multipliers.thirst).toBe(0);
    });

    it('should return empty for races without need modifiers', () => {
      const multipliers = getRaceNeedsMultipliers('human');
      expect(Object.keys(multipliers).length).toBe(0);
    });
  });

  describe('getRaceAbilities', () => {
    it('should return abilities for Sidhe', () => {
      const abilities = getRaceAbilities('sidhe');
      expect(abilities).toContain('glamour');
      expect(abilities).toContain('illusion');
      expect(abilities).toContain('oath_bound');
    });

    it('should return abilities for Valkyrie', () => {
      const abilities = getRaceAbilities('valkyrie');
      expect(abilities).toContain('flight');
      expect(abilities).toContain('soul_sight');
      expect(abilities).toContain('soul_collection');
    });

    it('should deduplicate abilities', () => {
      const abilities = getRaceAbilities('olympian');
      const uniqueAbilities = new Set(abilities);
      expect(abilities.length).toBe(uniqueAbilities.size);
    });
  });

  describe('getRaceVulnerabilities', () => {
    it('should return iron weakness for Sidhe', () => {
      const vulnerabilities = getRaceVulnerabilities('sidhe');
      expect(vulnerabilities).toContain('cold_iron');
    });

    it('should return true name vulnerability for Sidhe', () => {
      const vulnerabilities = getRaceVulnerabilities('sidhe');
      expect(vulnerabilities).toContain('true_name');
    });

    it('should return empty for races without vulnerabilities', () => {
      const vulnerabilities = getRaceVulnerabilities('olympian');
      expect(vulnerabilities.length).toBe(0);
    });
  });

  describe('Common Traits', () => {
    it('should have flight trait with correct properties', () => {
      const flight = COMMON_TRAITS.flight;
      expect(flight).toBeDefined();
      expect(flight!.category).toBe('physical');
      expect(flight!.effects?.abilitiesGranted).toContain('flight');
      expect(flight!.effects?.movementMultiplier).toBe(1.5);
    });

    it('should have glamour trait with correct properties', () => {
      const glamour = COMMON_TRAITS.glamour;
      expect(glamour).toBeDefined();
      expect(glamour!.category).toBe('magical');
      expect(glamour!.effects?.abilitiesGranted).toContain('glamour');
      expect(glamour!.effects?.skillAffinityBonus?.social).toBe(0.3);
    });

    it('should have iron_weakness trait with vulnerability', () => {
      const ironWeakness = COMMON_TRAITS.iron_weakness;
      expect(ironWeakness).toBeDefined();
      expect(ironWeakness!.effects?.vulnerabilities).toContain('cold_iron');
    });
  });

  describe('Race Properties Validation', () => {
    it('should have valid lifespan types', () => {
      const validLifespans = ['mortal', 'long_lived', 'ageless', 'immortal'];
      for (const race of ALL_RACE_TEMPLATES) {
        expect(validLifespans).toContain(race.lifespan);
      }
    });

    it('should have lifespanYears for mortal and long_lived races', () => {
      const racesNeedingYears = ALL_RACE_TEMPLATES.filter(
        r => r.lifespan === 'mortal' || r.lifespan === 'long_lived'
      );
      for (const race of racesNeedingYears) {
        expect(race.lifespanYears).toBeDefined();
        expect(race.lifespanYears).toBeGreaterThan(0);
      }
    });

    it('should have valid realm references', () => {
      const validRealms = [
        'olympus', 'faerie', 'hades', 'asgard', 'valhalla',
        'heaven', 'dreaming', 'elemental_fire', 'mortal_world',
        'crossroads', 'avalon',
      ];
      for (const race of ALL_RACE_TEMPLATES) {
        expect(validRealms).toContain(race.nativeRealm);
      }
    });

    it('should have at least one trait per race', () => {
      for (const race of ALL_RACE_TEMPLATES) {
        expect(race.innateTraits.length).toBeGreaterThan(0);
      }
    });

    it('should have valid hybridCompatible references', () => {
      for (const race of ALL_RACE_TEMPLATES) {
        if (race.canHybridize && race.hybridCompatible.length > 0) {
          for (const compatibleId of race.hybridCompatible) {
            // Either it's in our registry or it's a known race type (like 'elf', 'jotun')
            const knownRaces = [...Object.keys(RACE_REGISTRY), 'elf', 'jotun'];
            expect(knownRaces).toContain(compatibleId);
          }
        }
      }
    });

    it('should not have hybridCompatible if canHybridize is false', () => {
      for (const race of ALL_RACE_TEMPLATES) {
        if (!race.canHybridize) {
          expect(race.hybridCompatible.length).toBe(0);
        }
      }
    });
  });

  describe('Specific Race Tests', () => {
    describe('Human Race', () => {
      it('should be mortal with 80 year lifespan', () => {
        expect(HUMAN_RACE.lifespan).toBe('mortal');
        expect(HUMAN_RACE.lifespanYears).toBe(80);
      });

      it('should be native to mortal world', () => {
        expect(HUMAN_RACE.nativeRealm).toBe('mortal_world');
      });

      it('should be highly adaptable (bonus to all skills)', () => {
        const bonuses = getRaceSkillBonuses('human');
        const skills = ['building', 'farming', 'gathering', 'cooking', 'crafting',
                       'social', 'exploration', 'combat', 'animal_handling', 'medicine'];
        for (const skill of skills) {
          expect(bonuses[skill as keyof typeof bonuses]).toBe(0.1);
        }
      });
    });

    describe('Sidhe Race', () => {
      it('should be ageless fae', () => {
        expect(SIDHE_RACE.lifespan).toBe('ageless');
        expect(SIDHE_RACE.type).toBe('fae');
      });

      it('should have iron weakness and true name vulnerability', () => {
        const vulnerabilities = getRaceVulnerabilities('sidhe');
        expect(vulnerabilities).toContain('cold_iron');
        expect(vulnerabilities).toContain('true_name');
      });

      it('should be able to survive mortal world with weakness', () => {
        expect(SIDHE_RACE.canSurviveMortalWorld).toBe(true);
        expect(SIDHE_RACE.mortalWorldWeakness).toBeDefined();
      });
    });

    describe('Einherjar Race', () => {
      it('should be undead warriors who revive daily', () => {
        expect(EINHERJAR_RACE.type).toBe('undead');
        const abilities = getRaceAbilities('einherjar');
        expect(abilities).toContain('daily_revival');
      });

      it('should be realm-bound to Valhalla', () => {
        expect(EINHERJAR_RACE.realmBound).toBe(true);
        expect(EINHERJAR_RACE.nativeRealm).toBe('valhalla');
        expect(EINHERJAR_RACE.canSurviveMortalWorld).toBe(false);
      });
    });

    describe('Shade Race', () => {
      it('should have no physical needs', () => {
        const multipliers = getRaceNeedsMultipliers('shade');
        expect(multipliers.hunger).toBe(0);
        expect(multipliers.thirst).toBe(0);
      });

      it('should be incorporeal', () => {
        const abilities = getRaceAbilities('shade');
        expect(abilities).toContain('incorporeal');
      });

      it('should be realm-bound to Hades', () => {
        expect(SHADE_RACE.realmBound).toBe(true);
        expect(SHADE_RACE.nativeRealm).toBe('hades');
      });
    });
  });
});
