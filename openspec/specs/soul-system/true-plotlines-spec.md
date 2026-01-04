# True Plotlines Specification

## Overview

The current plot system defines narrative arcs as state machines with stages, transitions, and conditions. However, the available `PlotCondition` types cannot access the rich emotional systems already present in agents (MoodComponent, StressState, TraumaTypes, EmotionalState). This creates a disconnect: we have drama-capable agents but quest-like plots.

This spec defines the additions needed to support **true dramatic arcs** - plotlines that respond to and shape emotional states, relationships in flux, trauma and recovery, and the full spectrum of human experience.

## Current State

### What Agents Already Have

**MoodComponent** (`packages/core/src/components/MoodComponent.ts`):
```typescript
EmotionalState: 'content' | 'joyful' | 'excited' | 'melancholic' | 'anxious' |
                'nostalgic' | 'frustrated' | 'lonely' | 'proud' | 'grateful' |
                'enraged' | 'despairing' | 'manic' | 'obsessed' | 'terrified'

MoodFactors: {
  physical: number;      // -100 to 100
  foodSatisfaction: number;
  foodVariety: number;
  social: number;
  comfort: number;
  rest: number;
  achievement: number;
  environment: number;
}

StressState: {
  level: number;              // 0-100
  breakdownThreshold: number; // 50-90
  recentTraumas: Trauma[];
  inBreakdown: boolean;
  breakdownType?: BreakdownType;
}

TraumaType: 'death_witnessed' | 'death_of_friend' | 'injury_severe' |
            'starvation' | 'isolation' | 'failure_public' | 'betrayal' |
            'loss_of_home' | 'attack_survived'

BreakdownType: 'tantrum' | 'catatonic' | 'berserk' | 'strange_mood' |
               'depression' | 'panic_attack'
```

**RelationshipComponent**: Trust levels, affinity, interaction history

**EpisodicMemoryComponent**: Memory of significant events

**Events emitted**: `mood:changed`, `conversation:ended`, `relationship:changed`, etc.

### Current PlotCondition Types (Insufficient)

```typescript
PlotCondition =
  | { type: 'has_item'; item_id: string }
  | { type: 'at_location'; location: { x: number; y: number }; radius: number }
  | { type: 'has_relationship'; agent_id: string; min_trust: number }
  | { type: 'has_skill'; skill: string; min_level: number }
  | { type: 'wisdom_threshold'; min_wisdom: number }
  | { type: 'personal_tick_elapsed'; ticks: number }
  | { type: 'universe_tick_elapsed'; ticks: number }
  | { type: 'choice_made'; choice_id: string }
  | { type: 'lesson_learned'; lesson_id: string }
  | { type: 'custom'; check: (context: any) => boolean }
```

**Problem**: None of these can detect emotional states, trauma, stress, mood factors, or relationship changes.

---

## Phase 1: Emotional Condition Types

Add conditions that can read the existing emotional state:

### New PlotCondition Types

```typescript
// Check current emotional state
| { type: 'emotional_state'; state: EmotionalState; duration_ticks?: number }

// Check mood value threshold
| { type: 'mood_threshold'; min?: number; max?: number }  // -100 to 100

// Check specific mood factor
| { type: 'mood_factor'; factor: keyof MoodFactors; min?: number; max?: number }

// Check if agent has experienced specific trauma
| { type: 'has_trauma'; trauma_type: TraumaType; recency_ticks?: number }

// Check stress level
| { type: 'stress_threshold'; min?: number; max?: number }  // 0-100

// Check if in breakdown state
| { type: 'in_breakdown'; breakdown_type?: BreakdownType }

// Check if NOT in breakdown (recovered)
| { type: 'breakdown_recovered'; since_ticks?: number }
```

### Example: Grief's Passage

```typescript
const griefsPassage: PlotLineTemplate = {
  id: 'griefs_passage',
  name: "Grief's Passage",
  scale: 'small',

  lesson: {
    theme: 'Processing loss',
    domain: 'mortality',
    insight: 'Grief is the price of love, and love is worth the price.',
    wisdom_value: 8,
    repeatable: false,
  },

  // Assigned when agent experiences death_of_friend trauma
  assignment_rules: {
    trigger_on_trauma: 'death_of_friend',  // NEW: Event-based assignment
  },

  entry_stage: 'shock',
  completion_stages: ['acceptance'],

  stages: [
    {
      stage_id: 'shock',
      name: 'The Numbness',
      description: 'The world feels unreal. They cannot be gone.',
    },
    {
      stage_id: 'denial',
      name: 'Refusing Truth',
      description: 'Perhaps there was a mistake. Perhaps they will return.',
    },
    {
      stage_id: 'anger',
      name: 'The Fury',
      description: 'Why them? Why now? This is unfair.',
    },
    {
      stage_id: 'bargaining',
      name: 'If Only',
      description: 'What could I have done differently? What would I give to change this?',
    },
    {
      stage_id: 'depression',
      name: 'The Depths',
      description: 'The weight of loss presses down. Everything feels meaningless.',
    },
    {
      stage_id: 'acceptance',
      name: 'Carrying Forward',
      description: 'They are gone, but they are not forgotten. Life continues, changed.',
      on_enter_effects: [
        { type: 'learn_lesson', lesson_id: 'grief_acceptance' },
        { type: 'modify_stress', delta: -20 },  // NEW effect type
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'shock',
      to_stage: 'denial',
      conditions: [
        { type: 'personal_tick_elapsed', ticks: 100 },
      ],
    },
    {
      from_stage: 'denial',
      to_stage: 'anger',
      conditions: [
        { type: 'emotional_state', state: 'frustrated', duration_ticks: 50 },
      ],
    },
    {
      from_stage: 'anger',
      to_stage: 'bargaining',
      conditions: [
        { type: 'mood_factor', factor: 'social', min: -30 },  // Some social support
      ],
    },
    {
      from_stage: 'bargaining',
      to_stage: 'depression',
      conditions: [
        { type: 'mood_threshold', max: -20 },
      ],
    },
    {
      from_stage: 'depression',
      to_stage: 'acceptance',
      conditions: [
        { type: 'personal_tick_elapsed', ticks: 500 },
        { type: 'mood_threshold', min: -40 },  // Not in deepest despair
        { type: 'wisdom_threshold', min_wisdom: 5 },  // Some wisdom to process
      ],
    },
  ],
};
```

---

## Phase 2: Relationship Dynamics

### New PlotCondition Types for Relationships

```typescript
// Relationship trust changed significantly (for betrayal detection)
| {
    type: 'relationship_changed';
    role: string;  // 'betrayer' | 'betrayed' | 'rival' | 'friend'
    delta_threshold: number;  // e.g., -50 for major trust drop
    recency_ticks?: number;
  }

// Dynamic agent reference (not hardcoded ID)
| {
    type: 'has_relationship_with_role';
    role: string;  // Bound at plot instantiation
    min_trust?: number;
    max_trust?: number;
  }

// Social isolation
| { type: 'social_isolation'; min_ticks: number }  // No positive interactions

// Any relationship above/below threshold
| { type: 'any_relationship_trust'; min?: number; max?: number }
```

### Plot Parameters for Dynamic Binding

```typescript
interface PlotLineInstance {
  // ... existing fields ...

  // Bound parameters for dynamic agent references
  bound_agents: {
    [role: string]: string;  // role -> entity_id
  };
}
```

### Example: The Falling Out

```typescript
const theFallingOut: PlotLineTemplate = {
  id: 'the_falling_out',
  name: 'The Falling Out',
  scale: 'small',

  lesson: {
    theme: 'Broken bonds',
    domain: 'relationships',
    insight: 'Some wounds heal stronger. Some do not heal at all.',
    wisdom_value: 5,
    repeatable: true,
  },

  // Assigned when trust drops significantly with someone
  assignment_rules: {
    trigger_on_relationship_change: {
      delta_threshold: -40,  // Trust dropped by 40+
      bind_role: 'former_friend',  // Bind the other agent to this role
    },
  },

  entry_stage: 'tension',
  completion_stages: ['reconciliation', 'estrangement'],

  stages: [
    {
      stage_id: 'tension',
      name: 'Unspoken Tension',
      description: 'Something has broken between you. The silence is heavy.',
    },
    {
      stage_id: 'confrontation',
      name: 'Words Like Weapons',
      description: 'The truth spills out, ugly and raw.',
    },
    {
      stage_id: 'distance',
      name: 'The Space Between',
      description: 'You orbit each other like strangers.',
    },
    {
      stage_id: 'reconciliation',
      name: 'Mending',
      description: 'Forgiveness does not forget, but it allows moving forward.',
      on_enter_effects: [
        { type: 'learn_lesson', lesson_id: 'forgiveness' },
        { type: 'modify_relationship', role: 'former_friend', trust_delta: 20 },
      ],
    },
    {
      stage_id: 'estrangement',
      name: 'Permanent Distance',
      description: 'Some bridges burn completely. This one has.',
      on_enter_effects: [
        { type: 'learn_lesson', lesson_id: 'letting_go' },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'tension',
      to_stage: 'confrontation',
      conditions: [
        { type: 'personal_tick_elapsed', ticks: 200 },
        { type: 'emotional_state', state: 'frustrated' },
      ],
    },
    {
      from_stage: 'confrontation',
      to_stage: 'distance',
      conditions: [
        { type: 'personal_tick_elapsed', ticks: 100 },
      ],
    },
    // Branch: Reconciliation requires effort
    {
      from_stage: 'distance',
      to_stage: 'reconciliation',
      conditions: [
        { type: 'has_relationship_with_role', role: 'former_friend', min_trust: 20 },
        { type: 'mood_factor', factor: 'social', min: 0 },
      ],
    },
    // Branch: Estrangement if too much time passes without repair
    {
      from_stage: 'distance',
      to_stage: 'estrangement',
      conditions: [
        { type: 'personal_tick_elapsed', ticks: 1000 },
        { type: 'has_relationship_with_role', role: 'former_friend', max_trust: 10 },
      ],
    },
  ],
};
```

