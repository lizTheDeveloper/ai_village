/**
 * CivilizationReputationComponent - Tracks civilization's reputation and ethical stance
 *
 * This component manages a civilization's reputation regarding technological uplift
 * and intervention in other civilizations, implementing a "Prime Directive" vs
 * "Interventionist" axis.
 *
 * Part of Grand Strategy Phase: Technology Eras & Civilization Uplift
 * See: custom_game_engine/openspec/specs/grand-strategy/08-TECHNOLOGY-ERAS.md
 */

import type { Component } from '../ecs/Component.js';

/**
 * CivilizationReputationComponent - Ethical reputation and diplomatic standing
 *
 * Attached to civilization entities (city, province, nation, empire).
 * Tracks both ethical philosophy (Prime Directive vs Interventionist)
 * and concrete diplomatic reputation with other civilizations.
 */
export interface CivilizationReputationComponent extends Component {
  type: 'civilization_reputation';

  // ========== Ethical Philosophy Scores ==========

  /**
   * Prime Directive Score (-100 to 0)
   * Measures commitment to non-interference.
   * - -100: Absolute non-interference, even when civilizations ask for help
   * - -50: Observes strictly but may provide aid in emergencies
   * - 0: Neutral stance
   */
  primeDirectiveScore: number;

  /**
   * Interventionist Score (0 to +100)
   * Measures willingness to actively shape other civilizations.
   * - 0: Neutral stance
   * - +50: Offers aid when asked, respects autonomy
   * - +100: Actively uplifts and guides civilizations
   */
  interventionistScore: number;

  // ========== Uplift Track Record ==========

  /** Total number of uplift attempts initiated */
  upliftAttempts: number;

  /** Number of successful uplifts (full_success outcome) */
  upliftSuccesses: number;

  /** Number of failed uplifts (any negative outcome) */
  upliftFailures: number;

  /** Number of cargo cults created by this civilization */
  cargoCultsCreated: number;

  /** Number of technology misuse incidents caused */
  techMisuseIncidents: number;

  /** Number of dependency relationships created */
  dependentCivilizations: number;

  // ========== Historical Record ==========

  /** History of uplift attempts */
  upliftHistory: Array<{
    /** Target civilization ID */
    targetCivId: string;
    /** Target civilization name */
    targetCivName: string;
    /** Tick when uplift started */
    startTick: number;
    /** Tick when uplift completed */
    completionTick: number;
    /** Final outcome */
    outcome: 'full_success' | 'partial_dependency' | 'cargo_cult' | 'tech_misuse' | 'rejection';
    /** Era jump attempted */
    eraJump: number;
  }>;

  // ========== Diplomatic Reputation ==========

  /**
   * Trust levels with other civilizations
   * Key: civilization ID
   * Value: trust score (-100 to +100)
   * - +100: Complete trust, would accept uplift offers immediately
   * - 0: Neutral, cautious
   * - -100: Complete distrust, would reject all offers
   */
  reputationWithOthers: Record<string, number>;

  /**
   * Reputation modifiers from recent events
   * Temporary bonuses/penalties that decay over time
   */
  reputationModifiers: Array<{
    /** Source of modifier (event type) */
    source: string;
    /** Other civilization ID affected */
    targetCivId: string;
    /** Modifier value (-100 to +100) */
    value: number;
    /** Tick when modifier was applied */
    appliedTick: number;
    /** Tick when modifier expires */
    expiryTick: number;
    /** Description of what caused this modifier */
    description: string;
  }>;

  // ========== Observations & Intelligence ==========

