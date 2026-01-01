/**
 * EchoSkillTree - Skill tree for the Echo paradigm
 *
 * Key mechanics:
 * - Memory Reading (access past events through residual echoes)
 * - Echo Replay (temporarily recreate past events)
 * - Temporal Imprinting (leave echoes for the future)
 * - Echo Absorption (consume memories for power)
 * - Ghost Creation (semi-permanent echoes of people)
 * - History Walking (enter the past as observer)
 *
 * Core concept:
 * - Every action leaves an echo
 * - The past reverberates into the present
 * - Memories are tangible and malleable
 *
 * Risks:
 * - Memory loss (cost of using echoes)
 * - Lost in the past
 * - Echo loops (trapped reliving moments)
 * - Identity confusion
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

const PARADIGM_ID = 'echo_magic';

/** Types of echoes that can be perceived/manipulated */
export const ECHO_TYPES = {
  emotional: 'Residual feelings from intense moments',
  physical: 'Imprints of actions and movements',
  verbal: 'Spoken words that still resonate',
  visual: 'Images burned into reality',
  personal: 'The essence of a person\'s presence',
  traumatic: 'Powerful events that scar spacetime',
  collective: 'Mass memories shared by many',
} as const;

/** Time periods for echo access */
export const TIME_DEPTHS = {
  recent: 'Hours to days',
  short: 'Days to weeks',
  medium: 'Weeks to months',
  long: 'Months to years',
  ancient: 'Years to decades',
  historical: 'Decades to centuries',
  primordial: 'Centuries to eons',
} as const;

/** Echo clarity levels */
export const ECHO_CLARITY = {
  faint: 'Vague impressions',
  weak: 'Blurry and fragmented',
  moderate: 'Clear but incomplete',
  strong: 'Nearly complete recall',
  vivid: 'Perfect recreation',
  overwhelming: 'Too real to distinguish from present',
} as const;

// ============================================================================
// Foundation Nodes - Echo Awareness
// ============================================================================

const ECHO_SENSE_NODE = createSkillNode(
  'echo-sense',
  'Echo Sense',
  PARADIGM_ID,
  'foundation',
  0,
  25,
  [
    createSkillEffect('perception', 10, {
      description: 'Sense residual echoes of past events',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'echo_detection' },
      description: 'Detect the presence of echoes',
    }),
  ],
  {
    description: 'Learn to sense echoes of the past',
    lore: `The past doesn't simply vanish. It echoes. Strong emotions,
significant events, powerful words - they leave traces.
Learn to hear these whispers of what was.`,
    maxLevel: 3,
    levelCostMultiplier: 1.3,
    icon: '👂',
  }
);

const MEMORY_ANCHOR_NODE = createSkillNode(
  'memory-anchor',
  'Memory Anchor',
  PARADIGM_ID,
  'foundation',
  0,
  30,
  [
    createSkillEffect('defense', 10, {
      perLevelValue: 5,
      description: 'Resistance to memory loss',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'anchor_memory' },
      description: 'Anchor important memories against loss',
    }),
  ],
  {
    description: 'Learn to protect your own memories',
    lore: `Echo magic costs memories. Your own past pays for accessing others'.
Learn to anchor your essential memories - who you are, what you love.
Without anchors, echo mages eventually forget themselves.`,
    maxLevel: 5,
    levelCostMultiplier: 1.4,
    icon: '⚓',
  }
);

const RESONANCE_NODE = createSkillNode(
  'resonance',
  'Resonance',
  PARADIGM_ID,
  'foundation',
  0,
  25,
  [
    createSkillEffect('paradigm_proficiency', 5, {
      perLevelValue: 3,
      description: 'Bonus to echo magic',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'resonate' },
      description: 'Resonate with nearby echoes',
    }),
  ],
  {
    description: 'Learn to resonate with echoes',
    lore: `Echoes respond to resonance. Match their frequency and they open.
Your emotional state, your focus, your intent - tune these
to the echo you seek.`,
    maxLevel: 5,
    levelCostMultiplier: 1.3,
    icon: '🔊',
  }
);

// ============================================================================
// Echo Reading Nodes
// ============================================================================

const READ_RECENT_NODE = createSkillNode(
  'read-recent',
  'Read Recent Echoes',
  PARADIGM_ID,
  'technique',
  1,
  40,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'read_recent_echo' },
      description: 'Read echoes from hours to days ago',
    }),
  ],
  {
    description: 'Learn to read recent echoes',
    lore: `Fresh echoes are easiest. The argument that just happened.
The violence from yesterday. The love declared this morning.
These echoes practically shout their presence.`,
    prerequisites: ['echo-sense'],
    icon: '📖',
  }
);

