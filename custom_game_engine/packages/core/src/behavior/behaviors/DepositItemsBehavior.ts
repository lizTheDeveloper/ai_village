/**
 * DepositItemsBehavior - Deposit items into storage
 *
 * Agent moves to nearest storage building (storage-chest or storage-box)
 * and deposits inventory items. Handles full storage by finding alternatives
 * or switching to build behavior.
 *
 * Part of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { Entity, EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AgentComponent, AgentBehavior } from '../../components/AgentComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { InventoryComponent } from '../../components/InventoryComponent.js';
import type { BuildingComponent } from '../../components/BuildingComponent.js';
import type { GatheringStatsComponent } from '../../components/GatheringStatsComponent.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { addToInventory, removeFromInventory } from '../../components/InventoryComponent.js';
import { recordDeposited } from '../../components/GatheringStatsComponent.js';
import { itemRegistry } from '../../items/index.js';
import { ComponentType } from '../../types/ComponentType.js';
import { BuildingType } from '../../types/BuildingType.js';

/**
 * Get the current game day from the world's time entity.
 */
function getCurrentDay(world: World): number {
  const timeEntities = world.query().with(ComponentType.Time).executeEntities();
  if (timeEntities.length > 0) {
    const timeEntity = timeEntities[0] as EntityImpl;
    const timeComp = timeEntity.getComponent(ComponentType.Time) as { day?: number } | undefined;
    return timeComp?.day ?? 0;
  }
  return 0;
}

/**
 * DepositItemsBehavior - Move to storage and deposit items
 */
