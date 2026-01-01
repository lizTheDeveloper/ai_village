/**
 * GameSkillTree - Skill tree for the Game paradigm
 *
 * Key mechanics:
 * - Wager Magic (bet for magical effects)
 * - Rule Binding (create enforceable game rules)
 * - Challenge (force opponents into game scenarios)
 * - Victory Claiming (power from winning)
 * - Stakes Management (control what's wagered)
 * - Eternal Games (games that never end)
 *
 * Core concept:
 * - Agreements create binding magic
 * - Stakes determine power
 * - Cheaters face magical punishment
 * - Win fairly, claim your prize
 *
 * Risks:
 * - Losing stakes
 * - Eternal game traps
 * - Anti-cheat backlash
 * - Game addiction
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

const PARADIGM_ID = 'game_magic';

/** Types of games that can be invoked */
export const GAME_TYPES = {
  chance: 'Games of pure luck - dice, cards',
  skill: 'Games of pure skill - chess, strategy',
  mixed: 'Combination of luck and skill',
  riddle: 'Games of wit and knowledge',
  physical: 'Games of athletic prowess',
  social: 'Games of deception and reading people',
  meta: 'Games about games - recursive challenges',
} as const;

/** Types of stakes that can be wagered */
export const STAKE_TYPES = {
  material: 'Physical objects',
  service: 'Actions or labor',
  time: 'Hours or years of life',
  memory: 'Specific memories',
  ability: 'Skills or powers',
  emotion: 'Feelings or relationships',
  name: 'Your true name',
  soul: 'The ultimate stake',
} as const;

/** Victory power multipliers */
export const VICTORY_MULTIPLIERS = {
  trivial: 1.0,
  minor: 1.5,
  significant: 2.0,
  major: 3.0,
  legendary: 5.0,
  impossible: 10.0,
} as const;

// ============================================================================
// Foundation Nodes - Game Awareness
// ============================================================================

const GAME_SENSE_NODE = createSkillNode(
  'game-sense',
  'Game Sense',
  PARADIGM_ID,
  'foundation',
  0,
  25,
  [
    createSkillEffect('perception', 10, {
      description: 'Sense when games carry magical weight',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'detect_wager' },
      description: 'Detect magical wagers and bindings',
    }),
  ],
  {
    description: 'Learn to sense magical potential in games',
    lore: `Every game has stakes. Most are mundane. But some games shimmer
with potential - where the universe itself is paying attention.
Learn to spot these moments.`,
    maxLevel: 3,
    levelCostMultiplier: 1.3,
    icon: '🎮',
  }
);

const FAIR_PLAY_NODE = createSkillNode(
  'fair-play',
  'Fair Play',
  PARADIGM_ID,
  'foundation',
  0,
  30,
  [
    createSkillEffect('defense', 15, {
      description: 'Protected from cheating accusations',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'fair_play_aura' },
      description: 'Radiate fairness - opponents trust your honesty',
    }),
  ],
  {
    description: 'Learn the sacred art of fair play',
    lore: `Game magic punishes cheaters harshly. The first lesson is simple:
play fair. Those who cheat at magical games lose more than the game.
Fair play isn't weakness - it's survival.`,
    icon: '⚖️',
  }
);

const RULE_UNDERSTANDING_NODE = createSkillNode(
  'rule-understanding',
  'Rule Understanding',
  PARADIGM_ID,
  'foundation',
  0,
  25,
  [
    createSkillEffect('paradigm_proficiency', 5, {
      perLevelValue: 3,
      description: 'Bonus to game magic',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'rule_mastery' },
      description: 'Instantly understand any game\'s rules',
    }),
  ],
  {
    description: 'Learn to instantly comprehend game rules',
    lore: `Rules are the skeleton of game magic. Know them perfectly.
Every loophole, every edge case, every technical interpretation.
Master the rules and you master the game.`,
    maxLevel: 5,
    levelCostMultiplier: 1.3,
    icon: '📜',
  }
);

// ============================================================================
// Wager Nodes
// ============================================================================

const MINOR_WAGER_NODE = createSkillNode(
  'minor-wager',
  'Minor Wager',
  PARADIGM_ID,
  'technique',
  1,
  40,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'minor_wager' },
      description: 'Create small magical wagers',
    }),
  ],
  {
    description: 'Learn to create small magical wagers',
    lore: `"I bet you a drink I can make that shot." Simple words, but with
game magic, they bind. The loser MUST pay. Start small.
Learn the weight of wagered words.`,
    prerequisites: ['game-sense'],
    icon: '🎲',
  }
);

