/**
 * AllomancySkillTree - Skill tree for the Allomancy paradigm
 *
 * Key mechanics:
 * - Bloodline requirement (must have Allomancer genes)
 * - Snapping (trauma event that awakens powers)
 * - Metal discovery (each metal is a separate unlock)
 * - Misting vs Mistborn paths (bloodline strength determines available metals)
 * - Burn rate control and flaring mastery
 */

import type { MagicSkillTree, MagicSkillNode, MagicXPSource } from '../MagicSkillTree.js';
import {
  createSkillNode,
  createSkillEffect,
  createUnlockCondition,
  createDefaultTreeRules,
} from '../MagicSkillTree.js';
import { ALLOMANTIC_METALS } from '../AnimistParadigms.js';

// ============================================================================
// Constants
// ============================================================================

const PARADIGM_ID = 'allomancy';

/** Metal categories for progression */
const METAL_TIERS = {
  basic: ['steel', 'iron', 'pewter', 'tin'],           // Common metals, first to discover
  mental: ['zinc', 'brass', 'copper', 'bronze'],       // Mental metals, uncommon
  enhancement: ['aluminum', 'duralumin'],              // Enhancement, rare
  temporal: ['gold', 'electrum', 'atium', 'malatium'], // Temporal, very rare/legendary
} as const;

// ============================================================================
// Foundation Nodes
// ============================================================================

/** Entry node - requires snapping trauma event */
const SNAPPED_NODE = createSkillNode(
  'snapped',
  'Snapped',
  PARADIGM_ID,
  'foundation',
  0,
  0, // No cost - event-based unlock
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Can feel metal reserves',
      target: { abilityId: 'metal_sense_internal' },
    }),
  ],
  {
    description: 'The breaking point that awakens Allomantic potential',
    lore: `Snapping is the moment of trauma that unlocks Allomancy. For many, it happens
in childhood - a moment of intense fear, pain, or grief that breaks something inside
and lets the power through. Not all with the bloodline will Snap. Some go their
whole lives never knowing what they could have been.`,
    unlockConditions: [
      createUnlockCondition(
        'snapping',
        {},
        'Must experience a snapping event (severe trauma that awakens powers)',
        { hidden: true }
      ),
    ],
    conditionMode: 'all',
    hidden: true, // Hidden until they Snap
    icon: '💔',
  }
);

/** Basic metal awareness */
const METAL_AWARENESS_NODE = createSkillNode(
  'metal-awareness',
  'Metal Awareness',
  PARADIGM_ID,
  'foundation',
  1,
  50,
  [
    createSkillEffect('metal_sense', 1, {
      description: 'Sense nearby metals',
    }),
  ],
  {
    description: 'Learn to sense metals around you',
    prerequisites: ['snapped'],
    maxLevel: 3,
    levelCostMultiplier: 1.5,
  }
);

