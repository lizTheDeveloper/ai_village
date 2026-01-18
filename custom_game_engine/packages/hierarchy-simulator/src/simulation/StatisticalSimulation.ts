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
 */

import type { AbstractPlanet } from '../abstraction/AbstractPlanet.js';
import type { AbstractSystem } from '../abstraction/AbstractSystem.js';
import type { AbstractSector } from '../abstraction/AbstractSector.js';
import type { AbstractGalaxy } from '../abstraction/AbstractGalaxy.js';
import type { ResourceType } from '../abstraction/types.js';
import { TIME_SCALE } from '../renormalization/TierConstants.js';

// ============================================================================
// Constants
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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate logistic growth rate
 * dP/dt = r * P * (1 - P/K)
 */
function logisticGrowth(
  population: number,
  carryingCapacity: number,
  intrinsicRate: number
): number {
  if (carryingCapacity <= 0) return 0;
  const pressure = 1 - population / carryingCapacity;
  return intrinsicRate * population * Math.max(0, pressure);
}

/**
 * Calculate tech research cost for a given level
 */
function getTechCost(level: number): number {
  return (
    TECH_CONSTANTS.BASE_RESEARCH_COST *
    Math.pow(level + 1, TECH_CONSTANTS.COST_SCALING_EXPONENT)
  );
}

/**
 * Generate random event based on stability
 */
function shouldGenerateEvent(stability: number, baseProbability: number): boolean {
  const stabilityModifier = (100 - stability) * EVENT_CONSTANTS.STABILITY_EVENT_MODIFIER;
  const probability = Math.max(0, baseProbability + stabilityModifier);
  return Math.random() < probability;
}

/**
 * Clamp value to valid range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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
 */
