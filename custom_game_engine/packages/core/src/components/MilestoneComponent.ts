/**
 * MilestoneComponent - Tracks player progression milestones
 *
 * Milestones are significant achievements that unlock features or trigger events.
 * Unlike achievements (which are cosmetic), milestones have gameplay implications.
 *
 * Key milestones for angel bifurcation:
 * - first_temporal_trade: First trade with your own past (forked timeline)
 * - first_cross_universe_trade: First trade with another universe
 * - post_temporal_multiversal: Both above + bond threshold with angel
 */

import type { Component } from '../ecs/Component.js';

// ============================================================================
// Milestone Types
// ============================================================================

export type MilestoneId =
  // Trade milestones
  | 'first_local_trade'
  | 'first_inter_village_trade'
  | 'first_temporal_trade'        // Trade with own past
  | 'first_cross_universe_trade'  // Trade with another universe
  | 'first_cross_multiverse_trade'// Trade with foreign multiverse
  // Progression milestones
  | 'post_temporal_multiversal'   // Unlocks angel bifurcation
  // Social milestones
  | 'angel_bond_formed'           // Deep relationship with admin angel
  | 'first_agent_death_witnessed'
  | 'first_building_completed'
  // Tech milestones
  | 'first_research_completed'
  | 'first_magic_learned'
  | 'first_spaceship_launched'
  // Secret milestones (hidden until achieved)
  | 'the_revelation';              // Saw the populated multiverse

export interface MilestoneRecord {
  id: MilestoneId;
  achievedAt: number;         // Tick when achieved
  achievedAtDate: string;     // ISO timestamp
  context?: Record<string, unknown>; // Optional context (e.g., trade partner)
}

// ============================================================================
// Component Definition
// ============================================================================

export interface MilestoneComponent extends Component {
  type: 'milestone';
  version: number;

  /** Achieved milestones */
  achieved: MilestoneRecord[];

  /** Progress toward incomplete milestones */
  progress: Record<string, number>;

  /** Total playtime in ticks */
  totalPlaytimeTicks: number;

  /** Session count */
  sessionCount: number;

  /** First session start tick */
  firstSessionTick: number;
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createMilestoneComponent(): MilestoneComponent {
  return {
    type: 'milestone',
    version: 1,
    achieved: [],
    progress: {},
    totalPlaytimeTicks: 0,
    sessionCount: 1,
    firstSessionTick: 0,
  };
}

/**
 * Check if a milestone has been achieved
 */
export function hasMilestone(
  component: MilestoneComponent,
  milestoneId: MilestoneId
): boolean {
  return component.achieved.some(m => m.id === milestoneId);
}

/**
 * Award a milestone (if not already achieved)
 */
export function awardMilestone(
  component: MilestoneComponent,
  milestoneId: MilestoneId,
  tick: number,
  context?: Record<string, unknown>
): boolean {
  if (hasMilestone(component, milestoneId)) {
    return false; // Already achieved
  }

  component.achieved.push({
    id: milestoneId,
    achievedAt: tick,
    achievedAtDate: new Date().toISOString(),
    context,
  });

  return true;
}

/**
 * Update progress toward a milestone
 */
export function updateMilestoneProgress(
  component: MilestoneComponent,
  milestoneId: string,
  progress: number
): void {
  component.progress[milestoneId] = progress;
}

/**
 * Get milestone progress
 */
export function getMilestoneProgress(
  component: MilestoneComponent,
  milestoneId: string
): number {
  return component.progress[milestoneId] ?? 0;
}

/**
 * Check if player qualifies for post-temporal multiversal status
 */
export function checkPostTemporalStatus(
  component: MilestoneComponent,
  angelBondHours: number,
  angelMessageCount: number
): { qualified: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!hasMilestone(component, 'first_temporal_trade')) {
    missing.push('temporal_trade');
  }
  if (!hasMilestone(component, 'first_cross_universe_trade')) {
    missing.push('cross_universe_trade');
  }

  // Bond threshold: 40+ hours OR 500+ messages
  const bondHoursOk = angelBondHours >= 40;
  const bondMessagesOk = angelMessageCount >= 500;
  if (!bondHoursOk && !bondMessagesOk) {
    missing.push('angel_bond');
  }

  return {
    qualified: missing.length === 0,
    missing,
  };
}
