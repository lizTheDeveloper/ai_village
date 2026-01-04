# Soul & Plot System Foundation - 2026-01-03

## Summary

Implemented Phase 1 foundation components for the Soul and Plot Line systems based on the comprehensive specifications created in the previous session. These systems enable:

- **Eternal soul identity** that persists across incarnations and universe forks
- **Append-only personal timeline** (Silver Thread) that continues even through save/load operations
- **Multi-scale lesson-driven plots** from micro moments to multi-lifetime epics

## Files Created

### Soul System (`packages/core/src/soul/`)

**SoulIdentityComponent.ts**
- Core eternal identity created by The Three Fates
- Wisdom accumulation across incarnations (0-100+)
- Lesson tracking in 6 domains: relationships, systems, self, transcendence, power, mortality
- Functions: `createSoulIdentityComponent`, `addLessonToSoul`, `hasLearnedLesson`, `getWisdomInDomain`

**SilverThreadComponent.ts**
- Append-only personal timeline across all universes
- Thread segments tracking universe transitions
- Significant event logging (sparse, curated - no hunger/thirst spam)
- Universe fork mechanics with personal tick increment (never resets)
- Functions: `createSilverThreadComponent`, `addSignificantEvent`, `incrementPersonalTick`, `forkToNewUniverse`, `recordSnapshotWaypoint`

**index.ts**
- Clean exports for all soul types and functions

### Plot System (`packages/core/src/plot/`)

**PlotTypes.ts**
- Plot scales: micro, small, medium, large, epic
- State machine architecture with stages, transitions, conditions, effects
- Lesson definitions with wisdom domains
- PlotLinesComponent for tracking active/completed/abandoned plots
- Plot fork behaviors for save/load scenarios
- Functions: `createPlotLinesComponent`, `addActivePlot`, `completePlot`, `abandonPlot`

**index.ts**
- Clean exports for all plot types and functions

### Integration

**ComponentType.ts**
- Added `SilverThread` and `PlotLines` to the ComponentType enum

**components/index.ts**
- Exported soul and plot systems from main components index

## Key Design Decisions

### 1. Append-Only Silver Thread
Like Bill Murray in Groundhog Day, souls remember everything even when the universe "resets" via save/load:
- Personal tick always increments, never resets
- New thread segment created on universe fork
- Universe A continues without player (orphaned), Universe B is new fork
- Soul carries complete timeline forward

### 2. Curated Event Logging
Only significant events recorded on silver thread:
- ✅ Birth, death, reincarnation, universe forks, plot stages, lessons learned
- ❌ Hunger, thirst, routine actions, every tick

### 3. Multi-Scale Plots
Different plot scales have different active limits:
- Micro (minutes-hours): 10-20 active per soul
- Small (days-weeks): 3-5 active
- Medium (months-years): 1-2 active
- Large (single lifetime): 0-1
- Epic (multi-lifetime): 0-1 (rare)

### 4. Lesson-Driven Design
Every plot teaches wisdom in a specific domain:
- Relationships: Love, trust, forgiveness
- Systems: How the world works
- Self: Self-knowledge
- Transcendence: What lies beyond
- Power: How to wield influence
- Mortality: How to die well

### 5. State Machine Plots
Plots use stages → transitions → conditions/effects architecture:
- Allows complex branching narratives
- Supports narrative pressure (outcome attractors)
- Handles fork scenarios (continue, reset_stage, suspend, fork)

## Technical Notes

### TypeScript Fixes
- Changed `import type` to `import` for ComponentType (used as value, not just type)
- Added null checks for array access (`plot` could be undefined after `findIndex`)
- Prefixed unused parameters with `_` to avoid TS6133 warnings

### Build Status
- All soul and plot components compile successfully ✅
- No errors in new code
- Pre-existing errors in other systems remain (not introduced by this work)

## Next Steps (Per WORK_ORDERS.md)

### Phase 2: Linking Systems
- **WO-SOUL-02**: Create SoulLinkComponent for agent-soul binding
- **WO-THREAD-02**: Integrate with TimelineManager for snapshot tracking
- **WO-PLOT-03**: Create PlotLineRegistry for template storage

### Phase 3: Soul-Memory Integration
- **WO-DREAM-01**: Create SoulConsolidationSystem
- **WO-DREAM-02**: Extract significant events during sleep
- **WO-DREAM-03**: Integrate with existing MemoryConsolidationSystem

### Phase 4: Plot Assignment & Progression
- **WO-PLOT-04**: Create PlotAssignmentSystem
- **WO-PLOT-05**: Create PlotProgressionSystem
- **WO-PLOT-06**: Create example plot templates

### Phase 5: Narrative Pressure Integration
- **WO-PRESSURE-01**: Update OutcomeAttractorSystem for plot attractors
- **WO-PRESSURE-02**: Link plot stages to attractor spawning

### Phase 6: Multiverse Fork Handling
- **WO-MULTI-01**: Update TimelineManager to record soul positions
- **WO-MULTI-02**: Implement fork transition logic
- **WO-MULTI-03**: Handle plot fork behaviors

## References

- [Soul System Spec](../openspec/specs/soul-system/spec.md)
- [Plot Lines Spec](../openspec/specs/soul-system/plot-lines-spec.md)
- [Silver Thread Spec](../openspec/specs/universe-system/multiverse-soul-tracking-spec.md)
- [Work Orders](../openspec/specs/soul-system/WORK_ORDERS.md)
- [Dream System Spec](../openspec/specs/agent-system/dream-system-spec.md)

## Files Modified

- `custom_game_engine/packages/core/src/types/ComponentType.ts` - Added SilverThread and PlotLines
- `custom_game_engine/packages/core/src/components/index.ts` - Added soul and plot exports

## Files Added

- `custom_game_engine/packages/core/src/soul/SoulIdentityComponent.ts`
- `custom_game_engine/packages/core/src/soul/SilverThreadComponent.ts`
- `custom_game_engine/packages/core/src/soul/index.ts`
- `custom_game_engine/packages/core/src/plot/PlotTypes.ts`
- `custom_game_engine/packages/core/src/plot/index.ts`

## Time Investment

~30 minutes for Phase 1 foundation implementation.

---

**Status**: ✅ Phase 1 Complete - Foundation components ready for integration
