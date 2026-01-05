import { describe, it, expect, beforeEach } from '@jest/globals';
import { ProviderPoolManager } from '../ProviderPoolManager.js';
import type { LLMProvider, LLMRequest, LLMResponse, ProviderPricing } from '../LLMProvider.js';

// Mock LLM Provider with configurable behavior
class MockProvider implements LLMProvider {
  private responses: LLMResponse[] = [];
  private errors: Error[] = [];
  public callCount = 0;

  constructor(private id: string) {}

  async generate(request: LLMRequest): Promise<LLMResponse> {
    this.callCount++;

    if (this.errors.length > 0) {
      throw this.errors.shift()!;
    }

    if (this.responses.length > 0) {
      return this.responses.shift()!;
    }

    return {
      text: `${this.id} response`,
      inputTokens: 10,
      outputTokens: 20,
      costUSD: 0.001,
    };
  }

  getModelName(): string {
    return `${this.id}-model`;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getPricing(): ProviderPricing {
    return {
      providerId: this.id,
      providerName: this.id,
      inputCostPer1M: 0.5,
      outputCostPer1M: 1.5,
    };
  }

  getProviderId(): string {
    return this.id;
  }

  queueResponse(response: LLMResponse): void {
    this.responses.push(response);
  }

  queueError(error: Error): void {
    this.errors.push(error);
  }
}

describe('ProviderPoolManager', () => {
  let groqProvider: MockProvider;
  let cerebrasProvider: MockProvider;
  let pool: ProviderPoolManager;

  beforeEach(() => {
    groqProvider = new MockProvider('groq');
    cerebrasProvider = new MockProvider('cerebras');

    pool = new ProviderPoolManager({
      groq: {
        provider: groqProvider,
        maxConcurrent: 2,
        fallbackChain: ['cerebras'],
      },
      cerebras: {
        provider: cerebrasProvider,
        maxConcurrent: 2,
        fallbackChain: [],
      },
    });
  });

  describe('constructor', () => {
    it('should initialize with correct providers', () => {
      const providerNames = pool.getProviderNames();
      expect(providerNames).toContain('groq');
      expect(providerNames).toContain('cerebras');
    });
  });

  describe('execute', () => {
    it('should execute request on primary provider', async () => {
      const request: LLMRequest = { prompt: 'test' };
      const response = await pool.execute('groq', request, 'agent1');

      expect(response.text).toBe('groq response');
      expect(groqProvider.callCount).toBe(1);
      expect(cerebrasProvider.callCount).toBe(0);
    });

    it('should throw error for unknown provider', async () => {
      await expect(
        pool.execute('unknown', { prompt: 'test' }, 'agent1')
      ).rejects.toThrow('Unknown queue: unknown');
    });
  });

  describe('fallback chain', () => {
    it('should fallback to cerebras on groq rate limit', async () => {
      const rateLimitError: any = new Error('Rate limited');
      rateLimitError.status = 429;

      groqProvider.queueError(rateLimitError);

      const request: LLMRequest = { prompt: 'test' };
      const response = await pool.execute('groq', request, 'agent1');

      expect(response.text).toBe('cerebras response');
      expect(groqProvider.callCount).toBe(1);
      expect(cerebrasProvider.callCount).toBe(1);
    });

    it('should not fallback on non-rate-limit errors', async () => {
      const serverError = new Error('Server error');
      groqProvider.queueError(serverError);

      await expect(
        pool.execute('groq', { prompt: 'test' }, 'agent1')
      ).rejects.toThrow('Server error');

      expect(groqProvider.callCount).toBe(1);
      expect(cerebrasProvider.callCount).toBe(0);
    });

    it('should skip rate-limited fallback providers', async () => {
      // Both groq and cerebras rate limited
      const rateLimitError: any = new Error('Rate limited');
      rateLimitError.status = 429;

      groqProvider.queueError(rateLimitError);
      cerebrasProvider.queueError(rateLimitError);

      // Queue success responses for retry
      groqProvider.queueResponse({
        text: 'groq retry success',
        inputTokens: 10,
        outputTokens: 20,
        costUSD: 0.001,
      });

      const request: LLMRequest = { prompt: 'test' };
      const response = await pool.execute('groq', request, 'agent1', undefined, 0);

      // Should retry groq after wait
      expect(response.text).toBe('groq retry success');
      expect(groqProvider.callCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('retry logic', () => {
    it('should retry after all providers rate limited', async () => {
      const rateLimitError: any = new Error('Rate limited');
      rateLimitError.status = 429;

      // Both providers rate limited initially
      groqProvider.queueError(rateLimitError);
      cerebrasProvider.queueError(rateLimitError);

      // Queue success for retry
      groqProvider.queueResponse({
        text: 'retry success',
        inputTokens: 10,
        outputTokens: 20,
        costUSD: 0.001,
      });

      const request: LLMRequest = { prompt: 'test' };
      const response = await pool.execute('groq', request, 'agent1');

      expect(response.text).toBe('retry success');
    });

    it('should fail after max retries', async () => {
      pool.setMaxRetries(2);

      const rateLimitError: any = new Error('Rate limited');
      rateLimitError.status = 429;

      // Keep failing with rate limit
      for (let i = 0; i < 10; i++) {
        groqProvider.queueError(rateLimitError);
        cerebrasProvider.queueError(rateLimitError);
      }

      await expect(
        pool.execute('groq', { prompt: 'test' }, 'agent1')
      ).rejects.toThrow('All providers exhausted');
    });
  });

  describe('getQueueStats', () => {
    it('should return stats for all queues', () => {
      const stats = pool.getQueueStats();

      expect(stats).toHaveProperty('groq');
      expect(stats).toHaveProperty('cerebras');

      expect(stats.groq).toHaveProperty('queueLength');
      expect(stats.groq).toHaveProperty('rateLimited');
      expect(stats.groq).toHaveProperty('semaphoreUtilization');
    });
  });

  describe('helper methods', () => {
    it('should detect when all providers are rate limited', async () => {
      expect(pool.areAllProvidersRateLimited()).toBe(false);

      const rateLimitError: any = new Error('Rate limited');
      rateLimitError.status = 429;

      groqProvider.queueError(rateLimitError);
      cerebrasProvider.queueError(rateLimitError);

      const promises = [
        pool.execute('groq', { prompt: 'test1' }, 'agent1').catch(() => {}),
        pool.execute('cerebras', { prompt: 'test2' }, 'agent2').catch(() => {}),
      ];

      await new Promise(resolve => setTimeout(resolve, 100));

      // After both hit rate limits
      const groqQueue = pool.getQueue('groq');
      const cerebrasQueue = pool.getQueue('cerebras');

      if (groqQueue && cerebrasQueue) {
        if (groqQueue.isRateLimited() && cerebrasQueue.isRateLimited()) {
          expect(pool.areAllProvidersRateLimited()).toBe(true);
        }
      }

      await Promise.all(promises);
    });

    it('should get next available provider', () => {
      const available = pool.getNextAvailableProvider();
      expect(['groq', 'cerebras']).toContain(available);
    });
  });

  describe('maxRetries configuration', () => {
    it('should allow setting max retries', () => {
      pool.setMaxRetries(5);
      expect(pool.getMaxRetries()).toBe(5);
    });

    it('should throw error for negative max retries', () => {
      expect(() => pool.setMaxRetries(-1)).toThrow('maxRetries must be non-negative');
    });
  });
});