/** Burn rate control - fundamental skill */
const BURN_CONTROL_NODE = createSkillNode(
  'burn-control',
  'Burn Control',
  PARADIGM_ID,
  'technique',
  1,
  75,
  [
    createSkillEffect('burn_rate_control', 1, {
      perLevelValue: 0.2,
      description: 'Control burn rate from slow to fast',
    }),
  ],
  {
    description: 'Control how quickly you burn metals',
    lore: 'Burning slowly conserves metal but provides weaker effects. Burning quickly is more powerful but depletes reserves faster.',
    prerequisites: ['snapped'],
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

/** Reserve efficiency */
const RESERVE_EFFICIENCY_NODE = createSkillNode(
  'reserve-efficiency',
  'Efficient Reserves',
  PARADIGM_ID,
  'efficiency',
  2,
  100,
  [
    createSkillEffect('reserve_efficiency', 5, {
      perLevelValue: 3,
      description: '+X% metal duration',
    }),
  ],
  {
    description: 'Extract more power from your metal reserves',
    prerequisites: ['burn-control'],
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

/** Flaring - dangerous power boost */
const FLARING_NODE = createSkillNode(
  'flaring',
  'Flaring',
  PARADIGM_ID,
  'mastery',
  2,
  150,
  [
    createSkillEffect('flare_control', 1, {
      description: 'Can flare metals for burst power',
    }),
  ],
  {
    description: 'Learn to flare metals for a dangerous burst of power',
    lore: 'Flaring burns metals at an extreme rate, providing a massive boost at the cost of rapid depletion and physical strain.',
    prerequisites: ['burn-control'],
    unlockConditions: [
      createUnlockCondition(
        'magic_proficiency',
        { techniqueId: 'enhance', proficiencyLevel: 2 },
        'Must have practiced burning metals extensively'
      ),
    ],
    conditionMode: 'all',
    maxLevel: 3,
    levelCostMultiplier: 2,
  }
);

/** Safe flaring - reduce drawbacks */
const SAFE_FLARING_NODE = createSkillNode(
  'safe-flaring',
  'Controlled Flaring',
  PARADIGM_ID,
  'mastery',
  3,
  200,
  [
    createSkillEffect('flare_control', 1, {
      perLevelValue: 1,
      description: 'Reduce flaring side effects',
    }),
  ],
  {
    description: 'Flare metals with reduced physical strain',
    prerequisites: ['flaring'],
    maxLevel: 3,
    levelCostMultiplier: 2,
  }
);

// ============================================================================
// Metal Discovery Nodes
// ============================================================================

/**
 * Create a metal discovery node.
 * These unlock when the agent discovers they can burn a specific metal.
 */
function createMetalNode(
  metalId: string,
  tier: number,
  prerequisites: string[] = []
): MagicSkillNode {
  const metal = ALLOMANTIC_METALS.find(m => m.id === metalId);
  if (!metal) {
    throw new Error(`Unknown metal: ${metalId}`);
  }

  const baseCost = tier === 1 ? 50 : tier === 2 ? 100 : tier === 3 ? 200 : 300;

  return createSkillNode(
    `metal-${metalId}`,
    metal.name,
    PARADIGM_ID,
    'discovery',
    tier,
    baseCost,
    [
      createSkillEffect('unlock_metal', 1, {
        target: { metalId },
        description: `Can burn ${metal.name}: ${metal.effect}`,
      }),
    ],
    {
      description: metal.effect,
      lore: metal.drawback ? `Drawback: ${metal.drawback}` : undefined,
      prerequisites,
      unlockConditions: [
        createUnlockCondition(
          'metal_consumed',
          { metalId },
          `Must have consumed and survived burning ${metal.name}`,
          { hidden: true }
        ),
      ],
      conditionMode: 'all',
      hidden: true, // Hidden until discovered
      tags: [metal.type, metal.direction, metal.rarity],
    }
  );
}

/** Create mastery node for a metal */
function createMetalMasteryNode(
  metalId: string,
  tier: number
): MagicSkillNode {
  const metal = ALLOMANTIC_METALS.find(m => m.id === metalId);
  if (!metal) {
    throw new Error(`Unknown metal: ${metalId}`);
  }

  return createSkillNode(
    `mastery-${metalId}`,
    `${metal.name} Mastery`,
    PARADIGM_ID,
    'mastery',
    tier + 1,
    150,
    [
      createSkillEffect('technique_proficiency', 5, {
        perLevelValue: 3,
        target: { metalId },
        description: `+X% effectiveness when burning ${metal.name}`,
      }),
    ],
    {
      description: `Master the use of ${metal.name}`,
      prerequisites: [`metal-${metalId}`],
      maxLevel: 5,
      levelCostMultiplier: 1.5,
    }
  );
}

// Basic metals (tier 1)
const STEEL_NODE = createMetalNode('steel', 1, ['snapped']);
const IRON_NODE = createMetalNode('iron', 1, ['snapped']);
const PEWTER_NODE = createMetalNode('pewter', 1, ['snapped']);
const TIN_NODE = createMetalNode('tin', 1, ['snapped']);

// Mental metals (tier 2)
const ZINC_NODE = createMetalNode('zinc', 2, ['snapped']);
const BRASS_NODE = createMetalNode('brass', 2, ['snapped']);
const COPPER_NODE = createMetalNode('copper', 2, ['snapped']);
const BRONZE_NODE = createMetalNode('bronze', 2, ['snapped']);

// Enhancement metals (tier 3)
const ALUMINUM_NODE = createMetalNode('aluminum', 3, ['snapped']);
const DURALUMIN_NODE = createMetalNode('duralumin', 3, ['snapped', 'reserve-efficiency']);

// Temporal metals (tier 4)
const GOLD_NODE = createMetalNode('gold', 4, ['snapped']);
const ATIUM_NODE = createMetalNode('atium', 4, ['snapped']);

// Metal mastery nodes
const STEEL_MASTERY = createMetalMasteryNode('steel', 1);
const IRON_MASTERY = createMetalMasteryNode('iron', 1);
const PEWTER_MASTERY = createMetalMasteryNode('pewter', 1);
const TIN_MASTERY = createMetalMasteryNode('tin', 1);

// ============================================================================
// Misting Specialization Nodes
// ============================================================================

/** Coinshot - Steel specialist */
const COINSHOT_NODE = createSkillNode(
  'coinshot',
  'Coinshot',
  PARADIGM_ID,
  'specialization',
  3,
  250,
  [
    createSkillEffect('technique_proficiency', 10, {
      target: { metalId: 'steel' },
      description: 'Expert steel pusher',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'coin_salvo' },
      description: 'Can push multiple coins simultaneously',
    }),
  ],
  {
    description: 'Specialize in steel pushing, the art of the Coinshot',
    lore: 'Coinshots are the assassins and warriors of Allomancy, using steel to push on metals with deadly precision.',
    prerequisites: ['mastery-steel'],
    unlockConditions: [
      createUnlockCondition(
        'bloodline',
        { bloodlineStrength: 0.1 },
        'Must have Misting bloodline for steel',
        { bypassable: true, bypassCost: 500 }
      ),
    ],
    conditionMode: 'all',
  }
);

/** Lurcher - Iron specialist */
const LURCHER_NODE = createSkillNode(
  'lurcher',
  'Lurcher',
  PARADIGM_ID,
  'specialization',
  3,
  250,
  [
    createSkillEffect('technique_proficiency', 10, {
      target: { metalId: 'iron' },
      description: 'Expert iron puller',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'iron_grapple' },
      description: 'Can pull yourself to heavy metal objects',
    }),
  ],
  {
    description: 'Specialize in iron pulling, the art of the Lurcher',
    prerequisites: ['mastery-iron'],
  }
);

/** Thug - Pewter specialist */
const THUG_NODE = createSkillNode(
  'thug',
  'Pewter Arm (Thug)',
  PARADIGM_ID,
  'specialization',
  3,
  250,
  [
    createSkillEffect('technique_proficiency', 10, {
      target: { metalId: 'pewter' },
      description: 'Expert pewter burner',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'pewter_drag_resistance' },
      description: 'Reduced pewter drag after burning',
    }),
  ],
  {
    description: 'Specialize in pewter burning, becoming a living weapon',
    prerequisites: ['mastery-pewter'],
  }
);

/** Tineye - Tin specialist */
const TINEYE_NODE = createSkillNode(
  'tineye',
  'Tineye',
  PARADIGM_ID,
  'specialization',
  3,
  250,
  [
    createSkillEffect('technique_proficiency', 10, {
      target: { metalId: 'tin' },
      description: 'Expert tin burner',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'sensory_filter' },
      description: 'Can filter sensory overload',
    }),
  ],
  {
    description: 'Specialize in tin burning, becoming a master of senses',
    prerequisites: ['mastery-tin'],
  }
);

