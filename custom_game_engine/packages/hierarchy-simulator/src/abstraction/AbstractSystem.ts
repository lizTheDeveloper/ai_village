import { AbstractTierBase } from './AbstractTierBase.js';
import type { UniversalAddress } from './types.js';

/**
 * System-tier abstraction - entire star system
 *
 * Represents a star system with:
 * - Star properties (spectral type, mass, luminosity)
 * - Habitable zone
 * - Planets (child tiers)
 * - Asteroid belts
 * - Orbital infrastructure (stations, shipyards)
 * - Interplanetary trade routes
 *
 * Time scale: 1 tick = 100 years
 */
export class AbstractSystem extends AbstractTierBase {
  // System-specific properties
  star: {
    type: 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';
    subtype: number;
    mass: number;
    luminosity: number;
    age: number;
  };

  habitableZone: {
    inner: number;
    outer: number;
  };

  asteroidBelts: Array<{
    id: string;
    innerRadius: number;
    outerRadius: number;
    density: 'sparse' | 'moderate' | 'dense';
    composition: 'rocky' | 'metallic' | 'icy';
    miningStations: number;
    resourceYield: Map<string, number>;
  }> = [];

  orbitalInfrastructure: Array<{
    id: string;
    type: 'station' | 'shipyard' | 'habitat' | 'refinery' | 'defense_platform';
    location: {
      orbitingBody?: string;
      orbitalRadius?: number;
    };
    population: number;
    capacity: number;
    operational: boolean;
  }> = [];

  systemStats: {
    totalPopulation: number;
    maxTechLevel: number;
    spacefaringCivCount: number;
    ftlCapable: number;
    defensePower: number;
    economicOutput: number;
  };

  systemEvents: Array<{
    tick: number;
    type: 'nova' | 'asteroid_impact' | 'first_contact' | 'space_battle' | 'dyson_swarm_begin' | 'wormhole_opened';
    location?: string;
    description: string;
  }> = [];

  constructor(id: string, name: string, address: Partial<UniversalAddress>) {
    super(id, name, 'system', address, 'abstract');

    // Initialize star properties
    this.star = this.generateStar();

    // Calculate habitable zone
    this.habitableZone = this.calculateHabitableZone(this.star.luminosity);

    // Initialize system statistics
    this.systemStats = {
      totalPopulation: this.population.total,
      maxTechLevel: this.tech.level,
      spacefaringCivCount: this.tech.level >= 7 ? 1 : 0,
      ftlCapable: this.tech.level >= 9 ? 1 : 0,
      defensePower: 0,
      economicOutput: 0,
    };

    // Generate asteroid belts
    this.generateAsteroidBelts();

    // Generate orbital infrastructure if advanced enough
    if (this.tech.level >= 7) {
      this.generateOrbitalInfrastructure();
    }
  }

  private generateStar(): {
    type: 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';
    subtype: number;
    mass: number;
    luminosity: number;
    age: number;
  } {
    // Star type distribution (simplified)
    const types: Array<'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M'> = ['M', 'K', 'G', 'F', 'A', 'B', 'O'];
    const weights = [76.5, 12.1, 7.6, 3.0, 0.6, 0.1, 0.00003]; // Percentage distribution

    let random = Math.random() * 100;
    let selectedType: 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M' = 'M';

    for (let i = 0; i < types.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        selectedType = types[i];
        break;
      }
    }

    const subtype = Math.floor(Math.random() * 10);

    // Stellar parameters by type (simplified)
    const params = {
      O: { mass: 16 + Math.random() * 90, luminosity: 30000 + Math.random() * 1000000 },
      B: { mass: 2.1 + Math.random() * 14, luminosity: 25 + Math.random() * 30000 },
      A: { mass: 1.4 + Math.random() * 0.7, luminosity: 5 + Math.random() * 20 },
      F: { mass: 1.04 + Math.random() * 0.36, luminosity: 1.5 + Math.random() * 3.5 },
      G: { mass: 0.8 + Math.random() * 0.24, luminosity: 0.6 + Math.random() * 0.9 },
      K: { mass: 0.45 + Math.random() * 0.35, luminosity: 0.08 + Math.random() * 0.52 },
      M: { mass: 0.08 + Math.random() * 0.37, luminosity: 0.0001 + Math.random() * 0.08 },
    };

    const param = params[selectedType];

