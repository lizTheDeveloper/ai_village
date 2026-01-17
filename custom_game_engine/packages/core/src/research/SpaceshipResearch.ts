/**
 * SpaceshipResearch - Research definitions for spaceship technology
 *
 * Tech tree for unlocking spaceship types and components.
 * Follows the progression from spaceships-and-vr-spec.md:
 *
 * Tier 1: Basic Spaceflight (worldships, physical propulsion)
 * Tier 2: β-Space Awareness (threshold ships, emotional navigation)
 * Tier 3: Advanced Navigation (story ships, gleisner vessels)
 * Tier 4: Specialized Ships (svetz retrieval, probability scouts)
 * Tier 5: Reality Engineering (timeline mergers)
 *
 * Based on dimensional awareness levels:
 * - Stage 1: Pre-temporal (material space only)
 * - Stage 2: Temporal awareness (β-space navigation)
 * - Stage 3: Multi-dimensional (probability manipulation)
 */

import type { ResearchDefinition } from './types.js';

// ============================================================================
// Tier 1: Basic Spaceflight
// ============================================================================

export const BASIC_PROPULSION: ResearchDefinition = {
  id: 'spaceflight_basic_propulsion',
  name: 'Basic Propulsion Systems',
  description: 'Fundamental rocket and propulsion technology for leaving planetary surfaces.',
  field: 'spaceflight',
  tier: 1,
  progressRequired: 500,
  prerequisites: ['machinery_advanced_mechanics'], // Requires machinery prerequisite
  requiredBuilding: 'research_lab',
  requiredItems: [
    { itemId: 'iron_ingot', amount: 50 },
    { itemId: 'copper_ingot', amount: 30 },
  ],
  unlocks: [
    { type: 'building', buildingId: 'shipyard_basic' },
    { type: 'knowledge', knowledgeId: 'orbital_mechanics' },
  ],
  type: 'predefined',
};

export const WORLDSHIP_DESIGN: ResearchDefinition = {
  id: 'spaceflight_worldship',
  name: 'Worldship Architecture',
  description: 'Design principles for generation ships capable of sustaining communities across interstellar distances.',
  field: 'spaceflight',
  tier: 1,
  progressRequired: 1000,
  prerequisites: ['spaceflight_basic_propulsion'],
  requiredBuilding: 'shipyard_basic',
  requiredItems: [
    { itemId: 'steel_plate', amount: 100 },
    { itemId: 'glass_panel', amount: 50 },
  ],
  unlocks: [
    { type: 'building', buildingId: 'worldship_drydock' },
    { type: 'ability', abilityId: 'construct_worldship' },
  ],
  type: 'predefined',
};

export const LIFE_SUPPORT_SYSTEMS: ResearchDefinition = {
  id: 'spaceflight_life_support',
  name: 'Closed-Loop Life Support',
  description: 'Self-sustaining ecosystems for long-duration spaceflight.',
  field: 'spaceflight',
  tier: 1,
  progressRequired: 750,
  prerequisites: ['spaceflight_basic_propulsion', 'nature_ecosystem_management'],
  requiredBuilding: 'research_lab',
  unlocks: [
    { type: 'recipe', recipeId: 'life_support_module' },
    { type: 'knowledge', knowledgeId: 'hydroponics_advanced' },
  ],
  type: 'predefined',
};

// ============================================================================
// Tier 2: β-Space Awareness
// ============================================================================

export const EMOTIONAL_TOPOLOGY: ResearchDefinition = {
  id: 'spaceflight_emotional_topology',
  name: 'Emotional Topology Theory',
  description: 'Understanding the relationship between emotional states and β-space coordinates.',
  field: 'spaceflight',
  tier: 2,
  progressRequired: 1500,
  prerequisites: ['spaceflight_worldship', 'arcane_consciousness_studies'],
  requiredBuilding: 'research_lab',
  requiredItems: [
    { itemId: 'mana_crystal', amount: 20 },
  ],
  unlocks: [
    { type: 'knowledge', knowledgeId: 'beta_space_charts' },
    { type: 'research', researchId: 'spaceflight_threshold_ship' },
  ],
  type: 'predefined',
};

