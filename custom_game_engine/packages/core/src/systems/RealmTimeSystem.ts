import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { RealmLocationComponent } from '../components/RealmLocationComponent.js';

/**
 * RealmTimeSystem - Tracks time dilation for entities in different realms
 *
 * Responsible for:
 * - Updating totalTimeInRealm for each entity based on their realm's time dilation
 * - Providing utilities for systems to get realm-adjusted deltaTime
 *
 * This system runs early to update time tracking before other systems process entities.
 */
export class RealmTimeSystem extends BaseSystem {
  readonly id: SystemId = 'realm_time';
  readonly priority: number = 5;  // Run very early
  readonly requiredComponents = ['realm_location'] as const;

  protected onUpdate(ctx: SystemContext): void {
    // Update time tracking for each entity based on their current realm
    for (const entity of ctx.activeEntities) {
      const realmLocation = entity.components.get('realm_location') as RealmLocationComponent | undefined;
      if (!realmLocation) continue;

      // Apply time dilation to update total time in realm
      const adjustedDelta = ctx.deltaTime * realmLocation.timeDilation;
      realmLocation.totalTimeInRealm += adjustedDelta;
    }
  }

  /**
   * Get realm-adjusted deltaTime for a specific entity
   *
   * Use this in systems that need to process entities at different time rates
   * based on which realm they're in.
   */
  static getAdjustedDeltaTime(entity: Entity, deltaTime: number): number {
    const realmLocation = entity.components.get('realm_location') as RealmLocationComponent | undefined;
    if (!realmLocation) return deltaTime;

    return deltaTime * realmLocation.timeDilation;
  }

  /**
   * Get realm-adjusted deltaTime for an entity by ID
   */
  static getAdjustedDeltaTimeById(world: World, entityId: string, deltaTime: number): number {
    const entity = world.getEntity(entityId);
    if (!entity) return deltaTime;

    return RealmTimeSystem.getAdjustedDeltaTime(entity, deltaTime);
  }

  /**
   * Check if an entity is currently experiencing accelerated or decelerated time
   */
  static isTimeDilated(entity: Entity): boolean {
    const realmLocation = entity.components.get('realm_location') as RealmLocationComponent | undefined;
    if (!realmLocation) return false;

    return realmLocation.timeDilation !== 1.0;
  }

  /**
   * Get the time dilation factor for an entity
   */
  static getTimeDilation(entity: Entity): number {
    const realmLocation = entity.components.get('realm_location') as RealmLocationComponent | undefined;
    if (!realmLocation) return 1.0;

    return realmLocation.timeDilation;
  }
}
