import { describe, it, expect } from 'vitest';
import {
  CORE_PARADIGM_REGISTRY,
  ANIMIST_PARADIGM_REGISTRY,
  WHIMSICAL_PARADIGM_REGISTRY,
  NULL_PARADIGM_REGISTRY,
  DIMENSIONAL_PARADIGM_REGISTRY,
  POWER_TIER_THRESHOLDS,
  BELIEF_GENERATION_RATES,
  type MagicParadigm,
  type PowerTier,
} from '@ai-village/core';

/**
 * Tests for DevPanel paradigm generation.
 *
 * These tests verify that:
 * 1. All paradigm registries are properly configured
 * 2. The paradigm data structure is complete
 * 3. DevPanel can dynamically load paradigms from registries
 */

describe('DevPanel Paradigm Generation', () => {
  // Gather all registries
  const ALL_REGISTRIES: Record<string, Record<string, MagicParadigm>> = {
    core: CORE_PARADIGM_REGISTRY,
    animist: ANIMIST_PARADIGM_REGISTRY,
    whimsical: WHIMSICAL_PARADIGM_REGISTRY,
    null: NULL_PARADIGM_REGISTRY,
    dimensional: DIMENSIONAL_PARADIGM_REGISTRY,
  };

  describe('Registry Structure', () => {
    it('should have non-empty registries', () => {
      for (const [name, registry] of Object.entries(ALL_REGISTRIES)) {
        const paradigmCount = Object.keys(registry).length;
        expect(paradigmCount).toBeGreaterThan(0);
      }
    });

    it('should have unique paradigm IDs across all registries', () => {
      const seenIds = new Set<string>();
      const duplicates: string[] = [];

      for (const registry of Object.values(ALL_REGISTRIES)) {
        for (const paradigm of Object.values(registry)) {
          if (seenIds.has(paradigm.id)) {
            duplicates.push(paradigm.id);
          }
          seenIds.add(paradigm.id);
        }
      }

      expect(duplicates).toEqual([]);
    });

    it('should have at least 25 total paradigms', () => {
      let totalCount = 0;
      for (const registry of Object.values(ALL_REGISTRIES)) {
        totalCount += Object.keys(registry).length;
      }

      expect(totalCount).toBeGreaterThanOrEqual(25);
    });
  });

  describe('Paradigm Data Completeness', () => {
    for (const [registryName, registry] of Object.entries(ALL_REGISTRIES)) {
      describe(`${registryName} registry`, () => {
        for (const [key, paradigm] of Object.entries(registry)) {
          describe(`paradigm: ${paradigm.id}`, () => {
            it('should have required fields', () => {
              expect(paradigm.id).toBeDefined();
              expect(paradigm.id).toBe(key);
              expect(paradigm.name).toBeDefined();
              expect(paradigm.name.length).toBeGreaterThan(0);
            });

            it('should have description and lore', () => {
              expect(paradigm.description).toBeDefined();
              expect(paradigm.description.length).toBeGreaterThan(0);
              expect(paradigm.lore).toBeDefined();
              expect(paradigm.lore.length).toBeGreaterThan(0);
            });

            it('should have sources array', () => {
              expect(paradigm.sources).toBeDefined();
              expect(Array.isArray(paradigm.sources)).toBe(true);
            });

            it('should have costs array', () => {
              expect(paradigm.costs).toBeDefined();
              expect(Array.isArray(paradigm.costs)).toBe(true);
            });

            it('should have channels array', () => {
              expect(paradigm.channels).toBeDefined();
              expect(Array.isArray(paradigm.channels)).toBe(true);
            });

            it('should have laws array', () => {
              expect(paradigm.laws).toBeDefined();
              expect(Array.isArray(paradigm.laws)).toBe(true);
            });

            it('should have risks array', () => {
              expect(paradigm.risks).toBeDefined();
              expect(Array.isArray(paradigm.risks)).toBe(true);
            });

            it('should have acquisitionMethods array', () => {
              expect(paradigm.acquisitionMethods).toBeDefined();
              expect(Array.isArray(paradigm.acquisitionMethods)).toBe(true);
            });

            it('should have availableTechniques array', () => {
              expect(paradigm.availableTechniques).toBeDefined();
              expect(Array.isArray(paradigm.availableTechniques)).toBe(true);
            });

            it('should have availableForms array', () => {
              expect(paradigm.availableForms).toBeDefined();
              expect(Array.isArray(paradigm.availableForms)).toBe(true);
            });
          });
        }
      });
    }
  });

  describe('Core Paradigms', () => {
    it('should include academic magic', () => {
      expect(CORE_PARADIGM_REGISTRY.academic).toBeDefined();
      expect(CORE_PARADIGM_REGISTRY.academic.name).toBe('The Academies');
    });

    it('should include pact magic', () => {
      expect(CORE_PARADIGM_REGISTRY.pact).toBeDefined();
      expect(CORE_PARADIGM_REGISTRY.pact.name).toBe('The Pacts');
    });

    it('should include name magic', () => {
      expect(CORE_PARADIGM_REGISTRY.names).toBeDefined();
      expect(CORE_PARADIGM_REGISTRY.names.name).toBe('The Deep Grammar');
    });

    it('should include breath magic', () => {
      expect(CORE_PARADIGM_REGISTRY.breath).toBeDefined();
    });

    it('should include divine magic', () => {
      expect(CORE_PARADIGM_REGISTRY.divine).toBeDefined();
      expect(CORE_PARADIGM_REGISTRY.divine.name).toBe('The Faithful');
    });

    it('should include blood magic', () => {
      expect(CORE_PARADIGM_REGISTRY.blood).toBeDefined();
      expect(CORE_PARADIGM_REGISTRY.blood.name).toBe('The Crimson Art');
    });

    it('should include emotional magic', () => {
      expect(CORE_PARADIGM_REGISTRY.emotional).toBeDefined();
      expect(CORE_PARADIGM_REGISTRY.emotional.name).toBe('The Passionate');
    });
  });

  describe('Null Paradigms', () => {
    it('should include null magic (magic extinction)', () => {
      expect(NULL_PARADIGM_REGISTRY.null).toBeDefined();
    });

    it('should include anti-magic', () => {
      expect(NULL_PARADIGM_REGISTRY.anti).toBeDefined();
    });

    it('should include tech supremacy', () => {
      expect(NULL_PARADIGM_REGISTRY.tech_supremacy).toBeDefined();
    });
  });

  describe('Whimsical Paradigms', () => {
    it('should include talent magic', () => {
      expect(WHIMSICAL_PARADIGM_REGISTRY.talent).toBeDefined();
    });

    it('should include narrative magic', () => {
      expect(WHIMSICAL_PARADIGM_REGISTRY.narrative).toBeDefined();
    });

    it('should include wild magic', () => {
      expect(WHIMSICAL_PARADIGM_REGISTRY.wild).toBeDefined();
    });
  });

  describe('Dimensional Paradigms', () => {
    it('should include dimensional magic', () => {
      expect(DIMENSIONAL_PARADIGM_REGISTRY.dimension).toBeDefined();
    });

    it('should include escalation magic', () => {
      expect(DIMENSIONAL_PARADIGM_REGISTRY.escalation).toBeDefined();
    });

    it('should include corruption magic', () => {
      expect(DIMENSIONAL_PARADIGM_REGISTRY.corruption_crown).toBeDefined();
    });
  });

  describe('Animist Paradigms', () => {
    it('should include daemon magic', () => {
      expect(ANIMIST_PARADIGM_REGISTRY.daemon).toBeDefined();
    });

    it('should include sympathy magic', () => {
      expect(ANIMIST_PARADIGM_REGISTRY.sympathy).toBeDefined();
    });

    it('should include allomancy', () => {
      expect(ANIMIST_PARADIGM_REGISTRY.allomancy).toBeDefined();
    });
  });
});

