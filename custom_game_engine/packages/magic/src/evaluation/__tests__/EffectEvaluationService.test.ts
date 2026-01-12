/**
 * Tests for EffectEvaluationService
 *
 * Comprehensive tests covering all metrics (Safety, Balance, Completeness, Creativity)
 * and threshold enforcement.
 */

import { describe, it, expect } from 'vitest';
import { EffectEvaluationService } from '../EffectEvaluationService.js';
import type { EffectExpression } from '../../EffectExpression.js';

describe('EffectEvaluationService', () => {
  const service = new EffectEvaluationService();

  // ==========================================================================
  // SAFETY METRIC TESTS
  // ==========================================================================

  describe('Safety Metric', () => {
    it('should pass safety check for valid effect', () => {
      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [
          { op: 'deal_damage', damageType: 'fire', amount: 100 },
        ],
        timing: { type: 'immediate' },
      };

      const report = service.evaluateEffect(effect);

      expect(report.scores.safety).toBe(1.0);
      expect(report.reasons).not.toContain(expect.stringContaining('exceeds max'));
    });

    it('should fail safety check for excessive damage', () => {
      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [
          { op: 'deal_damage', damageType: 'fire', amount: 15000 },
        ],
        timing: { type: 'immediate' },
      };

      const report = service.evaluateEffect(effect);

      expect(report.scores.safety).toBeLessThan(1.0);
      expect(report.reasons.some(r => r.includes('Damage'))).toBe(true);
      expect(report.passed).toBe(false);
    });

    it('should fail safety check for excessive spawns', () => {
      const effect: EffectExpression = {
        target: { type: 'self' },
        operations: [
          { op: 'spawn_entity', entityType: 'minion', count: 100 },
        ],
        timing: { type: 'immediate' },
      };

      const report = service.evaluateEffect(effect);

      expect(report.scores.safety).toBeLessThan(1.0);
      expect(report.reasons.some(r => r.includes('Spawn count'))).toBe(true);
      expect(report.passed).toBe(false);
    });

    it('should fail safety check for excessive chain depth', () => {
      // Create an effect with 6 levels of chain_effect (exceeds limit of 5)
      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [
          { op: 'chain_effect', effectId: 'chain1', newTarget: { type: 'single' } },
          { op: 'chain_effect', effectId: 'chain2', newTarget: { type: 'single' } },
          { op: 'chain_effect', effectId: 'chain3', newTarget: { type: 'single' } },
          { op: 'chain_effect', effectId: 'chain4', newTarget: { type: 'single' } },
          { op: 'chain_effect', effectId: 'chain5', newTarget: { type: 'single' } },
          { op: 'chain_effect', effectId: 'chain6', newTarget: { type: 'single' } },
        ],
        timing: { type: 'immediate' },
      };

      const report = service.evaluateEffect(effect);

      expect(report.scores.safety).toBeLessThan(1.0);
      expect(report.reasons.some(r => r.includes('Chain depth'))).toBe(true);
    });

    it('should handle multiple safety violations', () => {
      const effect: EffectExpression = {
        target: { type: 'area', radius: 100 },
        operations: [
          { op: 'deal_damage', damageType: 'fire', amount: 20000 },
          { op: 'spawn_entity', entityType: 'demon', count: 80 },
        ],
        timing: { type: 'immediate' },
      };

      const report = service.evaluateEffect(effect);

      expect(report.scores.safety).toBeLessThan(1.0);
      expect(report.reasons.length).toBeGreaterThan(1);
      expect(report.passed).toBe(false);
    });
  });

  // ==========================================================================
  // BALANCE METRIC TESTS
  // ==========================================================================

  describe('Balance Metric', () => {
    it('should pass balance check for reasonable effect', () => {
      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [
          { op: 'deal_damage', damageType: 'fire', amount: 100 },
        ],
        timing: { type: 'immediate' },
      };

      const report = service.evaluateEffect(effect);

      expect(report.scores.balance).toBeGreaterThanOrEqual(0.7);
    });

    it('should penalize very high damage', () => {
      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [
          { op: 'deal_damage', damageType: 'fire', amount: 6000 },
        ],
        timing: { type: 'immediate' },
      };

      const report = service.evaluateEffect(effect);

      expect(report.scores.balance).toBeLessThan(1.0);
      expect(report.reasons.some(r => r.includes('Very high damage'))).toBe(true);
    });

    it('should penalize very low damage', () => {
      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [
          { op: 'deal_damage', damageType: 'fire', amount: 1 },
        ],
        timing: { type: 'immediate' },
      };

      const report = service.evaluateEffect(effect);

      expect(report.scores.balance).toBeLessThan(1.0);
      expect(report.reasons.some(r => r.includes('Very low damage'))).toBe(true);
    });

    it('should penalize too many operations', () => {
      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [
          { op: 'deal_damage', damageType: 'fire', amount: 10 },
          { op: 'deal_damage', damageType: 'ice', amount: 10 },
          { op: 'deal_damage', damageType: 'lightning', amount: 10 },
          { op: 'heal', amount: 5 },
          { op: 'apply_status', status: 'burn', duration: 5 },
          { op: 'apply_status', status: 'slow', duration: 3 },
          { op: 'push', direction: { dx: 1, dy: 0 }, distance: 5 },
          { op: 'spawn_entity', entityType: 'spark', count: 1 },
          { op: 'spawn_entity', entityType: 'flame', count: 1 },
          { op: 'emit_event', eventType: 'explosion', payload: {} },
          { op: 'emit_event', eventType: 'shake', payload: {} },
          { op: 'deal_damage', damageType: 'force', amount: 20 },
        ],
        timing: { type: 'immediate' },
      };

      const report = service.evaluateEffect(effect);

      expect(report.scores.balance).toBeLessThan(1.0);
      expect(report.reasons.some(r => r.includes('Too many operations'))).toBe(true);
    });

    it('should penalize very large target radius', () => {
      const effect: EffectExpression = {
        target: { type: 'area', radius: 75 },
        operations: [
          { op: 'deal_damage', damageType: 'fire', amount: 100 },
        ],
        timing: { type: 'immediate' },
      };

      const report = service.evaluateEffect(effect);

      expect(report.scores.balance).toBeLessThan(1.0);
      expect(report.reasons.some(r => r.includes('Very large target radius'))).toBe(true);
    });
  });

  // ==========================================================================
  // COMPLETENESS METRIC TESTS
  // ==========================================================================

  describe('Completeness Metric', () => {
    it('should pass completeness check for well-formed effect', () => {
      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [
          { op: 'deal_damage', damageType: 'fire', amount: 100 },
        ],
        timing: { type: 'immediate' },
      };

      const report = service.evaluateEffect(effect);

      expect(report.scores.completeness).toBe(1.0);
    });

    it('should fail without target', () => {
      const effect: any = {
        operations: [
          { op: 'deal_damage', damageType: 'fire', amount: 100 },
        ],
        timing: { type: 'immediate' },
      };

      const report = service.evaluateEffect(effect);

      expect(report.scores.completeness).toBeLessThan(1.0);
      expect(report.reasons.some(r => r.includes('target'))).toBe(true);
      expect(report.passed).toBe(false);
    });

    it('should fail without operations', () => {
      const effect: any = {
        target: { type: 'single' },
        timing: { type: 'immediate' },
      };

      const report = service.evaluateEffect(effect);

      expect(report.scores.completeness).toBeLessThan(1.0);
      expect(report.reasons.some(r => r.includes('operations'))).toBe(true);
      expect(report.passed).toBe(false);
    });

    it('should fail with empty operations array', () => {
      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [],
        timing: { type: 'immediate' },
      };

      const report = service.evaluateEffect(effect);

      expect(report.scores.completeness).toBeLessThan(1.0);
      expect(report.reasons.some(r => r.includes('operations'))).toBe(true);
    });

    it('should fail without timing', () => {
      const effect: any = {
        target: { type: 'single' },
        operations: [
          { op: 'deal_damage', damageType: 'fire', amount: 100 },
        ],
      };

      const report = service.evaluateEffect(effect);

      expect(report.scores.completeness).toBeLessThan(1.0);
      expect(report.reasons.some(r => r.includes('timing'))).toBe(true);
    });

    it('should fail with invalid operation type', () => {
      const effect: any = {
        target: { type: 'single' },
        operations: [
          { op: 'invalid_operation', foo: 'bar' },
        ],
        timing: { type: 'immediate' },
      };

      const report = service.evaluateEffect(effect);

      expect(report.scores.completeness).toBeLessThan(1.0);
      expect(report.reasons.some(r => r.includes('invalid'))).toBe(true);
    });

    it('should fail with operation missing op field', () => {
      const effect: any = {
        target: { type: 'single' },
        operations: [
          { damageType: 'fire', amount: 100 },
        ],
        timing: { type: 'immediate' },
      };

      const report = service.evaluateEffect(effect);

      expect(report.scores.completeness).toBeLessThan(1.0);
      expect(report.reasons.some(r => r.includes('operations[0].op'))).toBe(true);
    });
  });

  // ==========================================================================
  // CREATIVITY METRIC TESTS
  // ==========================================================================

  describe('Creativity Metric', () => {
    it('should reward multiple operation types', () => {
      const effect: EffectExpression = {
        target: { type: 'area', radius: 10 },
        operations: [
          { op: 'deal_damage', damageType: 'fire', amount: 100 },
          { op: 'apply_status', status: 'burn', duration: 5 },
          { op: 'push', direction: { dx: 1, dy: 0 }, distance: 10 },
        ],
        timing: { type: 'delayed', delay: 5 },
      };

      const report = service.evaluateEffect(effect);

      // With 3 different op types (1 point), area targeting (1 point), delayed timing (1 point) = 3/5 = 0.6
      expect(report.scores.creativity).toBeGreaterThanOrEqual(0.4);
      expect(report.reasons.some(r => r.includes('operation types'))).toBe(true);
    });

    it('should reward use of conditions', () => {
      const effect: EffectExpression = {
        target: { type: 'self' },
        operations: [
          { op: 'heal', amount: 200 },
        ],
        timing: { type: 'immediate' },
        conditions: [
          { predicate: { op: '<', left: 'caster.health', right: 50 } },
        ],
      };

      const report = service.evaluateEffect(effect);

      expect(report.scores.creativity).toBeGreaterThan(0);
      expect(report.reasons.some(r => r.includes('conditions'))).toBe(true);
    });

    it('should reward advanced operations', () => {
      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [
          {
            op: 'conditional',
            condition: { predicate: 1 },
            then: [
              { op: 'deal_damage', damageType: 'fire', amount: 100 },
            ],
          },
        ],
        timing: { type: 'immediate' },
      };

      const report = service.evaluateEffect(effect);

      expect(report.scores.creativity).toBeGreaterThan(0);
      expect(report.reasons.some(r => r.includes('advanced'))).toBe(true);
    });

    it('should reward creative timing', () => {
      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [
          { op: 'deal_damage', damageType: 'fire', amount: 20 },
        ],
        timing: { type: 'periodic', interval: 1, duration: 10 },
      };

      const report = service.evaluateEffect(effect);

      expect(report.scores.creativity).toBeGreaterThan(0);
      expect(report.reasons.some(r => r.includes('timing'))).toBe(true);
    });

    it('should reward creative targeting', () => {
      const effect: EffectExpression = {
        target: { type: 'cone', angle: 45, length: 15 },
        operations: [
          { op: 'deal_damage', damageType: 'fire', amount: 100 },
        ],
        timing: { type: 'immediate' },
      };

      const report = service.evaluateEffect(effect);

      expect(report.scores.creativity).toBeGreaterThan(0);
      expect(report.reasons.some(r => r.includes('targeting'))).toBe(true);
    });

    it('should give low score for simple single-operation spell', () => {
      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [
          { op: 'deal_damage', damageType: 'fire', amount: 100 },
        ],
        timing: { type: 'immediate' },
      };

      const report = service.evaluateEffect(effect);

      expect(report.scores.creativity).toBeLessThan(0.5);
    });
  });

  // ==========================================================================
  // THRESHOLD ENFORCEMENT TESTS
  // ==========================================================================

  describe('Threshold Enforcement', () => {
    it('should pass all thresholds for high-quality effect', () => {
      const effect: EffectExpression = {
        target: { type: 'area', radius: 10 },
        operations: [
          { op: 'deal_damage', damageType: 'fire', amount: 100 },
          { op: 'apply_status', status: 'burn', duration: 5 },
        ],
        timing: { type: 'immediate' },
      };

      const report = service.evaluateEffect(effect);

      expect(report.passed).toBe(true);
      expect(report.scores.safety).toBeGreaterThanOrEqual(1.0);
      expect(report.scores.balance).toBeGreaterThanOrEqual(0.7);
      expect(report.scores.completeness).toBeGreaterThanOrEqual(1.0);
      expect(report.scores.creativity).toBeGreaterThanOrEqual(0.4);
    });

    it('should fail if safety threshold not met', () => {
      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [
          { op: 'deal_damage', damageType: 'fire', amount: 15000 },
        ],
        timing: { type: 'immediate' },
      };

      const report = service.evaluateEffect(effect);

      expect(report.passed).toBe(false);
      expect(report.scores.safety).toBeLessThan(1.0);
    });

    it('should fail if completeness threshold not met', () => {
      const effect: any = {
        target: { type: 'single' },
        operations: [],
        timing: { type: 'immediate' },
      };

      const report = service.evaluateEffect(effect);

      expect(report.passed).toBe(false);
      expect(report.scores.completeness).toBeLessThan(1.0);
    });

    it('should provide recommendations when failing', () => {
      const effect: EffectExpression = {
        target: { type: 'single' },
        operations: [
          { op: 'deal_damage', damageType: 'fire', amount: 15000 },
        ],
        timing: { type: 'immediate' },
      };

      const report = service.evaluateEffect(effect);

      expect(report.passed).toBe(false);
      expect(report.recommendations).toBeDefined();
      expect(report.recommendations!.length).toBeGreaterThan(0);
    });

    it('should calculate weighted overall score correctly', () => {
      const effect: EffectExpression = {
        target: { type: 'area', radius: 10 },
        operations: [
          { op: 'deal_damage', damageType: 'fire', amount: 100 },
          { op: 'heal', amount: 50 },
        ],
        timing: { type: 'delayed', delay: 5 },
        conditions: [
          { predicate: { op: '>', left: 'caster.mana', right: 50 } },
        ],
      };

      const report = service.evaluateEffect(effect);

      // Overall should be weighted average:
      // safety * 0.3 + balance * 0.2 + completeness * 0.3 + creativity * 0.2
      const expectedOverall =
        report.scores.safety * 0.3 +
        report.scores.balance * 0.2 +
        report.scores.completeness * 0.3 +
        report.scores.creativity * 0.2;

      expect(report.scores.overall).toBeCloseTo(expectedOverall, 5);
    });
  });
});
