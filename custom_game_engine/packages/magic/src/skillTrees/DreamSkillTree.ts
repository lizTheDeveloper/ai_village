/**
 * DreamSkillTree - Skill tree for the Dream paradigm
 *
 * Key mechanics:
 * - Lucidity (awareness and control within dreams)
 * - Dream stability (preventing collapse/waking)
 * - Time dilation (dream time vs real time)
 * - Shared dreaming (entering others' dreams)
 * - Dream walking (navigating between dream realms)
 * - Nightmare resistance and manipulation
 * - Oneiromancy (divination through dreams)
 *
 * Time-gated abilities:
 * - Many abilities only work while sleeping
 * - Some require specific sleep stages (REM, deep sleep)
 * - Moon phase affects dream potency
 *
 * Risks:
 * - Getting lost in dreams
 * - Nightmare intrusion
 * - Reality confusion upon waking
 * - Dream addiction
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

const PARADIGM_ID = 'dream';

/** Dream realm types that can be visited */
export const DREAM_REALMS = {
  personal: 'Your own dreamscape',
  shared: 'Dreams shared with others',
  ancestral: 'Dreams of the dead/ancestors',
  prophetic: 'Dreams that show the future',
  memory: 'Dreams that replay memories',
  nightmare: 'The realm of fears and terrors',
  collective: 'The universal dream-sea',
  liminal: 'The border between waking and sleeping',
} as const;

/** Sleep stages that affect dream magic */
export const SLEEP_STAGES = {
  light: 'Light sleep - limited access',
  deep: 'Deep sleep - stable but unconscious',
  rem: 'REM sleep - vivid dreams, full access',
  lucid: 'Lucid state - conscious control',
  liminal: 'Hypnagogic/hypnopompic - transition states',
} as const;

/** Nightmare types that can intrude */
export const NIGHTMARE_TYPES = [
  'pursuit',      // Being chased
  'falling',      // Endless fall
  'paralysis',    // Cannot move or scream
  'exposure',     // Naked/unprepared
  'loss',         // Losing something/someone
  'corruption',   // Body/mind horror
  'entity',       // Hostile dream being
  'dissolution',  // Self/reality dissolving
] as const;

// ============================================================================
// Foundation Nodes - Basic Dream Awareness
// ============================================================================

/** Entry node - remembering dreams */
const DREAM_RECALL_NODE = createSkillNode(
  'dream-recall',
  'Dream Recall',
  PARADIGM_ID,
  'foundation',
  0,
  25,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Remember dreams upon waking',
      target: { abilityId: 'dream_memory' },
    }),
  ],
  {
    description: 'Learn to remember your dreams',
    lore: `Most people forget their dreams within minutes of waking. The first step
to dream magic is learning to carry those memories across the threshold.
Keep a dream journal. Write immediately upon waking. In time, the veil thins.`,
    maxLevel: 3,
    levelCostMultiplier: 1.3,
    icon: '📔',
  }
);

/** Basic lucidity - realizing you're dreaming */
const BASIC_LUCIDITY_NODE = createSkillNode(
  'basic-lucidity',
  'Basic Lucidity',
  PARADIGM_ID,
  'foundation',
  1,
  50,
  [
    createSkillEffect('lucidity', 1, {
      perLevelValue: 1,
      description: 'Awareness level within dreams',
    }),
  ],
  {
    description: 'Learn to recognize when you are dreaming',
    lore: `The moment of recognition: "This is a dream." For most, this triggers
immediate waking. But with practice, you can hold that awareness gently,
like a soap bubble, and remain within the dream while knowing its nature.`,
    prerequisites: ['dream-recall'],
    maxLevel: 5,
    levelCostMultiplier: 1.5,
    icon: '💭',
  }
);

