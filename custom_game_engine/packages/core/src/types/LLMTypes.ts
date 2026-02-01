/**
 * LLM Provider types for core package.
 *
 * Re-exports from @ai-village/types to break circular dependencies.
 * The llm package implements these interfaces, and core uses them via structural typing.
 */

// Re-export all LLM types from the shared types package
export type {
  DecisionLayer,
  LayerSelectionResult,
  LLMDecisionResult,
  SchedulerAgentState,
  CustomLLMConfig,
  ILLMScheduler as LLMScheduler,
  ILLMDecisionQueue as LLMDecisionQueue,
  LLMRequest,
  LLMResponse,
  ProviderPricing,
  ILLMProvider as LLMProvider,
} from '@ai-village/types';
