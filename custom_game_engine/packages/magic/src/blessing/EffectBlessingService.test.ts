/**
 * EffectBlessingService Tests
 *
 * Tests for the divine blessing/rejection system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EffectBlessingService, DEFAULT_THRESHOLDS, type BlessingThresholds } from './EffectBlessingService.js';
import type { EvaluationReport, EvaluationScores } from '../evaluation/EffectEvaluationService.js';

describe('EffectBlessingService', () => {
  let service: EffectBlessingService;

  beforeEach(() => {
    service = new EffectBlessingService();
  });

  describe('Blessing Decisions', () => {
    it('should bless effect that meets all thresholds', () => {
      const report: EvaluationReport = {
        scores: {
          safety: 1.0,
          balance: 0.8,
          completeness: 1.0,
          creativity: 0.5,
          overall: 0.85,
        },
        passed: true,
        reasons: ['All checks passed'],
      };

      const decision = service.bless(report);

      expect(decision.blessed).toBe(true);
      expect(decision.reason).toBeTruthy();
      expect(decision.reason.length).toBeGreaterThan(0);
      expect(decision.deity).toBe('The Arcane Council');
      expect(decision.scores).toEqual(report.scores);
      expect(decision.timestamp).toBeGreaterThan(0);
    });

    it('should reject effect with low safety score', () => {
      const report: EvaluationReport = {
        scores: {
          safety: 0.5, // Below threshold of 1.0
          balance: 0.8,
          completeness: 1.0,
          creativity: 0.5,
          overall: 0.7,
        },
        passed: false,
        reasons: ['Damage 15000 exceeds max 10,000'],
      };

      const decision = service.bless(report);

      expect(decision.blessed).toBe(false);
      expect(decision.reason).toBeTruthy();
      expect(decision.reason.length).toBeGreaterThan(0);
    });

    it('should reject effect with low balance score', () => {
      const report: EvaluationReport = {
        scores: {
          safety: 1.0,
          balance: 0.3, // Below threshold of 0.7
          completeness: 1.0,
          creativity: 0.5,
          overall: 0.7,
        },
        passed: false,
        reasons: ['Very high damage (8000)'],
      };

      const decision = service.bless(report);

      expect(decision.blessed).toBe(false);
      expect(decision.reason).toBeTruthy();
    });

    it('should reject effect with low completeness score', () => {
      const report: EvaluationReport = {
        scores: {
          safety: 1.0,
          balance: 0.8,
          completeness: 0.6, // Below threshold of 1.0
          creativity: 0.5,
          overall: 0.7,
        },
        passed: false,
        reasons: ['operations (must be non-empty array)'],
      };

      const decision = service.bless(report);

      expect(decision.blessed).toBe(false);
      expect(decision.reason).toBeTruthy();
    });

    it('should reject effect with low creativity score', () => {
      const report: EvaluationReport = {
        scores: {
          safety: 1.0,
          balance: 0.8,
          completeness: 1.0,
          creativity: 0.2, // Below threshold of 0.4
          overall: 0.7,
        },
        passed: false,
        reasons: ['Creativity: 1/5 points'],
      };

      const decision = service.bless(report);

      expect(decision.blessed).toBe(false);
      expect(decision.reason).toBeTruthy();
    });

    it('should reject effect with low overall score', () => {
      const report: EvaluationReport = {
        scores: {
          safety: 1.0,
          balance: 0.7,
          completeness: 1.0,
          creativity: 0.4,
          overall: 0.5, // Below threshold of 0.6
        },
        passed: false,
        reasons: ['Overall score below threshold'],
      };

      const decision = service.bless(report);

      expect(decision.blessed).toBe(false);
      expect(decision.reason).toBeTruthy();
    });

    it('should give exceptional message for very high quality effects', () => {
      const report: EvaluationReport = {
        scores: {
          safety: 1.0,
          balance: 0.95,
          completeness: 1.0,
          creativity: 0.9,
          overall: 0.96,
        },
        passed: true,
        reasons: ['All checks passed'],
      };

      const decision = service.bless(report);

      expect(decision.blessed).toBe(true);
      // High quality messages vary, just check it's non-empty
      expect(decision.reason).toBeTruthy();
      expect(decision.reason.length).toBeGreaterThan(0);
    });
  });

  describe('Deity Selection', () => {
    it('should use Arcane Council for no paradigm', () => {
      const report = createValidReport();
      const decision = service.bless(report);

      expect(decision.deity).toBe('The Arcane Council');
    });

    it('should use correct deity for academic paradigm', () => {
      const report = createValidReport();
      const decision = service.bless(report, 'academic');

      expect(decision.deity).toBe('The Magisters of Eternal Knowledge');
    });

    it('should use correct deity for divine paradigm', () => {
      const report = createValidReport();
      const decision = service.bless(report, 'divine');

      expect(decision.deity).toBe('The Supreme Creator');
    });

    it('should use correct deity for elemental paradigm', () => {
      const report = createValidReport();
      const decision = service.bless(report, 'elemental');

      expect(decision.deity).toBe('The Primordial Forces');
    });

    it('should use correct deity for necromancy paradigm', () => {
      const report = createValidReport();
      const decision = service.bless(report, 'necromancy');

      expect(decision.deity).toBe('The Keeper of the Veil');
    });

    it('should use Arcane Council for unknown paradigm', () => {
      const report = createValidReport();
      const decision = service.bless(report, 'unknown_paradigm');

      expect(decision.deity).toBe('The Arcane Council');
    });
  });

  describe('Threshold Configuration', () => {
    it('should use default thresholds', () => {
      const thresholds = service.getThresholds();

      expect(thresholds).toEqual(DEFAULT_THRESHOLDS);
    });

    it('should allow custom thresholds in constructor', () => {
      const customThresholds: BlessingThresholds = {
        safety: 0.8,
        balance: 0.5,
        completeness: 0.9,
        creativity: 0.3,
        overall: 0.5,
      };

      const customService = new EffectBlessingService(customThresholds);
      expect(customService.getThresholds()).toEqual(customThresholds);
    });

    it('should allow updating thresholds', () => {
      service.setThresholds({ safety: 0.8, creativity: 0.2 });

      const thresholds = service.getThresholds();
      expect(thresholds.safety).toBe(0.8);
      expect(thresholds.creativity).toBe(0.2);
      expect(thresholds.balance).toBe(DEFAULT_THRESHOLDS.balance); // Unchanged
    });

    it('should apply custom thresholds in blessing decisions', () => {
      service.setThresholds({ safety: 0.5 }); // Lower safety threshold

      const report: EvaluationReport = {
        scores: {
          safety: 0.6, // Would fail default threshold, passes custom
          balance: 0.8,
          completeness: 1.0,
          creativity: 0.5,
          overall: 0.7,
        },
        passed: true,
        reasons: [],
      };

      const decision = service.bless(report);
      expect(decision.blessed).toBe(true);
    });
  });

  describe('Rejection Messages', () => {
    it('should include specific issue in rejection message', () => {
      const report: EvaluationReport = {
        scores: {
          safety: 0.5,
          balance: 0.8,
          completeness: 1.0,
          creativity: 0.5,
          overall: 0.7,
        },
        passed: false,
        reasons: ['Damage 15000 exceeds max 10,000'],
      };

      const decision = service.bless(report);

      expect(decision.reason).toContain('Damage 15000 exceeds max 10,000');
    });

    it('should provide recommendations for rejected effects', () => {
      const report: EvaluationReport = {
        scores: {
          safety: 0.5,
          balance: 0.3,
          completeness: 0.8,
          creativity: 0.2,
          overall: 0.4,
        },
        passed: false,
        reasons: ['Multiple issues'],
        recommendations: [
          'Reduce damage values',
          'Simplify operations',
          'Add more operation types',
        ],
      };

      const decision = service.bless(report);

      expect(decision.recommendations).toEqual(report.recommendations);
    });
  });

  describe('Edge Cases', () => {
    it('should handle perfect scores (all 1.0)', () => {
      const report: EvaluationReport = {
        scores: {
          safety: 1.0,
          balance: 1.0,
          completeness: 1.0,
          creativity: 1.0,
          overall: 1.0,
        },
        passed: true,
        reasons: ['All checks passed'],
      };

      const decision = service.bless(report);

      expect(decision.blessed).toBe(true);
      expect(decision.reason).toBeTruthy();
      expect(decision.reason.length).toBeGreaterThan(0);
    });

    it('should handle zero scores', () => {
      const report: EvaluationReport = {
        scores: {
          safety: 0,
          balance: 0,
          completeness: 0,
          creativity: 0,
          overall: 0,
        },
        passed: false,
        reasons: ['Catastrophic failure'],
      };

      const decision = service.bless(report);

      expect(decision.blessed).toBe(false);
    });

    it('should handle borderline scores (exactly at threshold)', () => {
      const report: EvaluationReport = {
        scores: {
          safety: 1.0,
          balance: 0.7, // Exactly at threshold
          completeness: 1.0,
          creativity: 0.4, // Exactly at threshold
          overall: 0.6, // Exactly at threshold
        },
        passed: true,
        reasons: [],
      };

      const decision = service.bless(report);

      expect(decision.blessed).toBe(true);
    });

    it('should handle just below threshold', () => {
      const report: EvaluationReport = {
        scores: {
          safety: 1.0,
          balance: 0.69999, // Just below 0.7
          completeness: 1.0,
          creativity: 0.4,
          overall: 0.6,
        },
        passed: false,
        reasons: ['Balance slightly below threshold'],
      };

      const decision = service.bless(report);

      expect(decision.blessed).toBe(false);
    });
  });
});

// ============================================================================
// Test Helpers
// ============================================================================

function createValidReport(): EvaluationReport {
  return {
    scores: {
      safety: 1.0,
      balance: 0.8,
      completeness: 1.0,
      creativity: 0.5,
      overall: 0.8,
    },
    passed: true,
    reasons: ['All checks passed'],
  };
}
