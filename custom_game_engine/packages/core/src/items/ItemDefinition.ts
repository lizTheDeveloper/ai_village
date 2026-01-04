/**
 * ItemDefinition - Central definition for all item properties
 *
 * This interface defines everything about an item in one place:
 * - Physical properties (weight, stackSize)
 * - Behavior flags (isEdible, isStorable, isGatherable) - DEPRECATED: use traits
 * - Relationships (craftedFrom, growsInto)
 * - Food attributes (quality, flavors) - DEPRECATED: use traits.edible
 * - Material properties (baseMaterial)
 * - Trait composition (traits)
 * - Self-documenting help entry (help)
 *
 * Part of the Item System refactor (work-order: item-system)
 * Phase 29: Trait Composition - Adds compositional traits (edible, weapon, magical, etc.)
 */

import { ItemTraits } from './ItemTraits';
import type { FlavorType, ItemRarity } from '../types/ItemTypes.js';
import type { ItemHelpEntry } from '../help/HelpEntry.js';

// Re-export for backwards compatibility
export type { FlavorType, ItemRarity };

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
  | 'ammo'          // arrows, bullets, energy cells, etc.
  | 'misc';         // everything else

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

  // ========== NEW: TRAIT-BASED SYSTEM ==========

  /** Material this item is made from (references MaterialRegistry) */
  readonly baseMaterial?: string;

  /** Compositional traits (edible, weapon, magical, container, tool) */
  readonly traits?: ItemTraits;

  // ========== DEPRECATED: FLAT FLAGS (kept for backward compatibility) ==========

  /** @deprecated Use traits.edible instead */
  readonly isEdible: boolean;

  /** @deprecated Use traits.edible.hungerRestored instead */
  readonly hungerRestored?: number;

  /** @deprecated Use traits.edible.quality instead */
  readonly quality?: number;

  /** @deprecated Use traits.edible.flavors instead */
  readonly flavors?: readonly FlavorType[];

  // ========== END DEPRECATED ==========

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

  /** Optional: Self-documenting help entry for wiki generation */
  readonly help?: Partial<ItemHelpEntry>;

  /**
   * Optional: Research ID(s) required to craft/use this item.
   * References research topics from the research system.
   * Can be a single research ID or an array for multiple prerequisites.
   */
  readonly researchRequired?: string | readonly string[];

  /**
   * Optional: Clarketech tier required (1-8).
   * Higher tiers represent more advanced technology.
   * Tier 7+ items are "magic indistinguishable from technology".
   */
  readonly clarketechTier?: number;
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
    baseMaterial: overrides.baseMaterial,
    traits: overrides.traits,
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
    help: overrides.help,
    researchRequired: overrides.researchRequired,
    clarketechTier: overrides.clarketechTier,
  };
}
