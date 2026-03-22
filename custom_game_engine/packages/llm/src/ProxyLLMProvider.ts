/**
 * ProxyLLMProvider - Client-side LLM provider that calls the game-proxy
 *
 * Sends LLM requests to the game-proxy's `/api/llm/think` endpoint.
 * The proxy holds the API key server-side and forwards to Groq.
 *
 * Usage:
 * ```typescript
 * const provider = new ProxyLLMProvider(import.meta.env.VITE_LLM_PROXY_URL);
 * const response = await provider.generate(request);
 * provider.destroy();
 * ```
 */

import type { LLMProvider, LLMRequest, LLMResponse, ProviderPricing } from './LLMProvider.js';

export interface ProxyLLMRequest extends LLMRequest {
  agentId?: string;
  model?: string;
  tier?: string;
}

export class ProxyLLMProvider implements LLMProvider {
  private readonly proxyUrl: string;
  private readonly timeout = 60000;
  private serverErrorCount: number = 0;
  private disabledUntil: number = 0;

  constructor(proxyUrl: string) {
    this.proxyUrl = proxyUrl.replace(/\/$/, '');
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const now = Date.now();
    if (now < this.disabledUntil) {
      throw new Error('LLM proxy temporarily disabled (repeated server errors)');
    }

    const proxyRequest = request as ProxyLLMRequest;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.proxyUrl}/api/llm/think`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: request.prompt }],
          max_tokens: request.maxTokens ?? 256,
          temperature: request.temperature ?? 0.7,
          stripThinkTags: true,
          playerId: proxyRequest.agentId,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        throw new Error('Rate limited by LLM proxy — try again shortly');
      }

      if (!response.ok) {
        if (response.status === 500) {
          this.serverErrorCount++;
          if (this.serverErrorCount >= 2) {
            this.disabledUntil = Date.now() + 60000;
          }
        }
        let errorData: Record<string, unknown> = {};
        try { errorData = await response.json(); } catch { /* ignore parse failure */ }
        throw new Error(
          (errorData.error as string) || `Proxy error: ${response.status} ${response.statusText}`
        );
      }

      // Reset error count on success
      this.serverErrorCount = 0;

      const data = await response.json();

      return {
        text: data.text ?? '',
        inputTokens: 0,
        outputTokens: 0,
        costUSD: 0,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('LLM proxy request timeout');
      }
      throw error;
    }
  }

  destroy(): void {
    // No resources to clean up
  }

  getModelName(): string {
    return 'proxy';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.proxyUrl}/api/llm/providers`, {
        method: 'GET',
      });
      if (!response.ok) return false;
      const data = await response.json();
      return data.available === true;
    } catch {
      return false;
    }
  }

  getPricing(): ProviderPricing {
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
