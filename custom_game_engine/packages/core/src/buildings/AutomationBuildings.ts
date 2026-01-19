/**
 * Automation Building Definitions
 *
 * All buildings for factory automation and Dyson Swarm construction.
 * Integrated with Engineer skill tree and Factory AI system.
 *
 * Per CLAUDE.md: No silent fallbacks - all required fields must be provided.
 */

import buildingsData from '../../data/specialized-buildings.json';

// ============================================================================
// Type Definitions
// ============================================================================

export interface BuildingDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  size: { width: number; height: number };
  constructionTime: number; // seconds
  requiredSkills?: Record<string, number>;
  materials: Array<{ itemId: string; quantity: number }>;
  effects: Record<string, unknown>;
  maxWorkers: number;
  durability: number;
}

interface SpecializedBuildingsData {
  categories: Record<string, unknown>;
  buildings: Array<any>;
}

function loadAutomationBuildings(): BuildingDefinition[] {
  const data = buildingsData as SpecializedBuildingsData;
  if (!data || !data.buildings || !Array.isArray(data.buildings)) {
    throw new Error('Failed to load specialized buildings from JSON');
  }
  const buildings = data.buildings.filter((b: any) => b.subcategory === 'automation');
  if (buildings.length === 0) {
    throw new Error('No automation buildings found in JSON');
  }
  return buildings;
}

/**
 * All automation buildings combined
 */
export const ALL_AUTOMATION_BUILDINGS: BuildingDefinition[] = loadAutomationBuildings();

/**
 * Power generation buildings
 */
export const POWER_BUILDINGS: BuildingDefinition[] = ALL_AUTOMATION_BUILDINGS.filter(
  (b) => b.id === 'solar_panel' || b.id === 'solar_array' || b.id === 'battery_bank' || b.id === 'fusion_reactor'
);

/**
 * Belt and transport buildings
 */
export const TRANSPORT_BUILDINGS: BuildingDefinition[] = ALL_AUTOMATION_BUILDINGS.filter(
  (b) => b.id === 'conveyor_belt' || b.id === 'fast_belt' || b.id === 'express_belt' || b.id === 'inserter' || b.id === 'fast_inserter'
);

/**
 * Assembly and production buildings
 */
export const PRODUCTION_BUILDINGS: BuildingDefinition[] = ALL_AUTOMATION_BUILDINGS.filter(
  (b) => b.id === 'assembly_machine_i' || b.id === 'assembly_machine_ii' || b.id === 'assembly_machine_iii' || b.id === 'chemical_plant'
);

/**
 * Factory management buildings
 */
export const MANAGEMENT_BUILDINGS: BuildingDefinition[] = ALL_AUTOMATION_BUILDINGS.filter(
  (b) => b.id === 'factory_ai_core' || b.id === 'roboport'
);

/**
 * Dyson Swarm buildings
 */
export const DYSON_BUILDINGS: BuildingDefinition[] = ALL_AUTOMATION_BUILDINGS.filter(
  (b) => b.id === 'solar_sail_assembler' || b.id === 'dyson_receiver' || b.id === 'dyson_control_station'
);

/**
 * Get buildings available to an agent based on their skills
 */
export function getAvailableAutomationBuildings(
  agentSkills: Map<string, number>
): BuildingDefinition[] {
  return ALL_AUTOMATION_BUILDINGS.filter((building) => {
    if (!building.requiredSkills) return true;

    for (const [skillId, requiredLevel] of Object.entries(building.requiredSkills)) {
      const agentLevel = agentSkills.get(skillId) || 0;
      if (agentLevel < (requiredLevel as number)) return false;
    }

    return true;
  });
}

/**
 * Get buildings by category
 */
export function getBuildingsByCategory(category: string): BuildingDefinition[] {
  return ALL_AUTOMATION_BUILDINGS.filter((b) => b.category === category);
}

/**
 * Get building construction time with skill bonuses
 */
export function getAdjustedConstructionTime(
  buildingId: string,
  agentSkills: Map<string, number>
): number {
  const building = ALL_AUTOMATION_BUILDINGS.find((b) => b.id === buildingId);
  if (!building) return 0;

  let timeMultiplier = 1.0;

  // Apply skill bonuses
  // Example: Each level of relevant skill reduces time by 10%
  if (building.requiredSkills) {
    for (const [skillId, _] of Object.entries(building.requiredSkills)) {
      const agentLevel = agentSkills.get(skillId) || 0;
      timeMultiplier *= Math.pow(0.9, agentLevel); // 10% faster per level
    }
  }

  return building.constructionTime * timeMultiplier;
}
