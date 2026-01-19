/**
 * GovernorPromptTemplates.ts - LLM prompt templates for all political governor tiers
 *
 * Per 11-LLM-GOVERNORS.md: Each political tier has specific prompt templates that
 * provide context-appropriate decision making frameworks for LLM-driven governors.
 *
 * Prompt templates include:
 * - Tier-specific context (galaxy state, empire status, nation metrics, etc.)
 * - Available actions with clear descriptions
 * - JSON response format for structured parsing
 * - Personality integration for soul agent governors
 *
 * Performance considerations:
 * - Template strings are built lazily (only when LLM call needed)
 * - Context objects are passed by reference (no deep copy)
 * - Minimal string concatenation in hot paths
 */

import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { GovernorComponent } from '../components/GovernorComponent.js';
import type {
  GalacticCouncilContext,
  EmpireContext,
  NationContext,
  ProvinceGovernorContext,
} from './GovernorContextBuilders.js';
import type { Crisis } from './DecisionProtocols.js';

/**
 * Crisis protocol for emergency response
 * Defines urgency and response requirements
 */
export interface CrisisProtocol {
  type: string;
  severity: number;
  requiredResponse: number; // Ticks until action required
  llmBudgetOverride: boolean; // Can skip cooldown for emergency
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Governor soul agent component (extended from SoulAgentComponent)
 * Used for personality context building
 */
export interface GovernorSoulAgent {
  type: 'soul_agent';
  version: number;

  // Governor-specific fields
  governorHistory: {
    termsServed: number;
    decisions: GovernorDecision[];
    legacyRating: number; // 0-1, historical reputation
  };

  politicalIdeology: {
    economic: number; // -1 (communist) to 1 (capitalist)
    social: number; // -1 (authoritarian) to 1 (libertarian)
    foreign: number; // -1 (isolationist) to 1 (interventionist)
  };

  constituencyRelations: Map<string, number>; // province/nation → approval rating

