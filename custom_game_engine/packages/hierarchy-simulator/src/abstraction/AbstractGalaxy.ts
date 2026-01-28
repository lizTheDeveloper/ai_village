import { AbstractTierBase } from './AbstractTierBase.js';
import type { UniversalAddress } from './types.js';

/**
 * Galaxy-tier abstraction - entire galactic civilization
 *
 * Represents an entire galaxy with:
 * - Galactic structure (spiral arms, black hole, dark matter)
 * - Sectors (child tiers)
 * - Galactic-scale civilizations (Kardashev II-III)
 * - Galactic infrastructure (wormhole network, galactic internet)
 * - Cosmic events (singularities, gamma ray bursts, etc.)
 *
 * Time scale: 1 tick = 10,000 years
 */
export class AbstractGalaxy extends AbstractTierBase {
  // Galaxy-specific properties
  structure: {
    type: 'spiral' | 'elliptical' | 'irregular' | 'ring';
    diameter: number;
    thickness: number;
    spiralArms?: number;
    centralBlackHole: {
      mass: number;
      accretionRate: number;
      active: boolean;
    };
    darkMatterMass: number;
  };

  infrastructure: {
    wormholeNetwork: {
      nodeCount: number;
      totalConnections: number;
      coverage: number;
    };
    commBeacons: number;
    galacticNet?: {
      bandwidth: number;
      latency: number;
      nodes: number;
    };
  };

  galacticCivilizations: Array<{
    id: string;
    name: string;
    type: 'kardashev_ii' | 'kardashev_iii' | 'transcendent' | 'ai_collective' | 'hive_overmind';
    controlledSectors: string[];
    population: number;
    techLevel: number;
    kardashevLevel: number;
    energyOutput: number;
    dysonSpheres: number;
    megastructures: Array<{
      id: string;
      type: 'dyson_sphere' | 'ringworld' | 'galactic_highway' | 'matrioshka_brain' | 'stellar_engine';
      location: string;
      operational: boolean;
    }>;
  }> = [];

  galacticStats: {
    totalPopulation: number;
    totalStars: number;
    totalPlanets: number;
    colonizedSystems: number;
    maxTechLevel: number;
    avgKardashevLevel: number;
    totalEnergyOutput: number;
    economicOutput: number;
    activeCivilizations: number;
    extinctCivilizations: number;
  };

  cosmicEvents: Array<{
    tick: number;
    type:
      | 'civilization_rise'
      | 'civilization_collapse'
      | 'galactic_war'
      | 'first_dyson_sphere'
      | 'singularity_cascade'
      | 'black_hole_merger'
      | 'gamma_ray_burst'
      | 'intergalactic_contact'
      | 'great_filter_crossed'
      | 'universe_fork';
    location?: string;
    participants?: string[];
    description: string;
    impact: 'local' | 'regional' | 'galactic' | 'cosmic';
  }> = [];

  governance?: {
    type: 'galactic_council' | 'galactic_empire' | 'ai_stewardship' | 'hive_mind' | 'anarchic';
    founded: number;
    memberCivilizations: string[];
    laws: string[];
    enforcement: number;
  };

  constructor(id: string, name: string, address: Partial<UniversalAddress>) {
    super(id, name, 'galaxy', address, 'abstract');

    // Initialize galactic structure
    this.structure = this.generateGalacticStructure();

    // Initialize infrastructure
    this.infrastructure = {
      wormholeNetwork: {
        nodeCount: 0,
        totalConnections: 0,
        coverage: 0,
      },
      commBeacons: this.tech.level >= 9 ? 100 + Math.floor(Math.random() * 900) : 0,
      galacticNet: this.tech.level >= 10 ? {
        bandwidth: 1e12, // Exabytes/second
        latency: 100000, // Years (light-speed limited)
        nodes: 1000 + Math.floor(Math.random() * 9000),
      } : undefined,
    };

    // Initialize galactic statistics
    this.galacticStats = {
      totalPopulation: this.population.total,
      totalStars: 100_000_000_000 + Math.floor(Math.random() * 300_000_000_000), // 100-400 billion
      totalPlanets: 0, // Will be computed from sectors
      colonizedSystems: 0,
      maxTechLevel: this.tech.level,
      avgKardashevLevel: 0,
      totalEnergyOutput: 0,
      economicOutput: 0,
      activeCivilizations: 0,
      extinctCivilizations: Math.floor(Math.random() * 100), // Some failed civilizations
    };

    // Generate galactic civilizations if advanced enough
    if (this.tech.level >= 8) {
      this.generateGalacticCivilizations();
    }
  }

