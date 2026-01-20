/**
 * InteractionAPI - Entity interaction service
 *
 * This service provides interaction functionality for harvesting resources,
 * eating food, depositing items, and picking up items. It centralizes the
 * interaction logic that was previously scattered across behavior methods.
 *
 * Part of Phase 0 of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { World, WorldMutator } from '../ecs/World.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';
import type { ResourceComponent } from '../components/ResourceComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { GatheringStatsComponent } from '../components/GatheringStatsComponent.js';
import { addToInventory } from '../components/InventoryComponent.js';
import { recordGathered, recordDeposited } from '../components/GatheringStatsComponent.js';
import { ComponentType } from '../types/ComponentType.js';

/**
 * Result of an interaction attempt
 */
export interface InteractionResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Harvest options
 */
export interface HarvestOptions {
  /** Amount to harvest (default: 10) */
  amount?: number;
  /** Work speed multiplier (for energy penalties) */
  workSpeedMultiplier?: number;
}

/**
 * InteractionAPI Class - Entity interactions
 *
 * Usage:
 * ```typescript
 * const interactions = new InteractionAPI();
 * const result = interactions.harvest(agent, resource, world);
 * if (result.success) {
 * }
 * ```
 */
export class InteractionAPI {
  /**
   * Get the current game day from the world's time entity.
   */
  private getCurrentDay(world: World): number {
    const timeEntities = world.query().with(ComponentType.Time).executeEntities();
    if (timeEntities.length > 0) {
      const timeEntity = timeEntities[0] as EntityImpl;
      const timeComp = timeEntity.getComponent(ComponentType.Time) as { day?: number } | undefined;
      return timeComp?.day ?? 0;
    }
    return 0;
  }

  /**
   * Harvest resources from a resource node.
   * Adds harvested resources to agent inventory.
   */
  harvest(
    agent: EntityImpl,
    resourceEntity: Entity,
    world: World,
    options?: HarvestOptions
  ): InteractionResult {
    const inventory = agent.getComponent<InventoryComponent>(ComponentType.Inventory);
    if (!inventory) {
      return { success: false, message: 'Agent has no inventory' };
    }

    const resourceImpl = resourceEntity as EntityImpl;
    const resource = resourceImpl.getComponent<ResourceComponent>(ComponentType.Resource);
    if (!resource) {
      return { success: false, message: 'Target is not a resource' };
    }

    if (resource.amount <= 0) {
      return { success: false, message: 'Resource is depleted' };
    }

    if (!resource.harvestable) {
      return { success: false, message: 'Resource is not harvestable' };
    }

    // Calculate harvest amount
    const baseAmount = options?.amount ?? 10;
    const workMultiplier = options?.workSpeedMultiplier ?? 1.0;
    const harvestAmount = Math.min(
      Math.floor(baseAmount * workMultiplier),
      resource.amount
    );

    if (harvestAmount === 0) {
      return { success: false, message: 'Work speed too low to harvest' };
    }

    // Try to add to inventory
    try {
      const result = addToInventory(inventory, resource.resourceType, harvestAmount);
      agent.updateComponent<InventoryComponent>(ComponentType.Inventory, () => result.inventory);

      // Update resource amount
      resourceImpl.updateComponent<ResourceComponent>(ComponentType.Resource, (current) => ({
        ...current,
        amount: Math.max(0, current.amount - result.amountAdded),
      }));

      // Emit harvest event - use resource:gathered from EventMap
      const targetPos = resourceImpl.getComponent<PositionComponent>(ComponentType.Position);
      world.eventBus.emit<'resource:gathered'>({
        type: 'resource:gathered',
        source: agent.id,
        data: {
          agentId: agent.id,
          resourceType: resource.resourceType,
          amount: result.amountAdded,
          position: targetPos ? { x: targetPos.x, y: targetPos.y } : { x: 0, y: 0 },
          sourceEntityId: resourceEntity.id,
        },
      });

      // Record gathering stats
      const gatheringStats = agent.getComponent<GatheringStatsComponent>(ComponentType.GatheringStats);
      if (gatheringStats) {
        const currentDay = this.getCurrentDay(world);
        recordGathered(gatheringStats, resource.resourceType, result.amountAdded, currentDay);
        agent.updateComponent<GatheringStatsComponent>(ComponentType.GatheringStats, () => gatheringStats);
      }

      return {
        success: true,
        message: `Harvested ${result.amountAdded} ${resource.resourceType}`,
        data: {
          amountHarvested: result.amountAdded,
          resourceType: resource.resourceType,
          inventoryFull: result.inventory.currentWeight >= result.inventory.maxWeight,
        },
      };
    } catch {
      // Inventory full
      world.eventBus.emit<'inventory:full'>({
        type: 'inventory:full',
        source: agent.id,
        data: {
          entityId: agent.id,
          agentId: agent.id,
        },
      });

      return {
        success: false,
        message: 'Inventory full',
        data: { inventoryFull: true },
      };
    }
  }