/** Reality testing - techniques to induce lucidity */
const REALITY_TESTING_NODE = createSkillNode(
  'reality-testing',
  'Reality Testing',
  PARADIGM_ID,
  'foundation',
  1,
  40,
  [
    createSkillEffect('lucidity', 1, {
      description: 'Techniques to trigger lucidity',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'reality_check' },
      description: 'Perform reality checks to detect dreams',
    }),
  ],
  {
    description: 'Learn techniques to recognize dreams',
    lore: 'Look at your hands. Read text, look away, read again. Try to breathe with your nose pinched. In dreams, these simple tests reveal the truth.',
    prerequisites: ['dream-recall'],
  }
);

/** Dream stability - preventing early waking */
const DREAM_STABILITY_NODE = createSkillNode(
  'dream-stability',
  'Dream Stability',
  PARADIGM_ID,
  'technique',
  1,
  60,
  [
    createSkillEffect('dream_stability', 10, {
      perLevelValue: 5,
      description: '+X% resistance to dream collapse',
    }),
  ],
  {
    description: 'Learn to stabilize dreams and prevent waking',
    lore: `When lucidity comes, the dream often wavers - colors fade, details blur,
the ground becomes uncertain. Spin in place. Touch surfaces. Focus on
sensory details. These anchors hold the dream together.`,
    prerequisites: ['basic-lucidity'],
    maxLevel: 5,
    levelCostMultiplier: 1.4,
  }
);

// ============================================================================
// Control Nodes - Manipulating Dreams
// ============================================================================

/** Dream control - changing the dream environment */
const DREAM_CONTROL_NODE = createSkillNode(
  'dream-control',
  'Dream Control',
  PARADIGM_ID,
  'technique',
  2,
  100,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'dream_manipulation' },
      description: 'Can alter dream environment',
    }),
  ],
  {
    description: 'Learn to change the dream environment',
    lore: `In a lucid dream, expectation shapes reality. Believe a door leads
somewhere, and it will. Expect to fly, and you shall. The trick is not
forcing change but allowing it - the dream responds to belief, not effort.`,
    prerequisites: ['dream-stability'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'basic-lucidity', level: 2 },
        'Must have moderate lucidity control'
      ),
    ],
    conditionMode: 'all',
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

/** Dream flight - classic lucid dream ability */
const DREAM_FLIGHT_NODE = createSkillNode(
  'dream-flight',
  'Dream Flight',
  PARADIGM_ID,
  'technique',
  2,
  75,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'dream_flight' },
      description: 'Can fly within dreams',
    }),
  ],
  {
    description: 'Learn to fly within dreams',
    lore: 'The most common lucid dream ability - and the most joyful. At first you may only hover or glide. With practice, you will soar.',
    prerequisites: ['dream-control'],
  }
);

/** Time perception - dream time manipulation */
const TIME_PERCEPTION_NODE = createSkillNode(
  'time-perception',
  'Time Perception',
  PARADIGM_ID,
  'technique',
  2,
  125,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'dream_time_sense' },
      description: 'Perceive time dilation in dreams',
    }),
  ],
  {
    description: 'Learn to perceive and work with dream time',
    lore: `In dreams, time is elastic. A night's sleep can contain weeks of
subjective experience - or a blink. Learning to perceive this elasticity
is the first step to controlling it.`,
    prerequisites: ['dream-stability'],
    maxLevel: 3,
    levelCostMultiplier: 1.5,
  }
);

/** Time dilation - extending dream time */
const TIME_DILATION_NODE = createSkillNode(
  'time-dilation',
  'Time Dilation',
  PARADIGM_ID,
  'mastery',
  3,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'time_dilation' },
      description: 'Extend subjective time in dreams',
    }),
  ],
  {
    description: 'Extend your subjective time within dreams',
    lore: `With mastery, you can stretch a single night's sleep into days of
dream-time. Practice skills, study, explore - all while your body rests.
But be warned: spend too long, and waking reality begins to feel unreal.`,
    prerequisites: ['time-perception'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'time-perception', level: 3 },
        'Must have mastered time perception'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Dream architecture - building persistent dreamscapes */
const DREAM_ARCHITECTURE_NODE = createSkillNode(
  'dream-architecture',
  'Dream Architecture',
  PARADIGM_ID,
  'mastery',
  3,
  175,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'dream_construction' },
      description: 'Build persistent dream locations',
    }),
  ],
  {
    description: 'Build persistent locations in your dreamscape',
    lore: `Most dream environments are ephemeral, shifting with each visit. But
a skilled dreamer can construct places that persist - a workshop, a library,
a sanctuary. These become anchors, always accessible from within sleep.`,
    prerequisites: ['dream-control'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'dream-control', level: 3 },
        'Must have significant dream control'
      ),
    ],
    conditionMode: 'all',
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

