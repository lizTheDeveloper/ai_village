/**
 * Centralized System Registration
 *
 * This module provides a single function to register all game systems.
 * Use this in both main.ts and headless.ts to ensure they stay in sync.
 *
 * When adding a new system, add it here ONCE and both entry points get it.
 */

import type { GameLoop } from '../loop/GameLoop.js';

// Time & Environment
import { TimeSystem } from './TimeSystem.js';
import { WeatherSystem } from './WeatherSystem.js';
import { TemperatureSystem } from './TemperatureSystem.js';
import { SoilSystem } from './SoilSystem.js';

// Plants
import { PlantSystem } from './PlantSystem.js';
import { PlantDiscoverySystem } from './PlantDiscoverySystem.js';
import { PlantDiseaseSystem } from './PlantDiseaseSystem.js';
import { WildPlantPopulationSystem } from './WildPlantPopulationSystem.js';

// Animals
import { AnimalSystem } from './AnimalSystem.js';
import { AnimalProductionSystem } from './AnimalProductionSystem.js';
import { AnimalHousingSystem } from './AnimalHousingSystem.js';
import { WildAnimalSpawningSystem } from './WildAnimalSpawningSystem.js';
import { TamingSystem } from './TamingSystem.js';

// Uplift (Animal Consciousness)
import { UpliftCandidateDetectionSystem } from '../uplift/UpliftCandidateDetectionSystem.js';
import { ProtoSapienceObservationSystem } from '../uplift/ProtoSapienceObservationSystem.js';
import { ConsciousnessEmergenceSystem } from '../uplift/ConsciousnessEmergenceSystem.js';
import { UpliftBreedingProgramSystem } from '../uplift/UpliftBreedingProgramSystem.js';

// Agent Core
import { AgentBrainSystem } from './AgentBrainSystem.js';
import { MovementSystem } from './MovementSystem.js';
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
import { SocialGradientSystem } from './SocialGradientSystem.js';
import { VerificationSystem } from './VerificationSystem.js';
import { InterestsSystem } from './InterestsSystem.js';
// Phase 6: Emergent Social Dynamics - RE-ENABLED
import { RelationshipConversationSystem } from './RelationshipConversationSystem.js';
// import { FriendshipSystem } from './FriendshipSystem.js'; // TODO: Enable after RelationshipConversationSystem tested
// import { InterestEvolutionSystem } from './InterestEvolutionSystem.js';
import { CrossRealmPhoneSystem } from './CrossRealmPhoneSystem.js';

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
import { SoapOperaSystem } from '../television/formats/SoapOperaSystem.js';
import { TVDevelopmentSystem } from '../television/systems/TVDevelopmentSystem.js';
import { TVPostProductionSystem } from '../television/systems/TVPostProductionSystem.js';

// Magic
import { MagicSystem } from './MagicSystem.js';

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
import { ChatRoomSystem } from '../communication/ChatRoomSystem.js';
import { CompanionSystem } from './CompanionSystem.js';

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
// TODO: Fix incomplete implementation before enabling
// import { JealousySystem } from './JealousySystem.js';

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
// SoulRepositorySystem uses Node.js APIs (fs, path) - imported dynamically below

// Governance & Metrics
import { GovernanceDataSystem } from './GovernanceDataSystem.js';
import { MetricsCollectionSystem } from './MetricsCollectionSystem.js';
import { CityDirectorSystem } from './CityDirectorSystem.js';

// Auto-save
import { AutoSaveSystem } from './AutoSaveSystem.js';

// Animal Brain (from behavior module)
import { AnimalBrainSystem } from '../behavior/animal-behaviors/AnimalBrainSystem.js';

/**
 * LLM-related types (passed from caller to avoid circular dependency)
 */
export interface LLMDependencies {
  /** LLM queue for AI-powered systems (from @ai-village/llm) */
  llmQueue?: unknown;
  /** Prompt builder for agent brain (from @ai-village/llm) */
  promptBuilder?: unknown;
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
}

/**
 * Result of system registration
 */
