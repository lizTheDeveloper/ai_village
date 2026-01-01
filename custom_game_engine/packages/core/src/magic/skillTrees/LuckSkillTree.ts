/**
 * LuckSkillTree - Skill tree for the Luck paradigm
 *
 * Key mechanics:
 * - Luck Borrowing (take luck from future)
 * - Luck Stealing (take luck from others)
 * - Probability Manipulation (adjust odds)
 * - Karma Debt (accumulated misfortune)
 * - Lucky Charms (store luck in objects)
 * - Fate Gambling (high-risk, high-reward magic)
 *
 * Core concept:
 * - Luck is a finite resource in your timeline
 * - Borrow from tomorrow for power today
 * - But the debt ALWAYS comes due
 *
 * Risks:
 * - Catastrophic bad luck payback
 * - Fate backlash
 * - Karmic debt collectors
 * - Permanent luck damage
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

const PARADIGM_ID = 'luck_magic';

/** Types of luck that can be manipulated */
export const LUCK_TYPES = {
  fortune: 'General good outcomes',
  survival: 'Avoid death and injury',
  discovery: 'Find valuable things',
  social: 'People like and help you',
  combat: 'Hit when it matters, dodge when needed',
  timing: 'Be in the right place at the right time',
  creative: 'Inspiration and insight',
} as const;

/** Probability thresholds */
export const PROBABILITY_TIERS = {
  impossible: 0.001,
  miracle: 0.01,
  unlikely: 0.1,
  possible: 0.25,
  likely: 0.5,
  probable: 0.75,
  certain: 0.99,
} as const;

/** Karma debt levels */
export const KARMA_LEVELS = {
  balanced: 'No debt - luck flows naturally',
  minor: 'Small misfortunes incoming',
  moderate: 'Significant bad luck approaching',
  severe: 'Catastrophic events likely',
  critical: 'Reality actively conspiring against you',
  doomed: 'Beyond redemption - fate has marked you',
} as const;

// ============================================================================
// Foundation Nodes - Luck Awareness
// ============================================================================

const LUCK_SENSE_NODE = createSkillNode(
  'luck-sense',
  'Luck Sense',
  PARADIGM_ID,
  'foundation',
  0,
  25,
  [
    createSkillEffect('perception', 10, {
      description: 'Sense the flow of luck around you',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'luck_perception' },
      description: 'Perceive probability currents',
    }),
  ],
  {
    description: 'Learn to sense the currents of luck',
    lore: `Luck isn't random - it flows. Like a river, with currents and eddies.
The lucky learn to feel these flows, to sense when fortune gathers
and when it drains away. This sense is the first gift.`,
    maxLevel: 3,
    levelCostMultiplier: 1.3,
    icon: '🍀',
  }
);

const SMALL_FAVOR_NODE = createSkillNode(
  'small-favor',
  'Small Favors',
  PARADIGM_ID,
  'foundation',
  0,
  20,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'minor_luck' },
      description: 'Small luck boosts for minor situations',
    }),
  ],
  {
    description: 'Learn to nudge luck in small ways',
    lore: `Start small. Find the lost key. Avoid the puddle. Catch the bus.
These tiny manipulations teach the feel of luck without the danger.
Everyone starts with small favors.`,
    maxLevel: 5,
    levelCostMultiplier: 1.2,
    icon: '✨',
  }
);

const KARMA_AWARENESS_NODE = createSkillNode(
  'karma-awareness',
  'Karma Awareness',
  PARADIGM_ID,
  'foundation',
  0,
  30,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'karma_sense' },
      description: 'Sense your karmic debt level',
    }),
  ],
  {
    description: 'Learn to perceive your karmic debt',
    lore: `For every lucky break, misfortune waits. The universe keeps accounts.
Learning to sense your debt is crucial - too deep in the red
and fate itself hunts you down.`,
    icon: '⚖️',
  }
);

// ============================================================================
// Luck Borrowing Nodes
// ============================================================================