// ============================================================================
// Nightmare Nodes - Dealing with Dark Dreams
// ============================================================================

/** Nightmare resistance */
const NIGHTMARE_RESISTANCE_NODE = createSkillNode(
  'nightmare-resistance',
  'Nightmare Resistance',
  PARADIGM_ID,
  'technique',
  2,
  80,
  [
    createSkillEffect('nightmare_resistance', 15, {
      perLevelValue: 10,
      description: '+X% resistance to nightmare effects',
    }),
  ],
  {
    description: 'Build resistance to nightmare intrusion',
    lore: `Nightmares are not merely bad dreams - they are patterns of fear that
can trap even a lucid dreamer. Resistance comes from recognizing them
for what they are: stories told by your own mind.`,
    prerequisites: ['basic-lucidity'],
    maxLevel: 5,
    levelCostMultiplier: 1.4,
  }
);

/** Nightmare confrontation - facing fears */
const NIGHTMARE_CONFRONTATION_NODE = createSkillNode(
  'nightmare-confrontation',
  'Nightmare Confrontation',
  PARADIGM_ID,
  'technique',
  2,
  100,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'face_nightmare' },
      description: 'Confront nightmare entities directly',
    }),
  ],
  {
    description: 'Learn to confront and transform nightmares',
    lore: `The monster chasing you is your own creation. Turn and face it. Ask it
what it wants. In dreams, what you run from grows stronger; what you face
with courage transforms.`,
    prerequisites: ['nightmare-resistance'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'nightmare-resistance', level: 2 },
        'Must have baseline nightmare resistance'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Nightmare walking - entering nightmare realm */
const NIGHTMARE_WALKING_NODE = createSkillNode(
  'nightmare-walking',
  'Nightmare Walking',
  PARADIGM_ID,
  'mastery',
  4,
  250,
  [
    createSkillEffect('unlock_dream_realm', 1, {
      description: 'Can enter the nightmare realm',
    }),
  ],
  {
    description: 'Enter the nightmare realm deliberately',
    lore: `Beyond personal nightmares lies a deeper darkness - the collective realm
of fear itself. To walk there willingly is to face horrors beyond imagination.
But also to find power, for nightmares fear nothing more than a fearless dreamer.`,
    prerequisites: ['nightmare-confrontation'],
    unlockConditions: [
      createUnlockCondition(
        'dream_visited',
        { dreamLocationId: 'personal_nightmare' },
        'Must have conquered a personal nightmare'
      ),
    ],
    conditionMode: 'all',
  }
);

// ============================================================================
// Shared Dreaming Nodes
// ============================================================================

/** Dream sense - sensing other dreamers */
const DREAM_SENSE_NODE = createSkillNode(
  'dream-sense',
  'Dream Sense',
  PARADIGM_ID,
  'relationship',
  2,
  90,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'sense_dreamers' },
      description: 'Sense nearby sleeping minds',
    }),
  ],
  {
    description: 'Sense the dreams of those sleeping nearby',
    lore: `In sleep, minds radiate like fireflies in darkness. With practice, you
can sense these glowing presences - and eventually, reach toward them.`,
    prerequisites: ['dream-stability'],
    unlockConditions: [
      createUnlockCondition(
        'time_of_day',
        { timeRange: { start: 22, end: 6 } },
        'Only available at night (10pm - 6am)'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Dream linking - connecting to another dreamer */
const DREAM_LINKING_NODE = createSkillNode(
  'dream-linking',
  'Dream Linking',
  PARADIGM_ID,
  'relationship',
  3,
  150,
  [
    createSkillEffect('shared_dreaming', 1, {
      description: 'Can connect to one other dreamer',
    }),
  ],
  {
    description: 'Learn to link your dream to another\'s',
    lore: `Two dreamers, sleeping in proximity, can learn to merge their dreams.
At first the connection is tenuous - you may only glimpse each other.
With practice, you can meet as clearly as in waking life.`,
    prerequisites: ['dream-sense'],
    unlockConditions: [
      createUnlockCondition(
        'teacher_found',
        { teacherType: 'dream_mentor' },
        'Must learn from an experienced dream mage'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Dream invasion - entering unwilling dreams */
const DREAM_INVASION_NODE = createSkillNode(
  'dream-invasion',
  'Dream Walking',
  PARADIGM_ID,
  'mastery',
  4,
  300,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'dream_invasion' },
      description: 'Enter dreams without consent',
    }),
  ],
  {
    description: 'Enter the dreams of others without their consent',
    lore: `A dark art - to walk uninvited through another's sleeping mind. Their
defenses may be weak, but the moral weight is heavy. And dreamers often
know, on some level, when they have been violated.`,
    prerequisites: ['dream-linking'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'dream-linking', level: 1 },
        'Must have mastered consensual dream sharing'
      ),
      createUnlockCondition(
        'node_level',
        { nodeId: 'dream-control', level: 4 },
        'Must have strong dream control'
      ),
    ],
    conditionMode: 'all',
    icon: '👁️',
  }
);

/** Collective dreaming - group dreams */
const COLLECTIVE_DREAMING_NODE = createSkillNode(
  'collective-dreaming',
  'Collective Dreaming',
  PARADIGM_ID,
  'mastery',
  4,
  275,
  [
    createSkillEffect('shared_dreaming', 4, {
      perLevelValue: 2,
      description: 'Can include X additional dreamers',
    }),
  ],
  {
    description: 'Bring multiple dreamers into a shared space',
    lore: `When many dreamers meet in a single space, the dream grows in power
and stability. Group rituals performed in shared dreams can affect
waking reality in ways impossible for a lone dreamer.`,
    prerequisites: ['dream-linking', 'dream-architecture'],
    maxLevel: 5,
    levelCostMultiplier: 2,
  }
);

// ============================================================================
// Oneiromancy Nodes - Dream Divination
// ============================================================================

/** Prophetic sensitivity - recognizing meaningful dreams */
const PROPHETIC_SENSITIVITY_NODE = createSkillNode(
  'prophetic-sensitivity',
  'Prophetic Sensitivity',
  PARADIGM_ID,
  'discovery',
  2,
  100,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'prophetic_sense' },
      description: 'Recognize when a dream is prophetic',
    }),
  ],
  {
    description: 'Learn to recognize prophetic dreams',
    lore: `Not all dreams are mere fancy - some carry the weight of truth. A
prophetic dream has a particular feeling: vivid, inevitable, heavy with
meaning. Learning to recognize this feeling is the key to oneiromancy.`,
    prerequisites: ['dream-recall'],
    unlockConditions: [
      createUnlockCondition(
        'vision_received',
        { visionType: 'prophetic_dream' },
        'Must have had a prophetic dream'
      ),
    ],
    conditionMode: 'all',
    hidden: true, // Revealed when they have a prophetic dream
  }
);

