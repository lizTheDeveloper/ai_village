/**
 * City Manager - Generalized City AI
 *
 * Reusable component for city-level strategic decision-making.
 * Can be used in:
 * - Full game (via CityDirectorSystem)
 * - Headless testing (via HeadlessCitySimulator)
 * - Integration tests
 */

import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl, createEntityId } from '../ecs/Entity.js';
import { createBuildingComponent } from '../components/BuildingComponent.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { createRenderableComponent } from '../components/RenderableComponent.js';

// =============================================================================
// TYPES
// =============================================================================

export type CityFocus =
  | 'survival'      // Food critically low
  | 'growth'        // Approaching housing capacity
  | 'security'      // Threats detected
  | 'prosperity'    // Surplus resources
  | 'exploration'   // Early settlement
  | 'balanced';     // All metrics stable

export interface CityStats {
  // Population
  population: number;
  autonomicNpcCount: number;
  llmAgentCount: number;

  // Buildings
  totalBuildings: number;
  housingCapacity: number;
  storageCapacity: number;
  productionBuildings: number;

  // Resources (in days of supply)
  foodSupply: number;
  woodSupply: number;
  stoneSupply: number;

  // Threats
  nearbyThreats: number;
  recentDeaths: number;
}

export interface StrategicPriorities {
  gathering: number;    // 0-1
  building: number;     // 0-1
  farming: number;      // 0-1
  social: number;       // 0-1
  exploration: number;  // 0-1
  rest: number;         // 0-1
  magic: number;        // 0-1
  // Sum must equal 1.0
}

export interface CityReasoning {
  focus: CityFocus;
  reasoning: string;
  concerns: string[];
}

export interface CityDecision {
  timestamp: number;  // Tick number
  stats: CityStats;
  priorities: StrategicPriorities;
  reasoning: CityReasoning;
}

export interface CityManagerConfig {
  decisionInterval?: number;      // Ticks between decisions (default: 14400 = 1 day)
  statsUpdateInterval?: number;   // Ticks between stat updates (default: 200 = 10 seconds)
  maxHistorySize?: number;         // Max decisions to keep (default: 100)
  allowManualOverride?: boolean;   // Allow manual priority control (default: false)
}

// =============================================================================
// CITY MANAGER
// =============================================================================

export class CityManager {
  // Configuration
  private decisionInterval: number;
  private statsUpdateInterval: number;
  private maxHistorySize: number;
  private allowManualOverride: boolean;

  // State
  private stats: CityStats;
  private priorities: StrategicPriorities;
  private reasoning: CityReasoning;
  private decisions: CityDecision[];

  // Timing
  private ticksSinceLastDecision: number = 0;
  private ticksSinceLastStatsUpdate: number = 0;

  // Manual override
  private manualPriorities: StrategicPriorities | null = null;
  private priorityLocked: boolean = false;

  constructor(config: CityManagerConfig = {}) {
    this.decisionInterval = config.decisionInterval ?? 14400;  // 1 day
    this.statsUpdateInterval = config.statsUpdateInterval ?? 200;  // 10 seconds
    this.maxHistorySize = config.maxHistorySize ?? 100;
    this.allowManualOverride = config.allowManualOverride ?? false;

    // Initialize with balanced defaults
    this.stats = this.createEmptyStats();
    this.priorities = this.getBalancedPriorities();
    this.reasoning = {
      focus: 'balanced',
      reasoning: 'Initializing city management',
      concerns: [],
    };
    this.decisions = [];
  }

  // ---------------------------------------------------------------------------
  // CORE LIFECYCLE
  // ---------------------------------------------------------------------------

  tick(world: World): void {
    this.ticksSinceLastStatsUpdate++;
    this.ticksSinceLastDecision++;

    // Update stats periodically
    if (this.ticksSinceLastStatsUpdate >= this.statsUpdateInterval) {
      this.stats = this.analyzeCity(world);
      this.ticksSinceLastStatsUpdate = 0;
    }

    // Make decision periodically (unless locked by manual override)
    if (!this.priorityLocked && this.ticksSinceLastDecision >= this.decisionInterval) {
      const decision = this.makeDecision(this.stats, world.tick);
      this.applyDecision(decision);
      this.executeActions(world, decision.reasoning.focus, this.stats);
      this.broadcastPriorities(world, this.priorities);
      this.ticksSinceLastDecision = 0;
    }
  }

