/**
 * SympathySkillTree - Skill tree for the Sympathy paradigm
 *
 * Key mechanics:
 * - Alar (mental focus/belief) - the core skill
 * - Split focus - hold multiple bindings simultaneously
 * - Link types - different ways to connect objects
 * - Slippage reduction - energy loss in transfers
 * - Based on the principles: "Like affects like" and "Once together, always together"
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

const PARADIGM_ID = 'sympathy';

/** Link types in order of difficulty */
export const LINK_TYPES = [
  'identical',        // Same material - strongest
  'similar',          // Similar materials (iron to steel)
  'congruent',        // Same shape
  'once_together',    // Were once part of same thing
  'sympathetic',      // Symbolically related
  'antipathic',       // Opposite relationship
] as const;

/** Binding principles - types of energy that can be transferred */
export const BINDING_PRINCIPLES = [
  'heat_transfer',    // Move heat between objects
  'motion_transfer',  // Move kinetic energy
  'light_transfer',   // Move light/illumination
  'force_transfer',   // Move physical force
  'entropy_transfer', // Move decay/disorder
] as const;

// ============================================================================
// Foundation Nodes - Alar and Basic Sympathy
// ============================================================================

/** Entry node - basic mental focus */
const BASIC_ALAR_NODE = createSkillNode(
  'basic-alar',
  'Basic Alar',
  PARADIGM_ID,
  'foundation',
  0,
  50,
  [
    createSkillEffect('alar_strength', 1, {
      perLevelValue: 1,
      description: 'Mental focus strength for holding bindings',
    }),
  ],
  {
    description: 'Develop the basic mental focus needed for sympathy',
    lore: `Alar is the cornerstone of sympathy. It is the deep, true belief that something
IS something else. Not that it might be, or could be, but that it IS. This belief
must be held so firmly that reality itself bends to accommodate it.`,
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

/** Heart of stone - emotional control for stable alar */
const HEART_OF_STONE_NODE = createSkillNode(
  'heart-of-stone',
  'Heart of Stone',
  PARADIGM_ID,
  'foundation',
  1,
  100,
  [
    createSkillEffect('alar_strength', 2, {
      description: 'Alar unaffected by emotional state',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'emotional_suppression' },
      description: 'Can suppress emotions to maintain focus',
    }),
  ],
  {
    description: 'Learn to separate emotions from your alar',
    lore: 'A sympathist with a heart of stone can maintain bindings even under extreme duress.',
    prerequisites: ['basic-alar'],
  }
);

/** First binding */
const FIRST_BINDING_NODE = createSkillNode(
  'first-binding',
  'First Binding',
  PARADIGM_ID,
  'technique',
  1,
  75,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'create_binding' },
      description: 'Can create a sympathetic link between objects',
    }),
  ],
  {
    description: 'Learn to create your first sympathetic binding',
    prerequisites: ['basic-alar'],
  }
);

// ============================================================================
// Link Type Nodes
// ============================================================================

/**
 * Create a link type node.
 */
function createLinkTypeNode(
  linkType: string,
  tier: number,
  prerequisites: string[] = ['first-binding']
): MagicSkillNode {
  const displayName = linkType.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

  const descriptions: Record<string, string> = {
    identical: 'Same material - the strongest possible link',
    similar: 'Similar materials (iron to steel, oak to ash)',
    congruent: 'Objects of the same shape',
    once_together: 'Objects that were once part of the same whole',
    sympathetic: 'Symbolically related objects (blood to body)',
    antipathic: 'Opposite relationships - dangerous and powerful',
  };

  return createSkillNode(
    `link-${linkType}`,
    `${displayName} Link`,
    PARADIGM_ID,
    'technique',
    tier,
    50 + tier * 50,
    [
      createSkillEffect('unlock_ability', 1, {
        target: { abilityId: `link_${linkType}` },
        description: `Can create ${linkType} links`,
      }),
      createSkillEffect('link_strength', tier === 1 ? 10 : 5, {
        target: { abilityId: linkType },
        description: `Link efficiency for ${linkType} bindings`,
      }),
    ],
    {
      description: descriptions[linkType] ?? `Create ${displayName} links`,
      prerequisites,
      maxLevel: tier < 3 ? 3 : 1,
      levelCostMultiplier: 1.5,
    }
  );
}

// Link type nodes
const IDENTICAL_LINK_NODE = createLinkTypeNode('identical', 1);
const SIMILAR_LINK_NODE = createLinkTypeNode('similar', 2, ['link-identical']);
const CONGRUENT_LINK_NODE = createLinkTypeNode('congruent', 2, ['link-identical']);
const ONCE_TOGETHER_LINK_NODE = createLinkTypeNode('once_together', 3, ['link-similar']);
const SYMPATHETIC_LINK_NODE = createLinkTypeNode('sympathetic', 3, ['link-similar', 'link-congruent']);
const ANTIPATHIC_LINK_NODE = createLinkTypeNode('antipathic', 4, ['link-sympathetic']);

