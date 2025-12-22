import type { LLMProvider, LLMRequest, LLMResponse } from './LLMProvider.js';

/**
 * Load-balancing provider that distributes requests across multiple LLM backends.
 * Uses round-robin distribution for simplicity.
 */
export class LoadBalancingProvider implements LLMProvider {
  private providers: LLMProvider[];
  private currentIndex = 0;
  private name: string;

  constructor(providers: LLMProvider[], name: string = 'load-balanced') {
    if (providers.length === 0) {
      throw new Error('LoadBalancingProvider requires at least one provider');
    }
    this.providers = providers;
    this.name = name;
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    // Round-robin selection
    const provider = this.providers[this.currentIndex]!;
    this.currentIndex = (this.currentIndex + 1) % this.providers.length;

    return provider.generate(request);
  }

  getModelName(): string {
    return `${this.name}(${this.providers.map(p => p.getModelName()).join(', ')})`;
  }

  async isAvailable(): Promise<boolean> {
    // Available if at least one provider is available
    const results = await Promise.all(this.providers.map(p => p.isAvailable()));
    return results.some(r => r);
  }

  /**
   * Get count of available providers
   */
  async getAvailableCount(): Promise<number> {
    const results = await Promise.all(this.providers.map(p => p.isAvailable()));
    return results.filter(r => r).length;
  }
}
