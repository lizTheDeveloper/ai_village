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
    const d = data as any;
    return createConflictComponent({
      conflictType: d.conflictType,
      target: d.target,
      state: d.state,
      startTime: d.startTime,
      huntingState: d.huntingState,
      cause: d.cause,
      surprise: d.surprise,
      modifiers: d.modifiers,
      attackerPower: d.attackerPower,
      defenderPower: d.defenderPower,
      outcome: d.outcome,
      winner: d.winner,
      combatants: d.combatants,
      trigger: d.trigger,
      metadata: d.metadata,
      method: d.method,
      targetFollower: d.targetFollower,
      consequence: d.consequence,
      lethal: d.lethal,
    });
  }

  validate(data: unknown): data is ConflictComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('ConflictComponent data must be object');
    }
    const d = data as any;
    if (!d.conflictType || !d.target || d.state === undefined || d.startTime === undefined) {
      throw new Error('ConflictComponent missing required fields');
    }
    return true;
  }
}
