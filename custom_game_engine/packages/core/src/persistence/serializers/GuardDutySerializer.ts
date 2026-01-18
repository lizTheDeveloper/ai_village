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
    if (typeof data !== 'object' || data === null) {
      throw new Error('GuardDutyComponent data must be object');
    }

    const d = data as Record<string, unknown>;

    if (typeof d.assignmentType !== 'string') {
      throw new Error('GuardDutyComponent.assignmentType must be string');
    }
    if (typeof d.alertness !== 'number') {
      throw new Error('GuardDutyComponent.alertness must be number');
    }
    if (typeof d.responseRadius !== 'number') {
      throw new Error('GuardDutyComponent.responseRadius must be number');
    }

    // Defensive deserialization: ensure required fields exist for each assignment type
    interface Vec3 { x: number; y: number; z: number; }
    type ComponentData = {
      assignmentType: string;
      targetLocation?: Vec3;
      targetPerson?: string;
      patrolRoute?: Vec3[];
      patrolIndex?: number;
      alertness: number;
      responseRadius: number;
      lastCheckTime?: number;
    };

    const componentData: ComponentData = {
      assignmentType: d.assignmentType,
      targetLocation: d.targetLocation as Vec3 | undefined,
      targetPerson: typeof d.targetPerson === 'string' ? d.targetPerson : undefined,
      patrolRoute: Array.isArray(d.patrolRoute) ? d.patrolRoute as Vec3[] : undefined,
      patrolIndex: typeof d.patrolIndex === 'number' ? d.patrolIndex : undefined,
      alertness: d.alertness,
      responseRadius: d.responseRadius,
      lastCheckTime: typeof d.lastCheckTime === 'number' ? d.lastCheckTime : undefined,
    };

    // Fix invalid state: if assignment type requires a field but it's missing, provide a default
    if (d.assignmentType === 'location' && !d.targetLocation) {
      // Default to origin if location is missing
      componentData.targetLocation = { x: 0, y: 0, z: 0 };
    }

    if (d.assignmentType === 'person' && !d.targetPerson) {
      // If target person is missing, fall back to location guard at origin
      componentData.assignmentType = 'location';
      componentData.targetLocation = { x: 0, y: 0, z: 0 };
    }

    if (d.assignmentType === 'patrol' && (!d.patrolRoute || (Array.isArray(d.patrolRoute) && d.patrolRoute.length === 0))) {
      // Default to a simple patrol route at origin if missing
      componentData.patrolRoute = [{ x: 0, y: 0, z: 0 }];
    }

    return createGuardDutyComponent(componentData);
  }

  validate(data: unknown): data is GuardDutyComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('GuardDutyComponent data must be object');
    }
    const d = data as Record<string, unknown>;
    if (typeof d.assignmentType !== 'string' || typeof d.alertness !== 'number' || typeof d.responseRadius !== 'number') {
      throw new Error('GuardDutyComponent missing required fields');
    }
    return true;
  }
}
