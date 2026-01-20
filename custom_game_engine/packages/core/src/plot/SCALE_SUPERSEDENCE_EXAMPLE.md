# Plot Scale Supersedence & Multiverse Scope - Examples

## Overview

The plot system has two independent dimensions:

1. **Scale Hierarchy**: micro < small < medium < large < exotic < epic
   - Higher scales replace lower scales (within same scope)
   - Max 1 plot per scale tier per scope

2. **Multiverse Scope**: local → multiverse_wide → cross_multiverse
   - Different scopes can coexist
   - Same scale but different scope = both can be active

## Scale Hierarchy Values

```typescript
const SCALE_HIERARCHY = {
  micro: 1,
  small: 2,
  medium: 3,
  large: 4,
  exotic: 5,  // NEW: System-driven plots (Divine Reckoning, Prophecy Trap)
  epic: 6,
};
```

## Example Scenarios

### Scenario 1: Basic Scale Replacement

**Soul has**:
- micro(local)
- small(local)
- large(local)

**Assigning**: exotic(local)

**Result**:
- `getPlotsToReplace()` returns: [large(local)]
- Exotic supersedes large in same scope
- Final plots: micro(local), small(local), exotic(local)

### Scenario 2: Scope Coexistence

**Soul has**:
- large(local) - "The Tyrant You Became"
- large(multiverse_wide) - "Divine Reckoning"

**Assigning**: exotic(local)

**Result**:
- `getPlotsToReplace()` returns: [large(local)]
- Only replaces large in SAME scope
- Final plots: exotic(local), large(multiverse_wide)

### Scenario 3: Epic Supersedes All

**Soul has**:
- micro(local)
- small(local)
- medium(local)
- large(local)
- exotic(local)

**Assigning**: epic(local)

**Result**:
- `getPlotsToReplace()` returns: [micro, small, medium, large, exotic]
- Epic supersedes ALL lower scales in same scope
- Final plots: epic(local)

### Scenario 4: Multi-Scope Maximum

**Soul has**:
- micro(local)
- small(local)
- exotic(local)
- exotic(multiverse_wide) - "Divine Reckoning"
- exotic(cross_multiverse) - hypothetical future plot

**Assigning**: small(multiverse_wide)

**Result**:
- `getPlotsToReplace()` returns: []
- Different scope, no conflict
- `canAssignPlot()` returns: true
- Final plots: All above + small(multiverse_wide)

## API Usage

### Check if Scale Supersedes

```typescript
import { plotScaleSupersedes } from './PlotTypes.js';

plotScaleSupersedes('exotic', 'large')  // true - exotic > large
plotScaleSupersedes('large', 'exotic')  // false - large < exotic
plotScaleSupersedes('micro', 'micro')   // false - same scale
```

### Get Plots to Replace

```typescript
import { getPlotsToReplace } from './PlotTypes.js';

const activePlots: PlotLineInstance[] = [
  { scale: 'micro', multiverse_scope: 'local', /* ... */ },
  { scale: 'large', multiverse_scope: 'local', /* ... */ },
  { scale: 'large', multiverse_scope: 'multiverse_wide', /* ... */ },
];

const newPlot: PlotLineInstance = {
  scale: 'exotic',
  multiverse_scope: 'local',
  /* ... */
};

const toReplace = getPlotsToReplace(activePlots, newPlot);
// Returns: [large(local)]
// Does NOT return large(multiverse_wide) - different scope
```

### Check if Can Assign

```typescript
import { canAssignPlot } from './PlotTypes.js';

const plotLines: PlotLinesComponent = {
  active: [
    { scale: 'micro', multiverse_scope: 'local', /* ... */ },
    { scale: 'exotic', multiverse_scope: 'local', /* ... */ },
  ],
  /* ... */
};

const newPlot: PlotLineInstance = {
  scale: 'exotic',
  multiverse_scope: 'multiverse_wide',
  /* ... */
};

const canAssign = canAssignPlot(plotLines, newPlot);
// Returns: true - different scope, so exotic(multiverse_wide) can coexist
```

## Implementation Notes

### When Assigning Plots

1. Call `canAssignPlot()` to check if assignment is possible
2. Call `getPlotsToReplace()` to get list of plots to abandon
3. For each plot to replace, call `abandonPlot(plotLines, plot.instance_id, { reason: 'superseded' })`
4. Add new plot via `addActivePlot(plotLines, newPlot)`

### Example: Plot Assignment Flow

```typescript
import {
  canAssignPlot,
  getPlotsToReplace,
  abandonPlot,
  addActivePlot
} from './PlotTypes.js';

function assignPlotWithSupersedence(
  plotLines: PlotLinesComponent,
  newPlot: PlotLineInstance,
  currentTick: number
): boolean {
  // Check if can assign
  if (!canAssignPlot(plotLines, newPlot)) {
    return false; // Already has this scale+scope combo
  }

  // Get plots to replace
  const toReplace = getPlotsToReplace(plotLines.active, newPlot);

  // Abandon superseded plots
  for (const oldPlot of toReplace) {
    abandonPlot(plotLines, oldPlot.instance_id, {
      abandoned_at: currentTick,
      reason: 'superseded',
    });
  }

  // Add new plot
  addActivePlot(plotLines, newPlot);

  return true;
}
```

## Multiverse Scope in Templates

### Setting Scope in JSON

```json
{
  "id": "large_conflict_with_god",
  "name": "Divine Reckoning",
  "scale": "exotic",
  "multiverse_scope": "multiverse_wide",
  "description": "A god has marked you across all universes..."
}
```

### Default Scope

If `multiverse_scope` is omitted, defaults to `'local'`:

```typescript
// In PlotLineRegistry.instantiate():
multiverse_scope: template.multiverse_scope ?? 'local'
```

### Current Exotic Templates

- **multiverse_wide** (spans multiple universes):
  - `large_conflict_with_god` - Divine Reckoning
  - `medium_prophecy_trap` - The Prophecy You Cannot Escape

- **local** (single universe):
  - `large_multiverse_invasion` - From Beyond the Veil
  - `medium_paradigm_war` - When Magics Collide
  - `large_tyrants_fall` - The Tyrant You Became
  - `medium_dimensional_horror` - What Dwells Between
  - `medium_time_paradox` - The Price of Changing Yesterday
  - `large_divine_champion` - The Burden of Being Chosen

### TODO: Cross-Multiverse Templates

Templates with `multiverse_scope: 'cross_multiverse'` are for extremely rare plots that transcend the entire multiverse system (e.g., threats to the simulation itself, meta-narrative events). No templates currently use this scope.

## Future Integration Points

1. **Divinity System**: Assign `multiverse_wide` plots when gods interact with souls
2. **Multiverse Manager**: Assign `cross_multiverse` plots during universe-ending events
3. **Time Travel**: Plots persist across timeline forks based on scope
4. **Plot Progression System**: Upgrade plot scope mid-story (local → multiverse_wide transition)
