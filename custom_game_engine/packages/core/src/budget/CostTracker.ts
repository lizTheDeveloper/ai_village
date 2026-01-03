/**
 * Cost tracking for LLM providers.
 * Tracks token usage and costs per provider with daily/monthly breakdowns.
 */

export interface ProviderCost {
  providerId: string;
  providerName: string;

  // Pricing (per 1M tokens)
  inputCostPer1M: number;
  outputCostPer1M: number;

  // Usage tracking
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCalls: number;

  // Cost tracking
  totalCostUSD: number;
  todayCostUSD: number;
  thisMonthCostUSD: number;

  // Timing
  firstCallTime: number;
  lastCallTime: number;
}

export class CostTracker {
  private providers: Map<string, ProviderCost> = new Map();
  private totalCostUSD: number = 0;
  private totalCalls: number = 0;

  /**
   * Record a completed LLM call with cost data.
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

    // Get or create provider entry
    let provider = this.providers.get(providerId);
    if (!provider) {
      provider = {
        providerId,
        providerName,
        inputCostPer1M,
        outputCostPer1M,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCalls: 0,
        totalCostUSD: 0,
        todayCostUSD: 0,
        thisMonthCostUSD: 0,
        firstCallTime: now,
        lastCallTime: now
      };
      this.providers.set(providerId, provider);
    }

    // Update provider stats
    provider.totalInputTokens += inputTokens;
    provider.totalOutputTokens += outputTokens;
    provider.totalCalls += 1;
    provider.totalCostUSD += costUSD;
    provider.todayCostUSD += costUSD;
    provider.thisMonthCostUSD += costUSD;
    provider.lastCallTime = now;

    // Update pricing if it changed
    provider.inputCostPer1M = inputCostPer1M;
    provider.outputCostPer1M = outputCostPer1M;

    // Update totals
    this.totalCostUSD += costUSD;
    this.totalCalls += 1;
  }

  /**
   * Get cost data for a specific provider.
   */
  public getProviderCost(providerId: string): ProviderCost | null {
    return this.providers.get(providerId) ?? null;
  }

  /**
   * Get all provider cost data.
   */
  public getAllProviders(): ProviderCost[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get total daily cost across all providers.
   */
  public getDailyCost(): number {
    let total = 0;
    for (const provider of this.providers.values()) {
      total += provider.todayCostUSD;
    }
    return total;
  }

  /**
   * Get total monthly cost across all providers.
   */
  public getMonthlyCost(): number {
    let total = 0;
    for (const provider of this.providers.values()) {
      total += provider.thisMonthCostUSD;
    }
    return total;
  }

  /**
   * Get total lifetime cost across all providers.
   */
  public getTotalCost(): number {
    return this.totalCostUSD;
  }

  /**
   * Get total lifetime calls across all providers.
   */
  public getTotalCalls(): number {
    return this.totalCalls;
  }

  /**
   * Reset daily costs for all providers.
   * Call this at midnight local time.
   */
  public resetDaily(): void {
    for (const provider of this.providers.values()) {
      provider.todayCostUSD = 0;
    }
  }

  /**
   * Reset monthly costs for all providers.
   * Call this on the 1st of each month.
   */
  public resetMonthly(): void {
    for (const provider of this.providers.values()) {
      provider.thisMonthCostUSD = 0;
    }
  }

  /**
   * Export cost data to JSON for persistence.
   */
  public toJSON(): string {
    return JSON.stringify({
      providers: Array.from(this.providers.entries()),
      totalCostUSD: this.totalCostUSD,
      totalCalls: this.totalCalls
    });
  }

  /**
   * Import cost data from JSON.
   */
  public fromJSON(json: string): void {
    const data = JSON.parse(json);

    if (!data.providers || !Array.isArray(data.providers)) {
      throw new Error('Invalid cost tracker data: missing or invalid providers array');
    }

    this.providers = new Map(data.providers);
    this.totalCostUSD = data.totalCostUSD ?? 0;
    this.totalCalls = data.totalCalls ?? 0;
  }
}
