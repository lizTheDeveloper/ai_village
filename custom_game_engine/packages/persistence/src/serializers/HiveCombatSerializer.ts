/**
 * Serializer for HiveCombatComponent
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import type { HiveCombatComponent } from '@ai-village/core';
import { createHiveCombatComponent } from '@ai-village/core';

export class HiveCombatSerializer extends BaseComponentSerializer<HiveCombatComponent> {
  constructor() {
    super('hive_combat', 1);
  }

  protected serializeData(component: HiveCombatComponent): Record<string, unknown> {
    return {
      hiveId: component.hiveId,
      queen: component.queen,
      workers: component.workers,
      objective: component.objective,
      queenDead: component.queenDead,
      collapseTriggered: component.collapseTriggered,
    };
  }

  protected deserializeData(data: unknown): HiveCombatComponent {
    const d = data as Record<string, unknown>;
    return createHiveCombatComponent({
      hiveId: d.hiveId as string,
      queen: d.queen as string,
      workers: d.workers as string[],
      objective: d.objective as string | undefined,
      queenDead: d.queenDead as boolean | undefined,
      collapseTriggered: d.collapseTriggered as boolean | undefined,
    });
  }

  validate(data: unknown): data is HiveCombatComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('HiveCombatComponent data must be object');
    }
    const d = data as Record<string, unknown>;
    if (!d.hiveId || !d.queen || !d.workers) {
      throw new Error('HiveCombatComponent missing required fields');
    }
    return true;
  }
}
