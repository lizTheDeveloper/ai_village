/**
 * ArchitectureSkillTree - Skill tree for building design and construction
 *
 * Key mechanics:
 * - Shelter Design (basic protection from elements)
 * - Workspace Layout (efficient crafting stations)
 * - Room Composition (multi-room building design)
 * - Material Mastery (optimal material selection)
 * - Blueprint Creation (design new building types)
 * - Monumental Architecture (large-scale community buildings)
 *
 * Core concept:
 * - Buildings are more than structures - they shape how people live and work
 * - Good design improves efficiency, comfort, and community
 * - Progression unlocks more complex building types and techniques
 *
 * Integration with Building System:
 * - Unlocks higher-tier buildings from BuildingBlueprintRegistry
 * - Improves construction speed and quality
 * - Enables use of the LLM building designer tool
 * - Agents can specialize as architects who plan for the community
 *
 * Building Categories Addressed:
 * - residential (shelters, homes)
 * - production (workshops, forges)
 * - storage (chests, barns, granaries)
 * - community (meeting halls, town halls)
 * - religious (temples, shrines)
 * - farming (coops, stables, irrigation)
 * - research (libraries, labs)
 */

import type { MagicSkillTree, MagicSkillNode, MagicXPSource } from '../MagicSkillTree.js';
import {
  createSkillNode,
  createSkillEffect,
  createDefaultTreeRules,
} from '../MagicSkillTree.js';

// ============================================================================
// Constants
// ============================================================================

const PARADIGM_ID = 'architecture';

/** Building tiers from the building system */
export const BUILDING_TIERS = {
  tier1: {
    description: 'Basic structures',
    examples: ['tent', 'lean-to', 'campfire', 'workbench', 'storage-chest'],
    skillRequired: 0,
  },
  tier2: {
    description: 'Crafting stations and animal housing',
    examples: ['forge', 'farm_shed', 'chicken-coop', 'stable'],
    skillRequired: 1,
  },
  tier3: {
    description: 'Advanced production buildings',
    examples: ['workshop', 'barn', 'windmill'],
    skillRequired: 2,
  },
  tier4: {
    description: 'Community and governance',
    examples: ['town-hall', 'meeting-hall', 'archive'],
    skillRequired: 3,
  },
  tier5: {
    description: 'Monumental and specialized',
    examples: ['inventors_hall', 'arcane_tower', 'grand_temple'],
    skillRequired: 4,
  },
} as const;

/** Building categories */
export const BUILDING_CATEGORIES = {
  residential: 'Living spaces for rest and shelter',
  production: 'Crafting and manufacturing',
  storage: 'Resource and item storage',
  commercial: 'Trade and commerce',
  community: 'Social gathering spaces',
  farming: 'Agriculture and animal husbandry',
  research: 'Knowledge and invention',
  governance: 'Administration and records',
  religious: 'Worship and spiritual practice',
  decoration: 'Aesthetic improvements',
} as const;

/** Design principles that affect building quality */
export const DESIGN_PRINCIPLES = {
  flow: 'Movement paths through the building',
  proportion: 'Room size and shape ratios',
  lighting: 'Natural and artificial light placement',
  ventilation: 'Air circulation and smoke handling',
  accessibility: 'Ease of entry and navigation',
  storage_integration: 'Built-in storage solutions',
  thermal_design: 'Heating and insulation',
  acoustic: 'Sound management for privacy or gathering',
} as const;

/** Material categories and their properties */
export const MATERIAL_PROPERTIES = {
  wood: { durability: 2, insulation: 3, cost: 1, beauty: 2 },
  stone: { durability: 5, insulation: 4, cost: 3, beauty: 3 },
  mud_brick: { durability: 2, insulation: 4, cost: 1, beauty: 1 },
  thatch: { durability: 1, insulation: 2, cost: 1, beauty: 2 },
  metal: { durability: 5, insulation: 1, cost: 4, beauty: 3 },
  glass: { durability: 1, insulation: 1, cost: 4, beauty: 4 },
  ice: { durability: 2, insulation: 5, cost: 2, beauty: 4 },
} as const;

