/**
 * FengShuiSkillTree - Skill tree for spatial harmony magic
 *
 * Key mechanics:
 * - Chi Sensitivity (perceive energy flow in spaces)
 * - Element Reading (detect five-element balance in areas)
 * - Sha Qi Detection (sense "killing breath" from straight lines)
 * - Commanding Positions (find power spots in rooms)
 * - Flow Manipulation (redirect chi through space)
 * - Harmony Crafting (optimize spaces for wellbeing)
 *
 * Core concept:
 * - Spaces have living energy (chi) that flows through them
 * - Five elements (wood, fire, earth, metal, water) must be balanced
 * - Proper arrangement creates harmony; poor arrangement causes stagnation
 * - Golden ratio proportions resonate with natural order
 *
 * Integration with Building System:
 * - Uses FengShuiAnalysis from building designer
 * - Agents can sense harmony scores of buildings
 * - Masters can improve spaces through furniture/material placement
 *
 * Risks:
 * - Chi overload (too much energy sensitivity)
 * - Element imbalance in self
 * - Becoming dependent on perfect spaces
 * - Losing ability to function in disharmonious areas
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

const PARADIGM_ID = 'feng_shui_magic';

/** The five classical elements and their associations */
export const FENG_SHUI_ELEMENTS = {
  wood: {
    description: 'Growth, vitality, expansion',
    direction: 'east',
    season: 'spring',
    materials: ['wood', 'thatch', 'bamboo', 'plants'],
    colors: ['green', 'brown'],
    generates: 'fire',
    controls: 'earth',
  },
  fire: {
    description: 'Passion, transformation, illumination',
    direction: 'south',
    season: 'summer',
    materials: ['candles', 'hearth', 'torch'],
    colors: ['red', 'orange', 'pink'],
    generates: 'earth',
    controls: 'metal',
  },
  earth: {
    description: 'Stability, nourishment, grounding',
    direction: 'center',
    season: 'late_summer',
    materials: ['stone', 'mud_brick', 'clay', 'ceramic'],
    colors: ['yellow', 'tan', 'brown'],
    generates: 'metal',
    controls: 'water',
  },
  metal: {
    description: 'Precision, clarity, completion',
    direction: 'west',
    season: 'autumn',
    materials: ['metal', 'iron', 'gold', 'silver'],
    colors: ['white', 'gray', 'metallic'],
    generates: 'water',
    controls: 'wood',
  },
  water: {
    description: 'Wisdom, flow, adaptability',
    direction: 'north',
    season: 'winter',
    materials: ['glass', 'ice', 'mirrors', 'fountains'],
    colors: ['blue', 'black'],
    generates: 'wood',
    controls: 'fire',
  },
} as const;

/** Chi flow states */
export const CHI_FLOW_STATES = {
  stagnant: 'Energy is blocked and pooling',
  weak: 'Energy moves sluggishly',
  balanced: 'Energy flows naturally and evenly',
  strong: 'Energy moves vigorously through space',
  rushing: 'Energy moves too fast (Sha Qi risk)',
  sha_qi: 'Killing breath - harmful straight-line energy',
} as const;

/** Harmony score thresholds */
export const HARMONY_LEVELS = {
  discordant: { min: 0, max: 20, description: 'Deeply imbalanced, causes distress' },
  disharmonious: { min: 21, max: 40, description: 'Noticeable problems affecting wellbeing' },
  neutral: { min: 41, max: 60, description: 'Neither harmful nor beneficial' },
  harmonious: { min: 61, max: 80, description: 'Pleasant and supportive energy' },
  sublime: { min: 81, max: 100, description: 'Perfect balance, enhances all activities' },
} as const;

/** Commanding position types */
export const COMMANDING_POSITIONS = {
  bed: 'Diagonal view of entrance, solid wall behind',
  desk: 'Clear sightline to door, no back to entrance',
  stove: 'Cook should see room entrance',
  throne: 'Elevated with walls on sides, view of all entrances',
} as const;