/** Dream interpretation */
const DREAM_INTERPRETATION_NODE = createSkillNode(
  'dream-interpretation',
  'Dream Interpretation',
  PARADIGM_ID,
  'discovery',
  2,
  75,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'interpret_dream' },
      description: 'Decode symbolic dream messages',
    }),
  ],
  {
    description: 'Learn to interpret dream symbolism',
    lore: 'Dreams speak in symbols, not words. Water means emotion. Teeth mean anxiety. Learn the language, and dreams become messages.',
    prerequisites: ['dream-recall', 'prophetic-sensitivity'],
    maxLevel: 5,
    levelCostMultiplier: 1.4,
  }
);

/** Induced prophecy - seeking visions */
const INDUCED_PROPHECY_NODE = createSkillNode(
  'induced-prophecy',
  'Induced Prophecy',
  PARADIGM_ID,
  'mastery',
  4,
  250,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'induce_prophecy' },
      description: 'Deliberately seek prophetic dreams',
    }),
  ],
  {
    description: 'Learn to deliberately seek prophetic visions',
    lore: `With preparation and intention, you can enter sleep seeking answers.
The vision may not be clear - prophecy speaks in riddles. But the
dreaming mind can see what the waking mind cannot.`,
    prerequisites: ['dream-interpretation', 'dream-control'],
    unlockConditions: [
      createUnlockCondition(
        'moon_phase',
        { moonPhases: ['full', 'new'] },
        'Only achievable during full or new moon'
      ),
    ],
    conditionMode: 'all',
  }
);

