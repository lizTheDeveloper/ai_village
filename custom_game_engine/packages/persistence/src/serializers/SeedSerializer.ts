/**
 * Serializer for SeedComponent - properly reconstructs class instance with genetics and metadata
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import { SeedComponent, type SeedComponentData } from '@ai-village/core';

export class SeedSerializer extends BaseComponentSerializer<SeedComponent> {
  constructor() {
    super('seed', 1);
  }

  protected serializeData(component: SeedComponent): SeedComponentData {
    if (typeof component.toJSON === 'function') {
      return component.toJSON();
    }
    return component as unknown as SeedComponentData;
  }

  protected deserializeData(data: unknown): SeedComponent {
    return new SeedComponent(data as SeedComponentData);
  }

  validate(data: unknown): data is SeedComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('SeedComponent data must be object');
    }
    const d = data as Record<string, unknown>;
    if (!d.speciesId) {
      throw new Error('SeedComponent requires speciesId');
    }
    if (!d.genetics) {
      throw new Error('SeedComponent requires genetics');
    }
    return true;
  }
}
