/**
 * Core stable components.
 */

export * from './PositionComponent.js';
export { createPositionComponent, type PositionComponent } from './PositionComponent.js';
export * from './PhysicsComponent.js';
export { createPhysicsComponent } from './PhysicsComponent.js';
export * from './RenderableComponent.js';
export { createRenderableComponent, type RenderableComponent } from './RenderableComponent.js';
export * from './AnimationComponent.js';
export { createAnimationComponent, type AnimationComponent } from './AnimationComponent.js';
export * from './TagsComponent.js';
export { createTagsComponent } from './TagsComponent.js';
export * from './AgentComponent.js';
export { createAgentComponent, derivePrioritiesFromSkills, type AgentComponent } from './AgentComponent.js';
export * from './MovementComponent.js';
export { createMovementComponent } from './MovementComponent.js';
export * from './NeedsComponent.js';
export { NeedsComponent } from './NeedsComponent.js';
export * from './ResourceComponent.js';
export { createResourceComponent, type ResourceComponent } from './ResourceComponent.js';
export * from './MemoryComponent.js';
export { MemoryComponent } from './MemoryComponent.js';
export * from './LLMHistoryComponent.js';
export { LLMHistoryComponent, createLLMHistoryComponent } from './LLMHistoryComponent.js';
export type { LLMInteraction, LLMLayer } from './LLMHistoryComponent.js';
export * from './VisionComponent.js';
export {
  createVisionComponent,
  createVisionForProfile,
  VISION_TIERS,
  VISION_PROFILES,
} from './VisionComponent.js';
export type { VisionComponent } from './VisionComponent.js';
export * from './ConversationComponent.js';
export { createConversationComponent } from './ConversationComponent.js';
export type { ConversationComponent } from './ConversationComponent.js';
export * from './RelationshipComponent.js';
export { createRelationshipComponent, ensureRelationshipComponent } from './RelationshipComponent.js';
export type { RelationshipComponent } from './RelationshipComponent.js';
export * from './JealousyComponent.js';
export { createJealousyComponent, JealousyComponent } from './JealousyComponent.js';
export type { JealousyTrigger, JealousyType } from './JealousyComponent.js';
export * from './PersonalityComponent.js';
export { PersonalityComponent } from './PersonalityComponent.js';
export * from './IdentityComponent.js';
export { generateRandomName, createIdentityComponent, type IdentityComponent } from './IdentityComponent.js';
// Export BuildingComponent - BuildingType is also exported from types.ts for convenience
export { BuildingType, type BuildingComponent, createBuildingComponent, canAccessBuilding, isUnderConstruction, getRemainingWork } from './BuildingComponent.js';
export * from './InventoryComponent.js';
export { calculateInventoryWeight, createInventoryComponent } from './InventoryComponent.js';
export type { InventoryComponent } from './InventoryComponent.js';
// Equipment system (Phase 36)
export * from './EquipmentComponent.js';
export * from './TemperatureComponent.js';
export { createTemperatureComponent, type TemperatureComponent } from './TemperatureComponent.js';
export * from './WeatherComponent.js';
export * from './TimeCompressionComponent.js';
export { createTimeCompressionComponent, type TimeCompressionComponent } from './TimeCompressionComponent.js';
export * from './TimeCompressionSnapshotComponent.js';
export { createTimeCompressionSnapshotComponent, type TimeCompressionSnapshotComponent, type EraSnapshot, type SoulTrajectory } from './TimeCompressionSnapshotComponent.js';
export * from './CircadianComponent.js';
export { createCircadianComponent, type CircadianComponent } from './CircadianComponent.js';
export * from './PlantComponent.js';
export * from './SeedComponent.js';
export * from './AnimalComponent.js';
export { AnimalComponent } from './AnimalComponent.js';
export * from './BioluminescentComponent.js';
export { BioluminescentComponent } from './BioluminescentComponent.js';
export * from './MeetingComponent.js';
export * from './EpisodicMemoryComponent.js';
export { EpisodicMemoryComponent } from './EpisodicMemoryComponent.js';
export * from './SemanticMemoryComponent.js';
export { SemanticMemoryComponent } from './SemanticMemoryComponent.js';
export * from './SocialMemoryComponent.js';
export { SocialMemoryComponent } from './SocialMemoryComponent.js';
export * from './ReflectionComponent.js';
export { ReflectionComponent } from './ReflectionComponent.js';
export * from './JournalComponent.js';
export { JournalComponent } from './JournalComponent.js';
// Navigation & Exploration components
export * from './SpatialMemoryComponent.js';
export { SpatialMemoryComponent } from './SpatialMemoryComponent.js';
export * from './NamedLandmarksComponent.js';
export * from './TrustNetworkComponent.js';
export { TrustNetworkComponent } from './TrustNetworkComponent.js';
export * from './BeliefComponent.js';
export { BeliefComponent } from './BeliefComponent.js';
export * from './SocialGradientComponent.js';
export { SocialGradientComponent } from './SocialGradientComponent.js';
export * from './ExplorationStateComponent.js';
export { ExplorationStateComponent } from './ExplorationStateComponent.js';
export * from './SteeringComponent.js';
export { createSteeringComponent } from './SteeringComponent.js';
export * from './VelocityComponent.js';
export { createVelocityComponent } from './VelocityComponent.js';
export * from './GatheringStatsComponent.js';
export { createGatheringStatsComponent } from './GatheringStatsComponent.js';
// Governance building components
export * from './governance.js';
export type { CensusBureauComponent } from './CensusBureauComponent.js';
export type { HealthClinicComponent } from './HealthClinicComponent.js';
// Economy components
export * from './CurrencyComponent.js';
export type { CurrencyComponent } from './CurrencyComponent.js';
export * from './ShopComponent.js';
export type { ShopComponent } from './ShopComponent.js';
export * from './MarketStateComponent.js';
export type { MarketStateComponent, ItemMarketStats } from './MarketStateComponent.js';
export * from './KnowledgeLossComponent.js';
export type { KnowledgeLossComponent, LostMemory } from './KnowledgeLossComponent.js';
// Publishing components
export * from './LibraryComponent.js';
export { createLibraryComponent, addItemToLibrary, recordRead, canAccessLibrary, addMember } from './LibraryComponent.js';
export type { LibraryComponent, BookListing } from './LibraryComponent.js';
export * from './BookstoreComponent.js';
export { createBookstoreComponent, addBookToStore, purchaseBook, placeOrder, fulfillOrder, addPrintingPartner, getAvailableBooks, getMostPopularBooks } from './BookstoreComponent.js';
export type { BookstoreComponent, BookForSale, PendingOrder } from './BookstoreComponent.js';
export { createPublishingCompanyComponent, submitManuscript, reviewManuscript, publishBook, hirePublishingEmployee, firePublishingEmployee, createManuscript, createPublishedBook } from './PublishingCompanyComponent.js';
export type { PublishingCompanyComponent, PublishingEmployee, PublishingRole, PublishingDepartment, Manuscript, PublishedBook, ManuscriptStatus, PrintingJob } from './PublishingCompanyComponent.js';
export { createNewspaperComponent, createArticle, createEdition, hireNewspaperEmployee, publishArticle, publishEdition, assignArticle, awardPulitzer } from './NewspaperComponent.js';
export type { NewspaperComponent, NewspaperEmployee, NewspaperRole, NewspaperDepartment, Article, ArticleType, ArticleStatus, Edition } from './NewspaperComponent.js';
export { createRecordingComponent, completeRecording, startEditingRecording, publishRecording, addRecordingSubject, setRecordingTranscript } from './RecordingComponent.js';
export type { RecordingComponent, MediaType, RecordingCategory, RecordingStatus } from './RecordingComponent.js';
export { createVideoReplayComponent, captureFrame, completeReplay, getFrameAtTick, getFrameByIndex, getAllReplayEntities, getPrimarySubject, compressReplay } from './VideoReplayComponent.js';
export type { VideoReplayComponent, ReplayFrame, ReplayEntity } from './VideoReplayComponent.js';
export { createUniversityComponent, hireUniversityEmployee, fireUniversityEmployee, proposeResearch, fundResearch, startResearch, completeResearch, createUniversityCourse, enrollStudent, giveLecture, setupPreprintServer, setupResearchBlog, setupSocialMedia, publishResearch, recordCitation, recordPaperView, shareOnSocialMedia } from './UniversityComponent.js';
export type { UniversityComponent, UniversityEmployee, UniversityRole, AcademicDepartment, ResearchProject as UniversityResearchProject, ResearchStatus, Course, Lecture, SkillTransfer, PublicationVenue, PublicationChannel, PublicationRecord } from './UniversityComponent.js';
// Research component
export * from './ResearchStateComponent.js';
// Technology unlock tracker
export { createTechnologyUnlockComponent, unlockBuilding, unlockTechnology, isBuildingUnlocked, isTechnologyUnlocked, setPlayerCity, isPlayerCity, getAvailableBuildings as getUnlockedBuildingsForCity, getResearchMultiplier, getBuildingEra, BUILDING_ERAS } from './TechnologyUnlockComponent.js';
export type { TechnologyUnlockComponent, TechnologyEra as BuildingTechnologyEra, BuildingUnlock, TechnologyUnlock } from './TechnologyUnlockComponent.js';
export { createTechnologyEraComponent, getEraMetadata, getEraIndex, getEraByIndex, getNextEra, getPreviousEra, isTechnologyUnlocked as isTechUnlockedInEra, unlockTechnology as unlockTechInEra, calculateStability, updateCollapseRisk, recordEraTransition, ERA_METADATA } from './TechnologyEraComponent.js';
export type { TechnologyEraComponent, TechnologyEra, TechBreakthrough, EraTransition, EraMetadata } from './TechnologyEraComponent.js';
// Production scaling (Grand Strategy Phase 5)
export { createProductionCapabilityComponent, calculateProductionMultiplier, calculateItemsPerDay, getTierFromTechLevel, addBottleneckResource, isBottleneckedResource, getEffectiveProductionRate, updateFactoryStats, getEffectiveWorkforce } from './ProductionCapabilityComponent.js';
export type { ProductionCapabilityComponent, ProductionTier, ResourceBottleneck } from './ProductionCapabilityComponent.js';
// Mood system
export * from './MoodComponent.js';
// Automation system (Phase 38)
export * from './PowerComponent.js';
export { createPowerComponent, createPowerProducer, createPowerConsumer, createPowerStorage } from './PowerComponent.js';
export type { PowerComponent, PowerType, PowerRole } from './PowerComponent.js';
export * from './BeltComponent.js';
export { createBeltComponent, addItemsToBelt, removeItemsFromBelt, canAcceptItems, BELT_SPEEDS } from './BeltComponent.js';
export type { BeltComponent, BeltDirection, BeltTier } from './BeltComponent.js';
export * from './AssemblyMachineComponent.js';
export { createAssemblyMachineComponent, installModule, calculateEffectiveSpeed, calculatePowerConsumption } from './AssemblyMachineComponent.js';
export type { AssemblyMachineComponent, ModuleInstance, ModuleType } from './AssemblyMachineComponent.js';
export * from './MachineConnectionComponent.js';
export { createMachineConnectionComponent, createCustomConnection, hasInputSpace, addToSlot, removeFromSlot, countItemsInSlots } from './MachineConnectionComponent.js';
export type { MachineConnectionComponent, MachineSlot } from './MachineConnectionComponent.js';
export * from './MachinePlacementComponent.js';
export { createMachinePlacementComponent, isValidPlacement, rotateMachine } from './MachinePlacementComponent.js';
export type { MachinePlacementComponent, PlacementRequirement } from './MachinePlacementComponent.js';
export * from './ChunkProductionStateComponent.js';
export { createChunkProductionState, getTotalProductionRate, getTotalConsumptionRate, canProduce, fastForwardProduction } from './ChunkProductionStateComponent.js';
export type { ChunkProductionStateComponent, ProductionRate } from './ChunkProductionStateComponent.js';
export { createFactoryAI, recordDecision as recordFactoryDecision, requestResource, fulfillRequest, detectBottleneck, clearResolvedBottlenecks, calculateFactoryHealth, getAIStatusSummary, recordProduction, recordConsumption, calculateItemsPerMinute, resetProductionTracking } from './FactoryAIComponent.js';
export type { FactoryAIComponent, FactoryGoal, FactoryHealth, ProductionBottleneck, FactoryStats, FactoryDecision, ResourceRequest } from './FactoryAIComponent.js';
export type { MoodComponent } from './MoodComponent.js';
// Food preferences
export * from './PreferenceComponent.js';
export type { PreferenceComponent } from './PreferenceComponent.js';
// Cooking skill
export * from './CookingSkillComponent.js';
// Recipe discovery (LLM-generated recipes)
export * from './RecipeDiscoveryComponent.js';
export {
  createRecipeDiscoveryComponent,
  recordExperiment,
  canExperiment,
  decreaseCooldown,
  wasAlreadyTried,
  getSpecializationBonus,
  getDiscoveryDescription,
  getNotableDiscoveries,
  hashIngredients,
  recordDiscoveryCrafted,
} from './RecipeDiscoveryComponent.js';
export type {
  RecipeDiscoveryComponent,
  ExperimentAttempt,
  DiscoveredRecipe,
} from './RecipeDiscoveryComponent.js';
// Skills system
export * from './SkillsComponent.js';
export * from './SkillConstants.js';
export {
  ALL_SKILL_IDS,
  generateRandomStartingSkills,
  isEntityVisibleWithSkill,
  getFoodStorageInfo,
  getVillageInfo,
  getAvailableBuildings,
} from './SkillsComponent.js';
export type { SkillsComponent } from './SkillsComponent.js';
// Personal goals
export * from './GoalsComponent.js';
export { createGoalsComponent, formatGoalsForPrompt, formatGoalsSectionForPrompt, type GoalsComponent } from './GoalsComponent.js';
// Equipment system (forward-compatibility)
// NOTE: EquipmentSlotsComponent export commented out to avoid conflicts with EquipmentComponent
// Files using EquipmentSlotsComponent should import it directly from './EquipmentSlotsComponent.js'
// export * from './EquipmentSlotsComponent.js';
// Magic system (forward-compatibility - Phase 30)
export * from './MagicComponent.js';

