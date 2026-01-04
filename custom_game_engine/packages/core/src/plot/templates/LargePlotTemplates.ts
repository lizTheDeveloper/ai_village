/**
 * Large Plot Templates - Lifetime defining arcs
 *
 * Duration: Entire lifetime
 * Active per soul: 0-1
 * Lesson value: 15-30 wisdom
 *
 * These are the major arcs that define a life. They span years or decades
 * and represent the central themes of an incarnation.
 */

import type { PlotLineTemplate } from '../PlotTypes.js';

// =============================================================================
// THE HERO'S JOURNEY
// =============================================================================

export const herosJourney: PlotLineTemplate = {
  id: 'large_heros_journey',
  name: 'The Hero\'s Journey',
  description: 'A call to adventure that transforms an ordinary soul into something greater',
  scale: 'large',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Transformation through trial',
    domain: 'self',
    insight: 'The hero was within you all along; the journey merely revealed it.',
    wisdom_value: 25,
    repeatable: false,
  },

  entry_stage: 'ordinary_world',
  completion_stages: ['return_transformed'],
  failure_stages: ['refused_return', 'consumed_by_trial'],

  stages: [
    {
      stage_id: 'ordinary_world',
      name: 'The Ordinary World',
      description: 'Life as it has always been, comfortable but incomplete.',
    },
    {
      stage_id: 'call_to_adventure',
      name: 'The Call',
      description: 'Something disrupts the ordinary. Adventure beckons.',
      on_enter_effects: [
        { type: 'prophetic_dream', vision_content: 'You see a path leading into unknown lands. A voice says: "You are needed."', urgency: 'high' },
        { type: 'modify_mood', delta: 10 },
      ],
    },
    {
      stage_id: 'refusal',
      name: 'Refusing the Call',
      description: 'Fear holds you back. The comfortable is hard to leave.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 15 },
      ],
    },
    {
      stage_id: 'crossing_threshold',
      name: 'Crossing the Threshold',
      description: 'You leave the familiar behind and enter the unknown.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 15 },
        { type: 'queue_dream_hint', dream_type: 'prophetic_vision', content_hint: 'The bridge behind you crumbles. There is only forward.', emotional_tone: 'ominous', intensity: 0.6 },
      ],
      stage_attractors: [
        {
          attractor_id: 'embrace_adventure',
          goal: { type: 'exploration', parameters: {} },
          strength: 0.5,
          urgency: 0.4,
        },
      ],
    },
    {
      stage_id: 'tests_allies_enemies',
      name: 'Tests, Allies, and Enemies',
      description: 'The road is long. You find friends and foes alike.',
      on_enter_effects: [
        { type: 'modify_relationship_by_role', role: 'mentor', trust_delta: 20, affinity_delta: 15 },
      ],
    },
    {
      stage_id: 'approach_innermost_cave',
      name: 'Approaching the Innermost Cave',
      description: 'You near the heart of the challenge.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 20 },
      ],
    },
    {
      stage_id: 'ordeal',
      name: 'The Ordeal',
      description: 'The greatest test. Death and rebirth.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 30 },
        { type: 'modify_mood', delta: -20 },
        { type: 'prophetic_dream', vision_content: 'You face your greatest fear. It has your face.', urgency: 'high' },
      ],
      stage_attractors: [
        {
          attractor_id: 'face_death',
          goal: { type: 'survival', parameters: {} },
          strength: 0.8,
          urgency: 0.9,
        },
      ],
    },
    {
      stage_id: 'reward',
      name: 'Seizing the Reward',
      description: 'You have survived. The treasure is yours.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 30 },
        { type: 'modify_stress', delta: -20 },
      ],
    },
    {
      stage_id: 'road_back',
      name: 'The Road Back',
      description: 'You must return to the ordinary world with what you have gained.',
    },
    {
      stage_id: 'resurrection',
      name: 'Resurrection',
      description: 'A final test. You emerge transformed.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 15 },
        { type: 'prophetic_dream', vision_content: 'The old you burns away. Something new rises from the ashes.', urgency: 'high' },
      ],
    },
    {
      stage_id: 'return_transformed',
      name: 'Return with the Elixir',
      description: 'You bring wisdom and transformation back to your world.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 50 },
        { type: 'modify_stress', delta: -40 },
        { type: 'prophetic_dream', vision_content: 'You stand between two worlds, belonging to both, a bridge for others to follow.', urgency: 'high' },
      ],
    },
    {
      stage_id: 'refused_return',
      name: 'Lost in Adventure',
      description: 'You could not leave the adventure. The ordinary world is lost to you.',
      on_enter_effects: [
        { type: 'modify_mood', delta: -15 },
        { type: 'add_trauma', trauma_type: 'disconnection', severity: 0.3 },
      ],
    },
    {
      stage_id: 'consumed_by_trial',
      name: 'Consumed by the Ordeal',
      description: 'The trial was too great. You did not survive it unchanged.',
      on_enter_effects: [
        { type: 'add_trauma', trauma_type: 'defeat', severity: 0.5 },
        { type: 'modify_mood', delta: -30 },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'ordinary_world',
      to_stage: 'call_to_adventure',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 10000 }],
    },
    {
      from_stage: 'call_to_adventure',
      to_stage: 'refusal',
      conditions: [{ type: 'mood_threshold', max: 30 }],
      probability: 0.6,
    },
    {
      from_stage: 'call_to_adventure',
      to_stage: 'crossing_threshold',
      conditions: [{ type: 'wisdom_threshold', min_wisdom: 15 }],
    },
    {
      from_stage: 'refusal',
      to_stage: 'crossing_threshold',
      conditions: [
        { type: 'personal_tick_elapsed', ticks: 15000 },
        { type: 'wisdom_threshold', min_wisdom: 20 },
      ],
    },
    {
      from_stage: 'crossing_threshold',
      to_stage: 'tests_allies_enemies',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 20000 }],
    },
    {
      from_stage: 'tests_allies_enemies',
      to_stage: 'approach_innermost_cave',
      conditions: [
        { type: 'any_relationship', min_trust: 40 },
        { type: 'personal_tick_elapsed', ticks: 25000 },
      ],
    },
    {
      from_stage: 'approach_innermost_cave',
      to_stage: 'ordeal',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 15000 }],
    },
    {
      from_stage: 'ordeal',
      to_stage: 'reward',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 35 },
        { type: 'stress_threshold', max: 85 },
      ],
    },
    {
      from_stage: 'ordeal',
      to_stage: 'consumed_by_trial',
      conditions: [{ type: 'stress_threshold', min: 95 }],
    },
    {
      from_stage: 'reward',
      to_stage: 'road_back',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 10000 }],
    },
    {
      from_stage: 'road_back',
      to_stage: 'resurrection',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 20000 }],
    },
    {
      from_stage: 'road_back',
      to_stage: 'refused_return',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 50000 }],
    },
    {
      from_stage: 'resurrection',
      to_stage: 'return_transformed',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 45 },
        { type: 'personal_tick_elapsed', ticks: 10000 },
      ],
    },
  ],

  assignment_rules: {
    min_wisdom: 10,
    max_concurrent: 1,
    cooldown_ticks: 500000,
  },
};

