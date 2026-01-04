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
  universe_id: string;                // Which universe this happened in
  soul_id: string;                    // The soul who experienced this
  agent_id: string;                   // The current incarnation (entity ID)
  event_type: 'trauma' | 'relationship_change' | 'emotional_shift' |
              'death_nearby' | 'skill_gain' | 'breakdown' | 'recovery';
  data: Record<string, any>;
  involved_agents?: string[];         // Other agents involved (by entity ID)
  involved_souls?: string[];          // Their soul IDs (for cross-lifetime recognition)
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

**Cross-Universe & Cross-Lifetime Recognition:**
With `universe_id` and `soul_id` tracking, we can recognize patterns that span:
- **Multiple universes**: A soul who was betrayed in Universe A and betrayed again in Universe B
- **Multiple lifetimes**: A soul who experienced loss in a past life and is experiencing it again
- **Cross-agent patterns**: Two souls who keep meeting across lifetimes (soulmates, nemeses)

```typescript
// Cross-lifetime betrayal pattern
const karmic_betrayal: PlotRecognitionRule = {
  template_id: 'karmic_betrayal',
  event_sequence: [
    {
      event_type: 'trauma',
      constraints: { trauma_type: 'betrayal' },
      binds_role: 'betrayer_soul'  // Bind by SOUL ID, not agent
    },
    // ... later, in any universe/lifetime ...
    {
      event_type: 'trauma',
      constraints: {
        trauma_type: 'betrayal',
        same_soul_as_role: 'betrayer_soul'  // Same soul betrayed them again!
      }
    }
  ],
  cross_universe: true,       // Can span universe forks
  cross_lifetime: true,       // Can span incarnations
  on_recognition: 'award_lesson'
};
```

**Deliverable:** Agents who naturally experience a betrayal arc (built trust → trust dropped → trauma) get recognized and can learn the lesson without ever having a plot formally assigned. With soul ID tracking, we can even recognize patterns that repeat across lifetimes.

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

### Phase 6: Archetype & Genre Escalation Framework (Week 6)
**Goal:** Define player archetypes and track genre phase transitions

There are **two separate archetype concepts**:

| Type | Purpose | Example |
|------|---------|---------|
| **Soul Archetype** | Soul's inner nature | seeker, protector, mystic |
| **Player Archetype** | Desired gameplay experience | strategist, romantic, explorer |

These need to be kept separate but can interact (a `protector` soul might appeal to a `romantic` player).

| Task | Complexity | Files |
|------|------------|-------|
| Define PlayerArchetype types | Simple | `PlayerArchetypeTypes.ts` |
| Create PlayerArchetypeComponent | Simple | `PlayerArchetypeComponent.ts` |
| Implement archetype detection from conversation | Medium | Integration with LMI |
| Create GenrePhaseComponent | Simple | `GenrePhaseComponent.ts` |
| Create GenreEscalationSystem | Complex | `GenreEscalationSystem.ts` |
| Define escalation chains as data | Medium | `escalation-chains/` |
| Integrate with plot assignment | Medium | Integration |

---

#### 6.1 Player Archetype Definitions

