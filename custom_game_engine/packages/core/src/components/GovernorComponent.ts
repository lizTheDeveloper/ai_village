/**
 * GovernorComponent - AI-powered political decision making
 *
 * Phase 6 (AI Governance): LLM agents govern political entities at each tier
 * of the grand strategy system, making context-appropriate decisions that
 * cascade down through the hierarchy.
 *
 * Integration Points:
 * - MayorNegotiator (Tier 1): Existing city-level LLM governance
 * - LLMScheduler: All governor decisions go through existing queue/rate limiting
 * - Soul Agents (Cross-Tier): Governors can be soul agents (persistent personalities)
 * - CivilizationContext: Extends existing context builder for higher tiers
 *
 * Tiers:
 * - galactic_council: Multi-species assembly (1 call/hour)
 * - empire: Grand strategy (5 calls/hour)
 * - nation: Policy & war (10 calls/hour)
 * - province: Trade & construction (20 calls/hour, existing MayorNegotiator)
 * - village: No LLM (rule-based consensus)
 */

import type { Component } from '../ecs/Component.js';

export type PoliticalTier = 'galactic_council' | 'empire' | 'nation' | 'province' | 'village';
export type GovernmentType = 'monarchy' | 'democracy' | 'oligarchy' | 'council';

/**
 * Record of a governor's decision
 */
export interface GovernorDecision {
  tick: number;
  decisionType: string;
  context: string;
  outcome: 'pending' | 'success' | 'failure' | 'mixed';
  popularityImpact: number; // -1 to 1
}

/**
 * Political ideology axes (for personality consistency)
 */
export interface PoliticalIdeology {
  economic: number; // -1 (communist) to 1 (capitalist)
  social: number; // -1 (authoritarian) to 1 (libertarian)
  foreign: number; // -1 (isolationist) to 1 (interventionist)
}

/**
 * GovernorComponent marks an entity as a political governor with LLM-powered decision making.
 *
 * Governors make policy decisions for groups and delegate execution to subordinates.
 * They operate at different political tiers with tier-appropriate LLM budgets.
 */
export interface GovernorComponent extends Component {
  type: 'governor';
  version: 1;

  // Identity
  tier: PoliticalTier;
  jurisdiction: string; // empire ID, nation ID, city ID, etc.

  // Government Type
  governmentType: GovernmentType;
  termLength?: number; // Ticks until re-election (if democracy)
  termStartTick: number;

  // Performance Metrics
  approvalRating: number; // 0-1
  decisions: GovernorDecision[];

  // LLM Integration
  llmProvider: string;
  llmModel: string;
  decisionCooldown: number; // Min ticks between LLM calls
  lastDecisionTick: number;

  // Political Ideology (for personality consistency)
  ideology: PoliticalIdeology;

  // Constituency Relations
  constituencyApproval: Record<string, number>; // constituency ID → approval 0-1
}

/**
 * Default decision cooldowns by tier (in ticks at 20 TPS)
 */
export const TIER_COOLDOWNS: Record<PoliticalTier, number> = {
  galactic_council: 72000, // 1 hour (3600 seconds * 20 TPS)
  empire: 36000, // 30 minutes
  nation: 12000, // 10 minutes
  province: 6000, // 5 minutes
  village: 0, // No LLM
};

/**
 * Default LLM models by tier
 */
export const TIER_MODELS: Record<PoliticalTier, string> = {
  galactic_council: 'claude-3-5-sonnet-20241022', // Highest quality
  empire: 'claude-3-5-sonnet-20241022',
  nation: 'claude-3-5-haiku-20241022', // Faster, cheaper
  province: 'claude-3-5-haiku-20241022',
  village: 'none', // No LLM
};

/**
 * Create a new GovernorComponent with sensible defaults per tier.
 *
 * @param tier - Political tier (galactic_council, empire, nation, province, village)
 * @param jurisdiction - ID of the political entity being governed
 * @param governmentType - Type of government (monarchy, democracy, oligarchy, council)
 * @param currentTick - Current game tick (for termStartTick)
 * @returns GovernorComponent with tier-appropriate defaults
 */
export function createGovernorComponent(
  tier: PoliticalTier,
  jurisdiction: string,
  governmentType: GovernmentType,
  currentTick: number = 0
): GovernorComponent {
  // Term lengths vary by tier (in ticks at 20 TPS)
  const termLengths: Record<PoliticalTier, number | undefined> = {
    galactic_council: 1_440_000, // 20 game hours
    empire: 720_000, // 10 game hours
    nation: 288_000, // 4 game hours (if democracy)
    province: 144_000, // 2 game hours (if democracy)
    village: undefined, // No formal terms
  };

  // Default ideology: centrist/balanced
  const defaultIdeology: PoliticalIdeology = {
    economic: 0,
    social: 0,
    foreign: 0,
  };

  return {
    type: 'governor',
    version: 1,
    tier,
    jurisdiction,
    governmentType,
    termLength: governmentType === 'democracy' ? termLengths[tier] : undefined,
    termStartTick: currentTick,
    approvalRating: 0.5, // Start neutral
    decisions: [],
    llmProvider: 'anthropic',
    llmModel: TIER_MODELS[tier],
    decisionCooldown: TIER_COOLDOWNS[tier],
    lastDecisionTick: 0,
    ideology: { ...defaultIdeology },
    constituencyApproval: {},
  };
}

