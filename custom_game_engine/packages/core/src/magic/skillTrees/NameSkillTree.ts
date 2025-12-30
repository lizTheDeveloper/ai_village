/**
 * NameSkillTree - Skill tree for the Name paradigm
 *
 * Key mechanics:
 * - True names grant power over things
 * - Names are discovered/learned, not invented
 * - Speaking a true name is an act of power
 * - Your own true name is precious and dangerous
 * - Different name categories (objects, living things, concepts, forces)
 * - The deeper the understanding, the more complete the name
 *
 * Inspired by:
 * - Ursula K. Le Guin's Earthsea (true speech, naming)
 * - Patrick Rothfuss's Name of the Wind (though that's more sympathy)
 * - Various folklore about names having power
 * - The concept that to name something is to know it completely
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

const PARADIGM_ID = 'name';

/** Categories of names that can be learned */
export const NAME_CATEGORIES = {
  simple_objects: 'Names of simple inanimate objects (stone, water, metal)',
  complex_objects: 'Names of complex creations (sword, house, ship)',
  plants: 'Names of living plants and trees',
  animals: 'Names of beasts and creatures',
  people: 'True names of individuals',
  elements: 'Names of fundamental forces (fire, wind, earth)',
  concepts: 'Names of abstract ideas (courage, fear, love)',
  spirits: 'Names of immaterial beings',
  places: 'Names of locations with power',
  forbidden: 'Names that should not be spoken',
} as const;

/** Levels of name knowledge */
export const NAME_MASTERY_LEVELS = {
  surface: 'Surface name - common word, little power',
  shallow: 'Shallow name - some understanding, basic effects',
  deep: 'Deep name - true understanding, strong effects',
  true: 'True name - complete knowledge, full power',
  secret: 'Secret name - hidden aspect, forbidden knowledge',
} as const;

/** Effects of speaking names */
export const NAME_EFFECTS = {
  command: 'Give commands to the named thing',
  summon: 'Call the named thing to you',
  bind: 'Prevent the named thing from acting',
  reveal: 'Force truth from the named thing',
  change: 'Alter the nature of the named thing',
  banish: 'Send the named thing away',
  protect: 'Shield against the named thing',
  invoke: 'Channel the essence of the named thing',
} as const;

// ============================================================================
// Foundation Nodes - Learning to Name
// ============================================================================

/** Entry node - sensing true names */
const NAME_SENSE_NODE = createSkillNode(
  'name-sense',
  'Name Sense',
  PARADIGM_ID,
  'foundation',
  0,
  30,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Sense when you hear a true name',
      target: { abilityId: 'name_recognition' },
    }),
  ],
  {
    description: 'Learn to recognize true names when you hear them',
    lore: `A true name has a particular quality - a resonance, a rightness. When
you hear it, something in you recognizes it as truth. This is the first
step: learning to hear that resonance.`,
    maxLevel: 3,
    levelCostMultiplier: 1.3,
    icon: '👂',
  }
);

/** True speech - the language of naming */
const TRUE_SPEECH_NODE = createSkillNode(
  'true-speech',
  'True Speech',
  PARADIGM_ID,
  'foundation',
  1,
  75,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Can speak in the true tongue',
      target: { abilityId: 'true_speech' },
    }),
  ],
  {
    description: 'Learn the true speech - the language of names',
    lore: `In the true speech, you cannot lie. Every word is what it says and says
what it is. To speak a stone in true speech IS to speak to stone itself.
This is why the language is powerful - and dangerous.`,
    prerequisites: ['name-sense'],
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

/** Name meditation - learning through contemplation */
const NAME_MEDITATION_NODE = createSkillNode(
  'name-meditation',
  'Name Meditation',
  PARADIGM_ID,
  'foundation',
  1,
  50,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Meditate to discover names',
      target: { abilityId: 'name_meditation' },
    }),
  ],
  {
    description: 'Learn to discover names through deep meditation',
    lore: `To know a thing's name, you must know the thing itself - completely.
This requires observation, contemplation, and meditation. Sit with a stone
for days. Study its grain, its weight, its history. Then, perhaps, you
will hear its name.`,
    prerequisites: ['name-sense'],
  }
);

