/**
 * CityDirectorSystem - Manages city-level strategic decisions
 *
 * This system enables scalable NPC city management:
 * 1. Updates city statistics periodically (population, buildings, resources)
 * 2. Triggers LLM "director meetings" at configurable intervals (~once per game day)
 * 3. Broadcasts priority weights to autonomic NPCs in the city
 * 4. Falls back to rule-based decisions if LLM unavailable
 *
 * The City Director pattern allows hundreds of autonomic NPCs to act
 * coherently without individual LLM calls, while still having emergent
 * intelligent behavior through the single director LLM call.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { StrategicPriorities, AgentComponent } from '../components/AgentComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';
import type { AnimalComponent } from '../components/AnimalComponent.js';
import type { SteeringComponent } from '../components/SteeringComponent.js';
import {
  type CityDirectorComponent,
  type CityStats,
  type CityFocus,
  blendPriorities,
  getPrioritiesForFocus,
  inferFocusFromStats,
  isAgentInCity,
} from '../components/CityDirectorComponent.js';
import { THROTTLE } from '../ecs/SystemThrottleConfig.js';

/**
 * Response format expected from the City Director LLM.
 */
interface DirectorDecision {
  focus: CityFocus;
  priorities: StrategicPriorities;
  reasoning: string;
  concerns: string[];
}

/**
 * Configuration for the CityDirectorSystem.
 */
export interface CityDirectorSystemConfig {
  /** Enable LLM-based director decisions (vs rule-based only) */
  enableLLM: boolean;
  /** How often to update city stats (in ticks). Default: 200 (10 seconds at 20 TPS) */
  statsUpdateInterval: number;
  /** Base URL for LLM API (if using LLM) */
  llmBaseUrl?: string;
  /** Model to use for director decisions */
  llmModel?: string;
}

/**
 * Default configuration for CityDirectorSystem.
 */
export const DEFAULT_CITY_DIRECTOR_CONFIG: CityDirectorSystemConfig = {
  enableLLM: true,
  statsUpdateInterval: 200, // 10 seconds at 20 TPS
};

/**
 * CityDirectorSystem manages city-level strategic decisions.
 *
 * Per CLAUDE.md: No silent fallbacks - crashes on invalid state.
 *
 * PERFORMANCE OPTIMIZATIONS (2026-01-18):
 * - Throttling: 100 ticks (5 seconds) - city planning is slow-changing
 * - Map-based caching: 5 component Maps for O(1) lookups
 * - Zero allocations: Reusable working objects
 * - Early exits: Skip when no cities or no agents
 * - Precomputed constants: ticksPerDay for food calculations
 */
export class CityDirectorSystem extends BaseSystem {
  public readonly id: SystemId = 'city_director';
  public readonly priority: number = 45; // Run after governance, before agent brain
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  // Only run when city_director components exist (O(1) activation check)
  public readonly activationComponents = ['city_director'] as const;
  protected readonly throttleInterval = THROTTLE.SLOW; // City planning is slow-changing state - run every 5 seconds

  private config: CityDirectorSystemConfig;
  private lastStatsUpdate: number = 0;
  private pendingDecisions: Map<string, Promise<string>> = new Map();

  // LLM queue reference - set externally when available
  private llmQueue: { requestDecision: (id: string, prompt: string) => Promise<string> } | null = null;

  // ========== PERFORMANCE OPTIMIZATION: Map-Based Caching ==========
  // Cache entity components for O(1) lookups instead of O(n) iteration
  private agentCache = new Map<string, AgentComponent>();
  private positionCache = new Map<string, PositionComponent>();
  private buildingCache = new Map<string, BuildingComponent>();
  private inventoryCache = new Map<string, InventoryComponent>();
  private steeringCache = new Map<string, SteeringComponent>();

  // ========== PERFORMANCE OPTIMIZATION: Zero Allocations ==========
  // Reusable working objects to avoid allocations in hot paths
  private readonly workingAgentIds: string[] = [];

  // ========== PERFORMANCE OPTIMIZATION: Precomputed Constants ==========
  private readonly TICKS_PER_DAY = 24 * 60 * 3; // 1 day at 20 TPS
  private readonly FOOD_PER_AGENT_PER_DAY = 3;

