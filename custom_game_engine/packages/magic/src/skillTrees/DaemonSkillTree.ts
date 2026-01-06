/**
 * DaemonSkillTree - Skill tree for the Daemon paradigm
 *
 * Key mechanics:
 * - Daemon bond (external soul manifest as animal)
 * - Settling (transition from changing to fixed form)
 * - Separation (ability to travel apart from daemon - rare, traumatic)
 * - Dust sensitivity (perceiving and interacting with conscious particles)
 * - Form affinity (relationship with daemon's settled form)
 *
 * Inspired by His Dark Materials:
 * - Everyone has a daemon by default
 * - Children's daemons can change form; adults' are settled
 * - Witches can separate from their daemons
 * - Dust is attracted to consciousness and settled daemons
 * - Intercision (forced separation) is traumatic and damaging
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

const PARADIGM_ID = 'daemon';

/** Daemon form categories - affects abilities */
export const DAEMON_FORM_CATEGORIES = {
  predator: ['wolf', 'hawk', 'leopard', 'snake', 'fox'],
  companion: ['dog', 'cat', 'horse', 'rabbit', 'otter'],
  wisdom: ['owl', 'raven', 'elephant', 'dolphin', 'crow'],
  power: ['bear', 'lion', 'eagle', 'tiger', 'boar'],
  stealth: ['mouse', 'moth', 'ferret', 'shadow_cat', 'bat'],
  exotic: ['phoenix', 'snow_leopard', 'arctic_fox', 'golden_monkey', 'pine_marten'],
} as const;

/** Dust interaction types */
export const DUST_INTERACTIONS = {
  sensing: 'Perceive Dust particles in the environment',
  reading: 'Interpret Dust patterns for divination',
  attracting: 'Draw Dust to yourself or objects',
  channeling: 'Allow Dust to flow through you',
  navigating: 'Use Dust currents to find paths between worlds',
} as const;

// ============================================================================
// Foundation Nodes
// ============================================================================

/** Basic daemon awareness - everyone starts here */
const DAEMON_BOND_NODE = createSkillNode(
  'daemon-bond',
  'Daemon Bond',
  PARADIGM_ID,
  'foundation',
  0,
  0, // No cost - innate ability
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Connected to your external soul',
      target: { abilityId: 'daemon_sense' },
    }),
  ],
  {
    description: 'The fundamental connection between you and your daemon',
    lore: `Your daemon is your soul made visible - an animal companion that is
truly a part of you. The bond between human and daemon is sacred and unbreakable.
To be separated from your daemon causes physical pain; to have it touched by
another is the deepest violation.`,
    hidden: false,
    icon: '🦊',
  }
);

/** Emotional synchronization with daemon */
const EMOTIONAL_SYNC_NODE = createSkillNode(
  'emotional-sync',
  'Emotional Synchronization',
  PARADIGM_ID,
  'foundation',
  1,
  25,
  [
    createSkillEffect('bond_strength', 5, {
      perLevelValue: 3,
      description: '+X% emotional attunement with daemon',
    }),
  ],
  {
    description: 'Deepen the emotional connection with your daemon',
    lore: 'When you feel, your daemon feels. Learning to synchronize your emotions allows for clearer communication and mutual support.',
    prerequisites: ['daemon-bond'],
    maxLevel: 5,
    levelCostMultiplier: 1.3,
  }
);

/** Silent communication */
const SILENT_SPEECH_NODE = createSkillNode(
  'silent-speech',
  'Silent Speech',
  PARADIGM_ID,
  'foundation',
  1,
  50,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Communicate with daemon without speaking',
      target: { abilityId: 'daemon_telepathy' },
    }),
  ],
  {
    description: 'Learn to communicate with your daemon through thought alone',
    prerequisites: ['daemon-bond'],
    maxLevel: 3,
    levelCostMultiplier: 1.5,
  }
);

