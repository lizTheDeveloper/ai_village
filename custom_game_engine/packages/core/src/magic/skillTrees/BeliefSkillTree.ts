/**
 * BeliefSkillTree - Skill tree for the Belief paradigm
 *
 * Key mechanics:
 * - Faith Gathering (collect believers)
 * - Belief Manifestation (make beliefs real)
 * - Myth Creation (create new truths through stories)
 * - Tulpa Creation (create beings from belief)
 * - Faith Battles (competing beliefs)
 * - Dogma (unchangeable belief structures)
 *
 * Core concept:
 * - If enough people believe something, it becomes true
 * - Reality is consensus
 * - Believers = power source
 *
 * Risks:
 * - Faith crisis (believers lose faith)
 * - Heresy (competing beliefs)
 * - Fade (forgotten, cease to exist)
 * - Belief corruption (believers change what they believe)
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

const PARADIGM_ID = 'belief_magic';

/** Types of belief that can generate power */
export const BELIEF_TYPES = {
  worship: 'Direct religious devotion',
  fear: 'Terrified belief in something dangerous',
  trust: 'Confidence in someone\'s abilities',
  legend: 'Belief in heroic figures',
  superstition: 'Belief in luck and omens',
  ideology: 'Political or philosophical belief',
  love: 'Unwavering devotion to a person',
} as const;

/** Levels of belief intensity */
export const BELIEF_INTENSITY = {
  passing: 'Casual acknowledgment',
  mild: 'General acceptance',
  moderate: 'Active belief',
  strong: 'Fervent belief',
  fanatical: 'Absolute devotion',
  transcendent: 'Reality-altering conviction',
} as const;

/** Types of belief entities that can be created */
export const BELIEF_ENTITIES = {
  minor_spirit: 'Small manifestation of focused belief',
  tulpa: 'Thought-form with independent existence',
  egregore: 'Group mind of collective believers',
  godling: 'Minor divine entity from worship',
  avatar: 'Physical manifestation of belief',
  god: 'Full divine entity from mass worship',
} as const;

// ============================================================================
// Foundation Nodes - Belief Awareness
// ============================================================================

const BELIEF_SENSE_NODE = createSkillNode(
  'belief-sense',
  'Belief Sense',
  PARADIGM_ID,
  'foundation',
  0,
  25,
  [
    createSkillEffect('perception', 10, {
      description: 'Sense the beliefs of others',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'detect_belief' },
      description: 'Detect what others believe',
    }),
  ],
  {
    description: 'Learn to sense the beliefs of others',
    lore: `Every mind holds beliefs. Some weak, some strong. Some true, some false.
Learn to feel these beliefs, to taste their flavor, to measure their power.
This sense is the foundation of belief magic.`,
    maxLevel: 3,
    levelCostMultiplier: 1.3,
    icon: '👁️',
  }
);

const FAITH_ATTUNEMENT_NODE = createSkillNode(
  'faith-attunement',
  'Faith Attunement',
  PARADIGM_ID,
  'foundation',
  0,
  30,
  [
    createSkillEffect('paradigm_proficiency', 5, {
      perLevelValue: 3,
      description: 'Bonus to belief magic',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'faith_attunement' },
      description: 'Attune to sources of faith',
    }),
  ],
  {
    description: 'Learn to attune to sources of faith',
    lore: `Faith radiates. Churches, shrines, stadiums, concert halls -
anywhere people gather in shared belief. Learn to feel these
concentrations, to tap into their power.`,
    maxLevel: 5,
    levelCostMultiplier: 1.3,
    icon: '🙏',
  }
);

const REALITY_FLEXIBILITY_NODE = createSkillNode(
  'reality-flexibility',
  'Reality Flexibility',
  PARADIGM_ID,
  'foundation',
  0,
  25,
  [
    createSkillEffect('defense', 10, {
      description: 'Resistance to belief attacks',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'flexible_reality' },
      description: 'Accept multiple truths simultaneously',
    }),
  ],
  {
    description: 'Learn that reality is more flexible than it seems',
    lore: `What is true? Whatever enough people believe. Reality is not solid -
it's consensus. Learn to loosen your grip on "truth" and gain the
power to reshape what everyone believes.`,
    icon: '🌊',
  }
);

// ============================================================================
// Faith Gathering Nodes
// ============================================================================

const INSPIRE_BELIEF_NODE = createSkillNode(
  'inspire-belief',
  'Inspire Belief',
  PARADIGM_ID,
  'technique',
  1,
  50,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'inspire_belief' },
      description: 'Inspire belief in others',
    }),
  ],
  {
    description: 'Learn to inspire belief in others',
    lore: `Speak with conviction. Act with purpose. Be what you claim to be.
People want to believe. Give them something worth believing in
and they will follow.`,
    prerequisites: ['belief-sense'],
    maxLevel: 3,
    levelCostMultiplier: 1.4,
    icon: '✨',
  }
);

