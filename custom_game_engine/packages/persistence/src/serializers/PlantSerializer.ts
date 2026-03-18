/**
 * Serializer for PlantComponent - properly reconstructs class instance with private fields
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import { PlantComponent, type PlantComponentData } from '@ai-village/core';

export class PlantSerializer extends BaseComponentSerializer<PlantComponent> {
  constructor() {
    super('plant', 1);
  }

  protected serializeData(component: PlantComponent): PlantComponentData {
    // Handle both class instances with toJSON() and plain objects
    if (typeof component.toJSON === 'function') {
      return component.toJSON();
    }

    // Fallback for plain objects (legacy data from old saves)
    return component as unknown as PlantComponentData;
  }

  protected deserializeData(data: unknown): PlantComponent {
    const serialized = data as PlantComponentData;

    // Create new component using constructor - this properly initializes all private fields
    return new PlantComponent(serialized);
  }

  validate(data: unknown): data is PlantComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('PlantComponent data must be object');
    }
    const d = data as Record<string, unknown>;
    if (!d.speciesId) {
      throw new Error('PlantComponent requires speciesId');
    }
    if (!d.position) {
      throw new Error('PlantComponent requires position');
    }
    return true;
  }
}
