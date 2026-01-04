# Soul & Plot System Phase 3: Soul-Memory Integration - 2026-01-03

## Summary

Completed Phase 3 of the Soul and Plot Line system, implementing the integration between soul persistence and agent memory consolidation. This phase enables:

- **Soul consolidation during sleep** - extracting significant events from episodic memories
- **Soul-influenced dreams** - 5 dream types based on wisdom level and incarnation
- **Memory filtering** - only plot-relevant, milestone, and meaningful choice events recorded to soul
- **Dream probability system** - based on soul influence strength and wisdom level

## Files Created

### Soul System (`packages/core/src/soul/`)

**SoulConsolidationSystem.ts**
- Priority 106 (runs after MemoryConsolidationSystem at priority 105)
- Triggered during sleep via `onSleepStart()` hook
- Extracts significant events from consolidated memories
- Filters out routine events (hunger, thirst, idle behaviors)
- Writes to soul's silver thread using `addSignificantEvent()`

Key extraction methods:
- `extractPlotEvents()` - Plot progression, quest completion
- `extractMilestones()` - Marriage, parenthood, leadership
- `extractMeaningfulChoices()` - High-importance decisions (importance > 0.7)
- `extractFirstTimeEvents()` - Novel experiences (importance > 0.6)

Philosophy: **"Don't trash up the soul with every time it was hungry or thirsty"**
- Only significant, life-changing events recorded
- Uses `EpisodicMemory.summary` field for keyword detection
- Checks last ~8 hours of consolidated memories per sleep cycle

**SoulInfluencedDreams.ts**
- 5 dream types based on soul wisdom and incarnation number
- Dream probability: `soul_influence_strength × (wisdom_level / 100)`
- Each dream type has specific triggers and content generation

Dream Types:
1. **past_life_echo**: Fragments from previous incarnations (low wisdom)
2. **wisdom_hint**: Soul guidance via learned lessons (all levels)
3. **prophetic_vision**: Plot foreshadowing from active plots (medium+ wisdom)
4. **ancestral_memory**: Deep soul history, true name revelation (high wisdom)
5. **lesson_reminder**: Recent insights echoing in dreams (all levels)

Dream Type Selection Logic:
- **First incarnation (1)**: 80% wisdom hints, 20% lesson reminders
- **Low wisdom (<25)**: 60% past life, 30% wisdom, 10% lesson
- **Medium wisdom (25-50)**: 40% wisdom, 30% past life, 20% lesson, 10% prophetic
- **High wisdom (50-75)**: 30% prophetic, 20% wisdom, 20% ancestral, 20% past life, 10% lesson
- **Very high wisdom (75+)**: 50% prophetic, 30% ancestral, 20% wisdom

Functions exported:
- `generateSoulDream(agent, world): SoulDream | null`
- `shouldReceiveSoulDream(agent, world): boolean`

## Key Design Decisions

### 1. Sleep-Based Consolidation
Soul consolidation runs during sleep events, not every tick:
- Integrates with existing SleepSystem
- Processes after memory consolidation (priority 106 > 105)
- Only examines consolidated memories (already filtered for importance)
- Reduces computational overhead

### 2. Significance Filtering
Multiple filters prevent "soul spam":
- **Keyword detection**: 'plot', 'quest', 'goal', 'married', 'child', 'leader', 'first', 'chose', 'decided'
- **Importance thresholds**: Choices >0.7, first-time events >0.6
- **Event type filtering**: Only major_milestone, meaningful_choice, plot_stage_change, first_time_event
- **Time-based**: Last 8 hours (configurable via cutoff calculation)

### 3. Dream Probability System
Dreams aren't guaranteed every sleep:
```typescript
dreamProbability = soul_influence_strength × (wisdom_level / 100)
```

Example probabilities:
- New soul (wisdom=10, influence=0.3): 3% chance per sleep
- Mature soul (wisdom=50, influence=0.7): 35% chance per sleep
- Ancient soul (wisdom=90, influence=0.9): 81% chance per sleep

This creates natural progression where experienced souls dream more frequently.

### 4. Null Safety Throughout
All array access protected with null checks:
```typescript
const event = pastEvents[Math.floor(Math.random() * pastEvents.length)];
if (!event) {
  return { type: 'past_life_echo', content: 'fog and shadows...', intensity: 0.3 };
}
```

Prevents crashes when:
- No significant events exist yet (new soul)
- No lessons learned yet (young soul)
- No active plots (between plot arcs)

### 5. Integration with EpisodicMemoryComponent
Correctly uses the component API:
- `episodicMemory.episodicMemories` getter (readonly array)
- `EpisodicMemory` interface (not `Memory`)
- `summary` field for content (not `content`)
- Proper conversion: `Array.from(episodicMemory.episodicMemories)`

## Integration Points

