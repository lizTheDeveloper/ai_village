/**
 * Shared Services for Multiverse: The End of Eternity Game Engine
 *
 * These services provide common functionality that can be used by both
 * AgentBrainSystem and AnimalBrainSystem. They solve the code duplication
 * problem and provide a single source of truth for movement, targeting,
 * and interaction logic.
 *
 * Part of Phase 0 of the AISystem decomposition (work-order: ai-system-refactor)
 */

// Movement API - Centralized movement control
export {
  MovementAPI,
  stopMovement,
  setVelocity,
  moveToward,
  distanceTo,
  isAdjacent,
  moveToAndStop,
  enableSteering,
  isSteeringActive,
  type SteeringBehavior,
  type Position,
} from './MovementAPI.js';

// Targeting API - Perception-limited targeting
export {
  TargetingAPI,
  findNearestVisible,
  findAllVisible,
  getRememberedLocation,
  rememberLocation,
  forgetLocation,
  findTarget,
  isMemoryStale,
  // Filter factory functions
  hasComponent,
  isResourceType,
  isHarvestableResource,
  isBuildingType,
  isOtherAgent,
  isEdiblePlant,
  hasSeedsToGather,
  isPlantSpecies,
  combineFilters,
  anyFilter,
  // Plant registry for extensibility
  registerPlantSpecies,
  getPlantClassification,
  isEdibleSpecies,
  type TargetResult,
  type EntityFilter,
  type TargetingOptions,
  type PlantClassification,
} from './TargetingAPI.js';

// Interaction API - Entity interactions (harvest, eat, deposit)
export {
  InteractionAPI,
  harvest,
  eat,
  eatFromStorage,
  eatFromPlant,
  deposit,
  pickup,
  canHarvest,
  hasFood,
  getFoodCount,
  type InteractionResult,
  type HarvestOptions,
} from './InteractionAPI.js';

// Placement Scorer - Intelligent building placement
export {
  PlacementScorer,
  createPlacementScorer,
  BUILDING_CONSTRAINTS,
  BUILDING_UTILITY_WEIGHTS,
  type PlacementCandidate,
  type PlacementConstraint,
  type PlacementWeights,
} from './PlacementScorer.js';

// Feng Shui Analyzers - Spatial harmony analysis
export { fengShuiAnalyzer, FengShuiAnalyzer } from './FengShuiAnalyzer.js';
export { aerialFengShuiAnalyzer, AerialFengShuiAnalyzer } from './AerialFengShuiAnalyzer.js';

// Spatial Query Service - Unified API for spatial entity queries
export {
  type SpatialQueryService,
  type EntityWithDistance,
  type SpatialQueryOptions,
} from './SpatialQueryService.js';
