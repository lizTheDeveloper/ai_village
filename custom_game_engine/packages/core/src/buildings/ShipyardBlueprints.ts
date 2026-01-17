/**
 * ShipyardBlueprints - Building blueprints for spaceship construction
 *
 * Shipyard Infrastructure for β-Space Navigation
 * Creates blueprints for shipyards and supporting facilities
 * that enable construction of various spaceship types.
 *
 * Based on spaceships-and-vr-spec.md and SpaceshipResearch.ts tech tree.
 *
 * Per CLAUDE.md: No silent fallbacks - all required fields must be provided.
 */

import type { BuildingBlueprint, BuildingCategory, BuildingFunction } from './BuildingBlueprintRegistry.js';
import type { BuildingBlueprintRegistry } from './BuildingBlueprintRegistry.js';

/**
 * Extended building function types for spaceflight
 */
export type SpaceflightBuildingFunction =
  | BuildingFunction
  | { type: 'shipyard'; shipTypes: string[]; constructionSpeed: number }
  | { type: 'vr_facility'; vrTypes: string[]; immersionLevel: number }
  | { type: 'emotional_training'; techniques: string[]; coherenceBonus: number }
  | { type: 'beta_space_support'; navigationBonus: number };

/**
 * Shipyard building blueprints
 * These buildings enable spaceship construction and related capabilities.
 */
