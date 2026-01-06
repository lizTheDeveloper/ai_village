/**
 * RuneSkillTree - Skill tree for the Rune paradigm
 *
 * Key mechanics:
 * - Rune discovery (finding/learning ancient symbols)
 * - Rune carving and inscription
 * - Material selection (different materials have different effects)
 * - Rune combinations and sequences
 * - Activation methods (blood, magic, speech, time)
 * - Permanence vs. temporary runes
 * - Power scaling with craftsmanship quality
 * - Elder runes vs. common runes
 *
 * Inspired by:
 * - Norse/Germanic runic tradition
 * - Tolkien's runes (Cirth, Tengwar, runes of power)
 * - Rune magic from various fantasy settings
 * - The concept that writing itself is magical
 * - Craftsmanship as a form of magic
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

const PARADIGM_ID = 'rune';

/** Rune categories by purpose */
export const RUNE_CATEGORIES = {
  protection: 'Runes of warding and defense',
  power: 'Runes that grant strength and energy',
  knowledge: 'Runes of revelation and understanding',
  binding: 'Runes that constrain and control',
  creation: 'Runes of making and shaping',
  destruction: 'Runes of breaking and unmaking',
  element: 'Runes tied to elemental forces',
  life: 'Runes of healing and growth',
  death: 'Runes of ending and decay',
  fate: 'Runes that touch destiny itself',
} as const;

/** Carving materials and their properties */
export const CARVING_MATERIALS = {
  wood: 'Easy to carve, temporary, nature-aligned',
  stone: 'Difficult to carve, permanent, earth-aligned',
  metal: 'Requires skill, durable, conducts power well',
  bone: 'Moderate difficulty, connects to death/life',
  crystal: 'Fragile but powerful, amplifies magic',
  flesh: 'Painful, temporary, blood magic synergy',
  air: 'Impossible for most, ephemeral, wind magic',
  light: 'Impossible for most, instant, pure magic',
} as const;

/** Rune tiers */
export const RUNE_TIERS = {
  common: 'Basic runes - simple effects, widely known',
  uncommon: 'Advanced runes - stronger effects, rare knowledge',
  rare: 'Powerful runes - significant effects, secret knowledge',
  elder: 'Ancient runes - reality-bending effects, forbidden',
} as const;

/** Activation methods */
export const ACTIVATION_METHODS = {
  passive: 'Always active once carved',
  touch: 'Activated by touching the rune',
  blood: 'Activated by blood sacrifice',
  word: 'Activated by speaking the rune\'s name',
  time: 'Activates at specific times or conditions',
  trigger: 'Activates when specific event occurs',
} as const;

// ============================================================================
// Foundation Nodes - Learning Runes
// ============================================================================

/** Entry node - reading runes */
const RUNE_READING_NODE = createSkillNode(
  'rune-reading',
  'Rune Reading',
  PARADIGM_ID,
  'foundation',
  0,
  40,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Read and understand carved runes',
      target: { abilityId: 'read_runes' },
    }),
  ],
  {
    description: 'Learn to read and understand runes',
    lore: `Runes are an ancient language - each symbol carries meaning and power.
You learn to recognize them, to read their shapes, to understand what they
do. This is the first step: seeing runes not as mere markings but as
living magic.`,
    maxLevel: 5,
    levelCostMultiplier: 1.3,
    icon: 'ᚱ',
  }
);

