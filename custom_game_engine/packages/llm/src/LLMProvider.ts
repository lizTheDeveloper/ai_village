/**
 * LLM Provider interface for agent decision making.
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
  tokensUsed?: number;
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
}
