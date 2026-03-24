/**
 * LLM Provider types shared between core and llm packages.
 *
 * These types define the contract for LLM integration without
 * creating circular dependencies between packages.
 */

import type { IEntity } from './chunk.js';

/**
 * Decision layer type - determines which LLM behavior layer handles the decision
 */
export type DecisionLayer = 'autonomic' | 'talker' | 'executor';

/**
 * Result of layer selection
 */
export interface LayerSelectionResult {
  layer: DecisionLayer;
  reason: string;
}

/**
 * Result of an LLM decision request
 */
export interface LLMDecisionResult {
  response: string;
  layer: DecisionLayer;
  reason: string;
}

/**
 * Agent state for scheduler tracking
 */
export interface SchedulerAgentState {
  lastInvocation: Record<DecisionLayer, number>;
}

/**
 * Custom LLM configuration for per-agent LLM provider overrides.
 * If set, this agent will use these settings instead of global LLM settings.
 */
export interface CustomLLMConfig {
  /** Custom API base URL (e.g., https://api.anthropic.com/v1) */
  baseUrl?: string;
  /** Custom model name (e.g., claude-3-5-sonnet-20241022) */
  model?: string;
  /** Custom API key */
  apiKey?: string;
  /** Custom headers as key-value pairs (e.g., {"anthropic-version": "2023-06-01"}) */
  customHeaders?: Record<string, string>;
  /** Intelligence tier: 'simple', 'default', 'high', 'agi' - determines which LLM model to use */
  tier?: string;
  /** Skip tool-calling and JSON format — plain chat completion for freeform text responses */
  chatOnly?: boolean;
}

/**
 * Interface for LLM Scheduler - handles layer selection and decision routing
 */
export interface ILLMScheduler {
  /**
   * Request a decision asynchronously
   */
  requestDecision(entity: IEntity, world: unknown): Promise<LLMDecisionResult | null>;

  /**
   * Select which layer should handle this agent's decision
   */
  selectLayer(entity: IEntity, world: unknown): LayerSelectionResult;

  /**
   * Check if a layer is ready (not on cooldown)
   */
  isLayerReady(entityId: string, layer: DecisionLayer): boolean;

  /**
   * Build prompt for a specific layer
   */
  buildPrompt(layer: DecisionLayer, entity: IEntity, world: unknown): string;

  /**
   * Get agent state for cooldown tracking
   */
  getAgentState(entityId: string): SchedulerAgentState;
}

/**
 * Interface for LLM Decision Queue - manages async LLM requests
 */
export interface ILLMDecisionQueue {
  /**
   * Get a completed decision if available
   */
  getDecision(entityId: string): string | null;

  /**
   * Request a new decision (async)
   * Returns a promise that resolves with the LLM response text
   */
  requestDecision(entityId: string, prompt: string, customLLM?: CustomLLMConfig): Promise<string>;
}

/**
 * LLM request parameters.
 */
export interface LLMRequest {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  chatOnly?: boolean;  // Skip tool-calling and JSON format — use plain chat completion
}

/**
 * LLM response with token usage and cost information.
 */
export interface LLMResponse {
  text: string;
  stopReason?: string;
  tokensUsed?: number; // Deprecated: use inputTokens + outputTokens

  // Detailed token counts
  inputTokens: number;
  outputTokens: number;

  // Cost information
  costUSD: number;
}

/**
 * Provider pricing information.
 */
export interface ProviderPricing {
  providerId: string;
  providerName: string;
  inputCostPer1M: number; // Cost per 1M input tokens (USD)
  outputCostPer1M: number; // Cost per 1M output tokens (USD)
}

/**
 * Interface for LLM providers.
 */
export interface ILLMProvider {
  /**
   * Generate a response from the LLM.
   */
  generate(request: LLMRequest): Promise<LLMResponse>;

  /**
   * Get the model name being used.
   */
  getModelName(): string;

  /**
   * Check if the provider is available.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get pricing information for this provider.
   */
  getPricing(): ProviderPricing;

  /**
   * Get the provider ID (e.g., 'ollama', 'groq', 'openai', 'mlx')
   */
  getProviderId(): string;
}