// ============================================================================
// Foundation Nodes - Chi Awareness
// ============================================================================

const CHI_SENSITIVITY_NODE = createSkillNode(
  'chi-sensitivity',
  'Chi Sensitivity',
  PARADIGM_ID,
  'foundation',
  0,
  25,
  [
    createSkillEffect('perception', 10, {
      description: 'Can sense general chi quality in buildings',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'chi_perception' },
      description: 'Sense chi flow in spaces',
    }),
  ],
  {
    description: 'Begin to feel the subtle energy that flows through spaces.',
    lore: `The first step in Feng Shui mastery is awareness.
You learn to sense chi - the life energy that permeates all spaces.
At first, only strong flows or severe stagnation are perceptible.`,
    maxLevel: 3,
    levelCostMultiplier: 1.3,
    icon: '🌬️',
  }
);

const ELEMENT_AWARENESS_NODE = createSkillNode(
  'element-awareness',
  'Element Awareness',
  PARADIGM_ID,
  'foundation',
  1,
  30,
  [
    createSkillEffect('perception', 5, {
      description: 'Identify element composition of objects',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'sense_elements' },
      description: 'Perceive five elements in materials',
    }),
  ],
  {
    description: 'Learn to perceive the five elements in materials and objects.',
    lore: `Wood, Fire, Earth, Metal, Water - these five forces compose all things.
You develop the ability to see which elements dominate a space.
Material composition becomes visible to your trained senses.`,
    maxLevel: 3,
    prerequisites: ['chi-sensitivity'],
    icon: '🔥',
  }
);

const FLOW_READING_NODE = createSkillNode(
  'flow-reading',
  'Flow Reading',
  PARADIGM_ID,
  'foundation',
  1,
  30,
  [
    createSkillEffect('perception', 5, {
      description: 'Visualize chi movement patterns',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'trace_chi_flow' },
      description: 'Trace chi paths through buildings',
    }),
  ],
  {
    description: 'Trace the paths chi takes through a space.',
    lore: `Chi enters through openings and flows like water through rooms.
You learn to follow these invisible currents.
Entrances, doorways, windows - all affect the flow patterns.`,
    maxLevel: 3,
    prerequisites: ['chi-sensitivity'],
    icon: '💨',
  }
);

// ============================================================================
// Technique Nodes - Deeper Perception
// ============================================================================

const STAGNATION_SENSE_NODE = createSkillNode(
  'stagnation-sense',
  'Stagnation Sense',
  PARADIGM_ID,
  'technique',
  2,
  40,
  [
    createSkillEffect('perception', 10, {
      description: 'Locate stagnant chi areas',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'detect_stagnation' },
      description: 'Detect areas with <30% flow strength',
    }),
    createSkillEffect('defense', 5, {
      description: 'Instinctively avoid lingering in stagnant areas',
    }),
  ],
  {
    description: 'Detect areas where chi pools and becomes stale.',
    lore: `Where energy cannot flow, it stagnates like still water.
These dead zones drain vitality from those who linger.
You learn to feel the heavy, oppressive quality of stagnant chi.`,
    maxLevel: 3,
    prerequisites: ['flow-reading'],
    icon: '🌫️',
  }
);

const SHA_QI_DETECTION_NODE = createSkillNode(
  'sha-qi-detection',
  'Sha Qi Detection',
  PARADIGM_ID,
  'technique',
  2,
  45,
  [
    createSkillEffect('perception', 15, {
      description: 'Sense killing breath energy lines',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'detect_sha_qi' },
      description: 'Detect Sha Qi lines of 4+ tiles',
    }),
    createSkillEffect('defense', 10, {
      description: 'Reduced harm from standing in Sha Qi paths',
    }),
  ],
  {
    description: 'Sense the "killing breath" of harmful energy lines.',
    lore: `When chi flows in an unbroken straight line, it becomes a blade.
From door to opposite opening, the killing breath strikes all in its path.
You develop sensitivity to these dangerous energy corridors.`,
    maxLevel: 3,
    prerequisites: ['flow-reading'],
    icon: '⚔️',
  }
);

