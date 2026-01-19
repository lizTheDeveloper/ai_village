/**
 * DecisionProtocols.ts - AI Governance decision-making protocols for Phase 6
 *
 * Implements three core protocols for hierarchical political decision-making:
 * 1. Consensus Protocol - For parliaments/councils (village councils, national legislatures)
 * 2. Delegation Protocol - Downward authority (Empire → Nation → Province → City)
 * 3. Escalation Protocol - Upward crisis handling (Province → Nation → Empire → Council)
 *
 * Per 06-POLITICAL-HIERARCHY.md: Political entities span from villages (50-500) to
 * galactic councils (1T+), each tier operating at different time scales with
 * soul agents as persistent leaders.
 *
 * Performance considerations:
 * - Early exit when crisis can be handled locally
 * - Avoid unnecessary LLM calls for routine delegation
 * - Use tier hierarchy for efficient escalation routing
 */

import type { Entity } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';

// ============================================================================
// POLITICAL TIER HIERARCHY
// ============================================================================

/**
 * Political tier levels from village to galactic council
 * Per 06-POLITICAL-HIERARCHY.md Tier Table
 */
export type PoliticalTier =
  | 'village'        // 50-500 pop, Chunk tier, Real-time
  | 'city'           // 500-50K pop, Zone tier, 1 hour/tick
  | 'province'       // 50K-5M pop, Region tier, 1 day/tick
  | 'nation'         // 5M-500M pop, Planet regions, 1 month/tick
  | 'empire'         // 100M-50B pop, Multi-planet, 1 year/tick
  | 'federation'     // 10B-1T pop, Multi-system, 10 years/tick
  | 'galactic_council'; // 1T+ pop, Galaxy-wide, 100 years/tick

/**
 * Tier hierarchy levels for comparison and escalation routing
 * Higher number = higher tier in political hierarchy
 */
const TIER_LEVELS: Record<PoliticalTier, number> = {
  village: 0,
  city: 1,
  province: 2,
  nation: 3,
  empire: 4,
  federation: 5,
  galactic_council: 6,
};

/**
 * Get numeric tier level for comparisons
 * @param tier Political tier
 * @returns Numeric level (0 = village, 6 = galactic_council)
 */
export function tierLevel(tier: PoliticalTier): number {
  return TIER_LEVELS[tier];
}

/**
 * Get next higher political tier for escalation
 * @param tier Current political tier
 * @returns Next higher tier, or undefined if already at galactic_council
 */
export function getNextHigherTier(tier: PoliticalTier): PoliticalTier | undefined {
  const currentLevel = TIER_LEVELS[tier];

  // Find tier with level = currentLevel + 1
  for (const [tierName, level] of Object.entries(TIER_LEVELS)) {
    if (level === currentLevel + 1) {
      return tierName as PoliticalTier;
    }
  }

  return undefined; // Already at highest tier
}

// ============================================================================
// 1. CONSENSUS PROTOCOL (Parliaments/Councils)
// ============================================================================

/**
 * Voting stance on a proposal
 */
export type VoteStance = 'approve' | 'reject' | 'abstain';

/**
 * Vote cast by a council/parliament member
 */
export interface Vote {
  agentId: string;
  stance: VoteStance;
  weight: number;       // Voting power (1.0 for equal votes, can be weighted by population/seniority)
  reasoning: string;    // Why this vote was cast (for LLM-driven votes)
}

/**
 * Proposal under consideration by a governing body
 */
export interface Proposal {
  id: string;
  topic: string;
  description: string;
  proposedBy: string;   // Agent ID of proposer
  proposedTick: number;

  // Options being voted on
  options?: string[];   // For multi-choice proposals (optional)

  // Metadata for LLM context
  context?: Record<string, unknown>;
}

/**
 * Consensus protocol state for ongoing votes
 */
export interface ConsensusProtocol {
  topic: string;
  proposals: Proposal[];
  votes: Map<string, Vote[]>;  // proposalId → votes
  status: 'proposing' | 'debating' | 'voting' | 'decided';
  deadline: number;             // Tick when voting closes
}

/**
 * Result of a consensus vote
 */
export interface VoteResult {
  decision: 'approved' | 'rejected';
  votes: Vote[];
  totalWeight: number;
  approvalWeight: number;
  rejectionWeight: number;
  abstainWeight: number;
  approvalPercentage: number;
}

