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

export function createInjuryComponent(data: {
  injuryType: InjuryComponent['injuryType'];
  severity: InjuryComponent['severity'];
  location: InjuryComponent['location'];
  skillPenalties?: Record<string, number>;
  movementPenalty?: number;
  healingTime?: number;
  elapsed?: number;
  requiresTreatment?: boolean;
  treated?: boolean;
  untreatedDuration?: number;
  injuries?: Array<{
    injuryType: InjuryComponent['injuryType'];
    severity: InjuryComponent['severity'];
    location: InjuryComponent['location'];
  }>;
}): InjuryComponent {
  if (!data.injuryType) {
    throw new Error('Injury type is required');
  }
  if (!VALID_INJURY_TYPES.includes(data.injuryType)) {
    throw new Error(`Invalid injury type: ${data.injuryType}`);
  }
  if (!data.severity) {
    throw new Error('Injury severity is required');
  }
  if (!VALID_SEVERITIES.includes(data.severity)) {
    throw new Error(`Invalid injury severity: ${data.severity}`);
  }
  if (!data.location) {
    throw new Error('Injury location is required');
  }
  if (!VALID_LOCATIONS.includes(data.location)) {
    throw new Error(`Invalid injury location: ${data.location}`);
  }

  return {
    type: 'injury',
    version: 1,
    injuryType: data.injuryType,
    severity: data.severity,
    location: data.location,
    skillPenalties: data.skillPenalties || {},
    movementPenalty: data.movementPenalty,
    healingTime: data.healingTime,
    elapsed: data.elapsed || 0,
    requiresTreatment: data.requiresTreatment !== undefined ? data.requiresTreatment : (data.severity === 'major' || data.severity === 'critical'),
    treated: data.treated || false,
    untreatedDuration: data.untreatedDuration || 0,
    injuries: data.injuries,
  };
}
