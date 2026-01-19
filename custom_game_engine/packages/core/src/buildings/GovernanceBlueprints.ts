/**
 * GovernanceBlueprints - Building blueprints for governance/information buildings
 *
 * Governance Infrastructure & Information Systems
 * Creates blueprints for governance buildings that collect and provide information
 * about the population. Better infrastructure = better information.
 *
 * Per CLAUDE.md: No silent fallbacks - all required fields must be provided.
 */

import type { BuildingBlueprint } from './BuildingBlueprintRegistry.js';
import type { BuildingBlueprintRegistry } from './BuildingBlueprintRegistry.js';
import buildingsData from '../../data/specialized-buildings.json';

interface SpecializedBuildingsData {
  categories: Record<string, unknown>;
  buildings: Array<BuildingBlueprint & { subcategory?: string }>;
}

function loadGovernanceBlueprints(): BuildingBlueprint[] {
  const data = buildingsData as SpecializedBuildingsData;
  if (!data || !data.buildings || !Array.isArray(data.buildings)) {
    throw new Error('Failed to load specialized buildings from JSON');
  }
  const blueprints = data.buildings.filter(b => b.subcategory === 'governance');
  if (blueprints.length === 0) {
    throw new Error('No governance buildings found in JSON');
  }
  return blueprints;
}

/**
 * Governance building blueprints (Information infrastructure)
 * These buildings unlock dashboard panels and provide data to both agents and players.
 */
export const GOVERNANCE_BLUEPRINTS: BuildingBlueprint[] = loadGovernanceBlueprints();

/**
 * Register governance blueprints with the blueprint registry.
 * Called during initialization to make governance buildings available.
 *
 * @param registry - The BuildingBlueprintRegistry to register blueprints with
 * @throws Error if blueprint validation fails or if blueprint already exists
 */
export function registerGovernanceBlueprints(registry: BuildingBlueprintRegistry): void {
  for (const blueprint of GOVERNANCE_BLUEPRINTS) {
    registry.register(blueprint);
  }
}