  /**
   * Eat food from inventory to restore hunger.
   */
  eat(
    agent: EntityImpl,
    foodType: string,
    world: World
  ): InteractionResult {
    const inventory = agent.getComponent<InventoryComponent>(ComponentType.Inventory);
    const needs = agent.getComponent<NeedsComponent>(ComponentType.Needs);

    if (!inventory) {
      return { success: false, message: 'Agent has no inventory' };
    }

    if (!needs) {
      return { success: false, message: 'Agent has no needs' };
    }

    // Find food in inventory
    const slotIndex = inventory.slots.findIndex(
      (slot) => slot.itemId === foodType && slot.quantity > 0
    );

    if (slotIndex === -1) {
      return { success: false, message: `No ${foodType} in inventory` };
    }

    // Consume food
    const slot = inventory.slots[slotIndex]!;
    const consumed = 1;

    agent.updateComponent<InventoryComponent>(ComponentType.Inventory, (current) => {
      const newSlots = [...current.slots];
      const currentSlot = newSlots[slotIndex]!;
      newSlots[slotIndex] = {
        ...currentSlot,
        quantity: currentSlot.quantity - consumed,
      };

      // Clear slot if empty
      if (newSlots[slotIndex]!.quantity <= 0) {
        newSlots[slotIndex] = { itemId: null, quantity: 0 };
      }

      return {
        ...current,
        slots: newSlots,
        currentWeight: Math.max(0, current.currentWeight - 1),
      };
    });

    // Restore hunger (food restores ~25% on 0-1 scale)
    const hungerRestored = 0.25;
    agent.updateComponent<NeedsComponent>(ComponentType.Needs, (current) => {
      const updated = current.clone();
      updated.hunger = Math.min(1.0, current.hunger + hungerRestored);
      return updated;
    });

    // Emit eat event
    world.eventBus.emit<'agent:ate'>({
      type: 'agent:ate',
      source: agent.id,
      data: {
        agentId: agent.id,
        foodType,
        hungerRestored,
      },
    });

    return {
      success: true,
      message: `Ate ${foodType}`,
      data: {
        foodType,
        hungerRestored,
        remainingFood: slot.quantity - consumed,
      },
    };
  }

  /**
   * Eat food directly from a storage container.
   * Use this when agent's inventory is full but they need to eat.
   */
  eatFromStorage(
    agent: EntityImpl,
    storageEntity: Entity,
    world: World,
    foodType?: string
  ): InteractionResult {
    const needs = agent.getComponent<NeedsComponent>(ComponentType.Needs);
    if (!needs) {
      return { success: false, message: 'Agent has no needs' };
    }

    const storageImpl = storageEntity as EntityImpl;
    const storageInventory = storageImpl.getComponent<InventoryComponent>(ComponentType.Inventory);
    if (!storageInventory) {
      return { success: false, message: 'Storage has no inventory' };
    }

    // Food types we consider edible
    const foodTypes = foodType
      ? [foodType]
      : ['berry', 'wheat', 'food', 'apple', 'carrot'];

    // Find food in storage
    let foundSlotIndex = -1;
    let foundFoodType = '';
    for (let i = 0; i < storageInventory.slots.length; i++) {
      const slot = storageInventory.slots[i];
      if (slot?.itemId && foodTypes.includes(slot.itemId) && slot.quantity > 0) {
        foundSlotIndex = i;
        foundFoodType = slot.itemId;
        break;
      }
    }

    if (foundSlotIndex === -1) {
      return { success: false, message: 'No food in storage' };
    }

    // Consume food directly from storage
    const consumed = 1;
    storageImpl.updateComponent<InventoryComponent>(ComponentType.Inventory, (current) => {
      const newSlots = [...current.slots];
      const currentSlot = newSlots[foundSlotIndex]!;
      newSlots[foundSlotIndex] = {
        ...currentSlot,
        quantity: currentSlot.quantity - consumed,
      };

      // Clear slot if empty
      if (newSlots[foundSlotIndex]!.quantity <= 0) {
        newSlots[foundSlotIndex] = { itemId: null, quantity: 0 };
      }

      return {
        ...current,
        slots: newSlots,
        currentWeight: Math.max(0, current.currentWeight - 1),
      };
    });

    // Restore hunger (food restores ~25% on 0-1 scale)
    const hungerRestored = 0.25;
    agent.updateComponent<NeedsComponent>(ComponentType.Needs, (current) => {
      const updated = current.clone();
      updated.hunger = Math.min(1.0, current.hunger + hungerRestored);
      return updated;
    });

    // Emit eat event
    world.eventBus.emit<'agent:ate'>({
      type: 'agent:ate',
      source: agent.id,
      data: {
        agentId: agent.id,
        foodType: foundFoodType,
        hungerRestored,
        fromStorage: true,
        storageId: storageEntity.id,
      },
    });

    return {
      success: true,
      message: `Ate ${foundFoodType} from storage`,
      data: {
        foodType: foundFoodType,
        hungerRestored,
        storageId: storageEntity.id,
      },
    };
  }

