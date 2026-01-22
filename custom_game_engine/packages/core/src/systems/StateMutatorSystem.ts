import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { MutationVectorComponent, MutationField } from '../components/MutationVectorComponent.js';

/**
 * Legacy delta update that will be applied to an entity's component
 * @deprecated Use setMutationRate() helper instead
 */
interface StateDelta {
  entityId: string;
  componentType: ComponentType;
  field: string;
  deltaPerMinute: number;  // Rate of change per game minute
  min?: number;            // Optional minimum value
  max?: number;            // Optional maximum value
  source: string;          // System that registered this delta (for debugging)
  expiresAtTick?: number;  // Optional: Delta auto-removes at this tick
  totalAmount?: number;    // Optional: Total amount to apply (for bandages, potions, etc.)
}

/**
 * Legacy registered delta with metadata for interpolation and expiration
 * @deprecated Use MutationVectorComponent instead
 */
interface RegisteredDelta extends StateDelta {
  registeredAtTick: number;
  totalAmountApplied: number;
}

/**
 * Type guard to safely check if a component has a numeric field
 */
function hasNumericField(obj: object, field: string): obj is Record<string, number> {
  return field in obj && typeof (obj as Record<string, unknown>)[field] === 'number';
}

/**
 * StateMutatorSystem - Per-tick direct mutation of entity state
 *
 * This system applies smooth, per-tick state changes with ZERO GC pressure.
 *
 * NEW ARCHITECTURE (MutationVectorComponent):
 * - Mutation rates stored ON the entity in MutationVectorComponent
 * - Runs every tick (throttleInterval = 0)
 * - Direct mutation - no getEntity(), no updateComponent()
 * - Supports rate derivatives for natural decay
 * - No cleanup functions needed
 *
 * LEGACY API (registerDelta):
 * - Still supported for backward compatibility during migration
 * - Will be removed in Phase 4 of migration
 *
 * Usage (new style):
 * ```typescript
 * import { setMutationRate } from '../components/MutationVectorComponent.js';
 *
 * // Set a mutation rate
 * setMutationRate(entity, 'needs.hunger', -0.0008 / 60, {
 *   min: 0, max: 1, source: 'needs_system'
 * });
 *
 * // Clear a mutation rate
 * clearMutationRate(entity, 'needs.hunger');
 * ```
 */
export class StateMutatorSystem extends BaseSystem {
  public readonly id: SystemId = 'state_mutator';
  public readonly priority: number = 5; // Run early, before most other systems

  // EVERY TICK - this is the whole point of the redesign!
  protected readonly throttleInterval = 0;

  // Process entities with mutation vectors
  public readonly requiredComponents = [CT.MutationVector] as const;

  // =============================================================
  // LEGACY API - kept for backward compatibility during migration
  // =============================================================
  private legacyDeltas: Map<string, RegisteredDelta[]> = new Map();
  private legacyLastUpdate = 0;
  private readonly LEGACY_UPDATE_INTERVAL = 1200; // Legacy batch interval

  /**
   * @deprecated Use setMutationRate() from MutationVectorComponent instead
   * Register a delta update using the legacy API
   */
  registerDelta(delta: StateDelta): () => void {
    const entityDeltas = this.legacyDeltas.get(delta.entityId) || [];

    const registered: RegisteredDelta = {
      ...delta,
      registeredAtTick: 0,
      totalAmountApplied: 0,
    };

    entityDeltas.push(registered);
    this.legacyDeltas.set(delta.entityId, entityDeltas);

    // Return cleanup function
    return () => {
      const deltas = this.legacyDeltas.get(delta.entityId);
      if (deltas) {
        const index = deltas.indexOf(registered);
        if (index !== -1) {
          deltas.splice(index, 1);
        }
        if (deltas.length === 0) {
          this.legacyDeltas.delete(delta.entityId);
        }
      }
    };
  }

  /**
   * @deprecated Legacy cleanup API
   */
  clearEntityDeltas(entityId: string): void {
    this.legacyDeltas.delete(entityId);
  }