const BORROW_LUCK_NODE = createSkillNode(
  'borrow-luck',
  'Borrow Luck',
  PARADIGM_ID,
  'technique',
  1,
  50,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'luck_borrow' },
      description: 'Borrow luck from your future',
    }),
  ],
  {
    description: 'Learn to borrow luck from your future self',
    lore: `Your timeline contains a finite amount of luck. Most is spread evenly.
But you can concentrate it - pull luck from tomorrow to use today.
Tomorrow will be... unluckier. That's the price.`,
    prerequisites: ['small-favor'],
    icon: '⏳',
  }
);

const DEEP_BORROWING_NODE = createSkillNode(
  'deep-borrowing',
  'Deep Borrowing',
  PARADIGM_ID,
  'technique',
  2,
  80,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'deep_borrow' },
      description: 'Borrow luck from distant future',
    }),
    createSkillEffect('resource_max', 20, {
      description: 'Increased borrowing capacity',
    }),
  ],
  {
    description: 'Learn to borrow from further in the future',
    lore: `Why stop at tomorrow? Borrow from next week. Next month. Next year.
The further you reach, the more you can take. But debts compound.
A decade of luck spent today means a decade of misery later.`,
    prerequisites: ['borrow-luck'],
    maxLevel: 3,
    levelCostMultiplier: 1.5,
    icon: '📅',
  }
);

const INTEREST_REDUCTION_NODE = createSkillNode(
  'interest-reduction',
  'Interest Reduction',
  PARADIGM_ID,
  'efficiency',
  2,
  90,
  [
    createSkillEffect('cost_reduction', 20, {
      perLevelValue: 10,
      description: 'Reduced karma debt from borrowing',
      target: { resourceType: 'luck' },
    }),
  ],
  {
    description: 'Learn to reduce the karmic cost of borrowing',
    lore: `The universe charges interest on borrowed luck. But there are tricks.
Spread the debt. Delay the payment. Find loopholes in fate's accounting.
Masters of luck borrow more while paying less.`,
    prerequisites: ['karma-awareness', 'borrow-luck'],
    maxLevel: 5,
    levelCostMultiplier: 1.4,
    icon: '📉',
  }
);

// ============================================================================
// Luck Manipulation Nodes
// ============================================================================

const PROBABILITY_NUDGE_NODE = createSkillNode(
  'probability-nudge',
  'Probability Nudge',
  PARADIGM_ID,
  'technique',
  1,
  60,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'nudge_probability' },
      description: 'Slightly adjust probability in your favor',
    }),
  ],
  {
    description: 'Learn to nudge probability in your favor',
    lore: `A coin flip becomes 55/45. A die roll favors you slightly.
Small nudges, barely noticeable, but they add up.
This is the subtle art of luck manipulation.`,
    prerequisites: ['luck-sense'],
    maxLevel: 3,
    levelCostMultiplier: 1.4,
    icon: '🎲',
  }
);

const IMPROBABLE_SUCCESS_NODE = createSkillNode(
  'improbable-success',
  'Improbable Success',
  PARADIGM_ID,
  'technique',
  2,
  100,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'improbable_success' },
      description: 'Make unlikely outcomes happen',
    }),
  ],
  {
    description: 'Learn to make unlikely outcomes occur',
    lore: `The arrow that shouldn't have hit. The trap that shouldn't have missed.
At this level, you can reach into probability and pull out miracles.
But miracles have costs.`,
    prerequisites: ['probability-nudge', 'borrow-luck'],
    icon: '🎯',
  }
);

const MIRACLE_WORKER_NODE = createSkillNode(
  'miracle-worker',
  'Miracle Worker',
  PARADIGM_ID,
  'mastery',
  4,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'work_miracle' },
      description: 'Make the impossible possible',
    }),
  ],
  {
    description: 'Learn to achieve the statistically impossible',
    lore: `One in a million? Done. One in a billion? Difficult but doable.
At this level, probability is merely a suggestion.
But impossible luck creates impossible debt.`,
    prerequisites: ['improbable-success', 'deep-borrowing'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 700 },
        'Requires 700 total XP in Luck magic'
      ),
    ],
    conditionMode: 'all',
    icon: '🌟',
  }
);

