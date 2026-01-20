/**
 * Species-Specific Building Definitions
 *
 * Buildings generated for four fantasy species:
 * - Elven: Organic, nature-integrated architecture
 * - Centaur: Open spaces, quadrupedal accessibility
 * - Angelic: Vertical, divine light, sacred geometry
 * - High Fae (10D): Non-euclidean, impossible geometry
 */

import type { BuildingBlueprint } from './BuildingBlueprintRegistry.js';
import buildingsDataRaw from '../../data/buildings.json';

const buildingsData = buildingsDataRaw as { buildings: BuildingBlueprint[] };

/**
 * Get building by ID (throws if not found)
 */
function getBuilding(id: string): BuildingBlueprint {
  const building = buildingsData.buildings.find(b => b.id === id);
  if (!building) {
    throw new Error(`Building not found: ${id}`);
  }
  return building as BuildingBlueprint;
}

// =============================================================================
// ELVEN BUILDINGS - Organic, nature-integrated architecture
// =============================================================================

export const ELVEN_MOONLIT_TREEHOUSE: BuildingBlueprint = getBuilding('elven_treehouse');
export const ELVEN_MEDITATION_BOWER: BuildingBlueprint = getBuilding('elven_meditationbower');
export const ELVEN_LIVING_WOOD_LIBRARY: BuildingBlueprint = getBuilding('elven_library');
export const ELVEN_ENCHANTED_FORGE: BuildingBlueprint = getBuilding('enchanted_forge');
export const ELVEN_STARLIGHT_SANCTUARY: BuildingBlueprint = getBuilding('starlight_sanctuary');

export const ALL_ELVEN_BUILDINGS = [
  ELVEN_MOONLIT_TREEHOUSE,
  ELVEN_MEDITATION_BOWER,
  ELVEN_LIVING_WOOD_LIBRARY,
  ELVEN_ENCHANTED_FORGE,
  ELVEN_STARLIGHT_SANCTUARY,
];

// =============================================================================
// CENTAUR BUILDINGS - Open spaces for quadrupedal movement
// =============================================================================

export const CENTAUR_STABLE: BuildingBlueprint = getBuilding('centaur_stable');
export const CENTAUR_CLAN_HALL: BuildingBlueprint = getBuilding('centaur_meeting_hall');
export const CENTAUR_OPEN_SMITHY: BuildingBlueprint = getBuilding('centaur_smithy');
export const CENTAUR_TRAINING_SHELTER: BuildingBlueprint = getBuilding('centaur_training_shelter');
export const CENTAUR_WAR_COUNCIL: BuildingBlueprint = getBuilding('centaur_war_council');

export const ALL_CENTAUR_BUILDINGS = [
  CENTAUR_STABLE,
  CENTAUR_CLAN_HALL,
  CENTAUR_OPEN_SMITHY,
  CENTAUR_TRAINING_SHELTER,
  CENTAUR_WAR_COUNCIL,
];

// =============================================================================
// ANGELIC BUILDINGS - Vertical transcendence, divine light
// =============================================================================

export const ANGELIC_PRAYER_SPIRE: BuildingBlueprint = getBuilding('celestial_prayer_spire');
export const ANGELIC_CHOIR_TOWER: BuildingBlueprint = getBuilding('choir_tower');
export const ANGELIC_CELESTIAL_ARCHIVES: BuildingBlueprint = getBuilding('celestial_archives');
export const ANGELIC_MEDITATION_SANCTUM: BuildingBlueprint = getBuilding('meditation_sanctum_angelic');

export const ALL_ANGELIC_BUILDINGS = [
  ANGELIC_PRAYER_SPIRE,
  ANGELIC_CHOIR_TOWER,
  ANGELIC_CELESTIAL_ARCHIVES,
  ANGELIC_MEDITATION_SANCTUM,
];

// =============================================================================
// HIGH FAE (10D) BUILDINGS - Non-euclidean, impossible geometry
// =============================================================================

export const HIGH_FAE_FOLDED_MANOR: BuildingBlueprint = getBuilding('folded_manor');
export const HIGH_FAE_CHRONODREAM_SPIRE: BuildingBlueprint = getBuilding('high_fae_impossible_tower');
export const HIGH_FAE_TESSERACT_COURT: BuildingBlueprint = getBuilding('tesseract_court');
export const HIGH_FAE_BETWEEN_SPACE_WORKSHOP: BuildingBlueprint = getBuilding('high_fae_workshop');

export const ALL_HIGH_FAE_BUILDINGS = [
  HIGH_FAE_FOLDED_MANOR,
  HIGH_FAE_CHRONODREAM_SPIRE,
  HIGH_FAE_TESSERACT_COURT,
  HIGH_FAE_BETWEEN_SPACE_WORKSHOP,
];

// =============================================================================
// SPECIES COLLECTIONS
// =============================================================================

/**
 * All species-specific buildings organized by species
 */
export const BUILDINGS_BY_SPECIES = {
  elven: ALL_ELVEN_BUILDINGS,
  centaur: ALL_CENTAUR_BUILDINGS,
  angelic: ALL_ANGELIC_BUILDINGS,
  high_fae: ALL_HIGH_FAE_BUILDINGS,
};

/**
 * All species buildings (flat array)
 */
export const ALL_SPECIES_BUILDINGS = [
  ...ALL_ELVEN_BUILDINGS,
  ...ALL_CENTAUR_BUILDINGS,
  ...ALL_ANGELIC_BUILDINGS,
  ...ALL_HIGH_FAE_BUILDINGS,
];

/**
 * Get all buildings for a specific species
 */
export function getBuildingsForSpecies(species: string): BuildingBlueprint[] {
  const normalized = species.toLowerCase().replace(/[-_\s]/g, '_');

  if (normalized.includes('elven') || normalized.includes('elf')) {
    return ALL_ELVEN_BUILDINGS;
  }
  if (normalized.includes('centaur')) {
    return ALL_CENTAUR_BUILDINGS;
  }
  if (normalized.includes('angel')) {
    return ALL_ANGELIC_BUILDINGS;
  }
  if (normalized.includes('fae') || normalized.includes('10d')) {
    return ALL_HIGH_FAE_BUILDINGS;
  }

  return [];
}
