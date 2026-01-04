# Plot Lines System Specification

> Every soul has stories to live. Plot lines are the Fates' gift of meaning - lessons wrapped in narrative, challenges designed to teach.

## Overview

Plot Lines are generalized, templatized narrative arcs that the Fates assign to souls. Unlike scripted quests, plot lines define **what lessons should be learned** and **what outcomes are desired**, while leaving the path to those outcomes emergent.

Plot lines work through the [Narrative Pressure System](../divinity-system/narrative-pressure-system.md) - they create outcome attractors that gently bias the simulation toward plot progression without scripting events.

### Core Concepts

1. **Lesson-Driven**: Every plot exists to teach something
2. **Multi-Scale**: From micro-moments to multi-lifetime epics
3. **Template-Based**: Plots are instantiated from reusable templates
4. **State Machine**: Plots have stages with transitions and conditions
5. **Attractor-Generating**: Active plots create narrative pressure

---

## Plot Line Scales

Not every fate spans lifetimes. Most of life's wisdom comes from small moments.

| Scale | Duration | Examples | Assignment |
|-------|----------|----------|------------|
| **Micro** | Minutes to hours | A moment of courage, a kind word | Dynamic (PlotAssignmentSystem) |
| **Small** | Days to weeks | First friendship, learning a skill | Dynamic + Spinner seeds |
| **Medium** | Months to years | Mastering a craft, raising a child | Spinner seeds trigger |
| **Large** | Single lifetime | Finding purpose, the hero's journey | Weaver assigns |
| **Epic** | Multi-lifetime | Ascension paths, cosmic prophecies | Cutter assigns (rare) |

### Distribution Per Soul

A typical soul might have active:
- **10-20 micro plots** cycling constantly
- **3-5 small plots**
- **1-2 medium plots**
- **0-1 large plots**
- **0-1 epic plots** (rare - most souls never have one)

---

## Plot Line Templates

Templates define reusable plot structures that can be instantiated with different parameters.

### Template Structure

```typescript
interface PlotLineTemplate {
  id: string;
  name: string;
  description: string;

  // THE CORE: What does this plot teach?
  lesson: LessonDefinition;

  // Scale and duration
  scale: 'micro' | 'small' | 'medium' | 'large' | 'epic';
  spans_incarnations: boolean;
  duration: {
    min_ticks: number | null;    // null = no minimum
    typical_ticks: number | null;
    max_ticks: number | null;    // null = no maximum
  };

  // Category for filtering/grouping
  category: PlotCategory;

  // Template parameters (filled when instantiated)
  parameters: ParameterDefinition[];

  // The stages (state machine)
  stages: PlotStage[];
  entry_stage: string;
  completion_stages: string[];
  failure_stages: string[];

  // Can contain sub-plots?
  nested_plots?: string[];       // Template IDs

  // Prerequisites
  soul_requirements?: SoulRequirement[];

  // Conflicts with other plots?
  mutex_with?: string[];         // Template IDs that can't run simultaneously
  compatible_with?: string[];    // Template IDs that synergize
}

type PlotCategory =
  | 'relationship'    // Love, friendship, family
  | 'growth'          // Skills, mastery, improvement
  | 'discovery'       // Learning, exploration
  | 'trial'           // Challenges, tests
  | 'tragedy'         // Loss, grief, endings
  | 'redemption'      // Recovery, forgiveness
  | 'ascension'       // Transcendence, godhood
  | 'creation'        // Building, making, legacy
  | 'duty'            // Responsibility, sacrifice
  | 'identity';       // Self-discovery, purpose
```

### Lesson Definition

Every plot exists to teach a lesson:

```typescript
interface LessonDefinition {
  id: string;

  // The lesson theme
  theme: string;           // e.g., 'impermanence', 'courage', 'trust'

  // Wisdom domain this contributes to
  domain: WisdomDomain;

  // The insight gained when learned
  insight: string;         // The actual wisdom text

  // How much wisdom this lesson grants
  wisdom_value: number;    // 1-100 depending on profundity

  // Can learn this lesson multiple times?
  repeatable: boolean;

  // Must learn other lessons first?
  prerequisites?: string[];
}

type WisdomDomain =
  | 'relationships'    // How to love, trust, forgive
  | 'systems'          // How the world works
  | 'self'             // Who you are
  | 'transcendence'    // What lies beyond
  | 'power'            // How to wield influence
  | 'mortality';       // How to die well
```

