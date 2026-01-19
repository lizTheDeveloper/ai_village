/**
 * PassageExtendedComponent - Extended passage metadata for inter-universe travel
 *
 * Extends the base PassageComponent with detailed metadata about stability,
 * traversal costs, restrictions, and traffic tracking per the spec at:
 * openspec/specs/grand-strategy/10-MULTIVERSE-MECHANICS.md
 */

import type { Component, ComponentSchema } from '../ecs/Component.js';
import type { PassageType } from './PassageComponent.js';
import type { SpaceshipType } from '../navigation/SpaceshipComponent.js';

/**
 * Discovery metadata - who found this passage and when
 */
export interface PassageDiscoveryInfo {
  /** When discovered (universe tick) */
  discoveredAt: number;

  /** Entity ID of discoverer (optional - could be natural) */
  discoveredBy?: string;
}

/**
 * Traversal cost breakdown for using this passage
 */
export interface PassageTraversalCost {
  /** Emotional/mana energy cost to traverse */
  energyCost: number;

  /** Time cost in ticks to cross */
  timeCost: number;

  /** Risk factor (0-1) - chance of failure/complications */
  riskFactor: number;
}

/**
 * Restrictions on who/what can traverse this passage
 */
export interface PassageRestrictions {
  /** Whether traversal requires a ship (vs walking through) */
  requiresShip: boolean;

  /** Minimum ship coherence required (0-1) */
  minimumCoherence: number;

  /** Maximum entity size/mass that can traverse */
  maxEntitySize: number;

  /** Which ship types can traverse (empty = all allowed) */
  allowedShipTypes: SpaceshipType[];
}

/**
 * Traffic statistics for this passage
 */
export interface PassageTraffic {
  /** Total number of successful crossings */
  totalCrossings: number;

  /** Last crossing tick */
  lastCrossing: number;

  /** Congestion level (0-1) - high traffic slows traversals */
  congestion: number;
}

/**
 * Extended passage component with full multiverse travel mechanics.
 *
 * This component extends the base PassageComponent with detailed metadata
 * needed for the full inter-universe travel system including stability decay,
 * ship requirements, and traffic management.
 */
export interface PassageExtendedComponent extends Component {
  type: 'passage_extended';

  /** Reference to base passage component on same entity */
  passageId: string;

  /** Discovery information */
  discovery: PassageDiscoveryInfo;

  /** Stability (0-1) - unstable passages collapse */
  stability: number;

  /** Stability decay rate per tick */
  decayRate: number;

  /** Traversal costs */
  traversalCost: PassageTraversalCost;

  /** Access restrictions */
  restrictions: PassageRestrictions;

  /** Traffic tracking */
  traffic: PassageTraffic;
}

/**
 * Factory function to create passage extended metadata.
 *
 * @param passageId - ID linking to base PassageComponent
 * @param passageType - Type determines initial stability/costs
 * @param discoveredBy - Entity that discovered this passage (optional)
 * @param tick - Current universe tick for discovery timestamp
 */
export function createPassageExtended(
  passageId: string,
  passageType: PassageType,
  discoveredBy: string | undefined,
  tick: number
): PassageExtendedComponent {
  return {
    type: 'passage_extended',
    version: 1,
    passageId,

    discovery: {
      discoveredAt: tick,
      discoveredBy,
    },

    stability: getInitialStability(passageType),
    decayRate: getDecayRate(passageType),

    traversalCost: {
      energyCost: getEnergyCost(passageType),
      timeCost: getTimeCost(passageType),
      riskFactor: getRiskFactor(passageType),
    },

    restrictions: {
      requiresShip: passageType === 'thread', // Only threads require ships
      minimumCoherence: getMinCoherence(passageType),
      maxEntitySize: getMaxSize(passageType),
      allowedShipTypes: getAllowedShips(passageType),
    },

    traffic: {
      totalCrossings: 0,
      lastCrossing: 0,
      congestion: 0,
    },
  };
}

// Lookup tables - replace switch statements with O(1) array/object access
const INITIAL_STABILITY: Record<PassageType, number> = {
  thread: 0.3,
  bridge: 0.7,
  gate: 0.9,
  confluence: 0.95,
};

const DECAY_RATE: Record<PassageType, number> = {
  thread: 0.001,
  bridge: 0.0001,
  gate: 0.00001,
  confluence: 0,
};

const MIN_COHERENCE: Record<PassageType, number> = {
  thread: 0.8,
  bridge: 0.6,
  gate: 0.5,
  confluence: 0.3,
};

const ENERGY_COST: Record<PassageType, number> = {
  thread: 100,
  bridge: 50,
  gate: 20,
  confluence: 10,
};

const TIME_COST: Record<PassageType, number> = {
  thread: 200,
  bridge: 100,
  gate: 50,
  confluence: 20,
};

const RISK_FACTOR: Record<PassageType, number> = {
  thread: 0.3,
  bridge: 0.1,
  gate: 0.05,
  confluence: 0.01,
};

const MAX_SIZE: Record<PassageType, number> = {
  thread: 100,
  bridge: 1000,
  gate: 10000,
  confluence: 100000,
};