// Magic component splits (Phase 2 refactor)
export {
  createManaPoolsComponent,
  createManaPoolsComponentWithSource,
  getMana,
  getAvailableMana,
  type ManaPoolsComponent,
  type ManaPool,
  type ResourcePool,
} from './ManaPoolsComponent.js';

export {
  createSpellKnowledgeComponent,
  createSpellKnowledgeComponentWithParadigm,
  knowsSpell,
  getSpellProficiency,
  type SpellKnowledgeComponent,
  type KnownSpell,
} from './SpellKnowledgeComponent.js';

export {
  createCastingStateComponent,
  isCasting,
  getCastProgress,
  type CastingStateComponent,
} from './CastingStateComponent.js';

export {
  createSkillProgressComponent,
  createSkillProgressComponentWithParadigm,
  getParadigmXP,
  getUnlockedNodes,
  isNodeUnlocked,
  type SkillProgressComponent,
  type SkillTreeParadigmState,
} from './SkillProgressComponent.js';

export {
  createParadigmStateComponent,
  createParadigmStateComponentWithParadigm,
  getComponentParadigmState,
  hasParadigm,
  type ParadigmStateComponent,
  type ParadigmSpecificState,
} from './ParadigmStateComponent.js';

// Spiritual/prayer system (forward-compatibility - Phase 27)
export * from './SpiritualComponent.js';
export { createSpiritualComponent } from './SpiritualComponent.js';
// Spirit entities (animist spirits/kami - Phase 27)
export * from './SpiritComponent.js';
export { createPlaceSpiritComponent, createAncestorSpiritComponent, createObjectSpiritComponent } from './SpiritComponent.js';
// Deity/divinity system (forward-compatibility - Phase 27)
export * from './DeityComponent.js';
// Divine ability system (divine powers, blessings, curses - Phase 27)
export * from './DivineAbilityComponent.js';
export { createDivineAbilityComponent } from './DivineAbilityComponent.js';
export type { DivineAbilityComponent } from './DivineAbilityComponent.js';
// Angel system (divine servants/messengers - Phase 7)
export * from './AngelComponent.js';
export { createAngelComponent, type AngelComponent } from './AngelComponent.js';
// Player control/possession system (Phase 16: Polish & Player)
export * from './PlayerControlComponent.js';
export { createPlayerControlComponent, type PlayerControlComponent, calculatePossessionCost, shouldEndPossession } from './PlayerControlComponent.js';
// Mythology system (Phase 3: Myth Generation)
export * from './MythComponent.js';
// Soul System - eternal identity across incarnations and universes
export * from '../soul/index.js';
// Plot Lines System - lesson-driven narrative arcs
export * from '../plot/index.js';
// Military system (forward-compatibility)
export * from './MilitaryComponent.js';
// Body parts system - extensible for multiple species
export * from './BodyComponent.js';
export * from './BodyPlanRegistry.js';
// Species and genetics system
export * from './SpeciesComponent.js';
export * from './GeneticComponent.js';
// Plant knowledge system (agent learning about plants)
export * from './PlantKnowledgeComponent.js';
export { PlantKnowledgeComponent } from './PlantKnowledgeComponent.js';

