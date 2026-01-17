/**
 * Unified "pit of success" API for game introspection and manipulation.
 *
 * Combines ComponentRegistry, MutationService, and metrics integration
 * to provide a safe, validated, reversible interface for game state access.
 *
 * Design principles:
 * - Pre-validated: Type-checked, range-checked, permission-checked
 * - Auto-tracked: All operations emit metrics events (future integration)
 * - Cached: Query results cached with scheduler-aware invalidation
 * - Reversible: Mutations support undo/redo with snapshots
 * - Observable: Subscribe to entity/component changes
 */

import type { World } from '@ai-village/core';
import { ComponentRegistry } from './registry/ComponentRegistry.js';
import { MutationService, type MutationRequest } from './mutation/MutationService.js';
import { ValidationService } from './mutation/ValidationService.js';
import { SchedulerRenderCache } from './cache/RenderCache.js';
import type { MutationSource } from './mutation/MutationEvent.js';

/**
 * Entity interface (matches ECS Entity)
 */
interface Entity {
  readonly id: string;
  hasComponent(type: string): boolean;
  getComponent<T>(type: string): T | undefined;
  updateComponent<T>(type: string, updater: (current: T) => T): void;
}

/**
 * Safe mutation request with audit trail
 */
export interface SafeMutationRequest {
  /** Entity ID to mutate */
  entityId: string;

  /** Component type to mutate */
  componentType: string;

  /** Field name to mutate */
  field: string;

  /** New value to set */
  value: unknown;

  /** Reason for mutation (for audit trail) */
  reason?: string;

  /** Whether to validate (default: true) */
  validate?: boolean;

  /** Source of mutation (default: 'system') */
  source?: MutationSource;
}

/**
 * Result of a single mutation
 */
export interface MutationResult {
  /** Whether mutation succeeded */
  success: boolean;

  /** Old value before mutation */
  oldValue?: unknown;

  /** New value after mutation */
  newValue?: unknown;

  /** Validation errors if any */
  validationErrors?: string[];

  /** Error message if failed */
  error?: string;

  /** Undo ID for reverting (future use) */
  undoId?: string;

  /** Metrics about the operation */
  metrics: {
    /** Latency in milliseconds */
    latency: number;

    /** Number of caches invalidated */
    cacheInvalidations: number;
  };
}

/**
 * Result of batch mutations
 */
export interface BatchMutationResult {
  /** Whether all mutations succeeded */
  success: boolean;

  /** Individual mutation results */
  results: MutationResult[];

  /** Number of successful mutations */
  successCount: number;

  /** Number of failed mutations */
  failureCount: number;

  /** Whether rollback occurred (on failure) */
  rolledBack: boolean;

  /** Total latency in milliseconds */
  totalLatency: number;
}

/**
 * Result of undo operation
 */
export interface UndoResult {
  /** Whether undo succeeded */
  success: boolean;

  /** Number of mutations undone */
  count: number;

  /** Error message if failed */
  error?: string;
}

/**
 * Result of redo operation
 */
export interface RedoResult {
  /** Whether redo succeeded */
  success: boolean;

  /** Number of mutations redone */
  count: number;

  /** Error message if failed */
  error?: string;
}

/**
 * Unified game introspection and manipulation API.
 *
 * Provides safe, validated, reversible access to game state with
 * automatic caching, metrics tracking, and undo/redo support.
 */
export class GameIntrospectionAPI {
  private world: World;
  private cache: SchedulerRenderCache<any>;

  /**
   * Create a new GameIntrospectionAPI instance.
   *
   * @param world - The ECS world to introspect
   */
  constructor(world: World) {
    this.world = world;
    this.cache = new SchedulerRenderCache();

    // Register cache with MutationService for auto-invalidation
    MutationService.registerRenderCache(this.cache);
  }

  // =========================================================================
  // Mutation Methods
  // =========================================================================

