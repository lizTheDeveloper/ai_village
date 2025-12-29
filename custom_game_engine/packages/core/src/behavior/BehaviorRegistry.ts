/**
 * BehaviorRegistry - Central registry for agent behaviors
 *
 * Manages registration and execution of agent behaviors.
 * Behaviors can be registered from anywhere (AISystem, individual files, etc.)
 *
 * Part of Phase 6 of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { AgentBehavior } from '../components/AgentComponent.js';

/**
 * Handler function signature for behaviors.
 */
export type BehaviorHandler = (entity: EntityImpl, world: World) => void;

/**
 * Metadata about a registered behavior.
 */
export interface BehaviorMeta {
  name: AgentBehavior;
  handler: BehaviorHandler;
  description?: string;
  priority?: number;
}

/**
 * BehaviorRegistry - Centralized behavior management
 *
 * Usage:
 * ```typescript
 * const registry = new BehaviorRegistry();
 *
 * // Register behaviors
 * registry.register('wander', wanderBehavior);
 * registry.register('gather', gatherBehavior);
 *
 * // Execute a behavior
 * registry.execute('gather', entity, world);
 * ```
 */
export class BehaviorRegistry {
  private behaviors: Map<string, BehaviorMeta> = new Map();
  private fallbackBehavior: BehaviorHandler | null = null;

  /**
   * Register a behavior handler.
   *
   * @param name - Behavior name (matches AgentBehavior type)
   * @param handler - Function to execute the behavior
   * @param options - Optional metadata (description, priority)
   */
  register(
    name: string,
    handler: BehaviorHandler,
    options?: { description?: string; priority?: number }
  ): void {
    this.behaviors.set(name, {
      name: name as AgentBehavior,
      handler,
      description: options?.description,
      priority: options?.priority,
    });
  }

  /**
   * Unregister a behavior.
   */
  unregister(name: string): boolean {
    return this.behaviors.delete(name);
  }

  /**
   * Check if a behavior is registered.
   */
  has(name: string): boolean {
    return this.behaviors.has(name);
  }

  /**
   * Get behavior metadata.
   */
  get(name: string): BehaviorMeta | undefined {
    return this.behaviors.get(name);
  }

  /**
   * Set a fallback behavior to use when requested behavior is not found.
   */
  setFallback(handler: BehaviorHandler): void {
    this.fallbackBehavior = handler;
  }

  /**
   * Execute a behavior by name.
   *
   * @param name - Behavior name
   * @param entity - Entity to execute behavior on
   * @param world - Game world
   * @returns true if behavior was executed, false if not found
   */
  execute(name: string, entity: EntityImpl, world: World): boolean {
    const meta = this.behaviors.get(name);

    if (meta) {
      meta.handler(entity, world);
      return true;
    }

    // Try fallback
    if (this.fallbackBehavior) {
      this.fallbackBehavior(entity, world);
      return true;
    }

    // Behavior not found and no fallback
    console.warn(`[BehaviorRegistry] Unknown behavior: ${name}`);
    return false;
  }

  /**
   * Get all registered behavior names.
   */
  getRegisteredBehaviors(): string[] {
    return Array.from(this.behaviors.keys());
  }

  /**
   * Get count of registered behaviors.
   */
  get size(): number {
    return this.behaviors.size;
  }

  /**
   * Register multiple behaviors from another registry.
   */
  registerFrom(other: BehaviorRegistry): void {
    for (const [name, meta] of other.behaviors) {
      this.behaviors.set(name, meta);
    }
  }

  /**
   * Clear all registered behaviors.
   */
  clear(): void {
    this.behaviors.clear();
  }
}

// Global singleton for convenience
let globalRegistry: BehaviorRegistry | null = null;

/**
 * Get the global behavior registry.
 */
export function getBehaviorRegistry(): BehaviorRegistry {
  if (!globalRegistry) {
    globalRegistry = new BehaviorRegistry();
  }
  return globalRegistry;
}

/**
 * Initialize the global registry with a new instance.
 */
export function initBehaviorRegistry(registry?: BehaviorRegistry): BehaviorRegistry {
  globalRegistry = registry ?? new BehaviorRegistry();
  return globalRegistry;
}

/**
 * Register a behavior on the global registry.
 */
export function registerBehavior(
  name: string,
  handler: BehaviorHandler,
  options?: { description?: string; priority?: number }
): void {
  getBehaviorRegistry().register(name, handler, options);
}

/**
 * Execute a behavior from the global registry.
 */
export function executeBehavior(
  name: string,
  entity: EntityImpl,
  world: World
): boolean {
  return getBehaviorRegistry().execute(name, entity, world);
}
