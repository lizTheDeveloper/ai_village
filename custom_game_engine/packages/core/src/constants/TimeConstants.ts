// packages/core/src/constants/TimeConstants.ts

/** Ticks per second (standard game speed) */
export const TICKS_PER_SECOND = 20;

/** Seconds in one game day at 1x speed */
export const GAME_DAY_SECONDS = 48;

/** Ticks in one game hour */
export const TICKS_PER_HOUR = 1200; // 20 TPS * 60 seconds

/** Ticks in one game day */
export const TICKS_PER_DAY = 28800; // TICKS_PER_HOUR * 24

// Time of day phases
export const DAWN_START_HOUR = 5;
export const DAY_START_HOUR = 7;
export const DUSK_START_HOUR = 17;
export const NIGHT_START_HOUR = 19;

// Light levels
export const LIGHT_LEVEL_NIGHT = 0.3;
export const LIGHT_LEVEL_DAWN_DUSK = 0.7;
export const LIGHT_LEVEL_DAY = 0.9;

// Action durations (in ticks)
export const TILL_DURATION_WITH_HOE = 200;      // 10 seconds
export const TILL_DURATION_WITH_SHOVEL = 250;   // 12.5 seconds
export const TILL_DURATION_BY_HAND = 400;       // 20 seconds
export const HARVEST_DURATION_BASE = 160;       // 8 seconds
export const GATHER_SEEDS_DURATION = 100;       // 5 seconds
export const TRADE_DURATION = 40;               // 2 seconds

// Gathering durations (in ticks)
// Base duration is multiplied by resource's gatherDifficulty
// Then divided by agent's gathering speed (skill-based)
export const GATHER_RESOURCE_BASE_TICKS = 20;   // 1 second base (x1.0 difficulty)

// Gathering skill speed bonuses (multiplier on gather speed)
// Higher skill = faster gathering (lower duration)
// Level 0: 1.0x speed, Level 5: 2.0x speed (twice as fast)
export const GATHER_SPEED_PER_SKILL_LEVEL = 0.2;

// Behavior intervals (in ticks)
export const MONOLOGUE_INTERVAL = 300;          // 15 seconds
export const OBSERVE_MAX_DURATION = 400;        // 20 seconds
export const PRACTICE_MAX_DURATION = 500;       // 25 seconds
export const REFLECT_MAX_DURATION = 200;        // 10 seconds

// Combat durations (in ticks)
// Duration scales based on power difference and lethality
export const COMBAT_DURATION_MIN = 300;         // 15 seconds (quick skirmish)
export const COMBAT_DURATION_BASE = 500;        // 25 seconds (normal fight)
export const COMBAT_DURATION_EXTENDED = 700;    // 35 seconds (extended combat)
export const COMBAT_DURATION_LETHAL = 900;      // 45 seconds (lethal/brutal fight)

// Sleep durations (in game hours)
export const SLEEP_MIN_HOURS = 4;
export const SLEEP_MAX_HOURS = 12;

// System intervals
export const MARKET_EVENT_CHECK_INTERVAL = 2400;  // 2 minutes
export const CLEANLINESS_UPDATE_INTERVAL = 86400; // 24 hours in seconds
