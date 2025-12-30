/**
 * PactSkillTree - Skill tree for the Pact paradigm
 *
 * Key mechanics:
 * - Contracts with supernatural entities (demons, angels, fae, spirits)
 * - Power granted in exchange for service, sacrifice, or constraints
 * - Binding magical agreements with severe breach consequences
 * - Multiple pacts possible but risky (conflicting obligations)
 * - Patron types have different costs, benefits, and personalities
 * - Loopholes and contract law - wording matters immensely
 * - Renegotiation, transfer, and termination clauses
 *
 * Inspired by:
 * - Traditional demon pacts (Faust, etc.)
 * - Warlock mechanics from D&D and fantasy
 * - Fae bargains from folklore (be careful what you promise)
 * - The concept that words bind reality
 * - The user's note about demons being angels serving evil gods
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

const PARADIGM_ID = 'pact';

/** Types of entities you can pact with */
export const PATRON_TYPES = {
  demon: 'Demons - angels serving dark gods, offer great power for terrible prices',
  angel: 'Angels - servants of good gods, offer protection for righteous service',
  fae: 'Fae - capricious spirits of nature, love clever contracts and wordplay',
  spirit: 'Spirits - local entities, offer modest power for simple tasks',
  ancestor: 'Ancestor spirits - family ghosts, protective but demanding respect',
  elemental: 'Elementals - living forces of nature, offer raw power for freedom',
  elder: 'Elder Things - cosmic entities beyond morality, offer forbidden knowledge',
  archfey: 'Archfey - fae nobility, offer transformation for eternal loyalty',
  devil: 'Devils - lawful evil, offer precise contracts with hidden clauses',
  celestial: 'Celestials - lawful good, offer blessings for holy quests',
} as const;

/** Common pact costs */
export const PACT_COSTS = {
  service: 'Perform specific tasks for the patron',
  sacrifice: 'Regular offerings of blood, life force, or possessions',
  obedience: 'Follow behavioral restrictions or commandments',
  soul: 'Promise your soul after death',
  time: 'Give up years of your life',
  memory: 'Forget cherished memories',
  emotion: 'Suppress specific emotions (love, fear, joy)',
  identity: 'Give up part of who you are',
  freedom: 'Accept binding constraints on your actions',
  loyalty: 'Never betray or oppose the patron',
} as const;

/** Common pact benefits */
export const PACT_BENEFITS = {
  power: 'Raw magical power and spells',
  knowledge: 'Secret information and lore',
  protection: 'Defense against harm and enemies',
  blessing: 'Luck, charisma, or divine favor',
  immortality: 'Extended life or resurrection',
  transformation: 'Physical or spiritual change',
  servants: 'Summoned creatures to serve you',
  items: 'Magical artifacts and tools',
  wealth: 'Material riches and resources',
  access: 'Entry to otherworldly realms',
} as const;

/** Pact violation consequences */
export const BREACH_CONSEQUENCES = {
  power_loss: 'Immediate loss of granted powers',
  curse: 'Affliction or hex placed on you',
  hunt: 'Patron sends agents to punish you',
  corruption: 'Slow transformation into something monstrous',
  soul_claim: 'Immediate claim on your soul',
  mark: 'Branded as oathbreaker, visible to all',
  possession: 'Patron takes control of your body',
  unmaking: 'Partial or total erasure from reality',
} as const;

// ============================================================================
// Foundation Nodes - Learning Pact Magic
// ============================================================================

/** Entry node - sensing supernatural entities */
const ENTITY_SENSE_NODE = createSkillNode(
  'entity-sense',
  'Entity Awareness',
  PARADIGM_ID,
  'foundation',
  0,
  40,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Sense the presence of supernatural entities',
      target: { abilityId: 'sense_entity' },
    }),
  ],
  {
    description: 'Learn to feel when supernatural entities are near',
    lore: `The air changes when they're present. A chill for demons, warmth for angels,
a strange scent for fae. You learn to recognize these signs, to know when
you're in the presence of something Other.`,
    maxLevel: 3,
    levelCostMultiplier: 1.3,
    icon: '👁️',
  }
);

