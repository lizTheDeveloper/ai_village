/**
 * BloodSkillTree - Skill tree for the Blood paradigm
 *
 * Key mechanics:
 * - Blood as magical fuel (self-sacrifice or others' blood)
 * - Vitality management (health as a resource)
 * - Bloodline powers (inherited magical traits)
 * - Blood bonds (magical connections between people)
 * - Regeneration and life extension
 * - Hemomancy (blood manipulation)
 * - Power scaling with sacrifice magnitude
 * - Dark/forbidden techniques
 *
 * Inspired by:
 * - Blood magic from various fantasy traditions
 * - Hemomancy and vitae from Vampire: The Masquerade
 * - The concept of sacrifice empowering magic
 * - Bloodline inheritance of power
 * - Life force as the ultimate magical currency
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

const PARADIGM_ID = 'blood';

/** Blood sources and their power */
export const BLOOD_SOURCES = {
  self: 'Your own blood - safest but costs health',
  willing: 'Freely given by others - moderate power',
  animal: 'Animal blood - weak but abundant',
  enemy: 'Blood of defeated foes - powerful',
  sacrifice: 'Ritual sacrifice - immense power',
  royal: 'Blood of royalty - rare and potent',
  innocent: 'Blood of the innocent - forbidden, catastrophic power',
  divine: 'Blood of divine beings - legendary',
} as const;

/** Bloodline types - inherited powers */
export const BLOODLINES = {
  mage: 'Ancient mage bloodline - natural affinity for magic',
  dragon: 'Draconic ancestry - fire, scales, intimidation',
  fae: 'Fae-touched bloodline - beauty, charm, illusion',
  demon: 'Infernal bloodline - darkness, fire, corruption',
  angel: 'Celestial bloodline - light, healing, wings',
  beast: 'Shapeshifter bloodline - animal transformation',
  vampire: 'Vampiric bloodline - undeath, blood hunger',
  elemental: 'Elemental bloodline - power over an element',
  royal: 'Royal bloodline - leadership, authority',
  witch: 'Witch bloodline - curses, hexes, prophecy',
} as const;

/** Blood magic techniques */
export const BLOOD_TECHNIQUES = {
  fueling: 'Use blood as magical fuel',
  sensing: 'Sense life force and bloodlines',
  bonding: 'Create magical connections through blood',
  healing: 'Regenerate using blood magic',
  cursing: 'Afflict others through their blood',
  shaping: 'Manipulate blood physically',
  draining: 'Extract life force from others',
  transfusion: 'Transfer vitality between people',
} as const;

/** Sacrifice scales */
export const SACRIFICE_SCALES = {
  minor: 'Small cut, drop of blood - 1-5% health',
  moderate: 'Serious cut, cup of blood - 10-20% health',
  major: 'Deep wound, pint of blood - 25-40% health',
  severe: 'Grievous wound, much blood - 50-70% health',
  mortal: 'Life-threatening, near death - 80-95% health',
  ultimate: 'Death itself - 100% health, permanent',
} as const;

// ============================================================================
// Foundation Nodes - Learning Blood Magic
// ============================================================================

/** Entry node - sensing blood/vitality */
const BLOOD_SENSE_NODE = createSkillNode(
  'blood-sense',
  'Blood Awareness',
  PARADIGM_ID,
  'foundation',
  0,
  35,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Sense blood and vitality in living things',
      target: { abilityId: 'sense_blood' },
    }),
  ],
  {
    description: 'Learn to sense the life force in blood',
    lore: `Blood is life. Every drop contains vitality, power, essence. You learn
to feel it - the pulse of life in yourself and others. The stronger the
life force, the brighter it shines to your senses.`,
    maxLevel: 3,
    levelCostMultiplier: 1.3,
    icon: '🩸',
  }
);

