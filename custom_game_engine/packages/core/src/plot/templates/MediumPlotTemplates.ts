/**
 * Medium Plot Templates - Significant life arcs
 *
 * Duration: Months to years
 * Active per soul: 0-2
 * Lesson value: 5-15 wisdom
 *
 * These are substantial storylines that shape character over extended periods.
 */

import type { PlotLineTemplate } from '../PlotTypes.js';

// =============================================================================
// MASTERY & ACHIEVEMENT
// =============================================================================

export const masteringCraft: PlotLineTemplate = {
  id: 'medium_mastering_craft',
  name: 'The Path to Mastery',
  description: 'The long journey from competence to mastery in a craft',
  scale: 'medium',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Mastery through dedication',
    domain: 'self',
    insight: 'Mastery is not a destination but a way of being.',
    wisdom_value: 10,
    repeatable: false,
  },

  entry_stage: 'competent',
  completion_stages: ['mastery'],
  failure_stages: ['plateau'],

  stages: [
    {
      stage_id: 'competent',
      name: 'Competent Practitioner',
      description: 'You have basic competence but sense there is more.',
      stage_attractors: [
        {
          attractor_id: 'seek_depth',
          goal: { type: 'skill_mastery', parameters: {} },
          strength: 0.4,
          urgency: 0.2,
        },
      ],
    },
    {
      stage_id: 'deepening',
      name: 'Going Deeper',
      description: 'You push beyond the basics into deeper understanding.',
      on_enter_effects: [
        { type: 'queue_dream_hint', dream_type: 'prophetic_vision', content_hint: 'You see your hands moving with impossible grace', intensity: 0.5 },
      ],
    },
    {
      stage_id: 'struggle',
      name: 'The Plateau',
      description: 'Progress slows. Doubt creeps in.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 15 },
      ],
    },
    {
      stage_id: 'breakthrough',
      name: 'Breakthrough',
      description: 'Something clicks. A new level of understanding emerges.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 25 },
      ],
    },
    {
      stage_id: 'mastery',
      name: 'True Master',
      description: 'You have achieved mastery. Others come to you for guidance.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 40 },
        { type: 'prophetic_dream', vision_content: 'You see yourself teaching others, your knowledge flowing through generations', urgency: 'high' },
      ],
    },
    {
      stage_id: 'plateau',
      name: 'Stuck at Competence',
      description: 'Mastery remains beyond reach.',
      on_enter_effects: [
        { type: 'modify_mood', delta: -10 },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'competent',
      to_stage: 'deepening',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 15 },
        { type: 'personal_tick_elapsed', ticks: 5000 },
      ],
    },
    {
      from_stage: 'deepening',
      to_stage: 'struggle',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 10000 }],
    },
    {
      from_stage: 'struggle',
      to_stage: 'breakthrough',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 25 },
        { type: 'mood_threshold', min: -10 },
      ],
    },
    {
      from_stage: 'breakthrough',
      to_stage: 'mastery',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 8000 }],
    },
    {
      from_stage: 'struggle',
      to_stage: 'plateau',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 25000 }],
    },
  ],

  assignment_rules: {
    min_wisdom: 10,
    triggers: [
      { type: 'on_skill_mastery', skill: 'any', min_level: 5 },
    ],
    max_concurrent: 1,
    cooldown_ticks: 50000,
  },
};

