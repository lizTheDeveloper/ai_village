/**
 * Engineer Skill Tree
 *
 * Specialized skill tree for agents who build and maintain automation systems.
 * Engineers are essential for factory cities and Dyson Swarm construction.
 *
 * Skill Categories:
 * - Power Engineering: Solar panels, generators, power distribution
 * - Mechanical Engineering: Belts, inserters, assembly machines
 * - Electronics Engineering: Circuits, processors, advanced components
 * - Factory Design: Layout optimization, efficiency improvements
 * - Quantum Engineering: High-tier components for Dyson Swarm
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface SkillCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface SkillDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  tier: number;
  maxLevel: number;
  prerequisites: string[];
  effects: Record<string, unknown>;
  learningCurve: 'easy' | 'moderate' | 'hard' | 'very_hard' | 'extreme';
}

/**
 * Engineer skill category
 */
export const ENGINEER_CATEGORY: SkillCategory = {
  id: 'engineering',
  name: 'Engineering',
  description: 'Design, build, and maintain automated factories and power systems',
  icon: '⚙️',
  color: '#4A90E2',
};

/**
 * All engineer skills organized by specialization
 */
export const ENGINEER_SKILLS: SkillDefinition[] = [
  // ===== POWER ENGINEERING =====
  {
    id: 'power_basics',
    name: 'Power Basics',
    category: 'engineering',
    description: 'Understand electrical power generation and distribution',
    tier: 1,
    maxLevel: 5,
    prerequisites: [],
    effects: {
      construction_speed: {
        'solar_panel': 0.1, // +10% per level
        'wind_turbine': 0.1,
      },
      energy_efficiency: 0.05, // +5% per level
    },
    learningCurve: 'moderate',
  },
  {
    id: 'solar_engineering',
    name: 'Solar Engineering',
    category: 'engineering',
    description: 'Master solar panel construction and optimization',
    tier: 2,
    maxLevel: 5,
    prerequisites: ['power_basics'],
    effects: {
      construction_speed: {
        'solar_panel': 0.15,
        'solar_array': 0.15,
      },
      solar_efficiency: 0.1, // +10% power output per level
      unlock: {
        3: ['solar_array'],
        5: ['advanced_solar_panel'],
      },
    },
    learningCurve: 'moderate',
  },
  {
    id: 'power_distribution',
    name: 'Power Distribution',
    category: 'engineering',
    description: 'Design efficient power grids and networks',
    tier: 2,
    maxLevel: 5,
    prerequisites: ['power_basics'],
    effects: {
      construction_speed: {
        'power_pole': 0.2,
        'substation': 0.15,
      },
      power_loss_reduction: 0.05, // -5% transmission loss per level
      grid_range: 0.1, // +10% range per level
    },
    learningCurve: 'moderate',
  },
  {
    id: 'advanced_power',
    name: 'Advanced Power Systems',
    category: 'engineering',
    description: 'High-capacity power generation and storage',
    tier: 3,
    maxLevel: 5,
    prerequisites: ['solar_engineering', 'power_distribution'],
    effects: {
      construction_speed: {
        'battery_bank': 0.15,
        'fusion_reactor': 0.1,
      },
      storage_capacity: 0.15, // +15% battery capacity per level
      unlock: {
        3: ['battery_bank'],
        5: ['fusion_reactor'],
      },
    },
    learningCurve: 'hard',
  },

  // ===== MECHANICAL ENGINEERING =====
  {
    id: 'mechanical_basics',
    name: 'Mechanical Basics',
    category: 'engineering',
    description: 'Build and maintain basic mechanical systems',
    tier: 1,
    maxLevel: 5,
    prerequisites: [],
    effects: {
      construction_speed: {
        'conveyor_belt': 0.15,
        'inserter': 0.15,
      },
      durability: {
        'mechanical': 0.1, // +10% durability per level
      },
    },
    learningCurve: 'easy',
  },
  {
    id: 'belt_systems',
    name: 'Belt Systems',
    category: 'engineering',
    description: 'Design efficient conveyor networks',
    tier: 2,
    maxLevel: 5,
    prerequisites: ['mechanical_basics'],
    effects: {
      construction_speed: {
        'conveyor_belt': 0.2,
        'fast_belt': 0.15,
        'express_belt': 0.1,
      },
      belt_speed: 0.1, // +10% throughput per level
      unlock: {
        2: ['fast_belt'],
        4: ['express_belt'],
      },
    },
    learningCurve: 'moderate',
  },
  {
    id: 'inserter_mastery',
    name: 'Inserter Mastery',
    category: 'engineering',
    description: 'Optimize item transfer and sorting',
    tier: 2,
    maxLevel: 5,
    prerequisites: ['mechanical_basics'],
    effects: {
      construction_speed: {
        'inserter': 0.2,
        'fast_inserter': 0.15,
        'filter_inserter': 0.15,
      },
      inserter_speed: 0.15, // +15% speed per level
      unlock: {
        2: ['fast_inserter'],
        4: ['filter_inserter'],
      },
    },
    learningCurve: 'moderate',
  },
  {
    id: 'assembly_machines',
    name: 'Assembly Machines',
    category: 'engineering',
    description: 'Build and configure automated assemblers',
    tier: 2,
    maxLevel: 5,
    prerequisites: ['mechanical_basics'],
    effects: {
      construction_speed: {
        'assembly_machine_i': 0.15,
        'assembly_machine_ii': 0.12,
        'assembly_machine_iii': 0.1,
      },
      crafting_speed: 0.1, // +10% machine speed per level
      unlock: {
        1: ['assembly_machine_i'],
        3: ['assembly_machine_ii'],
        5: ['assembly_machine_iii'],
      },
    },
    learningCurve: 'moderate',
  },
  {
    id: 'advanced_automation',
    name: 'Advanced Automation',
    category: 'engineering',
    description: 'Master complex automation systems',
    tier: 3,
    maxLevel: 5,
    prerequisites: ['belt_systems', 'inserter_mastery', 'assembly_machines'],
    effects: {
      construction_speed: {
        'chemical_plant': 0.1,
        'refinery': 0.1,
        'centrifuge': 0.1,
      },
      productivity: 0.05, // +5% output per level
      unlock: {
        2: ['chemical_plant'],
        4: ['refinery'],
      },
    },
    learningCurve: 'hard',
  },

  // ===== ELECTRONICS ENGINEERING =====
  {
    id: 'electronics_basics',
    name: 'Electronics Basics',
    category: 'engineering',
    description: 'Craft basic electronic components',
    tier: 1,
    maxLevel: 5,
    prerequisites: [],
    effects: {
      crafting_speed: {
        'copper_cable': 0.2,
        'circuit_basic': 0.15,
      },
      component_quality: 0.1, // +10% quality per level
    },
    learningCurve: 'moderate',
  },
  {
    id: 'circuit_design',
    name: 'Circuit Design',
    category: 'engineering',
    description: 'Design and produce advanced circuits',
    tier: 2,
    maxLevel: 5,
    prerequisites: ['electronics_basics'],
    effects: {
      crafting_speed: {
        'circuit_basic': 0.2,
        'circuit_advanced': 0.15,
      },
      yield_bonus: 0.05, // +5% extra output chance per level
      unlock: {
        2: ['circuit_advanced'],
      },
    },
    learningCurve: 'moderate',
  },
  {
    id: 'processing_units',
    name: 'Processing Units',
    category: 'engineering',
    description: 'Manufacture high-tier processors',
    tier: 3,
    maxLevel: 5,
    prerequisites: ['circuit_design'],
    effects: {
      crafting_speed: {
        'processing_unit': 0.15,
        'quantum_processor': 0.1,
      },
      unlock: {
        2: ['processing_unit'],
        5: ['quantum_processor'],
      },
    },
    learningCurve: 'hard',
  },
  {
    id: 'robotics',
    name: 'Robotics',
    category: 'engineering',
    description: 'Build and program construction robots',
    tier: 3,
    maxLevel: 5,
    prerequisites: ['circuit_design', 'advanced_automation'],
    effects: {
      construction_speed: {
        'construction_robot': 0.15,
        'logistic_robot': 0.15,
      },
      robot_capacity: 0.2, // +20% cargo per level
      unlock: {
        2: ['construction_robot'],
        4: ['logistic_robot'],
      },
    },
    learningCurve: 'hard',
  },

  // ===== FACTORY DESIGN =====
  {
    id: 'factory_planning',
    name: 'Factory Planning',
    category: 'engineering',
    description: 'Design efficient factory layouts',
    tier: 2,
    maxLevel: 5,
    prerequisites: ['mechanical_basics', 'electronics_basics'],
    effects: {
      blueprint_creation: 0.2, // +20% faster blueprint design per level
      layout_efficiency: 0.1, // +10% space efficiency per level
      unlock: {
        1: ['blueprint_tool'],
      },
    },
    learningCurve: 'moderate',
  },
  {
    id: 'production_optimization',
    name: 'Production Optimization',
    category: 'engineering',
    description: 'Maximize factory throughput and efficiency',
    tier: 3,
    maxLevel: 5,
    prerequisites: ['factory_planning', 'advanced_automation'],
    effects: {
      overall_efficiency: 0.05, // +5% all production per level
      bottleneck_detection: 0.2, // +20% faster problem identification
      module_effectiveness: 0.1, // +10% module bonus per level
    },
    learningCurve: 'hard',
  },
  {
    id: 'factory_ai',
    name: 'Factory AI Programming',
    category: 'engineering',
    description: 'Program AI to manage factories autonomously',
    tier: 4,
    maxLevel: 5,
    prerequisites: ['production_optimization', 'robotics'],
    effects: {
      construction_speed: {
        'factory_ai_core': 0.15,
      },
      ai_intelligence: 1, // +1 intelligence level per skill level
      unlock: {
        1: ['factory_ai_core'],
        3: ['factory_ai_upgrade_1'],
        5: ['factory_ai_upgrade_2'],
      },
    },
    learningCurve: 'very_hard',
  },

  // ===== QUANTUM ENGINEERING =====
  {
    id: 'quantum_basics',
    name: 'Quantum Mechanics',
    category: 'engineering',
    description: 'Understand quantum-scale engineering',
    tier: 4,
    maxLevel: 5,
    prerequisites: ['processing_units'],
    effects: {
      crafting_speed: {
        'quantum_processor': 0.2,
      },
      quantum_stability: 0.1, // +10% success rate per level
    },
    learningCurve: 'very_hard',
  },
  {
    id: 'dyson_engineering',
    name: 'Dyson Engineering',
    category: 'engineering',
    description: 'Construct Dyson Swarm components',
    tier: 5,
    maxLevel: 5,
    prerequisites: ['quantum_basics', 'factory_ai'],
    effects: {
      crafting_speed: {
        'solar_sail': 0.15,
        'dyson_receiver': 0.1,
      },
      swarm_efficiency: 0.1, // +10% energy collection per level
      unlock: {
        1: ['solar_sail_assembler'],
        3: ['dyson_receiver'],
        5: ['dyson_control_station'],
      },
    },
    learningCurve: 'very_hard',
  },
  {
    id: 'megastructure_mastery',
    name: 'Megastructure Mastery',
    category: 'engineering',
    description: 'Ultimate engineering - build stellar megastructures',
    tier: 6,
    maxLevel: 5,
    prerequisites: ['dyson_engineering'],
    effects: {
      construction_speed: {
        'dyson_sphere_segment': 0.1,
      },
      megastructure_durability: 0.15, // +15% longevity per level
      unlock: {
        5: ['dyson_sphere_complete'],
      },
    },
    learningCurve: 'extreme',
  },
];