// ============================================================================
// Luck Stealing Nodes
// ============================================================================

const LUCK_SIPHON_NODE = createSkillNode(
  'luck-siphon',
  'Luck Siphon',
  PARADIGM_ID,
  'technique',
  2,
  80,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'siphon_luck' },
      description: 'Drain luck from others',
    }),
  ],
  {
    description: 'Learn to siphon luck from others',
    lore: `Why borrow from yourself when others have luck to spare?
The unlucky don't notice a little less. The lucky barely feel the drain.
But steal too much and they'll feel the curse.`,
    prerequisites: ['borrow-luck', 'luck-sense'],
    icon: '🧲',
  }
);

const LUCK_TRANSFER_NODE = createSkillNode(
  'luck-transfer',
  'Luck Transfer',
  PARADIGM_ID,
  'technique',
  3,
  120,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'transfer_luck' },
      description: 'Transfer luck between entities',
    }),
  ],
  {
    description: 'Learn to transfer luck between beings',
    lore: `Take from the rich, give to the poor. Or the reverse.
Luck can flow between people like water between vessels.
Control the flow and you control fortune itself.`,
    prerequisites: ['luck-siphon'],
    icon: '↔️',
  }
);

const JINX_NODE = createSkillNode(
  'jinx',
  'Jinx',
  PARADIGM_ID,
  'technique',
  2,
  70,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'jinx_target' },
      description: 'Curse others with bad luck',
    }),
  ],
  {
    description: 'Learn to curse others with misfortune',
    lore: `The evil eye. The hex. The jinx. Many names for the same thing:
deliberately pushing bad luck onto others. Their stumbles become yours
to harvest. Their misfortune feeds your fortune.`,
    prerequisites: ['luck-siphon'],
    icon: '🧿',
  }
);

// ============================================================================
// Lucky Charm Nodes
// ============================================================================

const LUCKY_CHARM_NODE = createSkillNode(
  'lucky-charm',
  'Lucky Charm',
  PARADIGM_ID,
  'specialization',
  1,
  50,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'create_charm' },
      description: 'Create objects that store luck',
    }),
  ],
  {
    description: 'Learn to create lucky charms',
    lore: `Luck can be stored. A rabbit's foot. A four-leaf clover. A penny.
These talismans hold luck until needed, a reserve for emergencies.
Every luck mage carries several, just in case.`,
    prerequisites: ['small-favor'],
    icon: '🔮',
  }
);

const CHARM_MASTERY_NODE = createSkillNode(
  'charm-mastery',
  'Charm Mastery',
  PARADIGM_ID,
  'specialization',
  2,
  90,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'master_charm' },
      description: 'Create powerful lucky artifacts',
    }),
    createSkillEffect('resource_max', 30, {
      description: 'Charms hold more luck',
    }),
  ],
  {
    description: 'Master the creation of lucky artifacts',
    lore: `A master charm-maker creates legendary talismans.
Objects that change history. Heirlooms passed down generations.
Each contains enough luck to change a life.`,
    prerequisites: ['lucky-charm', 'borrow-luck'],
    maxLevel: 3,
    levelCostMultiplier: 1.5,
    icon: '💎',
  }
);

// ============================================================================
// Karma Management Nodes
// ============================================================================

const KARMA_PAYMENT_NODE = createSkillNode(
  'karma-payment',
  'Karma Payment',
  PARADIGM_ID,
  'technique',
  2,
  75,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'pay_karma' },
      description: 'Deliberately experience bad luck to reduce debt',
    }),
  ],
  {
    description: 'Learn to pay down karmic debt on your terms',
    lore: `Better to choose your misfortune than have fate choose for you.
Stub your toe on purpose. Miss the bus deliberately. Small payments
prevent catastrophic collections.`,
    prerequisites: ['karma-awareness'],
    icon: '💰',
  }
);