/** Soother - Brass specialist */
const SOOTHER_NODE = createSkillNode(
  'soother',
  'Soother',
  PARADIGM_ID,
  'specialization',
  3,
  300,
  [
    createSkillEffect('technique_proficiency', 10, {
      target: { metalId: 'brass' },
      description: 'Expert emotion dampener',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'targeted_soothing' },
      description: 'Can target specific emotions',
    }),
  ],
  {
    description: 'Master the art of calming and dampening emotions',
    prerequisites: ['metal-brass'],
  }
);

/** Rioter - Zinc specialist */
const RIOTER_NODE = createSkillNode(
  'rioter',
  'Rioter',
  PARADIGM_ID,
  'specialization',
  3,
  300,
  [
    createSkillEffect('technique_proficiency', 10, {
      target: { metalId: 'zinc' },
      description: 'Expert emotion inflamer',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'targeted_rioting' },
      description: 'Can target specific emotions to inflame',
    }),
  ],
  {
    description: 'Master the art of inflaming and inciting emotions',
    prerequisites: ['metal-zinc'],
  }
);

/** Smoker - Copper specialist */
const SMOKER_NODE = createSkillNode(
  'smoker',
  'Smoker',
  PARADIGM_ID,
  'specialization',
  3,
  300,
  [
    createSkillEffect('technique_proficiency', 10, {
      target: { metalId: 'copper' },
      description: 'Expert coppercloud creator',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'extended_coppercloud' },
      description: 'Coppercloud covers larger area',
    }),
  ],
  {
    description: 'Master the coppercloud, hiding Allomantic pulses',
    prerequisites: ['metal-copper'],
  }
);

