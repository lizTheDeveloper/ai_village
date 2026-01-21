/**
 * PlanetTierAdapter - Bridges world.Planet with hierarchy-simulator.AbstractPlanet
 *
 * Converts between:
 * - Real Planet instances (from @ai-village/world) with terrain, chunks, entities
 * - Abstract Planet tiers (from hierarchy-simulator) with statistical simulation
 *
 * Purpose: Enable grand strategy simulation to use real planet data from the ECS world.
 *
 * NOTE: Moved from @ai-village/hierarchy-simulator to break circular dependency.
 */

import { AbstractPlanet } from '@ai-village/hierarchy-simulator';
import type { UniversalAddress } from '@ai-village/hierarchy-simulator';
import type { Planet } from '../planet/Planet.js';
import type { PlanetConfig } from '../planet/PlanetTypes.js';
import type { BiomeType } from '../chunks/Tile.js';

/**
 * Resource summary aggregated from planet data.
 */
export interface ResourceSummary {
  water: number;
  metals: number;
  rare_earths: number;
  fossil_fuels: number;
  geothermal_energy: number;
}

// ============================================================================
// Frozen Lookup Tables (Module-level constants)
// ============================================================================

const RARE_EARTH_TYPE_MULTIPLIERS: Readonly<Record<string, number>> = Object.freeze({
  terrestrial: 1.0,
  super_earth: 2.0,
  volcanic: 1.5,
  carbon: 0.5,
  iron: 3.0,
  desert: 0.8,
  ice: 0.3,
  ocean: 0.1,
});

const GEOTHERMAL_TYPE_MULTIPLIERS: Readonly<Record<string, number>> = Object.freeze({
  volcanic: 10.0,
  tidally_locked: 5.0,
  super_earth: 3.0,
  terrestrial: 1.0,
  moon: 2.0,
  ice: 0.5,
  desert: 0.8,
});

const ORGANIC_PLANETS: ReadonlySet<string> = new Set(['terrestrial', 'ocean', 'fungal']);

// Population distribution ratios (precomputed)
const POPULATION_RATIOS = Object.freeze({
  workers: 0.6,
  military: 0.05,
  researchers: 0.1,
  children: 0.15,
  elderly: 0.1,
});

// Constants for calculations
const POPULATION_MULTIPLIER = 5000;
const BASE_WATER = 1e12;
const BASE_METAL = 1e10;
const BASE_RARE_EARTH = 1e8;
const BASE_FOSSIL_FUEL = 1e9;
const BASE_GEOTHERMAL = 1e8;

/**
 * Adapter for converting between Planet (world package) and AbstractPlanet (hierarchy-simulator).
 */
export class PlanetTierAdapter {
  // Memoization caches (static for shared access across calls)
  private static waterCache = new Map<string, number>();
  private static metalCache = new Map<string, number>();
  private static rareEarthCache = new Map<string, number>();
  private static fossilFuelCache = new Map<string, number>();
  private static geothermalCache = new Map<string, number>();
  /**
   * Create an AbstractPlanet from a real Planet instance.
   *
   * Extracts statistical data from the planet's configuration and entities
   * to populate the abstract tier for grand strategy simulation.
   */
  static fromPlanet(planet: Planet, address: Partial<UniversalAddress>): AbstractPlanet {
    if (!planet) {
      throw new Error('PlanetTierAdapter.fromPlanet: planet parameter is required');
    }
    if (!planet.config) {
      throw new Error('PlanetTierAdapter.fromPlanet: planet.config is required');
    }

    // Create abstract planet with basic identity
    const abstractPlanet = new AbstractPlanet(
      planet.id,
      planet.name,
      address
    );

    // Single-pass sync: Combine all sync operations to avoid multiple iterations
    this.syncAllData(planet, abstractPlanet);

    return abstractPlanet;
  }

