/**
 * Cost estimation based on recent LLM usage patterns.
 * Uses a rolling window to project future costs.
 */

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface CostEstimate {
  // Current rate (measured)
  callsPerMinute: number;
  avgInputTokensPerCall: number;
  avgOutputTokensPerCall: number;
  avgCostPerCall: number;

  // Projections
  estimatedCostPerHour: number;
  estimatedCostPerDay: number;
  estimatedCostPerMonth: number;

  // Time to budget limits
  hoursUntilDailyBudget: number | null;
  hoursUntilMonthlyBudget: number | null;

  // Confidence
  measurementWindow: number;  // Seconds of data used
  sampleSize: number;         // Number of calls measured
  confidence: ConfidenceLevel;
}

interface CallRecord {
  timestampMs: number;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
}

export class CostEstimator {
  private calls: CallRecord[] = [];

  public measurementWindowSec: number = 3600;  // 1 hour default
  public minSampleSize: number = 10;

  /**
   * Record a completed LLM call.
   */
  public recordCall(
    timestampMs: number,
    inputTokens: number,
    outputTokens: number,
    costUSD: number
  ): void {
    this.calls.push({
      timestampMs,
      inputTokens,
      outputTokens,
      costUSD
    });

    // Clean up old calls outside the measurement window
    this.pruneOldCalls(timestampMs);
  }

  /**
   * Get current cost estimate based on recent calls.
   */
  public getEstimate(
    dailyBudgetUSD?: number,
    monthlyBudgetUSD?: number,
    currentDailySpendUSD?: number,
    currentMonthlySpendUSD?: number
  ): CostEstimate {
    const now = Date.now();
    this.pruneOldCalls(now);

    const sampleSize = this.calls.length;

    // If no calls, return zero estimate
    if (sampleSize === 0) {
      return {
        callsPerMinute: 0,
        avgInputTokensPerCall: 0,
        avgOutputTokensPerCall: 0,
        avgCostPerCall: 0,
        estimatedCostPerHour: 0,
        estimatedCostPerDay: 0,
        estimatedCostPerMonth: 0,
        hoursUntilDailyBudget: null,
        hoursUntilMonthlyBudget: null,
        measurementWindow: this.measurementWindowSec,
        sampleSize: 0,
        confidence: 'low'
      };
    }

    // Calculate window duration (actual time span of calls)
    const oldestCall = this.calls[0]!;
    const newestCall = this.calls[this.calls.length - 1]!;
    const windowDurationMs = newestCall.timestampMs - oldestCall.timestampMs;
    const windowDurationMin = Math.max(windowDurationMs / 60000, 1); // At least 1 minute

    // Calculate averages
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCost = 0;

    for (const call of this.calls) {
      totalInputTokens += call.inputTokens;
      totalOutputTokens += call.outputTokens;
      totalCost += call.costUSD;
    }

    const avgInputTokensPerCall = totalInputTokens / sampleSize;
    const avgOutputTokensPerCall = totalOutputTokens / sampleSize;
    const avgCostPerCall = totalCost / sampleSize;

    // Calculate call rate
    const callsPerMinute = sampleSize / windowDurationMin;

    // Project costs
    const estimatedCostPerHour = callsPerMinute * 60 * avgCostPerCall;
    const estimatedCostPerDay = estimatedCostPerHour * 24;
    const estimatedCostPerMonth = estimatedCostPerDay * 30;

    // Calculate time to budget limits
    let hoursUntilDailyBudget: number | null = null;
    let hoursUntilMonthlyBudget: number | null = null;

    if (dailyBudgetUSD !== undefined && currentDailySpendUSD !== undefined && estimatedCostPerHour > 0) {
      const remainingDaily = dailyBudgetUSD - currentDailySpendUSD;
      hoursUntilDailyBudget = Math.max(0, remainingDaily / estimatedCostPerHour);
    }

    if (monthlyBudgetUSD !== undefined && currentMonthlySpendUSD !== undefined && estimatedCostPerHour > 0) {
      const remainingMonthly = monthlyBudgetUSD - currentMonthlySpendUSD;
      hoursUntilMonthlyBudget = Math.max(0, remainingMonthly / estimatedCostPerHour);
    }

    // Determine confidence level
    const confidence = this.getConfidenceLevel(sampleSize);

    return {
      callsPerMinute,
      avgInputTokensPerCall,
      avgOutputTokensPerCall,
      avgCostPerCall,
      estimatedCostPerHour,
      estimatedCostPerDay,
      estimatedCostPerMonth,
      hoursUntilDailyBudget,
      hoursUntilMonthlyBudget,
      measurementWindow: this.measurementWindowSec,
      sampleSize,
      confidence
    };
  }

  /**
   * Remove calls older than the measurement window.
   */
  private pruneOldCalls(nowMs: number): void {
    const cutoffMs = nowMs - (this.measurementWindowSec * 1000);
    this.calls = this.calls.filter(call => call.timestampMs >= cutoffMs);
  }

  /**
   * Determine confidence level based on sample size.
   */
  private getConfidenceLevel(sampleSize: number): ConfidenceLevel {
    if (sampleSize < 10) {
      return 'low';
    } else if (sampleSize < 50) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * Export estimator data to JSON for persistence.
   */
  public toJSON(): string {
    return JSON.stringify({
      calls: this.calls,
      measurementWindowSec: this.measurementWindowSec,
      minSampleSize: this.minSampleSize
    });
  }

  /**
   * Import estimator data from JSON.
   */
  public fromJSON(json: string): void {
    const data = JSON.parse(json);

    if (!data.calls || !Array.isArray(data.calls)) {
      throw new Error('Invalid cost estimator data: missing or invalid calls array');
    }

    this.calls = data.calls;
    this.measurementWindowSec = data.measurementWindowSec ?? 3600;
    this.minSampleSize = data.minSampleSize ?? 10;
  }
}