/** Touch prohibition awareness */
const TOUCH_TABOO_NODE = createSkillNode(
  'touch-taboo',
  'Sacred Boundary',
  PARADIGM_ID,
  'foundation',
  1,
  40,
  [
    createSkillEffect('defense', 10, {
      description: 'Sense when someone intends to touch your daemon',
    }),
    createSkillEffect('intimidation', 5, {
      description: 'Others sense the taboo instinctively',
    }),
  ],
  {
    description: 'Your awareness of the sacred boundary around your daemon',
    lore: 'The touch of another human on your daemon is the deepest violation possible. Even enemies hesitate at this taboo.',
    prerequisites: ['daemon-bond'],
  }
);

// ============================================================================
// Form & Settling Nodes
// ============================================================================

/** Understanding daemon forms */
const FORM_AWARENESS_NODE = createSkillNode(
  'form-awareness',
  'Form Awareness',
  PARADIGM_ID,
  'relationship',
  1,
  35,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Understand what daemon forms mean about personality',
      target: { abilityId: 'form_reading' },
    }),
  ],
  {
    description: 'Learn to read the meaning in daemon forms',
    lore: `A person's daemon reveals their true nature. A servant with a dog daemon
has a loyal soul. A person with a snake daemon... well, you know to be wary.`,
    prerequisites: ['daemon-bond'],
    maxLevel: 3,
    levelCostMultiplier: 1.4,
  }
);

/** Pre-settling flexibility */
const FORM_SHIFTING_NODE = createSkillNode(
  'form-shifting',
  'Form Flexibility',
  PARADIGM_ID,
  'relationship',
  1,
  0, // Natural for children
  [
    createSkillEffect('unlock_ability', 1, {
      description: "Daemon can change forms freely (pre-settling only)",
      target: { abilityId: 'form_shift' },
    }),
  ],
  {
    description: "In childhood, daemons can take any form",
    lore: 'Children\'s daemons shift constantly - now a moth, now a wildcat, now a bird. This flexibility is the mark of an unsettled soul, full of possibility.',
    prerequisites: ['daemon-bond'],
    unlockConditions: [
      createUnlockCondition(
        'age_range',
        { maxAge: 14 },
        'Only available before settling',
      ),
    ],
    conditionMode: 'all',
    icon: '✨',
  }
);

/** Settling event - daemon takes final form */
const SETTLING_NODE = createSkillNode(
  'settling',
  'The Settling',
  PARADIGM_ID,
  'relationship',
  2,
  0, // Event-based, not purchased
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Daemon has taken its permanent form',
      target: { abilityId: 'settled_form' },
    }),
    createSkillEffect('dust_affinity', 10, {
      description: 'Dust is now attracted to you and your daemon',
    }),
  ],
  {
    description: 'Your daemon has settled into its final form',
    lore: `The settling comes to all who grow up. One day your daemon shifts for
the last time, and you know - this is who you are. This is who you've always been.
Some welcome it with joy; others mourn the loss of possibility.`,
    prerequisites: ['daemon-bond'],
    unlockConditions: [
      createUnlockCondition(
        'daemon_settled',
        {},
        'Daemon must have naturally settled',
        { hidden: true }
      ),
    ],
    conditionMode: 'all',
    hidden: true, // Revealed when it happens
    icon: '🔒',
  }
);

