/**
 * Component serializer registration - registers all serializers on import
 */

import { componentSerializerRegistry } from '../ComponentSerializerRegistry.js';
import { migrationRegistry } from '../MigrationRegistry.js';
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
import { EquipmentSerializer } from './EquipmentSerializer.js';

// Memory and state serializers
import { EpisodicMemorySerializer } from './EpisodicMemorySerializer.js';
import { RelationshipSerializer } from './RelationshipSerializer.js';
import { SocialGradientSerializer } from './SocialGradientSerializer.js';
import { PlantSerializer } from './PlantSerializer.js';
import { ExplorationStateSerializer } from './ExplorationStateSerializer.js';
import { SpatialMemorySerializer } from './SpatialMemorySerializer.js';
import { JournalSerializer } from './JournalSerializer.js';
import { CourtshipSerializer } from './CourtshipSerializer.js';

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
  componentSerializerRegistry.register('equipment', new EquipmentSerializer());

  // Register memory and state serializers (these handle Maps and private fields properly)
  componentSerializerRegistry.register('episodic_memory', new EpisodicMemorySerializer());
  componentSerializerRegistry.register('relationship', new RelationshipSerializer());
  componentSerializerRegistry.register('social_gradient', new SocialGradientSerializer());
  componentSerializerRegistry.register('plant', new PlantSerializer());
  componentSerializerRegistry.register('exploration_state', new ExplorationStateSerializer());
  componentSerializerRegistry.register('spatial_memory', new SpatialMemorySerializer());
  componentSerializerRegistry.register('journal', new JournalSerializer());
  componentSerializerRegistry.register('courtship', new CourtshipSerializer());

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
    // 'spatial_memory' - now has specific serializer (handles Maps properly)
    'building',
    // 'plant' - now has specific serializer (uses toJSON method)
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
    'physics',
    // 'renderable' - registered separately with version 2 below
    'animation',
    'tags',
    'movement',
    // Additional components from ComponentType enum
    'item',
    'voxel_resource',
    'equipment_slots',
    'temperature',
    'semantic_memory',
    'social_memory',
    'hearsay_memory',
    'goals',
    'reflection',
    'action_queue',
    'identity',
    'meeting',
    'interests',
    'building_harmony',
    'town_hall',
    'health_clinic',
    'weather_station',
    'shop',
    'warehouse',
    'power',
    'species',
    'genetic',
    'magic',
    'mana',
    'named_landmarks',
    'spiritual',
    'spirit',
    'mythology',
    'divine_chat',
    'chat_room',
    'companion',
    'threat_detection',
    'sexuality',
    'parenting',
    'jealousy',
    'pregnancy',
    'labor',
    'death_judgment',
    'death_bargain',
    'afterlife_memory',
    'soul_wisdom',
    'soul_identity',
    'incarnation',
    'soul_link',
    'soul_creation_event',
    'realm_location',
    'appearance',
    'gathering_stats',
    'recipe_discovery',
    'proto_reality',
    'corrupted_universe',
    'vr_system',
    'lore_frag',
    'afterlife',
    'realm',
    'llm_history', // LLM interaction history for debugging UI
    'mutation_vector', // Entity-local mutation rates for StateMutatorSystem
  ];

  for (const componentType of genericComponents) {
    componentSerializerRegistry.register(
      componentType,
      createGenericSerializer(componentType, 1)
    );
  }

  // Register renderable with version 2 (adds sizeMultiplier and alpha fields)
  componentSerializerRegistry.register(
    'renderable',
    createGenericSerializer('renderable', 2)
  );

  // Register migration for renderable v1 -> v2
  migrationRegistry.register({
    component: 'renderable',
    fromVersion: 1,
    toVersion: 2,
    description: 'Add sizeMultiplier and alpha fields to renderable component',
    migrate: (data: unknown) => {
      // Migration from v1 to v2: add sizeMultiplier and alpha fields
      // V1 format: any object without these fields
      // V2 format: adds sizeMultiplier (default 1.0) and alpha (default 1.0)
      if (typeof data !== 'object' || data === null) {
        throw new Error('Invalid renderable data: expected object');
      }

      // Cast to Record for safe property access during migration
      const old = data as Record<string, unknown>;

      return {
        ...old,
        sizeMultiplier: old.sizeMultiplier ?? 1.0,
        alpha: old.alpha ?? 1.0,
      };
    },
  });

}

// Auto-register on import
registerAllSerializers();

// Re-export for convenience
export { componentSerializerRegistry } from '../ComponentSerializerRegistry.js';
export { PositionSerializer } from './PositionSerializer.js';
export { GenericComponentSerializer, createGenericSerializer } from './GenericSerializer.js';

// Re-export all specific serializers
export { TrustNetworkSerializer } from './TrustNetworkSerializer.js';
export { ConflictSerializer } from './ConflictSerializer.js';
export { InjurySerializer } from './InjurySerializer.js';
export { GuardDutySerializer } from './GuardDutySerializer.js';
export { CombatStatsSerializer } from './CombatStatsSerializer.js';
export { DominanceRankSerializer } from './DominanceRankSerializer.js';
export { PackCombatSerializer } from './PackCombatSerializer.js';
export { HiveCombatSerializer } from './HiveCombatSerializer.js';
export { ManchiSerializer } from './ManchiSerializer.js';
export { EquipmentSerializer } from './EquipmentSerializer.js';

// Export additional memory serializers
export * from './EpisodicMemorySerializer.js';
export * from './RelationshipSerializer.js';
export * from './ExplorationStateSerializer.js';
export * from './SocialGradientSerializer.js';
export * from './PlantSerializer.js';
export * from './SpatialMemorySerializer.js';
export * from './JournalSerializer.js';
export * from './CourtshipSerializer.js';
