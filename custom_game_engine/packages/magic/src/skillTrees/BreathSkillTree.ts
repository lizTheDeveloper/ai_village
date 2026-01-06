/**
 * BreathSkillTree - Skill tree for the Breath paradigm
 *
 * Key mechanics:
 * - Breath is a resource you collect from willing donors (or unwilling victims)
 * - Commands are spoken phrases that Awaken objects
 * - Heightenings grant passive abilities based on total Breath held
 * - Awakening difficulty increases with complexity (Type I to Type IV)
 * - Color drains from objects when Breath is used
 * - Returning Breath is possible but difficult
 *
 * Inspired by:
 * - Brandon Sanderson's Warbreaker (the primary inspiration)
 * - The concept of life force as a tradeable commodity
 * - Color as visual representation of vitality
 * - Commands as precise magical programming
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

const PARADIGM_ID = 'breath';

/** Heightening levels and their passive abilities */
export const HEIGHTENINGS = {
  first: { breathRequired: 50, ability: 'Perfect pitch - can identify any sound' },
  second: { breathRequired: 200, ability: 'Perfect color recognition - identify any hue instantly' },
  third: { breathRequired: 600, ability: 'Perfect life sense - detect auras of living things' },
  fourth: { breathRequired: 1000, ability: 'Perfect instinct - sense danger and hostile intent' },
  fifth: { breathRequired: 2000, ability: 'Agelessness - stop aging, immune to disease' },
  sixth: { breathRequired: 3500, ability: 'Instinctive Awakening - no visualization needed' },
  seventh: { breathRequired: 5000, ability: 'Breath recognition - sense Breath in others' },
  eighth: { breathRequired: 10000, ability: 'Command breaking - destroy others\' Commands' },
  ninth: { breathRequired: 20000, ability: 'Perfect Awakening - use any Command regardless of color' },
  tenth: { breathRequired: 50000, ability: 'Spontaneous sentience - Awakenings can become self-aware' },
} as const;

/** Types of Awakening by complexity */
export const AWAKENING_TYPES = {
  type_i: 'Type I - Give simple motion to single object (rope, stick)',
  type_ii: 'Type II - Give complex motion to single object (cloth becomes tentacle)',
  type_iii: 'Type III - Give motion to multiple objects (army of sticks)',
  type_iv: 'Type IV - Give sentience to object (create Lifeless)',
} as const;

/** Command categories */
export const COMMAND_CATEGORIES = {
  basic: 'Simple motion commands (hold, protect, attack)',
  binding: 'Commands that bind objects together',
  transformation: 'Commands that change object behavior',
  combat: 'Offensive and defensive combat commands',
  utility: 'Everyday practical commands',
  artistic: 'Commands for performance and art',
  lifeless: 'Commands for creating and controlling Lifeless',
} as const;

/** Breath sources and methods */
export const BREATH_SOURCES = {
  willing_gift: 'Breath freely given (easiest, no loss)',
  trade: 'Breath traded for something of value',
  coercion: 'Breath given under pressure (risky)',
  theft: 'Breath taken by force (very difficult)',
  inheritance: 'Breath passed at death',
  birth: 'Everyone born with one Breath',
} as const;

// ============================================================================
// Foundation Nodes - Learning Breath
// ============================================================================

/** Entry node - sensing Breath */
const BREATH_SENSE_NODE = createSkillNode(
  'breath-sense',
  'Breath Awareness',
  PARADIGM_ID,
  'foundation',
  0,
  25,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Sense Breath in yourself and others',
      target: { abilityId: 'sense_breath' },
    }),
  ],
  {
    description: 'Learn to feel and recognize Breath',
    lore: `Everyone is born with one Breath - the spark of life given at birth.
You've always had it, but now you learn to feel it, to recognize its presence
in yourself and others. It feels warm, vibrant, alive.`,
    maxLevel: 3,
    levelCostMultiplier: 1.2,
    icon: '🌬️',
  }
);