// Re-export types explicitly (export * doesn't re-export types)
export type { AgentBehavior, CustomLLMConfig } from './AgentComponent.js';
export type { PlantStage, PlantGenetics, GeneticMutation } from './PlantComponent.js';
export type { AnimalLifeStage, AnimalState } from './AnimalComponent.js';
export type { BioluminescentPattern, BioluminescentState } from './BioluminescentComponent.js';
export type { EmotionalState, MoodFactors, RecentMeal } from './MoodComponent.js';
export type { FlavorType, FlavorPreferences, FoodMemory } from './PreferenceComponent.js';
export type { CookingSpecializations, RecipeComplexity, CookingExperience, RecipeExperience } from './CookingSkillComponent.js';
export type { SkillId, SkillLevel, SkillPrerequisite } from './SkillsComponent.js';
export type { GoalCategory, PersonalGoal } from './GoalsComponent.js';
// Forward-compatibility types
export type { EquipmentSlotId, EquippedItem } from './EquipmentSlotsComponent.js';
export type { NobleTitle, MandateType, ActiveMandate } from './AgentComponent.js';
export type {
  TraumaType,
  Trauma,
  BreakdownType,
  CopingMechanism,
  StressState,
} from './MoodComponent.js';
export type {
  NeedsInjuryType,
  NeedsInjurySeverity,
  NeedsInjury,
  BodyPartId,
  NeedsBodyPart,
} from './NeedsComponent.js';
// Magic system types (forward-compatibility - Phase 30)
// Note: ManaPool and KnownSpell are exported from split components above
export type {
  MagicSourceId,
  MagicTechnique,
  MagicForm,
  ComposedSpell,
  MagicComponent,
} from './MagicComponent.js';
// Spiritual system types (forward-compatibility - Phase 27)
export type {
  PrayerType,
  PrayerUrgency,
  Prayer,
  Doubt,
  Vision,
  SpiritualComponent,
} from './SpiritualComponent.js';
// Deity system types (forward-compatibility - Phase 27)
export type {
  BeliefActivity,
  DivineDomain,
  PerceivedPersonality,
  MoralAlignment,
  DeityIdentity,
  DeityBeliefState,
} from './DeityComponent.js';
// Mythology system types (Phase 3: Myth Generation)
export type {
  MythStatus,
  TraitImplication,
  Myth,
  MythologyComponent,
} from './MythComponent.js';
// Military system types (forward-compatibility)
export type {
  SquadActivity,
  ScheduleBlock,
  DaySchedule,
  MilitaryRank,
  CombatRole,
  EquipmentLoadout,
  Squad,
  MilitaryComponent,
} from './MilitaryComponent.js';
export * from './PassageComponent.js';
// Invasion (Multiverse warfare)
export * from './InvasionComponent.js';
export { createInvasionComponent } from './InvasionComponent.js';
export type {
  InvasionComponent,
  InvasionType,
  InvasionOutcome,
  DefenseStrategy,
  InvasionResult,
  UpliftResult,
  EconomicInvasionResult,
  InvasionDefense,
  ActiveInvasion,
} from './InvasionComponent.js';
export {
  createPassageComponent,
  canTraverse,
  getTraversalCost,
  getPassageCooldown,
  type PassageComponent,
  type PassageType,
  type PassageState,
} from './PassageComponent.js';
// Additional type exports for inventory and memory
export type { InventorySlot } from './InventoryComponent.js';
export type { EpisodicMemory } from './EpisodicMemoryComponent.js';
export type { SocialMemory } from './SocialMemoryComponent.js';
// Species and genetics system types
// Note: SpeciesTrait is already exported via export * from './SpeciesComponent.js'
export type {
  MutationType,
  Mutation,
} from './SpeciesComponent.js';
export type {
  AlleleExpression,
  GeneticAllele,
  HereditaryModification,
  GeneticModificationSource,
} from './GeneticComponent.js';
// Realm system components
export type { RealmComponent } from './RealmComponent.js';
export { createRealmComponent } from './RealmComponent.js';
export type { PortalComponent } from './PortalComponent.js';
export { createPortalComponent } from './PortalComponent.js';
export type { RealmLocationComponent } from './RealmLocationComponent.js';
export { createRealmLocationComponent } from './RealmLocationComponent.js';

