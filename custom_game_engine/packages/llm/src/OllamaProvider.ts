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
            num_predict: request.maxTokens ?? 100,
            stop: request.stopSequences, // Let caller control stop sequences
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // qwen3 models use 'thinking' field for chain-of-thought reasoning
      // Extract actual response from either 'response' or 'thinking' field
      const responseText = data.response || data.thinking || '';

      console.log('[OllamaProvider] Response:', {
        model: this.model,
        hasResponse: !!data.response,
        hasThinking: !!data.thinking,
        responseLength: responseText.length,
        text: responseText.slice(0, 100) + (responseText.length > 100 ? '...' : ''),
        doneReason: data.done_reason,
        evalCount: data.eval_count,
      });

      if (!responseText) {
        console.error('[OllamaProvider] Empty response from Ollama:', data);
      }

      return {
        text: responseText,
        stopReason: data.done_reason,
        tokensUsed: data.eval_count,
      };
    } catch (error) {
      console.error('[OllamaProvider] Ollama generate error:', error);
      console.error('[OllamaProvider] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        model: this.model,
        url: `${this.baseUrl}/api/generate`,
      });
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