export const buildingSomethingGreat: PlotLineTemplate = {
  id: 'medium_building_great',
  name: 'Creating a Legacy',
  description: 'Building something that will outlast you',
  scale: 'medium',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Creation and legacy',
    domain: 'self',
    insight: 'What we build outlives what we consume.',
    wisdom_value: 12,
    repeatable: false,
  },

  entry_stage: 'vision',
  completion_stages: ['legacy_created'],
  failure_stages: ['project_abandoned'],

  stages: [
    {
      stage_id: 'vision',
      name: 'The Vision',
      description: 'You see something that does not yet exist but should.',
      on_enter_effects: [
        { type: 'prophetic_dream', vision_content: 'You see a great work taking shape under your hands', urgency: 'medium' },
      ],
    },
    {
      stage_id: 'planning',
      name: 'Laying Foundation',
      description: 'You plan and begin the work.',
    },
    {
      stage_id: 'building',
      name: 'The Long Work',
      description: 'Day after day, you build toward the vision.',
      stage_attractors: [
        {
          attractor_id: 'maintain_dedication',
          goal: { type: 'skill_mastery', parameters: {} },
          strength: 0.5,
          urgency: 0.3,
        },
      ],
    },
    {
      stage_id: 'doubt',
      name: 'Crisis of Faith',
      description: 'Will this ever be finished? Is it even worth it?',
      on_enter_effects: [
        { type: 'modify_stress', delta: 20 },
        { type: 'modify_mood', delta: -15 },
      ],
    },
    {
      stage_id: 'recommitment',
      name: 'Renewed Purpose',
      description: 'You find your way back to the work.',
    },
    {
      stage_id: 'legacy_created',
      name: 'The Work Complete',
      description: 'You have created something that will endure.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 50 },
        { type: 'modify_stress', delta: -30 },
      ],
    },
    {
      stage_id: 'project_abandoned',
      name: 'Unfinished',
      description: 'The great work remains incomplete.',
      on_enter_effects: [
        { type: 'add_trauma', trauma_type: 'failure', severity: 0.3 },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'vision',
      to_stage: 'planning',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 2000 }],
    },
    {
      from_stage: 'planning',
      to_stage: 'building',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 5000 }],
    },
    {
      from_stage: 'building',
      to_stage: 'doubt',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 15000 }],
      probability: 0.7,
    },
    {
      from_stage: 'building',
      to_stage: 'legacy_created',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 30 },
        { type: 'personal_tick_elapsed', ticks: 30000 },
      ],
    },
    {
      from_stage: 'doubt',
      to_stage: 'recommitment',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 20 },
        { type: 'mood_threshold', min: -20 },
      ],
    },
    {
      from_stage: 'recommitment',
      to_stage: 'legacy_created',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 10000 }],
    },
    {
      from_stage: 'doubt',
      to_stage: 'project_abandoned',
      conditions: [{ type: 'stress_threshold', min: 80 }],
    },
  ],

  assignment_rules: {
    min_wisdom: 15,
    max_concurrent: 1,
    cooldown_ticks: 100000,
  },
};

// =============================================================================
// RELATIONSHIPS - DEEP
// =============================================================================

