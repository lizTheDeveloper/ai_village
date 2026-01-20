/**
 * @packageDocumentation
 * @module @ai-village/llm
 *
 * LLM Integration Layer for Agent Decision Making
 *
 * This package provides the complete infrastructure for AI agents to make decisions
 * using large language models, including prompt construction, provider management,
 * request routing, rate limiting, and response parsing.
 *
 * ## Architecture Overview
 *
 * The LLM package implements a three-layer agent architecture:
 * - **Layer 1 (Autonomic)**: Fast fallback behaviors (handled by AutonomicSystem, not LLM)
 * - **Layer 2 (Talker)**: Conversational/social decisions via {@link TalkerPromptBuilder}
 * - **Layer 3 (Executor)**: Strategic planning/execution via {@link StructuredPromptBuilder}
 *
 * ## Core Components
 *
 * ### Prompt Builders
 * Structured prompt construction from agent state and world context:
 * - {@link StructuredPromptBuilder} - General agent decisions (skills, resources, building, tasks)
 * - {@link TalkerPromptBuilder} - Conversational decisions (social, personality-driven)
 * - {@link ExecutorPromptBuilder} - Strategic planning prompts
 * - {@link WorldContextBuilder} - Environmental/spatial context generation
 * - {@link VillageInfoBuilder} - Village-level coordination information
 * - {@link MemoryBuilder} - Memory formatting for prompts
 * - {@link ActionBuilder} - Available actions based on skills (progressive reveal)
 *
 * ### LLM Providers
 * Multiple provider types with automatic fallback:
 * - {@link LLMProvider} - Abstract base interface for all providers
 * - {@link OllamaProvider} - Local Ollama server integration
 * - {@link OpenAICompatProvider} - OpenAI-compatible APIs (Groq, Fireworks, etc.)
 * - {@link ProxyLLMProvider} - Proxy through orchestration service
 * - {@link LoadBalancingProvider} - Round-robin across multiple providers
 * - {@link FallbackProvider} - Automatic fallback chain on failure
 *
 * ### Request Management
 * Queuing, rate limiting, and routing infrastructure:
 * - {@link LLMDecisionQueue} - Async request queue with concurrency control
 * - {@link LLMRequestRouter} - Server-side request routing with model mapping
 * - {@link RateLimiter} - Token bucket rate limiting (per-API-key)
 * - {@link ProviderQueue} - Per-provider request queuing
 * - {@link ProviderPoolManager} - Multi-provider pool management
 * - {@link GameSessionManager} - Multi-game session coordination
 * - {@link CooldownCalculator} - Multi-game cooldown distribution
 * - {@link Semaphore} - Concurrency limiting primitive
 *
 * ### Response Processing
 * Parse and validate LLM responses:
 * - {@link ResponseParser} - Parses LLM JSON output to validated agent actions
 * - {@link ActionDefinitions} - Single source of truth for valid actions (125+ actions)
 * - {@link SkillContextTemplates} - Skill-aware action filtering
 *
 * ### Performance & Observability
 * Caching, cost tracking, and metrics:
 * - {@link PromptCacheManager} - Multi-tier caching (static, village, frame, spatial)
 * - {@link CostTracker} - Token usage and cost tracking across sessions
 * - {@link QueueMetricsCollector} - Queue performance metrics
 * - {@link PromptLogger} - Debug logging for prompts and responses
 *
 * ### Provider Discovery
 * Model capability detection:
 * - {@link ProviderModelDiscovery} - Discover available models from providers
 * - {@link ModelCapabilityDiscovery} - Detect model capabilities (context length, etc.)
 * - {@link ModelProfileRegistry} - Known model profiles and configurations
 *
 * ## Key Features
 *
 * **Multi-tier prompt caching** reduces redundant world queries:
 * - Tier 1: Static data (building purposes, skill descriptions)
 * - Tier 2: Village-level (building counts, storage) - event-driven invalidation
 * - Tier 3: Frame-level (world queries) - cleared each tick, shared across agents
 * - Tier 4: Spatial TTL (harmony analysis) - 5-10 second expiration
 *
 * **Progressive skill reveal** only shows actions agents can perform:
 * - Actions locked by skill requirements (e.g., 'tame_animal' requires animal_handling: 2)
 * - Reduces prompt size and improves LLM focus
 * - Defined once in {@link ActionDefinitions}, enforced by {@link ActionBuilder}
 *
 * **Rate limiting** prevents API throttling:
 * - Token bucket algorithm with configurable requests/minute and burst
 * - Per-API-key tracking across multiple game sessions
 * - Automatic cooldown coordination between concurrent games
 *
 * **Cost tracking** monitors token usage and expenses:
 * - Per-session, per-agent, and per-provider tracking
 * - Input/output token counts and estimated costs
 * - Integrated with metrics dashboard
 *
 * ## Usage Example
 *
 * ```typescript
 * import {
 *   StructuredPromptBuilder,
 *   LLMDecisionQueue,
 *   OllamaProvider,
 *   ResponseParser,
 *   promptCache
 * } from '@ai-village/llm';
 *
 * // Initialize provider
 * const provider = new OllamaProvider({
 *   baseUrl: 'http://localhost:11434',
 *   model: 'qwen2.5:32b'
 * });
 *
 * // Create decision queue
 * const queue = new LLMDecisionQueue(provider, maxConcurrent: 5);
 *
 * // Initialize frame cache (once per tick)
 * promptCache.startFrame(world.tick);
 *
 * // Build prompt
 * const builder = new StructuredPromptBuilder();
 * const prompt = builder.buildPrompt(agent, world);
 *
 * // Make request
 * const responseText = await queue.requestDecision(agent.id, prompt);
 *
 * // Parse response
 * const parser = new ResponseParser();
 * const parsed = parser.parseResponse(responseText);
 * // Returns: { thinking, speaking, action, actionParams }
 *
 * // Execute validated action
 * executeAction(agent, parsed.action, parsed.actionParams);
 * ```
 *
 * ## Critical Rules
 *
 * - **Never bypass ResponseParser** - Always validate actions (no silent fallbacks)
 * - **Always use promptCache** for world queries - Eliminates redundant queries
 * - **Initialize frame cache once per tick** - `promptCache.startFrame(tick)`
 * - **Use ActionDefinitions as single source of truth** - Update all three: definitions, builder, handlers
 * - **Check provider availability** before making requests
 * - **Apply rate limiting** to prevent API throttling
 * - **No debug console.log** - Use PromptLogger for debugging
 *
 * @see {@link https://github.com/ai-village/multiverse/blob/main/custom_game_engine/packages/llm/README.md | LLM Package README}
 */

