/**
 * Budget management system.
 * Coordinates cost tracking, estimation, and budget enforcement.
 */

import { CostTracker } from './CostTracker.js';
import { CostEstimator, CostEstimate } from './CostEstimator.js';

export interface BudgetConfig {
  // Budget limits
  dailyBudgetUSD: number;
  monthlyBudgetUSD: number;
  budgetWarningThreshold: number;  // 0.0 - 1.0

  // Budget state
  enabled: boolean;
  pauseOnBudgetExceeded: boolean;

  // Tracking
  currentDailySpendUSD: number;
  currentMonthlySpendUSD: number;
  lastResetTime: number;
  lastMonthlyResetTime: number;
}

export interface BudgetStats {
  config: BudgetConfig;
  estimate: CostEstimate;
  dailySpendPercent: number;
  monthlySpendPercent: number;
  isWarning: boolean;
  isExceeded: boolean;
}

export class BudgetManager {
  private costTracker: CostTracker;
  private costEstimator: CostEstimator;
  private config: BudgetConfig;

  constructor() {
    this.costTracker = new CostTracker();
    this.costEstimator = new CostEstimator();
    this.config = this.getDefaultConfig();

    // Auto-save every 5 minutes
    if (typeof window !== 'undefined') {
      setInterval(() => this.save(), 5 * 60 * 1000);

      // Save before unload
      window.addEventListener('beforeunload', () => this.save());
    }

    // Check for daily/monthly resets on startup
    this.checkResets();
  }

  /**
   * Record a completed LLM call.
   */
  public recordCall(
    providerId: string,
    providerName: string,
    inputTokens: number,
    outputTokens: number,
    costUSD: number,
    inputCostPer1M: number,
    outputCostPer1M: number
  ): void {
    const now = Date.now();

    // Record in cost tracker
    this.costTracker.recordCall(
      providerId,
      providerName,
      inputTokens,
      outputTokens,
      costUSD,
      inputCostPer1M,
      outputCostPer1M
    );

    // Record in cost estimator
    this.costEstimator.recordCall(now, inputTokens, outputTokens, costUSD);

    // Update current spend
    this.config.currentDailySpendUSD += costUSD;
    this.config.currentMonthlySpendUSD += costUSD;

    // Check for resets
    this.checkResets();
  }

  /**
   * Get current budget statistics.
   */
  public getStats(): BudgetStats {
    const estimate = this.costEstimator.getEstimate(
      this.config.dailyBudgetUSD,
      this.config.monthlyBudgetUSD,
      this.config.currentDailySpendUSD,
      this.config.currentMonthlySpendUSD
    );

    const dailySpendPercent = this.config.dailyBudgetUSD > 0
      ? this.config.currentDailySpendUSD / this.config.dailyBudgetUSD
      : 0;

    const monthlySpendPercent = this.config.monthlyBudgetUSD > 0
      ? this.config.currentMonthlySpendUSD / this.config.monthlyBudgetUSD
      : 0;

    const isWarning = this.config.enabled && (
      dailySpendPercent >= this.config.budgetWarningThreshold ||
      monthlySpendPercent >= this.config.budgetWarningThreshold
    );

    const isExceeded = this.config.enabled && (
      dailySpendPercent >= 1.0 ||
      monthlySpendPercent >= 1.0
    );

    return {
      config: { ...this.config },
      estimate,
      dailySpendPercent,
      monthlySpendPercent,
      isWarning,
      isExceeded
    };
  }

  /**
   * Check if an LLM call should be allowed based on budget.
   */
  public canMakeLLMCall(): boolean {
    if (!this.config.enabled) {
      return true;
    }

    if (!this.config.pauseOnBudgetExceeded) {
      return true;
    }

    const stats = this.getStats();
    return !stats.isExceeded;
  }

  /**
   * Get budget configuration.
   */
  public getConfig(): BudgetConfig {
    return { ...this.config };
  }

  /**
   * Update budget configuration.
   */
  public updateConfig(updates: Partial<BudgetConfig>): void {
    this.config = {
      ...this.config,
      ...updates
    };
    this.save();
  }

  /**
   * Get the cost tracker instance.
   */
  public getCostTracker(): CostTracker {
    return this.costTracker;
  }