  // Standard soul agent fields
  coreMemories: CoreMemory[];
  legacyRating?: number;
}

/**
 * Core memory from soul agent
 */
export interface CoreMemory {
  id: string;
  summary: string;
  coreReason: string;
  cosmicSignificance: number;
  incarnationContext?: {
    bodyName: string;
  };
}

/**
 * Governor decision record
 */
export interface GovernorDecision {
  tick: number;
  decisionType: string;
  context: string;
  outcome: 'success' | 'failure' | 'mixed' | 'pending';
  popularityImpact: number; // -1 to 1
}

// ============================================================================
// 1. GALACTIC COUNCIL PROMPT TEMPLATE
// ============================================================================

/**
 * Build prompt for galactic council representative
 *
 * Per 11-LLM-GOVERNORS.md:
 * - Multi-species assembly governing the galaxy
 * - Decisions: Inter-species treaties, galactic laws, war/peace
 * - LLM Budget: 1 call/hour per species
 *
 * @param context Galactic council context from context builders
 * @returns Formatted prompt string for LLM
 */
export function buildGalacticCouncilPrompt(context: GalacticCouncilContext): string {
  // Format species list
  const speciesList = context.speciesRepresented
    .map(
      (s) =>
        `- ${s.speciesName} (${s.homeworld}): ${s.population.toLocaleString()} population, ${s.temperament}`
    )
    .join('\n');

  // Format crises list
  const crisesList = context.currentCrises
    .map(
      (c) =>
        `- ${c.type.toUpperCase()} (severity: ${Math.round(c.severity * 100)}%): Affects ${c.affectedSpecies.join(', ')}`
    )
    .join('\n');

  // Format proposals list
  const proposalsList = context.proposals
    .map(
      (p, i) =>
        `${i + 1}. "${p.proposal}" (proposed by ${p.proposedBy})
   Support: ${p.support} | Opposition: ${p.opposition}`
    )
    .join('\n\n');

  return `You are a representative on the GALACTIC COUNCIL, a multi-species assembly governing the galaxy.

GALAXY STATE:
- Total Stars: ${context.galaxyState.totalStars.toLocaleString()}
- Inhabited Planets: ${context.galaxyState.totalPlanets.toLocaleString()}
- Total Population: ${context.galaxyState.totalPopulation.toLocaleString()}
- Species Represented: ${context.galaxyState.speciesCount}

SPECIES REPRESENTED:
${speciesList}

CURRENT CRISES:
${crisesList || '- None currently'}

PROPOSALS ON FLOOR:
${proposalsList || '- No pending proposals'}

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
// 2. EMPEROR PROMPT TEMPLATE
// ============================================================================

/**
 * Build prompt for emperor (empire tier)
 *
 * Per 11-LLM-GOVERNORS.md:
 * - Grand strategy, multi-nation coordination
 * - Decisions: Tech focus, nation absorption, foreign policy
 * - LLM Budget: 5 calls/hour (emperor + advisors)
 *
 * @param context Empire context from context builders
 * @returns Formatted prompt string for LLM
 */
export function buildEmperorPrompt(context: EmpireContext): string {
  // Format nations list
  const nationsList = context.nations
    .map(
      (n) =>
        `- ${n.name}: ${n.population.toLocaleString()} pop, ${Math.round(n.loyalty * 100)}% loyalty, ${n.militaryStrength} military strength`
    )
    .join('\n');

  // Format diplomatic relations
  const diplomaticList = context.diplomaticRelations
    .map(
      (r) =>
        `- ${r.targetEmpire}: ${r.relation.toUpperCase()} (trust: ${Math.round(r.trustLevel * 100)}%)`
    )
    .join('\n');

  // Format threats
  const threatsList = context.threats
    .map(
      (t) =>
        `- ${t.type} (severity: ${Math.round(t.severity * 100)}%): ${t.description}`
    )
    .join('\n');

  // Format advisor recommendations
  const advisorsList = context.advisorRecommendations
    .map((a) => `- ${a.advisor.toUpperCase()} ADVISOR: ${a.recommendation}`)
    .join('\n');

  return `You are the EMPEROR of the ${context.empire.name}, ruling ${context.empire.population.toLocaleString()} citizens across ${context.empire.territory} star systems.

EMPIRE STATUS:
- Species: ${context.empire.species}
- Territory: ${context.empire.territory} star systems
- Population: ${context.empire.population.toLocaleString()}

SUBORDINATE NATIONS:
${nationsList || '- No subordinate nations'}

DIPLOMATIC RELATIONS:
${diplomaticList || '- No diplomatic relations'}

THREATS:
${threatsList || '- No current threats'}

ADVISOR RECOMMENDATIONS:
${advisorsList || '- No advisor recommendations'}

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
// 3. PARLIAMENT PROMPT TEMPLATE
// ============================================================================

/**
 * Build prompt for parliament member (nation tier)
 *
 * Per 11-LLM-GOVERNORS.md:
 * - National policy, province coordination
 * - Decisions: War declaration, tax rates, province priorities
 * - LLM Budget: 10 calls/hour (parliament) or 5 calls/hour (monarch)
 *
 * @param context Nation context from context builders
 * @param memberRole Role of the parliament member (e.g., "Economic Minister")
 * @returns Formatted prompt string for LLM
 */
export function buildParliamentPrompt(context: NationContext, memberRole: string): string {
  // Format provinces list
  const provincesList = context.provinces
    .map(
      (p) =>
        `- ${p.name}: ${p.population.toLocaleString()} pop, happiness ${Math.round(p.happiness * 100)}%`
    )
    .join('\n');

  // Format economy
  const reservesList = Object.entries(context.economy.reserves)
    .map(([r, amt]) => `${r}: ${amt}`)
    .join(', ');

  // Format military deployments
  const deploymentsList = context.military.deployments
    .map((d) => `${d.location} (${d.size})`)
    .join(', ');

  // Format neighbors
  const neighborsList = context.neighbors.map((n) => `- ${n.name}: ${n.relation}`).join('\n');

  // Format pending proposals
  const proposalsList = context.pendingProposals
    .map(
      (p, i) => `${i + 1}. ${p.type}: "${p.description}" (proposed by ${p.proposer})`
    )
    .join('\n');

  return `You are a PARLIAMENT MEMBER (${memberRole}) in the ${context.nation.name} national legislature.

NATION STATUS:
- Government Type: ${context.nation.governmentType}
- Population: ${context.nation.population.toLocaleString()}
- Territory: ${context.nation.territory} provinces

PROVINCES:
${provincesList || '- No provinces'}

ECONOMY:
- GDP: ${context.economy.gdp.toLocaleString()}
- Tax Rate: ${Math.round(context.economy.taxRate * 100)}%
- Reserves: ${reservesList || 'None'}

MILITARY:
- Strength: ${context.military.strength}
- Deployments: ${deploymentsList || 'None'}

NEIGHBORS:
${neighborsList || '- No neighbors'}

PENDING PROPOSALS:
${proposalsList || '- No pending proposals'}

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
// 4. MAYOR PROMPT TEMPLATE
// ============================================================================

/**
 * Build prompt for mayor (province/city tier)
 *
 * Per 11-LLM-GOVERNORS.md:
 * - Local management, trade, construction (extends existing MayorNegotiator)
 * - Decisions: Trade agreements, building projects, migration policy
 * - LLM Budget: 20 calls/hour per city
 *
 * @param context Province governor context from context builders
 * @returns Formatted prompt string for LLM
 */
export function buildMayorPrompt(context: ProvinceGovernorContext): string {
  // Format resources
  const resourcesList = context.keyResources.join(', ');

  // Format buildings
  const buildingsList = context.provinceData.buildings
    .map((b) => `- ${b.type}: ${b.status}`)
    .join('\n');

  // Format neighbors
  const neighborsList = context.provinceData.neighbors
    .map((n) => `- ${n.name} (${n.distance} km away): ${n.relation}`)
    .join('\n');

  // Format national directives
  const directivesList = context.nationalDirectives
    .map((d) => `- [Priority ${d.priority}] ${d.type}: ${d.description}`)
    .join('\n');

  return `You are the MAYOR of ${context.provinceData.name}, a ${context.provinceData.tier}.

POPULATION & RESOURCES:
- Population: ${context.population.toLocaleString()}
- Food Supply: ${context.foodSupply} (${context.foodDaysRemaining} days remaining)
- Key Resources: ${resourcesList || 'None'}

BUILDINGS:
${buildingsList || '- No buildings'}

NEIGHBORS:
${neighborsList || '- No neighbors'}

CURRENT NEEDS:
${context.criticalNeeds.join(', ') || 'None'}

NATIONAL DIRECTIVES:
${directivesList || '- No directives'}

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
- set_policy: Set local policy (tax, migration, etc.)

What is your decision?

Respond with JSON:
{
  "reasoning": "Your analysis of local situation",
  "action": {
    "type": "approve_trade" | "counter_trade" | "plan_construction" | "request_resources" | "adjust_priorities" | "set_policy",
    "target": "trade_id or building_type or policy_name",
    "parameters": { /* action-specific params */ }
  },
  "announcement": "Your public announcement (optional)"
}`;
}

// ============================================================================
// 5. GOVERNOR PERSONALITY CONTEXT
// ============================================================================

/**
 * Build personality context for governor LLM prompt
 *
 * Per 11-LLM-GOVERNORS.md:
 * - Soul agents as governors maintain personality consistency
 * - Political ideology derived from past decisions
 * - Top 5 most significant decisions included
 * - Constituency approval ratings
 *
 * @param governor Governor entity with soul agent component
 * @returns Personality context string to prepend to tier prompt
 */
export function buildGovernorPersonalityContext(governor: Entity): string {
  const impl = governor as EntityImpl;
  // Try to get soul identity component - governors may be soul agents
  const soulAgent = impl.getComponent<GovernorSoulAgent>(CT.SoulIdentity);

  if (!soulAgent) {
    return ''; // No personality if not a soul agent
  }

  // Extract political ideology description
  const ideology = soulAgent.politicalIdeology;
  const economicDesc = ideology.economic > 0.3 ? 'free market' : ideology.economic < -0.3 ? 'centrally planned' : 'mixed economy';
  const socialDesc = ideology.social > 0.3 ? 'libertarian' : ideology.social < -0.3 ? 'authoritarian' : 'moderate';
  const foreignDesc = ideology.foreign > 0.3 ? 'interventionist' : ideology.foreign < -0.3 ? 'isolationist' : 'pragmatic';

  const ideologyDesc = `Economic: ${economicDesc}, Social: ${socialDesc}, Foreign: ${foreignDesc}`;

  // Get top 5 most significant decisions
  const topDecisions = [...soulAgent.governorHistory.decisions]
    .sort((a, b) => Math.abs(b.popularityImpact) - Math.abs(a.popularityImpact))
    .slice(0, 5);

  const decisionsText = topDecisions.length > 0
    ? topDecisions
        .map(
          (d) =>
            `- ${d.decisionType}: ${d.context} -> ${d.outcome} (popularity ${d.popularityImpact > 0 ? '+' : ''}${Math.round(d.popularityImpact * 100)}%)`
        )
        .join('\n')
    : '- No major decisions yet';

  // Get top 5 constituency approval ratings
  const constituencyList = Array.from(soulAgent.constituencyRelations.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const constituencyText = constituencyList.length > 0
    ? constituencyList
        .map(([name, approval]) => `- ${name}: ${Math.round(approval * 100)}%`)
        .join('\n')
    : '- No constituency data yet';

  const legacyRating = soulAgent.governorHistory.legacyRating ?? soulAgent.legacyRating ?? 0.5;

  return `YOUR POLITICAL IDENTITY:
Political Ideology: ${ideologyDesc}
Terms Served: ${soulAgent.governorHistory.termsServed}
Legacy Rating: ${Math.round(legacyRating * 100)}%

YOUR PAST MAJOR DECISIONS:
${decisionsText}

CONSTITUENCY APPROVAL:
${constituencyText}

Your decisions should reflect your established ideology and past precedents, unless circumstances demand adaptation.

`;
}

// ============================================================================
// 6. CRISIS PROMPT TEMPLATE
// ============================================================================

/**
 * Build prompt for crisis response
 *
 * Per 11-LLM-GOVERNORS.md:
 * - Emergency powers for fast response
 * - Can override LLM cooldown for critical crises
 * - Always uses best model (Sonnet) for crisis decisions
 *
 * @param governor Governor entity handling the crisis
 * @param crisis Crisis data
 * @param protocol Crisis protocol with response requirements
 * @returns Formatted crisis prompt string for LLM
 */
export function buildCrisisPrompt(
  governor: Entity,
  crisis: Crisis,
  protocol: CrisisProtocol
): string {
  const impl = governor as EntityImpl;
  const govComp = impl.getComponent<GovernorComponent>(CT.Governor);

  if (!govComp) {
    throw new Error('Governor component required for crisis prompt');
  }

  // Format affected entities
  const affectedList = crisis.affectedEntityIds.slice(0, 10).join(', ');
  const moreAffected = crisis.affectedEntityIds.length > 10
    ? ` (+${crisis.affectedEntityIds.length - 10} more)`
    : '';

  // Format location if available
  const locationText = crisis.epicenterLocation
    ? `Location: (${crisis.epicenterLocation.x}, ${crisis.epicenterLocation.y}${crisis.epicenterLocation.z ? `, ${crisis.epicenterLocation.z}` : ''})`
    : 'Location: Unknown';

  // Format impact metrics
  const impactMetrics = [];
  impactMetrics.push(`Population Affected: ${crisis.populationAffected.toLocaleString()}`);
  if (crisis.economicImpact !== undefined) {
    impactMetrics.push(`Economic Impact: ${crisis.economicImpact.toLocaleString()}`);
  }
  if (crisis.casualtyCount !== undefined) {
    impactMetrics.push(`Casualties: ${crisis.casualtyCount.toLocaleString()}`);
  }

  // Calculate urgency
  const ticksRemaining = protocol.requiredResponse;
  const secondsRemaining = Math.floor(ticksRemaining / 20);
  const urgencyLevel =
    protocol.severity >= 0.9 ? 'CRITICAL' :
    protocol.severity >= 0.7 ? 'HIGH' :
    protocol.severity >= 0.5 ? 'MODERATE' : 'LOW';

  return `EMERGENCY: CRISIS RESPONSE REQUIRED

You are the governor of ${govComp.jurisdiction} (${govComp.tier} tier).
A crisis requires your IMMEDIATE attention.

CRISIS DETAILS:
- Type: ${crisis.type.toUpperCase()}
- Severity: ${Math.round(crisis.severity * 100)}% (${urgencyLevel})
- Status: ${crisis.status.toUpperCase()}
- ${locationText}

DESCRIPTION:
${crisis.description}

AFFECTED ENTITIES:
${affectedList}${moreAffected}

IMPACT:
${impactMetrics.join('\n')}

TIME CONSTRAINT:
- Response Required Within: ${secondsRemaining} seconds (${ticksRemaining} ticks)
- Emergency Powers: ${protocol.llmBudgetOverride ? 'ACTIVATED' : 'Not activated'}

AVAILABLE EMERGENCY ACTIONS:
- mobilize_forces: Deploy military/emergency response
- evacuate_population: Order evacuation of affected area
- declare_emergency: Declare state of emergency (unlock resources)
- request_aid: Request aid from higher tier
- quarantine_area: Isolate affected area
- allocate_emergency_funds: Release emergency budget
- issue_directive: Send urgent directive to subordinates

You must act DECISIVELY. Delayed response will increase severity.

Respond with JSON:
{
  "reasoning": "Your crisis assessment (brief)",
  "action": {
    "type": "mobilize_forces" | "evacuate_population" | "declare_emergency" | "request_aid" | "quarantine_area" | "allocate_emergency_funds" | "issue_directive",
    "target": "affected_area or subordinate_tier",
    "parameters": {
      "priority": "immediate" | "urgent" | "standard",
      "resources": ["resource1", "resource2"],
      "scale": "local" | "regional" | "national" | "imperial"
    }
  },
  "public_statement": "Brief statement to citizens (optional)"
}`;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Combine personality context with tier-specific prompt
 *
 * @param governor Governor entity
 * @param tierPrompt Tier-specific prompt from build*Prompt functions
 * @returns Combined prompt with personality + tier context
 */
export function buildFullGovernorPrompt(governor: Entity, tierPrompt: string): string {
  const personalityContext = buildGovernorPersonalityContext(governor);
  return personalityContext + tierPrompt;
}

/**
 * Build prompt for monarch (alternative to parliament)
 *
 * For monarchies, uses similar format to parliament but single decision maker
 *
 * @param context Nation context from context builders
 * @returns Formatted prompt string for LLM
 */
export function buildMonarchPrompt(context: NationContext): string {
  // Format provinces list
  const provincesList = context.provinces
    .map(
      (p) =>
        `- ${p.name}: ${p.population.toLocaleString()} pop, happiness ${Math.round(p.happiness * 100)}%`
    )
    .join('\n');

  // Format economy
  const reservesList = Object.entries(context.economy.reserves)
    .map(([r, amt]) => `${r}: ${amt}`)
    .join(', ');

  // Format military deployments
  const deploymentsList = context.military.deployments
    .map((d) => `${d.location} (${d.size})`)
    .join(', ');

  // Format neighbors
  const neighborsList = context.neighbors.map((n) => `- ${n.name}: ${n.relation}`).join('\n');

  // Format pending proposals
  const proposalsList = context.pendingProposals
    .map(
      (p, i) => `${i + 1}. ${p.type}: "${p.description}" (proposed by ${p.proposer})`
    )
    .join('\n');

  return `You are the MONARCH of ${context.nation.name}, ruling with absolute authority.

NATION STATUS:
- Government Type: ${context.nation.governmentType}
- Population: ${context.nation.population.toLocaleString()}
- Territory: ${context.nation.territory} provinces

PROVINCES:
${provincesList || '- No provinces'}

ECONOMY:
- GDP: ${context.economy.gdp.toLocaleString()}
- Tax Rate: ${Math.round(context.economy.taxRate * 100)}%
- Reserves: ${reservesList || 'None'}

MILITARY:
- Strength: ${context.military.strength}
- Deployments: ${deploymentsList || 'None'}

NEIGHBORS:
${neighborsList || '- No neighbors'}

ADVISOR PROPOSALS:
${proposalsList || '- No pending proposals'}

YOUR ABSOLUTE POWERS:
- Declare war or peace
- Set tax policy
- Allocate national resources
- Appoint provincial governors
- Issue royal decrees

AVAILABLE ACTIONS:
- declare_war: Initiate conflict with neighbor
- declare_peace: End ongoing conflict
- set_tax_policy: Adjust national tax rates
- allocate_resources: Distribute resources to provinces
- appoint_governor: Appoint/replace provincial governor
- issue_decree: Royal decree with force of law
- approve_proposal: Accept advisor recommendation
- reject_proposal: Reject advisor recommendation

What is your royal decree?

Respond with JSON:
{
  "reasoning": "Your royal judgment",
  "action": {
    "type": "declare_war" | "declare_peace" | "set_tax_policy" | "allocate_resources" | "appoint_governor" | "issue_decree" | "approve_proposal" | "reject_proposal",
    "target": "nation_name or province_name or proposal_id",
    "parameters": { /* action-specific params */ }
  },
  "proclamation": "Your royal proclamation (optional)"
}`;
}

/**
 * Build prompt for village elder (rule-based, no LLM)
 *
 * This is provided for completeness but should NOT be used for LLM calls.
 * Village-level governance uses rule-based consensus, not LLM decisions.
 *
 * @param villageName Name of the village
 * @param proposal Proposal being considered
 * @returns Formatted string (for logging/debugging only)
 */
export function buildVillageElderPrompt(
  villageName: string,
  proposal: { type: string; description: string }
): string {
  return `[RULE-BASED - NO LLM]
Village: ${villageName}
Proposal: ${proposal.type} - ${proposal.description}

Village-level decisions use elder consensus (rule-based), not LLM calls.
This prompt is for debugging/logging purposes only.`;
}
