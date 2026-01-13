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
 * All aquatic species definitions
 */
export const AQUATIC_SPECIES: Record<string, AquaticSpecies> = {
  // ============================================================================
  // EPIPELAGIC ZONE (0 to -200m) - Sunlight Zone
  // ============================================================================

  kelp: {
    id: 'kelp',
    name: 'Giant Kelp',
    category: 'wild',
    temperament: 'docile',
    diet: 'herbivore', // Photosynthetic, but using herbivore as closest
    socialStructure: 'solitary',
    activityPattern: 'diurnal',

    canBeTamed: false,
    canBeRidden: false,
    canBeWorking: false,
    canBePet: false,

    infantDuration: 7,
    juvenileDuration: 30,
    adultDuration: 365 * 5,
    maxAge: 365 * 10,

    baseSize: 3.0, // Can grow to 60m tall
    baseSpeed: 0, // Sessile

    hungerRate: 0, // Photosynthetic
    thirstRate: 0,
    energyRate: 0,

    tameDifficulty: 100,
    preferredFood: [],

    intelligence: 0.01, // Plant-like

    minComfortTemp: 5,
    maxComfortTemp: 20,

    spawnBiomes: ['ocean'],
    spawnDensity: 0.4,

    // Aquatic properties
    depthRange: { min: 0, max: -40 },
    oceanZones: ['epipelagic'],
    pressureAdaptation: 5, // 50m max
    locomotion: 'sessile',
    oxygenSource: 'chemosynthetic', // Produces oxygen
    salinityTolerance: { min: 0.03, max: 0.04 },
  },

  sea_otter: {
    id: 'sea_otter',
    name: 'Sea Otter',
    category: 'wild',
    temperament: 'neutral',
    diet: 'carnivore',
    socialStructure: 'pair',
    activityPattern: 'diurnal',

    canBeTamed: false,
    canBeRidden: false,
    canBeWorking: false,
    canBePet: false,

    infantDuration: 60,
    juvenileDuration: 180,
    adultDuration: 365 * 5,
    maxAge: 365 * 15,

    baseSize: 1.2,
    baseSpeed: 3.0,

    hungerRate: 0.08, // High metabolism
    thirstRate: 0.02,
    energyRate: 0.03,

    tameDifficulty: 70,
    preferredFood: ['shellfish', 'urchin', 'crab'],

    intelligence: 0.65, // Tool user

    minComfortTemp: 0,
    maxComfortTemp: 20,

    spawnBiomes: ['ocean', 'kelp_forest'],
    spawnDensity: 0.05,

    // Aquatic properties
    depthRange: { min: 0, max: -40 },
    oceanZones: ['epipelagic'],
    pressureAdaptation: 5,
    locomotion: 'swimming',
    oxygenSource: 'air_breathing',
    salinityTolerance: { min: 0.03, max: 0.04 },
  },

  clownfish: {
    id: 'clownfish',
    name: 'Clownfish',
    category: 'wild',
    temperament: 'neutral',
    diet: 'omnivore',
    socialStructure: 'pair',
    activityPattern: 'diurnal',

    canBeTamed: false,
    canBeRidden: false,
    canBeWorking: false,
    canBePet: true,

    infantDuration: 7,
    juvenileDuration: 30,
    adultDuration: 365 * 2,
    maxAge: 365 * 10,

    baseSize: 0.3,
    baseSpeed: 2.0,

    hungerRate: 0.03,
    thirstRate: 0,
    energyRate: 0.02,

    tameDifficulty: 40,
    preferredFood: ['plankton', 'algae'],

    intelligence: 0.3,

    minComfortTemp: 24,
    maxComfortTemp: 28,

    spawnBiomes: ['ocean', 'coral_reef'],
    spawnDensity: 0.3,

    // Aquatic properties
    depthRange: { min: -5, max: -50 },
    oceanZones: ['epipelagic'],
    pressureAdaptation: 6,
    locomotion: 'swimming',
    oxygenSource: 'gills',
    salinityTolerance: { min: 0.032, max: 0.038 },
  },

  // ============================================================================
  // MESOPELAGIC ZONE (-200 to -1000m) - Twilight Zone
  // ============================================================================

  lanternfish: {
    id: 'lanternfish',
    name: 'Lanternfish',
    category: 'wild',
    temperament: 'skittish',
    diet: 'carnivore',
    socialStructure: 'flock',
    activityPattern: 'nocturnal',

    canBeTamed: false,
    canBeRidden: false,
    canBeWorking: false,
    canBePet: false,

    infantDuration: 7,
    juvenileDuration: 30,
    adultDuration: 365,
    maxAge: 365 * 5,

    baseSize: 0.4,
    baseSpeed: 3.0,

    hungerRate: 0.04,
    thirstRate: 0,
    energyRate: 0.03,

    tameDifficulty: 90,
    preferredFood: ['plankton', 'small_fish'],

    intelligence: 0.25,

    minComfortTemp: 3,
    maxComfortTemp: 10,

    spawnBiomes: ['ocean'],
    spawnDensity: 0.6,

    // Aquatic properties
    depthRange: { min: -200, max: -1000 },
    oceanZones: ['mesopelagic'],
    pressureAdaptation: 100,
    locomotion: 'swimming',
    oxygenSource: 'gills',

    bioluminescence: {
      pattern: 'camouflage',
      color: '#00FFFF',
      brightness: 0.4,
      purpose: 'Counter-illumination to hide from predators below',
    },

    verticalMigration: {
      enabled: true,
      dayDepth: -600,
      nightDepth: -50,
    },

    salinityTolerance: { min: 0.034, max: 0.036 },

    schooling: {
      enabled: true,
      minSchoolSize: 50,
      maxSchoolSize: 1000,
    },
  },

  giant_squid: {
    id: 'giant_squid',
    name: 'Giant Squid',
    category: 'wild',
    temperament: 'aggressive',
    diet: 'carnivore',
    socialStructure: 'solitary',
    activityPattern: 'nocturnal',

    canBeTamed: false,
    canBeRidden: false,
    canBeWorking: false,
    canBePet: false,

    infantDuration: 60,
    juvenileDuration: 180,
    adultDuration: 365 * 2,
    maxAge: 365 * 5,

    baseSize: 4.5, // 12-15m long
    baseSpeed: 4.0,

    hungerRate: 0.06,
    thirstRate: 0,
    energyRate: 0.04,

    tameDifficulty: 100,
    preferredFood: ['fish', 'large_fish', 'whale'],

    intelligence: 0.7, // Highly intelligent cephalopod

    minComfortTemp: 2,
    maxComfortTemp: 8,

    spawnBiomes: ['ocean'],
    spawnDensity: 0.001,

    // Aquatic properties
    depthRange: { min: -300, max: -1000 },
    oceanZones: ['mesopelagic'],
    pressureAdaptation: 100,
    locomotion: 'jet_propulsion',
    oxygenSource: 'gills',

    bioluminescence: {
      pattern: 'communication',
      color: '#FF00FF',
      brightness: 0.3,
      purpose: 'Flash patterns to communicate and disorient prey',
    },

    salinityTolerance: { min: 0.034, max: 0.036 },
  },

  // ============================================================================
  // BATHYPELAGIC ZONE (-1000 to -4000m) - Midnight Zone
  // ============================================================================

  anglerfish: {
    id: 'anglerfish',
    name: 'Anglerfish',
    category: 'wild',
    temperament: 'aggressive',
    diet: 'carnivore',
    socialStructure: 'solitary',
    activityPattern: 'nocturnal',

    canBeTamed: false,
    canBeRidden: false,
    canBeWorking: false,
    canBePet: false,

    infantDuration: 30,
    juvenileDuration: 90,
    adultDuration: 365 * 5,
    maxAge: 365 * 20,

    baseSize: 1.0,
    baseSpeed: 1.0, // Slow ambush predator

    hungerRate: 0.01, // Low metabolism
    thirstRate: 0,
    energyRate: 0.005,

    tameDifficulty: 100,
    preferredFood: ['fish', 'small_fish'],

    intelligence: 0.35,

    minComfortTemp: 2,
    maxComfortTemp: 5,

    spawnBiomes: ['ocean'],
    spawnDensity: 0.02,

    // Aquatic properties
    depthRange: { min: -1000, max: -4000 },
    oceanZones: ['bathypelagic'],
    pressureAdaptation: 400,
    locomotion: 'swimming',
    oxygenSource: 'gills',

    bioluminescence: {
      pattern: 'lure',
      color: '#00FF00',
      brightness: 0.8,
      purpose: 'Glowing lure to attract prey in darkness',
    },

    salinityTolerance: { min: 0.034, max: 0.036 },
  },

  vampire_squid: {
    id: 'vampire_squid',
    name: 'Vampire Squid',
    category: 'wild',
    temperament: 'skittish',
    diet: 'omnivore',
    socialStructure: 'solitary',
    activityPattern: 'nocturnal',

    canBeTamed: false,
    canBeRidden: false,
    canBeWorking: false,
    canBePet: false,

    infantDuration: 30,
    juvenileDuration: 60,
    adultDuration: 365 * 3,
    maxAge: 365 * 8,

    baseSize: 0.6,
    baseSpeed: 2.5,

    hungerRate: 0.02,
    thirstRate: 0,
    energyRate: 0.01,

    tameDifficulty: 95,
    preferredFood: ['marine_snow', 'detritus'],

    intelligence: 0.65, // Cephalopod

    minComfortTemp: 2,
    maxComfortTemp: 6,

    spawnBiomes: ['ocean'],
    spawnDensity: 0.05,

    // Aquatic properties
    depthRange: { min: -600, max: -3000 },
    oceanZones: ['mesopelagic', 'bathypelagic'],
    pressureAdaptation: 300,
    locomotion: 'jet_propulsion',
    oxygenSource: 'gills',

    bioluminescence: {
      pattern: 'startle',
      color: '#0066FF',
      brightness: 0.6,
      purpose: 'Bioluminescent clouds to confuse predators',
    },

    salinityTolerance: { min: 0.034, max: 0.036 },
  },

  // ============================================================================
  // ABYSSAL ZONE (-4000 to -6000m) - Deep Ocean Floor
  // ============================================================================

  tripod_fish: {
    id: 'tripod_fish',
    name: 'Tripod Fish',
    category: 'wild',
    temperament: 'neutral',
    diet: 'carnivore',
    socialStructure: 'solitary',
    activityPattern: 'nocturnal',

    canBeTamed: false,
    canBeRidden: false,
    canBeWorking: false,
    canBePet: false,

    infantDuration: 60,
    juvenileDuration: 120,
    adultDuration: 365 * 10,
    maxAge: 365 * 30,

    baseSize: 0.7,
    baseSpeed: 0.5, // Mostly stationary

    hungerRate: 0.005,
    thirstRate: 0,
    energyRate: 0.002,

    tameDifficulty: 100,
    preferredFood: ['plankton', 'detritus'],

    intelligence: 0.2,

    minComfortTemp: 1,
    maxComfortTemp: 4,

    spawnBiomes: ['ocean'],
    spawnDensity: 0.01,

    // Aquatic properties
    depthRange: { min: -4000, max: -6000 },
    oceanZones: ['abyssal'],
    pressureAdaptation: 600,
    locomotion: 'walking', // Uses elongated fins as stilts
    oxygenSource: 'gills',
    salinityTolerance: { min: 0.034, max: 0.036 },
  },

  grenadier_fish: {
    id: 'grenadier_fish',
    name: 'Grenadier Fish',
    category: 'wild',
    temperament: 'neutral',
    diet: 'carnivore',
    socialStructure: 'solitary',
    activityPattern: 'nocturnal',

    canBeTamed: false,
    canBeRidden: false,
    canBeWorking: false,
    canBePet: false,

    infantDuration: 90,
    juvenileDuration: 180,
    adultDuration: 365 * 15,
    maxAge: 365 * 50,

    baseSize: 1.5,
    baseSpeed: 2.0,

    hungerRate: 0.01,
    thirstRate: 0,
    energyRate: 0.005,

    tameDifficulty: 100,
    preferredFood: ['whale_fall', 'carrion', 'fish'],

    intelligence: 0.3,

    minComfortTemp: 1,
    maxComfortTemp: 3,

    spawnBiomes: ['ocean'],
    spawnDensity: 0.03,

    // Aquatic properties
    depthRange: { min: -2000, max: -6000 },
    oceanZones: ['bathypelagic', 'abyssal'],
    pressureAdaptation: 600,
    locomotion: 'swimming',
    oxygenSource: 'gills',
    salinityTolerance: { min: 0.034, max: 0.036 },
  },

  // ============================================================================
  // HADAL ZONE (-6000 to -11000m) - Ocean Trenches
  // ============================================================================

  hadal_snailfish: {
    id: 'hadal_snailfish',
    name: 'Hadal Snailfish',
    category: 'wild',
    temperament: 'docile',
    diet: 'carnivore',
    socialStructure: 'solitary',
    activityPattern: 'nocturnal',

    canBeTamed: false,
    canBeRidden: false,
    canBeWorking: false,
    canBePet: false,

    infantDuration: 60,
    juvenileDuration: 180,
    adultDuration: 365 * 5,
    maxAge: 365 * 15,

    baseSize: 0.5,
    baseSpeed: 1.5,

    hungerRate: 0.003,
    thirstRate: 0,
    energyRate: 0.001,

    tameDifficulty: 100,
    preferredFood: ['amphipod', 'detritus'],

    intelligence: 0.25,

    minComfortTemp: 1,
    maxComfortTemp: 3,

    spawnBiomes: ['ocean'],
    spawnDensity: 0.005,

    // Aquatic properties
    depthRange: { min: -6000, max: -8200 },
    oceanZones: ['hadal'],
    pressureAdaptation: 820, // Deepest known fish
    locomotion: 'swimming',
    oxygenSource: 'gills',
    salinityTolerance: { min: 0.034, max: 0.036 },
  },

  // ============================================================================
  // CHEMOSYNTHETIC SPECIES (Hydrothermal Vents)
  // ============================================================================

  giant_tube_worm: {
    id: 'giant_tube_worm',
    name: 'Giant Tube Worm',
    category: 'wild',
    temperament: 'docile',
    diet: 'herbivore', // Actually chemosynthetic
    socialStructure: 'flock', // Colony
    activityPattern: 'diurnal',

    canBeTamed: false,
    canBeRidden: false,
    canBeWorking: false,
    canBePet: false,

    infantDuration: 30,
    juvenileDuration: 90,
    adultDuration: 365 * 50,
    maxAge: 365 * 250, // Can live 250+ years

    baseSize: 2.0, // 2m long
    baseSpeed: 0, // Sessile

    hungerRate: 0, // Chemosynthetic
    thirstRate: 0,
    energyRate: 0,

    tameDifficulty: 100,
    preferredFood: [],

    intelligence: 0.01,

    minComfortTemp: 2,
    maxComfortTemp: 80, // Can survive near vent heat

    spawnBiomes: ['ocean', 'hydrothermal_vent'],
    spawnDensity: 0.8, // Dense near vents

    // Aquatic properties
    depthRange: { min: -1500, max: -4000 },
    oceanZones: ['bathypelagic', 'abyssal'],
    pressureAdaptation: 400,
    locomotion: 'sessile',
    oxygenSource: 'chemosynthetic',
    chemosynthetic: true,
    salinityTolerance: { min: 0.03, max: 0.04 },
  },

  yeti_crab: {
    id: 'yeti_crab',
    name: 'Yeti Crab',
    category: 'wild',
    temperament: 'neutral',
    diet: 'omnivore',
    socialStructure: 'flock',
    activityPattern: 'nocturnal',

    canBeTamed: false,
    canBeRidden: false,
    canBeWorking: false,
    canBePet: false,

    infantDuration: 30,
    juvenileDuration: 60,
    adultDuration: 365 * 5,
    maxAge: 365 * 15,

    baseSize: 0.4,
    baseSpeed: 1.5,

    hungerRate: 0.01,
    thirstRate: 0,
    energyRate: 0.005,

    tameDifficulty: 100,
    preferredFood: ['bacteria', 'algae'],

    intelligence: 0.3,

    minComfortTemp: 2,
    maxComfortTemp: 40,

    spawnBiomes: ['ocean', 'hydrothermal_vent'],
    spawnDensity: 0.2,

    // Aquatic properties
    depthRange: { min: -2000, max: -3000 },
    oceanZones: ['bathypelagic'],
    pressureAdaptation: 300,
    locomotion: 'crawling',
    oxygenSource: 'gills',
    chemosynthetic: true,
    salinityTolerance: { min: 0.03, max: 0.04 },
  },
};

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