const ELEMENT_BALANCE_READING_NODE = createSkillNode(
  'element-balance-reading',
  'Element Balance Reading',
  PARADIGM_ID,
  'technique',
  2,
  40,
  [
    createSkillEffect('perception', 10, {
      description: 'Sense element proportions in spaces',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'read_element_balance' },
      description: 'Detect deficient and excessive elements',
    }),
  ],
  {
    description: 'Perceive the proportional balance of all five elements.',
    lore: `True harmony requires all elements in proper proportion.
You learn to sense when one element overwhelms or another is deficient.
The ideal ratio becomes an intuition you carry within.`,
    maxLevel: 3,
    prerequisites: ['element-awareness'],
    icon: '⚖️',
  }
);

const GOLDEN_RATIO_SENSE_NODE = createSkillNode(
  'golden-ratio-sense',
  'Golden Ratio Sense',
  PARADIGM_ID,
  'technique',
  2,
  35,
  [
    createSkillEffect('perception', 5, {
      description: 'Intuit room proportion quality',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'sense_proportions' },
      description: 'Feel whether proportions approach 1.618',
    }),
  ],
  {
    description: 'Feel whether room proportions resonate with natural order.',
    lore: `The golden ratio of 1.618 underlies all beautiful forms.
Rooms that approach this proportion feel instinctively right.
You develop sensitivity to spatial proportions and their harmony.`,
    maxLevel: 2,
    prerequisites: ['chi-sensitivity'],
    icon: '📐',
  }
);

// ============================================================================
// Specialization Nodes - Active Skills
// ============================================================================

const COMMANDING_POSITION_FINDING_NODE = createSkillNode(
  'commanding-position-finding',
  'Commanding Position',
  PARADIGM_ID,
  'specialization',
  3,
  50,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'find_commanding_position' },
      description: 'Identify optimal furniture placement',
    }),
    createSkillEffect('resource_regen', 5, {
      description: 'Better rest in commanding position',
    }),
  ],
  {
    description: 'Locate the power spots in any room.',
    lore: `In every room, there are positions of power - where one can see all
while being protected. The commanding position for a bed differs from
that of a desk or throne, but all share the principle of visibility
with security.`,
    maxLevel: 3,
    prerequisites: ['flow-reading', 'stagnation-sense'],
    icon: '👁️',
  }
);

const CHI_REDIRECTION_NODE = createSkillNode(
  'chi-redirection',
  'Chi Redirection',
  PARADIGM_ID,
  'specialization',
  3,
  55,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'redirect_chi' },
      description: 'Suggest furniture placements to improve flow',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'break_sha_qi' },
      description: 'Place objects to break killing breath lines',
    }),
  ],
  {
    description: 'Learn to redirect chi flow using objects and placement.',
    lore: `A well-placed screen can deflect Sha Qi. A plant can enliven stagnation.
You learn the art of subtle manipulation - adjusting energy through
careful placement of furniture, decorations, and materials.`,
    maxLevel: 3,
    prerequisites: ['sha-qi-detection', 'stagnation-sense'],
    icon: '🔄',
  }
);

const ELEMENT_BALANCING_NODE = createSkillNode(
  'element-balancing',
  'Element Balancing',
  PARADIGM_ID,
  'specialization',
  3,
  55,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'balance_elements' },
      description: 'Recommend element additions for balance',
    }),
  ],
  {
    description: 'Add or adjust elements to create balance.',
    lore: `When fire overwhelms, introduce water. When metal is deficient, add it.
You learn which materials, colors, and objects carry elemental energy.
Through careful addition, you can restore balance to any space.`,
    maxLevel: 3,
    prerequisites: ['element-balance-reading'],
    icon: '🎯',
  }
);

