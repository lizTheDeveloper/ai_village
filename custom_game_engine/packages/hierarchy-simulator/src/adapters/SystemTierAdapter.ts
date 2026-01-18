/**
 * SystemTierAdapter - Manages star system abstraction with multiple planets
 *
 * Converts between:
 * - Multiple Planet instances (from @ai-village/world) in a star system
 * - AbstractSystem tier (from hierarchy-simulator) with orbital mechanics
 *
 * Purpose: Enable grand strategy simulation of entire star systems with
 * multiple planets, asteroid belts, and orbital infrastructure.
 */

import { AbstractSystem } from '../abstraction/AbstractSystem.js';
import { AbstractPlanet } from '../abstraction/AbstractPlanet.js';
import { PlanetTierAdapter, ResourceSummary } from './PlanetTierAdapter.js';
import type { UniversalAddress } from '../abstraction/types.js';
import type { Planet } from '@ai-village/world';

/**
 * Configuration for creating a star system.
 */
export interface SystemConfig {
  id: string;
  name: string;
  starType: 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';
  address: Partial<UniversalAddress>;
}

/**
 * Aggregated resource data for an entire star system.
 */
export interface SystemResourceSummary {
  totalWater: number;
  totalMetals: number;
  totalRareEarths: number;
  totalFossilFuels: number;
  totalGeothermalEnergy: number;
  planetCount: number;
  habitableCount: number;
}

/**
 * Adapter for managing AbstractSystem with multiple planets.
 */
export class SystemTierAdapter {
  /**
   * Create an AbstractSystem from multiple Planet instances.
   *
   * Aggregates data from all planets in the system and creates
   * a grand strategy tier for system-level simulation.
   *
   * @param planets - Array of Planet instances in this star system
   * @param config - System configuration (name, star type, etc.)
   */
  static createSystem(planets: Planet[], config: SystemConfig): AbstractSystem {
    if (!planets) {
      throw new Error('SystemTierAdapter.createSystem: planets parameter is required');
    }
    if (!config) {
      throw new Error('SystemTierAdapter.createSystem: config parameter is required');
    }
    if (planets.length === 0) {
      throw new Error('SystemTierAdapter.createSystem: planets array cannot be empty');
    }

    // Create abstract system
    const abstractSystem = new AbstractSystem(
      config.id,
      config.name,
      config.address
    );

    // Override star type if specified
    if (config.starType) {
      abstractSystem.star.type = config.starType;
      // Recalculate star parameters based on type
      this.updateStarParameters(abstractSystem, config.starType);
    }

    // Add each planet as a child tier
    for (let i = 0; i < planets.length; i++) {
      const planet = planets[i];

      // Create address for planet within system
      const planetAddress: Partial<UniversalAddress> = {
        ...config.address,
        // Could add orbital position here if needed
      };

      // Convert planet to abstract tier
      const abstractPlanet = PlanetTierAdapter.fromPlanet(planet, planetAddress);

      // Add as child
      abstractSystem.addChild(abstractPlanet);
    }

    // Sync system statistics from children
    this.syncSystemStats(abstractSystem);

    return abstractSystem;
  }

  /**
   * Get all planets within the habitable zone of this star system.
   *
   * Returns AbstractPlanet children that fall within the habitable zone
   * based on their inferred orbital distance.
   */
  static getPlanetsInHabitableZone(abstractSystem: AbstractSystem): AbstractPlanet[] {
    if (!abstractSystem) {
      throw new Error('SystemTierAdapter.getPlanetsInHabitableZone: abstractSystem parameter is required');
    }

    const habitableZone = abstractSystem.habitableZone;
    const planets: AbstractPlanet[] = [];

    for (const child of abstractSystem.children) {
      if (child.tier !== 'planet') {
        continue;
      }

      const abstractPlanet = child as AbstractPlanet;

      // Infer orbital distance from planet temperature
      const orbitalDistance = this.inferOrbitalDistance(
        abstractPlanet,
        abstractSystem.star.luminosity
      );

      // Check if in habitable zone
      if (orbitalDistance >= habitableZone.inner && orbitalDistance <= habitableZone.outer) {
        planets.push(abstractPlanet);
      }
    }

    return planets;
  }

  /**
   * Get aggregated resource summary for entire star system.
   *
   * Sums resources across all planets, asteroid belts, and orbital infrastructure.
   */
  static getSystemResources(abstractSystem: AbstractSystem): SystemResourceSummary {
    if (!abstractSystem) {
      throw new Error('SystemTierAdapter.getSystemResources: abstractSystem parameter is required');
    }

    let totalWater = 0;
    let totalMetals = 0;
    let totalRareEarths = 0;
    let totalFossilFuels = 0;
    let totalGeothermalEnergy = 0;
    let planetCount = 0;
    let habitableCount = 0;

    // Aggregate from planets
    for (const child of abstractSystem.children) {
      if (child.tier !== 'planet') {
        continue;
      }

      planetCount++;
      const abstractPlanet = child as AbstractPlanet;

      // Check if habitable
      const orbitalDistance = this.inferOrbitalDistance(
        abstractPlanet,
        abstractSystem.star.luminosity
      );
      if (
        orbitalDistance >= abstractSystem.habitableZone.inner &&
        orbitalDistance <= abstractSystem.habitableZone.outer
      ) {
        habitableCount++;
      }

      // Add planet resources
      const resources = PlanetTierAdapter.getResourceSummary(abstractPlanet);
      totalWater += resources.water;
      totalMetals += resources.metals;
      totalRareEarths += resources.rare_earths;
      totalFossilFuels += resources.fossil_fuels;
      totalGeothermalEnergy += resources.geothermal_energy;
    }

    // Add asteroid belt resources
    for (const belt of abstractSystem.asteroidBelts) {
      totalMetals += belt.resourceYield.get('metals') ?? 0;
      totalRareEarths += belt.resourceYield.get('rare_minerals') ?? 0;
      totalWater += belt.resourceYield.get('water_ice') ?? 0;
    }

    return {
      totalWater,
      totalMetals,
      totalRareEarths,
      totalFossilFuels,
      totalGeothermalEnergy,
      planetCount,
      habitableCount,
    };
  }

