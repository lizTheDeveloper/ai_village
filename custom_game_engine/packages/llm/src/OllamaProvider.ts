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
      // Define action tools - simple, no parameters
      const tools = [
        {
          type: 'function',
          function: {
            name: 'wander',
            description: 'Explore the area, move around randomly',
            parameters: { type: 'object', properties: {} }
          }
        },
        {
          type: 'function',
          function: {
            name: 'idle',
            description: 'Do nothing, rest and recover energy',
            parameters: { type: 'object', properties: {} }
          }
        },
        {
          type: 'function',
          function: {
            name: 'seek_food',
            description: 'Find and eat food to satisfy hunger',
            parameters: { type: 'object', properties: {} }
          }
        },
        {
          type: 'function',
          function: {
            name: 'follow_agent',
            description: 'Follow another agent you see nearby',
            parameters: { type: 'object', properties: {} }
          }
        },
        {
          type: 'function',
          function: {
            name: 'talk',
            description: 'Start a conversation with a nearby agent',
            parameters: { type: 'object', properties: {} }
          }
        },
        {
          type: 'function',
          function: {
            name: 'gather',
            description: 'Gather resources from the environment (forage, collect items)',
            parameters: { type: 'object', properties: {} }
          }
        },
        {
          type: 'function',
          function: {
            name: 'explore',
            description: 'Explore with purpose, looking for something specific',
            parameters: { type: 'object', properties: {} }
          }
        },
        {
          type: 'function',
          function: {
            name: 'approach',
            description: 'Move toward a nearby agent or location',
            parameters: { type: 'object', properties: {} }
          }
        },
        {
          type: 'function',
          function: {
            name: 'observe',
            description: 'Watch and pay attention to surroundings or someone nearby',
            parameters: { type: 'object', properties: {} }
          }
        },
        {
          type: 'function',
          function: {
            name: 'rest',
            description: 'Sit down and rest to recover energy',
            parameters: { type: 'object', properties: {} }
          }
        },
        {
          type: 'function',
          function: {
            name: 'work',
            description: 'Do productive work (farm, craft, build)',
            parameters: { type: 'object', properties: {} }
          }
        },
        {
          type: 'function',
          function: {
            name: 'help',
            description: 'Help a nearby agent with their task',
            parameters: { type: 'object', properties: {} }
          }
        }
      ];

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: request.prompt }],
          stream: false,
          tools: tools,
          options: {
            temperature: request.temperature ?? 0.7,
            num_predict: request.maxTokens ?? 2000,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Extract components from response
      const message = data.message || {};
      const thinking = message.thinking || '';  // Qwen3 thinking field
      const speaking = message.content || '';   // Assistant message
      const toolCalls = message.tool_calls || [];

      // Extract action from tool call
      const action = toolCalls.length > 0 ? toolCalls[0].function.name : '';

      // Format as JSON string for the parser
      const responseText = JSON.stringify({
        thinking: thinking,
        speaking: speaking,
        action: action
      });

      console.log('[OllamaProvider] Response:', {
        model: this.model,
        action: action || '(no action)',
        thinking: thinking ? thinking.slice(0, 60) + '...' : '(no thoughts)',
        speaking: speaking || '(silent)',
        tokensUsed: data.eval_count,
      });

      // If no action was called, fall back to text parsing
      if (!action) {
        const fallbackText = speaking || thinking || '';

        console.log('[OllamaProvider] No tool call, using text fallback');

        if (!fallbackText) {
          console.error('[OllamaProvider] Empty response from Ollama:', data);
        }

        return {
          text: fallbackText,
          stopReason: data.done_reason,
          tokensUsed: data.eval_count,
        };
      }

      // Return structured response
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
