/**
 * GovernorDecisionSystem - Processes governor LLM decisions at all political tiers
 *
 * Phase 6 (AI Governance): LLM agents govern political entities at each tier
 * of the grand strategy system, making context-appropriate decisions that
 * cascade down through the hierarchy.
 *
 * Update Intervals by Tier:
 * - galactic_council: 72000 ticks (1 hour)
 * - empire: 36000 ticks (30 minutes)
 * - nation: 12000 ticks (10 minutes)
 * - province: 6000 ticks (5 minutes)
 * - village: 0 (no LLM - rule-based)
 *
 * LLM Budgets by Tier:
 * - galactic_council: 1 call/hour, critical priority, Sonnet model
 * - empire: 5 calls/hour, high priority, Sonnet model
 * - nation: 10 calls/hour, high priority, Haiku model
 * - province: 20 calls/hour, normal priority, Haiku model
 *
 * System Responsibilities:
 * 1. Tier processing: Process each tier at appropriate intervals
 * 2. Context building: Build appropriate context for tier (delegates to context builders)
 * 3. Prompt construction: Build prompts with personality + tier-specific template
 * 4. LLM scheduling: Queue requests via LLMScheduler
 * 5. Decision parsing: Parse JSON response into actions
 * 6. Decision execution: Execute actions (delegate to action handlers)
 * 7. Decision recording: Record outcome for personality development
 *
 * Priority: 850 (late, after world state updates)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type {
  GovernorComponent,
  PoliticalTier,
  GovernorDecision,
} from '../components/GovernorComponent.js';
import {
  canMakeDecision,
  recordDecision,
} from '../components/GovernorComponent.js';
import type { PoliticalEntityComponent } from '../components/PoliticalEntityComponent.js';
import {
  buildNationContext,
  buildEmpireContext,
  buildGalacticCouncilContext,
  buildProvinceGovernorContext,
  buildVillageContext,
} from '../governance/GovernorContextBuilders.js';
import {
  buildGalacticCouncilPrompt,
  buildEmperorPrompt,
  buildParliamentPrompt,
  buildMayorPrompt,
  buildGovernorPersonalityContext,
  buildCrisisPrompt,
} from '../governance/GovernorPromptTemplates.js';
import type {
  GalacticCouncilContext,
  EmpireContext,
  NationContext,
  ProvinceGovernorContext,
} from '../governance/GovernorContextBuilders.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Priority level for LLM requests
 */
type LLMPriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * LLM budget configuration per tier
 */
interface TierLLMBudget {
  tier: PoliticalTier;
  callsPerHour: number;
  priorityLevel: LLMPriority;
  modelRecommended: string;
}

/**
 * Governor decision action parsed from LLM response
 */
interface GovernorDecisionAction {
  type: string;
  target?: string;
  parameters?: Record<string, unknown>;
  vote?: 'approve' | 'reject' | 'amend';
  amendment?: string;
}

/**
 * Parsed governor decision from LLM
 */
interface ParsedGovernorDecision {
  reasoning: string;
  action: GovernorDecisionAction;
  speech?: string;
  proclamation?: string;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * LLM budgets by tier (from spec: 11-LLM-GOVERNORS.md)
 */
const TIER_LLM_BUDGETS: Record<PoliticalTier, TierLLMBudget> = {
  galactic_council: {
    tier: 'galactic_council',
    callsPerHour: 1,
    priorityLevel: 'critical',
    modelRecommended: 'claude-3-5-sonnet-20241022',
  },
  empire: {
    tier: 'empire',
    callsPerHour: 5,
    priorityLevel: 'high',
    modelRecommended: 'claude-3-5-sonnet-20241022',
  },
  nation: {
    tier: 'nation',
    callsPerHour: 10,
    priorityLevel: 'high',
    modelRecommended: 'claude-3-5-haiku-20241022',
  },
  province: {
    tier: 'province',
    callsPerHour: 20,
    priorityLevel: 'normal',
    modelRecommended: 'claude-3-5-haiku-20241022',
  },
  village: {
    tier: 'village',
    callsPerHour: 0,
    priorityLevel: 'low',
    modelRecommended: 'none',
  },
};

/**
 * Update intervals by tier (in ticks at 20 TPS)
 */
const UPDATE_INTERVALS: Record<PoliticalTier, number> = {
  galactic_council: 72000, // 1 hour
  empire: 36000, // 30 minutes
  nation: 12000, // 10 minutes
  province: 6000, // 5 minutes
  village: 0, // No LLM
};

// ============================================================================
// System
// ============================================================================

export class GovernorDecisionSystem extends BaseSystem {
  public readonly id: SystemId = 'governor_decision';
  public readonly priority: number = 850; // Late priority (after world state updates)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Governor];