export const deepPartnership: PlotLineTemplate = {
  id: 'medium_deep_partnership',
  name: 'A Life Together',
  description: 'Building a deep partnership with another soul',
  scale: 'medium',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Partnership and commitment',
    domain: 'relationships',
    insight: 'True partnership is choosing each other daily.',
    wisdom_value: 15,
    repeatable: false,
  },

  entry_stage: 'attraction',
  completion_stages: ['lifelong_bond'],
  failure_stages: ['separation'],

  stages: [
    {
      stage_id: 'attraction',
      name: 'Initial Connection',
      description: 'Something draws you to this person.',
      stage_attractors: [
        {
          attractor_id: 'deepen_connection',
          goal: { type: 'love', parameters: {} },
          strength: 0.5,
          urgency: 0.4,
        },
      ],
    },
    {
      stage_id: 'courtship',
      name: 'Getting to Know',
      description: 'You spend time together, learning each other.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 15 },
      ],
    },
    {
      stage_id: 'commitment',
      name: 'Choosing Each Other',
      description: 'You commit to building a life together.',
      on_enter_effects: [
        { type: 'modify_relationship_by_role', role: 'partner', trust_delta: 30, affinity_delta: 25 },
      ],
    },
    {
      stage_id: 'trials',
      name: 'Tested Together',
      description: 'Life tests your partnership.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 15 },
      ],
    },
    {
      stage_id: 'deeper_understanding',
      name: 'Through the Fire',
      description: 'Trials have forged a deeper bond.',
    },
    {
      stage_id: 'lifelong_bond',
      name: 'Partners for Life',
      description: 'You have built something that will last.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 40 },
        { type: 'modify_mood_factor', factor: 'social', delta: 30 },
        { type: 'prophetic_dream', vision_content: 'You see two silver threads intertwined, growing together through many lives', urgency: 'high' },
      ],
    },
    {
      stage_id: 'separation',
      name: 'Paths Diverge',
      description: 'The partnership could not survive.',
      on_enter_effects: [
        { type: 'add_trauma', trauma_type: 'heartbreak', severity: 0.5 },
        { type: 'modify_mood', delta: -30 },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'attraction',
      to_stage: 'courtship',
      conditions: [{ type: 'has_relationship_with_role', role: 'partner', min_trust: 25, min_affinity: 20 }],
    },
    {
      from_stage: 'courtship',
      to_stage: 'commitment',
      conditions: [
        { type: 'has_relationship_with_role', role: 'partner', min_trust: 50, min_affinity: 40 },
        { type: 'personal_tick_elapsed', ticks: 8000 },
      ],
    },
    {
      from_stage: 'commitment',
      to_stage: 'trials',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 10000 }],
    },
    {
      from_stage: 'trials',
      to_stage: 'deeper_understanding',
      conditions: [
        { type: 'has_relationship_with_role', role: 'partner', min_trust: 60 },
        { type: 'wisdom_threshold', min_wisdom: 25 },
      ],
    },
    {
      from_stage: 'deeper_understanding',
      to_stage: 'lifelong_bond',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 15000 }],
    },
    {
      from_stage: 'trials',
      to_stage: 'separation',
      conditions: [{ type: 'relationship_changed', role: 'partner', trust_delta: -30 }],
    },
    {
      from_stage: 'courtship',
      to_stage: 'separation',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 20000 }],
    },
  ],

  assignment_rules: {
    min_wisdom: 10,
    triggers: [
      { type: 'on_relationship_formed', min_initial_trust: 30 },
    ],
    trigger_bindings: [
      { role: 'partner', source: 'trigger_target' },
    ],
    max_concurrent: 1,
    cooldown_ticks: 50000,
  },
};

export const raisingChild: PlotLineTemplate = {
  id: 'medium_raising_child',
  name: 'The Gift of Guidance',
  description: 'Raising and guiding a child into adulthood',
  scale: 'medium',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Nurturing the next generation',
    domain: 'relationships',
    insight: 'In teaching, we learn. In guiding, we grow.',
    wisdom_value: 15,
    repeatable: true,
  },

  entry_stage: 'new_parent',
  completion_stages: ['child_grown'],
  failure_stages: ['estrangement'],

  stages: [
    {
      stage_id: 'new_parent',
      name: 'New Responsibility',
      description: 'A young life depends on you.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 20 },
        { type: 'modify_mood', delta: 20 },
      ],
    },
    {
      stage_id: 'early_years',
      name: 'The Early Years',
      description: 'Constant care and attention shape a young mind.',
    },
    {
      stage_id: 'teaching',
      name: 'Teaching Life',
      description: 'You pass on what you know.',
      stage_attractors: [
        {
          attractor_id: 'guide_growth',
          goal: { type: 'skill_mastery', parameters: {} },
          strength: 0.4,
          urgency: 0.3,
        },
      ],
    },
    {
      stage_id: 'letting_go',
      name: 'Letting Go',
      description: 'They grow more independent. You must step back.',
      on_enter_effects: [
        { type: 'queue_dream_hint', dream_type: 'memory_echo', content_hint: 'You remember when they were small, looking up at you with wonder', emotional_tone: 'melancholic', intensity: 0.6 },
      ],
    },
    {
      stage_id: 'child_grown',
      name: 'A Life Well Started',
      description: 'They have become their own person, and you helped them get there.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 35 },
        { type: 'prophetic_dream', vision_content: 'You see them raising their own children, passing on what you gave them', urgency: 'high' },
      ],
    },
    {
      stage_id: 'estrangement',
      name: 'Distance Grown',
      description: 'The relationship has fractured.',
      on_enter_effects: [
        { type: 'add_trauma', trauma_type: 'loss', severity: 0.4 },
        { type: 'modify_mood', delta: -25 },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'new_parent',
      to_stage: 'early_years',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 5000 }],
    },
    {
      from_stage: 'early_years',
      to_stage: 'teaching',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 15000 }],
    },
    {
      from_stage: 'teaching',
      to_stage: 'letting_go',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 20000 }],
    },
    {
      from_stage: 'letting_go',
      to_stage: 'child_grown',
      conditions: [
        { type: 'has_relationship_with_role', role: 'child', min_trust: 50 },
        { type: 'personal_tick_elapsed', ticks: 10000 },
      ],
    },
    {
      from_stage: 'letting_go',
      to_stage: 'estrangement',
      conditions: [{ type: 'relationship_changed', role: 'child', trust_delta: -40 }],
    },
  ],

  assignment_rules: {
    trigger_bindings: [
      { role: 'child', source: 'random_known' },
    ],
    max_concurrent: 1,
    cooldown_ticks: 80000,
  },
};

