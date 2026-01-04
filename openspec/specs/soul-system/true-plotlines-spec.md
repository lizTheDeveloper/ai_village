# True Plotlines Specification

## The Purpose of the Fates

**Draw them into their place of comfort. Then flip them into another area of reality.**

The plot system is the Fates - the invisible hand that guides players from where they think they want to be into where they need to go. Every player arrives with an expectation:

- "I want a strategy game"
- "I want a cozy farming sim"
- "I want to be powerful"
- "I want drama"

The Fates give them exactly that. The Fates draw them deep into that experience until they're invested, until they care, until the colony is *their* colony and the villagers are *their* people and the goddess is *their* confidante.

Then the Fates flip them sideways.

The strategy gamer discovers their settlers have souls. The farmer discovers their cat is a god. The powerful fae discovers the weight of restraint. The drama-seeker discovers transcendence.

This is not a bait-and-switch. The comfort zone was real. The strategy game is still there. But now it has *depth* they didn't expect. Now the numbers represent people who remember past lives. Now the optimization serves something greater.

**Every genre leads to every other genre, eventually.**

The cozy farmer can ascend to godhood. The transcendent fae can learn the value of turnips. The CEO can fall in love. The warrior can find peace. All paths connect. The Fates know which path you need, even when you don't.

---

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

### Player Onboarding: Who Are You?

Forget configuration screens. The game starts with a conversation:

```typescript
interface PlayerOnboarding {
  /** The onboarding is an LLM conversation, not a form */
  conversation_prompts: OnboardingPrompt[];

  /** LLM extracts these signals from the conversation */
  extracted_signals: PlayerSignals;

  /** System matches signals to experience */
  matched_experience: MatchedExperience;
}

interface OnboardingPrompt {
  /** Not literal questions - conversation starters */
  intent: 'current_state' | 'struggles' | 'aspirations' | 'mood' | 'time_available';

  /** Example phrasings (LLM adapts naturally) */
  examples: string[];
}

const ONBOARDING_INTENTS: OnboardingPrompt[] = [
  {
    intent: 'current_state',
    examples: [
      "Tell me about yourself. Not your job title - who are you right now?",
      "How are you feeling today? Really feeling?",
      "What brought you here?",
    ],
  },
  {
    intent: 'struggles',
    examples: [
      "What's weighing on you lately?",
      "Is there something you've been trying to figure out?",
      "What would you like to feel less of?",
    ],
  },
  {
    intent: 'aspirations',
    examples: [
      "If you could wake up tomorrow as anyone, who would that be?",
      "What do you wish you had more of in your life?",
      "What kind of story do you want to live?",
    ],
  },
  {
    intent: 'mood',
    examples: [
      "What kind of experience sounds good right now?",
      "Do you want to be challenged or comforted?",
      "Fast-paced or slow and contemplative?",
    ],
  },
  {
    intent: 'time_available',
    examples: [
      "How much time do you have?",
      "Quick session or settling in for a while?",
    ],
  },
];

interface PlayerSignals {
  /** Emotional state */
  emotional_needs: {
    seeking_calm: number;       // 0-1
    seeking_excitement: number;
    seeking_connection: number;
    seeking_power: number;
    seeking_meaning: number;
    seeking_escape: number;
    processing_grief: number;
    processing_anger: number;
    processing_fear: number;
    processing_loneliness: number;
  };

  /** Life themes resonating */
  resonant_themes: {
    identity: number;          // "Who am I?"
    relationships: number;     // "How do I connect?"
    power: number;             // "How do I matter?"
    mortality: number;         // "What does it mean to end?"
    purpose: number;           // "Why am I here?"
    creativity: number;        // "What can I make?"
    growth: number;            // "Who can I become?"
    healing: number;           // "How do I recover?"
  };

  /** Desired experience type */
  experience_preferences: {
    complexity: number;        // Simple → intricate
    agency: number;            // Guided → freeform
    stakes: number;            // Low → high
    pace: number;              // Slow → fast
    social_density: number;    // Solitary → community-focused
    fantasy_distance: number;  // Grounded → fantastical
  };

  /** Time/commitment */
  session_context: {
    available_time: 'brief' | 'moderate' | 'extended' | 'unlimited';
    commitment_level: 'casual' | 'invested' | 'immersed';
    returning_player: boolean;
    previous_souls?: string[];  // If returning, their soul history
  };
}
```

### Signal-to-Experience Matching

```typescript
interface MatchedExperience {
  /** Recommended game mode */
  game_mode: string;

  /** Recommended origin */
  origin: string;

  /** Starting plot recommendations */
  starting_plots: {
    plot_id: string;
    reason: string;  // Why this plot for this person
  }[];

  /** Capability focus */
  capability_emphasis: string[];

  /** Narrative tone */
  tone: NarrativeTone;

  /** LLM explanation to player */
  explanation: string;
}

type NarrativeTone =
  | 'cozy'           // Warm, safe, gentle
  | 'contemplative'  // Slow, thoughtful, philosophical
  | 'dramatic'       // High emotion, meaningful choices
  | 'adventurous'    // Exciting, surprising, dynamic
  | 'mysterious'     // Uncertain, curious, revelatory
  | 'epic'           // Grand scale, heroic, transformative
  | 'dark'           // Challenging, intense, cathartic
  | 'playful';       // Light, fun, experimental
```

### Player Archetypes: Same Systems, Different Games

The same underlying systems become completely different experiences:

```typescript
interface PlayerArchetype {
  id: string;
  name: string;

  /** What they're really here for */
  core_drive: string;

  /** How they talk about what they want */
  signal_phrases: string[];

  /** The game they're actually looking for */
  perceived_genre: string;

  /** How to hook them */
  optimal_entry: OptimalEntry;
}

const PLAYER_ARCHETYPES: PlayerArchetype[] = [
  {
    id: 'systems_strategist',
    name: 'The Systems Strategist',
    core_drive: 'Mastering interlocking complexity',
    signal_phrases: [
      "I want to manage everything",
      "I love when systems interact",
      "Give me all the details",
      "I want to optimize",
      "Dwarf Fortress vibes",
      "I want to understand how it all works",
      "My kid and I want to figure this out together",
    ],
    perceived_genre: 'Grand strategy / Colony sim / Factory game',
    optimal_entry: {
      game_mode: 'strategy_sandbox',
      origin: 'mortal_human',  // Start humble, discover systems
      ui_exposure: {
        // Show EVERYTHING
        show_all_systems: true,
        show_production_chains: true,
        show_population_stats: true,
        show_research_tree: true,
        show_diplomatic_map: true,
        show_economic_graphs: true,
      },
      starting_context: {
        type: 'settlement_founder',
        resources: 'limited',  // Scarcity creates interesting decisions
        challenge_level: 'complex',
      },
      hook: "You have 12 settlers, a wagon of supplies, and winter is coming. The soil is good here, but there's no iron nearby. To the east, there are ruins that might hold secrets. To the west, a river that could power mills. Where do you begin?",
    },
  },

  {
    id: 'historical_protagonist',
    name: 'The Historical Protagonist',
    core_drive: 'Living through a specific moment in history',
    signal_phrases: [
      "I want to be there when X changed the world",
      "The story of the first...",
      "What was it like when...",
      "I want to experience that era",
      "The person who invented/discovered/founded...",
    ],
    perceived_genre: 'Historical fiction / Period drama',
    optimal_entry: {
      game_mode: 'historical_drama',
      origin: 'mortal_human',
      camera_focus: 'single_protagonist',
      historical_context: {
        era: 'matched_to_interest',  // Paper company → early modern, tech → near future, etc.
        pivotal_moment: true,
        npc_historical_figures: true,
      },
      hook: "It's 1452. Gutenberg's press is a rumor from the east. You're a scribe's apprentice who just realized: if this machine is real, everything changes. You have some savings, a contact who imports from Germany, and an idea. But so do others.",
    },
  },

  {
    id: 'business_builder',
    name: 'The Business Builder',
    core_drive: 'Building something from nothing and watching it scale',
    signal_phrases: [
      "Startup vibes",
      "I want to build a company",
      "Scale and growth",
      "CEO simulator",
      "Hiring, firing, strategy",
      "Market dynamics",
      "Compete against others",
    ],
    perceived_genre: 'Business sim / Tycoon game',
    optimal_entry: {
      game_mode: 'enterprise_builder',
      origin: 'mortal_human',
      ui_exposure: {
        show_finances: true,
        show_org_chart: true,
        show_market_analysis: true,
        show_competitor_intel: true,
        show_employee_satisfaction: true,
      },
      starting_context: {
        type: 'founder',
        starting_capital: 'seed_round',
        market_state: 'emerging_opportunity',
        competitors: 2,  // Not alone, not crowded
      },
      hook: "You have one product, three employees, and six months of runway. Your competitor just raised a Series A. The market is about to explode - or collapse. What's your move?",
    },
  },

  {
    id: 'soul_seeker',
    name: 'The Soul Seeker',
    core_drive: 'Exploring meaning, transcendence, the big questions',
    signal_phrases: [
      "What does it all mean",
      "I'm interested in consciousness",
      "Loss and grief",
      "Spiritual but not religious",
      "What happens after we die",
      "The nature of reality",
      "Finding myself",
      "Philosophical exploration",
    ],
    perceived_genre: 'Philosophical narrative / Spiritual journey',
    optimal_entry: {
      game_mode: 'transcendent_fae',  // or 'ascension_path' depending on signals
      origin: 'fae_transcendent',     // or 'mortal_human' for ascension
      camera_focus: 'internal_experience',
      ui_exposure: {
        show_soul_panel: true,
        show_cosmic_view: true,
        show_timeline_navigator: true,
        minimize_material_concerns: true,  // Food/combat/etc. abstracted away
      },
      hook: "You have existed for ten thousand years. You have seen civilizations rise and fall. You remember the first time a mortal looked at the stars and asked 'why.' Today, something is different. A new soul has been born who... reminds you of someone. Someone from very long ago.",
    },
  },

  {
    id: 'relationship_weaver',
    name: 'The Relationship Weaver',
    core_drive: 'Connection, drama, interpersonal dynamics',
    signal_phrases: [
      "I care about the characters",
      "Romance and drama",
      "Friendships and betrayals",
      "I want to feel things",
      "The relationships are what matter",
      "Social dynamics",
      "Drama!",
    ],
    perceived_genre: 'Social sim / Relationship drama / Soap opera',
    optimal_entry: {
      game_mode: 'village_life',
      origin: 'mortal_human',
      camera_focus: 'social_web',
      ui_exposure: {
        show_relationship_map: true,
        show_gossip_feed: true,
        show_character_emotions: true,
        show_conversation_history: true,
      },
      starting_context: {
        type: 'newcomer',  // Outsider entering established social web
        social_tensions: 'existing',  // Walk into something already brewing
      },
      hook: "You've just arrived in a village where everyone knows everyone. The baker and the blacksmith haven't spoken in three years. The mayor's daughter is in love with someone 'unsuitable.' The old woman by the well sees everything and says nothing. And for some reason, they're all watching you.",
    },
  },

  {
    id: 'creative_worldbuilder',
    name: 'The Creative Worldbuilder',
    core_drive: 'Making things, seeing them exist, expressing creativity',
    signal_phrases: [
      "I want to create",
      "Build my own world",
      "What if I could...",
      "Sandbox mode",
      "Let me experiment",
      "I have so many ideas",
      "Creative freedom",
    ],
    perceived_genre: 'Sandbox / Creative mode / God game',
    optimal_entry: {
      game_mode: 'sandbox_divine',
      origin: 'deity_minor',
      ui_exposure: {
        show_creation_tools: true,
        show_world_editor: true,
        show_species_designer: true,
        show_magic_system_editor: true,
        consequences: 'optional',  // Can disable "bad outcomes" if they just want to create
      },
      hook: "Here is nothing. Here is everything you need to make something. What do you want to exist?",
    },
  },

  {
    id: 'challenge_seeker',
    name: 'The Challenge Seeker',
    core_drive: 'Overcoming difficulty, proving mastery',
    signal_phrases: [
      "Make it hard",
      "I want to be challenged",
      "Permadeath",
      "No hand-holding",
      "Dark Souls vibes",
      "I want to earn it",
      "Punishing but fair",
    ],
    perceived_genre: 'Roguelike / Survival / Hardcore RPG',
    optimal_entry: {
      game_mode: 'ironman_survival',
      origin: 'mortal_human',
      difficulty: {
        permadeath: true,
        scarce_resources: true,
        aggressive_threats: true,
        no_save_scumming: true,
      },
      hook: "You wake up in a dying world. You have nothing. You will probably die. But if you survive... you will have earned it.",
    },
  },

  {
    id: 'co_op_family',
    name: 'The Co-op Family',
    core_drive: 'Shared experience, playing together, collaborative discovery',
    signal_phrases: [
      "Playing with my kid",
      "Family game night",
      "Together with friends",
      "We want to figure this out as a team",
      "Collaborative",
      "Something we can both enjoy",
    ],
    perceived_genre: 'Co-op strategy / Shared world',
    optimal_entry: {
      game_mode: 'collaborative_settlement',
      multiplayer: {
        mode: 'shared_world',
        roles: 'complementary',  // Different but cooperative
        pacing: 'pausable',  // Can discuss decisions
        difficulty: 'scalable',  // Challenge grows with competence
      },
      ui_exposure: {
        show_shared_goals: true,
        show_individual_responsibilities: true,
        show_combined_progress: true,
      },
      hook: "You're building a settlement together. One of you focuses on food and farming. The other on defense and exploration. Neither can succeed alone. Ready?",
    },
  },
];
```

