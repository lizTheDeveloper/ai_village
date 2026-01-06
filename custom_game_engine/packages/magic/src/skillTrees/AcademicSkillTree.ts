/**
 * AcademicSkillTree - Skill tree for the Academic paradigm
 *
 * Key mechanics:
 * - Formal magical education and study
 * - Spell construction using formulas and components
 * - Mana as magical fuel (personal energy pool)
 * - Schools of magic (evocation, illusion, etc.)
 * - Spellbooks and spell recording
 * - Metamagic - modifying spell effects
 * - Research and spell invention
 * - Academic ranks and degrees
 * - Theory and practical application
 *
 * Inspired by:
 * - D&D wizards and traditional RPG magic
 * - Academic study as path to power
 * - The concept that magic has rules and formulas
 * - Vancian magic (prepared spells)
 * - Scientific approach to magic
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

const PARADIGM_ID = 'academic';

/** Schools of magic */
export const MAGIC_SCHOOLS = {
  evocation: 'Energy and force - fireballs, lightning, pure destruction',
  illusion: 'Deception and perception - disguises, phantasms, invisibility',
  transmutation: 'Changing matter - polymorphism, enhancement, alchemy',
  conjuration: 'Summoning and creation - teleportation, summoning, fabrication',
  enchantment: 'Mind control - charm, suggestion, domination',
  divination: 'Information gathering - scrying, detection, prophecy',
  necromancy: 'Death and life force - undead, soul manipulation, life drain',
  abjuration: 'Protection and warding - shields, dispelling, counterspells',
} as const;

/** Academic ranks */
export const ACADEMIC_RANKS = {
  apprentice: 'Just beginning magical education',
  journeyman: 'Completed basic training',
  adept: 'Competent practitioner',
  master: 'Master of one school',
  archmage: 'Master of multiple schools',
  grandmaster: 'Legendary mage',
} as const;

/** Metamagic techniques */
export const METAMAGIC = {
  quicken: 'Cast spell faster (reduced casting time)',
  empower: 'Increase spell power (more damage/effect)',
  extend: 'Increase spell duration',
  enlarge: 'Increase spell area of effect',
  subtle: 'Cast without visible signs',
  twin: 'Affect two targets instead of one',
  heighten: 'Make spell harder to resist',
  persistent: 'Spell continues beyond normal duration',
} as const;

/** Spell components */
export const SPELL_COMPONENTS = {
  verbal: 'Spoken words and incantations',
  somatic: 'Hand gestures and movements',
  material: 'Physical components consumed',
  focus: 'Magical items used but not consumed',
} as const;

// ============================================================================
// Foundation Nodes - Basic Magic Theory
// ============================================================================

/** Entry node - arcane theory */
const ARCANE_THEORY_NODE = createSkillNode(
  'arcane-theory',
  'Arcane Theory',
  PARADIGM_ID,
  'foundation',
  0,
  40,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Understand basic magical theory',
      target: { abilityId: 'arcane_literacy' },
    }),
  ],
  {
    description: 'Learn basic arcane theory',
    lore: `Magic is a science. It has rules, principles, formulas. You begin by
learning the theory - how magic flows, how it can be shaped, what makes a
spell work. This foundation is essential for everything that follows.`,
    maxLevel: 5,
    levelCostMultiplier: 1.4,
    icon: '📚',
  }
);

/** Mana sense - feeling personal power */
const MANA_SENSE_NODE = createSkillNode(
  'mana-sense',
  'Mana Awareness',
  PARADIGM_ID,
  'foundation',
  1,
  60,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Sense your personal mana reserves',
      target: { abilityId: 'sense_mana' },
    }),
  ],
  {
    description: 'Learn to sense your mana pool',
    lore: `Every mage has a personal mana pool - internal magical energy. You learn
to feel it, to know how much you have, how much spells cost. This awareness
prevents burnout and helps manage your power.`,
    prerequisites: ['arcane-theory'],
    maxLevel: 3,
  }
);