/** Form affinity - bonuses from settled form */
const FORM_AFFINITY_NODE = createSkillNode(
  'form-affinity',
  'Form Affinity',
  PARADIGM_ID,
  'relationship',
  2,
  75,
  [
    createSkillEffect('form_bonus', 1, {
      description: 'Gain abilities based on daemon\'s settled form',
    }),
  ],
  {
    description: 'Embrace the strengths of your daemon\'s form',
    lore: 'A person with a hawk daemon sees further. A person with a wolf daemon has keener instincts for danger. Your form is your destiny.',
    prerequisites: ['settling'],
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

/** Form mastery */
const FORM_MASTERY_NODE = createSkillNode(
  'form-mastery',
  'Form Mastery',
  PARADIGM_ID,
  'mastery',
  3,
  150,
  [
    createSkillEffect('form_bonus', 10, {
      perLevelValue: 5,
      description: '+X% effectiveness of form abilities',
    }),
  ],
  {
    description: 'Master the unique abilities of your daemon\'s form',
    prerequisites: ['form-affinity'],
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

// ============================================================================
// Dust Sensitivity Nodes
// ============================================================================

/** Basic Dust awareness */
const DUST_SENSE_NODE = createSkillNode(
  'dust-sense',
  'Dust Sense',
  PARADIGM_ID,
  'dust',
  2,
  60,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Can perceive Dust particles',
      target: { abilityId: 'dust_perception' },
    }),
  ],
  {
    description: 'Learn to perceive the conscious particles called Dust',
    lore: `Dust is consciousness made manifest - golden particles that settle on
those who think and feel. Children cannot see it, for Dust is drawn only
to settled daemons and mature minds.`,
    prerequisites: ['settling'],
    icon: '✨',
  }
);

/** Enhanced Dust perception */
const DUST_VISION_NODE = createSkillNode(
  'dust-vision',
  'Dust Vision',
  PARADIGM_ID,
  'dust',
  3,
  100,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'See Dust currents and concentrations',
      target: { abilityId: 'dust_vision' },
    }),
  ],
  {
    description: 'See the golden streams of Dust flowing through the world',
    prerequisites: ['dust-sense'],
    maxLevel: 3,
    levelCostMultiplier: 1.5,
  }
);

/** Dust attraction - draw Dust to yourself */
const DUST_ATTRACTION_NODE = createSkillNode(
  'dust-attraction',
  'Dust Attraction',
  PARADIGM_ID,
  'dust',
  3,
  120,
  [
    createSkillEffect('dust_affinity', 15, {
      perLevelValue: 5,
      description: 'Attract more Dust to yourself',
    }),
  ],
  {
    description: 'Learn to draw Dust toward you through focused consciousness',
    lore: 'Those who think deeply, who question, who love and hate with passion - they draw Dust like lodestone draws iron.',
    prerequisites: ['dust-sense'],
    maxLevel: 5,
    levelCostMultiplier: 1.4,
  }
);

/** Alethiometer reading - requires special training */
const ALETHIOMETER_TRAINING_NODE = createSkillNode(
  'alethiometer-training',
  'Alethiometer Reading',
  PARADIGM_ID,
  'dust',
  4,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Can read the golden compass',
      target: { abilityId: 'alethiometer_read' },
    }),
  ],
  {
    description: 'Learn to read the alethiometer - the golden compass of truth',
    lore: `The alethiometer speaks through Dust. Thirty-six symbols, infinite
meanings, and truth for those patient enough to learn. Most scholars take
decades to master even a portion of its language.`,
    prerequisites: ['dust-vision'],
    unlockConditions: [
      createUnlockCondition(
        'teacher_found',
        { teacherType: 'alethiometrist' },
        'Must find a teacher of alethiometer reading'
      ),
      createUnlockCondition(
        'artifact_bonded',
        { artifactType: 'alethiometer' },
        'Must have access to an alethiometer'
      ),
    ],
    conditionMode: 'all',
    maxLevel: 10,
    levelCostMultiplier: 2,
  }
);

/** Intuitive reading - rare natural gift */
const INTUITIVE_READING_NODE = createSkillNode(
  'intuitive-reading',
  'Intuitive Reading',
  PARADIGM_ID,
  'dust',
  3,
  0, // Gift, not learned
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Read the alethiometer by instinct',
      target: { abilityId: 'intuitive_alethiometer' },
    }),
  ],
  {
    description: 'Read the alethiometer through pure instinct',
    lore: `Some rare individuals - almost always children - can read the alethiometer
without training. They slip into a trance-like state and the answers come.
But this gift fades with settling, with knowledge, with growing up.`,
    prerequisites: ['dust-sense'],
    unlockConditions: [
      createUnlockCondition(
        'gift_innate',
        { giftId: 'intuitive_reading' },
        'Must possess the rare gift of intuitive reading',
        { hidden: true }
      ),
    ],
    conditionMode: 'all',
    hidden: true,
    icon: '🔮',
  }
);