const CYCLE_MASTERY_NODE = createSkillNode(
  'cycle-mastery',
  'Cycle Mastery',
  PARADIGM_ID,
  'specialization',
  4,
  60,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'use_generating_cycle' },
      description: 'Strengthen elements via generating predecessor',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'use_controlling_cycle' },
      description: 'Weaken elements via controlling element',
    }),
  ],
  {
    description: 'Understand both generating and controlling element cycles.',
    lore: `Wood feeds Fire feeds Earth feeds Metal feeds Water feeds Wood.
This is the generating cycle - creation flowing endlessly.
Wood controls Earth, Earth controls Water, Water controls Fire,
Fire controls Metal, Metal controls Wood - the restraining cycle.
You master both, knowing when to generate and when to control.`,
    maxLevel: 3,
    prerequisites: ['element-balancing'],
    icon: '☯️',
  }
);

// ============================================================================
// Mastery Nodes - Profound Understanding
// ============================================================================

const SPACE_HARMONIZATION_NODE = createSkillNode(
  'space-harmonization',
  'Space Harmonization',
  PARADIGM_ID,
  'mastery',
  5,
  75,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'full_feng_shui_analysis' },
      description: 'Perform complete harmony analysis',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'suggest_improvements' },
      description: 'Provide prioritized improvement suggestions',
    }),
  ],
  {
    description: 'Optimize an entire space for maximum harmony.',
    lore: `Drawing on all your skills, you can analyze a space completely
and guide its transformation to sublime harmony. Flow, elements,
proportions, positions - all factors come together in your vision.`,
    maxLevel: 3,
    prerequisites: ['commanding-position-finding', 'chi-redirection', 'element-balancing'],
    icon: '✨',
  }
);

const PERSONAL_CHI_CULTIVATION_NODE = createSkillNode(
  'personal-chi-cultivation',
  'Personal Chi Cultivation',
  PARADIGM_ID,
  'mastery',
  4,
  65,
  [
    createSkillEffect('defense', 20, {
      description: 'Reduced negative effects from poor Feng Shui',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'internal_balance' },
      description: 'Maintain personal harmony in any space',
    }),
  ],
  {
    description: 'Maintain internal balance regardless of external space.',
    lore: `The master carries harmony within. Though you remain sensitive to
spatial energy, you can maintain your own element balance and chi flow
even in discordant environments.`,
    maxLevel: 5,
    prerequisites: ['element-balancing', 'chi-redirection'],
    icon: '🧘',
  }
);

const AUSPICIOUS_TIMING_NODE = createSkillNode(
  'auspicious-timing',
  'Auspicious Timing',
  PARADIGM_ID,
  'mastery',
  4,
  60,
  [
    createSkillEffect('perception', 10, {
      description: 'Sense when timing enhances activities',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'sense_auspicious_time' },
      description: 'Feel temporal chi flow patterns',
    }),
  ],
  {
    description: 'Know when chi flows favor different activities.',
    lore: `Chi is not static - it shifts with seasons, moon phases, and hours.
You learn to sense these temporal flows, knowing when spaces
are most conducive to rest, work, creativity, or social gathering.`,
    maxLevel: 3,
    prerequisites: ['flow-reading', 'element-balance-reading'],
    icon: '🌙',
  }
);

const LIVING_SPACE_BOND_NODE = createSkillNode(
  'living-space-bond',
  'Living Space Bond',
  PARADIGM_ID,
  'mastery',
  5,
  80,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'bond_with_space' },
      description: 'Form lasting connection with harmonized building',
    }),
    createSkillEffect('resource_regen', 15, {
      description: 'Faster recovery in bonded space',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'sense_intrusion' },
      description: 'Know when bonded space is disturbed',
    }),
  ],
  {
    description: 'Form deep connection with a harmonized space.',
    lore: `A space you have perfected becomes an extension of yourself.
You sense disturbances instantly, draw strength from its harmony,
and can adjust its energy from anywhere within.`,
    maxLevel: 3,
    prerequisites: ['space-harmonization', 'personal-chi-cultivation'],
    icon: '🏠',
  }
);

