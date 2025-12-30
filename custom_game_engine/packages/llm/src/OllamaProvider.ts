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
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for local LLM

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
        },
        {
          type: 'function',
          function: {
            name: 'build',
            description: 'Build a structure (campfire, workbench, storage-chest, tent, bed, farm-shed)',
            parameters: {
              type: 'object',
              properties: {
                building: {
                  type: 'string',
                  description: 'Type of building to construct',
                  enum: ['campfire', 'workbench', 'storage-chest', 'tent', 'bed', 'farm-shed', 'lean-to', 'well']
                }
              },
              required: ['building']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'plan_build',
            description: 'Plan to build something - your character will automatically gather materials and build it',
            parameters: {
              type: 'object',
              properties: {
                building: {
                  type: 'string',
                  description: 'Type of building to plan',
                  enum: ['campfire', 'workbench', 'storage-chest', 'tent', 'bed', 'farm-shed', 'lean-to', 'well', 'forge']
                }
              },
              required: ['building']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'set_priorities',
            description: 'Set your strategic priorities (0-1 weights) to guide your behavior',
            parameters: {
              type: 'object',
              properties: {
                gathering: { type: 'number', description: 'Priority for gathering wood, stone, food (0-1)' },
                building: { type: 'number', description: 'Priority for construction (0-1)' },
                farming: { type: 'number', description: 'Priority for farming (0-1)' },
                social: { type: 'number', description: 'Priority for talking/helping (0-1)' },
                exploration: { type: 'number', description: 'Priority for exploring (0-1)' },
                rest: { type: 'number', description: 'Priority for resting (0-1)' }
              }
            }
          }
        }
      ];

      // System message to guide model to use tools
      const systemMessage = `You are a character in a village survival simulation. You MUST respond by calling exactly ONE of the available tools/functions. Do NOT respond with text - only use function calls.

When you decide what to do, call the appropriate function:
- To build something: call plan_build with the building type (workbench, campfire, storage-chest, tent, forge, etc.)
- To set your priorities: call set_priorities with your priority weights (0-1)
- For simple actions: call wander, rest, gather, idle, explore, talk, or work

IMPORTANT: You MUST use a tool call. Text responses will be ignored.`;

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: request.prompt }
          ],
          stream: false,
          tools: tools,
          options: {
            temperature: request.temperature ?? 0.7,
            num_predict: request.maxTokens ?? 40960,
          },
        }),
        signal: controller.signal, // Add timeout signal
      });

      clearTimeout(timeoutId); // Clear timeout on successful response

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Extract components from response
      const message = data.message || {};
      const thinking = message.thinking || '';  // Qwen3 thinking field
      const speaking = message.content || '';   // Assistant message
      const toolCalls = message.tool_calls || [];

      // Extract action from tool call (with parameters for complex actions)
      let action: string | { type: string; [key: string]: unknown } = '';
      if (toolCalls.length > 0) {
        const toolCall = toolCalls[0];
        const funcName = toolCall.function.name;
        const funcArgs = toolCall.function.arguments || {};

        // For actions with parameters, return structured object
        if (funcName === 'plan_build' || funcName === 'build') {
          action = { type: funcName, building: funcArgs.building || 'workbench' };
        } else if (funcName === 'set_priorities') {
          action = { type: 'set_priorities', priorities: funcArgs };
        } else {
          // Simple action - just the name
          action = funcName;
        }
      }

      // Format as JSON string for the parser
      const responseText = JSON.stringify({
        thinking: thinking,
        speaking: speaking,
        action: action
      });


      // If no action was called, fall back to text parsing
      if (!action) {
        const fallbackText = speaking || thinking || '';
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
