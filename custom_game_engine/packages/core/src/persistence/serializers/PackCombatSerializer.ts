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
    const d = data as any;
    return createPackCombatComponent({
      packId: d.packId,
      bodiesInPack: d.bodiesInPack,
      coherence: d.coherence,
      coordinationBonus: d.coordinationBonus,
      dissolved: d.dissolved,
    });
  }

  validate(data: unknown): data is PackCombatComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('PackCombatComponent data must be object');
    }
    const d = data as any;
    if (!d.packId || !d.bodiesInPack || d.coherence === undefined) {
      throw new Error('PackCombatComponent missing required fields');
    }
    return true;
  }
}