/** Basic carving - inscribing runes */
const BASIC_CARVING_NODE = createSkillNode(
  'basic-carving',
  'Basic Runecarving',
  PARADIGM_ID,
  'foundation',
  1,
  75,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Carve basic runes into wood',
      target: { abilityId: 'carve_rune' },
    }),
  ],
  {
    description: 'Learn to carve runes into wood',
    lore: `To use runes, you must inscribe them. Start with wood - softest material,
most forgiving. Each line must be perfect. Each angle precise. A wrongly
carved rune is worse than useless - it can backfire catastrophically.`,
    prerequisites: ['rune-reading'],
    unlockConditions: [
      createUnlockCondition(
        'teacher_found',
        { teacherType: 'rune_carver' },
        'Must be taught by a rune carver'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Rune sense - feeling rune power */
const RUNE_SENSE_NODE = createSkillNode(
  'rune-sense',
  'Rune Sense',
  PARADIGM_ID,
  'foundation',
  1,
  60,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Sense active runes nearby',
      target: { abilityId: 'sense_runes' },
    }),
  ],
  {
    description: 'Sense the presence of carved runes',
    lore: `Active runes emanate power. You learn to feel this - a tingling, a
resonance, a sense of potential. This lets you detect warded doors,
cursed objects, hidden protections.`,
    prerequisites: ['rune-reading'],
    maxLevel: 3,
  }
);

/** Precision carving - better quality */
const PRECISION_CARVING_NODE = createSkillNode(
  'precision-carving',
  'Precision Carving',
  PARADIGM_ID,
  'foundation',
  2,
  100,
  [
    createSkillEffect('technique_proficiency', 15, {
      perLevelValue: 5,
      target: { techniqueId: 'create' },
      description: '+X% rune power from quality',
    }),
  ],
  {
    description: 'Master precise, powerful rune carving',
    lore: `The quality of the carving affects the rune's power. Perfect lines,
exact angles, flawless execution - these amplify the effect. You learn
to carve with jeweler's precision, each stroke perfection.`,
    prerequisites: ['basic-carving'],
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

// ============================================================================
// Material Mastery Nodes
// ============================================================================

/** Stone carving - permanent runes */
const STONE_CARVING_NODE = createSkillNode(
  'stone-carving',
  'Stone Runecarving',
  PARADIGM_ID,
  'technique',
  2,
  125,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Carve runes into stone',
      target: { abilityId: 'carve_stone' },
    }),
  ],
  {
    description: 'Learn to carve runes into stone',
    lore: `Stone is harder than wood but permanent. A rune carved in stone lasts
centuries, millennia. This is how the ancients preserved their magic -
runes carved into standing stones, monuments, mountain faces.`,
    prerequisites: ['basic-carving', 'precision-carving'],
  }
);

/** Metal carving - conductive runes */
const METAL_CARVING_NODE = createSkillNode(
  'metal-carving',
  'Metal Runecarving',
  PARADIGM_ID,
  'technique',
  2,
  150,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Carve runes into metal',
      target: { abilityId: 'carve_metal' },
    }),
  ],
  {
    description: 'Learn to carve runes into metal',
    lore: `Metal conducts magical power better than wood or stone. Runes carved in
metal are stronger, sharper, more responsive. This is how you make runic
weapons and armor - each piece inscribed with power.`,
    prerequisites: ['stone-carving'],
    unlockConditions: [
      createUnlockCondition(
        'skill_level',
        { skillId: 'crafting', level: 3 },
        'Requires crafting skill'
      ),
    ],
    conditionMode: 'any',
  }
);

/** Crystal carving - amplified runes */
const CRYSTAL_CARVING_NODE = createSkillNode(
  'crystal-carving',
  'Crystal Runecarving',
  PARADIGM_ID,
  'technique',
  3,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Carve runes into crystal',
      target: { abilityId: 'carve_crystal' },
    }),
  ],
  {
    description: 'Learn to carve runes into crystal',
    lore: `Crystal is fragile but incredibly powerful. Runes carved in crystal
amplify their effects massively - but shatter the crystal and the rune
explodes with stored energy. Dangerous but devastating.`,
    prerequisites: ['metal-carving'],
  }
);

