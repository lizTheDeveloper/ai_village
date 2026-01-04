/**
 * CityDirectorComponent - City-level strategic decision making
 *
 * A City Director is a meta-entity that provides high-level strategic guidance
 * to autonomic NPCs within a city. Instead of each NPC making LLM calls,
 * the City Director thinks periodically and broadcasts priority weights.
 *
 * NPCs blend city priorities with their personal skill-based priorities:
 *   effectivePriority = cityPriority * cityInfluence + skillPriority * (1 - cityInfluence)
 *
 * The City Director uses a "reduced" tier LLM call (~once per game day) to
 * analyze city stats and determine strategic focus:
 * - Need food? Increase gathering priority
 * - Population growing? Increase building priority
 * - Threats nearby? Increase military/guard priority
 *
 * This enables hundreds of autonomic NPCs to act coherently without
 * individual LLM calls, while still having emergent intelligent behavior.
 */

import type { Component } from '../ecs/Component.js';
import type { StrategicPriorities } from './AgentComponent.js';
import type { ProfessionRole, ProfessionOutput } from './ProfessionComponent.js';

/**
 * City stats that inform the City Director's decisions.
 * Updated periodically by the CityDirectorSystem.
 */
export interface CityStats {
  // Population
  population: number;
  autonomicNpcCount: number;
  llmAgentCount: number;

  // Buildings
  totalBuildings: number;
  housingCapacity: number;
  storageCapacity: number;
  productionBuildings: number;

  // Resources (aggregated from warehouses/storage)
  foodSupply: number; // Days of food for population
  woodSupply: number;
  stoneSupply: number;

  // Threats
  nearbyThreats: number; // Count of hostile entities nearby
  recentDeaths: number; // Deaths in last game day
}

/**
 * Strategic focus areas the City Director can emphasize.
 * Each maps to one or more StrategicPriorities.
 */
export type CityFocus =
  | 'survival' // Food/shelter priority
  | 'growth' // Building/expansion priority
  | 'security' // Guard duty/military priority
  | 'prosperity' // Trade/crafting priority
  | 'exploration' // Scouting/discovery priority
  | 'balanced'; // Even distribution

/**
 * City Director reasoning - explains why current priorities were chosen.
 * Useful for debugging and player-facing info panels.
 */
export interface DirectorReasoning {
  focus: CityFocus;
  reasoning: string; // LLM's explanation of the decision
  concerns: string[]; // Top issues identified
  lastUpdated: number; // Tick when reasoning was generated
}

/**
 * CityDirectorComponent tracks city-level strategic priorities.
 * Attached to a city meta-entity (not a physical agent).
 */
export interface CityDirectorComponent extends Component {
  type: 'city_director';

  // Identity
  cityId: string;
  cityName: string;

  // Geographic bounds (agents within these bounds are influenced)
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };

  // Current city statistics
  stats: CityStats;

  // Strategic priorities (broadcast to autonomic NPCs)
  priorities: StrategicPriorities;

  // How much city priorities influence NPC behavior (0-1)
  // Higher = NPCs follow city direction more, lower = NPCs follow personal skills more
  cityInfluence: number;

  // Decision timing
  lastDirectorMeeting: number; // Tick of last LLM decision
  meetingInterval: number; // Ticks between meetings (default: 1 game day = 14400 ticks at 20 TPS)

  // LLM integration
  useLLM: boolean; // Whether to use LLM for city decisions
  pendingDecision: boolean; // Whether a decision request is queued

  // Director reasoning (for debugging and UI)
  reasoning?: DirectorReasoning;

  // Agent roster - IDs of agents in this city
  agentIds: string[];

  // Profession management (for background simulation)
  /** Desired number of agents per profession role */
  professionQuotas: Partial<Record<ProfessionRole, number>>;

  /** IDs of agents by profession role (for quick lookup) */
  professionRoster: Partial<Record<ProfessionRole, string[]>>;

  /** Aggregated profession outputs (cached for performance) */
  professionOutputs: {
    /** Recent news articles from reporters */
    newsArticles: ProfessionOutput[];
    /** Completed TV episodes from actors/crew */
    tvEpisodes: ProfessionOutput[];
    /** Radio broadcasts from DJs */
    radioBroadcasts: ProfessionOutput[];
    /** Generic service outputs (doctors, teachers, etc.) */
    services: ProfessionOutput[];
  };

  /** Last tick when profession outputs were aggregated */
  lastProfessionUpdate: number;

  /** Content production metrics (for analytics/UI) */
  professionMetrics?: {
    /** Total content produced all-time */
    totalArticles: number;
    totalTVEpisodes: number;
    totalRadioShows: number;
    totalServices: number;

    /** Production rate (per game day) */
    articlesPerDay: number;
    tvEpisodesPerDay: number;
    radioShowsPerDay: number;

    /** Average quality (0.0-1.0) */
    avgArticleQuality: number;
    avgTVQuality: number;
    avgRadioQuality: number;

    /** Last update tick */
    lastMetricsUpdate: number;
  };
}

