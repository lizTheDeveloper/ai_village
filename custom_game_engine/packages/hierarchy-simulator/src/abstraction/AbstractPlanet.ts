import { AbstractTierBase } from './AbstractTierBase.js';
import type { UniversalAddress } from './types.js';

/**
 * Planet-tier abstraction - entire world simulated statistically
 *
 * Represents an entire planet with:
 * - Planetary statistics (land area, climate zones, biomes)
 * - Civilization statistics (nations, tech level, urbanization)
 * - Named features (continents, mountains, etc.)
 * - Major civilizations
 * - Megastructures (orbital rings, space elevators)
 *
 * Time scale: 1 tick = 10 years
 */
export class AbstractPlanet extends AbstractTierBase {
  // Planet-specific properties
  planetaryStats: {
    landArea: number;
    oceanArea: number;
    continentCount: number;
    climateZones: {
      tropical: number;
      temperate: number;
      polar: number;
      desert: number;
    };
    resourceAbundance: Map<string, number>;
  };

  civilizationStats: {
    nationCount: number;
    dominantCulture?: string;
    avgTechLevel: number;
    techLevelRange: [number, number];
    governmentType?: 'unified' | 'fractured' | 'tribal' | 'post_singularity';
    urbanization: number;
    industrialization: number;
  };

  namedFeatures: Array<{
    id: string;
    name: string;
    type: 'continent' | 'ocean' | 'mountain_range' | 'river' | 'crater' | 'volcano';
    location: { lat: number; lon: number };
    namedBy?: string;
    namedAt?: number;
  }> = [];

  majorCivilizations: Array<{
    id: string;
    name: string;
    population: number;
    capital: { lat: number; lon: number };
    techLevel: number;
    culturalIdentity: string;
    activeWars: string[];
  }> = [];

  megastructures: Array<{
    id: string;
    type: 'orbital_ring' | 'space_elevator' | 'planetary_shield' | 'weather_control';
    location: { lat: number; lon: number } | 'orbital';
    constructionProgress: number;
    operational: boolean;
  }> = [];

  constructor(id: string, name: string, address: Partial<UniversalAddress>) {
    super(id, name, 'planet', address, 'abstract');

    // Initialize planetary statistics
    const totalArea = 5e8; // ~510 million km²
    const oceanCoverage = 0.6 + Math.random() * 0.2; // 60-80% ocean

    this.planetaryStats = {
      landArea: totalArea * (1 - oceanCoverage),
      oceanArea: totalArea * oceanCoverage,
      continentCount: 3 + Math.floor(Math.random() * 5), // 3-7 continents
      climateZones: this.generateClimateZones(),
      resourceAbundance: this.generateResourceAbundance(),
    };

    // Initialize civilization statistics
    this.civilizationStats = {
      nationCount: 5 + Math.floor(Math.random() * 20), // 5-25 nations
      avgTechLevel: this.tech.level,
      techLevelRange: [Math.max(0, this.tech.level - 2), Math.min(10, this.tech.level + 2)],
      urbanization: 0.3 + Math.random() * 0.5, // 30-80%
      industrialization: this.tech.level,
    };

    // Generate named features
    this.generateNamedFeatures();

    // Generate major civilizations
    this.generateMajorCivilizations();
  }

  private generateClimateZones(): {
    tropical: number;
    temperate: number;
    polar: number;
    desert: number;
  } {
    // Random climate distribution (percentages)
    const base = {
      tropical: 20 + Math.random() * 20,
      temperate: 30 + Math.random() * 20,
      polar: 10 + Math.random() * 20,
      desert: 10 + Math.random() * 20,
    };

    // Normalize to 100%
    const total = base.tropical + base.temperate + base.polar + base.desert;
    return {
      tropical: (base.tropical / total) * 100,
      temperate: (base.temperate / total) * 100,
      polar: (base.polar / total) * 100,
      desert: (base.desert / total) * 100,
    };
  }

  private generateResourceAbundance(): Map<string, number> {
    const resources = new Map<string, number>();

    resources.set('water', 1e12 * (this.planetaryStats?.oceanArea ?? 3e8) / 5e8);
    resources.set('metals', 1e10 + Math.random() * 1e10);
    resources.set('rare_earths', 1e8 + Math.random() * 1e9);
    resources.set('fossil_fuels', 1e9 + Math.random() * 1e10);
    resources.set('geothermal_energy', 1e8 + Math.random() * 1e9);

    return resources;
  }

