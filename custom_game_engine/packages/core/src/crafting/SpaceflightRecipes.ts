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

// ============================================================================
// TIER 1: BASIC PROCESSED MATERIALS
// Simple processing at basic stations
// ============================================================================

export const TIER_1_SPACEFLIGHT_RECIPES: Recipe[] = [
  {
    id: 'refined_mana',
    name: 'Refined Mana',
    category: 'Materials',
    description: 'Purify raw mana shards into concentrated essence.',
    ingredients: [{ itemId: 'mana_shard', quantity: 3 }],
    output: { itemId: 'refined_mana', quantity: 1 },
    craftingTime: 15,
    xpGain: 15,
    stationRequired: 'arcane_forge',
    skillRequirements: [],
    researchRequirements: ['basic_propulsion'],
  },

  {
    id: 'rare_earth_compound',
    name: 'Rare Earth Compound',
    category: 'Materials',
    description: 'Smelt rare earth ore into a stable compound.',
    ingredients: [
      { itemId: 'rare_earth_ore', quantity: 3 },
      { itemId: 'coal', quantity: 1 },
    ],
    output: { itemId: 'rare_earth_compound', quantity: 1 },
    craftingTime: 25,
    xpGain: 20,
    stationRequired: 'forge',
    skillRequirements: [{ skill: 'smithing', level: 3 }],
    researchRequirements: ['basic_propulsion'],
  },

  {
    id: 'silicon_wafer',
    name: 'Silicon Wafer',
    category: 'Materials',
    description: 'Melt silicon sand into pure wafers for electronics.',
    ingredients: [
      { itemId: 'silicon_sand', quantity: 5 },
      { itemId: 'coal', quantity: 2 },
    ],
    output: { itemId: 'silicon_wafer', quantity: 2 },
    craftingTime: 20,
    xpGain: 15,
    stationRequired: 'forge',
    skillRequirements: [],
    researchRequirements: ['basic_propulsion'],
  },

  {
    id: 'crystal_lens',
    name: 'Crystal Lens',
    category: 'Materials',
    description: 'Shape raw crystal into a precision focusing lens.',
    ingredients: [{ itemId: 'raw_crystal', quantity: 2 }],
    output: { itemId: 'crystal_lens', quantity: 1 },
    craftingTime: 30,
    xpGain: 25,
    stationRequired: 'arcane_forge',
    skillRequirements: [{ skill: 'crafting', level: 4 }],
    researchRequirements: ['basic_propulsion'],
  },

  {
    id: 'stellarite_ingot',
    name: 'Stellarite Ingot',
    category: 'Materials',
    description: 'Smelt stellarite ore into a star-forged alloy.',
    ingredients: [
      { itemId: 'stellarite_ore', quantity: 3 },
      { itemId: 'coal', quantity: 2 },
    ],
    output: { itemId: 'stellarite_ingot', quantity: 1 },
    craftingTime: 40,
    xpGain: 40,
    stationRequired: 'arcane_forge',
    skillRequirements: [{ skill: 'smithing', level: 5 }],
    researchRequirements: ['worldship_design'],
  },

  {
    id: 'condensed_void',
    name: 'Condensed Void',
    category: 'Materials',
    description: 'Compress void essence into a stable form.',
    ingredients: [{ itemId: 'void_essence', quantity: 5 }],
    output: { itemId: 'condensed_void', quantity: 1 },
    craftingTime: 60,
    xpGain: 60,
    stationRequired: 'ley_line_extractor',
    skillRequirements: [{ skill: 'arcane', level: 5 }],
    researchRequirements: ['emotional_topology'],
  },

  {
    id: 'temporal_crystal',
    name: 'Temporal Crystal',
    category: 'Materials',
    description: 'Crystallize temporal dust into a time-locked form.',
    ingredients: [
      { itemId: 'temporal_dust', quantity: 10 },
      { itemId: 'raw_crystal', quantity: 1 },
    ],
    output: { itemId: 'temporal_crystal', quantity: 1 },
    craftingTime: 90,
    xpGain: 80,
    stationRequired: 'temporal_lab',
    skillRequirements: [{ skill: 'arcane', level: 7 }],
    researchRequirements: ['svetz_retrieval'],
  },

  {
    id: 'emotional_essence',
    name: 'Emotional Essence',
    category: 'Materials',
    description: 'Distill raw emotional resonance into pure essence.',
    ingredients: [{ itemId: 'emotional_resonance', quantity: 10 }],
    output: { itemId: 'emotional_essence', quantity: 1 },
    craftingTime: 45,
    xpGain: 35,
    stationRequired: 'arcane_forge',
    skillRequirements: [{ skill: 'arcane', level: 4 }],
    researchRequirements: ['emotional_topology'],
  },
];

// ============================================================================
// TIER 2: INTERMEDIATE COMPONENTS
// Combine basic materials into functional components
// ============================================================================

