/**
 * AnimusSkillTree - Skill tree for the Animus paradigm
 *
 * Key mechanics:
 * - Animus bond (external soul manifest as animal)
 * - Settling (transition from changing to fixed form)
 * - Separation (ability to travel apart from animus - rare, traumatic)
 * - Aether Mote sensitivity (perceiving and interacting with conscious particles)
 * - Form affinity (relationship with animus's settled form)
 *
 * Spirit-bond magic paradigm:
 * - Everyone has a animus by default
 * - Children's animuses can change form; adults' are settled
 * - Witches can separate from their animuses
 * - Aether Motes are attracted to consciousness and settled animuses
 * - Severance (forced separation) is traumatic and damaging
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

const PARADIGM_ID = 'animus';

/** Animus form categories - affects abilities */
export const ANIMUS_FORM_CATEGORIES = {
  predator: ['wolf', 'hawk', 'leopard', 'snake', 'fox'],
  companion: ['dog', 'cat', 'horse', 'rabbit', 'otter'],
  wisdom: ['owl', 'raven', 'elephant', 'dolphin', 'crow'],
  power: ['bear', 'lion', 'eagle', 'tiger', 'boar'],
  stealth: ['mouse', 'moth', 'ferret', 'shadow_cat', 'bat'],
  exotic: ['phoenix', 'snow_leopard', 'arctic_fox', 'golden_monkey', 'pine_marten'],
} as const;

/** Aether Motes interaction types */
export const AETHER_MOTE_INTERACTIONS = {
  sensing: 'Perceive Aether Mote particles in the environment',
  reading: 'Interpret Aether Motes patterns for divination',
  attracting: 'Draw Aether Motes to yourself or objects',
  channeling: 'Allow Aether Motes to flow through you',
  navigating: 'Use Aether Mote currents to find paths between worlds',
} as const;

// ============================================================================
// Foundation Nodes
// ============================================================================

/** Basic animus awareness - everyone starts here */
const ANIMUS_BOND_NODE = createSkillNode(
  'animus-bond',
  'Animus Bond',
  PARADIGM_ID,
  'foundation',
  0,
  0, // No cost - innate ability
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Connected to your external soul',
      target: { abilityId: 'animus_sense' },
    }),
  ],
  {
    description: 'The fundamental connection between you and your animus',
    lore: `Your animus is your soul made visible - an animal companion that is
truly a part of you. The bond between human and animus is sacred and unbreakable.
To be separated from your animus causes physical pain; to have it touched by
another is the deepest violation.`,
    hidden: false,
    icon: '🦊',
  }
);

/** Emotional synchronization with animus */
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
      description: '+X% emotional attunement with animus',
    }),
  ],
  {
    description: 'Deepen the emotional connection with your animus',
    lore: 'When you feel, your animus feels. Learning to synchronize your emotions allows for clearer communication and mutual support.',
    prerequisites: ['animus-bond'],
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
      description: 'Communicate with animus without speaking',
      target: { abilityId: 'animus_telepathy' },
    }),
  ],
  {
    description: 'Learn to communicate with your animus through thought alone',
    prerequisites: ['animus-bond'],
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
      description: 'Sense when someone intends to touch your animus',
    }),
    createSkillEffect('intimidation', 5, {
      description: 'Others sense the taboo instinctively',
    }),
  ],
  {
    description: 'Your awareness of the sacred boundary around your animus',
    lore: 'The touch of another human on your animus is the deepest violation possible. Even enemies hesitate at this taboo.',
    prerequisites: ['animus-bond'],
  }
);

// ============================================================================
// Form & Settling Nodes
// ============================================================================

