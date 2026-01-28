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
import { CostTracker } from './CostTracker.js';
import { QueueMetricsCollector } from './QueueMetricsCollector.js';
import {
  MODEL_CONFIGS,
  getModelsForTier,
  inferTierFromModel,
  type IntelligenceTier,
} from './ModelTiers.js';

export interface LLMRequestPayload {
  sessionId: string;
  agentId: string;
  prompt: string;
  model?: string;
  tier?: IntelligenceTier;  // Request by tier: 'simple', 'default', 'high'
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
  private defaultModel: string = 'qwen-3-32b';

  // Load balancing: round-robin counter for distributing across available models in a tier
  private requestCounter: number = 0;

  // Cost and metrics tracking
  public costTracker: CostTracker;
  public metricsCollector: QueueMetricsCollector;

  constructor(
    poolManager: ProviderPoolManager,
    sessionManager: GameSessionManager,
    cooldownCalculator: CooldownCalculator
  ) {
    this.poolManager = poolManager;
    this.sessionManager = sessionManager;
    this.cooldownCalculator = cooldownCalculator;
    this.providerMappings = new Map();
    this.costTracker = new CostTracker();
    this.metricsCollector = new QueueMetricsCollector();

    this.initializeProviderMappings();

    // Start automatic queue metrics collection
    this.metricsCollector.startAutoSnapshot(() => this.poolManager.getQueueStats());
  }