/** Contract basics - understanding binding agreements */
const CONTRACT_BASICS_NODE = createSkillNode(
  'contract-basics',
  'Contract Law',
  PARADIGM_ID,
  'foundation',
  1,
  75,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Understand magical contract structure',
      target: { abilityId: 'read_contract' },
    }),
  ],
  {
    description: 'Learn the basics of magical contract law',
    lore: `A pact is a binding magical contract. Every word matters. Every clause is
enforced by reality itself. You must learn to read the terms, understand
the implications, see the hidden costs. A poorly written contract can
destroy you.`,
    prerequisites: ['entity-sense'],
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

/** Summoning basics - calling entities */
const SUMMONING_BASICS_NODE = createSkillNode(
  'summoning-basics',
  'Basic Summoning',
  PARADIGM_ID,
  'foundation',
  1,
  100,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Summon minor entities for negotiation',
      target: { abilityId: 'summon_entity' },
    }),
  ],
  {
    description: 'Learn to summon entities to negotiate with',
    lore: `Before you can make a pact, you must call the entity. Circle of salt,
candles, words of power. The basics are simple, but you must get them
exactly right or you'll summon nothing - or worse, something you can't
control.`,
    prerequisites: ['entity-sense'],
    unlockConditions: [
      createUnlockCondition(
        'teacher_found',
        { teacherType: 'pact_maker' },
        'Must be taught by an experienced pact-maker'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Protection circles - staying safe */
const PROTECTION_CIRCLE_NODE = createSkillNode(
  'protection-circle',
  'Protective Circles',
  PARADIGM_ID,
  'foundation',
  1,
  90,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Create circles that entities cannot cross',
      target: { abilityId: 'protection_circle' },
    }),
  ],
  {
    description: 'Learn to create protective circles',
    lore: `Never summon without protection. A circle properly drawn keeps the entity
contained. Salt, silver, holy water, cold iron - different entities fear
different things. Get it wrong and they'll be free to do as they please.`,
    prerequisites: ['summoning-basics'],
    maxLevel: 5,
    levelCostMultiplier: 1.4,
  }
);

// ============================================================================
// Patron Type Nodes - Different Entity Categories
// ============================================================================

/** Demon pacts - dark power */
const DEMON_PACTS_NODE = createSkillNode(
  'demon-pacts',
  'Demonic Contracts',
  PARADIGM_ID,
  'specialization',
  2,
  150,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Make pacts with demons',
      target: { abilityId: 'demon_pact' },
    }),
  ],
  {
    description: 'Learn to negotiate with demons',
    lore: `Demons are angels serving dark gods - they offer great power but demand
terrible prices. Soul contracts are their favorite, but they'll bargain
for anything of value. They're cunning negotiators and love finding
loopholes that benefit them. Never trust a demon's word - only the
contract itself.`,
    prerequisites: ['contract-basics', 'summoning-basics'],
    icon: '👹',
  }
);

/** Angel pacts - holy service */
const ANGEL_PACTS_NODE = createSkillNode(
  'angel-pacts',
  'Angelic Covenants',
  PARADIGM_ID,
  'specialization',
  2,
  150,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Make covenants with angels',
      target: { abilityId: 'angel_pact' },
    }),
  ],
  {
    description: 'Learn to make covenants with angels',
    lore: `Angels serve good gods and offer protection, healing, and righteous power.
But they demand moral behavior, holy quests, and absolute honesty. Break
your covenant and you'll face divine wrath. Angels don't forgive easily.`,
    prerequisites: ['contract-basics', 'summoning-basics'],
    icon: '👼',
  }
);

/** Fae pacts - clever bargains */
const FAE_PACTS_NODE = createSkillNode(
  'fae-pacts',
  'Fae Bargains',
  PARADIGM_ID,
  'specialization',
  2,
  175,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Make bargains with the fae',
      target: { abilityId: 'fae_pact' },
    }),
  ],
  {
    description: 'Learn the art of fae bargaining',
    lore: `The fae love wordplay, riddles, and clever contracts. They cannot lie but
delight in misleading truth. Every word in a fae bargain must be precise -
they'll exploit any ambiguity. But if you can match their cleverness,
fae pacts offer unique rewards.`,
    prerequisites: ['contract-basics', 'summoning-basics'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'contract-basics', level: 3 },
        'Fae bargaining requires advanced contract skill'
      ),
    ],
    conditionMode: 'all',
    icon: '🧚',
  }
);