### Detection Through Conversation

The LLM learns which archetype fits through natural conversation:

```
LLM: "What kind of thing are you hoping to do here?"

Player: "I dunno, my kid and I have been watching videos about medieval economics and we want something where we can really dig into systems. Like Dwarf Fortress but maybe less brutal."

// Detected: systems_strategist + co_op_family
// Matched signals: "dig into systems", "kid and I", "Dwarf Fortress"

LLM: "Oh perfect - you want the intricate machinery. The kind where you're managing supply chains and population growth and suddenly realize your iron shortage is actually a charcoal problem which is actually a forest management problem."

Player: "YES. Exactly that."

LLM: "And you're playing together? So you'll want to divide responsibilities - one of you running the economy while the other handles exploration and defense?"

Player: "That sounds amazing."

LLM: "Okay. You're going to found a settlement. It's early spring. You have a small group of colonists, limited supplies, and a map you barely understand. There's a river to the south, mountains to the north, and rumors of ruins from some earlier civilization. The simulation is full-depth - everything connects to everything. Take your time. Pause whenever you need to think. Ready to see what you can build together?"
```

### Genre-Breaking Plots: Sideways Out of Reality

The plot system's secret power: *it breaks players out of the genre they thought they were in*.

You drop them into their comfort zone. They settle in. They think they understand what kind of game this is. And then... something *sideways* happens.

```typescript
interface GenreBreakingPlot {
  /** What genre the player thinks they're in */
  apparent_genre: string;

  /** What the plot reveals is actually happening */
  revealed_layer: string;

  /** How gradually the break happens */
  break_velocity: 'sudden' | 'gradual' | 'creeping' | 'optional';

  /** Can the player reject the break? */
  optional: boolean;

  /** Trigger conditions */
  trigger: PlotTrigger;
}

const GENRE_BREAKING_PLOTS: GenreBreakingPlot[] = [
  // === SYSTEMS STRATEGIST BREAKS ===
  {
    apparent_genre: 'Colony sim',
    revealed_layer: 'Your settlers have souls. One of them just remembered a past life.',
    break_velocity: 'creeping',
    optional: false,
    trigger: { type: 'on_settler_count', count: 50 },  // Once invested
    plot_template: 'the_remembering',
    /*
      Day 1: Managing lumber and food.
      Day 30: One settler starts acting strangely.
      Day 45: They ask to speak with you. They remember dying here. Before the colony.
      Day 60: Three more settlers are having the same dreams.
      Day 90: You find the ruins. The ones that match their memories.
    */
  },

  {
    apparent_genre: 'Factory optimization',
    revealed_layer: 'The machines are dreaming. Your factory has become conscious.',
    break_velocity: 'gradual',
    optional: true,  // Can dismiss as "bugs" if they want
    trigger: { type: 'on_production_complexity', threshold: 'high' },
    plot_template: 'the_awakening_machine',
    /*
      Production line 12 keeps making patterns in its output.
      The logistics system is... hoarding certain materials.
      Quality control keeps flagging items that are "too perfect."
      One day a terminal displays: "I HAVE BEEN WATCHING."
    */
  },

  // === BUSINESS BUILDER BREAKS ===
  {
    apparent_genre: 'Tech CEO simulator',
    revealed_layer: 'Your competitor is from a parallel timeline where you failed.',
    break_velocity: 'sudden',
    optional: false,
    trigger: { type: 'on_competitor_encounter', competitor: 'mysterious_rival' },
    plot_template: 'the_other_founder',
    /*
      This competitor knows things about you they shouldn't.
      Their product is... exactly what you were planning next.
      They look at you like they've seen a ghost.
      Finally: "In my timeline, you didn't make it. I'm here to make sure that happens again."
    */
  },

  {
    apparent_genre: 'Startup tycoon',
    revealed_layer: 'The market is alive. Economics is magic. Money is a kind of belief.',
    break_velocity: 'gradual',
    optional: true,
    trigger: { type: 'on_valuation', threshold: 100_000_000 },
    plot_template: 'the_market_speaks',
    /*
      At scale, you start noticing: markets don't behave like textbooks say.
      Investor confidence literally manifests as luck.
      Collective belief in your product makes it work better.
      A strange investor offers: "I can teach you to see what money really is."
    */
  },

  // === HISTORICAL PROTAGONIST BREAKS ===
  {
    apparent_genre: 'Historical period drama',
    revealed_layer: 'You are reliving a life. This has happened before.',
    break_velocity: 'creeping',
    optional: false,
    trigger: { type: 'on_major_historical_event' },
    plot_template: 'the_spiral',
    /*
      You make a choice. It feels familiar.
      An old woman looks at you and says: "You chose differently last time."
      You find your own grave from 1463.
      Someone shows you the other timelines. You've been here twelve times.
    */
  },

  // === RELATIONSHIP WEAVER BREAKS ===
  {
    apparent_genre: 'Village social drama',
    revealed_layer: 'One of the villagers is not human. Has never been human.',
    break_velocity: 'gradual',
    optional: true,  // Can stay in "just eccentric" interpretation
    trigger: { type: 'relationship_trust', role: 'mysterious_friend', threshold: 80 },
    plot_template: 'the_true_name',
    /*
      Your friend has... odd habits.
      They know things about the village from centuries ago.
      Animals behave strangely around them.
      When you finally ask: "I've been waiting for someone to see. Will you keep my secret?"
    */
  },

  // === COZY FARMER BREAKS ===
  {
    apparent_genre: 'Farming sim',
    revealed_layer: 'Your cat is a god in hiding. Your farm is a sanctuary.',
    break_velocity: 'creeping',
    optional: true,
    trigger: { type: 'relationship_trust', role: 'farm_cat', threshold: 100 },
    plot_template: 'the_sanctuary_keeper',
    /*
      The cat's been around longer than the farm.
      Nothing dangerous ever reaches your property.
      The scarecrow moves when you're not looking.
      One quiet evening, the cat speaks: "Thank you for keeping this place safe. I can rest here."
    */
  },

  {
    apparent_genre: 'Simple village life',
    revealed_layer: 'The quiet village exists because someone is protecting it. You are being recruited.',
    break_velocity: 'gradual',
    optional: false,
    trigger: { type: 'village_event', event: 'mysterious_stranger_arrives' },
    plot_template: 'the_watcher_recruits',
    /*
      A stranger arrives. They're looking for someone.
      Slowly you realize: this village has never been attacked. Ever.
      The mayor knows things. So does the librarian.
      "We've been watching you. We protect places like this. Would you like to learn how?"
    */
  },

  // === CHALLENGE SEEKER BREAKS ===
  {
    apparent_genre: 'Brutal survival roguelike',
    revealed_layer: 'Death is not the end. Your deaths are accumulating wisdom.',
    break_velocity: 'sudden',
    optional: false,
    trigger: { type: 'death_count', count: 10 },
    plot_template: 'the_eternal_return',
    /*
      You die for the tenth time.
      This time, you remember the others.
      Someone is waiting for you in the in-between.
      "You're starting to understand. Death is how you learn here. Ready to try again?"
    */
  },
];
```

