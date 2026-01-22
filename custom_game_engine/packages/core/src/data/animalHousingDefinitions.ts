/**
 * Animal Housing Definitions
 * Per construction-system/spec.md Tier 2.5 - Animal Housing
 */

import housingData from '../../data/animal-housing.json';

export interface AnimalHousingDefinition {
  buildingType: string;
  tier: number;
  size: { width: number; height: number };
  capacity: number;
  allowedSpecies: string[];
  cost: { [resource: string]: number };
  insulation: number; // 0-1
  baseTemperature: number; // degrees C
  weatherProtection: number; // 0-1
  cleanlinessDecayRate: number; // % per animal per day
}

/**
 * Animal housing building definitions from spec
 * Per CLAUDE.md: NO SILENT FALLBACKS - all fields are required
 */
export const ANIMAL_HOUSING_DEFINITIONS = housingData.housing as Record<string, AnimalHousingDefinition>;

/**
 * Get housing definition by building type
 * Per CLAUDE.md: throw if missing, no fallbacks
 */
export function getAnimalHousingDefinition(buildingType: string): AnimalHousingDefinition {
  const definition = ANIMAL_HOUSING_DEFINITIONS[buildingType];
  if (!definition) {
    throw new Error(
      `Unknown animal housing type: ${buildingType}. Valid types: ${Object.keys(ANIMAL_HOUSING_DEFINITIONS).join(', ')}`
    );
  }
  return definition;
}

/**
 * Check if a building type is animal housing
 */
export function isAnimalHousing(buildingType: string): boolean {
  return buildingType in ANIMAL_HOUSING_DEFINITIONS;
}

/**
 * Check if a species can be housed in a specific building type
 */
export function canHouseSpecies(buildingType: string, speciesId: string): boolean {
  const definition = getAnimalHousingDefinition(buildingType);
  return definition.allowedSpecies.includes(speciesId);
}

/**
 * Get all species allowed in a building type
 */
export function getAllowedSpecies(buildingType: string): string[] {
  const definition = getAnimalHousingDefinition(buildingType);
  return [...definition.allowedSpecies]; // Return copy to prevent mutation
}
