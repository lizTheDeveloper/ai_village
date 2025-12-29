/**
 * @ai-village/core - Game engine core
 *
 * Entity-Component-System architecture with:
 * - Events for system communication
 * - Actions for agent intent
 * - Serialization for save/load
 * - Fixed 20 TPS game loop
 */

export * from './types.js';
export * from './ecs/index.js';
export * from './events/index.js';
export * from './actions/index.js';
export * from './serialization/index.js';
export * from './loop/index.js';
export * from './components/index.js';
export * from './systems/index.js';
export * from './buildings/index.js';
export * from './archetypes/index.js';
export * from './types/PlantSpecies.js';
export * from './genetics/PlantGenetics.js';
export * from './data/index.js';
export * from './metrics/events/index.js';
// Metrics module - selective exports to avoid type conflicts with research module
// NOTE: MetricsStorage uses Node.js 'fs' module - import directly from individual files to avoid bundling fs
export { MetricsCollector } from './metrics/MetricsCollector.js';
// MetricsStorage excluded - uses Node.js fs module, import directly for Node.js environments:
// import { MetricsStorage } from '@ai-village/core/metrics/MetricsStorage.js';
export { MetricsAnalysis } from './metrics/MetricsAnalysis.js';
export { MetricsDashboard } from './metrics/MetricsDashboard.js';
export { RingBuffer } from './metrics/RingBuffer.js';
export { MetricsAPI } from './metrics/api/MetricsAPI.js';
export { MetricsLiveStream } from './metrics/api/MetricsLiveStream.js';
// Browser-compatible streaming client
export { MetricsStreamClient, type MetricsStreamConfig, type ConnectionState, type StreamStats, type QueryRequest, type QueryResponse, type QueryHandler } from './metrics/MetricsStreamClient.js';
// Live Entity API for dashboard queries
export { LiveEntityAPI, type PromptBuilder, type EntitySummary, type EntityDetails } from './metrics/LiveEntityAPI.js';
// Analyzers
export {
  NetworkAnalyzer,
  SpatialAnalyzer,
  InequalityAnalyzer,
  CulturalDiffusionAnalyzer,
} from './metrics/analyzers/index.js';
export * from './crafting/index.js';
export * from './economy/index.js';

// Items module - exclude functions already exported from InventoryComponent
// (createSeedItemId, getSeedSpeciesId). These will be migrated in Phase 2.
export {
  // Core types
  type ItemDefinition,
  type ItemCategory,
  type ItemRarity,
  type CraftingIngredient,
  defineItem,
  // Registry
  ItemRegistry,
  ItemNotFoundError,
  DuplicateItemError,
  itemRegistry,
  // Default items
  DEFAULT_ITEMS,
  RESOURCE_ITEMS,
  FOOD_ITEMS,
  MATERIAL_ITEMS,
  TOOL_ITEMS,
  registerDefaultItems,
  // Seed factory (excluding duplicates from InventoryComponent)
  SEED_PREFIX,
  isSeedItemId,
  createSeedItem,
  DEFAULT_SEEDS,
  registerDefaultSeeds,
  registerSeedsForSpecies,
  type PlantSpeciesInfo,
  // Data-driven loading
  ItemLoader,
  ItemValidationError,
  parseItemData,
  parseItemsFromJson,
  loadItemsFromJson,
  loadItemsFromJsonString,
  type RawItemData,
  // Quality system (Phase 10)
  type ItemQuality,
  getQualityTier,
  getQualityColor,
  getQualityDisplayName,
  calculateCraftingQuality,
  calculateHarvestQuality,
  calculateGatheringQuality,
  getQualityPriceMultiplier,
  DEFAULT_QUALITY,
} from './items/index.js';

// Animal behaviors
export {
  AnimalBrainSystem,
  createAnimalBrainSystem,
  type BehaviorRegistry,
  type IAnimalBehavior,
  type AnimalBehaviorResult,
  BaseAnimalBehavior,
  GrazeBehavior,
  FleeBehavior,
  RestBehavior,
  IdleBehavior,
} from './behavior/animal-behaviors/index.js';

// Navigation and spatial knowledge
export * from './navigation/index.js';

// Services (shared behavior APIs) - explicit exports to avoid conflicts
export {
  // PlacementScorer
  PlacementScorer,
  createPlacementScorer,
  BUILDING_CONSTRAINTS,
  BUILDING_UTILITY_WEIGHTS,
  type PlacementCandidate,
  type PlacementConstraint,
  type PlacementWeights,
} from './services/PlacementScorer.js';

// Note: MovementAPI, TargetingAPI, InteractionAPI are re-exported
// with conflicts from components. Import from @ai-village/core/services
// if you need those specific APIs.

// Storage context utilities
export {
  calculateStorageStats,
  formatStorageStats,
  suggestBuildingFromStorage,
  type StorageStats,
} from './utils/StorageContext.js';

// Knowledge and affordances for LLM reasoning
export * from './knowledge/index.js';

// Research & Discovery system (Phase 13)
export * from './research/index.js';
