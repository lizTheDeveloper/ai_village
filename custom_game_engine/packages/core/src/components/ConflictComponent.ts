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

/** Input type for factory use - accepts unknown values with runtime validation */
export type ConflictInput = Record<string, unknown>;

export function createConflictComponent(data: ConflictInput): ConflictComponent {
  const conflictType = data.conflictType as ConflictComponent['conflictType'] | undefined;
  const target = data.target as EntityId | undefined;
  const state = data.state as string | undefined;
  const startTime = data.startTime as number | undefined;
  const endTime = data.endTime as number | undefined;
  const huntingState = data.huntingState as ConflictComponent['huntingState'] | undefined;
  const cause = data.cause as string | undefined;
  const surprise = data.surprise as boolean | undefined;
  const modifiers = data.modifiers as Array<{ type: string; value: number }> | undefined;
  const attackerPower = data.attackerPower as number | undefined;
  const defenderPower = data.defenderPower as number | undefined;
  const outcome = data.outcome as ConflictComponent['outcome'] | undefined;
  const winner = data.winner as EntityId | undefined;
  const combatants = data.combatants as EntityId[] | undefined;
  const trigger = data.trigger as ConflictComponent['trigger'] | undefined;
  const metadata = data.metadata as Record<string, unknown> | undefined;
  const method = data.method as ConflictComponent['method'] | undefined;
  const targetFollower = data.targetFollower as EntityId | undefined;
  const consequence = data.consequence as ConflictComponent['consequence'] | undefined;
  const lethal = data.lethal as boolean | undefined;

  if (!conflictType) {
    throw new Error('Conflict type is required');
  }
  if (!target) {
    throw new Error('Conflict target is required');
  }
  if (state === undefined) {
    throw new Error('Conflict state is required');
  }
  if (startTime === undefined) {
    throw new Error('Conflict start time is required');
  }

  return {
    type: 'conflict',
    version: 1,
    conflictType,
    target,
    state,
    startTime,
    endTime,
    huntingState,
    cause,
    surprise,
    modifiers,
    attackerPower,
    defenderPower,
    outcome,
    winner,
    combatants,
    trigger,
    metadata,
    method,
    targetFollower,
    consequence,
    lethal,
  };
}
