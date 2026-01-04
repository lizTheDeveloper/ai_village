# Soul & Plot System Phase 4: Plot Assignment & Progression - 2026-01-03

## Summary

Completed Phase 4 of the Soul and Plot Line system, implementing the active plot mechanics that drive agent narratives. This phase enables:

- **Plot assignment** - Evaluates eligibility and assigns plots to souls
- **Plot progression** - Advances stages based on transition conditions
- **Narrative pressure** - Injects plot context into agent decision-making
- **Completion/failure handling** - Detects endings and triggers follow-ups

## Files Created

### Plot System (`packages/core/src/plot/`)

**PlotAssignmentSystem.ts**
- Priority 85 (runs before progression at 86)
- Max 3 concurrent plots per soul
- Periodic assignment check every 100 ticks

Assignment triggers:
- `assignInitialPlot()` - First plot based on archetype (micro-scale preferred)
- `assignFollowUpPlot()` - After completion (higher scales now possible)
- `checkAllSoulsForAssignment()` - Periodic check for eligible souls
- `assignEventTriggeredPlot()` - Specific events trigger plots (future extension)

Eligibility filtering via `plotLineRegistry.getEligible()`:
- Wisdom requirements (`min_wisdom`)
- Archetype matching (`required_archetype`)
- Interest alignment (`required_interests`)
- Forbidden lessons (`forbidden_if_learned`)

Scale progression:
- New souls get micro plots
- After completion, eligible for same or higher scale
- Example: micro → small → medium → large → epic

**PlotProgressionSystem.ts**
- Priority 86 (runs after assignment at 85)
- Runs every tick for all active plots
- Evaluates transition conditions and advances stages

Core mechanics:
- `progressSoulPlots()` - Main update loop per soul
- `checkPlotProgression()` - Evaluate completion/failure/transitions
- `evaluateTransitionConditions()` - Check if conditions met
- `advanceStage()` - Move to next stage, apply effects
- `applyEffects()` - Execute stage/transition effects
- `handlePlotCompletion()` - Add lesson, record to thread, trigger follow-up
- `handlePlotFailure()` - Record failure to thread

Supported conditions:
- `wisdom_threshold` - Requires minimum wisdom level
- `lesson_learned` - Requires specific lesson ID
- `personal_tick_elapsed` - Requires time in current stage
- `agent_exists` - Requires incarnation
- `custom` - Placeholder for future extension

Supported effects:
- `add_lesson` - Grant wisdom in domain
- `wisdom_change` - Modify wisdom level
- `add_component` - Future: Add component to agent
- `trigger_event` - Future: Emit game event

Tick calculation:
- Ticks in stage = `thread.head.personal_tick - plot.stage_entered_at`
- No counter field - calculated on-demand from soul's personal timeline

**PlotNarrativePressure.ts**
- Utilities for injecting plot context into agent prompts
- Weighted by plot scale and soul influence strength

Key functions:
- `getAgentNarrativePressure()` - Get all active plot pressures for agent
- `formatNarrativePressureForPrompt()` - Format as markdown section for prompt
- `getPrimaryPlot()` - Get highest-weighted plot
- `shouldPrioritizePlot()` - Check if any plot exceeds threshold
- `getPlotGuidanceForAction()` - Get plot-specific action guidance

Narrative pressure calculation:
```typescript
const scaleWeight = { micro: 0.2, small: 0.4, medium: 0.6, large: 0.8, epic: 1.0 }[plot.scale];
const influenceWeight = soulLink.soul_influence_strength;
const pressureWeight = Math.min(1.0, scaleWeight * influenceWeight);
```

Example pressure weights:
- Micro plot, low influence (0.2 × 0.3): 0.06 (subtle)
- Medium plot, balanced influence (0.6 × 0.5): 0.30 (moderate)
- Epic plot, high influence (1.0 × 0.9): 0.90 (strong)

Prompt formatting:
```markdown
## Active Story Arcs

**[strong influence]** You are on a journey to learn about relationships...

**[moderate influence]** You seek to understand systems thinking...
```

## Key Design Decisions