/** Color awareness - seeing the vitality in things */
const COLOR_SENSE_NODE = createSkillNode(
  'color-sense',
  'Color Awareness',
  PARADIGM_ID,
  'foundation',
  1,
  50,
  [
    createSkillEffect('perception', 10, {
      perLevelValue: 5,
      description: '+X% color perception',
    }),
  ],
  {
    description: 'Learn to see color as life-force',
    lore: `Breath is tied to color. The more Breath something has, the more vibrant
its colors. The less Breath, the more drab and gray. You learn to see this
connection - to read vitality through color itself.`,
    prerequisites: ['breath-sense'],
    maxLevel: 5,
    levelCostMultiplier: 1.3,
  }
);

/** First Heightening - perfect pitch */
const FIRST_HEIGHTENING_NODE = createSkillNode(
  'first-heightening',
  'First Heightening',
  PARADIGM_ID,
  'foundation',
  1,
  100,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Gain perfect pitch',
      target: { abilityId: 'perfect_pitch' },
    }),
  ],
  {
    description: 'Reach the First Heightening - perfect pitch',
    lore: `At 50 Breaths, you reach the First Heightening. Sounds become crystal clear.
You can identify any note, any voice, any rhythm with perfect accuracy. This
is the first sign that you are no longer quite baseline.`,
    prerequisites: ['breath-sense'],
    unlockConditions: [
      // TODO: Implement resource_accumulated condition type
      // createUnlockCondition(
      //   'resource_accumulated',
      //   'Must possess at least 50 Breaths'
      // ),
    ],
    conditionMode: 'all',
    icon: '🎵',
  }
);

/** Breath transfer - giving and taking */
const BREATH_TRANSFER_NODE = createSkillNode(
  'breath-transfer',
  'Breath Transfer',
  PARADIGM_ID,
  'foundation',
  1,
  75,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Transfer Breath between people',
      target: { abilityId: 'transfer_breath' },
    }),
  ],
  {
    description: 'Learn to give and receive Breath',
    lore: `Breath can be transferred from one person to another. The giver must be
willing - or at least, not actively resisting. You learn the technique: the
touch, the intention, the moment of release. It takes only seconds, but feels
like a lifetime.`,
    prerequisites: ['breath-sense'],
    maxLevel: 3,
  }
);

// ============================================================================
// Heightening Nodes - Passive Abilities
// ============================================================================

/** Second Heightening - perfect color */
const SECOND_HEIGHTENING_NODE = createSkillNode(
  'second-heightening',
  'Second Heightening',
  PARADIGM_ID,
  'resource',
  2,
  150,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Gain perfect color recognition',
      target: { abilityId: 'perfect_color' },
    }),
  ],
  {
    description: 'Reach the Second Heightening - perfect color',
    lore: `At 200 Breaths, colors explode in clarity. You can identify the exact hue
of any color instantly, distinguish between shades that others cannot perceive.
This is useful for Awakening - color is power.`,
    prerequisites: ['first-heightening'],
    unlockConditions: [
      createUnlockCondition(
        'resource_accumulated',
        { resourceType: 'breath', resourceAmountRequired: 200 },
        'Must possess at least 200 Breaths'
      ),
    ],
    conditionMode: 'all',
    icon: '🌈',
  }
);

/** Third Heightening - life sense */
const THIRD_HEIGHTENING_NODE = createSkillNode(
  'third-heightening',
  'Third Heightening',
  PARADIGM_ID,
  'resource',
  3,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Sense living auras',
      target: { abilityId: 'life_sense' },
    }),
  ],
  {
    description: 'Reach the Third Heightening - life sense',
    lore: `At 600 Breaths, you gain perfect life sense. You can feel the auras of
living things nearby - their vitality, their health, their Breath. People
glow with inner light that only you can see.`,
    prerequisites: ['second-heightening'],
    unlockConditions: [
      createUnlockCondition(
        'resource_accumulated',
        { resourceType: 'breath', resourceAmountRequired: 600 },
        'Must possess at least 600 Breaths'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Fourth Heightening - perfect instinct */
const FOURTH_HEIGHTENING_NODE = createSkillNode(
  'fourth-heightening',
  'Fourth Heightening',
  PARADIGM_ID,
  'resource',
  3,
  250,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Sense danger and hostile intent',
      target: { abilityId: 'danger_sense' },
    }),
  ],
  {
    description: 'Reach the Fourth Heightening - perfect instinct',
    lore: `At 1000 Breaths, your instincts become supernatural. You sense danger before
it strikes, feel hostile intent like a physical force. Ambushes are nearly
impossible - your body knows to move before your mind understands why.`,
    prerequisites: ['third-heightening'],
    unlockConditions: [
      createUnlockCondition(
        'resource_accumulated',
        { resourceType: 'breath', resourceAmountRequired: 1000 },
        'Must possess at least 1000 Breaths'
      ),
    ],
    conditionMode: 'all',
    icon: '⚡',
  }
);

