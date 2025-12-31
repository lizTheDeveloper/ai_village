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

export function createGuardDutyComponent(data: {
  assignmentType: GuardDutyComponent['assignmentType'];
  alertness: number;
  responseRadius: number;
  [key: string]: any;
}): GuardDutyComponent {
  if (!data.assignmentType) {
    throw new Error('Guard assignment type is required');
  }

  if (data.assignmentType === 'location' && !data.targetLocation) {
    throw new Error('Location guard assignment requires targetLocation');
  }

  if (data.assignmentType === 'person' && !data.targetPerson) {
    throw new Error('Person guard assignment requires targetPerson');
  }

  if (data.assignmentType === 'patrol' && !data.patrolRoute) {
    throw new Error('Patrol assignment requires patrolRoute');
  }

  if (data.alertness === undefined) {
    throw new Error('Alertness is required');
  }

  if (data.responseRadius === undefined) {
    throw new Error('Response radius is required');
  }

  return {
    type: 'guard_duty',
    version: 1,
    assignmentType: data.assignmentType,
    targetLocation: data.targetLocation,
    targetPerson: data.targetPerson,
    patrolRoute: data.patrolRoute,
    patrolIndex: data.patrolIndex || 0,
    alertness: data.alertness,
    responseRadius: data.responseRadius,
    lastCheckTime: data.lastCheckTime || 0,
  };
}
