/**
 * Buildings module - Building blueprints and placement validation.
 */

// Export specific items from BuildingBlueprintRegistry to avoid SkillRequirement conflict
export { BuildingBlueprintRegistry } from './BuildingBlueprintRegistry.js';

export * from './PlacementValidator.js';
export { PlacementValidator } from './PlacementValidator.js';
export * from './ShopBlueprints.js';
export * from './GovernanceBlueprints.js';
export * from './TempleBlueprints.js';
export * from './FarmBlueprints.js';
export * from './MidwiferyBlueprints.js';

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
