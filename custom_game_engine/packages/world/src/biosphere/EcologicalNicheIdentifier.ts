/**
 * EcologicalNicheIdentifier - Analyzes planets to identify available ecological niches
 *
 * Creates a realistic trophic pyramid and habitat structure based on planet conditions.
 */

import type { PlanetConfig } from '../planet/PlanetTypes.js';
import type { BiomeType } from '../chunks/Tile.js';
import type {
  EcologicalNiche,
  PlanetConditions,
  EnergySource,
  VerticalZone,
  SizeClass,
} from './BiosphereTypes.js';

export class EcologicalNicheIdentifier {
  /**
   * Analyze planet conditions
   */
  analyzePlanet(planet: PlanetConfig): PlanetConditions {
    const hasWater = planet.allowedBiomes.some(b =>
      b === 'ocean' || b === 'river' || b === 'wetland'
    );
    const hasLand = planet.allowedBiomes.some(b =>
      b !== 'ocean'
    );

    // Determine if planet has a star (not rogue)
    const hasStar = !planet.isStarless;

    // Volcanic activity from planet type or features
    const volcanicActivity = planet.type === 'volcanic' ||
      planet.hasLavaFlows ||
      planet.type === 'moon';  // Tidally heated

    // Determine energy sources
    const energySources: EnergySource[] = [];
    if (hasStar) energySources.push('photosynthesis');
    if (volcanicActivity) energySources.push('chemosynthesis');
    // If neither, ecosystem relies on imported energy (rare)

    // Temperature range estimate
    const baseTemp = planet.temperatureOffset * 50;  // -50 to +50C base
    const tempVariation = planet.temperatureScale * 30;  // Variation range
    const temperatureRange: [number, number] = [
      baseTemp - tempVariation,
      baseTemp + tempVariation
    ];

    // Pressure from atmosphere
    const pressure = planet.atmosphereDensity ?? 1.0;
    const pressureRange: [number, number] = [pressure * 0.8, pressure * 1.2];

    return {
      hasStar,
      volcanicActivity,
      energySources,
      gravity: planet.gravity ?? 1.0,
      atmosphereDensity: planet.atmosphereDensity ?? 1.0,
      hasAtmosphere: (planet.atmosphereDensity ?? 1.0) > 0.01,
      atmosphereType: planet.atmosphereType ?? 'nitrogen_oxygen',
      temperatureRange,
      pressureRange,
      hasWater,
      hasLand,
      biomeCount: planet.allowedBiomes.length,
      dominantBiomes: planet.allowedBiomes.slice(0, 3),
      tidallyLocked: planet.isTidallyLocked ?? false,
      rogue: planet.isStarless ?? false,
      dayLength: planet.dayLengthHours ?? 24,
    };
  }

  /**
   * Generate ecological niches for a planet
   */
  identifyNiches(planet: PlanetConfig): EcologicalNiche[] {
    const conditions = this.analyzePlanet(planet);
    const niches: EcologicalNiche[] = [];

    // Step 1: Create producer niches (base of food web)
    niches.push(...this.createProducerNiches(planet, conditions));

    // Step 2: Create herbivore niches (primary consumers)
    if (niches.length > 0) {  // Only if producers exist
      niches.push(...this.createHerbivoreNiches(planet, conditions));
    }

    // Step 3: Create carnivore niches (secondary/tertiary consumers)
    if (niches.filter(n => n.category === 'herbivore').length > 0) {
      niches.push(...this.createCarnivoreNiches(planet, conditions));
    }

    // Step 4: Create decomposer niches (nutrient recyclers)
    niches.push(...this.createDecomposerNiches(planet, conditions));

    // Step 5: Create specialized niches (parasites, scavengers)
    if (niches.length > 5) {  // Only on complex biospheres
      niches.push(...this.createSpecializedNiches(planet, conditions));
    }

    return niches;
  }

