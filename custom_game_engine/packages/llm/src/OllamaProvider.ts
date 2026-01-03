import type { LLMProvider, LLMRequest, LLMResponse, ProviderPricing } from './LLMProvider.js';

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

      // Define action tools - matches ActionDefinitions.ts (16 tools)
      // NOTE: Autonomic behaviors (wander, idle, rest, seek_sleep, seek_warmth) are NOT included
      const tools = [
        {
          type: 'function',
          function: {
            name: 'pick',
            description: 'Pick up a single item nearby',
            parameters: {
              type: 'object',
              properties: {
                target: { type: 'string', description: 'What to pick: wood, stone, berry, etc.' }
              }
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'gather',
            description: 'Stockpile resources - gather a specified amount and store in chest',
            parameters: {
              type: 'object',
              properties: {
                target: { type: 'string', description: 'Resource type: wood, stone, berry, etc.' },
                amount: { type: 'number', description: 'How many to gather' }
              }
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'talk',
            description: 'Have a conversation with someone nearby',
            parameters: {
              type: 'object',
              properties: {
                target: { type: 'string', description: 'Name of agent to talk to' }
              }
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'follow_agent',
            description: 'Follow another agent',
            parameters: {
              type: 'object',
              properties: {
                target: { type: 'string', description: 'Name of agent to follow' }
              }
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'call_meeting',
            description: 'Call a meeting to discuss something',
            parameters: {
              type: 'object',
              properties: {
                topic: { type: 'string', description: 'What to discuss' }
              }
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'attend_meeting',
            description: 'Attend an ongoing meeting',
            parameters: { type: 'object', properties: {} }
          }
        },
        {
          type: 'function',
          function: {
            name: 'help',
            description: 'Help another agent with their task',
            parameters: {
              type: 'object',
              properties: {
                target: { type: 'string', description: 'Name of agent to help' }
              }
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'build',
            description: 'Construct a building (requires materials in inventory)',
            parameters: {
              type: 'object',
              properties: {
                building: { type: 'string', description: 'Building type: campfire, tent, storage-chest, etc.' }
              },
              required: ['building']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'plan_build',
            description: 'Plan a building project - automatically gathers resources then builds',
            parameters: {
              type: 'object',
              properties: {
                building: { type: 'string', description: 'Building type: storage-chest, campfire, tent, etc.' }
              },
              required: ['building']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'till',
            description: 'Prepare soil for planting',
            parameters: { type: 'object', properties: {} }
          }
        },
        {
          type: 'function',
          function: {
            name: 'farm',
            description: 'Work on farming tasks (water, fertilize, tend crops)',
            parameters: { type: 'object', properties: {} }
          }
        },
        {
          type: 'function',
          function: {
            name: 'plant',
            description: 'Plant seeds in tilled soil',
            parameters: {
              type: 'object',
              properties: {
                seed: { type: 'string', description: 'Seed type: wheat, carrot, etc.' }
              }
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'explore',
            description: 'Systematically explore unknown areas to find new resources',
            parameters: { type: 'object', properties: {} }
          }
        },
        {
          type: 'function',
          function: {
            name: 'tame_animal',
            description: 'Approach and tame a wild animal',
            parameters: {
              type: 'object',
              properties: {
                target: { type: 'string', description: 'Animal to tame' }
              }
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'house_animal',
            description: 'Lead a tamed animal to its housing',
            parameters: {
              type: 'object',
              properties: {
                target: { type: 'string', description: 'Animal to house' }
              }
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'set_priorities',
            description: 'Set task priorities (gathering, building, farming, social)',
            parameters: {
              type: 'object',
              properties: {
                gathering: { type: 'number', description: 'Priority 0-100' },
                building: { type: 'number', description: 'Priority 0-100' },
                farming: { type: 'number', description: 'Priority 0-100' },
                social: { type: 'number', description: 'Priority 0-100' }
              }
            }
          }
        }
      ];

      // System message to guide model to use tools
      const systemMessage = `You are a character in a village survival simulation. You MUST respond by calling exactly ONE of the available tools/functions. Do NOT respond with text - only use function calls.

When you decide what to do, call the appropriate function:
- To build something: call plan_build with the building type (storage-chest, campfire, tent, etc.)
- To gather resources: call gather with resource type and amount (e.g., gather wood 20)
- For social actions: call talk, follow_agent, call_meeting, attend_meeting, or help
- For farming: call till, plant, or farm
- For exploration: call explore
- For animals: call tame_animal or house_animal
- To pick up items: call pick
- To set priorities: call set_priorities

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
          inputTokens: data.prompt_eval_count || 0,
          outputTokens: data.eval_count || 0,
          costUSD: 0  // Ollama is free (local inference)
        };
      }

      // Return structured response
      return {
        text: responseText,
        stopReason: data.done_reason,
        tokensUsed: data.eval_count,
        inputTokens: data.prompt_eval_count || 0,
        outputTokens: data.eval_count || 0,
        costUSD: 0  // Ollama is free (local inference)
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

  getPricing(): ProviderPricing {
    return {
      providerId: 'ollama',
      providerName: 'Ollama (Local)',
      inputCostPer1M: 0,   // Free - local inference
      outputCostPer1M: 0   // Free - local inference
    };
  }

  getProviderId(): string {
    return 'ollama';
  }
}
