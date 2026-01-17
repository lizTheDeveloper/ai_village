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
import type { LLMDecisionQueue, PromptBuilder } from '../decision/LLMDecisionProcessor.js';
import type { ScheduledDecisionProcessor } from '../decision/ScheduledDecisionProcessor.js';
import type { ChunkManager, TerrainGenerator } from '@ai-village/world';

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
import { WeatherSystem } from './WeatherSystem.js';
import { TemperatureSystem } from './TemperatureSystem.js';
import { FireSpreadSystem } from './FireSpreadSystem.js';
import { SoilSystem } from './SoilSystem.js';

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
import { StateMutatorSystem } from './StateMutatorSystem.js';
import { FluidDynamicsSystem } from './FluidDynamicsSystem.js';
import { PlanetaryCurrentsSystem } from './PlanetaryCurrentsSystem.js';
import { AgentSwimmingSystem } from './AgentSwimmingSystem.js';
import { NeedsSystem } from './NeedsSystem.js';
import { MoodSystem } from './MoodSystem.js';
import { SleepSystem } from './SleepSystem.js';
import { SteeringSystem } from './SteeringSystem.js';

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
// import { InterestEvolutionSystem } from './InterestEvolutionSystem.js';
import { CrossRealmPhoneSystem } from './CrossRealmPhoneSystem.js';
import { CellPhoneSystem } from '../communication/CellPhoneSystem.js';
import { RadioBroadcastingSystem } from '../radio/RadioBroadcastingSystem.js';

// Exploration & Navigation
import { ExplorationSystem } from './ExplorationSystem.js';
import { LandmarkNamingSystem } from './LandmarkNamingSystem.js';
import { EmotionalNavigationSystem } from '../navigation/EmotionalNavigationSystem.js';
import { VRSystem } from '../vr/VRSystem.js';

// Building & Construction
import { BuildingSystem } from './BuildingSystem.js';
import { BuildingMaintenanceSystem } from './BuildingMaintenanceSystem.js';
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

// Consciousness
import { HiveMindSystem } from '../consciousness/HiveMindSystem.js';
import { PackMindSystem } from '../consciousness/PackMindSystem.js';

// Magic
import { MagicSystem } from './MagicSystem.js';
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
import { PossessionSystem } from './PossessionSystem.js';
import { PlayerInputSystem } from './PlayerInputSystem.js';

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
import { PortalSystem } from './PortalSystem.js';
import { RealmTimeSystem } from './RealmTimeSystem.js';
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
// SoulRepositorySystem uses Node.js APIs (fs, path) - imported dynamically below

// Clarketech
import { ClarketechSystem } from '../clarketech/ClarketechSystem.js';

// Apps & Artifacts
import { AppSystem } from '../apps/AppSystem.js';
import { ArtifactSystem } from '../items/ArtifactSystem.js';

// Decision Systems
import { AutonomicSystem } from '../decision/AutonomicSystem.js';

// Governance & Metrics
import { GovernanceDataSystem } from './GovernanceDataSystem.js';
import { MetricsCollectionSystem } from './MetricsCollectionSystem.js';
import { CityDirectorSystem } from './CityDirectorSystem.js';

// Auto-save
import { AutoSaveSystem } from './AutoSaveSystem.js';

// Animal Brain (from behavior module)
import { AnimalBrainSystem } from '../behavior/animal-behaviors/AnimalBrainSystem.js';

// Chunk Loading System
import { ChunkLoadingSystem } from './ChunkLoadingSystem.js';

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
  PlantSystem: new (eventBus: EventBus) => System & { setStateMutatorSystem(s: StateMutatorSystem): void };
  /** PlantDiscoverySystem class constructor */
  PlantDiscoverySystem: new () => System;
  /** PlantDiseaseSystem class constructor */
  PlantDiseaseSystem: new (eventBus: EventBus) => System;
  /** WildPlantPopulationSystem class constructor */
  WildPlantPopulationSystem: new (eventBus: EventBus) => System;
}

/**
 * Configuration for system registration
 */