/** Spirit pacts - local agreements */
const SPIRIT_PACTS_NODE = createSkillNode(
  'spirit-pacts',
  'Spirit Agreements',
  PARADIGM_ID,
  'specialization',
  1,
  100,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Make agreements with local spirits',
      target: { abilityId: 'spirit_pact' },
    }),
  ],
  {
    description: 'Learn to bargain with local spirits',
    lore: `Spirits are simpler than angels or demons - they want respect, offerings,
and help maintaining their domain. In return they offer modest but reliable
power. A spirit of a river might grant water magic for keeping the river
clean. Simple, direct, honest.`,
    prerequisites: ['contract-basics'],
  }
);

/** Elder pacts - forbidden knowledge */
const ELDER_PACTS_NODE = createSkillNode(
  'elder-pacts',
  'Elder Contracts',
  PARADIGM_ID,
  'mastery',
  4,
  350,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Make contracts with Elder Things',
      target: { abilityId: 'elder_pact' },
    }),
  ],
  {
    description: 'Learn to contract with cosmic entities',
    lore: `Elder Things exist beyond morality, beyond comprehension. They offer
forbidden knowledge and reality-warping power. But their costs are
equally incomprehensible - fragments of your sanity, pieces of your
humanity, changes to your very existence. Proceed with extreme caution.`,
    prerequisites: ['demon-pacts', 'angel-pacts'],
    unlockConditions: [
      createUnlockCondition(
        'secret_revealed',
        { secretId: 'elder_summons' },
        'Must learn the forbidden summoning rites'
      ),
    ],
    conditionMode: 'all',
    icon: '🌌',
  }
);

// ============================================================================
// Contract Technique Nodes
// ============================================================================

/** Negotiation - getting better terms */
const NEGOTIATION_NODE = createSkillNode(
  'negotiation',
  'Contract Negotiation',
  PARADIGM_ID,
  'technique',
  2,
  125,
  [
    createSkillEffect('technique_proficiency', 15, {
      perLevelValue: 5,
      target: { techniqueId: 'control' },
      description: '+X% to negotiation success',
    }),
  ],
  {
    description: 'Master the art of negotiating better contract terms',
    lore: `Everything is negotiable. The entity wants something from you, or they
wouldn't be bargaining. Learn to identify what they truly want, what
they're willing to concede, where you can push for better terms. Never
accept the first offer.`,
    prerequisites: ['contract-basics'],
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

/** Loophole finding - exploiting contracts */
const LOOPHOLE_NODE = createSkillNode(
  'loopholes',
  'Loophole Detection',
  PARADIGM_ID,
  'technique',
  3,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Find and exploit contract loopholes',
      target: { abilityId: 'find_loophole' },
    }),
  ],
  {
    description: 'Learn to find loopholes in contracts',
    lore: `Every contract has weaknesses - ambiguous wording, undefined terms,
conflicting clauses. A skilled pact-maker can find these loopholes and
exploit them. This works both ways: you can find loopholes in your own
contracts (to escape obligations) or in others' contracts (to help or
harm them).`,
    prerequisites: ['contract-basics', 'negotiation'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'contract-basics', level: 5 },
        'Requires mastery of contract law'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Multiple pacts - managing complexity */
const MULTIPLE_PACTS_NODE = createSkillNode(
  'multiple-pacts',
  'Multiple Pacts',
  PARADIGM_ID,
  'technique',
  3,
  250,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Maintain multiple pacts simultaneously',
      target: { abilityId: 'multi_pact' },
    }),
  ],
  {
    description: 'Learn to manage multiple pacts without conflicts',
    lore: `One pact is simple. Two pacts are manageable. Three or more and you're
juggling obligations that may conflict. A demon wants you to kill. An
angel forbids killing. How do you satisfy both? Careful contract writing
and meticulous obligation tracking.`,
    prerequisites: ['negotiation', 'demon-pacts'],
    maxLevel: 3,
  }
);