  // Lazy activation: Skip entire system when no governors exist in world
  public readonly activationComponents = [CT.Governor] as const;

  public readonly metadata = {
    category: 'infrastructure' as const,
    description: 'Processes governor LLM decisions at all political tiers',
    dependsOn: [] as SystemId[],
    writesComponents: [CT.Governor, CT.PoliticalEntity] as const,
  };

  // Per-tier last update tracking
  private lastTierUpdate: Map<PoliticalTier, number> = new Map();

  // Cache governor entities by tier for performance
  private governorsByTier: Map<PoliticalTier, Set<string>> = new Map();
  private cacheInvalidTick = 0;
  private readonly CACHE_LIFETIME = 200; // Rebuild cache every 10 seconds

  /**
   * Initialize event listeners
   */
  protected onInitialize(_world: World, eventBus: EventBus): void {
    // Listen for governor appointment/removal events
    eventBus.on('governor:appointed', (event) => {
      this.invalidateCache();
    });

    eventBus.on('governor:removed', (event) => {
      this.invalidateCache();
    });
  }

  /**
   * Update all governor tiers
   */
  protected onUpdate(ctx: SystemContext): void {
    const { world } = ctx;

    // Rebuild cache if expired
    if (world.tick - this.cacheInvalidTick > this.CACHE_LIFETIME) {
      this.rebuildCache(world);
    }

    // Process each tier
    const tiers: PoliticalTier[] = [
      'galactic_council',
      'empire',
      'nation',
      'province',
      'village',
    ];

    for (const tier of tiers) {
      this.processGovernorTier(tier, world);
    }
  }

  /**
   * Process all governors at a specific tier
   */
  private processGovernorTier(tier: PoliticalTier, world: World): void {
    const interval = UPDATE_INTERVALS[tier];
    if (interval === 0) {
      // No LLM for village tier
      return;
    }

    // Check if enough time has passed since last update
    const lastTick = this.lastTierUpdate.get(tier) ?? 0;
    if (world.tick - lastTick < interval) {
      return;
    }

    this.lastTierUpdate.set(tier, world.tick);

    // Get all governors at this tier (from cache)
    const governorIds = this.governorsByTier.get(tier);
    if (!governorIds || governorIds.size === 0) {
      return; // Early exit if no governors at this tier
    }

    // Process each governor
    for (const governorId of governorIds) {
      const governor = world.getEntity(governorId);
      if (!governor) {
        // Governor entity was deleted - invalidate cache
        this.invalidateCache();
        continue;
      }

      this.processGovernorDecision(governor as EntityImpl, world);
    }
  }

  /**
   * Process a single governor's decision
   */
  private processGovernorDecision(governor: EntityImpl, world: World): void {
    const govComp = governor.getComponent<GovernorComponent>(CT.Governor);
    if (!govComp) {
      return;
    }

    // Check if governor can make a decision (cooldown elapsed)
    if (!canMakeDecision(govComp, world.tick)) {
      return;
    }

    // Build context for this governor's tier
    const context = this.buildGovernorContext(governor, govComp, world);

    // Build prompt combining personality + tier-specific template
    const prompt = this.buildGovernorPrompt(governor, govComp, context);

    // Get LLM budget for this tier
    const budget = TIER_LLM_BUDGETS[govComp.tier];

    // Queue LLM request (fire-and-forget for now - polling will be added later)
    // TODO: Integrate with LLMScheduler for proper queue management
    // For Phase 1 implementation, we'll log the decision request
    console.warn(
      `[GovernorDecisionSystem] LLM integration pending for governor ${governor.id} (${govComp.tier})`
    );

    // Record decision as pending
    recordDecision(
      govComp,
      'llm_decision_pending',
      `Awaiting LLM response for ${govComp.tier} decision`,
      world.tick
    );

    // Emit event
    world.eventBus.emit({
      type: 'governor:decision_requested',
      source: governor.id,
      data: {
        governorId: governor.id,
        tier: govComp.tier,
        tick: world.tick,
      },
    });

    // TODO: Implement LLM call and decision execution
    // This will be completed in Phase 2 when integrating with LLMScheduler
  }