/**
 * Get all skills in a specific tier
 */
export function getEngineerSkillsByTier(tier: number): SkillDefinition[] {
  return ENGINEER_SKILLS.filter((skill) => skill.tier === tier);
}

/**
 * Get prerequisites for a skill
 */
export function getSkillPrerequisites(skillId: string): SkillDefinition[] {
  const skill = ENGINEER_SKILLS.find((s) => s.id === skillId);
  if (!skill) return [];

  return ENGINEER_SKILLS.filter((s) => skill.prerequisites.includes(s.id));
}

/**
 * Check if an agent can learn a skill based on prerequisites
 */
export function canLearnSkill(
  skillId: string,
  currentSkills: Map<string, number>
): boolean {
  const skill = ENGINEER_SKILLS.find((s) => s.id === skillId);
  if (!skill) return false;

  // Check all prerequisites are met
  for (const prereqId of skill.prerequisites) {
    const prereqLevel = currentSkills.get(prereqId) || 0;
    if (prereqLevel === 0) return false;
  }

  return true;
}

/**
 * Get skill tree visualization data
 */
export function getEngineerSkillTreeData(): {
  nodes: Array<{
    id: string;
    name: string;
    tier: number;
    x: number;
    y: number;
  }>;
  edges: Array<{ from: string; to: string }>;
} {
  const nodes: Array<{
    id: string;
    name: string;
    tier: number;
    x: number;
    y: number;
  }> = [];
  const edges: Array<{ from: string; to: string }> = [];

  // Organize by tier and specialization
  const tiers = new Map<number, SkillDefinition[]>();
  for (const skill of ENGINEER_SKILLS) {
    const tierSkills = tiers.get(skill.tier) || [];
    tierSkills.push(skill);
    tiers.set(skill.tier, tierSkills);
  }

  // Create nodes with positions
  for (const [tier, skills] of tiers.entries()) {
    skills.forEach((skill, index) => {
      nodes.push({
        id: skill.id,
        name: skill.name,
        tier,
        x: index * 100,
        y: tier * 80,
      });

      // Create edges for prerequisites
      for (const prereqId of skill.prerequisites) {
        edges.push({ from: prereqId, to: skill.id });
      }
    });
  }

  return { nodes, edges };
}

