/**
 * ParadoxSkillTree - Skill tree for the Paradox paradigm
 *
 * Key mechanics:
 * - Logical Contradictions (exploit impossible statements)
 * - Reality Tears (break physics temporarily)
 * - Self-Reference (recursive magic loops)
 * - Impossibility Mining (extract power from the impossible)
 * - Paradox Spirits (summon beings from logical contradictions)
 * - Reality Crash (temporary system failure in physics)
 *
 * Core concept:
 * - Contradictions = power source
 * - Reality breaks when forced to resolve the unresolvable
 * - Extremely dangerous and unpredictable
 *
 * Risks:
 * - Madness (sanity loss)
 * - Reality tears (permanent damage)
 * - Paradox spirits (hostile entities)
 * - Existence paradox (ceasing to exist)
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

const PARADIGM_ID = 'paradox_magic';

/** Famous paradoxes that can be invoked */
export const PARADOX_TYPES = {
  liar: '"This statement is false" - recursive truth paradox',
  bootstrap: 'Effect causes its own cause - temporal loop',
  omnipotence: 'Unstoppable force meets immovable object',
  barber: 'The barber who shaves all who don\'t shave themselves',
  ship: 'If all parts are replaced, is it the same ship?',
  zeno: 'Motion is impossible because distance is infinite',
  grandfather: 'Prevent your own existence',
  raven: 'All ravens are black, therefore all non-black things are non-ravens',
} as const;

/** Stability levels of reality */
export const REALITY_STABILITY = {
  stable: 'Normal physics apply',
  stressed: 'Minor glitches possible',
  strained: 'Spontaneous anomalies',
  tearing: 'Reality actively breaking',
  crashed: 'Temporary physics failure',
} as const;

/** Sanity cost multipliers */
export const SANITY_COSTS = {
  minor: 5,
  moderate: 15,
  severe: 30,
  catastrophic: 50,
  terminal: 100,
} as const;

// ============================================================================
// Foundation Nodes - Paradox Awareness
// ============================================================================

const CONTRADICTION_SENSE_NODE = createSkillNode(
  'contradiction-sense',
  'Contradiction Sense',
  PARADIGM_ID,
  'foundation',
  0,
  30,
  [
    createSkillEffect('perception', 10, {
      description: 'Sense logical contradictions in reality',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'paradox_detection' },
      description: 'Detect paradoxes and logical inconsistencies',
    }),
  ],
  {
    description: 'Learn to sense contradictions in reality',
    lore: `Reality has cracks. Places where logic frays, where the rules
don't quite add up. Most minds slide past them, unaware.
Your mind learns to snag on these imperfections, to feel them.`,
    maxLevel: 3,
    levelCostMultiplier: 1.3,
    icon: '❓',
  }
);

const LOGIC_FLEXIBILITY_NODE = createSkillNode(
  'logic-flexibility',
  'Logic Flexibility',
  PARADIGM_ID,
  'foundation',
  0,
  25,
  [
    createSkillEffect('defense', 10, {
      perLevelValue: 5,
      description: 'Resistance to paradox backlash',
    }),
  ],
  {
    description: 'Learn to think in contradictions without breaking',
    lore: `The human mind wasn't built for paradox. It recoils from contradiction.
But with practice, you can hold two opposing truths simultaneously.
This flexibility protects you from the madness that breaks others.`,
    maxLevel: 5,
    levelCostMultiplier: 1.4,
    icon: '🧠',
  }
);

const IMPOSSIBLE_THOUGHT_NODE = createSkillNode(
  'impossible-thought',
  'Impossible Thought',
  PARADIGM_ID,
  'foundation',
  0,
  35,
  [
    createSkillEffect('paradigm_proficiency', 5, {
      perLevelValue: 3,
      description: 'Bonus to paradox magic',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'think_impossible' },
      description: 'Think thoughts that should be impossible',
    }),
  ],
  {
    description: 'Learn to think impossible thoughts',
    lore: `Imagine a color you've never seen. Picture a square circle.
Most can't. You must. The impossible thought is the seed
from which paradox magic grows.`,
    maxLevel: 5,
    levelCostMultiplier: 1.3,
    icon: '💭',
  }
);

