import type { LLMProvider, LLMRequest, LLMResponse } from './LLMProvider.js';

// Valid actions that can be extracted from text
// const VALID_ACTIONS = [
//   'wander', 'idle', 'seek_food', 'follow_agent', 'talk', 'gather',
//   'explore', 'approach', 'observe', 'rest', 'work', 'help'
// ];

/**
 * OpenAI-compatible LLM provider.
 * Works with Groq, Ollama (/v1 endpoint), OpenRouter, Together, etc.
 *
 * Model-specific handling:
 * - Qwen3 models: Use <think>...</think> tags, may not use tool calling
 * - Llama models: Good tool calling support, no think tags
 */
export class OpenAICompatProvider implements LLMProvider {
  private baseUrl: string;
  private model: string;
  private apiKey: string;
  private readonly timeout = 30000; // 30 second timeout
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 1000;
  public customHeaders?: Record<string, string>; // Custom headers for per-agent config

  constructor(
    model: string = 'qwen/qwen3-32b',
    baseUrl: string = 'https://api.groq.com/openai/v1',
    apiKey: string = ''
  ) {
    this.model = model;
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
  }

  /**
   * Update the provider configuration dynamically
   */
  configure(config: { model?: string; baseUrl?: string; apiKey?: string }): void {
    if (config.model) this.model = config.model;
    if (config.baseUrl) this.baseUrl = config.baseUrl.replace(/\/$/, '');
    if (config.apiKey !== undefined) this.apiKey = config.apiKey;
    // console.log('[OpenAICompatProvider] Configured:', {
    //   model: this.model,
    //   baseUrl: this.baseUrl,
    //   hasApiKey: !!this.apiKey
    // });
  }

  /**
   * Fetch with timeout and retry logic for transient failures
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = this.maxRetries
  ): Promise<Response> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if it's a retryable error (network issues, timeout)
        const isRetryable =
          lastError.name === 'AbortError' ||
          lastError.message.includes('Failed to fetch') ||
          lastError.message.includes('network') ||
          lastError.message.includes('ECONNRESET');

        if (isRetryable && attempt < retries) {
          const delay = this.retryDelayMs * Math.pow(2, attempt); // Exponential backoff
          console.warn(
            `[OpenAICompatProvider] Fetch failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms:`,
            lastError.message
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw lastError;
      }
    }

    throw lastError || new Error('Fetch failed after retries');
  }


  // /**
  //  * Extract action from text content when tool calling isn't used
  //  */
  // private _extractActionFromText(text: string): string | null {
  //   const lowerText = text.toLowerCase();
  //
  //   // Look for action keywords in the text
  //   for (const action of VALID_ACTIONS) {
  //     // Check for patterns like "I will wander", "going to gather", "ACTION: wander"
  //     const patterns = [
  //       new RegExp(`\\b${action}\\b`, 'i'),
  //       new RegExp(`action[:\\s]+${action}`, 'i'),
  //       new RegExp(`i will ${action}`, 'i'),
  //       new RegExp(`i'll ${action}`, 'i'),
  //       new RegExp(`going to ${action}`, 'i'),
  //       new RegExp(`let me ${action}`, 'i'),
  //     ];
  //
  //     for (const pattern of patterns) {
  //       if (pattern.test(lowerText)) {
  //         return action;
  //       }
  //     }
  //   }
  //
  //   // Check for specific phrases
  //   if (/look around|looking around|explore/.test(lowerText)) return 'wander';
  //   if (/find food|hungry|eat/.test(lowerText)) return 'seek_food';
  //   if (/take a rest|need rest|tired/.test(lowerText)) return 'rest';
  //   if (/do nothing|wait|stand/.test(lowerText)) return 'idle';
  //   if (/collect|pick up|forage/.test(lowerText)) return 'gather';
  //   if (/watch|looking at|pay attention/.test(lowerText)) return 'observe';
  //   if (/walk toward|move toward|go to/.test(lowerText)) return 'approach';
  //   if (/say|speak|tell|chat/.test(lowerText)) return 'talk';
  //
  //   return null;
  // }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    try {
      // const _isQwen = this.isQwenModel();
      // const _isLlama = this.isLlamaModel();

