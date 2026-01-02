/**
 * Automation Building Definitions
 *
 * All buildings for factory automation and Dyson Swarm construction.
 * Integrated with Engineer skill tree and Factory AI system.
 */

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

/**
 * Power generation buildings
 */
export const POWER_BUILDINGS: BuildingDefinition[] = [
  {
    id: 'solar_panel',
    name: 'Solar Panel',
    category: 'power',
    description: 'Converts sunlight into electrical power. Foundation of factory energy.',
    size: { width: 2, height: 2 },
    constructionTime: 60, // 1 minute
    requiredSkills: {
      power_basics: 1,
    },
    materials: [
      { itemId: 'iron_plate', quantity: 10 },
      { itemId: 'copper_plate', quantity: 5 },
      { itemId: 'circuit_basic', quantity: 2 },
    ],
    effects: {
      power_generation: 60, // 60 kW
    },
    maxWorkers: 1,
    durability: 1000,
  },
  {
    id: 'solar_array',
    name: 'Solar Array',
    category: 'power',
    description: 'Large array of solar panels for higher energy output.',
    size: { width: 4, height: 4 },
    constructionTime: 180,
    requiredSkills: {
      solar_engineering: 3,
    },
    materials: [
      { itemId: 'iron_plate', quantity: 50 },
      { itemId: 'copper_plate', quantity: 30 },
      { itemId: 'circuit_advanced', quantity: 10 },
      { itemId: 'steel_plate', quantity: 20 },
    ],
    effects: {
      power_generation: 400, // 400 kW
    },
    maxWorkers: 2,
    durability: 2000,
  },
  {
    id: 'battery_bank',
    name: 'Battery Bank',
    category: 'power',
    description: 'Stores excess power for use during low generation periods.',
    size: { width: 3, height: 3 },
    constructionTime: 120,
    requiredSkills: {
      advanced_power: 3,
    },
    materials: [
      { itemId: 'steel_plate', quantity: 30 },
      { itemId: 'battery', quantity: 50 },
      { itemId: 'circuit_advanced', quantity: 15 },
    ],
    effects: {
      power_storage: 5000, // 5 MJ
    },
    maxWorkers: 1,
    durability: 1500,
  },
  {
    id: 'fusion_reactor',
    name: 'Fusion Reactor',
    category: 'power',
    description: 'High-capacity power generation for massive factory cities.',
    size: { width: 6, height: 6 },
    constructionTime: 600, // 10 minutes
    requiredSkills: {
      advanced_power: 5,
      quantum_basics: 2,
    },
    materials: [
      { itemId: 'steel_plate', quantity: 200 },
      { itemId: 'processing_unit', quantity: 50 },
      { itemId: 'quantum_processor', quantity: 10 },
      { itemId: 'battery', quantity: 100 },
    ],
    effects: {
      power_generation: 5000, // 5 MW
    },
    maxWorkers: 4,
    durability: 5000,
  },
];

/**
 * Belt and transport buildings
 */
