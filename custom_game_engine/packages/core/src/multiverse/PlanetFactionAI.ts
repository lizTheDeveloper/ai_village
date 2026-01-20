/**
 * PlanetFactionAI - AI decision maker for planet-scale factions
 *
 * Makes strategic decisions for entire civilizations:
 * - When to invade other worlds
 * - How to expand territory
 * - When to develop vs explore vs fight
 *
 * Runs at AbstractPlanet tier (statistical simulation, O(1) cost)
 * Designed for RimWorld-style autonomous faction behavior
 */

import type { AbstractPlanet } from '@ai-village/hierarchy-simulator';
import type {
  CulturalTraits,
  FactionDecision,
  PlanetState,
  InvasionType,
} from './BackgroundUniverseTypes.js';

/**
 * Fast PRNG for deterministic decisions (xorshift32)
 */
class FastRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x;
    return (x >>> 0) / 0x100000000;
  }
}

/**
 * PlanetFactionAI - Autonomous decision-making for planet-scale civilizations
 *
 * Decision flow:
 * 1. Check tech level (can they reach space/time/dimensions?)
 * 2. Check discovery (have they found player's world?)
 * 3. Calculate invasion score (aggression, population pressure, military power)
 * 4. Make decision (develop, explore, prepare, invade)
 */
export class PlanetFactionAI {
  private planet: AbstractPlanet;
  private personality: CulturalTraits;
  private invasionThreshold: number;
  private rng: FastRNG;

  // State tracking (updated via updateState)
  private state: PlanetState;

  // Decision history (for pattern analysis)
  private decisionHistory: FactionDecision[] = [];
  private readonly maxHistoryLength = 50;

  // Constants (precomputed for performance)
  private readonly MIN_INVASION_TECH = 7; // Need interstellar travel
  private readonly MIN_INVASION_POP = 100_000_000; // 100M minimum
  private readonly DISCOVERY_CHANCE_PER_TICK = 0.00001; // 0.001% per tick
  private readonly FLEET_SIZE_RATIO = 0.001; // 0.1% of population

  constructor(
    planet: AbstractPlanet,
    personality: CulturalTraits,
    invasionThreshold: number = 0.7,
    seed?: number
  ) {
    this.planet = planet;
    this.personality = personality;
    this.invasionThreshold = invasionThreshold;
    this.rng = new FastRNG(seed ?? Date.now());

    // Initialize state from planet
    this.state = this.extractStateFromPlanet(planet);
  }

  /**
   * Update internal state from planet statistics.
   * Called by BackgroundUniverseManager after each simulation step.
   */
  updateState(newState: Partial<PlanetState>): void {
    this.state = { ...this.state, ...newState };
  }

  /**
   * Make a strategic decision based on current state.
   *
   * Returns decision type and supporting data.
   * This is the main entry point called each tick by BackgroundUniverseManager.
   */
  makeDecision(): FactionDecision {
    // 1. Check if civilization has collapsed
    if (this.state.stability < 0.1 || this.state.population < 1_000_000) {
      return this.makeCollapseDecision();
    }

    // 2. Check tech prerequisites
    if (this.state.techLevel < this.MIN_INVASION_TECH) {
      return this.makeDevelopmentDecision();
    }

    // 3. Update interstellar capability flag
    if (!this.state.hasInterstellarTech && this.state.techLevel >= this.MIN_INVASION_TECH) {
      this.state.hasInterstellarTech = true;
    }

    // 4. Check player discovery
    if (!this.state.hasDiscoveredPlayer) {
      return this.makeDiscoveryDecision();
    }

    // 5. Player discovered - calculate invasion score
    const invasionScore = this.calculateInvasionScore();

    // 6. Make decision based on score
    if (invasionScore >= this.invasionThreshold) {
      return this.makeInvasionDecision(invasionScore);
    } else if (invasionScore >= this.invasionThreshold * 0.7) {
      return this.makePreparationDecision(invasionScore);
    } else if (this.shouldAttemptDiplomacy()) {
      return this.makeNegotiationDecision();
    } else {
      return this.makeDevelopmentDecision();
    }
  }

  /**
   * Get current planet state (for external queries)
   */
  getState(): Readonly<PlanetState> {
    return this.state;
  }

  /**
   * Get cultural personality (for external queries)
   */
  getPersonality(): Readonly<CulturalTraits> {
    return this.personality;
  }

  /**
   * Get decision history (for analysis/debugging)
   */
  getDecisionHistory(): ReadonlyArray<FactionDecision> {
    return this.decisionHistory;
  }

  // ============================================================================
  // Private Decision Methods
  // ============================================================================

  /**
   * Decision when civilization is collapsing
   */
  private makeCollapseDecision(): FactionDecision {
    const decision: FactionDecision = {
      type: 'retreat',
      reason: `Civilization collapsing (stability: ${this.state.stability.toFixed(2)}, pop: ${this.state.population})`,
      confidence: 1.0,
    };

    this.recordDecision(decision);
    return decision;
  }