describe('DevPanel Divine Resource Generation', () => {
  describe('Power Tier Thresholds', () => {
    it('should have all power tiers defined', () => {
      const expectedTiers: PowerTier[] = ['dormant', 'minor', 'moderate', 'major', 'supreme', 'world_shaping'];
      for (const tier of expectedTiers) {
        expect(POWER_TIER_THRESHOLDS[tier]).toBeDefined();
        expect(typeof POWER_TIER_THRESHOLDS[tier]).toBe('number');
      }
    });

    it('should have ascending thresholds', () => {
      expect(POWER_TIER_THRESHOLDS.dormant).toBeLessThan(POWER_TIER_THRESHOLDS.minor);
      expect(POWER_TIER_THRESHOLDS.minor).toBeLessThan(POWER_TIER_THRESHOLDS.moderate);
      expect(POWER_TIER_THRESHOLDS.moderate).toBeLessThan(POWER_TIER_THRESHOLDS.major);
      expect(POWER_TIER_THRESHOLDS.major).toBeLessThan(POWER_TIER_THRESHOLDS.supreme);
      expect(POWER_TIER_THRESHOLDS.supreme).toBeLessThan(POWER_TIER_THRESHOLDS.world_shaping);
    });

    it('should have dormant at 0', () => {
      expect(POWER_TIER_THRESHOLDS.dormant).toBe(0);
    });

    it('should have world_shaping at 5000+', () => {
      expect(POWER_TIER_THRESHOLDS.world_shaping).toBeGreaterThanOrEqual(5000);
    });
  });

  describe('Belief Generation Rates', () => {
    it('should have all belief activities defined', () => {
      const expectedActivities = [
        'passive_faith',
        'prayer',
        'meditation',
        'ritual',
        'sacrifice',
        'pilgrimage',
        'proselytizing',
        'creation',
        'miracle_witness',
      ];

      for (const activity of expectedActivities) {
        expect(BELIEF_GENERATION_RATES[activity as keyof typeof BELIEF_GENERATION_RATES]).toBeDefined();
        expect(typeof BELIEF_GENERATION_RATES[activity as keyof typeof BELIEF_GENERATION_RATES]).toBe('number');
      }
    });

    it('should have ascending rates from passive to miracle', () => {
      expect(BELIEF_GENERATION_RATES.passive_faith).toBeLessThan(BELIEF_GENERATION_RATES.prayer);
      expect(BELIEF_GENERATION_RATES.prayer).toBeLessThan(BELIEF_GENERATION_RATES.miracle_witness);
    });

    it('should have miracle_witness as highest rate', () => {
      const maxRate = Math.max(...Object.values(BELIEF_GENERATION_RATES));
      expect(BELIEF_GENERATION_RATES.miracle_witness).toBe(maxRate);
    });

    it('should have passive_faith as lowest rate', () => {
      const minRate = Math.min(...Object.values(BELIEF_GENERATION_RATES));
      expect(BELIEF_GENERATION_RATES.passive_faith).toBe(minRate);
    });
  });
});
