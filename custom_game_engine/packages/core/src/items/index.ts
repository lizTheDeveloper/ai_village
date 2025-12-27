/**
 * Item System
 *
 * Centralized item definitions and registry for all game items.
 *
 * Usage:
 * ```typescript
 * import { itemRegistry, registerDefaultItems } from './items/index.js';
 *
 * // Register default items at startup
 * registerDefaultItems(itemRegistry);
 *
 * // Check item properties
 * if (itemRegistry.isEdible('berry')) {
 *   const hunger = itemRegistry.getHungerRestored('berry');
 * }
 *
 * // Get full item definition
 * const item = itemRegistry.get('wood');
 * console.log(item.weight, item.stackSize);
 * ```
 *
 * Part of the Item System refactor (work-order: item-system)
 */

// Core types and interfaces
export {
  type ItemDefinition,
  type ItemCategory,
  type CraftingIngredient,
  defineItem,
} from './ItemDefinition.js';

// Registry
export {
  ItemRegistry,
  ItemNotFoundError,
  DuplicateItemError,
  itemRegistry,
} from './ItemRegistry.js';

// Default items
export {
  DEFAULT_ITEMS,
  RESOURCE_ITEMS,
  FOOD_ITEMS,
  MATERIAL_ITEMS,
  TOOL_ITEMS,
  registerDefaultItems,
} from './defaultItems.js';

// Seed factory
export {
  SEED_PREFIX,
  isSeedItemId,
  getSeedSpeciesId,
  createSeedItemId,
  createSeedItem,
  DEFAULT_SEEDS,
  registerDefaultSeeds,
  registerSeedsForSpecies,
  type PlantSpeciesInfo,
} from './SeedItemFactory.js';