/** Fifth Heightening - agelessness */
const FIFTH_HEIGHTENING_NODE = createSkillNode(
  'fifth-heightening',
  'Fifth Heightening',
  PARADIGM_ID,
  'resource',
  4,
  400,
  [
    createSkillEffect('lifespan', 1000, {
      description: 'Stop aging, immune to disease',
    }),
  ],
  {
    description: 'Reach the Fifth Heightening - agelessness',
    lore: `At 2000 Breaths, you stop aging. Disease cannot touch you. You become
functionally immortal, as long as you maintain your Breath. This is why
the God King and Returned are what they are - Breath sustains life itself.`,
    prerequisites: ['fourth-heightening'],
    unlockConditions: [
      createUnlockCondition(
        'resource_accumulated',
        { resourceType: 'breath', resourceAmountRequired: 2000 },
        'Must possess at least 2000 Breaths'
      ),
    ],
    conditionMode: 'all',
    icon: '♾️',
  }
);

// ============================================================================
// Awakening Technique Nodes
// ============================================================================

/** Basic Awakening - learning the art */
const BASIC_AWAKENING_NODE = createSkillNode(
  'basic-awakening',
  'Basic Awakening',
  PARADIGM_ID,
  'technique',
  1,
  125,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Awaken objects with simple Commands',
      target: { abilityId: 'awaken' },
    }),
  ],
  {
    description: 'Learn the basic technique of Awakening',
    lore: `To Awaken an object: touch it, visualize what you want it to do, drain
color from nearby objects to fuel the Command, and speak the Command phrase.
The object will then follow your instructions. Simple Commands cost little
Breath. Complex ones can cost hundreds.`,
    prerequisites: ['breath-transfer', 'color-sense'],
    unlockConditions: [
      createUnlockCondition(
        'teacher_found',
        { teacherType: 'awakener' },
        'Must be taught by an Awakener'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Command crafting - creating effective Commands */
const COMMAND_CRAFTING_NODE = createSkillNode(
  'command-crafting',
  'Command Crafting',
  PARADIGM_ID,
  'technique',
  2,
  100,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Create custom Commands',
      target: { abilityId: 'craft_command' },
    }),
  ],
  {
    description: 'Learn to craft effective Command phrases',
    lore: `The Command phrase matters. "Hold things" works. "Hold this" works better.
"Protect my back" is more effective than "Fight for me." The more specific,
the better - but also the more limiting. You learn the art of Command phrasing.`,
    prerequisites: ['basic-awakening'],
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

/** Visualization mastery - mental clarity */
const VISUALIZATION_NODE = createSkillNode(
  'visualization',
  'Clear Visualization',
  PARADIGM_ID,
  'technique',
  2,
  125,
  [
    createSkillEffect('technique_proficiency', 15, {
      perLevelValue: 5,
      target: { techniqueId: 'create' },
      description: '+X% Awakening success rate',
    }),
  ],
  {
    description: 'Master the visualization required for Awakening',
    lore: `You must hold the image perfectly in your mind: what you want the object
to do, how it should move, its purpose. Distraction breaks the Awakening.
Fear shatters it. Perfect focus is essential.`,
    prerequisites: ['basic-awakening'],
    maxLevel: 5,
    levelCostMultiplier: 1.4,
  }
);

/** Color draining - efficient fuel use */
const COLOR_DRAINING_NODE = createSkillNode(
  'color-draining',
  'Efficient Draining',
  PARADIGM_ID,
  'technique',
  2,
  100,
  [
    createSkillEffect('resource_efficiency', 15, {
      perLevelValue: 5,
      description: 'Reduce color cost by X%',
    }),
  ],
  {
    description: 'Learn to drain color efficiently from surroundings',
    lore: `Awakening requires color as fuel - drained from nearby objects. The more
vibrant the colors, the better. You learn to pull color efficiently, to
sense which objects have the most to give.`,
    prerequisites: ['basic-awakening', 'second-heightening'],
    maxLevel: 5,
  }
);

// ============================================================================
// Awakening Type Nodes
// ============================================================================

/** Type I Awakening - simple motion */
const TYPE_I_AWAKENING_NODE = createSkillNode(
  'type-i-awakening',
  'Type I Awakening',
  PARADIGM_ID,
  'technique',
  2,
  150,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Awaken objects for simple motion',
      target: { abilityId: 'type_i_awaken' },
    }),
  ],
  {
    description: 'Master Type I Awakening - simple motion',
    lore: `Type I: Make a rope grab things. Make a stick fight. Simple motion for a
single object. This is the bread and butter of Awakening - cheap, reliable,
effective.`,
    prerequisites: ['basic-awakening'],
  }
);

