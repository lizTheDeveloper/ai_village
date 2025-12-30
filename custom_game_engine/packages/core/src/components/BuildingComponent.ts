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
    // Tier 1 buildings (per construction-system/spec.md)
    case 'workbench':
      // Crafting station - blocks movement
      break;
    case 'storage-chest':
      storageCapacity = 20; // Per spec: 20 item slots
      break;
    case 'campfire':
      blocksMovement = false; // Can walk through campfire
      providesHeat = true;
      heatRadius = 8; // Increased from 3 to cover spawn area
      heatAmount = 10;
      break;
    case 'tent':
      insulation = 0.5;
      baseTemperature = 8;
      weatherProtection = 0.7;
      interior = true;
      interiorRadius = 2;
      break;
    case 'well':
      // Water source - blocks movement
      break;

    // Tier 2 crafting stations (Phase 10)
    case 'forge':
      // Metal crafting station - fuel initialized by BuildingSystem on completion
      // BuildingSystem owns fuel configuration (single source of truth)
      fuelRequired = false; // Will be set to true by BuildingSystem
      currentFuel = 0;
      maxFuel = 0;
      fuelConsumptionRate = 0;
      break;
    case 'farm_shed':
      // Farming storage - no fuel required
      storageCapacity = 40;
      break;
    case 'market_stall':
      // Trading station - no fuel required
      break;
    case 'windmill':
      // Grain processing - no fuel required (wind-powered)
      break;

    // Tier 3 crafting stations (Phase 10)
    case 'workshop':
      // Advanced crafting - no fuel required
      break;

    // Tier 2.5 animal housing (per construction-system/spec.md)
    case 'chicken-coop':
      // Size 2x2, capacity 8 birds, cost 25 Wood
      animalCapacity = 8;
      allowedSpecies = ['chicken', 'duck', 'turkey'];
      insulation = 0.6;
      baseTemperature = 5;
      weatherProtection = 0.8;
      interior = true;
      interiorRadius = 2;
      break;
    case 'kennel':
      // Size 2x3, capacity 6 dogs, cost 30 Wood + 10 Stone
      animalCapacity = 6;
      allowedSpecies = ['dog', 'wolf'];
      insulation = 0.7;
      baseTemperature = 6;
      weatherProtection = 0.85;
      interior = true;
      interiorRadius = 2;
      break;
    case 'stable':
      // Size 3x4, capacity 4 horses/donkeys, cost 50 Wood + 20 Stone
      animalCapacity = 4;
      allowedSpecies = ['horse', 'donkey', 'mule'];
      insulation = 0.8;
      baseTemperature = 8;
      weatherProtection = 0.9;
      interior = true;
      interiorRadius = 3;
      break;
    case 'apiary':
      // Size 2x2, capacity 3 bee colonies, cost 20 Wood + 5 Glass
      animalCapacity = 3;
      allowedSpecies = ['bee_colony'];
      insulation = 0.5;
      baseTemperature = 4;
      weatherProtection = 0.75;
      interior = true;
      interiorRadius = 2;
      break;
    case 'aquarium':
      // Size 2x2, capacity 10 fish, cost 30 Glass + 10 Stone
      animalCapacity = 10;
      allowedSpecies = ['fish'];
      insulation = 0.4;
      baseTemperature = 3;
      weatherProtection = 1.0; // Fully enclosed
      interior = true;
      interiorRadius = 2;
      break;
    case 'barn':
      // Tier 3, size 4x5, capacity 12 large livestock, cost 80 Wood + 40 Stone
      animalCapacity = 12;
      allowedSpecies = ['cow', 'sheep', 'goat', 'pig'];
      insulation = 0.85;
      baseTemperature = 10;
      weatherProtection = 0.95;
      interior = true;
      interiorRadius = 4;
      break;

    // Legacy types
    case 'lean-to':
      insulation = 0.3;
      baseTemperature = 5;
      weatherProtection = 0.5;
      interior = true;
      interiorRadius = 2;
      break;
    case 'storage-box':
      storageCapacity = 10; // Legacy: smaller than storage-chest
      break;

    // Governance buildings (per governance-dashboard work order)
    case 'town-hall':
      // Basic governance - population tracking
      // Cost: 50 wood, 20 stone; 2 builders, 4 hours
      isGovernanceBuilding = true;
      governanceType = 'population-tracking';
      requiredStaff = 0; // No staff required
      interior = true;
      interiorRadius = 4;
      break;
    case 'census-bureau':
      // Demographics and analytics
      // Cost: 100 wood, 50 stone, 20 cloth; 3 builders, 8 hours
      // Requires Town Hall first
      isGovernanceBuilding = true;
      governanceType = 'demographics';
      requiredStaff = 1; // Census taker
      interior = true;
      interiorRadius = 3;
      break;
    case 'warehouse':
      // Resource tracking and storage
      // Cost: 80 wood, 30 stone; 2 builders, 6 hours
      // Capacity: 1000 units
      isGovernanceBuilding = true;
      governanceType = 'resource-tracking';
      requiredStaff = 0; // Optional warehouse keeper
      storageCapacity = 1000;
      interior = true;
      interiorRadius = 4;
      // resourceType set at construction time
      break;
    case 'weather-station':
      // Environmental monitoring
      // Cost: 60 wood, 40 stone, 10 metal; 2 builders, 5 hours
      isGovernanceBuilding = true;
      governanceType = 'environmental-monitoring';
      requiredStaff = 0; // No staff required
      requiresOpenArea = true;
      break;
    case 'health-clinic':
      // Medical tracking and treatment
      // Cost: 100 wood, 50 stone, 30 cloth; 3 builders, 10 hours
      isGovernanceBuilding = true;
      governanceType = 'health-tracking';
      requiredStaff = 1; // Healer (1 per 20 agents)
      interior = true;
      interiorRadius = 4;
      break;
    case 'meeting-hall':
      // Social cohesion tracking
      // Cost: 120 wood, 60 stone; 3 builders, 8 hours
      isGovernanceBuilding = true;
      governanceType = 'social-cohesion';
      requiredStaff = 0; // No staff required
      interior = true;
      interiorRadius = 6; // Large interior
      break;
    case 'watchtower':
      // Threat detection
      // Cost: 80 wood, 60 stone; 2 builders, 6 hours
      isGovernanceBuilding = true;
      governanceType = 'threat-detection';
      requiredStaff = 1; // Watchman
      break;
    case 'labor-guild':
      // Workforce management
      // Cost: 90 wood, 40 stone; 2 builders, 7 hours
      // Requires Town Hall
      isGovernanceBuilding = true;
      governanceType = 'workforce-management';
      requiredStaff = 0; // No staff required
      interior = true;
      interiorRadius = 4;
      break;
    case 'archive':
      // Historical data and analysis
      // Cost: 150 wood, 80 stone, 50 cloth, 20 ink; 4 builders, 12 hours
      // Requires Census Bureau + Town Hall
      isGovernanceBuilding = true;
      governanceType = 'historical-analysis';
      requiredStaff = 1; // Librarian/scholar (high intelligence)
      interior = true;
      interiorRadius = 5;
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