/**
 * Calculate total XP required to max all engineer skills
 */
export function getTotalEngineerXPRequired(): number {
  let total = 0;
  for (const skill of ENGINEER_SKILLS) {
    // Assuming exponential XP curve: level^2 * 100
    for (let level = 1; level <= skill.maxLevel; level++) {
      total += level * level * 100;
    }
  }
  return total;
}

/**
 * Get recommended skill path for new engineers
 */
export function getRecommendedSkillPath(): SkillDefinition[] {
  return [
    // Tier 1: Foundation
    ENGINEER_SKILLS.find((s) => s.id === 'mechanical_basics')!,
    ENGINEER_SKILLS.find((s) => s.id === 'electronics_basics')!,
    ENGINEER_SKILLS.find((s) => s.id === 'power_basics')!,

    // Tier 2: Specialization
    ENGINEER_SKILLS.find((s) => s.id === 'assembly_machines')!,
    ENGINEER_SKILLS.find((s) => s.id === 'belt_systems')!,
    ENGINEER_SKILLS.find((s) => s.id === 'circuit_design')!,
    ENGINEER_SKILLS.find((s) => s.id === 'factory_planning')!,

    // Tier 3: Advanced
    ENGINEER_SKILLS.find((s) => s.id === 'advanced_automation')!,
    ENGINEER_SKILLS.find((s) => s.id === 'processing_units')!,
    ENGINEER_SKILLS.find((s) => s.id === 'production_optimization')!,

    // Tier 4+: Master
    ENGINEER_SKILLS.find((s) => s.id === 'factory_ai')!,
    ENGINEER_SKILLS.find((s) => s.id === 'quantum_basics')!,
    ENGINEER_SKILLS.find((s) => s.id === 'dyson_engineering')!,
  ].filter(Boolean);
}
