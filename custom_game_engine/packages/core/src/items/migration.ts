import { ItemDefinition, FlavorType } from './ItemDefinition';
import { ItemTraits } from './ItemTraits';
import { FlavorType as EdibleFlavorType } from './traits/EdibleTrait';

/**
 * Migration utilities for ItemDefinition v1 → v2.
 *
 * v1: Flat flags (isEdible, hungerRestored, quality, flavors)
 * v2: Trait-based composition (traits.edible, traits.weapon, etc.)
 */

/**
 * Convert old flavor type to new edible trait flavor type.
 */
function migrateFlavorType(oldFlavor: FlavorType): EdibleFlavorType {
  // Types are compatible, but this function exists for explicitness
  return oldFlavor as EdibleFlavorType;
}

/**
 * Migrate ItemDefinition from v1 (flat flags) to v2 (traits).
 *
 * This function:
 * 1. Checks if item has flat edible flags
 * 2. Converts them to traits.edible
 * 3. Preserves all other fields
 * 4. Does NOT remove deprecated fields (backward compatibility)
 *
 * @param def ItemDefinition with v1 format
 * @returns ItemDefinition with v2 traits added
 */
export function migrateItemDefinitionV1toV2(def: ItemDefinition): ItemDefinition {
  // If already has traits, assume it's v2 - no migration needed
  if (def.traits) {
    return def;
  }

  // Build traits object
  const traits: ItemTraits = {};

  // Migrate edible flags → EdibleTrait
  if (def.isEdible) {
    if (def.hungerRestored === undefined) {
      throw new Error(
        `Item '${def.id}' has isEdible=true but missing hungerRestored. Cannot migrate.`
      );
    }

    traits.edible = {
      hungerRestored: def.hungerRestored,
      quality: def.quality ?? 50,
      flavors: def.flavors
        ? def.flavors.map(migrateFlavorType)
        : [],
    };
  }

  // Return new definition with traits added
  return {
    ...def,
    traits: Object.keys(traits).length > 0 ? traits : undefined,
  };
}

/**
 * Migrate multiple ItemDefinitions in batch.
 */
export function migrateItemDefinitions(defs: ItemDefinition[]): ItemDefinition[] {
  return defs.map(migrateItemDefinitionV1toV2);
}

/**
 * Check if an ItemDefinition is v1 (has flat flags but no traits).
 */
export function isItemDefinitionV1(def: ItemDefinition): boolean {
  return !def.traits && (def.isEdible || def.quality !== undefined);
}

/**
 * Check if an ItemDefinition is v2 (has traits).
 */
export function isItemDefinitionV2(def: ItemDefinition): boolean {
  return def.traits !== undefined;
}

/**
 * Get effective edible data from either v1 flags or v2 traits.
 * Prefers v2 traits if present.
 */
export function getEffectiveEdibleData(def: ItemDefinition): {
  isEdible: boolean;
  hungerRestored: number;
  quality: number;
  flavors: EdibleFlavorType[];
} | null {
  // Try v2 first
  if (def.traits?.edible) {
    return {
      isEdible: true,
      hungerRestored: def.traits.edible.hungerRestored,
      quality: def.traits.edible.quality,
      flavors: def.traits.edible.flavors,
    };
  }

  // Fall back to v1
  if (def.isEdible && def.hungerRestored !== undefined) {
    return {
      isEdible: true,
      hungerRestored: def.hungerRestored,
      quality: def.quality ?? 50,
      flavors: def.flavors ? def.flavors.map(migrateFlavorType) : [],
    };
  }

  return null;
}
