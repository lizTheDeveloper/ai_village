/**
 * Serializer for ManaPoolsComponent
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import type { ManaPoolsComponent, ManaPool, ResourcePool } from '@ai-village/core';
import { createManaPoolsComponent } from '@ai-village/core';

export class ManaPoolsSerializer extends BaseComponentSerializer<ManaPoolsComponent> {
  constructor() {
    super('mana_pools', 1);
  }

  protected serializeData(component: ManaPoolsComponent): Record<string, unknown> {
    return {
      manaPools: component.manaPools,
      resourcePools: component.resourcePools,
      primarySource: component.primarySource,
    };
  }

  protected deserializeData(data: unknown): ManaPoolsComponent {
    const d = data as Record<string, unknown>;
    const comp = createManaPoolsComponent();
    comp.manaPools = (d.manaPools as ManaPool[]) || [];
    comp.resourcePools = (d.resourcePools as Partial<Record<string, ResourcePool>>) || {};
    comp.primarySource = d.primarySource as ManaPoolsComponent['primarySource'];
    return comp;
  }

  validate(data: unknown): data is ManaPoolsComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('ManaPoolsComponent data must be object');
    }
    const d = data as Record<string, unknown>;
    if (!Array.isArray(d.manaPools)) {
      throw new Error('ManaPoolsComponent missing required manaPools array');
    }
    if (typeof d.resourcePools !== 'object') {
      throw new Error('ManaPoolsComponent missing required resourcePools object');
    }
    return true;
  }
}
