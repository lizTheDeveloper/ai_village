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

// === Clarketech Research (Tier 6-8) ===
export {
  CLARKETECH_RESEARCH,
  registerClarketechResearch,
  getClarketechTierLabel,
  isClarketechResearch,
  getClarketechTier,
} from './clarketechResearch.js';

// === Academic Paper System ===
export {
  AcademicPaperSystem,
  AcademicPaperManager,
  getAcademicPaperSystem,
  resetAcademicPaperSystem,
  type AcademicPaper,
  type Author,
  type ResearchBibliography,
  type CitationEvent,
} from './AcademicPaperSystem.js';

// === Inventor Fame System ===
export {
  InventorFameSystem,
  InventorFameManager,
  getInventorFameSystem,
  resetInventorFameSystem,
  type Inventor,
  type DiscoveryCredit,
  type InventorTitle,
  type TitleRequirement,
  type FameTier,
  type NewsAnnouncement,
} from './InventorFameSystem.js';

// === Publication System (Writing Technology) ===
export {
  PublicationSystem,
  PublicationManager,
  getPublicationSystem,
  resetPublicationSystem,
  WritingTechLevel,
  getWritingTechName,
  getRequiredTechLevel,
  generatePublicationTitle,
  type Publication,
  type PublicationType,
  type PublicationCategory,
  type RecipePublication,
  type BotanicalPublication,
  type ChroniclePublication,
} from './PublicationSystem.js';

// === Herbalist Discovery System ===
export {
  HerbalistDiscoverySystem,
  getHerbalistDiscoverySystem,
  resetHerbalistDiscoverySystem,
  generateBotanicalPaper,
  type PlantDiscovery,
  type HerbalistDiscoveryComponent,
} from './HerbalistDiscoverySystem.js';

// === Cook Influencer System ===
export {
  CookInfluencerSystem,
  getCookInfluencerSystem,
  resetCookInfluencerSystem,
  type CookPublicationComponent,
} from './CookInfluencerSystem.js';

// === Chronicler System ===
export {
  ChroniclerSystem,
  getChroniclerSystem,
  resetChroniclerSystem,
  type HistoricalEventType,
  type HistoricalEvent,
  type ChroniclerComponent,
} from './ChroniclerSystem.js';
