/**
 * EffectBlessingService - Divine approval/rejection of LLM-generated effects
 *
 * Final decision-making layer in the effect generation pipeline.
 * Applies threshold-based approval with thematic rejection messages.
 *
 * Architecture: Phase 33 - Safe LLM Effect Generation
 * See: packages/magic/PHASE_33_ARCHITECTURE.md
 */

import type { EffectExpression } from '../EffectExpression.js';
import type { EvaluationReport, EvaluationScores } from '../evaluation/EffectEvaluationService.js';

// ============================================================================
// TYPES
// ============================================================================

export interface BlessingThresholds {
  /** Minimum safety score (default: 1.0 - must be perfect) */
  safety: number;

  /** Minimum balance score (default: 0.7) */
  balance: number;

  /** Minimum completeness score (default: 1.0 - must be perfect) */
  completeness: number;

  /** Minimum creativity score (default: 0.4) */
  creativity: number;

  /** Minimum overall score (default: 0.6) */
  overall: number;
}

export interface BlessingDecision {
  /** Whether the effect is approved */
  blessed: boolean;

  /** Thematic reason for approval/rejection */
  reason: string;

  /** Which deity reviewed (optional) */
  deity?: string;

  /** Evaluation scores that led to this decision */
  scores: EvaluationScores;

  /** Recommendations for improvement (if rejected) */
  recommendations?: string[];

  /** Timestamp of decision */
  timestamp: number;
}

// ============================================================================
// DEFAULT THRESHOLDS
// ============================================================================

export const DEFAULT_THRESHOLDS: BlessingThresholds = {
  safety: 1.0, // Must be perfect
  balance: 0.7,
  completeness: 1.0, // Must be perfect
  creativity: 0.4,
  overall: 0.6,
};

// ============================================================================
// EFFECT BLESSING SERVICE
// ============================================================================

export class EffectBlessingService {
  constructor(
    private thresholds: BlessingThresholds = DEFAULT_THRESHOLDS
  ) {}

  /**
   * Make blessing decision based on evaluation report.
   *
   * Checks each score against thresholds and generates appropriate
   * rejection messages if any threshold is not met.
   *
   * @param report - Evaluation report from EffectEvaluationService
   * @param paradigm - Magic paradigm (optional, affects deity selection)
   * @returns Blessing decision with approval status and reason
   */
  bless(report: EvaluationReport, paradigm?: string): BlessingDecision {
    const scores = report.scores;
    const deity = this.getReviewingDeity(paradigm);

    // Check each threshold
    const failedChecks: Array<{ category: string; score: number; threshold: number }> = [];

    if (scores.safety < this.thresholds.safety) {
      failedChecks.push({ category: 'safety', score: scores.safety, threshold: this.thresholds.safety });
    }

    if (scores.balance < this.thresholds.balance) {
      failedChecks.push({ category: 'balance', score: scores.balance, threshold: this.thresholds.balance });
    }

    if (scores.completeness < this.thresholds.completeness) {
      failedChecks.push({ category: 'completeness', score: scores.completeness, threshold: this.thresholds.completeness });
    }

    if (scores.creativity < this.thresholds.creativity) {
      failedChecks.push({ category: 'creativity', score: scores.creativity, threshold: this.thresholds.creativity });
    }

    if (scores.overall < this.thresholds.overall) {
      failedChecks.push({ category: 'overall', score: scores.overall, threshold: this.thresholds.overall });
    }

    // If any check failed, reject with thematic message
    if (failedChecks.length > 0) {
      const primaryFailure = failedChecks[0]!; // Most critical failure
      const reason = this.generateRejectionMessage(report, deity, primaryFailure.category);

      return {
        blessed: false,
        reason,
        deity,
        scores,
        recommendations: report.recommendations,
        timestamp: Date.now(),
      };
    }

    // All checks passed - blessed!
    const reason = this.generateApprovalMessage(deity, scores);

    return {
      blessed: true,
      reason,
      deity,
      scores,
      timestamp: Date.now(),
    };
  }

