/**
 * Serializer for GuardDutyComponent
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import type { GuardDutyComponent } from '@ai-village/core';
import { createGuardDutyComponent } from '@ai-village/core';

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
    const d = data as Record<string, unknown>;

    // Defensive deserialization: ensure required fields exist for each assignment type
    interface ComponentData {
      assignmentType: string;
      targetLocation?: { x: number; y: number; z: number };
      targetPerson?: string;
      patrolRoute?: Array<{ x: number; y: number; z: number }>;
      patrolIndex?: number;
      alertness: number;
      responseRadius: number;
      lastCheckTime?: number;
    }

    const componentData: ComponentData = {
      assignmentType: d.assignmentType as string,
      targetLocation: d.targetLocation as { x: number; y: number; z: number } | undefined,
      targetPerson: d.targetPerson as string | undefined,
      patrolRoute: d.patrolRoute as Array<{ x: number; y: number; z: number }> | undefined,
      patrolIndex: d.patrolIndex as number | undefined,
      alertness: d.alertness as number,
      responseRadius: d.responseRadius as number,
      lastCheckTime: d.lastCheckTime as number | undefined,
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

    if (d.assignmentType === 'patrol' && (!d.patrolRoute || (d.patrolRoute as unknown[]).length === 0)) {
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
    if (!d.assignmentType || d.alertness === undefined || d.responseRadius === undefined) {
      throw new Error('GuardDutyComponent missing required fields');
    }
    return true;
  }
}