export function simulatePlanetTier(planet: AbstractPlanet, deltaTime: number): void {
  const dt = deltaTime * TIME_SCALE.planet;

  // 1. Population dynamics - logistic growth
  const happinessModifier =
    POPULATION_CONSTANTS.HAPPINESS_MODIFIER_MIN +
    (planet.stability.happiness / 100) *
      (POPULATION_CONSTANTS.HAPPINESS_MODIFIER_MAX -
        POPULATION_CONSTANTS.HAPPINESS_MODIFIER_MIN);

  const intrinsicRate = POPULATION_CONSTANTS.BASE_GROWTH_RATE * happinessModifier;

  // Tech enhances carrying capacity
  const techBonus = 1 + planet.tech.level * POPULATION_CONSTANTS.TECH_CAPACITY_BONUS;
  const effectiveCapacity = planet.population.carryingCapacity * techBonus;

  // Apply logistic growth
  const growth = logisticGrowth(
    planet.population.total,
    effectiveCapacity,
    intrinsicRate
  );
  planet.population.total += growth * dt;

  // Stability decline causes population loss
  if (planet.stability.overall < POPULATION_CONSTANTS.STABILITY_DECLINE_THRESHOLD) {
    const declineRate = 0.01 * (POPULATION_CONSTANTS.STABILITY_DECLINE_THRESHOLD - planet.stability.overall);
    planet.population.total *= Math.pow(1 - declineRate, dt);
  }

  planet.population.growth = growth;
  planet.population.total = Math.max(1000, planet.population.total); // Minimum viable population

  // 2. Technology progression
  const researchOutput =
    planet.population.distribution.researchers * TECH_CONSTANTS.RESEARCH_PER_SCIENTIST;
  planet.tech.research += researchOutput * dt;

  // Check for tech level advancement
  const techCost = getTechCost(planet.tech.level);
  if (planet.tech.research >= techCost && planet.tech.level < 10) {
    planet.tech.level += 1;
    planet.tech.research -= techCost;
    planet.tech.efficiency = 1.0 + planet.tech.level * TECH_CONSTANTS.EFFICIENCY_PER_LEVEL;

    // Update civilization stats
    planet.civilizationStats.avgTechLevel = planet.tech.level;
    planet.civilizationStats.industrialization = planet.tech.level;
  }

  // 3. Economic simulation
  const infrastructureMod =
    1 + (planet.stability.infrastructure - 50) * ECONOMY_CONSTANTS.INFRASTRUCTURE_IMPACT;
  const techMod = planet.tech.efficiency;

  for (const [resource, baseProduction] of planet.economy.production) {
    // Production affected by tech and infrastructure
    const production = baseProduction * techMod * infrastructureMod;
    const consumption = planet.economy.consumption.get(resource) || 0;
    const currentStock = planet.economy.stockpiles.get(resource) || 0;

    // Net change with decay
    const netChange =
      (production - consumption) * dt - currentStock * ECONOMY_CONSTANTS.DECAY_RATE * dt;
    const newStock = Math.max(0, currentStock + netChange);

    planet.economy.stockpiles.set(resource, newStock);
  }

  // 4. Civilization development
  planet.civilizationStats.urbanization = Math.min(
    1.0,
    planet.civilizationStats.urbanization + 0.001 * dt * planet.tech.level
  );

  // Planetary unification at high tech
  if (planet.civilizationStats.nationCount > 1 && planet.tech.level >= 8) {
    if (Math.random() < 0.01 * dt) {
      planet.civilizationStats.nationCount = Math.max(
        1,
        planet.civilizationStats.nationCount - 1
      );
      if (planet.civilizationStats.nationCount === 1) {
        planet.civilizationStats.governmentType = 'unified';
      }
    }
  }

  // 5. Megastructure construction
  if (planet.tech.level >= 9 && planet.megastructures.length === 0) {
    if (Math.random() < 0.001 * dt) {
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
  for (const megastructure of planet.megastructures) {
    if (!megastructure.operational) {
      megastructure.constructionProgress += 0.01 * dt;
      if (megastructure.constructionProgress >= 1.0) {
        megastructure.operational = true;
      }
    }
  }

  // 6. Random events
  if (shouldGenerateEvent(planet.stability.overall, EVENT_CONSTANTS.BASE_EVENT_CHANCE * dt)) {
    // Event generation handled by base class
  }

  // Update distribution
  updatePopulationDistribution(planet.population);
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
 */
export function simulateSystemTier(system: AbstractSystem, deltaTime: number): void {
  const dt = deltaTime * TIME_SCALE.system;

  // 1. System-wide population growth (aggregate from planets)
  const happinessModifier =
    POPULATION_CONSTANTS.HAPPINESS_MODIFIER_MIN +
    (system.stability.happiness / 100) *
      (POPULATION_CONSTANTS.HAPPINESS_MODIFIER_MAX -
        POPULATION_CONSTANTS.HAPPINESS_MODIFIER_MIN);

  const intrinsicRate = POPULATION_CONSTANTS.BASE_GROWTH_RATE * happinessModifier * 0.5; // Slower at system scale
  const techBonus = 1 + system.tech.level * POPULATION_CONSTANTS.TECH_CAPACITY_BONUS;
  const effectiveCapacity = system.population.carryingCapacity * techBonus;

  const growth = logisticGrowth(system.population.total, effectiveCapacity, intrinsicRate);
  system.population.total += growth * dt;
  system.population.growth = growth;

  // 2. Spacefaring development
  if (system.tech.level >= 7) {
    system.systemStats.spacefaringCivCount = 1;

    // Orbital infrastructure expansion
    if (system.orbitalInfrastructure.length < 10 && Math.random() < 0.05 * dt) {
      const types: Array<'station' | 'shipyard' | 'habitat' | 'refinery' | 'defense_platform'> =
        ['station', 'shipyard', 'habitat', 'refinery', 'defense_platform'];
      const type = types[Math.floor(Math.random() * types.length)];

      system.orbitalInfrastructure.push({
        id: `${system.id}_orbital_${system.orbitalInfrastructure.length}`,
        type,
        location: {
          orbitingBody: 'star',
          orbitalRadius: 0.5 + Math.random() * 4.5,
        },
        population:
          type === 'habitat'
            ? 10000 + Math.floor(Math.random() * 1000000)
            : 100 + Math.floor(Math.random() * 10000),
        capacity: 100000 + Math.floor(Math.random() * 10000000),
        operational: true,
      });
    }
  }

  // 3. FTL capability at high tech
  if (system.tech.level >= 9) {
    system.systemStats.ftlCapable = 1;
  }

  // 4. Technology advancement
  const researchOutput =
    system.population.distribution.researchers * TECH_CONSTANTS.RESEARCH_PER_SCIENTIST;
  system.tech.research += researchOutput * dt;

  const techCost = getTechCost(system.tech.level);
  if (system.tech.research >= techCost && system.tech.level < 10) {
    system.tech.level += 1;
    system.tech.research -= techCost;
    system.tech.efficiency = 1.0 + system.tech.level * TECH_CONSTANTS.EFFICIENCY_PER_LEVEL;
    system.systemStats.maxTechLevel = system.tech.level;
  }

  // 5. Asteroid mining
  for (const belt of system.asteroidBelts) {
    if (system.tech.level >= 8 && belt.miningStations < 10) {
      // Gradually build mining stations
      if (Math.random() < 0.02 * dt) {
        belt.miningStations += 1;
      }
    }

    // Extract resources
    if (belt.miningStations > 0) {
      for (const [resource, yield_] of belt.resourceYield) {
        const currentStock = system.economy.stockpiles.get(resource as ResourceType) || 0;
        const extraction = yield_ * belt.miningStations * dt * 0.01;
        system.economy.stockpiles.set(resource as ResourceType, currentStock + extraction);
      }
    }
  }

  // 6. Economic output calculation
  let totalEconomicOutput = 0;
  for (const [_, production] of system.economy.production) {
    totalEconomicOutput += production;
  }
  system.systemStats.economicOutput = totalEconomicOutput * system.tech.efficiency;

  // 7. Defense buildup
  system.systemStats.defensePower = system.orbitalInfrastructure
    .filter((i) => i.type === 'defense_platform' && i.operational)
    .length * system.tech.level;

  // 8. System population update
  system.systemStats.totalPopulation = system.getTotalPopulation();

  updatePopulationDistribution(system.population);
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
 */
export function simulateSectorTier(sector: AbstractSector, deltaTime: number): void {
  const dt = deltaTime * TIME_SCALE.sector;

  // 1. Sector-wide population (slower growth at this scale)
  const happinessModifier =
    POPULATION_CONSTANTS.HAPPINESS_MODIFIER_MIN +
    (sector.stability.happiness / 100) *
      (POPULATION_CONSTANTS.HAPPINESS_MODIFIER_MAX -
        POPULATION_CONSTANTS.HAPPINESS_MODIFIER_MIN);

  const intrinsicRate = POPULATION_CONSTANTS.BASE_GROWTH_RATE * happinessModifier * 0.2; // Much slower
  const techBonus = 1 + sector.tech.level * POPULATION_CONSTANTS.TECH_CAPACITY_BONUS;
  const effectiveCapacity = sector.population.carryingCapacity * techBonus;

  const growth = logisticGrowth(sector.population.total, effectiveCapacity, intrinsicRate);
  sector.population.total += growth * dt;
  sector.population.growth = growth;

  // 2. Technology advancement
  const researchOutput =
    sector.population.distribution.researchers * TECH_CONSTANTS.RESEARCH_PER_SCIENTIST;
  sector.tech.research += researchOutput * dt;

  const techCost = getTechCost(sector.tech.level);
  if (sector.tech.research >= techCost && sector.tech.level < 10) {
    sector.tech.level += 1;
    sector.tech.research -= techCost;
    sector.tech.efficiency = 1.0 + sector.tech.level * TECH_CONSTANTS.EFFICIENCY_PER_LEVEL;
    sector.sectorStats.maxTechLevel = sector.tech.level;
    sector.sectorStats.avgTechLevel = sector.tech.level;
  }

  // 3. Wormhole network expansion (at high tech)
  if (sector.tech.level >= 9 && sector.infrastructure.wormholeGates.length < 10) {
    if (Math.random() < 0.01 * dt) {
      const gateCount = sector.infrastructure.wormholeGates.length;
      sector.infrastructure.wormholeGates.push({
        id: `${sector.id}_wormhole_${gateCount}`,
        sourceSystem: `system_${gateCount}`,
        destinationSystem: `system_${Math.floor(Math.random() * Math.max(1, gateCount))}`,
        distance: 5 + Math.random() * 10,
        travelTime: 7,
        stability: 0.8 + Math.random() * 0.2,
        operational: true,
      });
    }
  }

  // 4. Economic integration grows with peace
  if (sector.sectorStats.politicalStability > 0.7) {
    sector.sectorStats.economicIntegration = Math.min(
      1.0,
      sector.sectorStats.economicIntegration + 0.005 * dt
    );
  } else {
    // Wars reduce integration
    sector.sectorStats.economicIntegration = Math.max(
      0.1,
      sector.sectorStats.economicIntegration - 0.01 * dt
    );
  }

  // 5. Political dynamics - stability evolution
  if (sector.sectorStats.activeWars > 0) {
    sector.sectorStats.politicalStability = Math.max(
      0.1,
      sector.sectorStats.politicalStability - 0.01 * dt
    );
  } else {
    sector.sectorStats.politicalStability = Math.min(
      1.0,
      sector.sectorStats.politicalStability + 0.01 * dt
    );
  }

  // 6. Empire consolidation (at high stability)
  if (
    sector.politicalEntities.length > 1 &&
    sector.sectorStats.politicalStability > 0.9 &&
    Math.random() < 0.001 * dt
  ) {
    // Merge two entities
    const entity1 = sector.politicalEntities[0];
    const entity2 = sector.politicalEntities[1];
    entity1.population += entity2.population;
    entity1.militaryPower += entity2.militaryPower;
    sector.politicalEntities.splice(1, 1);

    sector.sectorEvents.push({
      tick: sector.tick,
      type: 'empire_rise',
      participants: [entity1.id, entity2.id],
      description: `${entity1.name} and ${entity2.name} merged into unified sector empire`,
    });
  }

  // 7. Update political entities
  for (const entity of sector.politicalEntities) {
    entity.techLevel = sector.tech.level;
    entity.militaryPower = Math.floor(entity.population * 0.05 * entity.techLevel);
  }

  // 8. Sector statistics update
  sector.sectorStats.totalPopulation = sector.getTotalPopulation();
  sector.sectorStats.spacefaringCivCount = sector.tech.level >= 7 ? 1 : 0;
  sector.sectorStats.ftlCapableCivCount = sector.tech.level >= 9 ? 1 : 0;

  updatePopulationDistribution(sector.population);
}

// ============================================================================
// Galaxy-tier Simulation
// ============================================================================

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
 */
export function simulateGalaxyTier(galaxy: AbstractGalaxy, deltaTime: number): void {
  const dt = deltaTime * TIME_SCALE.galaxy;

  // 1. Galactic population (very slow growth at this scale)
  const happinessModifier =
    POPULATION_CONSTANTS.HAPPINESS_MODIFIER_MIN +
    (galaxy.stability.happiness / 100) *
      (POPULATION_CONSTANTS.HAPPINESS_MODIFIER_MAX -
        POPULATION_CONSTANTS.HAPPINESS_MODIFIER_MIN);

  const intrinsicRate = POPULATION_CONSTANTS.BASE_GROWTH_RATE * happinessModifier * 0.05; // Glacial
  const techBonus = 1 + galaxy.tech.level * POPULATION_CONSTANTS.TECH_CAPACITY_BONUS;
  const effectiveCapacity = galaxy.population.carryingCapacity * techBonus;

  const growth = logisticGrowth(galaxy.population.total, effectiveCapacity, intrinsicRate);
  galaxy.population.total += growth * dt;
  galaxy.population.growth = growth;

  // 2. Civilization advancement
  let totalKardashevLevel = 0;
  let totalEnergyOutput = 0;

  for (const civ of galaxy.galacticCivilizations) {
    // Slow Kardashev progression
    civ.kardashevLevel = Math.min(3.5, civ.kardashevLevel + 0.001 * dt);

    // Population growth
    civ.population *= 1 + 0.01 * dt;

    // Tech progression
    civ.techLevel = galaxy.tech.level;

    // Energy output scales exponentially with Kardashev level
    civ.energyOutput = Math.pow(10, 26 + civ.kardashevLevel * 10);

    // Dyson sphere construction at K2+
    if (civ.kardashevLevel >= 2.0 && civ.dysonSpheres < 100) {
      if (Math.random() < 0.001 * dt) {
        civ.dysonSpheres += 1;
      }
    }

    totalKardashevLevel += civ.kardashevLevel;
    totalEnergyOutput += civ.energyOutput;
  }

  galaxy.galacticStats.avgKardashevLevel =
    galaxy.galacticCivilizations.length > 0
      ? totalKardashevLevel / galaxy.galacticCivilizations.length
      : 0;
  galaxy.galacticStats.totalEnergyOutput = totalEnergyOutput;

  // 3. Technology advancement
  const researchOutput =
    galaxy.population.distribution.researchers * TECH_CONSTANTS.RESEARCH_PER_SCIENTIST;
  galaxy.tech.research += researchOutput * dt;

  const techCost = getTechCost(galaxy.tech.level);
  if (galaxy.tech.research >= techCost && galaxy.tech.level < 10) {
    galaxy.tech.level += 1;
    galaxy.tech.research -= techCost;
    galaxy.tech.efficiency = 1.0 + galaxy.tech.level * TECH_CONSTANTS.EFFICIENCY_PER_LEVEL;
    galaxy.galacticStats.maxTechLevel = galaxy.tech.level;
  }

  // 4. Wormhole network expansion
  if (galaxy.tech.level >= 9) {
    galaxy.infrastructure.wormholeNetwork.nodeCount = 100 + Math.floor(galaxy.tech.level * 100);
    galaxy.infrastructure.wormholeNetwork.totalConnections =
      galaxy.infrastructure.wormholeNetwork.nodeCount * 3;
    galaxy.infrastructure.wormholeNetwork.coverage = Math.min(1.0, galaxy.tech.level / 10);
  }

  // 5. Galactic governance formation
  if (
    !galaxy.governance &&
    galaxy.galacticCivilizations.length >= 3 &&
    galaxy.tech.level >= 10 &&
    Math.random() < 0.0001 * dt
  ) {
    galaxy.governance = {
      type: 'galactic_council',
      founded: galaxy.tick,
      memberCivilizations: galaxy.galacticCivilizations.map((c) => c.id),
      laws: ['non_aggression_pact', 'technology_sharing', 'dimensional_stability_protocol'],
      enforcement: 0.7,
    };

    galaxy.cosmicEvents.push({
      tick: galaxy.tick,
      type: 'civilization_rise',
      participants: galaxy.galacticCivilizations.map((c) => c.id),
      description: 'Galactic Council formed - unified governance established',
      impact: 'galactic',
    });
  }

  // 6. Mega-events
  if (Math.random() < EVENT_CONSTANTS.MEGA_EVENT_CHANCE * dt) {
    const megaEventTypes: Array<
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

    const eventType = megaEventTypes[Math.floor(Math.random() * megaEventTypes.length)];

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
        galaxy.tech.level = Math.min(10, galaxy.tech.level + 1);
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
  galaxy.galacticStats.activeCivilizations = galaxy.galacticCivilizations.length;

  updatePopulationDistribution(galaxy.population);
}

// ============================================================================
// Shared Helpers
// ============================================================================

/**
 * Update population distribution based on total population
 */
function updatePopulationDistribution(population: {
  total: number;
  distribution: {
    workers: number;
    military: number;
    researchers: number;
    children: number;
    elderly: number;
  };
}): void {
  population.distribution.workers = Math.floor(population.total * 0.6);
  population.distribution.children = Math.floor(population.total * 0.15);
  population.distribution.elderly = Math.floor(population.total * 0.1);
  population.distribution.military = Math.floor(population.total * 0.05);
  population.distribution.researchers = Math.floor(population.total * 0.1);
}
