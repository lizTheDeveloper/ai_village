/**
 * Megastructure Type Definitions and Blueprints
 *
 * Phase 5: Megastructure Construction
 *
 * Defines all megastructure types from orbital stations to transcendent reality anchors.
 * Each blueprint includes requirements, construction phases, capabilities, and risks.
 *
 * Categories:
 * - Orbital (Tech 7-9): Space stations, O'Neill cylinders, Bishop rings
 * - Planetary (Tech 8-9.5): Terraformers, planet crackers, world engines
 * - Stellar (Tech 9-10): Dyson swarms/spheres, stellar engines, star lifters
 * - Galactic (Tech 10): Wormhole gates, matrioshka brains, Birch worlds
 * - Transcendent (Tech 10+): Universe engines, reality anchors, dimensional gates
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type MegastructureCategory = 'orbital' | 'planetary' | 'stellar' | 'galactic' | 'transcendent';
export type MegastructureTier = 'planet' | 'system' | 'sector' | 'galaxy';

export interface MegastructurePhase {
  name: string;
  durationPercent: number;  // % of total construction time
  resourcePercent: number;  // % of total resources consumed
  description: string;
}

export interface MegastructureCapabilities {
  populationCapacity?: number;
  energyOutput?: number;  // watts
  defenseRating?: number;
  computationalPower?: number;  // FLOPS
  storageCapacity?: number;  // bytes
  terraformingRate?: number;  // planets per year
  miningRate?: number;  // kg per year
  transportCapacity?: number;  // kg per year
  communicationRange?: number;  // light years
  timelineManipulation?: boolean;
  realityManipulation?: boolean;
}

export interface MegastructurePrerequisites {
  megastructures?: string[];  // Required existing megastructures
  research?: string[];  // Required research
  techLevel?: number;  // Minimum tech level
}

export interface MegastructureBlueprint {
  id: string;
  name: string;
  category: MegastructureCategory;
  tier: MegastructureTier;

  // Requirements
  techLevelRequired: number;
  totalMass: number;  // kg
  constructionTimeYears: number;
  laborRequired: number;  // person-years
  operationTimeYears?: number;  // For structures that require operation time (e.g., terraformers)

  // Resource requirements (itemId -> quantity)
  resources: Record<string, number>;

  // Prerequisites
  prerequisites?: MegastructurePrerequisites;

  // Construction phases
  phases: MegastructurePhase[];

  // Capabilities when complete
  capabilities: MegastructureCapabilities;

  // Maintenance
  maintenancePerYear: Record<string, number>;
  energyMaintenancePerYear: number;  // watts
  degradationRate: number;  // % per year
  failureTimeYears: number;  // MTBF without maintenance

  // Strategic value
  militaryValue: number;  // 0-100
  economicValue: number;  // 0-100
  culturalValue: number;  // 0-100

  // Risks
  collapseRiskBase: number;  // % per year
  vulnerableTo: string[];  // What can damage/destroy this
}

// ============================================================================
// DATA LOADING
// ============================================================================

import blueprintsData from '../../data/megastructures.json';

// Load and validate blueprints from JSON
function loadMegastructureBlueprints(): Record<string, MegastructureBlueprint> {
  const blueprints: Record<string, MegastructureBlueprint> = {};

  // Cast blueprintsData to the correct type
  const data = blueprintsData as Record<string, Record<string, unknown>>;

  for (const [key, blueprint] of Object.entries(data)) {
    // Validate required fields
    const bp = blueprint as any;
    if (!bp.id || !bp.name || !bp.category || !bp.tier) {
      throw new Error(`Invalid megastructure blueprint: ${key} - missing required fields`);
    }

    blueprints[key] = bp as MegastructureBlueprint;
  }

  return blueprints;
}

// ============================================================================
// ORBITAL CATEGORY (Tech 7-9)
// ============================================================================

// Data now loaded from JSON - see ../../data/megastructures.json

// Legacy constants removed - all data now in JSON
// The following sections (Orbital, Planetary, Stellar, Galactic, Transcendent)
// have been replaced with JSON data loading

// ============================================================================
// BLUEPRINT REGISTRY
// ============================================================================

export const MEGASTRUCTURE_BLUEPRINTS: Record<string, MegastructureBlueprint> = loadMegastructureBlueprints();

// ============================================================================
// HELPER FUNCTIONS (unchanged)
// ============================================================================

/**
 * Get a megastructure blueprint by ID
 */
