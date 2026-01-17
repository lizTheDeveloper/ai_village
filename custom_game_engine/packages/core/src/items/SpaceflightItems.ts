/**
 * Spaceflight Item Definitions
 *
 * A Factorio-inspired production chain for spaceship construction.
 * Items are organized into tiers representing increasing complexity:
 *
 * Tier 0: Raw Resources - gathered from the environment
 * Tier 1: Basic Processed Materials - simple smelting/refining
 * Tier 2: Intermediate Components - combine basic materials
 * Tier 3: Advanced Components - combine intermediates
 * Tier 4: Exotic Materials - require special buildings/magic
 * Tier 5: Ship Components - structural parts and systems
 * Tier 6: Ship Modules - complex integrated assemblies
 *
 * Production chain follows the pattern:
 * raw_resource -> refined_material -> component -> advanced_component -> ship_part
 */

import { defineItem, type ItemDefinition } from './ItemDefinition.js';

// ============================================================================
// TIER 0: RAW RESOURCES
// Gathered from the environment, mines, or special locations
// ============================================================================

export const RAW_SPACEFLIGHT_RESOURCES: ItemDefinition[] = [
  defineItem('mana_shard', 'Mana Shard', 'material', {
    weight: 0.3,
    stackSize: 50,
    isGatherable: true,
    gatherSources: ['ley_line_node', 'mana_spring', 'arcane_deposit'],
    baseValue: 25,
    rarity: 'uncommon',
  }),

  defineItem('rare_earth_ore', 'Rare Earth Ore', 'material', {
    weight: 4.0,
    stackSize: 30,
    isGatherable: true,
    gatherSources: ['rare_earth_deposit', 'deep_mine'],
    requiredTool: 'pickaxe',
    baseValue: 35,
    rarity: 'uncommon',
  }),

  defineItem('silicon_sand', 'Silicon Sand', 'material', {
    weight: 2.5,
    stackSize: 50,
    isGatherable: true,
    gatherSources: ['desert', 'beach', 'quartz_deposit'],
    baseValue: 8,
    rarity: 'common',
  }),

  defineItem('raw_crystal', 'Raw Crystal', 'material', {
    weight: 1.5,
    stackSize: 30,
    isGatherable: true,
    gatherSources: ['crystal_cave', 'geode', 'magical_deposit'],
    requiredTool: 'pickaxe',
    baseValue: 40,
    rarity: 'uncommon',
  }),

  defineItem('void_essence', 'Void Essence', 'material', {
    weight: 0.1,
    stackSize: 20,
    isGatherable: true,
    gatherSources: ['void_rift', 'black_hole_remnant', 'universe_edge'],
    baseValue: 150,
    rarity: 'rare',
  }),

  defineItem('temporal_dust', 'Temporal Dust', 'material', {
    weight: 0.05,
    stackSize: 30,
    isGatherable: true,
    gatherSources: ['temporal_anomaly', 'time_storm', 'ancient_ruins'],
    baseValue: 200,
    rarity: 'rare',
  }),

  defineItem('emotional_resonance', 'Emotional Resonance', 'material', {
    weight: 0.0,
    stackSize: 100,
    isGatherable: false, // Harvested from emotional experiences
    baseValue: 50,
    rarity: 'uncommon',
  }),

  defineItem('soul_fragment', 'Soul Fragment', 'material', {
    weight: 0.0,
    stackSize: 10,
    isGatherable: false, // From death/resurrection events
    baseValue: 500,
    rarity: 'legendary',
  }),

  defineItem('stellarite_ore', 'Stellarite Ore', 'material', {
    weight: 3.5,
    stackSize: 25,
    isGatherable: true,
    gatherSources: ['meteor_impact', 'asteroid_debris', 'star_forge'],
    requiredTool: 'steel_pickaxe',
    baseValue: 75,
    rarity: 'rare',
  }),

  defineItem('neutronium_shard', 'Neutronium Shard', 'material', {
    weight: 50.0,
    stackSize: 5,
    isGatherable: true,
    gatherSources: ['neutron_star_fragment', 'gravity_well', 'collapsed_star'],
    baseValue: 1000,
    rarity: 'legendary',
  }),
];

