import type { Component } from '../ecs/Component.js';

/**
 * CensusBureauComponent tracks demographics and population projections.
 * Per work order: Requires Town Hall, provides age distribution, birth/death rates,
 * generational tracking, population projections, extinction risk.
 *
 * Requires staffing by 1 census taker agent.
 * - Staffed: Real-time data, high accuracy
 * - Unstaffed: Stale data (24 hour updates), lower accuracy
 */

export interface Demographics {
  children: number; // Age 0-18
  adults: number; // Age 18-60
  elders: number; // Age 60+
}

export interface Projections {
  in10Generations: number;
  extinctionRisk: 'none' | 'low' | 'moderate' | 'high';
}

export interface GenerationalTrend {
  generation: number;
  avgLifespan: number;
  avgIntelligence: number;
}

export type CensusBureauDataQuality = 'real_time' | 'stale';

export interface CensusBureauComponent extends Component {
  type: 'census_bureau';
  demographics: Demographics;
  birthRate: number; // births per game-day
  deathRate: number; // deaths per game-day
  replacementRate: number; // births per death
  projections: Projections;
  generationalTrends: GenerationalTrend[];
  dataQuality: CensusBureauDataQuality;
  updateFrequency: number | 'immediate'; // seconds or 'immediate'
  accuracy: number; // 0-1, affected by staff intelligence
}

export function createCensusBureauComponent(): CensusBureauComponent {
  return {
    type: 'census_bureau',
    version: 1,
    demographics: {
      children: 0,
      adults: 0,
      elders: 0,
    },
    birthRate: 0,
    deathRate: 0,
    replacementRate: 1.0,
    projections: {
      in10Generations: 0,
      extinctionRisk: 'none',
    },
    generationalTrends: [],
    dataQuality: 'stale',
    updateFrequency: 24 * 3600, // 24 hours when unstaffed
    accuracy: 0.5,
  };
}