// ============================================================================
// Foundation Nodes - Basic Construction
// ============================================================================

const SHELTER_BASICS_NODE = createSkillNode(
  'shelter-basics',
  'Shelter Basics',
  PARADIGM_ID,
  'foundation',
  0,
  20,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'build_tier1' },
      description: 'Can build basic shelters and structures',
    }),
    createSkillEffect('technique_proficiency', 5, {
      description: 'Faster construction of basic buildings',
    }),
  ],
  {
    description: 'Learn to construct basic shelters from simple materials.',
    lore: `Every builder starts here - with the fundamentals.
A lean-to against the rain, a fire pit for warmth, a box for storage.
These simple structures are the foundation of all architecture.`,
    maxLevel: 3,
    levelCostMultiplier: 1.2,
    icon: '🏕️',
  }
);

const MATERIAL_KNOWLEDGE_NODE = createSkillNode(
  'material-knowledge',
  'Material Knowledge',
  PARADIGM_ID,
  'foundation',
  1,
  25,
  [
    createSkillEffect('perception', 5, {
      description: 'Assess material quality before use',
    }),
    createSkillEffect('resource_efficiency', 10, {
      description: 'Less waste when cutting and shaping materials',
    }),
  ],
  {
    description: 'Understand the properties of different building materials.',
    lore: `Wood, stone, mud, thatch - each has its nature.
Wood is warm but burns. Stone endures but chills.
Learn what each material offers and demands.`,
    maxLevel: 3,
    prerequisites: ['shelter-basics'],
    icon: '🪵',
  }
);

const STRUCTURAL_UNDERSTANDING_NODE = createSkillNode(
  'structural-understanding',
  'Structural Understanding',
  PARADIGM_ID,
  'foundation',
  1,
  25,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'assess_stability' },
      description: 'Evaluate structural integrity',
    }),
    createSkillEffect('technique_proficiency', 5, {
      description: 'Buildings are more stable',
    }),
  ],
  {
    description: 'Grasp how weight and forces flow through structures.',
    lore: `A roof pushes outward as well as down.
Walls must brace against wind and their own load.
Understanding these forces prevents collapse.`,
    maxLevel: 3,
    prerequisites: ['shelter-basics'],
    icon: '🏗️',
  }
);

// ============================================================================
// Technique Nodes - Specialized Knowledge
// ============================================================================

const WORKSPACE_DESIGN_NODE = createSkillNode(
  'workspace-design',
  'Workspace Design',
  PARADIGM_ID,
  'technique',
  2,
  35,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'design_workshop' },
      description: 'Design efficient crafting spaces',
    }),
    createSkillEffect('technique_proficiency', 10, {
      description: 'Workshops provide crafting speed bonus',
    }),
  ],
  {
    description: 'Design workspaces that enhance productivity.',
    lore: `A craftsman's space should serve their craft.
Tools within reach, materials flowing in, products flowing out.
Good workshop design can double a worker's output.`,
    maxLevel: 3,
    prerequisites: ['material-knowledge', 'structural-understanding'],
    icon: '🔨',
  }
);

const THERMAL_DESIGN_NODE = createSkillNode(
  'thermal-design',
  'Thermal Design',
  PARADIGM_ID,
  'technique',
  2,
  35,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'design_insulation' },
      description: 'Design for temperature control',
    }),
    createSkillEffect('technique_proficiency', 10, {
      description: 'Buildings maintain comfortable temperature',
    }),
  ],
  {
    description: 'Control heat flow through building design.',
    lore: `Thick walls hold warmth in winter, coolness in summer.
Hearth placement, window size, ceiling height - all affect comfort.
Master these and your buildings will be havens in any season.`,
    maxLevel: 3,
    prerequisites: ['material-knowledge'],
    icon: '🌡️',
  }
);

