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

// ============================================================================
// Frozen Lookup Tables and Constants
// ============================================================================

interface StarParams {
  mass: number;
  luminosity: number;
  sqrtLuminosity: number; // Precomputed sqrt for performance
}

const STAR_PARAMS: Readonly<Record<string, StarParams>> = Object.freeze({
  O: { mass: 50, luminosity: 500000, sqrtLuminosity: 707.1067811865476 },
  B: { mass: 8, luminosity: 10000, sqrtLuminosity: 100 },
  A: { mass: 2, luminosity: 50, sqrtLuminosity: 7.0710678118654755 },
  F: { mass: 1.3, luminosity: 3, sqrtLuminosity: 1.7320508075688772 },
  G: { mass: 1.0, luminosity: 1.0, sqrtLuminosity: 1.0 },
  K: { mass: 0.7, luminosity: 0.3, sqrtLuminosity: 0.5477225575051661 },
  M: { mass: 0.3, luminosity: 0.05, sqrtLuminosity: 0.2236067977499789 },
});

// Habitable zone constants (precomputed)
const HZ_INNER_MULTIPLIER = 0.95;
const HZ_OUTER_MULTIPLIER = 1.37;

// Tech level thresholds
const TECH_SPACEFARING = 7;
const TECH_FTL_CAPABLE = 9;

// Climate normalization constant
const CLIMATE_NORM = 0.01; // 1/100

/**
 * Adapter for managing AbstractSystem with multiple planets.
 */
export class SystemTierAdapter {
  // Cache for orbital distance calculations
  private static orbitalDistanceCache = new Map<string, number>();

  // Cache for habitable zone calculations
  private static habitableZoneCache = new Map<string, AbstractPlanet[]>();
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
   *
   * Results are cached for performance during zoom operations.
   */
  static getPlanetsInHabitableZone(abstractSystem: AbstractSystem): AbstractPlanet[] {
    if (!abstractSystem) {
      throw new Error('SystemTierAdapter.getPlanetsInHabitableZone: abstractSystem parameter is required');
    }

    // Cache key based on system ID and children hash
    const cacheKey = `${abstractSystem.id}_${abstractSystem.children.length}`;
    const cached = this.habitableZoneCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const habitableZone = abstractSystem.habitableZone;
    const planets: AbstractPlanet[] = [];

    // Cache habitable zone bounds for loop
    const hzInner = habitableZone.inner;
    const hzOuter = habitableZone.outer;
    const luminosity = abstractSystem.star.luminosity;

    for (const child of abstractSystem.children) {
      if (child.tier !== 'planet') {
        continue;
      }

      const abstractPlanet = child as AbstractPlanet;

      // Infer orbital distance from planet temperature
      const orbitalDistance = this.inferOrbitalDistance(abstractPlanet, luminosity);

      // Check if in habitable zone
      if (orbitalDistance >= hzInner && orbitalDistance <= hzOuter) {
        planets.push(abstractPlanet);
      }
    }

    this.habitableZoneCache.set(cacheKey, planets);
    return planets;
  }

