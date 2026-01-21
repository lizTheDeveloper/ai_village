/**
 * Type guards for component type narrowing.
 *
 * Instead of using `as unknown as ComponentType`, use these type guards:
 *
 * @example
 * const comp = entity.getComponent(CT.Position);
 * if (!comp || !isPositionComponent(comp)) return;
 * // Now TypeScript knows comp is PositionComponent
 * const x = comp.x; // Type-safe!
 */

import type { Component } from '../ecs/Component.js';
import type { PositionComponent } from './PositionComponent.js';
import type { AgentComponent } from './AgentComponent.js';
import type { VisionComponent } from './VisionComponent.js';
import type { IdentityComponent } from './IdentityComponent.js';
import type { RenderableComponent } from './RenderableComponent.js';
import type { AnimationComponent } from './AnimationComponent.js';
import type { ResourceComponent } from './ResourceComponent.js';
import type { ConversationComponent } from './ConversationComponent.js';
import type { RelationshipComponent } from './RelationshipComponent.js';
import type { InventoryComponent } from './InventoryComponent.js';
import type { TemperatureComponent } from './TemperatureComponent.js';
import type { TimeCompressionComponent } from './TimeCompressionComponent.js';
import type { TimeCompressionSnapshotComponent } from './TimeCompressionSnapshotComponent.js';
import type { CircadianComponent } from './CircadianComponent.js';
import type { ExplorationMissionComponent } from './ExplorationMissionComponent.js';
import type { LibraryComponent } from './LibraryComponent.js';
import type { BookstoreComponent } from './BookstoreComponent.js';
import type { CurrencyComponent } from './CurrencyComponent.js';
import type { ShopComponent } from './ShopComponent.js';
import type { MarketStateComponent } from './MarketStateComponent.js';
import type { KnowledgeLossComponent } from './KnowledgeLossComponent.js';
import type { GoalsComponent } from './GoalsComponent.js';
import type { MoodComponent } from './MoodComponent.js';
import type { PreferenceComponent } from './PreferenceComponent.js';
import type { SkillsComponent } from './SkillsComponent.js';
import type { CensusBureauComponent } from './CensusBureauComponent.js';
import type { HealthClinicComponent } from './HealthClinicComponent.js';
import type { PowerComponent } from './PowerComponent.js';
import type { BeltComponent } from './BeltComponent.js';
import type { AssemblyMachineComponent } from './AssemblyMachineComponent.js';
import type { MachineConnectionComponent } from './MachineConnectionComponent.js';
import type { MachinePlacementComponent } from './MachinePlacementComponent.js';
import type { ChunkProductionStateComponent } from './ChunkProductionStateComponent.js';
import type { FactoryAIComponent } from './FactoryAIComponent.js';
import type { TechnologyUnlockComponent } from './TechnologyUnlockComponent.js';
import type { TechnologyEraComponent } from './TechnologyEraComponent.js';
import type { KnowledgeRepositoryComponent } from './KnowledgeRepositoryComponent.js';
import type { ProductionCapabilityComponent } from './ProductionCapabilityComponent.js';
import type { DivineChatComponent } from './DivineChatComponent.js';
import type { ShipCrewComponent } from './ShipCrewComponent.js';
import type { CorruptedComponent } from './CorruptedComponent.js';
import type { TradeAgreementComponent } from './TradeAgreementComponent.js';
import type { CrossRealmPhoneComponent } from './CrossRealmPhoneComponent.js';
import type { ParentingComponent } from './ParentingComponent.js';
import type { InterestsComponent } from './InterestsComponent.js';
import type { CityDirectorComponent } from './CityDirectorComponent.js';
import type { ProfessionComponent } from './ProfessionComponent.js';
import type { BuildingComponent } from './BuildingComponent.js';

// VelocityComponent is a class, so we import it differently
import { VelocityComponent } from './VelocityComponent.js';
import { SteeringComponent } from './SteeringComponent.js';
import { NeedsComponent } from './NeedsComponent.js';
import { MemoryComponent } from './MemoryComponent.js';
import { LLMHistoryComponent } from './LLMHistoryComponent.js';
import { AnimalComponent } from './AnimalComponent.js';
import { BioluminescentComponent } from './BioluminescentComponent.js';
import { EpisodicMemoryComponent } from './EpisodicMemoryComponent.js';
import { SemanticMemoryComponent } from './SemanticMemoryComponent.js';
import { SocialMemoryComponent } from './SocialMemoryComponent.js';
import { ReflectionComponent } from './ReflectionComponent.js';
import { JournalComponent } from './JournalComponent.js';
import { SpatialMemoryComponent } from './SpatialMemoryComponent.js';
import { TrustNetworkComponent } from './TrustNetworkComponent.js';
import { BeliefComponent } from './BeliefComponent.js';
import { SocialGradientComponent } from './SocialGradientComponent.js';
import { ExplorationStateComponent } from './ExplorationStateComponent.js';
import { JealousyComponent } from './JealousyComponent.js';
import { PersonalityComponent } from './PersonalityComponent.js';
import { PlantKnowledgeComponent } from './PlantKnowledgeComponent.js';

