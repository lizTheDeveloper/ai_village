/**
 * Core stable components.
 */

export * from './PositionComponent.js';
export { createPositionComponent, type PositionComponent } from './PositionComponent.js';
export * from './PhysicsComponent.js';
export { createPhysicsComponent } from './PhysicsComponent.js';
export * from './RenderableComponent.js';
export { createRenderableComponent, type RenderableComponent } from './RenderableComponent.js';
export * from './TagsComponent.js';
export { createTagsComponent } from './TagsComponent.js';
export * from './AgentComponent.js';
export { createAgentComponent, type AgentComponent } from './AgentComponent.js';
export * from './MovementComponent.js';
export { createMovementComponent } from './MovementComponent.js';
export * from './NeedsComponent.js';
export { NeedsComponent } from './NeedsComponent.js';
export * from './ResourceComponent.js';
export { createResourceComponent, type ResourceComponent } from './ResourceComponent.js';
export * from './MemoryComponent.js';
export { MemoryComponent } from './MemoryComponent.js';
export * from './VisionComponent.js';
export { createVisionComponent } from './VisionComponent.js';
export type { VisionComponent } from './VisionComponent.js';
export * from './ConversationComponent.js';
export { createConversationComponent } from './ConversationComponent.js';
export type { ConversationComponent } from './ConversationComponent.js';
export * from './RelationshipComponent.js';
export { createRelationshipComponent } from './RelationshipComponent.js';
export type { RelationshipComponent } from './RelationshipComponent.js';
export * from './PersonalityComponent.js';
export { PersonalityComponent } from './PersonalityComponent.js';
export * from './IdentityComponent.js';
export { generateRandomName, createIdentityComponent, type IdentityComponent } from './IdentityComponent.js';
// Export BuildingComponent - BuildingType is also exported from types.ts for convenience
export { BuildingType, type BuildingComponent, createBuildingComponent, canAccessBuilding, isUnderConstruction, getRemainingWork } from './BuildingComponent.js';
export * from './InventoryComponent.js';
export { calculateInventoryWeight, createInventoryComponent } from './InventoryComponent.js';
export type { InventoryComponent } from './InventoryComponent.js';
export * from './TemperatureComponent.js';
export { createTemperatureComponent, type TemperatureComponent } from './TemperatureComponent.js';
export * from './WeatherComponent.js';
export * from './CircadianComponent.js';
export { createCircadianComponent, type CircadianComponent } from './CircadianComponent.js';
export * from './PlantComponent.js';
export * from './SeedComponent.js';
export * from './AnimalComponent.js';
export { AnimalComponent } from './AnimalComponent.js';
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
// Research component
export * from './ResearchStateComponent.js';
// Mood system
export * from './MoodComponent.js';
export type { MoodComponent } from './MoodComponent.js';
// Food preferences
export * from './PreferenceComponent.js';
export type { PreferenceComponent } from './PreferenceComponent.js';
// Cooking skill
export * from './CookingSkillComponent.js';
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
export { createGoalsComponent, formatGoalsForPrompt, type GoalsComponent } from './GoalsComponent.js';
// Equipment system (forward-compatibility)
export * from './EquipmentSlotsComponent.js';
// Magic system (forward-compatibility - Phase 30)
export * from './MagicComponent.js';
// Spiritual/prayer system (forward-compatibility - Phase 27)
export * from './SpiritualComponent.js';
export { createSpiritualComponent } from './SpiritualComponent.js';
// Deity/divinity system (forward-compatibility - Phase 27)
export * from './DeityComponent.js';
// Mythology system (Phase 3: Myth Generation)
export * from './MythComponent.js';
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
  InjuryType,
  InjurySeverity,
  Injury,
  BodyPartId,
  BodyPart,
} from './NeedsComponent.js';
// Magic system types (forward-compatibility - Phase 30)
export type {
  MagicSourceId,
  MagicTechnique,
  MagicForm,
  ComposedSpell,
  KnownSpell,
  ManaPool,
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
  ModificationSource,
} from './GeneticComponent.js';
// Realm system components
export { RealmComponent } from './RealmComponent.js';
export type { RealmComponent as RealmComponentType } from './RealmComponent.js';
export { PortalComponent } from './PortalComponent.js';
export type { PortalComponent as PortalComponentType } from './PortalComponent.js';
export { RealmLocationComponent } from './RealmLocationComponent.js';
export type { RealmLocationComponent as RealmLocationComponentType } from './RealmLocationComponent.js';