  /**
   * Build context for governor decision-making
   */
  private buildGovernorContext(
    governor: EntityImpl,
    govComp: GovernorComponent,
    world: World
  ): Record<string, unknown> {
    // Get political entity if it exists
    const politicalEntity = this.findPoliticalEntity(govComp.jurisdiction, world);

    // Build tier-specific context
    switch (govComp.tier) {
      case 'galactic_council':
        return this.buildGalacticCouncilContext(governor, govComp, politicalEntity, world);
      case 'empire':
        return this.buildEmpireContext(governor, govComp, politicalEntity, world);
      case 'nation':
        return this.buildNationContext(governor, govComp, politicalEntity, world);
      case 'province':
        return this.buildProvinceContext(governor, govComp, politicalEntity, world);
      case 'village':
        return this.buildVillageContext(governor, govComp, politicalEntity, world);
      default:
        throw new Error(`Unknown tier: ${govComp.tier}`);
    }
  }

  /**
   * Find political entity by jurisdiction ID
   */
  private findPoliticalEntity(
    jurisdictionId: string,
    world: World
  ): PoliticalEntityComponent | null {
    const entity = world.getEntity(jurisdictionId);
    if (!entity) {
      return null;
    }

    return entity.getComponent<PoliticalEntityComponent>(CT.PoliticalEntity) ?? null;
  }

  /**
   * Build galactic council context
   */
  private buildGalacticCouncilContext(
    governor: EntityImpl,
    govComp: GovernorComponent,
    politicalEntity: PoliticalEntityComponent | null,
    world: World
  ): Record<string, unknown> {
    try {
      return buildGalacticCouncilContext(governor, world) as unknown as Record<string, unknown>;
    } catch (error) {
      // Fallback to minimal context if council component not found
      console.warn(`[GovernorDecisionSystem] Failed to build galactic council context: ${error}`);
      return {
        tier: 'galactic_council',
        jurisdiction: govComp.jurisdiction,
        population: politicalEntity?.population ?? 0,
        crises: politicalEntity?.pendingCrises ?? [],
        directives: politicalEntity?.pendingDirectives ?? [],
      };
    }
  }

  /**
   * Build empire context
   */
  private buildEmpireContext(
    governor: EntityImpl,
    govComp: GovernorComponent,
    politicalEntity: PoliticalEntityComponent | null,
    world: World
  ): Record<string, unknown> {
    try {
      return buildEmpireContext(governor, world) as unknown as Record<string, unknown>;
    } catch (error) {
      // Fallback to minimal context if empire component not found
      console.warn(`[GovernorDecisionSystem] Failed to build empire context: ${error}`);
      return {
        tier: 'empire',
        jurisdiction: govComp.jurisdiction,
        population: politicalEntity?.population ?? 0,
        nations: [],
        crises: politicalEntity?.pendingCrises ?? [],
        directives: politicalEntity?.pendingDirectives ?? [],
      };
    }
  }

  /**
   * Build nation context
   */
  private buildNationContext(
    governor: EntityImpl,
    govComp: GovernorComponent,
    politicalEntity: PoliticalEntityComponent | null,
    world: World
  ): Record<string, unknown> {
    try {
      return buildNationContext(governor, world) as unknown as Record<string, unknown>;
    } catch (error) {
      // Fallback to minimal context if nation component not found
      console.warn(`[GovernorDecisionSystem] Failed to build nation context: ${error}`);
      return {
        tier: 'nation',
        jurisdiction: govComp.jurisdiction,
        population: politicalEntity?.population ?? 0,
        provinces: [],
        crises: politicalEntity?.pendingCrises ?? [],
        directives: politicalEntity?.pendingDirectives ?? [],
      };
    }
  }