  /**
   * Known civilizations this civilization has observed
   * Used for detecting primitive civilizations for potential uplift
   */
  knownCivilizations: Array<{
    /** Civilization ID */
    civId: string;
    /** Civilization name */
    civName: string;
    /** Last known technology era */
    lastKnownEra: string;
    /** Era index (0-14) */
    lastKnownEraIndex: number;
    /** Tick when last observed */
    lastObservedTick: number;
    /** Distance in chunks (for proximity checks) */
    distance: number;
  }>;
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a CivilizationReputationComponent for a civilization
 */
export function createCivilizationReputationComponent(
  initialStance: 'non_interventionist' | 'neutral' | 'interventionist' = 'neutral'
): CivilizationReputationComponent {
  let primeDirectiveScore = 0;
  let interventionistScore = 0;

  // Set initial stance
  if (initialStance === 'non_interventionist') {
    primeDirectiveScore = -60;
    interventionistScore = 0;
  } else if (initialStance === 'interventionist') {
    primeDirectiveScore = 0;
    interventionistScore = 60;
  }

  return {
    type: 'civilization_reputation',
    version: 1,

    // Ethical scores
    primeDirectiveScore,
    interventionistScore,

    // Track record
    upliftAttempts: 0,
    upliftSuccesses: 0,
    upliftFailures: 0,
    cargoCultsCreated: 0,
    techMisuseIncidents: 0,
    dependentCivilizations: 0,

    // History
    upliftHistory: [],

    // Reputation
    reputationWithOthers: {},
    reputationModifiers: [],

    // Observations
    knownCivilizations: [],
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate net ethical stance (-100 to +100)
 * Negative = non-interventionist, Positive = interventionist
 */
export function calculateEthicalStance(
  reputation: CivilizationReputationComponent
): number {
  return reputation.primeDirectiveScore + reputation.interventionistScore;
}

/**
 * Update reputation after an uplift outcome
 */
export function updateReputationFromUplift(
  reputation: CivilizationReputationComponent,
  outcome: 'full_success' | 'partial_dependency' | 'cargo_cult' | 'tech_misuse' | 'rejection',
  targetCivId: string,
  eraJump: number
): void {
  // Update track record
  reputation.upliftAttempts += 1;

  switch (outcome) {
    case 'full_success':
      reputation.upliftSuccesses += 1;
      // Increase interventionist score (successful intervention)
      reputation.interventionistScore = Math.min(100, reputation.interventionistScore + 5);
      // Improve reputation with target
      if (!(targetCivId in reputation.reputationWithOthers)) {
        reputation.reputationWithOthers[targetCivId] = 0;
      }
      reputation.reputationWithOthers[targetCivId] = Math.min(
        100,
        reputation.reputationWithOthers[targetCivId] + 30
      );
      break;

    case 'partial_dependency':
      reputation.upliftFailures += 1;
      reputation.dependentCivilizations += 1;
      // Slight decrease in reputation with target (they resent dependency)
      if (!(targetCivId in reputation.reputationWithOthers)) {
        reputation.reputationWithOthers[targetCivId] = 0;
      }
      reputation.reputationWithOthers[targetCivId] = Math.max(
        -100,
        reputation.reputationWithOthers[targetCivId] - 10
      );
      break;

    case 'cargo_cult':
      reputation.upliftFailures += 1;
      reputation.cargoCultsCreated += 1;
      // Major damage to interventionist score (bad outcome)
      reputation.interventionistScore = Math.max(0, reputation.interventionistScore - 15);
      // Strengthen prime directive score (lesson learned)
      reputation.primeDirectiveScore = Math.max(-100, reputation.primeDirectiveScore - 10);
      break;

    case 'tech_misuse':
      reputation.upliftFailures += 1;
      reputation.techMisuseIncidents += 1;
      // Severe damage to interventionist score
      reputation.interventionistScore = Math.max(0, reputation.interventionistScore - 20);
      // Strengthen prime directive score significantly
      reputation.primeDirectiveScore = Math.max(-100, reputation.primeDirectiveScore - 15);
      // Damage reputation with target (they blame uplifter)
      if (!(targetCivId in reputation.reputationWithOthers)) {
        reputation.reputationWithOthers[targetCivId] = 0;
      }
      reputation.reputationWithOthers[targetCivId] = Math.max(
        -100,
        reputation.reputationWithOthers[targetCivId] - 40
      );
      break;

    case 'rejection':
      reputation.upliftFailures += 1;
      // Minor shift toward prime directive (respect their choice)
      reputation.primeDirectiveScore = Math.max(-100, reputation.primeDirectiveScore - 5);
      // Slight reputation loss with target (they don't trust us)
      if (!(targetCivId in reputation.reputationWithOthers)) {
        reputation.reputationWithOthers[targetCivId] = 0;
      }
      reputation.reputationWithOthers[targetCivId] = Math.max(
        -100,
        reputation.reputationWithOthers[targetCivId] - 5
      );
      break;
  }
}

/**
 * Get trust level with a specific civilization
 */
export function getTrustLevel(
  reputation: CivilizationReputationComponent,
  civilizationId: string
): number {
  return reputation.reputationWithOthers[civilizationId] ?? 0;
}

/**
 * Add or update a known civilization in observations
 */
export function updateKnownCivilization(
  reputation: CivilizationReputationComponent,
  civId: string,
  civName: string,
  era: string,
  eraIndex: number,
  distance: number,
  tick: number
): void {
  const existing = reputation.knownCivilizations.find((k) => k.civId === civId);

  if (existing) {
    // Update existing entry
    existing.lastKnownEra = era;
    existing.lastKnownEraIndex = eraIndex;
    existing.lastObservedTick = tick;
    existing.distance = distance;
  } else {
    // Add new entry
    reputation.knownCivilizations.push({
      civId,
      civName,
      lastKnownEra: era,
      lastKnownEraIndex: eraIndex,
      lastObservedTick: tick,
      distance,
    });
  }
}

/**
 * Calculate success rate based on reputation history
 */
export function calculateSuccessRate(reputation: CivilizationReputationComponent): number {
  if (reputation.upliftAttempts === 0) {
    return 0.5; // No track record = 50% estimated
  }

  return reputation.upliftSuccesses / reputation.upliftAttempts;
}
