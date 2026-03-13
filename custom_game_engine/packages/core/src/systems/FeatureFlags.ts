/**
 * Feature Flag System for System Gating
 *
 * Gates ALL game systems by category. Each flag controls whether systems
 * in that category are registered at all during registerAllSystems().
 *
 * Usage:
 *   registerAllSystems(gameLoop, { featureFlags: SPRINT_1_FLAGS, ... });
 *
 * Runtime query:
 *   const flags = getActiveFeatureFlags();
 *   if (flags.combat) { ... }
 */

/**
 * Feature flags — one boolean per system category.
 * `true` = systems in this category will be registered.
 * `false` = systems skipped entirely (not even registered-disabled).
 */
export interface FeatureFlags {
  // --- Sprint 1: Core playable world ---
  /** TimeSystem, TimeCompressionSystem, TimeThrottleCoordinator, StatisticalModeManager */
  time: boolean;
  /** WeatherSystem, TemperatureSystem, FireSpreadSystem, SoilSystem */
  environment: boolean;
  /** SoASyncSystem, SpatialGridMaintenanceSystem */
  infrastructure: boolean;
  /** ChunkLoadingSystem, BackgroundChunkGeneratorSystem, PredictiveChunkLoadingSystem */
  terrain: boolean;
  /** AnimationSystem, PlantVisualsSystem, AnimalVisualsSystem, AgentVisualsSystem */
  rendering: boolean;
  /** MovementSystem, SteeringSystem, MovementIntentionSystem, StateMutatorSystem */
  movement: boolean;
  /** NeedsSystem, MoodSystem, SleepSystem, AgeTrackingSystem */
  agentNeeds: boolean;
  /** PlayerInputSystem, PossessionSystem, PlayerActionSystem, AvatarManagement, AvatarRespawn */
  playerAvatar: boolean;

  // --- Sprint 2+: Living world ---
  /** PlantSystem, PlantDiscoverySystem, PlantDiseaseSystem, WildPlantPopulationSystem */
  plants: boolean;
  /** AnimalSystem, AnimalBrainSystem, spawning, taming, housing, ecology */
  animals: boolean;
  /** AgentBrainSystem, IdleBehaviorSystem, GoalGenerationSystem */
  agentBrain: boolean;
  /** FluidDynamicsSystem, PlanetaryCurrentsSystem, AgentSwimmingSystem */
  fluidDynamics: boolean;
  /** MemorySystem, MemoryFormationSystem, ReflectionSystem, JournalingSystem, etc. */
  memory: boolean;
  /** CommunicationSystem, SocialFatigueSystem, VerificationSystem, etc. */
  social: boolean;
  /** ExplorationSystem, ExplorationDiscoverySystem, EmotionalNavigationSystem, LandmarkNamingSystem */
  exploration: boolean;
  /** BuildingSystem, BuildingMaintenanceSystem, ResourceGatheringSystem, TreeFellingSystem, etc. */
  building: boolean;
  /** SkillSystem, CookingSystem, DurabilitySystem, ExperimentationSystem */
  skills: boolean;
  /** BodySystem, EquipmentSystem, ReproductionSystem, CourtshipSystem, etc. */
  bodyReproduction: boolean;

  // --- Sprint 3+: Depth systems ---
  /** ResearchSystem, AcademicPaperSystem, UniversitySystem, etc. */
  research: boolean;
  /** MagicSystem, SpellDiscoverySystem */
  magic: boolean;
  /** HuntingSystem, AgentCombatSystem, GuardDutySystem, etc. */
  combat: boolean;
  /** GovernanceDataSystem, CityGovernanceSystem, VillageGovernanceSystem, etc. */
  governance: boolean;
  /** DeityEmergenceSystem, DivinePowerSystem, PrayerSystem, etc. */
  divinity: boolean;
  /** DeathJudgmentSystem, DeathBargainSystem, RealmManager, SoulCreationSystem, etc. */
  deathRealms: boolean;
  /** TradingSystem, MarketEventSystem, TradeAgreementSystem */
  economy: boolean;
  /** TechnologyUnlockSystem, TechnologyEraSystem, CollapseSystem */
  technology: boolean;
  /** PublishingUnlockSystem, LibrarySystem, BookstoreSystem, etc. */
  publishing: boolean;