  /**
   * Get aggregated resource summary for entire star system.
   *
   * Sums resources across all planets, asteroid belts, and orbital infrastructure.
   * Single-pass optimization: Combines planet filtering, habitable zone checks, and resource aggregation.
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

    // Cache habitable zone bounds outside loop
    const hzInner = abstractSystem.habitableZone.inner;
    const hzOuter = abstractSystem.habitableZone.outer;
    const luminosity = abstractSystem.star.luminosity;

    // Single pass through children
    for (const child of abstractSystem.children) {
      if (child.tier !== 'planet') {
        continue;
      }

      planetCount++;
      const abstractPlanet = child as AbstractPlanet;

      // Check if habitable
      const orbitalDistance = this.inferOrbitalDistance(abstractPlanet, luminosity);
      if (orbitalDistance >= hzInner && orbitalDistance <= hzOuter) {
        habitableCount++;
      }

      // Add planet resources (inline to avoid function call and intermediate object)
      const resourceMap = abstractPlanet.planetaryStats.resourceAbundance;
      totalWater += resourceMap.get('water') ?? 0;
      totalMetals += resourceMap.get('metals') ?? 0;
      totalRareEarths += resourceMap.get('rare_earths') ?? 0;
      totalFossilFuels += resourceMap.get('fossil_fuels') ?? 0;
      totalGeothermalEnergy += resourceMap.get('geothermal_energy') ?? 0;
    }

    // Add asteroid belt resources (separate loop for clarity)
    for (const belt of abstractSystem.asteroidBelts) {
      const beltYield = belt.resourceYield;
      totalMetals += beltYield.get('metals') ?? 0;
      totalRareEarths += beltYield.get('rare_minerals') ?? 0;
      totalWater += beltYield.get('water_ice') ?? 0;
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
   * Uses precomputed sqrt(luminosity) for performance.
   */
  private static updateStarParameters(
    abstractSystem: AbstractSystem,
    starType: 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M'
  ): void {
    const param = STAR_PARAMS[starType];
    if (!param) {
      throw new Error(`SystemTierAdapter.updateStarParameters: invalid star type ${starType}`);
    }

    abstractSystem.star.mass = param.mass;
    abstractSystem.star.luminosity = param.luminosity;

    // Use precomputed sqrt for habitable zone (avoids Math.sqrt call)
    const sqrtL = param.sqrtLuminosity;
    abstractSystem.habitableZone = {
      inner: HZ_INNER_MULTIPLIER * sqrtL,
      outer: HZ_OUTER_MULTIPLIER * sqrtL,
    };
  }

  /**
   * Sync system-level statistics from child planets.
   * Single-pass optimization: Aggregates all stats in one loop.
   */
  private static syncSystemStats(abstractSystem: AbstractSystem): void {
    let totalPopulation = 0;
    let maxTechLevel = 0;
    let spacefaringCount = 0;
    let ftlCapableCount = 0;

    // Single pass through children
    for (const child of abstractSystem.children) {
      totalPopulation += child.getTotalPopulation();

      const techLevel = child.tech.level;
      maxTechLevel = Math.max(maxTechLevel, techLevel);

      // Combined threshold checks (avoid double-checking same condition)
      if (techLevel >= TECH_FTL_CAPABLE) {
        ftlCapableCount++;
        spacefaringCount++; // FTL implies spacefaring
      } else if (techLevel >= TECH_SPACEFARING) {
        spacefaringCount++;
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
   * Cached for performance during repeated habitable zone checks.
   */
  private static inferOrbitalDistance(
    abstractPlanet: AbstractPlanet,
    starLuminosity: number
  ): number {
    // Cache key: planet ID + luminosity
    const cacheKey = `${abstractPlanet.id}_${starLuminosity}`;
    const cached = this.orbitalDistanceCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const climateZones = abstractPlanet.planetaryStats.climateZones;

    // Combine operations: (a + b) / 100 = (a + b) * 0.01
    const heatIndex = (climateZones.tropical + climateZones.desert) * CLIMATE_NORM;
    const coldIndex = climateZones.polar * CLIMATE_NORM;

    // Temperature gradient: -1 (very cold) to +1 (very hot)
    const temperatureGradient = heatIndex - coldIndex;

    // Map temperature to orbital distance
    // Hot planets: 0.5 AU, Temperate: 1.0 AU, Cold: 2.0 AU (scaled by luminosity)
    const sqrtL = Math.sqrt(starLuminosity); // Only sqrt we can't precompute (dynamic luminosity)
    const baseDistance = sqrtL; // 1.0 * sqrtL

    // Combine operations: 1.0 - (gradient * 0.5) = 1.0 - gradient * 0.5
    const distanceMultiplier = 1.0 - (temperatureGradient * 0.5);

    const result = baseDistance * distanceMultiplier;
    this.orbitalDistanceCache.set(cacheKey, result);
    return result;
  }
}