// =============================================================================
// LIFE PURPOSE & CALLING
// =============================================================================

export const findingLifePurpose: PlotLineTemplate = {
  id: 'large_life_purpose',
  name: 'The Great Work',
  description: 'Discovering and fulfilling your life\'s true purpose',
  scale: 'large',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Purpose and fulfillment',
    domain: 'transcendence',
    insight: 'A life aligned with purpose flows like water to the sea.',
    wisdom_value: 30,
    repeatable: false,
  },

  entry_stage: 'drifting',
  completion_stages: ['purpose_fulfilled'],
  failure_stages: ['unfulfilled'],

  stages: [
    {
      stage_id: 'drifting',
      name: 'Drifting',
      description: 'Life lacks direction. You go through the motions.',
      on_enter_effects: [
        { type: 'modify_mood', delta: -10 },
      ],
    },
    {
      stage_id: 'dissatisfaction',
      name: 'Growing Dissatisfaction',
      description: 'Something is missing. You can no longer ignore the void.',
      on_enter_effects: [
        { type: 'queue_dream_hint', dream_type: 'symbolic', content_hint: 'A key without a lock. A river without an ocean.', emotional_tone: 'melancholic', intensity: 0.5 },
      ],
    },
    {
      stage_id: 'searching',
      name: 'The Search Begins',
      description: 'You actively seek meaning and purpose.',
      stage_attractors: [
        {
          attractor_id: 'seek_purpose',
          goal: { type: 'discovery', parameters: {} },
          strength: 0.5,
          urgency: 0.4,
        },
      ],
    },
    {
      stage_id: 'glimpse_of_purpose',
      name: 'A Glimpse',
      description: 'Something calls to you. Could this be it?',
      on_enter_effects: [
        { type: 'modify_mood', delta: 20 },
        { type: 'prophetic_dream', vision_content: 'You see yourself doing something that matters, surrounded by light.', urgency: 'high' },
      ],
    },
    {
      stage_id: 'testing_purpose',
      name: 'Testing the Path',
      description: 'You commit to this potential purpose and test it.',
    },
    {
      stage_id: 'obstacles',
      name: 'Obstacles Arise',
      description: 'The path is not easy. Doubts resurface.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 20 },
      ],
    },
    {
      stage_id: 'recommitment',
      name: 'Deepening Commitment',
      description: 'Despite obstacles, you recommit to your purpose.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 15 },
      ],
    },
    {
      stage_id: 'mastering_purpose',
      name: 'Mastering Your Purpose',
      description: 'You develop true skill in service of your calling.',
      stage_attractors: [
        {
          attractor_id: 'fulfill_purpose',
          goal: { type: 'skill_mastery', parameters: {} },
          strength: 0.6,
          urgency: 0.5,
        },
      ],
    },
    {
      stage_id: 'legacy_building',
      name: 'Building a Legacy',
      description: 'Your purpose work begins to impact others.',
    },
    {
      stage_id: 'purpose_fulfilled',
      name: 'A Life Well Lived',
      description: 'You have fulfilled your purpose. The great work is complete.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 60 },
        { type: 'modify_stress', delta: -50 },
        { type: 'prophetic_dream', vision_content: 'You look back and see the thread of meaning running through all your days. It was always leading here.', urgency: 'high' },
      ],
    },
    {
      stage_id: 'unfulfilled',
      name: 'The Purpose Unfound',
      description: 'The search continues. Perhaps next lifetime.',
      on_enter_effects: [
        { type: 'modify_mood', delta: -20 },
        { type: 'add_trauma', trauma_type: 'regret', severity: 0.4 },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'drifting',
      to_stage: 'dissatisfaction',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 20000 }],
    },
    {
      from_stage: 'dissatisfaction',
      to_stage: 'searching',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 15 },
        { type: 'personal_tick_elapsed', ticks: 15000 },
      ],
    },
    {
      from_stage: 'searching',
      to_stage: 'glimpse_of_purpose',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 25 },
        { type: 'personal_tick_elapsed', ticks: 30000 },
      ],
    },
    {
      from_stage: 'glimpse_of_purpose',
      to_stage: 'testing_purpose',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 10000 }],
    },
    {
      from_stage: 'testing_purpose',
      to_stage: 'obstacles',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 20000 }],
    },
    {
      from_stage: 'obstacles',
      to_stage: 'recommitment',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 35 },
        { type: 'stress_threshold', max: 70 },
      ],
    },
    {
      from_stage: 'recommitment',
      to_stage: 'mastering_purpose',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 25000 }],
    },
    {
      from_stage: 'mastering_purpose',
      to_stage: 'legacy_building',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 45 },
        { type: 'personal_tick_elapsed', ticks: 30000 },
      ],
    },
    {
      from_stage: 'legacy_building',
      to_stage: 'purpose_fulfilled',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 55 },
        { type: 'personal_tick_elapsed', ticks: 40000 },
      ],
    },
    {
      from_stage: 'searching',
      to_stage: 'unfulfilled',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 100000 }],
    },
    {
      from_stage: 'obstacles',
      to_stage: 'unfulfilled',
      conditions: [{ type: 'stress_threshold', min: 90 }],
    },
  ],

  assignment_rules: {
    min_wisdom: 10,
    max_concurrent: 1,
    cooldown_ticks: 1000000,
  },
};