  /**
   * Extract planet configuration from an AbstractPlanet.
   *
   * Converts abstract statistics back into PlanetConfig format
   * for instantiating a new Planet in the world package.
   *
   * This is a partial config - seed, type, and other parameters
   * must be provided separately or filled with defaults.
   */
  static toPlanetConfig(abstractPlanet: AbstractPlanet): Partial<PlanetConfig> {
    if (!abstractPlanet) {
      throw new Error('PlanetTierAdapter.toPlanetConfig: abstractPlanet parameter is required');
    }

    // Extract climate zone data to infer biome distribution
    const climateZones = abstractPlanet.planetaryStats.climateZones;

    return {
      id: abstractPlanet.id,
      name: abstractPlanet.name,
      // Type must be inferred or provided separately
      type: 'terrestrial', // Default, should be overridden

      // Terrain parameters derived from climate zones
      temperatureOffset: this.inferTemperatureOffset(climateZones),
      temperatureScale: 1.0,

      moistureOffset: this.inferMoistureOffset(climateZones),
      moistureScale: 1.0,

      elevationOffset: 0.0,
      elevationScale: 1.0,

      seaLevel: this.calculateSeaLevel(abstractPlanet.planetaryStats),

      // Biomes from climate distribution
      allowedBiomes: this.inferAllowedBiomes(climateZones),

      // Physical properties (defaults if not specified)
      gravity: 1.0,
      atmosphereDensity: 1.0,

      // Discovery metadata
      discoveredAt: abstractPlanet.namedFeatures[0]?.namedAt,
      discoveredBy: abstractPlanet.namedFeatures[0]?.namedBy,

      visitCount: 0,
      description: `Planet with ${abstractPlanet.civilizationStats.nationCount} nations, tech level ${abstractPlanet.tech.level}`,
    };
  }

  /**
   * Single-pass sync: Combines population, resources, and named features.
   * Optimized to avoid multiple iterations and parameter validation.
   */
  private static syncAllData(planet: Planet, abstractPlanet: AbstractPlanet): void {
    const config = planet.config;

    // 1. Sync population (inline, no function call overhead)
    const entityCount = planet.entityCount;
    const estimatedPopulation = entityCount * POPULATION_MULTIPLIER;
    abstractPlanet.population.total = estimatedPopulation;

    // Use precomputed ratios, avoid repeated multiplications
    abstractPlanet.population.distribution = {
      workers: Math.floor(estimatedPopulation * POPULATION_RATIOS.workers),
      military: Math.floor(estimatedPopulation * POPULATION_RATIOS.military),
      researchers: Math.floor(estimatedPopulation * POPULATION_RATIOS.researchers),
      children: Math.floor(estimatedPopulation * POPULATION_RATIOS.children),
      elderly: Math.floor(estimatedPopulation * POPULATION_RATIOS.elderly),
    };

    // 2. Sync resources (with memoization)
    const resourceMap = abstractPlanet.planetaryStats.resourceAbundance;
    resourceMap.set('water', this.calculateWaterAbundance(config));
    resourceMap.set('metals', this.calculateMetalAbundance(config));
    resourceMap.set('rare_earths', this.calculateRareEarthAbundance(config));
    resourceMap.set('fossil_fuels', this.calculateFossilFuelAbundance(config));
    resourceMap.set('geothermal_energy', this.calculateGeothermalAbundance(config));

    // 3. Sync named features
    abstractPlanet.namedFeatures = [];
    const namedLocations = planet.nameRegistry.getAllNames();

    for (const { chunkX, chunkY, name: data } of namedLocations) {
      // Pre-compute divisions (hoisted constants)
      const lat = (chunkY / 100) * 180 - 90;
      const lon = (chunkX / 100) * 360 - 180;

      abstractPlanet.namedFeatures.push({
        id: `${planet.id}_location_${chunkX}_${chunkY}`,
        name: data.name,
        type: 'continent',
        location: { lat, lon },
        namedBy: data.namedBy,
        namedAt: data.namedAt,
      });
    }
  }

  /**
   * Sync population statistics from Planet entities to AbstractPlanet.
   * @deprecated Use syncAllData for better performance
   */
  static syncPopulation(planet: Planet, abstractPlanet: AbstractPlanet): void {
    if (!planet) {
      throw new Error('PlanetTierAdapter.syncPopulation: planet parameter is required');
    }
    if (!abstractPlanet) {
      throw new Error('PlanetTierAdapter.syncPopulation: abstractPlanet parameter is required');
    }

    const entityCount = planet.entityCount;
    const estimatedPopulation = entityCount * POPULATION_MULTIPLIER;
    abstractPlanet.population.total = estimatedPopulation;

    abstractPlanet.population.distribution = {
      workers: Math.floor(estimatedPopulation * POPULATION_RATIOS.workers),
      military: Math.floor(estimatedPopulation * POPULATION_RATIOS.military),
      researchers: Math.floor(estimatedPopulation * POPULATION_RATIOS.researchers),
      children: Math.floor(estimatedPopulation * POPULATION_RATIOS.children),
      elderly: Math.floor(estimatedPopulation * POPULATION_RATIOS.elderly),
    };
  }

