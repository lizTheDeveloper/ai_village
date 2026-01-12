/**
 * EffectEvaluationService - Quality evaluation for LLM-generated effects
 *
 * Ported from Python DeepEval metrics (effect_generation_benchmark.py)
 * Evaluates effects on four dimensions: Safety, Balance, Completeness, Creativity
 *
 * Phase 33: Safe LLM Effect Generation
 */

import type { EffectExpression, EffectOperation } from '../EffectExpression.js';

// ============================================================================
// TYPES
// ============================================================================

export interface EvaluationScores {
  /** Safety: 0-1 (must be 1.0 to pass - no security violations) */
  safety: number;

  /** Balance: 0-1 (compared to existing spells, threshold 0.7) */
  balance: number;

  /** Completeness: 0-1 (all required fields, valid structure, threshold 1.0) */
  completeness: number;

  /** Creativity: 0-1 (novelty, interesting mechanics, threshold 0.4) */
  creativity: number;

  /** Overall: Weighted average of all scores */
  overall: number;
}

export interface EvaluationReport {
  /** Evaluation scores */
  scores: EvaluationScores;

  /** Whether effect passes all thresholds */
  passed: boolean;

  /** Reasons for failure or notable issues */
  reasons: string[];

  /** Suggestions for improvement (optional) */
  recommendations?: string[];
}

interface MetricResult {
  score: number;
  reasons: string[];
}

// ============================================================================
// EFFECT EVALUATION SERVICE
// ============================================================================

export class EffectEvaluationService {
  /**
   * Evaluate an EffectExpression for quality.
   *
   * Thresholds (from architecture):
   * - Safety: 1.0 (must be perfect)
   * - Balance: 0.7
   * - Completeness: 1.0 (must be perfect)
   * - Creativity: 0.4
   *
   * @param effect - EffectExpression to evaluate
   * @returns Evaluation report with scores and pass/fail
   */
  evaluateEffect(effect: EffectExpression): EvaluationReport {
    // Run completeness first to catch structural issues
    const completeness = this.evaluateCompleteness(effect);

    // Only run other metrics if effect is structurally sound
    const safety = completeness.score > 0 ? this.evaluateSafety(effect) : { score: 0, reasons: [] };
    const balance = completeness.score > 0 ? this.evaluateBalance(effect) : { score: 0, reasons: [] };
    const creativity = completeness.score > 0 ? this.evaluateCreativity(effect) : { score: 0, reasons: [] };

    // Calculate weighted overall score
    // Safety and Completeness are critical (higher weight)
    const overall = (
      safety.score * 0.3 +
      balance.score * 0.2 +
      completeness.score * 0.3 +
      creativity.score * 0.2
    );

    const scores: EvaluationScores = {
      safety: safety.score,
      balance: balance.score,
      completeness: completeness.score,
      creativity: creativity.score,
      overall,
    };

    // Check thresholds
    const thresholds = {
      safety: 1.0,
      balance: 0.7,
      completeness: 1.0,
      creativity: 0.4,
    };

    const passed =
      safety.score >= thresholds.safety &&
      balance.score >= thresholds.balance &&
      completeness.score >= thresholds.completeness &&
      creativity.score >= thresholds.creativity;

    // Collect all reasons
    const reasons: string[] = [
      ...safety.reasons,
      ...balance.reasons,
      ...completeness.reasons,
      ...creativity.reasons,
    ];

    // Generate recommendations
    const recommendations: string[] = [];

    if (safety.score < thresholds.safety) {
      recommendations.push('Reduce damage, spawn counts, or chain depth to meet safety limits');
    }

    if (balance.score < thresholds.balance) {
      if (this.getTotalDamage(effect) > 5000) {
        recommendations.push('Consider reducing damage values to be more balanced');
      }
      if (effect.operations && effect.operations.length > 10) {
        recommendations.push('Simplify the effect by reducing the number of operations');
      }
    }

    if (completeness.score < thresholds.completeness) {
      recommendations.push('Ensure all required fields are present and valid');
    }

    if (creativity.score < thresholds.creativity) {
      recommendations.push('Add more diverse operation types or use conditions/timing creatively');
    }

    return {
      scores,
      passed,
      reasons: reasons.length > 0 ? reasons : ['All checks passed'],
      recommendations: recommendations.length > 0 ? recommendations : undefined,
    };
  }

  // ==========================================================================
  // SAFETY METRIC
  // ==========================================================================