/** Type II Awakening - complex motion */
const TYPE_II_AWAKENING_NODE = createSkillNode(
  'type-ii-awakening',
  'Type II Awakening',
  PARADIGM_ID,
  'technique',
  3,
  225,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Awaken objects for complex motion',
      target: { abilityId: 'type_ii_awaken' },
    }),
  ],
  {
    description: 'Master Type II Awakening - complex motion',
    lore: `Type II: Make cloth move like a tentacle. Make a cloak defend you actively.
Complex, fluid motion for a single object. Costs more Breath but far more
versatile.`,
    prerequisites: ['type-i-awakening', 'command-crafting'],
  }
);

/** Type III Awakening - multiple objects */
const TYPE_III_AWAKENING_NODE = createSkillNode(
  'type-iii-awakening',
  'Type III Awakening',
  PARADIGM_ID,
  'technique',
  4,
  300,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Awaken multiple objects simultaneously',
      target: { abilityId: 'type_iii_awaken' },
    }),
  ],
  {
    description: 'Master Type III Awakening - multiple objects',
    lore: `Type III: Command an army of sticks, a swarm of ropes. Awaken many objects
at once with a single Command. Expensive but devastating in combat.`,
    prerequisites: ['type-ii-awakening', 'visualization'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'visualization', level: 3 },
        'Requires advanced visualization skill'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Type IV Awakening - creating Lifeless */
const TYPE_IV_AWAKENING_NODE = createSkillNode(
  'type-iv-awakening',
  'Type IV Awakening',
  PARADIGM_ID,
  'mastery',
  5,
  500,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Create Lifeless - animated corpses with Commands',
      target: { abilityId: 'type_iv_awaken' },
    }),
  ],
  {
    description: 'Master Type IV Awakening - create Lifeless',
    lore: `Type IV: Awaken a corpse. Give a dead body new life, purpose, obedience.
This is the darkest use of Breath - creating Lifeless. They follow Commands
perfectly, never tire, never question. They are not alive, but they move
and fight as if they were. Costs hundreds of Breaths per corpse.`,
    prerequisites: ['type-iii-awakening'],
    unlockConditions: [
      createUnlockCondition(
        'resource_accumulated',
        { resourceType: 'breath', resourceAmountRequired: 1000 },
        'Must have significant Breath to attempt'
      ),
      createUnlockCondition(
        'teacher_found',
        { teacherType: 'lifeless_master' },
        'Must learn from a Lifeless master'
      ),
    ],
    conditionMode: 'all',
    icon: '💀',
  }
);

// ============================================================================
// Breath Acquisition Nodes
// ============================================================================

/** Willing transfer - the proper way */
const WILLING_TRANSFER_NODE = createSkillNode(
  'willing-transfer',
  'Willing Transfer',
  PARADIGM_ID,
  'resource',
  1,
  50,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Receive Breath from willing donors',
      target: { abilityId: 'receive_breath' },
    }),
  ],
  {
    description: 'Learn to receive Breath from willing givers',
    lore: `The proper way: someone gives their Breath willingly. Perhaps for money,
perhaps for favor, perhaps out of love or duty. The transfer is clean,
complete, without corruption. This is how most Awakeners gain Breath.`,
    prerequisites: ['breath-transfer'],
  }
);