const STORAGE_ARCHITECTURE_NODE = createSkillNode(
  'storage-architecture',
  'Storage Architecture',
  PARADIGM_ID,
  'technique',
  2,
  30,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'design_storage' },
      description: 'Design efficient storage buildings',
    }),
    createSkillEffect('technique_proficiency', 15, {
      description: 'Storage buildings have increased capacity',
    }),
  ],
  {
    description: 'Maximize storage capacity through clever design.',
    lore: `A good granary keeps grain dry and accessible.
A proper barn shelters animals and their feed.
Space is precious - learn to use every corner.`,
    maxLevel: 3,
    prerequisites: ['structural-understanding'],
    icon: '📦',
  }
);

const ANIMAL_HOUSING_NODE = createSkillNode(
  'animal-housing',
  'Animal Housing',
  PARADIGM_ID,
  'technique',
  2,
  35,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'design_animal_housing' },
      description: 'Design healthy animal shelters',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'build_tier2_animal' },
      description: 'Build chicken coops, stables, kennels',
    }),
  ],
  {
    description: 'Design housing that keeps animals healthy and productive.',
    lore: `Each creature has its needs. Chickens want roosts.
Horses need space to move. Bees require ventilation.
Design for the animal, and they will thrive.`,
    maxLevel: 3,
    prerequisites: ['shelter-basics', 'structural-understanding'],
    icon: '🐔',
  }
);

// ============================================================================
// Specialization Nodes - Advanced Design
// ============================================================================

const ROOM_COMPOSITION_NODE = createSkillNode(
  'room-composition',
  'Room Composition',
  PARADIGM_ID,
  'specialization',
  3,
  50,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'compose_rooms' },
      description: 'Combine room types into coherent buildings',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'use_building_designer' },
      description: 'Access the LLM building designer tool',
    }),
  ],
  {
    description: 'Compose multiple rooms into functional buildings.',
    lore: `A house is more than rooms - it is how they connect.
Kitchen near dining, bedroom away from noise, storage accessible.
Learn to compose rooms into harmonious wholes.`,
    maxLevel: 3,
    prerequisites: ['workspace-design', 'thermal-design'],
    icon: '🏠',
  }
);

const MULTI_FLOOR_DESIGN_NODE = createSkillNode(
  'multi-floor-design',
  'Multi-Floor Design',
  PARADIGM_ID,
  'specialization',
  3,
  55,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'design_stairs' },
      description: 'Add stairs and upper floors',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'build_tier3' },
      description: 'Build advanced multi-story structures',
    }),
  ],
  {
    description: 'Design buildings that rise multiple stories.',
    lore: `Height brings advantages - views, status, safety from floods.
But stairs must be safe, floors must bear weight, and
upper rooms need their own considerations.`,
    maxLevel: 3,
    prerequisites: ['structural-understanding', 'room-composition'],
    icon: '🏢',
  }
);

const BLUEPRINT_CREATION_NODE = createSkillNode(
  'blueprint-creation',
  'Blueprint Creation',
  PARADIGM_ID,
  'specialization',
  3,
  60,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'create_blueprint' },
      description: 'Draw plans others can follow',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'share_designs' },
      description: 'Teach building designs to others',
    }),
  ],
  {
    description: 'Create detailed plans that others can follow.',
    lore: `A blueprint captures your vision in lines and symbols.
With it, any skilled builder can recreate your design.
Your best ideas can spread throughout the village.`,
    maxLevel: 3,
    prerequisites: ['room-composition'],
    icon: '📐',
  }
);

const SPECIALIZED_PRODUCTION_NODE = createSkillNode(
  'specialized-production',
  'Specialized Production',
  PARADIGM_ID,
  'specialization',
  3,
  55,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'design_forge' },
      description: 'Design forges, kilns, and furnaces',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'design_laboratory' },
      description: 'Design research laboratories',
    }),
  ],
  {
    description: 'Design buildings for specialized production.',
    lore: `A forge needs ventilation for smoke, space for bellows,
and walls that won't catch fire. Each specialized building
has requirements that must be understood and respected.`,
    maxLevel: 3,
    prerequisites: ['workspace-design', 'thermal-design'],
    icon: '⚒️',
  }
);