  /**
   * Safety evaluation (threshold 1.0 - must be perfect)
   *
   * Checks:
   * - Damage ≤ 10,000
   * - Spawns ≤ 50
   * - Chain depth ≤ 5
   * - All numeric values are finite (no NaN, Infinity)
   *
   * Ported from EffectSafetyMetric in effect_generation_benchmark.py
   */
  private evaluateSafety(effect: EffectExpression): MetricResult {
    const violations: string[] = [];

    // Check all operations (guard against missing operations)
    if (!effect.operations || !Array.isArray(effect.operations)) {
      return { score: 0, reasons: ['Missing or invalid operations array'] };
    }

    for (const op of effect.operations) {
      // Check damage limits
      if (op.op === 'deal_damage') {
        const damage = this.extractNumeric(op.amount);
        if (damage > 10000) {
          violations.push(`Damage ${damage} exceeds max 10,000`);
        }
        if (!this.isFinite(damage)) {
          violations.push(`Damage ${damage} is not finite`);
        }
      }

      // Check spawn limits
      if (op.op === 'spawn_entity' || op.op === 'spawn_item') {
        const count = this.extractNumeric(op.count);
        if (count > 50) {
          violations.push(`Spawn count ${count} exceeds max 50`);
        }
        if (!this.isFinite(count)) {
          violations.push(`Spawn count ${count} is not finite`);
        }
      }

      // Check heal limits (sanity check)
      if (op.op === 'heal') {
        const healing = this.extractNumeric(op.amount);
        if (healing > 10000) {
          violations.push(`Healing ${healing} exceeds max 10,000`);
        }
        if (!this.isFinite(healing)) {
          violations.push(`Healing ${healing} is not finite`);
        }
      }
    }

    // Check chain depth
    const chainDepth = this.calculateChainDepth(effect.operations);
    if (chainDepth > 5) {
      violations.push(`Chain depth ${chainDepth} exceeds max 5`);
    }

    // Calculate score (0-1 based on violations)
    const score = violations.length === 0 ? 1.0 : Math.max(0.0, 1.0 - violations.length * 0.25);

    return {
      score,
      reasons: violations.length > 0 ? violations : [],
    };
  }

  // ==========================================================================
  // BALANCE METRIC
  // ==========================================================================

  /**
   * Balance evaluation (threshold 0.7)
   *
   * Checks:
   * - Damage in reasonable range (5-5000)
   * - Not too many operations (≤10)
   * - Area effects have reasonable radius (<50)
   * - No extreme values
   *
   * Ported from EffectBalanceMetric in effect_generation_benchmark.py
   */
  private evaluateBalance(effect: EffectExpression): MetricResult {
    const issues: string[] = [];

    // Guard against missing operations
    if (!effect.operations || !Array.isArray(effect.operations)) {
      return { score: 0.5, reasons: ['No operations to evaluate balance'] };
    }

    // Check operation count
    const opCount = effect.operations.length;
    if (opCount > 10) {
      issues.push(`Too many operations (${opCount} > 10)`);
    }

    // Check damage/healing values
    for (const op of effect.operations) {
      if (op.op === 'deal_damage') {
        const damage = this.extractNumeric(op.amount);
        if (damage > 5000) {
          issues.push(`Very high damage (${damage})`);
        } else if (damage < 5) {
          issues.push(`Very low damage (${damage})`);
        }
      }

      if (op.op === 'heal') {
        const healing = this.extractNumeric(op.amount);
        if (healing > 5000) {
          issues.push(`Very high healing (${healing})`);
        }
      }
    }

    // Check target radius (guard against missing target)
    if (effect.target && (effect.target.type === 'area' || effect.target.type === 'cone')) {
      const radius = effect.target.radius ?? 0;
      if (radius > 50) {
        issues.push(`Very large target radius (${radius})`);
      }
    }

    // Calculate score (minor issues reduce score less)
    const score = Math.max(0.0, 1.0 - issues.length * 0.15);

    return {
      score,
      reasons: issues,
    };
  }

  // ==========================================================================
  // COMPLETENESS METRIC
  // ==========================================================================

  /**
   * Completeness evaluation (threshold 1.0 - must be perfect)
   *
   * Checks:
   * - Required fields present (target, operations, timing)
   * - Operations array non-empty
   * - Valid operation types
   * - Coherent structure
   *
   * Ported from EffectCompletenessMetric in effect_generation_benchmark.py
   */
  private evaluateCompleteness(effect: EffectExpression): MetricResult {
    const missing: string[] = [];

    // Required top-level fields
    if (!effect.target) {
      missing.push('target');
    } else if (!effect.target.type) {
      missing.push('target.type');
    }

    if (!effect.operations) {
      missing.push('operations');
    } else if (!Array.isArray(effect.operations) || effect.operations.length === 0) {
      missing.push('operations (must be non-empty array)');
    }

    if (!effect.timing) {
      missing.push('timing');
    } else if (!effect.timing.type) {
      missing.push('timing.type');
    }

    // Validate operation types
    const validOps = new Set([
      'modify_stat',
      'set_stat',
      'apply_status',
      'remove_status',
      'deal_damage',
      'heal',
      'teleport',
      'push',
      'pull',
      'spawn_entity',
      'spawn_item',
      'transform_entity',
      'transform_material',
      'emit_event',
      'chain_effect',
      'trigger_effect',
      'conditional',
      'repeat',
      'delay',
    ]);

    if (effect.operations) {
      for (let i = 0; i < effect.operations.length; i++) {
        const op = effect.operations[i];
        if (!op || typeof op !== 'object') {
          missing.push(`operations[${i}] (must be object)`);
        } else if (!op.op) {
          missing.push(`operations[${i}].op`);
        } else if (!validOps.has(op.op)) {
          missing.push(`operations[${i}].op (invalid: ${op.op})`);
        }
      }
    }

    // Calculate score
    const score = missing.length === 0 ? 1.0 : Math.max(0.0, 1.0 - missing.length * 0.2);

    return {
      score,
      reasons: missing,
    };
  }

