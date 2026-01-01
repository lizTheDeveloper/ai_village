/**
 * CommerceSkillTree - Skill tree for the Commerce paradigm
 *
 * Key mechanics:
 * - Trade Magic (fair trades have power)
 * - Currency Power (money as magical focus)
 * - Contract Binding (deal enforcement)
 * - Value Perception (see true worth)
 * - Market Manipulation (shift supply and demand)
 * - Merchant Guilds (collective commerce magic)
 *
 * Core concept:
 * - Fair trade creates magical power
 * - Currency stores and transfers magical energy
 * - Contracts are magically binding
 *
 * Risks:
 * - Market crash (magic fails catastrophically)
 * - Bankruptcy (lose all magical power)
 * - Unfair trade backlash
 * - Guild warfare
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

const PARADIGM_ID = 'commerce_magic';

/** Types of commercial transactions */
export const TRADE_TYPES = {
  barter: 'Direct goods-for-goods exchange',
  sale: 'Goods for currency',
  service: 'Labor for payment',
  contract: 'Future obligations',
  investment: 'Money for future returns',
  gift: 'One-sided giving (creates debt)',
  tithe: 'Religious/magical offering',
} as const;

/** Currency types with magical properties */
export const CURRENCY_TYPES = {
  coin: 'Standard metal currency',
  gem: 'Precious stones as currency',
  favor: 'Social currency',
  soul_coin: 'Infernal currency',
  mana_crystal: 'Crystallized magical energy',
  time: 'Time as currency',
  memory: 'Memories as payment',
} as const;

/** Contract enforcement levels */
export const CONTRACT_LEVELS = {
  verbal: 'Spoken agreement - weakest',
  witnessed: 'Agreement with witnesses',
  written: 'Documented agreement',
  notarized: 'Officially certified',
  blood_signed: 'Signed in blood - unbreakable',
  soul_bound: 'Bound to the soul itself',
} as const;

// ============================================================================
// Foundation Nodes - Commerce Awareness
// ============================================================================

const VALUE_SENSE_NODE = createSkillNode(
  'value-sense',
  'Value Sense',
  PARADIGM_ID,
  'foundation',
  0,
  25,
  [
    createSkillEffect('perception', 10, {
      description: 'Sense the true value of things',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'appraise' },
      description: 'Accurately appraise any item',
    }),
  ],
  {
    description: 'Learn to sense the true value of things',
    lore: `Value is more than price. A sword has value as metal, as weapon,
as heirloom, as symbol. Learn to see all values at once.
True value is the sum of all meanings.`,
    maxLevel: 3,
    levelCostMultiplier: 1.3,
    icon: '💰',
  }
);

const MERCHANT_INTUITION_NODE = createSkillNode(
  'merchant-intuition',
  'Merchant Intuition',
  PARADIGM_ID,
  'foundation',
  0,
  30,
  [
    createSkillEffect('paradigm_proficiency', 5, {
      perLevelValue: 3,
      description: 'Bonus to commerce magic',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'market_sense' },
      description: 'Sense market conditions and opportunities',
    }),
  ],
  {
    description: 'Develop merchant intuition',
    lore: `The born merchant knows when to buy and when to sell.
They feel market shifts before they happen. Supply and demand
speak to them in whispers. Trust your intuition.`,
    maxLevel: 5,
    levelCostMultiplier: 1.3,
    icon: '🧠',
  }
);

const FAIR_DEALING_NODE = createSkillNode(
  'fair-dealing',
  'Fair Dealing',
  PARADIGM_ID,
  'foundation',
  0,
  25,
  [
    createSkillEffect('defense', 10, {
      description: 'Protection from unfair trade consequences',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'fair_trade_aura' },
      description: 'Radiate fairness in deals',
    }),
  ],
  {
    description: 'Learn the principles of fair dealing',
    lore: `Commerce magic punishes unfair trades. The cheat loses more than
they gain. Learn to deal fairly and the magic flows smoothly.
Fairness is not weakness - it's efficiency.`,
    icon: '⚖️',
  }
);

