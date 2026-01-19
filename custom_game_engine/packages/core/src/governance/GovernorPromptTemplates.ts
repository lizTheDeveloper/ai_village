/**
 * GovernorPromptTemplates - Prompt builders for all governor tiers
 *
 * Implements LLM prompt templates for Phase 6 AI Governance system.
 * Per 11-LLM-GOVERNORS.md spec, provides prompt builders for:
 * - Galactic Council (multi-species assembly)
 * - Emperor (empire grand strategy)
 * - Parliament (national legislation)
 * - Mayor (local governance, extends MayorNegotiator)
 *
 * Each template specifies available actions, context, and JSON response format.
 */

import type { Entity } from '../ecs/Entity.js';
import type { ComponentType as CT } from '../types/ComponentType.js';

// ============================================================================
// Context Interfaces
// ============================================================================

/**
 * Galactic Council context - multi-species assembly
 */
export interface GalacticCouncilContext {
  galaxyState: {
    totalStars: number;
    totalPlanets: number;
    totalPopulation: number;
    speciesCount: number;
  };

  speciesRepresented: Array<{
    speciesName: string;
    homeworld: string;
    population: number;
    temperament: string; // aggressive, diplomatic, isolationist
  }>;

  currentCrises: Array<{
    type: string; // war, famine, plague, extinction
    severity: number; // 0-1
    affectedSpecies: string[];
  }>;

  proposals: Array<{
    proposedBy: string;
    proposal: string;
    support: number; // votes in favor
    opposition: number;
  }>;
}

/**
 * Empire context - grand strategy
 */
export interface EmpireContext {
  empire: {
    name: string;
    population: number;
    territory: number; // star systems
    species: string;
  };

  nations: Array<{
    name: string;
    population: number;
    loyalty: number; // 0-1
    militaryStrength: number;
    resources: Record<string, number>;
  }>;

  diplomaticRelations: Array<{
    targetEmpire: string;
    relation: 'allied' | 'neutral' | 'rival' | 'war';
    trustLevel: number; // 0-1
  }>;

  threats: Array<{
    type: string;
    severity: number;
    description: string;
  }>;

  advisorRecommendations: Array<{
    advisor: string; // 'military', 'economic', 'diplomatic', 'research'
    recommendation: string;
  }>;
}

/**
 * Nation context - national policy
 */
export interface NationContext {
  nation: {
    name: string;
    governmentType: 'monarchy' | 'democracy' | 'oligarchy';
    population: number;
    territory: number; // provinces
  };

  provinces: Array<{
    name: string;
    population: number;
    resources: Record<string, number>;
    happiness: number; // 0-1
  }>;

  economy: {
    gdp: number;
    taxRate: number;
    reserves: Record<string, number>;
  };

  military: {
    strength: number;
    deployments: Array<{ location: string; size: number }>;
  };

  neighbors: Array<{
    name: string;
    relation: 'allied' | 'neutral' | 'hostile';
  }>;

  pendingProposals: Array<{
    type: string;
    proposer: string;
    description: string;
  }>;
}

/**
 * Province/City context - local governance (extends existing CivilizationContext)
 */
export interface ProvinceGovernorContext {
  // Base civilization data
  population: number;
  foodSupply: number;
  foodDaysRemaining: number;
  keyResources: string[];
  criticalNeeds: string[];
  strategicFocus: string;

  // Province-specific data
  provinceData: {
    name: string;
    tier: 'village' | 'town' | 'city' | 'metropolis';
    buildings: Array<{ type: string; status: string }>;
    neighbors: Array<{ name: string; distance: number; relation: string }>;
  };

  nationalDirectives: Array<{
    type: string;
    priority: number;
    description: string;
  }>;
}

/**
 * Crisis for emergency decision-making
 */
export interface Crisis {
  type: string;
  severity: number; // 0-1
  description: string;
  affectedEntities: string[];
  requiredResponseTicks: number;
}

