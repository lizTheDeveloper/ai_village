/**
 * Biosphere Generation - Type Definitions
 *
 * Types for procedurally generating ecologically coherent alien biospheres.
 */

import type { BiomeType } from '../chunks/Tile.js';
import type { PlanetConfig } from '../planet/PlanetTypes.js';
import type { GeneratedAlienSpecies } from '../alien-generation/AlienSpeciesGenerator.js';

// ============================================================================
// Ecological Niches
// ============================================================================

export type NicheCategory =
  | 'producer'      // Photosynthetic/chemosynthetic organisms
  | 'herbivore'     // Primary consumers
  | 'carnivore'     // Secondary/tertiary consumers
  | 'omnivore'      // Mixed diet
  | 'decomposer'    // Nutrient recyclers
  | 'parasite';     // Parasitic organisms

export type EnergySource =
  | 'photosynthesis'    // Light-based energy
  | 'chemosynthesis'    // Chemical energy (volcanic vents, etc.)
  | 'herbivory'         // Eating plants/producers
  | 'predation'         // Hunting other animals
  | 'scavenging'        // Eating dead matter
  | 'parasitism';       // Feeding on host

export type VerticalZone =
  | 'aerial'            // Flying/floating in atmosphere
  | 'canopy'            // Tree tops
  | 'surface'           // Ground level
  | 'burrowing'         // Underground
  | 'aquatic_surface'   // Water surface
  | 'aquatic_mid'       // Mid-water column
  | 'aquatic_deep';     // Deep water/ocean floor

export type ActivityPattern =
  | 'diurnal'       // Day active
  | 'nocturnal'     // Night active
  | 'crepuscular'   // Dawn/dusk active
  | 'continuous';   // Always active

export type SizeClass =
  | 'microscopic'   // < 1g (plankton, microbes)
  | 'tiny'          // 1g - 100g (insects, small fish)
  | 'small'         // 100g - 10kg (rabbits, cats)
  | 'medium'        // 10kg - 100kg (humans, wolves)
  | 'large'         // 100kg - 1000kg (bears, horses)
  | 'megafauna';    // > 1000kg (elephants, whales)

export interface EcologicalNiche {
  id: string;
  name: string;
  category: NicheCategory;
  energySource: EnergySource;

  habitat: {
    biomes: BiomeType[];
    verticalZone: VerticalZone;
    activityPattern: ActivityPattern;
  };

  sizeClass: SizeClass;

  // Constraints from planet conditions
  constraints: {
    requiredGravityRange?: [number, number];
    requiredAtmosphere?: string[];
    requiredTemperatureRange?: [number, number];
    requiredPressureRange?: [number, number];
  };

  // How many species typically fill this niche
  expectedSpeciesCount: number;

  // Can sapient species emerge in this niche?
  sapientPossible: boolean;
}

// ============================================================================
// Food Web
// ============================================================================

export interface FoodWeb {
  [speciesId: string]: {
    preys: string[];          // Species this one eats
    predators: string[];      // Species that eat this one
    competitors: string[];    // Species in same niche
    mutualists: string[];     // Symbiotic relationships
  };
}

// ============================================================================
// Biosphere Data
// ============================================================================

export interface BiosphereData {
  $schema: 'https://aivillage.dev/schemas/biosphere/v1';

  // Planet this biosphere belongs to
  planet: PlanetConfig;

  // Identified ecological niches
  niches: EcologicalNiche[];

  // Generated species
  species: GeneratedAlienSpecies[];

  // Food web relationships
  foodWeb: FoodWeb;

  // Niche filling (which species fill which niches)
  nicheFilling: Record<string, string[]>;  // nicheId → [speciesIds]

  // Sapient species (potential civilizations)
  sapientSpecies: GeneratedAlienSpecies[];

  // Art style for this planet's sprites
  artStyle: string;

  // Generation metadata
  metadata: {
    generatedAt: number;
    generationTimeMs: number;
    totalSpecies: number;
    sapientCount: number;
    trophicLevels: number;
    averageSpeciesPerNiche: number;
  };
}

// ============================================================================
// Trophic Levels
// ============================================================================

export interface TrophicLevel {
  level: number;  // 1 = producers, 2 = herbivores, 3 = carnivores, etc.
  biomass: number;  // Relative biomass at this level
  speciesCount: number;
  species: string[];  // Species IDs
}

// ============================================================================
// Planet Conditions Analysis
// ============================================================================

export interface PlanetConditions {
  // Energy availability
  hasStar: boolean;  // Can support photosynthesis
  volcanicActivity: boolean;  // Can support chemosynthesis
  energySources: EnergySource[];

  // Physical constraints
  gravity: number;  // Affects max size
  atmosphereDensity: number;  // Affects flight, sound
  hasAtmosphere: boolean;
  atmosphereType: string;

  // Environmental ranges
  temperatureRange: [number, number];  // Min/max in celsius
  pressureRange: [number, number];  // Min/max in atmospheres

  // Habitat availability
  hasWater: boolean;
  hasLand: boolean;
  biomeCount: number;
  dominantBiomes: BiomeType[];

  // Special conditions
  tidallyLocked: boolean;
  rogue: boolean;  // Starless
  dayLength: number;  // Hours
}