export const TIER_2_SPACEFLIGHT_RECIPES: Recipe[] = [
  {
    id: 'mana_crystal',
    name: 'Mana Crystal',
    category: 'Materials',
    description: 'Infuse a crystal with concentrated mana.',
    ingredients: [
      { itemId: 'refined_mana', quantity: 3 },
      { itemId: 'raw_crystal', quantity: 1 },
    ],
    output: { itemId: 'mana_crystal', quantity: 1 },
    craftingTime: 35,
    xpGain: 30,
    stationRequired: 'arcane_forge',
    skillRequirements: [{ skill: 'arcane', level: 3 }],
    researchRequirements: ['basic_propulsion'],
  },

  {
    id: 'basic_circuit',
    name: 'Basic Circuit',
    category: 'Materials',
    description: 'Assemble silicon wafers and copper into a circuit board.',
    ingredients: [
      { itemId: 'silicon_wafer', quantity: 2 },
      { itemId: 'copper_ingot', quantity: 1 },
    ],
    output: { itemId: 'basic_circuit', quantity: 1 },
    craftingTime: 20,
    xpGain: 20,
    stationRequired: 'electronics_lab',
    skillRequirements: [{ skill: 'engineering', level: 2 }],
    researchRequirements: ['basic_propulsion'],
  },

  {
    id: 'advanced_circuit',
    name: 'Advanced Circuit',
    category: 'Materials',
    description: 'Layer circuits with rare earth compounds for enhanced performance.',
    ingredients: [
      { itemId: 'basic_circuit', quantity: 2 },
      { itemId: 'rare_earth_compound', quantity: 1 },
      { itemId: 'gold_ingot', quantity: 1 },
    ],
    output: { itemId: 'advanced_circuit', quantity: 1 },
    craftingTime: 40,
    xpGain: 40,
    stationRequired: 'electronics_lab',
    skillRequirements: [{ skill: 'engineering', level: 4 }],
    researchRequirements: ['shipyard_construction'],
  },

  {
    id: 'resonance_coil',
    name: 'Resonance Coil',
    category: 'Materials',
    description: 'Wind copper into a mana-attuned resonance coil.',
    ingredients: [
      { itemId: 'copper_ingot', quantity: 5 },
      { itemId: 'mana_crystal', quantity: 1 },
    ],
    output: { itemId: 'resonance_coil', quantity: 1 },
    craftingTime: 45,
    xpGain: 45,
    stationRequired: 'arcane_forge',
    skillRequirements: [{ skill: 'arcane', level: 4 }],
    researchRequirements: ['emotional_topology'],
  },

  {
    id: 'focusing_array',
    name: 'Focusing Array',
    category: 'Materials',
    description: 'Arrange crystal lenses into a precision focusing system.',
    ingredients: [
      { itemId: 'crystal_lens', quantity: 4 },
      { itemId: 'gold_ingot', quantity: 2 },
    ],
    output: { itemId: 'focusing_array', quantity: 1 },
    craftingTime: 55,
    xpGain: 50,
    stationRequired: 'shipyard',
    skillRequirements: [{ skill: 'engineering', level: 5 }],
    researchRequirements: ['threshold_ship'],
  },

  {
    id: 'void_capacitor',
    name: 'Void Capacitor',
    category: 'Materials',
    description: 'Contain condensed void within a stellarite shell.',
    ingredients: [
      { itemId: 'condensed_void', quantity: 2 },
      { itemId: 'stellarite_ingot', quantity: 1 },
    ],
    output: { itemId: 'void_capacitor', quantity: 1 },
    craftingTime: 70,
    xpGain: 70,
    stationRequired: 'ley_line_extractor',
    skillRequirements: [{ skill: 'arcane', level: 6 }],
    researchRequirements: ['emotional_topology'],
  },

  {
    id: 'temporal_regulator',
    name: 'Temporal Regulator',
    category: 'Materials',
    description: 'Build a device to regulate temporal flow.',
    ingredients: [
      { itemId: 'temporal_crystal', quantity: 2 },
      { itemId: 'advanced_circuit', quantity: 1 },
    ],
    output: { itemId: 'temporal_regulator', quantity: 1 },
    craftingTime: 100,
    xpGain: 100,
    stationRequired: 'temporal_lab',
    skillRequirements: [{ skill: 'engineering', level: 7 }],
    researchRequirements: ['svetz_retrieval'],
  },

  {
    id: 'emotional_amplifier',
    name: 'Emotional Amplifier',
    category: 'Materials',
    description: 'Amplify emotional essence through resonance.',
    ingredients: [
      { itemId: 'emotional_essence', quantity: 5 },
      { itemId: 'resonance_coil', quantity: 1 },
    ],
    output: { itemId: 'emotional_amplifier', quantity: 1 },
    craftingTime: 50,
    xpGain: 50,
    stationRequired: 'arcane_forge',
    skillRequirements: [{ skill: 'arcane', level: 5 }],
    researchRequirements: ['the_heart'],
  },

  {
    id: 'stellarite_plate',
    name: 'Stellarite Plate',
    category: 'Materials',
    description: 'Forge stellarite into reinforced plating.',
    ingredients: [
      { itemId: 'stellarite_ingot', quantity: 4 },
      { itemId: 'steel_ingot', quantity: 2 },
    ],
    output: { itemId: 'stellarite_plate', quantity: 1 },
    craftingTime: 60,
    xpGain: 55,
    stationRequired: 'arcane_forge',
    skillRequirements: [{ skill: 'smithing', level: 6 }],
    researchRequirements: ['worldship_design'],
  },
];