  /**
   * Build province context
   */
  private buildProvinceContext(
    governor: EntityImpl,
    govComp: GovernorComponent,
    politicalEntity: PoliticalEntityComponent | null,
    world: World
  ): Record<string, unknown> {
    try {
      return buildProvinceGovernorContext(governor, world) as unknown as Record<string, unknown>;
    } catch (error) {
      // Fallback to minimal context if province component not found
      console.warn(`[GovernorDecisionSystem] Failed to build province context: ${error}`);
      return {
        tier: 'province',
        jurisdiction: govComp.jurisdiction,
        population: politicalEntity?.population ?? 0,
        cities: [],
        crises: politicalEntity?.pendingCrises ?? [],
        directives: politicalEntity?.pendingDirectives ?? [],
      };
    }
  }

  /**
   * Build village context
   */
  private buildVillageContext(
    governor: EntityImpl,
    govComp: GovernorComponent,
    politicalEntity: PoliticalEntityComponent | null,
    world: World
  ): Record<string, unknown> {
    try {
      return buildVillageContext(governor, world) as unknown as Record<string, unknown>;
    } catch (error) {
      // Fallback to minimal context if village component not found
      console.warn(`[GovernorDecisionSystem] Failed to build village context: ${error}`);
      return {
        tier: 'village',
        jurisdiction: govComp.jurisdiction,
        population: politicalEntity?.population ?? 0,
      };
    }
  }

  /**
   * Build prompt for governor decision
   */
  private buildGovernorPrompt(
    governor: EntityImpl,
    govComp: GovernorComponent,
    context: Record<string, unknown>
  ): string {
    // Build personality context (if available)
    const personalityContext = this.buildPersonalityContext(governor, govComp);

    // Build tier-specific prompt template
    const tierPrompt = this.buildTierPromptTemplate(govComp.tier, context);

    // Combine personality + tier prompt
    return personalityContext ? `${personalityContext}\n\n${tierPrompt}` : tierPrompt;
  }

  /**
   * Build personality context from governor's history and ideology
   */
  private buildPersonalityContext(governor: EntityImpl, govComp: GovernorComponent): string {
    // Use the prompt template function
    return buildGovernorPersonalityContext(governor);
  }

  /**
   * Build tier-specific prompt template
   */
  private buildTierPromptTemplate(tier: PoliticalTier, context: Record<string, unknown>): string {
    // Map each tier to its prompt template
    switch (tier) {
      case 'galactic_council':
        return buildGalacticCouncilPrompt(context as unknown as GalacticCouncilContext);
      case 'empire':
        return buildEmperorPrompt(context as unknown as EmpireContext);
      case 'nation':
        // Parliament member role - default to 'member'
        return buildParliamentPrompt(context as unknown as NationContext, 'member');
      case 'province':
        return buildMayorPrompt(context as unknown as ProvinceGovernorContext);
      case 'village':
        // No LLM for village tier
        return '';
      default:
        throw new Error(`Unknown tier: ${tier}`);
    }
  }

