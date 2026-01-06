/**
 * ThresholdSkillTree - Skill tree for the Threshold paradigm
 *
 * Key mechanics:
 * - Threshold Detection (sense boundaries and transitions)
 * - Liminal Power (draw power from in-between spaces)
 * - Gateway Creation (create passages between places)
 * - Invitation Magic (power of consent at thresholds)
 * - Crossroads Magic (power at decision points)
 * - Between States (exist in transitional states)
 *
 * Core concept:
 * - Doorways, crossroads, and boundaries are sources of power
 * - Liminal spaces (dawn/dusk, shorelines, thresholds) hold magic
 * - Crossing requires invitation or permission
 *
 * Risks:
 * - Stuck between (trapped in transition)
 * - Lost in transition (can't return)
 * - Threshold guardian anger
 * - Identity dissolution in liminal space
 */

import type { MagicSkillTree, MagicSkillNode, MagicXPSource } from '../MagicSkillTree.js';
import {
  createSkillNode,
  createSkillEffect,
  createUnlockCondition,
  createDefaultTreeRules,
} from '../MagicSkillTree.js';

// ============================================================================
// Constants
// ============================================================================

const PARADIGM_ID = 'threshold_magic';

/** Types of thresholds */
export const THRESHOLD_TYPES = {
  physical: 'Doorways, gates, arches',
  temporal: 'Dawn, dusk, midnight, solstices',
  spatial: 'Shorelines, borders, edges',
  conceptual: 'Between life and death, sleep and wake',
  social: 'Coming of age, marriage, death rites',
  elemental: 'Where elements meet (shore, volcano, storm)',
  dimensional: 'Boundaries between worlds',
} as const;

/** Liminal states of power */
export const LIMINAL_STATES = {
  dawn: 'Between night and day',
  dusk: 'Between day and night',
  shore: 'Between land and sea',
  crossroad: 'Between multiple paths',
  doorway: 'Between inside and outside',
  dream_edge: 'Between sleep and wake',
  veil: 'Between life and death',
} as const;

/** Invitation levels */
export const INVITATION_LEVELS = {
  none: 'No invitation - cannot cross',
  implicit: 'Open door or welcome sign',
  verbal: 'Spoken invitation',
  named: 'Personal named invitation',
  bound: 'Magically binding invitation',
  eternal: 'Permanent invitation',
} as const;

// ============================================================================
// Foundation Nodes - Threshold Awareness
// ============================================================================

const THRESHOLD_SENSE_NODE = createSkillNode(
  'threshold-sense',
  'Threshold Sense',
  PARADIGM_ID,
  'foundation',
  0,
  25,
  [
    createSkillEffect('perception', 10, {
      description: 'Sense thresholds and boundaries',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'threshold_detection' },
      description: 'Detect all nearby thresholds',
    }),
  ],
  {
    description: 'Learn to sense thresholds and boundaries',
    lore: `The world is full of edges. Most pass through doorways without thought,
cross borders without feeling. You learn to feel them all -
the tingle of transition, the weight of boundaries.`,
    maxLevel: 3,
    levelCostMultiplier: 1.3,
    icon: '🚪',
  }
);

const LIMINAL_AWARENESS_NODE = createSkillNode(
  'liminal-awareness',
  'Liminal Awareness',
  PARADIGM_ID,
  'foundation',
  0,
  30,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'liminal_sense' },
      description: 'Sense liminal times and places',
    }),
    createSkillEffect('paradigm_proficiency', 5, {
      perLevelValue: 3,
      description: 'Bonus at liminal times/places',
    }),
  ],
  {
    description: 'Learn to recognize liminal states',
    lore: `Dawn is not day or night but both. The shore is not land or sea but both.
These in-between states hold power that solid states lack.
Learn to recognize them, seek them out.`,
    maxLevel: 5,
    levelCostMultiplier: 1.3,
    icon: '🌅',
  }
);

