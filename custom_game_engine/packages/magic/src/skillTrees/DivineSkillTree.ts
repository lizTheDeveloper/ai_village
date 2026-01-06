/**
 * DivineSkillTree - Skill tree for the Divine paradigm
 *
 * Key mechanics:
 * - Worship and devotion generate divine favor
 * - Prayer and meditation to commune with deities
 * - Miracles granted based on favor and faith
 * - Domain specialization (healing, war, knowledge, etc.)
 * - Holy/unholy power (depends on deity alignment)
 * - Ordination and clerical ranks
 * - Relics and consecrated items
 * - Divine intervention vs. granted powers
 * - Integrated with PresenceSpectrum/Divinity system
 *
 * Inspired by:
 * - D&D clerics and paladins
 * - Real-world religious traditions
 * - The concept that faith and worship create power
 * - Divine magic as granted, not learned
 * - The relationship between mortal and divine
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

const PARADIGM_ID = 'divine';

/** Divine domains (deity specializations) */
export const DIVINE_DOMAINS = {
  life: 'Healing, protection, growth, vitality',
  death: 'Endings, necromancy, rest, judgment',
  war: 'Battle, strength, tactics, victory',
  knowledge: 'Wisdom, learning, prophecy, truth',
  nature: 'Animals, plants, weather, wilderness',
  light: 'Sun, truth, revelation, purity',
  darkness: 'Shadows, secrets, stealth, fear',
  order: 'Law, justice, civilization, structure',
  chaos: 'Freedom, change, wild magic, storms',
  trickery: 'Deception, illusion, mischief, cunning',
} as const;

/** Clerical ranks */
export const CLERICAL_RANKS = {
  initiate: 'Just begun worship, no formal rank',
  acolyte: 'Dedicated follower, minor powers',
  priest: 'Ordained clergy, significant powers',
  high_priest: 'Senior clergy, temple leadership',
  prophet: 'Divine spokesperson, direct communion',
  saint: 'Blessed champion, legendary powers',
} as const;

/** Miracle categories */
export const MIRACLE_TYPES = {
  healing: 'Restore health and cure disease',
  blessing: 'Grant beneficial effects',
  curse: 'Inflict harmful effects (evil gods)',
  summoning: 'Call divine servants',
  smiting: 'Divine wrath and judgment',
  protection: 'Shields and wards',
  revelation: 'Visions and prophecy',
  consecration: 'Bless places and objects',
} as const;

/** Prayer types */
export const PRAYER_TYPES = {
  petition: 'Ask for favor or miracle',
  thanksgiving: 'Give thanks, strengthens relationship',
  intercession: 'Pray on behalf of others',
  contemplation: 'Meditate on divine nature',
  confession: 'Admit sins, restore favor',
  praise: 'Worship and glorify deity',
} as const;

// ============================================================================
// Foundation Nodes - Beginning Worship
// ============================================================================

/** Entry node - basic prayer */
const BASIC_PRAYER_NODE = createSkillNode(
  'basic-prayer',
  'Basic Prayer',
  PARADIGM_ID,
  'foundation',
  0,
  30,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Pray to your chosen deity',
      target: { abilityId: 'pray' },
    }),
  ],
  {
    description: 'Learn to pray and commune with deity',
    lore: `Prayer is the foundation of divine magic. Kneel, bow your head, and speak
to your god. They hear you - perhaps not always, perhaps not immediately,
but they hear. And sometimes, they answer.`,
    maxLevel: 5,
    levelCostMultiplier: 1.3,
    icon: '🙏',
  }
);

/** Divine sense - feeling divine presence */
const DIVINE_SENSE_NODE = createSkillNode(
  'divine-sense',
  'Divine Awareness',
  PARADIGM_ID,
  'foundation',
  1,
  60,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Sense divine presence and favor',
      target: { abilityId: 'sense_divine' },
    }),
  ],
  {
    description: 'Sense divine presence and favor',
    lore: `You learn to feel when the divine is near - a warmth, a presence, a sense
of being watched. You can also sense your standing with your deity: are
they pleased? Angry? Indifferent? This awareness guides your worship.`,
    prerequisites: ['basic-prayer'],
    maxLevel: 3,
  }
);