const KARMA_SHIELD_NODE = createSkillNode(
  'karma-shield',
  'Karma Shield',
  PARADIGM_ID,
  'specialization',
  3,
  130,
  [
    createSkillEffect('defense', 20, {
      description: 'Protection from karmic backlash',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'karma_shield' },
      description: 'Temporarily shield from karma collection',
    }),
  ],
  {
    description: 'Learn to shield yourself from karmic collection',
    lore: `Delay the inevitable. When fate comes calling, you can hide.
The shield buys time - time to prepare, time to find solutions.
But the debt grows behind it, and shields don't last forever.`,
    prerequisites: ['karma-payment', 'interest-reduction'],
    icon: '🔰',
  }
);

// ============================================================================
// Mastery Nodes
// ============================================================================

const FATE_GAMBLER_NODE = createSkillNode(
  'fate-gambler',
  'Fate Gambler',
  PARADIGM_ID,
  'mastery',
  4,
  180,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'fate_gamble' },
      description: 'Gamble with fate itself',
    }),
    createSkillEffect('paradigm_proficiency', 25, {
      description: 'Bonus to luck magic',
    }),
  ],
  {
    description: 'Learn to gamble directly with fate',
    lore: `Double or nothing. All or nothing. The ultimate gamble.
Stake everything on a coin flip with the universe itself.
Win and gain impossible power. Lose and lose everything.`,
    prerequisites: ['miracle-worker', 'karma-shield'],
    icon: '🎰',
  }
);

const LUCK_THIEF_NODE = createSkillNode(
  'luck-thief',
  'Master Luck Thief',
  PARADIGM_ID,
  'mastery',
  4,
  160,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'mass_luck_theft' },
      description: 'Steal luck from entire groups',
    }),
  ],
  {
    description: 'Become a master thief of fortune',
    lore: `Why steal from one when you can steal from many?
A little luck from everyone in a crowd adds up to a fortune.
Cities grow unlucky when you pass through.`,
    prerequisites: ['luck-transfer', 'jinx'],
    icon: '🎭',
  }
);

const PROBABILITY_ZERO_NODE = createSkillNode(
  'probability-zero',
  'Probability Zero',
  PARADIGM_ID,
  'mastery',
  5,
  300,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'probability_zero' },
      description: 'Make events have zero probability',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'probability_one' },
      description: 'Make events have 100% probability',
    }),
  ],
  {
    description: 'Master absolute probability manipulation',
    lore: `This cannot happen. This WILL happen. At the pinnacle of luck magic,
probability becomes determinism. Certainty is yours to command.
But absolute luck requires absolute payment.`,
    prerequisites: ['fate-gambler', 'luck-thief'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 1200 },
        'Requires 1200 total XP in Luck magic'
      ),
    ],
    conditionMode: 'all',
    icon: '∞',
  }
);

// ============================================================================
// Collect All Nodes
// ============================================================================

const ALL_NODES: MagicSkillNode[] = [
  // Foundation
  LUCK_SENSE_NODE,
  SMALL_FAVOR_NODE,
  KARMA_AWARENESS_NODE,
  // Borrowing
  BORROW_LUCK_NODE,
  DEEP_BORROWING_NODE,
  INTEREST_REDUCTION_NODE,
  // Manipulation
  PROBABILITY_NUDGE_NODE,
  IMPROBABLE_SUCCESS_NODE,
  MIRACLE_WORKER_NODE,
  // Stealing
  LUCK_SIPHON_NODE,
  LUCK_TRANSFER_NODE,
  JINX_NODE,
  // Charms
  LUCKY_CHARM_NODE,
  CHARM_MASTERY_NODE,
  // Karma
  KARMA_PAYMENT_NODE,
  KARMA_SHIELD_NODE,
  // Mastery
  FATE_GAMBLER_NODE,
  LUCK_THIEF_NODE,
  PROBABILITY_ZERO_NODE,
];

