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

// Trait system (Phase 29)
export {
  type ItemTraits,
} from './ItemTraits.js';

export {
  type EdibleTrait,
  type FlavorType as EdibleFlavorType,
} from './traits/EdibleTrait.js';

export {
  type WeaponTrait,
  type DamageType,
} from './traits/WeaponTrait.js';

export {
  type MagicalTrait,
  type EffectExpression,
} from './traits/MagicalTrait.js';

export {
  type ContainerTrait,
} from './traits/ContainerTrait.js';

export {
  type ToolTrait,
  type ToolType,
} from './traits/ToolTrait.js';

// Item instances (Phase 29)
export {
  type ItemInstance,
  type ItemQuality as ItemQualityTier,
  getQualityTier as getItemQualityTier,
} from './ItemInstance.js';

export {
  ItemInstanceRegistry,
  itemInstanceRegistry,
} from './ItemInstanceRegistry.js';

// Migration utilities (Phase 29)
export {
  migrateItemDefinitionV1toV2,
  migrateItemDefinitions,
  isItemDefinitionV1,
  isItemDefinitionV2,
  getEffectiveEdibleData,
} from './migration.js';

// Registry
export {
  ItemRegistry,
  ItemNotFoundError,
  DuplicateItemError,
  itemRegistry,
} from './ItemRegistry.js';

// Default items - Phase 3: Content Extraction (now loaded from JSON)
export {
  getAllItems as DEFAULT_ITEMS,
  getResourceItems as RESOURCE_ITEMS,
  getFoodItems as FOOD_ITEMS,
  getMaterialItems as MATERIAL_ITEMS,
  getToolItems as TOOL_ITEMS,
} from '../data/ItemsLoader.js';

// Registration function still from TypeScript
export { registerDefaultItems } from './defaultItems.js';

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

// Armor trait (forward-compatibility)
export {
  type ArmorTrait,
  type ArmorSlot,
} from './traits/ArmorTrait.js';

// Material trait (surreal building materials)
export {
  type MaterialTrait,
} from './traits/MaterialTrait.js';

// Artifact system (forward-compatibility)
export {
  type StrangeMoodType,
  type MoodMaterialRequirement,
  type StrangeMood,
  type DecorationType,
  type ArtifactImage,
  type ArtifactImageSubject,
  type ArtifactDecoration,
  type ArtifactRarity,
  type Artifact,
  type ArtifactHistoryEntry,
  type ArtifactEvent,
  type ArtifactRegistry,
  generateArtifactName,
  createArtifactFromMood,
  createMasterwork,
  recordArtifactEvent,
} from './ArtifactSystem.js';

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
import { getAllItems } from '../data/ItemsLoader.js';  // Phase 3: From JSON
import { DEFAULT_SEEDS } from './SeedItemFactory.js';

// Register all default items and seeds at module load time
if (itemRegistry.size === 0) {
  itemRegistry.registerAll(getAllItems());
  itemRegistry.registerAll(DEFAULT_SEEDS);
}