// ============================================================================
// TIER 1: BASIC PROCESSED MATERIALS
// Simple processing: smelting, refining, basic crafting
// ============================================================================

export const PROCESSED_SPACEFLIGHT_MATERIALS: ItemDefinition[] = [
  defineItem('refined_mana', 'Refined Mana', 'material', {
    weight: 0.2,
    stackSize: 50,
    craftedFrom: [{ itemId: 'mana_shard', amount: 3 }],
    baseValue: 80,
    rarity: 'uncommon',
    researchRequired: 'basic_propulsion',
  }),

  defineItem('rare_earth_compound', 'Rare Earth Compound', 'material', {
    weight: 2.0,
    stackSize: 30,
    craftedFrom: [
      { itemId: 'rare_earth_ore', amount: 3 },
      { itemId: 'coal', amount: 1 },
    ],
    baseValue: 120,
    rarity: 'uncommon',
    researchRequired: 'basic_propulsion',
  }),

  defineItem('silicon_wafer', 'Silicon Wafer', 'material', {
    weight: 0.3,
    stackSize: 50,
    craftedFrom: [
      { itemId: 'silicon_sand', amount: 5 },
      { itemId: 'coal', amount: 2 },
    ],
    baseValue: 50,
    rarity: 'common',
    researchRequired: 'basic_propulsion',
  }),

  defineItem('crystal_lens', 'Crystal Lens', 'material', {
    weight: 0.5,
    stackSize: 20,
    craftedFrom: [{ itemId: 'raw_crystal', amount: 2 }],
    baseValue: 90,
    rarity: 'uncommon',
    researchRequired: 'basic_propulsion',
  }),

  defineItem('stellarite_ingot', 'Stellarite Ingot', 'material', {
    weight: 2.0,
    stackSize: 25,
    craftedFrom: [
      { itemId: 'stellarite_ore', amount: 3 },
      { itemId: 'coal', amount: 2 },
    ],
    baseValue: 250,
    rarity: 'rare',
    researchRequired: 'worldship_design',
  }),

  defineItem('condensed_void', 'Condensed Void', 'material', {
    weight: 0.0,
    stackSize: 15,
    craftedFrom: [{ itemId: 'void_essence', amount: 5 }],
    baseValue: 800,
    rarity: 'rare',
    researchRequired: 'emotional_topology',
  }),

  defineItem('temporal_crystal', 'Temporal Crystal', 'material', {
    weight: 0.2,
    stackSize: 20,
    craftedFrom: [
      { itemId: 'temporal_dust', amount: 10 },
      { itemId: 'raw_crystal', amount: 1 },
    ],
    baseValue: 600,
    rarity: 'rare',
    researchRequired: 'svetz_retrieval',
  }),

  defineItem('emotional_essence', 'Emotional Essence', 'material', {
    weight: 0.0,
    stackSize: 50,
    craftedFrom: [{ itemId: 'emotional_resonance', amount: 10 }],
    baseValue: 150,
    rarity: 'uncommon',
    researchRequired: 'emotional_topology',
  }),
];

// ============================================================================
// TIER 2: INTERMEDIATE COMPONENTS
// Combine basic materials into functional components
// ============================================================================