  /**
   * Get the cost estimator instance.
   */
  public getCostEstimator(): CostEstimator {
    return this.costEstimator;
  }

  /**
   * Check if daily or monthly reset is needed.
   */
  private checkResets(): void {
    const now = Date.now();
    const nowDate = new Date(now);

    // Check daily reset (midnight local time)
    const lastResetDate = new Date(this.config.lastResetTime);
    if (nowDate.getDate() !== lastResetDate.getDate() ||
        nowDate.getMonth() !== lastResetDate.getMonth() ||
        nowDate.getFullYear() !== lastResetDate.getFullYear()) {
      this.resetDaily();
    }

    // Check monthly reset (1st of month)
    const lastMonthlyResetDate = new Date(this.config.lastMonthlyResetTime);
    if (nowDate.getMonth() !== lastMonthlyResetDate.getMonth() ||
        nowDate.getFullYear() !== lastMonthlyResetDate.getFullYear()) {
      this.resetMonthly();
    }
  }

  /**
   * Reset daily budget counters.
   */
  private resetDaily(): void {
    this.config.currentDailySpendUSD = 0;
    this.config.lastResetTime = Date.now();
    this.costTracker.resetDaily();
    this.save();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('budget:reset_daily'));
    }
  }

  /**
   * Reset monthly budget counters.
   */
  private resetMonthly(): void {
    this.config.currentMonthlySpendUSD = 0;
    this.config.lastMonthlyResetTime = Date.now();
    this.costTracker.resetMonthly();
    this.save();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('budget:reset_monthly'));
    }
  }

  /**
   * Save to localStorage.
   */
  public save(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const data = {
        version: '1.0.0',
        lastSaved: Date.now(),
        config: this.config,
        costTracker: this.costTracker.toJSON(),
        costEstimator: this.costEstimator.toJSON()
      };

      localStorage.setItem('llm_budget', JSON.stringify(data));
    } catch (error) {
      console.error('[BudgetManager] Failed to save:', error);
    }
  }

  /**
   * Load from localStorage.
   */
  public load(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const json = localStorage.getItem('llm_budget');
      if (!json) {
        return;
      }

      const data = JSON.parse(json);

      if (!data.version || !data.config) {
        throw new Error('Invalid budget data format');
      }

      this.config = data.config;

      if (data.costTracker) {
        this.costTracker.fromJSON(data.costTracker);
      }

      if (data.costEstimator) {
        this.costEstimator.fromJSON(data.costEstimator);
      }

      // Check for resets after loading
      this.checkResets();
    } catch (error) {
      console.error('[BudgetManager] Failed to load:', error);
    }
  }

  /**
   * Export budget data to JSON.
   */
  public export(): string {
    return JSON.stringify({
      version: '1.0.0',
      exportTime: Date.now(),
      config: this.config,
      costTracker: this.costTracker.toJSON(),
      costEstimator: this.costEstimator.toJSON()
    }, null, 2);
  }

  /**
   * Import budget data from JSON.
   */
  public import(json: string): void {
    const data = JSON.parse(json);

    if (!data.version || !data.config) {
      throw new Error('Invalid budget import data');
    }

    this.config = data.config;

    if (data.costTracker) {
      this.costTracker.fromJSON(data.costTracker);
    }

    if (data.costEstimator) {
      this.costEstimator.fromJSON(data.costEstimator);
    }

    this.save();
  }

  /**
   * Reset all budget data.
   */
  public reset(): void {
    this.config = this.getDefaultConfig();
    this.costTracker = new CostTracker();
    this.costEstimator = new CostEstimator();

    if (typeof window !== 'undefined') {
      localStorage.removeItem('llm_budget');
    }
  }

  /**
   * Get default budget configuration.
   */
  private getDefaultConfig(): BudgetConfig {
    return {
      dailyBudgetUSD: 25,
      monthlyBudgetUSD: 200,
      budgetWarningThreshold: 0.75,
      enabled: true,
      pauseOnBudgetExceeded: true,
      currentDailySpendUSD: 0,
      currentMonthlySpendUSD: 0,
      lastResetTime: Date.now(),
      lastMonthlyResetTime: Date.now()
    };
  }
}
