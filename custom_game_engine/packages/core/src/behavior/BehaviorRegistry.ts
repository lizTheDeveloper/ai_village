/**
 * BehaviorRegistry - Central registry for agent behaviors
 *
 * Manages registration and execution of agent behaviors.
 * Behaviors can be registered from anywhere (AISystem, individual files, etc.)
 *
 * Supports two handler signatures:
 * 1. Legacy: (entity, world) => void
 * 2. Modern: (ctx: BehaviorContext) => BehaviorResult | void
 *
 * Modern handlers receive a BehaviorContext which provides:
 * - Pre-fetched components (position, agent, movement, etc.)
 * - Optimized spatial queries (chunk-based, no global scans)
 * - Type-safe component access
 * - Distance utilities using squared distance by default
 *
 * Part of Phase 6 of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { AgentBehavior } from '../components/AgentComponent.js';
import { createBehaviorContext, type BehaviorContext, type BehaviorResult } from './BehaviorContext.js';

/**
 * Legacy handler function signature for behaviors.
 * @deprecated Use ContextBehaviorHandler for new behaviors
 */
export type BehaviorHandler = (entity: EntityImpl, world: World) => void;

/**
 * Modern handler function signature using BehaviorContext.
 * This is the preferred signature for new behaviors.
 */
export type ContextBehaviorHandler = (ctx: BehaviorContext) => BehaviorResult | void;

/**
 * Union type for both handler signatures
 */
export type AnyBehaviorHandler = BehaviorHandler | ContextBehaviorHandler;

/**
 * Metadata about a registered behavior.
 */
export interface BehaviorMeta {
  name: AgentBehavior;
  handler: AnyBehaviorHandler;
  /** Whether handler uses modern BehaviorContext signature */
  usesContext: boolean;
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
   * Register a behavior handler (legacy signature).
   *
   * @param name - Behavior name (matches AgentBehavior type)
   * @param handler - Function to execute the behavior
   * @param options - Optional metadata (description, priority)
   * @deprecated Use registerWithContext for new behaviors
   */
  register(
    name: string,
    handler: BehaviorHandler,
    options?: { description?: string; priority?: number }
  ): void {
    this.behaviors.set(name, {
      name: name as AgentBehavior,
      handler,
      usesContext: false,
      description: options?.description,
      priority: options?.priority,
    });
  }

  /**
   * Register a behavior handler using modern BehaviorContext signature.
   * This is the preferred method for new behaviors.
   *
   * @param name - Behavior name (matches AgentBehavior type)
   * @param handler - Function that receives BehaviorContext
   * @param options - Optional metadata (description, priority)
   *
   * @example
   * registry.registerWithContext('seek_food', (ctx) => {
   *   const nearbyFood = ctx.getEntitiesInRadius(50, [CT.Plant]);
   *   if (nearbyFood.length === 0) {
   *     return ctx.complete('no_food_found');
   *   }
   *   ctx.moveToward(nearbyFood[0].position);
   * });
   */
  registerWithContext(
    name: string,
    handler: ContextBehaviorHandler,
    options?: { description?: string; priority?: number }
  ): void {
    this.behaviors.set(name, {
      name: name as AgentBehavior,
      handler,
      usesContext: true,
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
   * Automatically handles both legacy and modern handler signatures:
   * - Legacy handlers receive (entity, world)
   * - Modern handlers receive BehaviorContext
   *
   * @param name - Behavior name
   * @param entity - Entity to execute behavior on
   * @param world - Game world
   * @returns BehaviorResult if modern handler, or { complete: false } for legacy
   */
  execute(name: string, entity: EntityImpl, world: World): BehaviorResult {
    const meta = this.behaviors.get(name);

    if (meta) {
      if (meta.usesContext) {
        // Modern handler - create context and pass it
        const ctx = createBehaviorContext(entity, world);
        const result = (meta.handler as ContextBehaviorHandler)(ctx);
        // Ensure we always return BehaviorResult (not void)
        return result !== undefined ? result : { complete: false };
      } else {
        // Legacy handler - call directly
        (meta.handler as BehaviorHandler)(entity, world);
        return { complete: false };
      }
    }

    // Try fallback
    if (this.fallbackBehavior) {
      this.fallbackBehavior(entity, world);
      return { complete: false };
    }

    // Behavior not found and no fallback
    console.warn(`[BehaviorRegistry] Unknown behavior: ${name}`);
    return { complete: true, reason: 'behavior_not_found' };
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
 * Register a behavior on the global registry (legacy signature).
 * @deprecated Use registerBehaviorWithContext for new behaviors
 */
export function registerBehavior(
  name: string,
  handler: BehaviorHandler,
  options?: { description?: string; priority?: number }
): void {
  getBehaviorRegistry().register(name, handler, options);
}

/**
 * Register a behavior on the global registry using modern BehaviorContext.
 * This is the preferred method for new behaviors.
 *
 * @example
 * registerBehaviorWithContext('seek_food', (ctx) => {
 *   const nearbyFood = ctx.getEntitiesInRadius(50, [CT.Plant]);
 *   if (nearbyFood.length === 0) {
 *     return ctx.complete('no_food_found');
 *   }
 *   ctx.moveToward(nearbyFood[0].position);
 * });
 */
export function registerBehaviorWithContext(
  name: string,
  handler: ContextBehaviorHandler,
  options?: { description?: string; priority?: number }
): void {
  getBehaviorRegistry().registerWithContext(name, handler, options);
}

/**
 * Execute a behavior from the global registry.
 */
export function executeBehavior(
  name: string,
  entity: EntityImpl,
  world: World
): BehaviorResult {
  return getBehaviorRegistry().execute(name, entity, world);
}