const ARCHITECTURAL_VISION_NODE = createSkillNode(
  'architectural-vision',
  'Architectural Vision',
  PARADIGM_ID,
  'mastery',
  5,
  85,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'design_harmonious_building' },
      description: 'Create building plans with inherent high harmony',
    }),
    createSkillEffect('technique_proficiency', 30, {
      description: 'Buildings designed start with +30 harmony score',
    }),
  ],
  {
    description: 'Envision perfect spaces before they are built.',
    lore: `The greatest masters need not adjust existing spaces - they conceive
perfection from the start. You can design buildings that will have
sublime harmony from their first moment of existence.`,
    maxLevel: 3,
    prerequisites: ['space-harmonization', 'golden-ratio-sense', 'cycle-mastery'],
    icon: '📜',
  }
);

// ============================================================================
// Efficiency Nodes - Practical Improvements
// ============================================================================

const QUICK_READ_NODE = createSkillNode(
  'quick-read',
  'Quick Read',
  PARADIGM_ID,
  'efficiency',
  3,
  45,
  [
    createSkillEffect('resource_efficiency', 50, {
      description: 'Harmony assessment takes half the time',
    }),
  ],
  {
    description: "Assess a space's harmony at a glance.",
    lore: `With practice, full analysis becomes unnecessary for basic assessment.
A moment's observation reveals the essential harmony level.`,
    maxLevel: 3,
    prerequisites: ['chi-sensitivity', 'element-awareness'],
    icon: '👀',
  }
);

const MATERIAL_INTUITION_NODE = createSkillNode(
  'material-intuition',
  'Material Intuition',
  PARADIGM_ID,
  'efficiency',
  3,
  40,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'instant_material_suggestion' },
      description: 'Immediately knows best material to add',
    }),
  ],
  {
    description: 'Instantly know which materials would improve a space.',
    lore: `Rather than calculating element balance, you simply know
what material would help. The right suggestion arises unbidden.`,
    maxLevel: 3,
    prerequisites: ['element-balance-reading'],
    icon: '🪨',
  }
);

const SUBTLE_ADJUSTMENT_NODE = createSkillNode(
  'subtle-adjustment',
  'Subtle Adjustment',
  PARADIGM_ID,
  'efficiency',
  4,
  50,
  [
    createSkillEffect('technique_proficiency', 40, {
      description: 'Each adjustment provides 40% more harmony improvement',
    }),
  ],
  {
    description: 'Make small changes that yield large harmony improvements.',
    lore: `The master moves one chair and transforms the room.
You learn which small adjustments have outsized effects on chi flow.`,
    maxLevel: 3,
    prerequisites: ['chi-redirection'],
    icon: '🪑',
  }
);

// ============================================================================
// Relationship Nodes - Social Aspects
// ============================================================================

const SPACE_CONSULTATION_NODE = createSkillNode(
  'space-consultation',
  'Space Consultation',
  PARADIGM_ID,
  'relationship',
  3,
  45,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'consult_feng_shui' },
      description: 'Advise NPCs on space improvements',
    }),
    createSkillEffect('paradigm_proficiency', 10, {
      description: 'Reputation boost from helpful consultations',
    }),
  ],
  {
    description: 'Advise others on improving their living spaces.',
    lore: `Your perception of harmony becomes valuable to others.
You can explain Feng Shui principles in ways they understand
and guide them to better arrangements.`,
    maxLevel: 3,
    prerequisites: ['commanding-position-finding', 'element-balancing'],
    icon: '🗣️',
  }
);

