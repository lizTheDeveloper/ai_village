/**
 * RainbowPlanetComponent - Quantum superposition of planetary histories
 *
 * Based on Larry Niven's "Rainbow Mars" concept:
 * - Planets exist in multiple simultaneous pasts
 * - Which history you observe depends on your β-branch
 * - Mars can be red, green, blue, or all at once (superposition)
 * - Observation collapses the probability wave
 *
 * This is the game's implementation of observational timeline branching.
 */

import type { Component, ComponentSchema } from '../ecs/Component.js';

// ============================================================================
// Types
// ============================================================================

/**
 * A single possible history for a planet
 * Like: Red Mars, Green Mars, Blue Mars from Rainbow Mars
 */
export interface PlanetaryHistory {
  /** β-branch where this history is observed */
  beta_branch: string;

  /** Atmosphere composition */
  atmosphere: {
    composition: string;  // e.g., 'thick_co2', 'nitrogen_oxygen', 'thin_co2'
    pressure: number;     // In atmospheres
    breathable: boolean;
  };

  /** Water state */
  water: {
    state: 'none' | 'polar_ice' | 'canals' | 'oceans' | 'superposition';
    coverage: number;  // 0-1
  };

  /** Life state */
  life: {
    exists: boolean;
    type: 'none' | 'microbial' | 'plants' | 'animals' | 'intelligent' | 'dying_civilization' | 'flourishing';
    population: number;
  };

  /** Geological age (in billions of years) */
  age: number;

  /** Human-readable description */
  description: string;

  /** Probability weight (higher = more likely to observe) */
  probability: number;  // 0-1
}

/**
 * Superposition state - all histories exist simultaneously
 */
export interface QuantumSuperposition {
  /** Is this planet in superposition (not yet observed)? */
  is_superposition: boolean;

  /** All possible histories */
  possible_histories: PlanetaryHistory[];

  /** Current observed history (null if in superposition) */
  observed_history: PlanetaryHistory | null;

  /** Which β-branch did the observation that collapsed this? */
  collapsed_by_beta: string | null;

  /** Observation strength (how strongly was it collapsed?) */
  collapse_strength: number;  // 0-1

  /** Can this be un-collapsed back to superposition? */
  can_decohere: boolean;
}

// ============================================================================
// Interface
// ============================================================================

/**
 * RainbowPlanet - A planet with multiple simultaneous pasts
 */
export interface RainbowPlanetComponent extends Component {
  type: 'rainbow_planet';

  /** Planet name */
  name: string;

  /** Planet type for flavor */
  planet_type: 'terrestrial' | 'gas_giant' | 'ice_world' | 'lava_world';

  /** Quantum superposition state */
  quantum_state: QuantumSuperposition;

  /** Discovery tracking */
  discovery: {
    /** Has any civilization discovered this planet's quantum nature? */
    quantum_nature_discovered: boolean;

    /** Who discovered it */
    discovered_by_civilization: string | null;

    /** When discovered (tick) */
    discovered_at: number;

    /** β-branch where discovered */
    discovered_in_branch: string | null;
  };

