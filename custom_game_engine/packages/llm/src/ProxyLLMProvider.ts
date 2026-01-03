/**
 * ProxyLLMProvider - Client-side LLM provider that calls the server-side proxy
 *
 * This provider sends LLM requests to the metrics server's `/api/llm/generate` endpoint
 * instead of calling LLM APIs directly from the browser. This provides:
 *
 * 1. **Security**: API keys never exposed to the client
 * 2. **Rate Limiting**: Global rate limits per API key enforced on the server
 * 3. **Fallback**: Server automatically tries multiple providers (Groq → Cerebras)
 *
 * Usage:
 * ```typescript
 * const provider = new ProxyLLMProvider('http://localhost:8766');
 * const response = await provider.generate(request);
 * ```
 */

import type { LLMProvider, LLMRequest, LLMResponse, ProviderPricing } from './LLMProvider.js';

export class ProxyLLMProvider implements LLMProvider {
  private readonly proxyUrl: string;
  private readonly timeout = 30000; // 30 second timeout

  constructor(proxyUrl: string = 'http://localhost:8766') {
    this.proxyUrl = proxyUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.proxyUrl}/api/llm/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
          errorData.error ||
          `Proxy error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('LLM proxy request timeout');
      }
      throw error;
    }
  }

  getModelName(): string {
    return 'proxy';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.proxyUrl}/api/live/status`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  getPricing(): ProviderPricing {
    // Pricing varies by backend provider - report as free since client doesn't control it
    return {
      providerId: 'proxy',
      providerName: 'LLM Proxy',
      inputCostPer1M: 0,
      outputCostPer1M: 0
    };
  }

  getProviderId(): string {
    return 'proxy';
  }
}