---

## Phase 3: Event-Driven Plot Assignment

Currently, plots are assigned periodically by `PlotAssignmentSystem`. For true drama, plots should be assigned **when events happen**.

### PlotTrigger Types

```typescript
type PlotTrigger =
  // Trauma-based
  | { type: 'on_trauma'; trauma_type: TraumaType }

  // Relationship-based
  | { type: 'on_relationship_change'; delta_threshold: number; bind_role?: string }
  | { type: 'on_relationship_formed'; min_trust: number; bind_role?: string }
  | { type: 'on_relationship_ended'; bind_role?: string }

  // Emotional state
  | { type: 'on_emotional_state'; state: EmotionalState; duration_ticks: number }
  | { type: 'on_breakdown'; breakdown_type?: BreakdownType }
  | { type: 'on_breakdown_recovery' }

  // Life events
  | { type: 'on_death_nearby'; relationship_min?: number }
  | { type: 'on_attacked' }
  | { type: 'on_home_lost' }
  | { type: 'on_major_failure' }

  // Achievement
  | { type: 'on_skill_mastery'; skill: string; level: number }
  | { type: 'on_wisdom_milestone'; wisdom: number }
```

### Updated Assignment Rules

```typescript
interface PlotLineTemplate {
  // ... existing fields ...

  assignment_rules?: {
    // Existing: periodic eligibility check
    min_wisdom?: number;
    required_archetype?: string[];
    required_interests?: string[];
    forbidden_if_learned?: string[];

    // NEW: Event triggers
    triggers?: PlotTrigger[];

    // NEW: Bind agents involved in triggering event
    bind_trigger_agents?: {
      [role: string]: 'self' | 'other' | 'target' | 'source';
    };
  };
}
```

### Example: The Rival

```typescript
const theRival: PlotLineTemplate = {
  id: 'the_rival',
  name: 'The Rival',
  scale: 'medium',

  lesson: {
    theme: 'Competition and identity',
    domain: 'self',
    insight: 'The rival you hate most shows you who you fear to become.',
    wisdom_value: 12,
    repeatable: false,
  },

  assignment_rules: {
    triggers: [
      { type: 'on_relationship_change', delta_threshold: -30, bind_role: 'rival' },
    ],
    bind_trigger_agents: {
      'rival': 'other',  // The agent who caused the trigger
    },
    // Additional filter: only if competing for same profession/goal
    required_interests: ['ambition', 'status'],
  },

  entry_stage: 'equals',
  completion_stages: ['respect', 'enmity', 'tragedy'],

  stages: [
    {
      stage_id: 'equals',
      name: 'Matched Opponents',
      description: 'You see yourself reflected in them, and you do not like what you see.',
    },
    {
      stage_id: 'competition',
      name: 'The Contest',
      description: 'Every victory they claim feels like your defeat.',
    },
    {
      stage_id: 'obsession',
      name: 'Consuming Focus',
      description: 'They occupy your thoughts. Defeating them is all that matters.',
      on_enter_effects: [
        { type: 'add_trauma', trauma_type: 'obsession_forming' },  // NEW effect
      ],
    },
    {
      stage_id: 'crisis',
      name: 'The Breaking Point',
      description: 'Something must give. This cannot continue.',
    },
    {
      stage_id: 'respect',
      name: 'Worthy Opponents',
      description: 'You have pushed each other to become more than you were.',
      on_enter_effects: [
        { type: 'learn_lesson', lesson_id: 'rivalry_respect' },
        { type: 'modify_relationship', role: 'rival', trust_delta: 30 },
      ],
    },
    {
      stage_id: 'enmity',
      name: 'Permanent Enemies',
      description: 'There is no reconciliation. Only victory or defeat remains.',
      on_enter_effects: [
        { type: 'learn_lesson', lesson_id: 'eternal_enmity' },
      ],
    },
    {
      stage_id: 'tragedy',
      name: 'Pyrrhic Victory',
      description: 'You won, but at what cost?',
      on_enter_effects: [
        { type: 'learn_lesson', lesson_id: 'hollow_victory' },
        { type: 'add_trauma', trauma_type: 'failure_public' },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'equals',
      to_stage: 'competition',
      conditions: [
        { type: 'has_relationship_with_role', role: 'rival', max_trust: 30 },
      ],
    },
    {
      from_stage: 'competition',
      to_stage: 'obsession',
      conditions: [
        { type: 'emotional_state', state: 'obsessed', duration_ticks: 100 },
      ],
    },
    {
      from_stage: 'obsession',
      to_stage: 'crisis',
      conditions: [
        { type: 'stress_threshold', min: 60 },
      ],
    },
    // Three possible endings from crisis
    {
      from_stage: 'crisis',
      to_stage: 'respect',
      conditions: [
        { type: 'has_relationship_with_role', role: 'rival', min_trust: 40 },
        { type: 'wisdom_threshold', min_wisdom: 20 },
      ],
    },
    {
      from_stage: 'crisis',
      to_stage: 'enmity',
      conditions: [
        { type: 'has_relationship_with_role', role: 'rival', max_trust: -20 },
        { type: 'emotional_state', state: 'frustrated' },
      ],
    },
    {
      from_stage: 'crisis',
      to_stage: 'tragedy',
      conditions: [
        { type: 'in_breakdown' },
      ],
    },
  ],
};
```

---

## Phase 4: New Effect Types

### Emotional Effects

```typescript
PlotEffect =
  // Existing types...

  // NEW: Modify mood directly
  | { type: 'modify_mood'; delta: number }

  // NEW: Modify specific mood factor
  | { type: 'modify_mood_factor'; factor: keyof MoodFactors; delta: number }

  // NEW: Add trauma
  | { type: 'add_trauma'; trauma_type: TraumaType; severity?: number; description?: string }

  // NEW: Modify stress
  | { type: 'modify_stress'; delta: number }

  // NEW: Trigger breakdown (extreme dramatic moment)
  | { type: 'trigger_breakdown'; breakdown_type: BreakdownType }

  // NEW: Create significant memory
  | { type: 'create_memory'; memory_type: string; details: Record<string, any> }

  // NEW: Set emotional state (temporary override)
  | { type: 'set_emotional_state'; state: EmotionalState; duration_ticks: number }

  // NEW: Relationship effects with role binding
  | { type: 'modify_relationship_by_role'; role: string; trust_delta: number }
```

---

## Phase 5: Structural Improvements

### OR Conditions (Multiple Paths to Same Transition)

```typescript
interface PlotTransition {
  from_stage: string;
  to_stage: string;

  // Current: AND logic (all must be true)
  conditions?: PlotCondition[];

  // NEW: OR logic (any group can trigger transition)
  condition_groups?: PlotCondition[][];  // OR of ANDs

  effects?: PlotEffect[];
  probability?: number;
}
```

### NOT Conditions (Negative Requirements)

```typescript
PlotCondition =
  // ... existing types ...

  // NEW: Negation wrapper
  | { type: 'not'; condition: PlotCondition }
```

### Memory Conditions

```typescript
// Check if agent has memory of specific event type
| { type: 'has_memory'; memory_type: string; recency_ticks?: number }

// Check if agent remembers specific entity
| { type: 'remembers_entity'; entity_role: string }
```

---

## Example Dramatic Arcs

### 1. Forbidden Bond (relationships)

Love that crosses social boundaries. Assigned when positive relationship forms with someone from rival faction/species/class.

Stages: encounter → attraction → secrecy → discovery → acceptance | separation | tragedy

### 2. The Mentor's Shadow (mortality)

Processing the death of someone who taught you. Assigned on `death_of_friend` trauma where relationship had high trust + skill teaching history.

Stages: loss → inadequacy → first_trial → failure → perseverance → mastery

### 3. The Mask (self)

Living inauthentically. Assigned when agent has high stress + social factor but low achievement factor for extended period.

Stages: performance → cracks → exposure_risk → revelation → authenticity | deeper_mask

### 4. The Burden of Power (power)

What gaining authority does to a person. Assigned when agent gains leadership role or significant skill advantage.

Stages: ascension → temptation → first_abuse → crisis → wise_steward | tyrant

### 5. Stranger in a Strange Land (self)

Being an outsider. Assigned when agent moves to new location with no relationships.

Stages: arrival → alienation → first_connection → adaptation → belonging | departure

### 6. Unspoken Words (relationships)

Things left unsaid. Assigned when agent has memory of interaction with high emotional significance but low conversation depth.

Stages: silence → opportunity → spoken | regret

### 7. Rising From Ashes (self)

Recovery from failure. Assigned after `failure_public` trauma.

Stages: fallen → despair → first_step → setback → climbing → risen

### 8. The Long Goodbye (mortality)

Watching someone you care about decline. Assigned when close relationship has declining health.

Stages: denial → bargaining → presence → final_words → after

---

## Implementation Order

1. **Phase 1**: Add emotional condition types to PlotCondition union
2. **Phase 2**: Add relationship dynamics conditions + role binding
3. **Phase 3**: Event-driven plot assignment via PlotTrigger
4. **Phase 4**: New effect types for emotional manipulation
5. **Phase 5**: OR/NOT conditions, memory conditions

### Migration Path

- All new condition/effect types are additive (no breaking changes)
- Existing plots continue to work unchanged
- New plots can use emotional conditions alongside existing ones
- `custom` condition type already exists as escape hatch during development

---

## Success Criteria

1. Plots can be assigned in response to emotional events (trauma, breakdown, relationship change)
2. Plots can gate transitions on emotional states (lonely, grieving, proud)
3. Plots can modify emotional state (cause stress, trigger memories, affect mood)
4. Plots can track relationships dynamically (without hardcoded agent IDs)
5. Multiple plot endings based on emotional resolution
6. Plots feel like *drama* not *quests*

---

