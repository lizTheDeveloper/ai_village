/**
 * Game balance constants and configuration values.
 *
 * Centralizes magic numbers to improve maintainability and make tuning easier.
 * All values are documented with their purpose and units.
 */

/**
 * Behavior priority levels for agent decision-making.
 * Higher values override lower priority behaviors.
 */
export const BEHAVIOR_PRIORITIES = {
  /** Critical survival needs (e.g., forced_sleep when exhausted) */
  CRITICAL_SURVIVAL: 100,

  /** Immediate danger responses (e.g., flee from threats) */
  DANGER: 95,

  /** High priority tasks (e.g., find_food when very hungry) */
  HIGH: 80,

  /** Important but not urgent tasks (e.g., deposit_items) */
  IMPORTANT: 60,

  /** Moderate priority activities (e.g., seek_food) */
  MODERATE: 40,

  /** Low priority optional activities (e.g., socialize) */
  LOW: 20,

  /** Default/idle behaviors (e.g., wander) */
  DEFAULT: 10,
} as const;

/**
 * AI system configuration
 *
 * Scale: 1 tile = 1 meter, humans are 2 tiles tall
 */
export const AI_CONFIG = {
  /** Cooldown between LLM requests in ticks (at 20 TPS = 60 seconds) */
  LLM_COOLDOWN_TICKS: 1200,

  /** Base think interval for agents in ticks */
  DEFAULT_THINK_INTERVAL: 20,

  /** Vision range in tiles (clear day, open terrain: ~500m; forest/fog: less) */
  VISION_RANGE_TILES: 500,

  /** Hearing range in tiles (normal sounds: ~50m; loud sounds detected further) */
  HEARING_RANGE_TILES: 50,

  /** Interaction range in tiles (arm's reach: ~2m) */
  INTERACTION_RANGE_TILES: 2.0,

  /** Probability of random gathering behavior */
  RANDOM_GATHER_CHANCE: 0.15,
} as const;

/**
 * Circadian and sleep thresholds
 */
export const SLEEP_THRESHOLDS = {
  /** Sleep drive level that triggers forced sleep */
  FORCED_SLEEP_THRESHOLD: 85,

  /** Sleep drive level that makes agents start considering sleep */
  TIRED_THRESHOLD: 70,

  /** Sleep drive level for well-rested state */
  WELL_RESTED_THRESHOLD: 30,
} as const;

/**
 * Social interaction configuration
 *
 * Scale: 1 tile = 1 meter
 */
export const SOCIAL_CONFIG = {
  /** Distance in tiles for detecting nearby agents for social interactions (~30m) */
  NEARBY_AGENT_RANGE: 30,

  /** Maximum number of agents in a meeting */
  MAX_MEETING_SIZE: 6,

  /** Minimum trust level for sharing information */
  MIN_TRUST_FOR_SHARING: 0.3,

  /** Shouting/calling range (~100m) */
  SHOUT_RANGE: 100,

  /** Conversation range (close enough to talk: ~5m) */
  CONVERSATION_RANGE: 5,
} as const;

/**
 * Farming and resource gathering
 */
export const FARMING_CONFIG = {
  /** Default farming skill for agents without skill system */
  DEFAULT_FARMING_SKILL: 50,

  /** Range in tiles for seed gathering */
  SEED_GATHERING_RANGE: 2.0,

  /** Range in tiles for watering plants */
  WATERING_RANGE: 2.0,

  /** Range in tiles for tilling soil */
  TILLING_RANGE: 2.0,
} as const;

/**
 * Plant growth stages (not magic numbers, but useful constants)
 */
export const PLANT_STAGES = {
  SEED: 'seed',
  SEEDLING: 'seedling',
  GROWING: 'growing',
  MATURE: 'mature',
  SEEDING: 'seeding',
  SENESCENCE: 'senescence',
  DEAD: 'dead',
} as const;

/**
 * Time system constants
 */
export const TIME_CONFIG = {
  /** Default ticks per second */
  DEFAULT_TPS: 20,

  /** Ticks in one in-game hour */
  TICKS_PER_HOUR: 1200,

  /** Ticks in one in-game day (24 hours at 20 TPS = 1200 ticks/hour) */
  TICKS_PER_DAY: 28800,
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
  SLOW_WALK_SPEED: 33,

  /** Default walking speed in tiles per second (~5 km/game-hour) */
  DEFAULT_MOVE_SPEED: 83,

  /** Brisk walk / jog speed in tiles per second (~8 km/game-hour) */
  BRISK_WALK_SPEED: 133,

  /** Running speed in tiles per second (~15 km/game-hour) */
  RUN_SPEED: 250,

  /** Sprint speed in tiles per second (~25 km/game-hour, exhausting) */
  SPRINT_SPEED: 417,

  /** Horse walking speed in tiles per second (~6 km/game-hour) */
  HORSE_WALK_SPEED: 100,

  /** Horse trotting speed in tiles per second (~15 km/game-hour) */
  HORSE_TROT_SPEED: 250,

  /** Horse galloping speed in tiles per second (~40 km/game-hour) */
  HORSE_GALLOP_SPEED: 667,

  /** Minimum distance to consider destination reached (2m) */
  DESTINATION_THRESHOLD: 2.0,

  /** Maximum pathfinding search radius (5km - can path across a city) */
  MAX_PATHFINDING_RADIUS: 5000,

  /** Local pathfinding chunk (for immediate navigation: 500m) */
  LOCAL_PATHFINDING_RADIUS: 500,
} as const;