export const INTERMEDIATE_SPACEFLIGHT_COMPONENTS: ItemDefinition[] = [
  defineItem('mana_crystal', 'Mana Crystal', 'material', {
    weight: 0.4,
    stackSize: 30,
    craftedFrom: [
      { itemId: 'refined_mana', amount: 3 },
      { itemId: 'raw_crystal', amount: 1 },
    ],
    baseValue: 300,
    rarity: 'uncommon',
    researchRequired: 'basic_propulsion',
  }),

  defineItem('basic_circuit', 'Basic Circuit', 'material', {
    weight: 0.2,
    stackSize: 50,
    craftedFrom: [
      { itemId: 'silicon_wafer', amount: 2 },
      { itemId: 'copper_ingot', amount: 1 },
    ],
    baseValue: 75,
    rarity: 'common',
    researchRequired: 'basic_propulsion',
  }),

  defineItem('advanced_circuit', 'Advanced Circuit', 'material', {
    weight: 0.3,
    stackSize: 40,
    craftedFrom: [
      { itemId: 'basic_circuit', amount: 2 },
      { itemId: 'rare_earth_compound', amount: 1 },
      { itemId: 'gold_ingot', amount: 1 },
    ],
    baseValue: 200,
    rarity: 'uncommon',
    researchRequired: 'shipyard_construction',
  }),

  defineItem('resonance_coil', 'Resonance Coil', 'material', {
    weight: 1.0,
    stackSize: 20,
    craftedFrom: [
      { itemId: 'copper_ingot', amount: 5 },
      { itemId: 'mana_crystal', amount: 1 },
    ],
    baseValue: 350,
    rarity: 'uncommon',
    researchRequired: 'emotional_topology',
  }),

  defineItem('focusing_array', 'Focusing Array', 'material', {
    weight: 0.8,
    stackSize: 15,
    craftedFrom: [
      { itemId: 'crystal_lens', amount: 4 },
      { itemId: 'gold_ingot', amount: 2 },
    ],
    baseValue: 450,
    rarity: 'rare',
    researchRequired: 'threshold_ship',
  }),

  defineItem('void_capacitor', 'Void Capacitor', 'material', {
    weight: 0.5,
    stackSize: 15,
    craftedFrom: [
      { itemId: 'condensed_void', amount: 2 },
      { itemId: 'stellarite_ingot', amount: 1 },
    ],
    baseValue: 900,
    rarity: 'rare',
    researchRequired: 'emotional_topology',
  }),

  defineItem('temporal_regulator', 'Temporal Regulator', 'material', {
    weight: 0.6,
    stackSize: 10,
    craftedFrom: [
      { itemId: 'temporal_crystal', amount: 2 },
      { itemId: 'advanced_circuit', amount: 1 },
    ],
    baseValue: 1500,
    rarity: 'epic',
    researchRequired: 'svetz_retrieval',
  }),

  defineItem('emotional_amplifier', 'Emotional Amplifier', 'material', {
    weight: 0.3,
    stackSize: 20,
    craftedFrom: [
      { itemId: 'emotional_essence', amount: 5 },
      { itemId: 'resonance_coil', amount: 1 },
    ],
    baseValue: 400,
    rarity: 'uncommon',
    researchRequired: 'the_heart',
  }),

  defineItem('stellarite_plate', 'Stellarite Plate', 'material', {
    weight: 4.0,
    stackSize: 20,
    craftedFrom: [
      { itemId: 'stellarite_ingot', amount: 4 },
      { itemId: 'steel_ingot', amount: 2 },
    ],
    baseValue: 600,
    rarity: 'rare',
    researchRequired: 'worldship_design',
  }),
];

// ============================================================================
// TIER 3: ADVANCED COMPONENTS
// Complex assemblies requiring multiple intermediate components
// ============================================================================

