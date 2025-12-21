import type { LLMProvider, LLMRequest, LLMResponse } from './LLMProvider.js';

/**
 * Ollama LLM provider for local model inference.
 */
export class OllamaProvider implements LLMProvider {
  private baseUrl: string;
  private model: string;

  constructor(model: string = 'qwen3:4b', baseUrl: string = 'http://localhost:11434') {
    this.model = model;
    this.baseUrl = baseUrl;
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: request.prompt,
          stream: false,
          options: {
            temperature: request.temperature ?? 0.7,
            num_predict: request.maxTokens ?? 150,
            stop: request.stopSequences,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        text: data.response || '',
        stopReason: data.done_reason,
        tokensUsed: data.eval_count,
      };
    } catch (error) {
      console.error('Ollama generate error:', error);
      throw error;
    }
  }

  getModelName(): string {
    return this.model;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
