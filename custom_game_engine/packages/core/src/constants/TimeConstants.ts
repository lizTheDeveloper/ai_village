// packages/core/src/constants/TimeConstants.ts

import constantsData from '../data/constants.json';

/** Ticks per second (standard game speed) */
export const TICKS_PER_SECOND = constantsData.time.ticksPerSecond;

/** Seconds in one game day at 1x speed */
export const GAME_DAY_SECONDS = constantsData.time.gameDaySeconds;

/** Ticks in one game hour */
export const TICKS_PER_HOUR = constantsData.time.ticksPerHour;

/** Ticks in one game day */
export const TICKS_PER_DAY = constantsData.time.ticksPerDay;

// Time of day phases
export const DAWN_START_HOUR = constantsData.time.dawnStartHour;
export const DAY_START_HOUR = constantsData.time.dayStartHour;
export const DUSK_START_HOUR = constantsData.time.duskStartHour;
export const NIGHT_START_HOUR = constantsData.time.nightStartHour;

// Light levels
export const LIGHT_LEVEL_NIGHT = constantsData.time.lightLevelNight;
export const LIGHT_LEVEL_DAWN_DUSK = constantsData.time.lightLevelDawnDusk;
export const LIGHT_LEVEL_DAY = constantsData.time.lightLevelDay;

// Action durations (in ticks)
export const TILL_DURATION_WITH_HOE = constantsData.actionDurations.tillDurationWithHoe;
export const TILL_DURATION_WITH_SHOVEL = constantsData.actionDurations.tillDurationWithShovel;
export const TILL_DURATION_BY_HAND = constantsData.actionDurations.tillDurationByHand;
export const HARVEST_DURATION_BASE = constantsData.actionDurations.harvestDurationBase;
export const GATHER_SEEDS_DURATION = constantsData.actionDurations.gatherSeedsDuration;
export const TRADE_DURATION = constantsData.actionDurations.tradeDuration;

// Gathering durations (in ticks)
// Base duration is multiplied by resource's gatherDifficulty
// Then divided by agent's gathering speed (skill-based)
export const GATHER_RESOURCE_BASE_TICKS = constantsData.actionDurations.gatherResourceBaseTicks;

// Gathering skill speed bonuses (multiplier on gather speed)
// Higher skill = faster gathering (lower duration)
// Level 0: 1.0x speed, Level 5: 2.0x speed (twice as fast)
export const GATHER_SPEED_PER_SKILL_LEVEL = constantsData.actionDurations.gatherSpeedPerSkillLevel;

// Behavior intervals (in ticks)
export const MONOLOGUE_INTERVAL = constantsData.behaviorIntervals.monologueInterval;
export const OBSERVE_MAX_DURATION = constantsData.behaviorIntervals.observeMaxDuration;
export const PRACTICE_MAX_DURATION = constantsData.behaviorIntervals.practiceMaxDuration;
export const REFLECT_MAX_DURATION = constantsData.behaviorIntervals.reflectMaxDuration;

// Combat durations (in ticks)
// Duration scales based on power difference and lethality
export const COMBAT_DURATION_MIN = constantsData.combatDurations.min;
export const COMBAT_DURATION_BASE = constantsData.combatDurations.base;
export const COMBAT_DURATION_EXTENDED = constantsData.combatDurations.extended;
export const COMBAT_DURATION_LETHAL = constantsData.combatDurations.lethal;

// Sleep durations (in game hours)
export const SLEEP_MIN_HOURS = constantsData.sleep.minHours;
export const SLEEP_MAX_HOURS = constantsData.sleep.maxHours;

// System intervals
export const MARKET_EVENT_CHECK_INTERVAL = constantsData.systemIntervals.marketEventCheckInterval;
export const CLEANLINESS_UPDATE_INTERVAL = constantsData.systemIntervals.cleanlinessUpdateInterval;
