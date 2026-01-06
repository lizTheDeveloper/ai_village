/**
 * EmotionalSkillTree - Skill tree for the Emotional paradigm
 *
 * Key mechanics:
 * - Emotions as magical fuel and resource
 * - Storing emotions in objects (emotion reservoirs)
 * - Emotional manipulation (self and others)
 * - Empathy and emotional sensing
 * - Emotional resonance and amplification
 * - Different emotions grant different powers
 * - Emotional balance vs. mono-emotion mastery
 * - Drawing power from intense emotional states
 * - Emotional constructs and embodiments
 *
 * Inspired by:
 * - Sanderson's Allomancy (but with emotions)
 * - Emotional Spectrum from DC (Green Lantern)
 * - Empathy-based magic systems
 * - The concept that emotions are power
 * - Mood-based magic
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

const PARADIGM_ID = 'emotional';

/** Primary emotion types and their effects */
export const EMOTIONS = {
  joy: 'Joy - Healing, creation, growth, inspiration',
  love: 'Love - Connection, protection, sacrifice, bonds',
  hope: 'Hope - Perseverance, recovery, faith, willpower',
  courage: 'Courage - Strength, defense, facing fear, leadership',
  anger: 'Anger - Destruction, power, revenge, fury',
  fear: 'Fear - Paralysis, nightmares, horror, warnings',
  sorrow: 'Sorrow - Empathy, understanding, endings, release',
  desire: 'Desire - Acquisition, attraction, obsession, greed',
  pride: 'Pride - Confidence, authority, arrogance, dominance',
  disgust: 'Disgust - Repulsion, purification, rejection, boundaries',
} as const;

/** Emotion categories */
export const EMOTION_CATEGORIES = {
  positive: ['joy', 'love', 'hope', 'courage'] as const,
  negative: ['anger', 'fear', 'sorrow', 'disgust'] as const,
  complex: ['desire', 'pride'] as const,
} as const;

/** Emotional techniques */
export const EMOTIONAL_TECHNIQUES = {
  sensing: 'Sense emotions in others',
  storing: 'Store emotions in objects for later use',
  channeling: 'Channel emotions into magical effects',
  projecting: 'Project emotions onto others',
  draining: 'Drain emotions from others',
  amplifying: 'Amplify emotional intensity',
  transmuting: 'Convert one emotion into another',
  embodying: 'Create emotional constructs',
} as const;

/** Emotion storage methods */
export const STORAGE_METHODS = {
  object: 'Store in physical objects (gems, crystals)',
  memory: 'Bind to specific memories',
  place: 'Anchor to locations',
  music: 'Encode in songs or melodies',
  art: 'Capture in visual art',
  ritual: 'Preserve through repeated ritual',
} as const;

// ============================================================================
// Foundation Nodes - Emotional Awareness
// ============================================================================

/** Entry node - sensing emotions */
const EMOTION_SENSE_NODE = createSkillNode(
  'emotion-sense',
  'Emotional Awareness',
  PARADIGM_ID,
  'foundation',
  0,
  30,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Sense emotions in yourself and others',
      target: { abilityId: 'sense_emotion' },
    }),
  ],
  {
    description: 'Learn to sense and identify emotions',
    lore: `Emotions are forces - invisible but powerful. You learn to feel them in
yourself and others: the warmth of joy, the heaviness of sorrow, the spark
of anger. This awareness is the foundation of all emotional magic.`,
    maxLevel: 5,
    levelCostMultiplier: 1.3,
    icon: '💓',
  }
);

/** Emotional clarity - understanding your emotions */
const EMOTIONAL_CLARITY_NODE = createSkillNode(
  'emotional-clarity',
  'Emotional Clarity',
  PARADIGM_ID,
  'foundation',
  1,
  60,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Achieve clarity about your emotional state',
      target: { abilityId: 'emotional_clarity' },
    }),
  ],
  {
    description: 'Master understanding of your own emotions',
    lore: `Before you can control others' emotions, you must master your own. Perfect
clarity means knowing exactly what you feel and why. No confusion, no
self-deception - just pure emotional truth.`,
    prerequisites: ['emotion-sense'],
    maxLevel: 5,
  }
);

