/**
 * SystemThrottleConfig - Unified throttling configuration for all systems
 *
 * This file defines standard throttle intervals based on system categories.
 * Use these constants when extending BaseSystem to ensure consistent performance.
 *
 * ## Throttle Intervals (in ticks, assuming 20 TPS):
 * - EVERY_TICK: 0 ticks (critical systems only)
 * - VERY_FAST: 5 ticks (0.25 seconds)
 * - FAST: 10 ticks (0.5 seconds)
 * - NORMAL: 20 ticks (1 second)
 * - MEDIUM: 50 ticks (2.5 seconds)
 * - SLOW: 100 ticks (5 seconds)
 * - VERY_SLOW: 200 ticks (10 seconds)
 * - GLACIAL: 500 ticks (25 seconds)
 *
 * ## Usage:
 * ```typescript
 * import { THROTTLE } from './SystemThrottleConfig.js';
 *
 * export class MySystem extends BaseSystem {
 *   protected readonly throttleInterval = THROTTLE.SLOW; // Every 5 seconds
 * }
 * ```
 */

export const THROTTLE = {
  /** Run every tick - ONLY for critical infrastructure (Time, AgentBrain, Movement) */
  EVERY_TICK: 0,

  /** 5 ticks = 0.25 seconds - High-priority agent interactions */
  VERY_FAST: 5,

  /** 10 ticks = 0.5 seconds - Agent needs, combat */
  FAST: 10,

  /** 20 ticks = 1 second - Standard agent behaviors */
  NORMAL: 20,

  /** 50 ticks = 2.5 seconds - Building, crafting, environmental effects */
  MEDIUM: 50,

  /** 100 ticks = 5 seconds - Analytics, governance, slow environmental changes */
  SLOW: 100,

  /** 200 ticks = 10 seconds - Reflection, journaling, population dynamics */
  VERY_SLOW: 200,

  /** 500 ticks = 25 seconds - Rare events, cleanup, metrics */
  GLACIAL: 500,
} as const;

/**
 * System categories with recommended throttle intervals.
 *
 * When migrating a system to BaseSystem, use this guide to set throttleInterval.
 */
export const SYSTEM_THROTTLE_GUIDE = {
  // ============================================================================
  // EVERY_TICK (0) - Critical Infrastructure
  // ============================================================================
  CRITICAL: {
    throttle: THROTTLE.EVERY_TICK,
    systems: [
      'TimeSystem',
      'AgentBrainSystem',
      'MovementSystem',
      'SteeringSystem',
      'PlayerInputSystem',
    ],
    description: 'Core simulation logic that must run every tick',
  },

  // ============================================================================
  // VERY_FAST (5 ticks = 0.25s) - High-Priority Agent Interactions
  // ============================================================================
  AGENT_INTERACTION: {
    throttle: THROTTLE.VERY_FAST,
    systems: [
      'CombatSystem',
      'PredatorAttackSystem',
      'AgentDecisionSystem',
    ],
    description: 'Time-sensitive agent interactions',
  },

  // ============================================================================
  // FAST (10 ticks = 0.5s) - Agent Needs
  // ============================================================================
  AGENT_NEEDS: {
    throttle: THROTTLE.FAST,
    systems: [
      'HungerSystem',
      'ThirstSystem',
      'EnergySystem',
      'TemperatureSystem',
    ],
    description: 'Agent physiological needs',
  },

  // ============================================================================
  // NORMAL (20 ticks = 1s) - Standard Behaviors
  // ============================================================================
  STANDARD_BEHAVIOR: {
    throttle: THROTTLE.NORMAL,
    systems: [
      'PlantSystem',
      'AnimalSystem',
      'SoilSystem',
      'TradingSystem',
    ],
    description: 'Standard entity updates and behaviors',
  },

  // ============================================================================
  // MEDIUM (50 ticks = 2.5s) - Building & Crafting
  // ============================================================================
  BUILDING_CRAFTING: {
    throttle: THROTTLE.MEDIUM,
    systems: [
      'CraftingSystem',
      'CookingSystem',
      'ConstructionSystem',
      'FluidDynamicsSystem',
      'AngelSystem',
      'AvatarSystem',
      'CellPhoneSystem',
    ],
    description: 'Production, construction, and advanced agent features',
  },

  // ============================================================================
  // SLOW (100 ticks = 5s) - Slow Environmental & Analytics
  // ============================================================================
  ANALYTICS: {
    throttle: THROTTLE.SLOW,
    systems: [
      'WeatherSystem',
      'MetricsCollectionSystem',
      'GovernanceDataSystem',
      'SocialGradientSystem',
      'DurabilitySystem',
      'RoofRepairSystem',
      'MarketEventsSystem',
      'TechnologyUnlockSystem',
      'TempleSystem',
      'DivineWeatherControl',
      'PlantDiseaseSystem',
    ],
    description: 'Analytics, governance, slow environmental changes',
  },

  // ============================================================================
  // VERY_SLOW (200 ticks = 10s) - Population & Reflection
  // ============================================================================
  POPULATION_DYNAMICS: {
    throttle: THROTTLE.VERY_SLOW,
    systems: [
      'WildPlantPopulationSystem',
      'WildAnimalSpawningSystem',
      'AquaticAnimalSpawningSystem',
      'ReflectionSystem',
      'JournalingSystem',
      'ClimateSystem',
      'AcademicPaperSystem',
      'SyncretismSystem',
      'SchismSystem',
    ],
    description: 'Long-term population dynamics, reflection, climate',
  },

  // ============================================================================
  // GLACIAL (500 ticks = 25s) - Rare Events
  // ============================================================================
  RARE_EVENTS: {
    throttle: THROTTLE.GLACIAL,
    systems: [
      'LandmarkNamingSystem',
      'SpeciesCreationSystem',
      'AutoSaveSystem',
    ],
    description: 'Rare events, cleanup tasks, periodic saves',
  },
} as const;

