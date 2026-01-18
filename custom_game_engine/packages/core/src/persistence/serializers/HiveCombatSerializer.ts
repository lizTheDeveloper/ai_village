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
    if (typeof data !== 'object' || data === null) {
      throw new Error('HiveCombatComponent data must be object');
    }

    const d = data as Record<string, unknown>;

    if (typeof d.hiveId !== 'string') {
      throw new Error('HiveCombatComponent.hiveId must be string');
    }
    if (typeof d.queen !== 'string') {
      throw new Error('HiveCombatComponent.queen must be string');
    }
    if (!Array.isArray(d.workers)) {
      throw new Error('HiveCombatComponent.workers must be array');
    }

    return createHiveCombatComponent({
      hiveId: d.hiveId,
      queen: d.queen,
      workers: d.workers as string[],
      objective: typeof d.objective === 'string' ? d.objective : undefined,
      queenDead: typeof d.queenDead === 'boolean' ? d.queenDead : undefined,
      collapseTriggered: typeof d.collapseTriggered === 'boolean' ? d.collapseTriggered : undefined,
    });
  }

  validate(data: unknown): data is HiveCombatComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('HiveCombatComponent data must be object');
    }
    const d = data as Record<string, unknown>;
    if (typeof d.hiveId !== 'string' || typeof d.queen !== 'string' || !Array.isArray(d.workers)) {
      throw new Error('HiveCombatComponent missing required fields');
    }
    return true;
  }
}