/** Seeker - Bronze specialist */
const SEEKER_NODE = createSkillNode(
  'seeker',
  'Seeker',
  PARADIGM_ID,
  'specialization',
  3,
  300,
  [
    createSkillEffect('technique_proficiency', 10, {
      target: { metalId: 'bronze' },
      description: 'Expert Allomantic detector',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'pulse_identification' },
      description: 'Can identify which metal is being burned',
    }),
  ],
  {
    description: 'Master the art of detecting Allomantic pulses',
    prerequisites: ['metal-bronze'],
  }
);

// ============================================================================
// Mistborn Nodes (requires full bloodline)
// ============================================================================

/** Mistborn awakening - for those with full bloodline */
const MISTBORN_AWAKENING_NODE = createSkillNode(
  'mistborn-awakening',
  'Mistborn Awakening',
  PARADIGM_ID,
  'mastery',
  2,
  0, // Event-based
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Can burn all metals',
      target: { abilityId: 'full_allomancy' },
    }),
  ],
  {
    description: 'Awaken as a full Mistborn, able to burn all metals',
    lore: 'True Mistborn are exceedingly rare - perhaps one in a hundred thousand with any Allomantic blood will be born with the ability to burn all metals.',
    prerequisites: ['snapped'],
    unlockConditions: [
      createUnlockCondition(
        'bloodline',
        { bloodlineId: 'mistborn', bloodlineStrength: 1.0 },
        'Must have full Mistborn bloodline',
      ),
    ],
    conditionMode: 'all',
    hidden: true,
  }
);

/** Metal mastery synergy - Mistborn only */
const METAL_SYNERGY_NODE = createSkillNode(
  'metal-synergy',
  'Metal Synergy',
  PARADIGM_ID,
  'mastery',
  4,
  400,
  [
    createSkillEffect('technique_proficiency', 5, {
      description: 'Bonus when burning multiple metals',
    }),
  ],
  {
    description: 'Gain bonuses when burning multiple metals simultaneously',
    prerequisites: ['mistborn-awakening'],
    unlockConditions: [
      createUnlockCondition(
        'nodes_unlocked',
        { nodesRequired: 4 },
        'Must have discovered at least 4 metals'
      ),
    ],
    conditionMode: 'all',
    maxLevel: 3,
    levelCostMultiplier: 2,
  }
);

// ============================================================================
// XP Sources
// ============================================================================

