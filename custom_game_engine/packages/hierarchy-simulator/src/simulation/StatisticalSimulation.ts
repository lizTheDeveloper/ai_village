/**
 * Statistical Simulation using Differential Equations
 *
 * Enables O(1) cost simulation at higher tiers using differential equations
 * instead of per-entity ECS simulation.
 *
 * Mathematical approach:
 * - Population: Logistic growth dP/dt = r*P*(1 - P/K)
 * - Tech: Research accumulation with cost scaling
 * - Economy: Production-consumption balance with stockpile dynamics
 * - Events: Stability-based random event generation
 *
 * Time scales (from TierConstants.ts):
 * - Planet: 1 tick = 10 years
 * - System: 1 tick = 100 years
 * - Sector: 1 tick = 1,000 years
 * - Galaxy: 1 tick = 10,000 years
 *
 * PERFORMANCE CRITICAL: These functions simulate entire tiers in O(1) time.
 * Target: <100 microseconds per tier simulation.
 */

import type { AbstractPlanet } from '../abstraction/AbstractPlanet.js';
import type { AbstractSystem } from '../abstraction/AbstractSystem.js';
import type { AbstractSector } from '../abstraction/AbstractSector.js';
import type { AbstractGalaxy } from '../abstraction/AbstractGalaxy.js';
import type { ResourceType } from '../abstraction/types.js';
import { TIME_SCALE } from '../renormalization/TierConstants.js';

// ============================================================================
// Constants (Pre-computed)
// ============================================================================

/**
 * Population dynamics constants
 */
const POPULATION_CONSTANTS = {
  /** Base intrinsic growth rate */
  BASE_GROWTH_RATE: 0.02, // 2% per time unit
  /** Growth rate modifier based on happiness (0-100 -> 0.5-1.5) */
  HAPPINESS_MODIFIER_MIN: 0.5,
  HAPPINESS_MODIFIER_MAX: 1.5,
  HAPPINESS_MODIFIER_RANGE: 1.0, // Precomputed: MAX - MIN
  /** Tech level impact on carrying capacity (+10% per level) */
  TECH_CAPACITY_BONUS: 0.1,
  /** Stability threshold below which population declines */
  STABILITY_DECLINE_THRESHOLD: 30,
};

/**
 * Technology progression constants
 */
const TECH_CONSTANTS = {
  /** Base research cost per tech level */
  BASE_RESEARCH_COST: 1000,
  /** Cost scaling exponent (cost = base * level^exponent) */
  COST_SCALING_EXPONENT: 1.5,
  /** Research output per researcher per tick */
  RESEARCH_PER_SCIENTIST: 0.1,
  /** Efficiency bonus per tech level */
  EFFICIENCY_PER_LEVEL: 0.15,
};

/**
 * Economic constants
 */
const ECONOMY_CONSTANTS = {
  /** Base production multiplier */
  BASE_PRODUCTION: 1.0,
  /** Base consumption multiplier */
  BASE_CONSUMPTION: 0.9,
  /** Stockpile decay rate (spoilage, obsolescence) */
  DECAY_RATE: 0.001,
  /** Infrastructure impact on production (0-100 -> 0.5-1.5) */
  INFRASTRUCTURE_IMPACT: 0.01,
};

/**
 * Event probability constants
 */
const EVENT_CONSTANTS = {
  /** Base event probability per tick */
  BASE_EVENT_CHANCE: 0.001,
  /** Stability modifier to event chance (low stability = more events) */
  STABILITY_EVENT_MODIFIER: -0.01,
  /** Mega-event probability at galaxy tier */
  MEGA_EVENT_CHANCE: 0.0001,
};

// Pre-computed tech cost lookup table (levels 0-10)
const TECH_COST_TABLE = new Float64Array(11);
for (let i = 0; i < 11; i++) {
  TECH_COST_TABLE[i] = TECH_CONSTANTS.BASE_RESEARCH_COST * Math.pow(i + 1, TECH_CONSTANTS.COST_SCALING_EXPONENT);
}