  /**
   * Add a new planet to an existing star system.
   *
   * Converts the Planet to an AbstractPlanet and adds it as a child tier.
   */
  static addPlanet(abstractSystem: AbstractSystem, planet: Planet): AbstractPlanet {
    if (!abstractSystem) {
      throw new Error('SystemTierAdapter.addPlanet: abstractSystem parameter is required');
    }
    if (!planet) {
      throw new Error('SystemTierAdapter.addPlanet: planet parameter is required');
    }

    // Create planet address within system
    const planetAddress: Partial<UniversalAddress> = {
      ...abstractSystem.address,
    };

    // Convert to abstract tier
    const abstractPlanet = PlanetTierAdapter.fromPlanet(planet, planetAddress);

    // Add as child
    abstractSystem.addChild(abstractPlanet);

    // Update system statistics
    this.syncSystemStats(abstractSystem);

    return abstractPlanet;
  }

  /**
   * Get the primary/homeworld planet in this system.
   *
   * Returns the planet with the highest population.
   */
  static getPrimaryPlanet(abstractSystem: AbstractSystem): AbstractPlanet | undefined {
    if (!abstractSystem) {
      throw new Error('SystemTierAdapter.getPrimaryPlanet: abstractSystem parameter is required');
    }

    let primaryPlanet: AbstractPlanet | undefined;
    let maxPopulation = 0;

    for (const child of abstractSystem.children) {
      if (child.tier !== 'planet') {
        continue;
      }

      const abstractPlanet = child as AbstractPlanet;
      if (abstractPlanet.population.total > maxPopulation) {
        maxPopulation = abstractPlanet.population.total;
        primaryPlanet = abstractPlanet;
      }
    }

    return primaryPlanet;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Update star parameters based on spectral type.
   */
  private static updateStarParameters(
    abstractSystem: AbstractSystem,
    starType: 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M'
  ): void {
    // Stellar parameters by type (simplified from main sequence)
    const params: Record<string, { mass: number; luminosity: number }> = {
      O: { mass: 50, luminosity: 500000 },
      B: { mass: 8, luminosity: 10000 },
      A: { mass: 2, luminosity: 50 },
      F: { mass: 1.3, luminosity: 3 },
      G: { mass: 1.0, luminosity: 1.0 }, // Sun-like
      K: { mass: 0.7, luminosity: 0.3 },
      M: { mass: 0.3, luminosity: 0.05 },
    };

    const param = params[starType];
    if (!param) {
      throw new Error(`SystemTierAdapter.updateStarParameters: invalid star type ${starType}`);
    }

    abstractSystem.star.mass = param.mass;
    abstractSystem.star.luminosity = param.luminosity;

    // Recalculate habitable zone
    const sqrtL = Math.sqrt(param.luminosity);
    abstractSystem.habitableZone = {
      inner: 0.95 * sqrtL,
      outer: 1.37 * sqrtL,
    };
  }

  /**
   * Sync system-level statistics from child planets.
   */
  private static syncSystemStats(abstractSystem: AbstractSystem): void {
    let totalPopulation = 0;
    let maxTechLevel = 0;
    let spacefaringCount = 0;
    let ftlCapableCount = 0;

    for (const child of abstractSystem.children) {
      totalPopulation += child.getTotalPopulation();
      maxTechLevel = Math.max(maxTechLevel, child.tech.level);

      if (child.tech.level >= 7) {
        spacefaringCount++;
      }
      if (child.tech.level >= 9) {
        ftlCapableCount++;
      }
    }

    abstractSystem.systemStats.totalPopulation = totalPopulation;
    abstractSystem.systemStats.maxTechLevel = maxTechLevel;
    abstractSystem.systemStats.spacefaringCivCount = spacefaringCount;
    abstractSystem.systemStats.ftlCapable = ftlCapableCount;

    // Update system-level population
    abstractSystem.population.total = totalPopulation;
  }

  /**
   * Infer orbital distance from planet temperature characteristics.
   *
   * Uses climate zones to estimate how far the planet is from its star.
   */
  private static inferOrbitalDistance(
    abstractPlanet: AbstractPlanet,
    starLuminosity: number
  ): number {
    const climateZones = abstractPlanet.planetaryStats.climateZones;

    // High tropical/desert = hot planet = close to star
    // High polar/ice = cold planet = far from star
    const heatIndex = (climateZones.tropical + climateZones.desert) / 100;
    const coldIndex = climateZones.polar / 100;

    // Temperature gradient: -1 (very cold) to +1 (very hot)
    const temperatureGradient = heatIndex - coldIndex;

    // Map temperature to orbital distance
    // Hot planets: 0.5 AU, Temperate: 1.0 AU, Cold: 2.0 AU (scaled by luminosity)
    const sqrtL = Math.sqrt(starLuminosity);
    const baseDistance = 1.0 * sqrtL; // Earth-equivalent at 1 AU for Sun-like star

    // Adjust based on temperature
    // temperatureGradient = +1 -> 0.5x distance
    // temperatureGradient = 0 -> 1.0x distance
    // temperatureGradient = -1 -> 2.0x distance
    const distanceMultiplier = 1.0 - (temperatureGradient * 0.5);

    return baseDistance * distanceMultiplier;
  }
}
