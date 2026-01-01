/**
 * BureaucraticSkillTree - Skill tree for the Bureaucratic paradigm
 *
 * Key mechanics:
 * - Form Filing (correct paperwork creates magical effects)
 * - Stamp Authority (official stamps have binding power)
 * - Red Tape (procedural delays as defense/offense)
 * - Appeals (challenge and override decisions)
 * - Audit (magical investigation and truth-finding)
 * - Notarization (making things officially real)
 *
 * Time-gated abilities:
 * - Business hours provide power bonuses
 * - End of fiscal quarter increases potency
 * - Processing delays are part of the magic
 *
 * Risks:
 * - Form rejection (spell fizzle)
 * - Audit consequences (magical investigation)
 * - Bureaucratic paradox (conflicting forms)
 * - Eternal filing (stuck in paperwork)
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

const PARADIGM_ID = 'bureaucratic_magic';

/** Types of magical forms */
export const FORM_TYPES = {
  requisition: 'Request resources or effects',
  petition: 'Ask for rule exceptions',
  declaration: 'State something into truth',
  registration: 'Make something officially exist',
  deregistration: 'Make something officially not exist',
  appeal: 'Challenge a previous decision',
  certification: 'Validate something as true',
  authorization: 'Grant permission for actions',
} as const;

/** Types of official stamps */
export const STAMP_TYPES = {
  approved: 'Confirms and activates forms',
  denied: 'Rejects and nullifies forms',
  pending: 'Delays and suspends effects',
  urgent: 'Speeds up processing',
  classified: 'Hides information',
  notarized: 'Makes binding and permanent',
  void: 'Cancels and reverses',
  duplicate: 'Copies effects',
} as const;

/** Bureaucratic ranks that affect power */
export const BUREAUCRATIC_RANKS = {
  intern: 'Unpaid labor, minimal authority',
  clerk: 'Basic filing privileges',
  administrator: 'Can approve minor forms',
  manager: 'Can stamp with authority',
  director: 'Can create new form types',
  commissioner: 'Can audit other bureaucrats',
  secretary: 'Cabinet-level magic',
  chancellor: 'Supreme bureaucratic authority',
} as const;

// ============================================================================
// Foundation Nodes - Basic Paperwork
// ============================================================================

const BASIC_FILING_NODE = createSkillNode(
  'basic-filing',
  'Basic Filing',
  PARADIGM_ID,
  'foundation',
  0,
  25,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Can create and file simple forms',
      target: { abilityId: 'form_creation' },
    }),
  ],
  {
    description: 'Learn to create properly formatted magical forms',
    lore: `Form 1-A: Application for Magical Effect. Fill out in triplicate.
Use black ink only. Sign and date. Submit to appropriate department.
Processing time: 3-5 business days. Magic begins upon approval.`,
    maxLevel: 3,
    levelCostMultiplier: 1.3,
    icon: '📋',
  }
);

const RUBBER_STAMP_NODE = createSkillNode(
  'rubber-stamp',
  'Rubber Stamp',
  PARADIGM_ID,
  'foundation',
  0,
  30,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Can stamp forms with basic approval',
      target: { abilityId: 'stamp_basic' },
    }),
  ],
  {
    description: 'Learn to use official stamps to activate forms',
    lore: `The stamp is mightier than the sword. APPROVED. DENIED. PENDING.
Each impression carries the weight of the institution behind it.
Handle with care; stamps cannot be unstamped.`,
    icon: '🔴',
  }
);

const INK_AND_PAPER_NODE = createSkillNode(
  'ink-and-paper',
  'Ink and Paper Attunement',
  PARADIGM_ID,
  'foundation',
  0,
  20,
  [
    createSkillEffect('paradigm_proficiency', 5, {
      perLevelValue: 3,
      description: 'Bonus to all bureaucratic magic',
    }),
  ],
  {
    description: 'Develop an affinity for office supplies',
    lore: `The paper knows its purpose. The ink remembers what it writes.
True bureaucrats can feel when a form is improperly filled,
when a stamp is missing, when a signature is forged.`,
    maxLevel: 5,
    levelCostMultiplier: 1.4,
    icon: '🖋️',
  }
);

// ============================================================================
// Technique Nodes - Form Types
// ============================================================================

const REQUISITION_FORMS_NODE = createSkillNode(
  'requisition-forms',
  'Requisition Forms',
  PARADIGM_ID,
  'technique',
  1,
  50,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'requisition' },
      description: 'Request resources through proper channels',
    }),
  ],
  {
    description: 'Learn to requisition resources through paperwork',
    lore: `Need supplies? File Form R-7. Need equipment? Form R-12.
Need a small miracle? Form R-99 with supervisor signature.
Proper requisition is proper magic.`,
    prerequisites: ['basic-filing'],
    icon: '📦',
  }
);