const READ_DEEP_NODE = createSkillNode(
  'read-deep',
  'Read Deep Echoes',
  PARADIGM_ID,
  'technique',
  2,
  80,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'read_deep_echo' },
      description: 'Read echoes from months to years ago',
    }),
  ],
  {
    description: 'Learn to read older echoes',
    lore: `Deeper echoes require more effort. They've faded, blurred,
been overwritten by newer events. But the strongest persist -
murders, births, declarations of war, vows of love.`,
    prerequisites: ['read-recent'],
    maxLevel: 3,
    levelCostMultiplier: 1.5,
    icon: '📚',
  }
);

const READ_ANCIENT_NODE = createSkillNode(
  'read-ancient',
  'Read Ancient Echoes',
  PARADIGM_ID,
  'technique',
  3,
  130,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'read_ancient_echo' },
      description: 'Read echoes from decades to centuries ago',
    }),
  ],
  {
    description: 'Learn to read ancient echoes',
    lore: `The oldest echoes are the hardest to reach but often the most powerful.
Historic events. Legendary figures. The founding of empires.
These echoes have weight that modern moments lack.`,
    prerequisites: ['read-deep'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 400 },
        'Requires 400 total XP in Echo magic'
      ),
    ],
    conditionMode: 'all',
    icon: '📜',
  }
);

// ============================================================================
// Echo Manipulation Nodes
// ============================================================================

const ECHO_REPLAY_NODE = createSkillNode(
  'echo-replay',
  'Echo Replay',
  PARADIGM_ID,
  'technique',
  2,
  90,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'replay_echo' },
      description: 'Replay echoes as visible/audible phantasms',
    }),
  ],
  {
    description: 'Learn to replay echoes for others to witness',
    lore: `Make the past visible again. The ghostly images of what was,
playing out for all to see. Courts use this to show crimes.
Historians use it to verify accounts. Lovers use it to relive joy.`,
    prerequisites: ['read-recent', 'resonance'],
    icon: '▶️',
  }
);

const ECHO_IMPRINT_NODE = createSkillNode(
  'echo-imprint',
  'Echo Imprint',
  PARADIGM_ID,
  'technique',
  2,
  75,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'imprint_echo' },
      description: 'Leave intentional echoes for future discovery',
    }),
  ],
  {
    description: 'Learn to leave intentional echoes',
    lore: `Most echoes are accidental. But you can create them deliberately.
Leave a message for the future. Mark a location. Store a memory
outside your head where it will persist.`,
    prerequisites: ['resonance'],
    icon: '💾',
  }
);

const ECHO_ABSORPTION_NODE = createSkillNode(
  'echo-absorption',
  'Echo Absorption',
  PARADIGM_ID,
  'technique',
  3,
  120,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'absorb_echo' },
      description: 'Absorb echoes for power',
    }),
    createSkillEffect('resource_regen', 10, {
      description: 'Regenerate power from absorbed echoes',
    }),
  ],
  {
    description: 'Learn to absorb echoes for power',
    lore: `Echoes contain energy. Consume them and that energy becomes yours.
But consumed echoes are gone forever - erased from history's record.
Some things should be remembered. Choose carefully.`,
    prerequisites: ['echo-replay'],
    icon: '🌀',
  }
);

// ============================================================================
// Ghost Creation Nodes
// ============================================================================

const ECHO_GHOST_NODE = createSkillNode(
  'echo-ghost',
  'Echo Ghost',
  PARADIGM_ID,
  'specialization',
  3,
  140,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'create_ghost' },
      description: 'Create semi-permanent echoes of people',
    }),
  ],
  {
    description: 'Learn to create echo ghosts',
    lore: `Strong enough echoes of a person can take on a life of their own.
Not the person - never that - but a shadow, a reflection.
They remember, they speak, but they are not alive.`,
    prerequisites: ['echo-replay', 'read-deep'],
    icon: '👻',
  }
);

const GHOST_BINDING_NODE = createSkillNode(
  'ghost-binding',
  'Ghost Binding',
  PARADIGM_ID,
  'specialization',
  4,
  180,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'bind_ghost' },
      description: 'Bind echo ghosts to your service',
    }),
  ],
  {
    description: 'Learn to bind echo ghosts',
    lore: `An echo ghost can be bound - made to serve, to guard, to inform.
They retain the skills and knowledge of their originals.
Bind a dead scholar and gain access to their expertise.`,
    prerequisites: ['echo-ghost'],
    unlockConditions: [
      createUnlockCondition(
        'nodes_unlocked',
        { nodesRequired: 8 },
        'Requires 8 nodes unlocked'
      ),
    ],
    conditionMode: 'all',
    icon: '⛓️',
  }
);