## The 36 Dramatic Situations Coverage

With these additions, we can express plots based on classic dramatic situations:

| Situation | Expressible? | Key Conditions/Triggers |
|-----------|--------------|------------------------|
| Supplication | Yes | `has_relationship_with_role` + `mood_threshold` |
| Deliverance | Yes | `on_attacked` trigger + relationship role |
| Vengeance | Yes | `on_trauma: betrayal` + relationship tracking |
| Rivalry | Yes | Competition detection + relationship change |
| Disaster | Yes | `on_breakdown` + multiple trauma conditions |
| Falling Prey to Misfortune | Yes | Trauma accumulation |
| Revolt | Partial | Would need faction/authority conditions |
| Madness | Yes | `in_breakdown` + emotional states |
| Imprudent Action | Yes | Choice tracking + consequences |
| Conflict with Loved One | Yes | Relationship change + emotional state |
| Sacrifice for Ideal | Yes | Choice + item loss + wisdom gain |
| Loss of Loved One | Yes | `death_of_friend` trauma trigger |
| Ambition | Partial | Would need goal/status conditions |
| Remorse | Yes | Trauma + emotional state + time |
| Recovery of Lost One | Yes | Relationship restoration tracking |
| Obstacles to Love | Yes | Relationship + external conditions |
| Erroneous Judgment | Yes | Choice consequences + regret |

---

## Phase 6: Multiverse Ontology & Timeline Integration

### The Ontology: All Universes Exist

**Fundamental truth**: All universes exist. All forks persist. They run independently of observation.

This is not a "save system" in the traditional sense. When you save, you're not creating a restore point - you're observing a timeline snapshot. When you "load," you're not undoing anything - you're shifting your observation to a different branch. The original branch continues without you.

**Key implications for plots:**

1. **Plots exist in ALL timelines** - A soul's grief arc isn't just happening in "your" playthrough. It's happening in every branch where that soul exists.

2. **Souls span forks** - The Silver Thread connects a soul across ALL its incarnations AND all timeline branches. When a universe forks, there are now TWO versions of that soul. Both are real. Both accumulate wisdom. The eternal soul... contains both.

3. **You can't undo** - Loading an earlier save doesn't erase the timeline you left. That version of the soul continues living. Their plots continue progressing. You just stopped watching.

4. **Parallel plots are REAL** - The "Road Not Taken" isn't about imagining what could be. Another version of you IS living it, right now, in a universe that continues whether you observe it or not.

5. **Wisdom accumulates across branches** - A soul's total wisdom may include lessons learned by parallel selves. Cross-fork resonance can occur.

### Timeline Mechanics (Not "Saves")

### Timeline-Aware Conditions

```typescript
// Check if universe was forked from another
| { type: 'in_forked_universe'; }

// Check if this is the "original" timeline (no parent)
| { type: 'in_original_timeline'; }

// Check fork depth (how many forks from original)
| { type: 'fork_depth'; min?: number; max?: number }

// Check if a specific event happened in this timeline
| { type: 'timeline_event_occurred'; event_type: CanonEventType; since_ticks?: number }

// Check if currently in a "what-if" branch (experimental fork)
| { type: 'in_experimental_fork'; }
```

### Fork-Triggered Plot Assignment

Plots can be assigned when universe forks occur:

```typescript
interface PlotLineTemplate {
  assignment_rules?: {
    // ... existing rules ...

    // NEW: Assign when universe forks
    triggers?: PlotTrigger[];

    trigger_on_fork?: {
      /** Assign to souls in the NEW forked universe */
      in_fork: boolean;
      /** Assign to souls in the ORIGINAL universe (who "stay behind") */
      in_original: boolean;
      /** Only trigger if fork was from this soul's canon event */
      if_canon_event_source: boolean;
    };
  };
}
```

### Example: The Road Not Taken

When a timeline forks, souls in the original universe may become aware of the path not taken:

```typescript
const theRoadNotTaken: PlotLineTemplate = {
  id: 'road_not_taken',
  name: 'The Road Not Taken',
  scale: 'small',

  lesson: {
    theme: 'Choice and consequence',
    domain: 'self',
    insight: 'Every choice creates worlds. You cannot walk them all.',
    wisdom_value: 10,
    repeatable: false,
  },

  assignment_rules: {
    trigger_on_fork: {
      in_fork: false,       // Assign in the ORIGINAL timeline
      in_original: true,    // The one who stayed
      if_canon_event_source: true,  // Only if THEIR action caused the fork
    },
  },

  entry_stage: 'awareness',
  completion_stages: ['acceptance', 'regret'],

  stages: [
    {
      stage_id: 'awareness',
      name: 'Branching Moment',
      description: 'You sense that reality has... split. Another version of you walks a different path.',
    },
    {
      stage_id: 'wondering',
      name: 'The Other Self',
      description: 'What are they doing? What choices did they make differently?',
    },
    {
      stage_id: 'acceptance',
      name: 'This Is My Path',
      description: 'You accept your choices. The other path is not yours to walk.',
      on_enter_effects: [
        { type: 'learn_lesson', lesson_id: 'acceptance_of_choice' },
        { type: 'modify_stress', delta: -15 },
      ],
    },
    {
      stage_id: 'regret',
      name: 'Eternal Wondering',
      description: 'You will always wonder what could have been.',
      on_enter_effects: [
        { type: 'learn_lesson', lesson_id: 'burden_of_choice' },
        { type: 'add_trauma', trauma_type: 'existential_doubt' },
      ],
    },
  ],

  transitions: [
    {
      from_stage: 'awareness',
      to_stage: 'wondering',
      conditions: [
        { type: 'personal_tick_elapsed', ticks: 200 },
      ],
    },
    // High wisdom leads to acceptance
    {
      from_stage: 'wondering',
      to_stage: 'acceptance',
      conditions: [
        { type: 'wisdom_threshold', min_wisdom: 30 },
        { type: 'mood_threshold', min: -20 },
      ],
    },
    // Low wisdom or depression leads to regret
    {
      from_stage: 'wondering',
      to_stage: 'regret',
      conditions: [
        { type: 'personal_tick_elapsed', ticks: 1000 },
        { type: 'emotional_state', state: 'melancholic' },
      ],
    },
  ],
};
```

### Plot Fork Behavior

When a universe forks, active plots need a policy:

```typescript
type PlotForkBehavior =
  | 'continue'    // Plot continues in both timelines independently
  | 'reset'       // Plot resets to entry stage in fork
  | 'suspend'     // Plot suspends in fork until reactivated
  | 'abandon'     // Plot abandons in fork (only continues in original)
  | 'split'       // Plot creates a "sibling" plot tracking both versions
```

The `split` behavior is special - it creates linked plots that can interact:

```typescript
interface PlotSplit {
  /** Original plot instance */
  original_id: string;
  original_universe_id: string;

  /** Forked plot instance */
  forked_id: string;
  forked_universe_id: string;

  /** How the outcomes might reconnect */
  confluence_possible: boolean;
  confluence_conditions?: PlotCondition[];
}
```

### Example: The Doppelganger

A plot that explicitly tracks your forked self:

```typescript
const theDoppelganger: PlotLineTemplate = {
  id: 'the_doppelganger',
  name: 'The Other You',
  scale: 'medium',
  fork_behavior: 'split',

  lesson: {
    theme: 'Identity across possibility',
    domain: 'self',
    insight: 'You are not defined by a single path. You are every choice you could have made.',
    wisdom_value: 25,
    repeatable: false,
  },

  // Requires cross-universe awareness
  entry_stage: 'sensing',
  completion_stages: ['integration', 'rejection', 'encounter'],

  stages: [
    {
      stage_id: 'sensing',
      name: 'Another Self',
      description: 'You feel them. Another you, making different choices.',
    },
    {
      stage_id: 'comparison',
      name: 'Measuring Paths',
      description: 'Are they happier? More successful? More... you?',
    },
    {
      stage_id: 'integration',
      name: 'All Paths Are You',
      description: 'You realize that all your possible selves are equally valid.',
      on_enter_effects: [
        { type: 'learn_lesson', lesson_id: 'quantum_identity' },
      ],
    },
    {
      stage_id: 'rejection',
      name: 'I Am The Real One',
      description: 'You reject the other as false. There can be only one.',
    },
    {
      stage_id: 'encounter',
      name: 'Face to Face',
      description: 'Somehow, impossibly, you meet yourself.',
    },
  ],
};
```

### Cross-Universe Plot Conditions

For plots that span forked timelines:

```typescript
// Check what happened in a parallel universe (requires cross-universe awareness)
| {
    type: 'parallel_universe_event';
    universe_role: 'fork' | 'original' | 'sibling';
    event_type: CanonEventType;
  }

// Check if parallel self completed a plot
| {
    type: 'parallel_self_completed';
    plot_template_id: string;
    universe_role: 'fork' | 'original' | 'sibling';
  }

// Check if parallel universes are "converging" (events aligning)
| {
    type: 'timelines_converging';
    convergence_threshold: number;  // 0-1 similarity score
  }
```

### Narrative Magic Integration

The Poetic/Literary Surrealism paradigm can interface with the plot system:

```typescript
// Word-weight can influence plot pressure
interface NarrativePressure {
  // ... existing fields ...

  /** Poetic amplification (if in literary surrealism universe) */
  word_weight_multiplier?: number;

  /** Whether this pressure can literalize metaphors */
  metaphor_literalization_enabled?: boolean;
}

// Effects can include narrative magic
PlotEffect =
  // ... existing effects ...

  // NEW: Literary surrealism effects
  | {
      type: 'literalize_metaphor';
      metaphor: string;  // e.g., "heart of stone"
      target: 'self' | 'other' | 'area';
    }

  | {
      type: 'cast_punctuation';
      punctuation: '.' | ',' | '!' | '?' | '...' | '—' | '()' | '""';
      target: 'self' | 'conversation' | 'area';
    }

  | {
      type: 'edit_reality_text';
      find: string;
      replace: string;
      scope: 'local' | 'scene' | 'chapter';  // How much reality to rewrite
    }
```