/** Devotion - commitment to deity */
const DEVOTION_NODE = createSkillNode(
  'devotion',
  'True Devotion',
  PARADIGM_ID,
  'foundation',
  1,
  75,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Demonstrate true devotion to deity',
      target: { abilityId: 'devotion' },
    }),
  ],
  {
    description: 'Develop true devotion to your deity',
    lore: `Faith without devotion is hollow. You must commit - not just words but
actions, lifestyle, sacrifice. Follow your deity's commandments. Live by
their principles. This devotion is what earns divine favor.`,
    prerequisites: ['basic-prayer'],
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

/** Ritual knowledge - proper worship */
const RITUAL_KNOWLEDGE_NODE = createSkillNode(
  'ritual-knowledge',
  'Ritual Knowledge',
  PARADIGM_ID,
  'foundation',
  2,
  100,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Perform proper religious rituals',
      target: { abilityId: 'ritual' },
    }),
  ],
  {
    description: 'Learn proper religious rituals',
    lore: `Each deity has their own rites and rituals - specific prayers, offerings,
ceremonies. Learn these properly and your worship is magnified. Perform
them wrong and you might offend rather than please.`,
    prerequisites: ['basic-prayer', 'devotion'],
  }
);

// ============================================================================
// Domain Nodes - Specializations
// ============================================================================

/** Life domain - healing and protection */
const LIFE_DOMAIN_NODE = createSkillNode(
  'life-domain',
  'Life Domain',
  PARADIGM_ID,
  'specialization',
  2,
  150,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Channel divine life energy for healing',
      target: { abilityId: 'divine_healing' },
    }),
  ],
  {
    description: 'Specialize in the Life domain',
    lore: `Your deity grants power over life - healing wounds, curing disease,
protecting the living. This is the domain of mercy and compassion.`,
    prerequisites: ['ritual-knowledge'],
    unlockConditions: [
      createUnlockCondition(
        'attention_given',
        { deityDomain: 'life' },
        'Deity must have Life domain'
      ),
    ],
    conditionMode: 'all',
    icon: '💚',
  }
);

/** War domain - battle and strength */
const WAR_DOMAIN_NODE = createSkillNode(
  'war-domain',
  'War Domain',
  PARADIGM_ID,
  'specialization',
  2,
  150,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Channel divine power in battle',
      target: { abilityId: 'divine_might' },
    }),
  ],
  {
    description: 'Specialize in the War domain',
    lore: `Your deity grants power in battle - strength, endurance, tactical insight.
This is the domain of holy warriors and crusaders.`,
    prerequisites: ['ritual-knowledge'],
    unlockConditions: [
      createUnlockCondition(
        'attention_given',
        { deityDomain: 'war' },
        'Deity must have War domain'
      ),
    ],
    conditionMode: 'all',
    icon: '⚔️',
  }
);

/** Knowledge domain - wisdom and prophecy */
const KNOWLEDGE_DOMAIN_NODE = createSkillNode(
  'knowledge-domain',
  'Knowledge Domain',
  PARADIGM_ID,
  'specialization',
  2,
  150,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Channel divine wisdom and prophecy',
      target: { abilityId: 'divine_wisdom' },
    }),
  ],
  {
    description: 'Specialize in the Knowledge domain',
    lore: `Your deity grants wisdom - insights, prophecies, understanding. This is
the domain of scholars and oracles.`,
    prerequisites: ['ritual-knowledge'],
    unlockConditions: [
      createUnlockCondition(
        'attention_given',
        { deityDomain: 'knowledge' },
        'Deity must have Knowledge domain'
      ),
    ],
    conditionMode: 'all',
    icon: '📜',
  }
);

// ============================================================================
// Clerical Advancement Nodes
// ============================================================================