/** Understanding animus forms */
const FORM_AWARENESS_NODE = createSkillNode(
  'form-awareness',
  'Form Awareness',
  PARADIGM_ID,
  'relationship',
  1,
  35,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Understand what animus forms mean about personality',
      target: { abilityId: 'form_reading' },
    }),
  ],
  {
    description: 'Learn to read the meaning in animus forms',
    lore: `A person's animus reveals their true nature. A servant with a dog animus
has a loyal soul. A person with a snake animus... well, you know to be wary.`,
    prerequisites: ['animus-bond'],
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
      description: "Animus can change forms freely (pre-settling only)",
      target: { abilityId: 'form_shift' },
    }),
  ],
  {
    description: "In childhood, animuses can take any form",
    lore: 'Children\'s animuses shift constantly - now a moth, now a wildcat, now a bird. This flexibility is the mark of an unsettled soul, full of possibility.',
    prerequisites: ['animus-bond'],
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

/** Settling event - animus takes final form */
const SETTLING_NODE = createSkillNode(
  'settling',
  'The Settling',
  PARADIGM_ID,
  'relationship',
  2,
  0, // Event-based, not purchased
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Animus has taken its permanent form',
      target: { abilityId: 'settled_form' },
    }),
    createSkillEffect('aether_mote_affinity', 10, {
      description: 'Aether Motes are now attracted to you and your animus',
    }),
  ],
  {
    description: 'Your animus has settled into its final form',
    lore: `The settling comes to all who grow up. One day your animus shifts for
the last time, and you know - this is who you are. This is who you've always been.
Some welcome it with joy; others mourn the loss of possibility.`,
    prerequisites: ['animus-bond'],
    unlockConditions: [
      createUnlockCondition(
        'animus_settled',
        {},
        'Animus must have naturally settled',
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
      description: 'Gain abilities based on animus\'s settled form',
    }),
  ],
  {
    description: 'Embrace the strengths of your animus\'s form',
    lore: 'A person with a hawk animus sees further. A person with a wolf animus has keener instincts for danger. Your form is your destiny.',
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
    description: 'Master the unique abilities of your animus\'s form',
    prerequisites: ['form-affinity'],
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

// ============================================================================
// Aether Motes Sensitivity Nodes
// ============================================================================

/** Basic Aether Motes awareness */
const AETHER_SENSE_NODE = createSkillNode(
  'aether-sense',
  'Aether Mote Sense',
  PARADIGM_ID,
  'aether_motes',
  2,
  60,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Can perceive Aether Motes particles',
      target: { abilityId: 'aether_perception' },
    }),
  ],
  {
    description: 'Learn to perceive the conscious particles called Aether Motes',
    lore: `Aether Motes are consciousness made manifest - golden particles that settle on
those who think and feel. Children cannot see it, for Aether Motes are drawn only
to settled animuses and mature minds.`,
    prerequisites: ['settling'],
    icon: '✨',
  }
);

/** Enhanced Aether Motes perception */
const AETHER_VISION_NODE = createSkillNode(
  'aether-vision',
  'Aether Mote Vision',
  PARADIGM_ID,
  'aether_motes',
  3,
  100,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'See Aether Mote currents and concentrations',
      target: { abilityId: 'aether_vision' },
    }),
  ],
  {
    description: 'See the golden streams of Aether Motes flowing through the world',
    prerequisites: ['aether-sense'],
    maxLevel: 3,
    levelCostMultiplier: 1.5,
  }
);

/** Aether Motes attraction - draw Aether Motes to yourself */
const AETHER_ATTRACTION_NODE = createSkillNode(
  'aether-attraction',
  'Aether Mote Attraction',
  PARADIGM_ID,
  'aether_motes',
  3,
  120,
  [
    createSkillEffect('aether_mote_affinity', 15, {
      perLevelValue: 5,
      description: 'Attract more Aether Motes to yourself',
    }),
  ],
  {
    description: 'Learn to draw Aether Motes toward you through focused consciousness',
    lore: 'Those who think deeply, who question, who love and hate with passion - they draw Aether Motes like lodestone draws iron.',
    prerequisites: ['aether-sense'],
    maxLevel: 5,
    levelCostMultiplier: 1.4,
  }
);

