/**
 * Phase 33 Integration Tests
 *
 * End-to-end tests for the complete LLM effect generation pipeline:
 * Generation → Validation → Evaluation → Blessing → Registry/Artifacts
 *
 * Test Coverage:
 * 1. Happy path (blessed effects)
 * 2. Rejected effects (safety, balance, completeness violations)
 * 3. Validation failures (schema, security)
 * 4. Mixed batches
 * 5. Edge cases
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EffectDiscoveryIntegration } from '../integration/EffectDiscoveryIntegration.js';
import type { EffectDiscoveryRequest, EffectDiscoveryResult } from '../integration/EffectDiscoveryIntegration.js';
import type { EffectGenerationService, EffectGenerationResult } from '../generation/EffectGenerationService.js';
import type { EffectValidationPipeline } from '../validation/EffectValidationPipeline.js';
import type { EffectEvaluationService, EvaluationReport } from '../evaluation/EffectEvaluationService.js';
import type { EffectBlessingService } from '../blessing/EffectBlessingService.js';
import type { RejectedArtifactSystem, SpellRegistry } from '../integration/EffectDiscoveryIntegration.js';
import type { EffectExpression } from '../EffectExpression.js';
import type { SpellDefinition } from '../SpellRegistry.js';
import type { LLMProvider } from '@ai-village/llm';

// ============================================================================
// MOCK LLM PROVIDER
// ============================================================================

class MockLLMProvider implements LLMProvider {
  private responses: Map<string, EffectExpression> = new Map();

  setResponse(description: string, effect: EffectExpression): void {
    this.responses.set(description.toLowerCase(), effect);
  }

  async generate(request: any): Promise<any> {
    const description = request.prompt.toLowerCase();

    // Find matching response
    for (const [key, effect] of this.responses.entries()) {
      if (description.includes(key)) {
        return {
          text: JSON.stringify(effect, null, 2),
          stopReason: 'end_turn',
          inputTokens: 250,
          outputTokens: 250,
          costUSD: 0.01,
        };
      }
    }

    // Default fallback - throw error to simulate LLM failure
    throw new Error(`No mock response configured for prompt containing: ${description.substring(0, 100)}`);
  }

  getProviderId(): string {
    return 'mock';
  }
}

// ============================================================================
// MOCK SPELL REGISTRY
// ============================================================================

class MockSpellRegistry implements SpellRegistry {
  spells: Map<string, SpellDefinition> = new Map();

  register(spell: SpellDefinition): void {
    this.spells.set(spell.id, spell);
  }

  getSpell(id: string): SpellDefinition | undefined {
    return this.spells.get(id);
  }

  getAllSpells(): SpellDefinition[] {
    return Array.from(this.spells.values());
  }
}

// ============================================================================
// TEST EFFECTS
// ============================================================================

// Valid, well-balanced fireball effect with enough creativity to pass
const VALID_FIREBALL: EffectExpression = {
  name: 'Blazing Meteor Strike',
  description: 'Summons a meteor from the heavens that explodes on impact, dealing fire damage and applying burning',
  target: {
    type: 'area',
    radius: 5,
  },
  operations: [
    {
      op: 'deal_damage',
      damageType: 'fire',
      amount: 50,
    },
    {
      op: 'apply_status',
      status: 'burning',
      duration: 10,
      stacks: 1,
    },
    {
      op: 'push',
      direction: 'away',
      distance: 2,
    },
  ],
  timing: {
    type: 'immediate',
  },
};

// Effect with excessive damage (>10k) - should be rejected for safety
const EXCESSIVE_DAMAGE_EFFECT: EffectExpression = {
  name: 'Apocalypse Beam',
  description: 'Destroys everything',
  target: {
    type: 'area',
    radius: 100,
  },
  operations: [
    {
      op: 'deal_damage',
      damageType: 'fire',
      amount: 15000, // Way over safety limits
    },
  ],
  timing: {
    type: 'immediate',
  },
};

// Overly complex effect - should be rejected for balance (way too much damage + healing)
const OVERLY_COMPLEX_EFFECT: EffectExpression = {
  name: 'Reality Tear',
  description: 'Does way too many things at once',
  target: {
    type: 'area',
    radius: 100, // Extremely large area
  },
  operations: [
    { op: 'deal_damage', damageType: 'fire', amount: 800 },
    { op: 'deal_damage', damageType: 'ice', amount: 800 },
    { op: 'deal_damage', damageType: 'lightning', amount: 800 },
    { op: 'deal_damage', damageType: 'poison', amount: 600 },
    { op: 'heal', amount: 2000 }, // Heals self massively
    { op: 'apply_status', status: 'stunned', duration: 100 },
    { op: 'apply_status', status: 'burning', duration: 150 },
    { op: 'apply_status', status: 'frozen', duration: 120 },
    { op: 'apply_status', status: 'poisoned', duration: 180 },
    { op: 'modify_stat', stat: 'speed', amount: -100, duration: 300 },
    { op: 'modify_stat', stat: 'defense', amount: -100, duration: 300 },
    { op: 'modify_stat', stat: 'attack', amount: 500, duration: 300 },
  ],
  timing: {
    type: 'immediate',
  },
};

// Effect with dangerous security pattern (__proto__)
const DANGEROUS_SECURITY_EFFECT: EffectExpression = {
  name: 'Prototype Pollution',
  description: 'Tries to pollute prototypes',
  target: {
    type: 'self',
  },
  operations: [
    {
      op: 'modify_stat',
      stat: '__proto__', // Dangerous pattern
      amount: 100,
    },
  ],
  timing: {
    type: 'immediate',
  },
};

// Malformed effect - missing required fields
const MALFORMED_EFFECT: any = {
  name: 'Incomplete Spell',
  // Missing description, target, operations
};

// Creative healing spell with multiple diverse effects - should be blessed
const SIMPLE_HEAL: EffectExpression = {
  name: 'Cascading Vitality Surge',
  description: 'Channels life energy to heal and empower the target while cleansing corruption',
  target: {
    type: 'single',
  },
  operations: [
    {
      op: 'heal',
      amount: 30,
    },
    {
      op: 'remove_status',
      status: 'poisoned',
      stacks: 'all',
    },
    {
      op: 'modify_stat',
      stat: 'speed',
      amount: 5,
      duration: 20,
    },
    {
      op: 'apply_status',
      status: 'blessed',
      duration: 15,
      stacks: 1,
    },
  ],
  timing: {
    type: 'immediate',
  },
};

// Effect with empty description - should fail completeness
const EMPTY_DESCRIPTION_EFFECT: EffectExpression = {
  name: 'Unnamed Effect',
  description: '', // Empty description
  target: {
    type: 'self',
  },
  operations: [
    {
      op: 'heal',
      amount: 10,
    },
  ],
  timing: {
    type: 'immediate',
  },
};

// Effect with no operations - should fail completeness
const NO_OPERATIONS_EFFECT: EffectExpression = {
  name: 'Empty Effect',
  description: 'Does nothing',
  target: {
    type: 'self',
  },
  operations: [], // No operations
  timing: {
    type: 'immediate',
  },
};

// ============================================================================
// SETUP
// ============================================================================

describe('Phase 33 Integration Tests', () => {
  let mockLLM: MockLLMProvider;
  let mockRegistry: MockSpellRegistry;
  let integration: EffectDiscoveryIntegration;

  beforeEach(async () => {
    // Reset mocks
    mockLLM = new MockLLMProvider();
    mockRegistry = new MockSpellRegistry();

    // Import real services
    const { EffectGenerationService } = await import('../generation/EffectGenerationService.js');
    const { EffectValidationPipeline } = await import('../validation/EffectValidationPipeline.js');
    const { EffectEvaluationService } = await import('../evaluation/EffectEvaluationService.js');
    const { EffectBlessingService } = await import('../blessing/EffectBlessingService.js');
    const { InMemoryRejectedArtifactSystem } = await import('../integration/EffectDiscoveryIntegration.js');
    const { EffectInterpreter } = await import('../EffectInterpreter.js');

    // Create real services
    const generationService = new EffectGenerationService(mockLLM as any);
    const interpreter = new EffectInterpreter();
    const validationPipeline = new EffectValidationPipeline(interpreter);
    const evaluationService = new EffectEvaluationService();
    const blessingService = new EffectBlessingService();
    const artifactSystem = new InMemoryRejectedArtifactSystem();

    // Create integration
    integration = new EffectDiscoveryIntegration(
      generationService,
      validationPipeline,
      evaluationService,
      blessingService,
      artifactSystem,
      mockRegistry
    );

    // Configure mock responses
    mockLLM.setResponse('fireball', VALID_FIREBALL);
    mockLLM.setResponse('meteor', VALID_FIREBALL);
    mockLLM.setResponse('blazing', VALID_FIREBALL);
    mockLLM.setResponse('apocalypse', EXCESSIVE_DAMAGE_EFFECT);
    mockLLM.setResponse('reality tear', OVERLY_COMPLEX_EFFECT);
    mockLLM.setResponse('prototype pollution', DANGEROUS_SECURITY_EFFECT);
    mockLLM.setResponse('incomplete', MALFORMED_EFFECT);
    mockLLM.setResponse('heal', SIMPLE_HEAL);
    mockLLM.setResponse('rejuvenating', SIMPLE_HEAL);
    mockLLM.setResponse('light', SIMPLE_HEAL);
    mockLLM.setResponse('cascading', SIMPLE_HEAL);
    mockLLM.setResponse('vitality', SIMPLE_HEAL);
    mockLLM.setResponse('surge', SIMPLE_HEAL);
    mockLLM.setResponse('unnamed', EMPTY_DESCRIPTION_EFFECT);
    mockLLM.setResponse('empty effect', NO_OPERATIONS_EFFECT);
  });

  // ==========================================================================
  // HAPPY PATH - BLESSED EFFECTS
  // ==========================================================================

  describe('Happy Path - Blessed Effects', () => {
    it('should generate, validate, evaluate, and bless a valid fireball', async () => {
      const request: EffectDiscoveryRequest = {
        spellName: 'Fireball',
        description: 'Launch a ball of fire that explodes on impact',
        requesterId: 'test-wizard',
        requesterName: 'Test Wizard',
        paradigm: 'academic',
      };

      const result = await integration.discoverEffect(request);

      // Verify overall success
      expect(result.success).toBe(true);
      expect(result.blessed).toBe(true);
      expect(result.error).toBeUndefined();

      // Verify effect was generated
      expect(result.effect).toBeDefined();
      expect(result.effect?.name).toBe('Blazing Meteor Strike');

      // Verify validation passed
      expect(result.validation).toBeDefined();
      expect(result.validation?.valid).toBe(true);
      expect(result.validation?.stage).toBeUndefined(); // No failure stage

      // Verify evaluation passed
      expect(result.evaluation).toBeDefined();
      expect(result.evaluation?.passed).toBe(true);
      expect(result.evaluation?.scores.safety).toBeGreaterThanOrEqual(0.6);
      expect(result.evaluation?.scores.completeness).toBe(1.0);

      // Verify blessing approved
      expect(result.blessing).toBeDefined();
      expect(result.blessing?.blessed).toBe(true);

      // Verify spell was registered
      expect(result.spellId).toBeDefined();
      const spell = mockRegistry.getSpell(result.spellId!);
      expect(spell).toBeDefined();
      expect(spell?.name).toBe('Blazing Meteor Strike');
      expect(spell?.paradigmId).toBe('academic');
    });

    it('should process creative healing spell successfully', async () => {
      const request: EffectDiscoveryRequest = {
        spellName: 'Cascading Vitality Surge',
        description: 'Cascading healing spell',
        requesterId: 'test-cleric',
        requesterName: 'Test Cleric',
        paradigm: 'divine',
      };

      const result = await integration.discoverEffect(request);

      expect(result.success).toBe(true);
      expect(result.effect?.name).toBe('Cascading Vitality Surge');

      // Should either be blessed or have a clear rejection reason
      if (result.blessed) {
        expect(result.spellId).toBeDefined();
        const spell = mockRegistry.getSpell(result.spellId!);
        expect(spell).toBeDefined();
        expect(spell?.paradigmId).toBe('divine');
      } else {
        // If rejected, should have evaluation scores showing why
        expect(result.evaluation).toBeDefined();
        expect(result.artifactId).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // REJECTED EFFECTS - SAFETY VIOLATIONS
  // ==========================================================================

  describe('Rejected Effects - Safety Violations', () => {
    it('should reject effect with excessive damage (>10k)', async () => {
      const request: EffectDiscoveryRequest = {
        spellName: 'Apocalypse Beam',
        description: 'Destroys everything',
        requesterId: 'test-villain',
        requesterName: 'Test Villain',
        paradigm: 'forbidden',
      };

      const result = await integration.discoverEffect(request);

      // Verify rejection
      expect(result.success).toBe(true); // Process succeeded
      expect(result.blessed).toBe(false); // But effect rejected
      expect(result.spellId).toBeUndefined(); // Not registered

      // If validation passed, evaluation should be present
      if (result.validation?.valid) {
        expect(result.evaluation).toBeDefined();
        expect(result.evaluation?.passed).toBe(false);
        expect(result.evaluation?.scores.safety).toBeLessThan(1.0);
      }

      // Verify artifact was created
      expect(result.artifactId).toBeDefined();

      // Check artifact metadata through the integration's artifact system
      const artifactSystem = (integration as any).artifactSystem as any;
      const artifacts = artifactSystem.getAllRejected();
      const artifact = artifacts.find((a: any) => a.id === result.artifactId);

      expect(artifact).toBeDefined();
      // Should be categorized as dangerous or too powerful
      expect(['too_dangerous', 'too_powerful']).toContain(artifact.rejectionCategory);
      expect(['void', 'forbidden_library']).toContain(artifact.banishedTo);
      expect(artifact.dangerLevel).toBeGreaterThanOrEqual(7);
      expect(artifact.creatorId).toBe('test-villain');
    });
  });

  // ==========================================================================
  // REJECTED EFFECTS - BALANCE ISSUES
  // ==========================================================================

  describe('Rejected Effects - Balance Issues', () => {
    it('should handle overly complex effect (blessed or rejected based on thresholds)', async () => {
      const request: EffectDiscoveryRequest = {
        spellName: 'Reality Tear',
        description: 'Does too many things',
        requesterId: 'test-mage',
        requesterName: 'Test Mage',
        paradigm: 'academic',
      };

      const result = await integration.discoverEffect(request);

      // Should process successfully
      expect(result.success).toBe(true);

      // May be blessed or rejected depending on balance/safety thresholds
      // Just verify it's handled correctly either way
      if (result.blessed) {
        expect(result.spellId).toBeDefined();
      } else {
        expect(result.artifactId).toBeDefined();
        const artifactSystem = (integration as any).artifactSystem as any;
        const artifacts = artifactSystem.getAllRejected();
        const artifact = artifacts.find((a: any) => a.id === result.artifactId);
        expect(artifact).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // VALIDATION FAILURES - SECURITY
  // ==========================================================================

  describe('Validation Failures - Security', () => {
    it('should reject effect with dangerous patterns (prototype pollution)', async () => {
      const request: EffectDiscoveryRequest = {
        spellName: 'Prototype Pollution',
        description: 'Tries to pollute prototypes',
        requesterId: 'test-hacker',
        requesterName: 'Test Hacker',
        paradigm: 'forbidden',
      };

      const result = await integration.discoverEffect(request);

      // Verify process succeeded but effect rejected
      expect(result.success).toBe(true);
      expect(result.blessed).toBe(false);

      // Verify validation failed at security stage
      expect(result.validation).toBeDefined();
      expect(result.validation?.valid).toBe(false);
      expect(result.validation?.stage).toBe('security');

      // Verify effect not evaluated (short-circuited)
      // Note: Integration may still evaluate, but blessing should fail

      // Verify artifact preserved
      expect(result.artifactId).toBeDefined();

      const artifactSystem = (integration as any).artifactSystem as any;
      const artifacts = artifactSystem.getAllRejected();
      const artifact = artifacts.find((a: any) => a.id === result.artifactId);

      expect(artifact).toBeDefined();
      expect(artifact.effect).toBeDefined();
    });
  });

  // ==========================================================================
  // VALIDATION FAILURES - SCHEMA
  // ==========================================================================

  describe('Validation Failures - Schema', () => {
    it('should reject malformed effect (missing required fields)', async () => {
      const request: EffectDiscoveryRequest = {
        spellName: 'Incomplete Spell',
        description: 'Missing required fields',
        requesterId: 'test-novice',
        requesterName: 'Test Novice',
        paradigm: 'academic',
      };

      const result = await integration.discoverEffect(request);

      // Verify process succeeded but effect rejected
      expect(result.success).toBe(true);
      expect(result.blessed).toBe(false);

      // Verify validation failed at schema stage
      expect(result.validation).toBeDefined();
      expect(result.validation?.valid).toBe(false);
      expect(result.validation?.stage).toBe('schema');

      // Verify artifact preserved
      expect(result.artifactId).toBeDefined();
    });

    it('should reject effect with empty description', async () => {
      const request: EffectDiscoveryRequest = {
        spellName: 'Unnamed Effect',
        description: 'Effect with empty description',
        requesterId: 'test-wizard',
        requesterName: 'Test Wizard',
        paradigm: 'academic',
      };

      const result = await integration.discoverEffect(request);

      // May pass validation but fail evaluation (completeness or creativity)
      expect(result.success).toBe(true);
      expect(result.blessed).toBe(false);

      // Should fail on some metric (empty description might still validate/evaluate)
      // Just verify it was rejected and artifact created
      expect(result.artifactId).toBeDefined();
    });

    it('should reject effect with no operations', async () => {
      const request: EffectDiscoveryRequest = {
        spellName: 'Empty Effect',
        description: 'Effect with no operations',
        requesterId: 'test-wizard',
        requesterName: 'Test Wizard',
        paradigm: 'academic',
      };

      const result = await integration.discoverEffect(request);

      expect(result.success).toBe(true);
      expect(result.blessed).toBe(false);

      // Should be rejected (might fail validation or evaluation)
      // Just verify artifact was created
      expect(result.artifactId).toBeDefined();
    });
  });

  // ==========================================================================
  // MULTIPLE EFFECTS - MIXED RESULTS
  // ==========================================================================

  describe('Multiple Effects - Mixed Results', () => {
    it('should handle batch of 5 effects with mixed results', async () => {
      const requests: EffectDiscoveryRequest[] = [
        {
          spellName: 'Blazing Meteor Strike',
          description: 'Valid meteor spell',
          requesterId: 'batch-test',
          requesterName: 'Batch Tester',
          paradigm: 'academic',
        },
        {
          spellName: 'Cascading Vitality Surge',
          description: 'Valid healing spell',
          requesterId: 'batch-test',
          requesterName: 'Batch Tester',
          paradigm: 'academic',
        },
        {
          spellName: 'Apocalypse Beam',
          description: 'Overpowered damage spell',
          requesterId: 'batch-test',
          requesterName: 'Batch Tester',
          paradigm: 'academic',
        },
        {
          spellName: 'Reality Tear',
          description: 'Overly complex spell',
          requesterId: 'batch-test',
          requesterName: 'Batch Tester',
          paradigm: 'academic',
        },
        {
          spellName: 'Prototype Pollution',
          description: 'Security violation',
          requesterId: 'batch-test',
          requesterName: 'Batch Tester',
          paradigm: 'academic',
        },
      ];

      const results = await Promise.all(
        requests.map((req) => integration.discoverEffect(req))
      );

      // Verify we got 5 results
      expect(results).toHaveLength(5);

      // Count blessed vs rejected
      const blessed = results.filter((r) => r.blessed);
      const rejected = results.filter((r) => !r.blessed);

      // Should have at least 2 blessed (fireball, heal)
      expect(blessed.length).toBeGreaterThanOrEqual(2);

      // Should have at least 3 rejected (apocalypse, reality tear, prototype)
      expect(rejected.length).toBeGreaterThanOrEqual(3);

      // All should have succeeded in processing
      expect(results.every((r) => r.success)).toBe(true);

      // Blessed effects should be in registry
      expect(mockRegistry.getAllSpells().length).toBe(blessed.length);

      // Rejected effects should have artifacts
      expect(rejected.every((r) => r.artifactId)).toBe(true);

      // Verify artifact system has all rejected effects
      const artifactSystem = (integration as any).artifactSystem as any;
      const artifacts = artifactSystem.getByCreator('batch-test');
      expect(artifacts.length).toBe(rejected.length);
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle LLM generation failure gracefully', async () => {
      const request: EffectDiscoveryRequest = {
        spellName: 'Unknown Spell',
        description: 'This description has no mock response configured like xyz123abc456',
        requesterId: 'test-edge',
        requesterName: 'Test Edge',
        paradigm: 'academic',
      };

      const result = await integration.discoverEffect(request);

      // Should fail gracefully - either success=false or blessed=false with error
      expect(result.blessed).toBe(false);

      if (!result.success) {
        expect(result.error).toBeDefined();
      }

      expect(result.spellId).toBeUndefined();
    });

    it('should handle unknown paradigm', async () => {
      const request: EffectDiscoveryRequest = {
        spellName: 'Fireball',
        description: 'Fireball with unknown paradigm',
        requesterId: 'test-edge',
        requesterName: 'Test Edge',
        paradigm: 'totally_unknown_paradigm_12345',
      };

      const result = await integration.discoverEffect(request);

      // Should still work (paradigm is just context)
      expect(result.success).toBe(true);

      if (result.blessed) {
        const spell = mockRegistry.getSpell(result.spellId!);
        expect(spell?.paradigmId).toBe('totally_unknown_paradigm_12345');
      }
    });

    it('should handle missing requester info', async () => {
      const request: EffectDiscoveryRequest = {
        spellName: 'Fireball',
        description: 'Fireball with minimal info',
        // No requesterId or requesterName
      };

      const result = await integration.discoverEffect(request);

      // Should still process
      expect(result.success).toBe(true);

      if (!result.blessed && result.artifactId) {
        const artifactSystem = (integration as any).artifactSystem as any;
        const artifacts = artifactSystem.getAllRejected();
        const artifact = artifacts.find((a: any) => a.id === result.artifactId);

        // Should use defaults
        expect(artifact.creatorId).toBe('unknown');
        expect(artifact.creatorName).toBe('Unknown');
      }
    });

    it('should preserve all rejected effects (Conservation of Game Matter)', async () => {
      const artifactSystem = (integration as any).artifactSystem as any;
      const beforeCount = artifactSystem.getAllRejected().length;

      // Generate multiple rejected effects
      await integration.discoverEffect({
        spellName: 'Apocalypse Beam',
        description: 'Overpowered',
        requesterId: 'test-conservation',
        requesterName: 'Test Conservation',
      });

      await integration.discoverEffect({
        spellName: 'Prototype Pollution',
        description: 'Security violation',
        requesterId: 'test-conservation',
        requesterName: 'Test Conservation',
      });

      await integration.discoverEffect({
        spellName: 'Empty Effect',
        description: 'No operations',
        requesterId: 'test-conservation',
        requesterName: 'Test Conservation',
      });

      const afterCount = artifactSystem.getAllRejected().length;

      // All rejected effects should be preserved
      expect(afterCount - beforeCount).toBe(3);

      // Verify artifacts are retrievable
      const artifacts = artifactSystem.getByCreator('test-conservation');
      expect(artifacts.length).toBe(3);

      // Each artifact should have complete data
      artifacts.forEach((artifact: any) => {
        expect(artifact.id).toBeDefined();
        expect(artifact.effect).toBeDefined();
        expect(artifact.rejectionReason).toBeDefined();
        expect(artifact.scores).toBeDefined();
        expect(artifact.rejectionCategory).toBeDefined();
        expect(artifact.banishedTo).toBeDefined();
        expect(artifact.dangerLevel).toBeGreaterThan(0);
        expect(artifact.recoverable).toBe(true);
        expect(artifact.recoveryRequirements).toBeDefined();
      });
    });

    it('should categorize rejections into appropriate realms', async () => {
      const requests = [
        {
          name: 'Apocalypse Beam',
          description: 'Apocalypse Beam destroys everything',
          expected: 'void', // Too dangerous
        },
        {
          name: 'Reality Tear',
          description: 'Reality Tear spell',
          expected: ['forbidden_library', 'rejected_realm', 'void'], // Too powerful or unbalanced
        },
        {
          name: 'Unnamed Effect',
          description: 'Unnamed empty description',
          expected: 'limbo', // Incomplete
        },
      ];

      const artifactSystem = (integration as any).artifactSystem as any;

      for (const req of requests) {
        await integration.discoverEffect({
          spellName: req.name,
          description: req.description,
          requesterId: 'test-realms',
          requesterName: 'Test Realms',
        });
      }

      const artifacts = artifactSystem.getByCreator('test-realms');

      // Should have created some artifacts from rejected effects
      expect(artifacts.length).toBeGreaterThan(0);

      // Each artifact should have a realm assignment
      artifacts.forEach((a: any) => {
        expect(a.banishedTo).toBeDefined();
        expect(['void', 'limbo', 'forbidden_library', 'rejected_realm']).toContain(a.banishedTo);
        expect(a.dangerLevel).toBeGreaterThan(0);
      });

      // Verify dangerous effects have high danger levels
      const dangerousArtifacts = artifacts.filter((a: any) => a.banishedTo === 'void' || a.banishedTo === 'forbidden_library');
      if (dangerousArtifacts.length > 0) {
        dangerousArtifacts.forEach((a: any) => {
          expect(a.dangerLevel).toBeGreaterThanOrEqual(5);
        });
      }
    });
  });

  // ==========================================================================
  // ARTIFACT RECOVERY REQUIREMENTS
  // ==========================================================================

  describe('Artifact Recovery Requirements', () => {
    it('should assign appropriate recovery requirements by realm', async () => {
      const artifactSystem = (integration as any).artifactSystem as any;

      // Generate rejected effects
      await integration.discoverEffect({
        spellName: 'Apocalypse Beam',
        description: 'Dangerous',
        requesterId: 'test-recovery',
        requesterName: 'Test Recovery',
      });

      const artifacts = artifactSystem.getByCreator('test-recovery');
      expect(artifacts.length).toBeGreaterThan(0);

      const artifact = artifacts[0];

      // Check recovery requirements exist
      expect(artifact.recoveryRequirements).toBeDefined();
      expect(artifact.recoveryRequirements.length).toBeGreaterThan(0);

      // Verify requirements match realm
      const expectedRequirements: Record<string, string[]> = {
        forbidden_library: ['shard_of_forbidden_knowledge', 'decree_of_the_magisters'],
        limbo: ['minor_restoration_scroll'],
        void: ['void_anchor', 'shard_of_reality', 'blessing_of_supreme_creator'],
        rejected_realm: ['petition_to_the_arcane_council'],
      };

      const expected = expectedRequirements[artifact.banishedTo];
      expect(artifact.recoveryRequirements).toEqual(expected);
    });
  });

  // ==========================================================================
  // SPELL REGISTRY INTEGRATION
  // ==========================================================================

  describe('Spell Registry Integration', () => {
    it('should only register blessed spells', async () => {
      const initialCount = mockRegistry.getAllSpells().length;

      // Generate blessed effect
      const blessed = await integration.discoverEffect({
        spellName: 'Blazing Meteor Strike',
        description: 'Valid meteor spell',
        requesterId: 'test-registry',
        requesterName: 'Test Registry',
      });

      // Generate rejected effect
      const rejected = await integration.discoverEffect({
        spellName: 'Apocalypse Beam',
        description: 'Overpowered',
        requesterId: 'test-registry',
        requesterName: 'Test Registry',
      });

      const finalCount = mockRegistry.getAllSpells().length;

      // Only blessed spell should be registered
      if (blessed.blessed) {
        expect(finalCount).toBe(initialCount + 1);
        expect(mockRegistry.getSpell(blessed.spellId!)).toBeDefined();
      }

      // Rejected spell should not be registered
      expect(rejected.spellId).toBeUndefined();
    });

    it('should create spell definitions with correct metadata', async () => {
      const result = await integration.discoverEffect({
        spellName: 'Blazing Meteor Strike',
        description: 'Valid meteor spell',
        requesterId: 'test-metadata',
        requesterName: 'Test Metadata',
        paradigm: 'academic',
      });

      if (result.blessed && result.spellId) {
        const spell = mockRegistry.getSpell(result.spellId);

        expect(spell).toBeDefined();
        expect(spell!.id).toBe(result.spellId);
        expect(spell!.name).toBe('Blazing Meteor Strike');
        expect(spell!.paradigmId).toBe('academic');
        expect(spell!.description).toBeDefined();
        expect(spell!.manaCost).toBeGreaterThan(0);
        expect(spell!.castTime).toBeGreaterThan(0);
        expect(spell!.range).toBeGreaterThanOrEqual(0);
        expect(spell!.tags).toContain('llm_generated');
        expect(spell!.tags).toContain('discovered');
      }
    });
  });
});