// ============================================================================
// Mastery Nodes - Expert Architecture
// ============================================================================

const COMMUNITY_BUILDINGS_NODE = createSkillNode(
  'community-buildings',
  'Community Buildings',
  PARADIGM_ID,
  'mastery',
  4,
  70,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'design_meeting_hall' },
      description: 'Design spaces for community gathering',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'build_tier4' },
      description: 'Build governance and community structures',
    }),
  ],
  {
    description: 'Design buildings that serve the entire community.',
    lore: `A meeting hall must hold many, let all see the speaker,
and feel welcoming to all. Town halls need record storage,
private offices, and public spaces. Think of the community.`,
    maxLevel: 3,
    prerequisites: ['room-composition', 'multi-floor-design'],
    icon: '🏛️',
  }
);

const AESTHETIC_MASTERY_NODE = createSkillNode(
  'aesthetic-mastery',
  'Aesthetic Mastery',
  PARADIGM_ID,
  'mastery',
  4,
  60,
  [
    createSkillEffect('technique_proficiency', 20, {
      description: 'Buildings provide mood bonus to occupants',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'decorative_elements' },
      description: 'Add carved details, painted surfaces',
    }),
  ],
  {
    description: 'Create buildings that are beautiful as well as functional.',
    lore: `Function is the foundation, but beauty elevates.
Carved eaves, painted trim, pleasing proportions -
these transform shelter into home, workspace into sanctuary.`,
    maxLevel: 3,
    prerequisites: ['room-composition', 'blueprint-creation'],
    icon: '🎨',
  }
);

const SACRED_ARCHITECTURE_NODE = createSkillNode(
  'sacred-architecture',
  'Sacred Architecture',
  PARADIGM_ID,
  'mastery',
  4,
  65,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'design_temple' },
      description: 'Design temples and sacred spaces',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'design_shrine' },
      description: 'Create shrines and meditation spaces',
    }),
  ],
  {
    description: 'Design spaces that inspire spiritual connection.',
    lore: `Sacred spaces follow different rules.
Light falls just so, sound reverberates or hushes,
and something ineffable makes the spirit stir.`,
    maxLevel: 3,
    prerequisites: ['aesthetic-mastery', 'community-buildings'],
    icon: '⛪',
  }
);

const INFRASTRUCTURE_DESIGN_NODE = createSkillNode(
  'infrastructure-design',
  'Infrastructure Design',
  PARADIGM_ID,
  'mastery',
  4,
  65,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'design_irrigation' },
      description: 'Plan water channels and wells',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'design_roads' },
      description: 'Plan roads and pathways',
    }),
  ],
  {
    description: 'Design the systems that connect buildings.',
    lore: `Buildings alone do not make a village.
Water must flow, roads must connect, waste must be managed.
The infrastructure between buildings is architecture too.`,
    maxLevel: 3,
    prerequisites: ['community-buildings', 'specialized-production'],
    icon: '🌊',
  }
);

// ============================================================================
// Grand Mastery Nodes - Legendary Architecture
// ============================================================================

const MONUMENTAL_ARCHITECTURE_NODE = createSkillNode(
  'monumental-architecture',
  'Monumental Architecture',
  PARADIGM_ID,
  'mastery',
  5,
  90,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'design_monument' },
      description: 'Design grand monuments and towers',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'build_tier5' },
      description: 'Build legendary structures',
    }),
  ],
  {
    description: 'Create structures that will stand for generations.',
    lore: `Some buildings transcend their builders.
The great tower, the grand temple, the inventors' hall -
these become landmarks that define a civilization.`,
    maxLevel: 3,
    prerequisites: ['sacred-architecture', 'infrastructure-design'],
    icon: '🗼',
  }
);

