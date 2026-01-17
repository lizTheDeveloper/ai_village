/**
 * PlanetTravelSystem - Manages entity travel between planets
 *
 * This system handles:
 * - Processing active travel (updating progress, state transitions)
 * - Completing travel (updating PlanetLocationComponent)
 * - Handling travel failures
 * - Updating portal cooldowns and stability
 *
 * Travel can occur via:
 * - Portals: Instant travel through PlanetPortal entities
 * - Spacecraft: Timed travel via Spaceship entities
 * - Rituals: Divine/magical teleportation
 *
 * Priority: 350 (after movement, before cognition)
 */

import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { PlanetTravelComponent } from '../navigation/PlanetTravelComponent.js';
import type { PlanetPortalComponent } from '../navigation/PlanetPortalComponent.js';
import type { PlanetLocationComponent } from '../components/PlanetLocationComponent.js';
import {
  updateTravelProgress,
  completePlanetTravel,
  failPlanetTravel,
  isInstantTravel,
  createPortalTravelComponent,
  createSpacecraftTravelComponent,
} from '../navigation/PlanetTravelComponent.js';
import { usePortal, updatePortal, canUsePortal } from '../navigation/PlanetPortalComponent.js';
import { updatePlanetLocation } from '../components/PlanetLocationComponent.js';

// ============================================================================
// System
// ============================================================================

export class PlanetTravelSystem implements System {
  public readonly id: SystemId = CT.PlanetTravel;
  public readonly priority: number = 350;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  public readonly metadata = {
    category: 'infrastructure' as const,
    description: 'Manages entity travel between planets',
    writesComponents: [CT.PlanetTravel, CT.PlanetLocation, CT.PlanetPortal, CT.Position],
  };

  public update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    const tick = world.tick;

    // Update all planet portals (cooldowns, stability)
    this.updatePortals(world);

