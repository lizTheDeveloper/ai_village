import type { Component } from '../ecs/Component.js';

/**
 * ProvinceGovernanceComponent - Regional governance for province-level territories
 *
 * Per 06-POLITICAL-HIERARCHY.md: Provinces are regional aggregations of cities.
 * Population: 50K-5M | Territory: Region tier | Time Scale: 1 day/tick (statistical)
 *
 * Province governance operates statistically - not every agent is simulated,
 * but populations and resources are tracked as aggregates.
 */

/**
 * City within a province (aggregated data)
 */
export interface ProvinceCityRecord {
  cityId: string;
  cityName: string;
  population: number;
  economicOutput: number; // Contribution to provincial economy
  militaryStrength: number;
  loyaltyToProvince: number; // 0-1
  lastUpdateTick: number;
}

/**
 * Provincial law or edict
 */
export interface ProvincialLaw {
  id: string;
  name: string;
  description: string;
  enactedTick: number;
  scope: 'taxation' | 'military' | 'trade' | 'criminal' | 'civil';
  effects: {
    type: string;
    magnitude: number;
    description: string;
  }[];
}

/**
 * Provincial policy (longer-term than laws)
 */
export interface ProvincialPolicy {
  id: string;
  name: string;
  category: 'economic' | 'military' | 'cultural' | 'infrastructure';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  budgetAllocation: number; // % of provincial budget
  progress: number; // 0-1
  startTick: number;
  expectedEndTick?: number;
}

/**
 * Provincial military forces (aggregated)
 */
export interface ProvincialMilitary {
  totalTroops: number;
  garrisoned: number;
  deployed: number;
  militiaReserve: number;
  monthlyMaintenance: number;
  commanderAgentId?: string; // Soul agent general
  fleetIds: string[]; // Associated fleet entities
}

/**
 * Province governance structure - regional political layer
 *
 * Design principles:
 * - Statistical simulation (1 day per tick)
 * - Governor is a soul agent (LLM-controlled in Phase 3+)
 * - Cities aggregate upward to province
 * - Province aggregates to Nation (Tier 3)
 */
export interface ProvinceGovernanceComponent extends Component {
  type: 'province_governance';

  // Identity
  provinceName: string;
  foundedTick: number;
  capitalCityId?: string;

  // Territory
  regionIds: string[]; // Region entity IDs
  totalArea: number; // km² (statistical)

  // Leadership
  governanceType: 'appointed' | 'elected' | 'hereditary';
  governorAgentId?: string; // Soul agent governor
  councilMemberIds: string[]; // Provincial council

  // Terms (if elected)
  termLengthTicks?: number;
  lastElectionTick?: number;
  nextElectionTick?: number;

  // Population (aggregated from cities)
  totalPopulation: number;
  urbanPopulation: number;
  ruralPopulation: number;

  // Cities under province
  cities: ProvinceCityRecord[];

  // Economy
  economy: {
    gdp: number; // Gross domestic product (abstract units)
    taxRate: number; // 0-1
    taxRevenue: number;
    tradeBalance: number; // Imports - exports
    majorResources: string[]; // Key resource types
    economicFocus: 'agriculture' | 'industry' | 'commerce' | 'mixed';
  };

  // Military
  military: ProvincialMilitary;

  // Governance
  laws: ProvincialLaw[];
  policies: ProvincialPolicy[];

  // Stability
  stability: number; // 0-1 (0 = rebellion, 1 = perfect order)
  unrestFactors: string[]; // Sources of instability

  // Relations
  parentNationId?: string; // If part of a nation
  neighborProvinceRelations: Map<string, {
    provinceId: string;
    provinceName: string;
    relationship: 'allied' | 'friendly' | 'neutral' | 'tense' | 'hostile';
    tradeRoutes: number;
    borderDisputes: string[];
  }>;

  // Update tracking
  lastStatisticalUpdateTick: number;
}

/**
 * Create a new ProvinceGovernanceComponent with default values
 */
export function createProvinceGovernanceComponent(
  provinceName: string,
  foundedTick: number,
  governanceType: 'appointed' | 'elected' | 'hereditary' = 'appointed'
): ProvinceGovernanceComponent {
  const termLengthTicks = governanceType === 'elected' ? 2400000 : undefined; // ~2 weeks real-time

  return {
    type: 'province_governance',
    version: 1,
    provinceName,
    foundedTick,
    regionIds: [],
    totalArea: 0,
    governanceType,
    councilMemberIds: [],
    termLengthTicks,
    lastElectionTick: governanceType === 'elected' ? foundedTick : undefined,
    nextElectionTick: termLengthTicks ? foundedTick + termLengthTicks : undefined,
    totalPopulation: 0,
    urbanPopulation: 0,
    ruralPopulation: 0,
    cities: [],
    economy: {
      gdp: 0,
      taxRate: 0.15,
      taxRevenue: 0,
      tradeBalance: 0,
      majorResources: [],
      economicFocus: 'mixed',
    },
    military: {
      totalTroops: 0,
      garrisoned: 0,
      deployed: 0,
      militiaReserve: 0,
      monthlyMaintenance: 0,
      fleetIds: [],
    },
    laws: [],
    policies: [],
    stability: 0.8, // Default stable
    unrestFactors: [],
    neighborProvinceRelations: new Map(),
    lastStatisticalUpdateTick: foundedTick,
  };
}