/** Pact transference - passing obligations */
const PACT_TRANSFER_NODE = createSkillNode(
  'pact-transfer',
  'Pact Transference',
  PARADIGM_ID,
  'technique',
  4,
  300,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Transfer pact obligations to others',
      target: { abilityId: 'transfer_pact' },
    }),
  ],
  {
    description: 'Learn to transfer pact obligations to others',
    lore: `Sometimes you need to escape a pact without breaching it. If the contract
allows, you can transfer your obligations to another person - making them
the new pact-holder. They get your benefits but also your costs. This
requires their consent (or clever deception) and the patron's agreement.`,
    prerequisites: ['loopholes', 'multiple-pacts'],
    icon: '🔄',
  }
);

// ============================================================================
// Power Source Nodes - What Pacts Grant
// ============================================================================

/** Invocation - calling on patron power */
const INVOCATION_NODE = createSkillNode(
  'invocation',
  'Patron Invocation',
  PARADIGM_ID,
  'channeling',
  2,
  150,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Invoke patron for direct intervention',
      target: { abilityId: 'invoke_patron' },
    }),
  ],
  {
    description: 'Learn to invoke your patron for immediate help',
    lore: `In times of need, call on your patron directly. Speak the invocation,
and they will act - healing you, smiting your enemies, revealing secrets.
But this uses up goodwill. Invoke too often and they'll demand greater
compensation.`,
    prerequisites: ['demon-pacts'],
    maxLevel: 5,
  }
);

/** Granted spells - permanent abilities */
const GRANTED_SPELLS_NODE = createSkillNode(
  'granted-spells',
  'Granted Abilities',
  PARADIGM_ID,
  'channeling',
  2,
  175,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Gain permanent spells from patron',
      target: { abilityId: 'granted_spell' },
    }),
  ],
  {
    description: 'Receive permanent magical abilities from patron',
    lore: `Most pacts grant specific spells or abilities - fire magic from a demon,
healing from an angel, illusions from a fae. These are permanent as long
as the pact holds. Breach the contract and lose everything instantly.`,
    prerequisites: ['demon-pacts'],
  }
);

/** Familiar - summoned servant */
const FAMILIAR_NODE = createSkillNode(
  'familiar',
  'Pact Familiar',
  PARADIGM_ID,
  'channeling',
  3,
  225,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Summon a familiar bound by pact',
      target: { abilityId: 'summon_familiar' },
    }),
  ],
  {
    description: 'Gain a familiar as part of your pact',
    lore: `Some patrons grant a familiar - a minor entity bound to serve you. It acts
as scout, advisor, spy, and sometimes weapon. But beware: the familiar
also reports back to the patron. It watches everything you do.`,
    prerequisites: ['granted-spells'],
    icon: '🐈‍⬛',
  }
);

/** Transformation - changed nature */
const TRANSFORMATION_NODE = createSkillNode(
  'transformation',
  'Pact Transformation',
  PARADIGM_ID,
  'channeling',
  4,
  300,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Undergo transformation granted by pact',
      target: { abilityId: 'pact_form' },
    }),
  ],
  {
    description: 'Accept physical/spiritual transformation from patron',
    lore: `Some pacts offer transformation - wings from an angel, horns from a demon,
fae-touched beauty, elemental infusion. These changes are permanent and
visible. You become something more (or less) than human. Choose carefully.`,
    prerequisites: ['familiar', 'elder-pacts'],
  }
);

// ============================================================================
// Risk Management Nodes
// ============================================================================

/** Breach detection - knowing when contracts break */
const BREACH_DETECTION_NODE = createSkillNode(
  'breach-detection',
  'Breach Detection',
  PARADIGM_ID,
  'technique',
  2,
  125,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Sense when pacts are about to break',
      target: { abilityId: 'detect_breach' },
    }),
  ],
  {
    description: 'Learn to detect impending contract breaches',
    lore: `A pact about to break gives warning - a tightness in your chest, a ringing
in your ears, a sense of doom. You learn to recognize these signs, giving
you precious time to rectify the situation before consequences strike.`,
    prerequisites: ['contract-basics', 'demon-pacts'],
  }
);