### 1. Registry Pattern for Templates
PlotLineInstance stores minimal runtime state:
- `current_stage` - Stage ID
- `stage_entered_at` - Personal tick when entered
- `parameters` - Dynamic parameter bindings

All template data (stages, transitions, lessons, effects) accessed via:
```typescript
const template = plotLineRegistry.getTemplate(plot.template_id);
```

**Why**: Prevents data duplication, enables template updates, reduces memory footprint.

### 2. Personal Tick for Stage Timing
Ticks in stage calculated on-demand:
```typescript
const ticksInStage = thread.head.personal_tick - plot.stage_entered_at;
```

**Why**:
- Syncs with soul's eternal timeline
- Continues across universe forks
- No counter field to maintain

### 3. Conservative Assignment Strategy
- Max 3 concurrent plots per soul
- Periodic checks skip souls with any active plots
- Follow-up plots prefer same or higher scale

**Why**: Prevents overwhelming agents with too many narrative threads.

### 4. Template-Driven Progression
Progression logic is data-driven via templates:
- Stages define narrative beats
- Transitions define conditions
- Effects modify game state

**Why**: Enables non-programmers to create plots via JSON templates.

### 5. Narrative Pressure Weighting
Pressure increases with:
- Plot scale (micro → epic)
- Soul influence strength
- Product of both factors

**Why**: Epic plots with strong soul influence dominate decision-making, while micro plots with weak influence provide subtle guidance.

## Integration Points

### With PlotLineRegistry
- Assignment uses `getEligible()` for filtering
- Progression uses `getTemplate()` for stage/transition data
- Pressure uses `getTemplate()` for lesson/scale information

### With SoulIdentityComponent
- Wisdom level checked for eligibility and conditions
- Lessons added on plot completion
- Archetype and interests used for filtering

### With SilverThreadComponent
- Personal tick used for timing calculations
- Stage changes recorded as significant events
- Plot completion/failure recorded to thread

### With SoulLinkComponent
- Soul influence strength weights narrative pressure
- Incarnation number affects assignment strategy
- Primary incarnation status required for agent exists condition

### With Future Prompt Builder
PlotNarrativePressure provides:
```typescript
const pressures = getAgentNarrativePressure(agent, world);
const promptSection = formatNarrativePressureForPrompt(pressures);
// Inject promptSection into agent's decision-making prompt
```

## Technical Notes

### Discriminated Union Types
PlotCondition and PlotEffect are discriminated unions:
```typescript
type PlotCondition =
  | { type: 'wisdom_threshold'; min_wisdom: number }
  | { type: 'lesson_learned'; lesson_id: string }
  | { type: 'personal_tick_elapsed'; ticks: number }
  // ... more types
```

Each type has specific fields. Access via type narrowing:
```typescript
if (condition.type === 'wisdom_threshold') {
  // TypeScript knows: condition.min_wisdom exists
  if (wisdom < condition.min_wisdom) return false;
}
```

### Signature Fixes Applied
Functions updated to match actual component APIs:

**instantiatePlot**:
```typescript
// Before
instantiatePlot(template, {})

// After
instantiatePlot(template.id, soul.id, thread.head.personal_tick, {})
```

**completePlot**:
```typescript
// Before
completePlot(plotLines, instance_id, lesson_insight)

// After
completePlot(plotLines, instance_id, {
  completed_at: thread.head.personal_tick,
  universe_id: thread.head.universe_id,
  lesson_learned: template.lesson.insight,
})
```

**addLessonToSoul**:
```typescript
// Before
addLessonToSoul(identity, domain, insight)

// After
addLessonToSoul(identity, {
  lesson_id: plot.instance_id,
  personal_tick: thread.head.personal_tick,
  universe_id: thread.head.universe_id,
  incarnation: soulLink.incarnation_number,
  wisdom_gained: 5,
  domain: template.lesson.domain,
  insight: template.lesson.insight,
  plot_source: plot.template_id,
})
```

### Missing Field Workarounds
`CompletedPlot` doesn't store `scale`:
- Solution: Look up original template via `plotLineRegistry.getTemplate(plot.template_id)`
- Access scale from template: `template.scale`