// ============================================================================
// Ancestral/Memory Dream Nodes
// ============================================================================

/** Memory diving - exploring dream memories */
const MEMORY_DIVING_NODE = createSkillNode(
  'memory-diving',
  'Memory Diving',
  PARADIGM_ID,
  'discovery',
  3,
  150,
  [
    createSkillEffect('unlock_dream_realm', 1, {
      description: 'Can enter memory-dreams',
    }),
  ],
  {
    description: 'Explore memories through dreams',
    lore: `In dreams, you can revisit your memories - not as faded recollections,
but as living experiences. Walk through your childhood home. See faces
long forgotten. But beware: memories in dreams are not always accurate.`,
    prerequisites: ['dream-control'],
  }
);

/** Ancestral dreaming - contacting the dead */
const ANCESTRAL_DREAMING_NODE = createSkillNode(
  'ancestral-dreaming',
  'Ancestral Dreaming',
  PARADIGM_ID,
  'mastery',
  4,
  300,
  [
    createSkillEffect('unlock_dream_realm', 1, {
      description: 'Can contact ancestors in dreams',
    }),
  ],
  {
    description: 'Contact the dead through dreams',
    lore: `The boundary between dreams and death is thin. Those who have passed
sometimes linger in the ancestral dream-realm. Whether you contact true
spirits or merely memories is a question even masters cannot answer.`,
    prerequisites: ['memory-diving'],
    unlockConditions: [
      createUnlockCondition(
        'ritual_performed',
        { ritualId: 'ancestral_preparation' },
        'Must perform the ancestral preparation ritual'
      ),
    ],
    conditionMode: 'all',
  }
);

// ============================================================================
// Liminal Nodes - Border States
// ============================================================================

/** Hypnagogia mastery - the edge of sleep */
const HYPNAGOGIA_NODE = createSkillNode(
  'hypnagogia',
  'Hypnagogic Mastery',
  PARADIGM_ID,
  'technique',
  2,
  100,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'hypnagogic_control' },
      description: 'Control the edge-of-sleep state',
    }),
  ],
  {
    description: 'Master the hypnagogic state between waking and sleeping',
    lore: `The moment of falling asleep is a liminal space where reality is
malleable. In this state, you can enter dreams consciously - and
sometimes, perceive things invisible to both waking and sleeping minds.`,
    prerequisites: ['basic-lucidity', 'reality-testing'],
  }
);