/** Veridex reading - requires special training */
const VERIDEX_TRAINING_NODE = createSkillNode(
  'veridex-training',
  'Veridex Reading',
  PARADIGM_ID,
  'aether_motes',
  4,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Can read the Veridex',
      target: { abilityId: 'veridex_read' },
    }),
  ],
  {
    description: 'Learn to read the Veridex — an instrument of symbolic truth',
    lore: `The veridex speaks through Aether Motes. Thirty-six symbols, infinite
meanings, and truth for those patient enough to learn. Most scholars take
decades to master even a portion of its language.`,
    prerequisites: ['aether-vision'],
    unlockConditions: [
      createUnlockCondition(
        'teacher_found',
        { teacherType: 'veridex_reader' },
        'Must find a teacher of veridex reading'
      ),
      createUnlockCondition(
        'artifact_bonded',
        { artifactType: 'veridex' },
        'Must have access to an veridex'
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
  'aether_motes',
  3,
  0, // Gift, not learned
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Read the veridex by instinct',
      target: { abilityId: 'intuitive_veridex' },
    }),
  ],
  {
    description: 'Read the veridex through pure instinct',
    lore: `Some rare individuals - almost always children - can read the veridex
without training. They slip into a trance-like state and the answers come.
But this gift fades with settling, with knowledge, with growing up.`,
    prerequisites: ['aether-sense'],
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

/** Aether Motes navigation - finding windows between worlds */
const AETHER_NAVIGATION_NODE = createSkillNode(
  'aether-navigation',
  'Aether Mote Navigation',
  PARADIGM_ID,
  'aether_motes',
  5,
  300,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Sense and navigate Aether Mote currents between worlds',
      target: { abilityId: 'world_sense' },
    }),
  ],
  {
    description: 'Learn to sense the currents of Aether Motes that flow between worlds',
    lore: 'Aether Motes flow between worlds through windows and cracks in reality. Those sensitive enough can feel these currents and follow them.',
    prerequisites: ['aether-vision', 'veridex-training'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'veridex-training', level: 5 },
        'Must have significant veridex training'
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
      description: 'Potential for animus separation',
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
their animuses. This power comes at a price paid in pain.`,
    prerequisites: ['animus-bond'],
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
      description: 'Can begin separation from animus',
      target: { abilityId: 'separation_start' },
    }),
  ],
  {
    description: 'Undergo the terrible ordeal of separation',
    lore: `Every witch must face the ordeal - walking away from their animus until
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
      description: 'Can separate up to 50 meters from animus',
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
    description: 'Extend the distance you can travel from your animus',
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
      description: 'Can separate any distance from animus',
    }),
  ],
  {
    description: 'Travel any distance from your animus',
    lore: 'The greatest witches can send their animuses to the far side of the world while they remain at home. The bond stretches but never breaks.',
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

/** Animus as scout */
const ANIMUS_SCOUT_NODE = createSkillNode(
  'animus-scout',
  'Animus Scout',
  PARADIGM_ID,
  'separation',
  4,
  175,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Send animus ahead as a scout',
      target: { abilityId: 'animus_scouting' },
    }),
    createSkillEffect('perception', 20, {
      description: 'See through animus\'s eyes while separated',
    }),
  ],
  {
    description: 'Send your animus ahead to scout while you remain behind',
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
// Severance Resistance (Dark Path)
// ============================================================================

/** Severance awareness - knowing the horror */
const INTERCISION_AWARENESS_NODE = createSkillNode(
  'severance-awareness',
  'Severance Awareness',
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
    description: 'Recognize the horror of severance',
    lore: `Severance - the cutting of the bond between human and animus.
Those who have been severed are empty, dead-eyed, barely human.
The Orthodoxy calls it "performing the separation." We call it murder of the soul.`,
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
    prerequisites: ['severance-awareness', 'emotional-sync'],
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

/** Deep bond - animus as extension of self */
const DEEP_BOND_NODE = createSkillNode(
  'deep-bond',
  'Deep Bond',
  PARADIGM_ID,
  'mastery',
  4,
  250,
  [
    createSkillEffect('bond_strength', 25, {
      description: 'Animus is a true extension of yourself',
    }),
    createSkillEffect('unlock_ability', 1, {
      description: 'Share sensory input with animus',
      target: { abilityId: 'sensory_sharing' },
    }),
  ],
  {
    description: 'Achieve a profound unity with your animus',
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

/** Animus combat - fighting as one */
const ANIMUS_COMBAT_NODE = createSkillNode(
  'animus-combat',
  'Animus Combat',
  PARADIGM_ID,
  'mastery',
  3,
  175,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Fight in coordination with animus',
      target: { abilityId: 'animus_assist' },
    }),
    createSkillEffect('combat', 15, {
      description: 'Bonus when animus assists in combat',
    }),
  ],
  {
    description: 'Learn to fight in perfect coordination with your animus',
    lore: 'Your animus can bite, claw, distract - but more importantly, they can warn you of danger and watch your back. Fighting as one is fighting as two.',
    prerequisites: ['form-affinity'],
    unlockConditions: [
      createUnlockCondition(
        'form_category',
        { category: 'predator' },
        'Animus must have a combat-capable form'
      ),
    ],
    conditionMode: 'all',
    maxLevel: 5,
    levelCostMultiplier: 1.4,
  }
);

/** Aether Motes communion - advanced consciousness work */
const AETHER_COMMUNION_NODE = createSkillNode(
  'aether-communion',
  'Aether Mote Communion',
  PARADIGM_ID,
  'aether_motes',
  5,
  350,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Enter deep communion with Aether Motes',
      target: { abilityId: 'aether_communion' },
    }),
    createSkillEffect('wisdom', 20, {
      description: 'Wisdom gained from Aether Mote consciousness',
    }),
  ],
  {
    description: 'Achieve direct communion with Aether Motes consciousness',
    lore: 'Aether Motes are not merely particles - it is consciousness itself, the accumulated wisdom of countless beings. To commune with Aether Motes is to touch something vast and ancient.',
    prerequisites: ['aether-attraction', 'deep-bond'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'aether-attraction', level: 5 },
        'Must have strong Aether Mote affinity'
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
    eventType: 'animus_interaction',
    xpAmount: 5,
    description: 'Meaningful interaction with your animus',
  },
  {
    eventType: 'form_used',
    xpAmount: 10,
    description: "Use your animus's form abilities",
  },
  {
    eventType: 'aether_perceived',
    xpAmount: 15,
    description: 'Successfully perceive Aether Motes',
  },
  {
    eventType: 'veridex_reading',
    xpAmount: 50,
    description: 'Successfully read the veridex',
  },
  {
    eventType: 'separation_extended',
    xpAmount: 25,
    description: 'Successfully separate from animus',
  },
  {
    eventType: 'animus_scouting_success',
    xpAmount: 30,
    description: 'Animus successfully scouts ahead',
  },
  {
    eventType: 'bond_threatened',
    xpAmount: 20,
    description: 'Resist a threat to your animus bond',
  },
  {
    eventType: 'form_revelation',
    xpAmount: 100,
    description: 'Your animus settles or reveals a truth about form',
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
  ANIMUS_BOND_NODE,
  EMOTIONAL_SYNC_NODE,
  SILENT_SPEECH_NODE,
  TOUCH_TABOO_NODE,

  // Form & Settling
  FORM_AWARENESS_NODE,
  FORM_SHIFTING_NODE,
  SETTLING_NODE,
  FORM_AFFINITY_NODE,
  FORM_MASTERY_NODE,

  // Aether Motes
  AETHER_SENSE_NODE,
  AETHER_VISION_NODE,
  AETHER_ATTRACTION_NODE,
  VERIDEX_TRAINING_NODE,
  INTUITIVE_READING_NODE,
  AETHER_NAVIGATION_NODE,
  AETHER_COMMUNION_NODE,

  // Separation (Witch Path)
  WITCH_BLOOD_NODE,
  SEPARATION_ORDEAL_NODE,
  BASIC_SEPARATION_NODE,
  EXTENDED_SEPARATION_NODE,
  UNLIMITED_SEPARATION_NODE,
  WITCH_FLIGHT_NODE,
  ANIMUS_SCOUT_NODE,

  // Severance Resistance
  INTERCISION_AWARENESS_NODE,
  BOND_FORTIFICATION_NODE,

  // Advanced
  DEEP_BOND_NODE,
  ANIMUS_COMBAT_NODE,
];

