/**
 * Spaceflight Crafting Recipes
 *
 * Production chain recipes for spaceship construction.
 * Organized by tier, with increasing complexity and station requirements:
 *
 * Stations required:
 * - forge: Basic metalworking
 * - arcane_forge: Magical material processing
 * - ley_line_extractor: Mana and void essence processing
 * - electronics_lab: Circuit and processor fabrication
 * - shipyard: Ship component assembly
 * - advanced_shipyard: Complex module assembly
 * - temporal_lab: Timeline and probability manipulation
 * - reality_forge: Ultimate clarketech items
 */

import type { Recipe } from './Recipe.js';
import recipesData from '../../data/recipes/spaceflight.json';

function loadSpaceflightRecipes(): Recipe[] {
  if (!Array.isArray(recipesData)) {
    throw new Error('Failed to load spaceflight recipes: data is not an array');
  }

  return recipesData as Recipe[];
}

export const ALL_SPACEFLIGHT_RECIPES: Recipe[] = loadSpaceflightRecipes();

// Individual recipe exports for backward compatibility
export const REFINED_MANA_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'refined_mana')!;
export const RARE_EARTH_COMPOUND_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'rare_earth_compound')!;
export const SILICON_WAFER_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'silicon_wafer')!;
export const CRYSTAL_LENS_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'crystal_lens')!;
export const STELLARITE_INGOT_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'stellarite_ingot')!;
export const CONDENSED_VOID_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'condensed_void')!;
export const TEMPORAL_CRYSTAL_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'temporal_crystal')!;
export const EMOTIONAL_ESSENCE_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'emotional_essence')!;

export const MANA_CRYSTAL_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'mana_crystal')!;
export const BASIC_CIRCUIT_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'basic_circuit')!;
export const ADVANCED_CIRCUIT_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'advanced_circuit')!;
export const RESONANCE_COIL_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'resonance_coil')!;
export const FOCUSING_ARRAY_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'focusing_array')!;
export const VOID_CAPACITOR_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'void_capacitor')!;
export const TEMPORAL_REGULATOR_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'temporal_regulator')!;
export const EMOTIONAL_AMPLIFIER_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'emotional_amplifier')!;
export const STELLARITE_PLATE_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'stellarite_plate')!;

export const PROCESSING_UNIT_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'processing_unit')!;
export const QUANTUM_PROCESSOR_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'quantum_processor')!;
export const RESONANCE_CORE_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'resonance_core')!;
export const EMOTIONAL_MATRIX_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'emotional_matrix')!;
export const VOID_ENGINE_COMPONENT_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'void_engine_component')!;
export const LIFE_SUPPORT_MODULE_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'life_support_module')!;
export const NEURAL_INTERFACE_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'neural_interface')!;

export const SOUL_ANCHOR_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'soul_anchor')!;
export const TIMELINE_ANCHOR_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'timeline_anchor')!;
export const OBSERVATION_NULLIFIER_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'observation_nullifier')!;
export const PROBABILITY_LENS_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'probability_lens')!;
export const REALITY_THREAD_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'reality_thread')!;
export const COHERENCE_CRYSTAL_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'coherence_crystal')!;
export const NEUTRONIUM_CORE_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'neutronium_core')!;

export const HULL_PLATING_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'hull_plating')!;
export const REINFORCED_HULL_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'reinforced_hull')!;
export const PROPULSION_UNIT_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'propulsion_unit')!;
export const NAVIGATION_ARRAY_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'navigation_array')!;
export const COMMUNICATION_RELAY_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'communication_relay')!;
export const POWER_CORE_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'power_core')!;
export const SHIELD_GENERATOR_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'shield_generator')!;

export const HEART_CHAMBER_CORE_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'heart_chamber_core')!;
export const EMOTION_THEATER_SYSTEM_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'emotion_theater_system')!;
export const MEMORY_HALL_ARCHIVE_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'memory_hall_archive')!;
export const MEDITATION_CHAMBER_UNIT_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'meditation_chamber_unit')!;
export const VR_IMMERSION_POD_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'vr_immersion_pod')!;
export const GLEISNER_BODY_FRAME_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'gleisner_body_frame')!;
export const SVETZ_RETRIEVAL_ENGINE_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'svetz_retrieval_engine')!;
export const PROBABILITY_DRIVE_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'probability_drive')!;
export const TIMELINE_MERGER_CORE_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'timeline_merger_core')!;