export const SHIPYARD_BLUEPRINTS: BuildingBlueprint[] = [
  // ============================================================================
  // Tier 1: Basic Spaceflight Infrastructure
  // ============================================================================
  {
    id: 'shipyard_basic',
    name: 'Basic Shipyard',
    description: 'A basic shipyard for constructing physical propulsion spacecraft. Enables worldship and basic vessel construction.',
    category: 'production' as BuildingCategory,
    width: 8,
    height: 6,
    resourceCost: [
      { resourceId: 'iron_ingot', amountRequired: 200 },
      { resourceId: 'stone_block', amountRequired: 500 },
      { resourceId: 'wood', amountRequired: 300 },
    ],
    techRequired: ['spaceflight_shipyard'],
    terrainRequired: ['grass', 'dirt', 'stone'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 5 },
    unlocked: false,
    buildTime: 1200, // 20 hours
    tier: 3,
    functionality: [
      {
        type: 'crafting',
        recipes: ['worldship_hull', 'propulsion_system', 'life_support_module'],
        speed: 1.0,
      },
      {
        type: 'storage',
        itemTypes: ['steel_plate', 'glass_panel', 'spacecraft_parts'],
        capacity: 500,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: true,
  },
  {
    id: 'worldship_drydock',
    name: 'Worldship Drydock',
    description: 'A massive drydock facility for constructing generation ships capable of sustaining communities across interstellar distances.',
    category: 'production' as BuildingCategory,
    width: 12,
    height: 10,
    resourceCost: [
      { resourceId: 'steel_plate', amountRequired: 500 },
      { resourceId: 'glass_panel', amountRequired: 200 },
      { resourceId: 'stone_block', amountRequired: 1000 },
      { resourceId: 'iron_ingot', amountRequired: 300 },
    ],
    techRequired: ['spaceflight_worldship'],
    terrainRequired: ['grass', 'dirt', 'stone'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 5 },
    unlocked: false,
    buildTime: 2400, // 40 hours
    tier: 4,
    functionality: [
      {
        type: 'crafting',
        recipes: ['worldship_core', 'habitat_module', 'generation_ship_hull'],
        speed: 0.5, // Slow but capable of large constructions
      },
      {
        type: 'storage',
        itemTypes: ['spacecraft_parts', 'habitat_modules', 'life_support'],
        capacity: 1000,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: true,
  },

  // ============================================================================
  // Tier 2: β-Space Capable Infrastructure
  // ============================================================================
  {
    id: 'shipyard_advanced',
    name: 'Advanced Shipyard',
    description: 'An upgraded shipyard capable of constructing β-space capable vessels. Integrates mana-infused materials for emotional navigation systems.',
    category: 'production' as BuildingCategory,
    width: 10,
    height: 8,
    resourceCost: [
      { resourceId: 'mana_crystal', amountRequired: 100 },
      { resourceId: 'resonance_core', amountRequired: 10 },
      { resourceId: 'steel_plate', amountRequired: 300 },
      { resourceId: 'glass_panel', amountRequired: 150 },
    ],
    techRequired: ['spaceflight_advanced_shipyard'],
    terrainRequired: ['grass', 'dirt', 'stone'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 5 },
    unlocked: false,
    buildTime: 1800, // 30 hours
    tier: 4,
    functionality: [
      {
        type: 'crafting',
        recipes: ['threshold_ship_hull', 'courier_ship_hull', 'emotion_theater_module', 'heart_chamber'],
        speed: 1.2,
      },
      {
        type: 'storage',
        itemTypes: ['mana_crystal', 'resonance_core', 'spacecraft_parts', 'emotional_components'],
        capacity: 400,
      },
      {
        type: 'research',
        fields: ['spaceflight'],
        bonus: 1.5,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: true,
  },
  {
    id: 'vr_chamber',
    name: 'VR Training Chamber',
    description: 'A curated emotional experience space for training crews in β-space navigation. Uses advanced illusion magic for full sensory immersion.',
    category: 'research' as BuildingCategory,
    width: 4,
    height: 4,
    resourceCost: [
      { resourceId: 'mana_crystal', amountRequired: 50 },
      { resourceId: 'glass_panel', amountRequired: 100 },
      { resourceId: 'wood', amountRequired: 80 },
    ],
    techRequired: ['spaceflight_vr_systems'],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 4 },
    unlocked: false,
    buildTime: 600, // 10 hours
    tier: 3,
    functionality: [
      {
        type: 'mood_aura',
        moodBonus: 20,
        radius: 5,
      },
      {
        type: 'research',
        fields: ['spaceflight', 'arcane'],
        bonus: 1.3,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: true,
  },
  {
    id: 'meditation_training_hall',
    name: 'Meditation Training Hall',
    description: 'A serene space for emotional regulation training. Crews must master emotional control before β-space navigation.',
    category: 'community' as BuildingCategory,
    width: 5,
    height: 5,
    resourceCost: [
      { resourceId: 'wood', amountRequired: 150 },
      { resourceId: 'cloth', amountRequired: 100 },
      { resourceId: 'stone', amountRequired: 80 },
    ],
    techRequired: ['spaceflight_meditation_chambers'],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 3 },
    unlocked: false,
    buildTime: 480, // 8 hours
    tier: 2,
    functionality: [
      {
        type: 'mood_aura',
        moodBonus: 25,
        radius: 8,
      },
      {
        type: 'meditation_site',
        visionClarityBonus: 1.5,
        meditationSpeedBonus: 1.3,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: false,
  },
  {
    id: 'medical_research_lab',
    name: 'Medical Research Lab',
    description: 'A laboratory for neural interface research and brainship symbiosis development. Required for integrating consciousness with ship systems.',
    category: 'research' as BuildingCategory,
    width: 5,
    height: 4,
    resourceCost: [
      { resourceId: 'stone', amountRequired: 150 },
      { resourceId: 'glass', amountRequired: 100 },
      { resourceId: 'iron', amountRequired: 80 },
      { resourceId: 'mana_crystal', amountRequired: 20 },
    ],
    techRequired: ['genetics_neural_interface'],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 5 },
    unlocked: false,
    buildTime: 900, // 15 hours
    tier: 4,
    functionality: [
      {
        type: 'research',
        fields: ['genetics', 'spaceflight'],
        bonus: 2.0,
      },
      {
        type: 'healing',
        healingRate: 15,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: true,
  },

  // ============================================================================
  // Tier 3: Advanced Research Facilities
  // ============================================================================
  {
    id: 'vr_research_lab',
    name: 'VR Research Laboratory',
    description: 'An advanced laboratory for developing emotion theater systems and immersive emotional induction technology.',
    category: 'research' as BuildingCategory,
    width: 6,
    height: 5,
    resourceCost: [
      { resourceId: 'mana_crystal', amountRequired: 80 },
      { resourceId: 'glass_panel', amountRequired: 150 },
      { resourceId: 'resonance_core', amountRequired: 5 },
      { resourceId: 'stone', amountRequired: 200 },
    ],
    techRequired: ['spaceflight_the_heart'],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 5 },
    unlocked: false,
    buildTime: 1080, // 18 hours
    tier: 4,
    functionality: [
      {
        type: 'research',
        fields: ['spaceflight', 'arcane'],
        bonus: 2.0,
      },
      {
        type: 'crafting',
        recipes: ['emotion_theater', 'vr_headset', 'immersion_pod'],
        speed: 1.0,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: true,
  },
  {
    id: 'digital_fabrication_lab',
    name: 'Digital Fabrication Lab',
    description: 'A high-tech facility for constructing Gleisner vessels where consciousness and hull are unified.',
    category: 'research' as BuildingCategory,
    width: 6,
    height: 6,
    resourceCost: [
      { resourceId: 'quantum_processor', amountRequired: 10 },
      { resourceId: 'mana_crystal', amountRequired: 100 },
      { resourceId: 'steel_plate', amountRequired: 200 },
      { resourceId: 'glass_panel', amountRequired: 150 },
    ],
    techRequired: ['arcane_digital_consciousness'],
    terrainRequired: ['grass', 'dirt', 'stone'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 5 },
    unlocked: false,
    buildTime: 1440, // 24 hours
    tier: 5,
    functionality: [
      {
        type: 'research',
        fields: ['spaceflight', 'arcane', 'experimental'],
        bonus: 2.5,
      },
      {
        type: 'crafting',
        recipes: ['gleisner_hull', 'consciousness_matrix', 'soul_anchor_mount'],
        speed: 0.8,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: true,
  },

  // ============================================================================
  // Tier 4: Specialized Research Facilities
  // ============================================================================
  {
    id: 'temporal_research_lab',
    name: 'Temporal Research Laboratory',
    description: 'A facility for studying temporal mechanics and developing Svetz retrieval technology for temporal archaeology.',
    category: 'research' as BuildingCategory,
    width: 7,
    height: 6,
    resourceCost: [
      { resourceId: 'timeline_anchor', amountRequired: 3 },
      { resourceId: 'mana_crystal', amountRequired: 200 },
      { resourceId: 'resonance_core', amountRequired: 20 },
      { resourceId: 'stone', amountRequired: 300 },
    ],
    techRequired: ['arcane_temporal_mechanics'],
    terrainRequired: ['grass', 'dirt', 'stone'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 5 },
    unlocked: false,
    buildTime: 1800, // 30 hours
    tier: 5,
    functionality: [
      {
        type: 'research',
        fields: ['spaceflight', 'arcane', 'experimental'],
        bonus: 3.0,
      },
      {
        type: 'crafting',
        recipes: ['svetz_drive', 'temporal_stabilizer', 'extinction_sampler'],
        speed: 0.5,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: true,
  },
  {
    id: 'quantum_research_lab',
    name: 'Quantum Research Laboratory',
    description: 'A facility for quantum mechanics research and probability scout development. Enables mapping unobserved probability branches.',
    category: 'research' as BuildingCategory,
    width: 6,
    height: 6,
    resourceCost: [
      { resourceId: 'observation_nullifier', amountRequired: 2 },
      { resourceId: 'quantum_processor', amountRequired: 15 },
      { resourceId: 'mana_crystal', amountRequired: 150 },
      { resourceId: 'glass_panel', amountRequired: 200 },
    ],
    techRequired: ['spaceflight_gleisner_vessel'],
    terrainRequired: ['grass', 'dirt', 'stone'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 5 },
    unlocked: false,
    buildTime: 1620, // 27 hours
    tier: 5,
    functionality: [
      {
        type: 'research',
        fields: ['spaceflight', 'experimental'],
        bonus: 2.5,
      },
      {
        type: 'crafting',
        recipes: ['probability_drive', 'branch_mapper', 'quantum_stabilizer'],
        speed: 0.6,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: true,
  },

  // ============================================================================
  // Tier 5: Reality Engineering
  // ============================================================================
  {
    id: 'reality_engineering_lab',
    name: 'Reality Engineering Laboratory',
    description: 'The ultimate research facility for developing timeline merger technology. Capable of collapsing compatible probability branches.',
    category: 'research' as BuildingCategory,
    width: 8,
    height: 8,
    resourceCost: [
      { resourceId: 'probability_catalyst', amountRequired: 5 },
      { resourceId: 'branch_resonator', amountRequired: 3 },
      { resourceId: 'coherence_amplifier', amountRequired: 2 },
      { resourceId: 'quantum_processor', amountRequired: 30 },
      { resourceId: 'mana_crystal', amountRequired: 500 },
    ],
    techRequired: ['arcane_reality_manipulation'],
    terrainRequired: ['grass', 'dirt', 'stone'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 5 },
    unlocked: false,
    buildTime: 3600, // 60 hours
    tier: 5,
    functionality: [
      {
        type: 'research',
        fields: ['spaceflight', 'arcane', 'experimental'],
        bonus: 4.0,
      },
      {
        type: 'crafting',
        recipes: ['timeline_merger_core', 'branch_collapse_device', 'fork_bomb_cleanup_tool'],
        speed: 0.3,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: true,
  },
];

/**
 * Register shipyard blueprints with the blueprint registry.
 * Called during initialization to make shipyard buildings available.
 *
 * @param registry - The BuildingBlueprintRegistry to register blueprints with
 * @throws Error if blueprint validation fails or if blueprint already exists
 */
export function registerShipyardBlueprints(registry: BuildingBlueprintRegistry): void {
  for (const blueprint of SHIPYARD_BLUEPRINTS) {
    registry.register(blueprint);
  }
}
