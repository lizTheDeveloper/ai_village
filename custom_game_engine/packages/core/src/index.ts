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
export type { EntityId, SystemId } from './types.js';
export * from './ecs/index.js';
export * from './events/index.js';
export * from './actions/index.js';
export * from './serialization/index.js';
export * from './loop/index.js';
export * from './components/index.js';
export * from './systems/index.js';
export { WildAnimalSpawningSystem } from './systems/index.js';
export * from './species/index.js';
export * from './buildings/index.js';
export {
  type BuildingBlueprint,
  type BuildingCategory,
  type BuildingFunction,
  BuildingBlueprintRegistry,
  PlacementValidator,
  type PlacementValidationResult,
  type PlacementError,
  type ResourceCost,
} from './buildings/index.js';
export * from './archetypes/index.js';
export * from './types/PlantSpecies.js';
export type { PlantSpecies } from './types/PlantSpecies.js';
export * from './types/PlantDisease.js';
export type {
  DiseaseType,
  PestType,
  PlantDisease,
  PlantPest,
  PlantDiseaseState,
  PlantPestState,
} from './types/PlantDisease.js';
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
export {
  globalRecipeRegistry,
  type Recipe,
  type CraftingJob,
  CraftingSystem,
} from './crafting/index.js';
export * from './economy/index.js';
export {
  calculateBuyPrice,
  calculateSellPrice,
} from './economy/index.js';

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
  // Trait system (Phase 29)
  type ItemTraits,
  type EdibleTrait,
  type EdibleFlavorType,
  type WeaponTrait,
  type DamageType,
  type MagicalTrait,
  type EffectExpression,
  type ContainerTrait,
  type ToolTrait,
  type ToolType,
  // Item instances (Phase 29)
  type ItemInstance,
  type ItemQualityTier,
  getItemQualityTier,
  ItemInstanceRegistry,
  itemInstanceRegistry,
  // Migration utilities (Phase 29)
  migrateItemDefinitionV1toV2,
  migrateItemDefinitions,
  isItemDefinitionV1,
  isItemDefinitionV2,
  getEffectiveEdibleData,
  // Armor trait (forward-compatibility)
  type ArmorTrait,
  type ArmorSlot,
  // Artifact system (forward-compatibility)
  type StrangeMoodType,
  type MoodMaterialRequirement,
  type StrangeMood,
  type DecorationType,
  type ArtifactImage,
  type ArtifactImageSubject,
  type ArtifactDecoration,
  type ArtifactRarity,
  type Artifact,
  type ArtifactHistoryEntry,
  type ArtifactEvent,
  type ArtifactRegistry,
  generateArtifactName,
  createArtifactFromMood,
  createMasterwork,
  recordArtifactEvent,
} from './items/index.js';

// Materials module (Phase 29)
export {
  type MaterialTemplate,
  type MaterialCategory,
  MaterialRegistry,
  materialRegistry,
  DEFAULT_MATERIALS,
  registerDefaultMaterials,
} from './materials/index.js';

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
export {
  getMapKnowledge,
  getZoneManager,
  type ZoneType,
  ZONE_COLORS,
  SECTOR_SIZE,
} from './navigation/index.js';

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
export { UnlockQueryService } from './research/index.js';

// Persistence layer - Save/Load with forward migration support
// Note: Selective exports to avoid conflicts with existing ./serialization module
export {
  // Services
  SaveLoadService,
  saveLoadService,
  worldSerializer,
  WorldSerializer,
  componentSerializerRegistry,

  // Storage backends
  IndexedDBStorage,
  MemoryStorage,

  // Types (namespaced to avoid conflicts)
  type SaveOptions,
  type LoadResult,
  type StorageBackend,
  type StorageInfo,
  type ComponentSerializer,

  // Utilities
  computeChecksum,
  computeChecksumSync,
  canonicalizeJSON,
  serializeBigInt,
  deserializeBigInt,
  assertDefined,
  assertType,
  assertFiniteNumber,
  assertOneOf,
  generateContentID,
  parseContentID,
  getGameVersion,

  // Errors
  MigrationError,
  SerializationError,
  ValidationError,
  ChecksumMismatchError,
} from './persistence/index.js';

// Multiverse system - Multiple universes with independent time scales
export * from './multiverse/index.js';
export { multiverseCoordinator } from './multiverse/index.js';

// Universe identity and provenance (forward-compatibility - Phases 31-34)
export {
  type UniverseId,
  type CreatorIdentity,
  type ProvenanceEntry,
  type Provenance,
  type EntityOrigin,
  type EffectPackage,
  type EffectLore,
  type TrustPolicy,
  createUniverseId,
  forkUniverseId,
  createSystemCreator,
  createAgentCreator,
  createProvenance,
  createDefaultTrustPolicy,
} from './universe/index.js';

