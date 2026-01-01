/**
 * DebtSkillTree - Skill tree for the Debt paradigm (Fae-style)
 *
 * Key mechanics:
 * - Favor Collection (being owed grants power)
 * - Debt Trading (transferring obligations)
 * - Binding Oaths (creating magical contracts)
 * - Debt Calling (forcing payment)
 * - Interest (debts grow over time)
 * - Bankruptcy (catastrophic debt collapse)
 *
 * Core concept:
 * - Being OWED is power, not owing
 * - Debts are currency you can spend
 * - All agreements are magically binding
 *
 * Risks:
 * - Debts called unexpectedly
 * - Social ruin from over-leveraging
 * - Bound by your own oaths
 * - Cosmic debt collectors
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

const PARADIGM_ID = 'debt_magic';

/** Types of debts that can be collected */
export const DEBT_TYPES = {
  favor: 'A promise to do something later',
  service: 'An action owed',
  gift: 'An object owed',
  secret: 'Information owed',
  protection: 'Safety owed',
  loyalty: 'Allegiance owed',
  time: 'Time/lifespan owed',
  soul: 'The ultimate debt',
} as const;

/** Ways debts can be created */
export const DEBT_CREATION = {
  gift: 'Give something freely - creates obligation',
  rescue: 'Save someone - they owe you',
  bargain: 'Negotiate explicit terms',
  name: 'Use true name to create binding',
  witness: 'Third party confirms the debt',
  blood: 'Blood oath - unbreakable',
  hospitality: 'Accept hospitality - become indebted',
} as const;

/** Interest rates on debts */
export const INTEREST_RATES = {
  none: 0,
  minor: 0.1,
  standard: 0.25,
  usury: 0.5,
  compound: 1.0,
} as const;

// ============================================================================
// Foundation Nodes - Basic Debt Awareness
// ============================================================================

const DEBT_SENSE_NODE = createSkillNode(
  'debt-sense',
  'Debt Sense',
  PARADIGM_ID,
  'foundation',
  0,
  25,
  [
    createSkillEffect('perception', 10, {
      description: 'Sense when someone owes you or you owe them',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'debt_perception' },
      description: 'Perceive the web of debts around you',
    }),
  ],
  {
    description: 'Learn to sense debts and obligations',
    lore: `The Fae see what mortals cannot: the invisible threads of obligation
that bind all things. Every gift given, every favor done, every
promise made - all create connections. Learn to see these threads.`,
    maxLevel: 3,
    levelCostMultiplier: 1.3,
    icon: '👁️',
  }
);

const GIFT_GIVING_NODE = createSkillNode(
  'gift-giving',
  'The Art of Giving',
  PARADIGM_ID,
  'foundation',
  0,
  30,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'create_debt_gift' },
      description: 'Give gifts that create obligations',
    }),
  ],
  {
    description: 'Learn to give gifts that create magical debts',
    lore: `Never accept a gift from the Fae. Every gift creates obligation.
The greater the gift, the greater the debt. A life saved is a life owed.
A secret shared is a secret owned. Give wisely.`,
    icon: '🎁',
  }
);

const BARGAIN_CRAFT_NODE = createSkillNode(
  'bargain-craft',
  'Bargain Craft',
  PARADIGM_ID,
  'foundation',
  0,
  30,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'negotiate_debt' },
      description: 'Negotiate explicit debt terms',
    }),
    createSkillEffect('paradigm_proficiency', 5, {
      perLevelValue: 3,
      description: 'Bonus to debt magic',
    }),
  ],
  {
    description: 'Learn to craft magical bargains',
    lore: `Words matter. Exact words. The bargain is sealed in the speaking.
"I will give you what you need" is not "I will give you what you want."
Choose your words with care.`,
    maxLevel: 5,
    levelCostMultiplier: 1.4,
    icon: '🤝',
  }
);

// ============================================================================
// Debt Creation Nodes
// ============================================================================