    // Process all entities with active travel
    this.processTravelers(world, tick);
  }

  /**
   * Update all planet portals (cooldowns, stability regeneration).
   */
  private updatePortals(world: World): void {
    const portals = world.query()
      .with(CT.PlanetPortal)
      .executeEntities();

    for (const portalEntity of portals) {
      const portal = portalEntity.getComponent<PlanetPortalComponent>(CT.PlanetPortal);
      if (portal) {
        updatePortal(portal);
      }
    }
  }

  /**
   * Process all entities that are actively traveling.
   */
  private processTravelers(world: World, tick: number): void {
    const travelers = world.query()
      .with(CT.PlanetTravel)
      .executeEntities();

    for (const entity of travelers) {
      const impl = entity as EntityImpl;
      const travel = impl.getComponent<PlanetTravelComponent>(CT.PlanetTravel);
      if (!travel) continue;

      switch (travel.state) {
        case 'preparing':
          this.handlePreparing(world, impl, travel, tick);
          break;

        case 'in_transit':
          this.handleInTransit(world, impl, travel, tick);
          break;

        case 'arriving':
          this.handleArriving(world, impl, travel, tick);
          break;

        case 'complete':
          this.handleComplete(world, impl, travel);
          break;

        case 'failed':
          this.handleFailed(world, impl, travel);
          break;
      }
    }
  }

  /**
   * Handle entities preparing to travel.
   */
  private handlePreparing(
    world: World,
    entity: EntityImpl,
    travel: PlanetTravelComponent,
    tick: number
  ): void {
    // For portal travel, immediately start transit
    if (travel.travelMethod === 'portal') {
      entity.updateComponent<PlanetTravelComponent>(CT.PlanetTravel, (t) => ({
        ...t,
        state: 'in_transit',
      }));
      return;
    }

    // For spacecraft, check if ship and crew are ready
    if (travel.travelMethod === 'spacecraft' && travel.spacecraft) {
      const ship = world.getEntity(travel.spacecraft.shipId);
      if (!ship) {
        entity.updateComponent<PlanetTravelComponent>(CT.PlanetTravel, (t) => ({
          ...t,
          state: 'failed',
          failureReason: 'Ship not found',
        }));
        return;
      }

      // After brief preparation, start transit
      const prepTime = tick - travel.startTick;
      if (prepTime >= 10) {
        entity.updateComponent<PlanetTravelComponent>(CT.PlanetTravel, (t) => ({
          ...t,
          state: 'in_transit',
        }));
      }
      return;
    }

    // For ritual travel, start immediately
    if (travel.travelMethod === 'ritual') {
      entity.updateComponent<PlanetTravelComponent>(CT.PlanetTravel, (t) => ({
        ...t,
        state: 'in_transit',
      }));
    }
  }

  /**
   * Handle entities actively in transit.
   */
  private handleInTransit(
    world: World,
    entity: EntityImpl,
    travel: PlanetTravelComponent,
    tick: number
  ): void {
    // Update progress
    updateTravelProgress(travel, tick);

    // For instant travel, immediately arrive
    if (isInstantTravel(travel) || travel.progress >= 1) {
      entity.updateComponent<PlanetTravelComponent>(CT.PlanetTravel, (t) => ({
        ...t,
        state: 'arriving',
        progress: 1,
      }));
    }
  }

  /**
   * Handle entities arriving at destination.
   */
  private handleArriving(
    world: World,
    entity: EntityImpl,
    travel: PlanetTravelComponent,
    tick: number
  ): void {
    // For portal travel, use the portal
    if (travel.travelMethod === 'portal' && travel.portal) {
      const portalEntity = this.findPortalEntity(world, travel.portal.portalId);

      if (portalEntity) {
        const portal = portalEntity.getComponent<PlanetPortalComponent>(CT.PlanetPortal);
        if (portal) {
          const useResult = usePortal(portal, tick);
          if (!useResult.success) {
            entity.updateComponent<PlanetTravelComponent>(CT.PlanetTravel, (t) => ({
              ...t,
              state: 'failed',
              failureReason: 'Portal unavailable',
            }));
            return;
          }

          // Emit portal instability warning if applicable
          if (useResult.unstable) {
            world.eventBus.emit({
              type: 'portal_unstable',
              source: entity.id,
              data: {
                portalId: portal.portalId,
                entityId: entity.id,
              },
            });
          }
        }
      }
    }

    // Update entity position if exit position is specified
    if (travel.portal?.exitPosition && entity.hasComponent(CT.Position)) {
      entity.updateComponent(CT.Position, (pos: any) => ({
        ...pos,
        x: travel.portal!.exitPosition!.x,
        y: travel.portal!.exitPosition!.y,
      }));
    }

    // Complete the travel
    completePlanetTravel(travel);
  }

  /**
   * Handle completed travel - update location and cleanup.
   */
  private handleComplete(
    world: World,
    entity: EntityImpl,
    travel: PlanetTravelComponent
  ): void {
    // Update planet location
    if (entity.hasComponent(CT.PlanetLocation)) {
      const location = entity.getComponent<PlanetLocationComponent>(CT.PlanetLocation)!;
      const isNewPlanet = !location.discoveredPlanets.includes(travel.destinationPlanetId);

      updatePlanetLocation(
        location,
        travel.destinationPlanetId,
        world.tick,
        travel.travelMethod
      );

      // Emit travel complete event
      world.eventBus.emit({
        type: 'planet_travel_complete',
        source: entity.id,
        data: {
          entityId: entity.id,
          fromPlanetId: travel.originPlanetId,
          toPlanetId: travel.destinationPlanetId,
          travelMethod: travel.travelMethod,
        },
      });

      // Check if this is a new planet discovery
      if (isNewPlanet) {
        world.eventBus.emit({
          type: 'planet_discovered',
          source: entity.id,
          data: {
            entityId: entity.id,
            planetId: travel.destinationPlanetId,
            discoveryMethod: travel.travelMethod,
          },
        });
      }
    }

    // Remove travel component
    entity.removeComponent(CT.PlanetTravel);
  }

  /**
   * Handle failed travel - return to origin or leave stranded.
   */
  private handleFailed(
    world: World,
    entity: EntityImpl,
    travel: PlanetTravelComponent
  ): void {
    // Emit failure event
    world.eventBus.emit({
      type: 'planet_travel_failed',
      source: entity.id,
      data: {
        entityId: entity.id,
        fromPlanetId: travel.originPlanetId,
        toPlanetId: travel.destinationPlanetId,
        reason: travel.failureReason,
      },
    });

    // Remove travel component
    entity.removeComponent(CT.PlanetTravel);
  }

  /**
   * Find portal entity by portal ID.
   */
  private findPortalEntity(world: World, portalId: string): Entity | null {
    const portals = world.query()
      .with(CT.PlanetPortal)
      .executeEntities();

    for (const entity of portals) {
      const portal = entity.getComponent<PlanetPortalComponent>(CT.PlanetPortal);
      if (portal && portal.portalId === portalId) {
        return entity;
      }
    }

    return null;
  }
}

// ============================================================================
// Helper Functions (for external use)
// ============================================================================