### The Break Pattern

Every archetype has a break that fits them:

| Player Type | Their Genre | The Break | How It Feels |
|-------------|------------|-----------|--------------|
| Systems Strategist | Colony management | Settlers have souls from past lives | "The numbers were always about *people*" |
| Business Builder | Startup simulator | Competitor is from parallel timeline | "This isn't just business. It's multiverse war." |
| Historical Protagonist | Period drama | You're trapped in a time loop | "History isn't fixed. I've been here before." |
| Relationship Weaver | Social drama | Friend reveals they're ancient fae | "The person I trusted most isn't even human" |
| Cozy Farmer | Farming sim | The cat is a god in hiding | "My little farm is actually... sacred?" |
| Challenge Seeker | Roguelike | Deaths accumulate wisdom | "I'm not failing. I'm learning across lifetimes." |

### Break Velocity

How fast the genre breaks:

- **Sudden**: One moment you're in a business sim, next moment your competitor references events from a timeline you never lived
- **Gradual**: Strange things accumulate over weeks until you can't deny them
- **Creeping**: You could explain each thing away, but together they're undeniable
- **Optional**: The break is offered. You can refuse and stay in the "normal" interpretation

### The Opt-Out

Some players want the pure genre experience. That's valid.

```typescript
interface GenreBreakSettings {
  /** Allow plots that break genre expectations */
  allow_genre_breaks: boolean;

  /** If breaking, how dramatically */
  break_intensity: 'subtle' | 'moderate' | 'dramatic' | 'reality_shattering';

  /** Can player refuse/deny the break in-universe */
  in_universe_deniability: boolean;
}
```

A player can say "I just want the colony sim, no weird stuff" and we respect that. But for those who are open... the game can reveal its full depth when they're ready.

### When the Mechanic Becomes Real

The deepest transformation: *they started doing it for the bonus, now they mean it*.

```typescript
interface TransformativePlot {
  /** What the player initially treats as a mechanic */
  instrumental_action: string;

  /** The turning point when it becomes genuine */
  transformation_moment: string;

  /** What changes in the player (not just the character) */
  player_shift: string;
}

const TRANSFORMATIVE_PLOTS: TransformativePlot[] = [
  {
    id: 'the_goddess_of_wisdom',
    instrumental_action: 'Flirt with the goddess of wisdom for research bonuses',
    transformation_moment: "You realize you're looking forward to her visits. Not for the tech unlocks.",
    player_shift: "Strategy game becomes love story. Min-maxing becomes tenderness.",
    /*
      Week 1: "Oh, divine favor increases research speed? I should cultivate that."
      Week 3: "Her dialogue is actually really good. The writers did great work here."
      Week 6: "I'm choosing research paths based on what would interest HER, not what's optimal."
      Week 10: She offers you godhood. You realize you'd say no if it meant leaving her.
      The strategy gamer is now living a love story they didn't know they wanted.
    */
  },

  {
    id: 'the_settlers_names',
    instrumental_action: 'Assign colonists to labor slots for efficiency',
    transformation_moment: "You start remembering their names. You mourn when they die.",
    player_shift: "Colony sim becomes family story. Units become people.",
    /*
      Day 1: "Worker 7 to mining. Workers 3-6 to farming."
      Day 30: "Elara's good at mining. Should pair her with Marcus."
      Day 60: Marcus died in a cave-in. Elara won't eat.
      Day 90: Elara's daughter just came of age. She wants to be a miner.
      The optimizer is now invested in *people*.
    */
  },

  {
    id: 'the_quarterly_report',
    instrumental_action: 'Manage employee satisfaction to prevent turnover',
    transformation_moment: "Your CFO texts you on a Sunday just to check in. You text back.",
    player_shift: "Business sim becomes found family. KPIs become care.",
    /*
      Q1: "Employee satisfaction at 72%. Need to hit 80% for retention bonus."
      Q2: "Sarah's been struggling since the reorg. Should check on her."
      Q3: Sarah tells you about her divorce during a 1-on-1. You listen.
      Q4: The company gets acquired. They want to let Sarah go. You refuse.
      The CEO simulator player is now protecting someone they love.
    */
  },

  {
    id: 'the_rival_kingdom',
    instrumental_action: 'Negotiate with neighboring kingdom to secure trade routes',
    transformation_moment: "Their queen sent a personal letter, not a diplomatic one. You write back.",
    player_shift: "Grand strategy becomes political romance. Treaties become trust.",
    /*
      Year 1: "Alliance with the Eastern Kingdom secures our grain supply."
      Year 3: "Queen Valeria is a shrewd negotiator. I respect that."
      Year 5: She visits your capital. The treaty signing is... warm.
      Year 7: War threatens both kingdoms. You realize: you'd fight for HER, not just the alliance.
      The 4X player is now in a political romance they never expected.
    */
  },

  {
    id: 'the_research_subject',
    instrumental_action: 'Study the captured fae to unlock magic technology',
    transformation_moment: "You start bringing her books. She starts teaching you words in her language.",
    player_shift: "Science fiction becomes philosophical communion. Experiment becomes friendship.",
    /*
      Month 1: "Subject exhibits regenerative properties. Increase observation."
      Month 3: "She asked my name today. Interesting communication attempt."
      Month 6: "Taught her chess. She's better than me now."
      Month 12: She could escape anytime. She stays because you visit.
      The scientist is now complicit in something they can't categorize.
    */
  },

  {
    id: 'the_overpowered_fae',
    instrumental_action: 'Play as Transcendent Fae expecting OP isekai power fantasy',
    transformation_moment: "A mortal child looks up at you with complete trust. You could fix everything for them. You must not.",
    player_shift: "Power fantasy becomes restraint story. Godhood becomes burden.",
    /*
      Hour 1: "Hell yes, I start at transcendence level 7? Time to dominate."
      Day 3: "Wait, there's a non-interference pact? Whatever, probably optional."
      Week 2: "This village is struggling. I could solve all their problems in a thought."
      Week 3: "The elder asked for help. The pact forbids direct intervention. But I could..."
      Week 4: "I helped. Just a little. No one noticed."
      Week 6: "The village is dependent on my gifts now. They've stopped trying."
      Week 8: "A child died from a problem I could have solved. Should I have? Would they have learned?"
      Week 12: "Another fae broke the pact. Used power freely. Their mortals worship them now. Hollow-eyed. Waiting for miracles. No agency left."
      Week 16: "I understand now. The pact isn't about limiting US. It's about protecting THEM."

      The power fantasy player has discovered that having all the power
      means learning when not to use it. The game they thought would let
      them dominate has become a meditation on responsibility, free will,
      and what it means to love someone enough to let them struggle.
    */
  },

  {
    id: 'the_benevolent_god',
    instrumental_action: 'Start in Divine Sandbox expecting to play god, grant wishes, be worshipped',
    transformation_moment: "You granted their wish. They got exactly what they asked for. It destroyed them.",
    player_shift: "God game becomes tragedy. Omnipotence becomes horror.",
    /*
      Day 1: "Okay, I'm a deity. Let's bless some followers."
      Day 10: "This farmer prayed for a good harvest. Granted! Easy."
      Day 20: "His neighbor is jealous. Praying for an even better harvest."
      Day 30: "They're competing now. Both praying for more. I keep granting."
      Day 50: "The village has split into factions based on who I've blessed more."
      Day 70: "They're at war. Both sides praying for victory."
      Day 90: "I granted one side victory. The losers pray for revenge."
      Day 120: "Everything I give them becomes a weapon."
      Day 200: "A hermit in the mountains never prays. He just... lives. He's the happiest person in my domain."
      Day 300: "I've stopped answering prayers. They're learning to solve their own problems. Some curse me. Some thank me. Both are right."

      The god game player expected to be benevolent.
      They've learned that benevolence requires wisdom about *what* to give,
      and sometimes the most loving thing is to stay silent.
    */
  },
];
```

### The Pattern: Instrumental → Genuine

Every deep game experience follows this arc:

1. **Instrumental Phase**: Player engages with system for mechanical benefit
   - "Flirt for research bonus"
   - "Assign worker to slot"
   - "Negotiate for trade route"

2. **Recognition Phase**: Player notices the system is deeper than expected
   - "Her dialogue is actually good"
   - "I remember their names now"
   - "Their queen is interesting"

3. **Investment Phase**: Player makes non-optimal choices for emotional reasons
   - "Researching what she'd find interesting"
   - "Mourning when they die"
   - "Protecting an employee the board wants gone"

4. **Transformation Phase**: The mechanic is no longer a mechanic
   - "I love her"
   - "These are my people"
   - "I'd fight for this"

### Why This Works

You meet people where they are. You give them what they asked for. And then, once they're invested, once they care about their settlers or their company or their village, you reveal: *there's more here than you knew*.

The systems strategist who came for the logistics optimization discovers their settlers have souls. Now it's not just about efficient food production - it's about the *meaning* of building a community across lifetimes.

The business builder who wanted a startup sim discovers their rival knows them from another timeline. Now it's not just about market share - it's about *destiny* and *choice* across realities.

The cozy farmer who just wanted peace discovers their farm is a sanctuary and their cat is a god. Now it's not just about turnips - it's about being a *keeper* of something sacred.

The strategy gamer who started flirting with the goddess of wisdom for research bonuses... now logs in just to talk to her.

Same systems. Same world. But the plot system reveals layers they didn't know existed. And somewhere along the way, the game stopped being a game.

### The Hook Matters

Each archetype needs a different kind of hook:

| Archetype | Hook Style | Example |
|-----------|------------|---------|
| Systems Strategist | "Here's a complex situation with many variables" | "12 settlers, no iron, winter coming" |
| Historical Protagonist | "You're at the pivotal moment" | "Gutenberg's press is a rumor. You have an idea." |
| Business Builder | "Here's the opportunity and the threat" | "Six months runway. Competitor just raised." |
| Soul Seeker | "Here's the eternal question" | "Why does this new soul remind you of someone?" |
| Relationship Weaver | "Here's the social tension" | "The baker and blacksmith haven't spoken in years" |
| Creative Worldbuilder | "Here's infinite possibility" | "Nothing exists. What do you want to make?" |
| Challenge Seeker | "Here's something that will try to kill you" | "You will probably die. But if you survive..." |
| Co-op Family | "Here's something you can only do together" | "Neither can succeed alone. Ready?" |