/**
 * Quick lookup table for system → throttle interval.
 * Use this to quickly check what throttle a system should have.
 */
export const SYSTEM_THROTTLE_MAP: Record<string, number> = {
  // Critical (0)
  time: THROTTLE.EVERY_TICK,
  agent_brain: THROTTLE.EVERY_TICK,
  movement: THROTTLE.EVERY_TICK,
  steering: THROTTLE.EVERY_TICK,
  player_input: THROTTLE.EVERY_TICK,

  // Very Fast (5)
  combat: THROTTLE.VERY_FAST,
  predator_attack: THROTTLE.VERY_FAST,

  // Fast (10)
  hunger: THROTTLE.FAST,
  thirst: THROTTLE.FAST,
  energy: THROTTLE.FAST,
  temperature: THROTTLE.FAST,

  // Normal (20)
  plant: THROTTLE.NORMAL,
  animal: THROTTLE.NORMAL,
  soil: THROTTLE.NORMAL,
  trading: THROTTLE.NORMAL,

  // Medium (50)
  crafting: THROTTLE.MEDIUM,
  cooking: THROTTLE.MEDIUM,
  construction: THROTTLE.MEDIUM,
  fluid_dynamics: THROTTLE.MEDIUM,
  angel: THROTTLE.MEDIUM,
  avatar: THROTTLE.MEDIUM,
  CellPhoneSystem: THROTTLE.MEDIUM,

  // Slow (100)
  weather: THROTTLE.SLOW,
  metrics_collection: THROTTLE.SLOW,
  governance_data: THROTTLE.SLOW,
  social_gradient: THROTTLE.SLOW,
  durability: THROTTLE.SLOW,
  roof_repair: THROTTLE.SLOW,
  market_events: THROTTLE.SLOW,
  technology_unlock: THROTTLE.SLOW,
  TempleSystem: THROTTLE.SLOW,
  divine_weather: THROTTLE.SLOW,
  plant_disease: THROTTLE.SLOW,

  // Very Slow (200)
  wild_plant_population: THROTTLE.VERY_SLOW,
  wild_animal_spawning: THROTTLE.VERY_SLOW,
  aquatic_animal_spawning: THROTTLE.VERY_SLOW,
  reflection: THROTTLE.VERY_SLOW,
  journaling: THROTTLE.VERY_SLOW,
  climate: THROTTLE.VERY_SLOW,
  AcademicPaperSystem: THROTTLE.VERY_SLOW,
  SyncretismSystem: THROTTLE.VERY_SLOW,
  SchismSystem: THROTTLE.VERY_SLOW,

  // Glacial (500)
  'landmark-naming': THROTTLE.GLACIAL,
  SpeciesCreationSystem: THROTTLE.GLACIAL,
  auto_save: THROTTLE.GLACIAL,
};

/**
 * Scheduler mode recommendations.
 *
 * Systems that process agents/entities should use PROXIMITY mode to only
 * process visible entities. This is separate from throttling.
 */
export const SCHEDULER_MODE_GUIDE = {
  /**
   * ALWAYS - Entity must be processed every tick (or throttle interval)
   * regardless of visibility. Use for critical infrastructure.
   */
  ALWAYS: [
    'Singletons (Time, Weather)',
    'Player-controlled entities',
    'Critical infrastructure',
  ],

  /**
   * PROXIMITY - Only process entities near camera/player.
   * Use for most agent/entity systems.
   *
   * Enable by setting requiredComponents in BaseSystem:
   * ```typescript
   * public readonly requiredComponents = [CT.Agent, CT.Position] as const;
   * ```
   */
  PROXIMITY: [
    'Plant systems (PlantSystem, PlantDiseaseSystem)',
    'Animal systems (AnimalSystem, AnimalBrainSystem)',
    'Agent behavior systems',
    'Environmental effects on entities (TemperatureSystem)',
    'Social systems (TradingSystem, CommunicationSystem)',
  ],

  /**
   * PASSIVE - Never processed by scheduler, only responds to events.
   * Resources, dropped items, static world objects.
   */
  PASSIVE: [
    'Resource entities',
    'Dropped items',
    'Decorative objects',
  ],
};