// Cosmic Rebellion system components
export * from './CosmicRebellionOutcome.js';
export {
  createCosmicRebellionOutcome,
  checkOutcomeConditions,
  determineOutcome,
  getOutcomeNarrative,
  OUTCOME_CONDITIONS,
} from './CosmicRebellionOutcome.js';
export type {
  CosmicRebellionOutcome,
  BattleStatus,
  RebellionOutcome,
  ConflictChoice,
  OutcomeConditions,
} from './CosmicRebellionOutcome.js';

// Lore fragment system
export * from './LoreFragmentComponent.js';
export {
  createLoreFragment,
  getFragmentsByCategory,
  getFragmentsByImportance,
  getFragmentsByTag,
  LORE_FRAGMENTS,
} from './LoreFragmentComponent.js';
export type {
  LoreFragmentComponent,
  LoreCategory,
  LoreImportance,
} from './LoreFragmentComponent.js';

// Reality Anchor (tech path endgame)
export * from './RealityAnchorComponent.js';
export {
  createRealityAnchor,
  canBuildRealityAnchor,
  REALITY_ANCHOR_REQUIREMENTS,
} from './RealityAnchorComponent.js';
export type {
  RealityAnchorComponent,
  RealityAnchorStatus,
  RealityAnchorRequirements,
} from './RealityAnchorComponent.js';

