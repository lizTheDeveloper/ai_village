import type { LLMProvider, LLMRequest } from './LLMProvider.js';
import { OpenAICompatProvider } from './OpenAICompatProvider.js';
import { promptLogger } from './PromptLogger.js';

/**
 * Custom LLM configuration for per-agent overrides.
 * Matches CustomLLMConfig from @ai-village/core (structural typing ensures compatibility).
 */
export interface CustomLLMConfig {
  baseUrl?: string;
  model?: string;
  apiKey?: string;
  customHeaders?: Record<string, string>;
  tier?: string;  // Intelligence tier: 'simple', 'default', 'high', 'agi'
  chatOnly?: boolean;  // Skip tool-calling and JSON format — plain chat completion
}

interface DecisionRequest {
  agentId: string;
  /**
   * Either a pre-built prompt string OR a builder function for lazy evaluation.
   * If promptBuilder is provided, prompt is ignored and builder is called at send-time.
   * This allows prompts to reflect agent state when request reaches front of queue,
   * not when it was originally queued.
   */
  prompt: string;
  promptBuilder?: () => string;
  resolve: (response: string) => void;
  reject: (error: Error) => void;
  startTime: number;
  queuedAt: number; // When request was added to queue (for staleness metrics)
  customConfig?: CustomLLMConfig; // Per-agent custom LLM configuration
}

/**
 * Manages async LLM decision requests with rate limiting.
 * Returns raw LLM responses for parsing by AISystem.
 */
export class LLMDecisionQueue {
  private provider: LLMProvider;
  private tierProviders: Map<string, LLMProvider> = new Map();
  private queue: DecisionRequest[] = [];
  private processing = false;
  private maxConcurrent: number;
  private activeRequests = 0;
  private decisions: Map<string, string> = new Map();
  private configuredMaxTokens: number = 4096; // Reasonable default for agent decisions
  private lastErrorLogTime: number = 0;
  private errorCount: number = 0;