// ============================================================================
// Basic Paradox Nodes
// ============================================================================

const LIAR_PARADOX_NODE = createSkillNode(
  'liar-paradox',
  'The Liar Paradox',
  PARADIGM_ID,
  'technique',
  1,
  50,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'invoke_liar' },
      description: 'Invoke the liar paradox',
    }),
  ],
  {
    description: 'Learn to invoke "This statement is false"',
    lore: `"This statement is false." If true, it's false. If false, it's true.
Speak it with conviction and reality stutters, caught in the loop.
The simplest paradox, but potent.`,
    prerequisites: ['contradiction-sense'],
    icon: '🗣️',
  }
);

const BOOTSTRAP_PARADOX_NODE = createSkillNode(
  'bootstrap-paradox',
  'The Bootstrap Paradox',
  PARADIGM_ID,
  'technique',
  2,
  80,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'invoke_bootstrap' },
      description: 'Create effects that cause themselves',
    }),
  ],
  {
    description: 'Learn to create self-causing loops',
    lore: `The chicken and the egg, but as a weapon. Create an effect
that retroactively creates its own cause. Information from nowhere.
Power from nothing. Time doesn't like this.`,
    prerequisites: ['liar-paradox'],
    icon: '🔄',
  }
);

const OMNIPOTENCE_PARADOX_NODE = createSkillNode(
  'omnipotence-paradox',
  'The Omnipotence Paradox',
  PARADIGM_ID,
  'technique',
  2,
  90,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'invoke_omnipotence' },
      description: 'Create unstoppable vs immovable scenarios',
    }),
  ],
  {
    description: 'Invoke unstoppable force vs immovable object',
    lore: `What happens when the unstoppable meets the immovable?
Reality doesn't know. Reality can't know. Force the question
and reality breaks trying to answer.`,
    prerequisites: ['contradiction-sense', 'impossible-thought'],
    icon: '⚡',
  }
);

// ============================================================================
// Reality Manipulation Nodes
// ============================================================================

const REALITY_STRESS_NODE = createSkillNode(
  'reality-stress',
  'Reality Stress',
  PARADIGM_ID,
  'technique',
  1,
  60,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'stress_reality' },
      description: 'Apply logical pressure to reality',
    }),
  ],
  {
    description: 'Learn to stress reality with contradictions',
    lore: `Reality is strong but not infinitely so. Apply pressure
at the logical seams and it begins to crack. Small glitches.
Minor impossibilities. The first step to greater tears.`,
    prerequisites: ['contradiction-sense'],
    maxLevel: 3,
    levelCostMultiplier: 1.5,
    icon: '⚠️',
  }
);

const REALITY_TEAR_NODE = createSkillNode(
  'reality-tear',
  'Reality Tear',
  PARADIGM_ID,
  'technique',
  3,
  130,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'tear_reality' },
      description: 'Create temporary tears in reality',
    }),
  ],
  {
    description: 'Learn to tear holes in the fabric of reality',
    lore: `Enough pressure and reality rips. Through the tear, glimpse
what should not be. Sometimes useful things fall out.
Sometimes things fall in. Close it quickly.`,
    prerequisites: ['reality-stress', 'omnipotence-paradox'],
    unlockConditions: [
      createUnlockCondition(
        'corruption_level',
        { corruptionMin: 10 },
        'Requires minimum 10 corruption'
      ),
    ],
    conditionMode: 'any',
    icon: '🕳️',
  }
);

