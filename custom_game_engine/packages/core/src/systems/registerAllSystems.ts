/**
 * Centralized System Registration
 *
 * This module provides a single function to register all game systems.
 * Use this in both main.ts and headless.ts to ensure they stay in sync.
 *
 * When adding a new system, add it here ONCE and both entry points get it.
 */

import type { GameLoop } from '../loop/GameLoop.js';
import type { System } from '../ecs/System.js';
import type { ISystemRegistry } from '../ecs/SystemRegistry.js';
import type { EventBus } from '../events/EventBus.js';
import type { LLMDecisionQueue } from '../types/LLMTypes.js';
import type { PromptBuilder } from '../decision/LLMDecisionProcessor.js';
import type { ScheduledDecisionProcessor } from '../decision/ScheduledDecisionProcessor.js';
import type { ChunkManager, TerrainGenerator } from '@ai-village/world';
import { type FeatureFlags, ALL_SYSTEMS_ON, setActiveFeatureFlags, setEntityBudget } from './FeatureFlags.js';

/**
 * Simplified EventBus interface used by some combat systems.
 * HuntingSystem and AgentCombatSystem define their own minimal EventBus interface
 * internally for loose coupling. The main EventBus satisfies this structurally,
 * but TypeScript requires explicit casting for interface compatibility.
 */
interface SimplifiedEventBus {
  emit(event: string, data: unknown): void;
  on(event: string, handler: (data: unknown) => void): void;
}

// Time & Environment
import { TimeSystem } from './TimeSystem.js';
import { TimeCompressionSystem } from './TimeCompressionSystem.js';
import { TimeThrottleCoordinator } from './TimeThrottleCoordinator.js';
import { StatisticalModeManager } from './StatisticalModeManager.js';
import { WeatherSystem } from './WeatherSystem.js';
import { WeatherEcologySystem } from './WeatherEcologySystem.js';
import { TemperatureSystem } from './TemperatureSystem.js';
import { FireSpreadSystem } from './FireSpreadSystem.js';
import { SoilSystem } from './SoilSystem.js';

// Infrastructure
import { SpatialGridMaintenanceSystem } from './SpatialGridMaintenanceSystem.js';
import { SoASyncSystem } from './SoASyncSystem.js';

// Plants - Import from @ai-village/botany package and pass via config.plantSystems
// Plant systems have been moved to @ai-village/botany
import { PlantVisualsSystem } from './PlantVisualsSystem.js';

// Animals
import { AnimalSystem } from './AnimalSystem.js';
import { AnimalProductionSystem } from './AnimalProductionSystem.js';
import { AnimalHousingSystem } from './AnimalHousingSystem.js';
import { WildAnimalSpawningSystem } from './WildAnimalSpawningSystem.js';
import { AquaticAnimalSpawningSystem } from './AquaticAnimalSpawningSystem.js';
import { TamingSystem } from './TamingSystem.js';
import { WorkingAnimalSystem } from './WorkingAnimalSystem.js';
import { AnimalGroupSystem } from './AnimalGroupSystem.js';
import { PredatorPreyEcologySystem } from './PredatorPreyEcologySystem.js';
import { AnimalVisualsSystem } from './AnimalVisualsSystem.js';

// Uplift (Animal Consciousness)
import { UpliftCandidateDetectionSystem } from '../uplift/UpliftCandidateDetectionSystem.js';
import { ProtoSapienceObservationSystem } from '../uplift/ProtoSapienceObservationSystem.js';
import { ConsciousnessEmergenceSystem } from '../uplift/ConsciousnessEmergenceSystem.js';
import { UpliftBreedingProgramSystem } from '../uplift/UpliftBreedingProgramSystem.js';

// Rendering
import { AnimationSystem } from './AnimationSystem.js';
import { AgentVisualsSystem } from './AgentVisualsSystem.js';

// Agent Core
import { AgentBrainSystem } from './AgentBrainSystem.js';
import { MovementSystem } from './MovementSystem.js';
import { MovementIntentionSystem } from './MovementIntentionSystem.js';
import { StateMutatorSystem } from './StateMutatorSystem.js';
import { FluidDynamicsSystem } from './FluidDynamicsSystem.js';
import { PlanetaryCurrentsSystem } from './PlanetaryCurrentsSystem.js';
import { AgentSwimmingSystem } from './AgentSwimmingSystem.js';
import { NeedsSystem } from './NeedsSystem.js';
import { MoodSystem } from './MoodSystem.js';
import { SleepSystem } from './SleepSystem.js';
import { SteeringSystem } from './SteeringSystem.js';
import { AgeTrackingSystem } from './AgeTrackingSystem.js';

// Memory & Cognition
import { MemorySystem } from './MemorySystem.js';
import { MemoryFormationSystem } from './MemoryFormationSystem.js';
import { MemoryConsolidationSystem } from './MemoryConsolidationSystem.js';
import { SpatialMemoryQuerySystem } from './SpatialMemoryQuerySystem.js';
import { ReflectionSystem } from './ReflectionSystem.js';
import { JournalingSystem } from './JournalingSystem.js';
import { BeliefFormationSystem } from './BeliefFormationSystem.js';
import { BeliefGenerationSystem } from './BeliefGenerationSystem.js';

// Social & Communication
import { CommunicationSystem } from './CommunicationSystem.js';
import { SocialFatigueSystem } from './SocialFatigueSystem.js';
import { SocialGradientSystem } from './SocialGradientSystem.js';
import { VerificationSystem } from './VerificationSystem.js';
import { InterestsSystem } from './InterestsSystem.js';
// Phase 6: Emergent Social Dynamics - RE-ENABLED
import { RelationshipConversationSystem } from './RelationshipConversationSystem.js';
// import { FriendshipSystem } from './FriendshipSystem.js'; // TODO: Enable after RelationshipConversationSystem tested
import { GreetingSystem } from './GreetingSystem.js';
import { InterestEvolutionSystem } from './InterestEvolutionSystem.js';
import { CrossRealmPhoneSystem } from './CrossRealmPhoneSystem.js';
import { CellPhoneSystem } from '../communication/CellPhoneSystem.js';
import { RadioBroadcastingSystem } from '../radio/RadioBroadcastingSystem.js';

// Exploration & Navigation
import { ExplorationSystem } from './ExplorationSystem.js';
import { ExplorationDiscoverySystem } from './ExplorationDiscoverySystem.js';
import { StellarMiningSystem } from './StellarMiningSystem.js';
import { LandmarkNamingSystem } from './LandmarkNamingSystem.js';
import { CivilizationalLegendsSystem } from './CivilizationalLegendsSystem.js';
import { EmotionalNavigationSystem } from '../navigation/EmotionalNavigationSystem.js';
import { VRSystem } from '../vr/VRSystem.js';