// ============================================================================
// Binding Principle Nodes
// ============================================================================

/**
 * Create a binding principle node.
 */
function createBindingPrincipleNode(
  principle: string,
  tier: number,
  prerequisites: string[] = ['first-binding']
): MagicSkillNode {
  const displayName = principle.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

  const descriptions: Record<string, string> = {
    heat_transfer: 'Move heat between linked objects',
    motion_transfer: 'Transfer kinetic energy between linked objects',
    light_transfer: 'Channel light between linked objects',
    force_transfer: 'Transfer physical force through links',
    entropy_transfer: 'Move decay and disorder between objects - extremely dangerous',
  };

  const risks: Record<string, string> = {
    heat_transfer: 'Binder fatigue from processing heat',
    motion_transfer: 'Physical feedback from sudden motion',
    light_transfer: 'Visual disorientation',
    force_transfer: 'Physical strain proportional to force',
    entropy_transfer: 'Accelerated aging, potential death',
  };

  return createSkillNode(
    `binding-${principle}`,
    `${displayName}`,
    PARADIGM_ID,
    'technique',
    tier,
    75 + tier * 50,
    [
      createSkillEffect('unlock_ability', 1, {
        target: { abilityId: principle },
        description: descriptions[principle],
      }),
    ],
    {
      description: descriptions[principle] ?? `Practice ${displayName}`,
      lore: risks[principle] ? `Risk: ${risks[principle]}` : undefined,
      prerequisites,
      maxLevel: 5,
      levelCostMultiplier: 1.5,
    }
  );
}

// Binding principle nodes
const HEAT_TRANSFER_NODE = createBindingPrincipleNode('heat_transfer', 1);
const MOTION_TRANSFER_NODE = createBindingPrincipleNode('motion_transfer', 2, ['binding-heat_transfer']);
const LIGHT_TRANSFER_NODE = createBindingPrincipleNode('light_transfer', 2, ['binding-heat_transfer']);
const FORCE_TRANSFER_NODE = createBindingPrincipleNode('force_transfer', 3, ['binding-motion_transfer']);
const ENTROPY_TRANSFER_NODE = createBindingPrincipleNode('entropy_transfer', 5, ['binding-force_transfer']);

// ============================================================================
// Split Focus Nodes
// ============================================================================

/** Dual binding */
const DUAL_BINDING_NODE = createSkillNode(
  'dual-binding',
  'Split Mind',
  PARADIGM_ID,
  'mastery',
  2,
  200,
  [
    createSkillEffect('alar_split', 1, {
      description: 'Can hold 2 bindings simultaneously',
    }),
  ],
  {
    description: 'Learn to split your mind and hold two bindings at once',
    prerequisites: ['heart-of-stone'],
    unlockConditions: [
      createUnlockCondition(
        'magic_proficiency',
        { techniqueId: 'control', proficiencyLevel: 3 },
        'Must have significant binding experience'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Triple binding */
const TRIPLE_BINDING_NODE = createSkillNode(
  'triple-binding',
  'Tripartite Mind',
  PARADIGM_ID,
  'mastery',
  3,
  350,
  [
    createSkillEffect('alar_split', 1, {
      description: 'Can hold 3 bindings simultaneously',
    }),
  ],
  {
    description: 'Split your focus three ways',
    prerequisites: ['dual-binding'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 1000 },
        'Requires extensive practice'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Quad binding */
const QUAD_BINDING_NODE = createSkillNode(
  'quad-binding',
  'Quaternary Mind',
  PARADIGM_ID,
  'mastery',
  4,
  500,
  [
    createSkillEffect('alar_split', 1, {
      description: 'Can hold 4 bindings simultaneously',
    }),
  ],
  {
    description: 'The rare talent of quadruple focus',
    prerequisites: ['triple-binding'],
    unlockConditions: [
      createUnlockCondition(
        'skill_level',
        { skillId: 'sympathy', skillLevel: 4 },
        'Requires near-mastery of sympathy'
      ),
    ],
    conditionMode: 'all',
  }
);

// ============================================================================
// Slippage and Efficiency Nodes
// ============================================================================

/** Slippage reduction */
const SLIPPAGE_CONTROL_NODE = createSkillNode(
  'slippage-control',
  'Slippage Control',
  PARADIGM_ID,
  'efficiency',
  2,
  150,
  [
    createSkillEffect('slippage_reduction', 5, {
      perLevelValue: 3,
      description: 'Reduce energy lost in transfers',
    }),
  ],
  {
    description: 'Reduce energy lost during sympathetic transfers',
    lore: 'Slippage is the bane of all sympathists - energy bleeds off during transfer, limiting what can be accomplished.',
    prerequisites: ['first-binding'],
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

/** Perfect link */
const PERFECT_LINK_NODE = createSkillNode(
  'perfect-link',
  'Perfect Link',
  PARADIGM_ID,
  'efficiency',
  4,
  400,
  [
    createSkillEffect('slippage_reduction', 20, {
      description: 'Near-zero slippage on identical links',
    }),
  ],
  {
    description: 'Create nearly perfect sympathetic links with minimal slippage',
    prerequisites: ['slippage-control', 'link-identical'],
    unlockConditions: [
      createUnlockCondition(
        'magic_proficiency',
        { techniqueId: 'control', proficiencyLevel: 5 },
        'Must be an expert binder'
      ),
    ],
    conditionMode: 'all',
  }
);

// ============================================================================
// Defensive Nodes
// ============================================================================

/** Break links */
const LINK_BREAKING_NODE = createSkillNode(
  'link-breaking',
  'Breaking Links',
  PARADIGM_ID,
  'technique',
  2,
  150,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'break_link' },
      description: 'Can break sympathetic links targeting you',
    }),
  ],
  {
    description: 'Learn to sense and break hostile sympathetic links',
    prerequisites: ['first-binding'],
  }
);

/** Alar defense */
const ALAR_DEFENSE_NODE = createSkillNode(
  'alar-defense',
  'Iron Will',
  PARADIGM_ID,
  'technique',
  3,
  250,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'alar_shield' },
      description: 'Can resist hostile bindings with pure will',
    }),
  ],
  {
    description: 'Use your alar to defend against sympathetic attacks',
    prerequisites: ['link-breaking', 'heart-of-stone'],
  }
);