/** Flesh carving - tattoo runes */
const FLESH_CARVING_NODE = createSkillNode(
  'flesh-carving',
  'Flesh Runecarving',
  PARADIGM_ID,
  'technique',
  3,
  175,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Carve runes into living flesh (tattoos)',
      target: { abilityId: 'carve_flesh' },
    }),
  ],
  {
    description: 'Learn to carve runes into living flesh',
    lore: `Runes can be tattooed or scarred into skin. These living runes bond with
the bearer, drawing power from their life force. Painful to create but
intimately powerful. The rune becomes part of you.`,
    prerequisites: ['metal-carving'],
    icon: '🖋️',
  }
);

// ============================================================================
// Rune Discovery Nodes
// ============================================================================

/** Common runes - basic symbols */
const COMMON_RUNES_NODE = createSkillNode(
  'common-runes',
  'Common Runes',
  PARADIGM_ID,
  'discovery',
  1,
  80,
  [
    createSkillEffect('unlock_rune', 1, {
      description: 'Learn common protective and power runes',
    }),
  ],
  {
    description: 'Learn the common runes',
    lore: `The basic runes are widely known: protection, strength, light, warmth.
Simple effects but reliable. Every rune carver learns these first.`,
    prerequisites: ['basic-carving'],
  }
);

/** Protection runes - wards and defenses */
const PROTECTION_RUNES_NODE = createSkillNode(
  'protection-runes',
  'Runes of Protection',
  PARADIGM_ID,
  'discovery',
  2,
  125,
  [
    createSkillEffect('unlock_rune', 1, {
      description: 'Learn protection and warding runes',
    }),
  ],
  {
    description: 'Learn runes of protection and warding',
    lore: `Runes can ward against harm - evil spirits, hostile magic, physical
danger. Carve them on doorways, weapons, armor. Each rune is a shield.`,
    prerequisites: ['common-runes'],
  }
);

/** Element runes - fire, water, earth, air */
const ELEMENT_RUNES_NODE = createSkillNode(
  'element-runes',
  'Elemental Runes',
  PARADIGM_ID,
  'discovery',
  2,
  150,
  [
    createSkillEffect('unlock_rune', 1, {
      description: 'Learn elemental runes',
    }),
  ],
  {
    description: 'Learn runes of the elements',
    lore: `Each element has its runes. Fire for warmth and destruction. Water for
flowing and healing. Earth for stability and growth. Air for freedom and
speed. Master these and you command the elements through inscription.`,
    prerequisites: ['common-runes'],
  }
);

/** Binding runes - control and constraint */
const BINDING_RUNES_NODE = createSkillNode(
  'binding-runes',
  'Runes of Binding',
  PARADIGM_ID,
  'discovery',
  3,
  175,
  [
    createSkillEffect('unlock_rune', 1, {
      description: 'Learn binding and control runes',
    }),
  ],
  {
    description: 'Learn runes of binding and control',
    lore: `Some runes constrain - they bind spirits, lock doors, prevent movement.
Carve them correctly and you create prisons of magic. These runes are
dangerous knowledge.`,
    prerequisites: ['protection-runes'],
  }
);

/** Elder runes - ancient power */
const ELDER_RUNES_NODE = createSkillNode(
  'elder-runes',
  'Elder Runes',
  PARADIGM_ID,
  'mastery',
  4,
  300,
  [
    createSkillEffect('unlock_rune', 1, {
      description: 'Learn the ancient Elder Runes',
    }),
  ],
  {
    description: 'Learn the Elder Runes of power',
    lore: `The Elder Runes are ancient beyond memory - symbols of primal power
carved by gods or titans. Each can reshape reality. But they're also
incredibly dangerous to use. One wrong line and the rune explodes.`,
    prerequisites: ['binding-runes', 'element-runes'],
    unlockConditions: [
      createUnlockCondition(
        'secret_revealed',
        { secretId: 'elder_rune_knowledge' },
        'Must discover the Elder Rune lore'
      ),
    ],
    conditionMode: 'all',
    icon: 'ᛟ',
  }
);

// ============================================================================
// Advanced Techniques
// ============================================================================

