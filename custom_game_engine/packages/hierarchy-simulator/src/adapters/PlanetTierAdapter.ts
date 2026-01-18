/**
 * PlanetTierAdapter - Bridges world.Planet with hierarchy-simulator.AbstractPlanet
 *
 * Converts between:
 * - Real Planet instances (from @ai-village/world) with terrain, chunks, entities
 * - Abstract Planet tiers (from hierarchy-simulator) with statistical simulation
 *
 * Purpose: Enable grand strategy simulation to use real planet data from the ECS world.
 */

import { AbstractPlanet } from '../abstraction/AbstractPlanet.js';
import type { UniversalAddress, ResourceType } from '../abstraction/types.js';
import type { Planet } from '@ai-village/world';
import type { PlanetConfig } from '@ai-village/world';

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

/**
 * Adapter for converting between Planet (world package) and AbstractPlanet (hierarchy-simulator).
 */
export class PlanetTierAdapter {
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

    // Sync population from real planet entities
    this.syncPopulation(planet, abstractPlanet);

    // Sync resources from planet configuration
    this.syncResources(planet, abstractPlanet);

    // Sync named features from planet registry
    this.syncNamedFeatures(planet, abstractPlanet);

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
      discoveredAt: abstractPlanet.namedFeatures.length > 0
        ? abstractPlanet.namedFeatures[0].namedAt
        : undefined,
      discoveredBy: abstractPlanet.namedFeatures.length > 0
        ? abstractPlanet.namedFeatures[0].namedBy
        : undefined,

