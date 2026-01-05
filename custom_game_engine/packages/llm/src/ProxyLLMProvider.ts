/**
 * ProxyLLMProvider - Client-side LLM provider that calls the server-side proxy
 *
 * This provider sends LLM requests to the metrics server's `/api/llm/generate` endpoint
 * instead of calling LLM APIs directly from the browser. This provides:
 *
 * 1. **Security**: API keys never exposed to the client
 * 2. **Rate Limiting**: Multi-game fair-share rate limiting enforced on the server
 * 3. **Fallback**: Server automatically tries multiple providers (Groq → Cerebras)
 * 4. **Queuing**: Requests are queued server-side with proper concurrency control
 * 5. **Session Tracking**: Heartbeat keeps session active for cooldown calculation
 *
 * Usage:
 * ```typescript
 * const provider = new ProxyLLMProvider('http://localhost:8766');
 * const response = await provider.generate(request);
 * provider.destroy(); // Clean up when done
 * ```
 */

import type { LLMProvider, LLMRequest, LLMResponse, ProviderPricing } from './LLMProvider.js';

export class ProxyLLMProvider implements LLMProvider {
  private readonly proxyUrl: string;
  private readonly timeout = 60000; // 60 second timeout (increased for queue wait)
  private readonly sessionId: string;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private cooldownState: Map<string, number> = new Map(); // provider → nextAllowedAt

  constructor(proxyUrl: string = 'http://localhost:8766') {
    this.proxyUrl = proxyUrl.replace(/\/$/, ''); // Remove trailing slash
    this.sessionId = this.generateSessionId();
    this.startHeartbeat();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private startHeartbeat(): void {
    // Send heartbeat every 30 seconds to keep session active
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat().catch((err) => {
        console.warn('[ProxyLLMProvider] Heartbeat failed:', err);
      });
    }, 30000);

    // Send initial heartbeat
    this.sendHeartbeat().catch(() => {
      // Ignore initial heartbeat failure
    });
  }

  private async sendHeartbeat(): Promise<void> {
    try {
      await fetch(`${this.proxyUrl}/api/llm/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.sessionId }),
      });
    } catch (error) {
      // Heartbeat is best-effort, don't throw
    }
  }

  private detectProvider(model?: string): string {
    // Simple provider detection based on model name
    if (!model) return 'groq';
    if (model.includes('llama') || model.includes('qwen')) return 'groq';
    if (model.includes('cerebras')) return 'cerebras';
    if (model.startsWith('gpt-')) return 'openai';
    if (model.startsWith('claude-')) return 'anthropic';
    return 'groq'; // Default
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const provider = this.detectProvider((request as any).model);
    const maxRetries = 3; // Retry up to 3 times if server-side rate limited
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      // Check client-side cooldown
      const nextAllowedAt = this.cooldownState.get(provider) || 0;
      const now = Date.now();

      if (now < nextAllowedAt) {
        const waitMs = nextAllowedAt - now;
        console.log(`[ProxyLLMProvider] Waiting ${waitMs}ms for ${provider} cooldown`);
        await this.sleep(waitMs);
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(`${this.proxyUrl}/api/llm/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: this.sessionId,
            agentId: (request as any).agentId || 'unknown',
            prompt: request.prompt,
            model: (request as any).model,
            maxTokens: request.maxTokens,
            temperature: request.temperature,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 429) {
          const errorData = await response.json().catch(() => ({}));

          // Extract cooldown time from server response
          const waitMs = errorData.cooldown?.waitMs ||
                        errorData.waitMs ||
                        8000; // Default 8 second wait if not specified

          // Update client-side cooldown state
          this.cooldownState.set(provider, Date.now() + waitMs);

          // If we haven't exceeded retries, wait and retry
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`[ProxyLLMProvider] Rate limited by server. Waiting ${waitMs}ms and retrying (${retryCount}/${maxRetries})...`);
            await this.sleep(waitMs);
            continue; // Retry the request
          } else {
            // Max retries exceeded, throw error
            throw new Error(
              `Rate limit cooldown: ${errorData.message || 'Max retries exceeded after rate limiting'}`
            );
          }
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
            errorData.error ||
            `Proxy error: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();

        // Update cooldown from server
        if (data.cooldown) {
          this.cooldownState.set(provider, data.cooldown.nextAllowedAt);
        }

        return {
          text: data.text,
          inputTokens: data.inputTokens,
          outputTokens: data.outputTokens,
          costUSD: data.costUSD,
        };
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('LLM proxy request timeout');
        }
        // Re-throw non-429 errors immediately
        throw error;
      }
    }

    // Should never reach here (loop always returns or throws)
    throw new Error('Unexpected error in generate loop');
  }

  /**
   * Clean up resources (stop heartbeat interval)
   */
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
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