/**
 * Default city priorities - balanced distribution.
 */
export const DEFAULT_CITY_PRIORITIES: StrategicPriorities = {
  gathering: 0.20,
  building: 0.20,
  farming: 0.20,
  social: 0.10,
  exploration: 0.15,
  rest: 0.10,
  magic: 0.05,
};

/**
 * Create a new CityDirectorComponent with default values.
 */
export function createCityDirectorComponent(
  cityId: string,
  cityName: string,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  useLLM: boolean = true
): CityDirectorComponent {
  // One game day at 20 TPS = 720 seconds = 14400 ticks
  const GAME_DAY_TICKS = 14400;

  return {
    type: 'city_director',
    version: 1,
    cityId,
    cityName,
    bounds,
    stats: {
      population: 0,
      autonomicNpcCount: 0,
      llmAgentCount: 0,
      totalBuildings: 0,
      housingCapacity: 0,
      storageCapacity: 0,
      productionBuildings: 0,
      foodSupply: 0,
      woodSupply: 0,
      stoneSupply: 0,
      nearbyThreats: 0,
      recentDeaths: 0,
    },
    priorities: { ...DEFAULT_CITY_PRIORITIES },
    cityInfluence: 0.4, // 40% city influence, 60% personal skills
    lastDirectorMeeting: 0,
    meetingInterval: GAME_DAY_TICKS,
    useLLM,
    pendingDecision: false,
    agentIds: [],
    professionQuotas: {},
    professionRoster: {},
    professionOutputs: {
      newsArticles: [],
      tvEpisodes: [],
      radioBroadcasts: [],
      services: [],
    },
    lastProfessionUpdate: 0,
    professionMetrics: {
      totalArticles: 0,
      totalTVEpisodes: 0,
      totalRadioShows: 0,
      totalServices: 0,
      articlesPerDay: 0,
      tvEpisodesPerDay: 0,
      radioShowsPerDay: 0,
      avgArticleQuality: 0,
      avgTVQuality: 0,
      avgRadioQuality: 0,
      lastMetricsUpdate: 0,
    },
  };
}

/**
 * Blend city priorities with an agent's personal skill-based priorities.
 *
 * @param cityPriorities - Priorities from the City Director
 * @param agentPriorities - Agent's personal priorities (from skills)
 * @param cityInfluence - How much weight to give city priorities (0-1)
 * @returns Blended priorities for the agent to use
 */