/** Memory techniques - holding many names */
const NAME_MEMORY_NODE = createSkillNode(
  'name-memory',
  'Perfect Recall',
  PARADIGM_ID,
  'foundation',
  2,
  100,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Never forget a true name once learned',
      target: { abilityId: 'name_recall' },
    }),
  ],
  {
    description: 'Develop perfect memory for true names',
    lore: `A name once truly learned cannot be forgotten - it becomes part of you.
But learning to hold many names requires discipline. Each name is a weight,
a responsibility. Master namers carry thousands.`,
    prerequisites: ['true-speech'],
    maxLevel: 5,
    levelCostMultiplier: 1.4,
  }
);

// ============================================================================
// Discovery Nodes - Learning Name Categories
// ============================================================================

/** Simple object names */
const SIMPLE_NAMES_NODE = createSkillNode(
  'simple-names',
  'Names of Simple Things',
  PARADIGM_ID,
  'discovery',
  1,
  60,
  [
    createSkillEffect('unlock_name_category', 1, {
      description: 'Can learn names of simple objects',
    }),
  ],
  {
    description: 'Learn to name simple inanimate objects',
    lore: 'Stone. Water. Metal. Fire. These are the simple names - the foundation. Learn them first.',
    prerequisites: ['true-speech'],
    unlockConditions: [
      createUnlockCondition(
        'name_learned',
        { nameId: 'first_simple_name' },
        'Must learn your first simple name through meditation'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Plant names */
const PLANT_NAMES_NODE = createSkillNode(
  'plant-names',
  'Names of Growing Things',
  PARADIGM_ID,
  'discovery',
  2,
  100,
  [
    createSkillEffect('unlock_name_category', 1, {
      description: 'Can learn names of plants',
    }),
  ],
  {
    description: 'Learn to name plants and trees',
    lore: `Plants have slower, deeper names than stone. To know a tree's name
requires understanding its growth, its seasons, its relationship with
soil and sun. These are the first living names.`,
    prerequisites: ['simple-names'],
  }
);

/** Animal names */
const ANIMAL_NAMES_NODE = createSkillNode(
  'animal-names',
  'Names of Beasts',
  PARADIGM_ID,
  'discovery',
  2,
  125,
  [
    createSkillEffect('unlock_name_category', 1, {
      description: 'Can learn names of animals',
    }),
  ],
  {
    description: 'Learn to name animals and beasts',
    lore: `Animals have quick, fierce names - harder to grasp than stone or plant.
Each species has its own name, and sometimes individuals have names beyond
their kind. A wolf is different than Wolf.`,
    prerequisites: ['plant-names'],
  }
);

/** Complex object names */
const COMPLEX_NAMES_NODE = createSkillNode(
  'complex-names',
  'Names of Crafted Things',
  PARADIGM_ID,
  'discovery',
  2,
  110,
  [
    createSkillEffect('unlock_name_category', 1, {
      description: 'Can learn names of complex creations',
    }),
  ],
  {
    description: 'Learn to name complex crafted objects',
    lore: `A sword has a name beyond 'metal' and 'edge' - it is a thing of purpose
and crafting. Named swords are famous for a reason. They are known,
and therefore powerful.`,
    prerequisites: ['simple-names'],
  }
);

/** People's names */
const PEOPLE_NAMES_NODE = createSkillNode(
  'people-names',
  'Names of People',
  PARADIGM_ID,
  'discovery',
  3,
  200,
  [
    createSkillEffect('unlock_name_category', 1, {
      description: 'Can learn true names of people',
    }),
  ],
  {
    description: 'Learn to discover the true names of people',
    lore: `A person's true name is their deepest secret. It is who they are when
all masks are stripped away. To know someone's true name is to hold
power over them - and responsibility for them. Use this knowledge wisely.`,
    prerequisites: ['animal-names'],
    unlockConditions: [
      createUnlockCondition(
        'teacher_found',
        { teacherType: 'master_namer' },
        'Must be taught by a master namer'
      ),
    ],
    conditionMode: 'all',
    icon: '👤',
  }
);

/** Elemental names - forces of nature */
const ELEMENTAL_NAMES_NODE = createSkillNode(
  'elemental-names',
  'Names of Forces',
  PARADIGM_ID,
  'discovery',
  3,
  175,
  [
    createSkillEffect('unlock_name_category', 1, {
      description: 'Can learn names of fundamental forces',
    }),
  ],
  {
    description: 'Learn the names of wind, fire, and storm',
    lore: `Fire. Wind. Lightning. Ocean. These are not objects but forces - wild,
dangerous, powerful. Their names are hard to grasp and harder to hold.
But once known, they grant mastery over the elements themselves.`,
    prerequisites: ['simple-names', 'animal-names'],
    unlockConditions: [
      createUnlockCondition(
        'trauma_experienced',
        { traumaType: 'elemental_encounter' },
        'Must have faced an elemental force'
      ),
    ],
    conditionMode: 'any',
  }
);

/** Concept names - abstract ideas */
const CONCEPT_NAMES_NODE = createSkillNode(
  'concept-names',
  'Names of Ideas',
  PARADIGM_ID,
  'discovery',
  4,
  250,
  [
    createSkillEffect('unlock_name_category', 1, {
      description: 'Can learn names of abstract concepts',
    }),
  ],
  {
    description: 'Learn the names of concepts and ideas',
    lore: `What is the name of Courage? Of Fear? Of Love? These are the deepest
names - abstractions made concrete through naming. They exist only in
the true speech, where concepts become as real as stone.`,
    prerequisites: ['people-names'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 1000 },
        'Must have extensive naming experience'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Spirit names */
const SPIRIT_NAMES_NODE = createSkillNode(
  'spirit-names',
  'Names of Spirits',
  PARADIGM_ID,
  'discovery',
  4,
  225,
  [
    createSkillEffect('unlock_name_category', 1, {
      description: 'Can learn names of spirits and immaterial beings',
    }),
  ],
  {
    description: 'Learn to name spirits, ghosts, and ethereal beings',
    lore: `Spirits are less substantial than flesh but more real than ideas. Their
names are whispered, elusive, easily lost. But once bound in true speech,
a spirit must answer to its name.`,
    prerequisites: ['elemental-names'],
    unlockConditions: [
      createUnlockCondition(
        'kami_met',
        { kamiType: 'nature' },
        'Must have encountered a spirit'
      ),
    ],
    conditionMode: 'any',
  }
);

// ============================================================================
// Technique Nodes - Using Names
// ============================================================================

/** Speaking power - names as commands */
const SPEAKING_POWER_NODE = createSkillNode(
  'speaking-power',
  'Power of Speech',
  PARADIGM_ID,
  'technique',
  2,
  125,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Use names to command things',
      target: { abilityId: 'name_command' },
    }),
  ],
  {
    description: 'Learn to speak names with power and intent',
    lore: `To speak a name is one thing. To speak it with power is another. The
name must be perfectly pronounced, at the right time, with the right intent.
Then the named thing must obey - it has no choice.`,
    prerequisites: ['true-speech', 'simple-names'],
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

/** Compelling speech - forcing truth */
const COMPELLING_SPEECH_NODE = createSkillNode(
  'compelling-speech',
  'Compelling Speech',
  PARADIGM_ID,
  'technique',
  3,
  175,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Compel truth through names',
      target: { abilityId: 'compel_truth' },
    }),
  ],
  {
    description: 'Use names to force truth and revelation',
    lore: `Speak a person's true name and they cannot lie to you. Speak a spirit's
name and it must reveal itself. This is the power of names: they strip
away all deception.`,
    prerequisites: ['speaking-power', 'people-names'],
  }
);

/** Binding names - preventing action */
const BINDING_NAMES_NODE = createSkillNode(
  'binding-names',
  'Name Binding',
  PARADIGM_ID,
  'technique',
  3,
  150,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Use names to bind and restrict',
      target: { abilityId: 'name_binding' },
    }),
  ],
  {
    description: 'Learn to bind things through their names',
    lore: `A name can be a chain. Speak it properly and the named thing is frozen,
bound, unable to act against you. This is the basis of all name-wards
and protective circles.`,
    prerequisites: ['speaking-power'],
  }
);

