import type { Component } from '../ecs/Component.js';

export type PrerequisiteType = 'tech_level' | 'building_age' | 'owner_skill' | 'previous_upgrade';

export interface UpgradePrerequisite {
  type: PrerequisiteType;
  value: string | number;
}

export type UpgradeEffectType =
  | 'capacity_increase'
  | 'efficiency_increase'
  | 'durability_increase'
  | 'comfort_increase'
  | 'defense_increase'
  | 'unlock_feature'
  | 'reduce_maintenance'
  | 'aesthetic_improvement';

export interface UpgradeEffect {
  type: UpgradeEffectType;
  magnitude: number;
}

export interface BuildingUpgradeDefinition {
  id: string;
  name: string;
  description: string;
  targetBuildingType: string;  // Building type this applies to
  prerequisites: UpgradePrerequisite[];
  materialType: string | null;
  materialQuantity: number;
  laborCostTicks: number;      // Ticks of work required
  effects: UpgradeEffect[];
}

/**
 * BuildingUpgradeComponent – tracks the upgrade state of a building.
 *
 * Applied to building entities to track which upgrades have been completed,
 * what upgrade is in progress, and the accumulated stat bonuses from upgrades.
 */
export interface BuildingUpgradeComponent extends Component {
  type: 'building_upgrade';

  /** IDs of completed upgrades */
  appliedUpgrades: string[];

  /** Upgrade currently in progress (null = idle) */
  pendingUpgradeId: string | null;

  /** Progress toward current upgrade (0-100) */
  upgradeProgress: number;

  /** Tick when the current upgrade started */
  upgradeStartTick: number;

  // Accumulated stat bonuses from all applied upgrades
  bonusCapacity: number;          // Extra storage/capacity units
  bonusEfficiency: number;        // 0-1 multiplier bonus on production speed
  bonusDurability: number;        // Added max durability
  bonusComfort: number;           // Happiness bonus for occupants
  bonusDefense: number;           // Defense rating addition
  bonusAesthetics: number;        // Visual appeal bonus
  maintenanceCostMultiplier: number; // 1.0 = normal, <1.0 = reduced
  unlockedFeatures: string[];     // Feature IDs unlocked via upgrades
}

export function createBuildingUpgradeComponent(): BuildingUpgradeComponent {
  return {
    type: 'building_upgrade',
    version: 1,
    appliedUpgrades: [],
    pendingUpgradeId: null,
    upgradeProgress: 0,
    upgradeStartTick: 0,
    bonusCapacity: 0,
    bonusEfficiency: 0,
    bonusDurability: 0,
    bonusComfort: 0,
    bonusDefense: 0,
    bonusAesthetics: 0,
    maintenanceCostMultiplier: 1.0,
    unlockedFeatures: [],
  };
}

/**
 * Upgrade definitions database.
 * Keyed by upgrade ID.
 */
