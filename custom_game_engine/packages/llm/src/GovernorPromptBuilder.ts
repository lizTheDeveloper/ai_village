/**
 * GovernorPromptBuilder - LLM prompts for political decision-making
 *
 * Builds prompts for governors at all political tiers:
 * - Village elders voting on proposals
 * - Province governors interpreting national directives
 * - Nation leaders making strategic decisions
 * - Emperors managing vassal nations
 * - Galactic council delegates voting on proposals
 *
 * Each prompt includes:
 * - Governor context (built via GovernorContextBuilders)
 * - Decision type and parameters
 * - Expected response format (JSON)
 * - Fallback guidance if uncertain
 */

import type { Entity, World } from '@ai-village/core';

// Import types - these need to be exported from @ai-village/core governance module
// For now, define locally to avoid circular dependency
import type { Proposal, DelegationChain, Crisis, PoliticalTier } from '../../core/src/governance/DecisionProtocols.js';
import type { NationContext } from '../../core/src/governance/GovernorContextBuilders.js';
import {
  buildProvinceGovernorContext,
  buildNationContext,
  buildEmpireContext,
  buildGalacticCouncilContext,
  buildVillageContext,
  buildCityContext,
} from '../../core/src/governance/GovernorContextBuilders.js';

/**
 * Decision types that governors can make
 */
export type GovernorDecisionType =
  | 'vote_on_proposal'
  | 'interpret_directive'
  | 'respond_to_crisis'
  | 'delegate_authority'
  | 'set_policy';

/**
 * Vote decision response
 */
export interface VoteDecision {
  stance: 'approve' | 'reject' | 'abstain';
  reasoning: string;
  weight?: number; // Optional vote weight override
}

/**
 * Directive interpretation response
 */
export interface DirectiveInterpretation {
  action: 'implement' | 'delegate' | 'negotiate' | 'refuse';
  implementation_plan?: string; // How to implement locally
  delegation_target?: string; // Which lower tier to delegate to
  negotiation_points?: string[]; // Points to negotiate with higher tier
  refusal_reason?: string; // Why refusing (risky!)
  reasoning: string;
}

/**
 * Crisis response decision
 */
export interface CrisisResponse {
  action: 'handle_locally' | 'escalate' | 'request_assistance';
  local_measures?: string[]; // Actions to take locally
  escalation_target?: PoliticalTier; // Which tier to escalate to
  assistance_needed?: string[]; // What help to request
  reasoning: string;
}

/**
 * Policy decision response
 */
export interface PolicyDecision {
  policy: string; // Policy name/type
  parameters: Record<string, unknown>; // Policy parameters
  rationale: string;
  expected_impact: string;
}

/**
 * Governor Prompt Builder
 *
 * Builds LLM prompts for political decision-making across all tiers
 */
export class GovernorPromptBuilder {
  /**
   * Build prompt for voting on a proposal
   *
   * @param governor - Governor entity (soul agent)
   * @param proposal - Proposal being voted on
   * @param context - Decision context (nation, empire, etc.)
   * @param world - World instance
   * @returns LLM prompt for vote decision
   */
  buildVotePrompt(
    governor: Entity,
    proposal: Proposal,
    context: NationContext,
    world: World
  ): string {
    // Extract governor personality/traits if available
    const personality = governor.components.get('personality') as
      | { traits?: string[] }
      | undefined;
    const traits = personality?.traits ?? [];

    // Build context summary
    const contextSummary = this.summarizeNationContext(context);

    return `You are the head of state for ${context.nation.name}, a ${context.nation.governmentType} with ${context.nation.population.toLocaleString()} citizens across ${context.nation.territory} provinces.

PERSONALITY TRAITS: ${traits.join(', ') || 'pragmatic, balanced'}

CURRENT SITUATION:
${contextSummary}

PROPOSAL UNDER CONSIDERATION:
Topic: ${proposal.topic}
Description: ${proposal.description}
Proposed by: ${proposal.proposedBy}
${proposal.options ? `Options: ${proposal.options.join(', ')}` : ''}

DECISION REQUIRED:
You must cast your vote on this proposal. Consider:
- How does this align with your nation's interests?
- What are the risks and benefits?
- How will this affect your population and provinces?
- What are the long-term consequences?

Respond with JSON in this exact format:
{
  "stance": "approve" | "reject" | "abstain",
  "reasoning": "Your detailed reasoning for this vote (2-3 sentences)"
}

Your vote will be recorded and influence the outcome. Choose wisely.`;
  }