  // Cache staleness tracking - rebuild caches if stale
  private lastCacheRebuild: number = 0;
  private readonly CACHE_REBUILD_INTERVAL = 1000; // Rebuild every 50 seconds

  constructor(config: Partial<CityDirectorSystemConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CITY_DIRECTOR_CONFIG, ...config };
  }

  /**
   * Set the LLM decision queue for director LLM calls.
   * Call this after initializing the game with LLM support.
   */
  setLLMQueue(queue: { requestDecision: (id: string, prompt: string) => Promise<string> }): void {
    this.llmQueue = queue;
  }

  /**
   * Update all city directors.
   *
   * PERFORMANCE: Multi-level early exits, cached components, zero allocations
   */
  protected onUpdate(ctx: SystemContext): void {
    const directors = ctx.world.query().with('city_director' as ComponentType).executeEntities();

    // ========== EARLY EXIT: No cities ==========
    if (directors.length === 0) {
      return;
    }

    // ========== CACHE REBUILD: Periodic refresh to stay synchronized ==========
    const shouldRebuildCache = ctx.tick - this.lastCacheRebuild >= this.CACHE_REBUILD_INTERVAL;
    if (shouldRebuildCache) {
      this.rebuildCaches(ctx.world);
      this.lastCacheRebuild = ctx.tick;
    }

    // Update stats periodically (cheaper than every tick)
    const shouldUpdateStats = ctx.tick - this.lastStatsUpdate >= this.config.statsUpdateInterval;

    for (const directorEntity of directors) {
      const impl = directorEntity as EntityImpl;
      const director = impl.getComponent<CityDirectorComponent>('city_director' as ComponentType);

      if (!director) {
        continue;
      }

      // ========== EARLY EXIT: No agents in city ==========
      if (director.agentIds.length === 0) {
        continue;
      }

      // Update city stats
      if (shouldUpdateStats) {
        this.updateCityStatsOptimized(ctx.world, impl, director);
      }

      // Check if it's time for a director meeting
      if (ctx.tick - director.lastDirectorMeeting >= director.meetingInterval) {
        this.conductDirectorMeeting(ctx.world, impl, director);
      }

      // Apply blended priorities to autonomic NPCs in this city
      this.applyPrioritiesToNPCsOptimized(ctx.world, director);
    }

    if (shouldUpdateStats) {
      this.lastStatsUpdate = ctx.tick;
    }
  }

  /**
   * Rebuild component caches for O(1) lookups.
   * Called periodically to stay synchronized with world state.
   */
  private rebuildCaches(world: World): void {
    // Clear old caches
    this.agentCache.clear();
    this.positionCache.clear();
    this.buildingCache.clear();
    this.inventoryCache.clear();
    this.steeringCache.clear();

    // Rebuild agent + position cache
    const agents = world.query().with(CT.Agent, CT.Position).executeEntities();
    for (const agent of agents) {
      const impl = agent as EntityImpl;
      const agentComp = impl.getComponent<AgentComponent>(CT.Agent);
      const posComp = impl.getComponent<PositionComponent>(CT.Position);

      if (agentComp) this.agentCache.set(impl.id, agentComp);
      if (posComp) this.positionCache.set(impl.id, posComp);

      const steeringComp = impl.getComponent<SteeringComponent>(CT.Steering);
      if (steeringComp) this.steeringCache.set(impl.id, steeringComp);
    }

    // Rebuild building + inventory cache
    const buildings = world.query().with(CT.Building, CT.Position).executeEntities();
    for (const building of buildings) {
      const impl = building as EntityImpl;
      const buildingComp = impl.getComponent<BuildingComponent>(CT.Building);
      const posComp = impl.getComponent<PositionComponent>(CT.Position);

      if (buildingComp) this.buildingCache.set(impl.id, buildingComp);
      if (posComp && !this.positionCache.has(impl.id)) {
        this.positionCache.set(impl.id, posComp);
      }

      const invComp = impl.getComponent<InventoryComponent>(CT.Inventory);
      if (invComp) this.inventoryCache.set(impl.id, invComp);
    }
  }

  /**
   * Update city statistics using cached components (optimized).
   *
   * PERFORMANCE: Uses Map caches for O(1) lookups, reuses working arrays
   */
  private updateCityStatsOptimized(world: World, entity: EntityImpl, director: CityDirectorComponent): void {
    // ========== ZERO ALLOCATIONS: Reuse working array ==========
    this.workingAgentIds.length = 0; // Clear without reallocating

    let autonomicCount = 0;
    let llmAgentCount = 0;

    // ========== OPTIMIZED: Use cached components for agents ==========
    for (const [agentId, agentComp] of this.agentCache) {
      const pos = this.positionCache.get(agentId);
      if (!pos || !isAgentInCity(pos.x, pos.y, director.bounds)) continue;

      this.workingAgentIds.push(agentId);

      const isAutonomic = agentComp.tier === 'autonomic' || (!agentComp.useLLM && !agentComp.tier);
      if (isAutonomic) {
        autonomicCount++;

        // Apply containment bounds immediately to prevent wandering out
        const steering = this.steeringCache.get(agentId);
        if (steering && !steering.containmentBounds) {
          const agentEntity = world.getEntity(agentId) as EntityImpl;
          if (agentEntity) {
            agentEntity.updateComponent<SteeringComponent>(CT.Steering, (current) => ({
              ...current,
              containmentBounds: director.bounds,
              containmentMargin: 20,
            }));
          }
        }
      } else if (agentComp.useLLM) {
        llmAgentCount++;
      }
    }

    // ========== OPTIMIZED: Use cached components for buildings ==========
    let totalBuildings = 0;
    let housingCapacity = 0;
    let storageCapacity = 0;
    let productionBuildings = 0;
    let totalFood = 0;
    let totalWood = 0;
    let totalStone = 0;

    for (const [buildingId, buildingComp] of this.buildingCache) {
      const pos = this.positionCache.get(buildingId);
      if (!pos || !isAgentInCity(pos.x, pos.y, director.bounds)) continue;
      if (!buildingComp.isComplete) continue;

      totalBuildings++;

      const bType = buildingComp.buildingType;

      // Housing types (bed, bedroll)
      if (bType === 'bed' || bType === 'bedroll') {
        housingCapacity += 1;
      }

      // Storage types
      if (bType === 'storage-chest') {
        storageCapacity += 20;
      } else if (bType === 'storage-box') {
        storageCapacity += 10;
      }

      // Production types
      if (
        bType === 'forge' ||
        bType === 'workbench' ||
        bType === 'oven' ||
        bType === 'loom' ||
        bType === 'butchering_table'
      ) {
        productionBuildings++;
      }

      // Check building inventories for resources (O(1) cache lookup)
      const inv = this.inventoryCache.get(buildingId);
      if (inv) {
        for (const slot of inv.slots) {
          if (!slot || !slot.itemId || slot.quantity <= 0) continue;

          const itemId = slot.itemId;
          const qty = slot.quantity;

          // Food items
          if (
            itemId === 'food' ||
            itemId === 'bread' ||
            itemId === 'meat' ||
            itemId === 'vegetables' ||
            itemId === 'fruit' ||
            itemId === 'berry'
          ) {
            totalFood += qty;
          } else if (itemId === 'wood' || itemId === 'lumber') {
            totalWood += qty;
          } else if (itemId === 'stone' || itemId === 'rock') {
            totalStone += qty;
          }
        }
      }
    }

    // Count threats (wild animals with high stress within range)
    // NOTE: Animals not cached yet - this is low-frequency, OK to query
    let nearbyThreats = 0;
    const animals = world.query().with(CT.Animal, CT.Position).executeEntities();
    for (const animal of animals) {
      const animalImpl = animal as EntityImpl;
      const pos = animalImpl.getComponent<PositionComponent>(CT.Position);
      const animalComp = animalImpl.getComponent<AnimalComponent>(CT.Animal);

      if (pos && animalComp && isAgentInCity(pos.x, pos.y, director.bounds)) {
        if (animalComp.wild && animalComp.stress > 50) {
          nearbyThreats++;
        }
      }
    }

    // ========== OPTIMIZED: Use precomputed constant ==========
    const dailyFoodConsumption = this.workingAgentIds.length * this.FOOD_PER_AGENT_PER_DAY;
    const foodSupplyDays = dailyFoodConsumption > 0 ? totalFood / dailyFoodConsumption : 999;

    // Update stats
    const stats: CityStats = {
      population: this.workingAgentIds.length,
      autonomicNpcCount: autonomicCount,
      llmAgentCount,
      totalBuildings,
      housingCapacity,
      storageCapacity,
      productionBuildings,
      foodSupply: Math.min(foodSupplyDays, 30), // Cap at 30 days
      woodSupply: totalWood,
      stoneSupply: totalStone,
      nearbyThreats,
      recentDeaths: 0, // Would need death tracking integration
    };

    // ========== ZERO ALLOCATIONS: Copy workingAgentIds to new array only once ==========
    const agentIds = this.workingAgentIds.slice();

    entity.updateComponent<CityDirectorComponent>('city_director' as ComponentType, (current) => ({
      ...current,
      stats,
      agentIds,
    }));
  }

  /**
   * Conduct a director meeting - either LLM or rule-based.
   */
  private conductDirectorMeeting(world: World, entity: EntityImpl, director: CityDirectorComponent): void {
    // Mark meeting as conducted
    entity.updateComponent<CityDirectorComponent>('city_director' as ComponentType, (current) => ({
      ...current,
      lastDirectorMeeting: world.tick,
      pendingDecision: this.config.enableLLM && this.llmQueue !== null,
    }));

    if (this.config.enableLLM && this.llmQueue && !this.pendingDecisions.has(director.cityId)) {
      // Queue LLM decision
      const prompt = this.buildDirectorPrompt(director);
      const decisionPromise = this.llmQueue.requestDecision(`city_director_${director.cityId}`, prompt);

      this.pendingDecisions.set(director.cityId, decisionPromise);

      decisionPromise
        .then((response) => {
          this.parseAndApplyDecision(world, entity, director, response);
        })
        .catch((error) => {
          // Fall back to rule-based on error
          console.error(`[CityDirector] LLM decision failed for ${director.cityName}:`, error);
          this.applyRuleBasedDecision(entity, director);
        })
        .finally(() => {
          this.pendingDecisions.delete(director.cityId);
        });
    } else {
      // Use rule-based decision
      this.applyRuleBasedDecision(entity, director);
    }
  }

  /**
   * Build LLM prompt for director decision.
   */
  private buildDirectorPrompt(director: CityDirectorComponent): string {
    const { stats, cityName } = director;

    return `You are the strategic director of ${cityName}, a settlement with ${stats.population} residents.

Current City Status:
- Population: ${stats.population} (${stats.autonomicNpcCount} workers, ${stats.llmAgentCount} leaders)
- Buildings: ${stats.totalBuildings} (Housing capacity: ${stats.housingCapacity}, Storage: ${stats.storageCapacity})
- Production buildings: ${stats.productionBuildings}
- Food supply: ${stats.foodSupply.toFixed(1)} days remaining
- Wood: ${stats.woodSupply}, Stone: ${stats.stoneSupply}
- Nearby threats: ${stats.nearbyThreats}
- Recent deaths: ${stats.recentDeaths}

Your task: Analyze the city's situation and decide what the population should focus on.

Choose a focus from: survival, growth, security, prosperity, exploration, balanced

Set priority weights (should sum to ~1.0):
- gathering: Wood, stone, food collection
- building: Construction, infrastructure
- farming: Agriculture, planting, harvesting
- social: Community building, meetings
- exploration: Scouting new areas
- rest: Recovery, downtime
- magic: Magical research and casting

Respond in this exact JSON format:
{
  "focus": "survival|growth|security|prosperity|exploration|balanced",
  "priorities": {
    "gathering": 0.0-1.0,
    "building": 0.0-1.0,
    "farming": 0.0-1.0,
    "social": 0.0-1.0,
    "exploration": 0.0-1.0,
    "rest": 0.0-1.0,
    "magic": 0.0-1.0
  },
  "reasoning": "One sentence explaining your decision",
  "concerns": ["top concern 1", "top concern 2"]
}`;
  }

  /**
   * Parse LLM response and apply the decision.
   */
  private parseAndApplyDecision(
    world: World,
    entity: EntityImpl,
    director: CityDirectorComponent,
    response: string
  ): void {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const decision: DirectorDecision = JSON.parse(jsonMatch[0]);

      // Validate the decision
      if (!decision.focus || !decision.priorities) {
        throw new Error('Missing required fields in decision');
      }

      // Normalize priorities to sum to 1.0
      const total = Object.values(decision.priorities).reduce((sum, val) => sum + (val ?? 0), 0);
      if (total > 0) {
        for (const key of Object.keys(decision.priorities) as Array<keyof StrategicPriorities>) {
          decision.priorities[key] = (decision.priorities[key] ?? 0) / total;
        }
      }

      // Apply the decision
      entity.updateComponent<CityDirectorComponent>('city_director' as ComponentType, (current) => ({
        ...current,
        priorities: decision.priorities,
        pendingDecision: false,
        reasoning: {
          focus: decision.focus,
          reasoning: decision.reasoning || 'LLM decision',
          concerns: decision.concerns || [],
          lastUpdated: world.tick,
        },
      }));
    } catch (error) {
      // Fall back to rule-based on parse error
      console.error(`[CityDirector] Failed to parse LLM response for ${director.cityName}:`, error);
      this.applyRuleBasedDecision(entity, director);
    }
  }

  /**
   * Apply rule-based decision (fallback when LLM unavailable).
   */
  private applyRuleBasedDecision(entity: EntityImpl, director: CityDirectorComponent): void {
    const focus = inferFocusFromStats(director.stats);
    const priorities = getPrioritiesForFocus(focus);

    entity.updateComponent<CityDirectorComponent>('city_director' as ComponentType, (current) => ({
      ...current,
      priorities,
      pendingDecision: false,
      reasoning: {
        focus,
        reasoning: `Rule-based decision: ${focus} focus based on current stats`,
        concerns: this.identifyConcerns(director.stats),
        lastUpdated: 0, // No tick available here
      },
    }));
  }

  /**
   * Identify top concerns from city stats.
   */
  private identifyConcerns(stats: CityStats): string[] {
    const concerns: string[] = [];

    if (stats.foodSupply < 3) {
      concerns.push('Critical food shortage');
    } else if (stats.foodSupply < 7) {
      concerns.push('Low food supply');
    }

    if (stats.nearbyThreats > 0) {
      concerns.push(`${stats.nearbyThreats} threats nearby`);
    }

    if (stats.population > stats.housingCapacity) {
      concerns.push('Housing shortage');
    }

    if (stats.recentDeaths > 0) {
      concerns.push(`${stats.recentDeaths} recent deaths`);
    }

    if (stats.woodSupply < 20) {
      concerns.push('Low wood supply');
    }

    return concerns.slice(0, 3); // Top 3 concerns
  }

  /**
   * Apply blended priorities to autonomic NPCs in the city (optimized).
   *
   * PERFORMANCE: Uses cached components for O(1) lookups, minimal updates
   */
  private applyPrioritiesToNPCsOptimized(world: World, director: CityDirectorComponent): void {
    // ========== EARLY EXIT: No priorities to apply ==========
    if (!director.priorities) return;

    // ========== OPTIMIZED: Use cached components ==========
    for (const agentId of director.agentIds) {
      const agentComp = this.agentCache.get(agentId);
      if (!agentComp) continue;

      // Only apply to autonomic tier agents
      const isAutonomic = agentComp.tier === 'autonomic' || (!agentComp.useLLM && !agentComp.tier);
      if (!isAutonomic) continue;

      // Apply containment bounds to steering component to keep agents in city
      const steering = this.steeringCache.get(agentId);
      if (steering && !steering.containmentBounds) {
        const agentEntity = world.getEntity(agentId) as EntityImpl;
        if (agentEntity) {
          agentEntity.updateComponent<SteeringComponent>(CT.Steering, (current) => ({
            ...current,
            containmentBounds: director.bounds,
            containmentMargin: 20, // Start turning back 20 tiles from edge
          }));
        }
      }

      // Blend city priorities with agent's personal skill-based priorities
      if (agentComp.priorities) {
        const blendedPriorities = blendPriorities(
          director.priorities,
          agentComp.priorities,
          director.cityInfluence
        );

        // Update agent with blended priorities
        // Note: We store the blended priorities in a separate field to preserve original skill-based priorities
        const agentEntity = world.getEntity(agentId) as EntityImpl;
        if (agentEntity) {
          agentEntity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
            ...current,
            effectivePriorities: blendedPriorities,
          }));
        }
      }
    }
  }
}

// Extend AgentComponent type to include effectivePriorities
declare module '../components/AgentComponent.js' {
  interface AgentComponent {
    /** Blended priorities from city director + personal skills (used by autonomic NPCs in cities) */
    effectivePriorities?: StrategicPriorities;
  }
}