/** Wake-initiated lucid dreaming */
const WILD_NODE = createSkillNode(
  'wild',
  'Wake-Initiated Lucid Dream',
  PARADIGM_ID,
  'mastery',
  3,
  175,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'wild_technique' },
      description: 'Enter dreams directly from waking',
    }),
  ],
  {
    description: 'Enter lucid dreams directly from waking consciousness',
    lore: `The ultimate technique: maintaining consciousness as you fall asleep,
slipping from waking into dreaming without a break in awareness. It
requires perfect stillness and perfect alertness simultaneously.`,
    prerequisites: ['hypnagogia'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'hypnagogia', level: 1 },
        'Must have hypnagogic control'
      ),
      createUnlockCondition(
        'node_level',
        { nodeId: 'basic-lucidity', level: 4 },
        'Must have strong lucidity'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Dream within a dream */
const NESTED_DREAMING_NODE = createSkillNode(
  'nested-dreaming',
  'Nested Dreaming',
  PARADIGM_ID,
  'mastery',
  5,
  400,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'nested_dreams' },
      description: 'Create dreams within dreams',
    }),
  ],
  {
    description: 'Create and navigate nested layers of dreams',
    lore: `Dreams within dreams - each layer deeper, time slower, reality more
malleable. The deepest dreamers can descend through multiple layers,
though each makes the return to waking more difficult.`,
    prerequisites: ['wild', 'time-dilation', 'dream-architecture'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 2000 },
        'Must have extensive dream experience'
      ),
    ],
    conditionMode: 'all',
    icon: '🌀',
  }
);

// ============================================================================
// XP Sources
// ============================================================================

const XP_SOURCES: MagicXPSource[] = [
  {
    eventType: 'dream_recalled',
    xpAmount: 5,
    description: 'Remember a dream upon waking',
  },
  {
    eventType: 'lucidity_achieved',
    xpAmount: 25,
    description: 'Become lucid in a dream',
  },
  {
    eventType: 'dream_stabilized',
    xpAmount: 15,
    description: 'Stabilize a wavering dream',
  },
  {
    eventType: 'dream_controlled',
    xpAmount: 20,
    description: 'Successfully manipulate dream environment',
  },
  {
    eventType: 'nightmare_faced',
    xpAmount: 50,
    description: 'Confront and transform a nightmare',
  },
  {
    eventType: 'dream_shared',
    xpAmount: 75,
    description: 'Successfully share a dream with another',
  },
  {
    eventType: 'prophecy_received',
    xpAmount: 100,
    description: 'Receive a prophetic dream',
  },
  {
    eventType: 'ancestor_contacted',
    xpAmount: 100,
    description: 'Contact an ancestor in dreams',
  },
  {
    eventType: 'realm_explored',
    xpAmount: 60,
    description: 'Explore a new dream realm',
  },
  {
    eventType: 'wild_success',
    xpAmount: 40,
    description: 'Successfully perform WILD technique',
  },
];

// ============================================================================
// Tree Assembly
// ============================================================================

const ALL_NODES: MagicSkillNode[] = [
  // Foundation
  DREAM_RECALL_NODE,
  BASIC_LUCIDITY_NODE,
  REALITY_TESTING_NODE,
  DREAM_STABILITY_NODE,

  // Control
  DREAM_CONTROL_NODE,
  DREAM_FLIGHT_NODE,
  TIME_PERCEPTION_NODE,
  TIME_DILATION_NODE,
  DREAM_ARCHITECTURE_NODE,

  // Nightmares
  NIGHTMARE_RESISTANCE_NODE,
  NIGHTMARE_CONFRONTATION_NODE,
  NIGHTMARE_WALKING_NODE,

  // Shared Dreaming
  DREAM_SENSE_NODE,
  DREAM_LINKING_NODE,
  DREAM_INVASION_NODE,
  COLLECTIVE_DREAMING_NODE,

  // Oneiromancy
  PROPHETIC_SENSITIVITY_NODE,
  DREAM_INTERPRETATION_NODE,
  INDUCED_PROPHECY_NODE,

  // Memory/Ancestral
  MEMORY_DIVING_NODE,
  ANCESTRAL_DREAMING_NODE,

  // Liminal
  HYPNAGOGIA_NODE,
  WILD_NODE,
  NESTED_DREAMING_NODE,
];

/**
 * The Dream skill tree.
 * Anyone can learn, but many abilities are time-gated (night, sleep, moon phases).
 */
