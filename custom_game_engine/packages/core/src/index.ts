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
// Re-export ComponentType enum for test compatibility
export { ComponentType } from './types/ComponentType.js';
export * from './ecs/index.js';
// Explicit ECS type re-exports for renderer package (excluding World which comes from World.js)
export type { WorldMutator, Entity, ITile, TerrainType, Component } from './ecs/index.js';
export { EntityImpl, createEntityId } from './ecs/index.js';
// Export concrete World class (not just the interface from ecs/index.js)
export { World } from './World.js';
export * from './events/index.js';
// Explicit EventBus type re-export
export type { EventBus } from './events/index.js';
export * from './actions/index.js';
export * from './serialization/index.js';
export * from './loop/index.js';
export * from './debug/index.js';
export * from './components/index.js';

// Diagnostics
export { diagnosticsHarness } from './diagnostics/DiagnosticsHarness.js';
export type { DiagnosticIssue } from './diagnostics/DiagnosticsHarness.js';
export { wrapEntity, wrapComponent, wrapWorld, wrapObject } from './diagnostics/ProxyWrappers.js';
// Explicit component type and value re-exports for renderer and world packages
export type { Relationship, RelationshipComponent } from './components/index.js';
export {
  DeityComponent,
  PlantComponent,
  derivePrioritiesFromSkills
} from './components/index.js';
export * from './systems/index.js';
export { WildAnimalSpawningSystem } from './systems/index.js';
// Explicit system type re-exports
export type { PossessionStatus } from './systems/PossessionSystem.js';
export * from './factories/index.js';
export * from './species/index.js';
export * from './skills/index.js';
export * from './buildings/index.js';
export * from './city/index.js';
export {
  type BuildingBlueprint,
  type BuildingCategory,
  type BuildingFunction,
  BuildingBlueprintRegistry,
  PlacementValidator,
  type PlacementValidationResult,
  type PlacementError,
  type ResourceCost,
  getTileBasedBlueprintRegistry,
  calculateDimensions,
} from './buildings/index.js';
export * from './magic/index.js';
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
export * from './types/LLMTypes.js';
export type {
  LLMRequest,
  LLMResponse,
  LLMProvider,
  ProviderPricing,
} from './types/LLMTypes.js';
export * from './genetics/PlantGenetics.js';
export * from './data/index.js';
// Metrics module - Moved to @ai-village/metrics package
// Import from: import { MetricsCollector, MetricsAnalysis, ... } from '@ai-village/metrics';
// LiveEntityAPI still lives in core for now
export { LiveEntityAPI, type QueryRequest, type QueryResponse } from './metrics/index.js';
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

// Feng Shui Analyzer - Building spatial harmony analysis
export {
  FengShuiAnalyzer,
  fengShuiAnalyzer,
  type BuildingLayout,
  TILE_SYMBOLS,
} from './services/FengShuiAnalyzer.js';

// Aerial Feng Shui Analyzer - 3D spatial harmony for flying creatures
export {
  AerialFengShuiAnalyzer,
  aerialFengShuiAnalyzer,
} from './services/AerialFengShuiAnalyzer.js';

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

// Persistence layer - Core persistence implementation
export {
  SaveLoadService,
  saveLoadService,
  type SaveOptions,
  type LoadResult,
  type CanonEvent,
  type CanonEventType,
} from './persistence/SaveLoadService.js';

export { SaveStateManager } from './persistence/SaveStateManager.js';
export type { SaveMetadata, SaveState, SaveListEntry } from './persistence/SaveStateManager.js';

export { IndexedDBStorage } from './persistence/storage/IndexedDBStorage.js';
export { MemoryStorage } from './persistence/storage/MemoryStorage.js';

export { worldSerializer, WorldSerializer } from './persistence/WorldSerializer.js';
export type { TimelineSnapshot } from './persistence/WorldSerializer.js';

export { componentSerializerRegistry, BaseComponentSerializer } from './persistence/ComponentSerializerRegistry.js';
export { migrationRegistry, MigrationRegistry } from './persistence/MigrationRegistry.js';

export {
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
} from './persistence/utils.js';

export type {
  Versioned,
  VersionedComponent,
  VersionedEntity,
  SaveFile,
  SaveFileHeader,
  SaveMetadata as PersistenceSaveMetadata,
  MultiverseSnapshot,
  MultiverseTime,
  UniverseSnapshot,
  UniverseTime,
  WorldSnapshot,
  StorageBackend,
  StorageInfo,
  Migration,
  MigrationContext,
  ComponentSerializer,
} from './persistence/types.js';

export { validateSaveFile, validateWorldState, InvariantViolationError } from './persistence/InvariantChecker.js';
export { compress, decompress, formatBytes, getCompressionRatio } from './persistence/compression.js';
export { MigrationError, SerializationError, ValidationError, ChecksumMismatchError } from './persistence/types.js';

