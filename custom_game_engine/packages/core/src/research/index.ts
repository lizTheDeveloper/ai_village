/**
 * Research System - Public API
 *
 * Phase 13: Research & Discovery system for unlocking content,
 * procedural generation, and capability evolution.
 *
 * Usage:
 * ```typescript
 * import {
 *   ResearchRegistry,
 *   UnlockQueryService,
 *   registerDefaultResearch,
 * } from './research';
 *
 * // Initialize registry with default tech tree
 * registerDefaultResearch();
 *
 * // Query unlock status
 * const unlockService = new UnlockQueryService(researchState, ResearchRegistry.getInstance());
 * if (unlockService.isRecipeUnlocked(['metallurgy_i'])) {
 *   // Show iron recipes
 * }
 * ```
 */

// === Types ===
export type {
  ResearchField,
  ResearchUnlock,
  ResearchMaterialRequirement,
  GenerationContext,
  ResearchDefinition,
  ResearchProgress,
  Insight,
  TechTreeNode,
  ResearchValidationResult,
  CapabilityGap,
  CapabilityRequest,
  GenerationConstraints,
  GeneratedContent,
  GeneratedItem,
  GeneratedRecipe,
  GeneratedResearch,
  ExperimentResult,
  PerformanceSample,
  NeedsSample,
  Milestone,
} from './types.js';

// === Registry ===
export {
  ResearchRegistry,
  DuplicateResearchError,
  ResearchNotFoundError,
  InvalidPrerequisiteError,
  InvalidGeneratedResearchError,
} from './ResearchRegistry.js';

// === Query Service ===
export { UnlockQueryService, type UnlockProgress } from './UnlockQueryService.js';

// === Default Research ===
export {
  registerDefaultResearch,
  getResearchByTier,
  getTotalResearchCount,
  DEFAULT_RESEARCH,
  TIER_1_RESEARCH,
  TIER_2_RESEARCH,
  TIER_3_RESEARCH,
  TIER_4_RESEARCH,
  TIER_5_RESEARCH,
} from './defaultResearch.js';