export class DepositItemsBehavior extends BaseBehavior {
  readonly name = 'deposit_items' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position)!;
    const inventory = entity.getComponent<InventoryComponent>(ComponentType.Inventory);
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent)!;

    // Disable steering system so it doesn't override our deposit movement
    this.disableSteering(entity);

    if (!inventory) {
      // No inventory, nothing to deposit
      return { complete: true, reason: 'No inventory component' };
    }

    // Check if we have items to deposit
    const hasItems = inventory.slots.some(slot => slot.itemId && slot.quantity > 0);
    if (!hasItems) {
      // Restore previous behavior if stored, otherwise just complete
      const previousBehavior = agent.behaviorState?.previousBehavior as AgentBehavior | undefined;
      const previousState = agent.behaviorState?.previousState as Record<string, unknown> | undefined;

      if (previousBehavior) {
        this.switchTo(entity, previousBehavior, previousState || {});
      }
      return { complete: true, reason: 'No items to deposit' };
    }

    // Find storage buildings with inventory components
    const storageBuildings = world.query()
      .with(ComponentType.Building)
      .with(ComponentType.Inventory)
      .with(ComponentType.Position)
      .executeEntities();

    // Filter for storage-chest and storage-box types
    const validStorage = storageBuildings.filter(storage => {
      const storageImpl = storage as EntityImpl;
      const building = storageImpl.getComponent<BuildingComponent>(ComponentType.Building);
      if (!building) return false;

      return (
        (building.buildingType === BuildingType.StorageChest || building.buildingType === BuildingType.StorageBox) &&
        building.isComplete // Only deposit to completed buildings
      );
    });

    if (validStorage.length === 0) {
      // No storage available
      world.eventBus.emit({
        type: 'storage:not_found',
        source: entity.id,
        data: { agentId: entity.id },
      });

      return { complete: true, reason: 'No storage buildings found' };
    }

    // Find nearest storage with available capacity
    const lastStorageId = agent.behaviorState?.lastStorageId as string | undefined;
    const nearestStorage = this.findNearestStorage(validStorage, position, lastStorageId);

    if (!nearestStorage) {
      // No storage available (all full or we're skipping the last one used)
      world.eventBus.emit({
        type: 'storage:full',
        source: entity.id,
        data: {
          storageId: 'all-storage-full',
          agentId: entity.id
        },
      });

      // Build more storage instead of giving up
      this.switchTo(entity, 'build', {
        buildingType: 'storage-chest',
        previousBehavior: agent.behaviorState?.previousBehavior,
        previousState: agent.behaviorState?.previousState,
      });
      return { complete: false, reason: 'All storage full, switching to build' };
    }

    const nearestStorageImpl = nearestStorage.entity as EntityImpl;
    const storagePos = nearestStorageImpl.getComponent<PositionComponent>(ComponentType.Position)!;

    // Move toward storage (with arrival slowdown) and check distance
    const distanceToStorage = this.moveToward(entity, storagePos);

    // Check if adjacent to storage (within 1.5 tiles)
    if (distanceToStorage <= 1.5) {
      this.stopAllMovement(entity);
      this.performDeposit(entity, nearestStorageImpl, world, inventory, agent);
    }
  }

  private findNearestStorage(
    storageList: readonly Entity[],
    position: PositionComponent,
    lastStorageId?: string
  ): { entity: Entity; distance: number } | null {
    let nearest: Entity | null = null;
    let nearestDistance = Infinity;

    for (const storage of storageList) {
      const storageImpl = storage as EntityImpl;
      const storagePos = storageImpl.getComponent<PositionComponent>(ComponentType.Position)!;
      const storageInventory = storageImpl.getComponent<InventoryComponent>(ComponentType.Inventory)!;

      // Skip storage we just used (to avoid infinite loop)
      if (lastStorageId && storage.id === lastStorageId) {
        continue;
      }

      // Check if storage has capacity
      if (storageInventory.currentWeight >= storageInventory.maxWeight) {
        continue; // Storage is full
      }

      const distance = this.distance(position, storagePos);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = storage;
      }
    }

    return nearest ? { entity: nearest, distance: nearestDistance } : null;
  }

  private performDeposit(
    entity: EntityImpl,
    storageEntity: EntityImpl,
    world: World,
    inventory: InventoryComponent,
    agent: AgentComponent
  ): void {
    const storageInventory = storageEntity.getComponent<InventoryComponent>(ComponentType.Inventory)!;
    const itemsDeposited: Array<{ itemId: string; amount: number }> = [];

    // Create mutable copies of inventories
    let agentInv = { ...inventory, slots: [...inventory.slots.map(s => ({ ...s }))] };
    let storageInv = { ...storageInventory, slots: [...storageInventory.slots.map(s => ({ ...s }))] };

    // Transfer items from agent to storage
    for (const slot of agentInv.slots) {
      if (!slot.itemId || slot.quantity === 0) continue;

      const itemId = slot.itemId;
      const quantityToTransfer = slot.quantity;

      // Check if item can be deposited (must be in registry and storable)
      if (!itemRegistry.isStorable(itemId)) continue;

      // Get weight from item registry
      const unitWeight = itemRegistry.getWeight(itemId);
      const availableWeight = storageInv.maxWeight - storageInv.currentWeight;
      const maxByWeight = Math.floor(availableWeight / unitWeight);
      const amountToTransfer = Math.min(quantityToTransfer, maxByWeight);

      if (amountToTransfer === 0) {
        continue; // Storage full for this item type
      }

      try {
        // Remove from agent inventory
        const removeResult = removeFromInventory(agentInv, itemId, amountToTransfer);
        agentInv = removeResult.inventory;

        // Add to storage inventory
        const addResult = addToInventory(storageInv, itemId, amountToTransfer);
        storageInv = addResult.inventory;

        itemsDeposited.push({
          itemId: itemId,
          amount: amountToTransfer,
        });
      } catch (error) {
        // Storage became full during transfer
        break;
      }
    }

    // Update both entities with new inventories
    entity.updateComponent<InventoryComponent>(ComponentType.Inventory, () => agentInv);
    storageEntity.updateComponent<InventoryComponent>(ComponentType.Inventory, () => storageInv);

    // Record deposit stats
    if (itemsDeposited.length > 0) {
      const gatheringStats = entity.getComponent<GatheringStatsComponent>(ComponentType.GatheringStats);
      if (gatheringStats) {
        const currentDay = getCurrentDay(world);
        for (const item of itemsDeposited) {
          recordDeposited(gatheringStats, item.itemId, item.amount, currentDay);
        }
        entity.updateComponent<GatheringStatsComponent>(ComponentType.GatheringStats, () => gatheringStats);
      }
    }

    // Emit deposit event
    if (itemsDeposited.length > 0) {
      world.eventBus.emit({
        type: 'items:deposited',
        source: entity.id,
        data: {
          agentId: entity.id,
          storageId: storageEntity.id,
          items: itemsDeposited.map(item => ({
            itemId: item.itemId,
            amount: item.amount,
          })),
        },
      });
    }

    // Check if agent still has items
    const stillHasItems = agentInv.slots.some(slot => slot.itemId && slot.quantity > 0);

    if (stillHasItems) {
      this.handlePartialDeposit(entity, storageEntity, world, itemsDeposited, agent);
    } else {
      this.handleCompleteDeposit(entity, agent);
    }
  }

  private handlePartialDeposit(
    entity: EntityImpl,
    storageEntity: EntityImpl,
    world: World,
    itemsDeposited: Array<{ itemId: string; amount: number }>,
    agent: AgentComponent
  ): void {
    // Check if remaining items are even depositable
    const inventory = entity.getComponent<InventoryComponent>(ComponentType.Inventory)!;
    const hasDepositableItems = inventory.slots.some(slot => {
      if (!slot.itemId || slot.quantity === 0) return false;
      return itemRegistry.isStorable(slot.itemId);
    });

    if (!hasDepositableItems) {
      // Remaining items can't be deposited (unknown types) - give up and return to previous behavior
      const previousBehavior = agent.behaviorState?.previousBehavior as AgentBehavior | undefined;
      const previousState = agent.behaviorState?.previousState as Record<string, unknown> | undefined;
      if (previousBehavior) {
        this.switchTo(entity, previousBehavior, previousState || {});
      }
      this.stopAllMovement(entity);
      return;
    }

    if (itemsDeposited.length === 0) {
      // Storage was completely full, couldn't deposit anything
      world.eventBus.emit({
        type: 'storage:full',
        source: entity.id,
        data: {
          storageId: storageEntity.id,
          agentId: entity.id
        },
      });

      // Storage is full
      this.stopAllMovement(entity);
    } else {
      // Deposited some but not all - need to find another storage
      // Mark the current storage as recently used so we don't immediately try it again
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        behavior: 'deposit_items',
        behaviorState: {
          ...current.behaviorState,
          lastStorageId: storageEntity.id, // Remember which storage we just used
        },
      }));

      this.stopAllMovement(entity);
    }
  }

  private handleCompleteDeposit(entity: EntityImpl, agent: AgentComponent): void {
    // All items deposited, return to previous behavior
    const previousBehavior = agent.behaviorState?.previousBehavior as AgentBehavior | undefined;
    const previousState = agent.behaviorState?.previousState as Record<string, unknown> | undefined;

    if (previousBehavior) {
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        behavior: previousBehavior,
        behaviorState: previousState || {},
        behaviorCompleted: true, // Signal completion when inventory is empty
      }));
    } else {
      // No previous behavior - just mark as completed
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        behaviorCompleted: true,
      }));
    }

    this.stopAllMovement(entity);
  }
}

/**
 * Standalone function for use with BehaviorRegistry.
 */
export function depositItemsBehavior(entity: EntityImpl, world: World): void {
  const behavior = new DepositItemsBehavior();
  behavior.execute(entity, world);
}
