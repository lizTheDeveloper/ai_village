/**
 * Provider Queue with Rate Limit Detection
 *
 * Queues LLM requests for a single provider and enforces:
 * - Concurrency limits via semaphore
 * - Rate limit detection and backoff
 * - Automatic retry after rate limit expires
 *
 * @example
 * const queue = new ProviderQueue(groqProvider, 2);
 * const response = await queue.enqueue(request, 'agent123');
 */

import { Semaphore } from './Semaphore.js';
import type { LLMProvider, LLMRequest, LLMResponse } from './LLMProvider.js';

export interface QueuedRequest {
  id: string;
  agentId: string;
  sessionId?: string;
  request: LLMRequest;
  resolve: (response: LLMResponse) => void;
  reject: (error: Error) => void;
  enqueuedAt: number;
  retryCount: number;
}

export interface RateLimitError extends Error {
  status?: number;
  code?: string;
  headers?: Record<string, string>;
  retryAfter?: number;
}

/**
 * Queue for a single LLM provider
 *
 * Handles:
 * - Concurrency limiting via semaphore
 * - 429 rate limit detection
 * - Automatic backoff and retry
 */
export class ProviderQueue {
  private semaphore: Semaphore;
  private queue: QueuedRequest[] = [];
  private provider: LLMProvider;
  private rateLimited: boolean = false;
  private rateLimitUntil: number = 0;
  private processing: boolean = false;
  private maxRequestAgeMs: number;
  private expiredCount: number = 0;

  /**
   * @param provider - LLM provider instance
   * @param maxConcurrent - Maximum concurrent requests (default 2)
   * @param maxRequestAgeMs - Maximum age for a request before expiring (default 30s)
   */
  constructor(
    provider: LLMProvider,
    maxConcurrent: number = 2,
    maxRequestAgeMs: number = 30_000
  ) {
    if (maxConcurrent < 1) {
      throw new Error('maxConcurrent must be at least 1');
    }

    this.provider = provider;
    this.semaphore = new Semaphore(maxConcurrent);
    this.maxRequestAgeMs = maxRequestAgeMs;
  }

