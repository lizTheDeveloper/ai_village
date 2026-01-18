/**
 * ShippingLaneSystem - Manages physical trade routes and caravan movement
 *
 * Phase 2 of Grand Strategy Abstraction Layer (07-TRADE-LOGISTICS.md)
 *
 * Priority: 160 (after TradeAgreementSystem at 26)
 *
 * Responsibilities:
 * - Update lane traffic and flow rates
 * - Move caravans along lanes (progress 0.0 → 1.0)
 * - Check for hazard encounters (pirates, weather, monsters)
 * - Calculate safety ratings based on active hazards
 * - Emit events for caravan lifecycle (departed, arrived, hazard_encountered, blocked)
 * - Remove expired hazards
 * - Update lane status based on usage
 *
 * Integration:
 * - Works with TradeAgreementSystem (references agreementId)
 * - Updates flow rates based on active caravans
 * - Handles passage crossings (references PassageComponent)
 *
 * CLAUDE.md Compliance:
 * - Component types use lowercase_with_underscores
 * - No silent fallbacks - all hazard encounters throw events
 * - Cache queries before loops for performance
 * - Throttled updates (every 20 ticks = 1 second)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { ShippingLaneComponent, LaneHazard } from '../components/ShippingLaneComponent.js';
import type { TradeCaravanComponent } from '../components/TradeCaravanComponent.js';

/** Update interval: every 20 ticks = 1 second at 20 TPS */
const UPDATE_INTERVAL = 20;

/**
 * System for managing shipping lanes and trade caravans
 */
export class ShippingLaneSystem extends BaseSystem {
  public readonly id: SystemId = 'shipping_lane';
  public readonly priority: number = 160;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  protected readonly throttleInterval = UPDATE_INTERVAL;

  private isInitialized = false;

  /**
   * Initialize the system
   */
  protected onInitialize(_world: World): void {
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;
  }

  /**
   * Update - process shipping lanes and move caravans
   */
  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    // Cache queries before loops (CLAUDE.md performance guideline)
    const laneEntities = ctx.world.query().with('shipping_lane').executeEntities();
    const caravanEntities = ctx.world.query().with('trade_caravan').executeEntities();

    // Process each shipping lane
    for (const laneEntity of laneEntities) {
      const lane = laneEntity.getComponent<ShippingLaneComponent>('shipping_lane');
      if (!lane) continue;

      this.updateLane(ctx.world, laneEntity, lane, currentTick);
    }