// Multiverse system - Multiple universes with independent time scales
// Note: Explicit exports only to avoid esbuild module resolution issues
export { multiverseCoordinator } from './multiverse/MultiverseCoordinator.js';
export type { UniverseConfig, UniverseInstance, PassageConnection } from './multiverse/MultiverseCoordinator.js';
export { timelineManager, TimelineManager } from './multiverse/TimelineManager.js';
export type { TimelineConfig, TimelineEntry, IntervalThreshold } from './multiverse/TimelineManager.js';
export { MultiverseNetworkManager, initializeNetworkManager, getNetworkManager, networkManager } from './multiverse/MultiverseNetworkManager.js';
export type { RemotePassage, RemotePassageConfig, NetworkMessage, ViewMode, InteractionMode, StreamConfiguration, Bounds, PeerId, PassageId, UniverseId as MultiverseUniverseId, UniverseSnapshotMessage, UniverseTickUpdate, EntityTransferMessage, EntityTransferAckMessage } from './multiverse/NetworkProtocol.js';
export { GodChatRoomNetwork } from './multiverse/GodChatRoomNetwork.js';
export type { ChatMessage, ChatMember, ChatRoom } from './multiverse/GodChatRoomNetwork.js';

// Trade agreement system - Cross-universe/multiverse trade with Hilbert-time
export * from './trade/TradeAgreementTypes.js';
export {
  determineTradeScope,
  calculateEscrowRequirement,
  calculateTradeFacilitationCost,
  estimateDeliveryTime,
} from './trade/TradeAgreementTypes.js';
export type {
  TradeScope,
  CivilizationIdentity,
  TradeTerm,
  TradeAgreement,
  NegotiationState,
  CounterOffer,
  TradeAgreementEvent,
  AgreementStatus,
  CrossRealmMetadata,
} from './trade/TradeAgreementTypes.js';

// Hilbert-time - Multi-dimensional temporal coordinates for causal ordering
export * from './trade/HilbertTime.js';
export {
  compareTimeCoordinates,
  isBranchAncestor,
  findCommonBranchAncestor,
  isCausallyDependent,
  advanceTime,
  syncWithUniverse,
  forkTimeline,
  detectCausalViolation,
  createRootTimeCoordinate,
  serializeTimeCoordinate,
  deserializeTimeCoordinate,
} from './trade/HilbertTime.js';
export type {
  HilbertTimeCoordinate,
  CausalReference,
  TimeOrdering,
  CausalViolation,
} from './trade/HilbertTime.js';

// Mayor negotiation - LLM-driven trade agreement negotiation
export { MayorNegotiator, createCivilizationContext } from './trade/MayorNegotiator.js';
export type { NegotiationDecision, CivilizationContext } from './trade/MayorNegotiator.js';

// Cross-realm communication - Inter-universe phones (Clarketech tier 7-8)
export * from './communication/CrossRealmCommunication.js';
export {
  createCrossRealmPhone,
  initiateCall,
  answerCall,
  rejectCall,
  endCall,
  sendMessage,
  receiveMessage,
  addContact,
  chargePhone,
  addEnchantment,
  sendEmergencyBeacon,
  startConference,
  calculateSignalQuality,
  calculateLatency,
  calculateCallCost,
} from './communication/CrossRealmCommunication.js';
export type {
  CrossRealmPhone,
  CrossRealmPhoneTier,
  CrossRealmAddress,
  CrossRealmContact,
  PhoneEnchantment,
  CrossRealmCall,
  CrossRealmMessage,
  ConferenceCall,
} from './communication/CrossRealmCommunication.js';

// Cross-realm phone items
export { CROSS_REALM_PHONE_ITEMS } from './items/CrossRealmPhones.js';
export {
  BASIC_CROSS_REALM_PHONE,
  ADVANCED_CROSS_REALM_PHONE,
  TRANSCENDENT_MULTIVERSE_PHONE,
  RANGE_BOOST_RUNE,
  CLARITY_RUNE,
  PRIVACY_RUNE,
  RECORDING_RUNE,
  EMERGENCY_BEACON_RUNE,
  MULTI_PARTY_RUNE,
  MANA_CHARGING_STATION,
} from './items/CrossRealmPhones.js';

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

// Magic paradigm system - Moved to @ai-village/magic package
// Import from: import { MagicParadigm, SpellDefinition, ... } from '@ai-village/magic';

// Magic System Managers - UI integration support
export {
  SkillTreeManager,
  SpellLearningManager,
  ManaManager,
  CooldownManager,
  DivineSpellManager,
  SpellCaster,
} from './systems/magic/index.js';

// Divinity system - Universe configuration
export { createUniverseConfig } from './divinity/index.js';

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