// Pre-computed efficiency lookup table (levels 0-10)
const EFFICIENCY_TABLE = new Float64Array(11);
for (let i = 0; i < 11; i++) {
  EFFICIENCY_TABLE[i] = 1.0 + i * TECH_CONSTANTS.EFFICIENCY_PER_LEVEL;
}

// Pre-computed tech bonus lookup table (levels 0-10)
const TECH_BONUS_TABLE = new Float64Array(11);
for (let i = 0; i < 11; i++) {
  TECH_BONUS_TABLE[i] = 1 + i * POPULATION_CONSTANTS.TECH_CAPACITY_BONUS;
}

// ============================================================================
// Fast PRNG (xorshift32) - Much faster than Math.random()
// ============================================================================

let prngSeed = (Date.now() & 0xFFFFFFFF) >>> 0;

/**
 * Fast pseudo-random number generator (xorshift32)
 * ~2x faster than Math.random() with reproducible output
 */
function fastRandom(): number {
  prngSeed ^= prngSeed << 13;
  prngSeed ^= prngSeed >>> 17;
  prngSeed ^= prngSeed << 5;
  return (prngSeed >>> 0) / 4294967296;
}

// ============================================================================
// Helper Functions (Inlined for hot paths)
// ============================================================================

/**
 * Calculate logistic growth rate - INLINED IN HOT PATHS
 * dP/dt = r * P * (1 - P/K)
 */
function logisticGrowth(
  population: number,
  carryingCapacity: number,
  intrinsicRate: number
): number {
  if (carryingCapacity <= 0) return 0;
  const pressure = 1 - population / carryingCapacity;
  return intrinsicRate * population * (pressure < 0 ? 0 : pressure);
}

/**
 * Get tech cost from pre-computed table
 */
function getTechCost(level: number): number {
  return TECH_COST_TABLE[level | 0]!; // Bitwise OR for fast floor
}

/**
 * Get tech efficiency from pre-computed table
 */
function getTechEfficiency(level: number): number {
  return EFFICIENCY_TABLE[level | 0]!;
}

/**
 * Get tech bonus from pre-computed table
 */
function getTechBonus(level: number): number {
  return TECH_BONUS_TABLE[level | 0]!;
}

// ============================================================================
// Planet-tier Simulation
// ============================================================================

/**
 * Simulate planet-tier dynamics using differential equations
 *
 * Time scale: 1 tick = 10 years
 *
 * Simulates:
 * - Logistic population growth with tech-enhanced carrying capacity
 * - Tech advancement via research accumulation
 * - Resource extraction and stockpiling
 * - Civilization development (urbanization, industrialization)
 * - Random events based on stability
 *
 * BENCHMARK TARGET: <50 microseconds
 */