// ============================================================================
// History Walking Nodes
// ============================================================================

const HISTORY_GLIMPSE_NODE = createSkillNode(
  'history-glimpse',
  'History Glimpse',
  PARADIGM_ID,
  'technique',
  2,
  85,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'glimpse_history' },
      description: 'See brief flashes of historical events',
    }),
  ],
  {
    description: 'Learn to glimpse historical moments',
    lore: `More than reading echoes - actually seeing. Brief flashes,
like photographs from the past. Stand where battles were fought
and see the moment a king fell.`,
    prerequisites: ['echo-replay', 'read-deep'],
    icon: '👁️',
  }
);

const HISTORY_WALK_NODE = createSkillNode(
  'history-walk',
  'History Walk',
  PARADIGM_ID,
  'mastery',
  4,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'walk_history' },
      description: 'Enter the past as an invisible observer',
    }),
  ],
  {
    description: 'Learn to walk through history',
    lore: `Enter the echo itself. Walk through the past, invisible and intangible.
Watch history unfold around you. You cannot change anything -
you are a ghost to ghosts. But you can witness everything.`,
    prerequisites: ['history-glimpse', 'read-ancient'],
    icon: '🚶',
  }
);

// ============================================================================
// Echo Loop Nodes
// ============================================================================

const ECHO_LOOP_NODE = createSkillNode(
  'echo-loop',
  'Echo Loop',
  PARADIGM_ID,
  'specialization',
  3,
  110,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'create_loop' },
      description: 'Create repeating echo loops',
    }),
  ],
  {
    description: 'Learn to create echo loops',
    lore: `An echo that repeats forever. Trap someone in reliving a moment,
or create a guardian that resets and repeats its patrol eternally.
Loops are stable but can be broken.`,
    prerequisites: ['echo-replay', 'echo-imprint'],
    icon: '🔁',
  }
);

const LOOP_TRAP_NODE = createSkillNode(
  'loop-trap',
  'Loop Trap',
  PARADIGM_ID,
  'technique',
  4,
  160,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'trap_in_loop' },
      description: 'Trap targets in echo loops',
    }),
  ],
  {
    description: 'Learn to trap others in echo loops',
    lore: `The cruelest prison: reliving the same moment forever.
Time passes outside while the trapped live the same heartbeat
over and over. Some call it merciful. Others, torture.`,
    prerequisites: ['echo-loop'],
    icon: '🔒',
  }
);

// ============================================================================
// Mastery Nodes
// ============================================================================

const ECHO_MASTER_NODE = createSkillNode(
  'echo-master',
  'Echo Master',
  PARADIGM_ID,
  'mastery',
  4,
  200,
  [
    createSkillEffect('paradigm_proficiency', 30, {
      description: 'Master of echo magic',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'echo_mastery' },
      description: 'Full control over echoes',
    }),
  ],
  {
    description: 'Achieve mastery over echo magic',
    lore: `You have walked so long in the past that you belong to both times.
Echoes speak to you freely. The past is your library,
every moment accessible, every memory available.`,
    prerequisites: ['history-walk', 'ghost-binding'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 800 },
        'Requires 800 total XP in Echo magic'
      ),
    ],
    conditionMode: 'all',
    icon: '👑',
  }
);

const LIVING_ECHO_NODE = createSkillNode(
  'living-echo',
  'Living Echo',
  PARADIGM_ID,
  'mastery',
  5,
  300,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'become_echo' },
      description: 'Transform into an echo yourself',
    }),
    createSkillEffect('paradigm_proficiency', 50, {
      description: 'Supreme echo mastery',
    }),
  ],
  {
    description: 'Become a living echo',
    lore: `The ultimate echo magic: transform yourself into an echo.
You exist outside time, impossible to truly kill (you've already happened),
able to manifest in any moment where you left a trace.`,
    prerequisites: ['echo-master', 'loop-trap'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 1200 },
        'Requires 1200 total XP in Echo magic'
      ),
    ],
    conditionMode: 'all',
    icon: '🌟',
  }
);

// ============================================================================
// Collect All Nodes
// ============================================================================

