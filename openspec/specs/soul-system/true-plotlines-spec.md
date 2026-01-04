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
