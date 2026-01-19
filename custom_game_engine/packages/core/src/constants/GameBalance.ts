/**
 * Game balance constants and configuration values.
 *
 * Centralizes magic numbers to improve maintainability and make tuning easier.
 * All values are documented with their purpose and units.
 */

import constantsData from '../data/constants.json';

/**
 * Behavior priority levels for agent decision-making.
 * Higher values override lower priority behaviors.
 */
export const BEHAVIOR_PRIORITIES = {
  /** Critical survival needs (e.g., forced_sleep when exhausted) */
  CRITICAL_SURVIVAL: constantsData.behaviorPriorities.criticalSurvival,

  /** Immediate danger responses (e.g., flee from threats) */
  DANGER: constantsData.behaviorPriorities.danger,

  /** High priority tasks (e.g., find_food when very hungry) */
  HIGH: constantsData.behaviorPriorities.high,

  /** Important but not urgent tasks (e.g., deposit_items) */
  IMPORTANT: constantsData.behaviorPriorities.important,

  /** Moderate priority activities (e.g., seek_food) */
  MODERATE: constantsData.behaviorPriorities.moderate,

  /** Low priority optional activities (e.g., socialize) */
  LOW: constantsData.behaviorPriorities.low,

  /** Default/idle behaviors (e.g., wander) */
  DEFAULT: constantsData.behaviorPriorities.default,
} as const;

/**
 * AI system configuration
 *
 * Scale: 1 tile = 1 meter, humans are 2 tiles tall
 */
export const AI_CONFIG = {
  /** Cooldown between LLM requests in ticks (at 20 TPS = 60 seconds) */
  LLM_COOLDOWN_TICKS: constantsData.ai.llmCooldownTicks,

  /** Base think interval for agents in ticks */
  DEFAULT_THINK_INTERVAL: constantsData.ai.defaultThinkInterval,

  /** Vision range in tiles (clear day, open terrain: ~500m; forest/fog: less) */
  VISION_RANGE_TILES: constantsData.ai.visionRangeTiles,

  /** Hearing range in tiles (normal sounds: ~50m; loud sounds detected further) */
  HEARING_RANGE_TILES: constantsData.ai.hearingRangeTiles,

  /** Interaction range in tiles (arm's reach: ~2m) */
  INTERACTION_RANGE_TILES: constantsData.ai.interactionRangeTiles,

  /** Probability of random gathering behavior */
  RANDOM_GATHER_CHANCE: constantsData.ai.randomGatherChance,
} as const;

/**
 * Circadian and sleep thresholds
 */
export const SLEEP_THRESHOLDS = {
  /** Sleep drive level that triggers forced sleep */
  FORCED_SLEEP_THRESHOLD: constantsData.sleep.forcedThreshold,

  /** Sleep drive level that makes agents start considering sleep */
  TIRED_THRESHOLD: constantsData.sleep.tiredThreshold,

  /** Sleep drive level for well-rested state */
  WELL_RESTED_THRESHOLD: constantsData.sleep.wellRestedThreshold,
} as const;

/**
 * Social interaction configuration
 *
 * Scale: 1 tile = 1 meter
 */
export const SOCIAL_CONFIG = {
  /** Distance in tiles for detecting nearby agents for social interactions (~30m) */
  NEARBY_AGENT_RANGE: constantsData.social.nearbyAgentRange,

  /** Maximum number of agents in a meeting */
  MAX_MEETING_SIZE: constantsData.social.maxMeetingSize,

  /** Minimum trust level for sharing information */
  MIN_TRUST_FOR_SHARING: constantsData.social.minTrustForSharing,

  /** Shouting/calling range (~100m) */
  SHOUT_RANGE: constantsData.social.shoutRange,

  /** Conversation range (close enough to talk: ~5m) */
  CONVERSATION_RANGE: constantsData.social.conversationRange,
} as const;

/**
 * Farming and resource gathering
 */
export const FARMING_CONFIG = {
  /** Default farming skill for agents without skill system */
  DEFAULT_FARMING_SKILL: constantsData.farming.defaultFarmingSkill,

  /** Range in tiles for seed gathering */
  SEED_GATHERING_RANGE: constantsData.farming.seedGatheringRange,

  /** Range in tiles for watering plants */
  WATERING_RANGE: constantsData.farming.wateringRange,

  /** Range in tiles for tilling soil */
  TILLING_RANGE: constantsData.farming.tillingRange,
} as const;

/**
 * Plant growth stages (not magic numbers, but useful constants)
 */
export const PLANT_STAGES = {
  SEED: constantsData.plantStages.seed,
  SEEDLING: constantsData.plantStages.seedling,
  GROWING: constantsData.plantStages.growing,
  MATURE: constantsData.plantStages.mature,
  SEEDING: constantsData.plantStages.seeding,
  SENESCENCE: constantsData.plantStages.senescence,
  DEAD: constantsData.plantStages.dead,
} as const;

/**
 * Time system constants
 */
export const TIME_CONFIG = {
  /** Default ticks per second */
  DEFAULT_TPS: constantsData.time.ticksPerSecond,

  /** Ticks in one in-game hour */
  TICKS_PER_HOUR: constantsData.time.ticksPerHour,

  /** Ticks in one in-game day (24 hours at 20 TPS = 1200 ticks/hour) */
  TICKS_PER_DAY: constantsData.time.ticksPerDay,
} as const;

/**
 * Movement and pathfinding
 *
 * Scale: 1 tile = 1 meter, humans are 2 tiles tall
 * Time: 1 game hour = 60 real seconds (1200 ticks)
 *
 * To travel realistic distances in game time:
 * - Walking 5 km/game-hour = 83 tiles/real-second
 * - Running 15 km/game-hour = 250 tiles/real-second
 * - Horse 40 km/game-hour = 667 tiles/real-second
 *
 * These speeds look fast visually but make game time meaningful.
 */
export const MOVEMENT_CONFIG = {
  /** Slow walk speed in tiles per second (strolling, sneaking: ~2 km/game-hour) */
  SLOW_WALK_SPEED: constantsData.movement.slowWalkSpeed,

  /** Default walking speed in tiles per second (~5 km/game-hour) */
  DEFAULT_MOVE_SPEED: constantsData.movement.defaultMoveSpeed,

  /** Brisk walk / jog speed in tiles per second (~8 km/game-hour) */
  BRISK_WALK_SPEED: constantsData.movement.briskWalkSpeed,

  /** Running speed in tiles per second (~15 km/game-hour) */
  RUN_SPEED: constantsData.movement.runSpeed,

  /** Sprint speed in tiles per second (~25 km/game-hour, exhausting) */
  SPRINT_SPEED: constantsData.movement.sprintSpeed,

  /** Horse walking speed in tiles per second (~6 km/game-hour) */
  HORSE_WALK_SPEED: constantsData.movement.horseWalkSpeed,

  /** Horse trotting speed in tiles per second (~15 km/game-hour) */
  HORSE_TROT_SPEED: constantsData.movement.horseTrotSpeed,

  /** Horse galloping speed in tiles per second (~40 km/game-hour) */
  HORSE_GALLOP_SPEED: constantsData.movement.horseGallopSpeed,

  /** Minimum distance to consider destination reached (2m) */
  DESTINATION_THRESHOLD: constantsData.movement.destinationThreshold,

  /** Maximum pathfinding search radius (5km - can path across a city) */
  MAX_PATHFINDING_RADIUS: constantsData.movement.maxPathfindingRadius,

  /** Local pathfinding chunk (for immediate navigation: 500m) */
  LOCAL_PATHFINDING_RADIUS: constantsData.movement.localPathfindingRadius,
} as const;