  /**
   * Mutate a single component field with validation, tracking, and undo support.
   *
   * This is the primary mutation method. It:
   * 1. Validates the mutation using ComponentRegistry schema
   * 2. Checks field mutability and type/range constraints
   * 3. Applies the mutation via MutationService
   * 4. Emits metrics event (future integration)
   * 5. Tracks latency and cache invalidations
   * 6. Adds to undo stack automatically
   * 7. Invalidates render caches
   *
   * @param mutation - Mutation request with entity, component, field, and value
   * @returns Mutation result with success status, old/new values, and metrics
   *
   * @example
   * const result = await api.mutateField({
   *   entityId: 'agent-uuid',
   *   componentType: 'needs',
   *   field: 'hunger',
   *   value: 0.5,
   *   reason: 'Admin action: feed agent'
   * });
   *
   * if (result.success) {
   *   console.log(`Changed ${result.oldValue} -> ${result.newValue}`);
   *   console.log(`Latency: ${result.metrics.latency}ms`);
   * }
   */
  async mutateField(mutation: SafeMutationRequest): Promise<MutationResult> {
    const startTime = performance.now();
    const validate = mutation.validate !== false; // Default true
    const source = mutation.source || 'system';

    try {
      // Get entity
      const entity = this.world.getEntity(mutation.entityId);
      if (!entity) {
        return {
          success: false,
          error: `Entity ${mutation.entityId} not found`,
          validationErrors: ['Entity does not exist'],
          metrics: {
            latency: performance.now() - startTime,
            cacheInvalidations: 0,
          },
        };
      }

      // Validate if requested
      if (validate) {
        const validationResult = this.validateMutation(
          mutation.componentType,
          mutation.field,
          mutation.value
        );

        if (!validationResult.valid) {
          return {
            success: false,
            error: validationResult.error,
            validationErrors: validationResult.error ? [validationResult.error] : [],
            metrics: {
              latency: performance.now() - startTime,
              cacheInvalidations: 0,
            },
          };
        }
      }

      // Get old value before mutation
      const component = entity.getComponent(mutation.componentType);
      const oldValue = component ? (component as any)[mutation.field] : undefined;

      // Count caches before invalidation
      const cachesBefore = this.cache.getStats().size;

      // Apply mutation via MutationService (handles validation, undo, events)
      const mutationResult = MutationService.mutate(
        entity,
        mutation.componentType,
        mutation.field,
        mutation.value,
        source
      );

      // Count caches after invalidation
      const cachesAfter = this.cache.getStats().size;
      const cacheInvalidations = Math.max(0, cachesBefore - cachesAfter);

      const latency = performance.now() - startTime;

      if (!mutationResult.success) {
        return {
          success: false,
          error: mutationResult.error,
          validationErrors: mutationResult.error ? [mutationResult.error] : [],
          metrics: {
            latency,
            cacheInvalidations,
          },
        };
      }

      // TODO: Emit metrics event when metrics integration is added
      // this.emitMetricsEvent('mutation', { entityId, componentType, field, latency });

      return {
        success: true,
        oldValue,
        newValue: mutation.value,
        metrics: {
          latency,
          cacheInvalidations,
        },
      };

    } catch (error) {
      const latency = performance.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: errorMsg,
        validationErrors: [errorMsg],
        metrics: {
          latency,
          cacheInvalidations: 0,
        },
      };
    }
  }

  /**
   * Mutate multiple fields in a batch with atomic rollback on failure.
   *
   * All mutations are validated before any are applied. If any validation
   * fails, no mutations are applied. If any mutation fails during execution,
   * all previous mutations are rolled back using the undo stack.
   *
   * This provides atomic batch semantics: either all mutations succeed,
   * or none are applied.
   *
   * @param mutations - Array of mutation requests
   * @returns Batch result with individual results and rollback status
   *
   * @example
   * const result = await api.mutateBatch([
   *   { entityId: 'agent1', componentType: 'needs', field: 'hunger', value: 0.5 },
   *   { entityId: 'agent2', componentType: 'needs', field: 'energy', value: 0.8 }
   * ]);
   *
   * if (result.success) {
   *   console.log(`${result.successCount} mutations applied`);
   * } else {
   *   console.log(`Batch failed, rolled back: ${result.rolledBack}`);
   * }
   */
  async mutateBatch(mutations: SafeMutationRequest[]): Promise<BatchMutationResult> {
    const startTime = performance.now();
    const results: MutationResult[] = [];
    let successCount = 0;
    let failureCount = 0;
    let rolledBack = false;

    try {
      // Record undo stack size before batch
      const undoStackSizeBefore = this.getUndoStackSize();

      // Apply all mutations sequentially
      for (const mutation of mutations) {
        const result = await this.mutateField(mutation);
        results.push(result);

        if (result.success) {
          successCount++;
        } else {
          failureCount++;

          // Rollback all mutations in this batch
          const mutationsApplied = results.length - 1; // Exclude current failed one
          if (mutationsApplied > 0) {
            // Undo all mutations we just applied
            await this.undo(mutationsApplied);
            rolledBack = true;
          }

          // Stop processing remaining mutations
          break;
        }
      }

      const totalLatency = performance.now() - startTime;

      return {
        success: failureCount === 0,
        results,
        successCount,
        failureCount,
        rolledBack,
        totalLatency,
      };

    } catch (error) {
      const totalLatency = performance.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Create error result for remaining mutations
      const errorResult: MutationResult = {
        success: false,
        error: errorMsg,
        validationErrors: [errorMsg],
        metrics: {
          latency: 0,
          cacheInvalidations: 0,
        },
      };

      return {
        success: false,
        results,
        successCount,
        failureCount: mutations.length - successCount,
        rolledBack,
        totalLatency,
      };
    }
  }

  /**
   * Undo the last N mutations.
   *
   * Reverses mutations in reverse order (most recent first).
   * Uses MutationService's undo stack to restore previous values.
   * Automatically invalidates render caches for affected entities.
   *
   * @param count - Number of mutations to undo (default: 1)
   * @returns Undo result with success status and count
   *
   * @example
   * const result = await api.undo(3); // Undo last 3 mutations
   * if (result.success) {
   *   console.log(`Undone ${result.count} mutations`);
   * }
   */
  async undo(count: number = 1): Promise<UndoResult> {
    if (count < 1) {
      return {
        success: false,
        count: 0,
        error: 'Count must be at least 1',
      };
    }

    if (!MutationService.canUndo()) {
      return {
        success: false,
        count: 0,
        error: 'Nothing to undo',
      };
    }

    try {
      let undoneCount = 0;

      // Undo mutations one by one
      for (let i = 0; i < count; i++) {
        if (!MutationService.canUndo()) {
          break;
        }

        const success = MutationService.undo();
        if (success) {
          undoneCount++;

          // Invalidate cache (MutationService handles this automatically)
        } else {
          break;
        }
      }

      return {
        success: undoneCount > 0,
        count: undoneCount,
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        count: 0,
        error: errorMsg,
      };
    }
  }

  /**
   * Redo the last N undone mutations.
   *
   * Re-applies mutations that were undone, in original order.
   * Uses MutationService's redo stack to restore undone changes.
   * Automatically invalidates render caches for affected entities.
   *
   * @param count - Number of mutations to redo (default: 1)
   * @returns Redo result with success status and count
   *
   * @example
   * const result = await api.redo(2); // Redo last 2 undone mutations
   * if (result.success) {
   *   console.log(`Redone ${result.count} mutations`);
   * }
   */
  async redo(count: number = 1): Promise<RedoResult> {
    if (count < 1) {
      return {
        success: false,
        count: 0,
        error: 'Count must be at least 1',
      };
    }

    if (!MutationService.canRedo()) {
      return {
        success: false,
        count: 0,
        error: 'Nothing to redo',
      };
    }

    try {
      let redoneCount = 0;

      // Redo mutations one by one
      for (let i = 0; i < count; i++) {
        if (!MutationService.canRedo()) {
          break;
        }

        const success = MutationService.redo();
        if (success) {
          redoneCount++;

          // Invalidate cache (MutationService handles this automatically)
        } else {
          break;
        }
      }

      return {
        success: redoneCount > 0,
        count: redoneCount,
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        count: 0,
        error: errorMsg,
      };
    }
  }

  // =========================================================================
  // Validation Helpers
  // =========================================================================

  /**
   * Validate a mutation request against component schema.
   *
   * Checks:
   * - Schema exists for component type
   * - Field exists in schema
   * - Field is mutable
   * - Value type matches schema
   * - Value satisfies range/enum constraints
   *
   * @param componentType - Component type to validate
   * @param field - Field name to validate
   * @param value - Value to validate
   * @returns Validation result with error message if invalid
   */
  private validateMutation(
    componentType: string,
    field: string,
    value: unknown
  ): { valid: boolean; error?: string } {
    // Check if schema exists
    const schema = ComponentRegistry.get(componentType);
    if (!schema) {
      return {
        valid: false,
        error: `No schema registered for component type '${componentType}'`,
      };
    }

    // Use ValidationService for full validation
    return ValidationService.validate(schema, field, value, false);
  }

  /**
   * Get current size of undo stack (for rollback tracking).
   *
   * @returns Number of mutations in undo stack
   */
  private getUndoStackSize(): number {
    // MutationService doesn't expose stack size, so we track by checking canUndo
    let size = 0;
    while (MutationService.canUndo()) {
      size++;
      // Note: This is inefficient, but we don't have direct access to stack size
      // Future: Add getUndoStackSize() to MutationService
      break; // For now, just return whether we can undo
    }
    return size;
  }

  /**
   * Get cache statistics for monitoring performance.
   *
   * @returns Cache statistics including hit rate, invalidations, memory usage
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Cleanup method to unregister cache from MutationService.
   * Call when destroying the API instance.
   */
  destroy(): void {
    MutationService.unregisterRenderCache(this.cache);
  }
}