This pattern used throughout for accessing template-only data from plot instances.

### Null Safety
All potentially undefined values checked:
```typescript
const template = plotLineRegistry.getTemplate(plot.template_id);
if (!template) {
  console.warn(`Template ${plot.template_id} not found`);
  return;
}

const stage = template.stages.find(s => s.stage_id === plot.current_stage);
if (!stage) {
  console.warn(`Stage ${plot.current_stage} not found`);
  return;
}
```

### Lambda Type Annotations
Explicit types added for all lambda parameters:
```typescript
// Before
.filter(t => t.scale === 'micro')
.reduce((max, p) => p.weight > max.weight ? p : max, pressures[0])

// After
.filter((t: PlotLineTemplate) => t.scale === 'micro')
.reduce((max: NarrativePressure, p: NarrativePressure) =>
  p.weight > max.weight ? p : max,
  pressures[0]!
)
```

## Build Status
✅ All Phase 4 components compile successfully with **zero errors**
✅ No soul/plot TypeScript errors
✅ Proper use of registry pattern for template access
✅ Correct discriminated union handling
✅ All null checks in place

## Files Created
- `custom_game_engine/packages/core/src/plot/PlotAssignmentSystem.ts`
- `custom_game_engine/packages/core/src/plot/PlotProgressionSystem.ts`
- `custom_game_engine/packages/core/src/plot/PlotNarrativePressure.ts`

## Files Modified
- `custom_game_engine/packages/core/src/plot/index.ts` - Added Phase 4 exports

## Build Verification

Phase 4 passed TypeScript compilation with zero soul/plot errors:
```bash
$ npm run build 2>&1 | grep -E "(soul|plot)"
# No output = No errors
```

Comprehensive fixes applied by Task agent:
- Type name corrections (PlotInstance → PlotLineInstance)
- Import fixes (getEligibleTemplates → plotLineRegistry.getEligible)
- Signature fixes (instantiatePlot, completePlot, abandonPlot, addLessonToSoul)
- Condition field fixes (value → min_wisdom/lesson_id/ticks)
- Effect type fixes (Array<{type, value}> → PlotEffect[])
- Lambda type annotations throughout
- Null safety checks added
- Unused parameter prefixing

## Next Steps (Future Phases)

### Phase 5: Narrative Pressure Integration
- Integrate `formatNarrativePressureForPrompt()` into LLM prompt builder
- Add plot context to agent decision-making
- Weight action choices by plot relevance

### Phase 6: Multiverse Fork Handling
- Handle plot fork behaviors (continue, reset, suspend)
- Sync plot state across timeline branches
- Resolve plot conflicts on universe merge

### Phase 7: Plot Template Library
- Create initial plot templates for each archetype
- Define micro → epic plot arcs
- Test eligibility filtering with real templates

### Phase 8: Event-Driven Assignment
- Define event types that trigger plots
- Map events to plot templates
- Implement event-based assignment

## Example Usage

### Assigning Initial Plot
```typescript
const assignmentSystem = new PlotAssignmentSystem();

// On soul creation
const soul = createSoulEntity(world, {
  true_name: "Wandering-Star",
  archetype: "seeker",
  wisdom_level: 10,
});

const plot = assignmentSystem.assignInitialPlot(soul, world);
// Assigns micro-scale plot matching "seeker" archetype
```

### Plot Progression
```typescript
const progressionSystem = new PlotProgressionSystem();

// Every tick
progressionSystem.update(world, entities, deltaTime);
// Checks all active plots, advances stages when conditions met
```

### Narrative Pressure
```typescript
import { getAgentNarrativePressure, formatNarrativePressureForPrompt } from '@ai-village/core';

// In prompt builder
const pressures = getAgentNarrativePressure(agent, world);
const narrativeSection = formatNarrativePressureForPrompt(pressures);

const prompt = `
${agentContext}

${narrativeSection}

What do you do next?
`;
```

## Time Investment

~45 minutes for Phase 4 plot assignment, progression, and narrative pressure systems.

---

**Status**: ✅ Phase 4 Complete - Plot mechanics ready for template creation and prompt integration