/** Basic spellcasting - first cantrip */
const BASIC_SPELLCASTING_NODE = createSkillNode(
  'basic-spellcasting',
  'Basic Spellcasting',
  PARADIGM_ID,
  'foundation',
  1,
  75,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Cast basic cantrips',
      target: { abilityId: 'cast_cantrip' },
    }),
  ],
  {
    description: 'Learn to cast basic cantrips',
    lore: `Your first real spell. Cantrips are simple, low-power effects - create
light, move small objects, clean things. They cost almost no mana but
teach the fundamentals: focus, words, gestures, and will combined into
magical effect.`,
    prerequisites: ['arcane-theory', 'mana-sense'],
    unlockConditions: [
      createUnlockCondition(
        'teacher_found',
        { teacherType: 'wizard' },
        'Must be taught by a trained mage'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Mana regeneration - recovering power */
const MANA_REGENERATION_NODE = createSkillNode(
  'mana-regeneration',
  'Mana Regeneration',
  PARADIGM_ID,
  'foundation',
  2,
  100,
  [
    createSkillEffect('resource_efficiency', 10, {
      perLevelValue: 5,
      description: 'Increase mana regeneration by X%',
    }),
  ],
  {
    description: 'Improve mana regeneration rate',
    lore: `Mana regenerates naturally over time, faster with rest and meditation.
You learn techniques to accelerate this - breathing exercises, mental
disciplines, energy channeling. The better your regeneration, the more
spells you can cast.`,
    prerequisites: ['mana-sense'],
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

// ============================================================================
// School Specialization Nodes
// ============================================================================

/** Evocation - energy magic */
const EVOCATION_NODE = createSkillNode(
  'evocation',
  'Evocation Mastery',
  PARADIGM_ID,
  'specialization',
  2,
  150,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Cast evocation spells (fire, lightning, force)',
      target: { abilityId: 'evocation' },
    }),
  ],
  {
    description: 'Specialize in evocation magic',
    lore: `Evocation is the art of creating and projecting energy. Fireballs,
lightning bolts, force missiles. Raw destructive power. This is the most
straightforward school - point, cast, destroy.`,
    prerequisites: ['basic-spellcasting', 'arcane-theory'],
    icon: '🔥',
  }
);

/** Illusion - deception magic */
const ILLUSION_NODE = createSkillNode(
  'illusion',
  'Illusion Mastery',
  PARADIGM_ID,
  'specialization',
  2,
  150,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Cast illusion spells (disguise, invisibility, phantasms)',
      target: { abilityId: 'illusion' },
    }),
  ],
  {
    description: 'Specialize in illusion magic',
    lore: `Illusion is about perception - making people see, hear, or feel what
isn't there. Disguises, invisibility, phantom armies. Subtle, clever,
and incredibly effective when used right.`,
    prerequisites: ['basic-spellcasting', 'arcane-theory'],
    icon: '🎭',
  }
);

/** Transmutation - transformation magic */
const TRANSMUTATION_NODE = createSkillNode(
  'transmutation',
  'Transmutation Mastery',
  PARADIGM_ID,
  'specialization',
  2,
  150,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Cast transmutation spells (polymorph, enhancement, alchemy)',
      target: { abilityId: 'transmutation' },
    }),
  ],
  {
    description: 'Specialize in transmutation magic',
    lore: `Transmutation changes the nature of things. Turn lead to gold. Transform
into animals. Enhance physical abilities. Shrink or grow. This school
touches on alchemy and fundamental alteration.`,
    prerequisites: ['basic-spellcasting', 'arcane-theory'],
    icon: '🔬',
  }
);

/** Abjuration - protection magic */
const ABJURATION_NODE = createSkillNode(
  'abjuration',
  'Abjuration Mastery',
  PARADIGM_ID,
  'specialization',
  2,
  125,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Cast abjuration spells (shields, wards, dispelling)',
      target: { abilityId: 'abjuration' },
    }),
  ],
  {
    description: 'Specialize in abjuration magic',
    lore: `Abjuration is defensive magic - shields, wards, counterspells, dispelling.
Not flashy, but incredibly valuable. A good abjurer is nearly unkillable
and can shut down enemy casters.`,
    prerequisites: ['basic-spellcasting'],
    icon: '🛡️',
  }
);

// ============================================================================
// Spellbook and Spell Management
// ============================================================================

/** Spellbook creation - recording spells */
const SPELLBOOK_NODE = createSkillNode(
  'spellbook',
  'Spellbook Mastery',
  PARADIGM_ID,
  'technique',
  2,
  125,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Create and maintain a spellbook',
      target: { abilityId: 'spellbook' },
    }),
  ],
  {
    description: 'Learn to create and use spellbooks',
    lore: `A spellbook is a mage's most valuable possession. It contains spell
formulas, notes, research. You learn to properly record spells, organize
your knowledge, and protect your book from theft or damage.`,
    prerequisites: ['basic-spellcasting', 'arcane-theory'],
  }
);