/**
 * Record a decision made by the governor.
 *
 * @param governor - GovernorComponent to update
 * @param decisionType - Type of decision made
 * @param context - Context/reasoning for the decision
 * @param currentTick - Current game tick
 */
export function recordDecision(
  governor: GovernorComponent,
  decisionType: string,
  context: string,
  currentTick: number
): void {
  const decision: GovernorDecision = {
    tick: currentTick,
    decisionType,
    context,
    outcome: 'pending',
    popularityImpact: 0,
  };

  governor.decisions.push(decision);
  governor.lastDecisionTick = currentTick;

  // Keep decision history reasonable (max 100 decisions)
  if (governor.decisions.length > 100) {
    governor.decisions.shift();
  }
}

/**
 * Update a decision's outcome and popularity impact.
 *
 * @param governor - GovernorComponent to update
 * @param decisionIndex - Index of the decision to update
 * @param outcome - Outcome of the decision
 * @param popularityImpact - Impact on popularity (-1 to 1)
 */
export function updateDecisionOutcome(
  governor: GovernorComponent,
  decisionIndex: number,
  outcome: 'success' | 'failure' | 'mixed',
  popularityImpact: number
): void {
  if (decisionIndex < 0 || decisionIndex >= governor.decisions.length) {
    throw new Error(`Invalid decision index: ${decisionIndex}`);
  }

  if (popularityImpact < -1 || popularityImpact > 1) {
    throw new Error(`Popularity impact must be between -1 and 1, got ${popularityImpact}`);
  }

  const decision = governor.decisions[decisionIndex]!;
  decision.outcome = outcome;
  decision.popularityImpact = popularityImpact;

  // Update overall approval rating
  updateApproval(governor, popularityImpact);
}

/**
 * Update governor's approval rating.
 *
 * @param governor - GovernorComponent to update
 * @param delta - Change in approval (-1 to 1)
 */
export function updateApproval(governor: GovernorComponent, delta: number): void {
  if (delta < -1 || delta > 1) {
    throw new Error(`Approval delta must be between -1 and 1, got ${delta}`);
  }

  // Dampen approval changes (50% weight to new change)
  governor.approvalRating += delta * 0.5;

  // Clamp to [0, 1]
  governor.approvalRating = Math.max(0, Math.min(1, governor.approvalRating));
}

/**
 * Update approval rating for a specific constituency.
 *
 * @param governor - GovernorComponent to update
 * @param constituencyId - ID of the constituency
 * @param delta - Change in approval (-1 to 1)
 */
export function updateConstituencyApproval(
  governor: GovernorComponent,
  constituencyId: string,
  delta: number
): void {
  if (delta < -1 || delta > 1) {
    throw new Error(`Approval delta must be between -1 and 1, got ${delta}`);
  }

  const currentApproval = governor.constituencyApproval[constituencyId] ?? 0.5;
  const newApproval = currentApproval + delta * 0.5;

  governor.constituencyApproval[constituencyId] = Math.max(0, Math.min(1, newApproval));
}

/**
 * Check if governor can make a decision (cooldown expired).
 *
 * @param governor - GovernorComponent to check
 * @param currentTick - Current game tick
 * @returns True if cooldown expired
 */
export function canMakeDecision(governor: GovernorComponent, currentTick: number): boolean {
  return currentTick - governor.lastDecisionTick >= governor.decisionCooldown;
}

/**
 * Check if governor's term has expired (for democracies).
 *
 * @param governor - GovernorComponent to check
 * @param currentTick - Current game tick
 * @returns True if term expired
 */
export function isTermExpired(governor: GovernorComponent, currentTick: number): boolean {
  if (governor.governmentType !== 'democracy' || !governor.termLength) {
    return false;
  }

  return currentTick - governor.termStartTick >= governor.termLength;
}

/**
 * Get the most recent decision.
 *
 * @param governor - GovernorComponent to query
 * @returns Most recent decision, or undefined if none
 */
export function getRecentDecision(governor: GovernorComponent): GovernorDecision | undefined {
  if (governor.decisions.length === 0) {
    return undefined;
  }

  return governor.decisions[governor.decisions.length - 1];
}

/**
 * Get decisions by outcome.
 *
 * @param governor - GovernorComponent to query
 * @param outcome - Outcome filter
 * @returns Decisions matching the outcome
 */
export function getDecisionsByOutcome(
  governor: GovernorComponent,
  outcome: 'pending' | 'success' | 'failure' | 'mixed'
): GovernorDecision[] {
  return governor.decisions.filter(d => d.outcome === outcome);
}

/**
 * Calculate average popularity impact of decisions.
 *
 * @param governor - GovernorComponent to analyze
 * @returns Average popularity impact, or 0 if no completed decisions
 */
export function getAveragePopularityImpact(governor: GovernorComponent): number {
  const completedDecisions = governor.decisions.filter(d => d.outcome !== 'pending');

  if (completedDecisions.length === 0) {
    return 0;
  }

  const totalImpact = completedDecisions.reduce((sum, d) => sum + d.popularityImpact, 0);
  return totalImpact / completedDecisions.length;
}
