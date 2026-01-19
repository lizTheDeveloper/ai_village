/**
 * InvasionComponent - Tracks invasion state for a universe
 *
 * Supports three invasion types:
 * 1. Military invasion (fleet conquest)
 * 2. Cultural invasion (technology uplift)
 * 3. Economic invasion (trade dominance)
 *
 * PERFORMANCE NOTES:
 * - InvasionSystem uses numeric enum dispatch for fast type comparisons
 * - String types preserved for serialization/API compatibility
 * - Arrays pre-allocated to minimize reallocation
 */

import type { Component, ComponentSchema } from '../ecs/Component.js';
import type { TradeAgreement } from '../trade/TradeAgreementTypes.js';

// ============================================================================
// Types
// ============================================================================

export type InvasionType = 'military' | 'cultural' | 'economic';

export type InvasionOutcome =
  | 'total_conquest'
  | 'partial_conquest'
  | 'invasion_repelled'
  | 'cultural_conquest'
  | 'economic_conquest';

export type DefenseStrategy =
  | 'military_resistance'      // Fight back (usually fails against tech gap)
  | 'passage_destruction'      // Destroy passage to isolate invader
  | 'timeline_fork_escape'     // Fork timeline to create "clean" branch
  | 'cultural_preservation'    // Maintain culture despite occupation
  | 'insurgency'               // Guerrilla warfare
  | 'diplomatic_alliance';     // Ally with other universes

// ============================================================================
// Numeric Constants for Performance
// ============================================================================

/**
 * PERF: Invasion outcome priority for quick comparisons
 * Higher value = more severe outcome
 */
export const INVASION_OUTCOME_SEVERITY: Record<InvasionOutcome, number> = {
  invasion_repelled: 0,
  partial_conquest: 1,
  total_conquest: 2,
  cultural_conquest: 1,
  economic_conquest: 1,
};

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Result of military invasion attempt
 */
export interface InvasionResult {
  success: boolean;
  outcome?: InvasionOutcome;
  reason?: string;
  occupiedSystems?: string[];
  casualties?: {
    attackerLosses: number;
    defenderLosses: number;
  };
}

/**
 * Result of technology uplift (cultural invasion)
 */
export interface UpliftResult {
  success: boolean;
  outcome?: 'cultural_conquest';
  reason?: string;
  dependencyLevel?: number;       // 0-1, how dependent is uplifted civ
  culturalDominance?: number;     // 0-1, cultural influence level
  tradeAgreement?: TradeAgreement;
}

/**
 * Result of economic invasion
 */
export interface EconomicInvasionResult {
  success: boolean;
  outcome?: 'economic_conquest';
  tradeAgreement?: TradeAgreement;
  industrialCollapse?: number;    // 0-1, how much local industry collapsed
  economicDependency?: number;    // 0-1, dependency on invader
}

/**
 * Defense strategy and effectiveness
 */
export interface InvasionDefense {
  strategy: DefenseStrategy;
  effectiveness: number; // 0-1
}

/**
 * Active invasion record
 */
export interface ActiveInvasion {
  invasionId: string;
  type: InvasionType;
  attackerUniverseId: string;
  targetUniverseId: string;
  passageId?: string;
  startTick: number;
  status: 'planning' | 'in_progress' | 'completed' | 'failed';

  // Military invasion fields
  attackerFleetId?: string;
  defenseStrategy?: DefenseStrategy;

  // Cultural invasion fields
  techPackage?: {
    technologies: string[];
    totalEraJump: number;
    dependencyItems: string[];
  };

  // Economic invasion fields
  tradeAgreementId?: string;

  // Results (populated when completed)
  result?: InvasionResult | UpliftResult | EconomicInvasionResult;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Component tracking invasion state for a universe
 */
export interface InvasionComponent extends Component {
  type: 'invasion';

  /**
   * Universe being tracked
   */
  universeId: string;

  /**
   * Active invasions (this universe is being invaded)
   */
  activeInvasions: ActiveInvasion[];

  /**
   * Outbound invasions (this universe is invading others)
   */
  outboundInvasions: ActiveInvasion[];

  /**
   * Defense configuration
   */
  defense: {
    strategy: DefenseStrategy;
    effectiveness: number;
    lastUpdated: number;
  };

  /**
   * Historical invasions
   */
  history: {
    invasionsReceived: number;
    invasionsSent: number;
    lastInvasionTick: number;
  };
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createInvasionComponent(
  universeId: string
): InvasionComponent {
  return {
    type: 'invasion',
    version: 1,
    universeId,
    activeInvasions: [],
    outboundInvasions: [],
    defense: {
      strategy: 'military_resistance',
      effectiveness: 0.5,
      lastUpdated: 0,
    },
    history: {
      invasionsReceived: 0,
      invasionsSent: 0,
      lastInvasionTick: 0,
    },
  };
}

// ============================================================================
// Schema
// ============================================================================

export const InvasionComponentSchema: ComponentSchema<InvasionComponent> = {
  type: 'invasion',
  version: 1,
  fields: [
    { name: 'universeId', type: 'string', required: true },
    { name: 'activeInvasions', type: 'object', required: true },
    { name: 'outboundInvasions', type: 'object', required: true },
    { name: 'defense', type: 'object', required: true },
    { name: 'history', type: 'object', required: true },
  ],
  validate: (data: unknown): data is InvasionComponent => {
    if (typeof data !== 'object' || data === null) return false;
    if (!('type' in data) || data.type !== 'invasion') return false;
    if (!('universeId' in data) || typeof data.universeId !== 'string') return false;
    if (!('activeInvasions' in data) || !Array.isArray(data.activeInvasions)) return false;
    if (!('outboundInvasions' in data) || !Array.isArray(data.outboundInvasions)) return false;
    return true;
  },
  createDefault: () => createInvasionComponent('default_universe'),
};