export const TRANSPORT_BUILDINGS: BuildingDefinition[] = [
  {
    id: 'conveyor_belt',
    name: 'Conveyor Belt',
    category: 'transport',
    description: 'Moves items between machines automatically.',
    size: { width: 1, height: 1 },
    constructionTime: 5,
    requiredSkills: {
      mechanical_basics: 1,
    },
    materials: [
      { itemId: 'iron_plate', quantity: 1 },
      { itemId: 'iron_gear', quantity: 1 },
    ],
    effects: {
      transport_speed: 15, // 15 items/second
    },
    maxWorkers: 0, // No workers needed once built
    durability: 500,
  },
  {
    id: 'fast_belt',
    name: 'Fast Belt',
    category: 'transport',
    description: 'Higher throughput conveyor belt.',
    size: { width: 1, height: 1 },
    constructionTime: 8,
    requiredSkills: {
      belt_systems: 2,
    },
    materials: [
      { itemId: 'iron_plate', quantity: 2 },
      { itemId: 'iron_gear', quantity: 2 },
      { itemId: 'circuit_basic', quantity: 1 },
    ],
    effects: {
      transport_speed: 30, // 30 items/second
    },
    maxWorkers: 0,
    durability: 600,
  },
  {
    id: 'express_belt',
    name: 'Express Belt',
    category: 'transport',
    description: 'Maximum speed belt for high-throughput factories.',
    size: { width: 1, height: 1 },
    constructionTime: 12,
    requiredSkills: {
      belt_systems: 4,
    },
    materials: [
      { itemId: 'steel_plate', quantity: 2 },
      { itemId: 'iron_gear', quantity: 4 },
      { itemId: 'circuit_advanced', quantity: 1 },
    ],
    effects: {
      transport_speed: 45, // 45 items/second
    },
    maxWorkers: 0,
    durability: 800,
  },
  {
    id: 'inserter',
    name: 'Inserter',
    category: 'transport',
    description: 'Transfers items between belts and machines.',
    size: { width: 1, height: 1 },
    constructionTime: 10,
    requiredSkills: {
      mechanical_basics: 1,
    },
    materials: [
      { itemId: 'iron_plate', quantity: 2 },
      { itemId: 'iron_gear', quantity: 1 },
      { itemId: 'circuit_basic', quantity: 1 },
    ],
    effects: {
      transfer_speed: 1, // 1 item per 0.83 seconds
    },
    maxWorkers: 0,
    durability: 400,
  },
  {
    id: 'fast_inserter',
    name: 'Fast Inserter',
    category: 'transport',
    description: 'Higher speed item transfer.',
    size: { width: 1, height: 1 },
    constructionTime: 15,
    requiredSkills: {
      inserter_mastery: 2,
    },
    materials: [
      { itemId: 'iron_plate', quantity: 4 },
      { itemId: 'iron_gear', quantity: 2 },
      { itemId: 'circuit_basic', quantity: 2 },
    ],
    effects: {
      transfer_speed: 2, // 1 item per 0.42 seconds
    },
    maxWorkers: 0,
    durability: 500,
  },
];

/**
 * Assembly and production buildings
 */
export const PRODUCTION_BUILDINGS: BuildingDefinition[] = [
  {
    id: 'assembly_machine_i',
    name: 'Assembly Machine I',
    category: 'production',
    description: 'Basic automated crafting machine.',
    size: { width: 3, height: 3 },
    constructionTime: 60,
    requiredSkills: {
      assembly_machines: 1,
    },
    materials: [
      { itemId: 'iron_plate', quantity: 20 },
      { itemId: 'iron_gear', quantity: 10 },
      { itemId: 'circuit_basic', quantity: 5 },
    ],
    effects: {
      crafting_speed: 0.5, // 0.5x speed multiplier
      module_slots: 2,
    },
    maxWorkers: 1,
    durability: 1000,
  },
  {
    id: 'assembly_machine_ii',
    name: 'Assembly Machine II',
    category: 'production',
    description: 'Improved assembly machine with faster crafting.',
    size: { width: 3, height: 3 },
    constructionTime: 90,
    requiredSkills: {
      assembly_machines: 3,
    },
    materials: [
      { itemId: 'steel_plate', quantity: 20 },
      { itemId: 'iron_gear', quantity: 15 },
      { itemId: 'circuit_advanced', quantity: 5 },
    ],
    effects: {
      crafting_speed: 0.75,
      module_slots: 3,
    },
    maxWorkers: 1,
    durability: 1500,
  },
  {
    id: 'assembly_machine_iii',
    name: 'Assembly Machine III',
    category: 'production',
    description: 'Advanced assembly machine for high-tier production.',
    size: { width: 3, height: 3 },
    constructionTime: 120,
    requiredSkills: {
      assembly_machines: 5,
    },
    materials: [
      { itemId: 'steel_plate', quantity: 30 },
      { itemId: 'iron_gear', quantity: 20 },
      { itemId: 'circuit_advanced', quantity: 10 },
      { itemId: 'processing_unit', quantity: 5 },
    ],
    effects: {
      crafting_speed: 1.25,
      module_slots: 4,
    },
    maxWorkers: 2,
    durability: 2000,
  },
  {
    id: 'chemical_plant',
    name: 'Chemical Plant',
    category: 'production',
    description: 'Processes chemicals and fluids.',
    size: { width: 3, height: 3 },
    constructionTime: 100,
    requiredSkills: {
      advanced_automation: 2,
    },
    materials: [
      { itemId: 'steel_plate', quantity: 25 },
      { itemId: 'iron_gear', quantity: 10 },
      { itemId: 'circuit_advanced', quantity: 8 },
    ],
    effects: {
      crafting_speed: 1.0,
      module_slots: 3,
    },
    maxWorkers: 2,
    durability: 1200,
  },
];