    // Process each caravan
    for (const caravanEntity of caravanEntities) {
      const caravan = caravanEntity.getComponent<TradeCaravanComponent>('trade_caravan');
      if (!caravan) continue;

      this.updateCaravan(ctx.world, caravanEntity, caravan, currentTick);
    }
  }

  // ===========================================================================
  // Lane Management
  // ===========================================================================

  /**
   * Update a shipping lane's state
   */
  private updateLane(
    world: World,
    entity: Entity,
    lane: ShippingLaneComponent,
    currentTick: number
  ): void {
    let needsUpdate = false;
    let updatedLane = { ...lane };

    // Remove expired hazards
    const activeHazards = lane.hazards.filter((h) => {
      if (h.activeUntilTick === undefined) return true;
      return h.activeUntilTick > currentTick;
    });

    if (activeHazards.length !== lane.hazards.length) {
      updatedLane.hazards = activeHazards;
      needsUpdate = true;
    }

    // Recalculate safety rating based on active hazards
    const newSafetyRating = this.calculateSafetyRating(activeHazards);
    if (Math.abs(newSafetyRating - lane.safetyRating) > 0.01) {
      updatedLane.safetyRating = newSafetyRating;
      needsUpdate = true;
    }

    // Update flow rate based on active caravans
    const newFlowRate = this.calculateFlowRate(lane, world);
    if (Math.abs(newFlowRate - lane.flowRate) > 0.01) {
      updatedLane.flowRate = newFlowRate;
      needsUpdate = true;
    }

    // Check if lane should be marked as abandoned (no use in 10 minutes)
    const ticksSinceLastUse = currentTick - lane.lastUsedTick;
    const ABANDON_THRESHOLD = 12000; // 10 minutes at 20 TPS
    if (lane.status === 'active' && ticksSinceLastUse > ABANDON_THRESHOLD) {
      updatedLane.status = 'abandoned';
      needsUpdate = true;

      world.eventBus.emit({
        type: 'lane:abandoned' as const,
        source: entity.id,
        data: { laneId: lane.laneId, ticksSinceLastUse },
      });
    }

    if (needsUpdate) {
      (entity as EntityImpl).updateComponent('shipping_lane', () => updatedLane);
    }
  }

  /**
   * Calculate safety rating from hazards
   * 1.0 = perfectly safe, 0.0 = extremely dangerous
   */
  private calculateSafetyRating(hazards: LaneHazard[]): number {
    if (hazards.length === 0) return 1.0;

    // Each hazard reduces safety by its severity
    const totalDanger = hazards.reduce((sum, h) => sum + h.severity, 0);

    // Clamp between 0 and 1
    return Math.max(0, 1.0 - totalDanger);
  }

  /**
   * Calculate current flow rate based on active caravans
   */
  private calculateFlowRate(lane: ShippingLaneComponent, world: World): number {
    if (lane.activeCaravans.length === 0) return 0;

    let totalFlow = 0;

    for (const caravanId of lane.activeCaravans) {
      const caravanEntity = world.getEntityById(caravanId);
      if (!caravanEntity) continue;

      const caravan = caravanEntity.getComponent<TradeCaravanComponent>('trade_caravan');
      if (!caravan) continue;

      // Flow contribution = cargoValue * speed (goods/tick)
      totalFlow += caravan.cargoValue * caravan.speed;
    }

    return totalFlow;
  }

  // ===========================================================================
  // Caravan Movement
  // ===========================================================================

  /**
   * Update a caravan's position and check for events
   */
  private updateCaravan(
    world: World,
    entity: Entity,
    caravan: TradeCaravanComponent,
    currentTick: number
  ): void {
    // Skip if caravan has arrived or is lost
    if (caravan.status === 'arrived' || caravan.status === 'lost') {
      return;
    }

    let needsUpdate = false;
    let updatedCaravan = { ...caravan };

    // Get the lane this caravan is traveling on
    const laneEntity = this.getLaneEntity(world, caravan.laneId);
    if (!laneEntity) {
      // Lane doesn't exist - mark caravan as lost
      updatedCaravan.status = 'lost';
      needsUpdate = true;

      world.eventBus.emit({
        type: 'lane:caravan_lost' as const,
        source: entity.id,
        data: { caravanId: caravan.caravanId, reason: 'lane_not_found' },
      });

      (entity as EntityImpl).updateComponent('trade_caravan', () => updatedCaravan);
      return;
    }

    const lane = laneEntity.getComponent<ShippingLaneComponent>('shipping_lane');
    if (!lane) {
      updatedCaravan.status = 'lost';
      needsUpdate = true;

      world.eventBus.emit({
        type: 'lane:caravan_lost' as const,
        source: entity.id,
        data: { caravanId: caravan.caravanId, reason: 'lane_component_missing' },
      });

      (entity as EntityImpl).updateComponent('trade_caravan', () => updatedCaravan);
      return;
    }

    // Check for lane blockage
    if (lane.status === 'blocked') {
      if (caravan.status !== 'delayed') {
        updatedCaravan.status = 'delayed';
        needsUpdate = true;

        world.eventBus.emit({
          type: 'lane:blocked' as const,
          source: entity.id,
          data: { laneId: lane.laneId, caravanId: caravan.caravanId },
        });
      }

      if (needsUpdate) {
        (entity as EntityImpl).updateComponent('trade_caravan', () => updatedCaravan);
      }
      return;
    }

    // Resume if was delayed
    if (caravan.status === 'delayed' && lane.status === 'active') {
      updatedCaravan.status = 'traveling';
      needsUpdate = true;
    }

    // Check for hazard encounters
    const hazardResult = this.checkHazardEncounter(lane, caravan, world);
    if (hazardResult.encountered) {
      updatedCaravan.status = hazardResult.outcome === 'destroyed' ? 'lost' : 'attacked';
      needsUpdate = true;

      world.eventBus.emit({
        type: 'lane:hazard_encountered' as const,
        source: entity.id,
        data: {
          caravanId: caravan.caravanId,
          laneId: lane.laneId,
          hazardType: hazardResult.hazardType,
          outcome: hazardResult.outcome,
        },
      });

      if (hazardResult.outcome === 'destroyed') {
        (entity as EntityImpl).updateComponent('trade_caravan', () => updatedCaravan);
        return;
      }
    }

    // Move caravan forward
    const newProgress = Math.min(1.0, caravan.progress + caravan.speed);
    if (newProgress !== caravan.progress) {
      updatedCaravan.progress = newProgress;
      needsUpdate = true;

      // Check if arrived
      if (newProgress >= 1.0) {
        updatedCaravan.status = 'arrived';

        world.eventBus.emit({
          type: 'lane:caravan_arrived' as const,
          source: entity.id,
          data: {
            caravanId: caravan.caravanId,
            laneId: lane.laneId,
            agreementId: caravan.agreementId,
            cargo: caravan.cargo,
            destinationId: lane.destinationId,
          },
        });

        // Update lane's last used tick
        (laneEntity as EntityImpl).updateComponent('shipping_lane', (oldLane) => ({
          ...oldLane,
          lastUsedTick: currentTick,
          activeCaravans: oldLane.activeCaravans.filter((id) => id !== caravan.caravanId),
        }));
      }
    }

    if (needsUpdate) {
      (entity as EntityImpl).updateComponent('trade_caravan', () => updatedCaravan);
    }
  }

  /**
   * Check if caravan encounters a hazard
   */
  private checkHazardEncounter(
    lane: ShippingLaneComponent,
    caravan: TradeCaravanComponent,
    _world: World
  ): {
    encountered: boolean;
    hazardType?: LaneHazard['type'];
    outcome?: 'survived' | 'damaged' | 'destroyed';
  } {
    if (lane.hazards.length === 0) {
      return { encountered: false };
    }

    // Roll for encounter (based on safety rating)
    const encounterChance = 1.0 - lane.safetyRating;
    if (Math.random() > encounterChance) {
      return { encountered: false };
    }

    // Pick a random hazard
    const hazard = lane.hazards[Math.floor(Math.random() * lane.hazards.length)];
    if (!hazard) {
      return { encountered: false };
    }

    // Determine outcome based on protection
    const hasEscort = caravan.escortShipIds.length > 0;
    const hasGuards = caravan.guardAgentIds.length > 0;

    // Simplified combat resolution
    if (hasEscort || hasGuards) {
      // Protected caravans have better survival odds
      const survivalChance = hasEscort ? 0.8 : 0.6;
      if (Math.random() < survivalChance) {
        return { encountered: true, hazardType: hazard.type, outcome: 'survived' };
      } else {
        return { encountered: true, hazardType: hazard.type, outcome: 'damaged' };
      }
    } else {
      // Unprotected caravans are vulnerable
      const destroyChance = hazard.severity;
      if (Math.random() < destroyChance) {
        return { encountered: true, hazardType: hazard.type, outcome: 'destroyed' };
      } else {
        return { encountered: true, hazardType: hazard.type, outcome: 'damaged' };
      }
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Get lane entity by lane ID
   */
  private getLaneEntity(world: World, laneId: string): Entity | undefined {
    const lanes = world.query().with('shipping_lane').executeEntities();
    return lanes.find((e) => {
      const lane = e.getComponent<ShippingLaneComponent>('shipping_lane');
      return lane?.laneId === laneId;
    });
  }

  // ===========================================================================
  // Public API (for TradeAgreementSystem integration)
  // ===========================================================================

  /**
   * Create a new caravan for a trade agreement
   */
  public createCaravan(
    world: World,
    laneId: string,
    agreementId: string,
    cargo: Array<{ itemId: string; quantity: number }>,
    cargoValue: number
  ): string {
    const lane = this.getLaneEntity(world, laneId);
    if (!lane) {
      throw new Error(`Cannot create caravan: lane ${laneId} not found`);
    }

    const laneComp = lane.getComponent<ShippingLaneComponent>('shipping_lane');
    if (!laneComp) {
      throw new Error(`Cannot create caravan: lane ${laneId} missing component`);
    }

    // Create caravan entity
    const caravanId = `caravan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate speed based on lane distance and travel time
    const speed = 1.0 / laneComp.travelTimeTicks;

    const caravan: TradeCaravanComponent = {
      type: 'trade_caravan',
      caravanId,
      laneId,
      agreementId,
      progress: 0.0,
      speed,
      cargo,
      cargoValue,
      escortShipIds: [],
      guardAgentIds: [],
      status: 'traveling',
      departedTick: world.tick,
      expectedArrivalTick: world.tick + laneComp.travelTimeTicks,
    };

    const caravanEntity = world.createEntity();
    (caravanEntity as EntityImpl).addComponent(caravan);

    // Update lane to track this caravan
    (lane as EntityImpl).updateComponent('shipping_lane', (oldLane) => ({
      ...oldLane,
      activeCaravans: [...oldLane.activeCaravans, caravanId],
      lastUsedTick: world.tick,
    }));

    // Emit departure event
    world.eventBus.emit({
      type: 'lane:caravan_departed' as const,
      source: caravanEntity.id,
      data: {
        caravanId,
        laneId,
        agreementId,
        cargo,
        originId: laneComp.originId,
      },
    });

    return caravanId;
  }

  /**
   * Add hazard to a shipping lane
   */
  public addHazard(
    world: World,
    laneId: string,
    hazard: LaneHazard
  ): { success: boolean; reason?: string } {
    const laneEntity = this.getLaneEntity(world, laneId);
    if (!laneEntity) {
      return { success: false, reason: `Lane ${laneId} not found` };
    }

    (laneEntity as EntityImpl).updateComponent('shipping_lane', (lane) => ({
      ...lane,
      hazards: [...lane.hazards, hazard],
    }));

    return { success: true };
  }

  /**
   * Remove hazard from a shipping lane
   */
  public removeHazard(
    world: World,
    laneId: string,
    hazardIndex: number
  ): { success: boolean; reason?: string } {
    const laneEntity = this.getLaneEntity(world, laneId);
    if (!laneEntity) {
      return { success: false, reason: `Lane ${laneId} not found` };
    }

    (laneEntity as EntityImpl).updateComponent('shipping_lane', (lane) => {
      const newHazards = [...lane.hazards];
      if (hazardIndex < 0 || hazardIndex >= newHazards.length) {
        throw new Error(`Invalid hazard index: ${hazardIndex}`);
      }
      newHazards.splice(hazardIndex, 1);
      return { ...lane, hazards: newHazards };
    });

    return { success: true };
  }
}
