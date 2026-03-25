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
// DVERGAR BUILDINGS - Underground precision engineering, stone and steel
// =============================================================================

export const DVERGAR_RUNEFORGE_HALL: BuildingBlueprint = getBuilding('dvergar_forge_hall');
export const DVERGAR_STONEKIN_HOLD: BuildingBlueprint = getBuilding('dvergar_hold');
export const DVERGAR_DEBTKEEPERS_VAULT: BuildingBlueprint = getBuilding('dvergar_vault');
export const DVERGAR_ASSAY_CHAMBER: BuildingBlueprint = getBuilding('dvergar_assay_chamber');
export const DVERGAR_ANCESTOR_HALL: BuildingBlueprint = getBuilding('dvergar_ancestor_hall');

export const ALL_DVERGAR_BUILDINGS = [
  DVERGAR_RUNEFORGE_HALL,
  DVERGAR_STONEKIN_HOLD,
  DVERGAR_DEBTKEEPERS_VAULT,
  DVERGAR_ASSAY_CHAMBER,
  DVERGAR_ANCESTOR_HALL,
];

// =============================================================================
// JOTNAR BUILDINGS - Massive primordial architecture, ice and fire
// =============================================================================

export const JOTNAR_FROST_HALL: BuildingBlueprint = getBuilding('jotnar_frost_hall');
export const JOTNAR_FORGE_PIT: BuildingBlueprint = getBuilding('jotnar_forge_pit');
export const JOTNAR_RUNE_CIRCLE: BuildingBlueprint = getBuilding('jotnar_rune_circle');
export const JOTNAR_WAR_CAIRN: BuildingBlueprint = getBuilding('jotnar_war_cairn');
export const JOTNAR_PRIMORDIAL_THRONE: BuildingBlueprint = getBuilding('jotnar_primordial_throne');

export const ALL_JOTNAR_BUILDINGS = [
  JOTNAR_FROST_HALL,
  JOTNAR_FORGE_PIT,
  JOTNAR_RUNE_CIRCLE,
  JOTNAR_WAR_CAIRN,
  JOTNAR_PRIMORDIAL_THRONE,
];

// =============================================================================
// DRAGON BUILDINGS - Post-temporal 10D architecture, time and memory
// =============================================================================

export const DRAGON_TIME_ANCHOR: BuildingBlueprint = getBuilding('dragon_time_anchor');
export const DRAGON_HOARD_NEXUS: BuildingBlueprint = getBuilding('dragon_hoard_nexus');
export const DRAGON_MEMORY_SPIRE: BuildingBlueprint = getBuilding('dragon_memory_spire');
export const DRAGON_ROOST: BuildingBlueprint = getBuilding('dragon_roost');
export const DRAGON_COUNCIL_AERIE: BuildingBlueprint = getBuilding('dragon_council_aerie');

export const ALL_DRAGON_BUILDINGS = [
  DRAGON_TIME_ANCHOR,
  DRAGON_HOARD_NEXUS,
  DRAGON_MEMORY_SPIRE,
  DRAGON_ROOST,
  DRAGON_COUNCIL_AERIE,
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
  dvergar: ALL_DVERGAR_BUILDINGS,
  jotnar: ALL_JOTNAR_BUILDINGS,
  dragon: ALL_DRAGON_BUILDINGS,
};

/**
 * All species buildings (flat array)
 */
export const ALL_SPECIES_BUILDINGS = [
  ...ALL_ELVEN_BUILDINGS,
  ...ALL_CENTAUR_BUILDINGS,
  ...ALL_ANGELIC_BUILDINGS,
  ...ALL_HIGH_FAE_BUILDINGS,
  ...ALL_DVERGAR_BUILDINGS,
  ...ALL_JOTNAR_BUILDINGS,
  ...ALL_DRAGON_BUILDINGS,
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
  if (normalized.includes('dvergar') || normalized.includes('dwarf')) {
    return ALL_DVERGAR_BUILDINGS;
  }
  if (normalized.includes('jotnar') || normalized.includes('giant') || normalized.includes('jotunn')) {
    return ALL_JOTNAR_BUILDINGS;
  }
  if (normalized.includes('dragon')) {
    return ALL_DRAGON_BUILDINGS;
  }

  return [];
}