const XP_SOURCES: MagicXPSource[] = [
  {
    eventType: 'metal_burned',
    xpAmount: 5,
    description: 'Burn any metal',
  },
  {
    eventType: 'metal_discovered',
    xpAmount: 100,
    description: 'Discover you can burn a new metal',
  },
  {
    eventType: 'metal_flared',
    xpAmount: 15,
    description: 'Flare a metal',
  },
  {
    eventType: 'push_pull_success',
    xpAmount: 10,
    description: 'Successfully push or pull on metal',
  },
  {
    eventType: 'combat_with_allomancy',
    xpAmount: 25,
    description: 'Use Allomancy in combat',
  },
  {
    eventType: 'emotion_manipulation',
    xpAmount: 20,
    description: 'Successfully manipulate emotions with zinc/brass',
  },
  {
    eventType: 'detection_avoided',
    xpAmount: 30,
    description: 'Hide from a Seeker using copper',
  },
  {
    eventType: 'seeker_detection',
    xpAmount: 20,
    description: 'Detect Allomancy with bronze',
  },
];

// ============================================================================
// Tree Assembly
// ============================================================================

const ALL_NODES: MagicSkillNode[] = [
  // Foundation
  SNAPPED_NODE,
  METAL_AWARENESS_NODE,
  BURN_CONTROL_NODE,
  RESERVE_EFFICIENCY_NODE,
  FLARING_NODE,
  SAFE_FLARING_NODE,

  // Basic metals
  STEEL_NODE,
  IRON_NODE,
  PEWTER_NODE,
  TIN_NODE,

  // Mental metals
  ZINC_NODE,
  BRASS_NODE,
  COPPER_NODE,
  BRONZE_NODE,

  // Enhancement metals
  ALUMINUM_NODE,
  DURALUMIN_NODE,

  // Temporal metals
  GOLD_NODE,
  ATIUM_NODE,

  // Mastery nodes
  STEEL_MASTERY,
  IRON_MASTERY,
  PEWTER_MASTERY,
  TIN_MASTERY,

  // Misting specializations
  COINSHOT_NODE,
  LURCHER_NODE,
  THUG_NODE,
  TINEYE_NODE,
  SOOTHER_NODE,
  RIOTER_NODE,
  SMOKER_NODE,
  SEEKER_NODE,

  // Mistborn path
  MISTBORN_AWAKENING_NODE,
  METAL_SYNERGY_NODE,
];

/**
 * The Allomancy skill tree.
 * Requires Allomancer bloodline to access.
 */
export const ALLOMANCY_SKILL_TREE: MagicSkillTree = {
  id: 'allomancy-tree',
  paradigmId: PARADIGM_ID,
  name: 'The Art of Allomancy',
  description: 'Burn metals to gain supernatural powers. Bloodline determines which metals you can burn.',
  lore: `Allomancy is genetic - you either have the blood, or you don't. Those with
Allomancer ancestry may be Mistings (one metal) or Mistborn (all metals).
But the power lies dormant until Snapping - a moment of intense trauma
that breaks the barriers and lets the power through.`,
  nodes: ALL_NODES,
  entryNodes: ['snapped'],
  connections: [], // Auto-generated from prerequisites
  xpSources: XP_SOURCES,
  rules: {
    ...createDefaultTreeRules(true), // Requires innate ability
    innateCondition: createUnlockCondition(
      'bloodline',
      { bloodlineId: 'allomancer' },
      'Must have Allomancer bloodline'
    ),
    allowRespec: false,
    permanentProgress: true,
  },
  version: 1,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get metals available to a Misting with specific bloodline.
 */
export function getMistingMetals(bloodlineStrength: number): string[] {
  if (bloodlineStrength >= 1.0) {
    // Full Mistborn - all metals
    return ALLOMANTIC_METALS.map(m => m.id);
  }

  // Mistings typically get one metal based on their bloodline
  // This would be determined by the specific bloodline type
  // For now, return basic metals for lower strength
  if (bloodlineStrength >= 0.5) {
    return [...METAL_TIERS.basic, ...METAL_TIERS.mental];
  } else if (bloodlineStrength >= 0.25) {
    return [...METAL_TIERS.basic];
  }
  return [];
}

/**
 * Check if a metal is available at a given bloodline strength.
 */
export function isMetalAvailable(metalId: string, bloodlineStrength: number): boolean {
  return getMistingMetals(bloodlineStrength).includes(metalId);
}
