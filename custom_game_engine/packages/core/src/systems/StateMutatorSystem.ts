import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';

/**
 * Delta update that will be applied to an entity's component
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
 * Registered delta with metadata for interpolation and expiration
 */
interface RegisteredDelta extends StateDelta {
  registeredAtTick: number;
  totalAmountApplied: number;  // Track how much has been applied (for totalAmount expiration)
}

/**
 * Type guard to safely check if a component has a numeric field
 */
function hasNumericField(obj: object, field: string): obj is Record<string, number> {
  return field in obj && typeof (obj as Record<string, unknown>)[field] === 'number';
}

/**
 * StateMutatorSystem - Batched vector-based state updates
 *
 * Performance optimization for systems that apply small, predictable changes every tick.
 * Instead of updating every tick, systems register delta rates (e.g., "-0.0008 hunger per minute")
 * and this system applies them in batches.
 *
 * Benefits:
 * - 60× performance improvement (updates once per game minute instead of 20 times/sec)
 * - Scales with entity count (100 agents = 6000× less work)
 * - UI can interpolate between updates for smooth display
 * - Generic: works for needs, damage over time, buffs, debuffs, etc.
 *
 * Usage Example:
 * ```typescript
 * // In NeedsSystem:
 * stateMutator.registerDelta({
 *   entityId: agent.id,
 *   componentType: CT.Needs,
 *   field: 'hunger',
 *   deltaPerMinute: -0.0008,
 *   min: 0,
 *   max: 1,
 *   source: 'needs_system'
 * });
 *
 * // In DamageOverTimeSystem:
 * stateMutator.registerDelta({
 *   entityId: agent.id,
 *   componentType: CT.Health,
 *   field: 'hp',
 *   deltaPerMinute: -5,  // 5 damage per minute from poison
 *   min: 0,
 *   source: 'poison_effect'
 * });
 * ```
 */
export class StateMutatorSystem extends BaseSystem {
  public readonly id: SystemId = 'state_mutator';
  public readonly priority: number = 5; // Run early, before most other systems
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  // Performance: Update once per game minute instead of every tick
  protected readonly throttleInterval = 1200; // 1 game minute at 20 TPS

  // Registered deltas grouped by entity for efficient lookup
  private deltas: Map<string, RegisteredDelta[]> = new Map();

  /**
   * Register a delta update to be applied at the next batch update
   *
   * @param delta - The delta specification
   * @returns A cleanup function to unregister this delta
   *
   * Examples:
   * ```typescript
   * // Bandage: +20 hp over 2 game minutes
   * registerDelta({
   *   entityId: agent.id,
   *   componentType: CT.Health,
   *   field: 'hp',
   *   deltaPerMinute: +10,
   *   totalAmount: 20,  // Expires after 20 hp healed
   *   source: 'bandage'
   * });
   *
   * // Buff: +50% speed for 5 game minutes
   * registerDelta({
   *   entityId: agent.id,
   *   componentType: CT.Movement,
   *   field: 'speed',
   *   deltaPerMinute: 0,  // Instant effect, not gradual
   *   expiresAtTick: world.tick + (1200 * 5),  // 5 game minutes
   *   source: 'speed_buff'
   * });
   * ```
   */
  registerDelta(delta: StateDelta): () => void {
    const entityDeltas = this.deltas.get(delta.entityId) || [];

    const registered: RegisteredDelta = {
      ...delta,
      registeredAtTick: 0, // Will be set on next update
      totalAmountApplied: 0,
    };

    entityDeltas.push(registered);
    this.deltas.set(delta.entityId, entityDeltas);

    // Return cleanup function
    return () => {
      const deltas = this.deltas.get(delta.entityId);
      if (deltas) {
        const index = deltas.indexOf(registered);
        if (index !== -1) {
          deltas.splice(index, 1);
        }
        if (deltas.length === 0) {
          this.deltas.delete(delta.entityId);
        }
      }
    };
  }

  /**
   * Clear all deltas for a specific entity
   * Useful when entity dies, leaves game, etc.
   */
  clearEntityDeltas(entityId: string): void {
    this.deltas.delete(entityId);
  }

  /**
   * Get current interpolated value for a field
   * Used by UI to display smooth values between batch updates
   */
  getInterpolatedValue(
    entityId: string,
    componentType: ComponentType,
    field: string,
    currentValue: number,
    currentTick: number
  ): number {
    const entityDeltas = this.deltas.get(entityId);
    if (!entityDeltas) return currentValue;

    // Find matching delta
    const delta = entityDeltas.find(
      d => d.componentType === componentType && d.field === field
    );
    if (!delta || delta.registeredAtTick === 0) return currentValue;

    // Calculate interpolated value
    const ticksSinceUpdate = currentTick - delta.registeredAtTick;
    const gameMinutesSinceUpdate = ticksSinceUpdate / 1200;
    const interpolatedValue = currentValue + (delta.deltaPerMinute * gameMinutesSinceUpdate);

    // Apply min/max bounds
    if (delta.min !== undefined && interpolatedValue < delta.min) return delta.min;
    if (delta.max !== undefined && interpolatedValue > delta.max) return delta.max;

    return interpolatedValue;
  }