  /**
   * Enqueue an LLM request
   *
   * @param request - LLM request parameters
   * @param agentId - Agent making the request
   * @param sessionId - Optional game session ID
   * @returns Promise that resolves with LLM response
   */
  async enqueue(
    request: LLMRequest,
    agentId: string,
    sessionId?: string
  ): Promise<LLMResponse> {
    return new Promise<LLMResponse>((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: this.generateRequestId(),
        agentId,
        sessionId,
        request,
        resolve,
        reject,
        enqueuedAt: Date.now(),
        retryCount: 0,
      };

      this.queue.push(queuedRequest);
      this.processNext();
    });
  }

  /**
   * Process next request in queue
   */
  private async processNext(): Promise<void> {
    // Prevent concurrent processing
    if (this.processing) return;
    this.processing = true;

    try {
      // Check if rate limited
      if (this.rateLimited && Date.now() < this.rateLimitUntil) {
        const waitMs = this.rateLimitUntil - Date.now();

        // Schedule retry after rate limit expires
        setTimeout(() => {
          this.processing = false;
          this.processNext();
        }, waitMs);
        return;
      }

      // Clear rate limit if expired
      if (this.rateLimited && Date.now() >= this.rateLimitUntil) {
        this.rateLimited = false;
      }

      // No queued requests
      if (this.queue.length === 0) {
        this.processing = false;
        return;
      }

      // Try to acquire semaphore (non-blocking check)
      const acquired = this.semaphore.tryAcquire();
      if (!acquired) {
        // Wait for semaphore release
        this.processing = false;
        await this.semaphore.acquire();
        this.processNext();
        return;
      }

      // Get next request
      const queuedRequest = this.queue.shift()!;

      // Check if request has expired
      const requestAge = Date.now() - queuedRequest.enqueuedAt;
      if (requestAge > this.maxRequestAgeMs) {
        this.expiredCount++;
        const ageSeconds = (requestAge / 1000).toFixed(1);
        console.warn(
          `[ProviderQueue:${this.provider.getProviderId()}] Request expired for agent ${queuedRequest.agentId} ` +
            `(age: ${ageSeconds}s > max: ${this.maxRequestAgeMs / 1000}s). Total expired: ${this.expiredCount}`
        );
        queuedRequest.reject(
          new Error(`LLM request expired after ${ageSeconds}s in queue`)
        );

        // Release semaphore and continue to next request
        this.semaphore.release();
        this.processing = false;
        if (this.queue.length > 0) {
          this.processNext();
        }
        return;
      }

      // Process request
      try {
        const response = await this.provider.generate(queuedRequest.request);
        queuedRequest.resolve(response);
      } catch (error: any) {
        // Check for 429 rate limit
        if (this.isRateLimitError(error)) {
          console.warn(
            `[ProviderQueue:${this.provider.getProviderId()}] Rate limit detected for agent ${queuedRequest.agentId}`
          );

          // Extract retry-after header if available
          const retryAfter = this.extractRetryAfter(error);
          this.handleRateLimit(retryAfter);

          // Re-queue the request (will be retried after rate limit expires)
          queuedRequest.retryCount++;
          this.queue.unshift(queuedRequest);
        } else {
          // Non-rate-limit error, reject
          queuedRequest.reject(error);
        }
      } finally {
        this.semaphore.release();

        // Continue processing queue
        this.processing = false;
        if (this.queue.length > 0) {
          this.processNext();
        }
      }
    } catch (error) {
      console.error(
        `[ProviderQueue:${this.provider.getProviderId()}] Error processing queue:`,
        error
      );
      this.processing = false;
    }
  }

  /**
   * Check if error is a rate limit error (429)
   */
  private isRateLimitError(error: any): boolean {
    return (
      error?.status === 429 ||
      error?.code === 'rate_limit_exceeded' ||
      error?.code === 'RATE_LIMIT_EXCEEDED' ||
      error?.message?.toLowerCase().includes('rate limit') ||
      error?.message?.toLowerCase().includes('too many requests')
    );
  }

  /**
   * Extract retry-after duration from error
   *
   * @param error - Error object from LLM provider
   * @returns Retry-after duration in milliseconds, or null if not available
   */
  private extractRetryAfter(error: any): number | null {
    // Check for Retry-After header (in seconds)
    if (error.headers?.['retry-after']) {
      const retryAfter = parseInt(error.headers['retry-after'], 10);
      if (!isNaN(retryAfter)) {
        return retryAfter * 1000; // Convert to ms
      }
    }

    // Check for X-RateLimit-Reset header (unix timestamp)
    if (error.headers?.['x-ratelimit-reset']) {
      const resetTime = parseInt(error.headers['x-ratelimit-reset'], 10);
      if (!isNaN(resetTime)) {
        const resetMs = resetTime * 1000;
        return Math.max(0, resetMs - Date.now());
      }
    }

    // Check for x-ratelimit-reset-requests (Groq-specific, timestamp in seconds with decimal)
    if (error.headers?.['x-ratelimit-reset-requests']) {
      const resetTime = parseFloat(error.headers['x-ratelimit-reset-requests']);
      if (!isNaN(resetTime)) {
        const resetMs = resetTime * 1000;
        return Math.max(0, resetMs - Date.now());
      }
    }

    return null;
  }

  /**
   * Handle rate limit by setting rate limit flag and expiration time
   *
   * @param retryAfterMs - How long to wait (from header), or null to use default
   */
  handleRateLimit(retryAfterMs: number | null): void {
    this.rateLimited = true;

    // Use provided retry-after, or default to 1 second
    const waitMs = retryAfterMs ?? 1000;
    this.rateLimitUntil = Date.now() + waitMs;
  }

  /**
   * Check if currently rate limited
   */
  isRateLimited(): boolean {
    return this.rateLimited && Date.now() < this.rateLimitUntil;
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Get time until rate limit expires (ms)
   *
   * @returns Milliseconds until rate limit expires, or 0 if not rate limited
   */
  getRateLimitWaitTime(): number {
    if (!this.isRateLimited()) return 0;
    return Math.max(0, this.rateLimitUntil - Date.now());
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    queueLength: number;
    rateLimited: boolean;
    rateLimitWaitMs: number;
    semaphoreStats: ReturnType<Semaphore['getStats']>;
    providerId: string;
    expiredCount: number;
    maxRequestAgeMs: number;
  } {
    return {
      queueLength: this.queue.length,
      rateLimited: this.isRateLimited(),
      rateLimitWaitMs: this.getRateLimitWaitTime(),
      semaphoreStats: this.semaphore.getStats(),
      providerId: this.provider.getProviderId(),
      expiredCount: this.expiredCount,
      maxRequestAgeMs: this.maxRequestAgeMs,
    };
  }

  /**
   * Get provider instance
   */
  getProvider(): LLMProvider {
    return this.provider;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}