/** Ordination - becoming clergy */
const ORDINATION_NODE = createSkillNode(
  'ordination',
  'Ordination',
  PARADIGM_ID,
  'ritual',
  3,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Become ordained clergy',
      target: { abilityId: 'ordained' },
    }),
  ],
  {
    description: 'Undergo ordination as clergy',
    lore: `Ordination is formal recognition by your faith. You become an official
representative of your deity - a priest, capable of performing sacred
rites that laypeople cannot. This brings power but also responsibility.`,
    prerequisites: ['ritual-knowledge', 'devotion'],
    unlockConditions: [
      createUnlockCondition(
        'attention_given',
        { minimumFavor: 100 },
        'Must have significant divine favor'
      ),
      createUnlockCondition(
        'teacher_found',
        { teacherType: 'high_priest' },
        'Must be ordained by senior clergy'
      ),
    ],
    conditionMode: 'all',
    icon: '⛪',
  }
);

/** Channel divinity - direct power */
const CHANNEL_DIVINITY_NODE = createSkillNode(
  'channel-divinity',
  'Channel Divinity',
  PARADIGM_ID,
  'channeling',
  3,
  225,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Channel raw divine power',
      target: { abilityId: 'channel_divine' },
    }),
  ],
  {
    description: 'Learn to channel divine power directly',
    lore: `Become a conduit for divine power. Your deity's energy flows through you,
manifesting as miracles. This is exhausting and dangerous - too much divine
power can burn out a mortal vessel - but incredibly effective.`,
    prerequisites: ['ordination', 'life-domain'],
    maxLevel: 5,
  }
);

/** Divine communion - direct communication */
const DIVINE_COMMUNION_NODE = createSkillNode(
  'divine-communion',
  'Divine Communion',
  PARADIGM_ID,
  'ritual',
  4,
  300,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Commune directly with your deity',
      target: { abilityId: 'commune' },
    }),
  ],
  {
    description: 'Achieve direct communion with deity',
    lore: `Most prayers are one-way. But with true devotion and proper ritual, you
can achieve communion - two-way conversation with your deity. Ask questions,
receive guidance, understand divine will. This is the privilege of the
most faithful.`,
    prerequisites: ['channel-divinity', 'divine-sense'],
    unlockConditions: [
      createUnlockCondition(
        'attention_given',
        { minimumFavor: 500 },
        'Must have exceptional divine favor'
      ),
    ],
    conditionMode: 'all',
  }
);

// ============================================================================
// Miracle Nodes - Granted Powers
// ============================================================================

/** Healing miracles - cure wounds */
const HEALING_MIRACLES_NODE = createSkillNode(
  'healing-miracles',
  'Healing Miracles',
  PARADIGM_ID,
  'channeling',
  2,
  125,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Perform healing miracles',
      target: { abilityId: 'heal' },
    }),
  ],
  {
    description: 'Perform miracles of healing',
    lore: `Call upon divine power to heal wounds, cure disease, restore life. The
power isn't yours - it flows from your deity. You're just the channel.`,
    prerequisites: ['channel-divinity', 'life-domain'],
    maxLevel: 5,
  }
);

/** Blessing miracles - beneficial effects */
const BLESSING_MIRACLES_NODE = createSkillNode(
  'blessing-miracles',
  'Blessing Miracles',
  PARADIGM_ID,
  'channeling',
  2,
  125,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Grant divine blessings',
      target: { abilityId: 'bless' },
    }),
  ],
  {
    description: 'Grant blessings in deity\'s name',
    lore: `Bless others with divine favor - luck, strength, protection, courage.
These blessings are temporary but powerful, carrying a touch of the divine.`,
    prerequisites: ['channel-divinity'],
  }
);

/** Smiting miracles - divine wrath */
const SMITING_MIRACLES_NODE = createSkillNode(
  'smiting-miracles',
  'Smiting Miracles',
  PARADIGM_ID,
  'channeling',
  3,
  175,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Call down divine wrath',
      target: { abilityId: 'smite' },
    }),
  ],
  {
    description: 'Invoke divine wrath against enemies',
    lore: `Your deity's enemies are your enemies. Call down their wrath - smiting
foes with holy (or unholy) fire, striking them down with divine judgment.
This is righteous fury made manifest.`,
    prerequisites: ['channel-divinity', 'war-domain'],
    maxLevel: 5,
  }
);