  /**
   * @deprecated Legacy interpolation API
   */
  getInterpolatedValue(
    entityId: string,
    componentType: ComponentType,
    field: string,
    currentValue: number,
    currentTick: number
  ): number {
    const entityDeltas = this.legacyDeltas.get(entityId);
    if (!entityDeltas) return currentValue;

    const delta = entityDeltas.find(
      d => d.componentType === componentType && d.field === field
    );
    if (!delta || delta.registeredAtTick === 0) return currentValue;

    const ticksSinceUpdate = currentTick - delta.registeredAtTick;
    const gameMinutesSinceUpdate = ticksSinceUpdate / 1200;
    const interpolatedValue = currentValue + (delta.deltaPerMinute * gameMinutesSinceUpdate);

    if (delta.min !== undefined && interpolatedValue < delta.min) return delta.min;
    if (delta.max !== undefined && interpolatedValue > delta.max) return delta.max;

    return interpolatedValue;
  }
  // =============================================================
  // END LEGACY API
  // =============================================================

  /**
   * Main update - applies mutations every tick with zero allocations
   */
  protected onUpdate(ctx: SystemContext): void {
    const dt = ctx.deltaTime; // Seconds since last tick
    const tick = ctx.tick;

    // =====================================================
    // NEW: Process entities with MutationVectorComponent
    // This is the optimized path - no getEntity(), no updateComponent()
    // =====================================================
    for (const entity of ctx.activeEntities) {
      const mv = entity.getComponent<MutationVectorComponent>(CT.MutationVector);
      if (!mv) continue;

      const expiredFields: string[] = [];
      const fieldEntries = Object.entries(mv.fields) as [string, MutationField][];

      for (const [fieldPath, field] of fieldEntries) {
        // Apply rate to target field
        const delta = field.rate * dt;
        this.applyDelta(entity, fieldPath, delta, field);

        // Apply derivative (rate decay/acceleration)
        if (field.derivative !== 0) {
          field.rate += field.derivative * dt;
        }

        // Track totalAmount expiration
        if (field.totalAmount !== undefined && field.appliedAmount !== undefined) {
          field.appliedAmount += Math.abs(delta);
          if (field.appliedAmount >= field.totalAmount) {
            expiredFields.push(fieldPath);
          }
        }

        // Check tick expiration
        if (field.expiresAt !== undefined && tick >= field.expiresAt) {
          expiredFields.push(fieldPath);
        }

        // Check if rate has decayed to negligible
        if (Math.abs(field.rate) < 0.0001 && field.derivative === 0) {
          expiredFields.push(fieldPath);
        }
      }

      // Remove expired fields (direct mutation - no new object)
      for (const path of expiredFields) {
        delete mv.fields[path];
      }
    }

    // =====================================================
    // LEGACY: Process registerDelta() entities (throttled)
    // This path is kept for backward compatibility
    // =====================================================
    if (tick - this.legacyLastUpdate >= this.LEGACY_UPDATE_INTERVAL) {
      this.processLegacyDeltas(ctx);
      this.legacyLastUpdate = tick;
    }
  }

