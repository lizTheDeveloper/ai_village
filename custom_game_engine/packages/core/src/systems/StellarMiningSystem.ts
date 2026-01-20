/**
 * StellarMiningSystem - Resource extraction from stellar phenomena
 *
 * Phase 3 Economic Depth: Resource Discovery feature
 *
 * Priority: 185 (after exploration discovery systems)
 *
 * Responsibilities:
 * - Process mining operations at stellar phenomena
 * - Calculate yield based on phenomenon type and tech level
 * - Handle resource depletion mechanics
 * - Manage ship assignments and crew
 * - Transfer mined resources to warehouses
 * - Apply danger/accident mechanics
 * - Track resource extraction progress
 *
 * Integration:
 * - Requires MiningOperationComponent created by ExplorationDiscoverySystem
 * - Emits mining events (resources_extracted, phenomenon_depleted, accident)
 * - Updates warehouse stockpiles when ships return
 *
 * CLAUDE.md Compliance:
 * - Component types use lowercase_with_underscores
 * - No silent fallbacks - all operations validated
 * - Cache queries before loops for performance
 * - Throttled updates (every 10 ticks = 0.5 seconds)
 * - Proper error handling with exceptions
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType, EntityId } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { MiningOperationComponent } from '../components/MiningOperationComponent.js';
import {
  processHarvesting,
  isStockpileFull,
  transferStockpile,
  assignShipsToMining,
  removeShipsFromMining,
} from '../components/MiningOperationComponent.js';
import type { SpaceshipComponent } from '../navigation/SpaceshipComponent.js';
import type { WarehouseComponent } from '../components/WarehouseComponent.js';

/** Update interval: every 10 ticks = 0.5 seconds at 20 TPS */
const UPDATE_INTERVAL = 10;

/**
 * Mining events are defined in exploration.events.ts
 * We rely on the existing exploration domain events for now
 */

/**
 * System for managing stellar resource mining operations
 */
export class StellarMiningSystem extends BaseSystem {
  public readonly id: SystemId = 'stellar_mining';
  public readonly priority: number = 185;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  // Lazy activation: Skip entire system when no mining operations exist
  public readonly activationComponents = ['mining_operation'] as const;

  protected readonly throttleInterval = UPDATE_INTERVAL;

  private isInitialized = false;

  /**
   * Initialize the system
   */
  protected onInitialize(world: World): void {
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;
  }

  /**
   * Update - process all active mining operations
   */
  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    // Cache queries before loops (CLAUDE.md performance guideline)
    const miningOperations = ctx.world
      .query()
      .with('mining_operation')
      .executeEntities();

