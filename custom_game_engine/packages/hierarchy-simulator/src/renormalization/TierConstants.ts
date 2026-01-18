/**
 * Tier Constants and Time Scaling
 *
 * From RENORMALIZATION_LAYER.md spec:
 * At ringworld view, every tick advances the simulation by a DECADE.
 * Individual agent lifetimes are noise - only generational trends matter.
 */

import type { TierLevel } from '../abstraction/types.js';

/**
 * Time scaling: how many game-ticks one system-tick represents at each level.
 *
 * At 20 TPS (50ms per tick):
 * - Chunk: real-time individual simulation
 * - Zone: 1 hour per tick (demographic changes)
 * - Region: 1 day per tick (economic cycles)
 * - Subsection: 1 week per tick (political changes)
 * - Megasegment: 1 month per tick (cultural shifts)
 * - Gigasegment: 1 year per tick (generational changes)
 * - Ringworld: 1 decade per tick (civilizational evolution)
 */
export const TIME_SCALE: Record<TierLevel, number> = {
  tile: 1,           // Individual physics (sub-chunk)
  chunk: 1,          // 1 tick = 1 tick (real ECS)
  zone: 60,          // 1 tick = 1 hour (60 minutes)
  region: 1440,      // 1 tick = 1 day (24 hours)
  subsection: 10080, // 1 tick = 1 week (7 days)
  megasegment: 43200,    // 1 tick = 1 month (30 days)
  gigasegment: 525600,   // 1 tick = 1 year (365 days)
  // NEW: Interstellar time scales
  planet: 5256000,       // 1 tick = 10 years (3650 days)
  system: 52560000,      // 1 tick = 100 years (36,500 days)
  sector: 525600000,     // 1 tick = 1,000 years (365,000 days)
  galaxy: 5256000000,    // 1 tick = 10,000 years (3.65M days)
};

/**
 * Tier level as numeric index (for comparisons)
 */
export const TIER_LEVEL_INDEX: Record<TierLevel, number> = {
  tile: 0,
  chunk: 1,
  zone: 2,
  region: 3,
  subsection: 4,
  megasegment: 5,
  gigasegment: 6,
  // NEW: Interstellar tier indices
  planet: 7,
  system: 8,
  sector: 9,
  galaxy: 10,
};

/**
 * Get time scale for a tier level
 */
export function getTimeScale(tier: TierLevel): number {
  return TIME_SCALE[tier] ?? 1;
}

/**
 * Get tier level index (higher = larger)
 */
export function getTierIndex(tier: TierLevel): number {
  return TIER_LEVEL_INDEX[tier] ?? 0;
}

/**
 * Check if tierA is higher (larger scale) than tierB
 */
export function isHigherTier(tierA: TierLevel, tierB: TierLevel): boolean {
  return TIER_LEVEL_INDEX[tierA] > TIER_LEVEL_INDEX[tierB];
}

/**
 * What variables get summarized (lost) vs preserved at each tier transition
 */
export interface SummarizationRules {
  /** What gets summed (populations, resources) */
  sum: string[];
  /** What gets averaged (rates, happiness) */
  average: string[];
  /** What gets computed (stability, tech level) */
  computed: string[];
  /** What gets preserved (named NPCs, events, buildings) */
  preserved: string[];
  /** What gets lost (individual positions, behaviors) */
  lost: string[];
}