/** Spell preparation - readying spells */
const SPELL_PREPARATION_NODE = createSkillNode(
  'spell-preparation',
  'Spell Preparation',
  PARADIGM_ID,
  'technique',
  2,
  100,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Prepare spells for quick casting',
      target: { abilityId: 'prepare_spell' },
    }),
  ],
  {
    description: 'Learn to prepare spells in advance',
    lore: `Complex spells take too long to cast from scratch. You learn to prepare
them in advance - doing most of the work beforehand so the final casting
is quick. This is Vancian magic: preparation and execution separated.`,
    prerequisites: ['spellbook'],
    maxLevel: 5,
  }
);

/** Spell research - inventing new magic */
const SPELL_RESEARCH_NODE = createSkillNode(
  'spell-research',
  'Spell Research',
  PARADIGM_ID,
  'technique',
  3,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Research and invent new spells',
      target: { abilityId: 'research_spell' },
    }),
  ],
  {
    description: 'Learn to research and invent spells',
    lore: `Most mages just use existing spells. But true scholars can research new
ones - combining effects, tweaking formulas, inventing entirely original
magic. This is how magical knowledge advances.`,
    prerequisites: ['spellbook', 'arcane-theory'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'arcane-theory', level: 3 },
        'Requires deep theoretical knowledge'
      ),
    ],
    conditionMode: 'all',
  }
);

// ============================================================================
// Metamagic Nodes - Spell Modification
// ============================================================================

/** Quicken spell - faster casting */
const QUICKEN_SPELL_NODE = createSkillNode(
  'quicken-spell',
  'Quicken Spell',
  PARADIGM_ID,
  'technique',
  3,
  175,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Cast spells faster',
      target: { abilityId: 'quicken' },
    }),
  ],
  {
    description: 'Learn to quicken spell casting',
    lore: `Normally spells take time to cast. But you can learn to compress the
casting - skipping steps, streamlining gestures, making the process
faster. Costs more mana but much quicker.`,
    prerequisites: ['spell-preparation', 'evocation'],
  }
);

/** Empower spell - increased power */
const EMPOWER_SPELL_NODE = createSkillNode(
  'empower-spell',
  'Empower Spell',
  PARADIGM_ID,
  'technique',
  3,
  175,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Increase spell power',
      target: { abilityId: 'empower' },
    }),
  ],
  {
    description: 'Learn to empower spells',
    lore: `Channel extra mana into a spell to increase its power. Fireballs burn
hotter. Healing spells restore more. Every effect magnified. Expensive
but devastating.`,
    prerequisites: ['spell-preparation'],
    maxLevel: 5,
  }
);

/** Subtle spell - silent casting */
const SUBTLE_SPELL_NODE = createSkillNode(
  'subtle-spell',
  'Subtle Spell',
  PARADIGM_ID,
  'technique',
  3,
  150,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Cast spells without obvious signs',
      target: { abilityId: 'subtle' },
    }),
  ],
  {
    description: 'Learn to cast spells subtly',
    lore: `Normally spells are obvious - glowing, loud, visible. But you can learn
to cast subtly - no gestures, no words, no visible effect until the spell
strikes. Perfect for deception and stealth.`,
    prerequisites: ['illusion', 'spell-preparation'],
  }
);

/** Twin spell - double targeting */
const TWIN_SPELL_NODE = createSkillNode(
  'twin-spell',
  'Twin Spell',
  PARADIGM_ID,
  'technique',
  4,
  225,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Target two creatures with one spell',
      target: { abilityId: 'twin' },
    }),
  ],
  {
    description: 'Learn to twin spells',
    lore: `Split a spell to affect two targets instead of one. One fireball becomes
two. One healing spell saves two lives. Double the effect for less than
double the cost.`,
    prerequisites: ['empower-spell', 'spell-research'],
  }
);

// ============================================================================
// Advanced Mastery
// ============================================================================

/** Arcane mastery - general excellence */
const ARCANE_MASTERY_NODE = createSkillNode(
  'arcane-mastery',
  'Arcane Mastery',
  PARADIGM_ID,
  'mastery',
  4,
  300,
  [
    createSkillEffect('paradigm_proficiency', 20, {
      perLevelValue: 5,
      description: '+X% to all spellcasting',
    }),
  ],
  {
    description: 'Achieve general arcane mastery',
    lore: `True mastery of the arcane arts. Your spells are more powerful, more
efficient, more reliable. You understand magic at a fundamental level
that most mages never reach.`,
    prerequisites: ['evocation', 'illusion', 'transmutation'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 2000 },
        'Requires extensive magical practice'
      ),
    ],
    conditionMode: 'all',
    maxLevel: 5,
  }
);

