/**
 * Buildings module - Building blueprints and placement validation.
 */

// Export specific items from BuildingBlueprintRegistry to avoid SkillRequirement conflict
export { BuildingBlueprintRegistry } from './BuildingBlueprintRegistry.js';

export * from './PlacementValidator.js';
export * from './ShopBlueprints.js';

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
