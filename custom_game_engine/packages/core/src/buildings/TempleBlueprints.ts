/**
 * TempleBlueprints - Building blueprints for religious/sacred buildings
 *
 * Religious Infrastructure & Faith Systems
 * Creates blueprints for temples and sacred sites that generate belief,
 * facilitate prayer, and serve as gathering places for worshippers.
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

function loadTempleBlueprints(): BuildingBlueprint[] {
  const data = specializedBuildingsData as SpecializedBuildingsData;
  if (!data || !data.buildings || !Array.isArray(data.buildings)) {
    throw new Error('Failed to load specialized buildings from JSON');
  }
  const blueprints = data.buildings.filter(b => b.subcategory === 'religious');
  if (blueprints.length === 0) {
    throw new Error('No religious buildings found in JSON');
  }
  return blueprints;
}

/**
 * Temple/Religious building blueprints
 * These buildings serve as sacred sites for deities and believers.
 */
export const TEMPLE_BLUEPRINTS: BuildingBlueprint[] = loadTempleBlueprints();

/**
 * Register temple blueprints with the building system
 */
export function registerTempleBlueprints(registry: BuildingBlueprintRegistry): void {
  for (const blueprint of TEMPLE_BLUEPRINTS) {
    registry.register(blueprint);
  }
}