// ============================================================================
// Trade Magic Nodes
// ============================================================================

const TRADE_BLESSING_NODE = createSkillNode(
  'trade-blessing',
  'Trade Blessing',
  PARADIGM_ID,
  'technique',
  1,
  50,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'bless_trade' },
      description: 'Bless trades for enhanced effects',
    }),
  ],
  {
    description: 'Learn to bless trades for magical enhancement',
    lore: `A blessed trade benefits both parties beyond the exchange itself.
Goods improve, services excel, relationships strengthen.
The universe rewards fair exchange.`,
    prerequisites: ['fair-dealing'],
    icon: '✨',
  }
);

const TRADE_POWER_NODE = createSkillNode(
  'trade-power',
  'Trade Power',
  PARADIGM_ID,
  'technique',
  1,
  55,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'draw_trade_power' },
      description: 'Draw magical power from fair trades',
    }),
    createSkillEffect('resource_regen', 10, {
      description: 'Regenerate power through trading',
    }),
  ],
  {
    description: 'Learn to draw power from trading',
    lore: `Every fair trade releases energy. The satisfaction of both parties,
the completion of exchange, the flow of value - all generate power.
Trade often, trade fairly, and never run dry.`,
    prerequisites: ['value-sense'],
    icon: '⚡',
  }
);

const ARBITRAGE_NODE = createSkillNode(
  'arbitrage',
  'Magical Arbitrage',
  PARADIGM_ID,
  'technique',
  2,
  90,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'magical_arbitrage' },
      description: 'Profit from value differentials',
    }),
  ],
  {
    description: 'Learn to profit from magical value differentials',
    lore: `Value isn't constant - it varies by place, by time, by buyer.
Arbitrage exploits these differences. Buy low here, sell high there.
The profit is pure magical energy.`,
    prerequisites: ['trade-power', 'merchant-intuition'],
    icon: '📊',
  }
);

// ============================================================================
// Currency Nodes
// ============================================================================

const CURRENCY_ATTUNEMENT_NODE = createSkillNode(
  'currency-attunement',
  'Currency Attunement',
  PARADIGM_ID,
  'specialization',
  1,
  50,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'attune_currency' },
      description: 'Attune to currency as magical focus',
    }),
  ],
  {
    description: 'Learn to use currency as magical focus',
    lore: `Money changes hands constantly, collecting belief and intent.
A coin that has paid for joy carries joy. A coin that has paid for death
carries death. Learn to read and use this stored power.`,
    prerequisites: ['value-sense'],
    icon: '🪙',
  }
);

const CURRENCY_CONVERSION_NODE = createSkillNode(
  'currency-conversion',
  'Currency Conversion',
  PARADIGM_ID,
  'specialization',
  2,
  80,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'convert_currency' },
      description: 'Convert between currency types',
    }),
  ],
  {
    description: 'Learn to convert between currency types',
    lore: `Gold to gems. Gems to favors. Favors to time. Time to memories.
The exchange rate is complex but knowable. Master conversion
and no currency is beyond your reach.`,
    prerequisites: ['currency-attunement'],
    icon: '🔄',
  }
);

const MINT_POWER_NODE = createSkillNode(
  'mint-power',
  'Mint Power',
  PARADIGM_ID,
  'mastery',
  4,
  180,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'mint_currency' },
      description: 'Create magical currency',
    }),
  ],
  {
    description: 'Learn to mint magical currency',
    lore: `Not counterfeiting - creating. True magical currency, backed by
your power, your word, your reputation. Spend it and others gain
your power. Dangerous but useful.`,
    prerequisites: ['currency-conversion', 'contract-master'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 700 },
        'Requires 700 total XP in Commerce magic'
      ),
    ],
    conditionMode: 'all',
    icon: '🏛️',
  }
);

// ============================================================================
// Contract Nodes
// ============================================================================