const BOUNDARY_RESPECT_NODE = createSkillNode(
  'boundary-respect',
  'Boundary Respect',
  PARADIGM_ID,
  'foundation',
  0,
  25,
  [
    createSkillEffect('defense', 10, {
      description: 'Protection at thresholds',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'honor_threshold' },
      description: 'Properly honor thresholds for safe passage',
    }),
  ],
  {
    description: 'Learn to properly respect boundaries',
    lore: `Thresholds have guardians - seen and unseen. Those who cross without
proper respect invite their wrath. Learn the rituals of passage,
the acknowledgments required. Respect the boundary and it respects you.`,
    icon: '🙏',
  }
);

// ============================================================================
// Doorway Magic Nodes
// ============================================================================

const DOORWAY_POWER_NODE = createSkillNode(
  'doorway-power',
  'Doorway Power',
  PARADIGM_ID,
  'technique',
  1,
  50,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'draw_doorway_power' },
      description: 'Draw power from doorways',
    }),
    createSkillEffect('resource_regen', 10, {
      description: 'Regenerate power near doorways',
    }),
  ],
  {
    description: 'Learn to draw power from doorways',
    lore: `Every doorway is a potential source. Enter and exit deliberately.
Feel the power in the crossing. Some doorways are stronger than others -
ancient gates, sacred arches, prison doors.`,
    prerequisites: ['threshold-sense'],
    icon: '⚡',
  }
);

const SEAL_THRESHOLD_NODE = createSkillNode(
  'seal-threshold',
  'Seal Threshold',
  PARADIGM_ID,
  'technique',
  1,
  55,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'seal_threshold' },
      description: 'Seal doorways against passage',
    }),
  ],
  {
    description: 'Learn to seal thresholds against passage',
    lore: `A sealed threshold cannot be crossed. Not by force, not by magic,
not by pleading. The seal recognizes no authority but its maker's.
This is the first defensive threshold magic.`,
    prerequisites: ['boundary-respect'],
    icon: '🔐',
  }
);

const KEYED_THRESHOLD_NODE = createSkillNode(
  'keyed-threshold',
  'Keyed Threshold',
  PARADIGM_ID,
  'technique',
  2,
  85,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'key_threshold' },
      description: 'Create keyed thresholds with conditions',
    }),
  ],
  {
    description: 'Learn to create conditional thresholds',
    lore: `Not just sealed or open - keyed. "Only those who speak the password."
"Only those of the blood." "Only those who bring tribute."
Complex conditions, complex magic.`,
    prerequisites: ['seal-threshold'],
    icon: '🔑',
  }
);

// ============================================================================
// Gateway Nodes
// ============================================================================

const MINOR_GATEWAY_NODE = createSkillNode(
  'minor-gateway',
  'Minor Gateway',
  PARADIGM_ID,
  'technique',
  2,
  90,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'create_minor_gateway' },
      description: 'Create short-range gateways',
    }),
  ],
  {
    description: 'Learn to create short-range gateways',
    lore: `Connect two doorways. Walk through one, emerge from the other.
Limited range at first - across a room, across a building.
But the principle scales.`,
    prerequisites: ['doorway-power'],
    icon: '🌀',
  }
);

const MAJOR_GATEWAY_NODE = createSkillNode(
  'major-gateway',
  'Major Gateway',
  PARADIGM_ID,
  'technique',
  3,
  140,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'create_major_gateway' },
      description: 'Create long-range gateways',
    }),
  ],
  {
    description: 'Learn to create long-range gateways',
    lore: `Across cities. Across countries. Across oceans. The greater the distance,
the greater the cost. But no distance is impossible if you have
two proper thresholds to connect.`,
    prerequisites: ['minor-gateway'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 400 },
        'Requires 400 total XP in Threshold magic'
      ),
    ],
    conditionMode: 'all',
    icon: '🌐',
  }
);