  /**
   * Eat fruit directly from a plant (e.g., berry bush).
   * Use this when agent's inventory is full but they need to eat.
   * CRITICAL: Handles harvestResetStage to enable berry regrowth.
   */
  eatFromPlant(
    agent: EntityImpl,
    plantEntity: Entity,
    world: World
  ): InteractionResult {
    const needs = agent.getComponent<NeedsComponent>(ComponentType.Needs);
    if (!needs) {
      return { success: false, message: 'Agent has no needs' };
    }

    const plantImpl = plantEntity as EntityImpl;
    const plant = plantImpl.getComponent(ComponentType.Plant) as unknown as {
      speciesId: string;
      fruitCount: number;
      stage: string;
    } | undefined;

    if (!plant) {
      return { success: false, message: 'Target is not a plant' };
    }

    if (plant.fruitCount <= 0) {
      return { success: false, message: 'Plant has no fruit' };
    }

    // Get species definition to check for harvestResetStage
    interface WorldWithPlantLookup extends World {
      plantSpeciesLookup?: (speciesId: string) => { harvestResetStage?: string; harvestDestroysPlant?: boolean } | undefined;
    }
    const species = (world as WorldWithPlantLookup).plantSpeciesLookup?.(plant.speciesId);
    const newFruitCount = Math.max(0, plant.fruitCount - 1);

    // Consume one fruit from the plant
    // CRITICAL FIX: If all fruit consumed AND species has harvestResetStage, reset plant stage to allow regrowth
    plantImpl.updateComponent(ComponentType.Plant, (current: any) => {
      const updated = {
        ...current,
        fruitCount: newFruitCount,
      };

      // If all fruit harvested and species supports regrowth, reset stage
      if (newFruitCount === 0 && species?.harvestResetStage && !species.harvestDestroysPlant) {
        updated.stage = species.harvestResetStage;
      }

      return updated;
    });

    // Determine food type from species (e.g., berry-bush -> berry)
    const foodType = this.getFoodTypeFromSpecies(plant.speciesId);

    // Restore hunger (food restores ~25% on 0-1 scale)
    const hungerRestored = 0.25;
    agent.updateComponent<NeedsComponent>(ComponentType.Needs, (current) => {
      const updated = current.clone();
      updated.hunger = Math.min(1.0, current.hunger + hungerRestored);
      return updated;
    });

    // Emit eat event
    world.eventBus.emit<'agent:ate'>({
      type: 'agent:ate',
      source: agent.id,
      data: {
        agentId: agent.id,
        foodType,
        hungerRestored,
        fromPlant: plantEntity.id,
      },
    });

    return {
      success: true,
      message: `Ate ${foodType} from ${plant.speciesId}`,
      data: {
        foodType,
        hungerRestored,
        plantId: plantEntity.id,
      },
    };
  }

  /**
   * Get food type from plant species (e.g., blueberry-bush -> berry).
   */
  private getFoodTypeFromSpecies(speciesId: string): string {
    const mapping: Record<string, string> = {
      'blueberry-bush': 'berry',
      'raspberry-bush': 'berry',
      'blackberry-bush': 'berry',
      'berry_bush': 'berry',
      'wheat': 'wheat',
      'carrot': 'carrot',
      'apple-tree': 'apple',
      'apple_tree': 'apple',
    };
    return mapping[speciesId] || 'food';
  }