// ============================================================================
// Advanced Nodes
// ============================================================================

/** Body binding - use yourself as link */
const BODY_BINDING_NODE = createSkillNode(
  'body-binding',
  'Body as Link',
  PARADIGM_ID,
  'mastery',
  3,
  300,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'body_link' },
      description: 'Can use your own body as part of a binding',
    }),
  ],
  {
    description: 'Learn to use your own body as a sympathetic link',
    lore: 'Dangerous but powerful - using blood, hair, or flesh as links creates extremely strong connections.',
    prerequisites: ['link-sympathetic'],
    unlockConditions: [
      createUnlockCondition(
        'trauma_experienced',
        { traumaType: 'sympathetic_accident' },
        'Must have experienced sympathetic feedback firsthand',
        { hidden: true }
      ),
    ],
    conditionMode: 'any', // Not required, but speeds learning
  }
);

/** Mommet creation */
const MOMMET_NODE = createSkillNode(
  'mommet',
  'Mommet Binding',
  PARADIGM_ID,
  'mastery',
  4,
  450,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'create_mommet' },
      description: 'Can create mommets for remote sympathetic work',
    }),
  ],
  {
    description: 'Learn to create mommets - sympathetic dolls for remote binding',
    lore: 'A mommet is a doll linked to a person through their blood, hair, or saliva. What is done to the mommet affects the person.',
    prerequisites: ['body-binding', 'link-once_together'],
    unlockConditions: [
      createUnlockCondition(
        'skill_level',
        { skillId: 'crafting', skillLevel: 2 },
        'Must have crafting skill to create mommets'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Bloodless binding - work without physical link */
const BLOODLESS_BINDING_NODE = createSkillNode(
  'bloodless-binding',
  'Bloodless Sympathy',
  PARADIGM_ID,
  'mastery',
  5,
  600,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'bloodless_link' },
      description: 'Can create bindings through pure alar without physical links',
    }),
  ],
  {
    description: 'The legendary skill of creating bindings through alar alone',
    lore: 'Only the greatest sympathists can create bindings without any physical connection - through sheer force of will.',
    prerequisites: ['perfect-link', 'quad-binding'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 3000 },
        'Requires years of dedicated practice'
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
    eventType: 'binding_created',
    xpAmount: 10,
    description: 'Create a sympathetic binding',
  },
  {
    eventType: 'binding_maintained',
    xpAmount: 5,
    description: 'Maintain a binding under stress',
  },
  {
    eventType: 'heat_transferred',
    xpAmount: 8,
    description: 'Transfer heat through binding',
  },
  {
    eventType: 'motion_transferred',
    xpAmount: 12,
    description: 'Transfer motion through binding',
  },
  {
    eventType: 'split_focus_success',
    xpAmount: 20,
    description: 'Successfully maintain multiple bindings',
  },
  {
    eventType: 'hostile_link_broken',
    xpAmount: 25,
    description: 'Break a hostile sympathetic link',
  },
  {
    eventType: 'slippage_minimized',
    xpAmount: 15,
    description: 'Complete a transfer with minimal slippage',
  },
  {
    eventType: 'sympathy_study',
    xpAmount: 5,
    description: 'Study sympathetic principles',
    conditions: [
      createUnlockCondition(
        'location_visited',
        { locationId: 'university' },
        'Must be at a place of learning'
      ),
    ],
  },
];

