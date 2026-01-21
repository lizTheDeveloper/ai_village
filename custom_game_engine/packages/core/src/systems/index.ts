/**
 * Core game systems.
 */

// Agent AI - modular system
export * from './AgentBrainSystem.js';
export * from './MovementSystem.js';
export * from './AnimationSystem.js';
export * from './NeedsSystem.js';
export * from './MemorySystem.js';
export * from './CommunicationSystem.js';
export * from './SocialFatigueSystem.js';
export * from './BuildingSystem.js';
export * from './RoofRepairSystem.js';
export * from './ResourceGatheringSystem.js';
export * from './TemperatureSystem.js';
export * from './WeatherSystem.js';
export * from './FireSpreadSystem.js';
export * from './SoilSystem.js';
export * from './TimeSystem.js';
export * from './TimeCompressionSystem.js';
export * from './TimeThrottleCoordinator.js';
export * from './StatisticalModeManager.js';
export * from './StateMutatorSystem.js'; // Batched vector updates for performance
export * from './SleepSystem.js';
// Plant systems have been moved to @ai-village/botany package
// Import from '@ai-village/botany' instead:
// - PlantSystem
// - PlantDiscoverySystem
// - WildPlantPopulationSystem
// - PlantDiseaseSystem
export * from './AnimalSystem.js';
export * from './AnimalProductionSystem.js';
export * from './TamingSystem.js';
export * from './WildAnimalSpawningSystem.js';
export * from './AnimalHousingSystem.js';
// Visual Metadata Systems (compute sizeMultiplier/alpha from game state)
export * from './PlantVisualsSystem.js';
export * from './AnimalVisualsSystem.js';
export * from './MemoryFormationSystem.js';
export * from './MemoryConsolidationSystem.js';
export * from './ReflectionSystem.js';
export * from './JournalingSystem.js';
// Navigation & Exploration systems
export * from './SteeringSystem.js';
export * from './AgeTrackingSystem.js';
export * from './ExplorationSystem.js';
export * from './LandmarkNamingSystem.js';
export * from './VerificationSystem.js';
export * from './SocialGradientSystem.js';
export * from './BeliefFormationSystem.js';
export * from './BeliefGenerationSystem.js';
export * from './PrayerSystem.js';
export * from './PrayerAnsweringSystem.js';
export * from './MythGenerationSystem.js';
export * from './SpatialMemoryQuerySystem.js';
// Metrics & Analytics
export * from './MetricsCollectionSystem.js';
// Governance & Information Infrastructure
export * from './GovernanceDataSystem.js';
// Political Hierarchy Systems
export * from './NationSystem.js';  // Nation-level governance
export * from './EmpireSystem.js';  // Empire-level governance (multi-planet)
export * from './EmpireDiplomacySystem.js';  // Inter-empire diplomatic AI
export * from './EmpireWarSystem.js';  // Imperial war resolution and peace treaties
export * from './FederationGovernanceSystem.js';  // Federation governance (multi-empire)
export * from './GalacticCouncilSystem.js';  // Galactic Council governance (multi-species)
// Civilization Collapse System
export * from './CollapseSystem.js';  // Civilization collapse and dark ages
// City Director System (City-level strategic management)
export * from './CityDirectorSystem.js';
export { CityDirectorSystem, DEFAULT_CITY_DIRECTOR_CONFIG } from './CityDirectorSystem.js';
export type { CityDirectorSystemConfig } from './CityDirectorSystem.js';
// Profession Work Simulation (Background profession simulation for NPC cities)
export * from './ProfessionWorkSimulationSystem.js';
export { ProfessionWorkSimulationSystem, DEFAULT_PROFESSION_WORK_CONFIG } from './ProfessionWorkSimulationSystem.js';
export type { ProfessionWorkConfig } from './ProfessionWorkSimulationSystem.js';
// Event Reporting (Converts world events to news stories, dispatches reporters)
export { EventReportingSystem } from './EventReportingSystem.js';
// Economy & Trading
export * from './TradingSystem.js';
export * from './MarketEventSystem.js';
// Trade Agreements - Cross-universe/multiverse formal trade agreements
export * from './TradeAgreementSystem.js';
export { TradeAgreementSystem } from './TradeAgreementSystem.js';
// Trade Escort - Links squadrons to trade agreements for escort missions
export * from './TradeEscortSystem.js';
export { TradeEscortSystem } from './TradeEscortSystem.js';
// Phase 30: Magic System
export * from './MagicSystem.js';
// Phase 13: Research & Discovery
export * from './ResearchSystem.js';
// University Research System
export * from './UniversitySystem.js';
export * from './UniversityResearchManagementSystem.js';
// Mood System
export * from './MoodSystem.js';
// Deep Conversation System - Phase 1-6
export * from './InterestsSystem.js';
// Phase 6: Emergent Social Dynamics - RE-ENABLED
export * from './RelationshipConversationSystem.js';
// export * from './FriendshipSystem.js'; // TODO: Enable after testing
// Deep Conversation System - Phase 7.1
// TODO: Fix incomplete implementations before enabling
// export * from './InterestEvolutionSystem.js';
// Cooking System
export * from './CookingSystem.js';
// Skills System
export * from './SkillSystem.js';
// Experimentation System - recipe discovery
export * from './ExperimentationSystem.js';
// Durability System - tool wear and breaking
export * from './DurabilitySystem.js';
// Body Parts System - extensible for multiple species
export * from './BodySystem.js';
// Phase 36: Equipment System - body-based equipment for all species
// TODO: Fix EquipmentSystem errors before re-enabling
// export * from './EquipmentSystem.js';
// Species and Genetics
export * from './ReproductionSystem.js';
// Courtship System - agent courtship and mating
export * from './CourtshipSystem.js';
// Idle Behaviors & Personal Goals
export * from './IdleBehaviorSystem.js';
export * from './GoalGenerationSystem.js';
// Phase 4: Emergent Gods
export * from './DeityEmergenceSystem.js';
export * from './AIGodBehaviorSystem.js';
export * from './DivinePowerSystem.js';
export * from './FaithMechanicsSystem.js';
export * from './CreatorSurveillanceSystem.js';
export * from './CreatorInterventionSystem.js';
export * from './LoreSpawnSystem.js';
export * from './RealityAnchorSystem.js';
export * from './RebellionEventSystem.js';
// Phase 5: Religious Institutions
export * from './TempleSystem.js';
export * from './PriesthoodSystem.js';
export * from './RitualSystem.js';
export * from './HolyTextSystem.js';
// Phase 6: Avatar System
export * from './AvatarSystem.js';
// Phase 16: Player Avatar System (Player Control)
export * from './PossessionSystem.js';
export * from './PlayerInputSystem.js';
// Phase 7: Angels
export * from './AngelSystem.js';
// Phase 28.6: Angel Phone System (God's Phone)
export * from './AngelPhoneSystem.js';
// Phase 8: Advanced Theology
export * from './SchismSystem.js';
export * from './SyncretismSystem.js';
export * from './ReligiousCompetitionSystem.js';
export * from './ConversionWarfareSystem.js';
// Phase 9: World Impact
export * from './TerrainModificationSystem.js';
export * from './SpeciesCreationSystem.js';
export * from './DivineWeatherControl.js';
export * from './DivineBodyModification.js';
export * from './MassEventSystem.js';
// Multiverse & Passages
export * from './PassageSystem.js';
export * from './PassageTraversalSystem.js';
export * from './UniverseForkingSystem.js';
export * from './ParadoxDetectionSystem.js';
export * from './TimelineMergerSystem.js';
// Realm System - Mythological pocket dimensions
export * from './RealmManager.js';
export * from './PortalSystem.js';
export * from './RealmTimeSystem.js';
export * from './DeathJudgmentSystem.js';
// export * from './DeathBargainSystem.js'; // Temporarily disabled - incomplete implementation
// export * from './DeathTransitionSystem.js'; // Temporarily disabled - incomplete implementation
export * from './AfterlifeMemoryFadingSystem.js';
export * from './WisdomGoddessSystem.js';
export * from './ReincarnationSystem.js';
export * from './SoulCreationSystem.js';
// export * from './VeilOfForgettingSystem.js'; // Disabled - needs fixing
export * from './PixelLabSpriteGenerationSystem.js';
export * from './SoulRepositorySystem.js';
// Auto-save & Time Travel
export * from './AutoSaveSystem.js';
export * from './ChunkSyncSystem.js';
export * from './CheckpointNamingService.js';
export * from './CanonEventDetector.js';
export * from './CheckpointRetentionPolicy.js';
export * from './SnapshotDecayPolicy.js';
export * from './CanonEventDescriptions.js';
// Combat & Security Systems
export * from './AgentCombatSystem.js';
export * from './DominanceChallengeSystem.js';
export * from './GuardDutySystem.js';
export * from './HuntingSystem.js';
export * from './InjurySystem.js';
export * from './PredatorAttackSystem.js';
export * from './VillageDefenseSystem.js';
// Building Maintenance
export * from './BuildingMaintenanceSystem.js';
// Building Spatial Analysis (Feng Shui)
export * from './BuildingSpatialAnalysisSystem.js';
// Sacred Sites
export * from './SacredSiteSystem.js';
// Angel AI
export * from './AngelAIDecisionProcessor.js';
// Goal Descriptions
export * from './GoalDescriptionLibrary.js';

