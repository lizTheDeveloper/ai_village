# Plot System Implementation Plan - 2026-01-04

## Goal: Make Creating Plots Easy

The spec defines rich dramatic arcs. To make them authorable, we need:
1. **Declarative templates** - JSON/YAML plot definitions, no code required
2. **Rich condition vocabulary** - Authors describe situations, not code
3. **Automatic binding** - Plots find their own actors
4. **Composition tooling** - Nest plots visually

---

## Architecture: The Plot Authoring Stack

```
┌─────────────────────────────────────────────────────────┐
│  PLOT AUTHORING LAYER (JSON/YAML + Editor)              │
│  - Plot templates as data files                         │
│  - Visual editor for stage/transition graphs            │
│  - LLM-assisted plot generation from prompts            │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  PLOT RUNTIME LAYER (TypeScript)                        │
│  - PlotConditionEvaluator (expanded)                    │
│  - PlotEffectExecutor (expanded)                        │
│  - PlotAssignmentSystem (event-driven)                  │
│  - PlotProgressionSystem (existing)                     │
│  - PlotCompositionSystem (new)                          │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  COMPONENT LAYER (ECS)                                  │
│  - MoodComponent (exists)                               │
│  - RelationshipComponent (exists)                       │
│  - PlotLinesComponent (exists)                          │
│  - GenrePhaseComponent (new)                            │
│  - OriginComponent (new)                                │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Condition & Effect Vocabulary (Week 1)
**Goal:** Authors can use emotional/relationship conditions in templates

| Task | Complexity | Files |
|------|------------|-------|
| Add emotional conditions to evaluator | Simple | `PlotConditionEvaluator.ts` |
| Add relationship conditions | Medium | `PlotConditionEvaluator.ts` |
| Add emotional effects to executor | Simple | `PlotEffectExecutor.ts` |
| Add NOT/OR condition support | Simple | `PlotConditionEvaluator.ts` |
| Add bound_agents to PlotLineInstance | Simple | `PlotTypes.ts` |

**New Conditions:**
```typescript
// Emotional (hook into MoodComponent)
| { type: 'emotional_state'; state: EmotionalState; duration_ticks?: number }
| { type: 'mood_threshold'; min?: number; max?: number }
| { type: 'stress_threshold'; min?: number; max?: number }
| { type: 'has_trauma'; trauma_type: string; recency_ticks?: number }

// Relationship (hook into RelationshipComponent)
| { type: 'has_relationship_with_role'; role: string; min_trust?: number }
| { type: 'relationship_changed'; role: string; delta: number }
| { type: 'social_isolation'; min_ticks: number }

// Structural
| { type: 'not'; condition: PlotCondition }
// + support for condition_groups (OR of ANDs)
```

**New Effects:**
```typescript
| { type: 'modify_mood'; delta: number }
| { type: 'modify_stress'; delta: number }
| { type: 'add_trauma'; trauma_type: string; severity: number }
| { type: 'set_emotional_state'; state: EmotionalState; duration_ticks: number }
| { type: 'modify_relationship_by_role'; role: string; trust_delta: number }
```

**Deliverable:** Can write plot template like:
```typescript
{
  id: 'betrayal_arc',
  stages: [...],
  transitions: [{
    from_stage: 'trust_established',
    to_stage: 'betrayal_discovered',
    conditions: [
      { type: 'has_relationship_with_role', role: 'betrayer', min_trust: 50 },
      { type: 'relationship_changed', role: 'betrayer', delta: -30 },
    ],
    on_transition_effects: [
      { type: 'add_trauma', trauma_type: 'betrayal', severity: 7 },
      { type: 'set_emotional_state', state: 'furious', duration_ticks: 100 },
    ],
  }],
}
```

---

### Phase 2: Event-Driven Assignment (Week 2)
**Goal:** Plots trigger automatically from game events

| Task | Complexity | Files |
|------|------------|-------|
| Define PlotTrigger types | Simple | `PlotTypes.ts` |
| Create EventDrivenPlotAssignmentSystem | Medium | New file |
| Add trigger listeners for trauma/relationship/emotion | Medium | Integration |
| Auto-bind agents on assignment | Medium | `PlotAssignmentSystem.ts` |

**New Triggers:**
```typescript
type PlotTrigger =
  | { type: 'on_trauma'; trauma_type?: string }
  | { type: 'on_relationship_change'; delta_threshold: number }
  | { type: 'on_emotional_state'; state: EmotionalState; duration: number }
  | { type: 'on_breakdown'; breakdown_type?: string }
  | { type: 'on_death_nearby'; relationship_role?: string }
  | { type: 'on_skill_mastery'; skill: string; level: number }
