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

// Magic component serializers
import { ManaPoolsSerializer } from './ManaPoolsSerializer.js';
import { SpellKnowledgeSerializer } from './SpellKnowledgeSerializer.js';
import { CastingStateSerializer } from './CastingStateSerializer.js';
import { SkillProgressSerializer } from './SkillProgressSerializer.js';
import { ParadigmStateSerializer } from './ParadigmStateSerializer.js';

// Memory and state serializers
import { EpisodicMemorySerializer } from './EpisodicMemorySerializer.js';
import { RelationshipSerializer } from './RelationshipSerializer.js';
import { SocialGradientSerializer } from './SocialGradientSerializer.js';
import { PlantSerializer } from './PlantSerializer.js';
import { ExplorationStateSerializer } from './ExplorationStateSerializer.js';
import { SpatialMemorySerializer } from './SpatialMemorySerializer.js';
import { JournalSerializer } from './JournalSerializer.js';
import { CourtshipSerializer } from './CourtshipSerializer.js';

// Admin Angel serializer (handles Map in AdminAngelMemory.agentFamiliarity)
import { AdminAngelSerializer } from './AdminAngelSerializer.js';

// Sprint 3 component serializers (handle Map fields)
import { MarketStateSerializer } from './MarketStateSerializer.js';
import { TechnologyUnlockSerializer } from './TechnologyUnlockSerializer.js';

// Map/Set serializers for components that were incorrectly using GenericSerializer
import { SocialMemorySerializer } from './SocialMemorySerializer.js';
import { BeliefSerializer } from './BeliefSerializer.js';
import { DeitySerializer } from './DeitySerializer.js';
import { DivineAbilitySerializer } from './DivineAbilitySerializer.js';
import { NeedsSerializer } from './NeedsSerializer.js';
import { PlantKnowledgeSerializer } from './PlantKnowledgeSerializer.js';
import { SeedSerializer } from './SeedSerializer.js';