const DIMENSIONAL_GATEWAY_NODE = createSkillNode(
  'dimensional-gateway',
  'Dimensional Gateway',
  PARADIGM_ID,
  'mastery',
  4,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'dimensional_gateway' },
      description: 'Create gateways between dimensions',
    }),
  ],
  {
    description: 'Learn to create inter-dimensional gateways',
    lore: `The ultimate threshold: the boundary between worlds. Punch through
the membrane separating realities. Connect here to there, this world
to that. The cost is immense. The dangers, legendary.`,
    prerequisites: ['major-gateway'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 800 },
        'Requires 800 total XP in Threshold magic'
      ),
    ],
    conditionMode: 'all',
    icon: '✨',
  }
);

// ============================================================================
// Invitation Magic Nodes
// ============================================================================

const INVITATION_SENSE_NODE = createSkillNode(
  'invitation-sense',
  'Invitation Sense',
  PARADIGM_ID,
  'specialization',
  1,
  45,
  [
    createSkillEffect('perception', 10, {
      description: 'Sense invitations and permissions',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'detect_invitation' },
      description: 'Detect invitation status of thresholds',
    }),
  ],
  {
    description: 'Learn to sense invitations and their strength',
    lore: `Every threshold asks: "Have you been invited?" Learn to feel
the answer. Some invitations are explicit, some implied.
Know before you cross.`,
    prerequisites: ['boundary-respect'],
    icon: '💌',
  }
);

const INVITATION_REQUIRE_NODE = createSkillNode(
  'invitation-require',
  'Require Invitation',
  PARADIGM_ID,
  'specialization',
  2,
  80,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'require_invitation' },
      description: 'Make thresholds require invitation to cross',
    }),
    createSkillEffect('defense', 15, {
      description: 'Uninvited cannot harm you at your threshold',
    }),
  ],
  {
    description: 'Learn to require invitation for passage',
    lore: `Like vampires of legend - none may enter without invitation.
Your threshold becomes sacred. Enemies who cross uninvited
suffer the consequence of violation.`,
    prerequisites: ['invitation-sense', 'seal-threshold'],
    icon: '🧛',
  }
);

const INVITATION_REVOKE_NODE = createSkillNode(
  'invitation-revoke',
  'Revoke Invitation',
  PARADIGM_ID,
  'specialization',
  2,
  75,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'revoke_invitation' },
      description: 'Revoke previously given invitations',
    }),
  ],
  {
    description: 'Learn to revoke invitations',
    lore: `An invitation given can be taken back. The guest becomes trespasser.
The welcome becomes rejection. They must leave immediately,
or face the threshold's wrath.`,
    prerequisites: ['invitation-sense'],
    icon: '🚫',
  }
);

// ============================================================================
// Crossroads Nodes
// ============================================================================

const CROSSROADS_POWER_NODE = createSkillNode(
  'crossroads-power',
  'Crossroads Power',
  PARADIGM_ID,
  'technique',
  2,
  85,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'crossroads_power' },
      description: 'Draw power from crossroads',
    }),
    createSkillEffect('resource_max', 20, {
      description: 'Increased power at crossroads',
    }),
  ],
  {
    description: 'Learn to draw power from crossroads',
    lore: `Where paths meet, where choices branch, power accumulates.
Crossroads are where deals are made with dark entities,
where fate can be changed, where all paths are possible.`,
    prerequisites: ['liminal-awareness', 'doorway-power'],
    icon: '✝️',
  }
);

const CROSSROADS_DEAL_NODE = createSkillNode(
  'crossroads-deal',
  'Crossroads Deal',
  PARADIGM_ID,
  'technique',
  3,
  130,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'crossroads_bargain' },
      description: 'Make binding deals at crossroads',
    }),
  ],
  {
    description: 'Learn to make binding crossroads bargains',
    lore: `At the crossroads, anything can be bargained. Souls, fates, futures.
Entities lurk there, waiting for deals. The terms are always honored -
by both sides, willing or not.`,
    prerequisites: ['crossroads-power'],
    icon: '🤝',
  }
);