```typescript
// packages/core/src/archetype/PlayerArchetypeTypes.ts

/**
 * Player Archetypes - What kind of experience does the player want?
 * Detected through initial conversation with the Fates.
 */
export type PlayerArchetype =
  | 'strategist'        // Colony sim → Civilization → Stellaris
  | 'romantic'          // Dating sim → Life sim → Dynasty builder
  | 'explorer'          // Walking sim → Metroidvania → Multiverse traveler
  | 'historian'         // Period drama → Historical epic → Time loops
  | 'cozy'              // Farming sim → Homesteading → Hidden god's garden
  | 'challenge_seeker'  // Roguelike → Permadeath → Death accumulates wisdom
  | 'business_builder'  // Startup sim → Tycoon → Cross-timeline competitor
  | 'relationship_weaver' // Social drama → Family saga → Fae politics
  | 'undefined';        // Not yet detected

/**
 * Detection signals for player archetypes
 */
export const PLAYER_ARCHETYPE_SIGNALS: Record<PlayerArchetype, string[]> = {
  strategist: [
    'strategy', 'system', 'optimize', 'manage', 'colony', 'build empire',
    'civilization', 'stellaris', 'dwarf fortress', 'rimworld', 'factorio'
  ],
  romantic: [
    'love', 'relationship', 'romance', 'dating', 'marriage', 'heart',
    'stardew', 'harvest moon', 'story', 'character'
  ],
  explorer: [
    'explore', 'discover', 'wander', 'travel', 'adventure', 'map',
    'open world', 'skyrim', 'zelda', 'journey'
  ],
  historian: [
    'history', 'era', 'period', 'time', 'ancient', 'medieval',
    'crusader kings', 'victoria', 'historical'
  ],
  cozy: [
    'relax', 'farm', 'peace', 'quiet', 'simple', 'garden',
    'animal crossing', 'cozy', 'calm'
  ],
  challenge_seeker: [
    'hard', 'difficult', 'roguelike', 'survive', 'die', 'permadeath',
    'souls-like', 'challenge', 'hardcore', 'hades', 'spelunky'
  ],
  business_builder: [
    'business', 'money', 'profit', 'startup', 'tycoon', 'economy',
    'trade', 'industry', 'corporation'
  ],
  relationship_weaver: [
    'family', 'friends', 'social', 'drama', 'relationships', 'people',
    'sims', 'party', 'community'
  ],
  undefined: [],
};

/**
 * Soul Archetypes - What is the soul's inner nature?
 * Assigned at soul creation based on Fate ceremony.
 */
export type SoulArchetype =
  | 'seeker'     // Knowledge, discovery, questioning
  | 'protector'  // Defense, loyalty, guardianship
  | 'creator'    // Building, art, innovation
  | 'destroyer'  // Chaos, revolution, transformation
  | 'unifier'    // Diplomacy, harmony, leadership
  | 'wanderer'   // Freedom, adaptation, stories (default)
  | 'mystic'     // Magic, spirituality, divinity
  | 'scholar';   // Teaching, research, wisdom

/**
 * Which player archetypes resonate with which soul archetypes?
 * A soul archetype can appeal to multiple player types.
 */
export const ARCHETYPE_RESONANCE: Record<SoulArchetype, PlayerArchetype[]> = {
  seeker: ['explorer', 'historian', 'challenge_seeker'],
  protector: ['romantic', 'relationship_weaver', 'strategist'],
  creator: ['business_builder', 'cozy', 'strategist'],
  destroyer: ['challenge_seeker', 'strategist', 'historian'],
  unifier: ['romantic', 'relationship_weaver', 'business_builder'],
  wanderer: ['explorer', 'cozy', 'historian'],
  mystic: ['romantic', 'explorer', 'challenge_seeker'],
  scholar: ['historian', 'strategist', 'business_builder'],
};
```

---

#### 6.2 Player Archetype Component

```typescript
// packages/core/src/components/PlayerArchetypeComponent.ts

interface PlayerArchetypeComponent {
  type: ComponentType.PlayerArchetype;

  // Detected archetype (can change over time)
  detected_archetype: PlayerArchetype;
  detection_confidence: number;      // 0-1, how confident we are

  // Detection history (LLM learns from conversation)
  detection_signals: Array<{
    signal: string;
    archetype: PlayerArchetype;
    timestamp: number;
  }>;

  // Player can override if we guess wrong
  player_override?: PlayerArchetype;

  // Genre preferences (derived from archetype)
  preferred_genres: string[];
  avoided_genres: string[];
}
```

---

#### 6.3 Genre Phase Component

```typescript
// packages/core/src/components/GenrePhaseComponent.ts
interface GenrePhaseComponent {
  type: ComponentType.GenrePhase;

  // Current escalation chain
  escalation_id: string;           // 'romantic_to_empress'
  current_phase_id: string;        // 'life_sim'
  phase_start_tick: number;

  // Progress tracking
  completed_phases: string[];
  seen_expansion_moment: boolean;  // The "credits don't roll" moment

  // Player agency
  can_use_off_ramp: boolean;       // Player can opt out of escalation
  player_chose_to_escalate: boolean;
}
```

---