  // --- Sprint 4+: Advanced systems ---
  /** UpliftCandidateDetectionSystem, ConsciousnessEmergenceSystem, etc. */
  uplift: boolean;
  /** NavySystem, FleetSystem, SquadronSystem, ShipCombatSystem, etc. */
  fleet: boolean;
  /** MegastructureConstructionSystem, MegastructureMaintenanceSystem, ArchaeologySystem */
  megastructures: boolean;
  /** VRSystem, NeuralInterfaceSystem, VRTrainingSystem */
  vr: boolean;
  /** FactoryAISystem, PowerGridSystem, BeltSystem, AssemblyMachineSystem, etc. */
  automation: boolean;
  /** GameShowSystem, NewsroomSystem, TVProductionSystem, etc. */
  television: boolean;
  /** PlotAssignmentSystem, PlotProgressionSystem, NarrativePressureSystem, FatesCouncilSystem */
  plot: boolean;
  /** HiveMindSystem, PackMindSystem */
  collectiveConsciousness: boolean;
  /** ClarketechSystem */
  clarketech: boolean;
  /** AppSystem */
  apps: boolean;
  /** VillageSummarySystem, InterVillageCaravanSystem, NewsPropagationSystem */
  multiVillage: boolean;
  /** UniverseForkingSystem, PassageSystem, PortalSystem, InvasionSystem, etc. */
  multiverse: boolean;
  /** CrossRealmPhoneSystem, CellPhoneSystem, WalkieTalkieSystem, RadioBroadcastingSystem */
  advancedComms: boolean;

  // --- Always-on infrastructure (not gatable) ---
  // MetricsCollectionSystem, QueryCacheMonitorSystem, EventCoalescingMonitorSystem,
  // AutoSaveSystem, ChunkSyncSystem — controlled by their own config options, not flags.
}

/** All flags ON — full game, same as current behavior */
export const ALL_SYSTEMS_ON: Readonly<FeatureFlags> = {
  time: true,
  environment: true,
  infrastructure: true,
  terrain: true,
  rendering: true,
  movement: true,
  agentNeeds: true,
  playerAvatar: true,
  plants: true,
  animals: true,
  agentBrain: true,
  fluidDynamics: true,
  memory: true,
  social: true,
  exploration: true,
  building: true,
  skills: true,
  bodyReproduction: true,
  research: true,
  magic: true,
  combat: true,
  governance: true,
  divinity: true,
  deathRealms: true,
  economy: true,
  technology: true,
  publishing: true,
  uplift: true,
  fleet: true,
  megastructures: true,
  vr: true,
  automation: true,
  television: true,
  plot: true,
  collectiveConsciousness: true,
  clarketech: true,
  apps: true,
  multiVillage: true,
  multiverse: true,
  advancedComms: true,
};

/**
 * Sprint 1: Minimal Playable World
 *
 * Player walks around, sees terrain, 60fps with empty world.
 * Core ECS, world/terrain, renderer, navigation only.
 */
export const SPRINT_1_FLAGS: Readonly<FeatureFlags> = {
  // ON: Core playable world
  time: true,
  environment: true,
  infrastructure: true,
  terrain: true,
  rendering: true,
  movement: true,
  agentNeeds: true,
  playerAvatar: true,

  // OFF: Everything else
  plants: false,
  animals: false,
  agentBrain: false,
  fluidDynamics: false,
  memory: false,
  social: false,
  exploration: false,
  building: false,
  skills: false,
  bodyReproduction: false,
  research: false,
  magic: false,
  combat: false,
  governance: false,
  divinity: false,
  deathRealms: false,
  economy: false,
  technology: false,
  publishing: false,
  uplift: false,
  fleet: false,
  megastructures: false,
  vr: false,
  automation: false,
  television: false,
  plot: false,
  collectiveConsciousness: false,
  clarketech: false,
  apps: false,
  multiVillage: false,
  multiverse: false,
  advancedComms: false,
};

// --- Runtime query ---

let _activeFlags: FeatureFlags = { ...ALL_SYSTEMS_ON };

/** Set the active feature flags (called by registerAllSystems). */
export function setActiveFeatureFlags(flags: FeatureFlags): void {
  _activeFlags = { ...flags };
}

/** Get the current active feature flags. Queryable at runtime for telemetry/dashboard. */
export function getActiveFeatureFlags(): Readonly<FeatureFlags> {
  return _activeFlags;
}

/** Get a summary of enabled/disabled flag counts. */
export function getFeatureFlagSummary(): { enabled: string[]; disabled: string[] } {
  const enabled: string[] = [];
  const disabled: string[] = [];
  for (const [key, value] of Object.entries(_activeFlags)) {
    (value ? enabled : disabled).push(key);
  }
  return { enabled, disabled };
}
