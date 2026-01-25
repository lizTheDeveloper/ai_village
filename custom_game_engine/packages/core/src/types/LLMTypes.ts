/**
 * LLM Provider types for core package.
 *
 * These types are defined here to break the circular dependency between
 * @ai-village/core and @ai-village/llm. The llm package implements these
 * interfaces, and core uses them via structural typing.
 */

import type { EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { CustomLLMConfig } from '../components/AgentComponent.js';

// Re-export CustomLLMConfig for external consumers
export type { CustomLLMConfig };

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

// CustomLLMConfig is imported from AgentComponent to avoid duplicate exports

/**
 * Interface for LLM Scheduler - handles layer selection and decision routing
 */
export interface LLMScheduler {
  /**
   * Request a decision asynchronously
   */
  requestDecision(entity: EntityImpl, world: World): Promise<LLMDecisionResult | null>;

  /**
   * Select which layer should handle this agent's decision
   */
  selectLayer(entity: EntityImpl, world: World): LayerSelectionResult;

  /**
   * Check if a layer is ready (not on cooldown)
   */
  isLayerReady(entityId: string, layer: DecisionLayer): boolean;

  /**
   * Build prompt for a specific layer
   */
  buildPrompt(layer: DecisionLayer, entity: EntityImpl, world: World): string;

  /**
   * Get agent state for cooldown tracking
   */
  getAgentState(entityId: string): SchedulerAgentState;
}

/**
 * Interface for LLM Decision Queue - manages async LLM requests
 */
export interface LLMDecisionQueue {
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

export interface LLMRequest {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

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

export interface ProviderPricing {
  providerId: string;
  providerName: string;
  inputCostPer1M: number; // Cost per 1M input tokens (USD)
  outputCostPer1M: number; // Cost per 1M output tokens (USD)
}

export interface LLMProvider {
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
