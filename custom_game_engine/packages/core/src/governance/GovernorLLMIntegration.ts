/**
 * GovernorLLMIntegration - LLM integration for governor decision-making
 *
 * This module provides LLM-powered decision-making for governors at all political tiers.
 * Integrates with DecisionProtocols.ts to enable soul agents to make informed decisions.
 *
 * Key functions:
 * - requestGovernorVote: Get LLM vote decision on proposals
 * - requestGovernorDirectiveInterpretation: Get LLM interpretation of directives
 * - requestGovernorCrisisResponse: Get LLM response to crises
 * - generateFallbackVote: Rule-based voting when LLM unavailable
 */

import type { Entity } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type {
  Proposal,
  DelegationChain,
  Crisis,
  PoliticalTier,
  Vote,
} from './DecisionProtocols.js';
import type { NationContext } from './GovernorContextBuilders.js';

// Import LLM infrastructure - use dynamic import to avoid circular dependencies
let llmDecisionQueue: any = null;
let governorPromptBuilder: any = null;

/**
 * Initialize LLM integration (call once at startup)
 */
export async function initializeGovernorLLM(world: World): Promise<void> {
  try {
    // Dynamic import to avoid circular dependencies
    const { LLMDecisionQueue } = await import('@ai-village/llm');
    const { GovernorPromptBuilder } = await import('@ai-village/llm');
    const { OpenAICompatProvider } = await import('@ai-village/llm');

    // Get LLM config from world settings
    const baseUrl = process.env.LLM_BASE_URL || 'http://localhost:11434/v1';
    const model = process.env.LLM_MODEL || 'qwen2.5:latest';
    const apiKey = process.env.LLM_API_KEY || '';

    const provider = new OpenAICompatProvider(model, baseUrl, apiKey);
    llmDecisionQueue = new LLMDecisionQueue(provider, 2);
    governorPromptBuilder = new GovernorPromptBuilder();

    console.log('[GovernorLLM] Initialized with model:', model);
  } catch (error) {
    console.error('[GovernorLLM] Failed to initialize:', error);
    console.warn('[GovernorLLM] Governor decisions will use fallback logic only');
  }
}

/**
 * Vote decision from LLM
 */
export interface VoteDecision {
  stance: 'approve' | 'reject' | 'abstain';
  reasoning: string;
  weight?: number;
}

/**
 * Directive interpretation from LLM
 */
export interface DirectiveInterpretation {
  action: 'implement' | 'delegate' | 'negotiate' | 'refuse';
  implementation_plan?: string;
  delegation_target?: string;
  negotiation_points?: string[];
  refusal_reason?: string;
  reasoning: string;
}

/**
 * Crisis response from LLM
 */
export interface CrisisResponse {
  action: 'handle_locally' | 'escalate' | 'request_assistance';
  local_measures?: string[];
  escalation_target?: PoliticalTier;
  assistance_needed?: string[];
  reasoning: string;
}

/**
 * Request a vote decision from LLM for a soul agent
 *
 * @param governor Governor entity (soul agent)
 * @param proposal Proposal being voted on
 * @param context Nation context for decision-making
 * @param world World instance
 * @returns Vote decision with stance and reasoning
 */
export async function requestGovernorVote(
  governor: Entity,
  proposal: Proposal,
  context: NationContext,
  world: World
): Promise<VoteDecision> {
  if (!llmDecisionQueue || !governorPromptBuilder) {
    throw new Error('GovernorLLM not initialized - call initializeGovernorLLM first');
  }

  // Build prompt
  const prompt = governorPromptBuilder.buildVotePrompt(governor, proposal, context, world);

  // Request decision from LLM with cooldown override for governance decisions
  const customConfig = getCustomLLMConfig(governor);
  const response = await llmDecisionQueue.requestDecision(governor.id, prompt, customConfig);

  // Parse response
  try {
    const parsed = JSON.parse(response);

    // Validate response structure
    if (!parsed.stance || !['approve', 'reject', 'abstain'].includes(parsed.stance)) {
      throw new Error(`Invalid stance: ${parsed.stance}`);
    }

    if (!parsed.reasoning || typeof parsed.reasoning !== 'string') {
      throw new Error('Missing or invalid reasoning');
    }

    return {
      stance: parsed.stance,
      reasoning: parsed.reasoning,
      weight: parsed.weight,
    };
  } catch (error) {
    console.error('[GovernorLLM] Failed to parse vote response:', error);
    console.error('[GovernorLLM] Raw response:', response);
    throw new Error(`Failed to parse LLM vote response: ${error}`);
  }
}

/**
 * Request directive interpretation from LLM for a soul agent
 *
 * @param governor Governor entity receiving directive
 * @param directive Delegation chain with directive details
 * @param tier Governor's political tier
 * @param world World instance
 * @returns Directive interpretation with action plan
 */