### With SleepSystem
- SoulConsolidationSystem subscribes to 'sleep_start' events
- `onSleepStart(agent, world)` called when agent enters sleep
- Runs after MemoryConsolidationSystem finishes (priority order)

### With MemoryConsolidationSystem
- Relies on consolidated memories being marked `consolidated: true`
- Uses importance scores calculated by memory system
- Filters last 8 hours of waking time (matches typical sleep cycle)

### With SilverThreadComponent
- Uses `addSignificantEvent(thread, event)` to append events
- Respects append-only nature of silver thread
- Events include personal tick, type, and detail metadata

### With PlotLinesComponent
- Checks for active plots to generate prophetic visions
- Uses `template_id` for dream content
- Integrates plot progression with soul memory

## Technical Notes

### System Interface Compliance
SoulConsolidationSystem properly implements System interface:
```typescript
export class SoulConsolidationSystem implements System {
  readonly id = 'soul_consolidation' as const;
  readonly priority = 106;
  readonly requiredComponents = [] as const;

  update(_world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    // Event-driven system, not tick-based
  }
}
```

### Memory Access Pattern
Correct usage of EpisodicMemoryComponent:
```typescript
// ❌ WRONG
const memories = episodicMemory.memories; // Private field
memory.content.includes('plot');          // Wrong field name

// ✅ CORRECT
const memories = Array.from(episodicMemory.episodicMemories); // Public getter
memory.summary.includes('plot');                              // Correct field
```

### Dream Content Generation
Each dream type has specific fallback content:
- **No events**: Generic atmospheric dreams ("fog and shadows...")
- **No lessons**: Guidance that can't be heard ("cannot quite make out the words...")
- **No plots**: Vague future visions ("paths not yet taken...")

This ensures dreams are always generated when triggered, even for young souls.

### TypeScript Null Safety
All potentially undefined array accesses guarded:
```typescript
const lesson = lessons[index];
if (!lesson) {
  return fallbackDream;
}
// Use lesson safely here
```

Prevents:
- Array index out of bounds
- Undefined access on empty arrays
- Type errors from possibly undefined values

## Build Status
✅ All Phase 3 components compile successfully with **zero errors**
✅ No soul/plot TypeScript errors
✅ Properly implements System interface
✅ Correct EpisodicMemoryComponent API usage
✅ All null checks in place

## Files Created
- `custom_game_engine/packages/core/src/soul/SoulConsolidationSystem.ts`
- `custom_game_engine/packages/core/src/soul/SoulInfluencedDreams.ts`

## Files Modified
- `custom_game_engine/packages/core/src/soul/index.ts` - Added dream and consolidation exports

## Build Verification

Phase 3 passed TypeScript compilation with zero soul/plot errors:
```bash
$ npm run build 2>&1 | grep -E "(soul|plot)"
# No output = No errors
```

Fixed errors during development:
1. ✅ Import `EpisodicMemory` not `Memory` from EpisodicMemoryComponent
2. ✅ Change `memory.content` to `memory.summary`
3. ✅ Change `episodicMemory.memories` to `episodicMemory.episodicMemories`
4. ✅ Add System interface fields: `id`, `requiredComponents`
5. ✅ Fix `update()` signature to match System interface
6. ✅ Add null checks for all array access (event, lesson, plot)
7. ✅ Prefix unused parameters with underscore (_soul, _agent, _world, etc.)

## Next Steps (Phase 4: Plot Assignment & Progression)

From WORK_ORDERS.md Phase 4:
- **WO-PLOT-04**: Create PlotAssignmentSystem (evaluates eligibility, instantiates plots)
- **WO-PLOT-05**: Create PlotProgressionSystem (advances stages, checks transitions)
- **WO-PLOT-06**: Add plot-based narrative pressure (influences agent decisions)

### Integration with Existing Systems
Phase 4 will connect to:
- `PlotLineRegistry` - Template lookup and eligibility checking
- `SoulIdentityComponent` - Wisdom, archetype, interests, lessons learned
- `SilverThreadComponent` - Plot instance tracking, stage transitions
- `LLMPromptBuilder` - Inject plot context into agent decision-making

### Plot Assignment Triggers
- **On soul creation**: Assign first plot based on archetype
- **On plot completion**: Check for follow-up plots in same arc
- **Periodic checks**: Every N ticks, evaluate new plot eligibility
- **Event-driven**: Specific events trigger plot assignment (marriage, death, discovery)

### Plot Progression Mechanics
- **Condition checking**: Evaluate transition conditions each tick
- **Stage advancement**: Update PlotLinesComponent current stage
- **Effect application**: Modify agent state (add component, change stats, trigger event)
- **Completion detection**: Check if agent reached completion_stages
- **Failure handling**: Detect failure_stages, record to silver thread

## Time Investment

~30 minutes for Phase 3 soul-memory integration and dream system.

---

**Status**: ✅ Phase 3 Complete - Soul consolidation and dreams ready for sleep integration