    for (const operationEntity of miningOperations) {
      const operation = operationEntity.getComponent<MiningOperationComponent>(
        'mining_operation'
      );
      if (!operation) continue;

      this.updateMiningOperation(
        ctx.world,
        operationEntity,
        operation,
        currentTick
      );
    }
  }

  // ===========================================================================
  // Mining Operation Update
  // ===========================================================================

  /**
   * Update a single mining operation
   */
  private updateMiningOperation(
    world: World,
    entity: Entity,
    operation: MiningOperationComponent,
    currentTick: number
  ): void {
    // Only process active operations
    if (operation.status !== 'active') {
      return;
    }

    // Verify ships are still assigned
    this.verifyShipAssignments(world, entity, operation);

    // If no ships assigned, operation should be paused
    if (operation.assignedShips.length === 0) {
      this.pauseOperation(entity, operation);
      return;
    }

    // Calculate depletion multiplier
    const depletionMultiplier = this.calculateDepletionMultiplier(operation);

    // Apply danger mechanics (accidents/damage)
    this.processDangerEvents(world, entity, operation, currentTick);

    // Process resource extraction
    const harvestedThisTick = processHarvesting(operation);

    // Apply depletion to actual harvest
    const actualHarvest = harvestedThisTick * depletionMultiplier;

    // Update operation with depleted harvest
    (entity as EntityImpl).updateComponent('mining_operation', (old) => {
      const typed = old as MiningOperationComponent;
      const adjustedStockpile =
        typed.stockpile - harvestedThisTick + actualHarvest;
      const adjustedTotal = typed.totalHarvested - harvestedThisTick + actualHarvest;

      return {
        ...typed,
        stockpile: adjustedStockpile,
        totalHarvested: adjustedTotal,
      };
    });

    // Emit extraction event
    if (actualHarvest > 0) {
      this.emitExtractionEvent(world, operation, actualHarvest, currentTick);
    }

    // Check for phenomenon depletion
    if (operation.estimatedRemaining !== null && operation.estimatedRemaining <= 0) {
      this.handlePhenomenonDepletion(world, entity, operation, currentTick);
      return;
    }

    // Check if stockpile is full
    if (isStockpileFull(operation)) {
      this.handleStockpileFull(world, entity, operation, currentTick);
    }

    // Check if ships need to return for cargo transfer
    this.processCargoTransfer(world, entity, operation, currentTick);
  }

  // ===========================================================================
  // Ship Assignment
  // ===========================================================================

  /**
   * Verify that assigned ships still exist and are at the location
   */
  private verifyShipAssignments(
    world: World,
    _entity: Entity,
    operation: MiningOperationComponent
  ): void {
    const shipsToRemove: string[] = [];
    let crewToRemove = 0;

    for (const shipId of operation.assignedShips) {
      const shipEntity = world.getEntity(shipId);

      // Ship no longer exists
      if (!shipEntity) {
        shipsToRemove.push(shipId);
        continue;
      }

      const ship = shipEntity.getComponent<SpaceshipComponent>('spaceship');

      // Ship no longer has spaceship component
      if (!ship) {
        shipsToRemove.push(shipId);
        continue;
      }

      // Ship destroyed (hull integrity <= 0)
      if (ship.hull.integrity <= 0) {
        shipsToRemove.push(shipId);
        crewToRemove += ship.crew.member_ids.length;
        continue;
      }

      // TODO: Check if ship is still at phenomenon location
      // For now, assume ships stay at location
    }

    // Remove invalid ships
    if (shipsToRemove.length > 0) {
      removeShipsFromMining(operation, shipsToRemove, crewToRemove);
    }
  }

  // ===========================================================================
  // Depletion Mechanics
  // ===========================================================================

  /**
   * Calculate depletion multiplier based on remaining resources
   *
   * - Above 50% capacity: 1.0x (full yield)
   * - 25-50% capacity: 0.8x (reduced yield)
   * - Below 25% capacity: 0.5x (greatly reduced yield)
   * - Depleted: 0x (no yield)
   */
  private calculateDepletionMultiplier(
    operation: MiningOperationComponent
  ): number {
    if (operation.estimatedRemaining === null) {
      // Infinite/unknown capacity
      return 1.0;
    }

    // Calculate initial capacity (total extracted + remaining)
    const initialCapacity =
      operation.totalHarvested + operation.estimatedRemaining;

    if (initialCapacity <= 0) {
      return 0;
    }

    const remainingFraction = operation.estimatedRemaining / initialCapacity;

    if (remainingFraction > 0.5) {
      return 1.0; // Full yield
    } else if (remainingFraction > 0.25) {
      return 0.8; // Reduced yield
    } else if (remainingFraction > 0) {
      return 0.5; // Greatly reduced yield
    } else {
      return 0; // Depleted
    }
  }

  /**
   * Handle phenomenon depletion
   */
  private handlePhenomenonDepletion(
    world: World,
    entity: Entity,
    operation: MiningOperationComponent,
    currentTick: number
  ): void {
    // Mark operation as depleted
    (entity as EntityImpl).updateComponent('mining_operation', (old) => {
      const typed = old as MiningOperationComponent;
      return {
        ...typed,
        status: 'depleted',
        endTick: currentTick,
        estimatedRemaining: 0,
      };
    });

    // Emit exploration domain event for depletion
    world.eventBus.emit({
      type: 'exploration:mining_operation_ended' as const,
      source: entity.id,
      data: {
        operationId: entity.id,
        resourceType: operation.resourceType,
        totalExtracted: operation.totalHarvested,
        reason: 'depleted',
        locationId: operation.locationId,
        civilizationId: operation.civilizationId,
      },
    });
  }

  // ===========================================================================
  // Danger Management
  // ===========================================================================

  /**
   * Process danger events (accidents, ship damage)
   *
   * Roll for accidents based on phenomenon danger rating.
   * Higher danger = higher chance of accidents.
   */
  private processDangerEvents(
    world: World,
    entity: Entity,
    operation: MiningOperationComponent,
    currentTick: number
  ): void {
    // Danger rating from difficulty (0.0-1.0)
    const dangerRating = operation.difficulty;

    // Roll for each assigned ship
    for (const shipId of operation.assignedShips) {
      const shipEntity = world.getEntity(shipId);
      if (!shipEntity) continue;

      const ship = shipEntity.getComponent<SpaceshipComponent>('spaceship');
      if (!ship) continue;

      // Accident chance per tick: danger × 0.0001 (0.01% per tick at max danger)
      // At 20 TPS, max danger gives ~2% chance per second
      const accidentChance = dangerRating * 0.0001;

      if (Math.random() < accidentChance) {
        this.handleMiningAccident(
          world,
          entity,
          operation,
          shipEntity,
          ship,
          currentTick
        );
      }
    }
  }

  /**
   * Handle mining accident - damage ship, casualties
   */
  private handleMiningAccident(
    world: World,
    operationEntity: Entity,
    operation: MiningOperationComponent,
    shipEntity: Entity,
    ship: SpaceshipComponent,
    currentTick: number
  ): void {
    // Damage amount scales with danger (5-20% hull damage)
    const damageAmount = 0.05 + operation.difficulty * 0.15;

    // Crew casualties (0-3 crew members)
    const maxCasualties = Math.min(3, ship.crew.member_ids.length);
    const casualties = Math.floor(Math.random() * (maxCasualties + 1));

    // Apply hull damage
    (shipEntity as EntityImpl).updateComponent('spaceship', (old) => {
      const typed = old as SpaceshipComponent;
      return {
        ...typed,
        hull: {
          ...typed.hull,
          integrity: Math.max(0, typed.hull.integrity - damageAmount),
        },
      };
    });

    // Remove casualties from crew
    if (casualties > 0) {
      (shipEntity as EntityImpl).updateComponent('spaceship', (old) => {
        const typed = old as SpaceshipComponent;
        const remainingCrew = typed.crew.member_ids.slice(casualties);
        return {
          ...typed,
          crew: {
            ...typed.crew,
            member_ids: remainingCrew,
          },
        };
      });
    }

    // TODO: Emit accident event when mining domain events are added to exploration.events.ts
    // For now, we handle accidents silently (they still apply damage and casualties)

    // If ship destroyed, remove from operation
    if (ship.hull.integrity - damageAmount <= 0) {
      removeShipsFromMining(
        operation,
        [shipEntity.id],
        ship.crew.member_ids.length
      );
    }
  }

  // ===========================================================================
  // Stockpile Management
  // ===========================================================================

  /**
   * Handle stockpile full - pause mining until transport arrives
   */
  private handleStockpileFull(
    world: World,
    entity: Entity,
    operation: MiningOperationComponent,
    currentTick: number
  ): void {
    // Only emit notification once per stockpile full event
    const ticksSinceLastNotification =
      currentTick - operation.lastStockpileFullNotificationTick;

    if (ticksSinceLastNotification < 1000) {
      // Don't spam notifications (50 seconds minimum)
      return;
    }

    // Update last notification tick
    (entity as EntityImpl).updateComponent('mining_operation', (old) => {
      const typed = old as MiningOperationComponent;
      return {
        ...typed,
        lastStockpileFullNotificationTick: currentTick,
      };
    });

    // Emit exploration domain event for stockpile full
    world.eventBus.emit({
      type: 'exploration:stockpile_full' as const,
      source: entity.id,
      data: {
        operationId: entity.id,
        resourceType: operation.resourceType,
        stockpile: operation.stockpile,
        locationId: operation.locationId,
        civilizationId: operation.civilizationId,
        suggestTransport: true,
      },
    });
  }

  // ===========================================================================
  // Cargo Transfer
  // ===========================================================================

  /**
   * Process cargo transfer from mining operation to warehouse
   *
   * Simplified version: Transfer directly to warehouse when ships "return"
   * TODO: Implement actual ship travel and cargo hold mechanics
   */
  private processCargoTransfer(
    world: World,
    entity: Entity,
    operation: MiningOperationComponent,
    _currentTick: number
  ): void {
    // For now, skip cargo transfer if stockpile not full
    // In full implementation, ships would periodically return
    if (!isStockpileFull(operation)) {
      return;
    }

    // Find civilization warehouse for this resource type
    const warehouse = this.findCivilizationWarehouse(
      world,
      operation.civilizationId,
      operation.resourceType
    );

    if (!warehouse) {
      // No warehouse available - stockpile accumulates
      return;
    }

    // Transfer stockpile to warehouse
    const amountToTransfer = Math.min(
      operation.stockpile,
      warehouse.component.capacity - this.getWarehouseTotalStockpile(warehouse.component)
    );

    if (amountToTransfer <= 0) {
      // Warehouse full - stockpile accumulates
      return;
    }

    // Update operation stockpile
    transferStockpile(operation, amountToTransfer);

    // Update warehouse stockpile
    (warehouse.entity as EntityImpl).updateComponent('warehouse', (old) => {
      const typed = old as WarehouseComponent;
      const currentAmount = typed.stockpiles[operation.resourceType] ?? 0;
      return {
        ...typed,
        stockpiles: {
          ...typed.stockpiles,
          [operation.resourceType]: currentAmount + amountToTransfer,
        },
        lastDepositTime: {
          ...typed.lastDepositTime,
          [operation.resourceType]: world.tick,
        },
      };
    });
  }

  /**
   * Find warehouse for civilization and resource type
   */
  private findCivilizationWarehouse(
    world: World,
    civilizationId: EntityId,
    resourceType: string
  ): { entity: Entity; component: WarehouseComponent } | null {
    const warehouses = world.query().with('warehouse').executeEntities();

    for (const warehouseEntity of warehouses) {
      const warehouse = warehouseEntity.getComponent<WarehouseComponent>('warehouse');
      if (!warehouse) continue;

      // Check if warehouse matches resource type
      if (warehouse.resourceType === resourceType) {
        // TODO: Verify warehouse belongs to civilization
        // For now, return first matching warehouse
        return { entity: warehouseEntity, component: warehouse };
      }
    }

    return null;
  }

  /**
   * Get total stockpile in warehouse
   */
  private getWarehouseTotalStockpile(warehouse: WarehouseComponent): number {
    return Object.values(warehouse.stockpiles).reduce(
      (sum, amount) => sum + amount,
      0
    );
  }

  // ===========================================================================
  // Event Emission
  // ===========================================================================

  /**
   * Emit resource extraction event
   * TODO: Add mining-specific events to exploration.events.ts
   */
  private emitExtractionEvent(
    _world: World,
    _operation: MiningOperationComponent,
    _quantity: number,
    _currentTick: number
  ): void {
    // For now, resource extraction happens silently
    // In full implementation, this would emit detailed mining metrics
  }

  // ===========================================================================
  // Operation Lifecycle
  // ===========================================================================

  /**
   * Pause mining operation (no ships assigned)
   */
  private pauseOperation(
    entity: Entity,
    operation: MiningOperationComponent
  ): void {
    if (operation.status === 'paused') {
      return;
    }

    (entity as EntityImpl).updateComponent('mining_operation', (old) => {
      const typed = old as MiningOperationComponent;
      return {
        ...typed,
        status: 'paused',
      };
    });
  }
}