/** Basic sacrifice - using your own blood */
const BASIC_SACRIFICE_NODE = createSkillNode(
  'basic-sacrifice',
  'Self-Sacrifice',
  PARADIGM_ID,
  'foundation',
  1,
  60,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Use your own blood to fuel magic',
      target: { abilityId: 'blood_fuel' },
    }),
  ],
  {
    description: 'Learn to use your own blood as magical fuel',
    lore: `The first lesson: your own blood is the safest source. Cut your palm,
speak the words, and your blood becomes power. It hurts, yes. It weakens
you, yes. But it's honest magic - no debt to others, no corruption of
innocents. Just your pain for your power.`,
    prerequisites: ['blood-sense'],
    unlockConditions: [
      createUnlockCondition(
        'teacher_found',
        { teacherType: 'blood_mage' },
        'Must be taught by a blood mage'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Pain tolerance - enduring sacrifice */
const PAIN_TOLERANCE_NODE = createSkillNode(
  'pain-tolerance',
  'Pain Mastery',
  PARADIGM_ID,
  'foundation',
  1,
  75,
  [
    createSkillEffect('resource_efficiency', 15, {
      perLevelValue: 5,
      description: 'Reduce health cost of blood magic by X%',
    }),
  ],
  {
    description: 'Learn to tolerate the pain of sacrifice',
    lore: `Blood magic hurts. Every time. But pain is just sensation - you can learn
to endure it, to function through it, even to use it. Master pain and you
master blood magic.`,
    prerequisites: ['basic-sacrifice'],
    maxLevel: 5,
    levelCostMultiplier: 1.4,
  }
);

/** Wound sealing - stopping the bleeding */
const WOUND_SEALING_NODE = createSkillNode(
  'wound-sealing',
  'Wound Sealing',
  PARADIGM_ID,
  'foundation',
  2,
  100,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Seal wounds with blood magic',
      target: { abilityId: 'seal_wound' },
    }),
  ],
  {
    description: 'Learn to seal wounds instantly with blood magic',
    lore: `After sacrifice comes sealing. Speak the word and your blood crystallizes,
sealing the wound, stopping the bleeding. You'll still need time to heal,
but at least you won't bleed out in the middle of a ritual.`,
    prerequisites: ['basic-sacrifice'],
  }
);

// ============================================================================
// Bloodline Nodes - Inherited Powers
// ============================================================================

/** Bloodline awakening - activating heritage */
const BLOODLINE_AWAKENING_NODE = createSkillNode(
  'bloodline-awakening',
  'Bloodline Awakening',
  PARADIGM_ID,
  'discovery',
  2,
  150,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Awaken dormant bloodline powers',
      target: { abilityId: 'awaken_bloodline' },
    }),
  ],
  {
    description: 'Awaken the powers sleeping in your blood',
    lore: `Your ancestors' power flows in your veins - dormant, waiting. Through
ritual and sacrifice, you can awaken it. Dragon blood grants scales and
fire. Fae blood grants beauty and illusion. What does yours hold?`,
    prerequisites: ['blood-sense', 'basic-sacrifice'],
    unlockConditions: [
      createUnlockCondition(
        'bloodline',
        { minimumStrength: 0.3 },
        'Must have significant bloodline heritage'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Bloodline strengthening - enhancing heritage */
const BLOODLINE_STRENGTHEN_NODE = createSkillNode(
  'bloodline-strengthen',
  'Bloodline Refinement',
  PARADIGM_ID,
  'discovery',
  3,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Strengthen your bloodline through ritual',
      target: { abilityId: 'strengthen_bloodline' },
    }),
  ],
  {
    description: 'Strengthen your bloodline beyond natural limits',
    lore: `Your blood can be refined, concentrated, purified. Through careful ritual
and the blood of those who share your heritage, you can strengthen the
bloodline beyond what inheritance gave you. Become more than your ancestors.`,
    prerequisites: ['bloodline-awakening'],
    maxLevel: 5,
  }
);

/** Bloodline theft - stealing heritage */
const BLOODLINE_THEFT_NODE = createSkillNode(
  'bloodline-theft',
  'Bloodline Theft',
  PARADIGM_ID,
  'mastery',
  4,
  350,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Steal bloodline powers from others',
      target: { abilityId: 'steal_bloodline' },
    }),
  ],
  {
    description: 'Learn to steal others\' bloodline powers',
    lore: `The darkest use of bloodline magic: taking the heritage of another. Drink
their blood in ritual, and their powers become yours. Dragon fire, fae
charm, demonic strength - all can be stolen. But this is corruption of
the deepest kind.`,
    prerequisites: ['bloodline-strengthen'],
    unlockConditions: [
      createUnlockCondition(
        'secret_revealed',
        { secretId: 'bloodline_theft_ritual' },
        'Must learn the forbidden ritual'
      ),
    ],
    conditionMode: 'all',
    icon: '💀',
  }
);

// ============================================================================
// Blood Techniques - Manipulating Blood
// ============================================================================