const MAJOR_WAGER_NODE = createSkillNode(
  'major-wager',
  'Major Wager',
  PARADIGM_ID,
  'technique',
  2,
  80,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'major_wager' },
      description: 'Create significant magical wagers',
    }),
  ],
  {
    description: 'Learn to create major magical wagers',
    lore: `Bet your house. Bet your horse. Bet years of service.
Major wagers carry major power - victory grants proportional reward.
But losing means losing everything wagered.`,
    prerequisites: ['minor-wager'],
    icon: '💎',
  }
);

const ULTIMATE_STAKES_NODE = createSkillNode(
  'ultimate-stakes',
  'Ultimate Stakes',
  PARADIGM_ID,
  'mastery',
  4,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'ultimate_wager' },
      description: 'Wager souls, names, and existence itself',
    }),
  ],
  {
    description: 'Learn to wager the ultimate stakes',
    lore: `"I bet my soul." Three words that shake reality. Stakes this high
attract attention from things that collect souls. The power offered
is immense. The risk is everything.`,
    prerequisites: ['major-wager'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 700 },
        'Requires 700 total XP in Game magic'
      ),
    ],
    conditionMode: 'all',
    icon: '👻',
  }
);

// ============================================================================
// Challenge Nodes
// ============================================================================

const ISSUE_CHALLENGE_NODE = createSkillNode(
  'issue-challenge',
  'Issue Challenge',
  PARADIGM_ID,
  'technique',
  1,
  50,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'challenge' },
      description: 'Issue binding magical challenges',
    }),
  ],
  {
    description: 'Learn to issue binding challenges',
    lore: `"I challenge you." When spoken with power, this cannot be ignored.
The challenged must respond - accept, decline, or propose counter-terms.
Declining carries its own costs.`,
    prerequisites: ['fair-play'],
    icon: '⚔️',
  }
);

const COMPULSORY_CHALLENGE_NODE = createSkillNode(
  'compulsory-challenge',
  'Compulsory Challenge',
  PARADIGM_ID,
  'technique',
  2,
  90,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'compulsory_challenge' },
      description: 'Issue challenges that cannot be declined',
    }),
  ],
  {
    description: 'Learn to issue undeniable challenges',
    lore: `Some challenges cannot be refused. The magic binds before consent.
The challenged must play - flight is not an option.
Use this power sparingly; it makes enemies.`,
    prerequisites: ['issue-challenge'],
    unlockConditions: [
      createUnlockCondition(
        'nodes_unlocked',
        { nodesRequired: 5 },
        'Requires 5 nodes unlocked'
      ),
    ],
    conditionMode: 'all',
    icon: '🔒',
  }
);

const CHAMPION_NODE = createSkillNode(
  'champion',
  'Champion',
  PARADIGM_ID,
  'specialization',
  2,
  85,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'designate_champion' },
      description: 'Choose a champion to play for you',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'be_champion' },
      description: 'Be a champion for others',
    }),
  ],
  {
    description: 'Learn to use and be a champion',
    lore: `Not all challenges must be faced personally. Designate a champion
to play in your stead. Their victory is yours. Their loss... also yours.
Champions carry heavy burdens.`,
    prerequisites: ['issue-challenge'],
    icon: '🏆',
  }
);

// ============================================================================
// Rule Manipulation Nodes
// ============================================================================

const RULE_CREATION_NODE = createSkillNode(
  'rule-creation',
  'Rule Creation',
  PARADIGM_ID,
  'technique',
  2,
  100,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'create_rules' },
      description: 'Create new game rules that bind',
    }),
  ],
  {
    description: 'Learn to create binding game rules',
    lore: `"Within this circle, no lies may be spoken." A new rule, magically
enforced. Create the game, create the rules, control the outcome.
But rules bind the maker too.`,
    prerequisites: ['rule-understanding'],
    icon: '📝',
  }
);

const LOOPHOLE_FINDER_NODE = createSkillNode(
  'loophole-finder',
  'Loophole Finder',
  PARADIGM_ID,
  'specialization',
  2,
  75,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'find_loophole' },
      description: 'Find exploitable gaps in game rules',
    }),
    createSkillEffect('perception', 15, {
      description: 'Detect rule ambiguities',
    }),
  ],
  {
    description: 'Learn to find loopholes in rules',
    lore: `Every rule has exceptions. Every system has gaps. The loophole finder
sees them all. Not cheating - creative interpretation.
The rules as written, not as intended.`,
    prerequisites: ['rule-understanding'],
    icon: '🔍',
  }
);

