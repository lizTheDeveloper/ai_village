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
import type {
  GovernanceHistoryComponent,
  GovernanceAuditEntry,
  GovernanceAuditQuery,
} from '../components/GovernanceHistoryComponent.js';
import {
  addGovernanceAuditEntry,
  queryGovernanceHistory as queryGovernanceHistoryInternal,
} from '../components/GovernanceHistoryComponent.js';
import { v4 as uuidv4 } from 'uuid';
import type { NationContext } from './GovernorContextBuilders.js';
import {
  requestGovernorVote,
  requestGovernorDirectiveInterpretation,
  requestGovernorCrisisResponse,
  generateFallbackVote,
  executeDirectiveInterpretation,
  findGovernorAtTier,
  addCrisisToGovernorQueue,
} from './GovernorLLMIntegration.js';

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
  world: World,
  tier: PoliticalTier = 'nation'
): Promise<VoteResult> {
  const votes: Vote[] = [];

  // Collect votes from all parliament members
  for (const member of parliament) {
    let vote: Vote;

    // Check if member is a soul agent (has soul component)
    const soulComponent = member.components?.get('soul');
    const isSoulAgent = soulComponent !== undefined && soulComponent !== null;

    if (isSoulAgent) {
      // LLM-powered voting for soul agents
      try {
        const voteDecision = await requestGovernorVote(member, proposal, context, world);
        vote = {
          agentId: member.id,
          stance: voteDecision.stance,
          weight: voteDecision.weight ?? 1.0,
          reasoning: voteDecision.reasoning,
        };
      } catch (error) {
        // Fallback to rule-based voting if LLM unavailable
        console.warn(
          `[DecisionProtocols] LLM voting failed for ${member.id}, using fallback: ${error}`
        );
        vote = generateFallbackVote(member, proposal, context);
      }
    } else {
      // Rule-based voting for non-soul agents
      vote = generateFallbackVote(member, proposal, context);
    }

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

  // Record vote conclusion in governance history
  recordVoteConcluded(proposal, decision, votes, approvalPercentage, tier, world);

  // Execute vote outcome (modify game state)
  if (decision === 'approved') {
    executeVoteOutcome(proposal, context, tier, world);
  }

  // Emit event for vote concluded
  world.eventBus.emit({
    type: 'governance:vote_concluded',
    source: context.nation.name,
    data: {
      proposalId: proposal.id,
      tier,
      decision,
      approvalPercentage,
      totalVotes: votes.length,
      tick: world.tick,
    },
  });

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

/**
 * Execute vote outcome - modify game state based on approved proposal
 *
 * This function interprets the proposal topic and parameters to modify
 * the appropriate component (Nation, Province, etc.)
 */
function executeVoteOutcome(
  proposal: Proposal,
  context: NationContext,
  tier: PoliticalTier,
  world: World
): void {
  // Parse proposal topic to determine what action to take
  const topic = proposal.topic.toLowerCase();
  const nationEntity = world
    .query()
    .with('nation')
    .executeEntities()
    .find((e) => {
      const n = e.getComponent('nation');
      return n && (n as any).nationName === context.nation.name;
    });

  if (!nationEntity) {
    console.warn(`[DecisionProtocols] Nation entity not found for ${context.nation.name}`);
    return;
  }

  // Route to appropriate handler based on topic
  if (topic.includes('tax') || topic.includes('taxation')) {
    executeVoteTaxPolicy(nationEntity, proposal, context, world);
  } else if (topic.includes('research') || topic.includes('technology')) {
    executeVoteResearchPolicy(nationEntity, proposal, context, world);
  } else if (topic.includes('military') || topic.includes('defense')) {
    executeVoteMilitaryPolicy(nationEntity, proposal, context, world);
  } else if (topic.includes('law') || topic.includes('legislation')) {
    executeVoteLaw(nationEntity, proposal, context, world);
  } else if (topic.includes('budget') || topic.includes('spending')) {
    executeVoteBudget(nationEntity, proposal, context, world);
  } else {
    // Generic policy enactment
    executeVoteGenericPolicy(nationEntity, proposal, context, world);
  }
}

/**
 * Execute: Parliament votes to change tax policy
 */
function executeVoteTaxPolicy(
  nationEntity: any,
  proposal: Proposal,
  context: NationContext,
  world: World
): void {
  const taxLevel = proposal.context?.taxLevel as 'low' | 'moderate' | 'high';
  if (!taxLevel) {
    console.warn('[DecisionProtocols] Tax vote lacks taxLevel parameter');
    return;
  }

  nationEntity.updateComponent('nation', (current: any) => ({
    ...current,
    economy: {
      ...current.economy,
      taxPolicy: taxLevel,
    },
  }));

  const nation = nationEntity.getComponent('nation') as any;
  const oldRate = nation.economy.taxPolicy === 'low' ? 0.1 : nation.economy.taxPolicy === 'moderate' ? 0.2 : 0.3;
  const newRate = taxLevel === 'low' ? 0.1 : taxLevel === 'moderate' ? 0.2 : 0.3;

  world.eventBus.emit({
    type: 'nation:tax_rate_changed',
    source: nationEntity.id,
    data: {
      nationId: nationEntity.id,
      nationName: context.nation.name,
      oldTaxRate: oldRate,
      newTaxRate: newRate,
      tick: world.tick,
    },
  });
}

/**
 * Execute: Parliament votes to prioritize research
 */
function executeVoteResearchPolicy(
  nationEntity: any,
  proposal: Proposal,
  context: NationContext,
  world: World
): void {
  const field = proposal.context?.field as 'military' | 'economic' | 'cultural' | 'scientific';
  if (!field) {
    console.warn('[DecisionProtocols] Research vote lacks field parameter');
    return;
  }

  nationEntity.updateComponent('nation', (current: any) => ({
    ...current,
    economy: {
      ...current.economy,
      researchBudget: current.economy.researchBudget * 1.2,
    },
  }));

  world.eventBus.emit({
    type: 'nation:research_prioritized',
    source: nationEntity.id,
    data: {
      nationId: nationEntity.id,
      nationName: context.nation.name,
      field,
      priority: 1,
      tick: world.tick,
    },
  });
}

/**
 * Execute: Parliament votes on military policy
 */
function executeVoteMilitaryPolicy(
  nationEntity: any,
  proposal: Proposal,
  context: NationContext,
  world: World
): void {
  const mobilization = proposal.context?.mobilization as 'peacetime' | 'partial' | 'full';
  if (!mobilization) {
    console.warn('[DecisionProtocols] Military vote lacks mobilization parameter');
    return;
  }

  nationEntity.updateComponent('nation', (current: any) => ({
    ...current,
    military: {
      ...current.military,
      mobilization,
    },
  }));
}

/**
 * Execute: Parliament enacts new law
 */
function executeVoteLaw(
  nationEntity: any,
  proposal: Proposal,
  context: NationContext,
  world: World
): void {
  const law = {
    id: proposal.id,
    name: proposal.topic,
    description: proposal.description,
    scope: proposal.context?.scope as 'military' | 'economic' | 'social' | 'foreign_policy' ?? 'economic',
    enactedTick: world.tick,
    enactedBy: proposal.proposedBy,
    effects: proposal.context?.effects as any[] ?? [],
  };

  nationEntity.updateComponent('nation', (current: any) => ({
    ...current,
    laws: [...current.laws, law],
  }));
}

/**
 * Execute: Parliament allocates budget
 */
function executeVoteBudget(
  nationEntity: any,
  proposal: Proposal,
  context: NationContext,
  world: World
): void {
  const budgetCategory = proposal.context?.category as 'military' | 'infrastructure' | 'education' | 'healthcare' | 'research';
  const amount = proposal.context?.amount as number;

  if (!budgetCategory || !amount) {
    console.warn('[DecisionProtocols] Budget vote lacks category or amount parameter');
    return;
  }

  nationEntity.updateComponent('nation', (current: any) => {
    const updated = { ...current };
    const budgetField = `${budgetCategory}Budget` as keyof typeof current.economy;

    if (budgetField in updated.economy) {
      updated.economy = {
        ...updated.economy,
        [budgetField]: amount,
      };
    }

    return updated;
  });
}

/**
 * Execute: Generic policy enactment
 */
function executeVoteGenericPolicy(
  nationEntity: any,
  proposal: Proposal,
  context: NationContext,
  world: World
): void {
  const policy = {
    id: proposal.id,
    name: proposal.topic,
    category: proposal.context?.category as 'military' | 'economic' | 'diplomatic' | 'cultural' | 'research' ?? 'economic',
    priority: proposal.context?.priority as 'low' | 'medium' | 'high' | 'critical' ?? 'medium',
    description: proposal.description,
    budgetAllocation: proposal.context?.budgetAllocation as number ?? 0.1,
    progress: 0,
    startTick: world.tick,
  };

  nationEntity.updateComponent('nation', (current: any) => ({
    ...current,
    policies: [...current.policies, policy],
  }));

  world.eventBus.emit({
    type: 'nation:policy_enacted',
    source: nationEntity.id,
    data: {
      nationId: nationEntity.id,
      nationName: context.nation.name,
      policyName: policy.name,
      category: policy.category,
      tick: world.tick,
    },
  });
}

// ============================================================================
// 2. DELEGATION PROTOCOL (Empire → Nation → Province)
// ============================================================================

/**
 * Delegation chain for downward authority transmission
 */
export interface DelegationChain {
  id?: string;                     // Unique directive ID (auto-generated if not provided)
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

  // Ensure directive has an ID
  if (!directive.id) {
    directive.id = `directive-${uuidv4()}`;
  }

  // For each target entity, deliver the directive (async, non-blocking)
  for (const entity of toEntities) {
    receiveDirective(entity, directive, world).catch(error => {
      console.error(
        `[DecisionProtocols] Error processing directive ${directive.id} for entity ${entity.id}: ${error}`
      );
    });
  }

  // Record directive in governance history for audit trail
  recordDirectiveIssued(fromGovernor, toEntities, directive, world);

  // Set up acknowledgment tracking if requiresAcknowledgment is true
  if (directive.requiresAcknowledgment) {
    // TODO: Create acknowledgment tracking component/system in future phase
    // For now, just log the requirement
    console.warn(
      `[DecisionProtocols] Directive ${directive.id} requires acknowledgment from ${toEntities.length} entities. ` +
      `Acknowledgment tracking not yet implemented.`
    );
  }

  // Emit event for directive issued
  world.eventBus.emit({
    type: 'governance:directive_issued',
    source: fromGovernor.id,
    data: {
      directiveId: directive.id,
      originTier: directive.origin,
      targetTier: directive.targetTier,
      directive: directive.directive,
      priority: directive.priority,
      issuerAgentId: directive.issuerAgentId,
      targetEntityIds: toEntities.map(e => e.id),
      requiresAcknowledgment: directive.requiresAcknowledgment,
      tick: world.tick,
    },
  });
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
export async function receiveDirective(
  governor: Entity,
  directive: DelegationChain,
  world: World
): Promise<void> {
  // Record directive receipt in governance history
  recordDirectiveReceived(governor, directive, world);

  // Emit event for directive received
  world.eventBus.emit({
    type: 'governance:directive_received',
    source: governor.id,
    data: {
      directiveId: directive.id || 'unknown',
      entityId: governor.id,
      directive: directive.directive,
      tick: world.tick,
    },
  });

  // Check if governor is a soul agent (has soul component)
  const soulComponent = governor.components?.get('soul');
  const isSoulAgent = soulComponent !== undefined && soulComponent !== null;

  if (isSoulAgent) {
    // LLM-powered directive interpretation for soul agents
    try {
      const interpretation = await requestGovernorDirectiveInterpretation(
        governor,
        directive,
        directive.targetTier,
        world
      );

      // Execute the interpretation
      executeDirectiveInterpretation(governor, directive, interpretation, world);

      // Emit event for directive interpretation
      world.eventBus.emit({
        type: 'governance:directive_interpreted',
        source: governor.id,
        data: {
          directiveId: directive.id || 'unknown',
          action: interpretation.action,
          reasoning: interpretation.reasoning,
          tick: world.tick,
        },
      });
    } catch (error) {
      // Fallback to simple acknowledgment if LLM unavailable
      console.warn(
        `[DecisionProtocols] LLM directive interpretation failed for ${governor.id}, ` +
        `directive will be queued for later processing: ${error}`
      );

      // Emit event indicating LLM fallback
      world.eventBus.emit({
        type: 'governance:directive_llm_failed',
        source: governor.id,
        data: {
          directiveId: directive.id || 'unknown',
          error: String(error),
          tick: world.tick,
        },
      });
    }
  } else {
    // Non-soul agents use simple rule-based implementation
    // This would be handled by the GovernorDecisionSystem for routine directives
    console.log(
      `[DecisionProtocols] Directive ${directive.id || 'unknown'} queued for rule-based ` +
      `processing by ${governor.id}`
    );
  }
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

  // Record crisis escalation in audit trail
  recordCrisisEscalation(crisis, currentTier, nextTier, world);

  // Find governor entity at next tier level
  const higherGovernor = findGovernorAtTier(nextTier, world);

  if (higherGovernor) {
    // Add crisis to governor's queue
    addCrisisToGovernorQueue(higherGovernor, crisis, world);

    // Check if governor is a soul agent
    const soulComponent = higherGovernor.components?.get('soul');
    const isSoulAgent = soulComponent !== undefined && soulComponent !== null;

    if (isSoulAgent) {
      // Request LLM crisis response asynchronously (non-blocking)
      requestGovernorCrisisResponse(higherGovernor, crisis, nextTier, world)
        .then(response => {
          // Log the LLM's recommended response
          console.log(
            `[DecisionProtocols] Governor ${higherGovernor.id} LLM response to crisis ${crisis.id}: ` +
            `${response.action} - ${response.reasoning}`
          );

          // Emit event with LLM response for systems to react
          world.eventBus.emit({
            type: 'governance:crisis_response_received',
            source: higherGovernor.id,
            data: {
              crisisId: crisis.id,
              governorId: higherGovernor.id,
              tier: nextTier,
              action: response.action,
              localMeasures: response.local_measures,
              escalationTarget: response.escalation_target,
              assistanceNeeded: response.assistance_needed,
              reasoning: response.reasoning,
              tick: world.tick,
            },
          });
        })
        .catch(error => {
          console.error(
            `[DecisionProtocols] LLM crisis response failed for governor ${higherGovernor.id}: ${error}`
          );
          // Crisis remains in queue for manual/rule-based handling
        });
    } else {
      console.log(
        `[DecisionProtocols] Crisis ${crisis.id} added to non-soul governor ${higherGovernor.id} queue ` +
        `for rule-based handling`
      );
    }
  } else {
    console.warn(
      `[DecisionProtocols] No governor found at ${nextTier} tier to handle escalated crisis ${crisis.id}`
    );
  }

  console.warn(
    `[DecisionProtocols] Crisis ${crisis.id} (${crisis.type}) escalated from ` +
    `${currentTier} to ${nextTier} tier. Severity: ${crisis.severity.toFixed(2)}`
  );

  // Emit escalation event for other systems to react
  world.eventBus.emit({
    type: 'governance:crisis_escalated',
    source: crisis.id,
    data: {
      crisisId: crisis.id,
      crisisType: crisis.type,
      fromTier: currentTier,
      toTier: nextTier,
      severity: crisis.severity,
      affectedEntityIds: crisis.affectedEntityIds,
      tick: world.tick,
    },
  });
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

// ============================================================================
// GOVERNANCE AUDIT TRAIL
// ============================================================================

/**
 * Get or create governance history component for the world
 *
 * Searches for a singleton governance history entity, creates one if not found
 */
function getOrCreateGovernanceHistory(world: World): GovernanceHistoryComponent {
  // Try to find existing governance history singleton
  const historyEntities = world
    .query()
    .with('governance_history')
    .executeEntities();

  if (historyEntities.length > 0) {
    const entity = historyEntities[0];
    if (!entity) {
      throw new Error('Governance history entity is undefined');
    }
    const component = entity.getComponent('governance_history');
    if (!component) {
      throw new Error('Governance history entity found but component is null');
    }
    return component as GovernanceHistoryComponent;
  }

  // Create new governance history singleton
  const historyComponent: GovernanceHistoryComponent = {
    type: 'governance_history',
    version: 1,
    entries: [],
    maxEntries: 10000,
    archivedCount: 0,
    lastArchivalTick: 0,
    actionTypeIndex: new Map(),
    sourceAgentIndex: new Map(),
    targetAgentIndex: new Map(),
    tickIndex: new Map(),
  };

  const historyEntity = world.createEntity() as any;  // EntityImpl has addComponent
  historyEntity.addComponent(historyComponent);

  // Get the component back from the entity to ensure we have the correct reference
  const finalComponent = historyEntity.getComponent('governance_history');
  if (!finalComponent) {
    throw new Error('Failed to create governance history component');
  }

  return finalComponent as GovernanceHistoryComponent;
}

/**
 * Record a directive being issued in governance history
 */
function recordDirectiveIssued(
  fromGovernor: Entity,
  toEntities: Entity[],
  directive: DelegationChain,
  world: World
): void {
  const history = getOrCreateGovernanceHistory(world);

  const entry: GovernanceAuditEntry = {
    id: `audit-${uuidv4()}`,
    actionType: 'directive_issued',
    tier: directive.origin,
    tick: world.tick,
    sourceAgentId: directive.issuerAgentId || fromGovernor.id,
    targetAgentIds: toEntities.map(e => e.id),
    outcome: 'delegated',
    description: `Directive issued from ${directive.origin} to ${directive.targetTier}: "${directive.directive}"`,
    data: {
      directiveId: directive.id,
      directive: directive.directive,
      originTier: directive.origin,
      targetTier: directive.targetTier,
      priority: directive.priority,
      requiresAcknowledgment: directive.requiresAcknowledgment,
      parameters: directive.parameters,
    },
    tags: [directive.priority, 'delegation'],
  };

  addGovernanceAuditEntry(history, entry);
}

/**
 * Record a directive being received in governance history
 */
function recordDirectiveReceived(
  governor: Entity,
  directive: DelegationChain,
  world: World
): void {
  const history = getOrCreateGovernanceHistory(world);

  const entry: GovernanceAuditEntry = {
    id: `audit-${uuidv4()}`,
    actionType: 'directive_received',
    tier: directive.targetTier,
    tick: world.tick,
    targetEntityId: governor.id,
    outcome: 'pending',
    description: `Directive received by ${getTierDisplayName(directive.targetTier)} entity: "${directive.directive}"`,
    data: {
      directiveId: directive.id,
      directive: directive.directive,
      originTier: directive.origin,
      priority: directive.priority,
    },
    tags: ['delegation', 'received'],
  };

  addGovernanceAuditEntry(history, entry);
}

/**
 * Record a vote conclusion in governance history
 */
function recordVoteConcluded(
  proposal: Proposal,
  decision: 'approved' | 'rejected',
  votes: Vote[],
  approvalPercentage: number,
  tier: PoliticalTier,
  world: World
): void {
  const history = getOrCreateGovernanceHistory(world);

  const entry: GovernanceAuditEntry = {
    id: `audit-${uuidv4()}`,
    actionType: 'vote_concluded',
    tier,
    tick: world.tick,
    sourceAgentId: proposal.proposedBy,
    outcome: decision === 'approved' ? 'approved' : 'rejected',
    description: `Vote on "${proposal.topic}" ${decision} with ${(approvalPercentage * 100).toFixed(1)}% approval`,
    data: {
      proposalId: proposal.id,
      topic: proposal.topic,
      description: proposal.description,
      decision,
      approvalPercentage,
      totalVotes: votes.length,
      votes: votes.map(v => ({
        agentId: v.agentId,
        stance: v.stance,
        weight: v.weight,
      })),
    },
    tags: ['voting', decision],
  };

  addGovernanceAuditEntry(history, entry);
}

/**
 * Record a crisis escalation in governance history
 */
export function recordCrisisEscalation(
  crisis: Crisis,
  fromTier: PoliticalTier,
  toTier: PoliticalTier,
  world: World
): void {
  const history = getOrCreateGovernanceHistory(world);

  const entry: GovernanceAuditEntry = {
    id: `audit-${uuidv4()}`,
    actionType: 'crisis_escalated',
    tier: fromTier,
    tick: world.tick,
    targetEntityId: crisis.id,
    outcome: 'escalated',
    description: `Crisis "${crisis.type}" escalated from ${fromTier} to ${toTier} (severity: ${crisis.severity.toFixed(2)})`,
    data: {
      crisisId: crisis.id,
      crisisType: crisis.type,
      fromTier,
      toTier,
      severity: crisis.severity,
      affectedEntityIds: crisis.affectedEntityIds,
      populationAffected: crisis.populationAffected,
    },
    tags: ['crisis', 'escalation', crisis.type],
  };

  addGovernanceAuditEntry(history, entry);
}

/**
 * Query governance history
 *
 * Convenience function for external systems to query audit history
 */
export function queryGovernanceAuditHistory(
  world: World,
  query: GovernanceAuditQuery
): GovernanceAuditEntry[] {
  const history = getOrCreateGovernanceHistory(world);
  return queryGovernanceHistoryInternal(history, query);
}