// ============================================================================
// TIER 3: ADVANCED COMPONENTS
// Complex assemblies requiring multiple intermediate components
// ============================================================================

export const TIER_3_SPACEFLIGHT_RECIPES: Recipe[] = [
  {
    id: 'processing_unit',
    name: 'Processing Unit',
    category: 'Materials',
    description: 'Assemble advanced circuits into a computing core.',
    ingredients: [
      { itemId: 'advanced_circuit', quantity: 4 },
      { itemId: 'rare_earth_compound', quantity: 2 },
      { itemId: 'gold_ingot', quantity: 1 },
    ],
    output: { itemId: 'processing_unit', quantity: 1 },
    craftingTime: 80,
    xpGain: 80,
    stationRequired: 'electronics_lab',
    skillRequirements: [{ skill: 'engineering', level: 6 }],
    researchRequirements: ['brainship_symbiosis'],
  },

  {
    id: 'quantum_processor',
    name: 'Quantum Processor',
    category: 'Materials',
    description: 'Create a processor that operates on quantum principles.',
    ingredients: [
      { itemId: 'processing_unit', quantity: 2 },
      { itemId: 'void_capacitor', quantity: 1 },
      { itemId: 'temporal_crystal', quantity: 1 },
    ],
    output: { itemId: 'quantum_processor', quantity: 1 },
    craftingTime: 150,
    xpGain: 150,
    stationRequired: 'electronics_lab',
    skillRequirements: [{ skill: 'engineering', level: 8 }],
    researchRequirements: ['gleisner_vessel'],
  },

  {
    id: 'resonance_core',
    name: 'Resonance Core',
    category: 'Materials',
    description: 'Build a central resonance amplification system.',
    ingredients: [
      { itemId: 'resonance_coil', quantity: 4 },
      { itemId: 'mana_crystal', quantity: 3 },
      { itemId: 'focusing_array', quantity: 1 },
    ],
    output: { itemId: 'resonance_core', quantity: 1 },
    craftingTime: 120,
    xpGain: 120,
    stationRequired: 'arcane_forge',
    skillRequirements: [{ skill: 'arcane', level: 7 }],
    researchRequirements: ['emotional_topology'],
  },

  {
    id: 'emotional_matrix',
    name: 'Emotional Matrix',
    category: 'Materials',
    description: 'Weave emotional amplifiers into a coherent matrix.',
    ingredients: [
      { itemId: 'emotional_amplifier', quantity: 4 },
      { itemId: 'resonance_core', quantity: 1 },
      { itemId: 'crystal_lens', quantity: 2 },
    ],
    output: { itemId: 'emotional_matrix', quantity: 1 },
    craftingTime: 140,
    xpGain: 140,
    stationRequired: 'arcane_forge',
    skillRequirements: [{ skill: 'arcane', level: 8 }],
    researchRequirements: ['the_heart'],
  },

  {
    id: 'void_engine_component',
    name: 'Void Engine Component',
    category: 'Materials',
    description: 'Construct a void-powered propulsion element.',
    ingredients: [
      { itemId: 'void_capacitor', quantity: 3 },
      { itemId: 'stellarite_plate', quantity: 4 },
      { itemId: 'resonance_core', quantity: 1 },
    ],
    output: { itemId: 'void_engine_component', quantity: 1 },
    craftingTime: 180,
    xpGain: 180,
    stationRequired: 'shipyard',
    skillRequirements: [{ skill: 'engineering', level: 7 }],
    researchRequirements: ['threshold_ship'],
  },

  {
    id: 'life_support_module',
    name: 'Life Support Module',
    category: 'Materials',
    description: 'Build a complete life support system for spacecraft.',
    ingredients: [
      { itemId: 'processing_unit', quantity: 2 },
      { itemId: 'stellarite_plate', quantity: 3 },
      { itemId: 'advanced_circuit', quantity: 5 },
      { itemId: 'water', quantity: 10 },
    ],
    output: { itemId: 'life_support_module', quantity: 1 },
    craftingTime: 100,
    xpGain: 100,
    stationRequired: 'shipyard',
    skillRequirements: [{ skill: 'engineering', level: 5 }],
    researchRequirements: ['life_support_systems'],
  },

  {
    id: 'neural_interface',
    name: 'Neural Interface',
    category: 'Materials',
    description: 'Create a direct mind-machine interface.',
    ingredients: [
      { itemId: 'quantum_processor', quantity: 1 },
      { itemId: 'emotional_amplifier', quantity: 2 },
      { itemId: 'gold_ingot', quantity: 3 },
    ],
    output: { itemId: 'neural_interface', quantity: 1 },
    craftingTime: 200,
    xpGain: 200,
    stationRequired: 'electronics_lab',
    skillRequirements: [
      { skill: 'engineering', level: 8 },
      { skill: 'arcane', level: 6 },
    ],
    researchRequirements: ['brainship_symbiosis'],
  },
];

