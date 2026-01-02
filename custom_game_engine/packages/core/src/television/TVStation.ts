/**
 * TVStation - Station organization and management
 *
 * TV stations are living organizations staffed by ensouled LLM agents.
 * This component manages the station's identity, staff, channels, and finances.
 */

import type { Component } from '../ecs/Component.js';

// ============================================================================
// EMPLOYEE TYPES
// ============================================================================

export type EmployeeRole =
  | 'station_manager'
  | 'producer'
  | 'director'
  | 'writer'
  | 'actor'
  | 'news_anchor'
  | 'weather_reporter'
  | 'camera_operator'
  | 'sound_engineer'
  | 'editor'
  | 'makeup_artist'
  | 'set_designer'
  | 'script_supervisor'
  | 'lighting_technician';

export type Department = 'production' | 'news' | 'engineering' | 'creative';

export interface Award {
  id: string;
  name: string;
  category: string;
  year: number;
  recipientId: string;
  recipientName: string;
  showId?: string;
}

export interface StationEmployee {
  agentId: string;
  role: EmployeeRole;
  department: Department;
  salary: number;
  hireTick: number;
  /** Performance rating 0-1 */
  performance: number;
  awards: Award[];
  /** Shows this employee has worked on */
  showCredits: string[];
}

// ============================================================================
// CHANNEL TYPES
// ============================================================================

export type ChannelFormat = 'general' | 'news' | 'entertainment' | 'educational' | 'sports';

export interface TVChannel {
  channelNumber: number;
  channelName: string;
  frequency: number;
  format: ChannelFormat;
  /** Current program ID or null if off-air */
  currentProgram: string | null;
  /** Content ID currently broadcasting */
  currentContentId: string | null;
  /** Signal strength 0-1 */
  signalStrength: number;
  /** Broadcast range in world units */
  broadcastRange: number;
}

// ============================================================================
// PRODUCTION TYPES
// ============================================================================

export type ProductionPhase =
  | 'development'
  | 'pre_production'
  | 'production'
  | 'post_production'
  | 'ready';

export interface Production {
  id: string;
  showId: string;
  contentId: string;
  season: number;
  episode: number;
  phase: ProductionPhase;
  /** Agent IDs assigned to this production */
  crew: Map<EmployeeRole, string[]>;
  /** Budget allocated */
  budget: number;
  /** Budget spent so far */
  spent: number;
  /** Scheduled completion tick */
  scheduledCompletion: number;
  startedTick: number;
}

// ============================================================================
// STATION COMPONENT
// ============================================================================

export interface TVStationComponent extends Component {
  type: 'tv_station';

  /** Station identity */
  stationName: string;
  callSign: string; // e.g., "KVIL-TV"
  foundedTick: number;

  /** Building reference */
  buildingId: string;

  /** Channels operated */
  channels: TVChannel[];
  maxChannels: number;

  /** Staff */
  employees: StationEmployee[];
  maxEmployees: number;

  /** Shows in production or aired */
  activeShows: string[]; // show IDs
  cancelledShows: string[];
  maxConcurrentShows: number;

  /** Content library */
  contentArchive: string[]; // content IDs in storage
  archiveCapacity: number;

  /** Current productions */
  activeProductions: Production[];

  /** Finances */
  budget: number;
  advertisingRevenue: number;
  monthlyOperatingCosts: number;

  /** Reputation & Metrics */
  reputation: number; // 0-100
  totalViewers: number;
  peakViewers: number;
  averageRating: number;

  /** Awards */
  awards: Award[];