const ALL_NODES: MagicSkillNode[] = [
  // Foundation
  ECHO_SENSE_NODE,
  MEMORY_ANCHOR_NODE,
  RESONANCE_NODE,
  // Reading
  READ_RECENT_NODE,
  READ_DEEP_NODE,
  READ_ANCIENT_NODE,
  // Manipulation
  ECHO_REPLAY_NODE,
  ECHO_IMPRINT_NODE,
  ECHO_ABSORPTION_NODE,
  // Ghosts
  ECHO_GHOST_NODE,
  GHOST_BINDING_NODE,
  // History
  HISTORY_GLIMPSE_NODE,
  HISTORY_WALK_NODE,
  // Loops
  ECHO_LOOP_NODE,
  LOOP_TRAP_NODE,
  // Mastery
  ECHO_MASTER_NODE,
  LIVING_ECHO_NODE,
];

// ============================================================================
// XP Sources
// ============================================================================

const XP_SOURCES: MagicXPSource[] = [
  {
    eventType: 'echo_read',
    xpAmount: 10,
    description: 'Read an echo of the past',
    qualityMultiplier: true,
  },
  {
    eventType: 'echo_replayed',
    xpAmount: 12,
    description: 'Replay an echo for others',
  },
  {
    eventType: 'echo_imprinted',
    xpAmount: 15,
    description: 'Leave an intentional echo',
  },
  {
    eventType: 'ghost_created',
    xpAmount: 25,
    description: 'Create an echo ghost',
  },
  {
    eventType: 'history_glimpsed',
    xpAmount: 20,
    description: 'Glimpse a historical moment',
  },
  {
    eventType: 'memory_protected',
    xpAmount: 5,
    description: 'Successfully anchor a memory',
  },
];

// ============================================================================
// Tree Definition
// ============================================================================

export const ECHO_SKILL_TREE: MagicSkillTree = {
  id: 'echo_skill_tree',
  paradigmId: PARADIGM_ID,
  name: 'Echo Magic Skill Tree',
  description: 'Master the art of reading, manipulating, and becoming echoes of the past',
  lore: `Every action leaves an echo. Every word spoken still vibrates somewhere.
Echo mages hear the past and can replay it, reshape it, even step into it.
But the past pulls at you. Spend too long in echoes and you become one.`,
  nodes: ALL_NODES,
  entryNodes: ['echo-sense', 'memory-anchor', 'resonance'],
  connections: ALL_NODES.flatMap(node =>
    (node.prerequisites ?? []).map(prereq => ({ from: prereq, to: node.id }))
  ),
  xpSources: XP_SOURCES,
  rules: {
    ...createDefaultTreeRules(false),
    permanentProgress: true,
  },
  version: 1,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate echo clarity based on age and power.
 */
export function getEchoClarity(ageInDays: number, power: number): keyof typeof ECHO_CLARITY {
  const baseClarity = power / 10;
  const agePenalty = Math.log10(ageInDays + 1) * 2;
  const clarity = baseClarity - agePenalty;

  if (clarity >= 10) return 'overwhelming';
  if (clarity >= 8) return 'vivid';
  if (clarity >= 5) return 'strong';
  if (clarity >= 3) return 'moderate';
  if (clarity >= 1) return 'weak';
  return 'faint';
}

/**
 * Get accessible time depth based on unlocked nodes.
 */
export function getAccessibleTimeDepth(unlockedNodes: Set<string>): keyof typeof TIME_DEPTHS {
  if (unlockedNodes.has('living-echo')) return 'primordial';
  if (unlockedNodes.has('read-ancient')) return 'historical';
  if (unlockedNodes.has('read-deep')) return 'ancient';
  if (unlockedNodes.has('read-recent')) return 'long';
  return 'recent';
}

/**
 * Calculate memory cost for echo operations.
 */
export function calculateMemoryCost(
  echoType: keyof typeof ECHO_TYPES,
  ageInDays: number,
  unlockedNodes: Set<string>,
  anchorLevel: number
): number {
  const baseCosts: Record<keyof typeof ECHO_TYPES, number> = {
    emotional: 5,
    physical: 3,
    verbal: 2,
    visual: 4,
    personal: 8,
    traumatic: 10,
    collective: 15,
  };

  let cost = baseCosts[echoType];
  cost *= Math.log10(ageInDays + 1); // Age multiplier

  // Anchor reduces cost
  if (unlockedNodes.has('memory-anchor')) {
    cost *= (1 - anchorLevel * 0.1);
  }

  return Math.max(Math.floor(cost), 1);
}

/**
 * Get available echo types based on unlocked nodes.
 */
export function getAvailableEchoTypes(unlockedNodes: Set<string>): string[] {
  const types = ['emotional', 'physical', 'verbal', 'visual'];
  if (unlockedNodes.has('echo-ghost')) types.push('personal');
  if (unlockedNodes.has('read-deep')) types.push('traumatic');
  if (unlockedNodes.has('history-walk')) types.push('collective');
  return types;
}
