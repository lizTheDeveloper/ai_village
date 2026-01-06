/**
 * Central mutation service for component field changes
 *
 * Provides validated, reversible mutations with event emission.
 */

import { ComponentRegistry } from '../registry/ComponentRegistry.js';
import { ValidationService } from './ValidationService.js';
import { UndoStack, type MutationCommand } from './UndoStack.js';
import type {
  MutationEvent,
  MutationEventHandler,
  MutationSource,
  MutationFailedEvent,
} from './MutationEvent.js';
import type { SchedulerRenderCache } from '../cache/RenderCache.js';

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
 * Result of a mutation attempt
 */
export interface MutationResult {
  /** Whether mutation succeeded */
  success: boolean;

  /** Error message if mutation failed */
  error?: string;
}

/**
 * Request for a single mutation
 */
export interface MutationRequest {
  /** Entity to mutate */
  entity: Entity;

  /** Component type to mutate */
  componentType: string;

  /** Field name to mutate */
  fieldName: string;

  /** New value to set */
  value: unknown;

  /** Source of the mutation */
  source?: MutationSource;
}

/**
 * Central mutation service singleton
 *
 * Handles all component mutations with validation, undo/redo, and event emission.
 */
export class MutationService {
  private static instance: MutationService | null = null;

  private undoStack: UndoStack;
  private eventHandlers: Map<string, Set<MutationEventHandler>>;
  private isDev: boolean = false;
  private renderCaches: Set<SchedulerRenderCache<any>> = new Set();

  private constructor() {
    this.undoStack = new UndoStack(50);
    this.eventHandlers = new Map();
  }

  /**
   * Get the singleton instance
   */
  private static getInstance(): MutationService {
    if (!MutationService.instance) {
      MutationService.instance = new MutationService();
    }
    return MutationService.instance;
  }

  /**
   * Set dev mode (allows mutation of all fields)
   */
  static setDevMode(enabled: boolean): void {
    const instance = MutationService.getInstance();
    instance.isDev = enabled;
  }