  /**
   * Create producer (photosynthetic/chemosynthetic) niches
   */
  private createProducerNiches(planet: PlanetConfig, conditions: PlanetConditions): EcologicalNiche[] {
    const niches: EcologicalNiche[] = [];

    // Photosynthetic producers (if star present)
    if (conditions.energySources.includes('photosynthesis')) {
      // Land producers
      if (conditions.hasLand) {
        const landBiomes = planet.allowedBiomes.filter(b => b !== 'ocean');

        niches.push({
          id: 'producer_photosynthetic_land',
          name: 'Land Photosynthesizers',
          category: 'producer',
          energySource: 'photosynthesis',
          habitat: {
            biomes: landBiomes,
            verticalZone: 'surface',
            activityPattern: 'diurnal',
          },
          sizeClass: this.getMaxSizeForGravity(conditions.gravity, 'small'),
          constraints: {
            requiredGravityRange: [0.1, 3.0],
            requiredAtmosphere: this.getBreathableAtmospheres(planet),
            requiredTemperatureRange: [-20, 50],
          },
          expectedSpeciesCount: Math.min(landBiomes.length * 2, 12),
          sapientPossible: false,
        });
      }

      // Aquatic producers
      if (conditions.hasWater) {
        niches.push({
          id: 'producer_photosynthetic_aquatic',
          name: 'Aquatic Photosynthesizers',
          category: 'producer',
          energySource: 'photosynthesis',
          habitat: {
            biomes: ['ocean', 'river', 'wetland'],
            verticalZone: 'aquatic_surface',
            activityPattern: 'diurnal',
          },
          sizeClass: 'microscopic',
          constraints: {
            requiredTemperatureRange: [-2, 40],
          },
          expectedSpeciesCount: 8,
          sapientPossible: false,
        });
      }
    }

    // Chemosynthetic producers (volcanic vents, underground)
    if (conditions.energySources.includes('chemosynthesis')) {
      niches.push({
        id: 'producer_chemosynthetic',
        name: 'Chemosynthetic Organisms',
        category: 'producer',
        energySource: 'chemosynthesis',
        habitat: {
          biomes: planet.allowedBiomes,
          verticalZone: 'burrowing',
          activityPattern: 'continuous',
        },
        sizeClass: 'tiny',
        constraints: {
          requiredTemperatureRange: [-10, 120],  // Can handle extreme heat
        },
        expectedSpeciesCount: 5,
        sapientPossible: false,
      });
    }

    return niches;
  }

  /**
   * Create herbivore (primary consumer) niches
   */
  private createHerbivoreNiches(planet: PlanetConfig, conditions: PlanetConditions): EcologicalNiche[] {
    const niches: EcologicalNiche[] = [];

    const verticalZones: VerticalZone[] = ['surface'];
    if (conditions.hasAtmosphere && conditions.atmosphereDensity > 0.5) {
      verticalZones.push('aerial');
    }
    if (conditions.hasWater) {
      verticalZones.push('aquatic_surface', 'aquatic_mid');
    }

    for (const zone of verticalZones) {
      const biomes = this.getBiomesForZone(planet, zone);
      if (biomes.length === 0) continue;

      const maxSize = this.getMaxSizeForGravity(conditions.gravity, 'large');

      niches.push({
        id: `herbivore_grazer_${zone}`,
        name: `${zone.replace(/_/g, ' ')} Grazers`,
        category: 'herbivore',
        energySource: 'herbivory',
        habitat: {
          biomes,
          verticalZone: zone,
          activityPattern: zone === 'aerial' ? 'diurnal' : 'continuous',
        },
        sizeClass: maxSize,
        constraints: {
          requiredGravityRange: [0.1, 3.0],
        },
        expectedSpeciesCount: Math.min(biomes.length + 2, 6),
        sapientPossible: zone === 'surface',  // Surface herbivores can become sapient
      });
    }

    return niches;
  }