/** Consequence mitigation - reducing breach penalties */
const MITIGATION_NODE = createSkillNode(
  'consequence-mitigation',
  'Consequence Mitigation',
  PARADIGM_ID,
  'technique',
  3,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Reduce breach consequences through fast action',
      target: { abilityId: 'mitigate_breach' },
    }),
  ],
  {
    description: 'Learn to mitigate breach consequences',
    lore: `If you breach a pact, all is not lost. Immediate confession, compensation,
or corrective action can reduce the penalty. A demon might accept extra
service instead of claiming your soul. Maybe. If you're very lucky and
very convincing.`,
    prerequisites: ['breach-detection', 'negotiation'],
  }
);

/** Pact breaking - deliberate termination */
const PACT_BREAKING_NODE = createSkillNode(
  'pact-breaking',
  'Controlled Breach',
  PARADIGM_ID,
  'mastery',
  4,
  350,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Break pacts while minimizing consequences',
      target: { abilityId: 'break_pact' },
    }),
  ],
  {
    description: 'Master the dangerous art of breaking pacts',
    lore: `Sometimes you must break a pact, consequences be damned. With skill, you
can minimize the damage - fulfill just enough obligations to avoid the
worst penalties, exploit loopholes to escape clauses, prepare defenses
against retaliation. Still incredibly dangerous.`,
    prerequisites: ['mitigation-node', 'loopholes'],
    icon: '💔',
  }
);

// ============================================================================
// Advanced/Mastery Nodes
// ============================================================================

/** Pact binding - forcing contracts on others */
const PACT_BINDING_NODE = createSkillNode(
  'pact-binding',
  'Forced Binding',
  PARADIGM_ID,
  'mastery',
  4,
  400,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Bind others into pacts against their will',
      target: { abilityId: 'force_pact' },
    }),
  ],
  {
    description: 'Learn to force pacts on unwilling participants',
    lore: `The darkest art of pact-making: forcing someone into a contract without
their true consent. Through trickery, magical compulsion, or exploiting
moments of weakness, you can bind them. But this attracts attention from
cosmic forces that don't approve of such violations.`,
    prerequisites: ['pact-transfer', 'elder-pacts'],
    unlockConditions: [
      createUnlockCondition(
        'secret_revealed',
        { secretId: 'forced_binding' },
        'Must learn the forbidden binding ritual'
      ),
    ],
    conditionMode: 'all',
    icon: '⛓️',
  }
);

/** Entity binding - reversing the relationship */
const ENTITY_BINDING_NODE = createSkillNode(
  'entity-binding',
  'Entity Binding',
  PARADIGM_ID,
  'mastery',
  5,
  500,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Bind entities to serve YOU',
      target: { abilityId: 'bind_entity' },
    }),
  ],
  {
    description: 'Learn to bind entities into service',
    lore: `The ultimate reversal: instead of serving an entity, make the entity serve
you. Through perfect contract wording, overwhelming power, or true name
knowledge, you can bind demons, spirits, even lesser angels to your will.
This makes you something between mortal and god.`,
    prerequisites: ['pact-binding', 'elder-pacts'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 3000 },
        'Requires vast pact-making experience'
      ),
      createUnlockCondition(
        'node_level',
        { nodeId: 'contract-basics', level: 5 },
        'Requires perfect contract mastery'
      ),
    ],
    conditionMode: 'all',
    hidden: true,
    icon: '👑',
  }
);

/** Pact weaving - combining multiple pacts */
const PACT_WEAVING_NODE = createSkillNode(
  'pact-weaving',
  'Pact Weaving',
  PARADIGM_ID,
  'mastery',
  5,
  450,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Weave multiple pacts into synergistic whole',
      target: { abilityId: 'weave_pacts' },
    }),
  ],
  {
    description: 'Learn to weave multiple pacts into greater power',
    lore: `Most see multiple pacts as dangerous juggling. You see them as threads to
be woven. Combine an angel's protection with a demon's power. Balance a
fae's cunning with an elemental's strength. When pacts are woven properly,
their benefits multiply while their costs are distributed. This is mastery.`,
    prerequisites: ['multiple-pacts', 'entity-binding'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'multiple-pacts', level: 3 },
        'Must have mastered multiple pact maintenance'
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
    eventType: 'entity_summoned',
    xpAmount: 30,
    description: 'Successfully summon an entity',
  },
  {
    eventType: 'pact_negotiated',
    xpAmount: 100,
    description: 'Negotiate a new pact',
  },
  {
    eventType: 'pact_fulfilled',
    xpAmount: 75,
    description: 'Fulfill a pact obligation',
  },
  {
    eventType: 'loophole_found',
    xpAmount: 125,
    description: 'Find and exploit a contract loophole',
  },
  {
    eventType: 'patron_invoked',
    xpAmount: 50,
    description: 'Successfully invoke patron for aid',
  },
  {
    eventType: 'pact_transferred',
    xpAmount: 150,
    description: 'Transfer a pact to another person',
  },
  {
    eventType: 'breach_mitigated',
    xpAmount: 200,
    description: 'Successfully mitigate breach consequences',
  },
  {
    eventType: 'entity_bound',
    xpAmount: 300,
    description: 'Bind an entity to your service',
  },
];