export const BUILDING_UPGRADE_DEFINITIONS: Record<string, BuildingUpgradeDefinition> = {
  // ── House upgrades ────────────────────────────────────────────────────
  house_insulation: {
    id: 'house_insulation',
    name: 'Insulation',
    description: 'Add wool insulation to reduce heat loss and improve comfort.',
    targetBuildingType: 'house',
    prerequisites: [],
    materialType: 'wool',
    materialQuantity: 20,
    laborCostTicks: 40 * 1200,   // 40 agent-hours
    effects: [
      { type: 'comfort_increase', magnitude: 15 },
      { type: 'reduce_maintenance', magnitude: 10 },
    ],
  },
  house_stone_foundation: {
    id: 'house_stone_foundation',
    name: 'Stone Foundation',
    description: 'Replace earth foundation with stone for long-term durability.',
    targetBuildingType: 'house',
    prerequisites: [{ type: 'building_age', value: 100 * 1200 }],
    materialType: 'stone',
    materialQuantity: 50,
    laborCostTicks: 80 * 1200,
    effects: [
      { type: 'durability_increase', magnitude: 50 },
      { type: 'reduce_maintenance', magnitude: 25 },
    ],
  },
  house_second_story: {
    id: 'house_second_story',
    name: 'Second Story',
    description: 'Add a second floor to double living space.',
    targetBuildingType: 'house',
    prerequisites: [
      { type: 'previous_upgrade', value: 'house_stone_foundation' },
      { type: 'owner_skill', value: 'construction:5' },
    ],
    materialType: 'wood',
    materialQuantity: 100,
    laborCostTicks: 200 * 1200,
    effects: [
      { type: 'capacity_increase', magnitude: 100 },
      { type: 'aesthetic_improvement', magnitude: 20 },
    ],
  },
  house_luxury_interior: {
    id: 'house_luxury_interior',
    name: 'Luxury Interior',
    description: 'Fine furnishings and crafted décor for maximum comfort.',
    targetBuildingType: 'house',
    prerequisites: [
      { type: 'previous_upgrade', value: 'house_second_story' },
    ],
    materialType: 'fabric',
    materialQuantity: 40,
    laborCostTicks: 120 * 1200,
    effects: [
      { type: 'comfort_increase', magnitude: 30 },
      { type: 'aesthetic_improvement', magnitude: 35 },
    ],
  },

  // ── Workshop upgrades ──────────────────────────────────────────────────
  workshop_better_tools: {
    id: 'workshop_better_tools',
    name: 'Better Tools',
    description: 'Upgraded metal tools for faster and higher-quality crafting.',
    targetBuildingType: 'workshop',
    prerequisites: [],
    materialType: 'metal',
    materialQuantity: 15,
    laborCostTicks: 30 * 1200,
    effects: [
      { type: 'efficiency_increase', magnitude: 15 },
    ],
  },
  workshop_more_workstations: {
    id: 'workshop_more_workstations',
    name: 'More Workstations',
    description: 'Add extra benches to allow more simultaneous crafting.',
    targetBuildingType: 'workshop',
    prerequisites: [{ type: 'previous_upgrade', value: 'workshop_better_tools' }],
    materialType: 'wood',
    materialQuantity: 30,
    laborCostTicks: 50 * 1200,
    effects: [
      { type: 'capacity_increase', magnitude: 50 },
      { type: 'efficiency_increase', magnitude: 10 },
    ],
  },
  workshop_quality_bonus: {
    id: 'workshop_quality_bonus',
    name: 'Quality Certification',
    description: 'Specialized setup that produces higher-quality outputs.',
    targetBuildingType: 'workshop',
    prerequisites: [{ type: 'previous_upgrade', value: 'workshop_more_workstations' }],
    materialType: null,
    materialQuantity: 0,
    laborCostTicks: 20 * 1200,
    effects: [
      { type: 'efficiency_increase', magnitude: 20 },
      { type: 'unlock_feature', magnitude: 1 },
    ],
  },

  // ── Storage upgrades ───────────────────────────────────────────────────
  storage_shelving: {
    id: 'storage_shelving',
    name: 'Shelving Units',
    description: 'Install proper shelves to increase item capacity.',
    targetBuildingType: 'storage',
    prerequisites: [],
    materialType: 'wood',
    materialQuantity: 20,
    laborCostTicks: 15 * 1200,
    effects: [
      { type: 'capacity_increase', magnitude: 50 },
    ],
  },
  storage_climate_control: {
    id: 'storage_climate_control',
    name: 'Climate Control',
    description: 'Temperature regulation to preserve perishables.',
    targetBuildingType: 'storage',
    prerequisites: [{ type: 'previous_upgrade', value: 'storage_shelving' }],
    materialType: 'stone',
    materialQuantity: 25,
    laborCostTicks: 40 * 1200,
    effects: [
      { type: 'unlock_feature', magnitude: 1 },
      { type: 'efficiency_increase', magnitude: 10 },
    ],
  },
  storage_security: {
    id: 'storage_security',
    name: 'Security Reinforcement',
    description: 'Reinforce doors and walls to prevent theft.',
    targetBuildingType: 'storage',
    prerequisites: [{ type: 'previous_upgrade', value: 'storage_climate_control' }],
    materialType: 'metal',
    materialQuantity: 10,
    laborCostTicks: 25 * 1200,
    effects: [
      { type: 'defense_increase', magnitude: 30 },
    ],
  },

  // ── Farm upgrades ──────────────────────────────────────────────────────
  farm_irrigation: {
    id: 'farm_irrigation',
    name: 'Irrigation System',
    description: 'Install water channels to reduce crop failure.',
    targetBuildingType: 'farm',
    prerequisites: [],
    materialType: 'stone',
    materialQuantity: 30,
    laborCostTicks: 60 * 1200,
    effects: [
      { type: 'efficiency_increase', magnitude: 20 },
      { type: 'reduce_maintenance', magnitude: 15 },
    ],
  },
  farm_fertilizer: {
    id: 'farm_fertilizer',
    name: 'Fertilizer Application',
    description: 'Enrich soil with composted material for higher yields.',
    targetBuildingType: 'farm',
    prerequisites: [{ type: 'previous_upgrade', value: 'farm_irrigation' }],
    materialType: 'compost',
    materialQuantity: 20,
    laborCostTicks: 20 * 1200,
    effects: [
      { type: 'efficiency_increase', magnitude: 25 },
    ],
  },
  farm_greenhouse: {
    id: 'farm_greenhouse',
    name: 'Greenhouse',
    description: 'Enclosed growing space for year-round cultivation.',
    targetBuildingType: 'farm',
    prerequisites: [{ type: 'previous_upgrade', value: 'farm_fertilizer' }],
    materialType: 'glass',
    materialQuantity: 40,
    laborCostTicks: 100 * 1200,
    effects: [
      { type: 'efficiency_increase', magnitude: 30 },
      { type: 'unlock_feature', magnitude: 1 },
    ],
  },
};

/**
 * Get all upgrade definitions applicable to a given building type.
 */
export function getUpgradesForBuilding(buildingType: string): BuildingUpgradeDefinition[] {
  return Object.values(BUILDING_UPGRADE_DEFINITIONS).filter(
    (def) => def.targetBuildingType === buildingType
  );
}

/**
 * Get the next upgrade IDs in the chain for a building type, given already-applied upgrades.
 * Alias: getAvailableUpgrades (short form used in tests and external code).
 */
export const getAvailableUpgrades = getAvailableBuildingUpgrades;

export function getAvailableBuildingUpgrades(
  buildingType: string,
  appliedUpgrades: string[],
  ageTicks: number,
  ownerSkills: Record<string, number>
): BuildingUpgradeDefinition[] {
  const applicable = getUpgradesForBuilding(buildingType);
  const applied = new Set(appliedUpgrades);

  return applicable.filter((def) => {
    // Not already applied
    if (applied.has(def.id)) return false;

    // Check prerequisites
    for (const prereq of def.prerequisites) {
      if (prereq.type === 'previous_upgrade') {
        if (!applied.has(prereq.value as string)) return false;
      } else if (prereq.type === 'building_age') {
        if (ageTicks < (prereq.value as number)) return false;
      } else if (prereq.type === 'owner_skill') {
        const [skillName, levelStr] = (prereq.value as string).split(':');
        const requiredLevel = parseInt(levelStr ?? '0', 10);
        const currentLevel = ownerSkills[skillName ?? ''] ?? 0;
        if (currentLevel < requiredLevel) return false;
      }
      // tech_level prereqs are resolved externally; skip for now
    }
    return true;
  });
}
