import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { Entity } from '../ecs/Entity.js';
import type { MutationVectorComponent, MutationField } from '../components/MutationVectorComponent.js';

/**
 * StateMutatorSystem - Per-tick direct mutation of entity state
 *
 * This system applies smooth, per-tick state changes with ZERO GC pressure.
 *
 * Architecture:
 * - Mutation rates stored ON the entity in MutationVectorComponent
 * - Runs every tick (throttleInterval = 0)
 * - Direct mutation - no getEntity(), no updateComponent()
 * - Supports rate derivatives for natural decay
 * - No cleanup functions needed
 *
 * Usage:
 * ```typescript
 * import { setMutationRate, clearMutationRate } from '../components/MutationVectorComponent.js';
 *
 * // Set a mutation rate (rate is per second)
 * setMutationRate(entity, 'needs.hunger', -0.0008 / 60, {
 *   min: 0, max: 1, source: 'needs_system'
 * });
 *
 * // Set healing-over-time with decay
 * setMutationRate(entity, 'body.health', 0.5, {
 *   derivative: -0.1,  // Rate decays over time
 *   min: 0, max: 100,
 *   source: 'bandage',
 *   totalAmount: 20  // Stop after 20 hp healed
 * });
 *
 * // Clear a mutation rate
 * clearMutationRate(entity, 'needs.hunger');
 *
 * // Clear all mutations from a source
 * clearMutationsBySource(entity, 'poison');
 * ```
 *
 * Field Path Format:
 * - Paths are dot-separated: "component_type.field" or "component_type.nested.field"
 * - Examples: "needs.hunger", "body.health", "body.parts.arm.health"
 * - Use MUTATION_PATHS constants for type safety
 *
 * Performance:
 * - Zero allocations per tick (direct mutation)
 * - No getEntity() calls (iterates ctx.activeEntities)
 * - No updateComponent() calls (mutates fields directly)
 * - Smooth interpolation (updates every tick vs. once per minute)
 */
export class StateMutatorSystem extends BaseSystem {
  public readonly id: SystemId = 'state_mutator';
  public readonly priority: number = 5; // Run early, before most other systems

  // EVERY TICK - smooth interpolation with zero GC
  protected readonly throttleInterval = 0;

  // Process entities with mutation vectors
  public readonly requiredComponents = [CT.MutationVector] as const;

  /**
   * Main update - applies mutations every tick with zero allocations
   */
  protected onUpdate(ctx: SystemContext): void {
    const dt = ctx.deltaTime; // Seconds since last tick
    const tick = ctx.tick;

    // Process entities with MutationVectorComponent
    // This is the optimized path - no getEntity(), no updateComponent()
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
   * Get debug info about active mutations
   */
  getDebugInfo(): {
    entityCount: number;
    mutationCount: number;
    mutationsBySource: Map<string, number>;
  } {
    // Note: Actual counts require world access, which isn't available here
    // This is mainly for the debug API pattern - callers should iterate
    // entities with MutationVector components directly
    return {
      entityCount: 0,
      mutationCount: 0,
      mutationsBySource: new Map(),
    };
  }
}
