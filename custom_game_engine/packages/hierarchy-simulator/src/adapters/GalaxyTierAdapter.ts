/**
 * GalaxyTierAdapter - Manages galaxy abstraction from multiple sectors
 *
 * Converts between:
 * - Multiple AbstractSector instances in a galaxy
 * - AbstractGalaxy tier (from hierarchy-simulator) with galactic civilizations
 *
 * Purpose: Enable grand strategy simulation of entire galaxies with
 * multiple sectors, galactic civilizations (Kardashev II-III), and cosmic events.
 */

import { AbstractGalaxy } from '../abstraction/AbstractGalaxy.js';
import { AbstractSector } from '../abstraction/AbstractSector.js';
import type { UniversalAddress } from '../abstraction/types.js';

/**
 * Configuration for creating a galaxy.
 */
export interface GalaxyConfig {
  id: string;
  name: string;
  address: Partial<UniversalAddress>;
  galaxyType?: 'spiral' | 'elliptical' | 'irregular' | 'ring';
}

/**
 * Aggregated data for an entire galaxy.
 */
export interface GalaxyResourceSummary {
  totalPopulation: number;
  totalSectors: number;
  totalSystems: number;
  colonizedSystems: number;
  maxTechLevel: number;
  avgKardashevLevel: number;
  totalEnergyOutput: number;
  economicOutput: number;
  activeCivilizations: number;
  dysonSphereCount: number;
  megastructureCount: number;
  wormholeNodeCount: number;
  totalWater: number;
  totalMetals: number;
  totalRareEarths: number;
}

// ============================================================================
// Frozen Lookup Tables and Constants
// ============================================================================

// Kardashev scale thresholds
const KARDASHEV_I_THRESHOLD = 8;   // Tech level 8 = planetary civilization
const KARDASHEV_II_THRESHOLD = 9;  // Tech level 9 = stellar civilization
const KARDASHEV_III_THRESHOLD = 10; // Tech level 10 = galactic civilization

// Megastructure tech requirements
const DYSON_SPHERE_TECH = 9;
const RINGWORLD_TECH = 9;
const MATRIOSHKA_BRAIN_TECH = 10;
const GALACTIC_HIGHWAY_TECH = 10;

// Civilization formation thresholds
const MIN_SECTORS_FOR_GALACTIC_CIV = 10;
const MIN_POPULATION_FOR_GALACTIC_CIV = 1e12; // 1 trillion

// Energy output constants (Watts)
const KARDASHEV_I_ENERGY = 1e16;   // 10 petawatts
const KARDASHEV_II_ENERGY = 1e26;  // 10^26 watts (stellar output)
const KARDASHEV_III_ENERGY = 1e36; // 10^36 watts (galactic output)

/**
 * Adapter for creating AbstractGalaxy from multiple sectors.
 */
export class GalaxyTierAdapter {
  // Memoization caches
  private static resourceCache = new Map<string, GalaxyResourceSummary>();
  private static civilizationCache = new Map<string, any[]>();
  private static megastructureCache = new Map<string, any[]>();

  /**
   * Create an AbstractGalaxy from multiple AbstractSector instances.
   *
   * Aggregates data from all sectors in the galaxy and creates
   * a grand strategy tier for galaxy-level simulation.
   *
   * @param sectors - Array of AbstractSector instances in this galaxy
   * @param config - Galaxy configuration (name, type, etc.)
   */
  static convertSectorsToGalaxyTier(
    sectors: AbstractSector[],
    config: GalaxyConfig
  ): AbstractGalaxy {
    if (!sectors) {
      throw new Error('GalaxyTierAdapter.convertSectorsToGalaxyTier: sectors parameter is required');
    }
    if (!config) {
      throw new Error('GalaxyTierAdapter.convertSectorsToGalaxyTier: config parameter is required');
    }
    if (sectors.length === 0) {
      throw new Error('GalaxyTierAdapter.convertSectorsToGalaxyTier: sectors array cannot be empty');
    }

    // Create abstract galaxy
    const abstractGalaxy = new AbstractGalaxy(
      config.id,
      config.name,
      config.address
    );

    // Override galaxy type if specified
    if (config.galaxyType) {
      abstractGalaxy.structure.type = config.galaxyType;
    }

    // Add each sector as a child tier
    for (const sector of sectors) {
      abstractGalaxy.addChild(sector);
    }

    // Sync galaxy statistics from children
    this.syncGalaxyStats(abstractGalaxy, sectors);

    // Identify galactic civilizations
    this.identifyGalacticCivilizations(abstractGalaxy, sectors);

    // Build galactic infrastructure
    this.buildGalacticInfrastructure(abstractGalaxy, sectors);

    // Identify megastructures
    this.identifyMegastructures(abstractGalaxy, sectors);

    // Establish galactic governance if applicable
    this.establishGalacticGovernance(abstractGalaxy, sectors);

    return abstractGalaxy;
  }

