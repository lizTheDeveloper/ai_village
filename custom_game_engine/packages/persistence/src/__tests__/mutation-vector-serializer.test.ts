/**
 * Test to verify mutation_vector serializer is registered and works correctly
 */

import { describe, it, expect } from 'vitest';
import { componentSerializerRegistry } from '../ComponentSerializerRegistry.js';
import '../serializers/index.js'; // Auto-registers all serializers

describe('MutationVector Serializer', () => {
  it('should be registered in the component serializer registry', () => {
    expect(componentSerializerRegistry.has('mutation_vector')).toBe(true);
  });

  it('should serialize and deserialize mutation_vector component correctly', () => {
    const testComponent = {
      type: 'mutation_vector' as const,
      version: 1,
      fields: {
        'needs.hunger': {
          rate: -0.0008,
          derivative: 0,
          min: 0,
          max: 1,
          source: 'needs_system'
        },
        'body.health': {
          rate: 0.5,
          derivative: -0.1,
          min: 0,
          max: 100,
          source: 'regen',
          totalAmount: 20,
          appliedAmount: 0
        }
      }
    };

    // Serialize
    const serialized = componentSerializerRegistry.serialize(testComponent);

    expect(serialized).toBeDefined();
    expect(serialized.type).toBe('mutation_vector');
    expect(serialized.$version).toBe(1);
    expect(serialized.$schema).toBe('https://aivillage.dev/schemas/component/v1');

    // Deserialize
    const deserialized = componentSerializerRegistry.deserialize<typeof testComponent>(serialized);

    expect(deserialized).toBeDefined();
    expect(deserialized.type).toBe('mutation_vector');
    expect(deserialized.fields).toBeDefined();
    expect(deserialized.fields['needs.hunger']).toEqual(testComponent.fields['needs.hunger']);
    expect(deserialized.fields['body.health']).toEqual(testComponent.fields['body.health']);
  });

  it('should handle empty fields object', () => {
    const emptyComponent = {
      type: 'mutation_vector' as const,
      version: 1,
      fields: {}
    };

    const serialized = componentSerializerRegistry.serialize(emptyComponent);
    const deserialized = componentSerializerRegistry.deserialize<typeof emptyComponent>(serialized);

    expect(deserialized.fields).toEqual({});
  });
});