export async function requestGovernorDirectiveInterpretation(
  governor: Entity,
  directive: DelegationChain,
  tier: PoliticalTier,
  world: World
): Promise<DirectiveInterpretation> {
  if (!llmDecisionQueue || !governorPromptBuilder) {
    throw new Error('GovernorLLM not initialized - call initializeGovernorLLM first');
  }

  // Build prompt
  const prompt = governorPromptBuilder.buildDirectivePrompt(governor, directive, tier, world);

  // Request decision from LLM
  const customConfig = getCustomLLMConfig(governor);
  const response = await llmDecisionQueue.requestDecision(governor.id, prompt, customConfig);

  // Parse response
  try {
    const parsed = JSON.parse(response);

    // Validate response structure
    if (!parsed.action || !['implement', 'delegate', 'negotiate', 'refuse'].includes(parsed.action)) {
      throw new Error(`Invalid action: ${parsed.action}`);
    }

    if (!parsed.reasoning || typeof parsed.reasoning !== 'string') {
      throw new Error('Missing or invalid reasoning');
    }

    return {
      action: parsed.action,
      implementation_plan: parsed.implementation_plan,
      delegation_target: parsed.delegation_target,
      negotiation_points: parsed.negotiation_points,
      refusal_reason: parsed.refusal_reason,
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    console.error('[GovernorLLM] Failed to parse directive response:', error);
    console.error('[GovernorLLM] Raw response:', response);
    throw new Error(`Failed to parse LLM directive response: ${error}`);
  }
}

/**
 * Request crisis response from LLM for a soul agent
 *
 * @param governor Governor entity handling crisis
 * @param crisis Crisis details
 * @param tier Governor's political tier
 * @param world World instance
 * @returns Crisis response with action plan
 */
export async function requestGovernorCrisisResponse(
  governor: Entity,
  crisis: Crisis,
  tier: PoliticalTier,
  world: World
): Promise<CrisisResponse> {
  if (!llmDecisionQueue || !governorPromptBuilder) {
    throw new Error('GovernorLLM not initialized - call initializeGovernorLLM first');
  }

  // Build prompt
  const prompt = governorPromptBuilder.buildCrisisPrompt(governor, crisis, tier, world);

  // Request decision from LLM
  const customConfig = getCustomLLMConfig(governor);
  const response = await llmDecisionQueue.requestDecision(governor.id, prompt, customConfig);

  // Parse response
  try {
    const parsed = JSON.parse(response);

    // Validate response structure
    if (!parsed.action || !['handle_locally', 'escalate', 'request_assistance'].includes(parsed.action)) {
      throw new Error(`Invalid action: ${parsed.action}`);
    }

    if (!parsed.reasoning || typeof parsed.reasoning !== 'string') {
      throw new Error('Missing or invalid reasoning');
    }

    return {
      action: parsed.action,
      local_measures: parsed.local_measures,
      escalation_target: parsed.escalation_target,
      assistance_needed: parsed.assistance_needed,
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    console.error('[GovernorLLM] Failed to parse crisis response:', error);
    console.error('[GovernorLLM] Raw response:', response);
    throw new Error(`Failed to parse LLM crisis response: ${error}`);
  }
}

/**
 * Generate fallback vote when LLM unavailable
 *
 * Uses simple rule-based logic based on agent personality and proposal context
 *
 * @param member Parliament member entity
 * @param proposal Proposal being voted on
 * @param context Nation context
 * @returns Fallback vote
 */
export function generateFallbackVote(
  member: Entity,
  proposal: Proposal,
  context: NationContext
): Vote {
  // Get personality traits if available
  const personality = member.components?.get('personality') as
    | {
        traits?: string[];
        openness?: number;
        conscientiousness?: number;
        agreeableness?: number;
      }
    | undefined;

  // Default to neutral vote if no personality data
  if (!personality) {
    return {
      agentId: member.id,
      stance: 'abstain',
      weight: 1.0,
      reasoning: 'No personality data available for informed decision',
    };
  }

  // Simple rule-based voting logic
  const traits = personality.traits ?? [];
  const openness = personality.openness ?? 0.5;
  const conscientiousness = personality.conscientiousness ?? 0.5;
  const agreeableness = personality.agreeableness ?? 0.5;

  // Calculate vote based on proposal type and agent traits
  let approvalScore = 0.5; // Start neutral

  // Economic proposals
  if (proposal.topic.toLowerCase().includes('tax') || proposal.topic.toLowerCase().includes('economic')) {
    // Conscientious agents prefer fiscal responsibility
    approvalScore += (conscientiousness - 0.5) * 0.3;

    // Check economic health - vote against tax increases if economy is weak
    if (context.economy.gdp < 1000000 && proposal.topic.toLowerCase().includes('increase')) {
      approvalScore -= 0.2;
    }
  }

  // Military proposals
  if (proposal.topic.toLowerCase().includes('military') || proposal.topic.toLowerCase().includes('war')) {
    // Agreeable agents prefer peace
    approvalScore -= (agreeableness - 0.5) * 0.4;

    // Favor military proposals if under threat
    if (context.military.deployments.length > 0) {
      approvalScore += 0.3;
    }
  }

  // Social/reform proposals
  if (proposal.topic.toLowerCase().includes('reform') || proposal.topic.toLowerCase().includes('social')) {
    // Open agents favor change and reform
    approvalScore += (openness - 0.5) * 0.4;
  }

  // Determine stance from approval score
  let stance: 'approve' | 'reject' | 'abstain';
  if (approvalScore > 0.6) {
    stance = 'approve';
  } else if (approvalScore < 0.4) {
    stance = 'reject';
  } else {
    stance = 'abstain';
  }

  return {
    agentId: member.id,
    stance,
    weight: 1.0,
    reasoning: `Fallback vote based on personality traits: ${traits.join(', ')}`,
  };
}

/**
 * Get custom LLM config for a governor (if they have custom provider settings)
 */
function getCustomLLMConfig(governor: Entity): any {
  const customLLM = governor.components?.get('custom_llm') as
    | {
        baseUrl?: string;
        model?: string;
        apiKey?: string;
        customHeaders?: Record<string, string>;
      }
    | undefined;

  return customLLM;
}

/**
 * Execute directive interpretation
 *
 * Takes the LLM's interpretation and applies it to the world state
 */
export function executeDirectiveInterpretation(
  governor: Entity,
  directive: DelegationChain,
  interpretation: DirectiveInterpretation,
  world: World
): void {
  switch (interpretation.action) {
    case 'implement':
      // Update governor's governance component with new priority
      // This would be implemented based on specific governance component structure
      console.log(
        `[GovernorLLM] ${governor.id} implementing directive: ${directive.directive}`
      );
      console.log(`[GovernorLLM] Implementation plan: ${interpretation.implementation_plan}`);
      // TODO: Update appropriate governance component (VillageGovernance, ProvinceGovernance, etc.)
      break;

    case 'delegate':
      // Find lower-tier entities and delegate to them
      console.log(
        `[GovernorLLM] ${governor.id} delegating directive to ${interpretation.delegation_target}`
      );
      // TODO: Find entities at target tier and create new delegation chain
      break;

    case 'negotiate':
      // Initiate negotiation with higher tier
      console.log(
        `[GovernorLLM] ${governor.id} requesting negotiation on directive`
      );
      console.log(`[GovernorLLM] Negotiation points:`, interpretation.negotiation_points);
      // TODO: Create negotiation request event
      break;

    case 'refuse':
      // Refuse directive (risky!)
      console.warn(
        `[GovernorLLM] ${governor.id} REFUSING directive from ${directive.origin}`
      );
      console.warn(`[GovernorLLM] Refusal reason: ${interpretation.refusal_reason}`);
      // This could trigger sanctions or removal from office
      // TODO: Emit event for higher tier to respond to refusal
      break;
  }
}

/**
 * Find governor entity at a specific political tier
 *
 * @param tier Political tier to search for
 * @param world World instance
 * @returns Governor entity at that tier, or null if not found
 */
export function findGovernorAtTier(tier: PoliticalTier, world: World): Entity | null {
  // Import component types
  const { ComponentType: CT } = require('../types/ComponentType.js');

  // Map tier to component type
  const componentTypeMap: Record<PoliticalTier, string> = {
    village: CT.VillageGovernance,
    city: CT.CityDirector,
    province: CT.ProvinceGovernance,
    nation: CT.NationGovernance,
    empire: CT.EmpireGovernance,
    federation: CT.FederationGovernance || CT.EmpireGovernance, // Fallback if not defined
    galactic_council: CT.GalacticCouncil,
  };

  const componentType = componentTypeMap[tier];
  if (!componentType) {
    console.error(`[GovernorLLM] Unknown tier: ${tier}`);
    return null;
  }

  // Query for entities with this governance component
  const entities = world.query().with(componentType).executeEntities();

  // Return first entity (in future, could have multiple governors at same tier)
  const firstEntity = entities[0];
  return firstEntity !== undefined ? firstEntity : null;
}

/**
 * Add crisis to governor's crisis queue
 *
 * @param governor Governor entity
 * @param crisis Crisis to add
 * @param world World instance
 */
export function addCrisisToGovernorQueue(
  governor: Entity,
  crisis: Crisis,
  world: World
): void {
  // Find governance component
  const { ComponentType: CT } = require('../types/ComponentType.js');

  // Try to find any governance component on this entity
  for (const componentType of [
    CT.VillageGovernance,
    CT.ProvinceGovernance,
    CT.NationGovernance,
    CT.EmpireGovernance,
    CT.GalacticCouncil,
  ]) {
    const governance = governor.components?.get(componentType) as any;
    if (governance) {
      // Add crisis to queue if the component has a crisis array
      if (Array.isArray(governance.activeCrises)) {
        governance.activeCrises.push(crisis);
        console.log(
          `[GovernorLLM] Added crisis ${crisis.id} to ${governor.id}'s queue (${governance.activeCrises.length} total)`
        );
        return;
      }
    }
  }

  console.warn(
    `[GovernorLLM] Could not find governance component with activeCrises array on ${governor.id}`
  );
}
