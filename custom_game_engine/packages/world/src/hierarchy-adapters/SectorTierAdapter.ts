/**
 * SectorTierAdapter - Manages sector abstraction from multiple star systems
 *
 * Converts between:
 * - Multiple AbstractSystem instances in a sector
 * - AbstractSector tier (from hierarchy-simulator) with regional politics
 *
 * Purpose: Enable grand strategy simulation of entire sectors with
 * multiple star systems, wormhole networks, and interstellar empires.
 *
 * NOTE: Moved from @ai-village/hierarchy-simulator to break circular dependency.
 */

import { AbstractSector, AbstractSystem } from '@ai-village/hierarchy-simulator';
import type { UniversalAddress } from '@ai-village/hierarchy-simulator';

/**
 * Configuration for creating a sector.
 */
export interface SectorConfig {
  id: string;
  name: string;
  address: Partial<UniversalAddress>;
  galacticCoords?: { x: number; y: number; z: number };
}

/**
 * Aggregated data for an entire sector.
 */
export interface SectorResourceSummary {
  totalPopulation: number;
  totalWater: number;
  totalMetals: number;
  totalRareEarths: number;
  totalFossilFuels: number;
  totalGeothermalEnergy: number;
  systemCount: number;
  habitableSystemCount: number;
  spacefaringCount: number;
  ftlCapableCount: number;
  avgTechLevel: number;
  maxTechLevel: number;
  wormholeGateCount: number;
  totalEconomicOutput: number;
}

// ============================================================================
// Frozen Lookup Tables and Constants
// ============================================================================

// Tech thresholds
const TECH_SPACEFARING = 7;
const TECH_FTL_CAPABLE = 9;
const TECH_WORMHOLE_CAPABLE = 9;

// Political entity formation thresholds
const MIN_SYSTEMS_FOR_EMPIRE = 3;
const MIN_TECH_FOR_FEDERATION = 8;

// Stability thresholds
const STABILITY_WAR_THRESHOLD = 30;
const STABILITY_PEACEFUL_THRESHOLD = 70;

/**
 * Adapter for creating AbstractSector from multiple star systems.
 */
export class SectorTierAdapter {
  // Memoization caches
  private static resourceCache = new Map<string, SectorResourceSummary>();
  private static wormholeNetworkCache = new Map<string, AbstractSystem[]>();
  private static politicalEntitiesCache = new Map<string, any[]>();

  /**
   * Create an AbstractSector from multiple AbstractSystem instances.
   *
   * Aggregates data from all systems in the sector and creates
   * a grand strategy tier for sector-level simulation.
   *
   * @param systems - Array of AbstractSystem instances in this sector
   * @param config - Sector configuration (name, coords, etc.)
   */
  static convertSystemsToSectorTier(
    systems: AbstractSystem[],
    config: SectorConfig
  ): AbstractSector {
    if (!systems) {
      throw new Error('SectorTierAdapter.convertSystemsToSectorTier: systems parameter is required');
    }
    if (!config) {
      throw new Error('SectorTierAdapter.convertSystemsToSectorTier: config parameter is required');
    }
    if (systems.length === 0) {
      throw new Error('SectorTierAdapter.convertSystemsToSectorTier: systems array cannot be empty');
    }

    // Create abstract sector
    const abstractSector = new AbstractSector(
      config.id,
      config.name,
      config.address
    );

    // Override spatial coordinates if provided
    if (config.galacticCoords) {
      abstractSector.spatial.galacticCoords = config.galacticCoords;
      abstractSector.spatial.distanceFromCore = Math.sqrt(
        config.galacticCoords.x ** 2 + config.galacticCoords.y ** 2
      );
    }

    // Add each system as a child tier
    for (const system of systems) {
      abstractSector.addChild(system);
    }

    // Sync sector statistics from children
    this.syncSectorStats(abstractSector, systems);

    // Build wormhole network
    this.buildWormholeNetwork(abstractSector, systems);

    // Build trade networks
    this.buildTradeNetworks(abstractSector, systems);

    // Identify political entities
    this.identifyPoliticalEntities(abstractSector, systems);

    return abstractSector;
  }

