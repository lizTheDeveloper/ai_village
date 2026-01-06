/**
 * Serializer for RelationshipComponent - properly reconstructs Map
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import type { RelationshipComponent, Relationship } from '@ai-village/core';
import { createRelationshipComponent } from '@ai-village/core';

interface SerializedRelationship {
  relationships: Array<[string, Relationship]>;
}

export class RelationshipSerializer extends BaseComponentSerializer<RelationshipComponent> {
  constructor() {
    super('relationship', 1);
  }

  protected serializeData(component: RelationshipComponent): SerializedRelationship {
    // Convert Map to array of entries for JSON serialization
    return {
      relationships: Array.from(component.relationships.entries()),
    };
  }

  protected deserializeData(data: unknown): RelationshipComponent {
    const serialized = data as SerializedRelationship;

    // Create new component
    const component = createRelationshipComponent();

    // Restore relationships from array back to Map
    if (serialized.relationships && Array.isArray(serialized.relationships)) {
      for (const [key, value] of serialized.relationships) {
        component.relationships.set(key, value);
      }
    }

    return component;
  }

  validate(data: unknown): data is RelationshipComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('RelationshipComponent data must be object');
    }
    return true;
  }
}