---

## Plot Stages

Plots are state machines. Each stage defines what's happening and how to progress.

```typescript
interface PlotStage {
  id: string;
  name: string;
  description?: string;

  // Entry conditions (optional - for gated stages)
  entry_conditions?: PlotCondition[];

  // What narrative attractors this stage creates
  attractors: StageAttractor[];

  // Time limits for this stage
  duration_limits?: {
    min_ticks?: number;
    max_ticks?: number;
    timeout_transition?: string;  // Stage to go to if timed out
  };

  // Events triggered on stage entry
  on_enter?: PlotEffect[];

  // Events triggered on stage exit
  on_exit?: PlotEffect[];

  // How to leave this stage
  transitions: PlotTransition[];
}

interface StageAttractor {
  goal: OutcomeGoal;           // From Narrative Pressure System
  strength: number;            // 0-1
  urgency?: number;            // 0-1
  path_constraints?: PathConstraints;
  decay?: DecayCondition;
}

interface PlotTransition {
  id: string;
  conditions: PlotCondition[];
  target_stage: string;
  effects?: PlotEffect[];
  priority?: number;           // If multiple transitions valid
}
```

### Plot Conditions

Conditions check if transitions should fire:

```typescript
interface PlotCondition {
  type: ConditionType;
  params: Record<string, any>;
  not?: boolean;               // Negate this condition
}

type ConditionType =
  // Component checks
  | 'has_component'            // Entity has component
  | 'component_value'          // Component field meets threshold

  // Relationship checks
  | 'relationship_exists'      // Has relationship with someone
  | 'relationship_strength'    // Relationship meets threshold

  // Event checks
  | 'event_occurred'           // Specific event happened
  | 'event_count'              // Event happened N times

  // Time checks
  | 'time_in_stage'            // Been in current stage for N ticks
  | 'personal_tick'            // Soul's personal time meets threshold

  // Plot checks
  | 'plot_stage'               // Another plot is in specific stage
  | 'lesson_learned'           // Soul has learned lesson

  // World state
  | 'in_location'              // At specific location
  | 'in_realm'                 // In specific realm

  // Custom
  | 'custom';                  // Custom predicate function
```

### Plot Effects

Effects trigger when entering/exiting stages or on transitions:

```typescript
interface PlotEffect {
  type: EffectType;
  params: Record<string, any>;
}

type EffectType =
  // Soul effects
  | 'grant_wisdom'             // Add wisdom to soul
  | 'learn_lesson'             // Mark lesson as learned
  | 'add_plot'                 // Start a new plot on this soul
  | 'complete_plot'            // Mark this plot complete
  | 'fail_plot'                // Mark this plot failed

  // Agent effects
  | 'add_component'            // Add component to agent
  | 'remove_component'         // Remove component
  | 'modify_component'         // Change component values

  // Narrative effects
  | 'emit_event'               // Emit game event
  | 'narrative_beat'           // Trigger narrative system
  | 'create_attractor'         // Create standalone attractor

  // Dream effects
  | 'queue_dream_hint'         // Influence next dream
  | 'prophetic_dream'          // Send prophetic dream

  // World effects
  | 'spawn_entity'             // Create entity in world
  | 'teleport';                // Move entity
```

---

## Example Plot Templates

### Micro: Moment of Courage

