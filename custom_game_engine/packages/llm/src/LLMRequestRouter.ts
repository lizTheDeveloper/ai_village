/**
 * LLM Request Router
 *
 * Server-side entry point for LLM requests.
 * Handles:
 * - Model → provider mapping
 * - Game session tracking
 * - Cooldown enforcement
 * - Request routing to appropriate provider queue
 * - Response with cooldown information
 *
 * @example
 * const router = new LLMRequestRouter(poolManager, sessionManager, cooldownCalculator);
 * const response = await router.routeRequest({
 *   sessionId: 'session-123',
 *   agentId: 'agent-456',
 *   prompt: 'What should I do?',
 *   model: 'qwen/qwen3-32b'
 * });
 */

import type { ProviderPoolManager } from './ProviderPoolManager.js';
import type { GameSessionManager } from './GameSessionManager.js';
import type { CooldownCalculator } from './CooldownCalculator.js';
import type { LLMRequest, LLMResponse } from './LLMProvider.js';
import type { CustomLLMConfig } from './LLMDecisionQueue.js';

export interface LLMRequestPayload {
  sessionId: string;
  agentId: string;
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  customConfig?: CustomLLMConfig;
}

export interface LLMResponseWithCooldown extends LLMResponse {
  provider: string;
  model: string;
  cooldown: {
    nextAllowedAt: number;
    waitMs: number;
    activeGames: number;
    rateLimit: {
      requestsPerMinute: number;
      effectiveRPM: number;
    };
  };
}

export interface ProviderMapping {
  provider: string;
  queue: string;
  fallbackChain: string[];
}

export class LLMRequestRouter {
  private poolManager: ProviderPoolManager;
  private sessionManager: GameSessionManager;
  private cooldownCalculator: CooldownCalculator;
  private providerMappings: Map<string, ProviderMapping>;
  private defaultModel: string = 'qwen/qwen3-32b';

  constructor(
    poolManager: ProviderPoolManager,
    sessionManager: GameSessionManager,
    cooldownCalculator: CooldownCalculator
  ) {
    this.poolManager = poolManager;
    this.sessionManager = sessionManager;
    this.cooldownCalculator = cooldownCalculator;
    this.providerMappings = new Map();

    this.initializeProviderMappings();
  }

  /**
   * Initialize model → provider mappings
   */
  private initializeProviderMappings(): void {
    // Groq models
    this.providerMappings.set('qwen/qwen3-32b', {
      provider: 'groq',
      queue: 'groq',
      fallbackChain: ['cerebras'],
    });
    this.providerMappings.set('llama-3.3-70b-versatile', {
      provider: 'groq',
      queue: 'groq',
      fallbackChain: ['cerebras'],
    });

    // Cerebras models
    this.providerMappings.set('llama-3.3-70b', {
      provider: 'cerebras',
      queue: 'cerebras',
      fallbackChain: ['groq'],
    });

    // OpenAI models
    this.providerMappings.set('gpt-4-turbo', {
      provider: 'openai',
      queue: 'openai',
      fallbackChain: [],
    });
    this.providerMappings.set('gpt-4o', {
      provider: 'openai',
      queue: 'openai',
      fallbackChain: [],
    });

    // Anthropic models
    this.providerMappings.set('claude-3-5-sonnet-20241022', {
      provider: 'anthropic',
      queue: 'anthropic',
      fallbackChain: [],
    });

    // Ollama (local)
    this.providerMappings.set('qwen3:4b', {
      provider: 'ollama',
      queue: 'ollama',
      fallbackChain: [],
    });
  }

