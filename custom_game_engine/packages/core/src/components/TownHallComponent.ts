import type { Component } from '../ecs/Component.js';

/**
 * TownHallComponent tracks population statistics for governance.
 * Per work order: Provides basic population count, agent roster, death log, birth log.
 *
 * Data quality depends on building condition:
 * - condition >= 100: Full data, no latency
 * - condition >= 50: Delayed data, 5 minute latency
 * - condition < 50: No data (building destroyed)
 */

export interface AgentRecord {
  id: string;
  name: string;
  age: number;
  generation: number;
  status: 'alive' | 'dead';
}

export interface DeathRecord {
  agent: string;
  cause: string;
  timestamp: number;
}

export interface BirthRecord {
  agent: string;
  parents: string[];
  timestamp: number;
}

export type TownHallDataQuality = 'full' | 'delayed' | 'unavailable';

export interface TownHallComponent extends Component {
  type: 'town_hall';
  populationCount: number;
  agents: AgentRecord[];
  recentDeaths: DeathRecord[];
  recentBirths: BirthRecord[];
  dataQuality: TownHallDataQuality;
  latency: number; // seconds of data delay
}

export function createTownHallComponent(): TownHallComponent {
  return {
    type: 'town_hall',
    version: 1,
    populationCount: 0,
    agents: [],
    recentDeaths: [],
    recentBirths: [],
    dataQuality: 'full',
    latency: 0,
  };
}