/** Empathy - deep emotional connection */
const EMPATHY_NODE = createSkillNode(
  'empathy',
  'Deep Empathy',
  PARADIGM_ID,
  'foundation',
  1,
  75,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Feel others\' emotions deeply',
      target: { abilityId: 'empathy' },
    }),
  ],
  {
    description: 'Develop deep empathic connection with others',
    lore: `Empathy goes beyond sensing - you FEEL what they feel. Their joy becomes
your joy. Their pain becomes your pain. This connection is powerful but
dangerous. Feel too much and you might lose yourself in others' emotions.`,
    prerequisites: ['emotion-sense'],
    maxLevel: 5,
    levelCostMultiplier: 1.4,
  }
);

/** Emotional control - mastering your feelings */
const EMOTIONAL_CONTROL_NODE = createSkillNode(
  'emotional-control',
  'Emotional Mastery',
  PARADIGM_ID,
  'foundation',
  2,
  100,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Control your emotional state at will',
      target: { abilityId: 'control_emotion' },
    }),
  ],
  {
    description: 'Learn to control your emotional state',
    lore: `Choose what you feel. Summon joy when despairing. Suppress fear when
terrified. Calm anger when enraged. This isn't suppression - it's mastery.
You feel fully, but you CHOOSE what to feel.`,
    prerequisites: ['emotional-clarity'],
  }
);

// ============================================================================
// Emotion Type Nodes - Channeling Specific Emotions
// ============================================================================

/** Joy magic - creation and healing */
const JOY_MAGIC_NODE = createSkillNode(
  'joy-magic',
  'Joy Channeling',
  PARADIGM_ID,
  'channeling',
  2,
  125,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Channel joy into healing and creation',
      target: { abilityId: 'joy_magic' },
    }),
  ],
  {
    description: 'Channel joy into magical effects',
    lore: `Joy is creation itself - new life, new growth, new possibilities. Channel
pure joy and you can heal wounds, inspire hope, create beauty from nothing.
The more genuine the joy, the stronger the effect.`,
    prerequisites: ['emotional-control'],
    icon: '😊',
  }
);

/** Love magic - connection and protection */
const LOVE_MAGIC_NODE = createSkillNode(
  'love-magic',
  'Love Channeling',
  PARADIGM_ID,
  'channeling',
  2,
  150,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Channel love into bonds and protection',
      target: { abilityId: 'love_magic' },
    }),
  ],
  {
    description: 'Channel love into magical effects',
    lore: `Love is the strongest force - connection, protection, sacrifice. Channel
love and you can shield those you care for, forge unbreakable bonds, even
take their pain upon yourself. But love magic requires genuine feeling -
you cannot fake it.`,
    prerequisites: ['emotional-control', 'empathy'],
    icon: '💕',
  }
);

/** Anger magic - destruction and power */
const ANGER_MAGIC_NODE = createSkillNode(
  'anger-magic',
  'Fury Channeling',
  PARADIGM_ID,
  'channeling',
  2,
  125,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Channel anger into destructive power',
      target: { abilityId: 'anger_magic' },
    }),
  ],
  {
    description: 'Channel anger into magical effects',
    lore: `Anger is raw destructive force. Channel rage and you gain terrifying power -
strength to shatter stone, fire to burn enemies, fury that cannot be stopped.
But anger is dangerous. Lose control and you'll destroy everything, including
yourself.`,
    prerequisites: ['emotional-control'],
    icon: '😠',
  }
);

/** Fear magic - paralysis and nightmares */
const FEAR_MAGIC_NODE = createSkillNode(
  'fear-magic',
  'Fear Projection',
  PARADIGM_ID,
  'channeling',
  2,
  140,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Channel fear into terrifying effects',
      target: { abilityId: 'fear_magic' },
    }),
  ],
  {
    description: 'Channel fear into magical effects',
    lore: `Fear paralyzes, horrifies, breaks the will. Channel your own fear or
others' and you can create nightmares made real, paralyze enemies with
terror, reveal hidden fears. This is dark magic - wielding horror itself.`,
    prerequisites: ['emotional-control'],
    icon: '😱',
  }
);

// ============================================================================
// Emotion Storage Nodes
// ============================================================================