  /**
   * Get aggregated resource summary for entire sector.
   *
   * Sums resources across all systems, wormhole gates, and trade networks.
   * Single-pass optimization: Combines system filtering, resource aggregation, and tech analysis.
   */
  static getSectorResources(abstractSector: AbstractSector): SectorResourceSummary {
    if (!abstractSector) {
      throw new Error('SectorTierAdapter.getSectorResources: abstractSector parameter is required');
    }

    // Cache key based on sector ID and children hash
    const cacheKey = `${abstractSector.id}_${abstractSector.children.length}_${abstractSector.tick}`;
    const cached = this.resourceCache.get(cacheKey);
    if (cached !== undefined) return cached;

    let totalPopulation = 0;
    let totalWater = 0;
    let totalMetals = 0;
    let totalRareEarths = 0;
    let totalFossilFuels = 0;
    let totalGeothermalEnergy = 0;
    let systemCount = 0;
    let habitableSystemCount = 0;
    let spacefaringCount = 0;
    let ftlCapableCount = 0;
    let totalTechLevel = 0;
    let maxTechLevel = 0;
    let totalEconomicOutput = 0;

    // Single pass through children
    for (const child of abstractSector.children) {
      if (child.tier !== 'system') {
        continue;
      }

      systemCount++;
      const abstractSystem = child as AbstractSystem;

      // Population
      totalPopulation += abstractSystem.getTotalPopulation();

      // Tech level aggregation
      const techLevel = abstractSystem.tech.level;
      totalTechLevel += techLevel;
      maxTechLevel = Math.max(maxTechLevel, techLevel);

      // Tech-based counts (combined threshold checks)
      if (techLevel >= TECH_FTL_CAPABLE) {
        ftlCapableCount++;
        spacefaringCount++; // FTL implies spacefaring
      } else if (techLevel >= TECH_SPACEFARING) {
        spacefaringCount++;
      }

      // Economic output
      totalEconomicOutput += abstractSystem.systemStats.economicOutput;

      // Resources from planets
      for (const planet of abstractSystem.children) {
        if (planet.tier !== 'planet') {
          continue;
        }

        const resourceMap = (planet as any).planetaryStats?.resourceAbundance;
        if (resourceMap) {
          totalWater += resourceMap.get('water') ?? 0;
          totalMetals += resourceMap.get('metals') ?? 0;
          totalRareEarths += resourceMap.get('rare_earths') ?? 0;
          totalFossilFuels += resourceMap.get('fossil_fuels') ?? 0;
          totalGeothermalEnergy += resourceMap.get('geothermal_energy') ?? 0;
        }
      }

      // Resources from asteroid belts
      for (const belt of abstractSystem.asteroidBelts) {
        const beltYield = belt.resourceYield;
        totalMetals += beltYield.get('metals') ?? 0;
        totalRareEarths += beltYield.get('rare_minerals') ?? 0;
        totalWater += beltYield.get('water_ice') ?? 0;
      }

      // Habitable system check (has at least one planet in habitable zone)
      const hzInner = abstractSystem.habitableZone.inner;
      const hzOuter = abstractSystem.habitableZone.outer;
      let hasHabitablePlanet = false;

      for (const planet of abstractSystem.children) {
        if (planet.tier !== 'planet') {
          continue;
        }

        // Simplified check: if planet has population, it's likely habitable
        if (planet.population.total > 100000) {
          hasHabitablePlanet = true;
          break;
        }
      }

      if (hasHabitablePlanet) {
        habitableSystemCount++;
      }
    }

    const avgTechLevel = systemCount > 0 ? totalTechLevel / systemCount : 0;
    const wormholeGateCount = abstractSector.infrastructure.wormholeGates.length;

    const result: SectorResourceSummary = {
      totalPopulation,
      totalWater,
      totalMetals,
      totalRareEarths,
      totalFossilFuels,
      totalGeothermalEnergy,
      systemCount,
      habitableSystemCount,
      spacefaringCount,
      ftlCapableCount,
      avgTechLevel,
      maxTechLevel,
      wormholeGateCount,
      totalEconomicOutput,
    };

    this.resourceCache.set(cacheKey, result);
    return result;
  }

