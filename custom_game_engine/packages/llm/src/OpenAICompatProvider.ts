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

      // Define action tools - OpenAI function calling format
      // Actions have no parameters - speech comes from message content
      const tools = [
        {
          type: 'function',
          function: {
            name: 'wander',
            description: 'Explore the area, move around randomly',
            parameters: { type: 'object', properties: {}, required: [] }
          }
        },
        {
          type: 'function',
          function: {
            name: 'idle',
            description: 'Do nothing, rest and recover energy',
            parameters: { type: 'object', properties: {}, required: [] }
          }
        },
        {
          type: 'function',
          function: {
            name: 'seek_food',
            description: 'Find and eat food to satisfy hunger',
            parameters: { type: 'object', properties: {}, required: [] }
          }
        },
        {
          type: 'function',
          function: {
            name: 'follow_agent',
            description: 'Follow another agent you see nearby',
            parameters: { type: 'object', properties: {}, required: [] }
          }
        },
        {
          type: 'function',
          function: {
            name: 'talk',
            description: 'Start a conversation with a nearby agent',
            parameters: { type: 'object', properties: {}, required: [] }
          }
        },
        {
          type: 'function',
          function: {
            name: 'gather',
            description: 'Gather resources from the environment (forage, collect items)',
            parameters: { type: 'object', properties: {}, required: [] }
          }
        },
        {
          type: 'function',
          function: {
            name: 'explore',
            description: 'Explore with purpose, looking for something specific',
            parameters: { type: 'object', properties: {}, required: [] }
          }
        },
        {
          type: 'function',
          function: {
            name: 'approach',
            description: 'Move toward a nearby agent or location',
            parameters: { type: 'object', properties: {}, required: [] }
          }
        },
        {
          type: 'function',
          function: {
            name: 'observe',
            description: 'Watch and pay attention to surroundings or someone nearby',
            parameters: { type: 'object', properties: {}, required: [] }
          }
        },
        {
          type: 'function',
          function: {
            name: 'rest',
            description: 'Sit down and rest to recover energy',
            parameters: { type: 'object', properties: {}, required: [] }
          }
        },
        {
          type: 'function',
          function: {
            name: 'work',
            description: 'Do productive work (farm, craft, build)',
            parameters: { type: 'object', properties: {}, required: [] }
          }
        },
        {
          type: 'function',
          function: {
            name: 'help',
            description: 'Help a nearby agent with their task',
            parameters: { type: 'object', properties: {}, required: [] }
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

      // System message to instruct the model on response format
      const systemMessage = {
        role: 'system',
        content: `You are an AI controlling a village character. When responding:

1. THINK first: Briefly reason about what you observe and what you should do (this is your internal thought)
2. SPEAK: Say something out loud that your character would say (a short phrase or sentence)
3. ACT: Call one of the action tools to perform your chosen action

IMPORTANT: Your spoken words should be written directly in the message content - just write what the character says, nothing else. Do NOT prefix with "Content:" or any other labels.

Example response:
- Message content: "Time to gather some wood!" (what you say - just the words, no labels)
- Tool call: gather (your action)

Keep speech brief and natural.`
      };

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.model,
          messages: [
            systemMessage,
            { role: 'user', content: request.prompt }
          ],
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 2000,
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

      // Extract action from tool call
      const action = toolCalls.length > 0 ? toolCalls[0].function.name : '';

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

      // console.log('[OpenAICompatProvider] Response:', {
      //   model: this.model,
      //   action: action || '(no action)',
      //   speaking: speech ? speech.slice(0, 60) + '...' : '(silent)',
      //   thinking: thinking ? thinking.slice(0, 60) + '...' : '(none)',
      //   tokensUsed: data.usage?.total_tokens,
      // });

      // If no action was called, fall back to text parsing
      if (!action) {
        // console.log('[OpenAICompatProvider] No tool call, using text fallback');

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
        model: this.model,
        url: `${this.baseUrl}/chat/completions`,
      });
      throw error;
    }
  }

  /**
   * Fallback generation without tool calling (text-based action extraction)
   */
  private async generateWithoutTools(request: LLMRequest): Promise<LLMResponse> {
    console.log('[OpenAICompatProvider] Using text-based fallback...');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    // System message for text-based responses
    const systemMessage = {
      role: 'system',
      content: `You are an AI controlling a village character. Respond with your thought, what you say, and what action you take.

Format your response like this:
Thought: [your internal reasoning]
Speech: [what you say out loud, or "..." if silent]
Action: [choose ONE: wander, idle, seek_food, follow_agent, talk, gather, explore, approach, observe, rest, work, help, build, deposit_items, seek_warmth, seek_sleep]

Be brief and natural.`
    };

    console.log('[OpenAICompatProvider] Making text-based request...');
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.model,
        messages: [
          systemMessage,
          { role: 'user', content: request.prompt }
        ],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenAICompatProvider] Text-based request failed:', response.status, errorText);
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    console.log('[OpenAICompatProvider] Text-based request succeeded, parsing...');
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    console.log('[OpenAICompatProvider] Raw content:', content);

    // Parse the structured text response
    const thoughtMatch = content.match(/Thought:\s*(.+?)(?=\n|Speech:|Action:|$)/is);
    const speechMatch = content.match(/Speech:\s*(.+?)(?=\n|Action:|$)/is);
    const actionMatch = content.match(/Action:\s*(\w+)/i);

    const thinking = thoughtMatch ? thoughtMatch[1].trim() : '';
    const speech = speechMatch ? speechMatch[1].trim().replace(/^["']|["']$/g, '') : '';
    const action = actionMatch ? actionMatch[1].toLowerCase().trim() : 'idle';

    // Format as JSON for the parser
    const responseText = JSON.stringify({
      thinking: thinking,
      speaking: speech === '...' ? '' : speech,
      action: action
    });

    console.log('[OpenAICompatProvider] Text-based response:', {
      action,
      speech: speech.slice(0, 40),
      thinking: thinking.slice(0, 40)
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