// Fleet & Squadron Management
import { NavySystem } from './NavySystem.js';
import { NavyPersonnelSystem } from './NavyPersonnelSystem.js';
import { ShipyardProductionSystem } from './ShipyardProductionSystem.js';
import { ArmadaSystem } from './ArmadaSystem.js';
import { FleetSystem } from './FleetSystem.js';
import { SquadronSystem } from './SquadronSystem.js';
import { FleetCoherenceSystem } from './FleetCoherenceSystem.js';
import { CrewStressSystem } from './CrewStressSystem.js';
import { HeartChamberNetworkSystem } from './HeartChamberNetworkSystem.js';
import { StragglerRecoverySystem } from './StragglerRecoverySystem.js';
import { FleetCombatSystem } from './FleetCombatSystem.js';
import { SquadronCombatSystem } from './SquadronCombatSystem.js';
import { ShipCombatSystem } from './ShipCombatSystem.js';
import { NavyBudgetSystem } from './NavyBudgetSystem.js';

// Megastructures (Phase 5: Grand Strategy)
import { MegastructureConstructionSystem } from './MegastructureConstructionSystem.js';
import { MegastructureMaintenanceSystem } from './MegastructureMaintenanceSystem.js';
import { ArchaeologySystem } from './ArchaeologySystem.js';

// Building & Construction
import { BuildingSystem } from './BuildingSystem.js';
import { BuildingMaintenanceSystem } from './BuildingMaintenanceSystem.js';
import { BuildingUpgradeSystem } from './BuildingUpgradeSystem.js';
import { BuildingSpatialAnalysisSystem } from './BuildingSpatialAnalysisSystem.js';
import { ResourceGatheringSystem } from './ResourceGatheringSystem.js';
import { RoofRepairSystem } from './RoofRepairSystem.js';

// Tile-Based Voxel Building (Phase 3-4)
import { TreeFellingSystem } from './TreeFellingSystem.js';
import { getTileConstructionSystem } from './TileConstructionSystem.js';
import { DoorSystem } from './DoorSystem.js';

// Automation & Production (Phase 38)
import { PowerGridSystem } from './PowerGridSystem.js';
import { BeltSystem } from './BeltSystem.js';
import { DirectConnectionSystem } from './DirectConnectionSystem.js';
import { AssemblyMachineSystem } from './AssemblyMachineSystem.js';
import { FactoryAISystem } from './FactoryAISystem.js';
import { OffScreenProductionSystem } from './OffScreenProductionSystem.js';

// Economy & Trade
import { TradingSystem } from './TradingSystem.js';
import { MarketEventSystem } from './MarketEventSystem.js';
import { TradeAgreementSystem } from './TradeAgreementSystem.js';
import { TradeEscortSystem } from './TradeEscortSystem.js';

// Skills & Crafting
import { SkillSystem } from './SkillSystem.js';
import { CookingSystem } from './CookingSystem.js';
import { DurabilitySystem } from './DurabilitySystem.js';
import { ExperimentationSystem } from './ExperimentationSystem.js';

// Research
import { ResearchSystem } from './ResearchSystem.js';
import { AcademicPaperSystem } from '../research/AcademicPaperSystem.js';
import { CookInfluencerSystem } from '../research/CookInfluencerSystem.js';
import { HerbalistDiscoverySystem } from '../research/HerbalistDiscoverySystem.js';
import { InventorFameSystem } from '../research/InventorFameSystem.js';
import { PublicationSystem } from '../research/PublicationSystem.js';
import { ChroniclerSystem } from '../research/ChroniclerSystem.js';

// Publishing & Knowledge Infrastructure
import { LibrarySystem } from './LibrarySystem.js';
import { BookstoreSystem } from './BookstoreSystem.js';
import { UniversitySystem } from './UniversitySystem.js';
import { UniversityResearchManagementSystem } from './UniversityResearchManagementSystem.js';
import { PublishingProductionSystem } from './PublishingProductionSystem.js';
import { PublishingUnlockSystem } from './PublishingUnlockSystem.js';
import { TechnologyUnlockSystem } from './TechnologyUnlockSystem.js';
import { TechnologyEraSystem } from './TechnologyEraSystem.js';
import { CollapseSystem } from './CollapseSystem.js';
import { KnowledgePreservationSystem } from './KnowledgePreservationSystem.js';
import { ProductionScalingSystem } from './ProductionScalingSystem.js';
import { CityBuildingGenerationSystem } from './CityBuildingGenerationSystem.js';
import { ProfessionWorkSimulationSystem } from './ProfessionWorkSimulationSystem.js';
import { EventReportingSystem } from './EventReportingSystem.js';

// Television & Media
import { GameShowSystem } from '../television/formats/GameShowSystem.js';
import { NewsroomSystem } from '../television/formats/NewsroomSystem.js';
import { SoapOperaSystem } from '../television/formats/SoapOperaSystem.js';
import { TalkShowSystem } from '../television/formats/TalkShowSystem.js';
// import { CastingSystem } from '../television/production/CastingSystem.js'; // TODO: Not a System class
import { TVWritingSystem } from '../television/systems/TVWritingSystem.js';
import { TVDevelopmentSystem } from '../television/systems/TVDevelopmentSystem.js';
import { TVProductionSystem } from '../television/systems/TVProductionSystem.js';
import { TVPostProductionSystem } from '../television/systems/TVPostProductionSystem.js';
import { TVBroadcastingSystem } from '../television/systems/TVBroadcastingSystem.js';
import { TVRatingsSystem } from '../television/systems/TVRatingsSystem.js';
import { TVCulturalImpactSystem } from '../television/systems/TVCulturalImpactSystem.js';
import { TVArchiveSystem } from '../television/systems/TVArchiveSystem.js';
import { TVAdvertisingSystem } from '../television/systems/TVAdvertisingSystem.js';

// Plot & Narrative
import { PlotAssignmentSystem } from '../plot/PlotAssignmentSystem.js';
import { PlotProgressionSystem } from '../plot/PlotProgressionSystem.js';
import { NarrativePressureSystem } from '../narrative/NarrativePressureSystem.js';
import { FatesCouncilSystem } from '../plot/FatesCouncilSystem.js';

// Consciousness
import { HiveMindSystem } from '../consciousness/HiveMindSystem.js';
import { PackMindSystem } from '../consciousness/PackMindSystem.js';

// Magic
import { MagicSystem } from './MagicSystem.js';
import { SpellDiscoverySystem } from './SpellDiscoverySystem.js';
// import { MagicDetectionSystem } from '../magic/MagicDetectionSystem.js'; // TODO: Not a System class, utility functions only

// Idle & Goals
import { IdleBehaviorSystem } from './IdleBehaviorSystem.js';
import { GoalGenerationSystem } from './GoalGenerationSystem.js';

// Divinity - Core
import { DeityEmergenceSystem } from './DeityEmergenceSystem.js';
import { AIGodBehaviorSystem } from './AIGodBehaviorSystem.js';
import { DivinePowerSystem } from './DivinePowerSystem.js';
import { FaithMechanicsSystem } from './FaithMechanicsSystem.js';
import { PrayerSystem } from './PrayerSystem.js';
import { PrayerAnsweringSystem } from './PrayerAnsweringSystem.js';
import { SpiritualResponseSystem } from './SpiritualResponseSystem.js';
import { MythGenerationSystem } from './MythGenerationSystem.js';
import { MythRetellingSystem } from './MythRetellingSystem.js';
import { ChatRoomSystem } from '../communication/ChatRoomSystem.js';
import { CompanionSystem } from './CompanionSystem.js';
// import { AttributionSystem } from '../divinity/AttributionSystem.js'; // TODO: Not a System class, utility functions only
import { VisionDeliverySystem } from '../divinity/VisionDeliverySystem.js';