/** Hemomancy - controlling blood physically */
const HEMOMANCY_NODE = createSkillNode(
  'hemomancy',
  'Blood Shaping',
  PARADIGM_ID,
  'technique',
  2,
  125,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Manipulate blood physically',
      target: { abilityId: 'shape_blood' },
    }),
  ],
  {
    description: 'Learn to control and shape blood',
    lore: `Blood obeys you. Make it flow uphill. Freeze it into weapons. Boil enemies'
blood in their veins. This is hemomancy - direct control over blood itself.
Terrifying and effective.`,
    prerequisites: ['basic-sacrifice', 'blood-sense'],
    maxLevel: 5,
  }
);

/** Blood scrying - seeing through blood */
const BLOOD_SCRYING_NODE = createSkillNode(
  'blood-scrying',
  'Blood Scrying',
  PARADIGM_ID,
  'technique',
  2,
  100,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Scry using blood as a focus',
      target: { abilityId: 'blood_scry' },
    }),
  ],
  {
    description: 'Use blood to scry and see distant places',
    lore: `A drop of someone's blood is a connection to them. Use it as a focus and
you can see through their eyes, feel what they feel, know where they are.
The more blood, the clearer the connection.`,
    prerequisites: ['blood-sense'],
  }
);

/** Blood tracking - following the trail */
const BLOOD_TRACKING_NODE = createSkillNode(
  'blood-tracking',
  'Blood Tracking',
  PARADIGM_ID,
  'technique',
  2,
  90,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Track creatures through blood traces',
      target: { abilityId: 'track_blood' },
    }),
  ],
  {
    description: 'Track prey through blood traces',
    lore: `Every wound leaves blood. Every blood drop is a beacon. You can follow
these traces across vast distances, sensing the life force that shed them.
Hunters find this invaluable.`,
    prerequisites: ['blood-sense'],
  }
);

/** Blood cursing - afflicting through blood */
const BLOOD_CURSING_NODE = createSkillNode(
  'blood-cursing',
  'Blood Curses',
  PARADIGM_ID,
  'technique',
  3,
  175,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Curse others through their blood',
      target: { abilityId: 'blood_curse' },
    }),
  ],
  {
    description: 'Learn to curse others through blood connection',
    lore: `With their blood, you can afflict them. Sickness, weakness, pain, misfortune.
The curse flows through the blood connection, inevitable and inescapable.
This is why blood mages are feared.`,
    prerequisites: ['hemomancy', 'blood-scrying'],
    icon: '💀',
  }
);

// ============================================================================
// Blood Bonds - Magical Connections
// ============================================================================

/** Blood bonding - creating connections */
const BLOOD_BONDING_NODE = createSkillNode(
  'blood-bonding',
  'Blood Bonds',
  PARADIGM_ID,
  'ritual',
  2,
  150,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Create magical bonds through shared blood',
      target: { abilityId: 'blood_bond' },
    }),
  ],
  {
    description: 'Create bonds by mixing blood',
    lore: `Mix your blood with another's in ritual, and you become bonded. You feel
what they feel. You know when they're in danger. You can lend them strength
or share their pain. This is how blood pacts are sealed.`,
    prerequisites: ['basic-sacrifice'],
  }
);

/** Life sharing - connecting vitality */
const LIFE_SHARING_NODE = createSkillNode(
  'life-sharing',
  'Life Sharing',
  PARADIGM_ID,
  'ritual',
  3,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Share life force through blood bonds',
      target: { abilityId: 'share_life' },
    }),
  ],
  {
    description: 'Share vitality through blood bonds',
    lore: `Through a blood bond, you can transfer life force. Heal them by giving
your vitality. Take their injuries upon yourself. Die for them, if necessary,
your life flowing into theirs. This is the deepest sacrifice.`,
    prerequisites: ['blood-bonding', 'wound-sealing'],
  }
);

/** Bond breaking - severing connections */
const BOND_BREAKING_NODE = createSkillNode(
  'bond-breaking',
  'Bond Severing',
  PARADIGM_ID,
  'ritual',
  3,
  175,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Sever blood bonds',
      target: { abilityId: 'break_bond' },
    }),
  ],
  {
    description: 'Learn to sever blood bonds',
    lore: `Blood bonds are permanent - unless you know how to break them. Ritual,
sacrifice, and willpower can sever even the strongest bond. This frees
you but leaves a scar on the soul.`,
    prerequisites: ['blood-bonding'],
  }
);

// ============================================================================
// Vitality Manipulation - Life Force Control
// ============================================================================

