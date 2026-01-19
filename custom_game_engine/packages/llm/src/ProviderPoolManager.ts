/**
 * Provider Pool Manager
 *
 * Manages multiple provider queues and implements:
 * - Fallback chain (Groq → Cerebras on 429)
 * - Global retry when all providers rate limited
 * - Per-provider queue statistics
 *
 * @example
 * const pool = new ProviderPoolManager({
 *   groq: { provider: groqProvider, maxConcurrent: 2, fallbackChain: ['cerebras'] },
 *   cerebras: { provider: cerebrasProvider, maxConcurrent: 2, fallbackChain: [] },
 * });
 *
 * const response = await pool.execute('groq', request, 'agent123');
 */

import { ProviderQueue } from './ProviderQueue.js';
import type { LLMProvider, LLMRequest, LLMResponse } from './LLMProvider.js';

export interface ProviderConfig {
  provider: LLMProvider;
  maxConcurrent: number;
  fallbackChain: string[];
}

export interface ProviderPoolConfig {
  [providerName: string]: ProviderConfig;
}

export interface PoolStats {
  [providerName: string]: {
    queueLength: number;
    rateLimited: boolean;
    rateLimitWaitMs: number;
    semaphoreUtilization: number;
    availableSlots: number;
    maxConcurrent: number;
  };
}

/**
 * Manages multiple provider queues with fallback and retry logic
 */
export class ProviderPoolManager {
  private queues: Map<string, ProviderQueue> = new Map();
  private fallbackChains: Map<string, string[]> = new Map();
  private maxRetries: number = 3;

  constructor(config: ProviderPoolConfig) {
    for (const [providerName, providerConfig] of Object.entries(config)) {
      if (!providerConfig) continue;

      const queue = new ProviderQueue(
        providerConfig.provider,
        providerConfig.maxConcurrent
      );

      this.queues.set(providerName, queue);
      this.fallbackChains.set(providerName, providerConfig.fallbackChain);
    }
  }

  /**
   * Execute LLM request with automatic fallback and retry
   *
   * @param queueName - Primary provider queue name
   * @param request - LLM request
   * @param agentId - Agent ID
   * @param sessionId - Optional game session ID
   * @param attempt - Current retry attempt (internal)
   * @returns LLM response
   */
  async execute(
    queueName: string,
    request: LLMRequest,
    agentId: string,
    sessionId?: string,
    attempt: number = 0
  ): Promise<LLMResponse> {
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`[ProviderPoolManager] Unknown queue: ${queueName}`);
    }

    try {
      // Try primary provider
      const response = await queue.enqueue(request, agentId, sessionId);
      return response;
    } catch (error: any) {
      // Check if this was a rate limit error
      const isRateLimit = this.isRateLimitError(error);

      if (isRateLimit) {
        console.warn(
          `[ProviderPoolManager] Rate limit on ${queueName} for agent ${agentId}, attempting fallback`
        );

        // Try fallback chain
        const fallbackChain = this.fallbackChains.get(queueName) || [];

        for (const fallbackProvider of fallbackChain) {
          const fallbackQueue = this.queues.get(fallbackProvider);

          if (!fallbackQueue) {
            console.warn(
              `[ProviderPoolManager] Fallback provider ${fallbackProvider} not configured`
            );
            continue;
          }

          // Check if fallback is also rate limited
          if (fallbackQueue.isRateLimited()) {
            console.warn(
              `[ProviderPoolManager] Fallback ${fallbackProvider} also rate limited, skipping`
            );
            continue;
          }

          try {
            const response = await fallbackQueue.enqueue(
              request,
              agentId,
              sessionId
            );
            return response;
          } catch (fallbackError: any) {
            console.warn(
              `[ProviderPoolManager] Fallback ${fallbackProvider} failed:`,
              fallbackError.message
            );
            continue;
          }
        }

        // All fallbacks exhausted, wait and retry primary
        if (attempt < this.maxRetries) {
          const waitMs = 1000; // 1 second

          await this.sleep(waitMs);
          return this.execute(queueName, request, agentId, sessionId, attempt + 1);
        } else {
          throw new Error(
            `[ProviderPoolManager] All providers exhausted after ${attempt} retries`
          );
        }
      }

      // Non-rate-limit error, propagate
      throw error;
    }
  }

  /**
   * Check if error is a rate limit error
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
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get statistics for all provider queues
   */
  getQueueStats(): PoolStats {
    const stats: PoolStats = {};

    for (const [name, queue] of this.queues.entries()) {
      const queueStats = queue.getStats();
      stats[name] = {
        queueLength: queueStats.queueLength,
        rateLimited: queueStats.rateLimited,
        rateLimitWaitMs: queueStats.rateLimitWaitMs,
        semaphoreUtilization: queueStats.semaphoreStats.utilization,
        availableSlots: queueStats.semaphoreStats.available,
        maxConcurrent: queueStats.semaphoreStats.capacity,
      };
    }

    return stats;
  }

  /**
   * Get a specific provider queue
   */
  getQueue(providerName: string): ProviderQueue | undefined {
    return this.queues.get(providerName);
  }

  /**
   * Get all provider names
   */
  getProviderNames(): string[] {
    return Array.from(this.queues.keys());
  }

  /**
   * Check if all providers are rate limited
   */
  areAllProvidersRateLimited(): boolean {
    for (const queue of this.queues.values()) {
      if (!queue.isRateLimited()) {
        return false;
      }
    }
    return this.queues.size > 0; // True only if we have providers and all are limited
  }

  /**
   * Get next available provider (not rate limited)
   */
  getNextAvailableProvider(): string | null {
    for (const [name, queue] of this.queues.entries()) {
      if (!queue.isRateLimited()) {
        return name;
      }
    }
    return null;
  }

  /**
   * Set maximum retries when all providers are rate limited
   */
  setMaxRetries(maxRetries: number): void {
    if (maxRetries < 0) {
      throw new Error('maxRetries must be non-negative');
    }
    this.maxRetries = maxRetries;
  }

  /**
   * Get current max retries setting
   */
  getMaxRetries(): number {
    return this.maxRetries;
  }
}