  /**
   * Deposit items from inventory into a storage building.
   */
  deposit(
    agent: EntityImpl,
    storageEntity: Entity,
    world: World,
    itemType?: string
  ): InteractionResult {
    const inventory = agent.getComponent<InventoryComponent>(ComponentType.Inventory);
    if (!inventory) {
      return { success: false, message: 'Agent has no inventory' };
    }

    const storageImpl = storageEntity as EntityImpl;
    const storageInventory = storageImpl.getComponent<InventoryComponent>(ComponentType.Inventory);
    if (!storageInventory) {
      return { success: false, message: 'Storage has no inventory' };
    }

    let totalDeposited = 0;
    const depositedItems: Record<string, number> = {};

    // Find items to deposit
    for (let i = 0; i < inventory.slots.length; i++) {
      const slot = inventory.slots[i];
      if (!slot?.itemId || slot.quantity <= 0) continue;

      // If itemType specified, only deposit that type
      if (itemType && slot.itemId !== itemType) continue;

      // Try to add to storage
      try {
        const result = addToInventory(storageInventory, slot.itemId, slot.quantity);
        storageImpl.updateComponent<InventoryComponent>(ComponentType.Inventory, () => result.inventory);

        // Remove from agent inventory
        agent.updateComponent<InventoryComponent>(ComponentType.Inventory, (current) => {
          const newSlots = [...current.slots];
          newSlots[i] = {
            itemId: null,
            quantity: 0,
          };
          return {
            ...current,
            slots: newSlots,
            currentWeight: Math.max(0, current.currentWeight - result.amountAdded),
          };
        });

        totalDeposited += result.amountAdded;
        depositedItems[slot.itemId] = (depositedItems[slot.itemId] || 0) + result.amountAdded;
      } catch {
        // Storage full for this item type
        continue;
      }
    }

    if (totalDeposited === 0) {
      return { success: false, message: 'Nothing deposited (storage may be full)' };
    }

    // Emit deposit event - convert to array format per EventMap
    const itemsArray = Object.entries(depositedItems).map(([itemId, amount]) => ({
      itemId,
      amount,
    }));
    world.eventBus.emit<'items:deposited'>({
      type: 'items:deposited',
      source: agent.id,
      data: {
        agentId: agent.id,
        storageId: storageEntity.id,
        items: itemsArray,
      },
    });

    // Record deposit stats
    const gatheringStats = agent.getComponent<GatheringStatsComponent>(ComponentType.GatheringStats);
    if (gatheringStats) {
      const currentDay = this.getCurrentDay(world);
      for (const [itemId, amount] of Object.entries(depositedItems)) {
        recordDeposited(gatheringStats, itemId, amount, currentDay);
      }
      agent.updateComponent<GatheringStatsComponent>(ComponentType.GatheringStats, () => gatheringStats);
    }

    return {
      success: true,
      message: `Deposited ${totalDeposited} items`,
      data: {
        totalDeposited,
        depositedItems,
      },
    };
  }

  /**
   * Pick up an item from the ground.
   */
  pickup(
    agent: EntityImpl,
    itemEntity: Entity,
    world: World
  ): InteractionResult {
    const inventory = agent.getComponent<InventoryComponent>(ComponentType.Inventory);
    if (!inventory) {
      return { success: false, message: 'Agent has no inventory' };
    }

    const itemImpl = itemEntity as EntityImpl;
    interface ItemData { itemId: string; quantity?: number }
    const item = itemImpl.getComponent(ComponentType.Item) as unknown as ItemData | undefined;
    if (!item) {
      return { success: false, message: 'Target is not an item' };
    }

    // Try to add to inventory
    try {
      const result = addToInventory(inventory, item.itemId, item.quantity || 1);
      agent.updateComponent<InventoryComponent>(ComponentType.Inventory, () => result.inventory);

      // Remove item from world (use WorldMutator for entity destruction)
      (world as WorldMutator).destroyEntity(itemEntity.id, 'picked_up');

      // Emit inventory changed event
      world.eventBus.emit<'inventory:changed'>({
        type: 'inventory:changed',
        source: agent.id,
        data: {
          entityId: agent.id,
          agentId: agent.id,
          changes: [{ itemId: item.itemId, delta: result.amountAdded }],
        },
      });

      return {
        success: true,
        message: `Picked up ${item.itemId}`,
        data: {
          itemId: item.itemId,
          quantity: result.amountAdded,
        },
      };
    } catch {
      return { success: false, message: 'Inventory full' };
    }
  }

