/**
 * Research Sets - N-of-M Unlock Logic
 *
 * Research sets define groups of papers where discovering N papers
 * from a set of M unlocks technologies. This creates uncertainty in
 * research paths - researchers don't know which papers are crucial
 * until technologies unlock.
 *
 * Like real research: perceptron + LSTM + transformer + attention → LLMs
 * No one knew which papers would be critical until the tech worked.
 *
 * NOTE: Research set data has been extracted to JSON for easier maintenance.
 * See data/research-sets.json for the actual set definitions.
 */

import type { ResearchSet } from './types.js';
import researchSetsData from './data/research-sets.json';

// ============================================================================
// ALL RESEARCH SETS (loaded from JSON)
// ============================================================================

/**
 * All research sets loaded from JSON data file.
 * This includes:
 * - Basic research sets (agriculture, metallurgy, alchemy, etc.)
 * - Tech expansion sets (engineering, power, computing, etc.)
 * - Magic path sets (daemon, rune, pact, divine, etc.)
 */
export const ALL_RESEARCH_SETS: ResearchSet[] = researchSetsData as ResearchSet[];

// ============================================================================
// INDIVIDUAL SET EXPORTS (for backwards compatibility)
// ============================================================================

// Create a map for quick lookup
const setsById = new Map<string, ResearchSet>(
  ALL_RESEARCH_SETS.map(set => [set.setId, set])
);

// Export individual sets by ID for backwards compatibility
export const BASIC_AGRICULTURE_SET = setsById.get('basic_agriculture')!;
export const BASIC_METALLURGY_SET = setsById.get('basic_metallurgy')!;
export const ADVANCED_METALLURGY_SET = setsById.get('advanced_metallurgy')!;
export const BASIC_ALCHEMY_SET = setsById.get('basic_alchemy')!;
export const ADVANCED_ALCHEMY_SET = setsById.get('advanced_alchemy')!;
export const RUNE_MAGIC_SET = setsById.get('rune_magic')!;
export const BASIC_PHYSICS_SET = setsById.get('basic_physics')!;
export const MATHEMATICS_FUNDAMENTALS_SET = setsById.get('mathematics_fundamentals')!;
export const ADVANCED_PHYSICS_SET = setsById.get('advanced_physics')!;
export const ADVANCED_MATHEMATICS_SET = setsById.get('advanced_mathematics')!;
export const ARTIFICIAL_INTELLIGENCE_SET = setsById.get('artificial_intelligence')!;
export const NEURAL_INTERFACES_SET = setsById.get('neural_interfaces')!;
export const EXOTIC_PHYSICS_SET = setsById.get('exotic_physics')!;
export const QUANTUM_OBSERVATION_SET = setsById.get('quantum_observation')!;
export const BETA_SPACE_FUNDAMENTALS_SET = setsById.get('beta_space_fundamentals')!;
export const CREW_COHERENCE_SET = setsById.get('crew_coherence')!;
export const RAINBOW_PLANET_SET = setsById.get('rainbow_planet')!;
export const TEMPORAL_ARCHAEOLOGY_SET = setsById.get('temporal_archaeology')!;
export const TIMELINE_ENGINEERING_SET = setsById.get('timeline_engineering')!;
export const DIGITAL_CONSCIOUSNESS_SET = setsById.get('digital_consciousness')!;

// Tech expansion sets
export const ENGINEERING_BASICS_SET = setsById.get('engineering_basics')!;
export const POWER_GENERATION_I_STEAM_SET = setsById.get('power_generation_i_steam')!;
export const MANUFACTURING_AUTOMATION_I_SET = setsById.get('manufacturing_automation_i')!;
export const TRANSPORTATION_LOGISTICS_SET = setsById.get('transportation_logistics')!;
export const COMMUNICATION_SYSTEMS_I_SET = setsById.get('communication_systems_i')!;
export const ELECTRICAL_ENGINEERING_SET = setsById.get('electrical_engineering')!;
export const COMPUTING_FUNDAMENTALS_SET = setsById.get('computing_fundamentals')!;
export const CLIMATE_CONTROL_TECHNOLOGY_SET = setsById.get('climate_control_technology')!;
export const ENTERTAINMENT_CULTURE_I_SET = setsById.get('entertainment_culture_i')!;
export const COMPUTING_II_DIGITAL_AGE_SET = setsById.get('computing_ii_digital_age')!;
export const COMMUNICATION_II_INTERNET_SET = setsById.get('communication_ii_internet')!;
export const POWER_GENERATION_II_NUCLEAR_SET = setsById.get('power_generation_ii_nuclear')!;
export const SPACE_INDUSTRY_I_LAUNCH_SET = setsById.get('space_industry_i_launch')!;
export const DISTRIBUTED_SYSTEMS_SET = setsById.get('distributed_systems')!;
export const MANUFACTURING_AUTOMATION_II_SET = setsById.get('manufacturing_automation_ii')!;
export const MILITARY_DEFENSE_SET = setsById.get('military_defense')!;
export const VIDEO_GAME_INDUSTRY_SET = setsById.get('video_game_industry')!;
export const TASK_MANAGEMENT_COLLABORATION_SET = setsById.get('task_management_collaboration')!;
export const POWER_GENERATION_III_MEGASTRUCTURES_SET = setsById.get('power_generation_iii_megastructures')!;

// Magic path sets - Absurd path (101 papers)
export const BASIC_NARRATIVE_MAGIC_SET = setsById.get('basic_narrative_magic')!;
export const BASIC_WILD_MAGIC_SET = setsById.get('basic_wild_magic')!;
export const ADVANCED_NARRATIVE_MECHANICS_SET = setsById.get('advanced_narrative_mechanics')!;
export const ADVANCED_CHAOS_THEORY_SET = setsById.get('advanced_chaos_theory')!;
export const NARRATIVE_PLOT_HOLE_EXPLOITATION_SET = setsById.get('narrative_plot_hole_exploitation')!;
export const WILD_CHAOS_BETA_NAVIGATION_SET = setsById.get('wild_chaos_beta_navigation')!;