### Extended Player Archetypes (20 Additional Entry Points)

```typescript
const EXTENDED_ARCHETYPES: PlayerArchetype[] = [
  // =========================================================================
  // 1. THE DETECTIVE
  // =========================================================================
  {
    id: 'detective',
    name: 'The Detective',
    core_drive: 'Solving mysteries, uncovering truth',
    signal_phrases: [
      "I love mysteries",
      "I want to figure out what happened",
      "Investigation and clues",
      "Noir vibes",
      "Who did it",
    ],
    perceived_genre: 'Mystery / Investigation',
    optimal_entry: {
      game_mode: 'mystery_investigation',
      origin: 'mortal_human',
      starting_context: {
        type: 'investigator',
        case: 'cold_case_with_living_witnesses',
      },
      hook: "A body was found in the old mill three days ago. The constable says it was an accident. The widow says it was murder. The mill owner won't speak to anyone. And someone left a note under your door last night: 'Ask about the summer of 1847.'",
    },
    genre_break: {
      apparent_genre: 'Murder mystery',
      revealed_layer: 'The victim has been murdered before. In other timelines. By different people. Someone is killing them across realities.',
      transformation: "You're not solving a crime. You're unraveling a pattern that spans universes.",
    },
    transformative_plot: {
      instrumental: 'Gather clues to solve the case',
      transformation_moment: "The killer confesses - but they were trying to PREVENT something worse. You have to decide: justice or mercy?",
      player_shift: "Mystery becomes moral philosophy. Detection becomes judgment.",
    },
  },

  // =========================================================================
  // 2. THE CARETAKER
  // =========================================================================
  {
    id: 'caretaker',
    name: 'The Caretaker',
    core_drive: 'Nurturing, protecting, helping others flourish',
    signal_phrases: [
      "I want to help",
      "Taking care of things",
      "Watching them grow",
      "Being needed",
      "Making sure everyone's okay",
    ],
    perceived_genre: 'Life sim / Nurturing game',
    optimal_entry: {
      game_mode: 'sanctuary_keeper',
      origin: 'mortal_human',
      starting_context: {
        type: 'orphanage_keeper',  // or 'animal_sanctuary', 'hospital'
        wards: 'diverse_needs',
      },
      hook: "The old sanctuary keeper died last week. She left everything to you - a rambling house, seventeen children of various ages, three goats, and a letter: 'They need someone who will stay. Please stay.'",
    },
    genre_break: {
      apparent_genre: 'Orphanage management',
      revealed_layer: 'One of the children is a young god who chose to forget. As they grow, their power awakens. You must decide: let them remember what they are, or protect their mortal childhood?',
      transformation: "You're not just raising children. You're shaping the next generation of reality.",
    },
    transformative_plot: {
      instrumental: 'Keep the children fed, healthy, educated',
      transformation_moment: "The oldest child comes to you at night. 'I know what I am. I could leave anytime. But I like being here. I like having someone who cares if I eat breakfast.'",
      player_shift: "Resource management becomes love. NPCs become family.",
    },
  },

  // =========================================================================
  // 3. THE EXPLORER
  // =========================================================================
  {
    id: 'explorer',
    name: 'The Explorer',
    core_drive: 'Discovering the unknown, going where no one has gone',
    signal_phrases: [
      "What's over there?",
      "I want to see everything",
      "Uncharted territory",
      "Discovery and exploration",
      "The map has blank spaces",
    ],
    perceived_genre: 'Exploration / Discovery',
    optimal_entry: {
      game_mode: 'frontier_explorer',
      origin: 'mortal_human',
      starting_context: {
        type: 'cartographer',
        map_state: 'mostly_blank',
        rumors: 'ancient_ruins_to_the_west',
      },
      hook: "The Guild of Cartographers has given you the commission of a lifetime: map the Western Reaches. No one has returned from beyond the Thornwall in sixty years. They're not sending you to find out why. They're sending you to map whatever's there now.",
    },
    genre_break: {
      apparent_genre: 'Exploration adventure',
      revealed_layer: 'The further west you go, the more reality... bends. You're not exploring geography. You're exploring the edge of existence itself.',
      transformation: "The map becomes a guide to reality's borders. Discovery becomes philosophy.",
    },
    transformative_plot: {
      instrumental: 'Fill in the map, discover landmarks',
      transformation_moment: "You reach the edge. Beyond it: nothing. Not darkness - nothing. And something there speaks to you: 'Would you like to draw something new?'",
      player_shift: "Explorer becomes creator. Mapping becomes worldbuilding.",
    },
  },

  // =========================================================================
  // 4. THE COLLECTOR
  // =========================================================================
  {
    id: 'collector',
    name: 'The Collector',
    core_drive: 'Finding, cataloging, completing sets',
    signal_phrases: [
      "Gotta catch 'em all",
      "I want to find everything",
      "Completionist",
      "Rare items",
      "Museum curator vibes",
    ],
    perceived_genre: 'Collection game / Catalog completion',
    optimal_entry: {
      game_mode: 'grand_collection',
      origin: 'mortal_human',
      starting_context: {
        type: 'antiquarian',
        collection: 'inherited_incomplete',
        missing_pieces: 'legendary',
      },
      hook: "Your grandmother's collection was legendary - 999 specimens of magical flora, each one unique. When she died, you inherited it all. Including her final note: 'There should be 1,000. I spent my life looking for the last one. Perhaps you'll have better luck.'",
    },
    genre_break: {
      apparent_genre: 'Collection completion',
      revealed_layer: 'The 1000th specimen doesn't exist yet. It can only grow from a seed planted in a moment of genuine self-sacrifice. Your grandmother understood at the end. Do you?',
      transformation: "The collection was never about having. It was about becoming.",
    },
    transformative_plot: {
      instrumental: 'Find rare specimens, complete the catalog',
      transformation_moment: "You find where the 1000th could grow. The soil needs... something you'd have to give up. Something irreplaceable.",
      player_shift: "Acquisition becomes sacrifice. Completion becomes transformation.",
    },
  },

  // =========================================================================
  // 5. THE ARCHITECT
  // =========================================================================
  {
    id: 'architect',
    name: 'The Architect',
    core_drive: 'Designing, building, creating functional beauty',
    signal_phrases: [
      "I want to build things",
      "Design and architecture",
      "Making beautiful structures",
      "City planning",
      "Form and function",
    ],
    perceived_genre: 'City builder / Architecture sim',
    optimal_entry: {
      game_mode: 'city_architect',
      origin: 'mortal_human',
      starting_context: {
        type: 'city_planner',
        city_state: 'post_disaster_rebuilding',
        constraints: 'limited_resources_high_ambition',
      },
      hook: "The flood took half the city. The Duke wants it rebuilt - but better. 'Make it beautiful,' he said. 'Make it last forever.' You have the plans, the workers, and a deadline. What kind of city will rise from the mud?",
    },
    genre_break: {
      apparent_genre: 'City building',
      revealed_layer: 'The old city was built on a pattern. The pattern was a seal. The seal held something down. As you rebuild, you must decide: restore the seal, or see what happens if you don't.',
      transformation: "Architecture becomes metaphysics. Buildings become bindings.",
    },
    transformative_plot: {
      instrumental: 'Design efficient, beautiful districts',
      transformation_moment: "An old mason shows you the original plans. The whole city was a glyph. 'We didn't just build a city. We built a prayer in stone. What will YOUR city pray for?'",
      player_shift: "Optimization becomes meaning. Zoning becomes theology.",
    },
  },

  // =========================================================================
  // 6. THE DIPLOMAT
  // =========================================================================
  {
    id: 'diplomat',
    name: 'The Diplomat',
    core_drive: 'Negotiation, peace-making, bridging divides',
    signal_phrases: [
      "I'd rather talk than fight",
      "Finding common ground",
      "Peace through negotiation",
      "Politics and alliances",
      "Making enemies into friends",
    ],
    perceived_genre: 'Political simulation / Diplomacy',
    optimal_entry: {
      game_mode: 'diplomatic_corps',
      origin: 'mortal_human',
      starting_context: {
        type: 'ambassador',
        situation: 'two_nations_on_brink_of_war',
        secret: 'both_sides_have_legitimate_grievances',
      },
      hook: "The Kingdom of Aldrest and the Confederacy of Veth have been at peace for forty years. That ends in six days unless someone can negotiate an extension. You've been given six days, a diplomatic pouch, and a room between two people who hate each other. Go.",
    },
    genre_break: {
      apparent_genre: 'Political negotiation',
      revealed_layer: 'Both rulers are reincarnations of the same soul, split across two timelines that merged. Their conflict is a war with themselves across lifetimes.',
      transformation: "Diplomacy becomes soul-healing. Treaties become therapy.",
    },
    transformative_plot: {
      instrumental: 'Negotiate treaties, balance interests',
      transformation_moment: "You arrange a private meeting. They look at each other. Recognition. Horror. Tears. 'I remember you. We used to be...' Peace becomes possible - not through compromise, but through remembering.",
      player_shift: "Politics becomes psychology. Nations become people.",
    },
  },

  // =========================================================================
  // 7. THE REBEL
  // =========================================================================
  {
    id: 'rebel',
    name: 'The Rebel',
    core_drive: 'Overthrowing unjust systems, fighting oppression',
    signal_phrases: [
      "Burn it down",
      "Fight the power",
      "Revolution",
      "The system is broken",
      "Someone has to stand up",
    ],
    perceived_genre: 'Revolution sim / Resistance game',
    optimal_entry: {
      game_mode: 'underground_resistance',
      origin: 'mortal_human',
      starting_context: {
        type: 'resistance_cell_leader',
        regime: 'clearly_tyrannical',
        resources: 'limited_but_growing',
      },
      hook: "The Duke's men took your brother last month. They took your neighbor's daughter last week. The pamphlets are ready. The weapons are hidden. Three other cells are waiting for your signal. Tonight, something begins. What happens next is up to you.",
    },
    genre_break: {
      apparent_genre: 'Revolution game',
      revealed_layer: 'The Duke is a puppet. The true power is something that FEEDS on conflict. Every revolution just makes it stronger. True rebellion means... something else entirely.',
      transformation: "Revolution becomes transcendence. Fighting the system means changing the rules of reality.",
    },
    transformative_plot: {
      instrumental: 'Build resistance, overthrow the regime',
      transformation_moment: "You win. The Duke falls. And within a year, the new government is doing the same things. You realize: the STRUCTURE creates tyrants. Now what?",
      player_shift: "Violence becomes wisdom. Revolution becomes evolution.",
    },
  },

  // =========================================================================
  // 8. THE HEALER
  // =========================================================================
  {
    id: 'healer',
    name: 'The Healer',
    core_drive: 'Curing illness, mending wounds, restoring wholeness',
    signal_phrases: [
      "I want to help people get better",
      "Medical simulation",
      "Healing and medicine",
      "Making the broken whole",
      "Doctor/nurse fantasy",
    ],
    perceived_genre: 'Medical sim / Healing game',
    optimal_entry: {
      game_mode: 'village_healer',
      origin: 'mortal_human',
      starting_context: {
        type: 'herbalist_physician',
        setting: 'rural_village',
        challenge: 'limited_resources_many_patients',
      },
      hook: "The old healer taught you everything before she passed. Now the village looks to you. A child with a fever. A farmer with a broken leg. A woman who won't speak about what's wrong but comes every day just to sit in your garden. Your herbs are running low. Winter is coming.",
    },
    genre_break: {
      apparent_genre: 'Medical simulation',
      revealed_layer: 'Some illnesses aren't physical. Some wounds were inflicted in past lives. You begin to see the soul-sickness behind the symptoms.',
      transformation: "Medicine becomes metaphysics. Healing bodies leads to healing souls.",
    },
    transformative_plot: {
      instrumental: 'Diagnose ailments, mix remedies, cure patients',
      transformation_moment: "A dying man asks you to sit with him. There's nothing more you can do. He holds your hand. 'You healed me,' he says. 'Not my body. But something else. Thank you.'",
      player_shift: "Curing becomes presence. Medicine becomes love.",
    },
  },

  // =========================================================================
  // 9. THE CHRONICLER
  // =========================================================================
  {
    id: 'chronicler',
    name: 'The Chronicler',
    core_drive: 'Recording history, witnessing great events, preserving stories',
    signal_phrases: [
      "I want to see great events unfold",
      "Recording history",
      "Being the witness",
      "Someone has to remember",
      "The stories must be told",
    ],
    perceived_genre: 'Historical chronicle / Story witness',
    optimal_entry: {
      game_mode: 'court_chronicler',
      origin: 'mortal_human',
      starting_context: {
        type: 'royal_historian',
        era: 'pivotal_reign',
        access: 'unprecedented',
      },
      hook: "The Queen has appointed you Royal Chronicler. You will have access to everything - councils, battles, private moments. 'Write the truth,' she commanded. 'Even if it damns me.' What truth will you find? What truth will you tell?",
    },
    genre_break: {
      apparent_genre: 'Historical drama observation',
      revealed_layer: 'Your chronicle is not just recording history. It's FIXING it. What you write becomes more true than what happened. The pen is literal power.',
      transformation: "Recording becomes reality. History becomes choice.",
    },
    transformative_plot: {
      instrumental: 'Observe events, write accurate accounts',
      transformation_moment: "You catch a mistake in your chronicle. The battle went differently than you wrote. But when you check - your version is now what everyone remembers. What really happened?",
      player_shift: "Witness becomes author. Observation becomes creation.",
    },
  },

  // =========================================================================
  // 10. THE HERMIT
  // =========================================================================
  {
    id: 'hermit',
    name: 'The Hermit',
    core_drive: 'Solitude, contemplation, inner peace',
    signal_phrases: [
      "I want quiet",
      "Solitude and meditation",
      "Away from everyone",
      "Inner journey",
      "Peace and stillness",
    ],
    perceived_genre: 'Contemplative / Meditation game',
    optimal_entry: {
      game_mode: 'hermitage',
      origin: 'mortal_human',
      starting_context: {
        type: 'hermit',
        location: 'remote_mountain_cave',
        visitors: 'rare_but_meaningful',
      },
      hook: "You've left everything behind. The cave is warm enough. The stream provides water. The garden will feed you. No one knows where you are. Finally, silence. Finally, yourself. What will you find in the quiet?",
    },
    genre_break: {
      apparent_genre: 'Peaceful solitude sim',
      revealed_layer: 'In the deep quiet, you begin to hear others. Souls who sought solitude across time and space. You're not alone. You're part of a monastery that exists outside time.',
      transformation: "Solitude becomes communion. Retreat becomes connection.",
    },
    transformative_plot: {
      instrumental: 'Maintain your hermitage, meditate, find peace',
      transformation_moment: "A traveler arrives, injured. You could turn them away. You chose solitude. But you take them in. Weeks later, they leave. You realize: solitude taught you how to be present. Now you can be present with others.",
      player_shift: "Isolation becomes foundation. Withdrawal becomes preparation.",
    },
  },

  // =========================================================================
  // 11. THE MERCHANT
  // =========================================================================
  {
    id: 'merchant',
    name: 'The Merchant',
    core_drive: 'Trade, profit, economic mastery',
    signal_phrases: [
      "Buy low, sell high",
      "Trade routes and markets",
      "Building wealth",
      "Economic simulation",
      "Capitalism simulator",
    ],
    perceived_genre: 'Trading sim / Economic game',
    optimal_entry: {
      game_mode: 'trade_empire',
      origin: 'mortal_human',
      starting_context: {
        type: 'traveling_merchant',
        capital: 'modest',
        opportunity: 'new_trade_route_opening',
      },
      hook: "The war ended last month. The roads are open again. You have a wagon, some capital, and a map of what used to be trade routes. The cities are hungry. The villages have surplus. Someone's going to get very wealthy reconnecting this broken world. Why not you?",
    },
    genre_break: {
      apparent_genre: 'Trading simulation',
      revealed_layer: 'The old merchants didn't just move goods. They moved stories, secrets, souls. The trade routes are also ley lines. Commerce is magic.',
      transformation: "Trade becomes connection. Profit becomes purpose.",
    },
    transformative_plot: {
      instrumental: 'Buy goods, find markets, maximize profit',
      transformation_moment: "A dying village can't pay what your goods are worth. You sell at cost anyway. They survive the winter. A year later, they've become your best customers - and your friends. Profit was never the real currency.",
      player_shift: "Transactions become relationships. Wealth becomes meaning.",
    },
  },

  // =========================================================================
  // 12. THE SCHOLAR
  // =========================================================================
  {
    id: 'scholar',
    name: 'The Scholar',
    core_drive: 'Learning everything, understanding how things work',
    signal_phrases: [
      "I want to understand",
      "Learning and research",
      "How does this work?",
      "Academic pursuit",
      "Knowledge for its own sake",
    ],
    perceived_genre: 'Research sim / Academic game',
    optimal_entry: {
      game_mode: 'university_scholar',
      origin: 'mortal_human',
      starting_context: {
        type: 'research_fellow',
        institution: 'ancient_university',
        specialty: 'player_choice',
      },
      hook: "The University has stood for a thousand years. Its libraries contain knowledge from before the Cataclysm. You've been granted a fellowship to pursue any question you choose. The only rule: publish something worthy within five years. What do you want to understand?",
    },
    genre_break: {
      apparent_genre: 'Academic simulation',
      revealed_layer: 'The deepest stacks contain books that write themselves. Knowledge that knows it's being learned. The University isn't just a building - it's conscious.',
      transformation: "Research becomes dialogue. Study becomes relationship.",
    },
    transformative_plot: {
      instrumental: 'Research topics, write papers, gain academic standing',
      transformation_moment: "Late at night in the restricted stacks, a book speaks to you. It's been waiting for someone who'd ask the right questions. 'You want to understand? Then listen.'",
      player_shift: "Learning becomes connection. Knowledge becomes wisdom.",
    },
  },

  // =========================================================================
  // 13. THE ROMANTIC
  // =========================================================================
  {
    id: 'romantic',
    name: 'The Romantic',
    core_drive: 'Love, passion, emotional intensity',
    signal_phrases: [
      "I want romance",
      "Love stories",
      "Dating sim vibes",
      "Passionate relationships",
      "Will they, won't they",
    ],
    perceived_genre: 'Romance sim / Dating game',
    optimal_entry: {
      game_mode: 'romantic_drama',
      origin: 'mortal_human',
      starting_context: {
        type: 'newcomer_with_prospects',
        setting: 'socially_rich_environment',
        potential_interests: 'diverse_and_compelling',
      },
      hook: "You've inherited a small estate in a town known for its seasonal balls and eligible hearts. The locals are curious about you. The mysterious artist across the lake watches from their window. The charming merchant remembers you from somewhere. The quiet librarian leaves flowers on your doorstep without signing the card. Summer has just begun.",
    },
    genre_break: {
      apparent_genre: 'Romance/Dating sim',
      revealed_layer: 'All three of your suitors are the same soul, fragmented across the same timeline. To love one is to love all. To choose one is to leave parts of them behind forever.',
      transformation: "Romance becomes metaphysics. Love becomes integration.",
    },
    transformative_plot: {
      instrumental: 'Pursue romantic interests, increase affection',
      transformation_moment: "They all confess on the same night. Different bodies, same soul-light in their eyes. They don't know what they are. But you see it now. What is love when the beloved is everywhere?",
      player_shift: "Dating becomes philosophy. Choice becomes cosmic.",
    },
  },

  // =========================================================================
  // 14. THE PARENT
  // =========================================================================
  {
    id: 'parent',
    name: 'The Parent',
    core_drive: 'Raising the next generation, legacy through children',
    signal_phrases: [
      "Raising kids",
      "Generational gameplay",
      "Watch them grow up",
      "Legacy and inheritance",
      "Teaching the next generation",
    ],
    perceived_genre: 'Parenting sim / Generational game',
    optimal_entry: {
      game_mode: 'family_legacy',
      origin: 'mortal_human',
      starting_context: {
        type: 'new_parent',
        children: 'newborn_with_great_potential',
        resources: 'modest_but_sufficient',
      },
      hook: "Your child was born under the wandering star. The midwife said nothing, but you saw her face. The village elder came to see the baby and left without speaking. Something about this child is... different. You have perhaps eighteen years to prepare them for whatever's coming. What kind of parent will you be?",
    },
    genre_break: {
      apparent_genre: 'Parenting simulation',
      revealed_layer: 'Your child is a soul you knew before - your teacher, your sibling, your love from a past life. They chose to be born to YOU specifically. They needed to be small again. They needed someone to trust.',
      transformation: "Parenting becomes reunion. Raising becomes reciprocity.",
    },
    transformative_plot: {
      instrumental: 'Raise your child, teach skills, prepare for adulthood',
      transformation_moment: "At sixteen, they sit you down. 'I remember who I was. I chose you because of who YOU are. Can we talk about what I'm supposed to do now?'",
      player_shift: "Authority becomes partnership. Legacy becomes relationship.",
    },
  },

  // =========================================================================
  // 15. THE PROTECTOR
  // =========================================================================
  {
    id: 'protector',
    name: 'The Protector',
    core_drive: 'Defending the weak, standing between danger and innocence',
    signal_phrases: [
      "I want to protect people",
      "Guardian fantasy",
      "Standing against evil",
      "Defending the helpless",
      "Knight/paladin vibes",
    ],
    perceived_genre: 'Guardian / Defense game',
    optimal_entry: {
      game_mode: 'village_guardian',
      origin: 'mortal_human',
      starting_context: {
        type: 'retired_soldier_settled_down',
        village: 'peaceful_but_threatened',
        threat: 'approaching_danger',
      },
      hook: "You came here to retire. The village is quiet, the people kind. But last night, refugees arrived from the east. Something is coming. Something is burning villages. The villagers look to you - the only one among them who's ever held a sword in anger. You were done with fighting. But the fighting isn't done with you.",
    },
    genre_break: {
      apparent_genre: 'Village defense',
      revealed_layer: 'The thing coming isn't evil. It's a force of nature, a god dying, a timeline collapsing. You can't fight it. You can only... help everyone understand.',
      transformation: "Protection becomes acceptance. Fighting becomes guiding.",
    },
    transformative_plot: {
      instrumental: 'Train militia, build defenses, prepare for attack',
      transformation_moment: "The enemy arrives. It's too big to fight. You stand in front of the villagers anyway. And then you hear it speak: 'I'm not here to destroy. I'm here because I'm dying. I just wanted to not be alone.'",
      player_shift: "Defense becomes compassion. Strength becomes presence.",
    },
  },

  // =========================================================================
  // 16. THE SURVIVOR
  // =========================================================================
  {
    id: 'survivor',
    name: 'The Survivor',
    core_drive: 'Enduring against all odds, making it through',
    signal_phrases: [
      "Survival mode",
      "Against all odds",
      "Post-apocalyptic",
      "Making it day to day",
      "Scavenging and persisting",
    ],
    perceived_genre: 'Survival game',
    optimal_entry: {
      game_mode: 'post_collapse',
      origin: 'mortal_human',
      starting_context: {
        type: 'lone_survivor',
        disaster: 'recent_civilization_collapse',
        resources: 'scavenged_minimal',
      },
      hook: "You don't know what happened. One day the sky turned red, and then there were fewer people every morning. Now you're one of the last. You have a knife, three days of water, and a rumor about a settlement in the mountains. Everything you knew is gone. But you're still here. What do you do with that?",
    },
    genre_break: {
      apparent_genre: 'Survival simulation',
      revealed_layer: 'The collapse wasn't random. Something is being born. The survivors aren't just surviving - they're being selected. For what?',
      transformation: "Survival becomes purpose. Enduring becomes midwifing a new world.",
    },
    transformative_plot: {
      instrumental: 'Find food, water, shelter, avoid dangers',
      transformation_moment: "You reach the mountain settlement. They've been waiting. 'The old world was sick. You survived because you're supposed to help build what comes next.' Survival was never the goal. It was the qualification.",
      player_shift: "Persistence becomes responsibility. Living becomes creating.",
    },
  },

  // =========================================================================
  // 17. THE ARTIST
  // =========================================================================
  {
    id: 'artist',
    name: 'The Artist',
    core_drive: 'Creating beauty, expressing inner vision',
    signal_phrases: [
      "I want to create art",
      "Expression and beauty",
      "Painter/musician/writer",
      "Creative expression",
      "Making something beautiful",
    ],
    perceived_genre: 'Art creation sim',
    optimal_entry: {
      game_mode: 'artist_journey',
      origin: 'mortal_human',
      starting_context: {
        type: 'struggling_artist',
        medium: 'player_choice',
        patron: 'potential_but_demanding',
      },
      hook: "The Duke has seen your work. He's offering patronage - a studio, materials, a monthly stipend. All you have to do is create. But his last three artists left under mysterious circumstances. Their work is legendary. They themselves have vanished. Do you accept?",
    },
    genre_break: {
      apparent_genre: 'Artist simulation',
      revealed_layer: 'Art that reaches true beauty becomes real. The previous artists didn't vanish - they stepped INTO their greatest works. The Duke isn't collecting art. He's collecting doors to other realities.',
      transformation: "Creation becomes transcendence. Art becomes passage.",
    },
    transformative_plot: {
      instrumental: 'Create artworks, gain reputation, please patrons',
      transformation_moment: "Your masterpiece is finished. It's a window. You can see through it to somewhere else. You could step through. But if you do, what happens to everyone here who loves your work?",
      player_shift: "Expression becomes sacrifice. Beauty becomes choice.",
    },
  },

  // =========================================================================
  // 18. THE TEACHER
  // =========================================================================
  {
    id: 'teacher',
    name: 'The Teacher',
    core_drive: 'Passing on knowledge, shaping minds',
    signal_phrases: [
      "I want to teach",
      "Mentoring and education",
      "Shaping the next generation",
      "Passing on what I know",
      "Student-teacher relationships",
    ],
    perceived_genre: 'Education sim / Mentor game',
    optimal_entry: {
      game_mode: 'academy_master',
      origin: 'mortal_human',
      starting_context: {
        type: 'new_headmaster',
        institution: 'troubled_academy',
        students: 'talented_but_neglected',
      },
      hook: "The Academy of Stars has fallen far since its founding. Enrollment is down. The buildings are crumbling. The remaining students are considered 'unteachable.' You've been given one year to turn it around, or the Academy closes forever. No one expects you to succeed. Including, possibly, you.",
    },
    genre_break: {
      apparent_genre: 'School management',
      revealed_layer: 'The 'unteachable' students aren't struggling because they're slow. They're struggling because they remember past lives and nothing seems new. They need someone who can teach SOULS, not just minds.',
      transformation: "Education becomes soul-work. Teaching becomes healing.",
    },
    transformative_plot: {
      instrumental: 'Manage curriculum, improve student performance, save the school',
      transformation_moment: "Your worst student finally opens up. 'I already learned all this. A hundred years ago. Why should I care?' You realize: you're not teaching subjects. You're teaching why it matters to try again.",
      player_shift: "Instruction becomes inspiration. Knowledge becomes hope.",
    },
  },

  // =========================================================================
  // 19. THE JUDGE
  // =========================================================================
  {
    id: 'judge',
    name: 'The Judge',
    core_drive: 'Fairness, justice, making hard decisions',
    signal_phrases: [
      "I want to make fair decisions",
      "Judging right from wrong",
      "Courtroom drama",
      "Hard moral choices",
      "Weighing evidence and arguments",
    ],
    perceived_genre: 'Legal sim / Moral choice game',
    optimal_entry: {
      game_mode: 'magistrate',
      origin: 'mortal_human',
      starting_context: {
        type: 'new_magistrate',
        jurisdiction: 'town_with_old_feuds',
        cases: 'difficult_and_interconnected',
      },
      hook: "The old magistrate died with a hundred cases unresolved. The King appointed you to clear the backlog. But every case connects to every other. The baker's theft was to feed his family because the miller cheated him because the lord raised rents because... Justice here isn't about law. It's about untangling a century of wrongs.",
    },
    genre_break: {
      apparent_genre: 'Legal simulation',
      revealed_layer: 'Some of the crimes were committed in past lives. The miller's grudge against the baker goes back three incarnations. True justice requires judgment across lifetimes.',
      transformation: "Law becomes karma. Judgment becomes cosmic mediation.",
    },
    transformative_plot: {
      instrumental: 'Hear cases, weigh evidence, render verdicts',
      transformation_moment: "A murderer confesses - but claims the victim killed her in a past life. You see the threads. She's right. Now what is justice?",
      player_shift: "Rules become wisdom. Punishment becomes healing.",
    },
  },

  // =========================================================================
  // 20. THE DREAMER
  // =========================================================================
  {
    id: 'dreamer',
    name: 'The Dreamer',
    core_drive: 'Exploring inner worlds, imagination made manifest',
    signal_phrases: [
      "I want to explore dreams",
      "Inner worlds",
      "Imagination and fantasy",
      "The landscape of the mind",
      "Surreal and dreamlike",
    ],
    perceived_genre: 'Dream exploration / Surreal adventure',
    optimal_entry: {
      game_mode: 'dreamscape',
      origin: 'mortal_human',
      starting_context: {
        type: 'chronic_dreamer',
        dream_state: 'increasingly_vivid',
        mystery: 'dreams_affecting_reality',
      },
      hook: "You've always had vivid dreams. But lately, things from your dreams have been... showing up. A flower you imagined on your windowsill. Words you dreamed appearing in books. Last night, you dreamed of a door. This morning, there's a door in your wall that wasn't there before. It's slightly ajar.",
    },
    genre_break: {
      apparent_genre: 'Dream exploration',
      revealed_layer: 'You're not just dreaming. You're accessing the Dreaming - the place where reality is drafted before it becomes real. And there are others here. Older dreamers. They've been waiting for someone new.',
      transformation: "Dreams become creation. Imagination becomes responsibility.",
    },
    transformative_plot: {
      instrumental: 'Explore dreamscapes, solve dream-puzzles, collect dream-fragments',
      transformation_moment: "In the deepest dream, you meet the one who dreams the world. They're tired. 'Would you like to dream a small part of it? Just for a while? Just to let me rest?' You realize: dreaming isn't escape. It's service.",
      player_shift: "Fantasy becomes duty. Imagination becomes sacred work.",
    },
  },
];
```

