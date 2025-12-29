/**
 * ItemDefinition - Central definition for all item properties
 *
 * This interface defines everything about an item in one place:
 * - Physical properties (weight, stackSize)
 * - Behavior flags (isEdible, isStorable, isGatherable)
 * - Relationships (craftedFrom, growsInto)
 * - Food attributes (quality, flavors)
 *
 * Part of the Item System refactor (work-order: item-system)
 */

/**
 * Flavor types for food preference system.
 */
export type FlavorType = 'sweet' | 'savory' | 'spicy' | 'bitter' | 'sour' | 'umami';

/**
 * Item categories for filtering and grouping
 */
export type ItemCategory =
  | 'resource'      // wood, stone, fiber, etc.
  | 'food'          // berry, wheat, bread, etc.
  | 'seed'          // seed:oak, seed:berry_bush, etc.
  | 'tool'          // axe, pickaxe, hoe, etc.
  | 'material'      // iron_ingot, cloth, etc.
  | 'consumable'    // potion, medicine, etc.
  | 'equipment'     // armor, weapons, etc.
  | 'misc';         // everything else

/**
 * Item rarity tiers affecting value
 */
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/**
 * Crafting ingredient specification
 */
export interface CraftingIngredient {
  itemId: string;
  amount: number;
}

/**
 * Complete definition of an item type
 */
export interface ItemDefinition {
  /** Unique item ID (e.g., 'berry', 'wood', 'seed:oak') */
  readonly id: string;

  /** Human-readable display name */
  readonly displayName: string;

  /** Item category for filtering/grouping */
  readonly category: ItemCategory;

  /** Weight per unit (affects inventory capacity) */
  readonly weight: number;

  /** Maximum stack size in a single slot */
  readonly stackSize: number;

  /** Whether this item can be eaten to restore hunger */
  readonly isEdible: boolean;

  /** Hunger restored when eaten (if isEdible) */
  readonly hungerRestored?: number;

  /** Food quality affecting mood satisfaction (0-100, higher = better) */
  readonly quality?: number;

  /** Flavor profile for food preference system */
  readonly flavors?: readonly FlavorType[];

  /** Whether this item can be deposited to storage */
  readonly isStorable: boolean;

  /** Whether this item can be gathered from the world */
  readonly isGatherable: boolean;

  /** Optional: Source entity types this can be gathered from */
  readonly gatherSources?: readonly string[];

  /** Optional: Tool required to gather (e.g., 'axe' for wood) */
  readonly requiredTool?: string;

  /** Optional: Crafting recipe inputs */
  readonly craftedFrom?: readonly CraftingIngredient[];

  /** Optional: For seeds - the plant species this grows into */
  readonly growsInto?: string;

  /** Base value in currency (for economy system) */
  readonly baseValue: number;

  /** Rarity tier (affects market value) */
  readonly rarity: ItemRarity;

  /** Optional: Custom metadata for extensions */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Builder for creating ItemDefinition with defaults
 */
export function defineItem(
  id: string,
  displayName: string,
  category: ItemCategory,
  overrides: Partial<Omit<ItemDefinition, 'id' | 'displayName' | 'category'>> = {}
): ItemDefinition {
  return {
    id,
    displayName,
    category,
    weight: overrides.weight ?? 1.0,
    stackSize: overrides.stackSize ?? 50,
    isEdible: overrides.isEdible ?? false,
    hungerRestored: overrides.hungerRestored,
    quality: overrides.quality,
    flavors: overrides.flavors,
    isStorable: overrides.isStorable ?? true,
    isGatherable: overrides.isGatherable ?? false,
    gatherSources: overrides.gatherSources,
    requiredTool: overrides.requiredTool,
    craftedFrom: overrides.craftedFrom,
    growsInto: overrides.growsInto,
    baseValue: overrides.baseValue ?? 10,
    rarity: overrides.rarity ?? 'common',
    metadata: overrides.metadata,
  };
}