const RULE_BENDING_NODE = createSkillNode(
  'rule-bending',
  'Rule Bending',
  PARADIGM_ID,
  'technique',
  3,
  130,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'bend_rules' },
      description: 'Stretch rules to their breaking point',
    }),
  ],
  {
    description: 'Learn to bend rules without breaking them',
    lore: `Rules can flex. Push them to their limits without snapping them.
Walk the line between fair and foul. The letter of the law,
not the spirit. But bend too far and they break - taking you with them.`,
    prerequisites: ['rule-creation', 'loophole-finder'],
    icon: '〰️',
  }
);

// ============================================================================
// Victory Nodes
// ============================================================================

const VICTORY_SURGE_NODE = createSkillNode(
  'victory-surge',
  'Victory Surge',
  PARADIGM_ID,
  'technique',
  1,
  55,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'victory_surge' },
      description: 'Gain temporary power from victories',
    }),
  ],
  {
    description: 'Learn to draw power from victories',
    lore: `Victory energizes. The moment of triumph floods you with power.
Learn to channel this surge, to store it, to use it.
Winners keep winning for a reason.`,
    prerequisites: ['game-sense'],
    maxLevel: 3,
    levelCostMultiplier: 1.4,
    icon: '⚡',
  }
);

const WINNING_STREAK_NODE = createSkillNode(
  'winning-streak',
  'Winning Streak',
  PARADIGM_ID,
  'specialization',
  2,
  90,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'winning_streak' },
      description: 'Consecutive wins amplify power',
    }),
    createSkillEffect('paradigm_proficiency', 10, {
      perLevelValue: 5,
      description: 'Bonus from maintained streaks',
    }),
  ],
  {
    description: 'Learn to amplify power through winning streaks',
    lore: `One win is power. Two wins is more. Three, four, five - the power
compounds. A winning streak becomes unstoppable momentum.
But one loss ends it all.`,
    prerequisites: ['victory-surge'],
    maxLevel: 5,
    levelCostMultiplier: 1.5,
    icon: '🔥',
  }
);

const CLAIM_PRIZE_NODE = createSkillNode(
  'claim-prize',
  'Claim Prize',
  PARADIGM_ID,
  'technique',
  2,
  85,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'claim_prize' },
      description: 'Magically enforce collection of winnings',
    }),
  ],
  {
    description: 'Learn to magically collect winnings',
    lore: `A bet won is a bet owed. If the loser won't pay, take it.
The magic enforces. Wagered objects appear in your hands.
Wagered services compel the debtor.`,
    prerequisites: ['minor-wager', 'victory-surge'],
    icon: '🎁',
  }
);

// ============================================================================
// Advanced Nodes
// ============================================================================

const ETERNAL_GAME_NODE = createSkillNode(
  'eternal-game',
  'Eternal Game',
  PARADIGM_ID,
  'mastery',
  4,
  180,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'eternal_game' },
      description: 'Create games that never end',
    }),
  ],
  {
    description: 'Learn to create eternal games',
    lore: `Some games have no end. Chess matches that span centuries.
Card games played across generations. Trap an enemy in an eternal game
and they're trapped forever. But someone must play opposite them...`,
    prerequisites: ['compulsory-challenge', 'rule-creation'],
    icon: '♾️',
  }
);

const GAME_MASTER_NODE = createSkillNode(
  'game-master',
  'Game Master',
  PARADIGM_ID,
  'mastery',
  4,
  200,
  [
    createSkillEffect('paradigm_proficiency', 30, {
      description: 'Supreme game magic mastery',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'game_master' },
      description: 'Become the master of all games',
    }),
  ],
  {
    description: 'Achieve mastery over all games',
    lore: `You have played and won more games than can be counted.
Every type, every form, every variant. You are the Game Master now.
You set the rules. You design the challenges. Reality plays by your game.`,
    prerequisites: ['rule-bending', 'winning-streak'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 800 },
        'Requires 800 total XP in Game magic'
      ),
    ],
    conditionMode: 'all',
    icon: '👑',
  }
);

const REALITY_GAME_NODE = createSkillNode(
  'reality-game',
  'Reality Game',
  PARADIGM_ID,
  'mastery',
  5,
  300,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'reality_game' },
      description: 'Make reality itself the game board',
    }),
    createSkillEffect('paradigm_proficiency', 50, {
      description: 'Ultimate game mastery',
    }),
  ],
  {
    description: 'Transform reality into a game',
    lore: `What if life itself were a game? What if the universe followed
game rules? At the pinnacle of game magic, you can make it so.
Declare the rules. Set the stakes. Play for everything.`,
    prerequisites: ['game-master', 'eternal-game', 'ultimate-stakes'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 1200 },
        'Requires 1200 total XP in Game magic'
      ),
    ],
    conditionMode: 'all',
    icon: '🌍',
  }
);

// ============================================================================
// Collect All Nodes
// ============================================================================

