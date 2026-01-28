import { AbstractTierBase } from './AbstractTierBase.js';
import type { UniversalAddress } from './types.js';

/**
 * Sector-tier abstraction - regional power zone
 *
 * Represents a sector containing 10-100 star systems within ~10 light-years:
 * - Spatial properties (galactic coordinates, spiral arm)
 * - Star systems (child tiers)
 * - Interstellar infrastructure (wormhole gates, trade networks)
 * - Political entities (empires, federations)
 * - Sector-wide statistics
 *
 * Time scale: 1 tick = 1,000 years
 */
export class AbstractSector extends AbstractTierBase {
  // Sector-specific properties
  spatial: {
    galacticCoords: { x: number; y: number; z: number };
    radius: number;
    distanceFromCore: number;
    spiralArm?: 'perseus' | 'orion' | 'sagittarius' | 'scutum_centaurus' | 'outer';
    stellarDensity: number;
  };

  infrastructure: {
    wormholeGates: Array<{
      id: string;
      sourceSystem: string;
      destinationSystem: string;
      distance: number;
      travelTime: number;
      stability: number;
      operational: boolean;
    }>;
    tradeNetworks: Array<{
      id: string;
      connectedSystems: string[];
      volume: number;
      majorCommodities: string[];
    }>;
    commRelays: number;
    defensePlatforms: Array<{
      location: string;
      type: 'orbital_fortress' | 'minefield' | 'sensor_network';
      coverage: number;
    }>;
  };

  politicalEntities: Array<{
    id: string;
    name: string;
    type: 'empire' | 'federation' | 'corporate_state' | 'hive_mind' | 'ai_collective';
    controlledSystems: string[];
    population: number;
    techLevel: number;
    militaryPower: number;
    diplomaticStance: Map<string, 'ally' | 'neutral' | 'rival' | 'war'>;
  }> = [];

  sectorStats: {
    totalPopulation: number;
    spacefaringCivCount: number;
    ftlCapableCivCount: number;
    avgTechLevel: number;
    maxTechLevel: number;
    economicIntegration: number;
    politicalStability: number;
    activeWars: number;
  };

  sectorEvents: Array<{
    tick: number;
    type: 'empire_rise' | 'empire_fall' | 'first_contact' | 'sector_war' | 'dyson_sphere_complete' | 'singularity_event';
    participants: string[];
    description: string;
  }> = [];

  constructor(id: string, name: string, address: Partial<UniversalAddress>) {
    super(id, name, 'sector', address, 'abstract');

    // Initialize spatial properties
    this.spatial = this.generateSpatialProperties();

    // Initialize infrastructure
    this.infrastructure = {
      wormholeGates: [],
      tradeNetworks: [],
      commRelays: this.tech.level >= 8 ? 5 + Math.floor(Math.random() * 10) : 0,
      defensePlatforms: [],
    };

    // Initialize sector statistics
    this.sectorStats = {
      totalPopulation: this.population.total,
      spacefaringCivCount: this.tech.level >= 7 ? 1 : 0,
      ftlCapableCivCount: this.tech.level >= 9 ? 1 : 0,
      avgTechLevel: this.tech.level,
      maxTechLevel: this.tech.level,
      economicIntegration: 0.3 + Math.random() * 0.4,
      politicalStability: this.stability.overall / 100,
      activeWars: 0,
    };

    // Generate political entities
    this.generatePoliticalEntities();

    // Generate wormhole network if advanced
    if (this.tech.level >= 9) {
      this.generateWormholeNetwork();
    }
  }

  private generateSpatialProperties(): {
    galacticCoords: { x: number; y: number; z: number };
    radius: number;
    distanceFromCore: number;
    spiralArm?: 'perseus' | 'orion' | 'sagittarius' | 'scutum_centaurus' | 'outer';
    stellarDensity: number;
  } {
    const galacticCoords = {
      x: (Math.random() - 0.5) * 100000, // ±50,000 light-years
      y: (Math.random() - 0.5) * 100000,
      z: (Math.random() - 0.5) * 2000,    // ±1,000 light-years (galactic disk)
    };

    const distanceFromCore = Math.sqrt(
      galacticCoords.x ** 2 + galacticCoords.y ** 2
    );

    // Determine spiral arm
    const angle = Math.atan2(galacticCoords.y, galacticCoords.x);
    const spiralArms: Array<'perseus' | 'orion' | 'sagittarius' | 'scutum_centaurus' | 'outer'> = [
      'perseus', 'orion', 'sagittarius', 'scutum_centaurus'
    ];
    const spiralArm = distanceFromCore < 50000
      ? spiralArms[Math.floor((angle + Math.PI) / (2 * Math.PI) * 4)]!
      : 'outer';

    // Stellar density (higher near core)
    const stellarDensity = distanceFromCore < 1000
      ? 1000
      : distanceFromCore < 25000
      ? 0.1 * Math.exp(-distanceFromCore / 10000)
      : 0.001;

    return {
      galacticCoords,
      radius: 10, // Light-years
      distanceFromCore,
      spiralArm,
      stellarDensity,
    };
  }