export const DREAM_SKILL_TREE: MagicSkillTree = {
  id: 'dream-tree',
  paradigmId: PARADIGM_ID,
  name: 'The Art of Dreaming',
  description: 'Master lucid dreaming, walk through others\' dreams, and glimpse the future.',
  lore: `Dreams are not mere phantasms of a sleeping mind - they are a realm unto
themselves, as real in their way as the waking world. The dreamer who learns
to walk with awareness through this realm gains powers beyond the waking:
mastery of time, glimpses of the future, communion with the dead, and the
ability to share dreams with others.

But the dream realm has its dangers. Nightmares are not mere fears - they
are predators that stalk the unwary. And those who spend too long in dreams
may find waking reality growing thin and unreal.`,
  nodes: ALL_NODES,
  entryNodes: ['dream-recall'],
  connections: [], // Auto-generated from prerequisites
  xpSources: XP_SOURCES,
  rules: {
    ...createDefaultTreeRules(false), // No innate requirement
    allowRespec: true, // Dreams are mutable
    permanentProgress: true,
    progressLossConditions: [
      createUnlockCondition(
        'trauma_experienced',
        { traumaType: 'dream_death' },
        'Dying in a dream causes temporary progress loss'
      ),
    ],
  },
  version: 1,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get available dream realms based on unlocked nodes.
 */
export function getAvailableRealms(unlockedNodes: Record<string, number>): (keyof typeof DREAM_REALMS)[] {
  const realms: (keyof typeof DREAM_REALMS)[] = ['personal']; // Always available

  if (unlockedNodes['memory-diving']) realms.push('memory');
  if (unlockedNodes['ancestral-dreaming']) realms.push('ancestral');
  if (unlockedNodes['nightmare-walking']) realms.push('nightmare');
  if (unlockedNodes['dream-linking']) realms.push('shared');
  if (unlockedNodes['collective-dreaming']) realms.push('collective');
  if (unlockedNodes['hypnagogia']) realms.push('liminal');
  if (unlockedNodes['prophetic-sensitivity']) realms.push('prophetic');

  return realms;
}

/**
 * Calculate time dilation factor.
 * Returns how many dream-hours per real-hour of sleep.
 */
export function getTimeDilationFactor(unlockedNodes: Record<string, number>): number {
  if (!unlockedNodes['time-perception']) return 1;

  let factor = 1 + unlockedNodes['time-perception'] * 0.5; // 1.5x to 2.5x with levels

  if (unlockedNodes['time-dilation']) {
    factor *= 2; // Doubles effective time
  }

  if (unlockedNodes['nested-dreaming']) {
    factor *= 1.5; // Additional 50% in nested dreams
  }

  return factor;
}

/**
 * Calculate maximum shared dreamers.
 */
export function getMaxSharedDreamers(unlockedNodes: Record<string, number>): number {
  if (!unlockedNodes['dream-linking']) return 0;

  let max = 1; // Basic linking = 1 other person

  if (unlockedNodes['collective-dreaming']) {
    max += 4 + (unlockedNodes['collective-dreaming'] - 1) * 2;
  }

  return max;
}

/**
 * Calculate nightmare resistance percentage.
 */
export function getNightmareResistance(unlockedNodes: Record<string, number>): number {
  let resistance = 0;

  if (unlockedNodes['nightmare-resistance']) {
    resistance += 15 + (unlockedNodes['nightmare-resistance'] - 1) * 10;
  }

  if (unlockedNodes['nightmare-confrontation']) {
    resistance += 20; // Bonus for confrontation ability
  }

  if (unlockedNodes['nightmare-walking']) {
    resistance += 25; // Masters are nearly immune
  }

  return Math.min(resistance, 95); // Cap at 95%
}

/**
 * Check if a dream realm is accessible.
 */
export function canAccessRealm(
  realm: keyof typeof DREAM_REALMS,
  unlockedNodes: Record<string, number>
): boolean {
  return getAvailableRealms(unlockedNodes).includes(realm);
}