/** Summoning names - calling things */
const SUMMONING_NAMES_NODE = createSkillNode(
  'summoning-names',
  'Name Summoning',
  PARADIGM_ID,
  'technique',
  3,
  175,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Summon things by speaking their names',
      target: { abilityId: 'name_summoning' },
    }),
  ],
  {
    description: 'Learn to summon things through their names',
    lore: `Speak a name with sufficient power, and the named thing will come to you.
Distance is no barrier - a true name bridges all space. But beware:
some things should not be summoned.`,
    prerequisites: ['speaking-power', 'spirit-names'],
  }
);

// ============================================================================
// Protection Nodes - Guarding Your Own Name
// ============================================================================

/** Name hiding - concealing your true name */
const NAME_HIDING_NODE = createSkillNode(
  'name-hiding',
  'Name Hiding',
  PARADIGM_ID,
  'technique',
  2,
  100,
  [
    createSkillEffect('defense', 20, {
      perLevelValue: 10,
      description: '+X% resistance to name-discovery',
    }),
  ],
  {
    description: 'Learn to hide your true name from discovery',
    lore: `A wise namer guards their own true name jealously. Never speak it aloud.
Never write it down. Some go so far as to forget it themselves, though
this is dangerous - a name forgotten can be lost forever.`,
    prerequisites: ['people-names'],
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

/** False names - using decoys */
const FALSE_NAMES_NODE = createSkillNode(
  'false-names',
  'False Names',
  PARADIGM_ID,
  'technique',
  2,
  125,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Create and use false names as decoys',
      target: { abilityId: 'false_name' },
    }),
  ],
  {
    description: 'Learn to create false names to protect your true one',
    lore: `When asked for your name, give a false one - a use-name, a shadow-name.
Let enemies waste their power on empty words while your true name remains
hidden and safe.`,
    prerequisites: ['name-hiding'],
  }
);

