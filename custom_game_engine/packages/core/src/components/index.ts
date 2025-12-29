/**
 * Core stable components.
 */

export * from './PositionComponent.js';
export * from './PhysicsComponent.js';
export * from './RenderableComponent.js';
export * from './TagsComponent.js';
export * from './AgentComponent.js';
export * from './MovementComponent.js';
export * from './NeedsComponent.js';
export * from './ResourceComponent.js';
export * from './MemoryComponent.js';
export * from './VisionComponent.js';
export * from './ConversationComponent.js';
export * from './RelationshipComponent.js';
export * from './PersonalityComponent.js';
export * from './IdentityComponent.js';
export * from './BuildingComponent.js';
export * from './InventoryComponent.js';
export * from './TemperatureComponent.js';
export * from './WeatherComponent.js';
export * from './CircadianComponent.js';
export * from './PlantComponent.js';
export * from './SeedComponent.js';
export * from './AnimalComponent.js';
export * from './MeetingComponent.js';
export * from './EpisodicMemoryComponent.js';
export * from './SemanticMemoryComponent.js';
export * from './SocialMemoryComponent.js';
export * from './ReflectionComponent.js';
export * from './JournalComponent.js';
// Navigation & Exploration components
export * from './SpatialMemoryComponent.js';
export * from './TrustNetworkComponent.js';
export * from './BeliefComponent.js';
export * from './SocialGradientComponent.js';
export * from './ExplorationStateComponent.js';
export * from './SteeringComponent.js';
export * from './VelocityComponent.js';
export * from './GatheringStatsComponent.js';
// Governance building components
export * from './governance.js';
// Economy components
export * from './CurrencyComponent.js';
export * from './ShopComponent.js';
export * from './MarketStateComponent.js';
// Research component
export * from './ResearchStateComponent.js';
// Mood system
export * from './MoodComponent.js';
// Food preferences
export * from './PreferenceComponent.js';
// Cooking skill
export * from './CookingSkillComponent.js';
// Skills system
export * from './SkillsComponent.js';
export * from './SkillConstants.js';
// Personal goals
export * from './GoalsComponent.js';

// Re-export types explicitly (export * doesn't re-export types)
export type { AgentBehavior } from './AgentComponent.js';
export type { PlantStage, PlantGenetics, GeneticMutation } from './PlantComponent.js';
export type { AnimalLifeStage, AnimalState } from './AnimalComponent.js';
export type { EmotionalState, MoodFactors, RecentMeal } from './MoodComponent.js';
export type { FlavorType, FlavorPreferences, FoodMemory } from './PreferenceComponent.js';
export type { CookingSpecializations, RecipeComplexity, CookingExperience, RecipeExperience } from './CookingSkillComponent.js';
export type { SkillId, SkillLevel, SkillPrerequisite } from './SkillsComponent.js';
export type { GoalCategory, PersonalGoal } from './GoalsComponent.js';