const RESCUE_DEBT_NODE = createSkillNode(
  'rescue-debt',
  'Life Debt',
  PARADIGM_ID,
  'technique',
  1,
  50,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'create_life_debt' },
      description: 'Saving someone creates life debt',
    }),
  ],
  {
    description: 'Learn to create life debts through rescue',
    lore: `Save a life and that life belongs to you. Not slavery - obligation.
The saved must repay, and a life debt can only be paid with life.
Service. Sacrifice. Or a life given in return.`,
    prerequisites: ['gift-giving'],
    icon: '💓',
  }
);

const SECRET_DEBT_NODE = createSkillNode(
  'secret-debt',
  'Secret Debt',
  PARADIGM_ID,
  'technique',
  1,
  50,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'create_secret_debt' },
      description: 'Sharing secrets creates obligations',
    }),
  ],
  {
    description: 'Learn to create debts through shared secrets',
    lore: `To share a secret is to share power. The one who receives the secret
owes the giver. They must keep it, honor it, and someday repay
with a secret of equal value.`,
    prerequisites: ['bargain-craft'],
    icon: '🤫',
  }
);

const NAME_DEBT_NODE = createSkillNode(
  'name-debt',
  'Name Binding',
  PARADIGM_ID,
  'technique',
  2,
  80,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'name_binding' },
      description: 'Use true names to enforce debts',
    }),
  ],
  {
    description: 'Learn to use true names in debt creation',
    lore: `Speak their true name and the debt is sealed in their soul.
They cannot forget. They cannot escape. The name binds tighter
than any chain. This is why the Fae never give their true names.`,
    prerequisites: ['bargain-craft'],
    unlockConditions: [
      createUnlockCondition(
        'name_learned',
        { nameId: 'any' },
        'Must know at least one true name'
      ),
    ],
    conditionMode: 'any',
    icon: '📛',
  }
);

const BLOOD_OATH_NODE = createSkillNode(
  'blood-oath',
  'Blood Oath',
  PARADIGM_ID,
  'technique',
  3,
  120,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'blood_oath' },
      description: 'Create unbreakable blood-sealed debts',
    }),
  ],
  {
    description: 'Learn to seal debts with blood',
    lore: `Blood is life is power. An oath sealed in blood cannot be broken.
Not by death, not by god, not by the debtor's own will.
The blood remembers. The blood enforces.`,
    prerequisites: ['name-debt'],
    unlockConditions: [
      createUnlockCondition(
        'ritual_performed',
        { ritualId: 'blood_rite' },
        'Must have performed a blood rite'
      ),
    ],
    conditionMode: 'any',
    icon: '🩸',
  }
);

// ============================================================================
// Debt Management Nodes
// ============================================================================

const DEBT_TRADING_NODE = createSkillNode(
  'debt-trading',
  'Debt Trading',
  PARADIGM_ID,
  'specialization',
  1,
  60,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'trade_debt' },
      description: 'Trade debts with others',
    }),
  ],
  {
    description: 'Learn to trade debts like currency',
    lore: `Debts can be sold. "You owe me a favor. But now you owe HIM a favor."
The Fae courts run on debt trading. Favors flow like coin.
A good debt trader never runs dry.`,
    prerequisites: ['debt-sense'],
    icon: '💱',
  }
);

const INTEREST_ACCRUAL_NODE = createSkillNode(
  'interest-accrual',
  'Interest Accrual',
  PARADIGM_ID,
  'specialization',
  2,
  80,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'accrue_interest' },
      description: 'Debts owed to you grow over time',
    }),
  ],
  {
    description: 'Learn to make debts grow with interest',
    lore: `Time is a multiplier. A small favor owed becomes a great service
after years of waiting. The Fae are patient. They let debts mature.
A promise made in childhood can buy a kingdom when called.`,
    prerequisites: ['debt-trading'],
    maxLevel: 3,
    levelCostMultiplier: 1.5,
    icon: '📈',
  }
);