const PETITION_FORMS_NODE = createSkillNode(
  'petition-forms',
  'Petition Forms',
  PARADIGM_ID,
  'technique',
  1,
  50,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'petition' },
      description: 'Petition for exceptions to rules',
    }),
  ],
  {
    description: 'Learn to petition for rule exceptions',
    lore: `The rules say no. But Form P-1 says "unless."
A well-crafted petition can bend any regulation,
find loopholes in any law, exceptions to any policy.`,
    prerequisites: ['basic-filing'],
    icon: '📜',
  }
);

const DECLARATION_FORMS_NODE = createSkillNode(
  'declaration-forms',
  'Declaration Forms',
  PARADIGM_ID,
  'technique',
  2,
  80,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'declaration' },
      description: 'Declare something to be officially true',
    }),
  ],
  {
    description: 'Learn to declare things into truth',
    lore: `Form D-1: Declaration of Fact. When properly filed and approved,
the declaration becomes true. "I hereby declare this object to be invisible."
Reality updates its records accordingly.`,
    prerequisites: ['petition-forms'],
    unlockConditions: [
      createUnlockCondition(
        'skill_level',
        { skillId: 'bureaucracy', skillLevel: 3 },
        'Requires Bureaucracy skill level 3'
      ),
    ],
    conditionMode: 'all',
    icon: '📢',
  }
);

const REGISTRATION_FORMS_NODE = createSkillNode(
  'registration-forms',
  'Registration Forms',
  PARADIGM_ID,
  'technique',
  2,
  80,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'registration' },
      description: 'Register entities into official existence',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'deregistration' },
      description: 'Remove entities from official records',
    }),
  ],
  {
    description: 'Learn to register and deregister official existence',
    lore: `If it's not in the records, it doesn't exist. Form REG-1 creates
official existence. Form DEREG-1 removes it. Deregistered entities
become invisible to bureaucratic systems. They might still exist, but
as far as paperwork is concerned, they never did.`,
    prerequisites: ['requisition-forms'],
    icon: '📝',
  }
);

// ============================================================================
// Stamp Mastery Nodes
// ============================================================================

const STAMP_AUTHORITY_NODE = createSkillNode(
  'stamp-authority',
  'Stamp Authority',
  PARADIGM_ID,
  'specialization',
  1,
  60,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'stamp_approved' },
      description: 'APPROVED stamp activates forms',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'stamp_denied' },
      description: 'DENIED stamp nullifies forms',
    }),
  ],
  {
    description: 'Learn to use stamps with binding authority',
    lore: `Your stamps now carry weight. APPROVED makes things happen.
DENIED makes them unhappen. The institution recognizes your authority.`,
    prerequisites: ['rubber-stamp'],
    icon: '✅',
  }
);

const PENDING_STAMP_NODE = createSkillNode(
  'pending-stamp',
  'Pending Stamp',
  PARADIGM_ID,
  'specialization',
  2,
  70,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'stamp_pending' },
      description: 'PENDING stamp suspends effects in time',
    }),
  ],
  {
    description: 'Learn to freeze effects in pending status',
    lore: `PENDING: the most powerful stamp. Effects freeze mid-execution.
Time stops for the stamped form. Spells wait eternally for approval
that may never come. Some say the pending pile is a dimension unto itself.`,
    prerequisites: ['stamp-authority'],
    icon: '⏳',
  }
);

const URGENT_STAMP_NODE = createSkillNode(
  'urgent-stamp',
  'Urgent Stamp',
  PARADIGM_ID,
  'specialization',
  2,
  70,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'stamp_urgent' },
      description: 'URGENT stamp speeds processing dramatically',
    }),
  ],
  {
    description: 'Learn to mark forms for urgent processing',
    lore: `URGENT bypasses the queue. URGENT demands immediate attention.
URGENT makes bureaucracy move at the speed of panic.
Use sparingly - if everything is urgent, nothing is.`,
    prerequisites: ['stamp-authority'],
    icon: '🚨',
  }
);