// ============================================================================
// Tree Assembly
// ============================================================================

const ALL_NODES: MagicSkillNode[] = [
  // Foundation
  BASIC_ALAR_NODE,
  HEART_OF_STONE_NODE,
  FIRST_BINDING_NODE,

  // Link types
  IDENTICAL_LINK_NODE,
  SIMILAR_LINK_NODE,
  CONGRUENT_LINK_NODE,
  ONCE_TOGETHER_LINK_NODE,
  SYMPATHETIC_LINK_NODE,
  ANTIPATHIC_LINK_NODE,

  // Binding principles
  HEAT_TRANSFER_NODE,
  MOTION_TRANSFER_NODE,
  LIGHT_TRANSFER_NODE,
  FORCE_TRANSFER_NODE,
  ENTROPY_TRANSFER_NODE,

  // Split focus
  DUAL_BINDING_NODE,
  TRIPLE_BINDING_NODE,
  QUAD_BINDING_NODE,

  // Efficiency
  SLIPPAGE_CONTROL_NODE,
  PERFECT_LINK_NODE,

  // Defense
  LINK_BREAKING_NODE,
  ALAR_DEFENSE_NODE,

  // Advanced
  BODY_BINDING_NODE,
  MOMMET_NODE,
  BLOODLESS_BINDING_NODE,
];

/**
 * The Sympathy skill tree.
 * Learned through study - no innate requirement.
 */
export const SYMPATHY_SKILL_TREE: MagicSkillTree = {
  id: 'sympathy-tree',
  paradigmId: PARADIGM_ID,
  name: 'The Art of Sympathy',
  description: 'Create links between objects based on similarity and shared history, allowing energy to flow between them.',
  lore: `Sympathy is based on two principles: Like affects like, and once together, always together.
Master your alar - your deep belief - and you can create links between objects that share
properties or history. Through these links, energy flows: heat, motion, force. But beware
slippage - energy is always lost in the transfer, and working too hard can burn you out.`,
  nodes: ALL_NODES,
  entryNodes: ['basic-alar'],
  connections: [], // Auto-generated from prerequisites
  xpSources: XP_SOURCES,
  rules: {
    ...createDefaultTreeRules(false), // Can be learned through study
    allowRespec: false,
    permanentProgress: true,
  },
  version: 1,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate link efficiency based on link type and skill level.
 */
export function calculateLinkEfficiency(
  linkType: string,
  nodeLevel: number
): number {
  const baseEfficiency: Record<string, number> = {
    identical: 0.9,      // 90% base efficiency
    similar: 0.7,        // 70% base
    congruent: 0.6,      // 60% base
    once_together: 0.5,  // 50% base
    sympathetic: 0.3,    // 30% base
    antipathic: 0.1,     // 10% base (but affects opposite)
  };

  const base = baseEfficiency[linkType] ?? 0.5;
  const levelBonus = nodeLevel * 0.02; // +2% per level
  return Math.min(0.99, base + levelBonus); // Cap at 99%
}

/**
 * Get maximum simultaneous bindings based on unlocked split-focus nodes.
 */
export function getMaxBindings(unlockedNodes: Record<string, number>): number {
  let max = 1; // Everyone can hold 1
  if (unlockedNodes['dual-binding']) max = 2;
  if (unlockedNodes['triple-binding']) max = 3;
  if (unlockedNodes['quad-binding']) max = 4;
  return max;
}

/**
 * Calculate slippage percentage based on nodes.
 */
export function calculateSlippage(
  baseSlippage: number,
  slippageControlLevel: number,
  hasPerfectLink: boolean,
  linkType: string
): number {
  let slippage = baseSlippage;

  // Slippage control reduces by 5% + 3% per level
  slippage -= slippageControlLevel * 0.03 + (slippageControlLevel > 0 ? 0.05 : 0);

  // Perfect link gives big bonus for identical links
  if (hasPerfectLink && linkType === 'identical') {
    slippage -= 0.2;
  }

  return Math.max(0.01, slippage); // Minimum 1% slippage
}
