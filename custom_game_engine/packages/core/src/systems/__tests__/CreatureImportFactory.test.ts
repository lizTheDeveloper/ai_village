/**
 * Integration tests for CreatureImportFactory.
 *
 * Tests the 7-step import pipeline using data modelled on the
 * albi-norn.yaml example from folkfork-bridge.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CreatureImportFactory, CreatureImportError } from '../CreatureImportFactory.js';
import type { MigrationContext } from '../CreatureImportFactory.js';
import { createMockWorld } from '../../__tests__/createMockWorld.js';
import type { World } from '../../ecs/World.js';
import type { GenomeMigrationV1 } from '@multiverse-studios/folkfork-bridge';
import type { MigrationProvenanceComponent } from '../../components/MigrationProvenanceComponent.js';
import { SPECIES_REGISTRY, type SpeciesBehaviorProfile } from '../../species/SpeciesRegistry.js';

// ============================================================================
// Test data: modelled on albi-norn.yaml
// ============================================================================

function createAlbiNornPayload(): GenomeMigrationV1 {
  return {
    schema_version: '1.0.0',
    identity: {
      creature_id: 'albi-norn-001',
      name: 'Albi',
      species_id: 'norn',
      species_name: 'Norn',
      generation: 7,
      lineage_id: 'lineage-north-meadow',
      parent_ids: ['parent-a', 'parent-b'],
    },
    core_traits: [
      { trait_id: 'size', category: 'morphological', value: 0.4, heritability: 0.85, variance_range: null, transfer_fidelity: 'lossless', source_game: 'precursors', notes: null },
      { trait_id: 'strength', category: 'morphological', value: 0.35, heritability: 0.8, variance_range: null, transfer_fidelity: 'lossless', source_game: 'precursors', notes: null },
      { trait_id: 'speed', category: 'morphological', value: 0.55, heritability: 0.75, variance_range: null, transfer_fidelity: 'lossless', source_game: 'precursors', notes: null },
      { trait_id: 'health', category: 'metabolic', value: 0.8, heritability: 0.9, variance_range: null, transfer_fidelity: 'lossless', source_game: 'precursors', notes: null },
      { trait_id: 'lifespan', category: 'metabolic', value: 0.65, heritability: 0.7, variance_range: null, transfer_fidelity: 'low_loss', source_game: 'precursors', notes: null },
      { trait_id: 'temperament', category: 'behavioral', value: 0.6, heritability: 0.5, variance_range: null, transfer_fidelity: 'medium_loss', source_game: 'precursors', notes: null },
      { trait_id: 'reasoning', category: 'cognitive', value: 0.72, heritability: 0.65, variance_range: null, transfer_fidelity: 'medium_loss', source_game: 'precursors', notes: null },
      { trait_id: 'problem_solving', category: 'cognitive', value: 0.68, heritability: 0.6, variance_range: null, transfer_fidelity: 'medium_loss', source_game: 'precursors', notes: null },
      { trait_id: 'trainability', category: 'social', value: 0.7, heritability: 0.55, variance_range: null, transfer_fidelity: 'low_loss', source_game: 'precursors', notes: null },
      { trait_id: 'pheromone_sensitivity', category: 'sensory', value: 0.6, heritability: 0.5, variance_range: null, transfer_fidelity: 'lossy', source_game: 'precursors', notes: 'No MVEE equivalent' },
    ],
    drive_mapping: [
      { source_drive: 'hunger', target_drive: 'hunger', mapping_type: 'direct', source_value: 0.3, confidence: 1.0, notes: null },
      { source_drive: 'thirst', target_drive: 'thirst', mapping_type: 'direct', source_value: 0.2, confidence: 1.0, notes: null },
      { source_drive: 'fatigue', target_drive: 'energy', mapping_type: 'direct', source_value: 0.4, confidence: 0.9, notes: null },
      { source_drive: 'pain', target_drive: 'health', mapping_type: 'derived', source_value: 0.1, confidence: 0.7, notes: null },
      { source_drive: 'fear', target_drive: 'fearfulness', mapping_type: 'approximate', source_value: 0.25, confidence: 0.6, notes: null },
      { source_drive: 'anger', target_drive: 'aggressiveness', mapping_type: 'approximate', source_value: 0.15, confidence: 0.6, notes: null },
      { source_drive: 'curiosity', target_drive: 'curiosity', mapping_type: 'approximate', source_value: 0.7, confidence: 0.6, notes: null },
      { source_drive: 'social', target_drive: 'sociability', mapping_type: 'approximate', source_value: 0.65, confidence: 0.6, notes: null },
      { source_drive: 'loneliness', target_drive: 'socialContact', mapping_type: 'derived', source_value: 0.3, confidence: 0.7, notes: null },
      { source_drive: 'boredom', target_drive: 'stimulation', mapping_type: 'derived', source_value: 0.2, confidence: 0.5, notes: null },
      { source_drive: 'limbic_influence', target_drive: null, mapping_type: 'no_analog', source_value: 0.5, confidence: 0.0, notes: 'No MVEE equivalent' },
    ],
    dcc_profile: {
      dcc_baseline: 0.034,
      behavioral_drift_vector: [0.1, 0.05, 0.3, 0.2, 0.15],
      drift_vector_labels: ['teaching', 'inventing', 'exploring', 'fighting', 'socializing'],
      measurement_tick: 15000,
      species_mean_drift: [0.02, 0.01, 0.05, 0.03, 0.04],
      interpretation: 'Moderately emergent; strong exploration bias',
    },
    coordination_primitives: {
      proximity_memory: true,
      outcome_broadcasting: true,
      behavioral_observation: false,
      chemical_signaling: false,
    },
    swarm_history: {
      swarm_tendency: 'conformist',
      cluster_id: 'north_meadow',
      cluster_role: null,
      coordination_primitives_active: {
        proximity_memory: true,
        outcome_broadcasting: true,
        behavioral_observation: false,
        chemical_signaling: false,
      },
    },
    living_llm: {
      has_living_llm: true,
      model_id: 'norn-meadow-8b-v2',
      base_model: 'llama-3.2-8b',
      training_data_ref: 'data/norn-meadow-8b-v2.jsonl',
      training_data_checksum: 'abc123def456',
      dcc_threshold_at_training: 0.02,
      fine_tune_epochs: 3,
      behavioral_traces_count: 1500,
      species_conditioning_prompt: 'You are a curious Norn exploring the meadow...',
      portability: 'retraining_required',
    },
    visual_tokens: {
      base_hue: 120,
      accent_hue: 200,
      saturation: 0.7,
      lightness: 0.5,
      size_class: 'small',
      body_plan: 'bipedal',
      pattern: 'spotted',
      marking_intensity: 0.4,
      notable_features: ['white_patches', 'large_ears'],
    },
    provenance: {
      source_game: 'precursors',
      source_game_version: '0.9.0',
      exported_at: '2026-03-15T10:30:00Z',
      exporter_version: '1.2.0',
      checksum: 'sha256:abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      migration_history: [
        {
          from_game: 'precursors',
          to_game: 'mvee',
          crossed_at: '2026-03-15T10:30:00Z',
          gdi_at_crossing: 0.12,
          schema_version_used: '1.0.0',
        },
      ],
    },
    precursors_extension: {
      iq_tier: 12,
      imprint_vector: [0.3, 0.5, 0.2],
      chemical_snapshot: { glucose: 0.7, serotonin: 0.5, cortisol: 0.2 },
      invented_items: ['leaf_hat', 'stick_bridge'],
      chronicle_highlights: ['First to cross the river', 'Taught 3 offspring to use tools'],
      offspring_count: 5,
      limbic_weights_raw: {
        hunger: 0.3, thirst: 0.2, fatigue: 0.4, pain: 0.1, fear: 0.25,
        anger: 0.15, curiosity: 0.7, social: 0.65, loneliness: 0.3,
        boredom: 0.2, escape: 0.1, rest: 0.3, limbic_influence: 0.5,
      },
    },
    mvee_extension: null,
  } as unknown as GenomeMigrationV1;
}

const defaultMigrationContext: MigrationContext = {
  migrationType: 'folkfork_file',
  capsuleId: null,
  federatedIdentityHash: null,
};

const originalNornTemplate = SPECIES_REGISTRY.norn;

function installNornBehaviorProfile(profile: SpeciesBehaviorProfile): void {
  const base = SPECIES_REGISTRY.human;
  SPECIES_REGISTRY.norn = {
    ...base,
    speciesId: 'norn',
    speciesName: 'Norn',
    commonName: 'Norn',
    compatibleSpecies: [...base.compatibleSpecies],
    innateTraits: [...base.innateTraits],
    speciesBehaviorProfile: profile,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('CreatureImportFactory', () => {
  let factory: CreatureImportFactory;
  let world: World;

  beforeEach(() => {
    factory = new CreatureImportFactory();
    world = createMockWorld({ tick: 1000 });
  });

  afterEach(() => {
    if (originalNornTemplate) {
      SPECIES_REGISTRY.norn = originalNornTemplate;
    } else {
      delete SPECIES_REGISTRY.norn;
    }
  });

  // --------------------------------------------------------------------------
  // Step 1: Schema validation
  // --------------------------------------------------------------------------

  describe('Step 1: Schema validation', () => {
    it('throws schema_invalid for completely broken payload', () => {
      const badPayload = { garbage: true } as unknown as GenomeMigrationV1;
      expect(() =>
        factory.importCreature(world, badPayload, { x: 10, y: 20 }, defaultMigrationContext),
      ).toThrow(CreatureImportError);
    });
  });

  // --------------------------------------------------------------------------
  // Step 2: Integrity verification
  // --------------------------------------------------------------------------

  describe('Step 2: Integrity verification', () => {
    it('throws integrity_hash_mismatch when checksum is empty', () => {
      const payload = createAlbiNornPayload();
      payload.provenance.checksum = '';
      expect(() =>
        factory.importCreature(world, payload, { x: 10, y: 20 }, defaultMigrationContext),
      ).toThrow('integrity');
    });

    it('throws schema_version_unsupported for version 2.x', () => {
      const payload = createAlbiNornPayload();
      payload.schema_version = '2.0.0';
      expect(() =>
        factory.importCreature(world, payload, { x: 10, y: 20 }, defaultMigrationContext),
      ).toThrow(CreatureImportError);
    });
  });

  // --------------------------------------------------------------------------
  // Step 3: Provenance chain validation
  // --------------------------------------------------------------------------

  describe('Step 3: Provenance chain validation', () => {
    it('throws for unrecognised source_game', () => {
      const payload = createAlbiNornPayload();
      (payload.provenance as any).source_game = 'unknown_game';
      // Validator rejects invalid source_game before provenance check
      expect(() =>
        factory.importCreature(world, payload, { x: 10, y: 20 }, defaultMigrationContext),
      ).toThrow(CreatureImportError);
    });

    it('throws for empty creature_id', () => {
      const payload = createAlbiNornPayload();
      payload.identity.creature_id = '';
      expect(() =>
        factory.importCreature(world, payload, { x: 10, y: 20 }, defaultMigrationContext),
      ).toThrow('Provenance chain broken');
    });

    it('throws duplicate_creature_id when creature already imported', () => {
      const payload = createAlbiNornPayload();

      // Add a pre-existing entity with the same creature_id via migration_provenance
      const existingEntity: any = {
        id: 'existing-entity',
        getComponent: vi.fn().mockImplementation((type: string) => {
          if (type === 'migration_provenance') {
            return { sourceCreatureId: 'albi-norn-001' } as Partial<MigrationProvenanceComponent>;
          }
          return undefined;
        }),
      };
      (world.entities as Map<string, any>).set('existing-entity', existingEntity);

      expect(() =>
        factory.importCreature(world, payload, { x: 10, y: 20 }, defaultMigrationContext),
      ).toThrow('already exists in this world');
    });
  });

  // --------------------------------------------------------------------------
  // Step 4: Genome translation (integration with MigrationGenetics)
  // --------------------------------------------------------------------------

  describe('Step 4: Genome translation', () => {
    it('successfully translates all 9 traits and returns a result', () => {
      const payload = createAlbiNornPayload();
      const result = factory.importCreature(world, payload, { x: 10, y: 20 }, defaultMigrationContext);
      expect(result.success).toBe(true);
      expect(result.entityId).toBeTruthy();
    });

    it('includes warnings for no-analog drives', () => {
      const payload = createAlbiNornPayload();
      const result = factory.importCreature(world, payload, { x: 10, y: 20 }, defaultMigrationContext);
      const noAnalogWarnings = result.warnings.filter((w) => w.code === 'drive_no_analog');
      expect(noAnalogWarnings.length).toBeGreaterThan(0);
      expect(noAnalogWarnings[0]!.message).toContain('limbic_influence');
    });

    it('includes warning for discarded sensory trait', () => {
      const payload = createAlbiNornPayload();
      const result = factory.importCreature(world, payload, { x: 10, y: 20 }, defaultMigrationContext);
      expect(result.lossDeclaration).not.toBeNull();
      const discardedIds = result.lossDeclaration!.discarded.map((d) => d.traitId);
      expect(discardedIds).toContain('pheromone_sensitivity');
    });

    it('picks highest-value cognitive trait for intelligence', () => {
      const payload = createAlbiNornPayload();
      const result = factory.importCreature(world, payload, { x: 10, y: 20 }, defaultMigrationContext);
      // reasoning (0.72) > problem_solving (0.68), so reasoning wins
      // The non-winner should be in discarded
      const discardedIds = result.lossDeclaration!.discarded.map((d) => d.traitId);
      expect(discardedIds).toContain('problem_solving');
    });

    it('computes GDI in [0, 1]', () => {
      const payload = createAlbiNornPayload();
      const result = factory.importCreature(world, payload, { x: 10, y: 20 }, defaultMigrationContext);
      expect(result.geneticDistanceIndex).toBeGreaterThanOrEqual(0);
      expect(result.geneticDistanceIndex).toBeLessThanOrEqual(1);
    });

    it('warns about LLM portability when not portable', () => {
      const payload = createAlbiNornPayload();
      const result = factory.importCreature(world, payload, { x: 10, y: 20 }, defaultMigrationContext);
      const llmWarnings = result.warnings.filter((w) => w.code === 'living_llm_incompatible');
      expect(llmWarnings.length).toBe(1);
      expect(llmWarnings[0]!.message).toContain('retraining_required');
    });

    it('enforces species cognitive ceiling from behavior profile', () => {
      installNornBehaviorProfile({
        cognitiveCeiling: 0.4,
        personalityBaseline: {
          curiosity: 0.9,
          fearfulness: 0.2,
        },
        uniqueBehaviors: [],
        interspeciesRelations: [],
      });

      const payload = createAlbiNornPayload();
      const result = factory.importCreature(world, payload, { x: 10, y: 20 }, defaultMigrationContext);
      const emittedEvents = (world.eventBus.emit as any).mock.calls.map((call: any[]) => call[0]);
      const importedEvent = emittedEvents.find((event: any) => event?.type === 'creature:imported');

      expect(importedEvent).toBeDefined();
      expect(importedEvent.data.intelligenceExpression).toBeLessThanOrEqual(40);
      expect(result.warnings.some((warning) => warning.code === 'cognitive_ceiling_enforced')).toBe(true);
    });

    it('seeds animal personality from species personality baseline', () => {
      installNornBehaviorProfile({
        cognitiveCeiling: 0.95,
        personalityBaseline: {
          curiosity: 0.95,
          sociability: 0.85,
          aggression: 0.05,
          fearfulness: 0.15,
        },
        uniqueBehaviors: [],
        interspeciesRelations: [],
      });

      const payload = createAlbiNornPayload();
      const result = factory.importCreature(world, payload, { x: 10, y: 20 }, defaultMigrationContext);

      const createdEntity = (world.entities as Map<string, any>).get(result.entityId!);
      const animalCall = createdEntity.addComponent.mock.calls.find(
        (c: any[]) => c[0]?.type === 'animal',
      );
      expect(animalCall).toBeDefined();

      const seededPersonality = animalCall[0].personality;
      expect(seededPersonality.curiosity).toBeGreaterThan(0.6);
      expect(seededPersonality.sociability).toBeGreaterThan(0.55);
      expect(seededPersonality.aggressiveness).toBeLessThan(0.45);
      expect(seededPersonality.fearfulness).toBeLessThan(0.55);
      expect(result.warnings.some((warning) => warning.code === 'personality_baseline_seeded')).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Step 5: Biome conflict resolution (placeholder)
  // --------------------------------------------------------------------------

  describe('Step 5: Biome conflict resolution', () => {
    it('emits biome_conflict_resolved placeholder warning', () => {
      const payload = createAlbiNornPayload();
      const result = factory.importCreature(world, payload, { x: 10, y: 20 }, defaultMigrationContext);
      const biomeWarnings = result.warnings.filter((w) => w.code === 'biome_conflict_resolved');
      expect(biomeWarnings.length).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Step 6: Entity construction
  // --------------------------------------------------------------------------

  describe('Step 6: Entity construction', () => {
    it('creates entity and adds it to the world', () => {
      const payload = createAlbiNornPayload();
      const result = factory.importCreature(world, payload, { x: 10, y: 20 }, defaultMigrationContext);
      expect(result.entityId).toBeTruthy();
      expect(world.createEntity).toHaveBeenCalled();
    });

    it('attaches AnimalComponent, PositionComponent, QuarantineStatusComponent, MigrationProvenanceComponent', () => {
      const payload = createAlbiNornPayload();
      const result = factory.importCreature(world, payload, { x: 10, y: 20 }, defaultMigrationContext);

      const createdEntity = (world.entities as Map<string, any>).get(result.entityId!);
      expect(createdEntity).toBeDefined();

      // addComponent should have been called 4 times (Animal, Position, Quarantine, Provenance)
      expect(createdEntity.addComponent).toHaveBeenCalledTimes(4);

      // Verify component types by inspecting call args
      const calls = createdEntity.addComponent.mock.calls;
      const componentTypes = calls.map((c: any[]) => c[0]?.type);
      expect(componentTypes).toContain('animal');
      expect(componentTypes).toContain('position');
      expect(componentTypes).toContain('quarantine_status');
      expect(componentTypes).toContain('migration_provenance');
    });

    it('sets quarantine phase to arriving', () => {
      const payload = createAlbiNornPayload();
      factory.importCreature(world, payload, { x: 10, y: 20 }, defaultMigrationContext);

      const createdEntity = [...(world.entities as Map<string, any>).values()].pop();
      const quarantineCall = createdEntity.addComponent.mock.calls.find(
        (c: any[]) => c[0]?.type === 'quarantine_status',
      );
      expect(quarantineCall).toBeDefined();
      expect(quarantineCall![0].phase).toBe('arriving');
    });

    it('records provenance with correct source game and creature id', () => {
      const payload = createAlbiNornPayload();
      factory.importCreature(world, payload, { x: 10, y: 20 }, defaultMigrationContext);

      const createdEntity = [...(world.entities as Map<string, any>).values()].pop();
      const provenanceCall = createdEntity.addComponent.mock.calls.find(
        (c: any[]) => c[0]?.type === 'migration_provenance',
      );
      expect(provenanceCall).toBeDefined();
      expect(provenanceCall![0].sourceGame).toBe('precursors');
      expect(provenanceCall![0].sourceCreatureId).toBe('albi-norn-001');
      expect(provenanceCall![0].genomicIntegrityHash).toBe(payload.provenance.checksum);
    });

    it('throws quarantine_capacity_exceeded when 10 quarantine entities exist', () => {
      // Fill world with 10 quarantined entities
      for (let i = 0; i < 10; i++) {
        const entity: any = {
          id: `quarantined-${i}`,
          getComponent: vi.fn().mockImplementation((type: string) => {
            if (type === 'quarantine_status') {
              return { phase: 'adjusting' };
            }
            return undefined;
          }),
        };
        (world.entities as Map<string, any>).set(entity.id, entity);
      }

      const payload = createAlbiNornPayload();
      expect(() =>
        factory.importCreature(world, payload, { x: 10, y: 20 }, defaultMigrationContext),
      ).toThrow('Quarantine capacity exceeded');
    });
  });

  // --------------------------------------------------------------------------
  // Step 7: Event emission
  // --------------------------------------------------------------------------

  describe('Step 7: Event emission', () => {
    it('emits creature:imported event on the eventBus', () => {
      const payload = createAlbiNornPayload();
      const result = factory.importCreature(world, payload, { x: 10, y: 20 }, defaultMigrationContext);

      expect(world.eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'creature:imported',
          source: result.entityId,
          data: expect.objectContaining({
            entityId: result.entityId,
            sourceGame: 'precursors',
            migrationType: 'folkfork_file',
            speciesId: 'norn',
          }),
        }),
      );
    });

    it('registers species unique behaviors and interspecies relations on import', () => {
      installNornBehaviorProfile({
        cognitiveCeiling: 0.7,
        personalityBaseline: {
          curiosity: 0.8,
        },
        uniqueBehaviors: [
          {
            behaviorId: 'bioluminescent_relay',
            description: 'Pulse relay between colony members',
            triggerHint: 'idle_relay',
          },
        ],
        interspeciesRelations: [
          {
            targetSpeciesId: 'cow',
            disposition: 'fearful',
            description: 'Avoid large grazers',
          },
        ],
      });

      factory.importCreature(world, createAlbiNornPayload(), { x: 10, y: 20 }, defaultMigrationContext);
      const emittedEvents = (world.eventBus.emit as any).mock.calls.map((call: any[]) => call[0]);

      expect(
        emittedEvents.some(
          (event: any) =>
            event?.type === 'species:unique_behavior_registered' &&
            event.data?.behaviorId === 'bioluminescent_relay',
        ),
      ).toBe(true);

      expect(
        emittedEvents.some(
          (event: any) =>
            event?.type === 'species:interspecies_relation_registered' &&
            event.data?.targetSpeciesId === 'cow' &&
            event.data?.disposition === 'fearful',
        ),
      ).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // D_cc behavioral emergence (integration)
  // --------------------------------------------------------------------------

  describe('D_cc behavioral emergence', () => {
    it('applies drift bias when dcc_baseline > 0.02', () => {
      const payload = createAlbiNornPayload();
      // albi-norn has dcc_baseline = 0.034, which is > 0.02
      const result = factory.importCreature(world, payload, { x: 10, y: 20 }, defaultMigrationContext);

      // Check that personality_synthesized warning is present
      const personalityWarnings = result.warnings.filter((w) => w.code === 'personality_synthesized');
      expect(personalityWarnings.length).toBe(1);
      expect(result.success).toBe(true);
    });

    it('does not apply drift bias when dcc_baseline <= 0.02', () => {
      const payload = createAlbiNornPayload();
      payload.dcc_profile.dcc_baseline = 0.01;
      payload.dcc_profile.behavioral_drift_vector = [0, 0, 0, 0, 0];

      const result = factory.importCreature(world, payload, { x: 10, y: 20 }, defaultMigrationContext);
      expect(result.success).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Migration context variations
  // --------------------------------------------------------------------------

  describe('Migration context', () => {
    it('stores federated identity hash when provided', () => {
      const payload = createAlbiNornPayload();
      const ctx: MigrationContext = {
        migrationType: 'federated',
        capsuleId: null,
        federatedIdentityHash: 'sha256:federated-hash-123',
      };
      factory.importCreature(world, payload, { x: 10, y: 20 }, ctx);

      const createdEntity = [...(world.entities as Map<string, any>).values()].pop();
      const provenanceCall = createdEntity.addComponent.mock.calls.find(
        (c: any[]) => c[0]?.type === 'migration_provenance',
      );
      expect(provenanceCall![0].federatedIdentityHash).toBe('sha256:federated-hash-123');
      expect(provenanceCall![0].migrationType).toBe('federated');
    });

    it('stores capsule id for time_capsule_revival', () => {
      const payload = createAlbiNornPayload();
      const ctx: MigrationContext = {
        migrationType: 'time_capsule_revival',
        capsuleId: 'capsule-42',
        federatedIdentityHash: null,
      };
      factory.importCreature(world, payload, { x: 10, y: 20 }, ctx);

      const createdEntity = [...(world.entities as Map<string, any>).values()].pop();
      const provenanceCall = createdEntity.addComponent.mock.calls.find(
        (c: any[]) => c[0]?.type === 'migration_provenance',
      );
      expect(provenanceCall![0].capsuleId).toBe('capsule-42');
    });
  });
});