const GATHER_FOLLOWERS_NODE = createSkillNode(
  'gather-followers',
  'Gather Followers',
  PARADIGM_ID,
  'technique',
  1,
  55,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'gather_followers' },
      description: 'Actively gather believers',
    }),
    createSkillEffect('resource_max', 20, {
      description: 'Increased faith capacity',
    }),
  ],
  {
    description: 'Learn to actively gather believers',
    lore: `One believer is a spark. Ten is a flame. A hundred is a fire.
A thousand is a conflagration. Gather your flock. The more believe,
the more power flows to you.`,
    prerequisites: ['faith-attunement'],
    icon: '👥',
  }
);

const MASS_CONVERSION_NODE = createSkillNode(
  'mass-conversion',
  'Mass Conversion',
  PARADIGM_ID,
  'technique',
  3,
  130,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'mass_conversion' },
      description: 'Convert many at once to your belief',
    }),
  ],
  {
    description: 'Learn to convert masses to your belief',
    lore: `The preacher who can move crowds. The speaker who can shift nations.
When you speak to thousands and thousands believe, reality itself
bends to accommodate.`,
    prerequisites: ['inspire-belief', 'gather-followers'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 400 },
        'Requires 400 total XP in Belief magic'
      ),
    ],
    conditionMode: 'all',
    icon: '📣',
  }
);

// ============================================================================
// Belief Manifestation Nodes
// ============================================================================

const MINOR_MANIFESTATION_NODE = createSkillNode(
  'minor-manifestation',
  'Minor Manifestation',
  PARADIGM_ID,
  'technique',
  2,
  80,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'manifest_minor' },
      description: 'Make small beliefs real',
    }),
  ],
  {
    description: 'Learn to manifest minor beliefs into reality',
    lore: `"I believe I can make this shot." And you do. "I believe I'll be safe."
And you are. Small beliefs, small manifestations. But real.
The first step to reshaping reality.`,
    prerequisites: ['inspire-belief'],
    icon: '🌟',
  }
);

const MAJOR_MANIFESTATION_NODE = createSkillNode(
  'major-manifestation',
  'Major Manifestation',
  PARADIGM_ID,
  'technique',
  3,
  140,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'manifest_major' },
      description: 'Make significant beliefs real',
    }),
  ],
  {
    description: 'Learn to manifest major beliefs into reality',
    lore: `"We believe this leader will save us." And they gain the power to do so.
"We believe this mountain is sacred." And it becomes so.
Collective belief reshapes the world.`,
    prerequisites: ['minor-manifestation', 'gather-followers'],
    icon: '⭐',
  }
);

const REALITY_REWRITE_NODE = createSkillNode(
  'reality-rewrite',
  'Reality Rewrite',
  PARADIGM_ID,
  'mastery',
  4,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'rewrite_reality' },
      description: 'Completely rewrite aspects of reality through belief',
    }),
  ],
  {
    description: 'Learn to completely rewrite reality',
    lore: `With enough believers, you can change what was always true.
"The sun has always risen in the west." If everyone believes it,
history rewrites. Reality complies. The ultimate power.`,
    prerequisites: ['major-manifestation', 'mass-conversion'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 800 },
        'Requires 800 total XP in Belief magic'
      ),
    ],
    conditionMode: 'all',
    icon: '🌌',
  }
);

// ============================================================================
// Tulpa/Entity Creation Nodes
// ============================================================================

const CREATE_SPIRIT_NODE = createSkillNode(
  'create-spirit',
  'Create Belief Spirit',
  PARADIGM_ID,
  'specialization',
  2,
  90,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'create_minor_spirit' },
      description: 'Create minor spirits from focused belief',
    }),
  ],
  {
    description: 'Learn to create spirits from belief',
    lore: `Believe hard enough in a guardian angel and one appears.
Fear a monster under the bed and it becomes real.
Spirits are belief given form.`,
    prerequisites: ['minor-manifestation'],
    icon: '👻',
  }
);

const CREATE_TULPA_NODE = createSkillNode(
  'create-tulpa',
  'Create Tulpa',
  PARADIGM_ID,
  'specialization',
  3,
  140,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'create_tulpa' },
      description: 'Create independent thought-forms',
    }),
  ],
  {
    description: 'Learn to create tulpas',
    lore: `A tulpa is more than a spirit - it's an independent mind born from belief.
It thinks, it acts, it grows. Created by you but not controlled by you.
A child of pure thought.`,
    prerequisites: ['create-spirit'],
    icon: '🧠',
  }
);