const ALLOWED_SHIPS: Record<PassageType, SpaceshipType[]> = {
  thread: ['probability_scout'],
  bridge: [],
  gate: [],
  confluence: [],
};

/**
 * Get initial stability based on passage type.
 * From spec: thread=0.3, bridge=0.7, gate=0.9, confluence=0.95
 */
export function getInitialStability(type: PassageType): number {
  return INITIAL_STABILITY[type];
}

/**
 * Get stability decay rate per tick.
 * From spec: thread decays fastest, confluence doesn't decay
 */
export function getDecayRate(type: PassageType): number {
  return DECAY_RATE[type];
}

/**
 * Get minimum ship coherence required to traverse.
 * From spec: thread=0.8, bridge=0.6, gate=0.5, confluence=0.3
 */
export function getMinCoherence(type: PassageType): number {
  return MIN_COHERENCE[type];
}

/**
 * Get emotional/mana energy cost to traverse.
 */
export function getEnergyCost(type: PassageType): number {
  return ENERGY_COST[type];
}

/**
 * Get time cost in ticks to traverse.
 */
export function getTimeCost(type: PassageType): number {
  return TIME_COST[type];
}

/**
 * Get risk factor (0-1) for traversal complications.
 */
export function getRiskFactor(type: PassageType): number {
  return RISK_FACTOR[type];
}

/**
 * Get maximum entity size/mass that can traverse.
 */
export function getMaxSize(type: PassageType): number {
  return MAX_SIZE[type];
}

/**
 * Get allowed ship types for this passage.
 * Empty array = all ships allowed.
 */
export function getAllowedShips(type: PassageType): SpaceshipType[] {
  return ALLOWED_SHIPS[type];
}

/**
 * Check if a ship can traverse this passage.
 *
 * @param ship - Ship attempting traversal
 * @param passage - Passage being traversed
 * @returns Object with canTraverse boolean and optional failure reason
 */
export function canShipTraverse(
  ship: { ship_type: SpaceshipType; crew: { coherence: number }; hull: { mass: number } },
  passage: PassageExtendedComponent
): { canTraverse: boolean; reason?: string } {
  // Check coherence requirement
  if (ship.crew.coherence < passage.restrictions.minimumCoherence) {
    return {
      canTraverse: false,
      reason: `Insufficient coherence: ${ship.crew.coherence.toFixed(2)} < ${passage.restrictions.minimumCoherence.toFixed(2)}`,
    };
  }

  // Check size restriction
  if (ship.hull.mass > passage.restrictions.maxEntitySize) {
    return {
      canTraverse: false,
      reason: `Ship too large: ${ship.hull.mass} > ${passage.restrictions.maxEntitySize}`,
    };
  }

  // Check ship type restriction
  if (passage.restrictions.allowedShipTypes.length > 0) {
    if (!passage.restrictions.allowedShipTypes.includes(ship.ship_type)) {
      return {
        canTraverse: false,
        reason: `Ship type ${ship.ship_type} not allowed (requires: ${passage.restrictions.allowedShipTypes.join(', ')})`,
      };
    }
  }

  return { canTraverse: true };
}

// Congestion calculation constants - pre-computed for performance
const CONGESTION_DECAY_DIVISOR = 1000;
const CONGESTION_BASE_DIVISOR = 100;

/**
 * Calculate congestion level based on recent traffic.
 *
 * @param traffic - Passage traffic statistics
 * @param currentTick - Current universe tick
 * @returns Congestion level (0-1)
 */
export function calculateCongestion(
  traffic: PassageTraffic,
  currentTick: number
): number {
  // Early exit - no traffic = no congestion
  if (traffic.totalCrossings === 0) return 0;

  // Congestion decays over time
  const ticksSinceLastCrossing = currentTick - traffic.lastCrossing;
  const decayFactor = Math.exp(-ticksSinceLastCrossing / CONGESTION_DECAY_DIVISOR);

  // Base congestion from total crossings (asymptotic to 1.0)
  const baseCongestion = 1 - Math.exp(-traffic.totalCrossings / CONGESTION_BASE_DIVISOR);

  return baseCongestion * decayFactor;
}

// ============================================================================
// Schema
// ============================================================================

export const PassageExtendedComponentSchema: ComponentSchema<PassageExtendedComponent> = {
  type: 'passage_extended',
  version: 1,
  fields: [
    { name: 'passageId', type: 'string', required: true },
    { name: 'discovery', type: 'object', required: true },
    { name: 'stability', type: 'number', required: true },
    { name: 'decayRate', type: 'number', required: true },
    { name: 'traversalCost', type: 'object', required: true },
    { name: 'restrictions', type: 'object', required: true },
    { name: 'traffic', type: 'object', required: true },
  ],
  validate: (data: unknown): data is PassageExtendedComponent => {
    if (typeof data !== 'object' || data === null) return false;
    if (!('type' in data) || data.type !== 'passage_extended') return false;
    if (!('passageId' in data) || typeof data.passageId !== 'string') return false;
    if (!('stability' in data) || typeof data.stability !== 'number') return false;
    if (!('decayRate' in data) || typeof data.decayRate !== 'number') return false;
    return true;
  },
  createDefault: () => createPassageExtended('default', 'bridge', undefined, 0),
};