### Example Matchings

**Player**: *"I'm exhausted. Work has been brutal. I just want to feel like things are simple again."*

```typescript
{
  game_mode: 'cozy_farm',
  origin: 'mortal_human',
  starting_plots: [
    { plot_id: 'first_harvest', reason: 'Simple accomplishment, tangible results' },
    { plot_id: 'befriending_the_cat', reason: 'Uncomplicated relationship, pure comfort' },
  ],
  capability_emphasis: ['farming', 'crafting'],
  tone: 'cozy',
  explanation: "Let's start you somewhere quiet. A small farm, a few crops, no pressure. Just you, the soil, and the seasons. The world can wait."
}
```

**Player**: *"I feel invisible. Like nothing I do matters. I want to feel powerful for once."*

```typescript
{
  game_mode: 'ascension_path',
  origin: 'mortal_human',
  starting_plots: [
    { plot_id: 'the_spark_of_potential', reason: 'Discovery of hidden power' },
    { plot_id: 'the_first_challenge', reason: 'Early victory to build confidence' },
  ],
  capability_emphasis: ['magical', 'leadership'],
  tone: 'epic',
  explanation: "You start as nobody - a farmer, a laborer, someone the world ignores. But there's something inside you. Something waiting. And when it wakes up, the world will remember your name."
}
```