export const ADVANCED_SPACEFLIGHT_COMPONENTS: ItemDefinition[] = [
  defineItem('processing_unit', 'Processing Unit', 'material', {
    weight: 0.5,
    stackSize: 20,
    craftedFrom: [
      { itemId: 'advanced_circuit', amount: 4 },
      { itemId: 'rare_earth_compound', amount: 2 },
      { itemId: 'gold_ingot', amount: 1 },
    ],
    baseValue: 500,
    rarity: 'rare',
    researchRequired: 'brainship_symbiosis',
  }),

  defineItem('quantum_processor', 'Quantum Processor', 'material', {
    weight: 0.3,
    stackSize: 10,
    craftedFrom: [
      { itemId: 'processing_unit', amount: 2 },
      { itemId: 'void_capacitor', amount: 1 },
      { itemId: 'temporal_crystal', amount: 1 },
    ],
    baseValue: 2500,
    rarity: 'epic',
    clarketechTier: 2,
    researchRequired: 'gleisner_vessel',
  }),

  defineItem('resonance_core', 'Resonance Core', 'material', {
    weight: 2.0,
    stackSize: 5,
    craftedFrom: [
      { itemId: 'resonance_coil', amount: 4 },
      { itemId: 'mana_crystal', amount: 3 },
      { itemId: 'focusing_array', amount: 1 },
    ],
    baseValue: 1800,
    rarity: 'epic',
    clarketechTier: 1,
    researchRequired: 'emotional_topology',
  }),

  defineItem('emotional_matrix', 'Emotional Matrix', 'material', {
    weight: 1.0,
    stackSize: 10,
    craftedFrom: [
      { itemId: 'emotional_amplifier', amount: 4 },
      { itemId: 'resonance_core', amount: 1 },
      { itemId: 'crystal_lens', amount: 2 },
    ],
    baseValue: 2000,
    rarity: 'epic',
    clarketechTier: 1,
    researchRequired: 'the_heart',
  }),

  defineItem('void_engine_component', 'Void Engine Component', 'material', {
    weight: 5.0,
    stackSize: 5,
    craftedFrom: [
      { itemId: 'void_capacitor', amount: 3 },
      { itemId: 'stellarite_plate', amount: 4 },
      { itemId: 'resonance_core', amount: 1 },
    ],
    baseValue: 4000,
    rarity: 'epic',
    clarketechTier: 2,
    researchRequired: 'threshold_ship',
  }),

  defineItem('life_support_module', 'Life Support Module', 'material', {
    weight: 8.0,
    stackSize: 3,
    craftedFrom: [
      { itemId: 'processing_unit', amount: 2 },
      { itemId: 'stellarite_plate', amount: 3 },
      { itemId: 'advanced_circuit', amount: 5 },
      { itemId: 'water', amount: 10 },
    ],
    baseValue: 1500,
    rarity: 'rare',
    researchRequired: 'life_support_systems',
  }),

  defineItem('neural_interface', 'Neural Interface', 'material', {
    weight: 0.5,
    stackSize: 10,
    craftedFrom: [
      { itemId: 'quantum_processor', amount: 1 },
      { itemId: 'emotional_amplifier', amount: 2 },
      { itemId: 'gold_ingot', amount: 3 },
    ],
    baseValue: 3500,
    rarity: 'epic',
    clarketechTier: 2,
    researchRequired: 'brainship_symbiosis',
  }),
];

// ============================================================================
// TIER 4: EXOTIC MATERIALS
// Require special buildings, magical processes, or rare events
// ============================================================================