### Example: Words Made Flesh

A plot where the character's metaphorical speech becomes dangerously literal:

```typescript
const wordsMadeFlesh: PlotLineTemplate = {
  id: 'words_made_flesh',
  name: 'Words Made Flesh',
  scale: 'small',

  lesson: {
    theme: 'The weight of words',
    domain: 'power',
    insight: 'Language shapes reality. Speak carefully.',
    wisdom_value: 8,
    repeatable: true,
  },

  // Assigned when agent speaks a literalizable metaphor
  assignment_rules: {
    triggers: [
      { type: 'on_metaphor_spoken'; literalization_probability_min: 0.5 },
    ],
  },

  entry_stage: 'spoken',
  completion_stages: ['controlled', 'overwhelmed'],

  stages: [
    {
      stage_id: 'spoken',
      name: 'The Utterance',
      description: 'You spoke carelessly. The words took form.',
    },
    {
      stage_id: 'manifestation',
      name: 'Reality Shifts',
      description: 'What you said is becoming literally true.',
      on_enter_effects: [
        { type: 'literalize_metaphor', metaphor: '{{spoken_metaphor}}', target: 'self' },
      ],
    },
    {
      stage_id: 'controlled',
      name: 'Mastered Words',
      description: 'You learned to wield the power of literal speech.',
      on_enter_effects: [
        { type: 'learn_lesson', lesson_id: 'word_weight_awareness' },
      ],
    },
    {
      stage_id: 'overwhelmed',
      name: 'Drowned in Meaning',
      description: 'The words were too heavy. You are crushed by their weight.',
      on_enter_effects: [
        { type: 'add_trauma', trauma_type: 'meaning_overload' },
      ],
    },
  ],
};
```

---

## Phase 7: Plot Composition & Nesting

### Plots Are Hierarchical

Like Foundation, a great narrative is composed of many plots at different scales, all running simultaneously and feeding into each other:

```
EPIC: "The Convergence War" (multi-lifetime)
├── LARGE: "The First Contact Crisis" (years)
│   ├── MEDIUM: "The Diplomat's Gambit" (months)
│   │   ├── SMALL: "Learning Their Language" (weeks)
│   │   │   └── MICRO: "The Word That Changed Everything" (moment)
│   │   └── SMALL: "The Ambassador's Doubt" (weeks)
│   └── MEDIUM: "The Border Skirmishes" (months)
│       ├── SMALL: "A Soldier's Grief" (weeks)
│       └── SMALL: "The Defector" (weeks)
├── LARGE: "The Occupation" (years)
│   └── ...
└── LARGE: "The Liberation" (years)
    └── ...
```

### Plot Composition Types

```typescript
interface PlotComposition {
  /** This plot is part of a larger plot */
  parent_plot?: {
    template_id: string;
    instance_id: string;
    /** How this plot affects the parent */
    contribution: PlotContribution;
  };

  /** This plot spawns child plots */
  child_plots?: ChildPlotRule[];

  /** This plot runs in parallel with sibling plots */
  sibling_awareness?: {
    /** Can see sibling plot states */
    visible_siblings: string[];
    /** Sibling completion affects this plot */
    sibling_dependencies?: SiblingDependency[];
  };
}

type PlotContribution =
  | { type: 'advances_stage'; stage_id: string }     // Completing this advances parent
  | { type: 'unlocks_transition'; transition_id: string }  // Enables a parent transition
  | { type: 'modifies_outcome'; outcome_weight: Record<string, number> }  // Shifts parent ending probabilities
  | { type: 'provides_context'; context_key: string }  // Adds narrative context to parent

interface ChildPlotRule {
  /** When to spawn the child plot */
  trigger: 'on_stage_enter' | 'on_stage_exit' | 'on_condition_met';
  trigger_stage?: string;
  trigger_condition?: PlotCondition;

  /** What child plot to spawn */
  child_template_id: string;

  /** How many instances (for ensemble casts) */
  instance_count?: number | { min: number; max: number };

  /** Who gets assigned the child plot */
  assignment: 'self' | 'all_involved' | 'random_nearby' | 'specific_role';
  role?: string;
}
```

### Example: The Convergence War (Epic Composition)

```typescript
const theConvergenceWar: PlotLineTemplate = {
  id: 'convergence_war',
  name: 'The Convergence War',
  scale: 'epic',

  lesson: {
    theme: 'Survival and transformation',
    domain: 'transcendence',
    insight: 'When worlds collide, both are forever changed.',
    wisdom_value: 100,
    repeatable: false,
  },

  // This epic plot SPAWNS large plots at each stage
  composition: {
    child_plots: [
      {
        trigger: 'on_stage_enter',
        trigger_stage: 'first_contact',
        child_template_id: 'first_contact_crisis',  // LARGE plot
        assignment: 'all_involved',
      },
      {
        trigger: 'on_stage_enter',
        trigger_stage: 'open_war',
        child_template_id: 'the_resistance',  // LARGE plot
        instance_count: { min: 2, max: 5 },  // Multiple resistance cells
        assignment: 'random_nearby',
      },
      {
        trigger: 'on_stage_enter',
        trigger_stage: 'resolution',
        child_template_id: 'the_reckoning',  // LARGE plot
        assignment: 'specific_role',
        role: 'war_leader',
      },
    ],
  },

  entry_stage: 'pre_contact',
  completion_stages: ['victory', 'defeat', 'synthesis', 'stalemate'],

  stages: [
    { stage_id: 'pre_contact', name: 'Before They Came', description: 'Life as it was.' },
    { stage_id: 'first_contact', name: 'The Arrival', description: 'They are here.' },
    { stage_id: 'negotiation', name: 'Attempts at Peace', description: 'Words before weapons.' },
    { stage_id: 'open_war', name: 'The War', description: 'Blood and fire.' },
    { stage_id: 'turning_point', name: 'The Pivot', description: 'Something changes everything.' },
    { stage_id: 'resolution', name: 'The End Begins', description: 'One way or another, it ends.' },
    { stage_id: 'victory', name: 'We Survived', description: 'Scarred but standing.' },
    { stage_id: 'defeat', name: 'We Fell', description: 'They won. We adapt or perish.' },
    { stage_id: 'synthesis', name: 'We Became One', description: 'Neither side won. Both changed.' },
    { stage_id: 'stalemate', name: 'Eternal War', description: 'It never ends. It becomes normal.' },
  ],

  transitions: [
    // Parent plot advances based on CHILD plot outcomes
    {
      from_stage: 'first_contact',
      to_stage: 'negotiation',
      conditions: [
        { type: 'child_plot_completed', template_id: 'first_contact_crisis', outcome: 'diplomatic' },
      ],
    },
    {
      from_stage: 'first_contact',
      to_stage: 'open_war',
      conditions: [
        { type: 'child_plot_completed', template_id: 'first_contact_crisis', outcome: 'hostile' },
      ],
    },
    // Resolution depends on how many resistance cells succeeded
    {
      from_stage: 'resolution',
      to_stage: 'victory',
      conditions: [
        { type: 'child_plot_success_ratio', template_id: 'the_resistance', min_ratio: 0.6 },
      ],
    },
  ],
};
```

### Child Plot: First Contact Crisis (Large)

```typescript
const firstContactCrisis: PlotLineTemplate = {
  id: 'first_contact_crisis',
  name: 'The First Contact Crisis',
  scale: 'large',

  // This plot contributes to its parent
  composition: {
    parent_contribution: {
      type: 'unlocks_transition',
      // Outcome determines which parent transition activates
    },

    // This plot spawns medium plots
    child_plots: [
      {
        trigger: 'on_stage_enter',
        trigger_stage: 'diplomacy_attempt',
        child_template_id: 'the_diplomats_gambit',  // MEDIUM
        assignment: 'specific_role',
        role: 'diplomat',
      },
      {
        trigger: 'on_stage_enter',
        trigger_stage: 'military_posturing',
        child_template_id: 'border_skirmishes',  // MEDIUM
        assignment: 'specific_role',
        role: 'soldier',
      },
    ],
  },

  stages: [
    { stage_id: 'detection', name: 'Something Approaches' },
    { stage_id: 'arrival', name: 'They Land' },
    { stage_id: 'communication_attempt', name: 'First Words' },
    { stage_id: 'diplomacy_attempt', name: 'Seeking Understanding' },
    { stage_id: 'military_posturing', name: 'Show of Force' },
    { stage_id: 'diplomatic', name: 'Peace Prevails', completion: true },
    { stage_id: 'hostile', name: 'War Begins', completion: true },
  ],
};
```

### Grandchild Plot: The Diplomat's Gambit (Medium)

```typescript
const theDiplomatsGambit: PlotLineTemplate = {
  id: 'diplomats_gambit',
  name: "The Diplomat's Gambit",
  scale: 'medium',

  composition: {
    parent_contribution: {
      type: 'modifies_outcome',
      outcome_weight: {
        'diplomatic': 0.3,  // Success increases peace chance
        'hostile': -0.3,    // Success decreases war chance
      },
    },

    // Spawns small plots for the diplomat
    child_plots: [
      {
        trigger: 'on_stage_enter',
        trigger_stage: 'learning',
        child_template_id: 'learning_their_language',  // SMALL
        assignment: 'self',
      },
      {
        trigger: 'on_condition_met',
        trigger_condition: { type: 'stress_threshold', min: 70 },
        child_template_id: 'the_ambassadors_doubt',  // SMALL - personal crisis
        assignment: 'self',
      },
    ],
  },

  stages: [
    { stage_id: 'assigned', name: 'Chosen for the Impossible' },
    { stage_id: 'learning', name: 'Understanding the Other' },
    { stage_id: 'first_meeting', name: 'Face to Face' },
    { stage_id: 'breakthrough', name: 'A Connection' },
    { stage_id: 'setback', name: 'Trust Broken' },
    { stage_id: 'success', name: 'Peace Achieved', completion: true },
    { stage_id: 'failure', name: 'Words Failed', completion: true },
  ],
};
```

