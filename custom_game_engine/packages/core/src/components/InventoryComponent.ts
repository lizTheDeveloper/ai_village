import type { Component } from '../ecs/Component.js';
import type { ResourceType } from './ResourceComponent.js';
import {
  itemRegistry,
  isSeedItemId,
  getSeedSpeciesId as getSeedSpeciesIdFromItems,
  createSeedItemId as createSeedItemIdFromItems,
} from '../items/index.js';

// Re-export seed utilities for backward compatibility
export { getSeedSpeciesIdFromItems as getSeedSpeciesId };
export { createSeedItemIdFromItems as createSeedItemId };

/**
 * A slot in an agent's inventory.
 */
export interface InventorySlot {
  /** Resource type or item ID stored in this slot */
  itemId: string | null;
  /** Quantity of items in this slot */
  quantity: number;
  /** Optional quality rating (for Phase 10+) */
  quality?: number;
  /** Optional unique instance ID for legendary/unique items */
  instanceId?: string;
}

/**
 * Inventory component for agents to carry resources.
 * Based on items-system/spec.md
 */
export interface InventoryComponent extends Component {
  type: 'inventory';
  /** Array of inventory slots */
  slots: InventorySlot[];
  /** Maximum number of slots */
  maxSlots: number;
  /** Maximum weight capacity */
  maxWeight: number;
  /** Current total weight (cached for performance) */
  currentWeight: number;
}

/**
 * Create a new InventoryComponent with default values.
 */
export function createInventoryComponent(
  maxSlots: number = 24,
  maxWeight: number = 100
): InventoryComponent {
  // Initialize with empty slots so addToInventory can fill them
  const slots: InventorySlot[] = [];
  for (let i = 0; i < maxSlots; i++) {
    slots.push({ itemId: null, quantity: 0 });
  }

  return {
    type: 'inventory',
    version: 1,
    slots,
    maxSlots,
    maxWeight,
    currentWeight: 0,
  };
}

/**
 * Get the weight of a single unit of a resource.
 * Uses the ItemRegistry for lookups.
 */
export function getResourceWeight(resourceType: ResourceType): number {
  return itemRegistry.getWeight(resourceType);
}

/**
 * Get the maximum stack size for a resource.
 * Uses the ItemRegistry for lookups.
 */
export function getResourceStackSize(resourceType: ResourceType): number {
  return itemRegistry.getStackSize(resourceType);
}

/**
 * Calculate total weight of inventory.
 * CRITICAL: This function must never return negative values.
 * Always recalculates from actual slot contents to prevent stale cached values.
 * Uses ItemRegistry for weight lookups.
 */
export function calculateInventoryWeight(inventory: InventoryComponent): number {
  let totalWeight = 0;

  for (const slot of inventory.slots) {
    if (slot.itemId && slot.quantity > 0) {
      // Use ItemRegistry for weight lookup (returns 1.0 for unknown items)
      const unitWeight = itemRegistry.getWeight(slot.itemId);
      totalWeight += unitWeight * slot.quantity;
    }
  }

  return totalWeight;
}

/**
 * Check if a string is a valid ResourceType.
 * Uses ItemRegistry for category lookup.
 */
export function isResourceType(itemId: string): boolean {
  return itemRegistry.isResource(itemId);
}

/**
 * Check if a string is a food item type.
 * Uses ItemRegistry for category lookup.
 */
export function isFoodType(itemId: string): boolean {
  return itemRegistry.isFood(itemId);
}

/**
 * Check if a string is a seed item ID (format: "seed:{speciesId}")
 * Uses the SeedItemFactory utility from items module.
 */
export function isSeedType(itemId: string): boolean {
  return isSeedItemId(itemId);
}

/**
 * Check if an item type is valid for inventory operations.
 * Uses ItemRegistry - any registered item is valid.
 */
export function isValidItemType(itemId: string): boolean {
  return itemRegistry.has(itemId);
}

/**
 * Add items to inventory. Returns the amount actually added.
 * Throws if inventory is full or weight limit exceeded.
 * Uses ItemRegistry for weight and stack size lookups.
 */