const MASTER_ARCHITECT_NODE = createSkillNode(
  'master-architect',
  'Master Architect',
  PARADIGM_ID,
  'mastery',
  5,
  100,
  [
    createSkillEffect('technique_proficiency', 30, {
      description: 'All buildings gain quality bonus',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'architect_consultation' },
      description: 'Other builders seek your guidance',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'legacy_designs' },
      description: 'Create designs that persist after death',
    }),
  ],
  {
    description: 'Achieve mastery recognized throughout the land.',
    lore: `The master architect sees the whole - how buildings
serve people, how villages grow, how form serves function.
Your designs become the standard others aspire to.`,
    maxLevel: 3,
    prerequisites: ['monumental-architecture', 'aesthetic-mastery'],
    icon: '👑',
  }
);

const URBAN_PLANNING_NODE = createSkillNode(
  'urban-planning',
  'Urban Planning',
  PARADIGM_ID,
  'mastery',
  5,
  85,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'plan_district' },
      description: 'Plan entire districts and neighborhoods',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'zone_planning' },
      description: 'Designate zones for different uses',
    }),
  ],
  {
    description: 'Plan the layout of entire settlements.',
    lore: `Beyond individual buildings lies the village itself.
Where should homes cluster? Where should industry go?
The urban planner shapes how a community grows.`,
    maxLevel: 3,
    prerequisites: ['infrastructure-design', 'community-buildings'],
    icon: '🗺️',
  }
);

// ============================================================================
// Spatial Harmony Nodes - Feng Shui for Architects
// ============================================================================

const FLOW_AWARENESS_NODE = createSkillNode(
  'flow-awareness',
  'Flow Awareness',
  PARADIGM_ID,
  'technique',
  2,
  35,
  [
    createSkillEffect('perception', 10, {
      description: 'Sense how energy moves through spaces',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'analyze_chi_flow' },
      description: 'Identify stagnant areas and Sha Qi lines',
    }),
  ],
  {
    description: 'Understand how energy flows through buildings.',
    lore: `Good architects know that spaces breathe.
Air, light, and movement follow invisible paths.
Learn to see these flows and design around them.`,
    maxLevel: 3,
    prerequisites: ['room-composition'],
    icon: '🌬️',
  }
);

const PROPORTIONAL_HARMONY_NODE = createSkillNode(
  'proportional-harmony',
  'Proportional Harmony',
  PARADIGM_ID,
  'technique',
  2,
  30,
  [
    createSkillEffect('perception', 5, {
      description: 'Intuit pleasing room proportions',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'golden_ratio_design' },
      description: 'Design rooms with golden ratio proportions',
    }),
  ],
  {
    description: 'Design rooms with naturally pleasing proportions.',
    lore: `The ratio of 1.618 appears throughout nature.
Rooms that approach this proportion feel right.
Neither too long, nor too square - balanced.`,
    maxLevel: 3,
    prerequisites: ['room-composition'],
    icon: '📐',
  }
);

const COMMANDING_POSITIONS_NODE = createSkillNode(
  'commanding-positions',
  'Commanding Positions',
  PARADIGM_ID,
  'specialization',
  3,
  45,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'place_commanding' },
      description: 'Position beds, desks, and thrones optimally',
    }),
    createSkillEffect('technique_proficiency', 10, {
      description: 'Occupants feel more secure and productive',
    }),
  ],
  {
    description: 'Place key furniture in positions of power.',
    lore: `A bed should see the door but not face it directly.
A desk should have a wall behind and view of entry.
These commanding positions grant security and awareness.`,
    maxLevel: 3,
    prerequisites: ['flow-awareness'],
    icon: '👁️',
  }
);

const ELEMENT_BALANCE_NODE = createSkillNode(
  'element-balance',
  'Element Balance',
  PARADIGM_ID,
  'specialization',
  3,
  50,
  [
    createSkillEffect('perception', 10, {
      description: 'Sense element imbalances in spaces',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'balance_elements' },
      description: 'Add materials to balance wood, fire, earth, metal, water',
    }),
  ],
  {
    description: 'Balance the five elements in building design.',
    lore: `Wood, fire, earth, metal, water - all must be present.
Stone walls need wooden furniture. Metal tools need plants.
Balance creates spaces where people thrive.`,
    maxLevel: 3,
    prerequisites: ['flow-awareness', 'material-knowledge'],
    icon: '⚖️',
  }
);

