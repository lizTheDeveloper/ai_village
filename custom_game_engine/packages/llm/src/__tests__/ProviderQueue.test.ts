import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ProviderQueue } from '../ProviderQueue.js';
import type { LLMProvider, LLMRequest, LLMResponse, ProviderPricing } from '../LLMProvider.js';

// Mock LLM Provider
class MockLLMProvider implements LLMProvider {
  private mockResponses: LLMResponse[] = [];
  private mockErrors: Error[] = [];
  private callCount = 0;

  constructor(private providerId: string = 'mock-provider') {}

  async generate(request: LLMRequest): Promise<LLMResponse> {
    this.callCount++;

    if (this.mockErrors.length > 0) {
      const error = this.mockErrors.shift()!;
      throw error;
    }

    if (this.mockResponses.length > 0) {
      return this.mockResponses.shift()!;
    }

    return {
      text: `Mock response to: ${request.prompt}`,
      inputTokens: 10,
      outputTokens: 20,
      costUSD: 0.001,
    };
  }

  getModelName(): string {
    return 'mock-model';
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getPricing(): ProviderPricing {
    return {
      providerId: this.providerId,
      providerName: 'Mock Provider',
      inputCostPer1M: 0.5,
      outputCostPer1M: 1.5,
    };
  }

  getProviderId(): string {
    return this.providerId;
  }

  getCallCount(): number {
    return this.callCount;
  }

  queueResponse(response: LLMResponse): void {
    this.mockResponses.push(response);
  }

  queueError(error: Error): void {
    this.mockErrors.push(error);
  }
}

describe('ProviderQueue', () => {
  let provider: MockLLMProvider;
  let queue: ProviderQueue;

  beforeEach(() => {
    provider = new MockLLMProvider('test-provider');
    queue = new ProviderQueue(provider, 2);
  });

  describe('constructor', () => {
    it('should create queue with correct concurrency', () => {
      const stats = queue.getStats();
      expect(stats.semaphoreStats.capacity).toBe(2);
      expect(stats.providerId).toBe('test-provider');
    });

    it('should throw error for invalid maxConcurrent', () => {
      expect(() => new ProviderQueue(provider, 0)).toThrow('maxConcurrent must be at least 1');
    });
  });

  describe('enqueue and processing', () => {
    it('should process single request', async () => {
      const request: LLMRequest = { prompt: 'test prompt' };
      const response = await queue.enqueue(request, 'agent1');

      expect(response.text).toContain('test prompt');
      expect(provider.getCallCount()).toBe(1);
    });

    it('should process multiple requests sequentially within concurrency limit', async () => {
      const requests: Promise<LLMResponse>[] = [];

      for (let i = 0; i < 5; i++) {
        requests.push(queue.enqueue({ prompt: `test ${i}` }, `agent${i}`));
      }

      const responses = await Promise.all(requests);

      expect(responses.length).toBe(5);
      expect(provider.getCallCount()).toBe(5);
    });

    it('should respect concurrency limit', async () => {
      let concurrentCount = 0;
      let maxConcurrent = 0;

      // Override provider to track concurrent calls
      provider.generate = async (request: LLMRequest) => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);

        await new Promise(resolve => setTimeout(resolve, 50));

        concurrentCount--;
        return {
          text: 'response',
          inputTokens: 10,
          outputTokens: 20,
          costUSD: 0.001,
        };
      };

      const requests: Promise<LLMResponse>[] = [];
      for (let i = 0; i < 10; i++) {
        requests.push(queue.enqueue({ prompt: 'test' }, `agent${i}`));
      }

      await Promise.all(requests);

      // Should never exceed maxConcurrent of 2
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
  });

  describe('rate limit detection', () => {
    it('should detect 429 status code', async () => {
      const rateLimitError: any = new Error('Rate limited');
      rateLimitError.status = 429;

      provider.queueError(rateLimitError);
      provider.queueResponse({
        text: 'success after rate limit',
        inputTokens: 10,
        outputTokens: 20,
        costUSD: 0.001,
      });

      const response = await queue.enqueue({ prompt: 'test' }, 'agent1');

      expect(response.text).toBe('success after rate limit');
      expect(queue.isRateLimited()).toBe(false);
    });

    it('should detect rate_limit_exceeded code', async () => {
      const rateLimitError: any = new Error('Rate limit exceeded');
      rateLimitError.code = 'rate_limit_exceeded';

      provider.queueError(rateLimitError);
      provider.queueResponse({
        text: 'success',
        inputTokens: 10,
        outputTokens: 20,
        costUSD: 0.001,
      });

      const response = await queue.enqueue({ prompt: 'test' }, 'agent1');
      expect(response.text).toBe('success');
    });

    it('should extract retry-after from headers', async () => {
      const rateLimitError: any = new Error('Rate limited');
      rateLimitError.status = 429;
      rateLimitError.headers = { 'retry-after': '2' }; // 2 seconds

      provider.queueError(rateLimitError);

      const promise = queue.enqueue({ prompt: 'test' }, 'agent1');

      // Check that rate limit is set
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(queue.isRateLimited()).toBe(true);

      const waitTime = queue.getRateLimitWaitTime();
      expect(waitTime).toBeGreaterThan(1000); // Should be ~2 seconds
      expect(waitTime).toBeLessThan(3000);

      provider.queueResponse({
        text: 'success',
        inputTokens: 10,
        outputTokens: 20,
        costUSD: 0.001,
      });

      await promise;
    });

    it('should use default 1s wait if no retry-after header', async () => {
      const rateLimitError: any = new Error('Rate limited');
      rateLimitError.status = 429;

      provider.queueError(rateLimitError);

      const promise = queue.enqueue({ prompt: 'test' }, 'agent1');

      // Check that rate limit is set with default wait
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(queue.isRateLimited()).toBe(true);

      const waitTime = queue.getRateLimitWaitTime();
      expect(waitTime).toBeLessThan(1100); // Should be ~1 second

      provider.queueResponse({
        text: 'success',
        inputTokens: 10,
        outputTokens: 20,
        costUSD: 0.001,
      });

      await promise;
    });

    it('should re-queue request on rate limit', async () => {
      const rateLimitError: any = new Error('Rate limited');
      rateLimitError.status = 429;

      provider.queueError(rateLimitError);
      provider.queueResponse({
        text: 'success after retry',
        inputTokens: 10,
        outputTokens: 20,
        costUSD: 0.001,
      });

      const response = await queue.enqueue({ prompt: 'test' }, 'agent1');

      expect(response.text).toBe('success after retry');
      expect(provider.getCallCount()).toBe(2); // Original + retry
    });
  });

  describe('error handling', () => {
    it('should propagate non-rate-limit errors', async () => {
      const error = new Error('Server error');
      provider.queueError(error);

      await expect(queue.enqueue({ prompt: 'test' }, 'agent1')).rejects.toThrow('Server error');
    });
  });

  describe('getStats', () => {
    it('should return correct stats', () => {
      const stats = queue.getStats();

      expect(stats).toHaveProperty('queueLength');
      expect(stats).toHaveProperty('rateLimited');
      expect(stats).toHaveProperty('rateLimitWaitMs');
      expect(stats).toHaveProperty('semaphoreStats');
      expect(stats).toHaveProperty('providerId');

      expect(stats.providerId).toBe('test-provider');
      expect(stats.queueLength).toBe(0);
      expect(stats.rateLimited).toBe(false);
    });
  });
});