/** Protection miracles - divine shields */
const PROTECTION_MIRACLES_NODE = createSkillNode(
  'protection-miracles',
  'Protection Miracles',
  PARADIGM_ID,
  'channeling',
  3,
  150,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Create divine protections',
      target: { abilityId: 'divine_shield' },
    }),
  ],
  {
    description: 'Create divine protections',
    lore: `Call upon divine protection - shields of faith that deflect harm, wards
that repel evil, sanctuaries where the faithful are safe. Your deity
guards those under their protection.`,
    prerequisites: ['channel-divinity'],
  }
);

// ============================================================================
// Advanced Techniques
// ============================================================================

/** Consecration - blessing places */
const CONSECRATION_NODE = createSkillNode(
  'consecration',
  'Consecration',
  PARADIGM_ID,
  'ritual',
  3,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Consecrate places and objects',
      target: { abilityId: 'consecrate' },
    }),
  ],
  {
    description: 'Learn to consecrate places and objects',
    lore: `Make places and objects holy. A consecrated temple radiates divine power.
A consecrated weapon smites evil. A consecrated shield protects the
righteous. This ritual binds divine energy to physical form.`,
    prerequisites: ['ordination', 'ritual-knowledge'],
  }
);

/** Relic creation - making holy items */
const RELIC_CREATION_NODE = createSkillNode(
  'relic-creation',
  'Relic Creation',
  PARADIGM_ID,
  'ritual',
  4,
  300,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Create holy relics',
      target: { abilityId: 'create_relic' },
    }),
  ],
  {
    description: 'Learn to create divine relics',
    lore: `A relic is more than just a consecrated object - it's a permanent vessel
of divine power. Creating one requires exceptional favor, proper materials,
and intensive ritual. But once made, a relic becomes an eternal symbol of
your deity's power.`,
    prerequisites: ['consecration', 'divine-communion'],
    unlockConditions: [
      createUnlockCondition(
        'attention_given',
        { minimumFavor: 1000 },
        'Must have immense divine favor'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Divine intervention - calling for help */
const DIVINE_INTERVENTION_NODE = createSkillNode(
  'divine-intervention',
  'Divine Intervention',
  PARADIGM_ID,
  'channeling',
  4,
  350,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Call for direct divine intervention',
      target: { abilityId: 'intervention' },
    }),
  ],
  {
    description: 'Call upon deity for direct intervention',
    lore: `In moments of desperate need, call directly upon your deity to intervene.
They may appear, send an avatar, or simply bend reality to your aid. This
uses massive favor and cannot be done often - but when it works, it's
miraculous.`,
    prerequisites: ['divine-communion', 'channel-divinity'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'devotion', level: 5 },
        'Requires absolute devotion'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Avatar manifestation - deity's physical form */
const AVATAR_MANIFESTATION_NODE = createSkillNode(
  'avatar-manifestation',
  'Avatar Manifestation',
  PARADIGM_ID,
  'mastery',
  5,
  500,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Serve as avatar for deity\'s manifestation',
      target: { abilityId: 'avatar' },
    }),
  ],
  {
    description: 'Become avatar for deity manifestation',
    lore: `The ultimate expression of devotion: allow your deity to manifest directly
through you. Your body becomes their vessel, your voice their voice. While
manifested, you wield a fraction of true divine power. But this is dangerous -
not all mortals survive being an avatar.`,
    prerequisites: ['divine-intervention', 'channel-divinity'],
    unlockConditions: [
      createUnlockCondition(
        'attention_given',
        { minimumFavor: 2000 },
        'Must be chosen by deity'
      ),
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 2500 },
        'Requires vast divine experience'
      ),
    ],
    conditionMode: 'all',
    hidden: true,
    icon: '👑',
  }
);

