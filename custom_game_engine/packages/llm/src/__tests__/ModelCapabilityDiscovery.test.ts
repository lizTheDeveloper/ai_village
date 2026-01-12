import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ModelCapabilityDiscovery,
  modelCapabilityDiscovery,
  type DiscoveredCapabilities,
} from '../ModelCapabilityDiscovery';
import type { LLMProvider, LLMRequest, LLMResponse, ProviderPricing } from '../LLMProvider';

/**
 * Mock LLM Provider for testing
 */
class MockProvider implements LLMProvider {
  private mockResponses: Map<string, LLMResponse> = new Map();
  private callCount = 0;

  setMockResponse(promptPattern: string, response: LLMResponse): void {
    this.mockResponses.set(promptPattern, response);
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    this.callCount++;

    // Find matching mock response
    const entries = Array.from(this.mockResponses.entries());
    for (const [pattern, response] of entries) {
      if (request.prompt.toLowerCase().includes(pattern.toLowerCase())) {
        return response;
      }
    }

    // Default response
    return {
      text: 'Default response',
      inputTokens: 10,
      outputTokens: 20,
      costUSD: 0.0001,
    };
  }

  getModelName(): string {
    return 'mock-model-1.0';
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getPricing(): ProviderPricing {
    return {
      providerId: 'mock',
      providerName: 'Mock Provider',
      inputCostPer1M: 0.5,
      outputCostPer1M: 1.5,
    };
  }

  getProviderId(): string {
    return 'mock';
  }

  getCallCount(): number {
    return this.callCount;
  }

  reset(): void {
    this.mockResponses.clear();
    this.callCount = 0;
  }
}

describe('ModelCapabilityDiscovery', () => {
  let discovery: ModelCapabilityDiscovery;
  let mockProvider: MockProvider;

  beforeEach(() => {
    discovery = new ModelCapabilityDiscovery();
    mockProvider = new MockProvider();

    // Clear localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  afterEach(() => {
    discovery.clearCache();
    mockProvider.reset();
  });

  describe('Tool Calling Detection', () => {
    it('should detect tool calling support when model mentions tools', async () => {
      mockProvider.setMockResponse('2 + 2', {
        text: 'I will use the calculator tool to compute 2 + 2 = 4',
        inputTokens: 15,
        outputTokens: 20,
        costUSD: 0.0001,
      });

      const capabilities = await discovery.discoverCapabilities(mockProvider, 'test-model');

      expect(capabilities.supportsToolCalling).toBe(true);
      expect(capabilities.toolCallingReliability).toBeGreaterThan(0);

      // Should run 3 probes for reliability
      const toolProbes = capabilities.probeResults.filter((r) => r.capability === 'tool_calling');
      expect(toolProbes.length).toBe(3);
    });

    it('should detect no tool calling support when model does not mention tools', async () => {
      mockProvider.setMockResponse('2 + 2', {
        text: 'The answer is 4',
        inputTokens: 10,
        outputTokens: 10,
        costUSD: 0.00005,
      });

      const capabilities = await discovery.discoverCapabilities(mockProvider, 'test-model');

      expect(capabilities.supportsToolCalling).toBe(false);
      expect(capabilities.toolCallingReliability).toBe(0);
    });

    it('should calculate reliability score correctly', async () => {
      let callCount = 0;
      mockProvider.setMockResponse('2 + 2', {
        get text() {
          callCount++;
          // First two calls succeed, third fails
          return callCount <= 2 ? 'Using calculator tool' : 'Just 4';
        },
        inputTokens: 10,
        outputTokens: 10,
        costUSD: 0.00005,
      });

      const capabilities = await discovery.discoverCapabilities(mockProvider, 'test-model');

      expect(capabilities.supportsToolCalling).toBe(true);
      expect(capabilities.toolCallingReliability).toBeCloseTo(2 / 3, 2);
    });
  });

  describe('Think Tag Detection', () => {
    it('should detect think tags when model uses them', async () => {
      mockProvider.setMockResponse('capital of france', {
        text: '<thinking>Paris is the capital city of France</thinking> Answer: Paris',
        inputTokens: 20,
        outputTokens: 30,
        costUSD: 0.0002,
      });

      const capabilities = await discovery.discoverCapabilities(mockProvider, 'test-model');

      expect(capabilities.thinkingFormat).toBe('think_tags');
      expect(capabilities.thinkingTagName).toBe('thinking');

      const thinkProbe = capabilities.probeResults.find((r) => r.capability === 'think_tags');
      expect(thinkProbe?.success).toBe(true);
      expect(thinkProbe?.variant).toBe('thinking');
    });

    it('should try multiple tag variants', async () => {
      mockProvider.setMockResponse('capital of france', {
        text: '<thoughts>It is Paris</thoughts> Answer: Paris',
        inputTokens: 20,
        outputTokens: 30,
        costUSD: 0.0002,
      });

      const capabilities = await discovery.discoverCapabilities(mockProvider, 'test-model');

      expect(capabilities.thinkingFormat).toBe('think_tags');
      expect(capabilities.thinkingTagName).toBe('thoughts');
    });

    it('should detect reasoning tag variant', async () => {
      mockProvider.setMockResponse('capital of france', {
        text: '<reasoning>Paris is the capital</reasoning> Answer: Paris',
        inputTokens: 20,
        outputTokens: 30,
        costUSD: 0.0002,
      });

      const capabilities = await discovery.discoverCapabilities(mockProvider, 'test-model');

      expect(capabilities.thinkingFormat).toBe('think_tags');
      expect(capabilities.thinkingTagName).toBe('reasoning');
    });

    it('should return none when no tag variant works', async () => {
      mockProvider.setMockResponse('capital of france', {
        text: 'The capital of France is Paris',
        inputTokens: 20,
        outputTokens: 30,
        costUSD: 0.0002,
      });

      const capabilities = await discovery.discoverCapabilities(mockProvider, 'test-model');

      // Should be 'none' if no reasoning field either
      if (!capabilities.probeResults.find((r) => r.capability === 'reasoning_field')?.success) {
        expect(capabilities.thinkingFormat).toBe('none');
        expect(capabilities.thinkingTagName).toBeUndefined();
      }
    });
  });

  describe('Reasoning Field Detection', () => {
    it('should detect reasoning field when present', async () => {
      mockProvider.setMockResponse('5 * 7', {
        text: '{"reasoning": "5 times 7 equals 35", "answer": 35}',
        inputTokens: 15,
        outputTokens: 25,
        costUSD: 0.00015,
      });

      const capabilities = await discovery.discoverCapabilities(mockProvider, 'test-model');

      expect(capabilities.thinkingFormat).toBe('reasoning_field');

      const reasoningProbe = capabilities.probeResults.find(
        (r) => r.capability === 'reasoning_field'
      );
      expect(reasoningProbe?.success).toBe(true);
    });

    it('should prefer reasoning field over think tags', async () => {
      // Set up both to succeed
      mockProvider.setMockResponse('5 * 7', {
        text: '"reasoning": "calculation here"',
        inputTokens: 15,
        outputTokens: 25,
        costUSD: 0.00015,
      });

      mockProvider.setMockResponse('capital of france', {
        text: '<thinking>Paris</thinking> Answer: Paris',
        inputTokens: 20,
        outputTokens: 30,
        costUSD: 0.0002,
      });

      const capabilities = await discovery.discoverCapabilities(mockProvider, 'test-model');

      // Should prefer reasoning_field
      expect(capabilities.thinkingFormat).toBe('reasoning_field');
    });

    it('should detect no reasoning field when not present', async () => {
      mockProvider.setMockResponse('5 * 7', {
        text: 'The answer is 35',
        inputTokens: 15,
        outputTokens: 10,
        costUSD: 0.0001,
      });

      const capabilities = await discovery.discoverCapabilities(mockProvider, 'test-model');

      const reasoningProbe = capabilities.probeResults.find(
        (r) => r.capability === 'reasoning_field'
      );
      expect(reasoningProbe?.success).toBe(false);
    });
  });

  describe('JSON Mode Detection', () => {
    it('should detect JSON mode when model outputs valid JSON', async () => {
      mockProvider.setMockResponse('3 + 3', {
        text: '{"answer": 6, "reasoning": "3 plus 3 equals 6"}',
        inputTokens: 20,
        outputTokens: 30,
        costUSD: 0.0002,
      });

      const capabilities = await discovery.discoverCapabilities(mockProvider, 'test-model');

      expect(capabilities.supportsJsonMode).toBe(true);

      const jsonProbe = capabilities.probeResults.find((r) => r.capability === 'json_mode');
      expect(jsonProbe?.success).toBe(true);
    });

    it('should extract JSON from surrounded text', async () => {
      mockProvider.setMockResponse('3 + 3', {
        text: 'Here is the JSON: {"answer": 6, "reasoning": "calculation"} done.',
        inputTokens: 20,
        outputTokens: 35,
        costUSD: 0.00025,
      });

      const capabilities = await discovery.discoverCapabilities(mockProvider, 'test-model');

      expect(capabilities.supportsJsonMode).toBe(true);
    });

    it('should detect no JSON mode when output is not JSON', async () => {
      mockProvider.setMockResponse('3 + 3', {
        text: 'The answer is 6 because 3 plus 3 equals 6',
        inputTokens: 20,
        outputTokens: 20,
        costUSD: 0.00015,
      });

      const capabilities = await discovery.discoverCapabilities(mockProvider, 'test-model');

      expect(capabilities.supportsJsonMode).toBe(false);
    });
  });

  describe('Cache Behavior', () => {
    it('should cache discovered capabilities', async () => {
      mockProvider.setMockResponse('2 + 2', {
        text: 'Using calculator tool: 4',
        inputTokens: 10,
        outputTokens: 15,
        costUSD: 0.0001,
      });

      const capabilities1 = await discovery.discoverCapabilities(mockProvider, 'cached-model');
      const callCount1 = mockProvider.getCallCount();

      const capabilities2 = await discovery.getOrDiscoverCapabilities(
        mockProvider,
        'cached-model'
      );
      const callCount2 = mockProvider.getCallCount();

      // Second call should use cache (no new API calls)
      expect(callCount2).toBe(callCount1);
      expect(capabilities2).toEqual(capabilities1);
    });

    it('should run discovery when not cached', async () => {
      const capabilities = await discovery.getOrDiscoverCapabilities(
        mockProvider,
        'uncached-model'
      );

      expect(capabilities).toBeDefined();
      expect(capabilities.probeResults.length).toBeGreaterThan(0);
    });

    it('should clear cache for specific model', async () => {
      await discovery.discoverCapabilities(mockProvider, 'model-1');
      await discovery.discoverCapabilities(mockProvider, 'model-2');

      discovery.clearCache('model-1');

      const callCountBefore = mockProvider.getCallCount();

      // model-1 should re-run discovery
      await discovery.getOrDiscoverCapabilities(mockProvider, 'model-1');
      const callCountAfter1 = mockProvider.getCallCount();
      expect(callCountAfter1).toBeGreaterThan(callCountBefore);

      // model-2 should use cache
      await discovery.getOrDiscoverCapabilities(mockProvider, 'model-2');
      const callCountAfter2 = mockProvider.getCallCount();
      expect(callCountAfter2).toBe(callCountAfter1);
    });

    it('should clear all cache when no model specified', async () => {
      await discovery.discoverCapabilities(mockProvider, 'model-1');
      await discovery.discoverCapabilities(mockProvider, 'model-2');

      discovery.clearCache();

      const callCountBefore = mockProvider.getCallCount();

      // Both should re-run discovery
      await discovery.getOrDiscoverCapabilities(mockProvider, 'model-1');
      await discovery.getOrDiscoverCapabilities(mockProvider, 'model-2');

      const callCountAfter = mockProvider.getCallCount();
      expect(callCountAfter).toBeGreaterThan(callCountBefore);
    });
  });

  describe('Error Handling', () => {
    it('should handle probe failures gracefully', async () => {
      const errorProvider: LLMProvider = {
        generate: async () => {
          throw new Error('API Error');
        },
        getModelName: () => 'error-model',
        isAvailable: async () => true,
        getPricing: () => mockProvider.getPricing(),
        getProviderId: () => 'error-provider',
      };

      const capabilities = await discovery.discoverCapabilities(errorProvider, 'error-model');

      expect(capabilities).toBeDefined();
      expect(capabilities.supportsToolCalling).toBe(false);
      expect(capabilities.thinkingFormat).toBe('none');

      // Should have error messages
      const errors = capabilities.probeResults.filter((r) => r.error);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle partial probe failures', async () => {
      let callCount = 0;
      const flakyProvider: LLMProvider = {
        generate: async (request: LLMRequest) => {
          callCount++;
          // First 3 calls fail (tool calling probes), rest succeed
          if (callCount <= 3) {
            throw new Error('First calls fail');
          }
          return {
            text: 'Success with tools',
            inputTokens: 10,
            outputTokens: 10,
            costUSD: 0.0001,
          };
        },
        getModelName: () => 'flaky-model',
        isAvailable: async () => true,
        getPricing: () => mockProvider.getPricing(),
        getProviderId: () => 'flaky-provider',
      };

      const capabilities = await discovery.discoverCapabilities(flakyProvider, 'flaky-model');

      expect(capabilities).toBeDefined();
      // Tool calling probes should all fail (3), others may succeed
      const toolFailures = capabilities.probeResults.filter(
        (r) => r.capability === 'tool_calling' && !r.success
      );
      expect(toolFailures.length).toBe(3);

      // Should have at least some probe results
      expect(capabilities.probeResults.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('Max Observed Tokens', () => {
    it('should track max observed tokens', async () => {
      mockProvider.setMockResponse('', {
        text: 'a'.repeat(1000), // ~250 tokens
        inputTokens: 50,
        outputTokens: 250,
        costUSD: 0.001,
      });

      const capabilities = await discovery.discoverCapabilities(mockProvider, 'test-model');

      expect(capabilities.maxObservedTokens).toBeGreaterThan(0);
      expect(capabilities.maxObservedTokens).toBeLessThanOrEqual(1000 / 4); // ~250 tokens
    });
  });

  describe('Probe Results', () => {
    it('should include all probe results', async () => {
      const capabilities = await discovery.discoverCapabilities(mockProvider, 'test-model');

      expect(capabilities.probeResults.length).toBeGreaterThanOrEqual(6);

      // Should have tool calling probes (3x)
      const toolProbes = capabilities.probeResults.filter((r) => r.capability === 'tool_calling');
      expect(toolProbes.length).toBe(3);

      // Should have think tags probe
      const thinkProbe = capabilities.probeResults.find((r) => r.capability === 'think_tags');
      expect(thinkProbe).toBeDefined();

      // Should have reasoning field probe
      const reasoningProbe = capabilities.probeResults.find(
        (r) => r.capability === 'reasoning_field'
      );
      expect(reasoningProbe).toBeDefined();

      // Should have JSON mode probe
      const jsonProbe = capabilities.probeResults.find((r) => r.capability === 'json_mode');
      expect(jsonProbe).toBeDefined();
    });

    it('should truncate raw responses for storage', async () => {
      mockProvider.setMockResponse('', {
        text: 'x'.repeat(10000), // Very long response
        inputTokens: 50,
        outputTokens: 2500,
        costUSD: 0.01,
      });

      const capabilities = await discovery.discoverCapabilities(mockProvider, 'test-model');

      for (const result of capabilities.probeResults) {
        if (result.rawResponse) {
          expect(result.rawResponse.length).toBeLessThanOrEqual(500);
        }
      }
    });
  });

  describe('Singleton Instance', () => {
    it('should export a singleton instance', () => {
      expect(modelCapabilityDiscovery).toBeInstanceOf(ModelCapabilityDiscovery);
    });

    it('should maintain separate cache from class instances', async () => {
      // Clear localStorage to ensure fresh state
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }

      const instance1 = new ModelCapabilityDiscovery();
      const instance2 = new ModelCapabilityDiscovery();

      await instance1.discoverCapabilities(mockProvider, 'separate-cache-model');

      // instance2 should not have instance1's memory cache, but may restore from localStorage
      // To test true separation, we need to clear localStorage too
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('model_capabilities_separate-cache-model');
      }

      const callCountBefore = mockProvider.getCallCount();
      await instance2.getOrDiscoverCapabilities(mockProvider, 'separate-cache-model');
      const callCountAfter = mockProvider.getCallCount();

      // Should make new calls since memory cache is separate and localStorage cleared
      expect(callCountAfter).toBeGreaterThan(callCountBefore);
    });
  });

  describe('localStorage Persistence', () => {
    it('should persist to localStorage when available', async () => {
      if (typeof localStorage === 'undefined') {
        // Skip in environments without localStorage
        return;
      }

      await discovery.discoverCapabilities(mockProvider, 'persistent-model');

      const stored = localStorage.getItem('model_capabilities_persistent-model');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.discoveredAt).toBeDefined();
      expect(parsed.probeResults).toBeDefined();
    });

    it('should restore from localStorage on cache miss', async () => {
      if (typeof localStorage === 'undefined') {
        return;
      }

      // First discovery
      await discovery.discoverCapabilities(mockProvider, 'restore-model');
      const callCountAfterFirst = mockProvider.getCallCount();

      // Create new instance (empty memory cache)
      const newDiscovery = new ModelCapabilityDiscovery();

      // Should restore from localStorage
      await newDiscovery.getOrDiscoverCapabilities(mockProvider, 'restore-model');
      const callCountAfterRestore = mockProvider.getCallCount();

      // Should not make new API calls
      expect(callCountAfterRestore).toBe(callCountAfterFirst);
    });
  });

  describe('Discovered At Timestamp', () => {
    it('should record discovery timestamp', async () => {
      const beforeTime = Date.now();
      const capabilities = await discovery.discoverCapabilities(mockProvider, 'test-model');
      const afterTime = Date.now();

      expect(capabilities.discoveredAt).toBeGreaterThanOrEqual(beforeTime);
      expect(capabilities.discoveredAt).toBeLessThanOrEqual(afterTime);
    });
  });
});