/** Dust navigation - finding windows between worlds */
const DUST_NAVIGATION_NODE = createSkillNode(
  'dust-navigation',
  'Dust Navigation',
  PARADIGM_ID,
  'dust',
  5,
  300,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Sense and navigate Dust currents between worlds',
      target: { abilityId: 'world_sense' },
    }),
  ],
  {
    description: 'Learn to sense the currents of Dust that flow between worlds',
    lore: 'Dust flows between worlds through windows and cracks in reality. Those sensitive enough can feel these currents and follow them.',
    prerequisites: ['dust-vision', 'alethiometer-training'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'alethiometer-training', level: 5 },
        'Must have significant alethiometer training'
      ),
    ],
    conditionMode: 'all',
  }
);

// ============================================================================
// Separation Nodes (Witch Path)
// ============================================================================

/** Witch bloodline check - required for separation */
const WITCH_BLOOD_NODE = createSkillNode(
  'witch-blood',
  'Witch Blood',
  PARADIGM_ID,
  'foundation',
  1,
  0, // Innate
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Potential for daemon separation',
      target: { abilityId: 'separation_potential' },
    }),
    createSkillEffect('lifespan', 100, {
      description: 'Extended lifespan potential',
    }),
  ],
  {
    description: 'The blood of witches runs in your veins',
    lore: `Witches are not human - not quite. They live for centuries, fly through
the northern skies, and bear a terrible secret: they can separate from
their daemons. This power comes at a price paid in pain.`,
    prerequisites: ['daemon-bond'],
    unlockConditions: [
      createUnlockCondition(
        'bloodline',
        { bloodlineId: 'witch' },
        'Must have witch bloodline',
        { hidden: true }
      ),
    ],
    conditionMode: 'all',
    hidden: true, // Discovered when bloodline is revealed
    icon: '🌙',
  }
);

/** Separation training - the ordeal */
const SEPARATION_ORDEAL_NODE = createSkillNode(
  'separation-ordeal',
  'The Ordeal',
  PARADIGM_ID,
  'separation',
  3,
  0, // Event-based
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Can begin separation from daemon',
      target: { abilityId: 'separation_start' },
    }),
  ],
  {
    description: 'Undergo the terrible ordeal of separation',
    lore: `Every witch must face the ordeal - walking away from their daemon until
the bond stretches to the breaking point. The pain is indescribable. Many
do not survive. Those who do are forever changed.`,
    prerequisites: ['witch-blood', 'settling'],
    unlockConditions: [
      createUnlockCondition(
        'ritual_performed',
        { ritualId: 'separation_ordeal' },
        'Must undergo the separation ordeal',
        { hidden: true }
      ),
      createUnlockCondition(
        'trauma_experienced',
        { traumaType: 'separation_pain' },
        'Must endure the pain of stretching the bond',
      ),
    ],
    conditionMode: 'all',
    hidden: true,
    icon: '💔',
  }
);

/** Basic separation - limited distance */
const BASIC_SEPARATION_NODE = createSkillNode(
  'basic-separation',
  'Initial Separation',
  PARADIGM_ID,
  'separation',
  3,
  100,
  [
    createSkillEffect('separation_distance', 50, {
      description: 'Can separate up to 50 meters from daemon',
    }),
  ],
  {
    description: 'Maintain separation at short distances',
    prerequisites: ['separation-ordeal'],
    maxLevel: 1,
  }
);