export const EXOTIC_SPACEFLIGHT_MATERIALS: ItemDefinition[] = [
  defineItem('soul_anchor', 'Soul Anchor', 'material', {
    weight: 1.0,
    stackSize: 3,
    craftedFrom: [
      { itemId: 'soul_fragment', amount: 3 },
      { itemId: 'void_capacitor', amount: 2 },
      { itemId: 'emotional_matrix', amount: 1 },
    ],
    baseValue: 8000,
    rarity: 'legendary',
    clarketechTier: 3,
    researchRequired: 'brainship_symbiosis',
  }),

  defineItem('timeline_anchor', 'Timeline Anchor', 'material', {
    weight: 0.5,
    stackSize: 5,
    craftedFrom: [
      { itemId: 'temporal_regulator', amount: 3 },
      { itemId: 'void_capacitor', amount: 2 },
      { itemId: 'neutronium_shard', amount: 1 },
    ],
    baseValue: 12000,
    rarity: 'legendary',
    clarketechTier: 4,
    researchRequired: 'svetz_retrieval',
  }),

  defineItem('observation_nullifier', 'Observation Nullifier', 'material', {
    weight: 0.2,
    stackSize: 5,
    craftedFrom: [
      { itemId: 'quantum_processor', amount: 2 },
      { itemId: 'condensed_void', amount: 5 },
      { itemId: 'temporal_crystal', amount: 2 },
    ],
    baseValue: 15000,
    rarity: 'legendary',
    clarketechTier: 4,
    researchRequired: 'probability_scout',
  }),

  defineItem('probability_lens', 'Probability Lens', 'material', {
    weight: 0.3,
    stackSize: 5,
    craftedFrom: [
      { itemId: 'observation_nullifier', amount: 1 },
      { itemId: 'focusing_array', amount: 3 },
      { itemId: 'quantum_processor', amount: 1 },
    ],
    baseValue: 20000,
    rarity: 'legendary',
    clarketechTier: 5,
    researchRequired: 'probability_scout',
  }),

  defineItem('reality_thread', 'Reality Thread', 'material', {
    weight: 0.0,
    stackSize: 10,
    craftedFrom: [
      { itemId: 'timeline_anchor', amount: 2 },
      { itemId: 'probability_lens', amount: 1 },
      { itemId: 'soul_anchor', amount: 1 },
    ],
    baseValue: 50000,
    rarity: 'legendary',
    clarketechTier: 6,
    researchRequired: 'timeline_merger',
  }),

  defineItem('coherence_crystal', 'Coherence Crystal', 'material', {
    weight: 0.5,
    stackSize: 5,
    craftedFrom: [
      { itemId: 'emotional_matrix', amount: 2 },
      { itemId: 'resonance_core', amount: 2 },
      { itemId: 'mana_crystal', amount: 5 },
    ],
    baseValue: 5000,
    rarity: 'epic',
    clarketechTier: 2,
    researchRequired: 'the_heart',
  }),

  defineItem('neutronium_core', 'Neutronium Core', 'material', {
    weight: 100.0,
    stackSize: 1,
    craftedFrom: [
      { itemId: 'neutronium_shard', amount: 5 },
      { itemId: 'stellarite_ingot', amount: 10 },
      { itemId: 'void_capacitor', amount: 3 },
    ],
    baseValue: 25000,
    rarity: 'legendary',
    clarketechTier: 4,
    researchRequired: 'worldship_design',
  }),
];

// ============================================================================
// TIER 5: SHIP COMPONENTS
// Structural parts, hull sections, and ship systems
// ============================================================================

export const SHIP_STRUCTURAL_COMPONENTS: ItemDefinition[] = [
  defineItem('hull_plating', 'Hull Plating', 'material', {
    weight: 10.0,
    stackSize: 20,
    craftedFrom: [
      { itemId: 'stellarite_plate', amount: 4 },
      { itemId: 'steel_ingot', amount: 6 },
    ],
    baseValue: 800,
    rarity: 'rare',
    researchRequired: 'worldship_design',
  }),

  defineItem('reinforced_hull', 'Reinforced Hull Section', 'material', {
    weight: 25.0,
    stackSize: 10,
    craftedFrom: [
      { itemId: 'hull_plating', amount: 4 },
      { itemId: 'adamantine_ingot', amount: 2 },
    ],
    baseValue: 2500,
    rarity: 'epic',
    researchRequired: 'advanced_shipyard',
  }),

  defineItem('propulsion_unit', 'Propulsion Unit', 'material', {
    weight: 15.0,
    stackSize: 5,
    craftedFrom: [
      { itemId: 'void_engine_component', amount: 2 },
      { itemId: 'resonance_core', amount: 1 },
      { itemId: 'stellarite_plate', amount: 4 },
    ],
    baseValue: 6000,
    rarity: 'epic',
    clarketechTier: 2,
    researchRequired: 'threshold_ship',
  }),

  defineItem('navigation_array', 'Navigation Array', 'material', {
    weight: 5.0,
    stackSize: 5,
    craftedFrom: [
      { itemId: 'quantum_processor', amount: 2 },
      { itemId: 'focusing_array', amount: 2 },
      { itemId: 'advanced_circuit', amount: 10 },
    ],
    baseValue: 4000,
    rarity: 'epic',
    clarketechTier: 2,
    researchRequired: 'gleisner_vessel',
  }),

  defineItem('communication_relay', 'Communication Relay', 'material', {
    weight: 3.0,
    stackSize: 10,
    craftedFrom: [
      { itemId: 'resonance_coil', amount: 4 },
      { itemId: 'advanced_circuit', amount: 6 },
      { itemId: 'crystal_lens', amount: 3 },
    ],
    baseValue: 1200,
    rarity: 'rare',
    researchRequired: 'shipyard_construction',
  }),

  defineItem('power_core', 'Power Core', 'material', {
    weight: 20.0,
    stackSize: 3,
    craftedFrom: [
      { itemId: 'resonance_core', amount: 2 },
      { itemId: 'void_capacitor', amount: 4 },
      { itemId: 'mana_crystal', amount: 10 },
    ],
    baseValue: 8000,
    rarity: 'epic',
    clarketechTier: 2,
    researchRequired: 'worldship_design',
  }),

  defineItem('shield_generator', 'Shield Generator', 'material', {
    weight: 12.0,
    stackSize: 3,
    craftedFrom: [
      { itemId: 'void_capacitor', amount: 3 },
      { itemId: 'focusing_array', amount: 2 },
      { itemId: 'resonance_coil', amount: 4 },
    ],
    baseValue: 5000,
    rarity: 'epic',
    clarketechTier: 2,
    researchRequired: 'threshold_ship',
  }),
];

