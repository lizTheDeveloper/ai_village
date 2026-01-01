/**
 * Core game systems.
 */

// Agent AI - modular system
export * from './AgentBrainSystem.js';
export * from './MovementSystem.js';
export * from './NeedsSystem.js';
export * from './MemorySystem.js';
export * from './CommunicationSystem.js';
export * from './BuildingSystem.js';
export * from './ResourceGatheringSystem.js';
export * from './TemperatureSystem.js';
export * from './WeatherSystem.js';
export * from './SoilSystem.js';
export * from './TimeSystem.js';
export * from './SleepSystem.js';
export * from './PlantSystem.js';
export * from './PlantDiscoverySystem.js';
export * from './WildPlantPopulationSystem.js';
export * from './PlantDiseaseSystem.js';
export * from './AnimalSystem.js';
export * from './AnimalProductionSystem.js';
export * from './TamingSystem.js';
export * from './WildAnimalSpawningSystem.js';
export * from './AnimalHousingSystem.js';
export * from './MemoryFormationSystem.js';
export * from './MemoryConsolidationSystem.js';
export * from './ReflectionSystem.js';
export * from './JournalingSystem.js';
// Navigation & Exploration systems
export * from './SteeringSystem.js';
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
// City Director System (City-level strategic management)
export * from './CityDirectorSystem.js';
export { CityDirectorSystem, DEFAULT_CITY_DIRECTOR_CONFIG } from './CityDirectorSystem.js';
export type { CityDirectorSystemConfig } from './CityDirectorSystem.js';
// Economy & Trading
export * from './TradingSystem.js';
export * from './MarketEventSystem.js';
// Phase 30: Magic System
export * from './MagicSystem.js';
// Phase 13: Research & Discovery
export * from './ResearchSystem.js';
// Mood System
export * from './MoodSystem.js';
// Cooking System
export * from './CookingSystem.js';
// Skills System
export * from './SkillSystem.js';
// Durability System - tool wear and breaking
export * from './DurabilitySystem.js';
// Body Parts System - extensible for multiple species
export * from './BodySystem.js';
// Species and Genetics
export * from './ReproductionSystem.js';
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
// Realm System - Mythological pocket dimensions
export * from './RealmManager.js';
export * from './PortalSystem.js';
export * from './RealmTimeSystem.js';
export * from './DeathTransitionSystem.js';
export * from './ReincarnationSystem.js';
// Auto-save & Time Travel
export * from './AutoSaveSystem.js';
export * from './CheckpointNamingService.js';
export * from './CanonEventDetector.js';
export * from './CheckpointRetentionPolicy.js';
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

// Centralized system registration
export {
  registerAllSystems,
  type SystemRegistrationConfig,
  type SystemRegistrationResult,
} from './registerAllSystems.js';