/**
 * Context for nation-level decisions (placeholder - extend as needed)
 */
export interface NationContext {
  nationId: string;
  nationName: string;
  population: number;
  gdp: number;
  stability: number;
  // Extend with additional context as governance systems develop
}

/**
 * Conduct a vote among parliament/council members
 *
 * This is a core function for democratic decision-making at all tiers:
 * - Village: Elder council votes on proposals
 * - City: City council votes on ordinances
 * - Nation: Parliament votes on national laws
 * - Federation: Federal council votes on treaties
 *
 * Performance:
 * - For rule-based agents: Deterministic voting based on agent traits
 * - For soul agents (LLM): Batched LLM calls for vote reasoning (future optimization)
 *
 * @param parliament Array of agent entities with voting rights
 * @param proposal Proposal being voted on
 * @param context Contextual information for decision-making
 * @param world World instance
 * @returns Vote result with decision and vote breakdown
 */
export async function conductVote(
  parliament: Entity[],
  proposal: Proposal,
  context: NationContext,
  world: World
): Promise<VoteResult> {
  const votes: Vote[] = [];

  // Collect votes from all parliament members
  for (const member of parliament) {
    // TODO: For Phase 6, integrate with soul agent decision-making
    // For now, use simple majority with equal weighting

    // Placeholder vote generation (replace with actual agent decision logic)
    const vote: Vote = {
      agentId: member.id,
      stance: 'approve', // Placeholder - should be based on agent personality/beliefs
      weight: 1.0,       // Equal weighting for now
      reasoning: 'Placeholder vote - integrate with agent decision system',
    };

    votes.push(vote);
  }

  // Tally votes
  const totalWeight = votes.reduce((sum, v) => sum + v.weight, 0);
  const approvalWeight = votes
    .filter(v => v.stance === 'approve')
    .reduce((sum, v) => sum + v.weight, 0);
  const rejectionWeight = votes
    .filter(v => v.stance === 'reject')
    .reduce((sum, v) => sum + v.weight, 0);
  const abstainWeight = votes
    .filter(v => v.stance === 'abstain')
    .reduce((sum, v) => sum + v.weight, 0);

  const approvalPercentage = totalWeight > 0 ? approvalWeight / totalWeight : 0;

  // Simple majority (>50% approval needed)
  const decision: 'approved' | 'rejected' = approvalPercentage > 0.5 ? 'approved' : 'rejected';

  return {
    decision,
    votes,
    totalWeight,
    approvalWeight,
    rejectionWeight,
    abstainWeight,
    approvalPercentage,
  };
}

// ============================================================================
// 2. DELEGATION PROTOCOL (Empire → Nation → Province)
// ============================================================================

/**
 * Delegation chain for downward authority transmission
 */
export interface DelegationChain {
  origin: PoliticalTier;           // Tier issuing the directive
  directive: string;               // What is being commanded/requested
  targetTier: PoliticalTier;       // Tier receiving the directive
  parameters: Record<string, unknown>; // Directive-specific parameters

  // Metadata
  issuedTick: number;
  issuerAgentId?: string;          // Soul agent who issued directive (emperor, president, etc.)
  priority: 'routine' | 'urgent' | 'critical';
  requiresAcknowledgment: boolean;
}

/**
 * Delegate a directive from higher tier to lower tier(s)
 *
 * Examples:
 * - Empire → Nation: "Prepare military for war"
 * - Nation → Province: "Increase agricultural production by 20%"
 * - Province → City: "Build garrison in strategic city"
 *
 * Performance:
 * - No LLM calls for routine directives (handled by rule-based systems)
 * - LLM calls only for complex/unprecedented directives requiring interpretation
 *
 * @param fromGovernor Entity issuing the directive (emperor, king, governor, etc.)
 * @param toEntities Target entities receiving the directive
 * @param directive Delegation chain with directive details
 * @param world World instance
 */
