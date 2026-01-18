/**
 * Serializer for ConflictComponent
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import type { ConflictComponent } from '../../components/ConflictComponent.js';
import { createConflictComponent } from '../../components/ConflictComponent.js';

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
    if (typeof data !== 'object' || data === null) {
      throw new Error('ConflictComponent data must be object');
    }

    const d = data as Record<string, unknown>;

    if (typeof d.conflictType !== 'string') {
      throw new Error('ConflictComponent.conflictType must be string');
    }
    if (typeof d.target !== 'string') {
      throw new Error('ConflictComponent.target must be string');
    }
    if (typeof d.state !== 'string') {
      throw new Error('ConflictComponent.state must be string');
    }
    if (typeof d.startTime !== 'number') {
      throw new Error('ConflictComponent.startTime must be number');
    }

    return createConflictComponent({
      conflictType: d.conflictType as ConflictComponent['conflictType'],
      target: d.target,
      state: d.state,
      startTime: d.startTime,
      huntingState: typeof d.huntingState === 'string' ? d.huntingState as ConflictComponent['huntingState'] : undefined,
      cause: typeof d.cause === 'string' ? d.cause : undefined,
      surprise: typeof d.surprise === 'boolean' ? d.surprise : undefined,
      modifiers: Array.isArray(d.modifiers) ? d.modifiers as Array<{ type: string; value: number }> : undefined,
      attackerPower: typeof d.attackerPower === 'number' ? d.attackerPower : undefined,
      defenderPower: typeof d.defenderPower === 'number' ? d.defenderPower : undefined,
      outcome: typeof d.outcome === 'string' ? d.outcome as ConflictComponent['outcome'] : undefined,
      winner: typeof d.winner === 'string' ? d.winner : undefined,
      combatants: Array.isArray(d.combatants) ? d.combatants as string[] : undefined,
      trigger: typeof d.trigger === 'string' ? d.trigger as ConflictComponent['trigger'] : undefined,
      metadata: d.metadata as Record<string, unknown> | undefined,
      method: typeof d.method === 'string' ? d.method as ConflictComponent['method'] : undefined,
      targetFollower: typeof d.targetFollower === 'string' ? d.targetFollower : undefined,
      consequence: typeof d.consequence === 'string' ? d.consequence as ConflictComponent['consequence'] : undefined,
      lethal: typeof d.lethal === 'boolean' ? d.lethal : undefined,
    });
  }

  validate(data: unknown): data is ConflictComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('ConflictComponent data must be object');
    }
    const d = data as Record<string, unknown>;
    if (typeof d.conflictType !== 'string' || typeof d.target !== 'string' ||
        typeof d.state !== 'string' || typeof d.startTime !== 'number') {
      throw new Error('ConflictComponent missing required fields');
    }
    return true;
  }
}