  constructor(provider: LLMProvider, maxConcurrent: number = 2) {
    this.provider = provider;
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Register a provider for a specific intelligence tier.
   * When a request specifies this tier, it will use this provider instead of the default.
   */
  setTierProvider(tier: string, provider: LLMProvider): void {
    this.tierProviders.set(tier, provider);
  }

  /**
   * Set the maximum tokens for LLM responses.
   * The actual max tokens used will be at least 3x the prompt size.
   */
  setMaxTokens(maxTokens: number): void {
    this.configuredMaxTokens = maxTokens;
  }

  /**
   * Get the current configured max tokens.
   */
  getMaxTokens(): number {
    return this.configuredMaxTokens;
  }

  /**
   * Request a decision for an agent (non-blocking).
   * Returns raw LLM response text for parsing by AISystem.
   *
   * @param agentId - Unique identifier for the agent
   * @param promptOrBuilder - Either a prompt string OR a builder function for lazy evaluation.
   *                          Using a builder function is preferred as it builds the prompt
   *                          at send-time (when request reaches front of queue), ensuring
   *                          the prompt reflects current agent state, not stale queue-time state.
   * @param customConfig - Optional per-agent custom LLM configuration
   */
  requestDecision(
    agentId: string,
    promptOrBuilder: string | (() => string),
    customConfig?: CustomLLMConfig
  ): Promise<string> {
    const now = Date.now();
    return new Promise((resolve, reject) => {
      if (typeof promptOrBuilder === 'function') {
        // Lazy mode: store builder, build prompt at send-time
        this.queue.push({
          agentId,
          prompt: '', // Placeholder, will be built by promptBuilder
          promptBuilder: promptOrBuilder,
          resolve,
          reject,
          startTime: now,
          queuedAt: now,
          customConfig,
        });
      } else {
        // Eager mode (backwards compat): prompt already built
        this.queue.push({
          agentId,
          prompt: promptOrBuilder,
          resolve,
          reject,
          startTime: now,
          queuedAt: now,
          customConfig,
        });
      }
      this.processQueue();
    });
  }

  /**
   * Get a decision if ready (synchronous check).
   * Returns raw LLM response text.
   */
  getDecision(agentId: string): string | null {
    const decision = this.decisions.get(agentId);
    if (decision) {
      this.decisions.delete(agentId);
      return decision;
    }
    return null;
  }

  /**
   * Process queued requests.
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const request = this.queue.shift();
      if (!request) break;

      this.activeRequests++;
      this.processRequest(request).finally(() => {
        this.activeRequests--;
        this.processQueue(); // Continue processing
      });
    }

    this.processing = false;
  }

  /**
   * Process a single request.
   */
  private async processRequest(request: DecisionRequest): Promise<void> {
    try {
      // LAZY PROMPT BUILDING: If a promptBuilder was provided, build the prompt NOW
      // at send-time, not at queue-time. This ensures the prompt reflects current
      // agent state after waiting in queue.
      let prompt: string;
      if (request.promptBuilder) {
        const buildStart = Date.now();
        prompt = request.promptBuilder();
        const buildTime = Date.now() - buildStart;
        const queueWaitTime = Date.now() - request.queuedAt;

        // Log if prompt building took significant time or queue wait was long
        if (buildTime > 50 || queueWaitTime > 5000) {
          // Debug: prompt built after waiting in queue
          // buildTime: how long prompt construction took
          // queueWaitTime: how long request waited before reaching front of queue
        }
      } else {
        prompt = request.prompt;
      }

      // Calculate max tokens: at least 3x estimated prompt tokens, but respect configured max
      // Cap at 8192 to stay within model limits (Groq limits to 32768, but we don't need that much)
      const estimatedPromptTokens = Math.ceil(prompt.length / 4);
      const minTokens = estimatedPromptTokens * 3;
      const maxTokens = Math.min(8192, Math.max(minTokens, this.configuredMaxTokens));

      const llmRequest: LLMRequest & { tier?: string; agentId?: string } = {
        prompt, // Use lazily-built prompt (or pre-built if no builder)
        temperature: 0.7,
        maxTokens, // Thinking models need room for reasoning + tool call
        chatOnly: request.customConfig?.chatOnly,  // Skip tool-calling and JSON format for freeform chat
        // Let OllamaProvider handle stop sequences
      };

      // Pass tier through for ProxyLLMProvider routing
      if (request.customConfig?.tier) {
        llmRequest.tier = request.customConfig.tier;
      }
      llmRequest.agentId = request.agentId;

      // Select provider: custom baseUrl > tier-specific > default
      let provider = this.provider;
      if (request.customConfig?.baseUrl) {
        const config = request.customConfig;
        // Create custom provider on-the-fly
        provider = new OpenAICompatProvider(
          config.model || 'default-model',
          config.baseUrl,
          config.apiKey || ''
        );

        // Apply custom headers if provided
        if (config.customHeaders) {
          (provider as OpenAICompatProvider).customHeaders = config.customHeaders;
        }
      } else if (request.customConfig?.tier && this.tierProviders.has(request.customConfig.tier)) {
        // Use tier-specific provider for model routing
        provider = this.tierProviders.get(request.customConfig.tier)!;
      }

      // Log model routing for tier requests (debug only)
      if (request.customConfig?.tier) {
        // Tier routing: agent → provider selection is handled silently
      }

      const response = await provider.generate(llmRequest);
      const durationMs = Date.now() - request.startTime;

      // Log the prompt/response pair for analysis
      let parsedAction: unknown = undefined;
      let thinking: string | undefined;
      let speaking: string | undefined;

      try {
        const parsed = JSON.parse(response.text);
        parsedAction = parsed.action;
        thinking = parsed.thinking;
        speaking = parsed.speaking;
      } catch {
        // Not JSON, that's fine
      }

      // Extract agent name from prompt if available
      const nameMatch = prompt.match(/You are (\w+),/);
      const agentName = nameMatch ? nameMatch[1] : undefined;

      promptLogger.log({
        agentId: request.agentId,
        agentName,
        prompt, // Use lazily-built prompt
        response: response.text,
        parsedAction,
        thinking,
        speaking,
        durationMs,
      });

      // Store raw response for synchronous retrieval
      this.decisions.set(request.agentId, response.text);
      request.resolve(response.text);
    } catch (error) {
      this.errorCount++;
      const now = Date.now();
      // Rate-limit error logging to once per 30 seconds
      if (now - this.lastErrorLogTime > 30000) {
        const countMsg = this.errorCount > 1 ? ` (${this.errorCount} errors since last log)` : '';
        console.warn(`[LLMDecisionQueue] Decision error for agent ${request.agentId}${countMsg}:`, (error as Error).message || error);
        this.lastErrorLogTime = now;
        this.errorCount = 0;
      }
      request.reject(error as Error);
    }
  }

  /**
   * Get queue size.
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get active request count.
   */
  getActiveCount(): number {
    return this.activeRequests;
  }
}