  /**
   * Mutate a component field with validation
   *
   * @param entity - Entity to mutate
   * @param componentType - Type of component to mutate
   * @param fieldName - Name of the field to mutate
   * @param value - New value to set
   * @param source - Source of the mutation (default: 'system')
   * @returns Mutation result with success status and error message if failed
   */
  static mutate<T extends Record<string, any>>(
    entity: Entity,
    componentType: string,
    fieldName: string,
    value: unknown,
    source: MutationSource = 'system'
  ): MutationResult {
    const instance = MutationService.getInstance();

    // Check if entity has the component
    if (!entity.hasComponent(componentType)) {
      const error = `Entity ${entity.id} does not have component '${componentType}'`;
      instance.emitFailedEvent(entity.id, componentType, fieldName, value, error, source);
      return { success: false, error };
    }

    // Get the schema
    const schema = ComponentRegistry.get(componentType);
    if (!schema) {
      const error = `No schema registered for component type '${componentType}'`;
      instance.emitFailedEvent(entity.id, componentType, fieldName, value, error, source);
      return { success: false, error };
    }

    // Validate the mutation
    const validationResult = ValidationService.validate(
      schema,
      fieldName,
      value,
      instance.isDev
    );

    if (!validationResult.valid) {
      const error = validationResult.error || 'Validation failed';
      instance.emitFailedEvent(entity.id, componentType, fieldName, value, error, source);
      return { success: false, error };
    }

    // Get current component
    const component = entity.getComponent<T>(componentType);
    if (!component) {
      const error = `Failed to get component '${componentType}' from entity ${entity.id}`;
      instance.emitFailedEvent(entity.id, componentType, fieldName, value, error, source);
      return { success: false, error };
    }

    // Check if there's a custom mutator
    const field = schema.fields[fieldName];
    if (field?.mutateVia && schema.mutators && schema.mutators[field.mutateVia]) {
      try {
        // Use custom mutator
        const mutatorFn = schema.mutators[field.mutateVia];
        if (mutatorFn) {
          mutatorFn(entity, value);
        }

        // Custom mutators handle their own undo/redo and events
        // TODO: In the future, we could make custom mutators return undo commands
        return { success: true };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        instance.emitFailedEvent(entity.id, componentType, fieldName, value, errorMsg, source);
        return { success: false, error: errorMsg };
      }
    }

    // Get old value for undo and event
    const oldValue = component[fieldName];

    // Create mutation command
    const command: MutationCommand = {
      entityId: entity.id,
      componentType,
      fieldName,
      oldValue,
      newValue: value,
      execute: () => {
        entity.updateComponent(componentType, (comp: T) => ({
          ...comp,
          [fieldName]: value,
        }));
      },
      undo: () => {
        entity.updateComponent(componentType, (comp: T) => ({
          ...comp,
          [fieldName]: oldValue,
        }));
      },
    };

    // Execute the mutation
    try {
      command.execute();

      // Add to undo stack
      instance.undoStack.push(command);

      // Invalidate render caches
      instance.invalidateCaches(entity.id, componentType);

      // Emit mutation event
      instance.emitMutatedEvent({
        entityId: entity.id,
        componentType,
        fieldName,
        oldValue,
        newValue: value,
        timestamp: Date.now(),
        source,
      });

      // Run schema validation on the whole component after mutation
      const updatedComponent = entity.getComponent(componentType);
      if (updatedComponent && !schema.validate(updatedComponent)) {
        console.warn(
          `[MutationService] Component validation failed after mutation: ${componentType}.${fieldName}`
        );
      }

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      instance.emitFailedEvent(entity.id, componentType, fieldName, value, errorMsg, source);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Mutate multiple fields in a batch
   *
   * All mutations are validated before any are applied.
   * If any validation fails, no mutations are applied.
   *
   * @param mutations - Array of mutation requests
   * @returns Array of mutation results (same order as input)
   */
  static mutateBatch(mutations: MutationRequest[]): MutationResult[] {
    const instance = MutationService.getInstance();

    // Validate all mutations first
    const validations = mutations.map((req) => {
      const schema = ComponentRegistry.get(req.componentType);
      if (!schema) {
        return {
          valid: false,
          error: `No schema registered for component type '${req.componentType}'`,
        };
      }

      return ValidationService.validate(
        schema,
        req.fieldName,
        req.value,
        instance.isDev
      );
    });

    // If any validation failed, return errors for all
    const hasError = validations.some((v) => !v.valid);
    if (hasError) {
      return validations.map((v) => ({
        success: v.valid,
        error: v.error,
      }));
    }

    // All validations passed - apply mutations
    return mutations.map((req) =>
      MutationService.mutate(
        req.entity,
        req.componentType,
        req.fieldName,
        req.value,
        req.source || 'system'
      )
    );
  }

  /**
   * Undo the last mutation
   * @returns true if undo was performed, false if nothing to undo
   */
  static undo(): boolean {
    const instance = MutationService.getInstance();
    return instance.undoStack.undo();
  }

  /**
   * Redo the last undone mutation
   * @returns true if redo was performed, false if nothing to redo
   */
  static redo(): boolean {
    const instance = MutationService.getInstance();
    return instance.undoStack.redo();
  }

  /**
   * Check if undo is available
   */
  static canUndo(): boolean {
    const instance = MutationService.getInstance();
    return instance.undoStack.canUndo();
  }

  /**
   * Check if redo is available
   */
  static canRedo(): boolean {
    const instance = MutationService.getInstance();
    return instance.undoStack.canRedo();
  }

  /**
   * Clear undo/redo history
   */
  static clearHistory(): void {
    const instance = MutationService.getInstance();
    instance.undoStack.clear();
  }

  /**
   * Subscribe to mutation events
   *
   * @param event - Event type to listen for
   * @param handler - Handler function to call when event occurs
   */
  static on(event: 'mutated', handler: MutationEventHandler): void {
    const instance = MutationService.getInstance();
    if (!instance.eventHandlers.has(event)) {
      instance.eventHandlers.set(event, new Set());
    }
    instance.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from mutation events
   *
   * @param event - Event type to stop listening for
   * @param handler - Handler function to remove
   */
  static off(event: 'mutated', handler: MutationEventHandler): void {
    const instance = MutationService.getInstance();
    const handlers = instance.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit a mutation event to all subscribers
   */
  private emitMutatedEvent(event: MutationEvent): void {
    const handlers = this.eventHandlers.get('mutated');
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error('[MutationService] Error in event handler:', error);
        }
      });
    }
  }

  /**
   * Emit a mutation failed event
   */
  private emitFailedEvent(
    entityId: string,
    componentType: string,
    fieldName: string,
    attemptedValue: unknown,
    reason: string,
    source: MutationSource
  ): void {
    const event: MutationFailedEvent = {
      entityId,
      componentType,
      fieldName,
      attemptedValue,
      reason,
      timestamp: Date.now(),
      source,
    };

    // Log the failure
    console.warn('[MutationService] Mutation failed:', event);

    // TODO: In the future, we could emit 'mutation_failed' events
    // For now, just log them
  }

  /**
   * Register a render cache for automatic invalidation on mutations.
   *
   * @param cache - SchedulerRenderCache to register
   */
  static registerRenderCache(cache: SchedulerRenderCache<any>): void {
    const instance = MutationService.getInstance();
    instance.renderCaches.add(cache);
  }

  /**
   * Unregister a render cache.
   *
   * @param cache - SchedulerRenderCache to unregister
   */
  static unregisterRenderCache(cache: SchedulerRenderCache<any>): void {
    const instance = MutationService.getInstance();
    instance.renderCaches.delete(cache);
  }

  /**
   * Invalidate all registered render caches for a component.
   */
  private invalidateCaches(entityId: string, componentType: string): void {
    for (const cache of this.renderCaches) {
      cache.invalidate(entityId, componentType);
    }
  }
}
