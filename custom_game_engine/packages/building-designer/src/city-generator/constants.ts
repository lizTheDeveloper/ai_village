/**
 * City Generator Constants
 *
 * Configuration and constants for city generation.
 */

import type { VoxelBuildingDefinition } from '../types.js';
import type { CitySize, CityType, DistrictType } from './types.js';
import {
  ALL_BUILDINGS,
  RESIDENTIAL_BUILDINGS as ALL_HOUSES,
  PRODUCTION_BUILDINGS as ALL_PRODUCTION,
  COMMERCIAL_BUILDINGS as ALL_COMMERCIAL,
  STORAGE_BUILDINGS as ALL_STORAGE,
  COMMUNITY_BUILDINGS as ALL_COMMUNITY,
  MILITARY_BUILDINGS as ALL_MILITARY,
  FARMING_BUILDINGS as ALL_FARMING,
  RESEARCH_BUILDINGS as ALL_RESEARCH,
} from '../building-library-data.js';
import cityConfig from '../../data/city-config.json';

// =============================================================================
// CITY SIZES
// =============================================================================

/**
 * City sizes scaled for realistic 1 tile = 1 meter scale.
 * Loaded from city-config.json
 */
export const CITY_SIZES: Record<CitySize, { sectors: number; tiles: number }> = cityConfig.citySizes as Record<CitySize, { sectors: number; tiles: number }>;

export const SECTOR_SIZE = cityConfig.sectorSize;

/**
 * Street widths in tiles (1 tile = 1 meter).
 * Loaded from city-config.json
 */
export const STREET_WIDTHS = cityConfig.streetWidths;

/**
 * Minimum distance between settlements (in tiles/meters).
 * Loaded from city-config.json
 */
export const CITY_SPACING: Record<CitySize, number> = cityConfig.citySpacing as Record<CitySize, number>;

/**
 * City generation density per biome (cities per 1,000,000 km2).
 * Loaded from city-config.json
 */
export const CITY_DENSITY_PER_MILLION_KM2: Record<string, number> = Object.fromEntries(
  Object.entries(cityConfig.cityDensityPerMillionKm2).filter(([key]) => !key.startsWith('_'))
) as Record<string, number>;

/**
 * Preferred city types by biome.
 * Loaded from city-config.json
 */
export const BIOME_CITY_TYPES: Record<string, CityType[]> = Object.fromEntries(
  Object.entries(cityConfig.biomeCityTypes).filter(([key]) => !key.startsWith('_'))
) as Record<string, CityType[]>;

/**
 * Maximum city size allowed per biome.
 * Loaded from city-config.json
 */
export const BIOME_MAX_CITY_SIZE: Record<string, CitySize> = cityConfig.biomeMaxCitySize as Record<string, CitySize>;

// =============================================================================
// BUILDING SPECS PARSING
// =============================================================================

/**
 * Parse building specification string from JSON config.
 * Format: "BUILDING_CATEGORY[filter]"
 * Examples:
 *   "RESIDENTIAL_BUILDINGS" -> ALL_HOUSES
 *   "RESIDENTIAL_BUILDINGS[tier<=1]" -> ALL_HOUSES.filter(b => b.tier <= 1)
 *   "PRODUCTION_BUILDINGS[name~=forge||tier>=2]" -> ALL_PRODUCTION.filter(b => name includes 'forge' OR tier >= 2)
 */
function parseBuildingSpec(spec: string): VoxelBuildingDefinition[] {
  // Map category names to building arrays
  const categoryMap: Record<string, VoxelBuildingDefinition[]> = {
    RESIDENTIAL_BUILDINGS: ALL_HOUSES,
    PRODUCTION_BUILDINGS: ALL_PRODUCTION,
    COMMERCIAL_BUILDINGS: ALL_COMMERCIAL,
    STORAGE_BUILDINGS: ALL_STORAGE,
    COMMUNITY_BUILDINGS: ALL_COMMUNITY,
    MILITARY_BUILDINGS: ALL_MILITARY,
    FARMING_BUILDINGS: ALL_FARMING,
    RESEARCH_BUILDINGS: ALL_RESEARCH,
  };

  // Parse "CATEGORY[filter]" or just "CATEGORY"
  const match = spec.match(/^([A-Z_]+)(?:\[(.+)\])?$/);
  if (!match) {
    throw new Error(`Invalid building spec: ${spec}`);
  }

  const [, category, filterExpr] = match;
  if (!category) {
    throw new Error(`Invalid building spec format: ${spec}`);
  }
  const buildings = categoryMap[category];

  if (!buildings) {
    throw new Error(`Unknown building category: ${category}`);
  }

  // No filter - return all buildings
  if (!filterExpr) {
    return buildings;
  }

  // Parse filter expression
  // Support: tier<=1, tier>=3, name~=forge, name~=forge||tier>=2
  return buildings.filter((b: VoxelBuildingDefinition) => {
    // Split on || for OR conditions
    const conditions = filterExpr.split('||');

    for (const cond of conditions) {
      const trimmed = cond.trim();

      // tier<=N
      const tierLteMatch = trimmed.match(/^tier<=(\d+)$/);
      if (tierLteMatch) {
        const matchedValue = tierLteMatch[1];
        if (!matchedValue) {
          throw new Error(`Invalid tier<= filter: ${trimmed}`);
        }
        const value = parseInt(matchedValue);
        if (b.tier <= value) return true;
      }
      // tier>=N
      const tierGteMatch = trimmed.match(/^tier>=(\d+)$/);
      if (tierGteMatch) {
        const matchedValue = tierGteMatch[1];
        if (!matchedValue) {
          throw new Error(`Invalid tier>= filter: ${trimmed}`);
        }
        const value = parseInt(matchedValue);
        if (b.tier >= value) return true;
      }
      // name~=value (contains)
      const nameMatch = trimmed.match(/^name~=(.+)$/);
      if (nameMatch) {
        const value = nameMatch[1];
        if (!value) {
          throw new Error(`Invalid name~= filter: ${trimmed}`);
        }
        if (b.name?.toLowerCase().includes(value.toLowerCase())) return true;
      }
    }

    return false;
  });
}

