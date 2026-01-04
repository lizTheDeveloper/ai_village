# Proposal: Work Order: Universe Forking (Phase 32)

**Submitted By:** migration-script
**Date:** 2026-01-03
**Status:** Draft
**Complexity:** 5+ systems
**Priority:** TIER 2
**Source:** Migrated from agents/autonomous-dev/work-orders/universe-forking

---

## Original Work Order

# Work Order: Universe Forking (Phase 32)

## Overview
Implement universe forking capabilities that allow the game to test changes in parallel worlds before committing them to the main universe. This enables safe validation of LLM-generated effects, player "what-if" scenarios, and universe-level experimentation.

## Spec Reference
- **Primary Spec:** `openspec/specs/magic-system/item-magic-persistence.md` (Part 5: Universe Forking)
- **Phase:** 32
- **Priority:** HIGH
- **Status:** READY_FOR_IMPLEMENTATION

## Dependencies
- **Phase 31:** Persistence Layer ✅ (serialization, versioning, InvariantChecker)
- **Related Systems:**
  - Magic System (testing generated effects safely)
  - Multiverse System (forking is prerequisite for multiverse travel)
  - Validation System (InvariantChecker already exists)

## Requirements Summary

### Core Concepts

**Universe Forking** allows:
1. **Testing LLM-generated effects** in isolated sandbox before applying to main world
2. **Player "what-if" scenarios** (fork, try action, see result, abandon or commit)
3. **Safe experimentation** without corrupting main universe
4. **Parallel world simulation** for multiverse features
5. **Validation before commit** using InvariantChecker

**Fork Types:**
- **Ephemeral forks:** Temporary, discarded after test
- **Persistent forks:** Saved as alternate timelines
- **Sandbox forks:** LLM testing environments (auto-discard)

### Core Components

1. **WorldFork Interface**
   ```typescript
   interface WorldFork {
     id: string;                    // Fork UUID
     parentUniverseId: string;      // Original universe
     createdAt: number;             // Game tick
     purpose: ForkPurpose;          // 'test' | 'sandbox' | 'timeline'

     // Snapshot
     worldState: SerializedWorld;   // Full world clone

     // Results
     results?: ForkResults;
     isValid: boolean;              // Passed InvariantChecker

     // Lifecycle
     isPersistent: boolean;
     autoDiscardAt?: number;        // Game tick for cleanup
   }

   type ForkPurpose = 'test' | 'sandbox' | 'timeline' | 'experiment';
   ```

2. **UniverseManager.fork()**
   - Clone entire world state
   - Create isolated execution environment
   - Track fork genealogy
   - Manage fork lifecycle

3. **UniverseManager.runFork()**
   - Execute actions in forked universe
   - Run simulation ticks
   - Collect results and side effects
   - Run InvariantChecker validation

4. **ForkResults Collection**
   ```typescript
   interface ForkResults {
     ticksRun: number;

     // State changes
     entitiesCreated: string[];
     entitiesDestroyed: string[];
     entitiesModified: EntityDiff[];

     // Events
     eventsTriggered: GameEvent[];

     // Validation
     invariantsPassed: boolean;
     invariantViolations: InvariantViolation[];

     // Performance
     executionTimeMs: number;
     memoryUsedMb: number;
   }

   interface EntityDiff {
     entityId: string;
     componentChanges: Map<ComponentType, ComponentDiff>;
   }
   ```

5. **WorldDiff Utility**
   - Compare fork state to parent universe
   - Generate minimal diff for efficient commits
   - Detect conflicts (parent changed during fork)

6. **Fork Execution in Web Worker**
   - Run forks in separate thread
   - Prevent blocking main game loop
   - Timeout protection (kill runaway forks)

### Key Features