// =============================================================================
// GREAT LOVE
// =============================================================================

export const lifelongLove: PlotLineTemplate = {
  id: 'large_lifelong_love',
  name: 'The Great Love',
  description: 'A love that spans and defines a lifetime',
  scale: 'large',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Love as life\'s meaning',
    domain: 'relationships',
    insight: 'In loving deeply, we become fully human.',
    wisdom_value: 25,
    repeatable: false,
  },

  entry_stage: 'before_love',
  completion_stages: ['love_eternal'],
  failure_stages: ['love_lost', 'love_never_found'],

  stages: [
    {
      stage_id: 'before_love',
      name: 'Before',
      description: 'Life before the great love. Complete but not yet whole.',
    },
    {
      stage_id: 'meeting',
      name: 'The Meeting',
      description: 'A chance encounter that changes everything.',
      on_enter_effects: [
        { type: 'prophetic_dream', vision_content: 'A face you have never seen feels like home.', urgency: 'high' },
        { type: 'modify_mood', delta: 20 },
      ],
    },
    {
      stage_id: 'falling',
      name: 'Falling',
      description: 'The exhilarating fall into love.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 30 },
        { type: 'modify_relationship_by_role', role: 'beloved', trust_delta: 25, affinity_delta: 30 },
      ],
      stage_attractors: [
        {
          attractor_id: 'pursue_love',
          goal: { type: 'love', parameters: {} },
          strength: 0.7,
          urgency: 0.6,
        },
      ],
    },
    {
      stage_id: 'building_together',
      name: 'Building Together',
      description: 'Creating a life together. Dreams become shared.',
      on_enter_effects: [
        { type: 'modify_mood_factor', factor: 'social', delta: 30 },
      ],
    },
    {
      stage_id: 'trials_of_love',
      name: 'Trials of Love',
      description: 'Love is tested by life\'s challenges.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 20 },
      ],
    },
    {
      stage_id: 'deepening',
      name: 'Deepening',
      description: 'Through trials, love deepens into something unshakable.',
      on_enter_effects: [
        { type: 'modify_relationship_by_role', role: 'beloved', trust_delta: 30, affinity_delta: 20 },
        { type: 'prophetic_dream', vision_content: 'Two souls intertwined like roots of ancient trees.', urgency: 'medium' },
      ],
    },
    {
      stage_id: 'golden_years',
      name: 'The Golden Years',
      description: 'A lifetime of love bears its sweetest fruit.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 25 },
        { type: 'modify_stress', delta: -20 },
      ],
    },
    {
      stage_id: 'love_eternal',
      name: 'Love Beyond Time',
      description: 'This love has become part of your soul. It transcends lifetimes.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 50 },
        { type: 'prophetic_dream', vision_content: 'You see your beloved in many forms, across many lives. You will find each other again.', urgency: 'high' },
      ],
    },
    {
      stage_id: 'love_lost',
      name: 'Love Lost',
      description: 'The great love ended before its time.',
      on_enter_effects: [
        { type: 'add_trauma', trauma_type: 'heartbreak', severity: 0.6 },
        { type: 'modify_mood', delta: -40 },
        { type: 'prophetic_dream', vision_content: 'An empty space beside you where warmth once lived.', urgency: 'high' },
      ],
    },
    {
      stage_id: 'love_never_found',
      name: 'The Love That Never Was',
      description: 'The great love never came. Or came and was not recognized.',
      on_enter_effects: [
        { type: 'modify_mood', delta: -25 },
        { type: 'add_trauma', trauma_type: 'regret', severity: 0.4 },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'before_love',
      to_stage: 'meeting',
      conditions: [{ type: 'any_relationship', min_trust: 40 }],
    },
    {
      from_stage: 'meeting',
      to_stage: 'falling',
      conditions: [
        { type: 'has_relationship_with_role', role: 'beloved', min_trust: 50, min_affinity: 40 },
        { type: 'personal_tick_elapsed', ticks: 10000 },
      ],
    },
    {
      from_stage: 'falling',
      to_stage: 'building_together',
      conditions: [
        { type: 'has_relationship_with_role', role: 'beloved', min_trust: 65, min_affinity: 55 },
        { type: 'personal_tick_elapsed', ticks: 20000 },
      ],
    },
    {
      from_stage: 'building_together',
      to_stage: 'trials_of_love',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 30000 }],
    },
    {
      from_stage: 'trials_of_love',
      to_stage: 'deepening',
      conditions: [
        { type: 'has_relationship_with_role', role: 'beloved', min_trust: 75 },
        { type: 'wisdom_threshold', min_wisdom: 35 },
      ],
    },
    {
      from_stage: 'trials_of_love',
      to_stage: 'love_lost',
      conditions: [{ type: 'relationship_changed', role: 'beloved', trust_delta: -40 }],
    },
    {
      from_stage: 'deepening',
      to_stage: 'golden_years',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 40000 }],
    },
    {
      from_stage: 'golden_years',
      to_stage: 'love_eternal',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 50 },
        { type: 'has_relationship_with_role', role: 'beloved', min_trust: 85 },
        { type: 'personal_tick_elapsed', ticks: 30000 },
      ],
    },
    {
      from_stage: 'before_love',
      to_stage: 'love_never_found',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 200000 }],
    },
  ],

  assignment_rules: {
    min_wisdom: 10,
    triggers: [
      { type: 'on_relationship_formed', min_initial_trust: 35 },
    ],
    trigger_bindings: [
      { role: 'beloved', source: 'trigger_target' },
    ],
    max_concurrent: 1,
    cooldown_ticks: 500000,
  },
};