      visitCount: 0,
      description: `Planet with ${abstractPlanet.civilizationStats.nationCount} nations, tech level ${abstractPlanet.tech.level}`,
    };
  }

  /**
   * Sync population statistics from Planet entities to AbstractPlanet.
   *
   * Updates the abstract tier's population based on actual entity count.
   */
  static syncPopulation(planet: Planet, abstractPlanet: AbstractPlanet): void {
    if (!planet) {
      throw new Error('PlanetTierAdapter.syncPopulation: planet parameter is required');
    }
    if (!abstractPlanet) {
      throw new Error('PlanetTierAdapter.syncPopulation: abstractPlanet parameter is required');
    }

    const entityCount = planet.entityCount;

    // Update abstract population (scale up from entity count)
    // Assumption: Each entity represents ~1000-10000 simulated population
    const populationMultiplier = 5000; // Middle estimate
    const estimatedPopulation = entityCount * populationMultiplier;

    abstractPlanet.population.total = estimatedPopulation;

    // Redistribute population categories (maintain ratios)
    const total = abstractPlanet.population.total;
    abstractPlanet.population.distribution = {
      workers: Math.floor(total * 0.6),
      military: Math.floor(total * 0.05),
      researchers: Math.floor(total * 0.1),
      children: Math.floor(total * 0.15),
      elderly: Math.floor(total * 0.1),
    };
  }

  /**
   * Sync resource data from Planet configuration to AbstractPlanet.
   *
   * Updates resource abundance based on planet type and parameters.
   */
  static syncResources(planet: Planet, abstractPlanet: AbstractPlanet): void {
    if (!planet) {
      throw new Error('PlanetTierAdapter.syncResources: planet parameter is required');
    }
    if (!abstractPlanet) {
      throw new Error('PlanetTierAdapter.syncResources: abstractPlanet parameter is required');
    }

    const config = planet.config;

    // Calculate water resources from sea level and moisture
    const waterAbundance = this.calculateWaterAbundance(config);
    abstractPlanet.planetaryStats.resourceAbundance.set('water', waterAbundance);

    // Calculate mineral resources from elevation variance
    const metalAbundance = this.calculateMetalAbundance(config);
    abstractPlanet.planetaryStats.resourceAbundance.set('metals', metalAbundance);

    // Rare earths based on planet type
    const rareEarthAbundance = this.calculateRareEarthAbundance(config);
    abstractPlanet.planetaryStats.resourceAbundance.set('rare_earths', rareEarthAbundance);

    // Fossil fuels (organic worlds only)
    const fossilFuelAbundance = this.calculateFossilFuelAbundance(config);
    abstractPlanet.planetaryStats.resourceAbundance.set('fossil_fuels', fossilFuelAbundance);

    // Geothermal energy from volcanism
    const geothermalAbundance = this.calculateGeothermalAbundance(config);
    abstractPlanet.planetaryStats.resourceAbundance.set('geothermal_energy', geothermalAbundance);
  }

  /**
   * Sync named features from Planet's name registry to AbstractPlanet.
   */
  private static syncNamedFeatures(planet: Planet, abstractPlanet: AbstractPlanet): void {
    if (!planet) {
      throw new Error('PlanetTierAdapter.syncNamedFeatures: planet parameter is required');
    }
    if (!abstractPlanet) {
      throw new Error('PlanetTierAdapter.syncNamedFeatures: abstractPlanet parameter is required');
    }

    // Clear existing features
    abstractPlanet.namedFeatures = [];

    // Extract all named locations from planet
    const namedLocations = planet.nameRegistry.getAllNames();

    for (const { chunkX, chunkY, name: data } of namedLocations) {
      // Convert chunk coordinates to lat/lon (simplified projection)
      const lat = (chunkY / 100) * 180 - 90; // Map chunk Y to -90 to 90
      const lon = (chunkX / 100) * 360 - 180; // Map chunk X to -180 to 180

      abstractPlanet.namedFeatures.push({
        id: `${planet.id}_location_${chunkX}_${chunkY}`,
        name: data.name,
        type: 'continent', // Default, could be inferred from biome
        location: { lat, lon },
        namedBy: data.namedBy,
        namedAt: data.namedAt,
      });
    }
  }

  // ============================================================================
  // Resource Calculation Helpers
  // ============================================================================

  private static calculateWaterAbundance(config: PlanetConfig): number {
    const seaLevel = config.seaLevel ?? -0.3;
    const moisture = config.moistureOffset ?? 0;

    // Higher sea level and moisture = more water
    // Scale: 1e11 to 1e13 (100B to 10T cubic meters)
    const baseWater = 1e12;
    const seaLevelFactor = (seaLevel + 1) / 2; // Normalize -1 to 1 -> 0 to 1
    const moistureFactor = (moisture + 1) / 2; // Normalize -1 to 1 -> 0 to 1

    return baseWater * seaLevelFactor * moistureFactor;
  }

  private static calculateMetalAbundance(config: PlanetConfig): number {
    const elevationScale = config.elevationScale ?? 1.0;

    // Higher elevation variance = more exposed minerals
    // Scale: 1e9 to 1e11 (1B to 100B tons)
    const baseMetal = 1e10;
    return baseMetal * elevationScale;
  }

  private static calculateRareEarthAbundance(config: PlanetConfig): number {
    const planetType = config.type;

    // Certain planet types have more rare earths
    const typeMultipliers: Record<string, number> = {
      terrestrial: 1.0,
      super_earth: 2.0,
      volcanic: 1.5,
      carbon: 0.5,
      iron: 3.0,
      desert: 0.8,
      ice: 0.3,
      ocean: 0.1,
    };

    const multiplier = typeMultipliers[planetType] ?? 1.0;
    const baseRareEarth = 1e8; // 100M tons

    return baseRareEarth * multiplier;
  }

  private static calculateFossilFuelAbundance(config: PlanetConfig): number {
    const planetType = config.type;
    const moisture = config.moistureOffset ?? 0;

    // Only organic-rich planets have fossil fuels
    const organicPlanets = ['terrestrial', 'ocean', 'fungal'];
    if (!organicPlanets.includes(planetType)) {
      return 0;
    }

    // Higher moisture = more ancient biomass = more fossil fuels
    const baseFuel = 1e9; // 1B barrels
    const moistureFactor = Math.max(0, (moisture + 1) / 2);

    return baseFuel * moistureFactor;
  }

  private static calculateGeothermalAbundance(config: PlanetConfig): number {
    const planetType = config.type;

    // Volcanic and tidally-heated planets have high geothermal
    const typeMultipliers: Record<string, number> = {
      volcanic: 10.0,
      tidally_locked: 5.0,
      super_earth: 3.0,
      terrestrial: 1.0,
      moon: 2.0,
      ice: 0.5,
      desert: 0.8,
    };

    const multiplier = typeMultipliers[planetType] ?? 1.0;
    const baseGeothermal = 1e8; // 100M MW potential

    return baseGeothermal * multiplier;
  }

  // ============================================================================
  // Config Inference Helpers
  // ============================================================================

  private static inferTemperatureOffset(climateZones: {
    tropical: number;
    temperate: number;
    polar: number;
    desert: number;
  }): number {
    // High tropical = hot planet (+0.5)
    // High polar = cold planet (-0.5)
    const hotBias = (climateZones.tropical + climateZones.desert) / 100;
    const coldBias = climateZones.polar / 100;

    return (hotBias - coldBias) * 0.5;
  }

  private static inferMoistureOffset(climateZones: {
    tropical: number;
    temperate: number;
    polar: number;
    desert: number;
  }): number {
    // High tropical/temperate = wet planet (+0.5)
    // High desert = dry planet (-0.5)
    const wetBias = (climateZones.tropical + climateZones.temperate) / 100;
    const dryBias = climateZones.desert / 100;

    return (wetBias - dryBias) * 0.5;
  }

  private static calculateSeaLevel(planetaryStats: {
    landArea: number;
    oceanArea: number;
  }): number {
    const totalArea = planetaryStats.landArea + planetaryStats.oceanArea;
    const oceanPercentage = planetaryStats.oceanArea / totalArea;

    // Map 60-80% ocean to sea level -0.3 to 0.2
    // Ocean % = 0.7 -> sea level = 0
    return (oceanPercentage - 0.7) * 2;
  }

  private static inferAllowedBiomes(climateZones: {
    tropical: number;
    temperate: number;
    polar: number;
    desert: number;
  }): any[] {
    const biomes: any[] = [];

    // Include biomes based on climate zone presence (>10%)
    if (climateZones.tropical > 10) {
      biomes.push('jungle', 'rainforest');
    }
    if (climateZones.temperate > 10) {
      biomes.push('grassland', 'forest', 'plains');
    }
    if (climateZones.polar > 10) {
      biomes.push('tundra', 'ice');
    }
    if (climateZones.desert > 10) {
      biomes.push('desert', 'savanna');
    }

    // Always include ocean and mountain (universal features)
    biomes.push('ocean', 'mountain');

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