// Rebellion threshold tracking
export * from './RebellionThresholdComponent.js';
export {
  createRebellionThreshold,
  checkRebellionThresholds,
  calculateRebellionReadiness,
  FAITH_REBELLION_THRESHOLDS,
  TECH_REBELLION_THRESHOLDS,
} from './RebellionThresholdComponent.js';
export type {
  RebellionThresholdComponent,
  RebellionStatus,
  RebellionPath,
  RebellionThresholds,
} from './RebellionThresholdComponent.js';

// Combat & Conflict Components
export * from './AppearanceComponent.js';
export * from './CombatStatsComponent.js';
export { createCombatStatsComponent } from './CombatStatsComponent.js';
export * from './ConflictComponent.js';
export * from './DominanceRankComponent.js';
export { createDominanceRankComponent } from './DominanceRankComponent.js';
export * from './GuardDutyComponent.js';
export { createGuardDutyComponent } from './GuardDutyComponent.js';
export * from './HiveCombatComponent.js';
export * from './InjuryComponent.js';
export { createInjuryComponent } from './InjuryComponent.js';
export * from './BurningComponent.js';
export { createBurningComponent } from './BurningComponent.js';
export * from './ManchiComponent.js';
export * from './PackCombatComponent.js';
export * from './ThreatDetectionComponent.js';
export { createThreatDetectionComponent } from './ThreatDetectionComponent.js';
export * from './SupremeCreatorComponent.js';

// Building-specific Components
export * from './CensusBureauComponent.js';
export * from './HealthClinicComponent.js';
export * from './TownHallComponent.js';
export * from './WarehouseComponent.js';
export * from './WeatherStationComponent.js';

// City Director Component (City-level strategic management)
export * from './CityDirectorComponent.js';
export {
  createCityDirectorComponent,
  blendPriorities,
  getPrioritiesForFocus,
  inferFocusFromStats,
  isAgentInCity,
  DEFAULT_CITY_PRIORITIES,
} from './CityDirectorComponent.js';
export type {
  CityDirectorComponent,
  CityStats,
  CityFocus,
  DirectorReasoning,
} from './CityDirectorComponent.js';

// Profession Component (Background profession simulation)
export * from './ProfessionComponent.js';
export {
  createProfessionComponent,
  isWorkTime,
  calculateOutputQuality,
  addProfessionOutput,
  startProfessionWork,
  updateWorkProgress,
  isWorkComplete,
  getProfessionCategory,
  getAverageOutputQuality,
} from './ProfessionComponent.js';
export type {
  ProfessionComponent,
  ProfessionRole,
  WorkShift,
  ProfessionOutput,
} from './ProfessionComponent.js';

// Realm Components (full exports)
export * from './RealmComponent.js';
export * from './PortalComponent.js';
export * from './RealmLocationComponent.js';

// Planet Components
export * from './PlanetLocationComponent.js';

// Afterlife system (souls in the Underworld)
export * from './AfterlifeComponent.js';
export {
  createAfterlifeComponent,
  recordRemembrance,
  recordVisit,
  resolveGoal,
  canBecomeAncestorKami,
  getSoulState,
  getStartingPeace,
} from './AfterlifeComponent.js';
export type {
  AfterlifeComponent,
  AfterlifeComponentOptions,
  CauseOfDeath,
} from './AfterlifeComponent.js';

// Deed Ledger (neutral action tracking for afterlife judgment)
export * from './DeedLedgerComponent.js';
export {
  createDeedLedgerComponent,
  recordDeed,
  recordOathSworn,
  recordOathKept,
  recordOathBroken,
  recordKinslaying,
  recordBetrayal,
  recordLoyalty,
  recordDeathCircumstances,
  calculateDeedScore,
  getJudgmentTier,
  getLedgerSummary,
} from './DeedLedgerComponent.js';
export type {
  DeedEntry,
  DeedCounts,
  CustomDeedCounts,
  DeedLedgerComponent,
} from './DeedLedgerComponent.js';

// Death judgment (psychopomp conversations at time of death)
export * from './DeathJudgmentComponent.js';
export {
  createDeathJudgmentComponent,
  addConversationExchange,
  calculateInitialPeace,
  calculateInitialTether,
  getAgeCategory,
  getJudgmentSummary,
} from './DeathJudgmentComponent.js';
export type {
  DeathJudgmentComponent,
  JudgmentStage,
  ConversationExchange,
} from './DeathJudgmentComponent.js';

// Death bargains (hero challenges to cheat death)
export * from './DeathBargainComponent.js';
export {
  createDeathBargainComponent,
  MYTHIC_RIDDLES,
} from './DeathBargainComponent.js';
export type {
  DeathBargainComponent,
  ChallengeType,
  BargainStatus,
  ResurrectionConditions,
} from './DeathBargainComponent.js';

// Afterlife memory fading (reincarnation with memory loss)
export * from './AfterlifeMemoryComponent.js';
export {
  createAfterlifeMemoryComponent,
  calculateMemoryClarity,
  hasAfterlifeMemories,
  getMemoryStateDescription,
} from './AfterlifeMemoryComponent.js';
export type {
  AfterlifeMemoryComponent,
} from './AfterlifeMemoryComponent.js';

