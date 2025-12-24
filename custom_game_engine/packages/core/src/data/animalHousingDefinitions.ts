/**
 * Animal Housing Definitions
 * Per construction-system/spec.md Tier 2.5 - Animal Housing
 */

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
export const ANIMAL_HOUSING_DEFINITIONS: Record<string, AnimalHousingDefinition> = {
  'chicken-coop': {
    buildingType: 'chicken-coop',
    tier: 2.5,
    size: { width: 2, height: 2 },
    capacity: 8,
    allowedSpecies: ['chicken', 'duck', 'turkey'],
    cost: { wood: 25 },
    insulation: 0.6,
    baseTemperature: 5,
    weatherProtection: 0.8,
    cleanlinessDecayRate: 5, // 5% per bird per day
  },
  kennel: {
    buildingType: 'kennel',
    tier: 2.5,
    size: { width: 2, height: 3 },
    capacity: 6,
    allowedSpecies: ['dog', 'wolf'],
    cost: { wood: 30, stone: 10 },
    insulation: 0.7,
    baseTemperature: 6,
    weatherProtection: 0.85,
    cleanlinessDecayRate: 5, // 5% per canine per day
  },
  stable: {
    buildingType: 'stable',
    tier: 2.5,
    size: { width: 3, height: 4 },
    capacity: 4,
    allowedSpecies: ['horse', 'donkey', 'mule'],
    cost: { wood: 50, stone: 20 },
    insulation: 0.8,
    baseTemperature: 8,
    weatherProtection: 0.9,
    cleanlinessDecayRate: 5, // 5% per equine per day
  },
  apiary: {
    buildingType: 'apiary',
    tier: 2.5,
    size: { width: 2, height: 2 },
    capacity: 3,
    allowedSpecies: ['bee_colony'],
    cost: { wood: 20, glass: 5 },
    insulation: 0.5,
    baseTemperature: 4,
    weatherProtection: 0.75,
    cleanlinessDecayRate: 2, // 2% per colony per day (bees are cleaner)
  },
  aquarium: {
    buildingType: 'aquarium',
    tier: 2.5,
    size: { width: 2, height: 2 },
    capacity: 10,
    allowedSpecies: ['fish'],
    cost: { glass: 30, stone: 10 },
    insulation: 0.4,
    baseTemperature: 3,
    weatherProtection: 1.0, // Fully enclosed
    cleanlinessDecayRate: 8, // 8% per 10 fish per day (water gets dirty fast)
  },
  barn: {
    buildingType: 'barn',
    tier: 3,
    size: { width: 4, height: 5 },
    capacity: 12,
    allowedSpecies: ['cow', 'sheep', 'goat', 'pig'],
    cost: { wood: 80, stone: 40 },
    insulation: 0.85,
    baseTemperature: 10,
    weatherProtection: 0.95,
    cleanlinessDecayRate: 5, // 5% per large animal per day
  },
};

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