// ============================================================================
// TIER 6: SHIP MODULES
// Complex integrated assemblies - the final ship components
// ============================================================================

export const SHIP_MODULES: ItemDefinition[] = [
  defineItem('heart_chamber_core', 'Heart Chamber Core', 'material', {
    weight: 50.0,
    stackSize: 1,
    craftedFrom: [
      { itemId: 'soul_anchor', amount: 1 },
      { itemId: 'emotional_matrix', amount: 3 },
      { itemId: 'coherence_crystal', amount: 2 },
      { itemId: 'neural_interface', amount: 2 },
    ],
    baseValue: 30000,
    rarity: 'legendary',
    clarketechTier: 3,
    researchRequired: 'the_heart',
  }),

  defineItem('emotion_theater_system', 'Emotion Theater System', 'material', {
    weight: 30.0,
    stackSize: 1,
    craftedFrom: [
      { itemId: 'emotional_matrix', amount: 4 },
      { itemId: 'quantum_processor', amount: 2 },
      { itemId: 'focusing_array', amount: 3 },
      { itemId: 'hull_plating', amount: 2 },
    ],
    baseValue: 25000,
    rarity: 'legendary',
    clarketechTier: 3,
    researchRequired: 'emotion_theaters',
  }),

  defineItem('memory_hall_archive', 'Memory Hall Archive', 'material', {
    weight: 25.0,
    stackSize: 1,
    craftedFrom: [
      { itemId: 'quantum_processor', amount: 3 },
      { itemId: 'neural_interface', amount: 2 },
      { itemId: 'void_capacitor', amount: 2 },
      { itemId: 'crystal_lens', amount: 10 },
    ],
    baseValue: 20000,
    rarity: 'legendary',
    clarketechTier: 3,
    researchRequired: 'memory_halls',
  }),

  defineItem('meditation_chamber_unit', 'Meditation Chamber Unit', 'material', {
    weight: 15.0,
    stackSize: 2,
    craftedFrom: [
      { itemId: 'emotional_amplifier', amount: 4 },
      { itemId: 'coherence_crystal', amount: 1 },
      { itemId: 'hull_plating', amount: 2 },
      { itemId: 'life_support_module', amount: 1 },
    ],
    baseValue: 12000,
    rarity: 'epic',
    clarketechTier: 2,
    researchRequired: 'meditation_chambers',
  }),

  defineItem('vr_immersion_pod', 'VR Immersion Pod', 'material', {
    weight: 20.0,
    stackSize: 2,
    craftedFrom: [
      { itemId: 'neural_interface', amount: 2 },
      { itemId: 'quantum_processor', amount: 1 },
      { itemId: 'emotional_amplifier', amount: 2 },
      { itemId: 'life_support_module', amount: 1 },
    ],
    baseValue: 15000,
    rarity: 'epic',
    clarketechTier: 2,
    researchRequired: 'vr_systems',
  }),

  defineItem('gleisner_body_frame', 'Gleisner Body Frame', 'material', {
    weight: 40.0,
    stackSize: 1,
    craftedFrom: [
      { itemId: 'neural_interface', amount: 3 },
      { itemId: 'quantum_processor', amount: 2 },
      { itemId: 'stellarite_plate', amount: 6 },
      { itemId: 'processing_unit', amount: 4 },
    ],
    baseValue: 35000,
    rarity: 'legendary',
    clarketechTier: 3,
    researchRequired: 'gleisner_vessel',
  }),

  defineItem('svetz_retrieval_engine', 'Svetz Retrieval Engine', 'material', {
    weight: 35.0,
    stackSize: 1,
    craftedFrom: [
      { itemId: 'timeline_anchor', amount: 2 },
      { itemId: 'temporal_regulator', amount: 4 },
      { itemId: 'void_engine_component', amount: 2 },
      { itemId: 'navigation_array', amount: 1 },
    ],
    baseValue: 60000,
    rarity: 'legendary',
    clarketechTier: 4,
    researchRequired: 'svetz_retrieval',
  }),

  defineItem('probability_drive', 'Probability Drive', 'material', {
    weight: 45.0,
    stackSize: 1,
    craftedFrom: [
      { itemId: 'probability_lens', amount: 2 },
      { itemId: 'observation_nullifier', amount: 2 },
      { itemId: 'quantum_processor', amount: 4 },
      { itemId: 'propulsion_unit', amount: 1 },
    ],
    baseValue: 80000,
    rarity: 'legendary',
    clarketechTier: 5,
    researchRequired: 'probability_scout',
  }),

  defineItem('timeline_merger_core', 'Timeline Merger Core', 'material', {
    weight: 60.0,
    stackSize: 1,
    craftedFrom: [
      { itemId: 'reality_thread', amount: 3 },
      { itemId: 'timeline_anchor', amount: 4 },
      { itemId: 'probability_drive', amount: 1 },
      { itemId: 'neutronium_core', amount: 1 },
    ],
    baseValue: 200000,
    rarity: 'legendary',
    clarketechTier: 6,
    researchRequired: 'timeline_merger',
  }),
];