// ============================================================================
// Between States Nodes
// ============================================================================

const BETWEEN_STATE_NODE = createSkillNode(
  'between-state',
  'Between State',
  PARADIGM_ID,
  'specialization',
  3,
  120,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'enter_between' },
      description: 'Exist in transitional states',
    }),
  ],
  {
    description: 'Learn to exist in between states',
    lore: `Not here, not there - between. Not visible, not invisible - between.
In the between state, normal rules flex. You can be seen by some,
not by others. Touched by some, not by others.`,
    prerequisites: ['liminal-awareness', 'crossroads-power'],
    icon: '〰️',
  }
);

const PERMANENT_LIMINAL_NODE = createSkillNode(
  'permanent-liminal',
  'Permanent Liminality',
  PARADIGM_ID,
  'mastery',
  4,
  180,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'permanent_between' },
      description: 'Exist permanently in liminal space',
    }),
    createSkillEffect('defense', 25, {
      description: 'Protected by existing between',
    }),
  ],
  {
    description: 'Learn to exist permanently in liminal space',
    lore: `Some threshold mages never fully return. They exist always
in the in-between, never quite here, never quite there.
Impossible to pin down, impossible to trap.`,
    prerequisites: ['between-state', 'dimensional-gateway'],
    icon: '🌗',
  }
);

// ============================================================================
// Mastery Nodes
// ============================================================================

const THRESHOLD_GUARDIAN_NODE = createSkillNode(
  'threshold-guardian',
  'Threshold Guardian',
  PARADIGM_ID,
  'mastery',
  4,
  200,
  [
    createSkillEffect('paradigm_proficiency', 30, {
      description: 'Master threshold guardian',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'become_guardian' },
      description: 'Become a threshold guardian',
    }),
  ],
  {
    description: 'Become a threshold guardian',
    lore: `You have walked so many thresholds that you become one with them.
Guardian of passages, keeper of boundaries. All who wish to cross
must answer to you first.`,
    prerequisites: ['keyed-threshold', 'invitation-require'],
    unlockConditions: [
      createUnlockCondition(
        'nodes_unlocked',
        { nodesRequired: 10 },
        'Requires 10 nodes unlocked'
      ),
    ],
    conditionMode: 'all',
    icon: '⚔️',
  }
);

const THRESHOLD_MASTER_NODE = createSkillNode(
  'threshold-master',
  'Threshold Master',
  PARADIGM_ID,
  'mastery',
  5,
  300,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'master_thresholds' },
      description: 'Command all thresholds',
    }),
    createSkillEffect('paradigm_proficiency', 50, {
      description: 'Supreme threshold mastery',
    }),
  ],
  {
    description: 'Achieve supreme mastery over thresholds',
    lore: `Every door answers to you. Every boundary bows. You walk between worlds
as easily as others walk between rooms. The liminal is your home.
Thresholds are your domain. Nothing crosses without your knowledge.`,
    prerequisites: ['threshold-guardian', 'permanent-liminal', 'crossroads-deal'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 1200 },
        'Requires 1200 total XP in Threshold magic'
      ),
    ],
    conditionMode: 'all',
    icon: '👑',
  }
);

// ============================================================================
// Collect All Nodes
// ============================================================================

const ALL_NODES: MagicSkillNode[] = [
  // Foundation
  THRESHOLD_SENSE_NODE,
  LIMINAL_AWARENESS_NODE,
  BOUNDARY_RESPECT_NODE,
  // Doorway
  DOORWAY_POWER_NODE,
  SEAL_THRESHOLD_NODE,
  KEYED_THRESHOLD_NODE,
  // Gateway
  MINOR_GATEWAY_NODE,
  MAJOR_GATEWAY_NODE,
  DIMENSIONAL_GATEWAY_NODE,
  // Invitation
  INVITATION_SENSE_NODE,
  INVITATION_REQUIRE_NODE,
  INVITATION_REVOKE_NODE,
  // Crossroads
  CROSSROADS_POWER_NODE,
  CROSSROADS_DEAL_NODE,
  // Between
  BETWEEN_STATE_NODE,
  PERMANENT_LIMINAL_NODE,
  // Mastery
  THRESHOLD_GUARDIAN_NODE,
  THRESHOLD_MASTER_NODE,
];