// ============================================================================
// XP Sources
// ============================================================================

const XP_SOURCES: MagicXPSource[] = [
  {
    eventType: 'luck_borrowed',
    xpAmount: 8,
    description: 'Borrow luck from your future',
  },
  {
    eventType: 'probability_changed',
    xpAmount: 10,
    description: 'Successfully manipulate probability',
    qualityMultiplier: true,
  },
  {
    eventType: 'luck_stolen',
    xpAmount: 12,
    description: 'Steal luck from another',
  },
  {
    eventType: 'charm_created',
    xpAmount: 15,
    description: 'Create a lucky charm',
  },
  {
    eventType: 'karma_paid',
    xpAmount: 5,
    description: 'Pay down karmic debt',
  },
  {
    eventType: 'improbable_success',
    xpAmount: 20,
    description: 'Achieve an improbable outcome',
  },
  {
    eventType: 'survived_backlash',
    xpAmount: 25,
    description: 'Survive a karmic backlash',
  },
];

// ============================================================================
// Tree Definition
// ============================================================================

export const LUCK_SKILL_TREE: MagicSkillTree = {
  id: 'luck_skill_tree',
  paradigmId: PARADIGM_ID,
  name: 'Luck Magic Skill Tree',
  description: 'Master the art of probability manipulation and temporal luck borrowing',
  lore: `Luck is not chance - it is a resource. Your timeline holds a finite amount.
Most spread it evenly across their days. You can concentrate it.
Borrow from tomorrow, steal from others, or gamble with fate itself.
But remember: every lucky break creates an unlucky debt.`,
  nodes: ALL_NODES,
  entryNodes: ['luck-sense', 'small-favor', 'karma-awareness'],
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
 * Calculate karma debt level.
 */
export function getKarmaLevel(karmaDebt: number): keyof typeof KARMA_LEVELS {
  if (karmaDebt <= 0) return 'balanced';
  if (karmaDebt <= 50) return 'minor';
  if (karmaDebt <= 150) return 'moderate';
  if (karmaDebt <= 300) return 'severe';
  if (karmaDebt <= 500) return 'critical';
  return 'doomed';
}

/**
 * Calculate probability adjustment power.
 */
export function getProbabilityAdjustment(unlockedNodes: Set<string>, baseLevel: number): number {
  let adjustment = 0.05 * baseLevel; // Base 5% per level
  if (unlockedNodes.has('probability-nudge')) adjustment += 0.1;
  if (unlockedNodes.has('improbable-success')) adjustment += 0.2;
  if (unlockedNodes.has('miracle-worker')) adjustment += 0.3;
  return Math.min(adjustment, 0.9); // Cap at 90% adjustment
}

/**
 * Calculate luck borrowing capacity.
 */
export function getBorrowingCapacity(unlockedNodes: Set<string>): number {
  let capacity = 10; // Base capacity
  if (unlockedNodes.has('borrow-luck')) capacity += 20;
  if (unlockedNodes.has('deep-borrowing')) capacity += 50;
  return capacity;
}

/**
 * Calculate karma interest rate.
 */
export function getKarmaInterestRate(unlockedNodes: Set<string>, interestReductionLevel: number): number {
  const baseRate = 0.15; // 15% daily compound
  const reduction = unlockedNodes.has('interest-reduction') ? interestReductionLevel * 0.02 : 0;
  return Math.max(baseRate - reduction, 0.01); // Minimum 1%
}

/**
 * Calculate charm storage capacity.
 */
export function getCharmCapacity(unlockedNodes: Set<string>, charmMasteryLevel: number): number {
  if (!unlockedNodes.has('lucky-charm')) return 0;
  const base = 20;
  const mastery = unlockedNodes.has('charm-mastery') ? charmMasteryLevel * 15 : 0;
  return base + mastery;
}
