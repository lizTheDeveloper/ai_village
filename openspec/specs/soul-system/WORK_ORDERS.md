# Soul & Plot System Work Orders

> Each work order is scoped for a single Claude Code session (~1-2 hours of focused work).

## Dependencies Graph

```
                    ┌─────────────────┐
                    │  WO-SOUL-01     │
                    │  Soul Components│
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │  WO-SOUL-02     │ │  WO-THREAD-01   │ │  WO-PLOT-01     │
    │  Soul Link      │ │  Silver Thread  │ │  Plot Types     │
    └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
             │                   │                   │
             ▼                   ▼                   ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │  WO-SOUL-03     │ │  WO-THREAD-02   │ │  WO-PLOT-02     │
    │  Fates Ceremony │ │  Thread Events  │ │  Plot Templates │
    │  Integration    │ │                 │ │                 │
    └─────────────────┘ └────────┬────────┘ └────────┬────────┘
                                 │                   │
                                 ▼                   ▼
                        ┌─────────────────┐ ┌─────────────────┐
                        │  WO-DREAM-01    │ │  WO-PLOT-03     │
                        │  Soul Consol.   │ │  Plot Assign    │
                        └────────┬────────┘ └────────┬────────┘
                                 │                   │
                                 └─────────┬─────────┘
                                           ▼
                                 ┌─────────────────┐
                                 │  WO-PLOT-04     │
                                 │  Plot Progress  │
                                 └────────┬────────┘
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │  WO-PRESSURE-01 │
                                 │  Plot Attractors│
                                 └─────────────────┘
```

---

## Soul System Work Orders

### WO-SOUL-01: Soul Identity Component
**Priority:** P0 (Foundation)
**Dependencies:** None
**Estimated:** 1 session

**Task:**
Create `SoulIdentityComponent` and register it in ComponentType.

**Deliverables:**
1. Create `packages/core/src/components/SoulIdentityComponent.ts`
2. Add to `ComponentType.ts` as `soul_identity`
3. Add serialization support

**Interface:**
```typescript
interface SoulIdentityComponent {
  type: 'soul_identity';
  true_name: string;
  created_at: number;
  purpose: string;
  core_interests: string[];
  destiny?: string;
  archetype: string;
  cosmic_alignment: number;
  incarnation_count: number;
  total_personal_ticks: number;
  wisdom_level: number;
  lessons_learned: LessonRecord[];
}
```

**Acceptance Criteria:**
- [ ] Component type defined and registered
- [ ] Can create entity with soul_identity component
- [ ] Serializes/deserializes correctly
- [ ] Build passes

---

### WO-SOUL-02: Soul Link Component
**Priority:** P0 (Foundation)
**Dependencies:** WO-SOUL-01
**Estimated:** 1 session

**Task:**
Create `SoulLinkComponent` that links agents to their souls.

**Deliverables:**
1. Create `packages/core/src/components/SoulLinkComponent.ts`
2. Add to `ComponentType.ts` as `soul_link`
3. Create helper functions: `getSoulForAgent()`, `getAgentForSoul()`

**Interface:**
```typescript
interface SoulLinkComponent {
  type: 'soul_link';
  soul_id: string;
  link_formed_at: number;
  is_primary_incarnation: boolean;
  soul_influence_strength: number;
}
```

**Acceptance Criteria:**
- [ ] Component on agents pointing to soul entity
- [ ] Helper functions work correctly
- [ ] Handles missing soul gracefully
- [ ] Build passes

---

### WO-SOUL-03: Integrate Existing Fate Ceremony
**Priority:** P1
**Dependencies:** WO-SOUL-01, WO-SOUL-02
**Estimated:** 1 session

**Task:**
Connect existing `SoulCreationCeremony.ts` to create actual soul entities.

**Deliverables:**
1. Modify `SoulCreationCeremony.ts` to create soul entities
2. Create `SoulCreationSystem.ts` that orchestrates ceremony → entity
3. Soul entity created with `soul_identity` component from ceremony results

**Acceptance Criteria:**
- [ ] `SoulCreationResult` maps to `SoulIdentityComponent`
- [ ] Soul entity persists independently of agent
- [ ] Ceremony transcript stored on soul
- [ ] Build passes

---

## Silver Thread Work Orders