/**
 * Factory management buildings
 */
export const MANAGEMENT_BUILDINGS: BuildingDefinition[] = [
  {
    id: 'factory_ai_core',
    name: 'Factory AI Core',
    category: 'management',
    description: 'Autonomous AI that manages factory production, detects bottlenecks, and optimizes efficiency.',
    size: { width: 3, height: 3 },
    constructionTime: 300, // 5 minutes
    requiredSkills: {
      factory_ai: 1,
    },
    materials: [
      { itemId: 'steel_plate', quantity: 200 },
      { itemId: 'processing_unit', quantity: 50 },
      { itemId: 'quantum_processor', quantity: 5 },
      { itemId: 'circuit_advanced', quantity: 100 },
    ],
    effects: {
      auto_management: true,
      management_radius: 100, // Manages all machines within 100 tiles
      intelligence_level: 1, // Base intelligence
    },
    maxWorkers: 3, // Engineers to maintain
    durability: 3000,
  },
  {
    id: 'roboport',
    name: 'Roboport',
    category: 'management',
    description: 'Command center for construction and logistics robots.',
    size: { width: 4, height: 4 },
    constructionTime: 180,
    requiredSkills: {
      robotics: 2,
    },
    materials: [
      { itemId: 'steel_plate', quantity: 50 },
      { itemId: 'iron_gear', quantity: 30 },
      { itemId: 'circuit_advanced', quantity: 20 },
    ],
    effects: {
      robot_range: 50,
      charging_stations: 4,
    },
    maxWorkers: 1,
    durability: 2000,
  },
];

/**
 * Dyson Swarm buildings
 */
export const DYSON_BUILDINGS: BuildingDefinition[] = [
  {
    id: 'solar_sail_assembler',
    name: 'Solar Sail Assembler',
    category: 'dyson',
    description: 'Specialized factory for constructing solar sails for Dyson Swarm.',
    size: { width: 5, height: 5 },
    constructionTime: 600,
    requiredSkills: {
      dyson_engineering: 1,
    },
    materials: [
      { itemId: 'steel_plate', quantity: 300 },
      { itemId: 'processing_unit', quantity: 100 },
      { itemId: 'quantum_processor', quantity: 20 },
      { itemId: 'battery', quantity: 50 },
    ],
    effects: {
      crafting_speed: 0.5, // Solar sails are complex
      module_slots: 4,
    },
    maxWorkers: 5, // Highly skilled engineers needed
    durability: 5000,
  },
  {
    id: 'dyson_receiver',
    name: 'Dyson Receiver Station',
    category: 'dyson',
    description: 'Receives power transmitted from Dyson Swarm.',
    size: { width: 10, height: 10 },
    constructionTime: 1200,
    requiredSkills: {
      dyson_engineering: 3,
    },
    materials: [
      { itemId: 'steel_plate', quantity: 500 },
      { itemId: 'quantum_processor', quantity: 50 },
      { itemId: 'circuit_advanced', quantity: 200 },
      { itemId: 'battery', quantity: 100 },
    ],
    effects: {
      power_reception: 10000, // 10 MW from swarm
    },
    maxWorkers: 10,
    durability: 10000,
  },
  {
    id: 'dyson_control_station',
    name: 'Dyson Control Station',
    category: 'dyson',
    description: 'Controls and coordinates Dyson Swarm operations.',
    size: { width: 8, height: 8 },
    constructionTime: 900,
    requiredSkills: {
      dyson_engineering: 5,
    },
    materials: [
      { itemId: 'steel_plate', quantity: 400 },
      { itemId: 'quantum_processor', quantity: 100 },
      { itemId: 'processing_unit', quantity: 200 },
      { itemId: 'circuit_advanced', quantity: 300 },
    ],
    effects: {
      swarm_coordination: true,
      max_sails: 10000,
    },
    maxWorkers: 15,
    durability: 8000,
  },
];

/**
 * All automation buildings combined
 */
export const ALL_AUTOMATION_BUILDINGS: BuildingDefinition[] = [
  ...POWER_BUILDINGS,
  ...TRANSPORT_BUILDINGS,
  ...PRODUCTION_BUILDINGS,
  ...MANAGEMENT_BUILDINGS,
  ...DYSON_BUILDINGS,
];

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