// =============================================================================
// LEADERSHIP & RESPONSIBILITY
// =============================================================================

export const becomingLeader: PlotLineTemplate = {
  id: 'medium_becoming_leader',
  name: 'The Weight of Leadership',
  description: 'Growing into a position of responsibility for others',
  scale: 'medium',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Service through leadership',
    domain: 'relationships',
    insight: 'A leader serves those they lead.',
    wisdom_value: 12,
    repeatable: false,
  },

  entry_stage: 'thrust_into_leadership',
  completion_stages: ['wise_leader'],
  failure_stages: ['abdicated'],

  stages: [
    {
      stage_id: 'thrust_into_leadership',
      name: 'Unexpected Responsibility',
      description: 'Others look to you for guidance.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 25 },
      ],
    },
    {
      stage_id: 'struggling',
      name: 'Learning to Lead',
      description: 'Leadership is harder than it looked.',
    },
    {
      stage_id: 'first_success',
      name: 'Small Victory',
      description: 'Your guidance helps the group succeed.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 20 },
      ],
    },
    {
      stage_id: 'crisis',
      name: 'The Test',
      description: 'A true crisis tests your leadership.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 30 },
      ],
      stage_attractors: [
        {
          attractor_id: 'rise_to_occasion',
          goal: { type: 'conflict_resolution', parameters: {} },
          strength: 0.6,
          urgency: 0.7,
        },
      ],
    },
    {
      stage_id: 'wise_leader',
      name: 'Leader of Wisdom',
      description: 'You have learned to lead with wisdom and compassion.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 35 },
        { type: 'modify_stress', delta: -20 },
      ],
    },
    {
      stage_id: 'abdicated',
      name: 'Stepped Down',
      description: 'The burden of leadership was too great.',
      on_enter_effects: [
        { type: 'modify_stress', delta: -30 },
        { type: 'modify_mood', delta: -10 },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'thrust_into_leadership',
      to_stage: 'struggling',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 3000 }],
    },
    {
      from_stage: 'struggling',
      to_stage: 'first_success',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 20 },
        { type: 'personal_tick_elapsed', ticks: 8000 },
      ],
    },
    {
      from_stage: 'first_success',
      to_stage: 'crisis',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 12000 }],
    },
    {
      from_stage: 'crisis',
      to_stage: 'wise_leader',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 30 },
        { type: 'stress_threshold', max: 70 },
      ],
    },
    {
      from_stage: 'crisis',
      to_stage: 'abdicated',
      conditions: [{ type: 'stress_threshold', min: 85 }],
    },
    {
      from_stage: 'struggling',
      to_stage: 'abdicated',
      conditions: [{ type: 'stress_threshold', min: 90 }],
    },
  ],

  assignment_rules: {
    min_wisdom: 15,
    max_concurrent: 1,
    cooldown_ticks: 60000,
  },
};

