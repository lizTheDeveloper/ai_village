/**
 * SpaceflightProductionBuildings - Production buildings for spaceflight manufacturing
 *
 * These buildings enable the production chain for spaceship construction:
 * - arcane_forge: Magical material processing
 * - ley_line_extractor: Mana and void essence processing
 * - electronics_lab: Circuit and processor fabrication
 * - temporal_lab: Timeline and probability manipulation
 * - reality_forge: Ultimate clarketech items
 * - shipyard: Basic ship component assembly
 * - advanced_shipyard: Complex module assembly
 *
 * Per CLAUDE.md: No silent fallbacks - all required fields must be provided.
 */

import type { BuildingBlueprint, BuildingCategory } from './BuildingBlueprintRegistry.js';
import type { BuildingBlueprintRegistry } from './BuildingBlueprintRegistry.js';

/**
 * Spaceflight production building blueprints
 * These buildings enable the manufacturing chain for spaceship construction.
 */
export const SPACEFLIGHT_PRODUCTION_BLUEPRINTS: BuildingBlueprint[] = [
  // ============================================================================
  // Tier 1: Basic Production Infrastructure
  // ============================================================================
  {
    id: 'arcane_forge',
    name: 'Arcane Forge',
    description: 'A forge infused with magical energies for processing mana crystals, stellarite, and other magical materials. Essential for spaceflight component production.',
    category: 'production' as BuildingCategory,
    width: 5,
    height: 4,
    resourceCost: [
      { resourceId: 'stone', amountRequired: 200 },
      { resourceId: 'iron_ingot', amountRequired: 100 },
      { resourceId: 'mana_shard', amountRequired: 50 },
      { resourceId: 'coal', amountRequired: 100 },
    ],
    techRequired: ['basic_propulsion'],
    terrainRequired: ['grass', 'dirt', 'stone'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 4 },
    unlocked: false,
    buildTime: 600, // 10 hours
    tier: 2,
    functionality: [
      {
        type: 'crafting',
        recipes: [
          'refined_mana',
          'crystal_lens',
          'stellarite_ingot',
          'emotional_essence',
          'mana_crystal',
          'resonance_coil',
          'emotional_amplifier',
          'stellarite_plate',
          'resonance_core',
          'emotional_matrix',
          'coherence_crystal',
        ],
        speed: 1.0,
      },
      {
        type: 'storage',
        itemTypes: ['mana_shard', 'raw_crystal', 'stellarite_ore', 'mana_crystal'],
        capacity: 200,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: true,
  },

  {
    id: 'ley_line_extractor',
    name: 'Ley Line Extractor',
    description: 'A specialized facility that taps into ley lines to extract and process void essence and concentrated mana. Must be built near a ley line node for maximum efficiency.',
    category: 'production' as BuildingCategory,
    width: 6,
    height: 5,
    resourceCost: [
      { resourceId: 'mana_crystal', amountRequired: 30 },
      { resourceId: 'copper_ingot', amountRequired: 80 },
      { resourceId: 'stone', amountRequired: 150 },
      { resourceId: 'raw_crystal', amountRequired: 20 },
    ],
    techRequired: ['emotional_topology'],
    terrainRequired: ['grass', 'dirt', 'stone'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 5 },
    unlocked: false,
    buildTime: 900, // 15 hours
    tier: 3,
    functionality: [
      {
        type: 'crafting',
        recipes: ['condensed_void', 'void_capacitor'],
        speed: 0.8,
      },
      {
        type: 'resource_generation',
        resourceType: 'mana_shard',
        rate: 2, // per hour
      },
      {
        type: 'storage',
        itemTypes: ['void_essence', 'condensed_void', 'mana_shard'],
        capacity: 100,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: true,
  },

  {
    id: 'electronics_lab',
    name: 'Electronics Laboratory',
    description: 'A high-tech facility for fabricating circuits, processors, and neural interfaces. Clean room conditions maintained by magical air filtration.',
    category: 'production' as BuildingCategory,
    width: 5,
    height: 5,
    resourceCost: [
      { resourceId: 'stone', amountRequired: 180 },
      { resourceId: 'glass', amountRequired: 80 },
      { resourceId: 'copper_ingot', amountRequired: 60 },
      { resourceId: 'iron_ingot', amountRequired: 50 },
    ],
    techRequired: ['basic_propulsion'],
    terrainRequired: ['grass', 'dirt', 'stone'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 4 },
    unlocked: false,
    buildTime: 720, // 12 hours
    tier: 2,
    functionality: [
      {
        type: 'crafting',
        recipes: [
          'basic_circuit',
          'advanced_circuit',
          'processing_unit',
          'quantum_processor',
          'neural_interface',
        ],
        speed: 1.0,
      },
      {
        type: 'storage',
        itemTypes: ['silicon_wafer', 'basic_circuit', 'advanced_circuit', 'rare_earth_compound'],
        capacity: 150,
      },
      {
        type: 'research',
        fields: ['engineering'],
        bonus: 1.2,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: true,
  },

  // ============================================================================
  // Tier 2: Ship Assembly
  // ============================================================================
  {
    id: 'shipyard',
    name: 'Spaceship Shipyard',
    description: 'A standard shipyard for assembling ship components. Can produce hull plating, propulsion systems, and basic ship modules.',
    category: 'production' as BuildingCategory,
    width: 8,
    height: 6,
    resourceCost: [
      { resourceId: 'steel_ingot', amountRequired: 300 },
      { resourceId: 'stone', amountRequired: 400 },
      { resourceId: 'iron_ingot', amountRequired: 200 },
      { resourceId: 'wood', amountRequired: 150 },
    ],
    techRequired: ['shipyard_construction'],
    terrainRequired: ['grass', 'dirt', 'stone'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 5 },
    unlocked: false,
    buildTime: 1200, // 20 hours
    tier: 3,
    functionality: [
      {
        type: 'crafting',
        recipes: [
          'focusing_array',
          'hull_plating',
          'communication_relay',
          'life_support_module',
          'void_engine_component',
          'meditation_chamber_unit',
          'courier_hull_kit',
        ],
        speed: 1.0,
      },
      {
        type: 'storage',
        itemTypes: ['hull_plating', 'stellarite_plate', 'spacecraft_parts'],
        capacity: 500,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: true,
  },

  {
    id: 'advanced_shipyard',
    name: 'Advanced Spaceship Shipyard',
    description: 'A state-of-the-art shipyard capable of assembling complex β-space capable vessels. Integrates arcane components for emotional navigation systems.',
    category: 'production' as BuildingCategory,
    width: 10,
    height: 8,
    resourceCost: [
      { resourceId: 'stellarite_ingot', amountRequired: 100 },
      { resourceId: 'mana_crystal', amountRequired: 80 },
      { resourceId: 'steel_ingot', amountRequired: 400 },
      { resourceId: 'resonance_core', amountRequired: 10 },
    ],
    techRequired: ['advanced_shipyard'],
    terrainRequired: ['grass', 'dirt', 'stone'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 5 },
    unlocked: false,
    buildTime: 1800, // 30 hours
    tier: 4,
    functionality: [
      {
        type: 'crafting',
        recipes: [
          'reinforced_hull',
          'propulsion_unit',
          'navigation_array',
          'power_core',
          'shield_generator',
          'heart_chamber_core',
          'emotion_theater_system',
          'memory_hall_archive',
          'vr_immersion_pod',
          'gleisner_body_frame',
          'worldship_hull_kit',
          'threshold_hull_kit',
          'brainship_hull_kit',
          'storyship_hull_kit',
          'gleisner_hull_kit',
        ],
        speed: 1.2,
      },
      {
        type: 'storage',
        itemTypes: ['reinforced_hull', 'ship_module', 'hull_kit'],
        capacity: 300,
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

  // ============================================================================
  // Tier 3: Advanced Research and Production
  // ============================================================================
  {
    id: 'temporal_lab',
    name: 'Temporal Research Laboratory',
    description: 'A heavily shielded facility for manipulating temporal mechanics. Required for processing temporal crystals and building time-manipulation devices.',
    category: 'production' as BuildingCategory,
    width: 7,
    height: 6,
    resourceCost: [
      { resourceId: 'temporal_crystal', amountRequired: 5 },
      { resourceId: 'void_capacitor', amountRequired: 10 },
      { resourceId: 'quantum_processor', amountRequired: 5 },
      { resourceId: 'stellarite_plate', amountRequired: 20 },
    ],
    techRequired: ['svetz_retrieval'],
    terrainRequired: ['grass', 'dirt', 'stone'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 5 },
    unlocked: false,
    buildTime: 1500, // 25 hours
    tier: 4,
    functionality: [
      {
        type: 'crafting',
        recipes: [
          'temporal_crystal',
          'temporal_regulator',
          'timeline_anchor',
          'observation_nullifier',
          'svetz_retrieval_engine',
        ],
        speed: 0.6,
      },
      {
        type: 'storage',
        itemTypes: ['temporal_dust', 'temporal_crystal', 'timeline_anchor'],
        capacity: 50,
      },
      {
        type: 'research',
        fields: ['spaceflight', 'arcane'],
        bonus: 2.0,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: true,
  },

  // ============================================================================
  // Tier 4: Ultimate Clarketech Production
  // ============================================================================
  {
    id: 'reality_forge',
    name: 'Reality Forge',
    description: 'The pinnacle of combined magical and technological achievement. A facility capable of manipulating the fundamental fabric of reality itself.',
    category: 'production' as BuildingCategory,
    width: 10,
    height: 10,
    resourceCost: [
      { resourceId: 'neutronium_shard', amountRequired: 3 },
      { resourceId: 'soul_anchor', amountRequired: 2 },
      { resourceId: 'timeline_anchor', amountRequired: 3 },
      { resourceId: 'quantum_processor', amountRequired: 20 },
      { resourceId: 'stellarite_plate', amountRequired: 50 },
      { resourceId: 'mana_crystal', amountRequired: 200 },
    ],
    techRequired: ['probability_scout'],
    terrainRequired: ['grass', 'dirt', 'stone'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 5 },
    unlocked: false,
    buildTime: 3600, // 60 hours
    tier: 5,
    functionality: [
      {
        type: 'crafting',
        recipes: [
          'soul_anchor',
          'probability_lens',
          'reality_thread',
          'neutronium_core',
          'probability_drive',
          'timeline_merger_core',
          'svetz_hull_kit',
          'probability_scout_hull_kit',
          'timeline_merger_hull_kit',
        ],
        speed: 0.3,
      },
      {
        type: 'storage',
        itemTypes: ['reality_thread', 'probability_lens', 'neutronium_core'],
        capacity: 20,
      },
      {
        type: 'research',
        fields: ['spaceflight', 'arcane', 'experimental'],
        bonus: 3.0,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: true,
  },

  // ============================================================================
  // Support Buildings
  // ============================================================================
  {
    id: 'mana_condenser',
    name: 'Mana Condenser',
    description: 'A tower that draws ambient mana from the atmosphere. Passively generates mana shards over time. More effective when placed on ley line nodes.',
    category: 'production' as BuildingCategory,
    width: 3,
    height: 3,
    resourceCost: [
      { resourceId: 'stone', amountRequired: 100 },
      { resourceId: 'raw_crystal', amountRequired: 20 },
      { resourceId: 'copper_ingot', amountRequired: 30 },
    ],
    techRequired: ['basic_propulsion'],
    terrainRequired: ['grass', 'dirt', 'stone'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 3 },
    unlocked: false,
    buildTime: 300, // 5 hours
    tier: 2,
    functionality: [
      {
        type: 'resource_generation',
        resourceType: 'mana_shard',
        rate: 1, // per hour
      },
    ],
    canRotate: false,
    rotationAngles: [0],
    snapToGrid: true,
    requiresFoundation: true,
  },

  {
    id: 'void_well',
    name: 'Void Well',
    description: 'A dangerous extraction facility that opens tiny rifts to the void. Produces void essence but requires careful management to prevent catastrophic breaches.',
    category: 'production' as BuildingCategory,
    width: 4,
    height: 4,
    resourceCost: [
      { resourceId: 'condensed_void', amountRequired: 5 },
      { resourceId: 'stellarite_plate', amountRequired: 10 },
      { resourceId: 'resonance_core', amountRequired: 3 },
    ],
    techRequired: ['emotional_topology'],
    terrainRequired: ['grass', 'dirt', 'stone'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 5 },
    unlocked: false,
    buildTime: 800, // ~13 hours
    tier: 3,
    functionality: [
      {
        type: 'resource_generation',
        resourceType: 'void_essence',
        rate: 0.5, // per hour
      },
      {
        type: 'storage',
        itemTypes: ['void_essence'],
        capacity: 30,
      },
    ],
    canRotate: false,
    rotationAngles: [0],
    snapToGrid: true,
    requiresFoundation: true,
  },

  {
    id: 'emotional_resonance_chamber',
    name: 'Emotional Resonance Chamber',
    description: 'A chamber where agents can contribute their emotional experiences to be crystallized into emotional resonance. A key ingredient for β-space navigation technology.',
    category: 'production' as BuildingCategory,
    width: 4,
    height: 4,
    resourceCost: [
      { resourceId: 'mana_crystal', amountRequired: 20 },
      { resourceId: 'copper_ingot', amountRequired: 40 },
      { resourceId: 'wood', amountRequired: 60 },
      { resourceId: 'cloth', amountRequired: 40 },
    ],
    techRequired: ['emotional_topology'],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 4 },
    unlocked: false,
    buildTime: 480, // 8 hours
    tier: 3,
    functionality: [
      {
        type: 'resource_generation',
        resourceType: 'emotional_resonance',
        rate: 3, // per hour, when agents use it
      },
      {
        type: 'mood_aura',
        moodBonus: 10,
        radius: 6,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: false,
  },

  {
    id: 'soul_collection_shrine',
    name: 'Soul Collection Shrine',
    description: 'A sacred shrine where soul fragments naturally accumulate from the departed. Requires proper funerary rites to function and is the only ethical source of soul fragments.',
    category: 'community' as BuildingCategory,
    width: 3,
    height: 3,
    resourceCost: [
      { resourceId: 'stone', amountRequired: 80 },
      { resourceId: 'gold_ingot', amountRequired: 10 },
      { resourceId: 'mana_crystal', amountRequired: 15 },
    ],
    techRequired: ['brainship_symbiosis'],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 4 },
    unlocked: false,
    buildTime: 600, // 10 hours
    tier: 4,
    functionality: [
      {
        type: 'resource_generation',
        resourceType: 'soul_fragment',
        rate: 0.1, // Very slow - 1 per ~10 hours
      },
      {
        type: 'mood_aura',
        moodBonus: 5,
        radius: 10,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: false,
  },

  {
    id: 'stellarite_smelter',
    name: 'Stellarite Smelter',
    description: 'A specialized high-temperature smelter for processing stellarite ore. Uses magical containment fields to handle the extreme temperatures required.',
    category: 'production' as BuildingCategory,
    width: 4,
    height: 4,
    resourceCost: [
      { resourceId: 'stone', amountRequired: 150 },
      { resourceId: 'iron_ingot', amountRequired: 100 },
      { resourceId: 'mana_crystal', amountRequired: 25 },
      { resourceId: 'coal', amountRequired: 100 },
    ],
    techRequired: ['worldship_design'],
    terrainRequired: ['grass', 'dirt', 'stone'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 4 },
    unlocked: false,
    buildTime: 540, // 9 hours
    tier: 3,
    functionality: [
      {
        type: 'crafting',
        recipes: ['stellarite_ingot', 'stellarite_plate'],
        speed: 1.5,
      },
      {
        type: 'storage',
        itemTypes: ['stellarite_ore', 'stellarite_ingot', 'stellarite_plate'],
        capacity: 100,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: true,
  },
];

/**
 * Register spaceflight production blueprints with the blueprint registry.
 * Called during initialization to make production buildings available.
 *
 * @param registry - The BuildingBlueprintRegistry to register blueprints with
 * @throws Error if blueprint validation fails or if blueprint already exists
 */
export function registerSpaceflightProductionBlueprints(registry: BuildingBlueprintRegistry): void {
  for (const blueprint of SPACEFLIGHT_PRODUCTION_BLUEPRINTS) {
    registry.register(blueprint);
  }
}
