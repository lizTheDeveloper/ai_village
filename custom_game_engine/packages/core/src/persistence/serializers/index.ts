/**
 * Component serializer registration - registers all serializers on import
 */

import { componentSerializerRegistry } from '../ComponentSerializerRegistry.js';
import { PositionSerializer } from './PositionSerializer.js';
import { createGenericSerializer } from './GenericSerializer.js';

/**
 * Register all component serializers.
 * Called automatically when this module is imported.
 */
export function registerAllSerializers(): void {
  // Register specific serializers
  componentSerializerRegistry.register('position', new PositionSerializer());

  // Register generic serializers for all other components
  // These can be replaced with specific serializers later
  const genericComponents = [
    'agent',
    'inventory',
    'needs',
    'physical_needs',
    'social_needs',
    'skills',
    'personality',
    'mood',
    'memory',
    'spatial_memory',
    'building',
    'plant',
    'animal',
    'resource',
    'weather',
    'time',
    'soil',
    'seed',
    'steering',
    'velocity',
    'vision',
    'circadian',
    'preference',
    'health',
    'belief',
    'body',
    'conversation',
    'cooking_skill',
    'crafting_station',
    'deity',
    'divine_power',
    'avatar',
    'angel',
    'blessed',
    'cursed',
    'research_state',
    'census_bureau',
    'passage',
  ];

  for (const componentType of genericComponents) {
    componentSerializerRegistry.register(
      componentType,
      createGenericSerializer(componentType, 1)
    );
  }

  console.log(
    `[Persistence] Registered ${genericComponents.length + 1} component serializers`
  );
}

// Auto-register on import
registerAllSerializers();

// Re-export for convenience
export { componentSerializerRegistry } from '../ComponentSerializerRegistry.js';
export { PositionSerializer } from './PositionSerializer.js';
export { GenericComponentSerializer, createGenericSerializer } from './GenericSerializer.js';
