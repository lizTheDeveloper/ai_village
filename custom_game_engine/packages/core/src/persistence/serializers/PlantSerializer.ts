/**
 * Serializer for PlantComponent - properly reconstructs class instance with private fields
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import { PlantComponent, type PlantComponentData } from '../../components/PlantComponent.js';

export class PlantSerializer extends BaseComponentSerializer<PlantComponent> {
  constructor() {
    super('plant', 1);
  }

  protected serializeData(component: PlantComponent): PlantComponentData {
    // Use the component's toJSON method which properly extracts all data
    return component.toJSON();
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
