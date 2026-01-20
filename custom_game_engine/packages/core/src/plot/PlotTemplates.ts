/**
 * Plot Line Templates - Pre-defined narrative arcs
 *
 * Based on openspec/specs/soul-system/plot-lines-spec.md
 *
 * These templates define reusable plot structures that teach wisdom through
 * multi-stage narrative arcs. The PlotAssignmentSystem instantiates these
 * templates for individual souls.
 *
 * Templates are now loaded from JSON files via scale-specific loaders.
 */

import type { PlotLineTemplate } from './PlotTypes.js';
import { plotLineRegistry } from './PlotLineRegistry.js';

// Import all template loaders
import { MICRO_PLOT_TEMPLATES } from './templates/MicroPlotTemplates.js';
import { SMALL_PLOT_TEMPLATES } from './templates/SmallPlotTemplates.js';
import { MEDIUM_PLOT_TEMPLATES } from './templates/MediumPlotTemplates.js';
import { LARGE_PLOT_TEMPLATES } from './templates/LargePlotTemplates.js';
import { EXOTIC_PLOT_TEMPLATES } from './templates/ExoticPlotTemplates.js';
import { EPIC_PLOT_TEMPLATES } from './templates/EpicPlotTemplates.js';
import { ISEKAI_PLOT_TEMPLATES } from './templates/IsekaiPlotTemplates.js';

/**
 * MICRO: Moment of Courage
 *
 * A fleeting opportunity to act despite fear.
 * Duration: Minutes to hours
 * Lesson: Courage is not the absence of fear, but action despite it
 */
export const momentOfCourage: PlotLineTemplate = {
  id: 'moment_of_courage',
  name: 'The Brave Choice',
  description: 'A moment when fear arises and courage must answer',

  scale: 'micro',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Bravery in the moment',
    domain: 'self',
    insight: 'Courage is not the absence of fear, but action despite it.',
    wisdom_value: 1,
    repeatable: true,
  },

  entry_stage: 'fear_arises',
  completion_stages: ['courage_shown'],
  failure_stages: ['missed'],

  stages: [
    {
      stage_id: 'fear_arises',
      name: 'The Moment of Fear',
      description: 'A threat appears. Will you face it or flee?',
    },
    {
      stage_id: 'courage_shown',
      name: 'Lesson Learned',
      description: 'You faced the fear and found courage within.',
      on_enter_effects: [
        { type: 'learn_lesson', lesson_id: 'courage_in_small_things' }
      ],
    },
    {
      stage_id: 'missed',
      name: 'Opportunity Passed',
      description: 'Fear won this time, but there will be other chances.',
    }
  ],

  transitions: [
    {
      from_stage: 'fear_arises',
      to_stage: 'courage_shown',
      conditions: [
        { type: 'personal_tick_elapsed', ticks: 50 }
      ],
    },
    {
      from_stage: 'fear_arises',
      to_stage: 'missed',
      conditions: [
        { type: 'personal_tick_elapsed', ticks: 500 }
      ],
    }
  ],

  assignment_rules: {
    min_wisdom: 0,
  },
};

/**
 * SMALL: First Conversation
 *
 * Learning to engage with another agent meaningfully.
 * Duration: Days to weeks
 * Lesson: Communication builds understanding
 */
export const firstConversation: PlotLineTemplate = {
  id: 'first_conversation',
  name: 'Learning to Talk',
  description: 'The journey of having your first real conversation',

  scale: 'small',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Communication and connection',
    domain: 'relationships',
    insight: 'Words shared create bonds between souls.',
    wisdom_value: 3,
    repeatable: true,
  },

  entry_stage: 'isolated',
  completion_stages: ['conversed'],

  stages: [
    {
      stage_id: 'isolated',
      name: 'Before Speaking',
      description: 'You have not yet had a meaningful conversation.',
    },
    {
      stage_id: 'conversed',
      name: 'Words Exchanged',
      description: 'You have spoken with another and been heard.',
      on_enter_effects: [
        { type: 'learn_lesson', lesson_id: 'first_conversation_lesson' }
      ],
    }
  ],

  transitions: [
    {
      from_stage: 'isolated',
      to_stage: 'conversed',
      conditions: [
        { type: 'personal_tick_elapsed', ticks: 10000 }
      ],
    }
  ],

  assignment_rules: {
    min_wisdom: 0,
  },
};

