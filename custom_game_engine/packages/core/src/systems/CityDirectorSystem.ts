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

import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
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
 */
export class CityDirectorSystem implements System {
  public readonly id: SystemId = 'city_director';
  public readonly priority: number = 45; // Run after governance, before agent brain
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private config: CityDirectorSystemConfig;
  private lastStatsUpdate: number = 0;
  private pendingDecisions: Map<string, Promise<string>> = new Map();

  // LLM queue reference - set externally when available
  private llmQueue: { requestDecision: (id: string, prompt: string) => Promise<string> } | null = null;

  constructor(config: Partial<CityDirectorSystemConfig> = {}) {
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
   */
  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    const directors = world.query().with('city_director' as ComponentType).executeEntities();

    if (directors.length === 0) {
      return;
    }

    // Update stats periodically (cheaper than every tick)
    const shouldUpdateStats = world.tick - this.lastStatsUpdate >= this.config.statsUpdateInterval;

    for (const directorEntity of directors) {
      const impl = directorEntity as EntityImpl;
      const director = impl.getComponent<CityDirectorComponent>('city_director' as ComponentType);

      if (!director) {
        continue;
      }

      // Update city stats
      if (shouldUpdateStats) {
        this.updateCityStats(world, impl, director);
      }

      // Check if it's time for a director meeting
      if (world.tick - director.lastDirectorMeeting >= director.meetingInterval) {
        this.conductDirectorMeeting(world, impl, director);
      }

      // Apply blended priorities to autonomic NPCs in this city
      this.applyPrioritiesToNPCs(world, director);
    }

    if (shouldUpdateStats) {
      this.lastStatsUpdate = world.tick;
    }
  }

  /**
   * Update city statistics by querying world state.
   */
  private updateCityStats(world: World, entity: EntityImpl, director: CityDirectorComponent): void {
    const agents = world.query().with(CT.Agent, CT.Position).executeEntities();
    const buildings = world.query().with(CT.Building, CT.Position).executeEntities();
    const animals = world.query().with(CT.Animal, CT.Position).executeEntities();

    // Filter to agents within city bounds
    const cityAgents: EntityImpl[] = [];
    let autonomicCount = 0;
    let llmAgentCount = 0;

    for (const agent of agents) {
      const agentImpl = agent as EntityImpl;
      const pos = agentImpl.getComponent<PositionComponent>(CT.Position);

      if (pos && isAgentInCity(pos.x, pos.y, director.bounds)) {
        cityAgents.push(agentImpl);

        const agentComp = agentImpl.getComponent<AgentComponent>(CT.Agent);
        if (agentComp) {
          const isAutonomic = agentComp.tier === 'autonomic' || (!agentComp.useLLM && !agentComp.tier);
          if (isAutonomic) {
            autonomicCount++;
            // Apply containment bounds immediately to prevent wandering out
            const steering = agentImpl.getComponent<SteeringComponent>(CT.Steering);
            if (steering && !steering.containmentBounds) {
              agentImpl.updateComponent<SteeringComponent>(CT.Steering, (current) => ({
                ...current,
                containmentBounds: director.bounds,
                containmentMargin: 20,
              }));
            }
          } else if (agentComp.useLLM) {
            llmAgentCount++;
          }
        }
      }
    }

    // Count buildings within city bounds
    let totalBuildings = 0;
    let housingCapacity = 0;
    let storageCapacity = 0;
    let productionBuildings = 0;
    let totalFood = 0;
    let totalWood = 0;
    let totalStone = 0;

    for (const building of buildings) {
      const buildingImpl = building as EntityImpl;
      const pos = buildingImpl.getComponent<PositionComponent>(CT.Position);
      const buildingComp = buildingImpl.getComponent<BuildingComponent>(CT.Building);

      if (pos && buildingComp && isAgentInCity(pos.x, pos.y, director.bounds)) {
        if (!buildingComp.isComplete) continue;

        totalBuildings++;

        // Categorize building types
        const bType = buildingComp.buildingType;

        // Housing types (bed, bedroll)
        // NOTE: Multi-tile houses now use TileBasedBlueprintRegistry
        if (['bed', 'bedroll'].includes(bType)) {
          housingCapacity += 1;
        }

        // Storage types
        // NOTE: Large storage buildings (warehouses, granaries) now use TileBasedBlueprintRegistry
        if (['storage-chest', 'storage-box'].includes(bType)) {
          storageCapacity += bType === 'storage-chest' ? 20 : 10;
        }

        // Production types
        // NOTE: Large workshops now use TileBasedBlueprintRegistry
        if (['forge', 'workbench', 'oven', 'loom', 'butchering_table'].includes(bType)) {
          productionBuildings++;
        }

        // Check building inventories for resources
        const inv = buildingImpl.getComponent<InventoryComponent>(CT.Inventory);
        if (inv) {
          for (const slot of inv.slots) {
            if (slot && slot.itemId && slot.quantity > 0) {
              const itemId = slot.itemId;
              const qty = slot.quantity;

              // Food items
              if (['food', 'bread', 'meat', 'vegetables', 'fruit', 'berry'].includes(itemId)) {
                totalFood += qty;
              } else if (itemId === 'wood' || itemId === 'lumber') {
                totalWood += qty;
              } else if (itemId === 'stone' || itemId === 'rock') {
                totalStone += qty;
              }
            }
          }
        }
      }
    }

    // Count threats (wild animals with high stress within range)
    let nearbyThreats = 0;
    for (const animal of animals) {
      const animalImpl = animal as EntityImpl;
      const pos = animalImpl.getComponent<PositionComponent>(CT.Position);
      const animalComp = animalImpl.getComponent<AnimalComponent>(CT.Animal);

      if (pos && animalComp && isAgentInCity(pos.x, pos.y, director.bounds)) {
        // Check if wild and stressed (likely to attack)
        if (animalComp.wild && animalComp.stress > 50) {
          nearbyThreats++;
        }
      }
    }

    // Calculate food supply in days
    const dailyFoodConsumption = cityAgents.length * 3; // ~3 food per agent per day
    const foodSupplyDays = dailyFoodConsumption > 0 ? totalFood / dailyFoodConsumption : 999;

    // Update stats
    const stats: CityStats = {
      population: cityAgents.length,
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

    // Update agent IDs list
    const agentIds = cityAgents.map((a) => a.id);

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
   * Apply blended priorities to autonomic NPCs in the city.
   */
  private applyPrioritiesToNPCs(world: World, director: CityDirectorComponent): void {
    // Only apply to autonomic NPCs (not full LLM agents)
    for (const agentId of director.agentIds) {
      const agent = world.getEntity(agentId);
      if (!agent) continue;

      const agentImpl = agent as EntityImpl;
      const agentComp = agentImpl.getComponent<AgentComponent>(CT.Agent);

      if (!agentComp) continue;

      // Only apply to autonomic tier agents
      const isAutonomic = agentComp.tier === 'autonomic' || (!agentComp.useLLM && !agentComp.tier);

      if (isAutonomic) {
        // Apply containment bounds to steering component to keep agents in city
        const steering = agentImpl.getComponent<SteeringComponent>(CT.Steering);
        if (steering && !steering.containmentBounds) {
          agentImpl.updateComponent<SteeringComponent>(CT.Steering, (current) => ({
            ...current,
            containmentBounds: director.bounds,
            containmentMargin: 20, // Start turning back 20 tiles from edge
          }));
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
          agentImpl.updateComponent<AgentComponent>(CT.Agent, (current) => ({
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