const REALITY_CRASH_NODE = createSkillNode(
  'reality-crash',
  'Reality Crash',
  PARADIGM_ID,
  'mastery',
  4,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'crash_reality' },
      description: 'Cause temporary physics failure',
    }),
  ],
  {
    description: 'Learn to crash reality like a faulty program',
    lore: `Reality is code. Paradox is a bug. Force enough bugs simultaneously
and the system crashes. For a beautiful, terrible moment,
nothing works. Anything is possible. Nothing is real.`,
    prerequisites: ['reality-tear'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 800 },
        'Requires 800 total XP in Paradox magic'
      ),
    ],
    conditionMode: 'all',
    icon: '💥',
  }
);

// ============================================================================
// Self-Reference Nodes
// ============================================================================

const RECURSIVE_SPELL_NODE = createSkillNode(
  'recursive-spell',
  'Recursive Spell',
  PARADIGM_ID,
  'technique',
  2,
  85,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'recursive_casting' },
      description: 'Cast spells that reference themselves',
    }),
  ],
  {
    description: 'Learn to cast self-referential spells',
    lore: `A spell that casts itself casting itself casting itself...
The recursion amplifies power but risks infinite loops.
Know when to break the chain.`,
    prerequisites: ['bootstrap-paradox'],
    icon: '🔁',
  }
);

const STRANGE_LOOP_NODE = createSkillNode(
  'strange-loop',
  'Strange Loop',
  PARADIGM_ID,
  'technique',
  3,
  120,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'create_strange_loop' },
      description: 'Create Escher-like impossible structures',
    }),
  ],
  {
    description: 'Learn to create strange loops in reality',
    lore: `Stairs that go up forever by going down. Water that flows uphill
to feed itself. Hands drawing themselves into existence.
Strange loops bend space and time into impossible shapes.`,
    prerequisites: ['recursive-spell'],
    icon: '🎭',
  }
);

// ============================================================================
// Paradox Entity Nodes
// ============================================================================

const PARADOX_SPIRIT_NODE = createSkillNode(
  'paradox-spirit',
  'Paradox Spirit',
  PARADIGM_ID,
  'specialization',
  3,
  140,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'summon_paradox_spirit' },
      description: 'Summon beings born from contradiction',
    }),
  ],
  {
    description: 'Learn to summon spirits born from paradox',
    lore: `Where reality breaks, something fills the gap. Paradox spirits -
beings made of contradiction itself. They exist by not existing.
They help by harming. They are difficult to control.`,
    prerequisites: ['reality-tear'],
    icon: '👻',
  }
);

const IMPOSSIBLE_BEING_NODE = createSkillNode(
  'impossible-being',
  'Impossible Being',
  PARADIGM_ID,
  'mastery',
  4,
  180,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'become_impossible' },
      description: 'Temporarily become a logical impossibility',
    }),
  ],
  {
    description: 'Learn to become an impossibility yourself',
    lore: `The ultimate paradox: exist as something that cannot exist.
For a moment, you are your own contradiction. Reality cannot
harm what reality cannot process. You slip between the rules.`,
    prerequisites: ['paradox-spirit', 'strange-loop'],
    unlockConditions: [
      createUnlockCondition(
        'nodes_unlocked',
        { nodesRequired: 10 },
        'Requires 10 nodes unlocked'
      ),
    ],
    conditionMode: 'all',
    icon: '🌀',
  }
);

// ============================================================================
// Sanity Protection Nodes
// ============================================================================

const MADNESS_RESISTANCE_NODE = createSkillNode(
  'madness-resistance',
  'Madness Resistance',
  PARADIGM_ID,
  'specialization',
  1,
  50,
  [
    createSkillEffect('defense', 15, {
      perLevelValue: 10,
      description: 'Resistance to sanity loss',
    }),
  ],
  {
    description: 'Build resistance to paradox-induced madness',
    lore: `The mind breaks when forced to hold contradictions. But yours can bend.
Each paradox weathered builds tolerance. You learn to let the
impossible slide through without catching.`,
    prerequisites: ['logic-flexibility'],
    maxLevel: 5,
    levelCostMultiplier: 1.3,
    icon: '🛡️',
  }
);