      // Define action tools - matches ActionDefinitions.ts
      // NOTE: Autonomic behaviors (wander, rest, idle) are NOT included
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
              },
              required: ['target']
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
                amount: { type: 'number', description: 'How many to gather (e.g. 20)' }
              },
              required: ['target']
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
                building: { type: 'string', description: 'Building type: campfire, tent, storage-chest, workbench, bed, etc.' }
              },
              required: ['building']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'plan_build',
            description: 'Plan a building project - automatically gathers required resources then builds. This is the easiest way to build!',
            parameters: {
              type: 'object',
              properties: {
                building: { type: 'string', description: 'Building type: storage-chest, campfire, tent, workbench, bed, etc.' }
              },
              required: ['building']
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
                target: { type: 'string', description: 'Name of agent to talk to, or "nearest"' }
              },
              required: []
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
              },
              required: []
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'till',
            description: 'Prepare soil for planting',
            parameters: { type: 'object', properties: {}, required: [] }
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
                seed: { type: 'string', description: 'Seed type to plant: wheat, carrot, etc.' }
              },
              required: ['seed']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'deposit_items',
            description: 'Store items in a storage building',
            parameters: { type: 'object', properties: {}, required: [] }
          }
        },
        {
          type: 'function',
          function: {
            name: 'call_meeting',
            description: 'Call a meeting to discuss something with the village',
            parameters: {
              type: 'object',
              properties: {
                topic: { type: 'string', description: 'What to discuss' }
              },
              required: []
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'set_priorities',
            description: 'Set task priorities for what to focus on',
            parameters: {
              type: 'object',
              properties: {
                gathering: { type: 'number', description: 'Priority 0-100' },
                building: { type: 'number', description: 'Priority 0-100' },
                farming: { type: 'number', description: 'Priority 0-100' },
                social: { type: 'number', description: 'Priority 0-100' }
              },
              required: []
            }
          }
        }
      ];

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add API key if provided
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      // Add custom headers if provided
      if (this.customHeaders) {
        Object.assign(headers, this.customHeaders);
      }

      // System message to instruct the model on response format
      // Adjust thinking instructions based on model type
      const isQwen = this.model.toLowerCase().includes('qwen');
      const isLlama = this.model.toLowerCase().includes('llama');
      const isDeepseek = this.model.toLowerCase().includes('deepseek');

      let thinkingInstructions: string;
      if (isQwen) {
        // Qwen3 uses <think> tags for reasoning
        thinkingInstructions = `First, reason about what to do inside <think>...</think> tags. This is your internal thought process - take your time to consider the situation.`;
      } else if (isDeepseek) {
        // DeepSeek also supports thinking tags
        thinkingInstructions = `Use <think>...</think> tags to reason through what you should do before acting.`;
      } else if (isLlama) {
        // Llama models - just ask for brief reasoning
        thinkingInstructions = `Briefly consider what you should do based on the situation.`;
      } else {
        // Default - simple reasoning request
        thinkingInstructions = `Think briefly about what action makes sense.`;
      }

      const systemMessage = {
        role: 'system',
        content: `You are an AI controlling a village character.

${thinkingInstructions}

Then respond with:
1. What you SAY out loud (a short phrase, or nothing if silent)
2. Call a tool to perform your ACTION

Your spoken words go directly in the message content - just the words, no labels.

Example: "Time to gather wood!" + call gather(target: "wood", amount: 10)

Keep speech brief and natural.`
      };

      const response = await this.fetchWithRetry(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.model,
          messages: [
            systemMessage,
            { role: 'user', content: request.prompt }
          ],
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 40960,
          tools: tools,
          tool_choice: 'auto',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Check if this is a 400 error (usually tool calling issues) - fall back to text parsing
        if (response.status === 400) {
          console.warn(`[OpenAICompatProvider] Tool calling failed for ${this.model} (400 error), falling back to text-based parsing`);
          console.warn(`[OpenAICompatProvider] Error was:`, errorText.substring(0, 200));
          // Retry without tools
          return this.generateWithoutTools(request);
        }

        throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      // Extract from OpenAI format
      const choice = data.choices?.[0];
      const message = choice?.message || {};
      const content = message.content || '';
      const toolCalls = message.tool_calls || [];

      // Extract action from tool call - include arguments
      let action: string | { type: string; [key: string]: unknown } = '';
      if (toolCalls.length > 0) {
        const toolCall = toolCalls[0];
        const actionName = toolCall.function.name;
        let actionArgs: Record<string, unknown> = {};

        // Parse arguments if present
        try {
          if (toolCall.function.arguments) {
            actionArgs = JSON.parse(toolCall.function.arguments);
          }
        } catch {
          // Arguments parsing failed, use empty object
        }

        // If there are arguments, create action object with type and params
        if (Object.keys(actionArgs).length > 0) {
          action = { type: actionName, ...actionArgs };
        } else {
          action = actionName;
        }
      }

      // Extract thinking - different models use different formats
      // Qwen3: uses message.reasoning field
      // Other models: may use <think>...</think> tags in content
      let thinking = '';
      let speech = content;

      // Check for Qwen-style reasoning field first (Groq API returns this)
      if (message.reasoning) {
        thinking = message.reasoning.trim();
      }

      // Also check for <think> tags in content (fallback for models that use this format)
      const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
      if (thinkMatch) {
        thinking = thinkMatch[1].trim();
        // Speech is everything after the think tag
        speech = content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
      }

      // Clean up speech - remove common prefixes that models add incorrectly
      speech = speech
        .replace(/^Content:\s*/i, '')           // Remove "Content: " prefix
        .replace(/^Speaking:\s*/i, '')          // Remove "Speaking: " prefix
        .replace(/^Speech:\s*/i, '')            // Remove "Speech: " prefix
        .replace(/^Message:\s*/i, '')           // Remove "Message: " prefix
        .replace(/^Tool call:.*$/gim, '')       // Remove any "Tool call: ..." lines
        .replace(/^Action:.*$/gim, '')          // Remove any "Action: ..." lines
        .trim();

      // Format as JSON string for the parser
      const responseText = JSON.stringify({
        thinking: thinking,
        speaking: speech,
        action: action
      });

      // If no action was called, fall back to text parsing
      const hasAction = action && (typeof action === 'string' ? action.length > 0 : true);
      if (!hasAction) {
        if (!content) {
          console.error('[OpenAICompatProvider] Empty response:', data);
        }

        return {
          text: content,
          stopReason: choice?.finish_reason,
          tokensUsed: data.usage?.total_tokens,
        };
      }

      // Return structured response
      return {
        text: responseText,
        stopReason: choice?.finish_reason,
        tokensUsed: data.usage?.total_tokens,
      };
    } catch (error) {
      console.error('[OpenAICompatProvider] Generate error:', error);
      console.error('[OpenAICompatProvider] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        model: this.model,
        url: `${this.baseUrl}/chat/completions`,
        hasApiKey: !!this.apiKey,
      });
      throw error;
    }
  }

  /**
   * Fallback generation without tool calling (text-based action extraction)
   */
  private async generateWithoutTools(request: LLMRequest): Promise<LLMResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    // System message for text-based responses
    // Model-specific thinking format
    const isQwen = this.model.toLowerCase().includes('qwen');
    const isDeepseek = this.model.toLowerCase().includes('deepseek');

    let thoughtFormat: string;
    if (isQwen || isDeepseek) {
      thoughtFormat = `<think>[your reasoning]</think>`;
    } else {
      thoughtFormat = `Thought: [your reasoning]`;
    }

    const systemMessage = {
      role: 'system',
      content: `You are an AI controlling a village character.

Format your response like this:
${thoughtFormat}
Speech: [what you say out loud, or "..." if silent]
Action: [choose ONE: pick, gather, build, plan_build, talk, follow_agent, wander, till, plant, deposit_items, call_meeting, set_priorities]

Actions can have targets: "gather wood 20" or "build storage-chest" or "talk Haven"
Use plan_build to queue a building project - you'll automatically gather resources then build it! Example: "plan_build storage-chest"

Be brief and natural.`
    };
    const response = await this.fetchWithRetry(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.model,
        messages: [
          systemMessage,
          { role: 'user', content: request.prompt }
        ],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 40960,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenAICompatProvider] Text-based request failed:', response.status, errorText);
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse the structured text response
    // Support both <think> tags (Qwen/DeepSeek) and "Thought:" prefix
    let thinking = '';
    let contentAfterThink = content;

    const thinkTagMatch = content.match(/<think>([\s\S]*?)<\/think>/);
    if (thinkTagMatch) {
      thinking = thinkTagMatch[1].trim();
      contentAfterThink = content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
    } else {
      const thoughtMatch = content.match(/Thought:\s*(.+?)(?=\n|Speech:|Action:|$)/is);
      if (thoughtMatch) {
        thinking = thoughtMatch[1].trim();
      }
    }

    const speechMatch = contentAfterThink.match(/Speech:\s*(.+?)(?=\n|Action:|$)/is);
    const actionMatch = contentAfterThink.match(/Action:\s*(.+?)(?=\n|$)/i);

    const speech = speechMatch ? speechMatch[1].trim().replace(/^["']|["']$/g, '') : '';

    // Parse action - may include target like "gather wood 20"
    let action = 'gather'; // Default to gather, not idle (idle is autonomic)
    if (actionMatch) {
      const actionStr = actionMatch[1].trim().toLowerCase();
      // Extract first word as action type
      const parts = actionStr.split(/\s+/);
      action = parts[0] || 'gather';
    }

    // Format as JSON for the parser
    const responseText = JSON.stringify({
      thinking: thinking,
      speaking: speech === '...' ? '' : speech,
      action: action
    });


    return {
      text: responseText,
      stopReason: data.choices?.[0]?.finish_reason,
      tokensUsed: data.usage?.total_tokens,
    };
  }

  getModelName(): string {
    return this.model;
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Try a simple models list request
      const headers: Record<string, string> = {};
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers,
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