// ============================================================================
// TIER 4: EXOTIC MATERIALS
// Require special buildings, magical processes, or rare events
// ============================================================================

export const TIER_4_SPACEFLIGHT_RECIPES: Recipe[] = [
  {
    id: 'soul_anchor',
    name: 'Soul Anchor',
    category: 'Materials',
    description: 'Bind soul fragments into a stable anchor for consciousness.',
    ingredients: [
      { itemId: 'soul_fragment', quantity: 3 },
      { itemId: 'void_capacitor', quantity: 2 },
      { itemId: 'emotional_matrix', quantity: 1 },
    ],
    output: { itemId: 'soul_anchor', quantity: 1 },
    craftingTime: 300,
    xpGain: 300,
    stationRequired: 'reality_forge',
    skillRequirements: [{ skill: 'arcane', level: 9 }],
    researchRequirements: ['brainship_symbiosis'],
  },

  {
    id: 'timeline_anchor',
    name: 'Timeline Anchor',
    category: 'Materials',
    description: 'Create a fixed point in the timestream.',
    ingredients: [
      { itemId: 'temporal_regulator', quantity: 3 },
      { itemId: 'void_capacitor', quantity: 2 },
      { itemId: 'neutronium_shard', quantity: 1 },
    ],
    output: { itemId: 'timeline_anchor', quantity: 1 },
    craftingTime: 400,
    xpGain: 400,
    stationRequired: 'temporal_lab',
    skillRequirements: [
      { skill: 'arcane', level: 9 },
      { skill: 'engineering', level: 8 },
    ],
    researchRequirements: ['svetz_retrieval'],
  },

  {
    id: 'observation_nullifier',
    name: 'Observation Nullifier',
    category: 'Materials',
    description: 'Shield probability from observation collapse.',
    ingredients: [
      { itemId: 'quantum_processor', quantity: 2 },
      { itemId: 'condensed_void', quantity: 5 },
      { itemId: 'temporal_crystal', quantity: 2 },
    ],
    output: { itemId: 'observation_nullifier', quantity: 1 },
    craftingTime: 350,
    xpGain: 350,
    stationRequired: 'temporal_lab',
    skillRequirements: [{ skill: 'arcane', level: 10 }],
    researchRequirements: ['probability_scout'],
  },

  {
    id: 'probability_lens',
    name: 'Probability Lens',
    category: 'Materials',
    description: 'Focus on desired probability branches.',
    ingredients: [
      { itemId: 'observation_nullifier', quantity: 1 },
      { itemId: 'focusing_array', quantity: 3 },
      { itemId: 'quantum_processor', quantity: 1 },
    ],
    output: { itemId: 'probability_lens', quantity: 1 },
    craftingTime: 500,
    xpGain: 500,
    stationRequired: 'reality_forge',
    skillRequirements: [
      { skill: 'arcane', level: 10 },
      { skill: 'engineering', level: 9 },
    ],
    researchRequirements: ['probability_scout'],
  },

  {
    id: 'reality_thread',
    name: 'Reality Thread',
    category: 'Materials',
    description: 'Weave timelines into a single coherent strand.',
    ingredients: [
      { itemId: 'timeline_anchor', quantity: 2 },
      { itemId: 'probability_lens', quantity: 1 },
      { itemId: 'soul_anchor', quantity: 1 },
    ],
    output: { itemId: 'reality_thread', quantity: 1 },
    craftingTime: 800,
    xpGain: 800,
    stationRequired: 'reality_forge',
    skillRequirements: [{ skill: 'arcane', level: 10 }],
    researchRequirements: ['timeline_merger'],
  },

  {
    id: 'coherence_crystal',
    name: 'Coherence Crystal',
    category: 'Materials',
    description: 'Crystallize emotional coherence into solid form.',
    ingredients: [
      { itemId: 'emotional_matrix', quantity: 2 },
      { itemId: 'resonance_core', quantity: 2 },
      { itemId: 'mana_crystal', quantity: 5 },
    ],
    output: { itemId: 'coherence_crystal', quantity: 1 },
    craftingTime: 200,
    xpGain: 200,
    stationRequired: 'arcane_forge',
    skillRequirements: [{ skill: 'arcane', level: 8 }],
    researchRequirements: ['the_heart'],
  },

  {
    id: 'neutronium_core',
    name: 'Neutronium Core',
    category: 'Materials',
    description: 'Forge neutronium shards into a hyperdense core.',
    ingredients: [
      { itemId: 'neutronium_shard', quantity: 5 },
      { itemId: 'stellarite_ingot', quantity: 10 },
      { itemId: 'void_capacitor', quantity: 3 },
    ],
    output: { itemId: 'neutronium_core', quantity: 1 },
    craftingTime: 600,
    xpGain: 600,
    stationRequired: 'reality_forge',
    skillRequirements: [{ skill: 'smithing', level: 10 }],
    researchRequirements: ['worldship_design'],
  },
];