### Great-Grandchild: The Word That Changed Everything (Micro)

```typescript
const theWordThatChanged: PlotLineTemplate = {
  id: 'word_that_changed',
  name: 'The Word That Changed Everything',
  scale: 'micro',

  composition: {
    parent_contribution: {
      type: 'advances_stage',
      stage_id: 'breakthrough',  // Success advances parent to breakthrough
    },
  },

  lesson: {
    theme: 'Communication',
    domain: 'relationships',
    insight: 'Sometimes one word carries the weight of worlds.',
    wisdom_value: 3,
    repeatable: true,
  },

  // Micro plot - just a few stages, resolves in minutes
  stages: [
    { stage_id: 'moment', name: 'The Crucial Moment' },
    { stage_id: 'spoken', name: 'Words Exchanged', completion: true },
    { stage_id: 'silence', name: 'Words Failed', failure: true },
  ],
};
```

### New Condition Types for Composition

```typescript
// Check child plot states
| { type: 'child_plot_active'; template_id: string }
| { type: 'child_plot_completed'; template_id: string; outcome?: string }
| { type: 'child_plot_failed'; template_id: string }
| { type: 'child_plot_success_ratio'; template_id: string; min_ratio: number }
| { type: 'child_plot_count'; template_id: string; min?: number; max?: number }

// Check parent plot state (for child awareness)
| { type: 'parent_plot_stage'; stage_id: string }
| { type: 'parent_plot_endangered' }  // Parent might fail

// Check sibling plots
| { type: 'sibling_plot_completed'; template_id: string }
| { type: 'any_sibling_failed' }
```

### How It Plays Out

When the Convergence War epic begins:

1. **Epic plot** enters `first_contact` stage
2. This **spawns** the "First Contact Crisis" large plot for all involved souls
3. That large plot enters `diplomacy_attempt` stage
4. This **spawns** "The Diplomat's Gambit" medium plot for the diplomat soul
5. That medium plot enters `learning` stage
6. This **spawns** "Learning Their Language" small plot
7. During that, stress rises, triggering "The Ambassador's Doubt" small plot (parallel)
8. A key moment spawns "The Word That Changed Everything" micro plot
9. **Micro completes** → advances medium plot to `breakthrough`
10. **Medium completes successfully** → modifies large plot outcome weights (+diplomatic)
11. **Large completes with 'diplomatic'** → unlocks epic transition to `negotiation`
12. **Epic advances** → spawns new large plots for the negotiation phase...

Each soul experiences the war through their own nested plot tree. A soldier has different plots than a diplomat. But all their plots compose into the same epic.

---

## Phase 8: Cross-Universe Incursions (Server-Driven Parallel Content)

### The Pattern: Forked Universe as Incubation Chamber

The multiverse ontology enables a powerful narrative pattern:

1. **Fork the player's universe** - Clone their world at a specific point
2. **Run divergent history in parallel** - Server evolves the fork independently
3. **Introduce threat/opportunity** - The forked universe develops something (aliens, plague, magic, etc.)
4. **Cross-universe encounter** - Entities from the fork invade/visit the original

The key insight: **the aliens have real history**. They didn't spawn when you triggered a quest. They evolved. They conquered their Earth. They mourned their dead. They celebrated their victories. When they arrive in your universe, they arrive with *souls*.

### Server-Side Parallel Universe Execution

```typescript
interface ParallelUniverseConfig {
  /** Source universe to fork from */
  source_universe_id: string;

  /** When to fork (tick or canon event) */
  fork_trigger:
    | { type: 'at_tick'; tick: bigint }
    | { type: 'after_event'; event_type: CanonEventType };

  /** Divergence script to run in the fork */
  divergence_script: DivergenceScript;

  /** When incursion becomes possible */
  incursion_condition: IncursionCondition;

  /** How entities cross over */
  crossing_method: CrossingMethod;
}

interface DivergenceScript {
  /** Script ID (e.g., 'alien_evolution', 'plague_origin', 'magic_awakening') */
  script_id: string;

  /** Parameters for the script */
  parameters: Record<string, any>;

  /** How many ticks to fast-forward (server-side simulation) */
  simulation_ticks: bigint;

  /** Events to inject during simulation */
  injected_events?: {
    at_tick: bigint;
    event: CanonEventType;
    details: Record<string, any>;
  }[];
}

type CrossingMethod =
  | { type: 'portal'; portal_location: Position; portal_duration_ticks: number }
  | { type: 'gradual_bleed'; affected_area: BoundingBox; bleed_rate: number }
  | { type: 'single_breach'; entry_point: Position }
  | { type: 'invasion_wave'; staging_area: Position; wave_count: number; wave_interval_ticks: number };
```

### The Alien Invasion Example

```typescript
const alienInvasionConfig: ParallelUniverseConfig = {
  source_universe_id: '{{player_universe_id}}',

  fork_trigger: {
    type: 'at_tick',
    tick: 0n,  // Fork from the beginning
  },

  divergence_script: {
    script_id: 'alien_evolution',
    parameters: {
      alien_species: 'the_convergence',
      origin_location: { x: 500, y: 500 },  // Remote area of the map
      aggression_factor: 0.8,
      tech_evolution_rate: 1.5,
    },
    simulation_ticks: 100000n,  // ~50 in-game years at 20 TPS
    injected_events: [
      { at_tick: 20000n, event: 'first_contact', details: { outcome: 'war' } },
      { at_tick: 50000n, event: 'human_resistance_falls', details: {} },
      { at_tick: 80000n, event: 'dimensional_tech_discovered', details: {} },
      { at_tick: 95000n, event: 'expansion_begins', details: { target: 'parallel_universes' } },
    ],
  },

  incursion_condition: {
    type: 'simulation_complete',  // When the 100000 ticks finish
  },

  crossing_method: {
    type: 'invasion_wave',
    staging_area: { x: 100, y: 100 },
    wave_count: 5,
    wave_interval_ticks: 5000,
  },
};
```

### Souls That Cross Universes

When entities cross from the forked universe, they bring their souls:

```typescript
interface CrossingEntity {
  /** Entity data from the parallel universe */
  entity: Entity;

  /** Their complete soul (with Silver Thread history from THEIR timeline) */
  soul: SoulIdentityComponent;
  silver_thread: SilverThreadComponent;

  /** Their lessons were learned in a different world */
  lessons_from_parallel: LearnedLesson[];

  /** Memories of their Earth (which is not your Earth) */
  memories: EpisodicMemory[];

  /** How the crossing affects them */
  crossing_trauma?: {
    trauma_type: 'dimensional_displacement';
    severity: number;
    manifests_as: string[];  // 'homesickness', 'reality_confusion', 'power_hunger'
  };
}
```

### Cross-Universe Plots

New plot templates for incursion scenarios:

```typescript
const theInvasion: PlotLineTemplate = {
  id: 'the_invasion',
  name: 'They Came From Elsewhere',
  scale: 'epic',

  lesson: {
    theme: 'Facing the unknowable',
    domain: 'transcendence',
    insight: 'The multiverse contains horrors and wonders beyond imagination. Both arrive uninvited.',
    wisdom_value: 50,
    repeatable: false,
  },

  assignment_rules: {
    triggers: [
      { type: 'on_cross_universe_incursion' },  // NEW trigger type
    ],
  },

  entry_stage: 'first_signs',
  completion_stages: ['repelled', 'coexistence', 'subjugated', 'absorbed'],

  stages: [
    {
      stage_id: 'first_signs',
      name: 'Strange Occurrences',
      description: 'The sky flickers. Animals behave oddly. Something is coming.',
    },
    {
      stage_id: 'arrival',
      name: 'The Breach',
      description: 'They are here. They are not from this world. They are not from ANY world you know.',
    },
    {
      stage_id: 'understanding',
      name: 'Learning Their Nature',
      description: 'Who are they? What do they want? Why do they seem to... remember you?',
    },
    {
      stage_id: 'conflict',
      name: 'The Struggle',
      description: 'Whether by war or negotiation, your world will never be the same.',
    },
    {
      stage_id: 'repelled',
      name: 'Pushed Back',
      description: 'They retreat to their dying world. But the breach remains...',
      on_enter_effects: [
        { type: 'learn_lesson', lesson_id: 'multiverse_defender' },
      ],
    },
    {
      stage_id: 'coexistence',
      name: 'Two Worlds, One Space',
      description: 'You learned to live together. Your cultures merge.',
      on_enter_effects: [
        { type: 'learn_lesson', lesson_id: 'cosmic_diplomacy' },
      ],
    },
    {
      stage_id: 'subjugated',
      name: 'Under New Management',
      description: 'They won. Your world belongs to them now.',
      on_enter_effects: [
        { type: 'add_trauma', trauma_type: 'conquest', severity: 10 },
      ],
    },
    {
      stage_id: 'absorbed',
      name: 'We Are Them Now',
      description: 'The distinction between you and them has dissolved.',
      on_enter_effects: [
        { type: 'learn_lesson', lesson_id: 'identity_transcendence' },
      ],
    },
  ],
};
```

### The Displaced Soul

A plot for souls that CROSSED from another universe:

```typescript
const theDisplaced: PlotLineTemplate = {
  id: 'the_displaced',
  name: 'Stranger From Elsewhere',
  scale: 'large',

  lesson: {
    theme: 'Home is not a place',
    domain: 'self',
    insight: 'Your home universe is gone. But you carry it within you.',
    wisdom_value: 30,
    repeatable: false,
  },

  assignment_rules: {
    /** Automatically assigned to any soul that crossed universes */
    triggers: [
      { type: 'on_universe_crossing'; direction: 'arriving' },
    ],
  },

  entry_stage: 'arrival_shock',
  completion_stages: ['new_home', 'eternal_wanderer', 'returned'],

  stages: [
    {
      stage_id: 'arrival_shock',
      name: 'Wrong World',
      description: 'Everything looks right but feels wrong. This is not your home.',
      on_enter_effects: [
        { type: 'add_trauma', trauma_type: 'dimensional_displacement' },
        { type: 'set_emotional_state', state: 'anxious', duration_ticks: 500 },
      ],
    },
    {
      stage_id: 'seeking_familiar',
      name: 'Looking for Home',
      description: 'You search for people, places, anything that matches your memories.',
    },
    {
      stage_id: 'grief',
      name: 'Mourning a Universe',
      description: 'Your world exists, but you can never return. Everyone you knew... is a stranger here.',
    },
    {
      stage_id: 'adaptation',
      name: 'Learning This World',
      description: 'You begin to understand how this world differs from yours.',
    },
    {
      stage_id: 'new_home',
      name: 'This Is Home Now',
      description: 'You have made peace. This world is not wrong - it is simply different.',
      on_enter_effects: [
        { type: 'learn_lesson', lesson_id: 'home_is_within' },
        { type: 'modify_stress', delta: -30 },
      ],
    },
    {
      stage_id: 'eternal_wanderer',
      name: 'Between Worlds',
      description: 'You belong to no single universe. You walk between them all.',
      on_enter_effects: [
        { type: 'learn_lesson', lesson_id: 'multiverse_wanderer' },
      ],
    },
    {
      stage_id: 'returned',
      name: 'Going Back',
      description: 'Somehow, against all odds, you found a way home.',
    },
  ],

  transitions: [
    {
      from_stage: 'seeking_familiar',
      to_stage: 'grief',
      conditions: [
        { type: 'personal_tick_elapsed', ticks: 300 },
        // Searched but found only strangers
        { type: 'not', condition: { type: 'has_relationship_with_role', role: 'parallel_self_connection', min_trust: 30 } },
      ],
    },
    // Can skip grief if they find their parallel self and connect
    {
      from_stage: 'seeking_familiar',
      to_stage: 'adaptation',
      conditions: [
        { type: 'has_relationship_with_role', role: 'parallel_self_connection', min_trust: 50 },
      ],
    },
    {
      from_stage: 'adaptation',
      to_stage: 'new_home',
      conditions: [
        { type: 'any_relationship_trust', min: 60 },  // Made real friends
        { type: 'mood_threshold', min: 0 },           // Generally positive mood
      ],
    },
  ],
};
```

### New Condition Types for Cross-Universe Plots

```typescript
// Phase 7: Cross-Universe Conditions
| { type: 'is_from_parallel_universe' }
| { type: 'universe_under_incursion' }
| { type: 'has_crossed_universes'; direction: 'arriving' | 'departing' | 'any' }
| { type: 'incursion_wave_number'; wave: number }
| { type: 'parallel_civilization_status'; status: 'hostile' | 'neutral' | 'allied' | 'extinct' }
| { type: 'breach_stability'; min?: number; max?: number }  // 0-100, how stable the portal is
```

### New Effect Types for Cross-Universe Plots

```typescript
// Phase 7: Cross-Universe Effects
| { type: 'open_breach'; target_universe_id: string; location: Position; stability: number }
| { type: 'close_breach'; breach_id: string }
| { type: 'summon_from_parallel'; entity_type: string; count: number }
| { type: 'send_to_parallel'; target_universe_id: string }
| { type: 'parallel_communication'; message_type: 'warning' | 'greeting' | 'demand' | 'plea' }
```

### Simulation Efficiency: Decision Replay + Divergence

Running a parallel universe doesn't require re-running all LLM inference. The key insight:

**Before divergence**: Replay recorded decisions deterministically. No LLM calls needed.

**After divergence**: Only 2x the normal LLM cost (aliens + humans responding to aliens).

```typescript
interface EfficientParallelSimulation {
  /** Source universe's decision log */
  source_decision_log: DecisionLog;

  /** Tick where divergence begins (alien injection) */
  divergence_tick: bigint;

  /** Phases of simulation */
  phases: {
    /** Phase 1: Deterministic replay - no LLM calls */
    replay: {
      start_tick: 0n;
      end_tick: bigint;  // divergence_tick
      llm_calls: 0;
      strategy: 'replay_from_log';
    };

    /** Phase 2: Divergent simulation - 2x LLM calls */
    divergence: {
      start_tick: bigint;  // divergence_tick
      end_tick: bigint;    // invasion_ready_tick
      llm_calls_per_tick: 2;  // aliens + humans responding
      strategy: 'dual_inference';
    };

    /** Phase 3: Incursion - crossing entities enter target universe */
    incursion: {
      strategy: 'cross_universe_transfer';
    };
  };
}

interface DecisionLog {
  /** All LLM decisions made in the source universe */
  entries: DecisionLogEntry[];

  /** Fast lookup by tick */
  getDecisionsAtTick(tick: bigint): DecisionLogEntry[];

  /** Get deterministic seed for replay */
  getReplaySeed(tick: bigint): number;
}

interface DecisionLogEntry {
  tick: bigint;
  agent_id: string;
  decision: AgentDecision;
  context_hash: string;  // For validation
}
```

**Cost Example (Alien Invasion):**

| Phase | Ticks | LLM Calls | Description |
|-------|-------|-----------|-------------|
| Replay | 0 → 20000 | 0 | Deterministic replay of player's decisions |
| Divergence | 20000 → 100000 | ~160k | Aliens + humans × 80000 ticks |
| Normal play | ongoing | 1x | Player's universe continues normally |

The aliens arrive with 80,000 ticks of *real* history (wars, losses, victories, traumas) but you only paid for 160k LLM calls, not 200k (what full simulation would cost).

**Further Optimization: Sparse Simulation**

Not every tick needs LLM inference in the parallel universe:

```typescript
interface SparseSimulationConfig {
  /** Only run LLM inference every N ticks */
  inference_interval: number;  // e.g., 10 = every 10th tick

  /** Critical events force immediate inference */
  force_inference_on: CanonEventType[];  // deaths, battles, discoveries

  /** Interpolate agent states between inference ticks */
  interpolation_strategy: 'linear' | 'behavioral_model' | 'frozen';
}
```

With sparse simulation at 10-tick intervals, the alien invasion costs ~16k LLM calls instead of 160k. The aliens still have rich history - just sampled less frequently.

### Server-Driven Incursion Scripts

The server can run pre-defined scripts that evolve parallel universes:

```typescript
type DivergenceScriptType =
  | 'alien_evolution'        // Aliens develop and expand
  | 'plague_origin'          // Disease evolves and spreads
  | 'magic_awakening'        // Magic becomes dominant force
  | 'machine_uprising'       // AI takes over
  | 'dimensional_collapse'   // Universe is dying, refugees flee
  | 'utopia_achieved'        // They solved everything (and want to "help" you)
  | 'elder_god_awakening'    // Something ancient woke up
  | 'time_paradox'           // Their timeline broke
  | 'custom';                // Server-defined script

interface DivergenceScriptRegistry {
  scripts: Map<DivergenceScriptType, DivergenceScriptDefinition>;

  /** Run a script on a forked universe */
  execute(
    universe: Universe,
    script_id: DivergenceScriptType,
    parameters: Record<string, any>
  ): Promise<SimulationResult>;
}
```

### The "They Remember You" Factor

The most unsettling aspect: souls in the parallel universe may have relationships with parallel versions of souls in YOUR universe. When they arrive:

```typescript
interface ParallelRelationship {
  /** Soul from the parallel universe */
  crossing_soul_id: string;

  /** Soul in the target universe */
  target_soul_id: string;

  /** Relationship that existed in the parallel universe */
  parallel_relationship: {
    trust: number;
    history: string[];  // "You were my friend", "You betrayed us", "You died saving me"
  };

  /** Does the arriving soul expect the relationship to exist here? */
  expects_recognition: boolean;

  /** How they react when the target soul doesn't know them */
  unrecognized_reaction: 'grief' | 'confusion' | 'rage' | 'denial' | 'acceptance';
}
```

This creates immediate dramatic tension: an alien arrives and *knows you*. They remember fighting alongside you. They remember your death. They remember your wedding. But you've never seen them before.

---

## Phase 9: Origins, Capability Domains, and Game Modes

### The Problem

The game has systems for:
- Farming and crafting
- Relationships and social dynamics
- Magic paradigms and spell creation
- Transcendence and cosmic awareness
- Universe forking and timeline manipulation

But not every playthrough should expose everything. A cozy farming sim doesn't need timeline manipulation. A Transcendent Fae campaign starts with capabilities that a human farmer earns over lifetimes.

### Origin Templates

What you **are** when you begin:

```typescript
interface OriginTemplate {
  id: string;
  name: string;
  description: string;

  /** Species/type of being */
  being_type: BeingType;

  /** Starting capability levels */
  initial_capabilities: Partial<CapabilityLevels>;

  /** Capability ceilings (can't exceed these without transcendence) */
  capability_ceilings: Partial<CapabilityLevels>;

  /** Starting soul state */
  soul_template: {
    archetype: SoulArchetype;
    initial_wisdom: number;
    initial_lessons: string[];
    transcendence_level: TranscendenceLevel;
  };

  /** Starting components to add */
  initial_components: ComponentTemplate[];

  /** Which plots are available/forbidden */
  plot_access: {
    available_templates: string[];  // Whitelist (if empty, all available)
    forbidden_templates: string[];  // Blacklist
    starting_plots?: string[];      // Auto-assigned on spawn
  };

  /** Narrative context */
  lore: {
    origin_story: string;
    cultural_background?: string;
    native_realm?: string;
  };
}

type BeingType =
  | 'mortal_human'
  | 'mortal_animal'
  | 'fae_lesser'
  | 'fae_transcendent'
  | 'spirit'
  | 'ghost'
  | 'elemental'
  | 'construct'
  | 'deity_minor'
  | 'deity_major'
  | 'eldritch';

type TranscendenceLevel =
  | 0   // Mortal - no transcendence
  | 1   // Awakened - aware of soul
  | 2   // Seeker - pursuing transcendence
  | 3   // Initiate - touched the beyond
  | 4   // Adept - regular transcendent experiences
  | 5   // Master - controls transcendent abilities
  | 6   // Sage - teaches transcendence
  | 7   // Transcendent - exists partially beyond
  | 8   // Celestial - exists primarily beyond
  | 9   // Divine - shapes reality
  | 10; // Absolute - is reality
```

