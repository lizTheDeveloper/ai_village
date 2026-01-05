/**
 * Cost Tracker
 *
 * Tracks LLM costs by session, API key, and provider.
 * Provides cost breakdowns and spending analytics.
 *
 * Features:
 * - Per-session cost tracking
 * - Per-API-key cost tracking
 * - Per-provider cost tracking
 * - Total spending across all requests
 * - Request counts and token usage
 */

export interface CostEntry {
  timestamp: number;
  sessionId: string;
  agentId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  apiKeyHash?: string;
}

export interface SessionCostSummary {
  sessionId: string;
  totalCost: number;
  requestCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  firstRequest: number;
  lastRequest: number;
  providers: Record<string, {
    requestCount: number;
    totalCost: number;
    totalTokens: number;
  }>;
}

export interface APIKeyCostSummary {
  apiKeyHash: string;
  provider: string;
  totalCost: number;
  requestCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  firstRequest: number;
  lastRequest: number;
  sessions: Set<string>;
}

export interface ProviderCostSummary {
  provider: string;
  totalCost: number;
  requestCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  apiKeys: Set<string>;
}

export class CostTracker {
  private costs: CostEntry[] = [];
  private sessionCosts: Map<string, SessionCostSummary> = new Map();
  private apiKeyCosts: Map<string, APIKeyCostSummary> = new Map();
  private providerCosts: Map<string, ProviderCostSummary> = new Map();

  // Keep last N entries (default 10000)
  private maxEntries: number;

  constructor(maxEntries: number = 10000) {
    this.maxEntries = maxEntries;
  }

  /**
   * Record a cost entry
   */
  recordCost(entry: CostEntry): void {
    this.costs.push(entry);

    // Trim old entries if exceeded max
    if (this.costs.length > this.maxEntries) {
      this.costs = this.costs.slice(-this.maxEntries);
    }

    // Update session costs
    this.updateSessionCost(entry);

    // Update API key costs
    if (entry.apiKeyHash) {
      this.updateAPIKeyCost(entry);
    }

    // Update provider costs
    this.updateProviderCost(entry);
  }

  private updateSessionCost(entry: CostEntry): void {
    let summary = this.sessionCosts.get(entry.sessionId);

    if (!summary) {
      summary = {
        sessionId: entry.sessionId,
        totalCost: 0,
        requestCount: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        firstRequest: entry.timestamp,
        lastRequest: entry.timestamp,
        providers: {},
      };
      this.sessionCosts.set(entry.sessionId, summary);
    }

    summary.totalCost += entry.costUSD;
    summary.requestCount++;
    summary.totalInputTokens += entry.inputTokens;
    summary.totalOutputTokens += entry.outputTokens;
    summary.lastRequest = entry.timestamp;

    // Update provider breakdown
    if (!summary.providers[entry.provider]) {
      summary.providers[entry.provider] = {
        requestCount: 0,
        totalCost: 0,
        totalTokens: 0,
      };
    }
    const providerStats = summary.providers[entry.provider]!;
    providerStats.requestCount++;
    providerStats.totalCost += entry.costUSD;
    providerStats.totalTokens += entry.inputTokens + entry.outputTokens;
  }

  private updateAPIKeyCost(entry: CostEntry): void {
    if (!entry.apiKeyHash) return;

    let summary = this.apiKeyCosts.get(entry.apiKeyHash);

    if (!summary) {
      summary = {
        apiKeyHash: entry.apiKeyHash,
        provider: entry.provider,
        totalCost: 0,
        requestCount: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        firstRequest: entry.timestamp,
        lastRequest: entry.timestamp,
        sessions: new Set(),
      };
      this.apiKeyCosts.set(entry.apiKeyHash, summary);
    }

    summary.totalCost += entry.costUSD;
    summary.requestCount++;
    summary.totalInputTokens += entry.inputTokens;
    summary.totalOutputTokens += entry.outputTokens;
    summary.lastRequest = entry.timestamp;
    summary.sessions.add(entry.sessionId);
  }

  private updateProviderCost(entry: CostEntry): void {
    let summary = this.providerCosts.get(entry.provider);

    if (!summary) {
      summary = {
        provider: entry.provider,
        totalCost: 0,
        requestCount: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        apiKeys: new Set(),
      };
      this.providerCosts.set(entry.provider, summary);
    }

    summary.totalCost += entry.costUSD;
    summary.requestCount++;
    summary.totalInputTokens += entry.inputTokens;
    summary.totalOutputTokens += entry.outputTokens;
    if (entry.apiKeyHash) {
      summary.apiKeys.add(entry.apiKeyHash);
    }
  }

  /**
   * Get total cost across all requests
   */
  getTotalCost(): number {
    return Array.from(this.sessionCosts.values())
      .reduce((sum, session) => sum + session.totalCost, 0);
  }

  /**
   * Get cost for a specific session
   */
  getSessionCost(sessionId: string): SessionCostSummary | undefined {
    return this.sessionCosts.get(sessionId);
  }

  /**
   * Get all session costs
   */
  getAllSessionCosts(): SessionCostSummary[] {
    return Array.from(this.sessionCosts.values())
      .sort((a, b) => b.lastRequest - a.lastRequest);
  }

  /**
   * Get cost for a specific API key
   */
  getAPIKeyCost(apiKeyHash: string): APIKeyCostSummary | undefined {
    return this.apiKeyCosts.get(apiKeyHash);
  }

  /**
   * Get all API key costs
   */
  getAllAPIKeyCosts(): APIKeyCostSummary[] {
    return Array.from(this.apiKeyCosts.values())
      .map(summary => ({
        ...summary,
        sessions: summary.sessions, // Keep the Set
      }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }

  /**
   * Get cost for a specific provider
   */
  getProviderCost(provider: string): ProviderCostSummary | undefined {
    return this.providerCosts.get(provider);
  }

  /**
   * Get all provider costs
   */
  getAllProviderCosts(): ProviderCostSummary[] {
    return Array.from(this.providerCosts.values())
      .sort((a, b) => b.totalCost - a.totalCost);
  }

  /**
   * Get recent costs (last N minutes)
   */
  getRecentCosts(minutes: number = 60): CostEntry[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.costs.filter(entry => entry.timestamp >= cutoff);
  }

  /**
   * Get spending rate (dollars per hour)
   */
  getSpendingRate(minutes: number = 60): number {
    const recentCosts = this.getRecentCosts(minutes);
    const totalCost = recentCosts.reduce((sum, entry) => sum + entry.costUSD, 0);
    const hoursElapsed = minutes / 60;
    return hoursElapsed > 0 ? totalCost / hoursElapsed : 0;
  }

  /**
   * Get cost statistics
   */
  getStats() {
    const totalCost = this.getTotalCost();
    const totalRequests = this.costs.length;
    const avgCostPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0;

    const now = Date.now();
    const last5Min = this.getRecentCosts(5);
    const last60Min = this.getRecentCosts(60);

    return {
      totalCost,
      totalRequests,
      avgCostPerRequest,
      recentActivity: {
        last5Minutes: {
          requests: last5Min.length,
          cost: last5Min.reduce((sum, e) => sum + e.costUSD, 0),
        },
        last60Minutes: {
          requests: last60Min.length,
          cost: last60Min.reduce((sum, e) => sum + e.costUSD, 0),
        },
      },
      spendingRate: {
        perHour: this.getSpendingRate(60),
        perDay: this.getSpendingRate(60) * 24,
      },
      sessions: this.sessionCosts.size,
      apiKeys: this.apiKeyCosts.size,
      providers: this.providerCosts.size,
    };
  }
}
