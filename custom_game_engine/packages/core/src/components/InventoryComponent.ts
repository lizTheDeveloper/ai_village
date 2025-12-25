import type { Component } from '../ecs/Component.js';
import type { ResourceType } from './ResourceComponent.js';

/**
 * Resource weight table (units per item).
 * Based on items-system/spec.md
 */
const RESOURCE_WEIGHTS: Record<ResourceType, number> = {
  wood: 2,
  stone: 3,
  food: 1,
  water: 1,
};

/**
 * Weight table for consumable items (kg per item).
 * These are items that aren't basic resources but are still tracked by weight.
 */
const ITEM_WEIGHTS: Record<string, number> = {
  berry: 0.1, // Berries are lightweight
  stew: 0.5,  // Prepared food has moderate weight
  beer: 0.8,  // Liquids in containers are heavier
};

/**
 * Stack size limits per resource type.
 */
const RESOURCE_STACK_SIZES: Record<ResourceType, number> = {
  wood: 50,
  stone: 30,
  food: 20,
  water: 10,
};

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
 */
export function getResourceWeight(resourceType: ResourceType): number {
  const weight = RESOURCE_WEIGHTS[resourceType];
  if (weight === undefined) {
    throw new Error(`Unknown resource type: ${resourceType}`);
  }
  return weight;
}

/**
 * Get the maximum stack size for a resource.
 */
export function getResourceStackSize(resourceType: ResourceType): number {
  const stackSize = RESOURCE_STACK_SIZES[resourceType];
  if (stackSize === undefined) {
    throw new Error(`Unknown resource type: ${resourceType}`);
  }
  return stackSize;
}

/**
 * Calculate total weight of inventory.
 * CRITICAL: This function must never return negative values.
 * Always recalculates from actual slot contents to prevent stale cached values.
 */
export function calculateInventoryWeight(inventory: InventoryComponent): number {
  let totalWeight = 0;

  for (const slot of inventory.slots) {
    if (slot.itemId && slot.quantity > 0) {
      let unitWeight = 0;

      // Check if it's a resource type
      if (isResourceType(slot.itemId)) {
        unitWeight = getResourceWeight(slot.itemId as ResourceType);
      }
      // Check if it's a known consumable item
      else if (slot.itemId in ITEM_WEIGHTS) {
        const itemWeight = ITEM_WEIGHTS[slot.itemId];
        if (itemWeight !== undefined) {
          unitWeight = itemWeight;
        } else {
          // Fallback for undefined (should never happen due to 'in' check)
          unitWeight = 0.5;
        }
      }
      // Check if it's a seed
      else if (isSeedType(slot.itemId)) {
        unitWeight = 0.1; // Seeds are lightweight
      }
      // Unknown item type - log warning but don't crash
      else {
        console.warn(`[InventoryComponent] Unknown item type for weight calculation: ${slot.itemId}. Using default weight 0.5 kg.`);
        unitWeight = 0.5; // Default moderate weight for unknown items
      }

      totalWeight += unitWeight * slot.quantity;
    }
  }

  return totalWeight;
}

/**
 * Check if a string is a valid ResourceType.
 */
export function isResourceType(itemId: string): boolean {
  return itemId === 'food' || itemId === 'wood' || itemId === 'stone' || itemId === 'water';
}

/**
 * Check if a string is a seed item ID (format: "seed:{speciesId}")
 */
export function isSeedType(itemId: string): boolean {
  return itemId.startsWith('seed:');
}

/**
 * Get species ID from seed item ID (format: "seed:{speciesId}")
 */
export function getSeedSpeciesId(itemId: string): string {
  if (!isSeedType(itemId)) {
    throw new Error(`Not a seed item ID: ${itemId}`);
  }
  return itemId.substring(5); // Remove "seed:" prefix
}

/**
 * Create seed item ID from species ID
 */
export function createSeedItemId(speciesId: string): string {
  return `seed:${speciesId}`;
}

/**
 * Add items to inventory. Returns the amount actually added.
 * Throws if inventory is full or weight limit exceeded.
 */
export function addToInventory(
  inventory: InventoryComponent,
  itemId: string,
  quantity: number
): { inventory: InventoryComponent; amountAdded: number } {
  if (quantity <= 0) {
    throw new Error(`Cannot add non-positive quantity: ${quantity}`);
  }

  let unitWeight: number;
  let stackSize: number;

  if (isResourceType(itemId)) {
    const resourceType = itemId as ResourceType;
    unitWeight = getResourceWeight(resourceType);
    stackSize = getResourceStackSize(resourceType);
  } else if (isSeedType(itemId)) {
    // Seeds are lightweight and stack well
    unitWeight = 0.1; // 0.1 units per seed
    stackSize = 100; // 100 seeds per stack
  } else {
    throw new Error(`Unknown item type: ${itemId}. Supported: resources, seeds (seed:speciesId).`);
  }

  // Calculate how much we can actually add
  const weightAvailable = inventory.maxWeight - inventory.currentWeight;
  const maxByWeight = Math.floor(weightAvailable / unitWeight);

  let amountToAdd = Math.min(quantity, maxByWeight);
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

  // Validate item type exists (weight calculation happens in calculateInventoryWeight)
  if (!isResourceType(itemId) && !isSeedType(itemId)) {
    throw new Error(`Unknown item type for removal: ${itemId}`);
  }

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
