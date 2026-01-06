/**
 * ShintoSkillTree - Skill tree for the Shinto/Animist paradigm
 *
 * Key mechanics:
 * - No innate requirement (anyone can learn, but it takes dedication)
 * - Purity maintenance (must stay ritually pure to access higher nodes)
 * - Kami relationships (favor with different spirit types)
 * - Offerings and rituals
 * - Discovery of kami through exploration and attention
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

const PARADIGM_ID = 'shinto';

/** Kami types that can be interacted with */
const KAMI_TYPES = [
  'nature',     // Mountains, rivers, trees
  'place',      // Locations, crossroads, thresholds
  'ancestor',   // Spirits of the deceased
  'household',  // Home spirits
  'craft',      // Spirits of trades
  'elemental',  // Fire, water, wind, earth
  'animal',     // Animal spirits
  'food',       // Rice, sake spirits
] as const;

// ============================================================================
// Foundation Nodes - Purity and Basic Awareness
// ============================================================================

/** Entry node - basic spiritual awareness */
const SPIRIT_SENSE_NODE = createSkillNode(
  'spirit-sense',
  'Spirit Sense',
  PARADIGM_ID,
  'foundation',
  0,
  50,
  [
    createSkillEffect('spirit_sight', 1, {
      description: 'Can sense nearby kami presence',
    }),
  ],
  {
    description: 'Learn to feel the presence of spirits in the world',
    lore: 'The first step is simply awareness - learning to feel when you are not alone.',
    maxLevel: 3,
    levelCostMultiplier: 1.5,
  }
);

/** Basic purity maintenance */
const BASIC_PURITY_NODE = createSkillNode(
  'basic-purity',
  'Ritual Cleanliness',
  PARADIGM_ID,
  'foundation',
  0,
  50,
  [
    createSkillEffect('purity_maintenance', 5, {
      perLevelValue: 5,
      description: 'Slower purity decay',
    }),
  ],
  {
    description: 'Learn the basics of maintaining ritual purity',
    lore: 'Purity is not about morality - it is about spiritual cleanliness. The pure can approach the kami; the polluted cannot.',
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

/** Purification rituals */
const PURIFICATION_NODE = createSkillNode(
  'purification',
  'Purification Rites',
  PARADIGM_ID,
  'ritual',
  1,
  100,
  [
    createSkillEffect('unlock_ritual', 1, {
      target: { ritualId: 'harae' },
      description: 'Can perform basic purification rituals',
    }),
  ],
  {
    description: 'Learn rituals to cleanse pollution',
    prerequisites: ['basic-purity'],
    maxLevel: 3,
    levelCostMultiplier: 2,
  }
);

/** Advanced purification */
const GREAT_PURIFICATION_NODE = createSkillNode(
  'great-purification',
  'Great Purification',
  PARADIGM_ID,
  'ritual',
  3,
  300,
  [
    createSkillEffect('unlock_ritual', 1, {
      target: { ritualId: 'oharae' },
      description: 'Can perform the Great Purification ceremony',
    }),
  ],
  {
    description: 'Master the Great Purification, cleansing even severe pollution',
    prerequisites: ['purification'],
    unlockConditions: [
      createUnlockCondition(
        'purity_level',
        { purityMin: 80 },
        'Must maintain high purity to learn this rite'
      ),
    ],
    conditionMode: 'all',
  }
);

// ============================================================================
// Offering Nodes
// ============================================================================

/** Basic offerings */
const OFFERING_BASICS_NODE = createSkillNode(
  'offering-basics',
  'Art of Offering',
  PARADIGM_ID,
  'technique',
  1,
  75,
  [
    createSkillEffect('offering_effectiveness', 10, {
      perLevelValue: 5,
      description: 'Offerings grant more favor',
    }),
  ],
  {
    description: 'Learn what offerings please the kami',
    prerequisites: ['spirit-sense'],
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

/** Reading kami preferences */
const KAMI_READING_NODE = createSkillNode(
  'kami-reading',
  'Reading the Spirits',
  PARADIGM_ID,
  'technique',
  2,
  150,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'sense_preferences' },
      description: 'Can sense what offerings a kami prefers',
    }),
  ],
  {
    description: 'Learn to read what each kami desires',
    prerequisites: ['offering-basics', 'spirit-sense'],
  }
);

/** Taboo awareness */
const TABOO_SENSE_NODE = createSkillNode(
  'taboo-sense',
  'Taboo Awareness',
  PARADIGM_ID,
  'technique',
  2,
  150,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'sense_taboos' },
      description: 'Can sense what offends a kami',
    }),
  ],
  {
    description: 'Learn to sense the taboos of each kami',
    prerequisites: ['kami-reading'],
  }
);

// ============================================================================
// Kami Type Specialization Nodes
// ============================================================================