  /**
   * Decision when tech level is too low for invasion
   */
  private makeDevelopmentDecision(): FactionDecision {
    const decision: FactionDecision = {
      type: 'develop',
      reason: `Insufficient tech level (current: ${this.state.techLevel}, needed: ${this.MIN_INVASION_TECH})`,
      confidence: 0.9,
    };

    this.recordDecision(decision);
    return decision;
  }

  /**
   * Decision when searching for player's world
   */
  private makeDiscoveryDecision(): FactionDecision {
    // Random chance to discover player each tick
    const discovered = this.rng.next() < this.DISCOVERY_CHANCE_PER_TICK;

    if (discovered) {
      this.state.hasDiscoveredPlayer = true;

      const decision: FactionDecision = {
        type: 'discovered_player',
        reason: 'Telescope detection of inhabited world',
        confidence: 0.95,
      };

      this.recordDecision(decision);
      return decision;
    }

    const decision: FactionDecision = {
      type: 'explore',
      reason: 'Searching for inhabited worlds via deep space surveys',
      confidence: 0.7,
    };

    this.recordDecision(decision);
    return decision;
  }

  /**
   * Decision when building up forces before invasion
   */
  private makePreparationDecision(invasionScore: number): FactionDecision {
    const decision: FactionDecision = {
      type: 'prepare',
      reason: `Building invasion forces (score: ${invasionScore.toFixed(2)}, threshold: ${this.invasionThreshold})`,
      confidence: 0.8,
    };

    this.recordDecision(decision);
    return decision;
  }

  /**
   * Decision to launch invasion
   */
  private makeInvasionDecision(invasionScore: number): FactionDecision {
    // Select dominant civilization as invader
    const invaderFaction = this.selectInvaderFaction();

    // Calculate fleet size (0.1% of total population)
    const fleetSize = Math.floor(this.state.population * this.FLEET_SIZE_RATIO);

    // Select invasion type based on cultural traits
    const invasionType = this.selectInvasionType();

    // Calculate travel time (if applicable)
    const estimatedTicks = this.calculateTravelTime();

    const decision: FactionDecision = {
      type: 'invade',
      reason: `Strategic opportunity detected (score: ${invasionScore.toFixed(2)})`,
      invasionType,
      fleetSize,
      estimatedTicks,
      factionId: invaderFaction,
      confidence: invasionScore,
    };

    this.recordDecision(decision);
    return decision;
  }

  /**
   * Decision to attempt diplomacy
   */
  private makeNegotiationDecision(): FactionDecision {
    const decision: FactionDecision = {
      type: 'negotiate',
      reason: 'Cultural traits favor peaceful contact',
      confidence: 0.6,
    };

    this.recordDecision(decision);
    return decision;
  }

  // ============================================================================
  // Calculation Methods
  // ============================================================================

  /**
   * Calculate invasion score (0-1)
   *
   * Factors:
   * - Aggressiveness (cultural trait)
   * - Population pressure (overpopulation)
   * - Military power
   * - Tech advantage
   * - Economic strength
   * - Active wars (negative factor)
   */
  private calculateInvasionScore(): number {
    let score = 0;

    // 1. Aggressiveness (40% weight)
    score += this.personality.aggressiveness * 0.4;

    // 2. Population pressure (30% weight)
    const pressureScore = Math.max(0, this.state.populationPressure - 0.8);
    score += pressureScore * 0.3;

    // 3. Military power (20% weight)
    score += this.state.militaryPower * 0.2;

    // 4. Tech advantage (10% weight)
    // Assume player at tech level 5 (TODO: query actual player tier)
    const assumedPlayerTech = 5;
    if (this.state.techLevel > assumedPlayerTech) {
      const techAdvantage = (this.state.techLevel - assumedPlayerTech) / 5; // Normalize to 0-1
      score += techAdvantage * 0.1;
    }

    // 5. Penalties

    // Active wars reduce invasion likelihood (spread too thin)
    if (this.state.activeWars > 0) {
      score -= this.state.activeWars * 0.1;
    }

    // Low stability reduces invasion likelihood
    if (this.state.stability < 0.5) {
      score -= (0.5 - this.state.stability) * 0.2;
    }

    // Cooperative cultures less likely to invade
    score -= this.personality.cooperation * 0.15;

    // Mysticism reduces tech-based invasion likelihood
    score -= this.personality.mysticism * 0.1;

    return Math.max(0, Math.min(1.0, score));
  }

