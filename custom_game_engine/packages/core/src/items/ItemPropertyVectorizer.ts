/**
 * ItemPropertyVectorizer — converts ItemDefinitions to dense float vectors.
 *
 * Used as the input representation for the AffordanceNetwork.
 *
 * Vector layout (56 dims total):
 *   [0–8]   category one-hot (9 categories)
 *   [9]     weight (log-normalized, 0–1)
 *   [10]    stackSize (log-normalized, 0–1)
 *   [11]    isEdible flag
 *   [12]    isStorable flag
 *   [13]    isGatherable flag
 *   [14–23] trait presence flags (10 traits)
 *   [24–26] EdibleTrait: hungerRestored/100, quality/100, hydrating
 *   [27–29] WeaponTrait: damage/100, range/20, attackSpeed/5
 *   [30–41] ToolTrait: efficiency/3 + toolType one-hot (12 types)
 *   [42–43] MagicalTrait: manaCost/100, charges/20
 *   [44–48] ArmorTrait: defense/50 + armorClass one-hot (4 classes)
 *   [49–52] MaterialTrait: isLiving, isTransient, isSolid, manaPerUnit/10
 *   [53]    clarketechTier/8
 *   [54]    baseValue (log-normalized, 0–1)
 *   [55]    reserved (always 0)
 */

import type { ItemDefinition, ItemCategory } from './ItemDefinition.js';
import type { ItemRegistry } from './ItemRegistry.js';

export const VECTOR_DIMENSIONS = 56;

const CATEGORIES: ItemCategory[] = [
  'resource', 'food', 'seed', 'tool', 'material',
  'consumable', 'equipment', 'ammo', 'misc',
];

const TOOL_TYPES = [
  'axe', 'pickaxe', 'hammer', 'saw', 'hoe',
  'sickle', 'knife', 'needle', 'chisel', 'tongs', 'bellows', 'watering_can',
] as const;

const ARMOR_CLASSES = ['clothing', 'light', 'medium', 'heavy'] as const;

const TRAIT_NAMES: ReadonlyArray<keyof import('./ItemTraits.js').ItemTraits> = [
  'edible', 'weapon', 'magical', 'container', 'tool',
  'armor', 'statBonus', 'ammo', 'material',
];

function logNorm(value: number, max: number): number {
  if (value <= 0) return 0;
  return Math.min(Math.log1p(value) / Math.log1p(max), 1);
}

/**
 * Encode an ItemDefinition as a 56-dimensional float vector.
 */
export function vectorizeItem(item: ItemDefinition): Float32Array {
  const v = new Float32Array(VECTOR_DIMENSIONS);
  let i = 0;

  // [0–8] category one-hot
  const catIdx = CATEGORIES.indexOf(item.category);
  if (catIdx >= 0) v[i + catIdx] = 1;
  i += 9;

  // [9] weight log-normalized (max ~100 kg for heaviest items)
  v[i++] = logNorm(item.weight, 100);

  // [10] stackSize log-normalized (max 999)
  v[i++] = logNorm(item.stackSize, 999);

  // [11–13] boolean flags
  v[i++] = item.isEdible ? 1 : 0;
  v[i++] = item.isStorable ? 1 : 0;
  v[i++] = item.isGatherable ? 1 : 0;

  // [14–23] trait presence flags
  const traits = item.traits;
  for (const name of TRAIT_NAMES) {
    v[i++] = traits && traits[name] ? 1 : 0;
  }

  // [24–26] EdibleTrait
  if (traits?.edible) {
    v[i]     = Math.min(traits.edible.hungerRestored / 100, 1);
    v[i + 1] = Math.min(traits.edible.quality / 100, 1);
    v[i + 2] = traits.edible.hydrating ? 1 : 0;
  }
  i += 3;

  // [27–29] WeaponTrait
  if (traits?.weapon) {
    v[i]     = logNorm(traits.weapon.damage, 100);
    v[i + 1] = Math.min(traits.weapon.range / 20, 1);
    v[i + 2] = Math.min(traits.weapon.attackSpeed / 5, 1);
  }
  i += 3;

  // [30–41] ToolTrait: efficiency + toolType one-hot (12)
  if (traits?.tool) {
    v[i] = Math.min(traits.tool.efficiency / 3, 1);
    const toolIdx = TOOL_TYPES.indexOf(traits.tool.toolType as typeof TOOL_TYPES[number]);
    if (toolIdx >= 0) v[i + 1 + toolIdx] = 1;
  }
  i += 13;

  // [42–43] MagicalTrait
  if (traits?.magical) {
    v[i]     = logNorm(traits.magical.manaCost ?? 0, 100);
    v[i + 1] = logNorm(traits.magical.charges ?? 0, 20);
  }
  i += 2;

  // [44–48] ArmorTrait: defense + armorClass one-hot (4)
  if (traits?.armor) {
    v[i] = logNorm(traits.armor.defense, 50);
    const acIdx = ARMOR_CLASSES.indexOf(traits.armor.armorClass as typeof ARMOR_CLASSES[number]);
    if (acIdx >= 0) v[i + 1 + acIdx] = 1;
  }
  i += 5;

  // [49–52] MaterialTrait
  if (traits?.material) {
    v[i]     = traits.material.isLiving ? 1 : 0;
    v[i + 1] = traits.material.isTransient ? 1 : 0;
    v[i + 2] = traits.material.isSolid ? 1 : 0;
    v[i + 3] = logNorm(traits.material.manaPerUnit ?? 0, 10);
  }
  i += 4;

  // [53] clarketechTier/8
  const tier = (item as { clarketechTier?: number }).clarketechTier;
  v[i++] = tier != null ? Math.min(tier / 8, 1) : 0;

  // [54] baseValue log-normalized (max ~10000)
  const baseValue = (item as { baseValue?: number }).baseValue;
  v[i++] = baseValue != null ? logNorm(baseValue, 10000) : 0;

  // [55] reserved
  v[i++] = 0;

  return v;
}

/**
 * Builds and caches property vectors for all items in a registry.
 */
export class ItemPropertyVectorizer {
  private cache = new Map<string, Float32Array>();

  constructor(private readonly registry: ItemRegistry) {}

  /**
   * Get (or compute) the property vector for an item.
   */
  getVector(itemId: string): Float32Array {
    const cached = this.cache.get(itemId);
    if (cached) return cached;
    const item = this.registry.get(itemId);
    const vec = vectorizeItem(item);
    this.cache.set(itemId, vec);
    return vec;
  }

  /**
   * Pre-warm the cache for all registered items.
   */
  vectorizeAll(): Map<string, Float32Array> {
    for (const item of this.registry.getAll()) {
      if (!this.cache.has(item.id)) {
        this.cache.set(item.id, vectorizeItem(item));
      }
    }
    return this.cache;
  }

  /**
   * Invalidate a cached vector (call after item definition changes).
   */
  invalidate(itemId: string): void {
    this.cache.delete(itemId);
  }

  clearCache(): void {
    this.cache.clear();
  }
}