export const SUMMARIZATION_RULES: Record<TierLevel, SummarizationRules> = {
  tile: {
    sum: [],
    average: [],
    computed: [],
    preserved: ['all'], // Full ECS at tile level
    lost: [],
  },
  chunk: {
    sum: ['population', 'resources'],
    average: ['happiness', 'hunger'],
    computed: ['productivity'],
    preserved: ['named_npcs', 'buildings', 'events'],
    lost: ['individual_positions', 'exact_behaviors'],
  },
  zone: {
    sum: ['population', 'production', 'consumption'],
    average: ['birth_rate', 'death_rate', 'happiness', 'faith'],
    computed: ['stability', 'carrying_capacity'],
    preserved: ['governor', 'temples', 'major_events'],
    lost: ['individual_skills', 'personal_relationships'],
  },
  region: {
    sum: ['population', 'food_surplus', 'trade_volume'],
    average: ['birth_rate', 'death_rate', 'belief_density'],
    computed: ['stability', 'tech_level', 'trade_balance'],
    preserved: ['cities', 'universities', 'historical_events'],
    lost: ['zone_identities', 'skill_distributions'],
  },
  subsection: {
    sum: ['population', 'production', 'military'],
    average: ['growth_rate', 'tech_level', 'belief'],
    computed: ['stability', 'cultural_influence'],
    preserved: ['nations', 'capitals', 'wars', 'wonders'],
    lost: ['regional_details', 'local_trade'],
  },
  megasegment: {
    sum: ['population', 'energy_output', 'tech_production'],
    average: ['kardashev_level', 'stability'],
    computed: ['dominant_culture', 'megastructure_progress'],
    preserved: ['civilizations', 'megastructures', 'ringworld_events'],
    lost: ['subsection_politics', 'national_borders'],
  },
  gigasegment: {
    sum: ['population', 'stellar_energy', 'dimensional_flux'],
    average: ['cosmic_stability', 'tech_level'],
    computed: ['galactic_influence', 'dimensional_coherence'],
    preserved: ['galactic_empires', 'cosmic_events', 'deity_domains'],
    lost: ['megasegment_details', 'cultural_nuances'],
  },
  // NEW: Interstellar tier summarization rules
  planet: {
    sum: ['population', 'total_production', 'total_consumption', 'military_power'],
    average: ['avg_tech_level', 'avg_happiness', 'avg_life_expectancy', 'belief_density'],
    computed: ['planetary_stability', 'urbanization', 'industrialization', 'cultural_influence'],
    preserved: ['named_features', 'major_civilizations', 'megastructures', 'planetary_events', 'capital_city', 'world_wonders'],
    lost: ['gigasegment_details', 'local_politics', 'individual_buildings', 'minor_trade_routes', 'weather_patterns'],
  },
  system: {
    sum: ['total_population', 'system_production', 'system_consumption', 'military_fleet_power'],
    average: ['avg_tech_level', 'avg_planetary_happiness', 'trade_efficiency'],
    computed: ['system_stability', 'economic_output', 'defense_power', 'space_infrastructure'],
    preserved: ['star_properties', 'habitable_zone', 'planets', 'major_stations', 'asteroid_belts', 'dyson_swarm', 'wormholes', 'system_capital'],
    lost: ['planet_surface_details', 'minor_stations', 'ship_positions', 'trade_schedules'],
  },
  sector: {
    sum: ['total_population', 'total_production', 'total_military_power', 'total_trade_volume'],
    average: ['avg_tech_level', 'avg_stability', 'economic_integration'],
    computed: ['political_stability', 'military_balance', 'economic_output', 'cultural_influence'],
    preserved: ['star_systems', 'political_entities', 'wormhole_gates', 'major_trade_networks', 'active_wars', 'dyson_spheres', 'sector_capital', 'historic_events'],
    lost: ['system_details', 'minor_trade_routes', 'individual_ships', 'short_term_politics'],
  },
  galaxy: {
    sum: ['total_population', 'total_energy_output', 'total_stars', 'colonized_systems'],
    average: ['avg_kardashev_level', 'avg_tech_level', 'galactic_stability'],
    computed: ['economic_output', 'military_power', 'cultural_influence', 'scientific_progress'],
    preserved: ['galactic_structure', 'sectors', 'galactic_civilizations', 'megastructures', 'wormhole_network', 'cosmic_events', 'galactic_governance', 'great_filters'],
    lost: ['sector_details', 'minor_civilizations', 'short_term_conflicts', 'individual_megastructures'],
  },
};

/**
 * Belief dynamics constants
 */
export const BELIEF_CONSTANTS = {
  /** Base word-of-mouth spread rate per believer per tick */
  WORD_OF_MOUTH_RATE: 0.0001,

  /** Believers generated per temple per tick */
  TEMPLE_BONUS: 10,

  /** Believers generated per miracle witnessed */
  MIRACLE_BONUS: 100,

  /** Natural decay rate per tick if no miracles */
  NATURAL_DECAY: 0.00005,

  /** Pressure from competing deities */
  COMPETITION_PRESSURE: 0.0005,

  /** Faith threshold to count as "believer" */
  FAITH_THRESHOLD: 0.1,
};

/**
 * Population dynamics constants
 */
export const POPULATION_CONSTANTS = {
  /** Base birth rate per tick */
  BASE_BIRTH_RATE: 0.015,

  /** Base death rate per tick */
  BASE_DEATH_RATE: 0.012,

  /** Food consumption per person per tick */
  FOOD_CONSUMPTION_PER_CAPITA: 0.08,

  /** Food production per worker per tick (base) */
  FOOD_PRODUCTION_PER_WORKER: 0.12,

  /** Tech bonus to production per level */
  TECH_PRODUCTION_BONUS: 0.1,
};

/**
 * Event probability scaling with time
 */
export const EVENT_CONSTANTS = {
  /** Base event probability per tick */
  BASE_EVENT_CHANCE: 0.0001,

  /** Event duration range in ticks */
  DURATION_RANGE: [50, 150] as [number, number],

  /** Severity range */
  SEVERITY_RANGE: [1, 10] as [number, number],
};
