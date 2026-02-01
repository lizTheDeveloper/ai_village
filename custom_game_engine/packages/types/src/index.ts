/**
 * @ai-village/types
 *
 * Shared type definitions for all @ai-village packages.
 * This package has ZERO dependencies to break circular import cycles.
 *
 * Usage:
 *   import type { IChunk, TerrainType, ILLMProvider } from '@ai-village/types';
 *
 * All types are re-exported from this index for convenience.
 */

// Common types
export type {
  EntityId,
  ComponentType,
  Tick,
  GameTime,
  Season,
  FeatureFlags,
  Priority,
  ComponentBase,
} from './common.js';

// Chunk and world types
export type {
  IChunk,
  IChunkManager,
  ITerrainGenerator,
  IBackgroundChunkGenerator,
  IPlanetConfig,
  IPlanet,
  IWorld,
  IWorldMutator,
  IEntity,
} from './chunk.js';

// Terrain types
export type {
  TerrainType,
  BiomeType,
  TerrainFeatureType,
  TerrainFeature,
  TerrainAnalyzer,
  TerrainCache,
  TerrainDescriptionCacheStatic,
  TileNutrients,
  ITile,
} from './terrain.js';

// Building types
export type {
  IWallTile,
  IDoorTile,
  IWindowTile,
  BlueprintResourceCost,
  BlueprintSkillRequirement,
  IBlueprint,
  IBuildingRegistry,
} from './building.js';

// LLM types
export type {
  DecisionLayer,
  LayerSelectionResult,
  LLMDecisionResult,
  SchedulerAgentState,
  CustomLLMConfig,
  ILLMScheduler,
  ILLMDecisionQueue,
  LLMRequest,
  LLMResponse,
  ProviderPricing,
  ILLMProvider,
} from './llm.js';

// Language types
export type {
  WordData,
  LanguageProficiency,
  ILanguageComponent,
  ILanguageKnowledgeComponent,
  LanguageComponent,
  LanguageKnowledgeComponent,
} from './language.js';

// Metrics types
export type {
  PerformanceStats,
  IMetricsStreamClient,
  IMetricsAPI,
  ILiveEntityAPI,
} from './metrics.js';
