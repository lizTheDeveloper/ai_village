import { describe, it, expect, beforeEach } from 'vitest';
import { EffectValidationPipeline } from '../EffectValidationPipeline.js';
import { EffectInterpreter } from '../../EffectInterpreter.js';
import type { EffectExpression } from '../../EffectExpression.js';

describe('EffectValidationPipeline', () => {
  let pipeline: EffectValidationPipeline;
  let interpreter: EffectInterpreter;

  beforeEach(() => {
    interpreter = new EffectInterpreter();
    pipeline = new EffectValidationPipeline(interpreter);
  });

  describe('Stage 1: Schema Validation', () => {
    it('should pass validation for a well-formed effect', () => {
      const effect: EffectExpression = {
        name: 'Test Effect',
        description: 'A valid test effect',
        target: {
          type: 'single',
        },
        operations: [
          {
            op: 'deal_damage',
            damageType: 'fire',
            amount: 50,
          },
        ],
        timing: {
          type: 'immediate',
        },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(true);
    });

    it('should fail when missing required field: target', () => {
      const effect = {
        operations: [
          {
            op: 'deal_damage',
            damageType: 'fire',
            amount: 50,
          },
        ],
        timing: {
          type: 'immediate',
        },
      } as any;

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(false);
      expect(result.stage).toBe('schema');
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          stage: 'schema',
          message: 'Missing required field: target',
        })
      );
    });

    it('should fail when missing required field: operations', () => {
      const effect = {
        target: { type: 'single' },
        timing: { type: 'immediate' },
      } as any;

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(false);
      expect(result.stage).toBe('schema');
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          stage: 'schema',
          message: 'Missing required field: operations',
        })
      );
    });

    it('should fail when missing required field: timing', () => {
      const effect = {
        target: { type: 'single' },
        operations: [{ op: 'deal_damage', damageType: 'fire', amount: 50 }],
      } as any;

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(false);
      expect(result.stage).toBe('schema');
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          stage: 'schema',
          message: 'Missing required field: timing',
        })
      );
    });

    it('should fail when operations is empty array', () => {
      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [],
        timing: { type: 'immediate' },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(false);
      expect(result.stage).toBe('schema');
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          stage: 'schema',
          message: 'Field "operations" must contain at least one operation',
        })
      );
    });

    it('should fail when target type is invalid', () => {
      const effect: EffectExpression = {
        target: { type: 'invalid_type' as any },
        operations: [{ op: 'deal_damage', damageType: 'fire', amount: 50 }],
        timing: { type: 'immediate' },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(false);
      expect(result.stage).toBe('schema');
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          stage: 'schema',
          message: expect.stringContaining('Invalid target type'),
        })
      );
    });

    it('should fail when timing type is invalid', () => {
      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [{ op: 'deal_damage', damageType: 'fire', amount: 50 }],
        timing: { type: 'invalid_timing' as any },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(false);
      expect(result.stage).toBe('schema');
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          stage: 'schema',
          message: expect.stringContaining('Invalid timing type'),
        })
      );
    });

    it('should fail when damage type is invalid', () => {
      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [{ op: 'deal_damage', damageType: 'invalid_damage' as any, amount: 50 }],
        timing: { type: 'immediate' },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(false);
      expect(result.stage).toBe('schema');
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          stage: 'schema',
          message: expect.stringContaining('Invalid damage type'),
        })
      );
    });

    it('should fail when operation is missing required fields', () => {
      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [{ op: 'modify_stat' } as any], // Missing stat and amount
        timing: { type: 'immediate' },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(false);
      expect(result.stage).toBe('schema');
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          stage: 'schema',
          message: expect.stringContaining('requires "stat" field'),
        })
      );
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          stage: 'schema',
          message: expect.stringContaining('requires "amount" field'),
        })
      );
    });
  });

  describe('Stage 2: Security Scanning', () => {
    it('should fail when stat name contains dangerous pattern', () => {
      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [
          {
            op: 'modify_stat',
            stat: '__proto__',
            amount: 10,
          },
        ],
        timing: { type: 'immediate' },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(false);
      expect(result.stage).toBe('security');
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          stage: 'security',
          message: expect.stringContaining('dangerous pattern'),
        })
      );
    });

    it('should fail when stat name is not a valid identifier', () => {
      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [
          {
            op: 'modify_stat',
            stat: 'invalid-stat-name',
            amount: 10,
          },
        ],
        timing: { type: 'immediate' },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(false);
      expect(result.stage).toBe('security');
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          stage: 'security',
          message: expect.stringContaining('must be a valid identifier'),
        })
      );
    });

    it('should fail when damage amount exceeds maximum', () => {
      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [
          {
            op: 'deal_damage',
            damageType: 'fire',
            amount: 99999, // Exceeds max of 10000
          },
        ],
        timing: { type: 'immediate' },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(false);
      expect(result.stage).toBe('security');
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          stage: 'security',
          message: expect.stringContaining('Damage amount too high'),
        })
      );
    });

    it('should fail when spawn count exceeds maximum', () => {
      const effect: EffectExpression = {
        target: { type: 'self' },
        operations: [
          {
            op: 'spawn_entity',
            entityType: 'skeleton',
            count: 999, // Exceeds max of 100
          },
        ],
        timing: { type: 'immediate' },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(false);
      expect(result.stage).toBe('security');
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          stage: 'security',
          message: expect.stringContaining('Spawn count too high'),
        })
      );
    });

    it('should fail when spawn count is negative', () => {
      const effect: EffectExpression = {
        target: { type: 'self' },
        operations: [
          {
            op: 'spawn_entity',
            entityType: 'skeleton',
            count: -5,
          },
        ],
        timing: { type: 'immediate' },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(false);
      expect(result.stage).toBe('security');
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          stage: 'security',
          message: expect.stringContaining('cannot be negative'),
        })
      );
    });

    it('should fail when too many operations', () => {
      const operations = Array.from({ length: 150 }, () => ({
        op: 'deal_damage' as const,
        damageType: 'fire' as const,
        amount: 10,
      }));

      const effect: EffectExpression = {
        target: { type: 'single' },
        operations,
        timing: { type: 'immediate' },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(false);
      expect(result.stage).toBe('security');
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          stage: 'security',
          message: expect.stringContaining('Too many operations'),
        })
      );
    });

    it('should fail when entity type contains dangerous pattern', () => {
      const effect: EffectExpression = {
        target: { type: 'self' },
        operations: [
          {
            op: 'spawn_entity',
            entityType: 'constructor',
            count: 1,
          },
        ],
        timing: { type: 'immediate' },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(false);
      expect(result.stage).toBe('security');
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          stage: 'security',
          message: expect.stringContaining('dangerous pattern'),
        })
      );
    });

    it('should fail when expression contains dangerous pattern', () => {
      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [
          {
            op: 'deal_damage',
            damageType: 'fire',
            amount: '__proto__.pollute' as any,
          },
        ],
        timing: { type: 'immediate' },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(false);
      expect(result.stage).toBe('security');
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          stage: 'security',
          message: expect.stringContaining('dangerous pattern'),
        })
      );
    });

    it('should fail when expression nesting is too deep', () => {
      // Create deeply nested expression
      let deepExpr: any = 1;
      for (let i = 0; i < 15; i++) {
        deepExpr = {
          op: '+',
          left: deepExpr,
          right: 1,
        };
      }

      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [
          {
            op: 'deal_damage',
            damageType: 'fire',
            amount: deepExpr,
          },
        ],
        timing: { type: 'immediate' },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(false);
      expect(result.stage).toBe('security');
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          stage: 'security',
          message: expect.stringContaining('nesting too deep'),
        })
      );
    });
  });

  describe('Stage 3: Interpreter Validation', () => {
    it('should fail when interpreter throws an error', () => {
      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [
          {
            op: 'modify_stat',
            stat: 'invalid_stat_name', // Not in VALID_STATS
            amount: 10,
          },
        ],
        timing: { type: 'immediate' },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(false);
      expect(result.stage).toBe('interpreter');
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          stage: 'interpreter',
          message: expect.stringContaining('Invalid stat name'),
        })
      );
    });

    it('should pass when effect executes successfully', () => {
      const effect: EffectExpression = {
        name: 'Valid Effect',
        description: 'This effect should execute successfully',
        target: { type: 'single' },
        operations: [
          {
            op: 'modify_stat',
            stat: 'health',
            amount: 10,
          },
        ],
        timing: { type: 'immediate' },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(true);
    });

    it('should fail when effect uses invalid status name', () => {
      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [
          {
            op: 'apply_status',
            status: 'not_a_valid_status',
            duration: 10,
          },
        ],
        timing: { type: 'immediate' },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(false);
      expect(result.stage).toBe('interpreter');
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          stage: 'interpreter',
          message: expect.stringContaining('Invalid status name'),
        })
      );
    });
  });

  describe('Stage 4: Semantic Validation', () => {
    it('should warn when effect has no name', () => {
      const effect: EffectExpression = {
        description: 'An effect without a name',
        target: { type: 'single' },
        operations: [
          {
            op: 'deal_damage',
            damageType: 'fire',
            amount: 50,
          },
        ],
        timing: { type: 'immediate' },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(true); // Still valid, but has warnings
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'warning',
          stage: 'semantic',
          message: expect.stringContaining('should have a descriptive name'),
        })
      );
    });

    it('should warn when effect has short description', () => {
      const effect: EffectExpression = {
        name: 'Test',
        description: 'Short',
        target: { type: 'single' },
        operations: [
          {
            op: 'deal_damage',
            damageType: 'fire',
            amount: 50,
          },
        ],
        timing: { type: 'immediate' },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(true);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'warning',
          stage: 'semantic',
          message: expect.stringContaining('meaningful description'),
        })
      );
    });

    it('should warn when using area operations with single target', () => {
      const effect: EffectExpression = {
        name: 'Test Effect',
        description: 'A test effect for validation',
        target: { type: 'single' },
        operations: [
          {
            op: 'spawn_entity',
            entityType: 'skeleton',
            count: 5,
          },
        ],
        timing: { type: 'immediate' },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(true);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'warning',
          stage: 'semantic',
          message: expect.stringContaining('area operations'),
        })
      );
    });

    it('should warn when targeting self with damage', () => {
      const effect: EffectExpression = {
        name: 'Self Harm',
        description: 'Damages the caster themselves',
        target: { type: 'self' },
        operations: [
          {
            op: 'deal_damage',
            damageType: 'fire',
            amount: 50,
          },
        ],
        timing: { type: 'immediate' },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(true);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'warning',
          stage: 'semantic',
          message: expect.stringContaining('targets self but deals damage'),
        })
      );
    });

    it('should warn when effect both damages and heals', () => {
      const effect: EffectExpression = {
        name: 'Confusing Effect',
        description: 'Does damage and healing at the same time',
        target: { type: 'single' },
        operations: [
          {
            op: 'deal_damage',
            damageType: 'fire',
            amount: 50,
          },
          {
            op: 'heal',
            amount: 30,
          },
        ],
        timing: { type: 'immediate' },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(true);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'warning',
          stage: 'semantic',
          message: expect.stringContaining('both damages and heals'),
        })
      );
    });

    it('should warn when effect has too many operations', () => {
      const operations = Array.from({ length: 25 }, () => ({
        op: 'deal_damage' as const,
        damageType: 'fire' as const,
        amount: 10,
      }));

      const effect: EffectExpression = {
        name: 'Complex Effect',
        description: 'An effect with many operations',
        target: { type: 'single' },
        operations,
        timing: { type: 'immediate' },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(true);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'warning',
          stage: 'semantic',
          message: expect.stringContaining('many operations'),
        })
      );
    });
  });

  describe('Multi-stage Validation', () => {
    it('should stop at first failing stage (schema)', () => {
      const effect = {
        // Missing target, operations, and timing
      } as any;

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(false);
      expect(result.stage).toBe('schema');
      // Should have schema errors but not run security/interpreter stages
      expect(result.issues.every((i) => i.stage === 'schema')).toBe(true);
    });

    it('should stop at security stage if it fails', () => {
      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [
          {
            op: 'modify_stat',
            stat: '__proto__', // Security violation
            amount: 10,
          },
        ],
        timing: { type: 'immediate' },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(false);
      expect(result.stage).toBe('security');
    });

    it('should pass all stages for a well-formed effect', () => {
      const effect: EffectExpression = {
        name: 'Fireball',
        description: 'A powerful fireball that damages enemies',
        target: {
          type: 'area',
          radius: 10,
        },
        operations: [
          {
            op: 'deal_damage',
            damageType: 'fire',
            amount: 50,
          },
        ],
        timing: { type: 'immediate' },
      };

      const result = pipeline.validate(effect);
      expect(result.valid).toBe(true);
      expect(result.stage).toBeUndefined(); // No stage means passed all
    });
  });
});