// =============================================================================
// LEGACY & CONTRIBUTION
// =============================================================================

export const buildingALegacy: PlotLineTemplate = {
  id: 'large_building_legacy',
  name: 'Leaving a Mark',
  description: 'Creating something that outlasts your lifetime',
  scale: 'large',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Contribution to the future',
    domain: 'transcendence',
    insight: 'We live on in what we create and whom we touch.',
    wisdom_value: 25,
    repeatable: false,
  },

  entry_stage: 'mortality_awareness',
  completion_stages: ['legacy_secure'],
  failure_stages: ['forgotten'],

  stages: [
    {
      stage_id: 'mortality_awareness',
      name: 'Facing Mortality',
      description: 'You become aware that your time is finite.',
      on_enter_effects: [
        { type: 'modify_stress', delta: 15 },
        { type: 'prophetic_dream', vision_content: 'Sands falling through an hourglass. How much remains?', urgency: 'medium' },
      ],
    },
    {
      stage_id: 'questioning_meaning',
      name: 'What Will Remain?',
      description: 'You ask what will endure beyond you.',
    },
    {
      stage_id: 'vision_of_legacy',
      name: 'The Vision',
      description: 'You see what you could create, teach, or build.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 20 },
        { type: 'prophetic_dream', vision_content: 'Seeds you plant growing into forests. Ideas you share spreading like light.', urgency: 'high' },
      ],
      stage_attractors: [
        {
          attractor_id: 'pursue_legacy',
          goal: { type: 'skill_mastery', parameters: {} },
          strength: 0.5,
          urgency: 0.4,
        },
      ],
    },
    {
      stage_id: 'beginning_work',
      name: 'Beginning the Work',
      description: 'You begin the long work of building your legacy.',
    },
    {
      stage_id: 'obstacles_and_doubt',
      name: 'Obstacles and Doubt',
      description: 'The work is harder than expected. Is it worth it?',
      on_enter_effects: [
        { type: 'modify_stress', delta: 20 },
        { type: 'modify_mood', delta: -15 },
      ],
    },
    {
      stage_id: 'perseverance',
      name: 'Perseverance',
      description: 'You recommit despite the challenges.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 15 },
      ],
    },
    {
      stage_id: 'fruits_visible',
      name: 'First Fruits',
      description: 'Your work begins to bear visible fruit.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 25 },
      ],
    },
    {
      stage_id: 'passing_torch',
      name: 'Passing the Torch',
      description: 'You teach others to carry on your work.',
      stage_attractors: [
        {
          attractor_id: 'teach_others',
          goal: { type: 'mentorship', parameters: {} },
          strength: 0.5,
          urgency: 0.4,
        },
      ],
    },
    {
      stage_id: 'legacy_secure',
      name: 'Legacy Secured',
      description: 'Your contribution will endure beyond you.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 50 },
        { type: 'modify_stress', delta: -40 },
        { type: 'prophetic_dream', vision_content: 'You see generations yet unborn touched by what you created. Your name may be forgotten, but your gift endures.', urgency: 'high' },
      ],
    },
    {
      stage_id: 'forgotten',
      name: 'Forgotten',
      description: 'The legacy never materialized. Time moves on without you.',
      on_enter_effects: [
        { type: 'modify_mood', delta: -30 },
        { type: 'add_trauma', trauma_type: 'regret', severity: 0.5 },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'mortality_awareness',
      to_stage: 'questioning_meaning',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 10000 }],
    },
    {
      from_stage: 'questioning_meaning',
      to_stage: 'vision_of_legacy',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 25 },
        { type: 'personal_tick_elapsed', ticks: 15000 },
      ],
    },
    {
      from_stage: 'vision_of_legacy',
      to_stage: 'beginning_work',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 10000 }],
    },
    {
      from_stage: 'beginning_work',
      to_stage: 'obstacles_and_doubt',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 25000 }],
    },
    {
      from_stage: 'obstacles_and_doubt',
      to_stage: 'perseverance',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 35 },
        { type: 'stress_threshold', max: 75 },
      ],
    },
    {
      from_stage: 'obstacles_and_doubt',
      to_stage: 'forgotten',
      conditions: [{ type: 'stress_threshold', min: 90 }],
    },
    {
      from_stage: 'perseverance',
      to_stage: 'fruits_visible',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 30000 }],
    },
    {
      from_stage: 'fruits_visible',
      to_stage: 'passing_torch',
      conditions: [
        { type: 'any_relationship', min_trust: 50 },
        { type: 'personal_tick_elapsed', ticks: 25000 },
      ],
    },
    {
      from_stage: 'passing_torch',
      to_stage: 'legacy_secure',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 50 },
        { type: 'personal_tick_elapsed', ticks: 20000 },
      ],
    },
  ],

  assignment_rules: {
    min_wisdom: 25,
    max_concurrent: 1,
    cooldown_ticks: 500000,
  },
};