// ============================================================================
// Tree Assembly
// ============================================================================

const ALL_NODES: MagicSkillNode[] = [
  // Foundation
  ENTITY_SENSE_NODE,
  CONTRACT_BASICS_NODE,
  SUMMONING_BASICS_NODE,
  PROTECTION_CIRCLE_NODE,

  // Patron types
  DEMON_PACTS_NODE,
  ANGEL_PACTS_NODE,
  FAE_PACTS_NODE,
  SPIRIT_PACTS_NODE,
  ELDER_PACTS_NODE,

  // Techniques
  NEGOTIATION_NODE,
  LOOPHOLE_NODE,
  MULTIPLE_PACTS_NODE,
  PACT_TRANSFER_NODE,

  // Power sources
  INVOCATION_NODE,
  GRANTED_SPELLS_NODE,
  FAMILIAR_NODE,
  TRANSFORMATION_NODE,

  // Risk management
  BREACH_DETECTION_NODE,
  MITIGATION_NODE,
  PACT_BREAKING_NODE,

  // Mastery
  PACT_BINDING_NODE,
  ENTITY_BINDING_NODE,
  PACT_WEAVING_NODE,
];

/**
 * The Pact skill tree.
 * Anyone can learn, but requires finding and summoning entities to contract with.
 */