export function getMegastructureBlueprint(id: string): MegastructureBlueprint | undefined {
  return MEGASTRUCTURE_BLUEPRINTS[id];
}

/**
 * Get all megastructures in a category
 */
export function getMegastructuresByCategory(category: MegastructureCategory): MegastructureBlueprint[] {
  return Object.values(MEGASTRUCTURE_BLUEPRINTS).filter(bp => bp.category === category);
}

/**
 * Get megastructures within a tech level range
 */
export function getMegastructuresByTechLevel(minTech: number, maxTech: number): MegastructureBlueprint[] {
  return Object.values(MEGASTRUCTURE_BLUEPRINTS).filter(
    bp => bp.techLevelRequired >= minTech && bp.techLevelRequired <= maxTech
  );
}

/**
 * Check if civilization can build a megastructure
 */
export interface CivilizationStats {
  techLevel: number;
  availableResources: Record<string, number>;
  completedMegastructures: string[];
  researchCompleted: string[];
}

export interface CanBuildResult {
  canBuild: boolean;
  missingRequirements: string[];
}

export function canBuildMegastructure(
  blueprintId: string,
  civStats: CivilizationStats
): CanBuildResult {
  const blueprint = getMegastructureBlueprint(blueprintId);

  if (!blueprint) {
    return {
      canBuild: false,
      missingRequirements: [`Unknown megastructure: ${blueprintId}`],
    };
  }

  const missing: string[] = [];

  // Check tech level
  if (civStats.techLevel < blueprint.techLevelRequired) {
    missing.push(
      `Tech level ${blueprint.techLevelRequired} required (current: ${civStats.techLevel})`
    );
  }

  // Check prerequisite megastructures
  if (blueprint.prerequisites?.megastructures) {
    for (const reqMega of blueprint.prerequisites.megastructures) {
      if (!civStats.completedMegastructures.includes(reqMega)) {
        const reqBlueprint = getMegastructureBlueprint(reqMega);
        missing.push(
          `Required megastructure: ${reqBlueprint?.name || reqMega}`
        );
      }
    }
  }

  // Check prerequisite research
  if (blueprint.prerequisites?.research) {
    for (const reqResearch of blueprint.prerequisites.research) {
      if (!civStats.researchCompleted.includes(reqResearch)) {
        missing.push(`Required research: ${reqResearch}`);
      }
    }
  }

  // Check resources
  for (const [itemId, required] of Object.entries(blueprint.resources)) {
    const available = civStats.availableResources[itemId] || 0;
    if (available < required) {
      missing.push(
        `Insufficient ${itemId}: ${available}/${required} (need ${required - available} more)`
      );
    }
  }

  return {
    canBuild: missing.length === 0,
    missingRequirements: missing,
  };
}

/**
 * Get all buildable megastructures for a civilization
 */
export function getBuildableMegastructures(civStats: CivilizationStats): MegastructureBlueprint[] {
  return Object.values(MEGASTRUCTURE_BLUEPRINTS).filter(
    blueprint => canBuildMegastructure(blueprint.id, civStats).canBuild
  );
}

/**
 * Calculate total construction cost in person-years
 */
export function calculateTotalLaborCost(blueprint: MegastructureBlueprint): number {
  return blueprint.laborRequired;
}

/**
 * Calculate yearly maintenance cost value
 */
export function calculateMaintenanceValue(
  blueprint: MegastructureBlueprint,
  itemValues: Record<string, number>
): number {
  let total = 0;
  for (const [itemId, amount] of Object.entries(blueprint.maintenancePerYear)) {
    total += (itemValues[itemId] || 0) * amount;
  }
  return total;
}

/**
 * Get megastructures by tier
 */
export function getMegastructuresByTier(tier: MegastructureTier): MegastructureBlueprint[] {
  return Object.values(MEGASTRUCTURE_BLUEPRINTS).filter(bp => bp.tier === tier);
}

/**
 * Get the most expensive megastructures by total mass
 */
export function getMostMassiveMegastructures(count: number = 10): MegastructureBlueprint[] {
  return Object.values(MEGASTRUCTURE_BLUEPRINTS)
    .sort((a, b) => b.totalMass - a.totalMass)
    .slice(0, count);
}

/**
 * Get megastructures that require a specific prerequisite
 */
export function getMegastructuresRequiring(prerequisiteId: string): MegastructureBlueprint[] {
  return Object.values(MEGASTRUCTURE_BLUEPRINTS).filter(
    bp => bp.prerequisites?.megastructures?.includes(prerequisiteId)
  );
}