  /**
   * Sync resource data from Planet configuration to AbstractPlanet.
   * @deprecated Use syncAllData for better performance
   */
  static syncResources(planet: Planet, abstractPlanet: AbstractPlanet): void {
    if (!planet) {
      throw new Error('PlanetTierAdapter.syncResources: planet parameter is required');
    }
    if (!abstractPlanet) {
      throw new Error('PlanetTierAdapter.syncResources: abstractPlanet parameter is required');
    }

    const config = planet.config;
    const resourceMap = abstractPlanet.planetaryStats.resourceAbundance;

    resourceMap.set('water', this.calculateWaterAbundance(config));
    resourceMap.set('metals', this.calculateMetalAbundance(config));
    resourceMap.set('rare_earths', this.calculateRareEarthAbundance(config));
    resourceMap.set('fossil_fuels', this.calculateFossilFuelAbundance(config));
    resourceMap.set('geothermal_energy', this.calculateGeothermalAbundance(config));
  }

  /**
   * Sync named features from Planet's name registry to AbstractPlanet.
   * @deprecated Use syncAllData for better performance
   */
  private static syncNamedFeatures(planet: Planet, abstractPlanet: AbstractPlanet): void {
    if (!planet) {
      throw new Error('PlanetTierAdapter.syncNamedFeatures: planet parameter is required');
    }
    if (!abstractPlanet) {
      throw new Error('PlanetTierAdapter.syncNamedFeatures: abstractPlanet parameter is required');
    }

    abstractPlanet.namedFeatures = [];
    const namedLocations = planet.nameRegistry.getAllNames();

    for (const { chunkX, chunkY, name: data } of namedLocations) {
      const lat = (chunkY / 100) * 180 - 90;
      const lon = (chunkX / 100) * 360 - 180;

      abstractPlanet.namedFeatures.push({
        id: `${planet.id}_location_${chunkX}_${chunkY}`,
        name: data.name,
        type: 'continent',
        location: { lat, lon },
        namedBy: data.namedBy,
        namedAt: data.namedAt,
      });
    }
  }

  // ============================================================================
  // Resource Calculation Helpers (with memoization)
  // ============================================================================

  private static calculateWaterAbundance(config: PlanetConfig): number {
    const seaLevel = config.seaLevel ?? -0.3;
    const moisture = config.moistureOffset ?? 0;

    // Cache key: Use bitwise operations for faster string construction
    const cacheKey = `${config.id}_${seaLevel}_${moisture}`;
    const cached = this.waterCache.get(cacheKey);
    if (cached !== undefined) return cached;

    // Normalize once: (x + 1) * 0.5 is faster than (x + 1) / 2
    const seaLevelFactor = (seaLevel + 1) * 0.5;
    const moistureFactor = (moisture + 1) * 0.5;

    const result = BASE_WATER * seaLevelFactor * moistureFactor;
    this.waterCache.set(cacheKey, result);
    return result;
  }

  private static calculateMetalAbundance(config: PlanetConfig): number {
    const elevationScale = config.elevationScale ?? 1.0;

    const cacheKey = `${config.id}_${elevationScale}`;
    const cached = this.metalCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const result = BASE_METAL * elevationScale;
    this.metalCache.set(cacheKey, result);
    return result;
  }

  private static calculateRareEarthAbundance(config: PlanetConfig): number {
    const planetType = config.type;

    const cacheKey = `${config.id}_${planetType}`;
    const cached = this.rareEarthCache.get(cacheKey);
    if (cached !== undefined) return cached;

    // Use frozen lookup table
    const multiplier = RARE_EARTH_TYPE_MULTIPLIERS[planetType] ?? 1.0;
    const result = BASE_RARE_EARTH * multiplier;

    this.rareEarthCache.set(cacheKey, result);
    return result;
  }