/** Name wards - protecting against naming */
const NAME_WARDS_NODE = createSkillNode(
  'name-wards',
  'Name Wards',
  PARADIGM_ID,
  'technique',
  3,
  175,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Create wards against name magic',
      target: { abilityId: 'name_ward' },
    }),
  ],
  {
    description: 'Create protective wards against name magic',
    lore: `A circle inscribed with the right words can ward against specific names -
preventing their power within its bounds. This is how wise folk protect
themselves against naming.`,
    prerequisites: ['binding-names', 'name-hiding'],
  }
);

// ============================================================================
// Mastery Nodes - Advanced Name Magic
// ============================================================================

/** Changing names - altering nature */
const CHANGING_NAMES_NODE = createSkillNode(
  'changing-names',
  'Name Changing',
  PARADIGM_ID,
  'mastery',
  4,
  300,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Change the names of things, altering their nature',
      target: { abilityId: 'name_change' },
    }),
  ],
  {
    description: 'Learn to change names, thereby changing nature',
    lore: `The deepest magic: to change a thing's name is to change what it is.
Speak the name of Lead and then Gold, and lead becomes gold. But this is
perilous - change a name wrongly and you may unmake the thing entirely.`,
    prerequisites: ['speaking-power', 'concept-names'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'speaking-power', level: 5 },
        'Must have mastered speaking power'
      ),
    ],
    conditionMode: 'all',
    icon: '✨',
  }
);