  /**
   * Build prompt for interpreting a directive from higher tier
   *
   * @param governor - Governor entity receiving directive
   * @param directive - Delegation chain with directive details
   * @param tier - Governor's political tier
   * @param world - World instance
   * @returns LLM prompt for directive interpretation
   */
  buildDirectivePrompt(
    governor: Entity,
    directive: DelegationChain,
    tier: PoliticalTier,
    world: World
  ): string {
    // Build appropriate context based on tier
    let contextSummary: string;
    try {
      switch (tier) {
        case 'province':
          const provinceContext = buildProvinceGovernorContext(governor, world);
          contextSummary = this.summarizeProvinceContext(provinceContext);
          break;
        case 'nation':
          const nationContext = buildNationContext(governor, world);
          contextSummary = this.summarizeNationContext(nationContext);
          break;
        case 'empire':
          const empireContext = buildEmpireContext(governor, world);
          contextSummary = this.summarizeEmpireContext(empireContext);
          break;
        default:
          contextSummary = 'Context unavailable for this tier';
      }
    } catch (error) {
      contextSummary = `Error building context: ${error}`;
    }

    const personality = governor.components.get('personality') as
      | { traits?: string[] }
      | undefined;
    const traits = personality?.traits ?? [];

    return `You are a ${tier}-level governor receiving a directive from the ${directive.origin} tier.

PERSONALITY TRAITS: ${traits.join(', ') || 'pragmatic, balanced'}

YOUR SITUATION:
${contextSummary}

DIRECTIVE RECEIVED:
From: ${directive.origin} tier
Priority: ${directive.priority}
Directive: "${directive.directive}"
${directive.issuerAgentId ? `Issued by: ${directive.issuerAgentId}` : ''}
${directive.requiresAcknowledgment ? 'ACKNOWLEDGMENT REQUIRED' : ''}

Parameters:
${JSON.stringify(directive.parameters, null, 2)}

DECISION REQUIRED:
How will you respond to this directive? Consider:
- Can you implement this locally with available resources?
- Should you delegate to lower-tier governors?
- Do you need to negotiate terms with the higher tier?
- Are there valid reasons to refuse (extremely risky)?

Respond with JSON in this exact format:
{
  "action": "implement" | "delegate" | "negotiate" | "refuse",
  "implementation_plan": "How you'll implement locally (if action=implement)",
  "delegation_target": "Which lower tier to delegate to (if action=delegate)",
  "negotiation_points": ["Point 1", "Point 2"] (if action=negotiate),
  "refusal_reason": "Why refusing (if action=refuse, very risky!)",
  "reasoning": "Your detailed reasoning (2-3 sentences)"
}

WARNING: Refusing a directive from higher authority can damage relations and may result in sanctions or removal from office.`;
  }

  /**
   * Build prompt for responding to a crisis
   *
   * @param governor - Governor entity handling crisis
   * @param crisis - Crisis details
   * @param tier - Governor's political tier
   * @param world - World instance
   * @returns LLM prompt for crisis response
   */
  buildCrisisPrompt(
    governor: Entity,
    crisis: Crisis,
    tier: PoliticalTier,
    world: World
  ): string {
    // Build appropriate context based on tier
    let contextSummary: string;
    try {
      switch (tier) {
        case 'village':
          const villageContext = buildVillageContext(governor, world);
          contextSummary = `Village: ${villageContext.village.name} (${villageContext.village.population} citizens)`;
          break;
        case 'city':
          const cityContext = buildCityContext(governor, world);
          contextSummary = `City: ${cityContext.city.name} (${cityContext.city.population} citizens)`;
          break;
        case 'province':
          const provinceContext = buildProvinceGovernorContext(governor, world);
          contextSummary = this.summarizeProvinceContext(provinceContext);
          break;
        case 'nation':
          const nationContext = buildNationContext(governor, world);
          contextSummary = this.summarizeNationContext(nationContext);
          break;
        case 'empire':
          const empireContext = buildEmpireContext(governor, world);
          contextSummary = this.summarizeEmpireContext(empireContext);
          break;
        default:
          contextSummary = 'Context unavailable for this tier';
      }
    } catch (error) {
      contextSummary = `Error building context: ${error}`;
    }

    const personality = governor.components.get('personality') as
      | { traits?: string[] }
      | undefined;
    const traits = personality?.traits ?? [];

    return `You are a ${tier}-level governor facing a crisis.

PERSONALITY TRAITS: ${traits.join(', ') || 'pragmatic, balanced'}

YOUR SITUATION:
${contextSummary}

CRISIS:
Type: ${crisis.type}
Severity: ${(crisis.severity * 100).toFixed(0)}% (${crisis.severity < 0.3 ? 'minor' : crisis.severity < 0.6 ? 'moderate' : crisis.severity < 0.8 ? 'major' : 'critical'})
Description: ${crisis.description}
Affected entities: ${crisis.affectedEntityIds.length}
Population affected: ${crisis.populationAffected.toLocaleString()}
${crisis.casualtyCount ? `Casualties: ${crisis.casualtyCount.toLocaleString()}` : ''}
Status: ${crisis.status}

DECISION REQUIRED:
How will you respond to this crisis? Consider:
- Can you handle this locally with available resources?
- Is escalation to higher tier needed?
- What assistance do you need from neighboring governors?
- What immediate measures can you take?

Respond with JSON in this exact format:
{
  "action": "handle_locally" | "escalate" | "request_assistance",
  "local_measures": ["Measure 1", "Measure 2"] (if action=handle_locally),
  "escalation_target": "province" | "nation" | "empire" | "federation" | "galactic_council" (if action=escalate),
  "assistance_needed": ["Resource 1", "Resource 2"] (if action=request_assistance),
  "reasoning": "Your detailed reasoning (2-3 sentences)"
}

Act decisively - lives may depend on your decision.`;
  }