  /**
   * Apply all registered deltas in a single batch
   */
  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;
    const deltaTime = ctx.deltaTime;

    // Calculate elapsed time (since throttleInterval is used, we get called every 1200 ticks)
    // However, we need to handle edge cases where deltaTime is provided but ticks don't advance
    const gameMinutesElapsed = deltaTime > 0 ? (deltaTime / 60) : 1.0; // Default to 1 game minute

    // Apply all deltas in batch
    for (const [entityId, entityDeltas] of this.deltas) {
      const entity = ctx.world.getEntity(entityId);
      if (!entity) {
        // Entity was removed - clean up deltas
        this.deltas.delete(entityId);
        continue;
      }

      const impl = entity as EntityImpl;

      // Group deltas by component for efficiency
      const deltasByComponent = new Map<ComponentType, RegisteredDelta[]>();
      for (const delta of entityDeltas) {
        const componentDeltas = deltasByComponent.get(delta.componentType) || [];
        componentDeltas.push(delta);
        deltasByComponent.set(delta.componentType, componentDeltas);
      }

      // Apply deltas to each component
      for (const [componentType, componentDeltas] of deltasByComponent) {
        const component = impl.getComponent(componentType);
        if (!component) {
          // Component was removed - clean up these deltas
          for (const delta of componentDeltas) {
            const index = entityDeltas.indexOf(delta);
            if (index !== -1) {
              entityDeltas.splice(index, 1);
            }
          }
          continue;
        }

        // Build update object with all field changes
        const updates: Record<string, number> = {};
        const expiredDeltas: RegisteredDelta[] = [];

        // CRITICAL: Sort deltas to apply healing (positive) before damage (negative)
        // This ensures healing can save entities from death when both occur simultaneously
        const sortedDeltas = [...componentDeltas].sort((a, b) => {
          // Positive (healing) comes before negative (damage)
          if (a.deltaPerMinute > 0 && b.deltaPerMinute <= 0) return -1;
          if (a.deltaPerMinute <= 0 && b.deltaPerMinute > 0) return 1;
          // Within same category, maintain registration order
          return 0;
        });

        for (const delta of sortedDeltas) {
          // Check for tick-based expiration
          if (delta.expiresAtTick !== undefined && currentTick >= delta.expiresAtTick) {
            expiredDeltas.push(delta);
            continue;
          }

          // Type-safe field access using type guard
          if (!hasNumericField(component, delta.field)) {
            console.warn(
              `[StateMutator] Field ${delta.field} on ${componentType} is not a number, skipping (source: ${delta.source})`
            );
            continue;
          }

          const currentValue = component[delta.field];

          // Calculate delta for this update
          let deltaChange = delta.deltaPerMinute * gameMinutesElapsed;

          // Check for amount-based expiration
          if (delta.totalAmount !== undefined) {
            const remainingAmount = delta.totalAmount - delta.totalAmountApplied;
            if (remainingAmount <= 0) {
              // Already applied full amount - expired
              expiredDeltas.push(delta);
              continue;
            }
            // Cap this update to not exceed remaining amount
            deltaChange = Math.min(Math.abs(deltaChange), remainingAmount) * Math.sign(deltaChange);
            delta.totalAmountApplied += Math.abs(deltaChange);

            // Check if this completes the total amount
            if (delta.totalAmountApplied >= delta.totalAmount) {
              expiredDeltas.push(delta);
            }
          }

          // Use accumulated value if we've already processed a delta for this field
          // This allows multiple systems to contribute deltas to the same field
          const baseValue: number = updates[delta.field] !== undefined
            ? (updates[delta.field] as number)
            : (currentValue ?? 0);
          let newValue = baseValue + deltaChange;

          // Apply min/max bounds
          if (delta.min !== undefined) {
            newValue = Math.max(delta.min, newValue);
          }
          if (delta.max !== undefined) {
            newValue = Math.min(delta.max, newValue);
          }

          updates[delta.field] = newValue;

          // Update registration tick for interpolation
          delta.registeredAtTick = currentTick;
        }

        // Remove expired deltas
        for (const expired of expiredDeltas) {
          const index = entityDeltas.indexOf(expired);
          if (index !== -1) {
            entityDeltas.splice(index, 1);
          }
        }

        // Apply all updates to component in a single updateComponent call
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
    deltaCount: number;
    deltasBySource: Map<string, number>;
  } {
    let totalDeltas = 0;
    const deltasBySource = new Map<string, number>();

    for (const entityDeltas of this.deltas.values()) {
      totalDeltas += entityDeltas.length;
      for (const delta of entityDeltas) {
        deltasBySource.set(delta.source, (deltasBySource.get(delta.source) || 0) + 1);
      }
    }

    return {
      entityCount: this.deltas.size,
      deltaCount: totalDeltas,
      deltasBySource,
    };
  }
}