/**
 * Crisis protocol
 */
export interface CrisisProtocol {
  type: string;
  severity: number;
  requiredResponse: number; // Ticks until action required
  llmBudgetOverride: boolean; // Can skip cooldown
}

// ============================================================================
// Galactic Council Prompt
// ============================================================================

/**
 * Build prompt for Galactic Council representative
 *
 * Context: Multi-species assembly governing the galaxy
 * Actions: vote_on_proposal, propose_law, propose_treaty, call_for_debate, emergency_declaration
 * Response: JSON with reasoning, action, speech
 */
export function buildGalacticCouncilPrompt(context: GalacticCouncilContext): string {
  return `You are a representative on the GALACTIC COUNCIL, a multi-species assembly governing the galaxy.

GALAXY STATE:
- Total Stars: ${context.galaxyState.totalStars.toLocaleString()}
- Inhabited Planets: ${context.galaxyState.totalPlanets.toLocaleString()}
- Total Population: ${context.galaxyState.totalPopulation.toLocaleString()}
- Species Represented: ${context.galaxyState.speciesCount}

SPECIES REPRESENTED:
${context.speciesRepresented
  .map(
    (s) =>
      `- ${s.speciesName} (${s.homeworld}): ${s.population.toLocaleString()} population, ${s.temperament}`
  )
  .join('\n')}

CURRENT CRISES:
${context.currentCrises
  .map(
    (c) =>
      `- ${c.type.toUpperCase()} (severity: ${Math.round(c.severity * 100)}%): Affects ${c.affectedSpecies.join(', ')}`
  )
  .join('\n')}

PROPOSALS ON FLOOR:
${context.proposals
  .map(
    (p, i) =>
      `${i + 1}. "${p.proposal}" (proposed by ${p.proposedBy})
   Support: ${p.support} | Opposition: ${p.opposition}`
  )
  .join('\n\n')}

YOUR ROLE:
- Represent your species' interests while considering galaxy-wide welfare
- Vote on proposals (approve, reject, amend)
- Propose new laws or treaties
- Mediate inter-species conflicts

AVAILABLE ACTIONS:
- vote_on_proposal: Cast your vote on a proposal
- propose_law: Introduce new galactic law
- propose_treaty: Suggest inter-species treaty
- call_for_debate: Request extended discussion
- emergency_declaration: Declare galaxy-wide emergency

What is your decision? Consider long-term galactic stability and your species' interests.

Respond with JSON:
{
  "reasoning": "Your analysis of the situation",
  "action": {
    "type": "vote_on_proposal" | "propose_law" | "propose_treaty" | "call_for_debate" | "emergency_declaration",
    "target": "proposal_id or law_name",
    "vote": "approve" | "reject" | "amend",
    "amendment": "optional amendment text"
  },
  "speech": "Your statement to the council (optional)"
}`;
}

// ============================================================================
// Emperor Prompt
// ============================================================================

/**
 * Build prompt for Emperor (empire grand strategy)
 *
 * Context: Empire-wide strategic decisions
 * Actions: set_grand_strategy, allocate_resources, declare_war, propose_alliance,
 *          absorb_nation, release_nation, prioritize_technology
 * Response: JSON with reasoning, action, proclamation
 */
