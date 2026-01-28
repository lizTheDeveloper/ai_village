/**
 * Renormalization Engine
 *
 * Handles the zoom in/out cycle:
 * - Summarize: When zooming out, convert detailed ECS data to statistical summary
 * - Expand: When zooming in, generate entities that satisfy statistical constraints
 *
 * Key insight: At higher tiers, you simulate *statistics about agents*,
 * not individual agents.
 */

import type { TierLevel, AbstractTier, GameEvent } from '../abstraction/types.js';
import {
  TIME_SCALE,
  TIER_LEVEL_INDEX,
  SUMMARIZATION_RULES,
  BELIEF_CONSTANTS,
  POPULATION_CONSTANTS,
  EVENT_CONSTANTS,
} from './TierConstants.js';

/**
 * Named NPC that persists across summarization
 */
export interface NamedNPC {
  id: string;
  name: string;
  role: 'governor' | 'high_priest' | 'hero' | 'villain' | 'scientist' | 'merchant';
  tierId: string;
  alive: boolean;
  fame: number;        // 0-100, determines preservation priority
  deityAllegiance?: string;
  achievements: string[];
}

/**
 * Major building that persists across summarization
 */
export interface MajorBuilding {
  id: string;
  type: 'temple' | 'university' | 'palace' | 'fortress' | 'wonder' | 'spaceport';
  name: string;
  tierId: string;
  deityId?: string;    // For temples
  techLevel?: number;  // For universities
  capacity: number;
  operational: boolean;
}

/**
 * Historical event that persists across summarization
 */
export interface HistoricalEvent {
  id: string;
  type: string;
  effect: string;
  severity: number;
  tick: number;
  description: string;
  tierId: string;
  consequences: string[];
}

/**
 * Belief statistics for a deity in a tier
 */
export interface BeliefStats {
  deityId: string;
  deityName: string;
  believers: number;
  temples: number;
  recentMiracles: number;
  faithDensity: number; // believers / total population
}

/**
 * Summary of a tier when zoomed out
 */
export interface TierSummary {
  tierId: string;
  tierLevel: TierLevel;

  // Population (from agent counts)
  population: number;
  birthRate: number;
  deathRate: number;
  carryingCapacity: number;

  // Demographics distribution
  demographics: {
    ageDistribution: number[];  // Buckets: [0-18, 18-35, 35-55, 55-75, 75+]
    workerDistribution: Map<string, number>;  // Behavior -> percentage
    avgLifespan: number;
  };

  // Economy
  economy: {
    foodProduction: number;
    foodConsumption: number;
    resourceSurplus: Map<string, number>;
    productionByType: Map<string, number>;
    tradeBalance: number;
  };

  // Belief (deity tracking)
  belief: {
    totalBelievers: number;
    beliefDensity: number;
    byDeity: Map<string, BeliefStats>;
    dominantDeity: string | null;
    temples: Map<string, number>;
    recentMiracles: Map<string, number>;
  };

  // Progress
  progress: {
    techLevel: number;
    researchProgress: number;
    universities: number;
    researchGuilds: number;
  };

  // Stability
  stability: {
    overall: number;
    food: number;
    happiness: number;
    governance: number;
    safety: number;
  };

  // Preserved entities (not summarized away)
  preserved: {
    namedNPCs: NamedNPC[];
    majorBuildings: MajorBuilding[];
    historicalEvents: HistoricalEvent[];
  };

  // Metadata
  lastUpdated: number;  // Tick
  simulatedYears: number;
  childSummaries: string[];  // IDs of child tier summaries
}

/**
 * Constraints for instantiating a tier when zooming in
 */
export interface InstantiationConstraints {
  targetPopulation: number;

  // Belief distribution to match
  beliefDistribution: Map<string, number>;

  // Tech and skill levels
  techLevel: number;
  avgSkillLevel: number;

  // Stability affects generation
  stability: number;

  // Must-include entities
  namedNPCs: NamedNPC[];
  majorBuildings: MajorBuilding[];
  historicalEvents: HistoricalEvent[];
}

/**
 * The Renormalization Engine
 */
export class RenormalizationEngine {
  // Cache of tier summaries
  private summaries: Map<string, TierSummary> = new Map();

  // Active tiers (where ECS/full simulation is running)
  private activeTiers: Set<string> = new Set();

