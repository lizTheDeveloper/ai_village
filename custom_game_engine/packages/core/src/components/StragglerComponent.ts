import type { Component, ComponentSchema } from '../ecs/Component.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Recovery status for a straggler ship
 */
export type RecoveryStatus =
  | 'stranded'           // Left behind in previous β-branch
  | 'attempting_solo_jump' // Trying to jump alone (risky)
  | 'awaiting_rescue'     // Waiting for rescue squadron
  | 'recovered'           // Successfully recovered
  | 'lost';               // Lost to decoherence/contamination

// ============================================================================
// Interface
// ============================================================================

/**
 * StragglerComponent - Marks a ship left behind during fleet β-space jump
 *
 * When fleet coherence is insufficient (<0.7), some ships fail alignment
 * and are "left behind" in the previous β-branch. These stragglers must either:
 * - Jump independently (risky - high failure rate)
 * - Wait for rescue squadron
 * - Risk being lost to decoherence/contamination
 *
 * Reference: openspec/specs/grand-strategy/05-SHIP-FLEET-HIERARCHY.md lines 1350-1377
 */
export interface StragglerComponent extends Component {
  type: 'straggler';
  version: 1;

  /**
   * Original fleet information
   */
  originalFleetId: string;
  originalSquadronId: string;

  /**
   * Straggler state
   */
  strandedAtBranch: string;  // β-branch ID where ship was left
  strandedTick: number;      // When ship was stranded

  /**
   * Recovery options and status
   */
  recoveryStatus: RecoveryStatus;
  soloJumpAttempts: number;  // Number of solo jump attempts (each increases risk)
  rescueSquadronId?: string; // Rescue squadron if assigned

  /**
   * Risk factors
   * Accelerated when alone in β-space
   */
  decoherenceRate: number;    // Rate of coherence loss (higher when alone)
  contaminationRisk: number;  // Risk of timeline contamination (0-1)

  /**
   * Survival thresholds
   */
  maxStrandedTicks: number;   // Ticks before ship is lost (configurable)
  coherenceLossPerTick: number; // Accelerated coherence loss rate
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a new StragglerComponent
 *
 * @param fleetId - Original fleet ID
 * @param squadronId - Original squadron ID
 * @param branchId - β-branch ID where ship was stranded
 * @param tick - Current tick when ship was stranded
 * @param maxStrandedTicks - Maximum ticks before ship is lost (default: 3000 = 2.5 minutes)
 * @returns StragglerComponent
 */
export function createStragglerComponent(
  fleetId: string,
  squadronId: string,
  branchId: string,
  tick: number,
  maxStrandedTicks = 3000
): StragglerComponent {
  return {
    type: 'straggler',
    version: 1,
    originalFleetId: fleetId,
    originalSquadronId: squadronId,
    strandedAtBranch: branchId,
    strandedTick: tick,
    recoveryStatus: 'stranded',
    soloJumpAttempts: 0,
    decoherenceRate: 0.05,           // 5% base rate (accelerated from normal)
    contaminationRisk: 0.1,          // 10% base risk
    maxStrandedTicks,
    coherenceLossPerTick: 0.001,     // 0.1% per tick
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Update decoherence rate based on time stranded
 * Decoherence accelerates the longer a ship is alone
 */
export function updateDecoherenceRate(
  straggler: StragglerComponent,
  currentTick: number
): void {
  const ticksStranded = currentTick - straggler.strandedTick;
  const baseRate = 0.05;

  // Decoherence rate increases by 0.01 per 500 ticks stranded
  const timeMultiplier = 1 + (ticksStranded / 500) * 0.01;
  straggler.decoherenceRate = baseRate * timeMultiplier;

  // Cap at 0.5 (50% decoherence rate)
  straggler.decoherenceRate = Math.min(0.5, straggler.decoherenceRate);
}

/**
 * Update contamination risk based on time stranded
 * Contamination risk increases the longer a ship is alone
 */
export function updateContaminationRisk(
  straggler: StragglerComponent,
  currentTick: number
): void {
  const ticksStranded = currentTick - straggler.strandedTick;
  const baseRisk = 0.1;

  // Contamination risk increases by 0.05 per 1000 ticks stranded
  const timeMultiplier = 1 + (ticksStranded / 1000) * 0.05;
  straggler.contaminationRisk = baseRisk * timeMultiplier;

  // Cap at 0.9 (90% contamination risk)
  straggler.contaminationRisk = Math.min(0.9, straggler.contaminationRisk);
}

/**
 * Calculate solo jump success chance
 * Based on ship coherence, straggler attempts, and contamination risk
 *
 * @param shipCoherence - Ship's current coherence (0-1)
 * @param straggler - StragglerComponent
 * @returns Success chance (0-1)
 */
export function calculateSoloJumpSuccessChance(
  shipCoherence: number,
  straggler: StragglerComponent
): number {
  // Base chance from ship coherence
  const coherenceBonus = shipCoherence;

  // Each solo jump attempt reduces success chance (desperation penalty)
  const attemptPenalty = straggler.soloJumpAttempts * 0.1;

  // Contamination risk reduces success chance
  const contaminationPenalty = straggler.contaminationRisk * 0.3;

  // Combined success chance
  const successChance = coherenceBonus - attemptPenalty - contaminationPenalty;

  return Math.max(0, Math.min(1, successChance));
}

/**
 * Check if ship should be marked as lost
 *
 * @param straggler - StragglerComponent
 * @param currentTick - Current tick
 * @returns true if ship should be marked as lost
 */
export function shouldMarkAsLost(
  straggler: StragglerComponent,
  currentTick: number
): boolean {
  const ticksStranded = currentTick - straggler.strandedTick;

  // Check time threshold
  if (ticksStranded >= straggler.maxStrandedTicks) {
    return true;
  }

  // Check contamination risk threshold (>0.8 = lost to contamination)
  if (straggler.contaminationRisk > 0.8) {
    return true;
  }

  return false;
}

// ============================================================================
// Schema
// ============================================================================

export const StragglerComponentSchema: ComponentSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['straggler'] },
    version: { type: 'number', enum: [1] },
    originalFleetId: { type: 'string' },
    originalSquadronId: { type: 'string' },
    strandedAtBranch: { type: 'string' },
    strandedTick: { type: 'number' },
    recoveryStatus: {
      type: 'string',
      enum: ['stranded', 'attempting_solo_jump', 'awaiting_rescue', 'recovered', 'lost'],
    },
    soloJumpAttempts: { type: 'number' },
    rescueSquadronId: { type: 'string' },
    decoherenceRate: { type: 'number' },
    contaminationRisk: { type: 'number' },
    maxStrandedTicks: { type: 'number' },
    coherenceLossPerTick: { type: 'number' },
  },
  required: [
    'type',
    'version',
    'originalFleetId',
    'originalSquadronId',
    'strandedAtBranch',
    'strandedTick',
    'recoveryStatus',
    'soloJumpAttempts',
    'decoherenceRate',
    'contaminationRisk',
    'maxStrandedTicks',
    'coherenceLossPerTick',
  ],
};
