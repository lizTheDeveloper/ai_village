/**
 * Weapons Data Loader
 *
 * Loads weapon definitions from JSON data files.
 * Provides type-safe access to weapon definitions.
 */

import type { ItemDefinition, ItemCategory } from '../items/ItemDefinition.js';
import { defineItem } from '../items/ItemDefinition.js';
import weaponsData from './weapons.json';

/**
 * Convert JSON weapon data to ItemDefinition
 */
function jsonToWeapon(data: Record<string, unknown>): ItemDefinition {
  const {
    id,
    name,
    category,
    weight,
    stackSize,
    baseValue,
    rarity,
    baseMaterial,
    clarketechTier,
    researchRequired,
    weapon,
    magical,
  } = data;

  if (typeof id !== 'string' || typeof name !== 'string' || typeof category !== 'string') {
    throw new Error('Weapon data must have string id, name, and category');
  }

  // Map category to valid ItemCategory (weapons map to 'equipment')
  const validCategories: ItemCategory[] = ['resource', 'food', 'seed', 'tool', 'material', 'consumable', 'equipment', 'ammo', 'misc'];
  // Map 'weapon', 'armor' to 'equipment', others to 'misc' if not valid
  const categoryMap: Record<string, ItemCategory> = {
    weapon: 'equipment',
    armor: 'equipment',
  };
  const mappedCategory: ItemCategory = categoryMap[category] ?? (validCategories.includes(category as ItemCategory) ? category as ItemCategory : 'misc');

  const traits: Record<string, unknown> = {};

  if (weapon && typeof weapon === 'object' && weapon !== null) {
    traits.weapon = { ...weapon as object };
    // Convert ammo and projectile if present
    const weaponObj = weapon as Record<string, unknown>;
    if (weaponObj.ammo && typeof weaponObj.ammo === 'object') {
      (traits.weapon as Record<string, unknown>).ammo = { ...weaponObj.ammo as object };
    }
    if (weaponObj.projectile && typeof weaponObj.projectile === 'object') {
      (traits.weapon as Record<string, unknown>).projectile = { ...weaponObj.projectile as object };
    }
  }

  if (magical && typeof magical === 'object' && magical !== null) {
    traits.magical = { ...magical as object };
  }

  const options: Record<string, unknown> = {
    weight,
    stackSize,
    baseValue,
    rarity,
    traits,
  };

  if (baseMaterial) options.baseMaterial = baseMaterial;
  if (clarketechTier) options.clarketechTier = clarketechTier;
  if (researchRequired) options.researchRequired = researchRequired;

  return defineItem(id, name, mappedCategory, options);
}

/**
 * Load all weapons from a category
 */
function loadWeaponCategory(categoryData: unknown): ItemDefinition[] {
  if (!categoryData) return [];

  // If categoryData is directly an array of weapons, convert them
  if (Array.isArray(categoryData)) {
    return categoryData.map((item) => {
      if (typeof item !== 'object' || item === null) {
        throw new Error('Weapon item must be an object');
      }
      return jsonToWeapon(item as Record<string, unknown>);
    });
  }

  if (typeof categoryData !== 'object' || categoryData === null) {
    return [];
  }

  const weapons: ItemDefinition[] = [];

  // Handle nested subcategories
  for (const key of Object.keys(categoryData)) {
    const data = (categoryData as Record<string, unknown>)[key];

    if (Array.isArray(data)) {
      // Subcategory array
      weapons.push(...data.map((item) => {
        if (typeof item !== 'object' || item === null) {
          throw new Error('Weapon item must be an object');
        }
        return jsonToWeapon(item as Record<string, unknown>);
      }));
    } else if (typeof data === 'object' && data !== null) {
      // Nested object - recurse
      weapons.push(...loadWeaponCategory(data));
    }
  }

  return weapons;
}

/**
 * Weapons organized by category
 */
export class WeaponsLoader {
  private static _allWeapons: ItemDefinition[] | null = null;
  private static _byCategory: Map<string, ItemDefinition[]> = new Map();

  /**
   * Get all weapons
   */
  static getAllWeapons(): ItemDefinition[] {
    if (!this._allWeapons) {
      this._allWeapons = [];

      for (const categoryKey of Object.keys(weaponsData)) {
        const categoryWeapons = loadWeaponCategory((weaponsData as Record<string, unknown>)[categoryKey]);
        this._allWeapons.push(...categoryWeapons);
        this._byCategory.set(categoryKey, categoryWeapons);
      }
    }

    return this._allWeapons;
  }

  /**
   * Get weapons by category
   */
  static getByCategory(category: string): ItemDefinition[] {
    if (this._byCategory.size === 0) {
      this.getAllWeapons(); // Initialize cache
    }

    return this._byCategory.get(category) || [];
  }

  /**
   * Get weapon by ID
   */
  static getById(id: string): ItemDefinition | undefined {
    return this.getAllWeapons().find(w => w.id === id);
  }

  /**
   * Get count by category
   */
  static getCategoryCounts(): Record<string, number> {
    if (this._byCategory.size === 0) {
      this.getAllWeapons(); // Initialize cache
    }

    const counts: Record<string, number> = {};
    for (const [category, weapons] of this._byCategory.entries()) {
      counts[category] = weapons.length;
    }
    return counts;
  }

  /**
   * Clear cache (for testing)
   */
  static clearCache(): void {
    this._allWeapons = null;
    this._byCategory.clear();
  }
}

/**
 * Lazy getter functions for backward compatibility
 */
export function getCreativeWeapons(): ItemDefinition[] {
  return WeaponsLoader.getByCategory('creative');
}

export function getMeleeWeapons(): ItemDefinition[] {
  return WeaponsLoader.getByCategory('melee');
}

export function getFirearms(): ItemDefinition[] {
  return WeaponsLoader.getByCategory('firearms');
}

export function getMagicWeapons(): ItemDefinition[] {
  return WeaponsLoader.getByCategory('magic');
}

export function getExoticWeapons(): ItemDefinition[] {
  return WeaponsLoader.getByCategory('exotic');
}

export function getRangedWeapons(): ItemDefinition[] {
  return WeaponsLoader.getByCategory('ranged');
}

export function getEnergyWeapons(): ItemDefinition[] {
  return WeaponsLoader.getByCategory('energy');
}

export function getAllWeaponsArray(): ItemDefinition[] {
  return WeaponsLoader.getAllWeapons();
}

// Deprecated backward compatibility exports removed
// Use getter functions instead: getCreativeWeapons(), getMeleeWeapons(), etc.
