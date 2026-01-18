/**
 * Serializer for PackCombatComponent
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import type { PackCombatComponent } from '../../components/PackCombatComponent.js';
import { createPackCombatComponent } from '../../components/PackCombatComponent.js';

export class PackCombatSerializer extends BaseComponentSerializer<PackCombatComponent> {
  constructor() {
    super('pack_combat', 1);
  }

  protected serializeData(component: PackCombatComponent): Record<string, unknown> {
    return {
      packId: component.packId,
      bodiesInPack: component.bodiesInPack,
      coherence: component.coherence,
      coordinationBonus: component.coordinationBonus,
      dissolved: component.dissolved,
    };
  }

  protected deserializeData(data: unknown): PackCombatComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('PackCombatComponent data must be object');
    }

    const d = data as Record<string, unknown>;

    if (typeof d.packId !== 'string') {
      throw new Error('PackCombatComponent.packId must be string');
    }
    if (!Array.isArray(d.bodiesInPack)) {
      throw new Error('PackCombatComponent.bodiesInPack must be array');
    }
    if (typeof d.coherence !== 'number') {
      throw new Error('PackCombatComponent.coherence must be number');
    }

    return createPackCombatComponent({
      packId: d.packId,
      bodiesInPack: d.bodiesInPack as string[],
      coherence: d.coherence,
      coordinationBonus: typeof d.coordinationBonus === 'number' ? d.coordinationBonus : undefined,
      dissolved: typeof d.dissolved === 'boolean' ? d.dissolved : undefined,
    });
  }

  validate(data: unknown): data is PackCombatComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('PackCombatComponent data must be object');
    }
    const d = data as Record<string, unknown>;
    if (typeof d.packId !== 'string' || !Array.isArray(d.bodiesInPack) || typeof d.coherence !== 'number') {
      throw new Error('PackCombatComponent missing required fields');
    }
    return true;
  }
}