const DEBT_CALLING_NODE = createSkillNode(
  'debt-calling',
  'Debt Calling',
  PARADIGM_ID,
  'technique',
  2,
  100,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'call_debt' },
      description: 'Force immediate payment of debts',
    }),
  ],
  {
    description: 'Learn to call in debts owed to you',
    lore: `"I call upon the debt between us." The words that every debtor dreads.
When a debt is called, it must be paid. Immediately. Completely.
The magic compels. There is no negotiation.`,
    prerequisites: ['gift-giving', 'debt-trading'],
    icon: '📢',
  }
);

const DEBT_TRANSFER_NODE = createSkillNode(
  'debt-transfer',
  'Debt Transfer',
  PARADIGM_ID,
  'specialization',
  3,
  120,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'transfer_debt' },
      description: 'Transfer your debts to others',
    }),
  ],
  {
    description: 'Learn to transfer your own debts to others',
    lore: `The most dangerous art: making others pay your debts.
Find someone willing to take your obligations. Or trick them.
But be warned - transferred debts have a way of returning.`,
    prerequisites: ['debt-trading', 'interest-accrual'],
    icon: '↔️',
  }
);

// ============================================================================
// Power Nodes - Spending Debt
// ============================================================================

const FAVOR_SPENDING_NODE = createSkillNode(
  'favor-spending',
  'Favor Spending',
  PARADIGM_ID,
  'technique',
  1,
  50,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'spend_favor' },
      description: 'Spend favor debts for magical effects',
    }),
  ],
  {
    description: 'Learn to spend collected favors for power',
    lore: `Debts are currency. Spend a favor owed to you for magical power.
The universe maintains the balance - the debt is paid, the power flows.
The greater the debt, the greater the effect.`,
    prerequisites: ['debt-sense', 'gift-giving'],
    icon: '✨',
  }
);

const COMPULSION_NODE = createSkillNode(
  'compulsion',
  'Debt Compulsion',
  PARADIGM_ID,
  'technique',
  2,
  90,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'debt_compulsion' },
      description: 'Compel actions from debtors',
    }),
    createSkillEffect('unlock_technique', 1, {
      target: { techniqueId: 'control' },
      description: 'Control technique through debt',
    }),
  ],
  {
    description: 'Learn to compel debtors to specific actions',
    lore: `"You owe me. And I collect." The debtor's body moves on its own.
They cannot refuse. The debt demands payment, and payment it shall have.
This is the true power of being owed.`,
    prerequisites: ['debt-calling'],
    icon: '🎭',
  }
);

const SOUL_CLAIM_NODE = createSkillNode(
  'soul-claim',
  'Soul Claim',
  PARADIGM_ID,
  'mastery',
  4,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'claim_soul' },
      description: 'Claim souls as payment for ultimate debts',
    }),
  ],
  {
    description: 'Learn to claim souls as debt payment',
    lore: `Some debts can only be paid with the soul itself.
The ultimate collection. The final transaction.
Few debts grow this large. Fewer still are called.`,
    prerequisites: ['blood-oath', 'compulsion'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 800 },
        'Requires 800 total XP in Debt magic'
      ),
    ],
    conditionMode: 'all',
    icon: '👻',
  }
);

// ============================================================================
// Defense Nodes
// ============================================================================

const DEBT_IMMUNITY_NODE = createSkillNode(
  'debt-immunity',
  'Debt Immunity',
  PARADIGM_ID,
  'specialization',
  2,
  80,
  [
    createSkillEffect('defense', 15, {
      description: 'Resistance to debt-based magic',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'refuse_gift' },
      description: 'Refuse gifts without offense',
    }),
  ],
  {
    description: 'Learn to protect yourself from debt magic',
    lore: `Never accept a gift. Never accept a favor. Never say thank you.
These simple rules protect you from the Fae debt web.
But they also mark you as one who knows. And the Fae notice.`,
    prerequisites: ['debt-sense'],
    maxLevel: 3,
    levelCostMultiplier: 1.5,
    icon: '🛡️',
  }
);