### WO-THREAD-01: Silver Thread Component
**Priority:** P0 (Foundation)
**Dependencies:** WO-SOUL-01
**Estimated:** 1 session

**Task:**
Create `SilverThreadComponent` for tracking soul's journey.

**Deliverables:**
1. Create `packages/core/src/components/SilverThreadComponent.ts`
2. Add to `ComponentType.ts` as `silver_thread`
3. Define `ThreadSegment` and `SignificantEvent` types

**Interface:**
```typescript
interface SilverThreadComponent {
  type: 'silver_thread';
  segments: ThreadSegment[];
  events: SignificantEvent[];
  head: ThreadPosition;
  totals: ThreadTotals;
}
```

**Acceptance Criteria:**
- [ ] Component registered and serializable
- [ ] Append-only `events` array
- [ ] Thread segment tracking works
- [ ] Build passes

---

### WO-THREAD-02: Significant Event Types
**Priority:** P1
**Dependencies:** WO-THREAD-01
**Estimated:** 1 session

**Task:**
Define all significant event types and create append helper.

**Deliverables:**
1. Create `packages/core/src/soul/SignificantEventTypes.ts`
2. Implement `appendEvent(thread, event)` with validation
3. Implement `isSignificantEvent(event)` filter

**Event Types to Define:**
- `soul_created`, `incarnated`, `died`, `reincarnated`
- `universe_fork`, `arrived_via_load`, `snapshot_waypoint`
- `plot_started`, `plot_stage_changed`, `plot_completed`, `plot_failed`
- `lesson_learned`, `wisdom_gained`
- `first_love`, `first_loss`, `first_kill`, `became_parent`, `became_leader`
- `betrayal`, `sacrifice`, `forgiveness`

**Acceptance Criteria:**
- [ ] All event types defined with proper payloads
- [ ] Append function validates event structure
- [ ] Significance filter works
- [ ] Build passes

---

### WO-THREAD-03: Snapshot Soul Positions
**Priority:** P2
**Dependencies:** WO-THREAD-01
**Estimated:** 1 session

**Task:**
Extend save system to record soul thread positions in snapshots.

**Deliverables:**
1. Extend snapshot metadata to include `soul_positions: Map<string, SoulSnapshotPosition>`
2. On save: record position for all souls
3. On save: append `snapshot_waypoint` event to each soul's thread

**Acceptance Criteria:**
- [ ] Snapshots include soul positions
- [ ] Waypoint events appear on thread after save
- [ ] Positions include personal_tick, segment_index
- [ ] Build passes

---

### WO-THREAD-04: Universe Fork Handling
**Priority:** P2
**Dependencies:** WO-THREAD-03
**Estimated:** 1 session

**Task:**
Handle soul thread updates when loading a snapshot (universe fork).

**Deliverables:**
1. On load: close current segment, open new segment
2. Increment personal_tick on fork
3. Append `universe_fork` event
4. Transfer soul to new universe

**Acceptance Criteria:**
- [ ] Personal tick increments on load (never resets)
- [ ] New segment created in forked universe
- [ ] Fork event recorded
- [ ] Soul memories from before fork preserved
- [ ] Build passes

---

## Plot Lines Work Orders

### WO-PLOT-01: Plot Line Types
**Priority:** P0 (Foundation)
**Dependencies:** None
**Estimated:** 1 session

**Task:**
Define core plot line types and interfaces.

**Deliverables:**
1. Create `packages/core/src/plot/PlotTypes.ts`
2. Define: `PlotLineTemplate`, `PlotLineInstance`, `PlotStage`, `PlotTransition`
3. Define: `PlotCondition`, `PlotEffect`, `LessonDefinition`
4. Define scale enum: `micro | small | medium | large | epic`

**Acceptance Criteria:**
- [ ] All interfaces defined
- [ ] Types are comprehensive enough for examples in spec
- [ ] Exported from package
- [ ] Build passes

---

### WO-PLOT-02: Plot Template Registry
**Priority:** P1
**Dependencies:** WO-PLOT-01
**Estimated:** 1 session

**Task:**
Create registry for plot templates and add 3 example templates.

**Deliverables:**
1. Create `packages/core/src/plot/PlotTemplateRegistry.ts`
2. Implement `register()`, `get()`, `getByScale()`, `getByCategory()`
3. Create 3 templates:
   - `moment_of_courage` (micro)
   - `first_friendship` (small)
   - `mastering_craft` (medium)