// Reproduction System - Moved to @ai-village/reproduction package
// Import from: import { HUMAN_PARADIGM, SexualityComponent, PregnancyComponent, ... } from '@ai-village/reproduction';

// Conversation System - Deep conversation with quality metrics, partner selection, age-based styles
export * from './conversation/index.js';
export {
  // Quality metrics
  calculateConversationQuality,
  analyzeDepth,
  extractTopicsFromMessages,
  findSharedInterests,
  calculateTopicOverlap,
  analyzeInformationExchange,
  analyzeEmotionalContent,
  describeQuality,
  describeDepth,
  // Partner selection
  scorePartners,
  selectPartner,
  findBestPartnerInRange,
  calculateSharedInterestScore,
  calculateComplementaryScore,
  calculateAgeCompatibility,
  describePartnerSelection,
  // Conversation styles
  getConversationStyle,
  getDepthCapacity,
  getTopicPreferences,
  getTopicWeight,
  generateConversationStarter,
  generateQuestionPattern,
  calculateStyleCompatibility,
  describeConversationStyle,
  describeConversationDynamic,
  calculateAgeCategory,
  calculateAgeCategoryFromTick,
} from './conversation/index.js';

// Behavior module - BehaviorRegistry and handlers
// Note: BehaviorRegistry class - the animal BehaviorRegistry type alias is exported above
export {
  BehaviorRegistry as AgentBehaviorRegistry,
  getBehaviorRegistry,
  initBehaviorRegistry,
  registerBehavior,
  executeBehavior,
  type BehaviorHandler,
  type BehaviorMeta,
} from './behavior/index.js';

// Chunk spatial query injection functions
export {
  injectChunkSpatialQuery,
  injectChunkSpatialQueryForHearing,
} from './perception/index.js';

export {
  injectChunkSpatialQueryToMovement,
} from './systems/MovementSystem.js';

export {
  injectChunkSpatialQueryToFarmBehaviors,
} from './behavior/behaviors/FarmBehaviors.js';

export {
  injectChunkSpatialQueryToSeekFood,
} from './behavior/behaviors/SeekFoodBehavior.js';

export {
  injectChunkSpatialQueryToSeekCooling,
} from './behavior/behaviors/SeekCoolingBehavior.js';

export {
  injectChunkSpatialQueryToSleep,
} from './behavior/behaviors/SleepBehavior.js';

export {
  injectChunkSpatialQueryToGather,
} from './behavior/behaviors/GatherBehavior.js';

export {
  injectChunkSpatialQueryToBuild,
} from './behavior/behaviors/BuildBehavior.js';

export {
  injectChunkSpatialQueryForBrain,
} from './systems/AgentBrainSystem.js';

// Behaviors module - Extracted behavior implementations
export {
  navigateBehavior,
  exploreFrontierBehavior,
  exploreSpiralBehavior,
  followGradientBehavior,
} from './behaviors/index.js';

// Constants module - selective exports to avoid TICKS_PER_SECOND conflict with types.js
export {
  // TimeConstants (TICKS_PER_SECOND already in types.js)
  GAME_DAY_SECONDS,
  TICKS_PER_HOUR,
  TICKS_PER_DAY,
  DAWN_START_HOUR,
  DAY_START_HOUR,
  DUSK_START_HOUR,
  NIGHT_START_HOUR,
  LIGHT_LEVEL_NIGHT,
  LIGHT_LEVEL_DAWN_DUSK,
  LIGHT_LEVEL_DAY,
  TILL_DURATION_WITH_HOE,
  TILL_DURATION_WITH_SHOVEL,
  TILL_DURATION_BY_HAND,
  HARVEST_DURATION_BASE,
  GATHER_SEEDS_DURATION,
  TRADE_DURATION,
  GATHER_RESOURCE_BASE_TICKS,
  GATHER_SPEED_PER_SKILL_LEVEL,
  MONOLOGUE_INTERVAL,
  OBSERVE_MAX_DURATION,
  PRACTICE_MAX_DURATION,
  REFLECT_MAX_DURATION,
  SLEEP_MIN_HOURS,
  SLEEP_MAX_HOURS,
  MARKET_EVENT_CHECK_INTERVAL,
  CLEANLINESS_UPDATE_INTERVAL,
} from './constants/TimeConstants.js';
export * from './constants/SpatialConstants.js';
export * from './constants/NeedsConstants.js';
export * from './constants/GameplayConstants.js';