export function addToInventory(
  inventory: InventoryComponent,
  itemId: string,
  quantity: number
): { inventory: InventoryComponent; amountAdded: number } {
  if (quantity <= 0) {
    throw new Error(`Cannot add non-positive quantity: ${quantity}`);
  }

  // Use ItemRegistry for weight and stack size (returns defaults for unknown items)
  const unitWeight = itemRegistry.getWeight(itemId);
  const stackSize = itemRegistry.getStackSize(itemId);

  // Calculate how much we can actually add
  const weightAvailable = inventory.maxWeight - inventory.currentWeight;
  const maxByWeight = Math.floor(weightAvailable / unitWeight);

  const amountToAdd = Math.min(quantity, maxByWeight);
  let remainingToAdd = amountToAdd;

  if (remainingToAdd === 0) {
    throw new Error(`Inventory weight limit exceeded. Cannot add ${itemId}.`);
  }

  // Try to add to existing stacks first
  for (const slot of inventory.slots) {
    if (slot.itemId === itemId && slot.quantity < stackSize) {
      const spaceInStack = stackSize - slot.quantity;
      const amountForThisStack = Math.min(remainingToAdd, spaceInStack);
      slot.quantity += amountForThisStack;
      remainingToAdd -= amountForThisStack;

      if (remainingToAdd === 0) break;
    }
  }

  // If still have items to add, find empty slots
  if (remainingToAdd > 0) {
    for (const slot of inventory.slots) {
      if (slot.itemId === null || slot.quantity === 0) {
        const amountForThisStack = Math.min(remainingToAdd, stackSize);
        slot.itemId = itemId;
        slot.quantity = amountForThisStack;
        remainingToAdd -= amountForThisStack;

        if (remainingToAdd === 0) break;
      }
    }
  }

  // Recalculate weight from actual slot contents to prevent cache corruption
  // This ensures weight is always accurate and never goes negative
  const actualAmountAdded = amountToAdd - remainingToAdd;

  if (remainingToAdd > 0) {
    // Inventory is full
    throw new Error(`Inventory full. Could only add ${actualAmountAdded} of ${quantity} ${itemId}.`);
  }

  const actualWeight = calculateInventoryWeight({
    ...inventory,
    slots: [...inventory.slots],
  } as InventoryComponent);

  return {
    inventory: {
      ...inventory,
      slots: [...inventory.slots],
      currentWeight: actualWeight,
    },
    amountAdded: actualAmountAdded,
  };
}

/**
 * Add items to inventory with a specific quality.
 * Items with different qualities don't stack together.
 * Throws if inventory is full or weight limit exceeded.
 */
export function addToInventoryWithQuality(
  inventory: InventoryComponent,
  itemId: string,
  quantity: number,
  quality: number,
  instanceId?: string
): { inventory: InventoryComponent; amountAdded: number } {
  if (quantity <= 0) {
    throw new Error(`Cannot add non-positive quantity: ${quantity}`);
  }

  // Use ItemRegistry for weight and stack size
  const unitWeight = itemRegistry.getWeight(itemId);
  const stackSize = itemRegistry.getStackSize(itemId);

  // Calculate how much we can actually add
  const weightAvailable = inventory.maxWeight - inventory.currentWeight;
  const maxByWeight = Math.floor(weightAvailable / unitWeight);

  const amountToAdd = Math.min(quantity, maxByWeight);
  let remainingToAdd = amountToAdd;

  if (remainingToAdd === 0) {
    throw new Error(`Inventory weight limit exceeded. Cannot add ${itemId}.`);
  }

  // Try to add to existing stacks with SAME quality AND instanceId first
  for (const slot of inventory.slots) {
    const sameInstance = instanceId ? slot.instanceId === instanceId : !slot.instanceId;
    if (slot.itemId === itemId && slot.quality === quality && sameInstance && slot.quantity < stackSize) {
      const spaceInStack = stackSize - slot.quantity;
      const amountForThisStack = Math.min(remainingToAdd, spaceInStack);
      slot.quantity += amountForThisStack;
      remainingToAdd -= amountForThisStack;

      if (remainingToAdd === 0) break;
    }
  }

  // If still have items to add, find empty slots
  if (remainingToAdd > 0) {
    for (const slot of inventory.slots) {
      if (slot.itemId === null || slot.quantity === 0) {
        const amountForThisStack = Math.min(remainingToAdd, stackSize);
        slot.itemId = itemId;
        slot.quantity = amountForThisStack;
        slot.quality = quality;
        slot.instanceId = instanceId;
        remainingToAdd -= amountForThisStack;

        if (remainingToAdd === 0) break;
      }
    }
  }

  const actualAmountAdded = amountToAdd - remainingToAdd;

  if (remainingToAdd > 0) {
    throw new Error(`Inventory full. Could only add ${actualAmountAdded} of ${quantity} ${itemId}.`);
  }

  const actualWeight = calculateInventoryWeight({
    ...inventory,
    slots: [...inventory.slots],
  } as InventoryComponent);

  return {
    inventory: {
      ...inventory,
      slots: [...inventory.slots],
      currentWeight: actualWeight,
    },
    amountAdded: actualAmountAdded,
  };
}