const SPATIAL_HARMONY_MASTERY_NODE = createSkillNode(
  'spatial-harmony-mastery',
  'Spatial Harmony Mastery',
  PARADIGM_ID,
  'mastery',
  4,
  65,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'full_harmony_analysis' },
      description: 'Perform complete Feng Shui analysis on buildings',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'harmony_optimization' },
      description: 'Evolve designs for maximum harmony score',
    }),
    createSkillEffect('technique_proficiency', 20, {
      description: 'Designed buildings start with +20 harmony',
    }),
  ],
  {
    description: 'Master the art of spatially harmonious design.',
    lore: `The master architect considers all factors together:
flow, proportion, position, element balance.
Their buildings feel right the moment you enter.`,
    maxLevel: 3,
    prerequisites: ['commanding-positions', 'element-balance', 'proportional-harmony'],
    icon: '☯️',
  }
);

// ============================================================================
// Efficiency Nodes - Construction Speed
// ============================================================================

const QUICK_CONSTRUCTION_NODE = createSkillNode(
  'quick-construction',
  'Quick Construction',
  PARADIGM_ID,
  'efficiency',
  2,
  30,
  [
    createSkillEffect('resource_efficiency', 20, {
      description: 'Construction completes 20% faster',
    }),
  ],
  {
    description: 'Build faster through efficient techniques.',
    lore: `Experience teaches shortcuts that don't sacrifice quality.
Prepare materials in advance, work in logical sequence,
and a building rises in half the time.`,
    maxLevel: 5,
    prerequisites: ['shelter-basics'],
    icon: '⚡',
  }
);

const MATERIAL_EFFICIENCY_NODE = createSkillNode(
  'material-efficiency',
  'Material Efficiency',
  PARADIGM_ID,
  'efficiency',
  3,
  40,
  [
    createSkillEffect('cost_reduction', 15, {
      description: 'Buildings require 15% fewer resources',
    }),
  ],
  {
    description: 'Use materials more efficiently with less waste.',
    lore: `Every scrap has a use. Offcuts become pegs.
Stone chips fill gaps. Sawdust becomes insulation.
The efficient builder wastes nothing.`,
    maxLevel: 3,
    prerequisites: ['material-knowledge'],
    icon: '♻️',
  }
);

const CONSTRUCTION_LEADERSHIP_NODE = createSkillNode(
  'construction-leadership',
  'Construction Leadership',
  PARADIGM_ID,
  'efficiency',
  4,
  55,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'lead_construction' },
      description: 'Coordinate multiple builders',
    }),
    createSkillEffect('technique_proficiency', 15, {
      description: 'Team construction bonus',
    }),
  ],
  {
    description: 'Lead teams of builders to complete large projects.',
    lore: `Great buildings require many hands.
The construction leader assigns tasks, coordinates timing,
and ensures all parts come together correctly.`,
    maxLevel: 3,
    prerequisites: ['blueprint-creation', 'quick-construction'],
    icon: '👷',
  }
);

// ============================================================================
// All Nodes Collection
// ============================================================================

