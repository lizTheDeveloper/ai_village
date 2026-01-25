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
  GovernorDecision,
} from '../components/GovernorComponent.js';
import type { PoliticalTier } from '../governance/types.js';
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
  VillageContext,
} from '../governance/GovernorContextBuilders.js';
import type { LLMDecisionQueue } from '../decision/LLMDecisionProcessor.js';
import { executeGovernorDecision, type ParsedGovernorDecision as ExecutorParsedDecision } from '../governance/GovernorDecisionExecutor.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Union type for all governor context types
 */
type GovernorContext =
  | GalacticCouncilContext
  | EmpireContext
  | NationContext
  | ProvinceGovernorContext
  | VillageContext;

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
  federation: {
    tier: 'federation',
    callsPerHour: 2,
    priorityLevel: 'high',
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
  city: {
    tier: 'city',
    callsPerHour: 30,
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
  federation: 36000, // 30 minutes
  empire: 18000, // 15 minutes
  nation: 12000, // 10 minutes
  province: 6000, // 5 minutes
  city: 3000, // 2.5 minutes
  village: 0, // No LLM
};

// ============================================================================
// System
// ============================================================================

// Bitflags for active tiers (avoid Map lookups in hot path)
const TIER_FLAG_GALACTIC = 1 << 0;
const TIER_FLAG_FEDERATION = 1 << 1;
const TIER_FLAG_EMPIRE = 1 << 2;
const TIER_FLAG_NATION = 1 << 3;
const TIER_FLAG_PROVINCE = 1 << 4;
const TIER_FLAG_CITY = 1 << 5;
// Village tier (1 << 6) is never set - it's rule-based, no LLM

const TIER_TO_FLAG: Record<PoliticalTier, number> = {
  galactic_council: TIER_FLAG_GALACTIC,
  federation: TIER_FLAG_FEDERATION,
  empire: TIER_FLAG_EMPIRE,
  nation: TIER_FLAG_NATION,
  province: TIER_FLAG_PROVINCE,
  city: TIER_FLAG_CITY,
  village: 0, // Never set - rule-based
};

// Pre-allocated tier array (only LLM-enabled tiers, no village)
const LLM_ENABLED_TIERS: readonly PoliticalTier[] = [
  'galactic_council',
  'federation',
  'empire',
  'nation',
  'province',
  'city',
] as const;

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

  // LLM Decision Queue (optional - system works without it but logs warnings)
  private llmQueue: LLMDecisionQueue | null = null;

  // Track pending LLM requests by governor ID
  private pendingRequests: Map<string, { tier: PoliticalTier; requestedTick: number }> = new Map();

  // Per-tier last update tracking (using object instead of Map for speed)
  private lastTierUpdate: Record<PoliticalTier, number> = {
    galactic_council: 0,
    federation: 0,
    empire: 0,
    nation: 0,
    province: 0,
    city: 0,
    village: 0,
  };

  // Cache governor entities by tier for performance
  private governorsByTier: Map<PoliticalTier, Set<string>> = new Map();
  private cacheInvalidTick = 0;
  private readonly CACHE_LIFETIME = 200; // Rebuild cache every 10 seconds

  // Bitflags indicating which tiers have active governors (0 = no governors anywhere)
  private activeTierFlags = 0;

  // Total governor count (0 = skip all processing)
  private totalGovernorCount = 0;

  /**
   * Constructor
   * @param llmQueue Optional LLM decision queue for making LLM calls
   */
  constructor(llmQueue?: LLMDecisionQueue) {
    super();
    this.llmQueue = llmQueue ?? null;
  }

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
   *
   * Optimizations:
   * - Early exit if no governors exist (totalGovernorCount = 0)
   * - Bitflag check to skip tiers with no governors
   * - Only iterates LLM-enabled tiers (skips village)
   * - Combined interval + existence check
   */
  protected onUpdate(ctx: SystemContext): void {
    const { world } = ctx;
    const tick = world.tick;

    // Rebuild cache if expired (this sets activeTierFlags and totalGovernorCount)
    if (tick - this.cacheInvalidTick > this.CACHE_LIFETIME) {
      this.rebuildCache(world);
    }

    // FAST PATH: No governors at all? Nothing to do.
    // The activationComponents should prevent this, but belt-and-suspenders.
    if (this.totalGovernorCount === 0) {
      return;
    }

    // Poll for pending LLM responses (only if we have pending requests)
    if (this.pendingRequests.size > 0) {
      this.pollPendingResponses(world);
    }

    // FAST PATH: No LLM queue and no pending requests? Skip tier processing.
    // Governors exist but we can't process them without LLM.
    if (!this.llmQueue && this.pendingRequests.size === 0) {
      return;
    }

    // FAST PATH: No active LLM-enabled tiers? Skip tier loop entirely.
    // (activeTierFlags = 0 means only village governors, which are rule-based)
    if (this.activeTierFlags === 0) {
      return;
    }

    // Process only LLM-enabled tiers that have governors
    // Using for-of for cleaner TypeScript (no index undefined issues)
    for (const tier of LLM_ENABLED_TIERS) {
      const tierFlag = TIER_TO_FLAG[tier];

      // Skip tier if no governors at this tier (bitflag check - very fast)
      if ((this.activeTierFlags & tierFlag) === 0) {
        continue;
      }

      // Skip if interval hasn't elapsed
      const interval = UPDATE_INTERVALS[tier];
      if (tick - this.lastTierUpdate[tier] < interval) {
        continue;
      }

      // Process this tier
      this.processGovernorTier(tier, world);
      this.lastTierUpdate[tier] = tick;
    }
  }

  /**
   * Poll for pending LLM responses and process them
   */
  private pollPendingResponses(world: World): void {
    if (!this.llmQueue) {
      return; // No queue, nothing to poll
    }

    // Check each pending request
    for (const [governorId, requestInfo] of this.pendingRequests) {
      const response = this.llmQueue.getDecision(governorId);
      if (response) {
        // Got a response - process it
        const governor = world.getEntity(governorId);
        if (governor) {
          this.handleLLMResponse(governor as EntityImpl, response, requestInfo.tier, world);
        }
        this.pendingRequests.delete(governorId);
      }
    }
  }

  /**
   * Handle LLM response for a governor
   */
  private handleLLMResponse(
    governor: EntityImpl,
    response: string,
    tier: PoliticalTier,
    world: World
  ): void {
    const govComp = governor.getComponent<GovernorComponent>(CT.Governor);
    if (!govComp) {
      return;
    }

    // Parse the decision
    const decision = this.parseGovernorDecision(response);
    if (!decision) {
      console.error(`[GovernorDecisionSystem] Failed to parse LLM response for governor ${governor.id}`);
      recordDecision(
        govComp,
        'parse_error',
        'Failed to parse LLM response',
        world.tick
      );
      return;
    }

    // Execute the decision
    this.executeDecision(governor, decision, world);

    // Record successful decision
    recordDecision(
      govComp,
      decision.action.type,
      decision.reasoning,
      world.tick
    );

    // Emit decision made event
    world.eventBus.emit({
      type: 'governor:decision_made',
      source: governor.id,
      data: {
        governorId: governor.id,
        tier,
        decisionType: decision.action.type,
        reasoning: decision.reasoning,
        tick: world.tick,
      },
    });
  }

  /**
   * Process all governors at a specific tier
   */
  /**
   * Process all governors at a specific tier.
   * Called from onUpdate only when:
   * - Tier has governors (bitflag check passed)
   * - Update interval has elapsed
   */
  private processGovernorTier(tier: PoliticalTier, world: World): void {
    // Get cached governor IDs (guaranteed to exist by onUpdate checks)
    const governorIds = this.governorsByTier.get(tier);
    if (!governorIds) {
      return; // Should not happen, but defensive
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

    // Check if we already have a pending request for this governor
    if (this.pendingRequests.has(governor.id)) {
      return; // Already waiting for a response
    }

    // Build context for this governor's tier
    const context = this.buildGovernorContext(governor, govComp, world);

    // Build prompt combining personality + tier-specific template
    const prompt = this.buildGovernorPrompt(governor, govComp, context);

    // Get LLM budget for this tier
    const budget = TIER_LLM_BUDGETS[govComp.tier];

    // Queue LLM request if queue is available
    if (this.llmQueue) {
      // Track pending request
      this.pendingRequests.set(governor.id, {
        tier: govComp.tier,
        requestedTick: world.tick,
      });

      // Fire-and-forget LLM request (response will be polled in next update)
      this.llmQueue.requestDecision(governor.id, prompt).catch((error) => {
        console.error(`[GovernorDecisionSystem] LLM request failed for governor ${governor.id}:`, error);
        this.pendingRequests.delete(governor.id);
        recordDecision(
          govComp,
          'llm_error',
          `LLM request failed: ${error}`,
          world.tick
        );
      });

      // Record decision as pending
      recordDecision(
        govComp,
        'llm_decision_pending',
        `Awaiting LLM response for ${govComp.tier} decision`,
        world.tick
      );
    } else {
      // No LLM queue available - log warning (development mode)
      console.warn(
        `[GovernorDecisionSystem] No LLM queue available for governor ${governor.id} (${govComp.tier}). ` +
        `Governance decisions require LLMDecisionQueue to be injected.`
      );
    }

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
  ): GalacticCouncilContext {
    try {
      return buildGalacticCouncilContext(governor, world);
    } catch (error) {
      // Fallback to minimal context if council component not found
      console.warn(`[GovernorDecisionSystem] Failed to build galactic council context: ${error}`);
      return {
        galaxyState: {
          totalStars: 0,
          totalPlanets: 0,
          totalPopulation: politicalEntity?.population ?? 0,
          speciesCount: 0,
        },
        speciesRepresented: [],
        currentCrises: [],
        proposals: [],
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
  ): EmpireContext {
    try {
      return buildEmpireContext(governor, world);
    } catch (error) {
      // Fallback to minimal context if empire component not found
      console.warn(`[GovernorDecisionSystem] Failed to build empire context: ${error}`);
      return {
        empire: {
          name: 'Unknown Empire',
          population: politicalEntity?.population ?? 0,
          territory: 0,
          species: 'Unknown',
        },
        nations: [],
        diplomaticRelations: [],
        threats: [],
        advisorRecommendations: [],
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
  ): NationContext {
    try {
      return buildNationContext(governor, world);
    } catch (error) {
      // Fallback to minimal context if nation component not found
      console.warn(`[GovernorDecisionSystem] Failed to build nation context: ${error}`);
      return {
        nation: {
          name: 'Unknown Nation',
          governmentType: 'oligarchy',
          population: politicalEntity?.population ?? 0,
          territory: 0,
        },
        provinces: [],
        economy: {
          gdp: 0,
          taxRate: 0,
          reserves: {},
        },
        military: {
          strength: 0,
          deployments: [],
        },
        neighbors: [],
        pendingProposals: [],
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
  ): ProvinceGovernorContext {
    try {
      return buildProvinceGovernorContext(governor, world);
    } catch (error) {
      // Fallback to minimal context if province component not found
      console.warn(`[GovernorDecisionSystem] Failed to build province context: ${error}`);
      return {
        population: politicalEntity?.population ?? 0,
        foodSupply: 0,
        foodDaysRemaining: 0,
        keyResources: [],
        criticalNeeds: [],
        strategicFocus: 'balanced',
        provinceData: {
          name: 'Unknown Province',
          tier: 'village',
          buildings: [],
          neighbors: [],
        },
        warehouseData: {
          totalCapacity: 0,
          usedCapacity: 0,
          utilizationPercent: 0,
          resourceStockpiles: {},
          criticalShortages: [],
          surpluses: [],
        },
        nationalDirectives: [],
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
  ): VillageContext {
    try {
      return buildVillageContext(governor, world);
    } catch (error) {
      // Fallback to minimal context if village component not found
      console.warn(`[GovernorDecisionSystem] Failed to build village context: ${error}`);
      return {
        village: {
          name: 'Unknown Village',
          population: politicalEntity?.population ?? 0,
          governanceType: 'elder_council',
        },
        demographics: {
          children: 0,
          adults: 0,
          elders: 0,
        },
        resources: new Map(),
        proposals: [],
        laws: [],
        neighbors: [],
      };
    }
  }

  /**
   * Build prompt for governor decision
   */
  private buildGovernorPrompt(
    governor: EntityImpl,
    govComp: GovernorComponent,
    context: GovernorContext
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

    // Execute decision using the executor
    const executorDecision: ExecutorParsedDecision = {
      reasoning: decision.reasoning,
      action: decision.action,
      speech: decision.speech,
      proclamation: decision.proclamation,
    };

    const result = executeGovernorDecision(governor, executorDecision, world);

    if (!result.success) {
      console.error(
        `[GovernorDecisionSystem] Failed to execute decision for governor ${governor.id}: ${result.error}`
      );
      recordDecision(
        govComp,
        'execution_error',
        `Decision execution failed: ${result.error}`,
        world.tick
      );
      return;
    }

    // Log successful execution
    console.log(
      `[GovernorDecisionSystem] Executed decision for governor ${governor.id} (${govComp.tier}): ` +
      `${decision.action.type} - ${result.stateChanges.join(', ')}`
    );

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
   * Rebuild governor cache by tier.
   * Sets bitflags for which tiers have governors (enables fast path checks).
   * Called every CACHE_LIFETIME ticks or when cache is invalidated.
   */
  private rebuildCache(world: World): void {
    // Reset state
    this.governorsByTier.clear();
    this.activeTierFlags = 0;
    this.totalGovernorCount = 0;

    // Query all governors (single query, no per-tier queries)
    const governors = world.query().with(CT.Governor).executeEntities();

    for (const governor of governors) {
      const govComp = governor.getComponent<GovernorComponent>(CT.Governor);
      if (!govComp) {
        continue;
      }

      // Get or create Set for this tier
      let tierSet = this.governorsByTier.get(govComp.tier);
      if (!tierSet) {
        tierSet = new Set();
        this.governorsByTier.set(govComp.tier, tierSet);
      }

      tierSet.add(governor.id);
      this.totalGovernorCount++;

      // Set bitflag for this tier (enables fast path in onUpdate)
      const flag = TIER_TO_FLAG[govComp.tier];
      this.activeTierFlags |= flag;
    }

    this.cacheInvalidTick = world.tick;
  }

  /**
   * Invalidate governor cache (call when governors are added/removed).
   * Next update will rebuild the cache with fresh data.
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
