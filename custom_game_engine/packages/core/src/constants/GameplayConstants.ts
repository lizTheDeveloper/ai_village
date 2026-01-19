// packages/core/src/constants/GameplayConstants.ts

import constantsData from '../data/constants.json';

// Resource yields
export const BASE_SEED_YIELD_HARVEST = constantsData.gameplay.baseSeedYieldHarvest;
export const BASE_SEED_YIELD_GATHER = constantsData.gameplay.baseSeedYieldGather;
export const BASE_FRUIT_YIELD = constantsData.gameplay.baseFruitYield;

// Skill modifiers
export const SKILL_YIELD_MULTIPLIER_BASE = constantsData.gameplay.skillYieldMultiplierBase;
export const SKILL_YIELD_MULTIPLIER_SCALE = constantsData.gameplay.skillYieldMultiplierScale;
export const SKILL_LEVEL_HARVEST_THRESHOLD = constantsData.gameplay.skillLevelHarvestThreshold;

// Market events
export const MARKET_EVENT_CHANCE = constantsData.gameplay.marketEventChance;
export const MARKET_EVENT_DURATION_MIN_DAYS = constantsData.gameplay.marketEventDurationMinDays;
export const MARKET_EVENT_DURATION_MAX_DAYS = constantsData.gameplay.marketEventDurationMaxDays;
export const MARKET_SHORTAGE_MULTIPLIER_MIN = constantsData.gameplay.marketShortageMultiplierMin;
export const MARKET_SHORTAGE_MULTIPLIER_MAX = constantsData.gameplay.marketShortageMultiplierMax;
export const MARKET_SURPLUS_MULTIPLIER_MIN = constantsData.gameplay.marketSurplusMultiplierMin;
export const MARKET_SURPLUS_MULTIPLIER_MAX = constantsData.gameplay.marketSurplusMultiplierMax;

// Genetics variance
export const MUTATION_CHANCE = constantsData.gameplay.mutationChance;
export const MUTATION_MAGNITUDE = constantsData.gameplay.mutationMagnitude;
export const INHERITANCE_VARIANCE_MIN = constantsData.gameplay.inheritanceVarianceMin;
export const INHERITANCE_VARIANCE_MAX = constantsData.gameplay.inheritanceVarianceMax;

// Wild animal spawning
export const SPAWN_COUNT_MIN = constantsData.gameplay.spawnCountMin;
export const SPAWN_COUNT_MAX = constantsData.gameplay.spawnCountMax;
export const SPAWN_COUNT_HERD = constantsData.gameplay.spawnCountHerd;

// Soil fertility ranges
export const SOIL_FERTILITY_MIN = constantsData.gameplay.soilFertilityMin;
export const SOIL_FERTILITY_MAX = constantsData.gameplay.soilFertilityMax;
export const SOIL_MOISTURE_MIN = constantsData.gameplay.soilMoistureMin;
export const SOIL_MOISTURE_MAX = constantsData.gameplay.soilMoistureMax;

// Hydration threshold for watering
export const HYDRATION_THRESHOLD = constantsData.gameplay.hydrationThreshold;