/**
 * EPIC: Ascension Through Surrender
 *
 * The Great Work - transcending mortality through letting go.
 * Duration: Multiple lifetimes
 * Lesson: True power is earned through surrender of control
 */
export const ascensionThroughSurrender: PlotLineTemplate = {
  id: 'ascension_through_surrender',
  name: 'The Great Work',
  description: 'Rising beyond mortality by learning to let go',

  scale: 'epic',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Rising by letting go',
    domain: 'transcendence',
    insight: 'True power is earned through surrender of control.',
    wisdom_value: 100,
    repeatable: false,
  },

  entry_stage: 'mortal',
  completion_stages: ['transcended'],

  stages: [
    {
      stage_id: 'mortal',
      name: 'Mortal Existence',
      description: 'Living as a mortal, unaware of what lies beyond.',
    },
    {
      stage_id: 'seeking',
      name: 'The Search Begins',
      description: 'You sense there is more beyond the veil of mortality.',
    },
    {
      stage_id: 'trial',
      name: 'The Trial',
      description: 'You must prove your worthiness through sacrifice.',
    },
    {
      stage_id: 'witnessing',
      name: 'The Witnessing',
      description: 'Observe without intervention. Let go of control.',
    },
    {
      stage_id: 'transcended',
      name: 'Transcendence',
      description: 'You have shed mortality and risen beyond.',
      on_enter_effects: [
        { type: 'learn_lesson', lesson_id: 'transcendence_through_surrender' }
      ],
    }
  ],

  transitions: [
    {
      from_stage: 'mortal',
      to_stage: 'seeking',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 50 }
      ],
    },
    {
      from_stage: 'seeking',
      to_stage: 'trial',
      conditions: [
        { type: 'lesson_learned', lesson_id: 'impermanence' }
      ],
    },
    {
      from_stage: 'trial',
      to_stage: 'witnessing',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 80 }
      ],
    },
    {
      from_stage: 'witnessing',
      to_stage: 'transcended',
      conditions: [
        { type: 'personal_tick_elapsed', ticks: 50000 }
      ],
    }
  ],

  assignment_rules: {
    min_wisdom: 30,
    required_archetype: ['seeker'],
    required_interests: ['transcendence', 'wisdom'],
    forbidden_if_learned: ['transcendence_through_surrender'],
  },
};

/**
 * PoC plot templates - starting with simple ones
 * (Epic plots like ascensionThroughSurrender are defined but not registered yet)
 */
export const POC_PLOT_TEMPLATES: PlotLineTemplate[] = [
  momentOfCourage,
  firstConversation,
];

/**
 * All defined plot templates (loaded from JSON)
 */
export const ALL_PLOT_TEMPLATES: PlotLineTemplate[] = [
  ...MICRO_PLOT_TEMPLATES,
  ...SMALL_PLOT_TEMPLATES,
  ...MEDIUM_PLOT_TEMPLATES,
  ...LARGE_PLOT_TEMPLATES,
  ...EXOTIC_PLOT_TEMPLATES,
  ...EPIC_PLOT_TEMPLATES,
  ...ISEKAI_PLOT_TEMPLATES,
];

/**
 * Initialize plot templates - call this during game startup
 * Registers all plot templates from all scales (micro, small, medium, large, exotic, epic, isekai)
 */
export function initializePlotTemplates(): void {
  console.log(`[PlotTemplates] Registering ${ALL_PLOT_TEMPLATES.length} plot templates...`);
  plotLineRegistry.registerMany(ALL_PLOT_TEMPLATES);
  console.log(`[PlotTemplates] Registration complete - ${plotLineRegistry.getAllTemplates().length} templates available`);
}
