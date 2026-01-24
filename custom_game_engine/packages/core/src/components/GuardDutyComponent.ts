import type { Component } from '../ecs/Component.js';
import type { EntityId } from '../types.js';

/**
 * GuardDutyComponent - Guard assignment and state
 *
 * Manages guard duty for security and threat detection
 */
export interface GuardDutyComponent extends Component {
  readonly type: 'guard_duty';
  readonly version: 1;

  /** Type of guard assignment */
  assignmentType: 'location' | 'person' | 'patrol';

  /** Target location to guard (for location assignment) */
  targetLocation?: { x: number; y: number; z: number };

  /** Target person to guard (for person assignment) */
  targetPerson?: EntityId;

  /** Patrol route (for patrol assignment) */
  patrolRoute?: Array<{ x: number; y: number; z: number }>;

  /** Current patrol waypoint index */
  patrolIndex?: number;

  /** Alertness level (0-1, decays over time) */
  alertness: number;

  /** Response radius for threat detection */
  responseRadius: number;

  /** Last threat check time */
  lastCheckTime?: number;
}

/** Input type for factory use - accepts unknown values with runtime validation */
export type GuardDutyInput = Record<string, unknown>;

export function createGuardDutyComponent(data: GuardDutyInput): GuardDutyComponent {
  const assignmentType = data.assignmentType as GuardDutyComponent['assignmentType'] | undefined;
  const targetLocation = data.targetLocation as { x: number; y: number; z: number } | undefined;
  const targetPerson = data.targetPerson as EntityId | undefined;
  const patrolRoute = data.patrolRoute as Array<{ x: number; y: number; z: number }> | undefined;
  const patrolIndex = data.patrolIndex as number | undefined;
  const alertness = data.alertness as number | undefined;
  const responseRadius = data.responseRadius as number | undefined;
  const lastCheckTime = data.lastCheckTime as number | undefined;

  if (!assignmentType) {
    throw new Error('Guard assignment type is required');
  }

  if (assignmentType === 'location' && !targetLocation) {
    throw new Error('Location guard assignment requires targetLocation');
  }

  if (assignmentType === 'person' && !targetPerson) {
    throw new Error('Person guard assignment requires targetPerson');
  }

  if (assignmentType === 'patrol' && !patrolRoute) {
    throw new Error('Patrol assignment requires patrolRoute');
  }

  if (alertness === undefined) {
    throw new Error('Alertness is required');
  }

  if (responseRadius === undefined) {
    throw new Error('Response radius is required');
  }

  return {
    type: 'guard_duty',
    version: 1,
    assignmentType,
    targetLocation,
    targetPerson,
    patrolRoute,
    patrolIndex: patrolIndex || 0,
    alertness,
    responseRadius,
    lastCheckTime: lastCheckTime || 0,
  };
}