  /**
   * Get aggregated resource summary for entire galaxy.
   *
   * Sums resources across all sectors, civilizations, and megastructures.
   * Single-pass optimization: Combines sector filtering, resource aggregation, and civ analysis.
   */
  static getGalaxyResources(abstractGalaxy: AbstractGalaxy): GalaxyResourceSummary {
    if (!abstractGalaxy) {
      throw new Error('GalaxyTierAdapter.getGalaxyResources: abstractGalaxy parameter is required');
    }

    // Cache key based on galaxy ID and children hash
    const cacheKey = `${abstractGalaxy.id}_${abstractGalaxy.children.length}_${abstractGalaxy.tick}`;
    const cached = this.resourceCache.get(cacheKey);
    if (cached !== undefined) return cached;

    let totalPopulation = 0;
    let totalSectors = 0;
    let totalSystems = 0;
    let colonizedSystems = 0;
    let maxTechLevel = 0;
    let totalKardashevLevel = 0;
    let totalEnergyOutput = 0;
    let economicOutput = 0;
    let dysonSphereCount = 0;
    let megastructureCount = 0;
    let wormholeNodeCount = 0;
    let totalWater = 0;
    let totalMetals = 0;
    let totalRareEarths = 0;

    // Single pass through sectors
    for (const child of abstractGalaxy.children) {
      if (child.tier !== 'sector') {
        continue;
      }

      totalSectors++;
      const abstractSector = child as AbstractSector;

      // Population
      totalPopulation += abstractSector.getTotalPopulation();

      // Tech level
      maxTechLevel = Math.max(maxTechLevel, abstractSector.tech.level);

      // Wormhole network
      wormholeNodeCount += abstractSector.infrastructure.wormholeGates.length;

      // Count systems in this sector
      for (const sectorChild of abstractSector.children) {
        if (sectorChild.tier === 'system') {
          totalSystems++;

          // Check if colonized (has significant population)
          if (sectorChild.population.total > 1000000) {
            colonizedSystems++;
          }

          // Aggregate resources from systems
          const system = sectorChild as any;
          if (system.children) {
            for (const planet of system.children) {
              if (planet.tier === 'planet') {
                const resourceMap = (planet as any).planetaryStats?.resourceAbundance;
                if (resourceMap) {
                  totalWater += resourceMap.get('water') ?? 0;
                  totalMetals += resourceMap.get('metals') ?? 0;
                  totalRareEarths += resourceMap.get('rare_earths') ?? 0;
                }
              }
            }

            // Resources from asteroid belts
            if (system.asteroidBelts) {
              for (const belt of system.asteroidBelts) {
                totalMetals += belt.resourceYield.get('metals') ?? 0;
                totalRareEarths += belt.resourceYield.get('rare_minerals') ?? 0;
                totalWater += belt.resourceYield.get('water_ice') ?? 0;
              }
            }
          }
        }
      }

      // Economic output from sector
      economicOutput += abstractSector.sectorStats.totalPopulation * abstractSector.tech.level * 1000;
    }

    // Calculate average Kardashev level and energy output
    for (const civ of abstractGalaxy.galacticCivilizations) {
      totalKardashevLevel += civ.kardashevLevel;
      totalEnergyOutput += civ.energyOutput;
      dysonSphereCount += civ.dysonSpheres;

      for (const mega of civ.megastructures) {
        megastructureCount++;
      }
    }

    const avgKardashevLevel = abstractGalaxy.galacticCivilizations.length > 0
      ? totalKardashevLevel / abstractGalaxy.galacticCivilizations.length
      : 0;

    const activeCivilizations = abstractGalaxy.galacticCivilizations.length;

    const result: GalaxyResourceSummary = {
      totalPopulation,
      totalSectors,
      totalSystems,
      colonizedSystems,
      maxTechLevel,
      avgKardashevLevel,
      totalEnergyOutput,
      economicOutput,
      activeCivilizations,
      dysonSphereCount,
      megastructureCount,
      wormholeNodeCount,
      totalWater,
      totalMetals,
      totalRareEarths,
    };

    this.resourceCache.set(cacheKey, result);
    return result;
  }