  /**
   * Determine which deity reviews this effect based on paradigm.
   *
   * Different magic paradigms are overseen by different divine entities.
   */
  private getReviewingDeity(paradigm?: string): string {
    if (!paradigm) {
      return 'The Arcane Council';
    }

    const deityMap: Record<string, string> = {
      academic: 'The Magisters of Eternal Knowledge',
      divine: 'The Supreme Creator',
      elemental: 'The Primordial Forces',
      shamanic: 'The Spirit Guardians',
      necromancy: 'The Keeper of the Veil',
      illusion: 'The Master of Shadows',
      transmutation: 'The Architect of Change',
      enchantment: 'The Weaver of Destinies',
      conjuration: 'The Gatekeeper',
      abjuration: 'The Defender of Realms',
    };

    return deityMap[paradigm] || 'The Arcane Council';
  }

  /**
   * Generate thematic rejection message based on failure category.
   *
   * Messages are tailored to the deity and the specific reason for rejection.
   */
  private generateRejectionMessage(
    report: EvaluationReport,
    deity: string,
    failedCategory: string
  ): string {
    const messages: Record<string, string[]> = {
      safety: [
        `${deity} deems this magic too dangerous for mortal hands.`,
        `The potential for harm outweighs the benefit - rejected by ${deity}.`,
        `This effect could devastate the realm - ${deity} forbids it.`,
        `${deity} senses destructive power beyond acceptable limits.`,
      ],
      balance: [
        `${deity} finds this magic too powerful or too weak.`,
        `The balance of magic must be preserved - ${deity} denies your request.`,
        `This effect disrupts the natural order - rejected by ${deity}.`,
        `${deity} judges this magic to be poorly calibrated.`,
      ],
      completeness: [
        `${deity} sees flaws in your understanding of this magic.`,
        `The effect is incomplete or poorly formed - study more, says ${deity}.`,
        `This magic lacks coherence - ${deity} demands better craftsmanship.`,
        `${deity} finds your spell construction inadequate.`,
      ],
      creativity: [
        `${deity} finds this effect uninspired and derivative.`,
        `True mastery requires innovation - ${deity} expects more creativity.`,
        `This magic is too mundane - ${deity} seeks originality.`,
        `${deity} judges this effect to lack imagination.`,
      ],
      overall: [
        `${deity} finds this effect unworthy of the arcane tradition.`,
        `Your discovery does not meet the standards of ${deity}.`,
        `This magic is mediocre - ${deity} expects excellence.`,
        `${deity} deems this spell inadequate in multiple aspects.`,
      ],
    };

    const categoryMessages = messages[failedCategory] ?? messages.overall;
    const baseMessage = categoryMessages![Math.floor(Math.random() * categoryMessages!.length)];

    // Add specific issue if available from evaluation report
    if (report.reasons && report.reasons.length > 0) {
      const mainIssue = report.reasons[0]!;
      return `${baseMessage}\n\nSpecific concern: ${mainIssue}`;
    }

    return baseMessage ?? '';
  }

  /**
   * Generate approval message based on quality scores.
   *
   * Exceptional effects (overall > 0.9) get special recognition.
   */
  private generateApprovalMessage(deity: string, scores: EvaluationScores): string {
    if (scores.overall > 0.9) {
      const exceptionalMessages = [
        `${deity} grants divine blessing to this exceptional creation!`,
        `${deity} is impressed by this masterwork of magical craftsmanship.`,
        `This effect demonstrates true mastery - ${deity} bestows approval.`,
        `${deity} recognizes brilliance in this spell - blessed be.`,
      ];
      return exceptionalMessages[Math.floor(Math.random() * exceptionalMessages.length)]!;
    }

    const approvalMessages = [
      `${deity} approves this effect - it meets the divine standards.`,
      `${deity} grants permission for this magic to enter the world.`,
      `This spell has been blessed by ${deity}.`,
      `${deity} finds this effect acceptable and safe.`,
    ];

    return approvalMessages[Math.floor(Math.random() * approvalMessages.length)]!;
  }

  /**
   * Update thresholds (useful for testing or different paradigm standards)
   */
  setThresholds(thresholds: Partial<BlessingThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Get current thresholds
   */
  getThresholds(): BlessingThresholds {
    return { ...this.thresholds };
  }
}
