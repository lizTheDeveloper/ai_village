/**
 * Aquatic Species Data Definitions
 * Extends AnimalSpecies with ocean-specific properties for underwater life
 */

import type { AnimalSpecies, BioluminescentPattern } from '@ai-village/core';
import type { OceanBiomeZone } from './OceanBiomes.js';

/**
 * Locomotion types for aquatic creatures
 */
export type AquaticLocomotion =
  | 'swimming' // Fish-like swimming
  | 'jet_propulsion' // Squid, octopus
  | 'crawling' // Crabs, lobsters
  | 'sessile' // Attached to substrate (coral, sponges, tube worms)
  | 'drifting' // Plankton, jellyfish
  | 'walking'; // Some deep-sea fish use fins to walk

/**
 * Oxygen extraction method
 */
export type OxygenSource =
  | 'gills' // Most fish
  | 'skin' // Some amphibians, eels
  | 'spiracles' // Some rays
  | 'chemosynthetic' // Bacteria, tube worms (no oxygen needed)
  | 'air_breathing'; // Marine mammals, sea turtles

/**
 * Extended species interface for aquatic creatures
 */
export interface AquaticSpecies extends AnimalSpecies {
  // Ocean-specific properties

  /** Depth range where this species lives (meters, negative values) */
  depthRange: {
    min: number; // Shallowest depth (e.g., -10)
    max: number; // Deepest depth (e.g., -200)
  };

  /** Ocean zones where this species can be found */
  oceanZones: OceanBiomeZone[];

  /** Maximum pressure tolerance in atmospheres */
  pressureAdaptation: number;

  /** Locomotion method */
  locomotion: AquaticLocomotion;

  /** How the creature extracts oxygen */
  oxygenSource: OxygenSource;

  /** Bioluminescence properties (if any) */
  bioluminescence?: {
    pattern: BioluminescentPattern;
    color: string; // Hex color
    brightness: number; // 0-1
    purpose: string; // Description
  };

  /** Whether this species participates in vertical migration */
  verticalMigration?: {
    enabled: boolean;
    dayDepth: number; // Depth during day
    nightDepth: number; // Depth at night
  };

  /** Salinity tolerance (0-1, where 0.035 = normal seawater) */
  salinityTolerance: {
    min: number;
    max: number;
  };

  /** Can survive in chemosynthetic ecosystems (hydrothermal vents) */
  chemosynthetic?: boolean;

  /** Schooling behavior */
  schooling?: {
    enabled: boolean;
    minSchoolSize: number;
    maxSchoolSize: number;
  };
}

/**
 * Import aquatic species data from JSON
 */
import aquaticSpeciesData from '../../data/aquatic-species.json';

/**
 * All aquatic species definitions
 */
export const AQUATIC_SPECIES = aquaticSpeciesData.species as Record<string, AquaticSpecies>;

/**
 * Get aquatic species data by ID
 * Per CLAUDE.md: Throw if species not found (no silent fallback)
 */
export function getAquaticSpecies(speciesId: string): AquaticSpecies {
  const species = AQUATIC_SPECIES[speciesId];
  if (!species) {
    throw new Error(`Unknown aquatic species: ${speciesId}`);
  }
  return species;
}

/**
 * Get all species that can spawn in a given ocean zone
 */
export function getSpeciesForOceanZone(zone: OceanBiomeZone): AquaticSpecies[] {
  return Object.values(AQUATIC_SPECIES).filter(species =>
    species.oceanZones.includes(zone)
  );
}

/**
 * Get all species that can spawn at a specific depth
 */
export function getSpeciesAtDepth(depth: number): AquaticSpecies[] {
  return Object.values(AQUATIC_SPECIES).filter(
    species => depth >= species.depthRange.min && depth <= species.depthRange.max
  );
}

/**
 * Check if species has bioluminescence
 */
export function isBioluminescent(species: AquaticSpecies): boolean {
  return species.bioluminescence !== undefined;
}

/**
 * Get all bioluminescent species
 */
export function getBioluminescentSpecies(): AquaticSpecies[] {
  return Object.values(AQUATIC_SPECIES).filter(isBioluminescent);
}

/**
 * Get all chemosynthetic species (hydrothermal vent dwellers)
 */
export function getChemossyntheticSpecies(): AquaticSpecies[] {
  return Object.values(AQUATIC_SPECIES).filter(species => species.chemosynthetic === true);
}
