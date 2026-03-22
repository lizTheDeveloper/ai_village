/**
 * InterVillageCaravanSystem - Manages trade caravans between villages
 *
 * This system:
 * 1. Spawns caravans on active trade routes when their interval elapses
 * 2. Advances caravan progress toward their destination
 * 3. Resolves bandit encounters based on route safety
 * 4. Delivers cargo to the target village on arrival
 *
 * Priority: 190 (before VillageSummarySystem at 195)
 * Throttle: 100 ticks (5 seconds)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { TradeRouteComponent } from '../components/TradeRouteComponent.js';
import type { InterVillageCaravanComponent } from '../components/InterVillageCaravanComponent.js';
import { createInterVillageCaravanComponent } from '../components/InterVillageCaravanComponent.js';
import type { VillageComponent } from '../components/VillageComponent.js';

/**
 * Progress increment per system update for a caravan.
 * With throttle=100 ticks and a route taking ~12000 ticks, a caravan
 * advances roughly 100/12000 ≈ 0.008 per update.
 * We use travelTimeSeconds approximated via route distance to compute speed.
 */
const TICKS_PER_SECOND = 20;
const CARAVAN_BASE_SPEED_TILES_PER_TICK = 1 / TICKS_PER_SECOND; // 1 tile/second

export class InterVillageCaravanSystem extends BaseSystem {
  public readonly id: SystemId = 'inter_village_caravan';
  public readonly priority: number = 190;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  public readonly activationComponents = [CT.TradeRoute as ComponentType] as const;

  protected readonly throttleInterval: number = 100; // 5 seconds

  private nextCaravanId: number = 1;

  protected onUpdate(ctx: SystemContext): void {
    // Process trade routes: spawn caravans when interval elapses
    const routeEntities = ctx.world
      .query()
      .with(CT.TradeRoute as ComponentType)
      .executeEntities();

    for (const routeEntity of routeEntities) {
      const route = routeEntity.getComponent<TradeRouteComponent>('trade_route');
      if (!route || !route.active) {
        continue;
      }

      const ticksSinceLastCaravan = ctx.tick - route.lastCaravanTick;
      if (ticksSinceLastCaravan >= route.caravanIntervalTicks) {
        this.spawnCaravan(ctx, routeEntity, route);
      }
    }

    // Process in-transit caravans
    const caravanEntities = ctx.world
      .query()
      .with(CT.InterVillageCaravan as ComponentType)
      .executeEntities();

    for (const caravanEntity of caravanEntities) {
      const caravan = caravanEntity.getComponent<InterVillageCaravanComponent>('inter_village_caravan');
      if (!caravan || caravan.status !== 'traveling') {
        continue;
      }

      this.advanceCaravan(ctx, caravanEntity, caravan);
    }
  }

  private spawnCaravan(
    ctx: SystemContext,
    routeEntity: Entity,
    route: TradeRouteComponent
  ): void {
    const caravanId = `caravan_${this.nextCaravanId++}`;
    const ticksToTravel = Math.ceil(route.distance / CARAVAN_BASE_SPEED_TILES_PER_TICK);
    const expectedArrivalTick = ctx.tick + ticksToTravel;

    // Build cargo from route agreement (exports from source)
    const cargo = route.agreement.exports.map((good) => ({
      resourceType: good.resourceType,
      amount: good.amountPerTrip,
    }));

    const caravanComponent = createInterVillageCaravanComponent(
      caravanId,
      route.routeId,
      route.sourceVillageId,
      route.targetVillageId,
      cargo,
      ctx.tick,
      expectedArrivalTick
    );

    // Create a new entity for the caravan
    const caravanEntity = ctx.world.createEntity() as EntityImpl;
    caravanEntity.addComponent(caravanComponent);

    // Update last caravan tick on the route
    (routeEntity as EntityImpl).updateComponent<TradeRouteComponent>('trade_route', (prev) => ({
      ...prev,
      lastCaravanTick: ctx.tick,
    }));
  }