```typescript
const momentOfCourage: PlotLineTemplate = {
  id: 'moment_of_courage',
  name: 'The Brave Choice',
  scale: 'micro',
  spans_incarnations: false,
  category: 'trial',

  lesson: {
    id: 'courage_in_small_things',
    theme: 'Bravery in the moment',
    domain: 'self',
    insight: 'Courage is not the absence of fear, but action despite it.',
    wisdom_value: 1,
    repeatable: true,
  },

  duration: {
    min_ticks: 50,
    typical_ticks: 200,
    max_ticks: 1000,
  },

  parameters: [],

  stages: [
    {
      id: 'fear_arises',
      name: 'The Moment of Fear',
      attractors: [{
        goal: { type: 'threat_nearby' },
        strength: 0.3
      }],
      duration_limits: { max_ticks: 500, timeout_transition: 'missed' },
      transitions: [
        {
          id: 'faces_fear',
          conditions: [{ type: 'event_occurred', params: { event: 'confronted_threat' }}],
          target_stage: 'courage_shown'
        },
        {
          id: 'flees',
          conditions: [{ type: 'event_occurred', params: { event: 'fled_threat' }}],
          target_stage: 'fear_won'
        }
      ]
    },
    {
      id: 'courage_shown',
      name: 'Lesson Learned',
      on_enter: [
        { type: 'grant_wisdom', params: { amount: 1, domain: 'self' }},
        { type: 'complete_plot', params: {} }
      ],
      transitions: []
    },
    {
      id: 'fear_won',
      name: 'Fear Won This Time',
      on_enter: [{ type: 'complete_plot', params: { success: false }}],
      transitions: []
    },
    {
      id: 'missed',
      name: 'Opportunity Passed',
      on_enter: [{ type: 'complete_plot', params: { success: false }}],
      transitions: []
    }
  ],

  entry_stage: 'fear_arises',
  completion_stages: ['courage_shown'],
  failure_stages: ['fear_won', 'missed']
};
```

### Small: First Friendship

```typescript
const firstFriendship: PlotLineTemplate = {
  id: 'first_friendship',
  name: 'A New Friend',
  scale: 'small',
  spans_incarnations: false,
  category: 'relationship',

  lesson: {
    id: 'trust_and_vulnerability',
    theme: 'Opening to connection',
    domain: 'relationships',
    insight: 'To have a friend, one must first be a friend.',
    wisdom_value: 5,
    repeatable: true,
  },

  duration: {
    min_ticks: 10000,
    typical_ticks: 50000,
    max_ticks: 200000,
  },

  parameters: [
    { name: 'friend_id', type: 'entity_id', required: false }
  ],

  stages: [
    {
      id: 'encounter',
      name: 'The Meeting',
      attractors: [{
        goal: { type: 'meet_compatible_entity' },
        strength: 0.4
      }],
      transitions: [
        {
          id: 'connection_made',
          conditions: [{ type: 'relationship_exists', params: { min_strength: 0.2 }}],
          target_stage: 'building'
        }
      ]
    },
    {
      id: 'building',
      name: 'Growing Closer',
      attractors: [{
        goal: { type: 'deepen_relationship' },
        strength: 0.3
      }],
      transitions: [
        {
          id: 'conflict_arises',
          conditions: [{ type: 'event_occurred', params: { event: 'friendship_conflict' }}],
          target_stage: 'test'
        },
        {
          id: 'deep_bond',
          conditions: [{ type: 'relationship_strength', params: { min: 0.6 }}],
          target_stage: 'complete'
        }
      ]
    },
    {
      id: 'test',
      name: 'The Test',
      transitions: [
        {
          id: 'resolved',
          conditions: [{ type: 'event_occurred', params: { event: 'conflict_resolved' }}],
          target_stage: 'complete'
        },
        {
          id: 'broken',
          conditions: [{ type: 'relationship_strength', params: { max: 0.1 }}],
          target_stage: 'failed'
        }
      ]
    },
    {
      id: 'complete',
      name: 'True Friendship',
      on_enter: [
        { type: 'grant_wisdom', params: { amount: 5, domain: 'relationships' }},
        { type: 'learn_lesson', params: { lesson: 'trust_and_vulnerability' }},
        { type: 'complete_plot', params: {} }
      ],
      transitions: []
    },
    {
      id: 'failed',
      name: 'The Bond Broke',
      on_enter: [
        { type: 'grant_wisdom', params: { amount: 2, domain: 'relationships' }},
        { type: 'complete_plot', params: { success: false }}
      ],
      transitions: []
    }
  ],

  entry_stage: 'encounter',
  completion_stages: ['complete'],
  failure_stages: ['failed']
};
```

### Large: Ascension Archetype