  /**
   * Apply delta to a nested field path like "needs.hunger"
   * Uses direct mutation - no updateComponent() allocation
   */
  private applyDelta(
    entity: Entity,
    fieldPath: string,
    delta: number,
    field: MutationField
  ): void {
    const parts = fieldPath.split('.');
    if (parts.length < 2) {
      console.warn(`[StateMutator] Invalid field path: ${fieldPath} (expected "component.field")`);
      return;
    }

    const componentType = parts[0] as ComponentType;
    const fieldName = parts.slice(1).join('.');

    const component = entity.getComponent(componentType);
    if (!component) return;

    // Navigate to the target field and mutate directly
    // We need to treat component as a record for dynamic field access
    // This is safe because we're doing runtime type checks below
    let current: Record<string, unknown> = component as unknown as Record<string, unknown>;
    const pathParts = fieldName.split('.');

    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!part) return;
      const next = current[part];
      if (!next || typeof next !== 'object') return;
      current = next as Record<string, unknown>;
    }

    const finalField = pathParts[pathParts.length - 1];
    if (!finalField) return;

    const currentValue = current[finalField];
    if (typeof currentValue !== 'number') return;

    let newValue = currentValue + delta;

    // Apply bounds
    if (field.min !== undefined) newValue = Math.max(field.min, newValue);
    if (field.max !== undefined) newValue = Math.min(field.max, newValue);

    // Direct mutation - no allocation!
    current[finalField] = newValue;
  }

  /**
   * Process legacy registerDelta() entities
   * @deprecated This will be removed in Phase 4 of migration
   */
  private processLegacyDeltas(ctx: SystemContext): void {
    const currentTick = ctx.tick;
    const gameMinutesElapsed = 1.0; // Legacy path assumes 1 game minute per batch

    for (const [entityId, entityDeltas] of this.legacyDeltas) {
      const entity = ctx.world.getEntity(entityId);
      if (!entity) {
        this.legacyDeltas.delete(entityId);
        continue;
      }

      const impl = entity as EntityImpl;

      // Group by component
      const deltasByComponent = new Map<ComponentType, RegisteredDelta[]>();
      for (const delta of entityDeltas) {
        const componentDeltas = deltasByComponent.get(delta.componentType) || [];
        componentDeltas.push(delta);
        deltasByComponent.set(delta.componentType, componentDeltas);
      }

      // Apply to each component
      for (const [componentType, componentDeltas] of deltasByComponent) {
        const component = impl.getComponent(componentType);
        if (!component) {
          for (const delta of componentDeltas) {
            const index = entityDeltas.indexOf(delta);
            if (index !== -1) entityDeltas.splice(index, 1);
          }
          continue;
        }

        const updates: Record<string, number> = {};
        const expiredDeltas: RegisteredDelta[] = [];

        // Sort: healing before damage
        const sortedDeltas = [...componentDeltas].sort((a, b) => {
          if (a.deltaPerMinute > 0 && b.deltaPerMinute <= 0) return -1;
          if (a.deltaPerMinute <= 0 && b.deltaPerMinute > 0) return 1;
          return 0;
        });

        for (const delta of sortedDeltas) {
          if (delta.expiresAtTick !== undefined && currentTick >= delta.expiresAtTick) {
            expiredDeltas.push(delta);
            continue;
          }

          if (!hasNumericField(component, delta.field)) {
            console.warn(
              `[StateMutator] Field ${delta.field} on ${componentType} is not a number (source: ${delta.source})`
            );
            continue;
          }

          const currentValue = component[delta.field];
          let deltaChange = delta.deltaPerMinute * gameMinutesElapsed;

          if (delta.totalAmount !== undefined) {
            const remainingAmount = delta.totalAmount - delta.totalAmountApplied;
            if (remainingAmount <= 0) {
              expiredDeltas.push(delta);
              continue;
            }
            deltaChange = Math.min(Math.abs(deltaChange), remainingAmount) * Math.sign(deltaChange);
            delta.totalAmountApplied += Math.abs(deltaChange);

            if (delta.totalAmountApplied >= delta.totalAmount) {
              expiredDeltas.push(delta);
            }
          }

          const baseValue: number = updates[delta.field] !== undefined
            ? (updates[delta.field] as number)
            : (currentValue ?? 0);
          let newValue = baseValue + deltaChange;

          if (delta.min !== undefined) newValue = Math.max(delta.min, newValue);
          if (delta.max !== undefined) newValue = Math.min(delta.max, newValue);

          updates[delta.field] = newValue;
          delta.registeredAtTick = currentTick;
        }

        for (const expired of expiredDeltas) {
          const index = entityDeltas.indexOf(expired);
          if (index !== -1) entityDeltas.splice(index, 1);
        }

        // Legacy path still uses updateComponent
        impl.updateComponent(componentType, (current) => ({
          ...current,
          ...updates,
        }));
      }
    }
  }

  /**
   * Get debug info about registered deltas
   */
  getDebugInfo(): {
    entityCount: number;
    legacyEntityCount: number;
    deltaCount: number;
    legacyDeltaCount: number;
    deltasBySource: Map<string, number>;
  } {
    let totalDeltas = 0;
    let legacyDeltas = 0;
    const deltasBySource = new Map<string, number>();

    // Count legacy deltas
    for (const entityDeltas of this.legacyDeltas.values()) {
      legacyDeltas += entityDeltas.length;
      for (const delta of entityDeltas) {
        deltasBySource.set(delta.source, (deltasBySource.get(delta.source) || 0) + 1);
      }
    }

    return {
      entityCount: 0, // New path entities are counted via requiredComponents
      legacyEntityCount: this.legacyDeltas.size,
      deltaCount: totalDeltas,
      legacyDeltaCount: legacyDeltas,
      deltasBySource,
    };
  }
}