  analyzeCity(world: World): CityStats {
    const agents = world.query().with('agent').executeEntities();
    const buildings = world.query().with('building').executeEntities();

    // Count population
    const population = agents.length;
    const autonomicCount = agents.filter(a => {
      const agent = a.getComponent('agent');
      return agent && !(agent as any).usesLLM;
    }).length;
    const llmCount = population - autonomicCount;

    // Count buildings
    const totalBuildings = buildings.length;

    // Housing capacity
    const housingCapacity = this.calculateHousingCapacity(buildings);

    // Storage capacity
    const storageCapacity = this.calculateStorageCapacity(buildings);

    // Production buildings (farms, workshops)
    const productionBuildings = this.countProductionBuildings(buildings);

    // Resource supplies
    const foodSupply = this.calculateResourceSupply(world, 'food', population);
    const woodSupply = this.calculateResourceStock(world, 'wood');
    const stoneSupply = this.calculateResourceStock(world, 'stone');

    // Threats
    const nearbyThreats = this.countThreats(world);
    const recentDeaths = this.countRecentDeaths(world);

    return {
      population,
      autonomicNpcCount: autonomicCount,
      llmAgentCount: llmCount,
      totalBuildings,
      housingCapacity,
      storageCapacity,
      productionBuildings,
      foodSupply,
      woodSupply,
      stoneSupply,
      nearbyThreats,
      recentDeaths,
    };
  }

  makeDecision(stats: CityStats, tick: number): CityDecision {
    const focus = this.inferFocus(stats);
    const priorities = this.getPrioritiesForFocus(focus);
    const reasoning = this.generateReasoning(stats, focus);

    return {
      timestamp: tick,
      stats: { ...stats },
      priorities: { ...priorities },
      reasoning: { ...reasoning },
    };
  }

  /**
   * Execute actions based on current focus (e.g., build housing, farms)
   */
  executeActions(world: World, focus: CityFocus, stats: CityStats): void {
    // Find city center (average of all agent positions)
    const agents = world.query().with('position').with('agent').executeEntities();
    if (agents.length === 0) return;

    let sumX = 0, sumY = 0;
    agents.forEach(agent => {
      const pos = agent.getComponent('position') as any;
      if (pos) {
        sumX += pos.x;
        sumY += pos.y;
      }
    });
    const centerX = sumX / agents.length;
    const centerY = sumY / agents.length;

    // Execute actions based on focus
    if (focus === 'growth' && stats.woodSupply >= 10) {
      // Build housing (tent) if approaching capacity
      if (stats.population / stats.housingCapacity > 0.7) {
        const tentEntity = new EntityImpl(createEntityId(), world.tick);
        const angle = Math.random() * Math.PI * 2;
        const distance = 5 + Math.random() * 5;
        tentEntity.addComponent(createBuildingComponent('tent' as any, 1, 100));
        tentEntity.addComponent(createPositionComponent(
          centerX + Math.cos(angle) * distance,
          centerY + Math.sin(angle) * distance
        ));
        tentEntity.addComponent(createRenderableComponent('tent', 'object'));
        (world as any)._addEntity(tentEntity);
        console.log('[CityManager] Built tent for growing population');
      }
    } else if (focus === 'survival' && stats.woodSupply >= 5) {
      // Build food production if food is critically low
      if (stats.foodSupply < 3) {
        const farmEntity = new EntityImpl(createEntityId(), world.tick);
        const angle = Math.random() * Math.PI * 2;
        const distance = 8 + Math.random() * 5;
        farmEntity.addComponent(createBuildingComponent('farm-plot' as any, 1, 100));
        farmEntity.addComponent(createPositionComponent(
          centerX + Math.cos(angle) * distance,
          centerY + Math.sin(angle) * distance
        ));
        farmEntity.addComponent(createRenderableComponent('farm-plot', 'object'));
        (world as any)._addEntity(farmEntity);
        console.log('[CityManager] Built farm-plot for survival');
      }
    }
  }

  broadcastPriorities(world: World, priorities: StrategicPriorities): void {
    const agents = world.query().with('agent').executeEntities();

    for (const agent of agents) {
      const agentComp = agent.getComponent('agent') as any;
      if (!agentComp) continue;

      // Blend city priorities (40%) with agent's personal skill weights (60%)
      agentComp.effectivePriorities = {
        gathering: (priorities.gathering * 0.4) + ((agentComp.skillWeights?.gathering ?? 0.2) * 0.6),
        building: (priorities.building * 0.4) + ((agentComp.skillWeights?.building ?? 0.2) * 0.6),
        farming: (priorities.farming * 0.4) + ((agentComp.skillWeights?.farming ?? 0.2) * 0.6),
        social: (priorities.social * 0.4) + ((agentComp.skillWeights?.social ?? 0.2) * 0.6),
        exploration: (priorities.exploration * 0.4) + ((agentComp.skillWeights?.exploration ?? 0.2) * 0.6),
        rest: (priorities.rest * 0.4) + ((agentComp.skillWeights?.rest ?? 0.2) * 0.6),
        magic: (priorities.magic * 0.4) + ((agentComp.skillWeights?.magic ?? 0.2) * 0.6),
      };
    }
  }

