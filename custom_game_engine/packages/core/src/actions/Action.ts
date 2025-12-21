import type { ActionType, EntityId, Position, Tick } from '../types.js';
import type { GameEvent } from '../events/GameEvent.js';

export type ActionStatus =
  | 'pending'
  | 'validated'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Actions represent agent intent. The world validates and applies them.
 */
export interface Action {
  /** Unique identifier for this action instance */
  readonly id: string;

  /** Type of action */
  readonly type: ActionType;

  /** Entity performing the action */
  readonly actorId: EntityId;

  /** Target entity (if applicable) */
  readonly targetId?: EntityId;

  /** Target position (if applicable) */
  readonly targetPosition?: Position;

  /** Action-specific parameters */
  readonly parameters: Readonly<Record<string, unknown>>;

  /** Priority for conflict resolution */
  readonly priority: number;

  /** When action was submitted */
  readonly createdAt: Tick;

  // Mutable fields (filled during execution)
  status: ActionStatus;
  startedAt?: Tick;
  completedAt?: Tick;
  result?: ActionResult;
}

export interface ActionResult {
  readonly success: boolean;
  readonly reason?: string;
  readonly effects: ReadonlyArray<ActionEffect>;
  readonly events: ReadonlyArray<Omit<GameEvent, 'tick' | 'timestamp'>>;
}

export interface ActionEffect {
  readonly type: ActionEffectType;
  readonly target: EntityId;
  readonly data: unknown;
}

export type ActionEffectType =
  | 'component:set'
  | 'component:update'
  | 'component:remove'
  | 'entity:create'
  | 'entity:destroy';

export interface ValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
  readonly suggestions?: ReadonlyArray<ActionType>;
}