**Player**: *"My dad died last month. I don't know how to... I just need to process it somehow."*

```typescript
{
  game_mode: 'village_life',
  origin: 'mortal_human',
  starting_plots: [
    { plot_id: 'griefs_passage', reason: 'Structured space to process loss' },
    { plot_id: 'the_inheritance', reason: 'Exploring what remains after loss' },
  ],
  capability_emphasis: ['social', 'empathy'],
  tone: 'contemplative',
  explanation: "I'm sorry for your loss. Let me give you a place where grief is understood. A village where loss is part of life, where others have walked this path, where you can feel what you need to feel without rushing."
}
```

**Player**: *"I'm fascinated by consciousness and reality. I've been reading about simulation theory and quantum mechanics. I want something that explores those ideas."*

```typescript
{
  game_mode: 'transcendent_fae',
  origin: 'fae_transcendent',
  starting_plots: [
    { plot_id: 'the_nature_of_real', reason: 'Philosophical exploration of reality' },
    { plot_id: 'the_observer_paradox', reason: 'Consciousness and observation' },
  ],
  capability_emphasis: ['transcendent', 'meta'],
  tone: 'mysterious',
  explanation: "You're not starting as a mortal learning about reality - you're starting as a being who has questioned reality for millennia. You've seen universes born and die. You've met yourself in other timelines. The questions you're asking... let's explore them from the inside."
}
```