// =============================================================================
// HEALING & REDEMPTION
// =============================================================================

export const healingFromTrauma: PlotLineTemplate = {
  id: 'medium_healing_trauma',
  name: 'The Long Healing',
  description: 'Recovering from deep trauma over time',
  scale: 'medium',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Healing is possible',
    domain: 'self',
    insight: 'Scars remain, but they no longer bleed.',
    wisdom_value: 10,
    repeatable: true,
  },

  entry_stage: 'wounded',
  completion_stages: ['healed'],
  failure_stages: ['scarred'],

  stages: [
    {
      stage_id: 'wounded',
      name: 'The Wound',
      description: 'Deep trauma affects everything.',
      on_enter_effects: [
        { type: 'modify_mood', delta: -25 },
      ],
    },
    {
      stage_id: 'denial',
      name: 'Pushing Through',
      description: 'You try to ignore the pain.',
    },
    {
      stage_id: 'confronting',
      name: 'Facing the Pain',
      description: 'You begin to confront what happened.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 20 },
      ],
    },
    {
      stage_id: 'processing',
      name: 'Working Through',
      description: 'The slow work of healing.',
      stage_attractors: [
        {
          attractor_id: 'seek_support',
          goal: { type: 'relationship_formed', parameters: {} },
          strength: 0.4,
          urgency: 0.3,
        },
      ],
    },
    {
      stage_id: 'healed',
      name: 'Integrated',
      description: 'The wound has become part of your story, not your prison.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 30 },
        { type: 'modify_stress', delta: -25 },
        { type: 'prophetic_dream', vision_content: 'You see yourself whole again, the cracks filled with gold', urgency: 'high' },
      ],
    },
    {
      stage_id: 'scarred',
      name: 'Unhealed',
      description: 'The trauma remains a constant weight.',
      on_enter_effects: [
        { type: 'add_trauma', trauma_type: 'unresolved', severity: 0.3 },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'wounded',
      to_stage: 'denial',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 2000 }],
    },
    {
      from_stage: 'denial',
      to_stage: 'confronting',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 15 },
        { type: 'personal_tick_elapsed', ticks: 8000 },
      ],
    },
    {
      from_stage: 'confronting',
      to_stage: 'processing',
      conditions: [
        { type: 'any_relationship', min_trust: 40 },
        { type: 'personal_tick_elapsed', ticks: 5000 },
      ],
    },
    {
      from_stage: 'processing',
      to_stage: 'healed',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 25 },
        { type: 'personal_tick_elapsed', ticks: 15000 },
      ],
    },
    {
      from_stage: 'denial',
      to_stage: 'scarred',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 30000 }],
    },
    {
      from_stage: 'processing',
      to_stage: 'scarred',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 40000 }],
    },
  ],

  assignment_rules: {
    triggers: [
      { type: 'on_trauma' },
    ],
    max_concurrent: 1,
    cooldown_ticks: 50000,
  },
};