export function delegateDirective(
  fromGovernor: Entity,
  toEntities: Entity[],
  directive: DelegationChain,
  world: World
): void {
  // Validate tier hierarchy (can only delegate downward)
  if (tierLevel(directive.origin) >= tierLevel(directive.targetTier)) {
    throw new Error(
      `Invalid delegation: Cannot delegate from ${directive.origin} to ${directive.targetTier}. ` +
      `Delegation must go to a lower tier.`
    );
  }

  // For each target entity, deliver the directive
  for (const entity of toEntities) {
    receiveDirective(entity, directive, world);
  }

  // TODO: Record directive in governance history for audit trail
  // TODO: Set up acknowledgment tracking if requiresAcknowledgment is true
}

/**
 * Receive and process a directive from a higher tier
 *
 * The receiving governor must:
 * 1. Interpret the directive in local context
 * 2. Decide how to implement it (or delegate further)
 * 3. Update local policies/priorities accordingly
 *
 * @param governor Entity receiving the directive
 * @param directive Delegation chain
 * @param world World instance
 */
export function receiveDirective(
  governor: Entity,
  directive: DelegationChain,
  world: World
): void {
  // TODO: For Phase 6, integrate with agent decision-making
  // Governor should:
  // 1. Parse directive intent
  // 2. Check if it can be handled locally or needs further delegation
  // 3. Update governance component with new priorities
  // 4. Emit event for governance systems to react

  // Placeholder implementation
  // In production, this would update the appropriate governance component
  // (VillageGovernanceComponent, ProvinceGovernanceComponent, etc.)

  console.warn(
    `[DecisionProtocols] Directive received by ${governor.id}: "${directive.directive}" ` +
    `from ${directive.origin} tier. Implementation pending.`
  );
}

// ============================================================================
// 3. ESCALATION PROTOCOL (Province → Nation → Empire → Council)
// ============================================================================

/**
 * Crisis types that may require escalation
 */
export type CrisisType =
  | 'military_attack'        // External military threat
  | 'rebellion'              // Internal uprising
  | 'famine'                 // Food shortage threatening population
  | 'plague'                 // Disease outbreak
  | 'natural_disaster'       // Earthquake, flood, etc.
  | 'economic_collapse'      // Economic crisis
  | 'diplomatic_incident'    // International incident
  | 'technology_threat'      // Dangerous technology (AI, bioweapon, etc.)
  | 'species_extinction'     // Extinction-level event
  | 'cosmic_threat';         // Galactic-scale threat (stellar event, alien invasion, etc.)

/**
 * Crisis state requiring decision-making
 */
export interface Crisis {
  id: string;
  type: CrisisType;
  description: string;

  severity: number;          // 0-1 (how serious is this crisis?)
  scope: PoliticalTier;      // Which tier is currently handling it

  // Location/affected entities
  affectedEntityIds: string[];
  epicenterLocation?: { x: number; y: number; z?: number };

  // Timeline
  detectedTick: number;
  escalatedTick?: number;
  resolvedTick?: number;

  // Impact metrics
  populationAffected: number;
  economicImpact?: number;
  casualtyCount?: number;

  status: 'active' | 'escalated' | 'resolved' | 'catastrophic';
}

/**
 * Escalation trigger rules
 * Defines when a crisis must be escalated to a higher political tier
 */
export interface EscalationTrigger {
  type: CrisisType;
  severity: number;          // Minimum severity to trigger escalation
  requiresTier: PoliticalTier; // Minimum tier needed to handle
  description: string;
}

/**
 * Escalation rules for different crisis types
 *
 * Per 06-POLITICAL-HIERARCHY.md:
 * - Villages handle local issues (food shortages, small disputes)
 * - Cities handle district-level crises (crime waves, infrastructure)
 * - Provinces handle regional crises (economic downturns, epidemics)
 * - Nations handle national crises (wars, major disasters)
 * - Empires handle multi-planet crises (interplanetary conflicts)
 * - Federations/Councils handle galactic threats (species extinction, cosmic events)
 */