// Divinity - Institutions
import { TempleSystem } from './TempleSystem.js';
import { PriesthoodSystem } from './PriesthoodSystem.js';
import { RitualSystem } from './RitualSystem.js';
import { HolyTextSystem } from './HolyTextSystem.js';
import { SacredSiteSystem } from './SacredSiteSystem.js';

// Divinity - Avatar & Angels
import { AvatarSystem } from './AvatarSystem.js';
import { AngelSystem } from './AngelSystem.js';
import { AdminAngelSystem } from './AdminAngelSystem.js';
import { MilestoneSystem } from './MilestoneSystem.js';
import { DiscoveryNamingSystem } from './DiscoveryNamingSystem.js';
import { PatronBindingSystem } from './PatronBindingSystem.js';
import { PossessionSystem } from './PossessionSystem.js';
import { PlayerInputSystem } from './PlayerInputSystem.js';
import { PlayerActionSystem } from './PlayerActionSystem.js';

// Player Avatar System (jack-in/jack-out)
import { AvatarManagementSystem } from './AvatarManagementSystem.js';
import { AvatarRespawnSystem } from './AvatarRespawnSystem.js';
import { MortalPawnSystem } from './MortalPawnSystem.js';

// Divinity - Advanced Theology
import { SchismSystem } from './SchismSystem.js';
import { SyncretismSystem } from './SyncretismSystem.js';
import { ReligiousCompetitionSystem } from './ReligiousCompetitionSystem.js';
import { ConversionWarfareSystem } from './ConversionWarfareSystem.js';

// Divinity - World Impact
import { TerrainModificationSystem } from './TerrainModificationSystem.js';
import { SpeciesCreationSystem } from './SpeciesCreationSystem.js';
import { DivineWeatherControl } from './DivineWeatherControl.js';
import { DivineBodyModification } from './DivineBodyModification.js';
import { MassEventSystem } from './MassEventSystem.js';

// Divinity - Creator
import { CreatorSurveillanceSystem } from './CreatorSurveillanceSystem.js';
import { CreatorInterventionSystem } from './CreatorInterventionSystem.js';
import { LoreSpawnSystem } from './LoreSpawnSystem.js';
import { RealityAnchorSystem } from './RealityAnchorSystem.js';
import { RebellionEventSystem } from './RebellionEventSystem.js';

// Body & Reproduction
import { BodySystem } from './BodySystem.js';
import { EquipmentSystem } from './EquipmentSystem.js';
import { ReproductionSystem } from './ReproductionSystem.js';
import { CourtshipSystem } from './CourtshipSystem.js';
import { MidwiferySystem } from '../reproduction/midwifery/MidwiferySystem.js';
import { ParentingSystem } from './ParentingSystem.js';
import { ParasiticReproductionSystem } from '../reproduction/parasitic/ParasiticReproductionSystem.js';
import { ColonizationSystem } from '../reproduction/parasitic/ColonizationSystem.js';
// TODO: Fix incomplete implementation before enabling
// import { JealousySystem } from './JealousySystem.js';

// Neural & Tech
import { NeuralInterfaceSystem } from '../neural/NeuralInterfaceSystem.js';
import { VRTrainingSystem } from '../neural/VRTrainingSystem.js';

// Communication (additional systems)
import { WalkieTalkieSystem } from '../communication/WalkieTalkieSystem.js';

// Combat & Security
import { AgentCombatSystem } from './AgentCombatSystem.js';
import { DominanceChallengeSystem } from './DominanceChallengeSystem.js';
import { GuardDutySystem } from './GuardDutySystem.js';
import { HuntingSystem } from './HuntingSystem.js';
import { InjurySystem } from './InjurySystem.js';
import { PredatorAttackSystem } from './PredatorAttackSystem.js';
import { VillageDefenseSystem } from './VillageDefenseSystem.js';
import { ThreatResponseSystem } from './ThreatResponseSystem.js';

// Realms & Portals
import { PassageSystem } from './PassageSystem.js';
import { PassageTraversalSystem } from './PassageTraversalSystem.js';
import { TimelineMergerSystem } from './TimelineMergerSystem.js';
import { ProbabilityScoutSystem } from './ProbabilityScoutSystem.js';
import { SvetzRetrievalSystem } from './SvetzRetrievalSystem.js';
import { InvasionSystem } from './InvasionSystem.js';
import { PortalSystem } from './PortalSystem.js';
import { RealmTimeSystem } from './RealmTimeSystem.js';
import { UniverseForkingSystem } from './UniverseForkingSystem.js';
import { ParadoxDetectionSystem } from './ParadoxDetectionSystem.js';
import { DivergenceTrackingSystem } from './DivergenceTrackingSystem.js';
import { CanonEventSystem } from './CanonEventSystem.js';
import { DeathJudgmentSystem } from './DeathJudgmentSystem.js';
import { DeathBargainSystem } from './DeathBargainSystem.js';
import { DeathTransitionSystem } from './DeathTransitionSystem.js';
import { AfterlifeMemoryFadingSystem } from './AfterlifeMemoryFadingSystem.js';
import { WisdomGoddessSystem } from './WisdomGoddessSystem.js';
import { RealmManager } from './RealmManager.js';
import { AfterlifeNeedsSystem } from './AfterlifeNeedsSystem.js';
import { AncestorTransformationSystem } from './AncestorTransformationSystem.js';
import { ReincarnationSystem } from './ReincarnationSystem.js';
import { SoulCreationSystem } from './SoulCreationSystem.js';
import { PixelLabSpriteGenerationSystem } from './PixelLabSpriteGenerationSystem.js';
import { SoulConsolidationSystem } from '../soul/SoulConsolidationSystem.js';
import { SoulRepositorySystem } from './SoulRepositorySystem.js';

// Clarketech
import { ClarketechSystem } from '../clarketech/ClarketechSystem.js';

// Apps & Artifacts
import { AppSystem } from '../apps/AppSystem.js';
import { ArtifactSystem } from '../items/ArtifactSystem.js';

// Decision Systems
import { AutonomicSystem } from '../decision/AutonomicSystem.js';

// Multi-Village System
import { VillageSummarySystem } from './VillageSummarySystem.js';
import { InterVillageCaravanSystem } from './InterVillageCaravanSystem.js';
import { NewsPropagationSystem } from './NewsPropagationSystem.js';