  /** Writers room chat ID (ChatRoomSystem integration) */
  writersRoomChatId?: string;
  productionFloorChatId?: string;
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

let stationIdCounter = 0;

export function createTVStationComponent(
  stationName: string,
  callSign: string,
  buildingId: string,
  tick: number
): TVStationComponent {
  return {
    type: 'tv_station',
    version: 1,

    stationName,
    callSign,
    foundedTick: tick,
    buildingId,

    channels: [],
    maxChannels: 3,

    employees: [],
    maxEmployees: 50,

    activeShows: [],
    cancelledShows: [],
    maxConcurrentShows: 10,

    contentArchive: [],
    archiveCapacity: 1000,

    activeProductions: [],

    budget: 10000,
    advertisingRevenue: 0,
    monthlyOperatingCosts: 0,

    reputation: 50,
    totalViewers: 0,
    peakViewers: 0,
    averageRating: 0,

    awards: [],
  };
}

export function createTVChannel(
  channelNumber: number,
  channelName: string,
  format: ChannelFormat = 'general'
): TVChannel {
  return {
    channelNumber,
    channelName,
    frequency: 100 + channelNumber * 10, // MHz
    format,
    currentProgram: null,
    currentContentId: null,
    signalStrength: 1.0,
    broadcastRange: 600,
  };
}

export function createProduction(
  showId: string,
  contentId: string,
  season: number,
  episode: number,
  budget: number,
  tick: number
): Production {
  return {
    id: `prod_${showId}_s${season}e${episode}_${++stationIdCounter}`,
    showId,
    contentId,
    season,
    episode,
    phase: 'development',
    crew: new Map(),
    budget,
    spent: 0,
    scheduledCompletion: tick + 20 * 60 * 60 * 24, // ~1 day in ticks
    startedTick: tick,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getEmployeesByRole(
  station: TVStationComponent,
  role: EmployeeRole
): StationEmployee[] {
  return station.employees.filter(e => e.role === role);
}

export function getEmployeesByDepartment(
  station: TVStationComponent,
  department: Department
): StationEmployee[] {
  return station.employees.filter(e => e.department === department);
}

export function hireEmployee(
  station: TVStationComponent,
  agentId: string,
  role: EmployeeRole,
  department: Department,
  salary: number,
  tick: number
): StationEmployee | null {
  if (station.employees.length >= station.maxEmployees) {
    return null;
  }

  // Check if already employed
  if (station.employees.some(e => e.agentId === agentId)) {
    return null;
  }

  const employee: StationEmployee = {
    agentId,
    role,
    department,
    salary,
    hireTick: tick,
    performance: 0.5, // start average
    awards: [],
    showCredits: [],
  };

  station.employees.push(employee);
  station.monthlyOperatingCosts += salary;

  return employee;
}

export function fireEmployee(
  station: TVStationComponent,
  agentId: string
): boolean {
  const index = station.employees.findIndex(e => e.agentId === agentId);
  if (index === -1) return false;

  const employee = station.employees[index]!;
  station.monthlyOperatingCosts -= employee.salary;
  station.employees.splice(index, 1);

  return true;
}

export function addChannel(
  station: TVStationComponent,
  channelName: string,
  format: ChannelFormat = 'general'
): TVChannel | null {
  if (station.channels.length >= station.maxChannels) {
    return null;
  }

  const channelNumber = station.channels.length + 1;
  const channel = createTVChannel(channelNumber, channelName, format);
  station.channels.push(channel);

  return channel;
}

export function calculateOperatingCosts(station: TVStationComponent): number {
  let costs = 0;

  // Salaries
  for (const employee of station.employees) {
    costs += employee.salary;
  }

  // Base operating costs (power, equipment, etc.)
  costs += station.channels.length * 500; // per channel

  // Production costs
  for (const production of station.activeProductions) {
    costs += production.budget * 0.1; // 10% overhead
  }

  return costs;
}

export function updateReputation(
  station: TVStationComponent,
  delta: number
): void {
  station.reputation = Math.max(0, Math.min(100, station.reputation + delta));
}

export function getAvailableCrewForRole(
  station: TVStationComponent,
  role: EmployeeRole
): StationEmployee[] {
  const employees = getEmployeesByRole(station, role);
  const busyAgentIds = new Set<string>();

  // Check who's currently assigned to active productions
  for (const production of station.activeProductions) {
    const assigned = production.crew.get(role);
    if (assigned) {
      for (const id of assigned) {
        busyAgentIds.add(id);
      }
    }
  }

  return employees.filter(e => !busyAgentIds.has(e.agentId));
}

export function assignCrewToProduction(
  production: Production,
  role: EmployeeRole,
  agentId: string
): void {
  const current = production.crew.get(role) ?? [];
  if (!current.includes(agentId)) {
    current.push(agentId);
    production.crew.set(role, current);
  }
}

export function advanceProductionPhase(production: Production): ProductionPhase {
  const phases: ProductionPhase[] = [
    'development',
    'pre_production',
    'production',
    'post_production',
    'ready',
  ];

  const currentIndex = phases.indexOf(production.phase);
  if (currentIndex < phases.length - 1) {
    production.phase = phases[currentIndex + 1]!;
  }

  return production.phase;
}