  private generateGalacticStructure(): {
    type: 'spiral' | 'elliptical' | 'irregular' | 'ring';
    diameter: number;
    thickness: number;
    spiralArms?: number;
    centralBlackHole: {
      mass: number;
      accretionRate: number;
      active: boolean;
    };
    darkMatterMass: number;
  } {
    const types: Array<'spiral' | 'elliptical' | 'irregular' | 'ring'> = [
      'spiral', 'elliptical', 'irregular', 'ring'
    ];
    const typeWeights = [0.77, 0.20, 0.03, 0.0001]; // Distribution

    let random = Math.random();
    let selectedType: 'spiral' | 'elliptical' | 'irregular' | 'ring' = 'spiral';

    for (let i = 0; i < types.length; i++) {
      random -= typeWeights[i]!;
      if (random <= 0) {
        selectedType = types[i]!;
        break;
      }
    }

    const spiralArms = selectedType === 'spiral' ? (2 + Math.floor(Math.random() * 3)) : undefined; // 2-4 arms

    return {
      type: selectedType,
      diameter: 100000 + Math.random() * 20000, // 100-120k light-years
      thickness: 1000 + Math.random() * 500,    // 1-1.5k light-years
      spiralArms,
      centralBlackHole: {
        mass: 4e6 * (0.5 + Math.random()), // 2-4 million solar masses (Sagittarius A*-like)
        accretionRate: Math.random() * 0.001,
        active: Math.random() < 0.1, // 10% chance of active quasar
      },
      darkMatterMass: 1e12, // ~1 trillion solar masses
    };
  }

  private generateGalacticCivilizations(): void {
    const civCount = Math.min(5, Math.floor(this.tech.level - 7)); // More civs at higher tech

    const civNames = [
      'Ancient Builders', 'Star Shepherds', 'Transcendent Collective',
      'Dyson Federation', 'Galactic Mind'
    ];

    const civTypes: Array<'kardashev_ii' | 'kardashev_iii' | 'transcendent' | 'ai_collective' | 'hive_overmind'> = [
      'kardashev_ii', 'kardashev_iii', 'transcendent', 'ai_collective', 'hive_overmind'
    ];

    for (let i = 0; i < civCount; i++) {
      const type = civTypes[Math.min(i, civTypes.length - 1)]!;
      const popShare = this.population.total / civCount;

      const kardashevLevel = type === 'kardashev_ii' ? 2.0 + Math.random() * 0.5
        : type === 'kardashev_iii' ? 2.5 + Math.random() * 0.5
        : 3.0 + Math.random() * 0.5;

      this.galacticCivilizations.push({
        id: `${this.id}_civ_${i}`,
        name: civNames[i % civNames.length]!,
        type,
        controlledSectors: [], // Will be populated when sectors are generated
        population: Math.floor(popShare),
        techLevel: this.tech.level,
        kardashevLevel,
        energyOutput: Math.pow(10, 26 + kardashevLevel * 10), // Watts
        dysonSpheres: Math.floor(Math.random() * (kardashevLevel - 1) * 100),
        megastructures: this.generateMegastructures(i),
      });
    }

    this.galacticStats.activeCivilizations = this.galacticCivilizations.length;
  }

