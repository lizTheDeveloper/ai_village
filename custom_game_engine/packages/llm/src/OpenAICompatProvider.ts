import type { LLMProvider, LLMRequest, LLMResponse, ProviderPricing } from './LLMProvider.js';
import { LLMRequestFileLogger } from './LLMRequestFileLogger.js';
import { modelProfileRegistry, ModelProfile } from './ModelProfileRegistry.js';
import { modelCapabilityDiscovery, DiscoveredCapabilities } from './ModelCapabilityDiscovery.js';

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

  // Model profile and capability discovery
  private profile: ModelProfile | null = null;
  private discoveredCapabilities: DiscoveredCapabilities | null = null;
  private needsDiscovery: boolean = false;

  // Shared file logger instance for all providers
  private static fileLogger: LLMRequestFileLogger = new LLMRequestFileLogger();

  constructor(
    model: string = 'qwen/qwen3-32b',
    baseUrl: string = 'https://api.groq.com/openai/v1',
    apiKey: string = ''
  ) {
    this.model = model;
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;

    // Load model profile
    this.initializeProfile();
  }

  /**
   * Initialize model profile from registry
   */
  private initializeProfile(): void {
    // Get profile for this model
    this.profile = modelProfileRegistry.getProfile(this.model);

    // Check if this is an unknown model (will need capability discovery)
    if (this.profile.name === 'Unknown Model') {
      this.needsDiscovery = true;
    }
  }

  /**
   * Update the provider configuration dynamically
   */
  configure(config: { model?: string; baseUrl?: string; apiKey?: string }): void {
    const modelChanged = config.model && config.model !== this.model;

    if (config.model) this.model = config.model;
    if (config.baseUrl) this.baseUrl = config.baseUrl.replace(/\/$/, '');
    if (config.apiKey !== undefined) this.apiKey = config.apiKey;

    // Reload profile if model changed
    if (modelChanged) {
      this.initializeProfile();
      this.discoveredCapabilities = null; // Clear cached capabilities
    }

    // console.log('[OpenAICompatProvider] Configured:', {
    //   model: this.model,
    //   baseUrl: this.baseUrl,
    //   hasApiKey: !!this.apiKey
    // });
  }

  /**
   * Fetch with timeout and retry logic for transient failures
   * Uses Promise.race for timeout to avoid AbortSignal compatibility issues in test environments
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = this.maxRetries
  ): Promise<Response> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Use Promise.race for timeout (more compatible than AbortSignal in test environments)
        const fetchPromise = fetch(url, options);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), this.timeout);
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if it's a retryable error (network issues, timeout)
        const isRetryable =
          lastError.name === 'AbortError' ||
          lastError.message.includes('timeout') ||
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

  /**
   * Ensure capabilities are known (run discovery if needed)
   */
  private async ensureCapabilitiesKnown(): Promise<void> {
    if (this.needsDiscovery && !this.discoveredCapabilities) {
      console.log(`[OpenAICompatProvider] Unknown model "${this.model}", running capability discovery...`);
      this.discoveredCapabilities = await modelCapabilityDiscovery.getOrDiscoverCapabilities(
        this,
        this.model
      );
      console.log(`[OpenAICompatProvider] Discovered capabilities:`, this.discoveredCapabilities);
    }
  }

  /**
   * Get model capabilities (from profile or discovery)
   */
  private getCapabilities(): {
    supportsToolCalling: boolean;
    supportsThinkTags: boolean;
    thinkTagName: string;
  } {
    if (this.profile && this.profile.name !== 'Unknown Model') {
      // Known model - use profile
      return {
        supportsToolCalling: this.profile.supportsToolCalling,
        supportsThinkTags: this.profile.supportsThinkTags,
        thinkTagName: this.profile.thinkTagName || 'think',
      };
    } else if (this.discoveredCapabilities) {
      // Unknown model with discovered capabilities
      return {
        supportsToolCalling: this.discoveredCapabilities.supportsToolCalling,
        supportsThinkTags: this.discoveredCapabilities.thinkingFormat === 'think_tags',
        thinkTagName: this.discoveredCapabilities.thinkingTagName || 'think',
      };
    } else {
      // Fallback defaults (conservative - assume standard behavior)
      return {
        supportsToolCalling: true,  // Most models support this
        supportsThinkTags: false,   // Don't assume
        thinkTagName: 'think',
      };
    }
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
      // Ensure capabilities are known (runs discovery on first call for unknown models)
      await this.ensureCapabilitiesKnown();

      // NOTE: We always use tool calling now. The prompts should NOT include
      // "RESPOND IN JSON" instructions - tool calling is the standard.
      // If you see JSON format issues, fix the prompt builders, not here.

      // Define action tools - matches ActionDefinitions.ts
      // NOTE: Autonomic behaviors (wander, rest, idle) are NOT included
      // NOTE: 'talk' is NOT a tool - speaking happens via the "speaking" field in responses
      const tools = [
        // === GATHERING ===
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

        // === BUILDING ===
        {
          type: 'function',
          function: {
            name: 'build',
            description: 'Construct a building (requires building skill level 1 and materials in inventory)',
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

        // === FARMING ===
        {
          type: 'function',
          function: {
            name: 'till',
            description: 'Prepare soil for planting (requires farming skill level 1)',
            parameters: { type: 'object', properties: {}, required: [] }
          }
        },
        {
          type: 'function',
          function: {
            name: 'farm',
            description: 'Work on farming tasks (requires farming skill level 1)',
            parameters: { type: 'object', properties: {}, required: [] }
          }
        },
        {
          type: 'function',
          function: {
            name: 'plant',
            description: 'Plant seeds in tilled soil (requires farming skill level 1)',
            parameters: {
              type: 'object',
              properties: {
                seed: { type: 'string', description: 'Seed type to plant: wheat, carrot, etc.' }
              },
              required: ['seed']
            }
          }
        },

        // === EXPLORATION ===
        {
          type: 'function',
          function: {
            name: 'explore',
            description: 'Systematically explore unknown areas to find new resources',
            parameters: { type: 'object', properties: {}, required: [] }
          }
        },

        // === RESEARCH ===
        {
          type: 'function',
          function: {
            name: 'research',
            description: 'Conduct research at a research building to unlock new technologies (requires research skill level 1)',
            parameters: {
              type: 'object',
              properties: {
                topic: { type: 'string', description: 'Research topic or technology to investigate' }
              },
              required: []
            }
          }
        },

        // === ANIMAL HANDLING ===
        {
          type: 'function',
          function: {
            name: 'tame_animal',
            description: 'Approach and tame a wild animal (requires animal handling skill level 2)',
            parameters: {
              type: 'object',
              properties: {
                target: { type: 'string', description: 'Type of animal to tame: chicken, cow, sheep, etc.' }
              },
              required: []
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'house_animal',
            description: 'Lead a tamed animal to its housing (requires animal handling skill level 2)',
            parameters: {
              type: 'object',
              properties: {
                target: { type: 'string', description: 'Animal to house' }
              },
              required: []
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'hunt',
            description: 'Hunt a wild animal for meat and resources (requires combat skill level 1)',
            parameters: {
              type: 'object',
              properties: {
                target: { type: 'string', description: 'Animal to hunt: deer, boar, rabbit, etc.' }
              },
              required: []
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'butcher',
            description: 'Butcher a tame animal at butchering table (requires cooking skill level 1)',
            parameters: {
              type: 'object',
              properties: {
                target: { type: 'string', description: 'Animal to butcher' }
              },
              required: []
            }
          }
        },

        // === COMBAT ===
        {
          type: 'function',
          function: {
            name: 'initiate_combat',
            description: 'Challenge another agent to combat - lethal or non-lethal (requires combat skill level 1)',
            parameters: {
              type: 'object',
              properties: {
                target: { type: 'string', description: 'Name of agent to fight' },
                lethal: { type: 'boolean', description: 'Whether combat is lethal (default: false)' }
              },
              required: ['target']
            }
          }
        },

        // === MAGIC ===
        {
          type: 'function',
          function: {
            name: 'cast_spell',
            description: 'Cast a known spell on self, ally, or enemy (requires magic skill level 1)',
            parameters: {
              type: 'object',
              properties: {
                spell: { type: 'string', description: 'Name of the spell to cast' },
                target: { type: 'string', description: 'Target of the spell (self, agent name, or enemy)' }
              },
              required: ['spell']
            }
          }
        },

        // === SOCIAL ===
        {
          type: 'function',
          function: {
            name: 'follow_agent',
            description: 'Follow someone',
            parameters: {
              type: 'object',
              properties: {
                target: { type: 'string', description: 'Name of agent to follow' }
              },
              required: ['target']
            }
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
              required: ['topic']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'attend_meeting',
            description: 'Attend an ongoing meeting',
            parameters: { type: 'object', properties: {}, required: [] }
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
              },
              required: ['target']
            }
          }
        },

        // === PRIORITY MANAGEMENT ===
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
        },

        // === GOAL SETTING (Talker layer) ===
        {
          type: 'function',
          function: {
            name: 'set_personal_goal',
            description: 'Set a new personal goal',
            parameters: {
              type: 'object',
              properties: {
                goal: { type: 'string', description: 'The goal to set' }
              },
              required: ['goal']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'set_medium_term_goal',
            description: 'Set a goal for the next few days',
            parameters: {
              type: 'object',
              properties: {
                goal: { type: 'string', description: 'The medium-term goal to set' }
              },
              required: ['goal']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'set_group_goal',
            description: 'Propose a goal for the village',
            parameters: {
              type: 'object',
              properties: {
                goal: { type: 'string', description: 'The group goal to propose' }
              },
              required: ['goal']
            }
          }
        },

        // === META ===
        {
          type: 'function',
          function: {
            name: 'sleep_until_queue_complete',
            description: 'Pause executor until all queued tasks complete',
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

      // Add custom headers if provided
      if (this.customHeaders) {
        Object.assign(headers, this.customHeaders);
      }

      // System message to instruct the model on response format
      // Use profile-based capabilities instead of hardcoded model checks
      const caps = this.getCapabilities();

      let thinkingInstructions: string;
      if (caps.supportsThinkTags) {
        const tagName = caps.thinkTagName;
        thinkingInstructions = `First, reason about what to do inside <${tagName}>...</${tagName}> tags. This is your internal thought process - take your time to consider the situation.`;
      } else {
        // Models without think tags - just ask for brief reasoning
        thinkingInstructions = `Think briefly about what action makes sense given the situation.`;
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
          max_tokens: request.maxTokens ?? 32768,
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
            const parsed = JSON.parse(toolCall.function.arguments);
            // Ensure we always have an object, not null or a primitive
            if (parsed && typeof parsed === 'object') {
              actionArgs = parsed;
            }
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

      // Extract thinking and speech from response
      // Format: <think>internal thoughts</think> spoken words out loud
      // OR: Qwen/Groq returns thinking in message.reasoning field
      let thinking = '';
      let speech = content;

      // Check for Qwen-style reasoning field first (Groq API returns this)
      if (message.reasoning) {
        thinking = message.reasoning.trim();
      }

      // Check for thinking tags in content (use detected tag name)
      const tagName = caps.thinkTagName;
      const thinkRegex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'i');
      const thinkMatch = content.match(thinkRegex);
      if (thinkMatch) {
        thinking = thinkMatch[1].trim();
        // Speech is everything after the think tag
        speech = content.replace(thinkRegex, '').trim();
      }

      // Clean up speech - just the words they say out loud
      // Remove any model artifacts or labels that shouldn't be spoken
      speech = speech
        .replace(/^Content:\s*/i, '')           // Remove "Content: " prefix
        .replace(/^Speaking:\s*/i, '')          // Remove "Speaking: " prefix
        .replace(/^Speech:\s*/i, '')            // Remove "Speech: " prefix
        .replace(/^Message:\s*/i, '')           // Remove "Message: " prefix
        .replace(/^Tool call:.*$/gim, '')       // Remove any "Tool call: ..." lines
        .replace(/^Action:.*$/gim, '')          // Remove any "Action: ..." lines
        .trim()
        .replace(/^["']|["']$/g, '');           // Remove surrounding quotes from speech

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

        const inputTokens = data.usage?.prompt_tokens || 0;
        const outputTokens = data.usage?.completion_tokens || 0;
        const cost = this.calculateCost(inputTokens, outputTokens);

        // Log request/response to file for evaluation
        OpenAICompatProvider.fileLogger.log({
          timestamp: Date.now(),
          requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          sessionId: 'unknown',
          agentId: 'unknown',
          provider: this.getProviderId(),
          model: this.model,
          prompt: request.prompt,
          maxTokens: request.maxTokens,
          temperature: request.temperature,
          responseText: content,
          thinking: thinking || '',
          speaking: speech || content,
          inputTokens,
          outputTokens,
          costUSD: cost,
          durationMs: 0,
          success: true,
        });

        return {
          text: content,
          stopReason: choice?.finish_reason,
          tokensUsed: data.usage?.total_tokens,
          inputTokens,
          outputTokens,
          costUSD: cost
        };
      }

      // Return structured response
      const inputTokens = data.usage?.prompt_tokens || 0;
      const outputTokens = data.usage?.completion_tokens || 0;
      const cost = this.calculateCost(inputTokens, outputTokens);

      // Log request/response to file for evaluation
      OpenAICompatProvider.fileLogger.log({
        timestamp: Date.now(),
        requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        sessionId: 'unknown', // Will be set by router if available
        agentId: 'unknown',   // Will be set by router if available
        provider: this.getProviderId(),
        model: this.model,
        prompt: request.prompt,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
        responseText,
        thinking,
        speaking: speech,
        inputTokens,
        outputTokens,
        costUSD: cost,
        durationMs: 0, // Will be calculated by router if needed
        success: true,
      });

      return {
        text: responseText,
        stopReason: choice?.finish_reason,
        tokensUsed: data.usage?.total_tokens,
        inputTokens,
        outputTokens,
        costUSD: cost
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

    // Check if prompt already contains JSON format instructions
    const promptExpectsJson = request.prompt.includes('RESPOND IN JSON') ||
                              request.prompt.includes('respond in JSON');

    let messages: Array<{ role: string; content: string }>;

    if (promptExpectsJson) {
      // Prompt already has its own instructions - just pass it through as user message
      // The LLM will follow the embedded JSON format instructions
      messages = [
        { role: 'user', content: request.prompt }
      ];
    } else {
      // No JSON instructions in prompt - add our own system message
      const caps = this.getCapabilities();

      let thoughtFormat: string;
      if (caps.supportsThinkTags) {
        const tagName = caps.thinkTagName;
        thoughtFormat = `<${tagName}>[your reasoning]</${tagName}>`;
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
      messages = [systemMessage, { role: 'user', content: request.prompt }];
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 32768,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenAICompatProvider] Text-based request failed:', response.status, errorText);
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // If prompt expected JSON, try to parse it directly
    if (promptExpectsJson) {
      // The LLM should have returned JSON. Try to extract it.
      // Look for JSON object in the response (may have extra text around it)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          // Normalize to expected format: {thinking, speaking, action}
          const responseText = JSON.stringify({
            thinking: '', // StructuredPromptBuilder doesn't ask for thinking
            speaking: parsed.speaking || '',
            action: parsed.action || 'wander'
          });
          const inputTokens = data.usage?.prompt_tokens || 0;
          const outputTokens = data.usage?.completion_tokens || 0;
          const cost = this.calculateCost(inputTokens, outputTokens);

          // Log request/response to file for evaluation
          OpenAICompatProvider.fileLogger.log({
            timestamp: Date.now(),
            requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            sessionId: 'unknown',
            agentId: 'unknown',
            provider: this.getProviderId(),
            model: this.model,
            prompt: request.prompt,
            maxTokens: request.maxTokens,
            temperature: request.temperature,
            responseText,
            thinking: '',
            speaking: parsed.speaking || '',
            inputTokens,
            outputTokens,
            costUSD: cost,
            durationMs: 0,
            success: true,
          });

          return {
            text: responseText,
            stopReason: data.choices?.[0]?.finish_reason,
            tokensUsed: data.usage?.total_tokens,
            inputTokens,
            outputTokens,
            costUSD: cost
          };
        } catch {
          // JSON parse failed, fall through to text parsing
        }
      }
    }

    // Parse the structured text response
    // Support both thinking tags (using detected tag name) and "Thought:" prefix
    const caps = this.getCapabilities();
    let thinking = '';
    let contentAfterThink = content;

    if (caps.supportsThinkTags) {
      const tagName = caps.thinkTagName;
      const thinkRegex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'i');
      const thinkTagMatch = content.match(thinkRegex);
      if (thinkTagMatch) {
        thinking = thinkTagMatch[1].trim();
        contentAfterThink = content.replace(thinkRegex, '').trim();
      }
    }

    // Fallback to "Thought:" prefix if no tags found
    if (!thinking) {
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

    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;
    const cost = this.calculateCost(inputTokens, outputTokens);

    // Log request/response to file for evaluation
    OpenAICompatProvider.fileLogger.log({
      timestamp: Date.now(),
      requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      sessionId: 'unknown',
      agentId: 'unknown',
      provider: this.getProviderId(),
      model: this.model,
      prompt: request.prompt,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
      responseText,
      thinking,
      speaking: speech === '...' ? '' : speech,
      inputTokens,
      outputTokens,
      costUSD: cost,
      durationMs: 0,
      success: true,
    });

    return {
      text: responseText,
      stopReason: data.choices?.[0]?.finish_reason,
      tokensUsed: data.usage?.total_tokens,
      inputTokens,
      outputTokens,
      costUSD: cost
    };
  }

  getModelName(): string {
    return this.model;
  }

  async isAvailable(): Promise<boolean> {
    try {
      // In browser environment, route through Vite proxy to avoid CORS
      const isBrowser = typeof window !== 'undefined';
      const checkUrl = isBrowser
        ? `/api/llm/check-availability?baseUrl=${encodeURIComponent(this.baseUrl)}`
        : `${this.baseUrl}/models`;

      const headers: Record<string, string> = {};
      if (!isBrowser && this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(checkUrl, {
        method: 'GET',
        headers,
      });

      if (isBrowser) {
        // Proxy returns JSON with available: boolean
        const data = await response.json();
        return data.available === true;
      }

      return response.ok;
    } catch {
      return false;
    }
  }

  getPricing(): ProviderPricing {
    const providerId = this.getProviderId();

    // Pricing as of 2026-01-03
    switch (providerId) {
      case 'groq':
        return {
          providerId: 'groq',
          providerName: 'Groq',
          inputCostPer1M: 0.05,
          outputCostPer1M: 0.10
        };

      case 'cerebras':
        // Cerebras has generous free tier, pricing for paid is competitive
        return {
          providerId: 'cerebras',
          providerName: 'Cerebras',
          inputCostPer1M: 0.10,
          outputCostPer1M: 0.10
        };

      case 'openai':
        return {
          providerId: 'openai',
          providerName: 'OpenAI',
          inputCostPer1M: 3.00,
          outputCostPer1M: 15.00
        };

      case 'anthropic':
        return {
          providerId: 'anthropic',
          providerName: 'Anthropic',
          inputCostPer1M: 3.00,
          outputCostPer1M: 15.00
        };

      case 'mlx':
        return {
          providerId: 'mlx',
          providerName: 'MLX (Local)',
          inputCostPer1M: 0,
          outputCostPer1M: 0
        };

      default:
        // Unknown provider - assume free for safety
        return {
          providerId,
          providerName: 'Unknown Provider',
          inputCostPer1M: 0,
          outputCostPer1M: 0
        };
    }
  }

  getProviderId(): string {
    // Detect provider from baseUrl
    const url = this.baseUrl.toLowerCase();

    if (url.includes('groq.com')) return 'groq';
    if (url.includes('cerebras.ai')) return 'cerebras';
    if (url.includes('api.openai.com')) return 'openai';
    if (url.includes('api.anthropic.com')) return 'anthropic';
    if (url.includes('localhost:8080') || url.includes('127.0.0.1:8080')) return 'mlx';

    // Default to generic openai-compat
    return 'openai-compat';
  }

  /**
   * Calculate cost for a response.
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    const pricing = this.getPricing();
    const inputCost = (inputTokens / 1_000_000) * pricing.inputCostPer1M;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputCostPer1M;
    return inputCost + outputCost;
  }
}
