// packages/core/src/constants/NeedsConstants.ts
// All thresholds use 0-1 scale (0 = empty/dead, 1 = full/healthy)

import constantsData from '../data/constants.json';

// Hunger thresholds (0-1 scale) - HYSTERESIS
// HUNGER_THRESHOLD_SEEK_FOOD: Start seeking food when hunger drops below this (50%)
// HUNGER_THRESHOLD_WELL_FED: Only complete seek_food when hunger reaches this (85%)
// Gap of 35% prevents ping-pong behavior switching
export const HUNGER_THRESHOLD_SEEK_FOOD = constantsData.needs.hungerThresholdSeekFood;
export const HUNGER_THRESHOLD_WELL_FED = constantsData.needs.hungerThresholdWellFed;
export const HUNGER_RESTORED_DEFAULT = constantsData.needs.hungerRestoredDefault;

// Energy thresholds (0-1 scale)
export const ENERGY_CRITICAL = constantsData.needs.energyCritical;
export const ENERGY_LOW = constantsData.needs.energyLow;
export const ENERGY_MODERATE = constantsData.needs.energyModerate;
export const ENERGY_HIGH = constantsData.needs.energyHigh;
export const ENERGY_FULL = constantsData.needs.energyFull;

// Energy thresholds (0-1 scale) - HYSTERESIS
// ENERGY_THRESHOLD_SEEK_SLEEP: Start seeking sleep when energy drops below this (25%)
// ENERGY_THRESHOLD_WELL_RESTED: Only complete sleep when energy reaches this (90%)
// Gap of 65% prevents agents from waking up and immediately going back to sleep
export const ENERGY_THRESHOLD_SEEK_SLEEP = constantsData.needs.energyThresholdSeekSleep;
export const ENERGY_THRESHOLD_WELL_RESTED = constantsData.needs.energyThresholdWellRested;

// Energy work multipliers
export const WORK_SPEED_CRITICAL = constantsData.needs.workSpeedCritical;
export const WORK_SPEED_LOW = constantsData.needs.workSpeedLow;
export const WORK_SPEED_MODERATE = constantsData.needs.workSpeedModerate;
export const WORK_SPEED_NORMAL = constantsData.needs.workSpeedNormal;

// Sleep completion thresholds (0-1 scale)
export const SLEEP_COMPLETE_ENERGY = constantsData.sleep.completeEnergy;
export const SLEEP_INTERRUPT_HUNGER = constantsData.sleep.interruptHunger;
export const SLEEP_INTERRUPT_ENERGY = constantsData.sleep.interruptEnergy;

// Sleep quality modifiers
export const SLEEP_QUALITY_SHELTER = constantsData.sleep.qualityShelter;
export const SLEEP_QUALITY_HOUSE = constantsData.sleep.qualityHouse;
export const SLEEP_QUALITY_BED = constantsData.sleep.qualityBed;
export const SLEEP_QUALITY_LUXURY = constantsData.sleep.qualityLuxury;
export const SLEEP_QUALITY_MIN = constantsData.sleep.qualityMin;
export const SLEEP_QUALITY_MAX = constantsData.sleep.qualityMax;

// Health thresholds (0-1 scale)
export const HEALTH_CRITICAL = constantsData.needs.healthCritical;
export const HEALTH_DAMAGE_RATE = constantsData.needs.healthDamageRate;

// Cleanliness thresholds (housing)
export const CLEANLINESS_WARNING = constantsData.needs.cleanlinessWarning;
export const CLEANLINESS_PENALTY = constantsData.needs.cleanlinessPenalty;
export const STRESS_PENALTY_MULTIPLIER = constantsData.needs.stressPenaltyMultiplier;

// Temperature
export const BODY_TEMP_NORMAL = constantsData.needs.bodyTempNormal;
export const WORLD_TEMP_BASE = constantsData.needs.worldTempBase;
export const TEMP_DAILY_VARIATION = constantsData.needs.tempDailyVariation;
export const THERMAL_CHANGE_RATE = constantsData.needs.thermalChangeRate;

// Mood
export const MOOD_DECAY_RATE = constantsData.needs.moodDecayRate;
