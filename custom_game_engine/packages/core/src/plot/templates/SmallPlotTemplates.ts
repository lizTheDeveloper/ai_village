/**
 * Small Plot Templates - Short arcs of growth
 *
 * Duration: Days to weeks
 * Active per soul: 1-5
 * Lesson value: 2-5 wisdom
 *
 * These are brief storylines that develop over multiple interactions.
 *
 * Plot templates are now loaded from JSON data files to separate
 * narrative content from code structure.
 */

import type { PlotLineTemplate } from '../PlotTypes.js';
import plotTemplatesData from '../../data/plot-templates.json';

/**
 * Load and validate plot templates from JSON
 */
function loadPlotTemplates(): PlotLineTemplate[] {
  const templates = plotTemplatesData.small_plot_templates as PlotLineTemplate[];

  if (!templates || !Array.isArray(templates)) {
    throw new Error('[SmallPlotTemplates] Failed to load plot templates from JSON');
  }

  // Validate each template has required fields
  for (const template of templates) {
    if (!template.id || !template.name || !template.scale || !template.stages || !template.transitions) {
      throw new Error(`[SmallPlotTemplates] Invalid template structure: ${template.id || 'unknown'}`);
    }
  }

  return templates;
}

// Load templates from JSON
const LOADED_TEMPLATES = loadPlotTemplates();

// Create a map for easy lookup by ID
const TEMPLATE_MAP = new Map<string, PlotLineTemplate>(
  LOADED_TEMPLATES.map(t => [t.id, t])
);

// =============================================================================
// EXPORTED TEMPLATE CONSTANTS (for backwards compatibility)
// =============================================================================

export const firstFriendship: PlotLineTemplate = TEMPLATE_MAP.get('small_first_friendship')!;
export const healingRift: PlotLineTemplate = TEMPLATE_MAP.get('small_healing_rift')!;
export const learningNewSkill: PlotLineTemplate = TEMPLATE_MAP.get('small_learning_skill')!;
export const findingMentor: PlotLineTemplate = TEMPLATE_MAP.get('small_finding_mentor')!;
export const overcomingFear: PlotLineTemplate = TEMPLATE_MAP.get('small_overcoming_fear')!;
export const processingGrief: PlotLineTemplate = TEMPLATE_MAP.get('small_processing_grief')!;
export const findingPurpose: PlotLineTemplate = TEMPLATE_MAP.get('small_finding_purpose')!;
export const settingPersonalGoal: PlotLineTemplate = TEMPLATE_MAP.get('small_personal_goal')!;
export const standingUpForSelf: PlotLineTemplate = TEMPLATE_MAP.get('small_standing_up')!;
export const makingAmends: PlotLineTemplate = TEMPLATE_MAP.get('small_making_amends')!;
export const adaptingToChange: PlotLineTemplate = TEMPLATE_MAP.get('small_adapting_change')!;
export const breakingHabit: PlotLineTemplate = TEMPLATE_MAP.get('small_breaking_habit')!;
export const openingUp: PlotLineTemplate = TEMPLATE_MAP.get('small_opening_up')!;
export const trustingAgain: PlotLineTemplate = TEMPLATE_MAP.get('small_trusting_again')!;
export const findingBelonging: PlotLineTemplate = TEMPLATE_MAP.get('small_finding_belonging')!;
export const helpingStranger: PlotLineTemplate = TEMPLATE_MAP.get('small_helping_stranger')!;

// =============================================================================
// EXPORT ALL SMALL TEMPLATES
// =============================================================================

export const SMALL_PLOT_TEMPLATES: PlotLineTemplate[] = LOADED_TEMPLATES;

// Total: 16 small templates (loaded from JSON)