// Magic path sets - Daemon magic (140 papers)
export const BASIC_DAEMON_THEORY_SET = setsById.get('basic_daemon_theory')!;
export const DAEMON_SEPARATION_TRAINING_SET = setsById.get('daemon_separation_training')!;
export const DUST_NAVIGATION_FUNDAMENTALS_SET = setsById.get('dust_navigation_fundamentals')!;
export const SUBTLE_KNIFE_MASTERY_SET = setsById.get('subtle_knife_mastery')!;
export const DAEMON_DUST_NAVIGATION_SET = setsById.get('daemon_dust_navigation')!;

// Magic path sets - Rune magic (140 papers)
export const BASIC_RUNE_THEORY_SET = setsById.get('basic_rune_theory')!;
export const RUNE_CARVING_MASTERY_SET = setsById.get('rune_carving_mastery')!;
export const ADVANCED_RUNIC_ARRAYS_SET = setsById.get('advanced_runic_arrays')!;
export const DIMENSIONAL_RUNE_THEORY_SET = setsById.get('dimensional_rune_theory')!;
export const RUNE_DIMENSIONAL_GATES_SET = setsById.get('rune_dimensional_gates')!;

// Magic path sets - Pact magic (140 papers)
export const BASIC_DEMONOLOGY_SET = setsById.get('basic_demonology')!;
export const SUMMONING_BINDING_SET = setsById.get('summoning_binding')!;
export const CONTRACT_THEORY_SET = setsById.get('contract_theory')!;
export const ADVANCED_PACT_NEGOTIATION_SET = setsById.get('advanced_pact_negotiation')!;
export const PACT_DIMENSIONAL_TRAVEL_SET = setsById.get('pact_dimensional_travel')!;

// Magic path sets - Song magic (140 papers)
export const BASIC_MUSIC_MAGIC_SET = setsById.get('basic_music_magic')!;
export const HARMONIC_MAGIC_SET = setsById.get('harmonic_magic')!;
export const REALITY_RESONANCE_SET = setsById.get('reality_resonance')!;
export const ADVANCED_SONG_MAGIC_SET = setsById.get('advanced_song_magic')!;
export const SONG_HARMONIC_TRAVEL_SET = setsById.get('song_harmonic_travel')!;

// Magic path sets - Divine magic (170 papers)
export const BASIC_THEOLOGY_SET = setsById.get('basic_theology')!;
export const WORSHIP_FAITH_MECHANICS_SET = setsById.get('worship_faith_mechanics')!;
export const DIVINE_POWER_CULTIVATION_SET = setsById.get('divine_power_cultivation')!;
export const PATH_TO_APOTHEOSIS_SET = setsById.get('path_to_apotheosis')!;
export const DIVINE_ASCENSION_TRAVEL_SET = setsById.get('divine_ascension_travel')!;

// Magic path sets - Academic magic (170 papers)
export const BASIC_MAGICAL_THEORY_SET = setsById.get('basic_magical_theory')!;
export const SPELL_MATHEMATICS_SET = setsById.get('spell_mathematics')!;
export const ADVANCED_MAGICAL_PHYSICS_SET = setsById.get('advanced_magical_physics')!;
export const REALITY_THEORY_MASTERY_SET = setsById.get('reality_theory_mastery')!;
export const ACADEMIC_REALITY_THEORY_SET = setsById.get('academic_reality_theory')!;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get a research set by ID
 */
export function getResearchSet(setId: string): ResearchSet | undefined {
  return setsById.get(setId);
}

/**
 * Check if a technology has unlocked based on published papers
 */
export function isTechnologyUnlocked(
  technologyId: string,
  publishedPapers: Set<string>
): boolean {
  // Find all sets that can unlock this technology
  for (const set of ALL_RESEARCH_SETS) {
    for (const unlock of set.unlocks) {
      if (unlock.technologyId !== technologyId) continue;

      // Check if mandatory papers are published
      if (unlock.mandatoryPapers) {
        const allMandatoryPublished = unlock.mandatoryPapers.every(
          paperId => publishedPapers.has(paperId)
        );
        if (!allMandatoryPublished) continue;
      }

      // Count how many papers from this set are published
      const publishedFromSet = set.allPapers.filter(
        paperId => publishedPapers.has(paperId)
      ).length;

      // Check if we've reached the threshold
      if (publishedFromSet >= unlock.papersRequired) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get all technologies that would unlock with this set of published papers
 */
export function getUnlockedTechnologies(publishedPapers: Set<string>): string[] {
  const unlocked: string[] = [];

  for (const set of ALL_RESEARCH_SETS) {
    for (const unlock of set.unlocks) {
      if (isTechnologyUnlocked(unlock.technologyId, publishedPapers)) {
        unlocked.push(unlock.technologyId);
      }
    }
  }

  return [...new Set(unlocked)]; // Deduplicate
}

/**
 * Get progress toward unlocking a technology (returns fraction 0-1)
 */
export function getTechnologyProgress(
  technologyId: string,
  publishedPapers: Set<string>
): number {
  for (const set of ALL_RESEARCH_SETS) {
    for (const unlock of set.unlocks) {
      if (unlock.technologyId !== technologyId) continue;

      const publishedFromSet = set.allPapers.filter(
        paperId => publishedPapers.has(paperId)
      ).length;

      return Math.min(1, publishedFromSet / unlock.papersRequired);
    }
  }

  return 0;
}