const NOTARIZED_STAMP_NODE = createSkillNode(
  'notarized-stamp',
  'Notarized Stamp',
  PARADIGM_ID,
  'specialization',
  3,
  100,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'stamp_notarized' },
      description: 'NOTARIZED stamp makes effects permanent and binding',
    }),
  ],
  {
    description: 'Learn to notarize for permanent, binding effects',
    lore: `The notarized stamp is sacred. What is notarized cannot be un-notarized.
It becomes part of the permanent record, woven into the fabric of bureaucracy.
Even gods must file appeals to change a notarized document.`,
    prerequisites: ['pending-stamp', 'urgent-stamp'],
    unlockConditions: [
      createUnlockCondition(
        'nodes_unlocked',
        { nodesRequired: 6 },
        'Requires 6 nodes unlocked'
      ),
    ],
    conditionMode: 'all',
    icon: '⚖️',
  }
);

// ============================================================================
// Red Tape Nodes
// ============================================================================

const RED_TAPE_DEFENSE_NODE = createSkillNode(
  'red-tape-defense',
  'Red Tape Defense',
  PARADIGM_ID,
  'technique',
  2,
  75,
  [
    createSkillEffect('defense', 10, {
      perLevelValue: 5,
      description: 'Procedural barriers block attacks',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'red_tape_barrier' },
      description: 'Create barriers of procedural requirements',
    }),
  ],
  {
    description: 'Use bureaucratic procedures as magical defense',
    lore: `"Before you can harm me, please fill out Form A-1, Attack Declaration.
Then submit Form V-3, Victim Notification, in triplicate. Don't forget
Form I-7, Intent to Cause Harm. Processing time: 4-6 weeks."`,
    prerequisites: ['basic-filing', 'rubber-stamp'],
    maxLevel: 3,
    levelCostMultiplier: 1.5,
    icon: '🚧',
  }
);

const APPEAL_PROCESS_NODE = createSkillNode(
  'appeal-process',
  'Appeal Process',
  PARADIGM_ID,
  'technique',
  3,
  100,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'file_appeal' },
      description: 'Challenge any magical decision',
    }),
  ],
  {
    description: 'Learn to file appeals against magical effects',
    lore: `Any decision can be appealed. Form AP-1 challenges the ruling.
Form AP-2 escalates to higher authority. Form AP-FINAL goes to
the Supreme Bureaucratic Court, where reality itself is on trial.`,
    prerequisites: ['declaration-forms'],
    icon: '⚔️',
  }
);

const AUDIT_POWERS_NODE = createSkillNode(
  'audit-powers',
  'Audit Powers',
  PARADIGM_ID,
  'technique',
  3,
  120,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'magical_audit' },
      description: 'Audit magical effects and expose irregularities',
    }),
    createSkillEffect('perception', 10, {
      description: 'Can detect forged forms and improper stamps',
    }),
  ],
  {
    description: 'Gain the power to audit magical operations',
    lore: `The Audit reveals all. Every spell must be accounted for.
Every magical effect traced to its source form. The auditor sees
discrepancies, catches fraudulent filings, exposes magical malfeasance.`,
    prerequisites: ['registration-forms'],
    unlockConditions: [
      createUnlockCondition(
        'skill_level',
        { skillId: 'bureaucracy', skillLevel: 5 },
        'Requires Bureaucracy skill level 5'
      ),
    ],
    conditionMode: 'all',
    icon: '🔍',
  }
);

// ============================================================================
// Rank Advancement Nodes
// ============================================================================

const CLERK_RANK_NODE = createSkillNode(
  'clerk-rank',
  'Clerk Certification',
  PARADIGM_ID,
  'relationship',
  1,
  40,
  [
    createSkillEffect('paradigm_proficiency', 10, {
      description: 'Recognized clerk status',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'filing_cabinet_access' },
      description: 'Access to standard filing cabinets',
    }),
  ],
  {
    description: 'Achieve official clerk status',
    lore: `Welcome to the department. Here is your desk, your stamps, your forms.
Filing hours are 9 to 5. Lunch is 30 minutes. Don't make waves.`,
    prerequisites: ['basic-filing'],
    icon: '👔',
  }
);

const ADMINISTRATOR_RANK_NODE = createSkillNode(
  'administrator-rank',
  'Administrator Certification',
  PARADIGM_ID,
  'relationship',
  2,
  80,
  [
    createSkillEffect('paradigm_proficiency', 15, {
      description: 'Administrator privileges',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'approve_minor_forms' },
      description: 'Can approve forms without supervisor',
    }),
  ],
  {
    description: 'Achieve administrator status',
    lore: `You have proven your dedication to proper procedure. You may now
approve minor forms without supervisor signature. Your stamp carries
institutional weight. Use it responsibly.`,
    prerequisites: ['clerk-rank', 'stamp-authority'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 300 },
        'Requires 300 total XP in Bureaucratic magic'
      ),
    ],
    conditionMode: 'all',
    icon: '💼',
  }
);