const COMPARTMENTALIZATION_NODE = createSkillNode(
  'compartmentalization',
  'Compartmentalization',
  PARADIGM_ID,
  'specialization',
  2,
  80,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'compartmentalize' },
      description: 'Isolate paradox damage to parts of your mind',
    }),
  ],
  {
    description: 'Learn to isolate paradox damage mentally',
    lore: `Wall off sections of your mind. Let the paradox break that part
while the rest remains whole. Sacrifice memories, skills, even
personality fragments to preserve core sanity.`,
    prerequisites: ['madness-resistance'],
    icon: '🧩',
  }
);

// ============================================================================
// Mastery Nodes
// ============================================================================

const PARADOX_IMMUNITY_NODE = createSkillNode(
  'paradox-immunity',
  'Paradox Immunity',
  PARADIGM_ID,
  'mastery',
  4,
  200,
  [
    createSkillEffect('defense', 50, {
      description: 'Near-immunity to paradox backlash',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'paradox_immunity' },
      description: 'Become immune to most paradox effects',
    }),
  ],
  {
    description: 'Achieve near-immunity to paradox effects',
    lore: `You have held so many contradictions that you have become one.
Neither true nor false, neither real nor unreal. Paradox flows
through you like water through a net.`,
    prerequisites: ['compartmentalization', 'impossible-being'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 900 },
        'Requires 900 total XP in Paradox magic'
      ),
    ],
    conditionMode: 'all',
    icon: '⭐',
  }
);

const EXISTENCE_PARADOX_NODE = createSkillNode(
  'existence-paradox',
  'Existence Paradox',
  PARADIGM_ID,
  'mastery',
  5,
  300,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'existence_paradox' },
      description: 'Manipulate your own existence status',
    }),
    createSkillEffect('paradigm_proficiency', 50, {
      description: 'Supreme paradox mastery',
    }),
  ],
  {
    description: 'Master the paradox of your own existence',
    lore: `Do you exist? A simple question with a simple answer, normally.
But you can make it complicated. Exist and not-exist simultaneously.
The grandfather paradox applied to yourself. The ultimate power.`,
    prerequisites: ['paradox-immunity', 'reality-crash'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 1500 },
        'Requires 1500 total XP in Paradox magic'
      ),
    ],
    conditionMode: 'all',
    icon: '🔮',
  }
);

// ============================================================================
// Collect All Nodes
// ============================================================================

const ALL_NODES: MagicSkillNode[] = [
  // Foundation
  CONTRADICTION_SENSE_NODE,
  LOGIC_FLEXIBILITY_NODE,
  IMPOSSIBLE_THOUGHT_NODE,
  // Basic Paradoxes
  LIAR_PARADOX_NODE,
  BOOTSTRAP_PARADOX_NODE,
  OMNIPOTENCE_PARADOX_NODE,
  // Reality Manipulation
  REALITY_STRESS_NODE,
  REALITY_TEAR_NODE,
  REALITY_CRASH_NODE,
  // Self-Reference
  RECURSIVE_SPELL_NODE,
  STRANGE_LOOP_NODE,
  // Entities
  PARADOX_SPIRIT_NODE,
  IMPOSSIBLE_BEING_NODE,
  // Sanity
  MADNESS_RESISTANCE_NODE,
  COMPARTMENTALIZATION_NODE,
  // Mastery
  PARADOX_IMMUNITY_NODE,
  EXISTENCE_PARADOX_NODE,
];

// ============================================================================
// XP Sources
// ============================================================================

const XP_SOURCES: MagicXPSource[] = [
  {
    eventType: 'paradox_invoked',
    xpAmount: 15,
    description: 'Successfully invoke a paradox',
    qualityMultiplier: true,
  },
  {
    eventType: 'reality_stressed',
    xpAmount: 10,
    description: 'Stress reality with contradictions',
  },
  {
    eventType: 'reality_torn',
    xpAmount: 30,
    description: 'Create a reality tear',
  },
  {
    eventType: 'sanity_survived',
    xpAmount: 20,
    description: 'Survive sanity damage from paradox',
  },
  {
    eventType: 'paradox_spirit_controlled',
    xpAmount: 25,
    description: 'Successfully control a paradox spirit',
  },
  {
    eventType: 'impossible_thought',
    xpAmount: 5,
    description: 'Think an impossible thought',
  },
];

