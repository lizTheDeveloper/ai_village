/**
 * PlantConstants - Configuration values for PlantSystem
 *
 * These constants define system-level multipliers and thresholds.
 * Species-specific values (optimal temperatures, seed counts, etc.) belong in PlantSpecies.
 */

export const PLANT_CONSTANTS = {
  // === Update Frequency ===
  /** How often to update plants (20 ticks = 1 second at 20 TPS) */
  UPDATE_INTERVAL: 20,

  /** Hours to accumulate before processing daily plant updates */
  HOUR_THRESHOLD: 24.0,

  // === Hydration ===
  /** Hydration gain from heavy rain (per weather event) */
  HYDRATION_GAIN_HEAVY_RAIN: 30,

  /** Hydration gain from medium rain (per weather event) */
  HYDRATION_GAIN_MEDIUM_RAIN: 20,

  /** Hydration gain from light rain (per weather event) */
  HYDRATION_GAIN_LIGHT_RAIN: 10,

  /** Hydration threshold below which plant takes dehydration damage */
  HYDRATION_CRITICAL_THRESHOLD: 20,

  /** Moisture level to transfer from soil to plant (multiplier) */
  SOIL_MOISTURE_TRANSFER_RATE: 0.2,

  // === Nutrition ===
  /** Nutrition threshold below which plant takes malnutrition damage */
  NUTRITION_CRITICAL_THRESHOLD: 20,

  // === Damage Rates (per day) ===
  /** Health damage per day from dehydration (when hydration < 20) */
  DEHYDRATION_DAMAGE_PER_DAY: 10,

  /** Health damage per day from malnutrition (when nutrition < 20) */
  MALNUTRITION_DAMAGE_PER_DAY: 5,

  /** Nutrient consumption multiplier for growth */
  NUTRIENT_CONSUMPTION_MULTIPLIER: 2.0,

  // === Temperature Effects ===
  /** Growth rate when temperature is far outside optimal range */
  TEMPERATURE_PENALTY_EXTREME: 0.1,

  /** Growth rate when temperature is optimal */
  TEMPERATURE_BONUS_OPTIMAL: 1.0,

  /** Growth rate when temperature is suboptimal but acceptable */
  TEMPERATURE_PENALTY_SUBOPTIMAL: 0.5,

  /** Degrees outside optimal range before extreme penalty applies */
  TEMPERATURE_EXTREME_THRESHOLD: 10,

  /** Temperature above which plant takes heat stress damage */
  HEAT_STRESS_THRESHOLD: 30,

  /** Heat stress damage multiplier (per degree above threshold) */
  HEAT_STRESS_DAMAGE_MULTIPLIER: 0.5,

  // === Moisture Growth Modifiers ===
  /** Growth rate when soil moisture is very low (< 20) */
  MOISTURE_PENALTY_DRY: 0.2,

  /** Growth rate when soil moisture is overwatered (> 90) */
  MOISTURE_PENALTY_OVERWATERED: 0.7,

  /** Growth rate when soil moisture is optimal (50-80) */
  MOISTURE_BONUS_OPTIMAL: 1.0,

  /** Growth rate when soil moisture is suboptimal */
  MOISTURE_PENALTY_SUBOPTIMAL: 0.6,

  /** Soil moisture thresholds for growth calculations */
  MOISTURE_THRESHOLD_DRY: 20,
  MOISTURE_THRESHOLD_OVERWATERED: 90,
  MOISTURE_THRESHOLD_OPTIMAL_MIN: 50,
  MOISTURE_THRESHOLD_OPTIMAL_MAX: 80,

  // === Health ===
  /** Health threshold below which plant is considered unhealthy */
  HEALTH_UNHEALTHY_THRESHOLD: 50,

  // === Seed Production & Dispersal ===
  /** Default seeds produced per plant (if not specified in species) */
  DEFAULT_SEEDS_PER_PLANT: 5,

  /** Default dispersal radius in tiles (if not specified in species) */
  DEFAULT_DISPERSAL_RADIUS: 3,

  /** Seed dispersal rate per hour when in seeding stage (fraction of total) */
  SEED_DISPERSAL_RATE_PER_HOUR: 0.1,

  /** Seed dispersal rate for burst dispersal (fraction of total) */
  SEED_BURST_DISPERSAL_RATE: 0.3,

  // === Companion Planting ===
  /** Radius in tiles to check for companion plants */
  COMPANION_RADIUS: 3,

  /** Growth bonus from beneficial companion plants */
  COMPANION_BONUS: 0.15,

  /** Growth penalty from inhibiting companion plants */
  COMPANION_PENALTY: 0.20,

  // === Soil Fertility ===
  /** Soil fertility threshold below which planting is discouraged */
  SOIL_FERTILITY_LOW_THRESHOLD: 0.2,

  /** Soil nutrient threshold below which growth is impacted */
  SOIL_NUTRIENT_LOW_THRESHOLD: 10,
} as const;

/**
 * Helper type to ensure all constants are numbers
 */
type AssertAllNumbers<T> = {
  [K in keyof T]: T[K] extends number ? T[K] : never;
};

// Type assertion to ensure all values are numbers
const _typeCheck: AssertAllNumbers<typeof PLANT_CONSTANTS> = PLANT_CONSTANTS;