const DIRECTOR_RANK_NODE = createSkillNode(
  'director-rank',
  'Director Certification',
  PARADIGM_ID,
  'relationship',
  3,
  150,
  [
    createSkillEffect('paradigm_proficiency', 25, {
      description: 'Director privileges',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'create_form_types' },
      description: 'Can create new form types',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'department_access' },
      description: 'Full department access',
    }),
  ],
  {
    description: 'Achieve director status',
    lore: `You now direct the flow of paperwork. You create forms, not just fill them.
Your department bends to your will. Other bureaucrats defer to your authority.
The power of middle management is yours.`,
    prerequisites: ['administrator-rank', 'notarized-stamp'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 600 },
        'Requires 600 total XP in Bureaucratic magic'
      ),
    ],
    conditionMode: 'all',
    icon: '🏢',
  }
);

// ============================================================================
// Mastery Nodes
// ============================================================================

const BUREAUCRATIC_PARADOX_NODE = createSkillNode(
  'bureaucratic-paradox',
  'Bureaucratic Paradox',
  PARADIGM_ID,
  'mastery',
  4,
  200,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'paradox_form' },
      description: 'Create self-referential paradoxical forms',
    }),
  ],
  {
    description: 'Master the art of bureaucratic paradox',
    lore: `"This form is only valid if it has not been filed. Filing this form
invalidates it." The paradox crashes reality's bureaucratic system.
In the confusion, anything becomes possible.`,
    prerequisites: ['director-rank'],
    unlockConditions: [
      createUnlockCondition(
        'nodes_unlocked',
        { nodesRequired: 10 },
        'Requires 10 nodes unlocked'
      ),
    ],
    conditionMode: 'all',
    icon: '🔄',
  }
);

const ETERNAL_PENDING_NODE = createSkillNode(
  'eternal-pending',
  'Eternal Pending',
  PARADIGM_ID,
  'mastery',
  4,
  180,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'eternal_pending' },
      description: 'Trap effects in permanent pending status',
    }),
  ],
  {
    description: 'Master the eternal pending state',
    lore: `The pending pile grows. Items enter but never leave.
Some forms have been pending since the beginning of time.
Master this, and you can trap anything in eternal bureaucratic limbo.`,
    prerequisites: ['pending-stamp', 'director-rank'],
    icon: '♾️',
  }
);

const SUPREME_CHANCELLOR_NODE = createSkillNode(
  'supreme-chancellor',
  'Supreme Chancellor',
  PARADIGM_ID,
  'mastery',
  5,
  300,
  [
    createSkillEffect('paradigm_proficiency', 50, {
      description: 'Supreme bureaucratic authority',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'reality_memo' },
      description: 'Issue memos that reshape reality',
    }),
  ],
  {
    description: 'Achieve supreme bureaucratic power',
    lore: `At the height of bureaucratic power, your memos reshape reality.
"Per policy update 2024-001, gravity shall be reduced by 50%."
When you speak through proper channels, the universe complies.`,
    prerequisites: ['bureaucratic-paradox', 'eternal-pending'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 1000 },
        'Requires 1000 total XP in Bureaucratic magic'
      ),
    ],
    conditionMode: 'all',
    icon: '👑',
  }
);

// ============================================================================
// Collect All Nodes
// ============================================================================

const ALL_NODES: MagicSkillNode[] = [
  // Foundation
  BASIC_FILING_NODE,
  RUBBER_STAMP_NODE,
  INK_AND_PAPER_NODE,
  // Technique - Forms
  REQUISITION_FORMS_NODE,
  PETITION_FORMS_NODE,
  DECLARATION_FORMS_NODE,
  REGISTRATION_FORMS_NODE,
  // Stamps
  STAMP_AUTHORITY_NODE,
  PENDING_STAMP_NODE,
  URGENT_STAMP_NODE,
  NOTARIZED_STAMP_NODE,
  // Red Tape
  RED_TAPE_DEFENSE_NODE,
  APPEAL_PROCESS_NODE,
  AUDIT_POWERS_NODE,
  // Ranks
  CLERK_RANK_NODE,
  ADMINISTRATOR_RANK_NODE,
  DIRECTOR_RANK_NODE,
  // Mastery
  BUREAUCRATIC_PARADOX_NODE,
  ETERNAL_PENDING_NODE,
  SUPREME_CHANCELLOR_NODE,
];

// ============================================================================
// XP Sources
// ============================================================================