export function buildEmperorPrompt(context: EmpireContext): string {
  return `You are the EMPEROR of the ${context.empire.name}, ruling ${context.empire.population.toLocaleString()} citizens across ${context.empire.territory} star systems.

EMPIRE STATUS:
- Species: ${context.empire.species}
- Territory: ${context.empire.territory} star systems
- Population: ${context.empire.population.toLocaleString()}

SUBORDINATE NATIONS:
${context.nations
  .map(
    (n) =>
      `- ${n.name}: ${n.population.toLocaleString()} pop, ${Math.round(n.loyalty * 100)}% loyalty, ${n.militaryStrength} military strength`
  )
  .join('\n')}

DIPLOMATIC RELATIONS:
${context.diplomaticRelations
  .map(
    (r) =>
      `- ${r.targetEmpire}: ${r.relation.toUpperCase()} (trust: ${Math.round(r.trustLevel * 100)}%)`
  )
  .join('\n')}

THREATS:
${context.threats
  .map((t) => `- ${t.type} (severity: ${Math.round(t.severity * 100)}%): ${t.description}`)
  .join('\n')}

ADVISOR RECOMMENDATIONS:
${context.advisorRecommendations
  .map((a) => `- ${a.advisor.toUpperCase()} ADVISOR: ${a.recommendation}`)
  .join('\n')}

YOUR ROLE:
- Set grand strategy for the empire
- Allocate resources between nations
- Decide foreign policy (war, peace, alliances)
- Choose technology focus
- Absorb or release nations

AVAILABLE ACTIONS:
- set_grand_strategy: Define empire-wide strategic focus
- allocate_resources: Distribute resources between nations
- declare_war: Initiate conflict with another empire
- propose_alliance: Suggest alliance with another empire
- absorb_nation: Integrate a nation into the empire
- release_nation: Grant independence to a nation
- prioritize_technology: Focus research on specific tech tree

What is your imperial decree?

Respond with JSON:
{
  "reasoning": "Your strategic analysis",
  "action": {
    "type": "set_grand_strategy" | "allocate_resources" | "declare_war" | "propose_alliance" | "absorb_nation" | "release_nation" | "prioritize_technology",
    "target": "target_nation or target_empire",
    "parameters": { /* action-specific params */ }
  },
  "proclamation": "Your public statement (optional)"
}`;
}

// ============================================================================
// Parliament Prompt
// ============================================================================

/**
 * Build prompt for Parliament member (national legislation)
 *
 * Context: National policy and legislation
 * Actions: vote_on_proposal, propose_law, call_for_amendment, request_debate
 * Response: JSON with reasoning, action, vote, speech
 */
export function buildParliamentPrompt(context: NationContext, memberRole: string): string {
  return `You are a PARLIAMENT MEMBER (${memberRole}) in the ${context.nation.name} national legislature.

NATION STATUS:
- Government Type: ${context.nation.governmentType}
- Population: ${context.nation.population.toLocaleString()}
- Territory: ${context.nation.territory} provinces

PROVINCES:
${context.provinces
  .map(
    (p) =>
      `- ${p.name}: ${p.population.toLocaleString()} pop, happiness ${Math.round(p.happiness * 100)}%`
  )
  .join('\n')}

ECONOMY:
- GDP: ${context.economy.gdp.toLocaleString()}
- Tax Rate: ${Math.round(context.economy.taxRate * 100)}%
- Reserves: ${Object.entries(context.economy.reserves)
    .map(([r, amt]) => `${r}: ${amt}`)
    .join(', ')}

MILITARY:
- Strength: ${context.military.strength}
- Deployments: ${context.military.deployments.map((d) => `${d.location} (${d.size})`).join(', ')}

NEIGHBORS:
${context.neighbors.map((n) => `- ${n.name}: ${n.relation}`).join('\n')}

PENDING PROPOSALS:
${context.pendingProposals
  .map((p, i) => `${i + 1}. ${p.type}: "${p.description}" (proposed by ${p.proposer})`)
  .join('\n')}

YOUR ROLE AS ${memberRole}:
- Vote on proposals
- Propose new laws
- Represent constituent interests
- Debate national priorities

AVAILABLE ACTIONS:
- vote_on_proposal: Vote on pending proposal
- propose_law: Introduce new legislation
- call_for_amendment: Modify existing proposal
- request_debate: Extend discussion time

What is your parliamentary action?

Respond with JSON:
{
  "reasoning": "Your political position",
  "action": {
    "type": "vote_on_proposal" | "propose_law" | "call_for_amendment" | "request_debate",
    "target": "proposal_id",
    "vote": "approve" | "reject",
    "amendment": "proposed changes (if applicable)"
  },
  "speech": "Your floor speech (optional, keep brief)"
}`;
}