  /**
   * Build prompt for setting policy
   *
   * @param governor - Governor entity setting policy
   * @param policyCategory - Category of policy (economic, military, social, etc.)
   * @param tier - Governor's political tier
   * @param world - World instance
   * @returns LLM prompt for policy decision
   */
  buildPolicyPrompt(
    governor: Entity,
    policyCategory: string,
    tier: PoliticalTier,
    world: World
  ): string {
    // Build appropriate context based on tier
    let contextSummary: string;
    try {
      switch (tier) {
        case 'nation':
          const nationContext = buildNationContext(governor, world);
          contextSummary = this.summarizeNationContext(nationContext);
          break;
        case 'empire':
          const empireContext = buildEmpireContext(governor, world);
          contextSummary = this.summarizeEmpireContext(empireContext);
          break;
        default:
          contextSummary = 'Context unavailable for this tier';
      }
    } catch (error) {
      contextSummary = `Error building context: ${error}`;
    }

    const personality = governor.components.get('personality') as
      | { traits?: string[] }
      | undefined;
    const traits = personality?.traits ?? [];

    return `You are a ${tier}-level governor setting ${policyCategory} policy.

PERSONALITY TRAITS: ${traits.join(', ') || 'pragmatic, balanced'}

YOUR SITUATION:
${contextSummary}

DECISION REQUIRED:
Design a ${policyCategory} policy for your realm. Consider:
- What are the current challenges in this area?
- What resources are available for implementation?
- How will this affect different populations/provinces?
- What are the expected short and long-term outcomes?

Respond with JSON in this exact format:
{
  "policy": "Policy name/type",
  "parameters": {
    "param1": value1,
    "param2": value2
  },
  "rationale": "Why this policy is needed (2-3 sentences)",
  "expected_impact": "What you expect to achieve (1-2 sentences)"
}

Be specific and realistic about what can be achieved.`;
  }

  /**
   * Summarize province context for prompts
   */
  private summarizeProvinceContext(context: any): string {
    return `Province: ${context.provinceData.name}
Population: ${context.population.toLocaleString()}
Food supply: ${context.foodDaysRemaining.toFixed(1)} days remaining
Key resources: ${context.keyResources.join(', ')}
Critical needs: ${context.criticalNeeds.join(', ') || 'none'}
Strategic focus: ${context.strategicFocus}
Warehouse utilization: ${context.warehouseData.utilizationPercent.toFixed(1)}%
${context.warehouseData.criticalShortages.length > 0 ? `SHORTAGES: ${context.warehouseData.criticalShortages.join(', ')}` : ''}`;
  }

  /**
   * Summarize nation context for prompts
   */
  private summarizeNationContext(context: NationContext): string {
    return `Nation: ${context.nation.name}
Government: ${context.nation.governmentType}
Population: ${context.nation.population.toLocaleString()}
Territory: ${context.nation.territory} provinces
GDP: ${context.economy.gdp.toLocaleString()}
Tax rate: ${(context.economy.taxRate * 100).toFixed(1)}%
Military strength: ${context.military.strength.toLocaleString()}
Active deployments: ${context.military.deployments.length}
Diplomatic relations: ${context.neighbors.map(n => `${n.name} (${n.relation})`).join(', ')}
Pending proposals: ${context.pendingProposals.length}`;
  }

  /**
   * Summarize empire context for prompts
   */
  private summarizeEmpireContext(context: any): string {
    return `Empire: ${context.empire.name}
Population: ${context.empire.population.toLocaleString()}
Territory: ${context.empire.territory} star systems
Vassal nations: ${context.nations.length}
Active threats: ${context.threats.length}
${context.threats.length > 0 ? `Top threat: ${context.threats[0].type} (severity: ${context.threats[0].severity})` : ''}
Advisor recommendations: ${context.advisorRecommendations.length}`;
  }
}