```

**Template Example:**
```typescript
{
  id: 'grief_journey',
  assignment_rules: {
    triggers: [
      { type: 'on_death_nearby', relationship_role: 'loved_one' },
    ],
    bind_trigger_agents: {
      'deceased': 'target',  // Bind the dead entity to role 'deceased'
    },
  },
  // Plot automatically assigned when loved one dies
  // 'deceased' role bound automatically
}
```

---

### Phase 2.5: Retroactive Plot Recognition (Week 2.5)
**Goal:** Recognize plots that emerged organically from gameplay, after the fact

Sometimes narratives emerge naturally - an agent builds trust with someone, gets betrayed, experiences trauma - without any plot being assigned. This phase adds the ability to recognize these emergent patterns and optionally award lessons or formalize them.

| Task | Complexity | Files |
|------|------------|-------|
| Create EventStreamComponent | Simple | `EventStreamComponent.ts` |
| Define PlotRecognitionRule types | Medium | `PlotTypes.ts` |
| Create PlotRecognitionSystem | Complex | `PlotRecognitionSystem.ts` |
| Add recognition rules to templates | Simple | `PlotTypes.ts` |
| Integrate with lesson awarding | Medium | Integration |

**New Types:**
```typescript
// Event stream stored on entities for pattern matching
interface EventStreamComponent {
  type: ComponentType.EventStream;
  events: StreamedEvent[];
  max_events: number;                 // Rolling window (e.g., 1000)
  recognized_patterns: string[];      // Don't double-recognize
}

interface StreamedEvent {
  tick: number;
  event_type: 'trauma' | 'relationship_change' | 'emotional_shift' |
              'death_nearby' | 'skill_gain' | 'breakdown' | 'recovery';
  data: Record<string, any>;
  involved_agents?: string[];
}

// Recognition rules (can be attached to plot templates)
interface PlotRecognitionRule {
  template_id: string;
  event_sequence: EventPattern[];     // Ordered sequence to match
  max_duration?: number;              // Must happen within X ticks
  on_recognition: 'award_lesson' | 'assign_at_current_stage' | 'narrate_only';
}

interface EventPattern {
  event_type: string;
  constraints: Record<string, any>;   // e.g., { trauma_type: 'betrayal' }
  binds_role?: string;                // Dynamically bind the agent involved
}
```

**Recognition Examples:**
```typescript
// Betrayal Arc - recognized after the fact
const betrayalRecognition: PlotRecognitionRule = {
  template_id: 'betrayal_arc',
  event_sequence: [
    {
      event_type: 'relationship_milestone',
      constraints: { trust_crossed: 70, direction: 'up' },
      binds_role: 'betrayer'
    },
    {
      event_type: 'relationship_change',
      constraints: { trust_delta_min: -40, role: 'betrayer' }
    },
    {
      event_type: 'trauma',
      constraints: { trauma_type: 'betrayal' }
    }
  ],
  max_duration: 500,
  on_recognition: 'award_lesson'  // They lived it, they learned it
};