const XP_SOURCES: MagicXPSource[] = [
  {
    eventType: 'form_filed',
    xpAmount: 5,
    description: 'File a magical form correctly',
    qualityMultiplier: true,
  },
  {
    eventType: 'form_approved',
    xpAmount: 10,
    description: 'Have a form approved',
  },
  {
    eventType: 'stamp_used',
    xpAmount: 3,
    description: 'Use an official stamp',
  },
  {
    eventType: 'audit_conducted',
    xpAmount: 20,
    description: 'Conduct a magical audit',
  },
  {
    eventType: 'appeal_won',
    xpAmount: 25,
    description: 'Win a bureaucratic appeal',
  },
  {
    eventType: 'red_tape_defense',
    xpAmount: 8,
    description: 'Block an attack with red tape',
  },
  {
    eventType: 'rank_promotion',
    xpAmount: 50,
    description: 'Receive a rank promotion',
  },
  {
    eventType: 'business_hours_casting',
    xpAmount: 2,
    description: 'Cast during business hours (9-5)',
  },
];

// ============================================================================
// Tree Definition
// ============================================================================

export const BUREAUCRATIC_SKILL_TREE: MagicSkillTree = {
  id: 'bureaucratic_skill_tree',
  paradigmId: PARADIGM_ID,
  name: 'Bureaucratic Magic Skill Tree',
  description: 'Master the art of magical paperwork, stamps, and procedural power',
  lore: `The Department of Reality Alteration maintains order through proper channels.
All magical effects require appropriate documentation. Processing times apply.
Forms available at your local magical registrar. No exceptions without Form E-1.`,
  nodes: ALL_NODES,
  entryNodes: ['basic-filing', 'rubber-stamp', 'ink-and-paper'],
  connections: ALL_NODES.flatMap(node =>
    (node.prerequisites ?? []).map(prereq => ({ from: prereq, to: node.id }))
  ),
  xpSources: XP_SOURCES,
  rules: {
    ...createDefaultTreeRules(false),
    allowRespec: true,
    respecPenalty: 0.1, // Only 10% penalty - bureaucracy is forgiving if you file the right forms
  },
  version: 1,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get available form types based on unlocked nodes.
 */
export function getAvailableFormTypes(unlockedNodes: Set<string>): string[] {
  const forms: string[] = [];
  if (unlockedNodes.has('basic-filing')) forms.push('basic');
  if (unlockedNodes.has('requisition-forms')) forms.push('requisition');
  if (unlockedNodes.has('petition-forms')) forms.push('petition');
  if (unlockedNodes.has('declaration-forms')) forms.push('declaration');
  if (unlockedNodes.has('registration-forms')) forms.push('registration', 'deregistration');
  if (unlockedNodes.has('appeal-process')) forms.push('appeal');
  return forms;
}

/**
 * Get available stamp types based on unlocked nodes.
 */
export function getAvailableStampTypes(unlockedNodes: Set<string>): string[] {
  const stamps: string[] = [];
  if (unlockedNodes.has('rubber-stamp')) stamps.push('basic');
  if (unlockedNodes.has('stamp-authority')) stamps.push('approved', 'denied');
  if (unlockedNodes.has('pending-stamp')) stamps.push('pending');
  if (unlockedNodes.has('urgent-stamp')) stamps.push('urgent');
  if (unlockedNodes.has('notarized-stamp')) stamps.push('notarized');
  return stamps;
}

/**
 * Get bureaucratic rank based on unlocked nodes.
 */
export function getBureaucraticRank(unlockedNodes: Set<string>): string {
  if (unlockedNodes.has('supreme-chancellor')) return 'chancellor';
  if (unlockedNodes.has('director-rank')) return 'director';
  if (unlockedNodes.has('administrator-rank')) return 'administrator';
  if (unlockedNodes.has('clerk-rank')) return 'clerk';
  if (unlockedNodes.has('basic-filing')) return 'intern';
  return 'civilian';
}

/**
 * Check if currently business hours (9-5).
 */
export function isBusinessHours(hour: number): boolean {
  return hour >= 9 && hour < 17;
}

/**
 * Calculate processing time reduction based on nodes.
 */
export function getProcessingTimeMultiplier(unlockedNodes: Set<string>): number {
  let multiplier = 1.0;
  if (unlockedNodes.has('urgent-stamp')) multiplier *= 0.5;
  if (unlockedNodes.has('administrator-rank')) multiplier *= 0.8;
  if (unlockedNodes.has('director-rank')) multiplier *= 0.6;
  return multiplier;
}