/**
  description: 'Repairing trust after a falling out',
  scale: 'small',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Repair and reconciliation',
    domain: 'relationships',
    insight: 'Broken trust can be rebuilt with patience and sincerity.',
    wisdom_value: 4,
    repeatable: true,
  },

  entry_stage: 'rift_opened',
  completion_stages: ['reconciled'],
  failure_stages: ['permanently_damaged'],

  stages: [
    {
      stage_id: 'rift_opened',
      name: 'The Wound',
      description: 'Something has damaged your relationship.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 15 },
      ],
    },
    {
      stage_id: 'reflecting',
      name: 'Understanding the Hurt',
      description: 'You begin to understand what happened.',
      stage_attractors: [
        {
          attractor_id: 'seek_repair',
          goal: { type: 'relationship_formed', parameters: {} },
          strength: 0.5,
          urgency: 0.5,
        },
      ],
    },
    {
      stage_id: 'reaching_out',
      name: 'Making Amends',
      description: 'You attempt to repair the damage.',
    },
    {
      stage_id: 'reconciled',
      name: 'Trust Restored',
      description: 'The relationship has healed, perhaps stronger than before.',
      on_enter_effects: [
        { type: 'modify_relationship_by_role', role: 'estranged', trust_delta: 20, affinity_delta: 10 },
        { type: 'modify_stress', delta: -20 },
        { type: 'modify_mood', delta: 20 },
      ],
    },
    {
      stage_id: 'permanently_damaged',
      name: 'Beyond Repair',
      description: 'The relationship could not be saved.',
      on_enter_effects: [
        { type: 'modify_mood', delta: -15 },
        { type: 'add_trauma', trauma_type: 'loss', severity: 0.3, description: 'Lost a meaningful relationship' },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'rift_opened',
      to_stage: 'reflecting',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 500 }],
    },
    {
      from_stage: 'reflecting',
      to_stage: 'reaching_out',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 10 },
        { type: 'personal_tick_elapsed', ticks: 300 },
      ],
    },
    {
      from_stage: 'reaching_out',
      to_stage: 'reconciled',
      conditions: [
        { type: 'has_relationship_with_role', role: 'estranged', min_trust: 20 },
      ],
    },
    {
      from_stage: 'reaching_out',
      to_stage: 'permanently_damaged',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 3000 }],
    },
    {
      from_stage: 'rift_opened',
      to_stage: 'permanently_damaged',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 8000 }],
    },
  ],

  assignment_rules: {
    triggers: [
      { type: 'on_relationship_change', delta_threshold: -25 },
    ],
    trigger_bindings: [
      { role: 'estranged', source: 'trigger_target' },
    ],
    cooldown_ticks: 5000,
  },
};

// =============================================================================
// SKILL DEVELOPMENT
// =============================================================================

export const learningNewSkill: PlotLineTemplate = {
  id: 'small_learning_skill',
  name: 'The Apprentice',
  description: 'Learning the basics of a new skill',
  scale: 'small',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Practice and persistence',
    domain: 'self',
    insight: 'Every master was once a beginner.',
    wisdom_value: 3,
    repeatable: true,
  },

  entry_stage: 'novice',
  completion_stages: ['competent'],
  failure_stages: ['abandoned'],

  stages: [
    {
      stage_id: 'novice',
      name: 'Complete Beginner',
      description: 'You know nothing about this skill yet.',
      stage_attractors: [
        {
          attractor_id: 'practice',
          goal: { type: 'skill_mastery', parameters: { skill: 'any' } },
          strength: 0.3,
          urgency: 0.3,
        },
      ],
    },
    {
      stage_id: 'struggling',
      name: 'Frustrating Progress',
      description: 'Learning is harder than expected.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 10 },
      ],
    },
    {
      stage_id: 'practicing',
      name: 'Building Skill',
      description: 'Practice is starting to pay off.',
    },
    {
      stage_id: 'competent',
      name: 'Basic Competence',
      description: 'You have learned the fundamentals.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 20 },
        { type: 'modify_stress', delta: -15 },
      ],
    },
    {
      stage_id: 'abandoned',
      name: 'Given Up',
      description: 'The learning process was too difficult.',
      on_enter_effects: [
        { type: 'modify_mood', delta: -10 },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'novice',
      to_stage: 'struggling',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 200 }],
    },
    {
      from_stage: 'struggling',
      to_stage: 'practicing',
      conditions: [
        { type: 'mood_threshold', min: -20 },
        { type: 'personal_tick_elapsed', ticks: 500 },
      ],
    },
    {
      from_stage: 'struggling',
      to_stage: 'abandoned',
      conditions: [{ type: 'stress_threshold', min: 80 }],
    },
    {
      from_stage: 'practicing',
      to_stage: 'competent',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 1000 }],
    },
    {
      from_stage: 'practicing',
      to_stage: 'abandoned',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 5000 }],
    },
  ],

  assignment_rules: {
    cooldown_ticks: 3000,
  },
};

export const findingMentor: PlotLineTemplate = {
  id: 'small_finding_mentor',
  name: 'Seeking Guidance',
  description: 'Finding someone to learn from',
  scale: 'small',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Wisdom from others',
    domain: 'relationships',
    insight: 'The right teacher appears when the student is ready.',
    wisdom_value: 4,
    repeatable: true,
  },

  entry_stage: 'seeking_guidance',
  completion_stages: ['mentored'],
  failure_stages: ['unguided'],

  stages: [
    {
      stage_id: 'seeking_guidance',
      name: 'Looking for a Teacher',
      description: 'You need guidance but have not found it yet.',
    },
    {
      stage_id: 'potential_mentor',
      name: 'A Possible Guide',
      description: 'Someone might be able to teach you.',
    },
    {
      stage_id: 'learning',
      name: 'Under Guidance',
      description: 'You are learning from your mentor.',
      stage_attractors: [
        {
          attractor_id: 'absorb_wisdom',
          goal: { type: 'skill_mastery', parameters: {} },
          strength: 0.4,
          urgency: 0.3,
        },
      ],
    },
    {
      stage_id: 'mentored',
      name: 'Guidance Received',
      description: 'Your mentor has taught you well.',
      on_enter_effects: [
        { type: 'modify_relationship_by_role', role: 'mentor', trust_delta: 15, affinity_delta: 20 },
        { type: 'grant_skill_xp', skill: 'observation', xp: 20 },
      ],
    },
    {
      stage_id: 'unguided',
      name: 'Self-Taught',
      description: 'You could not find a mentor.',
    },
  ],

  transitions: [
    {
      from_stage: 'seeking_guidance',
      to_stage: 'potential_mentor',
      conditions: [{ type: 'any_relationship', min_trust: 30 }],
    },
    {
      from_stage: 'potential_mentor',
      to_stage: 'learning',
      conditions: [
        { type: 'has_relationship_with_role', role: 'mentor', min_trust: 40 },
      ],
    },
    {
      from_stage: 'learning',
      to_stage: 'mentored',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 2000 }],
    },
    {
      from_stage: 'seeking_guidance',
      to_stage: 'unguided',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 6000 }],
    },
  ],

  assignment_rules: {
    trigger_bindings: [
      { role: 'mentor', source: 'highest_trust' },
    ],
    cooldown_ticks: 8000,
  },
};

// =============================================================================
// EMOTIONAL GROWTH
// =============================================================================

export const overcomingFear: PlotLineTemplate = {
  id: 'small_overcoming_fear',
  name: 'Facing the Fear',
  description: 'Gradually overcoming a persistent fear',
  scale: 'small',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Courage through exposure',
    domain: 'self',
    insight: 'Fear shrinks when faced repeatedly.',
    wisdom_value: 4,
    repeatable: true,
  },

  entry_stage: 'paralyzed',
  completion_stages: ['fear_conquered'],
  failure_stages: ['fear_wins'],

  stages: [
    {
      stage_id: 'paralyzed',
      name: 'Gripped by Fear',
      description: 'Fear holds you back from something important.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 20 },
      ],
    },
    {
      stage_id: 'small_steps',
      name: 'Tiny Steps Forward',
      description: 'You begin to approach the fear, little by little.',
    },
    {
      stage_id: 'facing_it',
      name: 'Direct Confrontation',
      description: 'You face the fear head-on.',
      stage_attractors: [
        {
          attractor_id: 'courage_surge',
          goal: { type: 'emotional_state', parameters: { emotion: 'brave' } },
          strength: 0.6,
          urgency: 0.6,
        },
      ],
    },
    {
      stage_id: 'fear_conquered',
      name: 'Fear Overcome',
      description: 'The fear no longer controls you.',
      on_enter_effects: [
        { type: 'modify_stress', delta: -30 },
        { type: 'modify_mood', delta: 30 },
        { type: 'prophetic_dream', vision_content: 'You stand tall where once you cowered', urgency: 'medium' },
      ],
    },
    {
      stage_id: 'fear_wins',
      name: 'Retreat',
      description: 'The fear was too strong this time.',
      on_enter_effects: [
        { type: 'modify_mood', delta: -15 },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'paralyzed',
      to_stage: 'small_steps',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 5 },
        { type: 'personal_tick_elapsed', ticks: 400 },
      ],
    },
    {
      from_stage: 'small_steps',
      to_stage: 'facing_it',
      conditions: [
        { type: 'stress_threshold', max: 60 },
        { type: 'personal_tick_elapsed', ticks: 800 },
      ],
    },
    {
      from_stage: 'facing_it',
      to_stage: 'fear_conquered',
      conditions: [
        { type: 'mood_threshold', min: 0 },
        { type: 'personal_tick_elapsed', ticks: 500 },
      ],
    },
    {
      from_stage: 'facing_it',
      to_stage: 'fear_wins',
      conditions: [{ type: 'stress_threshold', min: 85 }],
    },
    {
      from_stage: 'paralyzed',
      to_stage: 'fear_wins',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 4000 }],
    },
  ],

  assignment_rules: {
    triggers: [
      { type: 'on_stress_threshold', min: 70 },
    ],
    cooldown_ticks: 5000,
  },
};

export const processingGrief: PlotLineTemplate = {
  id: 'small_processing_grief',
  name: 'The Weight of Loss',
  description: 'Processing the death of someone known',
  scale: 'small',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Grief and healing',
    domain: 'self',
    insight: 'Grief is the price of love, and worth paying.',
    wisdom_value: 5,
    repeatable: true,
  },

  entry_stage: 'shock',
  completion_stages: ['acceptance'],
  failure_stages: ['stuck_in_grief'],

  stages: [
    {
      stage_id: 'shock',
      name: 'Initial Shock',
      description: 'The loss is too fresh to process.',
      on_enter_effects: [
        { type: 'set_emotional_state', state: 'grieving', duration_ticks: 500 },
        { type: 'modify_stress', delta: 30 },
      ],
    },
    {
      stage_id: 'denial',
      name: 'Denial',
      description: 'It cannot be real. It cannot be true.',
    },
    {
      stage_id: 'anger',
      name: 'Anger',
      description: 'Rage at the unfairness of loss.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 10 },
      ],
    },
    {
      stage_id: 'sadness',
      name: 'Deep Sadness',
      description: 'The full weight of loss settles in.',
      stage_attractors: [
        {
          attractor_id: 'seek_comfort',
          goal: { type: 'relationship_formed', parameters: {} },
          strength: 0.4,
          urgency: 0.3,
        },
      ],
    },
    {
      stage_id: 'acceptance',
      name: 'Acceptance',
      description: 'The loss is integrated into your life.',
      on_enter_effects: [
        { type: 'modify_stress', delta: -25 },
        { type: 'modify_mood', delta: 10 },
        { type: 'queue_dream_hint', dream_type: 'memory_echo', content_hint: 'The one who passed visits you in dreams, at peace', emotional_tone: 'melancholic', intensity: 0.7 },
      ],
    },
    {
      stage_id: 'stuck_in_grief',
      name: 'Unresolved Grief',
      description: 'The grief has become a permanent weight.',
      on_enter_effects: [
        { type: 'add_trauma', trauma_type: 'loss', severity: 0.5, description: 'Unresolved grief' },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'shock',
      to_stage: 'denial',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 300 }],
    },
    {
      from_stage: 'denial',
      to_stage: 'anger',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 500 }],
    },
    {
      from_stage: 'anger',
      to_stage: 'sadness',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 600 }],
    },
    {
      from_stage: 'sadness',
      to_stage: 'acceptance',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 15 },
        { type: 'personal_tick_elapsed', ticks: 1000 },
      ],
    },
    {
      from_stage: 'sadness',
      to_stage: 'stuck_in_grief',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 5000 }],
    },
  ],

  assignment_rules: {
    triggers: [
      { type: 'on_death_nearby', min_relationship_trust: 30 },
    ],
    trigger_bindings: [
      { role: 'deceased', source: 'trigger_target' },
    ],
    cooldown_ticks: 10000,
  },
};

// =============================================================================
// SELF-DISCOVERY
// =============================================================================

export const findingPurpose: PlotLineTemplate = {
  id: 'small_finding_purpose',
  name: 'What Am I For?',
  description: 'Discovering a sense of purpose',
  scale: 'small',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Purpose and meaning',
    domain: 'self',
    insight: 'Purpose is not found but created through action.',
    wisdom_value: 4,
    repeatable: false,
  },

  entry_stage: 'aimless',
  completion_stages: ['purpose_found'],
  failure_stages: ['still_searching'],

  stages: [
    {
      stage_id: 'aimless',
      name: 'Directionless',
      description: 'Life feels empty of meaning.',
      on_enter_effects: [
        { type: 'modify_mood', delta: -10 },
      ],
    },
    {
      stage_id: 'questioning',
      name: 'Asking Why',
      description: 'You begin to question what matters.',
    },
    {
      stage_id: 'experimenting',
      name: 'Trying Things',
      description: 'You explore different paths.',
      stage_attractors: [
        {
          attractor_id: 'discover_passion',
          goal: { type: 'discovery', parameters: {} },
          strength: 0.4,
          urgency: 0.4,
        },
      ],
    },
    {
      stage_id: 'purpose_found',
      name: 'Purpose Discovered',
      description: 'You have found something worth dedicating yourself to.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 35 },
        { type: 'modify_stress', delta: -20 },
        { type: 'prophetic_dream', vision_content: 'Your future self looks back with gratitude for this moment of clarity', urgency: 'high' },
      ],
    },
    {
      stage_id: 'still_searching',
      name: 'Search Continues',
      description: 'The search for purpose goes on.',
    },
  ],

  transitions: [
    {
      from_stage: 'aimless',
      to_stage: 'questioning',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 800 }],
    },
    {
      from_stage: 'questioning',
      to_stage: 'experimenting',
      conditions: [{ type: 'wisdom_threshold', min_wisdom: 10 }],
    },
    {
      from_stage: 'experimenting',
      to_stage: 'purpose_found',
      conditions: [
        { type: 'mood_threshold', min: 20 },
        { type: 'personal_tick_elapsed', ticks: 2000 },
      ],
    },
    {
      from_stage: 'experimenting',
      to_stage: 'still_searching',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 6000 }],
    },
  ],

  assignment_rules: {
    triggers: [
      { type: 'on_mood_threshold', max: -20 },
    ],
    max_concurrent: 1,
    cooldown_ticks: 10000,
  },
};

export const settingPersonalGoal: PlotLineTemplate = {
  id: 'small_personal_goal',
  name: 'A Goal of My Own',
  description: 'Setting and achieving a personal goal',
  scale: 'small',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Achievement through intention',
    domain: 'self',
    insight: 'Goals give shape to effort.',
    wisdom_value: 3,
    repeatable: true,
  },

  entry_stage: 'goal_set',
  completion_stages: ['goal_achieved'],
  failure_stages: ['goal_abandoned'],

  stages: [
    {
      stage_id: 'goal_set',
      name: 'The Intention',
      description: 'You have decided what you want to achieve.',
    },
    {
      stage_id: 'working',
      name: 'Working Toward It',
      description: 'You are making progress.',
      stage_attractors: [
        {
          attractor_id: 'maintain_focus',
          goal: { type: 'skill_mastery', parameters: {} },
          strength: 0.3,
          urgency: 0.4,
        },
      ],
    },
    {
      stage_id: 'obstacle',
      name: 'Facing Obstacles',
      description: 'Challenges arise in your path.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 10 },
      ],
    },
    {
      stage_id: 'goal_achieved',
      name: 'Goal Reached',
      description: 'You achieved what you set out to do.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 25 },
        { type: 'modify_stress', delta: -15 },
      ],
    },
    {
      stage_id: 'goal_abandoned',
      name: 'Goal Given Up',
      description: 'The goal was abandoned.',
      on_enter_effects: [
        { type: 'modify_mood', delta: -10 },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'goal_set',
      to_stage: 'working',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 200 }],
    },
    {
      from_stage: 'working',
      to_stage: 'obstacle',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 800 }],
      probability: 0.6,
    },
    {
      from_stage: 'working',
      to_stage: 'goal_achieved',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 2500 }],
    },
    {
      from_stage: 'obstacle',
      to_stage: 'working',
      conditions: [
        { type: 'stress_threshold', max: 60 },
        { type: 'personal_tick_elapsed', ticks: 400 },
      ],
    },
    {
      from_stage: 'obstacle',
      to_stage: 'goal_abandoned',
      conditions: [{ type: 'stress_threshold', min: 80 }],
    },
  ],

  assignment_rules: {
    cooldown_ticks: 4000,
  },
};

// =============================================================================
// SOCIAL CHALLENGES
// =============================================================================

export const standingUpForSelf: PlotLineTemplate = {
  id: 'small_standing_up',
  name: 'Finding Your Voice',
  description: 'Learning to stand up for yourself',
  scale: 'small',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Self-advocacy',
    domain: 'self',
    insight: 'Your voice matters. Use it.',
    wisdom_value: 4,
    repeatable: true,
  },

  entry_stage: 'pushed_around',
  completion_stages: ['voice_found'],
  failure_stages: ['still_silent'],

  stages: [
    {
      stage_id: 'pushed_around',
      name: 'Being Overlooked',
      description: 'Others dismiss or ignore you.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 15 },
      ],
    },
    {
      stage_id: 'resentment_building',
      name: 'Frustration Growing',
      description: 'Resentment builds inside.',
    },
    {
      stage_id: 'speaking_up',
      name: 'Finding Words',
      description: 'You begin to express yourself.',
    },
    {
      stage_id: 'voice_found',
      name: 'Voice Discovered',
      description: 'You have learned to advocate for yourself.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 25 },
        { type: 'modify_stress', delta: -20 },
      ],
    },
    {
      stage_id: 'still_silent',
      name: 'Voice Suppressed',
      description: 'You remained silent.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 10 },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'pushed_around',
      to_stage: 'resentment_building',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 500 }],
    },
    {
      from_stage: 'resentment_building',
      to_stage: 'speaking_up',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 8 },
        { type: 'stress_threshold', min: 30 },
      ],
    },
    {
      from_stage: 'speaking_up',
      to_stage: 'voice_found',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 600 }],
    },
    {
      from_stage: 'resentment_building',
      to_stage: 'still_silent',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 3000 }],
    },
  ],

  assignment_rules: {
    triggers: [
      { type: 'on_relationship_change', delta_threshold: -15 },
    ],
    cooldown_ticks: 6000,
  },
};

export const makingAmends: PlotLineTemplate = {
  id: 'small_making_amends',
  name: 'Making Things Right',
  description: 'Apologizing and making amends for a wrong',
  scale: 'small',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Accountability and repair',
    domain: 'relationships',
    insight: 'A sincere apology is a gift of humility.',
    wisdom_value: 4,
    repeatable: true,
  },

  entry_stage: 'guilt',
  completion_stages: ['amends_made'],
  failure_stages: ['guilt_unresolved'],

  stages: [
    {
      stage_id: 'guilt',
      name: 'Carrying Guilt',
      description: 'You know you did wrong.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 15 },
        { type: 'modify_mood', delta: -10 },
      ],
    },
    {
      stage_id: 'preparing',
      name: 'Planning Amends',
      description: 'You consider how to make things right.',
    },
    {
      stage_id: 'apologizing',
      name: 'Offering Apology',
      description: 'You reach out to apologize.',
    },
    {
      stage_id: 'amends_made',
      name: 'Forgiveness Received',
      description: 'Your apology was accepted.',
      on_enter_effects: [
        { type: 'modify_stress', delta: -25 },
        { type: 'modify_mood', delta: 20 },
        { type: 'modify_relationship_by_role', role: 'wronged', trust_delta: 10, affinity_delta: 5 },
      ],
    },
    {
      stage_id: 'guilt_unresolved',
      name: 'Unforgiven',
      description: 'The wrong remains unaddressed.',
      on_enter_effects: [
        { type: 'add_trauma', trauma_type: 'guilt', severity: 0.3 },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'guilt',
      to_stage: 'preparing',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 10 },
        { type: 'personal_tick_elapsed', ticks: 400 },
      ],
    },
    {
      from_stage: 'preparing',
      to_stage: 'apologizing',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 500 }],
    },
    {
      from_stage: 'apologizing',
      to_stage: 'amends_made',
      conditions: [
        { type: 'has_relationship_with_role', role: 'wronged', min_trust: 15 },
      ],
    },
    {
      from_stage: 'apologizing',
      to_stage: 'guilt_unresolved',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 2000 }],
    },
    {
      from_stage: 'guilt',
      to_stage: 'guilt_unresolved',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 5000 }],
    },
  ],

  assignment_rules: {
    trigger_bindings: [
      { role: 'wronged', source: 'lowest_trust' },
    ],
    cooldown_ticks: 6000,
  },
};

// =============================================================================
// CHANGE & TRANSITION
// =============================================================================

export const adaptingToChange: PlotLineTemplate = {
  id: 'small_adapting_change',
  name: 'When Things Change',
  description: 'Adjusting to significant life changes',
  scale: 'small',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Flexibility and resilience',
    domain: 'self',
    insight: 'Change is the only constant. Embrace it.',
    wisdom_value: 4,
    repeatable: true,
  },

  entry_stage: 'disrupted',
  completion_stages: ['adapted'],
  failure_stages: ['struggling'],

  stages: [
    {
      stage_id: 'disrupted',
      name: 'Life Disrupted',
      description: 'Something fundamental has changed.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 20 },
      ],
    },
    {
      stage_id: 'resisting',
      name: 'Resisting Change',
      description: 'You fight against the new reality.',
    },
    {
      stage_id: 'accepting',
      name: 'Beginning to Accept',
      description: 'Resistance fades as acceptance grows.',
    },
    {
      stage_id: 'adapted',
      name: 'Change Integrated',
      description: 'The new normal has become comfortable.',
      on_enter_effects: [
        { type: 'modify_stress', delta: -25 },
        { type: 'modify_mood', delta: 15 },
      ],
    },
    {
      stage_id: 'struggling',
      name: 'Still Struggling',
      description: 'Adaptation remains difficult.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 10 },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'disrupted',
      to_stage: 'resisting',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 300 }],
    },
    {
      from_stage: 'resisting',
      to_stage: 'accepting',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 12 },
        { type: 'personal_tick_elapsed', ticks: 800 },
      ],
    },
    {
      from_stage: 'accepting',
      to_stage: 'adapted',
      conditions: [
        { type: 'stress_threshold', max: 50 },
        { type: 'personal_tick_elapsed', ticks: 1000 },
      ],
    },
    {
      from_stage: 'resisting',
      to_stage: 'struggling',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 4000 }],
    },
  ],

  assignment_rules: {
    triggers: [
      { type: 'on_trauma', trauma_type: 'loss' },
    ],
    cooldown_ticks: 8000,
  },
};

export const breakingHabit: PlotLineTemplate = {
  id: 'small_breaking_habit',
  name: 'Breaking Free',
  description: 'Overcoming a harmful habit',
  scale: 'small',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Self-control and change',
    domain: 'self',
    insight: 'Habits can be rewritten with persistence.',
    wisdom_value: 4,
    repeatable: true,
  },

  entry_stage: 'trapped',
  completion_stages: ['free'],
  failure_stages: ['relapsed'],

  stages: [
    {
      stage_id: 'trapped',
      name: 'Caught in Pattern',
      description: 'A harmful habit controls you.',
    },
    {
      stage_id: 'attempting',
      name: 'Trying to Stop',
      description: 'You are actively fighting the habit.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 15 },
      ],
    },
    {
      stage_id: 'struggling',
      name: 'The Struggle',
      description: 'Some days are harder than others.',
    },
    {
      stage_id: 'free',
      name: 'Habit Broken',
      description: 'You have freed yourself from the pattern.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 30 },
        { type: 'modify_stress', delta: -20 },
      ],
    },
    {
      stage_id: 'relapsed',
      name: 'Fallen Back',
      description: 'The habit proved too strong.',
      on_enter_effects: [
        { type: 'modify_mood', delta: -15 },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'trapped',
      to_stage: 'attempting',
      conditions: [{ type: 'wisdom_threshold', min_wisdom: 8 }],
    },
    {
      from_stage: 'attempting',
      to_stage: 'struggling',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 600 }],
    },
    {
      from_stage: 'struggling',
      to_stage: 'free',
      conditions: [
        { type: 'stress_threshold', max: 50 },
        { type: 'personal_tick_elapsed', ticks: 2000 },
      ],
    },
    {
      from_stage: 'struggling',
      to_stage: 'relapsed',
      conditions: [{ type: 'stress_threshold', min: 80 }],
    },
    {
      from_stage: 'attempting',
      to_stage: 'relapsed',
      conditions: [{ type: 'stress_threshold', min: 90 }],
    },
  ],

  assignment_rules: {
    cooldown_ticks: 7000,
  },
};

// =============================================================================
// TRUST & VULNERABILITY
// =============================================================================

export const openingUp: PlotLineTemplate = {
  id: 'small_opening_up',
  name: 'Letting Someone In',
  description: 'Sharing something vulnerable with another',
  scale: 'small',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Vulnerability and connection',
    domain: 'relationships',
    insight: 'Vulnerability is the birthplace of connection.',
    wisdom_value: 4,
    repeatable: true,
  },

  entry_stage: 'guarded',
  completion_stages: ['opened'],
  failure_stages: ['stayed_closed'],

  stages: [
    {
      stage_id: 'guarded',
      name: 'Walls Up',
      description: 'You keep your true self hidden.',
    },
    {
      stage_id: 'considering',
      name: 'Considering Trust',
      description: 'You wonder if you can trust someone.',
    },
    {
      stage_id: 'sharing',
      name: 'Taking the Risk',
      description: 'You share something vulnerable.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 10 },
      ],
    },
    {
      stage_id: 'opened',
      name: 'Trust Rewarded',
      description: 'Your vulnerability was met with acceptance.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 25 },
        { type: 'modify_relationship_by_role', role: 'confidant', trust_delta: 20, affinity_delta: 15 },
        { type: 'modify_stress', delta: -20 },
      ],
    },
    {
      stage_id: 'stayed_closed',
      name: 'Walls Remain',
      description: 'You could not bring yourself to open up.',
    },
  ],

  transitions: [
    {
      from_stage: 'guarded',
      to_stage: 'considering',
      conditions: [{ type: 'any_relationship', min_trust: 35 }],
    },
    {
      from_stage: 'considering',
      to_stage: 'sharing',
      conditions: [
        { type: 'has_relationship_with_role', role: 'confidant', min_trust: 45 },
        { type: 'wisdom_threshold', min_wisdom: 12 },
      ],
    },
    {
      from_stage: 'sharing',
      to_stage: 'opened',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 400 }],
      probability: 0.8,
    },
    {
      from_stage: 'sharing',
      to_stage: 'stayed_closed',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 800 }],
    },
    {
      from_stage: 'considering',
      to_stage: 'stayed_closed',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 3000 }],
    },
  ],

  assignment_rules: {
    trigger_bindings: [
      { role: 'confidant', source: 'highest_trust' },
    ],
    cooldown_ticks: 6000,
  },
};

export const trustingAgain: PlotLineTemplate = {
  id: 'small_trusting_again',
  name: 'Learning to Trust Again',
  description: 'Rebuilding capacity for trust after betrayal',
  scale: 'small',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Resilience of trust',
    domain: 'relationships',
    insight: 'One betrayal need not end all trust.',
    wisdom_value: 5,
    repeatable: true,
  },

  entry_stage: 'betrayed',
  completion_stages: ['trusting_again'],
  failure_stages: ['trust_broken'],

  stages: [
    {
      stage_id: 'betrayed',
      name: 'Trust Shattered',
      description: 'Someone betrayed your trust.',
      on_enter_effects: [
        { type: 'add_trauma', trauma_type: 'betrayal', severity: 0.4 },
        { type: 'modify_stress', delta: 25 },
      ],
    },
    {
      stage_id: 'withdrawing',
      name: 'Pulling Back',
      description: 'You withdraw from others.',
    },
    {
      stage_id: 'cautious_opening',
      name: 'Careful Steps',
      description: 'You begin to trust again, carefully.',
    },
    {
      stage_id: 'trusting_again',
      name: 'Trust Restored',
      description: 'You have learned to trust again.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 20 },
        { type: 'modify_stress', delta: -20 },
      ],
    },
    {
      stage_id: 'trust_broken',
      name: 'Trust Damaged',
      description: 'The capacity for trust remains wounded.',
      on_enter_effects: [
        { type: 'add_trauma', trauma_type: 'betrayal', severity: 0.2 },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'betrayed',
      to_stage: 'withdrawing',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 500 }],
    },
    {
      from_stage: 'withdrawing',
      to_stage: 'cautious_opening',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 15 },
        { type: 'personal_tick_elapsed', ticks: 1500 },
      ],
    },
    {
      from_stage: 'cautious_opening',
      to_stage: 'trusting_again',
      conditions: [
        { type: 'any_relationship', min_trust: 40 },
        { type: 'personal_tick_elapsed', ticks: 1000 },
      ],
    },
    {
      from_stage: 'withdrawing',
      to_stage: 'trust_broken',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 6000 }],
    },
  ],

  assignment_rules: {
    triggers: [
      { type: 'on_trauma', trauma_type: 'betrayal' },
    ],
    cooldown_ticks: 10000,
  },
};

// =============================================================================
// COMMUNITY & BELONGING
// =============================================================================

export const findingBelonging: PlotLineTemplate = {
  id: 'small_finding_belonging',
  name: 'Finding Your Place',
  description: 'Discovering where you belong in a community',
  scale: 'small',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Belonging and identity',
    domain: 'relationships',
    insight: 'Belonging is not given but grown through participation.',
    wisdom_value: 4,
    repeatable: false,
  },

  entry_stage: 'outsider',
  completion_stages: ['belonging'],
  failure_stages: ['still_outside'],

  stages: [
    {
      stage_id: 'outsider',
      name: 'On the Outside',
      description: 'You feel like you do not belong anywhere.',
      on_enter_effects: [
        { type: 'modify_mood', delta: -10 },
      ],
    },
    {
      stage_id: 'observing',
      name: 'Watching From Afar',
      description: 'You watch others interact, wondering if you could join.',
    },
    {
      stage_id: 'participating',
      name: 'Taking Part',
      description: 'You begin to participate in community life.',
      stage_attractors: [
        {
          attractor_id: 'build_connections',
          goal: { type: 'relationship_formed', parameters: {} },
          strength: 0.4,
          urgency: 0.4,
        },
      ],
    },
    {
      stage_id: 'belonging',
      name: 'Part of Something',
      description: 'You have found your place.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 30 },
        { type: 'modify_mood_factor', factor: 'social', delta: 25 },
        { type: 'prophetic_dream', vision_content: 'You see yourself surrounded by faces that know you, a place that feels like home', urgency: 'medium' },
      ],
    },
    {
      stage_id: 'still_outside',
      name: 'Still Alone',
      description: 'Belonging remains elusive.',
      on_enter_effects: [
        { type: 'modify_mood', delta: -15 },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'outsider',
      to_stage: 'observing',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 500 }],
    },
    {
      from_stage: 'observing',
      to_stage: 'participating',
      conditions: [{ type: 'any_relationship', min_trust: 15 }],
    },
    {
      from_stage: 'participating',
      to_stage: 'belonging',
      conditions: [
        { type: 'any_relationship', min_trust: 40, min_affinity: 25 },
        { type: 'personal_tick_elapsed', ticks: 2000 },
      ],
    },
    {
      from_stage: 'observing',
      to_stage: 'still_outside',
      conditions: [{ type: 'social_isolation', min_ticks: 3000 }],
    },
  ],

  assignment_rules: {
    triggers: [
      { type: 'on_social_isolation', min_ticks: 1000 },
    ],
    max_concurrent: 1,
    cooldown_ticks: 10000,
  },
};

export const helpingStranger: PlotLineTemplate = {
  id: 'small_helping_stranger',
  name: 'A Stranger in Need',
  description: 'Going out of your way to help someone you do not know',
  scale: 'small',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Compassion without expectation',
    domain: 'relationships',
    insight: 'Kindness to strangers reflects our deepest humanity.',
    wisdom_value: 3,
    repeatable: true,
  },

  entry_stage: 'stranger_in_need',
  completion_stages: ['helped'],
  failure_stages: ['walked_past'],

  stages: [
    {
      stage_id: 'stranger_in_need',
      name: 'Someone Needs Help',
      description: 'A stranger needs assistance.',
    },
    {
      stage_id: 'considering',
      name: 'Should I Help?',
      description: 'You consider whether to get involved.',
    },
    {
      stage_id: 'helping',
      name: 'Lending Aid',
      description: 'You are helping the stranger.',
    },
    {
      stage_id: 'helped',
      name: 'Help Given',
      description: 'You helped someone with no expectation of return.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 20 },
        { type: 'modify_mood_factor', factor: 'social', delta: 10 },
      ],
    },
    {
      stage_id: 'walked_past',
      name: 'Passed By',
      description: 'You did not help.',
      on_enter_effects: [
        { type: 'modify_mood', delta: -5 },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'stranger_in_need',
      to_stage: 'considering',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 50 }],
    },
    {
      from_stage: 'considering',
      to_stage: 'helping',
      conditions: [{ type: 'mood_threshold', min: -10 }],
      probability: 0.6,
    },
    {
      from_stage: 'helping',
      to_stage: 'helped',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 300 }],
    },
    {
      from_stage: 'considering',
      to_stage: 'walked_past',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 200 }],
    },
  ],

  assignment_rules: {
    cooldown_ticks: 3000,
  },
};

// =============================================================================
// EXPORT ALL SMALL TEMPLATES
// =============================================================================

export const SMALL_PLOT_TEMPLATES: PlotLineTemplate[] = [
  // Relationships - Forming
  firstFriendship,
  healingRift,
  // Skill Development
  learningNewSkill,
  findingMentor,
  // Emotional Growth
  overcomingFear,
  processingGrief,
  // Self-Discovery
  findingPurpose,
  settingPersonalGoal,
  // Social Challenges
  standingUpForSelf,
  makingAmends,
  // Change & Transition
  adaptingToChange,
  breakingHabit,
  // Trust & Vulnerability
  openingUp,
  trustingAgain,
  // Community & Belonging
  findingBelonging,
  helpingStranger,
];

// Total: 16 small templates
