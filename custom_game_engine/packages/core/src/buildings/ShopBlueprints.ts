/**
 * ShopBlueprints - Building blueprints for shop/trade buildings
 *
 * Phase 12.4: Shop Buildings
 * Creates blueprints for various shop types that provide trading functionality.
 *
 * Per CLAUDE.md: No silent fallbacks - all required fields must be provided.
 */

import type { BuildingBlueprint } from './BuildingBlueprintRegistry.js';
import type { BuildingBlueprintRegistry } from './BuildingBlueprintRegistry.js';
import specializedBuildingsData from '../../data/specialized-buildings.json';

interface SpecializedBuildingsData {
  categories: Record<string, unknown>;
  buildings: Array<BuildingBlueprint & { subcategory?: string }>;
}

function loadShopBlueprints(): BuildingBlueprint[] {
  const data = specializedBuildingsData as SpecializedBuildingsData;
  if (!data || !data.buildings || !Array.isArray(data.buildings)) {
    throw new Error('Failed to load specialized buildings from JSON');
  }
  const blueprints = data.buildings.filter(b => b.subcategory === 'commercial');
  if (blueprints.length === 0) {
    throw new Error('No commercial buildings found in JSON');
  }
  return blueprints;
}

/**
 * Shop building blueprints (Tier 2 commercial buildings)
 */
export const SHOP_BLUEPRINTS: BuildingBlueprint[] = loadShopBlueprints();

/**
 * Register shop blueprints with the blueprint registry.
 * Called during initialization to make shop buildings available.
 *
 * @param registry - The BuildingBlueprintRegistry to register blueprints with
 * @throws Error if blueprint validation fails or if blueprint already exists
 */
export function registerShopBlueprints(registry: BuildingBlueprintRegistry): void {
  for (const blueprint of SHOP_BLUEPRINTS) {
    registry.register(blueprint);
  }
}