/** Regeneration - enhanced healing */
const REGENERATION_NODE = createSkillNode(
  'regeneration',
  'Blood Regeneration',
  PARADIGM_ID,
  'channeling',
  2,
  125,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Regenerate health using blood magic',
      target: { abilityId: 'regenerate' },
    }),
  ],
  {
    description: 'Regenerate wounds using blood magic',
    lore: `Your blood can heal you faster than natural. Accelerate healing, close
wounds, regrow tissue. Costs blood to fuel blood, but in emergencies this
can save your life.`,
    prerequisites: ['wound-sealing', 'pain-tolerance'],
    maxLevel: 5,
  }
);

/** Life extension - delaying death */
const LIFE_EXTENSION_NODE = createSkillNode(
  'life-extension',
  'Life Extension',
  PARADIGM_ID,
  'channeling',
  3,
  250,
  [
    createSkillEffect('lifespan', 100, {
      perLevelValue: 50,
      description: 'Extend lifespan by X years',
    }),
  ],
  {
    description: 'Extend your lifespan through blood magic',
    lore: `Blood is life, and with enough blood, life can be extended. Age slower.
Resist disease. Recover from what should be mortal wounds. This doesn't
grant true immortality - but centuries instead of decades.`,
    prerequisites: ['regeneration'],
    maxLevel: 5,
  }
);

/** Vitality drain - stealing life */
const VITALITY_DRAIN_NODE = createSkillNode(
  'vitality-drain',
  'Life Drain',
  PARADIGM_ID,
  'technique',
  3,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Drain life force from others',
      target: { abilityId: 'drain_life' },
    }),
  ],
  {
    description: 'Drain life force from living creatures',
    lore: `Touch them and pull their vitality into yourself. Their wounds become your
healing. Their strength becomes your strength. This is vampiric magic -
sustaining yourself by draining others.`,
    prerequisites: ['hemomancy', 'regeneration'],
    icon: '🧛',
  }
);

/** Vitality transfer - giving life */
const VITALITY_TRANSFER_NODE = createSkillNode(
  'vitality-transfer',
  'Life Transfusion',
  PARADIGM_ID,
  'technique',
  3,
  175,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Transfer your vitality to others',
      target: { abilityId: 'transfer_life' },
    }),
  ],
  {
    description: 'Transfer your vitality to heal others',
    lore: `The opposite of draining: give your life force to another. Heal their
wounds with your blood. Restore their strength with your vitality. Die
so they might live. This is the healer's sacrifice.`,
    prerequisites: ['regeneration', 'life-sharing'],
  }
);

// ============================================================================
// Advanced/Forbidden Techniques
// ============================================================================

/** Blood puppetry - controlling others */
const BLOOD_PUPPETRY_NODE = createSkillNode(
  'blood-puppetry',
  'Blood Puppetry',
  PARADIGM_ID,
  'mastery',
  4,
  350,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Control others through their blood',
      target: { abilityId: 'blood_puppet' },
    }),
  ],
  {
    description: 'Control others\' bodies through their blood',
    lore: `With enough of their blood, you can control them - force them to move,
speak, act against their will. Their blood becomes puppet strings. This
is abomination - violating free will through blood magic.`,
    prerequisites: ['hemomancy', 'blood-cursing'],
    unlockConditions: [
      createUnlockCondition(
        'secret_revealed',
        { secretId: 'blood_puppetry_technique' },
        'Must learn the forbidden technique'
      ),
    ],
    conditionMode: 'all',
    icon: '🎭',
  }
);

/** Blood resurrection - returning from death */
const BLOOD_RESURRECTION_NODE = createSkillNode(
  'blood-resurrection',
  'Blood Resurrection',
  PARADIGM_ID,
  'mastery',
  5,
  500,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Return from death through blood',
      target: { abilityId: 'blood_resurrect' },
    }),
  ],
  {
    description: 'Resurrect through prepared blood phylacteries',
    lore: `The ultimate blood magic: defeat death itself. Store your life essence in
blood phylacteries - vials of your blood preserved through ritual. When
you die, your soul flows into the nearest phylactery and regenerates a
new body. True immortality - at a terrible price.`,
    prerequisites: ['life-extension', 'vitality-transfer'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 3000 },
        'Requires vast blood magic experience'
      ),
    ],
    conditionMode: 'all',
    hidden: true,
    icon: '♾️',
  }
);

