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
 * ```
 *
 * Part of the Item System refactor (work-order: item-system)
 */

// Core types and interfaces
export {
  type ItemDefinition,
  type ItemCategory,
  type ItemRarity,
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

// Data-driven item loading (Phase 5)
export {
  ItemLoader,
  ItemValidationError,
  parseItemData,
  parseItemsFromJson,
  loadItemsFromJson,
  loadItemsFromJsonString,
  type RawItemData,
} from './ItemLoader.js';

// Quality system (Phase 10)
export {
  type ItemQuality,
  getQualityTier,
  getQualityColor,
  getQualityDisplayName,
  calculateCraftingQuality,
  calculateHarvestQuality,
  calculateGatheringQuality,
  getQualityPriceMultiplier,
  DEFAULT_QUALITY,
} from './ItemQuality.js';

// Auto-initialize the global registry with default items
// This must be done after all imports to avoid circular dependencies
import { itemRegistry } from './ItemRegistry.js';
import { DEFAULT_ITEMS } from './defaultItems.js';
import { DEFAULT_SEEDS } from './SeedItemFactory.js';

// Register all default items and seeds at module load time
if (itemRegistry.size === 0) {
  itemRegistry.registerAll(DEFAULT_ITEMS);
  itemRegistry.registerAll(DEFAULT_SEEDS);
}