### Capability Domains

Everything an entity can potentially do, organized into domains:

```typescript
interface CapabilityLevels {
  // === PHYSICAL DOMAIN ===
  physical: {
    farming: number;        // 0-100
    crafting: number;
    combat: number;
    athletics: number;
    survival: number;
  };

  // === SOCIAL DOMAIN ===
  social: {
    conversation: number;
    persuasion: number;
    leadership: number;
    empathy: number;
    deception: number;
  };

  // === COGNITIVE DOMAIN ===
  cognitive: {
    learning_rate: number;
    memory_capacity: number;
    planning_depth: number;
    creativity: number;
    focus: number;
  };

  // === MAGICAL DOMAIN ===
  magical: {
    mana_capacity: number;
    paradigm_access: MagicParadigm[];  // Which magic systems available
    spell_complexity: number;
    enchantment: number;
    ritual: number;
  };

  // === TRANSCENDENT DOMAIN ===
  transcendent: {
    soul_awareness: number;       // Can perceive own soul
    other_awareness: number;      // Can perceive other souls
    universe_awareness: number;   // Can perceive universe structure
    timeline_perception: number;  // Can perceive alternate timelines
    reality_influence: number;    // Can affect reality directly
    fork_capability: number;      // Can create/navigate forks
  };

  // === META DOMAIN (usually hidden) ===
  meta: {
    save_awareness: number;       // Knows about saves
    player_awareness: number;     // Knows about the player
    narrative_awareness: number;  // Knows they're in a story
    fourth_wall: number;          // Can break the fourth wall
  };
}
```

### Game Mode Definitions

A game mode is a **scoped view** into the full capability space:

```typescript
interface GameMode {
  id: string;
  name: string;
  description: string;
  tagline: string;  // "Cozy farming with friends" or "Ascend to godhood"

  /** Which origins are available in this mode */
  available_origins: string[];

  /** Default origin if player doesn't choose */
  default_origin: string;

  /** Capability domain visibility/access */
  domain_access: {
    physical: DomainAccess;
    social: DomainAccess;
    cognitive: DomainAccess;
    magical: DomainAccess;
    transcendent: DomainAccess;
    meta: DomainAccess;
  };

  /** UI exposure */
  ui_exposure: {
    show_soul_panel: boolean;
    show_transcendence_meter: boolean;
    show_timeline_navigator: boolean;
    show_universe_map: boolean;
    show_plot_tracker: boolean;
  };

  /** Plot scope */
  plot_scope: {
    max_scale: PlotScale;  // 'micro' | 'small' | 'medium' | 'large' | 'epic'
    enabled_plot_categories: string[];
    starting_epic?: string;  // Auto-assign world-level epic plot
  };

  /** Difficulty/pacing */
  pacing: {
    time_scale: number;        // 1.0 = normal
    threat_level: number;      // 0-10
    resource_abundance: number; // 0-10
    social_complexity: number;  // 0-10
  };
}

type DomainAccess =
  | 'hidden'      // Domain doesn't exist in this mode
  | 'locked'      // Exists but starts inaccessible
  | 'gated'       // Unlocks through progression
  | 'available'   // Accessible from start
  | 'focus';      // Primary domain of this mode
```

### Example Game Modes

```typescript
const GAME_MODES: GameMode[] = [
  {
    id: 'cozy_farm',
    name: 'Peaceful Valley',
    tagline: 'Grow crops, make friends, find peace',
    description: 'A gentle farming experience focused on crops, animals, and community.',

    available_origins: ['mortal_human', 'mortal_animal'],
    default_origin: 'mortal_human',

    domain_access: {
      physical: 'focus',      // Main gameplay
      social: 'available',    // Make friends
      cognitive: 'available', // Learn recipes
      magical: 'hidden',      // No magic
      transcendent: 'hidden', // No transcendence
      meta: 'hidden',
    },

    ui_exposure: {
      show_soul_panel: false,
      show_transcendence_meter: false,
      show_timeline_navigator: false,
      show_universe_map: false,
      show_plot_tracker: true,  // Simple story tracker
    },

    plot_scope: {
      max_scale: 'medium',  // No epic plots
      enabled_plot_categories: ['farming', 'relationships', 'community', 'seasons'],
    },

    pacing: {
      time_scale: 0.5,        // Slower, relaxed
      threat_level: 1,        // Very safe
      resource_abundance: 8,  // Plentiful
      social_complexity: 4,   // Simple friendships
    },
  },

  {
    id: 'village_life',
    name: 'Village Chronicles',
    tagline: 'Live, love, and shape your community',
    description: 'Full village simulation with relationships, professions, and community events.',

    available_origins: ['mortal_human'],
    default_origin: 'mortal_human',

    domain_access: {
      physical: 'available',
      social: 'focus',        // Main gameplay
      cognitive: 'available',
      magical: 'gated',       // Unlock later
      transcendent: 'locked', // Very late game
      meta: 'hidden',
    },

    ui_exposure: {
      show_soul_panel: false,
      show_transcendence_meter: false,
      show_timeline_navigator: false,
      show_universe_map: false,
      show_plot_tracker: true,
    },

    plot_scope: {
      max_scale: 'large',
      enabled_plot_categories: ['relationships', 'profession', 'community', 'mystery', 'romance'],
    },

    pacing: {
      time_scale: 1.0,
      threat_level: 3,
      resource_abundance: 5,
      social_complexity: 8,
    },
  },

  {
    id: 'mage_academy',
    name: 'Arcane Academy',
    tagline: 'Master the mysteries of magic',
    description: 'Focus on learning magic paradigms, crafting spells, and academic politics.',

    available_origins: ['mortal_human', 'fae_lesser'],
    default_origin: 'mortal_human',

    domain_access: {
      physical: 'available',
      social: 'available',
      cognitive: 'focus',     // Learning is key
      magical: 'focus',       // Main gameplay
      transcendent: 'gated',  // Advanced magic touches transcendence
      meta: 'locked',
    },

    ui_exposure: {
      show_soul_panel: true,
      show_transcendence_meter: true,
      show_timeline_navigator: false,
      show_universe_map: false,
      show_plot_tracker: true,
    },

    plot_scope: {
      max_scale: 'large',
      enabled_plot_categories: ['magic', 'academia', 'rivalry', 'discovery', 'power'],
    },
  },

  {
    id: 'transcendent_fae',
    name: 'Courts of the Eternal',
    tagline: 'Dance in the courts of beings who shaped reality',
    description: 'Play as a Transcendent Fae navigating cosmic politics and reality-shaping power.',

    available_origins: ['fae_transcendent'],
    default_origin: 'fae_transcendent',

    domain_access: {
      physical: 'available',
      social: 'focus',        // Fae politics
      cognitive: 'available',
      magical: 'focus',       // Innate magic
      transcendent: 'focus',  // Core gameplay
      meta: 'gated',          // Very high-level fae may perceive
    },

    ui_exposure: {
      show_soul_panel: true,
      show_transcendence_meter: true,
      show_timeline_navigator: true,  // Fae perceive timelines
      show_universe_map: true,        // Fae perceive multiverse
      show_plot_tracker: true,
    },

    plot_scope: {
      max_scale: 'epic',
      enabled_plot_categories: ['transcendence', 'cosmic', 'politics', 'love', 'betrayal', 'reality'],
      starting_epic: 'the_eternal_dance',  // Fae political epic
    },

    pacing: {
      time_scale: 2.0,        // Time moves differently for fae
      threat_level: 7,        // High stakes
      resource_abundance: 6,
      social_complexity: 10,  // Byzantine fae politics
    },
  },

  {
    id: 'ascension_path',
    name: 'The Long Road',
    tagline: 'Begin as a farmer. End as a god.',
    description: 'Full progression from mortal to divine across multiple lifetimes.',

    available_origins: ['mortal_human', 'mortal_animal'],
    default_origin: 'mortal_human',

    domain_access: {
      physical: 'available',
      social: 'available',
      cognitive: 'available',
      magical: 'gated',
      transcendent: 'gated',
      meta: 'gated',          // Ultimate endgame
    },

    ui_exposure: {
      show_soul_panel: true,
      show_transcendence_meter: true,
      show_timeline_navigator: false,  // Unlock later
      show_universe_map: false,        // Unlock later
      show_plot_tracker: true,
    },

    plot_scope: {
      max_scale: 'epic',
      enabled_plot_categories: ['*'],  // All categories
      starting_epic: 'the_mortal_journey',
    },
  },

  {
    id: 'sandbox_divine',
    name: 'Divine Sandbox',
    tagline: 'You are already everything. What will you do?',
    description: 'Start as a minor deity. Shape worlds. Watch civilizations rise and fall.',

    available_origins: ['deity_minor', 'deity_major'],
    default_origin: 'deity_minor',

    domain_access: {
      physical: 'available',
      social: 'available',
      cognitive: 'available',
      magical: 'focus',
      transcendent: 'focus',
      meta: 'available',      // Deities know
    },

    ui_exposure: {
      show_soul_panel: true,
      show_transcendence_meter: true,
      show_timeline_navigator: true,
      show_universe_map: true,
      show_plot_tracker: true,
    },

    plot_scope: {
      max_scale: 'epic',
      enabled_plot_categories: ['*'],
    },

    pacing: {
      time_scale: 10.0,       // Watch eras pass
      threat_level: 5,        // Other deities exist
      resource_abundance: 10, // Unlimited for deities
      social_complexity: 10,
    },
  },
];
```