  /**
   * Mark a tier as active (ECS simulation running)
   */
  activateTier(tierId: string): void {
    this.activeTiers.add(tierId);
  }

  /**
   * Mark a tier as inactive (switch to statistical simulation)
   */
  deactivateTier(tierId: string): void {
    this.activeTiers.delete(tierId);
  }

  /**
   * Check if a tier is currently active
   */
  isTierActive(tierId: string): boolean {
    return this.activeTiers.has(tierId);
  }

  /**
   * Get time scale for simulation
   */
  getTimeScale(tierLevel: TierLevel): number {
    return TIME_SCALE[tierLevel] ?? 1;
  }

  /**
   * Summarize an AbstractTier into a TierSummary
   * Called when zooming out or deactivating a tier
   */
  summarize(tier: AbstractTier): TierSummary {
    const summary: TierSummary = {
      tierId: tier.id,
      tierLevel: tier.tier,

      // Population
      population: tier.population.total,
      birthRate: tier.population.growth / Math.max(1, tier.population.total),
      deathRate: POPULATION_CONSTANTS.BASE_DEATH_RATE,
      carryingCapacity: tier.population.carryingCapacity,

      // Demographics
      demographics: {
        ageDistribution: this.computeAgeDistribution(tier),
        workerDistribution: this.computeWorkerDistribution(tier),
        avgLifespan: 62 + tier.tech.level * 3, // Tech improves lifespan
      },

      // Economy
      economy: {
        foodProduction: tier.economy.production.get('food') ?? 0,
        foodConsumption: tier.economy.consumption.get('food') ?? 0,
        resourceSurplus: new Map(tier.economy.stockpiles),
        productionByType: new Map(tier.economy.production),
        tradeBalance: tier.economy.tradeBalance,
      },

      // Belief (extracted from tier if available)
      belief: this.extractBeliefStats(tier),

      // Progress
      progress: {
        techLevel: tier.tech.level,
        researchProgress: tier.tech.research,
        universities: tier.universities,
        researchGuilds: tier.researchGuilds.size,
      },

      // Stability
      stability: {
        overall: tier.stability.overall / 100,
        food: tier.stability.economic / 100,
        happiness: tier.stability.happiness / 100,
        governance: tier.stability.social / 100,
        safety: tier.stability.infrastructure / 100,
      },

      // Preserved entities
      preserved: {
        namedNPCs: this.extractNamedNPCs(tier),
        majorBuildings: this.extractMajorBuildings(tier),
        historicalEvents: this.convertEvents(tier.activeEvents, tier.id),
      },

      // Metadata
      lastUpdated: tier.tick,
      simulatedYears: 0,
      childSummaries: tier.children.map(c => c.id),
    };

    // Cache the summary
    this.summaries.set(tier.id, summary);

    return summary;
  }

  /**
   * Get cached summary for a tier
   */
  getSummary(tierId: string): TierSummary | undefined {
    return this.summaries.get(tierId);
  }

  /**
   * Get all cached summaries
   */
  getAllSummaries(): Map<string, TierSummary> {
    return this.summaries;
  }

  /**
   * Generate instantiation constraints from a summary
   * Used when zooming in to generate entities that match the statistical summary
   */
  getInstantiationConstraints(tierId: string): InstantiationConstraints | null {
    const summary = this.summaries.get(tierId);
    if (!summary) return null;

    return {
      targetPopulation: Math.round(summary.population),
      beliefDistribution: new Map(
        Array.from(summary.belief.byDeity.entries()).map(([id, stats]) => [id, stats.believers])
      ),
      techLevel: summary.progress.techLevel,
      avgSkillLevel: summary.progress.techLevel * 0.5, // Derive from tech
      stability: summary.stability.overall,
      namedNPCs: [...summary.preserved.namedNPCs],
      majorBuildings: [...summary.preserved.majorBuildings],
      historicalEvents: [...summary.preserved.historicalEvents],
    };
  }