export interface SystemRegistrationConfig extends LLMDependencies {
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
   * import { PlantSystem, PlantDiscoverySystem, PlantDiseaseSystem, WildPlantPopulationSystem } from '@ai-village/botany';
   * registerAllSystems(gameLoop, {
   *   plantSystems: { PlantSystem, PlantDiscoverySystem, PlantDiseaseSystem, WildPlantPopulationSystem }
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
  soilSystem: SoilSystem;
  /** PlantSystem instance (from @ai-village/botany or deprecated core version) */
  plantSystem: System & { setStateMutatorSystem(s: StateMutatorSystem): void };
  wildAnimalSpawning: WildAnimalSpawningSystem;
  aquaticAnimalSpawning: AquaticAnimalSpawningSystem;
  governanceDataSystem: GovernanceDataSystem;
  metricsSystem?: MetricsCollectionSystem;
  magicSystem: MagicSystem;
  researchSystem: ResearchSystem;
  divinePowerSystem: DivinePowerSystem;
  marketEventSystem: MarketEventSystem;
  realmManager: RealmManager;
  /** ChunkLoadingSystem instance (if chunkManager and terrainGenerator were provided) */
  chunkLoadingSystem?: ChunkLoadingSystem;
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
  const { llmQueue, promptBuilder, scheduledProcessor, gameSessionId, metricsServerUrl, enableMetrics = true, enableAutoSave = true, plantSystems, chunkManager, terrainGenerator } = config;

  // Plant systems must be provided from @ai-village/botany
  if (!plantSystems) {
    throw new Error(
      'plantSystems config is required. Import plant systems from @ai-village/botany:\n' +
      'import { PlantSystem, PlantDiscoverySystem, PlantDiseaseSystem, WildPlantPopulationSystem } from "@ai-village/botany";\n' +
      'registerAllSystems(gameLoop, { plantSystems: { PlantSystem, PlantDiscoverySystem, PlantDiseaseSystem, WildPlantPopulationSystem } });'
    );
  }
  const PlantSystemClass = plantSystems.PlantSystem;
  const PlantDiscoverySystemClass = plantSystems.PlantDiscoverySystem;
  const PlantDiseaseSystemClass = plantSystems.PlantDiseaseSystem;
  const WildPlantPopulationSystemClass = plantSystems.WildPlantPopulationSystem;
  const eventBus = gameLoop.world.eventBus;

  // Helper to register a system in disabled state (uses the system's actual id)
  const registerDisabled = (system: System) => {
    gameLoop.systemRegistry.register(system);
    gameLoop.systemRegistry.disable(system.id);
  };

  // ============================================================================
  // TIME & ENVIRONMENT
  // ============================================================================
  gameLoop.systemRegistry.register(new TimeSystem());
  gameLoop.systemRegistry.register(new WeatherSystem());

  const soilSystem = new SoilSystem();
  gameLoop.systemRegistry.register(soilSystem);

  // ============================================================================
  // CHUNK LOADING (Terrain Generation)
  // ============================================================================
  // ChunkLoadingSystem - Handles chunk loading and terrain generation
  // In visual mode: loads chunks around camera viewport
  // In headless mode: loads chunks around agents
  let chunkLoadingSystem: ChunkLoadingSystem | undefined;
  if (chunkManager && terrainGenerator) {
    chunkLoadingSystem = new ChunkLoadingSystem(chunkManager, terrainGenerator);
    gameLoop.systemRegistry.register(chunkLoadingSystem);
  }

  // StateMutatorSystem - Batched vector updates (priority 5, runs before most systems)
  // Used by: NeedsSystem, BuildingMaintenanceSystem, AnimalSystem, PlantSystem, TemperatureSystem, etc.
  const stateMutator = new StateMutatorSystem();
  gameLoop.systemRegistry.register(stateMutator);

  // FluidDynamicsSystem - Dwarf Fortress-style water flow (priority 16)
  // Updates once per game minute for planetary-scale performance
  const fluidDynamics = new FluidDynamicsSystem();
  gameLoop.systemRegistry.register(fluidDynamics);

  // PlanetaryCurrentsSystem - Large-scale ocean circulation (priority 17)
  // Handles ocean gyres, thermohaline circulation, and tidal forces
  const planetaryCurrents = new PlanetaryCurrentsSystem();
  gameLoop.systemRegistry.register(planetaryCurrents);

  // AgentSwimmingSystem - Depth-based swimming mechanics (priority 18)
  // Oxygen consumption and pressure damage - uses StateMutatorSystem for gradual effects
  const agentSwimming = new AgentSwimmingSystem();
  agentSwimming.setStateMutatorSystem(stateMutator);
  gameLoop.systemRegistry.register(agentSwimming);

  // TemperatureSystem - Uses StateMutatorSystem for batched temperature damage
  const temperatureSystem = new TemperatureSystem();
  temperatureSystem.setStateMutatorSystem(stateMutator);
  gameLoop.systemRegistry.register(temperatureSystem);

  // FireSpreadSystem - Handles fire spreading and burning damage
  // Uses StateMutatorSystem for batched burning DoT damage
  const fireSpreadSystem = new FireSpreadSystem();
  fireSpreadSystem.setStateMutatorSystem(stateMutator);
  gameLoop.systemRegistry.register(fireSpreadSystem);

  // ============================================================================
  // RENDERING
  // ============================================================================
  gameLoop.systemRegistry.register(new AnimationSystem());

  // ============================================================================
  // VISUAL METADATA (computes sizeMultiplier/alpha from game state)
  // Priority 300-301: Runs after growth systems, before rendering applies values
  // ============================================================================
  gameLoop.systemRegistry.register(new PlantVisualsSystem());
  gameLoop.systemRegistry.register(new AnimalVisualsSystem());
  gameLoop.systemRegistry.register(new AgentVisualsSystem());

  // ============================================================================
  // PLANTS (use @ai-village/botany systems if provided, otherwise deprecated core versions)
  // ============================================================================
  // PlantSystem - Uses StateMutatorSystem for batched hydration/age/health updates
  const plantSystem = new PlantSystemClass(eventBus);
  plantSystem.setStateMutatorSystem(stateMutator);
  gameLoop.systemRegistry.register(plantSystem);
  gameLoop.systemRegistry.register(new PlantDiscoverySystemClass());
  gameLoop.systemRegistry.register(new PlantDiseaseSystemClass(eventBus));
  gameLoop.systemRegistry.register(new WildPlantPopulationSystemClass(eventBus));

  // ============================================================================
  // ANIMALS
  // ============================================================================
  gameLoop.systemRegistry.register(new AnimalBrainSystem());

  // AnimalSystem - Uses StateMutatorSystem for batched needs/age decay updates
  const animalSystem = new AnimalSystem();
  animalSystem.setStateMutatorSystem(stateMutator);
  gameLoop.systemRegistry.register(animalSystem);

  gameLoop.systemRegistry.register(new AnimalProductionSystem(eventBus));
  gameLoop.systemRegistry.register(new AnimalHousingSystem());
  const wildAnimalSpawning = new WildAnimalSpawningSystem();
  gameLoop.systemRegistry.register(wildAnimalSpawning);
  const aquaticAnimalSpawning = new AquaticAnimalSpawningSystem();
  gameLoop.systemRegistry.register(aquaticAnimalSpawning);
  gameLoop.systemRegistry.register(new TamingSystem());

  // ============================================================================
  // UPLIFT (Animal Consciousness Emergence)
  // ============================================================================
  // Tech requirement: consciousness_studies (research lab + biology research)
  registerDisabled(new UpliftCandidateDetectionSystem());
  registerDisabled(new ProtoSapienceObservationSystem());
  registerDisabled(new ConsciousnessEmergenceSystem());
  registerDisabled(new UpliftBreedingProgramSystem());

  // ============================================================================
  // AGENT CORE
  // ============================================================================
  gameLoop.systemRegistry.register(new IdleBehaviorSystem());
  gameLoop.systemRegistry.register(new GoalGenerationSystem(eventBus));

  // Always register AgentBrainSystem - it works without LLM (uses scripted behaviors)
  // NEW: If scheduledProcessor provided, use scheduler-based approach for intelligent layer selection
  gameLoop.systemRegistry.register(
    new AgentBrainSystem(
      llmQueue,
      promptBuilder,
      undefined, // behaviorRegistry (use default)
      scheduledProcessor // NEW: ScheduledDecisionProcessor
    )
  );

  gameLoop.systemRegistry.register(new MovementSystem());

  // NeedsSystem - Uses StateMutatorSystem for batched decay updates
  const needsSystem = new NeedsSystem();
  needsSystem.setStateMutatorSystem(stateMutator);
  gameLoop.systemRegistry.register(needsSystem);

  gameLoop.systemRegistry.register(new MoodSystem());

  // SleepSystem - Uses StateMutatorSystem for batched sleep drive and energy recovery
  const sleepSystem = new SleepSystem();
  sleepSystem.setStateMutatorSystem(stateMutator);
  gameLoop.systemRegistry.register(sleepSystem);

  gameLoop.systemRegistry.register(new SteeringSystem());

  // ============================================================================
  // MEMORY & COGNITION
  // ============================================================================
  gameLoop.systemRegistry.register(new MemorySystem());
  gameLoop.systemRegistry.register(new MemoryFormationSystem(eventBus));
  gameLoop.systemRegistry.register(new MemoryConsolidationSystem());
  gameLoop.systemRegistry.register(new SpatialMemoryQuerySystem());
  gameLoop.systemRegistry.register(new ReflectionSystem(eventBus));
  gameLoop.systemRegistry.register(new JournalingSystem(eventBus));
  gameLoop.systemRegistry.register(new BeliefFormationSystem());
  gameLoop.systemRegistry.register(new BeliefGenerationSystem());

  // ============================================================================
  // SOCIAL & COMMUNICATION
  // ============================================================================
  gameLoop.systemRegistry.register(new CommunicationSystem());
  gameLoop.systemRegistry.register(new SocialFatigueSystem());
  gameLoop.systemRegistry.register(new SocialGradientSystem());
  gameLoop.systemRegistry.register(new VerificationSystem());
  gameLoop.systemRegistry.register(new InterestsSystem());

  // Deep Conversation System - Phase 6: Emergent Social Dynamics - RE-ENABLED
  gameLoop.systemRegistry.register(new RelationshipConversationSystem());
  // gameLoop.systemRegistry.register(new FriendshipSystem()); // TODO: Enable after testing

  // Deep Conversation System - Phase 7.1: Interest Evolution
  // TODO: Fix incomplete implementations before enabling
  // gameLoop.systemRegistry.register(new InterestEvolutionSystem());

  // Cross-realm communication
  gameLoop.systemRegistry.register(new CrossRealmPhoneSystem());
  gameLoop.systemRegistry.register(new CellPhoneSystem());
  gameLoop.systemRegistry.register(new WalkieTalkieSystem());
  gameLoop.systemRegistry.register(new RadioBroadcastingSystem());

  // ============================================================================
  // EXPLORATION & NAVIGATION
  // ============================================================================
  gameLoop.systemRegistry.register(new ExplorationSystem());
  if (llmQueue) {
    gameLoop.systemRegistry.register(new LandmarkNamingSystem(llmQueue));
  }
  gameLoop.systemRegistry.register(new EmotionalNavigationSystem());

  // ============================================================================
  // VIRTUAL REALITY
  // ============================================================================
  // Tech requirement: vr_headset (requires neural_interface research)
  gameLoop.systemRegistry.register(new VRSystem());
  gameLoop.systemRegistry.disable('vr_system');

  // ============================================================================
  // BUILDING & CONSTRUCTION
  // ============================================================================
  gameLoop.systemRegistry.register(new BuildingSystem());

  // RoofRepairSystem - One-time migration to add roofs to existing buildings
  gameLoop.systemRegistry.register(new RoofRepairSystem());

  // BuildingMaintenanceSystem - Uses StateMutatorSystem for batched condition decay
  const buildingMaintenanceSystem = new BuildingMaintenanceSystem();
  buildingMaintenanceSystem.setStateMutatorSystem(stateMutator);
  gameLoop.systemRegistry.register(buildingMaintenanceSystem);

  gameLoop.systemRegistry.register(new BuildingSpatialAnalysisSystem());
  // ResourceGatheringSystem - Uses StateMutatorSystem for batched resource regeneration
  const resourceGatheringSystem = new ResourceGatheringSystem();
  resourceGatheringSystem.setStateMutatorSystem(stateMutator);
  gameLoop.systemRegistry.register(resourceGatheringSystem);

  // Tile-Based Voxel Building (Phase 3-4)
  gameLoop.systemRegistry.register(new TreeFellingSystem(eventBus));
  // Use singleton to ensure behaviors use same instance
  gameLoop.systemRegistry.register(getTileConstructionSystem());
  // Door system for auto-open/close mechanics
  gameLoop.systemRegistry.register(new DoorSystem());

  // ============================================================================
  // AUTOMATION & PRODUCTION (Phase 38)
  // ============================================================================
  // Factory AI (priority 48 - autonomous management)
  gameLoop.systemRegistry.register(new FactoryAISystem());
  // Off-screen optimization (priority 49 - runs before full simulation)
  gameLoop.systemRegistry.register(new OffScreenProductionSystem());
  // Full simulation systems (priority 50+)
  gameLoop.systemRegistry.register(new PowerGridSystem());
  gameLoop.systemRegistry.register(new DirectConnectionSystem());
  gameLoop.systemRegistry.register(new BeltSystem());
  // AssemblyMachineSystem - Uses StateMutatorSystem for batched crafting progress
  const assemblyMachineSystem = new AssemblyMachineSystem();
  assemblyMachineSystem.setStateMutatorSystem(stateMutator);
  gameLoop.systemRegistry.register(assemblyMachineSystem);

  // ============================================================================
  // ECONOMY & TRADE
  // ============================================================================
  gameLoop.systemRegistry.register(new TradingSystem());
  const marketEventSystem = new MarketEventSystem(eventBus);
  gameLoop.systemRegistry.register(marketEventSystem);
  gameLoop.systemRegistry.register(new TradeAgreementSystem());

  // ============================================================================
  // SKILLS & CRAFTING
  // ============================================================================
  gameLoop.systemRegistry.register(new SkillSystem());
  gameLoop.systemRegistry.register(new CookingSystem());
  gameLoop.systemRegistry.register(new DurabilitySystem());
  gameLoop.systemRegistry.register(new ExperimentationSystem());

  // ============================================================================
  // RESEARCH
  // ============================================================================
  const researchSystem = new ResearchSystem();
  gameLoop.systemRegistry.register(researchSystem);

  const academicPaperSystem = new AcademicPaperSystem();
  academicPaperSystem.initialize(gameLoop.world, eventBus);
  gameLoop.systemRegistry.register(academicPaperSystem);

  gameLoop.systemRegistry.register(new CookInfluencerSystem());
  gameLoop.systemRegistry.register(new HerbalistDiscoverySystem());
  gameLoop.systemRegistry.register(new InventorFameSystem());
  gameLoop.systemRegistry.register(new PublicationSystem());
  gameLoop.systemRegistry.register(new ChroniclerSystem());

  // ============================================================================
  // PUBLISHING & KNOWLEDGE INFRASTRUCTURE
  // ============================================================================
  const publishingUnlockSystem = new PublishingUnlockSystem(eventBus);
  gameLoop.systemRegistry.register(publishingUnlockSystem);

  const technologyUnlockSystem = new TechnologyUnlockSystem(eventBus, gameLoop.systemRegistry);
  gameLoop.systemRegistry.register(technologyUnlockSystem);

  const cityBuildingGenerationSystem = new CityBuildingGenerationSystem(eventBus);
  gameLoop.systemRegistry.register(cityBuildingGenerationSystem);

  const professionWorkSimulationSystem = new ProfessionWorkSimulationSystem();
  gameLoop.systemRegistry.register(professionWorkSimulationSystem);

  const eventReportingSystem = new EventReportingSystem();
  gameLoop.systemRegistry.register(eventReportingSystem);

  const publishingProductionSystem = new PublishingProductionSystem(eventBus);
  gameLoop.systemRegistry.register(publishingProductionSystem);

  const librarySystem = new LibrarySystem(eventBus);
  gameLoop.systemRegistry.register(librarySystem);

  const bookstoreSystem = new BookstoreSystem(eventBus);
  gameLoop.systemRegistry.register(bookstoreSystem);

  const universitySystem = new UniversitySystem(eventBus);
  gameLoop.systemRegistry.register(universitySystem);

  const universityResearchManagementSystem = new UniversityResearchManagementSystem();
  universityResearchManagementSystem.setUniversitySystem(universitySystem);
  gameLoop.systemRegistry.register(universityResearchManagementSystem);

  // ============================================================================
  // MAGIC
  // ============================================================================
  const magicSystem = new MagicSystem();
  gameLoop.systemRegistry.register(magicSystem);
  // gameLoop.systemRegistry.register(new MagicDetectionSystem()); // TODO: Not a System class

  // ============================================================================
  // BODY & REPRODUCTION
  // ============================================================================
  const bodySystem = new BodySystem();
  bodySystem.setStateMutatorSystem(stateMutator);
  gameLoop.systemRegistry.register(bodySystem);
  gameLoop.systemRegistry.register(new EquipmentSystem());
  gameLoop.systemRegistry.register(new ReproductionSystem());
  gameLoop.systemRegistry.register(new CourtshipSystem());
  gameLoop.systemRegistry.register(new MidwiferySystem());
  gameLoop.systemRegistry.register(new ParentingSystem());
  // Tech requirement: parasitic_biology (requires advanced biology research)
  registerDisabled(new ParasiticReproductionSystem());
  gameLoop.systemRegistry.register(new ColonizationSystem());
  // TODO: Fix incomplete implementation before enabling
  // gameLoop.systemRegistry.register(new JealousySystem());

  // ============================================================================
  // NEURAL & TECH
  // ============================================================================
  // Tech requirement: neural_interface_lab (requires neuroscience research)
  registerDisabled(new NeuralInterfaceSystem());
  registerDisabled(new VRTrainingSystem());

  // ============================================================================
  // DIVINITY - CORE
  // ============================================================================
  gameLoop.systemRegistry.register(new DeityEmergenceSystem());
  gameLoop.systemRegistry.register(new AIGodBehaviorSystem());
  const divinePowerSystem = new DivinePowerSystem();
  gameLoop.systemRegistry.register(divinePowerSystem);
  gameLoop.systemRegistry.register(new FaithMechanicsSystem());
  gameLoop.systemRegistry.register(new PrayerSystem());
  gameLoop.systemRegistry.register(new PrayerAnsweringSystem());
  if (llmQueue) {
    gameLoop.systemRegistry.register(new MythGenerationSystem(llmQueue));
    gameLoop.systemRegistry.register(new MythRetellingSystem()); // Handles myth spreading & mutation
  }
  // MythGenerationSystem requires llmQueue, so skip if not provided

  // Chat Rooms - General chat system (DMs, group chats, divine chat, etc.)
  // Note: ChatRoomSystem replaces the deprecated DivineChatSystem
  const chatRoomSystem = new ChatRoomSystem();
  gameLoop.systemRegistry.register(chatRoomSystem);

  // Companion System - Ophanim tutorial/emotional companion
  gameLoop.systemRegistry.register(new CompanionSystem());

  // gameLoop.systemRegistry.register(new AttributionSystem()); // TODO: Not a System class
  // gameLoop.systemRegistry.register(new VisionDeliverySystem()); // TODO: Not a System class, requires constructor args

  // ============================================================================
  // DIVINITY - INSTITUTIONS
  // ============================================================================
  gameLoop.systemRegistry.register(new TempleSystem());
  gameLoop.systemRegistry.register(new PriesthoodSystem());
  gameLoop.systemRegistry.register(new RitualSystem());
  gameLoop.systemRegistry.register(new HolyTextSystem());
  gameLoop.systemRegistry.register(new SacredSiteSystem());

  // ============================================================================
  // DIVINITY - AVATAR & ANGELS
  // ============================================================================
  gameLoop.systemRegistry.register(new AvatarSystem());
  gameLoop.systemRegistry.register(new AngelSystem());

  // ============================================================================
  // PLAYER AVATAR SYSTEM (Phase 16: Polish & Player)
  // ============================================================================
  gameLoop.systemRegistry.register(new PlayerInputSystem());
  gameLoop.systemRegistry.register(new PossessionSystem());

  // ============================================================================
  // DIVINITY - ADVANCED THEOLOGY
  // ============================================================================
  gameLoop.systemRegistry.register(new SchismSystem());
  gameLoop.systemRegistry.register(new SyncretismSystem());
  gameLoop.systemRegistry.register(new ReligiousCompetitionSystem());
  gameLoop.systemRegistry.register(new ConversionWarfareSystem());

  // ============================================================================
  // DIVINITY - WORLD IMPACT
  // ============================================================================
  gameLoop.systemRegistry.register(new TerrainModificationSystem());
  gameLoop.systemRegistry.register(new SpeciesCreationSystem());
  gameLoop.systemRegistry.register(new DivineWeatherControl());
  gameLoop.systemRegistry.register(new DivineBodyModification());
  gameLoop.systemRegistry.register(new MassEventSystem());

  // ============================================================================
  // DIVINITY - CREATOR
  // ============================================================================
  gameLoop.systemRegistry.register(new CreatorSurveillanceSystem());
  gameLoop.systemRegistry.register(new CreatorInterventionSystem());
  gameLoop.systemRegistry.register(new LoreSpawnSystem());
  gameLoop.systemRegistry.register(new RealityAnchorSystem());
  gameLoop.systemRegistry.register(new RebellionEventSystem());

  // ============================================================================
  // COMBAT & SECURITY
  // ============================================================================
  // HuntingSystem now extends BaseSystem and handles event bus in onInitialize
  gameLoop.systemRegistry.register(new HuntingSystem());
  // PredatorAttackSystem, DominanceChallengeSystem, and AgentCombatSystem use the full EventBus type
  gameLoop.systemRegistry.register(new PredatorAttackSystem(eventBus));
  gameLoop.systemRegistry.register(new AgentCombatSystem(undefined, eventBus));
  gameLoop.systemRegistry.register(new DominanceChallengeSystem(eventBus));
  gameLoop.systemRegistry.register(new InjurySystem());
  gameLoop.systemRegistry.register(new GuardDutySystem(eventBus));
  gameLoop.systemRegistry.register(new VillageDefenseSystem());
  gameLoop.systemRegistry.register(new ThreatResponseSystem());

  // ============================================================================
  // REALMS & PORTALS
  // ============================================================================
  gameLoop.systemRegistry.register(new PassageSystem());
  gameLoop.systemRegistry.register(new PortalSystem());
  gameLoop.systemRegistry.register(new RealmTimeSystem());
  // RealmManager registered below with variable (line 666)
  gameLoop.systemRegistry.register(new DeathJudgmentSystem());

  // Death Bargain System - hero challenges to cheat death
  // Heroes can challenge the God of Death with riddles to win a second chance
  // Note: LLM riddle judgment requires LLMProvider (not llmQueue) - works without it using exact match
  const deathBargainSystem = new DeathBargainSystem();
  gameLoop.systemRegistry.register(deathBargainSystem);

  // Death Transition System - handles moving dead entities to afterlife
  // Routes souls based on deity worship, handles reincarnation/annihilation policies
  const deathTransitionSystem = new DeathTransitionSystem();
  deathTransitionSystem.setDeathBargainSystem(deathBargainSystem);
  gameLoop.systemRegistry.register(deathTransitionSystem);

  const realmManager = new RealmManager();
  gameLoop.systemRegistry.register(realmManager);

  // Soul Creation (divine ceremony for creating new souls)
  gameLoop.systemRegistry.register(new SoulCreationSystem());

  // PixelLab sprite generation for newborn souls
  gameLoop.systemRegistry.register(new PixelLabSpriteGenerationSystem());

  // Soul Consolidation (merge soul memories after death)
  gameLoop.systemRegistry.register(new SoulConsolidationSystem());

  // Soul Repository (persistent backup of all souls)
  // Only register in Node.js environment (uses fs, path, process.cwd)
  // Use dynamic import to avoid bundling Node.js modules in browser
  if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
    import('./SoulRepositorySystem.js').then(({ SoulRepositorySystem }) => {
      gameLoop.systemRegistry.register(new SoulRepositorySystem());
    }).catch(err => {
      console.warn('[registerAllSystems] SoulRepositorySystem not available:', err.message);
    });
  }

  // Afterlife systems (process souls in the Underworld)
  // AfterlifeNeedsSystem - Uses StateMutatorSystem for batched spiritual needs decay
  const afterlifeNeedsSystem = new AfterlifeNeedsSystem();
  afterlifeNeedsSystem.setStateMutatorSystem(stateMutator);
  gameLoop.systemRegistry.register(afterlifeNeedsSystem);
  gameLoop.systemRegistry.register(new AncestorTransformationSystem());
  gameLoop.systemRegistry.register(new ReincarnationSystem());
  gameLoop.systemRegistry.register(new AfterlifeMemoryFadingSystem());

  // Wisdom Goddess - manifests when pending approvals pile up, posts to divine chat
  const wisdomGoddessSystem = new WisdomGoddessSystem();
  wisdomGoddessSystem.setChatRoomSystem(chatRoomSystem);
  gameLoop.systemRegistry.register(wisdomGoddessSystem);

  // ============================================================================
  // TELEVISION & MEDIA
  // ============================================================================
  // Tech requirement: television_station (requires broadcasting technology)
  // TV Show Formats
  registerDisabled(new GameShowSystem());
  registerDisabled(new NewsroomSystem());
  registerDisabled(new SoapOperaSystem());
  registerDisabled(new TalkShowSystem());

  // TV Production Pipeline
  // gameLoop.systemRegistry.register(new CastingSystem()); // TODO: Not a System class
  registerDisabled(new TVWritingSystem());
  registerDisabled(new TVDevelopmentSystem());
  registerDisabled(new TVProductionSystem());
  registerDisabled(new TVPostProductionSystem());
  registerDisabled(new TVBroadcastingSystem());
  registerDisabled(new TVRatingsSystem());
  registerDisabled(new TVCulturalImpactSystem());
  registerDisabled(new TVArchiveSystem());
  registerDisabled(new TVAdvertisingSystem());

  // ============================================================================
  // PLOT & NARRATIVE
  // ============================================================================
  // Tech requirement: library or university (requires storytelling/literature)
  registerDisabled(new PlotAssignmentSystem());
  registerDisabled(new PlotProgressionSystem());
  registerDisabled(new NarrativePressureSystem());

  // ============================================================================
  // CONSCIOUSNESS (Collective Minds)
  // ============================================================================
  gameLoop.systemRegistry.register(new HiveMindSystem());
  gameLoop.systemRegistry.register(new PackMindSystem());

  // ============================================================================
  // AUTOMATION & FACTORIES (Phase 38)
  // ============================================================================
  // Factory automation systems already registered above (lines 342-349)
  // Systems: PowerGrid, Belt, DirectConnection, Assembly, FactoryAI, OffScreen

  // ============================================================================
  // CLARKETECH
  // ============================================================================
  gameLoop.systemRegistry.register(new ClarketechSystem());

  // ============================================================================
  // APPS & ARTIFACTS
  // ============================================================================
  gameLoop.systemRegistry.register(new AppSystem());
  // gameLoop.systemRegistry.register(new ArtifactSystem()); // TODO: Fix compilation errors - missing System interface implementation

  // ============================================================================
  // DECISION SYSTEMS
  // ============================================================================
  // gameLoop.systemRegistry.register(new AutonomicSystem()); // TODO: Not a System class, utility class only

  // ============================================================================
  // GOVERNANCE
  // ============================================================================
  const governanceDataSystem = new GovernanceDataSystem();
  gameLoop.systemRegistry.register(governanceDataSystem);
  gameLoop.systemRegistry.register(new CityDirectorSystem());

  // ============================================================================
  // METRICS (Optional)
  // ============================================================================
  let metricsSystem: MetricsCollectionSystem | undefined;
  if (enableMetrics && metricsServerUrl) {
    metricsSystem = new MetricsCollectionSystem(gameLoop.world, {
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
  // AUTO-SAVE (Optional)
  // ============================================================================
  if (enableAutoSave) {
    const autoSaveSystem = new AutoSaveSystem();
    gameLoop.systemRegistry.register(autoSaveSystem);
  }

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
  };
}