**Fork Creation:**
- Serialize entire world state
- Clone systems and entities
- Isolate event bus (fork events don't affect parent)
- Track fork metadata (purpose, parent, creation time)

**Fork Execution:**
- Apply changes to forked world
- Run simulation for N ticks
- Collect all state changes
- Validate with InvariantChecker

**Fork Commit:**
- Compare fork state to parent
- Apply validated changes to parent universe
- Detect and resolve conflicts
- Emit commit event

**Fork Discard:**
- Cleanup fork resources
- Remove from fork registry
- Free memory

**Validation:**
- Use existing InvariantChecker from Phase 31
- Check entity integrity
- Check component validity
- Check world constraints
- Fail fast on violations

## Implementation Checklist

### Phase 1: Core Fork Infrastructure
- [ ] Create `packages/core/src/multiverse/WorldFork.ts`
  - WorldFork interface
  - ForkResults interface
  - ForkPurpose type
- [ ] Create `packages/core/src/multiverse/UniverseManager.ts`
  - Fork registry (Map<forkId, WorldFork>)
  - Fork creation logic
  - Fork lifecycle management
- [ ] Create `packages/core/src/multiverse/ForkSerializer.ts`
  - Serialize world state for fork
  - Deserialize fork snapshot
  - Clone entities and components

### Phase 2: Fork Execution
- [ ] Implement `UniverseManager.fork(world, purpose)`
  - Serialize current world state
  - Create fork record
  - Register in fork registry
  - Return fork ID
- [ ] Implement `UniverseManager.runFork(forkId, actions, ticks)`
  - Load fork snapshot
  - Apply actions to forked world
  - Run simulation for N ticks
  - Collect results
  - Run InvariantChecker
  - Store results in fork record
- [ ] Create isolated execution environment
  - Clone ECS world
  - Clone systems (with same state)
  - Isolate event bus
  - Sandbox resource access

### Phase 3: Diff & Commit
- [ ] Create `packages/core/src/multiverse/WorldDiff.ts`
  - Compare entities (created, destroyed, modified)
  - Compare components (field-level diffs)
  - Generate minimal diff object
- [ ] Implement `UniverseManager.commitFork(forkId)`
  - Validate fork passed InvariantChecker
  - Generate diff from fork to parent
  - Detect conflicts (parent changed during fork)
  - Apply diff to parent world
  - Emit commit event
  - Cleanup fork
- [ ] Implement `UniverseManager.discardFork(forkId)`
  - Remove from registry
  - Free memory
  - Emit discard event

### Phase 4: Conflict Detection & Resolution
- [ ] Implement conflict detection
  - Track parent world version at fork time
  - Compare parent version at commit time
  - Detect entity modifications in both parent and fork
- [ ] Implement conflict resolution strategies
  - **Auto-merge:** Non-overlapping changes (safe)
  - **Fork-wins:** Fork changes override parent
  - **Parent-wins:** Parent changes override fork
  - **User-resolve:** Prompt for manual merge
- [ ] Add conflict reporting
  - List conflicting entities
  - Show field-level conflicts
  - Suggest resolution strategy

### Phase 5: Web Worker Execution
- [ ] Create `packages/core/src/multiverse/ForkWorker.ts`
  - Worker thread entry point
  - Message protocol (fork request, fork result)
  - Timeout handling
- [ ] Implement async fork execution
  - Offload fork.run() to worker
  - Return Promise<ForkResults>
  - Handle worker errors
  - Kill timeout/runaway forks
- [ ] Add worker pool
  - Manage multiple concurrent forks
  - Queue fork requests
  - Load balancing

### Phase 6: LLM Integration (Sandbox Testing)
- [ ] Implement `testLLMEffect(effectExpression)`
  - Fork current world (purpose: 'sandbox')
  - Apply effect to test entity
  - Run for 100 ticks
  - Check for crashes/violations
  - Return safety verdict
- [ ] Add effect validation pipeline
  - Test effect in sandbox
  - If safe → add to effect registry
  - If unsafe → reject with error details
  - Cache results (effect hash → validity)

### Phase 7: Player-Facing Features
- [ ] Implement "what-if" action
  - Player chooses action
  - Fork universe
  - Show predicted outcome
  - Player chooses commit or discard
- [ ] Add fork visualization
  - Fork tree UI (show parent/children)
  - Fork status (running, valid, invalid)
  - Diff preview (changes from parent)
- [ ] Add timeline branching
  - Persistent forks as alternate timelines
  - Switch between timelines
  - Merge timelines (advanced)

### Phase 8: Performance Optimization
- [ ] Optimize fork creation
  - Copy-on-write for unchanged data
  - Delta snapshots for repeated forks
  - Compress fork snapshots
- [ ] Optimize fork execution
  - Skip systems not relevant to changes
  - Cache invariant checks
  - Incremental diffs
- [ ] Add fork garbage collection
  - Auto-discard expired ephemeral forks
  - Limit total forks per universe
  - Memory pressure cleanup

### Phase 9: Persistence
- [ ] Add fork serialization to save files
  - Save persistent forks
  - Save fork genealogy
  - Restore forks on load
- [ ] Implement fork versioning
  - Migrate old fork formats
  - Handle schema changes
- [ ] Add fork metadata to save headers
  - Number of active forks
  - Fork tree structure

### Phase 10: Testing & Validation
- [ ] Unit tests for fork lifecycle
- [ ] Integration tests for commit/discard
- [ ] Conflict detection tests
- [ ] Worker thread tests
- [ ] Memory leak tests (fork cleanup)
- [ ] Performance benchmarks (fork overhead)

## Test Requirements

### Unit Tests
- [ ] WorldFork creation and initialization
- [ ] Fork serialization/deserialization
- [ ] WorldDiff generation correctness
- [ ] Conflict detection logic
- [ ] Fork lifecycle (create, run, commit, discard)

### Integration Tests
- [ ] Fork → modify → commit → verify parent updated
- [ ] Fork → modify → discard → verify parent unchanged
- [ ] Parallel forks don't interfere
- [ ] Fork conflict detection and resolution
- [ ] LLM effect testing in sandbox
- [ ] Save/load with active forks

### Performance Tests
- [ ] Fork creation overhead (<100ms for medium world)
- [ ] Fork execution in worker (doesn't block main thread)
- [ ] Memory usage (fork uses <2x parent memory)
- [ ] Garbage collection (expired forks freed)

### Manual Tests
- [ ] Fork universe → make changes → commit → verify in main world
- [ ] Fork universe → test dangerous effect → discard if invalid
- [ ] Create multiple forks → verify isolation
- [ ] Commit fork with conflicts → verify resolution
- [ ] Fork tree visualization works

## Acceptance Criteria

1. **Fork creation** creates isolated copy of world state
2. **Fork execution** runs actions and simulation without affecting parent
3. **Fork commit** applies validated changes to parent universe
4. **Fork discard** cleans up resources properly
5. **Conflict detection** identifies overlapping changes between fork and parent
6. **Worker execution** runs forks in background without blocking game
7. **InvariantChecker** validates fork state before commit
8. **LLM effect testing** can safely validate generated effects in sandbox
9. **Persistent forks** save/load correctly
10. **Performance acceptable** (<100ms fork creation, no main thread blocking)

## Definition of Done

- [ ] All implementation checklist items completed
- [ ] All test requirements passing
- [ ] All acceptance criteria met
- [ ] Code review completed
- [ ] Documentation updated in spec
- [ ] No memory leaks in fork lifecycle
- [ ] Worker threads stable (no crashes)
- [ ] Performance benchmarks met
- [ ] Committed to version control

## Estimated Effort
- **Lines of Code:** ~2,000 LOC
- **Time Estimate:** 15-20 hours
- **Complexity:** Medium-High (threading, serialization, conflict resolution)

## Notes
- **InvariantChecker already exists** from Phase 31 - reuse for validation
- **Web Workers are critical** for non-blocking execution
- **Copy-on-write optimization** should be added in Phase 8 if performance issues
- **Conflict resolution** can start simple (fork-wins) and get sophisticated later
- Future enhancements: Fork merging, fork replay, fork time travel


---

## Requirements

### Requirement: [To be defined]

The system SHALL [requirement description].

#### Scenario: [Scenario name]

- WHEN [condition]
- THEN [expected result]

## Definition of Done

- [ ] Implementation complete
- [ ] Tests passing
- [ ] Documentation updated