/** Extended separation */
const EXTENDED_SEPARATION_NODE = createSkillNode(
  'extended-separation',
  'Extended Separation',
  PARADIGM_ID,
  'separation',
  4,
  150,
  [
    createSkillEffect('separation_distance', 100, {
      perLevelValue: 100,
      description: '+X meters separation distance',
    }),
  ],
  {
    description: 'Extend the distance you can travel from your daemon',
    prerequisites: ['basic-separation'],
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

/** Separation mastery - unlimited distance */
const UNLIMITED_SEPARATION_NODE = createSkillNode(
  'unlimited-separation',
  'Unlimited Separation',
  PARADIGM_ID,
  'separation',
  5,
  500,
  [
    createSkillEffect('separation_distance', -1, {
      description: 'Can separate any distance from daemon',
    }),
  ],
  {
    description: 'Travel any distance from your daemon',
    lore: 'The greatest witches can send their daemons to the far side of the world while they remain at home. The bond stretches but never breaks.',
    prerequisites: ['extended-separation'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'extended-separation', level: 5 },
        'Must master extended separation'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Flight - witch ability */
const WITCH_FLIGHT_NODE = createSkillNode(
  'witch-flight',
  'Cloud-Pine Flight',
  PARADIGM_ID,
  'separation',
  4,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Can fly on cloud-pine branch',
      target: { abilityId: 'witch_flight' },
    }),
  ],
  {
    description: 'Master the art of flying on cloud-pine',
    lore: 'Witches fly on branches of cloud-pine, racing through the northern skies faster than any bird. This is their birthright.',
    prerequisites: ['separation-ordeal'],
    unlockConditions: [
      createUnlockCondition(
        'artifact_bonded',
        { artifactType: 'cloud_pine' },
        'Must bond with a cloud-pine branch'
      ),
    ],
    conditionMode: 'all',
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

/** Daemon as scout */
const DAEMON_SCOUT_NODE = createSkillNode(
  'daemon-scout',
  'Daemon Scout',
  PARADIGM_ID,
  'separation',
  4,
  175,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Send daemon ahead as a scout',
      target: { abilityId: 'daemon_scouting' },
    }),
    createSkillEffect('perception', 20, {
      description: 'See through daemon\'s eyes while separated',
    }),
  ],
  {
    description: 'Send your daemon ahead to scout while you remain behind',
    prerequisites: ['extended-separation', 'silent-speech'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'silent-speech', level: 3 },
        'Must have perfected silent communication'
      ),
    ],
    conditionMode: 'all',
    maxLevel: 3,
    levelCostMultiplier: 1.5,
  }
);

// ============================================================================
// Intercision Resistance (Dark Path)
// ============================================================================

/** Intercision awareness - knowing the horror */
const INTERCISION_AWARENESS_NODE = createSkillNode(
  'intercision-awareness',
  'Intercision Awareness',
  PARADIGM_ID,
  'foundation',
  2,
  30,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Recognize severed individuals',
      target: { abilityId: 'severed_sense' },
    }),
  ],
  {
    description: 'Recognize the horror of intercision',
    lore: `Intercision - the cutting of the bond between human and daemon.
Those who have been severed are empty, dead-eyed, barely human.
The Magisterium calls it "making the cut." We call it murder of the soul.`,
    prerequisites: ['touch-taboo'],
    icon: '⚠️',
  }
);

/** Resistance to forced separation */
const BOND_FORTIFICATION_NODE = createSkillNode(
  'bond-fortification',
  'Bond Fortification',
  PARADIGM_ID,
  'relationship',
  3,
  150,
  [
    createSkillEffect('defense', 25, {
      perLevelValue: 10,
      description: 'Resistance to forced separation attempts',
    }),
  ],
  {
    description: 'Strengthen your bond against those who would sever it',
    prerequisites: ['intercision-awareness', 'emotional-sync'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'emotional-sync', level: 3 },
        'Must have strong emotional bond'
      ),
    ],
    conditionMode: 'all',
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

// ============================================================================
// Advanced Nodes
// ============================================================================

/** Deep bond - daemon as extension of self */
const DEEP_BOND_NODE = createSkillNode(
  'deep-bond',
  'Deep Bond',
  PARADIGM_ID,
  'mastery',
  4,
  250,
  [
    createSkillEffect('bond_strength', 25, {
      description: 'Daemon is a true extension of yourself',
    }),
    createSkillEffect('unlock_ability', 1, {
      description: 'Share sensory input with daemon',
      target: { abilityId: 'sensory_sharing' },
    }),
  ],
  {
    description: 'Achieve a profound unity with your daemon',
    prerequisites: ['form-mastery', 'emotional-sync'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'emotional-sync', level: 5 },
        'Must have perfected emotional synchronization'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Daemon combat - fighting as one */
const DAEMON_COMBAT_NODE = createSkillNode(
  'daemon-combat',
  'Daemon Combat',
  PARADIGM_ID,
  'mastery',
  3,
  175,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Fight in coordination with daemon',
      target: { abilityId: 'daemon_assist' },
    }),
    createSkillEffect('combat', 15, {
      description: 'Bonus when daemon assists in combat',
    }),
  ],
  {
    description: 'Learn to fight in perfect coordination with your daemon',
    lore: 'Your daemon can bite, claw, distract - but more importantly, they can warn you of danger and watch your back. Fighting as one is fighting as two.',
    prerequisites: ['form-affinity'],
    unlockConditions: [
      createUnlockCondition(
        'form_category',
        { category: 'predator' },
        'Daemon must have a combat-capable form'
      ),
    ],
    conditionMode: 'all',
    maxLevel: 5,
    levelCostMultiplier: 1.4,
  }
);