  /**
   * Check if agent can harvest a resource.
   */
  canHarvest(agent: EntityImpl, resourceEntity: Entity): boolean {
    const inventory = agent.getComponent<InventoryComponent>(ComponentType.Inventory);
    if (!inventory) return false;

    // Check if inventory has space
    if (inventory.currentWeight >= inventory.maxWeight) return false;

    const resourceImpl = resourceEntity as EntityImpl;
    const resource = resourceImpl.getComponent<ResourceComponent>(ComponentType.Resource);
    if (!resource) return false;

    return resource.harvestable && resource.amount > 0;
  }

  /**
   * Check if agent has food in inventory.
   */
  hasFood(agent: EntityImpl, foodType?: string): boolean {
    const inventory = agent.getComponent<InventoryComponent>(ComponentType.Inventory);
    if (!inventory) return false;

    const foodTypes = foodType
      ? [foodType]
      : ['berry', 'wheat', 'food', 'apple', 'carrot'];

    return inventory.slots.some(
      (slot) => slot?.itemId && foodTypes.includes(slot.itemId) && slot.quantity > 0
    );
  }

  /**
   * Get total food count in inventory.
   */
  getFoodCount(agent: EntityImpl): number {
    const inventory = agent.getComponent<InventoryComponent>(ComponentType.Inventory);
    if (!inventory) return 0;

    const foodTypes = ['berry', 'wheat', 'food', 'apple', 'carrot'];
    return inventory.slots.reduce((total, slot) => {
      if (slot?.itemId && foodTypes.includes(slot.itemId)) {
        return total + slot.quantity;
      }
      return total;
    }, 0);
  }
}

// ============================================================================
// Functional API - Standalone functions for simpler usage
// ============================================================================

const interactionAPI = new InteractionAPI();

/**
 * Harvest resources from a resource node.
 */
export function harvest(
  agent: Entity,
  resourceEntity: Entity,
  world: World,
  options?: HarvestOptions
): InteractionResult {
  return interactionAPI.harvest(agent as EntityImpl, resourceEntity, world, options);
}

/**
 * Eat food from inventory.
 */
export function eat(
  agent: Entity,
  foodType: string,
  world: World
): InteractionResult {
  return interactionAPI.eat(agent as EntityImpl, foodType, world);
}

/**
 * Eat food directly from a storage container.
 * Use this when agent's inventory is full but they need to eat.
 */
export function eatFromStorage(
  agent: Entity,
  storageEntity: Entity,
  world: World,
  foodType?: string
): InteractionResult {
  return interactionAPI.eatFromStorage(agent as EntityImpl, storageEntity, world, foodType);
}

/**
 * Eat fruit directly from a plant (e.g., berry bush).
 * Use this when agent's inventory is full but they need to eat.
 */
export function eatFromPlant(
  agent: Entity,
  plantEntity: Entity,
  world: World
): InteractionResult {
  return interactionAPI.eatFromPlant(agent as EntityImpl, plantEntity, world);
}

/**
 * Deposit items into storage.
 */
export function deposit(
  agent: Entity,
  storageEntity: Entity,
  world: World,
  itemType?: string
): InteractionResult {
  return interactionAPI.deposit(agent as EntityImpl, storageEntity, world, itemType);
}

/**
 * Pick up an item.
 */
export function pickup(
  agent: Entity,
  itemEntity: Entity,
  world: World
): InteractionResult {
  return interactionAPI.pickup(agent as EntityImpl, itemEntity, world);
}

/**
 * Check if agent can harvest.
 */
export function canHarvest(agent: Entity, resourceEntity: Entity): boolean {
  return interactionAPI.canHarvest(agent as EntityImpl, resourceEntity);
}

/**
 * Check if agent has food.
 */
export function hasFood(agent: Entity, foodType?: string): boolean {
  return interactionAPI.hasFood(agent as EntityImpl, foodType);
}

/**
 * Get food count in inventory.
 */
export function getFoodCount(agent: Entity): number {
  return interactionAPI.getFoodCount(agent as EntityImpl);
}