/** Rune combinations - sequences of power */
const RUNE_COMBINATIONS_NODE = createSkillNode(
  'rune-combinations',
  'Rune Sequences',
  PARADIGM_ID,
  'technique',
  3,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Combine multiple runes into sequences',
      target: { abilityId: 'rune_sequence' },
    }),
  ],
  {
    description: 'Learn to combine runes into powerful sequences',
    lore: `A single rune is powerful. Multiple runes together are exponentially more
so. Learn to carve them in sequence, each feeding into the next, creating
effects impossible with single runes. This is runecraft mastery.`,
    prerequisites: ['protection-runes', 'element-runes'],
    maxLevel: 5,
  }
);

/** Rune activation - triggering inscribed power */
const RUNE_ACTIVATION_NODE = createSkillNode(
  'rune-activation',
  'Rune Activation',
  PARADIGM_ID,
  'technique',
  2,
  125,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Activate runes with various triggers',
      target: { abilityId: 'activate_rune' },
    }),
  ],
  {
    description: 'Master different rune activation methods',
    lore: `Some runes are always active. Others need activation - a touch, a word,
a drop of blood. You learn to carve conditional runes that trigger only
when needed, preserving their power for the right moment.`,
    prerequisites: ['common-runes'],
  }
);

/** Rune crafting - making runic items */
const RUNE_CRAFTING_NODE = createSkillNode(
  'rune-crafting',
  'Runic Crafting',
  PARADIGM_ID,
  'technique',
  3,
  225,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Create items specifically for rune carving',
      target: { abilityId: 'runic_craft' },
    }),
  ],
  {
    description: 'Craft items optimized for rune inscription',
    lore: `You can carve runes on any surface, but items made specifically to hold
runes are far more powerful. Learn to craft runestones, runic weapons,
runic armor - each designed to amplify inscribed magic.`,
    prerequisites: ['metal-carving', 'precision-carving'],
  }
);

/** Rune erasing - removing inscriptions */
const RUNE_ERASING_NODE = createSkillNode(
  'rune-erasing',
  'Rune Erasure',
  PARADIGM_ID,
  'technique',
  3,
  175,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Safely erase carved runes',
      target: { abilityId: 'erase_rune' },
    }),
  ],
  {
    description: 'Learn to safely erase runes',
    lore: `Erasing a rune isn't as simple as scratching it out. Do it wrong and
the stored power explodes. You learn the proper rituals to discharge a
rune safely before removing it.`,
    prerequisites: ['rune-activation', 'rune-sense'],
  }
);

/** Living runes - temporary air/light runes */
const LIVING_RUNES_NODE = createSkillNode(
  'living-runes',
  'Living Runes',
  PARADIGM_ID,
  'mastery',
  4,
  350,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Draw runes in air and light',
      target: { abilityId: 'living_rune' },
    }),
  ],
  {
    description: 'Learn to draw runes in air and light',
    lore: `The greatest rune carvers can inscribe runes on nothing - drawing them
in air with gesture, in light with will. These living runes last only
moments but activate instantly. This is combat runecrafting.`,
    prerequisites: ['rune-combinations', 'elder-runes'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'precision-carving', level: 5 },
        'Requires perfect carving precision'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Rune mastery - ultimate inscription */
const RUNE_MASTERY_NODE = createSkillNode(
  'rune-mastery',
  'Master Runecraft',
  PARADIGM_ID,
  'mastery',
  5,
  500,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Achieve mastery of all runecraft',
      target: { abilityId: 'rune_master' },
    }),
  ],
  {
    description: 'Achieve true mastery of runecraft',
    lore: `A master runecraftsman can carve any rune on any surface with any tool.
Every stroke is perfect. Every angle exact. Their runes are works of art
and engines of power. Reality itself bends to inscribed will.`,
    prerequisites: ['living-runes', 'rune-crafting'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 2500 },
        'Requires vast runecrafting experience'
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
    eventType: 'rune_read',
    xpAmount: 10,
    description: 'Successfully read and understand a rune',
  },
  {
    eventType: 'rune_carved',
    xpAmount: 25,
    description: 'Successfully carve a rune',
  },
  {
    eventType: 'rune_activated',
    xpAmount: 30,
    description: 'Successfully activate a carved rune',
  },
  {
    eventType: 'new_rune_learned',
    xpAmount: 100,
    description: 'Learn a new rune',
  },
  {
    eventType: 'rune_sequence_created',
    xpAmount: 150,
    description: 'Create a successful rune sequence',
  },
  {
    eventType: 'elder_rune_carved',
    xpAmount: 300,
    description: 'Successfully carve an Elder Rune',
  },
  {
    eventType: 'perfect_carving',
    xpAmount: 75,
    description: 'Achieve perfect precision on a rune',
  },
  {
    eventType: 'rune_item_crafted',
    xpAmount: 125,
    description: 'Craft an item specifically for rune inscription',
  },
];