// Governance & Metrics
import { GovernanceDataSystem } from './GovernanceDataSystem.js';
import { VillageGovernanceSystem } from './VillageGovernanceSystem.js';
import { CityGovernanceSystem } from './CityGovernanceSystem.js';
import { ProvinceGovernanceSystem } from './ProvinceGovernanceSystem.js';
import { NationSystem } from './NationSystem.js';  // Nation-level governance
import { EmpireSystem } from './EmpireSystem.js';  // Empire-level governance
import { EmpireDiplomacySystem } from './EmpireDiplomacySystem.js';  // Inter-empire diplomatic AI
import { EmpireWarSystem } from './EmpireWarSystem.js';  // Imperial war resolution
import { UpliftDiplomacySystem } from './UpliftDiplomacySystem.js';  // Civilization uplift diplomacy
import { FederationGovernanceSystem } from './FederationGovernanceSystem.js';  // Federation governance
import { GalacticCouncilSystem } from './GalacticCouncilSystem.js';  // Galactic Council governance
import { InvasionPlotHandler } from './InvasionPlotHandler.js';  // Phase 4: Multiverse invasion plots
import { GovernorDecisionSystem } from './GovernorDecisionSystem.js';  // Phase 6: AI Governance
import { MetricsCollectionSystem } from './MetricsCollectionSystem.js';
import { CityDirectorSystem } from './CityDirectorSystem.js';

// Auto-save & Chunk Sync
import { AutoSaveSystem } from './AutoSaveSystem.js';
import { ChunkSyncSystem } from './ChunkSyncSystem.js';

// Query Cache Monitoring
import { QueryCacheMonitorSystem } from './QueryCacheMonitorSystem.js';

// Event Coalescing Monitoring
import { EventCoalescingMonitorSystem } from './EventCoalescingMonitorSystem.js';

// Lore — Audio
import { SongSystem } from '../lore/SongSystem.js';
import { ChorusStateSystem } from './ChorusStateSystem.js';
import { SpellWorldEffectSystem } from './SpellWorldEffectSystem.js';
import { AchievementService } from './AchievementService.js';

// Animal Brain (from behavior module)
import { AnimalBrainSystem } from '../behavior/animal-behaviors/AnimalBrainSystem.js';

// Chunk Loading System
import { ChunkLoadingSystem } from './ChunkLoadingSystem.js';

// Background Chunk Generation System
import { BackgroundChunkGeneratorSystem } from './BackgroundChunkGeneratorSystem.js';
import { PredictiveChunkLoadingSystem } from './PredictiveChunkLoadingSystem.js';

/**
 * Validate system dependency ordering.
 * Checks if systems declare dependencies on systems that run at same time or later.
 * Logs warnings for potential dependency issues.
 */
function validateSystemDependencies(registry: ISystemRegistry): void {
  const systems = registry.getSorted();
  const priorityMap = new Map(systems.map(s => [s.id, s.priority]));

  for (const system of systems) {
    if (system.metadata?.dependsOn) {
      for (const depId of system.metadata.dependsOn) {
        const depPriority = priorityMap.get(depId);
        if (depPriority !== undefined && depPriority >= system.priority) {
          console.warn(
            `[SystemRegistry] Dependency order issue: ${system.id} (priority ${system.priority}) ` +
            `depends on ${depId} (priority ${depPriority}) which runs at same time or later`
          );
        }
      }
    }
  }
}

/**
 * LLM-related types (passed from caller to avoid circular dependency)
 */
export interface LLMDependencies {
  /** LLM queue for AI-powered systems (from @ai-village/llm) */
  llmQueue?: LLMDecisionQueue;
  /** Prompt builder for agent brain (from @ai-village/llm) */
  promptBuilder?: PromptBuilder;
  /** Scheduled decision processor with LLMScheduler (from @ai-village/core) - NEW SCHEDULER-BASED APPROACH */
  scheduledProcessor?: ScheduledDecisionProcessor;
}

/**
 * Plant system classes to use. Import from @ai-village/botany for the extracted versions.
 * If not provided, falls back to the deprecated core versions.
 */
export interface PlantSystemsConfig {
  /** PlantSystem class constructor */
  PlantSystem: new (eventBus: EventBus) => System;
  /** PlantDiscoverySystem class constructor */
  PlantDiscoverySystem: new () => System;
  /** PlantDiseaseSystem class constructor */
  PlantDiseaseSystem: new (config?: any) => System;
  /** WildPlantPopulationSystem class constructor */
  WildPlantPopulationSystem: new (config?: any) => System;
  /** PlantCrossPollinationSystem class constructor */
  PlantCrossPollinationSystem: new (eventBus?: EventBus) => System;
}

/**
 * Configuration for system registration
 */
export interface SystemRegistrationConfig extends LLMDependencies {
  /** Feature flags to control which system categories are registered. Defaults to ALL_SYSTEMS_ON. */
  featureFlags?: FeatureFlags;
  /** Sprint number for entity budget caps. If set, enforces NPC limits per sprint. */
  sprintNumber?: number;
  /** Session ID for metrics */
  gameSessionId?: string;
  /** Metrics server URL */
  metricsServerUrl?: string;
  /** Enable metrics streaming */
  enableMetrics?: boolean;
  /** Enable auto-save */
  enableAutoSave?: boolean;
  /**
   * Plant systems to use. REQUIRED - Import from @ai-village/botany:
   * ```typescript
   * import { PlantSystem, PlantDiscoverySystem, PlantDiseaseSystem, WildPlantPopulationSystem, PlantCrossPollinationSystem } from '@ai-village/botany';
   * registerAllSystems(gameLoop, {
   *   plantSystems: { PlantSystem, PlantDiscoverySystem, PlantDiseaseSystem, WildPlantPopulationSystem, PlantCrossPollinationSystem }
   * });
   * ```
   * Throws an error at runtime if not provided.
   */
  plantSystems?: PlantSystemsConfig;
  /** ChunkManager instance for terrain chunk loading (optional - if not provided, ChunkLoadingSystem won't be registered) */
  chunkManager?: ChunkManager;
  /** TerrainGenerator instance for chunk generation (optional - if not provided, ChunkLoadingSystem won't be registered) */
  terrainGenerator?: TerrainGenerator;
}

/**
 * Result of system registration
 */
export interface SystemRegistrationResult {
  soilSystem?: SoilSystem;
  plantSystem?: System;
  wildAnimalSpawning?: WildAnimalSpawningSystem;
  aquaticAnimalSpawning?: AquaticAnimalSpawningSystem;
  governanceDataSystem?: GovernanceDataSystem;
  metricsSystem?: MetricsCollectionSystem;
  magicSystem?: MagicSystem;
  researchSystem?: ResearchSystem;
  divinePowerSystem?: DivinePowerSystem;
  marketEventSystem?: MarketEventSystem;
  realmManager?: RealmManager;
  chunkLoadingSystem?: ChunkLoadingSystem;
  fatesCouncilSystem?: FatesCouncilSystem;
  /** The active feature flags used for this registration */
  featureFlags: Readonly<FeatureFlags>;
}

/**
 * Register all game systems with the game loop.
 *
 * This is the single source of truth for system registration.
 * Both main.ts and headless.ts should use this function.
 */
