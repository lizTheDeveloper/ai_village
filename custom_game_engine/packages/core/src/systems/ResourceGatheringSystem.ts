import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { ResourceComponent } from '../components/ResourceComponent.js';

/**
 * ResourceGatheringSystem handles resource regeneration.
 * Resources with regenerationRate > 0 will slowly regenerate over time.
 *
 * Based on items-system/spec.md:
 * - Resources regenerate at regenerationRate per second
 * - Resources cannot exceed maxAmount
 *
 * Performance: Runs every 20 ticks (1 second) instead of every tick.
 * This reduces iteration over 250k+ resource entities to once per second.
 */
export class ResourceGatheringSystem implements System {
  public readonly id: SystemId = 'resource-gathering';
  public readonly priority: number = 5; // Run early, before AI decisions
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Resource];

  /** Run every 20 ticks (1 second at 20 TPS) */
  private static readonly UPDATE_INTERVAL = 20;

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Throttle: only run once per second
    if (world.tick % ResourceGatheringSystem.UPDATE_INTERVAL !== 0) {
      return;
    }

    // Multiply deltaTime by interval to compensate for skipped ticks
    const effectiveDeltaTime = deltaTime * ResourceGatheringSystem.UPDATE_INTERVAL;

    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const resource = impl.getComponent<ResourceComponent>(CT.Resource);

      if (!resource) continue;

      // Skip if no regeneration
      if (resource.regenerationRate <= 0) continue;

      // Skip if already at max
      if (resource.amount >= resource.maxAmount) continue;

      // Regenerate resource
      const regenAmount = resource.regenerationRate * effectiveDeltaTime;
      const newAmount = Math.min(resource.maxAmount, resource.amount + regenAmount);

      impl.updateComponent<ResourceComponent>(CT.Resource, (current) => ({
        ...current,
        amount: newAmount,
      }));

      // Log regeneration for visibility (playtest requirement)
      if (regenAmount > 0.1) { // Only log if significant regeneration occurred
      }

      // Emit event if fully regenerated
      if (newAmount >= resource.maxAmount && resource.amount < resource.maxAmount) {
        world.eventBus.emit({
          type: 'resource:regenerated',
          source: entity.id,
          data: {
            resourceId: entity.id,
            resourceType: resource.resourceType,
            amount: newAmount,
          },
        });
      }
    }
  }
}
