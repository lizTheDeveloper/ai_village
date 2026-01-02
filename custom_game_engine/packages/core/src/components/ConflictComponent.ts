import type { Component } from '../ecs/Component.js';
import type { EntityId } from '../types.js';

/**
 * ConflictComponent - Represents an active conflict
 *
 * Used for all conflict types: hunting, predator attacks, agent combat, dominance challenges
 */
export interface ConflictComponent extends Component {
  readonly type: 'conflict';
  readonly version: 1;

  /** Type of conflict */
  conflictType: 'hunting' | 'predator_attack' | 'agent_combat' | 'dominance_challenge';

  /** Target of the conflict */
  target: EntityId;

  /** Current state of the conflict */
  state: string;

  /** When the conflict started (tick) */
  startTime: number;

  /** When the conflict should end (tick) - used for time-based combat progression */
  endTime?: number;

  /** Hunting specific fields */
  huntingState?: 'tracking' | 'stalking' | 'kill_success' | 'failed' | 'lost' | 'escape';

  /** Combat specific fields */
  cause?: string;
  surprise?: boolean;
  modifiers?: Array<{ type: string; value: number }>;
  attackerPower?: number;
  defenderPower?: number;
  outcome?: 'attacker_victory' | 'defender_victory' | 'mutual_injury' | 'stalemate' | 'death';
  winner?: EntityId;
  combatants?: EntityId[];

  /** Predator attack specific fields */
  trigger?: 'hunger' | 'territory' | 'provocation';

  /** Additional metadata for conflict context */
  metadata?: Record<string, any>;

  /** Dominance challenge specific fields */
  method?: 'combat' | 'display' | 'resource_seizure' | 'follower_theft';
  targetFollower?: EntityId;
  consequence?: 'rank_swap' | 'demotion' | 'exile' | 'death';
  lethal?: boolean;
}

export function createConflictComponent(data: {
  conflictType: ConflictComponent['conflictType'];
  target: EntityId;
  state: string;
  startTime: number;
  endTime?: number;
  huntingState?: ConflictComponent['huntingState'];
  cause?: string;
  surprise?: boolean;
  modifiers?: Array<{ type: string; value: number }>;
  attackerPower?: number;
  defenderPower?: number;
  outcome?: ConflictComponent['outcome'];
  winner?: EntityId;
  combatants?: EntityId[];
  trigger?: ConflictComponent['trigger'];
  metadata?: Record<string, any>;
  method?: ConflictComponent['method'];
  targetFollower?: EntityId;
  consequence?: ConflictComponent['consequence'];
  lethal?: boolean;
}): ConflictComponent {
  if (!data.conflictType) {
    throw new Error('Conflict type is required');
  }
  if (!data.target) {
    throw new Error('Conflict target is required');
  }
  if (data.state === undefined) {
    throw new Error('Conflict state is required');
  }
  if (data.startTime === undefined) {
    throw new Error('Conflict start time is required');
  }

  return {
    type: 'conflict',
    version: 1,
    conflictType: data.conflictType,
    target: data.target,
    state: data.state,
    startTime: data.startTime,
    endTime: data.endTime,
    huntingState: data.huntingState,
    cause: data.cause,
    surprise: data.surprise,
    modifiers: data.modifiers,
    attackerPower: data.attackerPower,
    defenderPower: data.defenderPower,
    outcome: data.outcome,
    winner: data.winner,
    combatants: data.combatants,
    trigger: data.trigger,
    metadata: data.metadata,
    method: data.method,
    targetFollower: data.targetFollower,
    consequence: data.consequence,
    lethal: data.lethal,
  };
}