// Magic paradigm system (forward-compatibility - Phase 30)
export * from './magic/index.js';
export {
  type MagicParadigm,
  type SpellDefinition,
  type ParadigmState,
  type PlayerSpellState,
  getMagicSystemState,
  getSpellRegistry,
  CORE_PARADIGM_REGISTRY,
  ANIMIST_PARADIGM_REGISTRY,
  WHIMSICAL_PARADIGM_REGISTRY,
  NULL_PARADIGM_REGISTRY,
  DIMENSIONAL_PARADIGM_REGISTRY,
} from './magic/index.js';

// Divinity system (forward-compatibility - Phase 31)
// Note: Prayer and PrayerType are already exported from components/SpiritualComponent
export {
  // Belief system
  type BeliefActivity,
  type BeliefGeneration,
  type BeliefCalculation,
  type DeityBeliefState,
  type BeliefDecayConfig,
  type BeliefAllocation,
  type BeliefRelationshipType,
  type BeliefTransfer,
  type BeliefTransferReason,
  type BeliefEvent,
  type BeliefEventType,
  BELIEF_GENERATION_RATES,
  BELIEF_THRESHOLDS,
  DEFAULT_BELIEF_DECAY,
  createInitialBeliefState,
  calculateBeliefGeneration,

  // Deity system
  type DivineDomain,
  type PerceivedPersonality,
  type MoralAlignment,
  type DescribedForm,
  type DeityIdentity,
  type DeityController,
  type DeityOrigin,
  type EmergencePhase,
  type Deity,
  type PlayerGodState,
  type BelieverRelation,
  createDefaultPersonality,
  createBlankIdentity,
  createEmergentIdentity,

  // Myth system
  type MythCategory,
  type MythStatus,
  type DisputeLevel,
  type TraitImplication,
  type NarrativeStructure,
  type MythElements,
  type MythCharacter,
  type MythTime,
  type Myth,
  type MutationType,
  type MythMutation,
  type StoryTelling,
  type TellingContext,
  type AudienceReaction,
  type MythConflict,
  type MythConflictType,
  type MythGenerationRequest,
  type MythTrigger,
  createMythTemplate,
  calculateMythInfluence,

  // Divine power system
  type PowerTier,
  type PowerCategory,
  type DivinePowerType,
  type DivinePower,
  type PowerVisibility,
  type PowerUseRequest,
  type PowerTarget,
  type PowerStyle,
  type PowerUseResult,
  type PowerEffect,
  type PowerFailureReason,
  type IdentityImplication,
  type IdentityRiskAssessment,
  type DomainPowerAffinity,
  // Prayer types are already exported from components - skipping
  type PrayerEmotion,
  type PrayerRequest,
  type PrayerResponse,
  type DivineVision,
  type VisionContent,
  type ActiveBlessing,
  type BlessingType,
  type ActiveCurse,
  type CurseType,
  type CurseLiftCondition,
  POWER_TIER_THRESHOLDS,
  DOMAIN_POWER_AFFINITIES,
  getTierForBelief,
  canUsePower,
  getDomainCostModifier,
  createPrayer,

  // Pantheon system
  type PantheonStructure,
  type Pantheon,
  type PantheonPolitics,
  type PantheonFaction,
  type PantheonRelation,
  type DivineRelationship,
  type DivineRelationshipType,
  type DivineFeeling,
  type DivineFormalStatus,
  type RelationshipOrigin,
  type DivineMatter,
  type DivineMatterType,
  type DivineMatterOption,
  type DivineVote,
  type DiplomaticAction,
  type DiplomaticActionType,
  type DiplomaticTerms,
  type DiplomaticOffer,
  type DivineTreaty,
  type TreatyType,
  type TreatyTerm,
  type DivineConflict,
  type ConflictType,
  type ConflictSide,
  type ConflictPhase,
  type MortalImpact,
  type ConflictResolution,
  type DivineMeeting,
  type MeetingOutcome,
  type DivineChatMessage,
  createRelationship,
  createPantheon,
  calculateRelationshipStrength,
  getRelationshipSummary,

  // Divine chat system
  type DivineChatConfig,
  type DivineChatRoom,
  type TypingIndicator,
  type ChatMessageType,
  type MessageTone,
  type ChatStyle,
  type ChatQuirk,
  type MessageReaction,
  type ReactionType,
  type ChatNotification,
  type ChatNotificationType,
  type PrivateDMConversation,
  type PrivateDMMessage,
  type SendDMRequest,
  type ChatResponseRequest,
  type ChatResponseResult,
  type ChatEvent,
  type ChatEventType,
  type PlayerChatActions,
  type ChatStateSummary,
  DEFAULT_CHAT_CONFIG,
  createChatRoom,
  createEntryNotification,
  createChatMessage,
  getChatStyleFromPersonality,
  shouldChatBeActive,
  areDMsAvailable,
  formatNotification,

  // Avatar system
  type AvatarConfig,
  type Avatar,
  type AvatarForm,
  type AvatarFormType,
  type AvatarSize,
  type MovementType,
  type DivineTell,
  type DivineTellType,
  type AvatarStats,
  type AvatarState,
  type AvatarActivity,
  type AvatarStatusEffect,
  type AvatarDisguise,
  type AvatarAbility,
  type AvatarAbilityType,
  type AvatarInventoryItem,
  type AvatarEvent,
  type AvatarEventType,
  type AvatarPlayerActions,
  type AvatarInteraction,
  type AvatarInteractionAction,
  type ManifestAvatarRequest,
  type ManifestAvatarResult,
  type AvatarManifestFailure,
  DEFAULT_AVATAR_CONFIG,
  DEFAULT_AVATAR_STATS,
  createAvatarStats,
  createAvatarForm,
  calculateAvatarMaintenance,
  shouldForceWithdraw,

  // Angel system
  type AngelConfig,
  type Angel,
  type AngelType,
  type AngelRank,
  type AngelForm,
  type AngelAppearance,
  type AngelStats,
  type AngelState,
  type AngelActivity,
  type AngelStatusEffect,
  type AngelPersonality,
  type AngelAbility,
  type AngelAbilityType,
  type AngelOrders,
  type AngelOrderType,
  type AngelReport,
  type AngelEvent,
  type AngelEventType,
  type CreateAngelRequest,
  type CreateAngelResult,
  type AngelCreationFailure,
  DEFAULT_ANGEL_CONFIG,
  ANGEL_STATS_BY_RANK,
  createAngelStats,
  createAngelForm,
  createAngelPersonality,
  calculateAngelMaintenance,

  // Religion system
  type Temple,
  type TempleType,
  type TempleSize,
  type TempleFeature,
  type SacredObject,
  type ScheduledRitual,
  type Priest,
  type PriestRank,
  type PriestRole,
  type TheologicalPosition,
  type Ritual,
  type RitualType,
  type RitualFrequency,
  type RitualLocation,
  type RitualItem,
  type RitualEffect,
  type RitualStep,
  type HolyText,
  type HolyTextType,
  type HolyTextStatus,
  type ReligiousMovement,
  type ReligiousMovementType,
  type Schism,
  type SchismCause,
  type Syncretism,
  type SyncreticElement,
  type Conversion,
  type ConversionTrigger,
  createShrine,
  createRitual,
  calculateTempleBeliefBonus,
  calculatePriestEffectiveness,

  // Universe configuration
  type UniverseDivineConfig,
  type CoreDivineParams,
  type BeliefEconomyConfig,
  type PowerConfig,
  type PowerVisibilityConfig,
  type PrayerConfig,
  type VisionConfig,
  type BlessingConfig,
  type CurseConfig,
  type UniverseAvatarConfig,
  type UniverseAngelConfig,
  type PantheonConfig,
  type ReligionConfig,
  type EmergenceConfig,
  type ChatConfig,
  type DomainModifier,
  type RestrictionConfig,
  type DivinityFeature,
  type UniversePreset,
  getPresetConfig,
  getDefaultConfig,
  calculateEffectivePowerCost,
  calculateEffectiveRange,
  calculateEffectiveDuration,
  isPowerAvailable,
  isFeatureAvailable,
  mergeConfigs,
  createUniverseConfig,

  // Divine servant system
  type ServantTemplate,
  type ServantFormTemplate,
  type ServantFormCategory,
  type ServantComposition,
  type ServantMovement,
  type ServantAppendage,
  type ServantCommunication,
  type ServantPersonalityTemplate,
  type ServantMortalAttitude,
  type ServantAbilityTemplate,
  type ServantAbilityCategory,
  type ServantStats,
  type DivineServant,
  type ServantPersonalityInstance,
  type ServantState,
  type ServantStatusEffect,
  type ServantOrders,
  type EvolvedTrait,
  type DivineHierarchy,
  type GenerateServantTemplateRequest,
  type GenerateServantTemplateResult,
  type PlayerServantDesign,
  type ServantPowerGrant,
  type GrantedPower,
  type PowerManifestation,
  type PowerRestriction,
  type GrantPowerRequest,
  type GrantPowerResult,
  type GrantPowerFailure,
  POWER_BUDGET_BY_RANK,
  playerDesignToTemplate,
  createDivineHierarchy,
  createServantFromTemplate,
  calculateHierarchyMaintenance,
  calculatePowerBudgetCost,
  getPowerBudgetForRank,
  createServantPowerGrant,
  createPowerManifestation,
  EXAMPLE_WAR_GOD_HIERARCHY,
  EXAMPLE_NATURE_DEITY_HIERARCHY,
  EXAMPLE_COSMIC_HORROR_HIERARCHY,
} from './divinity/index.js';

// Dashboard module - Unified view definitions for Player UI and LLM Dashboard
export * from './dashboard/index.js';
export {
  type ViewData,
  type ViewContext,
  type ViewState,
  type DashboardView,
  type DashboardCategory,
  type RenderBounds,
  hasCanvasRenderer,
  defaultTheme,
  viewRegistry,
} from './dashboard/index.js';
