import type { Component, ComponentSchema } from '../ecs/Component.js';

// ============================================================================
// Types
// ============================================================================

export type SpaceshipType =
  | 'worldship'           // Stage 1: Generation ship, cannot navigate β-space
  | 'threshold_ship'      // Stage 2: Small crew, fragile β-navigation
  | 'story_ship'          // Stage 3: Narrative-seeking explorer
  | 'gleisner_vessel'     // Stage 3: Digital consciousness ship
  | 'courier_ship'        // Stage 2: 2-person fast courier
  | 'svetz_retrieval'     // Stage 3: Temporal archaeology ship
  | 'probability_scout'   // Stage 3: Solo explorer mapping unobserved branches
  | 'timeline_merger'     // Stage 3: Collapse compatible probability branches
  | 'brainship';          // Stage 2: Ship-brain symbiosis (McCaffrey-style)

export interface EmotionalSignature {
  emotions: Record<string, number>;  // emotion name -> intensity (0-1)
}

export interface EmotionalEvent {
  timestamp: number;
  description: string;
  narrative_weight: number;
  emotional_signature: EmotionalSignature;
  participants: string[];  // Entity IDs
}

export interface ShipPersonality {
  dominant_emotions: EmotionalSignature[];
  preferences: {
    destination_types: string[];
    mission_types: string[];
  };
  resistance: {
    to_emotions: EmotionalSignature[];
    to_destinations: string[];
  };
}

// ============================================================================
// Interface
// ============================================================================

/**
 * Spaceship - emotional anchor and β-space navigation interface
 */
export interface SpaceshipComponent extends Component {
  type: 'spaceship';

  ship_type: SpaceshipType;
  name: string;

  // Physical properties
  hull: {
    integrity: number;  // 0-1
    mass: number;
  };

  // Emotional/narrative properties
  narrative: {
    accumulated_weight: number;
    significant_events: EmotionalEvent[];
    personality: ShipPersonality;
  };

  // Crew
  crew: {
    member_ids: string[];  // Entity IDs
    collective_emotional_state: EmotionalSignature;
    coherence: number;  // 0-1
  };

  // Navigation (Rainbow Mars quantum mechanics)
  navigation: {
    can_navigate_beta_space: boolean;
    max_emotional_distance: number;

    // Quantum observation mechanics
    quantum_coupling_strength: number;  // How strongly crew observes same reality (0-1)
    coherence_threshold: number;        // Minimum coherence to navigate (typically 0.7)
    decoherence_rate: number;           // How fast coherence degrades per tick
    observation_precision: number;      // Can measure branches before collapsing? (0-1)

    // Timeline contamination (Rainbow Mars: mixing probability branches)
    contamination_cargo: Array<{
      entity_id: string;
      source_timeline: string;  // β-branch this came from
      contamination_level: number;  // 0-1, how incompatible with current branch
    }>;

    // Navigation history
    visited_branches: string[];  // β-branches visited
    failed_navigations: number;  // Count of coherence failures
  };

