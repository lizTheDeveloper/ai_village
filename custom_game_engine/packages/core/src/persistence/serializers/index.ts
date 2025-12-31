/**
 * Component serializer registration - registers all serializers on import
 */

import { componentSerializerRegistry } from '../ComponentSerializerRegistry.js';
import { PositionSerializer } from './PositionSerializer.js';
import { TrustNetworkSerializer } from './TrustNetworkSerializer.js';
import { createGenericSerializer } from './GenericSerializer.js';
import { ConflictSerializer } from './ConflictSerializer.js';
import { InjurySerializer } from './InjurySerializer.js';
import { GuardDutySerializer } from './GuardDutySerializer.js';
import { CombatStatsSerializer } from './CombatStatsSerializer.js';
import { DominanceRankSerializer } from './DominanceRankSerializer.js';
import { PackCombatSerializer } from './PackCombatSerializer.js';
import { HiveCombatSerializer } from './HiveCombatSerializer.js';
import { ManchiSerializer } from './ManchiSerializer.js';

/**
 * Register all component serializers.
 * Called automatically when this module is imported.
 */
export function registerAllSerializers(): void {
  // Register specific serializers
  componentSerializerRegistry.register('position', new PositionSerializer());
  componentSerializerRegistry.register('trust_network', new TrustNetworkSerializer());

  // Register conflict component serializers
  componentSerializerRegistry.register('conflict', new ConflictSerializer());
  componentSerializerRegistry.register('injury', new InjurySerializer());
  componentSerializerRegistry.register('guard_duty', new GuardDutySerializer());
  componentSerializerRegistry.register('combat_stats', new CombatStatsSerializer());
  componentSerializerRegistry.register('dominance_rank', new DominanceRankSerializer());
  componentSerializerRegistry.register('pack_combat', new PackCombatSerializer());
  componentSerializerRegistry.register('hive_combat', new HiveCombatSerializer());
  componentSerializerRegistry.register('manchi', new ManchiSerializer());

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
    `[Persistence] Registered ${genericComponents.length + 10} component serializers`
  );
}

// Auto-register on import
registerAllSerializers();

// Re-export for convenience
export { componentSerializerRegistry } from '../ComponentSerializerRegistry.js';
export { PositionSerializer } from './PositionSerializer.js';
export { GenericComponentSerializer, createGenericSerializer } from './GenericSerializer.js';