#### 6.4 Escalation Chain Data

```json
// packages/core/src/plot/escalation-chains/strategist.json
{
  "id": "strategist_to_godhood",
  "name": "From Colony to Cosmos",
  "target_archetype": "strategist",
  "description": "The journey from managing a village to orchestrating the multiverse",

  "phases": [
    {
      "id": "village_management",
      "genre": "Colony Simulation",
      "mechanics": ["resource_management", "agent_assignment", "building"],
      "expected_duration_days": 7,
      "escalation_trigger": {
        "type": "population_threshold",
        "min_population": 20,
        "min_happiness": 70
      },
      "expansion_moment": "The village thrives. But one settler remembers a previous life..."
    },
    {
      "id": "civilization_building",
      "genre": "Civilization",
      "mechanics": ["tech_tree", "multiple_villages", "trade_routes"],
      "expected_duration_days": 14,
      "escalation_trigger": {
        "type": "tech_threshold",
        "required_techs": ["writing", "astronomy"]
      },
      "expansion_moment": "Your astronomers see something impossible in the stars..."
    },
    {
      "id": "multiverse_strategy",
      "genre": "Stellaris + Timeline Chess",
      "mechanics": ["universe_forking", "timeline_merging", "save_file_interaction"],
      "expected_duration_days": 30,
      "escalation_trigger": {
        "type": "universe_count",
        "min_universes": 5
      },
      "expansion_moment": "Your save files begin talking to each other..."
    },
    {
      "id": "temporal_grand_strategy",
      "genre": "5D Chess for Dwarf Fortress",
      "mechanics": ["causality_manipulation", "paradox_resolution", "multiverse_diplomacy"],
      "escalation_trigger": null,
      "expansion_moment": null
    }
  ],

  "off_ramps": [
    {
      "from_phase": "civilization_building",
      "description": "Stay at civilization scale, focus on your empire",
      "available_after_trigger": true
    },
    {
      "from_phase": "multiverse_strategy",
      "description": "Seal the timeline rifts, live in one universe",
      "available_after_trigger": true
    }
  ]
}
```

```json
// packages/core/src/plot/escalation-chains/romantic.json
{
  "id": "romantic_to_empress",
  "name": "From Dating to Dynasty",
  "target_archetype": "romantic",
  "description": "The journey from first love to ruling across time",

  "phases": [
    {
      "id": "dating_sim",
      "genre": "Dating Simulation",
      "mechanics": ["conversation", "gifts", "affinity_tracking"],
      "expected_duration_days": 5,
      "escalation_trigger": {
        "type": "relationship_threshold",
        "role": "love_interest",
        "min_trust": 90,
        "min_affinity": 85
      },
      "expansion_moment": "They say yes. The wedding is beautiful. The credits don't roll..."
    },
    {
      "id": "life_sim",
      "genre": "Life Simulation",
      "mechanics": ["home_building", "career", "family_planning"],
      "expected_duration_days": 10,
      "escalation_trigger": {
        "type": "family_milestone",
        "has_child": true
      },
      "expansion_moment": "Your child draws a picture of themselves... with someone who looks exactly like them."
    },
    {
      "id": "family_saga",
      "genre": "Family Dynasty",
      "mechanics": ["inheritance", "family_tree", "generational_bonds"],
      "expected_duration_days": 20,
      "escalation_trigger": {
        "type": "generation_count",
        "min_generations": 3
      },
      "expansion_moment": "The family heirloom glows. It was never just a trinket."
    },
    {
      "id": "fae_politics",
      "genre": "Court Intrigue + Magic",
      "mechanics": ["court_favor", "fae_bargains", "magical_lineage"],
      "expected_duration_days": 30,
      "escalation_trigger": {
        "type": "fae_revelation",
        "discovered_true_nature": true
      },
      "expansion_moment": "You are offered the crown of a realm between realms."
    },
    {
      "id": "empress_of_time",
      "genre": "Transcendence",
      "mechanics": ["timeline_ruling", "love_across_universes", "eternal_bonds"],
      "escalation_trigger": null,
      "expansion_moment": null
    }
  ],

  "off_ramps": [
    {
      "from_phase": "life_sim",
      "description": "This is enough. A good life is its own reward.",
      "available_after_trigger": false
    }
  ]
}
```