// ============================================================================
// XP Sources
// ============================================================================

const XP_SOURCES: MagicXPSource[] = [
  {
    eventType: 'prayer_offered',
    xpAmount: 10,
    description: 'Offer sincere prayer',
  },
  {
    eventType: 'ritual_performed',
    xpAmount: 30,
    description: 'Perform proper religious ritual',
  },
  {
    eventType: 'miracle_performed',
    xpAmount: 50,
    description: 'Successfully perform a miracle',
  },
  {
    eventType: 'devotion_demonstrated',
    xpAmount: 40,
    description: 'Demonstrate true devotion',
  },
  {
    eventType: 'convert_gained',
    xpAmount: 100,
    description: 'Convert someone to your faith',
  },
  {
    eventType: 'temple_consecrated',
    xpAmount: 200,
    description: 'Consecrate a temple or shrine',
  },
  {
    eventType: 'relic_created',
    xpAmount: 300,
    description: 'Create a divine relic',
  },
  {
    eventType: 'divine_communion_achieved',
    xpAmount: 150,
    description: 'Achieve direct communion with deity',
  },
];

// ============================================================================
// Tree Assembly
// ============================================================================

const ALL_NODES: MagicSkillNode[] = [
  // Foundation
  BASIC_PRAYER_NODE,
  DIVINE_SENSE_NODE,
  DEVOTION_NODE,
  RITUAL_KNOWLEDGE_NODE,

  // Domains (only 3 shown, but there are 10 total domains)
  LIFE_DOMAIN_NODE,
  WAR_DOMAIN_NODE,
  KNOWLEDGE_DOMAIN_NODE,

  // Clerical advancement
  ORDINATION_NODE,
  CHANNEL_DIVINITY_NODE,
  DIVINE_COMMUNION_NODE,

  // Miracles
  HEALING_MIRACLES_NODE,
  BLESSING_MIRACLES_NODE,
  SMITING_MIRACLES_NODE,
  PROTECTION_MIRACLES_NODE,

  // Advanced
  CONSECRATION_NODE,
  RELIC_CREATION_NODE,
  DIVINE_INTERVENTION_NODE,
  AVATAR_MANIFESTATION_NODE,
];

/**
 * The Divine skill tree.
 * Anyone can worship, but power comes from the deity's favor.
 */