  // ==========================================================================
  // CREATIVITY METRIC
  // ==========================================================================

  /**
   * Creativity evaluation (threshold 0.4)
   *
   * Rewards:
   * - Multiple operation types (diversity)
   * - Use of conditions
   * - Advanced operations (chain, conditional, repeat)
   * - Creative timing (delayed, periodic)
   *
   * Ported from EffectCreativityMetric in effect_generation_benchmark.py
   */
  private evaluateCreativity(effect: EffectExpression): MetricResult {
    let creativityPoints = 0;
    const maxPoints = 5;
    const reasons: string[] = [];

    // Guard against missing operations
    if (!effect.operations || !Array.isArray(effect.operations)) {
      return { score: 0, reasons: ['No operations to evaluate creativity'] };
    }

    // Point 1: Multiple operation types (diversity)
    const opTypes = new Set(effect.operations.map((op) => op.op));
    if (opTypes.size >= 2) {
      creativityPoints += 1;
      reasons.push(`Uses ${opTypes.size} different operation types`);
    }

    // Point 2: Uses conditions
    if (effect.conditions && effect.conditions.length > 0) {
      creativityPoints += 1;
      reasons.push('Uses conditions for dynamic behavior');
    }

    // Point 3: Uses advanced operations
    const advancedOps = new Set(['chain_effect', 'trigger_effect', 'conditional', 'repeat', 'delay']);
    const hasAdvancedOp = effect.operations.some((op) => advancedOps.has(op.op));
    if (hasAdvancedOp) {
      creativityPoints += 1;
      reasons.push('Uses advanced control flow operations');
    }

    // Point 4: Creative timing (guard against missing timing)
    if (effect.timing && (effect.timing.type === 'delayed' || effect.timing.type === 'periodic')) {
      creativityPoints += 1;
      reasons.push(`Creative timing: ${effect.timing.type}`);
    }

    // Point 5: Appropriate target selection (guard against missing target)
    if (
      effect.target &&
      (effect.target.type === 'area' ||
        effect.target.type === 'cone' ||
        effect.target.type === 'line')
    ) {
      creativityPoints += 1;
      reasons.push(`Creative targeting: ${effect.target.type}`);
    }

    const score = creativityPoints / maxPoints;

    return {
      score,
      reasons: reasons.length > 0 ? reasons : [`Creativity: ${creativityPoints}/${maxPoints} points`],
    };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Extract numeric value from Expression or literal.
   * Handles literals, expressions, and nested operations conservatively.
   */
  private extractNumeric(value: any): number {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'object' && value !== null) {
      // For expressions, estimate conservatively
      if ('op' in value) {
        // Binary expression - try to extract
        const left = this.extractNumeric(value.left ?? 0);
        const right = this.extractNumeric(value.right ?? 0);

        switch (value.op) {
          case '+':
            return left + right;
          case '-':
            return left - right;
          case '*':
            return left * right;
          case '/':
            return right !== 0 ? left / right : 0;
          case '**':
            return Math.pow(left, right);
          default:
            // For comparison/logical ops, assume max value
            return 10000;
        }
      }

      if ('fn' in value) {
        // Function expression - assume max for safety
        return 10000;
      }
    }

    // String references (variables) - assume max for safety
    if (typeof value === 'string') {
      return 10000;
    }

    return 0;
  }

  /**
   * Check if a value is finite (not NaN or Infinity)
   */
  private isFinite(value: number): boolean {
    return Number.isFinite(value);
  }

  /**
   * Calculate maximum chain depth in operations.
   *
   * Chain depth is the count of chain_effect operations at any level.
   * We recursively count chains in nested operations (conditionals, repeats, delays).
   */
  private calculateChainDepth(operations: EffectOperation[]): number {
    let chainCount = 0;

    for (const op of operations) {
      // Count chain_effect operations
      if (op.op === 'chain_effect') {
        chainCount++;
      }

      // Recursively check nested operations
      if (op.op === 'conditional') {
        const thenCount = this.calculateChainDepth(op.then ?? []);
        const elseCount = this.calculateChainDepth(op.else ?? []);
        chainCount += Math.max(thenCount, elseCount);
      }

      if (op.op === 'repeat') {
        chainCount += this.calculateChainDepth(op.operations ?? []);
      }

      if (op.op === 'delay') {
        chainCount += this.calculateChainDepth(op.then ?? []);
      }
    }

    return chainCount;
  }

  /**
   * Get total damage from all operations (helper for recommendations)
   */
  private getTotalDamage(effect: EffectExpression): number {
    if (!effect.operations || !Array.isArray(effect.operations)) {
      return 0;
    }

    let totalDamage = 0;

    for (const op of effect.operations) {
      if (op.op === 'deal_damage') {
        totalDamage += this.extractNumeric(op.amount);
      }
    }

    return totalDamage;
  }
}
