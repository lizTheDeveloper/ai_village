/**
 * Serializer for GuardDutyComponent
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import type { GuardDutyComponent } from '../../components/GuardDutyComponent.js';
import { createGuardDutyComponent } from '../../components/GuardDutyComponent.js';

export class GuardDutySerializer extends BaseComponentSerializer<GuardDutyComponent> {
  constructor() {
    super('guard_duty', 1);
  }

  protected serializeData(component: GuardDutyComponent): Record<string, unknown> {
    return {
      assignmentType: component.assignmentType,
      targetLocation: component.targetLocation,
      targetPerson: component.targetPerson,
      patrolRoute: component.patrolRoute,
      patrolIndex: component.patrolIndex,
      alertness: component.alertness,
      responseRadius: component.responseRadius,
      lastCheckTime: component.lastCheckTime,
    };
  }

  protected deserializeData(data: unknown): GuardDutyComponent {
    const d = data as any;
    return createGuardDutyComponent({
      assignmentType: d.assignmentType,
      targetLocation: d.targetLocation,
      targetPerson: d.targetPerson,
      patrolRoute: d.patrolRoute,
      patrolIndex: d.patrolIndex,
      alertness: d.alertness,
      responseRadius: d.responseRadius,
      lastCheckTime: d.lastCheckTime,
    });
  }

  validate(data: unknown): data is GuardDutyComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('GuardDutyComponent data must be object');
    }
    const d = data as any;
    if (!d.assignmentType || d.alertness === undefined || d.responseRadius === undefined) {
      throw new Error('GuardDutyComponent missing required fields');
    }
    return true;
  }
}