// Discovery naming serializer (handles Map fields for player-named world firsts)
import { DiscoveryNamingSerializer } from './DiscoveryNamingSerializer.js';
import { WildSeedBankSerializer } from './WildSeedBankSerializer.js';

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

  // Register magic component serializers
  componentSerializerRegistry.register('mana_pools', new ManaPoolsSerializer());
  componentSerializerRegistry.register('spell_knowledge', new SpellKnowledgeSerializer());
  componentSerializerRegistry.register('casting_state', new CastingStateSerializer());
  componentSerializerRegistry.register('skill_progress', new SkillProgressSerializer());
  componentSerializerRegistry.register('paradigm_state', new ParadigmStateSerializer());

  // Register memory and state serializers (these handle Maps and private fields properly)
  componentSerializerRegistry.register('episodic_memory', new EpisodicMemorySerializer());
  componentSerializerRegistry.register('relationship', new RelationshipSerializer());
  componentSerializerRegistry.register('social_gradient', new SocialGradientSerializer());
  componentSerializerRegistry.register('plant', new PlantSerializer());
  componentSerializerRegistry.register('exploration_state', new ExplorationStateSerializer());
  componentSerializerRegistry.register('spatial_memory', new SpatialMemorySerializer());
  componentSerializerRegistry.register('journal', new JournalSerializer());
  componentSerializerRegistry.register('courtship', new CourtshipSerializer());

  // Register admin_angel serializer (handles Map in AdminAngelMemory.agentFamiliarity)
  componentSerializerRegistry.register('admin_angel', new AdminAngelSerializer());

  // Register Sprint 3 serializers (components with Map fields)
  componentSerializerRegistry.register('market_state', new MarketStateSerializer());
  componentSerializerRegistry.register('technology_unlock', new TechnologyUnlockSerializer());

  // Register Map/Set serializers (fix silent data loss on save/load)
  componentSerializerRegistry.register('social_memory', new SocialMemorySerializer());
  componentSerializerRegistry.register('belief', new BeliefSerializer());
  componentSerializerRegistry.register('deity', new DeitySerializer());
  componentSerializerRegistry.register('divine_ability', new DivineAbilitySerializer());
  componentSerializerRegistry.register('needs', new NeedsSerializer());

  // Register plant knowledge serializer (handles Map<string, PlantKnowledgeEntry> and Set<string>)
  componentSerializerRegistry.register('plant_knowledge', new PlantKnowledgeSerializer());

  // Register seed serializer (handles genetics and metadata properly)
  componentSerializerRegistry.register('seed', new SeedSerializer());

  // Register discovery naming serializer (handles Map fields for player-named world firsts)
  componentSerializerRegistry.register('discovery_naming', new DiscoveryNamingSerializer());

  // Register wild seed bank serializer (handles Map<string, WildSeedBankEntry[]> for plant ecology persistence)
  componentSerializerRegistry.register('wild_seed_bank', new WildSeedBankSerializer());

  // Register generic serializers for all other components
  // These can be replaced with specific serializers later
  const genericComponents = [
    'agent',
    'inventory',
    // 'needs' - now has specific serializer (handles Set<number> starvationDayMemoriesIssued)
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
    // 'seed' - now has specific serializer (handles genetics and metadata properly)
    'steering',
    'velocity',
    'vision',
    'circadian',
    'preference',
    'health',
    // 'belief' - now has specific serializer (handles Map<string, Belief> and Map<string, EvidenceRecord[]>)
    'body',
    'conversation',
    'cooking_skill',
    'crafting_station',
    // 'deity' - now has specific serializer (handles Set<string> believers/sacredSites, Map<string,number> traitConfidence)
    'divine_power',
    // 'divine_ability' - now has specific serializer (handles 4 Map fields)
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
    // 'social_memory' - now has specific serializer (handles Map<string, SocialMemory>)
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
    'working_animal',  // Working animal roles, skills, tasks (Phase 2)
    'animal_group',    // Pack/herd social structures (Phase 5)

    // --- Sprint 1 additions ---
    'movement_intention',  // Factorio-style movement optimization

    // --- Sprint 2 additions ---
    'behavior',            // Agent behavior queue
    'exploration_mission', // Active exploration mission
    'knowledge_loss',      // Singleton: tracks knowledge lost from deaths
    'intelligence',        // LLM model quality / thinking depth

    // --- Sprint 3 additions (governance) ---
    'village_governance',
    'city_governance',
    'province_governance',
    'nation_governance',
    'empire_governance',
    'federation_governance',
    'galactic_council',
    'governor',
    'political_entity',
    'governance_history',
    'directive_acknowledgment',
    'governance_archive',
    'negotiation',
    'dynasty',
    'province',
    'nation',
    'empire',

    // --- Sprint 3 additions (economy) ---
    'currency',
    // 'market_state' - has specific serializer (Map fields)
    'shipping_lane',
    'trade_caravan',
    'trade_network',
    'blockade',
    'mining_operation',

    // --- Sprint 3 additions (technology) ---
    // 'technology_unlock' - has specific serializer (Map fields)
    'technology_era',
    'knowledge_repository',
    'uplift_agreement',
    'civilization_reputation',

    // --- Sprint 3 additions (building) ---
    'building_condition',
    'building_upgrade',

    // --- Sprint 3 additions (bodyReproduction) ---
    'postpartum',
    'infant',
    'nursing',
    'parasitic_colonization',
    'collective_mind',

    // --- Sprint 3 additions (animals) ---
    'bioluminescent',

    // --- Sprint 3 additions (combat) ---
    'pack_member',
    'hive_queen',
    'hive_worker',
    'projectile',
    'burning',

    // --- Sprint 3 additions (research / publishing) ---
    'library',
    'bookstore',
    'university',
    'university_library',
    'biography',
    'publishing_company',
    'newspaper',

    // --- City / uplift (Sprint 3+) ---
    'city_director',
    'profession',
    'uplift_candidate',
    'uplift_program',
    'uplifted_trait',
    'proto_sapience',
    'settlement',

    // --- Multiverse / time (Sprint 4+, register now for forward compatibility) ---
    'corrupted',
    'universe_fork_metadata',
    'divergence_tracking',
    'canon_event',
    'causal_chain',
    'merge_compatibility',
    'timeline_merger_operation',
    'time_compression',
    'time_compression_snapshot',
    'passage_extended',

    // --- Divinity / rebellion (Sprint 4+) ---
    'reality_anchor',
    'rebellion_threshold',
    'supreme_creator',
    'power_vacuum',
    'position_holder',
    'dimensional_rift',
    'rebellion_outcome',

    // --- Soul / death (Sprint 3+) ---
    'silver_thread',
    'plot_lines',
    'current_life_memory',
    'veil_of_forgetting',
    'planet_location',

    // --- Television (Sprint 4+) ---
    'tv_content',
    'tv_station',
    'tv_show',
    'tv_broadcast',
    'recording',
    'video_replay',

    // --- Navigation / fleet (Sprint 4+) ---
    'spaceship',
    'ship_crew',
    'squadron',
    'fleet',
    'armada',
    'navy',
    'rainbow_planet',
    'planet_travel',
    'planet_portal',
    'emotion_theater',
    'memory_hall',
    'meditation_chamber',
    'heart_chamber',
    'straggler',

    // --- Invasion / megastructures (Sprint 4+) ---
    'invasion',
    'megastructure',
    'construction_project',
    'archaeological_site',
    'probability_scout_mission',
    'chrono_salvage_mission',

    // --- Automation (Sprint 4+) ---
    'belt',
    'assembly_machine',
    'machine_connection',
    'machine_placement',
    'roboport',
    'robot',
    'logistics_chest',
    'chunk_production_state',
    'factory_ai',
    'production_capability',

    // --- Player / progression ---
    'milestone',
    // Note: 'discovery_naming' uses DiscoveryNamingSerializer (handles Map fields)
    'generated_content',
    'god_crafted_artifact',
    'discovery_marker',
    'avatar_entity',
    'avatar_roster',

    // --- Multi-village (Sprint 4+) ---
    'village',
    'trade_route',
    'inter_village_caravan',
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

// Export magic component serializers
export { ManaPoolsSerializer } from './ManaPoolsSerializer.js';
export { SpellKnowledgeSerializer } from './SpellKnowledgeSerializer.js';
export { CastingStateSerializer } from './CastingStateSerializer.js';
export { SkillProgressSerializer } from './SkillProgressSerializer.js';
export { ParadigmStateSerializer } from './ParadigmStateSerializer.js';

// Export additional memory serializers
export * from './EpisodicMemorySerializer.js';
export * from './RelationshipSerializer.js';
export * from './ExplorationStateSerializer.js';
export * from './SocialGradientSerializer.js';
export * from './PlantSerializer.js';
export * from './SpatialMemorySerializer.js';
export * from './JournalSerializer.js';
export * from './CourtshipSerializer.js';
export * from './AdminAngelSerializer.js';

// Sprint 3 specific serializers
export { MarketStateSerializer } from './MarketStateSerializer.js';
export { TechnologyUnlockSerializer } from './TechnologyUnlockSerializer.js';

// Map/Set serializers
export { SocialMemorySerializer } from './SocialMemorySerializer.js';
export { BeliefSerializer } from './BeliefSerializer.js';
export { DeitySerializer } from './DeitySerializer.js';
export { DivineAbilitySerializer } from './DivineAbilitySerializer.js';
export { NeedsSerializer } from './NeedsSerializer.js';
export { PlantKnowledgeSerializer } from './PlantKnowledgeSerializer.js';
export { SeedSerializer } from './SeedSerializer.js';
export { DiscoveryNamingSerializer } from './DiscoveryNamingSerializer.js';
export { WildSeedBankSerializer } from './WildSeedBankSerializer.js';