/**
 * Create a kami type specialization node.
 */
function createKamiTypeNode(
  kamiType: string,
  tier: number,
  prerequisites: string[] = ['spirit-sense']
): MagicSkillNode {
  const displayName = kamiType.charAt(0).toUpperCase() + kamiType.slice(1);

  return createSkillNode(
    `kami-${kamiType}`,
    `${displayName} Kami`,
    PARADIGM_ID,
    'relationship',
    tier,
    100 + tier * 50,
    [
      createSkillEffect('unlock_kami_type', 1, {
        target: { kamiType },
        description: `Can interact with ${kamiType} kami`,
      }),
      createSkillEffect('kami_favor_bonus', 10, {
        perLevelValue: 5,
        target: { kamiType },
        description: `+X% favor gain with ${kamiType} kami`,
      }),
    ],
    {
      description: `Learn to interact with ${kamiType} spirits`,
      prerequisites,
      unlockConditions: [
        createUnlockCondition(
          'kami_met',
          { kamiType },
          `Must have encountered a ${kamiType} kami`,
          { hidden: true }
        ),
      ],
      conditionMode: 'all',
      maxLevel: 5,
      levelCostMultiplier: 1.5,
      hidden: true, // Revealed when kami of this type is met
    }
  );
}

// Create nodes for each kami type
const NATURE_KAMI_NODE = createKamiTypeNode('nature', 1);
const PLACE_KAMI_NODE = createKamiTypeNode('place', 1);
const ANCESTOR_KAMI_NODE = createKamiTypeNode('ancestor', 2, ['spirit-sense', 'purification']);
const HOUSEHOLD_KAMI_NODE = createKamiTypeNode('household', 1);
const CRAFT_KAMI_NODE = createKamiTypeNode('craft', 2);
const ELEMENTAL_KAMI_NODE = createKamiTypeNode('elemental', 2);
const ANIMAL_KAMI_NODE = createKamiTypeNode('animal', 1);
const FOOD_KAMI_NODE = createKamiTypeNode('food', 1);

// ============================================================================
// Blessing Nodes
// ============================================================================

/** Request blessings */
const BLESSING_REQUEST_NODE = createSkillNode(
  'blessing-request',
  'Requesting Blessings',
  PARADIGM_ID,
  'technique',
  2,
  150,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'request_blessing' },
      description: 'Can formally request blessings from kami',
    }),
  ],
  {
    description: 'Learn the proper way to request blessings from kami',
    prerequisites: ['offering-basics'],
    unlockConditions: [
      createUnlockCondition(
        'kami_favor',
        { favorLevel: 50 },
        'Must have earned significant favor with at least one kami'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Sustained blessings */
const SUSTAINED_BLESSING_NODE = createSkillNode(
  'sustained-blessing',
  'Maintaining Blessings',
  PARADIGM_ID,
  'technique',
  3,
  250,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'sustained_blessing' },
      description: 'Blessings last longer',
    }),
  ],
  {
    description: 'Learn to maintain kami blessings over time',
    prerequisites: ['blessing-request'],
    maxLevel: 3,
    levelCostMultiplier: 2,
  }
);

// ============================================================================
// Shrine and Sacred Space Nodes
// ============================================================================

/** Create sacred spaces */
const SACRED_SPACE_NODE = createSkillNode(
  'sacred-space',
  'Sacred Boundaries',
  PARADIGM_ID,
  'ritual',
  2,
  200,
  [
    createSkillEffect('unlock_ritual', 1, {
      target: { ritualId: 'shimenawa' },
      description: 'Can create sacred boundaries with shimenawa',
    }),
  ],
  {
    description: 'Learn to create and maintain sacred spaces',
    prerequisites: ['purification'],
  }
);

