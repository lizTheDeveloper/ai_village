import type {
  AbstractTier,
  TierLevel,
  SimulationMode,
  UniversalAddress,
  PopulationStats,
  EconomicState,
  TradeRoute,
  TransportHub,
  ResourceType,
  StabilityMetrics,
  TechProgress,
  GameEvent,
  EventType
} from './types.js';
import { TIER_SCALES, RESOURCE_TYPES } from './types.js';

export class AbstractTierBase implements AbstractTier {
  id: string;
  name: string;
  tier: TierLevel;
  address: Partial<UniversalAddress>;
  mode: SimulationMode;
  tick: number = 0;
  timeScale: number = 1.0;
  population: PopulationStats;
  economy: EconomicState;
  tradeRoutes: TradeRoute[] = [];
  transportHubs: TransportHub[] = [];
  stability: StabilityMetrics;
  tech: TechProgress;
  activeEvents: GameEvent[] = [];
  universities: number = 0;
  researchGuilds: Map<string, number> = new Map();
  activeResearch: string[] = [];
  scientistPool: Map<number, number> = new Map();
  children: AbstractTier[] = [];

  constructor(
    id: string,
    name: string,
    tier: TierLevel,
    address: Partial<UniversalAddress>,
    mode: SimulationMode = 'abstract'
  ) {
    this.id = id;
    this.name = name;
    this.tier = tier;
    this.address = address;
    this.mode = mode;

    // Initialize population
    const scale = TIER_SCALES[tier];
    const basePop = scale.populationRange[0] +
      Math.random() * (scale.populationRange[1] - scale.populationRange[0]);

    this.population = {
      total: Math.floor(basePop),
      growth: Math.floor(basePop * 0.001), // 0.1% growth per tick
      carryingCapacity: Math.floor(scale.populationRange[1]), // Max for this tier
      distribution: {
        workers: Math.floor(basePop * 0.6),
        military: Math.floor(basePop * 0.05),
        researchers: Math.floor(basePop * 0.1),
        children: Math.floor(basePop * 0.15),
        elderly: Math.floor(basePop * 0.1)
      }
    };

    // Initialize economy
    this.economy = {
      production: new Map(),
      consumption: new Map(),
      stockpiles: new Map(),
      tradeBalance: 0
    };

    // Initialize basic resource flows
    for (const resource of RESOURCE_TYPES) {
      const productionRate = this.calculateBaseProduction(resource, basePop);
      const consumptionRate = this.calculateBaseConsumption(resource, basePop);

      this.economy.production.set(resource, productionRate);
      this.economy.consumption.set(resource, consumptionRate);
      this.economy.stockpiles.set(resource, productionRate * 100); // 100 ticks worth
    }

    // Initialize stability (starts healthy)
    this.stability = {
      overall: 80 + Math.random() * 15,
      economic: 75 + Math.random() * 20,
      social: 80 + Math.random() * 15,
      infrastructure: 85 + Math.random() * 10,
      happiness: 70 + Math.random() * 25
    };

    // Initialize tech progression
    const baseTechLevel = Math.floor(Math.random() * 6); // 0-5
    this.tech = {
      level: baseTechLevel,
      research: Math.random() * 100,
      efficiency: 1.0 + baseTechLevel * 0.15  // +15% per level
    };

    // Initialize research infrastructure based on tier and population
    this.initializeResearch(basePop, baseTechLevel);
  }

  private initializeResearch(population: number, techLevel: number): void {
    // Universities scale with population and tech level
    // Gigasegment: hundreds of universities
    // Megasegment: tens of universities
    // Smaller tiers: fewer universities
    const universitiesPerBillion = 0.1 + techLevel * 0.05; // Tech increases university density
    const billionPop = population / 1_000_000_000;
    this.universities = Math.floor(billionPop * universitiesPerBillion * (1 + Math.random() * 0.5));

    // Research guilds - 2-5 random fields per tier
    const researchFields = [
      'physics', 'chemistry', 'energy_systems', 'megastructure_architecture',
      'biological_augmentation', 'artificial_intelligence'
    ];

    const numGuilds = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numGuilds; i++) {
      const field = researchFields[Math.floor(Math.random() * researchFields.length)];
      const count = this.researchGuilds.get(field) || 0;
      this.researchGuilds.set(field, count + 1 + Math.floor(Math.random() * 3));
    }

