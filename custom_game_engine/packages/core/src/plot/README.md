# Plot System

**Lesson-driven narrative engine for multi-scale story arcs.**

## Overview

Plot system generates emergent narratives through templated story arcs that teach wisdom across five scales: micro (minutes), small (days), medium (months), large (lifetime), epic (multi-lifetime). Plots progress through state machine stages based on emotional state, relationships, skills, and custom conditions.

**Core concept**: Plots = templates with stages, transitions, conditions, effects, and lessons. Templates instantiate as plot instances bound to souls with role-based agent bindings.

## Architecture

**Components**:
- `PlotLinesComponent` - Stored on soul entity; tracks active/completed/abandoned plots
- `PlotLineTemplate` - Reusable plot definition with stages, transitions, lessons
- `PlotLineInstance` - Active plot bound to soul with current stage, bound agents, relationship snapshots

**Systems** (priority order):
1. `EventDrivenPlotAssignmentSystem` (85) - Assigns plots when triggers fire (trauma, relationship changes, skill mastery)
2. `PlotProgressionSystem` (86) - Evaluates transition conditions, advances stages, applies effects
3. `PlotNarrativePressure` (80) - Spawns/removes stage attractors for narrative pressure

**Registry**: `plotLineRegistry` - Central storage for templates; handles instantiation with parameter/agent binding

## Plot Structure

**Template**:
```typescript
{
  id: 'plot_id',
  scale: 'micro' | 'small' | 'medium' | 'large' | 'epic',
  lesson: { theme, insight, wisdom_value, domain, repeatable },
  entry_stage: 'stage_id',
  stages: [{ stage_id, name, description, on_enter_effects, on_exit_effects, stage_attractors }],
  transitions: [{ from_stage, to_stage, conditions, effects, probability }],
  completion_stages: ['stage_id'],
  assignment_rules: { triggers, trigger_bindings, min_wisdom, required_archetype }
}
```

**Conditions** (50+ types): emotional_state, mood_threshold, has_relationship_with_role, has_trauma, stress_threshold, in_breakdown, relationship_changed, social_isolation, wisdom_threshold, skill mastery, custom functions, structural (all/any/not)

**Effects** (30+ types): modify_mood, modify_stress, add_trauma, trigger_breakdown, modify_relationship_by_role, grant_skill_xp, queue_dream_hint, prophetic_dream, custom functions

## Templates

**Location**: `templates/` directory organized by scale:
- `MicroPlotTemplates.ts` - Fleeting moments (5-20 active/soul, 1-2 wisdom)
- `SmallPlotTemplates.ts` - Days to weeks (3-5 active/soul)
- `MediumPlotTemplates.ts` - Months to years (1-2 active/soul)
- `LargePlotTemplates.ts` - Single lifetime (0-1 active/soul)

**Examples**: Moment of Courage (micro), First Conversation (small), Ascension Through Surrender (epic)

## Event-Driven Triggers

**Phase 2**: Plots auto-assign on events vs manual assignment.

**Triggers**: on_trauma, on_relationship_change, on_emotional_state, on_breakdown, on_death_nearby, on_skill_mastery, on_mood_threshold, on_stress_threshold, on_social_isolation, on_relationship_formed, on_major_loss

**Agent Binding**: Automatically binds agents to roles when triggered (e.g., 'deceased' role = agent who died, 'betrayer' = lowest_trust agent)

**Cooldowns**: `cooldown_ticks` prevents same plot re-triggering; `max_concurrent` limits active instances

## API

```typescript
// Registry
import { plotLineRegistry, registerPlotTemplate, instantiatePlot } from './PlotLineRegistry.js';
plotLineRegistry.register(template);
const instance = instantiatePlot('template_id', soul_id, tick, bindings);

// Component helpers
import { addActivePlot, completePlot, abandonPlot } from './PlotTypes.js';
addActivePlot(plotLines, instance);
completePlot(plotLines, instance_id, { completed_at, universe_id, lesson_learned });

// Condition/Effect execution
import { evaluatePlotCondition, executeEffect } from './index.js';
const passes = evaluatePlotCondition(condition, context);
executeEffect(effect, context);

// Initialize templates
import { initializePlotTemplates } from './PlotTemplates.js';
initializePlotTemplates(); // Call at startup
```

## Integration

**Dream System**: Plots queue dream hints via `queue_dream_hint` effect; consumed during sleep consolidation for prophetic dreams

**Narrative Pressure**: Stage attractors auto-spawn on stage entry, removed on exit; guide agent behavior toward plot goals

**Soul Lessons**: Wisdom gained on completion; tracks learned lessons to prevent repeats (if `repeatable: false`)

**Relationship Tracking**: Captures relationship snapshots at binding; enables "trust dropped by 30" conditions

**Fork Behavior**: Configures how plots behave on universe fork (continue, reset_stage, reset_plot, suspend, fork parallel)