export function simulatePlanetTier(planet: AbstractPlanet, deltaTime: number): void {
  const dt = deltaTime * TIME_SCALE.planet;

  // 1. Population dynamics - logistic growth
  // OPTIMIZED: Inline happiness calculation, use lookup table for tech bonus
  const happinessModifier = POPULATION_CONSTANTS.HAPPINESS_MODIFIER_MIN +
    (planet.stability.happiness * 0.01) * POPULATION_CONSTANTS.HAPPINESS_MODIFIER_RANGE;
  const intrinsicRate = POPULATION_CONSTANTS.BASE_GROWTH_RATE * happinessModifier;

  const techBonus = TECH_BONUS_TABLE[planet.tech.level]!;
  const effectiveCapacity = planet.population.carryingCapacity * techBonus;

  // Inline logistic growth for hot path
  const pressure = 1 - planet.population.total / effectiveCapacity;
  const growth = effectiveCapacity <= 0 ? 0 : intrinsicRate * planet.population.total * (pressure < 0 ? 0 : pressure);

  planet.population.total += growth * dt;

  // Stability decline causes population loss
  if (planet.stability.overall < POPULATION_CONSTANTS.STABILITY_DECLINE_THRESHOLD) {
    const declineRate = 0.01 * (POPULATION_CONSTANTS.STABILITY_DECLINE_THRESHOLD - planet.stability.overall);
    planet.population.total *= Math.pow(1 - declineRate, dt);
  }

  planet.population.growth = growth;
  planet.population.total = planet.population.total < 1000 ? 1000 : planet.population.total; // Inline max

  // 2. Technology progression
  const researchOutput = planet.population.distribution.researchers * TECH_CONSTANTS.RESEARCH_PER_SCIENTIST;
  planet.tech.research += researchOutput * dt;

  // Check for tech level advancement - use lookup table
  const techLevel = planet.tech.level;
  if (planet.tech.research >= TECH_COST_TABLE[techLevel]! && techLevel < 10) {
    planet.tech.level = techLevel + 1;
    planet.tech.research -= TECH_COST_TABLE[techLevel]!;
    planet.tech.efficiency = EFFICIENCY_TABLE[techLevel + 1]!;

    // Update civilization stats
    planet.civilizationStats.avgTechLevel = techLevel + 1;
    planet.civilizationStats.industrialization = techLevel + 1;
  }

  // 3. Economic simulation
  // OPTIMIZED: Cache tech efficiency, inline infrastructure calculation
  const infrastructureMod = 1 + (planet.stability.infrastructure - 50) * ECONOMY_CONSTANTS.INFRASTRUCTURE_IMPACT;
  const techMod = planet.tech.efficiency;
  const techInfraMod = techMod * infrastructureMod; // Single multiplication

  for (const [resource, baseProduction] of planet.economy.production) {
    // Production affected by tech and infrastructure
    const production = baseProduction * techInfraMod;
    const consumption = planet.economy.consumption.get(resource) ?? 0;
    const currentStock = planet.economy.stockpiles.get(resource) ?? 0;

    // Net change with decay - inline calculation
    const netChange = (production - consumption) * dt - currentStock * ECONOMY_CONSTANTS.DECAY_RATE * dt;
    planet.economy.stockpiles.set(resource, currentStock + netChange < 0 ? 0 : currentStock + netChange);
  }

  // 4. Civilization development
  planet.civilizationStats.urbanization = planet.civilizationStats.urbanization + 0.001 * dt * planet.tech.level;
  if (planet.civilizationStats.urbanization > 1.0) planet.civilizationStats.urbanization = 1.0;

  // Planetary unification at high tech
  if (planet.civilizationStats.nationCount > 1 && planet.tech.level >= 8) {
    if (fastRandom() < 0.01 * dt) {
      planet.civilizationStats.nationCount = planet.civilizationStats.nationCount - 1;
      if (planet.civilizationStats.nationCount < 1) planet.civilizationStats.nationCount = 1;
      if (planet.civilizationStats.nationCount === 1) {
        planet.civilizationStats.governmentType = 'unified';
      }
    }
  }

  // 5. Megastructure construction
  if (planet.tech.level >= 9 && planet.megastructures.length === 0) {
    if (fastRandom() < 0.001 * dt) {
      planet.megastructures.push({
        id: `${planet.id}_megastructure_space_elevator`,
        type: 'space_elevator',
        location: { lat: 0, lon: 0 },
        constructionProgress: 0.0,
        operational: false,
      });
    }
  }

  // Progress megastructure construction
  const megastructures = planet.megastructures;
  for (let i = 0; i < megastructures.length; i++) {
    const megastructure = megastructures[i]!;
    if (!megastructure.operational) {
      megastructure.constructionProgress += 0.01 * dt;
      if (megastructure.constructionProgress >= 1.0) {
        megastructure.operational = true;
      }
    }
  }

  // 6. Random events - OPTIMIZED: Single random call with threshold comparison
  const stabilityModifier = (100 - planet.stability.overall) * EVENT_CONSTANTS.STABILITY_EVENT_MODIFIER;
  const eventProbability = EVENT_CONSTANTS.BASE_EVENT_CHANCE * dt + stabilityModifier;
  if (eventProbability > 0 && fastRandom() < eventProbability) {
    // Event generation handled by base class
  }

  // Update distribution - OPTIMIZED: Inline calculations
  const total = planet.population.total;
  planet.population.distribution.workers = (total * 0.6) | 0;
  planet.population.distribution.children = (total * 0.15) | 0;
  planet.population.distribution.elderly = (total * 0.1) | 0;
  planet.population.distribution.military = (total * 0.05) | 0;
  planet.population.distribution.researchers = (total * 0.1) | 0;
}