  /**
   * Simulate a tier statistically (differential equations)
   * Called every tick for inactive tiers
   */
  simulateTier(tierId: string, deltaTicks: number): void {
    const summary = this.summaries.get(tierId);
    if (!summary) return;

    const timeScale = this.getTimeScale(summary.tierLevel);
    const scaledDelta = deltaTicks * timeScale;

    // Population dynamics (logistic growth)
    this.simulatePopulation(summary, scaledDelta);

    // Economy simulation
    this.simulateEconomy(summary, scaledDelta);

    // Belief spread
    this.simulateBelief(summary, scaledDelta);

    // Tech progression
    this.simulateTech(summary, scaledDelta);

    // Random events
    this.rollRandomEvents(summary, scaledDelta);

    // Update stability
    summary.stability.overall = this.computeStability(summary);

    // Update metadata
    summary.lastUpdated += deltaTicks;
    summary.simulatedYears += scaledDelta / 525600; // Ticks to years
  }

  /**
   * Simulate population with logistic growth
   */
  private simulatePopulation(summary: TierSummary, deltaTicks: number): void {
    const r = summary.birthRate - summary.deathRate;
    const K = summary.carryingCapacity;
    const P = summary.population;

    // dP/dt = r * P * (1 - P/K)
    const dP = r * P * (1 - P / K) * deltaTicks;

    // Resource constraints
    const foodRatio = summary.economy.foodProduction / Math.max(1, summary.economy.foodConsumption);
    const resourceMod = Math.min(1, Math.sqrt(foodRatio));

    // Stability affects growth
    const stabilityMod = 0.5 + summary.stability.overall * 0.5;

    summary.population = Math.max(0, summary.population + dP * resourceMod * stabilityMod);

    // Clamp to reasonable bounds
    summary.population = Math.min(K * 1.2, summary.population);
  }

  /**
   * Simulate economy (production/consumption)
   */
  private simulateEconomy(summary: TierSummary, deltaTicks: number): void {
    const techBonus = 1 + summary.progress.techLevel * POPULATION_CONSTANTS.TECH_PRODUCTION_BONUS;
    const workers = summary.population * 0.6; // 60% workers

    // Food production
    summary.economy.foodProduction =
      workers * POPULATION_CONSTANTS.FOOD_PRODUCTION_PER_WORKER * techBonus * summary.stability.overall;

    // Food consumption
    summary.economy.foodConsumption =
      summary.population * POPULATION_CONSTANTS.FOOD_CONSUMPTION_PER_CAPITA;

    // Update surplus
    const surplus = summary.economy.foodProduction - summary.economy.foodConsumption;
    const currentFood = summary.economy.resourceSurplus.get('food') ?? 0;
    summary.economy.resourceSurplus.set('food', Math.max(0, currentFood + surplus * deltaTicks));
  }

  /**
   * Simulate belief spread
   */
  private simulateBelief(summary: TierSummary, deltaTicks: number): void {
    const totalPop = summary.population;
    let totalBelievers = 0;

    for (const [deityId, stats] of Array.from(summary.belief.byDeity.entries())) {
      // Growth factors
      const wordOfMouth = stats.believers * BELIEF_CONSTANTS.WORD_OF_MOUTH_RATE;
      const templeBonus = stats.temples * BELIEF_CONSTANTS.TEMPLE_BONUS;
      const miracleBonus = stats.recentMiracles * BELIEF_CONSTANTS.MIRACLE_BONUS;

      // Decay
      const naturalDecay = stats.believers * BELIEF_CONSTANTS.NATURAL_DECAY;

      // Net change
      const delta = (wordOfMouth + templeBonus + miracleBonus - naturalDecay) * deltaTicks;

      stats.believers = Math.max(0, Math.min(totalPop, stats.believers + delta));
      stats.faithDensity = totalPop > 0 ? stats.believers / totalPop : 0;

      totalBelievers += stats.believers;

      // Decay miracles over time
      stats.recentMiracles = Math.max(0, stats.recentMiracles - deltaTicks * 0.01);
    }

    // Update totals
    summary.belief.totalBelievers = totalBelievers;
    summary.belief.beliefDensity = totalPop > 0 ? totalBelievers / totalPop : 0;

    // Find dominant deity
    let maxBelievers = 0;
    let dominant: string | null = null;
    for (const [deityId, stats] of Array.from(summary.belief.byDeity.entries())) {
      if (stats.believers > maxBelievers) {
        maxBelievers = stats.believers;
        dominant = deityId;
      }
    }
    summary.belief.dominantDeity = dominant;
  }

