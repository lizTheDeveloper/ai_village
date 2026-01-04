# Plot Templates Implementation - 2026-01-03

## Summary

Implemented concrete plot line templates based on the specifications in `openspec/specs/soul-system/plot-lines-spec.md`. Created three plot templates (2 active for PoC, 1 defined for future) and integrated them with the PlotLineRegistry system.

## Files Created

### PlotTemplates.ts

**Location**: `packages/core/src/plot/PlotTemplates.ts`

**Purpose**: Concrete plot line template definitions that can be instantiated for individual souls.

**Templates Implemented**:

#### 1. Moment of Courage (Micro-scale, **Active in PoC**)
- **Scale**: Micro (minutes to hours)
- **Lesson**: "Courage is not the absence of fear, but action despite it"
- **Domain**: Self
- **Stages**: fear_arises → courage_shown | missed
- **Transitions**: Time-based (50 ticks to show courage, 500 ticks timeout)
- **Wisdom Value**: 1 point

Simple plot about facing a moment of fear. Can be repeated.

#### 2. First Conversation (Small-scale, **Active in PoC**)
- **Scale**: Small (days to weeks)
- **Lesson**: "Words shared create bonds between souls"
- **Domain**: Relationships
- **Stages**: isolated → conversed
- **Transitions**: Time-based (10000 ticks)
- **Wisdom Value**: 3 points

Plot about having a meaningful conversation with another agent. Grounded in existing conversation systems.

#### 3. Ascension Through Surrender (Epic-scale, **Defined but not active**)
- **Scale**: Epic (multi-lifetime)
- **Lesson**: "True power is earned through surrender of control"
- **Domain**: Transcendence
- **Stages**: mortal → seeking → trial → witnessing → transcended
- **Transitions**: Wisdom thresholds (50, 80) and lesson prerequisites
- **Wisdom Value**: 100 points
- **Requirements**: Archetype 'seeker', min wisdom 30, interests in transcendence/wisdom

Complex multi-stage plot from the paid spec. Not registered for PoC but defined for future use.

## Integration

### PlotLineRegistry

Templates are registered via `initializePlotTemplates()`:

```typescript
import { initializePlotTemplates } from '@ai-village/core';

// Call during game startup
initializePlotTemplates();
// Logs: [PlotTemplates] Registered 2 plot templates for PoC
```

### Template Structure

Each template follows the PlotLineTemplate interface:

```typescript
{
  id: string;
  name: string;
  description: string;
  scale: PlotScale;
  fork_behavior: PlotForkBehavior;
  lesson: PlotLesson;
  entry_stage: string;
  completion_stages: string[];
  failure_stages?: string[];
  stages: PlotStage[];
  transitions: PlotTransition[];
  assignment_rules?: {
    min_wisdom?: number;
    required_archetype?: string[];
    required_interests?: string[];
    forbidden_if_learned?: string[];
  };
}
```

### Key Design Decisions

**1. Separate PoC Templates**

Created `POC_PLOT_TEMPLATES` array for active templates vs `ALL_PLOT_TEMPLATES` for all defined templates:

```typescript
export const POC_PLOT_TEMPLATES = [
  momentOfCourage,
  firstConversation,
];

export const ALL_PLOT_TEMPLATES = [
  ...POC_PLOT_TEMPLATES,
  ascensionThroughSurrender, // Not registered for PoC
];
```

**2. Time-Based Transitions**

PoC templates use simple time-based transitions (`personal_tick_elapsed`) rather than complex event/component conditions. This makes them easier to test and more predictable.

**3. Repeatable Micro/Small Plots**

Both PoC templates are repeatable (`repeatable: true`). This allows agents to gain the same lesson multiple times, reinforcing learning.

**4. Grounded in Existing Systems**

- First Conversation ties to existing conversation system
- Courage moment can be triggered by existing threat/fear mechanics
- No new game systems required for PoC

**5. Epic Plot Preserved**

Kept the epic ascension plot from the paid spec but didn't register it for PoC. It's available when we're ready to test multi-lifetime progression.

## Files Modified

**packages/core/src/plot/index.ts**
- Added exports for template functions and constants
- Exports: `momentOfCourage`, `firstConversation`, `ascensionThroughSurrender`
- Exports: `POC_PLOT_TEMPLATES`, `ALL_PLOT_TEMPLATES`, `initializePlotTemplates`

## Build Status

✅ **Zero plot/soul TypeScript errors**
✅ **All templates compile successfully**
✅ **Ready for integration with PlotAssignmentSystem**

Pre-existing errors in other packages (renderer, behaviors, city) remain but are unrelated to plot templates.

## Next Steps

### Phase 1: Template Registration
- [ ] Call `initializePlotTemplates()` during game startup
- [ ] Verify templates are registered via registry stats
- [ ] Test template retrieval via `plotLineRegistry.getTemplate()`

### Phase 2: Plot Assignment Testing
- [ ] Integrate with PlotAssignmentSystem
- [ ] Test micro plot assignment (momentOfCourage)
- [ ] Test small plot assignment (firstConversation)
- [ ] Verify max plot limits per scale

### Phase 3: Progression Testing
- [ ] Test plot progression with time-based transitions
- [ ] Verify lesson learning on completion
- [ ] Test wisdom accumulation
- [ ] Verify plot completion/failure

### Phase 4: Narrative Pressure
- [ ] Integrate with narrative pressure system
- [ ] Test attractor generation from stages
- [ ] Verify prompt injection

### Phase 5: Additional Templates
- [ ] Add more micro plots (5-10 total)
- [ ] Add more small plots (3-5 total)
- [ ] Add medium plots (1-2 total)
- [ ] Enable epic ascension plot when ready

## Usage Example

```typescript
import {
  initializePlotTemplates,
  plotLineRegistry,
  instantiatePlot,
} from '@ai-village/core';

// Startup
initializePlotTemplates();

// Later: Instantiate plot for a soul
const plot = instantiatePlot(
  'moment_of_courage',
  soul.id,
  thread.head.personal_tick,
  {} // No parameters needed for this template
);

if (plot) {
  addActivePlot(plotLines, plot);
  console.log(`Assigned plot: ${plot.template_id} to soul ${soul.id}`);
}
```

## Time Investment

~45 minutes for template implementation and build verification.

---

**Status**: ✅ Templates Complete - Ready for assignment and progression testing