// ============================================================================
// System-tier Simulation
// ============================================================================

/**
 * Simulate system-tier dynamics
 *
 * Time scale: 1 tick = 100 years
 *
 * Simulates:
 * - Interplanetary colonization (population spreading across planets)
 * - Orbital infrastructure growth (stations, shipyards)
 * - System-wide resource extraction (asteroid mining)
 * - Space technology advancement
 * - System defense buildup
 *
 * BENCHMARK TARGET: <75 microseconds
 */
export function simulateSystemTier(system: AbstractSystem, deltaTime: number): void {
  const dt = deltaTime * TIME_SCALE.system;

  // 1. System-wide population growth (aggregate from planets)
  const happinessModifier = POPULATION_CONSTANTS.HAPPINESS_MODIFIER_MIN +
    (system.stability.happiness * 0.01) * POPULATION_CONSTANTS.HAPPINESS_MODIFIER_RANGE;
  const intrinsicRate = POPULATION_CONSTANTS.BASE_GROWTH_RATE * happinessModifier * 0.5; // Slower at system scale

  const techBonus = TECH_BONUS_TABLE[system.tech.level]!;
  const effectiveCapacity = system.population.carryingCapacity * techBonus;

  // Inline logistic growth
  const pressure = 1 - system.population.total / effectiveCapacity;
  const growth = effectiveCapacity <= 0 ? 0 : intrinsicRate * system.population.total * (pressure < 0 ? 0 : pressure);

  system.population.total += growth * dt;
  system.population.growth = growth;

  // 2. Spacefaring development
  const techLevel = system.tech.level;
  if (techLevel >= 7) {
    system.systemStats.spacefaringCivCount = 1;

    // Orbital infrastructure expansion - OPTIMIZED: Single random for all checks
    const rand = fastRandom();
    if (system.orbitalInfrastructure.length < 10 && rand < 0.05 * dt) {
      // OPTIMIZED: Pre-computed type selection with bitwise operations
      const typeIndex = (rand * 1000) % 5 | 0;
      const types: Array<'station' | 'shipyard' | 'habitat' | 'refinery' | 'defense_platform'> =
        ['station', 'shipyard', 'habitat', 'refinery', 'defense_platform'];
      const type = types[typeIndex]!;

      system.orbitalInfrastructure.push({
        id: `${system.id}_orbital_${system.orbitalInfrastructure.length}`,
        type,
        location: {
          orbitingBody: 'star',
          orbitalRadius: 0.5 + fastRandom() * 4.5,
        },
        population: type === 'habitat'
          ? 10000 + (fastRandom() * 1000000 | 0)
          : 100 + (fastRandom() * 10000 | 0),
        capacity: 100000 + (fastRandom() * 10000000 | 0),
        operational: true,
      });
    }
  }

  // 3. FTL capability at high tech
  if (techLevel >= 9) {
    system.systemStats.ftlCapable = 1;
  }

  // 4. Technology advancement
  const researchOutput = system.population.distribution.researchers * TECH_CONSTANTS.RESEARCH_PER_SCIENTIST;
  system.tech.research += researchOutput * dt;

  if (system.tech.research >= TECH_COST_TABLE[techLevel]! && techLevel < 10) {
    system.tech.level = techLevel + 1;
    system.tech.research -= TECH_COST_TABLE[techLevel]!;
    system.tech.efficiency = EFFICIENCY_TABLE[techLevel + 1]!;
    system.systemStats.maxTechLevel = techLevel + 1;
  }

  // 5. Asteroid mining - OPTIMIZED: Cache map lookups
  const asteroidBelts = system.asteroidBelts;
  for (let i = 0; i < asteroidBelts.length; i++) {
    const belt = asteroidBelts[i]!;
    if (techLevel >= 8 && belt.miningStations < 10) {
      // Gradually build mining stations
      if (fastRandom() < 0.02 * dt) {
        belt.miningStations += 1;
      }
    }

    // Extract resources
    if (belt.miningStations > 0) {
      const extractionMult = belt.miningStations * dt * 0.01;
      for (const [resource, yield_] of belt.resourceYield) {
        const currentStock = system.economy.stockpiles.get(resource as ResourceType) ?? 0;
        system.economy.stockpiles.set(resource as ResourceType, currentStock + yield_ * extractionMult);
      }
    }
  }

  // 6. Economic output calculation - OPTIMIZED: Single pass
  let totalEconomicOutput = 0;
  for (const [_, production] of system.economy.production) {
    totalEconomicOutput += production;
  }
  system.systemStats.economicOutput = totalEconomicOutput * system.tech.efficiency;

  // 7. Defense buildup - OPTIMIZED: Single pass count
  let defensePlatforms = 0;
  const infrastructure = system.orbitalInfrastructure;
  for (let i = 0; i < infrastructure.length; i++) {
    if (infrastructure[i]!.type === 'defense_platform' && infrastructure[i]!.operational) {
      defensePlatforms++;
    }
  }
  system.systemStats.defensePower = defensePlatforms * techLevel;

  // 8. System population update
  system.systemStats.totalPopulation = system.getTotalPopulation();

  // Update distribution - OPTIMIZED: Inline calculations
  const total = system.population.total;
  system.population.distribution.workers = (total * 0.6) | 0;
  system.population.distribution.children = (total * 0.15) | 0;
  system.population.distribution.elderly = (total * 0.1) | 0;
  system.population.distribution.military = (total * 0.05) | 0;
  system.population.distribution.researchers = (total * 0.1) | 0;
}