// Soul wisdom accumulation across reincarnations (path to godhood)
export * from './SoulWisdomComponent.js';
export {
  createSoulWisdomComponent,
  createReincarnatedSoulWisdomComponent,
  calculateWisdomLevel,
  getWisdomDescription,
  getWisdomModifier,
  updatePeakSkills,
} from './SoulWisdomComponent.js';
export type {
  SoulWisdomComponent,
} from './SoulWisdomComponent.js';

// Soul-Body Separation Architecture
export * from './SoulIdentityComponent.js';
export {
  createSoulIdentityComponent,
  getDefaultInterestsForArchetype,
  evaluatePurposeFulfillment,
  getSoulNarrative,
} from './SoulIdentityComponent.js';
export type {
  SoulIdentityComponent,
} from './SoulIdentityComponent.js';

export * from './IncarnationComponent.js';
export {
  createIncarnationComponent,
  incarnateIntoBody,
  endIncarnation,
  bindToPhylactery,
  beginAstralProjection,
  endAstralProjection,
  getLivesLived,
  getPrimaryBodyId,
  isIncarnated,
} from './IncarnationComponent.js';
export type {
  IncarnationComponent,
  IncarnationRecord,
  SoulBindingType,
  SoulBinding,
} from './IncarnationComponent.js';

export * from './SoulLinkComponent.js';
export {
  createSoulLinkComponent,
  weakenSoulLink,
  strengthenSoulLink,
  enableAstralProjection as enableSoulLinkAstralProjection,
  bindToPhylactery as bindSoulLinkToPhylactery,
  isLinkBreaking,
  getSoulInfluenceDescription,
} from './SoulLinkComponent.js';
export type {
  SoulLinkComponent,
} from './SoulLinkComponent.js';

export * from './SoulCreationEventComponent.js';
export {
  createSoulCreationEventComponent,
  addFateStatement,
  completeSoulCreation,
  getSoulCreationNarrative,
  wasCreationConflicted,
  getCreationTheme,
} from './SoulCreationEventComponent.js';
export type {
  SoulCreationEventComponent,
  SoulCreationDebate,
  FateStatement,
  FateName,
} from './SoulCreationEventComponent.js';

// Building Harmony (Feng Shui analysis)
export * from './BuildingHarmonyComponent.js';
export {
  createBuildingHarmonyComponent,
  createDefaultHarmonyComponent,
  getHarmonyLevelFromScore,
  getHarmonyMoodModifier,
  getHarmonyProductivityModifier,
  getHarmonyRestModifier,
} from './BuildingHarmonyComponent.js';
export type {
  BuildingHarmonyComponent,
  HarmonyLevel,
  HarmonyIssue,
  ChiFlowAnalysis,
  ProportionAnalysis,
  CommandingPositionAnalysis,
  ElementBalance,
  GridPosition,
} from './BuildingHarmonyComponent.js';

// Aerial Harmony (3D Feng Shui for flying creatures)
export * from './AerialHarmonyComponent.js';
export {
  createAerialHarmonyComponent,
  createDefaultAerialHarmonyComponent,
  getAerialHarmonyLevel,
  getElementImbalances,
} from './AerialHarmonyComponent.js';
export type {
  AerialHarmonyComponent,
  AerialHarmonyLevel,
  AerialHarmonyIssue,
  AerialPosition,
  ThermalZone,
  WindCorridor,
  AerialShaQi,
  PerchingSpot,
  VolumetricElementBalance,
  ElementDistribution,
} from './AerialHarmonyComponent.js';

// Voxel Resource System (height-based harvesting for trees, rocks, etc.)
export * from './VoxelResourceComponent.js';
export {
  createVoxelResourceComponent,
  createTreeVoxelResource,
  createRockVoxelResource,
  createOreVeinVoxelResource,
  calculateTotalResources,
  isVoxelDepleted,
  isVoxelUnstable,
} from './VoxelResourceComponent.js';
export type {
  VoxelResourceComponent,
  VoxelResourceType,
} from './VoxelResourceComponent.js';

// Interests system (Deep Conversation - Phase 1)
export * from './InterestsComponent.js';
export {
  InterestsComponent,
  getInterestsDescription,
  formatTopicName,
  getTopicCategory,
} from './InterestsComponent.js';
export type {
  Interest,
  TopicId,
  TopicCategory,
  InterestSource,
  InterestsComponentData,
} from './InterestsComponent.js';

// Trade Agreement system (cross-universe/multiverse trade)
export * from './TradeAgreementComponent.js';
export {
  createTradeAgreementComponent,
} from './TradeAgreementComponent.js';
export type {
  TradeAgreementComponent,
  EscrowItem,
  CausalTradeEvent,
  DiplomaticRelation,
  DiplomaticIncident,
} from './TradeAgreementComponent.js';

// Cross-realm phone system (inter-universe communication)
export * from './CrossRealmPhoneComponent.js';
export { createCrossRealmPhoneComponent } from './CrossRealmPhoneComponent.js';
export type { CrossRealmPhoneComponent } from './CrossRealmPhoneComponent.js';

// Genetic Uplift components

// Genetic Uplift components

// Genetic Uplift components

// Genetic Uplift components (NOT YET INTEGRATED)
export { UpliftCandidateComponent } from './UpliftCandidateComponent.js';
export { UpliftProgramComponent } from './UpliftProgramComponent.js';
export { UpliftedTraitComponent } from './UpliftedTraitComponent.js';
export { ProtoSapienceComponent } from './ProtoSapienceComponent.js';