/**
 * Add a unique/legendary item to inventory.
 * Legendary items don't stack - each gets its own slot with an instanceId.
 * @throws If inventory is full or weight limit exceeded
 */
export function addLegendaryItemToInventory(
  inventory: InventoryComponent,
  itemId: string,
  quality: number,
  instanceId: string
): { inventory: InventoryComponent; slotIndex: number } {
  // Use ItemRegistry for weight
  const unitWeight = itemRegistry.getWeight(itemId);

  // Check weight capacity
  const weightAvailable = inventory.maxWeight - inventory.currentWeight;
  if (unitWeight > weightAvailable) {
    throw new Error(`Inventory weight limit exceeded. Cannot add legendary ${itemId}.`);
  }

  // Find an empty slot (legendary items always get their own slot)
  const slotIndex = inventory.slots.findIndex(
    slot => slot.itemId === null || slot.quantity === 0
  );

  if (slotIndex === -1) {
    throw new Error(`Inventory full. Cannot add legendary ${itemId}.`);
  }

  // Create new slots array with the legendary item
  const newSlots = [...inventory.slots];
  newSlots[slotIndex] = {
    itemId,
    quantity: 1,
    quality,
    instanceId,
  };

  const actualWeight = calculateInventoryWeight({
    ...inventory,
    slots: newSlots,
  } as InventoryComponent);

  return {
    inventory: {
      ...inventory,
      slots: newSlots,
      currentWeight: actualWeight,
    },
    slotIndex,
  };
}

/**
 * Remove items from inventory. Returns the amount actually removed.
 * Throws if not enough items available.
 */
export function removeFromInventory(
  inventory: InventoryComponent,
  itemId: string,
  quantity: number
): { inventory: InventoryComponent; amountRemoved: number } {
  if (quantity <= 0) {
    throw new Error(`Cannot remove non-positive quantity: ${quantity}`);
  }

  // Count total available
  let totalAvailable = 0;
  for (const slot of inventory.slots) {
    if (slot.itemId === itemId) {
      totalAvailable += slot.quantity;
    }
  }

  if (totalAvailable < quantity) {
    throw new Error(
      `Not enough ${itemId} in inventory. Have ${totalAvailable}, need ${quantity}.`
    );
  }

  // Note: We don't validate item type for removal - if it's in the inventory,
  // it can be removed. Weight calculation uses registry defaults for unknown items.

  let remainingToRemove = quantity;

  // Remove from slots
  for (const slot of inventory.slots) {
    if (slot.itemId === itemId && remainingToRemove > 0) {
      const amountFromThisSlot = Math.min(slot.quantity, remainingToRemove);
      slot.quantity -= amountFromThisSlot;
      remainingToRemove -= amountFromThisSlot;

      // Clear slot if empty
      if (slot.quantity === 0) {
        slot.itemId = null;
      }
    }
  }

  // Recalculate weight from actual slot contents to prevent cache corruption
  // This ensures weight never goes negative due to stale cached values
  const actualWeight = calculateInventoryWeight({
    ...inventory,
    slots: [...inventory.slots],
  } as InventoryComponent);

  return {
    inventory: {
      ...inventory,
      slots: [...inventory.slots],
      currentWeight: actualWeight,
    },
    amountRemoved: quantity,
  };
}