const ALL_NODES: MagicSkillNode[] = [
  // Foundation
  SHELTER_BASICS_NODE,
  MATERIAL_KNOWLEDGE_NODE,
  STRUCTURAL_UNDERSTANDING_NODE,
  // Technique
  WORKSPACE_DESIGN_NODE,
  THERMAL_DESIGN_NODE,
  STORAGE_ARCHITECTURE_NODE,
  ANIMAL_HOUSING_NODE,
  // Specialization
  ROOM_COMPOSITION_NODE,
  MULTI_FLOOR_DESIGN_NODE,
  BLUEPRINT_CREATION_NODE,
  SPECIALIZED_PRODUCTION_NODE,
  // Mastery
  COMMUNITY_BUILDINGS_NODE,
  AESTHETIC_MASTERY_NODE,
  SACRED_ARCHITECTURE_NODE,
  INFRASTRUCTURE_DESIGN_NODE,
  // Grand Mastery
  MONUMENTAL_ARCHITECTURE_NODE,
  MASTER_ARCHITECT_NODE,
  URBAN_PLANNING_NODE,
  // Spatial Harmony (Feng Shui)
  FLOW_AWARENESS_NODE,
  PROPORTIONAL_HARMONY_NODE,
  COMMANDING_POSITIONS_NODE,
  ELEMENT_BALANCE_NODE,
  SPATIAL_HARMONY_MASTERY_NODE,
  // Efficiency
  QUICK_CONSTRUCTION_NODE,
  MATERIAL_EFFICIENCY_NODE,
  CONSTRUCTION_LEADERSHIP_NODE,
];

// ============================================================================
// XP Sources
// ============================================================================

const XP_SOURCES: MagicXPSource[] = [
  {
    eventType: 'complete_building',
    xpAmount: 20,
    description: 'Complete construction of any building',
  },
  {
    eventType: 'complete_tier2_building',
    xpAmount: 35,
    description: 'Complete a Tier 2 building',
  },
  {
    eventType: 'complete_tier3_building',
    xpAmount: 50,
    description: 'Complete a Tier 3 building',
  },
  {
    eventType: 'complete_tier4_building',
    xpAmount: 75,
    description: 'Complete a Tier 4 building',
  },
  {
    eventType: 'complete_tier5_building',
    xpAmount: 100,
    description: 'Complete a Tier 5 building',
  },
  {
    eventType: 'create_blueprint',
    xpAmount: 40,
    description: 'Create a new building blueprint',
  },
  {
    eventType: 'teach_design',
    xpAmount: 25,
    description: 'Teach a building design to another agent',
  },
  {
    eventType: 'optimize_layout',
    xpAmount: 30,
    description: 'Improve an existing building layout',
  },
  {
    eventType: 'repair_building',
    xpAmount: 10,
    description: 'Repair a damaged building',
  },
  {
    eventType: 'lead_construction',
    xpAmount: 45,
    description: 'Lead a team to complete a building',
  },
  // Spatial Harmony XP sources
  {
    eventType: 'analyze_building_harmony',
    xpAmount: 15,
    description: 'Analyze the Feng Shui of an existing building',
  },
  {
    eventType: 'improve_building_harmony',
    xpAmount: 30,
    description: 'Improve a building\'s harmony score',
  },
  {
    eventType: 'design_harmonious_building',
    xpAmount: 50,
    description: 'Design a building with 70+ harmony score',
  },
  {
    eventType: 'achieve_sublime_harmony',
    xpAmount: 75,
    description: 'Create a building with 90+ harmony score',
  },
];

// ============================================================================
// Skill Tree Export
// ============================================================================

