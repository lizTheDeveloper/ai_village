/**
 * Serializer for HiveCombatComponent
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import type { HiveCombatComponent } from '../../components/HiveCombatComponent.js';
import { createHiveCombatComponent } from '../../components/HiveCombatComponent.js';

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
    const d = data as any;
    return createHiveCombatComponent({
      hiveId: d.hiveId,
      queen: d.queen,
      workers: d.workers,
      objective: d.objective,
      queenDead: d.queenDead,
      collapseTriggered: d.collapseTriggered,
    });
  }

  validate(data: unknown): data is HiveCombatComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('HiveCombatComponent data must be object');
    }
    const d = data as any;
    if (!d.hiveId || !d.queen || !d.workers) {
      throw new Error('HiveCombatComponent missing required fields');
    }
    return true;
  }
}