/** Unmaking names - destroying through naming */
const UNMAKING_NAMES_NODE = createSkillNode(
  'unmaking-names',
  'Unmaking',
  PARADIGM_ID,
  'mastery',
  4,
  275,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Unmake things by unweaving their names',
      target: { abilityId: 'unmake' },
    }),
  ],
  {
    description: 'Learn to unmake things by speaking their names backward',
    lore: `To speak a name backward is to call non-being. The thing named ceases
to exist - not destroyed, but unmade, as if it had never been. This is
the darkest of name magic. Use it sparingly, if ever.`,
    prerequisites: ['changing-names'],
    icon: '💀',
  }
);

/** Nameless state - becoming unknowable */
const NAMELESS_STATE_NODE = createSkillNode(
  'nameless-state',
  'The Nameless State',
  PARADIGM_ID,
  'mastery',
  5,
  400,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Enter a state beyond naming',
      target: { abilityId: 'nameless' },
    }),
  ],
  {
    description: 'Learn to become nameless, beyond all power',
    lore: `The ultimate protection: to have no name at all. In this state, you are
immune to all name magic - but you also cannot use it. You become a void,
a cipher, something that cannot be grasped or held or known.`,
    prerequisites: ['name-wards', 'false-names'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 2000 },
        'Must have mastered naming itself'
      ),
    ],
    conditionMode: 'all',
  }
);