  /**
   * Simulate tech progression
   */
  private simulateTech(summary: TierSummary, deltaTicks: number): void {
    if (summary.progress.universities === 0) return;

    const researchRate =
      summary.progress.universities * 0.01 +
      summary.progress.researchGuilds * 0.005 +
      summary.stability.overall * 0.001;

    summary.progress.researchProgress += researchRate * deltaTicks;

    // Level up
    while (summary.progress.researchProgress >= 100 && summary.progress.techLevel < 10) {
      summary.progress.techLevel++;
      summary.progress.researchProgress -= 100;

      // Record breakthrough
      summary.preserved.historicalEvents.push({
        id: `${summary.tierId}_tech_${summary.lastUpdated}`,
        type: 'tech_breakthrough',
        effect: 'tech',
        severity: summary.progress.techLevel,
        tick: summary.lastUpdated,
        description: `Tech level ${summary.progress.techLevel} achieved!`,
        tierId: summary.tierId,
        consequences: [`Production efficiency +${summary.progress.techLevel * 10}%`],
      });
    }
  }

  /**
   * Roll for random events
   */
  private rollRandomEvents(summary: TierSummary, deltaTicks: number): void {
    const eventChance = EVENT_CONSTANTS.BASE_EVENT_CHANCE * deltaTicks;

    if (Math.random() < eventChance) {
      const event = this.generateRandomEvent(summary);
      this.applyEvent(summary, event);
      summary.preserved.historicalEvents.push(event);

      // Trim old events (keep last 50)
      if (summary.preserved.historicalEvents.length > 50) {
        summary.preserved.historicalEvents.shift();
      }
    }
  }

  /**
   * Generate a random event
   */
  private generateRandomEvent(summary: TierSummary): HistoricalEvent {
    const eventTypes = [
      { type: 'plague', effect: 'population', weight: 0.1 },
      { type: 'famine', effect: 'population', weight: 0.1 },
      { type: 'war', effect: 'stability', weight: 0.1 },
      { type: 'golden_age', effect: 'growth', weight: 0.05 },
      { type: 'tech_discovery', effect: 'tech', weight: 0.1 },
      { type: 'religious_revival', effect: 'belief', weight: 0.1 },
      { type: 'natural_disaster', effect: 'infrastructure', weight: 0.1 },
      { type: 'trade_boom', effect: 'economy', weight: 0.1 },
      { type: 'cultural_renaissance', effect: 'happiness', weight: 0.05 },
    ];

    // Weighted random selection
    const totalWeight = eventTypes.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const evt of eventTypes) {
      roll -= evt.weight;
      if (roll <= 0) {
        const severity = EVENT_CONSTANTS.SEVERITY_RANGE[0] +
          Math.random() * (EVENT_CONSTANTS.SEVERITY_RANGE[1] - EVENT_CONSTANTS.SEVERITY_RANGE[0]);

        return {
          id: `${summary.tierId}_${evt.type}_${summary.lastUpdated}`,
          type: evt.type,
          effect: evt.effect,
          severity: Math.floor(severity),
          tick: summary.lastUpdated,
          description: this.getEventDescription(evt.type, severity, summary),
          tierId: summary.tierId,
          consequences: [],
        };
      }
    }