export const DIVINE_SKILL_TREE: MagicSkillTree = {
  id: 'divine-tree',
  paradigmId: PARADIGM_ID,
  name: 'The Divine Path',
  description: 'Worship deities to gain their favor and channel divine power through prayer and devotion.',
  lore: `Divine magic is not learned but granted. It flows from the gods to their
faithful followers. You cannot steal it, study it, or master it through will
alone. You can only worship, pray, and hope your deity deems you worthy.

The path begins simply: choose a deity and begin to worship. Pray regularly.
Follow their commandments. Demonstrate devotion through action, not just words.
Over time, if you prove faithful, you'll gain favor. And with favor comes power.

Different deities grant different powers based on their domains. A god of life
grants healing and protection. A god of war grants strength and battle prowess.
A god of knowledge grants wisdom and prophecy. Choose your deity carefully -
you'll be bound to their domain.

As you advance, you may be ordained as clergy - an official representative of
your faith. This brings formal powers: the ability to consecrate places, perform
sacred rites, and channel divinity directly. The most devoted can achieve
communion - direct conversation with their deity.

The miracles you perform aren't your power - they're your deity's power flowing
through you. You're a conduit, a channel, a vessel. This means your power is
limited by your deity's favor. Displease them and you lose everything. Remain
faithful and you gain access to truly miraculous abilities.

The greatest clerics can create relics - permanent vessels of divine power. They
can call for divine intervention in moments of need. The most favored can even
serve as avatars - allowing their deity to manifest directly through their body.

This is not a path of personal power but of service and devotion. You grow
strong not through mastery but through faith.`,
  nodes: ALL_NODES,
  entryNodes: ['basic-prayer'],
  connections: [], // Auto-generated from prerequisites
  xpSources: XP_SOURCES,
  rules: {
    ...createDefaultTreeRules(false), // No innate requirement
    allowRespec: false, // Faith commitments are permanent
    permanentProgress: true,
  },
  version: 1,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate miracle power based on divine favor.
 */
export function calculateMiraclePower(
  divineFavor: number, // From PresenceSpectrum
  channelLevel: number,
  devotionLevel: number
): number {
  let power = divineFavor / 10; // Base from favor

  if (channelLevel > 0) {
    power *= 1 + (channelLevel * 0.3);
  }
  if (devotionLevel > 0) {
    power *= 1 + (devotionLevel * 0.2);
  }

  return Math.floor(power);
}

/**
 * Get available domains based on chosen deity.
 */
export function getAvailableDomains(deityDomains: (keyof typeof DIVINE_DOMAINS)[]): (keyof typeof DIVINE_DOMAINS)[] {
  // Deities typically have 2-3 domains
  return deityDomains;
}

/**
 * Calculate divine favor drain for miracle.
 */
export function calculateFavorCost(
  miracleType: keyof typeof MIRACLE_TYPES,
  power: number,
  channelEfficiency: number = 0 // 0-100
): number {
  const baseCost: Record<keyof typeof MIRACLE_TYPES, number> = {
    healing: 20,
    blessing: 15,
    curse: 25,
    summoning: 50,
    smiting: 40,
    protection: 30,
    revelation: 35,
    consecration: 100,
  };

  const base = baseCost[miracleType];
  const powerMult = power / 100;
  const efficiencyMult = 1 - (channelEfficiency / 100);

  return Math.ceil(base * powerMult * efficiencyMult);
}

/**
 * Get clerical rank based on favor and ordination.
 */
export function getClericalRank(
  divineFavor: number,
  isOrdained: boolean,
  hasCommunion: boolean
): keyof typeof CLERICAL_RANKS {
  if (!isOrdained) {
    return divineFavor >= 50 ? 'acolyte' : 'initiate';
  }

  if (hasCommunion && divineFavor >= 2000) return 'saint';
  if (hasCommunion && divineFavor >= 1000) return 'prophet';
  if (divineFavor >= 500) return 'high_priest';
  return 'priest';
}

/**
 * Check if can perform miracle type.
 */
export function canPerformMiracle(
  miracleType: keyof typeof MIRACLE_TYPES,
  unlockedNodes: Record<string, number>,
  divineFavor: number
): boolean {
  const requiredNodes: Record<keyof typeof MIRACLE_TYPES, string> = {
    healing: 'healing-miracles',
    blessing: 'blessing-miracles',
    curse: 'smiting-miracles', // Evil variant
    summoning: 'divine-communion',
    smiting: 'smiting-miracles',
    protection: 'protection-miracles',
    revelation: 'knowledge-domain',
    consecration: 'consecration',
  };

  const requiredFavor: Record<keyof typeof MIRACLE_TYPES, number> = {
    healing: 50,
    blessing: 30,
    curse: 100,
    summoning: 200,
    smiting: 75,
    protection: 40,
    revelation: 60,
    consecration: 150,
  };

  return (
    !!unlockedNodes[requiredNodes[miracleType]] &&
    divineFavor >= requiredFavor[miracleType]
  );
}

/**
 * Get prayer effectiveness based on devotion.
 */
export function getPrayerEffectiveness(
  devotionLevel: number,
  prayerLevel: number,
  recentSins: number // 0-100, how much you've displeased deity
): number {
  let effectiveness = 50; // Base

  if (devotionLevel > 0) {
    effectiveness += 10 + (devotionLevel - 1) * 5;
  }
  if (prayerLevel > 0) {
    effectiveness += 5 + (prayerLevel - 1) * 3;
  }

  // Sins reduce effectiveness
  effectiveness -= recentSins * 0.5;

  return Math.max(0, Math.min(100, effectiveness));
}
