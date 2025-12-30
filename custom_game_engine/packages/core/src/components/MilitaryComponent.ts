/**
 * MilitaryComponent - Military organization and squad management
 *
 * Forward-compatibility for combat and defense systems.
 * Enables Dwarf Fortress-style military squads with schedules and equipment.
 *
 * Part of Forward-Compatibility Phase
 */

import type { Component } from '../ecs/Component.js';

// ============================================================================
// Squad Schedules
// ============================================================================

/** Activity types for squad schedules */
export type SquadActivity =
  | 'training'    // Practice combat skills
  | 'patrol'      // Walk patrol route
  | 'guard'       // Stand at guard post
  | 'hunt'        // Hunt animals/monsters
  | 'defend'      // Respond to threats
  | 'off_duty'    // Civilian activities
  | 'rest';       // Mandatory rest

/** A scheduled activity block */
export interface ScheduleBlock {
  hour: number;           // 0-23
  activity: SquadActivity;
  location?: string;      // Patrol route ID or guard post ID
}

/** A full day schedule */
export interface DaySchedule {
  dayOfWeek: number;      // 0-6
  blocks: ScheduleBlock[];
}

// ============================================================================
// Military Ranks
// ============================================================================

/** Military ranks */
export type MilitaryRank =
  | 'recruit'     // New soldier
  | 'soldier'     // Basic trained
  | 'veteran'     // Experienced
  | 'sergeant'    // Squad second
  | 'captain'     // Squad leader
  | 'commander'   // Multiple squads
  | 'general';    // Army leader

/** Combat roles within a squad */
export type CombatRole =
  | 'melee'       // Front line fighter
  | 'ranged'      // Archer/crossbow
  | 'shield'      // Defensive specialist
  | 'medic'       // Battlefield healing
  | 'scout';      // Reconnaissance

// ============================================================================
// Equipment Loadout
// ============================================================================

/** Equipment requirements for a position */
export interface EquipmentLoadout {
  weapon?: string;        // Required weapon type
  shield?: string;        // Required shield type
  helmet?: string;        // Required helmet type
  armor?: string;         // Required armor type
  ammunition?: string;    // Required ammo type
  ammunitionCount?: number;
}

// ============================================================================
// Squad Definition
// ============================================================================

/**
 * A military squad.
 */
export interface Squad {
  /** Unique identifier */
  id: string;

  /** Squad name (e.g., "The Iron Guard") */
  name: string;

  /** Squad leader entity ID */
  leaderId: string;

  /** Member entity IDs */
  memberIds: string[];

  /** Maximum squad size */
  maxSize: number;

  /** Current schedule */
  schedule: DaySchedule[];

  /** Default equipment loadout */
  defaultLoadout: EquipmentLoadout;

  /** Current activity */
  currentActivity: SquadActivity;

  /** Station point (where to gather) */
  stationPoint?: { x: number; y: number };

  /** Patrol route (if patrolling) */
  patrolRoute?: Array<{ x: number; y: number }>;

  /** Current patrol waypoint index */
  patrolIndex?: number;

  /** Squad morale (0-100) */
  morale: number;

  /** Times deployed in combat */
  combatDeployments: number;

  /** Victories */
  victories: number;

  /** Defeats */
  defeats: number;

  /** Squad created at (tick) */
  createdAt: number;
}

// ============================================================================
// Military Component (for agents)
// ============================================================================

/**
 * MilitaryComponent tracks an agent's military status.
 */
export interface MilitaryComponent extends Component {
  type: 'military';

  /** Whether agent is in the military */
  enlisted: boolean;

  /** Squad ID (if enlisted) */
  squadId?: string;

  /** Military rank */
  rank: MilitaryRank;

  /** Combat role */
  role?: CombatRole;

  /** Equipment loadout assignment */
  assignedLoadout?: EquipmentLoadout;

  /** Combat experience (0-100) */
  combatExperience: number;

  /** Kills (for morale/promotion) */
  kills: number;

  /** Times wounded in combat */
  timesWounded: number;

  /** Whether currently on duty */
  onDuty: boolean;

  /** Current assigned activity */
  currentAssignment?: SquadActivity;

  /** Whether following orders or acting autonomously */
  followingOrders: boolean;

  /** Last combat tick */
  lastCombat?: number;

  /** Training progress for current skill */
  trainingProgress: number;

  /** Whether this agent is a militia (part-time) or professional */
  militia: boolean;
}

/**
 * Create a default non-military component.
 */
export function createMilitaryComponent(): MilitaryComponent {
  return {
    type: 'military',
    version: 1,
    enlisted: false,
    rank: 'recruit',
    combatExperience: 0,
    kills: 0,
    timesWounded: 0,
    onDuty: false,
    followingOrders: true,
    trainingProgress: 0,
    militia: true,
  };
}

/**
 * Create a military component for an enlisted agent.
 */
export function createEnlistedComponent(
  squadId: string,
  role: CombatRole = 'melee'
): MilitaryComponent {
  return {
    type: 'military',
    version: 1,
    enlisted: true,
    squadId,
    rank: 'recruit',
    role,
    combatExperience: 0,
    kills: 0,
    timesWounded: 0,
    onDuty: false,
    followingOrders: true,
    trainingProgress: 0,
    militia: false,
  };
}

/**
 * Create a new squad.
 */
export function createSquad(
  name: string,
  leaderId: string,
  stationPoint?: { x: number; y: number }
): Squad {
  return {
    id: crypto.randomUUID(),
    name,
    leaderId,
    memberIds: [leaderId],
    maxSize: 10,
    schedule: [], // Empty schedule = always off duty
    defaultLoadout: {},
    currentActivity: 'off_duty',
    stationPoint,
    morale: 50,
    combatDeployments: 0,
    victories: 0,
    defeats: 0,
    createdAt: Date.now(),
  };
}

/**
 * Get rank promotion requirements.
 */
export function getPromotionRequirements(currentRank: MilitaryRank): { experience: number; kills: number } | null {
  const requirements: Record<MilitaryRank, { experience: number; kills: number } | null> = {
    recruit: { experience: 10, kills: 1 },
    soldier: { experience: 30, kills: 5 },
    veteran: { experience: 60, kills: 15 },
    sergeant: { experience: 80, kills: 30 },
    captain: { experience: 95, kills: 50 },
    commander: { experience: 100, kills: 100 },
    general: null, // Cannot promote further
  };
  return requirements[currentRank];
}