// ============================================================================
// LLM Provider Implementations
// ============================================================================

export * from './LLMProvider';
export * from './OllamaProvider';
export * from './OpenAICompatProvider';
export * from './ProxyLLMProvider';
export * from './LoadBalancingProvider';
export * from './FallbackProvider';

// ============================================================================
// Prompt Builders
// ============================================================================

export * from './StructuredPromptBuilder';
export * from './TalkerPromptBuilder';
export * from './ExecutorPromptBuilder';
export * from './GovernorPromptBuilder';

// ============================================================================
// Response Processing
// ============================================================================

export * from './ResponseParser';
export * from './ActionDefinitions';
export * from './SkillContextTemplates';

// ============================================================================
// Request Management & Queuing
// ============================================================================

export * from './LLMDecisionQueue';
export * from './LLMRequestRouter';
export * from './LLMScheduler';
export * from './ProviderQueue';
export * from './ProviderPoolManager';
export * from './GameSessionManager';
export * from './Semaphore';

// ============================================================================
// Rate Limiting & Cost Tracking
// ============================================================================

export * from './RateLimiter';
export * from './CooldownCalculator';
export * from './CostTracker';

// ============================================================================
// Performance & Caching
// ============================================================================

export * from './PromptCacheManager';

// ============================================================================
// Observability
// ============================================================================

export * from './PromptLogger';
export * from './QueueMetricsCollector';

// ============================================================================
// Provider Discovery
// ============================================================================

export * from './ProviderModelDiscovery';
export * from './ModelCapabilityDiscovery';
export * from './ModelProfileRegistry';

// ============================================================================
// Prompt Builder Utilities
// ============================================================================

export { WorldContextBuilder } from './prompt-builders/WorldContextBuilder';
export { VillageInfoBuilder } from './prompt-builders/VillageInfoBuilder';
export { MemoryBuilder } from './prompt-builders/MemoryBuilder';
export { ActionBuilder } from './prompt-builders/ActionBuilder';