/**
 * The Animus skill tree.
 * Everyone has a animus, but advanced abilities require settling or witch blood.
 */
export const ANIMUS_SKILL_TREE: MagicSkillTree = {
  id: 'animus-tree',
  paradigmId: PARADIGM_ID,
  name: 'The Animus Bond',
  description: 'Master the connection with your external soul, perceive Aether Motes, and perhaps learn the witch\'s secret of separation.',
  lore: `Your animus is your soul made visible - an animal companion that is truly
a part of you. In childhood, your animus shifts form constantly; in adulthood,
they settle into one form that reflects your true nature. The bond between
human and animus is unbreakable... or so most believe.

Aether Motes - the golden particles of consciousness - settles on those with settled
animuses. Learn to perceive it, and you may glimpse truths hidden from others.

And for those with witch blood, there is another path: the terrible ordeal
of separation, which allows you to travel apart from your animus. But the
price is paid in pain.`,
  nodes: ALL_NODES,
  entryNodes: ['animus-bond'],
  connections: [], // Auto-generated from prerequisites
  xpSources: XP_SOURCES,
  rules: {
    ...createDefaultTreeRules(false), // Everyone has a animus
    allowRespec: false,
    permanentProgress: true,
    progressLossConditions: [
      createUnlockCondition(
        'severance',
        {},
        'Severance permanently destroys all animus abilities',
      ),
    ],
  },
  version: 1,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get bonuses based on animus form category.
 */
export function getFormBonuses(formCategory: keyof typeof ANIMUS_FORM_CATEGORIES): {
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
 * Check if a specific animus form is available in a category.
 */
export function isFormInCategory(form: string, category: keyof typeof ANIMUS_FORM_CATEGORIES): boolean {
  const forms = ANIMUS_FORM_CATEGORIES[category];
  return (forms as readonly string[]).includes(form);
}

/**
 * Get the category for a animus form.
 */
export function getFormCategory(form: string): keyof typeof ANIMUS_FORM_CATEGORIES | null {
  for (const [category, forms] of Object.entries(ANIMUS_FORM_CATEGORIES)) {
    if ((forms as readonly string[]).includes(form)) {
      return category as keyof typeof ANIMUS_FORM_CATEGORIES;
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
 * Check if an entity can separate from their animus.
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