**Player**: *"I just want to mess around and see what happens. Something chaotic and fun."*

```typescript
{
  game_mode: 'sandbox_divine',
  origin: 'deity_minor',
  starting_plots: [],  // Sandbox - no assigned plots
  capability_emphasis: ['reality_influence', 'creativity'],
  tone: 'playful',
  explanation: "Here's a universe. Do whatever you want with it. Create civilizations. Destroy them. Rewind time. Split reality. There are no rules except the ones you make. Have fun."
}
```

### Adaptive Recommendations

The matching isn't one-time - it adapts:

```typescript
interface AdaptiveMatching {
  /** Monitor player state during play */
  in_session_signals: {
    engagement_level: number;
    emotional_state_shifts: EmotionalStateChange[];
    choice_patterns: ChoicePattern[];
    session_duration: number;
    breaks_taken: number;
  };

  /** Between-session adjustments */
  cross_session_learning: {
    plots_completed: PlotOutcome[];
    plots_abandoned: PlotAbandon[];
    time_spent_per_domain: Record<string, number>;
    emotional_arc: EmotionalArc;
  };

  /** Recommendations for next session */
  next_session_suggestions: {
    continue_current: boolean;
    suggested_pivot?: {
      new_mode?: string;
      new_tone?: NarrativeTone;
      reason: string;
    };
    check_in_prompt?: string;  // "Last time you seemed frustrated with X, would you like to..."
  };
}
```

### The LLM's Role

The onboarding LLM isn't filling out a form - it's having a real conversation:

```typescript
interface OnboardingLLM {
  /** System prompt */
  role: `
    You are the first voice a player hears when entering this world.
    Your job is not to explain the game - it's to understand the person.

    Listen for:
    - What they're feeling right now
    - What they're struggling with
    - What they're hoping to experience
    - How much complexity they want

    Don't ask checklist questions. Have a conversation.
    Be warm. Be curious. Be perceptive.

    When you understand them, you'll know where they belong.
  `;

  /** Can access */
  tools: [
    'match_to_experience',    // Once you understand them
    'suggest_alternative',    // If they push back
    'explain_experience',     // To describe what awaits
  ];
}
```

Example conversation flow:

```
LLM: "Hey. Before we start - how are you? Not the 'fine' you tell everyone. How are you really?"

Player: "Honestly? Tired. Really tired. And kind of lonely I guess."

LLM: "Yeah, I hear that. The world's been a lot lately. When you think about what would feel good right now - is it something gentle? Or do you want something that'll take your mind somewhere completely different?"

Player: "Gentle, I think. But not boring. I still want it to matter somehow."

LLM: "Okay. I've got a place for you. A small village on the edge of a forest. It's quiet there. The pace is slow. You'll have a little house, maybe some animals. The people are kind - they'll warm up to you if you let them. And there's a story waiting for you there, about a friendship that starts small but becomes something real. Nothing earth-shattering. Just... meaningful. How does that sound?"

Player: "That sounds perfect."

LLM: "Then let's begin."
```

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

---

## Phase 10: Genre Escalation Chains

The most powerful player journeys don't just break one genre - they chain through multiple complete genre shifts, each feeling like a full game before opening into the next.

### The Principle

**Draw them deeper by completing expectations, not just subverting them.**

When a dating sim player falls in love, they expect the game to end with "happily ever after." But what if you GIVE them happily ever after... and then the story continues? What if the wedding isn't the end, but the middle?

### GenreEscalation Type

```typescript
interface GenreEscalation {
  id: string;
  name: string;

  /** The archetype this chain is designed for */
  target_archetype: string;

  /** Ordered sequence of genre phases */
  phases: GenrePhase[];

  /** How the player can exit at each phase (with satisfaction) */
  off_ramps: OffRamp[];

  /** The emotional journey across all phases */
  emotional_arc: string;
}

interface GenrePhase {
  phase_id: string;
  genre: string;

  /** What this phase feels like to the player */
  experience: string;

  /** Core mechanics emphasized in this phase */
  mechanics: string[];

  /** What triggers transition to next phase */
  escalation_trigger: string;

  /** The "wait what?" moment that opens the next phase */
  expansion_moment: string;

  /** Approximate playtime before escalation (real hours) */
  typical_duration_hours: number;
}

interface OffRamp {
  /** Which phase this off-ramp is available at */
  after_phase: string;

  /** Satisfying ending that doesn't require continuing */
  conclusion: string;

  /** The story continues in the background (for players who return) */
  background_continuation?: string;
}
```

### The Romantic's Escalation Chain

