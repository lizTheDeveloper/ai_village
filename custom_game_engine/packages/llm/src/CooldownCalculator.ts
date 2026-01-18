/**
 * Cooldown Calculator
 *
 * Calculates fair-share cooldowns for LLM requests based on:
 * - Number of active game sessions
 * - Provider rate limits (requests per minute)
 * - Per-API-key tracking
 *
 * Formula: cooldownMs = (60000ms / requestsPerMinute) * activeGames
 *
 * @example
 * const calculator = new CooldownCalculator(sessionManager, rateLimits);
 * const cooldownMs = calculator.calculateCooldown('groq'); // 8000ms for 4 games
 */

import type { GameSessionManager } from './GameSessionManager.js';

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerSecond?: number;
  burstSize?: number;
}

export interface ProviderRateLimits {
  groq?: RateLimitConfig;
  cerebras?: RateLimitConfig;
  openai?: RateLimitConfig;
  anthropic?: RateLimitConfig;
  ollama?: RateLimitConfig;
  customKeys: Map<string, RateLimitConfig>;
  [provider: string]: RateLimitConfig | Map<string, RateLimitConfig> | undefined;
}

export const DEFAULT_RATE_LIMITS: ProviderRateLimits = {
  groq: {
    requestsPerMinute: 1000, // 1000 requests per minute per provider
    burstSize: 50,
  },
  cerebras: {
    requestsPerMinute: 1000, // 1000 requests per minute per provider
    burstSize: 50,
  },
  openai: {
    requestsPerMinute: 10, // Conservative estimate
    burstSize: 3,
  },
  anthropic: {
    requestsPerMinute: 50, // Tier-dependent
    burstSize: 5,
  },
  ollama: {
    requestsPerMinute: 120, // Local, higher limit
    burstSize: 20,
  },
  customKeys: new Map(),
};

export interface CooldownStatus {
  canRequest: boolean;
  waitMs: number;
  nextAllowedAt: number;
}

export class CooldownCalculator {
  private sessionManager: GameSessionManager;
  private rateLimits: ProviderRateLimits;

  constructor(
    sessionManager: GameSessionManager,
    rateLimits: ProviderRateLimits = DEFAULT_RATE_LIMITS
  ) {
    this.sessionManager = sessionManager;
    this.rateLimits = rateLimits;
  }

  /**
   * Calculate minimum cooldown for a provider/API key
   *
   * Formula: (60000ms / requestsPerMinute) * activeGames
   *
   * @param provider - Provider name ('groq', 'cerebras', etc.)
   * @param apiKeyHash - Hash of API key (for custom keys)
   * @returns Cooldown in milliseconds
   */
  calculateCooldown(provider: string, apiKeyHash?: string): number {
    // DISABLED: Per-session cooldowns are wrong for single-player games.
    // The queue's maxConcurrent handles rate limiting properly.
    // Multiple agents in the same session should NOT wait for each other.
    // With 1000 RPM, agents should be able to make requests in parallel,
    // limited only by the queue's maxConcurrent, not artificial session cooldowns.
    return 0;
  }

  /**
   * Calculate when a specific session can make its next request
   *
   * @param sessionId - Game session ID
   * @param provider - Provider name
   * @param apiKeyHash - Hash of API key (for custom keys)
   * @returns Timestamp when next request is allowed (ms since epoch)
   */
  calculateNextAllowedTime(
    sessionId: string,
    provider: string,
    apiKeyHash?: string
  ): number {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      return Date.now(); // Unknown session, allow immediately
    }

    const cooldownMs = this.calculateCooldown(provider, apiKeyHash);
    const nextAllowed = session.lastRequestTime + cooldownMs;

    return Math.max(nextAllowed, Date.now());
  }

  /**
   * Check if a session can make a request now
   *
   * @param sessionId - Game session ID
   * @param provider - Provider name
   * @param apiKeyHash - Hash of API key (for custom keys)
   */
  canRequestNow(sessionId: string, provider: string, apiKeyHash?: string): boolean {
    const nextAllowed = this.calculateNextAllowedTime(sessionId, provider, apiKeyHash);
    return Date.now() >= nextAllowed;
  }

  /**
   * Get human-readable cooldown status
   *
   * @param sessionId - Game session ID
   * @param provider - Provider name
   * @param apiKeyHash - Hash of API key (for custom keys)
   */
  getCooldownStatus(
    sessionId: string,
    provider: string,
    apiKeyHash?: string
  ): CooldownStatus {
    const nextAllowedAt = this.calculateNextAllowedTime(sessionId, provider, apiKeyHash);
    const now = Date.now();
    const waitMs = Math.max(0, nextAllowedAt - now);

    return {
      canRequest: waitMs === 0,
      waitMs,
      nextAllowedAt,
    };
  }

  /**
   * Get rate limit configuration for a provider
   *
   * @param provider - Provider name
   * @param apiKeyHash - Hash of API key (for custom keys)
   */
  getRateLimit(provider: string, apiKeyHash?: string): RateLimitConfig | undefined {
    if (apiKeyHash && this.rateLimits.customKeys.has(apiKeyHash)) {
      return this.rateLimits.customKeys.get(apiKeyHash);
    }

    const value = this.rateLimits[provider];
    // Type guard: exclude Map type from index signature
    return value instanceof Map ? undefined : value;
  }

  /**
   * Set rate limit for a custom API key
   *
   * @param apiKeyHash - Hash of API key
   * @param rateLimit - Rate limit configuration
   */
  setCustomRateLimit(apiKeyHash: string, rateLimit: RateLimitConfig): void {
    this.rateLimits.customKeys.set(apiKeyHash, rateLimit);
  }

  /**
   * Update rate limits for a provider
   *
   * @param provider - Provider name
   * @param rateLimit - New rate limit configuration
   */
  updateProviderRateLimit(provider: string, rateLimit: RateLimitConfig): void {
    this.rateLimits[provider] = rateLimit;
  }
}