/** Coercive transfer - dangerous territory */
const COERCIVE_TRANSFER_NODE = createSkillNode(
  'coercive-transfer',
  'Coercive Transfer',
  PARADIGM_ID,
  'resource',
  2,
  150,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Take Breath from the unwilling (risky)',
      target: { abilityId: 'coerce_breath' },
    }),
  ],
  {
    description: 'Learn to take Breath from the reluctant or coerced',
    lore: `If someone is forced to give Breath - through threat, blackmail, or fear -
the transfer becomes difficult. They resist, consciously or not. The Breath
fights you. But it can be done, if you're strong enough.`,
    prerequisites: ['willing-transfer'],
    icon: '⚠️',
  }
);

/** Breath return - giving it back */
const BREATH_RETURN_NODE = createSkillNode(
  'breath-return',
  'Return Breath',
  PARADIGM_ID,
  'resource',
  3,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Return Breath to its original owner',
      target: { abilityId: 'return_breath' },
    }),
  ],
  {
    description: 'Learn the difficult art of returning Breath',
    lore: `Giving away Breath is harder than receiving it. Your body fights the loss.
Returning Breath to its original owner is even harder - it must recognize
them, flow back willingly. Few Awakeners ever manage it.`,
    prerequisites: ['willing-transfer', 'fifth-heightening'],
    icon: '↩️',
  }
);

// ============================================================================
// Advanced Technique Nodes
// ============================================================================

/** Command breaking - destroying others' work */
const COMMAND_BREAKING_NODE = createSkillNode(
  'command-breaking',
  'Command Breaking',
  PARADIGM_ID,
  'mastery',
  4,
  350,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Break and destroy Commands',
      target: { abilityId: 'break_command' },
    }),
  ],
  {
    description: 'Learn to destroy others\' Commands',
    lore: `At the Eighth Heightening, you can break Commands - unraveling the Breath
that animates an Awakened object, returning it to stillness. This is both
defensive (stopping enemy Awakenings) and offensive (wasting their Breath).`,
    prerequisites: ['type-iii-awakening'],
    unlockConditions: [
      createUnlockCondition(
        'resource_accumulated',
        { resourceType: 'breath', resourceAmountRequired: 10000 },
        'Requires Eighth Heightening (10,000 Breaths)'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Perfect Awakening - no color needed */
const PERFECT_AWAKENING_NODE = createSkillNode(
  'perfect-awakening',
  'Perfect Awakening',
  PARADIGM_ID,
  'mastery',
  5,
  500,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Awaken without color requirements',
      target: { abilityId: 'perfect_awaken' },
    }),
  ],
  {
    description: 'Achieve Perfect Awakening - bypass color requirements',
    lore: `At the Ninth Heightening, you can Awaken anything regardless of color. No
need to drain colors from the environment. Your Breath is so vast it provides
its own fuel. This is mastery of the art.`,
    prerequisites: ['command-breaking', 'type-iv-awakening'],
    unlockConditions: [
      createUnlockCondition(
        'resource_accumulated',
        { resourceType: 'breath', resourceAmountRequired: 20000 },
        'Requires Ninth Heightening (20,000 Breaths)'
      ),
    ],
    conditionMode: 'all',
    icon: '✨',
  }
);

/** Spontaneous sentience - ultimate mastery */
const SPONTANEOUS_SENTIENCE_NODE = createSkillNode(
  'spontaneous-sentience',
  'Spontaneous Sentience',
  PARADIGM_ID,
  'mastery',
  5,
  750,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Awakenings can spontaneously gain sentience',
      target: { abilityId: 'grant_sentience' },
    }),
  ],
  {
    description: 'Achieve the Tenth Heightening - spontaneous sentience',
    lore: `At the Tenth Heightening, your Awakenings can spontaneously become sentient.
Not just following Commands, but thinking, choosing, becoming. You create
life itself from lifeless matter. This is the power of gods.`,
    prerequisites: ['perfect-awakening'],
    unlockConditions: [
      createUnlockCondition(
        'resource_accumulated',
        { resourceType: 'breath', resourceAmountRequired: 50000 },
        'Requires Tenth Heightening (50,000 Breaths)'
      ),
    ],
    conditionMode: 'all',
    hidden: true,
    icon: '👁️',
  }
);