/** Basic storage - preserving emotions */
const EMOTION_STORAGE_NODE = createSkillNode(
  'emotion-storage',
  'Emotion Storage',
  PARADIGM_ID,
  'technique',
  2,
  150,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Store emotions in objects',
      target: { abilityId: 'store_emotion' },
    }),
  ],
  {
    description: 'Learn to store emotions in objects',
    lore: `Emotions fade. But you can preserve them - capture a moment of pure joy
in a crystal, bind rage to a weapon, store love in a locket. Later, release
the stored emotion for power or to relive the feeling.`,
    prerequisites: ['emotional-control', 'joy-magic'],
    unlockConditions: [
      createUnlockCondition(
        'teacher_found',
        { teacherType: 'emotion_mage' },
        'Must be taught by an emotional mage'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Emotion reservoir - large storage */
const EMOTION_RESERVOIR_NODE = createSkillNode(
  'emotion-reservoir',
  'Emotion Reservoir',
  PARADIGM_ID,
  'technique',
  3,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Create large emotion storage vessels',
      target: { abilityId: 'emotion_reservoir' },
    }),
  ],
  {
    description: 'Create vessels that hold vast emotional energy',
    lore: `A single gem can hold one moment. But a reservoir - a specially prepared
crystal, a consecrated place, a work of art - can hold years of accumulated
emotion. These become batteries of emotional power.`,
    prerequisites: ['emotion-storage'],
    maxLevel: 5,
  }
);

/** Emotion transfusion - sharing stored emotions */
const EMOTION_TRANSFUSION_NODE = createSkillNode(
  'emotion-transfusion',
  'Emotion Transfusion',
  PARADIGM_ID,
  'technique',
  3,
  175,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Transfer stored emotions to others',
      target: { abilityId: 'transfuse_emotion' },
    }),
  ],
  {
    description: 'Transfer stored emotions to others',
    lore: `Give someone your stored joy when they despair. Transfer courage to the
fearful. Share love with the lonely. Emotional transfusion is a gift -
but can also be a weapon. Force fear onto enemies. Inflict sorrow on the
joyful.`,
    prerequisites: ['emotion-storage'],
  }
);

// ============================================================================
// Emotion Manipulation Nodes
// ============================================================================

/** Emotion projection - affecting others */
const EMOTION_PROJECTION_NODE = createSkillNode(
  'emotion-projection',
  'Emotion Projection',
  PARADIGM_ID,
  'technique',
  3,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Project emotions onto others',
      target: { abilityId: 'project_emotion' },
    }),
  ],
  {
    description: 'Project your emotions onto others',
    lore: `Make them feel what you feel. Project your joy and they become happy.
Project your fear and they panic. This is manipulation - overriding their
natural emotional state with yours. Powerful but ethically questionable.`,
    prerequisites: ['empathy', 'emotional-control'],
    maxLevel: 5,
  }
);

/** Emotion draining - stealing feelings */
const EMOTION_DRAINING_NODE = createSkillNode(
  'emotion-draining',
  'Emotion Draining',
  PARADIGM_ID,
  'technique',
  3,
  225,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Drain emotions from others',
      target: { abilityId: 'drain_emotion' },
    }),
  ],
  {
    description: 'Drain emotions from others to fuel your magic',
    lore: `Pull the emotions from others - their joy, their anger, their fear - and
consume them for power. This leaves them numb, empty, hollow. It's vampiric
and cruel, but devastatingly effective.`,
    prerequisites: ['empathy', 'emotion-storage'],
    icon: '🧛',
  }
);

/** Emotion amplification - intensifying feelings */
const EMOTION_AMPLIFICATION_NODE = createSkillNode(
  'emotion-amplification',
  'Emotion Amplification',
  PARADIGM_ID,
  'technique',
  3,
  175,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Amplify existing emotions',
      target: { abilityId: 'amplify_emotion' },
    }),
  ],
  {
    description: 'Amplify emotions to extreme intensity',
    lore: `Take what's already there and magnify it. Turn mild happiness into
ecstatic joy. Turn irritation into blinding rage. Turn concern into
paralyzing terror. Subtle, effective, and dangerous.`,
    prerequisites: ['emotion-projection'],
    maxLevel: 5,
  }
);

