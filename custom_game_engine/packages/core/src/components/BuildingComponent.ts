import type { Component } from '../ecs/Component.js';

/**
 * Building types - includes Tier 1 buildings from construction-system/spec.md
 * Plus legacy types for backward compatibility
 * Plus Tier 2.5 animal housing from construction-system/spec.md
 */
export type BuildingType =
  // Tier 1 buildings (per spec)
  | 'workbench'
  | 'storage-chest'
  | 'campfire'
  | 'tent'
  | 'well'
  // Tier 2.5 animal housing (per spec)
  | 'chicken-coop'
  | 'kennel'
  | 'stable'
  | 'apiary'
  | 'aquarium'
  | 'barn'
  // Sleeping/furniture
  | 'bed'
  | 'bedroll'
  // Legacy types (backward compatibility)
  | 'lean-to'
  | 'storage-box';

export interface BuildingComponent extends Component {
  type: 'building';
  buildingType: BuildingType;
  tier: number; // Building quality/advancement level (1-3)
  progress: number; // Construction progress (0-100)
  isComplete: boolean; // Whether construction is finished
  blocksMovement: boolean; // Whether entities can walk through it
  storageCapacity: number; // How many items it can store (storage-box)
  // Phase 8: Temperature System properties
  providesHeat: boolean; // Whether it provides heat (campfire)
  heatRadius: number; // Tiles from heat source (0 = no heat)
  heatAmount: number; // Degrees celsius of heat provided
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
  let activeRecipe: string | null = null;

  // Phase 11: Animal housing properties
  let animalCapacity = 0;
  let allowedSpecies: string[] = [];
  let currentOccupants: string[] = [];
  let cleanliness = 100; // Start clean

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
  };
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
