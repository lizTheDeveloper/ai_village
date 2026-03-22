/**
 * Serializer for PlantKnowledgeComponent — handles private Map/Set fields
 * via the component's own toJSON/fromJSON methods.
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import { PlantKnowledgeComponent, type PlantKnowledgeData } from '../../components/PlantKnowledgeComponent.js';

export class PlantKnowledgeSerializer extends BaseComponentSerializer<PlantKnowledgeComponent> {
  constructor() {
    super('plant_knowledge', 1);
  }

  protected serializeData(component: PlantKnowledgeComponent): PlantKnowledgeData {
    return component.toJSON();
  }

  protected deserializeData(data: unknown): PlantKnowledgeComponent {
    return PlantKnowledgeComponent.fromJSON(data as PlantKnowledgeData);
  }

  validate(data: unknown): data is PlantKnowledgeComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('PlantKnowledgeComponent data must be object');
    }
    return true;
  }
}