const DEBT_DISSOLUTION_NODE = createSkillNode(
  'debt-dissolution',
  'Debt Dissolution',
  PARADIGM_ID,
  'technique',
  3,
  120,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'dissolve_debt' },
      description: 'Dissolve debts you owe through magic',
    }),
  ],
  {
    description: 'Learn to dissolve your own debts',
    lore: `Debts can be unmade. It costs more than paying would have.
It angers those you owed. It weakens your standing in the courts.
But sometimes freedom from obligation is worth any price.`,
    prerequisites: ['debt-immunity', 'debt-trading'],
    icon: '💔',
  }
);

// ============================================================================
// Mastery Nodes
// ============================================================================

const DEBT_LORD_NODE = createSkillNode(
  'debt-lord',
  'Debt Lord',
  PARADIGM_ID,
  'mastery',
  4,
  180,
  [
    createSkillEffect('paradigm_proficiency', 30, {
      description: 'Mastery of debt magic',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'debt_web' },
      description: 'Create complex webs of interconnected debts',
    }),
  ],
  {
    description: 'Become a lord of debts',
    lore: `At the height of debt mastery, you see all obligations as one great web.
You can spin new threads, sever old ones, redirect payment flows.
The courts bow to those who control the web.`,
    prerequisites: ['debt-transfer', 'compulsion'],
    unlockConditions: [
      createUnlockCondition(
        'nodes_unlocked',
        { nodesRequired: 10 },
        'Requires 10 nodes unlocked'
      ),
    ],
    conditionMode: 'all',
    icon: '🕸️',
  }
);

const BANKRUPTCY_NODE = createSkillNode(
  'bankruptcy',
  'Declare Bankruptcy',
  PARADIGM_ID,
  'mastery',
  4,
  150,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'declare_bankruptcy' },
      description: 'Catastrophically void all debts',
    }),
  ],
  {
    description: 'Learn the forbidden art of magical bankruptcy',
    lore: `The nuclear option. Void ALL debts - yours and those owed to you.
The backlash is catastrophic. Your standing destroyed. Your power gone.
But sometimes the only way out is to burn it all down.`,
    prerequisites: ['debt-dissolution'],
    icon: '💥',
  }
);

const PRIMORDIAL_DEBT_NODE = createSkillNode(
  'primordial-debt',
  'Primordial Debt',
  PARADIGM_ID,
  'mastery',
  5,
  300,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'primordial_debt' },
      description: 'Access the first debt - existence itself',
    }),
    createSkillEffect('paradigm_proficiency', 50, {
      description: 'Supreme debt mastery',
    }),
  ],
  {
    description: 'Touch the primordial debt of existence',
    lore: `Before the first Fae, there was the First Debt: existence owes non-existence.
To touch this primal obligation is to touch the fabric of reality.
Few have dared. Fewer have survived. None have remained unchanged.`,
    prerequisites: ['debt-lord', 'soul-claim'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 1200 },
        'Requires 1200 total XP in Debt magic'
      ),
    ],
    conditionMode: 'all',
    icon: '🌌',
  }
);

// ============================================================================
// Collect All Nodes
// ============================================================================

const ALL_NODES: MagicSkillNode[] = [
  // Foundation
  DEBT_SENSE_NODE,
  GIFT_GIVING_NODE,
  BARGAIN_CRAFT_NODE,
  // Debt Creation
  RESCUE_DEBT_NODE,
  SECRET_DEBT_NODE,
  NAME_DEBT_NODE,
  BLOOD_OATH_NODE,
  // Debt Management
  DEBT_TRADING_NODE,
  INTEREST_ACCRUAL_NODE,
  DEBT_CALLING_NODE,
  DEBT_TRANSFER_NODE,
  // Power
  FAVOR_SPENDING_NODE,
  COMPULSION_NODE,
  SOUL_CLAIM_NODE,
  // Defense
  DEBT_IMMUNITY_NODE,
  DEBT_DISSOLUTION_NODE,
  // Mastery
  DEBT_LORD_NODE,
  BANKRUPTCY_NODE,
  PRIMORDIAL_DEBT_NODE,
];