/** Spell innovation - creating unique magic */
const SPELL_INNOVATION_NODE = createSkillNode(
  'spell-innovation',
  'Spell Innovation',
  PARADIGM_ID,
  'mastery',
  5,
  400,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Create entirely new schools of magic',
      target: { abilityId: 'innovate' },
    }),
  ],
  {
    description: 'Innovate new magical paradigms',
    lore: `The greatest mages don't just master existing magic - they create new
forms entirely. Invent new schools. Discover new principles. Reshape the
very nature of magic itself. This is legendary-tier wizardry.`,
    prerequisites: ['spell-research', 'arcane-mastery'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'arcane-theory', level: 5 },
        'Requires perfect theoretical understanding'
      ),
      createUnlockCondition(
        'node_level',
        { nodeId: 'spell-research', level: 1 },
        'Must have research experience'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Archmage ascension - pinnacle of power */
const ARCHMAGE_NODE = createSkillNode(
  'archmage',
  'Archmage Ascension',
  PARADIGM_ID,
  'mastery',
  5,
  500,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Achieve the rank of Archmage',
      target: { abilityId: 'archmage' },
    }),
  ],
  {
    description: 'Ascend to Archmage status',
    lore: `Archmage - a title reserved for the greatest wizards of an age. You've
mastered multiple schools. You've contributed original research. You've
pushed the boundaries of magical knowledge. This is as high as mortals
can climb.`,
    prerequisites: ['arcane-mastery', 'spell-innovation'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 5000 },
        'Requires legendary magical expertise'
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
    eventType: 'spell_cast',
    xpAmount: 15,
    description: 'Successfully cast a spell',
  },
  {
    eventType: 'spell_learned',
    xpAmount: 50,
    description: 'Learn a new spell',
  },
  {
    eventType: 'research_completed',
    xpAmount: 150,
    description: 'Complete spell research',
  },
  {
    eventType: 'spell_invented',
    xpAmount: 300,
    description: 'Invent an entirely new spell',
  },
  {
    eventType: 'metamagic_applied',
    xpAmount: 40,
    description: 'Successfully apply metamagic',
  },
  {
    eventType: 'spellbook_completed',
    xpAmount: 100,
    description: 'Complete a full spellbook',
  },
  {
    eventType: 'student_taught',
    xpAmount: 75,
    description: 'Teach magic to a student',
  },
  {
    eventType: 'theory_published',
    xpAmount: 200,
    description: 'Publish original magical theory',
  },
];

// ============================================================================
// Tree Assembly
// ============================================================================

const ALL_NODES: MagicSkillNode[] = [
  // Foundation
  ARCANE_THEORY_NODE,
  MANA_SENSE_NODE,
  BASIC_SPELLCASTING_NODE,
  MANA_REGENERATION_NODE,

  // Schools
  EVOCATION_NODE,
  ILLUSION_NODE,
  TRANSMUTATION_NODE,
  ABJURATION_NODE,

  // Spellbook
  SPELLBOOK_NODE,
  SPELL_PREPARATION_NODE,
  SPELL_RESEARCH_NODE,

  // Metamagic
  QUICKEN_SPELL_NODE,
  EMPOWER_SPELL_NODE,
  SUBTLE_SPELL_NODE,
  TWIN_SPELL_NODE,

  // Mastery
  ARCANE_MASTERY_NODE,
  SPELL_INNOVATION_NODE,
  ARCHMAGE_NODE,
];

/**
 * The Academic skill tree.
 * Anyone can learn through study and practice.
 */