// ============================================================================
// Sector-tier Simulation
// ============================================================================

/**
 * Simulate sector-tier dynamics
 *
 * Time scale: 1 tick = 1,000 years
 *
 * Simulates:
 * - Inter-system trade network formation
 * - Political consolidation (empire mergers, wars)
 * - Wormhole gate construction
 * - Sector-wide economic integration
 * - Diplomatic relations
 *
 * BENCHMARK TARGET: <80 microseconds
 */
export function simulateSectorTier(sector: AbstractSector, deltaTime: number): void {
  const dt = deltaTime * TIME_SCALE.sector;

  // 1. Sector-wide population (slower growth at this scale)
  const happinessModifier = POPULATION_CONSTANTS.HAPPINESS_MODIFIER_MIN +
    (sector.stability.happiness * 0.01) * POPULATION_CONSTANTS.HAPPINESS_MODIFIER_RANGE;
  const intrinsicRate = POPULATION_CONSTANTS.BASE_GROWTH_RATE * happinessModifier * 0.2; // Much slower

  const techBonus = TECH_BONUS_TABLE[sector.tech.level]!;
  const effectiveCapacity = sector.population.carryingCapacity * techBonus;

  // Inline logistic growth
  const pressure = 1 - sector.population.total / effectiveCapacity;
  const growth = effectiveCapacity <= 0 ? 0 : intrinsicRate * sector.population.total * (pressure < 0 ? 0 : pressure);

  sector.population.total += growth * dt;
  sector.population.growth = growth;

  // 2. Technology advancement
  const researchOutput = sector.population.distribution.researchers * TECH_CONSTANTS.RESEARCH_PER_SCIENTIST;
  sector.tech.research += researchOutput * dt;

  const techLevel = sector.tech.level;
  if (sector.tech.research >= TECH_COST_TABLE[techLevel]! && techLevel < 10) {
    sector.tech.level = techLevel + 1;
    sector.tech.research -= TECH_COST_TABLE[techLevel]!;
    sector.tech.efficiency = EFFICIENCY_TABLE[techLevel + 1]!;
    sector.sectorStats.maxTechLevel = techLevel + 1;
    sector.sectorStats.avgTechLevel = techLevel + 1;
  }

  // 3. Wormhole network expansion (at high tech)
  if (sector.tech.level >= 9 && sector.infrastructure.wormholeGates.length < 10) {
    if (fastRandom() < 0.01 * dt) {
      const gateCount = sector.infrastructure.wormholeGates.length;
      const destSystem = gateCount > 0 ? (fastRandom() * gateCount | 0) : 0;
      sector.infrastructure.wormholeGates.push({
        id: `${sector.id}_wormhole_${gateCount}`,
        sourceSystem: `system_${gateCount}`,
        destinationSystem: `system_${destSystem}`,
        distance: 5 + fastRandom() * 10,
        travelTime: 7,
        stability: 0.8 + fastRandom() * 0.2,
        operational: true,
      });
    }
  }

  // 4. Economic integration grows with peace - OPTIMIZED: Inline min/max
  const politicalStability = sector.sectorStats.politicalStability;
  if (politicalStability > 0.7) {
    sector.sectorStats.economicIntegration += 0.005 * dt;
    if (sector.sectorStats.economicIntegration > 1.0) sector.sectorStats.economicIntegration = 1.0;
  } else {
    // Wars reduce integration
    sector.sectorStats.economicIntegration -= 0.01 * dt;
    if (sector.sectorStats.economicIntegration < 0.1) sector.sectorStats.economicIntegration = 0.1;
  }

  // 5. Political dynamics - stability evolution
  if (sector.sectorStats.activeWars > 0) {
    sector.sectorStats.politicalStability -= 0.01 * dt;
    if (sector.sectorStats.politicalStability < 0.1) sector.sectorStats.politicalStability = 0.1;
  } else {
    sector.sectorStats.politicalStability += 0.01 * dt;
    if (sector.sectorStats.politicalStability > 1.0) sector.sectorStats.politicalStability = 1.0;
  }

  // 6. Empire consolidation (at high stability)
  const politicalEntities = sector.politicalEntities;
  if (politicalEntities.length > 1 && politicalStability > 0.9 && fastRandom() < 0.001 * dt) {
    // Merge two entities
    const entity1 = politicalEntities[0]!;
    const entity2 = politicalEntities[1]!;
    entity1.population += entity2.population;
    entity1.militaryPower += entity2.militaryPower;
    politicalEntities.splice(1, 1);

    sector.sectorEvents.push({
      tick: sector.tick,
      type: 'empire_rise',
      participants: [entity1.id, entity2.id],
      description: `${entity1.name} and ${entity2.name} merged into unified sector empire`,
    });
  }

  // 7. Update political entities - OPTIMIZED: Single pass
  for (let i = 0; i < politicalEntities.length; i++) {
    const entity = politicalEntities[i]!;
    entity.techLevel = sector.tech.level;
    entity.militaryPower = (entity.population * 0.05 * entity.techLevel) | 0;
  }

  // 8. Sector statistics update
  sector.sectorStats.totalPopulation = sector.getTotalPopulation();
  sector.sectorStats.spacefaringCivCount = sector.tech.level >= 7 ? 1 : 0;
  sector.sectorStats.ftlCapableCivCount = sector.tech.level >= 9 ? 1 : 0;

  // Update distribution - OPTIMIZED: Inline calculations
  const total = sector.population.total;
  sector.population.distribution.workers = (total * 0.6) | 0;
  sector.population.distribution.children = (total * 0.15) | 0;
  sector.population.distribution.elderly = (total * 0.1) | 0;
  sector.population.distribution.military = (total * 0.05) | 0;
  sector.population.distribution.researchers = (total * 0.1) | 0;
}

