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
}

export const DEFAULT_RATE_LIMITS: ProviderRateLimits = {
  groq: {
    requestsPerMinute: 1000, // 1000 requests per minute (actual Groq limit)
    burstSize: 50,
  },
  cerebras: {
    requestsPerMinute: 1000, // 1000 requests per minute (user limit)
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
    // Get rate limit for this provider/API key
    let rateLimit: RateLimitConfig | undefined;

    if (apiKeyHash && this.rateLimits.customKeys.has(apiKeyHash)) {
      rateLimit = this.rateLimits.customKeys.get(apiKeyHash);
    } else {
      rateLimit = this.rateLimits[provider as keyof Omit<ProviderRateLimits, 'customKeys'>];
    }

    if (!rateLimit) {
      console.warn(`[CooldownCalculator] No rate limit for provider: ${provider}`);
      return 5000; // Default 5s cooldown
    }

    // Count active games
    const activeGames = this.sessionManager.getActiveSessionCount();

    if (activeGames === 0) return 0; // No cooldown if no games

    // Calculate per-game request rate
    // Formula: cooldownMs = (60000ms / requestsPerMinute) * activeGames
    const cooldownMs = (60000 / rateLimit.requestsPerMinute) * activeGames;

    console.log(
      `[CooldownCalculator] ${provider}: ${rateLimit.requestsPerMinute} RPM, ` +
        `${activeGames} games → ${cooldownMs.toFixed(0)}ms cooldown per game`
    );

    return Math.ceil(cooldownMs);
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

    return this.rateLimits[provider as keyof Omit<ProviderRateLimits, 'customKeys'>];
  }

  /**
   * Set rate limit for a custom API key
   *
   * @param apiKeyHash - Hash of API key
   * @param rateLimit - Rate limit configuration
   */
  setCustomRateLimit(apiKeyHash: string, rateLimit: RateLimitConfig): void {
    this.rateLimits.customKeys.set(apiKeyHash, rateLimit);
    console.log(
      `[CooldownCalculator] Set custom rate limit for key ${apiKeyHash}: ${rateLimit.requestsPerMinute} RPM`
    );
  }

  /**
   * Update rate limits for a provider
   *
   * @param provider - Provider name
   * @param rateLimit - New rate limit configuration
   */
  updateProviderRateLimit(provider: string, rateLimit: RateLimitConfig): void {
    (this.rateLimits as any)[provider] = rateLimit;
    console.log(
      `[CooldownCalculator] Updated rate limit for ${provider}: ${rateLimit.requestsPerMinute} RPM`
    );
  }
}