  /**
   * Get systems connected by wormhole gates.
   *
   * Returns AbstractSystem children that are connected via wormhole network.
   * Cached for performance during traversal operations.
   */
  static getWormholeConnectedSystems(abstractSector: AbstractSector): AbstractSystem[] {
    if (!abstractSector) {
      throw new Error('SectorTierAdapter.getWormholeConnectedSystems: abstractSector parameter is required');
    }

    // Cache key based on sector ID and gate count
    const cacheKey = `${abstractSector.id}_${abstractSector.infrastructure.wormholeGates.length}`;
    const cached = this.wormholeNetworkCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const connectedSystems: AbstractSystem[] = [];
    const systemMap = new Map<string, AbstractSystem>();

    // Build system ID map
    for (const child of abstractSector.children) {
      if (child.tier === 'system') {
        systemMap.set(child.id, child as AbstractSystem);
      }
    }

    // Collect systems with operational wormhole gates
    const connectedSystemIds = new Set<string>();
    for (const gate of abstractSector.infrastructure.wormholeGates) {
      if (gate.operational) {
        connectedSystemIds.add(gate.sourceSystem);
        connectedSystemIds.add(gate.destinationSystem);
      }
    }

    // Build result array
    for (const systemId of connectedSystemIds) {
      const system = systemMap.get(systemId);
      if (system) {
        connectedSystems.push(system);
      }
    }

    this.wormholeNetworkCache.set(cacheKey, connectedSystems);
    return connectedSystems;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Sync sector-level statistics from child systems.
   * Single-pass optimization: Aggregates all stats in one loop.
   */
  private static syncSectorStats(abstractSector: AbstractSector, systems: AbstractSystem[]): void {
    let totalPopulation = 0;
    let totalTechLevel = 0;
    let maxTechLevel = 0;
    let spacefaringCount = 0;
    let ftlCapableCount = 0;
    let totalEconomicOutput = 0;

    // Single pass through systems
    for (const system of systems) {
      totalPopulation += system.getTotalPopulation();

      const techLevel = system.tech.level;
      totalTechLevel += techLevel;
      maxTechLevel = Math.max(maxTechLevel, techLevel);

      // Combined threshold checks (avoid double-checking same condition)
      if (techLevel >= TECH_FTL_CAPABLE) {
        ftlCapableCount++;
        spacefaringCount++; // FTL implies spacefaring
      } else if (techLevel >= TECH_SPACEFARING) {
        spacefaringCount++;
      }

      totalEconomicOutput += system.systemStats.economicOutput;
    }

    const avgTechLevel = systems.length > 0 ? totalTechLevel / systems.length : 0;

    // Update sector stats
    abstractSector.sectorStats.totalPopulation = totalPopulation;
    abstractSector.sectorStats.spacefaringCivCount = spacefaringCount;
    abstractSector.sectorStats.ftlCapableCivCount = ftlCapableCount;
    abstractSector.sectorStats.avgTechLevel = avgTechLevel;
    abstractSector.sectorStats.maxTechLevel = maxTechLevel;

    // Update sector-level population
    abstractSector.population.total = totalPopulation;
    abstractSector.tech.level = maxTechLevel;

    // Calculate political stability based on system stability
    let totalStability = 0;
    for (const system of systems) {
      totalStability += system.stability.overall;
    }
    const avgStability = systems.length > 0 ? totalStability / systems.length : 50;
    abstractSector.sectorStats.politicalStability = avgStability / 100;

    // Calculate economic integration based on trade routes
    const tradeRouteCount = abstractSector.infrastructure.tradeNetworks.length;
    const maxPossibleRoutes = (systems.length * (systems.length - 1)) / 2;
    abstractSector.sectorStats.economicIntegration = maxPossibleRoutes > 0
      ? Math.min(1.0, tradeRouteCount / maxPossibleRoutes)
      : 0;
  }

  /**
   * Build wormhole network connecting systems in sector.
   * Creates gates between systems with FTL technology.
   */
  private static buildWormholeNetwork(
    abstractSector: AbstractSector,
    systems: AbstractSystem[]
  ): void {
    // Only build wormhole network if sector has FTL-capable systems
    const ftlSystems = systems.filter(s => s.tech.level >= TECH_WORMHOLE_CAPABLE);
    if (ftlSystems.length < 2) {
      return;
    }

    // Clear existing gates (will rebuild from scratch)
    abstractSector.infrastructure.wormholeGates = [];

    // Create gates between nearby systems
    for (let i = 0; i < ftlSystems.length; i++) {
      const sourceSystem = ftlSystems[i];
      if (!sourceSystem) continue;

      for (let j = i + 1; j < ftlSystems.length; j++) {
        const destSystem = ftlSystems[j];
        if (!destSystem) continue;

        // Probability of gate decreases with system count (avoid dense networks)
        const gateChance = 0.5 / Math.sqrt(ftlSystems.length);
        if (Math.random() < gateChance) {
          const distance = 5 + Math.random() * 10; // 5-15 light-years
          const travelTime = 7; // 7 days through wormhole

          abstractSector.infrastructure.wormholeGates.push({
            id: `${abstractSector.id}_wormhole_${i}_${j}`,
            sourceSystem: sourceSystem.id,
            destinationSystem: destSystem.id,
            distance,
            travelTime,
            stability: 0.7 + Math.random() * 0.3,
            operational: Math.random() > 0.1, // 90% operational
          });
        }
      }
    }
  }

  /**
   * Build trade networks connecting systems in sector.
   * Creates trade routes based on economic complementarity.
   */
  private static buildTradeNetworks(
    abstractSector: AbstractSector,
    systems: AbstractSystem[]
  ): void {
    // Only build trade networks if sector has spacefaring systems
    const spacefaringSystems = systems.filter(s => s.tech.level >= TECH_SPACEFARING);
    if (spacefaringSystems.length < 2) {
      return;
    }

    // Clear existing networks (will rebuild from scratch)
    abstractSector.infrastructure.tradeNetworks = [];

    // Create trade networks between economically compatible systems
    const networkCount = Math.min(3, Math.floor(spacefaringSystems.length / 2));
    for (let i = 0; i < networkCount; i++) {
      const connectedSystems: string[] = [];
      const systemCount = 2 + Math.floor(Math.random() * 3); // 2-4 systems per network

      // Select random systems for this network
      const selectedIndices = new Set<number>();
      while (connectedSystems.length < Math.min(systemCount, spacefaringSystems.length)) {
        const idx = Math.floor(Math.random() * spacefaringSystems.length);
        const selectedSystem = spacefaringSystems[idx];
        if (!selectedIndices.has(idx) && selectedSystem) {
          selectedIndices.add(idx);
          connectedSystems.push(selectedSystem.id);
        }
      }

      // Determine major commodities based on system resources
      const commodities = ['metals', 'rare_earths', 'water', 'energy', 'technology'];
      const majorCommodities = commodities
        .sort(() => Math.random() - 0.5)
        .slice(0, 2 + Math.floor(Math.random() * 2)); // 2-3 commodities

      // Calculate trade volume based on connected systems' economies
      let totalVolume = 0;
      for (const systemId of connectedSystems) {
        const system = spacefaringSystems.find(s => s.id === systemId);
        if (system) {
          totalVolume += system.systemStats.economicOutput;
        }
      }

      abstractSector.infrastructure.tradeNetworks.push({
        id: `${abstractSector.id}_trade_${i}`,
        connectedSystems,
        volume: totalVolume * 0.1, // 10% of economic output flows through trade
        majorCommodities,
      });
    }
  }

  /**
   * Identify political entities (empires, federations) spanning multiple systems.
   * Groups systems based on proximity, tech level, and diplomatic stance.
   */
  private static identifyPoliticalEntities(
    abstractSector: AbstractSector,
    systems: AbstractSystem[]
  ): void {
    // Clear existing entities (will rebuild from scratch)
    abstractSector.politicalEntities = [];

    // Filter systems by tech level
    const advancedSystems = systems.filter(s => s.tech.level >= TECH_SPACEFARING);
    if (advancedSystems.length === 0) {
      return;
    }

    // Determine number of entities based on sector size and tech level
    const maxEntities = Math.min(3, Math.ceil(advancedSystems.length / MIN_SYSTEMS_FOR_EMPIRE));
    const entityCount = 1 + Math.floor(Math.random() * maxEntities);

    const entityTypes: Array<'empire' | 'federation' | 'corporate_state' | 'hive_mind' | 'ai_collective'> = [
      'empire', 'federation', 'corporate_state', 'hive_mind', 'ai_collective'
    ];

    const entityNames = [
      'Star Empire', 'Galactic Federation', 'Corporate Syndicate',
      'Hive Collective', 'AI Network'
    ];

    // Partition systems among entities
    const systemsPerEntity = Math.floor(advancedSystems.length / entityCount);
    const remainingSystems = advancedSystems.length % entityCount;

    let systemIndex = 0;
    for (let i = 0; i < entityCount; i++) {
      const systemsForThisEntity = systemsPerEntity + (i < remainingSystems ? 1 : 0);
      const controlledSystems: string[] = [];
      let entityPopulation = 0;
      let entityTechLevel = 0;

      for (let j = 0; j < systemsForThisEntity && systemIndex < advancedSystems.length; j++, systemIndex++) {
        const system = advancedSystems[systemIndex];
        if (!system) continue;
        controlledSystems.push(system.id);
        entityPopulation += system.getTotalPopulation();
        entityTechLevel = Math.max(entityTechLevel, system.tech.level);
      }

      // entityTypes has 5 elements, i % 5 is always valid
      const type = entityTypes[i % entityTypes.length] ?? 'empire';
      const name = entityNames[i % entityNames.length] ?? 'Unknown Entity';

      // Military power scales with population and tech
      const militaryPower = Math.floor(entityPopulation * 0.05 * entityTechLevel);

      abstractSector.politicalEntities.push({
        id: `${abstractSector.id}_entity_${i}`,
        name,
        type,
        controlledSystems,
        population: entityPopulation,
        techLevel: entityTechLevel,
        militaryPower,
        diplomaticStance: new Map(),
      });
    }

    // Set diplomatic stances between entities
    if (abstractSector.politicalEntities.length > 1) {
      const stances: Array<'ally' | 'neutral' | 'rival' | 'war'> = ['ally', 'neutral', 'rival', 'war'];
      let activeWars = 0;

      for (let i = 0; i < abstractSector.politicalEntities.length; i++) {
        const entityI = abstractSector.politicalEntities[i];
        if (!entityI) continue;

        for (let j = i + 1; j < abstractSector.politicalEntities.length; j++) {
          const entityJ = abstractSector.politicalEntities[j];
          if (!entityJ) continue;

          // Bias toward peaceful relations in high-stability sectors
          const stabilityBonus = abstractSector.sectorStats.politicalStability > 0.7 ? 2 : 0;
          const stanceRoll = Math.floor(Math.random() * (stances.length + stabilityBonus));
          const stance = stances[Math.min(stanceRoll, stances.length - 1)] ?? 'neutral';

          entityI.diplomaticStance.set(entityJ.id, stance);
          entityJ.diplomaticStance.set(entityI.id, stance);

          if (stance === 'war') {
            activeWars++;
          }
        }
      }

      abstractSector.sectorStats.activeWars = activeWars;
    }
  }
}