// ============================================================================
// SHIP HULL KITS - Complete assemblies for different ship types
// ============================================================================

export const SHIP_HULL_KITS: ItemDefinition[] = [
  defineItem('worldship_hull_kit', 'Worldship Hull Kit', 'material', {
    weight: 500.0,
    stackSize: 1,
    craftedFrom: [
      { itemId: 'reinforced_hull', amount: 20 },
      { itemId: 'life_support_module', amount: 5 },
      { itemId: 'power_core', amount: 2 },
      { itemId: 'navigation_array', amount: 1 },
    ],
    baseValue: 100000,
    rarity: 'legendary',
    clarketechTier: 2,
    researchRequired: 'worldship_design',
  }),

  defineItem('threshold_hull_kit', 'Threshold Ship Hull Kit', 'material', {
    weight: 200.0,
    stackSize: 1,
    craftedFrom: [
      { itemId: 'reinforced_hull', amount: 10 },
      { itemId: 'propulsion_unit', amount: 2 },
      { itemId: 'shield_generator', amount: 2 },
      { itemId: 'heart_chamber_core', amount: 1 },
    ],
    baseValue: 150000,
    rarity: 'legendary',
    clarketechTier: 3,
    researchRequired: 'threshold_ship',
  }),

  defineItem('courier_hull_kit', 'Courier Ship Hull Kit', 'material', {
    weight: 80.0,
    stackSize: 1,
    craftedFrom: [
      { itemId: 'hull_plating', amount: 10 },
      { itemId: 'propulsion_unit', amount: 1 },
      { itemId: 'navigation_array', amount: 1 },
      { itemId: 'communication_relay', amount: 2 },
    ],
    baseValue: 40000,
    rarity: 'epic',
    clarketechTier: 2,
    researchRequired: 'courier_ship',
  }),

  defineItem('brainship_hull_kit', 'Brainship Hull Kit', 'material', {
    weight: 150.0,
    stackSize: 1,
    craftedFrom: [
      { itemId: 'reinforced_hull', amount: 8 },
      { itemId: 'heart_chamber_core', amount: 1 },
      { itemId: 'neural_interface', amount: 4 },
      { itemId: 'life_support_module', amount: 3 },
    ],
    baseValue: 180000,
    rarity: 'legendary',
    clarketechTier: 3,
    researchRequired: 'brainship_symbiosis',
  }),

  defineItem('storyship_hull_kit', 'Storyship Hull Kit', 'material', {
    weight: 300.0,
    stackSize: 1,
    craftedFrom: [
      { itemId: 'reinforced_hull', amount: 15 },
      { itemId: 'emotion_theater_system', amount: 2 },
      { itemId: 'memory_hall_archive', amount: 2 },
      { itemId: 'heart_chamber_core', amount: 1 },
    ],
    baseValue: 250000,
    rarity: 'legendary',
    clarketechTier: 3,
    researchRequired: 'story_ship',
  }),

  defineItem('gleisner_hull_kit', 'Gleisner Vessel Hull Kit', 'material', {
    weight: 120.0,
    stackSize: 1,
    craftedFrom: [
      { itemId: 'hull_plating', amount: 15 },
      { itemId: 'gleisner_body_frame', amount: 3 },
      { itemId: 'vr_immersion_pod', amount: 5 },
      { itemId: 'navigation_array', amount: 2 },
    ],
    baseValue: 200000,
    rarity: 'legendary',
    clarketechTier: 3,
    researchRequired: 'gleisner_vessel',
  }),

  defineItem('svetz_hull_kit', 'Svetz Retrieval Hull Kit', 'material', {
    weight: 180.0,
    stackSize: 1,
    craftedFrom: [
      { itemId: 'reinforced_hull', amount: 12 },
      { itemId: 'svetz_retrieval_engine', amount: 1 },
      { itemId: 'shield_generator', amount: 3 },
      { itemId: 'life_support_module', amount: 2 },
    ],
    baseValue: 350000,
    rarity: 'legendary',
    clarketechTier: 4,
    researchRequired: 'svetz_retrieval',
  }),

  defineItem('probability_scout_hull_kit', 'Probability Scout Hull Kit', 'material', {
    weight: 100.0,
    stackSize: 1,
    craftedFrom: [
      { itemId: 'hull_plating', amount: 8 },
      { itemId: 'probability_drive', amount: 1 },
      { itemId: 'navigation_array', amount: 2 },
      { itemId: 'observation_nullifier', amount: 2 },
    ],
    baseValue: 400000,
    rarity: 'legendary',
    clarketechTier: 5,
    researchRequired: 'probability_scout',
  }),

  defineItem('timeline_merger_hull_kit', 'Timeline Merger Hull Kit', 'material', {
    weight: 500.0,
    stackSize: 1,
    craftedFrom: [
      { itemId: 'reinforced_hull', amount: 25 },
      { itemId: 'timeline_merger_core', amount: 1 },
      { itemId: 'probability_drive', amount: 2 },
      { itemId: 'power_core', amount: 3 },
      { itemId: 'shield_generator', amount: 4 },
    ],
    baseValue: 1000000,
    rarity: 'legendary',
    clarketechTier: 6,
    researchRequired: 'timeline_merger',
  }),
];

// ============================================================================
// COMBINED EXPORTS
// ============================================================================

export const ALL_SPACEFLIGHT_ITEMS: ItemDefinition[] = [
  ...RAW_SPACEFLIGHT_RESOURCES,
  ...PROCESSED_SPACEFLIGHT_MATERIALS,
  ...INTERMEDIATE_SPACEFLIGHT_COMPONENTS,
  ...ADVANCED_SPACEFLIGHT_COMPONENTS,
  ...EXOTIC_SPACEFLIGHT_MATERIALS,
  ...SHIP_STRUCTURAL_COMPONENTS,
  ...SHIP_MODULES,
  ...SHIP_HULL_KITS,
];

/**
 * Register all spaceflight items with the item registry.
 */
export function registerSpaceflightItems(registry: { registerAll: (items: ItemDefinition[]) => void }): void {
  registry.registerAll(ALL_SPACEFLIGHT_ITEMS);
}