/**
 * Initiate portal travel for an entity.
 *
 * @returns true if travel initiated successfully
 */
export function initiatePortalTravel(
  world: World,
  entity: Entity,
  portalId: string
): { success: boolean; reason?: string } {
  const impl = entity as EntityImpl;

  // Find the portal
  const portals = world.query()
    .with(CT.PlanetPortal)
    .executeEntities();

  let portalComponent: PlanetPortalComponent | null = null;
  for (const p of portals) {
    const comp = p.getComponent<PlanetPortalComponent>(CT.PlanetPortal);
    if (comp && comp.portalId === portalId) {
      portalComponent = comp;
      break;
    }
  }

  if (!portalComponent) {
    return { success: false, reason: 'Portal not found' };
  }

  // Check if portal can be used
  const canUse = canUsePortal(portalComponent, world.tick);
  if (!canUse.canUse) {
    return { success: false, reason: canUse.reason };
  }

  // Check entity has PlanetLocationComponent
  const location = impl.getComponent<PlanetLocationComponent>(CT.PlanetLocation);
  if (!location) {
    return { success: false, reason: 'Entity has no planet location' };
  }

  // Check entity is on the same planet as the portal
  if (location.currentPlanetId !== portalComponent.fromPlanetId) {
    return { success: false, reason: 'Entity not on portal planet' };
  }

  // Check entity is not already traveling
  if (impl.hasComponent(CT.PlanetTravel)) {
    return { success: false, reason: 'Entity already traveling' };
  }

  // Add travel component
  const travelComponent = createPortalTravelComponent(
    portalComponent.fromPlanetId,
    portalComponent.toPlanetId,
    portalId,
    world.tick,
    portalComponent.toPosition
  );

  impl.addComponent(travelComponent);

  // Emit travel started event
  world.eventBus.emit({
    type: 'planet_travel_started',
    source: entity.id,
    data: {
      entityId: entity.id,
      fromPlanetId: portalComponent.fromPlanetId,
      toPlanetId: portalComponent.toPlanetId,
      travelMethod: 'portal',
      portalId,
    },
  });

  return { success: true };
}

/**
 * Initiate spacecraft travel for entities.
 *
 * @param entityIds - Entity IDs to travel (must be crew members)
 * @param shipId - Spaceship entity ID
 * @param destinationPlanetId - Target planet
 */
export function initiateSpacecraftTravel(
  world: World,
  entityIds: string[],
  shipId: string,
  destinationPlanetId: string,
  travelDuration: number = 100,
  isBetaSpaceJump: boolean = false
): { success: boolean; reason?: string } {
  // Find the ship
  const ship = world.getEntity(shipId);
  if (!ship) {
    return { success: false, reason: 'Ship not found' };
  }

  const shipComponent = ship.getComponent(CT.Spaceship);
  if (!shipComponent) {
    return { success: false, reason: 'Entity is not a spaceship' };
  }

  // Get origin planet from first entity
  const firstEntityId = entityIds[0];
  if (!firstEntityId) {
    return { success: false, reason: 'No valid entities' };
  }

  const firstEntity = world.getEntity(firstEntityId);
  if (!firstEntity) {
    return { success: false, reason: 'No valid entities' };
  }

  const location = firstEntity.getComponent<PlanetLocationComponent>(CT.PlanetLocation);
  if (!location) {
    return { success: false, reason: 'Entity has no planet location' };
  }

  const originPlanetId = location.currentPlanetId;

  // Add travel component to each entity
  for (const entityId of entityIds) {
    const entity = world.getEntity(entityId);
    if (!entity) continue;

    const impl = entity as EntityImpl;

    // Skip if already traveling
    if (impl.hasComponent(CT.PlanetTravel)) continue;

    const travelComponent = createSpacecraftTravelComponent(
      originPlanetId,
      destinationPlanetId,
      shipId,
      world.tick,
      travelDuration,
      isBetaSpaceJump
    );

    impl.addComponent(travelComponent);
  }

  // Emit travel started event
  world.eventBus.emit({
    type: 'planet_travel_started',
    source: firstEntityId,
    data: {
      entityId: firstEntityId,
      fromPlanetId: originPlanetId,
      toPlanetId: destinationPlanetId,
      travelMethod: 'spacecraft',
      shipId,
      crewCount: entityIds.length,
    },
  });

  return { success: true };
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: PlanetTravelSystem | null = null;

export function getPlanetTravelSystem(): PlanetTravelSystem {
  if (!systemInstance) {
    systemInstance = new PlanetTravelSystem();
  }
  return systemInstance;
}