const HARMONY_GIFTING_NODE = createSkillNode(
  'harmony-gifting',
  'Harmony Gifting',
  PARADIGM_ID,
  'relationship',
  4,
  55,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'craft_harmony_token' },
      description: 'Create items that add +5-10 harmony to rooms',
    }),
  ],
  {
    description: 'Create small objects imbued with elemental balance.',
    lore: `You learn to craft tokens that carry harmonic energy.
A small statue, a woven charm, a painted tile - these gifts
bring a touch of balance to any space they enter.`,
    maxLevel: 3,
    prerequisites: ['element-balancing', 'cycle-mastery'],
    icon: '🎁',
  }
);

// ============================================================================
// All Nodes Collection
// ============================================================================

const ALL_NODES: MagicSkillNode[] = [
  // Foundation
  CHI_SENSITIVITY_NODE,
  ELEMENT_AWARENESS_NODE,
  FLOW_READING_NODE,
  // Technique
  STAGNATION_SENSE_NODE,
  SHA_QI_DETECTION_NODE,
  ELEMENT_BALANCE_READING_NODE,
  GOLDEN_RATIO_SENSE_NODE,
  // Specialization
  COMMANDING_POSITION_FINDING_NODE,
  CHI_REDIRECTION_NODE,
  ELEMENT_BALANCING_NODE,
  CYCLE_MASTERY_NODE,
  // Mastery
  SPACE_HARMONIZATION_NODE,
  PERSONAL_CHI_CULTIVATION_NODE,
  AUSPICIOUS_TIMING_NODE,
  LIVING_SPACE_BOND_NODE,
  ARCHITECTURAL_VISION_NODE,
  // Efficiency
  QUICK_READ_NODE,
  MATERIAL_INTUITION_NODE,
  SUBTLE_ADJUSTMENT_NODE,
  // Relationship
  SPACE_CONSULTATION_NODE,
  HARMONY_GIFTING_NODE,
];

// ============================================================================
// XP Sources
// ============================================================================

const XP_SOURCES: MagicXPSource[] = [
  {
    eventType: 'analyze_space',
    xpAmount: 15,
    description: 'Perform Feng Shui analysis on a building',
  },
  {
    eventType: 'improve_harmony',
    xpAmount: 25,
    description: "Successfully increase a space's harmony score",
  },
  {
    eventType: 'fix_sha_qi',
    xpAmount: 20,
    description: 'Redirect or block a killing breath line',
  },
  {
    eventType: 'balance_elements',
    xpAmount: 20,
    description: 'Correct an element imbalance in a space',
  },
  {
    eventType: 'find_commanding',
    xpAmount: 10,
    description: 'Correctly identify a commanding position',
  },
  {
    eventType: 'consult_success',
    xpAmount: 30,
    description: "Give advice that improves someone's living space",
  },
  {
    eventType: 'design_building',
    xpAmount: 50,
    description: 'Create a building plan with 80+ harmony',
  },
  {
    eventType: 'sublime_space',
    xpAmount: 75,
    description: 'Bring a space to 90+ harmony score',
  },
];

// ============================================================================
// Skill Tree Export
// ============================================================================