---

#### 6.5 Archetype Detection in Fates Conversation

```typescript
// In SoulCreationCeremony.ts - enhanced archetype detection

function detectPlayerArchetype(conversationHistory: string[]): {
  archetype: PlayerArchetype;
  confidence: number;
  signals: string[];
} {
  const allText = conversationHistory.join(' ').toLowerCase();
  const detectedSignals: Array<{ signal: string; archetype: PlayerArchetype }> = [];

  // Check each archetype's signals
  for (const [archetype, signals] of Object.entries(PLAYER_ARCHETYPE_SIGNALS)) {
    for (const signal of signals) {
      if (allText.includes(signal.toLowerCase())) {
        detectedSignals.push({ signal, archetype: archetype as PlayerArchetype });
      }
    }
  }

  // Count signals per archetype
  const counts = new Map<PlayerArchetype, number>();
  for (const { archetype } of detectedSignals) {
    counts.set(archetype, (counts.get(archetype) || 0) + 1);
  }

  // Find the winner
  let bestArchetype: PlayerArchetype = 'undefined';
  let bestCount = 0;
  for (const [archetype, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      bestArchetype = archetype;
    }
  }

  // Calculate confidence (0-1)
  const totalSignals = detectedSignals.length;
  const confidence = totalSignals === 0 ? 0 : bestCount / totalSignals;

  return {
    archetype: bestArchetype,
    confidence: Math.min(confidence, 0.9), // Cap at 90% - always leave room for player override
    signals: detectedSignals.filter(s => s.archetype === bestArchetype).map(s => s.signal),
  };
}
```

---

#### 6.6 Integration with Plot Assignment

```typescript
// PlotAssignmentSystem.ts - use both archetypes

const eligibleTemplates = plotLineRegistry.getEligibleTemplates({
  wisdom: identity.wisdom_level,
  soul_archetype: identity.archetype,           // Soul's inner nature
  player_archetype: playerArchetype.detected,   // Player's preference
  interests: identity.core_interests,
  learned_lessons: identity.lessons_learned.map(l => l.lesson_id),
  current_genre_phase: genrePhase.current_phase_id,  // Only plots appropriate for phase
});
```

---

**Deliverable:**
- Player archetype detected from Fates conversation
- Soul archetype assigned independently
- Genre escalation chains defined for strategist, romantic, explorer
- Plots filtered by both archetype types and current genre phase
- Player can override detected archetype
- Off-ramps allow players to opt out of escalation

---

## Priority Order (What to Build First)

### Must Have for MVP (Phases 1-2.5)
1. **Emotional conditions** - Plots that respond to mood/stress ✅ DONE
2. **Relationship conditions with role binding** - Plots that involve other agents ✅ DONE
3. **Event-driven assignment** - Plots trigger from events, not just timers
4. **Retroactive recognition** - Recognize plots that emerged organically

### Should Have (Phases 3-4)
5. **Plot composition** - Epic plots containing smaller plots
6. **JSON template loader** - No-code plot authoring

### Nice to Have (Phases 5-6)
7. **LLM plot generator** - Describe plots in natural language
8. **Genre escalation** - Full genre-breaking infrastructure

---

## File Changes Summary

### New Files
```
packages/core/src/plot/
├── PlotConditionEvaluator.ts      # Expanded condition handling ✅ DONE
├── PlotEffectExecutor.ts          # Effect application ✅ DONE
├── EventDrivenPlotAssignment.ts   # Event-triggered plots (Phase 2)
├── PlotRecognitionSystem.ts       # Retroactive pattern matching (Phase 2.5)
├── PlotCompositionSystem.ts       # Parent/child plot management (Phase 3)
├── PlotLoader.ts                  # JSON template loading (Phase 4)
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
├── EventStreamComponent.ts        # Rolling event history (Phase 2.5)
├── GenrePhaseComponent.ts
└── OriginComponent.ts

packages/core/src/systems/
├── PlotRecognitionSystem.ts       # Scans for emergent patterns (Phase 2.5)
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