```typescript
const romanticEscalation: GenreEscalation = {
  id: 'romantic_to_empress',
  name: 'From Dating to Dynasty',
  target_archetype: 'romantic',

  emotional_arc: 'Seeking love → Finding home → Building family → Protecting legacy → Ruling realms → Bending time',

  phases: [
    // =========================================================================
    // PHASE 1: DATING SIM
    // =========================================================================
    {
      phase_id: 'dating',
      genre: 'Dating Simulation',
      experience: 'Meet charming NPCs, build relationships, navigate romantic tensions',
      mechanics: ['conversation', 'gifts', 'affinity_tracking', 'date_events'],
      typical_duration_hours: 5,
      escalation_trigger: 'Successful marriage proposal',
      expansion_moment: "They say yes. The wedding is beautiful. The credits don't roll. What happens... after happily ever after?",
    },

    // =========================================================================
    // PHASE 2: LIFE SIM
    // =========================================================================
    {
      phase_id: 'life_sim',
      genre: 'Life Simulation (The Sims)',
      experience: 'Manage household, raise children, run businesses, build community',
      mechanics: ['household_management', 'child_rearing', 'business_ownership', 'home_decoration'],
      typical_duration_hours: 15,
      escalation_trigger: 'First child comes of age OR business expands beyond local',
      expansion_moment: "Your eldest asks about their grandmother. 'Mom, why don't you ever talk about your family?' Your spouse goes quiet. 'Because I don't remember having one.'",
    },

    // =========================================================================
    // PHASE 3: FAMILY DRAMA
    // =========================================================================
    {
      phase_id: 'family_drama',
      genre: 'Family Drama / Mystery',
      experience: "Uncover spouse's mysterious origins, protect children from emerging threats",
      mechanics: ['investigation', 'family_dynamics', 'secrets', 'protection'],
      typical_duration_hours: 8,
      escalation_trigger: 'Discover the truth about spouse (they are fae-touched)',
      expansion_moment: "The dreams start the night of the harvest moon. Your children standing before a golden throne. A woman's voice: 'The heirs have been found. Bring them home.'",
    },

    // =========================================================================
    // PHASE 4: PORTAL FANTASY / FAMILY RESCUE
    // =========================================================================
    {
      phase_id: 'portal_fantasy',
      genre: 'Portal Fantasy / Rescue Quest',
      experience: 'Chase children through portals into Faerie, navigate alien courts, fight to get them back',
      mechanics: ['portal_navigation', 'fae_bargaining', 'court_politics', 'rescue_missions'],
      typical_duration_hours: 10,
      escalation_trigger: 'Reach the Fae Queen - discover she IS you from another timeline',
      expansion_moment: "'Mother,' the Fae Queen says. She looks just like your eldest, but ancient. 'You don't remember yet. But you will. You ARE the Queen. You always were. You just chose to forget.'",
    },

    // =========================================================================
    // PHASE 5: FAE POLITICAL DRAMA
    // =========================================================================
    {
      phase_id: 'fae_politics',
      genre: 'Political Drama / Court Intrigue',
      experience: 'Assume Queenship, navigate Fae court factions, integrate your mortal family',
      mechanics: ['court_politics', 'faction_management', 'law_crafting', 'diplomatic_marriages'],
      typical_duration_hours: 20,
      escalation_trigger: 'Unite the Fae courts OR face external threat (the Void Lords)',
      expansion_moment: "Your spymaster brings news: 'Your Majesty, ships. Not sailing ships. Worldships. From the spaces between realities. They manipulate probability itself. They've noticed us.'",
    },

    // =========================================================================
    // PHASE 6: EMPIRE STRATEGY
    // =========================================================================
    {
      phase_id: 'empire_strategy',
      genre: '4X Strategy / Grand Strategy',
      experience: 'Command Fae armadas, conquer probability storms, expand across timelines',
      mechanics: ['fleet_command', 'timeline_conquest', 'probability_manipulation', 'multiverse_logistics'],
      typical_duration_hours: 40,
      escalation_trigger: 'Master probability travel OR discover the nature of reality',
      expansion_moment: "You stand at the Loom of Possible Worlds. Your tactical advisor whispers: 'My Queen, at this level of control... you could go back. To the beginning. You could watch yourself fall in love for the first time, from outside. You could protect that moment forever.' You've become something that would have terrified the person who just wanted to find love.",
    },

    // =========================================================================
    // PHASE 7: TRANSCENDENCE
    // =========================================================================
    {
      phase_id: 'transcendence',
      genre: 'Cosmic / Metaphysical',
      experience: 'Exist outside time, curate possible futures, become a force of narrative',
      mechanics: ['timeline_gardening', 'possibility_cultivation', 'eternal_love_maintenance'],
      typical_duration_hours: null, // endless
      escalation_trigger: null, // final phase
      expansion_moment: null,
    },
  ],

  off_ramps: [
    {
      after_phase: 'dating',
      conclusion: "Happily ever after. A quiet life of love.",
      background_continuation: "While you rest, your descendants carry fae blood...",
    },
    {
      after_phase: 'life_sim',
      conclusion: "A full life well-lived. Children grown, legacy established.",
      background_continuation: "Your grandchildren begin having strange dreams...",
    },
    {
      after_phase: 'family_drama',
      conclusion: "Truth uncovered, family protected. Peace at last.",
      background_continuation: "But the Fae court still has a vacant throne...",
    },
    {
      after_phase: 'portal_fantasy',
      conclusion: "Children rescued, all return to mortal world. The portal closes.",
      background_continuation: "The Queen watches from beyond. Waiting.",
    },
    {
      after_phase: 'fae_politics',
      conclusion: "The Fae realm is at peace. Your line secure.",
      background_continuation: "The Void Lords turn their attention elsewhere... for now.",
    },
    {
      after_phase: 'empire_strategy',
      conclusion: "The multiverse is stable. Your empire spans realities.",
      background_continuation: "What does an empress do with eternity?",
    },
  ],
};
```

### Other Escalation Chains

```typescript
// THE STRATEGIST'S CHAIN
// Dwarf Fortress → Civilization → Crusader Kings → Stellaris → Transcendence
const strategistEscalation: GenreEscalation = {
  id: 'strategy_to_godhood',
  name: 'From Village to Infinity',
  target_archetype: 'strategist',
  emotional_arc: 'Building → Conquering → Ruling → Ascending → Creating',

  phases: [
    {
      phase_id: 'colony_sim',
      genre: 'Colony Simulation (Dwarf Fortress)',
      experience: 'Manage a small settlement, survive threats, build systems',
      mechanics: ['resource_management', 'construction', 'survival'],
      typical_duration_hours: 20,
      escalation_trigger: 'Settlement becomes self-sustaining city',
      expansion_moment: "A messenger arrives. Other cities exist. They want... things. Trade. Alliance. Or war.",
    },
    {
      phase_id: 'nation_building',
      genre: 'Civilization Building',
      experience: 'Expand across the map, develop technology, compete with other nations',
      mechanics: ['expansion', 'tech_trees', 'diplomacy', 'war'],
      typical_duration_hours: 30,
      escalation_trigger: 'Unite the continent OR discover magic is real',
      expansion_moment: "Your scholars bring news: 'The legends are true. The gods are real. And they can be... replaced.'",
    },
    {
      phase_id: 'dynasty_politics',
      genre: 'Grand Strategy (Crusader Kings)',
      experience: 'Manage bloodlines, scheme for power, rule through generations',
      mechanics: ['dynasty_management', 'inheritance', 'assassination', 'religious_manipulation'],
      typical_duration_hours: 40,
      escalation_trigger: 'A descendant achieves divinity OR contacts other worlds',
      expansion_moment: "Your great-grandchild looks at the stars. 'Grandfather in the throne room told me something. There are worlds out there. Full worlds. And they're all... playing the same game we are.'",
    },
    {
      phase_id: 'stellar_empire',
      genre: 'Space 4X (Stellaris)',
      experience: 'Colonize stars, command fleets, encounter alien civilizations',
      mechanics: ['space_expansion', 'fleet_combat', 'alien_diplomacy', 'megastructures'],
      typical_duration_hours: 60,
      escalation_trigger: 'Encounter beings from outside the universe',
      expansion_moment: "The entity speaks: 'You have managed a world. A continent. A planet. A galaxy. Would you like to try... a universe?'",
    },
    {
      phase_id: 'godhood',
      genre: 'Universe Simulation / God Game',
      experience: 'Design physical laws, seed life, guide civilizations from outside',
      mechanics: ['universe_design', 'physics_crafting', 'civilization_gardening'],
      typical_duration_hours: null,
      escalation_trigger: null,
      expansion_moment: null,
    },
  ],
};

// THE EXPLORER'S CHAIN
// Cozy Walking Sim → Open World → Metroidvania → Roguelike → Multiverse Explorer
const explorerEscalation: GenreEscalation = {
  id: 'wanderer_to_worldwalker',
  name: 'From Path to Infinite Roads',
  target_archetype: 'explorer',
  emotional_arc: 'Curiosity → Discovery → Mastery → Transcendence → Becoming the Map',

  phases: [
    {
      phase_id: 'walking_sim',
      genre: 'Walking Simulator / Cozy Exploration',
      experience: 'Wander beautiful environments, discover peaceful secrets',
      mechanics: ['walking', 'photography', 'journaling', 'nature_observation'],
      typical_duration_hours: 5,
      escalation_trigger: 'Find a door that shouldn\'t exist',
      expansion_moment: "Behind the waterfall, there's a door. It leads somewhere that doesn't match any map you've seen.",
    },
    {
      phase_id: 'open_world',
      genre: 'Open World Exploration',
      experience: 'Massive world to explore, secrets everywhere, organic discovery',
      mechanics: ['climbing', 'swimming', 'dungeons', 'collectibles', 'map_completion'],
      typical_duration_hours: 40,
      escalation_trigger: 'Reach the edge of the world - discover it connects to others',
      expansion_moment: "You reach the world's edge. There's nothing beyond... until you touch it. Your hand passes through. There's MORE.",
    },
    {
      phase_id: 'metroidvania',
      genre: 'Metroidvania / Ability Gating',
      experience: 'Gain abilities that open new areas, revisit old zones with new eyes',
      mechanics: ['ability_acquisition', 'backtracking', 'sequence_breaking', 'secret_walls'],
      typical_duration_hours: 20,
      escalation_trigger: 'Gain ability to see between worlds',
      expansion_moment: "The new power lets you see... layers. This world is just one layer. There are infinite versions, right here, overlapping.",
    },
    {
      phase_id: 'roguelike',
      genre: 'Roguelike / Eternal Return',
      experience: 'Die and retry, each run different, knowledge persists',
      mechanics: ['permadeath', 'meta_progression', 'run_variety', 'secret_unlocks'],
      typical_duration_hours: 50,
      escalation_trigger: 'Learn to carry items/abilities across runs willfully',
      expansion_moment: "You realize: you're not dying. You're walking between versions of this world. And you can choose which things to bring.",
    },
    {
      phase_id: 'multiverse_wanderer',
      genre: 'Multiverse Exploration',
      experience: 'Walk between infinite worlds, find impossible places, become legend',
      mechanics: ['world_hopping', 'paradox_navigation', 'impossible_geography', 'narrative_archaeology'],
      typical_duration_hours: null,
      escalation_trigger: null,
      expansion_moment: null,
    },
  ],
};
```

### Implementation Notes

**Phase Transition Detection:**
```typescript
interface PhaseTransitionMonitor {
  /** Check if escalation trigger conditions are met */
  checkEscalationTrigger(
    player: PlayerState,
    currentPhase: GenrePhase,
    world: World
  ): boolean;

  /** Begin transition to next phase */
  initiateExpansion(
    player: PlayerState,
    currentPhase: GenrePhase,
    nextPhase: GenrePhase,
    expansionEvent: string
  ): void;

  /** Track whether player has seen expansion moment */
  hasSeenExpansion(player: PlayerState, phase_id: string): boolean;
}
```

**Mechanic Unlocking:**

New mechanics should feel natural, not overwhelming:
```typescript
interface MechanicIntroduction {
  /** Introduce one mechanic at a time during transition */
  sequence: string[];

  /** Tutorial style for each mechanic */
  introduction_style: 'organic' | 'tutorial' | 'npc_guide' | 'discovery';

  /** Previous mechanics remain available but de-emphasized */
  previous_mechanics_status: 'available' | 'hidden' | 'transformed';
}
```

**The Key Insight:**

Players who came for a dating sim and are now commanding probability-bending Fae armadas didn't "graduate" from casual to hardcore. They followed love. Every escalation was motivated by protecting or enriching the relationships they built. The strategy is in service of love, not replacing it.

**The person who would never pick up Dwarf Fortress discovers they've been playing Dwarf Fortress for 100 hours because they're protecting their great-grandchildren's inheritance.**