    // Default
    return {
      id: `${summary.tierId}_nothing_${summary.lastUpdated}`,
      type: 'nothing',
      effect: 'none',
      severity: 0,
      tick: summary.lastUpdated,
      description: 'Peaceful times',
      tierId: summary.tierId,
      consequences: [],
    };
  }

  /**
   * Apply event effects to summary
   */
  private applyEvent(summary: TierSummary, event: HistoricalEvent): void {
    switch (event.effect) {
      case 'population':
        summary.population *= (1 - event.severity * 0.03);
        event.consequences.push(`Population reduced by ${(event.severity * 3).toFixed(1)}%`);
        break;

      case 'stability':
        summary.stability.overall *= (1 - event.severity * 0.05);
        summary.stability.safety *= (1 - event.severity * 0.1);
        event.consequences.push(`Stability reduced by ${(event.severity * 5).toFixed(1)}%`);
        break;

      case 'growth':
        summary.birthRate *= (1 + event.severity * 0.02);
        event.consequences.push(`Birth rate increased by ${(event.severity * 2).toFixed(1)}%`);
        break;

      case 'tech':
        summary.progress.researchProgress += event.severity * 10;
        event.consequences.push(`Research progress +${event.severity * 10}`);
        break;

      case 'belief':
        summary.belief.beliefDensity = Math.min(1, summary.belief.beliefDensity + event.severity * 0.02);
        event.consequences.push(`Faith increased across the population`);
        break;

      case 'infrastructure':
        summary.economy.foodProduction *= (1 - event.severity * 0.04);
        summary.stability.food *= (1 - event.severity * 0.1);
        event.consequences.push(`Infrastructure damaged, production reduced`);
        break;

      case 'economy':
        summary.economy.tradeBalance += event.severity * 1000;
        event.consequences.push(`Trade volume increased`);
        break;

      case 'happiness':
        summary.stability.happiness = Math.min(1, summary.stability.happiness + event.severity * 0.05);
        event.consequences.push(`Population happiness increased`);
        break;
    }
  }

  /**
   * Generate event description
   */
  private getEventDescription(type: string, severity: number, summary: TierSummary): string {
    const descriptions: Record<string, string> = {
      plague: `A plague sweeps through ${summary.tierId}, severity ${Math.floor(severity)}`,
      famine: `Famine strikes ${summary.tierId}, severity ${Math.floor(severity)}`,
      war: `War erupts in ${summary.tierId}`,
      golden_age: `A golden age begins in ${summary.tierId}`,
      tech_discovery: `Scientific discovery in ${summary.tierId}!`,
      religious_revival: `Religious revival sweeps ${summary.tierId}`,
      natural_disaster: `Natural disaster in ${summary.tierId}`,
      trade_boom: `Trade flourishes in ${summary.tierId}`,
      cultural_renaissance: `Cultural renaissance in ${summary.tierId}`,
    };
    return descriptions[type] ?? `Event in ${summary.tierId}`;
  }

  /**
   * Compute overall stability from factors
   */
  private computeStability(summary: TierSummary): number {
    const foodSecurity = summary.economy.foodProduction >= summary.economy.foodConsumption ? 1.0 : 0.5;
    const popPressure = Math.min(1, summary.carryingCapacity / Math.max(1, summary.population));
    const beliefBonus = summary.belief.beliefDensity > 0.5 ? 1.1 : 1.0;

    return Math.max(0, Math.min(1,
      foodSecurity * 0.3 +
      popPressure * 0.2 +
      summary.stability.happiness * 0.2 +
      summary.stability.governance * 0.15 +
      summary.stability.safety * 0.15
    ) * beliefBonus);
  }

  // ============================================================================
  // Helper methods for extracting data from AbstractTier
  // ============================================================================

  private computeAgeDistribution(tier: AbstractTier): number[] {
    // Derive from population distribution
    const children = tier.population.distribution.children / tier.population.total;
    const elderly = tier.population.distribution.elderly / tier.population.total;
    const workers = (tier.population.distribution.workers + tier.population.distribution.military +
      tier.population.distribution.researchers) / tier.population.total;

    return [
      children,           // 0-18
      workers * 0.4,      // 18-35
      workers * 0.4,      // 35-55
      workers * 0.2,      // 55-75
      elderly,            // 75+
    ];
  }

  private computeWorkerDistribution(tier: AbstractTier): Map<string, number> {
    const total = tier.population.total;
    return new Map([
      ['workers', tier.population.distribution.workers / total],
      ['military', tier.population.distribution.military / total],
      ['researchers', tier.population.distribution.researchers / total],
      ['children', tier.population.distribution.children / total],
      ['elderly', tier.population.distribution.elderly / total],
    ]);
  }

  private extractBeliefStats(tier: AbstractTier): TierSummary['belief'] {
    // If tier doesn't have belief tracking, create empty structure
    const byDeity = new Map<string, BeliefStats>();

    // Try to extract from tier's research guilds or other sources
    // For now, create placeholder deities based on tier size
    if (tier.population.total > 1_000_000) {
      // Large population likely has multiple deities
      byDeity.set('wisdom_goddess', {
        deityId: 'wisdom_goddess',
        deityName: 'Goddess of Wisdom',
        believers: tier.population.total * 0.3,
        temples: Math.floor(tier.population.total / 1_000_000),
        recentMiracles: 0,
        faithDensity: 0.3,
      });
      byDeity.set('war_god', {
        deityId: 'war_god',
        deityName: 'God of War',
        believers: tier.population.total * 0.15,
        temples: Math.floor(tier.population.total / 5_000_000),
        recentMiracles: 0,
        faithDensity: 0.15,
      });
    }

    let totalBelievers = 0;
    for (const stats of Array.from(byDeity.values())) {
      totalBelievers += stats.believers;
    }

    return {
      totalBelievers,
      beliefDensity: tier.population.total > 0 ? totalBelievers / tier.population.total : 0,
      byDeity,
      dominantDeity: byDeity.size > 0 ? Array.from(byDeity.keys())[0]! : null,
      temples: new Map(Array.from(byDeity.entries()).map(([id, s]) => [id, s.temples])),
      recentMiracles: new Map(),
    };
  }

  private extractNamedNPCs(tier: AbstractTier): NamedNPC[] {
    const npcs: NamedNPC[] = [];

    // Generate governor for large tiers
    if (tier.population.total > 100_000) {
      npcs.push({
        id: `${tier.id}_governor`,
        name: `Governor of ${tier.name}`,
        role: 'governor',
        tierId: tier.id,
        alive: true,
        fame: 50 + Math.random() * 30,
        achievements: [`Governs ${tier.name}`],
      });
    }

    // Generate high priest if belief is high
    if (tier.stability.social > 60) {
      npcs.push({
        id: `${tier.id}_priest`,
        name: `High Priest of ${tier.name}`,
        role: 'high_priest',
        tierId: tier.id,
        alive: true,
        fame: 30 + Math.random() * 20,
        deityAllegiance: 'wisdom_goddess',
        achievements: [`Leads worship in ${tier.name}`],
      });
    }

    return npcs;
  }

  private extractMajorBuildings(tier: AbstractTier): MajorBuilding[] {
    const buildings: MajorBuilding[] = [];

    // Universities
    for (let i = 0; i < Math.min(3, tier.universities); i++) {
      buildings.push({
        id: `${tier.id}_university_${i}`,
        type: 'university',
        name: `University of ${tier.name} ${i > 0 ? `(${i + 1})` : ''}`,
        tierId: tier.id,
        techLevel: tier.tech.level,
        capacity: 10000,
        operational: true,
      });
    }

    // Temples (one per major deity)
    const templeCount = Math.floor(tier.population.total / 1_000_000);
    for (let i = 0; i < Math.min(5, templeCount); i++) {
      buildings.push({
        id: `${tier.id}_temple_${i}`,
        type: 'temple',
        name: `Grand Temple ${i + 1}`,
        tierId: tier.id,
        deityId: i % 2 === 0 ? 'wisdom_goddess' : 'war_god',
        capacity: 50000,
        operational: true,
      });
    }

    // Transport hubs
    for (const hub of tier.transportHubs) {
      buildings.push({
        id: hub.id,
        type: hub.type === 'spaceport' ? 'spaceport' : 'spaceport',
        name: `${hub.type} Hub`,
        tierId: tier.id,
        capacity: hub.capacity,
        operational: hub.operational,
      });
    }

    return buildings;
  }

  private convertEvents(events: GameEvent[], tierId: string): HistoricalEvent[] {
    return events.map(e => ({
      id: e.id,
      type: e.type,
      effect: e.effects.populationChange ? 'population' :
              e.effects.stabilityChange ? 'stability' :
              e.effects.techLevelChange ? 'tech' : 'other',
      severity: e.severity,
      tick: e.tick,
      description: e.description,
      tierId,
      consequences: [],
    }));
  }

  /**
   * Record a miracle performed by a deity
   */
  recordMiracle(tierId: string, deityId: string): void {
    const summary = this.summaries.get(tierId);
    if (!summary) return;

    const stats = summary.belief.byDeity.get(deityId);
    if (stats) {
      stats.recentMiracles++;
      summary.belief.recentMiracles.set(deityId, stats.recentMiracles);
    }
  }

  /**
   * Add a temple for a deity
   */
  addTemple(tierId: string, deityId: string): void {
    const summary = this.summaries.get(tierId);
    if (!summary) return;

    const stats = summary.belief.byDeity.get(deityId);
    if (stats) {
      stats.temples++;
      summary.belief.temples.set(deityId, stats.temples);
    }
  }
}

// Export singleton instance
export const renormalizationEngine = new RenormalizationEngine();