// ============================================================================
// XP Sources
// ============================================================================

const XP_SOURCES: MagicXPSource[] = [
  {
    eventType: 'threshold_crossed',
    xpAmount: 5,
    description: 'Cross a significant threshold',
  },
  {
    eventType: 'gateway_created',
    xpAmount: 20,
    description: 'Create a gateway',
    qualityMultiplier: true,
  },
  {
    eventType: 'threshold_sealed',
    xpAmount: 10,
    description: 'Seal a threshold',
  },
  {
    eventType: 'invitation_managed',
    xpAmount: 8,
    description: 'Grant or revoke an invitation',
  },
  {
    eventType: 'liminal_power',
    xpAmount: 12,
    description: 'Draw power from liminal state',
  },
  {
    eventType: 'crossroads_bargain',
    xpAmount: 25,
    description: 'Complete a crossroads bargain',
  },
];

// ============================================================================
// Tree Definition
// ============================================================================

export const THRESHOLD_SKILL_TREE: MagicSkillTree = {
  id: 'threshold_skill_tree',
  paradigmId: PARADIGM_ID,
  name: 'Threshold Magic Skill Tree',
  description: 'Master the art of boundaries, doorways, and liminal spaces',
  lore: `Between day and night, between worlds, between life and death -
the in-between places hold power. Stand at a threshold and you stand
everywhere. Cross it wrong and you may never cross back.`,
  nodes: ALL_NODES,
  entryNodes: ['threshold-sense', 'liminal-awareness', 'boundary-respect'],
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
 * Check if current time is a liminal moment.
 */
export function isLiminalTime(hour: number): keyof typeof LIMINAL_STATES | null {
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 17 && hour < 19) return 'dusk';
  return null;
}

/**
 * Calculate power bonus for liminal locations.
 */
export function getLiminalBonus(
  liminalState: keyof typeof LIMINAL_STATES,
  unlockedNodes: Set<string>,
  liminalLevel: number
): number {
  const baseBonus: Record<keyof typeof LIMINAL_STATES, number> = {
    dawn: 1.2,
    dusk: 1.2,
    shore: 1.3,
    crossroad: 1.5,
    doorway: 1.1,
    dream_edge: 1.4,
    veil: 2.0,
  };

  let bonus = baseBonus[liminalState];
  if (unlockedNodes.has('liminal-awareness')) {
    bonus += liminalLevel * 0.1;
  }
  return bonus;
}

/**
 * Get invitation level required for a threshold.
 */
export function getRequiredInvitationLevel(
  thresholdType: keyof typeof THRESHOLD_TYPES,
  sealed: boolean
): keyof typeof INVITATION_LEVELS {
  if (sealed) return 'bound';

  const requirements: Record<keyof typeof THRESHOLD_TYPES, keyof typeof INVITATION_LEVELS> = {
    physical: 'implicit',
    temporal: 'none',
    spatial: 'none',
    conceptual: 'verbal',
    social: 'named',
    elemental: 'none',
    dimensional: 'bound',
  };

  return requirements[thresholdType];
}

/**
 * Calculate gateway range based on unlocked nodes.
 */
export function getGatewayRange(unlockedNodes: Set<string>): number {
  if (unlockedNodes.has('dimensional-gateway')) return Infinity;
  if (unlockedNodes.has('major-gateway')) return 10000; // km
  if (unlockedNodes.has('minor-gateway')) return 1; // km
  return 0;
}