/**
 * Get the total quantity of a specific item in inventory.
 */
export function getItemCount(inventory: InventoryComponent, itemId: string): number {
  let total = 0;
  for (const slot of inventory.slots) {
    if (slot.itemId === itemId) {
      total += slot.quantity;
    }
  }
  return total;
}

/**
 * Check if inventory has enough of an item.
 */
export function hasItem(
  inventory: InventoryComponent,
  itemId: string,
  quantity: number
): boolean {
  return getItemCount(inventory, itemId) >= quantity;
}

/**
 * Convert inventory to a Record<string, number> format for building validation.
 * Used by PlacementValidator to check resource requirements.
 */
export function inventoryToResourceMap(inventory: InventoryComponent): Record<string, number> {
  const map: Record<string, number> = {};

  for (const slot of inventory.slots) {
    if (slot.itemId && slot.quantity > 0) {
      const currentAmount = map[slot.itemId];
      if (currentAmount !== undefined) {
        map[slot.itemId] = currentAmount + slot.quantity;
      } else {
        map[slot.itemId] = slot.quantity;
      }
    }
  }

  return map;
}

/**
 * Get all working (non-broken) tools of a specific type from inventory.
 * Requires ItemInstance to check condition.
 *
 * @param inventory - The inventory to search
 * @param toolType - Type of tool to find (e.g., 'hammer', 'axe')
 * @returns Array of working tool instances with their slot information
 */
export function getWorkingTools(
  inventory: InventoryComponent,
  toolType: string
): Array<{ slotIndex: number; instanceId: string; itemId: string; condition: number }> {
  const { itemInstanceRegistry } = require('../items/ItemInstanceRegistry.js');
  const { itemRegistry } = require('../items/ItemRegistry.js');

  const workingTools: Array<{ slotIndex: number; instanceId: string; itemId: string; condition: number }> = [];

  for (let i = 0; i < inventory.slots.length; i++) {
    const slot = inventory.slots[i];
    if (!slot || !slot.itemId || !slot.instanceId) continue;

    // Get item definition to check if it's a tool
    const definition = itemRegistry.get(slot.itemId);
    if (!definition || !definition.traits?.tool) continue;

    // Check if tool type matches
    const toolTrait = definition.traits.tool;
    if (toolTrait.toolType !== toolType) continue;

    // Check tool condition
    try {
      const instance = itemInstanceRegistry.get(slot.instanceId);
      if (instance.condition > 0) {
        workingTools.push({
          slotIndex: i,
          instanceId: slot.instanceId,
          itemId: slot.itemId,
          condition: instance.condition,
        });
      }
    } catch {
      // Instance not found, skip
      continue;
    }
  }

  return workingTools;
}

/**
 * Get a working tool of the specified type or throw an error.
 * Convenience wrapper around getWorkingTools for cases where a tool is required.
 *
 * @param inventory - The inventory to search
 * @param toolType - Type of tool required (e.g., 'hammer', 'axe')
 * @returns First working tool found
 * @throws Error if no working tools of the specified type are available
 */
export function getWorkingToolOrThrow(
  inventory: InventoryComponent,
  toolType: string
): { slotIndex: number; instanceId: string; itemId: string; condition: number } {
  const workingTools = getWorkingTools(inventory, toolType);

  if (workingTools.length === 0) {
    throw new Error(
      `No working ${toolType} available. All ${toolType} tools are broken (0 condition). ` +
      `Repair or craft new ${toolType} tools.`
    );
  }

  return workingTools[0]!;
}