    // Scientist pool - HARD STEPS model
    // Need 100× tier-N scientists before tier-(N+1) can emerge
    // This creates a research ladder you can't skip
    const totalScientists = Math.floor(population * 0.0001); // 0.01% of population

    // Start with tier-1 scientists (baseline)
    let tier1Count = Math.floor(totalScientists);
    this.scientistPool.set(1, tier1Count);

    // Hard step progression: tier-N requires 100× tier-(N-1)
    const tierProgression = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    for (let i = 1; i < tierProgression.length; i++) {
      const prevTier = tierProgression[i - 1];
      const currTier = tierProgression[i];
      const prevCount = this.scientistPool.get(prevTier) || 0;

      // Can only have tier-N if you have 100× tier-(N-1)
      const maxCurrTier = Math.floor(prevCount / 100);
      if (maxCurrTier > 0) {
        // Some emerge based on conditions, but capped by hard limit
        const emergenceRate = Math.random() * 0.1; // 0-10% of max
        const currCount = Math.max(1, Math.floor(maxCurrTier * emergenceRate));
        this.scientistPool.set(currTier, currCount);
      } else {
        // Not enough tier-(N-1), no tier-N possible
        break;
      }
    }

    // Large populations have better emergence rates for high tiers
    if (population > 10_000_000_000) { // 10 billion+
      this.boostHighTierEmergence([8, 9, 10], 1.5);
    }
    if (population > 100_000_000_000) { // 100 billion+
      this.boostHighTierEmergence([9, 10], 2.0);
    }
  }

  private boostHighTierEmergence(tiers: number[], multiplier: number): void {
    for (const tier of tiers) {
      const current = this.scientistPool.get(tier) || 0;
      if (current > 0) {
        this.scientistPool.set(tier, Math.floor(current * multiplier));
      }
    }
  }

  protected calculateBaseProduction(resource: ResourceType, population: number): number {
    const perCapita: Record<ResourceType, number> = {
      food: 2.0,
      water: 5.0,
      energy: 1.0,
      materials: 0.5,
      technology: 0.01,
      luxury_goods: 0.001,
      exotic_matter: 0.0001,
      dimensional_crystals: 0.00001
    };

    return population * (perCapita[resource] || 0);
  }

  protected calculateBaseConsumption(resource: ResourceType, population: number): number {
    const perCapita: Record<ResourceType, number> = {
      food: 2.0,
      water: 5.0,
      energy: 0.8,
      materials: 0.3,
      technology: 0.005,
      luxury_goods: 0.0005,
      exotic_matter: 0.00005,
      dimensional_crystals: 0.000005
    };

    return population * (perCapita[resource] || 0);
  }

  update(deltaTime: number): void {
    this.tick += deltaTime * this.timeScale;

    if (this.mode === 'abstract') {
      this.updateAbstract(deltaTime);
    } else if (this.mode === 'semi-active') {
      this.updateSemiActive(deltaTime);
    } else {
      this.updateActive(deltaTime);
    }

    // Update children
    for (const child of this.children) {
      child.update(deltaTime);
    }
  }

  protected updateAbstract(deltaTime: number): void {
    // 1. Apply tech efficiency to production
    const techBonus = this.tech.efficiency;

    // Production/consumption simulation with tech modifier
    for (const [resource, baseProduction] of this.economy.production) {
      const production = baseProduction * techBonus * this.stability.infrastructure / 100;
      const consumption = this.economy.consumption.get(resource) || 0;
      const currentStock = this.economy.stockpiles.get(resource) || 0;

      const netChange = (production - consumption) * deltaTime;
      const newStock = Math.max(0, currentStock + netChange);

      // Validate stockpile is finite
      if (isFinite(newStock)) {
        this.economy.stockpiles.set(resource, newStock);
      } else {
        // Reset to baseline production if stockpile becomes invalid
        this.economy.stockpiles.set(resource, baseProduction * 100);
      }
    }

    // 2. Auto-stabilizers: Form trade routes on imbalances
    this.autoFormTradeRoutes();

    // 3. Logistic population growth affected by stability and happiness
    // Validate carrying capacity (prevent division by zero)
    if (this.population.carryingCapacity <= 0) {
      const scale = TIER_SCALES[this.tier];
      this.population.carryingCapacity = scale.populationRange[1];
    }

    const intrinsicGrowthRate = 0.001 * (this.stability.happiness / 100);
    const populationPressure = 1 - (this.population.total / this.population.carryingCapacity);
    const logisticGrowth = intrinsicGrowthRate * this.population.total * populationPressure;

    this.population.total = Math.max(0, this.population.total + logisticGrowth * deltaTime);
    this.population.growth = logisticGrowth;

    // Validate population is finite
    if (!isFinite(this.population.total)) {
      const scale = TIER_SCALES[this.tier];
      this.population.total = scale.populationRange[0]; // Reset to minimum
      this.population.growth = 0;
    }

    // Update distribution
    this.population.distribution.workers = Math.floor(this.population.total * 0.6);
    this.population.distribution.children = Math.floor(this.population.total * 0.15);
    this.population.distribution.elderly = Math.floor(this.population.total * 0.1);
    this.population.distribution.military = Math.floor(this.population.total * 0.05);
    this.population.distribution.researchers = Math.floor(this.population.total * 0.1);

    // 4. Tech progression (research accumulates)
    const researchRate = this.population.distribution.researchers * 0.01 * deltaTime;
    this.tech.research += researchRate;
    if (this.tech.research >= 100 && this.tech.level < 10) {
      this.tech.level += 1;
      this.tech.research = 0;
      this.tech.efficiency = 1.0 + this.tech.level * 0.15;

      // Tech breakthrough event!
      this.triggerEvent('tech_breakthrough', 5);
    }

    // 5. Update stability based on resources and population
    this.updateStability();

    // 6. Process active events
    this.processActiveEvents(deltaTime);

    // 7. Random event generation
    if (Math.random() < 0.001 * deltaTime) { // 0.1% chance per tick
      this.generateRandomEvent();
    }

    // 8. Resource shortages reduce carrying capacity
    let resourcePenalty = 1.0;
    for (const [resource, stock] of this.economy.stockpiles) {
      const consumption = this.economy.consumption.get(resource) || 0;
      if (stock < consumption * 10) {
        resourcePenalty *= 0.95;
      }
    }

    const scale = TIER_SCALES[this.tier];
    const baseCapacity = scale.populationRange[1];
    const minCapacity = scale.populationRange[0]; // Minimum capacity
    const targetCapacity = baseCapacity * resourcePenalty * (this.stability.overall / 100);
    this.population.carryingCapacity += (targetCapacity - this.population.carryingCapacity) * 0.01;

    // Enforce minimum carrying capacity (never below tier minimum)
    this.population.carryingCapacity = Math.max(minCapacity, this.population.carryingCapacity);
  }

  private autoFormTradeRoutes(): void {
    // Auto-stabilizer: Form trade routes with siblings when resources are imbalanced
    if (this.children.length < 2) return;

    for (let i = 0; i < this.children.length; i++) {
      for (let j = i + 1; j < this.children.length; j++) {
        const childA = this.children[i];
        const childB = this.children[j];

        // Check for complementary shortages/surpluses
        for (const resource of RESOURCE_TYPES) {
          const stockA = childA.economy.stockpiles.get(resource) || 0;
          const stockB = childB.economy.stockpiles.get(resource) || 0;
          const consA = childA.economy.consumption.get(resource) || 1;
          const consB = childB.economy.consumption.get(resource) || 1;

          // A has surplus, B has shortage
          if (stockA > consA * 50 && stockB < consB * 5) {
            this.createAutoTradeRoute(childA.id, childB.id, resource);
          }
          // B has surplus, A has shortage
          else if (stockB > consB * 50 && stockA < consA * 5) {
            this.createAutoTradeRoute(childB.id, childA.id, resource);
          }
        }
      }
    }
  }

  private createAutoTradeRoute(fromId: string, toId: string, resource: ResourceType): void {
    const routeId = `auto_${fromId}_${toId}_${resource}`;

    // Check if route already exists
    if (this.tradeRoutes.some(r => r.id === routeId)) return;

    const transferAmount = 100; // Base transfer amount
    this.tradeRoutes.push({
      id: routeId,
      from: fromId,
      to: toId,
      resources: new Map([[resource, transferAmount]]),
      type: 'physical_route',
      active: true,
      efficiency: 0.8 + Math.random() * 0.2
    });
  }

  private updateStability(): void {
    // Economic stability based on resource stockpiles
    let resourceScore = 0;
    let resourceCount = 0;
    for (const [resource, stock] of this.economy.stockpiles) {
      const consumption = this.economy.consumption.get(resource) || 1;
      const daysOfStock = stock / consumption;
      resourceScore += Math.min(100, daysOfStock * 2); // 50 days = 100 score
      resourceCount++;
    }
    // Prevent division by zero if no resources tracked
    this.stability.economic = resourceCount > 0 ? resourceScore / resourceCount : 50;

    // Social stability affected by population pressure
    const overcrowding = this.population.total / this.population.carryingCapacity;
    this.stability.social = 100 - Math.min(50, overcrowding * 50);

    // Infrastructure decays slowly, improved by tech
    this.stability.infrastructure += (this.tech.level * 5 - this.stability.infrastructure) * 0.01;

    // Happiness is average of economic and social
    this.stability.happiness = (this.stability.economic + this.stability.social) / 2;

    // Overall is weighted average
    this.stability.overall =
      this.stability.economic * 0.4 +
      this.stability.social * 0.3 +
      this.stability.infrastructure * 0.2 +
      this.stability.happiness * 0.1;

    // Clamp all values to 0-100 and ensure no NaN/Infinity
    for (const key of Object.keys(this.stability) as (keyof StabilityMetrics)[]) {
      const value = this.stability[key];
      // Replace NaN/Infinity with safe default
      if (!isFinite(value)) {
        this.stability[key] = 50; // Neutral stability
      } else {
        this.stability[key] = Math.max(0, Math.min(100, value));
      }
    }
  }

  private processActiveEvents(deltaTime: number): void {
    this.activeEvents = this.activeEvents.filter(event => {
      event.duration -= deltaTime;

      // Apply event effects
      if (event.effects.stabilityChange) {
        this.stability.overall += event.effects.stabilityChange * deltaTime * 0.1;
      }
      if (event.effects.populationChange) {
        this.population.total += event.effects.populationChange * deltaTime;
      }
      if (event.effects.resourceModifier) {
        for (const [resource, modifier] of event.effects.resourceModifier) {
          const current = this.economy.production.get(resource) || 0;
          this.economy.production.set(resource, current * modifier);
        }
      }

      return event.duration > 0; // Keep if duration remains
    });
  }

  private generateRandomEvent(): void {
    const eventTypes: EventType[] = [
      'tech_breakthrough',
      'resource_discovery',
      'cultural_renaissance',
      'trade_boom',
      'population_boom',
      'natural_disaster',
      'resource_shortage',
      'civil_unrest',
      'infrastructure_failure',
      'pandemic'
    ];

    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const severity = 1 + Math.floor(Math.random() * 10);
    this.triggerEvent(type, severity);
  }

  private triggerEvent(type: EventType, severity: number): void {
    const event: GameEvent = {
      id: `${this.id}_${type}_${this.tick}`,
      type,
      tier: this.id,
      tick: this.tick,
      severity,
      duration: 50 + Math.random() * 100, // 50-150 ticks
      description: this.getEventDescription(type, severity),
      effects: this.getEventEffects(type, severity)
    };

    this.activeEvents.push(event);
  }

  private getEventDescription(type: EventType, severity: number): string {
    const descriptions: Record<EventType, string> = {
      tech_breakthrough: `Tech breakthrough (Lv ${this.tech.level})! Production efficiency increased.`,
      resource_discovery: `New resource deposits discovered! +${severity * 10}% production.`,
      cultural_renaissance: `Cultural renaissance spreading! Happiness +${severity * 5}.`,
      trade_boom: `Trade boom! Commerce efficiency +${severity * 3}%.`,
      population_boom: `Population boom! Growth rate +${severity}%.`,
      natural_disaster: `Natural disaster (severity ${severity})! Infrastructure damaged.`,
      resource_shortage: `Critical shortage detected! Stability -${severity * 2}.`,
      civil_unrest: `Civil unrest spreading! Social stability -${severity * 3}.`,
      infrastructure_failure: `Infrastructure collapse! Production -${severity * 5}%.`,
      pandemic: `Pandemic outbreak! Population decline imminent.`,
      war: `War declared! Military mobilization.`,
      migration_wave: `Mass migration event! Population shifting.`
    };
    return descriptions[type];
  }

  private getEventEffects(type: EventType, severity: number): GameEvent['effects'] {
    const effects: Record<EventType, GameEvent['effects']> = {
      tech_breakthrough: { stabilityChange: severity },
      resource_discovery: { resourceModifier: new Map([['materials', 1 + severity * 0.1]]) },
      cultural_renaissance: { stabilityChange: severity },
      trade_boom: { stabilityChange: severity * 0.5 },
      population_boom: { populationChange: this.population.total * severity * 0.01 },
      natural_disaster: { stabilityChange: -severity, resourceModifier: new Map([['materials', 0.9]]) },
      resource_shortage: { stabilityChange: -severity * 2 },
      civil_unrest: { stabilityChange: -severity * 3 },
      infrastructure_failure: { stabilityChange: -severity, resourceModifier: new Map([['energy', 0.95]]) },
      pandemic: { populationChange: -this.population.total * severity * 0.01 },
      war: { stabilityChange: -severity * 5, populationChange: -this.population.total * severity * 0.02 },
      migration_wave: { populationChange: (Math.random() > 0.5 ? 1 : -1) * this.population.total * severity * 0.01 }
    };
    return effects[type];
  }

  addEvent(event: GameEvent): void {
    this.activeEvents.push(event);
  }

  protected updateSemiActive(deltaTime: number): void {
    // Similar to abstract but with more granularity
    this.updateAbstract(deltaTime);

    // Additional semi-active logic
    this.updateTradeRoutes(deltaTime);
  }

  protected updateActive(deltaTime: number): void {
    // Full simulation (would integrate with ECS)
    this.updateAbstract(deltaTime);
    this.updateTradeRoutes(deltaTime);

    // Additional active logic (placeholder for ECS integration)
  }

  protected updateTradeRoutes(deltaTime: number): void {
    for (const route of this.tradeRoutes) {
      if (!route.active) continue;

      for (const [resource, amount] of route.resources) {
        const transferAmount = amount * route.efficiency * deltaTime;

        // Deduct from this tier's stockpile
        const currentStock = this.economy.stockpiles.get(resource) || 0;
        this.economy.stockpiles.set(resource, Math.max(0, currentStock - transferAmount));
      }
    }
  }

  activate(): void {
    if (this.mode === 'abstract') {
      this.mode = 'semi-active';
      this.timeScale = 1.0;
    } else if (this.mode === 'semi-active') {
      this.mode = 'active';
      this.timeScale = 1.0;
    }
  }

  deactivate(): void {
    if (this.mode === 'active') {
      this.mode = 'semi-active';
      this.timeScale = 0.5;
    } else if (this.mode === 'semi-active') {
      this.mode = 'abstract';
      this.timeScale = 0.1;
    }
  }

  addChild(child: AbstractTier): void {
    this.children.push(child);
  }

  removeChild(childId: string): boolean {
    const index = this.children.findIndex(c => c.id === childId);
    if (index !== -1) {
      this.children.splice(index, 1);
      return true;
    }
    return false;
  }

  getChild(childId: string): AbstractTier | undefined {
    return this.children.find(c => c.id === childId);
  }

  getAllDescendants(): AbstractTier[] {
    const descendants: AbstractTier[] = [];
    for (const child of this.children) {
      descendants.push(child);
      descendants.push(...child.getAllDescendants());
    }
    return descendants;
  }

  getTotalPopulation(): number {
    let total = this.population.total;
    for (const child of this.children) {
      total += child.getTotalPopulation();
    }
    return total;
  }

  toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      tier: this.tier,
      address: this.address,
      mode: this.mode,
      tick: this.tick,
      timeScale: this.timeScale,
      population: this.population,
      economy: {
        production: Array.from(this.economy.production.entries()),
        consumption: Array.from(this.economy.consumption.entries()),
        stockpiles: Array.from(this.economy.stockpiles.entries()),
        tradeBalance: this.economy.tradeBalance
      },
      tradeRoutes: this.tradeRoutes,
      transportHubs: this.transportHubs,
      childrenCount: this.children.length
    };
  }
}