export const redemptionArc: PlotLineTemplate = {
  id: 'medium_redemption',
  name: 'The Path of Redemption',
  description: 'Seeking to make amends for past wrongs',
  scale: 'medium',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Redemption through action',
    domain: 'self',
    insight: 'The past cannot be changed, but the future remains unwritten.',
    wisdom_value: 12,
    repeatable: false,
  },

  entry_stage: 'haunted',
  completion_stages: ['redeemed'],
  failure_stages: ['unforgiven'],

  stages: [
    {
      stage_id: 'haunted',
      name: 'Haunted by the Past',
      description: 'Past wrongs weigh heavily on your soul.',
      on_enter_effects: [
        { type: 'modify_mood', delta: -20 },
        { type: 'modify_stress', delta: 15 },
      ],
    },
    {
      stage_id: 'acknowledging',
      name: 'Facing What Was Done',
      description: 'You fully acknowledge your past actions.',
    },
    {
      stage_id: 'seeking_amends',
      name: 'Seeking to Make Right',
      description: 'You actively work to repair the damage.',
      stage_attractors: [
        {
          attractor_id: 'repair_harm',
          goal: { type: 'justice', parameters: {} },
          strength: 0.5,
          urgency: 0.5,
        },
      ],
    },
    {
      stage_id: 'penance',
      name: 'The Work of Penance',
      description: 'Actions speak louder than words.',
    },
    {
      stage_id: 'redeemed',
      name: 'Redemption Found',
      description: 'You have proven through action that you have changed.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 40 },
        { type: 'modify_stress', delta: -30 },
        { type: 'prophetic_dream', vision_content: 'The weight lifts. You see yourself as you could be, not as you were', urgency: 'high' },
      ],
    },
    {
      stage_id: 'unforgiven',
      name: 'Redemption Denied',
      description: 'Some wounds cannot be healed.',
      on_enter_effects: [
        { type: 'add_trauma', trauma_type: 'guilt', severity: 0.4 },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'haunted',
      to_stage: 'acknowledging',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 20 },
        { type: 'personal_tick_elapsed', ticks: 5000 },
      ],
    },
    {
      from_stage: 'acknowledging',
      to_stage: 'seeking_amends',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 5000 }],
    },
    {
      from_stage: 'seeking_amends',
      to_stage: 'penance',
      conditions: [{ type: 'any_relationship', min_trust: 30 }],
    },
    {
      from_stage: 'penance',
      to_stage: 'redeemed',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 35 },
        { type: 'personal_tick_elapsed', ticks: 20000 },
      ],
    },
    {
      from_stage: 'seeking_amends',
      to_stage: 'unforgiven',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 40000 }],
    },
  ],

  assignment_rules: {
    min_wisdom: 15,
    max_concurrent: 1,
    cooldown_ticks: 100000,
  },
};

// =============================================================================
// DISCOVERY & UNDERSTANDING
// =============================================================================

export const discoveryOfTruth: PlotLineTemplate = {
  id: 'medium_discovery_truth',
  name: 'Unveiling Truth',
  description: 'Uncovering a significant truth that changes everything',
  scale: 'medium',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Truth transforms',
    domain: 'self',
    insight: 'Some truths, once seen, cannot be unseen.',
    wisdom_value: 10,
    repeatable: true,
  },

  entry_stage: 'ignorance',
  completion_stages: ['enlightened'],
  failure_stages: ['willful_blindness'],

  stages: [
    {
      stage_id: 'ignorance',
      name: 'Not Knowing',
      description: 'You live without knowing an important truth.',
    },
    {
      stage_id: 'hints',
      name: 'Something Is Off',
      description: 'Clues suggest things are not as they seem.',
      on_enter_effects: [
        { type: 'queue_dream_hint', dream_type: 'symbolic', content_hint: 'Shadows hide something important', intensity: 0.5 },
      ],
    },
    {
      stage_id: 'investigating',
      name: 'Seeking Answers',
      description: 'You actively pursue the truth.',
      stage_attractors: [
        {
          attractor_id: 'uncover_truth',
          goal: { type: 'mystery_revelation', parameters: {} },
          strength: 0.5,
          urgency: 0.5,
        },
      ],
    },
    {
      stage_id: 'revelation',
      name: 'The Truth Revealed',
      description: 'Everything becomes clear.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 15 },
      ],
    },
    {
      stage_id: 'enlightened',
      name: 'Wisdom Gained',
      description: 'The truth has been integrated into your understanding.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 20 },
        { type: 'prophetic_dream', vision_content: 'Veils fall away and you see clearly for the first time', urgency: 'high' },
      ],
    },
    {
      stage_id: 'willful_blindness',
      name: 'Chose Not to See',
      description: 'The truth was too uncomfortable to accept.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 10 },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'ignorance',
      to_stage: 'hints',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 5000 }],
    },
    {
      from_stage: 'hints',
      to_stage: 'investigating',
      conditions: [{ type: 'wisdom_threshold', min_wisdom: 15 }],
    },
    {
      from_stage: 'investigating',
      to_stage: 'revelation',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 10000 }],
    },
    {
      from_stage: 'revelation',
      to_stage: 'enlightened',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 25 },
        { type: 'personal_tick_elapsed', ticks: 3000 },
      ],
    },
    {
      from_stage: 'hints',
      to_stage: 'willful_blindness',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 20000 }],
    },
    {
      from_stage: 'revelation',
      to_stage: 'willful_blindness',
      conditions: [{ type: 'stress_threshold', min: 80 }],
    },
  ],

  assignment_rules: {
    cooldown_ticks: 40000,
  },
};