  // Component IDs
  components: {
    the_heart_id?: string;
    emotion_theater_ids: string[];
    memory_hall_ids: string[];
    meditation_chamber_ids: string[];
    vr_system_ids: string[];
  };
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createSpaceshipComponent(
  ship_type: SpaceshipType,
  name: string
): SpaceshipComponent {
  // Ship-type-specific configurations
  const config = getShipTypeConfig(ship_type);

  return {
    type: 'spaceship',
    version: 1,
    ship_type,
    name,
    hull: {
      integrity: 1.0,
      mass: config.mass,
    },
    narrative: {
      accumulated_weight: 0,
      significant_events: [],
      personality: {
        dominant_emotions: [],
        preferences: {
          destination_types: config.preferred_missions,
          mission_types: config.preferred_missions,
        },
        resistance: {
          to_emotions: [],
          to_destinations: [],
        },
      },
    },
    crew: {
      member_ids: [],
      collective_emotional_state: { emotions: {} },
      coherence: config.initial_coherence,
    },
    navigation: {
      can_navigate_beta_space: config.can_navigate_beta_space,
      max_emotional_distance: config.max_emotional_distance,

      // Quantum mechanics
      quantum_coupling_strength: config.quantum_coupling,
      coherence_threshold: config.coherence_threshold,
      decoherence_rate: config.decoherence_rate,
      observation_precision: config.observation_precision,

      // Timeline contamination tracking
      contamination_cargo: [],

      // Navigation history
      visited_branches: [],
      failed_navigations: 0,
    },
    components: {
      emotion_theater_ids: [],
      memory_hall_ids: [],
      meditation_chamber_ids: [],
      vr_system_ids: [],
    },
  };
}

/**
 * Get ship-type-specific configuration
 * Based on Rainbow Mars quantum mechanics and dimensional awareness levels
 */
function getShipTypeConfig(ship_type: SpaceshipType) {
  switch (ship_type) {
    case 'worldship':
      // Stage 1: Pre-temporal, cannot navigate β-space
      return {
        mass: 1000000,
        can_navigate_beta_space: false,
        max_emotional_distance: 0,
        quantum_coupling: 0,
        coherence_threshold: 1.0,  // Impossible to achieve
        decoherence_rate: 0,
        observation_precision: 0,
        initial_coherence: 0,
        preferred_missions: ['colonization', 'generation_ship'],
      };

    case 'courier_ship':
      // Stage 2: 2-person crew, easiest coherence, fastest navigation
      return {
        mass: 10,
        can_navigate_beta_space: true,
        max_emotional_distance: 200,  // Fastest
        quantum_coupling: 0.9,  // High (only 2 people)
        coherence_threshold: 0.6,  // Lower threshold (easier to achieve with 2)
        decoherence_rate: 0.0001,  // Slow degradation
        observation_precision: 0.3,  // Stage 2: can't measure well before collapsing
        initial_coherence: 0.8,
        preferred_missions: ['fast_delivery', 'urgent_message', 'reconnaissance'],
      };

    case 'threshold_ship':
      // Stage 2: 10-50 crew, fragile β-navigation
      return {
        mass: 1000,
        can_navigate_beta_space: true,
        max_emotional_distance: 100,
        quantum_coupling: 0.7,
        coherence_threshold: 0.7,  // Typical Stage 2
        decoherence_rate: 0.0003,
        observation_precision: 0.3,
        initial_coherence: 0.5,
        preferred_missions: ['exploration', 'trade', 'research'],
      };

    case 'brainship':
      // Stage 2: Ship-brain symbiosis, perfect coherence with brawn
      return {
        mass: 500,
        can_navigate_beta_space: true,
        max_emotional_distance: 300,  // Best Stage 2 navigator
        quantum_coupling: 1.0,  // Perfect (ship + brawn are one entity)
        coherence_threshold: 0.5,  // Lower threshold due to perfect coupling
        decoherence_rate: 0,  // No degradation (permanent bond)
        observation_precision: 0.5,  // Better than normal Stage 2
        initial_coherence: 1.0,  // Always perfect
        preferred_missions: ['long_range_exploration', 'scientific_research', 'rescue'],
      };

    case 'story_ship':
      // Stage 3: Narrative-seeking, can target specific β-branches
      return {
        mass: 2000,
        can_navigate_beta_space: true,
        max_emotional_distance: 150,
        quantum_coupling: 0.8,
        coherence_threshold: 0.6,
        decoherence_rate: 0.0002,
        observation_precision: 0.7,  // Stage 3: can measure before collapsing
        initial_coherence: 0.7,
        preferred_missions: ['narrative_exploration', 'journalism', 'history'],
      };

    case 'gleisner_vessel':
      // Stage 3: Digital consciousness, can edit self for coherence
      return {
        mass: 500,
        can_navigate_beta_space: true,
        max_emotional_distance: 200,
        quantum_coupling: 0.85,
        coherence_threshold: 0.6,
        decoherence_rate: 0.0001,  // Can repair coherence via code edits
        observation_precision: 0.8,  // Digital precision
        initial_coherence: 0.8,
        preferred_missions: ['data_retrieval', 'hacking', 'infiltration'],
      };

    case 'svetz_retrieval':
      // Stage 3: Temporal archaeology, retrieve from extinct timelines
      return {
        mass: 800,
        can_navigate_beta_space: true,
        max_emotional_distance: 120,
        quantum_coupling: 0.75,
        coherence_threshold: 0.65,
        decoherence_rate: 0.00025,
        observation_precision: 0.75,  // Needs precision to target extinct branches
        initial_coherence: 0.7,
        preferred_missions: ['temporal_retrieval', 'archaeology', 'extinct_timeline_salvage'],
      };

    case 'probability_scout':
      // Stage 3: Solo explorer, maps unobserved branches
      return {
        mass: 50,
        can_navigate_beta_space: true,
        max_emotional_distance: 250,  // Fast and light
        quantum_coupling: 1.0,  // Solo = perfect coupling
        coherence_threshold: 0.5,  // Solo makes it easy
        decoherence_rate: 0,  // Solo = no degradation
        observation_precision: 0.9,  // Best observers (their whole job)
        initial_coherence: 1.0,
        preferred_missions: ['probability_mapping', 'unobserved_branch_discovery', 'scouting'],
      };

    case 'timeline_merger':
      // Stage 3: Collapse compatible branches, reduce timeline proliferation
      return {
        mass: 5000,
        can_navigate_beta_space: true,
        max_emotional_distance: 80,  // Slow but powerful
        quantum_coupling: 0.6,  // Large crew (50+) makes it hard
        coherence_threshold: 0.75,  // Needs very high coherence to merge
        decoherence_rate: 0.0005,  // Degrades fast with large crew
        observation_precision: 0.85,  // Needs precision to identify compatible branches
        initial_coherence: 0.6,
        preferred_missions: ['timeline_collapse', 'branch_merging', 'fork_bomb_cleanup'],
      };

    default:
      // Fallback
      return {
        mass: 1000,
        can_navigate_beta_space: false,
        max_emotional_distance: 0,
        quantum_coupling: 0,
        coherence_threshold: 0.7,
        decoherence_rate: 0.0003,
        observation_precision: 0,
        initial_coherence: 0,
        preferred_missions: [],
      };
  }
}

// ============================================================================
// Schema
// ============================================================================

export const SpaceshipComponentSchema: ComponentSchema<SpaceshipComponent> = {
  type: 'spaceship',
  version: 1,
  fields: [
    { name: 'ship_type', type: 'string', required: true },
    { name: 'name', type: 'string', required: true },
    { name: 'hull', type: 'object', required: true },
    { name: 'narrative', type: 'object', required: true },
    { name: 'crew', type: 'object', required: true },
    { name: 'navigation', type: 'object', required: true },
    { name: 'components', type: 'object', required: true },
  ],
  validate: (data: unknown): data is SpaceshipComponent => {
    if (typeof data !== 'object' || data === null) return false;
    if (!('type' in data) || data.type !== 'spaceship') return false;
    if (!('ship_type' in data) || typeof data.ship_type !== 'string') return false;
    if (!('name' in data) || typeof data.name !== 'string') return false;
    return true;
  },
  createDefault: () => createSpaceshipComponent('worldship', 'Untitled Ship'),
};
