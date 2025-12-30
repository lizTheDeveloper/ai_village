// packages/core/src/constants/NeedsConstants.ts
// All thresholds use 0-1 scale (0 = empty/dead, 1 = full/healthy)

// Hunger thresholds (0-1 scale)
export const HUNGER_THRESHOLD_SEEK_FOOD = 0.7;  // 70% - seek food when below this
export const HUNGER_RESTORED_DEFAULT = 0.25;     // 25% restored per food item

// Energy thresholds (0-1 scale)
export const ENERGY_CRITICAL = 0.1;   // 10%
export const ENERGY_LOW = 0.3;        // 30%
export const ENERGY_MODERATE = 0.5;   // 50%
export const ENERGY_HIGH = 0.7;       // 70%
export const ENERGY_FULL = 1.0;       // 100%

// Energy work multipliers
export const WORK_SPEED_CRITICAL = 0.5;
export const WORK_SPEED_LOW = 0.75;
export const WORK_SPEED_MODERATE = 0.9;
export const WORK_SPEED_NORMAL = 1.0;

// Sleep completion thresholds (0-1 scale)
export const SLEEP_COMPLETE_ENERGY = 1.0;    // 100%
export const SLEEP_INTERRUPT_HUNGER = 0.1;   // 10%
export const SLEEP_INTERRUPT_ENERGY = 0.7;   // 70%

// Sleep quality modifiers
export const SLEEP_QUALITY_SHELTER = 0.5;
export const SLEEP_QUALITY_HOUSE = 0.4;
export const SLEEP_QUALITY_BED = 0.2;
export const SLEEP_QUALITY_LUXURY = 0.1;
export const SLEEP_QUALITY_MIN = 0.1;
export const SLEEP_QUALITY_MAX = 1.0;

// Health thresholds (0-1 scale)
export const HEALTH_CRITICAL = 0.2;  // 20%
export const HEALTH_DAMAGE_RATE = 0.5; // per second in dangerous temps

// Cleanliness thresholds (housing)
export const CLEANLINESS_WARNING = 30;
export const CLEANLINESS_PENALTY = 50;
export const STRESS_PENALTY_MULTIPLIER = 0.01;

// Temperature
export const BODY_TEMP_NORMAL = 37;
export const WORLD_TEMP_BASE = 20;
export const TEMP_DAILY_VARIATION = 8;
export const THERMAL_CHANGE_RATE = 0.15;

// Mood
export const MOOD_DECAY_RATE = 0.01;