```typescript
const ascensionArchetype: PlotLineTemplate = {
  id: 'ascension_archetype',
  name: 'The Great Work',
  scale: 'epic',
  spans_incarnations: true,
  category: 'ascension',

  lesson: {
    id: 'transcendence_through_surrender',
    theme: 'Rising by letting go',
    domain: 'transcendence',
    insight: 'True power is earned through surrender of control.',
    wisdom_value: 100,
    repeatable: false,
    prerequisites: ['impermanence', 'non_attachment', 'self_knowledge']
  },

  duration: {
    min_ticks: null,    // Spans incarnations
    typical_ticks: null,
    max_ticks: null,
  },

  parameters: [
    { name: 'variant', type: 'string', options: ['fae', 'enochian', 'exaltation'] },
    { name: 'awareness_threshold', type: 'string', required: true },
    { name: 'paradise_realm', type: 'realm_id', required: true },
    { name: 'temptation_type', type: 'string', required: true },
    { name: 'trial_realm', type: 'realm_id', required: true },
    { name: 'final_form', type: 'entity_type', required: true },
  ],

  nested_plots: [
    'learn_impermanence',
    'learn_non_attachment',
    'learn_self_knowledge'
  ],

  stages: [
    {
      id: 'mortal',
      name: 'Mortal Existence',
      transitions: [
        {
          id: 'awareness_achieved',
          conditions: [
            { type: 'component_value', params: {
              component: 'dimensional_awareness',
              field: 'level',
              operator: '>=',
              value: '${awareness_threshold}'
            }}
          ],
          target_stage: 'paradise',
          effects: [{ type: 'narrative_beat', params: { beat: 'veil_tears' }}]
        }
      ]
    },
    {
      id: 'paradise',
      name: 'Paradise Found',
      attractors: [{
        goal: { type: 'enter_realm', params: { realm: '${paradise_realm}' }},
        strength: 0.6
      }],
      transitions: [
        {
          id: 'resist_temptation',
          conditions: [{ type: 'event_occurred', params: { event: 'temptation_resisted' }}],
          target_stage: 'trial'
        },
        {
          id: 'succumb',
          conditions: [{ type: 'event_occurred', params: { event: 'temptation_accepted' }}],
          target_stage: 'ejection'
        }
      ]
    },
    {
      id: 'ejection',
      name: 'Cast Out',
      on_enter: [{ type: 'narrative_beat', params: { beat: 'fall_from_grace' }}],
      transitions: [
        {
          id: 'recover',
          conditions: [{ type: 'lesson_learned', params: { lesson: '${temptation_type}_lesson' }}],
          target_stage: 'trial'
        }
      ]
    },
    {
      id: 'trial',
      name: 'The Trial',
      attractors: [{
        goal: { type: 'survive_trial', params: { realm: '${trial_realm}' }},
        strength: 0.7,
        urgency: 0.5
      }],
      transitions: [
        {
          id: 'trial_passed',
          conditions: [{ type: 'event_occurred', params: { event: 'trial_survived' }}],
          target_stage: 'witnessing'
        },
        {
          id: 'trial_failed',
          conditions: [{ type: 'event_occurred', params: { event: 'lost_coherence' }}],
          target_stage: 'dissolved'
        }
      ]
    },
    {
      id: 'witnessing',
      name: 'The Witnessing',
      attractors: [{
        goal: { type: 'observe_without_intervention' },
        strength: 0.8
      }],
      transitions: [
        {
          id: 'witnessed',
          conditions: [{ type: 'event_occurred', params: { event: 'witnessing_complete' }}],
          target_stage: 'transcended'
        },
        {
          id: 'intervened',
          conditions: [{ type: 'event_occurred', params: { event: 'intervention_made' }}],
          target_stage: 'ejection'
        }
      ]
    },
    {
      id: 'transcended',
      name: 'Transcendence',
      on_enter: [
        { type: 'grant_wisdom', params: { amount: 100, domain: 'transcendence' }},
        { type: 'learn_lesson', params: { lesson: 'transcendence_through_surrender' }},
        { type: 'add_component', params: { component: '${final_form}' }},
        { type: 'complete_plot', params: {} }
      ],
      transitions: []
    },
    {
      id: 'dissolved',
      name: 'Lost to Chaos',
      on_enter: [{ type: 'fail_plot', params: { recoverable: true }}],
      transitions: []
    }
  ],

  entry_stage: 'mortal',
  completion_stages: ['transcended'],
  failure_stages: ['dissolved']
};
```

---

## Plot Assignment

### Static Assignment (by Fates)

The Three Fates assign plots at soul creation:

```typescript
interface FatePlotAssignment {
  // Weaver's arc (large scale, life purpose)
  weaver_arc?: {
    template_id: string;
    parameters: Record<string, any>;
    activation: 'immediate' | { at_wisdom: number } | { at_incarnation: number };
  };

  // Spinner's seeds (enable dynamic plots)
  spinner_seeds: string[];   // e.g., ['craft_affinity', 'social_warmth', 'nature_love']

  // Cutter's destiny (epic scale, if any)
  cutter_destiny?: {
    template_id: string;
    parameters: Record<string, any>;
  };
}
```