export const THRESHOLD_SHIP: ResearchDefinition = {
  id: 'spaceflight_threshold_ship',
  name: 'Threshold Ship Design',
  description: 'Ships that navigate β-space through guided emotional journeys.',
  field: 'spaceflight',
  tier: 2,
  progressRequired: 2000,
  prerequisites: ['spaceflight_emotional_topology'],
  requiredBuilding: 'shipyard_advanced',
  requiredItems: [
    { itemId: 'mana_crystal', amount: 50 },
    { itemId: 'resonance_core', amount: 5 },
  ],
  unlocks: [
    { type: 'ability', abilityId: 'construct_threshold_ship' },
    { type: 'building', buildingId: 'emotion_theater_module' },
  ],
  type: 'predefined',
};

export const COURIER_SHIP: ResearchDefinition = {
  id: 'spaceflight_courier_ship',
  name: 'Courier Ship Design',
  description: 'Fast 2-person ships optimized for high-coherence navigation.',
  field: 'spaceflight',
  tier: 2,
  progressRequired: 1200,
  prerequisites: ['spaceflight_threshold_ship'],
  requiredBuilding: 'shipyard_advanced',
  unlocks: [
    { type: 'ability', abilityId: 'construct_courier_ship' },
  ],
  type: 'predefined',
};

export const BRAINSHIP_SYMBIOSIS: ResearchDefinition = {
  id: 'spaceflight_brainship',
  name: 'Brainship Symbiosis',
  description: 'Integration of organic consciousness with ship systems for perfect coherence.',
  field: 'spaceflight',
  tier: 2,
  progressRequired: 2500,
  prerequisites: ['spaceflight_threshold_ship', 'genetics_neural_interface'],
  requiredBuilding: 'medical_research_lab',
  requiredItems: [
    { itemId: 'neural_tissue', amount: 10 },
    { itemId: 'biocomputer_core', amount: 1 },
  ],
  unlocks: [
    { type: 'ability', abilityId: 'construct_brainship' },
    { type: 'knowledge', knowledgeId: 'consciousness_transfer' },
  ],
  type: 'predefined',
};

export const THE_HEART: ResearchDefinition = {
  id: 'spaceflight_the_heart',
  name: 'The Heart Chamber',
  description: 'Central synchronization chamber enabling crew emotional coherence for β-space jumps.',
  field: 'spaceflight',
  tier: 2,
  progressRequired: 1800,
  prerequisites: ['spaceflight_emotional_topology'],
  requiredBuilding: 'shipyard_advanced',
  unlocks: [
    { type: 'recipe', recipeId: 'heart_chamber' },
    { type: 'knowledge', knowledgeId: 'collective_synchronization' },
  ],
  type: 'predefined',
};

export const MEDITATION_CHAMBERS: ResearchDefinition = {
  id: 'spaceflight_meditation_chambers',
  name: 'Meditation Chamber Design',
  description: 'Spaces for emotional regulation and preparation for navigation.',
  field: 'spaceflight',
  tier: 2,
  progressRequired: 800,
  prerequisites: ['spaceflight_emotional_topology'],
  requiredBuilding: 'research_lab',
  unlocks: [
    { type: 'recipe', recipeId: 'meditation_chamber' },
  ],
  type: 'predefined',
};

// ============================================================================
// Tier 3: Advanced Navigation
// ============================================================================

export const STORY_SHIP: ResearchDefinition = {
  id: 'spaceflight_story_ship',
  name: 'Story Ship (Narrative Ark)',
  description: 'Ships that preserve cultural narrative weight across catastrophe.',
  field: 'spaceflight',
  tier: 3,
  progressRequired: 3000,
  prerequisites: ['spaceflight_threshold_ship', 'society_cultural_preservation'],
  requiredBuilding: 'shipyard_advanced',
  requiredItems: [
    { itemId: 'memory_crystal', amount: 100 },
    { itemId: 'cultural_artifact', amount: 10 },
  ],
  unlocks: [
    { type: 'ability', abilityId: 'construct_story_ship' },
    { type: 'building', buildingId: 'memory_hall_module' },
  ],
  type: 'predefined',
};