  private generateNamedFeatures(): void {
    const continentNames = [
      'Primordis', 'Australar', 'Nordica', 'Meridian', 'Pangaea Minor',
      'Zenith Land', 'Oceania Prime', 'Arcturus'
    ];

    const oceanNames = [
      'Vast Deep', 'Tranquil Sea', 'Storm Ocean', 'Midnight Waters',
      'Crystal Basin', 'Tempest Sea'
    ];

    // Generate continents
    for (let i = 0; i < this.planetaryStats.continentCount; i++) {
      this.namedFeatures.push({
        id: `${this.id}_continent_${i}`,
        name: continentNames[i % continentNames.length],
        type: 'continent',
        location: {
          lat: (Math.random() - 0.5) * 180,
          lon: (Math.random() - 0.5) * 360,
        },
      });
    }

    // Generate oceans
    const oceanCount = Math.min(4, Math.floor(this.planetaryStats.oceanArea / 1e8));
    for (let i = 0; i < oceanCount; i++) {
      this.namedFeatures.push({
        id: `${this.id}_ocean_${i}`,
        name: oceanNames[i % oceanNames.length],
        type: 'ocean',
        location: {
          lat: (Math.random() - 0.5) * 180,
          lon: (Math.random() - 0.5) * 360,
        },
      });
    }

    // Generate notable mountain ranges
    const mountainCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < mountainCount; i++) {
      this.namedFeatures.push({
        id: `${this.id}_mountain_${i}`,
        name: `${['Sky', 'Storm', 'Frost', 'Fire', 'Cloud'][i % 5]} Peaks`,
        type: 'mountain_range',
        location: {
          lat: (Math.random() - 0.5) * 180,
          lon: (Math.random() - 0.5) * 360,
        },
      });
    }
  }

  private generateMajorCivilizations(): void {
    const civCount = Math.min(5, this.civilizationStats.nationCount);
    const civNames = [
      'United Nations', 'Empire of Dawn', 'Federal Coalition',
      'Republic of Progress', 'Confederacy of Stars'
    ];

    for (let i = 0; i < civCount; i++) {
      const popShare = this.population.total / civCount;
      this.majorCivilizations.push({
        id: `${this.id}_civ_${i}`,
        name: civNames[i % civNames.length],
        population: Math.floor(popShare * (0.8 + Math.random() * 0.4)),
        capital: {
          lat: (Math.random() - 0.5) * 180,
          lon: (Math.random() - 0.5) * 360,
        },
        techLevel: this.civilizationStats.avgTechLevel + Math.floor(Math.random() * 3) - 1,
        culturalIdentity: ['Democratic', 'Authoritarian', 'Technocratic', 'Theocratic'][i % 4],
        activeWars: [],
      });
    }
  }

  protected updateAbstract(deltaTime: number): void {
    super.updateAbstract(deltaTime);

    // Update civilization development
    this.civilizationStats.avgTechLevel = this.tech.level;
    this.civilizationStats.urbanization += 0.001 * deltaTime * this.tech.level;
    this.civilizationStats.urbanization = Math.min(1.0, this.civilizationStats.urbanization);

    this.civilizationStats.industrialization = this.tech.level;

    // Check for planetary unification
    if (this.civilizationStats.nationCount > 1 && this.tech.level >= 8) {
      if (Math.random() < 0.01 * deltaTime) {
        this.civilizationStats.nationCount = Math.max(1, this.civilizationStats.nationCount - 1);
        if (this.civilizationStats.nationCount === 1) {
          this.civilizationStats.governmentType = 'unified';
        }
      }
    }

    // Update civilization populations
    for (const civ of this.majorCivilizations) {
      civ.techLevel = this.civilizationStats.avgTechLevel + Math.floor(Math.random() * 3) - 1;
      civ.techLevel = Math.max(0, Math.min(10, civ.techLevel));
    }

    // Megastructure construction
    if (this.tech.level >= 9 && this.megastructures.length === 0) {
      if (Math.random() < 0.001 * deltaTime) {
        this.megastructures.push({
          id: `${this.id}_megastructure_0`,
          type: 'space_elevator',
          location: { lat: 0, lon: 0 },
          constructionProgress: 0.1,
          operational: false,
        });
      }
    }

    // Progress megastructure construction
    for (const megastructure of this.megastructures) {
      if (!megastructure.operational) {
        megastructure.constructionProgress += 0.01 * deltaTime;
        if (megastructure.constructionProgress >= 1.0) {
          megastructure.operational = true;
        }
      }
    }
  }

  toJSON(): any {
    return {
      ...super.toJSON(),
      planetaryStats: this.planetaryStats,
      civilizationStats: this.civilizationStats,
      namedFeatures: this.namedFeatures,
      majorCivilizations: this.majorCivilizations,
      megastructures: this.megastructures,
    };
  }
}