/** Emotion transmutation - changing feelings */
const EMOTION_TRANSMUTATION_NODE = createSkillNode(
  'emotion-transmutation',
  'Emotion Transmutation',
  PARADIGM_ID,
  'technique',
  4,
  275,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Transform one emotion into another',
      target: { abilityId: 'transmute_emotion' },
    }),
  ],
  {
    description: 'Transform one emotion into another',
    lore: `The alchemist's art applied to emotions: transform sorrow into joy, fear
into courage, hatred into love. This is incredibly difficult - emotions
have their own nature and resist change. But with skill, anything is
possible.`,
    prerequisites: ['emotion-projection', 'emotion-draining'],
  }
);

// ============================================================================
// Advanced Techniques
// ============================================================================

/** Emotional resonance - harmonizing emotions */
const EMOTIONAL_RESONANCE_NODE = createSkillNode(
  'emotional-resonance',
  'Emotional Resonance',
  PARADIGM_ID,
  'mastery',
  4,
  300,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Create resonance between multiple people\'s emotions',
      target: { abilityId: 'emotion_resonance' },
    }),
  ],
  {
    description: 'Create emotional resonance in groups',
    lore: `Harmonize the emotions of many into one unified feeling. An entire crowd
feels the same joy, the same fury, the same fear. This is how you create
mobs, inspire armies, unite nations - or tear them apart.`,
    prerequisites: ['emotion-amplification', 'empathy'],
  }
);

/** Emotional construct - creating from emotion */
const EMOTIONAL_CONSTRUCT_NODE = createSkillNode(
  'emotional-construct',
  'Emotional Constructs',
  PARADIGM_ID,
  'mastery',
  4,
  350,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Create physical constructs from pure emotion',
      target: { abilityId: 'emotion_construct' },
    }),
  ],
  {
    description: 'Create constructs from pure emotional energy',
    lore: `Emotion can become real. Shape rage into weapons of red fire. Form love
into shields of golden light. Create fear-shadows that terrify on sight.
These constructs are as real as any physical object - as long as the
emotion remains strong.`,
    prerequisites: ['emotion-reservoir', 'joy-magic', 'anger-magic'],
  }
);

/** Emotional embodiment - becoming emotion */
const EMOTIONAL_EMBODIMENT_NODE = createSkillNode(
  'emotional-embodiment',
  'Emotional Embodiment',
  PARADIGM_ID,
  'mastery',
  5,
  450,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Embody a pure emotion completely',
      target: { abilityId: 'embody_emotion' },
    }),
  ],
  {
    description: 'Become the living embodiment of an emotion',
    lore: `Transcend humanity and become pure emotion made flesh. Become Joy itself -
radiating healing and inspiration. Become Fury incarnate - unstoppable
destruction. Become Love eternal - infinite compassion and protection.
In this state, you are no longer human but something greater.`,
    prerequisites: ['emotional-construct', 'emotional-resonance'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 2500 },
        'Requires mastery of emotional magic'
      ),
    ],
    conditionMode: 'all',
    icon: '👑',
  }
);

/** Emotional void - feeling nothing */
const EMOTIONAL_VOID_NODE = createSkillNode(
  'emotional-void',
  'Emotional Void',
  PARADIGM_ID,
  'mastery',
  5,
  400,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Enter a state of absolute emotional emptiness',
      target: { abilityId: 'emotional_void' },
    }),
  ],
  {
    description: 'Achieve perfect emotional emptiness',
    lore: `The opposite of embodiment: feel nothing at all. No joy, no sorrow, no
fear, no love. Just void. In this state, you're immune to all emotional
manipulation, but you also cannot channel emotional magic. It's perfect
protection at the cost of your power.`,
    prerequisites: ['emotional-control', 'emotion-draining'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'emotional-control', level: 5 },
        'Requires perfect emotional control'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Emotion weaving - complex patterns */
const EMOTION_WEAVING_NODE = createSkillNode(
  'emotion-weaving',
  'Emotion Weaving',
  PARADIGM_ID,
  'mastery',
  5,
  500,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Weave complex emotional patterns and symphonies',
      target: { abilityId: 'weave_emotion' },
    }),
  ],
  {
    description: 'Master the art of emotional weaving',
    lore: `Emotions need not be pure. Weave joy with sorrow, love with fear, courage
with humility. Create complex emotional symphonies - patterns of feeling
so intricate they can reshape reality. This is the pinnacle of emotional
magic: not single notes but entire compositions.`,
    prerequisites: ['emotional-embodiment', 'emotion-transmutation'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'love-magic', level: 1 },
        'Must know love magic'
      ),
      createUnlockCondition(
        'node_level',
        { nodeId: 'joy-magic', level: 1 },
        'Must know joy magic'
      ),
      createUnlockCondition(
        'node_level',
        { nodeId: 'anger-magic', level: 1 },
        'Must know anger magic'
      ),
    ],
    conditionMode: 'all',
    hidden: true,
    icon: '🎭',
  }
);