  private generateMegastructures(civIndex: number): Array<{
    id: string;
    type: 'dyson_sphere' | 'ringworld' | 'galactic_highway' | 'matrioshka_brain' | 'stellar_engine';
    location: string;
    operational: boolean;
  }> {
    const megastructures: Array<{
      id: string;
      type: 'dyson_sphere' | 'ringworld' | 'galactic_highway' | 'matrioshka_brain' | 'stellar_engine';
      location: string;
      operational: boolean;
    }> = [];

    const count = 1 + Math.floor(Math.random() * 3); // 1-3 megastructures

    const types: Array<'dyson_sphere' | 'ringworld' | 'galactic_highway' | 'matrioshka_brain' | 'stellar_engine'> = [
      'dyson_sphere', 'ringworld', 'galactic_highway', 'matrioshka_brain', 'stellar_engine'
    ];

    for (let i = 0; i < count; i++) {
      megastructures.push({
        id: `${this.id}_mega_${civIndex}_${i}`,
        type: types[Math.floor(Math.random() * types.length)]!,
        location: `sector_${Math.floor(Math.random() * 1000)}`,
        operational: Math.random() > 0.2, // 80% operational
      });
    }

    return megastructures;
  }

  protected updateAbstract(deltaTime: number): void {
    super.updateAbstract(deltaTime);

    // Update galactic statistics
    this.galacticStats.totalPopulation = this.getTotalPopulation();
    this.galacticStats.maxTechLevel = this.tech.level;

    // Update civilizations
    let totalKardashevLevel = 0;
    let totalEnergyOutput = 0;

    for (const civ of this.galacticCivilizations) {
      // Civilization growth
      civ.population *= (1 + 0.01 * deltaTime); // 1% growth per 10k years
      civ.techLevel = this.tech.level;
      civ.kardashevLevel = Math.min(3.5, civ.kardashevLevel + 0.001 * deltaTime);
      civ.energyOutput = Math.pow(10, 26 + civ.kardashevLevel * 10);

      totalKardashevLevel += civ.kardashevLevel;
      totalEnergyOutput += civ.energyOutput;
    }

    this.galacticStats.avgKardashevLevel = this.galacticCivilizations.length > 0
      ? totalKardashevLevel / this.galacticCivilizations.length
      : 0;
    this.galacticStats.totalEnergyOutput = totalEnergyOutput;

    // Economic output (simplified)
    this.galacticStats.economicOutput = this.galacticStats.totalPopulation * this.tech.level * 1000;

    // Wormhole network expansion
    if (this.tech.level >= 9) {
      this.infrastructure.wormholeNetwork.nodeCount = 100 + Math.floor(this.tech.level * 100);
      this.infrastructure.wormholeNetwork.totalConnections = this.infrastructure.wormholeNetwork.nodeCount * 3;
      this.infrastructure.wormholeNetwork.coverage = Math.min(1.0, this.tech.level / 10);
    }

    // Galactic unification check
    if (!this.governance && this.galacticCivilizations.length >= 3 && this.tech.level >= 10) {
      if (Math.random() < 0.0001 * deltaTime) {
        this.governance = {
          type: 'galactic_council',
          founded: this.tick,
          memberCivilizations: this.galacticCivilizations.map(c => c.id),
          laws: ['non_aggression_pact', 'technology_sharing', 'dimensional_stability_protocol'],
          enforcement: 0.7,
        };

        this.cosmicEvents.push({
          tick: this.tick,
          type: 'civilization_rise',
          participants: this.galacticCivilizations.map(c => c.id),
          description: 'Galactic Council formed - unified governance established',
          impact: 'galactic',
        });
      }
    }

    // Singularity events
    if (this.tech.level >= 10 && Math.random() < 0.0001 * deltaTime) {
      this.cosmicEvents.push({
        tick: this.tick,
        type: 'singularity_cascade',
        description: 'Technological singularity - civilization transcends physical constraints',
        impact: 'galactic',
      });
    }

    // Universe fork events (multiverse integration)
    if (this.tech.level >= 10 && Math.random() < 0.00001 * deltaTime) {
      this.cosmicEvents.push({
        tick: this.tick,
        type: 'universe_fork',
        description: 'Reality manipulation detected - timeline branch created',
        impact: 'cosmic',
      });
    }
  }

  toJSON(): any {
    return {
      ...super.toJSON(),
      structure: this.structure,
      infrastructure: this.infrastructure,
      galacticCivilizations: this.galacticCivilizations,
      galacticStats: this.galacticStats,
      cosmicEvents: this.cosmicEvents,
      governance: this.governance,
    };
  }
}