/**
 * Build DISTRICT_BUILDINGS from JSON config.
 * Parses building specifications and applies filters.
 */
function buildDistrictBuildings(): Record<DistrictType, VoxelBuildingDefinition[]> {
  const result = {} as Record<DistrictType, VoxelBuildingDefinition[]>;

  for (const [district, spec] of Object.entries(cityConfig.districtBuildings)) {
    if (district.startsWith('_')) continue; // Skip comments
    result[district as DistrictType] = parseBuildingSpec(spec as string);
  }

  return result;
}

// District preferences for building categories (loaded from city-config.json)
export const DISTRICT_BUILDINGS: Record<DistrictType, VoxelBuildingDefinition[]> = buildDistrictBuildings();

// District adjacency preferences (loaded from city-config.json)
export const DISTRICT_AFFINITIES: Record<DistrictType, { prefer: DistrictType[]; avoid: DistrictType[] }> =
  cityConfig.districtAffinities as unknown as Record<DistrictType, { prefer: DistrictType[]; avoid: DistrictType[] }>;

// Re-export ALL_BUILDINGS for building selection
export { ALL_BUILDINGS };

// =============================================================================
// DWARVEN LEVEL CONFIG
// =============================================================================

import type { DwarvenLevel } from './types.js';

export const DWARVEN_LEVELS: DwarvenLevel[] = [
  { z: 0, name: 'Surface Gate', districts: ['military'], char: '\u25B2' },
  { z: -1, name: 'Upper Halls', districts: ['greathall', 'residential'], char: '\u2550' },
  { z: -2, name: 'Living Quarters', districts: ['residential', 'storage'], char: '\u2592' },
  { z: -3, name: 'Craft Halls', districts: ['crafthall', 'industrial'], char: '\u25CA' },
  { z: -4, name: 'Mushroom Farms', districts: ['mushroom_farm', 'agricultural'], char: '\u2663' },
  { z: -5, name: 'Deep Storage', districts: ['storage', 'mine'], char: '\u2593' },
  { z: -6, name: 'Mining Tunnels', districts: ['mine'], char: '\u2591' },
  { z: -7, name: 'Magma Forges', districts: ['forge'], char: '\u25BC' },
];

// =============================================================================
// LEGEND
// =============================================================================

export const CITY_LEGEND = {
  // Streets
  '=': 'Arterial road',
  '|': 'Arterial road (vertical)',
  '+': 'Intersection',
  '-': 'Local street',
  '~': 'Organic street / Magma',

  // Districts
  'C': 'Civic',
  'M': 'Market / Mine',
  'R': 'Residential',
  'I': 'Industrial',
  'L': 'Library/Research',
  'F': 'Farm/Agricultural / Forge',
  'S': 'Storage',
  'B': 'Barracks/Military',
  'W': 'Wealthy',
  'r': 'Slums',
  'T': 'Town Hall/Temple',
  'G': 'Gate',
  'H': 'Great Hall',
  'm': 'Mushroom Farm',

  // Flying city
  '\u00B7': 'Open air / Corridor',
  '\u2219': 'Flight lane',
  '\u25CB': 'Thermal column',
  '\u25B3': 'Spire',
  '\u25B2': 'Spire peak / Surface entrance',
  '\u25AD': 'Landing platform',

  // Non-Euclidean
  '\u2591': 'Uncertain space / Room interior',
  '\u2593': 'Tomb interior / Deep storage',
  '\u2588': 'Cyclopean wall / Solid rock',
  '\u2248': 'Impossible corridor / Magma pool',
  '\u2300': 'Void/gap',
  '\u2220': 'Angle anomaly',
  '\u2573': 'Reality tear',
  '\u221E': 'Infinite loop / Recursive library',
  '\u25CA': 'Spiral structure / Craft hall',
  '\u25A1': 'Fractured cube',
  '\u25CE': 'Organic mass',
  '\u25A2': 'Wrong-angled building',
  '\u25BC': 'Inverted structure / Entrance',
  '1-5': 'Phase visibility (1-5)',

  // Dwarven Underground
  '\u2551': 'Great stairway shaft wall',
  '\u2501': 'Level separator / Floor',
  '\u25AA': 'Door',
  '\u2663': 'Mushroom farm',
  'Z': 'Z-level indicator',

  // Literary Underground
  '\u2500': 'Text line / Footnote separator',
  '\u2502': 'Page margin',
  '\u25AC': 'Bookshelf',
  '\u2590': 'Bookcase',
  '\u2302': 'Library entrance',
  '\u270E': 'Quill / Writing desk',
  '\u22A1': 'Scribe desk',
  '\u00B9\u00B2\u00B3': 'Footnote markers',
  '\u2020\u2021\u00A7\u00B6': 'Marginalia annotations',
  '?!#@$': 'Typo Void chaos',
};