const CREATE_GOD_NODE = createSkillNode(
  'create-god',
  'Create Godling',
  PARADIGM_ID,
  'mastery',
  4,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'create_godling' },
      description: 'Create minor divine entities',
    }),
  ],
  {
    description: 'Learn to create godlings',
    lore: `With enough worship, a god is born. Not an ancient power awakened -
a new divine entity, created from pure collective faith.
You can create gods. Think about that.`,
    prerequisites: ['create-tulpa', 'mass-conversion'],
    unlockConditions: [
      createUnlockCondition(
        'nodes_unlocked',
        { nodesRequired: 10 },
        'Requires 10 nodes unlocked'
      ),
    ],
    conditionMode: 'all',
    icon: '👼',
  }
);

// ============================================================================
// Myth Creation Nodes
// ============================================================================

const STORY_POWER_NODE = createSkillNode(
  'story-power',
  'Story Power',
  PARADIGM_ID,
  'technique',
  1,
  50,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'power_from_story' },
      description: 'Draw power from being part of stories',
    }),
  ],
  {
    description: 'Learn to draw power from stories told about you',
    lore: `When people tell stories about you, you grow stronger.
The hero of legend. The monster of nightmares. The trickster of tales.
Become a story and become powerful.`,
    prerequisites: ['faith-attunement'],
    icon: '📖',
  }
);

const MYTH_WEAVING_NODE = createSkillNode(
  'myth-weaving',
  'Myth Weaving',
  PARADIGM_ID,
  'technique',
  2,
  100,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'weave_myth' },
      description: 'Create myths that become true',
    }),
  ],
  {
    description: 'Learn to weave myths into reality',
    lore: `Tell a story. Tell it again. Tell it until everyone knows it.
When the myth is universal, it becomes true. Was it ever false?
Does that distinction even matter?`,
    prerequisites: ['story-power', 'inspire-belief'],
    icon: '🕸️',
  }
);

// ============================================================================
// Faith Defense Nodes
// ============================================================================

const FAITH_SHIELD_NODE = createSkillNode(
  'faith-shield',
  'Faith Shield',
  PARADIGM_ID,
  'specialization',
  2,
  75,
  [
    createSkillEffect('defense', 20, {
      perLevelValue: 10,
      description: 'Belief of followers protects you',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'faith_shield' },
      description: 'Your believers\' faith shields you',
    }),
  ],
  {
    description: 'Learn to use faith as protection',
    lore: `When your followers believe you are invincible, you become harder to kill.
Their faith wraps around you like armor. Doubt is your only weakness.`,
    prerequisites: ['gather-followers'],
    maxLevel: 5,
    levelCostMultiplier: 1.4,
    icon: '🛡️',
  }
);

const DOGMA_NODE = createSkillNode(
  'dogma',
  'Establish Dogma',
  PARADIGM_ID,
  'specialization',
  3,
  120,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'create_dogma' },
      description: 'Create unchangeable belief structures',
    }),
  ],
  {
    description: 'Learn to establish unchangeable dogma',
    lore: `Certain beliefs must never change. Enshrine them as dogma
and they become resistant to erosion, doubt, and competing beliefs.
The core faith protected forever.`,
    prerequisites: ['faith-shield', 'myth-weaving'],
    icon: '⚓',
  }
);

// ============================================================================
// Mastery Nodes
// ============================================================================

const PROPHET_NODE = createSkillNode(
  'prophet',
  'Prophet',
  PARADIGM_ID,
  'mastery',
  4,
  180,
  [
    createSkillEffect('paradigm_proficiency', 30, {
      description: 'Prophetic authority',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'prophecy' },
      description: 'Make prophecies that believers make true',
    }),
  ],
  {
    description: 'Become a prophet',
    lore: `Your words become prophecy. When you speak of the future, your believers
make it happen. Self-fulfilling predictions backed by the power of faith.`,
    prerequisites: ['dogma', 'major-manifestation'],
    icon: '🔮',
  }
);

const LIVING_MYTH_NODE = createSkillNode(
  'living-myth',
  'Living Myth',
  PARADIGM_ID,
  'mastery',
  5,
  300,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'become_myth' },
      description: 'Become a living myth',
    }),
    createSkillEffect('paradigm_proficiency', 50, {
      description: 'Supreme belief mastery',
    }),
  ],
  {
    description: 'Transcend mortality and become a living myth',
    lore: `You are no longer a person who is believed in. You ARE belief.
A living myth, sustained by the faith of your followers.
As long as they believe, you cannot truly die.`,
    prerequisites: ['prophet', 'reality-rewrite', 'create-god'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 1200 },
        'Requires 1200 total XP in Belief magic'
      ),
    ],
    conditionMode: 'all',
    icon: '🌟',
  }
);

// ============================================================================
// Collect All Nodes
// ============================================================================

