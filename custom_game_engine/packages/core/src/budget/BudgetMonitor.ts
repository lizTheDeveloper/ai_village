/**
 * Budget warning system.
 * Monitors budget usage and generates warnings.
 */

import { BudgetManager } from './BudgetManager.js';

export type BudgetWarningLevel = 'none' | 'warning' | 'critical' | 'exceeded';

export interface BudgetWarning {
  level: BudgetWarningLevel;
  message: string;
  percentUsed: number;
  budgetType: 'daily' | 'monthly';
  actionRequired: boolean;
  canContinue: boolean;
}

export class BudgetMonitor {
  private budgetManager: BudgetManager;
  private lastWarningLevel: BudgetWarningLevel = 'none';

  constructor(budgetManager: BudgetManager) {
    this.budgetManager = budgetManager;
  }

  /**
   * Check current budget status and return warnings.
   */
  public checkBudget(): BudgetWarning[] {
    const stats = this.budgetManager.getStats();
    const warnings: BudgetWarning[] = [];

    // Check daily budget
    if (stats.config.enabled && stats.config.dailyBudgetUSD > 0) {
      const dailyWarning = this.checkBudgetType(
        'daily',
        stats.dailySpendPercent,
        stats.config.budgetWarningThreshold,
        stats.config.dailyBudgetUSD,
        stats.config.currentDailySpendUSD,
        stats.config.pauseOnBudgetExceeded
      );

      if (dailyWarning) {
        warnings.push(dailyWarning);
      }
    }

    // Check monthly budget
    if (stats.config.enabled && stats.config.monthlyBudgetUSD > 0) {
      const monthlyWarning = this.checkBudgetType(
        'monthly',
        stats.monthlySpendPercent,
        stats.config.budgetWarningThreshold,
        stats.config.monthlyBudgetUSD,
        stats.config.currentMonthlySpendUSD,
        stats.config.pauseOnBudgetExceeded
      );

      if (monthlyWarning) {
        warnings.push(monthlyWarning);
      }
    }

    // Emit events for warning level changes
    const currentLevel = this.getWarningLevel();
    if (currentLevel !== this.lastWarningLevel) {
      this.emitWarningEvent(currentLevel, warnings);
      this.lastWarningLevel = currentLevel;
    }

    return warnings;
  }

  /**
   * Get the highest warning level currently active.
   */
  public getWarningLevel(): BudgetWarningLevel {
    const warnings = this.checkBudget();

    if (warnings.length === 0) {
      return 'none';
    }

    // Return the highest severity level
    const levels: BudgetWarningLevel[] = ['exceeded', 'critical', 'warning', 'none'];
    for (const level of levels) {
      if (warnings.some(w => w.level === level)) {
        return level;
      }
    }

    return 'none';
  }

  /**
   * Check if an LLM call should be allowed.
   */
  public canMakeLLMCall(): boolean {
    return this.budgetManager.canMakeLLMCall();
  }

  /**
   * Check a specific budget type (daily or monthly).
   */
  private checkBudgetType(
    type: 'daily' | 'monthly',
    percentUsed: number,
    warningThreshold: number,
    budgetUSD: number,
    spendUSD: number,
    pauseOnExceeded: boolean
  ): BudgetWarning | null {
    // None: < warning threshold
    if (percentUsed < warningThreshold) {
      return null;
    }

    // Warning: >= warning threshold, < 100%
    if (percentUsed < 1.0) {
      return {
        level: 'warning',
        message: this.formatWarningMessage(type, 'warning', percentUsed, budgetUSD, spendUSD),
        percentUsed,
        budgetType: type,
        actionRequired: false,
        canContinue: true
      };
    }

    // Critical: >= 100%, < 110%
    if (percentUsed < 1.1) {
      return {
        level: 'critical',
        message: this.formatWarningMessage(type, 'critical', percentUsed, budgetUSD, spendUSD),
        percentUsed,
        budgetType: type,
        actionRequired: pauseOnExceeded,
        canContinue: !pauseOnExceeded
      };
    }

    // Exceeded: >= 110%
    return {
      level: 'exceeded',
      message: this.formatWarningMessage(type, 'exceeded', percentUsed, budgetUSD, spendUSD),
      percentUsed,
      budgetType: type,
      actionRequired: pauseOnExceeded,
      canContinue: !pauseOnExceeded
    };
  }

  /**
   * Format a warning message.
   */
  private formatWarningMessage(
    type: 'daily' | 'monthly',
    level: BudgetWarningLevel,
    percentUsed: number,
    budgetUSD: number,
    spendUSD: number
  ): string {
    const percentStr = (percentUsed * 100).toFixed(1);
    const spendStr = spendUSD.toFixed(2);
    const budgetStr = budgetUSD.toFixed(2);

    const typeStr = type === 'daily' ? 'daily' : 'monthly';

    switch (level) {
      case 'warning':
        return `You have used ${percentStr}% of your ${typeStr} LLM budget ($${spendStr} / $${budgetStr})`;

      case 'critical':
        return `${type === 'daily' ? 'Daily' : 'Monthly'} budget exceeded: $${spendStr} / $${budgetStr} (${percentStr}%)`;

      case 'exceeded':
        return `${type === 'daily' ? 'Daily' : 'Monthly'} budget significantly exceeded: $${spendStr} / $${budgetStr} (${percentStr}%)`;

      default:
        return `Budget status: $${spendStr} / $${budgetStr} (${percentStr}%)`;
    }
  }

  /**
   * Emit a budget warning event.
   */
  private emitWarningEvent(level: BudgetWarningLevel, warnings: BudgetWarning[]): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Emit specific event based on level
    switch (level) {
      case 'warning':
        window.dispatchEvent(new CustomEvent('budget:warning', {
          detail: { level, warnings }
        }));
        break;

      case 'critical':
      case 'exceeded':
        window.dispatchEvent(new CustomEvent('budget:exceeded', {
          detail: { level, warnings }
        }));
        break;
    }
  }
}