/** Dust communion - advanced consciousness work */
const DUST_COMMUNION_NODE = createSkillNode(
  'dust-communion',
  'Dust Communion',
  PARADIGM_ID,
  'dust',
  5,
  350,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Enter deep communion with Dust',
      target: { abilityId: 'dust_communion' },
    }),
    createSkillEffect('wisdom', 20, {
      description: 'Wisdom gained from Dust consciousness',
    }),
  ],
  {
    description: 'Achieve direct communion with Dust consciousness',
    lore: 'Dust is not merely particles - it is consciousness itself, the accumulated wisdom of countless beings. To commune with Dust is to touch something vast and ancient.',
    prerequisites: ['dust-attraction', 'deep-bond'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'dust-attraction', level: 5 },
        'Must have strong Dust affinity'
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
    eventType: 'daemon_interaction',
    xpAmount: 5,
    description: 'Meaningful interaction with your daemon',
  },
  {
    eventType: 'form_used',
    xpAmount: 10,
    description: "Use your daemon's form abilities",
  },
  {
    eventType: 'dust_perceived',
    xpAmount: 15,
    description: 'Successfully perceive Dust',
  },
  {
    eventType: 'alethiometer_reading',
    xpAmount: 50,
    description: 'Successfully read the alethiometer',
  },
  {
    eventType: 'separation_extended',
    xpAmount: 25,
    description: 'Successfully separate from daemon',
  },
  {
    eventType: 'daemon_scouting_success',
    xpAmount: 30,
    description: 'Daemon successfully scouts ahead',
  },
  {
    eventType: 'bond_threatened',
    xpAmount: 20,
    description: 'Resist a threat to your daemon bond',
  },
  {
    eventType: 'form_revelation',
    xpAmount: 100,
    description: 'Your daemon settles or reveals a truth about form',
  },
  {
    eventType: 'world_window_found',
    xpAmount: 75,
    description: 'Discover a window between worlds',
  },
];

// ============================================================================
// Tree Assembly
// ============================================================================

const ALL_NODES: MagicSkillNode[] = [
  // Foundation
  DAEMON_BOND_NODE,
  EMOTIONAL_SYNC_NODE,
  SILENT_SPEECH_NODE,
  TOUCH_TABOO_NODE,

  // Form & Settling
  FORM_AWARENESS_NODE,
  FORM_SHIFTING_NODE,
  SETTLING_NODE,
  FORM_AFFINITY_NODE,
  FORM_MASTERY_NODE,

  // Dust
  DUST_SENSE_NODE,
  DUST_VISION_NODE,
  DUST_ATTRACTION_NODE,
  ALETHIOMETER_TRAINING_NODE,
  INTUITIVE_READING_NODE,
  DUST_NAVIGATION_NODE,
  DUST_COMMUNION_NODE,

  // Separation (Witch Path)
  WITCH_BLOOD_NODE,
  SEPARATION_ORDEAL_NODE,
  BASIC_SEPARATION_NODE,
  EXTENDED_SEPARATION_NODE,
  UNLIMITED_SEPARATION_NODE,
  WITCH_FLIGHT_NODE,
  DAEMON_SCOUT_NODE,

  // Intercision Resistance
  INTERCISION_AWARENESS_NODE,
  BOND_FORTIFICATION_NODE,

  // Advanced
  DEEP_BOND_NODE,
  DAEMON_COMBAT_NODE,
];