// ============================================================================
// Tree Assembly
// ============================================================================

const ALL_NODES: MagicSkillNode[] = [
  // Foundation
  RUNE_READING_NODE,
  BASIC_CARVING_NODE,
  RUNE_SENSE_NODE,
  PRECISION_CARVING_NODE,

  // Materials
  STONE_CARVING_NODE,
  METAL_CARVING_NODE,
  CRYSTAL_CARVING_NODE,
  FLESH_CARVING_NODE,

  // Discovery
  COMMON_RUNES_NODE,
  PROTECTION_RUNES_NODE,
  ELEMENT_RUNES_NODE,
  BINDING_RUNES_NODE,
  ELDER_RUNES_NODE,

  // Advanced techniques
  RUNE_COMBINATIONS_NODE,
  RUNE_ACTIVATION_NODE,
  RUNE_CRAFTING_NODE,
  RUNE_ERASING_NODE,
  LIVING_RUNES_NODE,
  RUNE_MASTERY_NODE,
];

/**
 * The Rune skill tree.
 * Anyone can learn, but requires patience and precision.
 */
export const RUNE_SKILL_TREE: MagicSkillTree = {
  id: 'rune-tree',
  paradigmId: PARADIGM_ID,
  name: 'The Runic Art',
  description: 'Master the ancient art of rune carving - inscribing magical symbols that reshape reality.',
  lore: `Runes are the written language of magic itself. Each symbol is a word of
power, a command to reality. Carved correctly, runes can protect, strengthen,
bind, destroy, or reshape the world.

The tradition is ancient - older than most civilizations. The first runes were
carved by gods or titans (depending on which stories you believe), symbols of
primal forces etched into the bones of the world. Later, mortals learned to
copy these symbols, to carve them into wood and stone and metal.

Learning runecraft begins with reading - understanding what each symbol means,
what it does, how it functions. Then comes carving: the meticulous, precise work
of inscribing runes into various materials. Every line must be perfect. Every
angle exact. A wrongly carved rune is worse than useless - it can explode,
backfire, or summon things best left alone.

Different materials have different properties. Wood is easy but temporary. Stone
is permanent but hard. Metal conducts power well. Crystal amplifies effects but
shatters easily. Even living flesh can bear runes - tattoos of power that bond
with the bearer.

Master carvers learn to combine runes into sequences - each feeding into the
next, creating cascading effects impossible with single runes. They discover the
Elder Runes - ancient symbols of reality-bending power. The greatest even learn
to draw living runes in air and light, inscriptions that exist for mere moments
but activate instantly.

The path of runecraft is one of patience, precision, and scholarship. It's less
about raw power and more about careful, methodical application of ancient
knowledge.`,
  nodes: ALL_NODES,
  entryNodes: ['rune-reading'],
  connections: [], // Auto-generated from prerequisites
  xpSources: XP_SOURCES,
  rules: {
    ...createDefaultTreeRules(false), // No innate requirement
    allowRespec: false, // Rune knowledge is permanent
    permanentProgress: true,
  },
  version: 1,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate rune power based on material and quality.
 */
export function calculateRunePower(
  runeTier: keyof typeof RUNE_TIERS,
  material: keyof typeof CARVING_MATERIALS,
  carvingQuality: number // 0-100
): number {
  const tierPower: Record<keyof typeof RUNE_TIERS, number> = {
    common: 50,
    uncommon: 100,
    rare: 200,
    elder: 500,
  };

  const materialMultiplier: Record<keyof typeof CARVING_MATERIALS, number> = {
    wood: 0.8,
    stone: 1.0,
    metal: 1.3,
    bone: 1.1,
    crystal: 2.0,
    flesh: 1.5,
    air: 0.5, // Weak but instant
    light: 0.7, // Weak but instant
  };

  const base = tierPower[runeTier];
  const matMult = materialMultiplier[material];
  const qualityMult = 0.5 + (carvingQuality / 100) * 0.5; // 0.5 to 1.0

  return Math.floor(base * matMult * qualityMult);
}

/**
 * Get carving difficulty for a material.
 */
export function getCarvingDifficulty(material: keyof typeof CARVING_MATERIALS): number {
  const difficulty: Record<keyof typeof CARVING_MATERIALS, number> = {
    wood: 20,
    stone: 50,
    metal: 70,
    bone: 40,
    crystal: 90,
    flesh: 60,
    air: 95,
    light: 99,
  };

  return difficulty[material];
}

/**
 * Check if can carve on a material.
 */
export function canCarveOn(material: keyof typeof CARVING_MATERIALS, unlockedNodes: Record<string, number>): boolean {
  const requiredNodes: Record<keyof typeof CARVING_MATERIALS, string> = {
    wood: 'basic-carving',
    stone: 'stone-carving',
    metal: 'metal-carving',
    bone: 'basic-carving', // Same as wood
    crystal: 'crystal-carving',
    flesh: 'flesh-carving',
    air: 'living-runes',
    light: 'living-runes',
  };

  return !!unlockedNodes[requiredNodes[material]];
}

/**
 * Get maximum rune sequence length.
 */
export function getMaxSequenceLength(unlockedNodes: Record<string, number>): number {
  if (!unlockedNodes['rune-combinations']) return 1;

  let max = 2 + (unlockedNodes['rune-combinations'] - 1);

  if (unlockedNodes['rune-mastery']) max = 99;

  return max;
}

/**
 * Calculate rune duration based on material and activation.
 */
export function getRuneDuration(
  material: keyof typeof CARVING_MATERIALS,
  activationMethod: keyof typeof ACTIVATION_METHODS
): number {
  // Duration in hours
  const baseDuration: Record<keyof typeof CARVING_MATERIALS, number> = {
    wood: 24,
    stone: 8760, // 1 year
    metal: 4380, // 6 months
    bone: 720, // 1 month
    crystal: 168, // 1 week (until shattered)
    flesh: 2160, // 3 months (until healed)
    air: 0.01, // Seconds
    light: 0.01, // Seconds
  };

  const activationMult: Record<keyof typeof ACTIVATION_METHODS, number> = {
    passive: 1.0,
    touch: 0.5, // Drains faster when activated
    blood: 0.7,
    word: 0.6,
    time: 1.0,
    trigger: 1.0,
  };

  return baseDuration[material] * activationMult[activationMethod];
}

/**
 * Get known runes by category.
 */
export function getKnownRunes(unlockedNodes: Record<string, number>): (keyof typeof RUNE_CATEGORIES)[] {
  const categories: (keyof typeof RUNE_CATEGORIES)[] = [];

  if (unlockedNodes['protection-runes']) categories.push('protection');
  if (unlockedNodes['element-runes']) categories.push('element');
  if (unlockedNodes['binding-runes']) categories.push('binding');
  if (unlockedNodes['common-runes']) {
    categories.push('power', 'knowledge', 'life');
  }
  if (unlockedNodes['elder-runes']) {
    categories.push('creation', 'destruction', 'death', 'fate');
  }

  return categories;
}