### Dynamic Assignment (PlotAssignmentSystem)

The PlotAssignmentSystem assigns micro and small plots based on circumstances:

```typescript
class PlotAssignmentSystem implements System {
  priority = 150;  // After most game systems

  update(world: World): void {
    for (const soul of this.getActiveSouls(world)) {
      const agent = this.getIncarnatedAgent(soul);
      if (!agent) continue;

      // Micro plots: check every tick for opportunities
      const microOpportunities = this.detectMicroOpportunities(agent);
      for (const opp of microOpportunities) {
        if (this.shouldAssign(soul, opp.template)) {
          this.assignPlot(soul, opp.template, opp.parameters);
        }
      }

      // Small plots: check less frequently
      if (world.currentTick % 1000 === 0) {
        const smallOpportunities = this.detectSmallOpportunities(agent, soul.spinnerSeeds);
        for (const opp of smallOpportunities) {
          if (this.shouldAssign(soul, opp.template)) {
            this.assignPlot(soul, opp.template, opp.parameters);
          }
        }
      }
    }
  }

  private shouldAssign(soul: Soul, template: PlotLineTemplate): boolean {
    // Check if soul already has this plot active
    if (soul.hasActivePlot(template.id)) return false;

    // Check if mutex with existing plots
    for (const active of soul.activePlots) {
      if (template.mutex_with?.includes(active.template_id)) return false;
    }

    // Check soul requirements
    if (!this.meetsSoulRequirements(soul, template.soul_requirements)) return false;

    // Check plot count limits by scale
    const countByScale = soul.countActivePlotsByScale(template.scale);
    if (countByScale >= this.getMaxByScale(template.scale)) return false;

    return true;
  }

  private getMaxByScale(scale: PlotScale): number {
    switch (scale) {
      case 'micro': return 20;
      case 'small': return 5;
      case 'medium': return 2;
      case 'large': return 1;
      case 'epic': return 1;
    }
  }
}
```

---

## Plot Progression System

The PlotProgressionSystem evaluates active plots and fires transitions:

```typescript
class PlotProgressionSystem implements System {
  priority = 160;  // After PlotAssignmentSystem

  update(world: World): void {
    for (const soul of this.getAllSouls(world)) {
      for (const plot of soul.activePlots) {
        // Update attractors
        this.updatePlotAttractors(world, soul, plot);

        // Check transitions
        const transition = this.evaluateTransitions(world, soul, plot);
        if (transition) {
          this.executeTransition(world, soul, plot, transition);
        }

        // Check stage timeouts
        this.checkStageTimeout(world, soul, plot);
      }
    }
  }

  private updatePlotAttractors(world: World, soul: Soul, plot: PlotLineInstance): void {
    const template = this.getTemplate(plot.template_id);
    const stage = template.stages.find(s => s.id === plot.current_stage);

    const narrativePressure = world.getSystem(NarrativePressureSystem);

    // Remove old attractors from previous stage
    narrativePressure.removeAttractorsForPlot(plot.instance_id);

    // Add new attractors for current stage
    for (const attractorDef of stage.attractors) {
      const attractor = this.instantiateAttractor(attractorDef, plot.parameters);
      narrativePressure.addAttractor({
        ...attractor,
        source: { type: 'plot', plotInstanceId: plot.instance_id },
      });
    }
  }

  private executeTransition(
    world: World,
    soul: Soul,
    plot: PlotLineInstance,
    transition: PlotTransition
  ): void {
    const template = this.getTemplate(plot.template_id);
    const oldStage = template.stages.find(s => s.id === plot.current_stage)!;
    const newStage = template.stages.find(s => s.id === transition.target_stage)!;

    // Execute on_exit effects
    if (oldStage.on_exit) {
      for (const effect of oldStage.on_exit) {
        this.executeEffect(world, soul, plot, effect);
      }
    }

    // Execute transition effects
    if (transition.effects) {
      for (const effect of transition.effects) {
        this.executeEffect(world, soul, plot, effect);
      }
    }

    // Update plot state
    plot.current_stage = transition.target_stage;
    plot.stage_entered_at = soul.personalTick;

    // Record on silver thread
    soul.silverThread.append({
      type: 'plot_stage_changed',
      personal_tick: soul.personalTick,
      details: {
        plot_id: plot.template_id,
        from_stage: oldStage.id,
        to_stage: newStage.id,
        transition: transition.id
      }
    });

    // Execute on_enter effects
    if (newStage.on_enter) {
      for (const effect of newStage.on_enter) {
        this.executeEffect(world, soul, plot, effect);
      }
    }

    // Check if plot completed or failed
    if (template.completion_stages.includes(newStage.id)) {
      this.completePlot(world, soul, plot, true);
    } else if (template.failure_stages.includes(newStage.id)) {
      this.completePlot(world, soul, plot, false);
    }
  }
}
```