### Origin Examples

```typescript
const ORIGINS: OriginTemplate[] = [
  {
    id: 'mortal_human',
    name: 'Human',
    being_type: 'mortal_human',
    description: 'A mortal human with unlimited potential but limited starting capabilities.',

    initial_capabilities: {
      physical: { farming: 10, crafting: 5, combat: 5, athletics: 20, survival: 15 },
      social: { conversation: 30, persuasion: 10, empathy: 20 },
      cognitive: { learning_rate: 50, memory_capacity: 50, creativity: 40 },
      magical: { mana_capacity: 0, paradigm_access: [], spell_complexity: 0 },
      transcendent: { soul_awareness: 0, universe_awareness: 0 },
    },

    capability_ceilings: {
      physical: { farming: 100, crafting: 100, combat: 100 },
      social: { conversation: 100, leadership: 100 },
      magical: { mana_capacity: 50, spell_complexity: 50 },  // Limited without transcendence
      transcendent: { soul_awareness: 30 },  // Can sense, not master
    },

    soul_template: {
      archetype: 'wanderer',  // Undefined potential
      initial_wisdom: 0,
      initial_lessons: [],
      transcendence_level: 0,
    },

    lore: {
      origin_story: 'Born into the world knowing nothing, capable of becoming anything.',
    },
  },

  {
    id: 'fae_transcendent',
    name: 'Transcendent Fae',
    being_type: 'fae_transcendent',
    description: 'An ancient fae who has existed since before mortals named the stars.',

    initial_capabilities: {
      physical: { farming: 20, crafting: 60, combat: 40 },
      social: { conversation: 80, persuasion: 70, deception: 60, empathy: 30 },
      cognitive: { learning_rate: 30, memory_capacity: 200, creativity: 90 },
      magical: { mana_capacity: 150, paradigm_access: ['fae_glamour', 'literary_surrealism', 'wild_magic'], spell_complexity: 80 },
      transcendent: {
        soul_awareness: 90,
        other_awareness: 70,
        universe_awareness: 60,
        timeline_perception: 50,
        reality_influence: 40,
      },
    },

    capability_ceilings: {
      // Fae have high ceilings but specific weaknesses
      physical: { farming: 50 },  // Fae don't farm well - too ephemeral
      social: { empathy: 50 },    // Fae struggle with mortal emotions
      transcendent: { reality_influence: 80 },  // Very high ceiling
    },

    soul_template: {
      archetype: 'trickster',
      initial_wisdom: 200,
      initial_lessons: ['time_is_illusion', 'words_are_power', 'beauty_is_truth'],
      transcendence_level: 7,
    },

    plot_access: {
      forbidden_templates: ['simple_farming', 'first_job'],  // Too mundane
      starting_plots: ['the_eternal_dance', 'the_fae_debt'],
    },

    lore: {
      origin_story: 'You remember when this universe was young. You helped shape its dreams.',
      cultural_background: 'The Courts of the Eternal Twilight',
      native_realm: 'The Dreaming',
    },
  },
];
```

### Capability Progression

How capabilities grow and unlock:

```typescript
interface CapabilityProgression {
  /** Gradual improvement through use */
  skill_growth: {
    base_rate: number;            // XP per action
    diminishing_returns: boolean; // Harder at higher levels
    ceiling_approach: 'asymptotic' | 'hard_cap';
  };

  /** Step-change unlocks */
  threshold_unlocks: ThresholdUnlock[];

  /** Plot-gated unlocks */
  plot_unlocks: PlotUnlock[];

  /** Transcendence-gated unlocks */
  transcendence_unlocks: TranscendenceUnlock[];
}

interface ThresholdUnlock {
  /** What capability triggers this */
  trigger_capability: string;
  trigger_level: number;

  /** What unlocks */
  unlocks: {
    new_capabilities?: string[];
    ceiling_increase?: { capability: string; new_ceiling: number }[];
    domain_access?: { domain: string; access: DomainAccess }[];
  };
}

interface TranscendenceUnlock {
  /** Transcendence level required */
  level: TranscendenceLevel;

  /** What becomes available */
  unlocks: {
    domain_access?: { domain: string; access: DomainAccess }[];
    ui_exposure?: Partial<GameMode['ui_exposure']>;
    capability_ceilings?: Partial<CapabilityLevels>;
    plot_templates?: string[];
  };
}
```

### Example: The Farmer's Ascension

A mortal human in "Ascension Path" mode:

**Day 1**:
- Origin: `mortal_human`
- Domains visible: Physical, Social, Cognitive
- Capabilities: Basic farming, conversation
- Plots available: "First Harvest", "Making Friends"

**Year 5**:
- Physical farming hits 50
- Threshold unlock: "Agricultural Mastery" - can now craft magical fertilizers
- Magical domain becomes `gated` → `available`
- First glimpse of magical paradigms

**Year 20**:
- Wisdom accumulates from completed plots
- Soul awareness reaches 30 (ceiling for mortals)
- Strange dreams begin (transcendence foreshadowing)
- Plot assigned: "The Calling" (medium scale)

**Transcendence Level 1** (after completing "The Calling"):
- Transcendent domain unlocks from `locked` → `gated`
- UI shows soul panel
- New capabilities: can sense other souls faintly
- Ceiling increases for magical domain
- Plot unlocked: "The Seeker's Journey" (large scale)

**Transcendence Level 5**:
- Timeline Navigator UI unlocks
- Can perceive alternate timelines
- Capable of teaching others
- Plot: "The Mentor's Shadow" available (teaching others)

**Transcendence Level 8**:
- Universe Map UI unlocks
- Can perceive the multiverse structure
- Reality influence capability unlocked
- Epic plots become available
- The farmer who started with 10 farming skill can now shape reality

### Mode Switching and Soul Continuity

Souls persist across game modes:

```typescript
interface SoulModeTransition {
  /** Soul being transitioned */
  soul_id: string;

  /** Source mode */
  from_mode: string;

  /** Target mode */
  to_mode: string;

  /** How capabilities translate */
  capability_mapping: 'preserve' | 'scale' | 'reset';

  /** What happens to active plots */
  plot_handling: 'continue' | 'pause' | 'adapt' | 'abandon';

  /** Wisdom/lessons always preserved */
  wisdom_preserved: true;  // Always true - wisdom is eternal
}
```

A soul that achieved godhood in "Ascension Path" can be brought into "Cozy Farm" mode - they'll have their wisdom and lessons, but their transcendent capabilities will be `hidden` (not removed, just not accessible in this mode). They might experience strange dreams or déjà vu. If they switch to "Divine Sandbox" mode, full capabilities return.

---

## Appendix: Full Type Definitions

```typescript
// Complete PlotCondition union with all additions
type PlotCondition =
  // Existing
  | { type: 'has_item'; item_id: string }
  | { type: 'at_location'; location: { x: number; y: number }; radius: number }
  | { type: 'has_relationship'; agent_id: string; min_trust: number }
  | { type: 'has_skill'; skill: string; min_level: number }
  | { type: 'wisdom_threshold'; min_wisdom: number }
  | { type: 'personal_tick_elapsed'; ticks: number }
  | { type: 'universe_tick_elapsed'; ticks: number }
  | { type: 'choice_made'; choice_id: string }
  | { type: 'lesson_learned'; lesson_id: string }
  | { type: 'custom'; check: (context: any) => boolean }

  // Phase 1: Emotional
  | { type: 'emotional_state'; state: EmotionalState; duration_ticks?: number }
  | { type: 'mood_threshold'; min?: number; max?: number }
  | { type: 'mood_factor'; factor: keyof MoodFactors; min?: number; max?: number }
  | { type: 'has_trauma'; trauma_type: TraumaType; recency_ticks?: number }
  | { type: 'stress_threshold'; min?: number; max?: number }
  | { type: 'in_breakdown'; breakdown_type?: BreakdownType }
  | { type: 'breakdown_recovered'; since_ticks?: number }

  // Phase 2: Relationships
  | { type: 'relationship_changed'; role: string; delta_threshold: number; recency_ticks?: number }
  | { type: 'has_relationship_with_role'; role: string; min_trust?: number; max_trust?: number }
  | { type: 'social_isolation'; min_ticks: number }
  | { type: 'any_relationship_trust'; min?: number; max?: number }

  // Phase 5: Structural
  | { type: 'not'; condition: PlotCondition }
  | { type: 'has_memory'; memory_type: string; recency_ticks?: number }
  | { type: 'remembers_entity'; entity_role: string }

// Complete PlotEffect union with all additions
type PlotEffect =
  // Existing
  | { type: 'grant_item'; item_id: string; quantity: number }
  | { type: 'grant_skill_xp'; skill: string; xp: number }
  | { type: 'modify_relationship'; agent_id: string; trust_delta: number }
  | { type: 'learn_lesson'; lesson_id: string }
  | { type: 'spawn_attractor'; attractor_id: string; details: Record<string, any> }
  | { type: 'queue_event'; event_type: string; details: Record<string, any> }
  | { type: 'custom'; apply: (context: any) => void }

  // Phase 4: Emotional
  | { type: 'modify_mood'; delta: number }
  | { type: 'modify_mood_factor'; factor: keyof MoodFactors; delta: number }
  | { type: 'add_trauma'; trauma_type: TraumaType; severity?: number; description?: string }
  | { type: 'modify_stress'; delta: number }
  | { type: 'trigger_breakdown'; breakdown_type: BreakdownType }
  | { type: 'create_memory'; memory_type: string; details: Record<string, any> }
  | { type: 'set_emotional_state'; state: EmotionalState; duration_ticks: number }
  | { type: 'modify_relationship_by_role'; role: string; trust_delta: number }
```