**Acceptance Criteria:**
- [ ] Registry singleton accessible
- [ ] Templates can be registered and retrieved
- [ ] Example templates match spec
- [ ] Build passes

---

### WO-PLOT-03: Plot Lines Component
**Priority:** P1
**Dependencies:** WO-PLOT-01, WO-SOUL-01
**Estimated:** 1 session

**Task:**
Create `PlotLinesComponent` for souls to track active plots.

**Deliverables:**
1. Create `packages/core/src/components/PlotLinesComponent.ts`
2. Add to `ComponentType.ts` as `plot_lines`
3. Implement helpers: `addPlot()`, `getActivePlots()`, `completePlot()`

**Interface:**
```typescript
interface PlotLinesComponent {
  type: 'plot_lines';
  active: PlotLineInstance[];
  completed: CompletedPlot[];
  abandoned: AbandonedPlot[];
}
```

**Acceptance Criteria:**
- [ ] Component registered and serializable
- [ ] Can add/complete/abandon plots
- [ ] Active plots queryable by scale
- [ ] Build passes

---

### WO-PLOT-04: Plot Assignment System
**Priority:** P2
**Dependencies:** WO-PLOT-02, WO-PLOT-03
**Estimated:** 1 session

**Task:**
Create system that assigns dynamic plots based on circumstances.

**Deliverables:**
1. Create `packages/core/src/systems/PlotAssignmentSystem.ts`
2. Implement micro plot detection (check every 100 ticks)
3. Implement small plot detection (check every 1000 ticks)
4. Respect scale limits (max 20 micro, 5 small, etc.)

**Acceptance Criteria:**
- [ ] System runs at appropriate priority
- [ ] Detects opportunity for micro plot (e.g., threat nearby → moment_of_courage)
- [ ] Assigns plots to souls
- [ ] Respects mutex constraints
- [ ] Build passes

---

### WO-PLOT-05: Plot Progression System
**Priority:** P2
**Dependencies:** WO-PLOT-04
**Estimated:** 1 session

**Task:**
Create system that evaluates plot transitions and fires them.

**Deliverables:**
1. Create `packages/core/src/systems/PlotProgressionSystem.ts`
2. Implement condition evaluation for all condition types
3. Implement effect execution for all effect types
4. Handle stage timeout transitions

**Acceptance Criteria:**
- [ ] Evaluates transitions each tick for active plots
- [ ] Fires transitions when conditions met
- [ ] Executes on_enter/on_exit effects
- [ ] Records stage changes on silver thread
- [ ] Build passes

---

### WO-PLOT-06: Plot Condition Evaluators
**Priority:** P2
**Dependencies:** WO-PLOT-01
**Estimated:** 1 session

**Task:**
Implement condition evaluators for all PlotCondition types.

**Deliverables:**
1. Create `packages/core/src/plot/ConditionEvaluators.ts`
2. Implement evaluator for each condition type:
   - `has_component`, `component_value`
   - `relationship_exists`, `relationship_strength`
   - `event_occurred`, `event_count`
   - `time_in_stage`, `personal_tick`
   - `lesson_learned`, `in_location`

**Acceptance Criteria:**
- [ ] Each condition type has working evaluator
- [ ] Evaluators handle missing data gracefully
- [ ] Negation (`not: true`) works
- [ ] Build passes

---

### WO-PLOT-07: Plot Effect Executors
**Priority:** P2
**Dependencies:** WO-PLOT-01, WO-THREAD-02
**Estimated:** 1 session

**Task:**
Implement effect executors for all PlotEffect types.

**Deliverables:**
1. Create `packages/core/src/plot/EffectExecutors.ts`
2. Implement executor for each effect type:
   - `grant_wisdom`, `learn_lesson`
   - `add_plot`, `complete_plot`, `fail_plot`
   - `add_component`, `modify_component`
   - `emit_event`, `narrative_beat`
   - `queue_dream_hint`

**Acceptance Criteria:**
- [ ] Each effect type has working executor
- [ ] Effects modify soul/agent correctly
- [ ] `grant_wisdom` updates soul's wisdom_level
- [ ] Build passes

---

## Dream System Work Orders