  private advanceCaravan(
    ctx: SystemContext,
    caravanEntity: Entity,
    caravan: InterVillageCaravanComponent
  ): void {
    const totalTicks = caravan.expectedArrivalTick - caravan.departedTick;
    if (totalTicks <= 0) {
      // Degenerate route — arrive immediately
      this.deliverCaravan(ctx, caravanEntity, caravan);
      return;
    }

    const elapsed = ctx.tick - caravan.departedTick;
    const newProgress = Math.min(1, elapsed / totalTicks);

    // Check for bandit encounter (only once per caravan)
    let encounteredBandits = caravan.encounteredBandits;
    let newStatus: InterVillageCaravanComponent['status'] = 'traveling';

    if (!encounteredBandits && newProgress > 0.3 && newProgress < 0.8) {
      // Roll bandit encounter mid-journey
      const routeEntities = ctx.world
        .query()
        .with(CT.TradeRoute as ComponentType)
        .executeEntities();

      const routeEntity = routeEntities.find((e) => {
        const r = e.getComponent<TradeRouteComponent>('trade_route');
        return r?.routeId === caravan.routeId;
      });

      if (routeEntity) {
        const route = routeEntity.getComponent<TradeRouteComponent>('trade_route');
        if (route) {
          const banditRoll = Math.random();
          const dangerChance = 1 - route.safety;
          encounteredBandits = banditRoll < dangerChance;

          if (encounteredBandits) {
            // 50% chance of total loss vs just "attacked" (caravan escapes)
            newStatus = Math.random() < 0.5 ? 'lost' : 'attacked';
          }
        }
      }
    }

    if (newStatus === 'lost') {
      (caravanEntity as EntityImpl).updateComponent<InterVillageCaravanComponent>('inter_village_caravan', (prev) => ({
        ...prev,
        progress: newProgress,
        encounteredBandits: true,
        status: 'lost',
      }));

      ctx.emit('caravan:lost', {
        caravanId: caravan.caravanId,
        routeId: caravan.routeId,
        sourceVillageId: caravan.sourceVillageId,
        targetVillageId: caravan.targetVillageId,
        tick: ctx.tick,
      });
      ctx.world.destroyEntity(caravanEntity.id, 'caravan_lost');
      return;
    }

    if (newProgress >= 1) {
      (caravanEntity as EntityImpl).updateComponent<InterVillageCaravanComponent>('inter_village_caravan', (prev) => ({
        ...prev,
        progress: 1,
        encounteredBandits,
        status: 'arrived',
      }));
      this.deliverCaravan(ctx, caravanEntity, caravan);
      return;
    }

    (caravanEntity as EntityImpl).updateComponent<InterVillageCaravanComponent>('inter_village_caravan', (prev) => ({
      ...prev,
      progress: newProgress,
      encounteredBandits,
      status: newStatus,
    }));
  }

  private deliverCaravan(
    ctx: SystemContext,
    caravanEntity: Entity,
    caravan: InterVillageCaravanComponent
  ): void {
    // Find target village and update its resources
    const villageEntities = ctx.world
      .query()
      .with(CT.Village as ComponentType)
      .executeEntities();

    const targetEntity = villageEntities.find((e) => {
      const v = e.getComponent<VillageComponent>('village');
      return v?.villageId === caravan.targetVillageId;
    });

    if (targetEntity) {
      (targetEntity as EntityImpl).updateComponent<VillageComponent>('village', (prev) => {
        const updatedResources = { ...prev.summary.resources };
        for (const cargo of caravan.cargo) {
          const current = updatedResources[cargo.resourceType] ?? 0;
          updatedResources[cargo.resourceType] = current + cargo.amount;
        }
        return {
          ...prev,
          summary: {
            ...prev.summary,
            resources: updatedResources,
            tradeBalance: prev.summary.tradeBalance + caravan.cargo.reduce((s, c) => s + c.amount, 0),
          },
        };
      });
    }

    ctx.emit('caravan:arrived', {
      caravanId: caravan.caravanId,
      routeId: caravan.routeId,
      sourceVillageId: caravan.sourceVillageId,
      targetVillageId: caravan.targetVillageId,
      cargo: caravan.cargo,
      tick: ctx.tick,
    });
    ctx.world.destroyEntity(caravanEntity.id, 'caravan_delivered');
  }
}