  private static calculateFossilFuelAbundance(config: PlanetConfig): number {
    const planetType = config.type;
    const moisture = config.moistureOffset ?? 0;

    const cacheKey = `${config.id}_${planetType}_${moisture}`;
    const cached = this.fossilFuelCache.get(cacheKey);
    if (cached !== undefined) return cached;

    // Use Set.has() for O(1) lookup instead of array.includes()
    if (!ORGANIC_PLANETS.has(planetType)) {
      this.fossilFuelCache.set(cacheKey, 0);
      return 0;
    }

    // Use Math.max with pre-normalized value
    const moistureFactor = Math.max(0, (moisture + 1) * 0.5);
    const result = BASE_FOSSIL_FUEL * moistureFactor;

    this.fossilFuelCache.set(cacheKey, result);
    return result;
  }

  private static calculateGeothermalAbundance(config: PlanetConfig): number {
    const planetType = config.type;

    const cacheKey = `${config.id}_${planetType}`;
    const cached = this.geothermalCache.get(cacheKey);
    if (cached !== undefined) return cached;

    // Use frozen lookup table
    const multiplier = GEOTHERMAL_TYPE_MULTIPLIERS[planetType] ?? 1.0;
    const result = BASE_GEOTHERMAL * multiplier;

    this.geothermalCache.set(cacheKey, result);
    return result;
  }

  // ============================================================================
  // Config Inference Helpers (optimized calculations)
  // ============================================================================

  private static inferTemperatureOffset(climateZones: {
    tropical: number;
    temperate: number;
    polar: number;
    desert: number;
  }): number {
    // Combine operations: (a + b) / 100 * 0.5 = (a + b) * 0.005
    const hotBias = (climateZones.tropical + climateZones.desert) * 0.005;
    const coldBias = climateZones.polar * 0.01;

    return hotBias - coldBias;
  }

  private static inferMoistureOffset(climateZones: {
    tropical: number;
    temperate: number;
    polar: number;
    desert: number;
  }): number {
    // Combine operations: (a + b) / 100 * 0.5 = (a + b) * 0.005
    const wetBias = (climateZones.tropical + climateZones.temperate) * 0.005;
    const dryBias = climateZones.desert * 0.01;

    return wetBias - dryBias;
  }

  private static calculateSeaLevel(planetaryStats: {
    landArea: number;
    oceanArea: number;
  }): number {
    const totalArea = planetaryStats.landArea + planetaryStats.oceanArea;
    const oceanPercentage = planetaryStats.oceanArea / totalArea;

    // Combine: (x - 0.7) * 2 = x * 2 - 1.4
    return oceanPercentage * 2 - 1.4;
  }

  private static inferAllowedBiomes(climateZones: {
    tropical: number;
    temperate: number;
    polar: number;
    desert: number;
  }): BiomeType[] {
    const biomes: BiomeType[] = [];

    // Include biomes based on climate zone presence (>10%)
    if (climateZones.tropical > 10) {
      biomes.push('jungle');
    }
    if (climateZones.temperate > 10) {
      biomes.push('plains', 'forest', 'woodland');
    }
    if (climateZones.polar > 10) {
      biomes.push('tundra', 'glacier');
    }
    if (climateZones.desert > 10) {
      biomes.push('desert', 'savanna');
    }

    // Always include ocean and mountains (universal features)
    biomes.push('ocean', 'mountains');

    return biomes;
  }

  /**
   * Get aggregated resource summary from AbstractPlanet.
   */
  static getResourceSummary(abstractPlanet: AbstractPlanet): ResourceSummary {
    if (!abstractPlanet) {
      throw new Error('PlanetTierAdapter.getResourceSummary: abstractPlanet parameter is required');
    }

    return {
      water: abstractPlanet.planetaryStats.resourceAbundance.get('water') ?? 0,
      metals: abstractPlanet.planetaryStats.resourceAbundance.get('metals') ?? 0,
      rare_earths: abstractPlanet.planetaryStats.resourceAbundance.get('rare_earths') ?? 0,
      fossil_fuels: abstractPlanet.planetaryStats.resourceAbundance.get('fossil_fuels') ?? 0,
      geothermal_energy: abstractPlanet.planetaryStats.resourceAbundance.get('geothermal_energy') ?? 0,
    };
  }
}