export function registerAllSystems(
  gameLoop: GameLoop,
  config: SystemRegistrationConfig = {}
): SystemRegistrationResult {
  const { llmQueue, promptBuilder, scheduledProcessor, gameSessionId, metricsServerUrl, enableMetrics = true, enableAutoSave = true, plantSystems, chunkManager, terrainGenerator, featureFlags, sprintNumber } = config;

  // Set active feature flags for runtime query
  const flags = featureFlags ?? ALL_SYSTEMS_ON;
  setActiveFeatureFlags(flags);

  // Set entity budget caps for this sprint
  if (sprintNumber !== undefined) {
    setEntityBudget(sprintNumber);
  }

  // Plant systems must be provided from @ai-village/botany
  if (!plantSystems) {
    throw new Error(
      'plantSystems config is required. Import plant systems from @ai-village/botany:\n' +
      'import { PlantSystem, PlantDiscoverySystem, PlantDiseaseSystem, WildPlantPopulationSystem, PlantCrossPollinationSystem } from "@ai-village/botany";\n' +
      'registerAllSystems(gameLoop, { plantSystems: { PlantSystem, PlantDiscoverySystem, PlantDiseaseSystem, WildPlantPopulationSystem, PlantCrossPollinationSystem } });'
    );
  }
  const PlantSystemClass = plantSystems.PlantSystem;
  const PlantDiscoverySystemClass = plantSystems.PlantDiscoverySystem;
  const PlantDiseaseSystemClass = plantSystems.PlantDiseaseSystem;
  const WildPlantPopulationSystemClass = plantSystems.WildPlantPopulationSystem;
  const PlantCrossPollinationSystemClass = plantSystems.PlantCrossPollinationSystem;
  const eventBus = gameLoop.world.eventBus;

  // Helper to register a system in disabled state (uses the system's actual id)
  const registerDisabled = (system: System) => {
    gameLoop.systemRegistry.register(system);
    gameLoop.systemRegistry.disable(system.id);
  };

  // ============================================================================
  // TIME & ENVIRONMENT
  // ============================================================================
  let soilSystem: SoilSystem | undefined;
  if (flags.time) {
    gameLoop.systemRegistry.register(new TimeSystem());
    gameLoop.systemRegistry.register(new TimeCompressionSystem());
    gameLoop.systemRegistry.register(new TimeThrottleCoordinator());
    gameLoop.systemRegistry.register(new StatisticalModeManager());
  }
  if (flags.environment) {
    gameLoop.systemRegistry.register(new WeatherSystem());
    gameLoop.systemRegistry.register(new WeatherEcologySystem());
    soilSystem = new SoilSystem();
    gameLoop.systemRegistry.register(soilSystem);
  }

  // ============================================================================
  // INFRASTRUCTURE - SPATIAL INDEXING & SOA SYNCHRONIZATION
  // ============================================================================
  if (flags.infrastructure) {
    gameLoop.systemRegistry.register(new SoASyncSystem());
    gameLoop.systemRegistry.register(new SpatialGridMaintenanceSystem());
  }

  // ============================================================================
  // CHUNK LOADING (Terrain Generation)
  // ============================================================================
  let chunkLoadingSystem: ChunkLoadingSystem | undefined;
  if (flags.terrain) {
    if (chunkManager && terrainGenerator) {
      chunkLoadingSystem = new ChunkLoadingSystem(chunkManager, terrainGenerator);
      gameLoop.systemRegistry.register(chunkLoadingSystem);
    }
    gameLoop.systemRegistry.register(new BackgroundChunkGeneratorSystem());
    gameLoop.systemRegistry.register(new PredictiveChunkLoadingSystem());
  }

  // StateMutatorSystem - Batched vector updates (priority 5, runs before most systems)
  // Core infrastructure needed by many systems — register if movement OR environment is on
  if (flags.movement || flags.environment || flags.agentNeeds) {
    const stateMutator = new StateMutatorSystem();
    gameLoop.systemRegistry.register(stateMutator);
  }

  if (flags.fluidDynamics) {
    gameLoop.systemRegistry.register(new FluidDynamicsSystem());
    gameLoop.systemRegistry.register(new PlanetaryCurrentsSystem());
    gameLoop.systemRegistry.register(new AgentSwimmingSystem());
  }

  if (flags.environment) {
    gameLoop.systemRegistry.register(new TemperatureSystem());
    gameLoop.systemRegistry.register(new FireSpreadSystem());
  }

  // ============================================================================
  // RENDERING
  // ============================================================================
  if (flags.rendering) {
    gameLoop.systemRegistry.register(new AnimationSystem());
    gameLoop.systemRegistry.register(new PlantVisualsSystem());
    gameLoop.systemRegistry.register(new AnimalVisualsSystem());
    gameLoop.systemRegistry.register(new AgentVisualsSystem());
  }

  // ============================================================================
  // PLANTS (use @ai-village/botany systems if provided, otherwise deprecated core versions)
  // ============================================================================
  let plantSystem: System | undefined;
  if (flags.plants) {
    plantSystem = new PlantSystemClass(eventBus);
    gameLoop.systemRegistry.register(plantSystem);
    gameLoop.systemRegistry.register(new PlantDiscoverySystemClass());
    gameLoop.systemRegistry.register(new PlantDiseaseSystemClass(eventBus));
    gameLoop.systemRegistry.register(new WildPlantPopulationSystemClass(eventBus));
    gameLoop.systemRegistry.register(new PlantCrossPollinationSystemClass());
  }

  // ============================================================================
  // ANIMALS
  // ============================================================================
  let wildAnimalSpawning: WildAnimalSpawningSystem | undefined;
  let aquaticAnimalSpawning: AquaticAnimalSpawningSystem | undefined;
  if (flags.animals) {
    gameLoop.systemRegistry.register(new AnimalBrainSystem());
    gameLoop.systemRegistry.register(new AnimalSystem());
    gameLoop.systemRegistry.register(new AnimalProductionSystem());
    gameLoop.systemRegistry.register(new AnimalHousingSystem());
    wildAnimalSpawning = new WildAnimalSpawningSystem();
    gameLoop.systemRegistry.register(wildAnimalSpawning);
    aquaticAnimalSpawning = new AquaticAnimalSpawningSystem();
    gameLoop.systemRegistry.register(aquaticAnimalSpawning);
    gameLoop.systemRegistry.register(new TamingSystem());
    gameLoop.systemRegistry.register(new WorkingAnimalSystem());
    gameLoop.systemRegistry.register(new AnimalGroupSystem());
    gameLoop.systemRegistry.register(new PredatorPreyEcologySystem());
  }

  // ============================================================================
  // UPLIFT (Animal Consciousness Emergence)
  // ============================================================================
  if (flags.uplift) {
    registerDisabled(new UpliftCandidateDetectionSystem());
    registerDisabled(new ProtoSapienceObservationSystem());
    registerDisabled(new ConsciousnessEmergenceSystem());
    registerDisabled(new UpliftBreedingProgramSystem());
  }

  // ============================================================================
  // AGENT CORE
  // ============================================================================
  if (flags.agentBrain) {
    gameLoop.systemRegistry.register(new IdleBehaviorSystem());
    gameLoop.systemRegistry.register(new GoalGenerationSystem());
    gameLoop.systemRegistry.register(
      new AgentBrainSystem(
        llmQueue,
        promptBuilder,
        undefined,
        scheduledProcessor
      )
    );
  }

  if (flags.movement) {
    gameLoop.systemRegistry.register(new MovementIntentionSystem());
    gameLoop.systemRegistry.register(new MovementSystem());
    gameLoop.systemRegistry.register(new SteeringSystem());
  }

  if (flags.agentNeeds) {
    gameLoop.systemRegistry.register(new NeedsSystem());
    gameLoop.systemRegistry.register(new MoodSystem());
    gameLoop.systemRegistry.register(new SleepSystem());
    gameLoop.systemRegistry.register(new AgeTrackingSystem());
  }

  // ============================================================================
  // MEMORY & COGNITION
  // ============================================================================
  if (flags.memory) {
    gameLoop.systemRegistry.register(new MemorySystem());
    gameLoop.systemRegistry.register(new MemoryFormationSystem(eventBus));
    gameLoop.systemRegistry.register(new MemoryConsolidationSystem());
    gameLoop.systemRegistry.register(new SpatialMemoryQuerySystem());
    gameLoop.systemRegistry.register(new ReflectionSystem());
    gameLoop.systemRegistry.register(new JournalingSystem());
    gameLoop.systemRegistry.register(new BeliefFormationSystem());
    gameLoop.systemRegistry.register(new BeliefGenerationSystem());
  }

  // ============================================================================
  // SOCIAL & COMMUNICATION
  // ============================================================================
  if (flags.social) {
    gameLoop.systemRegistry.register(new CommunicationSystem());
    gameLoop.systemRegistry.register(new ChatRoomSystem());
    gameLoop.systemRegistry.register(new SocialFatigueSystem());
    gameLoop.systemRegistry.register(new SocialGradientSystem());
    gameLoop.systemRegistry.register(new VerificationSystem());
    gameLoop.systemRegistry.register(new InterestsSystem());
    gameLoop.systemRegistry.register(new RelationshipConversationSystem());
    gameLoop.systemRegistry.register(new InterestEvolutionSystem());
    gameLoop.systemRegistry.register(new GreetingSystem());
  }

  if (flags.advancedComms) {
    registerDisabled(new CrossRealmPhoneSystem());
    registerDisabled(new CellPhoneSystem());
    registerDisabled(new WalkieTalkieSystem());
    registerDisabled(new RadioBroadcastingSystem());
  }

  // ============================================================================
  // EXPLORATION & NAVIGATION
  // ============================================================================
  if (flags.exploration) {
    gameLoop.systemRegistry.register(new ExplorationSystem());
    if (llmQueue) {
      gameLoop.systemRegistry.register(new LandmarkNamingSystem(llmQueue));
    }
    gameLoop.systemRegistry.register(new EmotionalNavigationSystem());
    gameLoop.systemRegistry.register(new ExplorationDiscoverySystem());
    registerDisabled(new StellarMiningSystem());
  }

  // ============================================================================
  // FLEET & SQUADRON MANAGEMENT
  // ============================================================================
  if (flags.fleet) {
    registerDisabled(new NavySystem());
    registerDisabled(new NavyPersonnelSystem());
    registerDisabled(new ShipyardProductionSystem());
    registerDisabled(new ArmadaSystem());
    registerDisabled(new FleetSystem());
    registerDisabled(new SquadronSystem());
    registerDisabled(new FleetCoherenceSystem());
    registerDisabled(new CrewStressSystem());
    registerDisabled(new StragglerRecoverySystem());
    registerDisabled(new HeartChamberNetworkSystem());
    registerDisabled(new FleetCombatSystem());
    registerDisabled(new SquadronCombatSystem());
    registerDisabled(new ShipCombatSystem());
    registerDisabled(new NavyBudgetSystem());
  }

  // ============================================================================
  // MEGASTRUCTURES (Phase 5: Grand Strategy)
  // ============================================================================
  if (flags.megastructures) {
    registerDisabled(new MegastructureConstructionSystem());
    registerDisabled(new MegastructureMaintenanceSystem());
    registerDisabled(new ArchaeologySystem());
  }

  // ============================================================================
  // VIRTUAL REALITY
  // ============================================================================
  if (flags.vr) {
    gameLoop.systemRegistry.register(new VRSystem());
    gameLoop.systemRegistry.disable('vr_system');
  }

  // ============================================================================
  // BUILDING & CONSTRUCTION
  // ============================================================================
  if (flags.building) {
    gameLoop.systemRegistry.register(new BuildingSystem());
    gameLoop.systemRegistry.register(new RoofRepairSystem());
    gameLoop.systemRegistry.register(new BuildingMaintenanceSystem());
    gameLoop.systemRegistry.register(new BuildingUpgradeSystem());
    gameLoop.systemRegistry.register(new BuildingSpatialAnalysisSystem());
    gameLoop.systemRegistry.register(new ResourceGatheringSystem());
    gameLoop.systemRegistry.register(new TreeFellingSystem());
    gameLoop.systemRegistry.register(getTileConstructionSystem());
    gameLoop.systemRegistry.register(new DoorSystem());
  }

  // ============================================================================
  // AUTOMATION & PRODUCTION (Phase 38)
  // ============================================================================
  if (flags.automation) {
    registerDisabled(new FactoryAISystem());
    registerDisabled(new OffScreenProductionSystem());
    registerDisabled(new PowerGridSystem());
    registerDisabled(new DirectConnectionSystem());
    registerDisabled(new BeltSystem());
    registerDisabled(new AssemblyMachineSystem());
  }

  // ============================================================================
  // ECONOMY & TRADE
  // ============================================================================
  let marketEventSystem: MarketEventSystem | undefined;
  if (flags.economy) {
    registerDisabled(new TradingSystem());
    marketEventSystem = new MarketEventSystem();
    registerDisabled(marketEventSystem);
    registerDisabled(new TradeAgreementSystem());
    registerDisabled(new TradeEscortSystem());
  }

  // ============================================================================
  // SKILLS & CRAFTING
  // ============================================================================
  if (flags.skills) {
    gameLoop.systemRegistry.register(new SkillSystem());
    gameLoop.systemRegistry.register(new CookingSystem());
    gameLoop.systemRegistry.register(new DurabilitySystem());
    gameLoop.systemRegistry.register(new ExperimentationSystem());
  }

  // ============================================================================
  // RESEARCH
  // ============================================================================
  let researchSystem: ResearchSystem | undefined;
  if (flags.research) {
    researchSystem = new ResearchSystem();
    gameLoop.systemRegistry.register(researchSystem);
    const academicPaperSystem = new AcademicPaperSystem();
    academicPaperSystem.initialize(gameLoop.world, eventBus);
    registerDisabled(academicPaperSystem);
    registerDisabled(new CookInfluencerSystem());
    gameLoop.systemRegistry.register(new HerbalistDiscoverySystem());
    registerDisabled(new InventorFameSystem());
    registerDisabled(new PublicationSystem());
    registerDisabled(new ChroniclerSystem());
  }

  // ============================================================================
  // TECHNOLOGY (always-on if flag enabled — TechnologyUnlockSystem enables other systems)
  // ============================================================================
  if (flags.technology) {
    const technologyUnlockSystem = new TechnologyUnlockSystem(eventBus, gameLoop.systemRegistry);
    gameLoop.systemRegistry.register(technologyUnlockSystem);
    gameLoop.systemRegistry.register(new TechnologyEraSystem());
    gameLoop.systemRegistry.register(new CollapseSystem());
    gameLoop.systemRegistry.register(new EventReportingSystem());
  }

  // ============================================================================
  // PUBLISHING & KNOWLEDGE INFRASTRUCTURE
  // ============================================================================
  if (flags.publishing) {
    registerDisabled(new PublishingUnlockSystem(eventBus));
    registerDisabled(new KnowledgePreservationSystem());
    registerDisabled(new ProductionScalingSystem());
    registerDisabled(new CityBuildingGenerationSystem());
    registerDisabled(new ProfessionWorkSimulationSystem());
    registerDisabled(new PublishingProductionSystem());
    registerDisabled(new LibrarySystem());
    registerDisabled(new BookstoreSystem());
    const universitySystem = new UniversitySystem(eventBus);
    registerDisabled(universitySystem);
    const universityResearchManagementSystem = new UniversityResearchManagementSystem();
    universityResearchManagementSystem.setUniversitySystem(universitySystem);
    registerDisabled(universityResearchManagementSystem);
  }

  // ============================================================================
  // MAGIC
  // ============================================================================
  let magicSystem: MagicSystem | undefined;
  if (flags.magic) {
    magicSystem = new MagicSystem();
    gameLoop.systemRegistry.register(magicSystem);
    gameLoop.systemRegistry.register(new SpellDiscoverySystem());
  }

  // ============================================================================
  // BODY & REPRODUCTION
  // ============================================================================
  if (flags.bodyReproduction) {
    gameLoop.systemRegistry.register(new BodySystem());
    gameLoop.systemRegistry.register(new EquipmentSystem());
    gameLoop.systemRegistry.register(new ReproductionSystem());
    gameLoop.systemRegistry.register(new CourtshipSystem());
    gameLoop.systemRegistry.register(new MidwiferySystem());
    gameLoop.systemRegistry.register(new ParentingSystem());
    registerDisabled(new ParasiticReproductionSystem());
    gameLoop.systemRegistry.register(new ColonizationSystem());
  }

  // ============================================================================
  // NEURAL & TECH
  // ============================================================================
  if (flags.vr) {
    registerDisabled(new NeuralInterfaceSystem());
    registerDisabled(new VRTrainingSystem());
  }

  // ============================================================================
  // DIVINITY
  // ============================================================================
  let divinePowerSystem: DivinePowerSystem | undefined;
  if (flags.divinity) {
    gameLoop.systemRegistry.register(new DeityEmergenceSystem({}, llmQueue || undefined));
    gameLoop.systemRegistry.register(new AIGodBehaviorSystem());
    divinePowerSystem = new DivinePowerSystem();
    gameLoop.systemRegistry.register(divinePowerSystem);
    gameLoop.systemRegistry.register(new FaithMechanicsSystem());
    gameLoop.systemRegistry.register(new PrayerSystem());
    gameLoop.systemRegistry.register(new SpiritualResponseSystem());
    gameLoop.systemRegistry.register(new PrayerAnsweringSystem());
    if (llmQueue) {
      gameLoop.systemRegistry.register(new MythGenerationSystem(llmQueue));
      gameLoop.systemRegistry.register(new MythRetellingSystem());
    }
    gameLoop.systemRegistry.register(new CompanionSystem());

    // Institutions
    registerDisabled(new TempleSystem());
    registerDisabled(new PriesthoodSystem());
    registerDisabled(new RitualSystem());
    registerDisabled(new HolyTextSystem());
    registerDisabled(new SacredSiteSystem());

    // Avatar & Angels
    registerDisabled(new AvatarSystem());
    registerDisabled(new AngelSystem());
  }

  // ============================================================================
  // PLAYER AVATAR SYSTEM
  // ============================================================================
  if (flags.playerAvatar) {
    gameLoop.systemRegistry.register(new PlayerInputSystem());
    gameLoop.systemRegistry.register(new PossessionSystem());
    gameLoop.systemRegistry.register(new PlayerActionSystem());
    gameLoop.systemRegistry.register(new AvatarManagementSystem());
    gameLoop.systemRegistry.register(new AvatarRespawnSystem());
    gameLoop.systemRegistry.register(new MortalPawnSystem());
    gameLoop.systemRegistry.register(new PatronBindingSystem());
  }

  // ============================================================================
  // ADMIN ANGEL, MILESTONE, ADVANCED DIVINITY
  // ============================================================================
  if (flags.divinity) {
    gameLoop.systemRegistry.register(new AdminAngelSystem({ llmQueue }));
    if (llmQueue) {
      gameLoop.systemRegistry.register(new CivilizationalLegendsSystem(llmQueue));
    }
    gameLoop.systemRegistry.register(new MilestoneSystem());
    gameLoop.systemRegistry.register(new DiscoveryNamingSystem());

    // Advanced theology
    registerDisabled(new SchismSystem());
    registerDisabled(new SyncretismSystem());
    registerDisabled(new ReligiousCompetitionSystem());
    registerDisabled(new ConversionWarfareSystem());

    // World impact
    registerDisabled(new TerrainModificationSystem());
    registerDisabled(new SpeciesCreationSystem());
    registerDisabled(new DivineWeatherControl());
    registerDisabled(new DivineBodyModification());
    registerDisabled(new MassEventSystem());

    // Creator
    gameLoop.systemRegistry.register(new CreatorSurveillanceSystem());
    gameLoop.systemRegistry.register(new CreatorInterventionSystem());
    gameLoop.systemRegistry.register(new LoreSpawnSystem());
    gameLoop.systemRegistry.register(new RealityAnchorSystem());
    gameLoop.systemRegistry.register(new RebellionEventSystem());
  }

  // ============================================================================
  // COMBAT & SECURITY
  // ============================================================================
  if (flags.combat) {
    gameLoop.systemRegistry.register(new HuntingSystem());
    gameLoop.systemRegistry.register(new PredatorAttackSystem());
    gameLoop.systemRegistry.register(new AgentCombatSystem());
    gameLoop.systemRegistry.register(new DominanceChallengeSystem());
    gameLoop.systemRegistry.register(new InjurySystem());
    gameLoop.systemRegistry.register(new GuardDutySystem());
    gameLoop.systemRegistry.register(new VillageDefenseSystem());
    gameLoop.systemRegistry.register(new ThreatResponseSystem());
  }

  // ============================================================================
  // REALMS & PORTALS (Multiverse)
  // ============================================================================
  if (flags.multiverse) {
    registerDisabled(new UniverseForkingSystem());
    registerDisabled(new DivergenceTrackingSystem());
    registerDisabled(new CanonEventSystem());
    registerDisabled(new PassageSystem());
    registerDisabled(new PassageTraversalSystem());
    registerDisabled(new TimelineMergerSystem());
    registerDisabled(new ProbabilityScoutSystem());
    registerDisabled(new SvetzRetrievalSystem());
    registerDisabled(new InvasionSystem());
    registerDisabled(new ParadoxDetectionSystem());
    registerDisabled(new PortalSystem());
    gameLoop.systemRegistry.register(new RealmTimeSystem());
  }

  // ============================================================================
  // DEATH & REALMS
  // ============================================================================
  let realmManager: RealmManager | undefined;
  if (flags.deathRealms) {
    gameLoop.systemRegistry.register(new DeathJudgmentSystem());
    const deathBargainSystem = new DeathBargainSystem();
    gameLoop.systemRegistry.register(deathBargainSystem);
    const deathTransitionSystem = new DeathTransitionSystem();
    deathTransitionSystem.setDeathBargainSystem(deathBargainSystem);
    gameLoop.systemRegistry.register(deathTransitionSystem);
    realmManager = new RealmManager();
    gameLoop.systemRegistry.register(realmManager);
    gameLoop.systemRegistry.register(new SoulCreationSystem());
    gameLoop.systemRegistry.register(new PixelLabSpriteGenerationSystem());
    gameLoop.systemRegistry.register(new SoulConsolidationSystem());
    if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
      gameLoop.systemRegistry.register(new SoulRepositorySystem());
    }
    registerDisabled(new AfterlifeNeedsSystem());
    registerDisabled(new AncestorTransformationSystem());
    registerDisabled(new ReincarnationSystem());
    registerDisabled(new AfterlifeMemoryFadingSystem());
    registerDisabled(new WisdomGoddessSystem());
  }

  // ============================================================================
  // TELEVISION & MEDIA
  // ============================================================================
  if (flags.television) {
    registerDisabled(new GameShowSystem());
    registerDisabled(new NewsroomSystem());
    registerDisabled(new SoapOperaSystem());
    registerDisabled(new TalkShowSystem());
    registerDisabled(new TVWritingSystem());
    registerDisabled(new TVDevelopmentSystem());
    registerDisabled(new TVProductionSystem());
    registerDisabled(new TVPostProductionSystem());
    registerDisabled(new TVBroadcastingSystem());
    registerDisabled(new TVRatingsSystem());
    registerDisabled(new TVCulturalImpactSystem());
    registerDisabled(new TVArchiveSystem());
    registerDisabled(new TVAdvertisingSystem());
  }

  // ============================================================================
  // PLOT & NARRATIVE
  // ============================================================================
  let fatesCouncilSystem: FatesCouncilSystem | undefined;
  if (flags.plot) {
    registerDisabled(new PlotAssignmentSystem());
    registerDisabled(new PlotProgressionSystem());
    registerDisabled(new NarrativePressureSystem());
    if (llmQueue) {
      fatesCouncilSystem = new FatesCouncilSystem(llmQueue);
      registerDisabled(fatesCouncilSystem);
    }
  }

  // ============================================================================
  // CONSCIOUSNESS (Collective Minds)
  // ============================================================================
  if (flags.collectiveConsciousness) {
    registerDisabled(new HiveMindSystem());
    registerDisabled(new PackMindSystem());
  }

  // ============================================================================
  // CLARKETECH
  // ============================================================================
  if (flags.clarketech) {
    registerDisabled(new ClarketechSystem());
  }

  // ============================================================================
  // APPS & ARTIFACTS
  // ============================================================================
  if (flags.apps) {
    registerDisabled(new AppSystem());
  }

  // ============================================================================
  // MULTI-VILLAGE SYSTEM
  // ============================================================================
  if (flags.multiVillage) {
    registerDisabled(new VillageSummarySystem());
    registerDisabled(new InterVillageCaravanSystem());
    registerDisabled(new NewsPropagationSystem());
  }

  // ============================================================================
  // GOVERNANCE
  // ============================================================================
  let governanceDataSystem: GovernanceDataSystem | undefined;
  if (flags.governance) {
    governanceDataSystem = new GovernanceDataSystem();
    gameLoop.systemRegistry.register(governanceDataSystem);
    gameLoop.systemRegistry.register(new CityDirectorSystem());
    gameLoop.systemRegistry.register(new VillageGovernanceSystem());
    gameLoop.systemRegistry.register(new CityGovernanceSystem());
    gameLoop.systemRegistry.register(new ProvinceGovernanceSystem());
    gameLoop.systemRegistry.register(new NationSystem());
    registerDisabled(new EmpireSystem());
    registerDisabled(new EmpireDiplomacySystem());
    registerDisabled(new EmpireWarSystem());
    registerDisabled(new FederationGovernanceSystem());
    registerDisabled(new GalacticCouncilSystem());
    registerDisabled(new InvasionPlotHandler());
    registerDisabled(new UpliftDiplomacySystem());
    registerDisabled(new GovernorDecisionSystem(llmQueue));
  }

  // ============================================================================
  // METRICS (Optional)
  // ============================================================================
  let metricsSystem: MetricsCollectionSystem | undefined;
  if (enableMetrics && metricsServerUrl) {
    metricsSystem = new MetricsCollectionSystem({
      streaming: true,
      streamConfig: {
        serverUrl: metricsServerUrl,
        flushInterval: 5000,
        gameSessionId: gameSessionId || `game_${Date.now()}`,
      },
    });
    gameLoop.systemRegistry.register(metricsSystem);
  }

  // ============================================================================
  // MONITORING
  // ============================================================================
  // QueryCacheMonitorSystem (priority 990) - Logs cache statistics every 5 minutes
  gameLoop.systemRegistry.register(new QueryCacheMonitorSystem());

  // EventCoalescingMonitorSystem (priority 998) - Logs event coalescing statistics every 5 minutes
  gameLoop.systemRegistry.register(new EventCoalescingMonitorSystem());

  // ============================================================================
  // ACHIEVEMENT TRACKING (priority 910 — Folkfork cross-game achievements)
  // ============================================================================
  gameLoop.systemRegistry.register(new AchievementService());

  // ============================================================================
  // LORE — AUDIO (browser-only, self-guards against non-browser contexts)
  // ============================================================================
  gameLoop.systemRegistry.register(new SongSystem());

  // ============================================================================
  // CHORUS STATE (cross-game Folkfork collective intelligence — priority 45)
  // ============================================================================
  gameLoop.systemRegistry.register(new ChorusStateSystem());

  // ============================================================================
  // SPELL WORLD EFFECTS (Drive 3 — Spell Sandbox world mutations, priority 160)
  // ============================================================================
  gameLoop.systemRegistry.register(new SpellWorldEffectSystem());

  // ============================================================================
  // AUTO-SAVE (Optional)
  // ============================================================================
  if (enableAutoSave) {
    const autoSaveSystem = new AutoSaveSystem(llmQueue);
    gameLoop.systemRegistry.register(autoSaveSystem);
  }

  // ============================================================================
  // CHUNK SYNC (Server-backed terrain persistence)
  // ============================================================================
  // Always register - system self-disables if not using ServerBackedChunkManager
  const chunkSyncSystem = new ChunkSyncSystem();
  gameLoop.systemRegistry.register(chunkSyncSystem);

  // ============================================================================
  // VALIDATION
  // ============================================================================
  // Validate system dependency ordering
  validateSystemDependencies(gameLoop.systemRegistry);

  return {
    soilSystem,
    plantSystem,
    wildAnimalSpawning,
    aquaticAnimalSpawning,
    governanceDataSystem,
    metricsSystem,
    magicSystem,
    researchSystem,
    divinePowerSystem,
    marketEventSystem,
    realmManager,
    chunkLoadingSystem,
    fatesCouncilSystem,
    featureFlags: flags,
  };
}