// ============================================================================
// TIER 5: SHIP COMPONENTS
// Structural parts, hull sections, and ship systems
// ============================================================================

export const TIER_5_SPACEFLIGHT_RECIPES: Recipe[] = [
  {
    id: 'hull_plating',
    name: 'Hull Plating',
    category: 'Building',
    description: 'Forge reinforced plating for spacecraft hulls.',
    ingredients: [
      { itemId: 'stellarite_plate', quantity: 4 },
      { itemId: 'steel_ingot', quantity: 6 },
    ],
    output: { itemId: 'hull_plating', quantity: 1 },
    craftingTime: 60,
    xpGain: 60,
    stationRequired: 'shipyard',
    skillRequirements: [{ skill: 'smithing', level: 6 }],
    researchRequirements: ['worldship_design'],
  },

  {
    id: 'reinforced_hull',
    name: 'Reinforced Hull Section',
    category: 'Building',
    description: 'Layer adamantine into hull plating for maximum protection.',
    ingredients: [
      { itemId: 'hull_plating', quantity: 4 },
      { itemId: 'adamantine_ingot', quantity: 2 },
    ],
    output: { itemId: 'reinforced_hull', quantity: 1 },
    craftingTime: 100,
    xpGain: 100,
    stationRequired: 'advanced_shipyard',
    skillRequirements: [{ skill: 'smithing', level: 8 }],
    researchRequirements: ['advanced_shipyard'],
  },

  {
    id: 'propulsion_unit',
    name: 'Propulsion Unit',
    category: 'Building',
    description: 'Assemble a complete void-powered propulsion system.',
    ingredients: [
      { itemId: 'void_engine_component', quantity: 2 },
      { itemId: 'resonance_core', quantity: 1 },
      { itemId: 'stellarite_plate', quantity: 4 },
    ],
    output: { itemId: 'propulsion_unit', quantity: 1 },
    craftingTime: 200,
    xpGain: 200,
    stationRequired: 'advanced_shipyard',
    skillRequirements: [{ skill: 'engineering', level: 8 }],
    researchRequirements: ['threshold_ship'],
  },

  {
    id: 'navigation_array',
    name: 'Navigation Array',
    category: 'Building',
    description: 'Build a quantum-enhanced navigation system.',
    ingredients: [
      { itemId: 'quantum_processor', quantity: 2 },
      { itemId: 'focusing_array', quantity: 2 },
      { itemId: 'advanced_circuit', quantity: 10 },
    ],
    output: { itemId: 'navigation_array', quantity: 1 },
    craftingTime: 180,
    xpGain: 180,
    stationRequired: 'advanced_shipyard',
    skillRequirements: [{ skill: 'engineering', level: 8 }],
    researchRequirements: ['gleisner_vessel'],
  },

  {
    id: 'communication_relay',
    name: 'Communication Relay',
    category: 'Building',
    description: 'Construct a resonance-based communication system.',
    ingredients: [
      { itemId: 'resonance_coil', quantity: 4 },
      { itemId: 'advanced_circuit', quantity: 6 },
      { itemId: 'crystal_lens', quantity: 3 },
    ],
    output: { itemId: 'communication_relay', quantity: 1 },
    craftingTime: 80,
    xpGain: 80,
    stationRequired: 'shipyard',
    skillRequirements: [{ skill: 'engineering', level: 5 }],
    researchRequirements: ['shipyard_construction'],
  },

  {
    id: 'power_core',
    name: 'Power Core',
    category: 'Building',
    description: 'Build a high-output resonance power core.',
    ingredients: [
      { itemId: 'resonance_core', quantity: 2 },
      { itemId: 'void_capacitor', quantity: 4 },
      { itemId: 'mana_crystal', quantity: 10 },
    ],
    output: { itemId: 'power_core', quantity: 1 },
    craftingTime: 250,
    xpGain: 250,
    stationRequired: 'advanced_shipyard',
    skillRequirements: [
      { skill: 'engineering', level: 7 },
      { skill: 'arcane', level: 7 },
    ],
    researchRequirements: ['worldship_design'],
  },

  {
    id: 'shield_generator',
    name: 'Shield Generator',
    category: 'Building',
    description: 'Construct a void-based defensive shield system.',
    ingredients: [
      { itemId: 'void_capacitor', quantity: 3 },
      { itemId: 'focusing_array', quantity: 2 },
      { itemId: 'resonance_coil', quantity: 4 },
    ],
    output: { itemId: 'shield_generator', quantity: 1 },
    craftingTime: 160,
    xpGain: 160,
    stationRequired: 'advanced_shipyard',
    skillRequirements: [{ skill: 'engineering', level: 7 }],
    researchRequirements: ['threshold_ship'],
  },
];

// ============================================================================
// TIER 6: SHIP MODULES
// Complex integrated assemblies - the final ship components
// ============================================================================

