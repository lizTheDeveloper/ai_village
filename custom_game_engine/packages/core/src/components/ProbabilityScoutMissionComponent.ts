/**
 * ProbabilityScoutMissionComponent - Tracks probability scout ship missions
 *
 * Probability scouts map unobserved probability branches without causing
 * timeline contamination (low collapse risk).
 *
 * See: openspec/IMPLEMENTATION_ROADMAP.md Phase 6.2
 */

import type { Component } from '../ecs/Component.js';

/**
 * Branch observation record
 */
export interface BranchObservation {
  /** Branch identifier */
  branchId: string;
  /** Divergence point tick */
  divergenceTick: number;
  /** Key differences from current timeline */
  differences: string[];
  /** Observation precision (0-1) */
  precision: number;
  /** Tick when observed */
  observedTick: number;
  /** Risk of collapse if visited */
  collapseRisk: number;
}

/**
 * ProbabilityScoutMissionComponent - Attached to probability_scout ships
 */
export interface ProbabilityScoutMissionComponent extends Component {
  type: 'probability_scout_mission';

  /** Ship entity ID */
  shipId: string;

  /** Tick when mission started */
  startTick: number;

  /** Mission phase */
  phase: 'scanning' | 'observing' | 'mapping' | 'complete';

  /** Progress through current phase (0-100) */
  progress: number;

  /** Target branch to observe (if specific) */
  targetBranchId?: string;

  /** Branches observed during this mission */
  observedBranches: BranchObservation[];

  /** Total branches mapped */
  branchesMapped: number;

  /** Observation precision (ship-specific, typically 0.9 for probability_scout) */
  observationPrecision: number;

  /** Contamination level (should stay near 0 for scouts) */
  contaminationLevel: number;

  /** Timeline collapse events triggered (ideally 0) */
  collapseEventsTriggered: number;
}

/**
 * Create a probability scout mission
 */
export function createProbabilityScoutMissionComponent(
  shipId: string,
  observationPrecision: number,
  startTick: number,
  targetBranchId?: string
): ProbabilityScoutMissionComponent {
  return {
    type: 'probability_scout_mission',
    version: 1,
    shipId,
    startTick,
    phase: 'scanning',
    progress: 0,
    targetBranchId,
    observedBranches: [],
    branchesMapped: 0,
    observationPrecision,
    contaminationLevel: 0,
    collapseEventsTriggered: 0,
  };
}

/**
 * Record a branch observation
 */
export function recordBranchObservation(
  component: ProbabilityScoutMissionComponent,
  observation: BranchObservation
): void {
  component.observedBranches.push(observation);
  component.branchesMapped++;
}

/**
 * Check if mission is complete
 */
export function isMissionComplete(component: ProbabilityScoutMissionComponent): boolean {
  return component.phase === 'complete';
}