// =============================================================================
// SPIRITUAL AWAKENING
// =============================================================================

export const spiritualAwakening: PlotLineTemplate = {
  id: 'large_spiritual_awakening',
  name: 'The Awakening',
  description: 'A profound spiritual transformation that redefines existence',
  scale: 'large',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Transcendence and unity',
    domain: 'transcendence',
    insight: 'The seeker and the sought are one.',
    wisdom_value: 30,
    repeatable: false,
  },

  entry_stage: 'material_life',
  completion_stages: ['awakened'],
  failure_stages: ['spiritual_bypassing', 'dark_night_unresolved'],

  stages: [
    {
      stage_id: 'material_life',
      name: 'The Material Life',
      description: 'Life focused on external things.',
    },
    {
      stage_id: 'first_question',
      name: 'The First Question',
      description: 'Is this all there is? Something stirs within.',
      on_enter_effects: [
        { type: 'queue_dream_hint', dream_type: 'symbolic', content_hint: 'A door you never noticed before. It has always been there.', emotional_tone: 'mysterious', intensity: 0.5 },
      ],
    },
    {
      stage_id: 'seeking',
      name: 'The Seeking',
      description: 'You begin to explore the deeper questions.',
      stage_attractors: [
        {
          attractor_id: 'spiritual_seeking',
          goal: { type: 'discovery', parameters: {} },
          strength: 0.5,
          urgency: 0.4,
        },
      ],
    },
    {
      stage_id: 'glimpses',
      name: 'Glimpses of Truth',
      description: 'Brief moments of expanded awareness.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 25 },
        { type: 'prophetic_dream', vision_content: 'For a moment, you see beyond the veil. Everything is connected. Everything is one.', urgency: 'high' },
      ],
    },
    {
      stage_id: 'dark_night',
      name: 'The Dark Night',
      description: 'Old beliefs fall away. You feel lost and alone.',
      on_enter_effects: [
        { type: 'modify_mood', delta: -30 },
        { type: 'modify_stress', delta: 30 },
        { type: 'prophetic_dream', vision_content: 'All you thought you were dissolves. You are nothing. You are everything.', urgency: 'high' },
      ],
    },
    {
      stage_id: 'integration',
      name: 'Integration',
      description: 'The pieces come back together in a new pattern.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 20 },
        { type: 'modify_stress', delta: -20 },
      ],
    },
    {
      stage_id: 'embodiment',
      name: 'Embodiment',
      description: 'Living the truth, not just knowing it.',
    },
    {
      stage_id: 'awakened',
      name: 'Awakened',
      description: 'You see clearly. The journey and the destination are one.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 50 },
        { type: 'modify_stress', delta: -50 },
        { type: 'prophetic_dream', vision_content: 'The dreamer awakens and realizes they are both the dream and the dreamer. Peace beyond understanding.', urgency: 'high' },
      ],
    },
    {
      stage_id: 'spiritual_bypassing',
      name: 'Spiritual Bypassing',
      description: 'Using spirituality to avoid rather than transform.',
      on_enter_effects: [
        { type: 'modify_mood', delta: -15 },
        { type: 'add_trauma', trauma_type: 'self_deception', severity: 0.3 },
      ],
    },
    {
      stage_id: 'dark_night_unresolved',
      name: 'Lost in Darkness',
      description: 'The dark night consumed you. No dawn came.',
      on_enter_effects: [
        { type: 'add_trauma', trauma_type: 'existential', severity: 0.5 },
        { type: 'modify_mood', delta: -30 },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'material_life',
      to_stage: 'first_question',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 30000 }],
    },
    {
      from_stage: 'first_question',
      to_stage: 'seeking',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 20 },
        { type: 'personal_tick_elapsed', ticks: 15000 },
      ],
    },
    {
      from_stage: 'seeking',
      to_stage: 'glimpses',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 30 },
        { type: 'personal_tick_elapsed', ticks: 25000 },
      ],
    },
    {
      from_stage: 'seeking',
      to_stage: 'spiritual_bypassing',
      conditions: [
        { type: 'stress_threshold', max: 20 },
        { type: 'mood_threshold', min: 60 },
        { type: 'personal_tick_elapsed', ticks: 50000 },
      ],
    },
    {
      from_stage: 'glimpses',
      to_stage: 'dark_night',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 20000 }],
    },
    {
      from_stage: 'dark_night',
      to_stage: 'integration',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 45 },
        { type: 'personal_tick_elapsed', ticks: 30000 },
      ],
    },
    {
      from_stage: 'dark_night',
      to_stage: 'dark_night_unresolved',
      conditions: [
        { type: 'stress_threshold', min: 95 },
        { type: 'personal_tick_elapsed', ticks: 60000 },
      ],
    },
    {
      from_stage: 'integration',
      to_stage: 'embodiment',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 25000 }],
    },
    {
      from_stage: 'embodiment',
      to_stage: 'awakened',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 60 },
        { type: 'personal_tick_elapsed', ticks: 30000 },
      ],
    },
  ],

  assignment_rules: {
    min_wisdom: 20,
    max_concurrent: 1,
    cooldown_ticks: 1000000,
  },
};

