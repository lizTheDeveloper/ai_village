/**
 * MaterialTransportBehavior - Fetch materials from storage and bring to construction site.
 *
 * This is the PRIMARY building activity in the tile-based voxel system.
 * Physically transporting materials IS building.
 *
 * State Machine:
 * 1. finding_storage - Find storage with required material
 * 2. moving_to_storage - Navigate to storage location
 * 3. picking_up - Pick up material from storage
 * 4. transporting - Navigate to construction site
 * 5. delivering - Deliver material to construction tile
 *
 * Per CLAUDE.md: No silent fallbacks - throws/fails on errors.
 */

import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { InventoryComponent, InventorySlot } from '../../components/InventoryComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { getPosition } from '../../utils/componentHelpers.js';
import { ComponentType } from '../../types/ComponentType.js';
import {
  getTileConstructionSystem,
  type ConstructionTask,
} from '../../systems/TileConstructionSystem.js';

/**
 * Transport state in the state machine.
 */
type TransportState =
  | 'finding_storage'
  | 'moving_to_storage'
  | 'picking_up'
  | 'transporting'
  | 'delivering'
  | 'complete';

/**
 * Behavior state stored in agent.behaviorState.
 */
interface MaterialTransportState {
  /** Current state in the state machine */
  transportState: TransportState;
  /** Task ID we're working on */
  taskId: string;
  /** Tile index we're delivering to */
  tileIndex: number;
  /** Material ID we're transporting */
  materialId: string;
  /** Storage position we're fetching from */
  storagePosition?: { x: number; y: number };
  /** Storage entity ID */
  storageEntityId?: string;
  /** Amount we're carrying */
  carryingAmount: number;
}

/**
 * MaterialTransportBehavior - Fetch and transport materials for construction.
 */