export const FENG_SHUI_SKILL_TREE: MagicSkillTree = {
  id: 'feng_shui_skill_tree',
  name: 'Way of Spatial Harmony',
  paradigmId: PARADIGM_ID,
  description: `The art of reading and shaping the flow of chi through spaces.
Practitioners learn to perceive the invisible energies that permeate buildings,
understand the five-element balance, and create environments that nurture
those who dwell within.`,
  nodes: ALL_NODES,
  entryNodes: ['chi-sensitivity'],
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
 * Get harmony level description from score.
 */
export function getHarmonyLevel(score: number): keyof typeof HARMONY_LEVELS {
  if (score <= 20) return 'discordant';
  if (score <= 40) return 'disharmonious';
  if (score <= 60) return 'neutral';
  if (score <= 80) return 'harmonious';
  return 'sublime';
}

/**
 * Calculate chi perception range based on skill level.
 * Higher levels can sense chi from further away.
 */
export function getChiPerceptionRange(skillLevel: number): number {
  const ranges: Record<number, number> = {
    0: 1,   // Must be in the room
    1: 3,   // Adjacent rooms
    2: 5,   // Same building
    3: 10,  // Nearby buildings
    4: 20,  // Block radius
    5: 50,  // Neighborhood
  };
  return ranges[Math.min(skillLevel, 5)] ?? 1;
}

type FengShuiElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

/**
 * Get element that would best balance a space.
 * Takes current element counts and returns the most deficient.
 */
export function getMostNeededElement(
  elementBalance: Record<string, number>
): FengShuiElement {
  const elements: FengShuiElement[] = ['wood', 'fire', 'earth', 'metal', 'water'];
  const total = elements.reduce((sum, el) => sum + (elementBalance[el] ?? 0), 0);
  const ideal = total / 5;

  let mostDeficient: FengShuiElement = 'wood';
  let maxDeficiency = 0;

  for (const element of elements) {
    const current = elementBalance[element] ?? 0;
    const deficiency = ideal - current;
    if (deficiency > maxDeficiency) {
      maxDeficiency = deficiency;
      mostDeficient = element;
    }
  }

  return mostDeficient;
}

/**
 * Check if a position is commanding (diagonal view of entrance, wall behind).
 */
export function isCommandingPosition(
  position: { x: number; y: number },
  entrancePosition: { x: number; y: number },
  hasWallBehind: boolean
): boolean {
  // Must have wall behind
  if (!hasWallBehind) return false;

  // Check diagonal relationship to entrance
  const dx = Math.abs(position.x - entrancePosition.x);
  const dy = Math.abs(position.y - entrancePosition.y);

  // Should be diagonal (both dx and dy > 0) not directly across
  return dx > 0 && dy > 0;
}

/**
 * Get the generating element for a given element.
 */
export function getGeneratingElement(element: FengShuiElement): FengShuiElement {
  const cycle: Record<FengShuiElement, FengShuiElement> = {
    fire: 'wood',   // Wood generates Fire
    earth: 'fire',  // Fire generates Earth
    metal: 'earth', // Earth generates Metal
    water: 'metal', // Metal generates Water
    wood: 'water',  // Water generates Wood
  };
  return cycle[element];
}

/**
 * Get the controlling element for a given element.
 */
export function getControllingElement(element: FengShuiElement): FengShuiElement {
  const cycle: Record<FengShuiElement, FengShuiElement> = {
    earth: 'wood',  // Wood controls Earth
    water: 'earth', // Earth controls Water
    fire: 'water',  // Water controls Fire
    metal: 'fire',  // Fire controls Metal
    wood: 'metal',  // Metal controls Wood
  };
  return cycle[element];
}

/**
 * Calculate harmony bonus/penalty for an agent in a space.
 */
export function calculateSpaceEffect(
  harmonyScore: number,
  sensitivityLevel: number
): { moodModifier: number; productivityModifier: number; restQualityModifier: number } {
  // Base effect from harmony level
  const baseEffect = (harmonyScore - 50) / 100; // -0.5 to +0.5

  // Sensitivity amplifies both positive and negative effects
  const amplification = 1 + sensitivityLevel * 0.2;

  const effect = baseEffect * amplification;

  return {
    moodModifier: effect,
    productivityModifier: effect * 0.5,
    restQualityModifier: effect * 1.5, // Rest is most affected by space quality
  };
}

/**
 * Golden ratio check for room proportions.
 */
export function hasGoldenProportions(width: number, height: number): boolean {
  const GOLDEN_RATIO = 1.618;
  const TOLERANCE = 0.3;

  const ratio = Math.max(width, height) / Math.min(width, height);
  const deviation = Math.abs(ratio - GOLDEN_RATIO) / GOLDEN_RATIO;

  return deviation <= TOLERANCE;
}