### WO-DREAM-01: Soul Consolidation System
**Priority:** P1
**Dependencies:** WO-SOUL-02, WO-THREAD-02
**Estimated:** 1 session

**Task:**
Create system that writes significant events to silver thread during sleep.

**Deliverables:**
1. Create `packages/core/src/systems/SoulConsolidationSystem.ts`
2. Listen for `agent:sleep_start` event
3. Get soul for agent, scan consolidated memories
4. Write significant events to silver thread
5. Queue soul dream hints on CircadianComponent

**Acceptance Criteria:**
- [ ] Runs after MemoryConsolidationSystem (priority 106)
- [ ] Extracts plot-relevant events
- [ ] Writes to silver thread
- [ ] Sets `circadian.soulDreamHints`
- [ ] Build passes

---

### WO-DREAM-02: Significance Detector
**Priority:** P1
**Dependencies:** WO-PLOT-03
**Estimated:** 1 session

**Task:**
Implement logic to detect which memories are soul-significant.

**Deliverables:**
1. Create `packages/core/src/soul/SignificanceDetector.ts`
2. Implement `isSignificant(memory, soul, activePlots)`
3. Check for: plot relevance, milestones, meaningful choices, firsts

**Significance Criteria:**
- Plot-relevant (relates to active plot transition)
- Life milestone (marriage, parenthood, leadership)
- Meaningful choice (betrayal, sacrifice, forgiveness)
- First-time notable event (first love, first kill, first loss)
- High emotional intensity (> 0.9)

**Acceptance Criteria:**
- [ ] Returns true for plot-relevant memories
- [ ] Returns true for milestones
- [ ] Returns false for routine actions
- [ ] Build passes

---

### WO-DREAM-03: Soul-Influenced Dream Generation
**Priority:** P2
**Dependencies:** WO-DREAM-01
**Estimated:** 1 session

**Task:**
Extend SleepSystem to generate soul-influenced dreams.

**Deliverables:**
1. Modify `SleepSystem.generateDream()` to check `soulDreamHints`
2. Create `generateSoulInfluencedDream()` function
3. Generate different dream types based on event type (processing, prophetic, etc.)

**Dream Types:**
- `lesson_learned` → processing dream with insight
- `plot_stage_changed` → prophetic dream about what's coming
- `first_love/first_loss` → emotional processing dream

**Acceptance Criteria:**
- [ ] Soul hints override random dreams
- [ ] Dream narrative reflects soul event
- [ ] Dream tone matches event type
- [ ] Build passes

---

### WO-DREAM-04: Past Life Echo Dreams
**Priority:** P3
**Dependencies:** WO-DREAM-03, WO-THREAD-01
**Estimated:** 1 session

**Task:**
High-wisdom souls dream of past incarnations.

**Deliverables:**
1. Create `maybeGeneratePastLifeEcho(soul)` function
2. Only triggers for wisdom >= 25
3. Probability scales with wisdom (0% at 25, 75% at 100)
4. Selects emotionally significant event from past incarnations
5. Clarity scales with wisdom (vague → symbolic → vivid)

**Acceptance Criteria:**
- [ ] Low-wisdom souls never get echoes
- [ ] High-wisdom souls sometimes get echoes
- [ ] Echo content comes from previous incarnation events
- [ ] Build passes

---

### WO-DREAM-05: Emergency Death Consolidation
**Priority:** P2
**Dependencies:** WO-DREAM-01
**Estimated:** 1 session

**Task:**
Force consolidation when agent dies before sleep.

**Deliverables:**
1. SoulConsolidationSystem listens for `agent:died` event
2. Emergency consolidate memories → silver thread
3. Record death event on silver thread
4. Ensure soul persists after agent removed

**Acceptance Criteria:**
- [ ] Death triggers consolidation
- [ ] Final memories captured
- [ ] Death recorded with cause and location
- [ ] Soul entity survives agent deletion
- [ ] Build passes

---

## Narrative Pressure Integration Work Orders

### WO-PRESSURE-01: Plot Stage Attractors
**Priority:** P2
**Dependencies:** WO-PLOT-05
**Estimated:** 1 session

**Task:**
Plot stages create narrative pressure attractors.

**Deliverables:**
1. In PlotProgressionSystem, on stage enter: create attractors from stage definition
2. On stage exit: remove attractors for that stage
3. Attractors have source `{ type: 'plot', plotInstanceId }`

