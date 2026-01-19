/**
 * Weapons Data Loader
 *
 * Loads weapon definitions from JSON data files with lazy loading.
 * Provides type-safe access to weapon definitions.
 */

import type { ItemDefinition } from '../items/ItemDefinition.js';
import { defineItem } from '../items/ItemDefinition.js';

/**
 * Convert JSON weapon data to ItemDefinition
 */
function jsonToWeapon(data: any): ItemDefinition {
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

  const traits: any = {};

  if (weapon) {
    traits.weapon = { ...weapon };
    // Convert ammo and projectile if present
    if (weapon.ammo) {
      traits.weapon.ammo = { ...weapon.ammo };
    }
    if (weapon.projectile) {
      traits.weapon.projectile = { ...weapon.projectile };
    }
  }

  if (magical) {
    traits.magical = { ...magical };
  }

  const options: any = {
    weight,
    stackSize,
    baseValue,
    rarity,
    traits,
  };

  if (baseMaterial) options.baseMaterial = baseMaterial;
  if (clarketechTier) options.clarketechTier = clarketechTier;
  if (researchRequired) options.researchRequired = researchRequired;

  return defineItem(id, name, category, options);
}

/**
 * Load all weapons from a category
 */
function loadWeaponCategory(categoryData: any): ItemDefinition[] {
  if (!categoryData) return [];

  const weapons: ItemDefinition[] = [];

  // Handle nested subcategories
  for (const key of Object.keys(categoryData)) {
    const data = categoryData[key];

    if (Array.isArray(data)) {
      // Subcategory array
      weapons.push(...data.map(jsonToWeapon));
    } else if (typeof data === 'object') {
      // Nested object - recurse
      weapons.push(...loadWeaponCategory(data));
    }
  }

  return weapons;
}

/**
 * Weapons organized by category with lazy loading
 */
export class WeaponsLoader {
  private static _allWeapons: ItemDefinition[] | null = null;
  private static _byCategory: Map<string, ItemDefinition[]> = new Map();
  private static _weaponsData: any = null;

  /**
   * Lazy-load weapons data
   */
  private static loadWeaponsData(): any {
    if (!this._weaponsData) {
      this._weaponsData = require('./weapons.json');
    }
    return this._weaponsData;
  }

  /**
   * Get all weapons
   */
  static getAllWeapons(): ItemDefinition[] {
    if (!this._allWeapons) {
      this._allWeapons = [];
      const weaponsData = this.loadWeaponsData();

      for (const categoryKey of Object.keys(weaponsData)) {
        const categoryWeapons = loadWeaponCategory(weaponsData[categoryKey]);
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

// Deprecated: Use getter functions instead
// These are kept for backward compatibility but trigger lazy loading
Object.defineProperty(exports, 'CREATIVE_WEAPONS', { get: getCreativeWeapons });
Object.defineProperty(exports, 'MELEE_WEAPONS', { get: getMeleeWeapons });
Object.defineProperty(exports, 'FIREARMS', { get: getFirearms });
Object.defineProperty(exports, 'MAGIC_WEAPONS', { get: getMagicWeapons });
Object.defineProperty(exports, 'EXOTIC_WEAPONS', { get: getExoticWeapons });
Object.defineProperty(exports, 'RANGED_WEAPONS', { get: getRangedWeapons });
Object.defineProperty(exports, 'ENERGY_WEAPONS', { get: getEnergyWeapons });
Object.defineProperty(exports, 'ALL_WEAPONS', { get: getAllWeaponsArray });