export const PACT_SKILL_TREE: MagicSkillTree = {
  id: 'pact-tree',
  paradigmId: PARADIGM_ID,
  name: 'The Art of Pacts',
  description: 'Make binding contracts with supernatural entities to gain power in exchange for service.',
  lore: `Power comes at a price. Always. The art of pacts is about negotiating that
price - finding entities willing to bargain, crafting contracts that bind both
parties, managing obligations without being destroyed by them.

The entities you can pact with are many and varied:
- Demons (angels serving dark gods) offer great power for terrible prices
- Angels (servants of good gods) offer protection for righteous service
- Fae delight in clever wordplay and exploit ambiguity
- Spirits want simple things: respect, offerings, help
- Elder Things offer forbidden knowledge at incomprehensible cost

Every pact is a binding magical contract enforced by reality itself. Break your
word and face immediate consequences - loss of power, curses, hunts, even
unmaking. But fulfill your obligations and the power is yours.

The greatest pact-makers don't just serve entities - they bind the entities
themselves. Through perfect contract wording, overwhelming magical power, or
true name knowledge, you can reverse the relationship entirely. The demon serves
YOU. The angel obeys YOUR commands.

But this is dangerous ground. Cosmic forces notice when mortals bind their
servants. And entities don't forgive such presumption easily.`,
  nodes: ALL_NODES,
  entryNodes: ['entity-sense'],
  connections: [], // Auto-generated from prerequisites
  xpSources: XP_SOURCES,
  rules: {
    ...createDefaultTreeRules(false), // No innate requirement
    allowRespec: false, // Pacts are permanent
    permanentProgress: true,
  },
  version: 1,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate pact power based on patron type and contract quality.
 */
export function calculatePactPower(
  patronType: keyof typeof PATRON_TYPES,
  contractQuality: number, // 0-100
  relationshipStrength: number // 0-100
): number {
  // Base power by patron type
  const basePower: Record<keyof typeof PATRON_TYPES, number> = {
    demon: 90,
    angel: 85,
    fae: 75,
    spirit: 40,
    ancestor: 50,
    elemental: 70,
    elder: 100,
    archfey: 80,
    devil: 85,
    celestial: 80,
  };

  const base = basePower[patronType];
  const qualityMultiplier = 0.5 + (contractQuality / 100) * 0.5; // 0.5 to 1.0
  const relationshipMultiplier = 0.7 + (relationshipStrength / 100) * 0.6; // 0.7 to 1.3

  return Math.floor(base * qualityMultiplier * relationshipMultiplier);
}

/**
 * Get available patron types based on unlocked nodes.
 */
export function getAvailablePatrons(unlockedNodes: Record<string, number>): (keyof typeof PATRON_TYPES)[] {
  const patrons: (keyof typeof PATRON_TYPES)[] = [];

  if (unlockedNodes['spirit-pacts']) patrons.push('spirit', 'ancestor');
  if (unlockedNodes['demon-pacts']) patrons.push('demon', 'devil');
  if (unlockedNodes['angel-pacts']) patrons.push('angel', 'celestial');
  if (unlockedNodes['fae-pacts']) patrons.push('fae', 'archfey');
  if (unlockedNodes['elder-pacts']) patrons.push('elder', 'elemental');

  return patrons;
}

/**
 * Calculate maximum concurrent pacts.
 */
export function getMaxConcurrentPacts(unlockedNodes: Record<string, number>): number {
  let max = 1; // Everyone can have one pact

  if (unlockedNodes['multiple-pacts']) {
    max = 1 + unlockedNodes['multiple-pacts'];
  }
  if (unlockedNodes['pact-weaving']) {
    max += 2;
  }

  return max;
}

/**
 * Calculate breach consequence severity.
 */
export function getBreachSeverity(
  patronType: keyof typeof PATRON_TYPES,
  obligationsFulfilled: number, // 0-100%
  hasProtection: boolean
): 'minor' | 'moderate' | 'severe' | 'catastrophic' {
  const patronSeverity: Record<keyof typeof PATRON_TYPES, number> = {
    spirit: 1,
    ancestor: 1,
    angel: 2,
    fae: 2,
    elemental: 2,
    celestial: 2,
    demon: 3,
    devil: 3,
    archfey: 3,
    elder: 4,
  };

  let severity = patronSeverity[patronType];

  // Reduce severity based on how much you've fulfilled
  if (obligationsFulfilled > 80) severity -= 2;
  else if (obligationsFulfilled > 50) severity -= 1;

  // Protection helps
  if (hasProtection) severity -= 1;

  // Clamp
  severity = Math.max(0, Math.min(4, severity));

  if (severity === 0) return 'minor';
  if (severity === 1) return 'minor';
  if (severity === 2) return 'moderate';
  if (severity === 3) return 'severe';
  return 'catastrophic';
}

/**
 * Check if has the skill to safely pact with a patron type.
 */
export function canSafelyPactWith(
  patronType: keyof typeof PATRON_TYPES,
  unlockedNodes: Record<string, number>
): boolean {
  const requiredNodes: Record<keyof typeof PATRON_TYPES, string[]> = {
    spirit: ['spirit-pacts'],
    ancestor: ['spirit-pacts'],
    angel: ['angel-pacts', 'protection-circle'],
    demon: ['demon-pacts', 'protection-circle'],
    fae: ['fae-pacts', 'contract-basics'],
    elemental: ['elder-pacts'],
    celestial: ['angel-pacts'],
    devil: ['demon-pacts', 'contract-basics'],
    archfey: ['fae-pacts', 'contract-basics'],
    elder: ['elder-pacts', 'protection-circle', 'breach-detection'],
  };

  const required = requiredNodes[patronType];
  return required.every(nodeId => unlockedNodes[nodeId]);
}

/**
 * Get negotiation bonus from skills.
 */
export function getNegotiationBonus(unlockedNodes: Record<string, number>): number {
  let bonus = 0;

  if (unlockedNodes['contract-basics']) {
    bonus += 10 + (unlockedNodes['contract-basics'] - 1) * 3;
  }
  if (unlockedNodes['negotiation']) {
    bonus += 15 + (unlockedNodes['negotiation'] - 1) * 5;
  }
  if (unlockedNodes['loopholes']) {
    bonus += 20;
  }

  return bonus;
}