export function blendPriorities(
  cityPriorities: StrategicPriorities,
  agentPriorities: StrategicPriorities,
  cityInfluence: number
): StrategicPriorities {
  const agentWeight = 1 - cityInfluence;

  const blended: StrategicPriorities = {
    gathering:
      (cityPriorities.gathering ?? 0) * cityInfluence +
      (agentPriorities.gathering ?? 0) * agentWeight,
    building:
      (cityPriorities.building ?? 0) * cityInfluence +
      (agentPriorities.building ?? 0) * agentWeight,
    farming:
      (cityPriorities.farming ?? 0) * cityInfluence +
      (agentPriorities.farming ?? 0) * agentWeight,
    social:
      (cityPriorities.social ?? 0) * cityInfluence +
      (agentPriorities.social ?? 0) * agentWeight,
    exploration:
      (cityPriorities.exploration ?? 0) * cityInfluence +
      (agentPriorities.exploration ?? 0) * agentWeight,
    rest:
      (cityPriorities.rest ?? 0) * cityInfluence +
      (agentPriorities.rest ?? 0) * agentWeight,
    magic:
      (cityPriorities.magic ?? 0) * cityInfluence +
      (agentPriorities.magic ?? 0) * agentWeight,
  };

  // Normalize so priorities sum to 1.0
  const total = Object.values(blended).reduce((sum, val) => sum + (val ?? 0), 0);
  if (total > 0) {
    for (const key of Object.keys(blended) as Array<keyof StrategicPriorities>) {
      blended[key] = (blended[key] ?? 0) / total;
    }
  }

  return blended;
}

/**
 * Get priorities based on a strategic focus.
 * Used when LLM isn't available or for quick rule-based decisions.
 */
export function getPrioritiesForFocus(focus: CityFocus): StrategicPriorities {
  switch (focus) {
    case 'survival':
      return {
        gathering: 0.35,
        farming: 0.30,
        building: 0.15,
        social: 0.05,
        exploration: 0.05,
        rest: 0.10,
        magic: 0,
      };
    case 'growth':
      return {
        gathering: 0.25,
        building: 0.40,
        farming: 0.15,
        social: 0.05,
        exploration: 0.10,
        rest: 0.05,
        magic: 0,
      };
    case 'security':
      return {
        gathering: 0.15,
        building: 0.20,
        farming: 0.10,
        social: 0.10,
        exploration: 0.30, // Patrol/scout
        rest: 0.10,
        magic: 0.05,
      };
    case 'prosperity':
      return {
        gathering: 0.25,
        building: 0.25,
        farming: 0.20,
        social: 0.15,
        exploration: 0.05,
        rest: 0.05,
        magic: 0.05,
      };
    case 'exploration':
      return {
        gathering: 0.15,
        building: 0.10,
        farming: 0.10,
        social: 0.10,
        exploration: 0.45,
        rest: 0.05,
        magic: 0.05,
      };
    case 'balanced':
    default:
      return { ...DEFAULT_CITY_PRIORITIES };
  }
}

/**
 * Infer focus from city stats (rule-based fallback when LLM unavailable).
 */
export function inferFocusFromStats(stats: CityStats): CityFocus {
  // Critical: Food shortage
  if (stats.foodSupply < 3) {
    return 'survival';
  }

  // Security: Recent deaths or threats
  if (stats.nearbyThreats > 3 || stats.recentDeaths > 0) {
    return 'security';
  }

  // Growth: Housing shortage (population near capacity)
  if (stats.population > 0 && stats.housingCapacity > 0) {
    const occupancy = stats.population / stats.housingCapacity;
    if (occupancy > 0.8) {
      return 'growth';
    }
  }

  // Prosperity: Stable with surplus resources
  if (stats.foodSupply > 10 && stats.woodSupply > 50 && stats.stoneSupply > 30) {
    return 'prosperity';
  }

  // Exploration: New city with few buildings
  if (stats.totalBuildings < 5) {
    return 'exploration';
  }

  return 'balanced';
}

/**
 * Check if an agent is within a city's bounds.
 */
export function isAgentInCity(
  agentX: number,
  agentY: number,
  bounds: CityDirectorComponent['bounds']
): boolean {
  return (
    agentX >= bounds.minX &&
    agentX <= bounds.maxX &&
    agentY >= bounds.minY &&
    agentY <= bounds.maxY
  );
}