  /**
   * Create carnivore (secondary/tertiary consumer) niches
   */
  private createCarnivoreNiches(planet: PlanetConfig, conditions: PlanetConditions): EcologicalNiche[] {
    const niches: EcologicalNiche[] = [];

    const zones: VerticalZone[] = ['surface'];
    if (conditions.hasAtmosphere) {
      zones.push('aerial');
    }
    if (conditions.hasWater) {
      zones.push('aquatic_mid', 'aquatic_deep');
    }

    for (const zone of zones) {
      const biomes = this.getBiomesForZone(planet, zone);
      if (biomes.length === 0) continue;

      // Small predators
      niches.push({
        id: `carnivore_small_${zone}`,
        name: `${zone.replace(/_/g, ' ')} Small Predators`,
        category: 'carnivore',
        energySource: 'predation',
        habitat: {
          biomes,
          verticalZone: zone,
          activityPattern: 'continuous',
        },
        sizeClass: 'small',
        constraints: {},
        expectedSpeciesCount: Math.min(biomes.length, 4),
        sapientPossible: true,  // Small pack hunters can become sapient
      });

      // Large apex predators (fewer species)
      const maxSize = this.getMaxSizeForGravity(conditions.gravity, 'large');
      niches.push({
        id: `carnivore_apex_${zone}`,
        name: `${zone.replace(/_/g, ' ')} Apex Predators`,
        category: 'carnivore',
        energySource: 'predation',
        habitat: {
          biomes,
          verticalZone: zone,
          activityPattern: zone === 'aquatic_deep' ? 'continuous' : 'crepuscular',
        },
        sizeClass: maxSize,
        constraints: {},
        expectedSpeciesCount: 2,  // Few apex predators
        sapientPossible: true,  // Apex predators can become sapient
      });
    }

    return niches;
  }

  /**
   * Create decomposer niches
   */
  private createDecomposerNiches(planet: PlanetConfig, conditions: PlanetConditions): EcologicalNiche[] {
    return [{
      id: 'decomposer_general',
      name: 'Decomposers',
      category: 'decomposer',
      energySource: 'scavenging',
      habitat: {
        biomes: planet.allowedBiomes,
        verticalZone: 'surface',
        activityPattern: 'continuous',
      },
      sizeClass: 'tiny',
      constraints: {},
      expectedSpeciesCount: 3,
      sapientPossible: false,
    }];
  }

  /**
   * Create specialized niches (parasites, scavengers)
   */
  private createSpecializedNiches(planet: PlanetConfig, conditions: PlanetConditions): EcologicalNiche[] {
    const niches: EcologicalNiche[] = [];

    // Scavengers
    niches.push({
      id: 'scavenger_opportunist',
      name: 'Opportunistic Scavengers',
      category: 'omnivore',
      energySource: 'scavenging',
      habitat: {
        biomes: planet.allowedBiomes,
        verticalZone: 'surface',
        activityPattern: 'continuous',
      },
      sizeClass: 'medium',
      constraints: {},
      expectedSpeciesCount: 2,
      sapientPossible: true,  // Scavengers can become sapient (like early humans)
    });

    // Parasites
    niches.push({
      id: 'parasite_host_dependent',
      name: 'Parasitic Organisms',
      category: 'parasite',
      energySource: 'parasitism',
      habitat: {
        biomes: planet.allowedBiomes,
        verticalZone: 'surface',
        activityPattern: 'continuous',
      },
      sizeClass: 'tiny',
      constraints: {},
      expectedSpeciesCount: 3,
      sapientPossible: false,
    });

    return niches;
  }

  /**
   * Get max size class based on gravity
   */
  private getMaxSizeForGravity(gravity: number, defaultSize: SizeClass): SizeClass {
    if (gravity > 2.0) return 'small';      // High gravity limits size
    if (gravity > 1.5) return 'medium';
    if (gravity < 0.5) return 'megafauna';  // Low gravity allows huge creatures
    return defaultSize;
  }

  /**
   * Get biomes suitable for vertical zone
   */
  private getBiomesForZone(planet: PlanetConfig, zone: VerticalZone): BiomeType[] {
    if (zone === 'aquatic_surface' || zone === 'aquatic_mid' || zone === 'aquatic_deep') {
      return planet.allowedBiomes.filter(b => b === 'ocean' || b === 'river' || b === 'wetland');
    }
    if (zone === 'aerial') {
      return planet.allowedBiomes.filter(b => b !== 'ocean');  // Can fly over land
    }
    return planet.allowedBiomes.filter(b => b !== 'ocean');  // Land biomes
  }

  /**
   * Get breathable atmosphere types
   */
  private getBreathableAtmospheres(planet: PlanetConfig): string[] {
    const atmos = planet.atmosphereType ?? 'nitrogen_oxygen';
    if (atmos === 'nitrogen_oxygen') return ['oxygen'];
    if (atmos === 'hydrogen') return ['hydrogen'];
    if (atmos === 'methane') return ['methane'];
    return [];
  }
}