    return {
      type: selectedType,
      subtype,
      mass: param.mass,
      luminosity: param.luminosity,
      age: 1 + Math.random() * 10, // 1-11 billion years
    };
  }

  private calculateHabitableZone(luminosity: number): { inner: number; outer: number } {
    const sqrtL = Math.sqrt(luminosity);
    return {
      inner: 0.95 * sqrtL,
      outer: 1.37 * sqrtL,
    };
  }

  private generateAsteroidBelts(): void {
    const beltCount = Math.random() < 0.6 ? 1 : 2; // 60% have 1 belt, 40% have 2

    for (let i = 0; i < beltCount; i++) {
      const innerRadius = 2.0 + Math.random() * 3.0; // 2-5 AU
      const outerRadius = innerRadius + 0.5 + Math.random() * 1.5; // 0.5-2 AU wide

      const resourceYield = new Map<string, number>();
      resourceYield.set('metals', 1e9 + Math.random() * 1e10);
      resourceYield.set('rare_minerals', 1e7 + Math.random() * 1e8);
      resourceYield.set('water_ice', 1e8 + Math.random() * 1e9);

      this.asteroidBelts.push({
        id: `${this.id}_belt_${i}`,
        innerRadius,
        outerRadius,
        density: ['sparse', 'moderate', 'dense'][Math.floor(Math.random() * 3)] as 'sparse' | 'moderate' | 'dense',
        composition: ['rocky', 'metallic', 'icy'][Math.floor(Math.random() * 3)] as 'rocky' | 'metallic' | 'icy',
        miningStations: this.tech.level >= 8 ? Math.floor(Math.random() * 10) : 0,
        resourceYield,
      });
    }
  }

  private generateOrbitalInfrastructure(): void {
    const stationCount = 1 + Math.floor(this.tech.level - 6); // More stations at higher tech

    const types: Array<'station' | 'shipyard' | 'habitat' | 'refinery' | 'defense_platform'> = [
      'station', 'shipyard', 'habitat', 'refinery', 'defense_platform'
    ];

    for (let i = 0; i < stationCount; i++) {
      const type = types[Math.floor(Math.random() * types.length)];

      this.orbitalInfrastructure.push({
        id: `${this.id}_orbital_${i}`,
        type,
        location: {
          orbitingBody: Math.random() > 0.5 ? 'star' : undefined,
          orbitalRadius: 0.5 + Math.random() * 4.5, // 0.5-5 AU
        },
        population: type === 'habitat' ? 10000 + Math.floor(Math.random() * 1000000) : 100 + Math.floor(Math.random() * 10000),
        capacity: 100000 + Math.floor(Math.random() * 10000000),
        operational: Math.random() > 0.1, // 90% operational
      });
    }
  }

  protected updateAbstract(deltaTime: number): void {
    super.updateAbstract(deltaTime);

    // Update system statistics from children
    this.systemStats.totalPopulation = this.getTotalPopulation();
    this.systemStats.maxTechLevel = this.tech.level;

    // Space infrastructure development
    if (this.tech.level >= 7 && this.orbitalInfrastructure.length === 0) {
      this.generateOrbitalInfrastructure();
    }

    // Update spacefaring status
    this.systemStats.spacefaringCivCount = this.tech.level >= 7 ? 1 : 0;
    this.systemStats.ftlCapable = this.tech.level >= 9 ? 1 : 0;

    // Asteroid belt mining
    for (const belt of this.asteroidBelts) {
      if (belt.miningStations > 0) {
        for (const [resource, yield_] of belt.resourceYield) {
          const currentStock = this.economy.stockpiles.get(resource as any) || 0;
          this.economy.stockpiles.set(resource as any, currentStock + yield_ * belt.miningStations * deltaTime * 0.01);
        }
      }
    }

    // Economic output
    let totalEconomicOutput = 0;
    for (const [_, production] of this.economy.production) {
      totalEconomicOutput += production;
    }
    this.systemStats.economicOutput = totalEconomicOutput * this.tech.efficiency;

    // Defense power
    this.systemStats.defensePower = this.orbitalInfrastructure
      .filter(i => i.type === 'defense_platform' && i.operational)
      .length * this.tech.level;
  }

  toJSON(): any {
    return {
      ...super.toJSON(),
      star: this.star,
      habitableZone: this.habitableZone,
      asteroidBelts: this.asteroidBelts,
      orbitalInfrastructure: this.orbitalInfrastructure,
      systemStats: this.systemStats,
      systemEvents: this.systemEvents,
    };
  }
}