/**
 * The Daemon skill tree.
 * Everyone has a daemon, but advanced abilities require settling or witch blood.
 */
export const DAEMON_SKILL_TREE: MagicSkillTree = {
  id: 'daemon-tree',
  paradigmId: PARADIGM_ID,
  name: 'The Daemon Bond',
  description: 'Master the connection with your external soul, perceive Dust, and perhaps learn the witch\'s secret of separation.',
  lore: `Your daemon is your soul made visible - an animal companion that is truly
a part of you. In childhood, your daemon shifts form constantly; in adulthood,
they settle into one form that reflects your true nature. The bond between
human and daemon is unbreakable... or so most believe.

Dust - the golden particles of consciousness - settles on those with settled
daemons. Learn to perceive it, and you may glimpse truths hidden from others.

And for those with witch blood, there is another path: the terrible ordeal
of separation, which allows you to travel apart from your daemon. But the
price is paid in pain.`,
  nodes: ALL_NODES,
  entryNodes: ['daemon-bond'],
  connections: [], // Auto-generated from prerequisites
  xpSources: XP_SOURCES,
  rules: {
    ...createDefaultTreeRules(false), // Everyone has a daemon
    allowRespec: false,
    permanentProgress: true,
    progressLossConditions: [
      createUnlockCondition(
        'intercision',
        {},
        'Intercision permanently destroys all daemon abilities',
      ),
    ],
  },
  version: 1,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get bonuses based on daemon form category.
 */
export function getFormBonuses(formCategory: keyof typeof DAEMON_FORM_CATEGORIES): {
  primary: string;
  secondary: string;
  description: string;
} {
  switch (formCategory) {
    case 'predator':
      return {
        primary: 'combat',
        secondary: 'intimidation',
        description: 'Combat prowess and intimidating presence',
      };
    case 'companion':
      return {
        primary: 'social',
        secondary: 'empathy',
        description: 'Social grace and emotional understanding',
      };
    case 'wisdom':
      return {
        primary: 'intelligence',
        secondary: 'perception',
        description: 'Mental acuity and keen observation',
      };
    case 'power':
      return {
        primary: 'strength',
        secondary: 'endurance',
        description: 'Physical might and stamina',
      };
    case 'stealth':
      return {
        primary: 'stealth',
        secondary: 'agility',
        description: 'Sneaking ability and quick reflexes',
      };
    case 'exotic':
      return {
        primary: 'charisma',
        secondary: 'mystery',
        description: 'Compelling presence and enigmatic nature',
      };
    default:
      return {
        primary: 'general',
        secondary: 'adaptability',
        description: 'Balanced abilities',
      };
  }
}

/**
 * Check if a specific daemon form is available in a category.
 */
export function isFormInCategory(form: string, category: keyof typeof DAEMON_FORM_CATEGORIES): boolean {
  const forms = DAEMON_FORM_CATEGORIES[category];
  return (forms as readonly string[]).includes(form);
}

/**
 * Get the category for a daemon form.
 */
export function getFormCategory(form: string): keyof typeof DAEMON_FORM_CATEGORIES | null {
  for (const [category, forms] of Object.entries(DAEMON_FORM_CATEGORIES)) {
    if ((forms as readonly string[]).includes(form)) {
      return category as keyof typeof DAEMON_FORM_CATEGORIES;
    }
  }
  return null;
}

/**
 * Calculate separation distance based on unlocked nodes.
 */
export function getSeparationDistance(unlockedNodes: Record<string, number>): number {
  if (unlockedNodes['unlimited-separation']) {
    return Infinity;
  }

  let distance = 0;
  if (unlockedNodes['basic-separation']) {
    distance = 50;
  }
  if (unlockedNodes['extended-separation']) {
    distance += 100 * unlockedNodes['extended-separation'];
  }
  return distance;
}

/**
 * Check if an entity can separate from their daemon.
 */
export function canSeparate(unlockedNodes: Record<string, number>): boolean {
  return !!unlockedNodes['basic-separation'];
}

/**
 * Check if an entity has settled.
 */
export function hasSettled(unlockedNodes: Record<string, number>): boolean {
  return !!unlockedNodes['settling'];
}
