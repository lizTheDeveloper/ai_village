/**
 * ItemRegistry - Central registry for all item definitions
 *
 * Provides O(1) lookups for item properties and validation.
 * All items must be registered before use.
 *
 * Part of the Item System refactor (work-order: item-system)
 */

import type { ItemDefinition, ItemCategory } from './ItemDefinition.js';

/**
 * Error thrown when an item is not found in the registry
 */
export class ItemNotFoundError extends Error {
  constructor(public readonly itemId: string) {
    super(`Item not found: '${itemId}'. Make sure the item is registered in the ItemRegistry.`);
    this.name = 'ItemNotFoundError';
  }
}

/**
 * Error thrown when trying to register a duplicate item
 */
export class DuplicateItemError extends Error {
  constructor(public readonly itemId: string) {
    super(`Item already registered: '${itemId}'. Use a unique ID or call unregister() first.`);
    this.name = 'DuplicateItemError';
  }
}

/**
 * Central registry for item definitions
 */
export class ItemRegistry {
  private items: Map<string, ItemDefinition> = new Map();

  /**
   * Register a new item definition
   * @throws DuplicateItemError if item already exists
   */
  register(item: ItemDefinition): void {
    if (this.items.has(item.id)) {
      throw new DuplicateItemError(item.id);
    }
    this.items.set(item.id, item);
  }

  /**
   * Register multiple items at once
   * @throws DuplicateItemError if any item already exists
   */
  registerAll(items: readonly ItemDefinition[]): void {
    for (const item of items) {
      this.register(item);
    }
  }

  /**
   * Unregister an item (useful for testing or dynamic items)
   */
  unregister(itemId: string): boolean {
    return this.items.delete(itemId);
  }

  /**
   * Clear all registered items (useful for testing)
   */
  clear(): void {
    this.items.clear();
  }

  /**
   * Get item definition by ID
   * @throws ItemNotFoundError if item doesn't exist
   */
  get(itemId: string): ItemDefinition {
    const item = this.items.get(itemId);
    if (!item) {
      throw new ItemNotFoundError(itemId);
    }
    return item;
  }

  /**
   * Get item definition or undefined if not found
   */
  tryGet(itemId: string): ItemDefinition | undefined {
    return this.items.get(itemId);
  }

  /**
   * Check if an item exists in the registry
   */
  has(itemId: string): boolean {
    return this.items.has(itemId);
  }

  /**
   * Validate that an item ID exists
   * @throws ItemNotFoundError if item doesn't exist
   */
  validate(itemId: string): void {
    if (!this.items.has(itemId)) {
      throw new ItemNotFoundError(itemId);
    }
  }

  /**
   * Get all registered items
   */
  getAll(): ItemDefinition[] {
    return Array.from(this.items.values());
  }

  /**
   * Get all items in a specific category
   */
  getByCategory(category: ItemCategory): ItemDefinition[] {
    return this.getAll().filter(item => item.category === category);
  }

  /**
   * Get all edible items
   */
  getEdibleItems(): ItemDefinition[] {
    return this.getAll().filter(item => item.isEdible);
  }

  /**
   * Get all storable items
   */
  getStorableItems(): ItemDefinition[] {
    return this.getAll().filter(item => item.isStorable);
  }

  /**
   * Get all gatherable items
   */
  getGatherableItems(): ItemDefinition[] {
    return this.getAll().filter(item => item.isGatherable);
  }

  /**
   * Get items that can be gathered from a specific source
   */
  getItemsFromSource(sourceType: string): ItemDefinition[] {
    return this.getAll().filter(
      item => item.gatherSources?.includes(sourceType)
    );
  }

  /**
   * Get the number of registered items
   */
  get size(): number {
    return this.items.size;
  }

  // =========================================================================
  // Convenience methods for common checks (replaces scattered hardcoded logic)
  // =========================================================================

  /**
   * Check if an item is edible (can be eaten)
   */
  isEdible(itemId: string): boolean {
    return this.tryGet(itemId)?.isEdible ?? false;
  }

  /**
   * Check if an item is storable (can be deposited)
   */
  isStorable(itemId: string): boolean {
    return this.tryGet(itemId)?.isStorable ?? false;
  }

  /**
   * Check if an item is gatherable from the world
   */
  isGatherable(itemId: string): boolean {
    return this.tryGet(itemId)?.isGatherable ?? false;
  }

  /**
   * Check if an item is in a specific category
   */
  isCategory(itemId: string, category: ItemCategory): boolean {
    return this.tryGet(itemId)?.category === category;
  }

  /**
   * Check if an item is a resource
   */
  isResource(itemId: string): boolean {
    return this.isCategory(itemId, 'resource');
  }

  /**
   * Check if an item is food
   */
  isFood(itemId: string): boolean {
    return this.isCategory(itemId, 'food');
  }

  /**
   * Check if an item is a seed
   */
  isSeed(itemId: string): boolean {
    return this.isCategory(itemId, 'seed');
  }

  /**
   * Get item weight (returns default 1.0 if not found)
   */
  getWeight(itemId: string): number {
    return this.tryGet(itemId)?.weight ?? 1.0;
  }

  /**
   * Get item stack size (returns default 50 if not found)
   */
  getStackSize(itemId: string): number {
    return this.tryGet(itemId)?.stackSize ?? 50;
  }

  /**
   * Get hunger restored by eating item (returns 0 if not edible)
   */
  getHungerRestored(itemId: string): number {
    const item = this.tryGet(itemId);
    if (!item?.isEdible) return 0;
    return item.hungerRestored ?? 0;
  }
}

/**
 * Global item registry singleton
 *
 * Usage:
 * ```typescript
 * import { itemRegistry } from './items/ItemRegistry.js';
 *
 * // Check if item is edible
 * if (itemRegistry.isEdible('berry')) { ... }
 *
 * // Get item weight
 * const weight = itemRegistry.getWeight('wood');
 *
 * // Get full item definition
 * const item = itemRegistry.get('stone');
 * ```
 */
export const itemRegistry = new ItemRegistry();
