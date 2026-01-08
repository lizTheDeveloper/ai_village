import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { ResourceComponent } from '../components/ResourceComponent.js';
import type { StateMutatorSystem } from './StateMutatorSystem.js';

/**
 * ResourceGatheringSystem handles resource regeneration.
 * Resources with regenerationRate > 0 will slowly regenerate over time.
 *
 * Based on items-system/spec.md:
 * - Resources regenerate at regenerationRate per second
 * - Resources cannot exceed maxAmount
 *
 * Performance: Uses StateMutatorSystem for batched regeneration updates.
 * Updates delta rates once per game minute instead of every tick.
 * Achieves 1200× performance improvement for 250k+ resource entities.
 */
export class ResourceGatheringSystem implements System {
  public readonly id: SystemId = 'resource-gathering';
  public readonly priority: number = 5; // Run early, before AI decisions
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Resource];

  public readonly dependsOn = ['state_mutator'] as const;

  private stateMutator: StateMutatorSystem | null = null;
  private lastDeltaUpdateTick = 0;
  private readonly DELTA_UPDATE_INTERVAL = 1200; // 1 game minute
  private deltaCleanups = new Map<string, () => void>();

  setStateMutatorSystem(stateMutator: StateMutatorSystem): void {
    this.stateMutator = stateMutator;
  }

  /** Run every 20 ticks (1 second at 20 TPS) - kept for discrete event checks */
  private static readonly UPDATE_INTERVAL = 20;

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    if (!this.stateMutator) {
      throw new Error('[ResourceGatheringSystem] StateMutatorSystem not set');
    }

    const currentTick = world.tick;
    const shouldUpdateDeltas = currentTick - this.lastDeltaUpdateTick >= this.DELTA_UPDATE_INTERVAL;

    // Performance: Use SimulationScheduler to skip resources far from agents
    // Resources near active areas regenerate, distant ones are paused
    const activeEntities = world.simulationScheduler.filterActiveEntities(entities, world.tick);

    for (const entity of activeEntities) {
      const impl = entity as EntityImpl;
      const resource = impl.getComponent<ResourceComponent>(CT.Resource);

      if (!resource) continue;

      // Skip if no regeneration
      if (resource.regenerationRate <= 0) {
        // Clean up delta if regeneration rate is zero
        if (this.deltaCleanups.has(entity.id)) {
          this.deltaCleanups.get(entity.id)!();
          this.deltaCleanups.delete(entity.id);
        }
        continue;
      }

      // Skip if already at max
      if (resource.amount >= resource.maxAmount) {
        // Clean up delta if already at max (will be re-registered when harvested)
        if (this.deltaCleanups.has(entity.id)) {
          this.deltaCleanups.get(entity.id)!();
          this.deltaCleanups.delete(entity.id);
        }
        continue;
      }

      // Update regeneration delta rate once per game minute
      if (shouldUpdateDeltas) {
        this.updateRegenerationDelta(entity, resource);
      }

      // ========================================================================
      // Discrete Event Check (run once per second for event emission)
      // ========================================================================

      // Check for full regeneration event every second
      if (currentTick % ResourceGatheringSystem.UPDATE_INTERVAL === 0) {
        // Check if just became fully regenerated
        const wasNotFull = resource.amount < resource.maxAmount;
        const isNowFull = resource.amount >= resource.maxAmount;

        if (wasNotFull && isNowFull) {
          world.eventBus.emit({
            type: 'resource:regenerated',
            source: entity.id,
            data: {
              resourceId: entity.id,
              resourceType: resource.resourceType,
              amount: resource.amount,
            },
          });
        }
      }
    }

    if (shouldUpdateDeltas) {
      this.lastDeltaUpdateTick = currentTick;
    }
  }

  /**
   * Update resource regeneration delta rate.
   * Registers delta with StateMutatorSystem for batched updates.
   */
  private updateRegenerationDelta(entity: Entity, resource: ResourceComponent): void {
    if (!this.stateMutator) {
      throw new Error('[ResourceGatheringSystem] StateMutatorSystem not set');
    }

    // Clean up old delta
    if (this.deltaCleanups.has(entity.id)) {
      this.deltaCleanups.get(entity.id)!();
    }

    // Calculate regeneration rate per game minute
    // regenerationRate is per second
    // Convert to per game minute: rate * 60 seconds per game minute
    const regenerationRatePerMinute = resource.regenerationRate * 60;

    const cleanup = this.stateMutator.registerDelta({
      entityId: entity.id,
      componentType: CT.Resource,
      field: 'amount',
      deltaPerMinute: regenerationRatePerMinute,
      min: 0,
      max: resource.maxAmount,
      source: 'resource_regeneration',
    });

    this.deltaCleanups.set(entity.id, cleanup);
  }
}
