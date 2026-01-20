/**
 * Buildings module - Building blueprints and placement validation.
 */

// Export specific items from BuildingBlueprintRegistry to avoid SkillRequirement conflict
export { BuildingBlueprintRegistry, buildingBlueprintRegistry } from './BuildingBlueprintRegistry.js';

export * from './PlacementValidator.js';
export { PlacementValidator } from './PlacementValidator.js';
export * from './ShopBlueprints.js';
export * from './GovernanceBlueprints.js';
export * from './TempleBlueprints.js';
export * from './FarmBlueprints.js';
export * from './MidwiferyBlueprints.js';
export * from './ShipyardBlueprints.js';

// Tile-Based Voxel Building System (Phase 3)
export * from './TileBasedBlueprintRegistry.js';
export {
  TileBasedBlueprintRegistry,
  parseLayout,
  rotateLayout,
  calculateResourceCost,
  calculateDimensions,
  validateTileBasedBlueprint,
  createTileBasedBlueprint,
  defaultTileBasedBlueprintRegistry,
  getTileBasedBlueprintRegistry,
} from './TileBasedBlueprintRegistry.js';
export type {
  TilePosition,
  TileType,
  ParsedTile,
  MaterialDefaults,
  TileBasedBlueprint,
  WallMaterial,
  DoorMaterial,
  WindowMaterial,
} from './TileBasedBlueprintRegistry.js';

// Standard Voxel Buildings (new system with furniture support)
export * from './StandardVoxelBuildings.js';
export {
  SMALL_HOUSE,
  COZY_COTTAGE,
  STONE_HOUSE,
  LONGHOUSE,
  WORKSHOP,
  BARN,
  STORAGE_SHED,
  GUARD_TOWER,
  ALL_STANDARD_VOXEL_BUILDINGS,
  ALL_RESIDENTIAL,
  ALL_PRODUCTION,
  ALL_STORAGE,
  ALL_COMMUNITY,
  getBuildingsByCategory,
  getBuildingsByTier,
  getBuildingByName,
} from './StandardVoxelBuildings.js';

// Re-export building designer types for convenience
export type {
  VoxelBuildingDefinition,
  BuildingFloor,
  BuildingCategory as VoxelBuildingCategory,
} from '@ai-village/building-designer';

// Re-export types explicitly (export * doesn't re-export types)
export type {
  BuildingCategory,
  BuildingFunction,
  ResourceCost,
  BuildingBlueprint,
  SkillRequirement as BuildingSkillRequirement
} from './BuildingBlueprintRegistry.js';

export type {
  PlacementErrorType,
  PlacementError,
  PlacementWarning,
  PlacementValidationResult
} from './PlacementValidator.js';

// Automation Buildings (Phase 38)
export * from './AutomationBuildings.js';
export type { BuildingDefinition } from './AutomationBuildings.js';

// Species-Specific Buildings (Elven, Centaur, Angelic, High Fae)
export * from './SpeciesBuildings.js';
export {
  // Elven
  ELVEN_MOONLIT_TREEHOUSE,
  ELVEN_MEDITATION_BOWER,
  ELVEN_LIVING_WOOD_LIBRARY,
  ELVEN_ENCHANTED_FORGE,
  ELVEN_STARLIGHT_SANCTUARY,
  ALL_ELVEN_BUILDINGS,
  // Centaur
  CENTAUR_STABLE,
  CENTAUR_CLAN_HALL,
  CENTAUR_OPEN_SMITHY,
  CENTAUR_TRAINING_SHELTER,
  CENTAUR_WAR_COUNCIL,
  ALL_CENTAUR_BUILDINGS,
  // Angelic
  ANGELIC_PRAYER_SPIRE,
  ANGELIC_CHOIR_TOWER,
  ANGELIC_CELESTIAL_ARCHIVES,
  ANGELIC_MEDITATION_SANCTUM,
  ALL_ANGELIC_BUILDINGS,
  // High Fae (10D)
  HIGH_FAE_FOLDED_MANOR,
  HIGH_FAE_CHRONODREAM_SPIRE,
  HIGH_FAE_TESSERACT_COURT,
  HIGH_FAE_BETWEEN_SPACE_WORKSHOP,
  ALL_HIGH_FAE_BUILDINGS,
  // Collections
  BUILDINGS_BY_SPECIES,
  ALL_SPECIES_BUILDINGS,
  getBuildingsForSpecies,
} from './SpeciesBuildings.js';