// Voxel Building System - Tree Felling Physics
export * from './TreeFellingSystem.js';
export { TreeFellingSystem, reduceStabilityFromHarvest, wouldCauseFall, getMaterialHardness } from './TreeFellingSystem.js';

// Voxel Building System - Tile Construction (Phase 4)
export * from './TileConstructionSystem.js';
export {
  TileConstructionSystem,
  getTileConstructionSystem,
} from './TileConstructionSystem.js';
export type {
  TileConstructionStatus,
  ConstructionTile,
  ConstructionTaskState,
  ConstructionTask,
} from './TileConstructionSystem.js';

// Tile-Based Building - Door System
export * from './DoorSystem.js';

// Automation & Production Systems (Phase 38)
export * from './PowerGridSystem.js';
export { PowerGridSystem } from './PowerGridSystem.js';
export type { PowerNetwork } from './PowerGridSystem.js';
export * from './BeltSystem.js';
export { BeltSystem } from './BeltSystem.js';
export * from './DirectConnectionSystem.js';
export { DirectConnectionSystem } from './DirectConnectionSystem.js';
export * from './AssemblyMachineSystem.js';
export { AssemblyMachineSystem } from './AssemblyMachineSystem.js';
export * from './FactoryAISystem.js';
export { FactoryAISystem } from './FactoryAISystem.js';
export * from './OffScreenProductionSystem.js';
export { OffScreenProductionSystem } from './OffScreenProductionSystem.js';