export interface SystemRegistrationResult {
  soilSystem: SoilSystem;
  plantSystem: PlantSystem;
  wildAnimalSpawning: WildAnimalSpawningSystem;
  governanceDataSystem: GovernanceDataSystem;
  metricsSystem?: MetricsCollectionSystem;
  magicSystem: MagicSystem;
  researchSystem: ResearchSystem;
  divinePowerSystem: DivinePowerSystem;
  marketEventSystem: MarketEventSystem;
  realmManager: RealmManager;
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
  const { llmQueue, promptBuilder, gameSessionId, metricsServerUrl, enableMetrics = true, enableAutoSave = true } = config;
  const eventBus = gameLoop.world.eventBus;

  // ============================================================================
  // TIME & ENVIRONMENT
  // ============================================================================
  gameLoop.systemRegistry.register(new TimeSystem());
  gameLoop.systemRegistry.register(new WeatherSystem());
  gameLoop.systemRegistry.register(new TemperatureSystem());

  const soilSystem = new SoilSystem();
  gameLoop.systemRegistry.register(soilSystem);

  // ============================================================================
  // PLANTS
  // ============================================================================
  const plantSystem = new PlantSystem(eventBus);
  gameLoop.systemRegistry.register(plantSystem);
  gameLoop.systemRegistry.register(new PlantDiscoverySystem());
  gameLoop.systemRegistry.register(new PlantDiseaseSystem(eventBus));
  gameLoop.systemRegistry.register(new WildPlantPopulationSystem(eventBus));

  // ============================================================================
  // ANIMALS
  // ============================================================================
  gameLoop.systemRegistry.register(new AnimalBrainSystem());
  gameLoop.systemRegistry.register(new AnimalSystem(eventBus));
  gameLoop.systemRegistry.register(new AnimalProductionSystem(eventBus));
  gameLoop.systemRegistry.register(new AnimalHousingSystem());
  const wildAnimalSpawning = new WildAnimalSpawningSystem();
  gameLoop.systemRegistry.register(wildAnimalSpawning);
  gameLoop.systemRegistry.register(new TamingSystem());

  // ============================================================================
  // UPLIFT (Animal Consciousness Emergence)
  // ============================================================================
  gameLoop.systemRegistry.register(new UpliftCandidateDetectionSystem());
  gameLoop.systemRegistry.register(new ProtoSapienceObservationSystem());
  gameLoop.systemRegistry.register(new ConsciousnessEmergenceSystem());
  gameLoop.systemRegistry.register(new UpliftBreedingProgramSystem());

  // ============================================================================
  // AGENT CORE
  // ============================================================================
  gameLoop.systemRegistry.register(new IdleBehaviorSystem());
  gameLoop.systemRegistry.register(new GoalGenerationSystem(eventBus));

  if (llmQueue && promptBuilder) {
    // Cast to expected types (caller is responsible for correct types)
    gameLoop.systemRegistry.register(new AgentBrainSystem(llmQueue as any, promptBuilder as any));
  }

  gameLoop.systemRegistry.register(new MovementSystem());
  gameLoop.systemRegistry.register(new NeedsSystem());
  gameLoop.systemRegistry.register(new MoodSystem());
  gameLoop.systemRegistry.register(new SleepSystem());
  gameLoop.systemRegistry.register(new SteeringSystem());

  // ============================================================================
  // MEMORY & COGNITION
  // ============================================================================
  gameLoop.systemRegistry.register(new MemorySystem());
  gameLoop.systemRegistry.register(new MemoryFormationSystem(eventBus));
  gameLoop.systemRegistry.register(new MemoryConsolidationSystem(eventBus));
  gameLoop.systemRegistry.register(new SpatialMemoryQuerySystem());
  gameLoop.systemRegistry.register(new ReflectionSystem(eventBus));
  gameLoop.systemRegistry.register(new JournalingSystem(eventBus));
  gameLoop.systemRegistry.register(new BeliefFormationSystem());
  gameLoop.systemRegistry.register(new BeliefGenerationSystem());

  // ============================================================================
  // SOCIAL & COMMUNICATION
  // ============================================================================
  gameLoop.systemRegistry.register(new CommunicationSystem());
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