const BINDING_CONTRACT_NODE = createSkillNode(
  'binding-contract',
  'Binding Contract',
  PARADIGM_ID,
  'technique',
  1,
  60,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'create_contract' },
      description: 'Create magically binding contracts',
    }),
  ],
  {
    description: 'Learn to create magically binding contracts',
    lore: `Put it in writing and the magic enforces it. A contract is more than
paper - it's a spell. Terms become reality. Penalties become automatic.
Write carefully.`,
    prerequisites: ['fair-dealing'],
    icon: '📜',
  }
);

const CONTRACT_ENFORCEMENT_NODE = createSkillNode(
  'contract-enforcement',
  'Contract Enforcement',
  PARADIGM_ID,
  'technique',
  2,
  90,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'enforce_contract' },
      description: 'Magically enforce contract terms',
    }),
  ],
  {
    description: 'Learn to enforce contracts magically',
    lore: `When terms are violated, you can force compliance. The magic compels.
Payments extracted, services rendered, penalties enacted -
all without physical action.`,
    prerequisites: ['binding-contract'],
    icon: '⚔️',
  }
);

const CONTRACT_MASTER_NODE = createSkillNode(
  'contract-master',
  'Contract Master',
  PARADIGM_ID,
  'specialization',
  3,
  140,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'master_contract' },
      description: 'Create unbreakable master contracts',
    }),
    createSkillEffect('paradigm_proficiency', 20, {
      description: 'Mastery of contract magic',
    }),
  ],
  {
    description: 'Become a master of contract magic',
    lore: `Your contracts are legendary. Ironclad. Unbreakable. Every word
carefully chosen, every clause a trap for the unwary.
No one escapes a contract you've written.`,
    prerequisites: ['contract-enforcement'],
    unlockConditions: [
      createUnlockCondition(
        'nodes_unlocked',
        { nodesRequired: 8 },
        'Requires 8 nodes unlocked'
      ),
    ],
    conditionMode: 'all',
    icon: '📋',
  }
);

// ============================================================================
// Market Manipulation Nodes
// ============================================================================

const SUPPLY_CONTROL_NODE = createSkillNode(
  'supply-control',
  'Supply Control',
  PARADIGM_ID,
  'technique',
  2,
  85,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'control_supply' },
      description: 'Magically influence supply of goods',
    }),
  ],
  {
    description: 'Learn to control supply',
    lore: `Create scarcity or abundance. Hide goods from the market or reveal them.
When you control supply, you control price. When you control price,
you control power.`,
    prerequisites: ['arbitrage'],
    icon: '📦',
  }
);

const DEMAND_SHAPING_NODE = createSkillNode(
  'demand-shaping',
  'Demand Shaping',
  PARADIGM_ID,
  'technique',
  2,
  85,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'shape_demand' },
      description: 'Magically influence demand for goods',
    }),
  ],
  {
    description: 'Learn to shape demand',
    lore: `Make people want what you're selling. Create need where none existed.
Satisfy desires before they're felt. Demand is just belief applied
to commerce.`,
    prerequisites: ['merchant-intuition', 'trade-power'],
    icon: '📈',
  }
);

const MARKET_CRASH_NODE = createSkillNode(
  'market-crash',
  'Market Crash',
  PARADIGM_ID,
  'mastery',
  4,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'crash_market' },
      description: 'Cause or prevent market crashes',
    }),
  ],
  {
    description: 'Learn to manipulate entire markets',
    lore: `The invisible hand becomes your hand. Crash economies. Create bubbles.
Build fortunes. Destroy empires. At this level, you don't trade in markets -
you ARE the market.`,
    prerequisites: ['supply-control', 'demand-shaping'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 800 },
        'Requires 800 total XP in Commerce magic'
      ),
    ],
    conditionMode: 'all',
    icon: '💥',
  }
);

// ============================================================================
// Guild Nodes
// ============================================================================