export const TIER_6_SPACEFLIGHT_RECIPES: Recipe[] = [
  {
    id: 'heart_chamber_core',
    name: 'Heart Chamber Core',
    category: 'Building',
    description: 'The central emotional coherence system for β-space navigation.',
    ingredients: [
      { itemId: 'soul_anchor', quantity: 1 },
      { itemId: 'emotional_matrix', quantity: 3 },
      { itemId: 'coherence_crystal', quantity: 2 },
      { itemId: 'neural_interface', quantity: 2 },
    ],
    output: { itemId: 'heart_chamber_core', quantity: 1 },
    craftingTime: 500,
    xpGain: 500,
    stationRequired: 'advanced_shipyard',
    skillRequirements: [
      { skill: 'arcane', level: 9 },
      { skill: 'engineering', level: 8 },
    ],
    researchRequirements: ['the_heart'],
  },

  {
    id: 'emotion_theater_system',
    name: 'Emotion Theater System',
    category: 'Building',
    description: 'A VR system for communal emotional experiences.',
    ingredients: [
      { itemId: 'emotional_matrix', quantity: 4 },
      { itemId: 'quantum_processor', quantity: 2 },
      { itemId: 'focusing_array', quantity: 3 },
      { itemId: 'hull_plating', quantity: 2 },
    ],
    output: { itemId: 'emotion_theater_system', quantity: 1 },
    craftingTime: 400,
    xpGain: 400,
    stationRequired: 'advanced_shipyard',
    skillRequirements: [
      { skill: 'arcane', level: 8 },
      { skill: 'engineering', level: 7 },
    ],
    researchRequirements: ['emotion_theaters'],
  },

  {
    id: 'memory_hall_archive',
    name: 'Memory Hall Archive',
    category: 'Building',
    description: 'A quantum storage system for shared memories.',
    ingredients: [
      { itemId: 'quantum_processor', quantity: 3 },
      { itemId: 'neural_interface', quantity: 2 },
      { itemId: 'void_capacitor', quantity: 2 },
      { itemId: 'crystal_lens', quantity: 10 },
    ],
    output: { itemId: 'memory_hall_archive', quantity: 1 },
    craftingTime: 350,
    xpGain: 350,
    stationRequired: 'advanced_shipyard',
    skillRequirements: [{ skill: 'engineering', level: 8 }],
    researchRequirements: ['memory_halls'],
  },

  {
    id: 'meditation_chamber_unit',
    name: 'Meditation Chamber Unit',
    category: 'Building',
    description: 'A chamber for emotional calibration and coherence training.',
    ingredients: [
      { itemId: 'emotional_amplifier', quantity: 4 },
      { itemId: 'coherence_crystal', quantity: 1 },
      { itemId: 'hull_plating', quantity: 2 },
      { itemId: 'life_support_module', quantity: 1 },
    ],
    output: { itemId: 'meditation_chamber_unit', quantity: 1 },
    craftingTime: 200,
    xpGain: 200,
    stationRequired: 'shipyard',
    skillRequirements: [{ skill: 'arcane', level: 6 }],
    researchRequirements: ['meditation_chambers'],
  },

  {
    id: 'vr_immersion_pod',
    name: 'VR Immersion Pod',
    category: 'Building',
    description: 'Full sensory immersion for virtual reality experiences.',
    ingredients: [
      { itemId: 'neural_interface', quantity: 2 },
      { itemId: 'quantum_processor', quantity: 1 },
      { itemId: 'emotional_amplifier', quantity: 2 },
      { itemId: 'life_support_module', quantity: 1 },
    ],
    output: { itemId: 'vr_immersion_pod', quantity: 1 },
    craftingTime: 250,
    xpGain: 250,
    stationRequired: 'advanced_shipyard',
    skillRequirements: [{ skill: 'engineering', level: 7 }],
    researchRequirements: ['vr_systems'],
  },

  {
    id: 'gleisner_body_frame',
    name: 'Gleisner Body Frame',
    category: 'Building',
    description: 'A robotic body frame for mind upload and remote operation.',
    ingredients: [
      { itemId: 'neural_interface', quantity: 3 },
      { itemId: 'quantum_processor', quantity: 2 },
      { itemId: 'stellarite_plate', quantity: 6 },
      { itemId: 'processing_unit', quantity: 4 },
    ],
    output: { itemId: 'gleisner_body_frame', quantity: 1 },
    craftingTime: 450,
    xpGain: 450,
    stationRequired: 'advanced_shipyard',
    skillRequirements: [{ skill: 'engineering', level: 9 }],
    researchRequirements: ['gleisner_vessel'],
  },

  {
    id: 'svetz_retrieval_engine',
    name: 'Svetz Retrieval Engine',
    category: 'Building',
    description: 'A temporal drive for retrieval from alternate timelines.',
    ingredients: [
      { itemId: 'timeline_anchor', quantity: 2 },
      { itemId: 'temporal_regulator', quantity: 4 },
      { itemId: 'void_engine_component', quantity: 2 },
      { itemId: 'navigation_array', quantity: 1 },
    ],
    output: { itemId: 'svetz_retrieval_engine', quantity: 1 },
    craftingTime: 700,
    xpGain: 700,
    stationRequired: 'reality_forge',
    skillRequirements: [
      { skill: 'arcane', level: 10 },
      { skill: 'engineering', level: 9 },
    ],
    researchRequirements: ['svetz_retrieval'],
  },

  {
    id: 'probability_drive',
    name: 'Probability Drive',
    category: 'Building',
    description: 'Navigate probability space to reach improbable destinations.',
    ingredients: [
      { itemId: 'probability_lens', quantity: 2 },
      { itemId: 'observation_nullifier', quantity: 2 },
      { itemId: 'quantum_processor', quantity: 4 },
      { itemId: 'propulsion_unit', quantity: 1 },
    ],
    output: { itemId: 'probability_drive', quantity: 1 },
    craftingTime: 800,
    xpGain: 800,
    stationRequired: 'reality_forge',
    skillRequirements: [
      { skill: 'arcane', level: 10 },
      { skill: 'engineering', level: 10 },
    ],
    researchRequirements: ['probability_scout'],
  },

  {
    id: 'timeline_merger_core',
    name: 'Timeline Merger Core',
    category: 'Building',
    description: 'The ultimate clarketech: merge divergent timelines.',
    ingredients: [
      { itemId: 'reality_thread', quantity: 3 },
      { itemId: 'timeline_anchor', quantity: 4 },
      { itemId: 'probability_drive', quantity: 1 },
      { itemId: 'neutronium_core', quantity: 1 },
    ],
    output: { itemId: 'timeline_merger_core', quantity: 1 },
    craftingTime: 1200,
    xpGain: 1200,
    stationRequired: 'reality_forge',
    skillRequirements: [{ skill: 'arcane', level: 10 }],
    researchRequirements: ['timeline_merger'],
  },
];