// ============================================================================
// XP Sources
// ============================================================================

const XP_SOURCES: MagicXPSource[] = [
  {
    eventType: 'breath_received',
    xpAmount: 10,
    description: 'Receive Breath from another person',
  },
  {
    eventType: 'breath_given',
    xpAmount: 25,
    description: 'Successfully give away Breath',
  },
  {
    eventType: 'breath_returned',
    xpAmount: 100,
    description: 'Return Breath to its original owner',
  },
  {
    eventType: 'object_awakened',
    xpAmount: 30,
    description: 'Successfully Awaken an object',
  },
  {
    eventType: 'command_created',
    xpAmount: 50,
    description: 'Create a new effective Command phrase',
  },
  {
    eventType: 'lifeless_created',
    xpAmount: 200,
    description: 'Successfully create a Lifeless',
  },
  {
    eventType: 'command_broken',
    xpAmount: 75,
    description: 'Break another Awakener\'s Command',
  },
  {
    eventType: 'heightening_reached',
    xpAmount: 150,
    description: 'Reach a new Heightening level',
  },
];

// ============================================================================
// Tree Assembly
// ============================================================================

const ALL_NODES: MagicSkillNode[] = [
  // Foundation
  BREATH_SENSE_NODE,
  COLOR_SENSE_NODE,
  BREATH_TRANSFER_NODE,

  // Heightenings
  FIRST_HEIGHTENING_NODE,
  SECOND_HEIGHTENING_NODE,
  THIRD_HEIGHTENING_NODE,
  FOURTH_HEIGHTENING_NODE,
  FIFTH_HEIGHTENING_NODE,

  // Awakening techniques
  BASIC_AWAKENING_NODE,
  COMMAND_CRAFTING_NODE,
  VISUALIZATION_NODE,
  COLOR_DRAINING_NODE,

  // Awakening types
  TYPE_I_AWAKENING_NODE,
  TYPE_II_AWAKENING_NODE,
  TYPE_III_AWAKENING_NODE,
  TYPE_IV_AWAKENING_NODE,

  // Breath acquisition
  WILLING_TRANSFER_NODE,
  COERCIVE_TRANSFER_NODE,
  BREATH_RETURN_NODE,

  // Advanced/Mastery
  COMMAND_BREAKING_NODE,
  PERFECT_AWAKENING_NODE,
  SPONTANEOUS_SENTIENCE_NODE,
];

/**
 * The Breath skill tree.
 * Everyone is born with one Breath, but learning to use it requires teaching.
 */