// ============================================================================
// XP Sources
// ============================================================================

const XP_SOURCES: MagicXPSource[] = [
  {
    eventType: 'emotion_sensed',
    xpAmount: 10,
    description: 'Successfully sense emotions in another',
  },
  {
    eventType: 'emotion_stored',
    xpAmount: 25,
    description: 'Store an emotion in an object',
  },
  {
    eventType: 'emotion_channeled',
    xpAmount: 30,
    description: 'Channel an emotion into a magical effect',
  },
  {
    eventType: 'emotion_projected',
    xpAmount: 50,
    description: 'Project an emotion onto another',
  },
  {
    eventType: 'emotion_drained',
    xpAmount: 60,
    description: 'Drain emotion from another',
  },
  {
    eventType: 'emotion_transmuted',
    xpAmount: 100,
    description: 'Transmute one emotion into another',
  },
  {
    eventType: 'construct_created',
    xpAmount: 150,
    description: 'Create an emotional construct',
  },
  {
    eventType: 'resonance_achieved',
    xpAmount: 200,
    description: 'Create emotional resonance in a group',
  },
];

// ============================================================================
// Tree Assembly
// ============================================================================

const ALL_NODES: MagicSkillNode[] = [
  // Foundation
  EMOTION_SENSE_NODE,
  EMOTIONAL_CLARITY_NODE,
  EMPATHY_NODE,
  EMOTIONAL_CONTROL_NODE,

  // Emotion types
  JOY_MAGIC_NODE,
  LOVE_MAGIC_NODE,
  ANGER_MAGIC_NODE,
  FEAR_MAGIC_NODE,

  // Storage
  EMOTION_STORAGE_NODE,
  EMOTION_RESERVOIR_NODE,
  EMOTION_TRANSFUSION_NODE,

  // Manipulation
  EMOTION_PROJECTION_NODE,
  EMOTION_DRAINING_NODE,
  EMOTION_AMPLIFICATION_NODE,
  EMOTION_TRANSMUTATION_NODE,

  // Advanced
  EMOTIONAL_RESONANCE_NODE,
  EMOTIONAL_CONSTRUCT_NODE,
  EMOTIONAL_EMBODIMENT_NODE,
  EMOTIONAL_VOID_NODE,
  EMOTION_WEAVING_NODE,
];

/**
 * The Emotional skill tree.
 * Anyone can learn, but requires emotional awareness and control.
 */