const ALL_NODES: MagicSkillNode[] = [
  // Foundation
  BELIEF_SENSE_NODE,
  FAITH_ATTUNEMENT_NODE,
  REALITY_FLEXIBILITY_NODE,
  // Gathering
  INSPIRE_BELIEF_NODE,
  GATHER_FOLLOWERS_NODE,
  MASS_CONVERSION_NODE,
  // Manifestation
  MINOR_MANIFESTATION_NODE,
  MAJOR_MANIFESTATION_NODE,
  REALITY_REWRITE_NODE,
  // Entities
  CREATE_SPIRIT_NODE,
  CREATE_TULPA_NODE,
  CREATE_GOD_NODE,
  // Myth
  STORY_POWER_NODE,
  MYTH_WEAVING_NODE,
  // Defense
  FAITH_SHIELD_NODE,
  DOGMA_NODE,
  // Mastery
  PROPHET_NODE,
  LIVING_MYTH_NODE,
];

// ============================================================================
// XP Sources
// ============================================================================

const XP_SOURCES: MagicXPSource[] = [
  {
    eventType: 'believer_gained',
    xpAmount: 5,
    description: 'Gain a new believer',
  },
  {
    eventType: 'belief_manifested',
    xpAmount: 15,
    description: 'Manifest a belief into reality',
    qualityMultiplier: true,
  },
  {
    eventType: 'story_spread',
    xpAmount: 8,
    description: 'A story about you spreads',
  },
  {
    eventType: 'entity_created',
    xpAmount: 25,
    description: 'Create a belief entity',
  },
  {
    eventType: 'faith_defended',
    xpAmount: 12,
    description: 'Defend against attacks on your belief',
  },
  {
    eventType: 'prophecy_fulfilled',
    xpAmount: 30,
    description: 'Fulfill a prophecy',
  },
];

// ============================================================================
// Tree Definition
// ============================================================================

export const BELIEF_SKILL_TREE: MagicSkillTree = {
  id: 'belief_skill_tree',
  paradigmId: PARADIGM_ID,
  name: 'Belief Magic Skill Tree',
  description: 'Master the art of faith, myth, and reality-altering belief',
  lore: `Reality is consensus. Gods exist because people believe in them.
Myths become real when enough people tell the story.
Lose your believers and you fade from existence.`,
  nodes: ALL_NODES,
  entryNodes: ['belief-sense', 'faith-attunement', 'reality-flexibility'],
  connections: ALL_NODES.flatMap(node =>
    (node.prerequisites ?? []).map(prereq => ({ from: prereq, to: node.id }))
  ),
  xpSources: XP_SOURCES,
  rules: {
    ...createDefaultTreeRules(false),
    permanentProgress: false, // Progress can be lost if believers are lost
    progressLossConditions: [
      createUnlockCondition(
        'resource_level',
        { resourceType: 'belief', resourceMax: 0 },
        'Losing all believers causes fade'
      ),
    ],
  },
  version: 1,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate power from believer count.
 */
export function calculateBeliefPower(
  believerCount: number,
  averageIntensity: keyof typeof BELIEF_INTENSITY
): number {
  const intensityMultipliers: Record<keyof typeof BELIEF_INTENSITY, number> = {
    passing: 0.1,
    mild: 0.3,
    moderate: 0.5,
    strong: 1.0,
    fanatical: 2.0,
    transcendent: 5.0,
  };

  return Math.floor(believerCount * intensityMultipliers[averageIntensity]);
}

/**
 * Get manifestation difficulty based on belief scope.
 */
export function getManifestationDifficulty(
  scope: 'personal' | 'local' | 'regional' | 'global'
): number {
  const difficulties: Record<string, number> = {
    personal: 10,
    local: 50,
    regional: 200,
    global: 1000,
  };
  return difficulties[scope] ?? 10;
}

/**
 * Calculate entity complexity based on type.
 */
export function getEntityComplexity(entityType: keyof typeof BELIEF_ENTITIES): number {
  const complexity: Record<keyof typeof BELIEF_ENTITIES, number> = {
    minor_spirit: 10,
    tulpa: 50,
    egregore: 100,
    godling: 500,
    avatar: 300,
    god: 1000,
  };
  return complexity[entityType];
}

/**
 * Check if faith is sufficient to maintain existence.
 */
export function hasSufficientFaith(
  believerCount: number,
  entityType: keyof typeof BELIEF_ENTITIES
): boolean {
  const minimums: Record<keyof typeof BELIEF_ENTITIES, number> = {
    minor_spirit: 1,
    tulpa: 3,
    egregore: 10,
    godling: 100,
    avatar: 50,
    god: 1000,
  };
  return believerCount >= minimums[entityType];
}
