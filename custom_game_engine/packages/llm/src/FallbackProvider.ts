/**
 * FallbackProvider - Wraps multiple LLM providers and tries them in order.
 *
 * If the primary provider fails, it automatically falls back to the next provider.
 * Useful for ensuring availability when using cloud APIs that may have rate limits
 * or temporary outages.
 *
 * Example usage:
 * ```typescript
 * const primary = new OpenAICompatProvider('llama-3.3-70b', 'https://api.groq.com/openai/v1', groqApiKey);
 * const backup = new OpenAICompatProvider('llama-3.3-70b', 'https://api.cerebras.ai/v1', cerebrasApiKey);
 * const provider = new FallbackProvider([primary, backup]);
 * ```
 */

import type { LLMProvider, LLMRequest, LLMResponse, ProviderPricing } from './LLMProvider.js';

export interface FallbackProviderOptions {
  /**
   * How long to wait before retrying a failed provider (ms).
   * Default: 60000 (1 minute)
   */
  retryAfterMs?: number;

  /**
   * Maximum number of consecutive failures before temporarily disabling a provider.
   * Default: 3
   */
  maxConsecutiveFailures?: number;

  /**
   * If true, log fallback events to console.
   * Default: true
   */
  logFallbacks?: boolean;
}

interface ProviderState {
  provider: LLMProvider;
  failureCount: number;
  lastFailure: number | null;
  disabled: boolean;
}

/**
 * A provider that wraps multiple providers and tries them in order.
 */
export class FallbackProvider implements LLMProvider {
  private providers: ProviderState[];
  private readonly retryAfterMs: number;
  private readonly maxConsecutiveFailures: number;
  private readonly logFallbacks: boolean;

  constructor(providers: LLMProvider[], options: FallbackProviderOptions = {}) {
    if (providers.length === 0) {
      throw new Error('FallbackProvider requires at least one provider');
    }

    this.providers = providers.map(provider => ({
      provider,
      failureCount: 0,
      lastFailure: null,
      disabled: false,
    }));

    this.retryAfterMs = options.retryAfterMs ?? 60000;
    this.maxConsecutiveFailures = options.maxConsecutiveFailures ?? 3;
    this.logFallbacks = options.logFallbacks ?? true;
  }

  /**
   * Get the list of provider IDs in fallback order.
   */
  getProviderIds(): string[] {
    return this.providers.map(p => p.provider.getProviderId());
  }

  /**
   * Get the currently active (first healthy) provider.
   */
  getActiveProvider(): LLMProvider | null {
    const state = this.getFirstHealthyProvider();
    return state?.provider ?? null;
  }

  /**
   * Get status of all providers.
   */
  getProviderStatus(): Array<{
    providerId: string;
    modelName: string;
    healthy: boolean;
    failureCount: number;
    lastFailure: Date | null;
  }> {
    const now = Date.now();
    return this.providers.map(state => ({
      providerId: state.provider.getProviderId(),
      modelName: state.provider.getModelName(),
      healthy: !state.disabled || (state.lastFailure !== null && now - state.lastFailure >= this.retryAfterMs),
      failureCount: state.failureCount,
      lastFailure: state.lastFailure ? new Date(state.lastFailure) : null,
    }));
  }

  /**
   * Reset all provider failure states.
   */
  resetFailures(): void {
    for (const state of this.providers) {
      state.failureCount = 0;
      state.lastFailure = null;
      state.disabled = false;
    }
  }

  /**
   * Get the first provider that isn't disabled (or has cooled down).
   */
  private getFirstHealthyProvider(): ProviderState | null {
    const now = Date.now();

    for (const state of this.providers) {
      // Re-enable providers after cooldown period
      if (state.disabled && state.lastFailure !== null) {
        if (now - state.lastFailure >= this.retryAfterMs) {
          state.disabled = false;
          state.failureCount = 0;
        }
      }

      if (!state.disabled) {
        return state;
      }
    }

    // All providers disabled - return the first one anyway (will retry)
    return this.providers[0] ?? null;
  }

  /**
   * Mark a provider as having failed.
   */
  private markFailure(state: ProviderState, error: Error): void {
    state.failureCount++;
    state.lastFailure = Date.now();

    if (state.failureCount >= this.maxConsecutiveFailures) {
      state.disabled = true;
      if (this.logFallbacks) {
        console.warn(
          `[FallbackProvider] Disabling ${state.provider.getProviderId()} after ${state.failureCount} failures. ` +
          `Will retry in ${this.retryAfterMs / 1000}s. Last error: ${error.message}`
        );
      }
    }
  }

  /**
   * Mark a provider as having succeeded.
   */
  private markSuccess(state: ProviderState): void {
    if (state.failureCount > 0) {
      state.failureCount = 0;
      state.disabled = false;
    }
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    let lastError: Error | null = null;

    // Try each provider in order
    for (let i = 0; i < this.providers.length; i++) {
      const state = this.providers[i]!;

      // Skip disabled providers (unless all are disabled)
      if (state.disabled && i < this.providers.length - 1) {
        const now = Date.now();
        if (state.lastFailure === null || now - state.lastFailure < this.retryAfterMs) {
          continue;
        }
        // Cooldown expired, try again
        state.disabled = false;
      }

      try {
        const response = await state.provider.generate(request);
        this.markSuccess(state);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.markFailure(state, lastError);

        if (this.logFallbacks && i < this.providers.length - 1) {
          console.warn(
            `[FallbackProvider] ${state.provider.getProviderId()} failed, trying next provider. Error: ${lastError.message}`
          );
        }
      }
    }

    // All providers failed
    throw new Error(`All LLM providers failed. Last error: ${lastError?.message ?? 'Unknown error'}`);
  }

  getModelName(): string {
    const active = this.getActiveProvider();
    return active?.getModelName() ?? this.providers[0]!.provider.getModelName();
  }

  async isAvailable(): Promise<boolean> {
    // Check if any provider is available
    for (const state of this.providers) {
      try {
        if (await state.provider.isAvailable()) {
          return true;
        }
      } catch {
        // Continue to next provider
      }
    }
    return false;
  }

  getPricing(): ProviderPricing {
    const active = this.getActiveProvider();
    return active?.getPricing() ?? this.providers[0]!.provider.getPricing();
  }

  getProviderId(): string {
    // Return the active provider's ID, prefixed with "fallback:"
    const active = this.getActiveProvider();
    const activeId = active?.getProviderId() ?? this.providers[0]!.provider.getProviderId();
    return `fallback:${activeId}`;
  }
}
