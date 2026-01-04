# Proposal: Work Order: Narrative Pressure System (Outcome Attractors)

**Submitted By:** migration-script
**Date:** 2026-01-03
**Status:** Draft
**Complexity:** 5+ systems
**Priority:** TIER 2
**Source:** Migrated from agents/autonomous-dev/work-orders/narrative-pressure-system

---

## Original Work Order

# Work Order: Narrative Pressure System (Outcome Attractors)

**Phase:** TBD (Meta-Narrative Systems)
**Created:** 2026-01-02
**Status:** READY_FOR_IMPLEMENTATION
**Priority:** LOW-MEDIUM

---

## Spec Reference

- **Primary Spec:** [openspec/specs/divinity-system/narrative-pressure-system.md](../../../../openspec/specs/divinity-system/narrative-pressure-system.md)
- **Related Specs:**
  - [openspec/specs/divinity-system/belief-and-deity-system.md](../../../../openspec/specs/divinity-system/belief-and-deity-system.md)
  - [openspec/specs/divinity-system/epistemic-discontinuities.md](../../../../openspec/specs/divinity-system/epistemic-discontinuities.md)
- **Dependencies:**
  - ⚠️ Divinity System (Phase TBD) - Deity entities, belief economy
  - ⚠️ Multiverse System (Phase 32) - Timeline management
  - ✅ Event System - Random event spawning
  - ✅ AI Director - Behavior selection

---

## Context

Narrative pressure allows **higher-dimensional beings** (gods, players, narrative forces) to create **outcome attractors** — probabilistic fields that bias the simulation toward certain end-states without controlling the path taken.