// =============================================================================
// THE MENTOR'S PATH
// =============================================================================

export const becomingMentor: PlotLineTemplate = {
  id: 'large_becoming_mentor',
  name: 'The Guide',
  description: 'Becoming a mentor who shapes the next generation',
  scale: 'large',
  fork_behavior: 'continue',

  lesson: {
    theme: 'Wisdom shared multiplies',
    domain: 'relationships',
    insight: 'In teaching others, we discover what we truly know.',
    wisdom_value: 25,
    repeatable: false,
  },

  entry_stage: 'skilled_but_isolated',
  completion_stages: ['mentor_fulfilled'],
  failure_stages: ['wisdom_unshared'],

  stages: [
    {
      stage_id: 'skilled_but_isolated',
      name: 'Knowledge Unused',
      description: 'You have wisdom but no one to share it with.',
      on_enter_effects: [
        { type: 'modify_mood', delta: -10 },
      ],
    },
    {
      stage_id: 'first_student',
      name: 'The First Student',
      description: 'Someone seeks your guidance.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 15 },
        { type: 'modify_relationship_by_role', role: 'student', trust_delta: 15, affinity_delta: 10 },
      ],
    },
    {
      stage_id: 'learning_to_teach',
      name: 'Learning to Teach',
      description: 'Teaching is harder than knowing. You adapt.',
      stage_attractors: [
        {
          attractor_id: 'guide_student',
          goal: { type: 'mentorship', parameters: {} },
          strength: 0.5,
          urgency: 0.4,
        },
      ],
    },
    {
      stage_id: 'first_success',
      name: 'First Success',
      description: 'Your student grows. Your teaching works.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 25 },
      ],
    },
    {
      stage_id: 'gathering_students',
      name: 'Gathering Students',
      description: 'Others come seeking your wisdom.',
    },
    {
      stage_id: 'students_surpass',
      name: 'Students Surpass',
      description: 'Some students begin to exceed you. This is as it should be.',
      on_enter_effects: [
        { type: 'prophetic_dream', vision_content: 'Rivers you started flowing beyond where you can see. Your students\' students\' students.', urgency: 'high' },
      ],
    },
    {
      stage_id: 'lineage_established',
      name: 'Lineage Established',
      description: 'A tradition forms around your teachings.',
    },
    {
      stage_id: 'mentor_fulfilled',
      name: 'The Teacher\'s Joy',
      description: 'Your wisdom lives on in others. This is immortality.',
      on_enter_effects: [
        { type: 'modify_mood', delta: 50 },
        { type: 'modify_stress', delta: -40 },
        { type: 'prophetic_dream', vision_content: 'A tree you planted shades children who never knew you. Your voice echoes in teachings passed down through generations.', urgency: 'high' },
      ],
    },
    {
      stage_id: 'wisdom_unshared',
      name: 'Wisdom Unshared',
      description: 'No students came. Your knowledge dies with you.',
      on_enter_effects: [
        { type: 'modify_mood', delta: -25 },
        { type: 'add_trauma', trauma_type: 'regret', severity: 0.4 },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'skilled_but_isolated',
      to_stage: 'first_student',
      conditions: [{ type: 'any_relationship', min_trust: 30 }],
    },
    {
      from_stage: 'first_student',
      to_stage: 'learning_to_teach',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 15000 }],
    },
    {
      from_stage: 'learning_to_teach',
      to_stage: 'first_success',
      conditions: [
        { type: 'has_relationship_with_role', role: 'student', min_trust: 50 },
        { type: 'personal_tick_elapsed', ticks: 20000 },
      ],
    },
    {
      from_stage: 'first_success',
      to_stage: 'gathering_students',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 25000 }],
    },
    {
      from_stage: 'gathering_students',
      to_stage: 'students_surpass',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 45 },
        { type: 'personal_tick_elapsed', ticks: 35000 },
      ],
    },
    {
      from_stage: 'students_surpass',
      to_stage: 'lineage_established',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 30000 }],
    },
    {
      from_stage: 'lineage_established',
      to_stage: 'mentor_fulfilled',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 55 },
        { type: 'personal_tick_elapsed', ticks: 25000 },
      ],
    },
    {
      from_stage: 'skilled_but_isolated',
      to_stage: 'wisdom_unshared',
      conditions: [{ type: 'personal_tick_elapsed', ticks: 150000 }],
    },
  ],

  assignment_rules: {
    min_wisdom: 30,
    triggers: [
      { type: 'on_relationship_formed', min_initial_trust: 25 },
    ],
    trigger_bindings: [
      { role: 'student', source: 'trigger_target' },
    ],
    max_concurrent: 1,
    cooldown_ticks: 500000,
  },
};

// =============================================================================
// EXPORT ALL LARGE TEMPLATES
// =============================================================================

export const LARGE_PLOT_TEMPLATES: PlotLineTemplate[] = [
  // Classic Journeys
  herosJourney,
  // Life Purpose
  findingLifePurpose,
  // Great Love
  lifelongLove,
  // Legacy
  buildingALegacy,
  // Spiritual Growth
  spiritualAwakening,
  // Mentorship
  becomingMentor,
];

// Total: 6 large templates