// ============================================================================
// SHIP HULL KIT RECIPES
// Complete assemblies for different ship types
// ============================================================================

export const SHIP_HULL_KIT_RECIPES: Recipe[] = [
  {
    id: 'worldship_hull_kit',
    name: 'Worldship Hull Kit',
    category: 'Building',
    description: 'Complete hull assembly for a generation worldship.',
    ingredients: [
      { itemId: 'reinforced_hull', quantity: 20 },
      { itemId: 'life_support_module', quantity: 5 },
      { itemId: 'power_core', quantity: 2 },
      { itemId: 'navigation_array', quantity: 1 },
    ],
    output: { itemId: 'worldship_hull_kit', quantity: 1 },
    craftingTime: 2000,
    xpGain: 2000,
    stationRequired: 'advanced_shipyard',
    skillRequirements: [
      { skill: 'engineering', level: 8 },
      { skill: 'smithing', level: 8 },
    ],
    researchRequirements: ['worldship_design'],
  },

  {
    id: 'threshold_hull_kit',
    name: 'Threshold Ship Hull Kit',
    category: 'Building',
    description: 'Complete hull assembly for a β-space threshold ship.',
    ingredients: [
      { itemId: 'reinforced_hull', quantity: 10 },
      { itemId: 'propulsion_unit', quantity: 2 },
      { itemId: 'shield_generator', quantity: 2 },
      { itemId: 'heart_chamber_core', quantity: 1 },
    ],
    output: { itemId: 'threshold_hull_kit', quantity: 1 },
    craftingTime: 1500,
    xpGain: 1500,
    stationRequired: 'advanced_shipyard',
    skillRequirements: [
      { skill: 'engineering', level: 9 },
      { skill: 'arcane', level: 8 },
    ],
    researchRequirements: ['threshold_ship'],
  },

  {
    id: 'courier_hull_kit',
    name: 'Courier Ship Hull Kit',
    category: 'Building',
    description: 'Complete hull assembly for a fast courier ship.',
    ingredients: [
      { itemId: 'hull_plating', quantity: 10 },
      { itemId: 'propulsion_unit', quantity: 1 },
      { itemId: 'navigation_array', quantity: 1 },
      { itemId: 'communication_relay', quantity: 2 },
    ],
    output: { itemId: 'courier_hull_kit', quantity: 1 },
    craftingTime: 800,
    xpGain: 800,
    stationRequired: 'shipyard',
    skillRequirements: [{ skill: 'engineering', level: 6 }],
    researchRequirements: ['courier_ship'],
  },

  {
    id: 'brainship_hull_kit',
    name: 'Brainship Hull Kit',
    category: 'Building',
    description: 'Complete hull assembly for a symbiotic brainship.',
    ingredients: [
      { itemId: 'reinforced_hull', quantity: 8 },
      { itemId: 'heart_chamber_core', quantity: 1 },
      { itemId: 'neural_interface', quantity: 4 },
      { itemId: 'life_support_module', quantity: 3 },
    ],
    output: { itemId: 'brainship_hull_kit', quantity: 1 },
    craftingTime: 1800,
    xpGain: 1800,
    stationRequired: 'advanced_shipyard',
    skillRequirements: [
      { skill: 'engineering', level: 9 },
      { skill: 'arcane', level: 8 },
    ],
    researchRequirements: ['brainship_symbiosis'],
  },

  {
    id: 'storyship_hull_kit',
    name: 'Storyship Hull Kit',
    category: 'Building',
    description: 'Complete hull assembly for a narrative-driven storyship.',
    ingredients: [
      { itemId: 'reinforced_hull', quantity: 15 },
      { itemId: 'emotion_theater_system', quantity: 2 },
      { itemId: 'memory_hall_archive', quantity: 2 },
      { itemId: 'heart_chamber_core', quantity: 1 },
    ],
    output: { itemId: 'storyship_hull_kit', quantity: 1 },
    craftingTime: 2200,
    xpGain: 2200,
    stationRequired: 'advanced_shipyard',
    skillRequirements: [
      { skill: 'arcane', level: 9 },
      { skill: 'engineering', level: 8 },
    ],
    researchRequirements: ['story_ship'],
  },

  {
    id: 'gleisner_hull_kit',
    name: 'Gleisner Vessel Hull Kit',
    category: 'Building',
    description: 'Complete hull assembly for a Gleisner upload vessel.',
    ingredients: [
      { itemId: 'hull_plating', quantity: 15 },
      { itemId: 'gleisner_body_frame', quantity: 3 },
      { itemId: 'vr_immersion_pod', quantity: 5 },
      { itemId: 'navigation_array', quantity: 2 },
    ],
    output: { itemId: 'gleisner_hull_kit', quantity: 1 },
    craftingTime: 1600,
    xpGain: 1600,
    stationRequired: 'advanced_shipyard',
    skillRequirements: [{ skill: 'engineering', level: 9 }],
    researchRequirements: ['gleisner_vessel'],
  },

  {
    id: 'svetz_hull_kit',
    name: 'Svetz Retrieval Hull Kit',
    category: 'Building',
    description: 'Complete hull assembly for a temporal retrieval vessel.',
    ingredients: [
      { itemId: 'reinforced_hull', quantity: 12 },
      { itemId: 'svetz_retrieval_engine', quantity: 1 },
      { itemId: 'shield_generator', quantity: 3 },
      { itemId: 'life_support_module', quantity: 2 },
    ],
    output: { itemId: 'svetz_hull_kit', quantity: 1 },
    craftingTime: 2500,
    xpGain: 2500,
    stationRequired: 'reality_forge',
    skillRequirements: [
      { skill: 'arcane', level: 10 },
      { skill: 'engineering', level: 9 },
    ],
    researchRequirements: ['svetz_retrieval'],
  },

  {
    id: 'probability_scout_hull_kit',
    name: 'Probability Scout Hull Kit',
    category: 'Building',
    description: 'Complete hull assembly for a probability exploration vessel.',
    ingredients: [
      { itemId: 'hull_plating', quantity: 8 },
      { itemId: 'probability_drive', quantity: 1 },
      { itemId: 'navigation_array', quantity: 2 },
      { itemId: 'observation_nullifier', quantity: 2 },
    ],
    output: { itemId: 'probability_scout_hull_kit', quantity: 1 },
    craftingTime: 2800,
    xpGain: 2800,
    stationRequired: 'reality_forge',
    skillRequirements: [
      { skill: 'arcane', level: 10 },
      { skill: 'engineering', level: 10 },
    ],
    researchRequirements: ['probability_scout'],
  },

  {
    id: 'timeline_merger_hull_kit',
    name: 'Timeline Merger Hull Kit',
    category: 'Building',
    description: 'Complete hull assembly for the ultimate timeline manipulation vessel.',
    ingredients: [
      { itemId: 'reinforced_hull', quantity: 25 },
      { itemId: 'timeline_merger_core', quantity: 1 },
      { itemId: 'probability_drive', quantity: 2 },
      { itemId: 'power_core', quantity: 3 },
      { itemId: 'shield_generator', quantity: 4 },
    ],
    output: { itemId: 'timeline_merger_hull_kit', quantity: 1 },
    craftingTime: 5000,
    xpGain: 5000,
    stationRequired: 'reality_forge',
    skillRequirements: [{ skill: 'arcane', level: 10 }],
    researchRequirements: ['timeline_merger'],
  },
];

// ============================================================================
// COMBINED EXPORTS
// ============================================================================

export const ALL_SPACEFLIGHT_RECIPES: Recipe[] = [
  ...TIER_1_SPACEFLIGHT_RECIPES,
  ...TIER_2_SPACEFLIGHT_RECIPES,
  ...TIER_3_SPACEFLIGHT_RECIPES,
  ...TIER_4_SPACEFLIGHT_RECIPES,
  ...TIER_5_SPACEFLIGHT_RECIPES,
  ...TIER_6_SPACEFLIGHT_RECIPES,
  ...SHIP_HULL_KIT_RECIPES,
];

/**
 * Register all spaceflight recipes with the recipe registry.
 */
export function registerSpaceflightRecipes(registry: { registerRecipe: (recipe: Recipe) => void }): void {
  for (const recipe of ALL_SPACEFLIGHT_RECIPES) {
    registry.registerRecipe(recipe);
  }
}