// ============================================================================
// XP Sources
// ============================================================================

const XP_SOURCES: MagicXPSource[] = [
  {
    eventType: 'debt_created',
    xpAmount: 10,
    description: 'Create a new debt',
    qualityMultiplier: true,
  },
  {
    eventType: 'debt_called',
    xpAmount: 15,
    description: 'Successfully call in a debt',
  },
  {
    eventType: 'debt_traded',
    xpAmount: 8,
    description: 'Trade a debt with another',
  },
  {
    eventType: 'favor_spent',
    xpAmount: 12,
    description: 'Spend a favor for magical effect',
  },
  {
    eventType: 'bargain_struck',
    xpAmount: 10,
    description: 'Complete a magical bargain',
  },
  {
    eventType: 'debt_grown',
    xpAmount: 5,
    description: 'Let a debt accrue interest',
  },
  {
    eventType: 'gift_refused',
    xpAmount: 3,
    description: 'Refuse a gift to avoid debt',
  },
];

// ============================================================================
// Tree Definition
// ============================================================================

export const DEBT_SKILL_TREE: MagicSkillTree = {
  id: 'debt_skill_tree',
  paradigmId: PARADIGM_ID,
  name: 'Debt Magic Skill Tree',
  description: 'Master the Fae art of debts, favors, and magical obligation',
  lore: `Among the Fae, all debts are real. Owe a favor and they own a piece of you.
Be owed and you own a piece of them. The greatest lords are those owed the most.
Never say "thank you" - it creates debt. Never accept freely - it binds.`,
  nodes: ALL_NODES,
  entryNodes: ['debt-sense', 'gift-giving', 'bargain-craft'],
  connections: ALL_NODES.flatMap(node =>
    (node.prerequisites ?? []).map(prereq => ({ from: prereq, to: node.id }))
  ),
  xpSources: XP_SOURCES,
  rules: {
    ...createDefaultTreeRules(false),
    permanentProgress: false, // Debts can be lost through bankruptcy
    progressLossConditions: [
      createUnlockCondition(
        'ritual_performed',
        { ritualId: 'bankruptcy' },
        'Declaring bankruptcy resets progress'
      ),
    ],
  },
  version: 1,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate the power of a debt based on its type and age.
 */
export function calculateDebtPower(debtType: keyof typeof DEBT_TYPES, ageInDays: number, interestRate: number = 0): number {
  const basePower: Record<keyof typeof DEBT_TYPES, number> = {
    favor: 10,
    service: 25,
    gift: 15,
    secret: 20,
    protection: 30,
    loyalty: 40,
    time: 50,
    soul: 100,
  };

  const base = basePower[debtType];
  const interest = 1 + (interestRate * (ageInDays / 30)); // Monthly compound
  return Math.floor(base * interest);
}

/**
 * Check if a debt can be dissolved.
 */
export function canDissolveDebt(debtType: keyof typeof DEBT_TYPES, isBloodOath: boolean): boolean {
  if (isBloodOath) return false;
  if (debtType === 'soul') return false;
  return true;
}

/**
 * Get interest rate based on unlocked nodes.
 */
export function getInterestRate(unlockedNodes: Set<string>, interestLevel: number): number {
  if (!unlockedNodes.has('interest-accrual')) return INTEREST_RATES.none;
  if (interestLevel >= 3) return INTEREST_RATES.compound;
  if (interestLevel >= 2) return INTEREST_RATES.usury;
  return INTEREST_RATES.standard;
}

/**
 * Calculate debt trading efficiency.
 */
export function getDebtTradingEfficiency(unlockedNodes: Set<string>): number {
  let efficiency = 0.5; // Base: 50% value retained in trades
  if (unlockedNodes.has('debt-trading')) efficiency += 0.2;
  if (unlockedNodes.has('debt-transfer')) efficiency += 0.15;
  if (unlockedNodes.has('debt-lord')) efficiency += 0.15;
  return Math.min(efficiency, 1.0);
}