export const ESCALATION_RULES: EscalationTrigger[] = [
  // Military threats
  {
    type: 'military_attack',
    severity: 0.3,
    requiresTier: 'city',
    description: 'Minor skirmish - city militia can handle',
  },
  {
    type: 'military_attack',
    severity: 0.6,
    requiresTier: 'province',
    description: 'Organized raid - provincial forces needed',
  },
  {
    type: 'military_attack',
    severity: 0.8,
    requiresTier: 'nation',
    description: 'Invasion force - national military mobilization required',
  },
  {
    type: 'military_attack',
    severity: 0.95,
    requiresTier: 'empire',
    description: 'Multi-planet assault - imperial fleet deployment needed',
  },

  // Internal stability
  {
    type: 'rebellion',
    severity: 0.5,
    requiresTier: 'city',
    description: 'Local unrest - city peacekeeping',
  },
  {
    type: 'rebellion',
    severity: 0.7,
    requiresTier: 'province',
    description: 'Regional uprising - provincial intervention',
  },
  {
    type: 'rebellion',
    severity: 0.9,
    requiresTier: 'nation',
    description: 'Civil war - national crisis',
  },

  // Food/resource crises
  {
    type: 'famine',
    severity: 0.4,
    requiresTier: 'city',
    description: 'Local food shortage - city emergency reserves',
  },
  {
    type: 'famine',
    severity: 0.7,
    requiresTier: 'province',
    description: 'Regional famine - provincial aid coordination',
  },
  {
    type: 'famine',
    severity: 0.85,
    requiresTier: 'nation',
    description: 'National food crisis - nationwide rationing',
  },

  // Disease outbreaks
  {
    type: 'plague',
    severity: 0.5,
    requiresTier: 'city',
    description: 'Local outbreak - city quarantine',
  },
  {
    type: 'plague',
    severity: 0.75,
    requiresTier: 'province',
    description: 'Epidemic - provincial health emergency',
  },
  {
    type: 'plague',
    severity: 0.9,
    requiresTier: 'nation',
    description: 'Pandemic - national health crisis',
  },
  {
    type: 'plague',
    severity: 0.98,
    requiresTier: 'empire',
    description: 'Multi-planet pandemic - imperial medical response',
  },

  // Natural disasters
  {
    type: 'natural_disaster',
    severity: 0.6,
    requiresTier: 'province',
    description: 'Regional disaster - provincial emergency services',
  },
  {
    type: 'natural_disaster',
    severity: 0.85,
    requiresTier: 'nation',
    description: 'National disaster - nationwide emergency response',
  },

  // Economic crises
  {
    type: 'economic_collapse',
    severity: 0.7,
    requiresTier: 'province',
    description: 'Regional recession - provincial economic intervention',
  },
  {
    type: 'economic_collapse',
    severity: 0.85,
    requiresTier: 'nation',
    description: 'National economic crisis - central bank intervention',
  },
  {
    type: 'economic_collapse',
    severity: 0.95,
    requiresTier: 'empire',
    description: 'Imperial economic collapse - imperial treasury intervention',
  },

  // Diplomatic incidents
  {
    type: 'diplomatic_incident',
    severity: 0.6,
    requiresTier: 'nation',
    description: 'International incident - national diplomacy required',
  },
  {
    type: 'diplomatic_incident',
    severity: 0.85,
    requiresTier: 'empire',
    description: 'Imperial diplomatic crisis - emperor-level negotiation',
  },
  {
    type: 'diplomatic_incident',
    severity: 0.95,
    requiresTier: 'federation',
    description: 'Inter-empire conflict - federal mediation needed',
  },

  // Existential threats
  {
    type: 'technology_threat',
    severity: 0.9,
    requiresTier: 'empire',
    description: 'Dangerous technology - imperial oversight required',
  },
  {
    type: 'technology_threat',
    severity: 0.98,
    requiresTier: 'galactic_council',
    description: 'Existential tech threat - galactic regulation needed',
  },
  {
    type: 'species_extinction',
    severity: 0.95,
    requiresTier: 'empire',
    description: 'Species under threat - imperial conservation effort',
  },
  {
    type: 'species_extinction',
    severity: 1.0,
    requiresTier: 'galactic_council',
    description: 'Mass extinction event - galactic council intervention',
  },
  {
    type: 'cosmic_threat',
    severity: 0.99,
    requiresTier: 'federation',
    description: 'Stellar-scale threat - federal coordination',
  },
  {
    type: 'cosmic_threat',
    severity: 1.0,
    requiresTier: 'galactic_council',
    description: 'Galaxy-ending threat - galactic council emergency session',
  },
];

/**
 * Determine if a crisis should be escalated to a higher tier
 *
 * Performance optimization: Early exit for crises that can be handled locally
 *
 * @param crisis Crisis being evaluated
 * @param currentTier Current tier handling the crisis
 * @returns True if crisis should be escalated
 */
