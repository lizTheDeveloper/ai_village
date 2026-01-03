/**
 * Token Bucket Rate Limiter
 *
 * Implements a token bucket algorithm for rate limiting API calls.
 * Each API key gets its own bucket with a configurable rate limit.
 *
 * Example:
 * ```typescript
 * const limiter = new RateLimiter({
 *   requestsPerMinute: 30,
 *   burst: 10
 * });
 *
 * if (limiter.tryAcquire('api-key-123')) {
 *   // Make API call
 * } else {
 *   // Rate limited - wait or reject
 * }
 * ```
 */

export interface RateLimiterConfig {
  /**
   * Maximum requests per minute (sustained rate)
   * Default: 30
   */
  requestsPerMinute?: number;

  /**
   * Maximum burst size (tokens that can accumulate)
   * Default: 10
   */
  burst?: number;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number; // tokens per millisecond
}

/**
 * Token bucket rate limiter with per-key tracking
 */
export class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private readonly refillRate: number;
  private readonly maxTokens: number;

  constructor(config: RateLimiterConfig = {}) {
    const requestsPerMinute = config.requestsPerMinute ?? 30;
    const burst = config.burst ?? 10;

    this.refillRate = requestsPerMinute / 60000; // tokens per millisecond
    this.maxTokens = burst;
  }

  /**
   * Try to acquire a token for the given key.
   * Returns true if allowed, false if rate limited.
   */
  tryAcquire(key: string): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      // First request for this key - create bucket with full tokens
      bucket = {
        tokens: this.maxTokens - 1, // Take 1 token immediately
        lastRefill: now,
        maxTokens: this.maxTokens,
        refillRate: this.refillRate,
      };
      this.buckets.set(key, bucket);
      return true;
    }

    // Refill tokens based on time elapsed
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = elapsed * bucket.refillRate;
    bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Try to take a token
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Get time until next token is available (in milliseconds)
   */
  getTimeUntilNextToken(key: string): number {
    const bucket = this.buckets.get(key);
    if (!bucket) {
      return 0; // No bucket = first request = allowed immediately
    }

    if (bucket.tokens >= 1) {
      return 0; // Already have tokens
    }

    // Calculate how long until we have 1 token
    const tokensNeeded = 1 - bucket.tokens;
    return Math.ceil(tokensNeeded / bucket.refillRate);
  }

  /**
   * Get current status for a key
   */
  getStatus(key: string): {
    tokens: number;
    maxTokens: number;
    requestsPerMinute: number;
    timeUntilNextToken: number;
  } {
    const bucket = this.buckets.get(key);
    if (!bucket) {
      return {
        tokens: this.maxTokens,
        maxTokens: this.maxTokens,
        requestsPerMinute: this.refillRate * 60000,
        timeUntilNextToken: 0,
      };
    }

    // Update bucket state without modifying it
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = elapsed * bucket.refillRate;
    const currentTokens = Math.min(bucket.maxTokens, bucket.tokens + tokensToAdd);

    return {
      tokens: currentTokens,
      maxTokens: bucket.maxTokens,
      requestsPerMinute: bucket.refillRate * 60000,
      timeUntilNextToken: this.getTimeUntilNextToken(key),
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.buckets.clear();
  }
}