/** Shrine construction */
const SHRINE_CRAFT_NODE = createSkillNode(
  'shrine-craft',
  'Shrine Crafting',
  PARADIGM_ID,
  'ritual',
  3,
  300,
  [
    createSkillEffect('unlock_ritual', 1, {
      target: { ritualId: 'shrine_consecration' },
      description: 'Can build and consecrate shrines',
    }),
  ],
  {
    description: 'Learn to build shrines that kami can inhabit',
    prerequisites: ['sacred-space'],
    unlockConditions: [
      createUnlockCondition(
        'skill_level',
        { skillId: 'building', skillLevel: 2 },
        'Must have basic building skill'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Invite kami to shrine */
const KAMI_INVITATION_NODE = createSkillNode(
  'kami-invitation',
  'Inviting the Kami',
  PARADIGM_ID,
  'ritual',
  4,
  400,
  [
    createSkillEffect('unlock_ritual', 1, {
      target: { ritualId: 'kanjou' },
      description: 'Can invite a kami to inhabit a shrine',
    }),
  ],
  {
    description: 'Learn the ritual to invite a kami to make a shrine their home',
    prerequisites: ['shrine-craft'],
    unlockConditions: [
      createUnlockCondition(
        'kami_favor',
        { favorLevel: 80 },
        'Must have very high favor with a kami'
      ),
      createUnlockCondition(
        'purity_level',
        { purityMin: 90 },
        'Must be in state of high purity'
      ),
    ],
    conditionMode: 'all',
  }
);

// ============================================================================
// Festival and Ceremony Nodes
// ============================================================================

/** Basic ceremonies */
const CEREMONY_BASICS_NODE = createSkillNode(
  'ceremony-basics',
  'Ceremonial Arts',
  PARADIGM_ID,
  'ritual',
  2,
  150,
  [
    createSkillEffect('unlock_ritual', 1, {
      target: { ritualId: 'basic_ceremony' },
      description: 'Can perform basic ceremonies',
    }),
  ],
  {
    description: 'Learn the basics of conducting ceremonies',
    prerequisites: ['purification', 'offering-basics'],
  }
);

/** Festival organization */
const FESTIVAL_NODE = createSkillNode(
  'festival-arts',
  'Festival Arts',
  PARADIGM_ID,
  'mastery',
  4,
  400,
  [
    createSkillEffect('unlock_ritual', 1, {
      target: { ritualId: 'matsuri' },
      description: 'Can organize and lead festivals',
    }),
    createSkillEffect('kami_favor_bonus', 20, {
      description: 'Massive favor boost during festivals',
    }),
  ],
  {
    description: 'Learn to organize festivals that honor the kami',
    prerequisites: ['ceremony-basics', 'sacred-space'],
    unlockConditions: [
      createUnlockCondition(
        'nodes_unlocked',
        { nodesRequired: 3 },
        'Must have relationships with at least 3 kami types'
      ),
    ],
    conditionMode: 'all',
  }
);

// ============================================================================
// Pollution Resistance Nodes
// ============================================================================

/** Pollution resistance */
const POLLUTION_RESISTANCE_NODE = createSkillNode(
  'pollution-resistance',
  'Spiritual Fortitude',
  PARADIGM_ID,
  'efficiency',
  2,
  150,
  [
    createSkillEffect('pollution_resistance', 10, {
      perLevelValue: 5,
      description: 'Resist pollution accumulation',
    }),
  ],
  {
    description: 'Build resistance to spiritual pollution',
    prerequisites: ['basic-purity'],
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

/** Death contact handling */
const DEATH_HANDLING_NODE = createSkillNode(
  'death-handling',
  'Death Rites',
  PARADIGM_ID,
  'ritual',
  3,
  250,
  [
    createSkillEffect('pollution_resistance', 20, {
      target: { kamiType: 'death' },
      description: 'Reduced pollution from death contact',
    }),
    createSkillEffect('unlock_ritual', 1, {
      target: { ritualId: 'funeral_rites' },
      description: 'Can perform proper funeral rites',
    }),
  ],
  {
    description: 'Learn to handle death without severe pollution',
    prerequisites: ['pollution-resistance', 'kami-ancestor'],
    unlockConditions: [
      createUnlockCondition(
        'ritual_performed',
        { ritualId: 'oharae' },
        'Must have performed the Great Purification'
      ),
    ],
    conditionMode: 'all',
  }
);

// ============================================================================
// Mastery Nodes
// ============================================================================

/** Kannushi path - shrine keeper */
const KANNUSHI_NODE = createSkillNode(
  'kannushi',
  'Kannushi (Shrine Keeper)',
  PARADIGM_ID,
  'mastery',
  5,
  500,
  [
    createSkillEffect('kami_favor_bonus', 25, {
      description: 'Major favor bonus with all kami',
    }),
    createSkillEffect('purity_maintenance', 25, {
      description: 'Greatly reduced purity decay',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'kami_communion' },
      description: 'Can commune directly with kami',
    }),
  ],
  {
    description: 'Become a recognized keeper of the way',
    prerequisites: ['kami-invitation', 'festival-arts'],
    unlockConditions: [
      createUnlockCondition(
        'purity_level',
        { purityMin: 95 },
        'Must maintain near-perfect purity'
      ),
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 2000 },
        'Must have dedicated significant time to practice'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Miko path - shrine maiden/oracle */
const MIKO_NODE = createSkillNode(
  'miko',
  'Miko (Shrine Attendant)',
  PARADIGM_ID,
  'mastery',
  5,
  500,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'kagura_dance' },
      description: 'Can perform sacred kagura dance',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'oracle_trance' },
      description: 'Can enter oracle trance to receive messages',
    }),
  ],
  {
    description: 'Become a shrine attendant with oracular gifts',
    prerequisites: ['ceremony-basics', 'sustained-blessing'],
    unlockConditions: [
      createUnlockCondition(
        'kami_favor',
        { favorLevel: 90 },
        'Must have devoted favor from a patron kami'
      ),
    ],
    conditionMode: 'all',
  }
);

// ============================================================================
// XP Sources
// ============================================================================

const XP_SOURCES: MagicXPSource[] = [
  {
    eventType: 'offering_given',
    xpAmount: 10,
    description: 'Make an offering to a kami',
  },
  {
    eventType: 'kami_encountered',
    xpAmount: 50,
    description: 'Encounter a new type of kami',
  },
  {
    eventType: 'purification_performed',
    xpAmount: 15,
    description: 'Perform a purification ritual',
  },
  {
    eventType: 'blessing_received',
    xpAmount: 30,
    description: 'Receive a blessing from a kami',
  },
  {
    eventType: 'ceremony_conducted',
    xpAmount: 40,
    description: 'Conduct a ceremony',
  },
  {
    eventType: 'shrine_tended',
    xpAmount: 5,
    description: 'Tend to a shrine',
  },
  {
    eventType: 'festival_participated',
    xpAmount: 75,
    description: 'Participate in or lead a festival',
  },
  {
    eventType: 'taboo_avoided',
    xpAmount: 10,
    description: 'Recognize and avoid a taboo',
  },
  {
    eventType: 'purity_maintained',
    xpAmount: 5,
    description: 'Maintain high purity for a day',
    conditions: [
      createUnlockCondition(
        'purity_level',
        { purityMin: 80 },
        'Must have high purity'
      ),
    ],
  },
];

// ============================================================================
// Tree Assembly
// ============================================================================

const ALL_NODES: MagicSkillNode[] = [
  // Foundation
  SPIRIT_SENSE_NODE,
  BASIC_PURITY_NODE,
  PURIFICATION_NODE,
  GREAT_PURIFICATION_NODE,

  // Offerings
  OFFERING_BASICS_NODE,
  KAMI_READING_NODE,
  TABOO_SENSE_NODE,

  // Kami types
  NATURE_KAMI_NODE,
  PLACE_KAMI_NODE,
  ANCESTOR_KAMI_NODE,
  HOUSEHOLD_KAMI_NODE,
  CRAFT_KAMI_NODE,
  ELEMENTAL_KAMI_NODE,
  ANIMAL_KAMI_NODE,
  FOOD_KAMI_NODE,

  // Blessings
  BLESSING_REQUEST_NODE,
  SUSTAINED_BLESSING_NODE,

  // Shrines
  SACRED_SPACE_NODE,
  SHRINE_CRAFT_NODE,
  KAMI_INVITATION_NODE,

  // Ceremonies
  CEREMONY_BASICS_NODE,
  FESTIVAL_NODE,

  // Pollution
  POLLUTION_RESISTANCE_NODE,
  DEATH_HANDLING_NODE,

  // Mastery
  KANNUSHI_NODE,
  MIKO_NODE,
];

/**
 * The Shinto skill tree.
 * Anyone can learn, but requires dedication and purity.
 */
export const SHINTO_SKILL_TREE: MagicSkillTree = {
  id: 'shinto-tree',
  paradigmId: PARADIGM_ID,
  name: 'The Way of the Kami',
  description: 'Learn to interact with the spirits that inhabit all things through offerings, purity, and respect.',
  lore: `The Way is not learned from books, but from the land itself. Every rock, every tree,
every crossroads has a spirit. To walk the Way is to acknowledge them, to show respect,
to maintain the purity that allows communion. The kami do not demand worship - they
demand recognition. Give it, and they may bless you. Ignore them or show disrespect,
and they will turn their faces from you.`,
  nodes: ALL_NODES,
  entryNodes: ['spirit-sense', 'basic-purity'],
  connections: [], // Auto-generated from prerequisites
  xpSources: XP_SOURCES,
  rules: {
    ...createDefaultTreeRules(false), // No innate requirement
    allowRespec: false,
    permanentProgress: false, // Can lose progress through pollution/neglect
    progressLossConditions: [
      createUnlockCondition(
        'purity_level',
        { purityMax: 20 },
        'Severe pollution causes progress loss'
      ),
    ],
  },
  version: 1,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get kami types available at a given skill level.
 */
export function getAvailableKamiTypes(unlockedNodes: Record<string, number>): string[] {
  return KAMI_TYPES.filter(type => {
    const nodeId = `kami-${type}`;
    return (unlockedNodes[nodeId] ?? 0) > 0;
  });
}

/**
 * Check if purity is sufficient for a ritual.
 */
export function isPuritySufficient(purityLevel: number, ritualTier: number): boolean {
  const requiredPurity = 50 + ritualTier * 10;
  return purityLevel >= requiredPurity;
}