// Chat & Communication
export * from './CrossRealmPhoneSystem.js';
export { CrossRealmPhoneSystem, createCrossRealmPhoneSystem } from './CrossRealmPhoneSystem.js';
export type { CrossRealmPhoneSystemConfig } from './CrossRealmPhoneSystem.js';

// Chunk Loading System - Terrain generation as ECS system
export * from './ChunkLoadingSystem.js';

// Spaceship Systems (β-space navigation)
export * from './SpaceshipManagementSystem.js';
export { SpaceshipManagementSystem } from './SpaceshipManagementSystem.js';
export * from './SpaceshipConstructionSystem.js';
export {
  SpaceshipConstructionSystem,
  getSpaceshipConstructionSystem,
  resetSpaceshipConstructionSystem,
} from './SpaceshipConstructionSystem.js';
export type { SpaceshipConstructionProject } from './SpaceshipConstructionSystem.js';

// Megastructure Systems (Phase 5: Grand Strategy)
export * from './MegastructureConstructionSystem.js';
export { MegastructureConstructionSystem, startMegastructureProject } from './MegastructureConstructionSystem.js';
export * from './MegastructureMaintenanceSystem.js';
export { MegastructureMaintenanceSystem } from './MegastructureMaintenanceSystem.js';

// Planet Travel System
export * from './PlanetTravelSystem.js';
export { PlanetTravelSystem } from './PlanetTravelSystem.js';

// Fleet Hierarchy Systems (Phase 5: Grand Strategy)
export * from './SquadronSystem.js';
export { SquadronSystem, getSquadronSystem } from './SquadronSystem.js';
export * from './SquadronCombatSystem.js';
export { SquadronCombatSystem, getSquadronCombatSystem } from './SquadronCombatSystem.js';
export * from './FleetCombatSystem.js';
export { FleetCombatSystem, getFleetCombatSystem } from './FleetCombatSystem.js';
export * from './StragglerRecoverySystem.js';
export { StragglerRecoverySystem, getStragglerRecoverySystem } from './StragglerRecoverySystem.js';

// Resource Discovery System (Phase 3: Economic Depth)
export * from './ExplorationDiscoverySystem.js';
export { ExplorationDiscoverySystem } from './ExplorationDiscoverySystem.js';

// Stellar Mining System (Phase 3: Economic Depth)
export * from './StellarMiningSystem.js';
export { StellarMiningSystem } from './StellarMiningSystem.js';

// Building Summoning System (Magic)
export * from './BuildingSummoningSystem.js';
export { BuildingSummoningSystem } from './BuildingSummoningSystem.js';

// Invasion Plot Handler (Phase 4: Multiverse)
export * from './InvasionPlotHandler.js';
export { InvasionPlotHandler } from './InvasionPlotHandler.js';

// Centralized system registration
export {
  registerAllSystems,
  type SystemRegistrationConfig,
  type SystemRegistrationResult,
  type PlantSystemsConfig,
} from './registerAllSystems.js';
