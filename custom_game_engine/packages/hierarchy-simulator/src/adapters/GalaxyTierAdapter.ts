/**
 * GalaxyTierAdapter - Converts collections of AbstractSector instances to AbstractGalaxy tiers
 *
 * Aggregates sector data and creates galaxy-level statistics and civilizations.
 */

import { AbstractGalaxy } from '../abstraction/AbstractGalaxy.js';
import type { AbstractSector } from '../abstraction/AbstractSector.js';

export interface GalaxyConfig {
  id: string;
  name: string;
  address: { gigasegment: number };
  galaxyType: 'spiral' | 'elliptical' | 'irregular' | 'ring';
}

export class GalaxyTierAdapter {
  /**
   * Convert an array of AbstractSector instances into an AbstractGalaxy tier
   */
  static convertSectorsToGalaxyTier(sectors: AbstractSector[], config: GalaxyConfig): AbstractGalaxy {
    if (!sectors) throw new Error('sectors parameter is required');
    if (!Array.isArray(sectors) || sectors.length === 0) throw new Error('sectors array cannot be empty');

    const galaxy = new AbstractGalaxy(config.id, config.name, config.address);

    // Set galaxy type from config
    galaxy.structure.type = config.galaxyType;

    // Aggregate population across all sectors
    const totalPopulation = sectors.reduce((sum, s) => sum + s.population.total, 0);
    galaxy.population.total = totalPopulation;

    // Calculate max tech level
    const maxTechLevel = Math.max(...sectors.map(s => s.tech.level));
    galaxy.tech.level = maxTechLevel;

    // Update galactic stats
    galaxy.galacticStats.totalPopulation = totalPopulation;
    galaxy.galacticStats.maxTechLevel = maxTechLevel;

    // Count total systems from all sectors
    const totalSystems = sectors.reduce((sum, s) => sum + s.children.length, 0);
    galaxy.galacticStats.colonizedSystems = totalSystems;

    // Generate galactic civilizations from advanced sectors
    const advancedSectors = sectors.filter(s => s.tech.level >= 9);
    const civTypes: Array<'kardashev_ii' | 'kardashev_iii' | 'transcendent' | 'ai_collective' | 'hive_overmind'> = [
      'kardashev_ii', 'kardashev_iii', 'transcendent', 'ai_collective', 'hive_overmind',
    ];

    if (advancedSectors.length > 0) {
      // Group sectors into civilizations (up to 5)
      const civCount = Math.min(5, Math.ceil(advancedSectors.length / 20));
      for (let i = 0; i < civCount; i++) {
        const civSectors = advancedSectors.slice(
          Math.floor(i * advancedSectors.length / civCount),
          Math.floor((i + 1) * advancedSectors.length / civCount)
        );
        const civPop = civSectors.reduce((sum, s) => sum + s.population.total, 0);
        const civTech = Math.max(...civSectors.map(s => s.tech.level));
        const kardashevLevel = 2.0 + (civTech - 9) * 0.3;

        galaxy.galacticCivilizations.push({
          id: `${config.id}_civ_${i}`,
          name: `Civilization ${i + 1}`,
          type: civTypes[Math.min(i, civTypes.length - 1)]!,
          controlledSectors: civSectors.map(s => s.id),
          population: civPop,
          techLevel: civTech,
          kardashevLevel,
          energyOutput: civPop * 1e-9,
          dysonSpheres: civTech >= 11 ? Math.floor((civTech - 10) * 2) : 0,
          megastructures: civTech >= 11 ? [{
            id: `${config.id}_civ_${i}_dyson_0`,
            type: 'dyson_sphere',
            location: civSectors[0]?.id ?? 'unknown',
            operational: true,
          }] : [],
        });
      }
    }

    // Update active civilizations count
    galaxy.galacticStats.activeCivilizations = galaxy.galacticCivilizations.length;

    // Calculate average Kardashev level
    if (galaxy.galacticCivilizations.length > 0) {
      galaxy.galacticStats.avgKardashevLevel = galaxy.galacticCivilizations.reduce(
        (sum, c) => sum + c.kardashevLevel, 0
      ) / galaxy.galacticCivilizations.length;
    }

    // Establish galactic governance if enough civilizations
    if (galaxy.galacticCivilizations.length >= 3) {
      galaxy.governance = {
        type: 'galactic_council',
        founded: 0,
        memberCivilizations: galaxy.galacticCivilizations.map(c => c.id),
        laws: ['No Extinction Events', 'Free Passage', 'Technology Sharing'],
        enforcement: 0.7,
      };
    }

    // Add all sectors as children
    for (const sector of sectors) {
      galaxy.addChild(sector);
    }

    return galaxy;
  }

  /**
   * Get all megastructures across all civilizations in a galaxy
   */
  static getAllMegastructures(galaxy: AbstractGalaxy): Array<{
    id: string;
    type: string;
    location: string;
    operational: boolean;
  }> {
    return galaxy.galacticCivilizations.flatMap(civ => civ.megastructures);
  }

  /**
   * Get a resource summary for a galaxy
   */
  static getGalaxyResources(galaxy: AbstractGalaxy): {
    totalPopulation: number;
    totalSectors: number;
    totalSystems: number;
    maxTechLevel: number;
    activeCivilizations: number;
    avgKardashevLevel: number;
  } {
    const totalSystems = galaxy.children.reduce((sum, sector) => sum + sector.children.length, 0);
    const avgKardashev = galaxy.galacticCivilizations.length > 0
      ? galaxy.galacticCivilizations.reduce((sum, c) => sum + c.kardashevLevel, 0) / galaxy.galacticCivilizations.length
      : 0;

    return {
      totalPopulation: galaxy.population.total,
      totalSectors: galaxy.children.length,
      totalSystems,
      maxTechLevel: galaxy.galacticStats.maxTechLevel,
      activeCivilizations: galaxy.galacticStats.activeCivilizations,
      avgKardashevLevel: avgKardashev,
    };
  }
}
