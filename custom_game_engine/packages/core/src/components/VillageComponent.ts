import type { Component } from '../ecs/Component.js';

/**
 * Abstraction level for village simulation.
 * - 'detailed': Full ECS simulation with individual agents
 * - 'summary': Agents replaced by aggregate statistics, key events tracked
 * - 'statistical': Pure numbers only, no event tracking, minimal compute
 */
export type VillageAbstractionLevel = 'detailed' | 'summary' | 'statistical';

/**
 * A notable event that happened in a village.
 * Used to propagate news and track village history.
 */
export interface VillageEvent {
  type: string;
  description: string;
  tick: number;
  impact: 'positive' | 'neutral' | 'negative';
}

/**
 * Summary data populated when abstraction level is 'summary' or 'statistical'.
 * Aggregated from agent components by VillageSummarySystem.
 */
export interface VillageSummary {
  population: number;
  avgMood: number;          // 0-1
  resources: Record<string, number>; // resourceType -> total
  governmentType: string;
  leaderName: string;
  recentEvents: VillageEvent[];
  gdp: number;
  tradeBalance: number;
}

/**
 * VillageComponent - Marks an entity as a village with multi-scale abstraction support.
 *
 * Villages can exist at varying levels of simulation detail:
 * - detailed: The player's home village, full agent-level simulation
 * - summary: Nearby villages, events tracked but agents are aggregated
 * - statistical: Distant/background villages, pure numbers only
 *
 * The VillageSummarySystem aggregates agent data into the summary field
 * when abstractionLevel is 'summary' or 'statistical'.
 */
export interface VillageComponent extends Component {
  readonly type: 'village';
  readonly version: 1;
  villageId: string;
  name: string;
  position: { x: number; y: number }; // World map position
  abstractionLevel: VillageAbstractionLevel;
  summary: VillageSummary;
  status: 'thriving' | 'stable' | 'struggling' | 'collapsed' | 'ruins';
  foundedTick: number;
  collapsedTick?: number;
}

/**
 * Create a new VillageComponent with sensible defaults.
 */
export function createVillageComponent(
  villageId: string,
  name: string,
  position: { x: number; y: number },
  abstractionLevel: VillageAbstractionLevel,
  tick: number
): VillageComponent {
  return {
    type: 'village',
    version: 1,
    villageId,
    name,
    position,
    abstractionLevel,
    summary: {
      population: 0,
      avgMood: 0.5,
      resources: {},
      governmentType: 'elder_council',
      leaderName: '',
      recentEvents: [],
      gdp: 0,
      tradeBalance: 0,
    },
    status: 'stable',
    foundedTick: tick,
  };
}
