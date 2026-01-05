/**
 * LLM Provider types for core package.
 *
 * These types are defined here to break the circular dependency between
 * @ai-village/core and @ai-village/llm. The llm package implements these
 * interfaces, and core uses them via structural typing.
 */

export interface LLMRequest {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

export interface LLMResponse {
  text: string;
  stopReason?: string;
  tokensUsed?: number; // Deprecated: use inputTokens + outputTokens

  // Detailed token counts
  inputTokens: number;
  outputTokens: number;

  // Cost information
  costUSD: number;
}

export interface ProviderPricing {
  providerId: string;
  providerName: string;
  inputCostPer1M: number; // Cost per 1M input tokens (USD)
  outputCostPer1M: number; // Cost per 1M output tokens (USD)
}

export interface LLMProvider {
  /**
   * Generate a response from the LLM.
   */
  generate(request: LLMRequest): Promise<LLMResponse>;

  /**
   * Get the model name being used.
   */
  getModelName(): string;

  /**
   * Check if the provider is available.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get pricing information for this provider.
   */
  getPricing(): ProviderPricing;

  /**
   * Get the provider ID (e.g., 'ollama', 'groq', 'openai', 'mlx')
   */
  getProviderId(): string;
}