const ALL_NODES: MagicSkillNode[] = [
  // Foundation
  GAME_SENSE_NODE,
  FAIR_PLAY_NODE,
  RULE_UNDERSTANDING_NODE,
  // Wagers
  MINOR_WAGER_NODE,
  MAJOR_WAGER_NODE,
  ULTIMATE_STAKES_NODE,
  // Challenges
  ISSUE_CHALLENGE_NODE,
  COMPULSORY_CHALLENGE_NODE,
  CHAMPION_NODE,
  // Rules
  RULE_CREATION_NODE,
  LOOPHOLE_FINDER_NODE,
  RULE_BENDING_NODE,
  // Victory
  VICTORY_SURGE_NODE,
  WINNING_STREAK_NODE,
  CLAIM_PRIZE_NODE,
  // Mastery
  ETERNAL_GAME_NODE,
  GAME_MASTER_NODE,
  REALITY_GAME_NODE,
];

// ============================================================================
// XP Sources
// ============================================================================

const XP_SOURCES: MagicXPSource[] = [
  {
    eventType: 'game_won',
    xpAmount: 15,
    description: 'Win a magical game',
    qualityMultiplier: true,
  },
  {
    eventType: 'wager_created',
    xpAmount: 8,
    description: 'Create a magical wager',
  },
  {
    eventType: 'challenge_issued',
    xpAmount: 10,
    description: 'Issue a binding challenge',
  },
  {
    eventType: 'prize_claimed',
    xpAmount: 12,
    description: 'Claim winnings from a game',
  },
  {
    eventType: 'streak_maintained',
    xpAmount: 5,
    description: 'Maintain a winning streak',
  },
  {
    eventType: 'rule_created',
    xpAmount: 15,
    description: 'Create a new binding rule',
  },
  {
    eventType: 'fair_play_rewarded',
    xpAmount: 10,
    description: 'Rewarded for playing fairly',
  },
];

// ============================================================================
// Tree Definition
// ============================================================================

export const GAME_SKILL_TREE: MagicSkillTree = {
  id: 'game_skill_tree',
  paradigmId: PARADIGM_ID,
  name: 'Game Magic Skill Tree',
  description: 'Master the art of magical wagers, challenges, and binding games',
  lore: `Agree to the rules and reality enforces them. Bet your soul in a card game
and you will lose it if you lose. Cheat and the game itself punishes you.
But win fairly and claim your prize. Every game is an opportunity.`,
  nodes: ALL_NODES,
  entryNodes: ['game-sense', 'fair-play', 'rule-understanding'],
  connections: ALL_NODES.flatMap(node =>
    (node.prerequisites ?? []).map(prereq => ({ from: prereq, to: node.id }))
  ),
  xpSources: XP_SOURCES,
  rules: {
    ...createDefaultTreeRules(false),
    allowRespec: false, // Can't take back victories/losses
    permanentProgress: true,
  },
  version: 1,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate power from stakes.
 */
export function calculateStakePower(stakeType: keyof typeof STAKE_TYPES, amount: number): number {
  const baseValues: Record<keyof typeof STAKE_TYPES, number> = {
    material: 1,
    service: 3,
    time: 5,
    memory: 8,
    ability: 15,
    emotion: 10,
    name: 50,
    soul: 100,
  };
  return baseValues[stakeType] * amount;
}

/**
 * Calculate victory multiplier based on difficulty.
 */
export function getVictoryMultiplier(
  difficulty: keyof typeof VICTORY_MULTIPLIERS,
  winningStreakLength: number
): number {
  const base = VICTORY_MULTIPLIERS[difficulty];
  const streakBonus = 1 + (winningStreakLength * 0.1);
  return base * streakBonus;
}

/**
 * Check if a challenge can be declined.
 */
export function canDeclineChallenge(_unlockedNodes: Set<string>, isCompulsory: boolean): boolean {
  if (!isCompulsory) return true;
  // TODO: Compulsory challenges can be declined with special abilities (check _unlockedNodes)
  return false;
}

/**
 * Get available game types based on unlocked nodes.
 */
export function getAvailableGameTypes(unlockedNodes: Set<string>): string[] {
  const games = ['chance', 'skill', 'mixed'];
  if (unlockedNodes.has('rule-creation')) games.push('riddle', 'physical');
  if (unlockedNodes.has('loophole-finder')) games.push('social');
  if (unlockedNodes.has('game-master')) games.push('meta');
  return games;
}

/**
 * Calculate streak bonus.
 */
export function getStreakBonus(streakLength: number, maxLevel: number): number {
  const effectiveStreak = Math.min(streakLength, maxLevel * 3);
  return 1 + (effectiveStreak * 0.15);
}