  /**
   * Parse governor decision from LLM response
   */
  private parseGovernorDecision(response: string): ParsedGovernorDecision | null {
    try {
      // Extract JSON from response (may be wrapped in markdown)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[GovernorDecisionSystem] No JSON found in LLM response');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]) as ParsedGovernorDecision;

      // Validate required fields
      if (!parsed.reasoning || !parsed.action || !parsed.action.type) {
        console.error('[GovernorDecisionSystem] Invalid decision format:', parsed);
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('[GovernorDecisionSystem] Failed to parse LLM response:', error);
      return null;
    }
  }

  /**
   * Execute governor decision
   */
  private executeDecision(
    governor: EntityImpl,
    decision: ParsedGovernorDecision,
    world: World
  ): void {
    const govComp = governor.getComponent<GovernorComponent>(CT.Governor);
    if (!govComp) {
      return;
    }

    // Route action to appropriate handler
    this.executeActionByType(governor, govComp, decision, world);

    // Emit decision executed event
    world.eventBus.emit({
      type: 'governor:decision_executed',
      source: governor.id,
      data: {
        governorId: governor.id,
        tier: govComp.tier,
        decisionType: decision.action.type,
        reasoning: decision.reasoning,
        tick: world.tick,
      },
    });
  }

  /**
   * Route action to appropriate handler and emit typed events
   */
  private executeActionByType(
    governor: EntityImpl,
    govComp: GovernorComponent,
    decision: ParsedGovernorDecision,
    world: World
  ): void {
    const action = decision.action;

    // All actions emit governor:action_executed event
    // Future: Additional systems can listen to these events and implement actual logic
    switch (action.type) {
      case 'set_policy':
        world.eventBus.emit({
          type: 'governor:action_executed',
          source: governor.id,
          data: {
            governorId: governor.id,
            tier: govComp.tier,
            actionType: 'set_policy',
            tick: world.tick,
          },
        });
        break;

      case 'allocate_resources':
        world.eventBus.emit({
          type: 'governor:action_executed',
          source: governor.id,
          data: {
            governorId: governor.id,
            tier: govComp.tier,
            actionType: 'allocate_resources',
            tick: world.tick,
          },
        });
        break;

      case 'declare_war':
        world.eventBus.emit({
          type: 'governor:action_executed',
          source: governor.id,
          data: {
            governorId: governor.id,
            tier: govComp.tier,
            actionType: 'declare_war',
            tick: world.tick,
          },
        });
        break;

      case 'propose_alliance':
        world.eventBus.emit({
          type: 'governor:action_executed',
          source: governor.id,
          data: {
            governorId: governor.id,
            tier: govComp.tier,
            actionType: 'propose_alliance',
            tick: world.tick,
          },
        });
        break;

      case 'respond_to_crisis':
        world.eventBus.emit({
          type: 'governor:action_executed',
          source: governor.id,
          data: {
            governorId: governor.id,
            tier: govComp.tier,
            actionType: 'respond_to_crisis',
            tick: world.tick,
          },
        });
        break;

      case 'complete_directive':
        world.eventBus.emit({
          type: 'governor:action_executed',
          source: governor.id,
          data: {
            governorId: governor.id,
            tier: govComp.tier,
            actionType: 'complete_directive',
            tick: world.tick,
          },
        });
        break;

      case 'vote_on_proposal':
        world.eventBus.emit({
          type: 'governor:action_executed',
          source: governor.id,
          data: {
            governorId: governor.id,
            tier: govComp.tier,
            actionType: 'vote_on_proposal',
            tick: world.tick,
          },
        });
        break;

      default:
        // Unknown action type - log warning
        console.warn(
          `[GovernorDecisionSystem] Unknown action type: ${action.type} for governor ${governor.id}`
        );
        break;
    }
  }

  /**
   * Rebuild governor cache by tier
   */
  private rebuildCache(world: World): void {
    this.governorsByTier.clear();

    const governors = world.query().with(CT.Governor).executeEntities();

    for (const governor of governors) {
      const govComp = governor.getComponent<GovernorComponent>(CT.Governor);
      if (!govComp) {
        continue;
      }

      if (!this.governorsByTier.has(govComp.tier)) {
        this.governorsByTier.set(govComp.tier, new Set());
      }

      this.governorsByTier.get(govComp.tier)!.add(governor.id);
    }

    this.cacheInvalidTick = world.tick;
  }

  /**
   * Invalidate governor cache (call when governors are added/removed)
   */
  private invalidateCache(): void {
    this.cacheInvalidTick = 0;
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: GovernorDecisionSystem | null = null;

export function getGovernorDecisionSystem(): GovernorDecisionSystem {
  if (!systemInstance) {
    systemInstance = new GovernorDecisionSystem();
  }
  return systemInstance;
}