export const EMOTIONAL_SKILL_TREE: MagicSkillTree = {
  id: 'emotional-tree',
  paradigmId: PARADIGM_ID,
  name: 'The Empathic Art',
  description: 'Master emotions as magical force - sensing, storing, channeling, and embodying pure feeling.',
  lore: `Emotions are power. Joy, love, anger, fear - these aren't just feelings but
forces that shape reality. A person consumed by rage can perform impossible
feats. A mother's love can shield her child from harm. Terror can freeze a
warrior in place. These aren't metaphors - they're literal truths that emotional
mages learn to harness.

The path begins with awareness. You must learn to sense emotions in yourself and
others - to feel the warmth of joy, the heaviness of sorrow, the spark of anger.
Then comes control: choosing what you feel instead of being ruled by it.

With this foundation, you can channel emotions into magic. Joy heals and creates.
Love protects and bonds. Anger destroys. Fear paralyzes. Each emotion is a tool,
a weapon, a gift - depending on how you wield it.

More advanced techniques let you store emotions in objects, creating batteries
of emotional power. You can project your feelings onto others, forcing them to
feel what you feel. You can drain emotions like a vampire, leaving others empty
while you feast on their feelings. You can even transmute emotions - turning
sorrow into joy, fear into courage.

The masters can create emotional constructs - weapons of rage-fire, shields of
love-light, shadows of pure terror made real. They can embody emotions completely,
becoming Joy incarnate or Fury made flesh.

The ultimate technique is emotion weaving - creating complex symphonies of feeling
that reshape reality itself. Not single emotions but intricate patterns: joy
woven with sorrow, love mixed with fear, courage tempered with humility. This is
emotional magic at its peak.`,
  nodes: ALL_NODES,
  entryNodes: ['emotion-sense'],
  connections: [], // Auto-generated from prerequisites
  xpSources: XP_SOURCES,
  rules: {
    ...createDefaultTreeRules(false), // No innate requirement
    allowRespec: true, // Emotional patterns can be relearned
    permanentProgress: false,
  },
  version: 1,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate power of emotion-based magic based on intensity.
 */
export function calculateEmotionPower(
  emotion: keyof typeof EMOTIONS,
  intensity: number, // 0-100
  purity: number = 100 // 0-100, how pure/unmixed the emotion is
): number {
  const emotionBasePower: Record<keyof typeof EMOTIONS, number> = {
    joy: 80,
    love: 100,
    hope: 70,
    courage: 85,
    anger: 95,
    fear: 90,
    sorrow: 75,
    desire: 80,
    pride: 70,
    disgust: 65,
  };

  const base = emotionBasePower[emotion];
  const intensityMult = intensity / 100;
  const purityMult = 0.5 + (purity / 100) * 0.5; // 0.5 to 1.0

  return Math.floor(base * intensityMult * purityMult);
}

/**
 * Get emotion category.
 */
export function getEmotionCategory(emotion: keyof typeof EMOTIONS): 'positive' | 'negative' | 'complex' {
  if (EMOTION_CATEGORIES.positive.includes(emotion as any)) return 'positive';
  if (EMOTION_CATEGORIES.negative.includes(emotion as any)) return 'negative';
  return 'complex';
}

/**
 * Check if two emotions are compatible for weaving.
 */
export function areEmotionsCompatible(
  emotion1: keyof typeof EMOTIONS,
  emotion2: keyof typeof EMOTIONS
): boolean {
  // Opposite emotions are hard to weave
  const opposites: Record<string, string> = {
    joy: 'sorrow',
    love: 'disgust',
    hope: 'fear',
    courage: 'fear',
  };

  if (opposites[emotion1] === emotion2 || opposites[emotion2] === emotion1) {
    return false;
  }

  return true;
}

/**
 * Calculate storage capacity for emotions.
 */
export function getEmotionStorageCapacity(
  objectType: keyof typeof STORAGE_METHODS,
  reservoirLevel: number // 0-5
): number {
  const baseCapacity: Record<keyof typeof STORAGE_METHODS, number> = {
    object: 100,
    memory: 150,
    place: 200,
    music: 120,
    art: 180,
    ritual: 140,
  };

  const base = baseCapacity[objectType];
  const multiplier = 1 + reservoirLevel * 0.5;

  return Math.floor(base * multiplier);
}

/**
 * Get maximum concurrent emotion channels.
 */
export function getMaxEmotionChannels(unlockedNodes: Record<string, number>): number {
  let max = 1;

  if (unlockedNodes['emotional-control']) max = 2;
  if (unlockedNodes['emotion-weaving']) max = 999; // No limit
  else if (unlockedNodes['emotional-resonance']) max = 5;
  else if (unlockedNodes['emotion-transmutation']) max = 3;

  return max;
}

/**
 * Calculate empathy range based on skill level.
 */
export function getEmpathyRange(empathyLevel: number, sensingLevel: number): number {
  let range = 10; // Base 10 meters

  if (empathyLevel > 0) {
    range += empathyLevel * 20;
  }
  if (sensingLevel > 0) {
    range += sensingLevel * 10;
  }

  return range;
}

/**
 * Get emotional resistance based on control level.
 */
export function getEmotionalResistance(controlLevel: number, voidUnlocked: boolean): number {
  let resistance = 0;

  if (controlLevel > 0) {
    resistance += 10 + (controlLevel - 1) * 5;
  }
  if (voidUnlocked) {
    resistance = 100; // Complete immunity when void is active
  }

  return Math.min(resistance, 100);
}
