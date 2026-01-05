import type { Component } from '../ecs/Component.js';
import { BuildingType, type BuildingTypeString } from '../types/BuildingType.js';

// Re-export enum and type for backwards compatibility
export { BuildingType };
export type { BuildingTypeString };

export interface BuildingComponent extends Component {
  type: 'building';
  buildingType: BuildingTypeString;
  tier: number; // Building quality/advancement level (1-3)
  progress: number; // Construction progress (0-100)
  isComplete: boolean; // Whether construction is finished
  blocksMovement: boolean; // Whether entities can walk through it
  storageCapacity: number; // How many items it can store (storage-box)
  // Phase 8: Temperature System properties
  providesHeat: boolean; // Whether it provides heat (campfire)
  heatRadius: number; // Tiles from heat source (0 = no heat)
  heatAmount: number; // Degrees celsius of heat provided
  providesShade: boolean; // Whether it provides shade/cooling
  shadeRadius: number; // Tiles of shade coverage (0 = no shade)
  insulation: number; // 0-1, how much it reduces ambient temperature effect
  baseTemperature: number; // Degrees celsius added to interior
  weatherProtection: number; // 0-1, how much it protects from weather effects
  interior: boolean; // Whether building has an interior space
  interiorRadius: number; // Tiles from building center (0 = no interior)
  // Phase 10: Crafting Station properties
  fuelRequired: boolean; // Whether station requires fuel to operate
  currentFuel: number; // Current fuel level (0-maxFuel)
  maxFuel: number; // Maximum fuel capacity
  fuelConsumptionRate: number; // Fuel consumed per second when active
  activeRecipe: string | null; // Currently crafting recipe ID (null = idle)
  // Phase 11: Animal Housing properties
  animalCapacity: number; // Maximum number of animals this building can house
  allowedSpecies: string[]; // Species IDs that can be housed in this building
  currentOccupants: string[]; // Entity IDs of animals currently housed
  cleanliness: number; // 0-100, cleanliness level (affects animal comfort)
  // Governance buildings properties
  isGovernanceBuilding: boolean; // Whether this is a governance building
  condition: number; // 0-100, building condition/health (affects data quality)
  requiredStaff: number; // Number of staff required for optimal operation
  currentStaff: string[]; // Entity IDs of agents currently staffed
  governanceType?: string; // Type of governance function (population-tracking, demographics, etc)
  resourceType?: string; // For warehouses: type of resource tracked (food, wood, etc)
  requiresOpenArea?: boolean; // For weather station: must be in open area
  // Progressive Skill Reveal: Building ownership
  ownerId?: string; // Entity ID of the building owner
  ownerName?: string; // Name of the building owner
  accessType: 'communal' | 'personal' | 'shared'; // Who can use this building
  sharedWith: string[]; // Entity IDs allowed to use (for 'shared' type)
}

export function createBuildingComponent(
  buildingType: BuildingType,
  tier: number = 1,
  progress: number = 0
): BuildingComponent {
  // Configure properties based on building type
  let blocksMovement = true;
  let storageCapacity = 0;

  // Phase 8: Temperature properties
  let providesHeat = false;
  let heatRadius = 0;
  let heatAmount = 0;
  let providesShade = false;
  let shadeRadius = 0;
  let insulation = 0;
  let baseTemperature = 0;
  let weatherProtection = 0;
  let interior = false;
  let interiorRadius = 0;

  // Phase 10: Crafting station properties
  let fuelRequired = false;
  let currentFuel = 0;
  let maxFuel = 0;
  let fuelConsumptionRate = 0;
  const activeRecipe: string | null = null;

  // Phase 11: Animal housing properties
  let animalCapacity = 0;
  let allowedSpecies: string[] = [];
  const currentOccupants: string[] = [];
  const cleanliness = 100; // Start clean

  // Governance buildings properties
  let isGovernanceBuilding = false;
  const condition = 100; // Start in perfect condition
  let requiredStaff = 0;
  const currentStaff: string[] = [];
  let governanceType: string | undefined;
  let resourceType: string | undefined;
  let requiresOpenArea: boolean | undefined;

  switch (buildingType) {
    // Single-tile furniture and workstations only
    // Multi-tile buildings use TileBasedBlueprintRegistry instead

    // Storage furniture
    case 'storage-chest':
      storageCapacity = 20; // Per spec: 20 item slots
      break;
    case 'storage-box':
      storageCapacity = 10; // Legacy: smaller than storage-chest
      break;

    // Sleeping furniture
    case 'bed':
      // Bed - blocks movement
      break;
    case 'bedroll':
      // Bedroll - blocks movement
      break;

    // Utility stations
    case 'campfire':
      blocksMovement = false; // Can walk through campfire
      providesHeat = true;
      heatRadius = 8; // Increased from 3 to cover spawn area
      heatAmount = 10;
      break;
    case 'well':
      // Water source - blocks movement
      break;
    case 'market_stall':
      // Trading station - no fuel required
      break;

    // Crafting stations
    case 'workbench':
      // Basic crafting station - blocks movement
      break;
    case 'forge':
      // Metal crafting station - fuel initialized by BuildingSystem on completion
      // BuildingSystem owns fuel configuration (single source of truth)
      fuelRequired = false; // Will be set to true by BuildingSystem
      currentFuel = 0;
      maxFuel = 0;
      fuelConsumptionRate = 0;
      break;
    case 'butchering_table':
      // Butchering station - blocks movement
      break;
    case 'loom':
      // Weaving station - blocks movement
      break;
    case 'oven':
      // Baking station - blocks movement
      break;
  }

  return {
    type: 'building',
    version: 1,
    buildingType,
    tier: Math.max(1, Math.min(3, tier)),
    progress: Math.max(0, Math.min(100, progress)),
    isComplete: progress >= 100,
    blocksMovement,
    storageCapacity,
    providesHeat,
    heatRadius,
    heatAmount,
    providesShade,
    shadeRadius,
    insulation,
    baseTemperature,
    weatherProtection,
    interior,
    interiorRadius,
    fuelRequired,
    currentFuel,
    maxFuel,
    fuelConsumptionRate,
    activeRecipe,
    animalCapacity,
    allowedSpecies,
    currentOccupants,
    cleanliness,
    isGovernanceBuilding,
    condition,
    requiredStaff,
    currentStaff,
    governanceType,
    resourceType,
    requiresOpenArea,
    // Building ownership - default to communal
    accessType: 'communal',
    sharedWith: [],
  };
}

/**
 * Check if an agent can access a building based on ownership.
 * Per progressive-skill-reveal-spec.md:
 * - Communal: Anyone can access
 * - Personal: Only owner can access
 * - Shared: Owner + sharedWith list can access
 */
export function canAccessBuilding(building: BuildingComponent, agentId: string): boolean {
  if (building.accessType === 'communal') {
    return true;
  }

  if (building.accessType === 'personal') {
    return building.ownerId === agentId;
  }

  if (building.accessType === 'shared') {
    return building.ownerId === agentId || building.sharedWith.includes(agentId);
  }

  return false;
}

/**
 * Check if building is under construction.
 */
export function isUnderConstruction(building: BuildingComponent): boolean {
  return building.progress < 100;
}

/**
 * Get the amount of work needed to complete construction.
 */
export function getRemainingWork(building: BuildingComponent): number {
  return Math.max(0, 100 - building.progress);
}
