/**
 * UpliftAgreementComponent - Tracks civilization-to-civilization technological uplift agreements
 *
 * This component manages active uplift relationships between civilizations,
 * tracking negotiation status, success probability, and potential complications
 * like cultural contamination and dependency.
 *
 * Part of Grand Strategy Phase: Technology Eras & Civilization Uplift
 * See: custom_game_engine/openspec/specs/grand-strategy/08-TECHNOLOGY-ERAS.md
 */

import type { Component } from '../ecs/Component.js';

/**
 * Possible outcomes of an uplift agreement
 */
export type UpliftOutcome =
  | 'full_success'      // Clean tech transfer, no side effects
  | 'partial_dependency' // Success but creates dependency on uplifter
  | 'cargo_cult'        // Misunderstood technology leads to cargo cult formation
  | 'tech_misuse'       // Technology misused (weapons, environmental damage)
  | 'rejection';        // Uplifted civilization rejects the technology

/**
 * Current phase of the uplift agreement
 */
export type UpliftPhase =
  | 'negotiating'  // Initial offer being considered
  | 'in_progress'  // Active technology transfer
  | 'completed'    // Successfully completed
  | 'failed';      // Failed or rejected

/**
 * UpliftAgreementComponent - Active uplift relationship between two civilizations
 *
 * Attached to a dedicated entity representing the agreement itself.
 * Links uplifter and uplifted civilizations via their entity IDs.
 */
export interface UpliftAgreementComponent extends Component {
  type: 'uplift_agreement';

  // ========== Participants ==========

  /** Entity ID of uplifting civilization (more advanced) */
  uplifterCivId: string;

  /** Entity ID of uplifted civilization (less advanced) */
  upliftedCivId: string;

  // ========== Timeline ==========

  /** Tick when agreement started */
  startTick: number;

  /** Tick when agreement completed (if applicable) */
  completionTick: number | null;

  /** Duration of uplift process in ticks */
  durationTicks: number;

  // ========== Uplift Parameters ==========

  /** Number of eras to advance (1-5) */
  targetEraJump: number;

  /** Source era name (for tracking) */
  sourceEra: string;

  /** Target era name (for tracking) */
  targetEra: string;

  /** Probability of success (0-1, based on era gap) */
  successProbability: number;

  // ========== Progress & State ==========

  /** Current phase of agreement */
  currentPhase: UpliftPhase;

  /** Progress in current phase (0-100) */
  progress: number;

  /** Cultural contamination level (0-100, higher = worse) */
  culturalContamination: number;

  /** Dependency level on uplifter (0-100, higher = more dependent) */
  dependencyLevel: number;

  /** Final outcome (set when completed or failed) */
  outcome: UpliftOutcome | null;

  // ========== Complications & Effects ==========

  /** List of complications that occurred during uplift */
  complications: Array<{
    /** Type of complication */
    type: 'cargo_cult' | 'tech_misuse' | 'cultural_shock' | 'dependency_trap';
    /** Description of what happened */
    description: string;
    /** Tick when complication occurred */
    tick: number;
    /** Severity (0-1) */
    severity: number;
  }>;

  /** Technologies transferred as part of this uplift */
  transferredTechnologies: string[];

  // ========== Success/Failure Factors ==========

  /** Factors that influence success probability */
  successFactors: {
    /** Era gap modifier (-1 to 1) */
    eraGapPenalty: number;
    /** Uplifter's stability bonus (0 to 1) */
    uplifterStability: number;
    /** Uplifted civilization's receptiveness (0 to 1) */
    receptiveness: number;
    /** Cultural similarity bonus (0 to 1) */
    culturalSimilarity: number;
    /** Random factor (for this specific attempt) */
    randomFactor: number;
  };
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create an UpliftAgreementComponent for a new uplift relationship
 */
export function createUpliftAgreementComponent(params: {
  uplifterCivId: string;
  upliftedCivId: string;
  startTick: number;
  targetEraJump: number;
  sourceEra: string;
  targetEra: string;
  successProbability: number;
  durationTicks?: number;
}): UpliftAgreementComponent {
  return {
    type: 'uplift_agreement',
    version: 1,

    // Participants
    uplifterCivId: params.uplifterCivId,
    upliftedCivId: params.upliftedCivId,

    // Timeline
    startTick: params.startTick,
    completionTick: null,
    durationTicks: params.durationTicks ?? 1200, // Default 60 seconds (1200 ticks)

    // Parameters
    targetEraJump: params.targetEraJump,
    sourceEra: params.sourceEra,
    targetEra: params.targetEra,
    successProbability: params.successProbability,

    // State
    currentPhase: 'negotiating',
    progress: 0,
    culturalContamination: 0,
    dependencyLevel: 0,
    outcome: null,

    // Complications
    complications: [],
    transferredTechnologies: [],

    // Success factors
    successFactors: {
      eraGapPenalty: 0,
      uplifterStability: 1,
      receptiveness: 0.5,
      culturalSimilarity: 0.5,
      randomFactor: Math.random(),
    },
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate success probability based on era gap
 * +1 era: 80%, +2 eras: 50%, +3 eras: 25%, +4 eras: 10%, +5 eras: 5%
 */
export function calculateSuccessProbability(eraJump: number): number {
  if (eraJump <= 0) {
    throw new Error('Era jump must be positive');
  }

  // Exponential decay formula
  const baseProbability = 0.9; // 90% for +1 era
  const decayRate = 0.5; // 50% reduction per era

  return Math.max(0.05, baseProbability * Math.pow(decayRate, eraJump - 1));
}

/**
 * Calculate cultural contamination based on era gap and success roll
 * Larger jumps and lower success rolls = more contamination
 */
export function calculateCulturalContamination(
  eraJump: number,
  successRoll: number
): number {
  // Base contamination from era gap (10% per era)
  let contamination = eraJump * 10;

  // Low success roll increases contamination
  if (successRoll < 0.3) {
    contamination += 30; // Significant contamination
  } else if (successRoll < 0.6) {
    contamination += 15; // Moderate contamination
  }

  return Math.min(100, contamination);
}

/**
 * Determine outcome based on success roll and contamination
 */
export function determineUpliftOutcome(
  successRoll: number,
  successProbability: number,
  culturalContamination: number
): UpliftOutcome {
  // Rejection
  if (successRoll < successProbability * 0.3) {
    return 'rejection';
  }

  // Failure outcomes based on contamination
  if (successRoll < successProbability) {
    if (culturalContamination > 60) {
      return 'cargo_cult';
    }
    if (culturalContamination > 40) {
      return 'tech_misuse';
    }
    return 'partial_dependency';
  }

  // Success
  if (culturalContamination > 30) {
    return 'partial_dependency';
  }

  return 'full_success';
}

/**
 * Check if uplift agreement is active
 */
export function isUpliftActive(agreement: UpliftAgreementComponent): boolean {
  return agreement.currentPhase === 'in_progress' || agreement.currentPhase === 'negotiating';
}

/**
 * Check if uplift agreement is complete
 */
export function isUpliftComplete(agreement: UpliftAgreementComponent): boolean {
  return agreement.currentPhase === 'completed' || agreement.currentPhase === 'failed';
}