export const GLEISNER_VESSEL: ResearchDefinition = {
  id: 'spaceflight_gleisner_vessel',
  name: 'Gleisner Vessel Design',
  description: 'Ships where consciousness and hull are unified - the ship IS the crew.',
  field: 'spaceflight',
  tier: 3,
  progressRequired: 4000,
  prerequisites: ['spaceflight_brainship', 'arcane_digital_consciousness'],
  requiredBuilding: 'digital_fabrication_lab',
  requiredItems: [
    { itemId: 'quantum_processor', amount: 20 },
    { itemId: 'soul_anchor', amount: 1 },
  ],
  unlocks: [
    { type: 'ability', abilityId: 'construct_gleisner_vessel' },
    { type: 'knowledge', knowledgeId: 'consciousness_distribution' },
  ],
  type: 'predefined',
};

export const MEMORY_HALLS: ResearchDefinition = {
  id: 'spaceflight_memory_halls',
  name: 'Memory Hall Technology',
  description: 'Systems for recording, storing, and replaying emotional memories.',
  field: 'spaceflight',
  tier: 3,
  progressRequired: 2000,
  prerequisites: ['spaceflight_story_ship'],
  requiredBuilding: 'research_lab',
  unlocks: [
    { type: 'recipe', recipeId: 'memory_hall' },
    { type: 'ability', abilityId: 'record_memory' },
  ],
  type: 'predefined',
};

export const EMOTION_THEATERS: ResearchDefinition = {
  id: 'spaceflight_emotion_theaters',
  name: 'Emotion Theater Systems',
  description: 'Advanced VR spaces for inducing specific emotional states.',
  field: 'spaceflight',
  tier: 3,
  progressRequired: 2200,
  prerequisites: ['spaceflight_the_heart'],
  requiredBuilding: 'vr_research_lab',
  unlocks: [
    { type: 'recipe', recipeId: 'emotion_theater' },
    { type: 'knowledge', knowledgeId: 'emotional_induction' },
  ],
  type: 'predefined',
};

// ============================================================================
// Tier 4: Specialized Ships
// ============================================================================

export const SVETZ_RETRIEVAL: ResearchDefinition = {
  id: 'spaceflight_svetz_retrieval',
  name: 'Svetz Retrieval Ship',
  description: 'Temporal archaeology ships for retrieving from extinct timelines.',
  field: 'spaceflight',
  tier: 4,
  progressRequired: 5000,
  prerequisites: ['spaceflight_story_ship', 'arcane_temporal_mechanics'],
  requiredBuilding: 'temporal_research_lab',
  requiredItems: [
    { itemId: 'timeline_anchor', amount: 5 },
    { itemId: 'extinction_sample', amount: 1 },
  ],
  unlocks: [
    { type: 'ability', abilityId: 'construct_svetz_ship' },
    { type: 'ability', abilityId: 'temporal_retrieval' },
  ],
  type: 'predefined',
};

export const PROBABILITY_SCOUT: ResearchDefinition = {
  id: 'spaceflight_probability_scout',
  name: 'Probability Scout Design',
  description: 'Solo explorer ships for mapping unobserved probability branches.',
  field: 'spaceflight',
  tier: 4,
  progressRequired: 4500,
  prerequisites: ['spaceflight_gleisner_vessel'],
  requiredBuilding: 'quantum_research_lab',
  requiredItems: [
    { itemId: 'observation_nullifier', amount: 3 },
  ],
  unlocks: [
    { type: 'ability', abilityId: 'construct_probability_scout' },
    { type: 'ability', abilityId: 'branch_mapping' },
  ],
  type: 'predefined',
};

// ============================================================================
// Tier 5: Reality Engineering
// ============================================================================