  /** Timeline contamination from this planet */
  contamination: {
    /** Entities retrieved from this planet's different histories */
    cross_timeline_entities: Array<{
      entity_id: string;
      source_history_beta: string;
      retrieval_date: number;
    }>;

    /** How much timeline contamination has this planet caused? */
    total_contamination: number;  // 0-1
  };
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a Rainbow Mars analog
 */
export function createRainbowMars(): RainbowPlanetComponent {
  return {
    type: 'rainbow_planet',
    version: 1,
    name: 'Mars',
    planet_type: 'terrestrial',
    quantum_state: {
      is_superposition: true,
      possible_histories: [
        {
          beta_branch: 'root.material.mars.red',
          atmosphere: {
            composition: 'thin_co2',
            pressure: 0.006,
            breathable: false,
          },
          water: {
            state: 'polar_ice',
            coverage: 0.02,
          },
          life: {
            exists: false,
            type: 'none',
            population: 0,
          },
          age: 4.5,
          description: 'The Mars we see now - dead, dusty, red. Thin atmosphere, no life.',
          probability: 0.7,  // Most likely to observe
        },
        {
          beta_branch: 'root.material.mars.green',
          atmosphere: {
            composition: 'thick_co2',
            pressure: 0.3,
            breathable: false,
          },
          water: {
            state: 'canals',
            coverage: 0.15,
          },
          life: {
            exists: true,
            type: 'dying_civilization',
            population: 100000,
          },
          age: 4.5,
          description: "Lowell's Mars - ancient canals, last Martians dying in the desert.",
          probability: 0.2,
        },
        {
          beta_branch: 'root.material.mars.blue',
          atmosphere: {
            composition: 'nitrogen_oxygen',
            pressure: 0.8,
            breathable: true,
          },
          water: {
            state: 'oceans',
            coverage: 0.6,
          },
          life: {
            exists: true,
            type: 'flourishing',
            population: 10000000,
          },
          age: 3.0,
          description: 'Young Mars - Earth-like, teeming with life, blue oceans.',
          probability: 0.08,
        },
        {
          beta_branch: 'root.material.mars.rainbow',
          atmosphere: {
            composition: 'quantum_superposition',
            pressure: -1,  // Undefined
            breathable: false,
          },
          water: {
            state: 'superposition',
            coverage: -1,  // All states simultaneously
          },
          life: {
            exists: true,
            type: 'intelligent',
            population: -1,  // Depends on observer
          },
          age: -1,
          description: 'Mars as quantum superposition - all pasts exist until observed. The true Rainbow Mars.',
          probability: 0.02,  // Very rare to observe pure superposition
        },
      ],
      observed_history: null,  // Not yet observed
      collapsed_by_beta: null,
      collapse_strength: 0,
      can_decohere: true,
    },
    discovery: {
      quantum_nature_discovered: false,
      discovered_by_civilization: null,
      discovered_at: 0,
      discovered_in_branch: null,
    },
    contamination: {
      cross_timeline_entities: [],
      total_contamination: 0,
    },
  };
}

/**
 * Create a generic rainbow planet
 */
export function createRainbowPlanet(
  name: string,
  planet_type: RainbowPlanetComponent['planet_type'],
  histories: PlanetaryHistory[]
): RainbowPlanetComponent {
  return {
    type: 'rainbow_planet',
    version: 1,
    name,
    planet_type,
    quantum_state: {
      is_superposition: true,
      possible_histories: histories,
      observed_history: null,
      collapsed_by_beta: null,
      collapse_strength: 0,
      can_decohere: true,
    },
    discovery: {
      quantum_nature_discovered: false,
      discovered_by_civilization: null,
      discovered_at: 0,
      discovered_in_branch: null,
    },
    contamination: {
      cross_timeline_entities: [],
      total_contamination: 0,
    },
  };
}

/**
 * Collapse a planet's superposition to a specific history
 * (Like Svetz observing Mars and collapsing it to a specific past)
 */
export function collapsePlanetHistory(
  planet: RainbowPlanetComponent,
  beta_branch: string,
  collapse_strength: number = 1.0
): PlanetaryHistory | null {
  if (!planet.quantum_state.is_superposition) {
    // Already collapsed
    return planet.quantum_state.observed_history;
  }

  // Find the history for this β-branch
  const history = planet.quantum_state.possible_histories.find(
    (h) => h.beta_branch === beta_branch
  );

  if (!history) {
    // Try probabilistic collapse
    return collapsePlanetHistoryProbabilistic(planet, beta_branch, collapse_strength);
  }

  // Collapse the wavefunction
  planet.quantum_state.is_superposition = false;
  planet.quantum_state.observed_history = history;
  planet.quantum_state.collapsed_by_beta = beta_branch;
  planet.quantum_state.collapse_strength = collapse_strength;

  return history;
}

/**
 * Collapse based on probability weights (when exact branch not found)
 */
function collapsePlanetHistoryProbabilistic(
  planet: RainbowPlanetComponent,
  beta_branch: string,
  collapse_strength: number
): PlanetaryHistory | null {
  const histories = planet.quantum_state.possible_histories;
  if (histories.length === 0) return null;

  // Select based on probability weights
  const totalProbability = histories.reduce((sum, h) => sum + h.probability, 0);
  let random = Math.random() * totalProbability;

  let selectedHistory: PlanetaryHistory | null = null;
  for (const history of histories) {
    random -= history.probability;
    if (random <= 0) {
      selectedHistory = history;
      break;
    }
  }

  if (!selectedHistory) {
    selectedHistory = histories[0]!;
  }

  // Collapse
  planet.quantum_state.is_superposition = false;
  planet.quantum_state.observed_history = selectedHistory;
  planet.quantum_state.collapsed_by_beta = beta_branch;
  planet.quantum_state.collapse_strength = collapse_strength;

  return selectedHistory;
}

/**
 * Decohere (un-collapse) a planet back to superposition
 * Only possible if collapse_strength is weak and can_decohere is true
 */
export function decohereToSuperposition(
  planet: RainbowPlanetComponent
): boolean {
  if (planet.quantum_state.is_superposition) {
    return true;  // Already in superposition
  }

  if (!planet.quantum_state.can_decohere) {
    return false;  // Cannot decohere
  }

  if (planet.quantum_state.collapse_strength > 0.8) {
    return false;  // Too strongly collapsed
  }

  // Decohere back to superposition
  planet.quantum_state.is_superposition = true;
  planet.quantum_state.observed_history = null;
  planet.quantum_state.collapsed_by_beta = null;
  planet.quantum_state.collapse_strength = 0;

  return true;
}

// ============================================================================
// Schema
// ============================================================================

export const RainbowPlanetComponentSchema: ComponentSchema<RainbowPlanetComponent> = {
  type: 'rainbow_planet',
  version: 1,
  fields: [
    { name: 'name', type: 'string', required: true },
    { name: 'planet_type', type: 'string', required: true },
    { name: 'quantum_state', type: 'object', required: true },
    { name: 'discovery', type: 'object', required: true },
    { name: 'contamination', type: 'object', required: true },
  ],
  validate: (data: unknown): data is RainbowPlanetComponent => {
    if (typeof data !== 'object' || data === null) return false;

    return (
      'type' in data &&
      data.type === 'rainbow_planet' &&
      'name' in data &&
      typeof data.name === 'string' &&
      'planet_type' in data &&
      typeof data.planet_type === 'string' &&
      'quantum_state' in data &&
      typeof data.quantum_state === 'object' &&
      'discovery' in data &&
      typeof data.discovery === 'object' &&
      'contamination' in data &&
      typeof data.contamination === 'object'
    );
  },
  createDefault: () => createRainbowMars(),
};