  // ============================================================================
  // EXPLORATION & NAVIGATION
  // ============================================================================
  gameLoop.systemRegistry.register(new ExplorationSystem());
  if (llmQueue) {
    gameLoop.systemRegistry.register(new LandmarkNamingSystem(llmQueue as any));
  }
  gameLoop.systemRegistry.register(new EmotionalNavigationSystem());

  // ============================================================================
  // VIRTUAL REALITY
  // ============================================================================
  gameLoop.systemRegistry.register(new VRSystem());

  // ============================================================================
  // BUILDING & CONSTRUCTION
  // ============================================================================
  gameLoop.systemRegistry.register(new BuildingSystem());
  gameLoop.systemRegistry.register(new BuildingMaintenanceSystem());
  gameLoop.systemRegistry.register(new BuildingSpatialAnalysisSystem());
  gameLoop.systemRegistry.register(new ResourceGatheringSystem());

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
  gameLoop.systemRegistry.register(new AssemblyMachineSystem());

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

  // ============================================================================
  // PUBLISHING & KNOWLEDGE INFRASTRUCTURE
  // ============================================================================
  const publishingUnlockSystem = new PublishingUnlockSystem(eventBus);
  gameLoop.systemRegistry.register(publishingUnlockSystem);

  const technologyUnlockSystem = new TechnologyUnlockSystem(eventBus);
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

  // ============================================================================
  // BODY & REPRODUCTION
  // ============================================================================
  gameLoop.systemRegistry.register(new BodySystem());
  gameLoop.systemRegistry.register(new EquipmentSystem());
  gameLoop.systemRegistry.register(new ReproductionSystem());
  gameLoop.systemRegistry.register(new CourtshipSystem());
  gameLoop.systemRegistry.register(new MidwiferySystem());
  gameLoop.systemRegistry.register(new ParentingSystem());
  // TODO: Fix incomplete implementation before enabling
  // gameLoop.systemRegistry.register(new JealousySystem());

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
    gameLoop.systemRegistry.register(new MythGenerationSystem(llmQueue as any));
  }
  // MythGenerationSystem requires llmQueue, so skip if not provided

  // Chat Rooms - General chat system (DMs, group chats, divine chat, etc.)
  const chatRoomSystem = new ChatRoomSystem();
  gameLoop.systemRegistry.register(chatRoomSystem);

  // Companion System - Ophanim tutorial/emotional companion
  gameLoop.systemRegistry.register(new CompanionSystem());

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
  // Cast eventBus to any since combat systems define their own simpler EventBus interface
  gameLoop.systemRegistry.register(new HuntingSystem(eventBus as any));
  gameLoop.systemRegistry.register(new PredatorAttackSystem(eventBus as any));
  gameLoop.systemRegistry.register(new AgentCombatSystem(undefined, eventBus as any));
  gameLoop.systemRegistry.register(new DominanceChallengeSystem(eventBus as any));
  gameLoop.systemRegistry.register(new InjurySystem());
  gameLoop.systemRegistry.register(new GuardDutySystem(eventBus as any));
  gameLoop.systemRegistry.register(new VillageDefenseSystem());
  gameLoop.systemRegistry.register(new ThreatResponseSystem());

  // ============================================================================
  // REALMS & PORTALS
  // ============================================================================
  gameLoop.systemRegistry.register(new PassageSystem());
  gameLoop.systemRegistry.register(new PortalSystem());
  gameLoop.systemRegistry.register(new RealmTimeSystem());
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
  gameLoop.systemRegistry.register(new AfterlifeNeedsSystem());
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
  gameLoop.systemRegistry.register(new GameShowSystem());
  gameLoop.systemRegistry.register(new SoapOperaSystem());
  gameLoop.systemRegistry.register(new TVDevelopmentSystem());
  gameLoop.systemRegistry.register(new TVPostProductionSystem());

  // ============================================================================
  // AUTOMATION & FACTORIES (Phase 38)
  // ============================================================================
  // Factory automation systems already registered above (lines 342-349)
  // Systems: PowerGrid, Belt, DirectConnection, Assembly, FactoryAI, OffScreen

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


  return {
    soilSystem,
    plantSystem,
    wildAnimalSpawning,
    governanceDataSystem,
    metricsSystem,
    magicSystem,
    researchSystem,
    divinePowerSystem,
    marketEventSystem,
    realmManager,
  };
}
