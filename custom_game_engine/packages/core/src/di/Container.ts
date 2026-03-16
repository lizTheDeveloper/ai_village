/**
 * Dependency Injection Container
 *
 * Provides a simple DI container to break circular dependencies between packages.
 * External packages register their implementations at startup, and core code
 * retrieves them via type-safe getters.
 *
 * This replaces dynamic imports like `await import('@ai-village/agents')` with
 * synchronous calls like `container.getAgentFactory()`.
 *
 * Usage:
 * 1. In app entry point (renderer/city-simulator):
 *    ```
 *    import { container } from '@ai-village/core';
 *    import { createLLMAgent, createWanderingAgent } from '@ai-village/agents';
 *    import { LLMDecisionQueue } from '@ai-village/llm';
 *
 *    container.registerAgentFactory({ createLLMAgent, createWanderingAgent });
 *    container.registerLLMServices({ LLMDecisionQueue, GovernorPromptBuilder });
 *    ```
 *
 * 2. In core code:
 *    ```
 *    const agentFactory = container.getAgentFactory();
 *    if (agentFactory) {
 *      agentFactory.createLLMAgent(...);
 *    }
 *    ```
 */

import type { Entity } from '../ecs/Entity.js';
import type { World, WorldMutator } from '../ecs/World.js';

// Agent factory interface
export interface AgentFactory {
  createLLMAgent(
    world: WorldMutator,
    x: number,
    y: number,
    options?: {
      name?: string;
      profession?: string;
      startingGold?: number;
      personality?: unknown;
      customLLM?: unknown;
    }
  ): string;

  createWanderingAgent(
    world: WorldMutator,
    x: number,
    y: number,
    options?: {
      name?: string;
      profession?: string;
      startingGold?: number;
      personality?: unknown;
      guaranteedSkills?: Record<string, number>;
    }
  ): string;
}

// LLM services interface
export interface LLMServices {
  LLMDecisionQueue: new (provider: unknown, maxConcurrent: number) => {
    requestDecision(entityId: string, prompt: string, config?: unknown): Promise<string>;
  };

  GovernorPromptBuilder: new () => {
    buildVotePrompt(governor: Entity, proposal: unknown, context: unknown, world: World): string;
    buildDirectivePrompt(governor: Entity, directive: unknown, tier: unknown, world: World): string;
    buildCrisisPrompt(governor: Entity, crisis: unknown, tier: unknown, world: World): string;
  };

  OpenAICompatProvider: new (model: string, baseUrl: string, apiKey: string) => unknown;
}

// World services interface
export interface WorldServices {
  chunkSerializer: {
    serializeChunks(chunkManager: unknown): unknown;
    deserializeChunks(data: unknown, chunkManager: unknown): Promise<void>;
  };

  ChunkNameRegistry: new () => {
    nameChunk(chunkX: number, chunkY: number, name: string, namedBy: string, tick: number, description?: string): void;
    getChunkName(chunkX: number, chunkY: number): string | undefined;
    findChunkByName(name: string): { chunkX: number; chunkY: number } | undefined;
  };
}

/**
 * Global dependency injection container.
 * Singleton that holds references to external package implementations.
 */
class DIContainer {
  private agentFactory: AgentFactory | null = null;
  private llmServices: LLMServices | null = null;
  private worldServices: WorldServices | null = null;

  // Initialization flags
  private initialized = {
    agents: false,
    llm: false,
    world: false,
  };

  /**
   * Register agent factory functions from @ai-village/agents
   */
  registerAgentFactory(factory: AgentFactory): void {
    this.agentFactory = factory;
    this.initialized.agents = true;
  }

  /**
   * Register LLM services from @ai-village/llm
   */
  registerLLMServices(services: LLMServices): void {
    this.llmServices = services;
    this.initialized.llm = true;
  }

  /**
   * Register world services from @ai-village/world
   */
  registerWorldServices(services: WorldServices): void {
    this.worldServices = services;
    this.initialized.world = true;
  }

  /**
   * Get agent factory. Returns null if not registered.
   * Callers should handle null case gracefully.
   */
  getAgentFactory(): AgentFactory | null {
    return this.agentFactory;
  }

  /**
   * Get LLM services. Returns null if not registered.
   */
  getLLMServices(): LLMServices | null {
    return this.llmServices;
  }

  /**
   * Get world services. Returns null if not registered.
   */
  getWorldServices(): WorldServices | null {
    return this.worldServices;
  }

  /**
   * Check if all services are registered.
   */
  isFullyInitialized(): boolean {
    return this.initialized.agents && this.initialized.llm && this.initialized.world;
  }

  /**
   * Get initialization status for debugging.
   */
  getInitializationStatus(): Record<string, boolean> {
    return { ...this.initialized };
  }

  /**
   * Reset container (for testing).
   */
  reset(): void {
    this.agentFactory = null;
    this.llmServices = null;
    this.worldServices = null;
    this.initialized = {
      agents: false,
      llm: false,
      world: false,
    };
  }
}

// Global singleton instance
export const container = new DIContainer();

// Re-export types for external use
export type { DIContainer };
