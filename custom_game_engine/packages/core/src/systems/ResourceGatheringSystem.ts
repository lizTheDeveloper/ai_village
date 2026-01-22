import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { ResourceComponent } from '../components/ResourceComponent.js';
import { setMutationRate, clearMutationRate } from '../components/MutationVectorComponent.js';
import type { EventBus } from '../events/EventBus.js';

/**
 * ResourceGatheringSystem handles resource regeneration.
 * Resources with regenerationRate > 0 will slowly regenerate over time.
 *
 * Based on items-system/spec.md:
 * - Resources regenerate at regenerationRate per second
 * - Resources cannot exceed maxAmount
 *
 * PERFORMANCE: Uses MutationVectorComponent for per-tick state mutations (no GC pressure)
 * Instead of updating resources every tick, this system:
 * 1. Runs once per game minute to update mutation rates based on regeneration state
 * 2. StateMutatorSystem handles the actual per-tick mutation application
 * 3. Event emission handled here
 *
 * Dependencies:
 * @see StateMutatorSystem (priority 5) - Applies mutation vectors every tick
 */
export class ResourceGatheringSystem extends BaseSystem {
  public readonly id: SystemId = 'resource-gathering';
  public readonly priority: number = 5; // Run early, before AI decisions
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Resource];
  // Only run when resource components exist (O(1) activation check)
  public readonly activationComponents = [CT.Resource] as const;
  protected readonly throttleInterval = 100; // SLOW - 5 seconds

  /**
   * Systems that must run before this one.
   * @see StateMutatorSystem - handles per-tick mutation application
   */
  public readonly dependsOn = ['state_mutator'] as const;

  // Performance: Update mutation rates once per game minute (1200 ticks)
  private lastDeltaUpdateTick = 0;
  private readonly DELTA_UPDATE_INTERVAL = 1200; // 1 game minute

  protected onInitialize(_world: World, eventBus: EventBus): void {
    // Events initialized by BaseSystem
  }

  /** Run every 20 ticks (1 second at 20 TPS) - kept for discrete event checks */
  private static readonly UPDATE_INTERVAL = 20;

  protected onUpdate(ctx: SystemContext): void {
    // Performance: Only update mutation rates once per game minute
    const currentTick = ctx.tick;
    const shouldUpdateRates = currentTick - this.lastDeltaUpdateTick >= this.DELTA_UPDATE_INTERVAL;

    // activeEntities already filtered by SimulationScheduler via SystemContext
    const activeEntities = ctx.activeEntities;

    // Early exit if no active resources
    if (activeEntities.length === 0) {
      if (shouldUpdateRates) {
        this.lastDeltaUpdateTick = currentTick;
      }
      return;
    }

    // Check for discrete event emission once per second (move modulo check outside loop)
    const shouldCheckEvents = currentTick % ResourceGatheringSystem.UPDATE_INTERVAL === 0;

    for (const entity of activeEntities) {
      const impl = entity as EntityImpl;
      const resource = impl.getComponent<ResourceComponent>(CT.Resource);

      if (!resource) continue;

      // Update regeneration mutation rate based on current state (once per game minute)
      if (shouldUpdateRates) {
        // Skip if no regeneration
        if (resource.regenerationRate <= 0) {
          // Clear mutation rate if regeneration rate is zero
          clearMutationRate(entity, 'resource.amount');
          continue;
        }

        // Skip if already at max
        if (resource.amount >= resource.maxAmount) {
          // Clear mutation rate if already at max (will be re-registered when harvested)
          clearMutationRate(entity, 'resource.amount');
          continue;
        }

        // Set regeneration mutation rate
        // regenerationRate is per SECOND, setMutationRate expects rate per SECOND
        setMutationRate(entity, 'resource.amount', resource.regenerationRate, {
          min: 0,
          max: resource.maxAmount,
          source: 'resource_regeneration',
        });
      }

      // ========================================================================
      // Discrete Event Check (run once per second for event emission)
      // ========================================================================

      // Check for full regeneration event every second
      if (shouldCheckEvents) {
        // Check if just became fully regenerated
        const wasNotFull = resource.amount < resource.maxAmount;
        const isNowFull = resource.amount >= resource.maxAmount;

        if (wasNotFull && isNowFull) {
          ctx.emit('resource:regenerated', {
            resourceId: entity.id,
            resourceType: resource.resourceType,
            amount: resource.amount,
          });
        }
      }
    }

    if (shouldUpdateRates) {
      this.lastDeltaUpdateTick = currentTick;
    }
  }

  protected onCleanup(): void {
    // No cleanup needed - MutationVectorComponent is stored on entities
  }
}