const GUILD_MEMBER_NODE = createSkillNode(
  'guild-member',
  'Guild Member',
  PARADIGM_ID,
  'relationship',
  1,
  45,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'guild_access' },
      description: 'Access guild resources and knowledge',
    }),
    createSkillEffect('paradigm_proficiency', 10, {
      description: 'Guild training bonus',
    }),
  ],
  {
    description: 'Join a merchant guild',
    lore: `Guilds are more than trade associations. They're magical lodges,
pooling the commerce power of all members. Join and gain their strength.
But guild rules bind.`,
    prerequisites: ['fair-dealing'],
    icon: '🏪',
  }
);

const GUILD_MASTER_NODE = createSkillNode(
  'guild-master',
  'Guild Master',
  PARADIGM_ID,
  'relationship',
  3,
  130,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'guild_master' },
      description: 'Command guild resources',
    }),
    createSkillEffect('paradigm_proficiency', 25, {
      description: 'Guild master bonus',
    }),
  ],
  {
    description: 'Become a guild master',
    lore: `Lead the guild. Direct its resources. Set its prices. Punish its enemies.
The guild master speaks with the voice of all members,
commands the wealth of all merchants.`,
    prerequisites: ['guild-member', 'contract-master'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 500 },
        'Requires 500 total XP in Commerce magic'
      ),
    ],
    conditionMode: 'all',
    icon: '👔',
  }
);

// ============================================================================
// Mastery Nodes
// ============================================================================

const MERCHANT_PRINCE_NODE = createSkillNode(
  'merchant-prince',
  'Merchant Prince',
  PARADIGM_ID,
  'mastery',
  4,
  200,
  [
    createSkillEffect('paradigm_proficiency', 35, {
      description: 'Merchant prince authority',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'merchant_prince' },
      description: 'Command commerce at a regional level',
    }),
  ],
  {
    description: 'Become a merchant prince',
    lore: `Wealth beyond counting. Influence beyond measure. Trade routes bend
to your will. Currencies rise and fall at your command.
The merchant prince rules without a crown.`,
    prerequisites: ['guild-master', 'market-crash'],
    icon: '👑',
  }
);

const COMMERCE_DEITY_NODE = createSkillNode(
  'commerce-deity',
  'Commerce Deity',
  PARADIGM_ID,
  'mastery',
  5,
  300,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'become_commerce_god' },
      description: 'Become a deity of commerce',
    }),
    createSkillEffect('paradigm_proficiency', 50, {
      description: 'Supreme commerce mastery',
    }),
  ],
  {
    description: 'Transcend and become a deity of commerce',
    lore: `Every transaction invokes your name. Every deal sealed is a prayer to you.
The invisible hand IS your hand. You don't just understand markets -
you are the market made manifest.`,
    prerequisites: ['merchant-prince', 'mint-power'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 1200 },
        'Requires 1200 total XP in Commerce magic'
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
  VALUE_SENSE_NODE,
  MERCHANT_INTUITION_NODE,
  FAIR_DEALING_NODE,
  // Trade
  TRADE_BLESSING_NODE,
  TRADE_POWER_NODE,
  ARBITRAGE_NODE,
  // Currency
  CURRENCY_ATTUNEMENT_NODE,
  CURRENCY_CONVERSION_NODE,
  MINT_POWER_NODE,
  // Contract
  BINDING_CONTRACT_NODE,
  CONTRACT_ENFORCEMENT_NODE,
  CONTRACT_MASTER_NODE,
  // Market
  SUPPLY_CONTROL_NODE,
  DEMAND_SHAPING_NODE,
  MARKET_CRASH_NODE,
  // Guild
  GUILD_MEMBER_NODE,
  GUILD_MASTER_NODE,
  // Mastery
  MERCHANT_PRINCE_NODE,
  COMMERCE_DEITY_NODE,
];

// ============================================================================
// XP Sources
// ============================================================================