/** The Name of Names - ultimate mastery */
const NAME_OF_NAMES_NODE = createSkillNode(
  'name-of-names',
  'The Name of Names',
  PARADIGM_ID,
  'mastery',
  5,
  500,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Learn the Name that binds all other names',
      target: { abilityId: 'master_name' },
    }),
  ],
  {
    description: 'Discover the Name of Names - the word that rules all words',
    lore: `In the true speech, there is one Name that encompasses all others - the
Name of Names, the Word of Power. To know it is to hold sovereignty over
all named things. But only one living person may know it at a time.`,
    prerequisites: ['changing-names', 'concept-names', 'spirit-names'],
    unlockConditions: [
      createUnlockCondition(
        'secret_revealed',
        { secretId: 'master_name' },
        'Must discover the ultimate secret'
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
    eventType: 'name_learned',
    xpAmount: 50,
    description: 'Learn a new true name',
  },
  {
    eventType: 'name_spoken_power',
    xpAmount: 15,
    description: 'Successfully speak a name with power',
  },
  {
    eventType: 'thing_commanded',
    xpAmount: 25,
    description: 'Command something through its name',
  },
  {
    eventType: 'spirit_summoned',
    xpAmount: 75,
    description: 'Summon a spirit through its name',
  },
  {
    eventType: 'truth_compelled',
    xpAmount: 40,
    description: 'Force truth through naming',
  },
  {
    eventType: 'name_changed',
    xpAmount: 100,
    description: 'Change a name, altering nature',
  },
  {
    eventType: 'name_protected',
    xpAmount: 30,
    description: 'Successfully protect your true name',
  },
  {
    eventType: 'deep_name_discovered',
    xpAmount: 150,
    description: 'Discover a deep or true name through meditation',
  },
];

// ============================================================================
// Tree Assembly
// ============================================================================

const ALL_NODES: MagicSkillNode[] = [
  // Foundation
  NAME_SENSE_NODE,
  TRUE_SPEECH_NODE,
  NAME_MEDITATION_NODE,
  NAME_MEMORY_NODE,

  // Discovery
  SIMPLE_NAMES_NODE,
  PLANT_NAMES_NODE,
  ANIMAL_NAMES_NODE,
  COMPLEX_NAMES_NODE,
  PEOPLE_NAMES_NODE,
  ELEMENTAL_NAMES_NODE,
  CONCEPT_NAMES_NODE,
  SPIRIT_NAMES_NODE,

  // Technique
  SPEAKING_POWER_NODE,
  COMPELLING_SPEECH_NODE,
  BINDING_NAMES_NODE,
  SUMMONING_NAMES_NODE,

  // Protection
  NAME_HIDING_NODE,
  FALSE_NAMES_NODE,
  NAME_WARDS_NODE,

  // Mastery
  CHANGING_NAMES_NODE,
  UNMAKING_NAMES_NODE,
  NAMELESS_STATE_NODE,
  NAME_OF_NAMES_NODE,
];

/**
 * The Name skill tree.
 * Anyone can learn, but requires discovering names through meditation and study.
 */
export const NAME_SKILL_TREE: MagicSkillTree = {
  id: 'name-tree',
  paradigmId: PARADIGM_ID,
  name: 'The Art of Naming',
  description: 'Master true names to command, bind, and reshape reality through the power of words.',
  lore: `In the beginning was the Word, and the Word was Power. To know a thing's
true name is to know it completely - its nature, its history, its essence.
And to speak that name is to have power over it.

The art of naming is ancient and perilous. Names are not invented but discovered,
through meditation, observation, and understanding. A master namer may know
thousands of names - of stones and trees, of beasts and people, of fire and
wind and star. Each name is a tool, a key, a weapon.

But the power of names cuts both ways. Your own true name is your deepest
vulnerability. Guard it jealously, for anyone who knows and speaks your name
holds power over you. Many namers go by use-names, keeping their true names
secret even from themselves.

The greatest namers can change names - and thereby change reality itself.
But this is dangerous magic. Change a name wrongly and you may unmake the
thing entirely, reducing it to formless void.`,
  nodes: ALL_NODES,
  entryNodes: ['name-sense'],
  connections: [], // Auto-generated from prerequisites
  xpSources: XP_SOURCES,
  rules: {
    ...createDefaultTreeRules(false), // No innate requirement
    allowRespec: false, // Names once learned cannot be unlearned
    permanentProgress: true,
  },
  version: 1,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get available name categories based on unlocked nodes.
 */
export function getAvailableCategories(unlockedNodes: Record<string, number>): (keyof typeof NAME_CATEGORIES)[] {
  const categories: (keyof typeof NAME_CATEGORIES)[] = [];

  if (unlockedNodes['simple-names']) categories.push('simple_objects');
  if (unlockedNodes['complex-names']) categories.push('complex_objects');
  if (unlockedNodes['plant-names']) categories.push('plants');
  if (unlockedNodes['animal-names']) categories.push('animals');
  if (unlockedNodes['people-names']) categories.push('people');
  if (unlockedNodes['elemental-names']) categories.push('elements');
  if (unlockedNodes['concept-names']) categories.push('concepts');
  if (unlockedNodes['spirit-names']) categories.push('spirits');

  return categories;
}

/**
 * Calculate speaking power bonus.
 */
export function getSpeakingPowerBonus(unlockedNodes: Record<string, number>): number {
  let bonus = 0;

  if (unlockedNodes['true-speech']) {
    bonus += 10 + (unlockedNodes['true-speech'] - 1) * 5;
  }
  if (unlockedNodes['speaking-power']) {
    bonus += 15 + (unlockedNodes['speaking-power'] - 1) * 5;
  }

  return bonus;
}

/**
 * Calculate name protection (resistance to being named).
 */
export function getNameProtection(unlockedNodes: Record<string, number>): number {
  let protection = 0;

  if (unlockedNodes['name-hiding']) {
    protection += 20 + (unlockedNodes['name-hiding'] - 1) * 10;
  }
  if (unlockedNodes['false-names']) {
    protection += 15;
  }
  if (unlockedNodes['name-wards']) {
    protection += 20;
  }
  if (unlockedNodes['nameless-state']) {
    protection = 100; // Complete immunity
  }

  return Math.min(protection, 100);
}

/**
 * Check if can learn names in a category.
 */
export function canLearnCategory(
  category: keyof typeof NAME_CATEGORIES,
  unlockedNodes: Record<string, number>
): boolean {
  return getAvailableCategories(unlockedNodes).includes(category);
}

/**
 * Check if has master-level naming power.
 */
export function hasMasterNaming(unlockedNodes: Record<string, number>): boolean {
  return !!(unlockedNodes['changing-names'] || unlockedNodes['name-of-names']);
}