// ============================================================================
// Mayor Prompt (extends existing MayorNegotiator)
// ============================================================================

/**
 * Build prompt for Mayor/Governor (local governance)
 *
 * Extends existing MayorNegotiator from packages/core/src/trade/MayorNegotiator.ts
 *
 * Context: Local management, trade, construction
 * Actions: approve_trade, counter_trade, plan_construction, request_resources, adjust_priorities
 * Response: JSON with reasoning, action
 */
export function buildMayorPrompt(context: ProvinceGovernorContext): string {
  return `You are the MAYOR of ${context.provinceData.name}, a ${context.provinceData.tier}.

POPULATION & RESOURCES:
- Population: ${context.population.toLocaleString()}
- Food Supply: ${context.foodSupply} (${context.foodDaysRemaining} days remaining)
- Key Resources: ${context.keyResources.join(', ')}

BUILDINGS:
${context.provinceData.buildings.map((b) => `- ${b.type}: ${b.status}`).join('\n')}

NEIGHBORS:
${context.provinceData.neighbors
  .map((n) => `- ${n.name} (${n.distance} km away): ${n.relation}`)
  .join('\n')}

CURRENT NEEDS:
${context.criticalNeeds.join(', ')}

NATIONAL DIRECTIVES:
${context.nationalDirectives
  .map((d) => `- [Priority ${d.priority}] ${d.type}: ${d.description}`)
  .join('\n')}

YOUR FOCUS: ${context.strategicFocus}

YOUR ROLE:
- Manage local construction
- Negotiate trade agreements
- Handle migration
- Report to national government

AVAILABLE ACTIONS:
- approve_trade: Accept/reject trade proposal
- counter_trade: Modify trade terms
- plan_construction: Queue building project
- request_resources: Ask nation for resources
- adjust_priorities: Change local focus

What is your decision?

Respond with JSON:
{
  "reasoning": "Your analysis and strategy",
  "action": {
    "type": "approve_trade" | "counter_trade" | "plan_construction" | "request_resources" | "adjust_priorities",
    "target": "target_id or resource_name",
    "parameters": { /* action-specific params */ }
  }
}`;
}

// ============================================================================
// Personality Context Builder
// ============================================================================

/**
 * Build governor personality context from past decisions and ideology
 *
 * Adds soul agent personality traits, past decisions, and constituency relations
 * to prompts for consistent decision-making across sessions.
 *
 * Per 11-LLM-GOVERNORS.md: Governors who are soul agents develop persistent
 * personalities through core memories and past decision history.
 */