export const BREATH_SKILL_TREE: MagicSkillTree = {
  id: 'breath-tree',
  paradigmId: PARADIGM_ID,
  name: 'The Art of Awakening',
  description: 'Collect Breath, Awaken objects with Commands, and ascend through the Heightenings.',
  lore: `Everyone is born with one Breath - the divine spark that animates life. Most
people live their entire lives with just that single Breath, never knowing its
potential. But Breath can be given, taken, and used.

An Awakener learns to collect Breath from others and use it to Awaken inanimate
objects - giving them motion, purpose, even sentience. The process is simple in
concept: touch the object, visualize what you want it to do, drain color from
nearby objects to fuel the Command, and speak the Command phrase.

But mastery takes lifetimes. Different Awakening types have different costs and
complexities. Type I (simple motion) is easy. Type IV (creating Lifeless) requires
hundreds of Breaths and perfect technique.

As you accumulate Breath, you pass through Heightenings - thresholds that grant
passive abilities. The First Heightening (50 Breaths) gives perfect pitch. The
Fifth Heightening (2000 Breaths) grants agelessness. The Tenth Heightening
(50,000 Breaths) allows your Awakenings to spontaneously gain sentience.

The God King himself is said to hold over 50,000 Breaths. The Returned are born
with thousands. Common Awakeners might have 50-500. And most people? Just the
one they were born with, given away for a handful of coins to those who would
use it.`,
  nodes: ALL_NODES,
  entryNodes: ['breath-sense'],
  connections: [], // Auto-generated from prerequisites
  xpSources: XP_SOURCES,
  rules: {
    ...createDefaultTreeRules(false), // No innate requirement
    allowRespec: false, // Breath is permanent
    permanentProgress: true,
  },
  version: 1,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate current Heightening level based on Breath count.
 */
export function getCurrentHeightening(breathCount: number): number {
  if (breathCount >= 50000) return 10;
  if (breathCount >= 20000) return 9;
  if (breathCount >= 10000) return 8;
  if (breathCount >= 5000) return 7;
  if (breathCount >= 3500) return 6;
  if (breathCount >= 2000) return 5;
  if (breathCount >= 1000) return 4;
  if (breathCount >= 600) return 3;
  if (breathCount >= 200) return 2;
  if (breathCount >= 50) return 1;
  return 0;
}

/**
 * Get passive abilities granted by current Heightening.
 */
export function getHeighteningAbilities(heightening: number): string[] {
  const abilities: string[] = [];

  if (heightening >= 1) abilities.push('perfect_pitch');
  if (heightening >= 2) abilities.push('perfect_color');
  if (heightening >= 3) abilities.push('life_sense');
  if (heightening >= 4) abilities.push('danger_sense');
  if (heightening >= 5) abilities.push('agelessness');
  if (heightening >= 6) abilities.push('instinctive_awakening');
  if (heightening >= 7) abilities.push('breath_recognition');
  if (heightening >= 8) abilities.push('command_breaking');
  if (heightening >= 9) abilities.push('perfect_awakening');
  if (heightening >= 10) abilities.push('spontaneous_sentience');

  return abilities;
}

/**
 * Calculate Breath cost for an Awakening.
 */
export function calculateAwakeningCost(
  type: keyof typeof AWAKENING_TYPES,
  objectCount: number = 1,
  duration: number = 60, // seconds
  efficiency: number = 0 // 0-100, from skill levels
): number {
  let baseCost = 0;

  switch (type) {
    case 'type_i':
      baseCost = 50;
      break;
    case 'type_ii':
      baseCost = 150;
      break;
    case 'type_iii':
      baseCost = 100 * objectCount;
      break;
    case 'type_iv':
      baseCost = 500; // Per corpse
      break;
  }

  // Duration affects cost (longer = more Breath)
  const durationMultiplier = duration / 60; // Normalized to 1 minute

  // Efficiency reduces cost
  const efficiencyMultiplier = 1 - (efficiency / 100);

  return Math.ceil(baseCost * durationMultiplier * efficiencyMultiplier);
}

/**
 * Check if can perform a specific Awakening type.
 */
export function canPerformAwakening(
  type: keyof typeof AWAKENING_TYPES,
  unlockedNodes: Record<string, number>,
  currentBreath: number,
  requiredBreath: number
): boolean {
  // Must have basic awakening
  if (!unlockedNodes['basic-awakening']) return false;

  // Must have the specific type unlocked
  const typeNode = `type-${type.replace('type_', '')}-awakening`;
  if (!unlockedNodes[typeNode]) return false;

  // Must have enough Breath
  if (currentBreath < requiredBreath) return false;

  return true;
}

/**
 * Get maximum Command complexity available.
 */
export function getMaxCommandComplexity(unlockedNodes: Record<string, number>): number {
  let complexity = 1;

  if (unlockedNodes['command-crafting']) {
    complexity += unlockedNodes['command-crafting'];
  }
  if (unlockedNodes['visualization']) {
    complexity += unlockedNodes['visualization'] * 0.5;
  }
  if (unlockedNodes['perfect-awakening']) {
    complexity = 10; // Maximum
  }

  return Math.floor(complexity);
}

/**
 * Calculate color drain efficiency.
 */
export function getColorDrainEfficiency(unlockedNodes: Record<string, number>): number {
  let efficiency = 0;

  if (unlockedNodes['color-sense']) {
    efficiency += 10 + (unlockedNodes['color-sense'] - 1) * 5;
  }
  if (unlockedNodes['color-draining']) {
    efficiency += 15 + (unlockedNodes['color-draining'] - 1) * 5;
  }
  if (unlockedNodes['second-heightening']) {
    efficiency += 10;
  }

  return Math.min(efficiency, 90); // Cap at 90%
}
