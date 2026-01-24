import type { Component } from '../ecs/Component.js';

/**
 * InjuryComponent - Represents active injuries on an agent
 *
 * Injuries have type, severity, location and apply various penalties
 */
export interface InjuryComponent extends Component {
  readonly type: 'injury';
  readonly version: 1;

  /** Type of injury */
  injuryType: 'laceration' | 'puncture' | 'blunt' | 'burn' | 'bite' | 'exhaustion' | 'psychological';

  /** Severity level */
  severity: 'minor' | 'major' | 'critical';

  /** Location on body */
  location: 'head' | 'torso' | 'arms' | 'legs' | 'hands' | 'feet';

  /** Skill penalties applied */
  skillPenalties?: Record<string, number>;

  /** Movement penalty (for leg/foot injuries) */
  movementPenalty?: number;

  /** Time until healed (ticks) */
  healingTime?: number;

  /** Time elapsed since injury (ticks) */
  elapsed?: number;

  /** Whether treatment is required */
  requiresTreatment?: boolean;

  /** Whether injury has been treated */
  treated?: boolean;

  /** Duration untreated (for tracking complications) */
  untreatedDuration?: number;

  /** Multiple injuries can be tracked */
  injuries?: Array<{
    injuryType: InjuryComponent['injuryType'];
    severity: InjuryComponent['severity'];
    location: InjuryComponent['location'];
  }>;
}

const VALID_INJURY_TYPES = ['laceration', 'puncture', 'blunt', 'burn', 'bite', 'exhaustion', 'psychological'];
const VALID_SEVERITIES = ['minor', 'major', 'critical'];
const VALID_LOCATIONS = ['head', 'torso', 'arms', 'legs', 'hands', 'feet'];

/** Input type for factory use - accepts unknown values with runtime validation */
export type InjuryInput = Record<string, unknown>;

export function createInjuryComponent(data: InjuryInput): InjuryComponent {
  const injuryType = data.injuryType as InjuryComponent['injuryType'] | undefined;
  const severity = data.severity as InjuryComponent['severity'] | undefined;
  const location = data.location as InjuryComponent['location'] | undefined;
  const skillPenalties = data.skillPenalties as Record<string, number> | undefined;
  const movementPenalty = data.movementPenalty as number | undefined;
  const healingTime = data.healingTime as number | undefined;
  const elapsed = data.elapsed as number | undefined;
  const requiresTreatment = data.requiresTreatment as boolean | undefined;
  const treated = data.treated as boolean | undefined;
  const untreatedDuration = data.untreatedDuration as number | undefined;
  const injuries = data.injuries as Array<{
    injuryType: InjuryComponent['injuryType'];
    severity: InjuryComponent['severity'];
    location: InjuryComponent['location'];
  }> | undefined;

  if (!injuryType) {
    throw new Error('Injury type is required');
  }
  if (!VALID_INJURY_TYPES.includes(injuryType)) {
    throw new Error(`Invalid injury type: ${injuryType}`);
  }
  if (!severity) {
    throw new Error('Injury severity is required');
  }
  if (!VALID_SEVERITIES.includes(severity)) {
    throw new Error(`Invalid injury severity: ${severity}`);
  }
  if (!location) {
    throw new Error('Injury location is required');
  }
  if (!VALID_LOCATIONS.includes(location)) {
    throw new Error(`Invalid injury location: ${location}`);
  }

  return {
    type: 'injury',
    version: 1,
    injuryType,
    severity,
    location,
    skillPenalties: skillPenalties || {},
    movementPenalty,
    healingTime,
    elapsed: elapsed || 0,
    requiresTreatment: requiresTreatment !== undefined ? requiresTreatment : (severity === 'major' || severity === 'critical'),
    treated: treated || false,
    untreatedDuration: untreatedDuration || 0,
    injuries,
  };
}