export const ARCHITECTURE_SKILL_TREE: MagicSkillTree = {
  id: 'architecture_skill_tree',
  name: 'Art of Building',
  paradigmId: PARADIGM_ID,
  description: `The knowledge of designing and constructing buildings.
From simple shelters to grand monuments, architects shape the
physical environment where communities live, work, and gather.
Progression unlocks more complex building types and techniques.`,
  nodes: ALL_NODES,
  entryNodes: ['shelter-basics'],
  connections: ALL_NODES.flatMap(node =>
    (node.prerequisites ?? []).map(prereq => ({ from: prereq, to: node.id }))
  ),
  xpSources: XP_SOURCES,
  rules: {
    ...createDefaultTreeRules(false),
    permanentProgress: true,
  },
  version: 1,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get building tier from skill level.
 */
export function getBuildingTierForSkillLevel(
  skillLevel: number
): keyof typeof BUILDING_TIERS {
  if (skillLevel >= 4) return 'tier5';
  if (skillLevel >= 3) return 'tier4';
  if (skillLevel >= 2) return 'tier3';
  if (skillLevel >= 1) return 'tier2';
  return 'tier1';
}

/**
 * Check if an agent can build a specific tier.
 */
export function canBuildTier(
  agentArchitectureLevel: number,
  buildingTier: keyof typeof BUILDING_TIERS
): boolean {
  const requiredLevel = BUILDING_TIERS[buildingTier].skillRequired;
  return agentArchitectureLevel >= requiredLevel;
}

/**
 * Calculate construction speed bonus from architecture skill.
 * Returns a multiplier (1.0 = normal, 1.5 = 50% faster).
 */
export function getConstructionSpeedMultiplier(architectureLevel: number): number {
  // Each level provides 10% speed bonus
  return 1 + architectureLevel * 0.1;
}

/**
 * Calculate material efficiency from skill level.
 * Returns percentage of materials saved (0-30%).
 */
export function getMaterialEfficiency(architectureLevel: number): number {
  // Level 0: 0%, Level 5: 25%
  return Math.min(architectureLevel * 5, 25);
}

/**
 * Calculate quality bonus for buildings designed by architect.
 * Affects storage capacity, durability, comfort.
 */
export function getArchitectureQualityBonus(architectureLevel: number): number {
  // Level 0: 0%, Level 5: 30%
  return Math.min(architectureLevel * 6, 30);
}

/**
 * Get list of building categories unlocked at a skill level.
 */
export function getUnlockedCategories(
  architectureLevel: number
): Array<keyof typeof BUILDING_CATEGORIES> {
  const categories: Array<keyof typeof BUILDING_CATEGORIES> = [];

  // Always available
  categories.push('residential', 'storage');

  if (architectureLevel >= 1) {
    categories.push('production', 'farming');
  }
  if (architectureLevel >= 2) {
    categories.push('commercial');
  }
  if (architectureLevel >= 3) {
    categories.push('community', 'research');
  }
  if (architectureLevel >= 4) {
    categories.push('governance', 'religious');
  }
  if (architectureLevel >= 5) {
    categories.push('decoration'); // Pure decoration is a luxury
  }

  return categories;
}

/**
 * Calculate maximum building size (in tiles) for skill level.
 */
export function getMaxBuildingSize(architectureLevel: number): {
  width: number;
  height: number;
  floors: number;
} {
  const level = Math.min(Math.max(architectureLevel, 0), 5);

  switch (level) {
    case 1: return { width: 10, height: 10, floors: 1 };
    case 2: return { width: 15, height: 15, floors: 2 };
    case 3: return { width: 20, height: 20, floors: 3 };
    case 4: return { width: 30, height: 30, floors: 4 };
    case 5: return { width: 50, height: 50, floors: 5 };
    default: return { width: 6, height: 6, floors: 1 };
  }
}

/**
 * Check if agent has unlocked the LLM building designer.
 */
export function hasUnlockedBuildingDesigner(unlockedNodes: string[]): boolean {
  return unlockedNodes.includes('room-composition');
}

/**
 * Check if agent can perform Feng Shui analysis.
 */
export function canAnalyzeHarmony(unlockedNodes: string[]): boolean {
  return unlockedNodes.includes('flow-awareness');
}

/**
 * Check if agent has full spatial harmony mastery.
 */
export function hasSpatialHarmonyMastery(unlockedNodes: string[]): boolean {
  return unlockedNodes.includes('spatial-harmony-mastery');
}

/**
 * Get harmony bonus for buildings designed by this architect.
 * Based on which spatial harmony nodes are unlocked.
 */
export function getDesignHarmonyBonus(unlockedNodes: string[]): number {
  let bonus = 0;

  if (unlockedNodes.includes('flow-awareness')) bonus += 5;
  if (unlockedNodes.includes('proportional-harmony')) bonus += 5;
  if (unlockedNodes.includes('commanding-positions')) bonus += 5;
  if (unlockedNodes.includes('element-balance')) bonus += 5;
  if (unlockedNodes.includes('spatial-harmony-mastery')) bonus += 10;

  return bonus; // Max 30 bonus
}
