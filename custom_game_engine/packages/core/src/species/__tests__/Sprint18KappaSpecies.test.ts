/**
 * Sprint 18 Kappa Species Tests (MUL-4384)
 *
 * Tests the Kappa species implementation:
 * - MUL-1357 schema validation
 * - Trait structure and completeness
 * - Genome flags for sara, sumo, cucumber, parasitism mechanics
 * - Species template field correctness
 */

import { describe, it, expect } from 'vitest';
import {
  SPECIES_KAPPA,
  TRAIT_SARA_WATER_DISH,
  TRAIT_HONOR_COMPULSION,
  TRAIT_SUMO_MASTERY,
  TRAIT_CUCUMBER_CHEMOSENSORY,
  TRAIT_BIOENERGETIC_PARASITISM,
  SPRINT18_FOLKLORIST_SPECIES_REGISTRY,
  getSprint18FolkloristSpecies,
  validateSprint18FolkloristSpecies,
  validateAllSprint18Species,
} from '../Sprint18FolkloristSpeciesRegistry.js';
import { validateAgainstMUL1357Schema } from '../FolkloristSpeciesRegistry.js';

// ─────────────────────────────────────────────────────────────────────────────

describe('Sprint 18 Kappa Species (MUL-4384)', () => {

  // ── MUL-1357 Schema Validation ────────────────────────────────
  describe('MUL-1357 schema validation', () => {
    it('Kappa passes MUL-1357 validation', () => {
      const results = validateAllSprint18Species();
      expect(results).toHaveLength(1);
      for (const result of results) {
        expect(result.valid).toBe(true);
      }
    });

    it('Kappa individually passes MUL-1357', () => {
      const result = validateAgainstMUL1357Schema(SPECIES_KAPPA);
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('validateSprint18FolkloristSpecies returns valid for kappa', () => {
      const result = validateSprint18FolkloristSpecies('kappa');
      expect(result.valid).toBe(true);
    });

    it('validateSprint18FolkloristSpecies returns invalid for unknown species', () => {
      const result = validateSprint18FolkloristSpecies('nonexistent');
      expect(result.valid).toBe(false);
    });
  });

  // ── Registry ──────────────────────────────────────────────────
  describe('registry', () => {
    it('contains exactly 1 species', () => {
      expect(Object.keys(SPRINT18_FOLKLORIST_SPECIES_REGISTRY)).toHaveLength(1);
    });

    it('getSprint18FolkloristSpecies returns Kappa', () => {
      const kappa = getSprint18FolkloristSpecies('kappa');
      expect(kappa).toBeDefined();
      expect(kappa!.speciesId).toBe('kappa');
      expect(kappa!.speciesName).toBe('Kappa');
    });

    it('getSprint18FolkloristSpecies returns undefined for unknown', () => {
      expect(getSprint18FolkloristSpecies('unknown')).toBeUndefined();
    });
  });

  // ── Species Template ──────────────────────────────────────────
  describe('species template', () => {
    it('has correct identification fields', () => {
      expect(SPECIES_KAPPA.speciesId).toBe('kappa');
      expect(SPECIES_KAPPA.speciesName).toBe('Kappa');
      expect(SPECIES_KAPPA.commonName).toBe('River Child');
    });

    it('has correct physical attributes', () => {
      expect(SPECIES_KAPPA.bodyPlanId).toBe('amphibious_humanoid_small');
      expect(SPECIES_KAPPA.sizeCategory).toBe('small');
      expect(SPECIES_KAPPA.averageHeight).toBe(115);
      expect(SPECIES_KAPPA.averageWeight).toBe(40);
    });

    it('is ageless and sapient', () => {
      expect(SPECIES_KAPPA.lifespanType).toBe('ageless');
      expect(SPECIES_KAPPA.lifespan).toBe(0);
      expect(SPECIES_KAPPA.sapient).toBe(true);
    });

    it('is solitary territorial', () => {
      expect(SPECIES_KAPPA.socialStructure).toBe('solitary_territorial');
      expect(SPECIES_KAPPA.compatibleSpecies).toHaveLength(0);
    });

    it('is cross-game compatible', () => {
      expect(SPECIES_KAPPA.cross_game_compatible).toBe(true);
      expect(SPECIES_KAPPA.native_game).toBe('both');
      expect(SPECIES_KAPPA.traveler_epithet).toBeDefined();
      expect(SPECIES_KAPPA.traveler_epithet!.length).toBeGreaterThan(0);
    });

    it('has exactly 5 innate traits', () => {
      expect(SPECIES_KAPPA.innateTraits).toHaveLength(5);
    });

    it('has a substantive description', () => {
      expect(SPECIES_KAPPA.description.length).toBeGreaterThan(500);
      expect(SPECIES_KAPPA.description).toContain('sara');
      expect(SPECIES_KAPPA.description).toContain('sumo');
      expect(SPECIES_KAPPA.description).toContain('cucumber');
    });
  });

  // ── Traits ────────────────────────────────────────────────────
  describe('traits', () => {
    it('sara_water_dish has correct structure', () => {
      expect(TRAIT_SARA_WATER_DISH.id).toBe('sara_water_dish');
      expect(TRAIT_SARA_WATER_DISH.category).toBe('physical');
      expect(TRAIT_SARA_WATER_DISH.abilitiesGranted).toContain('sara_maintenance');
      expect(TRAIT_SARA_WATER_DISH.vulnerabilities).toContain('bow_vulnerability');
      expect(TRAIT_SARA_WATER_DISH.vulnerabilities).toContain('sara_spillage');
    });

    it('honor_compulsion has correct structure', () => {
      expect(TRAIT_HONOR_COMPULSION.id).toBe('honor_compulsion');
      expect(TRAIT_HONOR_COMPULSION.category).toBe('social');
      expect(TRAIT_HONOR_COMPULSION.abilitiesGranted).toContain('sumo_challenge_compulsion');
      expect(TRAIT_HONOR_COMPULSION.vulnerabilities).toContain('compulsory_sumo_engagement');
    });

    it('sumo_mastery has correct structure', () => {
      expect(TRAIT_SUMO_MASTERY.id).toBe('sumo_mastery');
      expect(TRAIT_SUMO_MASTERY.category).toBe('physical');
      expect(TRAIT_SUMO_MASTERY.skillBonus!.combat).toBe(0.4);
      expect(TRAIT_SUMO_MASTERY.skillBonus!.strength).toBe(0.2);
      expect(TRAIT_SUMO_MASTERY.abilitiesGranted).toContain('sumo_grappling');
    });

    it('cucumber_chemosensory has correct structure', () => {
      expect(TRAIT_CUCUMBER_CHEMOSENSORY.id).toBe('cucumber_chemosensory');
      expect(TRAIT_CUCUMBER_CHEMOSENSORY.category).toBe('sensory');
      expect(TRAIT_CUCUMBER_CHEMOSENSORY.abilitiesGranted).toContain('cucumber_detection');
      expect(TRAIT_CUCUMBER_CHEMOSENSORY.abilitiesGranted).toContain('compact_registration');
    });

    it('bioenergetic_parasitism has correct structure', () => {
      expect(TRAIT_BIOENERGETIC_PARASITISM.id).toBe('bioenergetic_parasitism');
      expect(TRAIT_BIOENERGETIC_PARASITISM.category).toBe('metabolic');
      expect(TRAIT_BIOENERGETIC_PARASITISM.needsModifier!.hunger).toBe(0.5);
      expect(TRAIT_BIOENERGETIC_PARASITISM.abilitiesGranted).toContain('water_parasitism');
    });

    it('all trait IDs are unique', () => {
      const ids = SPECIES_KAPPA.innateTraits.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all traits have descriptions', () => {
      for (const trait of SPECIES_KAPPA.innateTraits) {
        expect(trait.description.length).toBeGreaterThan(50);
      }
    });
  });

  // ── Genome Flags ──────────────────────────────────────────────
  describe('genome flags', () => {
    const flags = SPECIES_KAPPA.genome_flags!;

    it('has genome_flags defined', () => {
      expect(flags).toBeDefined();
    });

    it('has sara mechanics flags', () => {
      expect(flags.sara_full_capacity).toBe(1.0);
      expect(flags.sara_spillage_per_bow).toBe(0.15);
      expect(flags.sara_refill_requirement_interval).toBe(200);
      expect(flags.sara_clouding_on_dishonor).toBe(0.3);
    });

    it('has territory flags', () => {
      expect(flags.water_territory_radius).toBe(50);
      expect(flags.water_mineral_signature_tolerance).toBe(0.1);
      expect(flags.displacement_strength_penalty).toBe(0.3);
    });

    it('has sumo flags', () => {
      expect(flags.sumo_compulsion_trigger_range).toBe(10);
      expect(flags.sumo_strength_bonus).toBe(0.4);
    });

    it('has cucumber compact flags', () => {
      expect(flags.cucumber_scent_detection_range).toBe(20);
      expect(flags.safe_passage_duration_per_cucumber).toBe(300);
    });

    it('has parasitism flags', () => {
      expect(flags.unregistered_feed_rate).toBe(0.02);
      expect(flags.registered_feed_disabled).toBe(true);
    });

    it('has knowledge gate flags', () => {
      expect(flags.bone_setting_teach_requires_sumo_defeat).toBe(true);
      expect(flags.knowledge_transfer_duration).toBe(50);
    });

    it('has water dependency flags', () => {
      expect(flags.air_breathing_duration).toBe(30);
      expect(flags.air_damage_per_tick).toBe(0.05);
    });
  });
});