// =============================================================================
// Core Components
// =============================================================================

export function isPositionComponent(comp: Component): comp is PositionComponent {
  return comp.type === 'position';
}

export function isAgentComponent(comp: Component): comp is AgentComponent {
  return comp.type === 'agent';
}

export function isVelocityComponent(comp: Component): comp is VelocityComponent {
  return comp.type === 'velocity';
}

export function isSteeringComponent(comp: Component): comp is SteeringComponent {
  return comp.type === 'steering';
}

export function isVisionComponent(comp: Component): comp is VisionComponent {
  return comp.type === 'vision';
}

export function isIdentityComponent(comp: Component): comp is IdentityComponent {
  return comp.type === 'identity';
}

export function isRenderableComponent(comp: Component): comp is RenderableComponent {
  return comp.type === 'renderable';
}

export function isAnimationComponent(comp: Component): comp is AnimationComponent {
  return comp.type === 'animation';
}

export function isResourceComponent(comp: Component): comp is ResourceComponent {
  return comp.type === 'resource';
}

export function isBuildingComponent(comp: Component): comp is BuildingComponent {
  return comp.type === 'building';
}

// =============================================================================
// Needs & Status
// =============================================================================

export function isNeedsComponent(comp: Component): comp is NeedsComponent {
  return comp.type === 'needs';
}

export function isTemperatureComponent(comp: Component): comp is TemperatureComponent {
  return comp.type === 'temperature';
}

export function isMoodComponent(comp: Component): comp is MoodComponent {
  return comp.type === 'mood';
}

export function isCircadianComponent(comp: Component): comp is CircadianComponent {
  return comp.type === 'circadian';
}

// =============================================================================
// Memory & Cognition
// =============================================================================

export function isMemoryComponent(comp: Component): comp is MemoryComponent {
  return comp.type === 'memory';
}

export function isLLMHistoryComponent(comp: Component): comp is LLMHistoryComponent {
  return comp.type === 'llm_history';
}

export function isEpisodicMemoryComponent(comp: Component): comp is EpisodicMemoryComponent {
  return comp.type === 'episodic_memory';
}

export function isSemanticMemoryComponent(comp: Component): comp is SemanticMemoryComponent {
  return comp.type === 'semantic_memory';
}

export function isSpatialMemoryComponent(comp: Component): comp is SpatialMemoryComponent {
  return comp.type === 'spatial_memory';
}

export function isSocialMemoryComponent(comp: Component): comp is SocialMemoryComponent {
  return comp.type === 'social_memory';
}

export function isBeliefComponent(comp: Component): comp is BeliefComponent {
  return comp.type === 'belief';
}

export function isReflectionComponent(comp: Component): comp is ReflectionComponent {
  return comp.type === 'reflection';
}

export function isJournalComponent(comp: Component): comp is JournalComponent {
  return comp.type === 'journal';
}

// =============================================================================
// Social & Relationships
// =============================================================================

export function isConversationComponent(comp: Component): comp is ConversationComponent {
  return comp.type === 'conversation';
}

export function isRelationshipComponent(comp: Component): comp is RelationshipComponent {
  return comp.type === 'relationship';
}

export function isTrustNetworkComponent(comp: Component): comp is TrustNetworkComponent {
  return comp.type === 'trust_network';
}

export function isSocialGradientComponent(comp: Component): comp is SocialGradientComponent {
  return comp.type === 'social_gradient';
}

export function isJealousyComponent(comp: Component): comp is JealousyComponent {
  return comp.type === 'jealousy';
}

export function isPersonalityComponent(comp: Component): comp is PersonalityComponent {
  return comp.type === 'personality';
}

export function isInterestsComponent(comp: Component): comp is InterestsComponent {
  return comp.type === 'interests';
}

export function isParentingComponent(comp: Component): comp is ParentingComponent {
  return comp.type === 'parenting';
}

// =============================================================================
// Inventory & Items
// =============================================================================

export function isInventoryComponent(comp: Component): comp is InventoryComponent {
  return comp.type === 'inventory';
}

// =============================================================================
// Skills & Goals
// =============================================================================

export function isSkillsComponent(comp: Component): comp is SkillsComponent {
  return comp.type === 'skills';
}

export function isGoalsComponent(comp: Component): comp is GoalsComponent {
  return comp.type === 'goals';
}

export function isPreferenceComponent(comp: Component): comp is PreferenceComponent {
  return comp.type === 'preference';
}

// =============================================================================
// Exploration
// =============================================================================

export function isExplorationStateComponent(comp: Component): comp is ExplorationStateComponent {
  return comp.type === 'exploration_state';
}

export function isExplorationMissionComponent(comp: Component): comp is ExplorationMissionComponent {
  return comp.type === 'exploration_mission';
}

// =============================================================================
// Animals & Nature
// =============================================================================

export function isAnimalComponent(comp: Component): comp is AnimalComponent {
  return comp.type === 'animal';
}