export const ACADEMIC_SKILL_TREE: MagicSkillTree = {
  id: 'academic-tree',
  paradigmId: PARADIGM_ID,
  name: 'The Arcane Academy',
  description: 'Master formal magic through study, research, and systematic spell construction.',
  lore: `Magic is a science. It has rules, formulas, principles that can be studied
and mastered. The academic tradition treats magic as any other field of study -
through education, practice, and research.

You begin with theory: understanding how magic flows, how it can be shaped, what
fundamental principles govern its behavior. This isn't innate talent or divine
gift - it's learned knowledge, accessible to anyone willing to study.

Next comes practical application: your first cantrip, a simple spell that proves
you understand the basics. From there, you expand: learning more spells, building
a spellbook, mastering different schools of magic.

Mana is your fuel - internal magical energy that every living thing possesses.
You learn to sense it, conserve it, regenerate it faster. Better mana management
means more spells cast before exhaustion.

The schools of magic represent different approaches and effects:
- Evocation creates energy (fireballs, lightning)
- Illusion deceives perception (invisibility, disguises)
- Transmutation changes matter (polymorph, enhancement)
- Abjuration protects and wards (shields, counterspells)
- And more...

Advanced techniques involve spell preparation (doing the complex work in advance)
and metamagic (modifying spells to be faster, stronger, subtler). The greatest
wizards can research entirely new spells, inventing original magic.

The path culminates in Archmage status - recognition as one of the greatest
magical scholars of your age. This isn't about raw power but deep understanding
and contribution to magical knowledge.

The academic path is methodical, intellectual, and systematic. Power comes not
from faith, bloodline, or sacrifice - but from study, practice, and mastery of
fundamental principles.`,
  nodes: ALL_NODES,
  entryNodes: ['arcane-theory'],
  connections: [], // Auto-generated from prerequisites
  xpSources: XP_SOURCES,
  rules: {
    ...createDefaultTreeRules(false), // No innate requirement
    allowRespec: true, // Can relearn different specializations
    permanentProgress: false,
  },
  version: 1,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate spell power based on school mastery and metamagic.
 */
export function calculateSpellPower(
  schoolLevel: number,
  arcaneTheoryLevel: number,
  arcaneMasteryLevel: number,
  empowerApplied: boolean = false
): number {
  let power = 50; // Base

  if (schoolLevel > 0) {
    power += 20 + (schoolLevel - 1) * 10;
  }
  if (arcaneTheoryLevel > 0) {
    power += 5 + (arcaneTheoryLevel - 1) * 3;
  }
  if (arcaneMasteryLevel > 0) {
    power += 20 + (arcaneMasteryLevel - 1) * 5;
  }

  if (empowerApplied) {
    power *= 1.5;
  }

  return Math.floor(power);
}

/**
 * Get mana cost with efficiency modifiers.
 */
export function calculateManaCost(
  baseManaCost: number,
  _regenerationLevel: number,
  metamagicApplied: string[] = []
): number {
  let cost = baseManaCost;

  // Metamagic increases cost
  const metamagicMult = 1 + (metamagicApplied.length * 0.5);
  cost *= metamagicMult;

  // Regeneration doesn't reduce cost but makes it less impactful
  // (handled separately in regeneration mechanics)

  return Math.ceil(cost);
}

/**
 * Get known schools of magic.
 */
export function getKnownSchools(unlockedNodes: Record<string, number>): (keyof typeof MAGIC_SCHOOLS)[] {
  const schools: (keyof typeof MAGIC_SCHOOLS)[] = [];

  if (unlockedNodes['evocation']) schools.push('evocation');
  if (unlockedNodes['illusion']) schools.push('illusion');
  if (unlockedNodes['transmutation']) schools.push('transmutation');
  if (unlockedNodes['abjuration']) schools.push('abjuration');

  // Could add more schools as additional nodes
  return schools;
}

/**
 * Get academic rank based on progress.
 */
export function getAcademicRank(
  totalXp: number,
  knownSchools: number,
  _researchCompleted: number
): keyof typeof ACADEMIC_RANKS {
  if (totalXp >= 5000 && knownSchools >= 3) return 'grandmaster';
  if (totalXp >= 3000 && knownSchools >= 2) return 'archmage';
  if (totalXp >= 1500 && knownSchools >= 1) return 'master';
  if (totalXp >= 500) return 'adept';
  if (totalXp >= 100) return 'journeyman';
  return 'apprentice';
}

/**
 * Get maximum prepared spells.
 */
export function getMaxPreparedSpells(
  preparationLevel: number,
  arcaneTheoryLevel: number
): number {
  let max = 3; // Base

  if (preparationLevel > 0) {
    max += 2 + (preparationLevel - 1);
  }
  if (arcaneTheoryLevel > 0) {
    max += arcaneTheoryLevel;
  }

  return max;
}

/**
 * Get spellbook capacity.
 */
export function getSpellbookCapacity(hasSpellbook: boolean, researchLevel: number): number {
  if (!hasSpellbook) return 0;

  let capacity = 20; // Base

  if (researchLevel > 0) {
    capacity += researchLevel * 10;
  }

  return capacity;
}

/**
 * Calculate research time for new spell.
 */
export function getResearchTime(
  spellComplexity: number, // 1-10
  arcaneTheoryLevel: number,
  hasInnovation: boolean
): number {
  // Time in days
  let baseTime = spellComplexity * 10;

  if (arcaneTheoryLevel > 0) {
    baseTime *= 1 - (arcaneTheoryLevel * 0.1);
  }
  if (hasInnovation) {
    baseTime *= 0.5;
  }

  return Math.max(1, Math.ceil(baseTime));
}