export const WORLDSHIP_HULL_KIT_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'worldship_hull_kit')!;
export const THRESHOLD_HULL_KIT_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'threshold_hull_kit')!;
export const COURIER_HULL_KIT_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'courier_hull_kit')!;
export const BRAINSHIP_HULL_KIT_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'brainship_hull_kit')!;
export const STORYSHIP_HULL_KIT_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'storyship_hull_kit')!;
export const GLEISNER_HULL_KIT_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'gleisner_hull_kit')!;
export const SVETZ_HULL_KIT_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'svetz_hull_kit')!;
export const PROBABILITY_SCOUT_HULL_KIT_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'probability_scout_hull_kit')!;
export const TIMELINE_MERGER_HULL_KIT_RECIPE = ALL_SPACEFLIGHT_RECIPES.find((r) => r.id === 'timeline_merger_hull_kit')!;

// Legacy tier-based exports for backward compatibility
export const TIER_1_SPACEFLIGHT_RECIPES: Recipe[] = [
  REFINED_MANA_RECIPE,
  RARE_EARTH_COMPOUND_RECIPE,
  SILICON_WAFER_RECIPE,
  CRYSTAL_LENS_RECIPE,
  STELLARITE_INGOT_RECIPE,
  CONDENSED_VOID_RECIPE,
  TEMPORAL_CRYSTAL_RECIPE,
  EMOTIONAL_ESSENCE_RECIPE,
];

export const TIER_2_SPACEFLIGHT_RECIPES: Recipe[] = [
  MANA_CRYSTAL_RECIPE,
  BASIC_CIRCUIT_RECIPE,
  ADVANCED_CIRCUIT_RECIPE,
  RESONANCE_COIL_RECIPE,
  FOCUSING_ARRAY_RECIPE,
  VOID_CAPACITOR_RECIPE,
  TEMPORAL_REGULATOR_RECIPE,
  EMOTIONAL_AMPLIFIER_RECIPE,
  STELLARITE_PLATE_RECIPE,
];

export const TIER_3_SPACEFLIGHT_RECIPES: Recipe[] = [
  PROCESSING_UNIT_RECIPE,
  QUANTUM_PROCESSOR_RECIPE,
  RESONANCE_CORE_RECIPE,
  EMOTIONAL_MATRIX_RECIPE,
  VOID_ENGINE_COMPONENT_RECIPE,
  LIFE_SUPPORT_MODULE_RECIPE,
  NEURAL_INTERFACE_RECIPE,
];

export const TIER_4_SPACEFLIGHT_RECIPES: Recipe[] = [
  SOUL_ANCHOR_RECIPE,
  TIMELINE_ANCHOR_RECIPE,
  OBSERVATION_NULLIFIER_RECIPE,
  PROBABILITY_LENS_RECIPE,
  REALITY_THREAD_RECIPE,
  COHERENCE_CRYSTAL_RECIPE,
  NEUTRONIUM_CORE_RECIPE,
];

export const TIER_5_SPACEFLIGHT_RECIPES: Recipe[] = [
  HULL_PLATING_RECIPE,
  REINFORCED_HULL_RECIPE,
  PROPULSION_UNIT_RECIPE,
  NAVIGATION_ARRAY_RECIPE,
  COMMUNICATION_RELAY_RECIPE,
  POWER_CORE_RECIPE,
  SHIELD_GENERATOR_RECIPE,
];

export const TIER_6_SPACEFLIGHT_RECIPES: Recipe[] = [
  HEART_CHAMBER_CORE_RECIPE,
  EMOTION_THEATER_SYSTEM_RECIPE,
  MEMORY_HALL_ARCHIVE_RECIPE,
  MEDITATION_CHAMBER_UNIT_RECIPE,
  VR_IMMERSION_POD_RECIPE,
  GLEISNER_BODY_FRAME_RECIPE,
  SVETZ_RETRIEVAL_ENGINE_RECIPE,
  PROBABILITY_DRIVE_RECIPE,
  TIMELINE_MERGER_CORE_RECIPE,
];

export const SHIP_HULL_KIT_RECIPES: Recipe[] = [
  WORLDSHIP_HULL_KIT_RECIPE,
  THRESHOLD_HULL_KIT_RECIPE,
  COURIER_HULL_KIT_RECIPE,
  BRAINSHIP_HULL_KIT_RECIPE,
  STORYSHIP_HULL_KIT_RECIPE,
  GLEISNER_HULL_KIT_RECIPE,
  SVETZ_HULL_KIT_RECIPE,
  PROBABILITY_SCOUT_HULL_KIT_RECIPE,
  TIMELINE_MERGER_HULL_KIT_RECIPE,
];

/**
 * Register all spaceflight recipes with the recipe registry.
 */
export function registerSpaceflightRecipes(registry: { registerRecipe: (recipe: Recipe) => void }): void {
  for (const recipe of ALL_SPACEFLIGHT_RECIPES) {
    registry.registerRecipe(recipe);
  }
}
