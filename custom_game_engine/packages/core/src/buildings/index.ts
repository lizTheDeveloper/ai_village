/**
 * Buildings module - Building blueprints and placement validation.
 */

export * from './BuildingBlueprintRegistry.js';
export * from './PlacementValidator.js';

// Re-export types explicitly (export * doesn't re-export types)
export type {
  BuildingCategory,
  BuildingFunction,
  ResourceCost,
  BuildingBlueprint
} from './BuildingBlueprintRegistry.js';

export type {
  PlacementErrorType,
  PlacementError,
  PlacementWarning,
  PlacementValidationResult
} from './PlacementValidator.js';