export const TIMELINE_MERGER: ResearchDefinition = {
  id: 'spaceflight_timeline_merger',
  name: 'Timeline Merger Technology',
  description: 'Ships capable of collapsing compatible probability branches.',
  field: 'spaceflight',
  tier: 5,
  progressRequired: 10000,
  prerequisites: ['spaceflight_probability_scout', 'arcane_reality_manipulation'],
  requiredBuilding: 'reality_engineering_lab',
  requiredItems: [
    { itemId: 'probability_catalyst', amount: 10 },
    { itemId: 'branch_resonator', amount: 5 },
    { itemId: 'coherence_amplifier', amount: 3 },
  ],
  unlocks: [
    { type: 'ability', abilityId: 'construct_timeline_merger' },
    { type: 'ability', abilityId: 'branch_collapse' },
    { type: 'knowledge', knowledgeId: 'fork_bomb_cleanup' },
  ],
  type: 'predefined',
};

// ============================================================================
// Supporting Infrastructure Research
// ============================================================================

export const SHIPYARD_CONSTRUCTION: ResearchDefinition = {
  id: 'spaceflight_shipyard',
  name: 'Shipyard Construction',
  description: 'Facilities for constructing and maintaining spacecraft.',
  field: 'spaceflight',
  tier: 1,
  progressRequired: 800,
  prerequisites: ['construction_advanced_architecture', 'machinery_heavy_equipment'],
  requiredBuilding: 'town_hall',
  requiredItems: [
    { itemId: 'iron_ingot', amount: 200 },
    { itemId: 'stone_block', amount: 500 },
  ],
  unlocks: [
    { type: 'building', buildingId: 'shipyard_basic' },
  ],
  type: 'predefined',
};

export const ADVANCED_SHIPYARD: ResearchDefinition = {
  id: 'spaceflight_advanced_shipyard',
  name: 'Advanced Shipyard',
  description: 'Upgraded shipyard capable of constructing β-space capable vessels.',
  field: 'spaceflight',
  tier: 2,
  progressRequired: 2000,
  prerequisites: ['spaceflight_shipyard', 'spaceflight_emotional_topology'],
  requiredBuilding: 'shipyard_basic',
  requiredItems: [
    { itemId: 'mana_crystal', amount: 100 },
    { itemId: 'resonance_core', amount: 10 },
  ],
  unlocks: [
    { type: 'building', buildingId: 'shipyard_advanced' },
  ],
  type: 'predefined',
};

export const VR_SYSTEMS: ResearchDefinition = {
  id: 'spaceflight_vr_systems',
  name: 'Virtual Reality Systems',
  description: 'Curated emotional experience spaces for training and therapy.',
  field: 'spaceflight',
  tier: 2,
  progressRequired: 1500,
  prerequisites: ['spaceflight_emotional_topology', 'arcane_illusion_magic'],
  requiredBuilding: 'research_lab',
  unlocks: [
    { type: 'building', buildingId: 'vr_chamber' },
    { type: 'recipe', recipeId: 'vr_headset' },
  ],
  type: 'predefined',
};

// ============================================================================
// Export All Research
// ============================================================================

export const SPACEFLIGHT_RESEARCH: ResearchDefinition[] = [
  // Tier 1
  BASIC_PROPULSION,
  WORLDSHIP_DESIGN,
  LIFE_SUPPORT_SYSTEMS,
  SHIPYARD_CONSTRUCTION,

  // Tier 2
  EMOTIONAL_TOPOLOGY,
  THRESHOLD_SHIP,
  COURIER_SHIP,
  BRAINSHIP_SYMBIOSIS,
  THE_HEART,
  MEDITATION_CHAMBERS,
  ADVANCED_SHIPYARD,
  VR_SYSTEMS,

  // Tier 3
  STORY_SHIP,
  GLEISNER_VESSEL,
  MEMORY_HALLS,
  EMOTION_THEATERS,

  // Tier 4
  SVETZ_RETRIEVAL,
  PROBABILITY_SCOUT,

  // Tier 5
  TIMELINE_MERGER,
];

/**
 * Register all spaceflight research with the ResearchRegistry.
 */
export function registerSpaceflightResearch(): void {
  // Dynamically import to avoid circular dependency
  import('./ResearchRegistry.js').then(({ ResearchRegistry }) => {
    const registry = ResearchRegistry.getInstance();
    for (const research of SPACEFLIGHT_RESEARCH) {
      if (!registry.has(research.id)) {
        registry.register(research);
      }
    }
  });
}