// Grief Journey - recognized when someone mourns naturally
const griefRecognition: PlotRecognitionRule = {
  template_id: 'grief_journey',
  event_sequence: [
    {
      event_type: 'death_nearby',
      constraints: { relationship_min_trust: 50 },
      binds_role: 'deceased'
    },
    {
      event_type: 'emotional_shift',
      constraints: { to_state: 'despairing' }
    },
    {
      event_type: 'recovery',
      constraints: { from_breakdown: true }
    }
  ],
  max_duration: 2000,
  on_recognition: 'award_lesson'
};
```

**Recognition Flow:**
```
┌─────────────────────────────────────────────────────────┐
│  EVENTS HAPPEN NATURALLY                                │
│  - Agent builds trust with friend                       │
│  - Friend steals from them                              │
│  - Trust drops, trauma added                            │
│  - Agent experiences emotional shift                    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  EVENT STREAM COMPONENT                                 │
│  - Stores rolling window of recent events               │
│  - Each event tagged with tick, type, involved agents   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  PLOT RECOGNITION SYSTEM (runs periodically)            │
│  - Scans event history against recognition rules        │
│  - Matches sequences with time constraints              │
│  - Binds roles from matched events                      │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  ON RECOGNITION                                         │
│  - 'award_lesson': Grant wisdom directly                │
│  - 'assign_at_current_stage': Formalize the plot        │
│  - 'narrate_only': Just log for narrative summaries     │
└─────────────────────────────────────────────────────────┘
```

**Why This Matters:**
- **Emergent Storytelling**: The game recognizes meaningful stories that happened naturally
- **No Forced Feeling**: Plots don't feel "assigned" - they emerged from life
- **Wisdom From Experience**: Souls learn lessons from living, not just assigned arcs
- **Rich Narrative Summaries**: "Looking back, this was a grief journey"
- **Player Discovery**: "Wait, that was a plot? It just... happened!"

**Deliverable:** Agents who naturally experience a betrayal arc (built trust → trust dropped → trauma) get recognized and can learn the lesson without ever having a plot formally assigned.

---

### Phase 3: Plot Composition (Week 3)
**Goal:** Epic plots can spawn/track child plots

| Task | Complexity | Files |
|------|------------|-------|
| Add composition field to templates | Simple | `PlotTypes.ts` |
| Create PlotCompositionSystem | Complex | New file |
| Add composition conditions | Medium | `PlotConditionEvaluator.ts` |
| Track parent/child relationships | Medium | `PlotLinesComponent.ts` |

**Composition Structure:**
```typescript
interface PlotComposition {
  parent_plot?: {
    template_id: string;
    instance_id: string;
    contribution: 'success_required' | 'failure_triggers_parent_failure' | 'informational';
  };
  child_spawn_rules?: {
    trigger_stage: string;
    child_template_id: string;
    max_concurrent: number;
    required_completions?: number;
  }[];
}
```

**Template Example:**
```typescript
// Epic plot
{
  id: 'founding_a_dynasty',
  scale: 'epic',
  stages: [
    { stage_id: 'first_generation', ... },
    { stage_id: 'succession_crisis', ... },
    { stage_id: 'dynasty_established', ... },
  ],
  composition: {
    child_spawn_rules: [
      {
        trigger_stage: 'first_generation',
        child_template_id: 'find_suitable_heir',
        max_concurrent: 3,
        required_completions: 1,
      },
    ],
  },
  transitions: [{
    from_stage: 'first_generation',
    to_stage: 'succession_crisis',
    conditions: [
      { type: 'child_plot_completed', template_id: 'find_suitable_heir', outcome: 'success' },
    ],
  }],
}
```

---

### Phase 4: JSON Plot Loader (Week 4)
**Goal:** Plots defined as JSON files, no TypeScript required

| Task | Complexity | Files |
|------|------------|-------|
| Define JSON schema for plot templates | Medium | `plot-template.schema.json` |
| Create PlotLoader service | Simple | `PlotLoader.ts` |
| Add file watcher for hot reload | Simple | `PlotLoader.ts` |
| Validate against schema on load | Simple | `PlotLoader.ts` |

**File Structure:**
```
packages/core/src/plot/
├── templates/
│   ├── micro/
│   │   ├── moment-of-courage.json
│   │   ├── first-conversation.json
│   │   └── ...
│   ├── small/
│   ├── medium/
│   ├── large/
│   └── epic/
│       ├── founding-dynasty.json
│       └── ascension-through-surrender.json
```

**JSON Template Format:**
```json
{
  "$schema": "../plot-template.schema.json",
  "id": "moment_of_courage",
  "name": "Moment of Courage",
  "scale": "micro",
  "lesson": {
    "domain": "self",
    "insight": "Courage is not the absence of fear, but action despite it",
    "wisdom_value": 1
  },
  "stages": [
    {
      "stage_id": "fear_arises",
      "name": "Fear Arises",
      "description": "Something threatens. Your heart pounds.",
      "narrative_pressure": "You feel afraid. Will you act anyway?"
    },
    {
      "stage_id": "courage_shown",
      "name": "Courage Shown",
      "description": "Despite the fear, you moved forward.",
      "is_completion": true
    }
  ],
  "transitions": [
    {
      "from": "fear_arises",
      "to": "courage_shown",
      "conditions": [
        { "type": "personal_tick_elapsed", "ticks": 50 },
        { "type": "not", "condition": { "type": "emotional_state", "state": "frozen" } }
      ],
      "effects": [
        { "type": "modify_mood", "delta": 10 }
      ]
    }
  ]
}
```

---

### Phase 5: LLM Plot Generator (Week 5)
**Goal:** Describe a plot in natural language, get a template

| Task | Complexity | Files |
|------|------------|-------|
| Create plot generation prompt | Medium | `prompts/plot-generator.ts` |
| Add validation of generated templates | Simple | `PlotLoader.ts` |
| CLI tool for plot generation | Simple | `scripts/generate-plot.ts` |

**Usage:**
```bash
# Generate from description
npx generate-plot "A story about a farmer who discovers
their crops have magical properties, leading them to
become the village healer but at the cost of their
relationship with their jealous sibling"

# Output: packages/core/src/plot/templates/medium/farmer-healer.json
```

**Prompt Structure:**
```
You are a plot template generator for a narrative game engine.

Given a story description, generate a JSON plot template following this schema:
[schema]

