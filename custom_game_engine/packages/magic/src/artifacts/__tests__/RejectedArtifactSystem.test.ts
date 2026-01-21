/**
 * Tests for RejectedArtifactSystem - Conservation of Game Matter implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../../../core/src/World.js';
import {
  RejectedArtifactSystem,
  type RejectedArtifactComponent,
  type CorruptedEffectComponent,
  type EvaluationScores,
  type EffectGenerationRequest,
  type ValidationIssue,
} from '../RejectedArtifactSystem.js';

describe('RejectedArtifactSystem', () => {
  let world: World;
  let system: RejectedArtifactSystem;

  beforeEach(() => {
    world = new World();
    system = new RejectedArtifactSystem(world);
  });

  describe('preserveRejectedEffect', () => {
    it('should create entity with rejected_artifact component', () => {
      const effect = {
        name: 'Overpowered Fireball',
        operations: [{ op: 'deal_damage', value: 999 }],
      };

      const request: EffectGenerationRequest = {
        description: 'A spell that deals massive damage',
        paradigmId: 'academic',
      };

      const scores: EvaluationScores = {
        safety: 0.2,
        balance: 0.1,
        completeness: 0.9,
        creativity: 0.8,
        overall: 0.4,
      };

      const entity = system.preserveRejectedEffect(
        effect,
        request,
        'Too dangerous for mortal hands',
        'blessing_service',
        scores
      );

      expect(entity).toBeDefined();
      expect(entity.hasComponent('rejected_artifact')).toBe(true);

      const component = entity.getComponent<RejectedArtifactComponent>('rejected_artifact');
      expect(component).toBeDefined();
      expect(component?.effectExpression).toEqual(effect);
      expect(component?.originalRequest).toEqual(request);
      expect(component?.rejectionReason).toBe('Too dangerous for mortal hands');
      expect(component?.rejectedBy).toBe('blessing_service');
    });

    it('should categorize too_powerful effects correctly', () => {
      const effect = {
        name: 'Reality Tear',
        operations: [{ op: 'deal_damage', value: 9999 }],
      };

      const scores: EvaluationScores = {
        safety: 0.3,
        balance: 0.2,
        completeness: 0.8,
        creativity: 0.9,
        overall: 0.4,
      };

      const entity = system.preserveRejectedEffect(
        effect,
        { description: 'test' },
        'Too powerful',
        'test',
        scores
      );

      const component = entity.getComponent<RejectedArtifactComponent>('rejected_artifact');
      expect(component?.rejectionCategory).toBe('too_powerful');
      expect(component?.banishedTo).toBe('forbidden_library');
      expect(component?.dangerLevel).toBeGreaterThanOrEqual(8);
    });

    it('should categorize too_dangerous effects correctly', () => {
      const effect = {
        name: 'Chaos Storm',
        operations: [{ op: 'deal_damage', value: 300 }],
      };

      const scores: EvaluationScores = {
        safety: 0.3,
        balance: 0.6,
        completeness: 0.8,
        creativity: 0.7,
        overall: 0.5,
      };

      const entity = system.preserveRejectedEffect(
        effect,
        { description: 'test' },
        'Too dangerous',
        'test',
        scores
      );

      const component = entity.getComponent<RejectedArtifactComponent>('rejected_artifact');
      expect(component?.rejectionCategory).toBe('too_dangerous');
      expect(component?.banishedTo).toBe('void');
      expect(component?.dangerLevel).toBeGreaterThanOrEqual(7);
    });

    it('should categorize incomplete effects correctly', () => {
      const effect = {
        name: 'Broken Spell',
        operations: [],
      };

      const scores: EvaluationScores = {
        safety: 0.9,
        balance: 0.7,
        completeness: 0.4,
        creativity: 0.5,
        overall: 0.6,
      };

      const entity = system.preserveRejectedEffect(
        effect,
        { description: 'test' },
        'Incomplete',
        'test',
        scores
      );

      const component = entity.getComponent<RejectedArtifactComponent>('rejected_artifact');
      expect(component?.rejectionCategory).toBe('incomplete');
      expect(component?.banishedTo).toBe('limbo');
      expect(component?.dangerLevel).toBeLessThanOrEqual(4);
    });

    it('should categorize incoherent effects correctly', () => {
      const effect = {
        name: 'Nonsense Spell',
        operations: [{ op: 'unknown' }],
      };

      const scores: EvaluationScores = {
        safety: 0.8,
        balance: 0.7,
        completeness: 0.6,
        creativity: 0.2,
        overall: 0.5,
      };

      const entity = system.preserveRejectedEffect(
        effect,
        { description: 'test' },
        'Incoherent',
        'test',
        scores
      );

      const component = entity.getComponent<RejectedArtifactComponent>('rejected_artifact');
      expect(component?.rejectionCategory).toBe('incoherent');
      expect(component?.banishedTo).toBe('limbo');
      expect(component?.dangerLevel).toBeLessThanOrEqual(4);
    });

    it('should categorize unbalanced effects correctly', () => {
      const effect = {
        name: 'Weak Spell',
        operations: [{ op: 'deal_damage', value: 1 }],
      };

      const scores: EvaluationScores = {
        safety: 0.9,
        balance: 0.3,
        completeness: 0.8,
        creativity: 0.7,
        overall: 0.6,
      };

      const entity = system.preserveRejectedEffect(
        effect,
        { description: 'test' },
        'Unbalanced',
        'test',
        scores
      );

      const component = entity.getComponent<RejectedArtifactComponent>('rejected_artifact');
      expect(component?.rejectionCategory).toBe('unbalanced');
      expect(component?.banishedTo).toBe('rejected_realm');
      expect(component?.dangerLevel).toBeGreaterThanOrEqual(4);
      expect(component?.dangerLevel).toBeLessThanOrEqual(6);
    });

    it('should handle effects without scores (validation failure)', () => {
      const effect = {
        name: 'Invalid Spell',
        operations: null,
      };

      const entity = system.preserveRejectedEffect(
        effect,
        { description: 'test' },
        'Validation failed',
        'validation_pipeline'
      );

      const component = entity.getComponent<RejectedArtifactComponent>('rejected_artifact');
      expect(component?.rejectionCategory).toBe('forbidden_knowledge');
      expect(component?.banishedTo).toBe('rejected_realm');
    });

    it('should generate recovery requirements based on realm', () => {
      // Forbidden library
      const effect1 = {
        name: 'Test',
        operations: [{ op: 'deal_damage', value: 999 }],
      };
      const scores1: EvaluationScores = {
        safety: 0.2,
        balance: 0.1,
        completeness: 0.9,
        creativity: 0.8,
        overall: 0.4,
      };
      const entity1 = system.preserveRejectedEffect(effect1, { description: 'test' }, '', 'test', scores1);
      const comp1 = entity1.getComponent<RejectedArtifactComponent>('rejected_artifact');
      expect(comp1?.recoveryRequirements).toContain('shard_of_forbidden_knowledge');

      // Limbo
      const effect2 = {
        name: 'Test',
        operations: [],
      };
      const scores2: EvaluationScores = {
        safety: 0.9,
        balance: 0.7,
        completeness: 0.4,
        creativity: 0.5,
        overall: 0.6,
      };
      const entity2 = system.preserveRejectedEffect(effect2, { description: 'test' }, '', 'test', scores2);
      const comp2 = entity2.getComponent<RejectedArtifactComponent>('rejected_artifact');
      expect(comp2?.recoveryRequirements).toContain('minor_restoration_scroll');

      // Void
      const effect3 = {
        name: 'Test',
        operations: [{ op: 'deal_damage', value: 500 }],
      };
      const scores3: EvaluationScores = {
        safety: 0.3,
        balance: 0.6,
        completeness: 0.8,
        creativity: 0.7,
        overall: 0.5,
      };
      const entity3 = system.preserveRejectedEffect(effect3, { description: 'test' }, '', 'test', scores3);
      const comp3 = entity3.getComponent<RejectedArtifactComponent>('rejected_artifact');
      expect(comp3?.recoveryRequirements).toContain('void_anchor');
      expect(comp3?.recoveryRequirements).toContain('shard_of_reality');
    });

    it('should mark most effects as retrievable', () => {
      const effect = {
        name: 'Test',
        operations: [{ op: 'deal_damage', value: 100 }],
      };

      const entity = system.preserveRejectedEffect(
        effect,
        { description: 'test' },
        'Test',
        'test'
      );

      const component = entity.getComponent<RejectedArtifactComponent>('rejected_artifact');
      expect(component?.retrievable).toBe(true);
    });
  });

  describe('preserveCorruptedEffect', () => {
    it('should create entity with corrupted_effect component', () => {
      const effect = {
        name: 'Malformed Spell',
        operations: null,
      };

      const request: EffectGenerationRequest = {
        description: 'Corrupted spell',
      };

      const validationErrors: ValidationIssue[] = [
        {
          stage: 'schema',
          code: 'MISSING_FIELD',
          message: 'Missing required field: operations',
          severity: 'error',
        },
      ];

      const entity = system.preserveCorruptedEffect(
        effect,
        request,
        validationErrors,
        'Schema validation failed'
      );

      expect(entity).toBeDefined();
      expect(entity.hasComponent('corrupted_effect')).toBe(true);

      const component = entity.getComponent<CorruptedEffectComponent>('corrupted_effect');
      expect(component).toBeDefined();
      expect(component?.effectExpression).toEqual(effect);
      expect(component?.validationErrors).toEqual(validationErrors);
      expect(component?.corruptionReason).toBe('Schema validation failed');
    });

    it('should mark as recoverable if no critical errors', () => {
      const effect = { name: 'Test' };
      const errors: ValidationIssue[] = [
        { stage: 'schema', code: 'MINOR', message: 'Minor issue', severity: 'minor' },
      ];

      const entity = system.preserveCorruptedEffect(effect, { description: 'test' }, errors, 'Minor issues');

      const component = entity.getComponent<CorruptedEffectComponent>('corrupted_effect');
      expect(component?.recoverable).toBe(true);
    });

    it('should mark as unrecoverable if critical errors', () => {
      const effect = { name: 'Test' };
      const errors: ValidationIssue[] = [
        { stage: 'security', code: 'DANGEROUS', message: 'Critical error', severity: 'critical' },
      ];

      const entity = system.preserveCorruptedEffect(effect, { description: 'test' }, errors, 'Critical');

      const component = entity.getComponent<CorruptedEffectComponent>('corrupted_effect');
      expect(component?.recoverable).toBe(false);
    });
  });

  describe('query methods', () => {
    it('should get all rejected artifacts', () => {
      // Create multiple rejected artifacts
      system.preserveRejectedEffect(
        { name: 'Test1', operations: [] },
        { description: 'test' },
        'Test',
        'test'
      );
      system.preserveRejectedEffect(
        { name: 'Test2', operations: [] },
        { description: 'test' },
        'Test',
        'test'
      );

      const artifacts = system.getAllRejectedArtifacts();
      expect(artifacts.length).toBe(2);
    });

    it('should get artifacts by realm', () => {
      // Create artifacts in different realms
      const scores1: EvaluationScores = {
        safety: 0.2,
        balance: 0.1,
        completeness: 0.9,
        creativity: 0.8,
        overall: 0.4,
      };
      system.preserveRejectedEffect(
        { name: 'Forbidden', operations: [{ op: 'deal_damage', value: 999 }] },
        { description: 'test' },
        'Test',
        'test',
        scores1
      );

      const scores2: EvaluationScores = {
        safety: 0.9,
        balance: 0.7,
        completeness: 0.4,
        creativity: 0.5,
        overall: 0.6,
      };
      system.preserveRejectedEffect(
        { name: 'Incomplete', operations: [] },
        { description: 'test' },
        'Test',
        'test',
        scores2
      );

      const forbiddenArtifacts = system.getArtifactsByRealm('forbidden_library');
      const limboArtifacts = system.getArtifactsByRealm('limbo');

      expect(forbiddenArtifacts.length).toBe(1);
      expect(limboArtifacts.length).toBe(1);
    });

    it('should get all corrupted effects', () => {
      system.preserveCorruptedEffect(
        { name: 'Test1' },
        { description: 'test' },
        [],
        'Test'
      );
      system.preserveCorruptedEffect(
        { name: 'Test2' },
        { description: 'test' },
        [],
        'Test'
      );

      const corrupted = system.getAllCorruptedEffects();
      expect(corrupted.length).toBe(2);
    });

    it('should get artifacts by creator', () => {
      // Create artifacts with different creators
      const creator1 = 'agent_alice';
      const creator2 = 'agent_bob';

      system.preserveRejectedEffect(
        { name: 'Alice Spell 1', operations: [] },
        { description: 'test' },
        'Test',
        'test',
        undefined,
        creator1
      );
      system.preserveRejectedEffect(
        { name: 'Alice Spell 2', operations: [] },
        { description: 'test' },
        'Test',
        'test',
        undefined,
        creator1
      );
      system.preserveRejectedEffect(
        { name: 'Bob Spell', operations: [] },
        { description: 'test' },
        'Test',
        'test',
        undefined,
        creator2
      );

      const aliceArtifacts = system.getArtifactsByCreator(creator1);
      const bobArtifacts = system.getArtifactsByCreator(creator2);

      expect(aliceArtifacts.length).toBe(2);
      expect(bobArtifacts.length).toBe(1);

      // Verify creator IDs are correct
      const aliceComponent = aliceArtifacts[0].getComponent<RejectedArtifactComponent>('rejected_artifact');
      const bobComponent = bobArtifacts[0].getComponent<RejectedArtifactComponent>('rejected_artifact');

      expect(aliceComponent?.creatorId).toBe(creator1);
      expect(bobComponent?.creatorId).toBe(creator2);
    });

    it('should handle artifacts without creator', () => {
      // Create artifact without creator
      system.preserveRejectedEffect(
        { name: 'No Creator', operations: [] },
        { description: 'test' },
        'Test',
        'test'
      );

      const artifacts = system.getArtifactsByCreator('some_creator');
      expect(artifacts.length).toBe(0);
    });
  });

  describe('attemptRecovery', () => {
    it('should fail if artifact not found', () => {
      const result = system.attemptRecovery('nonexistent', []);
      expect(result.success).toBe(false);
    });

    it('should fail if missing recovery items', () => {
      const scores: EvaluationScores = {
        safety: 0.9,
        balance: 0.7,
        completeness: 0.4,
        creativity: 0.5,
        overall: 0.6,
      };
      const entity = system.preserveRejectedEffect(
        { name: 'Test', operations: [] },
        { description: 'test' },
        'Test',
        'test',
        scores
      );

      const result = system.attemptRecovery(entity.id, []);
      expect(result.success).toBe(false);
      expect(result.missingItems).toBeDefined();
      expect(result.missingItems?.length).toBeGreaterThan(0);
    });

    it('should succeed with correct recovery items', () => {
      const effect = { name: 'Recoverable Spell', operations: [] };
      const scores: EvaluationScores = {
        safety: 0.9,
        balance: 0.7,
        completeness: 0.4,
        creativity: 0.5,
        overall: 0.6,
      };
      const entity = system.preserveRejectedEffect(
        effect,
        { description: 'test' },
        'Test',
        'test',
        scores
      );

      const component = entity.getComponent<RejectedArtifactComponent>('rejected_artifact');
      const requiredItems = component?.recoveryRequirements || [];

      const result = system.attemptRecovery(entity.id, requiredItems);
      expect(result.success).toBe(true);
      expect(result.effect).toEqual(effect);
    });

    it('should remove rejected_artifact component after recovery', () => {
      const scores: EvaluationScores = {
        safety: 0.9,
        balance: 0.7,
        completeness: 0.4,
        creativity: 0.5,
        overall: 0.6,
      };
      const entity = system.preserveRejectedEffect(
        { name: 'Test', operations: [] },
        { description: 'test' },
        'Test',
        'test',
        scores
      );

      const component = entity.getComponent<RejectedArtifactComponent>('rejected_artifact');
      const requiredItems = component?.recoveryRequirements || [];

      system.attemptRecovery(entity.id, requiredItems);

      expect(entity.hasComponent('rejected_artifact')).toBe(false);
      expect(entity.hasComponent('recovered_artifact')).toBe(true);
    });
  });

  describe('Conservation of Game Matter', () => {
    it('should never delete rejected effects', () => {
      const initialEntityCount = world.getAllEntities().length;

      // Create rejected artifact
      system.preserveRejectedEffect(
        { name: 'Test', operations: [] },
        { description: 'test' },
        'Test',
        'test'
      );

      expect(world.getAllEntities().length).toBe(initialEntityCount + 1);

      // Verify entity persists
      const artifacts = system.getAllRejectedArtifacts();
      expect(artifacts.length).toBe(1);
    });

    it('should preserve all rejection metadata', () => {
      const effect = { name: 'Test Effect', operations: [{ op: 'deal_damage', value: 50 }] };
      const request: EffectGenerationRequest = {
        description: 'A test spell',
        paradigmId: 'academic',
        casterStats: {
          intelligence: 10,
          level: 5,
          primarySource: 'mana',
        },
      };
      const scores: EvaluationScores = {
        safety: 0.7,
        balance: 0.6,
        completeness: 0.8,
        creativity: 0.9,
        overall: 0.75,
      };

      const entity = system.preserveRejectedEffect(
        effect,
        request,
        'Rejected for testing',
        'test_service',
        scores
      );

      const component = entity.getComponent<RejectedArtifactComponent>('rejected_artifact');
      expect(component?.effectExpression).toEqual(effect);
      expect(component?.originalRequest).toEqual(request);
      expect(component?.rejectionReason).toBe('Rejected for testing');
      expect(component?.rejectedBy).toBe('test_service');
      expect(component?.rejectedAt).toBeGreaterThan(0);
    });

    it('should preserve corrupted effects with validation errors', () => {
      const effect = { name: 'Corrupted', operations: null };
      const errors: ValidationIssue[] = [
        { stage: 'schema', code: 'ERR1', message: 'Error 1', severity: 'error' },
        { stage: 'security', code: 'ERR2', message: 'Error 2', severity: 'critical' },
      ];

      const entity = system.preserveCorruptedEffect(
        effect,
        { description: 'test' },
        errors,
        'Multiple validation errors'
      );

      const component = entity.getComponent<CorruptedEffectComponent>('corrupted_effect');
      expect(component?.validationErrors).toEqual(errors);
      expect(component?.corruptionReason).toBe('Multiple validation errors');
      expect(component?.originalData).toEqual(effect);
    });

    it('should preserve creator ID when creating rejected artifact', () => {
      const creatorId = 'agent_wizard_123';
      const effect = { name: 'Test Effect', operations: [] };

      const entity = system.preserveRejectedEffect(
        effect,
        { description: 'test' },
        'Test rejection',
        'test_service',
        undefined,
        creatorId
      );

      const component = entity.getComponent<RejectedArtifactComponent>('rejected_artifact');
      expect(component?.creatorId).toBe(creatorId);
    });

    it('should preserve creator ID when creating corrupted effect', () => {
      const creatorId = 'agent_mage_456';
      const effect = { name: 'Corrupted Effect', operations: null };
      const errors: ValidationIssue[] = [
        { stage: 'schema', code: 'ERR1', message: 'Error 1', severity: 'error' },
      ];

      const entity = system.preserveCorruptedEffect(
        effect,
        { description: 'test' },
        errors,
        'Validation failed',
        creatorId
      );

      const component = entity.getComponent<CorruptedEffectComponent>('corrupted_effect');
      expect(component?.creatorId).toBe(creatorId);
    });
  });
});
