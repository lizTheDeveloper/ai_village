/**
 * ShipyardBlueprints - Building blueprints for spaceship construction
 *
 * Shipyard Infrastructure for β-Space Navigation
 * Creates blueprints for shipyards and supporting facilities
 * that enable construction of various spaceship types.
 *
 * Based on spaceships-and-vr-spec.md and SpaceshipResearch.ts tech tree.
 *
 * Per CLAUDE.md: No silent fallbacks - all required fields must be provided.
 */

import type { BuildingBlueprint, BuildingCategory, BuildingFunction } from './BuildingBlueprintRegistry.js';
import type { BuildingBlueprintRegistry } from './BuildingBlueprintRegistry.js';
import specializedBuildingsData from '../../data/specialized-buildings.json';

/**
 * Extended building function types for spaceflight
 */
export type SpaceflightBuildingFunction =
  | BuildingFunction
  | { type: 'shipyard'; shipTypes: string[]; constructionSpeed: number }
  | { type: 'vr_facility'; vrTypes: string[]; immersionLevel: number }
  | { type: 'emotional_training'; techniques: string[]; coherenceBonus: number }
  | { type: 'beta_space_support'; navigationBonus: number };

interface SpecializedBuildingsData {
  categories: Record<string, unknown>;
  buildings: Array<BuildingBlueprint & { subcategory?: string }>;
}

function loadShipyardBlueprints(): BuildingBlueprint[] {
  const data = specializedBuildingsData as SpecializedBuildingsData;
  if (!data || !data.buildings || !Array.isArray(data.buildings)) {
    throw new Error('Failed to load specialized buildings from JSON');
  }
  const blueprints = data.buildings.filter(b => b.subcategory === 'shipyard');
  if (blueprints.length === 0) {
    throw new Error('No shipyard buildings found in JSON');
  }
  return blueprints;
}

/**
 * Shipyard building blueprints
 * These buildings enable spaceship construction and related capabilities.
 */
export const SHIPYARD_BLUEPRINTS: BuildingBlueprint[] = loadShipyardBlueprints();

/**
 * Register shipyard blueprints with the blueprint registry.
 * Called during initialization to make shipyard buildings available.
 *
 * @param registry - The BuildingBlueprintRegistry to register blueprints with
 * @throws Error if blueprint validation fails or if blueprint already exists
 */
export function registerShipyardBlueprints(registry: BuildingBlueprintRegistry): void {
  for (const blueprint of SHIPYARD_BLUEPRINTS) {
    registry.register(blueprint);
  }
}
