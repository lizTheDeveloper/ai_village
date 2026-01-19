/**
 * MidwiferyBlueprints - Building blueprints for maternal care facilities
 *
 * Maternal Health Infrastructure
 * Creates blueprints for buildings that support pregnancy, labor, and infant care.
 * These buildings provide bonuses to birth outcomes and midwife effectiveness.
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

function loadMidwiferyBlueprints(): BuildingBlueprint[] {
  const data = specializedBuildingsData as SpecializedBuildingsData;
  if (!data || !data.buildings || !Array.isArray(data.buildings)) {
    throw new Error('Failed to load specialized buildings from JSON');
  }
  const blueprints = data.buildings.filter(b => b.subcategory === 'maternal_care');
  if (blueprints.length === 0) {
    throw new Error('No maternal_care buildings found in JSON');
  }
  return blueprints;
}

/**
 * Midwifery building blueprints (Maternal health infrastructure)
 * These buildings support pregnancy, labor, delivery, and infant care.
 */
export const MIDWIFERY_BLUEPRINTS: BuildingBlueprint[] = loadMidwiferyBlueprints();

/**
 * Register midwifery blueprints with the blueprint registry.
 * Called during initialization to make midwifery buildings available.
 *
 * @param registry - The BuildingBlueprintRegistry to register blueprints with
 * @throws Error if blueprint validation fails or if blueprint already exists
 */
export function registerMidwiferyBlueprints(registry: BuildingBlueprintRegistry): void {
  for (const blueprint of MIDWIFERY_BLUEPRINTS) {
    registry.register(blueprint);
  }
}
