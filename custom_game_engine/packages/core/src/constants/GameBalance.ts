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
 */
export const AI_CONFIG = {
  /** Cooldown between LLM requests in ticks (at 20 TPS = 60 seconds) */
  LLM_COOLDOWN_TICKS: 1200,

  /** Base think interval for agents in ticks */
  DEFAULT_THINK_INTERVAL: 20,

  /** Vision range in tiles */
  VISION_RANGE_TILES: 15,

  /** Hearing range in tiles */
  HEARING_RANGE_TILES: 10,

  /** Interaction range in tiles (for actions requiring proximity) */
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
 */
export const SOCIAL_CONFIG = {
  /** Distance in tiles for detecting nearby agents for social interactions */
  NEARBY_AGENT_RANGE: 15,

  /** Maximum number of agents in a meeting */
  MAX_MEETING_SIZE: 6,

  /** Minimum trust level for sharing information */
  MIN_TRUST_FOR_SHARING: 0.3,
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
 */
export const MOVEMENT_CONFIG = {
  /** Default agent movement speed in tiles per second */
  DEFAULT_MOVE_SPEED: 2.0,

  /** Minimum distance to consider destination reached */
  DESTINATION_THRESHOLD: 0.5,

  /** Maximum pathfinding search radius */
  MAX_PATHFINDING_RADIUS: 50,
} as const;