**This is NOT:**
- Destiny (outcome is likely, not guaranteed)
- Fate (agents can resist)
- Plot armor (characters don't magically survive)
- Scripted sequences (path is emergent)

**This IS:**
- Global optimization leaking downward
- Probability shaping toward outcomes
- Multiple paths to same destination
- Story structure, not story script

**Examples:**
- God wants hero to survive → combat encounters near hero become less likely
- Player marks "these two agents should meet" → proximity events increase
- Prophecy creates attractor → self-fulfilling through probability bias
- Village "wants" to burn down → 10 different paths all accidentally work out

---

## Requirements Summary

### Feature 1: Outcome Attractors
Define desired end-states with strength, urgency, scope:
1. Attractor sources (deity, player, storyteller, prophecy, curse)
2. Outcome goals (15+ types: death, survival, relationships, crises, events)
3. Strength and urgency parameters
4. Spatial/temporal scope
5. Decay conditions

### Feature 2: Probability Biasing
Adjust simulation probabilities without forcing outcomes:
1. Event spawn rate modification
2. AI behavior selection weight adjustment
3. Combat damage/critical modifiers
4. Weather and resource availability shifts
5. Relationship opinion changes

### Feature 3: Path Analysis
Identify convergent paths to desired outcomes:
1. Heuristic path finding (death paths, crisis paths, meeting paths)
2. Confidence scoring for each path
3. Path constraint validation
4. Convergence measurement (how close are we to goal?)

### Feature 4: Attractor Conflicts
Handle multiple competing attractors:
1. Detect conflicting goals
2. Resolve via strength comparison
3. Create interference patterns (constructive/destructive)
4. Generate dramatic tension from conflicts

### Feature 5: Divine Integration
Allow gods to create attractors:
1. Spend belief to create attractors
2. Strength proportional to belief investment
3. Omniscience via timeline selection
4. Divine will persistence

### Feature 6: Player Control
Allow players to create and view attractors:
1. Mark intentions ("I want this to happen")
2. View active attractors (transparency)
3. Resist narrative pressure (player agency)
4. Narrative stance (embrace/neutral/resist)

### Feature 7: Attractor Cascades
One outcome spawns new attractors:
1. OnAchievement triggers
2. OnFailure fallbacks
3. Cascade chains
4. Story arc completion

---

## Acceptance Criteria

### Criterion 1: NarrativePressureSystem Implementation
- **WHEN:** The system is created
- **THEN:** The system SHALL:
  1. Maintain a Map of active attractors
  2. Evaluate convergence each tick (< 5ms for 100 attractors)
  3. Compute pressure effects for each attractor
  4. Apply decay to old attractors
  5. Resolve conflicts between opposing attractors
- **Verification:**
  - Create attractor: `{ goal: 'entity_death', strength: 0.8, urgency: 0.6 }`
  - System tracks convergence (0.0 → 1.0 as goal approaches)
  - Attractor decays when goal achieved or becomes impossible
  - Performance: < 5ms per tick with 100 active attractors

### Criterion 2: Probability Biasing Integration
- **WHEN:** An attractor affects simulation
- **THEN:** The system SHALL:
  1. Apply bias to RandomEventSystem spawn rates
  2. Apply bias to AI behavior selection weights
  3. Apply bias to combat damage/critical chances
  4. Apply bias smoothly (max 30% adjustment per attractor)
  5. Combine multiple biases via weighted average
- **Verification:**
  - Create survival attractor for agent X
  - Combat encounters near X reduced by ~20%
  - Damage to X reduced by ~15%
  - Healing opportunities increased by ~25%
  - Multiple attractors combine (not overwrite)

### Criterion 3: Path Analysis for Common Goals
- **WHEN:** An attractor is created
- **THEN:** The system SHALL:
  1. Identify 3+ convergent paths for common goal types
  2. Score each path by confidence (0-1)
  3. Create pressure effects for high-confidence paths
  4. Handle goal types: entity_death, entity_survival, relationship_formed, village_crisis
- **Verification:**
  - Goal: entity_death → paths found: combat, environment, starvation
  - Goal: village_crisis → paths found: famine, plague, war
  - Goal: relationship_formed → paths found: proximity events, conversation topics
  - Each path has confidence > 0.5

### Criterion 4: Convergence Measurement
- **WHEN:** A goal has progress toward achievement
- **THEN:** The system SHALL:
  1. Measure current state vs goal state
  2. Compute convergence metric (0 = no progress, 1 = achieved)
  3. Update attractor.convergence each tick
  4. Trigger onAchievement when convergence >= 1.0
  5. Trigger onFailure when goal becomes impossible
- **Verification:**
  - Goal: entity_death, target has 100 HP
  - Target takes 50 damage → convergence = 0.5
  - Target takes another 50 damage → convergence = 1.0
  - onAchievement triggered, attractor removed

### Criterion 5: Attractor Conflicts
- **WHEN:** Two attractors have opposing goals
- **THEN:** The system SHALL:
  1. Detect conflicts (e.g., survival vs death of same entity)
  2. Mark attractors with conflicts array
  3. Resolve via strength comparison (stronger dominates)
  4. Create net pressure (War 0.7 - Peace 0.6 = War 0.1)
  5. Emit conflict events for narrative awareness
- **Verification:**
  - Attractor A: entity_death, strength 0.7
  - Attractor B: entity_survival, strength 0.6
  - Conflict detected, marked in both
  - Net pressure: death bias 0.1 (weak)
  - Event emitted: 'attractor_conflict'

### Criterion 6: Divine Attractor Creation
- **WHEN:** A deity creates an attractor
- **THEN:** The system SHALL:
  1. Deduct belief cost from deity
  2. Create attractor with strength = sqrt(beliefCost / 1000)
  3. Set source = { type: 'deity', deityId }
  4. Register with NarrativePressureSystem
  5. Track in deity.narrativeAttractors array
- **Verification:**
  - Deity with 1000 belief creates attractor (cost 500)
  - Deity.belief = 500 (deducted)
  - Attractor.strength = sqrt(500/1000) = 0.707
  - Attractor.source.type = 'deity'
  - Deity.narrativeAttractors.length = 1

### Criterion 7: Player Narrative Control
- **WHEN:** Player interacts with narrative system
- **THEN:** The system SHALL:
  1. Allow player to create attractors (mark intentions)
  2. Display active attractors in UI
  3. Show pressure explanations ("Event X was 30% more likely due to Y")
  4. Allow player to set stance (embrace/neutral/resist)
  5. Resist stance reduces pressure strength by 50%
- **Verification:**
  - Player creates attractor: "Agent A and B should meet"
  - UI shows attractor in "Active Narratives" panel
  - Meeting event occurs → tooltip shows "20% boost from player intention"
  - Player sets stance to 'resist' → pressure reduced to 10%

### Criterion 8: Attractor Cascades
- **WHEN:** An attractor achieves its goal
- **THEN:** The system SHALL:
  1. Check for cascade definition
  2. Trigger onAchievement cascade (spawn new attractors)
  3. Optionally trigger onFailure cascade if goal fails
  4. Chain cascades (cascade can have cascade)
- **Verification:**
  - Attractor: hero_death with cascade → revenge_quest
  - Hero dies → onAchievement triggered
  - New attractor created: justice (punish killer)
  - Revenge attractor has strength 0.8 (strong narrative)

---

## Implementation Steps

1. **Core Infrastructure** (8-12 hours)
   - Create OutcomeAttractor, PressureEffect types
   - Implement NarrativePressureSystem class
   - Add attractor registry (Map)
   - Implement convergence evaluation loop
   - Add decay system
   - Create pressure query API

2. **Pressure Application** (10-15 hours)
   - Integrate with RandomEventSystem
   - Integrate with AIDirector behavior selection
   - Integrate with combat damage calculations
   - Create applyPressureBias utility function
   - Add pressure effect caching
   - Implement bias combination (weighted average)

3. **Path Analysis** (15-20 hours)
   - Create PathAnalyzer class
   - Implement death path finding
   - Implement survival path finding
   - Implement relationship formation paths
   - Implement village crisis paths
   - Add confidence scoring
   - Create path constraint validation

4. **Attractor Conflicts** (12-18 hours)
   - Implement conflict detection
   - Add conflict resolution (strength comparison)
   - Create interference pattern detection
   - Add constructive/destructive interference
   - Emit conflict events
   - Create dramatic tension metrics

5. **Divine Integration** (10-12 hours)
   - Extend DeityComponent with narrative fields
   - Implement createNarrativeAttractor method
   - Add belief cost calculation
   - Implement divine selection mechanism
   - Track divine attractors per deity

6. **Player Control** (8-10 hours)
   - Create player attractor creation API
   - Build narrative UI panel
   - Add attractor visualization
   - Implement pressure explanation tooltips
   - Add narrative stance setting
   - Create resistance mechanics

7. **Cascades and Advanced** (6-8 hours)
   - Implement cascade triggers
   - Add cascade chaining
   - Create self-fulfilling prophecy integration
   - Add timeline selection context
   - Implement retrocausal attractors

8. **Testing and Polish** (6-8 hours)
   - Unit tests for path analysis
   - Integration tests for pressure application
   - Scenario tests (divine protection, tragic prophecy, conflicts)
   - Performance profiling
   - Documentation

---

## Testing Plan

### Unit Tests
- Test convergence calculation (various goal types)
- Test pressure bias application (softmax, weighted average)
- Test path finding (death, survival, relationships)
- Test conflict detection (opposing goals)
- Test cascade triggering

### Integration Tests
- Test end-to-end: deity creates attractor → pressure affects simulation → goal achieved
- Test attractor conflicts (War god vs Peace god)
- Test player resistance (stance affects pressure)
- Test cascade chains (hero death → revenge → justice)

### Scenario Tests
1. **Divine Protection**: God protects hero, hero survives dangerous situations
2. **Tragic Prophecy**: Prophecy creates self-fulfilling attractor
3. **Emergent Romance**: Two agents from rival factions meet and fall in love
4. **Attractor Conflict**: Village experiences turbulent period (war vs peace)

---

## Performance Requirements

- **Convergence Evaluation:** < 5ms per tick for 100 active attractors
- **Path Analysis:** < 50ms per attractor creation
- **Pressure Query:** < 0.5ms per query
- **Conflict Detection:** < 10ms per tick
- **Memory:** < 50MB for 1000 attractors

---

## Success Metrics

1. ✅ All 8 acceptance criteria met
2. ✅ Performance within budget (< 5ms per tick)
3. ✅ Attractors achieve goals 60-80% of the time (not guaranteed)
4. ✅ Multiple paths lead to same outcome (diversity)
5. ✅ Players feel story is alive without feeling railroaded
6. ✅ Divine conflicts create dramatic tension

---

## Dependencies

- ⚠️ **Divinity System** - Deity entities, belief economy (can stub initially)
- ⚠️ **Multiverse System** - Timeline selection (can defer to Phase 5)
- ✅ **EventSystem** - Already exists
- ✅ **AIDirector** - Already exists
- ✅ **CombatSystem** - Already exists

---

## Future Enhancements (Not in This Work Order)

- Resonance detection (attractors amplifying each other)
- Narrative fatigue (attractors weaken if story becomes stale)
- Story arc completion detection
- Attractor templates (common story patterns)
- Machine learning for path finding
- Narrative editor (visual attractor designer)

---

## Notes

- Start with simple path heuristics (can improve later)
- Focus on 4 goal types initially: death, survival, relationship, crisis
- Divine integration can be stubbed (simulate belief expenditure)
- Player UI can be text-based initially (fancy UI later)
- Performance is critical (this runs every tick)
- Keep bias gentle (max 30% adjustment recommended)

---

## Estimated Effort

**Total:** 65-95 hours (~2-3 weeks full-time)

**Breakdown:**
- Phase 1 (Core): 8-12 hrs
- Phase 2 (Pressure): 10-15 hrs
- Phase 3 (Paths): 15-20 hrs
- Phase 4 (Conflicts): 12-18 hrs
- Phase 5 (Divine): 10-12 hrs
- Phase 6 (Player): 8-10 hrs
- Phase 7 (Cascades): 6-8 hrs
- Phase 8 (Testing): 6-8 hrs


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