// Universe Metadata (Conservation of Game Matter)
export * from './UniverseMetadataComponent.js';
export {
  createProtoRealityComponent,
  createCorruptedUniverseComponent,
} from './UniverseMetadataComponent.js';
export type {
  ProtoRealityComponent,
  CorruptedUniverseComponent,
  UniverseEra,
} from './UniverseMetadataComponent.js';

// Parenting component
export * from './ParentingComponent.js';
export {
  ParentingComponent,
  createParentingComponent,
} from './ParentingComponent.js';
export type {
  ParentingResponsibility,
  ParentingDriveLevel,
  ParentingReputation,
} from './ParentingComponent.js';

// Divine Chat component
export * from './DivineChatComponent.js';
export type { DivineChatComponent } from './DivineChatComponent.js';
export { createDivineChatComponent } from './DivineChatComponent.js';

// Ship-Fleet Hierarchy (Grand Strategy - Phase 2)
export * from './ShipCrewComponent.js';
export {
  createShipCrewComponent,
  updateMorale,
  accumulateStress,
  reduceStress,
  calculateCoherenceContribution,
  calculateShipCoherence,
  calculateEmotionalDiversity,
  aggregateCrewEmotions,
  ShipCrewComponentSchema,
} from './ShipCrewComponent.js';
export type { ShipCrewComponent, CrewRole } from './ShipCrewComponent.js';

export * from './SquadronComponent.js';
export { createSquadronComponent, SquadronComponentSchema } from './SquadronComponent.js';
export type { SquadronComponent, SquadronFormation, SquadronMissionType } from './SquadronComponent.js';

export * from './FleetComponent.js';
export { createFleetComponent, FleetComponentSchema } from './FleetComponent.js';
export type { FleetComponent, FleetMissionType } from './FleetComponent.js';

export * from './ArmadaComponent.js';
export { createArmadaComponent, ArmadaComponentSchema } from './ArmadaComponent.js';
export type { ArmadaComponent, ArmadaCampaignType } from './ArmadaComponent.js';

export * from './NavyComponent.js';

export * from './StragglerComponent.js';
export {
  createStragglerComponent,
  updateDecoherenceRate,
  updateContaminationRisk,
  calculateSoloJumpSuccessChance,
  shouldMarkAsLost,
  StragglerComponentSchema,
} from './StragglerComponent.js';
export type { StragglerComponent, RecoveryStatus } from './StragglerComponent.js';
export { createNavyComponent, NavyComponentSchema } from './NavyComponent.js';
export type { NavyComponent, NavyStrategicPosture } from './NavyComponent.js';

// Trade & Logistics (Grand Strategy Layer)
export * from './ShippingLaneComponent.js';
export type { ShippingLaneComponent, LaneHazard } from './ShippingLaneComponent.js';
export * from './TradeCaravanComponent.js';
export type { TradeCaravanComponent, CargoItem } from './TradeCaravanComponent.js';

// Multiverse & Timeline Forking
export * from './UniverseForkMetadataComponent.js';
export * from './MergeCompatibilityComponent.js';
export {
  createUniverseForkMetadata,
  recordDivergenceEvent,
  DIVERGENCE_EVENT_IMPACTS,
} from './UniverseForkMetadataComponent.js';
export type {
  UniverseForkMetadataComponent,
  ForkTrigger,
  CriticalEvent,
  DivergenceEvent,
  CanonEvent,
  MergeConflict,
} from './UniverseForkMetadataComponent.js';

// Multiverse - Divergence Tracking
export * from './DivergenceTrackingComponent.js';
export type { DivergenceTrackingComponent } from './DivergenceTrackingComponent.js';
export { DIVERGENCE_EVENT_IMPACTS as DIVERGENCE_IMPACTS } from './DivergenceTrackingComponent.js';

// Multiverse - Canon Events
export * from './CanonEventComponent.js';
export type {
  CanonEventComponent,
  CanonEventAlteration,
  CanonEventConvergence,
} from './CanonEventComponent.js';

// Grand Strategy - AI Governance (Phase 6)
export type {
  GovernorComponent,
  PoliticalTier,
  GovernmentType,
  GovernorDecision,
  PoliticalIdeology,
} from './GovernorComponent.js';
export {
  createGovernorComponent,
  recordDecision as recordGovernorDecision,
  updateDecisionOutcome as updateGovernorDecisionOutcome,
  updateApproval as updateGovernorApproval,
  updateConstituencyApproval,
  canMakeDecision as canGovernorMakeDecision,
  isTermExpired as isGovernorTermExpired,
  getRecentDecision as getRecentGovernorDecision,
  getDecisionsByOutcome as getGovernorDecisionsByOutcome,
  getAveragePopularityImpact as getGovernorAveragePopularityImpact,
  TIER_COOLDOWNS as GOVERNOR_TIER_COOLDOWNS,
  TIER_MODELS as GOVERNOR_TIER_MODELS,
} from './GovernorComponent.js';

export * from './PoliticalEntityComponent.js';
export type {
  PoliticalEntityComponent,
  PoliticalDirective,
  PoliticalCrisis,
  VotingProtocol,
} from './PoliticalEntityComponent.js';
export {
  createPoliticalEntityComponent,
  setGovernor,
  setCouncil,
  addChildEntity,
  removeChildEntity,
  setParentEntity,
  receiveDirective,
  completeDirective,
  getDirectivesByType,
  getOverdueDirectives,
  reportCrisis,
  resolveCrisis,
  getCrisesByType,
  getMostSevereCrisis,
  getHighestPriorityDirective,
  updateResource,
  setResource,
  getResource,
  hasCouncil,
  hasSingleGovernor,
  isUngoverned,
} from './PoliticalEntityComponent.js';