export const findinFaith: PlotLineTemplate = {
  id: 'medium_finding_faith',
  name: 'The Search for Meaning',
  description: 'Developing a personal philosophy or faith',
  scale: 'medium',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Faith and meaning',
    domain: 'transcendence',
    insight: 'Meaning is not found but created.',
    wisdom_value: 12,
    repeatable: false,
  },

  entry_stage: 'emptiness',
  completion_stages: ['faith_found'],
  failure_stages: ['nihilism'],

  stages: [
    {
      stage_id: 'emptiness',
      name: 'The Void',
      description: 'Life feels meaningless.',
      on_enter_effects: [
        { type: 'modify_mood', delta: -15 },
      ],
    },
    {
      stage_id: 'questioning',
      name: 'Deep Questions',
      description: 'You grapple with the big questions.',
    },
    {
      stage_id: 'exploring',
      name: 'Exploring Possibilities',
      description: 'You consider different ways of understanding life.',
      stage_attractors: [
        {
          attractor_id: 'seek_meaning',
          goal: { type: 'discovery', parameters: {} },
          strength: 0.4,
          urgency: 0.3,
        },
      ],
    },
    {
      stage_id: 'glimpse',
      name: 'A Glimpse of Something',
      description: 'You catch a glimpse of meaning.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 15 },
        { type: 'prophetic_dream', vision_content: 'A light in the darkness, faint but real', urgency: 'medium' },
      ],
    },
    {
      stage_id: 'faith_found',
      name: 'Meaning Discovered',
      description: 'You have found a way to understand life that gives it meaning.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 30 },
        { type: 'modify_stress', delta: -20 },
      ],
    },
    {
      stage_id: 'nihilism',
      name: 'Embracing the Void',
      description: 'You have concluded that meaning does not exist.',
      on_enter_effects: [
        { type: 'modify_mood', delta: -10 },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'emptiness',
      to_stage: 'questioning',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 5000 }],
    },
    {
      from_stage: 'questioning',
      to_stage: 'exploring',
      conditions: [{ type: 'wisdom_threshold', min_wisdom: 15 }],
    },
    {
      from_stage: 'exploring',
      to_stage: 'glimpse',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 15000 }],
      probability: 0.7,
    },
    {
      from_stage: 'glimpse',
      to_stage: 'faith_found',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 30 },
        { type: 'personal_tick_elapsed', ticks: 10000 },
      ],
    },
    {
      from_stage: 'exploring',
      to_stage: 'nihilism',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 35000 }],
    },
  ],

  assignment_rules: {
    min_wisdom: 10,
    triggers: [
      { type: 'on_mood_threshold', max: -30 },
    ],
    max_concurrent: 1,
    cooldown_ticks: 80000,
  },
};

// =============================================================================
// EXPORT ALL MEDIUM TEMPLATES
// =============================================================================

export const MEDIUM_PLOT_TEMPLATES: PlotLineTemplate[] = [
  // Mastery & Achievement
  masteringCraft,
  buildingSomethingGreat,
  // Relationships - Deep
  deepPartnership,
  raisingChild,
  // Leadership & Responsibility
  becomingLeader,
  // Healing & Redemption
  healingFromTrauma,
  redemptionArc,
  // Discovery & Understanding
  discoveryOfTruth,
  findinFaith,
];

// Total: 9 medium templates