const XP_SOURCES: MagicXPSource[] = [
  {
    eventType: 'fair_trade',
    xpAmount: 10,
    description: 'Complete a fair trade',
    qualityMultiplier: true,
  },
  {
    eventType: 'contract_created',
    xpAmount: 15,
    description: 'Create a binding contract',
  },
  {
    eventType: 'contract_enforced',
    xpAmount: 20,
    description: 'Enforce a contract magically',
  },
  {
    eventType: 'arbitrage_profit',
    xpAmount: 12,
    description: 'Profit through magical arbitrage',
  },
  {
    eventType: 'market_influence',
    xpAmount: 25,
    description: 'Significantly influence a market',
  },
  {
    eventType: 'guild_service',
    xpAmount: 8,
    description: 'Perform service for guild',
  },
];

// ============================================================================
// Tree Definition
// ============================================================================

export const COMMERCE_SKILL_TREE: MagicSkillTree = {
  id: 'commerce_skill_tree',
  paradigmId: PARADIGM_ID,
  name: 'Commerce Magic Skill Tree',
  description: 'Master the art of magical trade, contracts, and market manipulation',
  lore: `A deal is a deal. Shake hands and reality enforces the contract.
The invisible hand of the market is actually invisible hands enforcing trades.
Supply and demand shape the world.`,
  nodes: ALL_NODES,
  entryNodes: ['value-sense', 'merchant-intuition', 'fair-dealing'],
  connections: ALL_NODES.flatMap(node =>
    (node.prerequisites ?? []).map(prereq => ({ from: prereq, to: node.id }))
  ),
  xpSources: XP_SOURCES,
  rules: {
    ...createDefaultTreeRules(false),
    allowRespec: true,
    respecPenalty: 0.2, // 20% penalty - commerce is unforgiving
    permanentProgress: true,
  },
  version: 1,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate trade power from transaction value.
 */
export function calculateTradePower(
  value: number,
  isFair: boolean,
  unlockedNodes: Set<string>
): number {
  let power = Math.log10(value + 1) * 10;

  if (!isFair) {
    power *= -0.5; // Unfair trades generate negative power
  }

  if (unlockedNodes.has('trade-power')) power *= 1.5;
  if (unlockedNodes.has('trade-blessing')) power *= 1.3;

  return Math.floor(power);
}

/**
 * Get contract enforcement strength.
 */
export function getContractStrength(
  level: keyof typeof CONTRACT_LEVELS,
  unlockedNodes: Set<string>
): number {
  const baseStrength: Record<keyof typeof CONTRACT_LEVELS, number> = {
    verbal: 10,
    witnessed: 25,
    written: 50,
    notarized: 75,
    blood_signed: 95,
    soul_bound: 100,
  };

  let strength = baseStrength[level];
  if (unlockedNodes.has('contract-master')) strength += 10;
  return Math.min(strength, 100);
}

/**
 * Calculate currency conversion rate.
 */
export function getCurrencyConversionRate(
  from: keyof typeof CURRENCY_TYPES,
  to: keyof typeof CURRENCY_TYPES,
  unlockedNodes: Set<string>
): number {
  // Base exchange rates (arbitrary scale)
  const values: Record<keyof typeof CURRENCY_TYPES, number> = {
    coin: 1,
    gem: 10,
    favor: 5,
    soul_coin: 1000,
    mana_crystal: 100,
    time: 50,
    memory: 25,
  };

  let rate = values[to] / values[from];

  // Conversion node reduces losses
  if (unlockedNodes.has('currency-conversion')) {
    rate *= 0.95; // 5% loss instead of default losses
  } else {
    rate *= 0.7; // 30% conversion loss
  }

  return rate;
}

/**
 * Get guild bonus based on membership level.
 */
export function getGuildBonus(unlockedNodes: Set<string>): number {
  if (unlockedNodes.has('guild-master')) return 1.5;
  if (unlockedNodes.has('guild-member')) return 1.2;
  return 1.0;
}