export function buildGovernorPersonalityContext(governor: Entity): string {
  // Note: This would access soul agent component, but we don't have the full
  // component type definitions here. This is a template showing the structure.
  //
  // In actual implementation, this would be:
  // const soulAgent = governor.getComponent<GovernorSoulAgent>(CT.SoulAgent);
  // if (!soulAgent) return '';

  // Placeholder structure - actual implementation would extract from soul agent component
  const placeholderPersonality = {
    ideology: {
      economic: 0.5, // -1 (communist) to 1 (capitalist)
      social: 0.3, // -1 (authoritarian) to 1 (libertarian)
      foreign: -0.2, // -1 (isolationist) to 1 (interventionist)
    },
    termsServed: 2,
    legacyRating: 0.75,
    topDecisions: [
      {
        type: 'trade_agreement',
        context: 'Negotiated wheat-for-iron deal during famine',
        outcome: 'success',
        popularityImpact: 0.15,
      },
      {
        type: 'military_deployment',
        context: 'Defended against bandit raid',
        outcome: 'success',
        popularityImpact: 0.2,
      },
      {
        type: 'tax_policy',
        context: 'Increased taxes to fund infrastructure',
        outcome: 'mixed',
        popularityImpact: -0.05,
      },
    ],
    constituencyApproval: [
      { name: 'Northern Province', approval: 0.82 },
      { name: 'Southern Province', approval: 0.68 },
      { name: 'Merchant Guild', approval: 0.75 },
    ],
  };

  const p = placeholderPersonality;

  const ideologyDesc =
    `Economic: ${p.ideology.economic > 0 ? 'free market' : 'centrally planned'}, ` +
    `Social: ${p.ideology.social > 0 ? 'libertarian' : 'authoritarian'}, ` +
    `Foreign: ${p.ideology.foreign > 0 ? 'interventionist' : 'isolationist'}`;

  return `YOUR POLITICAL IDENTITY:
Political Ideology: ${ideologyDesc}
Terms Served: ${p.termsServed}
Legacy Rating: ${Math.round(p.legacyRating * 100)}%

YOUR PAST MAJOR DECISIONS:
${p.topDecisions
  .map(
    (d) =>
      `- ${d.type}: ${d.context} → ${d.outcome} (popularity ${d.popularityImpact > 0 ? '+' : ''}${Math.round(d.popularityImpact * 100)}%)`
  )
  .join('\n')}

CONSTITUENCY APPROVAL:
${p.constituencyApproval
  .map((c) => `- ${c.name}: ${Math.round(c.approval * 100)}%`)
  .join('\n')}

Your decisions should reflect your established ideology and past precedents, unless circumstances demand adaptation.
`;
}

// ============================================================================
// Crisis Prompt Builder
// ============================================================================

/**
 * Build emergency decision prompt for crisis situations
 *
 * Per 11-LLM-GOVERNORS.md Crisis Management section:
 * - Overrides normal decision cooldowns
 * - Uses best available model
 * - Provides rapid response context
 */
export function buildCrisisPrompt(
  governor: Entity,
  crisis: Crisis,
  protocol: CrisisProtocol
): string {
  // Extract governor tier/role - placeholder for actual implementation
  const governorRole = 'GOVERNOR'; // Would extract from governor component
  const jurisdiction = 'JURISDICTION'; // Would extract from political entity component

  return `EMERGENCY: CRISIS RESPONSE REQUIRED

You are the ${governorRole} of ${jurisdiction}. A crisis demands immediate action.

CRISIS DETAILS:
- Type: ${crisis.type.toUpperCase()}
- Severity: ${Math.round(crisis.severity * 100)}% (${protocol.severity >= 0.9 ? 'CRITICAL' : 'HIGH'})
- Description: ${crisis.description}
- Affected Entities: ${crisis.affectedEntities.join(', ')}
- Response Required Within: ${Math.round(crisis.requiredResponseTicks / 20)} seconds

CRISIS PROTOCOL:
This is a ${protocol.severity >= 1.0 ? 'maximum severity' : 'high severity'} emergency.
You have ${protocol.llmBudgetOverride ? 'emergency powers' : 'standard authority'} to respond.

YOUR IMMEDIATE OPTIONS:
- Assess the situation and determine primary threat
- Mobilize available resources
- Request aid from higher authority
- Declare local emergency measures
- Evacuate affected populations
- Deploy military/security forces

What is your emergency response?

Respond with JSON (be concise - speed is critical):
{
  "assessment": "Brief situation analysis",
  "action": {
    "type": "emergency_action_type",
    "target": "target_entity_or_area",
    "resources_committed": "what you're deploying",
    "escalation": "higher_tier" | null
  },
  "public_message": "Brief public announcement (optional)"
}`;
}

// ============================================================================
// Exports
// ============================================================================

export type {
  GalacticCouncilContext,
  EmpireContext,
  NationContext,
  ProvinceGovernorContext,
  Crisis,
  CrisisProtocol,
};
