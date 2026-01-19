/**
 * SpaceflightProductionBuildings - Production buildings for spaceflight manufacturing
 *
 * These buildings enable the production chain for spaceship construction:
 * - arcane_forge: Magical material processing
 * - ley_line_extractor: Mana and void essence processing
 * - electronics_lab: Circuit and processor fabrication
 * - temporal_lab: Timeline and probability manipulation
 * - reality_forge: Ultimate clarketech items
 * - shipyard: Basic ship component assembly
 * - advanced_shipyard: Complex module assembly
 *
 * Per CLAUDE.md: No silent fallbacks - all required fields must be provided.
 */

import type { BuildingBlueprint, BuildingCategory } from './BuildingBlueprintRegistry.js';
import type { BuildingBlueprintRegistry } from './BuildingBlueprintRegistry.js';
import specializedBuildingsData from '../../data/specialized-buildings.json';

interface SpecializedBuildingsData {
  categories: Record<string, unknown>;
  buildings: Array<BuildingBlueprint & { subcategory?: string }>;
}

function loadSpaceflightProductionBlueprints(): BuildingBlueprint[] {
  const data = specializedBuildingsData as SpecializedBuildingsData;
  if (!data || !data.buildings || !Array.isArray(data.buildings)) {
    throw new Error('Failed to load specialized buildings from JSON');
  }
  const blueprints = data.buildings.filter(b => b.subcategory === 'spaceflight_production');
  if (blueprints.length === 0) {
    throw new Error('No spaceflight_production buildings found in JSON');
  }
  return blueprints;
}

/**
 * Spaceflight production building blueprints
 * These buildings enable the manufacturing chain for spaceship construction.
 */
export const SPACEFLIGHT_PRODUCTION_BLUEPRINTS: BuildingBlueprint[] = loadSpaceflightProductionBlueprints();

/**
 * Register spaceflight production blueprints with the blueprint registry.
 * Called during initialization to make production buildings available.
 *
 * @param registry - The BuildingBlueprintRegistry to register blueprints with
 * @throws Error if blueprint validation fails or if blueprint already exists
 */
export function registerSpaceflightProductionBlueprints(registry: BuildingBlueprintRegistry): void {
  for (const blueprint of SPACEFLIGHT_PRODUCTION_BLUEPRINTS) {
    registry.register(blueprint);
  }
}