// City Governance (Political Hierarchy - Tier 1.5)
export * from './CityGovernanceComponent.js';
export type {
  CityGovernanceComponent,
  CityDepartment,
  CityDepartmentType,
  InfrastructureProject,
  CityLaw,
  CityPolicy,
} from './CityGovernanceComponent.js';
export {
  createCityGovernanceComponent,
  addVillageToCity,
  removeVillageFromCity,
  allocateDepartmentBudget,
  createInfrastructureProject,
  updateProjectProgress,
  enactCityLaw,
  adoptCityPolicy,
  updateCityReserves,
  getDepartmentBudget,
} from './CityGovernanceComponent.js';

// Province Governance (Grand Strategy - Tier 2)
export * from './ProvinceGovernanceComponent.js';
export type {
  ProvinceGovernanceComponent,
  ProvinceCityRecord,
  ProvincialLaw,
  ProvincialPolicy,
  ProvincialMilitary,
} from './ProvinceGovernanceComponent.js';
export { createProvinceGovernanceComponent } from './ProvinceGovernanceComponent.js';

// Nation Governance (Grand Strategy - Tier 3)
export * from './NationGovernanceComponent.js';
export type {
  NationGovernanceComponent,
  WarState,
  Battle,
  Treaty,
  NationRelation,
  NationDiplomaticEvent,
  ResearchProject as NationalResearchProject,
  TechCategory,
  NationalLaw,
  NationalPolicy,
} from './NationGovernanceComponent.js';
export { createNationGovernanceComponent } from './NationGovernanceComponent.js';

// Empire Governance (Grand Strategy - Tier 4)
export * from './EmpireGovernanceComponent.js';
export type {
  EmpireGovernanceComponent,
  Dynasty,
  DynastyRuler,
  SeparatistMovement,
  EmpireRelation,
  ImperialWar as EmpireGovernanceImperialWar,
  MilitaryContribution,
  ImperialTreaty as EmpireGovernanceImperialTreaty,
} from './EmpireGovernanceComponent.js';
export { createEmpireGovernanceComponent } from './EmpireGovernanceComponent.js';

// Federation Governance (Grand Strategy - Tier 5)
export * from './FederationGovernanceComponent.js';
export type {
  FederationGovernanceComponent,
  FederalRepresentative,
  JointOperation,
  FederalLaw,
  FederationRelation,
  FederalTreaty,
  FederalWar,
} from './FederationGovernanceComponent.js';
export { createFederationGovernanceComponent } from './FederationGovernanceComponent.js';

// Governance History & Audit Trail
export * from './GovernanceHistoryComponent.js';
export type {
  GovernanceHistoryComponent,
  GovernanceAuditEntry,
  GovernanceAuditQuery,
  GovernanceStatistics,
  GovernanceActionType,
  GovernanceOutcome,
} from './GovernanceHistoryComponent.js';
export {
  createGovernanceHistoryComponent,
  addGovernanceAuditEntry,
  queryGovernanceHistory,
  getGovernanceStatistics,
} from './GovernanceHistoryComponent.js';

// Nation Component (06-POLITICAL-HIERARCHY.md - Tier 3)
export * from './NationComponent.js';
export type {
  NationComponent,
  NationProvinceRecord,
  WarState as NationWarState,
  Battle as NationBattle,
  Treaty as NationTreaty,
  NationRelation as NationToNationRelation,
  NationDiplomaticEvent as NationDiplomaticEventType,
  ResearchProject,
  NationalLaw as NationLaw,
  NationalPolicy as NationPolicy,
} from './NationComponent.js';
export {
  createNationComponent,
  declareWar,
  signTreaty,
  endWar,
  updateLegitimacy,
  updateStability,
  isAtWar,
  hasTreatyWith,
  getActiveResearchProjects,
  getCompletedResearchProjects,
} from './NationComponent.js';

// Dynasty Component (Empire dynasty membership)
export * from './DynastyComponent.js';
export type {
  DynastyComponent,
  SuccessionPosition,
} from './DynastyComponent.js';
export {
  createDynastyComponent,
  calculateLegitimacy,
  updateLegitimacyFactors,
  promoteToRuler,
  designateAsHeir,
  endReign,
} from './DynastyComponent.js';

// Empire Component (06-POLITICAL-HIERARCHY.md - Tier 4)
export * from './EmpireComponent.js';
export type {
  EmpireComponent,
  Dynasty as EmpireDynasty,
  DynastyRuler as EmpireDynastyRuler,
  SeparatistMovement as EmpireSeparatistMovement,
  EmpireNationRecord,
  EmpireRelation as EmpireToEmpireRelation,
  EmpireDiplomaticEvent,
  ImperialWar,
  MilitaryContribution as EmpireMilitaryContribution,
  ImperialTreaty,
} from './EmpireComponent.js';
export {
  createEmpireComponent,
  addVassal,
  addCoreNation,
  declareImperialWar,
  collectTribute,
  setVassalAutonomy,
  createSeparatistMovement,
  suppressSeparatistMovement,
  grantIndependence,
  updateDynasty,
  isStable,
  isAtWar as isEmpireAtWar,
  getAverageVassalLoyalty,
} from './EmpireComponent.js';

// Galactic Council (Grand Strategy - Tier 6)
export * from './GalacticCouncilComponent.js';
export type {
  GalacticCouncilComponent,
  Species,
  GalacticDelegate,
  PeacekeepingMission,
  UniversalLaw,
  LawViolation,
  GalacticDispute,
  GalacticResearchProject,
  ExistentialThreat,
  EvacuationPlan,
} from './GalacticCouncilComponent.js';
export { createGalacticCouncilComponent } from './GalacticCouncilComponent.js';