  /**
   * Get all megastructures in the galaxy.
   *
   * Returns array of all megastructures across civilizations.
   * Cached for performance during queries.
   */
  static getAllMegastructures(abstractGalaxy: AbstractGalaxy): any[] {
    if (!abstractGalaxy) {
      throw new Error('GalaxyTierAdapter.getAllMegastructures: abstractGalaxy parameter is required');
    }

    // Cache key based on galaxy ID and civilization count
    const cacheKey = `${abstractGalaxy.id}_${abstractGalaxy.galacticCivilizations.length}`;
    const cached = this.megastructureCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const megastructures: any[] = [];
    for (const civ of abstractGalaxy.galacticCivilizations) {
      for (const mega of civ.megastructures) {
        megastructures.push({
          ...mega,
          civilizationId: civ.id,
          civilizationName: civ.name,
        });
      }
    }

    this.megastructureCache.set(cacheKey, megastructures);
    return megastructures;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Sync galaxy-level statistics from child sectors.
   * Single-pass optimization: Aggregates all stats in one loop.
   */
  private static syncGalaxyStats(abstractGalaxy: AbstractGalaxy, sectors: AbstractSector[]): void {
    let totalPopulation = 0;
    let maxTechLevel = 0;
    let totalSystems = 0;
    let colonizedSystems = 0;
    let totalEconomicOutput = 0;

    // Single pass through sectors
    for (const sector of sectors) {
      totalPopulation += sector.getTotalPopulation();
      maxTechLevel = Math.max(maxTechLevel, sector.tech.level);

      // Count systems
      for (const child of sector.children) {
        if (child.tier === 'system') {
          totalSystems++;
          if (child.population.total > 1000000) {
            colonizedSystems++;
          }
        }
      }

      // Economic output
      totalEconomicOutput += sector.sectorStats.totalPopulation * sector.tech.level * 1000;
    }

    // Update galaxy stats
    abstractGalaxy.galacticStats.totalPopulation = totalPopulation;
    abstractGalaxy.galacticStats.maxTechLevel = maxTechLevel;
    abstractGalaxy.galacticStats.totalPlanets = totalSystems * 3; // Estimate: 3 planets per system average
    abstractGalaxy.galacticStats.colonizedSystems = colonizedSystems;
    abstractGalaxy.galacticStats.economicOutput = totalEconomicOutput;

    // Update galaxy-level population and tech
    abstractGalaxy.population.total = totalPopulation;
    abstractGalaxy.tech.level = maxTechLevel;
  }

  /**
   * Identify galactic civilizations (Kardashev II-III) spanning multiple sectors.
   * Groups sectors based on political entities, tech level, and population.
   */
  private static identifyGalacticCivilizations(
    abstractGalaxy: AbstractGalaxy,
    sectors: AbstractSector[]
  ): void {
    // Clear existing civilizations (will rebuild from scratch)
    abstractGalaxy.galacticCivilizations = [];

    // Filter sectors by tech level and population
    const advancedSectors = sectors.filter(s =>
      s.tech.level >= KARDASHEV_II_THRESHOLD &&
      s.sectorStats.totalPopulation >= MIN_POPULATION_FOR_GALACTIC_CIV / 100 // Each sector should have 1% of min
    );

    if (advancedSectors.length < MIN_SECTORS_FOR_GALACTIC_CIV) {
      return;
    }

    // Group sectors by political entity similarity
    const civilizationGroups = this.groupSectorsByCivilization(advancedSectors);

    const civTypes: Array<'kardashev_ii' | 'kardashev_iii' | 'transcendent' | 'ai_collective' | 'hive_overmind'> = [
      'kardashev_ii', 'kardashev_iii', 'transcendent', 'ai_collective', 'hive_overmind'
    ];

    const civNames = [
      'Ancient Builders', 'Star Shepherds', 'Transcendent Collective',
      'Dyson Federation', 'Galactic Mind'
    ];

    let civIndex = 0;
    for (const group of civilizationGroups) {
      if (group.length < MIN_SECTORS_FOR_GALACTIC_CIV) {
        continue;
      }

      // Calculate civilization stats
      let civPopulation = 0;
      let civTechLevel = 0;
      const controlledSectors: string[] = [];

      for (const sector of group) {
        civPopulation += sector.getTotalPopulation();
        civTechLevel = Math.max(civTechLevel, sector.tech.level);
        controlledSectors.push(sector.id);
      }

      // Determine Kardashev level based on tech
      let kardashevLevel = 2.0;
      let type: 'kardashev_ii' | 'kardashev_iii' | 'transcendent' | 'ai_collective' | 'hive_overmind' = 'kardashev_ii';

      if (civTechLevel >= KARDASHEV_III_THRESHOLD) {
        kardashevLevel = 3.0 + Math.random() * 0.5;
        type = civTypes[Math.min(civIndex + 2, civTypes.length - 1)];
      } else if (civTechLevel >= KARDASHEV_II_THRESHOLD) {
        kardashevLevel = 2.0 + Math.random() * 0.8;
        type = civTypes[Math.min(civIndex + 1, civTypes.length - 1)];
      }

      // Calculate energy output based on Kardashev level
      const energyOutput = Math.pow(10, 26 + kardashevLevel * 10);

      // Count Dyson spheres (based on tech and population)
      const dysonSpheres = civTechLevel >= DYSON_SPHERE_TECH
        ? Math.floor((civPopulation / 1e12) * (civTechLevel - 8) * 10)
        : 0;

      // Generate megastructures
      const megastructures = this.generateMegastructuresForCivilization(
        abstractGalaxy.id,
        civIndex,
        civTechLevel,
        controlledSectors
      );

      abstractGalaxy.galacticCivilizations.push({
        id: `${abstractGalaxy.id}_civ_${civIndex}`,
        name: civNames[civIndex % civNames.length],
        type,
        controlledSectors,
        population: civPopulation,
        techLevel: civTechLevel,
        kardashevLevel,
        energyOutput,
        dysonSpheres,
        megastructures,
      });

      civIndex++;
    }

    abstractGalaxy.galacticStats.activeCivilizations = abstractGalaxy.galacticCivilizations.length;
  }

  /**
   * Group sectors into civilization clusters based on political entities.
   */
  private static groupSectorsByCivilization(sectors: AbstractSector[]): AbstractSector[][] {
    const groups: AbstractSector[][] = [];
    const assigned = new Set<string>();

    for (const sector of sectors) {
      if (assigned.has(sector.id)) {
        continue;
      }

      // Start a new group
      const group: AbstractSector[] = [sector];
      assigned.add(sector.id);

      // Find neighboring sectors with compatible political entities
      for (const otherSector of sectors) {
        if (assigned.has(otherSector.id)) {
          continue;
        }

        // Check if sectors have compatible political entities
        const compatible = this.areSectorsCompatible(sector, otherSector);
        if (compatible) {
          group.push(otherSector);
          assigned.add(otherSector.id);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Check if two sectors have compatible political entities (can form a civilization).
   */
  private static areSectorsCompatible(sector1: AbstractSector, sector2: AbstractSector): boolean {
    // Sectors are compatible if they have similar tech levels and peaceful relations
    const techDiff = Math.abs(sector1.tech.level - sector2.tech.level);
    if (techDiff > 2) {
      return false;
    }

    // Check political entity compatibility
    if (sector1.politicalEntities.length === 0 || sector2.politicalEntities.length === 0) {
      return false;
    }

    // If either sector has active wars, they're incompatible
    if (sector1.sectorStats.activeWars > 0 || sector2.sectorStats.activeWars > 0) {
      return false;
    }

    return true;
  }

  /**
   * Generate megastructures for a galactic civilization.
   */
  private static generateMegastructuresForCivilization(
    galaxyId: string,
    civIndex: number,
    techLevel: number,
    controlledSectors: string[]
  ): any[] {
    const megastructures: any[] = [];

    // Dyson spheres (one per major system)
    if (techLevel >= DYSON_SPHERE_TECH) {
      const dysonCount = Math.min(controlledSectors.length, Math.floor((techLevel - 8) * 2));
      for (let i = 0; i < dysonCount; i++) {
        megastructures.push({
          id: `${galaxyId}_mega_${civIndex}_dyson_${i}`,
          type: 'dyson_sphere',
          location: controlledSectors[i % controlledSectors.length],
          operational: Math.random() > 0.2, // 80% operational
        });
      }
    }

    // Ringworlds
    if (techLevel >= RINGWORLD_TECH) {
      const ringworldCount = Math.floor((techLevel - 8) * 0.5);
      for (let i = 0; i < ringworldCount; i++) {
        megastructures.push({
          id: `${galaxyId}_mega_${civIndex}_ringworld_${i}`,
          type: 'ringworld',
          location: controlledSectors[i % controlledSectors.length],
          operational: Math.random() > 0.3, // 70% operational
        });
      }
    }

    // Matrioshka brains (advanced computing)
    if (techLevel >= MATRIOSHKA_BRAIN_TECH) {
      megastructures.push({
        id: `${galaxyId}_mega_${civIndex}_matrioshka`,
        type: 'matrioshka_brain',
        location: controlledSectors[0],
        operational: Math.random() > 0.1, // 90% operational
      });
    }

    // Galactic highways (FTL infrastructure)
    if (techLevel >= GALACTIC_HIGHWAY_TECH && controlledSectors.length >= 20) {
      megastructures.push({
        id: `${galaxyId}_mega_${civIndex}_highway`,
        type: 'galactic_highway',
        location: 'multi_sector',
        operational: Math.random() > 0.15, // 85% operational
      });
    }

    return megastructures;
  }

  /**
   * Build galactic infrastructure (wormhole network, comm beacons, galactic net).
   */
  private static buildGalacticInfrastructure(
    abstractGalaxy: AbstractGalaxy,
    sectors: AbstractSector[]
  ): void {
    // Count wormhole nodes across all sectors
    let totalWormholeNodes = 0;
    let totalWormholeConnections = 0;

    for (const sector of sectors) {
      totalWormholeNodes += sector.infrastructure.wormholeGates.length;
      totalWormholeConnections += sector.infrastructure.wormholeGates.filter(g => g.operational).length;
    }

    abstractGalaxy.infrastructure.wormholeNetwork = {
      nodeCount: totalWormholeNodes,
      totalConnections: totalWormholeConnections,
      coverage: Math.min(1.0, totalWormholeNodes / (sectors.length * 10)), // Coverage = nodes per sector / 10
    };

    // Comm beacons scale with tech level
    const maxTechSector = sectors.reduce((max, s) => s.tech.level > max.tech.level ? s : max, sectors[0]);
    abstractGalaxy.infrastructure.commBeacons = maxTechSector.tech.level >= 9
      ? 100 + Math.floor(Math.random() * 900)
      : 0;

    // Galactic Net (only if advanced enough)
    if (maxTechSector.tech.level >= KARDASHEV_III_THRESHOLD) {
      abstractGalaxy.infrastructure.galacticNet = {
        bandwidth: 1e12, // Exabytes/second
        latency: 100000, // Years (light-speed limited)
        nodes: 1000 + Math.floor(Math.random() * 9000),
      };
    }
  }

  /**
   * Identify megastructures across all sectors and civilizations.
   */
  private static identifyMegastructures(
    abstractGalaxy: AbstractGalaxy,
    sectors: AbstractSector[]
  ): void {
    // Megastructures are already created in identifyGalacticCivilizations
    // This method updates galaxy stats based on megastructures

    let totalDysonSpheres = 0;
    for (const civ of abstractGalaxy.galacticCivilizations) {
      totalDysonSpheres += civ.dysonSpheres;
    }

    // Update galaxy stats
    const megastructures = this.getAllMegastructures(abstractGalaxy);
    abstractGalaxy.galacticStats.totalEnergyOutput = 0;

    for (const civ of abstractGalaxy.galacticCivilizations) {
      abstractGalaxy.galacticStats.totalEnergyOutput += civ.energyOutput;
    }
  }

  /**
   * Establish galactic governance if civilizations are advanced and cooperative.
   */
  private static establishGalacticGovernance(
    abstractGalaxy: AbstractGalaxy,
    sectors: AbstractSector[]
  ): void {
    // Only establish governance if multiple civilizations exist
    if (abstractGalaxy.galacticCivilizations.length < 3) {
      return;
    }

    // Check if civilizations are advanced enough
    const avgTechLevel = abstractGalaxy.galacticCivilizations.reduce((sum, civ) => sum + civ.techLevel, 0) /
      abstractGalaxy.galacticCivilizations.length;

    if (avgTechLevel < KARDASHEV_III_THRESHOLD) {
      return;
    }

    // Check sector stability
    const avgStability = sectors.reduce((sum, s) => sum + s.sectorStats.politicalStability, 0) / sectors.length;
    if (avgStability < 0.7) {
      return;
    }

    // Establish governance (probability based on stability)
    if (Math.random() < avgStability) {
      abstractGalaxy.governance = {
        type: 'galactic_council',
        founded: abstractGalaxy.tick,
        memberCivilizations: abstractGalaxy.galacticCivilizations.map(c => c.id),
        laws: ['non_aggression_pact', 'technology_sharing', 'dimensional_stability_protocol'],
        enforcement: 0.7 + Math.random() * 0.3,
      };
    }
  }
}