// Decision module - Agent decision processors
export {
  // Orchestrator
  DecisionProcessor,
  type DecisionResult,
  // Autonomic
  AutonomicSystem,
  checkAutonomicNeeds,
  isCriticalBehavior,
  type AutonomicResult,
  // Behavior priority
  getBehaviorPriority,
  getBehaviorPriorityConfig,
  canInterrupt,
  isCriticalSurvivalBehavior,
  getSortedBehaviors,
  type BehaviorPriorityConfig,
  // LLM decisions
  LLMDecisionProcessor,
  initLLMDecisionProcessor,
  getLLMDecisionProcessor,
  type LLMDecisionResult,
  type LLMDecisionQueue,
  // Scheduled decisions
  ScheduledDecisionProcessor,
  type ScheduledDecisionResult,
  // Scripted decisions
  ScriptedDecisionProcessor,
  processScriptedDecision,
  type ScriptedDecisionResult,
  // Spell utility
  SpellUtilityCalculator,
  suggestSpells,
  type SpellSuggestion,
  type SpellUtilityContext,
} from './decision/index.js';

// Help module - Self-documenting wiki system
export {
  type HelpEntry,
  type ItemHelpEntry,
  type EffectHelpEntry,
  type BuildingHelpEntry,
  type HelpExample,
  type HelpMechanics,
  HelpRegistry,
  helpRegistry,
  type HelpQuery,
  MarkdownWikiGenerator,
  JsonWikiGenerator,
  type WikiOptions,
  createHelpEntry,
  createItemHelp,
  createEffectHelp,
} from './help/index.js';

// Perception module - Vision, hearing, meeting detection
export {
  PerceptionProcessor,
  VisionProcessor,
  processVision,
  type VisionResult,
  HearingProcessor,
  processHearing,
  canHear,
  getAgentsInHearingRange,
  type HeardSpeech,
  type HearingResult,
  MeetingDetector,
  processMeetingCalls,
  isMeetingCall,
  type MeetingDetectionResult,
} from './perception/index.js';

// Realms module - Mythological pocket dimensions
// Selective exports to avoid TransitionEffect conflict with PlantSpecies
export {
  // Types
  type RealmCategory,
  type RealmSize,
  type TimeFlowType,
  type AccessMethod,
  type AccessRestriction,
  type RealmLaw,
  type RealmProperties,
  type RealmTransitionResult,
  // TransitionEffect conflicts with PlantSpecies - skipped
  type RealmInhabitant,
  // Definitions
  UnderworldRealm,
  CelestialRealm,
  DreamRealm,
  REALM_REGISTRY,
  getRealmDefinition,
  getAllRealmDefinitions,
  // Transitions
  transitionToRealm,
  returnToMortalWorld,
  // Initialization
  createRealmEntity,
  initializeUnderworld,
  initializeCelestialRealm,
  initializeDreamRealm,
  initializeAllRealms,
} from './realms/index.js';

// Targeting module - Domain-specific targeting
export {
  ResourceTargeting,
  type ResourceTargetingOptions,
  PlantTargeting,
  type PlantTargetingOptions,
  BuildingTargeting,
  type BuildingTargetingOptions,
  AgentTargeting,
  type AgentTargetingOptions,
  ThreatTargeting,
  type ThreatTargetingOptions,
} from './targeting/index.js';

// Component utilities
export {
  safeUpdateComponent,
  setComponentProperty,
  setComponentProperties,
} from './utils/componentUtils.js';

export {
  // Typed component getters
  getAgent,
  getPosition,
  getMovement,
  getNeeds,
  getInventory,
  getVision,
  getMemory,
  getSpatialMemory,
  getEpisodicMemory,
  getSemanticMemory,
  getReflection,
  getConversation,
  getSocialGradient,
  getTrustNetwork,
  getBelief,
  getRelationship,
  getSteering,
  getVelocity,
  getCircadian,
  getTemperature,
  getIdentity,
  getPersonality,
  getPlant,
  getAnimal,
  getBuilding,
  getResource,
  // Utilities
  hasComponents,
  requireAgent,
  requirePosition,
  requireNeeds,
  requireInventory,
  requireSteering,
  requireVelocity,
} from './utils/componentHelpers.js';

// Communication module (chat rooms, DMs, groups)
export * from './communication/index.js';

// Television module (TV stations, shows, broadcasting)
export * from './television/index.js';

// Navigation module (spaceships, β-space, emotional topology)
export * from './navigation/index.js';

// Virtual Reality module (VR systems, emotional experiences)
export * from './vr/index.js';

// Microgenerators core infrastructure (god-crafted content queue & discovery)
// Note: Microgenerator implementations (RiddleBook, SpellLab, Culinary) are in
// microgenerators-server and kept separate from main build
export * from './microgenerators/types.js';
export { GodCraftedQueue, godCraftedQueue } from './microgenerators/GodCraftedQueue.js';
export { GodCraftedDiscoverySystem, type ChunkSpawnInfo } from './microgenerators/GodCraftedDiscoverySystem.js';

// Botany module dependencies - Plant system constants and utilities
export { PLANT_CONSTANTS } from './systems/constants/PlantConstants.js';
export { BugReporter, type BugReport } from './utils/BugReporter.js';