  // ---------------------------------------------------------------------------
  // MANUAL CONTROL
  // ---------------------------------------------------------------------------

  /**
   * Override priorities manually (for testing/player control)
   */
  setPriorities(priorities: StrategicPriorities): void {
    if (!this.allowManualOverride) {
      throw new Error('Manual override not allowed. Enable in config.');
    }

    // Validate sum = 1.0
    const sum = Object.values(priorities).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1.0) > 0.01) {
      throw new Error(`Priorities must sum to 1.0 (got ${sum})`);
    }

    this.manualPriorities = { ...priorities };
    this.priorities = { ...priorities };
    this.priorityLocked = true;
  }

  /**
   * Release manual control, return to AI decision-making
   */
  releaseManualControl(): void {
    this.manualPriorities = null;
    this.priorityLocked = false;
  }

  /**
   * Force an immediate decision (ignore decision interval)
   */
  forceDecision(world: World): void {
    const decision = this.makeDecision(this.stats, world.tick);
    this.applyDecision(decision);
    this.executeActions(world, decision.reasoning.focus, this.stats);
    this.broadcastPriorities(world, this.priorities);
    this.ticksSinceLastDecision = 0;
  }

  // ---------------------------------------------------------------------------
  // QUERYING
  // ---------------------------------------------------------------------------

  getStats(): Readonly<CityStats> {
    return { ...this.stats };
  }

  getPriorities(): Readonly<StrategicPriorities> {
    return { ...this.priorities };
  }

  getReasoning(): Readonly<CityReasoning> {
    return { ...this.reasoning };
  }

  getDecisionHistory(): readonly CityDecision[] {
    return [...this.decisions];
  }

  isManuallyControlled(): boolean {
    return this.priorityLocked;
  }

  // ---------------------------------------------------------------------------
  // DECISION LOGIC (Rule-Based)
  // ---------------------------------------------------------------------------

  private inferFocus(stats: CityStats): CityFocus {
    // Survival: food critically low
    if (stats.foodSupply < 3) return 'survival';

    // Security: threats or recent deaths
    if (stats.nearbyThreats > 3 || stats.recentDeaths > 0) return 'security';

    // Growth: approaching housing capacity
    if (stats.population / stats.housingCapacity > 0.8) return 'growth';

    // Prosperity: surplus resources
    if (stats.foodSupply > 10 && stats.woodSupply > 50 && stats.stoneSupply > 30) {
      return 'prosperity';
    }

    // Exploration: early settlement
    if (stats.totalBuildings < 5) return 'exploration';

    return 'balanced';
  }

  private getPrioritiesForFocus(focus: CityFocus): StrategicPriorities {
    switch (focus) {
      case 'survival':
        return { gathering: 0.35, farming: 0.30, building: 0.15, social: 0.05, exploration: 0.05, rest: 0.10, magic: 0 };
      case 'growth':
        return { gathering: 0.25, building: 0.40, farming: 0.15, social: 0.05, exploration: 0.10, rest: 0.05, magic: 0 };
      case 'security':
        return { gathering: 0.15, building: 0.20, farming: 0.10, social: 0.10, exploration: 0.30, rest: 0.10, magic: 0.05 };
      case 'prosperity':
        return { gathering: 0.25, building: 0.25, farming: 0.20, social: 0.15, exploration: 0.05, rest: 0.05, magic: 0.05 };
      case 'exploration':
        return { gathering: 0.15, building: 0.10, farming: 0.10, social: 0.10, exploration: 0.45, rest: 0.05, magic: 0.05 };
      default: // balanced
        return this.getBalancedPriorities();
    }
  }

  private generateReasoning(stats: CityStats, focus: CityFocus): CityReasoning {
    const reasoningMap: Record<CityFocus, string> = {
      survival: `Food supply critically low at ${stats.foodSupply.toFixed(1)} days. Prioritizing immediate gathering and farming to prevent starvation.`,
      growth: `Population nearing housing capacity (${stats.population}/${stats.housingCapacity}). Focusing on construction to accommodate growth.`,
      security: `Detected ${stats.nearbyThreats} threats with ${stats.recentDeaths} recent deaths. Increasing exploration and patrol activities.`,
      prosperity: `City stable with surplus resources. Balancing economic development with social activities to improve quality of life.`,
      exploration: `New settlement with only ${stats.totalBuildings} buildings. Prioritizing scouting to map surroundings and identify resources.`,
      balanced: `All metrics stable. Maintaining balanced priorities across all activities.`,
    };

    const concerns: string[] = [];
    if (stats.foodSupply < 5) concerns.push('Low food reserves');
    if (stats.woodSupply < 50) concerns.push('Wood shortage');
    if (stats.nearbyThreats > 0) concerns.push(`${stats.nearbyThreats} threats nearby`);
    if (stats.population / stats.housingCapacity > 0.7) concerns.push('Housing shortage approaching');

    return {
      focus,
      reasoning: reasoningMap[focus],
      concerns,
    };
  }

  private applyDecision(decision: CityDecision): void {
    this.priorities = decision.priorities;
    this.reasoning = decision.reasoning;

    this.decisions.unshift(decision);
    if (this.decisions.length > this.maxHistorySize) {
      this.decisions.pop();
    }
  }

  // ---------------------------------------------------------------------------
  // ANALYSIS HELPERS
  // ---------------------------------------------------------------------------

  private calculateHousingCapacity(buildings: readonly Entity[]): number {
    let capacity = 0;
    for (const building of buildings) {
      const buildingComp = building.getComponent('building') as any;
      if (!buildingComp) continue;

      // Count housing buildings
      if (buildingComp.buildingType === 'tent') capacity += 2;
      else if (buildingComp.buildingType === 'wooden-hut') capacity += 4;
      else if (buildingComp.buildingType === 'stone-house') capacity += 8;
    }
    return capacity;
  }

  private calculateStorageCapacity(buildings: readonly Entity[]): number {
    let capacity = 0;
    for (const building of buildings) {
      const inventory = building.getComponent('inventory') as any;
      if (inventory?.maxWeight) {
        capacity += inventory.maxWeight;
      }
    }
    return capacity;
  }

  private countProductionBuildings(buildings: readonly Entity[]): number {
    let count = 0;
    for (const building of buildings) {
      const buildingComp = building.getComponent('building') as any;
      if (!buildingComp) continue;

      // Count farms and workshops
      if (buildingComp.buildingType?.includes('farm') ||
          buildingComp.buildingType?.includes('workshop') ||
          buildingComp.buildingType?.includes('forge')) {
        count++;
      }
    }
    return count;
  }

  private calculateResourceSupply(world: World, resource: string, population: number): number {
    const stock = this.calculateResourceStock(world, resource);

    // Consumption rate: 1 food per agent per day (14400 ticks)
    if (resource === 'food' && population > 0) {
      const consumptionPerDay = population;
      return stock / consumptionPerDay;
    }

    return stock;
  }

  private calculateResourceStock(world: World, resource: string): number {
    let total = 0;

    // Count in storage buildings
    const buildings = world.query().with('building').with('inventory').executeEntities();
    for (const building of buildings) {
      const inventory = building.getComponent('inventory') as any;
      if (!inventory?.slots) continue;

      for (const slot of inventory.slots) {
        if (slot && slot.itemId === resource) {
          total += slot.quantity;
        }
      }
    }

    // Count in agent inventories
    const agents = world.query().with('agent').with('inventory').executeEntities();
    for (const agent of agents) {
      const inventory = agent.getComponent('inventory') as any;
      if (!inventory?.slots) continue;

      for (const slot of inventory.slots) {
        if (slot && slot.itemId === resource) {
          total += slot.quantity;
        }
      }
    }

    return total;
  }

  private countThreats(world: World): number {
    // Count hostile wild animals near city
    const wildAnimals = world.query().with('wild_animal').executeEntities();
    // TODO: Implement threat detection based on proximity to city center
    return 0;
  }

  private countRecentDeaths(world: World): number {
    // TODO: Track recent death events (last 24 hours)
    return 0;
  }

  // ---------------------------------------------------------------------------
  // UTILITIES
  // ---------------------------------------------------------------------------

  private getBalancedPriorities(): StrategicPriorities {
    return {
      gathering: 0.20,
      building: 0.20,
      farming: 0.20,
      social: 0.10,
      exploration: 0.15,
      rest: 0.10,
      magic: 0.05,
    };
  }

  private createEmptyStats(): CityStats {
    return {
      population: 0,
      autonomicNpcCount: 0,
      llmAgentCount: 0,
      totalBuildings: 0,
      housingCapacity: 0,
      storageCapacity: 0,
      productionBuildings: 0,
      foodSupply: 0,
      woodSupply: 0,
      stoneSupply: 0,
      nearbyThreats: 0,
      recentDeaths: 0,
    };
  }
}