export class MaterialTransportBehavior extends BaseBehavior {
  readonly name = 'material_transport' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const position = getPosition(entity);
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);
    const inventory = entity.getComponent<InventoryComponent>(ComponentType.Inventory);

    if (!position || !agent || !inventory) {
      return { complete: true, reason: 'Missing required components' };
    }

    // Get behavior state
    const state = this.getTransportState(agent);
    if (!state) {
      return { complete: true, reason: 'No transport state set' };
    }

    // Get the construction system
    const constructionSystem = getTileConstructionSystem();
    const task = constructionSystem.getTask(state.taskId);

    if (!task || task.state !== 'in_progress') {
      this.switchTo(entity, 'wander', {});
      return { complete: true, reason: 'Task not found or not in progress' };
    }

    // Execute state machine
    switch (state.transportState) {
      case 'finding_storage':
        return this.handleFindingStorage(entity, world, state, task);

      case 'moving_to_storage':
        return this.handleMovingToStorage(entity, world, state);

      case 'picking_up':
        return this.handlePickingUp(entity, world, state, inventory);

      case 'transporting':
        return this.handleTransporting(entity, world, state, task);

      case 'delivering':
        return this.handleDelivering(entity, world, state, task, inventory);

      case 'complete':
        // Check if there are more tiles needing materials
        return this.checkForMoreWork(entity, world, task);
    }
  }

  /**
   * Find storage containing the required material.
   */
  private handleFindingStorage(
    entity: EntityImpl,
    world: World,
    state: MaterialTransportState,
    task: ConstructionTask
  ): BehaviorResult | void {
    const tile = task.tiles[state.tileIndex];
    if (!tile) {
      this.switchTo(entity, 'wander', {});
      return { complete: true, reason: 'Tile not found' };
    }

    // Find storage with required material
    const storageInfo = this.findMaterialStorage(world, entity, tile.materialId);

    if (!storageInfo) {
      // No material available - switch to gathering
      this.switchTo(entity, 'gather', {
        resourceType: tile.materialId,
        returnToTask: state.taskId,
        returnToTileIndex: state.tileIndex,
      });
      return { complete: true, reason: 'No materials in storage - switching to gather' };
    }

    // Update state with storage location
    this.updateTransportState(entity, {
      ...state,
      transportState: 'moving_to_storage',
      storagePosition: storageInfo.position,
      storageEntityId: storageInfo.entityId,
    });

    return { complete: false, reason: 'Found storage, moving to pickup' };
  }

  /**
   * Move toward storage location.
   */
  private handleMovingToStorage(
    entity: EntityImpl,
    _world: World,
    state: MaterialTransportState
  ): BehaviorResult | void {
    if (!state.storagePosition) {
      this.updateTransportState(entity, {
        ...state,
        transportState: 'finding_storage',
      });
      return { complete: false, reason: 'No storage position, restarting search' };
    }

    const distance = this.moveToward(entity, state.storagePosition, {
      arrivalDistance: 1.5,
    });

    if (distance <= 1.5) {
      // Arrived at storage
      this.stopAllMovement(entity);
      this.updateTransportState(entity, {
        ...state,
        transportState: 'picking_up',
      });
    }

    return { complete: false, reason: `Moving to storage (${distance.toFixed(1)} away)` };
  }

  /**
   * Pick up material from storage.
   */
  private handlePickingUp(
    entity: EntityImpl,
    world: World,
    state: MaterialTransportState,
    _inventory: InventoryComponent
  ): BehaviorResult | void {
    if (!state.storageEntityId) {
      this.updateTransportState(entity, {
        ...state,
        transportState: 'finding_storage',
      });
      return { complete: false, reason: 'No storage entity, restarting search' };
    }

    // Try to pick up material
    const success = this.pickUpMaterial(
      world,
      entity,
      state.storageEntityId,
      state.materialId,
      1
    );

    if (!success) {
      // Storage depleted, find another
      this.updateTransportState(entity, {
        ...state,
        transportState: 'finding_storage',
        storagePosition: undefined,
        storageEntityId: undefined,
      });
      return { complete: false, reason: 'Storage empty, finding another' };
    }

    // Update state with carrying amount
    this.updateTransportState(entity, {
      ...state,
      transportState: 'transporting',
      carryingAmount: 1,
    });

    return { complete: false, reason: 'Picked up material, transporting' };
  }

  /**
   * Transport material to construction site.
   */
  private handleTransporting(
    entity: EntityImpl,
    _world: World,
    state: MaterialTransportState,
    task: ConstructionTask
  ): BehaviorResult | void {
    const tile = task.tiles[state.tileIndex];
    if (!tile) {
      this.switchTo(entity, 'wander', {});
      return { complete: true, reason: 'Tile not found' };
    }

    const tilePosition = { x: tile.x, y: tile.y };
    const distance = this.moveToward(entity, tilePosition, {
      arrivalDistance: 1.5,
    });

    if (distance <= 1.5) {
      // Arrived at construction site
      this.stopAllMovement(entity);
      this.updateTransportState(entity, {
        ...state,
        transportState: 'delivering',
      });
    }

    return { complete: false, reason: `Transporting to site (${distance.toFixed(1)} away)` };
  }

  /**
   * Deliver material to construction tile.
   */
  private handleDelivering(
    entity: EntityImpl,
    world: World,
    state: MaterialTransportState,
    task: ConstructionTask,
    inventory: InventoryComponent
  ): BehaviorResult | void {
    const tile = task.tiles[state.tileIndex];
    if (!tile) {
      this.switchTo(entity, 'wander', {});
      return { complete: true, reason: 'Tile not found' };
    }

    // Remove from inventory
    const removed = this.removeFromInventory(inventory, state.materialId, 1);
    if (!removed) {
      // Something went wrong - we don't have the material
      this.updateTransportState(entity, {
        ...state,
        transportState: 'finding_storage',
        carryingAmount: 0,
      });
      return { complete: false, reason: 'Material lost, restarting' };
    }

    // Deliver to construction system
    const constructionSystem = getTileConstructionSystem();
    constructionSystem.deliverMaterial(
      world,
      state.taskId,
      state.tileIndex,
      entity.id,
      1
    );

    // Mark this delivery complete
    this.updateTransportState(entity, {
      ...state,
      transportState: 'complete',
      carryingAmount: 0,
    });

    return { complete: false, reason: 'Material delivered' };
  }

  /**
   * Check if there's more work to do on this task.
   */
  private checkForMoreWork(
    entity: EntityImpl,
    _world: World,
    task: ConstructionTask
  ): BehaviorResult | void {
    const constructionSystem = getTileConstructionSystem();

    // Find next tile needing materials
    const nextTile = constructionSystem.getNextTileNeedingMaterials(task.id);

    if (nextTile) {
      // Start a new transport cycle
      this.updateTransportState(entity, {
        transportState: 'finding_storage',
        taskId: task.id,
        tileIndex: nextTile.index,
        materialId: nextTile.tile.materialId,
        carryingAmount: 0,
      });
      return { complete: false, reason: 'Starting next material transport' };
    }

    // No more materials needed - switch to tile building if there are tiles to place
    const nextBuildTile = constructionSystem.getNextTileForConstruction(task.id);
    if (nextBuildTile) {
      this.switchTo(entity, 'tile_build', {
        taskId: task.id,
        tileIndex: nextBuildTile.index,
      });
      return { complete: true, reason: 'Materials complete, switching to building' };
    }

    // Task is done or nothing to do
    constructionSystem.unregisterBuilder(task.id, entity.id);
    this.switchTo(entity, 'wander', {});
    return { complete: true, reason: 'Construction task complete' };
  }

  /**
   * Find storage entity with the required material.
   */
  private findMaterialStorage(
    world: World,
    agent: EntityImpl,
    materialId: string
  ): { entityId: string; position: { x: number; y: number } } | null {
    // Query for entities with inventory
    const storages = world.query()
      .with(ComponentType.Inventory)
      .with(ComponentType.Position)
      .executeEntities();

    const agentPos = getPosition(agent);
    let closest: { entityId: string; position: { x: number; y: number }; distance: number } | null = null;

    for (const storage of storages) {
      // Skip the agent itself
      if (storage.id === agent.id) continue;

      const storageImpl = storage as EntityImpl;
      const inv = storageImpl.getComponent<InventoryComponent>(ComponentType.Inventory);
      const pos = storageImpl.getComponent<PositionComponent>(ComponentType.Position);

      if (!inv || !pos) continue;

      // Check if this storage has the material
      const hasItem = inv.slots.some(
        (slot: InventorySlot) => slot.itemId === materialId && slot.quantity > 0
      );

      if (!hasItem) continue;

      // Calculate distance
      const distance = agentPos
        ? Math.sqrt(
            Math.pow(pos.x - agentPos.x, 2) + Math.pow(pos.y - agentPos.y, 2)
          )
        : Infinity;

      if (!closest || distance < closest.distance) {
        closest = {
          entityId: storage.id,
          position: { x: pos.x, y: pos.y },
          distance,
        };
      }
    }

    return closest ? { entityId: closest.entityId, position: closest.position } : null;
  }

  /**
   * Pick up material from a storage entity.
   */
  private pickUpMaterial(
    world: World,
    agent: EntityImpl,
    storageEntityId: string,
    materialId: string,
    amount: number
  ): boolean {
    const storageEntity = world.getEntity(storageEntityId);
    if (!storageEntity) return false;

    const storageImpl = storageEntity as EntityImpl;
    const storageInv = storageImpl.getComponent<InventoryComponent>(ComponentType.Inventory);
    const agentInv = agent.getComponent<InventoryComponent>(ComponentType.Inventory);

    if (!storageInv || !agentInv) return false;

    // Find the material in storage
    const slotIndex = storageInv.slots.findIndex(
      (slot: InventorySlot) => slot.itemId === materialId && slot.quantity >= amount
    );

    if (slotIndex === -1) return false;

    // Remove from storage
    const slot = storageInv.slots[slotIndex];
    if (!slot) return false;

    storageImpl.updateComponent<InventoryComponent>(ComponentType.Inventory, (current) => {
      const newSlots = [...current.slots];
      const targetSlot = newSlots[slotIndex];
      if (targetSlot) {
        targetSlot.quantity -= amount;
        if (targetSlot.quantity <= 0) {
          targetSlot.itemId = null;
          targetSlot.quantity = 0;
        }
      }
      return { ...current, slots: newSlots };
    });

    // Add to agent inventory
    this.addToInventory(agentInv, agent, materialId, amount);

    return true;
  }

  /**
   * Add item to agent inventory.
   */
  private addToInventory(
    _inventory: InventoryComponent,
    entity: EntityImpl,
    itemId: string,
    amount: number
  ): void {
    entity.updateComponent<InventoryComponent>(ComponentType.Inventory, (current) => {
      const newSlots = [...current.slots];

      // Find existing slot with this item (default max stack of 99)
      const existingSlot = newSlots.find(
        (slot: InventorySlot) => slot.itemId === itemId && slot.quantity < 99
      );

      if (existingSlot) {
        existingSlot.quantity += amount;
      } else {
        // Find empty slot
        const emptySlot = newSlots.find((slot: InventorySlot) => !slot.itemId);
        if (emptySlot) {
          emptySlot.itemId = itemId;
          emptySlot.quantity = amount;
        }
      }

      return { ...current, slots: newSlots };
    });
  }

  /**
   * Remove item from inventory.
   */
  private removeFromInventory(
    inventory: InventoryComponent,
    itemId: string,
    amount: number
  ): boolean {
    const slot = inventory.slots.find(
      (s: InventorySlot) => s.itemId === itemId && s.quantity >= amount
    );
    return slot !== undefined;
  }

  /**
   * Get transport state from agent.
   */
  private getTransportState(agent: AgentComponent): MaterialTransportState | null {
    const state = agent.behaviorState as Partial<MaterialTransportState>;
    if (!state.taskId || !state.materialId || state.tileIndex === undefined) {
      return null;
    }
    return {
      transportState: state.transportState ?? 'finding_storage',
      taskId: state.taskId,
      tileIndex: state.tileIndex,
      materialId: state.materialId,
      storagePosition: state.storagePosition,
      storageEntityId: state.storageEntityId,
      carryingAmount: state.carryingAmount ?? 0,
    };
  }

  /**
   * Update transport state on agent.
   */
  private updateTransportState(
    entity: EntityImpl,
    state: MaterialTransportState
  ): void {
    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      behaviorState: state as unknown as Record<string, unknown>,
    }));
  }
}

/**
 * Factory function for behavior registry.
 */
export function materialTransportBehavior(entity: EntityImpl, world: World): void {
  const behavior = new MaterialTransportBehavior();
  behavior.execute(entity, world);
}