  private generatePoliticalEntities(): void {
    const entityCount = Math.random() < 0.7 ? 1 : 2; // 70% have 1 entity, 30% have 2

    const entityNames = [
      'Star Empire', 'Galactic Federation', 'Corporate Syndicate',
      'Hive Collective', 'AI Network'
    ];

    const entityTypes: Array<'empire' | 'federation' | 'corporate_state' | 'hive_mind' | 'ai_collective'> = [
      'empire', 'federation', 'corporate_state', 'hive_mind', 'ai_collective'
    ];

    for (let i = 0; i < entityCount; i++) {
      const type = entityTypes[Math.floor(Math.random() * entityTypes.length)]!;
      const popShare = this.population.total / entityCount;

      this.politicalEntities.push({
        id: `${this.id}_entity_${i}`,
        name: entityNames[i % entityNames.length]!,
        type,
        controlledSystems: [], // Will be populated when systems are generated
        population: Math.floor(popShare),
        techLevel: this.tech.level,
        militaryPower: Math.floor(popShare * 0.05 * this.tech.level),
        diplomaticStance: new Map(),
      });
    }

    // Set diplomatic stances between entities
    if (this.politicalEntities.length > 1) {
      const stances: Array<'ally' | 'neutral' | 'rival' | 'war'> = ['ally', 'neutral', 'rival', 'war'];
      for (let i = 0; i < this.politicalEntities.length; i++) {
        for (let j = i + 1; j < this.politicalEntities.length; j++) {
          const stance = stances[Math.floor(Math.random() * stances.length)]!;
          this.politicalEntities[i]!.diplomaticStance.set(this.politicalEntities[j]!.id, stance);
          this.politicalEntities[j]!.diplomaticStance.set(this.politicalEntities[i]!.id, stance);

          if (stance === 'war') {
            this.sectorStats.activeWars++;
          }
        }
      }
    }
  }

  private generateWormholeNetwork(): void {
    const gateCount = 2 + Math.floor(Math.random() * 5); // 2-7 wormhole gates

    for (let i = 0; i < gateCount; i++) {
      this.infrastructure.wormholeGates.push({
        id: `${this.id}_wormhole_${i}`,
        sourceSystem: `system_${i}`,
        destinationSystem: `system_${(i + 1) % gateCount}`,
        distance: 5 + Math.random() * 10, // 5-15 light-years
        travelTime: 7, // 7 days through wormhole
        stability: 0.7 + Math.random() * 0.3,
        operational: Math.random() > 0.1, // 90% operational
      });
    }
  }

  protected updateAbstract(deltaTime: number): void {
    super.updateAbstract(deltaTime);

    // Update sector statistics
    this.sectorStats.totalPopulation = this.getTotalPopulation();
    this.sectorStats.avgTechLevel = this.tech.level;
    this.sectorStats.maxTechLevel = this.tech.level;

    // Update political stability based on wars
    if (this.sectorStats.activeWars > 0) {
      this.sectorStats.politicalStability = Math.max(0.1, this.sectorStats.politicalStability - 0.01 * deltaTime);
    } else {
      this.sectorStats.politicalStability = Math.min(1.0, this.sectorStats.politicalStability + 0.01 * deltaTime);
    }

    // Economic integration increases with peace
    if (this.sectorStats.politicalStability > 0.7) {
      this.sectorStats.economicIntegration = Math.min(1.0, this.sectorStats.economicIntegration + 0.005 * deltaTime);
    }

    // Wormhole network expansion
    if (this.tech.level >= 9 && this.infrastructure.wormholeGates.length < 10) {
      if (Math.random() < 0.001 * deltaTime) {
        const gateCount = this.infrastructure.wormholeGates.length;
        this.infrastructure.wormholeGates.push({
          id: `${this.id}_wormhole_${gateCount}`,
          sourceSystem: `system_${gateCount}`,
          destinationSystem: `system_${Math.floor(Math.random() * gateCount)}`,
          distance: 5 + Math.random() * 10,
          travelTime: 7,
          stability: 0.8,
          operational: true,
        });
      }
    }

    // Update political entities
    for (const entity of this.politicalEntities) {
      entity.techLevel = this.tech.level;
      entity.militaryPower = Math.floor(entity.population * 0.05 * entity.techLevel);
    }

    // Consolidation: Empires may merge or split
    if (this.politicalEntities.length > 1 && this.sectorStats.politicalStability > 0.9) {
      if (Math.random() < 0.0001 * deltaTime) {
        // Merge two entities
        const entity1 = this.politicalEntities[0]!;
        const entity2 = this.politicalEntities[1]!;
        entity1.population += entity2.population;
        entity1.militaryPower += entity2.militaryPower;
        this.politicalEntities.splice(1, 1);

        this.sectorEvents.push({
          tick: this.tick,
          type: 'empire_rise',
          participants: [entity1.id, entity2.id],
          description: `${entity1.name} and ${entity2.name} merged into unified empire`,
        });
      }
    }
  }

  toJSON(): any {
    return {
      ...super.toJSON(),
      spatial: this.spatial,
      infrastructure: {
        ...this.infrastructure,
        wormholeGates: this.infrastructure.wormholeGates,
        tradeNetworks: this.infrastructure.tradeNetworks,
        commRelays: this.infrastructure.commRelays,
        defensePlatforms: this.infrastructure.defensePlatforms,
      },
      politicalEntities: this.politicalEntities.map(entity => ({
        ...entity,
        diplomaticStance: Array.from(entity.diplomaticStance.entries()),
      })),
      sectorStats: this.sectorStats,
      sectorEvents: this.sectorEvents,
    };
  }
}