// ============================================================================
// Tree Definition
// ============================================================================

export const PARADOX_SKILL_TREE: MagicSkillTree = {
  id: 'paradox_skill_tree',
  paradigmId: PARADIGM_ID,
  name: 'Paradox Magic Skill Tree',
  description: 'Master the art of logical contradiction and reality manipulation',
  lore: `This statement is false. A barber shaves all who don't shave themselves.
These words hurt to read. They hurt more to use. Reality wasn't built
to handle contradictions. Force them upon it and it breaks.
In the breaking, power. In the power, madness.`,
  nodes: ALL_NODES,
  entryNodes: ['contradiction-sense', 'logic-flexibility', 'impossible-thought'],
  connections: ALL_NODES.flatMap(node =>
    (node.prerequisites ?? []).map(prereq => ({ from: prereq, to: node.id }))
  ),
  xpSources: XP_SOURCES,
  rules: {
    ...createDefaultTreeRules(false),
    allowRespec: false, // Can't unrealize paradoxes
    permanentProgress: true,
  },
  version: 1,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate sanity cost for a paradox operation.
 */
export function calculateSanityCost(
  paradoxType: keyof typeof PARADOX_TYPES,
  unlockedNodes: Set<string>,
  madnessResistanceLevel: number
): number {
  const baseCosts: Record<keyof typeof PARADOX_TYPES, number> = {
    liar: SANITY_COSTS.minor,
    bootstrap: SANITY_COSTS.moderate,
    omnipotence: SANITY_COSTS.moderate,
    barber: SANITY_COSTS.minor,
    ship: SANITY_COSTS.minor,
    zeno: SANITY_COSTS.moderate,
    grandfather: SANITY_COSTS.severe,
    raven: SANITY_COSTS.minor,
  };

  let cost = baseCosts[paradoxType];

  // Resistance reduces cost
  const resistanceReduction = madnessResistanceLevel * 0.1;
  cost *= (1 - resistanceReduction);

  // Immunity node greatly reduces
  if (unlockedNodes.has('paradox-immunity')) {
    cost *= 0.25;
  }

  return Math.max(Math.floor(cost), 1);
}

/**
 * Get reality stability after paradox use.
 */
export function getRealityStability(paradoxesInvoked: number): keyof typeof REALITY_STABILITY {
  if (paradoxesInvoked === 0) return 'stable';
  if (paradoxesInvoked <= 2) return 'stressed';
  if (paradoxesInvoked <= 5) return 'strained';
  if (paradoxesInvoked <= 10) return 'tearing';
  return 'crashed';
}

/**
 * Check if a paradox can be safely invoked.
 */
export function canSafelyInvoke(
  paradoxType: keyof typeof PARADOX_TYPES,
  currentSanity: number,
  unlockedNodes: Set<string>
): boolean {
  const cost = calculateSanityCost(paradoxType, unlockedNodes, 0);
  return currentSanity > cost * 2; // Safety margin
}

/**
 * Get available paradox types based on unlocked nodes.
 */
export function getAvailableParadoxes(unlockedNodes: Set<string>): string[] {
  const paradoxes: string[] = [];
  if (unlockedNodes.has('liar-paradox')) paradoxes.push('liar', 'barber', 'raven');
  if (unlockedNodes.has('bootstrap-paradox')) paradoxes.push('bootstrap', 'ship');
  if (unlockedNodes.has('omnipotence-paradox')) paradoxes.push('omnipotence', 'zeno');
  if (unlockedNodes.has('existence-paradox')) paradoxes.push('grandfather');
  return paradoxes;
}
