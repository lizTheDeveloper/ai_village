/**
 * Standard Building Definitions using BuildingBlueprint
 *
 * Migrated from TileBasedBlueprintRegistry to support:
 * - Furniture (beds, storage, tables, workstations)
 * - Multi-floor layouts (roofs, attics, basements)
 * - Side view visualization
 * - Proper validation
 *
 * Building data loaded from buildings.json
 */

import type { BuildingBlueprint } from './BuildingBlueprintRegistry.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const buildingsPath = join(__dirname, '../../data/buildings.json');
const buildingsData = JSON.parse(readFileSync(buildingsPath, 'utf-8')) as { buildings: BuildingBlueprint[] };

// =============================================================================
// DATA LOADER
// =============================================================================

/**
 * Load and validate building blueprints from JSON
 */
function loadBuildingsFromJSON(): Map<string, BuildingBlueprint> {
  const buildingsMap = new Map<string, BuildingBlueprint>();

  if (!buildingsData || !buildingsData.buildings || !Array.isArray(buildingsData.buildings)) {
    throw new Error('Invalid buildings.json format: missing or invalid "buildings" array');
  }

  for (const building of buildingsData.buildings) {
    // Validate required fields
    if (!building.id || typeof building.id !== 'string') {
      throw new Error(`Invalid building: missing or invalid "id" field`);
    }
    if (!building.name || typeof building.name !== 'string') {
      throw new Error(`Invalid building ${building.id}: missing or invalid "name" field`);
    }
    if (typeof building.width !== 'number' || typeof building.height !== 'number') {
      throw new Error(`Invalid building ${building.id}: missing or invalid dimensions`);
    }
    if (!Array.isArray(building.layout) || building.layout.length === 0) {
      throw new Error(`Invalid building ${building.id}: missing or invalid layout`);
    }

    buildingsMap.set(building.id, building as BuildingBlueprint);
  }

  return buildingsMap;
}

// Load all buildings at module initialization
const BUILDINGS_MAP = loadBuildingsFromJSON();

// =============================================================================
// BUILDING EXPORTS
// =============================================================================

/**
 * Get building by ID (throws if not found)
 */
function getBuilding(id: string): BuildingBlueprint {
  const building = BUILDINGS_MAP.get(id);
  if (!building) {
    throw new Error(`Building not found: ${id}`);
  }
  return building;
}

// Export individual buildings (maintains backward compatibility)
export const SMALL_HOUSE: BuildingBlueprint = getBuilding('small_house');
export const COZY_COTTAGE: BuildingBlueprint = getBuilding('cozy_cottage');
export const STONE_HOUSE: BuildingBlueprint = getBuilding('stone_house');
export const LONGHOUSE: BuildingBlueprint = getBuilding('longhouse');
export const WORKSHOP: BuildingBlueprint = getBuilding('workshop');
export const BARN: BuildingBlueprint = getBuilding('barn');
export const STORAGE_SHED: BuildingBlueprint = getBuilding('storage_shed');
export const GUARD_TOWER: BuildingBlueprint = getBuilding('guard_tower');

// =============================================================================
// BUILDING COLLECTIONS
// =============================================================================

export const ALL_RESIDENTIAL = [
  SMALL_HOUSE,
  COZY_COTTAGE,
  STONE_HOUSE,
  LONGHOUSE,
];

export const ALL_PRODUCTION = [
  WORKSHOP,
  BARN,
];

export const ALL_STORAGE = [
  STORAGE_SHED,
];

export const ALL_COMMUNITY = [
  GUARD_TOWER,
];

export const ALL_STANDARD_VOXEL_BUILDINGS = [
  ...ALL_RESIDENTIAL,
  ...ALL_PRODUCTION,
  ...ALL_STORAGE,
  ...ALL_COMMUNITY,
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get buildings by category
 */
export function getBuildingsByCategory(category: string): BuildingBlueprint[] {
  return ALL_STANDARD_VOXEL_BUILDINGS.filter(b => b.category === category);
}

/**
 * Get buildings by tier
 */
export function getBuildingsByTier(tier: number): BuildingBlueprint[] {
  return ALL_STANDARD_VOXEL_BUILDINGS.filter(b => b.tier === tier);
}

/**
 * Get building by name
 */
export function getBuildingByName(name: string): BuildingBlueprint | undefined {
  return ALL_STANDARD_VOXEL_BUILDINGS.find(b => b.name === name);
}