  /**
   * Select which faction/civilization is leading the invasion
   */
  private selectInvaderFaction(): string {
    // Use dominant civilization if available
    if (this.planet.majorCivilizations.length > 0) {
      // Find largest civilization
      let largest = this.planet.majorCivilizations[0];
      for (const civ of this.planet.majorCivilizations) {
        if (civ.population > largest.population) {
          largest = civ;
        }
      }
      return largest.id;
    }

    // Fallback: use planet ID
    return this.planet.id;
  }

  /**
   * Select invasion type based on cultural traits
   */
  private selectInvasionType(): InvasionType {
    // Weighted selection based on personality

    const weights = {
      military: this.personality.aggressiveness * 0.5 + this.personality.technophilia * 0.3,
      cultural: this.personality.cooperation * 0.4 + (1 - this.personality.xenophobia) * 0.4,
      economic: this.personality.cooperation * 0.3 + this.personality.technophilia * 0.2,
      dimensional: this.personality.mysticism * 0.6 + this.personality.technophilia * 0.2,
      temporal: this.personality.mysticism * 0.4 + this.personality.technophilia * 0.4,
      viral: this.personality.xenophobia * 0.5 + this.personality.collectivism * 0.3,
      swarm: this.personality.collectivism * 0.6 + this.personality.aggressiveness * 0.3,
    };

    // Tech level gates (some invasion types require higher tech)
    if (this.state.techLevel < 8) {
      weights.temporal = 0; // Time travel requires tech 8+
    }
    if (this.state.techLevel < 9) {
      weights.dimensional = 0; // Dimensional travel requires tech 9+
    }

    // Find maximum weight
    let maxType: InvasionType = 'military';
    let maxWeight = weights.military;

    for (const [type, weight] of Object.entries(weights)) {
      if (weight > maxWeight) {
        maxWeight = weight;
        maxType = type as InvasionType;
      }
    }

    return maxType;
  }

  /**
   * Calculate travel time to target (in ticks)
   *
   * Assumes 50 light-years distance (TODO: use actual distance)
   * Speed based on tech level:
   * - Tech 7: 0.1c (500 years)
   * - Tech 8: 0.5c (100 years)
   * - Tech 9: 1.0c (50 years)
   * - Tech 10: 10c (5 years) [FTL]
   */
  private calculateTravelTime(): bigint {
    const distanceLightYears = 50; // TODO: Get actual distance
    const ticksPerYear = 525600n; // 1 tick = 1 minute

    // Speed of light fraction based on tech level
    let speedFraction = 0.1; // 10% light speed at tech 7
    if (this.state.techLevel >= 10) {
      speedFraction = 10.0; // FTL at tech 10
    } else if (this.state.techLevel >= 9) {
      speedFraction = 1.0; // Light speed at tech 9
    } else if (this.state.techLevel >= 8) {
      speedFraction = 0.5; // 50% light speed at tech 8
    }

    const travelYears = distanceLightYears / speedFraction;
    return BigInt(Math.floor(travelYears)) * ticksPerYear;
  }

  /**
   * Check if faction should attempt diplomacy instead of invasion
   */
  private shouldAttemptDiplomacy(): boolean {
    // High cooperation + low xenophobia = diplomacy
    const diplomacyScore = (this.personality.cooperation * 0.6) + ((1 - this.personality.xenophobia) * 0.4);

    // Random chance based on diplomacy score
    return this.rng.next() < diplomacyScore * 0.3; // Max 30% chance
  }

  /**
   * Extract planet state from AbstractPlanet
   */
  private extractStateFromPlanet(planet: AbstractPlanet): PlanetState {
    // Calculate population pressure
    const pressure = planet.population.total / planet.population.carryingCapacity;

    // Calculate military power (based on population and tech)
    const militaryPower = (planet.population.distribution.military / planet.population.total) *
      (planet.tech.level / 10);

    // Calculate economic strength
    const economicStrength = planet.civilizationStats.industrialization / 10;

    return {
      population: planet.population.total,
      techLevel: planet.tech.level,
      populationPressure: pressure,
      militaryPower,
      economicStrength,
      stability: planet.stability.overall,
      resources: {
        food: planet.economy.resourceStockpiles.get('food') ?? 0,
        metal: planet.economy.resourceStockpiles.get('metal') ?? 0,
        energy: planet.economy.resourceStockpiles.get('energy') ?? 0,
      },
      activeWars: planet.majorCivilizations.reduce(
        (sum, civ) => sum + civ.activeWars.length,
        0
      ),
      hasDiscoveredPlayer: false,
      hasInterstellarTech: planet.tech.level >= this.MIN_INVASION_TECH,
      currentTick: 0n,
    };
  }

  /**
   * Record decision in history (for analysis)
   */
  private recordDecision(decision: FactionDecision): void {
    this.decisionHistory.push(decision);

    // Trim history if too long
    if (this.decisionHistory.length > this.maxHistoryLength) {
      this.decisionHistory.shift();
    }
  }
}