/** Sanguine apotheosis - becoming blood itself */
const SANGUINE_APOTHEOSIS_NODE = createSkillNode(
  'sanguine-apotheosis',
  'Sanguine Apotheosis',
  PARADIGM_ID,
  'mastery',
  5,
  600,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Transform into living blood',
      target: { abilityId: 'blood_form' },
    }),
  ],
  {
    description: 'Achieve apotheosis - become living blood',
    lore: `The pinnacle of blood magic: transform your entire being into animated
blood. No fixed form, no mortal weakness. Flow through cracks, reform from
drops, exist as pure life force. You become blood incarnate - neither fully
alive nor dead, but eternal.`,
    prerequisites: ['blood-resurrection', 'hemomancy'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'hemomancy', level: 5 },
        'Requires perfect blood control'
      ),
      createUnlockCondition(
        'node_level',
        { nodeId: 'life-extension', level: 5 },
        'Requires mastery of life extension'
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
    eventType: 'blood_sacrificed',
    xpAmount: 15,
    description: 'Sacrifice blood to fuel magic',
  },
  {
    eventType: 'wound_healed_blood',
    xpAmount: 25,
    description: 'Heal a wound with blood magic',
  },
  {
    eventType: 'blood_bond_created',
    xpAmount: 100,
    description: 'Create a blood bond',
  },
  {
    eventType: 'bloodline_awakened',
    xpAmount: 150,
    description: 'Awaken your bloodline powers',
  },
  {
    eventType: 'life_force_drained',
    xpAmount: 50,
    description: 'Drain life force from another',
  },
  {
    eventType: 'blood_curse_cast',
    xpAmount: 75,
    description: 'Successfully curse someone through blood',
  },
  {
    eventType: 'vitality_transferred',
    xpAmount: 60,
    description: 'Transfer vitality to another',
  },
  {
    eventType: 'death_survived_resurrection',
    xpAmount: 300,
    description: 'Return from death via blood resurrection',
  },
];

// ============================================================================
// Tree Assembly
// ============================================================================

const ALL_NODES: MagicSkillNode[] = [
  // Foundation
  BLOOD_SENSE_NODE,
  BASIC_SACRIFICE_NODE,
  PAIN_TOLERANCE_NODE,
  WOUND_SEALING_NODE,

  // Bloodline
  BLOODLINE_AWAKENING_NODE,
  BLOODLINE_STRENGTHEN_NODE,
  BLOODLINE_THEFT_NODE,

  // Blood techniques
  HEMOMANCY_NODE,
  BLOOD_SCRYING_NODE,
  BLOOD_TRACKING_NODE,
  BLOOD_CURSING_NODE,

  // Blood bonds
  BLOOD_BONDING_NODE,
  LIFE_SHARING_NODE,
  BOND_BREAKING_NODE,

  // Vitality manipulation
  REGENERATION_NODE,
  LIFE_EXTENSION_NODE,
  VITALITY_DRAIN_NODE,
  VITALITY_TRANSFER_NODE,

  // Advanced/Forbidden
  BLOOD_PUPPETRY_NODE,
  BLOOD_RESURRECTION_NODE,
  SANGUINE_APOTHEOSIS_NODE,
];

/**
 * The Blood skill tree.
 * Anyone can learn, but requires willingness to sacrifice (self or others).
 */
