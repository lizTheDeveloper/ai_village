/**
 * ItemLoader - Load item definitions from JSON data
 *
 * Supports loading items from:
 * - JSON objects/arrays
 * - JSON files (when used with file system access)
 *
 * Part of the Item System refactor (work-order: item-system) - Phase 5
 */

import type { ItemDefinition, ItemCategory, CraftingIngredient, ItemRarity } from './ItemDefinition.js';
import type { ItemRegistry } from './ItemRegistry.js';

/**
 * Raw JSON format for item definition (before validation)
 */
export interface RawItemData {
  id: string;
  displayName: string;
  category: string;
  weight?: number;
  stackSize?: number;
  isEdible?: boolean;
  hungerRestored?: number;
  isStorable?: boolean;
  isGatherable?: boolean;
  gatherSources?: string[];
  requiredTool?: string;
  craftedFrom?: Array<{ itemId: string; amount: number }>;
  growsInto?: string;
  baseValue?: number;
  rarity?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Validation error for item loading
 */
export class ItemValidationError extends Error {
  constructor(
    public readonly itemId: string,
    public readonly field: string,
    message: string
  ) {
    super(`Invalid item '${itemId}': ${message}`);
    this.name = 'ItemValidationError';
  }
}

/**
 * Valid categories for validation
 */
const VALID_CATEGORIES: ItemCategory[] = [
  'resource',
  'food',
  'seed',
  'tool',
  'material',
  'consumable',
  'equipment',
  'misc',
];

/**
 * Validate and convert raw JSON data to ItemDefinition
 */
export function parseItemData(raw: RawItemData): ItemDefinition {
  // Required fields
  if (!raw.id || typeof raw.id !== 'string') {
    throw new ItemValidationError(raw.id ?? 'unknown', 'id', 'id is required and must be a string');
  }

  if (!raw.displayName || typeof raw.displayName !== 'string') {
    throw new ItemValidationError(raw.id, 'displayName', 'displayName is required and must be a string');
  }

  if (!raw.category || !VALID_CATEGORIES.includes(raw.category as ItemCategory)) {
    throw new ItemValidationError(
      raw.id,
      'category',
      `category must be one of: ${VALID_CATEGORIES.join(', ')}`
    );
  }

  // Validate numeric fields
  if (raw.weight !== undefined && (typeof raw.weight !== 'number' || raw.weight < 0)) {
    throw new ItemValidationError(raw.id, 'weight', 'weight must be a non-negative number');
  }

  if (raw.stackSize !== undefined && (typeof raw.stackSize !== 'number' || raw.stackSize < 1)) {
    throw new ItemValidationError(raw.id, 'stackSize', 'stackSize must be a positive integer');
  }

  if (raw.hungerRestored !== undefined && (typeof raw.hungerRestored !== 'number' || raw.hungerRestored < 0)) {
    throw new ItemValidationError(raw.id, 'hungerRestored', 'hungerRestored must be a non-negative number');
  }

  // Validate crafting recipe
  let craftedFrom: CraftingIngredient[] | undefined;
  if (raw.craftedFrom) {
    if (!Array.isArray(raw.craftedFrom)) {
      throw new ItemValidationError(raw.id, 'craftedFrom', 'craftedFrom must be an array');
    }
    craftedFrom = raw.craftedFrom.map((ing, i) => {
      if (!ing.itemId || typeof ing.itemId !== 'string') {
        throw new ItemValidationError(raw.id, `craftedFrom[${i}].itemId`, 'ingredient itemId is required');
      }
      if (typeof ing.amount !== 'number' || ing.amount < 1) {
        throw new ItemValidationError(raw.id, `craftedFrom[${i}].amount`, 'ingredient amount must be positive');
      }
      return { itemId: ing.itemId, amount: ing.amount };
    });
  }

  // Build validated ItemDefinition
  return {
    id: raw.id,
    displayName: raw.displayName,
    category: raw.category as ItemCategory,
    weight: raw.weight ?? 1.0,
    stackSize: raw.stackSize ?? 50,
    isEdible: raw.isEdible ?? false,
    hungerRestored: raw.hungerRestored,
    isStorable: raw.isStorable ?? true,
    isGatherable: raw.isGatherable ?? false,
    gatherSources: raw.gatherSources,
    requiredTool: raw.requiredTool,
    craftedFrom,
    growsInto: raw.growsInto,
    baseValue: raw.baseValue ?? 10,
    rarity: (raw.rarity as ItemRarity) ?? 'common',
    metadata: raw.metadata,
  };
}

/**
 * Parse multiple items from JSON array
 */
export function parseItemsFromJson(jsonData: RawItemData[]): ItemDefinition[] {
  if (!Array.isArray(jsonData)) {
    throw new Error('Item data must be an array of item definitions');
  }

  return jsonData.map(parseItemData);
}

/**
 * Load and register items from JSON data
 */
export function loadItemsFromJson(
  registry: ItemRegistry,
  jsonData: RawItemData[]
): { loaded: number; errors: ItemValidationError[] } {
  const errors: ItemValidationError[] = [];
  let loaded = 0;

  for (const rawItem of jsonData) {
    try {
      const item = parseItemData(rawItem);
      registry.register(item);
      loaded++;
    } catch (error) {
      if (error instanceof ItemValidationError) {
        errors.push(error);
      } else {
        throw error;
      }
    }
  }

  return { loaded, errors };
}

/**
 * Load items from JSON string
 */
export function loadItemsFromJsonString(
  registry: ItemRegistry,
  jsonString: string
): { loaded: number; errors: ItemValidationError[] } {
  const data = JSON.parse(jsonString) as RawItemData[];
  return loadItemsFromJson(registry, data);
}

/**
 * ItemLoader class for more complex loading scenarios
 */
export class ItemLoader {
  private loadedSources: string[] = [];

  constructor(private readonly registry: ItemRegistry) {}

  /**
   * Load items from a JSON array
   */
  loadFromArray(items: RawItemData[], sourceName: string = 'inline'): void {
    const { loaded, errors } = loadItemsFromJson(this.registry, items);

    if (errors.length > 0) {
      const errorMessages = errors.map(e => e.message).join('\n');
      throw new Error(`Failed to load items from '${sourceName}':\n${errorMessages}`);
    }

    this.loadedSources.push(`${sourceName} (${loaded} items)`);
  }

  /**
   * Load items from a JSON string
   */
  loadFromString(jsonString: string, sourceName: string = 'string'): void {
    const data = JSON.parse(jsonString) as RawItemData[];
    this.loadFromArray(data, sourceName);
  }

  /**
   * Get list of loaded sources
   */
  getLoadedSources(): readonly string[] {
    return this.loadedSources;
  }

  /**
   * Get current registry size
   */
  getItemCount(): number {
    return this.registry.size;
  }
}