  /**
   * Initialize model → provider mappings
   *
   * NOTE: Queue names must match the naming convention used by the server:
   * modelId.replace(/\//g, '_') - slashes replaced with underscores
   */
  private initializeProviderMappings(): void {
    // Build mappings from MODEL_CONFIGS for consistency
    for (const modelConfig of MODEL_CONFIGS) {
      const queueName = modelConfig.id.replace(/\//g, '_');

      // Build fallback chain: same tier models on other providers
      const fallbackChain = MODEL_CONFIGS
        .filter(m =>
          m.tier === modelConfig.tier &&
          m.id !== modelConfig.id &&
          m.provider !== 'ollama'
        )
        .map(m => m.id.replace(/\//g, '_'));

      this.providerMappings.set(modelConfig.id, {
        provider: modelConfig.provider,
        queue: queueName,
        fallbackChain,
      });
    }

    // Legacy model aliases for backwards compatibility
    // These map old model names to current model queues
    this.providerMappings.set('llama-3.3-70b-versatile', {
      provider: 'groq',
      queue: 'qwen_qwen3-32b', // Map to available Groq model
      fallbackChain: ['qwen-3-32b'], // Cerebras fallback
    });
    this.providerMappings.set('llama-3.3-70b', {
      provider: 'cerebras',
      queue: 'qwen-3-32b', // Map to available Cerebras model
      fallbackChain: ['qwen_qwen3-32b'], // Groq fallback
    });
  }

  /**
   * Route LLM request with cooldown enforcement
   *
   * @param payload - Request payload
   * @returns LLM response with cooldown information
   */
  async routeRequest(payload: LLMRequestPayload): Promise<LLMResponseWithCooldown> {
    const { sessionId, agentId, prompt, model, tier, maxTokens, temperature, customConfig } = payload;
    const requestStartTime = Date.now();

    // Register/update session
    if (!this.sessionManager.hasSession(sessionId)) {
      this.sessionManager.registerSession(sessionId);
    }
    this.sessionManager.heartbeat(sessionId);

    // Detect provider and API key - supports tier-based routing
    const { provider, queueName, selectedModel } = this.detectProvider(model, tier, customConfig);
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

    // Track wait time (time in queue)
    const queueStartTime = Date.now();
    let llmResponse: LLMResponse | undefined;
    let success = false;
    let errorMessage: string | undefined;

    try {
      // Execute through provider pool (handles fallback and retry)
      llmResponse = await this.poolManager.execute(
        queueName,
        llmRequest,
        agentId,
        sessionId
      );
      success = true;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      const executionTime = Date.now() - queueStartTime;
      const waitTime = queueStartTime - requestStartTime;

      // Record metrics
      this.metricsCollector.recordRequest({
        timestamp: Date.now(),
        provider,
        sessionId,
        agentId,
        success,
        waitMs: waitTime,
        executionMs: executionTime,
        error: errorMessage,
      });

      // Record cost (only on success)
      if (success && llmResponse) {
        this.costTracker.recordCost({
          timestamp: Date.now(),
          sessionId,
          agentId,
          provider,
          model: selectedModel,
          inputTokens: llmResponse.inputTokens || 0,
          outputTokens: llmResponse.outputTokens || 0,
          costUSD: llmResponse.costUSD || 0,
          apiKeyHash,
        });
      }
    }

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
      model: selectedModel,
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
   * Detect provider from model, tier, or custom config
   * Supports tier-based routing for intelligent model selection
   *
   * Priority:
   * 1. Custom config with baseUrl
   * 2. Explicit model requested
   * 3. Tier-based selection (round-robin across models in tier)
   * 4. Default to 'default' tier
   */
  private detectProvider(
    model?: string,
    tier?: IntelligenceTier,
    customConfig?: CustomLLMConfig
  ): { provider: string; queueName: string; selectedModel: string } {
    // Custom config with baseUrl
    if (customConfig?.baseUrl) {
      const provider = this.detectProviderFromUrl(customConfig.baseUrl);
      return { provider, queueName: provider, selectedModel: model || this.defaultModel };
    }

    // If explicit model requested, use it directly
    if (model) {
      const queueName = model.replace(/\//g, '_');
      const modelConfig = MODEL_CONFIGS.find(m => m.id === model);

      if (modelConfig && this.poolManager.hasProvider(queueName)) {
        return {
          provider: modelConfig.provider,
          queueName,
          selectedModel: model,
        };
      }

      // Fallback to provider-based routing for unknown models
      const mapping = this.providerMappings.get(model);
      if (mapping) {
        return { provider: mapping.provider, queueName: mapping.queue, selectedModel: model };
      }

      const provider = this.inferProviderFromModel(model);
      return { provider, queueName: provider, selectedModel: model };
    }

    // Tier-based routing: select best available model for requested tier
    const requestedTier = tier || 'default';
    const tierModels = getModelsForTier(requestedTier)
      .filter(m => m.provider !== 'ollama') // Skip local models in server
      .sort((a, b) => b.rpm - a.rpm); // Prefer higher RPM models

    // Find available models for this tier
    const availableModels = tierModels.filter(m => {
      const queueName = m.id.replace(/\//g, '_');
      return this.poolManager.hasProvider(queueName);
    });

    if (availableModels.length > 0) {
      // Round-robin across available models in tier
      const selectedModel = availableModels[this.requestCounter % availableModels.length]!;
      this.requestCounter++;

      const queueName = selectedModel.id.replace(/\//g, '_');
      return {
        provider: selectedModel.provider,
        queueName,
        selectedModel: selectedModel.id,
      };
    }

    // No models available for tier, fall back to any available model
    const anyModel = MODEL_CONFIGS
      .filter(m => m.provider !== 'ollama')
      .find(m => this.poolManager.hasProvider(m.id.replace(/\//g, '_')));

    if (anyModel) {
      const queueName = anyModel.id.replace(/\//g, '_');
      return {
        provider: anyModel.provider,
        queueName,
        selectedModel: anyModel.id,
      };
    }

    // Ultimate fallback: try any available queue
    // First, try to find any queue that exists in the pool
    for (const modelConfig of MODEL_CONFIGS) {
      if (modelConfig.provider === 'ollama') continue;
      const queueName = modelConfig.id.replace(/\//g, '_');
      if (this.poolManager.hasProvider(queueName)) {
        return {
          provider: modelConfig.provider,
          queueName,
          selectedModel: modelConfig.id,
        };
      }
    }

    // Final fallback with error-friendly message
    // This will fail but with a clear message about what's wrong
    const defaultQueueName = this.defaultModel.replace(/\//g, '_');
    return {
      provider: 'unknown',
      queueName: defaultQueueName,
      selectedModel: this.defaultModel,
    };
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