---

## Integration with Existing Systems

### Narrative Pressure Integration

Each plot stage can create outcome attractors:

```typescript
// Stage creates attractors
stage.attractors = [{
  goal: { type: 'relationship_formed', strength: 'deep' },
  strength: 0.6,
  decay: { type: 'on_achievement' }
}];

// These become NarrativePressureSystem attractors
narrativePressure.addAttractor({
  id: `plot_${plotInstanceId}_stage_${stageId}_0`,
  source: { type: 'plot', plotInstanceId },
  goal: { type: 'relationship_formed', ... },
  strength: 0.6,
  ...
});
```

### Dream System Integration

Plots influence dreams during sleep consolidation:

1. Soul consolidation detects plot-relevant events
2. Plot stage changes are recorded on silver thread
3. Soul queues dream hints based on active plots
4. Dreams reflect plot themes (prophetic for upcoming stages)

### Soul Consolidation Integration

During sleep, SoulConsolidationSystem:

1. Scans consolidated memories for plot-relevant events
2. Checks if any transition conditions are now met
3. Writes plot changes to silver thread
4. Queues dream hints about plot progress

---

## Template Registry

All plot templates are registered in a central registry:

```typescript
class PlotTemplateRegistry {
  private templates: Map<string, PlotLineTemplate> = new Map();

  register(template: PlotLineTemplate): void {
    this.templates.set(template.id, template);
  }

  get(id: string): PlotLineTemplate | undefined {
    return this.templates.get(id);
  }

  getByScale(scale: PlotScale): PlotLineTemplate[] {
    return Array.from(this.templates.values())
      .filter(t => t.scale === scale);
  }

  getByCategory(category: PlotCategory): PlotLineTemplate[] {
    return Array.from(this.templates.values())
      .filter(t => t.category === category);
  }

  getCompatibleWith(soul: Soul): PlotLineTemplate[] {
    return Array.from(this.templates.values())
      .filter(t => this.soulMeetsRequirements(soul, t.soul_requirements));
  }
}
```

---

## Implementation Phases

### Phase 1: Core Infrastructure
- PlotLineTemplate and PlotLineInstance types
- PlotLinesComponent on souls
- PlotTemplateRegistry
- Basic plot assignment

### Phase 2: State Machine
- PlotProgressionSystem
- Stage transitions
- Plot effects
- Completion/failure handling

### Phase 3: Narrative Pressure Integration
- Stage → attractor mapping
- Plot-sourced attractors
- Attractor cleanup on stage change

### Phase 4: Dynamic Assignment
- PlotAssignmentSystem
- Micro/small plot detection
- Spinner seed → plot mapping
- Scale limits

### Phase 5: Dream Integration
- Plot-aware soul consolidation
- Dream hints from plots
- Prophetic dreams for upcoming stages

### Phase 6: Template Library
- Micro plot templates (20+)
- Small plot templates (15+)
- Medium plot templates (10+)
- Large plot templates (5+)
- Integration with existing ascension specs

---

## Related Specifications

- [Soul System](./spec.md) - Souls and silver thread
- [Narrative Pressure System](../divinity-system/narrative-pressure-system.md) - Outcome attractors
- [Dream System](../agent-system/dream-system-spec.md) - Soul-dream integration
- [Ascension: Endless Summer](../ascension-storyline/endless-summer-spec.md) - Fae ascension plot
- [Ascension: Enochian](../ascension-storyline/enochian-ascension-spec.md) - Angel ascension plot
- [Ascension: Exaltation](../ascension-storyline/exaltation-path-spec.md) - Godhood ascension plot