export const BLOOD_SKILL_TREE: MagicSkillTree = {
  id: 'blood-tree',
  paradigmId: PARADIGM_ID,
  name: 'The Sanguine Art',
  description: 'Master blood magic through sacrifice, vitality manipulation, and bloodline awakening.',
  lore: `Blood is life. This simple truth underlies all blood magic. Every drop
contains vitality, power, essence - the fundamental force that separates the
living from the dead. And what contains power can be used for power.

The path begins with self-sacrifice. Your own blood is the safest source -
honest magic, where your pain fuels your power. Cut your palm, speak the words,
and reality bends to your will. It hurts, yes. It weakens you, yes. But there's
no corruption in using what's yours.

But blood magic doesn't stop at self-sacrifice. You can use others' blood -
given willingly or taken by force. You can awaken dormant bloodline powers
sleeping in your ancestry. You can manipulate blood physically, boiling it in
enemies' veins or shaping it into weapons. You can create blood bonds, magical
connections that let you share life force or even die for another.

The darkest techniques involve stealing life itself - draining vitality from
others to fuel your own existence, controlling people through their blood like
puppets, or even achieving immortality through blood phylacteries.

The greatest blood mages achieve apotheosis - transforming into living blood
itself. No fixed form, no mortal weakness, existing as pure animated life force.
Neither alive nor dead, but eternal.

But remember: every use of blood magic leaves a mark. The more you sacrifice,
the more you change. And some sacrifices can never be undone.`,
  nodes: ALL_NODES,
  entryNodes: ['blood-sense'],
  connections: [], // Auto-generated from prerequisites
  xpSources: XP_SOURCES,
  rules: {
    ...createDefaultTreeRules(false), // No innate requirement
    allowRespec: false, // Blood magic changes you permanently
    permanentProgress: true,
  },
  version: 1,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate power gained from blood sacrifice based on health sacrificed.
 */
export function calculateSacrificePower(
  healthPercentSacrificed: number, // 0-100
  isOwnBlood: boolean,
  bloodlineStrength: number = 0 // 0-1
): number {
  let power = healthPercentSacrificed * 2;

  // Own blood is less powerful but safer
  if (isOwnBlood) {
    power *= 0.8;
  }

  // Bloodline strength amplifies power
  if (bloodlineStrength > 0) {
    power *= (1 + bloodlineStrength * 0.5);
  }

  return Math.floor(power);
}

/**
 * Get available bloodline powers.
 */
export function getBloodlinePowers(
  bloodlineType: keyof typeof BLOODLINES,
  awakeningLevel: number // 0-5
): string[] {
  const powers: Record<keyof typeof BLOODLINES, string[]> = {
    mage: ['spell_affinity', 'mana_capacity', 'arcane_resistance'],
    dragon: ['fire_breath', 'scales', 'intimidation', 'flight'],
    fae: ['charm', 'illusion', 'beauty', 'nature_affinity'],
    demon: ['fire_magic', 'darkness', 'intimidation', 'corruption'],
    angel: ['light_magic', 'healing', 'wings', 'divine_sense'],
    beast: ['transformation', 'enhanced_senses', 'natural_weapons'],
    vampire: ['blood_drain', 'regeneration', 'undeath', 'hypnosis'],
    elemental: ['elemental_control', 'elemental_form', 'immunity'],
    royal: ['leadership', 'authority', 'divine_right', 'charisma'],
    witch: ['curses', 'hexes', 'prophecy', 'familiar'],
  };

  const allPowers = powers[bloodlineType];
  // Return powers based on awakening level (1-5 unlocks progressively)
  return allPowers.slice(0, awakeningLevel);
}

/**
 * Calculate health cost of blood magic with efficiency modifiers.
 */
export function calculateHealthCost(
  baseHealthCost: number,
  painToleranceLevel: number,
  _regenerationLevel: number
): number {
  let cost = baseHealthCost;

  // Pain tolerance reduces cost
  if (painToleranceLevel > 0) {
    const reduction = 15 + (painToleranceLevel - 1) * 5;
    cost *= (100 - reduction) / 100;
  }

  // Regeneration doesn't reduce immediate cost, but makes it recoverable faster
  // (handled separately in regeneration mechanics)

  return Math.ceil(cost);
}

/**
 * Check if has sufficient health for sacrifice.
 */
export function canSacrifice(
  currentHealth: number,
  requiredHealthCost: number,
  allowMortalSacrifice: boolean = false
): boolean {
  if (allowMortalSacrifice) {
    return currentHealth >= requiredHealthCost;
  }

  // Don't allow sacrifice that would kill (< 1% health remaining)
  return currentHealth - requiredHealthCost >= currentHealth * 0.01;
}

/**
 * Get blood bond strength based on shared experiences.
 */
export function getBloodBondStrength(
  bondAge: number, // days
  sharedExperiences: number,
  mutualSacrifices: number
): number {
  let strength = Math.min(bondAge / 100, 50); // Max 50 from age
  strength += sharedExperiences * 5; // Each shared experience adds 5
  strength += mutualSacrifices * 15; // Each mutual sacrifice adds 15

  return Math.min(strength, 100);
}

/**
 * Calculate regeneration rate.
 */
export function getRegenerationRate(
  baseRate: number,
  regenerationLevel: number,
  lifeExtensionLevel: number
): number {
  let rate = baseRate;

  if (regenerationLevel > 0) {
    rate *= 1 + (0.5 * regenerationLevel); // 50% per level
  }
  if (lifeExtensionLevel > 0) {
    rate *= 1 + (0.2 * lifeExtensionLevel); // 20% per level
  }

  return rate;
}

/**
 * Get maximum blood bonds possible.
 */
export function getMaxBloodBonds(unlockedNodes: Record<string, number>): number {
  if (!unlockedNodes['blood-bonding']) return 0;

  let max = 3; // Base

  if (unlockedNodes['life-sharing']) {
    max += 2;
  }
  if (unlockedNodes['sanguine-apotheosis']) {
    max = 999; // Unlimited
  }

  return max;
}