The plot should:
- Use emotional conditions (mood, stress, trauma) for psychological beats
- Use relationship conditions for interpersonal dynamics
- Bind agents dynamically (the jealous sibling is role 'rival', not a specific ID)
- Include multiple possible endings
- Match the appropriate scale (micro/small/medium/large/epic)

Story description: {input}

Generate the complete JSON template:
```

---

### Phase 6: Genre Escalation Framework (Week 6)
**Goal:** Track and trigger genre phase transitions

| Task | Complexity | Files |
|------|------------|-------|
| Create GenrePhaseComponent | Simple | `GenrePhaseComponent.ts` |
| Create GenreEscalationSystem | Complex | `GenreEscalationSystem.ts` |
| Define escalation chains as data | Medium | `escalation-chains/` |
| Integrate with plot assignment | Medium | Integration |

**Components:**
```typescript
// packages/core/src/components/GenrePhaseComponent.ts
interface GenrePhaseComponent {
  type: 'genre_phase';
  escalation_id: string;           // 'romantic_to_empress'
  current_phase_id: string;        // 'life_sim'
  phase_start_tick: number;
  completed_phases: string[];
  seen_expansion_moment: boolean;
  can_use_off_ramp: boolean;
}
```

**Escalation Chain Data:**
```json
{
  "id": "romantic_to_empress",
  "name": "From Dating to Dynasty",
  "target_archetype": "romantic",
  "phases": [
    {
      "id": "dating",
      "genre": "Dating Simulation",
      "mechanics": ["conversation", "gifts", "affinity_tracking"],
      "escalation_trigger": {
        "type": "relationship_threshold",
        "role": "love_interest",
        "min_trust": 90
      },
      "expansion_moment": "They say yes. The wedding is beautiful. The credits don't roll..."
    }
  ]
}
```

---

## Priority Order (What to Build First)

### Must Have for MVP (Phases 1-2)
1. **Emotional conditions** - Plots that respond to mood/stress
2. **Relationship conditions with role binding** - Plots that involve other agents
3. **Event-driven assignment** - Plots trigger from events, not just timers

### Should Have (Phases 3-4)
4. **Plot composition** - Epic plots containing smaller plots
5. **JSON template loader** - No-code plot authoring

### Nice to Have (Phases 5-6)
6. **LLM plot generator** - Describe plots in natural language
7. **Genre escalation** - Full genre-breaking infrastructure

---

## File Changes Summary

### New Files
```
packages/core/src/plot/
├── PlotConditionEvaluator.ts      # Expanded condition handling
├── PlotEffectExecutor.ts          # Effect application
├── EventDrivenPlotAssignment.ts   # Event-triggered plots
├── PlotCompositionSystem.ts       # Parent/child plot management
├── PlotLoader.ts                  # JSON template loading
├── plot-template.schema.json      # Validation schema
├── templates/                     # JSON plot files
│   ├── micro/*.json
│   ├── small/*.json
│   ├── medium/*.json
│   ├── large/*.json
│   └── epic/*.json
└── escalation-chains/             # Genre escalation data
    ├── romantic-to-empress.json
    ├── strategist-to-godhood.json
    └── explorer-to-worldwalker.json

packages/core/src/components/
├── GenrePhaseComponent.ts
└── OriginComponent.ts

packages/core/src/systems/
└── GenreEscalationSystem.ts

scripts/
└── generate-plot.ts               # LLM plot generator CLI
```

### Modified Files
```
packages/core/src/plot/PlotTypes.ts           # Add bound_agents, composition
packages/core/src/plot/PlotLineRegistry.ts    # Support JSON loading
packages/core/src/plot/PlotAssignmentSystem.ts # Event-driven triggers
packages/core/src/plot/index.ts               # New exports
packages/core/src/components/index.ts         # New component exports
```

---

## Quick Win: Start with Phase 1

The fastest path to "authors can write rich plots" is Phase 1:

```bash
# Today:
1. Add emotional conditions to PlotConditionEvaluator
2. Add effects to PlotEffectExecutor
3. Test with a "betrayal" plot that uses:
   - has_relationship_with_role
   - relationship_changed
   - add_trauma
   - set_emotional_state
```

This unlocks plots like:
- Betrayal arcs
- Grief journeys
- Love stories
- Breakdown spirals
- Redemption paths

All without any new systems - just expanding the condition/effect vocabulary.

---

## The End Goal

A narrative designer can:

1. **Write a plot description** in plain English
2. **LLM generates** the JSON template
3. **Validate** against schema automatically
4. **Hot reload** into running game
5. **See agents** experiencing the drama
6. **Iterate** based on observation

No TypeScript. No compilation. Just storytelling.