export function shouldEscalate(crisis: Crisis, currentTier: PoliticalTier): boolean {
  // Find matching escalation rules for this crisis type and severity
  const matchingRules = ESCALATION_RULES
    .filter(rule => rule.type === crisis.type && crisis.severity >= rule.severity)
    .sort((a, b) => b.severity - a.severity); // Sort by severity descending

  if (matchingRules.length === 0) {
    // No escalation rules apply - can be handled locally
    return false;
  }

  // Get highest severity rule that applies
  const highestRule = matchingRules[0];
  if (!highestRule) {
    throw new Error(`No escalation rule found for crisis type ${crisis.type} with severity ${crisis.severity}`);
  }

  const requiredTierLevel = tierLevel(highestRule.requiresTier);
  const currentTierLevel = tierLevel(currentTier);

  // Escalate if current tier is insufficient
  return currentTierLevel < requiredTierLevel;
}

/**
 * Escalate a crisis to the next higher political tier
 *
 * This function:
 * 1. Determines if escalation is needed (early exit if not)
 * 2. Finds appropriate higher tier
 * 3. Transfers crisis ownership
 * 4. Notifies higher tier governor (soul agent)
 *
 * Performance:
 * - Early exit if crisis can be handled locally (avoids unnecessary escalation)
 * - No LLM calls for routine escalations (handled by notification system)
 * - LLM calls only when higher-tier governor needs to make decisions
 *
 * @param crisis Crisis to potentially escalate
 * @param currentTier Current tier handling the crisis
 * @param world World instance
 */
export function escalateCrisis(
  crisis: Crisis,
  currentTier: PoliticalTier,
  world: World
): void {
  // Performance: Early exit if escalation not needed
  if (!shouldEscalate(crisis, currentTier)) {
    return;
  }

  // Find next higher tier
  const nextTier = getNextHigherTier(currentTier);
  if (!nextTier) {
    // Already at highest tier - cannot escalate further
    console.error(
      `[DecisionProtocols] Crisis ${crisis.id} (${crisis.type}) cannot be escalated - ` +
      `already at highest tier (${currentTier})`
    );

    // Mark as catastrophic if it needs escalation but can't
    crisis.status = 'catastrophic';
    return;
  }

  // Update crisis state
  crisis.scope = nextTier;
  crisis.escalatedTick = world.tick;
  crisis.status = 'escalated';

  // TODO: For Phase 6, integrate with governance systems
  // 1. Find entity with governance component at nextTier level
  // 2. Update that entity's crisis queue
  // 3. Notify governor (soul agent) of new crisis
  // 4. Emit event for systems to react (e.g., mobilize resources)

  console.warn(
    `[DecisionProtocols] Crisis ${crisis.id} (${crisis.type}) escalated from ` +
    `${currentTier} to ${nextTier} tier. Severity: ${crisis.severity.toFixed(2)}`
  );

  // TODO: Emit escalation event for other systems to react
  // Temporarily disabled until 'governance:crisis_escalated' is added to EventMap
  // world.eventBus.emit('governance:crisis_escalated', {
  //   crisisId: crisis.id,
  //   crisisType: crisis.type,
  //   fromTier: currentTier,
  //   toTier: nextTier,
  //   severity: crisis.severity,
  //   affectedEntityIds: crisis.affectedEntityIds,
  // });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get tier name for display purposes
 */
export function getTierDisplayName(tier: PoliticalTier): string {
  const names: Record<PoliticalTier, string> = {
    village: 'Village',
    city: 'City',
    province: 'Province',
    nation: 'Nation',
    empire: 'Empire',
    federation: 'Federation',
    galactic_council: 'Galactic Council',
  };
  return names[tier];
}

/**
 * Get all tiers in escalation order (lowest to highest)
 */
export function getAllTiersOrdered(): PoliticalTier[] {
  return Object.entries(TIER_LEVELS)
    .sort(([, a], [, b]) => a - b)
    .map(([tier]) => tier as PoliticalTier);
}

/**
 * Check if one tier is higher than another
 */
export function isTierHigherThan(tier1: PoliticalTier, tier2: PoliticalTier): boolean {
  return tierLevel(tier1) > tierLevel(tier2);
}