export function isBioluminescentComponent(comp: Component): comp is BioluminescentComponent {
  return comp.type === 'bioluminescent';
}

export function isPlantKnowledgeComponent(comp: Component): comp is PlantKnowledgeComponent {
  return comp.type === 'plant_knowledge';
}

// =============================================================================
// Economy & Trade
// =============================================================================

export function isCurrencyComponent(comp: Component): comp is CurrencyComponent {
  return comp.type === 'currency';
}

export function isShopComponent(comp: Component): comp is ShopComponent {
  return comp.type === 'shop';
}

export function isMarketStateComponent(comp: Component): comp is MarketStateComponent {
  return comp.type === 'market_state';
}

export function isTradeAgreementComponent(comp: Component): comp is TradeAgreementComponent {
  return comp.type === 'trade_agreement';
}

// =============================================================================
// Buildings
// =============================================================================

export function isCensusBureauComponent(comp: Component): comp is CensusBureauComponent {
  return comp.type === 'census_bureau';
}

export function isHealthClinicComponent(comp: Component): comp is HealthClinicComponent {
  return comp.type === 'health_clinic';
}

export function isLibraryComponent(comp: Component): comp is LibraryComponent {
  return comp.type === 'library';
}

export function isBookstoreComponent(comp: Component): comp is BookstoreComponent {
  return comp.type === 'bookstore';
}

// =============================================================================
// Automation & Production
// =============================================================================

export function isPowerComponent(comp: Component): comp is PowerComponent {
  return comp.type === 'power';
}

export function isBeltComponent(comp: Component): comp is BeltComponent {
  return comp.type === 'belt';
}

export function isAssemblyMachineComponent(comp: Component): comp is AssemblyMachineComponent {
  return comp.type === 'assembly_machine';
}

export function isMachineConnectionComponent(comp: Component): comp is MachineConnectionComponent {
  return comp.type === 'machine_connection';
}

export function isMachinePlacementComponent(comp: Component): comp is MachinePlacementComponent {
  return comp.type === 'machine_placement';
}

export function isChunkProductionStateComponent(comp: Component): comp is ChunkProductionStateComponent {
  return comp.type === 'chunk_production_state';
}

export function isFactoryAIComponent(comp: Component): comp is FactoryAIComponent {
  return comp.type === 'factory_ai';
}

// =============================================================================
// Research & Technology
// =============================================================================

export function isTechnologyUnlockComponent(comp: Component): comp is TechnologyUnlockComponent {
  return comp.type === 'technology_unlock';
}

export function isTechnologyEraComponent(comp: Component): comp is TechnologyEraComponent {
  return comp.type === 'technology_era';
}

export function isKnowledgeRepositoryComponent(comp: Component): comp is KnowledgeRepositoryComponent {
  return comp.type === 'knowledge_repository';
}

export function isProductionCapabilityComponent(comp: Component): comp is ProductionCapabilityComponent {
  return comp.type === 'production_capability';
}

export function isKnowledgeLossComponent(comp: Component): comp is KnowledgeLossComponent {
  return comp.type === 'knowledge_loss';
}

// =============================================================================
// Time & Grand Strategy
// =============================================================================

export function isTimeCompressionComponent(comp: Component): comp is TimeCompressionComponent {
  return comp.type === 'time_compression';
}

export function isTimeCompressionSnapshotComponent(comp: Component): comp is TimeCompressionSnapshotComponent {
  return comp.type === 'time_compression_snapshot';
}

// =============================================================================
// City Management
// =============================================================================

export function isCityDirectorComponent(comp: Component): comp is CityDirectorComponent {
  return comp.type === 'city_director';
}

export function isProfessionComponent(comp: Component): comp is ProfessionComponent {
  return comp.type === 'profession';
}

// =============================================================================
// Multiverse & Divine
// =============================================================================

export function isDivineChatComponent(comp: Component): comp is DivineChatComponent {
  return comp.type === 'divine_chat';
}

export function isCrossRealmPhoneComponent(comp: Component): comp is CrossRealmPhoneComponent {
  return comp.type === 'cross_realm_phone';
}

// =============================================================================
// Ship & Fleet
// =============================================================================

export function isShipCrewComponent(comp: Component): comp is ShipCrewComponent {
  return comp.type === 'ship_crew';
}

// =============================================================================
// Conservation of Game Matter
// =============================================================================

export function isCorruptedComponent(comp: Component): comp is CorruptedComponent {
  return comp.type === 'corrupted';
}

// =============================================================================
// Generic type-safe getter helper
// =============================================================================

/**
 * Type-safe component getter with automatic type narrowing.
 *
 * @example
 * const pos = getTypedComponent(entity, CT.Position, isPositionComponent);
 * if (!pos) return;
 * // pos is automatically typed as PositionComponent
 * const x = pos.x;
 */
export function getTypedComponent<T extends Component>(
  entity: { getComponent: (type: string) => Component | undefined },
  type: string,
  guard: (comp: Component) => comp is T
): T | undefined {
  const comp = entity.getComponent(type);
  if (!comp || !guard(comp)) return undefined;
  return comp;
}
