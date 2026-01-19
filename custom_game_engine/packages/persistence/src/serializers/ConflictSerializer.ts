/**
 * Serializer for ConflictComponent
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import type { ConflictComponent } from '@ai-village/core';
import { createConflictComponent } from '@ai-village/core';

export class ConflictSerializer extends BaseComponentSerializer<ConflictComponent> {
  constructor() {
    super('conflict', 1);
  }

  protected serializeData(component: ConflictComponent): Record<string, unknown> {
    return {
      conflictType: component.conflictType,
      target: component.target,
      state: component.state,
      startTime: component.startTime,
      huntingState: component.huntingState,
      cause: component.cause,
      surprise: component.surprise,
      modifiers: component.modifiers,
      attackerPower: component.attackerPower,
      defenderPower: component.defenderPower,
      outcome: component.outcome,
      winner: component.winner,
      combatants: component.combatants,
      trigger: component.trigger,
      metadata: component.metadata,
      method: component.method,
      targetFollower: component.targetFollower,
      consequence: component.consequence,
      lethal: component.lethal,
    };
  }

  protected deserializeData(data: unknown): ConflictComponent {
    const d = data as Record<string, unknown>;
    return createConflictComponent({
      conflictType: d.conflictType as any,
      target: d.target as string,
      state: d.state as string,
      startTime: d.startTime as number,
      huntingState: d.huntingState as any,
      cause: d.cause as string | undefined,
      surprise: d.surprise as boolean | undefined,
      modifiers: d.modifiers as any,
      attackerPower: d.attackerPower as number | undefined,
      defenderPower: d.defenderPower as number | undefined,
      outcome: d.outcome as any,
      winner: d.winner as string | undefined,
      combatants: d.combatants as string[] | undefined,
      trigger: d.trigger as any,
      metadata: d.metadata as Record<string, unknown> | undefined,
      method: d.method as any,
      targetFollower: d.targetFollower as string | undefined,
      consequence: d.consequence as any,
      lethal: d.lethal as boolean | undefined,
    });
  }

  validate(data: unknown): data is ConflictComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('ConflictComponent data must be object');
    }
    const d = data as Record<string, unknown>;
    if (!d.conflictType || !d.target || d.state === undefined || d.startTime === undefined) {
      throw new Error('ConflictComponent missing required fields');
    }
    return true;
  }
}