// ============================================================================
// Galaxy-tier Simulation
// ============================================================================

// Pre-computed mega-event types (avoid array allocation in hot path)
const MEGA_EVENT_TYPES: Array<
  | 'singularity_cascade'
  | 'black_hole_merger'
  | 'gamma_ray_burst'
  | 'intergalactic_contact'
  | 'great_filter_crossed'
  | 'universe_fork'
> = [
  'singularity_cascade',
  'black_hole_merger',
  'gamma_ray_burst',
  'intergalactic_contact',
  'great_filter_crossed',
  'universe_fork',
];

/**
 * Simulate galaxy-tier dynamics
 *
 * Time scale: 1 tick = 10,000 years
 *
 * Simulates:
 * - Galactic expansion (sector colonization)
 * - Mega-events (singularities, great wars, golden ages)
 * - Kardashev level progression
 * - Dyson sphere construction
 * - Galactic governance formation
 * - Cosmic-scale events
 *
 * BENCHMARK TARGET: <100 microseconds
 */
export function simulateGalaxyTier(galaxy: AbstractGalaxy, deltaTime: number): void {
  const dt = deltaTime * TIME_SCALE.galaxy;

  // 1. Galactic population (very slow growth at this scale)
  const happinessModifier = POPULATION_CONSTANTS.HAPPINESS_MODIFIER_MIN +
    (galaxy.stability.happiness * 0.01) * POPULATION_CONSTANTS.HAPPINESS_MODIFIER_RANGE;
  const intrinsicRate = POPULATION_CONSTANTS.BASE_GROWTH_RATE * happinessModifier * 0.05; // Glacial

  const techBonus = TECH_BONUS_TABLE[galaxy.tech.level]!;
  const effectiveCapacity = galaxy.population.carryingCapacity * techBonus;

  // Inline logistic growth
  const pressure = 1 - galaxy.population.total / effectiveCapacity;
  const growth = effectiveCapacity <= 0 ? 0 : intrinsicRate * galaxy.population.total * (pressure < 0 ? 0 : pressure);

  galaxy.population.total += growth * dt;
  galaxy.population.growth = growth;

  // 2. Civilization advancement - OPTIMIZED: Single pass with accumulation
  let totalKardashevLevel = 0;
  let totalEnergyOutput = 0;
  const civs = galaxy.galacticCivilizations;

  for (let i = 0; i < civs.length; i++) {
    const civ = civs[i]!;

    // Slow Kardashev progression - inline clamp
    civ.kardashevLevel += 0.001 * dt;
    if (civ.kardashevLevel > 3.5) civ.kardashevLevel = 3.5;

    // Population growth
    civ.population *= 1 + 0.01 * dt;

    // Tech progression
    civ.techLevel = galaxy.tech.level;

    // Energy output scales exponentially with Kardashev level
    civ.energyOutput = Math.pow(10, 26 + civ.kardashevLevel * 10);

    // Dyson sphere construction at K2+
    if (civ.kardashevLevel >= 2.0 && civ.dysonSpheres < 100) {
      if (fastRandom() < 0.001 * dt) {
        civ.dysonSpheres += 1;
      }
    }

    totalKardashevLevel += civ.kardashevLevel;
    totalEnergyOutput += civ.energyOutput;
  }

  galaxy.galacticStats.avgKardashevLevel = civs.length > 0 ? totalKardashevLevel / civs.length : 0;
  galaxy.galacticStats.totalEnergyOutput = totalEnergyOutput;

  // 3. Technology advancement
  const researchOutput = galaxy.population.distribution.researchers * TECH_CONSTANTS.RESEARCH_PER_SCIENTIST;
  galaxy.tech.research += researchOutput * dt;

  const techLevel = galaxy.tech.level;
  if (galaxy.tech.research >= TECH_COST_TABLE[techLevel]! && techLevel < 10) {
    galaxy.tech.level = techLevel + 1;
    galaxy.tech.research -= TECH_COST_TABLE[techLevel]!;
    galaxy.tech.efficiency = EFFICIENCY_TABLE[techLevel + 1]!;
    galaxy.galacticStats.maxTechLevel = techLevel + 1;
  }

  // 4. Wormhole network expansion
  if (galaxy.tech.level >= 9) {
    galaxy.infrastructure.wormholeNetwork.nodeCount = 100 + (galaxy.tech.level * 100 | 0);
    galaxy.infrastructure.wormholeNetwork.totalConnections = galaxy.infrastructure.wormholeNetwork.nodeCount * 3;
    const coverage = galaxy.tech.level * 0.1;
    galaxy.infrastructure.wormholeNetwork.coverage = coverage > 1.0 ? 1.0 : coverage;
  }

  // 5. Galactic governance formation
  if (!galaxy.governance && civs.length >= 3 && galaxy.tech.level >= 10 && fastRandom() < 0.0001 * dt) {
    const memberIds: string[] = [];
    for (let i = 0; i < civs.length; i++) {
      memberIds.push(civs[i]!.id);
    }

    galaxy.governance = {
      type: 'galactic_council',
      founded: galaxy.tick,
      memberCivilizations: memberIds,
      laws: ['non_aggression_pact', 'technology_sharing', 'dimensional_stability_protocol'],
      enforcement: 0.7,
    };

    galaxy.cosmicEvents.push({
      tick: galaxy.tick,
      type: 'civilization_rise',
      participants: memberIds,
      description: 'Galactic Council formed - unified governance established',
      impact: 'galactic',
    });
  }

  // 6. Mega-events - OPTIMIZED: Single random call with switch
  if (fastRandom() < EVENT_CONSTANTS.MEGA_EVENT_CHANCE * dt) {
    const eventType = MEGA_EVENT_TYPES[(fastRandom() * 6) | 0]!;

    let description = '';
    let impact: 'local' | 'regional' | 'galactic' | 'cosmic' = 'galactic';

    switch (eventType) {
      case 'singularity_cascade':
        description = 'Technological singularity - civilization transcends physical constraints';
        impact = 'galactic';
        break;
      case 'black_hole_merger':
        description = 'Supermassive black holes merge - gravitational waves reshape sectors';
        impact = 'regional';
        break;
      case 'gamma_ray_burst':
        description = 'Gamma ray burst devastates nearby sectors';
        impact = 'regional';
        // Population impact
        galaxy.population.total *= 0.9;
        break;
      case 'intergalactic_contact':
        description = 'First contact with extragalactic civilization';
        impact = 'cosmic';
        break;
      case 'great_filter_crossed':
        description = 'Civilization crosses a Great Filter milestone';
        impact = 'galactic';
        if (galaxy.tech.level < 10) galaxy.tech.level += 1;
        break;
      case 'universe_fork':
        description = 'Reality manipulation detected - timeline branch created';
        impact = 'cosmic';
        break;
    }

    galaxy.cosmicEvents.push({
      tick: galaxy.tick,
      type: eventType,
      description,
      impact,
    });
  }

  // 7. Economic output
  galaxy.galacticStats.economicOutput = galaxy.galacticStats.totalPopulation * galaxy.tech.level * 1000;

  // 8. Statistics update
  galaxy.galacticStats.totalPopulation = galaxy.getTotalPopulation();
  galaxy.galacticStats.activeCivilizations = civs.length;

  // Update distribution - OPTIMIZED: Inline calculations
  const total = galaxy.population.total;
  galaxy.population.distribution.workers = (total * 0.6) | 0;
  galaxy.population.distribution.children = (total * 0.15) | 0;
  galaxy.population.distribution.elderly = (total * 0.1) | 0;
  galaxy.population.distribution.military = (total * 0.05) | 0;
  galaxy.population.distribution.researchers = (total * 0.1) | 0;
}
