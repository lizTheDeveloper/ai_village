/**
 * Research Sets Integration Tests
 *
 * Tests the N-of-M research unlock logic where researchers must discover
 * N papers from a set of M to unlock technologies. This mimics real research
 * where you don't know which papers are crucial until technologies unlock.
 *
 * Validates:
 * - N-of-M unlock thresholds work correctly
 * - Mandatory papers are enforced
 * - Multiple technologies can unlock from same paper set
 * - Progressive unlocks (tier I → tier II → tier III)
 * - Technology progress tracking is accurate
 * - Edge cases (no papers, partial progress, over-completion)
 */

import { describe, it, expect } from 'vitest';
import {
  isTechnologyUnlocked,
  getUnlockedTechnologies,
  getTechnologyProgress,
} from '../research-sets.js';

describe('Research Sets Integration - N-of-M Unlock Logic', () => {
  describe('Basic Agriculture Set (7 papers)', () => {
    // agriculture_i: needs 2 of 7 papers (mandatory: seed_selection)
    // agriculture_ii: needs 4 of 7 papers (mandatory: irrigation_principles, fertilization_theory)
    // greenhouse_cultivation: needs 6 of 7 papers (mandatory: climate_control, year_round_growing)

    it('should not unlock agriculture_i with only 1 paper', () => {
      const published = new Set(['seed_selection']);
      expect(isTechnologyUnlocked('agriculture_i', published)).toBe(false);
    });

    it('should unlock agriculture_i with mandatory paper + 1 other', () => {
      const published = new Set(['seed_selection', 'soil_preparation']);
      expect(isTechnologyUnlocked('agriculture_i', published)).toBe(true);
    });

    it('should not unlock agriculture_i without mandatory paper', () => {
      const published = new Set(['soil_preparation', 'irrigation_principles']);
      expect(isTechnologyUnlocked('agriculture_i', published)).toBe(false);
    });

    it('should not unlock agriculture_ii without both mandatory papers', () => {
      // Has irrigation_principles but missing fertilization_theory
      const published = new Set([
        'seed_selection',
        'soil_preparation',
        'irrigation_principles',
        'crop_rotation',
      ]);
      expect(isTechnologyUnlocked('agriculture_ii', published)).toBe(false);
    });

    it('should unlock agriculture_ii with 4 papers including both mandatory', () => {
      const published = new Set([
        'seed_selection',
        'soil_preparation',
        'irrigation_principles',
        'fertilization_theory',
      ]);
      expect(isTechnologyUnlocked('agriculture_ii', published)).toBe(true);
    });

    it('should unlock greenhouse_cultivation with 6 of 7 papers', () => {
      const published = new Set([
        'seed_selection',
        'soil_preparation',
        'irrigation_principles',
        'fertilization_theory',
        'climate_control',
        'year_round_growing',
      ]);
      expect(isTechnologyUnlocked('greenhouse_cultivation', published)).toBe(
        true
      );
    });

    it('should unlock multiple techs progressively as papers accumulate', () => {
      let published = new Set<string>([]);

      // No papers → nothing unlocked
      expect(isTechnologyUnlocked('agriculture_i', published)).toBe(false);
      expect(isTechnologyUnlocked('agriculture_ii', published)).toBe(false);
      expect(isTechnologyUnlocked('greenhouse_cultivation', published)).toBe(
        false
      );

      // 2 papers → agriculture_i unlocks
      published = new Set(['seed_selection', 'soil_preparation']);
      expect(isTechnologyUnlocked('agriculture_i', published)).toBe(true);
      expect(isTechnologyUnlocked('agriculture_ii', published)).toBe(false);

      // 4 papers → agriculture_ii unlocks
      published = new Set([
        'seed_selection',
        'soil_preparation',
        'irrigation_principles',
        'fertilization_theory',
      ]);
      expect(isTechnologyUnlocked('agriculture_i', published)).toBe(true);
      expect(isTechnologyUnlocked('agriculture_ii', published)).toBe(true);
      expect(isTechnologyUnlocked('greenhouse_cultivation', published)).toBe(
        false
      );

      // 6 papers → greenhouse_cultivation unlocks
      published = new Set([
        'seed_selection',
        'soil_preparation',
        'irrigation_principles',
        'fertilization_theory',
        'climate_control',
        'year_round_growing',
      ]);
      expect(isTechnologyUnlocked('agriculture_i', published)).toBe(true);
      expect(isTechnologyUnlocked('agriculture_ii', published)).toBe(true);
      expect(isTechnologyUnlocked('greenhouse_cultivation', published)).toBe(
        true
      );
    });
  });

  describe('Basic Metallurgy Set (9 papers)', () => {
    // basic_metallurgy: needs 3 of 9 (mandatory: smelting_fundamentals)
    // iron_age: needs 6 of 9 (mandatory: iron_working)

    it('should unlock basic_metallurgy with 3 papers including mandatory', () => {
      const published = new Set([
        'smelting_fundamentals',
        'ore_identification',
        'mining_techniques',
      ]);
      expect(isTechnologyUnlocked('basic_metallurgy', published)).toBe(true);
    });

    it('should not unlock basic_metallurgy with 3 papers but missing mandatory', () => {
      const published = new Set([
        'ore_identification',
        'iron_working',
        'mining_techniques',
      ]);
      expect(isTechnologyUnlocked('basic_metallurgy', published)).toBe(false);
    });

    it('should unlock iron_age with 6 of 9 papers', () => {
      const published = new Set([
        'smelting_fundamentals',
        'ore_identification',
        'iron_working',
        'mining_techniques',
        'forge_construction',
        'bellows_operation',
      ]);
      expect(isTechnologyUnlocked('iron_age', published)).toBe(true);
    });

    it('should not unlock iron_age without mandatory iron_working', () => {
      const published = new Set([
        'smelting_fundamentals',
        'ore_identification',
        'mining_techniques',
        'forge_construction',
        'bellows_operation',
        'tool_maintenance',
      ]);
      expect(isTechnologyUnlocked('iron_age', published)).toBe(false);
    });
  });

  describe('Advanced Metallurgy Set (12 papers)', () => {
    // steel_forging: needs 4 of 12 (mandatory: carbon_infusion)
    // advanced_alloys: needs 7 of 12 (mandatory: alloy_theory)
    // legendary_metals: needs 10 of 12 (mandatory: legendary_metallurgy)

    it('should unlock steel_forging with 4 of 12 papers', () => {
      const published = new Set([
        'carbon_infusion',
        'quenching_theory',
        'pattern_welding',
        'hardness_testing',
      ]);
      expect(isTechnologyUnlocked('steel_forging', published)).toBe(true);
    });

    it('should unlock advanced_alloys with 7 of 12 papers', () => {
      const published = new Set([
        'carbon_infusion',
        'quenching_theory',
        'alloy_theory',
        'pattern_welding',
        'hardness_testing',
        'grain_structure',
        'temperature_precision',
      ]);
      expect(isTechnologyUnlocked('advanced_alloys', published)).toBe(true);
    });

    it('should unlock legendary_metals with 10 of 12 papers', () => {
      const published = new Set([
        'carbon_infusion',
        'quenching_theory',
        'alloy_theory',
        'pattern_welding',
        'hardness_testing',
        'grain_structure',
        'temperature_precision',
        'surface_finishing',
        'wire_drawing',
        'legendary_metallurgy',
      ]);
      expect(isTechnologyUnlocked('legendary_metals', published)).toBe(true);
    });

    it('should unlock all three techs with all 12 papers', () => {
      const published = new Set([
        'carbon_infusion',
        'quenching_theory',
        'alloy_theory',
        'pattern_welding',
        'hardness_testing',
        'grain_structure',
        'temperature_precision',
        'surface_finishing',
        'wire_drawing',
        'metal_casting',
        'tool_steel',
        'legendary_metallurgy',
      ]);
      expect(isTechnologyUnlocked('steel_forging', published)).toBe(true);
      expect(isTechnologyUnlocked('advanced_alloys', published)).toBe(true);
      expect(isTechnologyUnlocked('legendary_metals', published)).toBe(true);
    });
  });

  describe('Basic Alchemy Set (9 papers)', () => {
    // basic_alchemy: needs 3 of 9 (mandatory: substance_identification)
    // advanced_alchemy: needs 6 of 9 (mandatory: mixture_theory)

    it('should unlock basic_alchemy with 3 of 9 papers', () => {
      const published = new Set([
        'substance_identification',
        'extraction_methods',
        'crystallization_methods',
      ]);
      expect(isTechnologyUnlocked('basic_alchemy', published)).toBe(true);
    });

    it('should unlock advanced_alchemy with 6 of 9 papers', () => {
      const published = new Set([
        'substance_identification',
        'extraction_methods',
        'mixture_theory',
        'crystallization_methods',
        'sublimation_techniques',
        'solution_preparation',
      ]);
      expect(isTechnologyUnlocked('advanced_alchemy', published)).toBe(true);
    });
  });

  describe('Advanced Alchemy Set (9 papers)', () => {
    // medicine: needs 3 of 9 (mandatory: potion_formulation)
    // transmutation: needs 5 of 9 (mandatory: transmutation_principles)
    // legendary_alchemy: needs 8 of 9 (mandatory: grand_alchemy)

    it('should unlock medicine with 3 of 9 papers', () => {
      const published = new Set([
        'potion_formulation',
        'tincture_preparation',
        'medicinal_herbs',
      ]);
      expect(isTechnologyUnlocked('medicine', published)).toBe(true);
    });

    it('should unlock transmutation with 5 of 9 papers', () => {
      const published = new Set([
        'potion_formulation',
        'transmutation_principles',
        'tincture_preparation',
        'medicinal_herbs',
        'poison_recognition',
      ]);
      expect(isTechnologyUnlocked('transmutation', published)).toBe(true);
    });

    it('should unlock legendary_alchemy with 8 of 9 papers', () => {
      const published = new Set([
        'potion_formulation',
        'transmutation_principles',
        'grand_alchemy',
        'tincture_preparation',
        'medicinal_herbs',
        'poison_recognition',
        'antidote_formulation',
        'distillation_cycles',
      ]);
      expect(isTechnologyUnlocked('legendary_alchemy', published)).toBe(true);
    });
  });

  describe('Rune Magic Set (18 papers)', () => {
    // basic_runes: needs 4 of 18 (mandatory: symbol_recognition)
    // intermediate_runes: needs 10 of 18 (mandatory: rune_combinations, activation_methods)
    // elder_runes: needs 16 of 18 (mandatory: elder_runes)

    it('should unlock basic_runes with 4 of 18 papers', () => {
      const published = new Set([
        'symbol_recognition',
        'carving_fundamentals',
        'material_sympathies',
        'chromatic_runecraft',
      ]);
      expect(isTechnologyUnlocked('basic_runes', published)).toBe(true);
    });

    it('should unlock intermediate_runes with 10 of 18 papers', () => {
      const published = new Set([
        'symbol_recognition',
        'carving_fundamentals',
        'material_sympathies',
        'rune_combinations',
        'activation_methods',
        'chromatic_runecraft',
        'geometric_patterns',
        'phonetic_activation',
        'rune_syntax',
        'protective_wards',
      ]);
      expect(isTechnologyUnlocked('intermediate_runes', published)).toBe(true);
    });

    it('should not unlock intermediate_runes without both mandatory papers', () => {
      // Has rune_combinations but missing activation_methods
      const published = new Set([
        'symbol_recognition',
        'carving_fundamentals',
        'material_sympathies',
        'rune_combinations',
        'chromatic_runecraft',
        'geometric_patterns',
        'phonetic_activation',
        'rune_syntax',
        'protective_wards',
        'rune_erasure',
      ]);
      expect(isTechnologyUnlocked('intermediate_runes', published)).toBe(false);
    });

    it('should unlock elder_runes with 16 of 18 papers', () => {
      const allPapers = [
        'symbol_recognition',
        'carving_fundamentals',
        'material_sympathies',
        'rune_combinations',
        'activation_methods',
        'chromatic_runecraft',
        'geometric_patterns',
        'phonetic_activation',
        'rune_syntax',
        'protective_wards',
        'rune_erasure',
        'rune_amplification',
        'temporal_inscription',
        'layered_runes',
        'binding_inscriptions',
        'sympathetic_linking',
        'runic_arrays',
        'elder_runes',
      ];
      // Take 16 of 18
      const published = new Set(allPapers.slice(0, 16));
      // Make sure elder_runes is included
      published.add('elder_runes');
      const firstPaper = allPapers[0];
      if (firstPaper) {
        published.delete(firstPaper); // Remove one non-mandatory
      }

      expect(isTechnologyUnlocked('elder_runes', published)).toBe(true);
    });
  });

  describe('getUnlockedTechnologies - Multiple Tech Tracking', () => {
    it('should return empty array with no papers published', () => {
      const published = new Set<string>([]);
      const unlocked = getUnlockedTechnologies(published);
      expect(unlocked).toEqual([]);
    });

    it('should return all unlocked techs from multiple sets', () => {
      const published = new Set([
        // Agriculture papers (unlock agriculture_i)
        'seed_selection',
        'soil_preparation',
        // Metallurgy papers (unlock basic_metallurgy)
        'smelting_fundamentals',
        'ore_identification',
        'mining_techniques',
        // Alchemy papers (unlock basic_alchemy)
        'substance_identification',
        'extraction_methods',
        'crystallization_methods',
      ]);

      const unlocked = getUnlockedTechnologies(published);

      expect(unlocked).toContain('agriculture_i');
      expect(unlocked).toContain('basic_metallurgy');
      expect(unlocked).toContain('basic_alchemy');
      expect(unlocked).not.toContain('agriculture_ii');
      expect(unlocked).not.toContain('iron_age');
    });

    it('should handle progressive unlocks within same set', () => {
      const published = new Set([
        'carbon_infusion',
        'quenching_theory',
        'alloy_theory',
        'pattern_welding',
        'hardness_testing',
        'grain_structure',
        'temperature_precision',
      ]);

      const unlocked = getUnlockedTechnologies(published);

      expect(unlocked).toContain('steel_forging'); // 4 of 12
      expect(unlocked).toContain('advanced_alloys'); // 7 of 12
      expect(unlocked).not.toContain('legendary_metals'); // needs 10 of 12
    });
  });

  describe('getTechnologyProgress - Progress Tracking', () => {
    it('should return 0 progress with no papers', () => {
      const published = new Set<string>([]);
      const progress = getTechnologyProgress('agriculture_i', published);
      expect(progress).toBe(0);
    });

    it('should return 0.5 progress with 1 of 2 required papers', () => {
      const published = new Set(['seed_selection']);
      const progress = getTechnologyProgress('agriculture_i', published);
      expect(progress).toBe(0.5); // 1 of 2 papers = 50%
    });

    it('should return 1.0 progress when threshold is met', () => {
      const published = new Set(['seed_selection', 'soil_preparation']);
      const progress = getTechnologyProgress('agriculture_i', published);
      expect(progress).toBe(1.0);
    });

    it('should cap at 1.0 even with extra papers', () => {
      const published = new Set([
        'seed_selection',
        'soil_preparation',
        'irrigation_principles',
        'fertilization_theory',
      ]);
      const progress = getTechnologyProgress('agriculture_i', published);
      expect(progress).toBe(1.0); // Capped at 100% even though 4 of 2 papers
    });

    it('should track progress for multi-paper requirements', () => {
      // iron_age needs 6 of 9 papers
      const published = new Set([
        'smelting_fundamentals',
        'ore_identification',
        'iron_working',
      ]);
      const progress = getTechnologyProgress('iron_age', published);
      expect(progress).toBe(0.5); // 3 of 6 = 50%
    });

    it('should return 0 for unknown technology', () => {
      const published = new Set(['seed_selection']);
      const progress = getTechnologyProgress('nonexistent_tech', published);
      expect(progress).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty published set without errors', () => {
      const published = new Set<string>([]);

      expect(() => isTechnologyUnlocked('agriculture_i', published)).not.toThrow();
      expect(() => getUnlockedTechnologies(published)).not.toThrow();
      expect(() => getTechnologyProgress('agriculture_i', published)).not.toThrow();

      expect(isTechnologyUnlocked('agriculture_i', published)).toBe(false);
      expect(getUnlockedTechnologies(published)).toEqual([]);
      expect(getTechnologyProgress('agriculture_i', published)).toBe(0);
    });

    it('should handle publishing all papers in a set', () => {
      const allAgriculturePapers = new Set([
        'seed_selection',
        'soil_preparation',
        'irrigation_principles',
        'fertilization_theory',
        'crop_rotation',
        'climate_control',
        'year_round_growing',
      ]);

      const unlocked = getUnlockedTechnologies(allAgriculturePapers);

      // All three agriculture techs should be unlocked
      expect(unlocked).toContain('agriculture_i');
      expect(unlocked).toContain('agriculture_ii');
      expect(unlocked).toContain('greenhouse_cultivation');
    });

    it('should handle papers not in any set', () => {
      const published = new Set(['nonexistent_paper_1', 'nonexistent_paper_2']);

      expect(getUnlockedTechnologies(published)).toEqual([]);
      expect(isTechnologyUnlocked('agriculture_i', published)).toBe(false);
    });

    it('should correctly deduplicate technologies in getUnlockedTechnologies', () => {
      // If same tech could theoretically unlock from multiple sets
      const published = new Set([
        'seed_selection',
        'soil_preparation',
        'irrigation_principles',
        'fertilization_theory',
      ]);

      const unlocked = getUnlockedTechnologies(published);
      const uniqueUnlocked = [...new Set(unlocked)];

      // Should not have duplicates
      expect(unlocked.length).toBe(uniqueUnlocked.length);
    });

    it('should handle mandatory papers correctly even with excess papers', () => {
      // Has 10 papers but missing mandatory paper
      const published = new Set([
        'soil_preparation',
        'irrigation_principles',
        'fertilization_theory',
        'crop_rotation',
        'climate_control',
        'year_round_growing',
      ]);

      // Should not unlock agriculture_i without seed_selection (mandatory)
      expect(isTechnologyUnlocked('agriculture_i', published)).toBe(false);
    });
  });

  describe('Real-World Research Scenarios', () => {
    it('should simulate uncertain research path where order matters', () => {
      // Researcher 1: Explores soil and water
      const path1 = new Set(['soil_preparation', 'irrigation_principles']);
      expect(isTechnologyUnlocked('agriculture_i', path1)).toBe(false);

      // Researcher 2: Starts with seeds
      const path2 = new Set(['seed_selection', 'crop_rotation']);
      expect(isTechnologyUnlocked('agriculture_i', path2)).toBe(true);

      // Same number of papers, different outcomes due to mandatory requirement
    });

    it('should simulate collaborative research unlocking techs', () => {
      // Team 1 discovers basic papers
      const team1Papers = new Set([
        'substance_identification',
        'extraction_methods',
      ]);

      // Team 2 discovers advanced papers
      const team2Papers = new Set(['mixture_theory', 'crystallization_methods']);

      // Neither team alone has enough (basic_alchemy needs 3 of 9 with mandatory substance_identification)
      expect(isTechnologyUnlocked('basic_alchemy', team1Papers)).toBe(false);
      expect(isTechnologyUnlocked('basic_alchemy', team2Papers)).toBe(false);

      // Combined knowledge unlocks tech (4 papers including mandatory)
      const combinedPapers = new Set([...team1Papers, ...team2Papers]);
      expect(isTechnologyUnlocked('basic_alchemy', combinedPapers)).toBe(true);
    });

    it('should simulate breakthrough moment when critical paper is found', () => {
      // Civilization has done lots of rune research
      const papers = new Set([
        'carving_fundamentals',
        'material_sympathies',
        'chromatic_runecraft',
        'geometric_patterns',
        'phonetic_activation',
        'rune_syntax',
        'protective_wards',
        'rune_erasure',
        'rune_amplification',
        'temporal_inscription',
      ]);

      // Has 10 papers but missing mandatory for intermediate_runes
      expect(isTechnologyUnlocked('intermediate_runes', papers)).toBe(false);

      // Discovery of one critical paper unlocks everything
      papers.add('rune_combinations');
      papers.add('activation_methods');
      expect(isTechnologyUnlocked('intermediate_runes', papers)).toBe(true);
    });
  });
});