  /**
   * Route LLM request with cooldown enforcement
   *
   * @param payload - Request payload
   * @returns LLM response with cooldown information
   */
  async routeRequest(payload: LLMRequestPayload): Promise<LLMResponseWithCooldown> {
    const { sessionId, agentId, prompt, model, maxTokens, temperature, customConfig } = payload;

    // Register/update session
    if (!this.sessionManager.hasSession(sessionId)) {
      this.sessionManager.registerSession(sessionId);
    }
    this.sessionManager.heartbeat(sessionId);

    // Detect provider and API key
    const { provider, queueName } = this.detectProvider(model, customConfig);
    const apiKeyHash = customConfig?.apiKey ? this.hashApiKey(customConfig.apiKey) : undefined;

    // Check cooldown
    const cooldownStatus = this.cooldownCalculator.getCooldownStatus(
      sessionId,
      provider,
      apiKeyHash
    );

    if (!cooldownStatus.canRequest) {
      // Too soon! Return error with cooldown info
      const error: any = new Error(`Must wait ${cooldownStatus.waitMs}ms before next request`);
      error.code = 'RATE_LIMIT_COOLDOWN';
      error.cooldown = {
        nextAllowedAt: cooldownStatus.nextAllowedAt,
        waitMs: cooldownStatus.waitMs,
        activeGames: this.sessionManager.getActiveSessionCount(),
      };
      throw error;
    }

    // Record request
    this.sessionManager.recordRequest(sessionId);

    // Build LLM request
    const llmRequest: LLMRequest = {
      prompt,
      maxTokens: maxTokens || 4096,
      temperature: temperature ?? 0.7,
    };

    // Execute through provider pool (handles fallback and retry)
    const llmResponse = await this.poolManager.execute(
      queueName,
      llmRequest,
      agentId,
      sessionId
    );

    // Calculate next cooldown
    const activeGames = this.sessionManager.getActiveSessionCount();
    const cooldownMs = this.cooldownCalculator.calculateCooldown(provider, apiKeyHash);
    const nextAllowedAt = Date.now() + cooldownMs;

    // Get rate limit config
    const rateLimit = this.cooldownCalculator.getRateLimit(provider, apiKeyHash);
    const requestsPerMinute = rateLimit?.requestsPerMinute || 30;

    // Return response with cooldown info
    return {
      ...llmResponse,
      provider,
      model: model || this.defaultModel,
      cooldown: {
        nextAllowedAt,
        waitMs: cooldownMs,
        activeGames,
        rateLimit: {
          requestsPerMinute,
          effectiveRPM: activeGames > 0 ? requestsPerMinute / activeGames : requestsPerMinute,
        },
      },
    };
  }

  /**
   * Detect provider from model or custom config
   */
  private detectProvider(
    model?: string,
    customConfig?: CustomLLMConfig
  ): { provider: string; queueName: string } {
    // Custom config with baseUrl
    if (customConfig?.baseUrl) {
      const provider = this.detectProviderFromUrl(customConfig.baseUrl);
      return { provider, queueName: provider };
    }

    // Standard model
    const modelName = model || this.defaultModel;
    const mapping = this.providerMappings.get(modelName);

    if (mapping) {
      return { provider: mapping.provider, queueName: mapping.queue };
    }

    // Infer from model name
    const provider = this.inferProviderFromModel(modelName);
    return { provider, queueName: provider };
  }

  /**
   * Detect provider from baseUrl
   */
  private detectProviderFromUrl(baseUrl: string): string {
    if (baseUrl.includes('api.groq.com')) return 'groq';
    if (baseUrl.includes('cerebras.ai')) return 'cerebras';
    if (baseUrl.includes('api.openai.com')) return 'openai';
    if (baseUrl.includes('api.anthropic.com')) return 'anthropic';
    if (baseUrl.includes('localhost:11434')) return 'ollama';

    // Unknown provider: use URL hash as queue name
    return `custom_${this.hashUrl(baseUrl)}`;
  }

  /**
   * Infer provider from model name
   */
  private inferProviderFromModel(model: string): string {
    if (model.includes('/')) {
      const parts = model.split('/');
      return parts[0] || 'unknown';
    }
    if (model.startsWith('gpt-')) return 'openai';
    if (model.startsWith('claude-')) return 'anthropic';
    if (model.includes('llama')) return 'groq';
    return 'unknown';
  }

  /**
   * Hash API key for tracking (non-cryptographic)
   */
  private hashApiKey(apiKey: string): string {
    let hash = 0;
    for (let i = 0; i < apiKey.length; i++) {
      hash = ((hash << 5) - hash) + apiKey.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Hash URL for queue naming
   */
  private hashUrl(url: string): string {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      hash = ((hash << 5) - hash) + url.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return this.poolManager.getQueueStats();
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    return this.sessionManager.getStats();
  }

  /**
   * Set default model
   */
  setDefaultModel(model: string): void {
    this.defaultModel = model;
  }
}