**Acceptance Criteria:**
- [ ] Stage attractors appear in NarrativePressureSystem
- [ ] Attractors removed when stage changes
- [ ] Attractor strength matches stage definition
- [ ] Build passes

---

### WO-PRESSURE-02: Plot Attractor Templates
**Priority:** P3
**Dependencies:** WO-PRESSURE-01
**Estimated:** 1 session

**Task:**
Define standard attractor goal types for common plot needs.

**Deliverables:**
1. Add goal types to narrative pressure system:
   - `meet_compatible_entity` (for relationship plots)
   - `deepen_relationship` (for friendship/love plots)
   - `threat_nearby` (for courage plots)
   - `conflict_arises` (for test plots)
2. Implement path analysis for each

**Acceptance Criteria:**
- [ ] Goal types registered
- [ ] Path analysis finds relevant biases
- [ ] Integrates with existing pressure system
- [ ] Build passes

---

## Multiverse Work Orders

### WO-MULTI-01: Personal Tick Tracking
**Priority:** P2
**Dependencies:** WO-THREAD-01
**Estimated:** 1 session

**Task:**
Souls track personal time independently of universe time.

**Deliverables:**
1. Add `personal_tick` to soul identity or silver thread head
2. Increment on each universe tick while incarnated
3. Increment by 1 on universe fork
4. Never reset, never decrease

**Acceptance Criteria:**
- [ ] Personal tick increments each tick
- [ ] Persists across saves
- [ ] Increments on fork
- [ ] Queryable from soul
- [ ] Build passes

---

### WO-MULTI-02: Fates Service
**Priority:** P3
**Dependencies:** WO-THREAD-01, WO-MULTI-01
**Estimated:** 1 session

**Task:**
Service for querying souls across universes.

**Deliverables:**
1. Create `packages/core/src/soul/FatesService.ts`
2. Implement `getCompleteSilverThread(soulId)`
3. Implement `hasLearnedLesson(soulId, lessonId)`
4. Implement `traceSoulJourney(soulId)`

**Acceptance Criteria:**
- [ ] Can query full thread across segments
- [ ] Can check lessons across all time
- [ ] Journey trace shows all universes visited
- [ ] Build passes

---

## Quick Wins (< 30 minutes each)

### WO-QUICK-01: Add soul_identity to ComponentType enum
Just add the enum value and basic type, no full component yet.

### WO-QUICK-02: Add silver_thread to ComponentType enum
Just add the enum value and basic type.

### WO-QUICK-03: Add plot_lines to ComponentType enum
Just add the enum value and basic type.

### WO-QUICK-04: Add soul_link to ComponentType enum
Just add the enum value and basic type.

### WO-QUICK-05: Create soul-system folder structure
Create `packages/core/src/soul/` directory with index.ts.

### WO-QUICK-06: Create plot folder structure
Create `packages/core/src/plot/` directory with index.ts.

---

## Recommended Order of Execution

**Phase 1: Foundation (Start Here)**
1. WO-QUICK-05, WO-QUICK-06 (folders)
2. WO-SOUL-01 (soul identity component)
3. WO-THREAD-01 (silver thread component)
4. WO-PLOT-01 (plot types)

**Phase 2: Linking**
5. WO-SOUL-02 (soul link)
6. WO-THREAD-02 (significant events)
7. WO-PLOT-03 (plot lines component)

**Phase 3: Core Systems**
8. WO-SOUL-03 (fates integration)
9. WO-PLOT-02 (template registry)
10. WO-DREAM-01 (soul consolidation)

**Phase 4: Progression**
11. WO-PLOT-06 (condition evaluators)
12. WO-PLOT-07 (effect executors)
13. WO-PLOT-04 (assignment system)
14. WO-PLOT-05 (progression system)

**Phase 5: Integration**
15. WO-DREAM-02 (significance detector)
16. WO-DREAM-03 (soul dreams)
17. WO-PRESSURE-01 (plot attractors)

**Phase 6: Polish**
18. WO-THREAD-03, WO-THREAD-04 (snapshot integration)
19. WO-DREAM-04, WO-DREAM-05 (advanced dreams)
20. WO-MULTI-01, WO-MULTI-02 (multiverse tracking)
